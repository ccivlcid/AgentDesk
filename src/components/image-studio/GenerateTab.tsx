import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "../../i18n";
import {
  generateImage,
  getImageProviders,
  getImageUrl,
  type GenerateResult,
  type ImageStudioProvider,
} from "../../api/image-studio";
import { useUiStore } from "../../store/uiStore";
import { useTaskStore } from "../../store/taskStore";
import MaskCanvas from "./MaskCanvas";

const mono = "var(--th-font-mono)";

const SIZES = [
  { label: "1024 × 1024", w: 1024, h: 1024 },
  { label: "1024 × 1792", w: 1024, h: 1792 },
  { label: "1792 × 1024", w: 1792, h: 1024 },
  { label: "512 × 512",   w: 512,  h: 512  },
  { label: "256 × 256",   w: 256,  h: 256  },
];

type Mode = "txt2img" | "inpaint";

interface Props {
  onGenerated?: () => void;
  onGoGallery?: () => void;
}

const panelBg = "var(--th-bg-surface)";
const sectionHd: React.CSSProperties = {
  fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
  color: "var(--th-text-muted)", padding: "8px 14px 4px",
  borderTop: "1px solid var(--th-border)", marginTop: 4,
};
const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "3px 14px",
};
const labelStyle: React.CSSProperties = {
  fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", flexShrink: 0, width: 60,
};
const selectStyle: React.CSSProperties = {
  flex: 1, padding: "3px 6px",
  background: "var(--th-hover-overlay-subtle)", border: "1px solid var(--th-border)",
  borderRadius: 3, fontFamily: mono, fontSize: 10, color: "var(--th-text-primary)",
  cursor: "pointer", outline: "none",
};

function fileToB64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
}

