import { getGoogleCalendarClient } from "@/lib/google-calendar/client";

type CreateAppointmentGoogleEventParams = {
  businessId: string;

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

export async function createAppointmentGoogleEvent({
  businessId,
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
}: CreateAppointmentGoogleEventParams) {
  const googleClient =
    await getGoogleCalendarClient({
      businessId,
    });

  /*
   * Google Calendar is optional.
   * Businesses without a connected
   * calendar can still use Leadquivo.
   */
  if (!googleClient) {
    return null;
  }

  const {
    calendar,
    calendarId,
  } = googleClient;

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
    `Leadquivo Appointment`,
    ``,
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
    ``,
    `Created by Leadquivo for ${businessName}.`
  );

  const response =
    await calendar.events.insert({
      calendarId,

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

  const googleEventId =
    response.data.id;

  if (!googleEventId) {
    throw new Error(
      "Google Calendar did not return an event ID."
    );
  }

  return {
    eventId: googleEventId,

    calendarId,

    htmlLink:
      response.data.htmlLink ??
      null,
  };
}