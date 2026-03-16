import { useState, useEffect, useRef } from "react";
import type { CustomFeatureConfig, CustomFeatureType } from "../../../types";
import { triggerAiGenerate, getCustomFeature } from "../../../api/custom-features";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

type GenerateStatus = "idle" | "pending" | "polling" | "done" | "error";

interface Props {
  isKo: boolean;
  featureType: CustomFeatureType;
  config: CustomFeatureConfig;
  onGenerated: (featureId: string) => void;
}

const PLACEHOLDER_KO = `예시:
- "에이전트별 오늘 완료된 태스크 수를 카드로 보여줘"
- "working 상태인 에이전트 목록과 현재 태스크를 표시해줘"
- "최근 오류 알림 5개를 빨간 배경으로 표시해줘"`;

const PLACEHOLDER_EN = `Examples:
- "Show today's completed task count per agent as cards"
- "Display working agents and their current task"
- "Show last 5 error notifications with red background"`;

const DOTS = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];

export default function StepAiGenerate({ isKo, featureType, config, onGenerated }: Props) {
  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<GenerateStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dotIdx, setDotIdx] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const featureIdRef = useRef<string | null>(null);

  // 로딩 애니메이션
  useEffect(() => {
    if (status !== "polling" && status !== "pending") return;
    const id = setInterval(() => setDotIdx((i) => (i + 1) % DOTS.length), 120);
    return () => clearInterval(id);
  }, [status]);

  // 폴링 — 5초마다 status 확인
  useEffect(() => {
    if (status !== "polling") {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      const id = featureIdRef.current;
      if (!id) return;
      try {
        const feature = await getCustomFeature(id);
        if (feature.status === "active") {
          setStatus("done");
          onGenerated(id);
        } else if (feature.status === "error") {
          setStatus("error");
          setErrorMsg(feature.error_msg ?? (isKo ? "알 수 없는 오류" : "Unknown error"));
        }
      } catch { /* 무시 */ }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status, onGenerated, isKo]);

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setStatus("pending");
    setErrorMsg("");
    try {
      const { feature_id } = await triggerAiGenerate({
        prompt: trimmed,
        type: featureType,
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
    setStatus("idle");
    setErrorMsg("");
    featureIdRef.current = null;
  }

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
          disabled={status === "polling" || status === "done"}
          style={{ ...mono, fontSize: 11, padding: "6px 10px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none" }}
        />
      </div>

      {/* 프롬프트 입력 */}
      <div className="flex flex-col gap-1">
        <label style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
          {isKo ? "만들고 싶은 기능을 설명해주세요" : "Describe the feature you want"}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={isKo ? PLACEHOLDER_KO : PLACEHOLDER_EN}
          rows={5}
          disabled={status === "polling" || status === "done"}
          style={{ ...mono, fontSize: 11, padding: "8px 10px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none", resize: "vertical" }}
        />
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
          {isKo ? "✦ AI에게 생성 요청" : "✦ Generate with AI"}
        </button>
      )}

      {(status === "pending" || status === "polling") && (
        <div className="flex flex-col items-center gap-3 py-4">
          <span style={{ fontSize: 24, ...mono, color: "var(--th-accent)" }}>{DOTS[dotIdx]}</span>
          <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", textAlign: "center" }}>
            {status === "pending"
              ? (isKo ? "AI에게 요청 중..." : "Sending request...")
              : (isKo ? "AI가 컴포넌트를 생성하고 있습니다..." : "AI is generating the component...")}
          </div>
          <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", opacity: 0.6 }}>
            {isKo ? "보통 10~30초 소요됩니다" : "Usually takes 10~30 seconds"}
          </div>
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
          ✓ {isKo ? "생성 완료! 미리보기로 이동합니다..." : "Done! Moving to preview..."}
        </div>
      )}

      {/* 안내 */}
      <div style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", opacity: 0.7, lineHeight: 1.6 }}>
        {isKo
          ? "설정에서 설정된 기본 프로바이더를 사용합니다. AI가 생성한 코드는 안전성 검사 후 등록됩니다."
          : "Uses the default provider from Settings. Generated code passes a safety check before registration."}
      </div>
    </div>
  );
}
