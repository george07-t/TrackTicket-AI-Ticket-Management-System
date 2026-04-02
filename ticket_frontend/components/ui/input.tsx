import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`focus-ring h-11 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] outline-none ring-0 placeholder:text-slate-400 ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none ring-0 placeholder:text-slate-400 ${props.className ?? ""}`}
    />
  );
}
