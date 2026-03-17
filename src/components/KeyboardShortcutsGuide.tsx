import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n";

interface KeyboardShortcutsGuideProps {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsGuide({ open, onClose }: KeyboardShortcutsGuideProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
  const border = "var(--th-border)";
  const muted = "var(--th-text-muted)";
  const accent = "var(--th-accent)";

  const sections = [
    {
      title: t({ ko: "전역 단축키", en: "Global Shortcuts", ja: "グローバルショートカット", zh: "全局快捷键" }),
      rows: [
        { keys: ["Ctrl", "Shift", "K"], desc: t({ ko: "커맨드 팔레트 열기", en: "Open command palette", ja: "コマンドパレットを開く", zh: "打开命令面板" }) },
        { keys: ["?"], desc: t({ ko: "이 단축키 가이드", en: "Show this shortcuts guide", ja: "このショートカットガイド", zh: "显示快捷键指南" }) },
      ],
    },
    {
      title: t({ ko: "g + 키 앱 창 토글 (vim 스타일)", en: "g + key Window Toggle (vim-style)", ja: "g + キーウィンドウ切替（vim スタイル）", zh: "g 前缀窗口切换（vim 风格）" }),
      rows: [
        { keys: ["g", "w"], desc: t({ ko: "Workflow 창 토글", en: "Toggle Workflow window", ja: "Workflowウィンドウ切替", zh: "切换 Workflow 窗口" }) },
        { keys: ["g", "l"], desc: t({ ko: "Library 창 토글", en: "Toggle Library window", ja: "Libraryウィンドウ切替", zh: "切换 Library 窗口" }) },
        { keys: ["g", "s"], desc: t({ ko: "Settings 창 토글", en: "Toggle Settings window", ja: "Settingsウィンドウ切替", zh: "切换 Settings 窗口" }) },
        { keys: ["g", "c"], desc: t({ ko: "Chat 창 토글", en: "Toggle Chat window", ja: "Chatウィンドウ切替", zh: "切换 Chat 窗口" }) },
        { keys: ["g", "a"], desc: t({ ko: "에이전트 설정 창 토글", en: "Toggle Agent Manager window", ja: "エージェント設定切替", zh: "切换代理管理窗口" }) },
        { keys: ["g", "e"], desc: t({ ko: "Agent CLI 창 토글", en: "Toggle Agent CLI window", ja: "Agent CLI切替", zh: "切换 Agent CLI 窗口" }) },
        { keys: ["g", "i"], desc: t({ ko: "Image Studio 창 토글", en: "Toggle Image Studio window", ja: "Image Studio切替", zh: "切换图像工作室窗口" }) },
      ],
    },
    {
      title: t({ ko: "커맨드 팔레트 내", en: "In Command Palette", ja: "コマンドパレット内", zh: "命令面板内" }),
      rows: [
        { keys: ["↑", "↓"], desc: t({ ko: "항목 이동", en: "Navigate items", ja: "項目移動", zh: "导航项目" }) },
        { keys: ["↵"], desc: t({ ko: "선택 / 실행", en: "Select / Execute", ja: "選択 / 実行", zh: "选择 / 执行" }) },
        { keys: ["Esc"], desc: t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" }) },
        { keys: ["N"], desc: t({ ko: "(빈 검색) 새 태스크", en: "(empty) New Task", ja: "(空) 新しいタスク", zh: "(空) 新建任务" }) },
        { keys: ["D"], desc: t({ ko: "(빈 검색) 대시보드", en: "(empty) Dashboard", ja: "(空) ダッシュボード", zh: "(空) 仪表板" }) },
        { keys: ["T"], desc: t({ ko: "(빈 검색) 태스크 보드", en: "(empty) Task Board", ja: "(空) タスクボード", zh: "(空) 任务板" }) },
        { keys: ["A"], desc: t({ ko: "(빈 검색) 에이전트", en: "(empty) Agents", ja: "(空) エージェント", zh: "(空) 代理" }) },
        { keys: ["S"], desc: t({ ko: "(빈 검색) 스킬", en: "(empty) Skills", ja: "(空) スキル", zh: "(空) 技能" }) },
        { keys: ["M"], desc: t({ ko: "(빈 검색) 메모리", en: "(empty) Memory", ja: "(空) メモリー", zh: "(空) 记忆" }) },
        { keys: [","], desc: t({ ko: "(빈 검색) 설정", en: "(empty) Settings", ja: "(空) 設定", zh: "(空) 设置" }) },
      ],
    },
    {
      title: t({ ko: "태스크 보드", en: "Task Board", ja: "タスクボード", zh: "任务板" }),
      rows: [
        { keys: ["Esc"], desc: t({ ko: "모달 / 팝업 닫기", en: "Close modal / popup", ja: "モーダルを閉じる", zh: "关闭模态框" }) },
      ],
    },
  ];

  return createPortal(
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10200,
        background: "var(--th-modal-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        style={{
          width: "min(520px, 92vw)",
          maxHeight: "80vh",
          background: "var(--th-bg-elevated)",
          border: `1px solid ${border}`,
          borderRadius: 10,
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* macOS 스타일 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            borderBottom: `1px solid ${border}`,
            background: "var(--th-bg-panel)",
            flexShrink: 0,
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
          }}
        >
          <div style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="h-3 w-3 flex-shrink-0 rounded-full border-0 transition-opacity hover:opacity-90"
              style={{ background: "#ff5f57" }}
            />
            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ffbd2e" }} />
            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#27c93f" }} />
          </div>
          <div style={{ width: 1, height: 22, background: border, flexShrink: 0 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ ...mono, fontSize: "11px", color: accent, fontWeight: 700 }}>?</span>
            <span style={{ ...mono, fontSize: "12px", color: "var(--th-text-heading)", fontWeight: 600 }}>
              {t({ ko: "키보드 단축키", en: "Keyboard Shortcuts", ja: "キーボードショートカット", zh: "键盘快捷键" })}
            </span>
          </div>
          <span style={{ ...mono, fontSize: "10px", color: muted, marginLeft: "auto", flexShrink: 0 }}>Esc</span>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {sections.map((section) => (
            <div key={section.title} style={{ padding: "12px 0" }}>
              <div style={{ ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: muted, padding: "0 18px 8px", textTransform: "uppercase" }}>
                {section.title}
              </div>
              {section.rows.map(({ keys, desc }) => (
                <div
                  key={keys.join("+")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "5px 18px",
                    gap: 16,
                  }}
                  className="hover:bg-[var(--th-hover-bg)]"
                >
                  <span style={{ ...mono, fontSize: "11px", color: "var(--th-text-secondary)" }}>{desc}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    {keys.map((key, i) => (
                      <span key={i}>
                        <kbd style={{
                          ...mono,
                          fontSize: "10px",
                          color: "var(--th-text-secondary)",
                          background: "var(--th-bg-base)",
                          border: `1px solid ${border}`,
                          borderRadius: 4,
                          padding: "2px 6px",
                          boxShadow: "0 1px 0 var(--th-border)",
                          display: "inline-block",
                        }}>
                          {key}
                        </kbd>
                        {i < keys.length - 1 && (
                          <span style={{ ...mono, fontSize: "10px", color: muted, margin: "0 2px" }}>+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
