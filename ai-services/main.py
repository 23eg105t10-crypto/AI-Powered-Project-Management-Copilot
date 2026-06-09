from fastapi import FastAPI
from pydantic import BaseModel
from app.agents.workflow import run_project_workflow
from app.security.guardrails import validate_prompt, mask_sensitive_data

app = FastAPI(title="AI Project Management Copilot AI Service")

class AnalyzeRequest(BaseModel):
    title: str
    requirements: str

@app.get("/health")
def health():
    return {"ok": True, "service": "ai-service"}

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    clean_text = mask_sensitive_data(req.requirements)
    security = validate_prompt(clean_text)
    result = run_project_workflow(req.title, clean_text)
    result["analysis"]["security"] = security
    return result
