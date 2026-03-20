import { useState, useEffect, useCallback } from "react";
import { useI18n } from "../../i18n";

interface AnomalyNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  task_id: string | null;
  agent_id: string | null;
  read: number;
  created_at: number;
  agent_name: string;
  agent_avatar: string;
}

const mono = "var(--th-font-mono)";

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Classify anomaly sub-type from title string */
function anomalyKind(title: string): { label: string; color: string } {
  const t = title.toLowerCase();
  if (t.includes("orphan"))   return { label: "ORPHAN",   color: "#ff9f0a" };
  if (t.includes("fail"))     return { label: "FAILURES", color: "#ff453a" };
  if (t.includes("stale"))    return { label: "STALE",    color: "#5ac8fa" };
  return                             { label: "ANOMALY",  color: "#ff453a" };
}

interface AnomalyRowProps {
  item: AnomalyNotification;
  onDismiss: (id: string) => void;
}

function AnomalyRow({ item, onDismiss }: AnomalyRowProps) {
  const kind = anomalyKind(item.title);

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "10px 14px",
      borderBottom: "1px solid var(--th-border)",
      background: item.read ? "transparent" : "rgba(255,69,58,0.04)",
    }}>
      {/* Avatar */}
      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
        {item.agent_avatar || "⊙"}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
          {/* Kind badge */}
          <span style={{
            fontFamily: mono, fontSize: 9, fontWeight: 700,
            color: kind.color,
            background: `${kind.color}22`,
            border: `1px solid ${kind.color}44`,
            borderRadius: 4,
            padding: "1px 6px",
            letterSpacing: "0.07em",
          }}>
            {kind.label}
          </span>

          {/* Agent name */}
          {item.agent_name && (
            <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", fontWeight: 600 }}>
              {item.agent_name}
            </span>
          )}

          {/* Time */}
          <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginLeft: "auto" }}>
            {relativeTime(item.created_at)}
          </span>
        </div>

        <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text)", fontWeight: 600, marginBottom: 2 }}>
          {item.title}
        </div>

        {item.body && (
          <div style={{
            fontFamily: mono, fontSize: 10,
            color: "var(--th-text-muted)",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {item.body}
          </div>
        )}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        title="Dismiss"
        style={{
          fontFamily: mono, fontSize: 11,
          background: "none",
          border: "none",
          color: "var(--th-text-muted)",
          cursor: "pointer",
          padding: "0 2px",
          flexShrink: 0,
          opacity: 0.5,
          lineHeight: 1,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.5"; }}
      >
        ×
      </button>
    </div>
  );
}

export default function AnomalySection() {
  const { t } = useI18n();
  const [items, setItems] = useState<AnomalyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(() => {
    fetch("/api/notifications?type=agent_anomaly&limit=20")
      .then((r) => r.json() as Promise<{ notifications?: AnomalyNotification[] }>)
      .then((d) => { setItems(d.notifications ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const dismiss = useCallback((id: string) => {
    fetch(`/api/notifications/${id}`, { method: "DELETE" })
      .then(() => setItems((prev) => prev.filter((n) => n.id !== id)))
      .catch(() => {/* ignore */});
  }, []);

  const dismissAll = useCallback(() => {
    Promise.all(items.map((n) => fetch(`/api/notifications/${n.id}`, { method: "DELETE" })))
      .then(() => setItems([]))
      .catch(() => {/* ignore */});
  }, [items]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <div style={{
      borderTop: "1px solid var(--th-border)",
      background: "var(--th-bg-elevated)",
      flexShrink: 0,
    }}>
      {/* Header row */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: "var(--th-text-muted)", textTransform: "uppercase" }}>
          {t({ ko: "이상 감지", en: "Anomaly Detection", ja: "異常検出", zh: "异常检测" })}
        </span>

        {/* Count badge */}
        {items.length > 0 && (
          <span style={{
            fontFamily: mono, fontSize: 9, fontWeight: 700,
            background: unread > 0 ? "rgba(255,69,58,0.18)" : "var(--th-bg-elevated)",
            border: `1px solid ${unread > 0 ? "rgba(255,69,58,0.4)" : "var(--th-border)"}`,
            color: unread > 0 ? "#ff453a" : "var(--th-text-muted)",
            borderRadius: 10,
            padding: "0px 6px",
          }}>
            {items.length}
          </span>
        )}

        <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", opacity: 0.5 }}>
          {collapsed ? "▸" : "▾"}
        </span>

        {!collapsed && items.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); dismissAll(); }}
            style={{
              fontFamily: mono, fontSize: 9,
              background: "none",
              border: "1px solid var(--th-border)",
              borderRadius: 4,
              color: "var(--th-text-muted)",
              padding: "2px 8px",
              cursor: "pointer",
            }}
          >
            {t({ ko: "모두 지우기", en: "Clear all", ja: "すべて消去", zh: "全部清除" })}
          </button>
        )}
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={{ maxHeight: 280, overflowY: "auto" }}>
          {loading ? (
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", padding: "20px 14px", textAlign: "center" }}>
              {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
            </div>
          ) : items.length === 0 ? (
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", padding: "20px 14px", textAlign: "center" }}>
              {t({ ko: "감지된 이상 없음", en: "No anomalies detected", ja: "異常なし", zh: "未检测到异常" })}
            </div>
          ) : (
            items.map((item) => (
              <AnomalyRow key={item.id} item={item} onDismiss={dismiss} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
