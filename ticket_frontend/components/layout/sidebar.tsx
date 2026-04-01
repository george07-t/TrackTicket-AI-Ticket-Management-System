"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Role } from "@/lib/types";

const navMap: Record<Role, { label: string; href: string }[]> = {
  customer: [
    { label: "Dashboard", href: "/customer/dashboard" },
    { label: "New Ticket", href: "/customer/tickets/new" },
  ],
  agent: [{ label: "Dashboard", href: "/agent/dashboard" }],
  admin: [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Tickets", href: "/admin/tickets" },
    { label: "Users", href: "/admin/users" },
  ],
};

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-[var(--line)] bg-white px-4 py-3 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="mb-4 text-lg font-bold text-[var(--brand)]">TicketFlow</div>
      <nav className="flex gap-2 lg:flex-col">
        {navMap[role].map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm ${active ? "bg-[var(--brand)] text-white" : "text-[var(--ink)] hover:bg-[var(--paper)]"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
