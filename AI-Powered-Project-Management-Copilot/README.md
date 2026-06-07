# AI-Powered Project Management Copilot

A resume-worthy full-stack AI project that converts client requirements into tasks, timelines, milestones, risks, team allocation, weekly reports, and client email updates.

## Tech Stack

- Frontend: React, Tailwind CSS, ShadCN-style components, Recharts
- Backend: Node.js, Express, MongoDB, JWT, RBAC
- AI service: FastAPI, LangChain/LangGraph-ready architecture, ChromaDB-style local vector store fallback
- Automation: n8n sample workflows
- Deployment: Vercel frontend, Render backend, Docker Compose

## Features

- Authentication with roles: Admin, Project Manager, Developer, Viewer
- Requirement analyzer with document/text ingestion
- Multi-agent workflow simulation: requirement, task, timeline, risk, allocation, report, email, evaluation, security agents
- Kanban/table/timeline task views
- Analytics dashboard with risk, completion, latency, cost, evaluation metrics, audit logs
- Weekly report and email generator
- Prompt injection checks, input validation, rate limiting, secure upload validation, Helmet, CORS
- n8n workflows for reports, email, Slack, Jira/Trello sync
- 30 sample requirement documents
- API documentation and architecture diagram

## Quick Start

### 1. Backend

```bash
cd backend
cp ../.env.example .env
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### 2. AI Service

```bash
cd ai-services
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

AI service runs on `http://localhost:8000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Demo Login

Use the signup page to create users. To create admin quickly, use:

```bash
curl -X POST http://localhost:5000/api/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Admin\",\"email\":\"admin@test.com\",\"password\":\"Admin@123\",\"role\":\"Admin\"}"
```

## Docker

```bash
docker compose -f docker-compose.yml up --build
```

## Architecture

See `docs/architecture.md`.

## Deployment

- Frontend: import `frontend/` into Vercel, set `VITE_API_URL`
- Backend: deploy `backend/` on Render, set env vars from `.env.example`
- AI service: deploy `ai-services/` as Python web service

## Future Improvements

- Replace mock LLM fallback with production OpenAI/Gemini/Claude calls
- Add full LangSmith tracing
- Add real Jira, Slack, Gmail OAuth
- Add background workers for scheduled reports
