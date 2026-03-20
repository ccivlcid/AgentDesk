import { useState, useEffect, useCallback } from "react";
import AppWindow from "../windows/AppWindow";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";
import type { CustomFeature } from "../../types";
import WidgetGrid from "./WidgetGrid";
import { useWidgetBoard } from "./useWidgetBoard";

const mono = "var(--th-font-mono, monospace)";

/** Picker dropdown for adding a new widget */
function AddWidgetPicker({ features, onAdd, onClose }: {
  features: CustomFeature[];
  onAdd: (featureId: string) => void;
  onClose: () => void;
}) {
  const active = features.filter((f) => f.status === "active");

  return (
    <div style={{
      position: "absolute",
      top: 38,
      right: 12,
      zIndex: 100,
      background: "var(--th-bg-elevated)",
      border: "1px solid var(--th-border)",
      borderRadius: 8,
      boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
      minWidth: 220,
      maxHeight: 300,
      overflowY: "auto",
      padding: "4px 0",
    }}>
      {active.length === 0 ? (
        <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", padding: "12px 16px", textAlign: "center" }}>
          No active widgets available
        </div>
      ) : (
        active.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => { onAdd(f.id); onClose(); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "8px 14px",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-hover-bg, rgba(255,255,255,0.05))"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
          >
            {f.icon_svg ? (
              <span style={{ width: 16, height: 16, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: f.icon_svg }} />
            ) : (
              <span style={{ fontSize: 14 }}>⊙</span>
            )}
            <div>
              <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text)", fontWeight: 600 }}>{f.name}</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 1 }}>
                {f.source === "template" ? f.template_id ?? "template" : "ai-generated"}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

export default function WidgetBoardWindow() {
  const { closeWindow } = useUiStore();
  const { t } = useI18n();
  const [features, setFeatures] = useState<CustomFeature[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const { cells, addWidget, removeWidget, changeSpan, moveCell } = useWidgetBoard();

  const loadFeatures = useCallback(() => {
    fetch("/api/custom-features")
      .then((r) => r.json() as Promise<{ features?: CustomFeature[] }>)
      .then((d) => setFeatures(d.features ?? []))
      .catch(() => {/* ignore */});
  }, []);

  useEffect(() => { loadFeatures(); }, [loadFeatures]);

  return (
    <AppWindow
      windowType="widget-board"
      title={t({ ko: "위젯 보드", en: "Widget Board", ja: "ウィジェットボード", zh: "小组件板" })}
      emoji="⊞"
      defaultWidth={1100}
      defaultHeight={680}
      onClose={() => closeWindow("widget-board")}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 14px",
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
          flexShrink: 0,
          position: "relative",
        }}>
          <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {t({ ko: "위젯 보드", en: "Widget Board", ja: "ウィジェットボード", zh: "小组件板" })}
          </span>
          {cells.length > 0 && (
            <span style={{
              fontFamily: mono, fontSize: 9,
              background: "var(--th-bg-elevated)",
              border: "1px solid var(--th-border)",
              borderRadius: 10,
              padding: "0px 6px",
              color: "var(--th-text-muted)",
            }}>
              {cells.length}
            </span>
          )}

          <div style={{ marginLeft: "auto", position: "relative" }}>
            <button
              type="button"
              onClick={() => { loadFeatures(); setShowPicker((v) => !v); }}
              style={{
                fontFamily: mono, fontSize: 10,
                background: showPicker ? "var(--th-accent)" : "var(--th-bg-elevated)",
                border: `1px solid ${showPicker ? "var(--th-accent)" : "var(--th-border)"}`,
                borderRadius: 6,
                color: showPicker ? "#fff" : "var(--th-text-muted)",
                padding: "4px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>+</span>
              {t({ ko: "위젯 추가", en: "Add Widget", ja: "ウィジェット追加", zh: "添加小组件" })}
            </button>

            {showPicker && (
              <AddWidgetPicker
                features={features}
                onAdd={addWidget}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>
        </div>

        {/* Grid area */}
        <div
          style={{ flex: 1, overflowY: "auto" }}
          onClick={() => { if (showPicker) setShowPicker(false); }}
        >
          <WidgetGrid
            cells={cells}
            features={features}
            onRemove={removeWidget}
            onChangeSpan={changeSpan}
            onMove={moveCell}
          />
        </div>
      </div>
    </AppWindow>
  );
}
