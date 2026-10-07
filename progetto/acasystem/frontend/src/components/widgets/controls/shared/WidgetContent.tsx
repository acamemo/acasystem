import type { ReactNode, Ref } from 'react';
import { Body, Caption, IconText, Skeleton } from '@/components/primitives';
import type { CellSize } from '@/@types/launcher';
import { COMMON_LABELS } from './labels';
import { densityOf, type Density } from './entity';
import '../controls.css';

export interface WidgetContentProps {
  size: CellSize;
  /** Accessible name of the widget (device name). */
  name: string;
  /** Opens the detail sheet; the free area of the widget is the target, controls sit above it. */
  onOpen?: () => void;
  /** Accessible name of the open target; «Dettagli: name» by default. */
  openLabel?: string;
  editMode: boolean;
  className?: string;
  /** Layer drawn under the content (e.g. the sparkline of a sensor). */
  backdrop?: ReactNode;
  bodyRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

/**
 * Content of a control widget. The launcher (WidgetHost) draws the kit frame around it, so
 * this renders no material of its own (never a card inside the frame): it fills the frame's
 * content box with the density class for the size. A transparent button under the content,
 * marked `data-widget-open`, opens the details; only that button presses the frame, the
 * widget's commands above it do not (no nested interactive elements).
 */
export function WidgetContent({
  size,
  name,
  onOpen,
  openLabel,
  editMode,
  className,
  backdrop,
  bodyRef,
  children,
}: WidgetContentProps) {
  const density: Density = densityOf(size);
  return (
    <div
      className={[
        'ctl-widget',
        `ctl-widget--${density}`,
        editMode && 'ctl-widget--editing',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-density={density}
    >
      {onOpen && (
        <button
          type="button"
          className="ctl-widget__open"
          data-widget-open=""
          aria-label={openLabel ?? `${COMMON_LABELS.details}: ${name}`}
          disabled={editMode}
          onClick={onOpen}
        />
      )}
      {backdrop}
      <div ref={bodyRef} className="ctl-widget__body">
        {children}
      </div>
    </div>
  );
}

/** Loading state: the shapes of the content while Home Assistant sends the entities. */
export function WidgetLoading({ size }: { size: CellSize }) {
  const density = densityOf(size);
  return (
    <div className={['ctl-widget', `ctl-widget--${density}`].join(' ')} data-density={density}>
      <Skeleton
        variant="compact"
        rows={density === 'large' || density === 'tall' ? 2 : 1}
        label={COMMON_LABELS.loading}
      />
    </div>
  );
}

/** The configured entity does not exist (anymore): a plain explanation, no technical error. */
export function WidgetMissing({
  size,
  name,
  editMode,
}: {
  size: CellSize;
  name: string;
  editMode: boolean;
}) {
  const density = densityOf(size);
  return (
    <WidgetContent size={size} name={name} editMode={editMode} className="ctl-widget--missing">
      <IconText icon="warning" iconTone="danger" iconSize="md" className="ctl-missing__title">
        {density === 'compact' ? 'Non trovato' : COMMON_LABELS.missing}
      </IconText>
      {density !== 'compact' && (
        <Caption as="p" className="ctl-clamp-2">
          {name}
        </Caption>
      )}
      {(density === 'large' || density === 'tall' || editMode) && (
        <Body as="p" size="sm" tone="muted" className="ctl-clamp-3">
          {COMMON_LABELS.missingHint}
        </Body>
      )}
    </WidgetContent>
  );
}
