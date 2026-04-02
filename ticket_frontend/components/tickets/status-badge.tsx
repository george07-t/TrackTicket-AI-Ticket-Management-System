import { Badge } from "@/components/ui/badge";
import { Status } from "@/lib/types";

export function StatusBadge({ status }: { status: Status }) {
  if (status === "resolved") return <Badge label="Resolved" tone="success" />;
  if (status === "in_progress") return <Badge label="In Progress" tone="purple" />;
  if (status === "closed") return <Badge label="Closed" tone="gray" />;
  return <Badge label="Open" tone="info" />;
}
