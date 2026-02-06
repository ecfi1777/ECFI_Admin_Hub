import { memo } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCrewColor, getContrastTextColor } from "@/lib/crewColors";
import type { ScheduleEntry } from "@/types/schedule";
import type { CrewWithColor } from "@/hooks/useCalendarData";

interface DayDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  entries: ScheduleEntry[];
  crews: CrewWithColor[];
  onEntryClick: (entry: ScheduleEntry) => void;
}

export const DayDetailModal = memo(function DayDetailModal({
  open,
  onOpenChange,
  date,
  entries,
  crews,
  onEntryClick,
}: DayDetailModalProps) {
  if (!date) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {format(date, "EEEE, MMMM d, yyyy")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2 pr-4">
            {entries.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No entries for this day
              </p>
            ) : (
              entries.map((entry) => (
                <DayDetailEntry
                  key={entry.id}
                  entry={entry}
                  crews={crews}
                  onClick={() => {
                    onOpenChange(false);
                    onEntryClick(entry);
                  }}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

interface DayDetailEntryProps {
  entry: ScheduleEntry;
  crews: CrewWithColor[];
  onClick: () => void;
}

const DayDetailEntry = memo(function DayDetailEntry({
  entry,
  crews,
  onClick,
}: DayDetailEntryProps) {
  const crew = crews.find((c) => c.id === entry.crew_id);
  const crewColor = crew ? getCrewColor(crew) : "#6b7280";
  const textColor = getContrastTextColor(crewColor);

  const project = entry.projects;

  // Format time display
  const timeDisplay = entry.start_time
    ? format(new Date(`2000-01-01T${entry.start_time}`), "h:mm a")
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
      style={{
        backgroundColor: crewColor,
        color: textColor,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Crew Name */}
          <div className="font-semibold text-sm mb-1">
            {crew?.name || "Unassigned"}
          </div>

          {/* Builder - Location */}
          <div className="text-sm opacity-90">
            {project?.builders?.code || project?.builders?.name || "No Builder"}
            {project?.locations?.name && ` - ${project.locations.name}`}
          </div>

          {/* Lot # and Phase */}
          <div className="text-sm opacity-80 mt-0.5">
            {project?.lot_number && `Lot ${project.lot_number}`}
            {entry.phases?.name && ` • ${entry.phases.name}`}
          </div>
        </div>

        {/* Time */}
        {timeDisplay && (
          <div className="text-xs font-medium opacity-80 whitespace-nowrap">
            {timeDisplay}
          </div>
        )}
      </div>
    </button>
  );
});
