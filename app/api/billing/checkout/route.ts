import { NextRequest, NextResponse } from "next/server";

import { getCurrentBusiness } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { validateRequestOrigin } from "@/lib/security/origin-protection";
import { safeLogger } from "@/lib/security/safe-logger";
import { getStripe } from "@/lib/stripe";
import { getSubscriptionPlan } from "@/lib/subscription-plans";
import { Business } from "@/models/Business";

export async function POST(request: NextRequest) {
  try {
    // Protect cookie-authenticated mutation from cross-origin requests.
    const originError = validateRequestOrigin(request);

    if (originError) {
      return originError;
    }

    const currentBusiness = await getCurrentBusiness();

    if (!currentBusiness) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const plan = getSubscriptionPlan(body.plan);

    if (!plan) {
      return NextResponse.json({ error: "Invalid subscription plan." }, { status: 400 });
    }

    if (!plan.priceId) {
      return NextResponse.json({ error: "Subscription plan is not configured." }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      return NextResponse.json({ error: "Application URL is not configured." }, { status: 500 });
    }

    await connectDB();

    const business = await Business.findById(currentBusiness._id).select("name email subscription");

    if (!business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    /*
     * Prevent duplicate Stripe subscriptions.
     *
     * An existing subscription must be managed through
     * the billing portal instead of creating another
     * Checkout subscription.
     */
    const subscriptionStatus = business.subscription?.status ?? "none";

    const stripeSubscriptionId = business.subscription?.stripeSubscriptionId ?? null;

    const hasExistingSubscription =
      Boolean(stripeSubscriptionId) &&
      (subscriptionStatus === "active" ||
        subscriptionStatus === "trialing" ||
        subscriptionStatus === "past_due" ||
        subscriptionStatus === "unpaid" ||
        subscriptionStatus === "incomplete" ||
        subscriptionStatus === "paused");

    if (hasExistingSubscription) {
      return NextResponse.json(
        {
          error: "You already have a subscription. Manage your existing subscription instead.",
        },
        { status: 409 },
      );
    }

    const stripe = getStripe();

    let stripeCustomerId = business.subscription?.stripeCustomerId ?? null;

    /*
     * Create one Stripe customer per business.
     * Once created, store the Stripe customer ID
     * so future checkouts reuse the same customer.
     */
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: business.name,
        email: business.email,
        metadata: {
          businessId: business._id.toString(),
        },
      });

      stripeCustomerId = customer.id;

      await Business.updateOne(
        {
          _id: business._id,
        },
        {
          $set: {
            "subscription.stripeCustomerId": stripeCustomerId,
          },
        },
      );
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",

      customer: stripeCustomerId,

      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],

      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,

      /*
       * An unpaid business cannot access /dashboard/settings,
       * so cancelled Checkout returns to the subscription page.
       */
      cancel_url: `${appUrl}/billing/subscribe?billing=cancelled`,

      client_reference_id: business._id.toString(),

      metadata: {
        businessId: business._id.toString(),
        plan: plan.id,
      },

      /*
       * These metadata values are copied onto
       * the Stripe Subscription itself.
       *
       * Our webhook uses them to map the Stripe
       * subscription back to the business.
       */
      subscription_data: {
        metadata: {
          businessId: business._id.toString(),
          plan: plan.id,
        },
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Unable to create checkout session." }, { status: 500 });
    }

    return NextResponse.json({
      url: checkoutSession.url,
    });
  } catch (error) {
    safeLogger.error("Failed to create Stripe checkout session.", error);

    return NextResponse.json({ error: "Unable to start checkout." }, { status: 500 });
  }
}
