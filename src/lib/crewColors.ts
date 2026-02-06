/**
 * Utility functions for crew color management.
 * Provides consistent colors for crews in calendar views.
 */

// Default crew colors palette - high-contrast, distinguishable colors
// Ordered to match common crew names: 800=Blue, 1200=Green, R&D=Orange, Nelson=Purple, ECFI=Teal
export const CREW_COLOR_PALETTE = [
  "#3b82f6", // Blue (800)
  "#22c55e", // Green (1200)
  "#f97316", // Orange (R&D)
  "#a855f7", // Purple (Nelson)
  "#14b8a6", // Teal (ECFI)
  "#ec4899", // Pink (6th crew)
  "#eab308", // Yellow (7th crew)
  "#ef4444", // Red (8th crew)
  "#6366f1", // Indigo (9th crew)
  "#06b6d4", // Cyan (10th crew)
  "#84cc16", // Lime (11th crew)
  "#f43f5e", // Rose (12th crew)
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
 * Get the next available color from the palette for a new crew.
 * Takes array of existing crew colors and returns the first unused color.
 */
export function getNextAvailableColor(existingColors: (string | null)[]): string {
  const usedColors = new Set(existingColors.filter(Boolean).map(c => c?.toLowerCase()));
  
  for (const color of CREW_COLOR_PALETTE) {
    if (!usedColors.has(color.toLowerCase())) {
      return color;
    }
  }
  
  // All colors used, return first one
  return CREW_COLOR_PALETTE[0];
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
