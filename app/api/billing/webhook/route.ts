import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { connectDB } from "@/lib/mongodb";
import { safeLogger } from "@/lib/security/safe-logger";
import { getStripe } from "@/lib/stripe";
import { Business } from "@/models/Business";

export const runtime = "nodejs";

type PlanId = "starter" | "pro";

const SUPPORTED_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
]);

function getPlanFromPriceId(priceId: string | null): PlanId | null {
  if (!priceId) {
    return null;
  }

  if (process.env.STRIPE_STARTER_PRICE_ID && priceId === process.env.STRIPE_STARTER_PRICE_ID) {
    return "starter";
  }

  if (process.env.STRIPE_PRO_PRICE_ID && priceId === process.env.STRIPE_PRO_PRICE_ID) {
    return "pro";
  }

  return null;
}

function getStripeCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer) {
  return typeof customer === "string" ? customer : customer.id;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];

  if (!item) {
    throw new Error(`Stripe subscription ${subscription.id} does not contain a subscription item.`);
  }

  const stripePriceId = item.price.id;

  const plan =
    getPlanFromPriceId(stripePriceId) ||
    (subscription.metadata.plan === "starter" || subscription.metadata.plan === "pro"
      ? subscription.metadata.plan
      : null);

  if (!plan) {
    throw new Error(`Unable to determine plan for Stripe subscription ${subscription.id}.`);
  }

  if (!SUPPORTED_STATUSES.has(subscription.status)) {
    throw new Error(`Unsupported Stripe subscription status: ${subscription.status}.`);
  }

  const businessId = subscription.metadata.businessId || null;

  const stripeCustomerId = getStripeCustomerId(subscription.customer);

  /*
   * Prefer our server-created businessId metadata.
   *
   * Customer ID is a fallback for older/existing Stripe
   * subscriptions where metadata might not be available.
   */
  const business = businessId
    ? await Business.findById(businessId)
    : await Business.findOne({
        "subscription.stripeCustomerId": stripeCustomerId,
      });

  if (!business) {
    throw new Error(`Business not found for Stripe subscription ${subscription.id}.`);
  }

  /*
   * Verify the Stripe customer belongs to the same
   * business before writing subscription state.
   */
  if (
    business.subscription?.stripeCustomerId &&
    business.subscription.stripeCustomerId !== stripeCustomerId
  ) {
    throw new Error(`Stripe customer mismatch for business ${business._id.toString()}.`);
  }

  await Business.updateOne(
    {
      _id: business._id,
    },
    {
      $set: {
        "subscription.plan": plan,
        "subscription.status": subscription.status,
        "subscription.stripeCustomerId": stripeCustomerId,
        "subscription.stripeSubscriptionId": subscription.id,
        "subscription.stripePriceId": stripePriceId,

        "subscription.currentPeriodStart": item.current_period_start
          ? new Date(item.current_period_start * 1000)
          : null,

        "subscription.currentPeriodEnd": item.current_period_end
          ? new Date(item.current_period_end * 1000)
          : null,

        "subscription.cancelAtPeriodEnd": subscription.cancel_at_period_end,

        "subscription.cancelAt": subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : null,

        "subscription.canceledAt": subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    safeLogger.error(
      "Stripe webhook secret is not configured.",
      new Error("Missing STRIPE_WEBHOOK_SECRET"),
    );

    return NextResponse.json(
      {
        error: "Webhook is not configured.",
      },
      {
        status: 500,
      },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        error: "Missing Stripe signature.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    /*
     * Stripe signature verification MUST use the raw
     * request body. Do not call request.json() here.
     */
    const rawBody = await request.text();

    const stripe = getStripe();

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    await connectDB();

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);

        break;
      }

      default:
        /*
         * Stripe sends many event types.
         * Unhandled events should still return 200.
         */
        break;
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    safeLogger.error("Stripe webhook processing failed.", error);

    return NextResponse.json(
      {
        error: "Webhook processing failed.",
      },
      {
        status: 400,
      },
    );
  }
}
