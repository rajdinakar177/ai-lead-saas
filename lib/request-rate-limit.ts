import { NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";

type RequestRateLimitOptions = {
  request: Request;
  action: string;
  limit: number;
  windowMs: number;
};

function getClientIp(
  request: Request
) {
  /*
   * On Vercel, x-forwarded-for is
   * populated by the trusted platform
   * proxy.
   *
   * The first value represents the
   * original client IP.
   */
  const forwardedFor =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwardedFor) {
    const firstIp =
      forwardedFor
        .split(",")[0]
        ?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  /*
   * Vercel may also expose the client
   * address through this header.
   */
  const realIp =
    request.headers.get(
      "x-real-ip"
    );

  if (realIp) {
    return realIp.trim();
  }

  /*
   * Local development does not always
   * provide a client IP header.
   */
  return "unknown";
}

export async function applyRequestRateLimit({
  request,
  action,
  limit,
  windowMs,
}: RequestRateLimitOptions) {
  const ip =
    getClientIp(request);

  const result =
    await checkRateLimit({
      key: `${action}:${ip}`,
      limit,
      windowMs,
    });

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error:
        "Too many requests. Please try again later.",
    },
    {
      status: 429,

      headers: {
        "Retry-After":
          result.retryAfterSeconds.toString(),

        "X-RateLimit-Limit":
          result.limit.toString(),

        "X-RateLimit-Remaining":
          result.remaining.toString(),
      },
    }
  );
}