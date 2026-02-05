import { memo, useMemo } from "react";
import { format, addDays, isSameDay, isToday, parseISO } from "date-fns";
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
}

export const CalendarWeekView = memo(function CalendarWeekView({
  weekStart,
  entries,
  crews,
  onDayClick,
  onEntryClick,
}: CalendarWeekViewProps) {
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

        return (
          <div
            key={dateStr}
            className="bg-card min-h-[200px] flex flex-col"
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
                  isCurrentDay
                    ? "text-primary"
                    : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </div>
            </button>

            {/* Entries */}
            <div className="flex-1 p-1">
              {dayEntries.length > 0 ? (
                <ScrollArea className="h-[160px]">
                  <div className="space-y-1 pr-2">
                    {dayEntries.map((entry) => (
                      <CalendarEntry
                        key={entry.id}
                        entry={entry}
                        crews={crews}
                        onClick={onEntryClick}
                      />
                    ))}
                  </div>
                </ScrollArea>
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
