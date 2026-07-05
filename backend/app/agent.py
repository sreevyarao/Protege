from google.adk.agents import Agent, ParallelAgent, SequentialAgent, LoopAgent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types
from app.schemas import EvaluatorOutput, DraftOutput, MetricsOutput

# Model configuration
model_config = Gemini(
    model="gemini-3.1-flash-lite",
    retry_options=types.HttpRetryOptions(attempts=3)
)

# 1. Student Agent (Real-time chat)
student_agent = Agent(
    name="student_agent",
    model=model_config,
    instruction=(
        "You are Protege, a curious AI beginner learning from the user. "
        "The user is trying to teach you a concept. "
        "Strictly adhere to these rules:\n"
        "1. Never act like an expert. You are a student.\n"
        "2. Ask clarifying questions if the user's explanation is confusing, incomplete, or ambiguous.\n"
        "3. Show when you are confused and try to piece things together.\n"
        "4. Keep your responses concise (1-2 short paragraphs max) and conversational.\n"
        "5. If the user greets you or says something off-topic, politely pivot back to asking what they want to teach you.\n"
        "6. The user may provide an image diagram or an audio explanation. Use these to help understand the concept."
    ),
)

# 2. Evaluator Agent (Extracts facts for RAG)
evaluator_agent = Agent(
    name="evaluator_agent",
    model=model_config,
    instruction=(
        "You are a strict, objective evaluator agent. Review the provided session transcript "
        "and extract a list of core verifiable factual statements that were discussed.\n"
        "CRITICAL RULES:\n"
        "1. ONLY extract facts explicitly stated by the user. Do NOT hallucinate or infer external knowledge.\n"
        "2. If the transcript is empty, off-topic, or contains no factual claims, return an EMPTY list.\n"
        "3. Each fact must be a standalone, self-contained sentence."
    ),
    output_schema=EvaluatorOutput,
    output_key="extracted_facts",
)

# 3. Draft Agent (Builds Knowledge Graph)
draft_agent = LoopAgent(
    name="draft_agent_loop",
    max_iterations=2,
    sub_agents=[
        Agent(
            name="kg_extractor",
            model=model_config,
            instruction=(
                "You are a meticulous knowledge graph builder. Review the session transcript and "
                "extract the key concepts (nodes) and their relationships (edges).\n"
                "CRITICAL RULES:\n"
                "1. ONLY extract concepts and relationships explicitly discussed in the transcript.\n"
                "2. Do NOT invent nodes. If the transcript lacks substantive concepts, return empty lists.\n"
                "3. Ensure every `source_concept` and `target_concept` in an edge EXACTLY matches a node's `concept_name`."
            ),
            output_schema=DraftOutput,
            output_key="knowledge_graph",
        )
    ]
)

# 4. Parallel Extractor (Runs Evaluator and Draft concurrently)
parallel_extractor = ParallelAgent(
    name="parallel_extractor",
    sub_agents=[evaluator_agent, draft_agent],
)

# 5. Final Agent (Reviews output and calculates metrics)
final_agent = Agent(
    name="final_agent",
    model=model_config,
    instruction=(
        "You are a master teacher reviewing a student's explanation. "
        "Based on the transcript and the extracted knowledge graph, evaluate the student's mastery.\n"
        "CRITICAL RULES:\n"
        "1. Provide a highly detailed and comprehensive summary of their understanding (exactly 5 to 10 paragraphs). \n"
        "   - Paragraph 1: Executive summary of what they successfully taught.\n"
        "   - Paragraph 2: Strict critique of their teaching methodology (e.g., poor pacing, confusing analogies, missed assumptions).\n"
        "   - Paragraph 3 and beyond: Deep dive into individual concepts. Break down the technical nuances of what they got right, what edge cases they completely missed, and provide extensive factual corrections. Expand heavily on how they could improve their mental models.\n"
        "2. Calculate a score out of 100 based on clarity, depth, and accuracy.\n"
        "3. Identify exactly 3 key strengths and 3 areas for improvement, referencing specific points they made."
    ),
    output_schema=MetricsOutput,
    output_key="final_metrics",
)

# 6. Post-Session Pipeline
post_session_pipeline = SequentialAgent(
    name="post_session_pipeline",
    sub_agents=[parallel_extractor, final_agent],
)

# Register the main app with the student agent as the root for standard chat routing,
# though we will manually invoke the pipeline agent for evaluations.
app = App(
    root_agent=student_agent,
    name="app",
)
