import { useState, useCallback, useRef } from "react";
import { useI18n } from "../../i18n";
import { post } from "../../api/core";
import TrafficLights from "./TrafficLights";

const COLOR_PRESETS = [
  "#f59e0b",
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#64748b",
] as const;

interface NewFolderModalProps {
  initialName: string;
  onConfirm: (name: string, base_path: string, color: string) => void;
  onCancel: () => void;
}

export default function NewFolderModal({ initialName, onConfirm, onCancel }: NewFolderModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const [basePath, setBasePath] = useState("");
  const [color, setColor] = useState<string>(COLOR_PRESETS[0]);
  const [browsing, setBrowsing] = useState(false);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const [pos, setPos] = useState(() => ({
    x: Math.max(40, (window.innerWidth - 480) / 2),
    y: Math.max(40, (window.innerHeight - 380) / 2),
  }));
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  }, [dragging]);
  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleBrowse = useCallback(async () => {
    setBrowsing(true);
    try {
      const result = await post<{ path: string | null }>("/api/projects/path-native-picker", {});
      if (result?.path) setBasePath(result.path);
    } catch { /* ignore */ } finally {
      setBrowsing(false);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name.trim() || !basePath.trim()) return;
    onConfirm(name.trim(), basePath.trim(), color);
  }, [name, basePath, color, onConfirm]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9500, pointerEvents: "none" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: 480,
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        borderRadius: 10,
        fontFamily: "var(--th-font-mono)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pointerEvents: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        {/* Title bar */}
        <div
          onMouseDown={handleHeaderMouseDown}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderBottom: "1px solid var(--th-border)",
            background: "var(--th-bg-surface)",
            cursor: dragging ? "grabbing" : "grab",
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          <TrafficLights onClose={onCancel} onMinimize={() => {}} onMaximize={() => {}} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--th-text-heading)", fontWeight: 600 }}>
              {t({ ko: "새 폴더 만들기", en: "New Folder", ja: "新規フォルダ", zh: "新建文件夹" })}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {/* Folder name */}
          <label style={{ display: "block", marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>
              {t({ ko: "폴더 이름", en: "Folder Name", ja: "フォルダ名", zh: "文件夹名称" })}
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); else if (e.key === "Escape") onCancel(); }}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "var(--th-input-bg)",
                border: "1px solid var(--th-border)",
                borderRadius: 0,
                color: "var(--th-text-primary)",
                fontFamily: "var(--th-font-mono)",
                fontSize: 11,
                padding: "7px 10px",
                outline: "none",
              }}
            />
          </label>

          {/* Base path */}
          <label style={{ display: "block", marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>
              {t({ ko: "기본 경로", en: "Base Path", ja: "ベースパス", zh: "基础路径" })}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                value={basePath}
                onChange={(e) => setBasePath(e.target.value)}
                placeholder="/home/user/work/folder-name"
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); else if (e.key === "Escape") onCancel(); }}
                style={{
                  flex: 1,
                  background: "var(--th-input-bg)",
                  border: "1px solid var(--th-border)",
                  borderRadius: 0,
                  color: "var(--th-text-primary)",
                  fontFamily: "var(--th-font-mono)",
                  fontSize: 11,
                  padding: "7px 10px",
                  outline: "none",
                }}
              />
              <button
                onClick={handleBrowse}
                disabled={browsing}
                style={{
                  background: "transparent",
                  border: "1px solid var(--th-border)",
                  borderRadius: 0,
                  color: "var(--th-text-muted)",
                  fontFamily: "var(--th-font-mono)",
                  fontSize: 9,
                  padding: "7px 10px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t({ ko: "경로 선택", en: "Browse", ja: "参照", zh: "浏览" })}
              </button>
            </div>
          </label>

          {/* Color presets */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              {t({ ko: "색상", en: "Color", ja: "カラー", zh: "颜色" })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: c,
                    border: color === c ? "2px solid var(--th-text-primary)" : "2px solid transparent",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              onClick={onCancel}
              style={{
                background: "transparent",
                border: "1px solid var(--th-border)",
                borderRadius: 0,
                color: "var(--th-text-secondary)",
                fontFamily: "var(--th-font-mono)",
                fontSize: 11,
                padding: "7px 16px",
                cursor: "pointer",
              }}
            >
              {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !basePath.trim()}
              style={{
                background: (!name.trim() || !basePath.trim()) ? "var(--th-bg-surface)" : "var(--th-accent)",
                border: "none",
                borderRadius: 0,
                color: (!name.trim() || !basePath.trim()) ? "var(--th-text-muted)" : "var(--th-accent-text)",
                fontFamily: "var(--th-font-mono)",
                fontSize: 11,
                padding: "7px 16px",
                cursor: (!name.trim() || !basePath.trim()) ? "not-allowed" : "pointer",
              }}
            >
              {t({ ko: "폴더 만들기", en: "Create Folder", ja: "フォルダを作成", zh: "创建文件夹" })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
