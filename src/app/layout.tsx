import type { Metadata, Viewport } from "next";
import "./globals.css";
import { appUrl } from "@/lib/app-url";


export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "Gweru Urban Vocational Training Centre — Skills for today", template: "%s · GUVTC" },
  description: "Practical short courses in Gweru: dressmaking, beauty, computers, motor mechanics, catering and new AI courses. Apply online.",
  openGraph: { type: "website", siteName: "Gweru Urban Vocational Training Centre", locale: "en_ZW" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#102A43", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap"
        />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-gold focus:px-4 focus:py-2 focus:text-navy">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
