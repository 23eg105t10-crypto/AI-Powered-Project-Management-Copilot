import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { validateProject } from "../middleware/validate.js";
import { listProjects, analyzeProject } from "../controllers/project.controller.js";
const router = Router();
router.get("/", auth(), listProjects);
router.post("/analyze", auth(["Admin", "Project Manager"]), validateProject, analyzeProject);
export default router;
