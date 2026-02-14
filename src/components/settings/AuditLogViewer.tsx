import { useState, Fragment, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { invalidateProjectQueries, invalidateScheduleQueries } from "@/lib/queryHelpers";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RotateCcw,
  History, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 25;

const TABLE_LABELS: Record<string, string> = {
  projects: "Projects",
  schedule_entries: "Schedule Entries",
};

const ACTION_STYLES: Record<string, string> = {
  created: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  updated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  deleted: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  restored: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const HIDDEN_FIELDS = new Set(["id", "organization_id", "created_at", "updated_at", "created_by"]);

const FIELD_LABELS: Record<string, string> = {
  lot_number: "Lot Number",
  full_address: "Full Address",
  permit_number: "Permit Number",
  authorization_numbers: "Authorization Numbers",
  wall_height: "Wall Height",
  basement_type: "Basement Type",
  google_drive_url: "Google Drive URL",
  notes: "Notes",
  status_id: "Status",
  location_id: "Location",
  builder_id: "Builder",
  is_archived: "Archived",
  county: "County",
  status_changed_at: "Status Changed At",
  scheduled_date: "Scheduled Date",
  start_time: "Start Time",
  crew_id: "Crew",
  project_id: "Project",
  phase_id: "Phase",
  qty_ordered: "Qty Ordered",
  order_number: "Order Number",
  order_status: "Order Status",
  crew_yards_poured: "Crew Yards Poured",
  crew_notes: "Crew Notes",
  supplier_id: "Supplier",
  concrete_mix_id: "Concrete Mix",
  concrete_notes: "Concrete Notes",
  pump_vendor_id: "Pump Vendor",
  pump_notes: "Pump Notes",
  pump_invoice_number: "Pump Invoice #",
  pump_invoice_amount: "Pump Invoice Amount",
  ready_mix_invoice_number: "Ready Mix Invoice #",
  ready_mix_invoice_amount: "Ready Mix Invoice Amount",
  ready_mix_yards_billed: "Ready Mix Yards Billed",
  inspection_type_id: "Inspection Type",
  inspector_id: "Inspector",
  inspection_notes: "Inspection Notes",
  inspection_invoice_number: "Inspection Invoice #",
  inspection_amount: "Inspection Amount",
  invoice_number: "Invoice #",
  invoice_complete: "Invoice Complete",
  to_be_invoiced: "To Be Invoiced",
  deleted: "Soft Deleted",
  deleted_at: "Deleted At",
  deleted_by: "Deleted By",
  additive_1_percent_he: "Additive 1% HE",
  additive_2_percent_he: "Additive 2% HE",
  additive_hot_water: "Hot Water",
  record_label: "Record Label",
};

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    try {
      return format(new Date(val), "MMM d, yyyy h:mm a");
    } catch {
      return val;
    }
  }
  return String(val);
}

type AuditRow = {
  id: string;
  created_at: string | null;
  user_email: string;
  action: string;
  table_name: string;
  record_id: string;
  record_label: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

function getDiff(oldData: Record<string, unknown>, newData: Record<string, unknown>) {
  const changes: { field: string; oldVal: unknown; newVal: unknown }[] = [];
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  for (const key of allKeys) {
    if (HIDDEN_FIELDS.has(key)) continue;
    const ov = oldData[key] ?? null;
    const nv = newData[key] ?? null;
    if (JSON.stringify(ov) !== JSON.stringify(nv)) {
      changes.push({ field: key, oldVal: ov, newVal: nv });
    }
  }
  return changes;
}

function getVisibleFields(data: Record<string, unknown>) {
  return Object.entries(data).filter(([k]) => !HIDDEN_FIELDS.has(k));
}

function buildRestorePayload(oldData: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(oldData)) {
    if (k === "created_at" || k === "updated_at") continue;
    payload[k] = v;
  }
  return payload;
}

/* ---------- Restore audit logging helper ---------- */

