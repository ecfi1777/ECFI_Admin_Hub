import { memo } from "react";
import { getCrewColor } from "@/lib/crewColors";
import type { CrewWithColor } from "@/hooks/useCalendarData";

interface CrewColorLegendProps {
  crews: CrewWithColor[];
}

export const CrewColorLegend = memo(function CrewColorLegend({
  crews,
}: CrewColorLegendProps) {
  // Only show active crews in legend
  const activeCrews = crews.filter((c) => c.is_active);

  if (activeCrews.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
      <span className="text-xs font-medium text-muted-foreground">Crews:</span>
      {activeCrews.map((crew) => {
        const color = getCrewColor(crew);
        return (
          <div key={crew.id} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-foreground">{crew.name}</span>
          </div>
        );
      })}
    </div>
  );
});
