"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { Value as PhoneValue } from "react-phone-number-input";
import { PhoneField } from "@/components/ui/phone-field";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getApiErrorMessage } from "@/lib/api";
import { User } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function PasswordInput({
  placeholder,
  value,
  onChange,
  required,
  minLength,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="pr-10"
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <p className="text-sm font-medium text-[var(--ink)]">{value}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700",
    agent: "bg-blue-100 text-blue-700",
    customer: "bg-slate-100 text-slate-700",
  };
  return (
    <span className={`inline-flex rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${colors[role] ?? colors.customer}`}>
      {role}
    </span>
  );
}

export default function ProfilePage() {
  const { role, hydrate, hydrated, token, login } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState<PhoneValue | undefined>(undefined);
  const [expertiseTags, setExpertiseTags] = useState("");
  const [maxActiveTickets, setMaxActiveTickets] = useState("10");
  const [isAvailable, setIsAvailable] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.get<User>("/auth/me");
        setProfile(response.data);
        setFullName(response.data.full_name);
        setPhone(response.data.phone as PhoneValue | undefined);
        setExpertiseTags((response.data.expertise_tags ?? []).join(", "));
        setMaxActiveTickets(String(response.data.max_active_tickets ?? 10));
        setIsAvailable(response.data.is_available ?? true);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load profile"));
      } finally {
        setIsLoading(false);
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
      const payload: Record<string, unknown> = { full_name: fullName, phone: phone ?? "" };
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

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  return (
    <AppShell role={role}>
      <section className="fade-in space-y-6">
        <h2 className="font-[var(--font-display)] text-2xl font-bold">My Profile</h2>

        <div className="rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton circle width={64} height={64} />
                <div className="flex-1 space-y-2">
                  <Skeleton width={200} height={20} />
                  <Skeleton width={240} height={16} />
                </div>
                <Skeleton width={70} height={24} borderRadius={999} />
              </div>
              <hr className="border-[var(--line)]" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton width={60} height={12} />
                    <Skeleton width={120} height={16} />
                  </div>
                ))}
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xl font-bold text-white shadow">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-[var(--ink)] truncate">{profile.full_name}</h3>
                  <p className="text-sm text-[var(--muted)] truncate">{profile.email}</p>
                </div>
                <RoleBadge role={profile.role} />
              </div>
              <hr className="border-[var(--line)]" />
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
                <InfoRow label="Phone" value={profile.phone ?? "Not set"} />
                <InfoRow
                  label="Last Login"
                  value={profile.last_login_at ? new Date(profile.last_login_at).toLocaleString() : "Never"}
                />
                <InfoRow label="Member Since" value={new Date(profile.created_at).toLocaleDateString()} />
                {profile.role === "agent" && (
                  <>
                    <InfoRow
                      label="Expertise"
                      value={profile.expertise_tags?.length ? profile.expertise_tags.join(", ") : "Not set"}
                    />
                    <InfoRow label="Max Tickets" value={String(profile.max_active_tickets ?? 10)} />
                    <InfoRow label="Availability" value={profile.is_available ? "Available" : "Unavailable"} />
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={updateProfile} className="rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--ink)]">Edit Profile</h3>
              <p className="mt-0.5 text-sm text-[var(--muted)]">Update your personal information</p>
            </div>

            {role === "agent" && !profile?.expertise_tags?.length ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                Add expertise tags and capacity to unlock the agent workspace.
              </p>
            ) : null}

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Full Name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Phone Number</label>
              <PhoneField value={phone} onChange={setPhone} />
            </div>

            {role === "agent" ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Expertise Tags</label>
                  <Input
                    value={expertiseTags}
                    onChange={(e) => setExpertiseTags(e.target.value)}
                    placeholder="billing, technical, account"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Max Active Tickets</label>
                  <Input
                    value={maxActiveTickets}
                    onChange={(e) => setMaxActiveTickets(e.target.value)}
                    type="number"
                    min={1}
                    max={200}
                    required
                  />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="rounded"
                  />
                  Available for assignment
                </label>
              </>
            ) : null}

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={isProfileSubmitting}>
                {isProfileSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>

          <form onSubmit={changePassword} className="rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--ink)]">Change Password</h3>
              <p className="mt-0.5 text-sm text-[var(--muted)]">Keep your account secure</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Current Password</label>
              <PasswordInput
                placeholder="Enter current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">New Password</label>
              <PasswordInput
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={setNewPassword}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Confirm New Password</label>
              <PasswordInput
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
                minLength={8}
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Change Password"}
              </Button>
            </div>
          </form>

        </div>
      </section>
    </AppShell>
  );
}
