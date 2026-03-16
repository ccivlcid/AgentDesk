import { useState, useEffect } from "react";
import { useI18n } from "../../i18n";

export interface BackendInfo {
  name: string;
  label: string;
  installed: boolean;
  version: string | null;
  running: boolean;
  port: number;
  base_url: string;
  model_count: number;
}

interface BackendCardProps {
  backend: BackendInfo;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onRestart: () => Promise<void>;
}

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

function StatusBadge({
  running,
  installed,
  labelRunning,
  labelStopped,
  labelNotInstalled,
}: {
  running: boolean;
  installed: boolean;
  labelRunning: string;
  labelStopped: string;
  labelNotInstalled: string;
}) {
  const color = running ? "#3fb950" : installed ? "#888" : "#555";
  const label = running ? labelRunning : installed ? labelStopped : labelNotInstalled;
  const bg    = running ? "rgba(63,185,80,0.08)" : "transparent";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: color, display: "inline-block",
        flexShrink: 0,
        boxShadow: running ? `0 0 4px ${color}` : "none",
      }} />
      <span style={{
        ...mono, fontSize: 10, letterSpacing: "0.05em",
        padding: "2px 7px", borderRadius: 0,
        border: `1px solid ${color}`, color, background: bg,
      }}>
        {label}
      </span>
    </div>
  );
}

