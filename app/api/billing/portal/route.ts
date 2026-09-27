import { NextRequest, NextResponse } from "next/server";

import { getCurrentBusiness } from "@/lib/auth";
import { validateRequestOrigin } from "@/lib/security/origin-protection";
import { safeLogger } from "@/lib/security/safe-logger";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const originError = validateRequestOrigin(request);

    if (originError) {
      return originError;
    }

    const business = await getCurrentBusiness();

    if (!business) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const stripeCustomerId = business.subscription?.stripeCustomerId ?? null;

    if (!stripeCustomerId) {
      return NextResponse.json({ error: "Stripe customer not found." }, { status: 400 });
    }

    const subscriptionStatus = business.subscription?.status ?? "none";

    const canManageBilling =
      subscriptionStatus === "active" ||
      subscriptionStatus === "trialing" ||
      subscriptionStatus === "past_due";

    if (!canManageBilling) {
      return NextResponse.json({ error: "No manageable subscription found." }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      return NextResponse.json({ error: "Application URL is not configured." }, { status: 500 });
    }

    const stripe = getStripe();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/dashboard/settings`,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    safeLogger.error("Failed to create Stripe billing portal session.", error);

    return NextResponse.json({ error: "Unable to open billing portal." }, { status: 500 });
  }
}
