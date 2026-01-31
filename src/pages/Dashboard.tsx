import { AppLayout } from "@/components/layout/AppLayout";
import { DailySchedule } from "@/components/schedule/DailySchedule";

export default function Dashboard() {
  return (
    <AppLayout>
      <DailySchedule />
    </AppLayout>
  );
}
