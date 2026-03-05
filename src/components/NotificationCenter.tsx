import { useState, useEffect, useCallback, useRef } from "react";
import type { NotificationItem } from "../api/notifications";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api/notifications";
import type { WSEventType } from "../types";

type SocketOn = (event: WSEventType, handler: (payload: unknown) => void) => () => void;

interface Props {
  on: SocketOn;
  onNavigateTask?: (taskId: string) => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const TYPE_ICON: Record<string, string> = {
  task_complete: "✅",
  task_error: "❌",
  decision_created: "📬",
  agent_error: "⚠️",
  system: "ℹ️",
};

export default function NotificationCenter({ on, onNavigateTask }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetchNotifications({ limit: 50 })
      .then((res) => {
        setItems(res.notifications);
        setUnreadCount(res.unread_count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return on("notification", (payload) => {
      const n = payload as NotificationItem;
      setItems((prev) => {
        if (prev.some((i) => i.id === n.id)) return prev;
        return [n, ...prev].slice(0, 50);
      });
      setUnreadCount((c) => c + 1);
    });
  }, [on]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleMarkAllRead = () => {
    markAllNotificationsRead()
      .then(() => {
        setItems((prev) => prev.map((i) => ({ ...i, read: 1 })));
        setUnreadCount(0);
      })
      .catch(() => {});
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read) {
      markNotificationRead(item.id).catch(() => {});
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: 1 } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (item.task_id && onNavigateTask) {
      onNavigateTask(item.task_id);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="header-action-btn header-action-btn-secondary"
        aria-label="Notifications"
      >
        <span className="sm:hidden">🔔</span>
        <span className="hidden sm:inline">🔔</span>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
            style={{ background: "var(--th-accent, #ef4444)" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[340px] max-h-[420px] overflow-hidden rounded-xl shadow-xl"
          style={{
            border: "1px solid var(--th-border)",
            background: "var(--th-bg-surface)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid var(--th-border)" }}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs hover:underline"
                style={{ color: "var(--th-text-link, var(--th-accent, #3b82f6))" }}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
            {items.length === 0 && (
              <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--th-text-muted)" }}>
                No notifications
              </div>
            )}
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition hover:opacity-80"
                style={{
                  borderBottom: "1px solid var(--th-border)",
                  background: item.read ? "transparent" : "var(--th-bg-elevated, rgba(59,130,246,0.06))",
                }}
              >
                <span className="mt-0.5 flex-shrink-0 text-base">{TYPE_ICON[item.type] ?? "📌"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {item.agent_avatar && <span className="text-sm">{item.agent_avatar}</span>}
                    <span
                      className="truncate text-sm font-medium"
                      style={{ color: item.read ? "var(--th-text-secondary)" : "var(--th-text-primary)" }}
                    >
                      {item.title}
                    </span>
                  </div>
                  {item.body && (
                    <p
                      className="mt-0.5 truncate text-xs"
                      style={{ color: "var(--th-text-muted)" }}
                    >
                      {item.body}
                    </p>
                  )}
                  <span className="mt-0.5 text-[10px]" style={{ color: "var(--th-text-muted)" }}>
                    {timeAgo(item.created_at)}
                  </span>
                </div>
                {!item.read && (
                  <span
                    className="mt-2 h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: "var(--th-accent, #3b82f6)" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
