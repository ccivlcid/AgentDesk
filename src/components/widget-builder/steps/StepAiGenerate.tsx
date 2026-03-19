import { useState, useEffect, useRef } from "react";
import type { CustomFeatureConfig } from "../../../types";
import { triggerAiGenerate, getCustomFeature } from "../../../api/custom-features";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

type GenerateStatus = "idle" | "pending" | "polling" | "done" | "error";

interface Props {
  isKo: boolean;
  featureType?: "app";
  config: CustomFeatureConfig;
  onGenerated: (featureId: string) => void;
}

const PLACEHOLDER_KO = `원하는 기능을 자세히 설명해주세요.

좋은 프롬프트 예시:
• 현재 working 중인 에이전트 카드를 부서 색상으로 표시하고, 담당 태스크명도 보여줘
• 오늘 완료된 태스크를 에이전트별로 집계해서 막대 그래프로 보여줘
• 우선순위가 critical/high인 태스크만 필터링해서 테이블로 표시하고 30초마다 갱신해줘
• 에이전트 성능 데이터를 가져와서 완료 태스크 수 TOP 3를 시각화해줘`;

const PLACEHOLDER_EN = `Describe the feature you want in detail.

Good prompt examples:
• Show currently working agents as cards colored by department, with their task name
• Aggregate today's completed tasks per agent and show as a bar chart
• Filter critical/high priority tasks into a table, auto-refresh every 30s
• Fetch agent performance data and visualize the top 3 by tasks completed`;

const DOTS = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];

const QUICK_PROMPTS_KO = [
  "현재 working 중인 에이전트 카드 목록 (부서 컬러, 담당 태스크 표시)",
  "에이전트별 완료 태스크 수 집계 + 순위 리스트",
  "우선순위 critical/high 태스크만 테이블로 필터링, 30초 갱신",
  "에이전트 성능 TOP 3 시각화 (완료수·성공률)",
  "부서별 에이전트 수 + 현재 가동률 카드",
  "최근 오류 알림 5개를 빨간 배경으로 표시",
];

const QUICK_PROMPTS_EN = [
  "Working agents card list (dept color, task name shown)",
  "Completed task count per agent + ranking list",
  "Filter critical/high priority tasks into a table, auto-refresh 30s",
  "Agent performance TOP 3 visualization (count · success rate)",
  "Per-department agent count + current utilization cards",
  "Last 5 error notifications with red background",
];

const API_REFS = [
  { path: "/api/agents",            desc: "agents[]  id·name·status·avatar_emoji·department_id·current_task_id" },
  { path: "/api/tasks",             desc: "tasks[]   id·title·status·priority·assigned_agent_id·project_id" },
  { path: "/api/departments",       desc: "departments[]  id·name·color" },
  { path: "/api/projects",          desc: "projects[]  id·name·status·core_goal" },
  { path: "/api/agents/performance",desc: "data[]  agent_id·tasks_done·avg_duration_ms·success_rate" },
  { path: "/api/notifications",     desc: "notifications[]  type·title·message·created_at·read" },
];

