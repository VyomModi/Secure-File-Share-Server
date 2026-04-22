"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUploadsDir = ensureUploadsDir;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const File_1 = require("../models/File");
const ActivityLog_1 = require("../models/ActivityLog");
const encryption_1 = require("../services/encryption");
const router = (0, express_1.Router)();
// In-memory storage like original
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});
const uploadsDir = path_1.default.resolve(process.cwd(), "uploads");
// ensure uploads dir exists at startup (call once in server bootstrap)
async function ensureUploadsDir() {
    await promises_1.default.mkdir(uploadsDir, { recursive: true });
}
// GET /api/files - list current user's files
router.get("/", async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized" });
        const files = await File_1.FileModel.find({ ownerUserId: req.user.id })
            .sort({ uploadDate: -1 })
            .lean();
        // Frontend expects `id` (not Mongo `_id`).
        res.json(files.map((f) => ({ ...f, id: String(f._id) })));
    }
    catch (err) {
        console.error("List files error", err);
        res.status(500).json({ message: "Internal server error" });
    }
});
// POST /api/files/upload - encrypt + store file
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized" });
        const file = req.file;
        if (!file || !file.buffer) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        // hash original content
        const sha256Hash = crypto_1.default
            .createHash("sha256")
            .update(file.buffer)
            .digest("hex");
        // encrypt
        const encrypted = (0, encryption_1.encryptBuffer)(file.buffer);
        // write to disk
        const randomPrefix = crypto_1.default.randomUUID();
        const safeName = file.originalname.replace(/[^\w.\-]+/g, "_");
        const diskName = `${randomPrefix}_${safeName}`;
        const filePath = path_1.default.join(uploadsDir, diskName);
        await promises_1.default.writeFile(filePath, encrypted);
        // persist metadata
        const doc = await File_1.FileModel.create({
            filename: file.originalname,
            encryptedFilePath: filePath,
            ownerUserId: new mongoose_1.default.Types.ObjectId(req.user.id),
            sha256Hash,
        });
        // log activity
        await ActivityLog_1.ActivityLogModel.create({
            userId: new mongoose_1.default.Types.ObjectId(req.user.id),
            action: `File uploaded: ${file.originalname}`,
            ipAddress: req.ip,
        });
        const docObj = doc.toObject ? doc.toObject() : doc;
        res.status(201).json({ ...docObj, id: String(docObj._id) });
    }
    catch (err) {
        console.error("Upload error", err);
        res.status(500).json({ message: "Internal server error" });
    }
});
// GET /api/files/:id/download - decrypt + verify hash + send
router.get("/:id/download", async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized" });
        const { id } = req.params;
        const fileDoc = await File_1.FileModel.findById(id).lean();
        if (!fileDoc)
            return res.status(404).json({ message: "File not found" });
        if (String(fileDoc.ownerUserId) !== String(req.user.id)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const encrypted = await promises_1.default.readFile(fileDoc.encryptedFilePath);
        const decrypted = (0, encryption_1.decryptBuffer)(encrypted);
        const checkHash = crypto_1.default
            .createHash("sha256")
            .update(decrypted)
            .digest("hex");
        if (checkHash !== fileDoc.sha256Hash) {
            return res
                .status(500)
                .json({ message: "File integrity check failed" });
        }
        await ActivityLog_1.ActivityLogModel.create({
            userId: new mongoose_1.default.Types.ObjectId(req.user.id),
            action: `File downloaded: ${fileDoc.filename}`,
            ipAddress: req.ip,
        });
        res.setHeader("Content-Disposition", `attachment; filename="${fileDoc.filename}"`);
        res.setHeader("Content-Type", "application/octet-stream");
        res.send(decrypted);
    }
    catch (err) {
        console.error("Download error", err);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = router;
