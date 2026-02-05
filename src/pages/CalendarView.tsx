import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export default function CalendarView() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Calendar View</h1>
          <p className="text-muted-foreground">Visual overview of crew assignments</p>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <CalendarDays className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Coming in Phase 2</h3>
            <p className="text-muted-foreground">
              The calendar view will provide a visual weekly/monthly overview with color-coded crew assignments.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}