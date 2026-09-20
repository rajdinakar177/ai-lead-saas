"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");

  const [industry, setIndustry] = useState("");

  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");

      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/auth/register", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name,
          industry,
          email,
          phone,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create account.");
      }

      router.push(`/verify-email/pending?email=${encodeURIComponent(email)}`);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to create account.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Field
        label="Business Name"
        value={name}
        onChange={setName}
        placeholder="ABC Roofing"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Industry"
          value={industry}
          onChange={setIndustry}
          placeholder="Roofing"
        />

        <Field
          label="Phone"
          value={phone}
          onChange={setPhone}
          placeholder="+1 555 123 4567"
          required={false}
        />
      </div>

      <Field
        label="Business Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="owner@example.com"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Minimum 8 characters"
        />

        <Field
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Repeat password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <LoaderCircle size={18} className="animate-spin" />
            Creating account...
          </>
        ) : (
          <>
            Create Account
            <UserPlus size={18} />
          </>
        )}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400">{label}</label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-500/50"
      />
    </div>
  );
}
