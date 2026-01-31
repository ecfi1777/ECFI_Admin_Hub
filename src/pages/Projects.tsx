import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Search } from "lucide-react";

interface Project {
  id: string;
  lot_number: string;
  notes: string | null;
  created_at: string;
  builders: { id: string; name: string; code: string | null } | null;
  locations: { id: string; name: string } | null;
  project_statuses: { id: string; name: string } | null;
}

export default function Projects() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBuilder, setFilterBuilder] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  const [newBuilderId, setNewBuilderId] = useState("");
  const [newLocationId, setNewLocationId] = useState("");
  const [newLotNumber, setNewLotNumber] = useState("");
  const [newStatusId, setNewStatusId] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, builders(id, name, code), locations(id, name), project_statuses(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
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

  const { data: locations = [] } = useQuery({
    queryKey: ["locations-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["statuses-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_statuses").select("id, name").eq("is_active", true).order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").insert({
        builder_id: newBuilderId || null,
        location_id: newLocationId || null,
        lot_number: newLotNumber,
        status_id: newStatusId || null,
        notes: newNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project created" });
      setIsDialogOpen(false);
      setNewBuilderId("");
      setNewLocationId("");
      setNewLotNumber("");
      setNewStatusId("");
      setNewNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      searchQuery === "" ||
      project.lot_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.builders?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.locations?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBuilder = filterBuilder === "" || project.builders?.id === filterBuilder;
    const matchesLocation = filterLocation === "" || project.locations?.id === filterLocation;
    const matchesStatus = filterStatus === "" || project.project_statuses?.id === filterStatus;

    return matchesSearch && matchesBuilder && matchesLocation && matchesStatus;
  });

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "Upcoming": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Ready to Start": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "In Progress": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Ready to Invoice": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Invoice Complete - Archive": return "bg-slate-500/20 text-slate-400 border-slate-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Projects</h1>
            <p className="text-slate-400">Manage all your jobs and projects</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-900">
                <Plus className="w-4 h-4 mr-2" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Builder</Label>
                  <Select value={newBuilderId} onValueChange={setNewBuilderId}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select builder" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {builders.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-white">{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Location</Label>
                  <Select value={newLocationId} onValueChange={setNewLocationId}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id} className="text-white">{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Lot Number</Label>
                  <Input
                    value={newLotNumber}
                    onChange={(e) => setNewLotNumber(e.target.value)}
                    required
                    placeholder="e.g., 12-18V"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Status</Label>
                  <Select value={newStatusId} onValueChange={setNewStatusId}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-white">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <Select value={filterBuilder} onValueChange={setFilterBuilder}>
                <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="All Builders" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="" className="text-white">All Builders</SelectItem>
                  {builders.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-white">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="w-44 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="" className="text-white">All Locations</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-white">{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="" className="text-white">All Statuses</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-white">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-slate-400 text-center py-12">Loading projects...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-slate-400 text-center py-12">No projects found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Builder</TableHead>
                    <TableHead className="text-slate-400">Location</TableHead>
                    <TableHead className="text-slate-400">Lot #</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow key={project.id} className="border-slate-700 hover:bg-slate-700/50 cursor-pointer">
                      <TableCell className="text-white font-medium">
                        {project.builders?.code || project.builders?.name || "-"}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {project.locations?.name || "-"}
                      </TableCell>
                      <TableCell className="text-amber-500 font-medium">
                        {project.lot_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(project.project_statuses?.name)}>
                          {project.project_statuses?.name || "No Status"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(project.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
