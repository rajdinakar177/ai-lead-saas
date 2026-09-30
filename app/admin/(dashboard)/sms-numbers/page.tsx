import { requireAdmin } from "@/lib/admin-auth";
import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { SmsNumberActions } from "@/components/admin/sms-number-actions";

export const dynamic = "force-dynamic";

export default async function SmsNumbersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  await connectDB();
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  const filter = {
    $or: [
      {
        twilioSmsStatus: {
          $in: ["requested", "provisioning", "needs_review", "registration_pending", "ready"],
        },
      },
      { twilioPhoneNumber: { $type: "string" } },
    ],
  };
  const businesses = await Business.find(filter)
    .select(
      "name email country subscription twilioPhoneNumber twilioNumberSid twilioSmsStatus twilioSetup updatedAt",
    )
    .sort({ "twilioSetup.requestedAt": -1, _id: 1 })
    .skip((page - 1) * 25)
    .limit(26)
    .lean();
  return (
    <div>
      <h1 className="text-3xl font-semibold">Business SMS numbers</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
        Fulfill Pro setup requests. Purchase or assign a number, complete the customer's messaging
        registration in Twilio Console, then activate SMS. Numbers remain assigned when
        subscriptions change; cancellation does not release them automatically.
      </p>
      {!businesses.length && (
        <p className="mt-8 text-zinc-400">No SMS setup requests on this page.</p>
      )}
      <div className="mt-6 space-y-4">
        {businesses.slice(0, 25).map((business) => (
          <section
            key={business._id.toString()}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <h2 className="text-lg font-semibold">{business.name}</h2>
            <p className="mt-1 text-sm text-zinc-400">{business.email}</p>
            <p className="mt-2 text-sm text-violet-300">
              {business.twilioSmsStatus ?? "unconfigured"} · Area code:{" "}
              {business.twilioSetup?.areaCode ?? "not requested"}
            </p>
            <p className="mt-2 font-mono text-sm">
              {business.twilioPhoneNumber ?? "No number assigned"}
            </p>
            <SmsNumberActions
              businessId={business._id.toString()}
              status={business.twilioSmsStatus ?? "unconfigured"}
              numberSid={business.twilioNumberSid ?? null}
              paidPro={
                (business.country ?? "US") === "US" &&
                business.subscription?.plan === "pro" &&
                business.subscription?.status === "active"
              }
            />
          </section>
        ))}
      </div>
      <nav aria-label="Pagination" className="mt-6 flex gap-4 text-sm text-violet-300">
        {page > 1 && <a href={`?page=${page - 1}`}>Previous</a>}
        {businesses.length > 25 && <a href={`?page=${page + 1}`}>Next</a>}
      </nav>
    </div>
  );
}
