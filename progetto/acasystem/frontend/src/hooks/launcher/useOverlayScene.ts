import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { flushSync } from 'react-dom';
import { afterNextFrame } from '@/utils/launcher/afterFrame';
import { afterAnimation, afterTransition, canAnimate } from '@/utils/launcher/motion';

/**
 * Times of Sistema, mirrored from `--aca-dur-system-in` / `-out` (tokens.css; a test keeps them
 * equal): in 140 ms, out 96 ms. They were 240 and 160 until the tracing of 2026-10-24 found the
 * fade over the launcher costly on the tablet (two full-screen layers composed for 400 ms); the
 * user chose the same fade, shorter.
 */
export const SYSTEM_IN_MS = 140;
export const SYSTEM_OUT_MS = 96;

/**
 * Where the scene of a full page over the launcher is (REP-20261023-006, D-M12):
 *
 * - `none`: no page;
 * - `wait`: the page is mounted, still transparent, the launcher is under it, untouched; the cost
 *   of mounting is paid here, before any movement (D-M25);
 * - `in`: it fades in, with a scale of 4 % (an animation of the layer, which waited at scale 1);
 * - `on`: it is there; the launcher is covered and stopped;
 * - `out-wait`: it is asked to leave; the launcher has been shown again and its widgets woken up
 *   under the page, which is still opaque, so that the cost of the return falls out of sight;
 * - `out`: it fades away, and goes at the end.
 */
export type OverlayPhase = 'none' | 'wait' | 'in' | 'on' | 'out-wait' | 'out';

/**
 * The phase of the scene the page of the overlay is in, for what in it can wait until the page is
 * there (`useSceneReached`). Where there is no scene (the house, a test) it is `on`.
 */
export const OverlayPhaseContext = createContext<OverlayPhase>('on');

/**
 * True once the scene of the page has reached `on` (a frame later: the fade is over and drawn),
 * and from then on. What is costly to start (the map of Posizione: Leaflet takes 60 ms to create)
 * starts here and not inside the fade, where it took a frame of the fade (0.9.28, tracing of
 * 2026-10-24). Without a scene it is true at once.
 */
export function useSceneReached(): boolean {
  const phase = useContext(OverlayPhaseContext);
  const [reached, setReached] = useState(phase === 'on');
  useEffect(() => {
    if (reached || phase !== 'on') return undefined;
    return afterNextFrame(() => setReached(true));
  }, [phase, reached]);
  return reached;
}

export interface OverlayScene {
  phase: OverlayPhase;
  /** What to draw: the page of the overlay, or the one that is leaving. */
  node: ReactNode;
  /** True when the page is drawn in a scene (it has a wrapper that fades); false: as it is. */
  staged: boolean;
  /** The launcher is hidden and its widgets stopped: only once the page is fully there. */
  covered: boolean;
  /** To put on the element that fades, to listen to its transitions. */
  sceneRef: RefObject<HTMLDivElement | null>;
}

/**
 * Keeps a full page over the launcher through a scene that fades it in and out. Without `staged`
 * (the house) or where nothing animates (jsdom, `canAnimate`) the page is there or not, as before.
 * A scene ends at the first of the end of its animation (in) or of the transition of `opacity`
 * (out), or a cap of its time plus two frames (P1): nothing waits for an event that may not come.
 */
export function useOverlayScene(overlay: ReactNode, staged: boolean): OverlayScene {
  const present = Boolean(overlay);
  const animated = canAnimate();
  const [phase, setPhase] = useState<OverlayPhase>(present ? 'on' : 'none');
  const [wasPresent, setWasPresent] = useState(present);
  const [wasStaged, setWasStaged] = useState(staged);
  const sceneRef = useRef<HTMLDivElement | null>(null);

  // The page that leaves is the last one that was there, with the look it had.
  const lastNode = useRef<ReactNode>(overlay);
  const lastStaged = useRef(staged);
  useLayoutEffect(() => {
    if (overlay) {
      lastNode.current = overlay;
      lastStaged.current = staged;
    }
  });

  if (wasPresent !== present) {
    setWasPresent(present);
    if (present) {
      if (staged && animated) setPhase(phase === 'out-wait' || phase === 'out' ? 'in' : 'wait');
      else setPhase('on');
    } else if (lastStaged.current && animated) {
      // From the middle of the way in it goes back from where it is: nothing is covered yet.
      if (phase === 'in') setPhase('out');
      else if (phase === 'wait') setPhase('none');
      else setPhase('out-wait');
    } else {
      setPhase('none');
    }
  }
  if (wasStaged !== staged) {
    setWasStaged(staged);
    // Another page takes the place (Sistema to the house): no scene is left half way.
    if (present && !staged && phase !== 'on') setPhase('on');
  }

  // The steps of the scene that start in a frame (wait to in, out-wait to out) are committed with
  // `flushSync` so that they meet the restyle of that frame. They render the host, which keeps the
  // launcher as an element of its own (LauncherPage): only `covered` reaches the launcher, so these
  // two steps render the layer and nothing under it (0.9.28, measurement of 2026-10-23).
  useEffect(() => {
    if (phase === 'wait') {
      return afterNextFrame(() =>
        flushSync(() => setPhase((current) => (current === 'wait' ? 'in' : current)))
      );
    }
    if (phase === 'in') {
      // The way in is a CSS animation (appShell.css, `aca-system-in`): its end is `animationend`.
      return afterAnimation(
        sceneRef.current,
        ['aca-system-in', 'aca-system-in-reduced'],
        SYSTEM_IN_MS,
        () => setPhase((current) => (current === 'in' ? 'on' : current))
      );
    }
    if (phase === 'out-wait') {
      return afterNextFrame(() =>
        flushSync(() => setPhase((current) => (current === 'out-wait' ? 'out' : current)))
      );
    }
    if (phase === 'out') {
      return afterTransition(sceneRef.current, ['opacity'], SYSTEM_OUT_MS, () =>
        setPhase((current) => (current === 'out' ? 'none' : current))
      );
    }
    return undefined;
  }, [phase]);

  const leaving = phase === 'out-wait' || phase === 'out';
  const node = present ? overlay : leaving ? lastNode.current : null;
  return {
    phase,
    node,
    staged: present ? staged : leaving,
    covered: present && phase === 'on',
    sceneRef,
  };
}
