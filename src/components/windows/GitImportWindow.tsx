import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import { useToast } from "../ui/Toast";
import ManualPathPickerDialog from "../project-manager/ManualPathPickerDialog";
import { useProjectManagerPathTools } from "../project-manager/useProjectManagerPathTools";
import { useProjectStore } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import { getProjectDetail, createProject } from "../../api/organization-projects";
import { getGithubTrending, type TrendingRepo } from "../../api/github-trending";
import { cloneGitHubRepo, getCloneStatus } from "../../api/providers-reports-github";
import type { I18nContextValue } from "../../i18n";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

type Since = "daily" | "weekly" | "monthly";
type CloneState = { status: "idle" | "cloning" | "done" | "error"; progress: number; error?: string };
type T = I18nContextValue["t"];

function normalizeGithubRepoKey(fullName: string): string {
  return fullName
    .trim()
    .split("/")
    .filter(Boolean)
    .map((p) => p.toLowerCase())
    .join("/");
}

const LANG_OPTIONS = [
  { value: "", ko: "전체", en: "All", ja: "すべて", zh: "全部" },
  { value: "python", ko: "Python", en: "Python", ja: "Python", zh: "Python" },
  { value: "typescript", ko: "TypeScript", en: "TypeScript", ja: "TypeScript", zh: "TypeScript" },
  { value: "javascript", ko: "JavaScript", en: "JavaScript", ja: "JavaScript", zh: "JavaScript" },
  { value: "go", ko: "Go", en: "Go", ja: "Go", zh: "Go" },
  { value: "rust", ko: "Rust", en: "Rust", ja: "Rust", zh: "Rust" },
  { value: "java", ko: "Java", en: "Java", ja: "Java", zh: "Java" },
  { value: "c++", ko: "C++", en: "C++", ja: "C++", zh: "C++" },
  { value: "c#", ko: "C#", en: "C#", ja: "C#", zh: "C#" },
  { value: "swift", ko: "Swift", en: "Swift", ja: "Swift", zh: "Swift" },
  { value: "kotlin", ko: "Kotlin", en: "Kotlin", ja: "Kotlin", zh: "Kotlin" },
];

function sinceOptions(t: T): Array<{ value: Since; label: string }> {
  return [
    { value: "daily", label: t({ ko: "오늘", en: "Today", ja: "今日", zh: "今天" }) },
    { value: "weekly", label: t({ ko: "이번 주", en: "This Week", ja: "今週", zh: "本周" }) },
    { value: "monthly", label: t({ ko: "이번 달", en: "This Month", ja: "今月", zh: "本月" }) },
  ];
}

/* ── Icons ─────────────────────────────────────────────── */

function StarIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

/* ── Trending Card ─────────────────────────────────────── */

