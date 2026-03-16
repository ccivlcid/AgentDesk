import type { CustomFeatureConfig } from "../../../../types";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function MemoBoard({ config }: { config: CustomFeatureConfig }) {
  const content = (config.params?.content as string | undefined) ?? "";

  // 간단한 Markdown 렌더링 (헤더, 굵게, 목록만 지원)
  const lines = content.split("\n");

  return (
    <div className="flex flex-col gap-1 p-3 overflow-y-auto h-full">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return <div key={i} style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-heading)", marginTop: i > 0 ? 8 : 0 }}>{line.slice(3)}</div>;
        }
        if (line.startsWith("# ")) {
          return <div key={i} style={{ ...mono, fontSize: 15, fontWeight: 800, color: "var(--th-accent)", marginTop: i > 0 ? 8 : 0 }}>{line.slice(2)}</div>;
        }
        if (line.startsWith("- ")) {
          return <div key={i} className="flex gap-2" style={{ ...mono, fontSize: 11, color: "var(--th-text-primary)" }}><span style={{ color: "var(--th-accent)" }}>·</span>{line.slice(2)}</div>;
        }
        if (line.trim() === "") {
          return <div key={i} style={{ height: 4 }} />;
        }
        return <div key={i} style={{ ...mono, fontSize: 11, color: "var(--th-text-primary)" }}>{line}</div>;
      })}
    </div>
  );
}
