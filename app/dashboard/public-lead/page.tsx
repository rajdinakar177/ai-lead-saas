import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PublicLeadLink } from "@/components/dashboard/public-lead-link";
import { EmbedCode } from "@/components/dashboard/settings/embed-code";

import { requireBusiness } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PublicLeadPage() {
  const business = await requireBusiness();

  return (
    <div>
      <DashboardHeader
        title="Public Lead Page"
        description="Share your public lead page or add it to your business website."
      />

      <div className="mt-8 max-w-8xl">
        {business.slug ? (
          <>
            <PublicLeadLink slug={business.slug} />

            <div className="mt-5">
              <EmbedCode slug={business.slug} />
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">
              Your business does not have a public lead page yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}