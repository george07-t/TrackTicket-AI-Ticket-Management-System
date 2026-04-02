export type Role = "admin" | "agent" | "customer";
export type Status = "open" | "in_progress" | "resolved" | "closed";
export type Priority = "low" | "medium" | "high" | "critical";
export type Category = "billing" | "technical" | "account" | "general";

export interface User {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  role: Role;
  email_verified: boolean;
  is_active: boolean;
  is_available: boolean;
  expertise_tags: string[];
  max_active_tickets: number;
  last_login_at: string | null;
  created_at: string;
}

export interface TicketActivity {
  id: string;
  action: string;
  detail: string | null;
  actor: User | null;
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
  ai_confidence_note: string | null;
  ai_classified: boolean;
  ai_suggested_agent_id: string | null;
  ai_assignment_confidence: number | null;
  assignment_method: string;
  reassignment_count: number;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  first_response_at: string | null;
  creator: User;
  assignee: User | null;
  ai_suggested_agent: User | null;
  activities?: TicketActivity[];
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
  tickets: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    unassigned: number;
    ai_classified: number;
    ai_pending: number;
  };
  avg_resolution_hours: number;
  assignment_quality: {
    reassignment_rate: number;
    avg_first_response_minutes: number;
    reassigned_tickets: number;
    assigned_tickets: number;
  };
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  resolution_by_agent: { agent: string; avg_resolution_hours: number; resolved_count: number }[];
  resolution_by_category: { category: string; avg_resolution_hours: number; resolved_count: number }[];
  agent_workload: { agent: string; open_tickets: number }[];
  users: { total_customers: number; total_agents: number };
}

export interface AgentStats {
  assigned_total: number;
  open: number;
  resolved: number;
  critical_open: number;
}

export interface TicketListQuery {
  status?: Status;
  category?: Category;
  priority?: Priority;
  page?: number;
  page_size?: number;
}
