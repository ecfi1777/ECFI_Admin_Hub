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
import { Search, X } from "lucide-react";
import { VendorTypeFilter } from "./types";
import type { Supplier, PumpVendor, Inspector, Crew } from "@/hooks/useReferenceData";

interface VendorInvoiceFiltersProps {
  typeFilter: VendorTypeFilter;
  setTypeFilter: (v: VendorTypeFilter) => void;
  specificVendor: string;
  setSpecificVendor: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  hasActiveFilters: boolean | string;
  clearFilters: () => void;
  suppliers: Supplier[];
  pumpVendors: PumpVendor[];
  inspectors: Inspector[];
  crews: Crew[];
}

export function VendorInvoiceFilters({
  typeFilter,
  setTypeFilter,
  specificVendor,
  setSpecificVendor,
  searchQuery,
  setSearchQuery,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  hasActiveFilters,
  clearFilters,
  suppliers,
  pumpVendors,
  inspectors,
  crews,
}: VendorInvoiceFiltersProps) {
  const vendorOptions = (() => {
    switch (typeFilter) {
      case "concrete":
        return suppliers.map((s) => ({ id: s.id, name: s.name }));
      case "pump":
        return pumpVendors.map((p) => ({ id: p.id, name: p.name }));
      case "inspection":
        return inspectors.map((i) => ({ id: i.id, name: i.name }));
      case "crew":
        return crews.map((c) => ({ id: c.id, name: c.name }));
      default:
        return [];
    }
  })();

  const vendorLabel: Record<VendorTypeFilter, string> = {
    all: "All Vendors",
    concrete: "All Suppliers",
    pump: "All Pump Vendors",
    inspection: "All Inspectors",
    crew: "All Crews",
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative w-full md:flex-1 md:min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search builder, location, lot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Vendor Type */}
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as VendorTypeFilter)}
          >
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="concrete">Concrete</SelectItem>
              <SelectItem value="pump">Pump</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
              <SelectItem value="crew">Crew</SelectItem>
            </SelectContent>
          </Select>

          {/* Specific Vendor */}
          <Select
            value={specificVendor}
            onValueChange={setSpecificVendor}
            disabled={typeFilter === "all"}
          >
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder={vendorLabel[typeFilter]} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{vendorLabel[typeFilter]}</SelectItem>
              {vendorOptions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date From */}
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
            className="w-full md:w-36"
          />

          {/* Date To */}
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
            className="w-full md:w-36"
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
