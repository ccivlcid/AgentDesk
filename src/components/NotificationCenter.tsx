import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { NotificationItem } from "../api/notifications";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../api/notifications";
import type { WSEventType } from "../types";
import TrafficLights from "./desktop/TrafficLights";

type SocketOn = (event: WSEventType, handler: (payload: unknown) => void) => () => void;

type NotifType = NotificationItem["type"] | "all";

interface Props {
  on: SocketOn;
  onNavigateTask?: (taskId: string) => void;
  onOpenDecisionInbox?: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function dateBucket(ts: number): "today" | "yesterday" | "older" {
  const now = new Date();
  const d = new Date(ts);
  if (d.toDateString() === now.toDateString()) return "today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "yesterday";
  return "older";
}

const BUCKET_LABELS = { today: "Today", yesterday: "Yesterday", older: "Older" };

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
const IconTrash = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

const TYPE_ICONS: Record<string, ReactNode> = {
  task_complete: <IconCheck />,
  task_error:    <IconX />,
  decision_created: <IconInbox />,
  agent_error:   <IconAlert />,
  system:        <IconInfo />,
  cost_alert:    <IconAlert />,
  agent_anomaly: <IconAlert />,
};

const TYPE_COLORS: Record<string, string> = {
  task_complete: "#10b981",
  task_error:    "#ef4444",
  agent_error:   "#f59e0b",
  cost_alert:    "#f59e0b",
  agent_anomaly: "#f59e0b",
  decision_created: "#3b82f6",
  system:        "var(--th-text-muted)",
};

const TYPE_FILTERS: Array<{ key: NotifType; label: string; icon: ReactNode | null }> = [
  { key: "all",              label: "All",      icon: null },
  { key: "task_complete",    label: "Done",     icon: <IconCheck /> },
  { key: "task_error",       label: "Error",    icon: <IconX /> },
  { key: "decision_created", label: "Decision", icon: <IconInbox /> },
  { key: "agent_error",      label: "Alert",    icon: <IconAlert /> },
  { key: "system",           label: "Info",     icon: <IconInfo /> },
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
    notif.onclick = () => { window.focus(); notif.close(); };
  } catch { /* ignore */ }
}

/** Single notification row with hover quick-actions */
function NotifRow({
  item,
  isNew,
  onClick,
  onMarkRead,
  onDelete,
}: {
  item: NotificationItem;
  isNew: boolean;
  onClick: () => void;
  onMarkRead: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    setExiting(true);
    setTimeout(() => onDelete(e), 220);
  };

  const iconColor = TYPE_COLORS[item.type] ?? "var(--th-text-muted)";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: "1px solid var(--th-border)",
        background: item.read ? "transparent" : "var(--th-bg-elevated)",
        transform: exiting ? "translateX(320px)" : isNew ? undefined : undefined,
        opacity: exiting ? 0 : 1,
        transition: exiting ? "transform 0.22s ease-in, opacity 0.22s" : "background 0.15s",
        position: "relative",
      }}
    >
      {/* Main clickable area */}
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition"
        style={{ background: "none", border: "none", cursor: "pointer", paddingRight: hovered ? 72 : 16 }}
      >
        <span className="mt-0.5 flex-shrink-0" style={{ color: iconColor }}>
          {TYPE_ICONS[item.type] ?? <IconInfo />}
        </span>
        <div className="min-w-0 flex-1">
          <span
            className="block truncate text-sm font-medium"
            style={{ color: item.read ? "var(--th-text-secondary)" : "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", fontSize: 11 }}
          >
            {item.title}
          </span>
          {item.body && (
            <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", fontSize: 10 }}>
              {item.body}
            </p>
          )}
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[10px]" style={{ color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)" }}>
              {timeAgo(item.created_at)}
            </span>
            {item.agent_name && (
              <span className="text-[10px]" style={{ color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)" }}>
                · {item.agent_avatar ?? ""} {item.agent_name}
              </span>
            )}
          </div>
        </div>
        {!item.read && (
          <span className="mt-2.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: "var(--th-accent)" }} />
        )}
      </button>

      {/* Hover quick-actions */}
      <div
        style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          display: "flex", gap: 4, opacity: hovered ? 1 : 0, pointerEvents: hovered ? "auto" : "none",
          transition: "opacity 0.15s",
        }}
      >
        {!item.read && (
          <button
            type="button"
            onClick={onMarkRead}
            title="Mark read"
            style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, cursor: "pointer", color: "#10b981" }}
          >
            <IconCheck />
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          title="Delete"
          style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, cursor: "pointer", color: "#ef4444" }}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}

