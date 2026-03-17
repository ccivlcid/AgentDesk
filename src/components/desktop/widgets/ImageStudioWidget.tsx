import { useCallback, useEffect, useRef, useState } from "react";
import { useUiStore } from "../../../store/uiStore";
import { useI18n } from "../../../i18n";
import { generateImage, getGallery, getImageUrl, getImageProviders, type ImageGenerationItem } from "../../../api/image-studio";

const mono = "var(--th-font-mono)";

export default function ImageStudioWidget() {
  const { t } = useI18n();
  const { openWindow } = useUiStore();
  const [recents, setRecents] = useState<ImageGenerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultProviderId, setDefaultProviderId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadRecents = useCallback(async () => {
    try {
      const { items } = await getGallery({ limit: 3 });
      setRecents(items);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecents();
    getImageProviders().then((list) => { if (list[0]) setDefaultProviderId(list[0].id); }).catch(() => {});
    const timer = setInterval(loadRecents, 30_000);
    return () => clearInterval(timer);
  }, [loadRecents]);

  async function handleGenerate() {
    const p = prompt.trim();
    if (!p || generating || !defaultProviderId) return;
    setGenerating(true);
    setError(null);
    try {
      await generateImage({ prompt: p, api_provider_id: defaultProviderId, model: "dall-e-3" });
      setPrompt("");
      await loadRecents();
    } catch (err) {
      setError(String(err).replace(/Error:\s*/i, ""));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: mono, fontSize: 11, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 11px", borderBottom: "1px solid var(--th-border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg viewBox="0 0 18 18" fill="none" stroke="var(--th-text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={13} height={13}>
            <rect x="1" y="2" width="16" height="14" rx="2" />
            <circle cx="5.5" cy="7" r="1.5" />
            <polyline points="1,14 6,9 9,12 12,9 17,14" />
          </svg>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--th-text-muted)" }}>
            Image Studio
          </span>
        </div>
        {generating && (
          <span style={{ fontSize: 9, color: "var(--th-accent)", letterSpacing: "0.04em" }}>
            {t({ ko: "생성 중…", en: "Generating…", ja: "生成中…", zh: "生成中…" })}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
        {/* 최근 이미지 썸네일 */}
        {loading ? (
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ flex: 1, aspectRatio: "1", borderRadius: 6, background: "var(--th-hover-overlay)", opacity: 0.5 }} />
            ))}
          </div>
        ) : recents.length > 0 ? (
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {recents.map((item) => (
              <div
                key={item.id}
                onClick={() => openWindow("image-studio")}
                style={{ flex: 1, aspectRatio: "1", borderRadius: 6, overflow: "hidden", cursor: "pointer", border: "1px solid var(--th-border)", flexShrink: 0 }}
              >
                <img
                  src={getImageUrl(item.id, true)}
                  alt={item.prompt}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom: 10, padding: "12px 0", textAlign: "center", color: "var(--th-text-muted)", fontSize: 10 }}>
            {t({ ko: "아직 생성된 이미지가 없습니다", en: "No images yet", ja: "画像がまだありません", zh: "暂无图像" })}
          </div>
        )}

        {/* Quick Prompt */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
            placeholder={t({ ko: "프롬프트 입력 후 Enter…", en: "Enter prompt, press Enter…", ja: "プロンプトを入力してEnter…", zh: "输入提示词，按Enter…" })}
            disabled={generating}
            style={{
              flex: 1, padding: "5px 8px", background: "var(--th-hover-overlay-subtle)",
              border: "1px solid var(--th-border)", borderRadius: 5,
              fontFamily: mono, fontSize: 10, color: "var(--th-text-primary)",
              outline: "none", opacity: generating ? 0.6 : 1,
            }}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
            style={{
              padding: "5px 8px", background: "var(--th-hover-overlay)",
              border: "1px solid var(--th-border-accent)", borderRadius: 5,
              fontFamily: mono, fontSize: 10, color: "var(--th-accent)",
              cursor: !prompt.trim() || generating ? "default" : "pointer",
              opacity: !prompt.trim() || generating ? 0.4 : 1, flexShrink: 0,
            }}
          >
            ▶
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 6, fontSize: 9, color: "var(--th-danger, #ef4444)", lineHeight: 1.5 }}>
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "5px 12px", borderTop: "1px solid var(--th-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.04em" }}>
          {!loading && recents.length > 0 ? t({ ko: `${recents.length}장 최근`, en: `${recents.length} recent`, ja: `${recents.length}件`, zh: `${recents.length}张` }) : ""}
        </span>
        <button
          type="button"
          onClick={() => openWindow("image-studio")}
          style={{ background: "none", border: "none", color: "var(--th-accent)", fontFamily: mono, fontSize: 10, cursor: "pointer", padding: 0, letterSpacing: "0.04em" }}
        >
          {t({ ko: "스튜디오 →", en: "Studio →", ja: "スタジオ →", zh: "工作室 →" })}
        </button>
      </div>
    </div>
  );
}
