import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { format, addDays, subDays, parseISO, isValid } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import { ScheduleTable } from "./ScheduleTable";
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
  qty_ordered: string | null;
  order_number: string | null;
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
  display_order: number;
}

// Sort crews: numbers first (ascending), then alphabetical
function sortCrews(crews: Crew[]): Crew[] {
  return [...crews].sort((a, b) => {
    // First sort by display_order if set (non-zero)
    if (a.display_order !== 0 || b.display_order !== 0) {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
    }
    
    // Check if names start with numbers
    const aIsNumber = /^\d/.test(a.name);
    const bIsNumber = /^\d/.test(b.name);
    
    // Numbers come first
    if (aIsNumber && !bIsNumber) return -1;
    if (!aIsNumber && bIsNumber) return 1;
    
    // Both are numbers - sort numerically
    if (aIsNumber && bIsNumber) {
      const aNum = parseInt(a.name.match(/^\d+/)?.[0] || "0", 10);
      const bNum = parseInt(b.name.match(/^\d+/)?.[0] || "0", 10);
      return aNum - bNum;
    }
    
    // Both are text - sort alphabetically
    return a.name.localeCompare(b.name);
  });
}

export function DailySchedule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  
  // Parse date from URL or use today
  const getInitialDate = () => {
    if (dateParam) {
      const parsed = parseISO(dateParam);
      if (isValid(parsed)) {
        return parsed;
      }
    }
    return new Date();
  };
  
  const [selectedDate, setSelectedDate] = useState(getInitialDate);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);

  // Sync URL when date changes (but not on initial load from URL)
  useEffect(() => {
    const currentDateStr = format(selectedDate, "yyyy-MM-dd");
    const todayStr = format(new Date(), "yyyy-MM-dd");
    
    // If it's today, remove the date param; otherwise set it
    if (currentDateStr === todayStr) {
      if (searchParams.has("date")) {
        searchParams.delete("date");
        setSearchParams(searchParams, { replace: true });
      }
    } else {
      if (searchParams.get("date") !== currentDateStr) {
        searchParams.set("date", currentDateStr);
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [selectedDate, searchParams, setSearchParams]);

  // Update date when URL changes (e.g., from navigation)
  useEffect(() => {
    if (dateParam) {
      const parsed = parseISO(dateParam);
      if (isValid(parsed)) {
        const currentDateStr = format(selectedDate, "yyyy-MM-dd");
        if (dateParam !== currentDateStr) {
          setSelectedDate(parsed);
        }
      }
    }
  }, [dateParam]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: crews = [] } = useQuery({
    queryKey: ["crews-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crews")
        .select("id, name, display_order")
        .eq("is_active", true);
      if (error) throw error;
      return data as Crew[];
    },
  });

  const sortedCrews = sortCrews(crews);

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

  const entriesByCrew = sortedCrews.reduce((acc, crew) => {
    acc[crew.id] = entries.filter((e) => e.crew_id === crew.id);
    return acc;
  }, {} as Record<string, ScheduleEntry[]>);

  const unassignedEntries = entries.filter((e) => !e.crew_id);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Schedule</h1>
          <p className="text-muted-foreground">Manage crew assignments and pours</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 px-3">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span className="text-foreground font-medium min-w-[140px] text-center">
                {format(selectedDate, "EEE, MMM d, yyyy")}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            onClick={() => setSelectedDate(new Date())}
            variant="outline"
            className="border-border text-foreground hover:bg-muted"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Schedule Grid */}
      {isLoading ? (
        <div className="text-muted-foreground text-center py-12">Loading schedule...</div>
      ) : (
        <div className="space-y-4">
          {sortedCrews.map((crew) => (
            <Card key={crew.id} className="bg-card border-border">
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
                <ScheduleTable entries={entriesByCrew[crew.id] || []} />
              </CardContent>
            </Card>
          ))}

          {unassignedEntries.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-lg font-semibold text-muted-foreground">
                  Unassigned
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScheduleTable entries={unassignedEntries} />
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
