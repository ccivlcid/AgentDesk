import { useI18n } from "../../../i18n";
import { Input, useToast } from "../../ui";
import type { FormData } from "../types";
import type { ApiProviderOption } from "./types";
import type { LocalModelOption } from "./useAgentFormModalResources";

export function AgentFormModalProviderBlocks({
  form,
  setForm,
  apiProviders,
  setApiProviders,
  localModels,
  connectingLocal,
  setConnectingLocal,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
  apiProviders: ApiProviderOption[];
  setApiProviders: (p: ApiProviderOption[]) => void;
  localModels: LocalModelOption[];
  connectingLocal: boolean;
  setConnectingLocal: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();

  return (
    <>
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
            <option value="">
              {t({ ko: "— CLI 기본값 사용 —", en: "— Use CLI default —", ja: "— CLIデフォルト使用 —", zh: "— 使用CLI默认 —" })}
            </option>
            {apiProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
        </div>

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
                  <option value="">
                    {t({ ko: "모델 선택...", en: "Select model...", ja: "モデルを選択...", zh: "选择模型..." })}
                  </option>
                  {provider.models_cache.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={form.api_model ?? ""}
                  onChange={(e) => setForm({ ...form, api_model: e.target.value || null })}
                  placeholder={t({
                    ko: "모델 이름 직접 입력 (예: llama3.2:3b)",
                    en: "Enter model name (e.g. llama3.2:3b)",
                    ja: "モデル名を入力 (例: llama3.2:3b)",
                    zh: "输入模型名称 (例: llama3.2:3b)",
                  })}
                  style={{ fontFamily: "var(--th-font-mono)", fontSize: 11 }}
                />
              )}
              <p className="text-[10px] mt-1" style={{ color: "var(--th-text-muted)" }}>
                {provider.base_url}
                {provider.models_cache.length === 0 && (
                  <>
                    {" "}
                    —{" "}
                    {t({
                      ko: "모델 목록을 로드하려면 설정 → API 공급자에서 연결 테스트를 실행하세요.",
                      en: "Run a connection test in Settings → API Providers to load model list.",
                      ja: "設定 → APIプロバイダーで接続テストを実行してモデルリストを読み込んでください。",
                      zh: "在设置 → API提供商中运行连接测试以加载模型列表。",
                    })}
                  </>
                )}
              </p>
            </div>
          );
        })()}
      </div>

      {localModels.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
            {t({
              ko: "로컬 LLM (빠른 연결)",
              en: "Local LLM (quick connect)",
              ja: "ローカルLLM (クイック接続)",
              zh: "本地LLM (快速连接)",
            })}
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
                  const data = (await r.json()) as { ok: boolean; provider_id?: string; error?: string };
                  if (data.ok && data.provider_id) {
                    setForm({ ...form, api_provider_id: data.provider_id, api_model: item.model });
                    const pr = await fetch("/api/api-providers").then((res) => res.json());
                    if (pr.ok) setApiProviders(pr.providers);
                    showToast(
                      t({
                        ko: `${item.group} — ${item.model} 연결됨`,
                        en: `${item.group} — ${item.model} connected`,
                        ja: `${item.group} — ${item.model} 接続済み`,
                        zh: `${item.group} — ${item.model} 已连接`,
                      }),
                      "success",
                    );
                  } else {
                    showToast(
                      t({
                        ko: `연결 실패: ${data.error ?? "서비스가 실행 중인지 확인하세요"}`,
                        en: `Connect failed: ${data.error ?? "Make sure the service is running"}`,
                        ja: `接続失敗: ${data.error ?? "サービスが実行中か確認してください"}`,
                        zh: `连接失败: ${data.error ?? "请确认服务正在运行"}`,
                      }),
                      "error",
                    );
                  }
                } catch {
                  showToast(
                    t({ ko: "연결 중 오류 발생", en: "Connection error", ja: "接続エラー", zh: "连接错误" }),
                    "error",
                  );
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
              <option value="">
                {connectingLocal
                  ? t({ ko: "연결 중...", en: "Connecting...", ja: "接続中...", zh: "连接中..." })
                  : t({
                      ko: "— 로컬 모델 선택 —",
                      en: "— Select local model —",
                      ja: "— ローカルモデルを選択 —",
                      zh: "— 选择本地模型 —",
                    })}
              </option>
              {["Ollama", "LM Studio"].map((group) => {
                const items = localModels.filter((m) => m.group === group);
                if (items.length === 0) return null;
                return (
                  <optgroup key={group} label={group}>
                    {items.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.model}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
          <p className="text-[10px] mt-1" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "선택 시 자동으로 API 공급자에 등록됩니다",
              en: "Selecting a model auto-registers it as an API provider",
              ja: "モデル選択でAPIプロバイダーに自動登録されます",
              zh: "选择模型将自动注册为API提供商",
            })}
          </p>
        </div>
      )}
    </>
  );
}
