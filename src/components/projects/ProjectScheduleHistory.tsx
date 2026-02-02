import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from "date-fns";
import { Calendar, Users, Truck, Building, ClipboardCheck } from "lucide-react";

interface ScheduleEntry {
  id: string;
  scheduled_date: string;
  start_time: string | null;
  crew_yards_poured: number | null;
  ready_mix_yards_billed: number | null;
  ready_mix_invoice_number: string | null;
  ready_mix_invoice_amount: number | null;
  pump_invoice_number: string | null;
  pump_invoice_amount: number | null;
  inspection_invoice_number: string | null;
  inspection_amount: number | null;
  notes: string | null;
  phases: { id: string; name: string } | null;
  crews: { id: string; name: string } | null;
  suppliers: { id: string; name: string; code: string | null } | null;
  pump_vendors: { id: string; name: string; code: string | null } | null;
  inspectors: { id: string; name: string } | null;
  inspection_types: { id: string; name: string } | null;
}

interface ProjectScheduleHistoryProps {
  projectId: string;
}

export function ProjectScheduleHistory({ projectId }: ProjectScheduleHistoryProps) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["project-schedule-history", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          id,
          scheduled_date,
          start_time,
          crew_yards_poured,
          ready_mix_yards_billed,
          ready_mix_invoice_number,
          ready_mix_invoice_amount,
          pump_invoice_number,
          pump_invoice_amount,
          inspection_invoice_number,
          inspection_amount,
          notes,
          phases(id, name),
          crews(id, name),
          suppliers(id, name, code),
          pump_vendors(id, name, code),
          inspectors(id, name),
          inspection_types(id, name)
        `)
        .eq("project_id", projectId)
        .eq("deleted", false)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data as ScheduleEntry[];
    },
  });

  // Group entries by phase
  const groupedByPhase = entries.reduce((acc, entry) => {
    const phaseName = entry.phases?.name || "Unassigned";
    if (!acc[phaseName]) {
      acc[phaseName] = [];
    }
    acc[phaseName].push(entry);
    return acc;
  }, {} as Record<string, ScheduleEntry[]>);

  const phaseOrder = [
    "Footings",
    "Walls",
    "Prep Footings",
    "Strip Walls",
    "Flatwork",
    "Porch",
    "Driveway",
    "Sidewalk",
  ];

  const sortedPhases = Object.keys(groupedByPhase).sort((a, b) => {
    const aIndex = phaseOrder.indexOf(a);
    const bIndex = phaseOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === 0) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 text-center text-slate-400">
          Loading schedule history...
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Schedule History</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-400 text-center py-6">
          No schedule entries for this project yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white text-lg">Schedule History</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="space-y-2">
          {sortedPhases.map((phaseName) => (
            <AccordionItem
              key={phaseName}
              value={phaseName}
              className="bg-slate-700 rounded-lg border-0 px-4"
            >
              <AccordionTrigger className="text-white hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{phaseName}</span>
                  <span className="text-slate-400 text-sm">
                    ({groupedByPhase[phaseName].length} entries)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-3">
                  {groupedByPhase[phaseName].map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-slate-800 rounded-md p-3 space-y-2"
                    >
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 text-amber-500">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">
                            {format(new Date(entry.scheduled_date), "MMM d, yyyy")}
                          </span>
                          {entry.start_time && (
                            <span className="text-slate-400">
                              @ {entry.start_time.slice(0, 5)}
                            </span>
                          )}
                        </div>
                        {entry.crews && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Users className="w-4 h-4" />
                            <span>{entry.crews.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Vendor Details - only show if data exists */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        {/* Concrete/Ready Mix */}
                        {(entry.suppliers || entry.crew_yards_poured || entry.ready_mix_yards_billed) && (
                          <div className="bg-slate-900 rounded p-2 space-y-1">
                            <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                              <Truck className="w-3 h-3" />
                              Concrete
                            </div>
                            {entry.suppliers && (
                              <div className="text-slate-300">
                                {entry.suppliers.code || entry.suppliers.name}
                              </div>
                            )}
                            {entry.crew_yards_poured !== null && entry.crew_yards_poured > 0 && (
                              <div className="text-slate-400">
                                Poured: {entry.crew_yards_poured} yds
                              </div>
                            )}
                            {entry.ready_mix_yards_billed !== null && entry.ready_mix_yards_billed > 0 && (
                              <div className="text-slate-400">
                                Billed: {entry.ready_mix_yards_billed} yds
                              </div>
                            )}
                            {entry.ready_mix_invoice_number && (
                              <div className="text-slate-400">
                                Inv: {entry.ready_mix_invoice_number}
                              </div>
                            )}
                            {formatCurrency(entry.ready_mix_invoice_amount) && (
                              <div className="text-green-400">
                                {formatCurrency(entry.ready_mix_invoice_amount)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pump */}
                        {(entry.pump_vendors || entry.pump_invoice_number) && (
                          <div className="bg-slate-900 rounded p-2 space-y-1">
                            <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                              <Building className="w-3 h-3" />
                              Pump
                            </div>
                            {entry.pump_vendors && (
                              <div className="text-slate-300">
                                {entry.pump_vendors.code || entry.pump_vendors.name}
                              </div>
                            )}
                            {entry.pump_invoice_number && (
                              <div className="text-slate-400">
                                Inv: {entry.pump_invoice_number}
                              </div>
                            )}
                            {formatCurrency(entry.pump_invoice_amount) && (
                              <div className="text-green-400">
                                {formatCurrency(entry.pump_invoice_amount)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Inspection */}
                        {(entry.inspectors || entry.inspection_types || entry.inspection_invoice_number) && (
                          <div className="bg-slate-900 rounded p-2 space-y-1">
                            <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                              <ClipboardCheck className="w-3 h-3" />
                              Inspection
                            </div>
                            {entry.inspection_types && (
                              <div className="text-slate-300">
                                {entry.inspection_types.name}
                              </div>
                            )}
                            {entry.inspectors && (
                              <div className="text-slate-400">
                                {entry.inspectors.name}
                              </div>
                            )}
                            {entry.inspection_invoice_number && (
                              <div className="text-slate-400">
                                Inv: {entry.inspection_invoice_number}
                              </div>
                            )}
                            {formatCurrency(entry.inspection_amount) && (
                              <div className="text-green-400">
                                {formatCurrency(entry.inspection_amount)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {entry.notes && (
                        <div className="text-slate-400 text-sm italic border-t border-slate-700 pt-2 mt-2">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
