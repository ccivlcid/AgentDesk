import type { HeartbeatConfig, HeartbeatLog, HeartbeatFinding, HeartbeatCheckItem } from "../../../api/heartbeat";
import { updateHeartbeatConfig, deleteHeartbeatConfig, deleteHeartbeatLog, deleteAllHeartbeatLogs } from "../../../api/heartbeat";
import { ALL_CHECKS, CHECK_LABELS } from "./constants";
import type { HeartbeatBodyProps, EditFormState } from "./types";
import { fmtAgo, statusSymbol } from "./utils";

export function HeartbeatBody({
  isKo,
  mono,
  visibleConfigs,
  visibleLogs,
  okCount,
  agentsWithoutConfig,
  addAgentId,
  setAddAgentId,
  addSelectKey,
  adding,
  setAdding,
  setConfigs,
  agents,
  visibleAgents,
  editingAgent,
  setEditingAgent,
  editForm,
  setEditForm,
  saving,
  triggering,
  removingAgentId,
  setRemovingAgentId,
  expandedLogId,
  setExpandedLogId,
  deletingLogId,
  setDeletingLogId,
  deletingAllLogs,
  setDeletingAllLogs,
  guideExpanded,
  setGuideExpanded,
  refresh,
  handleEdit,
  handleSave,
  handleTrigger,
  toggleCheckItem,
  confirm,
  showToast,
}: HeartbeatBodyProps) {
  const Divider = ({ label }: { label: string }) => (
    <div
      style={{
        ...mono,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 14px",
        background: "var(--th-bg-elevated)",
        borderBottom: "1px solid var(--th-border)",
        borderTop: "1px solid var(--th-border)",
      }}
    >
      <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)" }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: "var(--th-border)", opacity: 0.5 }} />
    </div>
  );

  return (
    <>
      <Divider label="ADD TO MONITOR" />
      <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--th-border)" }}>
        {agentsWithoutConfig.length > 0 ? (
          <div style={{ ...mono, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "10px", color: "var(--th-accent)", fontWeight: 700 }}>$</span>
            <span style={{ fontSize: "10px", color: "var(--th-text-muted)" }}>heartbeat --add</span>
            <select
              key={addSelectKey}
              value={addAgentId}
              disabled={adding}
              onChange={(e) => {
                const agentId = e.target.value;
                if (!agentId) { setAddAgentId(""); return; }
                const agent = visibleAgents.find((a) => a.id === agentId);
                setAdding(true);
                setAddAgentId("");
                setConfigs((prev) => [
                  ...prev,
                  {
                    agent_id: agentId,
                    enabled: 1,
                    interval_minutes: 30,
                    check_items_json: JSON.stringify(ALL_CHECKS),
                    agent_name: agent?.name ?? "",
                    agent_name_ko: agent?.name_ko ?? "",
                    agent_avatar: agent?.avatar_emoji ?? "👤",
                  } as HeartbeatConfig,
                ]);
                updateHeartbeatConfig(agentId, { enabled: true, interval_minutes: 30, check_items: ALL_CHECKS })
                  .then(() => refresh())
                  .catch((err: unknown) => { console.error(err); refresh(); })
                  .finally(() => setAdding(false));
              }}
              style={{
                ...mono,
                fontSize: "10px",
                background: "var(--th-bg-elevated)",
                border: "1px solid var(--th-border)",
                borderRadius: 0,
                color: "var(--th-text-secondary)",
                padding: "3px 8px",
                cursor: "pointer",
                minWidth: 180,
                opacity: adding ? 0.5 : 1,
              }}
              aria-label={isKo ? "살펴볼 직원 선택" : "Select staff to monitor"}
            >
              <option value="">{isKo ? "직원 선택…" : "Select staff…"}</option>
              {agentsWithoutConfig.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.avatar_emoji ?? "👤"} {isKo && a.name_ko ? a.name_ko : a.name}
                </option>
              ))}
            </select>
            <span style={{ fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.6 }}>
              {agentsWithoutConfig.length} available
            </span>
          </div>
        ) : (
          <div style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            {isKo ? "이 팩의 모든 직원이 살펴보기 대상입니다." : "All staff in this pack are monitored."}
          </div>
        )}
        {visibleConfigs.length === 0 && agents.length === 0 && (
          <div style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", marginTop: 6 }}>
            <span style={{ color: "#f87171" }}>!</span> {isKo ? "직원을 먼저 추가하세요." : "Add staff first."}
          </div>
        )}
      </div>

      {visibleConfigs.length > 0 && (
        <>
          <Divider label={`WATCHING · ${visibleConfigs.length}`} />
          <div
            style={{
              ...mono,
              display: "flex",
              alignItems: "center",
              gap: 0,
              padding: "4px 14px",
              borderBottom: "2px solid var(--th-border)",
              background: "var(--th-bg-elevated)",
            }}
          >
            {[
              { label: "AGENT", w: 140 },
              { label: "STATUS", w: 60 },
              { label: "INTERVAL", w: 80 },
              { label: "ACTIONS", w: "auto" as const },
            ].map((col) => (
              <span
                key={col.label}
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "var(--th-text-muted)",
                  width: col.w === "auto" ? undefined : col.w,
                  flex: col.w === "auto" ? 1 : undefined,
                }}
              >
                {col.label}
              </span>
            ))}
          </div>

          {visibleConfigs.map((cfg) => (
            <div key={cfg.agent_id} style={{ borderBottom: "1px solid var(--th-border)" }}>
              <div
                style={{
                  ...mono,
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                  padding: "5px 14px",
                  background: cfg.enabled ? "rgba(34,197,94,0.03)" : "transparent",
                  borderLeft: cfg.enabled ? "2px solid #22c55e" : "2px solid transparent",
                }}
              >
                <div style={{ width: 140, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                  <span style={{ fontSize: "13px", flexShrink: 0 }}>{cfg.agent_avatar}</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--th-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {isKo && cfg.agent_name_ko ? cfg.agent_name_ko : cfg.agent_name}
                  </span>
                </div>
                <span style={{ width: 60, fontSize: "9px", fontWeight: 700, color: cfg.enabled ? "#4ade80" : "var(--th-text-muted)" }}>
                  [{cfg.enabled ? "ON" : "OFF"}]
                </span>
                <span style={{ width: 80, fontSize: "9px", color: "var(--th-text-muted)" }}>{cfg.interval_minutes}m</span>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
                  {!!cfg.enabled && (
                    <button
                      type="button"
                      onClick={() => void handleTrigger(cfg.agent_id)}
                      disabled={triggering === cfg.agent_id}
                      style={{
                        ...mono,
                        fontSize: "9px",
                        padding: "2px 6px",
                        background: "transparent",
                        border: "1px solid rgba(6,182,212,0.4)",
                        color: "#67e8f9",
                        cursor: "pointer",
                        borderRadius: 0,
                        opacity: triggering === cfg.agent_id ? 0.5 : 1,
                      }}
                    >
                      {triggering === cfg.agent_id ? "···" : "[RUN]"}
                    </button>
                  )}
                  <button type="button" onClick={() => handleEdit(cfg)} style={{ ...mono, fontSize: "9px", padding: "2px 6px", background: "transparent", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 0 }}>
                    [EDIT]
                  </button>
                  <button
                    type="button"
                    disabled={removingAgentId === cfg.agent_id}
                    onClick={async () => {
                      const ok = await confirm({
                        title: isKo ? "살펴보기 대상 제거" : "Remove from watch list",
                        message: isKo ? "이 직원을 살펴보기 대상에서 제거할까요?" : "Remove this staff from the watch list?",
                        confirmLabel: isKo ? "제거" : "Remove",
                        cancelLabel: isKo ? "취소" : "Cancel",
                        variant: "danger",
                      });
                      if (!ok) return;
                      setRemovingAgentId(cfg.agent_id);
                      deleteHeartbeatConfig(cfg.agent_id)
                        .then(() => refresh())
                        .catch((err: unknown) => {
                          console.error(err);
                          const msg = err instanceof Error ? err.message : String(err);
                          showToast(isKo ? `제거 실패: ${msg}` : `Remove failed: ${msg}`, "error");
                        })
                        .finally(() => setRemovingAgentId(null));
                    }}
                    style={{
                      ...mono,
                      fontSize: "9px",
                      padding: "2px 6px",
                      background: "transparent",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#f87171",
                      cursor: "pointer",
                      borderRadius: 0,
                      opacity: removingAgentId === cfg.agent_id ? 0.5 : 1,
                    }}
                  >
                    {removingAgentId === cfg.agent_id ? "···" : "[×RM]"}
                  </button>
                </div>
              </div>

              {editingAgent === cfg.agent_id && (
                <div style={{ ...mono, padding: "10px 14px 10px 30px", borderTop: "1px solid var(--th-border)", background: "rgba(245,158,11,0.03)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: "9px", color: "var(--th-accent)", marginBottom: 2 }}>
                    $ heartbeat --edit {cfg.agent_id.slice(0, 8)}
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editForm.enabled}
                      onChange={(e) => setEditForm((f: EditFormState) => ({ ...f, enabled: e.target.checked }))}
                      style={{ accentColor: "var(--th-accent)", width: 12, height: 12 }}
                    />
                    <span style={{ fontSize: "10px", color: "var(--th-text-secondary)" }}>--enabled</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "10px", color: "var(--th-text-muted)" }}>--interval</span>
                    <input
                      type="number"
                      min={5}
                      max={1440}
                      value={editForm.interval_minutes}
                      onChange={(e) => setEditForm((f: EditFormState) => ({ ...f, interval_minutes: Number(e.target.value) || 30 }))}
                      style={{ ...mono, width: 52, fontSize: "10px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", borderRadius: 0, color: "var(--th-text-primary)", padding: "2px 6px", textAlign: "center" }}
                    />
                    <span style={{ fontSize: "9px", color: "var(--th-text-muted)" }}>min</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "10px", color: "var(--th-text-muted)" }}>--checks</span>
                    {ALL_CHECKS.map((item: HeartbeatCheckItem) => (
                      <label key={item} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                        <input type="checkbox" checked={editForm.check_items.includes(item)} onChange={() => toggleCheckItem(item)} style={{ accentColor: "var(--th-accent)", width: 12, height: 12 }} />
                        <span style={{ fontSize: "9px", color: "var(--th-text-secondary)" }}>{isKo ? CHECK_LABELS[item].ko : CHECK_LABELS[item].en}</span>
                      </label>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" onClick={() => void handleSave()} disabled={saving} style={{ ...mono, fontSize: "9px", padding: "3px 10px", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "var(--th-accent)", cursor: "pointer", borderRadius: 0, opacity: saving ? 0.5 : 1 }}>
                      {saving ? "···" : "[SAVE]"}
                    </button>
                    <button type="button" onClick={() => setEditingAgent(null)} style={{ ...mono, fontSize: "9px", padding: "3px 10px", background: "transparent", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 0 }}>
                      [ESC]
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {visibleLogs.length > 0 && (
        <>
          <Divider label={`LOGS · ${visibleLogs.length}`} />
          <div style={{ ...mono, display: "flex", alignItems: "center", gap: 8, padding: "4px 14px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
            <span style={{ fontSize: "9px", color: "var(--th-text-muted)", flex: 1 }}>
              {okCount > 0 && <span style={{ color: "#4ade80", marginRight: 8 }}>{okCount} OK</span>}
              {(visibleLogs.length - okCount) > 0 && <span style={{ color: "#f59e0b" }}>{visibleLogs.length - okCount} ALERT</span>}
            </span>
            <button
              type="button"
              onClick={async () => {
                const ok = await confirm({
                  title: isKo ? "로그 전체 삭제" : "Delete all logs",
                  message: isKo ? "최근 로그를 모두 삭제할까요?" : "Delete all heartbeat logs?",
                  confirmLabel: isKo ? "삭제" : "Delete",
                  cancelLabel: isKo ? "취소" : "Cancel",
                  variant: "danger",
                });
                if (!ok) return;
                setDeletingAllLogs(true);
                deleteAllHeartbeatLogs()
                  .then(() => refresh())
                  .catch((err: unknown) => {
                    console.error(err);
                    const msg = err instanceof Error ? err.message : String(err);
                    showToast(isKo ? `전체 삭제 실패: ${msg}` : `Delete all failed: ${msg}`, "error");
                  })
                  .finally(() => setDeletingAllLogs(false));
              }}
              disabled={deletingAllLogs}
              style={{ ...mono, fontSize: "9px", padding: "1px 6px", background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", cursor: "pointer", borderRadius: 0, opacity: deletingAllLogs ? 0.5 : 1 }}
            >
              {deletingAllLogs ? "···" : "[CLEAR]"}
            </button>
          </div>

          {visibleLogs.slice(0, 20).map((log) => {
            let findings: HeartbeatFinding[] = [];
            try { if (log.findings_json) findings = JSON.parse(log.findings_json); } catch { /* ignore */ }
            const { svgPath, color } = statusSymbol(log.status);
            const isExpanded = expandedLogId === log.id;
            return (
              <div key={log.id} style={{ borderBottom: "1px solid var(--th-border)" }}>
                <div
                  style={{
                    ...mono,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 14px",
                    background: log.status === "alert" ? "rgba(245,158,11,0.03)" : log.status === "error" ? "rgba(239,68,68,0.03)" : "transparent",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedLogId((id) => id === log.id ? null : log.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "9px", color: "var(--th-text-muted)", flexShrink: 0, width: 10 }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points={isExpanded ? "6 9 12 15 18 9" : "9 6 15 12 9 18"} /></svg>
                  </button>
                  <span style={{ flexShrink: 0, width: 12, display: "inline-flex", color }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={svgPath} /></svg></span>
                  <span style={{ fontSize: "12px", flexShrink: 0 }}>{log.agent_avatar ?? "👤"}</span>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--th-text-secondary)", flexShrink: 0, width: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {(isKo && log.agent_name_ko) ? log.agent_name_ko : log.agent_name ?? log.agent_id}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--th-text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.status === "ok" ? (isKo ? "정상" : "normal") : findings.length > 0 ? findings[0].message : log.summary ?? "—"}
                  </span>
                  <span style={{ fontSize: "9px", color: "var(--th-text-muted)", flexShrink: 0, marginLeft: 8 }}>{fmtAgo(log.created_at)}</span>
                  <button
                    type="button"
                    disabled={deletingLogId === log.id}
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await confirm({ title: isKo ? "로그 삭제" : "Delete log", message: isKo ? "이 로그를 삭제할까요?" : "Delete this log?", confirmLabel: isKo ? "삭제" : "Delete", cancelLabel: isKo ? "취소" : "Cancel", variant: "danger" });
                      if (!ok) return;
                      setDeletingLogId(log.id);
                      deleteHeartbeatLog(log.id)
                        .then(() => refresh())
                        .catch((err: unknown) => {
                          console.error(err);
                          const msg = err instanceof Error ? err.message : String(err);
                          showToast(isKo ? `로그 삭제 실패: ${msg}` : `Delete failed: ${msg}`, "error");
                        })
                        .finally(() => setDeletingLogId(null));
                    }}
                    style={{ ...mono, fontSize: "9px", padding: "1px 5px", background: "transparent", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 0, opacity: deletingLogId === log.id ? 0.5 : 1, flexShrink: 0 }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
                {isExpanded && (
                  <div style={{ ...mono, padding: "8px 14px 8px 38px", borderTop: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", fontSize: "10px", color: "var(--th-text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                    {findings.length > 0 ? (
                      <>
                        {log.summary && log.summary !== "HEARTBEAT_OK" && (
                          <div><span style={{ color: "var(--th-text-muted)" }}>summary: </span>{log.summary}</div>
                        )}
                        {findings.map((f, i) => (
                          <div key={i}>
                            <span style={{ color: "#f59e0b" }}>  ! </span>
                            <span style={{ color: "var(--th-text-secondary)" }}>{f.message}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}><polyline points="20 6 9 17 4 12" /></svg>
                        {(log.summary === "normal" || log.summary === "HEARTBEAT_OK" || !log.summary)
                          ? (isKo ? "정상입니다. 이상 없음." : "OK. No issues detected.")
                          : log.summary}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      <Divider label="GUIDE" />
      <div style={{ borderBottom: "1px solid var(--th-border)" }}>
        <button
          type="button"
          onClick={() => setGuideExpanded((v) => !v)}
          style={{ ...mono, display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 14px", background: "transparent", border: "none", cursor: "pointer" }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--th-text-muted)" }}><polyline points={guideExpanded ? "6 9 12 15 18 9" : "9 6 15 12 9 18"} /></svg>
          <span style={{ fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.06em" }}>
            {isKo ? "직원 살펴보기 사용 방법" : "How Heartbeat works"}
          </span>
        </button>
        {guideExpanded && (
          <div style={{ ...mono, padding: "10px 14px 12px 28px", borderTop: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              isKo ? "직원 살펴보기(Heartbeat)는 선택한 직원의 프로젝트·태스크 상태를 주기적으로 자동으로 확인하는 기능입니다." : "Heartbeat automatically checks on projects and tasks for selected staff at set intervals.",
              isKo ? "워크플로 팩을 선택한 뒤 ADD TO MONITOR 에서 직원을 추가하세요. 간격과 확인 항목을 설정할 수 있습니다." : "Use ADD TO MONITOR to select staff. You can set the interval and which items to check.",
              isKo ? "정상이면 로그만 남고, 문제가 있으면 알림 센터로 알림이 전송됩니다. [RUN]으로 수동 실행할 수 있습니다." : "Normal → logs only. Issues → notification center alert. Use [RUN] to trigger manually.",
            ].map((line, i) => (
              <div key={i} style={{ fontSize: "10px", color: "var(--th-text-muted)", lineHeight: 1.7 }}>
                <span style={{ color: "var(--th-accent)", marginRight: 6 }}>$</span>{line}
              </div>
            ))}
            <div style={{ marginTop: 4, padding: "6px 10px", background: "rgba(245,158,11,0.06)", borderLeft: "2px solid rgba(245,158,11,0.4)", fontSize: "10px", color: "#fde68a" }}>
              ! {isKo ? "현재 보이는 직원 목록은 선택한 워크플로 팩에 따라 달라집니다." : "The staff list depends on the selected workflow pack."}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
