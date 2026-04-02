import { Badge } from "@/components/ui/badge";
import { Category, Priority } from "@/lib/types";

function priorityTone(priority: Priority | null): "neutral" | "success" | "warn" | "danger" {
  if (priority === "critical") return "danger";
  if (priority === "high") return "warn";
  if (priority === "medium") return "warn";
  if (priority === "low") return "success";
  return "neutral";
}

export function AiBadge({
  category,
  priority,
  aiClassified,
  aiConfidenceNote,
}: {
  category: Category | null;
  priority: Priority | null;
  aiClassified: boolean;
  aiConfidenceNote?: string | null;
}) {
  if (!aiClassified) {
    return (
      <div className="flex gap-2">
        <span className="inline-flex animate-pulse items-center rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">
          Classifying...
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Badge label={category ?? "unclassified"} tone="indigo" />
      <Badge label={priority ?? "pending-ai"} tone={priorityTone(priority)} />
      {aiConfidenceNote ? (
        <span
          title={aiConfidenceNote}
          className="inline-flex cursor-help items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
        >
          info
        </span>
      ) : null}
    </div>
  );
}
