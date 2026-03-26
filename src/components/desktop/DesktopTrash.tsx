import { useState, useRef, useEffect, useCallback } from "react";
import type { I18nContextValue } from "../../i18n";
import { IconTrash } from "./DesktopIcons";
import type { TrashedProject, TrashedFeature } from "./DesktopTypes";
import { useUiStore } from "../../store/uiStore";
import { snapToFreeCell } from "./snapToFreeCell";

import { createPortal } from "react-dom";
import AppWindow from "../windows/AppWindow";

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
            <IconTrash color={hov || full ? "#ff3b30" : "#9CA3AF"} />
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
                border: "1.5px solid #F3F4F6",
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
            color: hov || full ? "#ff3b30" : "#6B7280",
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
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
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
              color: "#111827",
              textAlign: "left",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F3F4F6"; }}
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
  const mono = "var(--th-font-mono)";
  const fmt = (ts: number) => new Date(ts).toLocaleDateString();

  const modalContent = (
    <AppWindow
      windowType="cli-usage" // Trash uses general window frame
      title={t({ ko: "휴지통", en: "Trash", ja: "ゴミ箱", zh: "垃圾桶" })}
      emoji="🗑️"
      defaultWidth={520}
      defaultHeight={600}
      onClose={onClose}
      headerActions={
        (items.length + features.length) > 0 && (
          <button
            onClick={() => void onEmpty()}
            style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: 8,
              cursor: "pointer",
              border: "1px solid #FECACA",
              background: "#FEF2F2",
              color: "#DC2626",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#FEE2E2"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#FEF2F2"; }}
          >
            {t({ ko: "비우기", en: "EMPTY", ja: "空にする", zh: "清空" })}
          </button>
        )
      }
    >
      <div className="flex flex-col h-full bg-white">
        <div className="flex-shrink-0 px-6 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.02em" }}>
              {items.length + features.length} {t({ ko: "개 항목 보관됨", en: "ITEMS ARCHIVED", ja: "個の項目", zh: "项内容" })}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {items.length + features.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
              <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full">
                <IconTrash color="#6B7280" />
              </div>
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: "#4B5563" }}>
                {t({ ko: "휴지통이 비어 있습니다", en: "Trash is empty", ja: "ゴミ箱は空です", zh: "垃圾桶为空" })}
              </span>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {[...items.map((d) => ({ kind: "project" as const, deletedAt: d.deletedAt, data: d })),
               ...features.map((d) => ({ kind: "feature" as const, deletedAt: d.deletedAt, data: d }))]
                .sort((a, b) => b.deletedAt - a.deletedAt)
                .map((entry) =>
                  <div
                    key={entry.data.id}
                    className="group px-6 py-4 hover:bg-blue-50/30 transition-colors flex items-center gap-4"
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 group-hover:border-blue-100 group-hover:bg-white transition-all">
                      {entry.kind === "project" ? (
                        <span style={{ fontSize: 20 }}>📁</span>
                      ) : (
                        <span style={{ fontSize: 20 }}>🔧</span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 800, color: "#111827" }} className="truncate">
                        {entry.data.name}
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 10, color: "#94A3B8", marginTop: 2 }} className="truncate">
                        {entry.kind === "project" 
                          ? (entry.data as TrashedProject).project_path 
                          : t({ ko: "애플리케이션 기능", en: "System Feature", ja: "機能", zh: "功能" })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => entry.kind === "project" ? void onRestore(entry.data as TrashedProject) : onRestoreFeature(entry.data as TrashedFeature)}
                        style={{
                          fontFamily: mono,
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "6px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                          border: "1px solid #DCFCE7",
                          background: "#F0FDF4",
                          color: "#166534",
                        }}
                      >
                        {t({ ko: "복원", en: "RESTORE", ja: "復元", zh: "还原" })}
                      </button>
                      <button
                        onClick={() => entry.kind === "project" ? onDelete(entry.data as TrashedProject) : void onDeleteFeature(entry.data as TrashedFeature)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                    
                    <div className="text-[10px] font-bold text-gray-400 group-hover:hidden" style={{ fontFamily: mono }}>
                      {fmt(entry.deletedAt)}
                    </div>
                  </div>
                )
              }
            </div>
          )}
        </div>
      </div>
    </AppWindow>
  );

  return createPortal(modalContent, document.body);
}
