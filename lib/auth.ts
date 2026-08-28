import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { Session } from "@/models/Session";

const SESSION_COOKIE =
  "leadflow_session";

const SESSION_DURATION =
  7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function createSession(
  businessId: string
) {
  await connectDB();

  const token =
    crypto.randomBytes(32).toString("hex");

  const tokenHash =
    hashToken(token);

  const expiresAt =
    new Date(
      Date.now() + SESSION_DURATION
    );

  await Session.create({
    businessId,
    tokenHash,
    expiresAt,
  });

  const cookieStore =
    await cookies();

  cookieStore.set(
    SESSION_COOKIE,
    token,
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax",

      path: "/",

      expires: expiresAt,
    }
  );
}

export async function deleteSession() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      SESSION_COOKIE
    )?.value;

  if (token) {
    await connectDB();

    await Session.deleteOne({
      tokenHash:
        hashToken(token),
    });
  }

  cookieStore.delete(
    SESSION_COOKIE
  );
}

export async function getCurrentBusiness() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      SESSION_COOKIE
    )?.value;

  if (!token) {
    return null;
  }

  await connectDB();

  const session =
    await Session.findOne({
      tokenHash:
        hashToken(token),

      expiresAt: {
        $gt: new Date(),
      },
    }).lean();

  if (!session) {
    return null;
  }

  const business =
    await Business.findById(
      session.businessId
    ).lean();

  if (!business) {
    return null;
  }

  return business;
}

export async function requireBusiness() {
  const business =
    await getCurrentBusiness();

  if (!business) {
    redirect("/login");
  }

  return business;
}