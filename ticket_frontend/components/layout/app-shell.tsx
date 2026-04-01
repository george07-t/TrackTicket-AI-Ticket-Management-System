"use client";

import { useEffect } from "react";

import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { Role } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

export function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const { hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="min-h-screen bg-[var(--surface)] lg:flex">
      <Sidebar role={role} />
      <div className="flex-1">
        <Navbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
