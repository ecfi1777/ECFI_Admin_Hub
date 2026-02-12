import { useState, Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
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
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
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

function ExpandedDetail({ row, onRestored }: { row: AuditRow; onRestored: () => void }) {
  const oldData = row.old_data as Record<string, unknown> | null;
  const newData = row.new_data as Record<string, unknown> | null;
  const canRestore = (row.action === "updated" || row.action === "deleted") && oldData !== null;
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
      // Build restore payload, excluding metadata
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(oldData)) {
        if (k === "created_at" || k === "updated_at") continue;
        payload[k] = v;
      }

      if (row.action === "deleted") {
        // Try insert first, fall back to update on conflict
        const { error: insertError } = await supabase.from(tableName).upsert(payload as never);
        if (insertError) throw insertError;
      } else {
        // Update existing record
        const { error } = await supabase
          .from(tableName)
          .update(payload as never)
          .eq("id", row.record_id);
        if (error) throw error;
      }

      toast.success("Record restored successfully");
      onRestored();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Restore failed: ${message}`);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="px-4 py-3 space-y-3 bg-muted/30 border-t border-border">
      {row.action === "updated" && oldData && newData ? (
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

export function AuditLogViewer() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [restorableOnly, setRestorableOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["schedule-entries"] });
  };

  return (
    <Card>
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
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} className="p-0">
                              <ExpandedDetail row={row} onRestored={handleRestored} />
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
    </Card>
  );
}
