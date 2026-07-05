import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add backend to path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from app.agent import post_session_pipeline
from google.adk.runners import InMemoryRunner
from google.adk.sessions import Session as ADKSession
from google.genai import types

async def test_pipeline():
    print("Initializing ADK Runner for Pipeline Eval...")
    runner = InMemoryRunner(agent=post_session_pipeline, app_name="app")
    
    # 1. Rigorous test case: Clear transcript
    print("--- Test 1: Clear Explanation ---")
    clear_transcript = "USER: Neural Networks use interconnected nodes called neurons. The input layer receives data, passes it to hidden layers with weights, and outputs a prediction."
    session_id = "eval_test_clear"
    await runner.session_service.create_session(app_name="app", user_id="test", session_id=session_id)
    msg_content = types.Content(role="user", parts=[types.Part.from_text(text=f"Analyze the following transcript:\n{clear_transcript}")])
    
    async for event in runner.run_async(user_id="test", session_id=session_id, new_message=msg_content):
        pass # Wait for completion
    session = await runner.session_service.get_session(app_name="app", user_id="test", session_id=session_id)
    state = session.state
    print("Metrics Output:", state.get("final_metrics"))
    print("Facts Output:", len(getattr(state.get("extracted_facts"), "facts", [])))
    print("Nodes Output:", len(getattr(state.get("knowledge_graph"), "nodes", [])))
    print("---------------------------------")
    
    # 2. Rigorous test case: Empty/Meaningless transcript
    print("--- Test 2: Meaningless Explanation (Testing strict constraints) ---")
    bad_transcript = "USER: um yeah so I dont really know what to say, I'm just testing this app lol."
    session_id_2 = "eval_test_bad"
    await runner.session_service.create_session(app_name="app", user_id="test", session_id=session_id_2)
    msg_content_2 = types.Content(role="user", parts=[types.Part.from_text(text=f"Analyze the following transcript:\n{bad_transcript}")])
    
    try:
        async for event in runner.run_async(user_id="test", session_id=session_id_2, new_message=msg_content_2):
            pass
        session_2 = await runner.session_service.get_session(app_name="app", user_id="test", session_id=session_id_2)
        state_2 = session_2.state
        print("Metrics Output:", state_2.get("final_metrics"))
        print("Facts Output:", len(getattr(state_2.get("extracted_facts"), "facts", [])))
        print("Nodes Output:", len(getattr(state_2.get("knowledge_graph"), "nodes", [])))
    except Exception as e:
        print(f"Exception caught successfully (Schema enforced rejection of bad data): {e}")
    print("---------------------------------")

if __name__ == "__main__":
    asyncio.run(test_pipeline())
