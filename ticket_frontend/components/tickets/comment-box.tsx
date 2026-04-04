"use client";

import { ClipboardEvent, FormEvent, useRef, useState } from "react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/input";
import { api, getApiErrorMessage, getMediaUrl } from "@/lib/api";
import { attachmentName } from "@/lib/slug";

const MAX_IMAGES = 5;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function ImageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function CommentBox({
  canInternal,
  disabled = false,
  disabledMessage,
  value,
  onValueChange,
  onSubmit,
}: {
  canInternal: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onSubmit: (body: string, isInternal: boolean) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentBody = value ?? body;

  function updateBody(next: string) {
    if (onValueChange) {
      onValueChange(next);
    } else {
      setBody(next);
    }
  }

  // ── upload helpers ────────────────────────────────���────────────────────────

  async function uploadFile(file: File) {
    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Only image files are allowed (jpeg, png, gif, webp).");
      return;
    }
    if (attachments.length >= MAX_IMAGES) {
      toast.error(`You can attach up to ${MAX_IMAGES} images.`);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<{ url: string }>("/attachments/upload", form);
      setAttachments((prev) => [...prev, data.url]);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to upload image."));
    } finally {
      setUploading(false);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const imageItem = Array.from(e.clipboardData.items).find((item) =>
      item.type.startsWith("image/")
    );
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) void uploadFile(file);
  }

  // ── form submit ──────────────────────────────────────────���─────────────────

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    const fullBody =
      attachments.length > 0
        ? `${currentBody}\n\n${attachments.map((u) => `![image](${u})`).join("\n")}`
        : currentBody;

    await onSubmit(fullBody, isInternal);
    updateBody("");
    setIsInternal(false);
    setAttachments([]);
  }

  // ── render ──────────────────────────────────────────────────────��──────────

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4">
      {/* Textarea with upload icon pinned to bottom-right */}
      <div className="relative">
        <TextArea
          value={currentBody}
          onChange={(e) => updateBody(e.target.value)}
          onPaste={handlePaste}
          placeholder="Write a reply… You can paste or attach images."
          rows={3}
          required
          disabled={disabled}
          className="pb-9"
        />

        {!disabled && (
          <button
            type="button"
            title={
              attachments.length >= MAX_IMAGES
                ? `Maximum ${MAX_IMAGES} images reached`
                : "Attach image (or paste one)"
            }
            onClick={() => fileRef.current?.click()}
            disabled={uploading || attachments.length >= MAX_IMAGES}
            className="absolute bottom-2.5 right-2.5 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? <Spinner /> : <ImageIcon />}
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Attachment thumbnails */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((url, i) => (
            <div key={i} className="group relative">
              <img
                src={getMediaUrl(url)}
                alt={attachmentName(url)}
                className="h-16 w-16 rounded-lg border border-[var(--line)] object-cover"
              />
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                title="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between">
        {canInternal ? (
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              disabled={disabled}
            />
            Internal note
          </label>
        ) : (
          <span className="text-sm text-[var(--muted)]">{disabledMessage ?? "Visible to customer"}</span>
        )}
        <Button type="submit" disabled={disabled || uploading || !currentBody.trim() && attachments.length === 0}>
          Send
        </Button>
      </div>
    </form>
  );
}
