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
                <PaletteIconBox icon="↩" bg="#FFFFFF" />
                <span style={{ ...sf, fontSize: 14, color: isSel ? "#111827" : "#6B7280", flex: 1, textAlign: "left", position: "relative", zIndex: 1 }}>
                  {act.label}
                </span>
                <span style={{ ...sf, fontSize: 10, color: "#9CA3AF", position: "relative", zIndex: 1 }}>
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
                <span style={{ ...sf, fontSize: 14, color: isSel ? "#111827" : "#111827", flex: 1, textAlign: "left", position: "relative", zIndex: 1 }}>
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
                <PaletteIconBox icon="📁" bg="#FFFFFF" />
                <div style={{ flex: 1, textAlign: "left", overflow: "hidden", position: "relative", zIndex: 1 }}>
                  <div style={{ ...sf, fontSize: 14, color: isSel ? "#111827" : "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {project.name}
                  </div>
                  {project.project_path && (
                    <div style={{ ...sf, fontSize: 11, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
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
                    background: "#FFFFFF",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0, position: "relative", zIndex: 1,
                  }}
                >
                  {agent.avatar_emoji ?? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><line x1="12" y1="7" x2="12" y2="11" /><line x1="8" y1="16" x2="8" y2="16.01" /><line x1="16" y1="16" x2="16" y2="16.01" /></svg>}
                </span>
                <span style={{ ...sf, fontSize: 14, color: isSel ? "#111827" : "#111827", flex: 1, textAlign: "left", position: "relative", zIndex: 1 }}>
                  {agent.name}
                </span>
                <span
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    position: "relative", zIndex: 1,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot.color, display: "inline-block" }} />
                  <span style={{ ...sf, fontSize: 11, color: "#9CA3AF", textTransform: "uppercase" }}>{dot.label}</span>
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
                <span style={{ ...sf, fontSize: 14, color: isSel ? "#111827" : "#111827", flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", position: "relative", zIndex: 1 }}>
                  {task.title}
                </span>
                <span
                  style={{
                    ...sf, fontSize: 10,
                    color: "#9CA3AF",
                    background: "#FFFFFF",
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
                <span style={{ width: 28, height: 28, borderRadius: 7, background: isDone ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, position: "relative", zIndex: 1, color: isDone ? "#4ade80" : "#3B82F6" }}>
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  )}
                </span>
                <div style={{ flex: 1, textAlign: "left", overflow: "hidden", position: "relative", zIndex: 1 }}>
                  <div style={{ ...sf, fontSize: 14, color: isSel ? "#111827" : "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                  {d.agent_name && <div style={{ ...sf, fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{d.agent_name}{d.project_name ? ` · ${d.project_name}` : ""}</div>}
                </div>
                <span style={{ ...sf, fontSize: 10, color: isDone ? "#4ade80" : "#3B82F6", background: "#FFFFFF", borderRadius: 5, padding: "2px 7px", flexShrink: 0, position: "relative", zIndex: 1, textTransform: "uppercase" }}>
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
                  <div style={{ ...sf, fontSize: 14, color: isSel ? "#111827" : "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title}</div>
                  <div style={{ ...sf, fontSize: 11, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1, fontFamily: "var(--th-font-mono)" }}>{h.command}</div>
                </div>
                <span style={{ ...sf, fontSize: 10, color: "#9CA3AF", background: "#FFFFFF", borderRadius: 5, padding: "2px 7px", flexShrink: 0, position: "relative", zIndex: 1 }}>
                  {h.event_type}
                </span>
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
            color: "#9CA3AF",
          }}
        >
          {t({ ko: `"${query}"에 대한 결과 없음`, en: `No results for "${query}"`, ja: `"${query}"の結果なし`, zh: `"${query}"没有结果` })}
        </div>
      )}
    </div>
  );
}
