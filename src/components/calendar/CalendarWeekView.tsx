import { memo, useMemo, useState, useRef, useCallback, useEffect } from "react";
import { format, addDays, isToday } from "date-fns";
import { Plus } from "lucide-react";
import { CalendarEntry } from "./CalendarEntry";
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
  isMobile?: boolean;
}

const MAX_VISIBLE_ENTRIES = 6;
const DAY_ABBREVS = ["S", "M", "T", "W", "T", "F", "S"];

export const CalendarWeekView = memo(function CalendarWeekView({
  weekStart,
  entries,
  crews,
  onDayClick,
  onEntryClick,
  onShowDayDetail,
  onAddEntry,
  isMobile = false,
}: CalendarWeekViewProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(() => {
    // Default to today's index in the week, or 0
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      if (isToday(addDays(weekStart, i))) return i;
    }
    return 0;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate 7 days of the week
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Reset active day when week changes
  useEffect(() => {
    const todayIdx = days.findIndex((d) => isToday(d));
    setActiveDayIndex(todayIdx >= 0 ? todayIdx : 0);
  }, [weekStart]);

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
    Object.values(map).forEach((dayEntries) => {
      dayEntries.sort((a, b) => {
        const orderA = a.crew_id ? (crewOrderMap[a.crew_id] ?? 999) : 999;
        const orderB = b.crew_id ? (crewOrderMap[b.crew_id] ?? 999) : 999;
        return orderA - orderB;
      });
    });
    return map;
  }, [entries, crewOrderMap]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollLeft = container.scrollLeft;
    const childWidth = container.offsetWidth;
    const newIndex = Math.round(scrollLeft / childWidth);
    setActiveDayIndex(Math.min(Math.max(newIndex, 0), 6));
  }, []);

  const scrollToDay = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const childWidth = scrollRef.current.offsetWidth;
    scrollRef.current.scrollTo({ left: childWidth * index, behavior: "smooth" });
    setActiveDayIndex(index);
  }, []);

  // Mobile layout: swipeable single day
  if (isMobile) {
    return (
      <div>
        {/* Day selector row */}
        <div className="flex items-center justify-around mb-3 bg-muted rounded-lg p-2">
          {days.map((day, idx) => {
            const isActive = idx === activeDayIndex;
            const isTodayDay = isToday(day);
            return (
              <button
                key={idx}
                onClick={() => scrollToDay(idx)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isTodayDay
                    ? "text-primary font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                <span className="text-xs font-medium">{DAY_ABBREVS[idx]}</span>
                <span className="text-sm font-semibold">{format(day, "d")}</span>
              </button>
            );
          })}
        </div>

        {/* Swipeable day cards */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {days.map((day, idx) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayEntries = entriesByDate[dateStr] || [];

            return (
              <div
                key={dateStr}
                className="min-w-full snap-start px-1"
              >
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => onDayClick(day)}
                      className="text-foreground font-semibold text-base hover:text-primary transition-colors"
                    >
                      {format(day, "EEEE, MMM d")}
                    </button>
                    <button
                      onClick={() => onAddEntry(day)}
                      className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all"
                      aria-label={`Add entry for ${format(day, "MMMM d")}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {dayEntries.length > 0 ? (
                    <div className="space-y-1.5">
                      {dayEntries.map((entry) => (
                        <CalendarEntry
                          key={entry.id}
                          entry={entry}
                          crews={crews}
                          onClick={onEntryClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-6">
                      No entries
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop layout: 7-column grid
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
