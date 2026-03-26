import { useState, useRef } from "react";
import type { Project } from "../../../types";
import { cloneGitHubRepo, cloneGitLabRepo, getCloneStatus, getGitLabCloneStatus } from "../../../api/providers-reports-github";
import { useI18n } from "../../../i18n";
import type { GitProvider, CloneStep } from "./types";

export function GitTab({ project }: { project: Project }) {
  const { t } = useI18n();
  const mono = "var(--th-font-mono)";

  const [provider, setProvider] = useState<GitProvider>("github");
  const [ghUrl, setGhUrl] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [ghBranch, setGhBranch] = useState("");
  const [glUrl, setGlUrl] = useState("");
  const [glToken, setGlToken] = useState("");
  const [glBranch, setGlBranch] = useState("");
  const [step, setStep] = useState<CloneStep>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  function parseGitHubOwnerRepo(url: string): { owner: string; repo: string } | null {
    const m = url.trim().replace(/\.git$/, "").match(/github\.com[/:]([^/]+)\/([^/]+)/);
    return m ? { owner: m[1], repo: m[2] } : null;
  }

  async function handleClone() {
    setStep("cloning");
    setProgress(5);
    setErrorMsg("");
    try {
      let cloneId: string;
      if (provider === "github") {
        const parsed = parseGitHubOwnerRepo(ghUrl);
        if (!parsed) throw new Error(t({ ko: "GitHub URL 형식이 잘못되었습니다.", en: "Invalid GitHub URL format.", ja: "GitHub URLの形式が正しくありません。", zh: "GitHub URL 格式无效。" }));
        const res = await cloneGitHubRepo({
          owner: parsed.owner,
          repo: parsed.repo,
          branch: ghBranch.trim() || undefined,
          target_path: project.project_path,
          pat: ghToken.trim() || undefined,
        });
        if (res.already_exists) { setStep("done"); return; }
        cloneId = res.clone_id!;
      } else {
        const res = await cloneGitLabRepo({
          repo_url: glUrl.trim(),
          token: glToken.trim(),
          branch: glBranch.trim() || undefined,
          target_path: project.project_path,
        });
        if (res.already_exists) { setStep("done"); return; }
        cloneId = res.clone_id!;
      }

      pollRef.current = setInterval(async () => {
        try {
          const status = provider === "github"
            ? await getCloneStatus(cloneId)
            : await getGitLabCloneStatus(cloneId);
          setProgress(status.progress ?? 0);
          if (status.status === "done") {
            stopPoll(); setProgress(100); setStep("done");
          } else if (status.status === "error") {
            stopPoll();
            setErrorMsg(status.error ?? t({ ko: "클론 실패", en: "Clone failed", ja: "クローン失敗", zh: "克隆失败" }));
            setStep("error");
          }
        } catch { /* 무시 */ }
      }, 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  const ghReady = ghUrl.trim().length > 0;
  const glReady = glUrl.trim().length > 0 && glToken.trim().length > 0;
  const canClone = provider === "github" ? ghReady : glReady;

  const s: React.CSSProperties = { fontFamily: mono };
  const inputStyle: React.CSSProperties = {
    ...s, fontSize: 11, padding: "6px 10px",
    background: "var(--th-bg-elevated)", border: "1px solid #E5E7EB",
    borderRadius: 6, color: "var(--th-text-primary)", outline: "none", width: "100%",
  };

  if (step === "cloning") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
        <div style={{ ...s, fontSize: 13, fontWeight: 700, color: "var(--th-text-primary)" }}>
          {t({ ko: "클론 중...", en: "Cloning...", ja: "クローン中...", zh: "正在克隆..." })}
        </div>
        <div style={{ width: 280, height: 6, borderRadius: 3, background: "var(--th-border)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "var(--th-accent)", transition: "width 0.4s ease", borderRadius: 3 }} />
        </div>
        <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)" }}>{progress}%</div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
        <span style={{ display: "inline-flex", color: "#30d158" }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
            <circle cx="22" cy="22" r="19" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.2" />
            <path d="M13 22L19 28L31 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div style={{ ...s, fontSize: 13, fontWeight: 700, color: "var(--th-text-primary)" }}>
          {t({ ko: "완료!", en: "Done!", ja: "完了!", zh: "完成!" })}
        </div>
        <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)" }}>{project.project_path}</div>
        <button onClick={() => { setStep("idle"); setProgress(0); }} style={{ ...s, fontSize: 11, padding: "5px 16px", borderRadius: 6, border: "1px solid #E5E7EB", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}>
          {t({ ko: "다시 가져오기", en: "Import again", ja: "再インポート", zh: "重新导入" })}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16, height: "100%", overflowY: "auto" }}>
      <div style={{ ...s, fontSize: 11, color: "var(--th-text-muted)", padding: "8px 12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6 }}>
        {t({
          ko: `저장소를 이 프로젝트 경로(${project.project_path})로 클론합니다.`,
          en: `Clone a repository into this project path (${project.project_path}).`,
          ja: `リポジトリをこのプロジェクトパス(${project.project_path})にクローンします。`,
          zh: `将仓库克隆到此项目路径（${project.project_path}）。`,
        })}
      </div>

      {step === "error" && (
        <div style={{ ...s, fontSize: 11, color: "var(--th-danger-text)", padding: "8px 12px", background: "var(--th-danger-bg)", border: "1px solid #FECACA", borderRadius: 6 }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {(["github", "gitlab"] as GitProvider[]).map((p) => {
          const active = provider === p;
          const isGh = p === "github";
          const color      = isGh ? "var(--th-text-primary)" : "#fc6d26";
          const activeBg   = isGh ? "var(--th-hover-overlay-subtle)" : "rgba(252,109,38,0.1)";
          const activeBorder = isGh ? "var(--th-border-strong)" : "rgba(252,109,38,0.5)";
          return (
            <button
              key={p}
              type="button"
              onClick={() => setProvider(p)}
              style={{
                ...s, fontSize: 11, fontWeight: active ? 700 : 500,
                padding: "6px 16px", borderRadius: 6,
                border: `1px solid ${active ? activeBorder : "var(--th-border)"}`,
                background: active ? activeBg : "transparent",
                color: active ? color : "var(--th-text-muted)",
                cursor: "pointer", transition: "all 0.12s",
              }}
            >
              {p === "github" ? "GitHub" : "GitLab"}
            </button>
          );
        })}
      </div>

      {provider === "github" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t({ ko: "저장소 URL", en: "Repository URL", ja: "リポジトリURL", zh: "仓库 URL" })}
            </div>
            <input value={ghUrl} onChange={(e) => setGhUrl(e.target.value)} placeholder="https://github.com/owner/repo" style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 2 }}>
              <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Personal Access Token <span style={{ opacity: 0.6 }}>({t({ ko: "선택", en: "optional", ja: "任意", zh: "可选" })})</span>
              </div>
              <input value={ghToken} onChange={(e) => setGhToken(e.target.value)} type="password" placeholder="ghp_..." style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {t({ ko: "브랜치", en: "Branch", ja: "ブランチ", zh: "分支" })} <span style={{ opacity: 0.6 }}>({t({ ko: "선택", en: "optional", ja: "任意", zh: "可选" })})</span>
              </div>
              <input value={ghBranch} onChange={(e) => setGhBranch(e.target.value)} placeholder="main" style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      {provider === "gitlab" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t({ ko: "저장소 URL", en: "Repository URL", ja: "リポジトリURL", zh: "仓库 URL" })}
            </div>
            <input value={glUrl} onChange={(e) => setGlUrl(e.target.value)} placeholder="https://gitlab.com/username/repo" style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 2 }}>
              <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Personal Access Token
              </div>
              <input value={glToken} onChange={(e) => setGlToken(e.target.value)} type="password" placeholder="glpat-xxxxxxxxxxxxxxxxxxxx" style={inputStyle} />
              <div style={{ ...s, fontSize: 9, color: "var(--th-text-muted)", marginTop: 4, opacity: 0.7 }}>
                {t({ ko: "read_repository 스코프 필요", en: "Requires read_repository scope", ja: "read_repositoryスコープが必要", zh: "需要 read_repository 权限" })}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {t({ ko: "브랜치", en: "Branch", ja: "ブランチ", zh: "分支" })} <span style={{ opacity: 0.6 }}>({t({ ko: "선택", en: "optional", ja: "任意", zh: "可选" })})</span>
              </div>
              <input value={glBranch} onChange={(e) => setGlBranch(e.target.value)} placeholder="main" style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleClone}
        disabled={!canClone}
        style={{
          ...s, fontSize: 12, fontWeight: 700, padding: "9px 0", borderRadius: 6, border: "none",
          background: canClone ? "var(--th-accent)" : "rgba(245,158,11,0.2)",
          color: canClone ? "#000" : "var(--th-text-muted)",
          cursor: canClone ? "pointer" : "not-allowed",
          marginTop: 4,
        }}
      >
        {t({ ko: "저장소 클론", en: "Clone Repository", ja: "リポジトリをクローン", zh: "克隆仓库" })}
      </button>
    </div>
  );
}
