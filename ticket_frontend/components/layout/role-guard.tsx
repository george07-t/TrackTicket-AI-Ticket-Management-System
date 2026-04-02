"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getRolePath } from "@/lib/auth";
import { Role } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

export function RoleGuard({ allowed, children }: { allowed: Role[]; children: React.ReactNode }) {
  const router = useRouter();
  const { role, user, hydrated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!role) {
      router.replace("/login");
      return;
    }
    if (!allowed.includes(role)) {
      router.replace(getRolePath(role));
      return;
    }

    if (
      role === "agent"
      && user
      && (!user.expertise_tags?.length || user.max_active_tickets < 1)
      && window.location.pathname !== "/profile"
    ) {
      router.replace("/profile");
    }
  }, [allowed, role, user, hydrated, router]);

  if (!hydrated) return null;
  if (!role || !allowed.includes(role)) return null;
  return <>{children}</>;
}
