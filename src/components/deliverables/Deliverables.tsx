import { useState, useEffect, useCallback, useMemo } from "react";
import { useI18n } from "../../i18n";
import {
  getDeliverables,
  getTaskArtifacts,
  type DeliverableItem,
  type TaskArtifact,
} from "../../api";
import type { Agent, Project } from "../../types";
import DeliverableCard from "./DeliverableCard";
import { useToast } from "../ui";

type SortBy = "date" | "title" | "agent" | "project";

interface DeliverablesProps {
  agents: Agent[];
  currentProject?: Project | null;
}

type StatusFilter = "all" | "done" | "review";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function Deliverables({ agents, currentProject }: DeliverablesProps) {
  const { t } = useI18n();
  const { showToast } = useToast();

  const [items, setItems] = useState<DeliverableItem[]>([]);
  const [artifacts, setArtifacts] = useState<Record<string, TaskArtifact[]>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [showAllProjects, setShowAllProjects] = useState(!currentProject);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDeliverables();
      setItems(data);
    } catch {
      showToast(t({ ko: "산출물 로드에 실패했습니다.", en: "Failed to load deliverables.", ja: "成果物の読み込みに失敗しました。", zh: "加载成果物失败。" }), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  useEffect(() => {
    for (const item of items) {
      if (artifacts[item.id] !== undefined) continue;
      if (!item.project_path) {
        setArtifacts((prev) => ({ ...prev, [item.id]: [] }));
        continue;
      }
      getTaskArtifacts(item.id)
        .then((arts) => setArtifacts((prev) => ({ ...prev, [item.id]: arts })))
        .catch(() => setArtifacts((prev) => ({ ...prev, [item.id]: [] })));
    }
  }, [items, artifacts]);

  const handleArtifactsUploaded = useCallback((taskId: string, newArtifacts: TaskArtifact[]) => {
    setArtifacts((prev) => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), ...newArtifacts] }));
  }, []);

  const filtered = useMemo(() => {
    let result = items;

    // Project filter
    if (currentProject && !showAllProjects) {
      result = result.filter((i) => i.project_id === currentProject.id);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        i.agent_name.toLowerCase().includes(q) ||
        (i.project_name?.toLowerCase().includes(q) ?? false) ||
        (i.context_hint?.toLowerCase().includes(q) ?? false),
      );
    }

    // Sort
    if (sortBy === "title") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "agent") {
      result = [...result].sort((a, b) => a.agent_name.localeCompare(b.agent_name));
    } else if (sortBy === "project") {
      result = [...result].sort((a, b) => (a.project_name ?? "").localeCompare(b.project_name ?? ""));
    }
    // "date" is default server order (completed_at DESC)

    return result;
  }, [items, statusFilter, search, sortBy, currentProject, showAllProjects]);

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents) m.set(a.id, a);
    return m;
  }, [agents]);

  const doneCnt   = items.filter((i) => i.status === "done").length;
  const reviewCnt = items.filter((i) => i.status === "review").length;

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "all",    label: t({ ko: "전체",   en: "ALL",    ja: "すべて",     zh: "全部" }) },
    { key: "done",   label: t({ ko: "완료",   en: "DONE",   ja: "完了",       zh: "完成" }) },
    { key: "review", label: t({ ko: "검토중", en: "REVIEW", ja: "レビュー中", zh: "审核中" }) },
  ];

  return (
    <div
      style={{
        ...mono,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        background: "var(--th-bg-primary)",
      }}
    >
      {/* ── 터미널 헤더 (설정과 동일 macOS) ── */}
      <div
        style={{
          borderBottom: "1px solid var(--th-border)",
          padding: "12px 18px",
          background: "var(--th-bg-elevated)",
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
        <span style={{ fontSize: "11px", color: "var(--th-text-secondary)" }}>
          ls deliverables/{currentProject ? ` --project="${currentProject.name}"` : ""}
        </span>
        {!loading && (
          <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.6 }}>
            <span style={{ color: "var(--th-success)" }}>{doneCnt} {t({ ko: "완료", en: "done", ja: "完了", zh: "完成" })}</span>
            {reviewCnt > 0 && <> · <span style={{ color: "var(--th-accent)" }}>{reviewCnt} {t({ ko: "검토중", en: "review", ja: "レビュー中", zh: "审核中" })}</span></>}
            {" "}· {items.length} {t({ ko: "전체", en: "total", ja: "合計", zh: "总計" })}
          </span>
        )}
      </div>

      {/* ── 검색 + 정렬 바 ── */}
      <div style={{ borderBottom: "1px solid var(--th-border)", padding: "6px 12px", background: "var(--th-bg-primary)", display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t({ ko: "검색 (제목, 에이전트, 프로젝트...)", en: "Search (title, agent, project...)", ja: "検索...", zh: "搜索..." })}
          style={{ ...mono, flex: 1, fontSize: "10px", padding: "3px 8px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none" }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          style={{ ...mono, fontSize: "9px", padding: "3px 6px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-muted)", outline: "none", cursor: "pointer" }}
        >
          <option value="date">{t({ ko: "날짜순", en: "By Date", ja: "日付順", zh: "按日期" })}</option>
          <option value="title">{t({ ko: "제목순", en: "By Title", ja: "タイトル順", zh: "按标题" })}</option>
          <option value="agent">{t({ ko: "에이전트순", en: "By Agent", ja: "エージェント順", zh: "按代理" })}</option>
          <option value="project">{t({ ko: "프로젝트순", en: "By Project", ja: "プロジェクト順", zh: "按项目" })}</option>
        </select>
        <button
          onClick={() => { setArtifacts({}); void fetchItems(); }}
          style={{ ...mono, fontSize: "10px", padding: "3px 8px", borderRadius: 4, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}
          title={t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
        >↻</button>
      </div>

      {/* ── 필터 바 ── */}
      <div style={{ borderBottom: "1px solid var(--th-border)", padding: "4px 12px", background: "var(--th-bg-primary)", display: "flex", alignItems: "center", gap: 4 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            style={{
              ...mono, fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: 4,
              border: `1px solid ${statusFilter === f.key ? "var(--th-accent-border)" : "var(--th-border)"}`,
              background: statusFilter === f.key ? "var(--th-accent-glow)" : "transparent",
              color: statusFilter === f.key ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: "pointer", letterSpacing: "0.06em",
            }}
          >{f.label}</button>
        ))}
        {currentProject && (
          <>
            <div style={{ width: 1, height: 12, background: "var(--th-border)", margin: "0 4px" }} />
            <button
              onClick={() => setShowAllProjects((v) => !v)}
              style={{
                ...mono, fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                border: `1px solid ${showAllProjects ? "var(--th-accent)" : "var(--th-border)"}`,
                background: showAllProjects ? "rgba(96,165,250,0.08)" : "transparent",
                color: showAllProjects ? "var(--th-accent)" : "var(--th-text-muted)",
                cursor: "pointer",
              }}
            >
              {showAllProjects
                ? t({ ko: "전체 프로젝트", en: "All Projects", ja: "全プロジェクト", zh: "所有项目" })
                : t({ ko: `${currentProject.name}만`, en: `${currentProject.name} only`, ja: `${currentProject.name}のみ`, zh: `仅${currentProject.name}` })}
            </button>
          </>
        )}
        <span style={{ ...mono, marginLeft: "auto", fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.5 }}>
          {filtered.length} / {items.length}
        </span>
      </div>

      {/* ── 컨텐츠 영역 (설정과 동일 패딩) ── */}
      <div style={{ flex: 1, overflow: "auto", background: "var(--th-bg-primary)", padding: "20px 18px 24px" }}>
      {/* ── 컬럼 헤더 ── */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", padding: "4px 14px", background: "var(--th-bg-primary)", borderBottom: "1px solid var(--th-border)", gap: 8 }}>
          <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", width: 44, flexShrink: 0 }}>{t({ ko: "상태", en: "STATUS", ja: "状態", zh: "状态" })}</span>
          <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", flex: 1 }}>{t({ ko: "제목", en: "TITLE", ja: "タイトル", zh: "标题" })}</span>
          <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", width: 130, flexShrink: 0 }}>{t({ ko: "에이전트", en: "AGENT", ja: "エージェント", zh: "代理" })}</span>
          <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", width: 120, flexShrink: 0 }}>{t({ ko: "완료일시", en: "COMPLETED", ja: "完了日時", zh: "完成时间" })}</span>
          <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", width: 80, flexShrink: 0 }}>{t({ ko: "파일", en: "FILES", ja: "ファイル", zh: "文件" })}</span>
        </div>
      )}

      {/* ── 컨텐츠 ── */}
      {loading ? (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`skel-${i}`}
              style={{ height: 48, borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-surface)", opacity: 0.4, borderLeft: "3px solid var(--th-border)" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--th-text-muted)" }}>
          <div style={{ fontSize: "10px", marginBottom: 6 }}>$ ls deliverables/</div>
          <div style={{ fontSize: "11px", opacity: 0.5 }}>(empty)</div>
          <div style={{ fontSize: "10px", marginTop: 8, opacity: 0.4 }}>
            {t({ ko: "완료된 태스크가 없습니다", en: "No completed tasks", ja: "完了タスクなし", zh: "没有已完成的任务" })}
          </div>
        </div>
      ) : (
        <div>
          {filtered.map((report) => (
            <DeliverableCard
              key={report.id}
              report={report}
              artifacts={artifacts[report.id] ?? null}
              agent={report.assigned_agent_id ? agentMap.get(report.assigned_agent_id) ?? null : null}
              agents={agents}
              onArtifactsUploaded={handleArtifactsUploaded}
            />
          ))}
        </div>
      )}

      {/* ── footer ── */}
      {!loading && (
        <div style={{ borderTop: "1px solid var(--th-border)", padding: "5px 16px", background: "var(--th-bg-primary)" }}>
          <span style={{ fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.4 }}>
            $ {filtered.length} {t({ ko: "건", en: "entries", ja: "件", zh: "条" })}{statusFilter !== "all" ? ` (${t({ ko: "필터", en: "filtered", ja: "フィルタ", zh: "过滤" })}: ${statusFilter})` : ""}
          </span>
        </div>
      )}
      </div>
    </div>
  );
}
