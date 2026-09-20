import { getGoogleCalendarClient } from "@/lib/google-calendar/client";

type DeleteAppointmentGoogleEventParams = {
  businessId: string;

  eventId: string;

  calendarId?: string | null;
};

export async function deleteAppointmentGoogleEvent({
  businessId,
  eventId,
  calendarId,
}: DeleteAppointmentGoogleEventParams) {
  const googleClient = await getGoogleCalendarClient({
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

  const { calendar, calendarId: connectedCalendarId } = googleClient;

  /*
   * Prefer the calendar stored on the
   * appointment because that is where
   * the event was originally created.
   */
  const targetCalendarId = calendarId || connectedCalendarId || "primary";

  await calendar.events.delete({
    calendarId: targetCalendarId,

    eventId,
  });

  return {
    deleted: true,
    calendarId: targetCalendarId,
  };
}
