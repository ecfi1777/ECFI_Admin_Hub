import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface WeekHeaderProps {
  anchorDate: Date;
  activeTab: string;
  onTabChange: (tab: string) => void;
  needsEntryCount: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekHeader({
  anchorDate,
  activeTab,
  onTabChange,
  needsEntryCount,
  onPrev,
  onNext,
  onToday,
}: WeekHeaderProps) {
  const monday = startOfWeek(anchorDate, { weekStartsOn: 1 });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upcoming Work</h1>
        <p className="text-sm text-muted-foreground">
          Freehand weekly planning board
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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

        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="needs-entry" className="gap-1.5">
              Needs Schedule Entry
              {needsEntryCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px]">
                  {needsEntryCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
