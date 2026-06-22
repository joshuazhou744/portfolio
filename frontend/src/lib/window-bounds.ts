/**
 * Shared drag-bounds logic for all draggable desktop windows.
 *
 * Windows may overflow off the left, right, and bottom edges of the viewport,
 * but never off the top — the title bar is the drag handle, so it must always
 * stay reachable. The amount a window may hang off an edge is proportional to
 * its own size, so large and small windows behave consistently.
 */

/** Fraction of a window that must remain on-screen when dragged toward an edge. */
export const MIN_VISIBLE_RATIO = 0.4;

export interface Position {
  x: number;
  y: number;
}

/**
 * Clamp a proposed window position so at least `MIN_VISIBLE_RATIO` of the
 * window stays visible on the left, right, and bottom, with the top pinned to 0.
 */
export function constrainWindowPosition(
  x: number,
  y: number,
  windowWidth: number,
  windowHeight: number,
  viewportWidth: number,
  viewportHeight: number
): Position {
  const visibleW = windowWidth * MIN_VISIBLE_RATIO;
  const visibleH = windowHeight * MIN_VISIBLE_RATIO;

  return {
    // left: window can slide off until only `visibleW` remains on the right
    // right: window can slide off until only `visibleW` remains on the left
    x: Math.min(Math.max(x, -(windowWidth - visibleW)), viewportWidth - visibleW),
    // top pinned to 0; bottom can slide off until only `visibleH` remains
    y: Math.min(Math.max(y, 0), viewportHeight - visibleH),
  };
}
