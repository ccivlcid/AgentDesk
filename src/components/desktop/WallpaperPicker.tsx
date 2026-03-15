import { useState } from "react";
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

interface Props {
  onClose: () => void;
}

export default function WallpaperPicker({ onClose }: Props) {
  const { wallpaper, setWallpaper } = useUiStore();
  const [hovered, setHovered] = useState<string | null>(null);
  const { t } = useI18n();

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
          borderRadius: 16,
          padding: 24,
          width: 480,
          boxShadow: "0 32px 64px var(--th-glass-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 타이틀바 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
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
            height: 120,
            borderRadius: 10,
            background: hovered
              ? WALLPAPERS.find((w) => w.id === hovered)?.css ?? wallpaper
              : wallpaper,
            marginBottom: 18,
            border: "1px solid var(--th-border)",
            transition: "background 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", letterSpacing: "0.12em" }}>
            PREVIEW
          </span>
        </div>

        {/* 그리드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 8,
          }}
        >
          {WALLPAPERS.map((w) => {
            const isSelected = wallpaper === w.css;
            return (
              <button
                key={w.id}
                onClick={() => { setWallpaper(w.css); onClose(); }}
                onMouseEnter={() => setHovered(w.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: 0,
                  border: isSelected
                    ? "2px solid var(--th-accent)"
                    : "2px solid var(--th-border)",
                  borderRadius: 8,
                  cursor: "pointer",
                  overflow: "hidden",
                  background: "none",
                  outline: "none",
                  transition: "border-color 0.15s, transform 0.1s",
                  transform: isSelected ? "scale(1.05)" : "scale(1)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    paddingTop: "62%",
                    background: w.css,
                    position: "relative",
                  }}
                >
                  {isSelected && (
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: "50%",
                        background: "var(--th-accent)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontSize: 9, color: "white" }}>✓</span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{
                  fontFamily: mono,
                  fontSize: 9,
                  color: isSelected ? "var(--th-text-accent)" : "var(--th-text-muted)",
                  textAlign: "center",
                  padding: "4px 2px",
                  background: "var(--th-bg-secondary)",
                }}>
                  {w.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
