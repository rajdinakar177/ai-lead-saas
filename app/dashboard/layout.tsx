import { redirect } from "next/navigation";

import { Sidebar } from "@/components/dashboard/sidebar";
import { requireBusiness } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const business = await requireBusiness();

  const subscriptionStatus =
    business.subscription?.status ?? "none";

  const hasDashboardAccess =
    subscriptionStatus === "active" ||
    subscriptionStatus === "trialing";

  if (!hasDashboardAccess) {
    redirect("/billing/subscribe");
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Sidebar />

      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto max-w-[1500px] p-4 sm:p-8 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}