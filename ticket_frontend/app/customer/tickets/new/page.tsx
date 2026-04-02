"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { TicketForm } from "@/components/tickets/ticket-form";
import { api, getApiErrorMessage } from "@/lib/api";
import { Ticket } from "@/lib/types";

export default function NewTicketPage() {
  const router = useRouter();

  async function handleCreate(title: string, description: string) {
    try {
      const response = await api.post<Ticket>("/tickets", { title, description });
      toast.success("Ticket created");
      router.push(`/customer/tickets/${response.data.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create ticket"));
    }
  }

  return (
    <section className="space-y-4 fade-in">
      <h2 className="font-[var(--font-display)] text-2xl">Create Support Ticket</h2>
      <TicketForm onSubmit={handleCreate} />
    </section>
  );
}
