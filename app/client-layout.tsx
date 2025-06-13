"use client";

import Navbar from "@/components/Navbar";
import { TempoInit } from "./tempo-init";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TempoInit />
      <Navbar />
      <main className="min-h-screen">{children}</main>
    </>
  );
}
