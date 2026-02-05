/**
 * Utility functions for crew color management.
 * Provides consistent colors for crews in calendar views.
 */

// Default crew colors palette - vibrant, distinguishable colors
export const CREW_COLOR_PALETTE = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f97316", // orange
  "#14b8a6", // teal
  "#a855f7", // purple
  "#eab308", // yellow
  "#6366f1", // indigo
];

/**
 * Generate a consistent color based on crew ID hash.
 * Used as fallback when crew doesn't have a custom color.
 */
export function getDefaultCrewColor(crewId: string): string {
  let hash = 0;
  for (let i = 0; i < crewId.length; i++) {
    const char = crewId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % CREW_COLOR_PALETTE.length;
  return CREW_COLOR_PALETTE[index];
}

/**
 * Get the color for a crew, using custom color if set, otherwise default.
 */
export function getCrewColor(crew: { id: string; color?: string | null }): string {
  return crew.color || getDefaultCrewColor(crew.id);
}

/**
 * Determine if text should be light or dark based on background color.
 */
export function getContrastTextColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");
  
  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? "#1f2937" : "#ffffff";
}
