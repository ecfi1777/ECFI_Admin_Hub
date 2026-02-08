import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useBuilders, useCrews, useLocations } from "@/hooks/useReferenceData";
import { EditEntryDialog } from "@/components/schedule/EditEntryDialog";
import { IncompleteEntriesSection } from "@/components/discrepancies/IncompleteEntriesSection";
import { ProjectDiscrepancyRow } from "@/components/discrepancies/ProjectDiscrepancyRow";
import { YardsSummaryCards } from "@/components/discrepancies/YardsSummaryCards";
import type { ScheduleEntry } from "@/types/schedule";

const ENTRY_SELECT = `
  id, scheduled_date, project_id, crew_id, phase_id, start_time, order_status, notes,
  supplier_id, concrete_mix_id, qty_ordered, order_number,
  ready_mix_invoice_number, ready_mix_invoice_amount, ready_mix_yards_billed,
  crew_yards_poured, crew_notes, concrete_notes,
  pump_vendor_id, pump_invoice_number, pump_invoice_amount, pump_notes,
  inspection_type_id, inspector_id, inspection_invoice_number, inspection_amount, inspection_notes,
  to_be_invoiced, invoice_complete, invoice_number,
  additive_hot_water, additive_1_percent_he, additive_2_percent_he,
  crews(name), phases(name), suppliers(name, code),
  pump_vendors(name, code), inspection_types(name), inspectors(name),
  concrete_mixes(name),
  projects(id, lot_number, builders(name, code), locations(name))
`;

