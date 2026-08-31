import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BusinessSettingsForm } from "@/components/dashboard/settings/business-settings-form";
import { requireBusiness } from "@/lib/auth";
import { PublicLeadLink } from "@/components/dashboard/settings/public-lead-link";
import { EmbedCode } from "@/components/dashboard/settings/embed-code";
import { AISettingsForm } from "@/components/dashboard/settings/ai-settings-form";
import { AvailabilitySettingsForm } from "@/components/dashboard/settings/availability-settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const business = await requireBusiness();

  return (
    <div>
      <DashboardHeader
        title="Settings"
        description="Manage your business profile and account information."
      />

      {/* BUSINESS PROFILE */}

      <div className="mt-8 mb-8 max-w-4xl">
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
            phone: business.phone ?? "",
          }}
        />
      </div>

     
      {/* PUBLIC LEAD PAGE */}

      <div className="mt-8 max-w-4xl">
        {business.slug && (
          <>
            <PublicLeadLink slug={business.slug} />

            <div className="mt-5">
              <EmbedCode slug={business.slug} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}