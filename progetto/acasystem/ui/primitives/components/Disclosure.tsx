import { createContext, useCallback, useContext, useId, useState, type ReactNode } from 'react';
import { Body } from '../typography/Body';
import { Caption } from '../typography/Caption';
import { Heading } from '../typography/Heading';
import { Icon } from './Icon';

interface DisclosureGroupValue {
  openId: string | null;
  toggle: (id: string) => void;
}

const DisclosureGroupContext = createContext<DisclosureGroupValue | null>(null);

export interface DisclosureGroupProps {
  /** Id of the open section (controlled); null when none is open. */
  value?: string | null;
  /** Id of the section open at the start (uncontrolled). */
  defaultValue?: string | null;
  /** Called with the id that opened, or null when the open one was closed. */
  onValueChange?: (id: string | null) => void;
  className?: string;
  children?: ReactNode;
}

/**
 * A group of sections with one open at a time (accordion): opening one closes the open one, and
 * a tap on the header of the open one closes it, so none open is a valid state.
 */
export function DisclosureGroup({
  value,
  defaultValue = null,
  onValueChange,
  className,
  children,
}: DisclosureGroupProps) {
  const [inner, setInner] = useState<string | null>(defaultValue);
  const openId = value === undefined ? inner : value;
  const toggle = useCallback(
    (id: string) => {
      const next = openId === id ? null : id;
      if (value === undefined) setInner(next);
      onValueChange?.(next);
    },
    [openId, onValueChange, value]
  );
  return (
    <DisclosureGroupContext.Provider value={{ openId, toggle }}>
      <div className={['aca-disclosure-group', className].filter(Boolean).join(' ')}>
        {children}
      </div>
    </DisclosureGroupContext.Provider>
  );
}

export interface DisclosureProps {
  /** Identifies the section inside its group. */
  id: string;
  title: string;
  /** Number shown next to the title, for example the devices in the section. */
  count?: number;
  children?: ReactNode;
  className?: string;
}

/**
 * One section of a `DisclosureGroup`: a header that is a real button (`aria-expanded`,
 * `aria-controls`) and a panel whose height goes from 0 to its content with `grid-template-rows`
 * (0fr to 1fr, 200 ms). The animation moves no shadow and is off with reduced motion. A closed
 * panel is `inert`, so keyboard and screen reader skip it.
 */
export function Disclosure({ id, title, count, children, className }: DisclosureProps) {
  const group = useContext(DisclosureGroupContext);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const triggerId = `sezione-${uid}-titolo`;
  const panelId = `sezione-${uid}-pannello`;
  const open = group?.openId === id;
  return (
    <section
      className={['aca-disclosure', className].filter(Boolean).join(' ')}
      data-open={open ? '' : undefined}
    >
      <Heading level={3} size="sm" tone="ink" className="aca-disclosure__heading">
        <button
          type="button"
          id={triggerId}
          className="aca-disclosure__trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => group?.toggle(id)}
        >
          <Body as="span" size="md" className="aca-disclosure__title">
            {title}
          </Body>
          {/* A space between the two, so the name of the button reads «Da collegare (2)». */}
          {count !== undefined && (
            <>
              {' '}
              <Caption className="aca-disclosure__count">({count})</Caption>
            </>
          )}
          <Icon name="chevronDown" size="md" className="aca-disclosure__chevron" />
        </button>
      </Heading>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className="aca-disclosure__panel"
        inert={!open}
      >
        <div className="aca-disclosure__inner">
          <div className="aca-disclosure__content">{children}</div>
        </div>
      </div>
    </section>
  );
}
