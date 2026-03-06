import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { NotificationItem } from "../api/notifications";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api/notifications";
import type { WSEventType } from "../types";

type SocketOn = (event: WSEventType, handler: (payload: unknown) => void) => () => void;

type NotifType = NotificationItem["type"] | "all";

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

const iconSize = 16;
const iconClass = "shrink-0";

const IconBell = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconBellOff = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    <path d="M18.63 13A17.69 17.69 0 0 0 18 8a6 6 0 0 0-9-5.63" />
    <path d="M6 18H6.01" />
    <path d="M3 3l18 18" />
  </svg>
);
const IconCheck = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const IconX = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const IconInbox = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
  </svg>
);
const IconAlert = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);
const IconInfo = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);
const IconPin = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
    <path d="m12 17-4 4V3l4 4 4-4v18l-4-4z" />
  </svg>
);

const TYPE_ICONS: Record<string, ReactNode> = {
  task_complete: <IconCheck />,
  task_error: <IconX />,
  decision_created: <IconInbox />,
  agent_error: <IconAlert />,
  system: <IconInfo />,
};

const TYPE_FILTERS: Array<{ key: NotifType; label: string; icon: ReactNode | null }> = [
  { key: "all", label: "All", icon: null },
  { key: "task_complete", label: "Done", icon: <IconCheck /> },
  { key: "task_error", label: "Error", icon: <IconX /> },
  { key: "decision_created", label: "Decision", icon: <IconInbox /> },
  { key: "agent_error", label: "Alert", icon: <IconAlert /> },
  { key: "system", label: "Info", icon: <IconInfo /> },
];

const TYPE_LABEL: Record<string, string> = {
  task_complete: "Task",
  task_error: "Error",
  decision_created: "Decision",
  agent_error: "Alert",
  system: "Info",
};

function showBrowserNotification(n: NotificationItem): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const prefix = TYPE_LABEL[n.type] ?? "Notification";
  try {
    const notif = new Notification(`${prefix}: ${n.title}`, {
      body: n.body ?? undefined,
      tag: n.id,
      silent: false,
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch {
    // Notification constructor may fail in some contexts
  }
}

export default function NotificationCenter({ on, onNavigateTask }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState<NotifType>("all");
  const [pushEnabled, setPushEnabled] = useState(() =>
    typeof Notification !== "undefined" && Notification.permission === "granted",
  );
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
      if (pushEnabled && !document.hasFocus()) {
        showBrowserNotification(n);
      }
    });
  }, [on, pushEnabled]);

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

  const filteredItems = typeFilter === "all" ? items : items.filter((i) => i.type === typeFilter);

  return (
    <div className="relative inline-flex" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="header-action-btn header-action-btn-secondary relative inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl px-2 sm:px-2.5"
        style={{
          border: "1px solid var(--th-border)",
          background: "var(--th-bg-surface)",
          color: "var(--th-text-secondary)",
        }}
        aria-label="Notifications"
      >
        <IconBell />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
            style={{ background: "var(--th-danger, #ef4444)" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[340px] max-h-[420px] overflow-hidden rounded-xl shadow-xl backdrop-blur-xl"
          style={{
            border: "1px solid var(--th-border)",
            background: "var(--th-bg-surface)",
          }}
        >
          <div
            className="flex items-center justify-between gap-3 px-4 py-3"
            style={{ borderBottom: "1px solid var(--th-border)" }}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
              Notifications
            </span>
            <div className="flex items-center gap-2">
              {typeof Notification !== "undefined" && (
                <button
                  type="button"
                  onClick={() => {
                    if (Notification.permission === "granted") {
                      setPushEnabled((v) => !v);
                    } else if (Notification.permission !== "denied") {
                      Notification.requestPermission().then((perm) => {
                        setPushEnabled(perm === "granted");
                      });
                    }
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition"
                  style={{
                    background: pushEnabled ? "var(--th-success, #22c55e)" : "var(--th-bg-elevated)",
                    color: pushEnabled ? "#fff" : "var(--th-text-muted)",
                    border: "1px solid var(--th-border)",
                  }}
                  title={pushEnabled ? "Browser push ON" : "Browser push OFF"}
                  aria-label={pushEnabled ? "Disable browser notifications" : "Enable browser notifications"}
                >
                  {pushEnabled ? <IconBell /> : <IconBellOff />}
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium rounded-lg px-2 py-1 transition"
                  style={{ color: "var(--th-text-link, var(--th-accent, #3b82f6))" }}
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>
          {/* Type filter */}
          <div
            className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto"
            style={{ borderBottom: "1px solid var(--th-border)" }}
          >
            {TYPE_FILTERS.map((f) => {
              const active = typeFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setTypeFilter(f.key)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg transition whitespace-nowrap"
                  style={{
                    background: active ? "var(--th-accent, #3b82f6)" : "var(--th-bg-elevated)",
                    color: active ? "#fff" : "var(--th-text-secondary)",
                    border: active ? "none" : "1px solid var(--th-border)",
                  }}
                >
                  {f.icon}
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 330 }}>
            {filteredItems.length === 0 && (
              <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--th-text-muted)" }}>
                No notifications
              </div>
            )}
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition"
                style={{
                  borderBottom: "1px solid var(--th-border)",
                  background: item.read ? "transparent" : "var(--th-bg-elevated)",
                  color: "var(--th-text-primary)",
                }}
              >
                <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--th-text-secondary)" }}>
                  {TYPE_ICONS[item.type] ?? <IconPin />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="truncate text-sm font-medium"
                      style={{ color: item.read ? "var(--th-text-secondary)" : "var(--th-text-primary)" }}
                    >
                      {item.title}
                    </span>
                  </div>
                  {item.body && (
                    <p
                      className="mt-0.5 line-clamp-2 text-xs"
                      style={{ color: "var(--th-text-muted)" }}
                    >
                      {item.body}
                    </p>
                  )}
                  <span className="mt-1 inline-block text-[10px]" style={{ color: "var(--th-text-muted)" }}>
                    {timeAgo(item.created_at)}
                  </span>
                </div>
                {!item.read && (
                  <span
                    className="mt-2.5 h-2 w-2 flex-shrink-0 rounded-full"
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
