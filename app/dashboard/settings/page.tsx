import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BusinessSettingsForm } from "@/components/dashboard/settings/business-settings-form";
import { PublicLeadLink } from "@/components/dashboard/settings/public-lead-link";
import { EmbedCode } from "@/components/dashboard/settings/embed-code";
import { GoogleCalendarSettings } from "@/components/dashboard/settings/google-calendar-settings";

import { requireBusiness } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";

import { GoogleCalendarIntegration } from "@/models/GoogleCalendarIntegration";

export const dynamic =
  "force-dynamic";

export default async function SettingsPage() {
  const business =
    await requireBusiness();

  await connectDB();

  /*
   * Only fetch safe fields needed by
   * the UI.
   *
   * Never send OAuth access/refresh
   * tokens to the Client Component.
   */
  const googleIntegration =
    await GoogleCalendarIntegration.findOne({
      businessId: business._id,
    })
      .select(
        "connected googleEmail calendarId"
      )
      .lean();

  const googleCalendar = googleIntegration
    ? {
        connected:
          googleIntegration.connected ===
          true,

        googleEmail:
          googleIntegration.googleEmail ??
          null,

        calendarId:
          googleIntegration.calendarId ||
          "primary",
      }
    : null;

  return (
    <div>
      <DashboardHeader
        title="Settings"
        description="Manage your business profile, integrations, and account information."
      />

      {/* BUSINESS PROFILE */}

      <div className="mt-8 mb-8 max-w-4xl">
        <div className="mb-5">
          <h2 className="font-semibold text-white">
            Business Profile
          </h2>

          <p className="mt-1 text-sm text-zinc-600">
            This information will be used
            across your Leadquivo workspace.
          </p>
        </div>

        <BusinessSettingsForm
          business={{
            name: business.name,
            industry: business.industry,
            email: business.email,
            phone: business.phone ?? "",
          }}
        />
      </div>

      {/* INTEGRATIONS */}

      <div className="mt-8 max-w-4xl">
        <div className="mb-5">
          <h2 className="font-semibold text-white">
            Integrations
          </h2>

          <p className="mt-1 text-sm text-zinc-600">
            Connect Leadquivo with the tools
            your business uses.
          </p>
        </div>

        <GoogleCalendarSettings
          integration={googleCalendar}
        />
      </div>

      {/* PUBLIC LEAD PAGE */}

      <div className="mt-8 max-w-4xl">
        {business.slug && (
          <>
            <PublicLeadLink
              slug={business.slug}
            />

            <div className="mt-5">
              <EmbedCode
                slug={business.slug}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}