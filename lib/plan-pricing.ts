export const PLAN_PRICING = {
  starter: {
    monthlyUsd: 69,
  },
  pro: {
    monthlyUsd: 149,
  },
} as const;

export function formatMonthlyPrice(plan: keyof typeof PLAN_PRICING) {
  return `$${PLAN_PRICING[plan].monthlyUsd}`;
}