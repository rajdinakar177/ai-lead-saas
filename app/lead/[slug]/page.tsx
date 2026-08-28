import {
  Building2,
  ShieldCheck,
} from "lucide-react";
import { notFound } from "next/navigation";

import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { DemoChat } from "@/components/demo/demo-chat";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PublicLeadPage({
  params,
}: PageProps) {
  const { slug } = await params;

  await connectDB();

  const business =
    await Business.findOne({
      slug: slug.toLowerCase(),
      emailVerified: true,
    }).lean();

  if (!business) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Building2 size={21} />
                </div>

                <div>
                  <h1 className="text-xl font-semibold text-white">
                    {business.name}
                  </h1>

                  <p className="mt-1 text-sm text-zinc-500">
                    {business.industry}
                  </p>
                </div>
              </div>

              <h2 className="mt-8 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                How can we help you today?
              </h2>

              <p className="mt-3 max-w-2xl text-zinc-500">
                Tell us what you need and our assistant will help gather the
                details and find the next step.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <ShieldCheck
                size={15}
                className="text-emerald-400"
              />

              Secure lead intake
            </div>
          </div>
        </div>

        <DemoChat
          businessSlug={business.slug}
          businessName={business.name}
        />
      </div>
    </main>
  );
}