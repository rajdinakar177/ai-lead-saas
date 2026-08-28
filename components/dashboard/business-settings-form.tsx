"use client";

import {
  FormEvent,
  useState,
} from "react";
import {
  CheckCircle2,
  LoaderCircle,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  business: {
    name: string;
    industry: string;
    email: string;
    phone: string;
  };
};

export function BusinessSettingsForm({
  business,
}: Props) {
  const router = useRouter();

  const [name, setName] =
    useState(business.name);

  const [industry, setIndustry] =
    useState(business.industry);

  const [email, setEmail] =
    useState(business.email);

  const [phone, setPhone] =
    useState(business.phone);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(
        "/api/business",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name,
            industry,
            email,
            phone,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to update settings."
        );
      }

      setSuccess(true);

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update settings."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
    >
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 size={17} />
          Business settings updated.
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Business Name"
          value={name}
          onChange={setName}
          placeholder="ABC Home Services"
          required
        />

        <Field
          label="Industry"
          value={industry}
          onChange={setIndustry}
          placeholder="Roofing & HVAC"
          required
        />

        <Field
          label="Business Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="hello@example.com"
          required
        />

        <Field
          label="Phone"
          type="tel"
          value={phone}
          onChange={setPhone}
          placeholder="+1 555 123 4567"
        />
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <LoaderCircle
                size={17}
                className="animate-spin"
              />

              Saving...
            </>
          ) : (
            <>
              <Save size={17} />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
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
      <label className="text-sm text-zinc-400">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-500/50"
      />
    </div>
  );
}