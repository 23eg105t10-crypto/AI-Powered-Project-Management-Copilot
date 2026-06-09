import React, { useState, useEffect, createContext, useContext, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ComposedChart } from "recharts";
import { motion } from "framer-motion";
import { AlertTriangle, BarChart3, CalendarDays, CheckCircle2, ClipboardList, Cloud, Code2, DollarSign, Gauge, Layers, Mail, Rocket, ShieldCheck, Sparkles, Target, Users } from "lucide-react";
import axios from "axios";
import jsPDF from "jspdf";
import MilestoneTimeline, {
  buildTimelineReportText,
  formatMilestoneDate,
  formatMilestoneTitle,
  parseMilestonesList
} from "./components/project/MilestoneTimeline";
import { normalizeTeamAllocation, splitAssignedTasks, parseWorkloadPercent } from "./components/ai-workflow/workflowHelpers";
import EvaluationMetricsCards from "./components/project/EvaluationMetricsCards";
import { buildEvaluationReportLines, formatEvaluationMetrics } from "./components/project/formatEvaluationMetrics";
import AuthPage from "./components/auth/AuthPage";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "";

const safeParse = (key, fallback = null) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
};

function getUserKey() {
  try { const u = JSON.parse(localStorage.getItem('user') || 'null'); return (u && (u.email || u.id)) ? (u.email || u.id).toString().replace(/\s+/g,'_') : null; } catch { return null; }
}
function userKeyed(key){ const uk = getUserKey(); return uk ? `${key}_${uk}` : key; }
function userSafeParse(key, fallback = null){ return safeParse(userKeyed(key), fallback); }
function userSetItem(key, value){ try{ localStorage.setItem(userKeyed(key), JSON.stringify(value)); }catch(e){} }
function userPushArrayKey(key, value){ const arr = userSafeParse(key, []); arr.push(value); userSetItem(key, arr); }

const normalizeOutputValue = value => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(normalizeOutputValue).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, val]) => `${key}: ${normalizeOutputValue(val)}`)
      .filter(Boolean)
      .join(' | ');
  }
  return String(value);
};

const asArray = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(/\n|;/).map(x => x.trim()).filter(Boolean);
  if (typeof value === 'object') return Object.values(value).map(normalizeOutputValue).filter(Boolean);
  return [String(value)];
};

const textFrom = item => {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return String(item || '');
  const parts = [];
  if (item.name) parts.push(item.name);
  if (item.title) parts.push(item.title);
  if (item.task) parts.push(item.task);
  if (item.summary) parts.push(item.summary);
  if (item.description) parts.push(item.description);
  if (item.milestone) parts.push(item.milestone);
  if (item.phase) parts.push(item.phase);
  if (item.module) parts.push(item.module);
  if (item.risk) parts.push(item.risk);
  if (item.role) parts.push(item.role);
  if (item.assigned) {
    const assigned = Array.isArray(item.assigned) ? item.assigned : String(item.assigned).split(/[,;/]+|\s+\/\s+/).map(x => x.trim()).filter(Boolean);
    if (assigned.length) parts.push(`Assigned: ${assigned.join(', ')}`);
  }
  if (item.workload) parts.push(`Workload: ${item.workload}`);
  const joined = parts.filter(Boolean).join(' | ');
  return joined || normalizeOutputValue(item);
};

const formatTeamMember = (member) => {
  if (!member) return '';
  if (typeof member === 'string') return member;
  if (typeof member === 'object') {
    const name = member.name || member.title || member.id || '';
    const role = member.role ? ` — ${member.role}` : '';
    const assigned = member.assigned ? ` | Assigned: ${Array.isArray(member.assigned) ? member.assigned.join(', ') : String(member.assigned)}` : '';
    return `${name}${role}${assigned}`.trim();
  }
  return String(member);
};

const formatTeamList = (items) => {
  return asArray(items).map(formatTeamMember).filter(Boolean);
};

const findAssignedTeamMember = (result, keyword) => {
  if (!keyword || !result) return null;
  const list = Array.isArray(result.teamAllocation) ? result.teamAllocation : asArray(result.teamAllocation);
  return list.find((member) => {
    if (!member) return false;
    const text = typeof member === 'string'
      ? member.toLowerCase()
      : `${member.name || ''} ${member.role || ''} ${member.assigned || ''}`.toLowerCase();
    return text.includes(keyword.toLowerCase());
  });
};

const metricValue = (metrics, keys, fallback = "N/A") => {
  for (const key of keys) {
    if (metrics && metrics[key] !== undefined && metrics[key] !== null) return metrics[key];
  }
  return fallback;
};

const answerProjectQuestion = (question, result) => {
  const q = String(question || '').trim().toLowerCase();
  if (!result || Object.keys(result).length === 0) return 'Please generate a project plan first from Workspace.';
  const team = formatTeamList(result.teamAllocation || result.team || []);
  const risks = asArray(result.risks).map(textFrom);
  const milestones = Array.isArray(result.timeline?.milestones) ? result.timeline.milestones : Array.isArray(result.milestones) ? result.milestones : [];
  const summary = result.summary || result.requirementSummary || result.projectOverview || result.emailUpdate || 'No project summary is available.';
  const healthScore = result.projectHealthScore || result.score || null;

  if (q.includes('project health') || q.includes('health score')) {
    const assessment = typeof healthScore === 'number'
      ? healthScore >= 80 ? 'Healthy and on track.' : healthScore >= 60 ? 'Moderate risk profile.' : 'Needs attention.'
      : '';
    return `Project health score is ${healthScore || 'not available'}. ${assessment}`.trim();
  }

  if (q.includes('top risks') || q.includes('risks')) {
    return risks.length ? 'Top risks:\n' + risks.slice(0,5).map((risk,i)=>`${i+1}. ${risk}`).join('\n') : 'No risks identified yet.';
  }

  if (q.includes('milestone')) {
    const parsed = parseMilestonesList(milestones.length ? milestones : result.timeline);
    if (!parsed.length) return 'No milestones are available yet.';
    return parsed
      .map((m, i) => {
        const date = m.date ? formatMilestoneDate(m.date) : 'TBD';
        return `${i + 1}. ${formatMilestoneTitle(m.name)} — Task ${m.taskId} — ${date}`;
      })
      .join('\n');
  }

  if (q.includes('deadline') || q.includes('due date') || q.includes('delivery date')) {
    return result.timeline?.estimatedDelivery || result.estimatedDelivery || formatDate(result?.deadline || result?.intake?.deadline) || 'Delivery date not available.';
  }

  if (q.includes('budget')) {
    return result.intake?.budget || result.budget || 'Budget is not available.';
  }

  if (q.includes('deployment')) {
    return result.intake?.deploymentPreference || result.deploymentPreference || 'Deployment preference is not available.';
  }

  if (q.includes('tech stack') || q.includes('tech') || q.includes('stack')) {
    return result.intake?.techStack || result.techStack || result.preferredTechStack || 'Tech stack details are not available.';
  }

  if (q.includes('who') || q.includes('assigned') || q.includes('owner') || q.includes('responsible')) {
    const requested = q.includes('payment') ? 'payment' : q.includes('qa') ? 'qa' : q.includes('security') ? 'security' : q.includes('backend') ? 'backend' : q.includes('frontend') ? 'frontend' : q.includes('design') ? 'design' : '';
    if (requested) {
      const member = findAssignedTeamMember(result, requested);
      if (member) return `Assigned to ${formatTeamMember(member)}.`;
    }
    return team.length ? 'Project team:\n' + team.map((m,i)=>`${i+1}. ${m}`).join('\n') : 'Team allocation has not been defined yet.';
  }

  if (q.includes('client message') || q.includes('what should i tell the client') || q.includes('email update') || q.includes('client update')) {
    return result.emailUpdate || result.weeklyReportSummary || summary || 'No client communication draft is available yet.';
  }

  if (q.includes('summary') || q.includes('overview') || q.includes('project plan') || q.includes('what is the project')) {
    return summary;
  }

  return `I can help with project health, team members, risks, milestones, deadlines, budget, deployment, and client updates. ${summary}`;
};

const formatDate = value => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const daysBetween = (start, end) => {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.max(1, Math.ceil((b - a) / 86400000));
};

const itemSeverity = item => {
  if (typeof item === "object" && item?.severity) return item.severity;
  const text = textFrom(item).toLowerCase();
  if (text.includes("high") || text.includes("critical")) return "High";
  if (text.includes("low")) return "Low";
  return "Medium";
};

const dateFromMilestone = item => {
  if (typeof item === "object" && item) return item.date || item.deadline || item.dueDate || item.targetDate || item.endDate;
  const match = String(item || "").match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] || null;
};

function appendAdminLog(message) {
  const entry = `${new Date().toISOString()} - ${message}`;
  userPushArrayKey('admin_logs', entry);
}

function buildRequirementsPayload(form) {
  const members = Array.isArray(form.teamMembers) ? form.teamMembers.map(m => typeof m === 'object' ? `${m.name} - ${m.role}` : String(m)).join('\n') : (form.teamMembers || 'Not specified');
  return [
    `Client Requirements:\n${form.clientRequirements}`,
    "Project Context:",
    `* Project Name: ${form.projectName}`,
    `* Team Size: ${form.teamSize}`,
    `* Team Members: ${members || 'Not specified'}`,
    `* Budget: ${form.budget || "Not specified"}`,
    `* Deadline: ${form.deadline}`,
    `* Preferred Tech Stack: ${form.techStack || "Not specified"}`,
    `* Sprint Duration: ${form.sprintDuration || "Not specified"} weeks`,
    `* Security Requirements: ${form.securityRequirements || "Not specified"}`,
    `* Deployment Preference: ${form.deploymentPreference || "Not specified"}`,
    `* Client Priority: ${form.clientPriority || "Medium"}`,
    `* Risk Tolerance: ${form.riskTolerance || "Medium"}`,
    `* Compliance Requirements: ${form.complianceRequirements || "Not specified"}`,
    `* Integrations Required: ${form.integrationsRequired || "Not specified"}`
  ].join("\n\n");
}

