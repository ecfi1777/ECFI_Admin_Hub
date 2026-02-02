import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, X, Loader2, ExternalLink, CheckCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
}

interface ProjectDocumentsProps {
  projectId: string;
}

export function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<ProjectDocument | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category }: { file: File; category: string }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${projectId}/${category}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("project_documents").insert({
        project_id: projectId,
        category,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });
      toast({ title: "Document uploaded" });
      setUploadingCategory(null);
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploadingCategory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: ProjectDocument) => {
      const { error: storageError } = await supabase.storage
        .from("project-documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("project_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-documents-all"] });
      toast({ title: "Document deleted" });
      setDocumentToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
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
      setUploadingCategory(category);
      uploadMutation.mutate({ file, category });
    },
    [uploadMutation]
  );

  const handleDrop = useCallback(
    (category: string, e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(category, file);
      }
    },
    [handleFileSelect]
  );

  const getDocumentUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(filePath, 3600);
    return data?.signedUrl;
  };

  const openDocument = async (doc: ProjectDocument) => {
    const url = await getDocumentUrl(doc.file_path);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const getDocsForCategory = (category: string) =>
    documents.filter((d) => d.category === category);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white text-lg">Project Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {DOCUMENT_CATEGORIES.map((cat) => {
          const categoryDocs = getDocsForCategory(cat.id);
          const isUploading = uploadingCategory === cat.id;
          const hasDoc = categoryDocs.length > 0;

          return (
            <div key={cat.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm font-medium">{cat.label}</span>
                {hasDoc && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
              
              {categoryDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 p-2 bg-slate-700 rounded-md"
                >
                  <File className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span
                    className="text-white text-sm flex-1 truncate cursor-pointer hover:text-amber-500"
                    onClick={() => openDocument(doc)}
                  >
                    {doc.file_name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDocument(doc)}
                    className="text-slate-400 hover:text-white h-6 w-6 p-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDocumentToDelete(doc)}
                    disabled={deleteMutation.isPending}
                    className="text-slate-400 hover:text-red-400 h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}

              <div
                className="border-2 border-dashed border-slate-600 rounded-md p-3 text-center cursor-pointer hover:border-amber-500 transition-colors"
                onDrop={(e) => handleDrop(cat.id, e)}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileSelect(cat.id, file);
                  };
                  input.click();
                }}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2 text-amber-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Drop file or click to upload</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      {/* Delete Confirmation Dialog */}
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
