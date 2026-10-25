import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Badge, Button, Display, Icon, Numeric } from '@/components/primitives';
import { IconAction } from '@/components/system/edit/IconAction';
import type { StatusChip } from '@/utils/launcher/statusChips';
import { ConnectionStatus, type ConnectionState } from './ConnectionStatus';
import { StatusChipView } from './StatusChipView';
import './statusBar.css';

export interface StatusBarProps {
  /** Sunk below the screen (the cover, edit mode): inert and hidden from assistive technology. */
  hidden?: boolean;
  /**
   * Clock; null hides it (the cover shows its own) but keeps its place, so the connection and
   * the gear do not move.
   */
  time: Date | null;
  connection: ConnectionState;
  chips: readonly StatusChip[];
  /** True when pressing the chip opens a details sheet. */
  isChipInteractive?: (chip: StatusChip) => boolean;
  onChipPress?: (chip: StatusChip) => void;
  /**
   * «Modifica»: enters edit mode. «Fine» takes its corner in the edit bar (EditToolbar); the
   * event lets the launcher tell a pointer from the keyboard (REP-20261013-002, ADR-0013).
   */
  onEdit: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpenSystem: () => void;
  /** Updates waiting in Home Assistant: a blue (information) dot on Sistema and a longer name. */
  updateCount?: number;
}

/** Sistema takes its press at once: it has no action that can be blocked. */
const noop = () => undefined;

const pad = (value: number) => String(value).padStart(2, '0');

/** Sides of the chip row with chips out of view: «start», «end», both or none. */
export function overflowEdges(list: {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
}): string {
  const hidden = list.scrollWidth - list.clientWidth;
  if (hidden <= 1) return '';
  return [list.scrollLeft > 1 && 'start', list.scrollLeft < hidden - 1 && 'end']
    .filter(Boolean)
    .join(' ');
}

/** Keeps data-overflow of the chip row in step with its scroll position and size. */
function useOverflowEdges(chips: readonly StatusChip[]) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState('');
  useEffect(() => {
    const list = ref.current;
    if (!list) return undefined;
    const update = () => {
      const next = overflowEdges(list);
      setEdges((prev) => (prev === next ? prev : next));
    };
    update();
    list.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(list);
    return () => {
      list.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [chips]);
  return { ref, edges };
}

/**
 * Status bar of the «OS», in the footer band (REP-20261013-002, ADR-0013): two floating pills at
 * the two ends of the band, the page indicator between them. On the left the clock, the
 * connection and Sistema; on the right the chips and «Modifica». It sinks below the screen on the
 * cover and in edit mode (the launcher says when, REP-20261009-004): «Fine» takes the corner of
 * «Modifica» in the edit bar. The footer band chooses how much text it shows (data-band-density,
 * footerBand.ts).
 */
export function StatusBar({
  hidden = false,
  time,
  connection,
  chips,
  isChipInteractive,
  onChipPress,
  onEdit,
  onOpenSystem,
  updateCount = 0,
}: StatusBarProps) {
  const systemLabel =
    updateCount > 0
      ? `Sistema, ${updateCount === 1 ? '1 aggiornamento disponibile' : `${updateCount} aggiornamenti disponibili`}`
      : 'Sistema';
  const { ref: chipsRef, edges } = useOverflowEdges(chips);
  return (
    <div
      className={hidden ? 'aca-status-bar aca-status-bar--hidden' : 'aca-status-bar'}
      role="group"
      aria-label="Stato e comandi"
      inert={hidden || undefined}
      aria-hidden={hidden || undefined}
      // What the footer band measures the bar by; the phase of the connection changes the
      // widths without changing what the bar is made of.
      data-band-bar="status"
      data-band-key={connection.phase}
    >
      <div className="aca-status-bar__pill aca-status-bar__start" data-band-group="start">
        {time ? (
          <Display as="span" size="sm" tone="ink" className="aca-status-bar__time" data-band-clock>
            <Numeric as="time" dateTime={`${pad(time.getHours())}:${pad(time.getMinutes())}`}>
              {`${pad(time.getHours())}:${pad(time.getMinutes())}`}
            </Numeric>
          </Display>
        ) : (
          // Same width as the clock, invisible and silent.
          <Display
            as="span"
            size="sm"
            tone="ink"
            className="aca-status-bar__time aca-status-bar__time--reserved"
            aria-hidden="true"
            data-band-clock
          >
            <Numeric>00:00</Numeric>
          </Display>
        )}
        <ConnectionStatus state={connection} />
        <span className="aca-status-bar__system">
          <IconAction
            icon="settings"
            iconSize="md"
            label={systemLabel}
            tip="Sistema"
            onBlocked={noop}
            onClick={onOpenSystem}
          />
          {updateCount > 0 && <Badge />}
        </span>
      </div>

      <div className="aca-status-bar__pill aca-status-bar__end" data-band-group="end">
        <ul
          ref={chipsRef}
          className="aca-status-bar__chips"
          aria-label="Stato della casa"
          data-overflow={edges || undefined}
          // Always mounted, hidden when empty: a chip that comes or goes is a change inside a
          // part the band does not measure (REP-20261013-002, review of stage 3).
          hidden={chips.length === 0}
          // They scroll and take what the pill leaves: the band does not measure them.
          data-band-flex
        >
          {chips.map((chip) => (
            <li key={`${chip.kind}-${chip.id}`} className="aca-status-bar__chip">
              <StatusChipView
                chip={chip}
                onPress={
                  onChipPress && (isChipInteractive?.(chip) ?? false)
                    ? () => onChipPress(chip)
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
        <Button
          variant="control"
          size="md"
          className="aca-frame-pill aca-status-bar__edit"
          contentClassName="aca-status-bar__edit-content"
          onClick={onEdit}
          aria-label="Modifica"
          title="Modifica"
          data-launcher-edit
        >
          <Icon name="edit" size="md" />
          <span className="aca-m__label aca-status-bar__edit-text">Modifica</span>
        </Button>
      </div>
    </div>
  );
}
