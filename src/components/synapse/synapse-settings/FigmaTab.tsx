import { useState, useEffect } from "react";
import { connectFigma, getFigmaInfo, disconnectSynapse } from "../../../api/synapse";
import { tl } from "./tl";
import { base, mono } from "./constants";
import { Btn } from "./ui";

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

export function FigmaTab() {
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
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700 }}>Figma</span>
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
