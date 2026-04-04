"use client";

import { ClipboardEvent, FormEvent, useRef, useState } from "react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input, TextArea } from "@/components/ui/input";
import { api, getApiErrorMessage, getMediaUrl } from "@/lib/api";
import { attachmentName } from "@/lib/slug";

const MAX_IMAGES = 5;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

// ── small inline components ──────────────────────────────────────────────────

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

// ── main component ───────────────────────────────────────────────────────────

export function TicketForm({
  onSubmit,
}: {
  onSubmit: (title: string, description: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]); // backend /uploads paths
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── upload helpers ─────────────────────────────────────────────────────────

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

  // Intercept paste: if the clipboard contains an image blob, upload it
  // instead of letting the textarea receive raw binary text.
  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const imageItem = Array.from(e.clipboardData.items).find((item) =>
      item.type.startsWith("image/")
    );
    if (!imageItem) return; // plain text — let the textarea handle it normally
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) void uploadFile(file);
  }

  // ── form submit ────────────────────────────────────────────────────────────

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      // Append image refs as markdown at the end of the description so they
      // travel with the ticket body and are rendered by RichBody on display.
      const fullDescription =
        attachments.length > 0
          ? `${description}\n\n${attachments.map((u) => `![image](${u})`).join("\n")}`
          : description;
      await onSubmit(title, fullDescription);
      setTitle("");
      setDescription("");
      setAttachments([]);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary of the issue"
          required
          minLength={4}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>

        {/* Wrapper gives us a stacking context for the absolute upload button */}
        <div className="relative">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onPaste={handlePaste}
            placeholder="Describe your issue in detail. You can paste or attach images."
            required
            rows={5}
            minLength={10}
            // Extra bottom padding so text never hides behind the upload icon
            className="pb-9"
          />

          {/* Camera icon — sits at the bottom-right inside the textarea */}
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

          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
              e.target.value = ""; // allow re-selecting the same file
            }}
          />
        </div>

        {/* Attachment thumbnails */}
        {attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((url, i) => (
              <div key={i} className="group relative">
                <img
                  src={getMediaUrl(url)}
                  alt={attachmentName(url)}
                  className="h-20 w-20 rounded-lg border border-[var(--line)] object-cover"
                />
                {/* Remove button shown on hover */}
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
      </div>

      <Button type="submit" disabled={isSubmitting || uploading}>
        {isSubmitting ? "Submitting…" : "Create Ticket"}
      </Button>
    </form>
  );
}
