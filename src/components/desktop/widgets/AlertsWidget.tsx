import { useEffect, useState } from "react";
import { getHeartbeatLogs } from "../../../api/heartbeat";
import type { HeartbeatLog } from "../../../api/heartbeat";

const mono = "var(--th-font-mono)";

export default function AlertsWidget() {
  const [logs, setLogs] = useState<HeartbeatLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getHeartbeatLogs().then((data) => {
      setLogs(data.slice(0, 20));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const alertLogs = logs.filter((l) => l.status !== "ok");
  const display = alertLogs.length > 0 ? alertLogs : logs.slice(0, 8);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{
        display: "flex",
        gap: 12,
        padding: "6px 10px",
        borderBottom: "1px solid var(--th-border)",
        fontFamily: mono,
        fontSize: 10,
        color: "var(--th-text-muted)",
        flexShrink: 0,
      }}>
        <span style={{ color: alertLogs.length > 0 ? "#ef4444" : "#22c55e" }}>
          {alertLogs.length > 0 ? `⚠ ${alertLogs.length} alert` : "✓ ok"}
        </span>
        <span style={{ flex: 1 }} />
        {loading && <span>loading...</span>}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {display.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px", textAlign: "center" }}>
            알림 없음
          </div>
        ) : (
          display.map((log) => (
            <div
              key={log.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "5px 10px",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
              }}
            >
              <span style={{ fontSize: 10, color: log.status === "ok" ? "#22c55e" : log.status === "alert" ? "#f59e0b" : "#ef4444" }}>
                {log.status === "ok" ? "✓" : log.status === "alert" ? "!" : "✕"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.agent_name || "system"}
                </div>
                {log.summary && (
                  <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.summary}
                  </div>
                )}
              </div>
              <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0 }}>
                {new Date(log.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
