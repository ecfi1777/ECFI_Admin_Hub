import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { format, addDays, subDays, parseISO, isValid } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, Calendar, FileText } from "lucide-react";
import { ScheduleTable } from "./ScheduleTable";
import { AddEntryDialog } from "./AddEntryDialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";

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
  is_active: boolean;
}

// Sort crews by display_order (set via drag-and-drop in Settings)
function sortCrews(crews: Crew[]): Crew[] {
  return [...crews].sort((a, b) => {
    // Primary sort: by display_order ascending
    return a.display_order - b.display_order;
  });
}

export function DailySchedule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
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
  const [dailyNotes, setDailyNotes] = useState("");
  const [isNotesEditing, setIsNotesEditing] = useState(false);

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
    queryKey: ["crews-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crews")
        .select("id, name, display_order, is_active");
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

  // Filter crews to show: active crews always, inactive crews only if they have entries
  const displayedCrews = sortedCrews.filter(
    (crew) => crew.is_active || entries.some((e) => e.crew_id === crew.id)
  );

  // Fetch daily notes for the selected date
  const { data: dailyNotesData } = useQuery({
    queryKey: ["daily-notes", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_notes")
        .select("*")
        .eq("note_date", dateStr)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Update local state when daily notes data changes
  useEffect(() => {
    setDailyNotes(dailyNotesData?.notes || "");
    setIsNotesEditing(false);
  }, [dailyNotesData]);

  // Mutation to save daily notes
  const saveDailyNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (dailyNotesData) {
        // Update existing
        const { error } = await supabase
          .from("daily_notes")
          .update({ notes, updated_at: new Date().toISOString() })
          .eq("id", dailyNotesData.id);
        if (error) throw error;
      } else {
        // Insert new
        if (!organizationId) throw new Error("No organization found");
        const { error } = await supabase
          .from("daily_notes")
          .insert({ organization_id: organizationId, note_date: dateStr, notes });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-notes", dateStr] });
      toast.success("Daily notes saved");
      setIsNotesEditing(false);
    },
    onError: (error) => {
      toast.error("Failed to save notes");
      console.error(error);
    },
  });

  const handleSaveNotes = () => {
    saveDailyNotesMutation.mutate(dailyNotes);
  };

  const entriesByCrew = displayedCrews.reduce((acc, crew) => {
    acc[crew.id] = entries.filter((e) => e.crew_id === crew.id);
    return acc;
  }, {} as Record<string, ScheduleEntry[]>);

  // Unassigned = no crew_id OR crew_id doesn't match any displayed crew
  const displayedCrewIds = new Set(displayedCrews.map((c) => c.id));
  const unassignedEntries = entries.filter((e) => !e.crew_id || !displayedCrewIds.has(e.crew_id));

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
          {displayedCrews.map((crew) => (
            <Card key={crew.id} className="bg-card border-border">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className={`text-lg font-semibold ${crew.is_active ? "text-amber-500" : "text-muted-foreground"}`}>
                  Crew {crew.name}{!crew.is_active && " (Inactive)"}
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

          {/* Daily Notes Section */}
          <Card className="bg-card border-border">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-lg font-semibold text-foreground">
                  Daily Notes
                </CardTitle>
              </div>
              {isNotesEditing ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDailyNotes(dailyNotesData?.notes || "");
                      setIsNotesEditing(false);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={saveDailyNotesMutation.isPending}
                    className="bg-amber-500 text-black hover:bg-amber-600"
                  >
                    {saveDailyNotesMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsNotesEditing(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {isNotesEditing ? (
                <Textarea
                  value={dailyNotes}
                  onChange={(e) => setDailyNotes(e.target.value)}
                  placeholder="Add daily notes... (weather, holidays, general info)"
                  className="min-h-[100px] bg-background"
                />
              ) : (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[40px]">
                  {dailyNotes || "No notes for this day. Click Edit to add notes."}
                </div>
              )}
            </CardContent>
          </Card>
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
