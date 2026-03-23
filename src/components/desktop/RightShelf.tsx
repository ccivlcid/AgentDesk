/**
 * RightShelf -- Team Activity panel.
 * Modernized design with 100% functional Activity Stats.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  CheckCircle2, 
  MessageSquare, 
  Play, 
  ClipboardCheck, 
  ChevronRight,
  Clock,
  Zap,
  Check,
  Edit3,
  Activity,
  FileText,
  Target,
  BarChart3
} from "lucide-react";
import { useUiStore } from "../../store/uiStore";
import { useProjectStore } from "../../store/projectStore";
import { useTaskStore } from "../../store/taskStore";
import { fetchPmActivity, type PmActivityItem, type PmActivityResponse } from "../../api/pm-activity";
import { replyDecisionInbox } from "../../api/messaging-runtime-oauth";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useI18n } from "../../i18n";

const PANEL_W = 360;

type FilterKey = "all" | "meeting" | "oversight" | "task_status" | "pm_message" | "decision";

function timeAgo(ts: number, t: any): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return t({ ko: "방금", en: "Just now", ja: "今", zh: "刚刚" });
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function TypeIcon({ type, size = 14 }: { type: PmActivityItem["type"]; size?: number }) {
  switch (type) {
    case "meeting": return <MessageSquare size={size} className="text-cyan-400" />;
    case "oversight": return <Play size={size} className="text-amber-400" />;
    case "task_status": return <CheckCircle2 size={size} className="text-emerald-400" />;
    case "decision": return <ClipboardCheck size={size} className="text-purple-400" />;
    case "pm_message": return <FileText size={size} className="text-blue-400" />;
    default: return <Zap size={size} className="text-slate-400" />;
  }
}

function ActivityItem({
  item,
  expandedItems,
  setExpandedItems,
  approvedTaskIds,
  busyTaskId,
  handleApprove,
  handleRevision,
}: {
  item: PmActivityItem;
  expandedItems: Set<string>;
  setExpandedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  approvedTaskIds: Set<string>;
  busyTaskId: string | null;
  handleApprove: (id: string) => void;
  handleRevision: (id: string) => void;
}) {
  const { t } = useI18n();
  const isExpanded = expandedItems.has(item.id);
  const isReviewItem = item.taskId && (item.summary.toLowerCase().includes("review") || item.summary.includes("검토")) && !approvedTaskIds.has(item.taskId);
  const isBusy = busyTaskId === item.taskId;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      return next;
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: "var(--th-glass-surface)",
        border: isReviewItem ? "1px solid var(--th-accent-border)" : "1px solid var(--th-glass-border-subtle)",
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 10,
        boxShadow: isReviewItem ? "0 8px 24px rgba(59, 130, 246, 0.12)" : "0 4px 12px rgba(0,0,0,0.08)",
        overflow: "hidden",
        position: "relative"
      }}
    >
      {isReviewItem && (
        <div style={{ position: "absolute", top: 0, left: 0, width: 3, bottom: 0, background: "var(--th-accent)" }} />
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }} onClick={toggleExpand}>
        <div style={{ padding: 8, background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
          <TypeIcon type={item.type} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: isReviewItem ? "var(--th-accent)" : "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {isReviewItem ? t({ ko: "승인 대기", en: "Review Required", ja: "承認待ち", zh: "等待审批" }) : item.type.replace("_", " ")}
            </span>
            <span style={{ fontSize: 9, color: "var(--th-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={10} /> {timeAgo(item.timestamp, t)}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--th-text-primary)", lineHeight: 1.5 }}>
            {item.summary}
          </div>
          {item.agentName && (
            <div style={{ fontSize: 11, color: "var(--th-text-secondary)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={10} />
              </div>
              {item.agentName}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(isExpanded || isReviewItem) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ paddingTop: 14, marginTop: 12, borderTop: "1px solid var(--th-glass-border-subtle)", fontSize: 12, color: "var(--th-text-secondary)", lineHeight: 1.6 }}>
              <div style={{ whiteSpace: "pre-wrap" }}>{item.detail || item.summary || t({ ko: "상세 내용 없음", en: "No additional details", ja: "詳細なし", zh: "无详情" })}</div>
              
              {/* PM 오케스트레이터가 자동 처리 — 유저 승인/수정 비활성화 */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function RightShelf() {
  const { t } = useI18n();
  const { pmActivityProjectId, pmActivityExpanded, togglePmActivityExpanded } = useUiStore();
  const { projects, currentProjectId } = useProjectStore();
  const { tasks } = useTaskStore();
  const [data, setData] = useState<PmActivityResponse | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [approvedTaskIds, setApprovedTaskIds] = useState<Set<string>>(new Set());
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const { on } = useWebSocket();

  const FILTERS: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: t({ ko: "전체", en: "All", ja: "全体", zh: "全部" }) },
    { key: "meeting", label: t({ ko: "회의", en: "Meet", ja: "会議", zh: "会议" }) },
    { key: "oversight", label: t({ ko: "지시", en: "Direct", ja: "指示", zh: "指令" }) },
    { key: "task_status", label: t({ ko: "상태", en: "Task", ja: "状態", zh: "状态" }) },
    { key: "decision", label: t({ ko: "검토", en: "Review", ja: "検討", zh: "评审" }) },
    { key: "pm_message", label: t({ ko: "보고", en: "Msg", ja: "報告", zh: "报告" }) },
  ];

  const activeProjectId = pmActivityProjectId || currentProjectId || projects[0]?.id || null;
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadActivity = useCallback(() => {
    if (!activeProjectId) return;
    fetchPmActivity(activeProjectId, { limit: 100 }).then((r) => {
      setData(r);
      setHasMore(r.items.length >= 100);
    }).catch(() => {});
  }, [activeProjectId]);

  const loadMore = useCallback(() => {
    if (!activeProjectId || loadingMore || !data || !hasMore) return;
    const oldest = data.items[data.items.length - 1];
    if (!oldest) return;
    setLoadingMore(true);
    fetchPmActivity(activeProjectId, { limit: 100, before: oldest.timestamp })
      .then((r) => {
        setData((prev) => {
          if (!prev) return r;
          const existingIds = new Set(prev.items.map((i) => i.id));
          const newItems = r.items.filter((i) => !existingIds.has(i.id));
          return { ...prev, items: [...prev.items, ...newItems] };
        });
        setHasMore(r.items.length >= 100);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [activeProjectId, loadingMore, data, hasMore]);

  useEffect(() => { setData(null); setHasMore(true); loadActivity(); }, [loadActivity, activeProjectId]);
  useEffect(() => on("pm_activity", () => loadActivity()), [on, loadActivity]);
  useEffect(() => on("task_update", () => loadActivity()), [on, loadActivity]);

  // 프로젝트 통계 (활동 통계) - 실시간 데이터 연동 보장
  const stats = useMemo(() => {
    const src = activeProjectId ? tasks.filter(tk => tk.project_id === activeProjectId) : tasks;
    const done = src.filter(tk => tk.status === "done").length;
    const total = src.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, pct };
  }, [tasks, activeProjectId]);

  const handleApprove = async (taskId: string) => {
    if (busyTaskId) return;
    setBusyTaskId(taskId);
    try {
      await replyDecisionInbox(taskId, 1);
      setApprovedTaskIds(prev => new Set(prev).add(taskId));
      setTimeout(loadActivity, 500);
    } catch (err) { console.error("Approve failed:", err); } finally { setBusyTaskId(null); }
  };

  const handleRevision = async (taskId: string) => {
    if (busyTaskId) return;
    setBusyTaskId(taskId);
    try {
      await replyDecisionInbox(taskId, 2);
      setApprovedTaskIds(prev => new Set(prev).add(taskId));
      setTimeout(loadActivity, 500);
    } catch (err) { console.error("Revision failed:", err); } finally { setBusyTaskId(null); }
  };

  const filteredItems = useMemo(() => {
    if (!data) return [];
    let items = data.items;
    if (activeFilter !== "all") {
      items = items.filter(item => item.type === activeFilter);
    }
    return items.reduce<PmActivityItem[]>((acc, item) => {
      const last = acc[acc.length - 1];
      if (last && last.type === item.type && last.summary === item.summary && (Math.abs(last.timestamp - item.timestamp) < 300000)) {
        return acc;
      }
      return [...acc, item];
    }, []);
  }, [data, activeFilter]);

  return (
    <div
      style={{
        position: "fixed", top: 44, right: pmActivityExpanded ? 0 : -PANEL_W, bottom: 0, width: PANEL_W, zIndex: 900,
        transition: "right 0.5s cubic-bezier(0.19, 1, 0.22, 1)", display: "flex", flexDirection: "column",
        background: "var(--th-glass-surface)", backdropFilter: "var(--th-glass-blur)",
        borderLeft: "1px solid var(--th-glass-border-subtle)", boxShadow: "-10px 0 30px rgba(0,0,0,0.2)",
      }}
    >
      {/* Header: Team Activity + Traffic Lights Closing */}
      <div style={{ padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button 
              onClick={() => togglePmActivityExpanded()}
              style={{ width: 11, height: 11, borderRadius: "50%", background: "#FF5F56", border: "none", cursor: "pointer", padding: 0 }} 
            />
            <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#FFBD2E" }} />
            <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#27C93F" }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--th-text-heading)", letterSpacing: "-0.02em" }}>
            {t({ ko: "팀 활동", en: "Team Activity", ja: "チーム活動", zh: "团队动态" })}
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Activity size={14} className="text-blue-400 animate-pulse" />
          </div>
        </div>

        {/* Activity Stats Card (REAL FUNCTIONALITY) */}
        <div style={{ 
          background: "rgba(255,255,255,0.02)", border: "1px solid var(--th-glass-border-strong)", 
          borderRadius: 14, padding: "12px 16px", position: "relative", overflow: "hidden"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <div style={{ padding: 6, background: "rgba(59, 130, 246, 0.1)", borderRadius: 8 }}>
                <Target size={12} className="text-blue-400" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--th-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {projects.find(p => p.id === activeProjectId)?.name || "Project"}
              </span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, color: "var(--th-text-primary)" }}>{stats.pct}%</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.pct}%` }} transition={{ duration: 1, ease: "circOut" }}
              style={{ height: "100%", background: "linear-gradient(90deg, #3B82F6, #10B981)" }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--th-text-muted)", display: "flex", justifyContent: "space-between", fontWeight: 700, letterSpacing: "0.02em" }}>
            <span>{t({ ko: "활동 통계", en: "ACTIVITY STATS", ja: "活動統計", zh: "活动统计" })}</span>
            <span style={{ color: "var(--th-text-secondary)" }}>{stats.done} / {stats.total} {t({ ko: "완료됨", en: "DONE", ja: "完了", zh: "完成" })}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ padding: "0 20px 16px", display: "flex", overflowX: "auto" }} className="pm-shelf-scroll">
        <div style={{ 
          display: "flex", background: "rgba(255,255,255,0.03)", 
          padding: 2, borderRadius: 10, border: "1px solid var(--th-glass-border-subtle)", minWidth: "100%"
        }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                flex: 1, border: "none", borderRadius: 8, fontSize: 10, fontWeight: 700, padding: "6px 10px",
                cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
                background: activeFilter === f.key ? "rgba(255,255,255,0.08)" : "transparent",
                color: activeFilter === f.key ? "var(--th-text-primary)" : "var(--th-text-muted)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div
        ref={scrollRef}
        className="pm-shelf-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "4px 20px" }}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight - el.scrollTop - el.clientHeight < 100 && hasMore && !loadingMore) {
            loadMore();
          }
        }}
      >
        <AnimatePresence initial={false}>
          {filteredItems.map((item) => (
            <ActivityItem
              key={item.id}
              item={item}
              expandedItems={expandedItems}
              setExpandedItems={setExpandedItems}
              approvedTaskIds={approvedTaskIds}
              busyTaskId={busyTaskId}
              handleApprove={handleApprove}
              handleRevision={handleRevision}
            />
          ))}
        </AnimatePresence>

        {loadingMore && (
          <div style={{ textAlign: "center", padding: "12px 0", fontFamily: "var(--th-font-mono)", fontSize: 10, color: "var(--th-text-muted)" }}>
            {t({ ko: "이전 활동 불러오는 중...", en: "Loading older activity...", ja: "過去の活動を読み込み中...", zh: "加载更早的活动..." })}
          </div>
        )}

        {filteredItems.length === 0 && !loadingMore && (
          <div style={{ textAlign: "center", paddingTop: 60, opacity: 0.5 }}>
            <MessageSquare size={40} style={{ margin: "0 auto 16px" }} />
            <div style={{ fontSize: 13 }}>{t({ ko: "활동이 없습니다", en: "No activity found", ja: "活動なし", zh: "暂无动态" })}</div>
          </div>
        )}
      </div>

      {/* Toggle Handle (When closed) */}
      {!pmActivityExpanded && (
        <motion.button
          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => togglePmActivityExpanded()}
          style={{
            position: "absolute", left: -24, top: "50%", transform: "translateY(-50%)", 
            width: 24, height: 64,
            background: "var(--th-glass-surface-active)", backdropFilter: "var(--th-glass-blur)",
            border: "1px solid var(--th-glass-border-strong)", borderRight: "none", borderRadius: "12px 0 0 12px",
            color: "var(--th-accent)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "-4px 0 15px rgba(0,0,0,0.2)", zIndex: 1000
          }}
          whileHover={{ width: 28, x: -4 }}
        >
          <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
        </motion.button>
      )}
    </div>
  );
}
