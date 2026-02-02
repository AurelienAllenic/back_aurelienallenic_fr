const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

function getKey() {
  const secret = process.env.ENCRYPTION_SECRET || process.env.SESSION_SECRET || "default-secret-change-in-production";
  return crypto.scryptSync(secret, "salt", KEY_LENGTH);
}

function encrypt(text) {
  if (text == null || text === "") return text;
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    let encrypted = cipher.update(String(text), "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag();
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
  } catch (err) {
    console.error("Encryption error:", err.message);
    return text;
  }
}

function decrypt(encryptedText) {
  if (encryptedText == null || encryptedText === "") return encryptedText;
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      console.error(`❌ [Decrypt] Format invalide: ${parts.length} parties au lieu de 3`);
      return encryptedText;
    }
    const key = getKey();
    const iv = Buffer.from(parts[0], "base64");
    const authTag = Buffer.from(parts[1], "base64");
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");
    console.log('✅ [Decrypt] Déchiffrement réussi');
    return decrypted;
  } catch (err) {
    console.error('❌ [Decrypt] Erreur:', err.message);
    console.error('❌ [Decrypt] Texte chiffré:', encryptedText.substring(0, 50) + '...');
    return encryptedText;
  }
}

module.exports = { encrypt, decrypt };
