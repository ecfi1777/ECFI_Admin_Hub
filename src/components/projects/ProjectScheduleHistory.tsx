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
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Calendar, Users, Truck, Building, ClipboardCheck, Pencil, FileText } from "lucide-react";

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
  phases: { id: string; name: string } | null;
  crews: { id: string; name: string } | null;
  suppliers: { id: string; name: string; code: string | null } | null;
  pump_vendors: { id: string; name: string; code: string | null } | null;
  inspectors: { id: string; name: string } | null;
  inspection_types: { id: string; name: string } | null;
}

interface ProjectScheduleHistoryProps {
  projectId: string;
}

export function ProjectScheduleHistory({ projectId }: ProjectScheduleHistoryProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
      toast({ title: "Entry updated" });
      setEditingEntry(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 text-center text-slate-400">
          Loading schedule history...
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Schedule History</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-400 text-center py-6">
          No schedule entries for this project yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Schedule History</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {sortedPhases.map((phaseName) => (
              <AccordionItem
                key={phaseName}
                value={phaseName}
                className="bg-slate-700 rounded-lg border-0 px-4"
              >
                <AccordionTrigger className="text-white hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{phaseName}</span>
                    <span className="text-slate-400 text-sm">
                      ({groupedByPhase[phaseName].length} entries)
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-3">
                    {groupedByPhase[phaseName].map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-slate-800 rounded-md p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-4 flex-wrap">
                            <button
                              onClick={(e) => handleDateClick(entry.scheduled_date, e)}
                              className="flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors"
                            >
                              <Calendar className="w-4 h-4" />
                              <span className="font-medium underline">
                                {format(new Date(entry.scheduled_date + "T00:00:00"), "MMM d, yyyy")}
                              </span>
                              {entry.start_time && (
                                <span className="text-slate-400 no-underline">
                                  @ {entry.start_time.slice(0, 5)}
                                </span>
                              )}
                            </button>
                            {entry.crews && (
                              <div className="flex items-center gap-2 text-slate-300">
                                <Users className="w-4 h-4" />
                                <span>{entry.crews.name}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleEditClick(entry, e)}
                            className="text-slate-400 hover:text-white h-7 px-2"
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>

                        {/* Vendor Details - only show if data exists */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          {/* Concrete/Ready Mix */}
                          {(entry.suppliers || entry.ready_mix_yards_billed || entry.concrete_notes) && (
                            <div className="bg-slate-900 rounded p-2 space-y-1">
                              <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                                <Truck className="w-3 h-3" />
                                Concrete
                              </div>
                              {entry.suppliers && (
                                <div className="text-slate-300">
                                  {entry.suppliers.code || entry.suppliers.name}
                                </div>
                              )}
                              {entry.ready_mix_yards_billed !== null && entry.ready_mix_yards_billed > 0 && (
                                <div className="text-slate-400">
                                  Billed: {entry.ready_mix_yards_billed} yds
                                </div>
                              )}
                              {entry.ready_mix_invoice_number && (
                                <div className="text-slate-400">
                                  Inv: {entry.ready_mix_invoice_number}
                                </div>
                              )}
                              {formatCurrency(entry.ready_mix_invoice_amount) && (
                                <div className="text-green-400">
                                  {formatCurrency(entry.ready_mix_invoice_amount)}
                                </div>
                              )}
                              {entry.concrete_notes && (
                                <div className="text-slate-400 text-xs italic border-t border-slate-700 pt-1 mt-1">
                                  {entry.concrete_notes}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Pump */}
                          {(entry.pump_vendors || entry.pump_invoice_number || entry.pump_notes) && (
                            <div className="bg-slate-900 rounded p-2 space-y-1">
                              <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                                <Building className="w-3 h-3" />
                                Pump
                              </div>
                              {entry.pump_vendors && (
                                <div className="text-slate-300">
                                  {entry.pump_vendors.code || entry.pump_vendors.name}
                                </div>
                              )}
                              {entry.pump_invoice_number && (
                                <div className="text-slate-400">
                                  Inv: {entry.pump_invoice_number}
                                </div>
                              )}
                              {formatCurrency(entry.pump_invoice_amount) && (
                                <div className="text-green-400">
                                  {formatCurrency(entry.pump_invoice_amount)}
                                </div>
                              )}
                              {entry.pump_notes && (
                                <div className="text-slate-400 text-xs italic border-t border-slate-700 pt-1 mt-1">
                                  {entry.pump_notes}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Inspection */}
                          {(entry.inspectors || entry.inspection_types || entry.inspection_invoice_number || entry.inspection_notes) && (
                            <div className="bg-slate-900 rounded p-2 space-y-1">
                              <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                                <ClipboardCheck className="w-3 h-3" />
                                Inspection
                              </div>
                              {entry.inspection_types && (
                                <div className="text-slate-300">
                                  {entry.inspection_types.name}
                                </div>
                              )}
                              {entry.inspectors && (
                                <div className="text-slate-400">
                                  {entry.inspectors.name}
                                </div>
                              )}
                              {entry.inspection_invoice_number && (
                                <div className="text-slate-400">
                                  Inv: {entry.inspection_invoice_number}
                                </div>
                              )}
                              {formatCurrency(entry.inspection_amount) && (
                                <div className="text-green-400">
                                  {formatCurrency(entry.inspection_amount)}
                                </div>
                              )}
                              {entry.inspection_notes && (
                                <div className="text-slate-400 text-xs italic border-t border-slate-700 pt-1 mt-1">
                                  {entry.inspection_notes}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Crew */}
                          {(entry.crew_yards_poured || entry.crew_notes) && (
                            <div className="bg-slate-900 rounded p-2 space-y-1">
                              <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                                <Users className="w-3 h-3" />
                                Crew
                              </div>
                              {entry.crew_yards_poured !== null && entry.crew_yards_poured > 0 && (
                                <div className="text-slate-300">
                                  Poured: {entry.crew_yards_poured} yds
                                </div>
                              )}
                              {entry.crew_notes && (
                                <div className="text-slate-400 text-xs italic border-t border-slate-700 pt-1 mt-1">
                                  {entry.crew_notes}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Invoicing */}
                          {(entry.to_be_invoiced || entry.invoice_complete || entry.invoice_number) && (
                            <div className="bg-slate-900 rounded p-2 space-y-1">
                              <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                                <FileText className="w-3 h-3" />
                                Invoicing
                              </div>
                              {entry.invoice_number && (
                                <div className="text-slate-300">
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
                          <div className="text-slate-400 text-sm italic border-t border-slate-700 pt-2 mt-2">
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Edit Vendor Details - {editingEntry && format(new Date(editingEntry.scheduled_date + "T00:00:00"), "MMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="concrete" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-700">
              <TabsTrigger value="concrete" className="data-[state=active]:bg-slate-600">Concrete</TabsTrigger>
              <TabsTrigger value="pump" className="data-[state=active]:bg-slate-600">Pump</TabsTrigger>
              <TabsTrigger value="inspection" className="data-[state=active]:bg-slate-600">Inspection</TabsTrigger>
              <TabsTrigger value="crew" className="data-[state=active]:bg-slate-600">Crew</TabsTrigger>
            </TabsList>

            <TabsContent value="concrete" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Supplier</Label>
                  <Select value={formData.supplier_id} onValueChange={(v) => updateField("supplier_id", v)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-white">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Qty Ordered</Label>
                  <Input
                    value={formData.qty_ordered}
                    onChange={(e) => updateField("qty_ordered", e.target.value)}
                    placeholder="e.g. 10+ or 8+2"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Order Number</Label>
                <Input
                  value={formData.order_number}
                  onChange={(e) => updateField("order_number", e.target.value)}
                  placeholder="Order #"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <hr className="border-slate-600 my-4" />
              <h4 className="text-sm font-medium text-slate-400">Ready Mix Invoice</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Invoice #</Label>
                  <Input
                    value={formData.ready_mix_invoice_number}
                    onChange={(e) => updateField("ready_mix_invoice_number", e.target.value)}
                    placeholder="Invoice #"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.ready_mix_invoice_amount}
                    onChange={(e) => updateField("ready_mix_invoice_amount", e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Yards Billed</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.ready_mix_yards_billed}
                    onChange={(e) => updateField("ready_mix_yards_billed", e.target.value)}
                    placeholder="0"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Concrete Notes</Label>
                <Textarea
                  value={formData.concrete_notes}
                  onChange={(e) => updateField("concrete_notes", e.target.value)}
                  placeholder="Notes related to concrete/ready mix..."
                  rows={3}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </TabsContent>

            <TabsContent value="pump" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Pump Vendor</Label>
                <Select value={formData.pump_vendor_id} onValueChange={(v) => updateField("pump_vendor_id", v)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select pump vendor" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {pumpVendors.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-white">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Invoice #</Label>
                  <Input
                    value={formData.pump_invoice_number}
                    onChange={(e) => updateField("pump_invoice_number", e.target.value)}
                    placeholder="Invoice #"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.pump_invoice_amount}
                    onChange={(e) => updateField("pump_invoice_amount", e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Pump Notes</Label>
                <Textarea
                  value={formData.pump_notes}
                  onChange={(e) => updateField("pump_notes", e.target.value)}
                  placeholder="Notes related to pump vendor..."
                  rows={3}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </TabsContent>

            <TabsContent value="inspection" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Inspection Type</Label>
                  <Select value={formData.inspection_type_id} onValueChange={(v) => updateField("inspection_type_id", v)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {inspectionTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-white">{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Inspector</Label>
                  <Select value={formData.inspector_id} onValueChange={(v) => updateField("inspector_id", v)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select inspector" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {inspectors.map((i) => (
                        <SelectItem key={i.id} value={i.id} className="text-white">{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Invoice #</Label>
                  <Input
                    value={formData.inspection_invoice_number}
                    onChange={(e) => updateField("inspection_invoice_number", e.target.value)}
                    placeholder="Invoice #"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.inspection_amount}
                    onChange={(e) => updateField("inspection_amount", e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Inspection Notes</Label>
                <Textarea
                  value={formData.inspection_notes}
                  onChange={(e) => updateField("inspection_notes", e.target.value)}
                  placeholder="Notes related to inspection..."
                  rows={3}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </TabsContent>

            <TabsContent value="crew" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Crew Yards Poured</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.crew_yards_poured}
                  onChange={(e) => updateField("crew_yards_poured", e.target.value)}
                  placeholder="0"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Crew Notes</Label>
                <Textarea
                  value={formData.crew_notes}
                  onChange={(e) => updateField("crew_notes", e.target.value)}
                  placeholder="Notes related to crew work on this entry..."
                  rows={4}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setEditingEntry(null)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
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