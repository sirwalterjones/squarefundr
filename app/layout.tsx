import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { ClientLayout } from "./client-layout";
import { Roboto } from "next/font/google";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "SquareFundr",
  description:
    "Create engaging fundraising campaigns with interactive square grids. Supporters can select and purchase squares on your images to help reach your goals.",
  openGraph: {
    title: "SquareFundr",
    description:
      "Create engaging fundraising campaigns with interactive square grids. Supporters can select and purchase squares on your images to help reach your goals.",
    images: [
      {
        url: "/images/baseball.jpg",
        width: 800,
        height: 600,
        alt: "Baseball Team Championship Fund",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SquareFundr",
    description:
      "Create engaging fundraising campaigns with interactive square grids.",
    images: ["/images/baseball.jpg"],
  },
};

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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
