import { useCallback, useEffect, useState } from "react";
import { useUiStore } from "../../../store/uiStore";
import { useI18n } from "../../../i18n";

const mono = "var(--th-font-mono)";

interface BackendInfo {
  name: string;
  installed: boolean;
  running: boolean;
  version?: string;
  port: number;
  model_count: number;
}

interface LocalModel {
  name: string;
  running: boolean;
  size_label: string;
}

export default function LocalLlmWidget() {
  const { t } = useI18n();
  const { openSettings } = useUiStore();
  const [backends, setBackends] = useState<BackendInfo[]>([]);
  const [models, setModels] = useState<LocalModel[]>([]);
  const [diskLabel, setDiskLabel] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const load = useCallback(async () => {
    try {
      setFetchError(false);
      const [backRes, modelRes] = await Promise.all([
        fetch("/api/local-llm/backends").then((r) => r.json()),
        fetch("/api/local-llm/models").then((r) => r.json()),
      ]);
      if (backRes.ok) setBackends(backRes.backends as BackendInfo[]);
      if (modelRes.ok) {
        setModels(modelRes.models as LocalModel[]);
        setDiskLabel(modelRes.disk_used_label ?? "—");
      }
    } catch { setFetchError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const goToSettings = () => openSettings("local-llm");

  const runningBackends = backends.filter((b) => b.running);
  const totalModels = models.length;
  const activeModel = models.find((m) => m.running) ?? null;

  const anyInstalled = backends.some((b) => b.installed);
  const anyRunning = runningBackends.length > 0;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      fontFamily: mono, fontSize: 11, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 10px", borderBottom: "1px solid var(--th-border)", flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
          textTransform: "uppercase", color: "var(--th-text-muted)" }}>
          {t({ ko: "로컬 LLM", en: "Local LLM", ja: "ローカルLLM", zh: "本地LLM" })}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", display: "inline-block",
            background: loading ? "#555" : anyRunning ? "var(--th-success, #3fb950)" : "#555",
            boxShadow: anyRunning && !loading ? "0 0 4px var(--th-success, #3fb950)" : "none",
          }} />
          <span style={{
            fontSize: 10, letterSpacing: "0.04em",
            color: loading ? "var(--th-text-muted)" : anyRunning ? "var(--th-success, #3fb950)" : "var(--th-text-muted)",
          }}>
            {loading
              ? t({ ko: "확인 중...", en: "Checking...", ja: "確認中...", zh: "检查中..." })
              : anyRunning
                ? t({ ko: `${runningBackends.length}개 실행 중`, en: `${runningBackends.length} running`, ja: `${runningBackends.length}個 実行中`, zh: `${runningBackends.length} 个运行中` })
                : t({ ko: "중지됨", en: "Stopped", ja: "停止中", zh: "已停止" })}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: "10px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? null : fetchError ? (
          <div style={{ color: "var(--th-danger, #ef4444)", fontSize: 10, lineHeight: 1.7 }}>
            {t({ ko: "서버 연결 실패", en: "Server unreachable", ja: "サーバー接続失敗", zh: "服务器连接失败" })}
          </div>
        ) : !anyInstalled ? (
          /* Nothing installed */
          <div style={{ color: "var(--th-text-muted)", fontSize: 11, lineHeight: 1.7 }}>
            <div>{t({ ko: "설치된 백엔드가 없습니다.", en: "No backends installed.", ja: "バックエンドがインストールされていません。", zh: "未安装后端。" })}</div>
            <button type="button" onClick={goToSettings}
              style={{ background: "none", border: "none", color: "var(--th-accent)",
                fontFamily: mono, fontSize: 11, cursor: "pointer", padding: 0, marginTop: 4 }}>
              {t({ ko: "설정하기 →", en: "Open settings →", ja: "設定を開く →", zh: "打开设置 →" })}
            </button>
          </div>
        ) : (
          <>
            {/* Backend status rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {backends.map((b) => (
                <BackendRow key={b.name} backend={b} t={t} />
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid var(--th-border)" }} />

            {/* Active model */}
            {activeModel ? (
              <div>
                <div style={{ fontSize: 10, color: "var(--th-text-muted)", letterSpacing: "0.04em", marginBottom: 2 }}>
                  {t({ ko: "활성 모델", en: "Active model", ja: "アクティブモデル", zh: "活动模型" })}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--th-text-primary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeModel.name}
                </div>
                <div style={{ fontSize: 10, color: "#3fb950", marginTop: 1 }}>
                  {activeModel.size_label} · {t({ ko: "추론 중", en: "Inferencing", ja: "推論中", zh: "推理中" })}
                </div>
              </div>
            ) : totalModels === 0 ? (
              <div style={{ fontSize: 10, color: "var(--th-text-muted)", lineHeight: 1.6 }}>
                {t({ ko: "설치된 모델 없음.", en: "No models installed.", ja: "インストールされたモデルなし。", zh: "未安装模型。" })}
              </div>
            ) : (
              <Row
                label={t({ ko: "모델", en: "Models", ja: "モデル", zh: "模型" })}
                value={t({ ko: `${totalModels}개 설치됨`, en: `${totalModels} installed`, ja: `${totalModels}個インストール済み`, zh: `已安装 ${totalModels} 个` })}
              />
            )}

            {/* Stats */}
            <Row label={t({ ko: "디스크", en: "Disk", ja: "ディスク", zh: "磁盘" })} value={diskLabel} />
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "5px 10px", borderTop: "1px solid var(--th-border)",
        display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        <button type="button" onClick={goToSettings} disabled={loading}
          style={{ background: "none", border: "none", color: "var(--th-accent)",
            fontFamily: mono, fontSize: 10, cursor: loading ? "default" : "pointer", padding: 0,
            letterSpacing: "0.04em", opacity: loading ? 0.4 : 1 }}>
          {t({ ko: "관리 →", en: "Manage →", ja: "管理 →", zh: "管理 →" })}
        </button>
      </div>
    </div>
  );
}

function BackendRow({ backend, t }: {
  backend: BackendInfo;
  t: (v: { ko: string; en: string; ja: string; zh: string }) => string;
}) {
  const label: Record<string, string> = {
    ollama: "Ollama",
    lmstudio: "LM Studio",
  };
  const name = label[backend.name] ?? backend.name;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          width: 5, height: 5, borderRadius: "50%", display: "inline-block", flexShrink: 0,
          background: backend.running ? "#3fb950" : backend.installed ? "#555" : "#333",
          boxShadow: backend.running ? "0 0 4px #3fb950" : "none",
        }} />
        <span style={{ fontSize: 11, color: backend.running ? "var(--th-text-primary)" : "var(--th-text-muted)" }}>
          {name}
        </span>
      </div>
      <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>
        {!backend.installed
          ? t({ ko: "미설치", en: "not installed", ja: "未インストール", zh: "未安装" })
          : backend.running
            ? t({ ko: `모델 ${backend.model_count}개`, en: `${backend.model_count} models`, ja: `モデル ${backend.model_count}個`, zh: `${backend.model_count} 个模型` })
            : t({ ko: "중지됨", en: "stopped", ja: "停止中", zh: "已停止" })}
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-secondary)" }}>{value}</span>
    </div>
  );
}
