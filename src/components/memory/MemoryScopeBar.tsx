import { ALL_SCOPES, SCOPE_ICONS, scopeLabel, type TFunction } from "./model";

interface MemoryScopeBarProps {
  t: TFunction;
  selectedScope: string;
  onSelectScope: (scope: string) => void;
  scopeCounts: Record<string, number>;
}

export default function MemoryScopeBar({
  t,
  selectedScope,
  onSelectScope,
  scopeCounts,
}: MemoryScopeBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_SCOPES.map((scope) => (
        <button
          key={scope}
          onClick={() => onSelectScope(scope)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            selectedScope === scope
              ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/40"
              : "bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-700/40 hover:text-slate-300"
          }`}
        >
          {SCOPE_ICONS[scope]} {scopeLabel(scope, t)}
          <span className="ml-1 text-slate-500">{scopeCounts[scope] || 0}</span>
        </button>
      ))}
    </div>
  );
}
