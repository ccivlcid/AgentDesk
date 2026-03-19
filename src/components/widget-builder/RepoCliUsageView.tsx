import { useState, useCallback } from "react";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

interface Command {
  cmd: string;
  desc: string;
}

interface CliUsageConfig {
  type: "cli-usage";
  repo_dir: string;
  npm_name?: string;
  description?: string;
  install_cmd?: string;
  commands?: Command[];
}

export default function RepoCliUsageView({ config }: { config: CliUsageConfig }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const commands = config.commands ?? [];
  const installCmd = config.install_cmd;
  const description = config.description;
  const repoName = config.npm_name || config.repo_dir?.split(/[/\\]/).pop() || "package";

  return (
    <div
      style={{
        ...mono,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--th-bg-elevated)",
        color: "var(--th-text-primary)",
        overflow: "auto",
      }}
    >
      {/* header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--th-border)",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--th-text-muted)" }}>
          $ usage{" "}
          <span style={{ color: "var(--th-accent)" }}>/ {repoName}</span>
        </div>
        {description && (
          <div style={{ fontSize: 11, color: "var(--th-text-muted)", marginTop: 4, lineHeight: 1.5 }}>
            // {description}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* install */}
        {installCmd && (
          <section>
            <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginBottom: 6, letterSpacing: "0.05em" }}>
              // install
            </div>
            <CmdRow cmd={installCmd} desc="" copied={copied} onCopy={copy} rowKey="install" />
          </section>
        )}

        {/* commands */}
        {commands.length > 0 && (
          <section>
            <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginBottom: 6, letterSpacing: "0.05em" }}>
              // usage examples
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {commands.map((c, i) => (
                <CmdRow
                  key={i}
                  cmd={c.cmd}
                  desc={c.desc}
                  copied={copied}
                  onCopy={copy}
                  rowKey={`cmd-${i}`}
                />
              ))}
            </div>
          </section>
        )}

        {/* repo path */}
        <section>
          <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginBottom: 6, letterSpacing: "0.05em" }}>
            // local path
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--th-text-muted)",
              background: "var(--th-bg-panel)",
              border: "1px solid var(--th-border)",
              borderRadius: 3,
              padding: "6px 10px",
              wordBreak: "break-all",
            }}
          >
            {config.repo_dir}
          </div>
        </section>
      </div>
    </div>
  );
}

function CmdRow({
  cmd,
  desc,
  copied,
  onCopy,
  rowKey,
}: {
  cmd: string;
  desc: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  rowKey: string;
}) {
  const isCopied = copied === rowKey;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
          background: "var(--th-bg-panel)",
          border: "1px solid var(--th-border)",
          borderRadius: 3,
          padding: "6px 10px",
        }}
      >
        <span
          style={{
            flex: 1,
            fontSize: 11,
            color: "var(--th-accent)",
            wordBreak: "break-all",
            lineHeight: 1.5,
          }}
        >
          {cmd}
        </span>
        <button
          onClick={() => onCopy(cmd, rowKey)}
          style={{
            flexShrink: 0,
            background: "none",
            border: "1px solid var(--th-border)",
            borderRadius: 3,
            color: isCopied ? "var(--th-attr-elite)" : "var(--th-text-muted)",
            fontFamily: "var(--th-font-mono)",
            fontSize: 9,
            padding: "2px 6px",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
        >
          {isCopied ? "✓ copied" : "copy"}
        </button>
      </div>
      {desc && (
        <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 3, paddingLeft: 2 }}>
          {desc}
        </div>
      )}
    </div>
  );
}
