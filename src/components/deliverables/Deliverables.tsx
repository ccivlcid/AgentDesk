import { useState, useEffect, useCallback, useMemo } from "react";
import { useI18n } from "../../i18n";
import {
  getDeliverables,
  getTaskArtifacts,
  type DeliverableItem,
  type TaskArtifact,
} from "../../api";
import type { Agent } from "../../types";
import DeliverableCard from "./DeliverableCard";

interface DeliverablesProps {
  agents: Agent[];
}

type StatusFilter = "all" | "done" | "review";

export default function Deliverables({ agents }: DeliverablesProps) {
  const { t } = useI18n();

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
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  // Fetch artifacts for each item that has a project_path
  useEffect(() => {
    for (const item of items) {
      if (artifacts[item.id] !== undefined) continue;
      if (!item.project_path) {
        setArtifacts((prev) => ({ ...prev, [item.id]: [] }));
        continue;
      }
      getTaskArtifacts(item.id)
        .then((arts) => {
          setArtifacts((prev) => ({ ...prev, [item.id]: arts }));
        })
        .catch(() => {
          setArtifacts((prev) => ({ ...prev, [item.id]: [] }));
        });
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
          {t({
            ko: "결과물",
            en: "Deliverables",
            ja: "成果物",
            zh: "交付物",
          })}
        </h2>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-2.5 py-1.5 text-xs font-mono outline-none"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
          >
            <option value="all">{t({ ko: "전체 상태", en: "All Status", ja: "全ステータス", zh: "全部状态" })}</option>
            <option value="done">{t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" })}</option>
            <option value="review">{t({ ko: "리뷰", en: "Review", ja: "レビュー", zh: "审核" })}</option>
          </select>

          <button
            onClick={() => {
              setArtifacts({});
              void fetchItems();
            }}
            className="px-2.5 py-1.5 text-xs font-mono transition"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
          >
            {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-${i}`} className="animate-pulse p-4 h-32" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 font-mono" style={{ color: "var(--th-text-muted)" }}>
          <div className="text-4xl mb-3">📦</div>
          <div className="text-sm">
            {t({
              ko: "완료된 업무가 없습니다",
              en: "No completed tasks found",
              ja: "完了したタスクはありません",
              zh: "没有已完成的任务",
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
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
    </div>
  );
}
