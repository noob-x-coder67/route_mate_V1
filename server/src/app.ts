import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import messageRoutes from "./routes/messageRoutes";
import routes from "./routes";
import adminRoutes from "./routes/adminRoutes";

const app = express();

// --- 1. Security & Configuration Middleware ---
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  }),
);
app.options(/(.*)/, cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 2. Health Check ---
app.get("/status", (req: Request, res: Response) => {
  res.json({
    message: "RouteMate Backend is Live! 🚀",
    uptime: process.uptime(),
  });
});

// --- 3. API Routes ---
app.use("/api", routes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messageRoutes);

// --- 4. Error Handler (MUST be after routes, before export) ---
app.use((err: any, req: any, res: any, next: any) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export default app;