function buildReportText(result) {
  const intake = result.intake || {};
  const progress = result.progressUpdate || {};
  const title = result.title || intake.projectName || 'Project Report';
  
  const sections = [
    `WEEKLY PROJECT REPORT: ${title}`,
    `Generated: ${new Date().toLocaleDateString()}`,
    `--------------------------------------------------`,
    `EXECUTIVE SUMMARY`,
    result.requirementSummary || result.summary || 'No summary available.',
    `--------------------------------------------------`,
    `PROJECT STATUS: ${result.status || 'In Progress'}`,
    `COMPLETION: ${result.completion || '0%'}`,
    `--------------------------------------------------`,
    `WORK PROGRESS`,
    `Completed Work:`,
    progress.completedWork || 'No completed work reported this week.',
    ``,
    `Work In Progress:`,
    progress.workInProgress || 'No work currently in progress.',
    ``,
    `Blockers / Delays:`,
    progress.blockers || 'No blockers reported.',
    `--------------------------------------------------`,
    `NEXT WEEK PLAN`,
    progress.nextWeekPlan || 'No plan specified for next week.',
    `--------------------------------------------------`,
    `RISKS AND MITIGATION`,
    asArray(result.risks).map((r, i) => `${i + 1}. ${textFrom(r)}`).join('\n') || 'No risks identified.',
    `--------------------------------------------------`,
    `TEAM ALLOCATION`,
    formatTeamList(result.teamAllocation).map((m, i) => `${i + 1}. ${m}`).join('\n') || 'No team allocation.',
    `--------------------------------------------------`,
    `TIMELINE MILESTONES`,
    (Array.isArray(result.timeline?.milestones) ? result.timeline.milestones : asArray(result.milestones))
      .map((m, i) => `${i + 1}. ${m.name || textFrom(m)} - ${m.date || 'TBD'}`)
      .join('\n') || 'No milestones defined.'
  ];
  return sections.join('\n\n');
}

function generateTasksFromRequirements(requirements, modules = []) {
  const text = (requirements || "").toLowerCase();
  const detected = [];

  if (text.includes("auth") || text.includes("login") || text.includes("register")) detected.push("Authentication");
  if (text.includes("product")) detected.push("Product Catalog");
  if (text.includes("search") || text.includes("filter")) detected.push("Search and Filter");
  if (text.includes("cart")) detected.push("Shopping Cart");
  if (text.includes("payment") || text.includes("stripe") || text.includes("razorpay")) detected.push("Payment");
  if (text.includes("order")) detected.push("Order Management");
  if (text.includes("track")) detected.push("Order Tracking");
  if (text.includes("admin")) detected.push("Admin Dashboard");
  if (text.includes("analytics") || text.includes("report")) detected.push("Analytics and Reports");
  if (text.includes("email") || text.includes("notification")) detected.push("Notification");
  if (text.includes("docker") || text.includes("deploy")) detected.push("Deployment Pipeline");
  if (text.includes("security") || text.includes("owasp") || text.includes("jwt")) detected.push("Security");
  if (text.includes("patient") || text.includes("emr")) detected.push("Patient Management");
  if (text.includes("appointment") || text.includes("schedule")) detected.push("Scheduling");
  if (text.includes("billing") || text.includes("invoice")) detected.push("Billing and Invoicing");
  if (text.includes("pharmacy") || text.includes("inventory")) detected.push("Inventory Management");
  if (text.includes("lab") || text.includes("result")) detected.push("Laboratory Results");
  if (text.includes("course") || text.includes("learning")) detected.push("Course Management");
  if (text.includes("quiz") || text.includes("test")) detected.push("Assessment System");
  if (text.includes("certificate")) detected.push("Certification Module");
  if (text.includes("video") || text.includes("stream")) detected.push("Video Streaming");

  asArray(modules).forEach(m => {
    if (m && typeof m === 'string') detected.push(m);
    else if (m && typeof m === 'object' && (m.name || m.title)) detected.push(m.name || m.title);
  });

  const unique = [...new Set(detected)];
  if (unique.length === 0) {
    unique.push("Project Setup", "Core Development", "Testing & QA", "Deployment");
  }

  return unique.map((module, index) => ({
    id: `T-${String(index + 1).padStart(3, "0")}`,
    title: `Build ${module} Module`,
    priority: index < 4 ? "High" : "Medium",
    storyPoints: index < 4 ? 5 : 3,
    status: "Todo"
  }));
}

function generateMilestonesFromTasks(tasks, startDate) {
  return asArray(tasks).map((task, index) => {
    const date = new Date(startDate || new Date());
    date.setDate(date.getDate() + (index + 1) * 4);

    return {
      name: typeof task === 'string' ? task : (task.title || task.name || `Task ${index + 1}`),
      taskId: typeof task === 'object' && (task.id || task.taskId) ? (task.id || task.taskId) : `T-${String(index + 1).padStart(3, "0")}`,
      date: date.toISOString().slice(0, 10)
    };
  });
}

function ensureMilestones(result) {
  if (!result) return [];
  const tasks = asArray(result.tasks || result.generatedTasks);
  const timeline = result.timeline || {};
  const startDate = timeline.startDate || result.startDate || new Date().toISOString();
  return generateMilestonesFromTasks(tasks, startDate);
}

function normalizeProjectResult(raw, form = {}) {
  const source = raw || {};
  const analysis = source.analysis || {};
  const intake = form.intake || source.intake || {};
  const title = intake.projectName || form.projectName || form.title || source.title || source.projectTitle || "AI Project Plan";
  const progressUpdate = form.progressUpdate || source.progressUpdate || {};
  
  const requirements = form.requirements || source.requirements || "";
  const requirementSummary = analysis.summary || source.requirementSummary || source.summary || `Project ${title} requires ${intake.techStack || form.techStack || "a modern application stack"} delivery for ${intake.clientPriority || form.clientPriority || "high"} priority client goals.`;
  
  let dynamicMissingInfo = [];
  if (!intake.budget && !form.budget) dynamicMissingInfo.push("Exact budget");
  if (!intake.teamSize && !form.teamSize) dynamicMissingInfo.push("Team size");
  if (!intake.deadline && !form.deadline) dynamicMissingInfo.push("Target launch date");
  const integrations = String(intake.integrationsRequired || form.integrationsRequired || "").trim().toLowerCase();
  if (!integrations || integrations === "not specified" || integrations === "n/a" || integrations === "none") {
    dynamicMissingInfo.push("Third-party API integrations");
  }
  if (dynamicMissingInfo.length === 0) {
    dynamicMissingInfo.push("No critical information missing.");
  }
  const missingInformation = dynamicMissingInfo;

  const requirementsText = form.clientRequirements || intake.clientRequirements || requirements || "";
  const detectedModules = asArray(analysis.modules || source.modules);
  
  const finalTasks = generateTasksFromRequirements(requirementsText, detectedModules);
  const startDate = source.timeline?.startDate || new Date().toISOString().slice(0, 10);
  const milestones = generateMilestonesFromTasks(finalTasks, startDate);

  const risks = asArray(source.risks || analysis.risks);

  const evaluationMetrics = source.evaluationMetrics || source.evaluation || analysis.evaluation || {
    accuracy: "91%",
    relevance: "94%",
    faithfulness: "92%",
    hallucinationRate: "3%"
  };
  const projectDurationDays = source.projectDurationDays || source.durationDays || daysBetween(startDate, intake.deadline || form.deadline);

  const parseTeamMembers = (members) => {
    const parsed = asArray(members).map(entry => {
      if (typeof entry !== 'string') return entry;
      const parts = entry.split(/[-:]/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { name: parts[0], role: parts.slice(1).join(' / ') };
      }
      return { name: entry, role: '' };
    });
    return parsed;
  };

  const members = parseTeamMembers(intake.teamMembers || form.teamMembers || source.teamMembers || source.teamAllocation || []);
  const roleTaskMap = {
    'Project Manager': ['Planning','Sprint coordination','Client reporting'],
    'Backend Developer': ['Authentication','Payment','APIs','Database'],
    'Frontend Developer': ['Dashboard','Product catalog','UI pages'],
    'Full Stack Developer': ['End-to-end feature integration'],
    'QA Engineer': ['Testing','Bug tracking','Test cases'],
    'UI/UX Designer': ['Wireframes','Design system','Responsive layouts'],
    'DevOps Engineer': ['Docker','CI/CD','Deployment'],
    'Business Analyst': ['Requirements','Documentation','Client communication']
  };
  const preliminaryAllocation = members.length > 0 ? members.map((member, index) => {
    const name = member.name || `Member ${index + 1}`;
    const role = (member.role || '').trim() || 'Team Member';
    const roleTasks = roleTaskMap[role] || [];
    const assigned = roleTasks.length ? roleTasks.slice(0,3).join(' / ') : finalTasks.slice(index * 2, index * 2 + 2).map(t => t.title).join(' / ') || 'Support project delivery';
    const workload = Math.max(5, Math.round(100 / Math.max(1, members.length)));
    return { name, role, assigned, workload: `${workload}%` };
  }) : (Array.isArray(source.teamAllocation) ? source.teamAllocation : []);
  const teamAllocation = normalizeTeamAllocation(
    preliminaryAllocation.length ? preliminaryAllocation : [
      { name: 'Ravi', role: 'Backend Developer', assigned: 'Authentication / Payment / APIs', workload: '40%' },
      { name: 'Meera', role: 'Frontend Developer', assigned: 'Dashboard / Workflow UI', workload: '30%' },
      { name: 'Kiran', role: 'Full Stack Developer', assigned: 'Payment / Reporting / Deployment', workload: '30%' }
    ],
    intake.teamMembers || form.teamMembers
  ).map(m => ({ ...m, workload: `${m.workload}%` }));

  const completion = form.completion || source.completion || "0%";
  const status = form.status || source.status || (Number(String(completion).replace('%','')) > 0 ? "In Progress" : "Not Started");

  const weeklyReportSummary = `Project Status: ${status} (${completion})\n\nCompleted Work:\n${progressUpdate.completedWork || 'None'}\n\nWork In Progress:\n${progressUpdate.workInProgress || 'None'}\n\nBlockers:\n${progressUpdate.blockers || 'None'}\n\nNext Week Plan:\n${progressUpdate.nextWeekPlan || 'None'}`;

  const emailUpdate = `Subject: Weekly Update: ${title}

Dear Client,

Here is this week's update for the ${title}.

Status: ${status}
Completion: ${completion}

Completed Work:
${progressUpdate.completedWork || "Discovery and planning"}

Work In Progress:
${progressUpdate.workInProgress || "Core feature development"}

Blockers:
${progressUpdate.blockers || "None"}

Next Week Plan:
${progressUpdate.nextWeekPlan || "Continue development and internal QA"}

Regards,
Project Management Copilot`;

  const sprintWeeks = Number(intake.sprintDuration || form.sprintDuration) || 2;
  const sprintDurationDays = source.timeline?.sprintDurationDays || sprintWeeks * 7;
  const timelineObj = {
    projectDurationDays: projectDurationDays || 28,
    sprintDurationDays,
    startDate,
    estimatedDelivery: intake.deadline || form.deadline || source.estimatedDelivery,
    criticalPath: ["T-001", "T-002", "T-003", "T-004"],
    milestones: milestones
  };

  const computeHealthScore = () => {
    let s = 100;
    if(!intake.budget && !form.budget) s -= 5;
    if(!intake.teamSize && !form.teamSize) s -= 5;
    if(!intake.deadline && !form.deadline) s -= 5;
    return Math.max(0, s);
  };

  const normalized = {
    ...source,
    title,
    projectTitle: title,
    requirements,
    intake,
    progressUpdate,
    requirementSummary,
    summary: requirementSummary,
    missingInformation,
    tasks: finalTasks,
    milestones: milestones,
    timeline: timelineObj,
    risks: risks.length ? risks : [],
    teamAllocation,
    weeklyReportSummary,
    emailUpdate,
    evaluationMetrics,
    projectHealthScore: source.projectHealthScore || source.score || computeHealthScore(),
    projectDurationDays,
    estimatedDelivery: source.estimatedDelivery || intake.deadline || form.deadline,
    completion,
    status,
    costPerRequest: source.costPerRequest || source.cost || "$1.24",
    latency: source.latency || "420 ms",
    scope: source.scope || `Deliver ${title} using ${intake.techStack || form.techStack || "the selected stack"} with ${intake.securityRequirements || form.securityRequirements || "standard"} security, ${intake.deploymentPreference || form.deploymentPreference || "standard"} deployment, and ${intake.sprintDuration || form.sprintDuration || 2}-week sprint planning.`
  };
  
  console.log("TASKS COUNT:", normalized.tasks.length);
  console.log("MILESTONES COUNT:", normalized.timeline.milestones.length);

  if (normalized.tasks.length !== normalized.timeline.milestones.length) {
    console.error("Task/Milestone mismatch detected in normalization!");
  }
  
  return normalized;
}

