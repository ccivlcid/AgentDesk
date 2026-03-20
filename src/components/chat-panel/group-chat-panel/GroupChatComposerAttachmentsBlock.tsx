import { ACCEPTED_TYPES } from "./constants";
import type { GroupChatPanelVm } from "./types";
import { formatFileSize, getFileIcon } from "./utils";

type Props = Pick<
  GroupChatPanelVm,
  | "fileInputRef"
  | "onFileInputChange"
  | "kbSources"
  | "removeKbSource"
  | "attachments"
  | "removeAttachment"
>;

export function GroupChatComposerAttachmentsBlock({
  fileInputRef,
  onFileInputChange,
  kbSources,
  removeKbSource,
  attachments,
  removeAttachment,
}: Props) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        style={{ display: "none" }}
        onChange={onFileInputChange}
      />

      {kbSources.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {kbSources.map((src) => (
            <div
              key={src.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid var(--th-accent)",
                borderRadius: 12,
                fontSize: 10,
                color: "var(--th-accent)",
                fontFamily: "var(--th-font-mono)",
              }}
            >
              <span>{src.type === "notion_page" ? "📘" : "📓"}</span>
              <span
                style={{
                  maxWidth: 100,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {src.label ?? src.id}
              </span>
              <button
                type="button"
                onClick={() => removeKbSource(src.id)}
                style={{
                  color: "var(--th-accent)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: 0,
                  opacity: 0.7,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {attachments.map((file, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                background: "var(--th-bg-surface)",
                border: "1px solid var(--th-border)",
                borderRadius: 12,
                fontSize: 10,
                color: "var(--th-text-secondary)",
              }}
            >
              <span>{getFileIcon(file.name)}</span>
              <span
                style={{
                  maxWidth: 100,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </span>
              <span style={{ color: "var(--th-text-muted)" }}>
                ({formatFileSize(file.size)})
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                style={{
                  color: "var(--th-text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
