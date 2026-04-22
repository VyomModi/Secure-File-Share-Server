"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = vercelHandler;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const auth_1 = __importDefault(require("./routes/auth"));
const files_1 = __importStar(require("./routes/files"));
const logs_1 = __importDefault(require("./routes/logs"));
const auth_2 = require("./middleware/auth");
const serverless_http_1 = __importDefault(require("serverless-http"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/auth", auth_1.default);
app.use((err, _req, res, _next) => {
    console.error("Unhandled error", err);
    res.status(500).json({ message: "Internal server error" });
});
app.use("/api/files", auth_2.authenticateToken, files_1.default);
app.use("/api/logs", auth_2.authenticateToken, logs_1.default);
// Initialize resources once, and reuse across serverless invocations.
const initPromise = (async () => {
    await (0, db_1.connectDB)();
    await (0, files_1.ensureUploadsDir)();
})();
// Local dev: keep the original behavior (listen on a port).
if (!process.env.VERCEL) {
    initPromise
        .then(() => {
        app.listen(env_1.env.PORT, () => {
            console.log(`Auth server listening on http://localhost:${env_1.env.PORT}`);
        });
    })
        .catch((err) => {
        console.error("Fatal error on startup", err);
        process.exit(1);
    });
}
// Vercel: export a handler so Vercel can route requests into Express.
const handler = (0, serverless_http_1.default)(app);
async function vercelHandler(req, res) {
    await initPromise;
    return handler(req, res);
}
