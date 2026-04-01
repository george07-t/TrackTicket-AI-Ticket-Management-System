export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warn" | "danger" }) {
  const style: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warn: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
  };

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${style[tone]}`}>{label}</span>;
}
