import type { MouseEvent, ReactNode } from 'react';
import { Body, Caption, IconText, Skeleton } from '@/components/primitives';
import type { CellSize } from '@/@types/launcher';
import { testi } from '../testi';
import '../media.css';

export interface WidgetShellProps {
  size: CellSize;
  editMode: boolean;
  /**
   * Action of a tap on the background, outside the opener and the commands (Apple TV
   * `tapAction: toggle`). Without it the background belongs to the stretched OpenButton.
   */
  onBackgroundTap?: () => void;
  /** Accessible name of the widget group. */
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * Content of a media widget. The launcher draws the kit's card frame around it (WidgetHost), so
 * the widget never nests a card: it fills the frame's content box. The details open from the
 * OpenButton (`data-widget-open`); in edit mode nothing reacts, so the launcher can move and
 * resize the widget.
 */
export function WidgetShell({
  size,
  editMode,
  onBackgroundTap,
  label,
  className,
  children,
}: WidgetShellProps) {
  const tappable = Boolean(onBackgroundTap) && !editMode;
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!tappable || !onBackgroundTap) return;
    event.stopPropagation();
    onBackgroundTap();
  };
  return (
    <div
      role="group"
      aria-label={label}
      className={[
        'aca-media-widget',
        size.h <= 1 && 'aca-media-widget--compact',
        tappable && 'aca-media-widget--clickable',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-edit-mode={editMode || undefined}
      onClick={tappable ? handleClick : undefined}
    >
      {children}
    </div>
  );
}

export interface OpenButtonProps {
  editMode: boolean;
  onOpen: () => void;
  /**
   * Stretches the hit area over the whole widget, below the commands (default). Off when the
   * background has its own tap action (WidgetShell `onBackgroundTap`).
   */
  stretch?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Transparent button that opens the details, holding the name and title (the keyboard way in).
 * `data-widget-open` lets the launcher frame press only while this area is hovered or pressed
 * (launcher.css); the widget's commands sit above it and never move the frame.
 */
export function OpenButton({
  editMode,
  onOpen,
  stretch = true,
  className,
  children,
}: OpenButtonProps) {
  return (
    <button
      type="button"
      data-widget-open
      className={['aca-media-open', stretch && 'aca-media-open--stretch', className]
        .filter(Boolean)
        .join(' ')}
      disabled={editMode}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
    >
      {children}
      <span className="sr-only">{testi.apriDettagli('')}</span>
    </button>
  );
}

/** Stops a control's click from reaching the widget background. */
export const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

export function WidgetLoading({ size, label }: { size: CellSize; label: string }) {
  return (
    <div
      className={['aca-media-widget', size.h <= 1 && 'aca-media-widget--compact']
        .filter(Boolean)
        .join(' ')}
    >
      <Skeleton
        variant="compact"
        rows={size.h <= 1 ? 1 : 2}
        label={label}
        className="aca-media-grow"
      />
    </div>
  );
}

/** Missing or unconfigured device: a clear message, never a technical error. */
export function WidgetMessage({
  size,
  editMode,
  title,
  note,
  detail,
  onOpen,
}: {
  size: CellSize;
  editMode: boolean;
  title: string;
  note?: string;
  /** Entity id or similar, shown small for whoever fixes the configuration. */
  detail?: string;
  /** Opens the details (e.g. an empty group, fixed there). */
  onOpen?: () => void;
}) {
  const heading = (
    <IconText icon="warning" iconTone="danger" iconSize="md" tone="ink">
      {title}
    </IconText>
  );
  return (
    <WidgetShell size={size} editMode={editMode} label={title}>
      <div className="aca-media-widget__message" role="status">
        {onOpen ? (
          <OpenButton editMode={editMode} onOpen={onOpen}>
            {heading}
          </OpenButton>
        ) : (
          heading
        )}
        {note && size.h > 1 && (
          <Body size="sm" tone="muted">
            {note}
          </Body>
        )}
        {detail && (
          <Caption className="aca-media-show-10" translate="no">
            {detail}
          </Caption>
        )}
      </div>
    </WidgetShell>
  );
}

export const missingDevice = (entityId: string) => ({
  title: entityId ? testi.dispositivoNonTrovato : testi.dispositivoNonConfigurato,
  note: entityId ? testi.dispositivoNonTrovatoNota : testi.dispositivoNonConfiguratoNota,
  detail: entityId || undefined,
});
