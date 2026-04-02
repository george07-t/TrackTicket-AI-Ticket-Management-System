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
import { AuthResponse } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, hydrate, hydrated, user } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
