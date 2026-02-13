import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Plus, File, X, CheckCircle } from "lucide-react";
import { invalidateProjectQueries } from "@/lib/queryHelpers";
import { ProjectFormFields } from "./ProjectFormFields";
import { useOrganization } from "@/hooks/useOrganization";
import { FileDropZone } from "@/components/ui/file-drop-zone";

const DOCUMENT_CATEGORIES = [
  { id: "permit_copy", label: "Permit Copy" },
  { id: "folder_copy_before", label: "Folder Copy - Before" },
  { id: "folder_copy_complete", label: "Folder Copy - Complete" },
  { id: "selection_sheet", label: "Selection Sheet" },
  { id: "purchase_order", label: "Purchase Order" },
  { id: "materials_list", label: "Materials List" },
  { id: "additional_documents", label: "Additional Project Documents" },
];

interface Builder {
  id: string;
  name: string;
  code: string | null;
}

interface Location {
  id: string;
  name: string;
}

interface Status {
  id: string;
  name: string;
}

interface StagedFile {
  category: string;
  file: File;
}

interface AddProjectDialogProps {
  builders: Builder[];
  locations: Location[];
  statuses: Status[];
}

export function AddProjectDialog({ builders, locations, statuses }: AddProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "documents">("details");
  const defaultStatusId = statuses.length > 0 ? statuses[0].id : "";
  const [formData, setFormData] = useState({
    builderId: "",
    locationId: "",
    lotNumber: "",
    statusId: defaultStatusId,
    notes: "",
    fullAddress: "",
    county: "",
    permitNumber: "",
    authorizationNumbers: "",
    wallHeight: "",
    basementType: "",
    googleDriveUrl: "",
  });
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const resetForm = () => {
    setFormData({
      builderId: "",
      locationId: "",
      lotNumber: "",
      statusId: defaultStatusId,
      notes: "",
      fullAddress: "",
      county: "",
      permitNumber: "",
      authorizationNumbers: "",
      wallHeight: "",
      basementType: "",
      googleDriveUrl: "",
    });
    setStagedFiles([]);
    setActiveTab("details");
  };

  const uploadStagedFiles = async (projectId: string) => {
    if (!organizationId || stagedFiles.length === 0) return;

    const errors: string[] = [];
    for (const { file, category } of stagedFiles) {
      try {
        const fileExt = file.name.split(".").pop();
        const filePath = `${projectId}/${category}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("project-documents")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("project_documents").insert({
          organization_id: organizationId,
          project_id: projectId,
          category,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          content_type: file.type,
        });
        if (dbError) throw dbError;
      } catch (err) {
        errors.push(file.name);
      }
    }
    if (errors.length > 0) {
      toast.error(`Failed to upload: ${errors.join(", ")}. You can add them later via edit.`);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization found");
      const { data, error } = await supabase
        .from("projects")
        .insert({
          organization_id: organizationId,
          builder_id: formData.builderId || null,
          location_id: formData.locationId || null,
          lot_number: formData.lotNumber,
          status_id: formData.statusId,
          notes: formData.notes || null,
          full_address: formData.fullAddress || null,
          county: formData.county || null,
          permit_number: formData.permitNumber || null,
          authorization_numbers: formData.authorizationNumbers || null,
          wall_height: formData.wallHeight || null,
          basement_type: formData.basementType || null,
          google_drive_url: formData.googleDriveUrl || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: async (projectId) => {
      await uploadStagedFiles(projectId);
      invalidateProjectQueries(queryClient);
      toast.success("Project created");
      setIsOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStageFile = useCallback((category: string, file: File) => {
    setStagedFiles((prev) => {
      // Replace existing file for this category, or add
      const filtered = prev.filter((f) => f.category !== category);
      return [...filtered, { category, file }];
    });
  }, []);

  const handleRemoveStagedFile = useCallback((category: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.category !== category));
  }, []);

  const getStagedFileForCategory = (category: string) =>
    stagedFiles.find((f) => f.category === category);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] md:max-w-lg max-h-[100dvh] md:max-h-[90dvh] overflow-y-auto rounded-none md:rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Project</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border overflow-x-auto whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "details"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "documents"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Documents
            {stagedFiles.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-primary text-primary-foreground">
                {stagedFiles.length}
              </span>
            )}
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          {/* Details Tab */}
          {activeTab === "details" && (
            <ProjectFormFields
              formData={formData}
              onChange={handleChange}
              builders={builders}
              locations={locations}
              statuses={statuses}
            />
          )}

          {/* Documents Tab */}
          {activeTab === "documents" && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {DOCUMENT_CATEGORIES.map((cat) => {
                const staged = getStagedFileForCategory(cat.id);
                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm font-medium">{cat.label}</span>
                      {staged && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>

                    {staged && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <File className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-foreground text-sm flex-1 truncate">
                          {staged.file.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStagedFile(cat.id)}
                          className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    <FileDropZone
                      onFileSelect={(file) => handleStageFile(cat.id, file)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!formData.lotNumber || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
