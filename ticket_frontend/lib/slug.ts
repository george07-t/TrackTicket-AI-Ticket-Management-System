import { Ticket } from "./types";

/** UUID v4 pattern — 8-4-4-4-12 hex groups */
const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Convert any string to a URL-safe slug. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Build a human-readable URL segment for a ticket.
 * Format: {title-slug}-{full-uuid}
 * Example: "login-page-broken-d8a12b85-2b03-474a-b65d-844e6452bc0f"
 */
export function ticketSlug(ticket: Pick<Ticket, "id" | "title">): string {
  return `${slugify(ticket.title)}-${ticket.id}`;
}

/**
 * Extract the raw UUID from a ticket URL slug.
 * Works whether the param is a plain UUID or a slugged form.
 */
export function extractTicketId(param: string): string {
  const match = param.match(UUID_RE);
  return match ? match[0] : param;
}

/**
 * Derive a display name from an upload URL.
 * "/uploads/my-screenshot-a3f9c12b.png" → "my-screenshot-a3f9c12b"
 */
export function attachmentName(url: string): string {
  const filename = url.split("/").pop() ?? url;
  return filename.replace(/\.[^.]+$/, ""); // strip extension
}
