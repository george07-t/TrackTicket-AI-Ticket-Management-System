"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import { AiBadge } from "@/components/tickets/ai-badge";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Table } from "@/components/ui/table";
import { api } from "@/lib/api";
import { Ticket } from "@/lib/types";

export default function CustomerDashboardPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["customer-tickets"],
    queryFn: async () => {
      const response = await api.get<Ticket[]>("/tickets");
      return response.data;
    },
  });

  return (
    <section className="space-y-4 fade-in">
      <h2 className="font-[var(--font-display)] text-2xl">My Tickets</h2>
      {isLoading ? (
        <div className="rounded-xl border border-[var(--line)] bg-white p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton width={200} height={20} />
              <Skeleton width={90} height={20} />
              <Skeleton width={120} height={20} />
              <Skeleton width={140} height={20} />
            </div>
          ))}
        </div>
      ) : (
        <Table headers={["Title", "Status", "AI", "Updated"]}>
          {data.map((ticket) => (
            <tr key={ticket.id} className="border-t border-[var(--line)]">
              <td className="px-4 py-3">
                <Link className="font-medium hover:underline" href={`/customer/tickets/${ticket.id}`}>
                  {ticket.title}
                </Link>
              </td>
              <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
              <td className="px-4 py-3">
                <AiBadge
                  category={ticket.category}
                  priority={ticket.priority}
                  aiClassified={ticket.ai_classified}
                  aiConfidenceNote={ticket.ai_confidence_note}
                />
              </td>
              <td className="px-4 py-3 text-[var(--muted)]">{new Date(ticket.updated_at).toLocaleString()}</td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}
