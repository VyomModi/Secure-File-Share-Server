import { Router, Response } from "express";
import multer from "multer";
import crypto from "crypto";
import mongoose from "mongoose";
import { FileModel } from "../models/File";
import { ActivityLogModel } from "../models/ActivityLog";
import { encryptBuffer, decryptBuffer } from "../services/encryption";
import { AuthRequest } from "../middleware/auth";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export async function ensureUploadsDir() {}

// GET /api/files
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const files = await FileModel.find({ ownerUserId: req.user.id })
      .select("-encryptedData")
      .sort({ uploadDate: -1 })
      .lean();

    res.json(files.map((f: any) => ({ ...f, id: String(f._id) })));
  } catch (err) {
    console.error("List files error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/files/upload
router.post("/upload", upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const sha256Hash = crypto.createHash("sha256").update(file.buffer).digest("hex");
    const encryptedData = encryptBuffer(file.buffer);

    const doc = await FileModel.create({
      filename: file.originalname,
      encryptedData,
      fileSize: file.size,
      ownerUserId: new mongoose.Types.ObjectId(req.user.id),
      sha256Hash,
    });

    await ActivityLogModel.create({
      userId: new mongoose.Types.ObjectId(req.user.id),
      action: `File uploaded: ${file.originalname}`,
      ipAddress: req.ip,
    });

    const docObj = doc.toObject() as any;
    delete docObj.encryptedData;
    res.status(201).json({ ...docObj, id: String(docObj._id) });
  } catch (err) {
    console.error("Upload error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/files/:id/download
router.get("/:id/download", async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const fileDoc = await FileModel.findById(req.params.id);
    if (!fileDoc) return res.status(404).json({ message: "File not found" });

    if (String(fileDoc.ownerUserId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const decrypted = decryptBuffer(fileDoc.encryptedData);

    const checkHash = crypto.createHash("sha256").update(decrypted).digest("hex");
    if (checkHash !== fileDoc.sha256Hash) {
      return res.status(500).json({ message: "File integrity check failed" });
    }

    await ActivityLogModel.create({
      userId: new mongoose.Types.ObjectId(req.user.id),
      action: `File downloaded: ${fileDoc.filename}`,
      ipAddress: req.ip,
    });

    res.setHeader("Content-Disposition", `attachment; filename="${fileDoc.filename}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(decrypted);
  } catch (err) {
    console.error("Download error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/files/:id
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const fileDoc = await FileModel.findById(req.params.id);
    if (!fileDoc) return res.status(404).json({ message: "File not found" });

    if (String(fileDoc.ownerUserId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await FileModel.findByIdAndDelete(req.params.id);

    await ActivityLogModel.create({
      userId: new mongoose.Types.ObjectId(req.user.id),
      action: `File deleted: ${fileDoc.filename}`,
      ipAddress: req.ip,
    });

    res.json({ message: "File deleted successfully" });
  } catch (err) {
    console.error("Delete error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
