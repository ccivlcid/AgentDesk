import { useCallback, useEffect, useState } from "react";
import BackendCard, { type BackendInfo } from "./BackendCard";
import { useI18n } from "../../i18n";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, opts);
  return res.json();
}

export default function BackendsPanel() {
  const { t } = useI18n();
  const [backends, setBackends] = useState<BackendInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const backRes = await apiFetch("/api/local-llm/backends");
      if (backRes.ok) setBackends(backRes.backends);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const call = async (name: string, action: string) => {
    await apiFetch(`/api/local-llm/backends/${name}/${action}`, { method: "POST" });
    await load();
  };

  if (loading) {
    return (
      <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px 0" }}>
        {t({ ko: "백엔드 감지 중...", en: "Detecting backends...", ja: "バックエンド検出中...", zh: "检测后端中..." })}
      </div>
    );
  }

  return (
    <div>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
          textTransform: "uppercase", color: "var(--th-text-muted)" }}>
          {t({ ko: "로컬 LLM 백엔드", en: "Local LLM Backends", ja: "ローカルLLMバックエンド", zh: "本地LLM后端" })}
        </div>
        <button
          type="button"
          onClick={load}
          style={{
            ...mono, fontSize: 10, padding: "3px 10px", borderRadius: 0,
            border: "1px solid var(--th-border)", background: "transparent",
            color: "var(--th-text-muted)", cursor: "pointer",
          }}
        >
          {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
        </button>
      </div>

      {error && (
        <div style={{ ...mono, fontSize: 11, color: "#f85149",
          padding: "8px 12px", border: "1px solid rgba(248,81,73,0.3)",
          background: "rgba(248,81,73,0.06)", borderRadius: 0, marginBottom: 12 }}>
          {t({ ko: "백엔드 감지 실패:", en: "Failed to detect backends:", ja: "バックエンド検出失敗:", zh: "检测后端失败:" })} {error}
        </div>
      )}

      {/* Backend cards */}
      {backends.map((b) => (
        <BackendCard
          key={b.name}
          backend={b}
          onStart={() => call(b.name, "start")}
          onStop={() => call(b.name, "stop")}
          onRestart={() => call(b.name, "restart")}
        />
      ))}
    </div>
  );
}
