import { useRef } from "react";
import { exportCustomSkill, importCustomSkill, type CustomSkillEntry, type SkillLearnProvider, type SkillPackage } from "../../api";
import { providerLabel, type TFunction } from "./model";

interface CustomSkillSectionProps {
  t: TFunction;
  customSkills: CustomSkillEntry[];
  localeTag: string;
  onDeleteSkill: (skillName: string) => void;
  onRefresh: () => void;
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CustomSkillSection({ t, customSkills, localeTag, onDeleteSkill, onRefresh }: CustomSkillSectionProps) {
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async (skillName: string) => {
    try {
      const res = await exportCustomSkill(skillName);
      if (res.ok && res.package) {
        downloadJson(res.package, `skill-${skillName}.json`);
      }
    } catch (err) {
      console.error("Failed to export skill:", err);
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const pkg = JSON.parse(text) as SkillPackage;
      if (!pkg.skillName || !pkg.content) {
        alert("Invalid skill package file");
        return;
      }
      await importCustomSkill(pkg);
      onRefresh();
    } catch (err) {
      console.error("Failed to import skill:", err);
      alert("Failed to import skill package");
    }
  };

  if (customSkills.length === 0) return null;

  return (
    <div className="custom-skill-list p-4" style={{ borderRadius: "4px", border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.05)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-violet-200 flex items-center gap-2">
          <span>✏️</span>
          {t({ ko: "커스텀 스킬", en: "Custom Skills", ja: "カスタムスキル", zh: "自定义技能" })}
          <span className="text-[11px] font-mono font-normal" style={{ color: "var(--th-text-muted)" }}>({customSkills.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => importInputRef.current?.click()}
            className="text-[10px] px-2 py-0.5 rounded border border-violet-500/30 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 transition-all"
          >
            {t({ ko: "가져오기", en: "Import", ja: "インポート", zh: "导入" })}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {customSkills.map((skill) => (
          <div
            key={skill.skillName}
            className="custom-skill-card flex items-center justify-between px-3 py-2"
            style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)" }}
          >
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-white truncate">{skill.skillName}</div>
              <div className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                {skill.providers.map((provider) => providerLabel(provider as SkillLearnProvider)).join(", ")}
                {" · "}
                {new Date(skill.createdAt).toLocaleDateString(localeTag)}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={() => void handleExport(skill.skillName)}
                className="text-[10px] px-2 py-0.5 rounded border border-sky-500/30 text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 transition-all"
                title={t({ ko: "내보내기", en: "Export", ja: "エクスポート", zh: "导出" })}
              >
                {t({ ko: "내보내기", en: "Export", ja: "Export", zh: "导出" })}
              </button>
              <button
                onClick={() => onDeleteSkill(skill.skillName)}
                className="text-[10px] px-2 py-0.5 rounded border border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-all"
              >
                {t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