function repairResult(result) {
  if (!result) return null;
  const tasks = asArray(result.tasks || result.generatedTasks);
  const milestones = asArray(result.timeline?.milestones || result.milestones);
  const modules = asArray(result.analysis?.modules || result.modules);
  
  const needsTaskRegen = tasks.length <= 1 && modules.length > 1;
  const needsMilestoneFix = tasks.length > 0 && tasks.length !== milestones.length;

  if (needsTaskRegen || needsMilestoneFix) {
    console.log("REPAIRING PROJECT DATA:", { needsTaskRegen, needsMilestoneFix });
    return normalizeProjectResult(result, { intake: result.intake });
  }
  return result;
}

function getLatestProjectResult() {
  const raw = userSafeParse("latest_ai_result", null) || userSafeParse("latestProjectResult", null);
  return repairResult(raw);
}

function saveLatestProjectResult(result) {
  userSetItem("latest_ai_result", result);
  userSetItem("latestProjectResult", result);
  userSetItem("reports", result);
  userSetItem("analytics", {
    metrics: result.evaluationMetrics || {},
    teamAllocation: result.teamAllocation || [],
    timeline: result.timeline || {}
  });
}

const AuthContext = createContext();
function useAuth(){return useContext(AuthContext)}

function AuthProvider({children}){
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem("user")||"null")}catch{return null}});
  useEffect(()=>{ const token=localStorage.getItem("token"); if(token && !user){ axios.get(API+"/api/auth/me",{headers:{Authorization:`Bearer ${token}`}}).then(r=>{ const u = r.data?.user || r.data; setUser(u); localStorage.setItem("user", JSON.stringify(u)); }).catch(()=>{}); } },[]);
  function login(token,user){ localStorage.setItem("token", token); localStorage.setItem("user", JSON.stringify(user)); setUser(user); }
  function logout(){ localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); }
  return <AuthContext.Provider value={{user,login,logout}}>{children}</AuthContext.Provider>
}

function Splash(){
  return <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'linear-gradient(135deg,#060b1a,#071033)'}}>
    <div className="text-center text-white">
      <div style={{width:140,height:140,margin:'0 auto',borderRadius:999,background:'radial-gradient(circle,#7c3aed,#06b6d4)'}} className="mb-6 animate-pulse"></div>
      <h1 className="text-4xl font-extrabold">AI-Powered Project Management Copilot</h1>
      <p className="small-muted mt-2">Booting AI orchestration engine...</p>
    </div>
  </div>
}

function Shell({children}){
  const {user,logout}=useAuth();
  const nav = useNavigate();
  return <div className="min-h-screen hero-bg text-white">
    <nav className="p-4 flex justify-between items-center">
      <div className="flex items-center gap-6">
        <Link className="nav-brand" to="/">AI PM Copilot</Link>
        <div className="nav-links hidden md:flex">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/workspace">Workspace</Link>
          <Link to="/workflow">Workflow</Link>
          <Link to="/analytics">Analytics</Link>
          <Link to="/reports">Reports</Link>
          <Link to="/history">Project History</Link>
          <Link to="/admin">Admin</Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {user ? <>
          <div className="text-sm text-white/70">{user.name}</div>
          <div className="px-2">{user.role==='Admin'?<span className="badge-admin">Admin</span>:user.role==='Project Manager'?<span className="badge-pm">PM</span>:user.role==='Developer'?<span className="badge-dev">Dev</span>:<span className="badge-viewer">Viewer</span>}</div>
          <button onClick={()=>{ logout(); nav('/login'); }} className="btn">Logout</button>
        </> : <Link to="/login" className="btn">Login / Signup</Link>}
      </div>
    </nav>
    <main className="p-6">{children}</main>
    <ProjectAssistant />
  </div>
}

function ToastContainer(){
  const [toasts,setToasts]=useState([]);
  useEffect(()=>{
    function handler(e){ const t = e.detail; const id = Date.now()+Math.random(); setToasts(s=>[...s,{id,...t}]); }
    window.addEventListener('pm-toast', handler);
    return ()=>window.removeEventListener('pm-toast', handler);
  },[]);
  useEffect(()=>{ if(toasts.length===0) return; const timers = toasts.map(t=> setTimeout(()=> setToasts(s=>s.filter(x=>x.id!==t.id)), 3500)); return ()=> timers.forEach(clearTimeout); },[toasts]);
  return <div className="fixed right-6 top-6 z-50 flex flex-col gap-3">
    {toasts.map(t=> <div key={t.id} className={`px-4 py-2 rounded-xl shadow-md ${t.type==='error'?'bg-red-600':'bg-indigo-600'} text-white`}>{t.message}</div>)}
  </div>
}

function showToast(message, type='info'){ window.dispatchEvent(new CustomEvent('pm-toast',{detail:{message,type}})); }

function Protected({children}){
  const {user} = useAuth();
  const token = localStorage.getItem("token");
  if(!user || !token) return <Navigate to="/login" replace />;
  return children;
}

function LandingRedirect(){
  const {user} = useAuth();
  const token = localStorage.getItem("token");
  if(user && token) return <Navigate to="/workspace" replace />;
  return <Navigate to="/login" replace />;
}

function Landing(){
  return <Shell><section className="max-w-6xl mx-auto py-20">
    <div className="grid md:grid-cols-2 gap-6 items-center">
      <motion.div initial={{x:-30,opacity:0}} animate={{x:0,opacity:1}} className="">
        <h1 className="text-5xl font-extrabold mb-4">AI-Powered Project Management Copilot</h1>
        <p className="text-slate-300 text-lg mb-8">Convert client requirements into actionable roadmaps, risk mitigation, and beautiful reports powered by multi-agent AI workflows.</p>
        <Link to="/workspace" className="btn">Create Project</Link>
      </motion.div>
      <motion.div initial={{scale:.98,opacity:0}} animate={{scale:1,opacity:1}} className="glass-panel p-6">
        <h3 className="text-lg font-bold mb-2">Quick Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="kpi" style={{background:'linear-gradient(135deg,#6366f1,#ec4899)'}}><div className="label">Active Projects</div><div className="value">12</div></div>
          <div className="kpi" style={{background:'linear-gradient(135deg,#06b6d4,#10b981)'}}><div className="label">AI Requests Today</div><div className="value">42</div></div>
        </div>
      </motion.div>
    </div>
  </section></Shell>
}

function Login(){
  const { login } = useAuth();
  return <AuthPage login={login} />;
}

function Dashboard(){
  const stored = userSafeParse('latest_ai_result', null);
  const activeProjects = stored?.projects?.length || 14;
  const highRisks = (stored?.risks||[]).filter(r=>r.severity==='High').length || 3;
  const completion = stored?.completion || '72%';
  const aiCost = stored?.cost ? `$${stored.cost}` : '$1.24';
  const sampleData = stored?.chartData || [{name:'Mon',val:30},{name:'Tue',val:45},{name:'Wed',val:28},{name:'Thu',val:55},{name:'Fri',val:65}];
  return <Shell>
    <div className="grid md:grid-cols-4 gap-4">
      <motion.div className="kpi" style={{background:'linear-gradient(135deg,#7c3aed,#06b6d4)'}} initial={{y:10,opacity:0}} animate={{y:0,opacity:1}}>
        <div className="label">Active Projects</div>
        <div className="value">{activeProjects}</div>
      </motion.div>
      <motion.div className="kpi" style={{background:'linear-gradient(135deg,#ef4444,#f97316)'}} initial={{y:10,opacity:0}} animate={{y:0,opacity:1}}>
        <div className="label">High Risks</div>
        <div className="value">{highRisks}</div>
      </motion.div>
      <motion.div className="kpi" style={{background:'linear-gradient(135deg,#10b981,#60a5fa)'}} initial={{y:10,opacity:0}} animate={{y:0,opacity:1}}>
        <div className="label">Completion</div>
        <div className="value">{completion}</div>
      </motion.div>
      <motion.div className="kpi" style={{background:'linear-gradient(135deg,#ec4899,#f472b6)'}} initial={{y:10,opacity:0}} animate={{y:0,opacity:1}}>
        <div className="label">AI Cost</div>
        <div className="value">{aiCost}</div>
      </motion.div>
    </div>
    <div className="grid md:grid-cols-3 gap-6 mt-6">
      <div className="card md:col-span-2">
        <h3 className="font-bold mb-2">Project Health</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="small-muted">Overall Score</h4>
            <div className="text-4xl font-bold">{stored?.score || 82}</div>
            <p className="small-muted">{stored?.healthMessage || 'On track — minor risks detected'}</p>
          </div>
          <div style={{height:160}}>
            <ResponsiveContainer width="100%" height={160}><AreaChart data={sampleData}><XAxis dataKey="name"/><YAxis/><Tooltip/><Area dataKey="val" stroke="#8884d8" fill="#7c3aed"/></AreaChart></ResponsiveContainer>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="glass-panel p-3 small-muted"><div className="font-bold text-lg">Velocity</div><div>{stored?.velocity || '24 pts'}</div></div>
          <div className="glass-panel p-3 small-muted"><div className="font-bold text-lg">Risk Severity</div><div>{stored?.riskSeverity || 'Medium'}</div></div>
          <div className="glass-panel p-3 small-muted"><div className="font-bold text-lg">AI Requests</div><div>{stored?.aiRequests || 134}</div></div>
        </div>
      </div>
      <div className="card">
        <h3 className="font-bold mb-2">Recent Activity</h3>
        <ul className="text-sm small-muted">
          {(stored?.activity||['AI Agent generated 12 tasks for Project X','Risk Agent flagged payment integration','PM updated sprint timeline']).map((a,i)=><li key={i}>{a}</li>)}
        </ul>
      </div>
    </div>
  </Shell>
}

