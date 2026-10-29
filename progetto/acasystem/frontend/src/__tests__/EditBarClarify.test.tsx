/**
 * REP-20261029-001, step 5 (clarify the launcher): the bar of the widget names «Aggiungi» and
 * «Pagine», «Annulla» is a raised pill when it can act and plainly disabled when it cannot, and the
 * notice pill can offer «Vai lì».
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UndoSnackbar } from '@/components/system/edit/UndoSnackbar';
import { WidgetActionBar } from '@/components/system/edit/WidgetActionBar';

const renderBar = (changed: boolean, handlers: Partial<Record<string, () => void>> = {}) =>
  render(
    <WidgetActionBar
      hidden={false}
      name="Lampada"
      changed={changed}
      onDone={handlers.onDone ?? (() => undefined)}
      onUndo={handlers.onUndo ?? (() => undefined)}
      onRemove={() => undefined}
      onAddWidget={handlers.onAddWidget ?? (() => undefined)}
      onPages={handlers.onPages ?? (() => undefined)}
    />
  );

describe('bar of the widget in edit mode', () => {
  it('has «Aggiungi» and «Pagine» with visible words, between the trash and «Annulla» / «Fine»', () => {
    renderBar(false);
    const bar = screen.getByRole('toolbar', { name: 'Modifica Lampada' });
    const buttons = within(bar).getAllByRole('button');
    expect(
      buttons.map((button) => button.getAttribute('aria-label') ?? button.textContent)
    ).toEqual(['Rimuovi Lampada', 'Aggiungi', 'Pagine', 'Annulla', 'Fine']);
    for (const button of buttons) expect(button.tabIndex).toBe(0);
  });

  it('«Aggiungi» and «Pagine» call their handlers', () => {
    const onAddWidget = vi.fn();
    const onPages = vi.fn();
    renderBar(false, { onAddWidget, onPages });
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pagine' }));
    expect(onAddWidget).toHaveBeenCalledTimes(1);
    expect(onPages).toHaveBeenCalledTimes(1);
  });

  it('«Annulla» is disabled, and says why, while there is nothing to put back', () => {
    renderBar(false);
    const undo = screen.getByRole('button', { name: 'Annulla' });
    expect(undo).toBeDisabled();
    expect(undo).toHaveAttribute('title', 'Niente da annullare');
  });

  it('«Annulla» is a raised pill like the other secondary controls once it can act, not the flat quiet one', () => {
    const onUndo = vi.fn();
    renderBar(true, { onUndo });
    const undo = screen.getByRole('button', { name: 'Annulla' });
    expect(undo).not.toBeDisabled();
    expect(undo).not.toHaveClass('aca-m--quiet');
    expect(screen.getByRole('button', { name: 'Fine' })).toHaveClass('aca-m--primary');
    fireEvent.click(undo);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});

describe('notice pill', () => {
  it('offers «Annulla» by default and the action it is given otherwise', () => {
    const onAction = vi.fn();
    const { rerender } = render(<UndoSnackbar message="Lampada rimosso" onUndo={onAction} />);
    expect(screen.getByRole('button', { name: 'Annulla' })).toBeInTheDocument();
    rerender(
      <UndoSnackbar
        message="Pagina piena: ho messo «Lampada» in «Luci»."
        onUndo={onAction}
        actionLabel="Vai lì"
      />
    );
    expect(screen.queryByRole('button', { name: 'Annulla' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Vai lì' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('with no action it only informs', () => {
    render(<UndoSnackbar message="Pagina piena: ho messo «Lampada» in «Luci»." />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
