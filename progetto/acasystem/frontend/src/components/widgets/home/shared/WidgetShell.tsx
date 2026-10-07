import type { ReactNode } from 'react';
import type { CellSize } from '@/@types/launcher';
import { Caption, Heading, Skeleton } from '@/components/primitives';
import { HomeIcon, type HomeIconName, type HomeIconTone } from './HomeIcon';
import '../home.css';

export interface WidgetShellProps {
  /** Accessible name of the widget group (the entity or card name). */
  name: string;
  size: CellSize;
  editMode: boolean;
  /**
   * Tap on the free area of the widget: usually opens the details. Not rendered in edit mode,
   * where the launcher owns taps, long press and drag.
   */
  onPress?: () => void;
  /** Accessible name of the tap target, e.g. «Apri i dettagli di Soggiorno». */
  pressLabel?: string;
  /**
   * The tap opens the detail sheet: the target is marked `data-widget-open` (the launcher
   * frame presses with it) and announces the dialog. False for a tap that runs a command.
   */
  pressOpensDetails?: boolean;
  /**
   * A command failed or the device reports an alarm: exposed as `data-widget-error` for the
   * launcher frame; the content always explains it in text.
   */
  error?: boolean;
  /** State hook for styling and tests, e.g. `on`, `off`, `unavailable`. */
  state?: string;
  /** Ref of the content box, for widgets that measure the space they have (lists). */
  bodyRef?: (node: HTMLDivElement | null) => void;
  className?: string;
  children: ReactNode;
}

/**
 * Content of a comfort widget. The launcher (WidgetHost) draws the kit frame around it, so this
 * renders no material of its own (never a card inside a card): it fills the frame's content
 * box. The free area is one large transparent tap target placed under the content; the
 * widget's own controls sit above it and do not move the frame.
 */
export function WidgetShell({
  name,
  size,
  editMode,
  onPress,
  pressLabel,
  pressOpensDetails = true,
  error = false,
  state,
  bodyRef,
  className,
  children,
}: WidgetShellProps) {
  return (
    <div
      role="group"
      aria-label={name}
      className={['home-widget', className].filter(Boolean).join(' ')}
      data-cols={size.w}
      data-rows={size.h}
      data-state={state}
      data-edit={editMode || undefined}
      data-widget-error={error || undefined}
    >
      {onPress && !editMode && (
        <button
          type="button"
          className="home-widget__press"
          aria-label={pressLabel ?? name}
          aria-haspopup={pressOpensDetails ? 'dialog' : undefined}
          data-widget-open={pressOpensDetails ? '' : undefined}
          onClick={onPress}
        />
      )}
      <div className="home-widget__body" ref={bodyRef}>
        {children}
      </div>
    </div>
  );
}

/** Loading state of a widget: skeleton rows sized to the cells. */
export function WidgetLoading({ size, label }: { size: CellSize; label: string }) {
  return (
    <Skeleton
      variant="compact"
      rows={Math.max(1, Math.min(4, size.h))}
      label={label}
      className="home-widget__skeleton"
    />
  );
}

export interface WidgetNoticeProps {
  icon: HomeIconName;
  tone?: HomeIconTone;
  title: string;
  message: string;
  /** Optional technical reference (e.g. the entity id) in muted text. */
  detail?: string;
  compact?: boolean;
}

/** Missing entity, nothing configured, unavailable device: a clear sentence, no stack trace. */
export function WidgetNotice({
  icon,
  tone = 'muted',
  title,
  message,
  detail,
  compact,
}: WidgetNoticeProps) {
  return (
    <div className="home-notice" data-compact={compact || undefined}>
      <HomeIcon name={icon} size="lg" tone={tone} />
      <div className="home-notice__text">
        <Heading level={3} size="sm" className="home-truncate">
          {title}
        </Heading>
        <Caption as="p" className="home-notice__message">
          {message}
        </Caption>
        {detail && !compact && (
          <Caption as="p" className="home-truncate">
            {detail}
          </Caption>
        )}
      </div>
    </div>
  );
}

/** Inline error of a command, announced politely; colour is never the only signal. */
export function CommandError({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p className="home-command-error" role="status" id={id}>
      <HomeIcon name="warning" size="sm" tone="danger" />
      <span>{children}</span>
    </p>
  );
}