export default function BackendCard({ backend, onStart, onStop, onRestart }: BackendCardProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [registeredId, setRegisteredId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerDone, setRegisterDone] = useState(false);

  // Check if already registered as API provider
  useEffect(() => {
    if (!backend.running) return;
    fetch("/api/api-providers")
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        const normalizedBase = backend.base_url.replace(/\/+$/, "");
        const found = (data.providers as Array<{ id: string; base_url: string }>)
          .find((p) => p.base_url.replace(/\/+$/, "") === normalizedBase);
        if (found) setRegisteredId(found.id);
      })
      .catch(() => {});
  }, [backend.running, backend.base_url]);

  const handleRegisterProvider = async () => {
    setRegistering(true);
    try {
      const res = await fetch("/api/api-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: backend.label + " (Local)",
          type: backend.name === "lmstudio" ? "openai" : backend.name,
          base_url: backend.base_url,
        }),
      });
      const data = await res.json() as { ok: boolean; id?: string };
      if (data.ok && data.id) {
        setRegisteredId(data.id);
        setRegisterDone(true);
        setTimeout(() => setRegisterDone(false), 3000);
      }
    } catch { /* ignore */ } finally {
      setRegistering(false);
    }
  };

  const wrap = (action: string, fn: () => Promise<void>) => async () => {
    setLoading(action);
    setConfirmStop(false);
    try { await fn(); } finally { setLoading(null); }
  };

  const isOllama = backend.name === "ollama";
  const isLmStudio = backend.name === "lmstudio";
  const isGuiBackend = isLmStudio; // GUI apps: can detect but not start/stop

  const BACKEND_DESC: Record<string, string> = {
    ollama:   t({ ko: "가장 쉬운 로컬 모델 실행기.", en: "Lightweight local model runner. Easiest to install.", ja: "最も簡単なローカルモデルランナー。", zh: "轻量级本地模型运行器，最易安装。" }),
    lmstudio: t({ ko: "로컬 모델 실행용 데스크탑 GUI 앱.", en: "Desktop GUI app for running local models.", ja: "ローカルモデル実行用デスクトップGUIアプリ。", zh: "用于运行本地模型的桌面GUI应用。" }),
    llamacpp: t({ ko: "고급 사용자를 위한 저수준 C++ 추론 엔진.", en: "Low-level C++ inference engine for advanced users.", ja: "上級者向け低レベルC++推論エンジン。", zh: "面向高级用户的低级C++推理引擎。" }),
    jan:      t({ ko: "오픈소스 크로스플랫폼 데스크탑 앱.", en: "Open-source desktop app, cross-platform.", ja: "オープンソースのクロスプラットフォームデスクトップアプリ。", zh: "开源跨平台桌面应用。" }),
  };

  const modelCountLabel = backend.model_count === 1
    ? t({ ko: `모델 ${backend.model_count}개 사용 가능`, en: `${backend.model_count} model available`, ja: `モデル${backend.model_count}個利用可能`, zh: `${backend.model_count}个模型可用` })
    : t({ ko: `모델 ${backend.model_count}개 사용 가능`, en: `${backend.model_count} models available`, ja: `モデル${backend.model_count}個利用可能`, zh: `${backend.model_count}个模型可用` });

  return (
    <div style={{
      ...mono,
      borderRadius: 10,
      border: backend.running
        ? "1px solid rgba(245,158,11,0.25)"
        : "1px solid var(--th-border)",
      background: backend.running
        ? "rgba(245,158,11,0.03)"
        : "var(--th-card-bg, #181818)",
      padding: "14px 16px",
      marginBottom: 10,
      transition: "border-color 0.2s",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--th-text-primary)", marginBottom: 2 }}>
            {backend.label}
          </div>
          <div style={{ fontSize: 11, color: "var(--th-text-secondary)" }}>
            {BACKEND_DESC[backend.name] ?? ""}
          </div>
        </div>
        <StatusBadge
          running={backend.running}
          installed={backend.installed}
          labelRunning={t({ ko: "실행 중", en: "Running", ja: "実行中", zh: "运行中" })}
          labelStopped={t({ ko: "중지됨", en: "Stopped", ja: "停止中", zh: "已停止" })}
          labelNotInstalled={t({ ko: "미설치", en: "Not installed", ja: "未インストール", zh: "未安装" })}
        />
      </div>

      {/* Meta */}
      {backend.installed && (
        <div style={{ fontSize: 11, color: "var(--th-text-muted)", margin: "8px 0",
          display: "flex", gap: 10, flexWrap: "wrap" }}>
          {backend.version && (
            <span>v<span style={{ color: "var(--th-accent)" }}>{backend.version}</span></span>
          )}
          <span>localhost:{backend.port}</span>
          {backend.running && backend.model_count > 0 && (
            <span>{modelCountLabel}</span>
          )}
        </div>
      )}

      {/* Actions */}
      {isGuiBackend ? (
        /* LM Studio — GUI app: no start/stop, just status + register */
        <div style={{ marginTop: 10 }}>
          {!backend.running ? (
            <div style={{ fontSize: 11, color: "var(--th-text-muted)", lineHeight: 1.8 }}>
              <div style={{ color: "var(--th-text-secondary)", marginBottom: 4 }}>
                {t({ ko: "LM Studio가 실행되고 있지 않습니다.", en: "LM Studio is not running.", ja: "LM Studioが起動していません。", zh: "LM Studio未运行。" })}
              </div>
              <div>
                {t({ ko: "LM Studio 앱을 실행한 후 서버를 켜세요.", en: "Launch the LM Studio app and enable the local server.", ja: "LM Studioアプリを起動し、ローカルサーバーをオンにしてください。", zh: "启动LM Studio应用并开启本地服务器。" })}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#3fb950" }}>
              {t({ ko: `✓ LM Studio 실행 중 — 모델 ${backend.model_count}개 로드됨`, en: `✓ LM Studio running — ${backend.model_count} model(s) loaded`, ja: `✓ LM Studio起動中 — ${backend.model_count}個のモデルロード済み`, zh: `✓ LM Studio运行中 — ${backend.model_count}个模型已加载` })}
            </div>
          )}
        </div>
      ) : isOllama ? (
        <div style={{ marginTop: 10 }}>
          {!backend.installed ? (
            <div style={{ fontSize: 11, color: "var(--th-text-muted)", lineHeight: 1.8 }}>
              <div style={{ color: "var(--th-text-secondary)", marginBottom: 6 }}>
                {t({ ko: "Ollama가 이 머신에 설치되어 있지 않습니다.", en: "Ollama is not installed on this machine.", ja: "このマシンにOllamaがインストールされていません。", zh: "此机器上未安装Ollama。" })}
              </div>
              <div>
                {t({ ko: "1. ", en: "1. ", ja: "1. ", zh: "1. " })}
                {t({ ko: "방문하세요", en: "Visit", ja: "アクセスしてください", zh: "访问" })}{" "}
                <a href="https://ollama.com" target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--th-accent)", textDecoration: "none" }}>
                  ollama.com
                </a>{" "}
                {t({ ko: "에서 설치 파일을 다운로드하세요.", en: "and download the installer.", ja: "からインストーラーをダウンロードしてください。", zh: "并下载安装程序。" })}
              </div>
              <div>
                {t({ ko: "2. 설치 파일을 실행한 후 위의 새로고침을 클릭하세요.", en: "2. Run the installer, then click Refresh above.", ja: "2. インストーラーを実行し、上の更新をクリックしてください。", zh: "2. 运行安装程序，然后点击上方的刷新。" })}
              </div>
            </div>
          ) : confirmStop ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--th-text-secondary)" }}>
                {t({ ko: "Ollama 서비스를 중지할까요?", en: "Stop Ollama service?", ja: "Ollamaサービスを停止しますか?", zh: "停止Ollama服务?" })}
              </span>
              <ActionBtn
                label={t({ ko: "중지 확인", en: "Confirm stop", ja: "停止確認", zh: "确认停止" })}
                loadingLabel={t({ ko: "처리 중...", en: "Working...", ja: "処理中...", zh: "处理中..." })}
                variant="danger"
                loading={loading === "stop"}
                onClick={wrap("stop", onStop)}
              />
              <ActionBtn
                label={t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
                loadingLabel={t({ ko: "처리 중...", en: "Working...", ja: "処理中...", zh: "处理中..." })}
                variant="ghost"
                loading={false}
                onClick={() => setConfirmStop(false)}
              />
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {!backend.running && (
                <ActionBtn
                  label={t({ ko: "서비스 시작", en: "Start service", ja: "サービス開始", zh: "启动服务" })}
                  loadingLabel={t({ ko: "처리 중...", en: "Working...", ja: "処理中...", zh: "处理中..." })}
                  variant="primary"
                  loading={loading === "start"}
                  onClick={wrap("start", onStart)}
                />
              )}
              {backend.running && (
                <>
                  <ActionBtn
                    label={t({ ko: "재시작", en: "Restart", ja: "再起動", zh: "重启" })}
                    loadingLabel={t({ ko: "처리 중...", en: "Working...", ja: "処理中...", zh: "处理中..." })}
                    variant="secondary"
                    loading={loading === "restart"}
                    onClick={wrap("restart", onRestart)}
                  />
                  <ActionBtn
                    label={t({ ko: "서비스 중지", en: "Stop service", ja: "サービス停止", zh: "停止服务" })}
                    loadingLabel={t({ ko: "처리 중...", en: "Working...", ja: "処理中...", zh: "处理中..." })}
                    variant="ghost"
                    loading={false}
                    onClick={() => setConfirmStop(true)}
                  />
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        /* llamacpp / jan — truly unsupported */
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--th-text-muted)",
          padding: "6px 10px", border: "1px solid var(--th-border)", borderRadius: 0 }}>
          {t({ ko: "향후 릴리스에서 지원 예정입니다.", en: "Support coming in a future release.", ja: "将来のリリースでサポート予定です。", zh: "将在未来版本中支持。" })}
        </div>
      )}

      {/* Register as API Provider — shown when running */}
      {backend.running && (
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--th-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--th-text-muted)", letterSpacing: "0.04em" }}>
              {t({ ko: "에이전트 API 공급자로 등록", en: "Register as Agent API Provider", ja: "エージェントAPIプロバイダーとして登録", zh: "注册为代理API提供商" })}
            </div>
            <div style={{ fontSize: 10, color: "var(--th-text-secondary)", marginTop: 1, opacity: 0.7 }}>
              {backend.base_url}
            </div>
          </div>
          {registeredId ? (
            <span style={{
              ...mono, fontSize: 9, padding: "2px 8px",
              border: "1px solid #3fb950", color: "#3fb950",
              background: "rgba(63,185,80,0.08)", letterSpacing: "0.04em",
            }}>
              {registerDone
                ? t({ ko: "등록됨", en: "Registered", ja: "登録済み", zh: "已注册" })
                : t({ ko: "연결됨", en: "Connected", ja: "接続済み", zh: "已连接" })}
            </span>
          ) : (
            <ActionBtn
              label={t({ ko: "등록", en: "Register", ja: "登録", zh: "注册" })}
              loadingLabel={t({ ko: "등록 중...", en: "Registering...", ja: "登録中...", zh: "注册中..." })}
              variant="secondary"
              loading={registering}
              onClick={handleRegisterProvider}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface ActionBtnProps {
  label: string;
  loadingLabel: string;
  loading: boolean;
  onClick: () => void;
  variant: "primary" | "secondary" | "ghost" | "danger";
}

function ActionBtn({ label, loadingLabel, loading, onClick, variant }: ActionBtnProps) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { border: "1px solid var(--th-accent)", background: "rgba(245,158,11,0.1)", color: "var(--th-accent)" },
    secondary: { border: "1px solid var(--th-border)", background: "var(--th-bg-surface, #1a1a1a)", color: "var(--th-text-secondary)" },
    ghost:     { border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)" },
    danger:    { border: "1px solid #f85149", background: "rgba(248,81,73,0.1)", color: "#f85149" },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        fontFamily: "var(--th-font-mono)",
        fontSize: 10, letterSpacing: "0.04em",
        padding: "5px 12px", borderRadius: 0,
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.5 : 1,
        transition: "opacity 0.15s",
        ...styles[variant],
      }}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
