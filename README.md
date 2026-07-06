# Protege: The AI Student

Protege flips the usual AI-tutor relationship. Instead of an AI teaching the user, the user teaches Protege — an AI student powered by Gemini. By trying to explain a concept out loud to something that keeps asking "but why?", you find the gaps in your own understanding.

Built for **Kaggle's Intense Vibe Coding** hackathon (Competition Prize Track: Agents for Good).

## Visual Preview

Protege is designed as a fast, conversational teaching loop. A few screenshots from the project assets show the experience at a glance:

<div align="center">
  <img src="assets/Screenshot From 2026-07-06 09-54-07.png" alt="Protege landing experience" width="48%" />
  <img src="assets/Screenshot From 2026-07-06 09-55-21.png" alt="Protege teaching session" width="48%" />
</div>

<div align="center">
  <img src="assets/Screenshot From 2026-07-06 09-55-38.png" alt="Protege session interface" width="48%" />
  <img src="assets/Screenshot From 2026-07-06 09-56-08.png" alt="Protege mastery report" width="48%" />
</div>

These visuals highlight the guided onboarding, live tutoring flow, and the evaluation report that closes each session.

### Demo Video

A short demo of the experience is also available:



https://github.com/user-attachments/assets/237bea2e-d0fa-457d-b4f1-ebc958fe57d6



## The Problem

Richard Feynman's advice was simple: if you can't explain something in plain language, you don't actually understand it. It's backed by real learning science — active recall and self-explanation are consistently among the most effective ways to retain information, far more effective than re-reading or highlighting.

The catch is that the Feynman Technique needs a listener — someone patient enough to sit through your explanation and ask "but why?" until you either fill the gap or find it. Most learners don't have that on demand, so they default to what's accessible: re-reading notes, flashcards, memorization. It works less well, but it's available.

## What We Built

Protege plays a curious, slightly confused student — asking follow-up questions, poking at hand-wavy explanations, pushing for examples — until the user has actually taught the concept properly. When the session ends, a multi-agent evaluation pipeline scores the explanation and produces a mastery report.

## How It Works

Protege isn't a single prompt wearing a persona — it's a multi-agent pipeline built on Google's Agent Development Kit (ADK):

