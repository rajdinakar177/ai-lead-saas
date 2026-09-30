import "server-only";

import crypto from "crypto";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import twilio from "twilio";
import { Business } from "@/models/Business";
import { getSubscriptionAccess } from "@/lib/subscription-access";

export class SmsSetupError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}

export function canRequestSmsNumber(business: {
  country?: string | null;
  subscription?: {
    plan?: "starter" | "pro" | null;
    status?: string | null;
  } | null;
}) {
  const access = getSubscriptionAccess(business.subscription);
  return (
    (business.country ?? "US") === "US" &&
    access.hasAccess &&
    access.plan === "pro"
  );
}

export function smsSetupView(business: any) {
  return {
    eligible: canRequestSmsNumber(business),
    number: business.twilioPhoneNumber ?? null,
    status: business.twilioSmsStatus ?? "unconfigured",
    areaCode: business.twilioSetup?.areaCode ?? "",
  };
}

function getNumberClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new SmsSetupError(
      "Twilio account credentials are not configured.",
      503,
    );
  }
  // Never automatically retry a non-idempotent number purchase.
  return twilio(accountSid, authToken, { autoRetry: false, timeout: 20000 });
}

function getWebhookUrl() {
  const value = process.env.TWILIO_WEBHOOK_URL;
  if (!value)
    throw new SmsSetupError("TWILIO_WEBHOOK_URL is not configured.", 503);
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new SmsSetupError(
      "TWILIO_WEBHOOK_URL must be a public HTTPS URL.",
      503,
    );
  }
  return url.toString();
}

async function ensureNumberIndex() {
  // Fail before contacting Twilio if legacy duplicates need operator cleanup.
  await Business.collection.createIndex(
    { twilioPhoneNumber: 1 },
    {
      name: "unique_assigned_twilio_number",
      unique: true,
      partialFilterExpression: { twilioPhoneNumber: { $type: "string" } },
    },
  );
}

async function assertPaidPro(businessId: string) {
  const business = await Business.findById(businessId).lean();
  if (!business) throw new SmsSetupError("Business not found.", 404);
  if (
    !canRequestSmsNumber(business) ||
    business.subscription?.status !== "active"
  ) {
    throw new SmsSetupError(
      "An active paid Pro subscription is required for number assignment.",
      403,
    );
  }
  return business;
}

export async function requestSmsNumber(businessId: string, areaCode: string) {
  const updated = await Business.findOneAndUpdate(
    {
      _id: businessId,
      country: { $in: ["US", null] },
      "subscription.plan": "pro",
      "subscription.status": { $in: ["active", "trialing"] },
      twilioPhoneNumber: null,
      $or: [
        { twilioSmsStatus: { $in: ["unconfigured", "requested"] } },
        { twilioSmsStatus: { $exists: false } },
      ],
    },
    {
      $set: {
        twilioSmsStatus: "requested",
        "twilioSetup.areaCode": areaCode,
        "twilioSetup.requestedAt": new Date(),
      },
    },
    { returnDocument: "after", runValidators: true },
  ).lean();
  const business = updated ?? (await Business.findById(businessId).lean());
  if (!business) throw new SmsSetupError("Business not found.", 404);
  if (!canRequestSmsNumber(business))
    throw new SmsSetupError("Pro is required for number setup.", 403);
  return smsSetupView(business);
}

