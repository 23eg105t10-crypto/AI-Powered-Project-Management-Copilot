import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import automationRoutes from "./routes/automation.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import mongoose from "mongoose";

const app = express();

app.use(helmet());
app.use(cors({ 
  origin: [
    /^http:\/\/localhost:\d+$/, 
    /^http:\/\/127\.0\.0\.1:\d+$/, 
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    process.env.CLIENT_URL
  ].filter(Boolean), 
  credentials: true 
}));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.get("/api/health", (_, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: "ok", database: dbStatus });
});
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/automation", automationRoutes);
app.use(errorHandler);

export default app;
