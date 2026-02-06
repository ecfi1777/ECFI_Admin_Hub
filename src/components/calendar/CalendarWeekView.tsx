import { memo, useMemo, useState } from "react";
import { format, addDays, isToday } from "date-fns";
import { Plus } from "lucide-react";
import { CalendarEntry } from "./CalendarEntry";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScheduleEntry } from "@/types/schedule";
import type { CrewWithColor } from "@/hooks/useCalendarData";

interface CalendarWeekViewProps {
  weekStart: Date;
  entries: ScheduleEntry[];
  crews: CrewWithColor[];
  onDayClick: (date: Date) => void;
  onEntryClick: (entry: ScheduleEntry) => void;
  onShowDayDetail: (date: Date, entries: ScheduleEntry[]) => void;
  onAddEntry: (date: Date) => void;
}

const MAX_VISIBLE_ENTRIES = 3;

export const CalendarWeekView = memo(function CalendarWeekView({
  weekStart,
  entries,
  crews,
  onDayClick,
  onEntryClick,
  onShowDayDetail,
  onAddEntry,
}: CalendarWeekViewProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Generate 7 days of the week
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map: Record<string, ScheduleEntry[]> = {};
    entries.forEach((entry) => {
      const dateKey = entry.scheduled_date;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(entry);
    });
    return map;
  }, [entries]);

  return (
    <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayEntries = entriesByDate[dateStr] || [];
        const isCurrentDay = isToday(day);
        const isHovered = hoveredDay === dateStr;
        const hasMoreEntries = dayEntries.length > MAX_VISIBLE_ENTRIES;
        const visibleEntries = dayEntries.slice(0, MAX_VISIBLE_ENTRIES);

        return (
          <div
            key={dateStr}
            className="bg-card min-h-[200px] flex flex-col relative group"
            onMouseEnter={() => setHoveredDay(dateStr)}
            onMouseLeave={() => setHoveredDay(null)}
          >
            {/* Day Header */}
            <button
              onClick={() => onDayClick(day)}
              className={`p-2 text-center border-b border-border hover:bg-muted/50 transition-colors ${
                isCurrentDay ? "bg-primary/10" : ""
              }`}
            >
              <div className="text-xs text-muted-foreground font-medium">
                {format(day, "EEE")}
              </div>
              <div
                className={`text-lg font-semibold ${
                  isCurrentDay ? "text-primary" : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </div>
            </button>

            {/* Add Button - appears on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddEntry(day);
              }}
              className={`absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all z-10 ${
                isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75"
              }`}
              aria-label={`Add entry for ${format(day, "MMMM d")}`}
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Entries */}
            <div className="flex-1 p-1">
              {dayEntries.length > 0 ? (
                <div className="space-y-1">
                  {visibleEntries.map((entry) => (
                    <CalendarEntry
                      key={entry.id}
                      entry={entry}
                      crews={crews}
                      onClick={onEntryClick}
                    />
                  ))}
                  {hasMoreEntries && (
                    <button
                      onClick={() => onShowDayDetail(day, dayEntries)}
                      className="w-full text-left px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
                    >
                      +{dayEntries.length - MAX_VISIBLE_ENTRIES} more
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => onDayClick(day)}
                  className="w-full h-full min-h-[50px] text-xs text-muted-foreground/50 hover:bg-muted/30 rounded transition-colors flex items-center justify-center"
                >
                  No entries
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
