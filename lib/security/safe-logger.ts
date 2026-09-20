type LogMetadata = Record<string, unknown>;

function sanitizeMetadata(metadata?: LogMetadata): LogMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  const sensitiveKeys = new Set([
    "phone",
    "from",
    "to",
    "body",
    "reply",
    "content",
    "message",
    "name",
    "email",
    "location",
    "address",
    "accessToken",
    "refreshToken",
    "token",
    "password",
    "authorization",
  ]);

  const sanitized: LogMetadata = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (sensitiveKeys.has(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

export const safeLogger = {
  info(message: string, metadata?: LogMetadata) {
    const sanitized = sanitizeMetadata(metadata);

    if (sanitized) {
      console.log(message, sanitized);
      return;
    }

    console.log(message);
  },

  warn(message: string, metadata?: LogMetadata) {
    const sanitized = sanitizeMetadata(metadata);

    if (sanitized) {
      console.warn(message, sanitized);
      return;
    }

    console.warn(message);
  },

  error(message: string, error?: unknown, metadata?: LogMetadata) {
    const sanitized = sanitizeMetadata(metadata);

    if (process.env.NODE_ENV === "development") {
      console.error(message, error, sanitized ?? "");
      return;
    }

    if (sanitized) {
      console.error(message, sanitized);
      return;
    }

    console.error(message);
  },
};