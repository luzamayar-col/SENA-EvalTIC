/**
 * Cifrado AES-256-GCM para datos sensibles en base de datos (API keys de Resend).
 * Requiere variable de entorno: ENCRYPTION_KEY (64 hex chars = 32 bytes)
 *
 * Generar:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY debe ser exactamente 64 caracteres hex (32 bytes). " +
        "Generar con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return Buffer.from(key, "hex");
}

/** Cifra un texto con AES-256-GCM. Retorna formato: iv:tag:ciphertext (hex) */
export function encryptValue(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

/** Descifra un valor cifrado con encryptValue. */
export function decryptValue(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Formato de cifrado inválido");
  }
  const [ivHex, tagHex, encHex] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Determina si un valor está en formato cifrado (iv:tag:ciphertext).
 * Permite compatibilidad con claves guardadas antes del cifrado.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && parts[0].length === 32; // IV = 16 bytes = 32 hex chars
}

/**
 * Descifra si está cifrado; retorna el valor original si no lo está (backwards compat).
 * Usar durante la transición mientras existen keys sin cifrar en la BD.
 */
export function safeDecrypt(value: string): string {
  if (!process.env.ENCRYPTION_KEY) return value; // Sin key → modo sin cifrado
  if (isEncrypted(value)) {
    try {
      return decryptValue(value);
    } catch {
      // Si falla el descifrado, puede ser texto plano antiguo
      return value;
    }
  }
  return value;
}
