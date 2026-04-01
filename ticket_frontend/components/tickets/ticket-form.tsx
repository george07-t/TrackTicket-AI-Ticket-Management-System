"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, TextArea } from "@/components/ui/input";

export function TicketForm({
  onSubmit,
}: {
  onSubmit: (title: string, description: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(title, description);
      setTitle("");
      setDescription("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={4} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <TextArea value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} minLength={10} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Create Ticket"}
      </Button>
    </form>
  );
}
