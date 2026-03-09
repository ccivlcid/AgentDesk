import type { useOfficeRoomManagerState } from "./useOfficeRoomManagerState";

type State = ReturnType<typeof useOfficeRoomManagerState>;

const modalBox = { borderRadius: "2px", border: "1px solid var(--th-border-strong)", background: "var(--th-bg-elevated)" };
const inputStyle = { borderRadius: "2px", border: "1px solid var(--th-border-strong)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" };
const btnCancel = { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" };
const btnPrimary = { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" };

export function ThemeModals({ state }: { state: State }) {
  const { L, language, numToHex, showSaveModal, setShowSaveModal, saveName, setSaveName, allRoomIds, deptStates, handleSaveTheme, showImportModal, setShowImportModal, importText, setImportText, importResult, setImportResult, handleImportThemes } = state;

  return (
    <>
      {showSaveModal && (
        <div className="p-4 space-y-3" style={modalBox}>
          <h4 className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>{L.saveCurrent[language]}</h4>
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "var(--th-text-muted)" }}>{L.themeName[language]}</label>
            <input autoFocus value={saveName} onChange={(e) => setSaveName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSaveTheme()} placeholder="My Theme" className="w-full text-sm px-3 py-1.5 outline-none font-mono" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "var(--th-text-muted)" }}>{L.preview[language]}</label>
            <div className="flex gap-0.5" style={{ borderRadius: "2px", overflow: "hidden" }}>
              {allRoomIds.map((id) => {
                const s = deptStates[id];
                if (!s) return null;
                return <div key={id} className="flex-1 h-4" style={{ backgroundColor: numToHex(s.accent) }} />;
              })}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowSaveModal(false)} className="flex-1 py-1.5 text-xs font-mono transition" style={btnCancel}>{L.cancel[language]}</button>
            <button onClick={handleSaveTheme} disabled={!saveName.trim()} className="flex-1 py-1.5 text-xs font-mono transition disabled:opacity-40" style={btnPrimary}>{L.save[language]}</button>
          </div>
        </div>
      )}
      {showImportModal && (
        <div className="p-4 space-y-3" style={modalBox}>
          <h4 className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>{L.importThemes[language]}</h4>
          <textarea autoFocus value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={L.importPlaceholder[language]} rows={5} className="w-full text-xs px-3 py-2 outline-none font-mono resize-none" style={inputStyle} />
          {importResult && (
            <div className="text-xs px-2.5 py-1.5 font-mono" style={importResult.error ? { borderRadius: "2px", border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.08)", color: "rgb(253,164,175)" } : { borderRadius: "2px", border: "1px solid rgba(52,211,153,0.35)", background: "rgba(52,211,153,0.08)", color: "rgb(167,243,208)" }}>
              {importResult.error ? L.importError[language] : `${L.importSuccess[language].replace("{n}", String(importResult.imported))}${importResult.skipped > 0 ? `, ${L.importSkipped[language].replace("{n}", String(importResult.skipped))}` : ""}`}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setShowImportModal(false); setImportText(""); setImportResult(null); }} className="flex-1 py-1.5 text-xs font-mono transition" style={btnCancel}>{L.cancel[language]}</button>
            <button onClick={handleImportThemes} disabled={!importText.trim()} className="flex-1 py-1.5 text-xs font-mono transition disabled:opacity-40" style={btnPrimary}>{L.importThemes[language]}</button>
          </div>
        </div>
      )}
    </>
  );
}
