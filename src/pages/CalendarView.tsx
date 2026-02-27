import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from "lucide-react";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CrewColorLegend } from "@/components/calendar/CrewColorLegend";
import { DayDetailModal } from "@/components/calendar/DayDetailModal";
import { EditEntryDialog } from "@/components/schedule/EditEntryDialog";
import { AddEntryDialog } from "@/components/schedule/AddEntryDialog";
import { useCalendarEntries, useCrewsWithColors } from "@/hooks/useCalendarData";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";
import type { ScheduleEntry } from "@/types/schedule";

type ViewMode = "week" | "month";

export default function CalendarView() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { canManage } = useUserRole();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Edit dialog state
  const [editEntry, setEditEntry] = useState<ScheduleEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Day detail modal state
  const [dayDetailDate, setDayDetailDate] = useState<Date | null>(null);
  const [dayDetailEntries, setDayDetailEntries] = useState<ScheduleEntry[]>([]);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);

  // Add entry dialog state
  const [addEntryDate, setAddEntryDate] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Calculate date range based on view mode
  const { startDate, endDate, displayTitle } = useMemo(() => {
    if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return {
        startDate: format(weekStart, "yyyy-MM-dd"),
        endDate: format(weekEnd, "yyyy-MM-dd"),
        displayTitle: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`,
      };
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      // Extend to calendar grid bounds
      const calStart = startOfWeek(monthStart);
      const calEnd = endOfWeek(monthEnd);
      return {
        startDate: format(calStart, "yyyy-MM-dd"),
        endDate: format(calEnd, "yyyy-MM-dd"),
        displayTitle: format(currentDate, "MMMM yyyy"),
      };
    }
  }, [viewMode, currentDate]);

  // Fetch data
  const { data: entries = [], isLoading: entriesLoading } = useCalendarEntries(
    startDate,
    endDate
  );
  const { data: crews = [], isLoading: crewsLoading } = useCrewsWithColors();

  const isLoading = entriesLoading || crewsLoading;

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    if (viewMode === "week") {
      setCurrentDate((d) => subWeeks(d, 1));
    } else {
      setCurrentDate((d) => subMonths(d, 1));
    }
  }, [viewMode]);

  const goToNext = useCallback(() => {
    if (viewMode === "week") {
      setCurrentDate((d) => addWeeks(d, 1));
    } else {
      setCurrentDate((d) => addMonths(d, 1));
    }
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Click handlers
  const handleDayClick = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      navigate(`/?date=${dateStr}`);
    },
    [navigate]
  );

  const handleEntryClick = useCallback((entry: ScheduleEntry) => {
    if (!canManage) return; // Viewers cannot edit entries
    setEditEntry(entry);
    setEditDialogOpen(true);
  }, [canManage]);

  const handleShowDayDetail = useCallback((date: Date, dayEntries: ScheduleEntry[]) => {
    setDayDetailDate(date);
    setDayDetailEntries(dayEntries);
    setDayDetailOpen(true);
  }, []);

  const handleAddEntry = useCallback((date: Date) => {
    setAddEntryDate(format(date, "yyyy-MM-dd"));
    setAddDialogOpen(true);
  }, []);

  return (
    <AppLayout>
      <div className="p-3 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendar View</h1>
            <p className="text-muted-foreground">
              Visual overview of crew assignments
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* View Toggle */}
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && setViewMode(v as ViewMode)}
              className="border border-border rounded-lg"
            >
              <ToggleGroupItem value="week" aria-label="Week view" className="gap-1.5">
                <CalendarDays className="w-4 h-4" />
                <span className="hidden sm:inline">Week</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="month" aria-label="Month view" className="gap-1.5">
                <CalendarRange className="w-4 h-4" />
                <span className="hidden sm:inline">Month</span>
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Navigation */}
            <div className="flex items-center gap-1 md:gap-2 bg-muted rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-foreground font-medium min-w-[140px] md:min-w-[180px] text-center text-sm md:text-base">
                {displayTitle}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={goToToday}
              variant="outline"
              className="border-border text-foreground hover:bg-muted"
            >
              Today
            </Button>
          </div>
        </div>

        {/* Crew Legend */}
        {!isLoading && crews.length > 0 && (
          <div className="mb-4">
            <CrewColorLegend crews={crews} />
          </div>
        )}

        {/* Calendar Content */}
        {isLoading ? (
          <CalendarSkeleton viewMode={viewMode} isMobile={isMobile} />
        ) : viewMode === "week" ? (
          <CalendarWeekView
            weekStart={startOfWeek(currentDate)}
            entries={entries}
            crews={crews}
            onDayClick={handleDayClick}
            onEntryClick={handleEntryClick}
            onShowDayDetail={handleShowDayDetail}
            onAddEntry={canManage ? handleAddEntry : undefined}
            isMobile={isMobile}
          />
        ) : (
          <CalendarMonthView
            currentMonth={currentDate}
            entries={entries}
            crews={crews}
            onDayClick={handleDayClick}
            onEntryClick={handleEntryClick}
            onShowDayDetail={handleShowDayDetail}
            onAddEntry={canManage ? handleAddEntry : undefined}
            isMobile={isMobile}
          />
        )}

        {/* Day Detail Modal */}
        <DayDetailModal
          open={dayDetailOpen}
          onOpenChange={setDayDetailOpen}
          date={dayDetailDate}
          entries={dayDetailEntries}
          crews={crews}
          onEntryClick={handleEntryClick}
        />

        {/* Edit Entry Dialog */}
        <EditEntryDialog
          entry={editEntry}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />

        {/* Add Entry Dialog */}
        <AddEntryDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          defaultDate={addEntryDate}
        />
      </div>
    </AppLayout>
  );
}

function CalendarSkeleton({ viewMode, isMobile }: { viewMode: ViewMode; isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-3">
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === "week") {
    return (
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-card min-h-[200px] p-2">
            <Skeleton className="h-6 w-12 mx-auto mb-2" />
            <Skeleton className="h-8 w-8 mx-auto mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 bg-muted border-b border-border">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 m-2" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-7 gap-px bg-border">
          {Array.from({ length: 7 }).map((_, dayIdx) => (
            <div key={dayIdx} className="bg-card min-h-[100px] p-1">
              <Skeleton className="h-6 w-6 ml-auto mb-2" />
              <Skeleton className="h-5 w-full mb-1" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
