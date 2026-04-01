import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const styles: Record<string, string> = {
    primary: "bg-[var(--brand)] text-white hover:opacity-90",
    secondary: "bg-white text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper)]",
    danger: "bg-[var(--danger)] text-white hover:opacity-90",
  };

  return (
    <button
      {...props}
      className={`h-10 rounded-md px-4 text-sm font-semibold transition ${styles[variant]} ${className}`}
    />
  );
}
