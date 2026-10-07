import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageVisibilityContext, usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { useNow } from '@/hooks/launcher/useNow';
import { fixtureEntity } from '@/utils/fixtures/runtime';
import { widgetDisplayName } from '@/utils/launcher/names';
import { Pager } from '@/templates/launcher/Pager';

function VisibilityProbe({ id }: { id: string }) {
  const visible = usePageVisible();
  const now = useNow(1000, visible);
  return <p data-testid={id}>{`${visible}:${now.getTime()}`}</p>;
}

describe('launcher visibility and device naming', () => {
  it('pauses offscreen clocks and all pages behind Sistema, then refreshes on resume', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
      const pages = [
        { key: 'a', label: 'A', content: <VisibilityProbe id="a" /> },
        { key: 'b', label: 'B', content: <VisibilityProbe id="b" /> },
      ];
      const view = render(
        <Pager
          pages={pages}
          index={0}
          onIndexChange={() => undefined}
          locked={false}
          reducedMotion
        />
      );
      const inactive = screen.getByTestId('b').textContent;
      act(() => vi.advanceTimersByTime(3100));
      expect(screen.getByTestId('b')).toHaveTextContent(inactive!);
      expect(screen.getByTestId('a').textContent).not.toBe(inactive?.replace('false', 'true'));
      view.rerender(
        <PageVisibilityContext.Provider value={false}>
          <Pager
            pages={pages}
            index={0}
            onIndexChange={() => undefined}
            locked={false}
            reducedMotion
          />
        </PageVisibilityContext.Provider>
      );
      const covered = screen.getByTestId('a').textContent;
      act(() => vi.advanceTimersByTime(3100));
      expect(screen.getByTestId('a')).toHaveTextContent(covered!);
      view.rerender(
        <PageVisibilityContext.Provider value>
          <Pager
            pages={pages}
            index={1}
            onIndexChange={() => undefined}
            locked={false}
            reducedMotion
          />
        </PageVisibilityContext.Provider>
      );
      expect(screen.getByTestId('b')).toHaveTextContent(`true:${Date.now()}`);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    'climateId',
    'weatherId',
    'mediaPlayerId',
    'cameraId',
    'alarmId',
    'vacuumId',
    'nordpoolId',
    'todoEntityId',
    'tempId',
    'personId',
  ])('names %s widgets after their actual device', (key) => {
    const entities = {
      'entity.office': fixtureEntity('entity.office', 'on', {
        friendly_name: 'Dispositivo ufficio',
      }),
    };
    expect(
      widgetDisplayName('synthetic_card_1', { [key]: 'entity.office' }, entities, {}, 'Tipo')
    ).toBe('Dispositivo ufficio');
    expect(
      widgetDisplayName(
        'synthetic_card_1',
        { [key]: 'entity.office' },
        entities,
        { synthetic_card_1: 'Nome scelto' },
        'Tipo'
      )
    ).toBe('Nome scelto');
  });
});
