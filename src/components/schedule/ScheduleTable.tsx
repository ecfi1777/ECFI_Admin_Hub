import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, CalendarIcon, Pencil, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { EditEntryDialog } from "./EditEntryDialog";
import { ProjectDetailsSheet } from "@/components/projects/ProjectDetailsSheet";

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

interface ScheduleTableProps {
  entries: ScheduleEntry[];
}

export function ScheduleTable({ entries }: ScheduleTableProps) {
  const [editingCell, setEditingCell] = useState<{ entryId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [moveEntryId, setMoveEntryId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState<Date | undefined>(undefined);
  const [editEntry, setEditEntry] = useState<ScheduleEntry | null>(null);
  const [editEntryTab, setEditEntryTab] = useState<"general" | "concrete" | "pump" | "inspection" | "invoicing" | "crew">("general");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isProjectSheetOpen, setIsProjectSheetOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch reference data for dropdowns
  const { data: phases = [] } = useQuery({
    queryKey: ["phases-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("phases").select("id, name").eq("is_active", true).order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name, code").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: pumpVendors = [] } = useQuery({
    queryKey: ["pump-vendors-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pump_vendors").select("id, name, code").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: inspectionTypes = [] } = useQuery({
    queryKey: ["inspection-types-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inspection_types").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: inspectors = [] } = useQuery({
    queryKey: ["inspectors-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inspectors").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("schedule_entries")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-entries"] });
      setEditingCell(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("schedule_entries")
        .update({ deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-entries"] });
      toast({ title: "Entry deleted" });
      setDeleteEntryId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) => {
      const { error } = await supabase
        .from("schedule_entries")
        .update({ scheduled_date: newDate })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-entries"] });
      toast({ title: "Entry moved to new date" });
      setMoveEntryId(null);
      setMoveDate(undefined);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const startEdit = (entryId: string, field: string, currentValue: string) => {
    setEditingCell({ entryId, field });
    setEditValue(currentValue);
  };

  const saveEdit = (entryId: string, field: string) => {
    const updates: Record<string, any> = {};
    
    // Numeric fields that need parsing
    const numericFields = ["crew_yards_poured", "ready_mix_yards_billed", "ready_mix_invoice_amount", "pump_invoice_amount", "inspection_amount"];
    
    if (numericFields.includes(field)) {
      updates[field] = parseFloat(editValue) || 0;
    } else {
      // Text fields - store as-is (allows "10+", "8+2", etc.)
      updates[field] = editValue || null;
    }
    
    updateMutation.mutate({ id: entryId, updates });
  };

  const handleSelectChange = (entryId: string, field: string, value: string) => {
    const updates: Record<string, any> = {};
    updates[field] = value === "none" ? null : value;
    updateMutation.mutate({ id: entryId, updates });
  };

  const handleCheckboxChange = (entryId: string, currentValue: boolean) => {
    updateMutation.mutate({ 
      id: entryId, 
      updates: { to_be_invoiced: !currentValue } 
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, entryId: string, field: string) => {
    if (e.key === "Enter") {
      saveEdit(entryId, field);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const confirmMove = () => {
    if (moveEntryId && moveDate) {
      moveMutation.mutate({ 
        id: moveEntryId, 
        newDate: format(moveDate, "yyyy-MM-dd") 
      });
    }
  };

  const renderEditableCell = (
    entry: ScheduleEntry,
    field: string,
    displayValue: string,
    className?: string
  ) => {
    const isEditing = editingCell?.entryId === entry.id && editingCell?.field === field;
    
    if (isEditing) {
      return (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(entry.id, field)}
          onKeyDown={(e) => handleKeyDown(e, entry.id, field)}
          className="h-7 bg-background border-border text-foreground text-sm w-full"
          autoFocus
        />
      );
    }
    
    return (
      <span
        onClick={() => startEdit(entry.id, field, displayValue === "-" ? "" : displayValue)}
        className={`cursor-pointer hover:bg-muted px-1 py-0.5 rounded block truncate ${className || ""}`}
      >
        {displayValue}
      </span>
    );
  };

  const renderSelectCell = (
    entry: ScheduleEntry,
    field: string,
    currentId: string | null,
    options: { id: string; name: string }[],
    displayValue: string
  ) => {
    return (
      <Select
        value={currentId || "none"}
        onValueChange={(value) => handleSelectChange(entry.id, field, value)}
      >
        <SelectTrigger className="h-7 bg-background border-border text-foreground text-xs w-full">
          <SelectValue>{displayValue || "-"}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="none" className="text-muted-foreground">None</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id} className="text-foreground">{opt.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const renderSelectCellWithQuickEdit = (
    entry: ScheduleEntry,
    field: string,
    currentId: string | null,
    options: { id: string; name: string }[],
    displayValue: string,
    quickEditTab: "concrete" | "pump" | "inspection"
  ) => {
    return (
      <div className="group flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <Select
            value={currentId || "none"}
            onValueChange={(value) => handleSelectChange(entry.id, field, value)}
          >
            <SelectTrigger className="h-7 bg-background border-border text-foreground text-xs w-full">
              <SelectValue>{displayValue || "-"}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="none" className="text-muted-foreground">None</SelectItem>
              {options.map((opt) => (
                <SelectItem key={opt.id} value={opt.id} className="text-foreground">{opt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setEditEntry(entry);
            setEditEntryTab(quickEditTab);
          }}
          className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          title={`Edit ${quickEditTab} details`}
        >
          <MoreVertical className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground text-sm text-center py-6">
        No entries scheduled
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground w-24">Crew</TableHead>
              <TableHead className="text-muted-foreground w-20">Builder</TableHead>
              <TableHead className="text-muted-foreground w-24">Location</TableHead>
              <TableHead className="text-muted-foreground w-16">Lot #</TableHead>
              <TableHead className="text-muted-foreground w-20">Phase</TableHead>
              <TableHead className="text-muted-foreground w-20">Pump Co.</TableHead>
              <TableHead className="text-muted-foreground w-24">Insp. Type</TableHead>
              <TableHead className="text-muted-foreground w-24">Inspector</TableHead>
              <TableHead className="text-muted-foreground w-20">Supplier</TableHead>
              <TableHead className="text-muted-foreground w-16">Qty Ord</TableHead>
              <TableHead className="text-muted-foreground w-10 text-center">Inv</TableHead>
              <TableHead className="text-muted-foreground w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
                <TableRow key={entry.id} className="border-border hover:bg-muted/50">
                  <TableCell className="text-foreground text-sm py-2">
                    <div className="group flex items-center gap-1">
                      <span className="flex-1 truncate">
                        {entry.crews?.name || "-"}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditEntry(entry);
                          setEditEntryTab("crew");
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title="Edit crew details"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground text-sm py-2">
                    <button
                      onClick={() => {
                        if (entry.project_id) {
                          setSelectedProjectId(entry.project_id);
                          setIsProjectSheetOpen(true);
                        }
                      }}
                      className={`text-left ${entry.project_id ? "hover:underline hover:text-primary cursor-pointer" : ""}`}
                      disabled={!entry.project_id}
                    >
                      {entry.projects?.builders?.code || entry.projects?.builders?.name || "-"}
                    </button>
                  </TableCell>
                  <TableCell className="text-foreground text-sm py-2">
                    <button
                      onClick={() => {
                        if (entry.project_id) {
                          setSelectedProjectId(entry.project_id);
                          setIsProjectSheetOpen(true);
                        }
                      }}
                      className={`truncate block max-w-24 text-left ${entry.project_id ? "hover:underline hover:text-primary cursor-pointer" : ""}`}
                      disabled={!entry.project_id}
                    >
                      {entry.projects?.locations?.name || "-"}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm py-2">
                    <button
                      onClick={() => {
                        if (entry.project_id) {
                          setSelectedProjectId(entry.project_id);
                          setIsProjectSheetOpen(true);
                        }
                      }}
                      className={`text-left text-primary font-medium ${entry.project_id ? "hover:underline cursor-pointer" : ""}`}
                      disabled={!entry.project_id}
                    >
                      {entry.projects?.lot_number || "-"}
                    </button>
                  </TableCell>
                  <TableCell className="py-2">
                    {renderSelectCell(
                      entry,
                      "phase_id",
                      entry.phase_id,
                      phases,
                      entry.phases?.name || "-"
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {renderSelectCellWithQuickEdit(
                      entry,
                      "pump_vendor_id",
                      entry.pump_vendor_id,
                      pumpVendors,
                      entry.pump_vendors?.code || entry.pump_vendors?.name || "-",
                      "pump"
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {renderSelectCellWithQuickEdit(
                      entry,
                      "inspection_type_id",
                      entry.inspection_type_id,
                      inspectionTypes,
                      entry.inspection_types?.name || "-",
                      "inspection"
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {renderSelectCellWithQuickEdit(
                      entry,
                      "inspector_id",
                      entry.inspector_id,
                      inspectors,
                      entry.inspectors?.name || "-",
                      "inspection"
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {renderSelectCellWithQuickEdit(
                      entry,
                      "supplier_id",
                      entry.supplier_id,
                      suppliers,
                      entry.suppliers?.code || entry.suppliers?.name || "-",
                      "concrete"
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {renderEditableCell(
                      entry,
                      "qty_ordered",
                      entry.qty_ordered || "-"
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <Checkbox
                      checked={entry.to_be_invoiced}
                      onCheckedChange={() => handleCheckboxChange(entry.id, entry.to_be_invoiced)}
                      className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditEntry(entry);
                          setEditEntryTab("general");
                        }}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Edit full details"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Move to another date"
                          >
                            <CalendarIcon className="w-3 h-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover border-border" align="end">
                          <Calendar
                            mode="single"
                            selected={moveDate}
                            onSelect={(date) => {
                              if (date) {
                                setMoveDate(date);
                                setMoveEntryId(entry.id);
                              }
                            }}
                            initialFocus
                          />
                          {moveDate && moveEntryId === entry.id && (
                            <div className="p-2 border-t border-border flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setMoveDate(undefined); setMoveEntryId(null); }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={confirmMove}
                              >
                                Move
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteEntryId(entry.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEntryId} onOpenChange={() => setDeleteEntryId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Entry?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this schedule entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted text-foreground border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEntryId && deleteMutation.mutate(deleteEntryId)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Entry Dialog */}
      <EditEntryDialog
        entry={editEntry}
        open={!!editEntry}
        onOpenChange={(open) => !open && setEditEntry(null)}
        defaultTab={editEntryTab}
      />

      {/* Project Details Sheet */}
      <ProjectDetailsSheet
        projectId={selectedProjectId}
        isOpen={isProjectSheetOpen}
        onClose={() => {
          setIsProjectSheetOpen(false);
          setSelectedProjectId(null);
        }}
        onEdit={() => {
          // Edit button inside the sheet handles the edit flow
        }}
      />
    </>
  );
}
