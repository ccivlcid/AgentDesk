import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../../store/projectStore";
import { useI18n } from "../../../i18n";

const mono = "var(--th-font-mono)";

interface FileTreeNode {
  name: string;
  type: "dir" | "file";
  children?: FileTreeNode[];
}

function TreeNode({ node, depth }: { node: FileTreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const indent = depth * 14;

  if (node.type === "dir") {
    return (
      <div>
        <div
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "1px 8px 1px 0",
            paddingLeft: 8 + indent,
            cursor: "pointer",
            fontFamily: mono,
            fontSize: 11,
            color: "var(--th-text-secondary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "none"; }}
        >
          <span style={{ opacity: 0.5, fontSize: 9, width: 10, flexShrink: 0 }}>{open ? "▾" : "▸"}</span>
          <span style={{ opacity: 0.6, fontSize: 11, flexShrink: 0 }}>📁</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{node.name}</span>
        </div>
        {open && node.children?.map((child, i) => (
          <TreeNode key={i} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  const ext = node.name.split(".").pop() ?? "";
  const fileIcon =
    ["ts", "tsx", "js", "jsx"].includes(ext) ? "📄" :
    ["json", "yaml", "yml", "toml"].includes(ext) ? "📋" :
    ["md", "txt"].includes(ext) ? "📝" :
    ["png", "jpg", "svg", "gif"].includes(ext) ? "🖼" :
    ["sh", "bash"].includes(ext) ? "⚡" : "·";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 8px 1px 0",
        paddingLeft: 8 + indent,
        fontFamily: mono,
        fontSize: 11,
        color: "var(--th-text-muted)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <span style={{ opacity: 0.4, fontSize: 9, width: 10, flexShrink: 0 }} />
      <span style={{ opacity: 0.5, fontSize: 11, flexShrink: 0 }}>{fileIcon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{node.name}</span>
    </div>
  );
}

export default function FileTreeWidget() {
  const { projects, currentProjectId } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId) ?? null;
  const { t } = useI18n();
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [root, setRoot] = useState<string>("");
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const projectPath = project?.project_path ?? null;
    if (!projectPath || projectPath === lastPathRef.current) return;
    lastPathRef.current = projectPath;
    setLoading(true);
    setError(null);
    fetch(`/api/projects/path-tree?path=${encodeURIComponent(projectPath)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setTree(data.tree ?? []);
          setRoot(data.root ?? projectPath);
          setTruncated(data.truncated ?? false);
        } else {
          setError(data.error ?? "error");
        }
      })
      .catch(() => setError("fetch_failed"))
      .finally(() => setLoading(false));
  }, [project?.project_path]);

  const rootName = root ? root.split("/").pop() || root : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 경로 헤더 */}
      <div style={{
        padding: "4px 10px",
        borderBottom: "1px solid var(--th-border)",
        fontFamily: mono,
        fontSize: 10,
        color: "var(--th-text-muted)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <span style={{ color: "var(--th-accent)", opacity: 0.7 }}>$</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {root ? `tree ${root}` : "tree ./"}
        </span>
        {loading && <span style={{ opacity: 0.4 }}>…</span>}
      </div>

      {/* 트리 콘텐츠 */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {!project && (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px 12px", textAlign: "center" }}>
            {t({ ko: "프로젝트를 선택하세요", en: "Select a project", ja: "プロジェクトを選択", zh: "选择项目" })}
          </div>
        )}
        {project && error && (
          <div style={{ fontFamily: mono, fontSize: 11, color: "#ef4444", padding: "12px" }}>
            {error === "path_not_found" ? t({ ko: "경로를 찾을 수 없음", en: "Path not found", ja: "パスが見つかりません", zh: "路径未找到" }) :
             error === "fetch_failed" ? t({ ko: "서버 연결 실패", en: "Server connection failed", ja: "サーバー接続失敗", zh: "服务器连接失败" }) : error}
          </div>
        )}
        {project && !error && !loading && tree.length === 0 && (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", padding: "12px" }}>
            (empty directory)
          </div>
        )}
        {rootName && !error && (
          <div style={{
            fontFamily: mono, fontSize: 11,
            color: "var(--th-accent)", padding: "2px 8px",
            opacity: 0.8,
          }}>
            {rootName}/
          </div>
        )}
        {tree.map((node, i) => (
          <TreeNode key={i} node={node} depth={1} />
        ))}
        {truncated && (
          <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", padding: "4px 12px", opacity: 0.5 }}>
            … (truncated at 200 nodes)
          </div>
        )}
      </div>
    </div>
  );
}
