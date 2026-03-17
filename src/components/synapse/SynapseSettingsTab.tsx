/**
 * Synapse Settings Tab — Notion / Obsidian / NotebookLM / Rules
 */
import { useState, useEffect, useCallback } from "react";
import {
  connectNotion, getNotionInfo, searchNotionPages, disconnectSynapse,
  validateObsidianVault, connectObsidianLocal, connectObsidianRest, pingObsidianRest, getObsidianInfo, searchObsidianFiles,
  getSynapseSnapshots, createSynapseSnapshot, deleteSynapseSnapshot,
  getSynapseRules, createSynapseRule, updateSynapseRule, deleteSynapseRule,
  connectFigma, getFigmaInfo,
} from "../../api/synapse";
import type { NotionPage, ObsidianNote, SynapseSnapshot, SynapseRule } from "../../api/synapse";

const mono = "var(--th-font-mono)";
const base: React.CSSProperties = { fontFamily: mono };

// ─── i18n helper (module-level, no hook required) ────────────────────────────
function tl(ko: string, en: string, ja?: string, zh?: string): string {
  try {
    const lang: string =
      localStorage.getItem("agentdesk.language") ??
      document.documentElement.lang ??
      "ko";
    if (lang.startsWith("en")) return en;
    if (lang.startsWith("ja")) return ja ?? en;
    if (lang.startsWith("zh")) return zh ?? en;
  } catch { /* SSR / no DOM */ }
  return ko;
}

// ─── Sub-tab types ────────────────────────────────────────────────────────────
type SubTab = "notion" | "obsidian" | "notebooklm" | "figma" | "rules";

// ─── Help content ─────────────────────────────────────────────────────────────
const HELP: Record<SubTab, { title: string; items: string[] }> = {
  notion: {
    title: tl("Notion 연동 가이드", "Notion Integration Guide", "Notion連携ガイド", "Notion集成指南"),
    items: [
      tl("Notion → 설정 → 연동 → 새 API 통합 (Integration) 생성", "Notion → Settings → Integrations → Create new integration"),
      tl("생성된 Integration Token (secret_xxxx...)을 복사하여 입력", "Copy the generated Integration Token (secret_xxxx...) and paste it below"),
      tl("연결할 페이지/데이터베이스에서 '연결 추가'로 통합 권한 부여", "Grant access by clicking 'Add connections' on the page or database"),
      tl("연결 후 페이지 검색으로 워크스페이스 내용을 에이전트에 제공 가능", "After connecting, search pages to provide workspace content to agents"),
    ],
  },
  obsidian: {
    title: tl("Obsidian 연동 가이드", "Obsidian Integration Guide", "Obsidian連携ガイド", "Obsidian集成指南"),
    items: [
      tl("로컬 모드: Obsidian Vault 폴더 경로를 직접 입력 (읽기 전용)", "Local mode: enter the Obsidian Vault folder path directly (read-only)"),
      tl("REST API 모드: Obsidian → 설정 → 커뮤니티 플러그인 → 'Local REST API' 설치", "REST API mode: Obsidian → Settings → Community Plugins → install 'Local REST API'"),
      tl("REST API 플러그인 활성화 후 포트(기본 27123)와 API 키를 입력", "After enabling the REST API plugin, enter the port (default 27123) and API key"),
      tl("연결된 노트는 에이전트 컨텍스트 조회 시 자동으로 활용됩니다", "Connected notes are automatically used in agent context queries"),
    ],
  },
  notebooklm: {
    title: tl("NotebookLM 가이드", "NotebookLM Guide", "NotebookLMガイド", "NotebookLM指南"),
    items: [
      tl("NotebookLM은 공식 API가 없어 수동 스냅샷 방식으로 연동합니다", "NotebookLM has no official API — use the manual snapshot method"),
      tl("NotebookLM → 노트북 선택 → '공유 및 내보내기' → 텍스트 복사", "NotebookLM → select notebook → 'Share & export' → copy text"),
      tl("복사한 내용을 아래 텍스트 입력란에 붙여넣고 저장", "Paste the copied content into the text area below and save"),
      tl("저장된 스냅샷은 에이전트 컨텍스트로 사용됩니다 (실시간 동기화 미지원)", "Saved snapshots are used as agent context (no real-time sync)"),
    ],
  },
  figma: {
    title: tl("Figma 연동 가이드", "Figma Integration Guide", "Figma連携ガイド", "Figma集成指南"),
    items: [
      tl("Figma → 설정 → 보안 → Personal Access Token 생성", "Figma → Settings → Security → Generate a Personal Access Token"),
      tl("토큰 이름 입력 후 'Generate new token' 클릭", "Enter a token name and click 'Generate new token'"),
      tl("생성된 토큰을 복사하여 아래에 입력", "Copy the generated token and paste it below"),
      tl("연결 후 태스크 생성 시 Figma URL을 첨부하면 에이전트가 디자인 스펙을 자동으로 읽습니다", "After connecting, attach a Figma URL when creating a task and the agent will read the design spec automatically"),
    ],
  },
  rules: {
    title: tl("자동화 규칙 가이드", "Automation Rules Guide", "自動化ルールガイド", "自动化规则指南"),
    items: [
      tl("Obsidian 파일 변경 또는 Notion 페이지 업데이트 시 태스크를 자동 생성", "Auto-create tasks on Obsidian file changes or Notion page updates"),
      tl("트리거 소스: Obsidian (파일 변경) 또는 Notion (페이지 업데이트)", "Trigger source: Obsidian (file change) or Notion (page update)"),
      tl("패턴 필터: 특정 파일명/경로 패턴만 감지 (비우면 전체 감지)", "Pattern filter: detect only specific file name/path patterns (leave empty for all)"),
      tl("제목 템플릿 변수: {{filename}}, {{path}}, {{title}} 사용 가능", "Title template variables: {{filename}}, {{path}}, {{title}}"),
    ],
  },
};

