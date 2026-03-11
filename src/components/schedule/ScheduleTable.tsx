import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { invalidateScheduleQueries } from "@/lib/queryHelpers";
import { Trash2, CalendarIcon, MoreVertical, Pencil, CalendarX2, Undo2, ArrowRight, Copy, StickyNote, Ban, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { EditEntryDialog } from "./EditEntryDialog";
import { CancelRescheduleDialog } from "./CancelRescheduleDialog";
import { CancelDialog } from "./CancelDialog";
import { ProjectDetailsSheet } from "@/components/projects/ProjectDetailsSheet";
import {
  usePhases,
  useSuppliers,
  useStoneSuppliers,
  usePumpVendors,
  useInspectionTypes,
  useInspectors,
} from "@/hooks/useReferenceData";
import type { ScheduleEntry } from "@/types/schedule";

function SortableRow({ id, className, showGrip, children }: { id: string; className?: string; showGrip: boolean; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={className}>
      {showGrip && (
        <TableCell className="py-2 w-8 px-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
            tabIndex={-1}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        </TableCell>
      )}
      {children}
    </TableRow>
  );
}

interface ScheduleTableProps {
  entries: ScheduleEntry[];
  readOnly?: boolean;
  onRescheduled?: (newDate: string) => void;
}

export function ScheduleTable({ entries, readOnly = false, onRescheduled }: ScheduleTableProps) {
  const [editingCell, setEditingCell] = useState<{ entryId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [moveEntryId, setMoveEntryId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState<Date | undefined>(undefined);
  const [editEntry, setEditEntry] = useState<ScheduleEntry | null>(null);
  const [editEntryTab, setEditEntryTab] = useState<"general" | "concrete" | "pump" | "inspection" | "invoicing" | "crew">("general");
  const [cancelRescheduleEntry, setCancelRescheduleEntry] = useState<ScheduleEntry | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isProjectSheetOpen, setIsProjectSheetOpen] = useState(false);
  const [undoEntryId, setUndoEntryId] = useState<string | null>(null);
  const [copyEntry, setCopyEntry] = useState<ScheduleEntry | null>(null);
  const [copyDate, setCopyDate] = useState<Date | undefined>(undefined);
  const [cancelEntry, setCancelEntry] = useState<ScheduleEntry | null>(null);
  
  const queryClient = useQueryClient();

  // dnd-kit sensors for drag-and-drop reordering
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const reorderMutation = useMutation({
    mutationFn: async (reorderedEntries: { id: string; display_order: number }[]) => {
      const updates = reorderedEntries.map(({ id, display_order }) =>
        supabase.from("schedule_entries").update({ display_order }).eq("id", id)
      );
      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => {
      invalidateScheduleQueries(queryClient);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = entries.findIndex(e => e.id === active.id);
    const newIndex = entries.findIndex(e => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(entries, oldIndex, newIndex);
    const updates = reordered.map((entry, idx) => ({
      id: entry.id,
      display_order: idx,
    }));
    reorderMutation.mutate(updates);
  };



  // Fetch reference data for dropdowns using shared hooks
  const { data: phases = [] } = usePhases();
  const { data: suppliers = [] } = useSuppliers();
  const { data: stoneSuppliers = [] } = useStoneSuppliers();
  const { data: pumpVendors = [] } = usePumpVendors();
  const { data: inspectionTypes = [] } = useInspectionTypes();
  const { data: inspectors = [] } = useInspectors();

  // Helper to detect stone phase entries
  const isPrepSlabs = (entry: ScheduleEntry) =>
    entry.phases?.name?.toLowerCase() === "prep slabs";

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("schedule_entries")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateScheduleQueries(queryClient);
      setEditingCell(null);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
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
      invalidateScheduleQueries(queryClient);
      toast.success("Entry deleted");
      setDeleteEntryId(null);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) => {
      const { error } = await supabase
        .from("schedule_entries")
        .update({ scheduled_date: newDate })
        .eq("id", id);
      if (error) throw error;
      return newDate;
    },
    onSuccess: (newDate) => {
      invalidateScheduleQueries(queryClient);
      toast.success("Entry moved to new date");
      setMoveEntryId(null);
      setMoveDate(undefined);
      if (onRescheduled && newDate) onRescheduled(newDate);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const undoRescheduleMutation = useMutation({
    mutationFn: async (entry: ScheduleEntry) => {
      if (!entry.rescheduled_from_entry_id) throw new Error("No parent entry to restore");
      
      // 1. Un-cancel the parent entry
      const { error: restoreError } = await supabase
        .from("schedule_entries")
        .update({
          is_cancelled: false,
          cancellation_reason: null,
          rescheduled_to_date: null,
        })
        .eq("id", entry.rescheduled_from_entry_id);
      if (restoreError) throw restoreError;

      // 2. Soft-delete the current (rescheduled) entry
      const { error: deleteError } = await supabase
        .from("schedule_entries")
        .update({ deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", entry.id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      invalidateScheduleQueries(queryClient);
      toast.success("Reschedule undone — original entry restored");
      setUndoEntryId(null);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const copyMutation = useMutation({
    mutationFn: async ({ entry, newDate }: { entry: ScheduleEntry; newDate: string }) => {
      const { error } = await supabase
        .from("schedule_entries")
        .insert({
          scheduled_date: newDate,
          organization_id: entry.organization_id,
          crew_id: entry.crew_id,
          project_id: entry.project_id,
          phase_id: entry.phase_id,
          start_time: entry.start_time,
          order_status: entry.order_status,
          notes: entry.notes,
          supplier_id: entry.supplier_id,
          concrete_mix_id: entry.concrete_mix_id,
          qty_ordered: entry.qty_ordered,
          pump_vendor_id: entry.pump_vendor_id,
          inspection_type_id: entry.inspection_type_id,
          inspector_id: entry.inspector_id,
          additive_hot_water: entry.additive_hot_water,
          additive_1_percent_he: entry.additive_1_percent_he,
          additive_2_percent_he: entry.additive_2_percent_he,
          stone_supplier_id: entry.stone_supplier_id,
          stone_type_id: entry.stone_type_id,
        });
      if (error) throw error;
      return newDate;
    },
    onSuccess: (newDate) => {
      invalidateScheduleQueries(queryClient);
      toast.success(`Entry copied to ${format(new Date(newDate + "T00:00:00"), "MMM d, yyyy")}`);
      setCopyEntry(null);
      setCopyDate(undefined);
      if (onRescheduled && newDate) onRescheduled(newDate);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const startEdit = (entryId: string, field: string, currentValue: string) => {
    setEditingCell({ entryId, field });
    setEditValue(currentValue);
  };

  const saveEdit = (entryId: string, field: string) => {
    const updates: Record<string, any> = {};
    
    const numericFields = ["crew_yards_poured", "ready_mix_yards_billed", "ready_mix_invoice_amount", "pump_invoice_amount", "inspection_amount"];
    
    if (numericFields.includes(field)) {
      updates[field] = parseFloat(editValue) || 0;
    } else {
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
    if (readOnly) {
      return <span className={`px-1 py-0.5 block truncate ${className || ""}`}>{displayValue}</span>;
    }

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
    if (readOnly) {
      return <span className="px-1 py-0.5 block truncate text-sm">{displayValue}</span>;
    }
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
    if (readOnly) {
      return <span className="px-1 py-0.5 block truncate text-xs">{displayValue}</span>;
    }
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              {!readOnly && <TableHead className="text-muted-foreground w-8"></TableHead>}
              <TableHead className="text-muted-foreground w-20 text-center">Crew</TableHead>
              <TableHead className="text-muted-foreground w-[4.25rem] text-center">Builder</TableHead>
              <TableHead className="text-muted-foreground w-20">Location</TableHead>
              <TableHead className="text-muted-foreground w-14 text-center">Lot #</TableHead>
              <TableHead className="text-muted-foreground w-[4.25rem] text-center">Phase</TableHead>
              <TableHead className="text-muted-foreground w-[4.25rem] text-center">Pump Co.</TableHead>
              <TableHead className="text-muted-foreground w-20 text-center">Insp. Type</TableHead>
              <TableHead className="text-muted-foreground w-20 text-center">Inspector</TableHead>
              <TableHead className="text-muted-foreground w-[4.25rem] text-center">Supplier</TableHead>
              <TableHead className="text-muted-foreground w-14 text-center">Qty Ord</TableHead>
              {!readOnly && <TableHead className="text-muted-foreground w-14 text-center">Need to Inv.</TableHead>}
              {!readOnly && <TableHead className="text-muted-foreground w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
          <TableBody>
            {entries.map((entry) => {
              const isDidNotWork = entry.did_not_work === true;
              const isCancelled = entry.is_cancelled === true;
              const isRescheduledCopy = !!entry.rescheduled_from_entry_id && !isCancelled;

              // Cancelled ghost row
              if (isCancelled) {
                const hasRescheduleDate = !!entry.rescheduled_to_date;
                const movedToLabel = hasRescheduleDate
                  ? format(new Date(entry.rescheduled_to_date! + "T00:00:00"), "MMM d")
                  : null;
                return (
                  <SortableRow key={entry.id} id={entry.id} showGrip={!readOnly} className="border-border bg-destructive/5">
                    <TableCell className="text-xs py-2">
                      <span className="text-destructive line-through decoration-destructive truncate block">{entry.crews?.name || "-"}</span>
                    </TableCell>
                    <TableCell colSpan={readOnly ? 9 : 11} className="text-xs py-2">
                      <span className="text-destructive/80 line-through decoration-destructive">
                        {[
                          entry.projects?.builders?.code || entry.projects?.builders?.name,
                          entry.projects?.locations?.name,
                          entry.projects?.lot_number,
                        ].filter(Boolean).join(" / ")}
                      </span>
                      <span className="ml-2 text-destructive text-xs font-medium no-underline">
                        {hasRescheduleDate ? `Cancelled — moved to ${movedToLabel}` : "Cancelled"}
                      </span>
                      {entry.cancellation_reason && (
                        <span className="ml-1 text-muted-foreground text-xs no-underline">
                          ({entry.cancellation_reason})
                        </span>
                      )}
                    </TableCell>
                  </SortableRow>
                );
              }

              if (isDidNotWork) {
                return (
                  <SortableRow key={entry.id} id={entry.id} showGrip={!readOnly} className="border-border hover:bg-muted/50 bg-destructive/5 opacity-70">
                    <TableCell className="text-foreground text-xs py-2">
                      <span className="truncate block">{entry.crews?.name || "-"}</span>
                    </TableCell>
                    <TableCell colSpan={readOnly ? 9 : 11} className="text-xs py-2 text-destructive italic">
                      <span className="line-through">Did not work</span>
                      {entry.not_working_reason && (
                        <span className="ml-2 no-underline">— {entry.not_working_reason}</span>
                      )}
                      {!readOnly && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 ml-2 text-muted-foreground hover:text-foreground"
                          title="Edit entry"
                          onClick={() => {
                            setEditEntry(entry);
                            setEditEntryTab("general");
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </SortableRow>
                );
              }

              // No-project crew note row
              if (!entry.project_id && !isDidNotWork) {
                return (
                  <SortableRow key={entry.id} id={entry.id} showGrip={!readOnly} className="border-border hover:bg-muted/50">
                    <TableCell className="text-foreground text-xs py-2">
                      <span className="truncate block">{entry.crews?.name || "-"}</span>
                    </TableCell>
                    <TableCell colSpan={readOnly ? 9 : 10} className="text-xs py-2">
                      <div className="flex items-start gap-2 bg-muted/30 border-l-2 border-accent rounded-r px-3 py-1.5 max-w-md">
                        <StickyNote className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground italic">
                          {entry.notes || entry.crew_notes || "No notes"}
                        </span>
                      </div>
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="py-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit entry"
                          onClick={() => {
                            setEditEntry(entry);
                            setEditEntryTab("general");
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete note"
                          onClick={() => {
                            if (window.confirm("Delete this note entry?")) {
                              supabase
                                .from("schedule_entries")
                                .delete()
                                .eq("id", entry.id)
                                .then(({ error }) => {
                                  if (error) {
                                    toast.error("Failed to delete note");
                                  } else {
                                    queryClient.invalidateQueries({ queryKey: ["schedule-entries"] });
                                    toast.success("Note deleted");
                                  }
                                });
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </SortableRow>
                );
              }

              // Normal row (active entry)
              return (
                <SortableRow key={entry.id} id={entry.id} showGrip={!readOnly} className="border-border hover:bg-muted/50">
                  <TableCell className="text-foreground text-xs py-2 text-center">
                    {readOnly ? (
                      <span className="truncate block">{entry.crews?.name || "-"}</span>
                    ) : (
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
                    )}
                  </TableCell>
                  <TableCell className="text-foreground text-xs py-2 text-center">
                    <button
                      onClick={() => {
                        if (entry.project_id) {
                          setSelectedProjectId(entry.project_id);
                          setIsProjectSheetOpen(true);
                        }
                      }}
                      className={`text-center ${entry.project_id ? "hover:underline hover:text-primary cursor-pointer" : ""}`}
                      disabled={!entry.project_id}
                    >
                      {entry.projects?.builders?.code || entry.projects?.builders?.name || "-"}
                    </button>
                  </TableCell>
                  <TableCell className="text-foreground text-xs py-2">
                    <button
                      onClick={() => {
                        if (entry.project_id) {
                          setSelectedProjectId(entry.project_id);
                          setIsProjectSheetOpen(true);
                        }
                      }}
                      className={`truncate block max-w-20 text-left ${entry.project_id ? "hover:underline hover:text-primary cursor-pointer" : ""}`}
                      disabled={!entry.project_id}
                    >
                      {entry.projects?.locations?.name || "-"}
                    </button>
                  </TableCell>
                  <TableCell className="text-xs py-2 text-center">
                    <button
                      onClick={() => {
                        if (entry.project_id) {
                          setSelectedProjectId(entry.project_id);
                          setIsProjectSheetOpen(true);
                        }
                      }}
                      className={`text-center text-primary font-medium ${entry.project_id ? "hover:underline cursor-pointer" : ""}`}
                      disabled={!entry.project_id}
                    >
                      {entry.projects?.lot_number || "-"}
                    </button>
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    {renderSelectCell(
                      entry,
                      "phase_id",
                      entry.phase_id,
                      phases,
                      entry.phases?.name || "-"
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    {renderSelectCellWithQuickEdit(
                      entry,
                      "pump_vendor_id",
                      entry.pump_vendor_id,
                      pumpVendors,
                      entry.pump_vendors?.code || entry.pump_vendors?.name || "-",
                      "pump"
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    {renderSelectCellWithQuickEdit(
                      entry,
                      "inspection_type_id",
                      entry.inspection_type_id,
                      inspectionTypes,
                      entry.inspection_types?.name || "-",
                      "inspection"
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    {renderSelectCellWithQuickEdit(
                      entry,
                      "inspector_id",
                      entry.inspector_id,
                      inspectors,
                      entry.inspectors?.name || "-",
                      "inspection"
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    {isPrepSlabs(entry)
                      ? renderSelectCellWithQuickEdit(
                          entry,
                          "stone_supplier_id",
                          entry.stone_supplier_id,
                          stoneSuppliers,
                          entry.stone_suppliers?.code || entry.stone_suppliers?.name || "-",
                          "concrete"
                        )
                      : renderSelectCellWithQuickEdit(
                          entry,
                          "supplier_id",
                          entry.supplier_id,
                          suppliers,
                          entry.suppliers?.code || entry.suppliers?.name || "-",
                          "concrete"
                        )}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    {renderEditableCell(
                      entry,
                      "qty_ordered",
                      entry.qty_ordered || "-"
                    )}
                  </TableCell>
                  {!readOnly && (
                    <TableCell className="py-2 text-center">
                      <Checkbox
                        checked={entry.to_be_invoiced}
                        onCheckedChange={() => handleCheckboxChange(entry.id, entry.to_be_invoiced)}
                        className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </TableCell>
                  )}
                  {!readOnly && (
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit full details"
                          onPointerDown={(e) => e.stopPropagation()}
                          onTouchEnd={(e) => {
                            e.stopPropagation();
                            setEditEntry(entry);
                            setEditEntryTab("general");
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditEntry(entry);
                            setEditEntryTab("general");
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Schedule actions"
                            >
                              <CalendarIcon className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoveEntryId(entry.id);
                                setMoveDate(undefined);
                              }}
                              className="text-foreground"
                            >
                              <ArrowRight className="w-4 h-4 mr-2" />
                              Move to Another Day
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setCancelRescheduleEntry(entry);
                              }}
                              className="text-foreground"
                            >
                              <CalendarX2 className="w-4 h-4 mr-2" />
                              Cancel &amp; Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setCopyEntry(entry);
                                setCopyDate(undefined);
                              }}
                              className="text-foreground"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy to Another Day
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setCancelEntry(entry);
                              }}
                              className="text-destructive"
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Cancel Job
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {isRescheduledCopy && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setUndoEntryId(entry.id);
                            }}
                            className="h-7 w-7 text-amber-500 hover:text-amber-400"
                            title="Undo Reschedule"
                          >
                            <Undo2 className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteEntryId(entry.id);
                          }}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </SortableRow>
              );
            })}
          </TableBody>
          </SortableContext>
        </Table>
      </div>
      </DndContext>

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

      {/* Undo Reschedule Confirmation Dialog */}
      <AlertDialog open={!!undoEntryId} onOpenChange={() => setUndoEntryId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Undo Reschedule?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will delete this rescheduled entry and restore the original entry on its previous date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted text-foreground border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const entry = entries.find(e => e.id === undoEntryId);
                if (entry) undoRescheduleMutation.mutate(entry);
              }}
              className="bg-amber-500 text-black hover:bg-amber-600"
            >
              Undo Reschedule
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

      {/* Cancel & Reschedule Dialog */}
      <CancelRescheduleDialog
        entry={cancelRescheduleEntry}
        open={!!cancelRescheduleEntry}
        onOpenChange={(open) => !open && setCancelRescheduleEntry(null)}
        onRescheduled={onRescheduled}
      />

      {/* Cancel Job Dialog */}
      <CancelDialog
        entry={cancelEntry}
        open={!!cancelEntry}
        onOpenChange={(open) => !open && setCancelEntry(null)}
      />

      {/* Move to Another Day Dialog */}
      {(() => {
        const moveEntry = entries.find(e => e.id === moveEntryId);
        const moveCurrentDate = moveEntry?.scheduled_date
          ? new Date(moveEntry.scheduled_date + "T12:00:00")
          : null;
        return (
          <Dialog open={!!moveEntryId} onOpenChange={(open) => { if (!open) { setMoveEntryId(null); setMoveDate(undefined); } }}>
            <DialogContent className="bg-card border-border sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Move to Another Day</DialogTitle>
              </DialogHeader>
              {moveCurrentDate && (
                <p className="text-xs text-muted-foreground">
                  Currently scheduled:{" "}
                  <span className="font-semibold text-foreground">
                    {format(moveCurrentDate, "EEEE, MMMM d, yyyy")}
                  </span>
                </p>
              )}
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={moveDate}
                  onSelect={setMoveDate}
                  initialFocus
                  className="pointer-events-auto"
                  modifiers={{
                    currentDate: moveCurrentDate ? [moveCurrentDate] : []
                  }}
                  modifiersClassNames={{
                    currentDate: "border-b-2 border-primary font-semibold text-primary"
                  }}
                  disabled={(date) => {
                    if (!moveCurrentDate) return false;
                    return (
                      date.getFullYear() === moveCurrentDate.getFullYear() &&
                      date.getMonth() === moveCurrentDate.getMonth() &&
                      date.getDate() === moveCurrentDate.getDate()
                    );
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setMoveEntryId(null); setMoveDate(undefined); }}>
                  Cancel
                </Button>
                <Button onClick={confirmMove} disabled={!moveDate}>
                  Move
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Copy to Another Day Dialog */}
      {(() => {
        const copyCurrentDate = copyEntry?.scheduled_date
          ? new Date(copyEntry.scheduled_date + "T12:00:00")
          : null;
        return (
          <Dialog open={!!copyEntry} onOpenChange={(open) => { if (!open) { setCopyEntry(null); setCopyDate(undefined); } }}>
            <DialogContent className="bg-card border-border sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Copy to Another Day</DialogTitle>
              </DialogHeader>
              {copyCurrentDate && (
                <p className="text-xs text-muted-foreground">
                  Currently scheduled:{" "}
                  <span className="font-semibold text-foreground">
                    {format(copyCurrentDate, "EEEE, MMMM d, yyyy")}
                  </span>
                </p>
              )}
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={copyDate}
                  onSelect={setCopyDate}
                  initialFocus
                  className="pointer-events-auto"
                  modifiers={{
                    currentDate: copyCurrentDate ? [copyCurrentDate] : []
                  }}
                  modifiersClassNames={{
                    currentDate: "border-b-2 border-primary font-semibold text-primary"
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setCopyEntry(null); setCopyDate(undefined); }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (copyEntry && copyDate) {
                      copyMutation.mutate({ entry: copyEntry, newDate: format(copyDate, "yyyy-MM-dd") });
                    }
                  }}
                  disabled={!copyDate || copyMutation.isPending}
                >
                  {copyMutation.isPending ? "Copying..." : "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Project Details Sheet */}
      <ProjectDetailsSheet
        projectId={selectedProjectId}
        isOpen={isProjectSheetOpen}
        onClose={() => {
          setIsProjectSheetOpen(false);
          setSelectedProjectId(null);
        }}
      />
    </>
  );
}
