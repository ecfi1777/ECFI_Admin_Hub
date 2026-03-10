import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Plus, Trash2, CalendarIcon, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";

interface ProjectLaborTabProps {
  projectId: string | null;
  readOnly?: boolean;
}

interface LaborEntry {
  id: string;
  entry_date: string;
  pl_section: string;
  entry_mode: string;
  total_hours: number | null;
  total_rate: number | null;
  total_cost: number | null;
  crew_id: string | null;
  notes: string | null;
  crews: { name: string } | null;
  project_labor_employees?: LaborEmployee[];
}

interface LaborEmployee {
  id: string;
  employee_name: string;
  hours: number;
  hourly_rate: number;
  line_cost: number | null;
}

interface CrewEmployee {
  id: string;
  name: string;
  hourly_rate: number | null;
  is_active: boolean;
}

// Format helpers
const fmtCurrency = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00";

const PL_LABELS: Record<string, string> = {
  footings_walls: "Footings & Walls",
  slab: "Slab",
};

export function ProjectLaborTab({ projectId, readOnly = false }: ProjectLaborTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["project-labor", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_labor_entries")
        .select(`
          id, entry_date, pl_section, entry_mode, total_hours, total_rate, total_cost,
          crew_id, notes,
          crews(name)
        `)
        .eq("project_id", projectId)
        .order("entry_date", { ascending: false });
      if (error) throw error;

      // Fetch employees for by_employee entries
      const byEmpIds = (data || []).filter((e: any) => e.entry_mode === "by_employee").map((e: any) => e.id);
      let empMap: Record<string, LaborEmployee[]> = {};
      if (byEmpIds.length > 0) {
        const { data: empData } = await supabase
          .from("project_labor_employees")
          .select("id, employee_name, hours, hourly_rate, line_cost, labor_entry_id")
          .in("labor_entry_id", byEmpIds);
        if (empData) {
          for (const e of empData as any[]) {
            if (!empMap[e.labor_entry_id]) empMap[e.labor_entry_id] = [];
            empMap[e.labor_entry_id].push(e);
          }
        }
      }

      return (data || []).map((e: any) => ({
        ...e,
        project_labor_employees: empMap[e.id] || [],
      })) as LaborEntry[];
    },
    enabled: !!projectId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_labor_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-labor", projectId] });
      toast.success("Labor entry deleted");
      setDeleteConfirmOpen(false);
      setEntryToDelete(null);
    },
    onError: (e: Error) => toast.error(getUserFriendlyError(e)),
  });

  // Group by pl_section
  const fwEntries = entries.filter((e) => e.pl_section === "footings_walls");
  const slabEntries = entries.filter((e) => e.pl_section === "slab");

  const calcCost = (entry: LaborEntry) => {
    if (entry.entry_mode === "by_employee" && entry.project_labor_employees?.length) {
      return entry.project_labor_employees.reduce((sum, e) => sum + (e.line_cost ?? e.hours * e.hourly_rate), 0);
    }
    return entry.total_cost ?? 0;
  };

  const calcHours = (entry: LaborEntry) => {
    if (entry.entry_mode === "by_employee" && entry.project_labor_employees?.length) {
      return entry.project_labor_employees.reduce((sum, e) => sum + e.hours, 0);
    }
    return entry.total_hours ?? 0;
  };

  const fwTotal = fwEntries.reduce((s, e) => s + calcCost(e), 0);
  const slabTotal = slabEntries.reduce((s, e) => s + calcCost(e), 0);
  const grandTotal = fwTotal + slabTotal;

  const renderGroup = (label: string, items: LaborEntry[], subtotal: number) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{label}</h4>
        <div className="space-y-1">
          {items.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded text-sm">
              <span className="w-24 text-muted-foreground">{format(parseISO(entry.entry_date), "MM/dd/yyyy")}</span>
              <span className="w-24 text-foreground">{entry.crews?.name || "—"}</span>
              <span className="w-24 text-muted-foreground text-xs">
                {entry.entry_mode === "by_employee" ? "By Employee" : "Crew Total"}
              </span>
              <span className="w-16 text-right text-foreground">{calcHours(entry).toFixed(1)}h</span>
              <span className="flex-1 text-right font-medium text-foreground">{fmtCurrency(calcCost(entry))}</span>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setEntryToDelete(entry.id);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end px-3 py-1 text-sm font-medium text-foreground border-t border-border mt-1">
          Subtotal: {fmtCurrency(subtotal)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Labor Entry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground text-center py-6">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-muted-foreground text-center py-6">No labor entries yet.</div>
      ) : (
        <>
          {renderGroup("Footings & Walls", fwEntries, fwTotal)}
          {renderGroup("Slab", slabEntries, slabTotal)}
          <div className="flex justify-end px-3 py-2 text-sm font-bold text-foreground border-t-2 border-border">
            Grand Total: {fmtCurrency(grandTotal)}
          </div>
        </>
      )}

      {projectId && (
        <AddLaborDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          projectId={projectId}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["project-labor", projectId] })}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Labor Entry"
        description="Are you sure you want to delete this labor entry? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (entryToDelete) deleteMutation.mutate(entryToDelete);
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Add Labor Dialog ───────────────────────────────────────

