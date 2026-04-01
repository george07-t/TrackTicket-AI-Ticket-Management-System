"use client";

import { AppShell } from "@/components/layout/app-shell";
import { RoleGuard } from "@/components/layout/role-guard";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowed={["agent"]}>
      <AppShell role="agent">{children}</AppShell>
    </RoleGuard>
  );
}
