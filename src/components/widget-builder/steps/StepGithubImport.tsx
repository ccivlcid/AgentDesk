import { useState, useEffect, useRef } from "react";
import { githubImport, githubRepoImport, getCustomFeature } from "../../../api/custom-features";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
const DOTS = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];

type Status = "idle" | "pending" | "polling" | "done" | "error";
type UrlMode = "file" | "repo";

interface Props {
  isKo: boolean;
  onGenerated: (featureId: string) => void;
}

function isValidGithubUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      (u.hostname === "github.com" ||
        u.hostname === "raw.githubusercontent.com" ||
        u.hostname === "gist.github.com" ||
        u.hostname === "gist.githubusercontent.com")
    );
  } catch {
    return false;
  }
}

/** github.com/user/repo (경로 2개) → repo, 그 외 → file */
function detectUrlMode(url: string): UrlMode {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return "file";
    const parts = u.pathname.replace(/^\//, "").split("/").filter(Boolean);
    return parts.length === 2 ? "repo" : "file";
  } catch {
    return "file";
  }
}

export default function StepGithubImport({ isKo, onGenerated }: Props) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dotIdx, setDotIdx] = useState(0);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const featureIdRef = useRef<string | null>(null);

  const trimmed = url.trim();
  const urlValid = isValidGithubUrl(trimmed);
  const urlMode: UrlMode = urlValid ? detectUrlMode(trimmed) : "file";
  const isDisabled = status === "polling" || status === "done";
  const timeoutMs = urlMode === "repo" ? 120_000 : 30_000;
  const timeoutLabel = urlMode === "repo" ? (isKo ? "2분" : "2 minutes") : (isKo ? "30초" : "30 seconds");

  useEffect(() => {
    if (status !== "polling" && status !== "pending") return;
    const id = setInterval(() => setDotIdx((i) => (i + 1) % DOTS.length), 120);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status !== "polling") {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      return;
    }
    timeoutRef.current = setTimeout(() => {
      setStatus("error");
      setErrorMsg(isKo ? `시간 초과 (${timeoutLabel}). 다시 시도해주세요.` : `Timed out (${timeoutLabel}). Please try again.`);
    }, timeoutMs);
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
        if (feature.status === "active") { setStatus("done"); onGenerated(id); }
        else if (feature.status === "error") { setStatus("error"); setErrorMsg(feature.error_msg ?? (isKo ? "알 수 없는 오류" : "Unknown error")); }
      } catch { /* ignore */ }
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    };
  }, [status, onGenerated, isKo, timeoutMs, timeoutLabel]);

  async function handleImport() {
    if (!trimmed || !urlValid) return;
    setStatus("pending");
    setErrorMsg("");
    try {
      const defaultName = trimmed.split("/").filter(Boolean).pop()?.replace(/\.[^.]+$/, "") || (urlMode === "repo" ? "GitHub 앱" : "GitHub 위젯");
      const { feature_id } = await (urlMode === "repo" ? githubRepoImport : githubImport)({ url: trimmed, name: name.trim() || defaultName });
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* URL 입력 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>GitHub URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={isKo ? "https://github.com/user/repo  또는  파일 URL" : "https://github.com/user/repo  or  file URL"}
          disabled={isDisabled}
          spellCheck={false}
          autoFocus
          style={{
            ...mono, fontSize: 11, padding: "8px 10px",
            background: "var(--th-bg-panel)",
            border: `1px solid ${url && !urlValid ? "rgba(239,68,68,0.5)" : "var(--th-border)"}`,
            borderRadius: 4, color: "var(--th-text-primary)", outline: "none",
          }}
        />
        {url && !urlValid && (
          <span style={{ ...mono, fontSize: 9, color: "var(--th-danger-text)" }}>
            {isKo ? "유효한 GitHub/Gist URL을 입력해주세요" : "Enter a valid GitHub or Gist URL"}
          </span>
        )}
        {/* 모드 뱃지 */}
        {urlValid && (
          <span style={{
            ...mono, fontSize: 9, padding: "2px 8px", borderRadius: 20, alignSelf: "flex-start",
            background: urlMode === "repo" ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.1)",
            border: `1px solid ${urlMode === "repo" ? "rgba(245,158,11,0.4)" : "rgba(34,197,94,0.3)"}`,
            color: urlMode === "repo" ? "var(--th-accent)" : "var(--th-attr-elite)",
            fontWeight: 700,
          }}>
            {urlMode === "repo"
              ? (isKo ? "레포 URL — AI가 앱 + 아이콘 생성" : "Repo URL — AI generates app + icon")
              : (isKo ? "파일 URL — 직접 설치" : "File URL — direct install")}
          </span>
        )}
      </div>

      {/* 이름 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
          {isKo ? "이름 (선택)" : "Name (optional)"}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          placeholder={isKo ? "비워두면 URL에서 자동 추출" : "Leave blank to auto-detect from URL"}
          disabled={isDisabled}
          style={{ ...mono, fontSize: 11, padding: "6px 10px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none" }}
        />
      </div>

      {/* 액션 */}
      {status === "idle" && (
        <button
          onClick={handleImport}
          disabled={!urlValid}
          style={{
            ...mono, fontSize: 12, fontWeight: 700, padding: "10px 0", borderRadius: 6,
            cursor: urlValid ? "pointer" : "not-allowed",
            background: urlValid ? "var(--th-accent)" : "rgba(245,158,11,0.2)",
            border: "none", color: urlValid ? "#000" : "var(--th-text-muted)",
            opacity: urlValid ? 1 : 0.6,
          }}
        >
          {urlMode === "repo"
            ? (isKo ? "⚡ AI로 앱 생성" : "⚡ Generate App with AI")
            : (isKo ? "⬇ 가져오기" : "⬇ Import")}
        </button>
      )}

      {(status === "pending" || status === "polling") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* 스피너 + 상태 텍스트 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, ...mono, color: "var(--th-accent)", flexShrink: 0 }}>{DOTS[dotIdx]}</span>
            <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>
              {status === "pending"
                ? (isKo ? "요청 중..." : "Sending request...")
                : urlMode === "repo"
                  ? (isKo ? "AI가 앱을 생성하는 중..." : "AI is generating the app...")
                  : (isKo ? "파일을 가져와 컴파일 중..." : "Fetching and compiling...")}
            </div>
            {urlMode === "repo" && status === "polling" && (
              <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", opacity: 0.45, marginLeft: "auto", flexShrink: 0 }}>
                {isKo ? `최대 ${timeoutLabel}` : `up to ${timeoutLabel}`}
              </span>
            )}
          </div>
          {/* 터미널 로그 패널 */}
          {progressLog.length > 0 && (
            <div style={{
              ...mono, fontSize: 10, lineHeight: 1.8,
              background: "rgba(0,0,0,0.35)", border: "1px solid var(--th-border)",
              borderRadius: 5, padding: "8px 12px",
              maxHeight: 180, overflowY: "auto",
              color: "var(--th-text-muted)",
            }}>
              {progressLog.map((line, i) => {
                const isDone = line.includes("✓");
                const isErr = line.includes("✗");
                const isAi = line.includes("AI 호출") || line.includes("AI 응답");
                const color = isDone ? "var(--th-attr-elite)" : isErr ? "var(--th-danger-text)" : isAi ? "var(--th-accent)" : undefined;
                return (
                  <div key={i} style={{ color, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {line}
                  </div>
                );
              })}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}

      {status === "error" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ ...mono, fontSize: 11, color: "var(--th-danger-text)", padding: "10px 12px", background: "var(--th-danger-bg)", border: "1px solid var(--th-danger-border)", borderRadius: 6 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{isKo ? "실패" : "Failed"}</div>
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
          {urlMode === "repo"
            ? (isKo ? "✓ 앱 생성 완료!" : "✓ App created!")
            : (isKo ? "✓ 가져오기 완료!" : "✓ Imported!")}
        </div>
      )}
    </div>
  );
}
