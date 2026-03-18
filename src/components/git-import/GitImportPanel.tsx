import { useRef, useState } from "react";
import { cloneGitHubRepo, cloneGitLabRepo, getCloneStatus, getGitLabCloneStatus } from "../../api/providers-reports-github";
import { createProject } from "../../api";
import { useI18n } from "../../i18n";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

type Provider = "github" | "gitlab";
type Step = "input" | "cloning" | "done" | "error";

interface Props {
  onComplete: (result: { projectId: string; projectPath: string; branch: string }) => void;
  onCancel: () => void;
}

function parseGitHubOwnerRepo(url: string) {
  const m = url.trim().replace(/\.git$/, "").match(/github\.com[/:]([^/]+)\/([^/]+)/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

function repoNameFromUrl(url: string) {
  return url.trim().replace(/\.git$/, "").split("/").pop() ?? "repo";
}

export default function GitImportPanel({ onComplete, onCancel }: Props) {
  const { t } = useI18n();
  const [provider, setProvider] = useState<Provider>("github");
  const [url, setUrl]         = useState("");
  const [token, setToken]     = useState("");
  const [branch, setBranch]   = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [step, setStep]       = useState<Step>("input");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  function handleUrlChange(v: string) {
    setUrl(v);
    const name = repoNameFromUrl(v);
    if (name) {
      setProjectName(name);
      setTargetPath(`~/Projects/${name}`);
    }
  }

  async function finishProject(path: string) {
    const name = projectName.trim() || repoNameFromUrl(url);
    const proj = await createProject({
      name,
      project_path: path,
      core_goal: `${name} 프로젝트`,
      create_path_if_missing: false,
    });
    setStep("done");
    onComplete({ projectId: proj.id, projectPath: proj.project_path, branch: branch || "main" });
  }

  async function handleImport() {
    const trimUrl = url.trim();
    if (!trimUrl) return;
    setStep("cloning");
    setProgress(5);
    setErrorMsg("");

    try {
      let cloneId: string;
      let targetP: string;

      if (provider === "github") {
        const parsed = parseGitHubOwnerRepo(trimUrl);
        if (!parsed) throw new Error(t({ ko: "GitHub URL 형식이 잘못됐습니다. (예: https://github.com/owner/repo)", en: "Invalid GitHub URL. (e.g. https://github.com/owner/repo)", ja: "GitHub URLの形式が正しくありません。", zh: "GitHub URL 格式无效。" }));
        const res = await cloneGitHubRepo({
          owner: parsed.owner,
          repo: parsed.repo,
          branch: branch.trim() || undefined,
          target_path: targetPath.trim() || undefined,
          pat: token.trim() || undefined,
        });
        if (res.already_exists) { await finishProject(res.target_path); return; }
        cloneId = res.clone_id!;
        targetP = res.target_path;
      } else {
        if (!token.trim()) throw new Error(t({ ko: "GitLab Personal Access Token이 필요합니다.", en: "GitLab Personal Access Token is required.", ja: "GitLab PATが必要です。", zh: "需要 GitLab PAT。" }));
        const res = await cloneGitLabRepo({
          repo_url: trimUrl,
          token: token.trim(),
          branch: branch.trim() || undefined,
          target_path: targetPath.trim() || undefined,
        });
        if (res.already_exists) { await finishProject(res.target_path); return; }
        cloneId = res.clone_id!;
        targetP = res.target_path;
      }

      pollRef.current = setInterval(async () => {
        try {
          const status = provider === "github"
            ? await getCloneStatus(cloneId)
            : await getGitLabCloneStatus(cloneId);
          setProgress(status.progress ?? 0);
          if (status.status === "done") {
            stopPoll();
            setProgress(100);
            await finishProject(targetP);
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

  const canImport = url.trim().length > 0 && (provider === "github" || token.trim().length > 0);

  const inputStyle: React.CSSProperties = {
    ...mono, fontSize: 11, padding: "7px 10px",
    background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)",
    borderRadius: 4, color: "var(--th-text-primary)", outline: "none", width: "100%",
  };

  function Label({ children }: { children: React.ReactNode }) {
    return <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--th-text-muted)", textTransform: "uppercase", marginBottom: 4 }}>{children}</div>;
  }

  if (step === "cloning") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "40px 0" }}>
        <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-heading)" }}>
          {t({ ko: "클론 중...", en: "Cloning...", ja: "クローン中...", zh: "正在克隆..." })}
        </div>
        <div style={{ width: 280, height: 6, borderRadius: 3, background: "var(--th-border)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "var(--th-accent)", transition: "width 0.4s ease", borderRadius: 3 }} />
        </div>
        <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>{progress}%</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 에러 */}
      {step === "error" && (
        <div style={{ ...mono, fontSize: 11, color: "var(--th-danger-text)", padding: "8px 12px", background: "var(--th-danger-bg)", border: "1px solid var(--th-danger-border)", borderRadius: 4 }}>
          {errorMsg}
        </div>
      )}

      {/* 플랫폼 선택 */}
      <div style={{ display: "flex", gap: 0, border: "1px solid var(--th-border)", borderRadius: 6, overflow: "hidden" }}>
        {(["github", "gitlab"] as Provider[]).map((p, i) => {
          const active = provider === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => { setProvider(p); setUrl(""); setToken(""); setBranch(""); setTargetPath(""); setProjectName(""); setStep("input"); setErrorMsg(""); }}
              style={{
                ...mono, flex: 1, fontSize: 12, fontWeight: active ? 700 : 500,
                padding: "8px 0",
                border: "none",
                borderRight: i === 0 ? "1px solid var(--th-border)" : undefined,
                background: active ? "var(--th-accent)" : "transparent",
                color: active ? "#000" : "var(--th-text-muted)",
                cursor: "pointer", transition: "all 0.12s",
              }}
            >
              {p === "github" ? "GitHub" : "GitLab"}
            </button>
          );
        })}
      </div>

      {/* URL */}
      <div>
        <Label>{t({ ko: "저장소 URL", en: "Repository URL", ja: "リポジトリ URL", zh: "仓库 URL" })}</Label>
        <input
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder={provider === "github" ? "https://github.com/owner/repo" : "https://gitlab.com/username/repo"}
          style={inputStyle}
          autoFocus
        />
      </div>

      {/* Token */}
      <div>
        <Label>
          Personal Access Token{" "}
          {provider === "github" && <span style={{ fontWeight: 400, textTransform: "none" }}>({t({ ko: "비공개 저장소만 필요", en: "only for private repos", ja: "プライベートのみ", zh: "仅私有仓库需要" })})</span>}
        </Label>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
          placeholder={provider === "github" ? "ghp_..." : "glpat-..."}
          style={inputStyle}
        />
        {provider === "gitlab" && (
          <div style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 4, opacity: 0.8 }}>
            {t({ ko: "Settings → Access Tokens → read_repository 스코프", en: "Settings → Access Tokens → read_repository scope", ja: "Settings → Access Tokens → read_repositoryスコープ", zh: "Settings → Access Tokens → read_repository 权限" })}
          </div>
        )}
      </div>

      {/* Branch + Path */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Label>{t({ ko: "브랜치", en: "Branch", ja: "ブランチ", zh: "分支" })} ({t({ ko: "선택", en: "optional", ja: "任意", zh: "可选" })})</Label>
          <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" style={inputStyle} />
        </div>
        <div style={{ flex: 2 }}>
          <Label>{t({ ko: "저장 경로", en: "Target Path", ja: "保存先", zh: "保存路径" })}</Label>
          <input value={targetPath} onChange={(e) => setTargetPath(e.target.value)} placeholder="~/Projects/my-repo" style={inputStyle} />
        </div>
      </div>

      {/* 프로젝트 이름 */}
      <div>
        <Label>{t({ ko: "프로젝트 이름", en: "Project Name", ja: "プロジェクト名", zh: "项目名称" })}</Label>
        <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder={t({ ko: "프로젝트 이름", en: "Project name", ja: "プロジェクト名", zh: "项目名称" })} style={inputStyle} />
      </div>

      {/* 버튼 */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
        <button type="button" onClick={onCancel} style={{ ...mono, fontSize: 11, padding: "6px 14px", borderRadius: 4, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}>
          {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={!canImport}
          style={{ ...mono, fontSize: 11, fontWeight: 700, padding: "6px 18px", borderRadius: 4, border: "none", background: canImport ? "var(--th-accent)" : "rgba(245,158,11,0.2)", color: canImport ? "#000" : "var(--th-text-muted)", cursor: canImport ? "pointer" : "not-allowed" }}
        >
          {t({ ko: "가져오기", en: "Import", ja: "インポート", zh: "导入" })}
        </button>
      </div>
    </div>
  );
}
