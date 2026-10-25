/**
 * The helpers live in the primitives layer (the sheet needs them and primitives import nothing from
 * higher layers); this module keeps the launcher import path.
 */
export {
  TWO_FRAMES_MS,
  afterAnimation,
  afterTransition,
  canAnimate,
  prefersReducedMotion,
} from '@/components/primitives/motion';
