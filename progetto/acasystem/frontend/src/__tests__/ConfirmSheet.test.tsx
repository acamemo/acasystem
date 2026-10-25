import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmSheet, type ConfirmSheetProps } from '@/components/primitives';

/**
 * The confirmation primitive that takes the place of the browser's confirm() (ADR-0014, T7):
 * a question, the safe key first, the code when the command asks for one.
 */

afterEach(() => {
  cleanup();
  document.documentElement.style.overflow = '';
});

function setup(props: Partial<ConfirmSheetProps> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <ConfirmSheet
      open
      title="Sbloccare «Porta d’ingresso»?"
      description="La serratura si apre."
      confirmLabel="Sblocca"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />
  );
  return { onConfirm, onCancel, ...view };
}

describe('ConfirmSheet', () => {
  it('shows the question, names the action and the safe key', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Sbloccare «Porta d’ingresso»?' })).toBeTruthy();
    expect(screen.getByText('La serratura si apre.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sblocca' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Annulla' })).toBeTruthy();
  });

  it('puts the focus on the safe key, not on the action', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Annulla' })).toHaveFocus();
  });

  it('confirms without a code, and cancels with the cancel key, the close button and Escape', () => {
    const { onConfirm, onCancel } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Sblocca' }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('asks for a code when told to, keeps the action off until one is typed, and hands it over', () => {
    const { onConfirm } = setup({ code: { label: 'Codice della serratura', mode: 'numeric' } });
    const field = screen.getByLabelText('Codice della serratura') as HTMLInputElement;
    const action = screen.getByRole('button', { name: 'Sblocca' }) as HTMLButtonElement;
    // the code field is where the person starts, and it is masked
    expect(field).toHaveFocus();
    expect(field.type).toBe('password');
    expect(field.autocomplete).toBe('off');
    expect(action.disabled).toBe(true);
    fireEvent.click(action);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: '48a2 1' } });
    // digits only in a numeric field
    expect(field.value).toBe('4821');
    expect(action.disabled).toBe(false);
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledWith('4821');
  });

  it('lets a text code keep its letters', () => {
    const { onConfirm } = setup({ code: { label: 'Codice', mode: 'text' } });
    const field = screen.getByLabelText('Codice') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'Ab12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sblocca' }));
    expect(onConfirm).toHaveBeenCalledWith('Ab12');
  });

  it('starts every question with an empty code', () => {
    const code = { label: 'Codice', mode: 'numeric' as const };
    const { rerender } = setup({ code });
    fireEvent.change(screen.getByLabelText('Codice'), { target: { value: '1234' } });
    rerender(
      <ConfirmSheet
        open={false}
        title="x"
        confirmLabel="Sblocca"
        code={code}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    );
    rerender(
      <ConfirmSheet
        open
        title="x"
        confirmLabel="Sblocca"
        code={code}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    );
    expect((screen.getByLabelText('Codice') as HTMLInputElement).value).toBe('');
  });

  it('shows the reason under the field when the code was refused', () => {
    setup({ code: { label: 'Codice', mode: 'numeric', error: 'Codice errato' } });
    expect(screen.getByText('Codice errato')).toBeTruthy();
    expect(screen.getByLabelText('Codice').getAttribute('aria-invalid')).toBe('true');
  });

  it('uses the red key for a risky action and the orange one for the rest', () => {
    const { rerender } = setup({ danger: true });
    expect(screen.getByRole('button', { name: 'Sblocca' }).className).toMatch(/danger/);
    rerender(
      <ConfirmSheet
        open
        title="x"
        confirmLabel="Sblocca"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    );
    expect(screen.getByRole('button', { name: 'Sblocca' }).className).not.toMatch(/danger/);
  });
});
