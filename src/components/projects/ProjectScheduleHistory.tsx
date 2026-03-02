import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Calendar, Users, Truck, Building, ClipboardCheck, Pencil, FileText } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";

interface ScheduleEntry {
  id: string;
  scheduled_date: string;
  start_time: string | null;
  crew_yards_poured: number | null;
  crew_notes: string | null;
  ready_mix_yards_billed: number | null;
  ready_mix_invoice_number: string | null;
  ready_mix_invoice_amount: number | null;
  concrete_notes: string | null;
  pump_invoice_number: string | null;
  pump_invoice_amount: number | null;
  pump_notes: string | null;
  inspection_invoice_number: string | null;
  inspection_amount: number | null;
  inspection_notes: string | null;
  notes: string | null;
  supplier_id: string | null;
  pump_vendor_id: string | null;
  inspection_type_id: string | null;
  inspector_id: string | null;
  qty_ordered: string | null;
  order_number: string | null;
  to_be_invoiced: boolean;
  invoice_complete: boolean;
  invoice_number: string | null;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  rescheduled_to_date: string | null;
  rescheduled_from_date: string | null;
  rescheduled_from_entry_id: string | null;
  phases: { id: string; name: string } | null;
  crews: { id: string; name: string } | null;
  suppliers: { id: string; name: string; code: string | null } | null;
  pump_vendors: { id: string; name: string; code: string | null } | null;
  inspectors: { id: string; name: string } | null;
  inspection_types: { id: string; name: string } | null;
}

interface ProjectScheduleHistoryProps {
  projectId: string;
  readOnly?: boolean;
}

