"use client";

import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Script from "next/script";
import { TempoInit } from "./tempo-init";

import { Roboto } from "next/font/google";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
});

// Note: metadata export is not supported in client components
// Move metadata to a separate server component if needed

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/siteicon.png" type="image/png" />
      </head>
      <Script src="https://api.tempo.new/proxy-asset?url=https://storage.googleapis.com/tempo-public-assets/error-handling.js" />
      <body
        className={`${roboto.variable} antialiased min-h-screen bg-gray-50 font-sans`}
      >
        <TempoInit />
        <Navbar />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
