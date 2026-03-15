import { useCallback, useEffect, useMemo, useState } from "react";
import type { UiLanguage } from "../../i18n";
import { useConfirm } from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";
import {
  type HeartbeatConfig,
  type HeartbeatLog,
  type HeartbeatFinding,
  type HeartbeatCheckItem,
  getHeartbeatConfigs,
  getHeartbeatLogs,
  updateHeartbeatConfig,
  deleteHeartbeatConfig,
  triggerHeartbeat,
  deleteHeartbeatLog,
  deleteAllHeartbeatLogs,
} from "../../api/heartbeat";

const ALL_CHECKS: HeartbeatCheckItem[] = [
  "stale_tasks",
  "blocked_tasks",
  "consecutive_failures",
  "pending_decisions",
];

const CHECK_LABELS: Record<HeartbeatCheckItem, { ko: string; en: string }> = {
  stale_tasks: { ko: "정체 태스크", en: "Stale Tasks" },
  blocked_tasks: { ko: "차단 태스크", en: "Blocked Tasks" },
  consecutive_failures: { ko: "연속 실패", en: "Failures" },
  pending_decisions: { ko: "대기 결정", en: "Pending" },
};

interface SimpleAgent {
  id: string;
  name: string;
  name_ko?: string;
  avatar_emoji?: string;
}

interface Props {
  language: UiLanguage;
  agents?: SimpleAgent[];
  standalone?: boolean;
  projectAgentIds?: Set<string>;
}

function fmtAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function statusSymbol(status: string): { sym: string; color: string } {
  if (status === "ok") return { sym: "✓", color: "#4ade80" };
  if (status === "alert") return { sym: "!", color: "#f59e0b" };
  return { sym: "✕", color: "#f87171" };
}

