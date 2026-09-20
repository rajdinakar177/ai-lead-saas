import type { GeneratedSlot, Timeline } from "@/lib/availability";

import { getAvailableAppointmentSlots } from "@/lib/appointments/availability";

export async function getSmsAvailableSlots({
  business,
  timeline,
}: {
  business: any;
  timeline: Timeline;
}): Promise<GeneratedSlot[]> {
  return getAvailableAppointmentSlots({
    business,
    timeline,
  });
}
