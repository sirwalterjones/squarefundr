import type { Metadata } from "next";
import { Nunito, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SquareFundr - Interactive Fundraising Made Easy",
  description: "Create engaging fundraising campaigns with interactive square grids. Upload an image, set your pricing, and let donors claim squares to support your cause.",
  keywords: "fundraising, donations, interactive, squares, campaigns, charity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} ${robotoMono.variable} antialiased min-h-screen bg-gray-50`}
      >
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
