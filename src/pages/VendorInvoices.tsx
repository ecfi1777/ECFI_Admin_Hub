import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { useOrganization } from "@/hooks/useOrganization";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useSuppliers,
  usePumpVendors,
  useInspectors,
  useCrews,
} from "@/hooks/useReferenceData";
import { VendorInvoiceFilters } from "@/components/vendor-invoices/VendorInvoiceFilters";
import { VendorInvoiceTable } from "@/components/vendor-invoices/VendorInvoiceTable";
import type {
  VendorEntry,
  VendorInvoiceRowData,
  VendorTypeFilter,
} from "@/components/vendor-invoices/types";

export default function VendorInvoices() {
  const { organizationId } = useOrganization();
  const isMobile = useIsMobile();

  // Filter state
  const [typeFilter, setTypeFilter] = useState<VendorTypeFilter>("all");
  const [specificVendor, setSpecificVendor] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Reset specific vendor when type changes
  useEffect(() => {
    setSpecificVendor("all");
  }, [typeFilter]);

  // Reference data
  const { data: suppliers = [] } = useSuppliers();
  const { data: pumpVendors = [] } = usePumpVendors();
  const { data: inspectors = [] } = useInspectors();
  const { data: crews = [] } = useCrews();

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
          pump_vendor_id, inspector_id, phase_id,
          ready_mix_invoice_number, ready_mix_yards_billed, ready_mix_invoice_amount,
          pump_invoice_number, pump_invoice_amount,
          inspection_invoice_number, inspection_amount,
          crew_yards_poured,
          projects(id, lot_number, builders(name, code), locations(name)),
          crews(name),
          suppliers(name, code),
          pump_vendors(name, code),
          inspectors(name),
          phases(name)
        `
        )
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .or(
          "supplier_id.not.is.null,pump_vendor_id.not.is.null,inspector_id.not.is.null,crew_id.not.is.null"
        )
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data as VendorEntry[];
    },
    enabled: !!organizationId,
  });

  // Transform entries → rows (one per missing vendor type)
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

    for (const entry of filtered) {
      // Concrete: supplier set AND any concrete field missing
      if (
        entry.supplier_id &&
        (entry.ready_mix_invoice_number == null ||
          entry.ready_mix_yards_billed == null ||
          entry.ready_mix_invoice_amount == null) &&
        (typeFilter === "all" || typeFilter === "concrete")
      ) {
        result.push({
          entry,
          type: "concrete",
          vendorName: entry.suppliers?.name || "-",
        });
      }

      // Pump
      if (
        entry.pump_vendor_id &&
        (entry.pump_invoice_number == null ||
          entry.pump_invoice_amount == null) &&
        (typeFilter === "all" || typeFilter === "pump")
      ) {
        result.push({
          entry,
          type: "pump",
          vendorName: entry.pump_vendors?.name || "-",
        });
      }

      // Inspection
      if (
        entry.inspector_id &&
        (entry.inspection_invoice_number == null ||
          entry.inspection_amount == null) &&
        (typeFilter === "all" || typeFilter === "inspection")
      ) {
        result.push({
          entry,
          type: "inspection",
          vendorName: entry.inspectors?.name || "-",
        });
      }

      // Crew
      if (
        entry.crew_id &&
        entry.crew_yards_poured == null &&
        (typeFilter === "all" || typeFilter === "crew")
      ) {
        result.push({
          entry,
          type: "crew",
          vendorName: entry.crews?.name || "-",
        });
      }
    }

    // Specific vendor filter
    if (specificVendor !== "all") {
      return result.filter((row) => {
        if (row.type === "concrete") return row.entry.supplier_id === specificVendor;
        if (row.type === "pump") return row.entry.pump_vendor_id === specificVendor;
        if (row.type === "inspection") return row.entry.inspector_id === specificVendor;
        if (row.type === "crew") return row.entry.crew_id === specificVendor;
        return true;
      });
    }

    return result;
  }, [entries, typeFilter, specificVendor, searchQuery, dateFrom, dateTo]);

  const hasActiveFilters =
    searchQuery || typeFilter !== "all" || specificVendor !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setTypeFilter("all");
    setSpecificVendor("all");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <AppLayout>
      <div className="p-3 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Vendor Invoice Entry
          </h1>
          <p className="text-muted-foreground">
            {isLoading
              ? "Loading..."
              : `${rows.length} entr${rows.length === 1 ? "y" : "ies"} need vendor data`}
          </p>
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
          crews={crews}
        />

        <VendorInvoiceTable
          rows={rows}
          typeFilter={typeFilter}
          isMobile={isMobile}
          isLoading={isLoading}
        />
      </div>
    </AppLayout>
  );
}
