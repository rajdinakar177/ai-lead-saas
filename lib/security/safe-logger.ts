type LogMetadata = Record<string, unknown>;

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
  "accesstoken",
  "refreshtoken",
  "publicaccesstoken",
  "token",
  "password",
  "authorization",
  "cookie",
  "set-cookie",
]);

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = "[REDACTED]";
        continue;
      }

      sanitized[key] = sanitizeValue(nestedValue);
    }

    return sanitized;
  }

  return value;
}

function sanitizeMetadata(metadata?: LogMetadata): LogMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  return sanitizeValue(metadata) as LogMetadata;
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
