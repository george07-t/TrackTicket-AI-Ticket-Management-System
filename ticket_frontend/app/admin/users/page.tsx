"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { api } from "@/lib/api";
import { User } from "@/lib/types";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get<User[]>("/users")).data,
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function createAgent(event: FormEvent) {
    event.preventDefault();
    await api.post("/users", { full_name: fullName, email, password, role: "agent" });
    setFullName("");
    setEmail("");
    setPassword("");
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function toggleUser(user: User) {
    await api.patch(`/users/${user.id}`, { is_active: !user.is_active });
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <section className="space-y-5 fade-in">
      <h2 className="font-[var(--font-display)] text-2xl">User Management</h2>

      <form onSubmit={createAgent} className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 md:grid-cols-4">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required />
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required />
        <Button type="submit">Create Agent</Button>
      </form>

      <Table headers={["Name", "Email", "Role", "Status", "Action"]}>
        {data.map((user) => (
          <tr key={user.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{user.full_name}</td>
            <td className="px-4 py-3">{user.email}</td>
            <td className="px-4 py-3">{user.role}</td>
            <td className="px-4 py-3">{user.is_active ? "active" : "inactive"}</td>
            <td className="px-4 py-3">
              <Button variant="secondary" onClick={() => toggleUser(user)}>
                Toggle Active
              </Button>
            </td>
          </tr>
        ))}
      </Table>
    </section>
  );
}
