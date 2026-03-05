import { request, post, del } from "./core";

export interface NotificationItem {
  id: string;
  type: "task_complete" | "task_error" | "decision_created" | "agent_error" | "system";
  title: string;
  body: string | null;
  task_id: string | null;
  agent_id: string | null;
  read: number;
  created_at: number;
  agent_name: string;
  agent_name_ko: string;
  agent_avatar: string;
}

interface NotificationsResponse {
  ok: boolean;
  notifications: NotificationItem[];
  unread_count: number;
}

export function fetchNotifications(opts?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.unreadOnly) params.set("unread", "1");
  const qs = params.toString();
  return request<NotificationsResponse>(`/api/notifications${qs ? `?${qs}` : ""}`);
}

export function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>(`/api/notifications/${id}/read`);
}

export function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>("/api/notifications/read-all");
}

export function deleteNotification(id: string): Promise<{ ok: boolean }> {
  return del<{ ok: boolean }>(`/api/notifications/${id}`);
}
