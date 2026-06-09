import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key-at-least-32-chars-long";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";

// Derive a static 32-byte key from JWT_SECRET for AES-256
const MASTER_KEY = crypto.createHash("sha256").update(JWT_SECRET).digest();

/**
 * Decodes a base32 string into a binary Buffer.
 */
function base32Decode(base32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = base32.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (let i = 0; i < cleaned.length; i++) {
    const val = alphabet.indexOf(cleaned[i]);
    if (val === -1) {
      throw new Error(`Invalid base32 character: ${cleaned[i]}`);
    }
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generates a random 16-character base32 secret.
 */
export function generateSecret(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = crypto.randomBytes(10); // 80 bits of entropy
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }
  return result;
}

/**
 * Verifies a 6-digit TOTP token against a base32 secret.
 * Supports a clock-drift window (default 1 step = 30 seconds before/after).
 */
export function verifyTotp(secret: string, token: string, window = 1): boolean {
  try {
    const key = base32Decode(secret);
    const now = Math.floor(Date.now() / 1000 / 30);

    for (let i = -window; i <= window; i++) {
      const counter = now + i;
      const counterBuffer = Buffer.alloc(8);
      // Write the 64-bit counter as Big Endian
      counterBuffer.writeBigInt64BE(BigInt(counter));

      const hmac = crypto.createHmac("sha1", key);
      hmac.update(counterBuffer);
      const hmacResult = hmac.digest();

      // Dynamic truncation
      const offset = hmacResult[hmacResult.length - 1] & 0xf;
      const code =
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff);

      const candidate = (code % 1000000).toString().padStart(6, "0");
      if (candidate === token) {
        return true;
      }
    }
  } catch (error) {
    console.error("[TOTP Verification Error]", error);
  }
  return false;
}

/**
 * Encrypts a plain secret using AES-256-GCM.
 * Output format is `ivHex:encryptedHex:authTagHex`
 */
export function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, MASTER_KEY, iv);
  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${encrypted}:${authTag}`;
}

/**
 * Decrypts an AES-256-GCM encrypted secret string.
 */
export function decryptSecret(encryptedData: string): string {
  const [ivHex, encryptedHex, authTagHex] = encryptedData.split(":");
  if (!ivHex || !encryptedHex || !authTagHex) {
    throw new Error("Invalid encrypted secret format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, undefined, "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Generates 8 backup recovery codes in the format `xxxx-xxxx`
 */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const part1 = crypto.randomBytes(2).toString("hex");
    const part2 = crypto.randomBytes(2).toString("hex");
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

/**
 * Hashes a backup recovery code using SHA-256.
 */
export function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}
