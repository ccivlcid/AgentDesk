import type { I18nContextValue } from "../../i18n";
import { STATUS_DOT } from "./constants";
import type { PaletteModel } from "./buildPaletteModel";
import type { PaletteItem } from "./types";
import { PaletteRow, PaletteIconBox, PaletteSectionHeader, SPOTLIGHT_SF_FONT } from "./CommandPalettePrimitives";

interface CommandPaletteResultsProps {
  t: I18nContextValue["t"];
  query: string;
  model: PaletteModel;
  safeIndex: number;
  onExecuteItem: (item: PaletteItem) => void;
}

export function CommandPaletteResults({
  t,
  query,
  model,
  safeIndex,
  onExecuteItem,
}: CommandPaletteResultsProps) {
  const sf = SPOTLIGHT_SF_FONT;
  const {
    q,
    recentActions,
    filteredActions,
    filteredProjects,
    filteredAgents,
    filteredTasks,
    filteredDeliverables,
    filteredHooks,
    filteredWorkflows,
    items,
  } = model;

  let flatIdx = 0;

  return (
    <div style={{ maxHeight: "58vh", overflowY: "auto", paddingBottom: 8 }}>

      {recentActions.length > 0 && (
        <div>
          <PaletteSectionHeader label={t({ ko: "최근 실행", en: "Recent", ja: "最近", zh: "最近" })} />
          {recentActions.map((act) => {
            const idx = flatIdx++;
            const isSel = idx === safeIndex;
            return (
              <PaletteRow key={`recent-${act.action}`} item={{ kind: "action", ...act }} idx={idx} safeIndex={safeIndex} onPick={onExecuteItem}>
                <PaletteIconBox icon="↩" bg="var(--th-bg-panel)" />
                <span style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-secondary)", flex: 1, textAlign: "left", position: "relative", zIndex: 1 }}>
                  {act.label}
                </span>
                <span style={{ ...sf, fontSize: 10, color: "var(--th-text-muted)", position: "relative", zIndex: 1 }}>
                  {t({ ko: "최근", en: "recent", ja: "最近", zh: "最近" })}
                </span>
              </PaletteRow>
            );
          })}
        </div>
      )}

      {filteredActions.length > 0 && (
        <div>
          <PaletteSectionHeader label={q
            ? t({ ko: "뷰 / 액션", en: "Actions", ja: "アクション", zh: "操作" })
            : t({ ko: "빠른 이동", en: "Navigation", ja: "ナビ", zh: "导航" })}
          />
          {filteredActions.map((act) => {
            const idx = flatIdx++;
            const isSel = idx === safeIndex;
            return (
              <PaletteRow key={act.action} item={{ kind: "action", ...act }} idx={idx} safeIndex={safeIndex} onPick={onExecuteItem}>
                <PaletteIconBox icon={act.icon} bg={act.bg} />
                <span style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", flex: 1, textAlign: "left", position: "relative", zIndex: 1 }}>
                  {act.label}
                </span>
              </PaletteRow>
            );
          })}
        </div>
      )}

      {filteredProjects.length > 0 && (
        <div>
          <PaletteSectionHeader label={t({ ko: "프로젝트 전환", en: "Projects", ja: "プロジェクト", zh: "项目" })} />
          {filteredProjects.map((project) => {
            const idx = flatIdx++;
            const isSel = idx === safeIndex;
            return (
              <PaletteRow key={project.id} item={{ kind: "project", project }} idx={idx} safeIndex={safeIndex} onPick={onExecuteItem}>
                <PaletteIconBox icon="📁" bg="var(--th-bg-panel)" />
                <div style={{ flex: 1, textAlign: "left", overflow: "hidden", position: "relative", zIndex: 1 }}>
                  <div style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {project.name}
                  </div>
                  {project.project_path && (
                    <div style={{ ...sf, fontSize: 11, color: "var(--th-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                      {project.project_path}
                    </div>
                  )}
                </div>
              </PaletteRow>
            );
          })}
        </div>
      )}

      {filteredAgents.length > 0 && (
        <div>
          <PaletteSectionHeader label={t({ ko: "에이전트", en: "Agents", ja: "エージェント", zh: "代理" })} />
          {filteredAgents.map((agent) => {
            const idx = flatIdx++;
            const isSel = idx === safeIndex;
            const dot = STATUS_DOT[agent.status] ?? STATUS_DOT.idle;
            return (
              <PaletteRow key={agent.id} item={{ kind: "agent", agent }} idx={idx} safeIndex={safeIndex} onPick={onExecuteItem}>
                <span
                  style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: "var(--th-bg-panel)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0, position: "relative", zIndex: 1,
                  }}
                >
                  {agent.avatar_emoji ?? "🤖"}
                </span>
                <span style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", flex: 1, textAlign: "left", position: "relative", zIndex: 1 }}>
                  {agent.name}
                </span>
                <span
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    position: "relative", zIndex: 1,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot.color, display: "inline-block" }} />
                  <span style={{ ...sf, fontSize: 11, color: "var(--th-text-muted)", textTransform: "uppercase" }}>{dot.label}</span>
                </span>
              </PaletteRow>
            );
          })}
        </div>
      )}

      {filteredTasks.length > 0 && (
        <div>
          <PaletteSectionHeader label={q
            ? t({ ko: "태스크", en: "Tasks", ja: "タスク", zh: "任务" })
            : t({ ko: "진행중 태스크", en: "In Progress", ja: "進行中", zh: "进行中" })}
          />
          {filteredTasks.map((task) => {
            const idx = flatIdx++;
            const isSel = idx === safeIndex;
            return (
              <PaletteRow key={task.id} item={{ kind: "task", task }} idx={idx} safeIndex={safeIndex} onPick={onExecuteItem}>
                <span
                  style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: "rgba(48,209,88,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, flexShrink: 0, position: "relative", zIndex: 1,
                    color: "#30d158", fontFamily: "var(--th-font-mono)", fontWeight: 700,
                  }}
                >
                  #{task.id}
                </span>
                <span style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", position: "relative", zIndex: 1 }}>
                  {task.title}
                </span>
                <span
                  style={{
                    ...sf, fontSize: 10,
                    color: "var(--th-text-muted)",
                    background: "var(--th-bg-panel)",
                    borderRadius: 5,
                    padding: "2px 7px",
                    flexShrink: 0,
                    position: "relative", zIndex: 1,
                  }}
                >
                  {task.status?.replace("_", " ").toUpperCase()}
                </span>
              </PaletteRow>
            );
          })}
        </div>
      )}

      {filteredDeliverables.length > 0 && (
        <div>
          <PaletteSectionHeader label={t({ ko: "산출물", en: "Deliverables", ja: "成果物", zh: "产出物" })} />
          {filteredDeliverables.map((d) => {
            const idx = flatIdx++;
            const isSel = idx === safeIndex;
            const isDone = d.status === "done";
            return (
              <PaletteRow key={d.id} item={{ kind: "deliverable", item: d }} idx={idx} safeIndex={safeIndex} onPick={onExecuteItem}>
                <span style={{ width: 28, height: 28, borderRadius: 7, background: isDone ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, position: "relative", zIndex: 1 }}>
                  {isDone ? "✓" : "·"}
                </span>
                <div style={{ flex: 1, textAlign: "left", overflow: "hidden", position: "relative", zIndex: 1 }}>
                  <div style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                  {d.agent_name && <div style={{ ...sf, fontSize: 11, color: "var(--th-text-muted)", marginTop: 1 }}>{d.agent_name}{d.project_name ? ` · ${d.project_name}` : ""}</div>}
                </div>
                <span style={{ ...sf, fontSize: 10, color: isDone ? "#4ade80" : "var(--th-accent)", background: "var(--th-bg-panel)", borderRadius: 5, padding: "2px 7px", flexShrink: 0, position: "relative", zIndex: 1, textTransform: "uppercase" }}>
                  {d.status}
                </span>
              </PaletteRow>
            );
          })}
        </div>
      )}

      {filteredHooks.length > 0 && (
        <div>
          <PaletteSectionHeader label={t({ ko: "훅", en: "Hooks", ja: "フック", zh: "钩子" })} />
          {filteredHooks.map((h) => {
            const idx = flatIdx++;
            const isSel = idx === safeIndex;
            return (
              <PaletteRow key={h.id} item={{ kind: "hook", hook: h }} idx={idx} safeIndex={safeIndex} onPick={onExecuteItem}>
                <PaletteIconBox icon="⤷" bg="#32ade6" />
                <div style={{ flex: 1, textAlign: "left", overflow: "hidden", position: "relative", zIndex: 1 }}>
                  <div style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title}</div>
                  <div style={{ ...sf, fontSize: 11, color: "var(--th-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1, fontFamily: "var(--th-font-mono)" }}>{h.command}</div>
                </div>
                <span style={{ ...sf, fontSize: 10, color: "var(--th-text-muted)", background: "var(--th-bg-panel)", borderRadius: 5, padding: "2px 7px", flexShrink: 0, position: "relative", zIndex: 1 }}>
                  {h.event_type}
                </span>
              </PaletteRow>
            );
          })}
        </div>
      )}

      {filteredWorkflows.length > 0 && (
        <div>
          <PaletteSectionHeader label={t({ ko: "저장된 워크플로", en: "Workflows", ja: "ワークフロー", zh: "工作流" })} />
          {filteredWorkflows.map((wf) => {
            const idx = flatIdx++;
            const isSel = idx === safeIndex;
            let nodeCount = 0;
            try { nodeCount = (JSON.parse(wf.nodes_json) as unknown[]).length; } catch { /* ignore */ }
            return (
              <PaletteRow key={wf.id} item={{ kind: "workflow", wf }} idx={idx} safeIndex={safeIndex} onPick={onExecuteItem}>
                <PaletteIconBox icon="⬡" bg="#8b5cf6" />
                <div style={{ flex: 1, textAlign: "left", overflow: "hidden", position: "relative", zIndex: 1 }}>
                  <div style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wf.name}</div>
                  <div style={{ ...sf, fontSize: 11, color: "var(--th-text-muted)", marginTop: 1 }}>{nodeCount} nodes</div>
                </div>
              </PaletteRow>
            );
          })}
        </div>
      )}

      {items.length === 0 && query && (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            ...sf,
            fontSize: 14,
            color: "var(--th-text-muted)",
          }}
        >
          {t({ ko: `"${query}"에 대한 결과 없음`, en: `No results for "${query}"`, ja: `"${query}"の結果なし`, zh: `"${query}"没有结果` })}
        </div>
      )}
    </div>
  );
}
