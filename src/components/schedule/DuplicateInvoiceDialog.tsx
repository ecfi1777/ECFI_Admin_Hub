import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { InvoiceConflict } from "@/hooks/useDuplicateInvoiceCheck";

interface DuplicateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: InvoiceConflict[];
  onConfirm: () => void;
}

export function DuplicateInvoiceDialog({
  open,
  onOpenChange,
  conflicts,
  onConfirm,
}: DuplicateInvoiceDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate Bill Number</AlertDialogTitle>
          <AlertDialogDescription>
            {conflicts.length === 1 ? (
              <>
                A {conflicts[0].label} bill with invoice number "{conflicts[0].value}" already exists. Do you want to continue?
              </>
            ) : (
              <>
                <span className="block">
                  The following invoice numbers already exist. Do you want to continue?
                </span>
                <span className="block mt-2 space-y-1">
                  {conflicts.map((conflict) => (
                    <span key={`${conflict.label}-${conflict.value}`} className="block">
                      A {conflict.label} bill with invoice number "{conflict.value}" already exists.
                    </span>
                  ))}
                </span>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Add Anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
