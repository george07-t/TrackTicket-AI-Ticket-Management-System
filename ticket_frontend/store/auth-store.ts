"use client";

import { create } from "zustand";

import { clearAuthSession, getStoredUser, getToken, setAuthSession } from "@/lib/auth";
import { Role, User } from "@/lib/types";

interface AuthState {
  token: string | null;
  user: User | null;
  role: Role | null;
  hydrated: boolean;
  hydrate: () => void;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  role: null,
  hydrated: false,
  hydrate: () => {
    const token = getToken();
    const user = getStoredUser();
    set({ token, user, role: user?.role ?? null, hydrated: true });
  },
  login: (token, user) => {
    setAuthSession(token, user);
    set({ token, user, role: user.role });
  },
  logout: () => {
    clearAuthSession();
    set({ token: null, user: null, role: null });
  },
}));
