import { ALL_SCOPES, SCOPE_ICONS, scopeLabel, type TFunction } from "./model";

interface AgentRulesScopeBarProps {
  t: TFunction;
  selectedScope: string;
  onSelectScope: (scope: string) => void;
  scopeCounts: Record<string, number>;
}

export default function AgentRulesScopeBar({
  t,
  selectedScope,
  onSelectScope,
  scopeCounts,
}: AgentRulesScopeBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_SCOPES.map((scope) => {
        const isActive = selectedScope === scope;
        return (
          <button
            key={scope}
            onClick={() => onSelectScope(scope)}
            className="px-3 py-1.5 text-xs font-medium font-mono border transition-all"
            style={{
              borderRadius: "2px",
              background: isActive ? "rgba(52,211,153,0.15)" : "var(--th-bg-elevated)",
              borderColor: isActive ? "rgba(52,211,153,0.5)" : "var(--th-border)",
              color: isActive ? "rgb(167,243,208)" : "var(--th-text-secondary)",
            }}
          >
            {SCOPE_ICONS[scope]} {scopeLabel(scope, t)}
            <span className="ml-1" style={{ color: "var(--th-text-muted)" }}>{scopeCounts[scope] || 0}</span>
          </button>
        );
      })}
    </div>
  );
}
