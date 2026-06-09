
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import axios from "axios";
import {
  Brain, LayoutDashboard, ClipboardList, BarChart3, FileText, ShieldCheck,
  Sparkles, Moon, Sun, Copy, Mail, Download, Loader2, Users, AlertTriangle,
  LogOut, UserPlus, LogIn, Rocket, Activity, CalendarDays, Target
} from "lucide-react";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "";

function getUser() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); }
  catch { return null; }
}

function NavItem({ to, icon: Icon, children }) {
  const location = useLocation();
  const active = location.pathname === to;
  return <Link to={to} className={`nav-item ${active ? "nav-active" : ""}`}><Icon size={17}/>{children}</Link>;
}

function Layout({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") !== "light");
  const [user, setUser] = useState(getUser());
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("light", !dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-icon"><Brain size={24}/></span>
          <span>AI PM Copilot</span>
        </Link>

        <div className="nav-list">
          <NavItem to="/dashboard" icon={LayoutDashboard}>Dashboard</NavItem>
          <NavItem to="/workspace" icon={ClipboardList}>Workspace</NavItem>
          <NavItem to="/analytics" icon={BarChart3}>Analytics</NavItem>
          <NavItem to="/reports" icon={FileText}>Reports</NavItem>
          <NavItem to="/admin" icon={ShieldCheck}>Admin</NavItem>
        </div>

        <div className="sidebar-card">
          <p className="mini-title">Hackathon Winning Stack</p>
          <p>RAG · Multi-agent planning · Risk intelligence · Reports · Evaluation · Security</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Enterprise AI Capstone</p>
            <h1>AI-Powered Project Management Copilot</h1>
          </div>
          <div className="top-actions">
            {user ? <span className="user-chip">{user.name || "User"} · {user.role || "Admin"}</span> : <Link className="secondary-btn" to="/login"><LogIn size={17}/> Login</Link>}
            <button className="theme-btn" onClick={() => setDark(!dark)}>{dark ? <Sun size={18}/> : <Moon size={18}/>} {dark ? "Light" : "Dark"}</button>
            {user && <button className="danger-btn" onClick={logout}><LogOut size={17}/> Logout</button>}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function Landing() {
  return (
    <Layout>
      <section className="hero">
        <div>
          <p className="pill"><Rocket size={16}/> Hackathon-ready enterprise AI project</p>
          <h2>Turn client requirements into execution-ready project plans.</h2>
          <p>Generate tasks, sprint timelines, risks, team allocation, weekly reports, professional emails, analytics and audit logs using a multi-agent workflow.</p>
          <div className="hero-actions">
            <Link to="/login" className="primary-btn">Start Demo</Link>
            <Link to="/workspace" className="secondary-btn">Open Workspace</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function Login() {
  const [mode,setMode]=useState("login");
  const [name,setName]=useState("Admin");
  const [email,setEmail]=useState("admin@test.com");
  const [password,setPassword]=useState("Admin@123");
  const [role,setRole]=useState("Admin");
  const [msg,setMsg]=useState("");
  const [loading,setLoading]=useState(false);
  const navigate = useNavigate();

  async function submit(){
    setLoading(true); setMsg("");
    try{
      const url = mode==="login" ? "/api/auth/login" : "/api/auth/signup";
      const body = mode==="login" ? {email,password} : {name,email,password,role};
      const {data}= await axios.post(API+url, body);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setMsg("Success! Redirecting...");
      setTimeout(() => navigate("/dashboard"), 500);
    }catch(e){
      const message = e.response?.data?.message || e.message;
      if (message.toLowerCase().includes("email already")) {
        setMsg("Account already exists. Switch to Login and use the same email/password.");
      } else {
        setMsg(message);
      }
    } finally { setLoading(false); }
  }

  return (
    <Layout>
      <div className="login-page">
        <div className="login-promo">
          <p className="pill"><Sparkles size={16}/> Enterprise AI Demo</p>
          <h2>Beautiful auth page with role-based access</h2>
          <p>This project includes Admin, Project Manager, Developer and Viewer roles with JWT authentication.</p>
          <div className="promo-grid">
            <span>JWT Auth</span><span>RBAC</span><span>Protected APIs</span><span>Audit Logs</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button className={mode==="login" ? "tab active-tab" : "tab"} onClick={()=>setMode("login")}><LogIn size={17}/> Login</button>
            <button className={mode==="signup" ? "tab active-tab" : "tab"} onClick={()=>setMode("signup")}><UserPlus size={17}/> Signup</button>
          </div>

          <h2>{mode==="login" ? "Welcome back" : "Create your account"}</h2>
          {mode==="signup" && <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"/>}
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/>
          <input className="input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password"/>
          {mode==="signup" && (
            <select className="input" value={role} onChange={e=>setRole(e.target.value)}>
              <option>Admin</option><option>Project Manager</option><option>Developer</option><option>Viewer</option>
            </select>
          )}
          <button onClick={submit} className="primary-btn full">{loading ? <><Loader2 className="spin" size={18}/> Please wait...</> : mode==="login" ? "Login" : "Create Account"}</button>
          <p className={msg.toLowerCase().includes("success") ? "success-msg" : "error-msg"}>{msg}</p>
        </div>
      </div>
    </Layout>
  );
}

function Dashboard() {
  const latest = (() => { try { return JSON.parse(localStorage.getItem("latestProjectResult") || "null"); } catch { return null; }})();
  const totalTasks = latest?.tasks?.length || 8;
  const highRisks = latest?.risks?.filter(r => r.severity === "High").length || 3;

  const cards = [
    ["Active Projects", "8", "MongoDB workspace", "blue", Activity],
    ["Generated Tasks", totalTasks, "from latest workflow", "purple", ClipboardList],
    ["High Risks", highRisks, "need mitigation", "red", AlertTriangle],
    ["Completion", "64%", "delivery health", "green", Target]
  ];

  return (
    <Layout>
      <div className="metric-grid">
        {cards.map(([title,value,sub,color,Icon]) => (
          <div className={`metric-card ${color}`} key={title}>
            <Icon className="metric-icon" size={34}/>
            <p>{title}</p><h3>{value}</h3><span>{sub}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="glass-card wide">
          <p className="eyebrow">Execution Intelligence</p>
          <h2>Platform Modules</h2>
          <div className="module-grid">
            {["Requirement Analyzer","Multi-Agent Workflow","Kanban Board","Gantt Timeline","Risk Engine","Weekly Reports","Email Generator","Audit Logs"].map(x => (
              <div className="module-chip" key={x}><Sparkles size={15}/>{x}</div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <p className="eyebrow">Latest Project</p>
          <h2>{latest?.title || "E-commerce Platform"}</h2>
          <p className="muted">{latest?.analysis?.summary || "Run a workflow from Workspace to update this card."}</p>
          <Link className="primary-btn full" to="/workspace">Open Workspace</Link>
        </div>
      </div>
    </Layout>
  );
}

function Workspace() {
  const [title,setTitle]=useState("E-commerce Platform");
  const [requirements,setRequirements]=useState("Client needs authentication, admin dashboard, product catalog, cart, payment, analytics reports, weekly email updates and deployment.");
  const [result,setResult]=useState(() => { try { return JSON.parse(localStorage.getItem("latestProjectResult") || "null"); } catch { return null; }});
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");

  async function analyze(){
    setLoading(true); setErr("");
    try{
      const token=localStorage.getItem("token");
      if (!token) throw new Error("Please login first.");
      const {data}=await axios.post(API+"/api/projects/analyze",{title,requirements},{headers:{Authorization:`Bearer ${token}`}});
      const withTitle = { ...data, title };
      setResult(withTitle);
      localStorage.setItem("latestProjectResult", JSON.stringify(withTitle));
    }catch(e){setErr(e.response?.data?.message||e.message)} finally{setLoading(false)}
  }

  return (
    <Layout>
      <div className="workspace-grid">
        <div className="glass-card">
          <p className="eyebrow">Requirement Analyzer</p>
          <h2>Client Requirement Input</h2>
          <input className="input" value={title} onChange={e=>setTitle(e.target.value)}/>
          <textarea className="input textarea" value={requirements} onChange={e=>setRequirements(e.target.value)}/>
          <button onClick={analyze} className="primary-btn full">
            {loading ? <><Loader2 className="spin" size={18}/> Running Multi-Agent Workflow...</> : "Run Multi-Agent Workflow"}
          </button>
          {err && <p className="error-msg">{err}</p>}
        </div>

        <div className="glass-card ai-summary">
          <p className="eyebrow">AI Summary</p>
          {result ? (
            <>
              <h2>{result.analysis?.summary}</h2>
              <div className="tag-wrap">{result.analysis?.modules?.map(m => <span className="tag" key={m}>{m}</span>)}</div>
              <p className="muted">Missing info: {result.analysis?.missingInformation?.join(", ")}</p>
              <p className="safe"><ShieldCheck size={16}/> Security: {result.analysis?.security?.threatLevel}</p>
            </>
          ) : <p className="muted">Run analysis to see output.</p>}
        </div>
      </div>

      {result && (
        <>
          <div className="three-grid">
            <Panel title="Generated Tasks" icon={<ClipboardList/>} items={result.tasks?.map(t=>`${t.id}: ${t.title} (${t.priority}, ${t.storyPoints} SP)`)}/>
            <Panel title="Risk Detection" icon={<AlertTriangle/>} items={result.risks?.map(r=>`${r.name}: ${r.severity} - ${r.mitigation}`)}/>
            <Panel title="Team Allocation" icon={<Users/>} items={result.teamAllocation?.map(a=>`${a.assignedTo} → ${a.task}`)}/>
          </div>

          <div className="glass-card">
            <h2>Kanban Board</h2>
            <div className="kanban">
              {["Todo","In Progress","Review","Done"].map(status => (
                <div className="kanban-col" key={status}>
                  <h3>{status}</h3>
                  {(status === "Todo" ? (result.tasks || []) : []).map(t => (
                    <div className="task-card" key={t.id}><b>{t.title}</b><span>{t.priority} · {t.storyPoints} Story Points</span></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

function Panel({title, icon, items=[]}) {
  return <div className="glass-card panel"><div className="panel-title">{icon}<h3>{title}</h3></div><ul>{items.map((x,i)=><li key={i}>{x}</li>)}</ul></div>;
}

function Analytics(){
  const usage=[
    {name:"Mon",requests:14,cost:.22,latency:1100},
    {name:"Tue",requests:21,cost:.31,latency:1340},
    {name:"Wed",requests:17,cost:.25,latency:1240},
    {name:"Thu",requests:28,cost:.42,latency:1430},
    {name:"Fri",requests:19,cost:.29,latency:1190}
  ];
  const risks = [{name:"High", value:3},{name:"Medium", value:7},{name:"Low", value:12}];

  return (
    <Layout>
      <div className="analytics-grid">
        <ChartCard title="AI Usage Requests"><ResponsiveContainer><BarChart data={usage}><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="requests" fill="#6366f1" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Cost Per Day"><ResponsiveContainer><AreaChart data={usage}><XAxis dataKey="name"/><YAxis/><Tooltip/><Area dataKey="cost" fill="#22c55e66" stroke="#22c55e"/></AreaChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Latency Monitoring"><ResponsiveContainer><LineChart data={usage}><XAxis dataKey="name"/><YAxis/><Tooltip/><Line dataKey="latency" stroke="#f97316" strokeWidth={3}/></LineChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Risk Severity"><ResponsiveContainer><PieChart><Pie data={risks} dataKey="value" nameKey="name" outerRadius={90}>{["#ef4444","#f59e0b","#22c55e"].map(c=><Cell key={c} fill={c}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></ChartCard>
      </div>
    </Layout>
  );
}

function ChartCard({title, children}) {
  return <div className="glass-card chart-card"><h2>{title}</h2>{children}</div>;
}

function Reports(){
  const project = (() => { try { return JSON.parse(localStorage.getItem("latestProjectResult") || "null"); } catch { return null; }})();
  const reportText = useMemo(() => {
    if (!project) return "No project found. Go to Workspace and click Run Multi-Agent Workflow first.";
    const tasks = project.tasks || [], risks = project.risks || [], team = project.teamAllocation || [];
    return `WEEKLY PROJECT REPORT

Project: ${project.title || "Untitled Project"}
Status: Planning Completed
Completion: ${project.weeklyReport?.completionPercentage ?? 0}%

1. Executive Summary
${project.weeklyReport?.summary || "Project planning is completed and initial execution roadmap is ready."}

2. Generated Tasks
${tasks.map(t => `- ${t.id}: ${t.title} | Priority: ${t.priority} | Story Points: ${t.storyPoints}`).join("\n")}

3. Key Risks and Mitigation
${risks.map(r => `- ${r.name} | Severity: ${r.severity} | Score: ${r.score} | Mitigation: ${r.mitigation}`).join("\n")}

4. Team Allocation
${team.map(a => `- ${a.assignedTo} (${a.role}) assigned to ${a.task} | Workload: ${a.workloadPercent}%`).join("\n")}

5. Timeline
Estimated Delivery: ${project.timeline?.estimatedDelivery || "Not available"}
Sprint Duration: ${project.timeline?.sprintDurationDays || 14} days
Critical Path: ${(project.timeline?.criticalPath || []).join(", ")}

6. Next Actions
- Confirm missing information with client
- Approve sprint roadmap
- Start UI/API implementation
- Monitor high severity risks weekly`;
  }, [project]);

  const [customReport, setCustomReport] = useState(reportText);
  useEffect(() => setCustomReport(reportText), [reportText]);

  function copyText(text, label) { navigator.clipboard.writeText(text); alert(label + " copied!"); }
  function downloadReport() {
    const blob = new Blob([customReport], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "weekly-project-report.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout>
      <div className="reports-grid">
        <div className="glass-card">
          <p className="eyebrow">Weekly Report Generator</p>
          <h2>Generated Project Report</h2>
          <textarea className="report-box" value={customReport} onChange={e=>setCustomReport(e.target.value)}/>
          <div className="action-row">
            <button className="primary-btn" onClick={()=>copyText(customReport, "Report")}><Copy size={17}/> Copy Report</button>
            <button className="secondary-btn" onClick={downloadReport}><Download size={17}/> Download TXT</button>
          </div>
        </div>

        <div className="glass-card">
          <p className="eyebrow">Email Update Generator</p>
          <h2>Client Email</h2>
          <div className="email-preview">
            <b>{project?.emailUpdate?.subject || "Weekly Update"}</b>
            <pre>{project?.emailUpdate?.body || "Generate a project first from Workspace."}</pre>
          </div>
          <button className="primary-btn full" onClick={()=>copyText(project?.emailUpdate?.body || "", "Email")}><Mail size={17}/> Copy Client Email</button>
        </div>
      </div>
    </Layout>
  );
}

function Admin(){
  const logs = [["Admin", "ANALYZE_PROJECT", "Project", "Success"],["Security Agent", "PROMPT_SCAN", "Requirement", "Low Risk"],["Evaluation Agent", "RAGAS_SCORE", "Output", "Faithfulness 88%"]];
  return <Layout><div className="glass-card"><p className="eyebrow">Admin Panel</p><h2>Security, Evaluation and Audit Logs</h2><table className="log-table"><thead><tr><th>Actor</th><th>Action</th><th>Entity</th><th>Status</th></tr></thead><tbody>{logs.map((r,i)=><tr key={i}>{r.map(c=><td key={c}>{c}</td>)}</tr>)}</tbody></table></div></Layout>;
}

function App(){
  return <BrowserRouter><Routes>
    <Route path="/" element={<Landing/>}/><Route path="/login" element={<Login/>}/><Route path="/dashboard" element={<Dashboard/>}/>
    <Route path="/workspace" element={<Workspace/>}/><Route path="/analytics" element={<Analytics/>}/><Route path="/reports" element={<Reports/>}/><Route path="/admin" element={<Admin/>}/>
  </Routes></BrowserRouter>;
}

createRoot(document.getElementById("root")).render(<App/>);
