import { useCallback, useRef, useState } from "react";
import { cloneGitLabRepo, getGitLabCloneStatus } from "../../api/providers-reports-github";
import { createProject } from "../../api";
import { useI18n } from "../../i18n";
import os from "os";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

interface GitLabImportPanelProps {
  onComplete: (result: { projectId: string; projectPath: string; branch: string }) => void;
  onCancel: () => void;
}

type Step = "input" | "cloning" | "done" | "error";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--th-text-muted)", textTransform: "uppercase" }}>{label}</div>
      {children}
      {hint && <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", opacity: 0.7 }}>{hint}</div>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        ...mono, fontSize: 12, padding: "7px 10px",
        background: "var(--th-bg-panel)", border: "1px solid var(--th-border)",
        borderRadius: 6, color: "var(--th-text-primary)", outline: "none", width: "100%",
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );
}

export default function GitLabImportPanel({ onComplete, onCancel }: GitLabImportPanelProps) {
  const { t, language } = useI18n();

  const [repoUrl, setRepoUrl] = useState("");
  const [token, setToken] = useState("");
  const [branch, setBranch] = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [clonedPath, setClonedPath] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // URL 입력 시 프로젝트 이름/경로 자동 추론
  const handleUrlChange = (v: string) => {
    setRepoUrl(v);
    const name = v.trim().split("/").pop()?.replace(/\.git$/, "") ?? "";
    if (name) {
      setProjectName(name);
      setTargetPath(`~/Projects/${name}`);
    }
  };

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const handleImport = useCallback(async () => {
    async function finishWithProj(path: string) {
      try {
        const name = projectName.trim() || path.split(/[\\/]/).pop() || "gitlab-project";
        const proj = await createProject({
          name,
          project_path: path,
          core_goal: `${name} GitLab 프로젝트`,
          create_path_if_missing: false,
        });
        setStep("done");
        onComplete({ projectId: proj.id, projectPath: proj.project_path, branch: branch.trim() || "main" });
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setStep("error");
      }
    }

    const url = repoUrl.trim();
    if (!url || !token.trim()) return;
    setStep("cloning");
    setProgress(0);
    setErrorMsg("");
    try {
      const result = await cloneGitLabRepo({
        repo_url: url,
        token: token.trim(),
        branch: branch.trim() || undefined,
        target_path: targetPath.trim() || undefined,
      });

      if (result.already_exists) {
        setClonedPath(result.target_path);
        await finishWithProj(result.target_path);
        return;
      }

      const cloneId = result.clone_id!;
      setClonedPath(result.target_path);
      setProgress(5);

      pollRef.current = setInterval(async () => {
        try {
          const status = await getGitLabCloneStatus(cloneId);
          setProgress(status.progress ?? 0);
          if (status.status === "done") {
            stopPoll();
            setProgress(100);
            await finishWithProj(result.target_path);
          } else if (status.status === "error") {
            stopPoll();
            setErrorMsg(status.error ?? (language === "ko" ? "클론 실패" : "Clone failed"));
            setStep("error");
          }
        } catch { /* 무시 */ }
      }, 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }, [repoUrl, token, branch, targetPath, language, projectName, onComplete]);

  const canImport = repoUrl.trim().length > 0 && token.trim().length > 0;

  if (step === "done") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
        <span style={{ display: "inline-flex", color: "#30d158" }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
            <circle cx="22" cy="22" r="19" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.2" />
            <path d="M13 22L19 28L31 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-heading)" }}>
          {t({ ko: "임포트 완료!", en: "Import complete!", ja: "インポート完了!", zh: "导入完成!" })}
        </div>
        <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>{clonedPath}</div>
      </div>
    );
  }

  if (step === "cloning") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
        <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-heading)" }}>
          {t({ ko: "클론 중...", en: "Cloning...", ja: "クローン中...", zh: "正在克隆..." })}
        </div>
        <div style={{ width: "100%", maxWidth: 300, height: 6, borderRadius: 3, background: "var(--th-border)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "var(--th-accent)", transition: "width 0.4s ease", borderRadius: 3 }} />
        </div>
        <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>{progress}%</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "4px 0" }}>
      {step === "error" && (
        <div style={{ ...mono, fontSize: 11, color: "var(--th-danger-text)", padding: "10px 12px", background: "var(--th-danger-bg)", border: "1px solid var(--th-danger-border)", borderRadius: 6 }}>
          <strong>{t({ ko: "오류", en: "Error", ja: "エラー", zh: "错误" })}</strong>: {errorMsg}
        </div>
      )}

      <Field
        label={t({ ko: "리포지토리 URL", en: "Repository URL", ja: "リポジトリ URL", zh: "仓库 URL" })}
        hint={t({ ko: "예: https://gitlab.com/username/my-project", en: "e.g. https://gitlab.com/username/my-project", ja: "例: https://gitlab.com/username/my-project", zh: "例如: https://gitlab.com/username/my-project" })}
      >
        <TextInput
          value={repoUrl}
          onChange={handleUrlChange}
          placeholder="https://gitlab.com/username/repo"
        />
      </Field>

      <Field
        label={t({ ko: "Personal Access Token", en: "Personal Access Token", ja: "パーソナルアクセストークン", zh: "个人访问令牌" })}
        hint={t({ ko: "read_repository 스코프 필요 (Settings → Access Tokens)", en: "Requires read_repository scope (Settings → Access Tokens)", ja: "read_repositoryスコープが必要", zh: "需要 read_repository 权限" })}
      >
        <TextInput
          value={token}
          onChange={setToken}
          type="password"
          placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
        />
      </Field>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Field label={t({ ko: "브랜치", en: "Branch", ja: "ブランチ", zh: "分支" })} hint={t({ ko: "비워두면 기본 브랜치 사용", en: "Empty = default branch", ja: "空欄 = デフォルトブランチ", zh: "空 = 默认分支" })}>
            <TextInput value={branch} onChange={setBranch} placeholder="main" />
          </Field>
        </div>
        <div style={{ flex: 2 }}>
          <Field label={t({ ko: "저장 경로", en: "Target Path", ja: "保存先", zh: "保存路径" })}>
            <TextInput value={targetPath} onChange={setTargetPath} placeholder="~/Projects/my-project" />
          </Field>
        </div>
      </div>

      <Field label={t({ ko: "프로젝트 이름", en: "Project Name", ja: "プロジェクト名", zh: "项目名称" })}>
        <TextInput value={projectName} onChange={setProjectName} placeholder={t({ ko: "프로젝트 이름", en: "Project name", ja: "プロジェクト名", zh: "项目名称" })} />
      </Field>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ ...mono, fontSize: 11, padding: "7px 16px", border: "1px solid var(--th-border)", borderRadius: 6, background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}
        >
          {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={!canImport}
          style={{
            ...mono, fontSize: 12, fontWeight: 700, padding: "7px 20px", borderRadius: 6, border: "none",
            background: canImport ? "var(--th-accent)" : "rgba(245,158,11,0.2)",
            color: canImport ? "#000" : "var(--th-text-muted)",
            cursor: canImport ? "pointer" : "not-allowed",
          }}
        >
          {t({ ko: "임포트", en: "Import", ja: "インポート", zh: "导入" })}
        </button>
      </div>
    </div>
  );
}
