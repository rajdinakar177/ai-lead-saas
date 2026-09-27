import {
  getSubscriptionPlan,
  type PlanId,
  type SubscriptionPlanFeatures,
  type SubscriptionPlanLimits,
} from "@/lib/subscription-plans";

export type SubscriptionAccess = {
  hasAccess: boolean;
  plan: PlanId | null;
  limits: SubscriptionPlanLimits | null;
  features: SubscriptionPlanFeatures | null;
};

type BusinessSubscriptionLike = {
  plan?: PlanId | null;
  status?: string | null;
};

export function getSubscriptionAccess(
  subscription?: BusinessSubscriptionLike | null,
): SubscriptionAccess {
  const status = subscription?.status ?? "none";
  const planId = subscription?.plan ?? null;

  const hasAccess = status === "active" || status === "trialing";

  if (!hasAccess || !planId) {
    return {
      hasAccess: false,
      plan: null,
      limits: null,
      features: null,
    };
  }

  const plan = getSubscriptionPlan(planId);

  if (!plan) {
    return {
      hasAccess: false,
      plan: null,
      limits: null,
      features: null,
    };
  }

  return {
    hasAccess: true,
    plan: plan.id,
    limits: plan.limits,
    features: plan.features,
  };
}

export function hasSubscriptionFeature(
  subscription: BusinessSubscriptionLike | null | undefined,
  feature: keyof SubscriptionPlanFeatures,
) {
  const access = getSubscriptionAccess(subscription);

  return access.hasAccess && access.features?.[feature] === true;
}

export function getSubscriptionLimit(
  subscription: BusinessSubscriptionLike | null | undefined,
  limit: keyof SubscriptionPlanLimits,
) {
  const access = getSubscriptionAccess(subscription);

  if (!access.hasAccess || !access.limits) {
    return null;
  }

  return access.limits[limit];
}
