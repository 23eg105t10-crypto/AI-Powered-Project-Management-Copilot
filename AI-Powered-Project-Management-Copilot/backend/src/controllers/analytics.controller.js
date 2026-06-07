import Project from "../models/Project.js";
import AuditLog from "../models/AuditLog.js";

export async function analytics(req, res, next) {
  try {
    const projects = await Project.find({ owner: req.user.id }).limit(100);
    const logs = await AuditLog.find({ actor: req.user.email }).sort({ createdAt: -1 }).limit(20);
    const totalTasks = projects.flatMap(p => p.tasks || []).length;
    const doneTasks = projects.flatMap(p => p.tasks || []).filter(t => t.status === "Done").length;
    const risks = projects.flatMap(p => p.risks || []);
    res.json({
      activeProjects: projects.length,
      completionRate: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
      highRisks: risks.filter(r => r.severity === "High").length,
      avgLatencyMs: 1250,
      costPerRequest: 0.018,
      evaluation: { accuracy: 0.88, relevance: 0.91, faithfulness: 0.87, hallucinationRate: 0.06, feedbackScore: 4.5 },
      usage: [
        { name: "Mon", requests: 14, cost: 0.22 },
        { name: "Tue", requests: 21, cost: 0.31 },
        { name: "Wed", requests: 17, cost: 0.25 },
        { name: "Thu", requests: 28, cost: 0.42 },
        { name: "Fri", requests: 19, cost: 0.29 }
      ],
      logs
    });
  } catch (e) { next(e); }
}
