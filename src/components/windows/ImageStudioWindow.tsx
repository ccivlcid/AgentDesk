import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Image as ImageIcon, 
  HelpCircle, 
  X,
  LayoutGrid,
  ChevronRight,
  Info
} from "lucide-react";
import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import GenerateTab from "../image-studio/GenerateTab";
import GalleryTab from "../image-studio/GalleryTab";

const mono = "var(--th-font-mono)";

type Tab = "generate" | "gallery";

function GuidePanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  
  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: 320, zIndex: 100,
        background: "var(--th-glass-surface-active)", 
        backdropFilter: "blur(40px) saturate(180%)",
        borderLeft: "1px solid var(--th-glass-border-strong)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "-10px 0 40px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 24px", borderBottom: "1px solid var(--th-glass-border-subtle)",
        background: "rgba(255,255,255,0.02)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Info size={16} className="text-purple-400" />
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--th-text-primary)", letterSpacing: "-0.01em" }}>
            {t({ ko: "스튜디오 가이드", en: "Studio Guide", ja: "ガイド", zh: "指南" })}
          </span>
        </div>
        <button 
          onClick={onClose} 
          style={{ background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer", display: "flex" }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }} className="pm-shelf-scroll">
        <div style={{ fontSize: 12, color: "var(--th-text-secondary)", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 24 }}>
          <section>
            <div style={{ fontWeight: 800, color: "var(--th-text-primary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 4, height: 12, background: "var(--th-accent)", borderRadius: 2 }} />
              {t({ ko: "프로바이더 설정", en: "Provider Setup", ja: "プロバイダ設定", zh: "提供商设置" })}
            </div>
            <p style={{ opacity: 0.8 }}>{t({ ko: "이미지 API를 지원하는 프로바이더가 필요합니다. Claude 등 텍스트 전용 모델은 사용 불가합니다.", en: "Image generation requires a provider with an image API. Text-only models are not supported.", ja: "画像生成には画像APIプロバイダが必要です。", zh: "图像生成需要支持图像API的提供商。" })}</p>
          </section>

          <section>
            <div style={{ fontWeight: 800, color: "var(--th-text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 4, height: 12, background: "var(--th-accent)", borderRadius: 2 }} />
              {t({ ko: "지원 모델", en: "Supported Models", ja: "対応モデル", zh: "支持的模型" })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {["DALL-E 3", "Flux", "SD-XL", "Midjourney"].map(m => (
                <div key={m} style={{ padding: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--th-glass-border-subtle)", borderRadius: 8, fontSize: 10, textAlign: "center" }}>
                  {m}
                </div>
              ))}
            </div>
          </section>

          <div style={{ marginTop: 20, padding: 16, background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.15)", borderRadius: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--th-accent)", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
              <Sparkles size={12} /> Pro Tip
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              {t({ ko: "상세한 프롬프트를 입력할수록 고품질의 이미지가 생성됩니다.", en: "Detailed prompts yield higher quality results.", ja: "詳細なプロンプトが高品質な画像を作ります。", zh: "越详细的提示词生成的图像质量越高。" })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ImageStudioWindow() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("generate");
  const [galleryRefresh, setGalleryRefresh] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "generate", icon: Sparkles, label: t({ ko: "제작", en: "Create", ja: "生成", zh: "制作" }) },
    { id: "gallery",  icon: ImageIcon, label: t({ ko: "갤러리", en: "Gallery", ja: "ギャラリー", zh: "画廊" }) },
  ];

  return (
    <AppWindow
      windowType="image-studio"
      title={t({ ko: "이미지 스튜디오", en: "Image Studio", ja: "イメージスタジオ", zh: "图像工作室" })}
      emoji={<Sparkles size={14} className="text-purple-400" />}
      defaultWidth={1080}
      defaultHeight={720}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "transparent" }}>

        {/* ── High-End Studio Toolbar ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 24px", borderBottom: "1px solid var(--th-glass-border-subtle)",
          background: "rgba(255,255,255,0.015)", flexShrink: 0,
        }}>
          {/* Segmented Tab Control */}
          <div style={{ 
            display: "flex", background: "rgba(255,255,255,0.03)", 
            padding: 2, borderRadius: 12, border: "1px solid var(--th-glass-border-subtle)" 
          }}>
            {tabs.map((tb) => {
              const active = tab === tb.id;
              const Icon = tb.icon;
              return (
                <button
                  key={tb.id}
                  onClick={() => setTab(tb.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 20px", borderRadius: 10,
                    background: active ? "rgba(255,255,255,0.08)" : "transparent",
                    border: "none",
                    color: active ? "var(--th-text-primary)" : "var(--th-text-muted)",
                    fontFamily: "var(--th-font-body)", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", transition: "all 0.2s",
                    boxShadow: active ? "0 4px 12px rgba(0,0,0,0.2)" : "none"
                  }}
                >
                  <Icon size={14} className={active ? "text-purple-400" : ""} />
                  {tb.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 10, color: "var(--th-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Studio Alpha
            </div>
            <button
              onClick={() => setShowGuide((v) => !v)}
              style={{
                width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
                background: showGuide ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${showGuide ? "rgba(168,85,247,0.3)" : "var(--th-glass-border-strong)"}`,
                borderRadius: 10, cursor: "pointer", color: showGuide ? "rgb(168,85,247)" : "var(--th-text-muted)",
                transition: "all 0.2s"
              }}
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </div>

        {/* ── Studio Canvas Area ── */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ height: "100%" }}
            >
              {tab === "generate" && (
                <GenerateTab
                  onGenerated={() => setGalleryRefresh((n) => n + 1)}
                  onGoGallery={() => setTab("gallery")}
                />
              )}
              {tab === "gallery" && (
                <GalleryTab refreshTrigger={galleryRefresh} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Guide panel overlay */}
          <AnimatePresence>
            {showGuide && <GuidePanel onClose={() => setShowGuide(false)} />}
          </AnimatePresence>
        </div>
      </div>
    </AppWindow>
  );
}
