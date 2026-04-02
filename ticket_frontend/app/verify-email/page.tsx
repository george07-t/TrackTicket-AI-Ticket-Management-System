"use client";

import { FormEvent, useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { OtpInput } from "@/components/tickets/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getApiErrorMessage } from "@/lib/api";

function VerifyEmailForm() {
  const params = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState(params.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/auth/verify-email-otp", {
        email,
        otp,
      });
      toast.success("Email verified successfully. Please login.");
      router.push(`/login?email=${encodeURIComponent(email)}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Email verification failed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onResendOtp() {
    setIsResending(true);
    try {
      await api.post("/auth/resend-email-otp", { email });
      toast.success("Verification OTP sent");
      setOtp("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to resend OTP"));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell
      title="Verify Email"
      subtitle="Enter the OTP sent to your email to activate your account"
      footer={<Link href="/login" className="font-semibold text-[var(--brand)] hover:underline">Back to login</Link>}
    >
      <form onSubmit={onSubmit} className="fade-in space-y-4">
        <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="space-y-2">
          <p className="text-sm font-medium">6-digit OTP</p>
          <OtpInput value={otp} onChange={setOtp} />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || otp.length !== 6}>
          {isSubmitting ? "Verifying..." : "Verify Email"}
        </Button>
        <Button type="button" variant="secondary" className="w-full" onClick={onResendOtp} disabled={isResending}>
          {isResending ? "Sending..." : "Resend OTP"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Loading...</main>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
