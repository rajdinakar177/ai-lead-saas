import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BusinessSettingsForm } from "@/components/dashboard/settings/business-settings-form";
import { SmsNumberSettings } from "@/components/dashboard/settings/sms-number-settings";

import { requireBusiness } from "@/lib/auth";
import { smsSetupView } from "@/lib/sms/number-setup";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const business = await requireBusiness();

  return (
    <div>
      <DashboardHeader
        title="Business Settings"
        description="Manage your business profile and account information."
      />

      <div className="mb-8 mt-8 max-w-4xl">
        <BusinessSettingsForm
          business={{
            name: business.name,
            industry: business.industry,
            email: business.email,
            phone: business.phone ?? "",
          }}
        />

        <SmsNumberSettings setup={smsSetupView(business)} />
      </div>
    </div>
  );
}
