"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    PORT: process.env.PORT ?? "5000",
    MONGODB_URI: process.env.MONGODB_URI ?? "",
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME ?? "",
    JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "1d"
};
