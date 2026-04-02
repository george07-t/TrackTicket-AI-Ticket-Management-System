"use client";

import { useMemo } from "react";

export function OtpInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const digits = useMemo(() => Array.from({ length: 6 }, (_, i) => value[i] ?? ""), [value]);

  function setDigit(index: number, nextChar: string) {
    const clean = nextChar.replace(/\D/g, "").slice(-1);
    const next = digits.slice();
    next[index] = clean;
    const joined = next.join("").slice(0, 6);
    onChange(joined);

    if (clean && typeof document !== "undefined" && index < 5) {
      const element = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
      element?.focus();
    }
  }

  function handleKeyDown(index: number, key: string) {
    if (key === "Backspace" && !digits[index] && index > 0 && typeof document !== "undefined") {
      const prev = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
      prev?.focus();
    }
  }

  return (
    <div className="flex gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          id={`otp-${index}`}
          value={digit}
          maxLength={1}
          inputMode="numeric"
          onChange={(e) => setDigit(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e.key)}
          className="h-11 w-11 rounded-md border border-[var(--line)] text-center text-lg font-semibold outline-none focus:border-[var(--brand)]"
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
