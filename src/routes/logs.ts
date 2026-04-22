import { Router } from "express";
import { ActivityLogModel } from "../models/ActivityLog";
import { AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/logs - return logs (you can later filter per user if you want)
router.get("/", async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const logs = await ActivityLogModel.find()
      .sort({ timestamp: 1 })
      .lean();

    // Frontend expects `id` (not Mongo `_id`).
    res.json(logs.map((l: any) => ({ ...l, id: String(l._id) })));
  } catch (err) {
    console.error("Logs error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;