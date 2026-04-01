"use client";

import { AppShell } from "@/components/layout/app-shell";
import { RoleGuard } from "@/components/layout/role-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowed={["admin"]}>
      <AppShell role="admin">{children}</AppShell>
    </RoleGuard>
  );
}
