"use client";

import { FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { RichImageUploader } from "@/components/ui/rich-image-uploader";
import { RichEditor, RichEditorHandle } from "@/components/ui/rich-editor";
import { getMediaUrl } from "@/lib/api";

function appendImagesToHtml(html: string, images: string[]): string {
  if (images.length === 0) return html;
  const imageBlocks = images
    .map((url) => `<p><img src="${getMediaUrl(url)}" alt="attachment" /></p>`)
    .join("");
  return `${html}${imageBlocks}`;
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
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const editorRef = useRef<RichEditorHandle>(null);

  const currentBody = value ?? body;
  const plainBody = currentBody
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();

  function updateBody(next: string) {
    if (onValueChange) {
      onValueChange(next);
    } else {
      setBody(next);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    if (editorRef.current?.isEmpty()) {
      return;
    }

    await onSubmit(appendImagesToHtml(currentBody, attachments), isInternal);
    updateBody("");
    setAttachments([]);
    editorRef.current?.clear();
    setIsInternal(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4">
      <div className="relative">
        <RichEditor
          ref={editorRef}
          content={currentBody}
          onChange={updateBody}
          placeholder="Write a reply with formatting."
          disabled={disabled}
          minHeight="8rem"
        />
        <div className="mt-2">
          <RichImageUploader
            images={attachments}
            onChange={setAttachments}
            disabled={disabled}
          />
        </div>
      </div>

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
        <Button type="submit" disabled={disabled || plainBody.length === 0}>
          Send
        </Button>
      </div>
    </form>
  );
}
