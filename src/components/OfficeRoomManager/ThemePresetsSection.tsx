import type { UserThemePreset } from "../office-theme/user-theme-storage";
import type { useOfficeRoomManagerState } from "./useOfficeRoomManagerState";
import { PreviewBar } from "./ColorSwatch";

type State = ReturnType<typeof useOfficeRoomManagerState>;

const CHECK_ICON =
  "M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z";
const ARROW_ICON =
  "M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z";
const DOTS_ICON = "M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm1.5 7a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z";
const inputStyle = { borderRadius: "2px", border: "1px solid var(--th-border-strong)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" };
const menuBox = { borderRadius: "2px", border: "1px solid var(--th-border-strong)", background: "var(--th-bg-elevated)" };

function UserThemeRow({
  up,
  L,
  language,
  numToHex,
  activePresetKey,
  editingPresetId,
  renamingId,
  renameValue,
  menuOpenId,
  setRenamingId,
  setRenameValue,
  setMenuOpenId,
  setEditingPresetId,
  setDeletingId,
  handleRename,
  handleOverwriteSave,
  applyPreset,
}: {
  up: UserThemePreset;
  L: State["L"];
  language: State["language"];
  numToHex: (n: number) => string;
  activePresetKey: string | null;
  editingPresetId: string | null;
  renamingId: string | null;
  renameValue: string;
  menuOpenId: string | null;
  setRenamingId: (v: string | null) => void;
  setRenameValue: (v: string) => void;
  setMenuOpenId: (v: string | null) => void;
  setEditingPresetId: (v: string | null) => void;
  setDeletingId: (v: string | null) => void;
  handleRename: (id: string) => void;
  handleOverwriteSave: (id: string) => void;
  applyPreset: (p: UserThemePreset) => void;
}) {
  const active = activePresetKey === up.id;
  const isEditing = editingPresetId === up.id;
  const firstTheme = Object.values(up.themes)[0];
  return (
    <div
      className="flex items-center gap-2 px-2.5 py-2 transition-all"
      style={active ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.06)" } : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
    >
      <div className="flex gap-0.5 shrink-0">
        {firstTheme && [firstTheme.floor1, firstTheme.floor2, firstTheme.wall, firstTheme.accent].map((c, i) => (
          <div key={i} className="w-3 h-3" style={{ borderRadius: "2px", backgroundColor: numToHex(c) }} />
        ))}
      </div>
      {renamingId === up.id ? (
        <form onSubmit={(e) => { e.preventDefault(); handleRename(up.id); }} className="flex-1 flex gap-1">
          <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="flex-1 text-xs px-2 py-0.5 outline-none font-mono" style={inputStyle} />
          <button type="submit" className="text-xs font-mono" style={{ color: "var(--th-accent)" }}>OK</button>
          <button type="button" onClick={() => setRenamingId(null)} className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>X</button>
        </form>
      ) : (
        <span className="text-xs font-mono flex-1 truncate" style={{ color: "var(--th-text-secondary)" }}>{up.name}</span>
      )}
      {renamingId !== up.id && (
        <>
          {isEditing ? (
            <button onClick={() => handleOverwriteSave(up.id)} className="text-[10px] px-1.5 py-0.5 font-mono transition" style={{ borderRadius: "2px", border: "1px solid rgba(52,211,153,0.4)", color: "rgb(167,243,208)" }}>{L.overwrite[language]}</button>
          ) : !active ? (
            <button onClick={() => applyPreset(up)} className="text-[10px] px-1.5 py-0.5 font-mono transition" style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.4)", color: "var(--th-accent)" }}>{L.apply[language]}</button>
          ) : (
            <span className="text-[10px] px-1" style={{ color: "var(--th-accent)" }}><svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d={CHECK_ICON} clipRule="evenodd" /></svg></span>
          )}
          <div className="relative">
            <button onClick={() => setMenuOpenId(menuOpenId === up.id ? null : up.id)} className="p-0.5 transition" style={{ borderRadius: "2px", color: "var(--th-text-muted)" }}>
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d={DOTS_ICON} /></svg>
            </button>
            {menuOpenId === up.id && (
              <div className="absolute right-0 top-6 z-10 py-1 min-w-[100px]" style={menuBox}>
                {active && <button onClick={() => { setEditingPresetId(up.id); setMenuOpenId(null); }} className="w-full text-left text-xs px-3 py-1.5 font-mono transition" style={{ color: "var(--th-text-secondary)" }}>{L.overwrite[language]}</button>}
                <button onClick={() => { setRenamingId(up.id); setRenameValue(up.name); setMenuOpenId(null); }} className="w-full text-left text-xs px-3 py-1.5 font-mono transition" style={{ color: "var(--th-text-secondary)" }}>{L.rename[language]}</button>
                <button onClick={() => { setDeletingId(up.id); setMenuOpenId(null); }} className="w-full text-left text-xs px-3 py-1.5 font-mono transition" style={{ color: "rgb(253,164,175)" }}>{L.delete[language]}</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ThemePresetsSection({ state }: { state: State }) {
  const { L, language, numToHex, showCompare, setShowCompare, allRooms, deptStates, initialSnapshotRef, BUILTIN_THEME_PRESETS: builtinPresets, applyPreset, activePresetKey, userPresets, editingPresetId, setEditingPresetId, renamingId, setRenamingId, renameValue, setRenameValue, menuOpenId, setMenuOpenId, handleRename, handleOverwriteSave, handleDeleteTheme, deletingId, setDeletingId, setShowSaveModal, setSaveName, handleExportThemes, setShowImportModal, setImportResult, setImportText, MAX_PRESETS } = state;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{L.themePresets[language]}</h3>
        <button onClick={() => setShowCompare((v) => !v)} className="text-[11px] px-2 py-0.5 transition-all font-mono" style={showCompare ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" } : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}>
          {L.compareThemes[language]}
        </button>
      </div>

      {showCompare && (
        <div className="p-3 space-y-1.5" style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.2)", background: "var(--th-bg-elevated)" }}>
          <div className="flex justify-between text-[10px] font-mono mb-2" style={{ color: "var(--th-text-muted)" }}>
            <span>{L.compareBefore[language]}</span>
            <span>{L.compareAfter[language]}</span>
          </div>
          {allRooms.map((room) => {
            const beforeTheme = initialSnapshotRef.current[room.id];
            const afterState = deptStates[room.id];
            const afterAccent = afterState?.accent ?? 0x5a9fd4;
            const beforeAccent = beforeTheme?.accent ?? afterAccent;
            const changed = beforeAccent !== afterAccent;
            return (
              <div key={room.id} className="flex items-center gap-2">
                <span className="text-[10px] font-mono w-16 truncate shrink-0" style={{ color: "var(--th-text-muted)" }}>{room.name}</span>
                <div className="flex-1 flex items-center gap-1">
                  <div className="h-3 flex-1" style={{ borderRadius: "2px", backgroundColor: numToHex(beforeAccent) }} />
                  <svg className="w-3 h-3 shrink-0" style={{ color: changed ? "var(--th-accent)" : "var(--th-border)" }} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d={ARROW_ICON} clipRule="evenodd" /></svg>
                  <div className="h-3 flex-1" style={{ borderRadius: "2px", backgroundColor: numToHex(afterAccent), outline: changed ? "1px solid rgba(251,191,36,0.5)" : "none" }} />
                </div>
                {changed && <span className="w-1.5 h-1.5 shrink-0" style={{ borderRadius: "50%", background: "var(--th-accent)" }} />}
              </div>
            );
          })}
          {allRooms.every((room) => (initialSnapshotRef.current[room.id]?.accent ?? 0) === (deptStates[room.id]?.accent ?? 0)) && (
            <p className="text-[11px] text-center italic pt-1 font-mono" style={{ color: "var(--th-text-muted)" }}>{L.compareNoChange[language]}</p>
          )}
        </div>
      )}

      <div>
        <p className="text-[11px] font-mono mb-2" style={{ color: "var(--th-text-muted)" }}>{L.builtinThemes[language]}</p>
        <div className="grid grid-cols-2 gap-2">
          {builtinPresets.map((preset) => {
            const active = activePresetKey === preset.key;
            return (
              <button key={preset.key} onClick={() => applyPreset(preset)} className="relative p-2.5 text-left transition-all" style={active ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.08)" } : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
                <div className="mb-1.5" style={{ border: "1px solid var(--th-border)", borderRadius: "2px", overflow: "hidden" }}><PreviewBar colors={preset.preview} /></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono truncate" style={{ color: "var(--th-text-heading)" }}>{preset.name[language]}</span>
                  {active && <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--th-accent)" }} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d={CHECK_ICON} clipRule="evenodd" /></svg>}
                </div>
                <p className="text-[10px] font-mono truncate mt-0.5" style={{ color: "var(--th-text-muted)" }}>{preset.description[language]}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--th-border)" }} />

      <div>
        <p className="text-[11px] font-mono mb-2" style={{ color: "var(--th-text-muted)" }}>{L.myThemes[language]}</p>
        {userPresets.length === 0 ? (
          <p className="text-xs italic py-2 text-center font-mono" style={{ color: "var(--th-text-muted)" }}>{L.noUserThemes[language]}</p>
        ) : (
          <div className="space-y-1.5">
            {userPresets.map((up) => (
              <UserThemeRow key={up.id} up={up} L={L} language={language} numToHex={numToHex} activePresetKey={activePresetKey} editingPresetId={editingPresetId} renamingId={renamingId} renameValue={renameValue} menuOpenId={menuOpenId} setRenamingId={setRenamingId} setRenameValue={setRenameValue} setMenuOpenId={setMenuOpenId} setEditingPresetId={setEditingPresetId} setDeletingId={setDeletingId} handleRename={handleRename} handleOverwriteSave={handleOverwriteSave} applyPreset={applyPreset} />
            ))}
          </div>
        )}
        {deletingId && (
          <div className="mt-2 flex items-center gap-2 px-2.5 py-2" style={{ borderRadius: "2px", border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.08)" }}>
            <span className="text-xs font-mono flex-1" style={{ color: "rgb(253,164,175)" }}>{L.confirmDelete[language]}</span>
            <button onClick={() => handleDeleteTheme(deletingId)} className="text-xs px-2 py-0.5 font-mono transition" style={{ borderRadius: "2px", border: "1px solid rgba(244,63,94,0.5)", color: "rgb(253,164,175)" }}>{L.delete[language]}</button>
            <button onClick={() => setDeletingId(null)} className="text-xs px-2 py-0.5 font-mono transition" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}>{L.cancel[language]}</button>
          </div>
        )}
        <button onClick={() => { setShowSaveModal(true); setSaveName(""); }} disabled={userPresets.length >= MAX_PRESETS} className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-mono transition disabled:opacity-40 disabled:cursor-not-allowed" style={{ borderRadius: "2px", border: "1px dashed var(--th-border-strong)", color: "var(--th-text-muted)" }}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
          {userPresets.length >= MAX_PRESETS ? L.maxReached[language] : L.saveCurrent[language]}
        </button>
        <div className="mt-1.5 flex gap-1.5">
          <button onClick={handleExportThemes} disabled={userPresets.length === 0} title={L.exportThemes[language]} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-mono transition disabled:opacity-30 disabled:cursor-not-allowed" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}>
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 12.586V4a1 1 0 0 1 1-1ZM3 17a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H3Z" /></svg>
            {L.exportThemes[language]}
          </button>
          <button onClick={() => { setShowImportModal(true); setImportResult(null); setImportText(""); }} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-mono transition" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}>
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 17a1 1 0 0 1-1-1V7.414L6.707 9.707a1 1 0 1 1-1.414-1.414l4-4a1 1 0 0 1 1.414 0l4 4a1 1 0 1 1-1.414 1.414L11 7.414V16a1 1 0 0 1-1 1ZM3 17a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H3Z" /></svg>
            {L.importThemes[language]}
          </button>
        </div>
      </div>
    </section>
  );
}
