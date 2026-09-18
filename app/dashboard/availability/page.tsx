import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AvailabilitySettingsForm } from "@/components/dashboard/settings/availability-settings-form";
import { requireBusiness } from "@/lib/auth";

export const dynamic = "force-dynamic";
type AvailabilityDay = {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};
export default async function AvailabilityPage() {
  const business = await requireBusiness();

  return (
    <div>
      <DashboardHeader
        title="Availability"
        description="Configure when customers can book appointments."
      />

      <div className="mt-8 max-w-4xl">
        <div className="mb-5">
          <p className="text-sm font-medium uppercase tracking-wider text-blue-400">
            Scheduling
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Business Availability
          </h2>

          <p className="mt-1 text-sm text-zinc-600">
            Set your working days, business hours,
            appointment duration, and booking buffer.
          </p>
        </div>

        <AvailabilitySettingsForm
          initialAvailability={{
            slotDurationMinutes:
              business.availability?.slotDurationMinutes ?? 60,

            bufferMinutes:
              business.availability?.bufferMinutes ?? 0,

            days:
              business.availability?.days?.map((item: AvailabilityDay) => ({
                day: item.day,
                enabled: item.enabled,
                startTime: item.startTime,
                endTime: item.endTime,
              })) ?? [],
          }}
        />
      </div>
    </div>
  );
}