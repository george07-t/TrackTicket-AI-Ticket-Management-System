"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-7 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <Link href="/" className="inline-flex text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            TrackTicket
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)]"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        </div>
        <h1 className="font-[var(--font-display)] text-3xl text-[var(--ink)]">{title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>
        <div className="mt-5">{children}</div>
        {footer ? <div className="mt-5 text-sm text-[var(--muted)]">{footer}</div> : null}
      </section>
    </main>
  );
}
