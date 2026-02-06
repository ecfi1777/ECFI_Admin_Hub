import { memo, useMemo, useState } from "react";
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
import { Plus } from "lucide-react";
import { CalendarEntry } from "./CalendarEntry";
import type { ScheduleEntry } from "@/types/schedule";
import type { CrewWithColor } from "@/hooks/useCalendarData";

interface CalendarMonthViewProps {
  currentMonth: Date;
  entries: ScheduleEntry[];
  crews: CrewWithColor[];
  onDayClick: (date: Date) => void;
  onEntryClick: (entry: ScheduleEntry) => void;
  onShowDayDetail: (date: Date, entries: ScheduleEntry[]) => void;
  onAddEntry: (date: Date) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_ENTRIES = 3;

export const CalendarMonthView = memo(function CalendarMonthView({
  currentMonth,
  entries,
  crews,
  onDayClick,
  onEntryClick,
  onShowDayDetail,
  onAddEntry,
}: CalendarMonthViewProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

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

  // Create crew order lookup for sorting
  const crewOrderMap = useMemo(() => {
    const map: Record<string, number> = {};
    crews.forEach((crew) => {
      map[crew.id] = crew.display_order;
    });
    return map;
  }, [crews]);

  // Group entries by date, sorted by crew display_order
  const entriesByDate = useMemo(() => {
    const map: Record<string, ScheduleEntry[]> = {};
    entries.forEach((entry) => {
      const dateKey = entry.scheduled_date;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(entry);
    });
    // Sort each day's entries by crew display_order
    Object.values(map).forEach((dayEntries) => {
      dayEntries.sort((a, b) => {
        const orderA = a.crew_id ? (crewOrderMap[a.crew_id] ?? 999) : 999;
        const orderB = b.crew_id ? (crewOrderMap[b.crew_id] ?? 999) : 999;
        return orderA - orderB;
      });
    });
    return map;
  }, [entries, crewOrderMap]);

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
            const isHovered = hoveredDay === dateStr;

            return (
              <div
                key={dateStr}
                className={`bg-card min-h-[100px] flex flex-col relative group ${
                  !isCurrentMonth ? "opacity-40" : ""
                }`}
                onMouseEnter={() => setHoveredDay(dateStr)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between p-1">
                  <button
                    onClick={() => onDayClick(day)}
                    className={`hover:bg-muted/50 transition-colors rounded-full ${
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

                  {/* Add Button - appears on hover */}
                  {isCurrentMonth && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddEntry(day);
                      }}
                      className={`w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all ${
                        isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75"
                      }`}
                      aria-label={`Add entry for ${format(day, "MMMM d")}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>

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
                      onClick={() => onShowDayDetail(day, dayEntries)}
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
