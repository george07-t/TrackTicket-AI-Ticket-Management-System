"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import { ActivityTimeline } from "@/components/tickets/activity-timeline";
import { AiBadge } from "@/components/tickets/ai-badge";
import { CommentBox } from "@/components/tickets/comment-box";
import { RichBody } from "@/components/tickets/rich-body";
import { StatusBadge } from "@/components/tickets/status-badge";
import { api, getApiErrorMessage } from "@/lib/api";
import { extractTicketId } from "@/lib/slug";
import { Comment, Ticket } from "@/lib/types";

// Poll every 2.5 s while AI is processing; give up after 60 s if AI never responds.
const POLL_INTERVAL_MS = 2_500;
const AI_POLL_TIMEOUT_MS = 60_000;

export default function CustomerTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = extractTicketId(params.id);
  const queryClient = useQueryClient();

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
      const ageMs = Date.now() - new Date(data.created_at).getTime();
      if (ageMs > AI_POLL_TIMEOUT_MS) return false;
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
  const isClosed = ticket.status === "closed";

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
          <h2 className="font-[var(--font-display)] text-2xl">{ticket.title}</h2>
          <RichBody text={ticket.description} className="mt-2 text-[var(--muted)]" />
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
          disabled={isClosed}
          disabledMessage={
            isClosed ? "Comments are closed for closed tickets" : "Visible to customer"
          }
        />

        <div className="space-y-3">
          {comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-xl border border-[var(--line)] bg-white p-4"
            >
              <p className="text-sm text-[var(--muted)]">{comment.author.full_name}</p>
              <RichBody text={comment.body} className="mt-1" />
            </article>
          ))}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4">
        <ActivityTimeline activities={ticket.activities ?? []} />
      </div>
    </div>
  );
}
