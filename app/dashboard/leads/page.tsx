import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";
import { Lead } from "@/models/Lead";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatusBadge } from "@/components/dashboard/status-badge";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  await connectDB();

const business =
  await requireBusiness();

  if (!business) {
    return (
      <div>
        Business not found.
      </div>
    );
  }

  const leads =
    await Lead.find({
      businessId: business._id,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

  return (
    <div>
      <DashboardHeader
        title="Leads"
        description="Manage and review every lead captured by your AI assistant."
      />

      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div>
            <h2 className="font-semibold">
              All Leads
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              {leads.length} total leads
            </p>
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="p-12 text-center text-zinc-600">
            No leads found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-600">
                  <th className="px-6 py-4">
                    Name
                  </th>

                  <th className="px-6 py-4">
                    Contact
                  </th>

                  <th className="px-6 py-4">
                    Industry
                  </th>

                  <th className="px-6 py-4">
                    Service
                  </th>

                  <th className="px-6 py-4">
                    Urgency
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4">
                    Created
                  </th>
                </tr>
              </thead>

             <tbody>
  {leads.map((lead) => (
    <tr
      key={lead._id.toString()}
      className="border-b border-white/5 transition hover:bg-white/[0.02]"
    >
      <td className="px-6 py-5">
        <Link
          href={`/dashboard/leads/${lead._id.toString()}`}
          className="font-medium text-white transition hover:text-blue-400"
        >
          {lead.name || "Anonymous"}
        </Link>
      </td>

      <td className="px-6 py-5">
        <p className="text-sm text-zinc-400">
          {lead.phone || "—"}
        </p>

        {lead.email && (
          <p className="mt-1 text-xs text-zinc-600">
            {lead.email}
          </p>
        )}
      </td>

      <td className="px-6 py-5 text-sm text-zinc-400">
        {lead.industry || "—"}
      </td>

      <td className="px-6 py-5 text-sm text-zinc-400">
        {lead.service || "—"}
      </td>

      <td className="px-6 py-5 text-sm text-zinc-400">
        {lead.urgency || "—"}
      </td>

      <td className="px-6 py-5">
        <StatusBadge status={lead.status} />
      </td>

      <td className="px-6 py-5 text-sm text-zinc-600">
        {new Date(lead.createdAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </td>
    </tr>
  ))}
</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}