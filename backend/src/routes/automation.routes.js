import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { triggerWeeklyReport } from "../controllers/automation.controller.js";
const router = Router();
router.post("/weekly-report", auth(["Admin", "Project Manager"]), triggerWeeklyReport);
export default router;
