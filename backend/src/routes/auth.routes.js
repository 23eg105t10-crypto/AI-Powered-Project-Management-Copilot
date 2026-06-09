import { Router } from "express";
import { signup, login } from "../controllers/auth.controller.js";
import { validateSignup } from "../middleware/validate.js";
const router = Router();
router.post("/signup", validateSignup, signup);
router.post("/login", login);
export default router;
