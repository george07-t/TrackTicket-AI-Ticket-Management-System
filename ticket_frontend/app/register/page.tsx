"use client";

import { FormEvent, useEffect, useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import type { Value as PhoneValue } from "react-phone-number-input";
import { PhoneField } from "@/components/ui/phone-field";

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
  const [phone, setPhone] = useState<PhoneValue | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      const payload: Record<string, unknown> = { full_name: fullName, email, phone: phone ?? "", password, role };
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
        <PhoneField value={phone} onChange={setPhone} />
        <div className="relative">
          <Input
            placeholder="Password (min 8 characters)"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={() => setShowPassword((s) => !s)}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>
        </div>
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
