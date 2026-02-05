import { HardHat, Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center animate-pulse">
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