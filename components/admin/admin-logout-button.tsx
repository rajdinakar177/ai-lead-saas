"use client";

import { useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/admin/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to logout.");
      }

      router.push("/admin/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <LoaderCircle size={18} className="animate-spin" /> : <LogOut size={18} />}

      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}