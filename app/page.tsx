import { CTA } from "@/components/cta";
import { FAQ } from "@/components/faq";
import { Features } from "@/components/features";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { Navbar } from "@/components/navbar";
import { Pricing } from "@/components/pricing";
import { Solutions } from "@/components/solutions";
import { Reveal } from "@/components/shared/reveal";

export default function Home() {
  return (
    <div className="landing">
      <Navbar />

      <main className="overflow-hidden">
        <Hero />

        <Reveal direction="up">
          <Solutions />
        </Reveal>

        <HowItWorks />

        <Features />

        <Pricing />

        <Reveal direction="up">
          <FAQ />
        </Reveal>

        <Reveal direction="up">
          <CTA />
        </Reveal>
      </main>

      <Footer />
    </div>
  );
}
