import { AlertTriangle } from "lucide-react";

interface DuplicateProjectWarningProps {
  builderName: string;
  locationName: string;
  lotNumber: string;
  isDeleted: boolean;
}

export function DuplicateProjectWarning({
  builderName,
  locationName,
  lotNumber,
  isDeleted,
}: DuplicateProjectWarningProps) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm">
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>
        {isDeleted
          ? `A deleted project for ${builderName} at ${locationName}, Lot ${lotNumber} was found. Consider restoring it instead of creating a new one.`
          : `A project for ${builderName} at ${locationName}, Lot ${lotNumber} already exists. Please verify this is not a duplicate.`}
      </span>
    </div>
  );
}
