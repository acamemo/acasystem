/**
 * The live 3D view inside the house screen (ADR-0014, R1), loaded only when the screen decides to
 * create it (CasaScreen). It exists while it is mounted: removing it disposes the renderer. It
 * draws the plan the screen gives it (the server's) and never saves it: the plan is handed to the
 * adapter as the host's own, read-only one. Read-only, but in Esplora (T7): the adapter refuses
 * every command unless the screen's barrier (`commandGate`) is open (and the switch of
 * commandSwitch.ts is on, which it is not until R7), and then sends only the services of the
 * closed list, asking first for the risky ones (commandPath.ts). The level is the page's (Light, Medium
 * or High, T5), set with the other properties before the element connects. The view reports the
 * state of its drawing context and, above Light, its statistics: a long slow stretch is passed up
 * so the page can offer Light again. A new `generation` makes the element again (a new context).
 */
import {
  createElement,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import { Body, Button } from '@/components/primitives';
import type { Casa3dContextEvent, Casa3dStats } from './contract';
import { viewProps } from './lightProps';
import type { Casa3dQuality } from './quality';
import { useCasa3dBundle } from './useCasa3dBundle';
import { casa3dCommandsEnabled } from './commandSwitch';
import { useCasa3dCommands } from './useCasa3dCommands';
import { useCasa3dHass } from './useCasa3dHass';

/** No packs of furniture (a stable value, so React does not set the property again). */
const NO_PACKS: readonly never[] = [];

/** No barrier given (the view alone, a test): commands stay refused. */
const CLOSED = () => false;

/** The canvas is made once the viewer exists; waiting for it takes at most this long. */
const CANVAS_WAIT_MS = 20_000;

/** Below this many frames per second, while the picture moves, the drawing counts as slow. */
export const SLOW_FPS = 20;
/** This many slow reports in a row (about half a second each) make the page offer Light. */
export const SLOW_REPORTS = 8;

/** What the screen can ask of the view besides its properties. */
export interface Casa3dVistaHandle {
  /** Puts the camera back where the house starts (the element's own `resetView`). */
  resetView: () => void;
  /** Zooms in (1) or out (-1) as one turn of the mouse wheel would; false when there is no view yet. */
  zoom: (direction: 1 | -1) => boolean;
}

/** One notch of the wheel, in pixels (the viewer reads `deltaY` of a pixel wheel as 0.0015 per pixel). */
const KEY_ZOOM_DELTA = 120;

export interface Casa3dVistaProps {
  /** The plan to draw, as the server keeps it. The view never saves it. */
  building: Record<string, unknown>;
  /** Its revision, for the adapter. */
  revision?: number;
  /** One floor, or null for the whole house. */
  floorId?: string | null;
  /** Reaches the view from outside: reset the camera, zoom from the keyboard. */
  handleRef?: Ref<Casa3dVistaHandle>;
  /** Not on screen: hidden, so the view draws nothing. */
  paused: boolean;
  /** True once the canvas exists, false when the view goes away. */
  onReadyChange: (ready: boolean) => void;
  quality: Casa3dQuality;
  /** The element is made again when this changes (after the drawing context was lost). */
  generation?: number;
  /** The state of the drawing context: lost, restored, or none could be made. */
  onContextState?: (event: Casa3dContextEvent) => void;
  /** The drawing stayed slow above Light for a while. */
  onSlow?: () => void;
  /** Esplora is on and the view takes commands (a render value: the role and the label follow it). */
  commandsOn?: boolean;
  /** The barrier of the page, read at every call: true only in Esplora, still, on screen. */
  commandGate?: () => boolean;
}

/** The two events of the element that the page listens to. */
type ViewEvents = 'context-state' | 'stats';

export default function Casa3dVista({
  building,
  revision = 1,
  floorId = null,
  handleRef,
  paused,
  onReadyChange,
  quality,
  generation = 0,
  onContextState,
  onSlow,
  commandsOn = false,
  commandGate = CLOSED,
}: Casa3dVistaProps) {
  const [attempt, setAttempt] = useState(0);
  const bundle = useCasa3dBundle(attempt);
  const { commands, overlay } = useCasa3dCommands(commandGate, commandsOn);
  // The plan is the host's own: the adapter answers the plan commands from it and refuses to save.
  const hostPlan = useMemo(() => ({ building, revision }), [building, revision]);
  const { hass } = useCasa3dHass(hostPlan, undefined, undefined, commands);
  const viewRef = useRef<HTMLElement | null>(null);
  useImperativeHandle(
    handleRef,
    () => ({
      resetView: () => {
        (viewRef.current as (HTMLElement & { resetView?: () => void }) | null)?.resetView?.();
      },
      zoom: (direction) => {
        const canvas = viewRef.current?.shadowRoot?.querySelector('canvas');
        if (!canvas) return false;
        // The viewer zooms on the wheel (a negative delta brings the house closer).
        canvas.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -direction * KEY_ZOOM_DELTA,
            deltaMode: 0,
            bubbles: true,
            cancelable: true,
          })
        );
        return true;
      },
    }),
    []
  );
  const showView = bundle.status === 'ready' && hass !== null;
  // The latest callbacks, so the listeners below need not be set again when the page re-renders.
  const handlers = useRef({ onContextState, onSlow });
  useEffect(() => {
    handlers.current = { onContextState, onSlow };
  });

  // Ready when the viewer has made its canvas; the page shows the still picture until then.
  useEffect(() => {
    if (!showView) return undefined;
    let cancelled = false;
    let frame = 0;
    const started = performance.now();
    const look = () => {
      if (cancelled) return;
      if (viewRef.current?.shadowRoot?.querySelector('canvas')) {
        onReadyChange(true);
        return;
      }
      if (performance.now() - started < CANVAS_WAIT_MS) frame = requestAnimationFrame(look);
    };
    frame = requestAnimationFrame(look);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      onReadyChange(false);
    };
  }, [showView, generation, onReadyChange]);

  // What the view reports: the drawing context, and the statistics when they are asked for. The
  // count of slow reports starts again with each level, so Light can be offered again.
  useEffect(() => {
    const view = viewRef.current;
    if (!showView || !view) return undefined;
    let slow = 0;
    let told = false;
    const listeners: Array<[ViewEvents, EventListener]> = [
      [
        'context-state',
        (event) =>
          handlers.current.onContextState?.((event as CustomEvent<Casa3dContextEvent>).detail),
      ],
      [
        'stats',
        (event) => {
          const stats = (event as CustomEvent<Casa3dStats>).detail;
          // only a moving picture counts: at rest the frame rate is 0
          if (stats.fps > 0 && stats.fps < SLOW_FPS) slow += 1;
          else if (stats.fps > 0) slow = 0;
          if (slow >= SLOW_REPORTS && !told) {
            told = true;
            handlers.current.onSlow?.();
          }
        },
      ],
    ];
    for (const [type, listener] of listeners) view.addEventListener(type, listener);
    return () => {
      for (const [type, listener] of listeners) view.removeEventListener(type, listener);
    };
  }, [showView, generation, quality]);

  return (
    <div className="c3d-vista" hidden={paused}>
      {bundle.status === 'error' && (
        <div className="c3d-message" role="alert">
          <Body size="sm">{bundle.message}</Body>
          <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
            Riprova
          </Button>
        </div>
      )}
      {showView &&
        createElement('fp3d-view3d', {
          key: generation,
          ref: viewRef,
          className: 'c3d-view',
          // A picture for assistive technology, except in Esplora: there the devices are buttons
          // (their names say what they are and what they show) and must stay reachable.
          role: commandsOn ? 'group' : 'img',
          'aria-label': commandsOn
            ? casa3dCommandsEnabled()
              ? 'Vista 3D della casa in Esplora. Ogni dispositivo è un pulsante: attivalo per comandarlo.'
              : 'Vista 3D della casa in Esplora. I dispositivi mostrano il loro stato; i comandi non sono ancora abilitati.'
            : 'Vista 3D della casa. L’elenco delle stanze è nel menu in alto a sinistra.',
          // Properties of the element. It is defined by now, so React sets them as properties and
          // before the element connects: the viewer starts in its level at once. Assigned afterwards
          // (a ref, an effect), it would be made first in the default quality and made again.
          ...viewProps(quality),
          // No buttons of its own on the picture (star, search, tour): only the pins and the quick menu.
          clean: true,
          cleanButton: false,
          hass,
          building,
          packs: NO_PACKS,
          floorId,
          roomId: null,
          panelOpen: false,
        })}
      {overlay}
    </div>
  );
}
