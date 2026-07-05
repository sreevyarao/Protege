# Protege: The AI Student

Protege is a unique educational application where *you* are the teacher. By trying to explain concepts to Protege (an AI student powered by Gemini), you identify gaps in your own knowledge. 

Protege asks clarifying questions, visualizes the concepts you teach it in a knowledge graph, and provides a final report on your mastery of the subject!

## Tech Stack
* **Frontend**: Next.js, React, Tailwind CSS, Lucide Icons, React Flow (for Knowledge Graphs)
* **Backend**: FastAPI, SQLModel, SQLite
* **AI & Orchestration**: Google Agent Development Kit (ADK) with Gemini 3.1 Flash Lite natively supporting multimodal input (audio and images).

---

## Getting Started

To run Protege locally, you will need to run both the backend server and the frontend server simultaneously.

### 1. Backend Setup (FastAPI & Google ADK)

The backend requires a Gemini API Key and `uv`, a lightning-fast Python package installer and resolver.

**Installing `uv` (if you don't have it):**
* **macOS/Linux**: `curl -LsSf https://astral.sh/uv/install.sh | sh`
* **Windows**: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
* **via pip**: `pip install uv`
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
cd protege-hackathon

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend application will now be running on [http://localhost:3000](http://localhost:3000).

---

## Features

- **Multimodal Chat**: Protege understands text, voice recordings, and diagrams. 
- **Real-time Graph Generation**: Watch as Protege builds a mental model (Knowledge Graph) of what you are teaching it.
- **Evaluation Pipeline**: Behind the scenes, parallel AI agents evaluate your explanation for clarity, depth, and factual accuracy.
- **Mastery Reports**: Receive a comprehensive breakdown of your teaching performance and knowledge gaps when you end the session.
