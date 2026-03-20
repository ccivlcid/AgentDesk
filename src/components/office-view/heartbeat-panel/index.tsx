import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "../../ui/ConfirmDialog";
import { useToast } from "../../ui/Toast";
import {
  type HeartbeatConfig,
  type HeartbeatLog,
  type HeartbeatCheckItem,
  getHeartbeatConfigs,
  getHeartbeatLogs,
  updateHeartbeatConfig,
  triggerHeartbeat,
} from "../../../api/heartbeat";
import { ALL_CHECKS } from "./constants";
import { HeartbeatBody } from "./HeartbeatBody";
import type { HeartbeatPanelProps, EditFormState } from "./types";

export default function HeartbeatPanel({ language, agents = [], standalone = false, projectAgentIds }: HeartbeatPanelProps) {
  const isKo = language === "ko";
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  const [filterProjectOnly, setFilterProjectOnly] = useState(false);
  const [configs, setConfigs] = useState<HeartbeatConfig[]>([]);
  const [logs, setLogs] = useState<HeartbeatLog[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ enabled: false, interval_minutes: 30, check_items: [...ALL_CHECKS] });
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

  const handleEdit = useCallback((config: HeartbeatConfig) => {
    let checks = ALL_CHECKS;
    try { checks = JSON.parse(config.check_items_json); } catch { /* use default */ }
    setEditForm({ enabled: config.enabled === 1, interval_minutes: config.interval_minutes, check_items: checks });
    setEditingAgent(config.agent_id);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingAgent) return;
    setSaving(true);
    try {
      await updateHeartbeatConfig(editingAgent, editForm);
      setEditingAgent(null);
      refresh();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }, [editingAgent, editForm, refresh]);

  const handleTrigger = useCallback(async (agentId: string) => {
    setTriggering(agentId);
    try {
      await triggerHeartbeat(agentId);
      refresh();
    } catch (e) { console.error(e); }
    finally { setTriggering(null); }
  }, [refresh]);

  const toggleCheckItem = useCallback((item: HeartbeatCheckItem) => {
    setEditForm((prev) => ({
      ...prev,
      check_items: prev.check_items.includes(item)
        ? prev.check_items.filter((c) => c !== item)
        : [...prev.check_items, item],
    }));
  }, []);

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

  const bodyProps = useMemo(
    () => ({
      isKo,
      mono,
      standalone,
      filterProjectOnly,
      setFilterProjectOnly,
      projectAgentIds,
      visibleConfigs,
      visibleLogs,
      alertLogs,
      okCount,
      activeCount,
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
      configs,
      refresh,
      handleEdit,
      handleSave,
      handleTrigger,
      toggleCheckItem,
      confirm,
      showToast,
    }),
    [
      isKo,
      mono,
      standalone,
      filterProjectOnly,
      projectAgentIds,
      visibleConfigs,
      visibleLogs,
      alertLogs,
      okCount,
      activeCount,
      agentsWithoutConfig,
      addAgentId,
      addSelectKey,
      adding,
      agents,
      visibleAgents,
      editingAgent,
      editForm,
      saving,
      triggering,
      removingAgentId,
      expandedLogId,
      deletingLogId,
      deletingAllLogs,
      guideExpanded,
      configs,
      refresh,
      handleEdit,
      handleSave,
      handleTrigger,
      toggleCheckItem,
      confirm,
      showToast,
    ],
  );

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
        {expanded && <HeartbeatBody {...bodyProps} />}
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
      <div style={headerStyle}>
        <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--th-text-muted)" }}>HEARTBEAT</span>
        <span style={{ color: "var(--th-border)", fontSize: "9px" }}>·</span>
        <span style={{ fontSize: "9px", color: "var(--th-text-muted)" }}>{visibleConfigs.length} watching</span>
        {activeCount > 0 && <span style={{ fontSize: "9px", color: "#4ade80" }}>· {activeCount} active</span>}
        {alertLogs.length > 0 && <span style={{ fontSize: "9px", color: "#f59e0b" }}>· {alertLogs.length} alert</span>}
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
        <HeartbeatBody {...bodyProps} />
      </div>
    </div>
  );
}
