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
import { FileText, Check, Search, X } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBuilder, setFilterBuilder] = useState("all");
  const [filterCrew, setFilterCrew] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterPhase, setFilterPhase] = useState("all");
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

  const { data: locations = [] } = useQuery({
    queryKey: ["locations-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["phases-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("phases").select("id, name").eq("is_active", true).order("display_order");
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
      // Search across builder, location, crew, phase
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        entry.projects?.builders?.name?.toLowerCase().includes(searchLower) ||
        entry.projects?.builders?.code?.toLowerCase().includes(searchLower) ||
        entry.projects?.locations?.name?.toLowerCase().includes(searchLower) ||
        entry.crews?.name?.toLowerCase().includes(searchLower) ||
        entry.phases?.name?.toLowerCase().includes(searchLower);
      
      const matchesBuilder = filterBuilder === "all" || 
        entry.projects?.builders?.code === filterBuilder ||
        entry.projects?.builders?.name === filterBuilder;
      const matchesCrew = filterCrew === "all" || entry.crews?.name === filterCrew;
      const matchesLocation = filterLocation === "all" || entry.projects?.locations?.name === filterLocation;
      const matchesPhase = filterPhase === "all" || entry.phases?.name === filterPhase;
      
      return matchesSearch && matchesBuilder && matchesCrew && matchesLocation && matchesPhase;
    });
  };

  const hasActiveFilters = searchQuery || filterBuilder !== "all" || filterCrew !== "all" || filterLocation !== "all" || filterPhase !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterBuilder("all");
    setFilterCrew("all");
    setFilterLocation("all");
    setFilterPhase("all");
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
      return <div className="text-muted-foreground text-center py-12">Loading...</div>;
    }

    if (filtered.length === 0) {
      return <div className="text-muted-foreground text-center py-12">No entries found</div>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-muted-foreground w-16">Inv Complete</TableHead>
            <TableHead className="text-muted-foreground">Date Completed</TableHead>
            <TableHead className="text-muted-foreground">Builder</TableHead>
            <TableHead className="text-muted-foreground">Location</TableHead>
            <TableHead className="text-muted-foreground">Lot</TableHead>
            <TableHead className="text-muted-foreground">Phase</TableHead>
            <TableHead className="text-muted-foreground">Crew</TableHead>
            <TableHead className="text-muted-foreground">Invoice #</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((entry) => (
            <TableRow key={entry.id}>
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
                  className="text-foreground hover:text-primary hover:underline transition-colors cursor-pointer"
                >
                  {format(new Date(entry.scheduled_date + "T00:00:00"), "M/d/yyyy")}
                </button>
              </TableCell>
              <TableCell>
                <button
                  onClick={() => handleProjectClick(entry.projects?.id || entry.project_id)}
                  className="text-foreground font-medium hover:text-primary hover:underline transition-colors text-left"
                >
                  {entry.projects?.builders?.code || entry.projects?.builders?.name || "-"}
                </button>
              </TableCell>
              <TableCell>
                <button
                  onClick={() => handleProjectClick(entry.projects?.id || entry.project_id)}
                  className="text-muted-foreground hover:text-primary hover:underline transition-colors text-left"
                >
                  {entry.projects?.locations?.name || "-"}
                </button>
              </TableCell>
              <TableCell>
                <button
                  onClick={() => handleProjectClick(entry.projects?.id || entry.project_id)}
                  className="text-primary font-medium hover:underline transition-colors text-left"
                >
                  {entry.projects?.lot_number || "-"}
                </button>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {entry.phases?.name || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {entry.crews?.name || "-"}
              </TableCell>
              <TableCell>
                {editingInvoiceId === entry.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={invoiceNumberValue}
                      onChange={(e) => setInvoiceNumberValue(e.target.value)}
                      className="h-8 w-28"
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
                    className="text-muted-foreground hover:text-foreground transition-colors text-left min-w-[80px]"
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
          <h1 className="text-2xl font-bold text-foreground">Invoice Tracking</h1>
          <p className="text-muted-foreground">Track pending and completed invoices</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search box */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search builder, location, crew, phase..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterBuilder} onValueChange={setFilterBuilder}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Builders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Builders</SelectItem>
                  {builders.map((b) => (
                    <SelectItem key={b.id} value={b.code || b.name}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterCrew} onValueChange={setFilterCrew}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Crews" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Crews</SelectItem>
                  {crews.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterPhase} onValueChange={setFilterPhase}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Phases" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Phases</SelectItem>
                  {phases.map((p) => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
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
          <TabsList className="bg-muted border border-border mb-4">
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
              <FileText className="w-4 h-4 mr-2" />
              Pending ({filterEntries(pendingEntries).length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
              <Check className="w-4 h-4 mr-2" />
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardContent className="p-0">
                {renderTable(pendingEntries, loadingPending)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card>
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