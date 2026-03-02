import { memo } from "react";
import { getCrewColor, getContrastTextColor } from "@/lib/crewColors";
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
  const isDidNotWork = (entry as any).did_not_work === true;
  const crewColor = isDidNotWork ? "hsl(var(--destructive) / 0.15)" : (crew ? getCrewColor(crew) : "#6b7280");
  const textColor = isDidNotWork ? "hsl(var(--destructive))" : getContrastTextColor(crewColor);

  // Build compact display text
  let displayText: string;
  if (isDidNotWork) {
    const reason = (entry as any).not_working_reason;
    displayText = `${crew?.name || "Crew"} — DNW: ${reason || "No reason"}`;
  } else {
    const project = entry.projects;
    const parts: string[] = [];
    if (entry.phases?.name) parts.push(entry.phases.name);
    if (project?.locations?.name) parts.push(project.locations.name);
    if (project?.lot_number) parts.push(project.lot_number);
    displayText = parts.join(" | ") || "No details";
  }

  return (
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
});