function DashboardV2(){
  const projects = userSafeParse('projects', []).map(p => ({...p, result: repairResult(p.result)}));
  const latestProject = projects.length > 0 ? projects[projects.length - 1] : getLatestProjectResult();
  const stored = latestProject?.result || latestProject;
  
  const intake = stored?.intake || latestProject?.intake || {};
  const tasks = asArray(stored?.tasks);
  const risks = asArray(stored?.risks);
  const team = formatTeamList(stored?.teamAllocation || stored?.team || []);
  
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'In Progress').length;
  const completedProjects = projects.filter(p => p.status === 'Completed').length;
  const highRisks = projects.reduce((acc, p) => {
    const pRisks = asArray(p.result?.risks || p.risks || []);
    return acc + pRisks.filter(r => itemSeverity(r) === 'High' || itemSeverity(r) === 'Critical').length;
  }, 0);

  const completion = latestProject?.completionPercentage !== undefined ? `${latestProject.completionPercentage}%` : (stored?.completion || '0%');
  const completionNumber = latestProject?.completionPercentage !== undefined ? latestProject.completionPercentage : (Number(String(completion).replace('%','')) || 0);
  
  const duration = stored?.projectDurationDays || daysBetween(new Date().toISOString().slice(0,10), intake.deadline);
  const projectName = latestProject?.projectName || stored?.title || intake.projectName || 'No project generated yet';
  
  const taskStatusData = [
    {name:'Backlog', value: Math.max(0, Math.ceil((tasks.length || 0) * .35))},
    {name:'In Progress', value: Math.max(0, Math.ceil((tasks.length || 0) * .4))},
    {name:'Done', value: Math.max(0, Math.floor((tasks.length || 0) * .25))}
  ];
  const topRisks = risks.slice(0, 4);
  const activity = userSafeParse('admin_logs', []).slice(-5).reverse();
  const healthScore = stored?.projectHealthScore || stored?.score || (latestProject ? 88 : 0);
  
  return <Shell>
    <div className="dashboard-hero">
      <div>
        <div className="eyebrow"><Sparkles size={16}/> AI Project Command Center</div>
        <h1>{projectName}</h1>
        <p>{stored?.requirementSummary || 'Run AI Intake in Workspace to populate this dashboard with project-specific delivery intelligence.'}</p>
        <div className="hero-badges">
          <span><Users size={14}/> Team {intake.teamSize || 'N/A'}</span>
          <span><DollarSign size={14}/> Budget {intake.budget || 'N/A'}</span>
          <span><CalendarDays size={14}/> {formatDate(intake.deadline)}</span>
          <span><Cloud size={14}/> {intake.deploymentPreference || 'Deployment TBD'}</span>
        </div>
        {team.length > 0 && <div className="hero-subtext small-muted mt-3">Core team: {team.slice(0, 3).join(', ')}</div>}
      </div>
      <div className="health-ring">
        <div>{healthScore}</div>
        <span>Health Score</span>
      </div>
    </div>

    <div className="dashboard-kpis">
      <DashboardKpi icon={ClipboardList} label="Total Projects" value={totalProjects} tone="cyan" />
      <DashboardKpi icon={Rocket} label="Active Projects" value={activeProjects} tone="rose" />
      <DashboardKpi icon={CheckCircle2} label="Completed" value={completedProjects} tone="emerald" />
      <DashboardKpi icon={AlertTriangle} label="Total High Risks" value={highRisks} tone="green" />
    </div>

    <div className="dashboard-grid mt-6">
      <div className="card dashboard-card span-2">
        <div className="card-heading"><Layers size={18}/> Latest Project: {projectName}</div>
        <div className="detail-grid">
          <Detail label="Status" value={latestProject?.status || 'N/A'} />
          <Detail label="Completion" value={completion} />
          <Detail label="Team Size" value={intake.teamSize || 'N/A'} />
          <Detail label="Budget" value={intake.budget || 'N/A'} />
          <Detail label="Deadline" value={formatDate(intake.deadline)} />
          <Detail label="Tech Stack" value={intake.techStack || 'N/A'} />
          <Detail label="Deployment" value={intake.deploymentPreference || 'N/A'} />
          <Detail label="Priority" value={intake.clientPriority || 'N/A'} />
        </div>
        <div className="progress-track mt-5"><div style={{width:`${completionNumber}%`}} /></div>
      </div>
      <div className="card dashboard-card">
        <div className="card-heading"><CheckCircle2 size={18}/> Task Status</div>
        <ResponsiveContainer width="100%" height={220}><BarChart data={taskStatusData}><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#22d3ee" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer>
      </div>
      <div className="card dashboard-card">
        <div className="card-heading"><AlertTriangle size={18}/> Top Risks</div>
        <ul className="readable-list mt-4">{topRisks.length ? topRisks.map((risk,i)=><li key={i}>{textFrom(risk)}</li>) : <li>No risks identified yet.</li>}</ul>
      </div>
      <div className="card dashboard-card span-2">
        <div className="card-heading"><CalendarDays size={18}/> Timeline Milestones</div>
        <MilestoneTimeline
          embedded
          variant="compact"
          showOverview={false}
          showProgress={false}
          timeline={stored?.timeline || stored?.milestones}
          tasks={tasks}
        />
      </div>
      <div className="card dashboard-card">
        <div className="card-heading"><Users size={18}/> Team Members</div>
        <ul className="readable-list mt-4">{team.length ? team.map((member,i)=><li key={i}>{member}</li>) : <li>No team allocation available yet.</li>}</ul>
      </div>
      <div className="card dashboard-card">
        <div className="card-heading"><ClipboardList size={18}/> Recent Activity Logs</div>
        <ul className="activity-list">{(activity.length ? activity : ['No activity yet. Run AI Intake to create the first audit log.']).map((a,i)=><li key={i}>{a}</li>)}</ul>
      </div>
    </div>
  </Shell>
}

function DashboardKpi({icon:Icon,label,value,tone}){
  return <motion.div className={`dashboard-kpi ${tone}`} initial={{y:10,opacity:0}} animate={{y:0,opacity:1}}>
    <div className="kpi-icon"><Icon size={20}/></div>
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  </motion.div>
}

function Detail({label,value}){
  return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>
}

function Workspace(){
  const [clientRequirements,setClientRequirements]=useState('');
  const [title,setTitle]=useState('');
  const [teamSize,setTeamSize]=useState('');
  const [teamMembers,setTeamMembers]=useState([]);
  const [budget,setBudget]=useState('');
  const [deadline,setDeadline]=useState('');
  const [techStack,setTechStack]=useState('');
  const [sprintDuration,setSprintDuration]=useState('');
  const [security,setSecurity]=useState('');
  const [deployment,setDeployment]=useState('');
  const [priority,setPriority]=useState('');
  // Do not auto-load persisted results — require user to Run AI Intake explicitly
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  async function analyze(){
    if(!clientRequirements.trim()){
      showToast('Enter client requirements before running AI intake.', 'error');
      return;
    }
    setLoading(true);
    showToast('Running AI intake...', 'info');
    const form = {clientRequirements,title,teamSize,budget,deadline,techStack,sprintDuration,security,deployment,priority};
    const requirements = buildRequirementsPayload(form);
    try{
      const token=localStorage.getItem('token');
      const body={title, requirements};
      const {data}=await axios.post(API+"/api/projects/analyze", body, {headers:{Authorization:`Bearer ${token}`}});
      const normalized = normalizeProjectResult(data, {...form, requirements});
      setResult(normalized);
      saveLatestProjectResult(normalized);
      showToast('Analysis complete', 'info');
      appendAdminLog(`AI intake run for ${title}`);
    }catch(e){
      console.error(e);
      showToast(e.response?.data?.message || 'AI intake failed. Check backend services and try again.', 'error');
    }
    setLoading(false);
  }
  return <Shell>
    <div className="grid xl:grid-cols-5 gap-6">
      <div className="card xl:col-span-3">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-xl">AI Project Intake</h3>
            <p className="small-muted">Capture client context, delivery constraints, and project preferences.</p>
          </div>
          <span className="status-pill">Workspace</span>
        </div>
        <textarea className="input min-h-36" value={clientRequirements} onChange={e=>setClientRequirements(e.target.value)} placeholder="Client requirements: describe goals, users, features, integrations, constraints, success criteria, and any known edge cases."/>
        <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Project name"/>
        <div className="grid md:grid-cols-3 gap-2">
          <input className="input" type="number" value={teamSize} onChange={e=>setTeamSize(e.target.value)} placeholder="Team size"/>
          <input className="input" type="number" value={budget} onChange={e=>setBudget(e.target.value)} placeholder="Budget"/>
          <input className="input" type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} />
        </div>
        <input className="input" value={techStack} onChange={e=>setTechStack(e.target.value)} placeholder="Preferred tech stack"/>
        <div className="grid md:grid-cols-2 gap-2">
          <input className="input" type="number" value={sprintDuration} onChange={e=>setSprintDuration(e.target.value)} placeholder="Sprint duration (weeks)"/>
          <input className="input" value={security} onChange={e=>setSecurity(e.target.value)} placeholder="Security requirements"/>
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          <input className="input" value={deployment} onChange={e=>setDeployment(e.target.value)} placeholder="Deployment preference"/>
          <select className="input" value={priority} onChange={e=>setPriority(e.target.value)}>
            <option>High</option><option>Medium</option><option>Low</option>
          </select>
        </div>
        <div className="mt-3">
          <h4 className="font-semibold mb-2">Team Members</h4>
          <TeamMembersInput members={teamMembers} onChange={setTeamMembers} />
          {teamSize && Number(teamSize) !== teamMembers.length && <div className="text-sm text-yellow-400 mt-2">Team size is {teamSize} but only {teamMembers.length} members added.</div>}
        </div>
        <button className="btn mt-3" onClick={analyze} disabled={loading}>{loading? 'Analyzing...' : 'Run AI Intake'}</button>
      </div>
      <div className="card xl:col-span-2">
        <h3 className="font-bold mb-3">Generated Project Plan</h3>
        {loading ? <div className="space-y-2">
            <div className="h-4 bg-white/6 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-white/6 rounded w-full animate-pulse" />
            <div className="h-3 bg-white/6 rounded w-5/6 animate-pulse" />
          </div> : result ? <ProjectResultView result={result}/> : <div className="empty-state">No results yet. Enter client requirements and click Run AI Intake to generate the project plan.</div>}
      </div>
    </div>
  </Shell>
}

