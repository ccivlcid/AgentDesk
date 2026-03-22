import { useState, useRef, useEffect, useCallback } from "react";
import type { I18nContextValue } from "../../i18n";
import { IconTrash } from "./DesktopIcons";
import type { TrashedProject, TrashedFeature } from "./DesktopTypes";
import { useUiStore } from "../../store/uiStore";
import { snapToFreeCell } from "./snapToFreeCell";

const TRASH_ICON_ID = "__trash__";

export function TrashIcon({
  t,
  count,
  onClick,
  onEmptyTrash,
}: {
  t: I18nContextValue["t"];
  count: number;
  onClick: () => void;
  onEmptyTrash?: () => void;
}) {
  const { desktopIconLayout, setDesktopIconLayout } = useUiStore();
  const [hov, setHov] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const full = count > 0;

  // Default position: bottom-right area — use saved layout if available
  const [defaultPos] = useState(() => {
    const saved = desktopIconLayout[TRASH_ICON_ID];
    if (saved) return saved;
    // Place at bottom-right: approximate using viewport size
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    return { x: vw - 96, y: vh - 80 - 44 - 80 };
  });
  const [pos, setPos] = useState(defaultPos);

  // Sync with store when layout changes externally
  useEffect(() => {
    if (dragging) return;
    const entry = desktopIconLayout[TRASH_ICON_ID];
    if (entry) setPos({ x: entry.x, y: entry.y });
  }, [desktopIconLayout, dragging]);

  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const moved = useRef(false);

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    moved.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
    setDragging(true);

    function onMove(ev: MouseEvent) {
      if (!dragStart.current) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      setPos({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
    }

    function onUp(ev: MouseEvent) {
      if (!dragStart.current) return;
      const rawX = dragStart.current.ox + (ev.clientX - dragStart.current.mx);
      const rawY = dragStart.current.oy + (ev.clientY - dragStart.current.my);
      const current = useUiStore.getState().desktopIconLayout;
      const { x, y } = snapToFreeCell(rawX, rawY, TRASH_ICON_ID, current);
      setPos({ x, y });
      setDesktopIconLayout({ ...current, [TRASH_ICON_ID]: { x, y } });
      dragStart.current = null;
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleClick() {
    if (!moved.current) onClick();
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }

  // Close context menu on outside click
  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = () => closeCtxMenu();
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [ctxMenu, closeCtxMenu]);

  return (
    <>
      <div
        data-no-ctx="true"
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onMouseDown={onMouseDown}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          width: 72,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 5,
          cursor: dragging ? "grabbing" : "pointer",
          userSelect: "none",
          zIndex: dragging ? 100 : 10,
          transition: dragging ? "none" : "transform 0.12s",
          transform: hov && !dragging ? "scale(1.06)" : "scale(1)",
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              background: hov ? "rgba(255,59,48,0.12)" : full ? "rgba(255,59,48,0.06)" : "rgba(128,128,128,0.08)",
              border: `1px solid ${hov ? "rgba(255,59,48,0.4)" : full ? "rgba(255,59,48,0.2)" : "rgba(128,128,128,0.15)"}`,
              transition: "background 0.15s, border 0.15s",
            }}
          >
            <IconTrash color={hov || full ? "#ff3b30" : "var(--th-text-muted)"} />
          </div>
          {full && (
            <div
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                background: "#ff3b30",
                border: "1.5px solid var(--th-bg-base)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--th-font-mono)",
                fontSize: 9,
                fontWeight: 700,
                color: "#fff",
                paddingInline: 3,
              }}
            >
              {count}
            </div>
          )}
        </div>
        <span
          style={{
            fontFamily: "var(--th-font-mono)",
            fontSize: 10,
            color: hov || full ? "#ff3b30" : "var(--th-text-secondary)",
            transition: "color 0.15s",
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}
        >
          {t({ ko: "휴지통", en: "Trash", ja: "ゴミ箱", zh: "垃圾桶" })}
        </span>
      </div>

      {/* Trash context menu */}
      {ctxMenu && (
        <div
          data-no-ctx="true"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: ctxMenu.x,
            top: ctxMenu.y,
            zIndex: 9999,
            minWidth: 160,
            background: "var(--th-bg-elevated)",
            border: "1px solid var(--th-border)",
            borderRadius: 6,
            boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
            padding: "4px 0",
            fontFamily: "var(--th-font-mono)",
          }}
        >
          <button
            onClick={() => {
              setCtxMenu(null);
              onClick();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "7px 14px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--th-font-mono)",
              fontSize: 12,
              color: "var(--th-text-primary)",
              textAlign: "left",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--th-bg-hover)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            {t({ ko: "휴지통 열기", en: "Open Trash", ja: "ゴミ箱を開く", zh: "打开回收站" })}
          </button>
          {full && onEmptyTrash && (
            <button
              onClick={() => {
                setCtxMenu(null);
                onEmptyTrash();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "7px 14px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--th-font-mono)",
                fontSize: 12,
                color: "#ff3b30",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,59,48,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              {t({ ko: "휴지통 비우기", en: "Empty Trash", ja: "ゴミ箱を空にする", zh: "清空回收站" })}
            </button>
          )}
        </div>
      )}
    </>
  );
}

