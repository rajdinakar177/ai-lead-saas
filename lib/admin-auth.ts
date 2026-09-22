import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { connectDB } from "@/lib/mongodb";
import { Admin } from "@/models/Admin";
import { AdminSession } from "@/models/AdminSession";

const ADMIN_SESSION_COOKIE = "admin_session";

const ADMIN_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(adminId: string) {
  await connectDB();

  const token = crypto.randomBytes(32).toString("hex");

  const tokenHash = hashToken(token);

  const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION);

  await AdminSession.create({
    adminId,
    tokenHash,
    expiresAt,
  });

  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteAdminSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (token) {
    await connectDB();

    await AdminSession.deleteOne({
      tokenHash: hashToken(token),
    });
  }

  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();

  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  await connectDB();

  const session = await AdminSession.findOne({
    tokenHash: hashToken(token),
    expiresAt: {
      $gt: new Date(),
    },
  }).lean();

  if (!session) {
    return null;
  }

  const admin = await Admin.findOne({
    _id: session.adminId,
    active: true,
  }).lean();

  if (!admin) {
    return null;
  }

  return admin;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}