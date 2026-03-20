import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Task } from "../../types";

export function DraggableTaskCard({ task, children }: { task: Task; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing touch-none ${isDragging ? "opacity-30" : ""}`}
    >
      {children}
    </div>
  );
}

export function DroppableColumn({
  status,
  children,
}: {
  status: string;
  children: (isOver: boolean) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}`, data: { status } });
  return (
    <div ref={setNodeRef} className="flex flex-1 flex-col min-h-0">
      {children(isOver)}
    </div>
  );
}
