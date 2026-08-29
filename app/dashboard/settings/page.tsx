import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BusinessSettingsForm } from "@/components/dashboard/business-settings-form";
import { requireBusiness } from "@/lib/auth";
import { PublicLeadLink } from "@/components/dashboard/public-lead-link";
import { EmbedCode } from "@/components/dashboard/embed-code";
import { AISettingsForm } from "@/components/dashboard/ai-settings-form";
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const business =
    await requireBusiness();

  return (
    <div>
      <DashboardHeader
        title="Settings"
        description="Manage your business profile and account information."
      />

      <div className="mt-8 mb-5 max-w-4xl">
        <div className="mb-5">
          <h2 className="font-semibold text-white">
            Business Profile
          </h2>

          <p className="mt-1 text-sm text-zinc-600">
            This information will be used across your LeadFlow AI workspace.
          </p>
        </div>

        <BusinessSettingsForm
          business={{
            name: business.name,
            industry: business.industry,
            email: business.email,
            phone:
              business.phone ?? "",
          }}
        />
      </div>
      <div>
        <div className="mb-5">
          <p className="text-sm font-medium uppercase tracking-wider text-blue-400">
            AI Configuration
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            AI Assistant Settings
          </h2>

          <p className="mt-1 text-sm text-zinc-600">
            Customize how your AI assistant talks to and qualifies customers.
          </p>
        </div>

        <AISettingsForm
          initialSettings={{
            businessDescription:
              business.aiSettings?.businessDescription ?? "",

            services:
              business.aiSettings?.services ?? [],

            serviceAreas:
              business.aiSettings?.serviceAreas ?? [],

            welcomeMessage:
              business.aiSettings?.welcomeMessage ?? "",

            tone:
              business.aiSettings?.tone ?? "friendly",

            qualificationFields:
              business.aiSettings?.qualificationFields ?? [
                "name",
                "phone",
                "service",
                "location",
                "urgency",
                "timeline",
              ],

            additionalInstructions:
              business.aiSettings?.additionalInstructions ?? "",
          }}
        />
      </div>
      <div className="mt-8 ">
        {business.slug && (
          <>
            <PublicLeadLink
              slug={business.slug}
            />
            <br></br>
            <EmbedCode
              slug={business.slug}
            />
          </>
        )}
      </div>
    </div>
  );
}