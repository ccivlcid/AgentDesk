import { useState, useEffect, useCallback } from "react";
import { connectNotion, getNotionInfo, searchNotionPages, disconnectSynapse } from "../../../api/synapse";
import type { NotionPage } from "../../../api/synapse";
import { tl } from "./tl";
import { base } from "./constants";
import { StatusBadge, SectionLabel, Btn, Input, Card, SearchBar } from "./ui";

export function NotionTab() {
  const [connected, setConnected] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [query, setQuery] = useState("");
  const [loadingPages, setLoadingPages] = useState(false);

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

  useEffect(() => {
    getNotionInfo().then((info) => {
      setConnected(info.connected);
      if (info.workspace_name) setWorkspaceName(info.workspace_name);
      if (info.connected) loadPages("");
    }).catch(() => {});
  }, [loadPages]);

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
            <span style={{ ...base, fontSize: 11, color: "var(--th-text-primary)" }}>{page.title}</span>
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
