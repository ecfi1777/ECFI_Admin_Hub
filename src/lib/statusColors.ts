/**
 * Returns the appropriate Tailwind CSS classes for a project status badge.
 * This is a shared utility to avoid duplicating status color logic.
 */
export function getStatusColor(status: string | undefined): string {
  switch (status) {
    case "Upcoming":
      return "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "Ready to Start":
      return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30";
    case "In Progress":
      return "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30";
    case "Ready to Invoice":
      return "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "Invoice Complete - Archive":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
