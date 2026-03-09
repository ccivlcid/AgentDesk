import React from "react";

export interface OfficeViewToolbarProps {
  isOverviewMode: boolean;
  handleToggleOverview: () => void;
  applyCameraOverview: () => void;
  applyCameraFloorFocus: () => void;
  onOpenRoomManager: (() => void) | undefined;
  departmentCount: number;
  workingCount: number;
  inProgressTaskCount: number;
  visitorCount: number;
  currentSeasonKey: string;
  clockStr: string;
  packVocab: { running: string; tasks: string };
}

export default function OfficeViewToolbar({
  isOverviewMode,
  handleToggleOverview,
  applyCameraOverview,
  applyCameraFloorFocus,
  onOpenRoomManager,
  departmentCount,
  workingCount,
  inProgressTaskCount,
  visitorCount,
  currentSeasonKey,
  clockStr,
  packVocab,
}: OfficeViewToolbarProps) {
  return (
    <div className="office-toolbar">
      <div className="office-toolbar-breadcrumb">
        <span className="office-toolbar-prompt">▶</span>
        <span className="office-toolbar-title">AgentDesk HQ</span>
        <span className="office-toolbar-sep">·</span>
        <span className="office-toolbar-sub">{departmentCount}F Tower</span>
      </div>
      <div className="office-toolbar-center">
        <span className="office-toolbar-stat-chip" style={{ color: "#22c55e" }}>
          {workingCount} {packVocab.running.toUpperCase()}
        </span>
        <span className="office-toolbar-stat-chip">
          {inProgressTaskCount} {packVocab.tasks.toUpperCase()}
        </span>
        {visitorCount > 0 && (
          <span className="office-toolbar-stat-chip" style={{ color: "var(--th-accent)" }}>
            {visitorCount} VISITING
          </span>
        )}
        {currentSeasonKey !== "none" && (
          <span className="office-toolbar-stat-chip" style={{ color: "rgba(255,255,255,0.5)" }}>
            {currentSeasonKey === "spring"
              ? "SPRING"
              : currentSeasonKey === "summer"
                ? "SUMMER"
                : currentSeasonKey === "autumn"
                  ? "AUTUMN"
                  : "WINTER"}
          </span>
        )}
      </div>
      <div className="office-toolbar-actions">
        <span
          style={{
            fontFamily: "var(--th-font-mono)",
            fontSize: "0.65rem",
            color: "var(--th-accent)",
            letterSpacing: 2,
            opacity: 0.85,
          }}
        >
          {clockStr}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            border: "1px solid var(--th-border)",
            borderRadius: 2,
          }}
        >
          <button
            className="office-toolbar-btn"
            title="Zoom In (Floor Focus)"
            onClick={() => {
              if (isOverviewMode) applyCameraFloorFocus();
            }}
            style={{
              borderRadius: "2px 0 0 2px",
              border: "none",
              padding: "2px 6px",
              fontSize: "0.7rem",
              opacity: isOverviewMode ? 1 : 0.4,
            }}
          >
            +
          </button>
          <button
            className="office-toolbar-btn"
            title={isOverviewMode ? "Floor Focus (Esc)" : "Overview (Esc)"}
            onClick={handleToggleOverview}
            style={{
              border: "none",
              borderLeft: "1px solid var(--th-border)",
              borderRight: "1px solid var(--th-border)",
              padding: "2px 8px",
              fontSize: "0.6rem",
              letterSpacing: 1,
              ...(isOverviewMode ? { color: "var(--th-accent)" } : {}),
            }}
          >
            {isOverviewMode ? "FIT" : "1:1"}
          </button>
          <button
            className="office-toolbar-btn"
            title="Zoom Out (Overview)"
            onClick={() => {
              if (!isOverviewMode) applyCameraOverview();
            }}
            style={{
              borderRadius: "0 2px 2px 0",
              border: "none",
              padding: "2px 6px",
              fontSize: "0.7rem",
              opacity: isOverviewMode ? 0.4 : 1,
            }}
          >
            -
          </button>
        </div>
        <button
          className="office-toolbar-btn"
          title="Season / Style settings"
          onClick={onOpenRoomManager}
        >
          Season ▾
        </button>
        <button
          className="office-toolbar-btn"
          title="Season / Style settings"
          onClick={onOpenRoomManager}
        >
          Style ▾
        </button>
      </div>
    </div>
  );
}
