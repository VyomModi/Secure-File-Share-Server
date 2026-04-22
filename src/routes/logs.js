"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ActivityLog_1 = require("../models/ActivityLog");
const router = (0, express_1.Router)();
// GET /api/logs - return logs (you can later filter per user if you want)
router.get("/", async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized" });
        const logs = await ActivityLog_1.ActivityLogModel.find()
            .sort({ timestamp: 1 })
            .lean();
        // Frontend expects `id` (not Mongo `_id`).
        res.json(logs.map((l) => ({ ...l, id: String(l._id) })));
    }
    catch (err) {
        console.error("Logs error", err);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = router;
