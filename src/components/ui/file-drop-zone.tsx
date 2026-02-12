import { useState, useRef, useCallback } from "react";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  className?: string;
}

export function FileDropZone({ onFileSelect, isUploading = false, className }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 600);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onFileSelect(file);
    };
    input.click();
  }, [onFileSelect]);

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-md p-3 text-center cursor-pointer transition-all duration-200",
        "border-slate-600 hover:border-amber-500",
        isDragOver && "!border-solid !border-accent bg-accent/10",
        showSuccess && "!border-solid !border-green-500 bg-green-500/10",
        className
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {isUploading ? (
        <div className="flex items-center justify-center gap-2 text-amber-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Uploading...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 text-slate-400 transition-colors duration-200">
          <Upload
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isDragOver && "scale-110 text-accent",
              showSuccess && "text-green-500"
            )}
          />
          <span className={cn("text-sm", isDragOver && "text-accent", showSuccess && "text-green-500")}>
            {showSuccess
              ? "File received!"
              : isDragOver
                ? "Release to upload"
                : "Drop file or click to upload"}
          </span>
        </div>
      )}
    </div>
  );
}
