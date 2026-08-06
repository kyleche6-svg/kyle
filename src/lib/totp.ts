import crypto from "node:crypto";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

const ISSUER = "DollarWatch";

// TOTP secrets are as sensitive as a password — encrypted at rest with
// AES-256-GCM, keyed from AUTH_SECRET (already required, already kept out
// of the client bundle) via scrypt, so a DB leak alone doesn't hand out
// working 2FA codes the way a plaintext secret would.
function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET must be set to use two-factor authentication.");
  return crypto.scryptSync(secret, "dollarwatch-2fa-secret", 32);
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(stored: string): string {
  const [ivHex, authTagHex, dataHex] = stored.split(":");
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

export function generateTotpSecret(): string {
  return generateSecret();
}

export async function generateQrCodeDataUrl(email: string, secret: string): Promise<string> {
  const otpauthUrl = generateURI({ issuer: ISSUER, label: email, secret });
  return QRCode.toDataURL(otpauthUrl);
}

export async function verifyTotpCode(code: string, secret: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  try {
    const result = await verify({ secret, token: code });
    return result.valid;
  } catch {
    return false;
  }
}
