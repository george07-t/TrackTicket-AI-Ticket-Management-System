"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Table } from "@/components/ui/table";
import { api, getApiErrorMessage } from "@/lib/api";
import { User } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "agent" | "customer">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users", roleFilter, activeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (roleFilter !== "all") params.role = roleFilter;
      if (activeFilter !== "all") params.is_active = activeFilter;
      return (await api.get<User[]>("/users", { params })).data;
    },
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [expertiseTags, setExpertiseTags] = useState("");
  const [maxActiveTickets, setMaxActiveTickets] = useState("10");
  const [isAvailable, setIsAvailable] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  async function createAgent(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/users", {
        full_name: fullName,
        email,
        password,
        role: "agent",
        expertise_tags: expertiseTags
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
        max_active_tickets: Number(maxActiveTickets),
        is_available: isAvailable,
      });
      setFullName("");
      setEmail("");
      setPassword("");
      setExpertiseTags("");
      setMaxActiveTickets("10");
      setIsAvailable(true);
      toast.success("Agent created");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create user"));
    }
  }

  async function toggleUser(user: User) {
    if (user.id === currentUser?.id) return;
    try {
      await api.patch(`/users/${user.id}`, { is_active: !user.is_active });
      toast.success(`User ${user.is_active ? "deactivated" : "activated"}`);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update user"));
    }
  }

  async function toggleAvailability(user: User) {
    if (user.role !== "agent") return;
    try {
      await api.patch(`/users/${user.id}`, { is_available: !user.is_available });
      toast.success(`Agent marked as ${user.is_available ? "unavailable" : "available"}`);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update availability"));
    }
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      toast.success("User deleted");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete user"));
    }
  }

  return (
    <section className="space-y-5 fade-in">
      <h2 className="font-[var(--font-display)] text-2xl">User Management</h2>

      <div className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 md:grid-cols-2">
        <label className="text-sm">
          Role Filter
          <select className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "all" | "admin" | "agent" | "customer")}>
            <option value="all">All</option>
            <option value="admin">Admin</option>
            <option value="agent">Agent</option>
            <option value="customer">Customer</option>
          </select>
        </label>
        <label className="text-sm">
          Active Filter
          <select className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as "all" | "true" | "false")}>
            <option value="all">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
      </div>

      <form onSubmit={createAgent} className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 md:grid-cols-3">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required />
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required />
        <Input value={expertiseTags} onChange={(e) => setExpertiseTags(e.target.value)} placeholder="Expertise tags (comma separated)" />
        <Input value={maxActiveTickets} onChange={(e) => setMaxActiveTickets(e.target.value)} type="number" min={1} max={200} placeholder="Max active tickets" required />
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
          Available for assignment
        </label>
        <Button type="submit">Create Agent</Button>
      </form>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      <Table headers={["Name", "Email", "Role", "Status", "Availability", "Expertise", "Action"]}>
        {data.map((user) => (
          <tr key={user.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{user.full_name}</td>
            <td className="px-4 py-3">{user.email}</td>
            <td className="px-4 py-3">{user.role}</td>
            <td className="px-4 py-3">{user.is_active ? "active" : "inactive"}</td>
            <td className="px-4 py-3">{user.role === "agent" ? (user.is_available ? "available" : "unavailable") : "n/a"}</td>
            <td className="px-4 py-3">{user.expertise_tags?.join(", ") || "-"}</td>
            <td className="px-4 py-3">
              <Button variant="secondary" onClick={() => toggleUser(user)} disabled={user.id === currentUser?.id}>
                Toggle Active
              </Button>
              {user.role === "agent" ? (
                <Button className="ml-2" variant="secondary" onClick={() => toggleAvailability(user)}>
                  Toggle Availability
                </Button>
              ) : null}
              <Button className="ml-2" variant="danger" onClick={() => setDeleteTarget(user)} disabled={user.id === currentUser?.id}>
                Delete
              </Button>
            </td>
          </tr>
        ))}
      </Table>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
        <div className="space-y-4">
          <p>Delete {deleteTarget?.full_name}? This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={deleteUser}>
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
