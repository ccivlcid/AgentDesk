import { useState, useEffect } from "react";
import { getSynapseSnapshots, createSynapseSnapshot, deleteSynapseSnapshot } from "../../../api/synapse";
import type { SynapseSnapshot } from "../../../api/synapse";
import { tl } from "./tl";
import { base, mono } from "./constants";
import { SectionLabel, Btn, Input, Card } from "./ui";

export function NotebookLMTab() {
  const [snapshots, setSnapshots] = useState<SynapseSnapshot[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSynapseSnapshots().then(setSnapshots).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!pasteText.trim()) return;
    setSaving(true);
    setError("");
    try {
      const name = snapshotName.trim() || `NotebookLM Export ${new Date().toLocaleDateString()}`;
      await createSynapseSnapshot(name, pasteText);
      setPasteText("");
      setSnapshotName("");
      const updated = await getSynapseSnapshots();
      setSnapshots(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSynapseSnapshot(id);
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{
            fontFamily: mono, fontSize: 10, fontWeight: 600,
            padding: "2px 8px", borderRadius: 4,
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "var(--th-accent)",
            letterSpacing: "0.04em",
          }}>
            {tl("스냅샷 전용", "Snapshot only")}
          </span>
          <span style={{ ...base, fontSize: 10, color: "var(--th-text-muted)" }}>{tl("공식 API 미지원 — 수동 가져오기", "No official API — manual import")}</span>
        </div>
        <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", lineHeight: 1.6 }}>
          {tl("NotebookLM 분석 결과를 내보내어 에이전트 컨텍스트로 사용합니다.", "Export NotebookLM analysis results and use them as agent context.")}
        </div>
      </Card>

      <SectionLabel>Import Guide</SectionLabel>
      <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", marginBottom: 14, lineHeight: 1.8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span style={{ color: "var(--th-accent)", fontWeight: 700 }}>1</span>
          <span>{tl(`NotebookLM → "공유 및 내보내기" → 결과 복사`, `NotebookLM → "Share & export" → copy results`)}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span style={{ color: "var(--th-accent)", fontWeight: 700 }}>2</span>
          <span>{tl("아래 입력란에 붙여넣기 후 저장", "Paste into the text area below and save")}</span>
        </div>
      </div>

      <SectionLabel>Paste Export</SectionLabel>
      <Input value={snapshotName} onChange={setSnapshotName} placeholder={tl("스냅샷 이름 (선택사항)", "Snapshot name (optional)")} fullWidth />
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={tl("NotebookLM 내보내기 내용을 붙여넣으세요...", "Paste your NotebookLM export content here...")}
          rows={7}
          style={{
            ...base,
            width: "100%",
            boxSizing: "border-box",
            fontSize: 11,
            padding: "10px 12px",
            background: "var(--th-input-bg, var(--th-bg-primary))",
            color: "var(--th-text-primary)",
            border: "1px solid var(--th-border)",
            borderRadius: 6,
            resize: "vertical",
            outline: "none",
            lineHeight: 1.6,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(10,132,255,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--th-border)"; }}
        />
      </div>
      {error && <p style={{ ...base, fontSize: 10, color: "#ff453a", marginBottom: 8 }}>{error}</p>}
      <Btn primary onClick={handleSave} disabled={saving || !pasteText.trim()}>
        {saving ? tl("저장 중...", "Saving...") : tl("저장 및 인덱싱", "Save & Index")}
      </Btn>

      {snapshots.length > 0 && (
        <>
          <SectionLabel>Snapshots</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {snapshots.map((s) => (
              <div key={s.id} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "9px 12px",
                background: "var(--th-hover-overlay-subtle)",
                border: "1px solid var(--th-border)",
                borderRadius: 6,
              }}>
                <div>
                  <div style={{ ...base, fontSize: 11, color: "var(--th-text-primary)" }}>{s.name}</div>
                  {s.source && <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginTop: 1 }}>{s.source}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...base, fontSize: 10, color: "var(--th-text-muted)" }}>
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                  <Btn small danger onClick={() => handleDelete(s.id)}>{tl("삭제", "Delete")}</Btn>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
