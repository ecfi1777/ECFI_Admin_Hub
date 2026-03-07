import { useState } from "react";
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
import { Plus, CheckCircle2 } from "lucide-react";
import { invalidateProjectQueries } from "@/lib/queryHelpers";
import { ProjectFormFields } from "./ProjectFormFields";
import { DuplicateProjectWarning } from "./DuplicateProjectWarning";
import { useOrganization } from "@/hooks/useOrganization";
import { useDuplicateProjectCheck } from "@/hooks/useDuplicateProjectCheck";

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

interface AddProjectDialogProps {
  builders: Builder[];
  locations: Location[];
  statuses: Status[];
  onAddDocuments?: (projectId: string) => void;
}

export function AddProjectDialog({ builders, locations, statuses, onAddDocuments }: AddProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
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
  const [createdProject, setCreatedProject] = useState<{ id: string; name: string } | null>(null);

  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const duplicate = useDuplicateProjectCheck({
    builderId: formData.builderId,
    locationId: formData.locationId,
    lotNumber: formData.lotNumber,
  });

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
    setCreatedProject(null);
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
      // Auto-create Google Drive folders (non-blocking)
      try {
        const builder = builders.find((b) => b.id === formData.builderId);
        const location = locations.find((l) => l.id === formData.locationId);
        if (builder || location || formData.lotNumber) {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;
          if (accessToken && organizationId) {
            const res = await supabase.functions.invoke("create-drive-folders", {
              body: {
                builder_code: builder?.code || builder?.name || "",
                location_name: location?.name || "",
                lot_number: formData.lotNumber,
              },
            });
            if (res.data && !res.error) {
              const driveData = res.data;
              await supabase
                .from("projects")
                .update({
                  google_drive_url: driveData.folder_url,
                  google_drive_folder_id: driveData.folder_id,
                })
                .eq("id", projectId);
              if (driveData.subfolders?.length) {
                const mappings = driveData.subfolders.map((sf: any) => ({
                  project_id: projectId,
                  organization_id: organizationId,
                  category: sf.category,
                  drive_folder_id: sf.folder_id,
                }));
                await supabase.from("project_drive_folders").insert(mappings);
              }
            } else {
              console.warn("Drive folder creation failed:", res.error);
              toast.warning("Project created, but Google Drive folder setup failed. You can retry later.");
            }
          }
        }
      } catch (driveErr) {
        console.warn("Drive folder creation error:", driveErr);
        toast.warning("Project created, but Google Drive folder setup failed.");
      }

      invalidateProjectQueries(queryClient);

      // Build a display name for the success screen
      const builder = builders.find((b) => b.id === formData.builderId);
      const location = locations.find((l) => l.id === formData.locationId);
      const parts = [builder?.name, location?.name, formData.lotNumber].filter(Boolean);
      const projectName = parts.join(" – ") || formData.lotNumber;

      setCreatedProject({ id: projectId, name: projectName });
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleAddDocuments = () => {
    if (createdProject) {
      onAddDocuments?.(createdProject.id);
    }
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] md:max-w-lg max-h-[100dvh] md:max-h-[90dvh] overflow-y-auto rounded-none md:rounded-lg">
        {createdProject ? (
          /* Success State */
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold text-foreground">Project Created</h2>
              <p className="text-muted-foreground text-sm">{createdProject.name}</p>
            </div>
            <div className="flex flex-col w-full gap-3 px-4">
              <Button onClick={handleAddDocuments} className="w-full">
                Add Documents
              </Button>
              <Button variant="ghost" onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Form State */
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground">Add New Project</DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-4"
            >
              <ProjectFormFields
                formData={formData}
                onChange={handleChange}
                builders={builders}
                locations={locations}
                statuses={statuses}
              />

              {duplicate && (
                <DuplicateProjectWarning
                  builderName={builders.find((b) => b.id === formData.builderId)?.name || "Unknown"}
                  locationName={locations.find((l) => l.id === formData.locationId)?.name || "Unknown"}
                  lotNumber={formData.lotNumber}
                  isDeleted={!!duplicate.deleted_at}
                />
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={!formData.lotNumber || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
