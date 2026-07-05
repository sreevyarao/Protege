import uuid
import json
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import Session, select
from google.adk.runners import InMemoryRunner
from google.adk.sessions import InMemorySessionService
from google.adk.agents.invocation_context import InvocationContext
from google.genai import Client

from app.database import create_db_and_tables, get_db
from app.models import Session as DBSessionModel, Message, KnowledgeNode, KnowledgeEdge, FactVector
from app.agent import student_agent, post_session_pipeline
from app.vector_search import search_similar_facts

app = FastAPI(title="Protege Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Initialize GenAI client for manual embeddings
try:
    genai_client = Client()
except Exception:
    genai_client = None

# ADK runners
chat_runner = InMemoryRunner(agent=student_agent, app_name="app")
pipeline_runner = InMemoryRunner(agent=post_session_pipeline, app_name="app")

# Schemas for Requests
class CreateSessionReq(BaseModel):
    topic: str

class ChatReq(BaseModel):
    session_id: str
    message: str
    image_b64: Optional[str] = None
    image_mime: Optional[str] = None
    audio_b64: Optional[str] = None
    audio_mime: Optional[str] = None

@app.post("/api/sessions")
def create_session(req: CreateSessionReq, db: Session = Depends(get_db)):
    session_id = str(uuid.uuid4())
    db_session = DBSessionModel(id=session_id, topic=req.topic)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return {"id": db_session.id, "topic": db_session.topic}

@app.get("/api/sessions")
def list_sessions(db: Session = Depends(get_db)):
    sessions = db.exec(select(DBSessionModel).order_by(DBSessionModel.created_at.desc())).all()
    # Map to frontend PastSession format
    result = []
    for s in sessions:
        result.append({
            "id": s.id,
            "topic": s.topic,
            "date": s.created_at.strftime("%Y-%m-%d"),
            "score": s.coverage or 0
        })
    return result

@app.get("/api/sessions/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    db_session = db.get(DBSessionModel, session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Load relationships
    messages = db.exec(select(Message).where(Message.session_id == session_id).order_by(Message.created_at)).all()
    nodes = db.exec(select(KnowledgeNode).where(KnowledgeNode.session_id == session_id)).all()
    edges = []
    # Simplified graph fetch
    return {
        "session": db_session,
        "messages": messages,
        "knowledge_graph": {"nodes": nodes}
    }

@app.post("/api/chat")
async def chat(req: ChatReq, db: Session = Depends(get_db)):
    # Optional: Auto-name the session if it is "New Session"
    db_session = db.get(DBSessionModel, req.session_id)
    if db_session and db_session.topic == "New Session" and genai_client:
        try:
            topic_res = genai_client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents=f"Summarize this into a 2-4 word topic title (no quotes): {req.message}"
            )
            if topic_res.text:
                db_session.topic = topic_res.text.strip()
                db.add(db_session)
                db.commit()
        except Exception as e:
            print("Failed to generate topic:", e)

    # 1. Save user message
    user_msg_id = str(uuid.uuid4())
    user_msg = Message(id=user_msg_id, session_id=req.session_id, role="user", content=req.message)
    db.add(user_msg)
    db.commit()
    
    # 2. Get RAG context (Embed message and search facts)
    rag_context = ""
    if genai_client:
        try:
            emb_res = genai_client.models.embed_content(model="text-embedding-004", contents=req.message)
            query_emb = emb_res.embeddings[0].values
            facts = search_similar_facts(db, req.session_id, query_emb)
            if facts:
                rag_context = "\n\nRelated Facts from past:\n" + "\n".join([f.text_content for f in facts])
        except Exception as e:
            print(f"Embedding error: {e}")

    # 3. Call ADK Student Agent
    prompt_with_context = req.message + rag_context
    response_text = ""
    
    from google.genai import types
    from google.adk.sessions import Session as ADKSession
    
    try:
        adk_session = await chat_runner.session_service.get_session(app_name="app", user_id="default", session_id=req.session_id)
    except Exception as e:
        adk_session = None
        
    if not adk_session:
        adk_session = await chat_runner.session_service.create_session(app_name="app", user_id="default", session_id=req.session_id)
        
    msg_parts = [types.Part.from_text(text=prompt_with_context)]
    import base64
    if req.image_b64 and req.image_mime:
        try:
            image_bytes = base64.b64decode(req.image_b64)
            msg_parts.append(types.Part.from_bytes(data=image_bytes, mime_type=req.image_mime))
        except Exception as e:
            print(f"Failed to decode image: {e}")
            
    if req.audio_b64 and req.audio_mime:
        try:
            audio_bytes = base64.b64decode(req.audio_b64)
            msg_parts.append(types.Part.from_bytes(data=audio_bytes, mime_type=req.audio_mime))
        except Exception as e:
            print(f"Failed to decode audio: {e}")
            
    msg_content = types.Content(role="user", parts=msg_parts)
    
    try:
        async for event in chat_runner.run_async(user_id="default", session_id=req.session_id, new_message=msg_content):
            if event.content and event.author == "student_agent":
                if isinstance(event.content, str):
                    response_text += event.content
                else:
                    for part in event.content.parts:
                        if part.text:
                            response_text += part.text
    except Exception as e:
        if "API key" in str(e):
            response_text = "Whoops! I cannot connect to my brain. It looks like the GEMINI_API_KEY environment variable is missing on the server. Please export it and restart the backend!"
        else:
            response_text = f"An error occurred: {str(e)}"

    # 4. Save AI response
    ai_msg_id = str(uuid.uuid4())
    ai_msg = Message(id=ai_msg_id, session_id=req.session_id, role="ai", content=response_text)
    db.add(ai_msg)
    db.commit()
    
    return {"reply": response_text}

@app.post("/api/evaluate/{session_id}")
async def evaluate_session(session_id: str, db: Session = Depends(get_db)):
    db_session = db.get(DBSessionModel, session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    messages = db.exec(select(Message).where(Message.session_id == session_id).order_by(Message.created_at)).all()
    transcript = "\n".join([f"{m.role.upper()}: {m.content}" for m in messages])
    
    # Update the topic based on the FULL transcript now that the session is ending
    if genai_client and transcript:
        try:
            topic_res = genai_client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents=f"Read this conversation transcript and generate a highly accurate 2-4 word topic title (no quotes):\n\n{transcript}"
            )
            if topic_res.text:
                db_session.topic = topic_res.text.strip()
                db.add(db_session)
                db.commit()
        except Exception as e:
            print(f"Failed to update topic at end of session: {e}")
            
    # Trigger ADK pipeline. We set the transcript into the session state so agents can read it via {transcript} placeholder
    # First, initialize the session if it doesn't exist by doing a dummy run or manually creating it
    session_id_adk = f"eval_{session_id}"
    
    from google.adk.sessions import Session as ADKSession
    try:
        adk_session = await pipeline_runner.session_service.get_session(app_name="app", user_id="default", session_id=session_id_adk)
    except Exception as e:
        adk_session = None
        
    if not adk_session:
        adk_session = await pipeline_runner.session_service.create_session(app_name="app", user_id="default", session_id=session_id_adk)
        
    prompt_msg = f"Analyze the following transcript:\n{transcript}"
    from google.genai import types
    msg_content = types.Content(role="user", parts=[types.Part.from_text(text=prompt_msg)])
    
    # Run the pipeline (this runs evaluator + draft in parallel, then final agent)
    try:
        async for event in pipeline_runner.run_async(user_id="default", session_id=session_id_adk, new_message=msg_content):
            pass # Wait for completion
    except Exception as e:
        print(f"Evaluate pipeline error: {e}")
        # Proceed with whatever state was generated so far
        
    # Retrieve results from state
    adk_session = await pipeline_runner.session_service.get_session(app_name="app", user_id="default", session_id=session_id_adk)
    state = adk_session.state if adk_session else {}
    
    # Process Facts (Evaluator output)
    extracted_facts_obj = state.get("extracted_facts")
    extracted_facts = []
    if isinstance(extracted_facts_obj, dict):
        extracted_facts = extracted_facts_obj.get("facts", [])
    elif extracted_facts_obj:
        extracted_facts = getattr(extracted_facts_obj, "facts", [])
        
    if genai_client and extracted_facts:
        for f in extracted_facts:
            stmt = f.get("statement") if isinstance(f, dict) else getattr(f, "statement", str(f))
            try:
                emb_res = genai_client.models.embed_content(model="text-embedding-004", contents=stmt)
                emb_vals = emb_res.embeddings[0].values
                db.add(FactVector(id=str(uuid.uuid4()), session_id=session_id, text_content=stmt, embedding_json=json.dumps(emb_vals)))
            except Exception:
                pass
                
    # Process KG (Draft output)
    kg = state.get("knowledge_graph")
    nodes = []
    edges = []
    if isinstance(kg, dict):
        nodes = kg.get("nodes", [])
        edges = kg.get("edges", [])
    elif kg:
        nodes = getattr(kg, "nodes", [])
        edges = getattr(kg, "edges", [])
    
    node_id_map = {}
    for n in nodes:
        name = n.get("concept_name") if isinstance(n, dict) else getattr(n, "concept_name", "")
        summary = n.get("summary") if isinstance(n, dict) else getattr(n, "summary", "")
        n_id = str(uuid.uuid4())
        node_id_map[name] = n_id
        db.add(KnowledgeNode(id=n_id, session_id=session_id, concept_name=name, summary=summary))
        
    for e in edges:
        src = e.get("source_concept") if isinstance(e, dict) else getattr(e, "source_concept", "")
        tgt = e.get("target_concept") if isinstance(e, dict) else getattr(e, "target_concept", "")
        rel = e.get("relationship") if isinstance(e, dict) else getattr(e, "relationship", "")
        if src in node_id_map and tgt in node_id_map:
            db.add(KnowledgeEdge(id=str(uuid.uuid4()), source_node_id=node_id_map[src], target_node_id=node_id_map[tgt], relationship=rel))

    # Process Metrics (Final output)
    metrics = state.get("final_metrics")
    if isinstance(metrics, dict):
        db_session.coverage = metrics.get("coverage", 0)
        db_session.clarity = metrics.get("clarity", 0)
        db_session.confidence = metrics.get("confidence", 0)
    elif metrics:
        db_session.coverage = getattr(metrics, "coverage", 0)
        db_session.clarity = getattr(metrics, "clarity", 0)
        db_session.confidence = getattr(metrics, "confidence", 0)

    db.add(db_session)
    db.commit()
    
    return {"status": "success", "metrics": {"coverage": db_session.coverage, "clarity": db_session.clarity, "confidence": db_session.confidence}}

@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    db_session = db.get(DBSessionModel, session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Delete edges associated with nodes of this session
    nodes = db.exec(select(KnowledgeNode).where(KnowledgeNode.session_id == session_id)).all()
    node_ids = [n.id for n in nodes]
    if node_ids:
        # Simplistic delete for edges since they don't have session_id
        for edge in db.exec(select(KnowledgeEdge)).all():
            if edge.source_node_id in node_ids or edge.target_node_id in node_ids:
                db.delete(edge)
                
    # Delete nodes
    for node in nodes:
        db.delete(node)
        
    # Delete facts
    facts = db.exec(select(FactVector).where(FactVector.session_id == session_id)).all()
    for fact in facts:
        db.delete(fact)
        
    # Delete messages
    messages = db.exec(select(Message).where(Message.session_id == session_id)).all()
    for msg in messages:
        db.delete(msg)
        
    # Delete session
    db.delete(db_session)
    db.commit()
    return {"status": "success"}