// ─── Help panel ───────────────────────────────────────────────────────────────
function HelpPanel({ tab, onClose }: { tab: SubTab; onClose: () => void }) {
  const help = HELP[tab];
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "var(--th-bg-surface)",
      display: "flex", flexDirection: "column",
      zIndex: 10,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px 12px",
        borderBottom: "1px solid var(--th-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 22, height: 22, borderRadius: "50%",
            background: "rgba(10,132,255,0.15)",
            border: "1px solid rgba(10,132,255,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: mono, fontSize: 11, fontWeight: 700, color: "#0a84ff",
            flexShrink: 0,
          }}>?</span>
          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)" }}>
            {help.title}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "var(--th-hover-overlay)",
            border: "1px solid var(--th-border)",
            borderRadius: 6,
            padding: "3px 10px",
            fontFamily: mono,
            fontSize: 11,
            color: "var(--th-text-muted)",
            cursor: "pointer",
          }}
        >
          {tl("닫기", "Close", "閉じる", "关闭")}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "18px 20px", overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {help.items.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{
                flexShrink: 0,
                width: 20, height: 20,
                borderRadius: "50%",
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: mono, fontSize: 10, fontWeight: 700,
                color: "var(--th-accent)",
              }}>
                {i + 1}
              </span>
              <span style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-secondary)", lineHeight: 1.7 }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: mono,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.04em",
      padding: "3px 10px",
      borderRadius: 20,
      background: connected
        ? "rgba(48,209,88,0.12)"
        : "rgba(255,69,58,0.12)",
      color: connected ? "#30d158" : "#ff453a",
      border: `1px solid ${connected ? "rgba(48,209,88,0.3)" : "rgba(255,69,58,0.3)"}`,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: connected ? "#30d158" : "#ff453a",
        boxShadow: connected ? "0 0 4px #30d158" : "none",
        flexShrink: 0,
        display: "inline-block",
      }} />
      {connected ? "Connected" : "Disconnected"}
    </span>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginBottom: 10, marginTop: 4,
    }}>
      <span style={{
        fontFamily: mono,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.10em",
        color: "var(--th-text-muted)",
        textTransform: "uppercase",
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--th-border)" }} />
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({
  children,
  onClick,
  danger,
  primary,
  disabled,
  small,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  primary?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const accentBg = primary ? "var(--th-accent)" : danger ? "rgba(255,69,58,0.12)" : "var(--th-hover-overlay)";
  const accentBgHover = primary ? "var(--th-accent)" : danger ? "rgba(255,69,58,0.22)" : "var(--th-hover-overlay-subtle)";
  const textColor = primary
    ? "#fff"
    : danger
    ? "#ff453a"
    : "var(--th-text-secondary)";
  const borderColor = primary
    ? "transparent"
    : danger
    ? "rgba(255,69,58,0.35)"
    : "var(--th-border)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...base,
        fontSize: small ? 10 : 11,
        fontWeight: 500,
        letterSpacing: "0.02em",
        padding: small ? "4px 10px" : "6px 14px",
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        background: hovered ? accentBgHover : accentBg,
        color: disabled ? "var(--th-text-muted)" : textColor,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background 0.12s, opacity 0.12s",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  fullWidth,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  fullWidth?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        ...base,
        fontSize: 11,
        padding: "7px 10px",
        background: "var(--th-input-bg, var(--th-bg-primary))",
        border: "1px solid var(--th-input-border, var(--th-border))",
        borderRadius: 6,
        color: "var(--th-text-primary)",
        outline: "none",
        width: fullWidth ? "100%" : undefined,
        boxSizing: "border-box",
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(10,132,255,0.5)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--th-input-border, var(--th-border))"; }}
    />
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      background: "var(--th-card-bg, var(--th-bg-surface))",
      border: `1px solid ${accent ? "rgba(245,158,11,0.35)" : "var(--th-border)"}`,
      borderRadius: 8,
      padding: "14px 16px",
      marginBottom: 14,
      boxShadow: accent ? "0 0 0 1px rgba(245,158,11,0.1) inset" : "none",
    }}>
      {children}
    </div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="var(--th-text-muted)"
        strokeWidth={1.5}
        width={12}
        height={12}
        style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
      >
        <circle cx="6.5" cy="6.5" r="4.5" />
        <line x1="10.5" y1="10.5" x2="14" y2="14" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? tl("검색...", "Search...", "検索...", "搜索...")}
        style={{
          ...base,
          width: "100%",
          boxSizing: "border-box",
          fontSize: 11,
          padding: "7px 10px 7px 28px",
          background: "var(--th-input-bg, var(--th-bg-primary))",
          border: "1px solid var(--th-input-border, var(--th-border))",
          borderRadius: 6,
          color: "var(--th-text-primary)",
          outline: "none",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(10,132,255,0.5)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--th-input-border, var(--th-border))"; }}
      />
    </div>
  );
}

