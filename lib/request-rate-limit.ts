import { NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";

type RequestRateLimitOptions = {
  request: Request;
  action: string;
  limit: number;
  windowMs: number;
};

const MAX_IP_LENGTH = 64;

function normalizeIp(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || normalized.length > MAX_IP_LENGTH) {
    return null;
  }

  return normalized;
}

function getClientIp(request: Request) {
  /*
   * In production, Leadquivo is deployed
   * behind Vercel's trusted proxy.
   *
   * Vercel populates x-forwarded-for.
   * The first value represents the
   * original client address.
   */
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = normalizeIp(forwardedFor.split(",")[0] ?? null);

    if (firstIp) {
      return firstIp;
    }
  }

  /*
   * Fallback for environments that
   * provide x-real-ip.
   */
  const realIp = normalizeIp(request.headers.get("x-real-ip"));

  if (realIp) {
    return realIp;
  }

  /*
   * Local development may not provide
   * either header.
   *
   * Sharing one fallback bucket is safer
   * than generating attacker-controlled
   * identifiers.
   */
  return "unknown";
}

export async function applyRequestRateLimit({
  request,
  action,
  limit,
  windowMs,
}: RequestRateLimitOptions) {
  const ip = getClientIp(request);

  const result = await checkRateLimit({
    key: `${action}:${ip}`,
    limit,
    windowMs,
  });

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": result.retryAfterSeconds.toString(),
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
      },
    },
  );
}