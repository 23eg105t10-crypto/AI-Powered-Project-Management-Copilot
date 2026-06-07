# Architecture Diagram

```mermaid
flowchart TD
  U[User] --> FE[React Frontend]
  FE --> API[Express Backend API]
  API --> DB[(MongoDB Atlas)]
  API --> AI[FastAPI AI Service]
  API --> N8N[n8n Webhooks]
  AI --> SEC[Security Monitor]
  AI --> RAG[RAG Pipeline]
  RAG --> VDB[(ChromaDB / Local Vector Store)]
  AI --> LG[LangGraph Multi-Agent Workflow]
  LG --> A1[Requirement Agent]
  LG --> A2[Task Agent]
  LG --> A3[Timeline Agent]
  LG --> A4[Risk Agent]
  LG --> A5[Team Allocation Agent]
  LG --> A6[Report Agent]
  LG --> A7[Email Agent]
  LG --> A8[Evaluation Agent]
  API --> LOGS[Audit Logs & Analytics]
```

## Data Flow

1. User uploads requirements or pastes text.
2. Backend validates input and forwards content to AI service.
3. AI service masks sensitive data and checks prompt injection.
4. RAG pipeline chunks and retrieves relevant context.
5. Multi-agent workflow generates project plan.
6. Backend stores projects, tasks, risks, metrics, and audit logs.
7. Frontend displays workspace, Kanban, dashboards, reports, and emails.
