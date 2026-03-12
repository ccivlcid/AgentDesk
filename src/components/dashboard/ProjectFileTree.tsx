import { useCallback, useEffect, useRef, useState } from "react";
import { getProjectFileTree } from "../../api/organization-projects";
import type { FileTreeNode } from "../../api/organization-projects";

interface ProjectFileTreeProps {
  projectPath: string;
}

type CollapseState = Record<string, boolean>;

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)", fontSize: "10px" };

function baseName(p: string): string {
  return p.replace(/\\/g, "/").split("/").filter(Boolean).at(-1) ?? p;
}

function buildKey(parentKey: string, name: string): string {
  return `${parentKey}/${name}`;
}

function renderNodes(
  nodes: FileTreeNode[],
  parentKey: string,
  prefixSegments: string[],
  collapseState: CollapseState,
  onToggle: (key: string) => void,
  lines: React.ReactNode[],
): void {
  nodes.forEach((node, i) => {
    const isLast = i === nodes.length - 1;
    const nodeKey = buildKey(parentKey, node.name);
    const isDir = node.type === "dir";
    const collapsed = isDir && Boolean(collapseState[nodeKey]);
    const hasChildren = isDir && Array.isArray(node.children) && node.children.length > 0;

    const connector = isLast ? "└── " : "├── ";
    const prefixStr = prefixSegments.join("");
    const sigil = isDir ? (collapsed ? "▸" : "▾") : "·";
    const nameColor = isDir ? "var(--th-terminal-info)" : "var(--th-terminal-text)";

    lines.push(
      <div
        key={nodeKey}
        onClick={isDir && hasChildren ? () => onToggle(nodeKey) : undefined}
        style={{
          display: "flex",
          alignItems: "baseline",
          lineHeight: "1.6",
          cursor: isDir && hasChildren ? "pointer" : "default",
          userSelect: "none",
        }}
      >
        <span style={{ ...mono, color: "var(--th-terminal-text)", opacity: 0.25, whiteSpace: "pre" }}>
          {prefixStr}{connector}
        </span>
        <span style={{ ...mono, color: nameColor, opacity: 0.65, marginRight: "3px", flexShrink: 0 }}>
          {sigil}
        </span>
        <span
          style={{
            ...mono,
            color: nameColor,
            fontWeight: isDir ? 600 : 400,
            opacity: isDir ? 0.9 : 0.6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={node.name}
        >
          {node.name}
        </span>
      </div>,
    );

    if (isDir && !collapsed && hasChildren) {
      renderNodes(
        node.children ?? [],
        nodeKey,
        [...prefixSegments, isLast ? "   " : "│  "],
        collapseState,
        onToggle,
        lines,
      );
    }
  });
}

export default function ProjectFileTree({ projectPath }: ProjectFileTreeProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [root, setRoot] = useState<string>("");
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapseState, setCollapseState] = useState<CollapseState>({});
  const loadedPathRef = useRef<string>("");

  const load = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getProjectFileTree(projectPath);
      setTree(result.tree);
      setRoot(result.root);
      setTruncated(result.truncated);
      setCollapseState({});
      loadedPathRef.current = projectPath;
    } catch {
      setError("read failed");
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = useCallback((key: string) => {
    setCollapseState((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const projectName = baseName(root || projectPath);

  const lines: React.ReactNode[] = [];
  if (panelOpen && tree.length > 0) {
    renderNodes(tree, "", [], collapseState, handleToggle, lines);
  }

  return (
    <div style={{ borderTop: "1px solid var(--th-border)", flexShrink: 0 }}>
      {/* 헤더 */}
      <div
        style={{
          ...mono,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          background: "var(--th-bg-elevated)",
          borderBottom: panelOpen ? "1px solid var(--th-border)" : "none",
          borderLeft: "3px solid var(--th-accent)",
        }}
      >
        <span style={{ fontSize: "9px", color: "var(--th-accent)", opacity: 0.7 }}>//</span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--th-text-muted)",
            flex: 1,
            textTransform: "uppercase",
          }}
        >
          file tree
        </span>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          title="Refresh"
          style={{
            ...mono,
            fontSize: "9px",
            background: "none",
            border: "none",
            color: loading ? "var(--th-text-muted)" : "var(--th-accent)",
            cursor: loading ? "default" : "pointer",
            padding: "0 2px",
            opacity: loading ? 0.4 : 1,
          }}
        >
          [↺]
        </button>
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          style={{
            ...mono,
            fontSize: "10px",
            background: "none",
            border: "none",
            color: "var(--th-text-muted)",
            cursor: "pointer",
            padding: "0 2px",
          }}
        >
          {panelOpen ? "▾" : "▸"}
        </button>
      </div>

      {/* 바디 */}
      {panelOpen && (
        <div
          style={{
            background: "var(--th-terminal-bg, var(--th-bg-primary))",
            padding: "5px 8px 8px",
          }}
        >
          {/* 루트 라인 */}
          <div
            style={{
              ...mono,
              display: "flex",
              alignItems: "baseline",
              gap: 4,
              marginBottom: 3,
              paddingBottom: 3,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span style={{ color: "var(--th-terminal-prompt)", opacity: 0.6 }}>$</span>
            <span style={{ color: "var(--th-terminal-text)", opacity: 0.35 }}>tree</span>
            <span style={{ color: "var(--th-terminal-prompt)", fontWeight: 700, opacity: 0.9 }}>
              ./{projectName}
            </span>
          </div>

          {loading && (
            <div style={{ ...mono, color: "var(--th-terminal-text)", opacity: 0.35, padding: "4px 0", fontStyle: "italic" }}>
              scanning…
            </div>
          )}
          {error && !loading && (
            <div style={{ ...mono, color: "var(--th-terminal-error)", opacity: 0.8, padding: "4px 0" }}>
              ✗ {error}
            </div>
          )}
          {!loading && !error && tree.length === 0 && (
            <div style={{ ...mono, color: "var(--th-terminal-text)", opacity: 0.3, padding: "4px 0" }}>
              (empty directory)
            </div>
          )}

          {lines}

          {truncated && (
            <div style={{ ...mono, color: "var(--th-terminal-text)", opacity: 0.3, marginTop: 4, fontStyle: "italic" }}>
              … truncated
            </div>
          )}
        </div>
      )}
    </div>
  );
}
