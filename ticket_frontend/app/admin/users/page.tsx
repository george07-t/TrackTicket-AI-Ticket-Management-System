"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import { api, getApiErrorMessage } from "@/lib/api";
import { User } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "agent" | "customer">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // Per-user loading state sets
  const [togglingActive, setTogglingActive] = useState<Set<string>>(new Set());
  const [togglingAvail, setTogglingAvail] = useState<Set<string>>(new Set());

  async function createAgent(event: FormEvent) {
    event.preventDefault();
    setIsCreating(true);
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
      setIsCreateModalOpen(false);
      toast.success("Agent created successfully");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create user"));
    } finally {
      setIsCreating(false);
    }
  }

  async function toggleUser(user: User) {
    if (user.id === currentUser?.id) return;
    setTogglingActive((prev) => new Set(prev).add(user.id));
    try {
      await api.patch(`/users/${user.id}`, { is_active: !user.is_active });
      toast.success(`User ${user.is_active ? "deactivated" : "activated"}`);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update user"));
    } finally {
      setTogglingActive((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  }

  async function toggleAvailability(user: User) {
    if (user.role !== "agent") return;
    setTogglingAvail((prev) => new Set(prev).add(user.id));
    try {
      await api.patch(`/users/${user.id}`, { is_available: !user.is_available });
      toast.success(`Agent marked as ${user.is_available ? "unavailable" : "available"}`);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update availability"));
    } finally {
      setTogglingAvail((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
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
      <div className="flex items-center justify-between">
        <h2 className="font-[var(--font-display)] text-2xl">User Management</h2>
        <Button onClick={() => setIsCreateModalOpen(true)}>+ Create Agent</Button>
      </div>

      <div className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 md:grid-cols-2">
        <label className="text-sm">
          Role Filter
          <select
            className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "all" | "admin" | "agent" | "customer")}
          >
            <option value="all">All</option>
            <option value="admin">Admin</option>
            <option value="agent">Agent</option>
            <option value="customer">Customer</option>
          </select>
        </label>
        <label className="text-sm">
          Active Filter
          <select
            className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as "all" | "true" | "false")}
          >
            <option value="all">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-[var(--line)] bg-white p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton width={140} height={20} />
              <Skeleton width={180} height={20} />
              <Skeleton width={80} height={20} />
              <Skeleton width={70} height={20} />
              <Skeleton width={90} height={20} />
              <Skeleton width={100} height={20} />
              <Skeleton width={200} height={20} />
            </div>
          ))}
        </div>
      ) : (
        <Table headers={["Name", "Email", "Role", "Status", "Availability", "Expertise", "Action"]}>
          {data.map((user) => {
            const isTogglingActive = togglingActive.has(user.id);
            const isTogglingAvail = togglingAvail.has(user.id);
            return (
              <tr key={user.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3 font-medium">{user.full_name}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize
                    ${user.role === "admin" ? "bg-purple-100 text-purple-700" :
                      user.role === "agent" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-700"}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold
                    ${user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.role === "agent" ? (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold
                      ${user.is_available ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {user.is_available ? "Available" : "Unavailable"}
                    </span>
                  ) : (
                    <span className="text-[var(--muted)] text-xs">n/a</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--muted)]">{user.expertise_tags?.join(", ") || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => toggleUser(user)}
                      disabled={user.id === currentUser?.id || isTogglingActive}
                    >
                      {isTogglingActive
                        ? (user.is_active ? "Deactivating..." : "Activating...")
                        : (user.is_active ? "Deactivate" : "Activate")}
                    </Button>
                    {user.role === "agent" ? (
                      <Button
                        variant="secondary"
                        onClick={() => toggleAvailability(user)}
                        disabled={isTogglingAvail}
                      >
                        {isTogglingAvail
                          ? (user.is_available ? "Updating..." : "Updating...")
                          : (user.is_available ? "Set Unavailable" : "Set Available")}
                      </Button>
                    ) : null}
                    <Button
                      variant="danger"
                      onClick={() => setDeleteTarget(user)}
                      disabled={user.id === currentUser?.id}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      <Modal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Agent">
        <form onSubmit={createAgent} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
          </div>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required />
          <Input value={expertiseTags} onChange={(e) => setExpertiseTags(e.target.value)} placeholder="Expertise tags (comma separated, e.g. billing, technical)" />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Max Active Tickets
              <Input
                className="mt-1"
                value={maxActiveTickets}
                onChange={(e) => setMaxActiveTickets(e.target.value)}
                type="number"
                min={1}
                max={200}
                required
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--muted)] mt-6">
              <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
              Available for assignment
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Agent"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
        <div className="space-y-4">
          <p>Delete <strong>{deleteTarget?.full_name}</strong>? This cannot be undone.</p>
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