export async function purchaseSmsNumber(businessId: string) {
  await assertPaidPro(businessId);
  if (process.env.TWILIO_NUMBER_PURCHASE_ENABLED !== "true") {
    throw new SmsSetupError(
      "Number purchasing is disabled. Enable TWILIO_NUMBER_PURCHASE_ENABLED after reviewing Twilio charges.",
      503,
    );
  }
  const client = getNumberClient();
  const smsUrl = getWebhookUrl();
  await ensureNumberIndex();
  const purchaseToken = crypto.randomUUID();
  // A durable one-time claim; no expiring lease may authorize another purchase.
  const business = await Business.findOneAndUpdate(
    {
      _id: businessId,
      twilioSmsStatus: "requested",
      twilioPhoneNumber: null,
      "subscription.plan": "pro",
      "subscription.status": "active",
    },
    {
      $set: {
        twilioSmsStatus: "provisioning",
        "twilioSetup.purchaseToken": purchaseToken,
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!business)
    throw new SmsSetupError(
      "Setup was already claimed, assigned, or is not requested. Refresh or reconcile; do not purchase again.",
    );
  let purchaseStarted = false;
  try {
    if (!/^[2-9]\d{2}$/.test(business.twilioSetup?.areaCode ?? "")) {
      throw new SmsSetupError(
        "A valid area code is required before purchasing.",
        400,
      );
    }
    const numbers = await client.availablePhoneNumbers("US").local.list({
      areaCode: Number(business.twilioSetup.areaCode),
      smsEnabled: true,
      excludeAllAddressRequired: true,
      limit: 1,
    });
    if (!numbers.length)
      throw new SmsSetupError(
        "No SMS number is available in this area code. Ask support to select another area code.",
      );
    const claim = await Business.updateOne(
      {
        _id: businessId,
        twilioSmsStatus: "provisioning",
        "twilioSetup.purchaseToken": purchaseToken,
        "subscription.plan": "pro",
        "subscription.status": "active",
      },
      { $set: { "twilioSetup.purchaseStartedAt": new Date() } },
    );
    if (!claim.modifiedCount)
      throw new SmsSetupError(
        "Subscription or setup changed before purchasing.",
      );
    purchaseStarted = true;
    const number = await client.incomingPhoneNumbers.create({
      phoneNumber: numbers[0].phoneNumber,
      friendlyName: `leadquivo:${businessId}`,
      smsUrl,
      smsMethod: "POST",
    });
    await saveAssignedNumber(
      businessId,
      number.sid,
      number.phoneNumber,
      purchaseToken,
    );
  } catch (error) {
    // Unknown remote outcome stays blocked until reconciled. Never blindly retry.
    await Business.updateOne(
      {
        _id: businessId,
        twilioSmsStatus: "provisioning",
        "twilioSetup.purchaseToken": purchaseToken,
      },
      {
        $set: {
          twilioSmsStatus: purchaseStarted ? "needs_review" : "requested",
        },
      },
    );
    if (purchaseStarted)
      throw new SmsSetupError(
        "Purchase outcome needs review. Reconcile with Twilio before any further purchase.",
      );
    throw error;
  }
  return smsSetupView(await Business.findById(businessId).lean());
}

async function saveAssignedNumber(
  businessId: string,
  sid: string,
  phoneNumber: string,
  purchaseToken: string,
) {
  if (!/^\+1\d{10}$/.test(phoneNumber))
    throw new SmsSetupError("Twilio returned an invalid US number.");
  const result = await Business.updateOne(
    {
      _id: businessId,
      twilioSmsStatus: "provisioning",
      "twilioSetup.purchaseToken": purchaseToken,
    },
    {
      $set: {
        twilioPhoneNumber: phoneNumber,
        twilioNumberSid: sid,
        twilioSmsStatus: "registration_pending",
      },
    },
    { runValidators: true },
  );
  if (!result.modifiedCount)
    throw new SmsSetupError(
      "Number exists in Twilio but could not be assigned. Reconcile before proceeding.",
    );
}

export async function assignExistingSmsNumber(businessId: string, sid: string) {
  await assertPaidPro(businessId);
  const client = getNumberClient();
  const smsUrl = getWebhookUrl();
  await ensureNumberIndex();
  const number = await client.incomingPhoneNumbers(sid).fetch();
  if (
    parsePhoneNumberFromString(number.phoneNumber)?.country !== "US" ||
    !number.capabilities.sms ||
    !/^\+1\d{10}$/.test(number.phoneNumber)
  ) {
    throw new SmsSetupError(
      "Choose an SMS-capable US number owned by this Twilio account.",
      400,
    );
  }
  const owner = await Business.findOne({
    twilioPhoneNumber: number.phoneNumber,
    _id: { $ne: businessId },
  }).lean();
  if (owner)
    throw new SmsSetupError("This number is assigned to another business.");
  const purchaseToken = crypto.randomUUID();
  const business = await Business.findOneAndUpdate(
    {
      _id: businessId,
      "subscription.plan": "pro",
      "subscription.status": "active",
      $and: [
        {
          $or: [
            { twilioPhoneNumber: null },
            { twilioPhoneNumber: number.phoneNumber },
          ],
        },
        {
          $or: [
            {
              twilioSmsStatus: {
                $in: ["unconfigured", "requested", "registration_pending"],
              },
            },
            { twilioSmsStatus: { $exists: false } },
          ],
        },
      ],
    },
    {
      $set: {
        twilioPhoneNumber: number.phoneNumber,
        twilioNumberSid: sid,
        twilioSmsStatus: "provisioning",
        "twilioSetup.purchaseToken": purchaseToken,
      },
    },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!business)
    throw new SmsSetupError(
      "Setup is already running or a different number is assigned. Refresh or reconcile.",
    );
  try {
    await client
      .incomingPhoneNumbers(sid)
      .update({ smsUrl, smsMethod: "POST", smsApplicationSid: "" });
    await saveAssignedNumber(
      businessId,
      sid,
      number.phoneNumber,
      purchaseToken,
    );
  } catch {
    await Business.updateOne(
      {
        _id: businessId,
        "twilioSetup.purchaseToken": purchaseToken,
        twilioSmsStatus: "provisioning",
      },
      { $set: { twilioSmsStatus: "needs_review" } },
    );
    throw new SmsSetupError(
      "Number assignment needs review. Reconcile before proceeding.",
    );
  }
  return smsSetupView(await Business.findById(businessId).lean());
}

export async function reconcileSmsNumber(businessId: string) {
  const business = await assertPaidPro(businessId);
  if (!["provisioning", "needs_review"].includes(business.twilioSmsStatus)) {
    throw new SmsSetupError("Only an unfinished setup can be reconciled.");
  }
  if (
    business.twilioSmsStatus === "provisioning" &&
    Date.now() - new Date(business.updatedAt).getTime() < 120000
  ) {
    throw new SmsSetupError(
      "Setup may still be running. Wait two minutes before reconciling.",
    );
  }
  const client = getNumberClient();
  const smsUrl = getWebhookUrl();
  await ensureNumberIndex();
  const numbers = business.twilioNumberSid
    ? [await client.incomingPhoneNumbers(business.twilioNumberSid).fetch()]
    : await client.incomingPhoneNumbers.list({
        friendlyName: `leadquivo:${businessId}`,
        limit: 2,
      });
  if (numbers.length !== 1) {
    throw new SmsSetupError(
      "Could not identify exactly one number. Inspect the Twilio account before resetting this request; no number was purchased by reconciliation.",
    );
  }
  const number = numbers[0];
  if (
    parsePhoneNumberFromString(number.phoneNumber)?.country !== "US" ||
    !number.capabilities.sms
  )
    throw new SmsSetupError(
      "The recovered number is not SMS-capable in the US.",
    );
  const claim = await Business.updateOne(
    {
      _id: businessId,
      twilioSmsStatus: business.twilioSmsStatus,
      updatedAt: business.updatedAt,
    },
    { $set: { twilioSmsStatus: "provisioning" } },
  );
  if (!claim.modifiedCount)
    throw new SmsSetupError("Setup changed. Refresh before reconciling.");
  try {
    await client
      .incomingPhoneNumbers(number.sid)
      .update({ smsUrl, smsMethod: "POST", smsApplicationSid: "" });
    await saveAssignedNumber(
      businessId,
      number.sid,
      number.phoneNumber,
      business.twilioSetup.purchaseToken,
    );
  } catch {
    await Business.updateOne(
      {
        _id: businessId,
        twilioSmsStatus: "provisioning",
        "twilioSetup.purchaseToken": business.twilioSetup.purchaseToken,
      },
      { $set: { twilioSmsStatus: "needs_review" } },
    );
    throw new SmsSetupError("Reconciliation needs operator review.");
  }
  return smsSetupView(await Business.findById(businessId).lean());
}

export async function activateSmsNumber(businessId: string, adminId: string) {
  const business = await assertPaidPro(businessId);
  if (
    business.twilioSmsStatus !== "registration_pending" ||
    !business.twilioNumberSid
  ) {
    throw new SmsSetupError("Assign a number before activating messaging.");
  }
  const number = await getNumberClient()
    .incomingPhoneNumbers(business.twilioNumberSid)
    .fetch();
  if (
    number.phoneNumber !== business.twilioPhoneNumber ||
    !number.capabilities.sms ||
    number.smsApplicationSid ||
    number.smsUrl !== getWebhookUrl() ||
    number.smsMethod !== "POST"
  ) {
    throw new SmsSetupError(
      "Number ownership or webhook configuration does not match. Reassign the number to repair it.",
    );
  }
  // Registration approval is checked manually in Console by the authenticated admin.
  const result = await Business.updateOne(
    {
      _id: businessId,
      twilioSmsStatus: "registration_pending",
      twilioNumberSid: number.sid,
      "subscription.plan": "pro",
      "subscription.status": "active",
    },
    {
      $set: {
        twilioSmsStatus: "ready",
        "twilioSetup.approvedAt": new Date(),
        "twilioSetup.approvedBy": adminId,
      },
    },
  );
  if (!result.modifiedCount)
    throw new SmsSetupError("Setup changed before activation. Refresh.");
  return smsSetupView(await Business.findById(businessId).lean());
}
