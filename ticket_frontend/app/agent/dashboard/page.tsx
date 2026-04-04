"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import { StatCard } from "@/components/dashboard/stat-card";
import { AiBadge } from "@/components/tickets/ai-badge";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Table } from "@/components/ui/table";
import { api } from "@/lib/api";
import { AgentStats, Ticket } from "@/lib/types";

export default function AgentDashboardPage() {
  const { data = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["agent-tickets"],
    queryFn: async () => {
      const response = await api.get<Ticket[]>("/tickets");
      return response.data;
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["agent-stats"],
    queryFn: async () => (await api.get<AgentStats>("/dashboard/agent-stats")).data,
  });

  return (
    <section className="space-y-4 fade-in">
      <h2 className="font-[var(--font-display)] text-2xl">Assigned Tickets</h2>

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--line)] bg-white p-4">
              <Skeleton height={16} width={100} />
              <Skeleton height={32} width={60} className="mt-2" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Assigned Total" value={stats.assigned_total} />
          <StatCard label="Open" value={stats.open} />
          <StatCard label="Resolved" value={stats.resolved} />
          <StatCard label="Critical Open" value={stats.critical_open} />
        </div>
      ) : null}

      {ticketsLoading ? (
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
        <Table headers={["Title", "Status", "AI", "Customer"]}>
          {data.map((ticket) => (
            <tr key={ticket.id} className="border-t border-[var(--line)]">
              <td className="px-4 py-3">
                <Link className="font-medium hover:underline" href={`/agent/tickets/${ticket.id}`}>
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
              <td className="px-4 py-3">{ticket.creator.full_name}</td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}
