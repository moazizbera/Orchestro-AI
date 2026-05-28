# Orchestro AI

> **Google Cloud Rapid Agent Hackathon** — Gemini-powered subscription intervention agent with MongoDB MCP server integration, MongoDB-backed memory, impact tracking, and guided savings actions.

---

## What It Does

Orchestro AI accepts a natural language request, routes it through a **Gemini-preferred orchestrator**, dispatches it to specialized agents, generates real intervention actions, persists everything to MongoDB through the **official MongoDB MCP server**, and displays results in a live React dashboard.

**Demo scenario:** *"I'm losing money on subscriptions, fix it"*

```
User Request
     │
     ▼
┌─────────────────────┐
│  Orchestrator Agent │  ← Gemini: intent classification, routing, plan
└──────────┬──────────┘
           │
     ┌─────▼──────┐
     │Finance     │  ← Gemini: detect waste, flag subscriptions
     │Agent       │
     └─────┬──────┘
           │
     ┌─────▼──────┐
     │Action      │  ← Gemini: generate cancellation emails & tasks
     │Agent       │
     └─────┬──────┘
           │
    ┌──────▼──────────────┐
    │ MongoDB MCP Server  │  ← partner MCP tools: find / aggregate / insert / update
    └──────┬──────────────┘
           │
    ┌──────▼──────┐
    │  MongoDB    │  ← persist request, decisions, outputs, metrics
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Dashboard  │  ← React: show impact, actions, savings estimate
    └─────────────┘

Submission path:
       Gemini-preferred routing → agent plan → MongoDB MCP tools → MongoDB memory → guided user action
```

## Hackathon Fit

- **Partner track:** MongoDB
- **Partner superpower:** official MongoDB MCP server (`mongodb-mcp-server`)
- **Google stack:** Gemini 2.0 Flash, Vertex AI-ready backend, Cloud Run deployment path
- **Real-world challenge:** reduce subscription waste and prepare real cancellation actions

The backend attempts MongoDB operations through the MongoDB MCP server first and falls back to the direct Motor driver only if the MCP server is unavailable. The AI provider path is also explicit: Gemini is the preferred submission runtime, while local Ollama remains a fallback for development when Gemini credentials are not configured.

---

## Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| AI        | Gemini 2.0 Flash |
| Backend   | Python 3.13 · FastAPI · Motor fallback  |
| Partner   | MongoDB MCP Server (`mongodb-mcp-server`) |
| Database  | MongoDB 7 / Atlas                       |
| Frontend  | React 18 · Vite · Tailwind CSS          |

---

## Quick Start

### 1. Prerequisites

- Python 3.11+
- Node.js 22.22.2+ recommended for the MongoDB MCP server
- Docker (for MongoDB) **or** a local MongoDB instance
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 2. Start MongoDB

```bash
docker-compose up -d mongodb
```

### 3. Backend

```bash
cd backend
cp .env.example .env   # then edit .env with your keys (see below)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

If `uvicorn` exits with `WinError 10048`, port `8000` is already in use. Before treating that as a startup failure, check whether Orchestro is already running:

```bash
curl http://localhost:8000/health
```

If `/health` responds successfully, reuse the existing backend or stop the process already bound to `8000` before starting a new one.

Backend: http://localhost:8000  
Swagger docs: http://localhost:8000/docs

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard: http://localhost:5173

---

## Submission Story

This version is intentionally narrowed for the hackathon submission:

- Gemini handles orchestration and agent reasoning.
- MongoDB MCP provides the partner-track tool layer for database reads, writes, and aggregations.
- MongoDB stores user-linked subscriptions, history, and impact metrics.
- The workspace is gated behind splash and authentication so sensitive subscription data is added only after sign-in.
- The UI shows savings opportunities plus ready-to-send cancellation actions in one session.

### Current runtime behavior

- If `GEMINI_API_KEY` or Vertex credentials are configured, Orchestro uses Gemini as the live provider.
- If Gemini is not configured but Ollama is available, Orchestro stays usable locally by running on Ollama.
- `/health` reports both the active `provider` and the `preferred_provider`, so demo status stays honest.
- MongoDB MCP status is exposed in both `/health` and the dashboard runtime proof card.

Configure `backend/.env` with:

```env
GEMINI_API_KEY=your_key_here
GEMINI_BACKEND=developer
GEMINI_MODEL=gemini-2.0-flash
PREFERRED_PROVIDER=gemini
AI_MODE=auto
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=orchestro_ai
MONGODB_MCP_ENABLED=true
MONGODB_MCP_COMMAND=npx -y mongodb-mcp-server@latest
```

For self-hosted Ollama as a local fallback, point the backend at your local Ollama server:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:1.5b
PREFERRED_PROVIDER=ollama
AI_REQUEST_TIMEOUT_SECONDS=25
AI_MAX_OUTPUT_TOKENS=900
AI_RETRY_ATTEMPTS=1
AI_MODE=auto
```

