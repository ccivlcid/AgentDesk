import type { TaskExecutionState } from "../../types";

interface Props {
  state: TaskExecutionState | undefined | null;
  attempt?: number | null;
}

interface StateMeta {
  label: { ko: string; en: string };
  color: string;
  bg: string;
  pulse?: boolean;
}

const STATE_META: Record<TaskExecutionState, StateMeta> = {
  queued:               { label: { ko: "대기 중",       en: "QUEUED"      }, color: "#8e8e93", bg: "rgba(142,142,147,0.12)" },
  claiming:             { label: { ko: "할당 중",       en: "CLAIMING"    }, color: "#5ac8fa", bg: "rgba(90,200,250,0.12)"  },
  workspace_preparing:  { label: { ko: "워크스페이스 준비", en: "PREPARING" }, color: "#5ac8fa", bg: "rgba(90,200,250,0.12)", pulse: true },
  ready:                { label: { ko: "준비됨",        en: "READY"       }, color: "#30d158", bg: "rgba(48,209,88,0.12)"   },
  running:              { label: { ko: "실행 중",       en: "RUNNING"     }, color: "#30d158", bg: "rgba(48,209,88,0.14)",  pulse: true },
  awaiting_review:      { label: { ko: "검토 대기",     en: "REVIEWING"   }, color: "var(--th-accent)", bg: "var(--th-accent-bg)" },
  retry_backoff:        { label: { ko: "재시도 대기",   en: "RETRY WAIT"  }, color: "#ff9f0a", bg: "rgba(255,159,10,0.12)", pulse: true },
  blocked:              { label: { ko: "차단됨",        en: "BLOCKED"     }, color: "#ff453a", bg: "rgba(255,69,58,0.12)"  },
  stalled:              { label: { ko: "멈춤",          en: "STALLED"     }, color: "#ff453a", bg: "rgba(255,69,58,0.12)"  },
  recovering:           { label: { ko: "복구 중",       en: "RECOVERING"  }, color: "#ff9f0a", bg: "rgba(255,159,10,0.12)", pulse: true },
  succeeded:            { label: { ko: "성공",          en: "SUCCEEDED"   }, color: "#30d158", bg: "rgba(48,209,88,0.12)"  },
  failed:               { label: { ko: "실패",          en: "FAILED"      }, color: "#ff453a", bg: "rgba(255,69,58,0.12)"  },
  cancelled:            { label: { ko: "취소됨",        en: "CANCELLED"   }, color: "#8e8e93", bg: "rgba(142,142,147,0.12)" },
};

export default function TaskExecutionStateBadge({ state, attempt }: Props) {
  if (!state) return null;
  const meta = STATE_META[state];
  if (!meta) return null;

  const mono = "var(--th-font-mono, monospace)";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: 4,
        background: meta.bg,
        border: `1px solid ${meta.color}33`,
        fontFamily: mono,
        fontSize: 9,
        fontWeight: 700,
        color: meta.color,
        letterSpacing: "0.08em",
      }}>
        {meta.pulse && (
          <span style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: meta.color,
            display: "inline-block",
            animation: "pulse 1.5s ease-in-out infinite",
            flexShrink: 0,
          }} />
        )}
        {meta.label.en}
      </span>

      {/* 재시도 횟수 (2회 이상) */}
      {attempt != null && attempt > 1 && (
        <span style={{
          fontFamily: mono,
          fontSize: 9,
          color: "#ff9f0a",
          background: "rgba(255,159,10,0.10)",
          border: "1px solid rgba(255,159,10,0.25)",
          borderRadius: 4,
          padding: "2px 6px",
          letterSpacing: "0.04em",
        }}>
          retry #{attempt}
        </span>
      )}
    </span>
  );
}