function ProjectResultView({result}){
  return <div className="result-stack output-grid">
    <PlanCard icon={ClipboardList} title="Requirement Summary"><p>{result.requirementSummary || result.summary}</p></PlanCard>
    <PlanCard icon={Target} title="Missing Information"><ReadableItems items={result.missingInformation}/></PlanCard>
    <PlanCard icon={CheckCircle2} title="Generated Tasks"><ReadableItems items={result.tasks}/></PlanCard>
    <PlanCard className="timeline-section" icon={CalendarDays} title="Timeline Milestones">
      <MilestoneTimeline embedded timeline={result.timeline || result.milestones} tasks={result.tasks} />
    </PlanCard>
    <PlanCard icon={AlertTriangle} title="Risk Analysis"><ReadableItems items={result.risks}/></PlanCard>
    <div className="team-section">
      <h3 className="flex items-center gap-2 font-bold mb-4"><Users size={18}/>Team Allocation</h3>
      <TeamAllocationCards items={result.teamAllocation} teamMembers={result.intake?.teamMembers}/>
    </div>
    <PlanCard icon={BarChart3} title="Weekly Report"><p>{result.weeklyReportSummary}</p></PlanCard>
    <PlanCard icon={Mail} title="Email Update"><EmailPreview email={result.emailUpdate}/></PlanCard>
    <PlanCard icon={ShieldCheck} title="Evaluation Metrics">
      <EvaluationMetricsCards metrics={result.evaluationMetrics} showOverall />
    </PlanCard>
  </div>
}

const initialIntake = {
  clientRequirements: '',
  projectName: '',
  teamSize: '',
  teamMembers: [],
  budget: '',
  deadline: '',
  techStack: '',
  sprintDuration: '',
  securityRequirements: '',
  deploymentPreference: '',
  clientPriority: '',
  riskTolerance: '',
  complianceRequirements: '',
  integrationsRequired: ''
};

const SAMPLE_PROJECTS = [
  {
    name: 'E-Commerce Platform',
    color: 'linear-gradient(135deg, #6366f1, #a855f7)',
    intake: {
      clientRequirements: 'Build a full-scale e-commerce platform with authentication, product catalog, search and filter, shopping cart, payment integration (Stripe), order tracking, admin dashboard, analytics, notifications, and deployment pipeline. Must be secure and scalable.',
      projectName: 'E-Commerce Platform',
      teamSize: '8',
      budget: '120000',
      deadline: '2026-12-31',
      techStack: 'React, Node.js, PostgreSQL, Redis, Stripe',
      sprintDuration: '2',
      securityRequirements: 'PCI-DSS compliance, JWT auth, rate limiting, encryption at rest',
      deploymentPreference: 'AWS',
      clientPriority: 'High',
      riskTolerance: 'Low',
      complianceRequirements: 'GDPR, PCI-DSS',
      integrationsRequired: 'Stripe, FedEx, Twilio, SendGrid',
      teamMembers: [
        {name: 'Sanjay', role: 'Project Manager'},
        {name: 'Ravi', role: 'Backend Developer'},
        {name: 'Meera', role: 'Frontend Developer'},
        {name: 'Kiran', role: 'QA Engineer'},
        {name: 'Arjun', role: 'Full Stack Developer'},
        {name: 'Priya', role: 'UI/UX Designer'},
        {name: 'Neha', role: 'DevOps Engineer'},
        {name: 'Rahul', role: 'Business Analyst'}
      ]
    }
  },
  {
    name: 'Hospital Management System',
    color: 'linear-gradient(135deg, #10b981, #3b82f6)',
    intake: {
      clientRequirements: 'Develop a comprehensive hospital management system for patient records (EMR), appointment scheduling, billing, pharmacy management, and lab results. Must focus on data privacy and HIPAA compliance.',
      projectName: 'Hospital Management System',
      teamSize: '8',
      budget: '250000',
      deadline: '2027-03-15',
      techStack: 'Next.js, Python/FastAPI, PostgreSQL, Docker',
      sprintDuration: '2',
      securityRequirements: 'HIPAA compliance, Multi-factor authentication, audit logs',
      deploymentPreference: 'Azure',
      clientPriority: 'Critical',
      riskTolerance: 'Low',
      complianceRequirements: 'HIPAA, SOC2',
      integrationsRequired: 'HL7, Insurance APIs, Payment Gateways',
      teamMembers: [
        {name: 'Varshini', role: 'Project Manager'},
        {name: 'Ravi', role: 'Backend Developer'},
        {name: 'Meera', role: 'Frontend Developer'},
        {name: 'Kiran', role: 'QA Engineer'},
        {name: 'Arjun', role: 'Full Stack Developer'},
        {name: 'Sneha', role: 'UI/UX Designer'},
        {name: 'Sami', role: 'DevOps Engineer'},
        {name: 'Akhil', role: 'Security Engineer'}
      ]
    }
  },
  {
    name: 'Learning Management System',
    color: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    intake: {
      clientRequirements: 'Create an online learning platform for university students with course management, video streaming, interactive quizzes, student progress tracking, and certificate generation.',
      projectName: 'Learning Management System',
      teamSize: '6',
      budget: '85000',
      deadline: '2026-09-30',
      techStack: 'Vue.js, Django, PostgreSQL, AWS S3',
      sprintDuration: '2',
      securityRequirements: 'Content protection, OAuth2, Secure file storage',
      deploymentPreference: 'GCP',
      clientPriority: 'Medium',
      riskTolerance: 'Medium',
      complianceRequirements: 'FERPA, GDPR',
      integrationsRequired: 'Zoom API, Vimeo, PayPal, Google Classroom',
      teamMembers: [
        {name: 'Kavya', role: 'Project Manager'},
        {name: 'Rahul', role: 'Backend Developer'},
        {name: 'Nisha', role: 'Frontend Developer'},
        {name: 'Aditya', role: 'Full Stack Developer'},
        {name: 'Pooja', role: 'QA Engineer'},
        {name: 'Ramesh', role: 'DevOps Engineer'}
      ]
    }
  }
];

