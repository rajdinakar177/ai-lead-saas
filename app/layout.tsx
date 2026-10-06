import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// Geist, used for both headline and body text on the marketing site
// (see the `.landing` scope in globals.css) — weight carries the
// headline/body distinction instead of a second typeface.
const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LeadFlow AI — Turn More Leads Into Booked Jobs",
  description:
    "AI-powered lead capture, qualification, follow-up and appointment booking for local service businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}
