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

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((r) => r.status === statusFilter);
  }, [items, statusFilter]);

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
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}
    >
      {/* ── 터미널 헤더 (설정과 동일 macOS) ── */}
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
        <span style={{ fontSize: "11px", color: "var(--th-text-secondary)" }}>
          ls deliverables/{currentProject ? ` --project="${currentProject.name}"` : ""}
        </span>
        {!loading && (
          <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.6 }}>
            <span style={{ color: "#4ade80" }}>{doneCnt} done</span>
            {reviewCnt > 0 && <> · <span style={{ color: "var(--th-accent)" }}>{reviewCnt} review</span></>}
            {" "}· {items.length} total
          </span>
        )}
      </div>

      {/* ── 필터 + 리프레시 ── */}
      <div style={{ borderBottom: "1px solid var(--th-border)", padding: "5px 12px", background: "var(--th-bg-primary)", display: "flex", alignItems: "center", gap: 4 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            style={{
              ...mono,
              fontSize: "9px",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 6,
              border: `1px solid ${statusFilter === f.key ? "rgba(245,158,11,0.5)" : "var(--th-border)"}`,
              background: statusFilter === f.key ? "rgba(245,158,11,0.08)" : "transparent",
              color: statusFilter === f.key ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: "pointer",
              letterSpacing: "0.06em",
            }}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => { setArtifacts({}); void fetchItems(); }}
          style={{
            ...mono,
            marginLeft: "auto",
            fontSize: "10px",
            padding: "3px 10px",
            borderRadius: 6,
            border: "1px solid var(--th-border)",
            background: "transparent",
            color: "var(--th-text-muted)",
            cursor: "pointer",
          }}
          title={t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
        >
          ↻
        </button>
      </div>

      {/* ── 컨텐츠 영역 (설정과 동일 패딩) ── */}
      <div style={{ flex: 1, overflow: "auto", background: "var(--th-bg-primary)", padding: "20px 18px 24px" }}>
      {/* ── 컬럼 헤더 ── */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", padding: "4px 14px", background: "var(--th-bg-primary)", borderBottom: "1px solid var(--th-border)", gap: 8 }}>
          <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", width: 44, flexShrink: 0 }}>STATUS</span>
          <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", flex: 1 }}>TITLE</span>
          <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", width: 130, flexShrink: 0 }}>AGENT</span>
          <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", width: 120, flexShrink: 0 }}>COMPLETED</span>
          <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", width: 80, flexShrink: 0 }}>FILES</span>
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
            />
          ))}
        </div>
      )}

      {/* ── footer ── */}
      {!loading && (
        <div style={{ borderTop: "1px solid var(--th-border)", padding: "5px 16px", background: "var(--th-bg-primary)" }}>
          <span style={{ fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.4 }}>
            $ {filtered.length} entries{statusFilter !== "all" ? ` (filtered: ${statusFilter})` : ""}
          </span>
        </div>
      )}
      </div>
    </div>
  );
}