function TrendingCard({
  repo,
  cloneState,
  onDownload,
  installedProjectId,
  onSelectInstalled,
  t,
}: {
  repo: TrendingRepo;
  cloneState: CloneState;
  onDownload: () => void;
  installedProjectId: string | null;
  onSelectInstalled: () => void;
  t: T;
}) {
  const isCloning = cloneState.status === "cloning";
  const isDone = cloneState.status === "done";
  const isInstalled = Boolean(installedProjectId) && cloneState.status === "idle";

  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: 16,
        padding: "14px 16px",
        background: "var(--th-bg-elevated)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--th-border-strong)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--th-border)"; }}
    >
      {/* top row: stars + trend */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#F59E0B" }}>
          <StarIcon size={12} /> {formatNum(repo.stars)}
        </span>
        {repo.stars_today > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--th-success)", fontSize: 10, fontWeight: 600 }}>
            <TrendUpIcon /> +{formatNum(repo.stars_today)}
          </span>
        )}
        {repo.language && (
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, color: "var(--th-text-muted)", fontSize: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: repo.language_color ?? "var(--th-text-muted)", flexShrink: 0 }} />
            {repo.language}
          </span>
        )}
      </div>

      {/* name */}
      <div>
        <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-primary)", lineHeight: 1.2 }}>
          {repo.name}
        </div>
        <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 1 }}>
          {repo.owner}
        </div>
      </div>

      {/* description */}
      {repo.description && (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: "var(--th-text-secondary)",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            flex: 1,
          }}
        >
          {repo.description}
        </div>
      )}

      {/* download button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto", gap: 8 }}>
        {isDone ? (
          <span style={{ ...mono, fontSize: 10, fontWeight: 600, color: "var(--th-success)", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" })}
          </span>
        ) : isInstalled ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "flex-end" }}>
            <span style={{ ...mono, fontSize: 10, fontWeight: 600, color: "var(--th-text-muted)" }}>
              {t({ ko: "설치됨", en: "Installed", ja: "インストール済み", zh: "已安装" })}
            </span>
            <button
              type="button"
              onClick={onSelectInstalled}
              style={{
                ...mono, fontSize: 10, fontWeight: 700, padding: "5px 12px", borderRadius: 10,
                border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)",
                cursor: "pointer",
              }}
            >
              {t({ ko: "프로젝트로 이동", en: "Open project", ja: "プロジェクトへ", zh: "打开项目" })}
            </button>
          </div>
        ) : isCloning ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--th-border)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${cloneState.progress}%`, background: "var(--th-accent)", transition: "width 0.3s", borderRadius: 2 }} />
            </div>
            <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0 }}>{cloneState.progress}%</span>
          </div>
        ) : cloneState.status === "error" ? (
          <button
            type="button"
            onClick={onDownload}
            style={{
              ...mono, fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 10,
              border: "1px solid #FECACA", background: "var(--th-danger-bg)", color: "var(--th-danger-text)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {t({ ko: "재시도", en: "Retry", ja: "再試行", zh: "重试" })}
          </button>
        ) : (
          <button
            type="button"
            onClick={onDownload}
            style={{
              ...mono, fontSize: 10, fontWeight: 700, padding: "5px 12px", borderRadius: 10,
              border: "none", background: "var(--th-accent)", color: "var(--th-bg-elevated)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              transition: "opacity 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            <DownloadIcon /> {t({ ko: "다운로드", en: "Download", ja: "ダウンロード", zh: "下载" })}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main Window ───────────────────────────────────────── */

export default function GitImportWindow() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { projects, setProjects, setCurrentProjectId } = useProjectStore();
  const { closeWindow, setNewlyInstalledProjectId } = useUiStore();

  const installedGithubRepoToProjectId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) {
      const gr = p.github_repo?.trim();
      if (gr) m.set(normalizeGithubRepoKey(gr), p.id);
    }
    return m;
  }, [projects]);

  // trending state
  const [repos, setRepos] = useState<TrendingRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [since, setSince] = useState<Since>("daily");
  const [language, setLanguage] = useState("");
  const [directUrl, setDirectUrl] = useState("");
  const [downloadPath, setDownloadPath] = useState("~/Projects");
  const [cloneStates, setCloneStates] = useState<Record<string, CloneState>>({});
  const pathTools = useProjectManagerPathTools({ t, projectPath: downloadPath, pathToolsVisible: true });
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // fetch trending
  useEffect(() => {
    setLoading(true);
    getGithubTrending({ since, language: language || undefined })
      .then((r) => setRepos(r.repos))
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, [since, language]);

  // cleanup polls
  useEffect(() => {
    const polls = pollRefs.current;
    return () => {
      Object.values(polls).forEach(clearInterval);
    };
  }, []);

  const handleComplete = useCallback(async (projectId: string) => {
    try {
      const detail = await getProjectDetail(projectId);
      setProjects((prev) => {
        const exists = prev.some((p) => p.id === projectId);
        return exists ? prev.map((p) => p.id === projectId ? detail.project : p) : [...prev, detail.project];
      });
      setNewlyInstalledProjectId(projectId);
      closeWindow("repo-store");
    } catch { /* ignore */ }
  }, [closeWindow, setNewlyInstalledProjectId, setProjects]);

  const startDownload = useCallback(async (repo: TrendingRepo) => {
    const repoKey = normalizeGithubRepoKey(repo.full_name);
    if (installedGithubRepoToProjectId.has(repoKey)) {
      showToast(
        t({
          ko: "이미 프로젝트에 등록된 저장소입니다",
          en: "This repository is already in your projects",
          ja: "このリポジトリは既にプロジェクトに登録されています",
          zh: "该仓库已在项目中",
        }),
        "info",
      );
      return;
    }
    const key = repo.full_name;
    setCloneStates((s) => ({ ...s, [key]: { status: "cloning", progress: 0 } }));

    try {
      const targetPath = `${downloadPath}/${repo.name}`;
      const result = await cloneGitHubRepo({ owner: repo.owner, repo: repo.name, target_path: targetPath });

      if (result.already_exists) {
        const project = await createProject({
          name: repo.name,
          project_path: result.target_path,
          core_goal: repo.description ?? `GitHub: ${repo.full_name}`,
          github_repo: repo.full_name,
          create_path_if_missing: false,
          project_type: "app",
        });
        setCloneStates((s) => ({ ...s, [key]: { status: "done", progress: 100 } }));
        await handleComplete(project.id);
        return;
      }

      if (!result.clone_id) {
        setCloneStates((s) => ({ ...s, [key]: { status: "error", progress: 0, error: "Clone initialization failed" } }));
        return;
      }

      pollRefs.current[key] = setInterval(async () => {
          try {
            const status = await getCloneStatus(result.clone_id!);
            setCloneStates((s) => ({ ...s, [key]: { status: "cloning", progress: status.progress } }));

            if (status.status === "done") {
              clearInterval(pollRefs.current[key]);
              delete pollRefs.current[key];
              const project = await createProject({
                name: repo.name,
                project_path: result.target_path,
                core_goal: repo.description ?? `GitHub: ${repo.full_name}`,
                github_repo: repo.full_name,
                create_path_if_missing: false,
                project_type: "app",
              });
              setCloneStates((s) => ({ ...s, [key]: { status: "done", progress: 100 } }));
              await handleComplete(project.id);
            } else if (status.status === "error") {
              clearInterval(pollRefs.current[key]);
              delete pollRefs.current[key];
              setCloneStates((s) => ({ ...s, [key]: { status: "error", progress: 0, error: status.error ?? "Clone failed" } }));
            }
          } catch { /* continue polling */ }
        }, 1500);
    } catch (err) {
      setCloneStates((s) => ({ ...s, [key]: { status: "error", progress: 0, error: err instanceof Error ? err.message : String(err) } }));
    }
  }, [downloadPath, handleComplete, installedGithubRepoToProjectId, showToast, t]);

  const handleDirectDownload = useCallback(() => {
    const input = directUrl.trim();
    if (!input) return;
    const match = input.match(/(?:(?:https?:\/\/)?github\.com\/)?([^/\s]+)\/([^/\s#?]+)/);
    if (!match) return;
    const [, owner, rawRepo] = match;
    const repoName = rawRepo.replace(/\.git$/, "");
    startDownload({
      rank: 0, owner, name: repoName, full_name: `${owner}/${repoName}`,
      url: `https://github.com/${owner}/${repoName}`, description: null,
      language: null, language_color: null, stars: 0, forks: 0, stars_today: 0, since_label: "",
    });
    setDirectUrl("");
  }, [directUrl, startDownload]);

  const selectStyle: React.CSSProperties = {
    ...mono, fontSize: 10, padding: "4px 6px", borderRadius: 10,
    border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)",
    color: "var(--th-text-primary)", outline: "none", cursor: "pointer",
  };

  const sinceOpts = sinceOptions(t);

  return (
    <AppWindow
      windowType="repo-store"
      title="Repo Store"
      emoji={<DownloadIcon />}
      defaultWidth={820}
      defaultHeight={620}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* URL input bar */}
        <div style={{
          padding: "10px 16px", borderBottom: "1px solid #E5E7EB",
          display: "flex", gap: 8, alignItems: "center", flexShrink: 0,
        }}>
          <span style={{ color: "var(--th-text-muted)", flexShrink: 0 }}><SearchIcon /></span>
          <input
            value={directUrl}
            onChange={(e) => setDirectUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleDirectDownload(); }}
            placeholder={t({ ko: "owner/repo 또는 GitHub URL 입력...", en: "owner/repo or GitHub URL...", ja: "owner/repo または GitHub URL...", zh: "owner/repo 或 GitHub URL..." })}
            style={{
              ...mono, flex: 1, fontSize: 12, padding: "7px 10px", borderRadius: 10,
              border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)",
              color: "var(--th-text-primary)", outline: "none",
            }}
          />
          <button
            type="button"
            onClick={handleDirectDownload}
            disabled={!directUrl.trim()}
            style={{
              ...mono, fontSize: 11, fontWeight: 700, padding: "7px 16px", borderRadius: 10,
              border: "none", background: directUrl.trim() ? "var(--th-accent)" : "rgba(59,130,246,0.2)",
              color: directUrl.trim() ? "var(--th-bg-elevated)" : "var(--th-text-muted)",
              cursor: directUrl.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <DownloadIcon /> {t({ ko: "다운로드", en: "Download", ja: "ダウンロード", zh: "下载" })}
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto" }}>
            <div style={{ padding: 16 }}>
              {/* Download path + Filters */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: "var(--th-text-muted)", flexShrink: 0, letterSpacing: "0.06em" }}>
                  {t({ ko: "저장 위치", en: "PATH", ja: "保存先", zh: "路径" })}
                </span>
                <input
                  value={downloadPath}
                  onChange={(e) => setDownloadPath(e.target.value)}
                  style={{
                    ...mono, flex: 1, fontSize: 11, padding: "4px 8px", borderRadius: 10,
                    border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)",
                    color: "var(--th-text-primary)", outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    pathTools.setManualPathPickerOpen(true);
                    await pathTools.loadManualPathEntries(downloadPath || undefined);
                  }}
                  style={{
                    ...mono, fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 10,
                    border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)",
                    color: "var(--th-text-primary)", cursor: "pointer", flexShrink: 0,
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  {t({ ko: "탐색", en: "Browse", ja: "参照", zh: "浏览" })}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
                <select value={since} onChange={(e) => setSince(e.target.value as Since)} style={selectStyle}>
                  {sinceOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} style={selectStyle}>
                  {LANG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t({ ko: o.ko, en: o.en, ja: o.ja, zh: o.zh })}</option>)}
                </select>
                {loading && (
                  <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginLeft: "auto" }}>
                    {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
                  </span>
                )}
              </div>

              {/* Card grid */}
              {repos.length === 0 && !loading && (
                <div style={{ ...mono, fontSize: 12, color: "var(--th-text-muted)", textAlign: "center", padding: "40px 0" }}>
                  {t({ ko: "트렌딩 데이터를 불러올 수 없습니다", en: "Could not load trending data", ja: "トレンドデータを読み込めません", zh: "无法加载趋势数据" })}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {repos.map((repo) => {
                  const pid = installedGithubRepoToProjectId.get(normalizeGithubRepoKey(repo.full_name)) ?? null;
                  return (
                    <TrendingCard
                      key={repo.full_name}
                      repo={repo}
                      cloneState={cloneStates[repo.full_name] ?? { status: "idle", progress: 0 }}
                      onDownload={() => startDownload(repo)}
                      installedProjectId={pid}
                      onSelectInstalled={() => {
                        if (pid) {
                          setCurrentProjectId(pid);
                          closeWindow("repo-store");
                        }
                      }}
                      t={t}
                    />
                  );
                })}
              </div>
            </div>
        </div>
      </div>

      {/* Path Picker Dialog */}
      {pathTools.manualPathPickerOpen && (
        <ManualPathPickerDialog
          open
          t={t}
          manualPathCurrent={pathTools.manualPathCurrent}
          manualPathParent={pathTools.manualPathParent}
          manualPathEntries={pathTools.manualPathEntries}
          manualPathLoading={pathTools.manualPathLoading}
          manualPathError={pathTools.manualPathError}
          manualPathTruncated={pathTools.manualPathTruncated}
          onClose={() => pathTools.setManualPathPickerOpen(false)}
          onLoadEntries={pathTools.loadManualPathEntries}
          onSelectCurrent={() => {
            if (pathTools.manualPathCurrent) setDownloadPath(pathTools.manualPathCurrent);
            pathTools.setManualPathPickerOpen(false);
          }}
        />
      )}
    </AppWindow>
  );
}