export function TrashModal({
  t,
  items,
  features,
  onClose,
  onRestore,
  onDelete,
  onRestoreFeature,
  onDeleteFeature,
  onEmpty,
}: {
  t: I18nContextValue["t"];
  items: TrashedProject[];
  features: TrashedFeature[];
  onClose: () => void;
  onRestore: (item: TrashedProject) => Promise<void>;
  onDelete: (item: TrashedProject) => void;
  onRestoreFeature: (f: TrashedFeature) => void;
  onDeleteFeature: (f: TrashedFeature) => Promise<void>;
  onEmpty: () => Promise<void>;
}) {
  const mono = { fontFamily: "var(--th-font-mono)" };
  const fmt = (ts: number) => new Date(ts).toLocaleDateString();

  return (
    <div
      data-no-ctx="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3100,
        background: "var(--th-modal-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(520px, 92vw)",
          maxHeight: "70vh",
          background: "var(--th-bg-elevated)",
          border: "1px solid var(--th-border)",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid var(--th-border)",
            background: "var(--th-bg-panel)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={onClose}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#ff5f57",
                border: "none",
                cursor: "pointer",
              }}
            />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27c93f" }} />
          </div>
          <IconTrash color="var(--th-text-secondary)" />
          <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)" }}>
            {t({ ko: "휴지통", en: "Trash", ja: "ゴミ箱", zh: "垃圾桶" })}
          </span>
          <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginLeft: "auto" }}>
            {items.length + features.length} {t({ ko: "항목", en: "items", ja: "項目", zh: "项" })}
          </span>
          {(items.length + features.length) > 0 && (
            <button
              onClick={() => void onEmpty()}
              style={{
                ...mono,
                fontSize: 10,
                padding: "3px 10px",
                borderRadius: 4,
                cursor: "pointer",
                border: "1px solid rgba(255,59,48,0.4)",
                background: "rgba(255,59,48,0.08)",
                color: "#ff3b30",
              }}
            >
              {t({ ko: "모두 삭제", en: "Empty Trash", ja: "すべて削除", zh: "清空垃圾桶" })}
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {items.length + features.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 160,
                gap: 10,
              }}
            >
              <IconTrash color="var(--th-text-muted)" />
              <span style={{ ...mono, fontSize: 12, color: "var(--th-text-muted)" }}>
                {t({ ko: "휴지통이 비어 있습니다", en: "Trash is empty", ja: "ゴミ箱は空です", zh: "垃圾桶为空" })}
              </span>
            </div>
          ) : (
            [...items.map((d) => ({ kind: "project" as const, deletedAt: d.deletedAt, data: d })),
             ...features.map((d) => ({ kind: "feature" as const, deletedAt: d.deletedAt, data: d }))]
              .sort((a, b) => b.deletedAt - a.deletedAt)
              .map((entry) =>
                entry.kind === "project" ? (
                  <div
                    key={entry.data.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "9px 16px",
                      borderBottom: "1px solid var(--th-border)",
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📁</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          ...mono,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--th-text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.data.name}
                      </div>
                      <div
                        style={{
                          ...mono,
                          fontSize: 9,
                          color: "var(--th-text-muted)",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {(entry.data as TrashedProject).project_path}
                      </div>
                    </div>
                    <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0 }}>
                      {fmt(entry.deletedAt)}
                    </span>
                    <button
                      onClick={() => void onRestore(entry.data as TrashedProject)}
                      style={{
                        ...mono,
                        fontSize: 10,
                        padding: "3px 9px",
                        borderRadius: 4,
                        cursor: "pointer",
                        border: "1px solid var(--th-border)",
                        background: "transparent",
                        color: "var(--th-text-secondary)",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "#22c55e";
                        (e.currentTarget as HTMLElement).style.color = "#22c55e";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--th-border)";
                        (e.currentTarget as HTMLElement).style.color = "var(--th-text-secondary)";
                      }}
                    >
                      {t({ ko: "복원", en: "Restore", ja: "復元", zh: "还原" })}
                    </button>
                    <button
                      onClick={() => onDelete(entry.data as TrashedProject)}
                      style={{
                        ...mono,
                        fontSize: 10,
                        padding: "3px 9px",
                        borderRadius: 4,
                        cursor: "pointer",
                        border: "1px solid rgba(255,59,48,0.3)",
                        background: "transparent",
                        color: "#ff3b30",
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (() => {
                  const f = entry.data as TrashedFeature;
                  return (
                    <div
                      key={f.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "9px 16px",
                        borderBottom: "1px solid var(--th-border)",
                      }}
                    >
                      {f.icon_svg ? (
                        <span
                          style={{ width: 22, height: 22, flexShrink: 0 }}
                          dangerouslySetInnerHTML={{ __html: f.icon_svg }}
                        />
                      ) : (
                        <span style={{ fontSize: 18, flexShrink: 0 }}>🔧</span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            ...mono,
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--th-text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {f.name}
                        </div>
                        <div style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 2 }}>
                          App
                        </div>
                      </div>
                      <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0 }}>
                        {fmt(entry.deletedAt)}
                      </span>
                      <button
                        onClick={() => onRestoreFeature(f)}
                        style={{
                          ...mono,
                          fontSize: 10,
                          padding: "3px 9px",
                          borderRadius: 4,
                          cursor: "pointer",
                          border: "1px solid var(--th-border)",
                          background: "transparent",
                          color: "var(--th-text-secondary)",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "#22c55e";
                          (e.currentTarget as HTMLElement).style.color = "#22c55e";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--th-border)";
                          (e.currentTarget as HTMLElement).style.color = "var(--th-text-secondary)";
                        }}
                      >
                        {t({ ko: "복원", en: "Restore", ja: "復元", zh: "还原" })}
                      </button>
                      <button
                        onClick={() => void onDeleteFeature(f)}
                        style={{
                          ...mono,
                          fontSize: 10,
                          padding: "3px 9px",
                          borderRadius: 4,
                          cursor: "pointer",
                          border: "1px solid rgba(255,59,48,0.3)",
                          background: "transparent",
                          color: "#ff3b30",
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })()
              )
          )}
        </div>
      </div>
    </div>
  );
}
