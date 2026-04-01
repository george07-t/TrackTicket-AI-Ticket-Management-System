"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await api.post("/auth/register", { full_name: fullName, email, password });
      router.push("/login");
    } catch {
      setError("Registration failed. Try another email.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4">
      <form onSubmit={onSubmit} className="fade-in w-full max-w-md space-y-4 rounded-2xl border border-[var(--line)] bg-white p-8">
        <h1 className="font-[var(--font-display)] text-3xl">Create Account</h1>
        <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <Button type="submit" className="w-full">
          Register
        </Button>
      </form>
    </main>
  );
}
