import { useState } from "react";
import type { I18nContextValue } from "../../i18n";
import { IconTrash } from "./DesktopIcons";
import type { TrashedProject, TrashedFeature } from "./DesktopTypes";

export function TrashIcon({
  t,
  count,
  onClick,
}: {
  t: I18nContextValue["t"];
  count: number;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const full = count > 0;
  return (
    <div
      data-no-ctx="true"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        position: "absolute",
        right: 24,
        bottom: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        cursor: "pointer",
        userSelect: "none",
        zIndex: 10,
        transform: hov ? "scale(1.06)" : "scale(1)",
        transition: "transform 0.12s",
      }}
    >
      <div style={{ position: "relative" }}>
        <div
          style={{
            width: 56,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            background: hov ? "rgba(255,59,48,0.12)" : full ? "rgba(255,59,48,0.06)" : "rgba(128,128,128,0.08)",
            border: `1px solid ${hov ? "rgba(255,59,48,0.4)" : full ? "rgba(255,59,48,0.2)" : "rgba(128,128,128,0.15)"}`,
            transition: "background 0.15s, border 0.15s",
          }}
        >
          <IconTrash color={hov || full ? "#ff3b30" : "var(--th-text-muted)"} />
        </div>
        {full && (
          <div
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: "#ff3b30",
              border: "1.5px solid var(--th-bg-base)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--th-font-mono)",
              fontSize: 9,
              fontWeight: 700,
              color: "#fff",
              paddingInline: 3,
            }}
          >
            {count}
          </div>
        )}
      </div>
      <span
        style={{
          fontFamily: "var(--th-font-mono)",
          fontSize: 10,
          color: hov || full ? "#ff3b30" : "var(--th-text-secondary)",
          transition: "color 0.15s",
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}
      >
        {t({ ko: "휴지통", en: "Trash", ja: "ゴミ箱", zh: "垃圾桶" })}
      </span>
    </div>
  );
}