export default function StepAiGenerate({ isKo, featureType, config, onGenerated }: Props) {
  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<GenerateStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dotIdx, setDotIdx] = useState(0);
  const [showApiRef, setShowApiRef] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const featureIdRef = useRef<string | null>(null);

  const POLL_TIMEOUT_MS = 3 * 60 * 1000; // 3분

  // 로딩 애니메이션
  useEffect(() => {
    if (status !== "polling" && status !== "pending") return;
    const id = setInterval(() => setDotIdx((i) => (i + 1) % DOTS.length), 120);
    return () => clearInterval(id);
  }, [status]);

  // 폴링 — 3초마다 status 확인, 3분 타임아웃
  useEffect(() => {
    if (status !== "polling") {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      return;
    }

    // 3분 후 자동 타임아웃
    timeoutRef.current = setTimeout(() => {
      setStatus("error");
      setErrorMsg(isKo ? "생성 시간이 초과되었습니다 (3분). 다시 시도해주세요." : "Generation timed out (3 min). Please try again.");
    }, POLL_TIMEOUT_MS);

    pollRef.current = setInterval(async () => {
      const id = featureIdRef.current;
      if (!id) return;
      try {
        const feature = await getCustomFeature(id);
        if (feature.progress_log) {
          const lines = feature.progress_log.split("\n").filter(Boolean);
          setProgressLog(lines);
          setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
        if (feature.status === "active") {
          setStatus("done");
          onGenerated(id);
        } else if (feature.status === "error") {
          setStatus("error");
          setErrorMsg(feature.error_msg ?? (isKo ? "알 수 없는 오류" : "Unknown error"));
        }
      } catch { /* 무시 */ }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    };
  }, [status, onGenerated, isKo]);

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setStatus("pending");
    setErrorMsg("");
    try {
      const { feature_id } = await triggerAiGenerate({
        prompt: trimmed,
        type: featureType ?? "app",
        name: name.trim() || (isKo ? "AI 생성 기능" : "AI Generated Feature"),
        config,
      });
      featureIdRef.current = feature_id;
      setStatus("polling");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }

  function handleRetry() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    setStatus("idle");
    setErrorMsg("");
    setProgressLog([]);
    featureIdRef.current = null;
  }

  const isDisabled = status === "polling" || status === "done";
  const quickPrompts = isKo ? QUICK_PROMPTS_KO : QUICK_PROMPTS_EN;

  return (
    <div className="flex flex-col gap-4">
      {/* 이름 입력 */}
      <div className="flex flex-col gap-1">
        <label style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
          {isKo ? "기능 이름" : "Feature Name"}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          placeholder={isKo ? "예: 오늘의 완료 현황" : "e.g. Today's Progress"}
          disabled={isDisabled}
          style={{ ...mono, fontSize: 11, padding: "6px 10px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none" }}
        />
      </div>

      {/* 빠른 프롬프트 예시 */}
      {!isDisabled && (
        <div className="flex flex-col gap-1.5">
          <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
            {isKo ? "예시 선택 (클릭하면 입력됨)" : "Quick examples (click to use)"}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                onClick={() => setPrompt(qp)}
                style={{
                  ...mono, fontSize: 9.5, padding: "3px 8px",
                  background: prompt === qp ? "rgba(245,158,11,0.15)" : "var(--th-bg-panel)",
                  border: `1px solid ${prompt === qp ? "rgba(245,158,11,0.5)" : "var(--th-border)"}`,
                  borderRadius: 4, color: prompt === qp ? "var(--th-accent)" : "var(--th-text-muted)",
                  cursor: "pointer", textAlign: "left", lineHeight: 1.4,
                }}
              >
                {qp}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 프롬프트 입력 */}
      <div className="flex flex-col gap-1">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
            {isKo ? "원하는 기능을 상세히 설명해주세요" : "Describe the feature in detail"}
          </label>
          {/* API 참조 토글 */}
          <button
            onClick={() => setShowApiRef(v => !v)}
            style={{
              ...mono, fontSize: 9, padding: "2px 7px",
              background: showApiRef ? "rgba(245,158,11,0.1)" : "transparent",
              border: `1px solid ${showApiRef ? "rgba(245,158,11,0.4)" : "var(--th-border)"}`,
              borderRadius: 3, color: showApiRef ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: "pointer",
            }}
          >
            {isKo ? "API 참조" : "API ref"} {showApiRef ? "▲" : "▼"}
          </button>
        </div>

        {/* API 참조 패널 */}
        {showApiRef && (
          <div style={{
            ...mono, fontSize: 9.5, padding: "8px 10px",
            background: "rgba(0,0,0,0.25)", border: "1px solid var(--th-border)",
            borderRadius: 4, marginBottom: 4, lineHeight: 1.7,
          }}>
            <div style={{ color: "var(--th-text-muted)", marginBottom: 6, fontSize: 9, letterSpacing: "0.06em" }}>
              {isKo ? "사용 가능한 API (fetch 호출 가능)" : "Available APIs (use with fetch)"}
            </div>
            {API_REFS.map(r => (
              <div key={r.path} style={{ display: "flex", gap: 10, marginBottom: 2 }}>
                <span style={{ color: "var(--th-accent)", flexShrink: 0 }}>{r.path}</span>
                <span style={{ color: "var(--th-text-muted)" }}>→ {r.desc}</span>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={isKo ? PLACEHOLDER_KO : PLACEHOLDER_EN}
          rows={6}
          disabled={isDisabled}
          style={{ ...mono, fontSize: 11, padding: "8px 10px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none", resize: "vertical", lineHeight: 1.6 }}
        />
        <div style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", opacity: 0.6 }}>
          {isKo
            ? "더 구체적으로 설명할수록 AI가 더 정확한 위젯을 만들어줍니다"
            : "The more specific you are, the better the AI-generated widget will be"}
        </div>
      </div>

      {/* 상태별 UI */}
      {status === "idle" && (
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim()}
          style={{
            ...mono, fontSize: 12, fontWeight: 700,
            padding: "10px 0", borderRadius: 6, cursor: prompt.trim() ? "pointer" : "not-allowed",
            background: prompt.trim() ? "var(--th-accent)" : "rgba(245,158,11,0.2)",
            border: "none", color: prompt.trim() ? "#000" : "var(--th-text-muted)",
            opacity: prompt.trim() ? 1 : 0.6,
          }}
        >
          {isKo ? "⚡ AI로 생성하기" : "⚡ Generate with AI"}
        </button>
      )}

      {(status === "pending" || status === "polling") && (
        <div className="flex flex-col gap-2">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, ...mono, color: "var(--th-accent)", flexShrink: 0 }}>{DOTS[dotIdx]}</span>
            <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>
              {status === "pending"
                ? (isKo ? "AI에게 요청 중..." : "Sending request...")
                : (isKo ? "AI가 컴포넌트를 생성하고 있습니다..." : "AI is generating the component...")}
            </div>
          </div>
          {progressLog.length > 0 && (
            <div style={{
              ...mono, fontSize: 10.5, lineHeight: 1.75,
              background: "#0d1117", border: "1px solid #30363d",
              borderRadius: 6, padding: "10px 14px",
              maxHeight: 160, overflowY: "auto",
            }}>
              {progressLog.map((line, i) => {
                const ts = line.match(/^\[[\d:]+\]/)?.[0] ?? "";
                const rest = ts ? line.slice(ts.length + 1) : line;
                const isDone = rest.startsWith("✓");
                const isErr  = rest.startsWith("✗");
                const isAi   = rest.startsWith("AI 호출") || rest.startsWith("AI 응답");
                const textColor = isDone ? "#3fb950" : isErr ? "#f85149" : isAi ? "#d29922" : "#c9d1d9";
                return (
                  <div key={i} style={{ display: "flex", gap: 6, wordBreak: "break-all" }}>
                    {ts && <span style={{ color: "#484f58", flexShrink: 0 }}>{ts}</span>}
                    <span style={{ color: textColor }}>{rest}</span>
                  </div>
                );
              })}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col gap-3">
          <div style={{ ...mono, fontSize: 11, color: "var(--th-danger-text)", padding: "10px 12px", background: "var(--th-danger-bg)", border: "1px solid var(--th-danger-border)", borderRadius: 6 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{isKo ? "생성 실패" : "Generation Failed"}</div>
            <div style={{ opacity: 0.9 }}>{errorMsg}</div>
          </div>
          <button
            onClick={handleRetry}
            style={{ ...mono, fontSize: 11, padding: "6px 0", border: "1px solid var(--th-border)", borderRadius: 4, background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}
          >
            {isKo ? "← 다시 시도" : "← Retry"}
          </button>
        </div>
      )}

      {status === "done" && (
        <div style={{ ...mono, fontSize: 11, color: "var(--th-attr-elite)", padding: "10px 12px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6, textAlign: "center" }}>
          {isKo ? "✓ 생성 완료! 미리보기로 이동합니다..." : "✓ Done! Moving to preview..."}
        </div>
      )}

      {/* 안내 */}
      <div style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", opacity: 0.6, lineHeight: 1.6 }}>
        {isKo
          ? "설정의 기본 프로바이더를 사용합니다. 생성된 코드는 안전성 검사 후 등록됩니다."
          : "Uses the default provider from Settings. Generated code passes a safety check before registration."}
      </div>
    </div>
  );
}