// ─── Notion Tab ───────────────────────────────────────────────────────────────
function NotionTab() {
  const [connected, setConnected] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [query, setQuery] = useState("");
  const [loadingPages, setLoadingPages] = useState(false);

  useEffect(() => {
    getNotionInfo().then((info) => {
      setConnected(info.connected);
      if (info.workspace_name) setWorkspaceName(info.workspace_name);
      if (info.connected) loadPages("");
    }).catch(() => {});
  }, []);

  const loadPages = useCallback(async (q: string) => {
    setLoadingPages(true);
    try {
      const result = await searchNotionPages(q);
      setPages(result);
    } catch {
      // ignore
    } finally {
      setLoadingPages(false);
    }
  }, []);

  const handleConnect = async () => {
    if (!token.trim()) return;
    setConnecting(true);
    setError("");
    try {
      const info = await connectNotion(token.trim());
      setWorkspaceName(info.workspace_name);
      setConnected(true);
      setToken("");
      loadPages("");
    } catch (e) {
      setError(String(e));
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectSynapse("notion");
    setConnected(false);
    setWorkspaceName("");
    setPages([]);
  };

  if (!connected) {
    return (
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ ...base, fontWeight: 600, fontSize: 13, color: "var(--th-text-heading)" }}>Notion</span>
          <StatusBadge connected={false} />
        </div>
        <p style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", marginBottom: 14, lineHeight: 1.6 }}>
          {tl("Notion Integration Token을 입력하여 워크스페이스를 연결하세요.", "Enter your Notion Integration Token to connect your workspace.")}
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: error ? 10 : 0 }}>
          <Input value={token} onChange={setToken} placeholder="secret_xxxx..." type="password" fullWidth />
          <Btn primary onClick={handleConnect} disabled={connecting || !token.trim()}>
            {connecting ? tl("연결 중...", "Connecting...") : tl("연결", "Connect")}
          </Btn>
        </div>
        {error && <p style={{ ...base, fontSize: 10, color: "#ff453a", marginTop: 8 }}>{error}</p>}
      </Card>
    );
  }

  return (
    <div>
      <Card accent>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ ...base, fontWeight: 600, fontSize: 12, color: "var(--th-text-heading)" }}>Notion</div>
            <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", marginTop: 2 }}>
              workspace: <span style={{ color: "var(--th-text-secondary)" }}>{workspaceName}</span>
            </div>
          </div>
          <StatusBadge connected />
        </div>
        <Btn small danger onClick={handleDisconnect}>{tl("연결 해제", "Disconnect")}</Btn>
      </Card>

      <SectionLabel>Pages & Databases</SectionLabel>
      <SearchBar
        value={query}
        onChange={(q) => { setQuery(q); loadPages(q); }}
        placeholder={tl("페이지 검색...", "Search pages...")}
      />
      {loadingPages && <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", padding: "8px 0" }}>{tl("검색 중...", "Searching...")}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {pages.map((page) => (
          <div key={page.id} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "7px 10px",
            background: "var(--th-hover-overlay-subtle)",
            border: "1px solid var(--th-border)",
            borderRadius: 6,
          }}>
            <span style={{ ...base, fontSize: 11, color: "var(--th-text-primary)" }}>
              {page.title}
            </span>
            <span style={{
              ...base, fontSize: 9, color: "var(--th-text-muted)",
              padding: "1px 6px",
              background: "var(--th-hover-overlay)",
              border: "1px solid var(--th-border)",
              borderRadius: 4,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              {page.type === "database" ? "db" : "page"}
            </span>
          </div>
        ))}
        {!loadingPages && pages.length === 0 && (
          <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", padding: "12px 0" }}>{tl("페이지 없음", "No pages")}</div>
        )}
      </div>
    </div>
  );
}

