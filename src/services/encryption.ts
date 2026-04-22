import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const KEY = crypto
  .createHash("sha256")
  .update(process.env.ENCRYPTION_KEY ?? "dev-encryption-key")
  .digest();

export function encryptBuffer(buffer: Buffer): Buffer {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]); // store IV + ciphertext
}

export function decryptBuffer(buffer: Buffer): Buffer {
  const iv = buffer.subarray(0, 16);
  const ciphertext = buffer.subarray(16);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
