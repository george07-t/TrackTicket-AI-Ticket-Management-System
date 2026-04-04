"use client";

import { ClipboardEvent, useMemo } from "react";

export function OtpInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const digits = useMemo(() => Array.from({ length: 6 }, (_, i) => value[i] ?? ""), [value]);

  function setDigit(index: number, nextChar: string) {
    const clean = nextChar.replace(/\D/g, "").slice(-1);
    const next = digits.slice();
    next[index] = clean;
    const joined = next.join("").slice(0, 6);
    onChange(joined);

    if (clean && index < 5) {
      focusBox(index + 1);
    }
  }

  function handleKeyDown(index: number, key: string) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      focusBox(index - 1);
    }
  }

  // Distribute pasted digits across the boxes starting at `index`.
  // Works whether the user pastes the full code from box 0 or mid-way.
  function handlePaste(index: number, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = digits.slice();
    for (let i = 0; i < pasted.length && index + i < 6; i++) {
      next[index + i] = pasted[i];
    }
    onChange(next.join("").slice(0, 6));

    // Focus the box right after the last pasted digit (or the last box).
    const lastFilled = Math.min(index + pasted.length, 5);
    focusBox(lastFilled);
  }

  function focusBox(i: number) {
    (document.getElementById(`otp-${i}`) as HTMLInputElement | null)?.focus();
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
          onPaste={(e) => handlePaste(index, e)}
          className="h-11 w-11 rounded-md border border-[var(--line)] text-center text-lg font-semibold outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
