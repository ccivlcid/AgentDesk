import { useState, useEffect } from "react";
import {
  validateObsidianVault,
  connectObsidianLocal,
  connectObsidianRest,
  pingObsidianRest,
  getObsidianInfo,
  searchObsidianFiles,
  disconnectSynapse,
} from "../../../api/synapse";
import type { ObsidianNote } from "../../../api/synapse";
import { tl } from "./tl";
import { base } from "./constants";
import { StatusBadge, SectionLabel, Btn, Input, Card, SearchBar } from "./ui";

export function ObsidianTab() {
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
