"use client";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ActivityTimeline } from "@/components/tickets/activity-timeline";
import { AiBadge } from "@/components/tickets/ai-badge";
import { CommentBox } from "@/components/tickets/comment-box";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getApiErrorMessage } from "@/lib/api";
import { Comment, Ticket } from "@/lib/types";

export default function CustomerTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: ticket } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const response = await api.get<Ticket>(`/tickets/${id}`);
      return response.data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["ticket-comments", id],
    queryFn: async () => {
      const response = await api.get<Comment[]>(`/tickets/${id}/comments`);
      return response.data;
    },
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
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const ticketRef = `#${ticket.id.slice(0, 8).toUpperCase()}`;
  const isClosed = ticket.status === "closed";

  return (
    <section className="space-y-4 fade-in">
      <div className="rounded-xl border border-[var(--line)] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{ticketRef}</p>
        <h2 className="font-[var(--font-display)] text-2xl">{ticket.title}</h2>
        <p className="mt-2 text-[var(--muted)]">{ticket.description}</p>
        {ticket.resolved_at ? <p className="mt-2 text-sm text-emerald-700">Resolved at {new Date(ticket.resolved_at).toLocaleString()}</p> : null}
        <div className="mt-4 flex gap-3">
          <StatusBadge status={ticket.status} />
          <AiBadge
            category={ticket.category}
            priority={ticket.priority}
            aiClassified={ticket.ai_classified}
            aiConfidenceNote={ticket.ai_confidence_note}
          />
        </div>
      </div>

      <CommentBox
        canInternal={false}
        onSubmit={(body) => addComment(body)}
        disabled={isClosed}
        disabledMessage={isClosed ? "Comments are closed for closed tickets" : "Visible to customer"}
      />

      <div className="space-y-3">
        {comments.map((comment) => (
          <article key={comment.id} className="rounded-xl border border-[var(--line)] bg-white p-4">
            <p className="text-sm text-[var(--muted)]">{comment.author.full_name}</p>
            <p className="mt-1">{comment.body}</p>
          </article>
        ))}
      </div>

      <ActivityTimeline activities={ticket.activities ?? []} />
    </section>
  );
}
