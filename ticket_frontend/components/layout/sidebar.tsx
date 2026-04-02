"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, PlusCircle, ShieldCheck, UserCircle, Users } from "lucide-react";
import type { ComponentType } from "react";

import { Role } from "@/lib/types";

const navMap: Record<Role, { label: string; href: string; icon: ComponentType<{ className?: string }> }[]> = {
  customer: [
    { label: "Dashboard", href: "/customer/dashboard", icon: LayoutDashboard },
    { label: "New Ticket", href: "/customer/tickets/new", icon: PlusCircle },
    { label: "Profile", href: "/profile", icon: UserCircle },
  ],
  agent: [
    { label: "Dashboard", href: "/agent/dashboard", icon: LayoutDashboard },
    { label: "Profile", href: "/profile", icon: UserCircle },
  ],
  admin: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Tickets", href: "/admin/tickets", icon: ListChecks },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Profile", href: "/profile", icon: UserCircle },
  ],
};

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-[var(--line)] bg-white px-4 py-4 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--ink)]">
        <ShieldCheck className="h-5 w-5 text-[var(--brand)]" />
        <span>TrackTicket</span>
      </div>
      <nav className="flex gap-2 lg:flex-col">
        {navMap[role].map((item) => {
          const Icon = item.icon;
          const active = item.href === "/profile" ? pathname === "/profile" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-[var(--brand)] text-white" : "text-[var(--ink)] hover:bg-[var(--paper)]"}`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
