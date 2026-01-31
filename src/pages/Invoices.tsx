import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Check } from "lucide-react";

interface ScheduleEntry {
  id: string;
  scheduled_date: string;
  crew_yards_poured: number | null;
  to_be_invoiced: boolean;
  invoice_complete: boolean;
  invoice_number: string | null;
  crews: { name: string } | null;
  phases: { name: string } | null;
  projects: {
    lot_number: string;
    builders: { name: string; code: string | null } | null;
    locations: { name: string } | null;
  } | null;
}

export default function Invoices() {
  const [filterBuilder, setFilterBuilder] = useState("all");
  const [filterCrew, setFilterCrew] = useState("all");

  const { data: pendingEntries = [], isLoading: loadingPending } = useQuery({
    queryKey: ["invoice-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          id, scheduled_date, crew_yards_poured, to_be_invoiced, invoice_complete, invoice_number,
          crews(name),
          phases(name),
          projects(lot_number, builders(name, code), locations(name))
        `)
        .eq("to_be_invoiced", true)
        .eq("invoice_complete", false)
        .eq("deleted", false)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data as ScheduleEntry[];
    },
  });

  const { data: completedEntries = [], isLoading: loadingCompleted } = useQuery({
    queryKey: ["invoice-completed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          id, scheduled_date, crew_yards_poured, to_be_invoiced, invoice_complete, invoice_number,
          crews(name),
          phases(name),
          projects(lot_number, builders(name, code), locations(name))
        `)
        .eq("invoice_complete", true)
        .eq("deleted", false)
        .order("scheduled_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as ScheduleEntry[];
    },
  });

  const { data: builders = [] } = useQuery({
    queryKey: ["builders-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("builders").select("id, name, code").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: crews = [] } = useQuery({
    queryKey: ["crews-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("crews").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const filterEntries = (entries: ScheduleEntry[]) => {
    return entries.filter((entry) => {
      const matchesBuilder = filterBuilder === "all" || 
        entry.projects?.builders?.code === filterBuilder ||
        entry.projects?.builders?.name === filterBuilder;
      const matchesCrew = filterCrew === "all" || entry.crews?.name === filterCrew;
      return matchesBuilder && matchesCrew;
    });
  };

  const renderTable = (entries: ScheduleEntry[], isLoading: boolean) => {
    const filtered = filterEntries(entries);
    
    if (isLoading) {
      return <div className="text-slate-400 text-center py-12">Loading...</div>;
    }

    if (filtered.length === 0) {
      return <div className="text-slate-400 text-center py-12">No entries found</div>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700 hover:bg-transparent">
            <TableHead className="text-slate-400">Date</TableHead>
            <TableHead className="text-slate-400">Builder</TableHead>
            <TableHead className="text-slate-400">Location</TableHead>
            <TableHead className="text-slate-400">Lot</TableHead>
            <TableHead className="text-slate-400">Phase</TableHead>
            <TableHead className="text-slate-400">Crew</TableHead>
            <TableHead className="text-slate-400">Yards</TableHead>
            <TableHead className="text-slate-400">Invoice #</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((entry) => (
            <TableRow key={entry.id} className="border-slate-700">
              <TableCell className="text-white">
                {new Date(entry.scheduled_date).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-white font-medium">
                {entry.projects?.builders?.code || entry.projects?.builders?.name || "-"}
              </TableCell>
              <TableCell className="text-slate-300">
                {entry.projects?.locations?.name || "-"}
              </TableCell>
              <TableCell className="text-amber-500 font-medium">
                {entry.projects?.lot_number || "-"}
              </TableCell>
              <TableCell className="text-slate-300">
                {entry.phases?.name || "-"}
              </TableCell>
              <TableCell className="text-slate-300">
                {entry.crews?.name || "-"}
              </TableCell>
              <TableCell className="text-white">
                {entry.crew_yards_poured || "-"}
              </TableCell>
              <TableCell className="text-slate-400">
                {entry.invoice_number || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Invoice Tracking</h1>
          <p className="text-slate-400">Track pending and completed invoices</p>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Select value={filterBuilder} onValueChange={setFilterBuilder}>
                <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="All Builders" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all" className="text-white">All Builders</SelectItem>
                  {builders.map((b) => (
                    <SelectItem key={b.id} value={b.code || b.name} className="text-white">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCrew} onValueChange={setFilterCrew}>
                <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="All Crews" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all" className="text-white">All Crews</SelectItem>
                  {crews.map((c) => (
                    <SelectItem key={c.id} value={c.name} className="text-white">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pending">
          <TabsList className="bg-slate-800 border border-slate-700 mb-4">
            <TabsTrigger value="pending" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900 text-slate-400">
              <FileText className="w-4 h-4 mr-2" />
              Pending ({filterEntries(pendingEntries).length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900 text-slate-400">
              <Check className="w-4 h-4 mr-2" />
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-0">
                {renderTable(pendingEntries, loadingPending)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-0">
                {renderTable(completedEntries, loadingCompleted)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
