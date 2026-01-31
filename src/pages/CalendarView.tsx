import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export default function CalendarView() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Calendar View</h1>
          <p className="text-slate-400">Visual overview of crew assignments</p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-12 text-center">
            <CalendarDays className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Coming in Phase 2</h3>
            <p className="text-slate-400">
              The calendar view will provide a visual weekly/monthly overview with color-coded crew assignments.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
