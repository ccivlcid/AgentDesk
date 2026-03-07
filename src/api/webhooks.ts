export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret: string | null;
  created_at: number;
  updated_at: number;
}

export interface WebhookPayload {
  name: string;
  url: string;
  events?: string[];
  secret?: string;
}

export const WEBHOOK_EVENTS = [
  { value: "task_done", label: "Task completed" },
  { value: "task_review", label: "Task in review" },
  { value: "task_failed", label: "Task failed" },
];

export async function getWebhooks(): Promise<Webhook[]> {
  const res = await fetch("/api/webhooks");
  const data = (await res.json()) as { ok: boolean; webhooks: Webhook[] };
  return data.webhooks ?? [];
}

export async function createWebhook(payload: WebhookPayload): Promise<string> {
  const res = await fetch("/api/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { ok: boolean; id: string };
  return data.id;
}

export async function updateWebhook(id: string, patch: Partial<WebhookPayload & { enabled: boolean }>): Promise<void> {
  await fetch(`/api/webhooks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function deleteWebhook(id: string): Promise<void> {
  await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
}

export async function testWebhook(id: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const res = await fetch(`/api/webhooks/${id}/test`, { method: "POST" });
  return (await res.json()) as { ok: boolean; status?: number; error?: string };
}
