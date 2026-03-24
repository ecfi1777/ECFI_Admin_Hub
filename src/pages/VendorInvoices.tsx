import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { useOrganization } from "@/hooks/useOrganization";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useSuppliers,
  usePumpVendors,
  useInspectors,
  
  useStoneSuppliers,
} from "@/hooks/useReferenceData";
import { VendorInvoiceFilters } from "@/components/vendor-invoices/VendorInvoiceFilters";
import { VendorInvoiceTable } from "@/components/vendor-invoices/VendorInvoiceTable";
import { Button } from "@/components/ui/button";
import { Ban, X } from "lucide-react";
import { toast } from "sonner";
import type {
  VendorEntry,
  VendorInvoiceRowData,
  VendorTypeFilter,
} from "@/components/vendor-invoices/types";

type ViewMode = "active" | "all";

export default function VendorInvoices() {
  const { organizationId } = useOrganization();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("active");

  // Filter state
  const [typeFilter, setTypeFilter] = useState<VendorTypeFilter>("all");
  const [specificVendor, setSpecificVendor] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  

  // Selection state for inspection no-charge
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset specific vendor when type changes
  useEffect(() => {
    setSpecificVendor("all");
  }, [typeFilter]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [typeFilter, specificVendor, searchQuery, dateFrom, dateTo, viewMode]);

  // Reference data
  const { data: suppliers = [] } = useSuppliers();
  const { data: pumpVendors = [] } = usePumpVendors();
  const { data: inspectors = [] } = useInspectors();
  
  const { data: stoneSuppliers = [] } = useStoneSuppliers();

  // Fetch entries that have at least one vendor/crew assigned
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["vendor-invoice-entries", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(
          `
          id, scheduled_date, project_id, crew_id, supplier_id,
          pump_vendor_id, inspector_id, phase_id, stone_supplier_id,
          ready_mix_invoice_number, ready_mix_yards_billed, ready_mix_invoice_amount,
          stone_invoice_number, stone_tons_billed, stone_invoice_amount,
          pump_invoice_number, pump_invoice_amount,
          inspection_invoice_number, inspection_amount, inspection_no_charge,
          crew_yards_poured,
          concrete_mix_id, qty_ordered, order_number, concrete_notes,
          additive_hot_water, additive_1_percent_he, additive_2_percent_he,
          projects(id, lot_number, builders(name, code), locations(name)),
          crews(name),
          suppliers(name, code),
          stone_suppliers(name, code),
          pump_vendors(name, code),
          inspectors(name),
          phases(name),
          concrete_mixes(id, name)
        `
        )
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .eq("did_not_work", false)
        .not("project_id", "is", null)
        .or(
          "supplier_id.not.is.null,pump_vendor_id.not.is.null,inspector_id.not.is.null,crew_id.not.is.null,stone_supplier_id.not.is.null"
        )
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data as VendorEntry[];
    },
    enabled: !!organizationId,
  });

  // Mark as no charge mutation
  const noChargeMutation = useMutation({
    mutationFn: async (entryIds: string[]) => {
      const { error } = await supabase
        .from("schedule_entries")
        .update({ inspection_no_charge: true })
        .in("id", entryIds);
      if (error) throw error;
    },
    onSuccess: (_, entryIds) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-invoice-entries"] });
      toast.success(`${entryIds.length} entr${entryIds.length === 1 ? "y" : "ies"} marked as No Charge`);
      setSelectedIds(new Set());
    },
    onError: () => toast.error("Failed to update"),
  });


  // Transform entries → rows
  const rows = useMemo(() => {
    let filtered = entries;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.projects?.builders?.name?.toLowerCase().includes(q) ||
          e.projects?.builders?.code?.toLowerCase().includes(q) ||
          e.projects?.locations?.name?.toLowerCase().includes(q) ||
          e.projects?.lot_number?.toLowerCase().includes(q)
      );
    }

    // Date range filter
    if (dateFrom) filtered = filtered.filter((e) => e.scheduled_date >= dateFrom);
    if (dateTo) filtered = filtered.filter((e) => e.scheduled_date <= dateTo);

    const result: VendorInvoiceRowData[] = [];

    const isMissing = (v: string | number | null | undefined): boolean =>
      v == null || v === "" || v === 0;

    for (const entry of filtered) {
      const isAllView = viewMode === "all";

      // Concrete
      if (
        entry.supplier_id &&
        (typeFilter === "all" || typeFilter === "concrete")
      ) {
        const needsWork =
          entry.ready_mix_invoice_number == null ||
          isMissing(entry.ready_mix_yards_billed) ||
          isMissing(entry.ready_mix_invoice_amount);

        if (isAllView || needsWork) {
          result.push({
            entry,
            type: "concrete",
            vendorName: entry.suppliers?.name || "-",
          });
        }
      }

      // Stone
      if (
        entry.stone_supplier_id &&
        (typeFilter === "all" || typeFilter === "stone")
      ) {
        const needsWork =
          entry.stone_invoice_number == null ||
          isMissing(entry.stone_tons_billed) ||
          isMissing(entry.stone_invoice_amount);

        if (isAllView || needsWork) {
          result.push({
            entry,
            type: "stone",
            vendorName: entry.stone_suppliers?.name || "-",
          });
        }
      }

      // Pump
      if (
        entry.pump_vendor_id &&
        (typeFilter === "all" || typeFilter === "pump")
      ) {
        const needsWork =
          entry.pump_invoice_number == null ||
          isMissing(entry.pump_invoice_amount);

        if (isAllView || needsWork) {
          result.push({
            entry,
            type: "pump",
            vendorName: entry.pump_vendors?.name || "-",
          });
        }
      }

      // Inspection
      if (
        entry.inspector_id &&
        (typeFilter === "all" || typeFilter === "inspection")
      ) {
        const needsWork =
          !entry.inspection_no_charge &&
          (entry.inspection_invoice_number == null ||
            isMissing(entry.inspection_amount));

        if (isAllView || needsWork) {
          result.push({
            entry,
            type: "inspection",
            vendorName: entry.inspectors?.name || "-",
          });
        }
      }
    }

    // Specific vendor filter
    if (specificVendor !== "all") {
      return result.filter((row) => {
        if (row.type === "concrete") return row.entry.supplier_id === specificVendor;
        if (row.type === "stone") return row.entry.stone_supplier_id === specificVendor;
        if (row.type === "pump") return row.entry.pump_vendor_id === specificVendor;
        if (row.type === "inspection") return row.entry.inspector_id === specificVendor;
        
        return true;
      });
    }

    return result;
  }, [entries, typeFilter, specificVendor, searchQuery, dateFrom, dateTo, viewMode]);

  const hasActiveFilters =
    searchQuery || typeFilter !== "all" || specificVendor !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setTypeFilter("all");
    setSpecificVendor("all");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  };

  const toggleSelect = (entryId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  const selectableRows = rows.filter((r) => r.type === "inspection");
  const allSelected = selectableRows.length > 0 && selectableRows.every((r) => selectedIds.has(r.entry.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableRows.map((r) => r.entry.id)));
    }
  };

  return (
    <AppLayout>
      <div className="p-3 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Vendor Bills
          </h1>
          <p className="text-muted-foreground">
            {isLoading
              ? "Loading..."
              : viewMode === "active"
                ? `${rows.length} entr${rows.length === 1 ? "y" : "ies"} need vendor data`
                : `${rows.length} total vendor bill${rows.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {/* View mode toggle */}
        <div className="mb-4 flex items-center gap-1 rounded-lg border border-border bg-muted p-1 w-fit">
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === "active"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setViewMode("active")}
          >
            Active
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setViewMode("all")}
          >
            All
          </button>
        </div>

        <VendorInvoiceFilters
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          specificVendor={specificVendor}
          setSpecificVendor={setSpecificVendor}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          hasActiveFilters={!!hasActiveFilters}
          clearFilters={clearFilters}
          suppliers={suppliers}
          pumpVendors={pumpVendors}
          inspectors={inspectors}
          
          stoneSuppliers={stoneSuppliers}
        />

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-2.5">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              variant="default"
              onClick={() => noChargeMutation.mutate(Array.from(selectedIds))}
              disabled={noChargeMutation.isPending}
            >
              <Ban className="w-4 h-4 mr-1" />
              Mark as No Charge
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              className="text-muted-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        )}

        <VendorInvoiceTable
          rows={rows}
          typeFilter={typeFilter}
          isMobile={isMobile}
          isLoading={isLoading}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          allSelected={allSelected}
        />
      </div>
    </AppLayout>
  );
}
