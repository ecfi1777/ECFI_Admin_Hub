import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCrewColor, getContrastTextColor } from "@/lib/crewColors";
import { Button } from "@/components/ui/button";
import type { UpcomingWorkItem } from "./types";

interface JobCardProps {
  item: UpcomingWorkItem;
  canManage: boolean;
  onEdit: (item: UpcomingWorkItem) => void;
  onComplete: (id: string) => void;
}

export function JobCard({ item, canManage, onEdit, onComplete }: JobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: "JobCard",
      item,
    },
    disabled: !canManage,
  });

  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isComplete = item.status === "complete";
  const crew = item.crews;
  const crewColor = crew ? getCrewColor(crew) : null;
  const crewTextColor = crewColor ? getContrastTextColor(crewColor) : undefined;
  const phaseName = item.phases?.name || item.phase_custom || "Unknown phase";

  const dragProps = canManage ? { ...attributes, ...listeners } : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      role="button"
      tabIndex={0}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        (dragProps as { onPointerDown?: (e: React.PointerEvent) => void }).onPointerDown?.(e);
      }}
      onClick={(e) => {
        if (isDragging) return;
        const start = pointerStart.current;
        if (start) {
          const dx = Math.abs(e.clientX - start.x);
          const dy = Math.abs(e.clientY - start.y);
          if (dx > 5 || dy > 5) return;
        }
        onEdit(item);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(item);
        }
      }}
      className={cn(
        "group relative rounded-md border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        canManage ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        isComplete && "bg-muted/40 opacity-90"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              isComplete ? "bg-emerald-500" : "bg-blue-500"
            )}
            title={isComplete ? "Complete" : "Scheduled"}
          />
          {crew ? (
            <span
              className="inline-flex max-w-full items-center break-words rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: crewColor || "#64748b", color: crewTextColor }}
            >
              {crew.name}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              No crew
            </span>
          )}
        </div>
        {canManage && !isComplete && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onComplete(item.id);
            }}
            title="Mark complete"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>

      <span className="mb-1.5 inline-block max-w-full break-words rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
        {phaseName}
      </span>

      <p className="whitespace-pre-wrap break-words text-sm text-foreground">{item.description}</p>
    </div>
  );
}
