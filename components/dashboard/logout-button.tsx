"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function logout() {
    try {
      setLoading(true);

      await fetch("/api/auth/logout", {
        method: "POST",
      });

      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
    >
      <LogOut size={18} />

      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
