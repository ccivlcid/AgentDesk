import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  UserPlus, 
  Briefcase, 
  Users, 
  Filter, 
  X,
  ChevronRight,
  Terminal,
  Activity,
  Plus
} from "lucide-react";
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
        if (!search.trim()) return true;
        const query = search.toLowerCase().trim();
        return (
          agent.name.toLowerCase().includes(query) ||
          agent.name_ko.toLowerCase().includes(query) ||
          (agent.name_ja || "").toLowerCase().includes(query) ||
          (agent.name_zh || "").toLowerCase().includes(query) ||
          (agent.role || "").toLowerCase().includes(query) ||
          (agent.cli_provider || "").toLowerCase().includes(query)
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

  const prevTriggerRef = useRef(createTrigger ?? 0);
  useEffect(() => {
    if (createTrigger && createTrigger > prevTriggerRef.current) {
      prevTriggerRef.current = createTrigger;
      openCreate();
    }
  }, [createTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = useCallback(
    async (agent: Agent) => {
      setModalAgent(agent);
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
        enable_planning_phase: agent.enable_planning_phase ?? 1,
        specialty: agent.specialty ?? "",
        autonomy_level: agent.autonomy_level ?? "balanced",
        max_concurrent_tasks: agent.max_concurrent_tasks ?? 1,
      });
      setShowModal(true);
    },
    [],
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
        enable_planning_phase: form.enable_planning_phase ?? 1,
        specialty: form.specialty?.trim() || null,
        autonomy_level: form.autonomy_level || "balanced",
        max_concurrent_tasks: form.max_concurrent_tasks ?? 1,
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
      const agentId = savedAgentId;
      if (agentId) {
        if (form.pendingAvatarDataUrl) {
          await api.uploadAgentAvatar(agentId, form.pendingAvatarDataUrl).catch((e) =>
            console.error("Avatar upload failed:", e),
          );
        } else if (form.avatar_url === null && modalAgent?.avatar_url) {
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
  }, [closeModal, form, modalAgent, onAgentsChange]);

  const handleDelete = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        await api.deleteAgent(id);
        onAgentsChange();
        setConfirmDeleteId(null);
        if (modalAgent?.id === id) closeModal();
      } catch (err) { console.error("Delete failed:", err); } finally { setSaving(false); }
    },
    [closeModal, modalAgent, onAgentsChange],
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
      const orders = deptOrder.map((department, index) => ({ id: department.id, sort_order: index + 1 }));
      await api.reorderDepartments(orders);
      onAgentsChange();
      setDeptOrderDirty(false);
    } catch (err) { console.error("Reorder failed:", err); } finally { setReorderSaving(false); }
  }, [deptOrder, onAgentsChange]);

  const resetDeptOrder = useCallback(() => {
    setDeptOrder([...departments].sort((a, b) => a.sort_order - b.sort_order));
    setDeptOrderDirty(false);
  }, [departments]);

  const handleDeptDragStart = useCallback((deptId: string, event: DragEvent<HTMLDivElement>) => {
    setDraggingDeptId(deptId);
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
      if (droppedId && droppedId !== deptId) moveDeptByDrag(droppedId, deptId, getDropPosition(event));
      clearDeptDragState();
    },
    [clearDeptDragState, draggingDeptId, getDropPosition, moveDeptByDrag],
  );

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
        fontFamily: "var(--th-font-body)",
      }}
    >
      {/* ── Header: Activity Stats + Actions ── */}
      <div style={{ 
        padding: "24px 28px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        borderBottom: "1px solid #E5E7EB",
        background: "#F9FAFB"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ padding: 10, background: "#3B82F6", borderRadius: 14, color: "white" }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
              {tr("인재 관리", "Talent Management", "タレント管理", "人才管理")}
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#059669" }}>●</span>
              {agents.length} Agents · {departments.length} Specialties
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={openCreateDept}
            style={{
              padding: "8px 16px", borderRadius: 10, border: "1px solid #D1D5DB",
              background: "#FFFFFF", color: "#111827",
              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 8
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F3F4F6")}
            onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}
          >
            <Plus size={14} /> {tr("전문 분야", "Add Specialty", "専門分野", "专业领域")}
          </button>
          <button
            onClick={openCreate}
            style={{
              padding: "8px 18px", borderRadius: 10, border: "none",
              background: "#3B82F6", color: "white",
              fontSize: 12, fontWeight: 800, cursor: "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 12px rgba(59,130,246,0.3)"
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <UserPlus size={14} /> {tr("신규 채용", "Hire Agent", "採用", "招聘")}
          </button>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div style={{ padding: "16px 28px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ 
          flex: 1, display: "flex", alignItems: "center", gap: 12,
          background: "#FFFFFF", border: "1px solid #D1D5DB",
          borderRadius: 14, padding: "0 16px", height: 42
        }}>
          <Search size={16} className="text-muted opacity-50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr("이름, 역할, 기술 검색...", "Search by name, role, or skills...", "検索...", "搜索...")}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#111827", fontSize: 13 }}
          />
          {search && <X size={14} className="cursor-pointer opacity-50 hover:opacity-100" onClick={() => setSearch("")} />}
        </div>

        {/* Sub-Tab Toggle */}
        <div style={{ 
          display: "flex", background: "#F3F4F6",
          padding: 2, borderRadius: 12, border: "1px solid #E5E7EB" 
        }}>
          <button
            onClick={() => setSubTab("agents")}
            style={{
              padding: "8px 16px", border: "none", borderRadius: 10, fontSize: 11, fontWeight: 700,
              cursor: "pointer", transition: "all 0.2s",
              background: subTab === "agents" ? "#FFFFFF" : "transparent",
              color: subTab === "agents" ? "#111827" : "#9CA3AF",
            }}
          >
            {tr("직원 목록", "Agents", "エージェント", "代理")}
          </button>
          <button
            onClick={() => setSubTab("departments")}
            style={{
              padding: "8px 16px", border: "none", borderRadius: 10, fontSize: 11, fontWeight: 700,
              cursor: "pointer", transition: "all 0.2s",
              background: subTab === "departments" ? "#FFFFFF" : "transparent",
              color: subTab === "departments" ? "#111827" : "#9CA3AF",
            }}
          >
            {tr("전문 분야", "Specialties", "専門分野", "专业领域")}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: "0 28px 28px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={subTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {subTab === "agents" && (
              <AgentsTab
                tr={tr} locale={locale} isKo={isKo}
                agents={agents} departments={departments} personas={personas}
                personasLoading={personasLoading} projectAgentIds={projectAgentIds}
                deptTab={deptTab} setDeptTab={setDeptTab}
                sortedAgents={sortedAgents} confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
                onEditAgent={openEdit} onEditDepartment={openEditDept}
                onDeleteAgent={handleDelete} saving={saving}
              />
            )}

            {subTab === "departments" && (
              <DepartmentsTab
                tr={tr} locale={locale} agents={agents} departments={departments}
                deptOrder={deptOrder} deptOrderDirty={deptOrderDirty}
                reorderSaving={reorderSaving} draggingDeptId={draggingDeptId}
                dragOverDeptId={dragOverDeptId} dragOverPosition={dragOverPosition}
                onSaveOrder={saveDeptOrder} onCancelOrder={resetDeptOrder}
                onMoveDept={moveDept} onEditDept={openEditDept}
                onDragStart={handleDeptDragStart} onDragOver={handleDeptDragOver}
                onDrop={handleDeptDrop} onDragEnd={clearDeptDragState}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {showModal && (
        <AgentFormModal
          isKo={isKo} locale={locale} tr={tr} form={form} setForm={setForm}
          departments={departments} isEdit={!!modalAgent}
          saving={saving} saveError={saveError} onSave={handleSave} onClose={closeModal}
          asWindow={true}
        />
      )}

      {showDeptModal && (
        <DepartmentFormModal
          locale={locale} tr={tr} department={editDept} departments={departments}
          onSave={onAgentsChange} onClose={closeDeptModal}
        />
      )}
    </div>
  );
}
