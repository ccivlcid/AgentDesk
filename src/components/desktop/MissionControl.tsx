import { useEffect } from "react";
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

  const WINDOW_META: Record<WindowType, { emoji: string; label: string }> = {
    workflow:        { emoji: "⚡",  label: t({ ko: "워크플로",        en: "Workflow",       ja: "ワークフロー",     zh: "工作流" }) },
    library:         { emoji: "📚",  label: t({ ko: "라이브러리",      en: "Library",        ja: "ライブラリ",       zh: "库" }) },
    settings:        { emoji: "⚙️", label: t({ ko: "설정",            en: "Settings",       ja: "設定",            zh: "设置" }) },
    chat:            { emoji: "💬",  label: t({ ko: "채팅",            en: "Chat",           ja: "チャット",         zh: "聊天" }) },
    "agent-manager": { emoji: "👤",  label: t({ ko: "에이전트 설정",   en: "Agent Manager",  ja: "エージェント設定", zh: "代理设置" }) },
    cli:             { emoji: ">_", label: t({ ko: "Agent CLI",       en: "CLI",            ja: "Agent CLI",       zh: "Agent CLI" }) },
    reports:         { emoji: "📊",  label: t({ ko: "보고서",          en: "Reports",        ja: "レポート",         zh: "报告" }) },
    tasks:           { emoji: "▦",  label: t({ ko: "태스크 보드",     en: "Board",          ja: "タスクボード",     zh: "任务板" }) },
    "create-task":   { emoji: "✚",  label: t({ ko: "새 태스크",       en: "New Task",       ja: "新しいタスク",     zh: "新任务" }) },
    "llm-guide":     { emoji: "📖",  label: t({ ko: "LLM 가이드",     en: "LLM Guide",      ja: "LLMガイド",        zh: "LLM指南" }) },
    synapse:         { emoji: "⇄",  label: t({ ko: "시냅스",          en: "Synapse",        ja: "シナプス",         zh: "知识库" }) },
    "image-studio":  { emoji: "🖼",  label: t({ ko: "이미지 스튜디오", en: "Image Studio",   ja: "イメージスタジオ", zh: "图像工作室" }) },
    folder:          { emoji: "📁",  label: t({ ko: "폴더",            en: "Folder",         ja: "フォルダ",         zh: "文件夹" }) },
    "create-agent":      { emoji: "👤", label: t({ ko: "신규 직원 채용",    en: "Hire Agent",     ja: "エージェント採用", zh: "招聘员工" }) },
    "create-department": { emoji: "🏢", label: t({ ko: "신규 부서 추가",    en: "Add Department", ja: "部署追加",         zh: "添加部门" }) },
    "library-guide":     { emoji: "📚", label: t({ ko: "라이브러리 가이드", en: "Library Guide",  ja: "ライブラリガイド", zh: "库指南" }) },
    "user-guide":        { emoji: "📖", label: t({ ko: "사용자 가이드",     en: "User Guide",     ja: "ユーザーガイド",   zh: "用户指南" }) },
    "file-tree":         { emoji: "📁", label: t({ ko: "파일 탐색기",       en: "File Explorer",  ja: "ファイルエクスプローラー", zh: "文件管理" }) },
    "alerts":            { emoji: "🔔", label: t({ ko: "알림",             en: "Alerts",         ja: "アラート",              zh: "警报" }) },
    "cli-usage":         { emoji: "💰", label: t({ ko: "CLI 비용",         en: "CLI Cost",       ja: "CLIコスト",             zh: "CLI成本" }) },
    "local-llm":         { emoji: "🧠", label: t({ ko: "로컬 LLM",         en: "Local LLM",      ja: "ローカルLLM",            zh: "本地LLM" }) },
    "feature-builder":   { emoji: "✦",  label: t({ ko: "새 기능 만들기",   en: "New Feature",    ja: "新機能作成",              zh: "新建功能" }) },
    "flow-graph":        { emoji: "🕸️", label: t({ ko: "에이전트 그래프",  en: "Agent Graph",    ja: "エージェントグラフ",        zh: "代理图" }) },
    "git-import":        { emoji: "⬆️", label: t({ ko: "Git 가져오기",     en: "Git Import",     ja: "Gitインポート",              zh: "Git导入" }) },
    "dashboard":         { emoji: "◈",  label: t({ ko: "대시보드",          en: "Dashboard",      ja: "ダッシュボード",              zh: "控制台" }) },
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
                    emoji={meta.emoji}
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

function Card({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 110,
        height: 90,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: "pointer",
        transition: "background 0.15s, transform 0.1s",
        fontFamily: mono,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.22)";
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.75)" }}>{label}</span>
    </button>
  );
}