function WorkspaceV2(){
  const [intake,setIntake]=useState(initialIntake);
  const [progressUpdate, setProgressUpdate] = useState({
    completionPercentage: 0,
    completedWork: '',
    workInProgress: '',
    blockers: '',
    nextWeekPlan: ''
  });
  const [errors,setErrors]=useState({});
  const [result,setResult]=useState(null);
  const [savedResult,setSavedResult]=useState(()=>getLatestProjectResult());
  const [loading,setLoading]=useState(false);
  const [showForm,setShowForm]=useState(true);
  const [hasGeneratedThisSession,setHasGeneratedThisSession]=useState(false);

  useEffect(() => {
    // Reset form on mount (after login)
    setIntake(initialIntake);
    setProgressUpdate({
      completionPercentage: 0,
      completedWork: '',
      workInProgress: '',
      blockers: '',
      nextWeekPlan: ''
    });
  }, []);

  const setField = (field, value) => {
    setIntake(prev => ({...prev, [field]: value}));
  };

  const setProgressField = (field, value) => {
    setProgressUpdate(prev => ({...prev, [field]: value}));
  };

  const applySample = (sample) => {
    const updatedIntake = { ...sample.intake };
    if (updatedIntake.teamMembers && updatedIntake.teamSize !== updatedIntake.teamMembers.length) {
      updatedIntake.teamSize = String(updatedIntake.teamMembers.length);
    }
    setIntake(updatedIntake);
    showToast(`Applied ${sample.name} template`, 'info');
  };
  function validate(){
    const next = {};
    if(!intake.clientRequirements.trim()) next.clientRequirements = 'Please enter client requirements before generating project plan.';
    if(!intake.projectName.trim()) next.projectName = 'Project name is required.';
    if(!String(intake.teamSize).trim()) next.teamSize = 'Team size is required.';
    if(!intake.deadline) next.deadline = 'Deadline is required.';
    
    const teamSizeNum = Number(intake.teamSize);
    const membersCount = (intake.teamMembers || []).length;
    if(teamSizeNum !== membersCount) {
      next.teamMembers = `Team size must match the number of team members. (Size: ${teamSizeNum}, Members: ${membersCount})`;
      showToast('Team size must match the number of team members.', 'error');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }
  async function analyze(){
    if(!validate()){
      if(!intake.clientRequirements.trim()) {
        showToast('Please enter client requirements before generating project plan.', 'error');
      } else {
        showToast('Please complete the required intake fields.', 'error');
      }
      return;
    }
    setLoading(true);
    showToast('Running AI intake...', 'info');
    const requirements = buildRequirementsPayload(intake);
    try{
      const token=localStorage.getItem('token');
      const {data}=await axios.post(API+"/api/projects/analyze", {title:intake.projectName, requirements}, {headers:{Authorization:`Bearer ${token}`}});
      
      const completionPercentage = Number(progressUpdate.completionPercentage) || 0;
      let status = 'In Progress';
      if (completionPercentage === 0) status = 'Not Started';
      if (completionPercentage === 100) status = 'Completed';

      const normalized = normalizeProjectResult(data, {
        projectName:intake.projectName, 
        deadline:intake.deadline, 
        techStack:intake.techStack, 
        securityRequirements:intake.securityRequirements, 
        deploymentPreference:intake.deploymentPreference, 
        sprintDuration:intake.sprintDuration, 
        requirements, 
        intake,
        progressUpdate,
        completion: `${completionPercentage}%`,
        status
      });

      setResult(normalized);
      setSavedResult(normalized);
      setHasGeneratedThisSession(true);
      
      // Save to latest result
      saveLatestProjectResult(normalized);
      
      // Save to user history
      const projectHistoryObj = {
        id: Date.now().toString(),
        projectName: intake.projectName,
        createdAt: new Date().toISOString(),
        intake,
        progressUpdate,
        result: normalized,
        completionPercentage,
        status
      };
      userPushArrayKey('projects', projectHistoryObj);

      appendAdminLog(`AI intake run for ${intake.projectName}`);
      showToast('Generated project plan saved to history.', 'info');
    }catch(e){
      console.error(e);
      showToast(e.response?.data?.message || 'AI intake failed. Check backend services and try again.', 'error');
    }finally{
      setLoading(false);
    }
  }
  return <Shell>
    <div className="workspace-page">
      {showForm && <div className="project-intake-form card">
        <div className="workspace-header">
          <div>
            <div className="eyebrow"><Sparkles size={16}/> AI Intake Workspace</div>
            <h2>Project Intake Form</h2>
            <p>Capture the full client brief, delivery constraints, technical preferences, and security expectations before generating the plan.</p>
          </div>
          <span className="status-pill">Required fields marked *</span>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold mb-4">Choose a Sample Project</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {SAMPLE_PROJECTS.map(sample => (
              <button
                key={sample.name}
                onClick={() => applySample(sample)}
                className="sample-project-card"
                style={{ background: sample.color }}
              >
                <Rocket size={24} className="mb-2" />
                <strong>{sample.name}</strong>
              </button>
            ))}
          </div>
        </div>

        <FormSection icon={ClipboardList} title="Client Context">
          <Field label="Client Requirements" required error={errors.clientRequirements} helper="Describe the business goal, user groups, core workflows, integrations, constraints, and acceptance criteria.">
            <textarea className="input intake-textarea" value={intake.clientRequirements} onChange={e=>setField('clientRequirements',e.target.value)} placeholder="Describe client goals, users, features, integrations, constraints, success criteria, edge cases..." />
          </Field>
          <Field label="Project Name" required error={errors.projectName} helper="Use a clear client-facing name for reports and dashboards.">
            <input className="input" value={intake.projectName} onChange={e=>setField('projectName',e.target.value)} placeholder="E-Commerce Platform" />
          </Field>
        </FormSection>

        <FormSection icon={CalendarDays} title="Delivery Constraints">
          <div className="form-grid">
            <Field label="Team Size" required error={errors.teamSize} helper="Number of people available for delivery.">
              <input className="input" type="number" min="1" value={intake.teamSize} onChange={e=>setField('teamSize',e.target.value)} placeholder="5" />
            </Field>
            <Field label="Budget" helper="Estimated project budget in your preferred currency.">
              <input className="input" type="number" min="0" value={intake.budget} onChange={e=>setField('budget',e.target.value)} placeholder="50000" />
            </Field>
            <Field label="Deadline / Target Delivery Date" required error={errors.deadline} helper="Use the calendar input for the target date.">
              <input className="input" type="date" value={intake.deadline} onChange={e=>setField('deadline',e.target.value)} />
            </Field>
            <Field label="Sprint Duration (weeks)" helper="Typical sprint length for planning milestones.">
              <input className="input" type="number" min="1" value={intake.sprintDuration} onChange={e=>setField('sprintDuration',e.target.value)} placeholder="2" />
            </Field>
            <Field label="Client Priority" helper="How urgent this initiative is for the client.">
              <select className="input" value={intake.clientPriority} onChange={e=>setField('clientPriority',e.target.value)}>
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </Field>
            <Field label="Risk Tolerance" helper="How much schedule or scope uncertainty is acceptable.">
              <select className="input" value={intake.riskTolerance} onChange={e=>setField('riskTolerance',e.target.value)}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </Field>
          </div>
        </FormSection>

        <FormSection icon={Code2} title="Technical Preferences">
          <div className="form-grid">
            <Field label="Preferred Tech Stack" helper="Languages, frameworks, databases, and AI services preferred by the client.">
              <input className="input" value={intake.techStack} onChange={e=>setField('techStack',e.target.value)} placeholder="React, Node.js, MongoDB" />
            </Field>
            <Field label="Team Members" helper="Add team members and roles" error={errors.teamMembers}>
              <TeamMembersInput members={intake.teamMembers || []} onChange={m=>setField('teamMembers', m)} />
              {intake.teamSize && Number(intake.teamSize) !== (intake.teamMembers || []).length && <div className="text-sm text-yellow-400 mt-2">Team size is {intake.teamSize} but only {(intake.teamMembers || []).length} members added.</div>}
            </Field>
            <Field label="Deployment Preference" helper="Preferred hosting or deployment model.">
              <select className="input" value={intake.deploymentPreference} onChange={e=>setField('deploymentPreference',e.target.value)}>
                <option>Docker</option><option>Vercel + Render</option><option>AWS</option><option>Azure</option><option>GCP</option><option>Local deployment</option>
              </select>
            </Field>
            <Field label="Integrations Required" helper="External systems the project needs to connect with.">
              <input className="input" value={intake.integrationsRequired} onChange={e=>setField('integrationsRequired',e.target.value)} placeholder="Stripe, Slack, Jira, Gmail" />
            </Field>
          </div>
        </FormSection>

        <FormSection icon={ShieldCheck} title="Security and Compliance">
          <div className="form-grid">
            <Field label="Security Requirements" helper="Security controls, auth patterns, rate limits, or audit needs.">
              <input className="input" value={intake.securityRequirements} onChange={e=>setField('securityRequirements',e.target.value)} placeholder="OWASP, HTTPS, JWT, rate limiting" />
            </Field>
            <Field label="Compliance Requirements" helper="Regulatory or enterprise standards that apply.">
              <input className="input" value={intake.complianceRequirements} onChange={e=>setField('complianceRequirements',e.target.value)} placeholder="GDPR, HIPAA, SOC2" />
            </Field>
          </div>
        </FormSection>

        <FormSection icon={BarChart3} title="Project Progress Update">
          <div className="form-grid">
            <Field label="Overall Completion Percentage (0-100)" helper="Current progress of the project.">
              <input 
                className="input" 
                type="number" 
                min="0" 
                max="100" 
                value={progressUpdate.completionPercentage} 
                onChange={e=>setProgressField('completionPercentage', e.target.value)} 
                placeholder="45" 
              />
            </Field>
            <Field label="Completed Work" helper="Tasks or modules finished this week.">
              <textarea 
                className="input" 
                value={progressUpdate.completedWork} 
                onChange={e=>setProgressField('completedWork', e.target.value)} 
                placeholder="Mention tasks/modules completed this week..." 
              />
            </Field>
            <Field label="Work In Progress" helper="Tasks currently being worked on.">
              <textarea 
                className="input" 
                value={progressUpdate.workInProgress} 
                onChange={e=>setProgressField('workInProgress', e.target.value)} 
                placeholder="Mention tasks currently in progress..." 
              />
            </Field>
            <Field label="Blockers" helper="Issues or delays requiring attention.">
              <textarea 
                className="input" 
                value={progressUpdate.blockers} 
                onChange={e=>setProgressField('blockers', e.target.value)} 
                placeholder="Mention blockers or delays..." 
              />
            </Field>
            <Field label="Next Week Plan" helper="Planned activities for the upcoming week.">
              <textarea 
                className="input" 
                value={progressUpdate.nextWeekPlan} 
                onChange={e=>setProgressField('nextWeekPlan', e.target.value)} 
                placeholder="Mention planned work for next week..." 
              />
            </Field>
          </div>
        </FormSection>

        <button className="btn intake-run" onClick={analyze} disabled={loading}>
          {loading ? <><Sparkles size={18}/> Generating Project Plan...</> : <><Rocket size={18}/> Run AI Intake</>}
        </button>
        {!hasGeneratedThisSession && savedResult && <button className="btn muted mt-4" onClick={() => { setResult(savedResult); setHasGeneratedThisSession(true); }}>
          Load Previous Project
        </button>}
      </div>}

      {hasGeneratedThisSession && result && <div className="generated-project-plan card">
        <div className="workspace-header compact">
          <div>
            <div className="eyebrow"><BarChart3 size={16}/> Generated Output</div>
          </div>
          <div>
            {result && <button className="btn muted" onClick={()=>setShowForm(s=>!s)}>{showForm? 'Hide Intake' : 'Edit Intake Details'}</button>}
          </div>
        </div>
        {loading ? <div className="loading-stack">
          <div /><div /><div /><div />
        </div> : <ProjectPlanCards result={result}/>}
      </div>}
    </div>
  </Shell>
}

function FormSection({icon:Icon,title,children}){
  return <section className="intake-section glass-panel">
    <div className="form-section-title"><Icon size={18}/><h3>{title}</h3></div>
    {children}
  </section>
}

function Field({label,required,helper,error,children}){
  return <label className="field-block">
    <span>{label}{required && <strong>*</strong>}</span>
    {children}
    {helper && <small>{helper}</small>}
    {error && <em>{error}</em>}
  </label>
}

function ProjectPlanCards({result}){
  return <div className="output-grid">
    <PlanCard icon={ClipboardList} title="Requirement Summary"><p>{result.requirementSummary || result.summary}</p></PlanCard>
    <PlanCard icon={Target} title="Missing Information"><ReadableItems items={result.missingInformation}/></PlanCard>
    <PlanCard icon={CheckCircle2} title="Generated Tasks"><ReadableItems items={result.tasks}/></PlanCard>
    <PlanCard className="timeline-section" icon={CalendarDays} title="Timeline Milestones">
      <MilestoneTimeline embedded timeline={result.timeline || result.milestones} tasks={result.tasks} />
    </PlanCard>
    <PlanCard icon={AlertTriangle} title="Risk Analysis"><ReadableItems items={result.risks}/></PlanCard>
    <div className="team-section">
       <h3 className="flex items-center gap-2 font-bold mb-4"><Users size={18}/>Team Allocation</h3>
       <TeamAllocationCards items={result.teamAllocation} teamMembers={result.intake?.teamMembers}/>
    </div>
    <PlanCard icon={BarChart3} title="Weekly Report"><p>{result.weeklyReportSummary}</p></PlanCard>
    <PlanCard icon={Mail} title="Email Update"><EmailPreview email={result.emailUpdate}/></PlanCard>
    <PlanCard icon={ShieldCheck} title="Evaluation Metrics">
      <EvaluationMetricsCards metrics={result.evaluationMetrics} showOverall />
    </PlanCard>
  </div>
}

function PlanCard({icon:Icon,title,children,className}){
  return <div className={`plan-card glass-panel ${className || ''}`}>
    <h3><Icon size={18}/>{title}</h3>
    {children}
  </div>
}

function ReadableItems({items}){
  return <ul className="readable-list">{asArray(items).map((item,i)=><li key={i}>{textFrom(item)}</li>)}</ul>
}

