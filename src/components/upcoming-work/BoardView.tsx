import { useState, useMemo, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { addDays, format } from "date-fns";
import { DayColumn } from "./DayColumn";
import { JobCard } from "./JobCard";
import type { UpcomingWorkItem } from "./types";

interface BoardViewProps {
  monday: Date;
  items: UpcomingWorkItem[];
  canManage: boolean;
  onEdit: (item: UpcomingWorkItem) => void;
  onComplete: (id: string) => void;
  onAdd: (dateStr: string) => void;
  onMoveItem: (itemId: string, newDate: string, newDisplayOrder: number) => void;
  onReorderDay: (date: string, orderedIds: string[]) => void;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function BoardView({
  monday,
  items,
  canManage,
  onEdit,
  onComplete,
  onAdd,
  onMoveItem,
  onReorderDay,
}: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const itemsByDay = useMemo(() => {
    const map: Record<string, UpcomingWorkItem[]> = {};
    for (const offset of DAYS) {
      const date = format(addDays(monday, offset), "yyyy-MM-dd");
      map[date] = [];
    }
    for (const item of items) {
      if (item.work_date && map[item.work_date]) {
        map[item.work_date].push(item);
      }
    }
    return map;
  }, [items, monday]);

  const [localItemsByDay, setLocalItemsByDay] = useState<Record<string, UpcomingWorkItem[]>>(itemsByDay);

  // Keep local state in sync with query data when not dragging
  useEffect(() => {
    if (activeId === null) {
      setLocalItemsByDay(itemsByDay);
    }
  }, [itemsByDay, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const findContainer = useCallback(
    (id: string) => {
      if (id in localItemsByDay) return id;
      for (const [day, dayItems] of Object.entries(localItemsByDay)) {
        if (dayItems.some((i) => i.id === id)) return day;
      }
      return null;
    },
    [localItemsByDay]
  );

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    for (const dayItems of Object.values(localItemsByDay)) {
      const found = dayItems.find((i) => i.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, localItemsByDay]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeContainer = findContainer(active.id as string);
      const overId = over.id as string;
      const overContainer = overId in localItemsByDay ? overId : findContainer(overId);
      if (!activeContainer || !overContainer || activeContainer === overContainer) return;

      setLocalItemsByDay((prev) => {
        const activeItems = prev[activeContainer].filter((i) => i.id !== active.id);
        const overItems = [...prev[overContainer]];
        const overIndex = overItems.findIndex((i) => i.id === overId);
        const item = prev[activeContainer].find((i) => i.id === active.id);
        if (!item) return prev;

        const newIndex = overIndex >= 0 ? overIndex : overItems.length;
        overItems.splice(newIndex, 0, item);
        return {
          ...prev,
          [activeContainer]: activeItems,
          [overContainer]: overItems,
        };
      });
    },
    [findContainer, localItemsByDay]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over) return;

      const activeContainer = findContainer(active.id as string);
      const overId = over.id as string;
      const overContainer = overId in localItemsByDay ? overId : findContainer(overId);
      if (!activeContainer || !overContainer) return;

      const activeIndex = localItemsByDay[activeContainer].findIndex(
        (i) => i.id === active.id
      );
      const overIndex = localItemsByDay[overContainer].findIndex(
        (i) => i.id === overId
      );

      if (activeContainer === overContainer) {
        if (activeIndex !== overIndex && overIndex >= 0) {
          const newOrder = arrayMove(
            localItemsByDay[overContainer].map((i) => i.id),
            activeIndex,
            overIndex
          );
          onReorderDay(overContainer, newOrder);
        }
      } else {
        const targetItems = localItemsByDay[overContainer];
        const newDisplayOrder = (targetItems[targetItems.length - 1]?.display_order || 0) + 1;
        onMoveItem(active.id as string, overContainer, newDisplayOrder);
      }
    },
    [findContainer, localItemsByDay, onMoveItem, onReorderDay]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={canManage ? handleDragStart : undefined}
      onDragOver={canManage ? handleDragOver : undefined}
      onDragEnd={canManage ? handleDragEnd : undefined}
    >
      <div className="grid min-w-full grid-cols-7 gap-2">
        {DAYS.map((offset) => {
          const date = addDays(monday, offset);
          const dateStr = format(date, "yyyy-MM-dd");
          return (
            <DayColumn
              key={dateStr}
              date={date}
              dateStr={dateStr}
              items={localItemsByDay[dateStr] || []}
              canManage={canManage}
              onEdit={onEdit}
              onComplete={onComplete}
              onAdd={onAdd}
            />
          );
        })}
      </div>

      <DragOverlay>{activeItem ? <JobCard item={activeItem} canManage={false} onEdit={() => {}} onComplete={() => {}} /> : null}</DragOverlay>
    </DndContext>
  );
}
