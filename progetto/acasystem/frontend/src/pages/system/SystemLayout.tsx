import { useEffect, useRef, type ReactNode } from 'react';
import { Body, Button, Caption, Heading, Icon, Surface, Title } from '@/components/primitives';
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

  const jump = (id: string) => {
    const heading = headings.current.get(id);
    if (!heading) return;
    const reduced =
      typeof globalThis.matchMedia === 'function' &&
      globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
    heading.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    heading.focus({ preventScroll: true });
  };

  return (
    <main className="aca-system">
      <header className="aca-system__bar">
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label="Torna al launcher"
          onClick={onClose}
        >
          <Icon name="chevronLeft" size="md" />
        </Button>
        <div className="aca-system__bar-text">
          <Title level={1} tabIndex={-1} ref={title}>
            Sistema
          </Title>
          <Caption>Collegamento, profili, barra di stato e informazioni</Caption>
        </div>
      </header>

      <div className="aca-system__layout">
        <nav className="aca-system__nav" aria-label="Sezioni del sistema">
          <ul>
            {sections.map((section) => (
              <li key={section.id}>
                <Button variant="control" size="sm" onClick={() => jump(section.id)}>
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