- A **student agent** conducts the live conversation via Gemini, accepting text, voice, and image input (e.g. a diagram) from the user.
- On session end, a **ParallelAgent** runs two branches concurrently: a fact-extraction agent and a knowledge-graph-building agent (itself a **LoopAgent** that iteratively refines extracted concepts and relationships).
- A **SequentialAgent** then takes those outputs and produces the final scored report — coverage, clarity, and confidence — using structured Pydantic output schemas rather than parsing free-text model output.
- Retrieval is intentionally scoped to the current session. Cross-session retrieval was considered (to ground follow-up questions in a user's past sessions) but was ruled out — it risked crediting one topic's evaluation with facts from an unrelated one, and it broke the "Protege starts each session with no prior knowledge of this topic" framing the product depends on.
- A dedicated **agent-evaluation harness** (test datasets + metrics, separate from the product's own scoring) checks the pipeline's own output quality.

## Proof It Works

A real recorded session (Newton's Third Law, explained via a car-braking and wall-pushing example) shows the full pipeline firing correctly end to end: a coherent, in-character multi-turn conversation, a completed evaluation (coverage 85 / clarity 80 / confidence 90), and 17 extracted knowledge-graph concepts that map directly onto what was actually discussed. (Note: as of this writing, deduplication of near-identical concepts hasn't shipped yet, so this raw count may include some overlap — see Limitations below.)

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, Lucide Icons, React Flow
- **Backend:** FastAPI, SQLModel, SQLite
- **AI & Orchestration:** Google Agent Development Kit (ADK) — ParallelAgent / SequentialAgent / LoopAgent — with Gemini for multimodal input (text, audio, and images)

## Features

- **Multimodal Chat:** Protege understands text, voice recordings, and diagrams.
- **Knowledge Graph Extraction:** A LoopAgent iteratively builds a graph of the concepts and relationships you teach it.
- **Evaluation Pipeline:** Parallel and sequential agents score your explanation for coverage, clarity, and confidence.
- **Mastery Reports:** Receive a breakdown of your teaching performance and knowledge gaps when you end the session.

## Getting Started

To run Protege locally, you will need to run both the backend server and the frontend server simultaneously.

### 1. Backend Setup (FastAPI & Google ADK)

The backend requires a Gemini API Key and [uv](https://astral.sh/uv/), a fast Python package installer and resolver.

Installing uv (if you don't have it):

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# via pip
pip install uv
```

```bash
# Navigate to the backend directory
cd backend

# Create your environment variables file
cp .env.example .env

# Edit .env and add your Gemini API Key:
# GEMINI_API_KEY=your_api_key_here

# Install backend dependencies
uv sync

# Run the FastAPI server
uv run uvicorn app.main:app --reload --port 8000
```

The backend server will now be running on `http://127.0.0.1:8000`.

### 2. Frontend Setup (Next.js)

Open a new terminal window/tab to start the frontend.

```bash
# Navigate to the project root
cd Protege

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend application will now be running on `http://localhost:3000`.

## Honest Limitations & Roadmap

In the interest of not overselling a hackathon build, here's where Protege stands and where it's going.

### Current Limitations

- The knowledge graph is extracted and stored on the backend, but isn't yet rendered visually in the frontend — it currently surfaces only as extracted-concept highlights in the report.
- The knowledge-graph LoopAgent produces some duplicate/near-duplicate nodes across iterations.
- Vector search for fact retrieval is a straightforward in-memory cosine-similarity implementation — fine at hackathon scale, not built for production scale.
- The evaluation harness checks pipeline output quality, but the test dataset is small and hand-curated; it hasn't been validated against a larger set of human-rated sessions.
- Gemini API usage has no rate-limiting, retry/backoff, or cost-tracking layer — a burst of concurrent sessions would hit quota or budget limits with no graceful degradation.
- Session transcripts (including voice and image uploads) are stored with no stated retention or deletion policy.

### Roadmap

**Now (blocking correctness / trust in results)**
- **Deduplicate the knowledge graph.** Add a merge step at the end of each LoopAgent iteration: embed new nodes, merge any pair above a similarity threshold, and fall back to a cheap LLM "are these the same concept?" call only for borderline cases. This directly protects the credibility of the coverage/clarity scores, since duplicate nodes currently inflate apparent coverage.
- **Add basic Gemini API resilience.** Retry-with-backoff on rate limits, and a per-session token/cost ceiling so one long multimodal session can't silently blow through budget.

**Next (visible product gaps)**
- **Render the knowledge graph in the frontend.** React Flow is already in the stack — expose the backend graph via an endpoint and render nodes/edges post-dedup, so the "17 concepts extracted" claim is inspectable rather than asserted.
- **Expand the evaluation harness.** Grow the test dataset with human-rated sessions across a few more topics (not just Newton's Third Law) so coverage/clarity/confidence scores can be checked for consistency across domains, not just correctness on one example.
- **State a data retention policy.** Even a simple "sessions deleted after N days unless the user saves the report" closes an obvious gap before this goes in front of more users.

**Later (scale-out)**
- **Swap in-memory cosine similarity for a real vector store** (e.g. pgvector or Chroma) once session volume or per-session fact count makes in-memory search a bottleneck.
- **Cross-session features, revisited carefully.** Cross-session retrieval was correctly ruled out for grounding follow-up questions (risk of leaking facts across topics), but a lighter-weight version — e.g. a personal history of past mastery reports, with no retrieval into live sessions — could be worth revisiting once the single-session pipeline is solid.
- **Multi-language support**, since the current pipeline structure (student agent → parallel extraction → sequential scoring) doesn't obviously depend on English.

## Where This Sits in the Landscape

Explain-to-an-AI study tools already exist (Feynman AI, StudyTok AI, and others), and Stanford's SCALE Initiative has published research on a similar "Feynman Bot" concept. Protege doesn't claim to be first to the idea. What's different is the architecture: rather than one model call scoring a paragraph, Protege runs a multi-agent Gemini pipeline — parallel extraction, iterative graph-building, sequential scoring, and its own evaluation harness.

## Contributors

- [@ThoughtStorm06](https://github.com/ThoughtStorm06) — Jeevan
- [@sreevyarao](https://github.com/sreevyarao) — S. Sreevya Rao

## Languages

TypeScript · JavaScript · CSS
