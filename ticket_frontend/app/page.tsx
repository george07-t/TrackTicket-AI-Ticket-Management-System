import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--surface)] px-6 py-16">
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-[var(--brand-soft)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-[#cce7df] blur-3xl" />

      <section className="relative w-full max-w-3xl rounded-2xl border border-[var(--line)] bg-white p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">IT Magnet Screening Build</p>
        <h1 className="mt-3 font-[var(--font-display)] text-4xl leading-tight text-[var(--ink)]">AI Ticket Management System</h1>
        <p className="mt-4 max-w-2xl text-[15px] text-[var(--muted)]">
          Customer tickets are auto-classified by AI with priority, category, and suggested responses while agents and admins
          manage resolution in role-based workspaces.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-md bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white">
            Sign In
          </Link>
          <Link href="/register" className="rounded-md border border-[var(--line)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)]">
            Create Customer Account
          </Link>
        </div>
      </section>
    </main>
  );
}
