import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { LayoutShell } from "@/components/layout-shell";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "FixMate — Home Appliance Repair",
  description:
    "Book verified technicians for AC, refrigerator, washing machine, microwave and dishwasher repair. Upfront inspection fees and itemised quotes before any work starts.",
};

export const viewport: Viewport = {
  themeColor: "#6e42e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen font-sans">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
