import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";
import { sendGroupMessage, uploadChatFiles } from "../../../api/messaging-runtime-oauth";
import type { KbSourceRef } from "../../../api/synapse";
import { fetchSynapseContext } from "../../../api/synapse";
import { formatFileSize } from "./utils";

export function useGroupChatSend(
  input: string,
  attachments: File[],
  kbSources: KbSourceRef[],
  sending: boolean,
  selectedIds: Set<string>,
  currentRoomId: string | null,
  fetchForRoom: (roomId: string) => Promise<void>,
  setCurrentRoomId: (id: string) => void,
  tr: (ko: string, en: string) => string,
  setSending: (v: boolean) => void,
  setSendError: (v: string | null) => void,
  setSentOk: (v: boolean) => void,
  setUploading: (v: boolean) => void,
  setAttachments: Dispatch<SetStateAction<File[]>>,
  setKbSources: Dispatch<SetStateAction<KbSourceRef[]>>,
  setInput: (v: string) => void,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
): () => Promise<void> {
  return useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || sending || selectedIds.size === 0) return;
    setSending(true);
    setSendError(null);
    setSentOk(false);
    try {
      let prefix = "";
      if (attachments.length > 0) {
        setUploading(true);
        try {
          const uploaded = await uploadChatFiles(attachments);
          prefix =
            uploaded.map((a) => `[첨부] ${a.fileName} (${formatFileSize(a.size)})`).join(" ") +
            "\n";
        } catch {
          /* continue */
        } finally {
          setUploading(false);
        }
        setAttachments([]);
      }

      let kbPrefix = "";
      if (kbSources.length > 0) {
        try {
          const kbContent = await fetchSynapseContext(kbSources);
          if (kbContent) {
            const labels = kbSources
              .map((s) =>
                s.type === "notion_page"
                  ? `[Notion] ${s.label ?? s.id}`
                  : `[Obsidian] ${s.label ?? s.id}`,
              )
              .join(", ");
            kbPrefix = `[첨부 지식 베이스: ${labels}]\n\n${kbContent}\n\n---\n`;
          }
        } catch {
          /* non-fatal */
        }
        setKbSources([]);
      }

      const content = kbPrefix + prefix + trimmed;
      if (!content.trim()) return;

      const result = await sendGroupMessage({
        agent_ids: [...selectedIds],
        content,
        message_type: "chat",
        room_id: currentRoomId ?? undefined,
      });

      setCurrentRoomId(result.room_id);
      setSentOk(true);
      setInput("");
      textareaRef.current?.focus();
      void fetchForRoom(result.room_id).catch(() => {});
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message.slice(0, 80) : tr("전송 실패", "Send failed"),
      );
    } finally {
      setSending(false);
      setTimeout(() => setSentOk(false), 2000);
    }
  }, [
    input,
    attachments,
    kbSources,
    sending,
    selectedIds,
    currentRoomId,
    fetchForRoom,
    setCurrentRoomId,
    tr,
    setSending,
    setSendError,
    setSentOk,
    setUploading,
    setAttachments,
    setKbSources,
    setInput,
    textareaRef,
  ]);
}
