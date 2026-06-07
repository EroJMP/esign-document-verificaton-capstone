/**
 * PDF-related constants used across the application
 */

// The scale factor used by PDFViewer to render PDF documents
// This affects how coordinates are calculated for field placement
export const PDF_DISPLAY_SCALE = 1.5;

/**
 * Convert display coordinates (scaled) to actual PDF coordinates
 */
export function displayToActualCoordinates(displayX: number, displayY: number, displayWidth: number, displayHeight: number) {
  return {
    x: Math.round(displayX / PDF_DISPLAY_SCALE),
    y: Math.round(displayY / PDF_DISPLAY_SCALE),
    width: Math.round(displayWidth / PDF_DISPLAY_SCALE),
    height: Math.round(displayHeight / PDF_DISPLAY_SCALE)
  };
}

/**
 * Convert actual PDF coordinates to display coordinates (scaled)
 */
export function actualToDisplayCoordinates(actualX: number, actualY: number, actualWidth: number, actualHeight: number) {
  return {
    x: actualX * PDF_DISPLAY_SCALE,
    y: actualY * PDF_DISPLAY_SCALE,
    width: actualWidth * PDF_DISPLAY_SCALE,
    height: actualHeight * PDF_DISPLAY_SCALE
  };
}
