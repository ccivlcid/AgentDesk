import { useEffect, useState } from "react";
import type { CustomFeatureConfig } from "../../../../types";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: number;
  is_read: number;
}

const TYPE_ICON: Record<string, string> = {
  task_error: "✕",
  agent_error: "⚠",
  decision_created: "?",
  cost_alert: "$",
  task_complete: "✓",
};

export default function NotificationFilterFeed({ config }: { config: CustomFeatureConfig }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const filterType = (config.params?.types as string | undefined) ?? "task_error";

  useEffect(() => {
    const load = () =>
      fetch("http://127.0.0.1:8790/api/notifications?limit=30")
        .then((r) => r.json())
        .then((j) => {
          const all: Notification[] = j.notifications ?? [];
          setNotifications(all.filter((n) => n.type === filterType));
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [filterType]);

  if (notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>
        알림 없음
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto h-full">
      {notifications.map((n) => (
        <div key={n.id} className="flex items-start gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--th-border)", background: n.is_read ? "transparent" : "rgba(245,158,11,0.06)" }}>
          <span style={{ ...mono, fontSize: 12, color: "var(--th-accent)", flexShrink: 0 }}>{TYPE_ICON[n.type] ?? "·"}</span>
          <span style={{ ...mono, fontSize: 10, color: "var(--th-text-primary)", flex: 1 }} className="line-clamp-2">{n.message}</span>
        </div>
      ))}
    </div>
  );
}
