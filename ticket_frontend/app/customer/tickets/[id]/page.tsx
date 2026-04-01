"use client";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AiBadge } from "@/components/tickets/ai-badge";
import { CommentBox } from "@/components/tickets/comment-box";
import { StatusBadge } from "@/components/tickets/status-badge";
import { api } from "@/lib/api";
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
    await api.post(`/tickets/${id}/comments`, { body, is_internal: false });
    await queryClient.invalidateQueries({ queryKey: ["ticket-comments", id] });
  }

  if (!ticket) return null;

  return (
    <section className="space-y-4 fade-in">
      <div className="rounded-xl border border-[var(--line)] bg-white p-5">
        <h2 className="font-[var(--font-display)] text-2xl">{ticket.title}</h2>
        <p className="mt-2 text-[var(--muted)]">{ticket.description}</p>
        <div className="mt-4 flex gap-3">
          <StatusBadge status={ticket.status} />
          <AiBadge category={ticket.category} priority={ticket.priority} />
        </div>
      </div>

      <CommentBox canInternal={false} onSubmit={(body) => addComment(body)} />

      <div className="space-y-3">
        {comments.map((comment) => (
          <article key={comment.id} className="rounded-xl border border-[var(--line)] bg-white p-4">
            <p className="text-sm text-[var(--muted)]">{comment.author.full_name}</p>
            <p className="mt-1">{comment.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
