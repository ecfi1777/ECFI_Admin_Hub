import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, ExternalLink, MapPin, FileText, Building, Home } from "lucide-react";
import { ProjectScheduleHistory } from "./ProjectScheduleHistory";
import { ProjectDocuments } from "./ProjectDocuments";

interface ProjectDetailsSheetProps {
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function ProjectDetailsSheet({
  projectId,
  isOpen,
  onClose,
  onEdit,
}: ProjectDetailsSheetProps) {
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          builders(id, name, code),
          locations(id, name),
          project_statuses(id, name)
        `)
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "Upcoming":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Ready to Start":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "In Progress":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Ready to Invoice":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Invoice Complete - Archive":
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  if (!projectId) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="bg-slate-800 border-slate-700 w-full sm:max-w-2xl overflow-y-auto">
        {isLoading ? (
          <div className="text-slate-400 text-center py-12">Loading...</div>
        ) : project ? (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-white text-xl flex items-center gap-2">
                    <span className="text-amber-500">{project.lot_number}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onEdit}
                      className="text-slate-400 hover:text-white h-8 w-8 p-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </SheetTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {project.builders && (
                      <span className="text-slate-300">
                        {project.builders.code || project.builders.name}
                      </span>
                    )}
                    {project.locations && (
                      <>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">{project.locations.name}</span>
                      </>
                    )}
                  </div>
                </div>
                {project.project_statuses && (
                  <Badge
                    variant="outline"
                    className={getStatusColor(project.project_statuses.name)}
                  >
                    {project.project_statuses.name}
                  </Badge>
                )}
              </div>

              {/* Project Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {project.full_address && (
                  <div className="col-span-2 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span className="text-slate-300">{project.full_address}</span>
                  </div>
                )}
                {project.county && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">County:</span>
                    <span className="text-slate-300">{project.county}</span>
                  </div>
                )}
                {project.permit_number && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">Permit: {project.permit_number}</span>
                  </div>
                )}
                {project.authorization_numbers && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Auth #:</span>
                    <span className="text-slate-300">{project.authorization_numbers}</span>
                  </div>
                )}
                {project.wall_height && (
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">Wall: {project.wall_height}</span>
                  </div>
                )}
                {project.basement_type && (
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">{project.basement_type}</span>
                  </div>
                )}
                {project.google_drive_url && (
                  <div className="col-span-2">
                    <a
                      href={project.google_drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-amber-500 hover:text-amber-400"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Google Drive Folder</span>
                    </a>
                  </div>
                )}
              </div>

              {project.notes && (
                <div className="text-slate-400 text-sm border-t border-slate-700 pt-3">
                  {project.notes}
                </div>
              )}
            </SheetHeader>

            <Tabs defaultValue="history" className="mt-6">
              <TabsList className="bg-slate-700 border-slate-600">
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-slate-600 text-slate-300"
                >
                  Schedule History
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="data-[state=active]:bg-slate-600 text-slate-300"
                >
                  Documents
                </TabsTrigger>
              </TabsList>
              <TabsContent value="history" className="mt-4">
                <ProjectScheduleHistory projectId={projectId} />
              </TabsContent>
              <TabsContent value="documents" className="mt-4">
                <ProjectDocuments projectId={projectId} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-slate-400 text-center py-12">Project not found</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
