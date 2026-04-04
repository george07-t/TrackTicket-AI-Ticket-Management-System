"use client";

import { FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichEditor, RichEditorHandle } from "@/components/ui/rich-editor";

export function TicketForm({
  onSubmit,
}: {
  onSubmit: (title: string, description: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef<RichEditorHandle>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (editorRef.current?.isEmpty()) {
        setIsSubmitting(false);
        return;
      }

      await onSubmit(title, description);
      setTitle("");
      setDescription("");
      editorRef.current?.clear();
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <RichEditor
          ref={editorRef}
          content={description}
          onChange={setDescription}
          placeholder="Describe your issue in detail. You can format text and paste images."
          minHeight="11rem"
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Create Ticket"}
      </Button>
    </form>
  );
}