export default function HeartbeatPanel({ language, agents = [], standalone = false, projectAgentIds }: Props) {
  const isKo = language === "ko";
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  const [filterProjectOnly, setFilterProjectOnly] = useState(false);
  const [configs, setConfigs] = useState<HeartbeatConfig[]>([]);
  const [logs, setLogs] = useState<HeartbeatLog[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    enabled: boolean;
    interval_minutes: number;
    check_items: HeartbeatCheckItem[];
  }>({ enabled: false, interval_minutes: 30, check_items: [...ALL_CHECKS] });
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [removingAgentId, setRemovingAgentId] = useState<string | null>(null);
  const [addAgentId, setAddAgentId] = useState("");
  const [adding, setAdding] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);
  const [deletingAllLogs, setDeletingAllLogs] = useState(false);

  const refresh = useCallback(() => {
    getHeartbeatConfigs().then(setConfigs).catch(console.error);
    getHeartbeatLogs({ limit: 20 }).then(setLogs).catch(console.error);
  }, []);

  const effectiveExpanded = standalone || expanded;
  useEffect(() => {
    if (effectiveExpanded) refresh();
  }, [effectiveExpanded, refresh]);

  const handleEdit = (config: HeartbeatConfig) => {
    let checks: HeartbeatCheckItem[] = ALL_CHECKS;
    try { checks = JSON.parse(config.check_items_json); } catch { /* use default */ }
    setEditForm({ enabled: config.enabled === 1, interval_minutes: config.interval_minutes, check_items: checks });
    setEditingAgent(config.agent_id);
  };

  const handleSave = async () => {
    if (!editingAgent) return;
    setSaving(true);
    try {
      await updateHeartbeatConfig(editingAgent, editForm);
      setEditingAgent(null);
      refresh();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleTrigger = async (agentId: string) => {
    setTriggering(agentId);
    try { await triggerHeartbeat(agentId); refresh(); }
    catch (e) { console.error(e); }
    finally { setTriggering(null); }
  };

  const toggleCheckItem = (item: HeartbeatCheckItem) => {
    setEditForm((prev) => ({
      ...prev,
      check_items: prev.check_items.includes(item)
        ? prev.check_items.filter((c) => c !== item)
        : [...prev.check_items, item],
    }));
  };

  const visibleAgents = useMemo(
    () => (filterProjectOnly && projectAgentIds ? agents.filter((a) => projectAgentIds.has(a.id)) : agents),
    [agents, filterProjectOnly, projectAgentIds],
  );
  const agentIds = useMemo(() => new Set(visibleAgents.map((a) => a.id)), [visibleAgents]);
  const visibleConfigs = useMemo(() => configs.filter((c) => agentIds.has(c.agent_id)), [configs, agentIds]);
  const visibleLogs = useMemo(() => logs.filter((l) => agentIds.has(l.agent_id)), [logs, agentIds]);
  const alertLogs = visibleLogs.filter((l) => l.status !== "ok");
  const okCount = visibleLogs.filter((l) => l.status === "ok").length;
  const activeCount = visibleConfigs.filter((c) => c.enabled).length;
  const agentsWithoutConfig = useMemo(
    () => visibleAgents.filter((a) => !configs.some((c) => c.agent_id === a.id)),
    [visibleAgents, configs],
  );
  const addSelectKey = useMemo(() => `pack-${agents.map((a) => a.id).sort().join("-")}`, [agents]);

  useEffect(() => {
    const valid = agentsWithoutConfig.some((a) => a.id === addAgentId);
    if (!valid) setAddAgentId("");
  }, [agentsWithoutConfig, addAgentId]);

  // ── Collapsed (non-standalone) ──
  if (!standalone) {
    return (
      <div style={{ borderTop: "1px solid var(--th-border)" }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            ...mono,
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "7px 14px",
            background: "transparent",
            border: "none",
            borderLeft: expanded ? "2px solid var(--th-accent)" : "2px solid transparent",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: "10px", color: expanded ? "var(--th-accent)" : "var(--th-text-muted)" }}>
            {expanded ? "▾" : "▸"}
          </span>
          <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-secondary)" }}>
            HEARTBEAT
          </span>
          <span style={{ fontSize: "9px", color: "var(--th-text-muted)", marginLeft: 4 }}>
            {visibleConfigs.length} watching
            {activeCount > 0 && <span style={{ color: "#4ade80", marginLeft: 6 }}>· {activeCount} active</span>}
            {alertLogs.length > 0 && <span style={{ color: "#f59e0b", marginLeft: 6 }}>· {alertLogs.length} alert</span>}
          </span>
        </button>
        {expanded && <HeartbeatBody {...{ isKo, mono, standalone, filterProjectOnly, setFilterProjectOnly, projectAgentIds, visibleConfigs, visibleLogs, alertLogs, okCount, activeCount, agentsWithoutConfig, addAgentId, setAddAgentId, addSelectKey, adding, setAdding, setConfigs, agents, visibleAgents, ALL_CHECKS, editingAgent, setEditingAgent, editForm, setEditForm, saving, triggering, removingAgentId, setRemovingAgentId, expandedLogId, setExpandedLogId, deletingLogId, setDeletingLogId, deletingAllLogs, setDeletingAllLogs, guideExpanded, setGuideExpanded, configs, refresh, handleEdit, handleSave, handleTrigger, toggleCheckItem, confirm, showToast }} />}
      </div>
    );
  }

  const wrapperStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
    ...(standalone
      ? {
          borderRadius: 10,
          background: "var(--th-bg-elevated)",
          border: "1px solid var(--th-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }
      : { background: "var(--th-bg-primary)" }),
  };
  const headerStyle: React.CSSProperties = {
    ...mono,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: standalone ? "10px 18px" : "6px 14px",
    borderBottom: "1px solid var(--th-border)",
    background: standalone ? "var(--th-bg-panel)" : "var(--th-bg-elevated)",
    borderLeft: "3px solid var(--th-accent)",
    ...(standalone
      ? {
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }
      : {}),
  };

  return (
    <div style={wrapperStyle}>
      {/* ── 헤더 ── */}
      <div style={headerStyle}>
        <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--th-text-muted)" }}>HEARTBEAT</span>
        <span style={{ color: "var(--th-border)", fontSize: "9px" }}>·</span>
        <span style={{ fontSize: "9px", color: "var(--th-text-muted)" }}>
          {visibleConfigs.length} watching
        </span>
        {activeCount > 0 && (
          <span style={{ fontSize: "9px", color: "#4ade80" }}>· {activeCount} active</span>
        )}
        {alertLogs.length > 0 && (
          <span style={{ fontSize: "9px", color: "#f59e0b" }}>· {alertLogs.length} alert</span>
        )}
        {projectAgentIds && projectAgentIds.size > 0 && (
          <button
            type="button"
            onClick={() => setFilterProjectOnly((v) => !v)}
            style={{
              ...mono,
              marginLeft: "auto",
              fontSize: "9px",
              padding: "4px 10px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${filterProjectOnly ? "var(--th-accent)" : "var(--th-border)"}`,
              color: filterProjectOnly ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: "pointer",
            }}
          >
            {filterProjectOnly ? "✓ THIS PROJECT" : "THIS PROJECT"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ background: "var(--th-bg-primary)" }}>
        <HeartbeatBody {...{ isKo, mono, standalone, filterProjectOnly, setFilterProjectOnly, projectAgentIds, visibleConfigs, visibleLogs, alertLogs, okCount, activeCount, agentsWithoutConfig, addAgentId, setAddAgentId, addSelectKey, adding, setAdding, setConfigs, agents, visibleAgents, ALL_CHECKS, editingAgent, setEditingAgent, editForm, setEditForm, saving, triggering, removingAgentId, setRemovingAgentId, expandedLogId, setExpandedLogId, deletingLogId, setDeletingLogId, deletingAllLogs, setDeletingAllLogs, guideExpanded, setGuideExpanded, configs, refresh, handleEdit, handleSave, handleTrigger, toggleCheckItem, confirm, showToast }} />
      </div>
    </div>
  );
}

