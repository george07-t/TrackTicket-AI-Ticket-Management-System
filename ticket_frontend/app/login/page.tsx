"use client";

import { FormEvent, useEffect, useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getApiErrorMessage } from "@/lib/api";
import { getRolePath } from "@/lib/auth";
import { AuthResponse } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, hydrate, hydrated, user } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const qEmail = searchParams.get("email");
    if (qEmail) {
      setEmail(qEmail);
    }
  }, [searchParams]);

  useEffect(() => {
    if (hydrated && user) {
      router.replace(getRolePath(user.role));
    }
  }, [hydrated, user, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
      login(data.access_token, data.user);
      toast.success("Login successful");
      router.push(getRolePath(data.user.role));
    } catch (error) {
      const message = getApiErrorMessage(error, "Login failed. Check your credentials.");
      if (message.toLowerCase().includes("email not verified")) {
        toast.error("Please verify your email first");
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const roleHint = searchParams.get("role");
  const subtitle = roleHint === "agent"
    ? "Sign in as an agent"
    : roleHint === "customer"
      ? "Sign in as a customer"
      : roleHint === "admin"
        ? "Sign in as an admin"
        : "Access your workspace dashboard with email and password";

  return (
    <AuthShell
      title="Sign In"
      subtitle={subtitle}
      footer={
        <>
          New here? <Link href="/register?role=customer" className="font-semibold text-[var(--brand)] hover:underline">Create account</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="fade-in space-y-4">
        <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="relative">
          <Input
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={() => setShowPassword((s) => !s)}
            tabIndex={-1}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
        <p className="text-xs text-[var(--muted)]">Use the same email/password used during registration.</p>
        <div className="text-right text-sm">
          <Link href="/forgot-password" className="font-medium text-[var(--brand)] hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Loading...</main>}>
      <LoginForm />
    </Suspense>
  );
}
