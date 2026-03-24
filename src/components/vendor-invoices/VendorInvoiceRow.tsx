import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableRow, TableCell } from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { VendorInvoiceRowData, VendorTypeFilter } from "./types";
import { useOrganization } from "@/hooks/useOrganization";
import { useSuppliers, useConcreteMixes } from "@/hooks/useReferenceData";
import { ProjectDetailsSheet } from "@/components/projects/ProjectDetailsSheet";

interface VendorInvoiceRowProps {
  row: VendorInvoiceRowData;
  typeFilter: VendorTypeFilter;
  isMobile: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  showCheckboxCol: boolean;
}

const TYPE_BADGE_STYLES: Record<string, string> = {
  concrete: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  stone: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  pump: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  inspection: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

// Map vendor type to the invoice number column name on schedule_entries
const INVOICE_NUMBER_FIELD: Record<string, string> = {
  concrete: "ready_mix_invoice_number",
  stone: "stone_invoice_number",
  pump: "pump_invoice_number",
  inspection: "inspection_invoice_number",
};

export function VendorInvoiceRow({
  row,
  typeFilter,
  isMobile,
  isSelected,
  onToggleSelect,
  showCheckboxCol,
}: VendorInvoiceRowProps) {
  const { entry, type } = row;
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const [invoiceNumber, setInvoiceNumber] = useState(
    type === "concrete"
      ? (entry.ready_mix_invoice_number ?? "")
      : type === "stone"
        ? (entry.stone_invoice_number ?? "")
        : type === "pump"
          ? (entry.pump_invoice_number ?? "")
          : type === "inspection"
            ? (entry.inspection_invoice_number ?? "")
            : ""
  );
  const [yards, setYards] = useState(
    type === "concrete"
      ? (entry.ready_mix_yards_billed?.toString() ?? "")
      : type === "stone"
        ? (entry.stone_tons_billed?.toString() ?? "")
        : ""
  );
  const [amount, setAmount] = useState(
    type === "concrete"
      ? (entry.ready_mix_invoice_amount?.toString() ?? "")
      : type === "stone"
        ? (entry.stone_invoice_amount?.toString() ?? "")
        : type === "pump"
          ? (entry.pump_invoice_amount?.toString() ?? "")
          : type === "inspection"
            ? (entry.inspection_amount?.toString() ?? "")
            : ""
  );

  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Concrete Details dialog state
  const [showConcreteDetails, setShowConcreteDetails] = useState(false);
  const [cdMixId, setCdMixId] = useState(entry.concrete_mix_id ?? "");
  const [cdSupplierId, setCdSupplierId] = useState(entry.supplier_id ?? "");
  const [cdQtyOrdered, setCdQtyOrdered] = useState(entry.qty_ordered ?? "");
  const [cdNotes, setCdNotes] = useState(entry.concrete_notes ?? "");
  const [cdHotWater, setCdHotWater] = useState(entry.additive_hot_water);
  const [cd1He, setCd1He] = useState(entry.additive_1_percent_he);
  const [cd2He, setCd2He] = useState(entry.additive_2_percent_he);

  // Project details sheet
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isProjectSheetOpen, setIsProjectSheetOpen] = useState(false);

  const { data: suppliers = [] } = useSuppliers();
  const { data: concreteMixes = [] } = useConcreteMixes();

  const doSave = useCallback(async () => {
    const updates: Record<string, string | number | null> = {};
    if (type === "concrete") {
      updates.ready_mix_invoice_number = invoiceNumber || null;
      updates.ready_mix_yards_billed = yards ? parseFloat(yards) : null;
      updates.ready_mix_invoice_amount = amount ? parseFloat(amount) : null;
    } else if (type === "stone") {
      updates.stone_invoice_number = invoiceNumber || null;
      updates.stone_tons_billed = yards ? parseFloat(yards) : null;
      updates.stone_invoice_amount = amount ? parseFloat(amount) : null;
    } else if (type === "pump") {
      updates.pump_invoice_number = invoiceNumber || null;
      updates.pump_invoice_amount = amount ? parseFloat(amount) : null;
    } else if (type === "inspection") {
      updates.inspection_invoice_number = invoiceNumber || null;
      updates.inspection_amount = amount ? parseFloat(amount) : null;
    }
    const { error } = await supabase
      .from("schedule_entries")
      .update(updates)
      .eq("id", entry.id);
    if (error) throw error;
  }, [type, invoiceNumber, yards, amount, entry.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmed = invoiceNumber.trim();
      if (trimmed && organizationId) {
        const field = INVOICE_NUMBER_FIELD[type];
        let query = supabase
          .from("schedule_entries")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("deleted", false)
          .neq("id", entry.id)
          .limit(1);
        query = query.filter(field, "eq", trimmed);
        const { data: duplicates, error: dupError } = await query;
        if (dupError) throw dupError;
        if (duplicates && duplicates.length > 0) {
          throw { __duplicate: true };
        }
      }
      await doSave();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-invoice-entries"] });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} data saved`);
    },
    onError: (err: any) => {
      if (err?.__duplicate) {
        setShowDuplicateWarning(true);
        return;
      }
      toast.error("Failed to save");
    },
  });

  const forceSaveMutation = useMutation({
    mutationFn: doSave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-invoice-entries"] });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} data saved`);
    },
    onError: () => toast.error("Failed to save"),
  });

  // Concrete details save
  const concreteDetailsSaveMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, string | number | boolean | null> = {
        concrete_mix_id: cdMixId || null,
        supplier_id: cdSupplierId || null,
        qty_ordered: cdQtyOrdered || null,
        concrete_notes: cdNotes || null,
        additive_hot_water: cdHotWater,
        additive_1_percent_he: cd1He,
        additive_2_percent_he: cd2He,
      };
      const { error } = await supabase
        .from("schedule_entries")
        .update(updates)
        .eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-invoice-entries"] });
      toast.success("Concrete details saved");
      setShowConcreteDetails(false);
    },
    onError: () => toast.error("Failed to save concrete details"),
  });

  const handleSave = () => saveMutation.mutate();

  const openConcreteDetails = () => {
    // Reset form to current entry values
    setCdMixId(entry.concrete_mix_id ?? "");
    setCdSupplierId(entry.supplier_id ?? "");
    setCdQtyOrdered(entry.qty_ordered ?? "");
    setCdNotes(entry.concrete_notes ?? "");
    setCdHotWater(entry.additive_hot_water);
    setCd1He(entry.additive_1_percent_he);
    setCd2He(entry.additive_2_percent_he);
    setShowConcreteDetails(true);
  };

  // Column visibility
  const showTypeCol = typeFilter === "all";
  const showInvoiceCol = true;
  const showYardsCol =
    typeFilter === "all" || typeFilter === "concrete" || typeFilter === "stone";
  const showAmountCol = true;

  const canEditInvoice = true;
  const canEditYards = type === "concrete" || type === "stone";
  const canEditAmount = true;

  const isInspection = type === "inspection";
  const isConcrete = type === "concrete";
  const showRowCheckbox = showCheckboxCol && isInspection;

  const dateStr = format(
    new Date(entry.scheduled_date + "T00:00:00"),
    "M/d/yyyy"
  );
  const builderName =
    entry.projects?.builders?.code ||
    entry.projects?.builders?.name ||
    "-";
  const locationName = entry.projects?.locations?.name || "-";
  const lotNumber = entry.projects?.lot_number || "-";
  const phaseName = entry.phases?.name || "-";
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  const isSaving = saveMutation.isPending || forceSaveMutation.isPending;

  const duplicateDialog = (
    <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate Bill Number</AlertDialogTitle>
          <AlertDialogDescription>
            A vendor bill with invoice number "{invoiceNumber.trim()}" already exists. Do you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => forceSaveMutation.mutate()}>
            Add Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const concreteDetailsDialog = (
    <>
      <Dialog open={showConcreteDetails} onOpenChange={setShowConcreteDetails}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Concrete Details</DialogTitle>
          </DialogHeader>

          {/* Project info (read-only, clickable) */}
          <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Project: </span>
            {entry.projects?.id ? (
              <button
                className="text-primary hover:underline font-medium"
                onClick={() => {
                  setSelectedProjectId(entry.projects!.id);
                  setIsProjectSheetOpen(true);
                }}
              >
                {builderName} / {locationName} / {lotNumber}
              </button>
            ) : (
              <span>{builderName} / {locationName} / {lotNumber}</span>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select value={cdSupplierId} onValueChange={(v) => setCdSupplierId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-muted-foreground">— None —</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code ? `${s.code} — ${s.name}` : s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Concrete Mix</Label>
                <Select value={cdMixId} onValueChange={(v) => setCdMixId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mix" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-muted-foreground">— None —</SelectItem>
                    {concreteMixes.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Qty Ordered</Label>
              <Input
                value={cdQtyOrdered}
                onChange={(e) => setCdQtyOrdered(e.target.value)}
                placeholder="e.g. 10+ or 8+2"
              />
            </div>

            <div className="space-y-2">
              <Label>Additives</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`cd_hot_water_${entry.id}`}
                    checked={cdHotWater}
                    onCheckedChange={(checked) => setCdHotWater(checked === true)}
                  />
                  <label htmlFor={`cd_hot_water_${entry.id}`} className="text-sm">Hot Water</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`cd_1he_${entry.id}`}
                    checked={cd1He}
                    onCheckedChange={(checked) => setCd1He(checked === true)}
                  />
                  <label htmlFor={`cd_1he_${entry.id}`} className="text-sm">1% HE</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`cd_2he_${entry.id}`}
                    checked={cd2He}
                    onCheckedChange={(checked) => setCd2He(checked === true)}
                  />
                  <label htmlFor={`cd_2he_${entry.id}`} className="text-sm">2% HE</label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Concrete Notes</Label>
              <Textarea
                value={cdNotes}
                onChange={(e) => setCdNotes(e.target.value)}
                placeholder="Notes related to concrete..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConcreteDetails(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => concreteDetailsSaveMutation.mutate()}
              disabled={concreteDetailsSaveMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

  /* ─── Mobile card ─── */
  if (isMobile) {
    return (
      <>
        {duplicateDialog}
        {concreteDetailsDialog}
        <Card className="mb-3">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {showRowCheckbox && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(entry.id)}
                    aria-label="Select for no charge"
                  />
                )}
                <span className="text-sm font-medium text-foreground">{dateStr}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={TYPE_BADGE_STYLES[type]}>
                  {typeLabel}
                </Badge>
              </div>
            </div>
            {entry.projects?.id ? (
              <div
                className="text-sm text-primary cursor-pointer hover:underline"
                onClick={() => {
                  setSelectedProjectId(entry.projects!.id);
                  setIsProjectSheetOpen(true);
                }}
              >
                {builderName} · {locationName} · Lot {lotNumber}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {builderName} · {locationName} · Lot {lotNumber}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Phase: {phaseName} · {row.vendorName}
            </div>
            <div className="flex flex-wrap gap-2">
                {canEditInvoice && (
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Invoice #"
                    className="h-9 flex-1 min-w-[100px]"
                  />
                )}
                {canEditYards && (
                  <Input
                    type="number"
                    value={yards}
                    onChange={(e) => setYards(e.target.value)}
                    placeholder="Yards"
                    className="h-9 w-28"
                    step="0.01"
                  />
                )}
                {canEditAmount && (
                  <div className="relative flex items-center">
                    <span className="absolute left-2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-9 w-28 pl-5"
                      step="0.01"
                    />
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-9"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                {isConcrete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={openConcreteDetails}
                    className="h-9"
                    title="Concrete Details"
                  >
                    <FlaskConical className="w-4 h-4" />
                  </Button>
                )}
              </div>
          </CardContent>
        </Card>
      </>
    );
  }

  /* ─── Desktop table row ─── */
  return (
    <>
      {duplicateDialog}
      {concreteDetailsDialog}
      <TableRow>
        {showCheckboxCol && (
          <TableCell>
            {showRowCheckbox ? (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(entry.id)}
                aria-label="Select for no charge"
              />
            ) : null}
          </TableCell>
        )}
        <TableCell className="text-sm">{dateStr}</TableCell>
        <TableCell className="text-sm">
          {builderName} · {locationName} · {lotNumber}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{phaseName}</TableCell>
        {showTypeCol && (
          <TableCell>
            <Badge variant="outline" className={TYPE_BADGE_STYLES[type]}>
              {typeLabel}
            </Badge>
          </TableCell>
        )}
        <TableCell className="text-sm">
          {row.vendorName}
        </TableCell>
        {showInvoiceCol && (
          <TableCell>
            {canEditInvoice ? (
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Invoice #"
                className="h-8 w-28"
              />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        )}
        {showYardsCol && (
          <TableCell>
            {canEditYards ? (
              <Input
                type="number"
                value={yards}
                onChange={(e) => setYards(e.target.value)}
                placeholder="Yards"
                className="h-8 w-24"
                step="0.01"
              />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        )}
        {showAmountCol && (
          <TableCell>
            {canEditAmount ? (
              <div className="relative flex items-center">
                <span className="absolute left-2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-8 w-28 pl-5"
                  step="0.01"
                />
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        )}
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8"
            >
              <Save className="w-4 h-4" />
            </Button>
            {isConcrete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={openConcreteDetails}
                className="h-8"
                title="Concrete Details"
              >
                <FlaskConical className="w-4 h-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    </>
  );
}
