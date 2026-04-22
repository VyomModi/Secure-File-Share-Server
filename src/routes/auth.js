"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const User_1 = require("../models/User");
const env_1 = require("../config/env");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6)
});
const loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(3),
    password: zod_1.z.string().min(6)
});
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MINUTES = 15;
function signToken(user) {
    return jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
}
// Post /api/auth/register
router.post("/register", async (req, res) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: parsed.error.issues[0].message });
        const { username, email, password } = parsed.data;
        const existing = await User_1.User.findOne({
            $or: [{ username }, { email }],
        }).lean();
        if (existing) {
            return res.status(409).json({ message: "Username or email already in use" });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await User_1.User.create({
            username,
            email,
            passwordHash
        });
        const token = signToken({ id: user.id, username: user.username });
        return res.status(201).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt,
            },
        });
    }
    catch (err) {
        console.log("Register error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
// Post /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: parsed.error.issues[0].message });
        const { username, password } = parsed.data;
        const user = await User_1.User.findOne({ username });
        if (!user)
            return res.status(401).json({ message: "Invalid credentials" });
        // check LockOut
        const now = new Date();
        if (user.accountLockedUntil && user.accountLockedUntil > now) {
            const minutesLeft = Math.ceil((user.accountLockedUntil.getTime() - now.getTime()) / (60000));
            return res.status(403).json({ message: `Account locked. Try again in ${minutesLeft} minute(s).`,
            });
        }
        const passwordOk = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!passwordOk) {
            user.failedLoginAttempts += 1;
            if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
                const lockUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60000);
                user.accountLockedUntil = lockUntil;
            }
            await user.save();
            return res.status(401).json({ message: "Invalid credentials" });
        }
        // Reset On Successful Login
        user.failedLoginAttempts = 0;
        user.accountLockedUntil = null;
        await user.save();
        const token = signToken({ id: user.id, username: user.username });
        return res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt,
            },
        });
    }
    catch (err) {
        console.log("Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
// GET /api/auth/me
router.get("/me", auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = await User_1.User.findById(req.user.id).lean();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
        });
    }
    catch (err) {
        console.log("Me error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = router;
