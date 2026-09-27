export type PlanId = "starter" | "pro";

export type SubscriptionPlanLimits = {
  leads: number;
  aiConversations: number;
  smsSegments: number;
  appointments: number;
};

export type SubscriptionPlanFeatures = {
  automatedFollowUps: boolean;
  googleCalendar: boolean;
  advancedSmsAutomation: boolean;
};

export type SubscriptionPlanConfig = {
  id: PlanId;
  name: string;
  description: string;
  priceId: string | undefined;
  limits: SubscriptionPlanLimits;
  features: SubscriptionPlanFeatures;
};

export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "Essential lead capture and qualification tools.",
    priceId: process.env.STRIPE_STARTER_PRICE_ID,

    limits: {
      leads: 250,
      aiConversations: 250,
      smsSegments: 500,
      appointments: 100,
    },

    features: {
      automatedFollowUps: false,
      googleCalendar: false,
      advancedSmsAutomation: false,
    },
  },

  pro: {
    id: "pro",
    name: "Pro",
    description: "Advanced automation and lead management tools.",
    priceId: process.env.STRIPE_PRO_PRICE_ID,

    limits: {
      leads: 1000,
      aiConversations: 1000,
      smsSegments: 2000,
      appointments: 500,
    },

    features: {
      automatedFollowUps: true,
      googleCalendar: true,
      advancedSmsAutomation: true,
    },
  },
};

export function getSubscriptionPlan(
  planId: string,
): SubscriptionPlanConfig | null {
  if (planId !== "starter" && planId !== "pro") {
    return null;
  }

  return SUBSCRIPTION_PLANS[planId];
}
