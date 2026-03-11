import { useEffect, useMemo, useState } from "react";
import type { Agent, Department } from "../types";
import type { TaskReportSummary, TaskReportDetail } from "../api";
import type { UiLanguage } from "../i18n";
import { pickLang } from "../i18n";
import { getTaskReports, getTaskReportDetail } from "../api";
import TaskReportPopup from "./TaskReportPopup";

interface ReportHistoryProps {
  agents: Agent[];
  departments: Department[];
  uiLanguage: UiLanguage;
  onClose: () => void;
}

const PAGE_SIZE = 50;

function fmtDate(ts: number | null | undefined): string {
  if (!ts) return "--:--";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "--:--";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function elapsed(start: number | null | undefined, end: number | null | undefined): string {
  if (!start || !end) return "-";
  const ms = end - start;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function projectNameFromSummary(report: TaskReportSummary): string {
  if (report.project_name && report.project_name.trim()) return report.project_name.trim();
  if (!report.project_path) return "general";
  const trimmed = report.project_path.replace(/[\\/]+$/, "");
  return trimmed.split(/[\\/]/).pop() || "general";
}

export default function ReportHistory({ agents, departments, uiLanguage, onClose }: ReportHistoryProps) {
  const t = (text: { ko: string; en: string; ja?: string; zh?: string }) => pickLang(uiLanguage, text);
  const [reports, setReports] = useState<TaskReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TaskReportDetail | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    getTaskReports()
      .then((r) => setReports(r))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setPage(0); }, [search]);

  const filtered = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.agent_name || "").toLowerCase().includes(q) ||
        (r.agent_name_ko || "").toLowerCase().includes(q) ||
        projectNameFromSummary(r).toLowerCase().includes(q),
    );
  }, [reports, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
  const pageReports = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const handleOpenDetail = async (taskId: string) => {
    setOpeningId(taskId);
    try {
      const d = await getTaskReportDetail(taskId);
      setDetail(d);
    } catch (e) {
      console.error(e);
    } finally {
      setOpeningId(null);
    }
  };

  if (detail) {
    return (
      <TaskReportPopup
        report={detail}
        agents={agents}
        departments={departments}
        uiLanguage={uiLanguage}
        onClose={() => setDetail(null)}
      />
    );
  }

  void departments;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <button
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={onClose}
        aria-label="Close"
      />

      {/* Terminal Panel */}
      <div
        className="relative flex h-full w-full flex-col overflow-hidden sm:w-[640px]"
        style={{ background: "#0d1117", borderLeft: "1px solid #30363d" }}
      >
        {/* Terminal title bar */}
        <div
          className="flex flex-shrink-0 items-center gap-2 px-4 py-2.5"
          style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}
        >
          {/* macOS dots */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="h-3 w-3 transition hover:opacity-80"
              style={{ borderRadius: "50%", background: "#ff5f57" }}
              title="Close"
            />
            <div className="h-3 w-3" style={{ borderRadius: "50%", background: "#30363d" }} />
            <div className="h-3 w-3" style={{ borderRadius: "50%", background: "#30363d" }} />
          </div>
          <div className="flex-1 text-center text-[11px] font-mono" style={{ color: "#8b949e" }}>
            agentdesk — report-history
          </div>
          <button
            onClick={onClose}
            className="text-[11px] font-mono transition hover:opacity-70"
            style={{ color: "#8b949e" }}
          >
            ✕
          </button>
        </div>

        {/* Shell output area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" style={{ fontFamily: "var(--th-font-mono)" }}>
          {/* $ command line */}
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span style={{ color: "#3fb950" }}>agentdesk</span>
            <span style={{ color: "#8b949e" }}>on</span>
            <span style={{ color: "#58a6ff" }}>main</span>
            <span style={{ color: "#8b949e" }}>via</span>
            <span style={{ color: "#f0883e" }}>⬡ node</span>
          </div>
          <div className="mb-4 flex items-center gap-2 text-xs">
            <span style={{ color: "#8b949e" }}>❯</span>
            <span style={{ color: "#e6edf3" }}>report-history</span>
            <span style={{ color: "#8b949e" }}>--all</span>
            {search && <span style={{ color: "#8b949e" }}>--grep=<span style={{ color: "#f0883e" }}>"{search}"</span></span>}
          </div>

          {loading ? (
            <div className="text-xs" style={{ color: "#3fb950" }}>
              <span className="animate-pulse">▋</span>
              <span className="ml-2" style={{ color: "#8b949e" }}>
                {t({ ko: "보고서 불러오는 중...", en: "fetching reports...", ja: "レポート取得中...", zh: "加载报告中..." })}
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="space-y-1 text-xs">
              <div style={{ color: "#8b949e" }}>
                {search
                  ? <>grep: <span style={{ color: "#f0883e" }}>"{search}"</span> — {t({ ko: "0건 일치", en: "0 matches", ja: "0件一致", zh: "0 条结果" })}</>
                  : t({ ko: "보고서 없음", en: "0 reports found", ja: "レポートなし", zh: "暂无报告" })}
              </div>
              {!search && (
                <div style={{ color: "#8b949e", opacity: 0.6 }}>
                  hint: {t({ ko: "완료된 업무가 여기에 나타납니다", en: "completed tasks will appear here", ja: "完了したタスクがここに表示されます", zh: "已完成的任务将显示在这里" })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-0">
              {/* Column header */}
              <div
                className="mb-1 flex items-center gap-0 text-[10px] pb-1"
                style={{ borderBottom: "1px solid #30363d", color: "#8b949e" }}
              >
                <span className="w-[130px] flex-shrink-0">{t({ ko: "완료시각", en: "COMPLETED", ja: "完了時刻", zh: "完成时间" })}</span>
                <span className="w-[50px] flex-shrink-0 text-right pr-3">{t({ ko: "소요", en: "DUR", ja: "所要", zh: "时长" })}</span>
                <span className="w-[90px] flex-shrink-0">{t({ ko: "에이전트", en: "AGENT", ja: "エージェント", zh: "代理" })}</span>
                <span className="flex-1">{t({ ko: "업무", en: "TASK", ja: "タスク", zh: "任务" })}</span>
              </div>

              {pageReports.map((r) => {
                const agentName = uiLanguage === "ko" ? r.agent_name_ko || r.agent_name : r.agent_name;
                const proj = projectNameFromSummary(r);
                const dur = elapsed(r.created_at, r.completed_at);
                const isOpening = openingId === r.id;

                return (
                  <button
                    key={r.id}
                    onClick={() => { void handleOpenDetail(r.id); }}
                    disabled={isOpening}
                    className="group flex w-full items-baseline gap-0 py-[3px] text-left text-[11px] transition-all"
                    style={{ background: "transparent", opacity: isOpening ? 0.6 : 1 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#161b22"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {/* status dot */}
                    <span className="mr-2 flex-shrink-0 text-[8px]" style={{ color: "#3fb950" }}>●</span>

                    {/* completed date */}
                    <span className="w-[120px] flex-shrink-0 tabular-nums" style={{ color: "#8b949e" }}>
                      {fmtDate(r.completed_at)}
                    </span>

                    {/* duration */}
                    <span className="w-[46px] flex-shrink-0 text-right pr-3 tabular-nums" style={{ color: "#3fb950", opacity: 0.8 }}>
                      {dur}
                    </span>

                    {/* agent */}
                    <span className="w-[88px] flex-shrink-0 truncate" style={{ color: "#58a6ff" }}>
                      {agentName || "-"}
                    </span>

                    {/* title */}
                    <span className="min-w-0 flex-1 truncate" style={{ color: "#e6edf3" }}>
                      {r.title}
                    </span>

                    {/* project tag */}
                    <span
                      className="ml-2 flex-shrink-0 text-[10px]"
                      style={{ color: "#8b949e" }}
                    >
                      [{proj}]
                    </span>

                    {/* arrow on hover */}
                    <span
                      className="ml-2 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-[10px]"
                      style={{ color: "#f0883e" }}
                    >
                      {isOpening ? "..." : "→"}
                    </span>
                  </button>
                );
              })}

              {/* summary line */}
              <div className="mt-3 border-t pt-2 text-[10px]" style={{ borderColor: "#30363d", color: "#8b949e" }}>
                <span style={{ color: "#3fb950" }}>{filtered.length}</span>
                {" "}{t({ ko: "건", en: "reports", ja: "件", zh: "条" })}
                {search && (
                  <span>
                    {" "}({t({ ko: "전체", en: "filtered from", ja: "全体", zh: "共" })}{" "}
                    <span style={{ color: "#e6edf3" }}>{reports.length}</span>
                    {t({ ko: "건 중", en: "", ja: "件中", zh: "条中" })})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom prompt / search */}
        <div
          className="flex-shrink-0"
          style={{ background: "#161b22", borderTop: "1px solid #30363d" }}
        >
          {/* search input styled as shell prompt */}
          <div className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-xs font-mono" style={{ color: "#3fb950" }}>❯</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t({ ko: "grep 검색...", en: "grep filter...", ja: "grep...", zh: "过滤..." })}
              className="flex-1 bg-transparent text-xs font-mono outline-none"
              style={{ color: "#e6edf3" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-[11px] font-mono transition hover:opacity-70" style={{ color: "#8b949e" }}>
                {t({ ko: "지우기", en: "clear", ja: "クリア", zh: "清除" })}
              </button>
            )}
          </div>

          {/* pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-1.5 text-[10px] font-mono"
              style={{ borderTop: "1px solid #30363d", color: "#8b949e" }}
            >
              <span>{t({ ko: `페이지 ${currentPage + 1}/${totalPages}`, en: `page ${currentPage + 1}/${totalPages}`, ja: `ページ ${currentPage + 1}/${totalPages}`, zh: `第 ${currentPage + 1}/${totalPages} 页` })}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 0}
                  className="transition hover:opacity-80 disabled:opacity-30"
                  style={{ color: "#58a6ff" }}
                >
                  ← {t({ ko: "이전", en: "prev", ja: "前へ", zh: "上页" })}
                </button>
                <button
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="transition hover:opacity-80 disabled:opacity-30"
                  style={{ color: "#58a6ff" }}
                >
                  {t({ ko: "다음", en: "next", ja: "次へ", zh: "下页" })} →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
