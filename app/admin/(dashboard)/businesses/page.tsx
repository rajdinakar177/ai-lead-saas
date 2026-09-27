import { Building2, CheckCircle2, Mail, XCircle } from "lucide-react";

import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import Link from "next/link";
export default async function AdminBusinessesPage() {
  await connectDB();

  const businesses = await Business.find({})
    .select("name email industry country emailVerified createdAt")
    .sort({
      createdAt: -1,
    })
    .lean();

  return (
    <>
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-blue-400">Customers</p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Businesses</h1>

        <p className="mt-2 text-zinc-500">View businesses registered on the platform.</p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        {businesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-zinc-500">
              <Building2 size={22} />
            </div>

            <h2 className="mt-4 font-medium">No businesses yet</h2>

            <p className="mt-1 text-sm text-zinc-500">Registered businesses will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="border-b border-white/10 bg-white/[0.02]">
                <tr className="text-xs uppercase tracking-wider text-zinc-600">
                  <th className="px-6 py-4 font-medium">Business</th>
                  <th className="px-6 py-4 font-medium">Industry</th>
                  <th className="px-6 py-4 font-medium">Country</th>
                  <th className="px-6 py-4 font-medium">Verification</th>
                  <th className="px-6 py-4 font-medium">Joined</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {businesses.map((business) => (
                  <tr key={business._id.toString()} className="transition hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          href={`/admin/businesses/${business._id.toString()}`}
                          className="font-medium text-white transition hover:text-blue-400"
                        >
                          {business.name}
                        </Link>

                        <div className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                          <Mail size={13} />
                          {business.email}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-zinc-400">{business.industry || "—"}</td>

                    <td className="px-6 py-4 text-sm text-zinc-400">{business.country || "—"}</td>

                    <td className="px-6 py-4">
                      {business.emailVerified ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                          <CheckCircle2 size={13} />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                          <XCircle size={13} />
                          Unverified
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {business.createdAt
                        ? new Date(business.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "UTC",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm text-zinc-600">
        {businesses.length.toLocaleString()} {businesses.length === 1 ? "business" : "businesses"}{" "}
        total
      </p>
    </>
  );
}
