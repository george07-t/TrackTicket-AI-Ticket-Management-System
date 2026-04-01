"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getRolePath } from "@/lib/auth";
import { AuthResponse } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
      login(data.access_token, data.user);
      router.push(getRolePath(data.user.role));
    } catch {
      setError("Login failed. Check your credentials.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4">
      <form onSubmit={onSubmit} className="fade-in w-full max-w-md space-y-4 rounded-2xl border border-[var(--line)] bg-white p-8">
        <h1 className="font-[var(--font-display)] text-3xl">Sign In</h1>
        <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <Button type="submit" className="w-full">
          Login
        </Button>
      </form>
    </main>
  );
}
