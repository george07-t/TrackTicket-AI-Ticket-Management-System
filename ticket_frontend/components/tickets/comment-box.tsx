"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/input";

export function CommentBox({
  canInternal,
  onSubmit,
}: {
  canInternal: boolean;
  onSubmit: (body: string, isInternal: boolean) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(body, isInternal);
    setBody("");
    setIsInternal(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4">
      <TextArea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply..." rows={3} required />
      <div className="flex items-center justify-between">
        {canInternal ? (
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
            Internal note
          </label>
        ) : (
          <span className="text-sm text-[var(--muted)]">Visible to customer</span>
        )}
        <Button type="submit">Send</Button>
      </div>
    </form>
  );
}
