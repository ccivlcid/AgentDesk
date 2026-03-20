import { PRIORITY_COLOR, PRIORITY_LABEL } from "./constants";
import { IconChat, IconTask, IconUrgent } from "./ModeIcons";
import type { ChatMode, GroupChatPanelVm, Priority } from "./types";

type Props = Pick<
  GroupChatPanelVm,
  | "t"
  | "isKo"
  | "chatMode"
  | "setChatMode"
  | "deadline"
  | "setDeadline"
  | "priority"
  | "setPriority"
>;

export function GroupChatComposerModes({
  t,
  isKo,
  chatMode,
  setChatMode,
  deadline,
  setDeadline,
  priority,
  setPriority,
}: Props) {
  const modeLabels: Record<ChatMode, { ko: string; en: string }> = {
    chat: { ko: "일반", en: "Chat" },
    task: { ko: "업무지시", en: "Task" },
    urgent: { ko: "긴급", en: "Urgent" },
  };

  return (
    <>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {(["chat", "task", "urgent"] as ChatMode[]).map((m) => {
          const active = chatMode === m;
          const modeColor =
            m === "urgent"
              ? "var(--th-danger)"
              : m === "task"
                ? "var(--th-accent)"
                : "var(--th-text-muted)";
          return (
            <button
              key={m}
              type="button"
              onClick={() => setChatMode(m)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 9px",
                borderRadius: 5,
                border: `1px solid ${active ? modeColor : "var(--th-border)"}`,
                background: active
                  ? m === "urgent"
                    ? "var(--th-danger-bg)"
                    : m === "task"
                      ? "var(--th-accent-glow)"
                      : "var(--th-bg-surface)"
                  : "transparent",
                color: active ? modeColor : "var(--th-text-muted)",
                fontFamily: "var(--th-font-mono)",
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
                letterSpacing: "0.02em",
              }}
            >
              <span
                style={{ color: active ? modeColor : "var(--th-text-muted)", display: "flex" }}
              >
                {m === "chat" ? <IconChat /> : m === "task" ? <IconTask /> : <IconUrgent />}
              </span>
              {isKo ? modeLabels[m].ko : modeLabels[m].en}
            </button>
          );
        })}
      </div>

      {chatMode === "task" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
            padding: "7px 10px",
            background: "var(--th-bg-surface)",
            border: "1px solid var(--th-accent-border)",
            borderRadius: 7,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--th-text-muted)",
              fontFamily: "var(--th-font-mono)",
              flexShrink: 0,
            }}
          >
            {isKo ? "마감" : "Due"}
          </span>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            style={{
              fontSize: 10,
              fontFamily: "var(--th-font-mono)",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--th-text-primary)",
              cursor: "pointer",
            }}
          />
          <div
            style={{ width: 1, height: 14, background: "var(--th-border)", flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 10,
              color: "var(--th-text-muted)",
              fontFamily: "var(--th-font-mono)",
              flexShrink: 0,
            }}
          >
            {isKo ? "우선순위" : "Priority"}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {(["high", "normal", "low"] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                style={{
                  padding: "2px 7px",
                  borderRadius: 4,
                  border: `1px solid ${priority === p ? PRIORITY_COLOR[p] : "var(--th-border)"}`,
                  background: "transparent",
                  color: priority === p ? PRIORITY_COLOR[p] : "var(--th-text-muted)",
                  fontFamily: "var(--th-font-mono)",
                  fontSize: 9,
                  fontWeight: priority === p ? 700 : 400,
                  cursor: "pointer",
                  transition: "all 0.12s",
                }}
              >
                {t(PRIORITY_LABEL[p])}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