// ─── Obsidian Tab ─────────────────────────────────────────────────────────────
function ObsidianTab() {
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<"local" | "rest">("local");
  const [vaultPath, setVaultPath] = useState("");
  const [noteCount, setNoteCount] = useState(0);
  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] = useState<{ ok: boolean; noteCount: number } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const [restHost, setRestHost] = useState("localhost");
  const [restPort, setRestPort] = useState("27123");
  const [apiKey, setApiKey] = useState("");
  const [pingStatus, setPingStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [pingLoading, setPingLoading] = useState(false);

  const [files, setFiles] = useState<ObsidianNote[]>([]);
  const [query, setQuery] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    getObsidianInfo().then((info) => {
      setConnected(info.connected);
      if (info.mode) setMode(info.mode as "local" | "rest");
      if (info.vault_path) setVaultPath(info.vault_path);
      if (info.noteCount) setNoteCount(info.noteCount);
      if (info.connected) loadFiles("");
    }).catch(() => {});
  }, []);

  const handleValidate = async () => {
    setValidating(true);
    setValidateResult(null);
    try {
      const r = await validateObsidianVault(vaultPath);
      setValidateResult(r);
    } finally {
      setValidating(false);
    }
  };

  const handleConnectLocal = async () => {
    setConnecting(true);
    setError("");
    try {
      const r = await connectObsidianLocal(vaultPath);
      setNoteCount(r.noteCount);
      setConnected(true);
      loadFiles("");
    } catch (e) {
      setError(String(e));
    } finally {
      setConnecting(false);
    }
  };

  const handlePing = async () => {
    setPingLoading(true);
    const r = await pingObsidianRest(restHost, parseInt(restPort), apiKey);
    setPingStatus(r.ok ? "ok" : "fail");
    setPingLoading(false);
  };

  const handleConnectRest = async () => {
    setConnecting(true);
    setError("");
    try {
      await connectObsidianRest(restHost, parseInt(restPort), apiKey);
      setConnected(true);
      loadFiles("");
    } catch (e) {
      setError(String(e));
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectSynapse("obsidian");
    setConnected(false);
    setFiles([]);
  };

  const loadFiles = async (q: string) => {
    setLoadingFiles(true);
    try {
      const result = await searchObsidianFiles(q);
      setFiles(result);
    } catch {
      // ignore
    } finally {
      setLoadingFiles(false);
    }
  };

  if (!connected) {
    return (
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ ...base, fontWeight: 600, fontSize: 13, color: "var(--th-text-heading)" }}>Obsidian</span>
          <StatusBadge connected={false} />
        </div>

        {/* Mode selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(["local", "rest"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                ...base,
                fontSize: 11,
                padding: "5px 12px",
                borderRadius: 6,
                border: `1px solid ${mode === m ? "rgba(10,132,255,0.4)" : "var(--th-border)"}`,
                background: mode === m ? "rgba(10,132,255,0.12)" : "transparent",
                color: mode === m ? "#0a84ff" : "var(--th-text-muted)",
                cursor: "pointer",
                fontWeight: mode === m ? 600 : 400,
                transition: "all 0.12s",
              }}
            >
              {m === "local" ? tl("로컬 파일시스템", "Local Filesystem") : "REST API Plugin"}
            </button>
          ))}
        </div>

        {mode === "local" && (
          <div>
            <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>
              {tl("Vault 경로", "Vault Path")}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <Input value={vaultPath} onChange={setVaultPath} placeholder="C:\Users\...\MyVault" fullWidth />
              <Btn small onClick={handleValidate} disabled={validating || !vaultPath}>
                {validating ? tl("확인 중...", "Checking...") : tl("확인", "Check")}
              </Btn>
            </div>
            {validateResult && (
              <Card accent={validateResult.ok}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ ...base, fontSize: 11, color: "var(--th-text-secondary)" }}>
                    {vaultPath.split(/[\\/]/).pop()}
                  </span>
                  <StatusBadge connected={validateResult.ok} />
                </div>
                {validateResult.ok && (
                  <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", marginTop: 6 }}>
                    {validateResult.noteCount} {tl("개 노트 발견", "notes found")}
                  </div>
                )}
              </Card>
            )}
            {error && <p style={{ ...base, fontSize: 10, color: "#ff453a", marginBottom: 8 }}>{error}</p>}
            <Btn primary onClick={handleConnectLocal} disabled={connecting || !validateResult?.ok}>
              {connecting ? tl("연결 중...", "Connecting...") : tl("연결", "Connect")}
            </Btn>
          </div>
        )}

        {mode === "rest" && (
          <div>
            <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
              {tl("Obsidian Community Plugins에서 ", "Install ")}<strong style={{ color: "var(--th-text-secondary)" }}>Local REST API</strong>{tl("를 설치하세요.", " from Obsidian Community Plugins.")}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 2 }}>
                <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>Host</div>
                <Input value={restHost} onChange={setRestHost} placeholder="localhost" fullWidth />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>Port</div>
                <Input value={restPort} onChange={setRestPort} placeholder="27123" fullWidth />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>API Key</div>
              <Input value={apiKey} onChange={setApiKey} placeholder={tl("API 키 입력...", "Enter API key...")} type="password" fullWidth />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
              <Btn small onClick={handlePing} disabled={pingLoading}>
                {pingLoading ? tl("테스트 중...", "Testing...") : tl("연결 테스트", "Test Connection")}
              </Btn>
              {pingStatus === "ok" && (
                <span style={{ ...base, fontSize: 11, color: "#30d158", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#30d158", display: "inline-block" }} />
                  {tl("연결됨", "Connected")}
                </span>
              )}
              {pingStatus === "fail" && (
                <span style={{ ...base, fontSize: 11, color: "#ff453a" }}>{tl("연결 실패", "Connection failed")}</span>
              )}
            </div>
            {error && <p style={{ ...base, fontSize: 10, color: "#ff453a", marginBottom: 8 }}>{error}</p>}
            <Btn primary onClick={handleConnectRest} disabled={connecting}>
              {connecting ? tl("연결 중...", "Connecting...") : tl("연결", "Connect")}
            </Btn>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div>
      <Card accent>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ ...base, fontWeight: 600, fontSize: 12, color: "var(--th-text-heading)" }}>Obsidian</div>
            <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", marginTop: 2 }}>
              {mode === "local"
                ? <span>vault: <span style={{ color: "var(--th-text-secondary)" }}>{vaultPath}</span></span>
                : <span>REST API: <span style={{ color: "var(--th-text-secondary)" }}>{restHost}:{restPort}</span></span>
              }
            </div>
            {mode === "local" && (
              <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", marginTop: 2 }}>
                {noteCount} {tl("개 노트", "notes")}
              </div>
            )}
          </div>
          <StatusBadge connected />
        </div>
        {mode === "rest" && (
          <div style={{
            marginTop: 10, marginBottom: 10,
            padding: "8px 10px",
            background: "rgba(255,159,10,0.08)",
            border: "1px solid rgba(255,159,10,0.3)",
            borderRadius: 6,
            ...base, fontSize: 10, color: "rgba(255,159,10,0.9)", lineHeight: 1.6,
          }}>
            {tl("REST API 모드는 파일 목록 조회만 지원합니다. 에이전트 컨텍스트 주입(파일 내용 읽기)은 로컬 모드에서만 동작합니다.", "REST API mode only supports file listing. Agent context injection (reading file content) only works in local mode.")}
          </div>
        )}
        <Btn small danger onClick={handleDisconnect}>{tl("연결 해제", "Disconnect")}</Btn>
      </Card>

      <SectionLabel>Notes</SectionLabel>
      <SearchBar
        value={query}
        onChange={(q) => { setQuery(q); loadFiles(q); }}
        placeholder={tl("노트 검색...", "Search notes...")}
      />
      {loadingFiles && <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", padding: "8px 0" }}>{tl("검색 중...", "Searching...")}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {files.map((f) => (
          <div key={f.path} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "7px 10px",
            background: "var(--th-hover-overlay-subtle)",
            border: "1px solid var(--th-border)",
            borderRadius: 6,
          }}>
            <span style={{ ...base, fontSize: 11, color: "var(--th-text-primary)" }}>{f.name}</span>
            <span style={{ ...base, fontSize: 9, color: "var(--th-text-muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.path}</span>
          </div>
        ))}
        {!loadingFiles && files.length === 0 && (
          <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", padding: "12px 0" }}>{tl("노트 없음", "No notes")}</div>
        )}
      </div>
    </div>
  );
}

// ─── NotebookLM Tab ───────────────────────────────────────────────────────────
function NotebookLMTab() {
  const [snapshots, setSnapshots] = useState<SynapseSnapshot[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSynapseSnapshots().then(setSnapshots).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!pasteText.trim()) return;
    setSaving(true);
    setError("");
    try {
      const name = snapshotName.trim() || `NotebookLM Export ${new Date().toLocaleDateString()}`;
      await createSynapseSnapshot(name, pasteText);
      setPasteText("");
      setSnapshotName("");
      const updated = await getSynapseSnapshots();
      setSnapshots(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSynapseSnapshot(id);
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{
            fontFamily: mono, fontSize: 10, fontWeight: 600,
            padding: "2px 8px", borderRadius: 4,
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "var(--th-accent)",
            letterSpacing: "0.04em",
          }}>
            {tl("스냅샷 전용", "Snapshot only")}
          </span>
          <span style={{ ...base, fontSize: 10, color: "var(--th-text-muted)" }}>{tl("공식 API 미지원 — 수동 가져오기", "No official API — manual import")}</span>
        </div>
        <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", lineHeight: 1.6 }}>
          {tl("NotebookLM 분석 결과를 내보내어 에이전트 컨텍스트로 사용합니다.", "Export NotebookLM analysis results and use them as agent context.")}
        </div>
      </Card>

      <SectionLabel>Import Guide</SectionLabel>
      <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", marginBottom: 14, lineHeight: 1.8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span style={{ color: "var(--th-accent)", fontWeight: 700 }}>1</span>
          <span>{tl(`NotebookLM → "공유 및 내보내기" → 결과 복사`, `NotebookLM → "Share & export" → copy results`)}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span style={{ color: "var(--th-accent)", fontWeight: 700 }}>2</span>
          <span>{tl("아래 입력란에 붙여넣기 후 저장", "Paste into the text area below and save")}</span>
        </div>
      </div>

      <SectionLabel>Paste Export</SectionLabel>
      <Input value={snapshotName} onChange={setSnapshotName} placeholder={tl("스냅샷 이름 (선택사항)", "Snapshot name (optional)")} fullWidth />
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={tl("NotebookLM 내보내기 내용을 붙여넣으세요...", "Paste your NotebookLM export content here...")}
          rows={7}
          style={{
            ...base,
            width: "100%",
            boxSizing: "border-box",
            fontSize: 11,
            padding: "10px 12px",
            background: "var(--th-input-bg, var(--th-bg-primary))",
            color: "var(--th-text-primary)",
            border: "1px solid var(--th-border)",
            borderRadius: 6,
            resize: "vertical",
            outline: "none",
            lineHeight: 1.6,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(10,132,255,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--th-border)"; }}
        />
      </div>
      {error && <p style={{ ...base, fontSize: 10, color: "#ff453a", marginBottom: 8 }}>{error}</p>}
      <Btn primary onClick={handleSave} disabled={saving || !pasteText.trim()}>
        {saving ? tl("저장 중...", "Saving...") : tl("저장 및 인덱싱", "Save & Index")}
      </Btn>

      {snapshots.length > 0 && (
        <>
          <SectionLabel>Snapshots</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {snapshots.map((s) => (
              <div key={s.id} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "9px 12px",
                background: "var(--th-hover-overlay-subtle)",
                border: "1px solid var(--th-border)",
                borderRadius: 6,
              }}>
                <div>
                  <div style={{ ...base, fontSize: 11, color: "var(--th-text-primary)" }}>{s.name}</div>
                  {s.source && <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginTop: 1 }}>{s.source}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...base, fontSize: 10, color: "var(--th-text-muted)" }}>
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                  <Btn small danger onClick={() => handleDelete(s.id)}>{tl("삭제", "Delete")}</Btn>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Figma Tab ────────────────────────────────────────────────────────────────

function FigmaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 28.5C19 24.91 21.91 22 25.5 22C29.09 22 32 24.91 32 28.5C32 32.09 29.09 35 25.5 35C21.91 35 19 32.09 19 28.5Z" fill="currentColor" opacity="0.9"/>
      <path d="M6 47.5C6 43.91 8.91 41 12.5 41H19V47.5C19 51.09 16.09 54 12.5 54C8.91 54 6 51.09 6 47.5Z" fill="currentColor" opacity="0.6"/>
      <path d="M19 3V22H25.5C29.09 22 32 19.09 32 15.5C32 11.91 29.09 9 25.5 9H19V3Z" fill="currentColor" opacity="0.7"/>
      <path d="M6 15.5C6 19.09 8.91 22 12.5 22H19V9H12.5C8.91 9 6 11.91 6 15.5Z" fill="currentColor" opacity="0.8"/>
      <path d="M6 28.5C6 32.09 8.91 35 12.5 35H19V22H12.5C8.91 22 6 24.91 6 28.5Z" fill="currentColor" opacity="0.85"/>
    </svg>
  );
}

function FigmaTab() {
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [info, setInfo] = useState<{ connected: boolean; handle?: string; email?: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getFigmaInfo().then(setInfo).catch(() => {});
  }, []);

  async function handleConnect() {
    if (!token.trim()) return;
    setConnecting(true);
    setError("");
    try {
      const result = await connectFigma(token.trim());
      setInfo({ connected: true, handle: result.handle, email: result.email });
      setToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await disconnectSynapse("figma");
    setInfo({ connected: false });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 연결 상태 */}
      {info?.connected ? (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px",
          border: "1px solid rgba(48,209,88,0.3)",
          background: "rgba(48,209,88,0.06)",
          borderRadius: 0,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#30d158", display: "inline-block", flexShrink: 0 }} />
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--th-text-primary)" }}>
                <FigmaIcon />
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700 }}>
                  Figma
                </span>
              </span>
              <span style={{ fontFamily: mono, fontSize: 10, color: "#30d158" }}>{tl("연결됨", "connected", "接続済み", "已连接")}</span>
            </div>
            {info.handle && (
              <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", paddingLeft: 15 }}>
                @{info.handle}{info.email ? ` · ${info.email}` : ""}
              </span>
            )}
          </div>
          <Btn small danger onClick={() => void handleDisconnect()}>
            {tl("연결 해제", "Disconnect")}
          </Btn>
        </div>
      ) : (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px",
          border: "1px solid var(--th-border)",
          background: "var(--th-bg-surface)",
          borderRadius: 0,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--th-border-strong)", display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
            {tl("미연결 — 아래에 Personal Access Token을 입력하세요", "not connected — enter your Personal Access Token below")}
          </span>
        </div>
      )}

      {/* 토큰 입력 */}
      {!info?.connected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontFamily: mono, fontSize: 9, color: "var(--th-accent)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            // {tl("개인 액세스 토큰", "personal access token")}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="password"
              placeholder="figd_xxxxxxxxxxxx..."
              value={token}
              onChange={(e) => { setToken(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") void handleConnect(); }}
              style={{
                fontFamily: mono, flex: 1, fontSize: 11,
                padding: "6px 10px",
                background: "var(--th-bg-elevated)",
                border: `1px solid ${error ? "#ff453a" : "var(--th-border)"}`,
                borderRadius: 0, color: "var(--th-text-primary)", outline: "none",
              }}
            />
            <Btn onClick={() => void handleConnect()} disabled={!token.trim() || connecting}>
              {connecting ? tl("연결 중...", "Connecting...") : tl("연결", "Connect")}
            </Btn>
          </div>
          {error && (
            <span style={{ fontFamily: mono, fontSize: 10, color: "#ff453a" }}>{error}</span>
          )}
        </div>
      )}

      {/* 사용 안내 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 14px", background: "var(--th-bg-surface)", border: "1px solid var(--th-border)", borderRadius: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
          // {tl("사용 방법", "how to use")}
        </div>
        {[
          tl("태스크 생성 → FIGMA DESIGN 섹션 → URL 첨부", "Create task → FIGMA DESIGN section → attach URL", "タスク作成 → FIGMA DESIGN → URL添付", "创建任务 → FIGMA DESIGN → 附加URL"),
          tl("에이전트 실행 시 Figma 노드 메타데이터 자동 주입", "Figma node metadata is auto-injected at agent runtime", "エージェント実行時にFigmaメタデータを自動注入", "代理运行时自动注入Figma节点元数据"),
          tl("Design Workflow 템플릿과 함께 사용 시 더욱 효과적", "Works best combined with the Design Workflow template", "Design Workflowテンプレートと組み合わせると最も効果的", "与Design Workflow模板结合使用效果最佳"),
        ].map((text, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-accent)", flexShrink: 0 }}>▸</span>
            <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-secondary)", lineHeight: 1.5 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Rules Tab ────────────────────────────────────────────────────────────────

const BLANK_RULE = {
  name: "",
  source: "obsidian" as "obsidian" | "notion",
  triggerPattern: "",
  titleTemplate: tl("{{filename}} 파일 변경됨", "{{filename}} file changed"),
};

function RulesTab() {
  const [rules, setRules] = useState<SynapseRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_RULE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSynapseRules().then(setRules).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleToggle = async (rule: SynapseRule) => {
    try {
      const updated = await updateSynapseRule(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => r.id === rule.id ? updated : r));
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    await deleteSynapseRule(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = async () => {
    if (!form.name || !form.titleTemplate) return;
    setSaving(true);
    setError("");
    try {
      const created = await createSynapseRule({
        name: form.name,
        source: form.source,
        trigger: { type: form.source === "obsidian" ? "file_change" : "page_updated", pattern: form.triggerPattern || undefined },
        action: { type: "create_task", title_template: form.titleTemplate },
      });
      setRules((prev) => [created, ...prev]);
      setForm(BLANK_RULE);
      setShowForm(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Card>
        <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", lineHeight: 1.6 }}>
          {tl("Obsidian 파일 변경 또는 Notion 페이지 업데이트 시 태스크를 자동 생성합니다.", "Auto-create tasks on Obsidian file changes or Notion page updates.")}
          {" "}{tl("제목 템플릿에서", "Template variables:")} <code style={{ color: "var(--th-accent)", fontFamily: mono }}>{"{{filename}}"}</code>,{" "}
          <code style={{ color: "var(--th-accent)", fontFamily: mono }}>{"{{path}}"}</code>,{" "}
          <code style={{ color: "var(--th-accent)", fontFamily: mono }}>{"{{title}}"}</code> {tl("사용 가능합니다.", "available.")}
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn primary small onClick={() => { setShowForm(!showForm); setError(""); }}>
          {showForm ? tl("취소", "Cancel") : tl("+ 규칙 추가", "+ Add Rule")}
        </Btn>
      </div>

      {showForm && (
        <Card accent>
          <SectionLabel>New Rule</SectionLabel>
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>{tl("규칙 이름", "Rule Name")}</div>
            <Input value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder={tl("예: .md 변경 시 리뷰 태스크 생성", "e.g. Create review task on .md change")} fullWidth />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>{tl("트리거 소스", "Trigger Source")}</div>
              <select
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as "obsidian" | "notion" }))}
                style={{
                  ...base, fontSize: 11, padding: "7px 10px",
                  background: "var(--th-input-bg, var(--th-bg-primary))",
                  border: "1px solid var(--th-border)",
                  borderRadius: 6,
                  color: "var(--th-text-primary)",
                  width: "100%",
                  outline: "none",
                }}
              >
                <option value="obsidian">{tl("Obsidian (파일 변경)", "Obsidian (file change)")}</option>
                <option value="notion">{tl("Notion (페이지 업데이트)", "Notion (page update)")}</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>{tl("패턴 필터 (비우면 전체)", "Pattern filter (empty = all)")}</div>
              <Input value={form.triggerPattern} onChange={(v) => setForm((f) => ({ ...f, triggerPattern: v }))} placeholder="Daily" fullWidth />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>{tl("태스크 제목 템플릿", "Task Title Template")}</div>
            <Input value={form.titleTemplate} onChange={(v) => setForm((f) => ({ ...f, titleTemplate: v }))} placeholder="{{filename}} changed — review needed" fullWidth />
          </div>
          {error && <div style={{ ...base, fontSize: 10, color: "#ff453a", marginBottom: 8 }}>{error}</div>}
          <Btn primary onClick={handleSave} disabled={saving || !form.name || !form.titleTemplate}>
            {saving ? tl("저장 중...", "Saving...") : tl("규칙 생성", "Create Rule")}
          </Btn>
        </Card>
      )}

      <SectionLabel>Active Rules</SectionLabel>
      {loading && <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", padding: "8px 0" }}>{tl("로드 중...", "Loading...")}</div>}
      {!loading && rules.length === 0 && (
        <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", padding: "12px 0" }}>
          {tl("규칙 없음 — 위의 규칙 추가로 자동화를 설정하세요.", "No rules — click '+ Add Rule' above to set up automation.")}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rules.map((rule) => (
          <div key={rule.id} style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "10px 12px",
            background: "var(--th-hover-overlay-subtle)",
            border: `1px solid ${rule.enabled ? "rgba(245,158,11,0.3)" : "var(--th-border)"}`,
            borderRadius: 6,
            opacity: rule.enabled ? 1 : 0.55,
            transition: "opacity 0.15s, border-color 0.15s",
          }}>
            <button
              type="button"
              onClick={() => void handleToggle(rule)}
              style={{
                ...base, fontSize: 9, fontWeight: 700,
                padding: "3px 7px",
                borderRadius: 4,
                border: `1px solid ${rule.enabled ? "rgba(245,158,11,0.4)" : "var(--th-border)"}`,
                background: rule.enabled ? "rgba(245,158,11,0.12)" : "transparent",
                color: rule.enabled ? "var(--th-accent)" : "var(--th-text-muted)",
                cursor: "pointer",
                flexShrink: 0,
                letterSpacing: "0.06em",
              }}
            >
              {rule.enabled ? "ON" : "OFF"}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...base, fontSize: 11, fontWeight: 600, color: "var(--th-text-primary)" }}>{rule.name}</div>
              <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>
                {rule.source}&nbsp;
                {rule.trigger.pattern ? `· pattern: ${rule.trigger.pattern}` : "· all files"}
                &nbsp;→&nbsp;{rule.action.title_template}
              </div>
              {rule.last_fired_at && (
                <div style={{ ...base, fontSize: 9, color: "var(--th-text-muted)", marginTop: 2 }}>
                  {tl("마지막 실행:", "Last run:")} {new Date(rule.last_fired_at).toLocaleString()}
                </div>
              )}
            </div>

            <Btn small danger onClick={() => void handleDelete(rule.id)}>{tl("삭제", "Delete")}</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SynapseSettingsTab() {
  const [subTab, setSubTab] = useState<SubTab>("notion");
  const [helpOpen, setHelpOpen] = useState(false);

  const SUB_TABS: Array<{ key: SubTab; label: string }> = [
    { key: "notion",      label: "Notion" },
    { key: "obsidian",    label: "Obsidian" },
    { key: "notebooklm",  label: "NotebookLM" },
    { key: "figma",       label: "Figma" },
    { key: "rules",       label: "Rules" },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* 서브탭 네비게이션 */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        borderBottom: "1px solid var(--th-border)",
        marginBottom: 16,
        paddingBottom: 0,
      }}>
        <div style={{ display: "flex", flex: 1, gap: 2 }}>
          {SUB_TABS.map((t) => {
            const active = subTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setSubTab(t.key)}
                style={{
                  ...base,
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  padding: "7px 14px",
                  background: "transparent",
                  color: active ? "var(--th-accent)" : "var(--th-text-muted)",
                  border: "none",
                  borderBottom: `2px solid ${active ? "var(--th-accent)" : "transparent"}`,
                  cursor: "pointer",
                  transition: "color 0.12s",
                  borderRadius: 0,
                  marginBottom: -1,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--th-text-secondary)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--th-text-muted)"; }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ? 도움말 버튼 */}
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          title={tl("도움말", "Help")}
          style={{
            width: 24, height: 24,
            borderRadius: "50%",
            border: "1px solid var(--th-border)",
            background: "var(--th-hover-overlay)",
            color: "var(--th-text-muted)",
            fontFamily: mono,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginBottom: 4,
            transition: "border-color 0.12s, color 0.12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(10,132,255,0.4)";
            e.currentTarget.style.color = "#0a84ff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--th-border)";
            e.currentTarget.style.color = "var(--th-text-muted)";
          }}
        >
          ?
        </button>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {subTab === "notion"     && <NotionTab />}
        {subTab === "obsidian"   && <ObsidianTab />}
        {subTab === "notebooklm" && <NotebookLMTab />}
        {subTab === "figma"      && <FigmaTab />}
        {subTab === "rules"      && <RulesTab />}
      </div>

      {/* 도움말 패널 */}
      {helpOpen && <HelpPanel tab={subTab} onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