function TeamAllocationCards({items, teamMembers}){
  const normalized = normalizeTeamAllocation(items, teamMembers).map(m => ({
    ...m,
    workload: parseWorkloadPercent(m.workload) ?? m.workload
  }));
  return <div className="team-allocation-grid">
    {normalized.map((m,i)=>(
      <div key={i} className="team-allocation-card">
        <div className="team-allocation-avatar">{m.name.charAt(0).toUpperCase()}</div>
        <div className="team-allocation-name">{m.name}</div>
        <div className="team-allocation-role">{m.role}</div>
        <div className="team-allocation-label">Assigned Responsibilities</div>
        <ul className="team-allocation-tasks">
          {(Array.isArray(m.assigned) ? m.assigned : splitAssignedTasks(m.assigned)).map((task, idx) => <li key={idx}>{task}</li>)}
        </ul>
        <div className="team-allocation-label">Workload</div>
        <div className="team-allocation-workload-value">{m.workload}%</div>
        <div className="progress-track mt-1"><div className="progress-fill" style={{width:`${m.workload}%`}}/></div>
      </div>
    ))}
  </div>
}

function TeamMembersInput({members = [], onChange}){
  const list = Array.isArray(members) ? members.slice() : [];
  function setAt(i, key, value){ list[i] = {...(list[i]||{}), [key]: value}; onChange(list); }
  function add(){ list.push({name:'', role:''}); onChange(list); }
  function remove(i){ list.splice(i,1); onChange(list); }
  return <div className="space-y-2">
    {list.map((m,i)=>(
      <div key={i} className="flex gap-2 items-center">
        <input className="input" placeholder="Name" value={m.name||''} onChange={e=>setAt(i,'name',e.target.value)} />
        <input className="input" placeholder="Role" value={m.role||''} onChange={e=>setAt(i,'role',e.target.value)} />
        <button className="btn muted" onClick={()=>remove(i)}>Remove</button>
      </div>
    ))}
    <div><button className="btn" onClick={add}>Add Team Member</button></div>
  </div>
}

function renderTimeline(timeline, tasks = []){
  return <MilestoneTimeline timeline={timeline} tasks={tasks} />;
}

function EmailPreview({email=""}){
  let subject = 'Project update';
  let bodyText = '';
  if (typeof email === 'object' && email !== null) {
    if (email.subject || email.Subject) subject = email.subject || email.Subject;
    if (email.body || email.Body) bodyText = email.body || email.Body;
    if (!bodyText) {
      const parts = [];
      if (email.greeting) parts.push(email.greeting);
      if (email.message) parts.push(email.message);
      if (email.details) parts.push(email.details);
      if (email.signoff) parts.push(email.signoff);
      bodyText = parts.join('\n\n');
    }
    if (!bodyText && email.text) bodyText = email.text;
  } else {
    const emailStr = String(email);
    const lines = emailStr.split('\n');
    let inBody = false;
    const bodyLines = [];
    lines.forEach(l => {
      if (l.toLowerCase().startsWith('subject:')) {
        subject = l.substring(8).trim();
      } else if (l.toLowerCase().startsWith('body:')) {
        inBody = true;
        bodyLines.push(l.substring(5).trim());
      } else if (inBody || !l.toLowerCase().startsWith('subject:')) {
        bodyLines.push(l);
      }
    });
    bodyText = bodyLines.join('\n').trim();
  }

  return <div className="glass-panel p-5 font-sans">
    <div className="border-b border-white/10 pb-3 mb-4">
      <span className="small-muted text-xs uppercase tracking-wider block mb-1">Subject</span>
      <div className="font-bold text-lg">{subject}</div>
    </div>
    <div className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">
      {bodyText || 'No email preview available.'}
    </div>
  </div>
}

