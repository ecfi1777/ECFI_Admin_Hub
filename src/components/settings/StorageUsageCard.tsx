import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HardDrive, Database } from "lucide-react";

// Update these if the plan changes
const DB_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB
const FILE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getProgressColor(percent: number): string {
  if (percent >= 90) return "bg-destructive";
  if (percent >= 70) return "bg-yellow-500";
  return "bg-primary";
}

export function StorageUsageCard() {
  const { isOwner } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ["storage-usage"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_storage_usage");
      if (error) throw error;
      return data as { db_bytes?: number; file_bytes?: number; error?: string };
    },
    enabled: isOwner,
    staleTime: 5 * 60 * 1000,
  });

  if (!isOwner) return null;

  const dbBytes = data?.db_bytes ?? 0;
  const fileBytes = data?.file_bytes ?? 0;
  const dbPercent = Math.min((dbBytes / DB_LIMIT_BYTES) * 100, 100);
  const filePercent = Math.min((fileBytes / FILE_LIMIT_BYTES) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          <CardTitle>Storage Usage</CardTitle>
        </div>
        <CardDescription>Current storage consumption for your organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded" />
          </div>
        ) : data?.error ? (
          <p className="text-sm text-muted-foreground">Unable to load storage usage.</p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Database className="w-4 h-4" />
                  Database Storage
                </span>
                <span className="text-muted-foreground">
                  {formatBytes(dbBytes)} / {formatBytes(DB_LIMIT_BYTES)} ({dbPercent.toFixed(1)}%)
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${getProgressColor(dbPercent)}`}
                  style={{ width: `${dbPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <HardDrive className="w-4 h-4" />
                  File Storage
                </span>
                <span className="text-muted-foreground">
                  {formatBytes(fileBytes)} / {formatBytes(FILE_LIMIT_BYTES)} ({filePercent.toFixed(1)}%)
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${getProgressColor(filePercent)}`}
                  style={{ width: `${filePercent}%` }}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
