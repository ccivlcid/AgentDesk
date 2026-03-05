import { useEffect, useState } from "react";
import { getAgentPerformance, type AgentPerformanceData } from "../../api/organization-projects";

interface Props {
  agentId: string;
  t: (map: Record<string, string>) => string;
}

function formatDuration(ms: number | null): string {
  if (!ms) return "-";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    done: "bg-green-500/20 text-green-300",
    review: "bg-yellow-500/20 text-yellow-300",
    in_progress: "bg-blue-500/20 text-blue-300",
    inbox: "bg-slate-500/20 text-slate-300",
    planned: "bg-purple-500/20 text-purple-300",
  };
  return colors[status] ?? "bg-slate-500/20 text-slate-400";
}

export default function AgentPerformancePanel({ agentId, t }: Props) {
  const [data, setData] = useState<AgentPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAgentPerformance(agentId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-slate-400">
        {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        {t({ ko: "데이터를 불러올 수 없습니다", en: "Could not load performance data", ja: "データを読み込めません", zh: "无法加载数据" })}
      </div>
    );
  }

  const { stats, recent_tasks, by_pack } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          label={t({ ko: "전체 태스크", en: "Total Tasks", ja: "全タスク", zh: "全部任务" })}
          value={String(stats.tasks_total)}
        />
        <StatCard
          label={t({ ko: "완료", en: "Completed", ja: "完了", zh: "已完成" })}
          value={String(stats.tasks_done)}
          accent="text-green-400"
        />
        <StatCard
          label={t({ ko: "성공률", en: "Success Rate", ja: "成功率", zh: "成功率" })}
          value={`${stats.success_rate}%`}
          accent={stats.success_rate >= 80 ? "text-green-400" : stats.success_rate >= 50 ? "text-yellow-400" : "text-red-400"}
        />
        <StatCard
          label={t({ ko: "평균 소요", en: "Avg Duration", ja: "平均所要", zh: "平均耗时" })}
          value={formatDuration(stats.avg_duration_ms)}
        />
      </div>

      {by_pack.length > 0 && (
        <div className="rounded-lg bg-slate-700/30 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t({ ko: "팩별 실적", en: "By Pack", ja: "パック別", zh: "按流程包" })}
          </h4>
          <div className="space-y-1">
            {by_pack.map((p) => (
              <div key={p.pack} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{p.pack}</span>
                <span className="text-xs text-slate-400">
                  {p.done_cnt}/{p.cnt} {t({ ko: "완료", en: "done", ja: "完了", zh: "完成" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t({ ko: "최근 태스크", en: "Recent Tasks", ja: "最近のタスク", zh: "最近任务" })}
        </h4>
        {recent_tasks.length === 0 ? (
          <p className="text-sm text-slate-500">
            {t({ ko: "태스크 없음", en: "No tasks", ja: "タスクなし", zh: "无任务" })}
          </p>
        ) : (
          <div className="space-y-1">
            {recent_tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 rounded-md bg-slate-800/50 px-2.5 py-1.5 text-sm"
              >
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadge(task.status)}`}
                >
                  {task.status}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-300">{task.title}</span>
                {task.started_at && task.completed_at && (
                  <span className="flex-shrink-0 text-[10px] text-slate-500">
                    {formatDuration(task.completed_at - task.started_at)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-slate-700/30 p-2.5 text-center">
      <div className={`text-lg font-bold ${accent ?? "text-white"}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}
