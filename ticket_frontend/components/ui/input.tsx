import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] outline-none ring-0 focus:border-[var(--brand)] ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none ring-0 focus:border-[var(--brand)] ${props.className ?? ""}`}
    />
  );
}
