"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Trash2 } from "lucide-react";

import { ActivityTimeline } from "@/components/tickets/activity-timeline";
import { AiBadge } from "@/components/tickets/ai-badge";
import { AiSuggestedReply } from "@/components/tickets/ai-suggested-reply";
import { RichBody } from "@/components/tickets/rich-body";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getApiErrorMessage } from "@/lib/api";
import { extractTicketId } from "@/lib/slug";
import { Category, Priority, Ticket, User } from "@/lib/types";

const categories: Category[] = ["billing", "technical", "account", "general"];
const priorities: Priority[] = ["low", "medium", "high", "critical"];

export default function AdminTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = extractTicketId(params.id);
  const queryClient = useQueryClient();

  const { data: ticket } = useQuery({
    queryKey: ["admin-ticket", id],
    queryFn: async () => (await api.get<Ticket>(`/tickets/${id}`)).data,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["assignable-agents"],
    queryFn: async () => (await api.get<User[]>("/users", { params: { role: "agent", is_active: true } })).data,
  });

  const [categoryOverride, setCategoryOverride] = useState<Category | null>(null);
  const [priorityOverride, setPriorityOverride] = useState<Priority | null>(null);
  const [suggestedOverride, setSuggestedOverride] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [isGeneratingAiReply, setIsGeneratingAiReply] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const category = categoryOverride ?? ticket?.category ?? "general";
    const priority = priorityOverride ?? ticket?.priority ?? "medium";
    const suggestedResponse = suggestedOverride ?? ticket?.ai_suggested_response ?? "";
    try {
      await api.patch(`/tickets/${id}/ai`, {
        category,
        priority,
        suggested_response: suggestedResponse,
      });
      toast.success("AI override saved");
      setCategoryOverride(null);
      setPriorityOverride(null);
      setSuggestedOverride(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-ticket", id] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to override AI"));
    }
  }

  async function updateAssignee(event: FormEvent) {
    event.preventDefault();
    const selectedAssignee = assigneeId ?? ticket?.assigned_to ?? "";
    try {
      await api.patch(`/tickets/${id}`, {
        assigned_to: selectedAssignee || null,
      });
      toast.success("Ticket assignment updated");
      await queryClient.invalidateQueries({ queryKey: ["admin-ticket", id] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update assignment"));
    }
  }

  async function generateReply(force = false) {
    setIsGeneratingAiReply(true);
    try {
      await api.post(`/tickets/${id}/ai-reply`, { force });
      toast.success(force ? "AI reply regenerated" : "AI reply generated");
      await queryClient.invalidateQueries({ queryKey: ["admin-ticket", id] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to generate AI reply"));
    } finally {
      setIsGeneratingAiReply(false);
    }
  }

  async function softDeleteTicket() {
    if (!confirm("Hide this ticket from customer view? Admin will still be able to track it.")) {
      return;
    }
    try {
      await api.delete(`/tickets/${id}`);
      toast.success("Ticket removed from customer view");
      await queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-ticket", id] });
      router.push("/admin/tickets");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete ticket"));
    }
  }

  if (!ticket) {
    return (
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 space-y-3 lg:col-span-8">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const selectedAssignee = assigneeId ?? ticket.assigned_to ?? "";

  return (
    <div className="grid grid-cols-12 gap-4 fade-in">
      <div className="col-span-12 space-y-4 lg:col-span-8">
        <div className="rounded-xl border border-[var(--line)] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">#{ticket.id.slice(0, 8).toUpperCase()}</p>
          <h2 className="font-[var(--font-display)] text-2xl">{ticket.title}</h2>
          <RichBody text={ticket.description} className="mt-2 text-[var(--muted)]" />
          <div className="mt-3 flex flex-wrap gap-2">
            <AiBadge
              category={ticket.category}
              priority={ticket.priority}
              aiClassified={ticket.ai_classified}
              aiConfidenceNote={ticket.ai_confidence_note}
            />
            {ticket.is_deleted_for_customer && (
              <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                Removed from customer view
              </span>
            )}
          </div>
          {ticket.ai_confidence_note ? <p className="mt-2 text-sm text-[var(--muted)]">AI note: {ticket.ai_confidence_note}</p> : null}
          <p className="mt-1 text-sm text-[var(--muted)]">
            Assignment method: <span className="font-semibold text-[var(--ink)]">{ticket.assignment_method}</span>
          </p>
          {ticket.ai_suggested_agent ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              AI suggested agent: <span className="font-semibold text-[var(--ink)]">{ticket.ai_suggested_agent.full_name}</span>
              {ticket.ai_assignment_confidence !== null ? ` (${Math.round(ticket.ai_assignment_confidence * 100)}% confidence)` : ""}
            </p>
          ) : null}
          {ticket.deleted_at && (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Removed at {new Date(ticket.deleted_at).toLocaleString()} by {ticket.deleted_by?.full_name ?? "unknown"}
            </p>
          )}
          <div className="mt-4">
            <Button type="button" variant="secondary" onClick={softDeleteTicket}>
              <Trash2 className="mr-1 h-4 w-4" />
              Remove from customer
            </Button>
          </div>
        </div>

        <AiSuggestedReply
          suggestion={ticket.ai_suggested_response}
          onUse={() => null}
          onGenerate={async () => generateReply(false)}
          onRegenerate={async () => generateReply(true)}
          isGenerating={isGeneratingAiReply}
        />

        <form onSubmit={updateAssignee} className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-5">
          <label className="block text-sm">
            Assign to specific agent
            <select
              className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3"
              value={selectedAssignee}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {agents.filter((agent) => agent.is_available).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.full_name} ({agent.expertise_tags.join(", ") || "general"})
                </option>
              ))}
            </select>
          </label>
          <Button type="submit">Save Assignment</Button>
        </form>

        <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-5">
          <label className="block text-sm">
            Category
            <select
              className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3"
              value={categoryOverride ?? ticket.category ?? "general"}
              onChange={(e) => setCategoryOverride(e.target.value as Category)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Priority
            <select
              className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3"
              value={priorityOverride ?? ticket.priority ?? "medium"}
              onChange={(e) => setPriorityOverride(e.target.value as Priority)}
            >
              {priorities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Suggested response
            <Input
              value={suggestedOverride ?? ticket.ai_suggested_response ?? ""}
              onChange={(e) => setSuggestedOverride(e.target.value)}
            />
          </label>
          <Button type="submit">Override AI</Button>
        </form>
      </div>

      <div className="col-span-12 lg:col-span-4">
        <ActivityTimeline activities={ticket.activities ?? []} />
      </div>
    </div>
  );
}