// ── 공통 본문 컴포넌트 ──
function HeartbeatBody({
  isKo, mono,
  visibleConfigs, visibleLogs, alertLogs, okCount, activeCount,
  agentsWithoutConfig, addAgentId, setAddAgentId, addSelectKey,
  adding, setAdding, setConfigs, agents, visibleAgents,
  editingAgent, setEditingAgent, editForm, setEditForm,
  saving, triggering,
  removingAgentId, setRemovingAgentId,
  expandedLogId, setExpandedLogId,
  deletingLogId, setDeletingLogId,
  deletingAllLogs, setDeletingAllLogs,
  guideExpanded, setGuideExpanded,
  configs, refresh,
  handleEdit, handleSave, handleTrigger, toggleCheckItem,
  confirm, showToast,
}: any) {
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
      {/* ── ADD TO MONITOR ── */}
      <Divider label={isKo ? "ADD TO MONITOR" : "ADD TO MONITOR"} />
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
                const agent = visibleAgents.find((a: any) => a.id === agentId);
                setAdding(true);
                setAddAgentId("");
                setConfigs((prev: any[]) => [
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
                  .catch((err: any) => { console.error(err); refresh(); })
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
              {agentsWithoutConfig.map((a: any) => (
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
            <span style={{ color: "#4ade80" }}>✓</span>
            {isKo ? "이 팩의 모든 직원이 살펴보기 대상입니다." : "All staff in this pack are monitored."}
          </div>
        )}
        {visibleConfigs.length === 0 && agents.length === 0 && (
          <div style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", marginTop: 6 }}>
            <span style={{ color: "#f87171" }}>!</span> {isKo ? "직원을 먼저 추가하세요." : "Add staff first."}
          </div>
        )}
      </div>

      {/* ── WATCH TABLE ── */}
      {visibleConfigs.length > 0 && (
        <>
          <Divider label={`WATCHING · ${visibleConfigs.length}`} />
          {/* 컬럼 헤더 */}
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
              { label: "ACTIONS", w: "auto" },
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

          {visibleConfigs.map((cfg: HeartbeatConfig) => (
            <div key={cfg.agent_id} style={{ borderBottom: "1px solid var(--th-border)" }}>
              {/* 행 */}
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
                {/* AGENT */}
                <div style={{ width: 140, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                  <span style={{ fontSize: "13px", flexShrink: 0 }}>{cfg.agent_avatar}</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--th-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {isKo && cfg.agent_name_ko ? cfg.agent_name_ko : cfg.agent_name}
                  </span>
                </div>
                {/* STATUS */}
                <span
                  style={{
                    width: 60,
                    fontSize: "9px",
                    fontWeight: 700,
                    color: cfg.enabled ? "#4ade80" : "var(--th-text-muted)",
                  }}
                >
                  [{cfg.enabled ? "ON" : "OFF"}]
                </span>
                {/* INTERVAL */}
                <span style={{ width: 80, fontSize: "9px", color: "var(--th-text-muted)" }}>
                  {cfg.interval_minutes}m
                </span>
                {/* ACTIONS */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
                  {!!cfg.enabled && (
                    <button
                      type="button"
                      onClick={() => handleTrigger(cfg.agent_id)}
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
                  <button
                    type="button"
                    onClick={() => handleEdit(cfg)}
                    style={{
                      ...mono,
                      fontSize: "9px",
                      padding: "2px 6px",
                      background: "transparent",
                      border: "1px solid var(--th-border)",
                      color: "var(--th-text-muted)",
                      cursor: "pointer",
                      borderRadius: 0,
                    }}
                  >
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

              {/* 인라인 편집 폼 */}
              {editingAgent === cfg.agent_id && (
                <div
                  style={{
                    ...mono,
                    padding: "10px 14px 10px 30px",
                    borderTop: "1px solid var(--th-border)",
                    background: "rgba(245,158,11,0.03)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: "9px", color: "var(--th-accent)", marginBottom: 2 }}>
                    $ heartbeat --edit {cfg.agent_id.slice(0, 8)}
                  </div>
                  {/* enabled */}
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editForm.enabled}
                      onChange={(e) => setEditForm((f: any) => ({ ...f, enabled: e.target.checked }))}
                      style={{ accentColor: "var(--th-accent)", width: 12, height: 12 }}
                    />
                    <span style={{ fontSize: "10px", color: "var(--th-text-secondary)" }}>
                      --enabled
                    </span>
                  </label>
                  {/* interval */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "10px", color: "var(--th-text-muted)" }}>--interval</span>
                    <input
                      type="number"
                      min={5}
                      max={1440}
                      value={editForm.interval_minutes}
                      onChange={(e) => setEditForm((f: any) => ({ ...f, interval_minutes: Number(e.target.value) || 30 }))}
                      style={{
                        ...mono,
                        width: 52,
                        fontSize: "10px",
                        background: "var(--th-bg-elevated)",
                        border: "1px solid var(--th-border)",
                        borderRadius: 0,
                        color: "var(--th-text-primary)",
                        padding: "2px 6px",
                        textAlign: "center",
                      }}
                    />
                    <span style={{ fontSize: "9px", color: "var(--th-text-muted)" }}>min</span>
                  </div>
                  {/* checks */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "10px", color: "var(--th-text-muted)" }}>--checks</span>
                    {ALL_CHECKS.map((item: HeartbeatCheckItem) => (
                      <label key={item} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={editForm.check_items.includes(item)}
                          onChange={() => toggleCheckItem(item)}
                          style={{ accentColor: "var(--th-accent)", width: 12, height: 12 }}
                        />
                        <span style={{ fontSize: "9px", color: "var(--th-text-secondary)" }}>
                          {isKo ? CHECK_LABELS[item].ko : CHECK_LABELS[item].en}
                        </span>
                      </label>
                    ))}
                  </div>
                  {/* 저장/취소 */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        ...mono,
                        fontSize: "9px",
                        padding: "3px 10px",
                        background: "rgba(245,158,11,0.15)",
                        border: "1px solid rgba(245,158,11,0.4)",
                        color: "var(--th-accent)",
                        cursor: "pointer",
                        borderRadius: 0,
                        opacity: saving ? 0.5 : 1,
                      }}
                    >
                      {saving ? "···" : "[SAVE]"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAgent(null)}
                      style={{
                        ...mono,
                        fontSize: "9px",
                        padding: "3px 10px",
                        background: "transparent",
                        border: "1px solid var(--th-border)",
                        color: "var(--th-text-muted)",
                        cursor: "pointer",
                        borderRadius: 0,
                      }}
                    >
                      [ESC]
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── LOGS ── */}
      {visibleLogs.length > 0 && (
        <>
          <Divider label={`LOGS · ${visibleLogs.length}`} />
          {/* 로그 헤더 */}
          <div
            style={{
              ...mono,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 14px",
              borderBottom: "1px solid var(--th-border)",
              background: "var(--th-bg-elevated)",
            }}
          >
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
              style={{
                ...mono,
                fontSize: "9px",
                padding: "1px 6px",
                background: "transparent",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#f87171",
                cursor: "pointer",
                borderRadius: 0,
                opacity: deletingAllLogs ? 0.5 : 1,
              }}
            >
              {deletingAllLogs ? "···" : "[CLEAR]"}
            </button>
          </div>

          {visibleLogs.slice(0, 20).map((log: HeartbeatLog) => {
            let findings: HeartbeatFinding[] = [];
            try { if (log.findings_json) findings = JSON.parse(log.findings_json); } catch { /* ignore */ }
            const { sym, color } = statusSymbol(log.status);
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
                    onClick={() => setExpandedLogId((id: any) => id === log.id ? null : log.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "9px", color: "var(--th-text-muted)", flexShrink: 0, width: 10 }}
                  >
                    {isExpanded ? "▾" : "▸"}
                  </button>
                  <span style={{ fontSize: "11px", color, flexShrink: 0, width: 12 }}>{sym}</span>
                  <span style={{ fontSize: "12px", flexShrink: 0 }}>{log.agent_avatar ?? "👤"}</span>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--th-text-secondary)", flexShrink: 0, width: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {(isKo && log.agent_name_ko) ? log.agent_name_ko : log.agent_name ?? log.agent_id}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--th-text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.status === "ok"
                      ? (isKo ? "정상" : "normal")
                      : findings.length > 0 ? findings[0].message : log.summary ?? "—"}
                  </span>
                  <span style={{ fontSize: "9px", color: "var(--th-text-muted)", flexShrink: 0, marginLeft: 8 }}>
                    {fmtAgo(log.created_at)}
                  </span>
                  <button
                    type="button"
                    disabled={deletingLogId === log.id}
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await confirm({
                        title: isKo ? "로그 삭제" : "Delete log",
                        message: isKo ? "이 로그를 삭제할까요?" : "Delete this log?",
                        confirmLabel: isKo ? "삭제" : "Delete",
                        cancelLabel: isKo ? "취소" : "Cancel",
                        variant: "danger",
                      });
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
                    style={{
                      ...mono,
                      fontSize: "9px",
                      padding: "1px 5px",
                      background: "transparent",
                      border: "1px solid var(--th-border)",
                      color: "var(--th-text-muted)",
                      cursor: "pointer",
                      borderRadius: 0,
                      opacity: deletingLogId === log.id ? 0.5 : 1,
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
                {isExpanded && (
                  <div
                    style={{
                      ...mono,
                      padding: "8px 14px 8px 38px",
                      borderTop: "1px solid var(--th-border)",
                      background: "var(--th-bg-elevated)",
                      fontSize: "10px",
                      color: "var(--th-text-muted)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    {findings.length > 0 ? (
                      <>
                        {log.summary && log.summary !== "HEARTBEAT_OK" && (
                          <div><span style={{ color: "var(--th-text-muted)" }}>summary: </span>{log.summary}</div>
                        )}
                        {findings.map((f: HeartbeatFinding, i: number) => (
                          <div key={i}>
                            <span style={{ color: "#f59e0b" }}>  ! </span>
                            <span style={{ color: "var(--th-text-secondary)" }}>{f.message}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div>
                        <span style={{ color: "#4ade80" }}>✓ </span>
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

      {/* ── GUIDE ── */}
      <Divider label="GUIDE" />
      <div style={{ borderBottom: "1px solid var(--th-border)" }}>
        <button
          type="button"
          onClick={() => setGuideExpanded((v: boolean) => !v)}
          style={{
            ...mono,
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "6px 14px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "9px", color: "var(--th-text-muted)" }}>{guideExpanded ? "▾" : "▸"}</span>
          <span style={{ fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.06em" }}>
            {isKo ? "직원 살펴보기 사용 방법" : "How Heartbeat works"}
          </span>
        </button>
        {guideExpanded && (
          <div
            style={{
              ...mono,
              padding: "10px 14px 12px 28px",
              borderTop: "1px solid var(--th-border)",
              background: "var(--th-bg-elevated)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {[
              isKo
                ? "직원 살펴보기(Heartbeat)는 선택한 직원의 프로젝트·태스크 상태를 주기적으로 자동으로 확인하는 기능입니다."
                : "Heartbeat automatically checks on projects and tasks for selected staff at set intervals.",
              isKo
                ? "워크플로 팩을 선택한 뒤 ADD TO MONITOR 에서 직원을 추가하세요. 간격과 확인 항목을 설정할 수 있습니다."
                : "Use ADD TO MONITOR to select staff. You can set the interval and which items to check.",
              isKo
                ? "정상이면 로그만 남고, 문제가 있으면 알림 센터로 알림이 전송됩니다. [RUN]으로 수동 실행할 수 있습니다."
                : "Normal → logs only. Issues → notification center alert. Use [RUN] to trigger manually.",
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
