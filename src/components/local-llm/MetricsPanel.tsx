import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

interface GpuInfo {
  name: string;
  vram_total_bytes: number;
  vram_used_bytes: number;
  vram_free_bytes: number;
  utilization_percent: number;
}

interface RamInfo {
  total_bytes: number;
  used_bytes: number;
  utilization_percent: number;
}

interface MetricsSnapshot {
  gpu: GpuInfo | null;
  ram: RamInfo;
  inference: { active_model: string | null; tokens_per_second: number | null };
  collected_at: number;
}

interface InferenceRow {
  id: number;
  backend: string;
  model_name: string;
  agent_name: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  tokens_per_second: number | null;
  latency_ms: number | null;
  created_at: number;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 ** 2);
  return `${mb.toFixed(0)} MB`;
}

function GaugeBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const fillColor = pct >= 90 ? "#f85149" : pct >= 70 ? "#f87171" : "var(--th-accent)";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
          textTransform: "uppercase", color: "var(--th-text-muted)" }}>
          // {label}
        </span>
        <span style={{ ...mono, fontSize: 11 }}>
          <span style={{ color: "var(--th-text-accent, var(--th-accent))" }}>{formatBytes(used)}</span>
          <span style={{ color: "var(--th-text-muted)" }}> / {formatBytes(total)}</span>
        </span>
      </div>
      <div style={{ height: 6, background: "var(--th-bg-surface, #1a1a1a)", borderRadius: 0, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${Math.min(pct, 100)}%`,
          background: fillColor,
          transition: "width 0.4s linear, background 0.3s",
        }} />
      </div>
      <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 2, textAlign: "right" }}>
        {pct.toFixed(0)}%
      </div>
    </div>
  );
}

function Sparkline({ points, labelNoData }: { points: number[]; labelNoData: string }) {
  if (points.length < 2) {
    return (
      <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)",
        background: "var(--th-terminal-bg, #010409)", padding: "8px 10px", borderRadius: 0 }}>
        {labelNoData}
      </div>
    );
  }
  const W = 120, H = 32;
  const max = Math.max(...points, 1);
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - (v / max) * (H - 4) - 2;
    return `${x},${y}`;
  });
  const last = coords[coords.length - 1].split(",");

  return (
    <div style={{ background: "var(--th-terminal-bg, #010409)", padding: "6px 8px", borderRadius: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 32, display: "block" }}>
        <polyline
          points={coords.join(" ")}
          fill="none"
          stroke="var(--th-accent)"
          strokeWidth={1.5}
        />
        <circle cx={Number(last[0])} cy={Number(last[1])} r={2.5} fill="var(--th-accent)" />
      </svg>
      <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", textAlign: "right" }}>
        {points[points.length - 1]?.toFixed(1)} t/s
      </div>
    </div>
  );
}

export default function MetricsPanel() {
  const { t } = useI18n();
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [history, setHistory] = useState<InferenceRow[]>([]);
  const [tpsHistory, setTpsHistory] = useState<number[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await fetch("/api/local-llm/metrics/history?limit=20").then((r) => r.json());
      if (data.ok) {
        setHistory(data.history);
        // Seed sparkline from history (most recent last)
        const tpsFromHistory = (data.history as InferenceRow[])
          .filter((r) => r.tokens_per_second != null)
          .slice(-30)
          .map((r) => r.tokens_per_second as number);
        if (tpsFromHistory.length > 0) {
          setTpsHistory((prev) => prev.length === 0 ? tpsFromHistory : prev);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      const data = await fetch("/api/local-llm/metrics").then((r) => r.json());
      if (data.ok) setMetrics(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadMetrics();
    loadHistory();

    // Subscribe to real-time WS metrics
    const ws = new WebSocket(`ws://${window.location.host}`);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { type: string; payload: MetricsSnapshot };
        if (msg.type === "local_llm_metrics") {
          setMetrics(msg.payload);
          const tps = msg.payload.inference.tokens_per_second;
          if (tps != null) {
            setTpsHistory((prev) => [...prev.slice(-29), tps]);
          }
        }
      } catch { /* skip */ }
    };

    // Fallback polling every 10s
    const timer = setInterval(() => { loadMetrics(); loadHistory(); }, 10000);
    return () => { ws.close(); clearInterval(timer); };
  }, [loadMetrics, loadHistory]);

  return (
    <div>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "var(--th-text-muted)", marginBottom: 14 }}>
        {t({ ko: "// 런타임 모니터", en: "// RUNTIME MONITOR", ja: "// ランタイムモニター", zh: "// 运行时监控" })}
      </div>

      {/* GPU Section */}
      {metrics?.gpu ? (
        <div style={{
          borderRadius: 10,
          border: "1px solid var(--th-border)",
          background: "var(--th-card-bg, #181818)",
          padding: "12px 14px",
          marginBottom: 12,
        }}>
          <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", color: "var(--th-text-muted)", marginBottom: 10 }}>
            // GPU — {metrics.gpu.name}
          </div>
          <GaugeBar
            label="VRAM"
            used={metrics.gpu.vram_used_bytes}
            total={metrics.gpu.vram_total_bytes}
          />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)",
              letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {t({ ko: "// 사용률", en: "// UTIL", ja: "// 使用率", zh: "// 利用率" })}
            </span>
            <span style={{ ...mono, fontSize: 11, color: "var(--th-accent)" }}>
              {metrics.gpu.utilization_percent}%
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          ...mono, fontSize: 11, color: "var(--th-text-muted)",
          borderRadius: 0, border: "1px solid var(--th-border)",
          padding: "10px 14px", marginBottom: 12,
        }}>
          {t({ ko: "// GPU — nvidia-smi 없음 (CPU 전용)", en: "// GPU — nvidia-smi not available (CPU-only)", ja: "// GPU — nvidia-smi利用不可 (CPUのみ)", zh: "// GPU — nvidia-smi不可用 (仅CPU)" })}
        </div>
      )}

      {/* RAM Section */}
      {metrics?.ram && (
        <div style={{
          borderRadius: 10,
          border: "1px solid var(--th-border)",
          background: "var(--th-card-bg, #181818)",
          padding: "12px 14px",
          marginBottom: 12,
        }}>
          <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", color: "var(--th-text-muted)", marginBottom: 10 }}>
            {t({ ko: "// 시스템 RAM", en: "// SYSTEM RAM", ja: "// システムRAM", zh: "// 系统RAM" })}
          </div>
          <GaugeBar label="RAM" used={metrics.ram.used_bytes} total={metrics.ram.total_bytes} />
        </div>
      )}

      {/* Inference sparkline */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
          textTransform: "uppercase", color: "var(--th-text-muted)", marginBottom: 6 }}>
          {t({ ko: "// 토큰 / 초", en: "// TOKENS / SEC", ja: "// トークン / 秒", zh: "// 令牌 / 秒" })}
          {metrics?.inference.active_model && (
            <span style={{ fontWeight: 400, marginLeft: 8, color: "var(--th-text-secondary)" }}>
              ({metrics.inference.active_model})
            </span>
          )}
        </div>
        <Sparkline
          points={tpsHistory}
          labelNoData={t({ ko: "// 데이터 없음", en: "// no data", ja: "// データなし", zh: "// 无数据" })}
        />
      </div>

      {/* Inference log table */}
      <div>
        <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
          textTransform: "uppercase", color: "var(--th-text-muted)", marginBottom: 8 }}>
          {t({ ko: "// 최근 추론", en: "// RECENT INFERENCE", ja: "// 最近の推論", zh: "// 最近推理" })}
          <button
            type="button"
            onClick={loadHistory}
            style={{ marginLeft: 10, background: "none", border: "none",
              color: "var(--th-accent)", fontFamily: "var(--th-font-mono)",
              fontSize: 10, cursor: "pointer", padding: 0 }}>
            {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
          </button>
        </div>
        {history.length === 0 ? (
          <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>
            {t({ ko: "추론 기록이 없습니다.", en: "No inference history yet.", ja: "推論履歴がありません。", zh: "暂无推理历史。" })}
          </div>
        ) : (
          <div style={{ border: "1px solid var(--th-border)", borderRadius: 0 }}>
            {/* Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "90px 70px 1fr 80px 60px 60px",
              padding: "5px 10px",
              borderBottom: "1px solid var(--th-border)",
              background: "var(--th-bg-surface, #1a1a1a)",
            }}>
              {[
                t({ ko: "시간", en: "TIME", ja: "時刻", zh: "时间" }),
                t({ ko: "백엔드", en: "BACKEND", ja: "バックエンド", zh: "后端" }),
                t({ ko: "모델", en: "MODEL", ja: "モデル", zh: "模型" }),
                t({ ko: "에이전트", en: "AGENT", ja: "エージェント", zh: "代理" }),
                t({ ko: "토큰", en: "TOKENS", ja: "トークン", zh: "令牌" }),
                "T/S",
              ].map((h) => (
                <span key={h} style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)",
                  letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {history.map((row) => {
              const BACKEND_LABEL: Record<string, string> = { ollama: "Ollama", lmstudio: "LM Studio", openai: "OpenAI", anthropic: "Anthropic", openrouter: "OpenRouter", google: "Google" };
              const backendLabel = BACKEND_LABEL[row.backend] ?? row.backend;
              return (
                <div
                  key={row.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 70px 1fr 80px 60px 60px",
                    padding: "5px 10px",
                    borderBottom: "1px solid var(--th-border)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--th-hover-overlay-subtle)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                >
                  <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
                    {new Date(row.created_at).toLocaleTimeString()}
                  </span>
                  <span style={{ ...mono, fontSize: 10, color: "var(--th-text-secondary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {backendLabel}
                  </span>
                  <span style={{ ...mono, fontSize: 11, color: "var(--th-text-code, #22c55e)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.model_name}
                  </span>
                  <span style={{ ...mono, fontSize: 11, color: "var(--th-text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.agent_name ?? "—"}
                  </span>
                  <span style={{ ...mono, fontSize: 11, color: "var(--th-text-accent, var(--th-accent))" }}>
                    {row.completion_tokens != null ? `${row.completion_tokens}` : "—"}
                  </span>
                  <span style={{ ...mono, fontSize: 11, color: "var(--th-text-secondary)" }}>
                    {row.tokens_per_second != null ? `${row.tokens_per_second.toFixed(1)}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
