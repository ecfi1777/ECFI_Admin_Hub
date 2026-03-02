import { memo } from "react";
import { getCrewColor, getContrastTextColor } from "@/lib/crewColors";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { RotateCcw } from "lucide-react";
import { format } from "date-fns";
import type { ScheduleEntry } from "@/types/schedule";
import type { CrewWithColor } from "@/hooks/useCalendarData";

interface CalendarEntryProps {
  entry: ScheduleEntry;
  crews: CrewWithColor[];
  onClick: (entry: ScheduleEntry) => void;
}

export const CalendarEntry = memo(function CalendarEntry({ 
  entry, 
  crews, 
  onClick 
}: CalendarEntryProps) {
  const crew = crews.find(c => c.id === entry.crew_id);
  const isDidNotWork = entry.did_not_work === true;
  const isCancelled = entry.is_cancelled === true;
  const isRescheduled = !!entry.rescheduled_from_date && !isCancelled;

  // Cancelled ghost styling
  if (isCancelled) {
    const movedToLabel = entry.rescheduled_to_date
      ? format(new Date(entry.rescheduled_to_date + "T00:00:00"), "MMM d")
      : "another day";

    const displayText = `${crew?.name || "Crew"} — Cancelled → ${movedToLabel}`;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick(entry);
              }}
              className="w-full text-left px-2 py-1 rounded text-xs font-medium truncate opacity-60 line-through cursor-pointer"
              style={{
                backgroundColor: "hsl(var(--destructive) / 0.1)",
                color: "hsl(var(--destructive))",
                borderLeft: "3px solid hsl(var(--destructive))",
                textDecorationColor: "hsl(var(--destructive))",
              }}
              title={displayText}
            >
              {displayText}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[200px]">
            <p>Cancelled — moved to {movedToLabel}</p>
            {entry.cancellation_reason && <p className="text-muted-foreground mt-1">{entry.cancellation_reason}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const crewColor = isDidNotWork ? "hsl(var(--destructive) / 0.15)" : (crew ? getCrewColor(crew) : "#6b7280");
  const textColor = isDidNotWork ? "hsl(var(--destructive))" : getContrastTextColor(crewColor);

  // Build compact display text
  let displayText: string;
  if (isDidNotWork) {
    const reason = entry.not_working_reason;
    displayText = `${crew?.name || "Crew"} — No Work`;
  } else {
    const project = entry.projects;
    const parts: string[] = [];
    if (entry.phases?.name) parts.push(entry.phases.name);
    if (project?.locations?.name) parts.push(project.locations.name);
    if (project?.lot_number) parts.push(project.lot_number);
    displayText = parts.join(" | ") || "See Notes";
  }

  const entryButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(entry);
      }}
      className={`w-full text-left px-2 py-1 rounded text-xs font-medium truncate hover:opacity-80 transition-opacity cursor-pointer ${isDidNotWork ? "line-through opacity-70" : ""}`}
      style={{ 
        backgroundColor: crewColor,
        color: textColor,
        borderLeft: `3px solid ${isDidNotWork ? "hsl(var(--destructive))" : crewColor}`,
      }}
      title={displayText}
    >
      {displayText}
    </button>
  );

  if (isRescheduled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{entryButton}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[200px]">
            <p>Rescheduled from {entry.rescheduled_from_date}</p>
            {entry.cancellation_reason && <p className="text-muted-foreground mt-1">{entry.cancellation_reason}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return entryButton;
});