export default function NotificationCenter({ on, onNavigateTask, onOpenDecisionInbox }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState<NotifType>("all");
  const [hideRead, setHideRead] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(() =>
    typeof Notification !== "undefined" && Notification.permission === "granted",
  );
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetchNotifications({ limit: 80 })
      .then((res) => {
        setItems(res.notifications);
        setUnreadCount(res.unread_count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return on("notification", (payload) => {
      const n = payload as NotificationItem;
      setItems((prev) => {
        if (prev.some((i) => i.id === n.id)) return prev;
        return [n, ...prev].slice(0, 80);
      });
      setNewIds((prev) => new Set([...prev, n.id]));
      setTimeout(() => setNewIds((prev) => { const s = new Set(prev); s.delete(n.id); return s; }), 2000);
      setUnreadCount((c) => c + 1);
      if (pushEnabled && !document.hasFocus()) showBrowserNotification(n);
    });
  }, [on, pushEnabled]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
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

  const handleClearRead = () => {
    const readIds = items.filter((i) => i.read).map((i) => i.id);
    Promise.allSettled(readIds.map((id) => deleteNotification(id))).then(() => {
      setItems((prev) => prev.filter((i) => !i.read));
    });
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read) {
      markNotificationRead(item.id).catch(() => {});
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: 1 } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (item.type === "decision_created" && onOpenDecisionInbox) {
      onOpenDecisionInbox(); setOpen(false); return;
    }
    if (item.task_id && onNavigateTask) {
      onNavigateTask(item.task_id); setOpen(false);
    }
  };

  const handleMarkRead = (item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.read) {
      markNotificationRead(item.id).catch(() => {});
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: 1 } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const handleDelete = (item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(item.id).catch(() => {});
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (!item.read) setUnreadCount((c) => Math.max(0, c - 1));
  };

  const filtered = (typeFilter === "all" ? items : items.filter((i) => i.type === typeFilter))
    .filter((i) => !hideRead || !i.read);

  // Group by date bucket
  const groups: Array<{ bucket: "today" | "yesterday" | "older"; items: NotificationItem[] }> = [];
  for (const item of filtered) {
    const b = dateBucket(item.created_at);
    const g = groups.find((g) => g.bucket === b);
    if (g) g.items.push(item);
    else groups.push({ bucket: b, items: [item] });
  }

  const readCount = items.filter((i) => i.read).length;

  return (
    <>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="header-action-btn header-action-btn-secondary relative inline-flex h-9 min-w-[2.25rem] items-center justify-center px-2 sm:px-2.5"
        style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}
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

      {/* Backdrop */}
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 399, background: "rgba(0,0,0,0.3)" }} onClick={() => setOpen(false)} />
      )}

      {/* Slide panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed", top: 44, right: 0, width: 320, bottom: 80, zIndex: 400,
          background: "var(--th-bg-surface)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderLeft: "1px solid var(--th-border-strong)", borderTopLeftRadius: 10,
          display: "flex", flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(320px)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* macOS titlebar */}
        <div
          className="flex items-center gap-3 px-3 py-2"
          style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-glass-bg)", minHeight: 40, flexShrink: 0, borderTopLeftRadius: 10 }}
        >
          <TrafficLights onClose={() => setOpen(false)} />
          <span className="text-xs font-semibold tracking-wide flex-1" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
            🔔 Notifications{unreadCount > 0 && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--th-accent)" }}>({unreadCount})</span>}
          </span>
          <div className="flex items-center gap-1">
            {/* Browser push toggle */}
            {typeof Notification !== "undefined" && (
              <button
                type="button"
                title={pushEnabled ? "Browser push ON" : "Browser push OFF"}
                onClick={() => {
                  if (Notification.permission === "granted") {
                    setPushEnabled((v) => !v);
                  } else if (Notification.permission !== "denied") {
                    void Notification.requestPermission().then((p) => setPushEnabled(p === "granted"));
                  }
                }}
                className="inline-flex h-7 w-7 items-center justify-center transition"
                style={{ borderRadius: 0, background: pushEnabled ? "var(--th-green-glow)" : "var(--th-bg-elevated)", color: pushEnabled ? "var(--th-success, #22c55e)" : "var(--th-text-muted)", border: "1px solid var(--th-border)" }}
              >
                {pushEnabled ? <IconBell /> : <IconBellOff />}
              </button>
            )}

            {/* Hide read toggle */}
            <button
              type="button"
              onClick={() => setHideRead((v) => !v)}
              className="inline-flex h-7 items-center justify-center px-2 text-[10px] font-mono transition"
              style={{ borderRadius: 0, background: hideRead ? "rgba(245,158,11,0.15)" : "var(--th-bg-elevated)", color: hideRead ? "var(--th-accent)" : "var(--th-text-muted)", border: "1px solid var(--th-border)" }}
            >
              {hideRead ? "Unread" : "All"}
            </button>

            {/* Mark all read */}
            {unreadCount > 0 && (
              <button
                type="button"
                title="Mark all read"
                onClick={handleMarkAllRead}
                className="inline-flex h-7 items-center justify-center px-2 text-[10px] font-mono transition"
                style={{ borderRadius: 0, color: "#10b981", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
              >
                ✓ all
              </button>
            )}

            {/* Clear read */}
            {readCount > 0 && (
              <button
                type="button"
                title="Delete all read"
                onClick={handleClearRead}
                className="inline-flex h-7 w-7 items-center justify-center transition"
                style={{ borderRadius: 0, color: "#ef4444", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
              >
                <IconTrash />
              </button>
            )}
          </div>
        </div>

        {/* Type filter chips */}
        <div
          className="flex items-center gap-1 px-3 py-2 overflow-x-auto"
          style={{ borderBottom: "1px solid var(--th-border)", flexShrink: 0 }}
        >
          {TYPE_FILTERS.map((f) => {
            const active = typeFilter === f.key;
            const count = f.key === "all" ? items.filter((i) => !i.read).length : items.filter((i) => i.type === f.key && !i.read).length;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setTypeFilter(f.key)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition whitespace-nowrap"
                style={{ borderRadius: 0, background: active ? "var(--th-accent)" : "var(--th-bg-elevated)", color: active ? "#fff" : "var(--th-text-secondary)", border: active ? "none" : "1px solid var(--th-border)" }}
              >
                {f.icon}
                {f.label}
                {count > 0 && (
                  <span style={{ background: active ? "rgba(255,255,255,0.25)" : "var(--th-border)", borderRadius: 8, padding: "0 4px", minWidth: 14, textAlign: "center" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification list with date groups */}
        <div className="overflow-y-auto flex-1">
          {groups.length === 0 && (
            <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", fontSize: 11 }}>
              {hideRead ? "No unread notifications" : "No notifications"}
            </div>
          )}

          {groups.map(({ bucket, items: groupItems }) => (
            <div key={bucket}>
              {/* Date section header */}
              <div style={{ padding: "6px 16px 4px", fontFamily: "var(--th-font-mono)", fontSize: 9, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", background: "var(--th-bg-panel)", borderBottom: "1px solid var(--th-border)", position: "sticky", top: 0, zIndex: 1 }}>
                {BUCKET_LABELS[bucket]}
                <span style={{ marginLeft: 6, color: "var(--th-border)" }}>
                  {groupItems.filter((i) => !i.read).length > 0 && `${groupItems.filter((i) => !i.read).length} unread`}
                </span>
              </div>

              {groupItems.map((item) => (
                <NotifRow
                  key={item.id}
                  item={item}
                  isNew={newIds.has(item.id)}
                  onClick={() => handleItemClick(item)}
                  onMarkRead={(e) => handleMarkRead(item, e)}
                  onDelete={(e) => handleDelete(item, e)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Footer summary */}
        {items.length > 0 && (
          <div style={{ padding: "6px 14px", borderTop: "1px solid var(--th-border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 10, color: "var(--th-text-muted)" }}>
              {items.length} total · {unreadCount} unread
            </span>
            {readCount > 0 && (
              <button
                type="button"
                onClick={handleClearRead}
                style={{ fontFamily: "var(--th-font-mono)", fontSize: 10, color: "#ef444499", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Clear {readCount} read
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