interface EmployeeRow {
  key: string;
  crew_employee_id: string | null;
  employee_name: string;
  hours: number;
  hourly_rate: number;
}

function AddLaborDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}) {
  const { organizationId } = useOrganization();
  const [date, setDate] = useState<Date>(new Date());
  const [plSection, setPlSection] = useState<string>("footings_walls");
  const [crewId, setCrewId] = useState<string>("");
  const [entryMode, setEntryMode] = useState<string>("crew_total");
  const [totalHours, setTotalHours] = useState("");
  const [totalRate, setTotalRate] = useState("");
  const [empRows, setEmpRows] = useState<EmployeeRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [rateWasAutoFilled, setRateWasAutoFilled] = useState(false);

  // Fetch active crews
  const { data: crews = [] } = useQuery({
    queryKey: ["crews-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("crews")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && open,
  });

  // Fetch crew members for selected crew
  const { data: crewEmployees = [] } = useQuery({
    queryKey: ["crew-members-for-labor", crewId],
    queryFn: async () => {
      if (!crewId) return [];
      const { data, error } = await supabase
        .from("crew_members")
        .select("id, name, hourly_rate, is_active")
        .eq("crew_id", crewId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as CrewEmployee[];
    },
    enabled: !!crewId && open,
  });

  // When crew changes and mode is by_employee, populate rows
  const loadEmployeeRows = () => {
    const rows: EmployeeRow[] = crewEmployees.map((emp) => ({
      key: emp.id,
      crew_employee_id: emp.id,
      employee_name: emp.name,
      hours: 0,
      hourly_rate: emp.hourly_rate ?? 0,
    }));
    setEmpRows(rows);
  };

  // Reset employee rows when crew or mode changes
  const handleCrewChange = (id: string) => {
    setCrewId(id);
    setEmpRows([]);
  };

  const handleModeChange = (mode: string) => {
    setEntryMode(mode);
    if (mode === "by_employee") {
      setEmpRows([]);
      setRateWasAutoFilled(false);
    }
  };

  // Auto-fill rate for crew_total mode
  useEffect(() => {
    if (entryMode === "crew_total" && crewEmployees.length > 0 && crewId) {
      const summedRate = crewEmployees.reduce((sum, emp) => sum + (emp.hourly_rate ?? 0), 0);
      if (summedRate > 0) {
        setTotalRate(summedRate.toFixed(2));
        setRateWasAutoFilled(true);
      }
    }
  }, [crewId, crewEmployees, entryMode]);

  // Load employee rows when crewEmployees data arrives
  const prevCrewRef = useState({ crewId: "", loaded: false });
  if (
    entryMode === "by_employee" &&
    crewEmployees.length > 0 &&
    empRows.length === 0 &&
    crewId
  ) {
    loadEmployeeRows();
  }

  const updateEmpRow = (key: string, field: keyof EmployeeRow, value: any) => {
    setEmpRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    );
  };

  const addManualRow = () => {
    setEmpRows((prev) => [
      ...prev,
      {
        key: `manual-${Date.now()}`,
        crew_employee_id: null,
        employee_name: "",
        hours: 0,
        hourly_rate: 0,
      },
    ]);
  };

  const removeRow = (key: string) => {
    setEmpRows((prev) => prev.filter((r) => r.key !== key));
  };

  const empTotalHours = empRows.reduce((s, r) => s + (r.hours || 0), 0);
  const empTotalCost = empRows.reduce((s, r) => s + (r.hours || 0) * (r.hourly_rate || 0), 0);
  const crewTotalCost = (parseFloat(totalHours) || 0) * (parseFloat(totalRate) || 0);

  const handleSave = async () => {
    if (!organizationId || !projectId) return;
    if (!crewId) {
      toast.error("Please select a crew");
      return;
    }

    setSaving(true);
    try {
      if (entryMode === "crew_total") {
        const { error } = await supabase.from("project_labor_entries").insert({
          organization_id: organizationId,
          project_id: projectId,
          crew_id: crewId,
          entry_date: format(date, "yyyy-MM-dd"),
          pl_section: plSection,
          entry_mode: "crew_total",
          total_hours: parseFloat(totalHours) || 0,
          total_rate: parseFloat(totalRate) || 0,
        } as any);
        if (error) throw error;
      } else {
        // by_employee: insert parent, then children
        const { data: parentData, error: parentError } = await supabase
          .from("project_labor_entries")
          .insert({
            organization_id: organizationId,
            project_id: projectId,
            crew_id: crewId,
            entry_date: format(date, "yyyy-MM-dd"),
            pl_section: plSection,
            entry_mode: "by_employee",
          } as any)
          .select("id")
          .single();
        if (parentError) throw parentError;

        const empInserts = empRows
          .filter((r) => r.employee_name.trim() && r.hours > 0)
          .map((r) => ({
            labor_entry_id: parentData.id,
            crew_employee_id: r.crew_employee_id,
            employee_name: r.employee_name,
            hours: r.hours,
            hourly_rate: r.hourly_rate,
          }));

        if (empInserts.length > 0) {
          const { error: empError } = await supabase
            .from("project_labor_employees")
            .insert(empInserts as any);
          if (empError) throw empError;
        }
      }

      toast.success("Labor entry saved");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (e: any) {
      toast.error(getUserFriendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDate(new Date());
    setPlSection("footings_walls");
    setCrewId("");
    setEntryMode("crew_total");
    setTotalHours("");
    setTotalRate("");
    setEmpRows([]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Labor Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date */}
          <div className="space-y-1">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* P&L Section */}
          <div className="space-y-1">
            <Label>P&L Section</Label>
            <Select value={plSection} onValueChange={setPlSection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="footings_walls">Footings & Walls</SelectItem>
                <SelectItem value="slab">Slab</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Crew */}
          <div className="space-y-1">
            <Label>Crew</Label>
            <Select value={crewId} onValueChange={handleCrewChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select crew" />
              </SelectTrigger>
              <SelectContent>
                {crews.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entry Mode */}
          <div className="space-y-1">
            <Label>Entry Mode</Label>
            <RadioGroup value={entryMode} onValueChange={handleModeChange} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="crew_total" id="crew_total" />
                <Label htmlFor="crew_total" className="font-normal cursor-pointer">Crew Total</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="by_employee" id="by_employee" />
                <Label htmlFor="by_employee" className="font-normal cursor-pointer">By Employee</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Crew Total fields */}
          {entryMode === "crew_total" && (
            <div className="space-y-3 border border-border rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Total Hours</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    value={totalHours}
                    onChange={(e) => setTotalHours(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Hourly Rate</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={totalRate}
                      onChange={(e) => {
                        setTotalRate(e.target.value);
                        setRateWasAutoFilled(false);
                      }}
                      className="pl-7"
                      placeholder="0.00"
                    />
                  </div>
                  {rateWasAutoFilled && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-filled from {crewEmployees.filter(e => e.hourly_rate != null && e.hourly_rate > 0).length} employee rates
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right text-sm font-medium text-foreground">
                Total Cost = {fmtCurrency(crewTotalCost)}
              </div>
            </div>
          )}

          {/* By Employee fields */}
          {entryMode === "by_employee" && (
            <div className="border border-border rounded-lg p-3 space-y-2">
              {empRows.length === 0 && !crewId && (
                <p className="text-sm text-muted-foreground text-center py-2">Select a crew to load employees.</p>
              )}
              {empRows.length === 0 && crewId && crewEmployees.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No active employees. Add rows manually.</p>
              )}

              {empRows.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-1">
                  <span className="flex-1">Name</span>
                  <span className="w-16 text-center">Hours</span>
                  <span className="w-20 text-center">Rate</span>
                  <span className="w-20 text-right">Cost</span>
                  <span className="w-6"></span>
                </div>
              )}

              {empRows.map((row) => {
                const lineCost = (row.hours || 0) * (row.hourly_rate || 0);
                return (
                  <div key={row.key} className="flex items-center gap-2">
                    <Input
                      value={row.employee_name}
                      onChange={(e) => updateEmpRow(row.key, "employee_name", e.target.value)}
                      className="flex-1 h-8 text-sm"
                      placeholder="Name"
                      readOnly={!!row.crew_employee_id}
                    />
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={row.hours || ""}
                      onChange={(e) => updateEmpRow(row.key, "hours", parseFloat(e.target.value) || 0)}
                      className="w-16 h-8 text-sm text-center"
                      placeholder="0"
                    />
                    <div className="relative w-20">
                      <DollarSign className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.hourly_rate || ""}
                        onChange={(e) => updateEmpRow(row.key, "hourly_rate", parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm pl-5"
                        placeholder="0"
                      />
                    </div>
                    <span className="w-20 text-right text-sm font-medium">{fmtCurrency(lineCost)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(row.key)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}

              <Button variant="ghost" size="sm" onClick={addManualRow} className="text-muted-foreground">
                <Plus className="w-3 h-3 mr-1" />
                Add row
              </Button>

              {empRows.length > 0 && (
                <div className="flex justify-end gap-4 text-sm font-medium text-foreground border-t border-border pt-2">
                  <span>Total: {empTotalHours.toFixed(1)} hrs</span>
                  <span>{fmtCurrency(empTotalCost)}</span>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Labor Entry"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
