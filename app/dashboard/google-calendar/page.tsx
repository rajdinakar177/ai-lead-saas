import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { GoogleCalendarSettings } from "@/components/dashboard/google-calendar-settings";

import { requireBusiness } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { hasSubscriptionFeature } from "@/lib/subscription-access";

import { GoogleCalendarIntegration } from "@/models/GoogleCalendarIntegration";

export const dynamic = "force-dynamic";

export default async function GoogleCalendarPage() {
  const business = await requireBusiness();

  await connectDB();

  /*
   * Only fetch safe fields needed by the UI.
   *
   * Never send OAuth access/refresh
   * tokens to the Client Component.
   */
  const googleIntegration = await GoogleCalendarIntegration.findOne({
    businessId: business._id,
  })
    .select("connected googleEmail calendarId")
    .lean();

  const googleCalendar = googleIntegration
    ? {
        connected: googleIntegration.connected === true,
        googleEmail: googleIntegration.googleEmail ?? null,
        calendarId: googleIntegration.calendarId || "primary",
      }
    : null;

  const googleCalendarEnabled = hasSubscriptionFeature(
    business.subscription,
    "googleCalendar",
  );

  return (
    <div>
      <DashboardHeader
        title="Google Calendar"
        description="Connect your business calendar and automatically sync appointments."
      />

      <div className="mt-8 max-w-4xl">
        <GoogleCalendarSettings
          integration={googleCalendar}
          enabled={googleCalendarEnabled}
        />
      </div>
    </div>
  );
}