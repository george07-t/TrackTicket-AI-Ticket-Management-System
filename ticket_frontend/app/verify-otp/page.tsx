"use client";

import { FormEvent, useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import { AuthShell } from "@/components/auth/auth-shell";
import { OtpInput } from "@/components/tickets/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getApiErrorMessage } from "@/lib/api";

function VerifyOtpForm() {
  const params = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState(params.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [attemptHint, setAttemptHint] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setAttemptHint(null);

    try {
      const response = await api.post<{ reset_token: string }>("/auth/verify-reset-otp", {
        email,
        otp,
      });
      setResetToken(response.data.reset_token);
      toast.success("OTP verified. Set your new password.");
    } catch (error) {
      const message = getApiErrorMessage(error, "OTP verification failed");
      if (message.toLowerCase().includes("attempt")) {
        setAttemptHint(message);
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        reset_token: resetToken,
        new_password: newPassword,
      });
      toast.success("Password reset successful. Please log in.");
      router.push("/login");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to reset password"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onResendOtp() {
    setIsResending(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("A new OTP has been sent.");
      setOtp("");
      setAttemptHint(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to resend OTP"));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell
      title="Verify OTP"
      subtitle={resetToken ? "Create your new password" : "Enter OTP to receive secure reset token"}
      footer={<Link href="/login" className="font-semibold text-[var(--brand)] hover:underline">Back to login</Link>}
    >
      {!resetToken ? (
        <form onSubmit={onVerifyOtp} className="fade-in space-y-4">
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="space-y-2">
            <p className="text-sm font-medium">6-digit OTP</p>
            <OtpInput value={otp} onChange={setOtp} />
          </div>
          {attemptHint ? <p className="text-sm text-amber-700">{attemptHint}</p> : null}
          <Button type="submit" className="w-full" disabled={isSubmitting || otp.length !== 6}>
            {isSubmitting ? "Verifying..." : "Verify OTP"}
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={onResendOtp} disabled={isResending}>
            {isResending ? "Sending..." : "Resend OTP"}
          </Button>
        </form>
      ) : (
        <form onSubmit={onResetPassword} className="fade-in space-y-4">
          <Input
            placeholder="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
          <Input
            placeholder="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Set New Password"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Loading...</main>}>
      <VerifyOtpForm />
    </Suspense>
  );
}
