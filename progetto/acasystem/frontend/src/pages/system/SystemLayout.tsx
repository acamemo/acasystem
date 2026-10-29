import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Body, Button, Caption, Heading, Icon, Surface, Title } from '@/components/primitives';
import { AiDevelopmentNotice } from './AiDevelopmentNotice';
import './system.css';

export interface SystemSectionEntry {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
}

/**
 * Full page of the system settings: a bar with the way back, an index of the sections (column on
 * wide screens, chips on phones) and one metal surface per section.
 */
export function SystemLayout({
  sections,
  onClose,
}: {
  sections: readonly SystemSectionEntry[];
  onClose: () => void;
}) {
  const headings = useRef(new Map<string, HTMLHeadingElement>());
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus({ preventScroll: true }), []);

  // The section in view: the last one whose top has passed a line a quarter of the way down the
  // scrolling area; at the very bottom, the last one (a short section never reaches the line).
  // The page scrolls inside the overlay scene, not in the window: the nearest scrolling parent.
  const [current, setCurrent] = useState(sections[0]?.id ?? '');
  const root = useRef<HTMLElement>(null);
  const navList = useRef<HTMLUListElement>(null);
  const lockedUntil = useRef(0);
  useEffect(() => {
    let scroller: HTMLElement | null = root.current?.parentElement ?? null;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) {
      scroller = scroller.parentElement;
    }
    const target: HTMLElement | Window = scroller ?? window;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (Date.now() < lockedUntil.current) return;
      const view = scroller
        ? scroller.getBoundingClientRect()
        : { top: 0, height: window.innerHeight };
      const top = scroller ? scroller.scrollTop : window.scrollY;
      const height = scroller ? scroller.scrollHeight : document.documentElement.scrollHeight;
      const line = view.top + view.height * 0.25;
      const atBottom = top > 0 && top + view.height >= height - 2;
      let found = sections[0]?.id ?? '';
      // At the very top the first section is the current one, whatever the height of the window.
      for (const section of top > 0 ? sections : []) {
        const node = document.getElementById(section.id);
        if (node && node.getBoundingClientRect().top <= line) found = section.id;
      }
      if (atBottom) found = sections[sections.length - 1]?.id ?? found;
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [sections]);

  // On phones the index is a row that scrolls sideways: the current item stays inside it.
  useEffect(() => {
    const list = navList.current;
    const item = list?.querySelector<HTMLElement>('[aria-current="true"]')?.closest('li');
    if (!list || !item || list.scrollWidth <= list.clientWidth) return;
    const left = item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2;
    list.scrollTo?.({ left, behavior: 'auto' });
  }, [current]);

  const jump = (id: string) => {
    setCurrent(id);
    lockedUntil.current = Date.now() + 900;
    const heading = headings.current.get(id);
    if (!heading) return;
    const reduced =
      typeof globalThis.matchMedia === 'function' &&
      globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
    heading.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    heading.focus({ preventScroll: true });
  };

  return (
    <main className="aca-system" ref={root}>
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
          <Caption>Collegamento, profili, barra di stato e informazioni</Caption>
        </div>
        <AiDevelopmentNotice />
      </header>

      <div className="aca-system__layout">
        <nav className="aca-system__nav" aria-label="Sezioni del sistema">
          <ul ref={navList}>
            {sections.map((section) => (
              <li key={section.id}>
                <Button
                  variant="control"
                  size="sm"
                  state={section.id === current ? 'current' : undefined}
                  aria-current={section.id === current ? 'true' : undefined}
                  onClick={() => jump(section.id)}
                >
                  {section.title}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="aca-system__sections">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="aca-system__section"
              aria-labelledby={`${section.id}-titolo`}
            >
              <div className="aca-system__section-head">
                <Heading
                  level={2}
                  size="md"
                  id={`${section.id}-titolo`}
                  tabIndex={-1}
                  ref={(node) => {
                    if (node) headings.current.set(section.id, node);
                    else headings.current.delete(section.id);
                  }}
                >
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
