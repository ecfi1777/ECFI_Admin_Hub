import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { ProjectDetailsSheet } from "@/components/projects/ProjectDetailsSheet";

interface ScheduleEntry {
  id: string;
  scheduled_date: string;
  crew_yards_poured: number | null;
  ready_mix_yards_billed: number | null;
  crews: { name: string } | null;
  phases: { name: string } | null;
  suppliers: { name: string; code: string | null } | null;
  projects: {
    id: string;
    lot_number: string;
    builders: { name: string; code: string | null } | null;
    locations: { name: string } | null;
  } | null;
}

interface CrewSummary {
  name: string;
  totalPoured: number;
}

interface SupplierSummary {
  name: string;
  totalBilled: number;
}

export default function Discrepancies() {
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data: discrepancyEntries = [], isLoading } = useQuery({
    queryKey: ["discrepancies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          id, scheduled_date, crew_yards_poured, ready_mix_yards_billed,
          crews(name),
          phases(name),
          suppliers(name, code),
          projects(id, lot_number, builders(name, code), locations(name))
        `)
        .eq("deleted", false)
        .not("crew_yards_poured", "is", null)
        .not("ready_mix_yards_billed", "is", null)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      
      // Filter to only entries with discrepancies
      return (data as ScheduleEntry[]).filter(
        (e) => e.crew_yards_poured !== e.ready_mix_yards_billed
      );
    },
  });

  const { data: allEntries = [] } = useQuery({
    queryKey: ["all-entries-for-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          crew_yards_poured, ready_mix_yards_billed,
          crews(name),
          suppliers(name)
        `)
        .eq("deleted", false);
      if (error) throw error;
      return data;
    },
  });

  // Calculate crew totals
  const crewTotals = allEntries.reduce((acc, entry) => {
    const crewName = entry.crews?.name || "Unassigned";
    if (!acc[crewName]) acc[crewName] = 0;
    acc[crewName] += entry.crew_yards_poured || 0;
    return acc;
  }, {} as Record<string, number>);

  // Calculate supplier totals
  const supplierTotals = allEntries.reduce((acc, entry) => {
    const supplierName = entry.suppliers?.name || "Unknown";
    if (!acc[supplierName]) acc[supplierName] = 0;
    acc[supplierName] += entry.ready_mix_yards_billed || 0;
    return acc;
  }, {} as Record<string, number>);

  const totalCrewYards = Object.values(crewTotals).reduce((a, b) => a + b, 0);
  const totalSupplierYards = Object.values(supplierTotals).reduce((a, b) => a + b, 0);
  const overallDiscrepancy = totalCrewYards - totalSupplierYards;

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Yards Discrepancies</h1>
          <p className="text-slate-400">Track differences between crew-reported and supplier-billed yards</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Crew Yards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalCrewYards.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Supplier Yards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalSupplierYards.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card className={`border ${overallDiscrepancy !== 0 ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Overall Discrepancy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-2 ${overallDiscrepancy !== 0 ? "text-red-400" : "text-green-400"}`}>
                {overallDiscrepancy > 0 ? <TrendingUp className="w-5 h-5" /> : overallDiscrepancy < 0 ? <TrendingDown className="w-5 h-5" /> : null}
                {overallDiscrepancy > 0 ? "+" : ""}{overallDiscrepancy.toFixed(1)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary by Crew and Supplier */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Yards by Crew</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(crewTotals).map(([name, total]) => (
                  <div key={name} className="flex justify-between items-center">
                    <span className="text-slate-300">Crew {name}</span>
                    <span className="text-white font-medium">{total.toFixed(1)} yds</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Yards by Supplier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(supplierTotals).map(([name, total]) => (
                  <div key={name} className="flex justify-between items-center">
                    <span className="text-slate-300">{name}</span>
                    <span className="text-white font-medium">{total.toFixed(1)} yds</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Discrepancy Entries */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Entries with Discrepancies ({discrepancyEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-slate-400 text-center py-12">Loading...</div>
            ) : discrepancyEntries.length === 0 ? (
              <div className="text-green-400 text-center py-12">
                ✓ No discrepancies found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Date</TableHead>
                    <TableHead className="text-slate-400">Project</TableHead>
                    <TableHead className="text-slate-400">Phase</TableHead>
                    <TableHead className="text-slate-400">Crew</TableHead>
                    <TableHead className="text-slate-400">Supplier</TableHead>
                    <TableHead className="text-slate-400">Crew Yds</TableHead>
                    <TableHead className="text-slate-400">Billed Yds</TableHead>
                    <TableHead className="text-slate-400">Diff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discrepancyEntries.map((entry) => {
                    const diff = (entry.crew_yards_poured || 0) - (entry.ready_mix_yards_billed || 0);
                    const dateForNav = format(new Date(entry.scheduled_date + "T00:00:00"), "yyyy-MM-dd");
                    return (
                      <TableRow key={entry.id} className="border-slate-700">
                        <TableCell>
                          <button
                            onClick={() => navigate(`/?date=${dateForNav}`)}
                            className="text-white hover:text-blue-400 hover:underline transition-colors text-left"
                          >
                            {format(new Date(entry.scheduled_date + "T00:00:00"), "M/d/yyyy")}
                          </button>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => entry.projects?.id && setSelectedProjectId(entry.projects.id)}
                            className="text-slate-300 hover:text-blue-400 hover:underline transition-colors text-left"
                          >
                            {entry.projects?.builders?.code || entry.projects?.builders?.name} - {entry.projects?.lot_number}
                          </button>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {entry.phases?.name || "-"}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {entry.crews?.name || "-"}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {entry.suppliers?.code || entry.suppliers?.name || "-"}
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          {entry.crew_yards_poured}
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          {entry.ready_mix_yards_billed}
                        </TableCell>
                        <TableCell>
                          <Badge className={diff > 0 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ProjectDetailsSheet
          projectId={selectedProjectId}
          isOpen={!!selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
          onEdit={() => {}}
        />
      </div>
    </AppLayout>
  );
}
