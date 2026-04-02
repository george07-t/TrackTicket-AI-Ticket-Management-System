export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[var(--ink)]">{value}</p>
    </div>
  );
}
