import { useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useI18n } from "../../i18n";

interface Props {
  onClose: () => void;
}

type ExportType = "tasks" | "deliverables" | "agents" | "costs";
type ExportFormat = "csv" | "json";

const mono = "var(--th-font-mono)";

const EXPORT_TYPES: { id: ExportType; icon: string; labelKo: string; labelEn: string; desc: string }[] = [
  { id: "tasks",        icon: "T", labelKo: "태스크",      labelEn: "Tasks",        desc: "All tasks with status, agent, duration" },
  { id: "deliverables", icon: "D", labelKo: "결과물",      labelEn: "Deliverables", desc: "Completed tasks with output" },
  { id: "agents",       icon: "A", labelKo: "에이전트",    labelEn: "Agents",       desc: "Agent list with performance stats" },
  { id: "costs",        icon: "$", labelKo: "비용",        labelEn: "Costs",        desc: "CLI usage cost records" },
];

const TASK_STATUSES = ["inbox","planned","in_progress","review","done","cancelled","pending","collaborating"];

function buildUrl(type: ExportType, format: ExportFormat, opts: {
  projectId: string; status: string; since: string; until: string;
}): string {
  const p = new URLSearchParams({ type, format });
  if (opts.projectId) p.set("project_id", opts.projectId);
  if (opts.status) p.set("status", opts.status);
  if (opts.since) p.set("since", String(new Date(opts.since).getTime()));
  if (opts.until) p.set("until", String(new Date(opts.until + "T23:59:59").getTime()));
  return `/api/export?${p}`;
}

export default function ExportModal({ onClose }: Props) {
  const { t } = useI18n();
  const { projects, currentProjectId } = useProjectStore();

  const [exportType, setExportType] = useState<ExportType>("tasks");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [projectId, setProjectId] = useState(currentProjectId ?? "");
  const [status, setStatus] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [downloading, setDownloading] = useState(false);

  const handleExport = () => {
    const url = buildUrl(exportType, format, { projectId, status, since, until });
    setDownloading(true);
    // Trigger browser download
    const a = document.createElement("a");
    a.href = url;
    a.download = ""; // browser uses Content-Disposition filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 1500);
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)",
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, display: "block",
  };
  const inputStyle: React.CSSProperties = {
    display: "block", width: "100%", fontFamily: mono, fontSize: 11,
    padding: "6px 9px", background: "var(--th-bg-elevated)",
    border: "1px solid #E5E7EB", borderRadius: 5,
    color: "var(--th-text-primary)", outline: "none",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "var(--th-modal-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2200 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "var(--th-bg-elevated)", border: "1px solid #E5E7EB",
        borderRadius: 10, width: 500, maxWidth: "92vw", maxHeight: "88vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 20px 60px var(--th-modal-overlay)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #E5E7EB", flexShrink: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-primary)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> {t({ ko: "데이터 내보내기", en: "Export Data", ja: "データエクスポート", zh: "数据导出" })}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--th-text-muted)", padding: 4, display: "flex" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Export type */}
          <div>
            <span style={labelStyle}>{t({ ko: "내보낼 데이터", en: "Data Type", ja: "データタイプ", zh: "数据类型" })}</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {EXPORT_TYPES.map((et) => (
                <button
                  key={et.id}
                  onClick={() => setExportType(et.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    background: exportType === et.id ? "var(--th-accent-glow, #FFFFFF)" : "var(--th-bg-elevated)",
                    border: `1px solid ${exportType === et.id ? "var(--th-accent)" : "var(--th-border)"}`,
                    borderRadius: 6, cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{et.icon}</span>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: exportType === et.id ? "var(--th-accent)" : "var(--th-text-primary)" }}>
                      {t({ ko: et.labelKo, en: et.labelEn, ja: et.labelEn, zh: et.labelEn })}
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 1 }}>{et.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <span style={labelStyle}>{t({ ko: "형식", en: "Format", ja: "フォーマット", zh: "格式" })}</span>
            <div style={{ display: "flex", gap: 6 }}>
              {(["csv", "json"] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  style={{
                    fontFamily: mono, fontSize: 11, fontWeight: 600, padding: "5px 18px",
                    background: format === f ? "var(--th-accent)" : "var(--th-bg-elevated)",
                    border: `1px solid ${format === f ? "var(--th-accent)" : "var(--th-border)"}`,
                    borderRadius: 5, cursor: "pointer",
                    color: format === f ? "#fff" : "var(--th-text-muted)",
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            {format === "csv" && (
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 4 }}>
                {t({ ko: "UTF-8 BOM 포함 (Excel 호환)", en: "UTF-8 BOM included (Excel compatible)", ja: "UTF-8 BOM付き (Excel対応)", zh: "含UTF-8 BOM (Excel兼容)" })}
              </div>
            )}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ ...labelStyle, marginBottom: 0 }}>{t({ ko: "필터 (선택)", en: "Filters (optional)", ja: "フィルター (任意)", zh: "过滤器 (可选)" })}</span>

            {/* Project */}
            <div>
              <span style={labelStyle}>{t({ ko: "프로젝트", en: "Project", ja: "プロジェクト", zh: "项目" })}</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inputStyle}>
                <option value="">{t({ ko: "전체 프로젝트", en: "All projects", ja: "すべてのプロジェクト", zh: "所有项目" })}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Status — only for tasks */}
            {exportType === "tasks" && (
              <div>
                <span style={labelStyle}>{t({ ko: "상태", en: "Status", ja: "ステータス", zh: "状态" })}</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
                  <option value="">{t({ ko: "전체 상태", en: "All statuses", ja: "すべてのステータス", zh: "所有状态" })}</option>
                  {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Date range */}
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <span style={labelStyle}>{t({ ko: "시작일", en: "From", ja: "開始日", zh: "开始日期" })}</span>
                <input type="date" value={since} onChange={(e) => setSince(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={labelStyle}>{t({ ko: "종료일", en: "Until", ja: "終了日", zh: "结束日期" })}</span>
                <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid #E5E7EB", flexShrink: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
            {EXPORT_TYPES.find((e) => e.id === exportType)?.icon}{" "}
            {t({ ko: EXPORT_TYPES.find((e) => e.id === exportType)?.labelKo ?? "", en: EXPORT_TYPES.find((e) => e.id === exportType)?.labelEn ?? "", ja: EXPORT_TYPES.find((e) => e.id === exportType)?.labelEn ?? "", zh: EXPORT_TYPES.find((e) => e.id === exportType)?.labelEn ?? "" })}
            {" · "}{format.toUpperCase()}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ fontFamily: mono, fontSize: 11, padding: "6px 14px", background: "transparent", border: "1px solid #E5E7EB", borderRadius: 5, cursor: "pointer", color: "var(--th-text-muted)" }}>
              {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
            </button>
            <button
              onClick={handleExport}
              disabled={downloading}
              style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, padding: "6px 20px", background: downloading ? "var(--th-border)" : "var(--th-accent)", border: "none", borderRadius: 5, cursor: downloading ? "not-allowed" : "pointer", color: "#fff" }}
            >
              {downloading
                ? t({ ko: "다운로드 중...", en: "Downloading...", ja: "ダウンロード中...", zh: "下载中..." })
                : t({ ko: "내보내기", en: "Export", ja: "エクスポート", zh: "导出" })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
