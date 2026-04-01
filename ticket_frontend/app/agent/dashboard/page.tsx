"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { AiBadge } from "@/components/tickets/ai-badge";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Table } from "@/components/ui/table";
import { api } from "@/lib/api";
import { Ticket } from "@/lib/types";

export default function AgentDashboardPage() {
  const { data = [] } = useQuery({
    queryKey: ["agent-tickets"],
    queryFn: async () => {
      const response = await api.get<Ticket[]>("/tickets");
      return response.data;
    },
  });

  return (
    <section className="space-y-4 fade-in">
      <h2 className="font-[var(--font-display)] text-2xl">Assigned Tickets</h2>
      <Table headers={["Title", "Status", "AI", "Customer"]}>
        {data.map((ticket) => (
          <tr key={ticket.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">
              <Link className="font-medium hover:underline" href={`/agent/tickets/${ticket.id}`}>
                {ticket.title}
              </Link>
            </td>
            <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
            <td className="px-4 py-3"><AiBadge category={ticket.category} priority={ticket.priority} /></td>
            <td className="px-4 py-3">{ticket.creator.full_name}</td>
          </tr>
        ))}
      </Table>
    </section>
  );
}
