export type Role = "admin" | "agent" | "customer";
export type Status = "open" | "in_progress" | "resolved" | "closed";
export type Priority = "low" | "medium" | "high" | "critical";
export type Category = "billing" | "technical" | "account" | "general";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority | null;
  category: Category | null;
  ai_suggested_response: string | null;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  creator: User;
  assignee: User | null;
}

export interface Comment {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  author: User;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export interface DashboardStats {
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  avg_resolution_time_hours: number;
  tickets_by_category: Record<string, number>;
  tickets_by_priority: Record<string, number>;
}
