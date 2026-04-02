import { TicketActivity } from "@/lib/types";

function activityTone(action: string): string {
  if (action === "created") return "bg-sky-500";
  if (action === "updated") return "bg-amber-500";
  if (action === "ai_classified") return "bg-violet-500";
  if (action === "comment_added") return "bg-emerald-500";
  if (action === "ai_overridden") return "bg-orange-500";
  return "bg-slate-400";
}

function labelForAction(action: string): string {
  return action.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ActivityTimeline({ activities }: { activities: TicketActivity[] }) {
  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)]">
        No activity yet.
      </div>
    );
  }

  const list = (
    <ol className="space-y-4">
      {activities.map((activity) => (
        <li key={activity.id} className="relative pl-8">
          <span className={`absolute left-0 top-2 h-3 w-3 rounded-full ${activityTone(activity.action)}`} />
          <div className="rounded-lg border border-[var(--line)] bg-white p-3">
            <p className="text-sm font-semibold text-[var(--ink)]">{labelForAction(activity.action)}</p>
            <p className="text-sm text-[var(--muted)]">
              {activity.actor?.full_name ?? "System"} · {new Date(activity.created_at).toLocaleString()}
            </p>
            {activity.detail ? <p className="mt-1 text-sm">{activity.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );

  return (
    <section className="space-y-2">
      <h3 className="font-[var(--font-display)] text-lg">Activity Timeline</h3>
      <details className="md:hidden">
        <summary className="cursor-pointer rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold">
          View activity
        </summary>
        <div className="mt-3">{list}</div>
      </details>
      <div className="hidden md:block">{list}</div>
    </section>
  );
}
