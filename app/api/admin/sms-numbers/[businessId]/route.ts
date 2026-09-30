import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { validateRequestOrigin } from "@/lib/security/origin-protection";
import { safeLogger } from "@/lib/security/safe-logger";
import {
  activateSmsNumber,
  assignExistingSmsNumber,
  purchaseSmsNumber,
  reconcileSmsNumber,
  SmsSetupError,
} from "@/lib/sms/number-setup";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ businessId: string }> }) {
  try {
    const originError = validateRequestOrigin(request);
    if (originError) return originError;
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { businessId } = await context.params;
    if (!/^[a-f\d]{24}$/i.test(businessId) || !Types.ObjectId.isValid(businessId)) {
      return NextResponse.json({ error: "Invalid business ID." }, { status: 400 });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    if (!body || typeof body !== "object")
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    let result;
    switch (body.action) {
      case "purchase":
        if (body.confirmCharges !== true)
          return NextResponse.json(
            { error: "Confirm Twilio charges before purchasing." },
            { status: 400 },
          );
        result = await purchaseSmsNumber(businessId);
        break;
      case "assign":
        if (typeof body.numberSid !== "string" || !/^PN[a-f\d]{32}$/i.test(body.numberSid)) {
          return NextResponse.json(
            { error: "Enter the Twilio phone number SID (PN...)." },
            { status: 400 },
          );
        }
        result = await assignExistingSmsNumber(businessId, body.numberSid);
        break;
      case "reconcile":
        result = await reconcileSmsNumber(businessId);
        break;
      case "activate":
        if (body.confirmRegistration !== true)
          return NextResponse.json(
            { error: "Confirm this customer's messaging registration and routing first." },
            { status: 400 },
          );
        result = await activateSmsNumber(businessId, admin._id.toString());
        break;
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SmsSetupError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    safeLogger.error("Admin SMS setup failed.", error);
    return NextResponse.json(
      { error: "SMS setup failed. Inspect server logs and Twilio before retrying a purchase." },
      { status: 500 },
    );
  }
}