function Reports(){
  const projects = userSafeParse('projects', []).map(p => ({...p, result: repairResult(p.result)}));
  const result = projects.length > 0 ? projects[projects.length - 1].result : getLatestProjectResult();
  const progress = result?.progressUpdate || {};
  
  const reportText = result ? buildReportText(result) : "";
  function exportPDF(){
    const doc=new jsPDF();
    doc.setFontSize(18);
    doc.text('Weekly Project Report',14,20);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(reportText, 180);
    doc.text(lines,14,32);
    doc.save('weekly-report.pdf');
  }
  function downloadTxt(){
    const blob = new Blob([reportText], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${(result?.title || 'project-report').replace(/\s+/g,'-').toLowerCase()}-weekly-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('TXT downloaded', 'info');
  }
  async function copyReport(){
    try{
      await navigator.clipboard.writeText(reportText);
      showToast('Report copied', 'info');
    }catch(e){
      showToast('Copy unavailable in this browser session', 'error');
    }
  }
  return <Shell>
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Weekly Project Report</h2>
          <p className="small-muted">Generated from the latest AI intake result.</p>
        </div>
        {result && <div className="flex flex-wrap gap-2">
          <button onClick={copyReport} className="btn">Copy Report</button>
          <button onClick={downloadTxt} className="btn">Download TXT</button>
          <button onClick={()=>{ exportPDF(); showToast('PDF downloaded', 'info'); }} className="btn">Download PDF</button>
        </div>}
      </div>
      {!result ? <div className="empty-state mt-6">No report data exists yet. Run AI Intake in Workspace to generate a full professional report.</div> : <div className="report-grid mt-6">
        <ReportSection title="Executive Summary" items={[result.summary || result.requirementSummary]} />
        
        <div className="glass-panel p-5">
          <h3 className="section-title">Current Status</h3>
          <div className="mt-2">
            <div className="text-3xl font-bold text-indigo-400">{result.status || 'In Progress'}</div>
            <div className="text-xl font-medium mt-1">{result.completion || '0%'} Complete</div>
            <div className="w-full h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-indigo-500" style={{width: result.completion}} />
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 md:col-span-2">
          <h3 className="section-title">Work Progress</h3>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div>
              <h4 className="text-xs uppercase tracking-wider text-white/40 font-bold mb-2">Completed Work</h4>
              <p className="text-sm leading-relaxed">{progress.completedWork || 'No completed work reported this week.'}</p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-white/40 font-bold mb-2">Work In Progress</h4>
              <p className="text-sm leading-relaxed">{progress.workInProgress || 'No work currently in progress.'}</p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-white/40 font-bold mb-2">Blockers</h4>
              <p className="text-sm leading-relaxed text-rose-400">{progress.blockers || 'No blockers reported.'}</p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-white/40 font-bold mb-2">Next Week Plan</h4>
              <p className="text-sm leading-relaxed text-emerald-400">{progress.nextWeekPlan || 'No plan specified for next week.'}</p>
            </div>
          </div>
        </div>

        <ReportSection title="Tasks" items={result.tasks} />
        <div className="md:col-span-2">
          {renderTimeline(result.timeline || result.milestones, result.tasks)}
        </div>
        <ReportSection title="Risks and Mitigation" items={result.risks} />
        <div className="md:col-span-2">
          <h3 className="section-title">Team Allocation</h3>
          <TeamAllocationCards items={result.teamAllocation} teamMembers={result.intake?.teamMembers} />
        </div>
        <div className="glass-panel p-5">
          <h3 className="section-title">Project Health</h3>
          <div className={`text-5xl font-black mt-2 ${result.projectHealthScore >= 80 ? 'text-emerald-400' : result.projectHealthScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {result.projectHealthScore || 88} <span className="text-xl text-white/30">/ 100</span>
          </div>
          <div className="mt-3 text-sm text-white/70">
            {result.projectHealthScore >= 80 ? 'Healthy - Ready for execution' : result.projectHealthScore >= 60 ? 'Moderate - Some risks identified' : 'Critical - Needs immediate attention'}
          </div>
        </div>
        <div className="glass-panel p-4 md:col-span-2">
          <h3 className="section-title">Evaluation Metrics</h3>
          <EvaluationMetricsCards metrics={result.evaluationMetrics} showOverall />
        </div>
        <div className="glass-panel p-4 md:col-span-2">
          <h3 className="section-title">Client Email Update</h3>
          <EmailPreview email={result.emailUpdate} />
        </div>
      </div>}
    </div>
  </Shell>
}

function ReportSection({title,items=[]}){
  const list = asArray(items);
  return <div className="glass-panel p-4">
    <h3 className="section-title">{title}</h3>
    <ul className="readable-list">{list.map((item,i)=><li key={i}>{textFrom(item)}</li>)}</ul>
  </div>
}

function KPI({title,value,colorFrom,colorTo}){
  return <div className={`kpi ${colorFrom} ${colorTo} bg-gradient-to-r ${colorFrom} ${colorTo}`}>
    <div className="label">{title}</div>
    <motion.div className="value" initial={{y:10,opacity:0}} animate={{y:0,opacity:1}}>{value}</motion.div>
  </div>
}

function RiskRow({name,severity,progress}){
  return <div className="glass-panel p-3">
    <div className="flex justify-between"><div className="font-semibold">{name}</div><div className="small-muted">{severity}</div></div>
    <div className="w-full bg-white/6 h-2 rounded-full mt-2"><div style={{width:`${progress}%`}} className="h-2 rounded-full bg-amber-400"/></div>
  </div>
}

function computeComplexity(teamSize,budget,requirements){
  let score = 0;
  if(teamSize<3) score+=2; else if(teamSize<6) score+=1; else score+=0;
  if(budget<20000) score+=2; else if(budget<70000) score+=1;
  if((requirements||'').length>400) score+=2;
  return ['Low','Medium','High','Very High'][Math.min(score,3)];
}

function Panel({title,items=[]}){return <div className="card"><h3 className="font-bold mb-2">{title}</h3><ul className="list-disc ml-5 text-sm">{(items||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></div>}

function Analytics(){
  const result = getLatestProjectResult() || {};
  const evalFormatted = formatEvaluationMetrics(result.evaluationMetrics || {});
  
  const aiTrendData=[{name:'Mon',requests:14,cost:0.22,latency:350},{name:'Tue',requests:21,cost:0.31,latency:380},{name:'Wed',requests:17,cost:0.25,latency:410},{name:'Thu',requests:28,cost:0.42,latency:390},{name:'Fri',requests:35,cost:0.55,latency:420}];
  
  const radarData = [
    { subject: 'Accuracy', A: evalFormatted.accuracyValue || 91, fullMark: 100 },
    { subject: 'Relevance', A: evalFormatted.relevanceValue || 94, fullMark: 100 },
    { subject: 'Faithfulness', A: evalFormatted.faithfulnessValue || 92, fullMark: 100 },
    { subject: 'Feedback', A: evalFormatted.feedbackValue || 90, fullMark: 100 },
    { subject: 'Quality', A: evalFormatted.overallQualityValue || 89, fullMark: 100 }
  ];

  const riskData = [
    { name: 'High', value: 1 },
    { name: 'Medium', value: 2 },
    { name: 'Low', value: 1 }
  ];
  const RISK_COLORS = ['#ef4444', '#f59e0b', '#10b981'];

  const teamList = Array.isArray(result.teamAllocation) ? result.teamAllocation : asArray(result.teamAllocation).map(x=> typeof x === 'object' ? x : { name: String(x), role:'', assigned:'' });
  const workloadData = teamList.map(m => {
    const name = m.name || m;
    const role = m.role || '';
    const assigned = m.assigned || '';
    const tasks = assigned ? String(assigned).split('/').length : 0;
    const workloadNum = Number(String(m.workload || '').replace(/[^0-9]/g,'')) || Math.max(1, Math.round(100 / Math.max(1, teamList.length)));
    return { name, role, tasks, workload: workloadNum };
  });

  const healthScore = result.projectHealthScore || 88;

  return <Shell>
    <div className="mb-6">
      <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
      <p className="small-muted">Real-time metrics for AI orchestration and project health.</p>
    </div>
    
    <div className="grid md:grid-cols-3 gap-6 mb-6">
      <div className="glass-panel p-5 flex flex-col items-center justify-center">
        <h3 className="font-bold mb-4">Project Health</h3>
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="56" className="stroke-current text-white/10" strokeWidth="12" fill="none" />
            <circle cx="64" cy="64" r="56" className={`stroke-current ${healthScore>=80?'text-emerald-400':healthScore>=60?'text-yellow-400':'text-red-400'}`} strokeWidth="12" fill="none" strokeDasharray="351.86" strokeDashoffset={351.86 - (351.86 * healthScore) / 100} style={{transition: 'stroke-dashoffset 1s ease-in-out'}} />
          </svg>
          <div className="absolute text-3xl font-black">{healthScore}</div>
        </div>
      </div>
      
      <div className="glass-panel p-5">
        <h3 className="font-bold mb-4">Risk Severity</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={riskData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                {riskData.map((entry, index) => <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{backgroundColor:'#0f172a', borderColor:'rgba(255,255,255,0.1)'}} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel p-5">
        <h3 className="font-bold mb-4">Team Workload</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={workloadData} margin={{left: -10, right: 10, top: 10, bottom: 5}}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} interval={0} tick={{angle: -20, textAnchor: 'end'}} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor:'#0f172a', borderColor:'rgba(255,255,255,0.1)'}} />
              <Legend wrapperStyle={{color:'#cbd5e1', fontSize:12}} />
              <Bar dataKey="tasks" fill="#8b5cf6" name="Assigned Tasks" radius={[4, 4, 0, 0]} />
              <Bar dataKey="workload" fill="#22d3ee" name="Workload %" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    <div className="glass-panel p-5 mb-6">
      <h3 className="font-bold mb-4">Evaluation KPIs</h3>
      <EvaluationMetricsCards metrics={result.evaluationMetrics} showOverall />
    </div>

    <div className="grid md:grid-cols-2 gap-6 mb-6">
      <div className="glass-panel p-5">
        <h3 className="font-bold mb-4">AI Cost & Latency Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={aiTrendData}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{backgroundColor:'#0f172a', borderColor:'rgba(255,255,255,0.1)'}} />
              <Legend />
              <Bar yAxisId="left" dataKey="cost" fill="#38bdf8" name="Cost ($)" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#f43f5e" name="Latency (ms)" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel p-5">
        <h3 className="font-bold mb-4">Evaluation Metrics Radar</h3>
        <div className="h-64 flex justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{fill: '#94a3b8', fontSize: 12}} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Score" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
              <Tooltip contentStyle={{backgroundColor:'#0f172a', borderColor:'rgba(255,255,255,0.1)'}} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </Shell>
}

// Duplicate Reports removed — using unified Reports component defined earlier

function ReportView({data}){
  return <div className="mt-3">
    <div className="card mb-4"><h3 className="font-bold">Executive Summary</h3><p className="small-muted mt-2">{data.summary || data.analysis?.summary || 'AI-generated executive summary will appear here.'}</p></div>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card md:col-span-2">
        <h4 className="font-semibold mb-3">Timeline Milestones</h4>
        <MilestoneTimeline embedded timeline={data.timeline || data.milestones} tasks={data.tasks} />
      </div>
      <div className="card md:col-span-2"><h4 className="font-semibold">Risk Matrix</h4><ul className="readable-list mt-2">{asArray(data.risks||[]).map((r,i)=><li key={i}>{textFrom(r)}</li>)}</ul></div>
    </div>
  </div>
}

function Admin(){
  const [users,setUsers]=useState([]), [logs,setLogs]=useState(()=>{ return userSafeParse('admin_logs', []); });
  useEffect(()=>{ async function load(){ try{ const {data} = await axios.get(API+'/api/admin/users'); setUsers(data); }catch(e){ setUsers([{name:'Admin',email:'admin@test.com',role:'Admin'},{name:'PM',email:'pm@test.com',role:'ProjectManager'}]); } } load(); },[]);
  return <Shell>
    <div className="grid md:grid-cols-3 gap-4">
      <div className="card md:col-span-2"><h3 className="font-bold">User Management</h3>{users.map((u,i)=><div key={i} className="flex justify-between items-center py-3 border-b border-white/6"><div><div className="font-semibold">{u.name}</div><div className="small-muted">{u.email}</div></div><div className="text-sm">{u.role}</div></div>)}</div>
      <div className="card"><h3 className="font-bold">Audit Logs</h3><div className="mt-2 small-muted">Recent events</div>{logs.slice().reverse().map((l,i)=><div key={i} className="mt-2 small-muted">{l}</div>)}</div>
    </div>
  </Shell>
}

function ProjectHistory() {
  const projects = userSafeParse('projects', []).map(p => ({
    ...p,
    result: repairResult(p.result)
  }));
  const [selectedProject, setSelectedProject] = useState(null);

  const getStatusColor = (status) => {
    if (status === 'Completed') return 'text-emerald-400 bg-emerald-400/10';
    if (status === 'In Progress') return 'text-yellow-400 bg-yellow-400/10';
    return 'text-slate-400 bg-slate-400/10';
  };

  return <Shell>
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Project History</h2>
          <p className="small-muted">All projects generated by you.</p>
        </div>
        <div className="badge-pm">Total: {projects.length}</div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">No projects in history yet. Start by creating one in the Workspace.</div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="glass-panel p-4 flex items-center justify-between cursor-pointer hover:border-indigo-500/50 transition-colors"
              onClick={() => setSelectedProject(project)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <ClipboardList className="text-indigo-400" size={20} />
                </div>
                <div>
                  <h3 className="font-bold">{project.projectName}</h3>
                  <div className="text-xs text-white/50">{new Date(project.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end gap-1">
                  <div className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${getStatusColor(project.status)}`}>
                    {project.status}
                  </div>
                  <div className="text-xs font-medium text-white/70">{project.completionPercentage}% Complete</div>
                </div>
                <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400" 
                    style={{ width: `${project.completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {selectedProject && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
        <div className="glass-panel w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8 relative">
          <button 
            onClick={() => setSelectedProject(null)}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <AlertTriangle size={24} className="rotate-45" />
          </button>
          
          <div className="mb-8">
            <div className="eyebrow">Project Details</div>
            <h2 className="text-3xl font-bold">{selectedProject.projectName}</h2>
            <div className="flex gap-4 mt-2">
               <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedProject.status)}`}>{selectedProject.status}</span>
               <span className="text-white/50 text-sm">Created on {new Date(selectedProject.createdAt).toLocaleString()}</span>
            </div>
          </div>

          <ProjectPlanCards result={selectedProject.result} />
        </div>
      </div>
    )}
  </Shell>
}

function App(){
  const Workflow = lazy(()=>import('./components/ai-workflow/WorkflowCanvas.jsx'));
  const [booting,setBooting] = useState(()=>!localStorage.getItem('app_booted'));
  useEffect(()=>{ if(booting){ const t = setTimeout(()=>{ setBooting(false); localStorage.setItem('app_booted','1'); }, 1500); return ()=>clearTimeout(t); } },[]);
  return <AuthProvider><BrowserRouter><ToastContainer /><Suspense fallback={<div className="p-6">Loading workflow...</div>}>{booting && <Splash/>}
  <Routes>
    <Route path="/" element={<LandingRedirect/>} />
    <Route path="/login" element={<Login/>} />
    <Route path="/dashboard" element={<Protected><DashboardV2/></Protected>} />
    <Route path="/workspace" element={<Protected><WorkspaceV2/></Protected>} />
    <Route path="/workflow" element={<Protected><Workflow/></Protected>} />
    <Route path="/analytics" element={<Protected><Analytics/></Protected>} />
    <Route path="/reports" element={<Protected><Reports/></Protected>} />
    <Route path="/history" element={<Protected><ProjectHistory/></Protected>} />
    <Route path="/admin" element={<Protected><Admin/></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></BrowserRouter></AuthProvider>
}

createRoot(document.getElementById("root")).render(<App/>);

function ProjectAssistant(){
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState('');
  const [messages,setMessages]=useState([]);
  function send(){
    if(!input) return;
    const q = input.trim(); setMessages(m=>[...m,{from:'user',text:q}]); setInput('');
    const result = getLatestProjectResult();
    const answer = answerProjectQuestion(q, result);
    setTimeout(()=> setMessages(m=>[...m,{from:'assistant',text:answer}]), 300);
  }
  return <div>
    <div className={`project-assistant ${open? 'open':''}`} style={{position:'fixed',right:24,bottom:24,zIndex:80}}>
      {open && <div className="assistant-panel glass-panel p-4" style={{width:400,height:600,display:'flex',flexDirection:'column'}}>
        <div className="flex items-center justify-between mb-3"><div className="font-bold">Project Copilot Assistant</div><button className="btn muted" onClick={()=>setOpen(false)}>Close</button></div>
        <div className="flex-1 overflow-auto mb-3" style={{whiteSpace:'pre-wrap'}}>
          {messages.map((m,i)=><div key={i} className={m.from==='user'? 'text-right mb-2':'mb-2'}><div className={m.from==='user' ? 'inline-block bg-indigo-600 px-3 py-2 rounded' : 'inline-block bg-white/5 px-3 py-2 rounded'}>{m.text}</div></div>)}
        </div>
        <div className="flex gap-2">
          <input className="input" value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about project plan..." onKeyDown={e=>{ if(e.key==='Enter') send(); }} />
          <button className="btn" onClick={send}>Send</button>
        </div>
      </div>}
      <button className="btn" onClick={()=>setOpen(s=>!s)} style={{width:64,height:64,borderRadius:999}} title="Project Copilot Assistant">PC</button>
    </div>
  </div>;
}
