"use client";

import { useQuery } from "@tanstack/react-query";

import { StatCard } from "@/components/dashboard/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { DashboardStats } from "@/lib/types";

export default function AdminDashboardPage() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await api.get<DashboardStats>("/dashboard/stats")).data,
  });

  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  return (
    <section className="space-y-5 fade-in">
      <h2 className="font-[var(--font-display)] text-2xl">Platform Statistics</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Tickets" value={data.tickets.total} />
        <StatCard label="Open" value={data.tickets.open} />
        <StatCard label="Resolved" value={data.tickets.resolved} />
        <StatCard label="Avg Resolution (hrs)" value={data.avg_resolution_hours} />
        <StatCard label="Unassigned" value={data.tickets.unassigned} />
        <StatCard label="AI Classified" value={data.tickets.ai_classified} />
        <StatCard label="AI Pending" value={data.tickets.ai_pending} />
        <StatCard label="Reassignment Rate (%)" value={data.assignment_quality.reassignment_rate} />
        <StatCard label="Avg First Response (min)" value={data.assignment_quality.avg_first_response_minutes} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--line)] bg-white p-5">
          <h3 className="text-lg font-semibold">Agent Workload</h3>
          <div className="mt-3 space-y-2 text-sm">
            {data.agent_workload.map((row) => (
              <div key={row.agent} className="flex items-center justify-between border-b border-[var(--line)] py-2 last:border-b-0">
                <span>{row.agent}</span>
                <span className="font-semibold">{row.open_tickets} open</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-white p-5">
          <h3 className="text-lg font-semibold">User Summary</h3>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              <span className="font-semibold">Customers:</span> {data.users.total_customers}
            </p>
            <p>
              <span className="font-semibold">Agents:</span> {data.users.total_agents}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--line)] bg-white p-5">
          <h3 className="text-lg font-semibold">Resolution by Agent</h3>
          <div className="mt-3 space-y-2 text-sm">
            {data.resolution_by_agent.map((row) => (
              <div key={row.agent} className="flex items-center justify-between border-b border-[var(--line)] py-2 last:border-b-0">
                <span>{row.agent}</span>
                <span className="font-semibold">{row.avg_resolution_hours}h ({row.resolved_count})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-white p-5">
          <h3 className="text-lg font-semibold">Resolution by Category</h3>
          <div className="mt-3 space-y-2 text-sm">
            {data.resolution_by_category.map((row) => (
              <div key={row.category} className="flex items-center justify-between border-b border-[var(--line)] py-2 last:border-b-0">
                <span>{row.category}</span>
                <span className="font-semibold">{row.avg_resolution_hours}h ({row.resolved_count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
