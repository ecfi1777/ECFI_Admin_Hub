import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Check, Search, X, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { useBuilders, useLocations } from "@/hooks/useReferenceData";
import { ExtrasTable } from "@/components/extras/ExtrasTable";
import { ExtraEntryDialog } from "@/components/extras/ExtraEntryDialog";
import { ExtraFormValues, InvoiceExtra } from "@/components/extras/types";

export default function ExtrasToInvoice() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterBuilder, setFilterBuilder] = useState("all");
  const [completedPage, setCompletedPage] = useState(1);
  const [completedPageSize, setCompletedPageSize] = useState<"50" | "100" | "all">("100");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceExtra | null>(null);
  const [pendingDelete, setPendingDelete] = useState<InvoiceExtra | null>(null);

  useEffect(() => {
    setCompletedPage(1);
  }, [searchQuery, filterBuilder, completedPageSize]);

  const { data: extras = [], isLoading } = useQuery({
    queryKey: ["invoice-extras", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("invoice_extras")
        .select("*")
        .eq("organization_id", organizationId)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as InvoiceExtra[];
    },
    enabled: !!organizationId,
  });

  const { data: builders = [] } = useBuilders();
  const { data: locations = [] } = useLocations();

  const builderSuggestions = useMemo(
    () =>
      Array.from(
        new Set([
          ...builders.map((b: { name: string }) => b.name),
          ...extras.map((e) => e.builder_name),
        ])
      ).filter(Boolean).sort(),
    [builders, extras]
  );

  const locationSuggestions = useMemo(
    () =>
      Array.from(
        new Set([
          ...locations.map((l: { name: string }) => l.name),
          ...extras.map((e) => e.location_name || ""),
        ])
      ).filter(Boolean).sort(),
    [locations, extras]
  );

  const saveMutation = useMutation({
    mutationFn: async (values: ExtraFormValues) => {
      if (!organizationId) throw new Error("No organization");
      const amount = values.amount.trim() ? Number(values.amount.trim()) : null;
      const payload = {
        organization_id: organizationId,
        entry_date: values.entry_date,
        builder_name: values.builder_name.trim(),
        location_name: values.location_name.trim() || null,
        lot_number: values.lot_number.trim() || null,
        description: values.description.trim(),
        amount,
        invoice_number: values.invoice_number.trim() || null,
      };

      if (editing) {
        const { error } = await supabase
          .from("invoice_extras")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("invoice_extras")
          .insert({ ...payload, created_by: userData.user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-extras"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success(editing ? "Extra updated" : "Extra added");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to save extra");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, complete }: { id: string; complete: boolean }) => {
      const { error } = await supabase
        .from("invoice_extras")
        .update({ invoice_complete: complete })
        .eq("id", id);
      if (error) throw error;
      return complete;
    },
    onSuccess: (complete) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-extras"] });
      toast.success(complete ? "Marked as complete" : "Moved to pending");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoice_extras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-extras"] });
      setPendingDelete(null);
      toast.success("Extra deleted");
    },
    onError: () => toast.error("Failed to delete extra"),
  });

  const fieldUpdateMutation = useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: "amount" | "invoice_number";
      value: string;
    }) => {
      let payload: Partial<InvoiceExtra> = {};
      if (field === "amount") {
        const trimmed = value.trim();
        if (trimmed && Number.isNaN(Number(trimmed))) {
          throw new Error("Amount must be a number");
        }
        payload = { amount: trimmed ? Number(trimmed) : null };
      } else {
        payload = { invoice_number: value.trim() || null };
      }
      const { error } = await supabase
        .from("invoice_extras")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-extras"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update field");
    },
  });

  const filterExtras = (rows: InvoiceExtra[]) => {
    const searchLower = searchQuery.trim().toLowerCase();
    return rows.filter((e) => {
      const matchesSearch =
        !searchLower ||
        e.builder_name.toLowerCase().includes(searchLower) ||
        (e.location_name || "").toLowerCase().includes(searchLower) ||
        (e.lot_number || "").toLowerCase().includes(searchLower) ||
        e.description.toLowerCase().includes(searchLower) ||
        (e.invoice_number || "").toLowerCase().includes(searchLower);
      const matchesBuilder = filterBuilder === "all" || e.builder_name === filterBuilder;
      return matchesSearch && matchesBuilder;
    });
  };

  const pendingExtras = useMemo(
    () => filterExtras(extras.filter((e) => !e.invoice_complete)),
    [extras, searchQuery, filterBuilder]
  );
  const completedExtras = useMemo(
    () => filterExtras(extras.filter((e) => e.invoice_complete)),
    [extras, searchQuery, filterBuilder]
  );

  const pageSizeNum =
    completedPageSize === "all" ? completedExtras.length || 1 : parseInt(completedPageSize, 10);
  const totalPages = Math.ceil(completedExtras.length / pageSizeNum) || 1;
  const safePage = Math.min(completedPage, totalPages);
  const paginatedCompleted = completedExtras.slice(
    (safePage - 1) * pageSizeNum,
    (safePage - 1) * pageSizeNum + pageSizeNum
  );

  const hasActiveFilters = !!searchQuery || filterBuilder !== "all";

  const handleExport = async (tab: "pending" | "completed", rows: InvoiceExtra[]) => {
    if (rows.length === 0) {
      toast.error("No extras to export");
      return;
    }
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(tab === "pending" ? "Pending" : "Completed");
      ws.columns = [
        { header: "Inv Complete", key: "complete", width: 14 },
        { header: "Date", key: "date", width: 14 },
        { header: "Builder / Customer", key: "builder", width: 24 },
        { header: "Location", key: "location", width: 24 },
        { header: "Lot", key: "lot", width: 12 },
        { header: "Description", key: "description", width: 44 },
        { header: "Amount", key: "amount", width: 14 },
        { header: "Invoice #", key: "invoice", width: 16 },
      ];
      ws.getRow(1).font = { bold: true };
      rows.forEach((e) => {
        ws.addRow({
          complete: e.invoice_complete ? "Yes" : "No",
          date: format(new Date(e.entry_date + "T00:00:00"), "M/d/yyyy"),
          builder: e.builder_name,
          location: e.location_name || "",
          lot: e.lot_number || "",
          description: e.description,
          amount: e.amount ?? "",
          invoice: e.invoice_number || "",
        });
      });
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `extras-to-invoice-${tab}-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export");
    }
  };

  const tableProps = {
    isLoading,
    onToggleComplete: (extra: InvoiceExtra, complete: boolean) =>
      toggleMutation.mutate({ id: extra.id, complete }),
    onEdit: (extra: InvoiceExtra) => {
      setEditing(extra);
      setDialogOpen(true);
    },
    onDelete: (extra: InvoiceExtra) => setPendingDelete(extra),
    isMutating: toggleMutation.isPending,
  };

  return (
    <AppLayout>
      <div className="p-3 md:p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Extras to Invoice</h1>
            <p className="text-muted-foreground">
              Track one-off charges that aren't tied to a scheduled job
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Extra
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative w-full md:flex-1 md:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search builder, location, lot, description, invoice #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterBuilder} onValueChange={setFilterBuilder}>
                <SelectTrigger className="w-full md:w-52">
                  <SelectValue placeholder="All Builders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Builders</SelectItem>
                  {Array.from(new Set(extras.map((e) => e.builder_name)))
                    .filter(Boolean)
                    .sort()
                    .map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterBuilder("all");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pending">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <TabsList className="bg-muted border border-border">
              <TabsTrigger
                value="pending"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
              >
                <FileText className="w-4 h-4 mr-2" />
                Pending ({pendingExtras.length})
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
              >
                <Check className="w-4 h-4 mr-2" />
                Completed ({completedExtras.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pending">
            <Card>
              <CardContent className="p-0">
                <div className="flex justify-end p-3 border-b border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("pending", pendingExtras)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export to Excel
                  </Button>
                </div>
                <ExtrasTable extras={pendingExtras} {...tableProps} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card>
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show</span>
                    <Select
                      value={completedPageSize}
                      onValueChange={(v) => setCompletedPageSize(v as "50" | "100" | "all")}
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">per page</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("completed", completedExtras)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export to Excel
                  </Button>
                </div>
                <ExtrasTable extras={paginatedCompleted} {...tableProps} />
                {completedExtras.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      Showing {paginatedCompleted.length} of {completedExtras.length} extras
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCompletedPage(Math.max(1, safePage - 1))}
                        disabled={safePage <= 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground min-w-[100px] text-center">
                        Page {safePage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCompletedPage(Math.min(totalPages, safePage + 1))}
                        disabled={safePage >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ExtraEntryDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        editing={editing}
        builderSuggestions={builderSuggestions}
        locationSuggestions={locationSuggestions}
        onSave={async (values) => saveMutation.mutateAsync(values)}
        isSaving={saveMutation.isPending}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this extra?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${pendingDelete.builder_name} — ${pendingDelete.description}" will be permanently removed.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
