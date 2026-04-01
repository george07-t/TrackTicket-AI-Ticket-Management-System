"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { Category, Priority, Ticket } from "@/lib/types";

const categories: Category[] = ["billing", "technical", "account", "general"];
const priorities: Priority[] = ["low", "medium", "high", "critical"];

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: ticket } = useQuery({
    queryKey: ["admin-ticket", id],
    queryFn: async () => (await api.get<Ticket>(`/tickets/${id}`)).data,
  });

  const [category, setCategory] = useState<Category>("general");
  const [priority, setPriority] = useState<Priority>("medium");
  const [suggestedResponse, setSuggestedResponse] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await api.patch(`/tickets/${id}/ai`, {
      category,
      priority,
      suggested_response: suggestedResponse,
    });
    await queryClient.invalidateQueries({ queryKey: ["admin-ticket", id] });
  }

  if (!ticket) return null;

  return (
    <section className="space-y-4 fade-in">
      <h2 className="font-[var(--font-display)] text-2xl">{ticket.title}</h2>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-5">
        <label className="block text-sm">
          Category
          <select className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Priority
          <select className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {priorities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Suggested response
          <Input value={suggestedResponse} onChange={(e) => setSuggestedResponse(e.target.value)} />
        </label>
        <Button type="submit">Override AI</Button>
      </form>
    </section>
  );
}
