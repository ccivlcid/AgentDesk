import { useRef, useState } from "react";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";

const mono = "var(--th-font-mono)";

export const WALLPAPERS: { id: string; name: string; css: string }[] = [
  { id: "default",   name: "Default",   css: "var(--th-bg-primary)" },
  { id: "monterey",  name: "Monterey",  css: "linear-gradient(145deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" },
  { id: "ventura",   name: "Ventura",   css: "linear-gradient(145deg, #1a1a3e 0%, #2d1b69 40%, #6b21a8 100%)" },
  { id: "sonoma",    name: "Sonoma",    css: "linear-gradient(145deg, #0d1117 0%, #0d2137 40%, #0a3d62 100%)" },
  { id: "sequoia",   name: "Sequoia",   css: "linear-gradient(145deg, #052e16 0%, #14532d 50%, #166534 100%)" },
  { id: "aurora",    name: "Aurora",    css: "linear-gradient(145deg, #050a14 0%, #0d2137 25%, #064e3b 55%, #1e1b4b 100%)" },
  { id: "sunset",    name: "Sunset",    css: "linear-gradient(145deg, #1a0533 0%, #7c2d12 40%, #c2410c 75%, #ea580c 100%)" },
  { id: "ocean",     name: "Ocean",     css: "linear-gradient(145deg, #030712 0%, #0c1a3d 40%, #1e3a5f 100%)" },
  { id: "rose",      name: "Rose",      css: "linear-gradient(145deg, #1a0a1a 0%, #4a1942 40%, #9d174d 100%)" },
  { id: "slate",     name: "Slate",     css: "linear-gradient(145deg, #020617 0%, #0f172a 50%, #1e293b 100%)" },
  { id: "light",     name: "Light",     css: "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)" },
  { id: "sky",       name: "Sky",       css: "linear-gradient(145deg, #eff6ff 0%, #dbeafe 45%, #bfdbfe 100%)" },
  { id: "cream",     name: "Cream",     css: "linear-gradient(145deg, #fffbeb 0%, #fef3c7 45%, #fde68a 100%)" },
  { id: "mint",      name: "Mint",      css: "linear-gradient(145deg, #f0fdf4 0%, #dcfce7 45%, #bbf7d0 100%)" },
  { id: "blush",     name: "Blush",     css: "linear-gradient(145deg, #fff1f2 0%, #ffe4e6 45%, #fecdd3 100%)" },
];

const LIGHT_IDS = new Set(["light", "sky", "cream", "mint", "blush"]);

/** wallpaper CSS 값이 라이트 배경인지 반환 */
export function isLightWallpaper(css: string): boolean {
  return WALLPAPERS.some((w) => LIGHT_IDS.has(w.id) && w.css === css);
}

/** 이미지 File을 wallpaper CSS 문자열로 변환
 *  - GIF: 원본 base64 그대로 (애니메이션 유지)
 *  - 그 외: canvas로 1920×1080 이하 리사이즈 + JPEG 압축
 */
