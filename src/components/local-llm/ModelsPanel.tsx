import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

interface LocalModel {
  name: string;
  display_name: string;
  backend: string;
  size_bytes: number;
  size_label: string;
  running: boolean;
  vram_usage_bytes?: number;
  modified_at?: number;
}

interface GalleryModel {
  name: string;
  display_name: string;
  vendor: string;
  size_label: string;
  context_length: number;
  description: string;
  tags: string[];
  min_ram_gb: number;
  min_vram_gb: number;
}

interface HardwareInfo {
  ram_total_gb: number;
  vram_free_gb: number | null; // null = no GPU
}

type Compat = "gpu" | "cpu" | "none" | "unknown";

interface PullProgress {
  model: string;
  status: string;  // "downloading" | "done" | "error" | Ollama status string
  percent: number;
  error?: string;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, opts);
  return res.json();
}

type SubTab = "installed" | "gallery";

export default function ModelsPanel() {
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<SubTab>("installed");
  const [models, setModels] = useState<LocalModel[]>([]);
  const [gallery, setGallery] = useState<GalleryModel[]>([]);
  const [gallerySearch, setGallerySearch] = useState("");
  const [diskLabel, setDiskLabel] = useState("0 B");
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState<Record<string, PullProgress>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [hw, setHw] = useState<HardwareInfo | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/local-llm/models");
      if (data.ok) {
        setModels(data.models);
        setDiskLabel(data.disk_used_label);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGallery = useCallback(async () => {
    const data = await apiFetch("/api/local-llm/models/gallery");
    if (data.ok) setGallery(data.models);
  }, []);

  const loadHardware = useCallback(async () => {
    try {
      const data = await apiFetch("/api/local-llm/metrics");
      if (data.ok) {
        const GB = 1073741824;
        setHw({
          ram_total_gb: (data.ram?.total_bytes ?? 0) / GB,
          vram_free_gb: data.gpu ? (data.gpu.vram_free_bytes ?? 0) / GB : null,
        });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadModels();
    loadGallery();
    loadHardware();
    const ws = new WebSocket(`ws://${window.location.host}`);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { type: string; payload: PullProgress };
        if (msg.type === "local_llm_pull_progress") {
          const p = msg.payload;
          setPulling((prev) => {
            if (p.status === "done") {
              const next = { ...prev };
              delete next[p.model];
              loadModels();
              return next;
            }
            // "error" or "downloading" — keep in state so card shows it
            return { ...prev, [p.model]: p };
          });
        }
      } catch { /* skip */ }
    };
    return () => { ws.close(); };
  }, [loadModels, loadGallery, loadHardware]);

  const handleInstall = async (modelName: string) => {
    setPulling((prev) => ({ ...prev, [modelName]: { model: modelName, status: "downloading", percent: 0 } }));
    await apiFetch("/api/local-llm/models/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backend: "ollama", model_name: modelName }),
    });
  };

  const handleDelete = async (modelName: string) => {
    setConfirmDelete(null);
    await apiFetch(`/api/local-llm/models/${encodeURIComponent(modelName)}`, { method: "DELETE" });
    await loadModels();
  };

  const installedNames = new Set(models.map((m) => m.name));

  function getCompat(m: GalleryModel): Compat {
    if (!hw) return "unknown";
    const canRunGpu = hw.vram_free_gb !== null && hw.vram_free_gb >= m.min_vram_gb;
    const canRunCpu = hw.ram_total_gb >= m.min_ram_gb;
    if (canRunGpu) return "gpu";
    if (canRunCpu) return "cpu";
    return "none";
  }
  const filteredGallery = gallerySearch.trim()
    ? gallery.filter((m) =>
        m.display_name.toLowerCase().includes(gallerySearch.toLowerCase()) ||
        m.vendor.toLowerCase().includes(gallerySearch.toLowerCase()) ||
        m.tags.some((tag) => tag.toLowerCase().includes(gallerySearch.toLowerCase())) ||
        m.description.toLowerCase().includes(gallerySearch.toLowerCase())
      )
    : gallery;

  // Recommended: best-fit models for current hardware, excluding already installed
  const recommendedModels: GalleryModel[] = hw
    ? (() => {
        const hasGpu = hw.vram_free_gb !== null && hw.vram_free_gb > 0;
        const runnable = gallery
          .filter((m) => !installedNames.has(m.name))
          .filter((m) => getCompat(m) !== "none");
        if (hasGpu) {
          // GPU: largest model that still fits in VRAM (sort desc by vram req)
          const gpuFit = runnable
            .filter((m) => getCompat(m) === "gpu")
            .sort((a, b) => b.min_vram_gb - a.min_vram_gb)
            .slice(0, 4);
          return gpuFit.length > 0 ? gpuFit : runnable.sort((a, b) => b.min_ram_gb - a.min_ram_gb).slice(0, 4);
        }
        // CPU only: largest model that fits in RAM
        return runnable.sort((a, b) => b.min_ram_gb - a.min_ram_gb).slice(0, 4);
      })()
    : [];

  const subTabLabel = (key: SubTab) =>
    key === "installed"
      ? t({ ko: "내 모델", en: "My Models", ja: "マイモデル", zh: "我的模型" })
      : t({ ko: "모델 라이브러리", en: "Model Library", ja: "モデルライブラリ", zh: "模型库" });

  return (
    <div>
      {/* Header with sub-tab bar */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--th-border)", marginBottom: 14 }}>
        {(["installed", "gallery"] as SubTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSubTab(tab)}
            style={{
              ...mono,
              fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase",
              padding: "7px 14px",
              background: "transparent",
              color: subTab === tab ? "var(--th-accent)" : "var(--th-text-muted)",
              border: "none",
              borderBottom: subTab === tab ? "2px solid var(--th-accent)" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: subTab === tab ? 700 : 400,
            }}
          >
            {subTabLabel(tab)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", paddingRight: 4 }}>
          {t({ ko: "디스크 사용:", en: "Disk used:", ja: "ディスク使用:", zh: "磁盘使用:" })}{" "}
          <span style={{ color: "var(--th-accent)" }}>{diskLabel}</span>
        </span>
      </div>

      {/* My Models */}
      {subTab === "installed" && (
        <div>
          {loading ? (
            <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>
              {t({ ko: "모델 로딩 중...", en: "Loading models...", ja: "モデル読み込み中...", zh: "加载模型中..." })}
            </div>
          ) : models.length === 0 ? (
            <div style={{
              ...mono, textAlign: "center", padding: "32px 20px",
              border: "1px dashed var(--th-border)", borderRadius: 0,
              color: "var(--th-text-muted)",
            }}>
              <div style={{ fontSize: 11, marginBottom: 8 }}>
                {t({ ko: "설치된 모델 없음.", en: "No models installed yet.", ja: "モデル未インストール.", zh: "尚未安装模型." })}
              </div>
              <div style={{ fontSize: 11, color: "var(--th-text-secondary)" }}>
                {t({ ko: "모델 라이브러리 탭에서 모델을 검색하고 설치하세요.", en: "Go to the Model Library tab to browse and install models.", ja: "モデルライブラリタブでモデルを検索・インストールしてください.", zh: "请前往模型库选项卡浏览并安装模型." })}
              </div>
            </div>
          ) : (
            <div style={{ border: "1px solid var(--th-border)", borderRadius: 0 }}>
              {/* Table header */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 80px 90px 100px",
                padding: "6px 12px",
                background: "var(--th-bg-surface, #1a1a1a)",
                borderBottom: "1px solid var(--th-border)",
              }}>
                {[
                  t({ ko: "모델", en: "Model", ja: "モデル", zh: "模型" }),
                  t({ ko: "크기", en: "Size", ja: "サイズ", zh: "大小" }),
                  t({ ko: "상태", en: "Status", ja: "状態", zh: "状态" }),
                  "",
                ].map((h, i) => (
                  <span key={i} style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)",
                    letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {models.map((m) => (
                <div
                  key={m.name}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 80px 90px 100px",
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--th-border)",
                    alignItems: "center",
                    background: m.running ? "rgba(245,158,11,0.03)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!m.running) (e.currentTarget as HTMLElement).style.background = "var(--th-hover-overlay-subtle)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = m.running ? "rgba(245,158,11,0.03)" : "transparent"; }}
                >
                  <span style={{ ...mono, fontSize: 11, fontWeight: 600,
                    color: "var(--th-text-primary)", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.name}
                  </span>
                  <span style={{ ...mono, fontSize: 11, color: "var(--th-text-secondary)" }}>
                    {m.size_label}
                  </span>
                  <span>
                    {m.running ? (
                      <span style={{ ...mono, fontSize: 10, padding: "2px 6px",
                        border: "1px solid #3fb950", color: "#3fb950",
                        background: "rgba(63,185,80,0.08)" }}>
                        {t({ ko: "실행 중", en: "Active", ja: "実行中", zh: "运行中" })}
                      </span>
                    ) : (
                      <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
                        {t({ ko: "준비됨", en: "Ready", ja: "準備完了", zh: "就绪" })}
                      </span>
                    )}
                  </span>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    {confirmDelete === m.name ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(m.name)}
                          style={{ ...mono, fontSize: 9, padding: "2px 6px", borderRadius: 0,
                            border: "1px solid #f85149", background: "rgba(248,81,73,0.1)",
                            color: "#f85149", cursor: "pointer" }}>
                          {t({ ko: "확인", en: "Confirm", ja: "確認", zh: "确认" })}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          style={{ ...mono, fontSize: 9, padding: "2px 6px", borderRadius: 0,
                            border: "1px solid var(--th-border)", background: "transparent",
                            color: "var(--th-text-muted)", cursor: "pointer" }}>
                          {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(m.name)}
                        style={{ ...mono, fontSize: 10, padding: "3px 8px", borderRadius: 0,
                          border: "1px solid var(--th-border)", background: "transparent",
                          color: "var(--th-text-muted)", cursor: "pointer" }}>
                        {t({ ko: "삭제", en: "Remove", ja: "削除", zh: "删除" })}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gallery */}
      {subTab === "gallery" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Recommended section */}
          {recommendedModels.length > 0 && !gallerySearch.trim() && (
            <div style={{
              border: "1px solid rgba(245,158,11,0.25)",
              background: "rgba(245,158,11,0.03)",
              borderRadius: 0,
              padding: "12px 14px",
            }}>
              <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                textTransform: "uppercase", color: "var(--th-accent)", marginBottom: 4 }}>
                ⭐ {t({ ko: "내 PC 추천 모델", en: "Recommended for your PC", ja: "おすすめモデル", zh: "推荐模型" })}
              </div>
              <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 10 }}>
                {hw?.vram_free_gb
                  ? t({ ko: `GPU ${hw.vram_free_gb.toFixed(1)} GB VRAM 기준 최적 모델`, en: `Best fit for your GPU (${hw.vram_free_gb.toFixed(1)} GB VRAM free)`, ja: `GPU ${hw.vram_free_gb.toFixed(1)} GB VRAMに最適なモデル`, zh: `适合您GPU (${hw.vram_free_gb.toFixed(1)} GB VRAM) 的最佳模型` })
                  : t({ ko: `RAM ${hw?.ram_total_gb.toFixed(0)} GB 기준 최적 모델`, en: `Best fit for your RAM (${hw?.ram_total_gb.toFixed(0)} GB)`, ja: `RAM ${hw?.ram_total_gb.toFixed(0)} GBに最適なモデル`, zh: `适合您RAM (${hw?.ram_total_gb.toFixed(0)} GB) 的最佳模型` })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {recommendedModels.map((m) => (
                  <GalleryCard
                    key={m.name}
                    model={m}
                    installed={installedNames.has(m.name)}
                    pulling={pulling[m.name]}
                    compat={getCompat(m)}
                    hw={hw}
                    recommended
                    onInstall={() => handleInstall(m.name)}
                    onDismissError={() => setPulling((p) => { const n = { ...p }; delete n[m.name]; return n; })}
                    labelInstall={t({ ko: "설치", en: "Install", ja: "インストール", zh: "安装" })}
                    labelInstalled={t({ ko: "설치됨", en: "Installed", ja: "インストール済み", zh: "已安装" })}
                    labelInstalling={t({ ko: "설치 중", en: "Installing", ja: "インストール中", zh: "安装中" })}
                    labelContext={t({ ko: "k 컨텍스트", en: "k context", ja: "kコンテキスト", zh: "k上下文" })}
                    labelError={t({ ko: "설치 실패", en: "Install failed", ja: "インストール失敗", zh: "安装失败" })}
                    labelDismiss={t({ ko: "닫기", en: "Dismiss", ja: "閉じる", zh: "关闭" })}
                    labelRetry={t({ ko: "재시도", en: "Retry", ja: "再試行", zh: "重试" })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Search bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              value={gallerySearch}
              onChange={(e) => setGallerySearch(e.target.value)}
              placeholder={t({ ko: "모델 검색...", en: "Search models...", ja: "モデルを検索...", zh: "搜索模型..." })}
              style={{
                fontFamily: "var(--th-font-mono)",
                fontSize: 11,
                flex: 1,
                padding: "6px 10px",
                background: "var(--th-bg-surface, #1a1a1a)",
                border: "1px solid var(--th-input-border, var(--th-border))",
                borderRadius: 0,
                color: "var(--th-text-primary)",
                outline: "none",
              }}
            />
            <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", whiteSpace: "nowrap" }}>
              {filteredGallery.length} / {gallery.length}
            </span>
          </div>

          <div style={{ ...mono, fontSize: 11, color: "var(--th-text-secondary)" }}>
            {t({ ko: "Ollama 레지스트리에서 모델을 직접 탐색하고 설치하세요. 큰 모델일수록 더 좋은 결과를 내지만 더 많은 메모리가 필요합니다.", en: "Browse and install models directly from Ollama's registry. Larger models produce better results but require more memory.", ja: "Ollamaのレジストリからモデルを直接閲覧・インストールできます。大きなモデルはより良い結果を出しますが、より多くのメモリが必要です。", zh: "直接从Ollama注册表浏览并安装模型。更大的模型效果更好，但需要更多内存。" })}
          </div>

          {/* Gallery grid */}
          <div style={{ paddingRight: 4 }}>
            {filteredGallery.length === 0 ? (
              <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", padding: "24px 0", textAlign: "center" }}>
                {t({ ko: "검색 결과 없음.", en: "No models match your search.", ja: "検索結果がありません.", zh: "没有匹配的模型." })}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {filteredGallery.map((m) => (
                  <GalleryCard
                    key={m.name}
                    model={m}
                    installed={installedNames.has(m.name)}
                    pulling={pulling[m.name]}
                    compat={getCompat(m)}
                    hw={hw}
                    onInstall={() => handleInstall(m.name)}
                    onDismissError={() => setPulling((p) => { const n = { ...p }; delete n[m.name]; return n; })}
                    labelInstall={t({ ko: "설치", en: "Install", ja: "インストール", zh: "安装" })}
                    labelInstalled={t({ ko: "설치됨", en: "Installed", ja: "インストール済み", zh: "已安装" })}
                    labelInstalling={t({ ko: "설치 중", en: "Installing", ja: "インストール中", zh: "安装中" })}
                    labelContext={t({ ko: "k 컨텍스트", en: "k context", ja: "kコンテキスト", zh: "k上下文" })}
                    labelError={t({ ko: "설치 실패", en: "Install failed", ja: "インストール失敗", zh: "安装失败" })}
                    labelDismiss={t({ ko: "닫기", en: "Dismiss", ja: "閉じる", zh: "关闭" })}
                    labelRetry={t({ ko: "재시도", en: "Retry", ja: "再試行", zh: "重试" })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const COMPAT_STYLE: Record<Compat, { color: string; bg: string; border: string; dot: string }> = {
  gpu:     { color: "#3fb950", bg: "rgba(63,185,80,0.10)",   border: "rgba(63,185,80,0.35)",   dot: "#3fb950" },
  cpu:     { color: "#f59e0b", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.35)",  dot: "#f59e0b" },
  none:    { color: "#f85149", bg: "rgba(248,81,73,0.10)",   border: "rgba(248,81,73,0.35)",   dot: "#f85149" },
  unknown: { color: "var(--th-text-muted)", bg: "transparent", border: "transparent", dot: "transparent" },
};

function CompatBadge({ compat, model, hw }: { compat: Compat; model: GalleryModel; hw: HardwareInfo | null }) {
  const { t } = useI18n();
  if (compat === "unknown") return null;
  const s = COMPAT_STYLE[compat];

  const labels: Record<Compat, string> = {
    gpu:     t({ ko: "GPU 가능", en: "GPU OK", ja: "GPU可", zh: "GPU可用" }),
    cpu:     t({ ko: "CPU 가능", en: "CPU only", ja: "CPUのみ", zh: "仅CPU" }),
    none:    t({ ko: "메모리 부족", en: "Low memory", ja: "メモリ不足", zh: "内存不足" }),
    unknown: "",
  };

  const tooltipLines: Record<Compat, string> = {
    gpu:     t({ ko: `VRAM ${hw?.vram_free_gb?.toFixed(1)} GB 여유 (필요: ${model.min_vram_gb} GB)`, en: `VRAM ${hw?.vram_free_gb?.toFixed(1)} GB free (need: ${model.min_vram_gb} GB)` }),
    cpu:     t({ ko: `RAM ${hw?.ram_total_gb?.toFixed(0)} GB (필요: ${model.min_ram_gb} GB) — CPU 추론은 느릴 수 있습니다`, en: `RAM ${hw?.ram_total_gb?.toFixed(0)} GB (need: ${model.min_ram_gb} GB) — CPU inference may be slow` }),
    none:    t({ ko: `RAM ${hw?.ram_total_gb?.toFixed(0)} GB / 필요: ${model.min_ram_gb} GB RAM 또는 ${model.min_vram_gb} GB VRAM`, en: `RAM ${hw?.ram_total_gb?.toFixed(0)} GB / need: ${model.min_ram_gb} GB RAM or ${model.min_vram_gb} GB VRAM` }),
    unknown: "",
  };

  return (
    <div
      title={tooltipLines[compat]}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 7px",
        border: `1px solid ${s.border}`,
        background: s.bg,
        fontFamily: "var(--th-font-mono)",
        fontSize: 9, letterSpacing: "0.05em",
        color: s.color,
        flexShrink: 0,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {labels[compat]}
    </div>
  );
}

function GalleryCard({
  model, installed, pulling, compat, hw, recommended,
  onInstall, onDismissError,
  labelInstall, labelInstalled, labelInstalling, labelContext,
  labelError, labelDismiss, labelRetry,
}: {
  model: GalleryModel;
  installed: boolean;
  pulling?: PullProgress;
  compat: Compat;
  hw: HardwareInfo | null;
  recommended?: boolean;
  onInstall: () => void;
  onDismissError: () => void;
  labelInstall: string;
  labelInstalled: string;
  labelInstalling: string;
  labelContext: string;
  labelError: string;
  labelDismiss: string;
  labelRetry: string;
}) {
  const btnBase: React.CSSProperties = {
    fontFamily: "var(--th-font-mono)",
    fontSize: 10, letterSpacing: "0.04em",
    padding: "6px 0", borderRadius: 0,
    cursor: "pointer",
  };

  return (
    <div style={{
      fontFamily: "var(--th-font-mono)",
      borderRadius: 10,
      border: installed
        ? "1px solid rgba(245,158,11,0.28)"
        : recommended
          ? "1px solid rgba(245,158,11,0.45)"
          : "1px solid var(--th-border)",
      background: recommended ? "rgba(245,158,11,0.05)" : "var(--th-card-bg, #181818)",
      padding: "12px 14px",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header row: vendor + compat badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <div style={{ fontSize: 10, color: "var(--th-text-muted)", letterSpacing: "0.04em" }}>
          {model.vendor}
        </div>
        <CompatBadge compat={compat} model={model} hw={hw} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--th-text-primary)", marginBottom: 4 }}>
        {model.display_name}
      </div>
      <div style={{ fontSize: 11, color: "var(--th-text-secondary)", marginBottom: 8, lineHeight: 1.5, flex: 1 }}>
        {model.description}
      </div>
      <div style={{ fontSize: 11, color: "var(--th-text-muted)", marginBottom: 10,
        display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: "var(--th-accent)" }}>{model.size_label}</span>
        <span>{(model.context_length / 1000).toFixed(0)}{labelContext}</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
        {model.tags.map((tag) => (
          <span key={tag} style={{
            fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase",
            padding: "2px 6px", borderRadius: 0,
            border: "1px solid var(--th-border)", color: "var(--th-text-muted)",
          }}>{tag}</span>
        ))}
      </div>

      {/* Progress / error block */}
      {pulling && pulling.status === "error" ? (
        <div style={{ marginBottom: 8, padding: "8px 10px", border: "1px solid rgba(248,81,73,0.4)",
          background: "rgba(248,81,73,0.07)", borderRadius: 0 }}>
          <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 10, color: "#f85149",
            fontWeight: 700, marginBottom: 4 }}>
            ✕ {labelError}
          </div>
          {pulling.error && (
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 10, color: "#f85149",
              opacity: 0.8, wordBreak: "break-all", marginBottom: 6 }}>
              {pulling.error}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={onInstall}
              style={{ ...btnBase, flex: 1, border: "1px solid var(--th-accent)",
                background: "rgba(245,158,11,0.08)", color: "var(--th-accent)" }}>
              {labelRetry}
            </button>
            <button type="button" onClick={onDismissError}
              style={{ ...btnBase, padding: "6px 10px", border: "1px solid var(--th-border)",
                background: "transparent", color: "var(--th-text-muted)" }}>
              {labelDismiss}
            </button>
          </div>
        </div>
      ) : pulling ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ height: 3, background: "var(--th-bg-surface, #1a1a1a)",
            borderRadius: 0, overflow: "hidden", marginBottom: 4 }}>
            <div style={{ height: "100%", width: `${pulling.percent}%`,
              background: "var(--th-terminal-info, #58a6ff)",
              transition: "width 0.3s linear" }} />
          </div>
          <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 10,
            color: "var(--th-terminal-info, #58a6ff)", display: "flex",
            justifyContent: "space-between" }}>
            <span style={{ opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap", maxWidth: "70%" }}>
              {pulling.status !== "downloading" ? pulling.status : labelInstalling}
            </span>
            <span>{pulling.percent}%</span>
          </div>
        </div>
      ) : null}

      {/* Action buttons */}
      {installed ? (
        /* Installed: show label only */
        <div style={{
          padding: "6px 0", textAlign: "center",
          border: "1px solid rgba(245,158,11,0.28)",
          background: "rgba(245,158,11,0.08)",
          color: "var(--th-accent)", fontSize: 10, letterSpacing: "0.04em",
        }}>
          {labelInstalled}
        </div>
      ) : pulling && pulling.status !== "error" ? (
        /* Downloading */
        <div style={{
          ...btnBase,
          width: "100%", textAlign: "center",
          border: "1px solid var(--th-border)", background: "transparent",
          color: "var(--th-text-muted)", cursor: "default",
        }}>
          {labelInstalling} {pulling.percent}%
        </div>
      ) : !pulling ? (
        /* Install button */
        <button
          type="button"
          onClick={onInstall}
          style={{
            ...btnBase,
            width: "100%",
            border: "1px solid var(--th-border)",
            background: "var(--th-bg-surface, #1a1a1a)",
            color: "var(--th-text-secondary)",
          }}
        >
          {labelInstall}
        </button>
      ) : null}
    </div>
  );
}
