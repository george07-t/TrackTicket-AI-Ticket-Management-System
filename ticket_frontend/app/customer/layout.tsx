"use client";

import { AppShell } from "@/components/layout/app-shell";
import { RoleGuard } from "@/components/layout/role-guard";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowed={["customer"]}>
      <AppShell role="customer">{children}</AppShell>
    </RoleGuard>
  );
}
