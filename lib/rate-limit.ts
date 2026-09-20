import { connectDB } from "@/lib/mongodb";
import { RateLimit } from "@/models/RateLimit";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export async function checkRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  await connectDB();

  const now = new Date();

  const windowStartedAt = new Date(now.getTime() - windowMs);

  const expiresAt = new Date(now.getTime() + windowMs);

  /*
   * First try to increment an existing
   * bucket that still belongs to the
   * current rate-limit window.
   */
  const existing = await RateLimit.findOneAndUpdate(
    {
      key,

      windowStartedAt: {
        $gt: windowStartedAt,
      },
    },
    {
      $inc: {
        count: 1,
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (existing) {
    const count = existing.count;

    const resetAt = new Date(existing.windowStartedAt).getTime() + windowMs;

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((resetAt - now.getTime()) / 1000),
    );

    return {
      allowed: count <= limit,

      limit,

      remaining: Math.max(0, limit - count),

      retryAfterSeconds,
    };
  }

  /*
   * There is no active bucket.
   *
   * Delete an expired bucket with the
   * same key before creating the new
   * window. MongoDB TTL cleanup is
   * asynchronous, so an expired record
   * may still physically exist.
   */
  await RateLimit.deleteOne({
    key,

    windowStartedAt: {
      $lte: windowStartedAt,
    },
  });

  try {
    await RateLimit.create({
      key,
      count: 1,
      windowStartedAt: now,
      expiresAt,
    });

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  } catch (error) {
    /*
     * Another request may have created
     * this same bucket between our
     * delete/create operations.
     *
     * Retry once using the atomic
     * increment path.
     */
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      const concurrent = await RateLimit.findOneAndUpdate(
        {
          key,
        },
        {
          $inc: {
            count: 1,
          },
        },
        {
          returnDocument: "after",
        },
      );

      if (concurrent) {
        const count = concurrent.count;

        const resetAt =
          new Date(concurrent.windowStartedAt).getTime() + windowMs;

        return {
          allowed: count <= limit,

          limit,

          remaining: Math.max(0, limit - count),

          retryAfterSeconds: Math.max(
            1,
            Math.ceil((resetAt - now.getTime()) / 1000),
          ),
        };
      }
    }

    throw error;
  }
}
