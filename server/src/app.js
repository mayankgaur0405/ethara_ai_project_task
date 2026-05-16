import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import projectsRoutes from "./routes/projects.js";
import tasksRoutes from "./routes/tasks.js";
import dashboardRoutes from "./routes/dashboard.js";
import timesheetsRoutes from "./routes/timesheets.js";
import { requireAuth } from "./middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true
    })
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", requireAuth, usersRoutes);
  app.use("/api/projects", requireAuth, projectsRoutes);
  app.use("/api/tasks", requireAuth, tasksRoutes);
  app.use("/api/dashboard", requireAuth, dashboardRoutes);
  app.use("/api/timesheets", requireAuth, timesheetsRoutes);

  app.use(express.static(publicDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    res.sendFile(path.join(publicDir, "index.html"));
  });

  return app;
}
