"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <header className="flex items-center justify-between border-b border-[var(--line)] bg-white px-4 py-4 sm:px-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Ticket Workspace</p>
        <h1 className="text-lg font-semibold text-[var(--ink)]">{user?.full_name ?? "Workspace"}</h1>
      </div>
      <Button
        variant="secondary"
        className="inline-flex items-center gap-2"
        onClick={() => {
          logout();
          router.push("/login");
        }}
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </header>
  );
}
