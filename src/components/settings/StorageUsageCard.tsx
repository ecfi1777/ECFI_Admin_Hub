import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HardDrive, FileBox } from "lucide-react";

// Plan limits — update these if the plan changes
const DB_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB
const FILE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getBarColor(percent: number): string {
  if (percent >= 90) return "bg-destructive";
  if (percent >= 70) return "bg-yellow-500";
  return "bg-primary";
}

function UsageRow({ label, icon: Icon, usedBytes, limitBytes }: {
  label: string;
  icon: React.ElementType;
  usedBytes: number;
  limitBytes: number;
}) {
  const percent = Math.min((usedBytes / limitBytes) * 100, 100);
  const barColor = getBarColor(percent);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {label}
        </span>
        <span className="text-muted-foreground">
          {formatBytes(usedBytes)} / {formatBytes(limitBytes)} — {percent.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function StorageUsageCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["storage-usage"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_storage_usage" as any);
      if (error) throw error;
      return data as { db_bytes: number; file_bytes: number };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          <CardTitle>Storage Usage</CardTitle>
        </div>
        <CardDescription>Current database and file storage usage for your plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-full" />
          </div>
        ) : data && !("error" in data) ? (
          <>
            <UsageRow label="Database" icon={HardDrive} usedBytes={data.db_bytes} limitBytes={DB_LIMIT_BYTES} />
            <UsageRow label="File Storage" icon={FileBox} usedBytes={data.file_bytes} limitBytes={FILE_LIMIT_BYTES} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load storage usage.</p>
        )}
      </CardContent>
    </Card>
  );
}
