import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { JobCard } from "./JobCard";
import type { UpcomingWorkItem } from "./types";

interface DayColumnProps {
  date: Date;
  dateStr: string;
  items: UpcomingWorkItem[];
  canManage: boolean;
  onEdit: (item: UpcomingWorkItem) => void;
  onComplete: (id: string) => void;
  onAdd: (dateStr: string) => void;
}

export function DayColumn({
  date,
  dateStr,
  items,
  canManage,
  onEdit,
  onComplete,
  onAdd,
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  const isToday = isSameDay(date, new Date());

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[10rem] flex-1 flex-col rounded-lg border bg-card/50 p-2 transition-colors",
        isOver && "border-primary bg-primary/5",
        isToday && "ring-1 ring-primary/30"
      )}
    >
      <div
        className={cn(
          "mb-2 rounded px-2 py-1 text-center text-sm font-semibold",
          isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        )}
      >
        <div>{format(date, "EEE")}</div>
        <div className={cn("text-xs", isToday ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {format(date, "MMM d")}
        </div>
      </div>

      <SortableContext
        id={dateStr}
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2">
          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-4 text-xs text-muted-foreground/60">
              No jobs
            </div>
          ) : (
            items.map((item) => (
              <JobCard
                key={item.id}
                item={item}
                canManage={canManage}
                onEdit={onEdit}
                onComplete={onComplete}
              />
            ))
          )}
        </div>
      </SortableContext>

      {canManage && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 w-full justify-start gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onAdd(dateStr)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add job
        </Button>
      )}
    </div>
  );
}
