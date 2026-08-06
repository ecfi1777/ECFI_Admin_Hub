import { cn } from "@/lib/utils";
import { getCrewColor, getContrastTextColor } from "@/lib/crewColors";
import { Button } from "@/components/ui/button";
import type { SelectedCrewFilter } from "./types";

interface Crew {
  id: string;
  name: string;
  color: string | null;
  is_active: boolean;
  display_order: number;
}

interface CrewFilterProps {
  crews: Crew[];
  selected: SelectedCrewFilter[];
  onChange: (selected: SelectedCrewFilter[]) => void;
}

export function CrewFilter({ crews, selected, onChange }: CrewFilterProps) {
  const activeCrews = crews.filter((c) => c.is_active).sort((a, b) => a.display_order - b.display_order);
  const isAll = selected.length === 0;

  const toggle = (value: SelectedCrewFilter) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const setAll = () => onChange([]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={isAll ? "default" : "outline"}
        size="sm"
        className="h-7 text-xs"
        onClick={setAll}
      >
        All crews
      </Button>

      {activeCrews.map((crew) => {
        const color = getCrewColor(crew);
        const textColor = getContrastTextColor(color);
        const isSelected = selected.includes(crew.id);
        return (
          <Button
            key={crew.id}
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-7 gap-1.5 border-transparent text-xs",
              isSelected && "ring-2 ring-primary ring-offset-1"
            )}
            style={{
              backgroundColor: isSelected ? color : "transparent",
              color: isSelected ? textColor : undefined,
            }}
            onClick={() => toggle(crew.id)}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {crew.name}
          </Button>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-7 text-xs",
          selected.includes(null) && "bg-muted-foreground/20 text-foreground ring-2 ring-primary ring-offset-1"
        )}
        onClick={() => toggle(null)}
      >
        Unassigned
      </Button>
    </div>
  );
}
