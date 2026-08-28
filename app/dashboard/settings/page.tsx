import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BusinessSettingsForm } from "@/components/dashboard/business-settings-form";
import { requireBusiness } from "@/lib/auth";
import { PublicLeadLink } from "@/components/dashboard/public-lead-link";
import { EmbedCode } from "@/components/dashboard/embed-code";
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

      <div className="mt-8 max-w-4xl">
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
      {business.slug && (
        <>
          <PublicLeadLink
            slug={business.slug}
          />

          <EmbedCode
            slug={business.slug}
          />
        </>
      )}

    </div>
  );
}