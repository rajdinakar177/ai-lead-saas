import { NextResponse } from "next/server";
import { getCurrentBusiness } from "@/lib/auth";
import { validateRequestOrigin } from "@/lib/security/origin-protection";
import { safeLogger } from "@/lib/security/safe-logger";
import {
  canRequestSmsNumber,
  requestSmsNumber,
  smsSetupView,
  SmsSetupError,
} from "@/lib/sms/number-setup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const business = await getCurrentBusiness();
  if (!business) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json(smsSetupView(business), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const originError = validateRequestOrigin(request);
    if (originError) return originError;
    const business = await getCurrentBusiness();
    if (!business) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!business.emailVerified)
      return NextResponse.json({ error: "Verify your email first." }, { status: 403 });
    if (!canRequestSmsNumber(business))
      return NextResponse.json(
        { error: "An eligible Pro subscription is required." },
        { status: 403 },
      );
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const areaCode = body && typeof body === "object" && "areaCode" in body ? body.areaCode : null;
    if (typeof areaCode !== "string" || !/^[2-9]\d{2}$/.test(areaCode)) {
      return NextResponse.json(
        { error: "Enter a three-digit US area code, such as 512." },
        { status: 400 },
      );
    }
    return NextResponse.json(await requestSmsNumber(business._id.toString(), areaCode));
  } catch (error) {
    if (error instanceof SmsSetupError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    safeLogger.error("SMS number request failed.", error);
    return NextResponse.json({ error: "Unable to request an SMS number." }, { status: 500 });
  }
}
