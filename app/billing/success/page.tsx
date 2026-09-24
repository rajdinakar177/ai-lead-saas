import Link from "next/link";
import { redirect } from "next/navigation";

import { requireBusiness } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type BillingSuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function BillingSuccessPage({
  searchParams,
}: BillingSuccessPageProps) {
  const business = await requireBusiness();

  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    redirect("/billing/subscribe");
  }

  /*
   * Verify the Checkout Session with Stripe.
   *
   * The session ID from the URL is untrusted input.
   * Never assume it belongs to this business.
   */
  let checkoutSession;

  try {
    const stripe = getStripe();

    checkoutSession =
      await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    redirect("/billing/subscribe");
  }

  /*
   * Checkout sessions created by our backend contain
   * the business ID in client_reference_id and metadata.
   */
  const businessId = business._id.toString();

  const sessionBelongsToBusiness =
    checkoutSession.client_reference_id === businessId &&
    checkoutSession.metadata?.businessId === businessId;

  if (!sessionBelongsToBusiness) {
    redirect("/billing/subscribe");
  }

  /*
   * If the business already has a Stripe customer,
   * verify that the Checkout Session belongs to
   * the same Stripe customer.
   */
  const businessStripeCustomerId =
    business.subscription?.stripeCustomerId ?? null;

  const checkoutCustomerId =
    typeof checkoutSession.customer === "string"
      ? checkoutSession.customer
      : checkoutSession.customer?.id ?? null;

  if (
    businessStripeCustomerId &&
    checkoutCustomerId !== businessStripeCustomerId
  ) {
    redirect("/billing/subscribe");
  }

  /*
   * IMPORTANT:
   *
   * A valid Checkout Session still does NOT grant
   * dashboard access.
   *
   * Only the subscription state synchronized by
   * our verified Stripe webhook can do that.
   */
  const subscriptionStatus =
    business.subscription?.status ?? "none";

  const hasAccess =
    subscriptionStatus === "active" ||
    subscriptionStatus === "trialing";

  if (hasAccess) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 text-xl">
          ✓
        </div>

        <h1 className="mt-5 text-2xl font-semibold">
          Payment received
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Your payment was received and your subscription is being
          activated. This normally takes only a few seconds.
        </p>

        <form className="mt-7">
          <button
            type="submit"
            className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Continue to dashboard
          </button>
        </form>

        <Link
          href="/billing/subscribe"
          className="mt-4 inline-block text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          Back to subscription
        </Link>
      </div>
    </main>
  );
}