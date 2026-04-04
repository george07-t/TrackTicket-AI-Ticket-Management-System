import axios from "axios";

import { clearAuthSession, getToken } from "./auth";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

// Strip the /api suffix to get the backend origin for serving static uploads.
const mediaBase = baseURL.replace(/\/api\/?$/, "");
const apiBase = baseURL.replace(/\/$/, "");

/** Convert a backend-relative path like /uploads/abc.jpg into an absolute URL. */
export function getMediaUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  // Upload API returns paths like /uploads/foo.jpg; in production we route backend via /api.
  if (path.startsWith("/uploads/")) {
    return `${apiBase}${path}`;
  }

  return `${mediaBase}${path}`;
}

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

export function getApiErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const first = detail[0]?.msg;
      if (typeof first === "string") return first;
    }
  }
  return fallback;
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error?.config?.url ?? "";
    const isPublicAuthCall = [
      "/auth/login",
      "/auth/register",
      "/auth/forgot-password",
      "/auth/verify-reset-otp",
      "/auth/reset-password",
      "/auth/verify-email-otp",
      "/auth/resend-email-otp",
    ].some((endpoint) => url.includes(endpoint));

    if (error?.response?.status === 401 && typeof window !== "undefined" && !isPublicAuthCall) {
      clearAuthSession();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
