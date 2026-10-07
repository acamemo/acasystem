import type { CSSProperties, ReactNode } from 'react';
import {
  Body,
  Caption,
  MaterialLayers,
  Skeleton,
  materialClass,
} from '@/components/primitives';
import { UtilityIcon, iconTone, type UtilityIconName, type UtilityIconTone } from './UtilityIcon';
import '../utilities.css';

export interface UtilityCardProps {
  /** Accessible name of the open action, e.g. «Aspirapolvere, apri i comandi». */
  openLabel: string;
  onOpen?: () => void;
  /** In edit mode nothing opens: the launcher owns pointer and keys (its frame is inert). */
  editMode: boolean;
  /** Content in one row (widgets one cell high). */
  row?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Content box of a utility widget. The launcher (WidgetHost) already draws the kit's card
 * frame around every widget, so this renders no material of its own (never a card inside a
 * card): it fills the frame's content area. A transparent button under the content opens the
 * details: it carries `data-widget-open`, so only this area presses the launcher frame, while
 * the controls in `.utility-actions` stay independent (no nested buttons, no frame movement).
 */
export function UtilityCard({
  openLabel,
  onOpen,
  editMode,
  row = false,
  className,
  children,
}: UtilityCardProps) {
  const interactive = Boolean(onOpen) && !editMode;
  return (
    <div
      className={['utility-card', row && 'utility-card--row', className].filter(Boolean).join(' ')}
      data-editing={editMode || undefined}
      inert={editMode || undefined}
    >
      {interactive && (
        <button
          type="button"
          className="utility-card__open"
          data-widget-open
          aria-label={openLabel}
          onClick={onOpen}
        />
      )}
      {children}
    </div>
  );
}

/** Recessed disc with the widget icon; the tone colours the icon only. */
export function IconWell({
  icon,
  tone,
  small = false,
  className,
}: {
  icon: UtilityIconName;
  tone?: UtilityIconTone | null;
  small?: boolean;
  className?: string;
}) {
  return (
    <span
      className={materialClass(
        { behavior: 'well', shape: 'circle', size: 'inherit' },
        'utility-well',
        small && 'utility-well--sm',
        className
      )}
      aria-hidden="true"
    >
      <MaterialLayers>
        <UtilityIcon name={icon} size="md" color={iconTone(tone)} />
      </MaterialLayers>
    </span>
  );
}

export type ChipTone = 'neutral' | 'active' | 'info' | 'danger';

/** Small status pill: icon plus text, never colour alone. */
export function Chip({
  icon,
  tone = 'neutral',
  children,
  label,
}: {
  icon?: UtilityIconName;
  tone?: ChipTone;
  children?: ReactNode;
  /** Accessible text when the visible content is only a figure. */
  label?: string;
}) {
  return (
    <span className={['utility-chip', tone !== 'neutral' && `utility-chip--${tone}`].filter(Boolean).join(' ')}>
      {icon && <UtilityIcon name={icon} size="sm" />}
      {label ? (
        <>
          <span aria-hidden="true">{children}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        children
      )}
    </span>
  );
}

/** Level bar (0–100) in a recessed track; low levels switch to the danger fill. */
export function Meter({
  value,
  label,
  low = false,
  valueText,
  className,
}: {
  value: number;
  label: string;
  low?: boolean;
  valueText?: string;
  className?: string;
}) {
  const ratio = Math.min(1, Math.max(0, value / 100));
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-valuetext={valueText}
      className={materialClass(
        { behavior: 'well', shape: 'pill', size: 'inherit' },
        'utility-meter',
        low && 'utility-meter--low',
        className
      )}
      style={{ '--aca-ratio': ratio } as CSSProperties}
    >
      <MaterialLayers>
        <span className="utility-meter__fill" />
      </MaterialLayers>
    </span>
  );
}

/** One-line message with an icon: unavailable device, failed or unconfirmed command. */
export function Notice({
  tone = 'muted',
  icon,
  children,
  live = false,
  id,
}: {
  tone?: 'muted' | 'danger';
  icon?: UtilityIconName;
  children: ReactNode;
  /** Announced politely (command results). */
  live?: boolean;
  id?: string;
}) {
  return (
    <p
      id={id}
      className={['utility-notice', tone === 'danger' && 'utility-notice--danger']
        .filter(Boolean)
        .join(' ')}
      role={live ? 'status' : undefined}
    >
      {icon && <UtilityIcon name={icon} size="sm" />}
      <span>{children}</span>
    </p>
  );
}

/** Loading placeholder inside a card. */
export function CardSkeleton({ label }: { label: string }) {
  return <Skeleton variant="compact" rows={1} label={label} />;
}

/** Card content when the configured entity is missing or the widget is not configured. */
export function CardMessage({
  icon,
  title,
  detail,
}: {
  icon: UtilityIconName;
  title: string;
  detail?: string;
}) {
  return (
    <div className="utility-empty">
      <UtilityIcon name={icon} size="lg" color="var(--aca-ink-muted)" />
      <Body as="span" size="sm" tone="ink">
        {title}
      </Body>
      {detail && (
        <Caption className="utility-truncate" title={detail}>
          {detail}
        </Caption>
      )}
    </div>
  );
}

/** Text of a command result: error, or a request the device never confirmed. */
export function commandNotice(
  errorKey: string | null,
  unconfirmedKey: string | null
): { tone: 'muted' | 'danger'; text: string } | null {
  if (errorKey) return { tone: 'danger', text: 'Comando non riuscito. Riprova.' };
  if (unconfirmedKey) return { tone: 'muted', text: 'Nessuna conferma dal dispositivo.' };
  return null;
}

/** Runs a service call now (as the legacy loops did) and always returns a promise. */
export function callAll(call: () => Promise<unknown>): Promise<unknown> {
  try {
    return Promise.resolve(call());
  } catch (error) {
    return Promise.reject(error);
  }
}
