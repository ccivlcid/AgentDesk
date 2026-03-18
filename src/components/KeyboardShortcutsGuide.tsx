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
      title: t({ ko: "전역", en: "Global", ja: "グローバル", zh: "全局" }),
      rows: [
        { keys: ["Ctrl", "Shift", "K"], desc: t({ ko: "커맨드 팔레트", en: "Command Palette", ja: "コマンドパレット", zh: "命令面板" }) },
        { keys: ["Ctrl", "↑"], desc: t({ ko: "Mission Control", en: "Mission Control", ja: "ミッションコントロール", zh: "Mission Control" }) },
        { keys: ["?"], desc: t({ ko: "단축키 가이드", en: "Shortcuts guide", ja: "ショートカットガイド", zh: "快捷键指南" }) },
      ],
    },
    {
      title: t({ ko: "창 관리", en: "Window Management", ja: "ウィンドウ管理", zh: "窗口管理" }),
      rows: [
        { keys: ["Ctrl", "W"], desc: t({ ko: "현재 창 닫기", en: "Close focused window", ja: "ウィンドウを閉じる", zh: "关闭当前窗口" }) },
        { keys: ["—"], desc: t({ ko: "노란 버튼 — 최소화 / 타이틀바 더블클릭", en: "Yellow button or double-click titlebar — Minimize", ja: "黄ボタン or タイトルバーダブルクリック — 最小化", zh: "黄色按钮 或 双击标题栏 — 最小化" }) },
        { keys: ["—"], desc: t({ ko: "초록 버튼 — 최대화 / 복원", en: "Green button — Maximize / Restore", ja: "緑ボタン — 最大化 / 復元", zh: "绿色按钮 — 最大化 / 还原" }) },
      ],
    },
    {
      title: t({ ko: "바탕화면 아이콘", en: "Desktop Icons", ja: "デスクトップアイコン", zh: "桌面图标" }),
      rows: [
        { keys: ["클릭"], desc: t({ ko: "아이콘 선택", en: "Select icon", ja: "アイコンを選択", zh: "选择图标" }) },
        { keys: ["드래그"], desc: t({ ko: "러버밴드 다중 선택", en: "Rubber band multi-select", ja: "ラバーバンド複数選択", zh: "框选多个图标" }) },
        { keys: ["Enter"], desc: t({ ko: "선택된 프로젝트 열기", en: "Open selected project", ja: "選択プロジェクトを開く", zh: "打开选中项目" }) },
        { keys: ["Delete"], desc: t({ ko: "선택된 아이콘 삭제", en: "Delete selected icon(s)", ja: "選択アイコンを削除", zh: "删除选中图标" }) },
        { keys: ["F2"], desc: t({ ko: "선택된 아이콘 이름 변경", en: "Rename selected icon", ja: "選択アイコンの名前変更", zh: "重命名选中图标" }) },
        { keys: ["Space"], desc: t({ ko: "Quick Look (프로젝트 미리보기)", en: "Quick Look preview", ja: "クイックルック", zh: "快速预览" }) },
        { keys: ["더블클릭"], desc: t({ ko: "아이콘 이름 변경", en: "Rename icon", ja: "アイコン名変更", zh: "重命名图标" }) },
        { keys: ["600ms 꾹"], desc: t({ ko: "Jiggle Mode — 아이콘 삭제 모드", en: "Jiggle Mode — delete mode", ja: "Jiggleモード", zh: "Jiggle模式（删除模式）" }) },
        { keys: ["Esc"], desc: t({ ko: "Jiggle Mode 해제", en: "Exit Jiggle Mode", ja: "Jiggleモード解除", zh: "退出Jiggle模式" }) },
      ],
    },
    {
      title: t({ ko: "앱 창 열기 (g + 키)", en: "Open Windows (g + key)", ja: "ウィンドウを開く (g + キー)", zh: "打开窗口 (g + 键)" }),
      rows: [
        { keys: ["g", "w"], desc: "Workflow" },
        { keys: ["g", "l"], desc: "Library" },
        { keys: ["g", "s"], desc: "Settings" },
        { keys: ["g", "c"], desc: "Chat" },
        { keys: ["g", "a"], desc: t({ ko: "에이전트 설정", en: "Agent Manager", ja: "エージェント設定", zh: "代理管理" }) },
        { keys: ["g", "e"], desc: "Agent CLI" },
        { keys: ["g", "i"], desc: "Image Studio" },
      ],
    },
    {
      title: t({ ko: "커맨드 팔레트 내", en: "In Command Palette", ja: "コマンドパレット内", zh: "命令面板内" }),
      rows: [
        { keys: ["↑", "↓"], desc: t({ ko: "항목 이동", en: "Navigate items", ja: "項目移動", zh: "导航" }) },
        { keys: ["↵"], desc: t({ ko: "실행", en: "Execute", ja: "実行", zh: "执行" }) },
        { keys: ["N"], desc: t({ ko: "새 태스크", en: "New Task", ja: "新規タスク", zh: "新任务" }) },
        { keys: [","], desc: t({ ko: "설정 열기", en: "Open Settings", ja: "設定を開く", zh: "打开设置" }) },
        { keys: ["Esc"], desc: t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" }) },
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
              <div style={{ ...mono, fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", color: muted, padding: "0 18px 8px", textTransform: "uppercase" }}>
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
                          borderRadius: 5,
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
