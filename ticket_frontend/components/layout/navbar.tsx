"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <header className="flex items-center justify-between border-b border-[var(--line)] bg-white px-6 py-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">AI Ticket Management</p>
        <h1 className="text-lg font-semibold text-[var(--ink)]">{user?.full_name ?? "Workspace"}</h1>
      </div>
      <Button
        variant="secondary"
        onClick={() => {
          logout();
          router.push("/login");
        }}
      >
        Logout
      </Button>
    </header>
  );
}
