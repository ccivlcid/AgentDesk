import type { AgentRole, CliProvider } from "../../types";
import type { DeptForm, FormData } from "./types";

export const ROLES: AgentRole[] = ["team_leader", "senior", "junior"];
export const CLI_PROVIDERS: CliProvider[] = ["claude", "codex", "gemini", "opencode", "copilot", "antigravity", "cursor", "api", "ollama"];

export const ROLE_LABEL: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
  team_leader: { ko: "팀장", en: "Leader", ja: "リーダー", zh: "组长" },
  senior: { ko: "시니어", en: "Senior", ja: "シニア", zh: "高级" },
  junior: { ko: "주니어", en: "Junior", ja: "ジュニア", zh: "初级" },
  intern: { ko: "인턴", en: "Intern", ja: "インターン", zh: "实习" },
};

export const ROLE_BADGE: Record<string, string> = {
  team_leader: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  senior: "bg-sky-500/15 text-sky-400 border-sky-500/25",
  junior: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  intern: "bg-[rgba(100,116,139,0.15)] text-[#94a3b8] border-[rgba(100,116,139,0.25)]",
};

export const STATUS_DOT: Record<string, string> = {
  working: "bg-emerald-400 shadow-emerald-400/50 shadow-sm",
  break: "bg-amber-400",
  offline: "bg-red-400",
  idle: "bg-[#64748b]",
};

export const ICON_SPRITE_POOL = Array.from({ length: 13 }, (_, i) => i + 1);

export const EMOJI_GROUPS: { label: string; labelEn: string; emojis: string[] }[] = [
  {
    // 직무를 즉각 연상시키는 도구/역할 기호
    label: "직무/도구",
    labelEn: "Role",
    emojis: ["📊", "💻", "🎨", "🔍", "🛡️", "⚙️", "🏗️", "🗄️", "📝", "📈", "💼", "🗂️", "🎯", "🔧", "🧪", "🔐"],
  },
  {
    // 명확한 직업 정체성을 가진 인물 — 익명 실루엣 제외
    label: "인물/캐릭터",
    labelEn: "Character",
    emojis: ["🤖", "🧙", "🕵️", "😎", "🤓", "🧑‍💻", "👨‍🔬", "👩‍🎨", "🧑‍🏫", "🦸", "🧑‍🚀", "👨‍💼", "🦊", "🐱", "🐻", "🐼"],
  },
  {
    // 아이디어·성과·도구 — 의미 있는 사물
    label: "사물/기호",
    labelEn: "Object",
    emojis: ["💡", "🚀", "⚡", "🔥", "💎", "🏆", "🎵", "🎮", "📱", "💾", "🖥️", "📡", "🔑", "🛠️", "📦", "🧩"],
  },
  {
    // 자연에서 온 개성 있는 기호 — 단순 컬러 사각형 제외
    label: "자연/우주",
    labelEn: "Nature",
    emojis: ["🌟", "⭐", "🌈", "🌊", "🌸", "🍀", "🌙", "☀️", "❄️", "🌿", "🦋", "🌺", "🔮", "💫", "🌻", "🌍"],
  },
];

export const BLANK: FormData = {
  name: "",
  name_ko: "",
  name_ja: "",
  name_zh: "",
  department_id: "",
  role: "junior",
  cli_provider: "claude",
  api_provider_id: null,
  api_model: null,
  avatar_emoji: "🤖",
  avatar_url: null,
  pendingAvatarDataUrl: null,
  sprite_number: null,
  personality: "",
  enable_planning_phase: 1,
  specialty: "",
  autonomy_level: "balanced",
  max_concurrent_tasks: 1,
};


export const AUTONOMY_LEVELS = ["autonomous", "balanced", "supervised"] as const;

export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export const AUTONOMY_LABEL: Record<string, { ko: string; en: string; ja: string; zh: string; desc_ko: string; desc_en: string }> = {
  autonomous: {
    ko: "자율",
    en: "Autonomous",
    ja: "自律",
    zh: "自主",
    desc_ko: "PM에게 최소 보고",
    desc_en: "Minimal reporting to PM",
  },
  balanced: {
    ko: "중간",
    en: "Balanced",
    ja: "バランス",
    zh: "平衡",
    desc_ko: "주요 단계마다 보고",
    desc_en: "Reports at key milestones",
  },
  supervised: {
    ko: "밀착",
    en: "Supervised",
    ja: "密着",
    zh: "紧密",
    desc_ko: "매 작업마다 PM 확인",
    desc_en: "PM reviews every step",
  },
};

export const DEPT_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#f97316",
  "#ec4899",
  "#06b6d4",
  "#6b7280",
];

export const DEPT_BLANK: DeptForm = {
  id: "",
  name: "",
  name_ko: "",
  name_ja: "",
  name_zh: "",
  icon: "🏗️",
  color: "#3b82f6",
  description: "",
  prompt: "",
};
