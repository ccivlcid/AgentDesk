import { useState, useEffect } from "react";
import { kickoffProject } from "../../../api/project-kickoff";

type PanelMode = "collapsed" | "idle" | "loading" | "clarification" | "disabled" | "error";

interface NewRoundPanelProps {
  projectId: string;
  hasRunningTask: boolean;
  onKickoffDone: () => void;
  t: (keys: { ko: string; en: string; ja?: string; zh?: string }) => string;
}

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function NewRoundPanel({ projectId, hasRunningTask, onKickoffDone, t }: NewRoundPanelProps) {
  const [mode, setMode] = useState<PanelMode>(hasRunningTask ? "disabled" : "collapsed");
  const [input, setInput] = useState("");
  const [clarificationId, setClarificationId] = useState<string | null>(null);
  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMode(hasRunningTask ? "disabled" : (m) => m === "disabled" ? "collapsed" : m);
  }, [hasRunningTask]);

  const handleSubmit = async () => {
    const directive = input.trim();
    setMode("loading");
    setErrorMsg("");
    try {
      const result = await kickoffProject(projectId, undefined, directive || undefined);
      if (result.status === "clarification_needed" && result.clarificationId && result.question) {
        setClarificationId(result.clarificationId);
        setClarificationQuestion(result.question);
        setClarificationAnswer("");
        setMode("clarification");
      } else {
        setInput("");
        setMode("collapsed");
        onKickoffDone();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setMode("error");
    }
  };

  const handleClarificationReply = async () => {
    if (!clarificationId || !clarificationAnswer.trim()) return;
    setMode("loading");
    try {
      const result = await kickoffProject(projectId, clarificationAnswer.trim(), undefined, clarificationId);
      setClarificationId(null);
      setClarificationQuestion("");
      setClarificationAnswer("");
      setInput("");
      if (result.status === "clarification_needed" && result.clarificationId && result.question) {
        setClarificationId(result.clarificationId);
        setClarificationQuestion(result.question);
        setMode("clarification");
      } else {
        setMode("collapsed");
        onKickoffDone();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setMode("error");
    }
  };

  // ── disabled: 실행 중 ──
  if (mode === "disabled") {
    return (
      <div
        style={{
          ...mono,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          borderTop: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
          fontSize: 11,
          color: "var(--th-text-muted)",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--th-accent)", flexShrink: 0, animation: "pulse 2s infinite" }} />
        {t({ ko: "에이전트 작업 중 — 완료 후 추가 지시 가능", en: "Agents working — additional tasks available after completion", ja: "エージェント作業中", zh: "代理工作中" })}
      </div>
    );
  }

  // ── collapsed ──
  if (mode === "collapsed") {
    return (
      <button
        type="button"
        onClick={() => setMode("idle")}
        style={{
          ...mono,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "8px 14px",
          borderTop: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
          border: "none",
          borderTopStyle: "solid",
          borderTopWidth: 1,
          borderTopColor: "var(--th-border)",
          fontSize: 11,
          color: "var(--th-accent)",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        {t({ ko: "추가 업무 지시", en: "Assign additional tasks", ja: "追加業務指示", zh: "追加任务指示" })}
      </button>
    );
  }

  // ── loading ──
  if (mode === "loading") {
    return (
      <div
        style={{
          ...mono,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderTop: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
          fontSize: 11,
          color: "var(--th-text-secondary)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
        {t({ ko: "에이전트가 업무를 계획하는 중...", en: "Agent is planning tasks...", ja: "エージェントが業務を計画中...", zh: "代理正在规划任务..." })}
      </div>
    );
  }

  // ── clarification ──
  if (mode === "clarification") {
    return (
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
          padding: "10px 14px",
        }}
      >
        <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          {t({ ko: "에이전트 확인 요청", en: "Agent needs clarification", ja: "エージェントの確認", zh: "代理需要确认" })}
        </div>
        <p style={{ ...mono, fontSize: 12, color: "var(--th-text-primary)", marginBottom: 8, lineHeight: 1.5 }}>
          {clarificationQuestion}
        </p>
        <textarea
          value={clarificationAnswer}
          onChange={(e) => setClarificationAnswer(e.target.value)}
          placeholder={t({ ko: "답변을 입력하세요...", en: "Enter your answer...", ja: "回答を入力...", zh: "输入您的回答..." })}
          rows={2}
          style={{
            ...mono,
            width: "100%",
            boxSizing: "border-box",
            fontSize: 11,
            padding: "6px 8px",
            background: "var(--th-input-bg)",
            border: "1px solid var(--th-border)",
            borderRadius: 4,
            color: "var(--th-text-primary)",
            outline: "none",
            resize: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void handleClarificationReply();
            }
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
          <button
            type="button"
            onClick={() => { setMode("idle"); setClarificationId(null); }}
            style={{ ...mono, fontSize: 10, padding: "4px 10px", borderRadius: 4, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)", cursor: "pointer" }}
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
          <button
            type="button"
            onClick={() => void handleClarificationReply()}
            disabled={!clarificationAnswer.trim()}
            style={{ ...mono, fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 4, border: "none", background: "var(--th-accent)", color: "var(--th-accent-text, var(--th-bg-primary))", cursor: "pointer", opacity: clarificationAnswer.trim() ? 1 : 0.4 }}
          >
            {t({ ko: "답변 전송", en: "Send answer", ja: "回答送信", zh: "发送回答" })}
          </button>
        </div>
      </div>
    );
  }

  // ── error ──
  if (mode === "error") {
    return (
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
          padding: "10px 14px",
        }}
      >
        <p style={{ ...mono, fontSize: 11, color: "var(--th-danger-text, #f87171)", marginBottom: 6 }}>
          {errorMsg || t({ ko: "오류가 발생했습니다", en: "An error occurred", ja: "エラーが発生しました", zh: "发生错误" })}
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            style={{ ...mono, fontSize: 10, padding: "4px 10px", borderRadius: 4, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)", cursor: "pointer" }}
          >
            {t({ ko: "다시 시도", en: "Retry", ja: "再試行", zh: "重试" })}
          </button>
          <button
            type="button"
            onClick={() => setMode("idle")}
            style={{ ...mono, fontSize: 10, padding: "4px 10px", borderRadius: 4, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)", cursor: "pointer" }}
          >
            {t({ ko: "돌아가기", en: "Back", ja: "戻る", zh: "返回" })}
          </button>
        </div>
      </div>
    );
  }

  // ── idle (펼침 + 입력 대기) ──
  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: "1px solid var(--th-border)",
        background: "var(--th-bg-panel)",
        padding: "10px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: "var(--th-text-heading)" }}>
          {t({ ko: "추가 업무 지시", en: "Assign additional tasks", ja: "追加業務指示", zh: "追加任务指示" })}
        </span>
        <button
          type="button"
          onClick={() => { setMode("collapsed"); setInput(""); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "var(--th-text-muted)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
        </button>
      </div>
      <textarea
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t({
          ko: "어떤 업무를 추가할까요? (예: 로그인 기능 구현, 단위 테스트 작성)",
          en: "What tasks to add? (e.g., implement login, write unit tests)",
          ja: "どのような業務を追加しますか？",
          zh: "要添加什么任务？",
        })}
        rows={3}
        style={{
          ...mono,
          width: "100%",
          boxSizing: "border-box",
          fontSize: 11,
          padding: "8px 10px",
          background: "var(--th-input-bg)",
          border: "1px solid var(--th-border)",
          borderRadius: 4,
          color: "var(--th-text-primary)",
          outline: "none",
          resize: "none",
          lineHeight: 1.5,
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void handleSubmit();
          }
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)" }}>
          {t({ ko: "비어있으면 프로젝트 목표 기반으로 자동 계획", en: "Empty = auto-plan from project goal", ja: "空欄 = プロジェクト目標から自動計画", zh: "为空 = 基于项目目标自动规划" })}
        </span>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          style={{
            ...mono,
            fontSize: 11,
            fontWeight: 600,
            padding: "5px 14px",
            borderRadius: 4,
            border: "none",
            background: "var(--th-accent)",
            color: "var(--th-accent-text, var(--th-bg-primary))",
            cursor: "pointer",
          }}
        >
          {t({ ko: "업무 지시", en: "Start round", ja: "業務指示", zh: "任务指示" })}
        </button>
      </div>
    </div>
  );
}
