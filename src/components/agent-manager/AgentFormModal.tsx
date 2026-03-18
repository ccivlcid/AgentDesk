import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Department } from "../../types";
import { localeName, useI18n } from "../../i18n";
import * as api from "../../api";
import { CLI_PROVIDERS, ROLE_BADGE, ROLE_LABEL, ROLES } from "./constants";
import EmojiPicker from "./EmojiPicker";
import type { FormData } from "./types";
import { PersonaCatalog } from "../agent-persona/PersonaCatalog";
import { getPersonaById } from "../../data/personas";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea, useToast } from "../ui";
import AppWindow from "../windows/AppWindow";
import { getNotionInfo, getObsidianInfo, searchNotionPages, searchObsidianFiles } from "../../api/synapse";
import type { KbSourceRef, NotionPage, ObsidianNote } from "../../api/synapse";

interface ApiProviderOption {
  id: string;
  name: string;
  type: string;
  base_url: string;
  models_cache: string[];
}

// ─── KB Sources Section ───────────────────────────────────────────────────────
function KbSourcesSection({
  sources,
  onChange,
  tr,
}: {
  sources: KbSourceRef[];
  onChange: (sources: KbSourceRef[]) => void;
  tr: (ko: string, en: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);
  const [obsidianConnected, setObsidianConnected] = useState(false);
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [obsidianFiles, setObsidianFiles] = useState<ObsidianNote[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([getNotionInfo(), getObsidianInfo()]).then(([n, o]) => {
      setNotionConnected(n.connected);
      setObsidianConnected(o.connected && o.mode === "local");
      const fetches: Promise<void>[] = [];
      if (n.connected) fetches.push(searchNotionPages("").then(setNotionPages).catch(() => {}));
      if (o.connected) fetches.push(searchObsidianFiles("").then(setObsidianFiles).catch(() => {}));
      return Promise.all(fetches);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open]);

  const isSelected = (type: KbSourceRef["type"], id: string) =>
    sources.some((s) => s.type === type && s.id === id);

  const toggle = (ref: KbSourceRef) => {
    if (isSelected(ref.type, ref.id)) {
      onChange(sources.filter((s) => !(s.type === ref.type && s.id === ref.id)));
    } else {
      onChange([...sources, ref]);
    }
  };

  const mono = "var(--th-font-mono)";

  return (
    <div style={{ borderTop: "1px solid var(--th-border)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-2"
        style={{ borderLeft: "3px solid var(--th-accent)", paddingLeft: "0.5rem" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest font-mono" style={{ color: "var(--th-text-muted)" }}>
            {tr("기본 지식 소스", "Default Knowledge Sources")}
          </span>
          {sources.length > 0 && (
            <span className="font-mono text-[9px] font-semibold" style={{ color: "var(--th-accent)", border: "1px solid var(--th-accent)40", borderRadius: 6, padding: "0 4px", background: "var(--th-accent)12" }}>
              {sources.length} {tr("개 연결됨", "attached")}
            </span>
          )}
        </div>
        <span className="font-mono text-[10px]" style={{ color: "var(--th-text-muted)", transform: open ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.1s linear" }}>▶</span>
      </button>

      {open && (
        <div style={{ marginTop: 8 }}>
          <p className="text-[10px] mb-2" style={{ fontFamily: mono, color: "var(--th-text-muted)" }}>
            {tr(
              "이 에이전트가 태스크를 실행할 때 선택한 문서들이 시스템 프롬프트에 자동으로 주입됩니다.",
              "Selected documents will be automatically injected into the system prompt when this agent runs tasks.",
            )}
          </p>

          {loading && <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>Loading...</div>}

          {/* Selected badges */}
          {sources.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
              {sources.map((s) => (
                <span key={`${s.type}:${s.id}`} style={{ fontFamily: mono, fontSize: 10, padding: "2px 8px", background: "rgba(245,158,11,0.12)", border: "1px solid var(--th-accent)", borderRadius: 0, color: "var(--th-accent)", cursor: "pointer" }} onClick={() => toggle(s)}>
                  {s.type === "notion_page" ? "📘" : s.type === "obsidian_file" ? "📓" : "🔬"} {s.label ?? s.id} ✕
                </span>
              ))}
            </div>
          )}

          {!notionConnected && !obsidianConnected && !loading && (
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
              {tr("설정 → SYNAPSE에서 Notion/Obsidian을 먼저 연결하세요.", "Connect Notion/Obsidian first in Settings → SYNAPSE.")}
            </div>
          )}

          {notionConnected && notionPages.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>// NOTION</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 140, overflowY: "auto" }}>
                {notionPages.map((p) => (
                  <button key={p.id} type="button" onClick={() => toggle({ type: "notion_page", id: p.id, label: p.title })}
                    style={{ fontFamily: mono, fontSize: 10, textAlign: "left", padding: "5px 8px", background: isSelected("notion_page", p.id) ? "rgba(245,158,11,0.12)" : "var(--th-bg-surface)", border: `1px solid ${isSelected("notion_page", p.id) ? "var(--th-accent)" : "var(--th-border)"}`, color: "var(--th-text-primary)", cursor: "pointer" }}>
                    {p.type === "database" ? "📊" : "📄"} {p.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {obsidianConnected && obsidianFiles.length > 0 && (
            <div>
              <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>// OBSIDIAN</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 140, overflowY: "auto" }}>
                {obsidianFiles.slice(0, 30).map((f) => (
                  <button key={f.path} type="button" onClick={() => toggle({ type: "obsidian_file", id: f.path, label: f.name })}
                    style={{ fontFamily: mono, fontSize: 10, textAlign: "left", padding: "5px 8px", background: isSelected("obsidian_file", f.path) ? "rgba(245,158,11,0.12)" : "var(--th-bg-surface)", border: `1px solid ${isSelected("obsidian_file", f.path) ? "var(--th-accent)" : "var(--th-border)"}`, color: "var(--th-text-primary)", cursor: "pointer" }}>
                    📓 {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AgentFormModal({
  isKo,
  locale,
  tr,
  form,
  setForm,
  departments,
  isEdit,
  saving,
  saveError,
  onSave,
  onClose,
  asWindow = false,
}: {
  isKo: boolean;
  locale: string;
  tr: (ko: string, en: string) => string;
  form: FormData;
  setForm: (f: FormData) => void;
  departments: Department[];
  isEdit: boolean;
  saving: boolean;
  saveError?: string | null;
  onSave: () => void;
  onClose: () => void;
  /** true이면 Modal 대신 독립 AppWindow로 렌더 */
  asWindow?: boolean;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [generatingPersona, setGeneratingPersona] = useState(false);
  const [showPersonaCatalog, setShowPersonaCatalog] = useState(false);
  const [apiProviders, setApiProviders] = useState<ApiProviderOption[]>([]);
  const [localModels, setLocalModels] = useState<Array<{ id: string; label: string; group: string; backend: string; model: string }>>([]);
  const [connectingLocal, setConnectingLocal] = useState(false);

  useEffect(() => {
    fetch("/api/api-providers")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setApiProviders(data.providers); })
      .catch(() => {});
    fetch("/api/local-llm/providers")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setLocalModels(data.providers); })
      .catch(() => {});
  }, []);

  const handleGeneratePersona = useCallback(async () => {
    if (!form.name.trim() || generatingPersona) return;
    setGeneratingPersona(true);
    try {
      const personality = await api.generatePersona({
        name: form.name.trim(),
        role: form.role,
        department_id: form.department_id || null,
        lang: isKo ? "ko" : "en",
      });
      if (personality) setForm({ ...form, personality });
    } catch (err) {
      console.error("Persona generation failed:", err);
      showToast(t({ ko: "페르소나 생성에 실패했습니다.", en: "Failed to generate persona.", ja: "ペルソナ生成に失敗しました。", zh: "人物角色生成失败。" }), "error");
    } finally {
      setGeneratingPersona(false);
    }
  }, [form, isKo, generatingPersona, setForm, showToast, t]);

  const selectStyle: React.CSSProperties = {
    background: "var(--th-input-bg)",
    borderColor: "var(--th-input-border)",
    color: "var(--th-text-primary)",
    borderRadius: 6,
  };

  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--th-font-mono)",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--th-text-muted)",
  };

  const title = isEdit ? tr("직원 정보 수정", "Edit Agent") : tr("신규 직원 채용", "Hire New Agent");
  const formFields = (
    <div className="space-y-5">
          {/* ── 기본 정보 ── */}
          <div>
            <div className="mb-3 pb-1" style={{ borderBottom: "1px solid var(--th-border)" }}>
              <span style={sectionLabel}>BASIC INFO</span>
            </div>

            {/* Avatar + 이름 */}
            <div className="flex items-start gap-4 mb-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      showToast(tr("이미지는 5MB 이하여야 합니다.", "Image must be under 5 MB."), "warning");
                      return;
                    }
                    const dataUrl = await fileToBase64(file);
                    setForm({ ...form, pendingAvatarDataUrl: dataUrl });
                  }}
                />
                <button
                  type="button"
                  title={tr("프로필 이미지 업로드", "Upload profile image")}
                  className="relative w-14 h-14 overflow-hidden flex items-center justify-center transition-all group"
                  style={{ background: "var(--th-bg-elevated)", border: "2px solid var(--th-input-border)", borderRadius: 8 }}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {form.pendingAvatarDataUrl ?? form.avatar_url ? (
                    <img
                      src={(form.pendingAvatarDataUrl ?? form.avatar_url)!}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">{form.avatar_emoji || "🤖"}</span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
                    {tr("변경", "Edit")}
                  </span>
                </button>
                {(form.pendingAvatarDataUrl ?? form.avatar_url) && (
                  <button
                    type="button"
                    className="text-[10px] transition-colors"
                    style={{ color: "var(--th-text-muted)" }}
                    onClick={() => setForm({ ...form, pendingAvatarDataUrl: null, avatar_url: null })}
                  >
                    {tr("제거", "Remove")}
                  </button>
                )}
              </div>

              {/* 이름 + 이모지 */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                    {tr("영문 이름", "Name")} <span style={{ color: "var(--th-danger-text)" }}>*</span>
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="DORO"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                    {tr("이모지", "Emoji")}
                  </label>
                  <EmojiPicker value={form.avatar_emoji} onChange={(emoji) => setForm({ ...form, avatar_emoji: emoji })} />
                </div>
              </div>
            </div>

            {/* 로캘 기반 현지 이름 */}
            {locale.startsWith("ko") && (
              <div className="mb-3">
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("한글 이름", "Korean Name")}
                </label>
                <Input value={form.name_ko} onChange={(e) => setForm({ ...form, name_ko: e.target.value })} placeholder="도로롱" />
              </div>
            )}
            {locale.startsWith("ja") && (
              <div className="mb-3">
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {t({ ko: "일본어 이름", en: "Japanese Name", ja: "日本語名", zh: "日语名" })}
                </label>
                <Input value={form.name_ja} onChange={(e) => setForm({ ...form, name_ja: e.target.value })} placeholder="ドロロン" />
              </div>
            )}
            {locale.startsWith("zh") && (
              <div className="mb-3">
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {t({ ko: "중국어 이름", en: "Chinese Name", ja: "中国語名", zh: "中文名" })}
                </label>
                <Input value={form.name_zh} onChange={(e) => setForm({ ...form, name_zh: e.target.value })} placeholder="多罗隆" />
              </div>
            )}

            {/* 소속 부서 + 직급 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("소속 부서", "Department")}
                </label>
                <select
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="w-full px-3 py-2 border text-sm outline-none transition-colors"
                  style={selectStyle}
                >
                  <option value="">{tr("— 미배정 —", "— Unassigned —")}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {localeName(locale, d)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("직급", "Role")}
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {ROLES.map((r) => {
                    const active = form.role === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setForm({ ...form, role: r })}
                        className={`py-1.5 text-xs font-mono font-medium border transition-all ${active ? ROLE_BADGE[r] : ""}`}
                        style={{
                          borderRadius: 6,
                          ...(!active ? { borderColor: "var(--th-input-border)", color: "var(--th-text-muted)" } : {}),
                        }}
                      >
                        {isKo ? ROLE_LABEL[r].ko : ROLE_LABEL[r].en}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── 고급 설정 ── */}
          <div>
            <div className="mb-3 pb-1" style={{ borderBottom: "1px solid var(--th-border)" }}>
              <span style={sectionLabel}>ADVANCED</span>
            </div>

            {/* CLI Provider */}
            <div className="mb-4">
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                {tr("CLI 도구", "CLI Provider")}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CLI_PROVIDERS.map((p) => {
                  const active = form.cli_provider === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setForm({ ...form, cli_provider: p })}
                      className="px-2.5 py-1.5 text-[11px] font-mono border transition-all"
                      style={{
                        borderRadius: 6,
                        ...(active
                          ? { background: "var(--th-accent-glow)", color: "var(--th-accent)", borderColor: "var(--th-border-accent)" }
                          : { borderColor: "var(--th-input-border)", color: "var(--th-text-muted)" }),
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Planning Phase Toggle — CLI 인터랙티브 전용 */}
            {["claude", "cursor", "codex", "gemini"].includes(form.cli_provider) && (
              <div className="mb-4">
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("기획 회의 단계", "Planning Phase")}
                </label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, enable_planning_phase: form.enable_planning_phase === 0 ? 1 : 0 })}
                  className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 border transition-all"
                  style={{
                    borderRadius: 6,
                    ...(form.enable_planning_phase !== 0
                      ? { background: "var(--th-accent-glow)", color: "var(--th-accent)", borderColor: "var(--th-border-accent)" }
                      : { borderColor: "var(--th-input-border)", color: "var(--th-text-muted)" }),
                  }}
                >
                  <span style={{ fontSize: 10 }}>{form.enable_planning_phase !== 0 ? "●" : "○"}</span>
                  {form.enable_planning_phase !== 0
                    ? tr("활성화 — 실행 전 플래닝 에이전트 자동 실행", "Enabled — auto-run planning agent before CLI")
                    : tr("비활성화 — CLI 바로 실행", "Disabled — open CLI immediately")}
                </button>
              </div>
            )}

            {/* API Provider (Local LLM / 외부 API) */}
            <div className="mb-4">
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                {t({ ko: "API 공급자 (선택)", en: "API Provider (optional)", ja: "APIプロバイダー (任意)", zh: "API提供商 (可选)" })}
              </label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select
                  value={form.api_provider_id ?? ""}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    const provider = apiProviders.find((p) => p.id === id);
                    const firstModel = provider?.models_cache[0] ?? null;
                    setForm({ ...form, api_provider_id: id, api_model: id ? (form.api_model || firstModel) : null });
                  }}
                  style={{
                    flex: 1,
                    fontFamily: "var(--th-font-mono)",
                    fontSize: 11,
                    padding: "5px 8px",
                    background: "var(--th-input-bg)",
                    border: "1px solid var(--th-input-border)",
                    borderRadius: 6,
                    color: form.api_provider_id ? "var(--th-text-primary)" : "var(--th-text-muted)",
                  }}
                >
                  <option value="">{t({ ko: "— CLI 기본값 사용 —", en: "— Use CLI default —", ja: "— CLIデフォルト使用 —", zh: "— 使用CLI默认 —" })}</option>
                  {apiProviders.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                  ))}
                </select>
              </div>

              {/* Model selection — shown when provider is selected */}
              {form.api_provider_id && (() => {
                const provider = apiProviders.find((p) => p.id === form.api_provider_id);
                if (!provider) return null;
                return (
                  <div style={{ marginTop: 6 }}>
                    {provider.models_cache.length > 0 ? (
                      <select
                        value={form.api_model ?? ""}
                        onChange={(e) => setForm({ ...form, api_model: e.target.value || null })}
                        style={{
                          width: "100%",
                          fontFamily: "var(--th-font-mono)",
                          fontSize: 11,
                          padding: "5px 8px",
                          background: "var(--th-input-bg)",
                          border: "1px solid var(--th-input-border)",
                          borderRadius: 6,
                          color: "var(--th-text-primary)",
                        }}
                      >
                        <option value="">{t({ ko: "모델 선택...", en: "Select model...", ja: "モデルを選択...", zh: "选择模型..." })}</option>
                        {provider.models_cache.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={form.api_model ?? ""}
                        onChange={(e) => setForm({ ...form, api_model: e.target.value || null })}
                        placeholder={t({ ko: "모델 이름 직접 입력 (예: llama3.2:3b)", en: "Enter model name (e.g. llama3.2:3b)", ja: "モデル名を入力 (例: llama3.2:3b)", zh: "输入模型名称 (例: llama3.2:3b)" })}
                        style={{ fontFamily: "var(--th-font-mono)", fontSize: 11 }}
                      />
                    )}
                    <p className="text-[10px] mt-1" style={{ color: "var(--th-text-muted)" }}>
                      {provider.base_url}
                      {provider.models_cache.length === 0 && (
                        <> — {t({ ko: "모델 목록을 로드하려면 설정 → API 공급자에서 연결 테스트를 실행하세요.", en: "Run a connection test in Settings → API Providers to load model list.", ja: "設定 → APIプロバイダーで接続テストを実行してモデルリストを読み込んでください。", zh: "在设置 → API提供商中运行连接测试以加载模型列表。" })}</>
                      )}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Local LLM Quick-Pick */}
            {localModels.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {t({ ko: "로컬 LLM (빠른 연결)", en: "Local LLM (quick connect)", ja: "ローカルLLM (クイック接続)", zh: "本地LLM (快速连接)" })}
                </label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <select
                    defaultValue=""
                    onChange={async (e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const item = localModels.find((m) => m.id === val);
                      if (!item) return;
                      setConnectingLocal(true);
                      try {
                        const r = await fetch("/api/local-llm/setup-provider", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ backend: item.backend }),
                        });
                        const data = await r.json() as { ok: boolean; provider_id?: string; error?: string };
                        if (data.ok && data.provider_id) {
                          setForm({ ...form, api_provider_id: data.provider_id, api_model: item.model });
                          // Refresh provider list so the new entry shows up
                          const pr = await fetch("/api/api-providers").then((res) => res.json());
                          if (pr.ok) setApiProviders(pr.providers);
                          showToast(t({ ko: `${item.group} — ${item.model} 연결됨`, en: `${item.group} — ${item.model} connected`, ja: `${item.group} — ${item.model} 接続済み`, zh: `${item.group} — ${item.model} 已连接` }), "success");
                        } else {
                          showToast(t({ ko: `연결 실패: ${data.error ?? "서비스가 실행 중인지 확인하세요"}`, en: `Connect failed: ${data.error ?? "Make sure the service is running"}`, ja: `接続失敗: ${data.error ?? "サービスが実行中か確認してください"}`, zh: `连接失败: ${data.error ?? "请确认服务正在运行"}` }), "error");
                        }
                      } catch {
                        showToast(t({ ko: "연결 중 오류 발생", en: "Connection error", ja: "接続エラー", zh: "连接错误" }), "error");
                      } finally {
                        setConnectingLocal(false);
                        e.target.value = "";
                      }
                    }}
                    disabled={connectingLocal}
                    style={{
                      flex: 1,
                      fontFamily: "var(--th-font-mono)",
                      fontSize: 11,
                      padding: "5px 8px",
                      background: "var(--th-input-bg)",
                      border: "1px solid var(--th-input-border)",
                      borderRadius: 6,
                      color: "var(--th-text-muted)",
                      opacity: connectingLocal ? 0.6 : 1,
                    }}
                  >
                    <option value="">{connectingLocal ? t({ ko: "연결 중...", en: "Connecting...", ja: "接続中...", zh: "连接中..." }) : t({ ko: "— 로컬 모델 선택 —", en: "— Select local model —", ja: "— ローカルモデルを選択 —", zh: "— 选择本地模型 —" })}</option>
                    {["Ollama", "LM Studio"].map((group) => {
                      const items = localModels.filter((m) => m.group === group);
                      if (items.length === 0) return null;
                      return (
                        <optgroup key={group} label={group}>
                          {items.map((m) => (
                            <option key={m.id} value={m.id}>{m.model}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--th-text-muted)" }}>
                  {t({ ko: "선택 시 자동으로 API 공급자에 등록됩니다", en: "Selecting a model auto-registers it as an API provider", ja: "モデル選択でAPIプロバイダーに自動登録されます", zh: "选择模型将自动注册为API提供商" })}
                </p>
              </div>
            )}

            {/* 성격/프롬프트 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("캐릭터 페르소나", "Character Persona")}
                </label>
                {form.name && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={generatingPersona || !form.name.trim()}
                    onClick={handleGeneratePersona}
                    style={{ borderColor: "var(--th-border-accent)", background: "var(--th-accent-glow)", color: "var(--th-accent)" }}
                  >
                    {generatingPersona
                      ? tr("생성 중...", "Generating...")
                      : form.personality
                        ? tr("AI 재생성", "AI Regenerate")
                        : tr("AI 자동생성", "AI Generate")}
                  </Button>
                )}
              </div>
              <Textarea
                value={form.personality}
                onChange={(e) => setForm({ ...form, personality: e.target.value })}
                rows={4}
                placeholder={isKo
                  ? "예: 나는 제갈량, 천하삼분지계의 전략가다. 항상 세 수 앞을 내다보고, '상중하 세 가지 전략'을 제시하는 것이 습관이다. 고사성어와 역사적 비유로 논점을 풀어내고, 은유적이지만 결론은 명쾌하다..."
                  : "e.g. I am Ada Lovelace, the world's first programmer. I approach problems by grasping the underlying structure first. I speak with Victorian formality, combining technical rigor with poetic expression..."}
              />
              <p className="text-[10px] mt-1" style={{ color: "var(--th-text-muted)" }}>
                {tr(
                  "말투, 사고방식, 입버릇, 습관 등을 구체적으로 작성하면 AI가 그 인물처럼 행동합니다.",
                  "Define speech patterns, thinking style, catchphrases, and habits for the AI to embody this character.",
                )}
              </p>
            </div>

            {/* Famous Persona */}
            <div style={{ borderTop: "1px solid var(--th-border)" }}>
              <button
                type="button"
                onClick={() => setShowPersonaCatalog((v) => !v)}
                className="flex w-full items-center justify-between py-2"
                style={{ borderLeft: "3px solid var(--th-accent)", paddingLeft: "0.5rem" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest font-mono" style={{ color: "var(--th-text-muted)" }}>
                    {tr("유명인 페르소나", "Famous Persona")}
                  </span>
                  {form.persona_id && (() => {
                    const p = getPersonaById(form.persona_id);
                    return p ? (
                      <span className="font-mono text-[9px] font-semibold uppercase" style={{ color: p.color, border: `1px solid ${p.color}40`, borderRadius: 6, padding: "0 4px", background: `${p.color}12` }}>
                        {p.badge}
                      </span>
                    ) : null;
                  })()}
                </div>
                <span className="font-mono text-[10px]" style={{ color: "var(--th-text-muted)", transform: showPersonaCatalog ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.1s linear" }}>▶</span>
              </button>
              {showPersonaCatalog && (
                <div className="mt-3">
                  <PersonaCatalog
                    selectedId={form.persona_id ?? ""}
                    onSelect={(id) => setForm({ ...form, persona_id: id || undefined })}
                  />
                  <p className="mt-2 text-[10px]" style={{ color: "var(--th-text-muted)" }}>
                    {tr(
                      "유명인의 사고방식과 철학이 AI 시스템 프롬프트에 주입됩니다.",
                      "The selected persona's philosophy is injected into the AI system prompt.",
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Knowledge Base Sources */}
            <KbSourcesSection
              sources={form.kb_default_sources ?? []}
              onChange={(sources) => setForm({ ...form, kb_default_sources: sources })}
              tr={tr}
            />
          </div>
    </div>
  );
  const footerButtons = (
    <>
      {saveError && (
        <p style={{ color: "var(--th-error, #ef4444)", fontSize: 12, flex: "1 1 100%", margin: "0 0 6px" }}>
          {saveError}
        </p>
      )}
      <Button variant="secondary" onClick={onClose}>
        {tr("취소", "Cancel")}
      </Button>
      <Button
        variant="primary"
        onClick={onSave}
        disabled={saving || !form.name.trim()}
        className="flex-1"
      >
        {saving
          ? tr("처리 중...", "Saving...")
          : isEdit
            ? tr("변경사항 저장", "Save Changes")
            : tr("채용 확정", "Confirm Hire")}
      </Button>
    </>
  );

  if (asWindow) {
    return createPortal(
      <AppWindow
        windowType="create-agent"
        title={title}
        emoji="👤"
        defaultWidth={720}
        defaultHeight={680}
        defaultX={Math.max(0, Math.round((window.innerWidth - 720) / 2))}
        defaultY={Math.max(44, Math.round((window.innerHeight - 680) / 2))}
        onClose={onClose}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", fontFamily: "var(--th-font-mono)" }}>
            {formFields}
          </div>
          <div style={{ borderTop: "1px solid var(--th-border)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 8, flexShrink: 0, fontFamily: "var(--th-font-mono)", background: "var(--th-bg-surface)" }}>
            {footerButtons}
          </div>
        </div>
      </AppWindow>,
      document.body,
    );
  }

  return (
    <Modal open onClose={onClose} width="lg">
      <ModalHeader onClose={onClose}>{title}</ModalHeader>
      <ModalBody>{formFields}</ModalBody>
      <ModalFooter>{footerButtons}</ModalFooter>
    </Modal>
  );
}
