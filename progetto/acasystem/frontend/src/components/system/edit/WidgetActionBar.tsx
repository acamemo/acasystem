import type { KeyboardEvent, Ref } from 'react';
import { Body, Button, Icon } from '@/components/primitives';
import { useHeldAfterFrames } from '@/hooks/launcher/useHeldAfterFrames';
import './edit.css';

/**
 * The trash while a widget is moved (REP-20261008-001): `ready` it waits as a «Rimuovi» pill,
 * `armed` the finger is over it and a release removes the widget.
 */
export type WidgetBarDrop = 'none' | 'ready' | 'armed';

export interface WidgetActionBarProps {
  /** No widget selected: the bar waits below the screen, inert, to rise and sink. */
  hidden: boolean;
  /** Name of the selected widget. */
  name: string;
  /** Position or size changed since the selection: «Annulla» can put them back. */
  changed: boolean;
  /** «Fine»: keeps the changes and leaves edit mode in one tap (REP-20261013-001). */
  onDone: () => void;
  onUndo: () => void;
  onRemove: () => void;
  /** The trash as the drop target of a moved widget. */
  drop?: WidgetBarDrop;
  /** The group of the bar: its box is the drop target of the trash. */
  groupRef?: Ref<HTMLDivElement>;
  /** Maiusc + Tab on «Rimuovi»: back to the widget; false when it could not take the focus. */
  onTabBack?: () => boolean;
  /** Tab on «Fine»: on to the next widget of the page; false when there is none. */
  onTabForward?: () => boolean;
}

/**
 * Bar of the selected widget (REP-20261007-029, REP-20261008-001): while a widget is selected
 * the top bar rises and the page indicator sinks, and this bar rises in their place with
 * remove (at once, then «Annulla»), «Annulla» (back to how the widget was when selected) and
 * «Fine» (keeps the size and position chosen and leaves edit mode: one tap instead of «Conferma»
 * then «Fine», REP-20261013-001). While the widget is moved only the trash
 * stays, as the place to drop it to remove it. The settings open with a double tap on the
 * widget, or Invio from the keyboard. The bar keeps its width in both states (REP-20261023-006,
 * D-M14): «Annulla» and «Fine» fade out in their place, where they are, and the «Rimuovi» pill
 * lies over the group, so nothing changes width at the switch.
 */
export function WidgetActionBar({
  hidden,
  name,
  changed,
  onDone,
  onUndo,
  onRemove,
  drop = 'none',
  groupRef,
  onTabBack,
  onTabForward,
}: WidgetActionBarProps) {
  const dropping = drop !== 'none';
  // «Annulla» and «Fine» are out of reach as the drop begins, and come back two frames after it
  // ends: the class and the look of the bar change in the commit that ends the session as ever,
  // the `inert` of the group does not (G4 tracing of 2026-10-25, W-B: about 23 elements in the
  // frame after `stop()`).
  const restOut = useHeldAfterFrames(dropping);
  // Tab is taken only when the focus moved; otherwise it goes on in the usual order.
  const tab = (event: KeyboardEvent<HTMLElement>, back: boolean, to?: () => boolean) => {
    if (event.key !== 'Tab' || event.shiftKey !== back || !to) return;
    if (to()) event.preventDefault();
  };
  return (
    <div
      className={['aca-page-overview', 'aca-widget-actions', hidden && 'aca-page-overview--hidden']
        .filter(Boolean)
        .join(' ')}
      role="toolbar"
      aria-label={`Modifica ${name}`}
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      data-no-long-press
      data-drop={drop}
    >
      <div
        ref={groupRef}
        className={[
          'aca-page-overview__group',
          dropping && 'aca-widget-actions--drop',
          drop === 'armed' && 'is-armed',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Removes at once; «Annulla» appears afterwards, as on Android (REP-20261007-031). */}
        <button
          type="button"
          className="aca-bar-button aca-widget-actions__remove"
          aria-label={`Rimuovi ${name}`}
          title={`Rimuovi ${name}`}
          data-widget-action="remove"
          onClick={onRemove}
          onKeyDown={(event) => tab(event, true, onTabBack)}
        >
          <Icon name="trash" size={dropping ? 'md' : 'lg'} />
          {dropping && (
            <Body as="span" size="md" className="aca-widget-actions__remove-text">
              Rimuovi
            </Body>
          )}
        </button>
        <div
          className="aca-widget-actions__rest"
          aria-hidden={dropping || undefined}
          inert={restOut || undefined}
        >
          <span className="aca-widget-actions__divider" aria-hidden="true" />
          <Button
            variant="secondary"
            size="md"
            className="aca-frame-pill"
            disabled={!changed}
            onClick={onUndo}
          >
            Annulla
          </Button>
          <Button
            variant="primary"
            size="md"
            className="aca-frame-pill"
            contentClassName="aca-widget-actions__done"
            data-widget-action="done"
            onClick={onDone}
            onKeyDown={(event) => tab(event, false, onTabForward)}
          >
            <Icon name="done" size="md" />
            Fine
          </Button>
        </div>
      </div>
    </div>
  );
}
