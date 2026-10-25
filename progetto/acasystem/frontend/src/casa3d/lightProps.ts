import type { Casa3dQuality } from './quality';

/**
 * What the host sets on the 3D view (ADR-0014, T1, T5): the heavy extras are off at every level
 * (they need data and commands that arrive with later steps) and `quality` is the level. Light is
 * lighter than the tablet level of the original demo. Shared by the development page and the
 * launcher page, so the two cannot drift apart.
 */
export const LIGHT_PROPS = {
  quality: 'light',
  holograms: false,
  flows: false,
  showEnergy: false,
  weather: false,
  trail: false,
  cameraWall: false,
  director: false,
  voice: false,
  // the floor pictures read the canvas back (a GPU stall): not in Light, and there is one floor here
  floorThumbs: false,
} as const;

/**
 * Properties of the view for a level. Above Light the view also sends its statistics, so the page
 * can offer to go back to Light when the drawing stays slow (no cost in Light).
 */
export function viewProps(quality: Casa3dQuality) {
  return { ...LIGHT_PROPS, quality, statsEvents: quality !== 'light' };
}
