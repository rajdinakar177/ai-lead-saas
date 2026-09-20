import {
  generateSlotsForDate,
  getDatesForTimeline,
  getDayName,
  type AvailabilityDay,
  type GeneratedSlot,
  type Timeline,
} from "@/lib/availability";

import { Appointment } from "@/models/Appointment";

type GetAvailableAppointmentSlotsParams = {
  business: any;
  timeline: Timeline;

  /**
   * Used while rescheduling so the current
   * appointment does not block itself.
   */
  excludeAppointmentId?: string | null;
};

export async function getAvailableAppointmentSlots({
  business,
  timeline,
  excludeAppointmentId = null,
}: GetAvailableAppointmentSlotsParams): Promise<GeneratedSlot[]> {
  const availability = business.availability;

  if (!availability || !availability.days?.length) {
    return [];
  }

  const timezone = business.timezone ?? "America/Chicago";

  const dates = getDatesForTimeline(timeline, timezone);

  const now = new Date();

  const slots: GeneratedSlot[] = [];

  for (const localDate of dates) {
    const dayName = getDayName(localDate);

    const dayAvailability = availability.days.find(
      (item: AvailabilityDay) => item.day === dayName,
    );

    if (!dayAvailability) {
      continue;
    }

    const generatedSlots = generateSlotsForDate(
      localDate,
      dayAvailability,

      availability.slotDurationMinutes ?? 60,

      availability.bufferMinutes ?? 0,

      timezone,
      now,
    );

    slots.push(...generatedSlots);
  }

  if (slots.length === 0) {
    return [];
  }

  const appointmentQuery: any = {
    businessId: business._id,

    status: {
      $in: ["scheduled", "confirmed"],
    },

    scheduledFor: {
      $in: slots.map((slot) => new Date(slot.scheduledFor)),
    },
  };

  if (excludeAppointmentId) {
    appointmentQuery._id = {
      $ne: excludeAppointmentId,
    };
  }

  const existingAppointments = await Appointment.find(appointmentQuery)
    .select("scheduledFor")
    .lean();

  const bookedTimes = new Set(
    existingAppointments.map((appointment) =>
      new Date(appointment.scheduledFor).getTime(),
    ),
  );

  return slots.filter(
    (slot) => !bookedTimes.has(new Date(slot.scheduledFor).getTime()),
  );
}
