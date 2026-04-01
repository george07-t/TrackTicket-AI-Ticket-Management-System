import { Badge } from "@/components/ui/badge";
import { Category, Priority } from "@/lib/types";

function priorityTone(priority: Priority | null): "neutral" | "success" | "warn" | "danger" {
  if (priority === "critical") return "danger";
  if (priority === "high") return "warn";
  if (priority === "low") return "success";
  return "neutral";
}

export function AiBadge({ category, priority }: { category: Category | null; priority: Priority | null }) {
  return (
    <div className="flex gap-2">
      <Badge label={category ?? "pending-ai"} />
      <Badge label={priority ?? "pending-ai"} tone={priorityTone(priority)} />
    </div>
  );
}
