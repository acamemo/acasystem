import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PanelPresence } from '../../../ui/primitives/components/PanelPresence';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('passaggio dalla finestra al posizionamento', () => {
  it('chiama il successore soltanto dopo la rimozione del pannello', () => {
    const exited = vi.fn(() => expect(screen.queryByRole('dialog', { hidden: true })).toBeNull());
    const view = render(<PanelPresence exitMs={200} onExited={exited}>{<div role="dialog">Strumento</div>}</PanelPresence>);
    expect(exited).not.toHaveBeenCalled();
    view.rerender(<PanelPresence exitMs={200} onExited={exited}>{null}</PanelPresence>);
    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(199)); expect(exited).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1)); expect(exited).toHaveBeenCalledOnce();
  });
  it('una riapertura interrompe il vecchio passaggio e non consegna un’uscita obsoleta', () => {
    const exited = vi.fn();
    const view = render(<PanelPresence exitMs={200} onExited={exited}>{<div role="dialog">Strumento</div>}</PanelPresence>);
    view.rerender(<PanelPresence exitMs={200} onExited={exited}>{null}</PanelPresence>);
    act(() => vi.advanceTimersByTime(100));
    view.rerender(<PanelPresence exitMs={200} onExited={exited}>{<div role="dialog">Riaperto</div>}</PanelPresence>);
    act(() => vi.advanceTimersByTime(300));
    expect(exited).not.toHaveBeenCalled(); expect(screen.getByRole('dialog')).toHaveTextContent('Riaperto');
  });
});
