"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { MoreVertical, Trash2 } from "lucide-react";

import { ActivityTimeline } from "@/components/tickets/activity-timeline";
import { AiBadge } from "@/components/tickets/ai-badge";
import { AiSuggestedReply } from "@/components/tickets/ai-suggested-reply";
import { RichBody } from "@/components/tickets/rich-body";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
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
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmSoftDeleteOpen, setConfirmSoftDeleteOpen] = useState(false);
  const [confirmHardDeleteOpen, setConfirmHardDeleteOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!actionsRef.current) return;
      if (!actionsRef.current.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    }

    if (actionsOpen) {
      document.addEventListener("mousedown", onClickOutside);
    }

    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [actionsOpen]);

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
    try {
      await api.delete(`/tickets/${id}`);
      toast.success("Ticket removed from customer view");
      await queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-ticket", id] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete ticket"));
    }
  }

  async function hardDeleteTicket() {
    try {
      await api.delete(`/tickets/${id}`, { params: { permanent: true } });
      toast.success("Ticket permanently deleted");
      await queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      router.push("/admin/tickets");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to permanently delete ticket"));
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-[var(--font-display)] text-2xl">{ticket.title}</h2>
            <div ref={actionsRef} className="relative">
              <button
                type="button"
                aria-label="Open ticket actions"
                onClick={() => setActionsOpen((prev) => !prev)}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[var(--paper)]"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {actionsOpen && (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-[var(--line)] bg-white p-1 shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--paper)]"
                    onClick={() => {
                      setActionsOpen(false);
                      setConfirmSoftDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove From Customer
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-rose-50"
                    onClick={() => {
                      setActionsOpen(false);
                      setConfirmHardDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Permanently
                  </button>
                </div>
              )}
            </div>
          </div>
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

      <Modal
        open={confirmSoftDeleteOpen}
        title="Remove From Customer"
        onClose={() => setConfirmSoftDeleteOpen(false)}
      >
        <p className="text-sm text-[var(--muted)]">
          This hides the ticket from customer views, but keeps it available for admin tracking and audit.
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirmSoftDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              setConfirmSoftDeleteOpen(false);
              await softDeleteTicket();
            }}
          >
            Confirm Remove
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmHardDeleteOpen}
        title="Delete Ticket Permanently"
        onClose={() => setConfirmHardDeleteOpen(false)}
      >
        <p className="text-sm text-[var(--muted)]">
          This permanently deletes the ticket and its related data. This action cannot be undone.
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirmHardDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              setConfirmHardDeleteOpen(false);
              await hardDeleteTicket();
            }}
          >
            Delete Permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}
