import { useState } from "react";
import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import GenerateTab from "../image-studio/GenerateTab";
import GalleryTab from "../image-studio/GalleryTab";

const mono = "var(--th-font-mono)";

function ImageStudioIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <rect x="1" y="2" width="16" height="14" rx="2" />
      <circle cx="5.5" cy="7" r="1.5" />
      <polyline points="1,14 6,9 9,12 12,9 17,14" />
    </svg>
  );
}

type Tab = "generate" | "gallery";

function GuidePanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div style={{
      position: "absolute", top: 0, right: 0, bottom: 0, width: 300, zIndex: 20,
      background: "var(--th-bg-surface)", borderLeft: "1px solid var(--th-border)",
      display: "flex", flexDirection: "column", overflow: "hidden",
      boxShadow: "-8px 0 24px rgba(0,0,0,0.3)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderBottom: "1px solid var(--th-border)",
        background: "rgba(0,0,0,0.2)", flexShrink: 0,
      }}>
        <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: "var(--th-text-primary)", letterSpacing: "0.04em" }}>
          ? {t({ ko: "Image Studio 가이드", en: "Image Studio Guide", ja: "ガイド", zh: "使用指南" })}
        </span>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>

        <GuideSection icon="🔌" title={t({ ko: "프로바이더 설정", en: "Provider Setup", ja: "プロバイダ設定", zh: "提供商设置" })}>
          <p>{t({ ko: "이미지 생성에는 이미지 API를 지원하는 프로바이더가 필요합니다. Claude·Ollama 등 텍스트 전용 모델은 사용 불가합니다.", en: "Image generation requires a provider with an image API. Text-only models like Claude or Ollama are not supported.", ja: "画像生成には画像APIに対応したプロバイダが必要です。", zh: "图像生成需要支持图像API的提供商，纯文本模型不支持。" })}</p>
          <ul>
            <li><b>OpenAI</b> — DALL-E 3, DALL-E 2</li>
            <li><b>Azure OpenAI</b> — DALL-E 3</li>
            <li><b>Together.ai</b> — Flux, SD-XL</li>
            <li>{t({ ko: "로컬 Stable Diffusion", en: "Local Stable Diffusion", ja: "ローカルSD", zh: "本地SD" })} — AUTOMATIC1111 / ComfyUI</li>
          </ul>
          <Callout type="tip">
            {t({ ko: "Together.ai는 무료 크레딧 제공. OpenAI 없이 시작 가능.", en: "Together.ai offers free credits — no OpenAI account needed.", ja: "Together.aiは無料クレジットあり。", zh: "Together.ai提供免费积分，无需OpenAI账号。" })}
          </Callout>
        </GuideSection>

        <GuideSection icon="➕" title={t({ ko: "프로바이더 추가하기", en: "Adding a Provider", ja: "プロバイダの追加", zh: "添加提供商" })}>
          <ol>
            <li>{t({ ko: "Settings (g s) 열기", en: "Open Settings (g s)", ja: "Settings(g s)を開く", zh: "打开Settings(g s)" })}</li>
            <li>{t({ ko: "API 제공자 탭 선택", en: "Go to API Providers tab", ja: "APIプロバイダタブを選択", zh: "选择API提供商选项卡" })}</li>
            <li>{t({ ko: "＋ 추가 → 유형·이름·API 키·Base URL 입력", en: "+ Add → enter type, name, API key, Base URL", ja: "+追加 → 種類・名前・APIキー・Base URLを入力", zh: "+添加 → 输入类型、名称、API密钥、Base URL" })}</li>
            <li>{t({ ko: "연결 테스트 클릭 → 모델 목록 자동 로드", en: "Click Test Connection → models load automatically", ja: "接続テストをクリック → モデルリスト自動読み込み", zh: "点击测试连接 → 自动加载模型列表" })}</li>
            <li>{t({ ko: "Image Studio를 열면 해당 프로바이더가 표시됨", en: "Reopen Image Studio — provider appears in the list", ja: "Image Studioを開くとプロバイダが表示される", zh: "重新打开图像工作室，提供商将显示在列表中" })}</li>
          </ol>
        </GuideSection>

        <GuideSection icon="✦" title={t({ ko: "이미지 생성", en: "Generating Images", ja: "画像の生成", zh: "生成图像" })}>
          <ul>
            <li>{t({ ko: "프롬프트 입력 후 ▶ 생성 또는 Ctrl+Enter", en: "Enter a prompt → ▶ Generate or Ctrl+Enter", ja: "プロンプト入力後 ▶ 生成またはCtrl+Enter", zh: "输入提示词 → ▶生成或Ctrl+Enter" })}</li>
            <li>{t({ ko: "크기·품질·스타일은 좌측 패널에서 설정", en: "Set size, quality, style in the left panel", ja: "サイズ・品質・スタイルは左パネルで設定", zh: "在左侧面板设置尺寸、质量和风格" })}</li>
            <li>{t({ ko: "DALL-E 3: HD·Vivid/Natural 옵션 지원", en: "DALL-E 3: supports HD · Vivid/Natural options", ja: "DALL-E 3: HD・Vivid/Naturalオプション対応", zh: "DALL-E 3：支持HD·Vivid/Natural选项" })}</li>
          </ul>
        </GuideSection>

        <GuideSection icon="↓" title={t({ ko: "이미지 저장", en: "Saving Images", ja: "画像の保存", zh: "保存图像" })}>
          <p>{t({ ko: "생성된 이미지는 서버에 자동 저장됩니다. 로컬 저장 방법:", en: "Images are auto-saved on the server. To download locally:", ja: "生成画像はサーバーに自動保存されます。ローカル保存方法:", zh: "生成的图像自动保存在服务器上。本地保存方式：" })}</p>
          <ul>
            <li>{t({ ko: "이미지 우상단 ↓ 버튼", en: "↓ button on the image top-right", ja: "画像右上の↓ボタン", zh: "图像右上角↓按钮" })}</li>
            <li>{t({ ko: "좌측 패널 Output → ↓ 이미지 저장", en: "Left panel Output → ↓ Save Image", ja: "左パネルOutput → ↓画像を保存", zh: "左侧面板Output → ↓保存图像" })}</li>
            <li>{t({ ko: "Gallery 탭 → 우측 패널 → ↓ 이미지 저장", en: "Gallery tab → right panel → ↓ Save Image", ja: "Galleryタブ → 右パネル → ↓画像を保存", zh: "画廊选项卡 → 右侧面板 → ↓保存图像" })}</li>
          </ul>
        </GuideSection>

        <GuideSection icon="⊞" title={t({ ko: "갤러리", en: "Gallery", ja: "ギャラリー", zh: "画廊" })}>
          <ul>
            <li>{t({ ko: "생성한 모든 이미지 자동 수집", en: "All generated images collected automatically", ja: "生成したすべての画像を自動収集", zh: "自动收集所有生成的图像" })}</li>
            <li>{t({ ko: "프롬프트 검색으로 빠르게 찾기", en: "Search by prompt to find images quickly", ja: "プロンプト検索で素早く検索", zh: "通过提示词搜索快速查找" })}</li>
            <li>{t({ ko: "클릭 → 상세 정보 (모델·해상도·생성일)", en: "Click → details (model, resolution, date)", ja: "クリック → 詳細情報", zh: "点击 → 查看详情" })}</li>
            <li>{t({ ko: "삭제 시 서버 파일도 함께 제거", en: "Deleting removes the server file too", ja: "削除するとサーバーファイルも削除", zh: "删除时同时移除服务器文件" })}</li>
          </ul>
        </GuideSection>

        <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 16, textAlign: "center" }}>
          {t({ ko: "전체 가이드: 바탕화면 ? 키", en: "Full guide: press ? on desktop", ja: "全ガイド: デスクトップで?キー", zh: "完整指南：在桌面按?键" })}
        </div>
      </div>
    </div>
  );
}

function GuideSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: "var(--th-text-primary)", letterSpacing: "0.04em" }}>{title}</span>
      </div>
      <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-secondary)", lineHeight: 1.7, paddingLeft: 4 }}>
        {children}
      </div>
    </div>
  );
}

function Callout({ type, children }: { type: "tip" | "info" | "warn"; children: React.ReactNode }) {
  const colors: Record<string, string> = { tip: "#30d158", info: "#0a84ff", warn: "#ff9f0a" };
  const color = colors[type];
  return (
    <div style={{
      margin: "8px 0", padding: "7px 10px",
      background: `${color}14`, border: `1px solid ${color}40`,
      borderRadius: 4, fontFamily: mono, fontSize: 9, color, lineHeight: 1.6,
    }}>
      {type === "tip" ? "💡 " : type === "warn" ? "⚠️ " : "ℹ️ "}{children}
    </div>
  );
}

export default function ImageStudioWindow() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("generate");
  const [galleryRefresh, setGalleryRefresh] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "generate", icon: "✦", label: t({ ko: "생성", en: "Generate", ja: "生成", zh: "生成" }) },
    { id: "gallery",  icon: "⊞", label: t({ ko: "갤러리", en: "Gallery", ja: "ギャラリー", zh: "画廊" }) },
  ];

  return (
    <AppWindow
      windowType="image-studio"
      title={t({ ko: "Image Studio", en: "Image Studio", ja: "イメージスタジオ", zh: "图像工作室" })}
      emoji={<ImageStudioIcon />}
      defaultWidth={1100}
      defaultHeight={720}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--th-bg-primary)" }}>

        {/* Tab bar */}
        <div style={{
          display: "flex", alignItems: "stretch",
          borderBottom: "1px solid var(--th-border)", flexShrink: 0,
          background: "rgba(0,0,0,0.2)",
        }}>
          {tabs.map((tb) => {
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 18px",
                  background: active ? "var(--th-bg-primary)" : "transparent",
                  border: "none",
                  borderRight: "1px solid var(--th-border)",
                  borderBottom: active ? "1px solid var(--th-bg-primary)" : "1px solid transparent",
                  marginBottom: active ? -1 : 0,
                  fontFamily: mono, fontSize: 10, fontWeight: active ? 700 : 400,
                  color: active ? "var(--th-text-primary)" : "var(--th-text-muted)",
                  cursor: "pointer", letterSpacing: "0.06em",
                  transition: "color 0.12s, background 0.12s",
                }}
              >
                <span style={{ fontSize: 9, opacity: 0.7 }}>{tb.icon}</span>
                {tb.label}
              </button>
            );
          })}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* ? 가이드 버튼 */}
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            title={t({ ko: "Image Studio 가이드", en: "Image Studio Guide", ja: "ガイド", zh: "使用指南" })}
            style={{
              padding: "0 14px",
              background: showGuide ? "rgba(236,72,153,0.15)" : "transparent",
              border: "none",
              borderLeft: "1px solid var(--th-border)",
              borderBottom: "1px solid transparent",
              fontFamily: mono, fontSize: 13, fontWeight: 700,
              color: showGuide ? "#ec4899" : "var(--th-text-muted)",
              cursor: "pointer",
              transition: "color 0.12s, background 0.12s",
            }}
          >
            ?
          </button>
        </div>

        {/* Content area (relative for guide overlay) */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {tab === "generate" && (
            <GenerateTab
              onGenerated={() => setGalleryRefresh((n) => n + 1)}
              onGoGallery={() => setTab("gallery")}
            />
          )}
          {tab === "gallery" && (
            <GalleryTab refreshTrigger={galleryRefresh} />
          )}

          {/* Guide panel overlay */}
          {showGuide && <GuidePanel onClose={() => setShowGuide(false)} />}
        </div>
      </div>
    </AppWindow>
  );
}