async function logRestoreAction(
  tableName: string,
  recordId: string,
  recordLabel: string | null,
  organizationId: string,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
) {
  try {
    await supabase.rpc("log_restore_action", {
      p_table_name: tableName,
      p_record_id: recordId,
      p_record_label: recordLabel ?? "",
      p_organization_id: organizationId,
      p_old_data: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
      p_new_data: newData ? JSON.parse(JSON.stringify(newData)) : null,
    });
  } catch (err) {
    console.error("Failed to log restore action:", err);
  }
}

/* ---------- Per-row expanded detail ---------- */

function ExpandedDetail({ row, organizationId, onRestored }: { row: AuditRow; organizationId: string; onRestored: () => void }) {
  const oldData = row.old_data;
  const newData = row.new_data;
  const canRestore = (row.action === "updated" || row.action === "deleted" || row.action === "restored") && oldData !== null;
  const [restoring, setRestoring] = useState(false);

  if (!oldData && !newData) {
    return (
      <div className="px-4 py-3 text-sm text-muted-foreground italic">
        Snapshot data not available for this entry.
      </div>
    );
  }

  const handleRestore = async () => {
    if (!oldData) return;
    setRestoring(true);
    try {
      const tableName = row.table_name as "projects" | "schedule_entries";
      const payload = buildRestorePayload(oldData);

      if (row.action === "deleted") {
        // Try update first (handles soft-deleted records that still exist), fall back to upsert (hard-deleted)
        const { error: updateError } = await supabase.from(tableName).update(payload as never).eq("id", row.record_id);
        if (updateError) {
          const { error: upsertError } = await supabase.from(tableName).upsert(payload as never);
          if (upsertError) throw upsertError;
        }
      } else {
        const { error } = await supabase.from(tableName).update(payload as never).eq("id", row.record_id);
        if (error) throw error;
      }

      // Log the restore action in the audit trail
      await logRestoreAction(tableName, row.record_id, row.record_label, organizationId, oldData, row.new_data);

      toast.success("Record restored successfully");
      onRestored();
    } catch (err: any) {
      const message = err?.message || (typeof err === "string" ? err : "Unknown error");
      if (import.meta.env.DEV) console.error("Restore failed:", err);
      toast.error(`Restore failed: ${message}`);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="px-4 py-3 space-y-3 bg-muted/30 border-t border-border">
      {(row.action === "updated" || row.action === "restored") && oldData && newData ? (
        <>
          <p className="text-sm font-medium text-foreground">Changes</p>
          {(() => {
            const changes = getDiff(oldData, newData);
            if (!changes.length) return <p className="text-sm text-muted-foreground">No field changes detected.</p>;
            return (
              <div className="space-y-1.5">
                {changes.map((c) => (
                  <div key={c.field} className="text-sm flex flex-wrap gap-x-2 items-baseline">
                    <span className="font-medium text-foreground">{fieldLabel(c.field)}:</span>
                    <span className="line-through text-red-500 dark:text-red-400">{formatValue(c.oldVal)}</span>
                    <span className="text-green-600 dark:text-green-400">{formatValue(c.newVal)}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      ) : row.action === "created" && newData ? (
        <>
          <p className="text-sm font-medium text-foreground">Record created</p>
          <div className="space-y-1">
            {getVisibleFields(newData).map(([k, v]) => (
              <div key={k} className="text-sm">
                <span className="font-medium text-foreground">{fieldLabel(k)}:</span>{" "}
                <span className="text-muted-foreground">{formatValue(v)}</span>
              </div>
            ))}
          </div>
        </>
      ) : row.action === "deleted" && oldData ? (
        <>
          <p className="text-sm font-medium text-foreground">Record deleted</p>
          <div className="space-y-1">
            {getVisibleFields(oldData).map(([k, v]) => (
              <div key={k} className="text-sm">
                <span className="font-medium text-foreground">{fieldLabel(k)}:</span>{" "}
                <span className="text-muted-foreground">{formatValue(v)}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {canRestore && (
        <div className="flex justify-end pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={restoring}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Restore
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restore record?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to restore this {TABLE_LABELS[row.table_name] ?? row.table_name} to its state from{" "}
                  {row.created_at ? format(new Date(row.created_at), "MMM d, yyyy h:mm a") : "an earlier time"}?
                  This will overwrite the current data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestore} disabled={restoring}>
                  {restoring ? "Restoring…" : "Restore"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

/* ---------- Rollback helpers ---------- */

async function undoEntry(entry: AuditRow, organizationId: string): Promise<{ success: boolean; error?: string }> {
  const tableName = entry.table_name as "projects" | "schedule_entries";

  try {
    if (entry.action === "updated" && entry.old_data) {
      const payload = buildRestorePayload(entry.old_data);
      const { error } = await supabase.from(tableName).update(payload as never).eq("id", entry.record_id);
      if (error) throw error;
    } else if (entry.action === "deleted" && entry.old_data) {
      const payload = buildRestorePayload(entry.old_data);
      const { error } = await supabase.from(tableName).upsert(payload as never);
      if (error) throw error;
    } else if (entry.action === "created") {
      const { error } = await supabase.from(tableName).delete().eq("id", entry.record_id);
      if (error) throw error;
    }

    // Log the undo/restore action in the audit trail
    await logRestoreAction(tableName, entry.record_id, entry.record_label, organizationId, entry.old_data, entry.new_data);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/* ---------- Main component ---------- */

export function AuditLogViewer() {
  const { organizationId } = useOrganization();
  const { role } = useUserRole();
  const isOwner = role === "owner";
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [restorableOnly, setRestorableOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Rollback state
  const [rollbackTarget, setRollbackTarget] = useState<AuditRow | null>(null);
  const [rollbackEntries, setRollbackEntries] = useState<AuditRow[]>([]);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [rollbackRunning, setRollbackRunning] = useState(false);
  const [rollbackProgress, setRollbackProgress] = useState({ current: 0, total: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", organizationId, page, actionFilter, tableFilter, restorableOnly],
    queryFn: async () => {
      if (!organizationId) return { rows: [] as AuditRow[], count: 0 };

      let query = supabase
        .from("audit_log")
        .select("*", { count: "exact" })
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionFilter !== "all") query = query.eq("action", actionFilter);
      if (tableFilter !== "all") query = query.eq("table_name", tableFilter);
      if (restorableOnly) query = query.not("old_data", "is", null);

      const { data: rows, count, error } = await query;
      if (error) throw error;
      return { rows: (rows ?? []) as unknown as AuditRow[], count: count ?? 0 };
    },
    enabled: !!organizationId,
  });

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const handleRestored = () => {
    queryClient.invalidateQueries({ queryKey: ["audit-log"] });
    invalidateProjectQueries(queryClient);
    invalidateScheduleQueries(queryClient);
  };

  const handleRollbackClick = useCallback(async (targetRow: AuditRow) => {
    if (!organizationId || !targetRow.created_at) return;

    // Fetch ALL entries after this timestamp (newest first)
    const { data: entries, error } = await supabase
      .from("audit_log")
      .select("*")
      .eq("organization_id", organizationId)
      .gt("created_at", targetRow.created_at)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load rollback entries");
      return;
    }

    const allEntries = (entries ?? []) as unknown as AuditRow[];
    // Filter to only restorable entries (have old_data for update/delete, or are creates)
    const restorable = allEntries.filter(
      (e) => (e.old_data !== null) || e.action === "created"
    );

    if (!restorable.length) {
      toast.info("No restorable changes found after this point.");
      return;
    }

    setRollbackTarget(targetRow);
    setRollbackEntries(restorable);
    setRollbackDialogOpen(true);
  }, [organizationId]);

  const executeRollback = useCallback(async () => {
    setRollbackDialogOpen(false);
    setRollbackRunning(true);
    setRollbackProgress({ current: 0, total: rollbackEntries.length });

    let succeeded = 0;
    let failed = 0;
    const skipped: string[] = [];

    for (let i = 0; i < rollbackEntries.length; i++) {
      const entry = rollbackEntries[i];
      setRollbackProgress({ current: i + 1, total: rollbackEntries.length });

      // Skip entries without required data
      if (entry.action !== "created" && !entry.old_data) {
        skipped.push(entry.record_label || entry.record_id);
        continue;
      }

      const result = await undoEntry(entry, organizationId!);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
        console.error(`Rollback failed for entry ${entry.id}:`, result.error);
      }
    }

    setRollbackRunning(false);
    handleRestored();

    const ts = rollbackTarget?.created_at
      ? format(new Date(rollbackTarget.created_at), "MMM d, yyyy h:mm a")
      : "the selected point";

    if (failed === 0 && skipped.length === 0) {
      toast.success(`Successfully rolled back ${succeeded} changes to ${ts}`);
    } else {
      const parts: string[] = [`Rolled back ${succeeded} of ${succeeded + failed} changes.`];
      if (failed > 0) parts.push(`${failed} could not be undone.`);
      if (skipped.length > 0) parts.push(`${skipped.length} skipped (no snapshot data).`);
      toast.warning(parts.join(" "));
    }

    setRollbackTarget(null);
    setRollbackEntries([]);
  }, [rollbackEntries, rollbackTarget, handleRestored]);

  const hasSnapshotData = (row: AuditRow) => row.old_data !== null || row.new_data !== null;

  // Count unique records affected
  const affectedRecordCount = new Set(rollbackEntries.map((e) => e.record_id)).size;

  return (
    <Card className="relative">
      {/* Rollback progress overlay */}
      {rollbackRunning && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center space-y-3 max-w-xs">
            <History className="h-8 w-8 text-primary mx-auto animate-spin" />
            <p className="text-sm font-medium text-foreground">
              Undoing change {rollbackProgress.current} of {rollbackProgress.total}…
            </p>
            <Progress
              value={(rollbackProgress.current / rollbackProgress.total) * 100}
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">Please wait, do not navigate away.</p>
          </div>
        </div>
      )}

      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Activity Log</CardTitle>
        <div className="flex flex-wrap gap-3 pt-2 items-center">
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tableFilter} onValueChange={(v) => { setTableFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Table" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              <SelectItem value="projects">Projects</SelectItem>
              <SelectItem value="schedule_entries">Schedule Entries</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch
              id="restorable-toggle"
              checked={restorableOnly}
              onCheckedChange={(v) => { setRestorableOnly(v); setPage(0); }}
            />
            <Label htmlFor="restorable-toggle" className="text-sm cursor-pointer">
              Restorable only
            </Label>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data?.rows.length ? (
          <p className="text-muted-foreground text-center py-8">No activity found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record</TableHead>
                    {isOwner && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => {
                    const isExpanded = expandedId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                        >
                          <TableCell className="w-8 px-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {row.created_at
                              ? format(new Date(row.created_at), "MMM d, yyyy h:mm a")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm">{row.user_email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={ACTION_STYLES[row.action] ?? ""}>
                              {row.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {TABLE_LABELS[row.table_name] ?? row.table_name}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {row.record_label || row.record_id}
                          </TableCell>
                          {isOwner && (
                            <TableCell className="w-10 px-1">
                              {hasSnapshotData(row) && (
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRollbackClick(row);
                                        }}
                                        disabled={rollbackRunning}
                                      >
                                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      <p>Roll back to here</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={isOwner ? 7 : 6} className="p-0">
                              <ExpandedDetail row={row} organizationId={organizationId!} onRestored={handleRestored} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Rollback confirmation dialog */}
      <AlertDialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <AlertDialogTitle>
                Roll Back to{" "}
                {rollbackTarget?.created_at
                  ? format(new Date(rollbackTarget.created_at), "MMM d, yyyy h:mm a")
                  : "this point"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p>
                  This will undo <strong>{rollbackEntries.length}</strong> change
                  {rollbackEntries.length !== 1 ? "s" : ""} affecting{" "}
                  <strong>{affectedRecordCount}</strong> record
                  {affectedRecordCount !== 1 ? "s" : ""}, reverting them to their
                  state as of{" "}
                  {rollbackTarget?.created_at
                    ? format(new Date(rollbackTarget.created_at), "MMM d, yyyy h:mm a")
                    : "the selected time"}
                  .
                </p>
                <p className="text-xs text-muted-foreground">
                  Changes made during the rollback will be logged in the activity
                  log. This action can take a moment for large rollbacks.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeRollback}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Roll Back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
