import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import type { Agent, Department, Persona } from "../types";
import { useI18n } from "../i18n";
import * as api from "../api";
import { fetchPersonas } from "../api/categories-dashboard";
import AgentFormModal from "./agent-manager/AgentFormModal";
import AgentsTab from "./agent-manager/AgentsTab";
import { BLANK } from "./agent-manager/constants";
import DepartmentFormModal from "./agent-manager/DepartmentFormModal";
import DepartmentsTab from "./agent-manager/DepartmentsTab";
import type { AgentManagerProps, FormData } from "./agent-manager/types";

export default function AgentManager({
  agents,
  departments,
  onAgentsChange,
  projectAgentIds,
  createTrigger,
}: AgentManagerProps) {
  const { t, locale } = useI18n();
  const isKo = locale.startsWith("ko");
  const tr = (ko: string, en: string, ja?: string, zh?: string) => t({ ko, en, ja: ja ?? en, zh: zh ?? en });

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personasLoading, setPersonasLoading] = useState(true);

  useEffect(() => {
    setPersonasLoading(true);
    fetchPersonas()
      .then((ps) => setPersonas(ps))
      .catch(() => setPersonas([]))
      .finally(() => setPersonasLoading(false));
  }, []);

  const [subTab, setSubTab] = useState<"agents" | "departments">("agents");
  const [search, setSearch] = useState("");
  const [deptTab, setDeptTab] = useState("all");
  const [modalAgent, setModalAgent] = useState<Agent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormData>({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deptOrder, setDeptOrder] = useState<Department[]>([]);
  const [deptOrderDirty, setDeptOrderDirty] = useState(false);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [draggingDeptId, setDraggingDeptId] = useState<string | null>(null);
  const [dragOverDeptId, setDragOverDeptId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"before" | "after" | null>(null);

  useEffect(() => {
    setDeptOrder([...departments].sort((a, b) => a.sort_order - b.sort_order));
    setDeptOrderDirty(false);
    setDraggingDeptId(null);
    setDragOverDeptId(null);
    setDragOverPosition(null);
  }, [departments]);

  const filteredAgents = useMemo(
    () =>
      agents.filter((agent) => {
        if (deptTab !== "all" && agent.department_id !== deptTab) return false;
        if (!search) return true;
        const query = search.toLowerCase();
        return (
          agent.name.toLowerCase().includes(query) ||
          agent.name_ko.toLowerCase().includes(query) ||
          (agent.name_ja || "").toLowerCase().includes(query) ||
          (agent.name_zh || "").toLowerCase().includes(query)
        );
      }),
    [agents, deptTab, search],
  );

  const sortedAgents = useMemo(() => {
    const roleOrder: Record<string, number> = { team_leader: 0, senior: 1, junior: 2, intern: 3 };
    return [...filteredAgents].sort(
      (a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9) || a.name.localeCompare(b.name),
    );
  }, [filteredAgents]);

  const openCreate = useCallback(() => {
    setModalAgent(null);
    setForm({ ...BLANK, department_id: deptTab !== "all" ? deptTab : departments[0]?.id || "" });
    setShowModal(true);
  }, [deptTab, departments]);

  // Dock "새 에이전트" 버튼: createTrigger가 증가할 때마다 채용 모달 즉시 열기
  useEffect(() => {
    if (createTrigger && createTrigger > 0) openCreate();
  }, [createTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = useCallback(
    async (agent: Agent) => {
      setModalAgent(agent);
      // Load persona from .md file
      let personaText = "";
      try {
        personaText = await api.getAgentPersona(agent.id);
      } catch { /* ignore */ }
      setForm({
        name: agent.name,
        name_ko: agent.name_ko,
        name_ja: agent.name_ja || "",
        name_zh: agent.name_zh || "",
        department_id: agent.department_id || "",
        role: agent.role,
        cli_provider: agent.cli_provider,
        api_provider_id: agent.api_provider_id ?? null,
        api_model: agent.api_model ?? null,
        avatar_emoji: agent.avatar_emoji,
        avatar_url: agent.avatar_url ?? null,
        pendingAvatarDataUrl: null,
        sprite_number: agent.sprite_number ?? null,
        personality: personaText,
        persona_id: agent.persona_id || undefined,
        kb_default_sources: (() => {
          try {
            return (agent as any).kb_default_sources
              ? JSON.parse((agent as any).kb_default_sources)
              : undefined;
          } catch { return undefined; }
        })(),
      });
      setShowModal(true);
    },
    [agents],
  );

  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalAgent(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const departmentId = form.department_id.trim();
      const basePayload = {
        name: form.name.trim(),
        name_ko: form.name_ko.trim(),
        name_ja: form.name_ja.trim(),
        name_zh: form.name_zh.trim(),
        role: form.role,
        cli_provider: form.cli_provider,
        api_provider_id: form.api_provider_id || null,
        api_model: form.api_model?.trim() || null,
        avatar_emoji: form.avatar_emoji || "🤖",
        sprite_number: form.sprite_number,
        personality: form.personality.trim() || null,
        persona_id: form.persona_id || null,
        kb_default_sources: form.kb_default_sources && form.kb_default_sources.length > 0
          ? JSON.stringify(form.kb_default_sources)
          : null,
      };
      let savedAgentId: string | undefined = modalAgent?.id;
      if (modalAgent) {
        await api.updateAgent(modalAgent.id, {
          ...basePayload,
          department_id: departmentId || null,
        });
      } else {
        const createdAgent = await api.createAgent({
          ...basePayload,
          department_id: departmentId || null,
        });
        savedAgentId = createdAgent.id;
      }
      onAgentsChange();
      // Avatar upload/delete (after agent is saved so we have an ID)
      const agentId = savedAgentId;
      if (agentId) {
        if (form.pendingAvatarDataUrl) {
          await api.uploadAgentAvatar(agentId, form.pendingAvatarDataUrl).catch((e) =>
            console.error("Avatar upload failed:", e),
          );
        } else if (form.avatar_url === null && modalAgent?.avatar_url) {
          // User explicitly removed the avatar
          await api.deleteAgentAvatar(agentId).catch((e) =>
            console.error("Avatar delete failed:", e),
          );
        }
      }

      closeModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Save failed:", msg);
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }, [
    agents,
    closeModal,
    departments,
    form,
    modalAgent,
    onAgentsChange,
  ]);

  const handleDelete = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        await api.deleteAgent(id);
        onAgentsChange();
        setConfirmDeleteId(null);
        if (modalAgent?.id === id) closeModal();
      } catch (err) {
        console.error("Delete failed:", err);
      } finally {
        setSaving(false);
      }
    },
    [
      closeModal,
      modalAgent,
      onAgentsChange,
    ],
  );

  const openCreateDept = useCallback(() => {
    setEditDept(null);
    setShowDeptModal(true);
  }, []);

  const openEditDept = useCallback((department: Department) => {
    setEditDept(department);
    setShowDeptModal(true);
  }, []);

  const closeDeptModal = useCallback(() => {
    setShowDeptModal(false);
    setEditDept(null);
  }, []);

  const moveDept = useCallback(
    (index: number, direction: -1 | 1) => {
      const nextOrder = [...deptOrder];
      const target = index + direction;
      if (target < 0 || target >= nextOrder.length) return;
      [nextOrder[index], nextOrder[target]] = [nextOrder[target], nextOrder[index]];
      setDeptOrder(nextOrder);
      setDeptOrderDirty(true);
    },
    [deptOrder],
  );

  const getDropPosition = useCallback((event: DragEvent<HTMLDivElement>): "before" | "after" => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  }, []);

  const clearDeptDragState = useCallback(() => {
    setDraggingDeptId(null);
    setDragOverDeptId(null);
    setDragOverPosition(null);
  }, []);

  const moveDeptByDrag = useCallback(
    (dragDeptId: string, targetDeptId: string, position: "before" | "after") => {
      if (dragDeptId === targetDeptId) return;
      const fromIndex = deptOrder.findIndex((department) => department.id === dragDeptId);
      const targetIndex = deptOrder.findIndex((department) => department.id === targetDeptId);
      if (fromIndex < 0 || targetIndex < 0) return;

      const nextOrder = [...deptOrder];
      const [dragged] = nextOrder.splice(fromIndex, 1);
      let insertIndex = targetIndex + (position === "after" ? 1 : 0);
      if (fromIndex < insertIndex) insertIndex -= 1;
      insertIndex = Math.max(0, Math.min(insertIndex, nextOrder.length));
      nextOrder.splice(insertIndex, 0, dragged);

      const changed = nextOrder.some((department, i) => department.id !== deptOrder[i]?.id);
      if (!changed) return;
      setDeptOrder(nextOrder);
      setDeptOrderDirty(true);
    },
    [deptOrder],
  );

  const saveDeptOrder = useCallback(async () => {
    setReorderSaving(true);
    try {
      const nextDepartments = deptOrder.map((department, index) => ({
        ...department,
        sort_order: index + 1,
      }));
      const orders = nextDepartments.map((department) => ({ id: department.id, sort_order: department.sort_order }));
      await api.reorderDepartments(orders);
      onAgentsChange();
      setDeptOrderDirty(false);
    } catch (err) {
      console.error("Reorder failed:", err);
    } finally {
      setReorderSaving(false);
    }
  }, [deptOrder, onAgentsChange]);

  const resetDeptOrder = useCallback(() => {
    setDeptOrder([...departments].sort((a, b) => a.sort_order - b.sort_order));
    setDeptOrderDirty(false);
  }, [departments]);

  const handleDeptDragStart = useCallback((deptId: string, event: DragEvent<HTMLDivElement>) => {
    setDraggingDeptId(deptId);
    setDragOverDeptId(null);
    setDragOverPosition(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", deptId);
  }, []);

  const handleDeptDragOver = useCallback(
    (deptId: string, event: DragEvent<HTMLDivElement>) => {
      if (!draggingDeptId || draggingDeptId === deptId) return;
      event.preventDefault();
      const nextPosition = getDropPosition(event);
      if (dragOverDeptId !== deptId || dragOverPosition !== nextPosition) {
        setDragOverDeptId(deptId);
        setDragOverPosition(nextPosition);
      }
      event.dataTransfer.dropEffect = "move";
    },
    [dragOverDeptId, dragOverPosition, draggingDeptId, getDropPosition],
  );

  const handleDeptDrop = useCallback(
    (deptId: string, event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const droppedId = event.dataTransfer.getData("text/plain") || draggingDeptId;
      if (droppedId && droppedId !== deptId) {
        moveDeptByDrag(droppedId, deptId, getDropPosition(event));
      }
      clearDeptDragState();
    },
    [clearDeptDragState, draggingDeptId, getDropPosition, moveDeptByDrag],
  );

  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  return (
    <div
      className="min-h-0 flex-1 flex flex-col w-full"
      style={{
        ...mono,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}
    >
      {/* ── 터미널 헤더 (macOS) ── */}
      <div
        style={{
          borderBottom: "1px solid var(--th-border)",
          padding: "12px 18px",
          background: "var(--th-bg-panel)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <span style={{ color: "var(--th-accent)", fontWeight: 700, fontSize: "11px" }}>$</span>
        <span style={{ fontSize: "11px", color: "var(--th-text-muted)" }}>
          ls agents/ --all{deptTab !== "all" ? ` --dept="${deptTab}"` : ""}
        </span>
        <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.6 }}>
          {agents.length} agents · {departments.length} depts
        </span>
      </div>

      {/* ── 서브탭 + 액션 버튼 ── */}
      <div style={{ borderBottom: "1px solid var(--th-border)", display: "flex", alignItems: "stretch", background: "var(--th-bg-primary)", padding: "6px 12px 0" }}>
        {([
          { key: "agents" as const, label: tr("직원", "AGENTS", "エージェント", "代理") },
          { key: "departments" as const, label: tr("부서", "DEPARTMENTS", "部署", "部门") },
        ] as const).map((tab, idx) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSubTab(tab.key)}
            style={{
              ...mono,
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "8px 20px",
              border: "none",
              borderRight: idx === 0 ? "1px solid var(--th-border)" : "none",
              borderBottom: subTab === tab.key ? "2px solid var(--th-accent)" : "2px solid transparent",
              background: subTab === tab.key ? "var(--th-bg-elevated)" : "transparent",
              color: subTab === tab.key ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: "pointer",
              borderRadius: "6px 6px 0 0",
            }}
          >
            {tab.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, paddingLeft: 8 }}>
          <button
            type="button"
            onClick={openCreateDept}
            style={{
              ...mono,
              fontSize: "9px",
              fontWeight: 700,
              padding: "6px 12px",
              border: "1px solid var(--th-border)",
              borderRadius: 6,
              background: "none",
              color: "var(--th-text-muted)",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--th-accent)"; e.currentTarget.style.background = "rgba(245,158,11,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-muted)"; e.currentTarget.style.background = "none"; }}
          >
            + {tr("부서 추가", "ADD DEPT", "部署追加", "添加部门")}
          </button>
          <button
            type="button"
            onClick={openCreate}
            style={{
              ...mono,
              fontSize: "9px",
              fontWeight: 700,
              padding: "6px 14px",
              border: "none",
              borderRadius: 6,
              background: "rgba(245,158,11,0.08)",
              color: "var(--th-accent)",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245,158,11,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(245,158,11,0.08)"; }}
          >
            + {tr("신규 채용", "HIRE", "採用", "招聘")}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
      {subTab === "agents" && (
        <AgentsTab
          tr={tr}
          locale={locale}
          isKo={isKo}
          agents={agents}
          departments={departments}
          personas={personas}
          personasLoading={personasLoading}
          projectAgentIds={projectAgentIds}
          deptTab={deptTab}
          setDeptTab={setDeptTab}
          search={search}
          setSearch={setSearch}
          sortedAgents={sortedAgents}
          confirmDeleteId={confirmDeleteId}
          setConfirmDeleteId={setConfirmDeleteId}
          onEditAgent={openEdit}
          onEditDepartment={openEditDept}
          onDeleteAgent={handleDelete}
          saving={saving}
        />
      )}

      {subTab === "departments" && (
        <DepartmentsTab
          tr={tr}
          locale={locale}
          agents={agents}
          departments={departments}
          deptOrder={deptOrder}
          deptOrderDirty={deptOrderDirty}
          reorderSaving={reorderSaving}
          draggingDeptId={draggingDeptId}
          dragOverDeptId={dragOverDeptId}
          dragOverPosition={dragOverPosition}
          onSaveOrder={saveDeptOrder}
          onCancelOrder={resetDeptOrder}
          onMoveDept={moveDept}
          onEditDept={openEditDept}
          onDragStart={handleDeptDragStart}
          onDragOver={handleDeptDragOver}
          onDrop={handleDeptDrop}
          onDragEnd={clearDeptDragState}
        />
      )}
      </div>

      {showModal && (
        <AgentFormModal
          isKo={isKo}
          locale={locale}
          tr={tr}
          form={form}
          setForm={setForm}
          departments={departments}
          isEdit={!!modalAgent}
          saving={saving}
          saveError={saveError}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {showDeptModal && (
        <DepartmentFormModal
          locale={locale}
          tr={tr}
          department={editDept}
          departments={departments}
          onSave={() => {
            onAgentsChange();
          }}
          onClose={closeDeptModal}
        />
      )}
    </div>
  );
}
