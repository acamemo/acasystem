import { useEffect, useState, type RefObject } from 'react';
import { afterNextFrame } from '@/utils/launcher/afterFrame';
import { afterTransition, canAnimate, prefersReducedMotion } from '@/utils/launcher/motion';

/**
 * The shape of a widget that is being resized (REP-20261023-006, D-M6, with the user's answer of
 * 2026-10-23): a flat cell with a dashed edge and no content, built by the frame every widget
 * already has, never inside a widget. The widget's own face (shadow included) and its content go in
 * `SHAPE_CLEAR_MS`; the shape stays up for the gesture; at the end it gives the face and the
 * content back with a fade of --aca-dur-reveal.
 *
 * The cost this is meant to take away is the widget laid out again, cell by cell, with its
 * observers. So the order is:
 *   1. `clearing`: the face fades out, and the box does not change size yet (`holding`): the first
 *      new measure waits for the content to be gone (at most `SHAPE_CLEAR_MS`);
 *   2. `shaped`: the content is skipped by the browser (`skipped`: content-visibility: hidden, no
 *      layout, no paint, no observers) and the box follows the cell under the finger;
 *   3. `settling`: the finger is up; the box reaches its last size (a refused drop goes back to
 *      the old one) with the content still skipped; whether that size still runs is asked two
 *      frames after the commit, never in it (a finger lifted before step 2 skips nothing);
 *   4. `waking`: the content is laid out once, at its final size, still transparent; its observers
 *      measure and commit; two frames later the shape ends and the face fades in.
 * The caller starts the shape at the first change of cell and keeps it to the end of the gesture
 * (WidgetHost): a small move that changes no cell leaves the widget alone.
 * Where nothing animates (jsdom) or with reduced motion there is no wait: the shape is up for the
 * gesture and goes with it (reduced motion keeps the fade of 120 ms).
 */

/** The face of the widget fades out in --aca-dur-clear (tokens.css). */
export const SHAPE_CLEAR_MS = 100;
/** The longest a box takes to reach its last size after the finger is up (a refused drop). */
export const SHAPE_SETTLE_MS = 240;

type Phase = 'idle' | 'clearing' | 'shaped' | 'settling' | 'waking';

export interface ResizeShape {
  /** The flat shape is up and the face of the widget is out. */
  shaped: boolean;
  /** The content is skipped by the browser. */
  skipped: boolean;
  /** The box stays at its saved size: the content has not gone yet. */
  holding: boolean;
}

const SIZE_PROPERTIES = ['width', 'height', 'translate'] as const;

/** True while a size or position of `host` still runs as a transition. */
function sizeRuns(host: HTMLElement | null): boolean {
  const animations = host?.getAnimations?.() ?? [];
  return animations.some((animation) => {
    const property = (animation as Animation & { transitionProperty?: string }).transitionProperty;
    return property !== undefined && (SIZE_PROPERTIES as readonly string[]).includes(property);
  });
}

export function useResizeShape(
  resizing: boolean,
  hostRef: RefObject<HTMLElement | null>
): ResizeShape {
  const [phase, setPhase] = useState<Phase>('idle');
  const [seen, setSeen] = useState(resizing);
  // Evaluated at every render, like the media query it reads: cheap, and never stale.
  const staged = canAnimate() && !prefersReducedMotion();
  if (seen !== resizing) {
    setSeen(resizing);
    // A finger lifted while the face was still going has skipped nothing: the content wakes.
    if (staged) {
      setPhase(
        resizing
          ? 'clearing'
          : phase === 'idle'
            ? 'idle'
            : phase === 'clearing'
              ? 'waking'
              : 'settling'
      );
    } else if (phase !== 'idle') setPhase('idle');
  }

  useEffect(() => {
    if (phase !== 'clearing') return undefined;
    const timer = setTimeout(() => setPhase('shaped'), SHAPE_CLEAR_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'settling') return undefined;
    // The box reaches its last size by the transition it already runs; nothing runs, nothing waits.
    // It is asked two frames after the commit of the release, when the style is clean: the commit
    // itself forces no new style (ISSUE-109, R7).
    let stopWaiting: () => void = () => undefined;
    const stopFrames = afterNextFrame(() => {
      const host = hostRef.current;
      if (!sizeRuns(host)) {
        setPhase('waking');
        return;
      }
      stopWaiting = afterTransition(host, SIZE_PROPERTIES, SHAPE_SETTLE_MS, () =>
        setPhase('waking')
      );
    });
    return () => {
      stopFrames();
      stopWaiting();
    };
  }, [phase, hostRef]);

  useEffect(() => {
    if (phase !== 'waking') return undefined;
    // The content is laid out in this commit (skipped is off); its observers measure in the next
    // update of the rendering and commit; the shape goes after them.
    return afterNextFrame(() => setPhase('idle'));
  }, [phase]);

  const live = phase === 'idle' ? resizing : true;
  return {
    shaped: live,
    skipped: staged && (phase === 'shaped' || phase === 'settling'),
    holding: staged && phase === 'clearing' && resizing,
  };
}
