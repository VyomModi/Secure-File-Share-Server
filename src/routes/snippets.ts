import { Router } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { z } from "zod";
import { SharedSnippetModel } from "../models/SharedSnippet";
import { ActivityLogModel } from "../models/ActivityLog";
import { AuthRequest } from "../middleware/auth";

const router = Router();

const createSchema = z.object({
  title:    z.string().min(1).max(100),
  code:     z.string().min(1).max(100_000),
  language: z.string().default("plaintext"),
});

// POST /api/snippets  — create & share a snippet
router.post("/", async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: parsed.error.issues[0].message });

    const { title, code, language } = parsed.data;

    // generate a short, collision-resistant share ID  (e.g. "a3f9b2")
    const shareId = crypto.randomBytes(4).toString("hex");

    const snippet = await SharedSnippetModel.create({
      title,
      code,
      language,
      ownerUserId: new mongoose.Types.ObjectId(req.user.id),
      shareId,
    });

    await ActivityLogModel.create({
      userId: new mongoose.Types.ObjectId(req.user.id),
      action: `Snippet shared: ${title}`,
      ipAddress: (req as any).ip,
    });

    res.status(201).json({
      id:       String(snippet._id),
      shareId:  snippet.shareId,
      title:    snippet.title,
      language: snippet.language,
      createdAt: snippet.createdAt,
    });
  } catch (err) {
    console.error("Create snippet error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/snippets/my  — list snippets the current user created
router.get("/my", async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const snippets = await SharedSnippetModel.find({ ownerUserId: req.user.id })
      .select("-code")           // don't send full code in list view
      .sort({ createdAt: -1 })
      .lean();

    res.json(snippets.map((s: any) => ({ ...s, id: String(s._id) })));
  } catch (err) {
    console.error("List snippets error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/snippets/:shareId  — fetch a snippet by its share code (any logged-in user)
router.get("/:shareId", async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { shareId } = (req as any).params;
    const snippet = await SharedSnippetModel.findOne({ shareId }).lean();

    if (!snippet)
      return res.status(404).json({ message: "Snippet not found. Check the share code." });

    await ActivityLogModel.create({
      userId: new mongoose.Types.ObjectId(req.user.id),
      action: `Snippet viewed: ${snippet.title}`,
      ipAddress: (req as any).ip,
    });

    res.json({ ...snippet, id: String(snippet._id) });
  } catch (err) {
    console.error("Get snippet error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/snippets/:shareId  — owner can delete their snippet
router.delete("/:shareId", async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { shareId } = (req as any).params;
    const snippet = await SharedSnippetModel.findOne({ shareId });

    if (!snippet)
      return res.status(404).json({ message: "Snippet not found" });

    if (String(snippet.ownerUserId) !== String(req.user.id))
      return res.status(403).json({ message: "Forbidden" });

    await SharedSnippetModel.deleteOne({ shareId });

    await ActivityLogModel.create({
      userId: new mongoose.Types.ObjectId(req.user.id),
      action: `Snippet deleted: ${snippet.title}`,
      ipAddress: (req as any).ip,
    });

    res.json({ message: "Snippet deleted" });
  } catch (err) {
    console.error("Delete snippet error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
