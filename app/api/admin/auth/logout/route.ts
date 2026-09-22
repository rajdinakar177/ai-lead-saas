import { NextResponse } from "next/server";

import { deleteAdminSession } from "@/lib/admin-auth";
import { validateRequestOrigin } from "@/lib/security/origin-protection";
import { safeLogger } from "@/lib/security/safe-logger";

export async function POST(request: Request) {
  try {
    const originError = validateRequestOrigin(request);

    if (originError) {
      return originError;
    }

    await deleteAdminSession();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    safeLogger.error("Admin logout error.", error);

    return NextResponse.json(
      {
        error: "Unable to logout.",
      },
      {
        status: 500,
      },
    );
  }
}