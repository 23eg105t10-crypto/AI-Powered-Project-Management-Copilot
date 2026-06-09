import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { analytics } from "../controllers/analytics.controller.js";
const router = Router();
router.get("/", auth(), analytics);
export default router;
