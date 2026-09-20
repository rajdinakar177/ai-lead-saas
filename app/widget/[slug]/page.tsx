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

export default async function WidgetPage({ params }: PageProps) {
  const { slug } = await params;

  await connectDB();

  const business = await Business.findOne({
    slug: slug.toLowerCase(),
    emailVerified: true,
  }).lean();

  if (!business) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <DemoChat businessSlug={business.slug} businessName={business.name} compact />
    </main>
  );
}
