"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Table } from "@/components/ui/table";
import { api } from "@/lib/api";
import { ticketSlug } from "@/lib/slug";
import { Category, Priority, Status, Ticket } from "@/lib/types";

const statuses: (Status | "all")[] = ["all", "open", "in_progress", "resolved", "closed"];
const categories: (Category | "all")[] = ["all", "billing", "technical", "account", "general"];
const priorities: (Priority | "all")[] = ["all", "low", "medium", "high", "critical"];

function priorityTone(p: Priority | null): "neutral" | "success" | "warn" | "danger" {
  if (p === "critical") return "danger";
  if (p === "high") return "warn";
  if (p === "medium") return "warn";
  if (p === "low") return "success";
  return "neutral";
}

export default function AdminTicketsPage() {
  const [status, setStatus] = useState<Status | "all">("all");
  const [category, setCategory] = useState<Category | "all">("all");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [page, setPage] = useState(1);

  const { data = [] } = useQuery({
    queryKey: ["admin-tickets", status, category, priority, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (status !== "all") params.status = status;
      if (category !== "all") params.category = category;
      if (priority !== "all") params.priority = priority;
      return (await api.get<Ticket[]>("/tickets", { params })).data;
    },
  });

  return (
    <section className="space-y-4 fade-in">
      <h2 className="font-[var(--font-display)] text-2xl">All Tickets</h2>
      <div className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 md:grid-cols-3">
        <label className="text-sm">
          Status
          <select className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3" value={status} onChange={(e) => setStatus(e.target.value as Status | "all")}>
            {statuses.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Category
          <select className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3" value={category} onChange={(e) => setCategory(e.target.value as Category | "all")}>
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Priority
          <select className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3" value={priority} onChange={(e) => setPriority(e.target.value as Priority | "all")}>
            {priorities.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <Table headers={["Title", "Category", "Priority", "Assignee"]}>
        {data.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
              No tickets found.
            </td>
          </tr>
        )}
        {data.map((ticket) => (
          <tr key={ticket.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">
              <Link className="font-medium hover:underline" href={`/admin/tickets/${ticketSlug(ticket)}`}>
                {ticket.title}
              </Link>
            </td>
            <td className="px-4 py-3">
              {ticket.category ? (
                <Badge label={ticket.category} tone="indigo" />
              ) : (
                <Badge label="pending" tone="neutral" />
              )}
            </td>
            <td className="px-4 py-3">
              {ticket.priority ? (
                <Badge label={ticket.priority} tone={priorityTone(ticket.priority)} />
              ) : (
                <Badge label="pending" tone="neutral" />
              )}
            </td>
            <td className="px-4 py-3 text-sm">{ticket.assignee?.full_name ?? "unassigned"}</td>
          </tr>
        ))}
      </Table>

      <div className="flex items-center justify-end gap-2">
        <button className="rounded-md border border-[var(--line)] px-3 py-2 text-sm" onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Previous
        </button>
        <span className="text-sm text-[var(--muted)]">Page {page}</span>
        <button className="rounded-md border border-[var(--line)] px-3 py-2 text-sm" onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </section>
  );
}
