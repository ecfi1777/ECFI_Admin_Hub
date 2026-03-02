import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCrews } from "@/hooks/useReferenceData";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X } from "lucide-react";

export function CrewDaysNotWorkedReport() {
  const { organizationId } = useOrganization();
  const { data: crews = [] } = useCrews();

  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [crewFilter, setCrewFilter] = useState("all");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["report-crew-days-not-worked", organizationId, dateFrom, dateTo, crewFilter],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = supabase
        .from("schedule_entries")
        .select("id, scheduled_date, crew_id, not_working_reason, crews(name)")
        .eq("organization_id", organizationId)
        .eq("did_not_work", true)
        .eq("deleted", false)
        .order("scheduled_date", { ascending: false });

      if (dateFrom) query = query.gte("scheduled_date", dateFrom);
      if (dateTo) query = query.lte("scheduled_date", dateTo);
      if (crewFilter !== "all") query = query.eq("crew_id", crewFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const crewName = useMemo(() => {
    if (crewFilter === "all") return null;
    return crews.find((c) => c.id === crewFilter)?.name || null;
  }, [crewFilter, crews]);

  const summaryParts: string[] = [`${entries.length} day${entries.length !== 1 ? "s" : ""} not worked`];
  if (crewName) summaryParts.push(`by ${crewName}`);
  if (dateFrom && dateTo) {
    summaryParts.push(
      `from ${format(new Date(dateFrom + "T00:00:00"), "MMM d, yyyy")} to ${format(new Date(dateTo + "T00:00:00"), "MMM d, yyyy")}`
    );
  }

  const clearDates = () => {
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="w-full md:w-40">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From"
              />
            </div>
            <div className="w-full md:w-40">
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To"
              />
            </div>
            <Select value={crewFilter} onValueChange={setCrewFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="All Crews" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Crews</SelectItem>
                {crews.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" onClick={clearDates} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4 mr-1" />
                Show All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <p className="text-sm text-muted-foreground">{summaryParts.join(" ")}</p>

      {/* Table */}
      {isLoading ? (
        <div className="text-muted-foreground text-center py-12">Loading...</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No days off recorded for this period
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Crew</TableHead>
                    <TableHead className="text-muted-foreground">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(entry.scheduled_date + "T00:00:00"), "EEE, MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(entry.crews as any)?.name || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.not_working_reason || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
