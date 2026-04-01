import { Role, User } from "./types";

const TOKEN_KEY = "ticket_auth_token";
const USER_KEY = "ticket_auth_user";

export function setAuthSession(token: string, user: User): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `auth_token=${token}; path=/; max-age=86400`;
  document.cookie = `auth_role=${user.role}; path=/; max-age=86400`;
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = "auth_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getRolePath(role: Role): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "agent") return "/agent/dashboard";
  return "/customer/dashboard";
}
