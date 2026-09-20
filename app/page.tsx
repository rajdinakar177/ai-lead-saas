import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { Solutions } from "@/components/solutions";
import { Features } from "@/components/features";
import { Pricing } from "@/components/pricing";
import { FAQ } from "@/components/faq";
import { CTA } from "@/components/cta";
import { Footer } from "@/components/footer";
import { Reveal } from "@/components/shared/reveal";
export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <Reveal delay={0.1}>
          <Solutions />
        </Reveal>
        <Solutions />
        <Features />
        <Pricing />
        <FAQ />
        <CTA />
      </main>

      <Footer />
    </>
  );
}
