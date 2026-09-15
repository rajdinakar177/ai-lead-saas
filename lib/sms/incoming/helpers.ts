import { NextResponse } from "next/server";

/* =========================================================
   ACTIVE LEAD STATUSES
   ========================================================= */

export const ACTIVE_LEAD_STATUSES = [
  "new",
  "warm",
  "hot",
  "qualified",
] as const;

/* =========================================================
   ERROR MESSAGE
   ========================================================= */

export function getErrorMessage(
  error: unknown
) {
  if (error instanceof Error) {
    return error.message.slice(
      0,
      2000
    );
  }

  return String(error).slice(
    0,
    2000
  );
}

/* =========================================================
   MONGODB DUPLICATE KEY CHECK
   ========================================================= */

export function isMongoDuplicateKeyError(
  error: unknown
): error is {
  code: number;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as {
      code?: number;
    }).code === 11000
  );
}

/* =========================================================
   TEXT NORMALIZATION
   ========================================================= */

export function normalizeText(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

/* =========================================================
   SERVICE MATCHING — EXISTING LEADS
   ========================================================= */

export function findLeadByService<
  T extends {
    service?: string | null;
  }
>(
  leads: T[],
  message: string
): T | null {
  const normalizedMessage =
    normalizeText(message);

  if (!normalizedMessage) {
    return null;
  }

  const matches =
    leads.filter((lead) => {
      if (!lead.service) {
        return false;
      }

      const normalizedService =
        normalizeText(
          lead.service
        );

      if (!normalizedService) {
        return false;
      }

      if (
        normalizedMessage ===
        normalizedService
      ) {
        return true;
      }

      if (
        normalizedMessage.includes(
          normalizedService
        )
      ) {
        return true;
      }

      const serviceWords =
        normalizedService
          .split(" ")
          .filter(
            (word) =>
              word.length >= 2
          );

      if (
        serviceWords.length === 0
      ) {
        return false;
      }

      return serviceWords.every(
        (word) =>
          normalizedMessage.includes(
            word
          )
      );
    });

  /*
   * Do not guess when multiple services match.
   */
  if (matches.length !== 1) {
    return null;
  }

  return matches[0];
}

/* =========================================================
   CONFIGURED SERVICE MATCHING
   ========================================================= */

export function findConfiguredService(
  services: string[],
  message: string
): string | null {
  const normalizedMessage =
    normalizeText(message);

  if (!normalizedMessage) {
    return null;
  }

  const matches =
    services.filter((service) => {
      const normalizedService =
        normalizeText(service);

      if (!normalizedService) {
        return false;
      }

      if (
        normalizedMessage ===
        normalizedService
      ) {
        return true;
      }

      if (
        normalizedMessage.includes(
          normalizedService
        )
      ) {
        return true;
      }

      const serviceWords =
        normalizedService
          .split(" ")
          .filter(
            (word) =>
              word.length >= 2
          );

      if (
        serviceWords.length === 0
      ) {
        return false;
      }

      return serviceWords.every(
        (word) =>
          normalizedMessage.includes(
            word
          )
      );
    });

  /*
   * Do not guess when multiple configured
   * services match the same message.
   */
  if (matches.length !== 1) {
    return null;
  }

  return matches[0];
}

/* =========================================================
   TWIML SUCCESS RESPONSE
   ========================================================= */

export function twimlResponse() {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`,
    {
      status: 200,

      headers: {
        "Content-Type":
          "text/xml",
      },
    }
  );
}

/* =========================================================
   RETRY RESPONSE
   ========================================================= */

export function retryResponse() {
  return new NextResponse(
    "Temporary webhook processing failure",
    {
      status: 503,

      headers: {
        "Content-Type":
          "text/plain",
      },
    }
  );
}

/* =========================================================
   FORBIDDEN RESPONSE
   ========================================================= */

export function forbiddenResponse() {
  return new NextResponse(
    "Forbidden",
    {
      status: 403,

      headers: {
        "Content-Type":
          "text/plain",
      },
    }
  );
}