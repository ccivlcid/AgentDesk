import { FileTypeIcon, IconBookOpen, IconNotebook, IconX } from "../../ui/SvgIcons";
import { KAKAO_MSG } from "../messenger-kakao-theme";
import { ACCEPTED_TYPES } from "./constants";
import type { GroupChatPanelVm } from "./types";
import { formatFileSize } from "./utils";

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
                background: KAKAO_MSG.rowSelected,
                border: `1px solid rgba(201, 160, 0, 0.35)`,
                borderRadius: 12,
                fontSize: 10,
                color: "#8D6F00",
                fontFamily: KAKAO_MSG.fontSans,
              }}
            >
              <span>{src.type === "notion_page" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>}</span>
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
                  color: "#8D6F00",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: 0,
                  opacity: 0.7,
                }}
              >
                <IconX size={12} />
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
                background: KAKAO_MSG.surfaceMuted,
                border: `1px solid ${KAKAO_MSG.borderLight}`,
                borderRadius: 12,
                fontSize: 10,
                color: KAKAO_MSG.bubbleMineText,
                fontFamily: KAKAO_MSG.fontSans,
              }}
            >
              <FileTypeIcon fileName={file.name} size={12} style={{ color: KAKAO_MSG.meta, flexShrink: 0 }} />
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
              <span style={{ color: KAKAO_MSG.meta }}>
                ({formatFileSize(file.size)})
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                style={{
                  color: KAKAO_MSG.meta,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                <IconX size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
