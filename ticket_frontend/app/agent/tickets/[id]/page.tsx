"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { ActivityTimeline } from "@/components/tickets/activity-timeline";
import { AiSuggestedReply } from "@/components/tickets/ai-suggested-reply";
import { CommentBox } from "@/components/tickets/comment-box";
import { RichBody } from "@/components/tickets/rich-body";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getApiErrorMessage } from "@/lib/api";
import { extractTicketId } from "@/lib/slug";
import { Comment, Status, Ticket } from "@/lib/types";

const statuses: Status[] = ["open", "in_progress", "resolved", "closed"];

export default function AgentTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = extractTicketId(params.id);
  const queryClient = useQueryClient();

  const { data: ticket } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => (await api.get<Ticket>(`/tickets/${id}`)).data,
  });
  const { data: comments = [] } = useQuery({
    queryKey: ["ticket-comments", id],
    queryFn: async () => (await api.get<Comment[]>(`/tickets/${id}/comments`)).data,
  });

  const [statusOverride, setStatusOverride] = useState<Status | null>(null);
  const [draftReply, setDraftReply] = useState("");
  const [isGeneratingAiReply, setIsGeneratingAiReply] = useState(false);

  async function updateStatus() {
    const status = statusOverride ?? ticket?.status ?? "open";
    try {
      await api.patch(`/tickets/${id}`, { status });
      toast.success("Ticket status updated");
      setStatusOverride(null);
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update status"));
    }
  }

  async function addComment(body: string, isInternal: boolean) {
    try {
      await api.post(`/tickets/${id}/comments`, { body, is_internal: isInternal });
      toast.success(isInternal ? "Internal note added" : "Reply sent");
      await queryClient.invalidateQueries({ queryKey: ["ticket-comments", id] });
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      setDraftReply("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send comment"));
    }
  }

  async function generateReply(force = false) {
    setIsGeneratingAiReply(true);
    try {
      await api.post(`/tickets/${id}/ai-reply`, { force });
      toast.success(force ? "AI reply regenerated" : "AI reply generated");
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to generate AI reply"));
    } finally {
      setIsGeneratingAiReply(false);
    }
  }

  if (!ticket) {
    return (
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 space-y-3 lg:col-span-8">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 fade-in">
      {/* ── Left column: ticket details + reply ── */}
      <div className="col-span-12 space-y-4 lg:col-span-8">
        <div className="rounded-xl border border-[var(--line)] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">#{ticket.id.slice(0, 8).toUpperCase()}</p>
          <h2 className="font-[var(--font-display)] text-2xl">{ticket.title}</h2>
          <RichBody text={ticket.description} className="mt-2 text-[var(--muted)]" />
          <div className="mt-4 flex items-center gap-2">
            <select
              className="h-10 rounded-md border border-[var(--line)] px-3"
              value={statusOverride ?? ticket.status}
              onChange={(e) => setStatusOverride(e.target.value as Status)}
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Button onClick={updateStatus}>Update Status</Button>
          </div>
        </div>

        <AiSuggestedReply
          suggestion={ticket.ai_suggested_response}
          onUse={setDraftReply}
          onGenerate={async () => generateReply(false)}
          onRegenerate={async () => generateReply(true)}
          isGenerating={isGeneratingAiReply}
        />

        <CommentBox canInternal={true} onSubmit={addComment} value={draftReply} onValueChange={setDraftReply} />

        <div className="space-y-3">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-xl border border-[var(--line)] bg-white p-4">
              <p className="text-sm text-[var(--muted)]">
                {comment.author.full_name} {comment.is_internal ? "(internal)" : ""}
              </p>
              <RichBody text={comment.body} className="mt-1" />
            </article>
          ))}
        </div>
      </div>

      {/* ── Right column: activity log ── */}
      <div className="col-span-12 lg:col-span-4">
        <ActivityTimeline activities={ticket.activities ?? []} />
      </div>
    </div>
  );
}
