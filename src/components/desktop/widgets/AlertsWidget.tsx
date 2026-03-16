import { useEffect, useRef, useState } from "react";
import { fetchNotifications, type NotificationItem } from "../../../api/notifications";
import { useI18n } from "../../../i18n";

const mono = "var(--th-font-mono)";

const TYPE_ICON: Record<string, string> = {
  task_complete:    "✓",
  task_error:       "✕",
  decision_created: "?",
  agent_error:      "⚠",
  agent_anomaly:    "⚡",
  cost_alert:       "$",
  heartbeat:        "♥",
  system:           "·",
};
const TYPE_COLOR: Record<string, string> = {
  task_complete:    "var(--th-status-success)",
  task_error:       "var(--th-status-error)",
  decision_created: "var(--th-status-warning)",
  agent_error:      "var(--th-status-error)",
  agent_anomaly:    "var(--th-status-warning)",
  cost_alert:       "var(--th-status-purple)",
  heartbeat:        "var(--th-status-info)",
  system:           "var(--th-text-muted)",
};

export default function AlertsWidget() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { t } = useI18n();

  const load = () => {
    fetchNotifications({ limit: 30 })
      .then((res) => {
        setItems(res.notifications ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const alertItems = items.filter((n) => n.type === "task_error" || n.type === "agent_error" || n.type === "decision_created" || n.type === "agent_anomaly" || n.type === "cost_alert");
  const display = alertItems.length > 0 ? alertItems : items.slice(0, 10);
  const unread = items.filter((n) => !n.read).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{
        display: "flex",
        gap: 10,
        padding: "6px 10px",
        borderBottom: "1px solid var(--th-border)",
        fontFamily: mono,
        fontSize: 10,
        color: "var(--th-text-muted)",
        flexShrink: 0,
        alignItems: "center",
      }}>
        <span style={{ color: alertItems.length > 0 ? "var(--th-status-error)" : "var(--th-status-success)" }}>
          {alertItems.length > 0
            ? `⚠ ${alertItems.length} ${t({ ko: "알림", en: "alert", ja: "アラート", zh: "警告" })}`
            : `✓ ${t({ ko: "정상", en: "ok", ja: "正常", zh: "正常" })}`}
        </span>
        {unread > 0 && (
          <span style={{ color: "var(--th-accent)", fontSize: 9 }}>{unread} {t({ ko: "읽지 않음", en: "unread", ja: "未読", zh: "未读" })}</span>
        )}
        <span style={{ flex: 1 }} />
        {loading && <span style={{ opacity: 0.4 }}>…</span>}
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {display.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px", textAlign: "center" }}>
            {t({ ko: "알림 없음", en: "No notifications", ja: "通知なし", zh: "无通知" })}
          </div>
        ) : (
          display.map((n) => (
            <div
              key={n.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "5px 10px",
                borderBottom: "1px solid var(--th-border)",
                background: !n.read ? "rgba(245,158,11,0.04)" : "none",
              }}
            >
              <span style={{ fontSize: 10, color: TYPE_COLOR[n.type] ?? "var(--th-text-muted)", flexShrink: 0, marginTop: 1 }}>
                {TYPE_ICON[n.type] ?? "·"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: mono, fontSize: 10,
                  color: !n.read ? "var(--th-text-primary)" : "var(--th-text-secondary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {n.title}
                </div>
                {(n.agent_name || n.agent_name_ko) && (
                  <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                    {n.agent_name_ko || n.agent_name}
                  </div>
                )}
              </div>
              <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0 }}>
                {new Date(n.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
