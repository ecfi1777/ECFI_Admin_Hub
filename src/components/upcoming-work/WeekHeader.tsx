import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";

interface WeekHeaderProps {
  anchorDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekHeader({ anchorDate, onPrev, onNext, onToday }: WeekHeaderProps) {
  const monday = startOfWeek(anchorDate, { weekStartsOn: 1 });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upcoming Work</h1>
        <p className="text-sm text-muted-foreground">
          Freehand weekly planning board
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button type="button" variant="outline" size="icon" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-[10rem] px-3 text-center text-sm font-semibold">
          Week of {format(monday, "MM/dd/yyyy")}
        </div>
        <Button type="button" variant="outline" size="icon" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="ml-1"
          onClick={onToday}
        >
          Today
        </Button>
      </div>
    </div>
  );
}