function imageFileToWallpaperCss(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;

    // GIF는 canvas 변환 없이 원본 그대로 사용 (애니메이션 보존)
    if (file.type === "image/gif") {
      reader.onload = (e) => {
        const dataUrl = e.target!.result as string;
        resolve(`url("${dataUrl}") center/cover no-repeat`);
      };
      reader.readAsDataURL(file);
      return;
    }

    // PNG / JPG / WEBP / AVIF → canvas 리사이즈 + JPEG 압축
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_W = 1920;
        const MAX_H = 1080;
        const scale = Math.min(1, MAX_W / img.width, MAX_H / img.height);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        resolve(`url("${dataUrl}") center/cover no-repeat`);
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** wallpaper CSS가 커스텀 이미지인지 */
function isImageWallpaper(css: string): boolean {
  return css.startsWith('url("');
}

interface Props {
  onClose: () => void;
}

export default function WallpaperPicker({ onClose }: Props) {
  const { wallpaper, setWallpaper } = useUiStore();
  const [hovered, setHovered] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [sizeWarning, setSizeWarning] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const isCustom = isImageWallpaper(wallpaper);

  // 미리보기: hovered 그라디언트 → 현재 wallpaper
  const previewBg = hovered
    ? WALLPAPERS.find((w) => w.id === hovered)?.css ?? wallpaper
    : wallpaper;
  const previewIsImage = isImageWallpaper(previewBg);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setSizeWarning("");
    // GIF 10MB 초과 시 경고 (localStorage 용량 한계)
    if (file.type === "image/gif" && file.size > 10 * 1024 * 1024) {
      setSizeWarning(t({ ko: "GIF가 너무 큽니다 (10MB 초과). 저장에 실패할 수 있습니다.", en: "GIF is too large (>10MB). Storage may fail.", ja: "GIFが大きすぎます(10MB超)", zh: "GIF文件过大(>10MB)" }));
    }
    setProcessing(true);
    try {
      const css = await imageFileToWallpaperCss(file);
      setWallpaper(css);
      onClose();
    } catch {
      /* ignore */
    } finally {
      setProcessing(false);
      e.target.value = "";
    }
  }

  function handleUrlApply() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    // 간단한 URL 형식 검증
    if (!/^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(trimmed)) {
      setUrlError(t({ ko: "이미지 URL을 입력하세요 (png/jpg/gif/webp)", en: "Enter a valid image URL (png/jpg/gif/webp)", ja: "画像URLを入力してください", zh: "请输入图片URL" }));
      return;
    }
    setUrlError("");
    setWallpaper(`url("${trimmed}") center/cover no-repeat`);
    onClose();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      setProcessing(true);
      imageFileToWallpaperCss(file)
        .then((css) => { setWallpaper(css); onClose(); })
        .catch(() => {})
        .finally(() => setProcessing(false));
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--th-modal-overlay)",
        zIndex: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--th-panel-bg)",
          backdropFilter: "blur(24px)",
          border: "1px solid var(--th-border)",
          borderRadius: 14,
          padding: 18,
          width: 460,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 32px 64px var(--th-glass-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 타이틀바 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 5 }}>
            <button
              onClick={onClose}
              style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57", border: "none", cursor: "pointer", padding: 0 }}
            />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--th-border)" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--th-border)" }} />
          </div>
          <span style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-secondary)", marginLeft: 6 }}>
            {t({ ko: "배경화면 설정", en: "Wallpaper Settings", ja: "壁紙設定", zh: "壁纸设置" })}
          </span>
        </div>

        {/* 미리보기 */}
        <div
          style={{
            width: "100%",
            height: 80,
            borderRadius: 8,
            background: previewBg,
            marginBottom: 14,
            border: "1px solid var(--th-border)",
            transition: previewIsImage ? "none" : "background 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <span style={{
            fontFamily: mono, fontSize: 10, letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.55)",
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}>
            PREVIEW
          </span>
        </div>

        {/* ── 프리셋 그라디언트 그리드 ── */}
        <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.08em", marginBottom: 6 }}>
          {t({ ko: "프리셋", en: "PRESETS", ja: "プリセット", zh: "预设" })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 14 }}>
          {WALLPAPERS.map((w) => {
            const isSelected = !isCustom && wallpaper === w.css;
            return (
              <button
                key={w.id}
                onClick={() => { setWallpaper(w.css); onClose(); }}
                onMouseEnter={() => setHovered(w.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: 0,
                  border: isSelected ? "2px solid var(--th-accent)" : "2px solid var(--th-border)",
                  borderRadius: 8,
                  cursor: "pointer",
                  overflow: "hidden",
                  background: "none",
                  outline: "none",
                  transition: "border-color 0.15s, transform 0.1s",
                  transform: isSelected ? "scale(1.05)" : "scale(1)",
                }}
              >
                <div style={{ width: "100%", paddingTop: "62%", background: w.css, position: "relative" }}>
                  {isSelected && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--th-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 9, color: "white" }}>✓</span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: mono, fontSize: 9, color: isSelected ? "var(--th-text-accent)" : "var(--th-text-muted)", textAlign: "center", padding: "4px 2px", background: "var(--th-bg-secondary)" }}>
                  {w.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 커스텀 이미지 섹션 ── */}
        <div style={{ borderTop: "1px solid var(--th-border)", paddingTop: 14 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.08em", marginBottom: 10 }}>
            {t({ ko: "커스텀 이미지", en: "CUSTOM IMAGE", ja: "カスタム画像", zh: "自定义图片" })}
          </div>

          {/* 현재 커스텀 배경 표시 */}
          {isCustom && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 48, height: 32, borderRadius: 6, border: "2px solid var(--th-accent)",
                  backgroundImage: wallpaper.replace(/^(url\([^)]+\)).*$/, "$1"),
                  backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0,
                }}
              />
              <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-accent)", flex: 1 }}>
                {t({ ko: "커스텀 배경 적용됨", en: "Custom wallpaper active", ja: "カスタム壁紙が適用中", zh: "自定义壁纸已应用" })}
              </span>
              <button
                onClick={() => { setWallpaper(WALLPAPERS[0].css); }}
                style={{ fontFamily: mono, fontSize: 10, color: "var(--th-danger, #ef4444)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
              >
                {t({ ko: "제거", en: "Remove", ja: "削除", zh: "删除" })}
              </button>
            </div>
          )}

          {/* 드래그 앤 드롭 / 파일 선택 영역 */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "1.5px dashed var(--th-border)",
              borderRadius: 8,
              padding: "13px 12px",
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 0.15s, background 0.15s",
              background: "var(--th-bg-elevated)",
              marginBottom: 10,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--th-accent)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--th-border)"; }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            {processing ? (
              <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-accent)" }}>
                {t({ ko: "처리 중...", en: "Processing...", ja: "処理中...", zh: "处理中..." })}
              </span>
            ) : (
              <>
                <div style={{ fontSize: 18, marginBottom: 4 }}>🖼️</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-secondary)", marginBottom: 2 }}>
                  {t({ ko: "클릭하거나 이미지를 드래그하세요", en: "Click or drag an image here", ja: "クリックまたは画像をドラッグ", zh: "点击或拖拽图片到此处" })}
                </div>
                <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                  PNG · JPG · WEBP · AVIF · GIF (애니메이션 지원)
                </div>
              </>
            )}
          </div>
          {sizeWarning && (
            <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-warning, #f59e0b)", marginBottom: 8 }}>
              ⚠ {sizeWarning}
            </div>
          )}

          {/* URL 입력 */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <input
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleUrlApply(); }}
                placeholder="https://example.com/wallpaper.jpg"
                style={{
                  width: "100%",
                  background: "var(--th-bg-elevated)",
                  border: urlError ? "1px solid var(--th-danger, #ef4444)" : "1px solid var(--th-border)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontFamily: mono,
                  fontSize: 11,
                  color: "var(--th-text-primary)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {urlError && (
                <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-danger, #ef4444)", marginTop: 4 }}>
                  {urlError}
                </div>
              )}
            </div>
            <button
              onClick={handleUrlApply}
              style={{
                padding: "8px 14px",
                background: "var(--th-accent)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontFamily: mono,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {t({ ko: "적용", en: "Apply", ja: "適用", zh: "应用" })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
