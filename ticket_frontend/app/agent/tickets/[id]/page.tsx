"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { ActivityTimeline } from "@/components/tickets/activity-timeline";
import { AiSuggestedReply } from "@/components/tickets/ai-suggested-reply";
import { CommentBox } from "@/components/tickets/comment-box";
import { RichBody } from "@/components/tickets/rich-body";
import { RichEditor } from "@/components/ui/rich-editor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getApiErrorMessage } from "@/lib/api";
import { extractTicketId } from "@/lib/slug";
import { Comment, Status, Ticket } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { Pencil } from "lucide-react";

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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const currentUser = useAuthStore((state) => state.user);

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
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const canEditContent = ticket.status !== "resolved" && ticket.status !== "closed";

  return (
    <div className="grid grid-cols-12 gap-4 fade-in">
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

        <CommentBox
          canInternal={true}
          onSubmit={addComment}
          value={draftReply}
          onValueChange={setDraftReply}
          disabled={!canEditContent}
          disabledMessage="Replies are locked after resolve/close"
        />

        <div className="space-y-3">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-xl border border-[var(--line)] bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-[var(--muted)]">
                  {comment.author.full_name} {comment.is_internal ? "(internal)" : ""}
                  {comment.is_edited ? " (edited)" : ""}
                </p>
                {comment.author_id === currentUser?.id && canEditContent && (
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
    </div>
  );
}
