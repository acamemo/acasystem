import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button, Caption, Heading, Numeric, Popover, SelectTrigger } from '@/components/primitives';
import { UtilityIcon, type UtilityIconName } from './UtilityIcon';
import '../utilities.css';

/** Root of a detail sheet's content (the launcher wraps it in the Sheet primitive). */
export function DetailsBody({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="utility-details" aria-label={label}>
      {children}
    </div>
  );
}

/** Titled group of a detail sheet; sections are separated by a hairline, never nested cards. */
export function Section({
  title,
  icon,
  aside,
  children,
}: {
  title: string;
  icon?: UtilityIconName;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  const id = `sezione-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <section className="utility-section" aria-labelledby={id}>
      <div className="utility-section__head">
        <Heading level={3} size="sm" tone="ink" id={id} className="aca-icon-text">
          {icon && <UtilityIcon name={icon} size="md" color="var(--aca-ink-muted)" />}
          <span>{title}</span>
        </Heading>
        {aside && <div className="utility-toolbar">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export interface StatItem {
  key: string;
  label: string;
  value: string;
  unit?: string;
  /** Extra text after the value (e.g. «In carica»). */
  note?: ReactNode;
}

/** Definition list of readings: label (caption) over value (tabular figures). */
export function StatList({ items }: { items: StatItem[] }) {
  if (items.length === 0) return null;
  return (
    <dl className="utility-stats">
      {items.map((item) => (
        <div className="utility-stat" key={item.key}>
          <dt>
            <Caption>{item.label}</Caption>
          </dt>
          <dd className="utility-inline">
            <Numeric className="utility-value utility-value--sm">
              {item.value}
              {item.unit ? ` ${item.unit}` : ''}
            </Numeric>
            {item.note}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export interface PickerOption {
  value: string;
  label: string;
}

/**
 * Choice from a list (fan speed, mop intensity, room, charge limit…): the kit's select
 * trigger with a popover menu whose items expose aria-pressed.
 */
export function OptionPicker({
  label,
  value,
  options,
  onSelect,
  disabled = false,
  pending = false,
  placeholder = 'Non impostato',
  showLabel = true,
  contentClassName,
  isolateEscape = false,
}: {
  label: string;
  value: string | null;
  options: PickerOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  pending?: boolean;
  placeholder?: string;
  /** The caller can print the label above the trigger; its accessible name stays complete. */
  showLabel?: boolean;
  /** Optional feature class on the portaled menu; the shared menu contract is retained. */
  contentClassName?: string;
  /** A nested picker can consume Escape without closing the Console that hosts it. */
  isolateEscape?: boolean;
}) {
  const current = options.find((option) => option.value === value);
  const choice = current?.label ?? value ?? placeholder;
  const [open, setOpen] = useState(false);
  const closeRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!isolateEscape || !open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); closeRef.current();
    };
    document.addEventListener('keydown', escape, true);
    return () => document.removeEventListener('keydown', escape, true);
  }, [isolateEscape, open]);
  return (
    <Popover
      label={label}
      contentClassName={['utility-menu', contentClassName].filter(Boolean).join(' ')}
      onOpenChange={setOpen}
      trigger={(props) => (
        <SelectTrigger
          label={showLabel ? `${label}: ${choice}` : choice}
          aria-label={`${label}: ${choice}`}
          aria-haspopup="dialog"
          disabled={disabled || options.length === 0}
          loading={pending}
          {...props}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              if (!open) event.currentTarget.click();
              else document.getElementById(props['aria-controls'])
                ?.querySelector<HTMLButtonElement>('[data-autofocus]')?.focus();
              return;
            }
            if (!isolateEscape || event.key !== 'Escape') return;
            const panel = document.getElementById(props['aria-controls']);
            let nativeOpen = false;
            try { nativeOpen = panel?.matches(':popover-open') ?? false; } catch { /* Fallback engine. */ }
            // beforetoggle already exposes the menu, while onOpenChange/toggle can still be queued.
            if (!open && event.currentTarget.getAttribute('aria-expanded') !== 'true' && !nativeOpen) return;
            event.preventDefault(); event.stopPropagation(); closeRef.current();
            if (nativeOpen && panel && 'hidePopover' in panel) {
              try { panel.hidePopover(); } catch { /* close() may already have hidden it. */ }
            }
            event.currentTarget.focus();
          }}
        />
      )}
    >
      {(close) => {
        closeRef.current = close;
        return options.map((option, index) => (
          <Button
            key={option.value}
            variant="control"
            size="sm"
            className="utility-menu__item"
            aria-pressed={option.value === value}
            data-autofocus={option === current || (!current && index === 0) ? '' : undefined}
            onKeyDown={(event) => {
              if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const items = Array.from(event.currentTarget.closest('.utility-menu')
                  ?.querySelectorAll<HTMLButtonElement>('.utility-menu__item:not(:disabled)') ?? []);
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
                  : items.indexOf(event.currentTarget) + (event.key === 'ArrowDown' ? 1 : -1);
                items[Math.max(0, Math.min(items.length - 1, next))]?.focus();
              }
              if (!isolateEscape) return;
              if (event.key === 'Escape') { event.stopPropagation(); close(); }
            }}
            onClick={() => {
              onSelect(option.value);
              close();
            }}
          >
            {option.label}
          </Button>
        ));
      }}
    </Popover>
  );
}

/** Header button of a collapsible group (state kept by the owner, e.g. in localStorage). */
export function CollapseButton({
  expanded,
  onToggle,
  controls,
  children,
}: {
  expanded: boolean;
  onToggle: () => void;
  controls: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="utility-collapse"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
    >
      <UtilityIcon name="chevronDown" size="sm" className="utility-collapse__chevron" />
      {children}
    </button>
  );
}
