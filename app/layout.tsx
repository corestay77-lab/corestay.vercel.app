import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import CoreStaySidebar from "@/components/CoreStaySidebar";
import PremiumReportBanner from "@/components/PremiumReportBanner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CoreStay Advisory",
  description: "Hospitality Business Transformation & Advisory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <CoreStaySidebar />
        {children}
        <PremiumReportBanner />
      </body>
    </html>
  );
}
