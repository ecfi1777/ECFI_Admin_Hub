import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { File, X, ExternalLink, CheckCircle, Upload } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useOrganization } from "@/hooks/useOrganization";

const DOCUMENT_CATEGORIES = [
  { id: "permit_copy", label: "Permit Copy" },
  { id: "folder_copy_before", label: "Folder Copy - Before" },
  { id: "folder_copy_complete", label: "Folder Copy - Complete" },
  { id: "selection_sheet", label: "Selection Sheet" },
  { id: "purchase_order", label: "Purchase Order" },
  { id: "materials_list", label: "Materials List" },
  { id: "additional_documents", label: "Additional Project Documents" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface ProjectDocument {
  id: string;
  category: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  storage_type?: string;
  drive_file_id?: string | null;
  drive_file_url?: string | null;
}

interface DriveFolderMapping {
  category: string;
  drive_folder_id: string;
}

interface ProjectDocumentsProps {
  projectId: string;
  readOnly?: boolean;
}

export function ProjectDocuments({ projectId, readOnly = false }: ProjectDocumentsProps) {
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<ProjectDocument | null>(null);
  const [pickerReady, setPickerReady] = useState(false);
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  // Load Google Picker API
  useEffect(() => {
    if (document.getElementById("gapi-script")) {
      if (window.gapi) {
        window.gapi.load("picker", () => setPickerReady(true));
      }
      return;
    }
    const script = document.createElement("script");
    script.id = "gapi-script";
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      window.gapi.load("picker", () => setPickerReady(true));
    };
    document.body.appendChild(script);
  }, []);

  const { data: documents = [] } = useQuery({
    queryKey: ["project-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectDocument[];
    },
  });

  // Fetch drive folder mappings
  const { data: driveFolders = [] } = useQuery({
    queryKey: ["project-drive-folders", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_drive_folders")
        .select("category, drive_folder_id")
        .eq("project_id", projectId);
      if (error) throw error;
      return data as DriveFolderMapping[];
    },
  });

  const getDriveFolderForCategory = (category: string) =>
    driveFolders.find((df) => df.category === category);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category }: { file: File; category: string }) => {
      if (!organizationId) throw new Error("No organization found");
      if (file.size > MAX_FILE_SIZE) throw new Error("File exceeds 10 MB limit");
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
        storage_type: "supabase",
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });
      toast.success("Document uploaded");
      setUploadingCategory(null);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
      setUploadingCategory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: ProjectDocument) => {
      // Only delete from storage if it's a Supabase file
      if (!doc.storage_type || doc.storage_type === "supabase") {
        const { error: storageError } = await supabase.storage
          .from("project-documents")
          .remove([doc.file_path]);
        if (storageError) throw storageError;
      }

      const { error: dbError } = await supabase
        .from("project_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-documents-all"] });
      toast.success("Document deleted");
      setDocumentToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
      setDocumentToDelete(null);
    },
  });

  const handleDeleteConfirm = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete);
    }
  };

  const handleFileSelect = useCallback(
    (category: string, file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File exceeds 10 MB limit");
        return;
      }
      setUploadingCategory(category);
      uploadMutation.mutate({ file, category });
    },
    [uploadMutation]
  );

  const openDrivePicker = async (category: string, driveFolderId: string) => {
    if (!pickerReady) {
      toast.error("Google Picker is still loading. Please try again.");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("get-picker-token");
      if (error || !data?.access_token) {
        toast.error("Failed to get Google Drive access");
        return;
      }

      const view = new window.google.picker.DocsUploadView();
      view.setParent(driveFolderId);

      let pickerInstance: google.picker.Picker | null = null;

      const disposePicker = () => {
        if (pickerInstance) {
          pickerInstance.dispose();
          pickerInstance = null;
        }
      };

      pickerInstance = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(data.access_token)
        .setDeveloperKey(data.api_key)
        .setCallback(async (pickerData: google.picker.PickerCallbackData) => {
          if (pickerData.action === "picked" && pickerData.docs?.length) {
            for (const doc of pickerData.docs) {
              if (doc.sizeBytes && doc.sizeBytes > MAX_FILE_SIZE) {
                toast.error(`${doc.name} exceeds 10 MB limit`);
                continue;
              }
              try {
                const { error: dbError } = await supabase.from("project_documents").insert({
                  organization_id: organizationId!,
                  project_id: projectId,
                  category,
                  file_name: doc.name,
                  file_path: doc.url,
                  file_size: doc.sizeBytes || null,
                  content_type: doc.mimeType || null,
                  storage_type: "google_drive",
                  drive_file_id: doc.id,
                  drive_file_url: doc.url,
                });
                if (dbError) throw dbError;
              } catch (err) {
                toast.error(`Failed to save ${doc.name}`);
              }
            }
            queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });
            toast.success("Document(s) uploaded to Google Drive");
            disposePicker();
          } else if (pickerData.action === "cancel") {
            disposePicker();
          }
        })
        .setTitle(`Upload to ${DOCUMENT_CATEGORIES.find((c) => c.id === category)?.label}`)
        .build();

      pickerInstance.setVisible(true);
    } catch (err) {
      console.error("Picker error:", err);
      toast.error("Failed to open Google Drive picker");
    }
  };

  const openDocument = async (doc: ProjectDocument) => {
    if (doc.storage_type === "google_drive" && doc.drive_file_url) {
      window.open(doc.drive_file_url, "_blank");
    } else {
      const { data } = await supabase.storage
        .from("project-documents")
        .createSignedUrl(doc.file_path, 3600);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    }
  };

  const getDocsForCategory = (category: string) =>
    documents.filter((d) => d.category === category);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground text-lg">Project Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {DOCUMENT_CATEGORIES.map((cat) => {
          const categoryDocs = getDocsForCategory(cat.id);
          const isUploading = uploadingCategory === cat.id;
          const hasDoc = categoryDocs.length > 0;
          const driveFolder = getDriveFolderForCategory(cat.id);

          return (
            <div key={cat.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm font-medium">{cat.label}</span>
                {hasDoc && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>

              {categoryDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 p-2 bg-muted rounded-md"
                >
                  <File className="w-4 h-4 text-primary flex-shrink-0" />
                  <span
                    className="text-foreground text-sm flex-1 truncate cursor-pointer hover:text-primary"
                    onClick={() => openDocument(doc)}
                  >
                    {doc.file_name}
                    {doc.storage_type === "google_drive" && (
                      <span className="ml-1 text-xs text-muted-foreground">(Drive)</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDocument(doc)}
                    className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDocumentToDelete(doc)}
                      disabled={deleteMutation.isPending}
                      className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}

              {!readOnly && driveFolder && pickerReady && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openDrivePicker(cat.id, driveFolder.drive_folder_id)}
                  className="text-xs"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Upload to Drive
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>

      <ConfirmDialog
        open={!!documentToDelete}
        onOpenChange={(open) => !open && setDocumentToDelete(null)}
        title="Delete Document?"
        description={`Are you sure you want to delete "${documentToDelete?.file_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
      />
    </Card>
  );
}
