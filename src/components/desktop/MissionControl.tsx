import { useEffect, type ReactNode } from "react";
import type { WindowType } from "../../app/types";
import { useI18n } from "../../i18n";

const mono = "var(--th-font-mono)";

const FADE_STYLE = `
@keyframes mcFadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
`;

interface MissionControlProps {
  openWindows: Set<WindowType>;
  onClose: () => void;
  onFocusWindow: (w: WindowType) => void;
}

export default function MissionControl({ openWindows, onClose, onFocusWindow }: MissionControlProps) {
  const { t } = useI18n();

  const S = { w: 22, h: 22, v: "0 0 24 24", fill: "none" as const, stroke: "currentColor" as const, strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const WINDOW_META: Record<WindowType, { icon: ReactNode; label: string }> = {
    workflow:        { icon: <svg {...S}><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, label: t({ ko: "워크플로",        en: "Workflow",       ja: "ワークフロー",     zh: "工作流" }) },
    library:         { icon: <svg {...S}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>, label: t({ ko: "라이브러리",      en: "Library",        ja: "ライブラリ",       zh: "库" }) },
    settings:        { icon: <svg {...S}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, label: t({ ko: "설정",            en: "Settings",       ja: "設定",            zh: "设置" }) },
    chat:            { icon: <svg {...S}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: t({ ko: "채팅",            en: "Chat",           ja: "チャット",         zh: "聊天" }) },
    "agent-manager": { icon: <svg {...S}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: t({ ko: "에이전트 설정",   en: "Agent Manager",  ja: "エージェント設定", zh: "代理设置" }) },
    cli:             { icon: <svg {...S}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>, label: t({ ko: "Agent CLI",       en: "CLI",            ja: "Agent CLI",       zh: "Agent CLI" }) },
    reports:         { icon: <svg {...S}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, label: t({ ko: "보고서",          en: "Reports",        ja: "レポート",         zh: "报告" }) },
    tasks:           { icon: <svg {...S}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>, label: t({ ko: "태스크 보드",     en: "Board",          ja: "タスクボード",     zh: "任务板" }) },
    "create-task":   { icon: <svg {...S}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>, label: t({ ko: "새 태스크",       en: "New Task",       ja: "新しいタスク",     zh: "新任务" }) },
    "llm-guide":     { icon: <svg {...S}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>, label: t({ ko: "LLM 가이드",     en: "LLM Guide",      ja: "LLMガイド",        zh: "LLM指南" }) },
    synapse:         { icon: <svg {...S}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>, label: t({ ko: "시냅스",          en: "Synapse",        ja: "シナプス",         zh: "知识库" }) },
    "image-studio":  { icon: <svg {...S}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, label: t({ ko: "이미지 스튜디오", en: "Image Studio",   ja: "イメージスタジオ", zh: "图像工作室" }) },
    folder:          { icon: <svg {...S}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>, label: t({ ko: "폴더",            en: "Folder",         ja: "フォルダ",         zh: "文件夹" }) },
    "create-agent":      { icon: <svg {...S}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>, label: t({ ko: "신규 직원 채용",    en: "Hire Agent",     ja: "エージェント採用", zh: "招聘员工" }) },
    "create-department": { icon: <svg {...S}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>, label: t({ ko: "신규 전문 분야 추가",    en: "Add Specialty", ja: "専門分野追加",         zh: "添加专业领域" }) },
    "library-guide":     { icon: <svg {...S}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>, label: t({ ko: "라이브러리 가이드", en: "Library Guide",  ja: "ライブラリガイド", zh: "库指南" }) },
    "user-guide":        { icon: <svg {...S}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>, label: t({ ko: "사용자 가이드",     en: "User Guide",     ja: "ユーザーガイド",   zh: "用户指南" }) },
    "file-tree":         { icon: <svg {...S}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>, label: t({ ko: "파일 탐색기",       en: "File Explorer",  ja: "ファイルエクスプローラー", zh: "文件管理" }) },
    "alerts":            { icon: <svg {...S}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, label: t({ ko: "알림",             en: "Alerts",         ja: "アラート",              zh: "警报" }) },
    "cli-usage":         { icon: <svg {...S}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, label: t({ ko: "CLI 비용",         en: "CLI Cost",       ja: "CLIコスト",             zh: "CLI成本" }) },
    "local-llm":         { icon: <svg {...S}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>, label: t({ ko: "로컬 LLM",         en: "Local LLM",      ja: "ローカルLLM",            zh: "本地LLM" }) },
    "repo-store":        { icon: <svg {...S}><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>, label: t({ ko: "Repo Store",      en: "Repo Store",     ja: "Repo Store",                  zh: "Repo Store" }) },
    "app-runner":        { icon: <svg {...S}><polygon points="5 3 19 12 5 21 5 3"/></svg>, label: t({ ko: "App Runner", en: "App Runner", ja: "App Runner", zh: "App Runner" }) },
    "dashboard":         { icon: <svg {...S}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>, label: t({ ko: "대시보드",          en: "Dashboard",      ja: "ダッシュボード",              zh: "控制台" }) },
    "project-create":    { icon: <svg {...S}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>, label: t({ ko: "프로젝트 생성",     en: "New Project",    ja: "新規プロジェクト",               zh: "新建项目" }) },
    "decision-inbox":    { icon: <svg {...S}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, label: t({ ko: "의사결정",           en: "Decision Inbox", ja: "意思決定",                        zh: "决策收件箱" }) },
    "folder-browser":    { icon: <svg {...S}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,                        label: t({ ko: "폴더 탐색",           en: "Folder Browser",  ja: "フォルダ閲覧",                    zh: "文件夹浏览" }) },
    "pm-activity":       { icon: <svg {...S}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>, label: t({ ko: "PM 활동", en: "PM Activity", ja: "PMアクティビティ", zh: "PM活动" }) },
    "learn-skill":       { icon: <svg {...S}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>, label: t({ ko: "스킬 학습", en: "Skill Learning", ja: "スキル学習", zh: "技能学习" }) },
    "learn-rule":        { icon: <svg {...S}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label: t({ ko: "룰 학습", en: "Rule Learning", ja: "ルール学習", zh: "规则学习" }) },
    "learn-memory":      { icon: <svg {...S}><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/><line x1="9" y1="21" x2="15" y2="21"/></svg>, label: t({ ko: "메모리 학습", en: "Memory Learning", ja: "メモリ学習", zh: "记忆学习" }) },
    "learn-hook":        { icon: <svg {...S}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, label: t({ ko: "훅 학습", en: "Hook Learning", ja: "フック学習", zh: "钩子学习" }) },
    "chat-editor":       { icon: <svg {...S}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, label: "Chat Editor" },
    "channel-guide":     { icon: <svg {...S}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>, label: "Channel Guide" },
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const windowList = Array.from(openWindows);

  return (
    <>
      <style>{FADE_STYLE}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 3000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "60px 40px 40px",
          animation: "mcFadeIn 0.2s ease-out",
        }}
        onClick={onClose}
      >
        {/* 상단 힌트 */}
        <div
          style={{
            fontFamily: mono,
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            marginBottom: 40,
            letterSpacing: "0.1em",
          }}
        >
          MISSION CONTROL — {t({ ko: "ESC 또는 클릭으로 닫기", en: "Press ESC or click to close", ja: "ESCまたはクリックで閉じる", zh: "按ESC或点击关闭" })}
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          style={{ width: "100%", maxWidth: 900 }}
        >
          {/* 열린 창 */}
          {windowList.length > 0 && (
            <Section title={t({ ko: "열린 창", en: "Open Windows", ja: "開いているウィンドウ", zh: "打开的窗口" })}>
              {windowList.map((w) => {
                const meta = WINDOW_META[w];
                return (
                  <Card
                    key={w}
                    icon={meta.icon}
                    label={meta.label}
                    onClick={() => { onFocusWindow(w); onClose(); }}
                  />
                );
              })}
            </Section>
          )}

          {/* 아무것도 없을 때 */}
          {windowList.length === 0 && (
            <div
              style={{
                textAlign: "center",
                fontFamily: mono,
                fontSize: 13,
                color: "rgba(255,255,255,0.3)",
                marginTop: 40,
              }}
            >
              {t({ ko: "열린 창이 없습니다", en: "No open windows", ja: "ウィンドウがありません", zh: "没有打开的窗口" })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          fontFamily: mono,
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.12em",
          marginBottom: 14,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}

function Card({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 128,
        height: 104,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        cursor: "pointer",
        transition: "background 0.15s, transform 0.12s, box-shadow 0.15s",
        fontFamily: mono,
        boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = "rgba(245,158,11,0.2)";
        el.style.borderColor = "rgba(245,158,11,0.4)";
        el.style.transform = "scale(1.06) translateY(-2px)";
        el.style.boxShadow = "0 8px 24px rgba(245,158,11,0.25)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = "rgba(255,255,255,0.07)";
        el.style.borderColor = "rgba(255,255,255,0.12)";
        el.style.transform = "scale(1) translateY(0)";
        el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.2)";
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: "rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.75)",
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", letterSpacing: "0.04em", maxWidth: 108, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}