These Ollama settings are tuned for local demo reliability. If the local model exceeds the shared request budget, Orchestro returns a deterministic fallback orchestration result instead of hanging for several minutes.

For Vertex AI on Google Cloud, switch the backend mode and provide your project settings:

```env
GEMINI_BACKEND=vertex
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=C:\\path\\to\\service-account.json
GEMINI_MODEL=gemini-2.0-flash-001
AI_MODE=auto
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=orchestro_ai
MONGODB_MCP_ENABLED=true
```

Then authenticate with Application Default Credentials or a service account before starting the backend.

---

## Environment Variables

### `backend/.env`

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google AI API key | — |
| `GEMINI_BACKEND` | `developer` or `vertex` | `developer` |
| `GEMINI_MODEL` | Gemini model name | `gemini-2.0-flash` |
| `GOOGLE_CLOUD_PROJECT` | GCP project for Vertex AI | — |
| `GOOGLE_CLOUD_LOCATION` | Vertex AI region | `us-central1` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Service account JSON path for ADC | — |
| `OLLAMA_BASE_URL` | Ollama API base URL for self-hosted usage | `https://ollama.com` |
| `OLLAMA_API_KEY` | Ollama hosted API key if using `https://ollama.com` | — |
| `OLLAMA_MODEL` | Ollama model name | — |
| `PREFERRED_PROVIDER` | Provider selection for the live path | `gemini` |
| `AI_REQUEST_TIMEOUT_SECONDS` | Shared orchestration time budget before fallback | `25` |
| `AI_MAX_OUTPUT_TOKENS` | Output cap for Gemini/Ollama JSON generation | `900` |
| `AI_RETRY_ATTEMPTS` | Ollama retry attempts before deterministic fallback | `1` |
| `AI_MODE` | Legacy compatibility flag for local startup | `auto` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | MongoDB database name | `orchestro_ai` |
| `MONGODB_MCP_ENABLED` | Enable MongoDB MCP-first persistence path | `true` |
| `MONGODB_MCP_COMMAND` | Command used to launch the official MongoDB MCP server | `npx -y mongodb-mcp-server@latest` |
| `MONGODB_MCP_READ_ONLY` | Run MCP server in read-only mode | `false` |
| `MONGODB_MCP_DISABLED_TOOLS` | Comma-separated MCP tools to disable | — |

---

## API Endpoints

| Method | Path                           | Description                    |
|--------|--------------------------------|--------------------------------|
| POST   | `/api/orchestrate`             | Run full orchestration pipeline|
| GET    | `/api/execution/{id}`          | Retrieve stored execution      |
| GET    | `/api/dashboard/metrics`       | Aggregated impact metrics      |
| GET    | `/api/dashboard/executions`    | Recent execution history       |
| GET    | `/health`                      | System health check            |

### Example request

```bash
curl -X POST http://localhost:8000/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"request": "I am losing money on subscriptions, fix it"}'
```

With Gemini configured, `/api/orchestrate` runs on the hackathon submission path. In a local fallback profile, it may respond with either a live Ollama result or a deterministic fallback result. Both return `status: completed`; fallback responses are marked with `providers_used.* = "fallback"` and `confidence_label: "Fallback"`.

### Judge demo checklist

1. Set `GEMINI_API_KEY` or Vertex credentials in `backend/.env`.
2. Start MongoDB and the backend, then confirm `/health` shows `provider: gemini`.
3. Open `http://localhost:5173` and load the built-in judge demo scenario.
4. Run an audit and show the runtime proof card for MongoDB MCP status plus the multi-agent results.

---

## Architecture — Agent Responsibilities

### Orchestrator Agent
- Classifies intent (`FINANCE`, `TASK`, `FINANCE_AND_ACTION`, `GENERAL`)
- Builds a step-by-step execution plan
- Routes to the correct agents

### Finance Intelligence Agent
- Detects wasteful/duplicate subscriptions
- Flags unusual charges or premium tiers
- Estimates monthly & annual financial loss
- Assigns risk level per item (`high` / `medium` / `low`)

### Action Execution Agent
- Generates professional cancellation email drafts
- Creates reminder tasks with deadlines
- Provides negotiation scripts
- Calculates estimated savings

### Memory & Data Layer (MongoDB)
- Uses the official MongoDB MCP server for partner-track reads/writes/aggregations
- Persists every execution with full agent outputs
- Enables history tracking and audit trail
- Powers aggregated dashboard metrics

### MCP Integration
- Launches `mongodb-mcp-server` over stdio from the backend
- Uses MongoDB MCP tools such as `find`, `aggregate`, `insert-many`, and `update-many`
- Reports MCP status through `/health` with `mongodb_mcp_enabled` and `mongodb_mcp_connected`

---

## Success Criteria ✅

- [x] Multi-step orchestration visible in UI
- [x] At least 2 agents used per finance request
- [x] Real actions generated (cancellation emails, reminders)
- [x] All data persisted to MongoDB
- [x] MongoDB partner integration through the official MCP server
- [x] Dashboard shows impact metrics
