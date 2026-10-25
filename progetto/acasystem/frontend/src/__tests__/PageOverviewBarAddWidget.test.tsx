import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageOverviewBar } from '@/components/system/edit/PageOverviewBar';

// «Aggiungi widget» in the bar of the pages view (the request of 2026-10-23).

afterEach(cleanup);

function renderBar(extra: Partial<Parameters<typeof PageOverviewBar>[0]> = {}) {
  const onBlocked = vi.fn();
  const onAddWidget = vi.fn();
  render(
    <PageOverviewBar
      hidden={false}
      pageName="Casa"
      widgetCount={0}
      deleteBlocked={null}
      isHome={false}
      homeBlocked={null}
      isHidden={false}
      hideBlocked={null}
      onSetHome={() => undefined}
      onDelete={() => undefined}
      onToggleHidden={() => undefined}
      onAdd={() => undefined}
      onAddWidget={onAddWidget}
      onBlocked={onBlocked}
      onDone={() => undefined}
      {...extra}
    />
  );
  return { onBlocked, onAddWidget };
}

const bar = () => screen.getByRole('toolbar', { name: 'Pagine' });
const button = () => within(bar()).getByRole('button', { name: 'Aggiungi widget' });

describe('«Aggiungi widget» in the bar of the pages', () => {
  it('is an icon without words that acts on a press', () => {
    const { onAddWidget, onBlocked } = renderBar();
    expect(button().textContent).toBe('');
    expect(button().querySelector('svg')).not.toBeNull();
    expect(button()).not.toHaveAttribute('aria-disabled');
    fireEvent.click(button());
    expect(onAddWidget).toHaveBeenCalledTimes(1);
    expect(onBlocked).not.toHaveBeenCalled();
  });

  it('is not in the bar when nothing is given to do', () => {
    renderBar({ onAddWidget: undefined });
    expect(within(bar()).queryByRole('button', { name: 'Aggiungi widget' })).toBeNull();
  });

  it('blocked (the layout is locked) it stays reachable, tells why and does not act', () => {
    const reason = 'Disposizione bloccata: sbloccala in Sistema → Schermata Home.';
    const { onAddWidget, onBlocked } = renderBar({ addWidgetBlocked: reason });
    expect(button()).toHaveAttribute('aria-disabled', 'true');
    expect(button()).not.toBeDisabled();
    expect(button()).toHaveAccessibleDescription(reason);
    button().focus();
    expect(button()).toHaveFocus();
    fireEvent.click(button());
    expect(onBlocked).toHaveBeenCalledWith(reason);
    expect(onAddWidget).not.toHaveBeenCalled();
  });

  it('comes right after «Nuova pagina» in the order of the keyboard', () => {
    renderBar();
    const names = within(bar())
      .getAllByRole('button')
      .map((item) => item.getAttribute('aria-label') ?? item.textContent);
    expect(names.slice(0, 3)).toEqual([
      'Elimina la pagina Casa',
      'Nuova pagina',
      'Aggiungi widget',
    ]);
  });
});
