"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import { ActivityTimeline } from "@/components/tickets/activity-timeline";
import { AiBadge } from "@/components/tickets/ai-badge";
import { CommentBox } from "@/components/tickets/comment-box";
import { RichBody } from "@/components/tickets/rich-body";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RichEditor } from "@/components/ui/rich-editor";
import { api, getApiErrorMessage } from "@/lib/api";
import { extractTicketId } from "@/lib/slug";
import { Comment, Ticket } from "@/lib/types";

// Poll every 2.5 s while AI is processing.
const POLL_INTERVAL_MS = 2_500;

export default function CustomerTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = extractTicketId(params.id);
  const queryClient = useQueryClient();
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  // Refs track previous values to fire one-shot toasts on state transitions.
  const prevAiClassified = useRef<boolean | null>(null);
  const prevAssignedTo = useRef<string | null | undefined>(undefined);

  const { data: ticket } = useQuery<Ticket>({
    queryKey: ["ticket", id],
    queryFn: async () => (await api.get<Ticket>(`/tickets/${id}`)).data,

    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return POLL_INTERVAL_MS;
      if (data.ai_classified) return false;
      return POLL_INTERVAL_MS;
    },

    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!ticket) return;

    if (prevAiClassified.current === null) {
      prevAiClassified.current = ticket.ai_classified;
      prevAssignedTo.current = ticket.assigned_to;
      return;
    }

    if (!prevAiClassified.current && ticket.ai_classified) {
      const category = ticket.category ?? "general";
      const priority = ticket.priority ?? "medium";
      toast.success(`Ticket classified — ${category} · ${priority} priority`, { autoClose: 6000 });
      prevAiClassified.current = true;
    }

    if (
      prevAssignedTo.current !== ticket.assigned_to &&
      ticket.assigned_to !== null &&
      ticket.assignee
    ) {
      toast.success(`Assigned to ${ticket.assignee.full_name}`, { autoClose: 6000 });
    }
    prevAssignedTo.current = ticket.assigned_to;
  }, [ticket]);

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

  const { data: comments = [] } = useQuery({
    queryKey: ["ticket-comments", id],
    queryFn: async () => (await api.get<Comment[]>(`/tickets/${id}/comments`)).data,
  });

  async function addComment(body: string) {
    try {
      await api.post(`/tickets/${id}/comments`, { body, is_internal: false });
      toast.success("Comment added");
      await queryClient.invalidateQueries({ queryKey: ["ticket-comments", id] });
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to add comment"));
    }
  }

  async function saveTicketEdits() {
    try {
      await api.patch(`/tickets/${id}`, { title: editTitle, description: editDescription });
      toast.success("Ticket updated");
      setIsEditingTicket(false);
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      await queryClient.invalidateQueries({ queryKey: ["customer-tickets"] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update ticket"));
    }
  }

  async function deleteTicket() {
    try {
      await api.delete(`/tickets/${id}`);
      toast.success("Ticket removed from your list");
      await queryClient.invalidateQueries({ queryKey: ["customer-tickets"] });
      router.push("/customer/dashboard");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete ticket"));
    }
  }

  async function saveCommentEdit(commentId: string) {
    try {
      await api.patch(`/tickets/${id}/comments/${commentId}`, { body: editingCommentBody });
      toast.success("Reply updated");
      setEditingCommentId(null);
      setEditingCommentBody("");
      await queryClient.invalidateQueries({ queryKey: ["ticket-comments", id] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update reply"));
    }
  }

  if (!ticket) {
    return (
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 space-y-3 lg:col-span-8">
          <Skeleton height={130} borderRadius={12} />
          <Skeleton height={96} borderRadius={12} />
          <Skeleton height={80} borderRadius={12} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Skeleton height={200} borderRadius={12} />
        </div>
      </div>
    );
  }

  const ticketRef = `#${ticket.id.slice(0, 8).toUpperCase()}`;
  const canEditTicket = ticket.status !== "resolved" && ticket.status !== "closed";

  return (
    <div className="grid grid-cols-12 gap-4 fade-in">
      <div className="col-span-12 space-y-4 lg:col-span-8">
        {!ticket.ai_classified && (
          <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500" />
            </span>
            <p className="text-sm font-medium text-indigo-800">
              AI is analyzing your ticket — category, priority and agent assignment will update in a moment…
            </p>
          </div>
        )}

        <div className="rounded-xl border border-[var(--line)] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{ticketRef}</p>
          {!isEditingTicket ? (
            <>
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
                    <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-[var(--line)] bg-white p-1 shadow-lg">
                      {canEditTicket && (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--paper)]"
                          onClick={() => {
                            setActionsOpen(false);
                            setEditTitle(ticket.title);
                            setEditDescription(ticket.description);
                            setIsEditingTicket(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-rose-50"
                        onClick={() => {
                          setActionsOpen(false);
                          setConfirmDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <RichBody text={ticket.description} className="mt-2 text-[var(--muted)]" />
            </>
          ) : (
            <div className="space-y-3">
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              <RichEditor content={editDescription} onChange={setEditDescription} minHeight="10rem" />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={saveTicketEdits}>Save Changes</Button>
                <Button type="button" variant="secondary" onClick={() => setIsEditingTicket(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {ticket.resolved_at ? (
            <p className="mt-2 text-sm text-emerald-700">
              Resolved at {new Date(ticket.resolved_at).toLocaleString()}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusBadge status={ticket.status} />
            <AiBadge
              category={ticket.category}
              priority={ticket.priority}
              aiClassified={ticket.ai_classified}
              aiConfidenceNote={ticket.ai_confidence_note}
            />
            {ticket.assignee && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {ticket.assignee.full_name}
              </span>
            )}
          </div>
        </div>

        <CommentBox
          canInternal={false}
          onSubmit={(body) => addComment(body)}
          disabled={!canEditTicket}
          disabledMessage={
            !canEditTicket ? "Replies are locked after resolve/close" : "Visible to customer"
          }
        />

        <div className="space-y-3">
          {comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-xl border border-[var(--line)] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-[var(--muted)]">
                  {comment.author.full_name}
                  {comment.is_edited ? " (edited)" : ""}
                </p>
                {comment.author_id === ticket.created_by && canEditTicket && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-[var(--brand)]"
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditingCommentBody(comment.body);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
              </div>
              {editingCommentId === comment.id ? (
                <div className="mt-2 space-y-2">
                  <RichEditor content={editingCommentBody} onChange={setEditingCommentBody} minHeight="7rem" />
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => saveCommentEdit(comment.id)}>Save</Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditingCommentBody("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <RichBody text={comment.body} className="mt-1" />
              )}
            </article>
          ))}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4">
        <ActivityTimeline activities={ticket.activities ?? []} />
      </div>

      <Modal
        open={confirmDeleteOpen}
        title="Delete Ticket"
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <p className="text-sm text-[var(--muted)]">
          This will remove the ticket from your customer view. Admin can still track it for audit.
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmDeleteOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              setConfirmDeleteOpen(false);
              await deleteTicket();
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
