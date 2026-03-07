import type { DragEvent } from "react";
import type { Agent, Department } from "../../types";
import { localeName } from "../../i18n";
import type { Translator } from "./types";

interface DepartmentsTabProps {
  tr: Translator;
  locale: string;
  agents: Agent[];
  departments: Department[];
  deptOrder: Department[];
  deptOrderDirty: boolean;
  reorderSaving: boolean;
  draggingDeptId: string | null;
  dragOverDeptId: string | null;
  dragOverPosition: "before" | "after" | null;
  onSaveOrder: () => void;
  onCancelOrder: () => void;
  onMoveDept: (index: number, direction: -1 | 1) => void;
  onEditDept: (department: Department) => void;
  onDragStart: (deptId: string, event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (deptId: string, event: DragEvent<HTMLDivElement>) => void;
  onDrop: (deptId: string, event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

export default function DepartmentsTab({
  tr,
  locale,
  agents,
  departments,
  deptOrder,
  deptOrderDirty,
  reorderSaving,
  draggingDeptId,
  dragOverDeptId,
  dragOverPosition,
  onSaveOrder,
  onCancelOrder,
  onMoveDept,
  onEditDept,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: DepartmentsTabProps) {
  return (
    <div className="space-y-4">
      {deptOrderDirty && (
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            borderRadius: "4px",
            background: "var(--th-bg-surface)",
            border: "1px solid var(--th-border)",
          }}
        >
          <span className="text-sm" style={{ color: "var(--th-text-primary)" }}>
            {tr("순번이 변경되었습니다.", "Order has been changed.")}
          </span>
          <button
            type="button"
            onClick={onSaveOrder}
            disabled={reorderSaving}
            className="ml-auto px-4 py-1.5 text-sm font-medium font-mono transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ borderRadius: "2px", background: "var(--th-accent)", color: "#000" }}
          >
            {reorderSaving ? tr("저장 중...", "Saving...") : tr("순번 저장", "Save Order")}
          </button>
          <button
            type="button"
            onClick={onCancelOrder}
            className="px-3 py-1.5 text-sm font-medium font-mono transition-opacity hover:opacity-90"
            style={{ borderRadius: "2px", color: "var(--th-text-muted)", background: "var(--th-bg-surface-hover)" }}
          >
            {tr("취소", "Cancel")}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {deptOrder.map((dept, index) => {
          const agentCountForDept = agents.filter((agent) => agent.department_id === dept.id).length;
          const isDragging = draggingDeptId === dept.id;
          const isDragTarget = dragOverDeptId === dept.id && draggingDeptId !== dept.id;
          const showDropBefore = isDragTarget && dragOverPosition === "before";
          const showDropAfter = isDragTarget && dragOverPosition === "after";
          return (
            <div
              key={dept.id}
              draggable
              onDragStart={(e) => onDragStart(dept.id, e)}
              onDragOver={(e) => onDragOver(dept.id, e)}
              onDrop={(e) => onDrop(dept.id, e)}
              onDragEnd={onDragEnd}
              className={`relative flex items-center gap-3 px-4 py-3 transition-all group ${isDragging ? "opacity-60" : ""}`}
              style={{ borderRadius: "4px", background: "var(--th-bg-surface)", border: "1px solid var(--th-border)" }}
            >
              {showDropBefore && (
                <div
                  className="pointer-events-none absolute left-2 right-2 top-0 h-0.5"
                  style={{ background: "var(--th-accent, #2563eb)" }}
                />
              )}
              {showDropAfter && (
                <div
                  className="pointer-events-none absolute left-2 right-2 bottom-0 h-0.5"
                  style={{ background: "var(--th-accent, #2563eb)" }}
                />
              )}

              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => onMoveDept(index, -1)}
                  disabled={index === 0}
                  className="w-6 h-5 flex items-center justify-center text-xs transition-colors hover:opacity-80 disabled:opacity-20"
                  style={{ color: "var(--th-text-muted)" }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => onMoveDept(index, 1)}
                  disabled={index === deptOrder.length - 1}
                  className="w-6 h-5 flex items-center justify-center text-xs transition-colors hover:opacity-80 disabled:opacity-20"
                  style={{ color: "var(--th-text-muted)" }}
                >
                  ▼
                </button>
              </div>

              <div
                className="w-8 h-8 flex items-center justify-center text-sm font-bold font-mono"
                style={{ borderRadius: "2px", background: `${dept.color}22`, color: dept.color }}
              >
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: "var(--th-text-heading)" }}>
                    {localeName(locale, dept)}
                  </span>
                  <span className="w-3 h-3 inline-block" style={{ borderRadius: "50%", background: dept.color }}></span>
                  <span
                    className="text-xs px-2 py-0.5 font-mono"
                    style={{ borderRadius: "2px", background: `${dept.color}22`, color: dept.color }}
                  >
                    {agentCountForDept} {tr("명", "agents")}
                  </span>
                </div>
                {dept.description && (
                  <div className="text-xs mt-0.5 truncate" style={{ color: "var(--th-text-muted)" }}>
                    {dept.description}
                  </div>
                )}
              </div>

              <code className="text-[10px] px-2 py-0.5 opacity-50 font-mono" style={{ borderRadius: "2px", background: "var(--th-bg-surface-hover)" }}>
                {dept.id}
              </code>

              <button
                type="button"
                onClick={() => onEditDept(dept)}
                className="px-3 py-1.5 text-xs font-medium font-mono transition-opacity opacity-0 group-hover:opacity-100 hover:opacity-90"
                style={{ borderRadius: "2px", color: "var(--th-text-muted)", background: "var(--th-bg-surface-hover)" }}
              >
                {tr("편집", "Edit")}
              </button>
            </div>
          );
        })}
      </div>

      {deptOrder.length === 0 && (
        <div className="text-center py-16 text-sm" style={{ color: "var(--th-text-muted)" }}>
          {tr("등록된 부서가 없습니다.", "No departments found.")}
        </div>
      )}
    </div>
  );
}
