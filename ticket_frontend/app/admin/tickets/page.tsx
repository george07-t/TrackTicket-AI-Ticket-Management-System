"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Table } from "@/components/ui/table";
import { api } from "@/lib/api";
import { Ticket } from "@/lib/types";

export default function AdminTicketsPage() {
  const { data = [] } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => (await api.get<Ticket[]>("/tickets")).data,
  });

  return (
    <section className="space-y-4 fade-in">
      <h2 className="font-[var(--font-display)] text-2xl">All Tickets</h2>
      <Table headers={["Title", "Category", "Priority", "Assignee"]}>
        {data.map((ticket) => (
          <tr key={ticket.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">
              <Link className="font-medium hover:underline" href={`/admin/tickets/${ticket.id}`}>
                {ticket.title}
              </Link>
            </td>
            <td className="px-4 py-3">{ticket.category ?? "pending"}</td>
            <td className="px-4 py-3">{ticket.priority ?? "pending"}</td>
            <td className="px-4 py-3">{ticket.assignee?.full_name ?? "unassigned"}</td>
          </tr>
        ))}
      </Table>
    </section>
  );
}