export function TrashModal({
  t,
  items,
  features,
  onClose,
  onRestore,
  onDelete,
  onRestoreFeature,
  onDeleteFeature,
  onEmpty,
}: {
  t: I18nContextValue["t"];
  items: TrashedProject[];
  features: TrashedFeature[];
  onClose: () => void;
  onRestore: (item: TrashedProject) => Promise<void>;
  onDelete: (item: TrashedProject) => void;
  onRestoreFeature: (f: TrashedFeature) => void;
  onDeleteFeature: (f: TrashedFeature) => Promise<void>;
  onEmpty: () => Promise<void>;
}) {
  const mono = { fontFamily: "var(--th-font-mono)" };
  const fmt = (ts: number) => new Date(ts).toLocaleDateString();

  return (
    <div
      data-no-ctx="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3100,
        background: "var(--th-modal-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(520px, 92vw)",
          maxHeight: "70vh",
          background: "var(--th-bg-elevated)",
          border: "1px solid var(--th-border)",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid var(--th-border)",
            background: "var(--th-bg-panel)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={onClose}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#ff5f57",
                border: "none",
                cursor: "pointer",
              }}
            />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27c93f" }} />
          </div>
          <IconTrash color="var(--th-text-secondary)" />
          <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)" }}>
            {t({ ko: "휴지통", en: "Trash", ja: "ゴミ箱", zh: "垃圾桶" })}
          </span>
          <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginLeft: "auto" }}>
            {items.length + features.length} {t({ ko: "항목", en: "items", ja: "項目", zh: "项" })}
          </span>
          {(items.length + features.length) > 0 && (
            <button
              onClick={() => void onEmpty()}
              style={{
                ...mono,
                fontSize: 10,
                padding: "3px 10px",
                borderRadius: 4,
                cursor: "pointer",
                border: "1px solid rgba(255,59,48,0.4)",
                background: "rgba(255,59,48,0.08)",
                color: "#ff3b30",
              }}
            >
              {t({ ko: "모두 삭제", en: "Empty Trash", ja: "すべて削除", zh: "清空垃圾桶" })}
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {items.length + features.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 160,
                gap: 10,
              }}
            >
              <IconTrash color="var(--th-text-muted)" />
              <span style={{ ...mono, fontSize: 12, color: "var(--th-text-muted)" }}>
                {t({ ko: "휴지통이 비어 있습니다", en: "Trash is empty", ja: "ゴミ箱は空です", zh: "垃圾桶为空" })}
              </span>
            </div>
          ) : (
            [...items.map((d) => ({ kind: "project" as const, deletedAt: d.deletedAt, data: d })),
             ...features.map((d) => ({ kind: "feature" as const, deletedAt: d.deletedAt, data: d }))]
              .sort((a, b) => b.deletedAt - a.deletedAt)
              .map((entry) =>
                entry.kind === "project" ? (
                  <div
                    key={entry.data.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "9px 16px",
                      borderBottom: "1px solid var(--th-border)",
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📁</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          ...mono,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--th-text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.data.name}
                      </div>
                      <div
                        style={{
                          ...mono,
                          fontSize: 9,
                          color: "var(--th-text-muted)",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {(entry.data as TrashedProject).project_path}
                      </div>
                    </div>
                    <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0 }}>
                      {fmt(entry.deletedAt)}
                    </span>
                    <button
                      onClick={() => void onRestore(entry.data as TrashedProject)}
                      style={{
                        ...mono,
                        fontSize: 10,
                        padding: "3px 9px",
                        borderRadius: 4,
                        cursor: "pointer",
                        border: "1px solid var(--th-border)",
                        background: "transparent",
                        color: "var(--th-text-secondary)",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "#22c55e";
                        (e.currentTarget as HTMLElement).style.color = "#22c55e";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--th-border)";
                        (e.currentTarget as HTMLElement).style.color = "var(--th-text-secondary)";
                      }}
                    >
                      {t({ ko: "복원", en: "Restore", ja: "復元", zh: "还原" })}
                    </button>
                    <button
                      onClick={() => onDelete(entry.data as TrashedProject)}
                      style={{
                        ...mono,
                        fontSize: 10,
                        padding: "3px 9px",
                        borderRadius: 4,
                        cursor: "pointer",
                        border: "1px solid rgba(255,59,48,0.3)",
                        background: "transparent",
                        color: "#ff3b30",
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (() => {
                  const f = entry.data as TrashedFeature;
                  return (
                    <div
                      key={f.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "9px 16px",
                        borderBottom: "1px solid var(--th-border)",
                      }}
                    >
                      {f.icon_svg ? (
                        <span
                          style={{ width: 22, height: 22, flexShrink: 0 }}
                          dangerouslySetInnerHTML={{ __html: f.icon_svg }}
                        />
                      ) : (
                        <span style={{ fontSize: 18, flexShrink: 0 }}>🔧</span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            ...mono,
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--th-text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {f.name}
                        </div>
                        <div style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 2 }}>
                          App
                        </div>
                      </div>
                      <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0 }}>
                        {fmt(entry.deletedAt)}
                      </span>
                      <button
                        onClick={() => onRestoreFeature(f)}
                        style={{
                          ...mono,
                          fontSize: 10,
                          padding: "3px 9px",
                          borderRadius: 4,
                          cursor: "pointer",
                          border: "1px solid var(--th-border)",
                          background: "transparent",
                          color: "var(--th-text-secondary)",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "#22c55e";
                          (e.currentTarget as HTMLElement).style.color = "#22c55e";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--th-border)";
                          (e.currentTarget as HTMLElement).style.color = "var(--th-text-secondary)";
                        }}
                      >
                        {t({ ko: "복원", en: "Restore", ja: "復元", zh: "还原" })}
                      </button>
                      <button
                        onClick={() => void onDeleteFeature(f)}
                        style={{
                          ...mono,
                          fontSize: 10,
                          padding: "3px 9px",
                          borderRadius: 4,
                          cursor: "pointer",
                          border: "1px solid rgba(255,59,48,0.3)",
                          background: "transparent",
                          color: "#ff3b30",
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })()
              )
          )}
        </div>
      </div>
    </div>
  );
}