export default function Discrepancies() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBuilder, setFilterBuilder] = useState("all");
  const [filterCrew, setFilterCrew] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");

  // Edit dialog
  const [editEntry, setEditEntry] = useState<ScheduleEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Reference data
  const { data: builders = [] } = useBuilders();
  const { data: crews = [] } = useCrews();
  const { data: locations = [] } = useLocations();

  // Incomplete entries: missing crew_yards_poured OR ready_mix_yards_billed
  const { data: incompleteEntries = [], isLoading: loadingIncomplete } = useQuery({
    queryKey: ["discrepancy-incomplete", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(ENTRY_SELECT)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .or("crew_yards_poured.is.null,ready_mix_yards_billed.is.null")
        // At least one of project_id or crew_id should exist to be meaningful
        .not("project_id", "is", null)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data as ScheduleEntry[];
    },
    enabled: !!organizationId,
  });

  // Complete entries: both yards fields are NOT NULL
  const { data: completeEntries = [], isLoading: loadingComplete } = useQuery({
    queryKey: ["discrepancy-complete", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(ENTRY_SELECT)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .not("crew_yards_poured", "is", null)
        .not("ready_mix_yards_billed", "is", null)
        .not("project_id", "is", null)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data as ScheduleEntry[];
    },
    enabled: !!organizationId,
  });

  const isLoading = loadingIncomplete || loadingComplete;

  // Filter helper
  const matchesFilters = (entry: ScheduleEntry) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      entry.projects?.builders?.name?.toLowerCase().includes(searchLower) ||
      entry.projects?.builders?.code?.toLowerCase().includes(searchLower) ||
      entry.projects?.locations?.name?.toLowerCase().includes(searchLower) ||
      entry.projects?.lot_number?.toLowerCase().includes(searchLower);

    const matchesBuilder =
      filterBuilder === "all" ||
      entry.projects?.builders?.code === filterBuilder ||
      entry.projects?.builders?.name === filterBuilder;

    const matchesCrew =
      filterCrew === "all" || entry.crews?.name === filterCrew;

    const matchesLocation =
      filterLocation === "all" ||
      entry.projects?.locations?.name === filterLocation;

    return matchesSearch && matchesBuilder && matchesCrew && matchesLocation;
  };

  // Filtered incomplete
  const filteredIncomplete = useMemo(
    () => incompleteEntries.filter(matchesFilters),
    [incompleteEntries, searchQuery, filterBuilder, filterCrew, filterLocation]
  );

  // Group complete entries by project
  const projectGroups = useMemo(() => {
    const filtered = completeEntries.filter(matchesFilters);
    const grouped = new Map<
      string,
      {
        projectLabel: string;
        entries: ScheduleEntry[];
        totalCrewYards: number;
        totalSupplierYards: number;
        discrepancy: number;
      }
    >();

    filtered.forEach((entry) => {
      const pid = entry.project_id || "no-project";
      if (!grouped.has(pid)) {
        const builder =
          entry.projects?.builders?.code || entry.projects?.builders?.name || "?";
        const location = entry.projects?.locations?.name || "";
        const lot = entry.projects?.lot_number || "?";
        const label = [builder, location, `Lot ${lot}`].filter(Boolean).join(" — ");
        grouped.set(pid, {
          projectLabel: label,
          entries: [],
          totalCrewYards: 0,
          totalSupplierYards: 0,
          discrepancy: 0,
        });
      }
      const group = grouped.get(pid)!;
      group.entries.push(entry);
      group.totalCrewYards += entry.crew_yards_poured || 0;
      group.totalSupplierYards += entry.ready_mix_yards_billed || 0;
    });

    // Compute discrepancy and sort
    grouped.forEach((g) => {
      g.discrepancy = g.totalCrewYards - g.totalSupplierYards;
    });

    return Array.from(grouped.values()).sort(
      (a, b) => Math.abs(b.discrepancy) - Math.abs(a.discrepancy)
    );
  }, [completeEntries, searchQuery, filterBuilder, filterCrew, filterLocation]);

  const hasActiveFilters =
    searchQuery || filterBuilder !== "all" || filterCrew !== "all" || filterLocation !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterBuilder("all");
    setFilterCrew("all");
    setFilterLocation("all");
  };

  const handleEditEntry = (entry: ScheduleEntry) => {
    setEditEntry(entry);
    setEditDialogOpen(true);
  };

  const handleEditDialogChange = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditEntry(null);
      queryClient.invalidateQueries({ queryKey: ["discrepancy-incomplete"] });
      queryClient.invalidateQueries({ queryKey: ["discrepancy-complete"] });
    }
  };

  return (
    <AppLayout>
      <div className="p-3 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Yards Discrepancies</h1>
          <p className="text-muted-foreground">
            Track differences between crew-reported and supplier-billed yards
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative w-full md:flex-1 md:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search builder, location, lot #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterBuilder} onValueChange={setFilterBuilder}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="All Builders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Builders</SelectItem>
                  {builders.map((b) => (
                    <SelectItem key={b.id} value={b.code || b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCrew} onValueChange={setFilterCrew}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="All Crews" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Crews</SelectItem>
                  {crews.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.name}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-muted-foreground text-center py-12">Loading...</div>
        ) : (
          <>
            {/* Incomplete Entries (collapsible) */}
            <IncompleteEntriesSection
              entries={filteredIncomplete}
              onEditEntry={handleEditEntry}
            />

            {/* Project Discrepancies */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                Project Discrepancies ({projectGroups.length})
              </h2>
              {projectGroups.length === 0 ? (
                <div className="text-muted-foreground text-center py-8 bg-card border border-border rounded-lg">
                  No entries with both crew and supplier yards found
                </div>
              ) : (
                <div className="space-y-2">
                  {projectGroups.map((group) => (
                    <ProjectDiscrepancyRow
                      key={group.projectLabel}
                      projectLabel={group.projectLabel}
                      entries={group.entries}
                      totalCrewYards={group.totalCrewYards}
                      totalSupplierYards={group.totalSupplierYards}
                      discrepancy={group.discrepancy}
                      onEditEntry={handleEditEntry}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Breakdowns */}
            <YardsSummaryCards entries={completeEntries} />
          </>
        )}
      </div>

      {/* Edit Entry Dialog */}
      <EditEntryDialog
        entry={editEntry}
        open={editDialogOpen}
        onOpenChange={handleEditDialogChange}
        defaultTab="crew"
      />
    </AppLayout>
  );
}
