import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import { ProjectDetailsSheet } from "@/components/projects/ProjectDetailsSheet";

interface ScheduleEntry {
  id: string;
  scheduled_date: string;
  crew_yards_poured: number | null;
  to_be_invoiced: boolean;
  invoice_complete: boolean;
  invoice_number: string | null;
  crews: { name: string } | null;
  phases: { name: string } | null;
  project_id: string | null;
  projects: {
    id: string;
    lot_number: string;
    builders: { name: string; code: string | null } | null;
    locations: { name: string } | null;
  } | null;
}

export default function Invoices() {
  const navigate = useNavigate();
  const [filterBuilder, setFilterBuilder] = useState("all");
  const [filterCrew, setFilterCrew] = useState("all");
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceNumberValue, setInvoiceNumberValue] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isProjectSheetOpen, setIsProjectSheetOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: pendingEntries = [], isLoading: loadingPending } = useQuery({
    queryKey: ["invoice-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          id, scheduled_date, crew_yards_poured, to_be_invoiced, invoice_complete, invoice_number, project_id,
          crews(name),
          phases(name),
          projects(id, lot_number, builders(name, code), locations(name))
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
          id, scheduled_date, crew_yards_poured, to_be_invoiced, invoice_complete, invoice_number, project_id,
          crews(name),
          phases(name),
          projects(id, lot_number, builders(name, code), locations(name))
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

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ entryId, complete }: { entryId: string; complete: boolean }) => {
      const { error } = await supabase
        .from("schedule_entries")
        .update({ invoice_complete: complete })
        .eq("id", entryId);
      if (error) throw error;
      return complete;
    },
    onSuccess: (complete) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-pending"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-completed"] });
      toast.success(complete ? "Invoice marked as complete" : "Invoice moved to pending");
    },
    onError: () => {
      toast.error("Failed to update invoice status");
    },
  });

  const updateInvoiceNumberMutation = useMutation({
    mutationFn: async ({ entryId, invoiceNumber }: { entryId: string; invoiceNumber: string }) => {
      const { error } = await supabase
        .from("schedule_entries")
        .update({ invoice_number: invoiceNumber || null })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-pending"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-completed"] });
      setEditingInvoiceId(null);
      toast.success("Invoice number updated");
    },
    onError: () => {
      toast.error("Failed to update invoice number");
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

  const handleStartEditInvoice = (entry: ScheduleEntry) => {
    setEditingInvoiceId(entry.id);
    setInvoiceNumberValue(entry.invoice_number || "");
  };

  const handleSaveInvoiceNumber = (entryId: string) => {
    updateInvoiceNumberMutation.mutate({ entryId, invoiceNumber: invoiceNumberValue });
  };

  const handleCancelEdit = () => {
    setEditingInvoiceId(null);
    setInvoiceNumberValue("");
  };

  const handleProjectClick = (projectId: string | null) => {
    if (projectId) {
      setSelectedProjectId(projectId);
      setIsProjectSheetOpen(true);
    }
  };

  const handleDateClick = (date: string) => {
    navigate(`/?date=${date}`);
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
            <TableHead className="text-slate-400 w-12">Complete</TableHead>
            <TableHead className="text-slate-400">Date Completed</TableHead>
            <TableHead className="text-slate-400">Builder</TableHead>
            <TableHead className="text-slate-400">Location</TableHead>
            <TableHead className="text-slate-400">Lot</TableHead>
            <TableHead className="text-slate-400">Phase</TableHead>
            <TableHead className="text-slate-400">Crew</TableHead>
            <TableHead className="text-slate-400">Invoice #</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((entry) => (
            <TableRow key={entry.id} className="border-slate-700">
              <TableCell>
                <Checkbox
                  checked={entry.invoice_complete}
                  onCheckedChange={(checked) => 
                    toggleCompleteMutation.mutate({ entryId: entry.id, complete: !!checked })
                  }
                  disabled={toggleCompleteMutation.isPending}
                  className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
              </TableCell>
              <TableCell>
                <button
                  onClick={() => handleDateClick(entry.scheduled_date)}
                  className="text-white hover:text-amber-400 hover:underline transition-colors cursor-pointer"
                >
                  {format(new Date(entry.scheduled_date + "T00:00:00"), "M/d/yyyy")}
                </button>
              </TableCell>
              <TableCell>
                <button
                  onClick={() => handleProjectClick(entry.projects?.id || entry.project_id)}
                  className="text-white font-medium hover:text-primary hover:underline transition-colors text-left"
                >
                  {entry.projects?.builders?.code || entry.projects?.builders?.name || "-"}
                </button>
              </TableCell>
              <TableCell>
                <button
                  onClick={() => handleProjectClick(entry.projects?.id || entry.project_id)}
                  className="text-slate-300 hover:text-primary hover:underline transition-colors text-left"
                >
                  {entry.projects?.locations?.name || "-"}
                </button>
              </TableCell>
              <TableCell>
                <button
                  onClick={() => handleProjectClick(entry.projects?.id || entry.project_id)}
                  className="text-amber-500 font-medium hover:text-primary hover:underline transition-colors text-left"
                >
                  {entry.projects?.lot_number || "-"}
                </button>
              </TableCell>
              <TableCell className="text-slate-300">
                {entry.phases?.name || "-"}
              </TableCell>
              <TableCell className="text-slate-300">
                {entry.crews?.name || "-"}
              </TableCell>
              <TableCell>
                {editingInvoiceId === entry.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={invoiceNumberValue}
                      onChange={(e) => setInvoiceNumberValue(e.target.value)}
                      className="h-8 w-28 bg-slate-700 border-slate-600 text-white"
                      placeholder="Invoice #"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveInvoiceNumber(entry.id);
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-green-500 hover:text-green-400"
                      onClick={() => handleSaveInvoiceNumber(entry.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartEditInvoice(entry)}
                    className="text-slate-400 hover:text-white transition-colors text-left min-w-[80px]"
                  >
                    {entry.invoice_number || "Add #"}
                  </button>
                )}
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

      <ProjectDetailsSheet
        projectId={selectedProjectId}
        isOpen={isProjectSheetOpen}
        onClose={() => setIsProjectSheetOpen(false)}
        onEdit={() => {}}
      />
    </AppLayout>
  );
}
