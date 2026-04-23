import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth";
import fileRoutes, { ensureUploadsDir } from "./routes/files";
import logRoutes from "./routes/logs";
import snippetRoutes from "./routes/snippets";
import { authenticateToken } from "./middleware/auth";
import serverless from "serverless-http";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth",     authRoutes);
app.use("/api/files",    authenticateToken, fileRoutes);
app.use("/api/logs",     authenticateToken, logRoutes);
app.use("/api/snippets", authenticateToken, snippetRoutes);

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error", err);
  res.status(500).json({ message: "Internal server error" });
});

let isInitialized = false;

async function init() {
  if (!isInitialized) {
    await connectDB();
    await ensureUploadsDir();
    isInitialized = true;
    console.log("✅ Server initialized");
  }
}

if (!process.env.VERCEL) {
  init()
    .then(() => {
      const PORT = env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("❌ Startup error:", err);
      process.exit(1);
    });
}

const handler = serverless(app);

export default async function handlerWrapper(req: any, res: any) {
  await init();
  return handler(req, res);
}
