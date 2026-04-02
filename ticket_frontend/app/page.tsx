import Link from "next/link";
import { ArrowRight, BadgeCheck, LayoutDashboard, Shield, Users } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--surface)]">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:px-10">
        <div className="fade-in">
          <p className="inline-flex items-center rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            TrackTicket Platform
          </p>
          <h1 className="mt-5 font-[var(--font-display)] text-4xl leading-tight text-[var(--ink)] sm:text-5xl lg:text-6xl">
            Support Operations,
            <br />
            Done Right.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            A clean and role-based ticketing system for customers, agents, and admins with strong workflow controls and clear operational visibility.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--brand)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
            >
              Login
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register?role=customer"
              className="inline-flex h-11 items-center rounded-lg border border-[var(--line)] bg-white px-6 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper)]"
            >
              Sign Up as Customer
            </Link>
            <Link
              href="/register?role=agent"
              className="inline-flex h-11 items-center rounded-lg border border-[var(--line)] bg-white px-6 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper)]"
            >
              Sign Up as Agent
            </Link>
          </div>

          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--line)] bg-white/90 p-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"><LayoutDashboard className="h-3.5 w-3.5" /> Structured Flow</p>
              <p className="mt-1 text-sm font-medium text-[var(--ink)]">Clear ticket lifecycle</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-white/90 p-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"><Users className="h-3.5 w-3.5" /> Role Based</p>
              <p className="mt-1 text-sm font-medium text-[var(--ink)]">Admin, Agent, Customer</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-white/90 p-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"><Shield className="h-3.5 w-3.5" /> Audit Trail</p>
              <p className="mt-1 text-sm font-medium text-[var(--ink)]">Full activity timeline</p>
            </div>
          </div>
        </div>

        <div className="fade-in rounded-3xl border border-[var(--line)] bg-white p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-[var(--font-display)] text-2xl text-[var(--ink)]">Get Started</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]"><BadgeCheck className="h-3.5 w-3.5" /> Ready</span>
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="group flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-4 transition hover:border-[var(--brand)] hover:bg-[var(--paper)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Login to Existing Account</p>
                <p className="text-xs text-[var(--muted)]">Continue to your dashboard by role</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--brand)] transition group-hover:translate-x-1" />
            </Link>

            <Link
              href="/register?role=customer"
              className="group flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-4 transition hover:border-[var(--brand)] hover:bg-[var(--paper)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Sign Up as Customer</p>
                <p className="text-xs text-[var(--muted)]">Create and track your support tickets</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--brand)] transition group-hover:translate-x-1" />
            </Link>

            <Link
              href="/register?role=agent"
              className="group flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-4 transition hover:border-[var(--brand)] hover:bg-[var(--paper)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Sign Up as Agent</p>
                <p className="text-xs text-[var(--muted)]">Manage assigned tickets and replies</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--brand)] transition group-hover:translate-x-1" />
            </Link>

            <Link
              href="/forgot-password"
              className="group flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-4 transition hover:border-[var(--brand)] hover:bg-[var(--paper)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Reset Password</p>
                <p className="text-xs text-[var(--muted)]">Recover account with OTP verification</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--brand)] transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