export function ProjectScheduleHistory({ projectId, readOnly = false }: ProjectScheduleHistoryProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [formData, setFormData] = useState({
    supplier_id: "",
    qty_ordered: "",
    order_number: "",
    ready_mix_invoice_number: "",
    ready_mix_invoice_amount: "",
    ready_mix_yards_billed: "",
    concrete_notes: "",
    pump_vendor_id: "",
    pump_invoice_number: "",
    pump_invoice_amount: "",
    pump_notes: "",
    inspection_type_id: "",
    inspector_id: "",
    inspection_invoice_number: "",
    inspection_amount: "",
    inspection_notes: "",
    // Crew tab
    crew_yards_poured: "",
    crew_notes: "",
  });

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
          crew_notes,
          ready_mix_yards_billed,
          ready_mix_invoice_number,
          ready_mix_invoice_amount,
          concrete_notes,
          pump_invoice_number,
          pump_invoice_amount,
          pump_notes,
          inspection_invoice_number,
          inspection_amount,
          inspection_notes,
          notes,
          supplier_id,
          pump_vendor_id,
          inspection_type_id,
          inspector_id,
          qty_ordered,
          order_number,
          to_be_invoiced,
          invoice_complete,
          invoice_number,
          is_cancelled,
          cancellation_reason,
          rescheduled_to_date,
          rescheduled_from_date,
          rescheduled_from_entry_id,
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

  // Fetch reference data for edit modal
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase.from("suppliers").select("id, name, code").eq("organization_id", organizationId).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: pumpVendors = [] } = useQuery({
    queryKey: ["pump-vendors-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase.from("pump_vendors").select("id, name, code").eq("organization_id", organizationId).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: inspectionTypes = [] } = useQuery({
    queryKey: ["inspection-types-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase.from("inspection_types").select("id, name").eq("organization_id", organizationId).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: inspectors = [] } = useQuery({
    queryKey: ["inspectors-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase.from("inspectors").select("id, name").eq("organization_id", organizationId).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!editingEntry) return;
      const { error } = await supabase
        .from("schedule_entries")
        .update(updates)
        .eq("id", editingEntry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-schedule-history", projectId] });
      toast.success("Entry updated");
      setEditingEntry(null);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
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

  const handleDateClick = (date: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to daily schedule with the date as a URL parameter
    navigate(`/?date=${date}`);
  };

  const handleEditClick = (entry: ScheduleEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEntry(entry);
    setFormData({
      supplier_id: entry.supplier_id || "",
      qty_ordered: entry.qty_ordered || "",
      order_number: entry.order_number || "",
      ready_mix_invoice_number: entry.ready_mix_invoice_number || "",
      ready_mix_invoice_amount: entry.ready_mix_invoice_amount?.toString() || "",
      ready_mix_yards_billed: entry.ready_mix_yards_billed?.toString() || "",
      concrete_notes: entry.concrete_notes || "",
      pump_vendor_id: entry.pump_vendor_id || "",
      pump_invoice_number: entry.pump_invoice_number || "",
      pump_invoice_amount: entry.pump_invoice_amount?.toString() || "",
      pump_notes: entry.pump_notes || "",
      inspection_type_id: entry.inspection_type_id || "",
      inspector_id: entry.inspector_id || "",
      inspection_invoice_number: entry.inspection_invoice_number || "",
      inspection_amount: entry.inspection_amount?.toString() || "",
      inspection_notes: entry.inspection_notes || "",
      crew_yards_poured: entry.crew_yards_poured?.toString() || "",
      crew_notes: entry.crew_notes || "",
    });
  };

  const handleSave = () => {
    const updates = {
      supplier_id: formData.supplier_id || null,
      qty_ordered: formData.qty_ordered || null,
      order_number: formData.order_number || null,
      ready_mix_invoice_number: formData.ready_mix_invoice_number || null,
      ready_mix_invoice_amount: formData.ready_mix_invoice_amount ? parseFloat(formData.ready_mix_invoice_amount) : null,
      ready_mix_yards_billed: formData.ready_mix_yards_billed ? parseFloat(formData.ready_mix_yards_billed) : null,
      concrete_notes: formData.concrete_notes || null,
      pump_vendor_id: formData.pump_vendor_id || null,
      pump_invoice_number: formData.pump_invoice_number || null,
      pump_invoice_amount: formData.pump_invoice_amount ? parseFloat(formData.pump_invoice_amount) : null,
      pump_notes: formData.pump_notes || null,
      inspection_type_id: formData.inspection_type_id || null,
      inspector_id: formData.inspector_id || null,
      inspection_invoice_number: formData.inspection_invoice_number || null,
      inspection_amount: formData.inspection_amount ? parseFloat(formData.inspection_amount) : null,
      inspection_notes: formData.inspection_notes || null,
      crew_yards_poured: formData.crew_yards_poured ? parseFloat(formData.crew_yards_poured) : null,
      crew_notes: formData.crew_notes || null,
    };
    updateMutation.mutate(updates);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading schedule history...
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Schedule History</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-center py-6">
          No schedule entries for this project yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Schedule History</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {sortedPhases.map((phaseName) => (
              <AccordionItem
                key={phaseName}
                value={phaseName}
                className="bg-muted rounded-lg border-0 px-4"
              >
                <AccordionTrigger className="text-foreground hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{phaseName}</span>
                    <span className="text-muted-foreground text-sm">
                      ({groupedByPhase[phaseName].length} entries)
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-3">
                    {groupedByPhase[phaseName].map((entry) => (
                      <div
                        key={entry.id}
                        className={
                          entry.is_cancelled
                            ? "bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-2"
                            : "bg-card rounded-md p-3 space-y-2"
                        }
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex flex-col gap-1">
                            <div className={`flex items-center gap-4 flex-wrap ${entry.is_cancelled ? "line-through decoration-red-500" : ""}`}>
                              <button
                                onClick={(e) => handleDateClick(entry.scheduled_date, e)}
                                className="flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors"
                              >
                                <Calendar className="w-4 h-4" />
                                <span className="font-medium underline">
                                  {format(new Date(entry.scheduled_date + "T00:00:00"), "MMM d, yyyy")}
                                </span>
                                {entry.start_time && (
                                  <span className="text-muted-foreground no-underline">
                                    @ {entry.start_time.slice(0, 5)}
                                  </span>
                                )}
                              </button>
                              {entry.crews && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Users className="w-4 h-4" />
                                  <span>{entry.crews.name}</span>
                                </div>
                              )}
                            </div>
                            {entry.is_cancelled && (
                              <div className="text-red-400 text-xs">
                                Cancelled{entry.rescheduled_to_date
                                  ? ` — moved to ${format(new Date(entry.rescheduled_to_date + "T00:00:00"), "MMM d, yyyy")}`
                                  : ""}
                                {entry.cancellation_reason && (
                                  <span className="italic text-red-400/80 ml-2">({entry.cancellation_reason})</span>
                                )}
                              </div>
                            )}
                            {!entry.is_cancelled && entry.rescheduled_from_date && (
                              <div className="text-amber-400 text-xs">
                                Rescheduled from {format(new Date(entry.rescheduled_from_date + "T00:00:00"), "MMM d, yyyy")}
                              </div>
                            )}
                          </div>
                          {!readOnly && !entry.is_cancelled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleEditClick(entry, e)}
                              className="text-muted-foreground hover:text-foreground h-7 px-2"
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>

                        {/* Vendor Details - only show if data exists */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          {/* Concrete/Ready Mix */}
                          {(entry.suppliers || entry.ready_mix_yards_billed || entry.concrete_notes) && (
                            <div className="bg-muted rounded p-2 space-y-1">
                              <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                                <Truck className="w-3 h-3" />
                                Concrete
                              </div>
                              {entry.suppliers && (
                                <div className="text-muted-foreground">
                                  {entry.suppliers.code || entry.suppliers.name}
                                </div>
                              )}
                              {entry.ready_mix_yards_billed !== null && entry.ready_mix_yards_billed > 0 && (
                                <div className="text-muted-foreground">
                                  Billed: {entry.ready_mix_yards_billed} yds
                                </div>
                              )}
                              {!readOnly && entry.ready_mix_invoice_number && (
                                <div className="text-muted-foreground">
                                  Inv: {entry.ready_mix_invoice_number}
                                </div>
                              )}
                              {!readOnly && formatCurrency(entry.ready_mix_invoice_amount) && (
                                <div className="text-green-400">
                                  {formatCurrency(entry.ready_mix_invoice_amount)}
                                </div>
                              )}
                              {entry.concrete_notes && (
                                <div className="text-muted-foreground text-xs italic border-t border-border pt-1 mt-1">
                                  {entry.concrete_notes}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Pump */}
                          {(entry.pump_vendors || entry.pump_invoice_number || entry.pump_notes) && (
                            <div className="bg-muted rounded p-2 space-y-1">
                              <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                                <Building className="w-3 h-3" />
                                Pump
                              </div>
                              {entry.pump_vendors && (
                                <div className="text-muted-foreground">
                                  {entry.pump_vendors.code || entry.pump_vendors.name}
                                </div>
                              )}
                              {!readOnly && entry.pump_invoice_number && (
                                <div className="text-muted-foreground">
                                  Inv: {entry.pump_invoice_number}
                                </div>
                              )}
                              {!readOnly && formatCurrency(entry.pump_invoice_amount) && (
                                <div className="text-green-400">
                                  {formatCurrency(entry.pump_invoice_amount)}
                                </div>
                              )}
                              {entry.pump_notes && (
                                <div className="text-muted-foreground text-xs italic border-t border-border pt-1 mt-1">
                                  {entry.pump_notes}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Inspection */}
                          {(entry.inspectors || entry.inspection_types || entry.inspection_invoice_number || entry.inspection_notes) && (
                            <div className="bg-muted rounded p-2 space-y-1">
                              <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                                <ClipboardCheck className="w-3 h-3" />
                                Inspection
                              </div>
                              {entry.inspection_types && (
                                <div className="text-muted-foreground">
                                  {entry.inspection_types.name}
                                </div>
                              )}
                              {entry.inspectors && (
                                <div className="text-muted-foreground">
                                  {entry.inspectors.name}
                                </div>
                              )}
                              {!readOnly && entry.inspection_invoice_number && (
                                <div className="text-muted-foreground">
                                  Inv: {entry.inspection_invoice_number}
                                </div>
                              )}
                              {!readOnly && formatCurrency(entry.inspection_amount) && (
                                <div className="text-green-400">
                                  {formatCurrency(entry.inspection_amount)}
                                </div>
                              )}
                              {entry.inspection_notes && (
                                <div className="text-muted-foreground text-xs italic border-t border-border pt-1 mt-1">
                                  {entry.inspection_notes}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Crew */}
                          {(entry.crew_yards_poured || entry.crew_notes) && (
                            <div className="bg-muted rounded p-2 space-y-1">
                              <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                                <Users className="w-3 h-3" />
                                Crew
                              </div>
                              {entry.crew_yards_poured !== null && entry.crew_yards_poured > 0 && (
                                <div className="text-muted-foreground">
                                  Poured: {entry.crew_yards_poured} yds
                                </div>
                              )}
                              {entry.crew_notes && (
                                <div className="text-muted-foreground text-xs italic border-t border-border pt-1 mt-1">
                                  {entry.crew_notes}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Invoicing - hidden for viewers */}
                          {!readOnly && (entry.to_be_invoiced || entry.invoice_complete || entry.invoice_number) && (
                            <div className="bg-muted rounded p-2 space-y-1">
                              <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                                <FileText className="w-3 h-3" />
                                Invoicing
                              </div>
                              {entry.invoice_number && (
                                <div className="text-muted-foreground">
                                  Inv #: {entry.invoice_number}
                                </div>
                              )}
                              <div className={entry.invoice_complete ? "text-green-400" : "text-amber-400"}>
                                {entry.invoice_complete ? "Complete" : "Pending"}
                              </div>
                            </div>
                          )}
                        </div>

                        {entry.notes && (
                          <div className="text-muted-foreground text-sm italic border-t border-border pt-2 mt-2">
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

      {/* Edit Vendor Details Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Edit Vendor Details - {editingEntry && format(new Date(editingEntry.scheduled_date + "T00:00:00"), "MMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="concrete" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted">
              <TabsTrigger value="concrete" className="data-[state=active]:bg-border">Concrete</TabsTrigger>
              <TabsTrigger value="pump" className="data-[state=active]:bg-border">Pump</TabsTrigger>
              <TabsTrigger value="inspection" className="data-[state=active]:bg-border">Inspection</TabsTrigger>
              <TabsTrigger value="crew" className="data-[state=active]:bg-border">Crew</TabsTrigger>
            </TabsList>

            <TabsContent value="concrete" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Supplier</Label>
                  <Select value={formData.supplier_id} onValueChange={(v) => updateField("supplier_id", v)}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border">
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-foreground">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Qty Ordered</Label>
                  <Input
                    value={formData.qty_ordered}
                    onChange={(e) => updateField("qty_ordered", e.target.value)}
                    placeholder="e.g. 10+ or 8+2"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Order Number</Label>
                <Input
                  value={formData.order_number}
                  onChange={(e) => updateField("order_number", e.target.value)}
                  placeholder="Order #"
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <hr className="border-border my-4" />
              <h4 className="text-sm font-medium text-muted-foreground">Ready Mix Invoice</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Invoice #</Label>
                  <Input
                    value={formData.ready_mix_invoice_number}
                    onChange={(e) => updateField("ready_mix_invoice_number", e.target.value)}
                    placeholder="Invoice #"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.ready_mix_invoice_amount}
                    onChange={(e) => updateField("ready_mix_invoice_amount", e.target.value)}
                    placeholder="0.00"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Yards Billed</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.ready_mix_yards_billed}
                    onChange={(e) => updateField("ready_mix_yards_billed", e.target.value)}
                    placeholder="0"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Concrete Notes</Label>
                <Textarea
                  value={formData.concrete_notes}
                  onChange={(e) => updateField("concrete_notes", e.target.value)}
                  placeholder="Notes related to concrete/ready mix..."
                  rows={3}
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </TabsContent>

            <TabsContent value="pump" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Pump Vendor</Label>
                <Select value={formData.pump_vendor_id} onValueChange={(v) => updateField("pump_vendor_id", v)}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Select pump vendor" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    {pumpVendors.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-foreground">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Invoice #</Label>
                  <Input
                    value={formData.pump_invoice_number}
                    onChange={(e) => updateField("pump_invoice_number", e.target.value)}
                    placeholder="Invoice #"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.pump_invoice_amount}
                    onChange={(e) => updateField("pump_invoice_amount", e.target.value)}
                    placeholder="0.00"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Pump Notes</Label>
                <Textarea
                  value={formData.pump_notes}
                  onChange={(e) => updateField("pump_notes", e.target.value)}
                  placeholder="Notes related to pump vendor..."
                  rows={3}
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </TabsContent>

            <TabsContent value="inspection" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Inspection Type</Label>
                  <Select value={formData.inspection_type_id} onValueChange={(v) => updateField("inspection_type_id", v)}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border">
                      {inspectionTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-foreground">{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Inspector</Label>
                  <Select value={formData.inspector_id} onValueChange={(v) => updateField("inspector_id", v)}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder="Select inspector" />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border">
                      {inspectors.map((i) => (
                        <SelectItem key={i.id} value={i.id} className="text-foreground">{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Invoice #</Label>
                  <Input
                    value={formData.inspection_invoice_number}
                    onChange={(e) => updateField("inspection_invoice_number", e.target.value)}
                    placeholder="Invoice #"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.inspection_amount}
                    onChange={(e) => updateField("inspection_amount", e.target.value)}
                    placeholder="0.00"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Inspection Notes</Label>
                <Textarea
                  value={formData.inspection_notes}
                  onChange={(e) => updateField("inspection_notes", e.target.value)}
                  placeholder="Notes related to inspection..."
                  rows={3}
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </TabsContent>

            <TabsContent value="crew" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Crew Yards Poured</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.crew_yards_poured}
                  onChange={(e) => updateField("crew_yards_poured", e.target.value)}
                  placeholder="0"
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Crew Notes</Label>
                <Textarea
                  value={formData.crew_notes}
                  onChange={(e) => updateField("crew_notes", e.target.value)}
                  placeholder="Notes related to crew work on this entry..."
                  rows={4}
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setEditingEntry(null)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
