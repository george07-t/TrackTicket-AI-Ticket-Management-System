"use client";

import { useQuery } from "@tanstack/react-query";

import { StatCard } from "@/components/dashboard/stat-card";
import { api } from "@/lib/api";
import { DashboardStats } from "@/lib/types";

export default function AdminDashboardPage() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await api.get<DashboardStats>("/dashboard/stats")).data,
  });

  if (!data) return null;

  return (
    <section className="space-y-5 fade-in">
      <h2 className="font-[var(--font-display)] text-2xl">Platform Statistics</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Tickets" value={data.total_tickets} />
        <StatCard label="Open" value={data.open_tickets} />
        <StatCard label="Resolved" value={data.resolved_tickets} />
        <StatCard label="Avg Resolution (hrs)" value={data.avg_resolution_time_hours} />
      </div>
    </section>
  );
}
