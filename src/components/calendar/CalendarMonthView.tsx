import { memo, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
} from "date-fns";
import { CalendarEntry } from "./CalendarEntry";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScheduleEntry } from "@/types/schedule";
import type { CrewWithColor } from "@/hooks/useCalendarData";

interface CalendarMonthViewProps {
  currentMonth: Date;
  entries: ScheduleEntry[];
  crews: CrewWithColor[];
  onDayClick: (date: Date) => void;
  onEntryClick: (entry: ScheduleEntry) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_ENTRIES = 3;

export const CalendarMonthView = memo(function CalendarMonthView({
  currentMonth,
  entries,
  crews,
  onDayClick,
  onEntryClick,
}: CalendarMonthViewProps) {
  // Generate all days for the calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

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

  // Split days into weeks for grid
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 bg-muted border-b border-border">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-7 gap-px bg-border">
          {week.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayEntries = entriesByDate[dateStr] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);
            const hasMoreEntries = dayEntries.length > MAX_VISIBLE_ENTRIES;
            const visibleEntries = dayEntries.slice(0, MAX_VISIBLE_ENTRIES);

            return (
              <div
                key={dateStr}
                className={`bg-card min-h-[100px] flex flex-col ${
                  !isCurrentMonth ? "opacity-40" : ""
                }`}
              >
                {/* Day Number */}
                <button
                  onClick={() => onDayClick(day)}
                  className={`p-1 text-right hover:bg-muted/50 transition-colors ${
                    isCurrentDay ? "bg-primary/10" : ""
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 text-sm rounded-full ${
                      isCurrentDay
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </button>

                {/* Entries */}
                <div className="flex-1 px-1 pb-1 space-y-0.5">
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
                      onClick={() => onDayClick(day)}
                      className="w-full text-left px-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      +{dayEntries.length - MAX_VISIBLE_ENTRIES} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});
