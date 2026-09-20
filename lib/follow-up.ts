export const MAX_FOLLOW_UPS = 3;

const FOLLOW_UP_DELAYS = [
  60 * 60 * 1000, // 1 hour
  24 * 60 * 60 * 1000, // 24 hours
  48 * 60 * 60 * 1000, // 48 hours
] as const;

export function getNextFollowUpAt(
  followUpCount: number,
  from: Date = new Date(),
): Date | null {
  if (followUpCount < 0 || followUpCount >= MAX_FOLLOW_UPS) {
    return null;
  }

  const delay = FOLLOW_UP_DELAYS[followUpCount];

  return new Date(from.getTime() + delay);
}

export function canFollowUp(status: string, phone?: string | null) {
  const activeStatuses = ["new", "warm", "hot", "qualified"];

  return Boolean(phone) && activeStatuses.includes(status);
}
