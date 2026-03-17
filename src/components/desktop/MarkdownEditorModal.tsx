import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import TrafficLights from "./TrafficLights";
import { useI18n } from "../../i18n";
import { useUiStore } from "../../store/uiStore";

interface MarkdownEditorModalProps {
  onClose: () => void;
  defaultProjectName?: string;
}

export default function MarkdownEditorModal({ onClose, defaultProjectName }: MarkdownEditorModalProps) {
  const { t } = useI18n();
  const { addPendingDoc } = useUiStore();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedToDesktop, setSavedToDesktop] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mono = "var(--th-font-mono)";

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // 간단한 마크다운 → HTML 변환 (미리보기용)
  function renderMarkdown(md: string): string {
    return md
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/^#{3} (.+)$/gm, "<h3>$1</h3>")
      .replace(/^#{2} (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(?!<[hbucpo])/gm, "")
      .replace(/(.+)(?!\n<)/g, (m) => m.startsWith("<") ? m : `<p>${m}</p>`);
  }

  function handleSaveToDesktop() {
    if (!content.trim() && !title.trim()) return;
    addPendingDoc({ title: title.trim() || t({ ko: "문서", en: "document", ja: "文書", zh: "文档" }), content: (title.trim() ? `# ${title.trim()}\n\n` : "") + content });
    setSavedToDesktop(true);
    setTimeout(() => { setSavedToDesktop(false); onClose(); }, 800);
  }

  function handleDownload() {
    const filename = (title.trim() || t({ ko: "문서", en: "document", ja: "文書", zh: "文档" })) + ".md";
    const header = title.trim() ? `# ${title.trim()}\n\n` : "";
    const blob = new Blob([header + content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Cmd/Ctrl+S → 다운로드
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleDownload();
    }
    // Esc → 닫기
    if (e.key === "Escape") {
      onClose();
    }
    // Tab → 들여쓰기
    if (e.key === "Tab" && e.target === textareaRef.current) {
      e.preventDefault();
      const el = textareaRef.current!;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = content.substring(0, start) + "  " + content.substring(end);
      setContent(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content.split("\n").length;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1500,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          width: "min(820px, 96vw)",
          height: "min(640px, 90vh)",
          background: "var(--th-bg-surface)",
          border: "1px solid var(--th-border)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
          fontFamily: mono,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 타이틀바 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            borderBottom: "1px solid var(--th-border)",
            background: "var(--th-glass-bg)",
            flexShrink: 0,
          }}
        >
          <TrafficLights onClose={onClose} />
          <span style={{ fontSize: 12, color: "var(--th-text-muted)", flex: 1, textAlign: "center" }}>
            {title.trim()
              ? `${title.trim()}.md`
              : t({ ko: "새 마크다운 문서", en: "New Markdown Document", ja: "新規Markdownドキュメント", zh: "新建 Markdown 文档" })}
          </span>
          {defaultProjectName && (
            <span style={{ fontSize: 10, color: "var(--th-text-muted)", background: "var(--th-bg-elevated)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--th-border)" }}>
              📁 {defaultProjectName}
            </span>
          )}
        </div>

        {/* 제목 입력 */}
        <div
          style={{
            padding: "12px 16px 8px",
            borderBottom: "1px solid var(--th-border)",
            flexShrink: 0,
          }}
        >
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t({ ko: "제목 (선택)", en: "Title (optional)", ja: "タイトル (任意)", zh: "标题（可选）" })}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: mono,
              fontSize: 18,
              fontWeight: 700,
              color: "var(--th-text-heading)",
              caretColor: "var(--th-accent)",
            }}
          />
        </div>

        {/* 툴바 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 14px",
            borderBottom: "1px solid var(--th-border)",
            flexShrink: 0,
            background: "var(--th-bg-primary)",
          }}
        >
          {/* 마크다운 삽입 버튼들 */}
          {[
            { label: "B", title: "Bold (**text**)", insert: "**text**", sel: [2, 6] },
            { label: "I", title: "Italic (*text*)", insert: "*text*", sel: [1, 5] },
            { label: "H1", title: "# Heading 1", insert: "# ", sel: [2, 2] },
            { label: "H2", title: "## Heading 2", insert: "## ", sel: [3, 3] },
            { label: "`", title: "Inline code", insert: "`code`", sel: [1, 5] },
            { label: "—", title: "Divider", insert: "\n---\n", sel: [5, 5] },
            { label: "•", title: "List item", insert: "- ", sel: [2, 2] },
            { label: ">", title: "Blockquote", insert: "> ", sel: [2, 2] },
          ].map(({ label, title: ttl, insert, sel }) => (
            <button
              key={label}
              type="button"
              title={ttl}
              onClick={() => {
                const el = textareaRef.current;
                if (!el) return;
                const start = el.selectionStart;
                const end = el.selectionEnd;
                const before = content.substring(0, start);
                const after = content.substring(end);
                setContent(before + insert + after);
                requestAnimationFrame(() => {
                  el.focus();
                  el.selectionStart = start + sel[0];
                  el.selectionEnd = start + sel[1];
                });
              }}
              style={{
                background: "none",
                border: "1px solid var(--th-border)",
                borderRadius: 4,
                padding: "2px 7px",
                fontFamily: mono,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--th-text-secondary)",
                cursor: "pointer",
                transition: "all 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-accent)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--th-accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-secondary)";
              }}
            >
              {label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* 미리보기 토글 */}
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            style={{
              background: preview ? "rgba(245,158,11,0.12)" : "none",
              border: `1px solid ${preview ? "var(--th-accent)" : "var(--th-border)"}`,
              borderRadius: 4,
              padding: "2px 10px",
              fontFamily: mono,
              fontSize: 11,
              color: preview ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: "pointer",
            }}
          >
            {preview
              ? t({ ko: "편집", en: "Edit", ja: "編集", zh: "编辑" })
              : t({ ko: "미리보기", en: "Preview", ja: "プレビュー", zh: "预览" })}
          </button>
        </div>

        {/* 편집 / 미리보기 영역 */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
          {preview ? (
            <div
              style={{
                height: "100%",
                overflowY: "auto",
                padding: "20px 24px",
                color: "var(--th-text-primary)",
                fontSize: 14,
                lineHeight: 1.75,
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) || `<p style="color:var(--th-text-muted); font-style:italic">${t({ ko: "미리볼 내용이 없습니다", en: "Nothing to preview", ja: "プレビューなし", zh: "暂无预览内容" })}</p>` }}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t({
                ko: "마크다운으로 내용을 작성하세요...\n\n# 제목\n## 소제목\n**굵게** *기울임* `코드`\n- 목록 아이템",
                en: "Write in Markdown...\n\n# Heading\n## Subheading\n**bold** *italic* `code`\n- List item",
                ja: "Markdownで内容を書いてください...\n\n# 見出し\n**太字** *斜体* `コード`",
                zh: "使用 Markdown 编写内容...\n\n# 标题\n**粗体** *斜体* `代码`",
              })}
              style={{
                width: "100%",
                height: "100%",
                background: "var(--th-bg-primary)",
                border: "none",
                outline: "none",
                resize: "none",
                padding: "20px 24px",
                fontFamily: mono,
                fontSize: 13,
                lineHeight: 1.75,
                color: "var(--th-text-primary)",
                caretColor: "var(--th-accent)",
                boxSizing: "border-box",
              }}
            />
          )}
        </div>

        {/* 푸터 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 16px",
            borderTop: "1px solid var(--th-border)",
            background: "var(--th-glass-bg)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>
            {t({ ko: `${lineCount}줄 · ${wordCount}단어`, en: `${lineCount} lines · ${wordCount} words`, ja: `${lineCount}行 · ${wordCount}語`, zh: `${lineCount}行 · ${wordCount}字` })}
          </span>
          <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>
            {t({ ko: "⌘S 저장", en: "⌘S save", ja: "⌘S 保存", zh: "⌘S 保存" })}
          </span>
          <div style={{ flex: 1 }} />

          {saved && (
            <span style={{ fontSize: 10, color: "var(--th-success, #22c55e)" }}>
              ✓ {t({ ko: "저장됨", en: "Saved", ja: "保存済み", zh: "已保存" })}
            </span>
          )}
          {savedToDesktop && (
            <span style={{ fontSize: 10, color: "var(--th-accent)" }}>
              ✓ {t({ ko: "바탕화면에 추가됨", en: "Added to desktop", ja: "デスクトップに追加", zh: "已添加到桌面" })}
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid var(--th-border)",
              borderRadius: 6,
              padding: "4px 14px",
              fontFamily: mono,
              fontSize: 11,
              color: "var(--th-text-secondary)",
              cursor: "pointer",
            }}
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>

          <button
            type="button"
            onClick={handleSaveToDesktop}
            disabled={!content.trim() && !title.trim()}
            style={{
              background: content.trim() || title.trim() ? "var(--th-bg-elevated)" : "var(--th-bg-elevated)",
              border: `1px solid ${content.trim() || title.trim() ? "var(--th-accent)" : "var(--th-border)"}`,
              borderRadius: 6,
              padding: "4px 14px",
              fontFamily: mono,
              fontSize: 11,
              fontWeight: 600,
              color: content.trim() || title.trim() ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: content.trim() || title.trim() ? "pointer" : "not-allowed",
              opacity: content.trim() || title.trim() ? 1 : 0.5,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={11} height={11}>
              <rect x="1" y="1" width="12" height="12" rx="2" />
              <path d="M4 7h6M7 4v6" />
            </svg>
            {t({ ko: "바탕화면에 저장", en: "Save to Desktop", ja: "デスクトップに保存", zh: "保存到桌面" })}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!content.trim() && !title.trim()}
            style={{
              background: content.trim() || title.trim() ? "var(--th-accent)" : "var(--th-bg-elevated)",
              border: "none",
              borderRadius: 6,
              padding: "4px 16px",
              fontFamily: mono,
              fontSize: 11,
              fontWeight: 700,
              color: content.trim() || title.trim() ? "var(--th-accent-text)" : "var(--th-text-muted)",
              cursor: content.trim() || title.trim() ? "pointer" : "not-allowed",
              opacity: content.trim() || title.trim() ? 1 : 0.5,
            }}
          >
            ↓ {t({ ko: "다운로드", en: "Download", ja: "ダウンロード", zh: "下载" })} .md
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
