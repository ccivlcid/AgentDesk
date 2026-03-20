import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";
import { sendMessage } from "../../../api";
import { uploadChatFiles } from "../../../api/messaging-runtime-oauth";
import type { KbSourceRef } from "../../../api/synapse";
import { fetchSynapseContext } from "../../../api/synapse";
import type { ChatMode, Priority } from "./types";
import { formatFileSize } from "./utils";

export function useGroupChatSend(
  input: string,
  attachments: File[],
  kbSources: KbSourceRef[],
  sending: boolean,
  selectedIds: Set<string>,
  chatMode: ChatMode,
  deadline: string,
  priority: Priority,
  fetchForAgent: (agentId: string) => Promise<void>,
  tr: (ko: string, en: string) => string,
  setSending: (v: boolean) => void,
  setSendError: (v: string | null) => void,
  setSentOk: (v: boolean) => void,
  setUploading: (v: boolean) => void,
  setAttachments: Dispatch<SetStateAction<File[]>>,
  setKbSources: Dispatch<SetStateAction<KbSourceRef[]>>,
  setInput: (v: string) => void,
  setDeadline: (v: string) => void,
  setPriority: (p: Priority) => void,
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
            uploaded.map((a) => `[📎 ${a.fileName} (${formatFileSize(a.size)})]`).join(" ") +
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
                  ? `📘 ${s.label ?? s.id}`
                  : `📓 ${s.label ?? s.id}`,
              )
              .join(", ");
            kbPrefix = `[첨부 지식 베이스: ${labels}]\n\n${kbContent}\n\n---\n`;
          }
        } catch {
          /* non-fatal */
        }
        setKbSources([]);
      }

      let modePrefix = "";
      if (chatMode === "task") {
        modePrefix = `[TASK:${deadline}:${priority}]\n`;
      } else if (chatMode === "urgent") {
        modePrefix = "[URGENT]\n";
      }

      const content = modePrefix + kbPrefix + prefix + trimmed;
      if (!content.trim()) return;
      for (const agentId of selectedIds) {
        await sendMessage({
          receiver_type: "agent",
          receiver_id: agentId,
          content,
          message_type:
            chatMode === "task"
              ? "task_assign"
              : chatMode === "urgent"
                ? "directive"
                : "chat",
        });
      }
      setSentOk(true);
      setInput("");
      setDeadline("");
      setPriority("normal");
      textareaRef.current?.focus();
      await Promise.all(Array.from(selectedIds).map((id) => fetchForAgent(id)));
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
    fetchForAgent,
    tr,
    chatMode,
    deadline,
    priority,
    setSending,
    setSendError,
    setSentOk,
    setUploading,
    setAttachments,
    setKbSources,
    setInput,
    setDeadline,
    setPriority,
    textareaRef,
  ]);
}
