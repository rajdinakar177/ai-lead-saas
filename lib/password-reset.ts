import "server-only";

import crypto from "crypto";

const PASSWORD_RESET_DURATION = 60 * 60 * 1000;

export function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString("hex");

  const tokenHash = hashPasswordResetToken(token);

  const expiresAt = new Date(Date.now() + PASSWORD_RESET_DURATION);

  return {
    token,
    tokenHash,
    expiresAt,
  };
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
