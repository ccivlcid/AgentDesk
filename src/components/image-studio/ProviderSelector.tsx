import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { getImageProviders, type ImageStudioProvider } from "../../api/image-studio";

const mono = "var(--th-font-mono)";

const SIZES = [
  { label: "1024×1024", w: 1024, h: 1024 },
  { label: "1024×1792", w: 1024, h: 1792 },
  { label: "1792×1024", w: 1792, h: 1024 },
  { label: "512×512",   w: 512,  h: 512  },
  { label: "256×256",   w: 256,  h: 256  },
];

interface Props {
  providerId: string;
  model: string;
  width: number;
  height: number;
  quality: "standard" | "hd";
  style: "vivid" | "natural";
  onChange: (update: Partial<{
    providerId: string;
    model: string;
    width: number;
    height: number;
    quality: "standard" | "hd";
    style: "vivid" | "natural";
  }>) => void;
}

const selectStyle: React.CSSProperties = {
  padding: "4px 8px", background: "var(--th-hover-overlay-subtle)",
  border: "1px solid var(--th-border)", borderRadius: 5,
  fontFamily: mono, fontSize: 10, color: "var(--th-text-primary)",
  cursor: "pointer", outline: "none",
};

const inputStyle: React.CSSProperties = {
  padding: "4px 8px", background: "var(--th-hover-overlay-subtle)",
  border: "1px solid var(--th-border)", borderRadius: 5,
  fontFamily: mono, fontSize: 10, color: "var(--th-text-primary)",
  outline: "none", width: 140,
};

export default function ProviderSelector({ providerId, model, width, height, quality, style: imgStyle, onChange }: Props) {
  const { t } = useI18n();
  const [providers, setProviders] = useState<ImageStudioProvider[]>([]);

  useEffect(() => {
    getImageProviders().then((list) => {
      setProviders(list);
      if (list.length > 0 && !providerId) {
        const first = list[0];
        onChange({ providerId: first.id, model: first.models[0] ?? "" });
      }
    }).catch(() => {});
  }, []);

  if (providers.length === 0) {
    return (
      <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
        {t({
          ko: "Settings → API 제공자에서 프로바이더를 먼저 추가하세요",
          en: "Add a provider first in Settings → API Providers",
          ja: "Settings → API Providersでプロバイダを追加してください",
          zh: "请先在 Settings → API Providers 中添加提供商",
        })}
      </div>
    );
  }

  const currentProvider = providers.find((p) => p.id === providerId);
  const cachedModels = currentProvider?.models ?? [];
  const isDalle3 = model === "dall-e-3";

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {/* Provider */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
          {t({ ko: "제공자", en: "Provider", ja: "プロバイダ", zh: "提供商" })}
        </span>
        <select
          value={providerId}
          onChange={(e) => {
            const p = providers.find((x) => x.id === e.target.value);
            if (p) onChange({ providerId: p.id, model: p.models[0] ?? "" });
          }}
          style={selectStyle}
        >
          {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Model — 캐시된 목록 있으면 드롭다운, 없으면 직접 입력 */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
          {t({ ko: "모델", en: "Model", ja: "モデル", zh: "模型" })}
        </span>
        {cachedModels.length > 0 ? (
          <select value={model} onChange={(e) => onChange({ model: e.target.value })} style={selectStyle}>
            {cachedModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <input
            value={model}
            onChange={(e) => onChange({ model: e.target.value })}
            placeholder="e.g. dall-e-3"
            style={inputStyle}
          />
        )}
      </div>

      {/* Size */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
          {t({ ko: "크기", en: "Size", ja: "サイズ", zh: "尺寸" })}
        </span>
        <select
          value={`${width}x${height}`}
          onChange={(e) => {
            const s = SIZES.find((sz) => `${sz.w}x${sz.h}` === e.target.value);
            if (s) onChange({ width: s.w, height: s.h });
          }}
          style={selectStyle}
        >
          {SIZES.map((s) => <option key={s.label} value={`${s.w}x${s.h}`}>{s.label}</option>)}
        </select>
      </div>

      {/* Quality + Style — DALL-E 3 전용 */}
      {isDalle3 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
              {t({ ko: "품질", en: "Quality", ja: "品質", zh: "质量" })}
            </span>
            <select value={quality} onChange={(e) => onChange({ quality: e.target.value as "standard" | "hd" })} style={selectStyle}>
              <option value="standard">standard</option>
              <option value="hd">HD</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
              {t({ ko: "스타일", en: "Style", ja: "スタイル", zh: "风格" })}
            </span>
            <select value={imgStyle} onChange={(e) => onChange({ style: e.target.value as "vivid" | "natural" })} style={selectStyle}>
              <option value="vivid">vivid</option>
              <option value="natural">natural</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}
