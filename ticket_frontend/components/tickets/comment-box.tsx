"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/input";

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
  const currentBody = value ?? body;

  function updateBody(next: string) {
    if (onValueChange) {
      onValueChange(next);
      return;
    }
    setBody(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    await onSubmit(currentBody, isInternal);
    updateBody("");
    setIsInternal(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4">
      <TextArea
        value={currentBody}
        onChange={(e) => updateBody(e.target.value)}
        placeholder="Write a reply..."
        rows={3}
        required
        disabled={disabled}
      />
      <div className="flex items-center justify-between">
        {canInternal ? (
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} disabled={disabled} />
            Internal note
          </label>
        ) : (
          <span className="text-sm text-[var(--muted)]">{disabledMessage ?? "Visible to customer"}</span>
        )}
        <Button type="submit" disabled={disabled || !currentBody.trim()}>
          Send
        </Button>
      </div>
    </form>
  );
}
