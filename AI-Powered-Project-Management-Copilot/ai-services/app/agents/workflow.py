from datetime import date, timedelta
from app.evaluation.metrics import evaluate_outputs
from app.rag.retriever import chunk_text, retrieve_context

def requirement_agent(title, requirements):
    chunks = chunk_text(requirements)
    context = retrieve_context("modules dependencies missing information", chunks)
    modules = []
    # More robust keyword matching
    keyword_map = {
        "auth": "Authentication",
        "login": "Authentication",
        "signup": "Authentication",
        "dashboard": "Dashboard Center",
        "panel": "Dashboard Center",
        "payment": "Payment Gateway",
        "stripe": "Payment Gateway",
        "billing": "Payment Gateway",
        "notification": "Notification Service",
        "email": "Notification Service",
        "sms": "Notification Service",
        "report": "Reporting & Analytics",
        "analytics": "Reporting & Analytics",
        "chart": "Reporting & Analytics",
        "admin": "Admin Control",
        "management": "Admin Control",
        "upload": "File Management",
        "storage": "File Management",
        "chat": "Communication Hub",
        "message": "Communication Hub"
    }
    
    req_lower = requirements.lower()
    for kw, module_name in keyword_map.items():
        if kw in req_lower and module_name not in modules:
            modules.append(module_name)
            
    if len(modules) < 3:
        # Ensure at least some core modules
        fallbacks = ["Authentication", "Dashboard Center", "API Integration", "Database Core"]
        for f in fallbacks:
            if f not in modules:
                modules.append(f)
            if len(modules) >= 5:
                break
                
    return {
        "summary": f"{title} requires {', '.join(modules[:6])} with secure workflow and reporting.",
        "modules": modules,
        "dependencies": ["Database schema", "Authentication", "AI service", "Deployment pipeline"],
        "missingInformation": ["Exact budget", "Team size", "Target launch date", "Third-party API credentials"],
        "citations": [{"source": "user_requirements", "chunk": i+1, "text": c[:180]} for i, c in enumerate(context)]
    }

def task_agent(analysis):
    tasks = []
    for idx, module in enumerate(analysis["modules"], start=1):
        tasks.append({
            "id": f"T-{idx:03}",
            "title": f"Build {module} module",
            "subtasks": ["Design UI", "Create API", "Write validation", "Add tests"],
            "priority": "High" if idx <= 2 else "Medium",
            "dependencies": ["T-001"] if idx > 1 else [],
            "storyPoints": 5 if idx <= 2 else 3,
            "status": "Todo",
            "assigneeRole": "Developer"
        })
    return tasks

def timeline_agent(tasks):
    start = date.today()
    milestones = []
    cursor = start
    for i, task in enumerate(tasks, start=1):
        cursor += timedelta(days=4)
        milestones.append({"name": task["title"], "date": str(cursor), "taskId": task["id"]})
    return {
        "projectDurationDays": max(14, len(tasks) * 4),
        "sprintDurationDays": 14,
        "startDate": str(start),
        "estimatedDelivery": str(start + timedelta(days=max(14, len(tasks) * 4))),
        "criticalPath": [t["id"] for t in tasks[:4]],
        "milestones": milestones
    }

def risk_agent(analysis, tasks):
    risks = [
        {"name": "Requirement ambiguity", "severity": "High", "score": 82, "mitigation": "Confirm missing information with client before sprint planning."},
        {"name": "Dependency conflict", "severity": "Medium", "score": 61, "mitigation": "Freeze API contracts and define integration owners."},
        {"name": "Timeline pressure", "severity": "Medium", "score": 58, "mitigation": "Reduce scope into MVP and keep buffer in each sprint."}
    ]
    if len(tasks) > 6:
        risks.append({"name": "Resource overload", "severity": "High", "score": 79, "mitigation": "Add one developer or split release into phases."})
    return risks

def team_agent(tasks):
    people = [
        {"name": "Asha", "role": "Project Manager", "skills": ["planning", "client communication"], "availability": 80},
        {"name": "Ravi", "role": "Developer", "skills": ["React", "Node"], "availability": 70},
        {"name": "Meera", "role": "QA Engineer", "skills": ["testing", "automation"], "availability": 75},
        {"name": "Kiran", "role": "Designer", "skills": ["UI/UX", "Figma"], "availability": 65}
    ]
    allocation = []
    for i, task in enumerate(tasks):
        person = people[(i % (len(people)-1)) + 1]
        allocation.append({"taskId": task["id"], "task": task["title"], "assignedTo": person["name"], "role": person["role"], "workloadPercent": min(90, 40 + task["storyPoints"] * 8)})
    return allocation

def report_agent(tasks, risks):
    return {
        "title": "Weekly Project Progress Report",
        "completionPercentage": 0,
        "completed": [],
        "inProgress": [],
        "blockers": [r["name"] for r in risks if r["severity"] == "High"],
        "summary": "Project is in planning stage. Requirements converted into tasks, risks, and milestones."
    }

def email_agent(title, report, risks):
    return {
        "subject": f"Weekly Update: {title}",
        "body": f"""Dear Client,

Here is this week's update for {title}.

Progress: {report['completionPercentage']}%
Current Status: Planning completed and initial task breakdown is ready.
Key Risks: {', '.join([r['name'] for r in risks])}
Next Step: Confirm missing information and approve sprint roadmap.

Regards,
Project Management Copilot"""
    }

def run_project_workflow(title: str, requirements: str) -> dict:
    analysis = requirement_agent(title, requirements)
    tasks = task_agent(analysis)
    timeline = timeline_agent(tasks)
    risks = risk_agent(analysis, tasks)
    team = team_agent(tasks)
    report = report_agent(tasks, risks)
    email = email_agent(title, report, risks)
    result = {
        "analysis": analysis,
        "tasks": tasks,
        "timeline": timeline,
        "risks": risks,
        "teamAllocation": team,
        "weeklyReport": report,
        "emailUpdate": email
    }
    result["evaluation"] = evaluate_outputs(requirements, result)
    return result
