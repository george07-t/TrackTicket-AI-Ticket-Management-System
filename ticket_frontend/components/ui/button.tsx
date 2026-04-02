import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const styles: Record<string, string> = {
    primary: "border border-[var(--brand)] bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]",
    secondary: "border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[var(--paper)]",
    danger: "border border-[var(--danger)] bg-[var(--danger)] text-white hover:opacity-90",
  };

  return (
    <button
      {...props}
      className={`focus-ring h-10 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
    />
  );
}
