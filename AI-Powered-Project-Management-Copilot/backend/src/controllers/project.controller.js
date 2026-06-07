import axios from "axios";
import Project from "../models/Project.js";
import AuditLog from "../models/AuditLog.js";

export async function listProjects(req, res, next) {
  try {
    const projects = await Project.find({ owner: req.user.id }).sort({ createdAt: -1 }).limit(20);
    res.json(projects);
  } catch (e) { next(e); }
}

export async function analyzeProject(req, res, next) {
  try {
    const { title, requirements } = req.body;
    const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const { data } = await axios.post(`${aiUrl}/analyze`, { title, requirements }, { timeout: 60000 });
    const project = await Project.create({ title, owner: req.user.id, requirements, ...data });
    await AuditLog.create({ actor: req.user.email, action: "ANALYZE_PROJECT", entity: "Project", metadata: { title }, ip: req.ip });
    res.status(201).json(project);
  } catch (e) { next(e); }
}
