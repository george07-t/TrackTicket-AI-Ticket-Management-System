"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getApiErrorMessage } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("If that email exists, an OTP has been sent.");
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not request OTP"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Forgot Password"
      subtitle="We will send a 6-digit OTP to your email"
      footer={<Link href="/login" className="font-semibold text-[var(--brand)] hover:underline">Back to login</Link>}
    >
      <form onSubmit={onSubmit} className="fade-in space-y-4">
        <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send OTP"}
        </Button>
      </form>
    </AuthShell>
  );
}