export default function GenerateTab({ onGenerated, onGoGallery }: Props) {
  const { t } = useI18n();
  const openSettings = useUiStore((s) => s.openSettings);
  const tasks = useTaskStore((s) => s.tasks);

  // task linkage
  const [linkedTaskId, setLinkedTaskId] = useState<string>("");
  const [taskLinkOpen, setTaskLinkOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("txt2img");
  const [prompt, setPrompt] = useState("");
  const [providers, setProviders] = useState<ImageStudioProvider[]>([]);
  const [providerId, setProviderId] = useState("");
  const [model, setModel] = useState("");
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [imgStyle, setImgStyle] = useState<"vivid" | "natural">("vivid");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // inpaint state
  const [inputImageB64, setInputImageB64] = useState<string | null>(null);
  const [inputImageUrl, setInputImageUrl] = useState<string | null>(null);
  const [maskB64, setMaskB64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getImageProviders().then((list) => {
      setProviders(list);
      if (list[0]) {
        setProviderId(list[0].id);
        setModel(list[0].models[0] ?? "");
      }
    }).catch(() => {});
  }, []);

  // Reset image state when mode changes
  useEffect(() => {
    setInputImageB64(null);
    setInputImageUrl(null);
    setMaskB64(null);
  }, [mode]);

  const currentProvider = providers.find((p) => p.id === providerId);
  const cachedModels = currentProvider?.models ?? [];
  const isDalle3 = model === "dall-e-3";

  function handleTaskSelect(taskId: string) {
    setLinkedTaskId(taskId);
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        const autoPrompt = [task.title, task.description].filter(Boolean).join(". ");
        setPrompt(autoPrompt);
      }
    }
  }

  function handleProviderSelect(id: string) {
    const p = providers.find((x) => x.id === id);
    if (p) { setProviderId(p.id); setModel(p.models[0] ?? ""); }
  }

  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const b64 = await fileToB64(file);
    const objectUrl = URL.createObjectURL(file);
    setInputImageB64(b64);
    setInputImageUrl(objectUrl);
    setMaskB64(null);

    // Auto-match resolution to closest supported size
    const img = new Image();
    img.onload = () => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      let best = SIZES[0];
      let bestDist = Infinity;
      for (const s of SIZES) {
        const dist = Math.abs(s.w - iw) + Math.abs(s.h - ih);
        if (dist < bestDist) { bestDist = dist; best = s; }
      }
      setWidth(best.w);
      setHeight(best.h);
    };
    img.src = objectUrl;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  }

  function removeInputImage() {
    setInputImageB64(null);
    setInputImageUrl(null);
    setMaskB64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleGenerate() {
    if (generating || !providerId) return;
    if (!prompt.trim()) return;
    if (mode === "inpaint" && !inputImageB64) return;

    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const r = await generateImage({
        api_provider_id: providerId,
        model,
        prompt: prompt.trim(),
        width,
        height,
        quality,
        style: imgStyle,
        mode,
        inputImageB64: inputImageB64 ?? undefined,
        maskB64: maskB64 ?? undefined,
        task_id: linkedTaskId || undefined,
      });
      setResult(r);
      onGenerated?.();
    } catch (err) {
      setError(String(err).replace(/Error:\s*/i, ""));
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = getImageUrl(result.id);
    a.download = `image-studio-${result.id}.png`;
    a.click();
  }

  const canGenerate = (() => {
    if (generating || !providerId) return false;
    if (!prompt.trim()) return false;
    if (mode === "inpaint" && !inputImageB64) return false;
    return true;
  })();

  const sizeLabel = SIZES.find((s) => s.w === width && s.h === height)?.label ?? `${width}×${height}`;

  const MODES: { id: Mode; label: string; icon: string }[] = [
    { id: "txt2img", icon: "✦", label: t({ ko: "텍스트",   en: "Text",    ja: "テキスト", zh: "文本" }) },
    { id: "inpaint", icon: "✎", label: t({ ko: "인페인트", en: "Inpaint", ja: "インペイント", zh: "修复" }) },
  ];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div style={{
        width: 240, flexShrink: 0, display: "flex", flexDirection: "column",
        background: panelBg, borderRight: "1px solid var(--th-border)", overflowY: "auto",
      }}>

        {/* Mode selector */}
        <div style={{ padding: "10px 14px 8px" }}>
          <div style={{
            fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--th-text-muted)", marginBottom: 6,
          }}>
            {t({ ko: "모드", en: "Mode", ja: "モード", zh: "模式" })}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  style={{
                    flex: 1, padding: "5px 2px",
                    background: active ? "rgba(245,158,11,0.22)" : "var(--th-hover-overlay)",
                    border: `1px solid ${active ? "var(--th-border-accent)" : "var(--th-border)"}`,
                    borderRadius: 4, fontFamily: mono, fontSize: 9,
                    color: active ? "var(--th-accent)" : "var(--th-text-muted)",
                    cursor: "pointer", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 2, transition: "all 0.12s",
                  }}
                >
                  <span style={{ fontSize: 13 }}>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prompt */}
        <div style={{ padding: "0 14px 8px" }}>
          <div style={{
            fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--th-text-muted)", marginBottom: 6,
          }}>
            {t({ ko: "프롬프트", en: "Prompt", ja: "プロンプト", zh: "提示词" })}
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
            placeholder={t({ ko: "이미지를 설명하세요…", en: "Describe the image…", ja: "画像を説明してください…", zh: "描述图像…" })}
            disabled={generating}
            rows={5}
            style={{
              width: "100%", padding: "8px", resize: "none", boxSizing: "border-box",
              background: "var(--th-hover-overlay-subtle)", border: "1px solid var(--th-border)",
              borderRadius: 4, fontFamily: mono, fontSize: 10, color: "var(--th-text-primary)",
              outline: "none", lineHeight: 1.6, opacity: generating ? 0.6 : 1,
            }}
          />
          <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", textAlign: "right", marginTop: 3 }}>
            Ctrl+Enter
          </div>
        </div>

        {/* Image upload zone — inpaint only */}
        {mode === "inpaint" && (
          <div style={{ padding: "0 14px 8px" }}>
            <div style={{
              fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--th-text-muted)", marginBottom: 6,
            }}>
              {t({ ko: "입력 이미지", en: "Input Image", ja: "入力画像", zh: "输入图像" })}
            </div>

            {inputImageUrl ? (
              <div style={{ position: "relative" }}>
                <img
                  src={inputImageUrl}
                  alt="input"
                  style={{ width: "100%", display: "block", borderRadius: 4, border: "1px solid var(--th-border)" }}
                />
                <button
                  type="button"
                  onClick={removeInputImage}
                  style={{
                    position: "absolute", top: 4, right: 4,
                    width: 20, height: 20, padding: 0,
                    background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "50%", fontFamily: mono, fontSize: 11,
                    color: "#fff", cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center", lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  border: "1px dashed var(--th-border)", borderRadius: 4,
                  padding: "20px 10px", textAlign: "center", cursor: "pointer",
                  background: "var(--th-hover-overlay-subtle)",
                }}
              >
                <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", lineHeight: 1.7 }}>
                  {t({ ko: "클릭 또는 드래그하여\n이미지 업로드", en: "Click or drag to\nupload image", ja: "クリックまたはドラッグで\n画像アップロード", zh: "点击或拖放\n上传图像" })}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
            />
          </div>
        )}

        {/* Mask canvas — inpaint + image loaded */}
        {mode === "inpaint" && inputImageUrl && (
          <div style={{ padding: "0 14px 8px" }}>
            <div style={{
              fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--th-text-muted)", marginBottom: 6,
            }}>
              {t({ ko: "마스크 (흰색=변경)", en: "Mask (white=replace)", ja: "マスク（白=置換）", zh: "蒙版（白=替换）" })}
            </div>
            <MaskCanvas imageUrl={inputImageUrl} onMaskChange={setMaskB64} />
          </div>
        )}

        {/* Generate button */}
        <div style={{ padding: "0 14px 10px" }}>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{
              width: "100%", padding: "9px 0",
              background: canGenerate ? "rgba(245,158,11,0.18)" : "var(--th-hover-overlay)",
              border: `1px solid ${canGenerate ? "var(--th-border-accent)" : "var(--th-border)"}`,
              borderRadius: 4, fontFamily: mono, fontSize: 11, fontWeight: 700,
              color: canGenerate ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: canGenerate ? "pointer" : "default", letterSpacing: "0.08em",
              transition: "all 0.15s",
            }}
          >
            {generating
              ? t({ ko: "▶ 생성 중…", en: "▶ Generating…", ja: "▶ 生成中…", zh: "▶ 生成中…" })
              : t({ ko: "▶ 생성", en: "▶ Generate", ja: "▶ 生成", zh: "▶ 生成" })}
          </button>
        </div>

        {/* Task linkage */}
        <div
          style={{ ...sectionHd, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          onClick={() => setTaskLinkOpen((v) => !v)}
        >
          <span>
            {t({ ko: "태스크 연동", en: "Link to Task", ja: "タスク連携", zh: "关联任务" })}
            {linkedTaskId && <span style={{ color: "var(--th-accent)", marginLeft: 6 }}>●</span>}
          </span>
          <span style={{ fontSize: 8 }}>{taskLinkOpen ? "▲" : "▼"}</span>
        </div>
        {taskLinkOpen && (
          <div style={{ padding: "4px 14px 10px" }}>
            <select
              value={linkedTaskId}
              onChange={(e) => handleTaskSelect(e.target.value)}
              style={{ ...selectStyle, width: "100%" }}
            >
              <option value="">{t({ ko: "— 연동 안 함 —", en: "— No task —", ja: "— 連携しない —", zh: "— 不关联 —" })}</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            {linkedTaskId && (
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 5, lineHeight: 1.5 }}>
                {t({ ko: "프롬프트가 태스크 내용으로 채워졌습니다. 수동 편집 가능합니다.", en: "Prompt pre-filled from task. You can edit it.", ja: "プロンプトがタスクから自動入力されました。", zh: "提示词已从任务自动填充，可手动编辑。" })}
              </div>
            )}
          </div>
        )}

        {/* Provider */}
        <div style={sectionHd}>{t({ ko: "제공자", en: "Provider", ja: "プロバイダ", zh: "提供商" })}</div>
        {providers.length === 0 ? (
          <div style={{ padding: "6px 14px 10px" }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", lineHeight: 1.5, marginBottom: 8 }}>
              {t({ ko: "이미지 API 제공자가 없습니다.", en: "No image API provider found.", ja: "画像APIプロバイダがありません。", zh: "未找到图像API提供商。" })}
            </div>
            <button
              type="button"
              onClick={() => openSettings("api")}
              style={{
                width: "100%", padding: "7px 0",
                background: "rgba(245,158,11,0.1)", border: "1px solid var(--th-border-accent)",
                borderRadius: 4, fontFamily: mono, fontSize: 10, fontWeight: 600,
                color: "var(--th-accent)", cursor: "pointer", letterSpacing: "0.04em",
                transition: "background 0.12s",
              }}
            >
              {t({ ko: "⚙ API 설정 열기", en: "⚙ Open API Settings", ja: "⚙ API設定を開く", zh: "⚙ 打开API设置" })}
            </button>
          </div>
        ) : (
          <div style={rowStyle}>
            <select value={providerId} onChange={(e) => handleProviderSelect(e.target.value)} style={selectStyle}>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {/* Model */}
        <div style={sectionHd}>{t({ ko: "모델", en: "Model", ja: "モデル", zh: "模型" })}</div>
        <div style={rowStyle}>
          {cachedModels.length > 0 ? (
            <select value={model} onChange={(e) => setModel(e.target.value)} style={selectStyle}>
              {cachedModels.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", lineHeight: 1.5 }}>
              {t({ ko: "Settings에서 프로바이더를 테스트하세요", en: "Test the provider in Settings to load models", ja: "SettingsでプロバイダをテストしてID", zh: "请在Settings中测试提供商" })}
            </span>
          )}
        </div>

        {/* Image Settings */}
        <div style={sectionHd}>{t({ ko: "이미지 설정", en: "Image Settings", ja: "画像設定", zh: "图像设置" })}</div>
        <div style={rowStyle}>
          <span style={labelStyle}>{t({ ko: "크기", en: "Size", ja: "サイズ", zh: "尺寸" })}</span>
          <select
            value={`${width}x${height}`}
            onChange={(e) => { const s = SIZES.find((sz) => `${sz.w}x${sz.h}` === e.target.value); if (s) { setWidth(s.w); setHeight(s.h); } }}
            style={selectStyle}
          >
            {SIZES.map((s) => <option key={s.label} value={`${s.w}x${s.h}`}>{s.label}</option>)}
          </select>
        </div>
        {isDalle3 && (
          <>
            <div style={rowStyle}>
              <span style={labelStyle}>{t({ ko: "품질", en: "Quality", ja: "品質", zh: "质量" })}</span>
              <select value={quality} onChange={(e) => setQuality(e.target.value as "standard" | "hd")} style={selectStyle}>
                <option value="standard">{t({ ko: "표준", en: "Standard", ja: "標準", zh: "标准" })}</option>
                <option value="hd">HD</option>
              </select>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>{t({ ko: "스타일", en: "Style", ja: "スタイル", zh: "风格" })}</span>
              <select value={imgStyle} onChange={(e) => setImgStyle(e.target.value as "vivid" | "natural")} style={selectStyle}>
                <option value="vivid">{t({ ko: "선명", en: "Vivid", ja: "鮮明", zh: "鲜艳" })}</option>
                <option value="natural">{t({ ko: "자연", en: "Natural", ja: "自然", zh: "自然" })}</option>
              </select>
            </div>
          </>
        )}

        {/* Output actions */}
        {result && (
          <>
            <div style={sectionHd}>{t({ ko: "출력", en: "Output", ja: "出力", zh: "输出" })}</div>
            <div style={{ padding: "4px 14px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
              {result.revisedPrompt && (
                <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", lineHeight: 1.5, wordBreak: "break-word" }}>
                  <span style={{ color: "var(--th-text-secondary)", display: "block", marginBottom: 2 }}>
                    {t({ ko: "수정된 프롬프트", en: "Revised Prompt", ja: "修正プロンプト", zh: "修订提示词" })}
                  </span>
                  {result.revisedPrompt}
                </div>
              )}
              <button
                type="button"
                onClick={handleDownload}
                style={{
                  width: "100%", padding: "7px 0",
                  background: "rgba(10,132,255,0.12)", border: "1px solid rgba(10,132,255,0.4)",
                  borderRadius: 4, fontFamily: mono, fontSize: 10, fontWeight: 600,
                  color: "#0a84ff", cursor: "pointer", letterSpacing: "0.04em",
                }}
              >
                ↓ {t({ ko: "이미지 저장", en: "Save Image", ja: "画像を保存", zh: "保存图像" })}
              </button>
              <button
                type="button"
                onClick={onGoGallery}
                style={{
                  width: "100%", padding: "6px 0",
                  background: "var(--th-hover-overlay)", border: "1px solid var(--th-border)",
                  borderRadius: 4, fontFamily: mono, fontSize: 10,
                  color: "var(--th-text-secondary)", cursor: "pointer",
                }}
              >
                {t({ ko: "갤러리 보기 →", en: "View Gallery →", ja: "ギャラリー →", zh: "查看画廊 →" })}
              </button>
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />
      </div>

      {/* ── CENTER CANVAS ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{
          flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--th-bg-primary)", position: "relative",
        }}>
          <AnimatePresence mode="wait">
            {generating && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
              >
                <div style={{ position: "relative", width: 64, height: 64 }}>
                  <svg viewBox="0 0 64 64" style={{ position: "absolute", inset: 0, animation: "spin 1.2s linear infinite" }}>
                    <circle cx="32" cy="32" r="26" fill="none" stroke="var(--th-border)" strokeWidth="3" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke="var(--th-accent)" strokeWidth="3"
                      strokeDasharray="40 124" strokeLinecap="round" />
                  </svg>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-primary)", letterSpacing: "0.04em" }}>
                    {t({ ko: "생성 중…", en: "Generating…", ja: "生成中…", zh: "生成中…" })}
                  </span>
                  <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
                    {model} · {sizeLabel}
                  </span>
                </div>
              </motion.div>
            )}

            {!generating && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  maxWidth: 420, padding: "24px 28px", textAlign: "center",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 8,
                }}
              >
                <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: "#ef4444", marginBottom: 10, letterSpacing: "0.04em" }}>
                  ✕ {t({ ko: "생성 실패", en: "Generation Failed", ja: "生成失敗", zh: "生成失败" })}
                </div>
                <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", lineHeight: 1.7 }}>{error}</div>
              </motion.div>
            )}

            {!generating && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{ maxWidth: "85%", maxHeight: "90%", position: "relative" }}
              >
                <img
                  src={getImageUrl(result.id)}
                  alt={result.prompt}
                  style={{
                    maxWidth: "100%", maxHeight: "calc(100vh - 200px)", objectFit: "contain",
                    display: "block",
                    boxShadow: "0 8px 48px rgba(0,0,0,0.7), 0 2px 12px rgba(0,0,0,0.5)",
                  }}
                />
                <button
                  type="button"
                  onClick={handleDownload}
                  title={t({ ko: "이미지 저장", en: "Save Image", ja: "画像を保存", zh: "保存图像" })}
                  style={{
                    position: "absolute", top: 10, right: 10,
                    padding: "6px 10px", background: "rgba(0,0,0,0.65)",
                    border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4,
                    fontFamily: mono, fontSize: 11, color: "#fff", cursor: "pointer",
                    backdropFilter: "blur(8px)", letterSpacing: "0.02em",
                  }}
                >
                  ↓
                </button>
              </motion.div>
            )}

            {!generating && !error && !result && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, opacity: 0.4 }}
              >
                <svg viewBox="0 0 48 48" fill="none" stroke="var(--th-text-muted)" strokeWidth={1.2} width={48} height={48}>
                  <rect x="4" y="6" width="40" height="36" rx="3" />
                  <circle cx="16" cy="18" r="4" />
                  <polyline points="4,36 16,24 24,30 32,22 44,36" />
                </svg>
                <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>
                  {mode === "txt2img"
                    ? t({ ko: "프롬프트를 입력하고 생성하세요", en: "Enter a prompt and generate", ja: "プロンプトを入力して生成", zh: "输入提示词并生成" })
                    : t({ ko: "이미지 업로드 후 마스크를 그리세요", en: "Upload an image, draw a mask and generate", ja: "画像をアップロードしてマスクを描いて生成", zh: "上传图像，绘制蒙版并生成" })}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── STATUS BAR ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16, padding: "5px 14px",
          borderTop: "1px solid var(--th-border)", background: panelBg,
          fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0,
        }}>
          <span>{sizeLabel}</span>
          {model && <><span style={{ opacity: 0.4 }}>|</span><span>{model}</span></>}
          {currentProvider && <><span style={{ opacity: 0.4 }}>|</span><span>{currentProvider.name}</span></>}
          <span style={{ opacity: 0.4 }}>|</span>
          <span style={{ color: "var(--th-accent)", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {mode}
          </span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span style={{ color: generating ? "var(--th-accent)" : result ? "#30d158" : "var(--th-text-muted)" }}>
            {generating
              ? t({ ko: "생성 중", en: "Generating", ja: "生成中", zh: "生成中" })
              : result
                ? t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" })
                : t({ ko: "대기 중", en: "Ready", ja: "待機中", zh: "就绪" })}
          </span>
          <div style={{ flex: 1 }} />
          {result && (
            <span style={{ color: "#30d158" }}>
              {result.width} × {result.height} px
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
