import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { NotificationItem } from "../api/notifications";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../api/notifications";
import type { WSEventType } from "../types";
import TrafficLights from "./desktop/TrafficLights";
import { useUiStore } from "../store/uiStore";

type SocketOn = (event: WSEventType, handler: (payload: unknown) => void) => () => void;
type NotifType = NotificationItem["type"] | "all";

interface Props {
  on: SocketOn;
  onNavigateTask?: (taskId: string) => void;
  onOpenDecisionInbox?: () => void;
}

const mono = "var(--th-font-mono)";

// ─── Utils ────────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "방금";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return `${Math.floor(diff / 86_400_000)}일 전`;
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

const BUCKET_LABELS = { today: "오늘", yesterday: "어제", older: "이전" };

// ─── Icons ────────────────────────────────────────────────────────────────────

const SZ = 14;

const IconBell = ({ size = SZ }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconBellOff = ({ size = SZ }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.69 17.69 0 0 0 18 8a6 6 0 0 0-9-5.63" /><path d="M6 18H6.01" /><path d="M3 3l18 18" />
  </svg>
);
const IconCheck = ({ size = SZ }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const IconX = ({ size = SZ }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const IconInbox = ({ size = SZ }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.47 5.19 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.47-6.81A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.77 1.19z" />
  </svg>
);
const IconAlert = ({ size = SZ }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" />
  </svg>
);
const IconInfo = ({ size = SZ }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
  </svg>
);
const IconTrash = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

// ─── Type config ──────────────────────────────────────────────────────────────

const IconShield = ({ size = SZ }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconRefresh = ({ size = SZ }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconTag = ({ size = SZ }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);
const IconRocket = ({ size = SZ }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);
const IconPlay = ({ size = SZ }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const TYPE_ICONS: Record<string, ReactNode> = {
  task_complete:    <IconCheck />,
  task_error:       <IconX />,
  task_started:     <IconPlay />,
  kickoff:          <IconRocket />,
  decision_created: <IconInbox />,
  agent_error:      <IconAlert />,
  system:           <IconInfo />,
  cost_alert:       <IconAlert />,
  agent_anomaly:    <IconAlert />,
  pm_approved:      <IconShield />,
  pm_revision:      <IconRefresh />,
  version_released: <IconTag />,
};

const TYPE_COLORS: Record<string, string> = {
  task_complete:    "#30d158",
  task_error:       "#ff453a",
  task_started:     "#0a84ff",
  kickoff:          "#bf5af2",
  agent_error:      "#ff9f0a",
  cost_alert:       "#ff9f0a",
  agent_anomaly:    "#ff9f0a",
  decision_created: "#0a84ff",
  system:           "var(--th-text-muted)",
  pm_approved:      "#30d158",
  pm_revision:      "#ff9f0a",
  version_released: "#5e5ce6",
};

const TYPE_BG: Record<string, string> = {
  task_complete:    "rgba(48,209,88,0.08)",
  task_error:       "rgba(255,69,58,0.08)",
  task_started:     "rgba(10,132,255,0.08)",
  kickoff:          "rgba(191,90,242,0.08)",
  agent_error:      "rgba(255,159,10,0.08)",
  cost_alert:       "rgba(255,159,10,0.08)",
  agent_anomaly:    "rgba(255,159,10,0.08)",
  decision_created: "rgba(10,132,255,0.08)",
  system:           "rgba(120,120,128,0.06)",
  pm_approved:      "rgba(48,209,88,0.08)",
  pm_revision:      "rgba(255,159,10,0.08)",
  version_released: "rgba(94,92,230,0.08)",
};

/** Filter groups: some filters map to multiple notification types */
const PM_TYPES = new Set<string>(["pm_approved", "pm_revision", "version_released"]);

function matchesFilter(type: string, filter: NotifType): boolean {
  if (filter === "all") return true;
  if (filter === "pm_approved") return PM_TYPES.has(type);
  return type === filter;
}

const TYPE_FILTERS: Array<{ key: NotifType; label: string; icon: ReactNode | null }> = [
  { key: "all",              label: "전체",    icon: null },
  { key: "task_complete",    label: "완료",    icon: <IconCheck size={11} /> },
  { key: "task_error",       label: "오류",    icon: <IconX size={11} /> },
  { key: "pm_approved",      label: "PM",      icon: <IconShield size={11} /> },
  { key: "decision_created", label: "결정",    icon: <IconInbox size={11} /> },
  { key: "agent_error",      label: "경고",    icon: <IconAlert size={11} /> },
  { key: "system",           label: "정보",    icon: <IconInfo size={11} /> },
];

function showBrowserNotification(n: NotificationItem): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const notif = new Notification(n.title, { body: n.body ?? undefined, tag: n.id, silent: false });
    notif.onclick = () => { window.focus(); notif.close(); };
  } catch { /* ignore */ }
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotifRow({
  item, isNew, onClick, onMarkRead, onDelete,
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
    setTimeout(() => onDelete(e), 200);
  };

  const color = TYPE_COLORS[item.type] ?? "var(--th-text-muted)";
  const bg = TYPE_BG[item.type] ?? "transparent";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        margin: "3px 8px",
        borderRadius: 8,
        background: hovered
          ? (item.read ? "var(--th-hover-overlay)" : bg)
          : (item.read ? "transparent" : bg),
        border: `1px solid ${item.read ? "transparent" : `${color}22`}`,
        transform: exiting ? "translateX(340px) scale(0.95)" : isNew ? "scale(1.01)" : "none",
        opacity: exiting ? 0 : 1,
        transition: exiting
          ? "transform 0.2s ease-in, opacity 0.2s"
          : "background 0.12s, transform 0.15s, border-color 0.12s",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left accent bar for unread */}
      {!item.read && (
        <div style={{
          position: "absolute", left: 0, top: 6, bottom: 6,
          width: 3, borderRadius: "0 3px 3px 0",
          background: color,
        }} />
      )}

      <button
        type="button"
        onClick={onClick}
        style={{
          display: "flex", width: "100%", alignItems: "flex-start",
          gap: 10, padding: "10px 12px 10px 14px",
          background: "none", border: "none", cursor: "pointer",
          paddingRight: hovered ? 72 : 12,
          transition: "padding-right 0.1s",
        }}
      >
        {/* Type icon */}
        <span style={{
          marginTop: 1, flexShrink: 0,
          width: 26, height: 26, borderRadius: 7,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color,
        }}>
          {TYPE_ICONS[item.type] ?? <IconInfo />}
        </span>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: mono, fontSize: 11, fontWeight: item.read ? 400 : 600,
            color: item.read ? "var(--th-text-secondary)" : "var(--th-text-primary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.4,
          }}>
            {item.title}
          </div>
          {item.body && (
            <div style={{
              fontFamily: mono, fontSize: 10,
              color: "var(--th-text-muted)",
              marginTop: 2, lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {item.body}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
              {timeAgo(item.created_at)}
            </span>
            {item.agent_name && (
              <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                · {item.agent_avatar ?? ""} {item.agent_name}
              </span>
            )}
          </div>
        </div>

        {/* Unread dot */}
        {!item.read && (
          <span style={{
            marginTop: 6, flexShrink: 0,
            width: 7, height: 7, borderRadius: "50%",
            background: color,
            boxShadow: `0 0 5px ${color}`,
          }} />
        )}
      </button>

      {/* Hover actions */}
      <div style={{
        position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
        display: "flex", gap: 4,
        opacity: hovered ? 1 : 0, pointerEvents: hovered ? "auto" : "none",
        transition: "opacity 0.12s",
      }}>
        {!item.read && (
          <button
            type="button"
            onClick={onMarkRead}
            title="읽음 표시"
            style={{
              width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(48,209,88,0.1)",
              border: "1px solid rgba(48,209,88,0.3)",
              borderRadius: 6, cursor: "pointer", color: "#30d158",
            }}
          >
            <IconCheck size={12} />
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          title="삭제"
          style={{
            width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,69,58,0.1)",
            border: "1px solid rgba(255,69,58,0.3)",
            borderRadius: 6, cursor: "pointer", color: "#ff453a",
          }}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotificationCenter({ on, onNavigateTask, onOpenDecisionInbox }: Props) {
  const setNotificationUnreadCount = useUiStore((s) => s.setNotificationUnreadCount);
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
        setNotificationUnreadCount(res.unread_count);
      })
      .catch(() => {});
  }, [setNotificationUnreadCount]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setNotificationUnreadCount(unreadCount);
  }, [unreadCount, setNotificationUnreadCount]);

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
      .then(() => { setItems((prev) => prev.map((i) => ({ ...i, read: 1 }))); setUnreadCount(0); setNotificationUnreadCount(0); })
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
    if (item.type === "decision_created" && onOpenDecisionInbox) { onOpenDecisionInbox(); setOpen(false); return; }
    if (item.task_id && onNavigateTask) { onNavigateTask(item.task_id); setOpen(false); }
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

  const filtered = items.filter((i) => matchesFilter(i.type, typeFilter))
    .filter((i) => !hideRead || !i.read);

  const groups: Array<{ bucket: "today" | "yesterday" | "older"; items: NotificationItem[] }> = [];
  for (const item of filtered) {
    const b = dateBucket(item.created_at);
    const g = groups.find((g) => g.bucket === b);
    if (g) g.items.push(item);
    else groups.push({ bucket: b, items: [item] });
  }

  const readCount = items.filter((i) => i.read).length;

  const portalContent = (
    <>
      {/* ── Backdrop ── */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 949, background: "rgba(0,0,0,0.25)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Slide panel ── */}
      <div
        ref={panelRef}
        style={{
          position: "fixed", top: 44, right: 0, width: 340, bottom: 48,
          zIndex: 950,
          background: "var(--th-bg-surface)",
          backdropFilter: "blur(28px) saturate(160%)",
          WebkitBackdropFilter: "blur(28px) saturate(160%)",
          borderLeft: "1px solid var(--th-border-strong)",
          borderTopLeftRadius: 12,
          display: "flex", flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(340px)",
          transition: "transform 0.26s cubic-bezier(0.32, 0, 0.15, 1)",
          pointerEvents: open ? "auto" : "none",
          boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {/* ── Titlebar ── */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "0 14px",
          height: 44,
          background: "var(--th-bg-elevated)",
          borderBottom: "1px solid var(--th-border)",
          borderTopLeftRadius: 12,
          flexShrink: 0,
          gap: 10,
        }}>
          <TrafficLights onClose={() => setOpen(false)} />

          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
            <span style={{ color: "var(--th-text-muted)", display: "flex" }}><IconBell size={13} /></span>
            <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "var(--th-text-primary)" }}>
              알림
            </span>
            {unreadCount > 0 && (
              <span style={{
                fontFamily: mono, fontSize: 10, fontWeight: 700,
                padding: "1px 7px", borderRadius: 20,
                background: "rgba(255,69,58,0.12)",
                border: "1px solid rgba(255,69,58,0.3)",
                color: "#ff453a",
              }}>
                {unreadCount}
              </span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {/* Browser push toggle */}
            {typeof Notification !== "undefined" && (
              <button
                type="button"
                title={pushEnabled ? "브라우저 알림 ON" : "브라우저 알림 OFF"}
                onClick={() => {
                  if (Notification.permission === "granted") {
                    setPushEnabled((v) => !v);
                  } else if (Notification.permission !== "denied") {
                    void Notification.requestPermission().then((p) => setPushEnabled(p === "granted"));
                  }
                }}
                style={{
                  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 7,
                  background: pushEnabled ? "rgba(48,209,88,0.12)" : "var(--th-hover-overlay)",
                  border: `1px solid ${pushEnabled ? "rgba(48,209,88,0.3)" : "var(--th-border)"}`,
                  color: pushEnabled ? "#30d158" : "var(--th-text-muted)",
                  cursor: "pointer",
                  transition: "background 0.12s",
                }}
              >
                {pushEnabled ? <IconBell size={12} /> : <IconBellOff size={12} />}
              </button>
            )}

            {/* Mark all read */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                title="모두 읽음"
                style={{
                  height: 28, padding: "0 9px",
                  borderRadius: 7,
                  background: "rgba(48,209,88,0.1)",
                  border: "1px solid rgba(48,209,88,0.25)",
                  fontFamily: mono, fontSize: 10, fontWeight: 600,
                  color: "#30d158", cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                모두 읽음
              </button>
            )}

            {/* Clear read */}
            {readCount > 0 && (
              <button
                type="button"
                onClick={handleClearRead}
                title="읽은 항목 삭제"
                style={{
                  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 7,
                  background: "rgba(255,69,58,0.1)",
                  border: "1px solid rgba(255,69,58,0.25)",
                  color: "#ff453a", cursor: "pointer",
                }}
              >
                <IconTrash />
              </button>
            )}
          </div>
        </div>

        {/* ── Filter chips ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "8px 12px",
          borderBottom: "1px solid var(--th-border)",
          flexShrink: 0, overflowX: "auto",
        }}>
          {TYPE_FILTERS.map((f) => {
            const active = typeFilter === f.key;
            const count = f.key === "all"
              ? items.filter((i) => !i.read).length
              : items.filter((i) => matchesFilter(i.type, f.key) && !i.read).length;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setTypeFilter(f.key)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: active ? "var(--th-accent)" : "var(--th-hover-overlay)",
                  border: `1px solid ${active ? "transparent" : "var(--th-border)"}`,
                  fontFamily: mono, fontSize: 10, fontWeight: active ? 600 : 400,
                  color: active ? "#fff" : "var(--th-text-secondary)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "background 0.12s, color 0.12s",
                }}
              >
                {f.icon}
                {f.label}
                {count > 0 && (
                  <span style={{
                    background: active ? "rgba(255,255,255,0.25)" : "rgba(255,69,58,0.2)",
                    color: active ? "#fff" : "#ff453a",
                    borderRadius: 10, padding: "0 4px",
                    fontSize: 9, fontWeight: 700, minWidth: 14, textAlign: "center",
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {/* Hide read toggle */}
          <button
            type="button"
            onClick={() => setHideRead((v) => !v)}
            style={{
              height: 26, padding: "0 10px",
              borderRadius: 20,
              background: hideRead ? "rgba(245,158,11,0.12)" : "transparent",
              border: `1px solid ${hideRead ? "rgba(245,158,11,0.3)" : "var(--th-border)"}`,
              fontFamily: mono, fontSize: 10,
              color: hideRead ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: "pointer",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {hideRead ? "미읽음만" : "전체"}
          </button>
        </div>

        {/* ── Notification list ── */}
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 4 }}>
          {groups.length === 0 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              height: 160, gap: 10,
            }}>
              <span style={{ color: "var(--th-text-muted)", opacity: 0.4 }}><IconBell size={28} /></span>
              <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>
                {hideRead ? "미읽은 알림 없음" : "알림 없음"}
              </span>
            </div>
          )}

          {groups.map(({ bucket, items: groupItems }) => (
            <div key={bucket}>
              {/* Date section header */}
              <div style={{
                padding: "8px 16px 5px",
                fontFamily: mono, fontSize: 9,
                color: "var(--th-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                position: "sticky", top: 0, zIndex: 1,
                background: "var(--th-bg-surface)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {BUCKET_LABELS[bucket]}
                <div style={{ flex: 1, height: 1, background: "var(--th-border)" }} />
                {groupItems.filter((i) => !i.read).length > 0 && (
                  <span style={{ color: "var(--th-accent)", fontWeight: 600 }}>
                    {groupItems.filter((i) => !i.read).length}
                  </span>
                )}
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

        {/* ── Footer ── */}
        {items.length > 0 && (
          <div style={{
            padding: "7px 14px",
            borderTop: "1px solid var(--th-border)",
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
              총 {items.length}개 · 미읽음 {unreadCount}개
            </span>
            {readCount > 0 && (
              <button
                type="button"
                onClick={handleClearRead}
                style={{
                  fontFamily: mono, fontSize: 10,
                  color: "rgba(255,69,58,0.6)",
                  background: "none", border: "none",
                  cursor: "pointer", padding: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#ff453a"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,69,58,0.6)"; }}
              >
                읽은 알림 {readCount}개 삭제
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* ── Bell button (MenuBar 안에 렌더) ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "relative",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          height: 32, minWidth: 32, padding: "0 8px",
          background: open ? "var(--th-hover-overlay)" : "transparent",
          border: `1px solid ${open ? "var(--th-border)" : "transparent"}`,
          borderRadius: 8,
          color: unreadCount > 0 ? "var(--th-accent)" : "var(--th-text-secondary)",
          cursor: "pointer",
          transition: "background 0.12s, border-color 0.12s, color 0.12s",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.background = "var(--th-hover-overlay)";
            e.currentTarget.style.borderColor = "var(--th-border)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }
        }}
        aria-label="알림"
      >
        <IconBell size={16} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            minWidth: 16, height: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8, padding: "0 4px",
            background: "#ff453a",
            fontSize: 9, fontWeight: 700, color: "#fff",
            fontFamily: mono,
            lineHeight: 1,
            boxShadow: "0 0 0 2px var(--th-bg-primary)",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Backdrop + Panel: document.body에 portal로 마운트 ── */}
      {createPortal(portalContent, document.body)}
    </>
  );
}
