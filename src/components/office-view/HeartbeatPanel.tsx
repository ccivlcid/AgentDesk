import { useCallback, useEffect, useMemo, useState } from "react";
import type { UiLanguage } from "../../i18n";
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
  /** 전용 페이지(직원관리 > Heartbeat)에서 사용 시 true. 접기 헤더 없이 항상 내용만 표시 */
  standalone?: boolean;
}

function fmtAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

// 아이콘: Heartbeat 브랜딩용 펄스/하트
const HeartbeatIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-rose-400"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ChevronDown = ({ open }: { open: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: "var(--th-text-muted)", transition: "transform 0.2s" }}
    className={open ? "rotate-180" : ""}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const StatusOkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400 shrink-0">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const StatusAlertIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-400 shrink-0">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const StatusErrorIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-400 shrink-0">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

export default function HeartbeatPanel({ language, agents = [], standalone = false }: Props) {
  const isKo = language === "ko";
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
  /** 직원 추가 셀렉트 값(팩 변경 시 초기화되도록 controlled) */
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
    try {
      checks = JSON.parse(config.check_items_json);
    } catch {
      /* use default */
    }
    setEditForm({
      enabled: config.enabled === 1,
      interval_minutes: config.interval_minutes,
      check_items: checks,
    });
    setEditingAgent(config.agent_id);
  };

  const handleSave = async () => {
    if (!editingAgent) return;
    setSaving(true);
    try {
      await updateHeartbeatConfig(editingAgent, editForm);
      setEditingAgent(null);
      refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleTrigger = async (agentId: string) => {
    setTriggering(agentId);
    try {
      await triggerHeartbeat(agentId);
      refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setTriggering(null);
    }
  };

  const toggleCheckItem = (item: HeartbeatCheckItem) => {
    setEditForm((prev) => ({
      ...prev,
      check_items: prev.check_items.includes(item)
        ? prev.check_items.filter((c) => c !== item)
        : [...prev.check_items, item],
    }));
  };

  /** 현재 오피스 팩(agents)에 포함된 직원의 설정·로그만 표시 */
  const agentIds = useMemo(() => new Set(agents.map((a) => a.id)), [agents]);
  const visibleConfigs = useMemo(
    () => configs.filter((c) => agentIds.has(c.agent_id)),
    [configs, agentIds],
  );
  const visibleLogs = useMemo(
    () => logs.filter((l) => agentIds.has(l.agent_id)),
    [logs, agentIds],
  );

  const alertLogs = visibleLogs.filter((l) => l.status !== "ok");
  const okCount = visibleLogs.filter((l) => l.status === "ok").length;
  const activeCount = visibleConfigs.filter((c) => c.enabled).length;
  /** 현재 팩 직원 중 점검 설정이 없는 직원만(추가 가능 목록) */
  const agentsWithoutConfig = useMemo(
    () => agents.filter((a) => !configs.some((c) => c.agent_id === a.id)),
    [agents, configs],
  );

  /** 팩 변경 시 추가 셀렉트 초기화 */
  useEffect(() => {
    const valid = agentsWithoutConfig.some((a) => a.id === addAgentId);
    if (!valid) setAddAgentId("");
  }, [agentsWithoutConfig, addAgentId]);

  /** 팩/목록 식별용 키(셀렉트 리마운트로 옵션 확실히 갱신) */
  const addSelectKey = useMemo(
    () => `pack-${agents.map((a) => a.id).sort().join("-")}`,
    [agents],
  );

  return (
    <div className={standalone ? "p-4" : "mt-4 px-2"}>
      <div className="p-4" style={{ border: "1px solid var(--th-border)", borderRadius: "4px", background: "var(--th-bg-surface)" }}>
        {!standalone && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left transition-colors hover:opacity-90"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center" style={{ background: "rgba(244,63,94,0.15)", borderRadius: "2px" }}>
                <HeartbeatIcon />
              </span>
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
                  {isKo ? "Heartbeat" : "Heartbeat"}
                </span>
                <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {isKo ? "직원 상태 주기 확인 · 이상 시 알림" : "Periodic staff status · Alerts on issues"}
                </span>
              </div>
              {activeCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-medium font-mono text-emerald-400" style={{ borderRadius: "2px", background: "rgba(16,185,129,0.15)" }}>
                  {activeCount} {isKo ? "활성" : "active"}
                </span>
              )}
              {alertLogs.length > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-medium font-mono text-amber-400" style={{ borderRadius: "2px", background: "rgba(245,158,11,0.15)" }}>
                  {alertLogs.length} {isKo ? "알림" : "alert"}
                </span>
              )}
            </div>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}>
              <ChevronDown open={expanded} />
            </span>
          </button>
        )}

        {effectiveExpanded && (
          <div className="mt-4 space-y-5 pt-4" style={{ borderTop: "1px solid var(--th-border)" }}>
            {/* 가이드: 접기/펼치기 인라인 */}
            <section className="overflow-hidden" style={{ border: "1px solid var(--th-border)", borderRadius: "2px", background: "var(--th-bg-elevated)" }}>
              <button
                type="button"
                onClick={() => setGuideExpanded((v) => !v)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors"
                style={{ color: "var(--th-text-secondary)" }}
              >
                <span className="text-xs font-semibold font-mono uppercase tracking-wider">
                  {isKo ? "직원 살펴보기 가이드" : "Heartbeat Guide"}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`shrink-0 transition-transform ${guideExpanded ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {guideExpanded && (
                <div className="px-3 pb-3 pt-2 space-y-3" style={{ borderTop: "1px solid var(--th-border)" }}>
                  <div className="space-y-2 text-[12px] leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                    <p>
                      {isKo
                        ? "직원 살펴보기(Heartbeat)는 선택한 직원의 프로젝트·태스크 상태를 주기적으로 자동으로 확인하는 기능입니다. 따로 지시하지 않아도 이상이 있으면 알림을 보냅니다."
                        : "Heartbeat automatically checks on projects and tasks for selected staff at set intervals. You get notified when something needs attention."}
                    </p>
                    <p>
                      {isKo
                        ? "오피스 팩을 선택한 뒤, '살펴볼 직원 추가'에서 이 팩에 속한 직원을 선택하면 해당 직원이 살펴보기 대상에 포함됩니다. 간격(분)과 확인 항목을 설정할 수 있습니다."
                        : "Use 'Add to monitor' to select staff in the current pack. You can set the interval (minutes) and which items to check."}
                    </p>
                    <p>
                      {isKo
                        ? "상태가 정상이면 로그만 남고 알림은 가지 않습니다. 문제가 발견되면 알림 센터와 CEO 메신저로 알림이 전송됩니다. '실행' 버튼으로 수동 확인을 실행할 수 있습니다."
                        : "When status is normal, only logs are recorded. When issues are found, alerts go to the notification center and CEO messenger. Use 'Run' to trigger a check manually."}
                    </p>
                  </div>
                  <div className="px-3 py-2 flex gap-2" style={{ borderRadius: "2px", border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.05)" }}>
                    <span className="text-amber-400 shrink-0">💡</span>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      {isKo
                        ? "현재 보이는 직원 목록과 살펴보기 대상은 선택한 오피스 팩에 따라 달라집니다."
                        : "The staff list and monitored list depend on the selected office pack."}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* 직원 추가: 현재 오피스 팩(managerAgents) 기준 */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
                {isKo ? "살펴볼 직원 추가" : "Add to monitor"}
              </h3>
              {agentsWithoutConfig.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <select
                    key={addSelectKey}
                    value={addAgentId}
                    disabled={adding}
                    onChange={(e) => {
                      const agentId = e.target.value;
                      if (!agentId) {
                        setAddAgentId("");
                        return;
                      }
                      const agent = agents.find((a) => a.id === agentId);
                      setAdding(true);
                      setAddAgentId("");
                      // 낙관적 업데이트: configs에 즉시 반영해 셀렉트 옵션에서 제거(목록과 옵션 일치)
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
                      updateHeartbeatConfig(agentId, {
                        enabled: true,
                        interval_minutes: 30,
                        check_items: ALL_CHECKS,
                      })
                        .then(() => refresh())
                        .catch((err) => {
                          console.error(err);
                          refresh();
                        })
                        .finally(() => setAdding(false));
                    }}
                    className="min-w-0 flex-1 px-3 py-2.5 text-sm focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-wait sm:max-w-[280px]"
                    style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)" }}
                    aria-label={isKo ? "살펴볼 직원 선택" : "Select staff to monitor"}
                  >
                    <option value="">{isKo ? "이 팩의 직원 선택…" : "Select staff in this pack…"}</option>
                    {agentsWithoutConfig.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.avatar_emoji ?? "👤"} {isKo && a.name_ko ? a.name_ko : a.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                    {agentsWithoutConfig.length} {isKo ? "명 추가 가능" : "available"}
                  </span>
                </div>
              ) : (
                <p className="px-3 py-2 text-[12px] font-mono" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}>
                  {isKo
                    ? "이 오피스 팩의 직원은 모두 살펴보기 대상에 포함되어 있습니다."
                    : "All staff in this pack are already being monitored."}
                </p>
              )}
            </section>

            {visibleConfigs.length === 0 && agents.length === 0 && (
              <p className="px-4 py-4 text-center text-sm font-mono" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}>
                {isKo
                  ? "직원 살펴보기 설정이 없습니다. 직원을 먼저 추가하세요."
                  : "No heartbeat configs. Add staff first."}
              </p>
            )}

            {visibleConfigs.length === 0 && agents.length > 0 && (
              <p className="px-4 py-4 text-center text-sm font-mono" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}>
                {isKo
                  ? "이 오피스 팩에 설정된 살펴보기 대상이 없습니다. 위에서 직원을 추가하세요."
                  : "No heartbeat configs for this pack. Add staff above."}
              </p>
            )}

            {/* 살펴볼 직원 목록 */}
            {visibleConfigs.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
                  {isKo ? "살펴보기 대상" : "Monitored staff"} · {visibleConfigs.length}
                </h3>
                <div className="space-y-2.5">
                  {visibleConfigs.map((cfg) => (
                <div
                  key={cfg.agent_id}
                  className="p-3 transition-all duration-200"
                  style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-lg leading-none">{cfg.agent_avatar}</span>
                      <span className="truncate text-sm font-medium font-mono" style={{ color: "var(--th-text-primary)" }}>
                        {isKo && cfg.agent_name_ko ? cfg.agent_name_ko : cfg.agent_name}
                      </span>
                      <span
                        className="shrink-0 px-2 py-0.5 text-[10px] font-medium font-mono"
                        style={{
                          borderRadius: "2px",
                          background: cfg.enabled ? "rgba(16,185,129,0.15)" : "var(--th-bg-surface-hover)",
                          color: cfg.enabled ? "#34d399" : "var(--th-text-muted)",
                        }}
                      >
                        {cfg.enabled ? (isKo ? "ON" : "ON") : "OFF"}
                      </span>
                      {!!cfg.enabled && (
                        <span className="shrink-0 text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                          {cfg.interval_minutes} min
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {!!cfg.enabled && (
                        <button
                          type="button"
                          onClick={() => handleTrigger(cfg.agent_id)}
                          disabled={triggering === cfg.agent_id}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium font-mono text-cyan-400 transition-colors disabled:opacity-50 min-w-[52px]"
                          style={{ borderRadius: "2px", background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.25)" }}
                        >
                          {triggering === cfg.agent_id ? (
                            <span className="inline-block h-3 w-3 animate-spin border-2 border-cyan-400/50 border-t-cyan-400" style={{ borderRadius: "50%" }} />
                          ) : (
                            <>{isKo ? "실행" : "Run"}</>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEdit(cfg)}
                        className="px-2.5 py-1.5 text-[11px] font-medium font-mono transition-colors"
                        style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
                      >
                        {isKo ? "설정" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(isKo ? "이 직원을 살펴보기 대상에서 제거할까요?" : "Remove this staff from the watch list?")) return;
                          setRemovingAgentId(cfg.agent_id);
                          deleteHeartbeatConfig(cfg.agent_id)
                            .then(() => refresh())
                            .catch((err: unknown) => {
                              console.error(err);
                              const msg = err instanceof Error ? err.message : String(err);
                              window.alert(isKo ? `제거 실패: ${msg}` : `Remove failed: ${msg}`);
                            })
                            .finally(() => setRemovingAgentId(null));
                        }}
                        disabled={removingAgentId === cfg.agent_id}
                        className="px-2.5 py-1.5 text-[11px] font-medium font-mono text-red-400 transition-colors disabled:opacity-50"
                        style={{ borderRadius: "2px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                        title={isKo ? "살펴보기에서 제거" : "Remove from watch list"}
                      >
                        {removingAgentId === cfg.agent_id ? "…" : isKo ? "제거" : "Remove"}
                      </button>
                    </div>
                  </div>

                  {/* 인라인 편집 폼 */}
                  {editingAgent === cfg.agent_id && (
                    <div className="mt-3 space-y-3 pt-3" style={{ borderTop: "1px solid var(--th-border)" }}>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editForm.enabled}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, enabled: e.target.checked }))
                          }
                          className="h-4 w-4"
                          style={{ borderRadius: "2px", accentColor: "var(--th-accent)" }}
                        />
                        <span className="text-sm font-mono" style={{ color: "var(--th-text-secondary)" }}>{isKo ? "활성화" : "Enabled"}</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{isKo ? "간격" : "Interval"}</span>
                        <input
                          type="number"
                          min={5}
                          max={1440}
                          value={editForm.interval_minutes}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              interval_minutes: Number(e.target.value) || 30,
                            }))
                          }
                          className="w-16 px-2 py-1.5 text-center text-sm focus:outline-none"
                          style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)" }}
                        />
                        <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>min</span>
                      </div>
                      <div>
                        <span className="mb-1.5 block text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                          {isKo ? "체크 항목" : "Check items"}
                        </span>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {ALL_CHECKS.map((item) => (
                            <label
                              key={item}
                              className="flex cursor-pointer items-center gap-2"
                            >
                              <input
                                type="checkbox"
                                checked={editForm.check_items.includes(item)}
                                onChange={() => toggleCheckItem(item)}
                                className="h-4 w-4"
                          style={{ borderRadius: "2px", accentColor: "var(--th-accent)" }}
                              />
                              <span className="text-sm font-mono" style={{ color: "var(--th-text-secondary)" }}>
                                {isKo ? CHECK_LABELS[item].ko : CHECK_LABELS[item].en}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving}
                          className="px-3 py-1.5 text-sm font-medium font-mono text-rose-300 transition-colors disabled:opacity-50"
                          style={{ borderRadius: "2px", background: "rgba(244,63,94,0.2)", border: "1px solid rgba(244,63,94,0.3)" }}
                        >
                          {saving ? "..." : isKo ? "저장" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAgent(null)}
                          className="px-3 py-1.5 text-sm font-medium font-mono transition-colors"
                          style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-secondary)" }}
                        >
                          {isKo ? "취소" : "Cancel"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                  ))}
                </div>
              </section>
            )}

            {/* 최근 로그 (현재 팩 직원만) */}
            {visibleLogs.length > 0 && (
              <section className="space-y-2 pt-4" style={{ borderTop: "1px solid var(--th-border)" }}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
                    {isKo ? "최근 로그" : "Recent logs"}
                  </h3>
                  <div className="flex items-center gap-2">
                    {okCount > 0 && (
                      <span className="text-[10px] font-medium text-emerald-500">{okCount} OK</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(isKo ? "최근 로그를 모두 삭제할까요?" : "Delete all heartbeat logs?")) return;
                        setDeletingAllLogs(true);
                        deleteAllHeartbeatLogs()
                          .then(() => refresh())
                          .catch((err: unknown) => {
                            console.error(err);
                            const msg = err instanceof Error ? err.message : String(err);
                            window.alert(isKo ? `전체 삭제 실패: ${msg}` : `Delete all failed: ${msg}`);
                          })
                          .finally(() => setDeletingAllLogs(false));
                      }}
                      disabled={deletingAllLogs}
                      className="text-[10px] font-medium font-mono disabled:opacity-50"
                      style={{ color: "var(--th-text-muted)" }}
                      title={isKo ? "로그 전체 삭제" : "Delete all logs"}
                    >
                      {deletingAllLogs ? (isKo ? "삭제 중…" : "Deleting…") : (isKo ? "전체 삭제" : "Delete all")}
                    </button>
                  </div>
                </div>
                <div className="max-h-52 space-y-1 overflow-y-auto p-2" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
                  {visibleLogs.slice(0, 20).map((log) => {
                    let findings: HeartbeatFinding[] = [];
                    try {
                      if (log.findings_json) findings = JSON.parse(log.findings_json);
                    } catch {
                      /* ignore */
                    }
                    const StatusIcon =
                      log.status === "ok"
                        ? StatusOkIcon
                        : log.status === "alert"
                          ? StatusAlertIcon
                          : StatusErrorIcon;
                    const rowBg =
                      log.status === "ok"
                        ? ""
                        : log.status === "alert"
                          ? "bg-amber-500/5"
                          : "bg-red-500/5";
                    const isExpanded = expandedLogId === log.id;
                    const isDeleting = deletingLogId === log.id;

                    return (
                      <div
                        key={log.id}
                        className="overflow-hidden"
                        style={{ borderRadius: "2px", background: rowBg ? rowBg : undefined }}
                      >
                        <div className="flex items-center gap-2 px-2 py-1.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setExpandedLogId((id) => (id === log.id ? null : log.id))}
                            className="flex shrink-0 items-center justify-center w-5 h-5"
                            style={{ color: "var(--th-text-muted)" }}
                            aria-expanded={isExpanded}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isExpanded ? "rotate-90" : ""}>
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                          <StatusIcon />
                          <span className="shrink-0 text-base leading-none">{log.agent_avatar ?? "👤"}</span>
                          <span className="shrink-0 font-mono" style={{ color: "var(--th-text-secondary)" }}>
                            {(isKo && log.agent_name_ko) ? log.agent_name_ko : log.agent_name ?? log.agent_id}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-mono" style={{ color: "var(--th-text-muted)" }}>
                            {log.status === "ok"
                              ? (isKo ? "정상" : "Normal")
                              : findings.length > 0
                                ? findings[0].message
                                : log.summary ?? "—"}
                          </span>
                          <span className="shrink-0 text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                            {fmtAgo(log.created_at)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!window.confirm(isKo ? "이 로그를 삭제할까요?" : "Delete this log?")) return;
                              setDeletingLogId(log.id);
                              deleteHeartbeatLog(log.id)
                                .then(() => refresh())
                                .catch((err: unknown) => {
                                  console.error(err);
                                  const msg = err instanceof Error ? err.message : String(err);
                                  window.alert(isKo ? `로그 삭제 실패: ${msg}` : `Delete failed: ${msg}`);
                                })
                                .finally(() => setDeletingLogId(null));
                            }}
                            disabled={isDeleting}
                            className="shrink-0 p-1 disabled:opacity-50"
                            style={{ borderRadius: "2px", color: "var(--th-text-muted)" }}
                            title={isKo ? "로그 삭제" : "Delete log"}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="px-2 py-2 pl-7 text-[11px] font-mono space-y-1.5" style={{ borderTop: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-primary)" }}>
                            {findings.length > 0 ? (
                              <>
                                {log.summary && log.summary !== "HEARTBEAT_OK" && (
                                  <p><span style={{ color: "var(--th-text-muted)" }}>{isKo ? "요약:" : "Summary:"}</span> {log.summary}</p>
                                )}
                                <div>
                                  <span style={{ color: "var(--th-text-muted)" }}>{isKo ? "발견 항목:" : "Findings:"}</span>
                                  <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                    {findings.map((f, i) => (
                                      <li key={i}>{f.message}</li>
                                    ))}
                                  </ul>
                                </div>
                              </>
                            ) : (
                              <p style={{ color: "var(--th-text-muted)" }}>
                                {(log.summary === "normal" || log.summary === "HEARTBEAT_OK" || !log.summary)
                                  ? (isKo ? "정상입니다. 이상 없음." : "OK. No issues detected.")
                                  : log.summary}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
