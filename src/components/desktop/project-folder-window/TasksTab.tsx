import { useState, useEffect } from "react";
import type { Task, Agent } from "../../../types";
import type { TaskReportDetail } from "../../../api/providers-reports-github";
import { getTaskReportDetail } from "../../../api/providers-reports-github";
import { useI18n } from "../../../i18n";
import { STATUS_COLORS, STATUS_LABEL } from "./constants";
import { timeAgo, fmtTime, elapsed } from "./utils";
import {
  DonePreview,
  RunningPreview,
  PendingPreview,
} from "./TaskPreviewPanels";

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 10,
        padding: "3px 8px",
        borderRadius: 4,
        border: "1px solid #E5E7EB",
        background: active ? "var(--th-accent-glow)" : "var(--th-bg-elevated)",
        color: active ? "var(--th-accent)" : "var(--th-text-secondary)",
        cursor: "pointer",
        fontFamily: "var(--th-font-mono)",
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {children}
    </button>
  );
}

function TaskPreview({ task, allAgents }: { task: Task; allAgents: Agent[] }) {
  const { t } = useI18n();
  const [report, setReport] = useState<TaskReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportTab, setReportTab] = useState<"result" | "logs" | "subtasks">("result");

  useEffect(() => {
    setReport(null);
    setReportTab("result");
    if (task.status === "done") {
      setLoading(true);
      getTaskReportDetail(task.id)
        .then((d) => setReport(d))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [task.id, task.status]);

  const agent = allAgents.find((a) => a.id === task.assigned_agent_id);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--th-text-primary)", lineHeight: 1.3, wordBreak: "break-word" }}>
              {task.title}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--th-bg-elevated)", border: "1px solid #E5E7EB", color: STATUS_COLORS[task.status], display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 7 }}>●</span>{STATUS_LABEL[task.status]}
              </span>
              {agent && (
                <span style={{ fontSize: 10, color: "var(--th-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  {agent.avatar_emoji} {agent.name}
                </span>
              )}
              {task.started_at && (
                <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>
                  ⏱ {elapsed(task.started_at, task.completed_at ?? Date.now())}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 10, color: "var(--th-text-muted)" }}>
          <span>{t({ ko: "생성:", en: "Created:", ja: "作成:", zh: "创建:" })} {fmtTime(task.created_at)}</span>
          {task.started_at && <span>{t({ ko: "시작:", en: "Started:", ja: "開始:", zh: "开始:" })} {fmtTime(task.started_at)}</span>}
          {task.completed_at && <span>{t({ ko: "완료:", en: "Done:", ja: "完了:", zh: "完成:" })} {fmtTime(task.completed_at)}</span>}
        </div>
      </div>

      {task.status === "done" ? (
        <DonePreview report={report} loading={loading} reportTab={reportTab} setReportTab={setReportTab} task={task} />
      ) : task.status === "in_progress" || task.status === "collaborating" ? (
        <RunningPreview task={task} />
      ) : (
        <PendingPreview task={task} />
      )}
    </div>
  );
}

export function TasksTab({ tasks, statusCounts, allAgents }: { tasks: Task[]; statusCounts: Record<string, number>; allAgents: Agent[] }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeStatuses = Object.keys(statusCounts);
  const visible = tasks.filter((task) => {
    if (filter !== "all" && task.status !== filter) return false;
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedTask = visible.find((task) => task.id === selectedId) ?? visible[0] ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 6, padding: "7px 12px", flexShrink: 0, borderBottom: "1px solid #E5E7EB", flexWrap: "wrap", rowGap: 4 }}>
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>{t({ ko: "전체", en: "All", ja: "全て", zh: "全部" })} ({tasks.length})</FilterBtn>
        {activeStatuses.map((s) => (
          <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>
            <span style={{ color: STATUS_COLORS[s as keyof typeof STATUS_COLORS], fontSize: 7 }}>●</span>
            {STATUS_LABEL[s as keyof typeof STATUS_LABEL]} ({statusCounts[s]})
          </FilterBtn>
        ))}
        <input
          type="text"
          placeholder={t({ ko: "검색...", en: "search...", ja: "検索...", zh: "搜索..." })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginLeft: "auto", fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", outline: "none", width: 110 }}
        />
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ width: 240, flexShrink: 0, overflowY: "auto", borderRight: "1px solid #E5E7EB" }}>
          {visible.length === 0 && (
            <div style={{ padding: "32px 12px", textAlign: "center", color: "var(--th-text-muted)", fontSize: 11 }}>{t({ ko: "태스크 없음", en: "No tasks", ja: "タスクなし", zh: "无任务" })}</div>
          )}
          {visible.map((task) => {
            const isSelected = task.id === selectedTask?.id;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedId(task.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  width: "100%",
                  padding: "9px 12px",
                  borderBottom: "1px solid #E5E7EB",
                  background: isSelected ? "var(--th-accent-glow)" : "transparent",
                  border: "none",
                  borderBottomColor: "var(--th-border)",
                  borderBottomWidth: 1,
                  borderBottomStyle: "solid",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "var(--th-bg-elevated)"; }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span style={{ color: STATUS_COLORS[task.status], fontSize: 7, marginTop: 4, flexShrink: 0 }}>●</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? "var(--th-accent)" : (task.status === "done" || task.status === "cancelled" ? "var(--th-text-muted)" : "var(--th-text-primary)"),
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textDecoration: task.status === "cancelled" ? "line-through" : "none",
                  }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>
                    {task.agent_avatar ?? ""} {task.agent_name ?? "—"} · {timeAgo(task.created_at)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {selectedTask
            ? <TaskPreview task={selectedTask} allAgents={allAgents} />
            : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--th-text-muted)", fontSize: 12 }}>{t({ ko: "태스크를 선택하세요", en: "Select a task", ja: "タスクを選択", zh: "选择任务" })}</div>
          }
        </div>
      </div>
    </div>
  );
}
