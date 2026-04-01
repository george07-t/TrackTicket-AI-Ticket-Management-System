"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getRolePath } from "@/lib/auth";
import { Role } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

export function RoleGuard({ allowed, children }: { allowed: Role[]; children: React.ReactNode }) {
  const router = useRouter();
  const { role, hydrated, hydrate } = useAuthStore();

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
    }
  }, [allowed, role, hydrated, router]);

  if (!hydrated) return null;
  if (!role || !allowed.includes(role)) return null;
  return <>{children}</>;
}
