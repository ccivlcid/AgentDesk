import { useState, useCallback } from "react";
import { useI18n } from "../../i18n";
import { post } from "../../api/core";

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
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.5)" }}
        onClick={onCancel}
      />
      <div style={{
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10001,
        width: 480,
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        borderRadius: 10,
        padding: 24,
        fontFamily: "var(--th-font-mono)",
      }}>
        <div style={{ fontSize: 13, color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)", marginBottom: 20, fontWeight: 600 }}>
          {t({ ko: "새 폴더 만들기", en: "New Folder", ja: "新規フォルダ", zh: "新建文件夹" })}
        </div>

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
    </>
  );
}
