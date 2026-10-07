import { useEffect, useRef, useState } from 'react';
import { Badge, Body, Button, Icon, Numeric } from '@/components/primitives';
import type { StatusChip } from '@/utils/launcher/statusChips';
import { ConnectionStatus, type ConnectionState } from './ConnectionStatus';
import { StatusChipView } from './StatusChipView';
import './statusBar.css';

export interface StatusBarProps {
  /**
   * Small clock; null hides it (the cover shows its own) but keeps its place, so the
   * connection and the chips do not move while swiping between the cover and the pages.
   */
  time: Date | null;
  connection: ConnectionState;
  chips: readonly StatusChip[];
  /** True when pressing the chip opens a details sheet. */
  isChipInteractive?: (chip: StatusChip) => boolean;
  onChipPress?: (chip: StatusChip) => void;
  editMode: boolean;
  onToggleEdit: () => void;
  onOpenSystem: () => void;
  /** Updates waiting in Home Assistant: a blue (information) dot on Sistema and a longer name. */
  updateCount?: number;
}

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
 * Top bar of the «OS»: small clock, connection, pinned chips, Modifica/Fine and Sistema.
 * It sits on the page background (not a card), so the widgets stay the only raised surfaces.
 * Its height is the same in normal view and in edit mode: «Fine» is as high as the round
 * buttons (44 px).
 */
export function StatusBar({
  time,
  connection,
  chips,
  isChipInteractive,
  onChipPress,
  editMode,
  onToggleEdit,
  onOpenSystem,
  updateCount = 0,
}: StatusBarProps) {
  const systemLabel =
    updateCount > 0
      ? `Sistema, ${updateCount === 1 ? '1 aggiornamento disponibile' : `${updateCount} aggiornamenti disponibili`}`
      : 'Sistema';
  const { ref: chipsRef, edges } = useOverflowEdges(chips);
  return (
    <header className="aca-status-bar">
      <div className="aca-status-bar__start">
        {time ? (
          <Body as="span" size="md" tone="ink" className="aca-status-bar__time">
            <Numeric as="time" dateTime={`${pad(time.getHours())}:${pad(time.getMinutes())}`}>
              {`${pad(time.getHours())}:${pad(time.getMinutes())}`}
            </Numeric>
          </Body>
        ) : (
          // Same width as the clock, invisible and silent.
          <Body
            as="span"
            size="md"
            tone="ink"
            className="aca-status-bar__time aca-status-bar__time--reserved"
            aria-hidden="true"
          >
            <Numeric>00:00</Numeric>
          </Body>
        )}
        <ConnectionStatus state={connection} />
      </div>

      {chips.length > 0 ? (
        <ul
          ref={chipsRef}
          className="aca-status-bar__chips"
          aria-label="Stato della casa"
          data-overflow={edges || undefined}
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
      ) : (
        <div className="aca-status-bar__chips" />
      )}

      <div className="aca-status-bar__actions">
        {editMode ? (
          <Button
            variant="primary"
            size="md"
            onClick={onToggleEdit}
            className="aca-status-bar__done-button"
            contentClassName="aca-status-bar__done"
            data-launcher-edit
          >
            <Icon name="done" size="md" />
            Fine
          </Button>
        ) : (
          <Button
            variant="control"
            shape="circle"
            size="md"
            onClick={onToggleEdit}
            aria-label="Modifica"
            title="Modifica"
            data-launcher-edit
          >
            <Icon name="edit" size="md" />
          </Button>
        )}
        <span className="aca-status-bar__system">
          <Button
            variant="control"
            shape="circle"
            size="md"
            onClick={onOpenSystem}
            aria-label={systemLabel}
            title={systemLabel}
          >
            <Icon name="settings" size="md" />
          </Button>
          {updateCount > 0 && <Badge />}
        </span>
      </div>
    </header>
  );
}
