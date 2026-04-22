"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptBuffer = encryptBuffer;
exports.decryptBuffer = decryptBuffer;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = "aes-256-cbc";
const KEY = crypto_1.default
    .createHash("sha256")
    .update(process.env.ENCRYPTION_KEY ?? "dev-encryption-key")
    .digest();
function encryptBuffer(buffer) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([iv, encrypted]); // store IV + ciphertext
}
function decryptBuffer(buffer) {
    const iv = buffer.subarray(0, 16);
    const ciphertext = buffer.subarray(16);
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, KEY, iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
