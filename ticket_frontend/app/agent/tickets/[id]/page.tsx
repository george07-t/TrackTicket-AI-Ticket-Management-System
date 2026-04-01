"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { CommentBox } from "@/components/tickets/comment-box";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Comment, Status, Ticket } from "@/lib/types";

const statuses: Status[] = ["open", "in_progress", "resolved", "closed"];

export default function AgentTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: ticket } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => (await api.get<Ticket>(`/tickets/${id}`)).data,
  });
  const { data: comments = [] } = useQuery({
    queryKey: ["ticket-comments", id],
    queryFn: async () => (await api.get<Comment[]>(`/tickets/${id}/comments`)).data,
  });

  const [status, setStatus] = useState<Status>("open");

  async function updateStatus() {
    await api.patch(`/tickets/${id}`, { status });
    await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
  }

  async function addComment(body: string, isInternal: boolean) {
    await api.post(`/tickets/${id}/comments`, { body, is_internal: isInternal });
    await queryClient.invalidateQueries({ queryKey: ["ticket-comments", id] });
  }

  if (!ticket) return null;

  return (
    <section className="space-y-4 fade-in">
      <div className="rounded-xl border border-[var(--line)] bg-white p-5">
        <h2 className="font-[var(--font-display)] text-2xl">{ticket.title}</h2>
        <p className="mt-2 text-[var(--muted)]">{ticket.description}</p>
        <div className="mt-4 flex items-center gap-2">
          <select className="h-10 rounded-md border border-[var(--line)] px-3" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Button onClick={updateStatus}>Update Status</Button>
        </div>
      </div>

      <CommentBox canInternal={true} onSubmit={addComment} />

      <div className="space-y-3">
        {comments.map((comment) => (
          <article key={comment.id} className="rounded-xl border border-[var(--line)] bg-white p-4">
            <p className="text-sm text-[var(--muted)]">
              {comment.author.full_name} {comment.is_internal ? "(internal)" : ""}
            </p>
            <p className="mt-1">{comment.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
