import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "enc:v1:";

function getEncryptionKey() {
  const encodedKey =
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;

  if (!encodedKey) {
    throw new Error(
      "GOOGLE_TOKEN_ENCRYPTION_KEY is not configured."
    );
  }

  let key: Buffer;

  try {
    key = Buffer.from(
      encodedKey,
      "base64"
    );
  } catch {
    throw new Error(
      "GOOGLE_TOKEN_ENCRYPTION_KEY is invalid."
    );
  }

  if (key.length !== 32) {
    throw new Error(
      "GOOGLE_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 encoded key."
    );
  }

  return key;
}

export function isEncryptedToken(
  value: string
) {
  return value.startsWith(PREFIX);
}

export function encryptToken(
  value: string
) {
  if (!value) {
    throw new Error(
      "Cannot encrypt an empty token."
    );
  }

  /*
   * Prevent accidental double encryption.
   */
  if (isEncryptedToken(value)) {
    return value;
  }

  const key =
    getEncryptionKey();

  const iv =
    randomBytes(IV_LENGTH);

  const cipher =
    createCipheriv(
      ALGORITHM,
      key,
      iv,
      {
        authTagLength:
          AUTH_TAG_LENGTH,
      }
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        value,
        "utf8"
      ),
      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

return `${PREFIX}${iv.toString(
  "base64url"
)}:${authTag.toString(
  "base64url"
)}:${encrypted.toString(
  "base64url"
)}`;
}

export function decryptToken(
  value: string
) {
  /*
   * Temporary backwards compatibility.
   *
   * Existing Google integrations currently
   * contain plaintext tokens. Until those
   * records are migrated/reconnected, return
   * legacy plaintext values unchanged.
   */
  if (!isEncryptedToken(value)) {
    return value;
  }

  const payload =
    value.slice(PREFIX.length);

  const parts =
    payload.split(":");

  if (parts.length !== 3) {
    throw new Error(
      "Encrypted Google token has an invalid format."
    );
  }

  const [
    ivEncoded,
    authTagEncoded,
    encryptedEncoded,
  ] = parts;

  const key =
    getEncryptionKey();

  const iv =
    Buffer.from(
      ivEncoded,
      "base64url"
    );

  const authTag =
    Buffer.from(
      authTagEncoded,
      "base64url"
    );

  const encrypted =
    Buffer.from(
      encryptedEncoded,
      "base64url"
    );

  if (
    iv.length !== IV_LENGTH ||
    authTag.length !==
      AUTH_TAG_LENGTH
  ) {
    throw new Error(
      "Encrypted Google token has invalid metadata."
    );
  }

  const decipher =
    createDecipheriv(
      ALGORITHM,
      key,
      iv,
      {
        authTagLength:
          AUTH_TAG_LENGTH,
      }
    );

  decipher.setAuthTag(
    authTag
  );

  const decrypted =
    Buffer.concat([
      decipher.update(
        encrypted
      ),
      decipher.final(),
    ]);

  return decrypted.toString(
    "utf8"
  );
}