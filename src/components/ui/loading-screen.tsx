import { HardHat, Loader2 } from "lucide-react";
import { Skeleton } from "./skeleton";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <HardHat className="w-10 h-10 text-primary-foreground" />
          </div>
          <div className="absolute -bottom-1 -right-1">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        </div>
        <p className="text-muted-foreground text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );
}

// Schedule page skeleton - matches the actual layout structure
export function SchedulePageSkeleton() {
  return (
    <div className="p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      {/* Crew cards skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg">
            <div className="py-3 px-4 flex items-center justify-between border-b border-border">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 flex-1" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 flex-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Projects page skeleton
export function ProjectsPageSkeleton() {
  return (
    <div className="p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-card border border-border rounded-lg">
        <div className="border-b border-border">
          <div className="flex gap-4 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex gap-4 p-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Generic table skeleton for invoices, discrepancies, etc.
export function TablePageSkeleton() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="border-b border-border p-4">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="flex gap-4 p-4">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
