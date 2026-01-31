import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import { ScheduleEntryRow } from "./ScheduleEntryRow";
import { AddEntryDialog } from "./AddEntryDialog";

interface ScheduleEntry {
  id: string;
  project_id: string | null;
  crew_id: string | null;
  phase_id: string | null;
  scheduled_date: string;
  start_time: string | null;
  order_status: string | null;
  notes: string | null;
  supplier_id: string | null;
  ready_mix_invoice_number: string | null;
  ready_mix_invoice_amount: number | null;
  ready_mix_yards_billed: number | null;
  crew_yards_poured: number | null;
  pump_vendor_id: string | null;
  pump_invoice_number: string | null;
  pump_invoice_amount: number | null;
  inspection_type_id: string | null;
  inspector_id: string | null;
  inspection_invoice_number: string | null;
  inspection_amount: number | null;
  to_be_invoiced: boolean;
  invoice_complete: boolean;
  invoice_number: string | null;
  crews: { name: string } | null;
  phases: { name: string } | null;
  suppliers: { name: string; code: string | null } | null;
  pump_vendors: { name: string; code: string | null } | null;
  inspection_types: { name: string } | null;
  inspectors: { name: string } | null;
  projects: {
    lot_number: string;
    builders: { name: string; code: string | null } | null;
    locations: { name: string } | null;
  } | null;
}

interface Crew {
  id: string;
  name: string;
}

export function DailySchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: crews = [] } = useQuery({
    queryKey: ["crews-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crews")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Crew[];
    },
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["schedule-entries", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          *,
          crews(name),
          phases(name),
          suppliers(name, code),
          pump_vendors(name, code),
          inspection_types(name),
          inspectors(name),
          projects(
            lot_number,
            builders(name, code),
            locations(name)
          )
        `)
        .eq("scheduled_date", dateStr)
        .eq("deleted", false)
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as ScheduleEntry[];
    },
  });

  const entriesByCrew = crews.reduce((acc, crew) => {
    acc[crew.id] = entries.filter((e) => e.crew_id === crew.id);
    return acc;
  }, {} as Record<string, ScheduleEntry[]>);

  const unassignedEntries = entries.filter((e) => !e.crew_id);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Schedule</h1>
          <p className="text-slate-400">Manage crew assignments and pours</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 px-3">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span className="text-white font-medium min-w-[140px] text-center">
                {format(selectedDate, "EEE, MMM d, yyyy")}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="text-slate-400 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            onClick={() => setSelectedDate(new Date())}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Schedule Grid */}
      {isLoading ? (
        <div className="text-slate-400 text-center py-12">Loading schedule...</div>
      ) : (
        <div className="space-y-4">
          {crews.map((crew) => (
            <Card key={crew.id} className="bg-slate-800 border-slate-700">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold text-amber-500">
                  Crew {crew.name}
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedCrewId(crew.id);
                    setIsAddDialogOpen(true);
                  }}
                  className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Entry
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {entriesByCrew[crew.id]?.length > 0 ? (
                  <div className="divide-y divide-slate-700">
                    {entriesByCrew[crew.id].map((entry) => (
                      <ScheduleEntryRow key={entry.id} entry={entry} />
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm text-center py-6">
                    No entries scheduled
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {unassignedEntries.length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-lg font-semibold text-slate-400">
                  Unassigned
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-700">
                  {unassignedEntries.map((entry) => (
                    <ScheduleEntryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AddEntryDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        defaultCrewId={selectedCrewId}
        defaultDate={dateStr}
      />
    </div>
  );
}
