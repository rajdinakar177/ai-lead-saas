import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <AdminSidebar />

      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto max-w-[1500px] p-4 sm:p-8 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
