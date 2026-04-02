"use client";

import { FormEvent, useEffect, useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getApiErrorMessage } from "@/lib/api";
import { getRolePath } from "@/lib/auth";
import { Role } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrate, hydrated, user } = useAuthStore();

  const initialRole = searchParams.get("role") === "agent" ? "agent" : "customer";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Extract<Role, "agent" | "customer">>(initialRole);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && user) {
      router.replace(getRolePath(user.role));
    }
  }, [hydrated, user, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = { full_name: fullName, email, phone, password, role };

      await api.post("/auth/register", payload);
      toast.success("Account created. Verify your email OTP to continue.");
      router.push(`/verify-email?email=${encodeURIComponent(email)}&role=${role}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Registration failed. Try another email."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create Account"
      subtitle="Use your core identity details to create account"
      footer={
        <>
          Already have an account? <Link href="/login" className="font-semibold text-[var(--brand)] hover:underline">Login</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="fade-in space-y-4">
        <label className="block text-sm font-medium text-[var(--muted)]">
          Role
          <select
            className="focus-ring mt-1 h-11 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]"
            value={role}
            onChange={(e) => setRole(e.target.value as Extract<Role, "agent" | "customer">)}
          >
            <option value="customer">Customer</option>
            <option value="agent">Agent</option>
          </select>
        </label>
        <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input placeholder="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Registering..." : "Register"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Loading...</main>}>
      <RegisterForm />
    </Suspense>
  );
}
