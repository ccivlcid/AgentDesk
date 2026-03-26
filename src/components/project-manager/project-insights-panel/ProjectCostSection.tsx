import { useEffect, useState } from "react";
import { getProjectCostSummary, type ProjectCostSummary } from "../../../api/cost-summary";
import type { ProjectI18nTranslate } from "../types";
import { fmtUsd, fmtTokens } from "./utils";

interface ProjectCostSectionProps {
  t: ProjectI18nTranslate;
  projectId: string;
}

export function ProjectCostSection({ t, projectId }: ProjectCostSectionProps) {
  const [cost, setCost] = useState<ProjectCostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getProjectCostSummary(projectId)
      .then(setCost)
      .catch(() => setCost(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className="min-w-0 p-4" style={{ border: "1px solid #E5E7EB", borderRadius: 0, background: "var(--th-bg-surface)" }}>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)" }}>
        {t({ ko: "비용 요약", en: "Cost Summary", ja: "コスト概要", zh: "成本摘要" })}
      </h4>

      {loading ? (
        <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "불러오는 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
        </p>
      ) : !cost ? (
        <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>-</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2" style={{ background: "var(--th-bg-elevated)", border: "1px solid #E5E7EB" }}>
              <p className="text-[10px] font-mono uppercase" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "이번 달", en: "This Month", ja: "今月", zh: "本月" })}
              </p>
              <p className="mt-0.5 text-sm font-bold font-mono text-amber-400">{fmtUsd(cost.thisMonthUsd)}</p>
            </div>
            <div className="p-2" style={{ background: "var(--th-bg-elevated)", border: "1px solid #E5E7EB" }}>
              <p className="text-[10px] font-mono uppercase" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "총 비용", en: "Total", ja: "合計", zh: "总计" })}
              </p>
              <p className="mt-0.5 text-sm font-bold font-mono" style={{ color: "var(--th-text-primary)" }}>{fmtUsd(cost.totalUsd)}</p>
            </div>
          </div>

          <div className="flex gap-3 text-[11px] font-mono">
            <span style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "토큰(입력)", en: "Tokens In", ja: "入力", zh: "输入" })}:
              <span className="ml-1" style={{ color: "var(--th-text-secondary)" }}>{fmtTokens(cost.totalTokensIn)}</span>
            </span>
            <span style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "출력", en: "Out", ja: "出力", zh: "输出" })}:
              <span className="ml-1" style={{ color: "var(--th-text-secondary)" }}>{fmtTokens(cost.totalTokensOut)}</span>
            </span>
          </div>

          {cost.agentBreakdown.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "에이전트별 비용", en: "By Agent", ja: "エージェント別", zh: "按代理" })}
              </p>
              <div className="space-y-1">
                {cost.agentBreakdown.slice(0, 5).map((row) => (
                  <div key={row.agentId} className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="w-24 truncate" style={{ color: "var(--th-text-secondary)" }}>{row.agentName}</span>
                    <div className="flex-1 overflow-hidden" style={{ height: 5, background: "var(--th-bg-primary)" }}>
                      <div
                        className="h-full bg-amber-400/60"
                        style={{ width: cost.totalUsd > 0 ? `${Math.min(100, (row.totalUsd / cost.totalUsd) * 100)}%` : "0%" }}
                      />
                    </div>
                    <span className="w-16 text-right" style={{ color: "var(--th-text-muted)" }}>
                      {fmtUsd(row.totalUsd)} <span className="text-[10px]">({row.taskCount})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cost.packBreakdown.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "워크플로우별 비용", en: "By Workflow", ja: "ワークフロー別", zh: "按工作流" })}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cost.packBreakdown.map((row) => (
                  <div
                    key={row.packKey}
                    className="flex items-center gap-1 px-2 py-0.5"
                    style={{ background: "var(--th-bg-elevated)", border: "1px solid #E5E7EB" }}
                  >
                    <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{row.packKey}</span>
                    <span className="text-[10px] font-mono text-amber-400">{fmtUsd(row.totalUsd)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
