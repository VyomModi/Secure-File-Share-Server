import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import mongoose from "mongoose";
import { FileModel } from "../models/File";
import { ActivityLogModel } from "../models/ActivityLog";
import { encryptBuffer, decryptBuffer } from "../services/encryption";
import { AuthRequest } from "../middleware/auth"; // your JWT middleware type

const router = Router();

// In-memory storage like original
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

const uploadsDir = path.resolve(process.cwd(), "uploads");

// ensure uploads dir exists at startup (call once in server bootstrap)
export async function ensureUploadsDir() {
  await fs.mkdir(uploadsDir, { recursive: true });
}

// GET /api/files - list current user's files
router.get("/", async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const files = await FileModel.find({ ownerUserId: req.user.id })
      .sort({ uploadDate: -1 })
      .lean();

    // Frontend expects `id` (not Mongo `_id`).
    res.json(files.map((f: any) => ({ ...f, id: String(f._id) })));
  } catch (err) {
    console.error("List files error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/files/upload - encrypt + store file
router.post(
  "/upload",
  upload.single("file"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const file = req.file;
      if (!file || !file.buffer) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // hash original content
      const sha256Hash = crypto
        .createHash("sha256")
        .update(file.buffer)
        .digest("hex");

      // encrypt
      const encrypted = encryptBuffer(file.buffer);

      // write to disk
      const randomPrefix = crypto.randomUUID();
      const safeName = file.originalname.replace(/[^\w.\-]+/g, "_");
      const diskName = `${randomPrefix}_${safeName}`;
      const filePath = path.join(uploadsDir, diskName);

      await fs.writeFile(filePath, encrypted);

      // persist metadata
      const doc = await FileModel.create({
        filename: file.originalname,
        encryptedFilePath: filePath,
        ownerUserId: new mongoose.Types.ObjectId(req.user.id),
        sha256Hash,
      });

      // log activity
      await ActivityLogModel.create({
        userId: new mongoose.Types.ObjectId(req.user.id),
        action: `File uploaded: ${file.originalname}`,
        ipAddress: req.ip,
      });

      const docObj = doc.toObject ? doc.toObject() : (doc as any);
      res.status(201).json({ ...docObj, id: String(docObj._id) });
    } catch (err) {
      console.error("Upload error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /api/files/:id/download - decrypt + verify hash + send
router.get("/:id/download", async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const fileDoc = await FileModel.findById(id).lean();
    if (!fileDoc) return res.status(404).json({ message: "File not found" });

    if (String(fileDoc.ownerUserId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const encrypted = await fs.readFile(fileDoc.encryptedFilePath);
    const decrypted = decryptBuffer(encrypted);

    const checkHash = crypto
      .createHash("sha256")
      .update(decrypted)
      .digest("hex");

    if (checkHash !== fileDoc.sha256Hash) {
      return res
        .status(500)
        .json({ message: "File integrity check failed" });
    }

    await ActivityLogModel.create({
      userId: new mongoose.Types.ObjectId(req.user.id),
      action: `File downloaded: ${fileDoc.filename}`,
      ipAddress: req.ip,
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileDoc.filename}"`
    );
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(decrypted);
  } catch (err) {
    console.error("Download error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;