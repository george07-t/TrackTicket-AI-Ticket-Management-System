"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getApiErrorMessage } from "@/lib/api";
import { User } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

export default function ProfilePage() {
  const { role, hydrate, hydrated, token, login } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [expertiseTags, setExpertiseTags] = useState("");
  const [maxActiveTickets, setMaxActiveTickets] = useState("10");
  const [isAvailable, setIsAvailable] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.get<User>("/auth/me");
        setProfile(response.data);
        setFullName(response.data.full_name);
        setPhone(response.data.phone ?? "");
        setExpertiseTags((response.data.expertise_tags ?? []).join(", "));
        setMaxActiveTickets(String(response.data.max_active_tickets ?? 10));
        setIsAvailable(response.data.is_available ?? true);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load profile"));
      }
    }
    if (hydrated) {
      void loadProfile();
    }
  }, [hydrated]);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to change password"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsProfileSubmitting(true);
    try {
      const payload: Record<string, unknown> = { full_name: fullName };
      payload.phone = phone;
      if (role === "agent") {
        payload.expertise_tags = expertiseTags
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean);
        payload.max_active_tickets = Number(maxActiveTickets);
        payload.is_available = isAvailable;
      }

      const response = await api.patch<User>("/auth/me/profile", payload);
      setProfile(response.data);
      if (token) {
        login(token, response.data);
      }
      toast.success("Profile updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update profile"));
    } finally {
      setIsProfileSubmitting(false);
    }
  }

  if (!hydrated || !role) return null;

  return (
    <AppShell role={role}>
      <section className="space-y-5 fade-in">
        <h2 className="font-[var(--font-display)] text-2xl">Profile</h2>

        <div className="rounded-xl border border-[var(--line)] bg-white p-5">
          {profile ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Name:</span> {profile.full_name}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {profile.email}
              </p>
              <p>
                <span className="font-semibold">Phone:</span> {profile.phone ?? "Not set"}
              </p>
              <p>
                <span className="font-semibold">Role:</span> {profile.role}
              </p>
              <p>
                <span className="font-semibold">Last Login:</span>{" "}
                {profile.last_login_at ? new Date(profile.last_login_at).toLocaleString() : "Never"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-5 w-72" />
              <Skeleton className="h-5 w-40" />
            </div>
          )}
        </div>

        <form onSubmit={updateProfile} className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-5">
          <h3 className="text-lg font-semibold">Profile Settings</h3>
          {role === "agent" && !profile?.expertise_tags?.length ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Complete your agent profile first. Add expertise tags and capacity to unlock the agent workspace.
            </p>
          ) : null}
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" type="tel" required />
          {role === "agent" ? (
            <>
              <Input
                value={expertiseTags}
                onChange={(e) => setExpertiseTags(e.target.value)}
                placeholder="Expertise tags (comma separated)"
              />
              <Input
                value={maxActiveTickets}
                onChange={(e) => setMaxActiveTickets(e.target.value)}
                type="number"
                min={1}
                max={200}
                required
              />
              <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
                Available for assignment
              </label>
            </>
          ) : null}
          <Button type="submit" disabled={isProfileSubmitting}>
            {isProfileSubmitting ? "Saving..." : "Save Profile"}
          </Button>
        </form>

        <form onSubmit={changePassword} className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-5">
          <h3 className="text-lg font-semibold">Change Password</h3>
          <Input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Change Password"}
          </Button>
        </form>
      </section>
    </AppShell>
  );
}
