import { NextResponse } from "next/server";

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function validateRequestOrigin(request: Request) {
  /*
   * GET / HEAD / OPTIONS should not
   * perform state-changing operations.
   */
  if (
    request.method === "GET" ||
    request.method === "HEAD" ||
    request.method === "OPTIONS"
  ) {
    return null;
  }

  const origin = request.headers.get("origin");

  /*
   * Modern browser mutation requests
   * should contain Origin.
   *
   * Reject missing Origin for our
   * cookie-authenticated mutation APIs.
   */
  if (!origin) {
    return NextResponse.json(
      {
        error: "Invalid request origin.",
      },
      {
        status: 403,
      },
    );
  }

  const requestOrigin = normalizeOrigin(request.url);

  const suppliedOrigin = normalizeOrigin(origin);

  if (!requestOrigin || !suppliedOrigin || requestOrigin !== suppliedOrigin) {
    return NextResponse.json(
      {
        error: "Invalid request origin.",
      },
      {
        status: 403,
      },
    );
  }

  return null;
}
