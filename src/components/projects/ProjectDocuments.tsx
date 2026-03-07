import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { File, X, ExternalLink, CheckCircle, Upload, Loader2 } from "lucide-react";
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
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const dragCounters = useRef<Record<string, number>>({});
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

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

  const uploadToDrive = useCallback(
    async (file: globalThis.File, category: string, driveFolderId: string) => {
      if (!organizationId) throw new Error("No organization found");
      

      // Get access token
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("get-picker-token");
      if (tokenError || !tokenData?.access_token) {
        throw new Error("Failed to get Google Drive access");
      }

      // Build multipart body
      const metadata = JSON.stringify({
        name: file.name,
        parents: [driveFolderId],
      });

      const boundary = "----LovableBoundary" + Date.now();
      const delimiter = "\r\n--" + boundary + "\r\n";
      const closeDelimiter = "\r\n--" + boundary + "--";

      const metadataPart =
        delimiter +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        metadata;

      const fileBytes = new Uint8Array(await file.arrayBuffer());

      const encoder = new TextEncoder();
      const metaBytes = encoder.encode(
        metadataPart + delimiter + "Content-Type: " + (file.type || "application/octet-stream") + "\r\n\r\n"
      );
      const closeBytes = encoder.encode(closeDelimiter);

      const body = new Uint8Array(metaBytes.length + fileBytes.length + closeBytes.length);
      body.set(metaBytes, 0);
      body.set(fileBytes, metaBytes.length);
      body.set(closeBytes, metaBytes.length + fileBytes.length);

      const res = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: body.buffer,
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error("Drive upload failed:", errText);
        throw new Error("Google Drive upload failed");
      }

      const driveFile = await res.json();
      const driveFileUrl = `https://drive.google.com/file/d/${driveFile.id}/view`;

      // Save to project_documents
      const { error: dbError } = await supabase.from("project_documents").insert({
        organization_id: organizationId,
        project_id: projectId,
        category,
        file_name: driveFile.name || file.name,
        file_path: driveFileUrl,
        file_size: file.size,
        content_type: driveFile.mimeType || file.type || null,
        storage_type: "google_drive",
        drive_file_id: driveFile.id,
        drive_file_url: driveFileUrl,
      });

      if (dbError) throw dbError;
    },
    [organizationId, projectId]
  );

  const driveUploadMutation = useMutation({
    mutationFn: async ({ file, category, driveFolderId }: { file: globalThis.File; category: string; driveFolderId: string }) => {
      await uploadToDrive(file, category, driveFolderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });
      toast.success("Document uploaded to Google Drive");
      setUploadingCategory(null);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
      setUploadingCategory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: ProjectDocument) => {
      if (doc.storage_type === "google_drive" && doc.drive_file_id) {
        try {
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke("get-picker-token");
          if (tokenError || !tokenData?.access_token) {
            throw new Error("Failed to get Drive access");
          }
          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${doc.drive_file_id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${tokenData.access_token}` },
            }
          );
          if (!res.ok && res.status !== 404) {
            console.error("Drive delete failed:", res.status, await res.text());
            toast.warning("File removed from ECFI Hub but could not be removed from Google Drive.");
          }
        } catch (driveErr) {
          console.error("Drive delete error:", driveErr);
          toast.warning("File removed from ECFI Hub but could not be removed from Google Drive.");
        }
      } else if (!doc.storage_type || doc.storage_type === "supabase") {
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

  const handleFileDrop = useCallback(
    (category: string, files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      const driveFolder = getDriveFolderForCategory(category);
      if (!driveFolder) {
        toast.error("Drive folder not ready for this category. Please try again later.");
        return;
      }
      setUploadingCategory(category);
      driveUploadMutation.mutate({ file, category, driveFolderId: driveFolder.drive_folder_id });
    },
    [driveFolders, driveUploadMutation]
  );

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
          const isDragOver = dragOverCategory === cat.id;

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

              {!readOnly && driveFolder && (
                <div
                  className={`relative flex items-center justify-center gap-2 rounded-md border-2 border-dashed px-3 py-2 transition-colors cursor-pointer ${
                    isDragOver
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dragCounters.current[cat.id] = (dragCounters.current[cat.id] || 0) + 1;
                    setDragOverCategory(cat.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dragCounters.current[cat.id] = (dragCounters.current[cat.id] || 0) - 1;
                    if (dragCounters.current[cat.id] <= 0) {
                      dragCounters.current[cat.id] = 0;
                      setDragOverCategory(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dragCounters.current[cat.id] = 0;
                    setDragOverCategory(null);
                    if (!isUploading) {
                      handleFileDrop(cat.id, e.dataTransfer.files);
                    }
                  }}
                  onClick={() => {
                    if (isUploading) return;
                    const input = document.createElement("input");
                    input.type = "file";
                    input.onchange = () => handleFileDrop(cat.id, input.files);
                    input.click();
                  }}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Uploading…</span>
                    </>
                  ) : isDragOver ? (
                    <>
                      <Upload className="w-4 h-4 text-accent-foreground" />
                      <span className="text-xs text-accent-foreground font-medium">Release to upload</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Drop file or click to upload</span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      <ConfirmDialog
        open={!!documentToDelete}
        onOpenChange={(open) => !open && setDocumentToDelete(null)}
        title="Delete Document?"
        description={
          documentToDelete?.storage_type === "google_drive"
            ? `This will permanently delete "${documentToDelete?.file_name}" from both ECFI Hub and Google Drive. This cannot be undone.`
            : `Are you sure you want to delete "${documentToDelete?.file_name}"? This action cannot be undone.`
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </Card>
  );
}
