import { getGoogleCalendarClient } from "@/lib/google-calendar/client";

type UpdateAppointmentGoogleEventParams = {
  businessId: string;

  eventId: string;

  calendarId?: string | null;

  appointmentId: string;

  businessName: string;

  timezone: string;

  slotDurationMinutes: number;

  scheduledFor: Date;

  customerName: string;

  customerPhone?: string | null;

  customerEmail?: string | null;

  service?: string | null;

  location?: string | null;

  urgency?: string | null;

  timeline?: string | null;
};

export async function updateAppointmentGoogleEvent({
  businessId,
  eventId,
  calendarId,
  appointmentId,
  businessName,
  timezone,
  slotDurationMinutes,
  scheduledFor,
  customerName,
  customerPhone,
  customerEmail,
  service,
  location,
  urgency,
  timeline,
}: UpdateAppointmentGoogleEventParams) {
  const googleClient =
    await getGoogleCalendarClient({
      businessId,
    });

  /*
   * Google Calendar may have been
   * disconnected after this appointment
   * was originally created.
   */
  if (!googleClient) {
    return null;
  }

  const {
    calendar,
    calendarId:
      connectedCalendarId,
  } = googleClient;

  /*
   * Prefer the calendar stored on the
   * appointment because that is where
   * the original event was created.
   */
  const targetCalendarId =
    calendarId ||
    connectedCalendarId ||
    "primary";

  const durationMinutes =
    slotDurationMinutes > 0
      ? slotDurationMinutes
      : 60;

  const start =
    new Date(scheduledFor);

  const end =
    new Date(
      start.getTime() +
        durationMinutes *
          60 *
          1000
    );

  const descriptionLines = [
    "Leadquivo Appointment",
    "",
    `Appointment ID: ${appointmentId}`,
    `Customer: ${customerName}`,
  ];

  if (customerPhone) {
    descriptionLines.push(
      `Phone: ${customerPhone}`
    );
  }

  if (customerEmail) {
    descriptionLines.push(
      `Email: ${customerEmail}`
    );
  }

  if (service) {
    descriptionLines.push(
      `Service: ${service}`
    );
  }

  if (location) {
    descriptionLines.push(
      `Location: ${location}`
    );
  }

  if (urgency) {
    descriptionLines.push(
      `Urgency: ${urgency}`
    );
  }

  if (timeline) {
    descriptionLines.push(
      `Timeline: ${timeline}`
    );
  }

  descriptionLines.push(
    "",
    `Created by Leadquivo for ${businessName}.`
  );

  const response =
    await calendar.events.update({
      calendarId:
        targetCalendarId,

      eventId,

      requestBody: {
        summary: service
          ? `${service} - ${customerName}`
          : `Service Appointment - ${customerName}`,

        description:
          descriptionLines.join("\n"),

        location:
          location || undefined,

        start: {
          dateTime:
            start.toISOString(),

          timeZone:
            timezone,
        },

        end: {
          dateTime:
            end.toISOString(),

          timeZone:
            timezone,
        },

        extendedProperties: {
          private: {
            leadquivoAppointmentId:
              appointmentId,

            leadquivoBusinessId:
              businessId,
          },
        },
      },
    });

  if (!response.data.id) {
    throw new Error(
      "Google Calendar did not return the updated event ID."
    );
  }

  return {
    eventId:
      response.data.id,

    calendarId:
      targetCalendarId,

    htmlLink:
      response.data.htmlLink ??
      null,
  };
}