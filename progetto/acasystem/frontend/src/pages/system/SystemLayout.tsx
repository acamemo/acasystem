import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Body, Button, Heading, Icon, Surface, Title } from '@/components/primitives';
import { AiDevelopmentNotice } from './AiDevelopmentNotice';
import './system.css';

export interface SystemSectionEntry {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
}

/** One settings panel at a time; hidden panels stay mounted to preserve their forms. */
export function SystemLayout({
  sections,
  onClose,
  accountAction,
  hidden = false,
}: {
  sections: readonly SystemSectionEntry[];
  onClose: () => void;
  accountAction?: ReactNode;
  hidden?: boolean;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  const root = useRef<HTMLElement>(null);
  const tabs = useRef(new Map<string, HTMLButtonElement>());
  const navList = useRef<HTMLDivElement>(null);
  const id = useId();
  const [current, setCurrent] = useState(sections[0]?.id ?? '');
  const active = sections.some((section) => section.id === current) ? current : sections[0]?.id;
  const [vertical, setVertical] = useState(
    () => typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 60rem)').matches
  );
  useEffect(() => title.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(min-width: 60rem)');
    const changed = () => setVertical(media.matches);
    changed();
    media.addEventListener?.('change', changed);
    return () => media.removeEventListener?.('change', changed);
  }, []);
  useEffect(() => {
    if (hidden) return;
    const list = navList.current;
    const tab = active ? tabs.current.get(active) : null;
    if (!list || !tab) return;
    if (vertical) {
      const top = tab.offsetTop - list.offsetTop;
      if (top < list.scrollTop) list.scrollTo?.({ top, behavior: 'auto' });
      else if (top + tab.offsetHeight > list.scrollTop + list.clientHeight)
        list.scrollTo?.({ top: top + tab.offsetHeight - list.clientHeight, behavior: 'auto' });
    } else {
      list.scrollTo?.({
        left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2,
        behavior: 'auto',
      });
    }
  }, [active, vertical, hidden]);
  const select = (sectionId: string) => {
    if (sectionId === active) return;
    setCurrent(sectionId);
    let scroller = root.current?.parentElement ?? null;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY))
      scroller = scroller.parentElement;
    (scroller ?? document.scrollingElement)?.scrollTo?.({ top: 0, behavior: 'instant' });
  };
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!direction && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? sections.length - 1
          : (index + direction + sections.length) % sections.length;
    const section = sections[next];
    if (!section) return;
    select(section.id);
    tabs.current.get(section.id)?.focus({ preventScroll: true });
  };

  return (
    <main className="aca-system" hidden={hidden} ref={root}>
      <header className="aca-system__bar">
        <button
          type="button"
          className="aca-bar-button"
          aria-label="Torna al launcher"
          onClick={onClose}
        >
          <Icon name="chevronLeft" size="md" />
        </button>
        <div className="aca-system__bar-text">
          <Title level={1} tabIndex={-1} ref={title}>
            Sistema
          </Title>
        </div>
        {accountAction}
        <AiDevelopmentNotice />
      </header>
      <div className="aca-system__layout">
        <nav className="aca-system__nav" aria-label="Sezioni del sistema">
          <div
            ref={navList}
            className="aca-system__tabs"
            role="tablist"
            aria-label="Sezioni del sistema"
            aria-orientation={vertical ? 'vertical' : 'horizontal'}
          >
            {sections.map((section, index) => (
              <Button
                key={section.id}
                variant="control"
                size="sm"
                role="tab"
                id={id + '-' + section.id + '-tab'}
                aria-controls={section.id}
                aria-selected={section.id === active}
                tabIndex={section.id === active ? 0 : -1}
                state={section.id === active ? 'current' : undefined}
                ref={(node) => {
                  if (node) tabs.current.set(section.id, node);
                  else tabs.current.delete(section.id);
                }}
                onClick={() => select(section.id)}
                onKeyDown={(event) => navigate(event, index)}
              >
                {section.title}
              </Button>
            ))}
          </div>
        </nav>
        <div className="aca-system__sections">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              role="tabpanel"
              hidden={section.id !== active}
              tabIndex={0}
              className="aca-system__section"
              aria-labelledby={id + '-' + section.id + '-tab'}
            >
              <div className="aca-system__section-head">
                <Heading level={2} size="md" id={section.id + '-titolo'}>
                  {section.title}
                </Heading>
                {section.description && (
                  <Body size="sm" tone="muted">
                    {section.description}
                  </Body>
                )}
              </div>
              <Surface className="aca-system__panel" contentClassName="aca-system__panel-content">
                {section.content}
              </Surface>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
