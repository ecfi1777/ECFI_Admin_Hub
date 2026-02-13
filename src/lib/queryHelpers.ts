import { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate all project-related query caches.
 * Call after any project create/update/delete/archive/restore mutation.
 */
export function invalidateProjectQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["projects"] });
  queryClient.invalidateQueries({ queryKey: ["projects-all"] });
  queryClient.invalidateQueries({ queryKey: ["deleted-projects"] });
  queryClient.invalidateQueries({ queryKey: ["kanban-projects"] });
  queryClient.invalidateQueries({ queryKey: ["project-documents-all"] });
  queryClient.invalidateQueries({ queryKey: ["schedule-entries"] });
  queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
}

/**
 * Invalidate all schedule-entry-related query caches.
 * Call after any schedule entry create/update/delete/move mutation.
 */
export function invalidateScheduleQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["schedule-entries"] });
  queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
  queryClient.invalidateQueries({ queryKey: ["projects"] });
  queryClient.invalidateQueries({ queryKey: ["projects-all"] });
  queryClient.invalidateQueries({ queryKey: ["kanban-projects"] });
}
