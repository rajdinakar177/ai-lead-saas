import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AISettingsForm } from "@/components/dashboard/settings/ai-settings-form";
import { requireBusiness } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AISettingsPage() {
  const business = await requireBusiness();

  return (
    <div>
      <DashboardHeader
        title="AI Settings"
        description="Customize how your AI assistant talks to and qualifies customers."
      />

      <div className="mt-8 max-w-4xl">
        <div className="mb-5">
          <p className="text-sm font-medium uppercase tracking-wider text-blue-400">
            AI Configuration
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">AI Assistant Settings</h2>

          <p className="mt-1 text-sm text-zinc-600">
            Configure your services, service areas, conversation style and lead qualification
            requirements.
          </p>
        </div>

        <AISettingsForm
          initialSettings={{
            businessDescription: business.aiSettings?.businessDescription ?? "",

            services: business.aiSettings?.services ?? [],

            serviceAreas: business.aiSettings?.serviceAreas ?? [],

            welcomeMessage: business.aiSettings?.welcomeMessage ?? "",

            tone: business.aiSettings?.tone ?? "friendly",

            qualificationFields: business.aiSettings?.qualificationFields ?? [
              "name",
              "phone",
              "service",
              "location",
              "urgency",
              "timeline",
            ],

            additionalInstructions: business.aiSettings?.additionalInstructions ?? "",
          }}
        />
      </div>
    </div>
  );
}
