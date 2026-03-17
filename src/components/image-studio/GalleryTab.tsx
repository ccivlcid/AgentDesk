import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { getGallery, deleteImage, getImageUrl, type ImageGenerationItem } from "../../api/image-studio";

const mono = "var(--th-font-mono)";
const panelBg = "rgba(0,0,0,0.25)";

interface Props {
  refreshTrigger?: number;
}

export default function GalleryTab({ refreshTrigger }: Props) {
  const { t } = useI18n();
  const [items, setItems] = useState<ImageGenerationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ImageGenerationItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getGallery({ limit: 60, search: search || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load, refreshTrigger]);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteImage(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((prev) => prev - 1);
      if (selected?.id === id) setSelected(null);
    } catch { /* silent */ }
    finally { setDeleting(null); }
  }

  function handleDownload(item: ImageGenerationItem) {
    const a = document.createElement("a");
    a.href = getImageUrl(item.id);
    a.download = `image-studio-${item.id}.png`;
    a.click();
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── MAIN GRID AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{
          display: "flex", gap: 8, padding: "8px 12px", alignItems: "center",
          borderBottom: "1px solid var(--th-border)", flexShrink: 0, background: panelBg,
        }}>
          <svg viewBox="0 0 14 14" fill="none" stroke="var(--th-text-muted)" strokeWidth={1.4} width={12} height={12}>
            <circle cx="6" cy="6" r="4" /><line x1="9.5" y1="9.5" x2="13" y2="13" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t({ ko: "프롬프트 검색…", en: "Search prompts…", ja: "プロンプト検索…", zh: "搜索提示词…" })}
            style={{
              flex: 1, padding: "4px 8px",
              background: "var(--th-hover-overlay-subtle)", border: "1px solid var(--th-border)",
              borderRadius: 3, fontFamily: mono, fontSize: 10, color: "var(--th-text-primary)", outline: "none",
            }}
          />
          <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0, letterSpacing: "0.06em" }}>
            {total} {t({ ko: "장", en: "imgs", ja: "件", zh: "张" })}
          </span>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 10, background: "var(--th-bg-primary)" }}>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 6 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ aspectRatio: "1", borderRadius: 3, background: "rgba(255,255,255,0.04)" }} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, opacity: 0.4 }}>
              <svg viewBox="0 0 48 48" fill="none" stroke="var(--th-text-muted)" strokeWidth={1.2} width={40} height={40}>
                <rect x="4" y="6" width="40" height="36" rx="3" />
                <circle cx="16" cy="18" r="4" />
                <polyline points="4,36 16,24 24,30 32,22 44,36" />
              </svg>
              <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>
                {t({ ko: "이미지가 없습니다", en: "No images", ja: "画像がありません", zh: "暂无图像" })}
              </span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 6 }}>
              {items.map((item) => (
                <GalleryItem
                  key={item.id}
                  item={item}
                  isSelected={selected?.id === item.id}
                  isDeleting={deleting === item.id}
                  onClick={() => setSelected(selected?.id === item.id ? null : item)}
                  onDelete={() => handleDelete(item.id)}
                  onDownload={() => handleDownload(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT DETAIL PANEL ── */}
      {selected && (
        <div style={{
          width: 240, flexShrink: 0, display: "flex", flexDirection: "column",
          borderLeft: "1px solid var(--th-border)", background: panelBg, overflowY: "auto",
        }}>
          {/* Image preview */}
          <div style={{ padding: 10, borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}>
            <img
              src={getImageUrl(selected.id)}
              alt={selected.prompt}
              style={{ width: "100%", display: "block", borderRadius: 3 }}
            />
          </div>

          {/* Metadata */}
          <div style={{ flex: 1, padding: "8px 0" }}>
            <MetaSection label={t({ ko: "프롬프트", en: "Prompt", ja: "プロンプト", zh: "提示词" })} value={selected.prompt} multiLine />
            <MetaSection label={t({ ko: "제공자", en: "Provider", ja: "プロバイダ", zh: "提供商" })} value={selected.provider} />
            <MetaSection label={t({ ko: "모델", en: "Model", ja: "モデル", zh: "模型" })} value={selected.model} />
            <MetaSection label={t({ ko: "해상도", en: "Resolution", ja: "解像度", zh: "分辨率" })} value={`${selected.width} × ${selected.height} px`} />
            <MetaSection label={t({ ko: "생성일", en: "Created", ja: "作成日", zh: "创建时间" })} value={new Date(selected.createdAt).toLocaleString()} />
            {selected.metadata?.revisedPrompt && (
              <MetaSection label="Revised" value={selected.metadata.revisedPrompt} multiLine />
            )}
          </div>

          {/* Actions */}
          <div style={{ padding: "10px", borderTop: "1px solid var(--th-border)", display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              type="button"
              onClick={() => handleDownload(selected)}
              style={{
                width: "100%", padding: "8px 0",
                background: "rgba(10,132,255,0.12)", border: "1px solid rgba(10,132,255,0.4)",
                borderRadius: 3, fontFamily: mono, fontSize: 10, fontWeight: 600,
                color: "#0a84ff", cursor: "pointer", letterSpacing: "0.04em",
              }}
            >
              ↓ {t({ ko: "이미지 저장", en: "Save Image", ja: "画像を保存", zh: "保存图像" })}
            </button>
            <button
              type="button"
              onClick={() => handleDelete(selected.id)}
              disabled={deleting === selected.id}
              style={{
                width: "100%", padding: "7px 0",
                background: "transparent", border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: 3, fontFamily: mono, fontSize: 10,
                color: "#ef4444", cursor: deleting === selected.id ? "default" : "pointer",
                opacity: deleting === selected.id ? 0.5 : 1,
              }}
            >
              {deleting === selected.id ? "…" : `✕ ${t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GalleryItem({ item, isSelected, isDeleting, onClick, onDelete, onDownload }: {
  item: ImageGenerationItem;
  isSelected: boolean;
  isDeleting: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        aspectRatio: "1", overflow: "hidden", cursor: "pointer", position: "relative",
        outline: isSelected ? "2px solid var(--th-accent)" : "1px solid rgba(255,255,255,0.06)",
        outlineOffset: isSelected ? 2 : 0,
        opacity: isDeleting ? 0.3 : 1,
        transition: "outline 0.1s",
      }}
    >
      <img
        src={getImageUrl(item.id, true)}
        alt={item.prompt}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      {hovered && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
          gap: 4, padding: 5,
        }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            style={{
              padding: "4px 7px", background: "rgba(10,132,255,0.7)", border: "none",
              borderRadius: 3, color: "#fff", fontSize: 10, fontFamily: mono, cursor: "pointer",
            }}
          >↓</button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              padding: "4px 7px", background: "rgba(239,68,68,0.7)", border: "none",
              borderRadius: 3, color: "#fff", fontSize: 10, fontFamily: mono, cursor: "pointer",
            }}
          >✕</button>
        </div>
      )}
    </div>
  );
}

function MetaSection({ label, value, multiLine }: { label: string; value: string; multiLine?: boolean }) {
  return (
    <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--th-border)" }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{
        fontFamily: mono, fontSize: 10, color: "var(--th-text-secondary)", lineHeight: 1.5,
        wordBreak: multiLine ? "break-word" : "normal",
        whiteSpace: multiLine ? "pre-wrap" : "nowrap",
        overflow: "hidden", textOverflow: multiLine ? "unset" : "ellipsis",
      }}>
        {value}
      </div>
    </div>
  );
}
