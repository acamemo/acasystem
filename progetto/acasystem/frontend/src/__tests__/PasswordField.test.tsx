import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field, PasswordField } from '@/components/primitives';
import { PasswordField as CanonicalPasswordField } from '../../../ui/primitives/components/PasswordField';
import { PasswordField as CompatiblePasswordField } from '@/components/primitives/components/PasswordField';

afterEach(cleanup);
describe('campo password condiviso', () => {
  it('mostra e nasconde lo stesso input senza inviare il form, cambiare valore o focus', () => {
    const submit = vi.fn(), change = vi.fn(), ref = createRef<HTMLInputElement>();
    render(<form onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <PasswordField ref={ref} label="Password" id="password-test" defaultValue="secret-test" name="password"
        autoComplete="current-password" minLength={8} maxLength={72} required onChange={change} />
      <button type="submit">Accedi</button>
    </form>);
    const input = screen.getByLabelText('Password'); input.focus();
    expect(input).toHaveAttribute('spellcheck', 'false'); expect(input).toHaveAttribute('autocapitalize', 'none'); expect(input).toHaveAttribute('autocorrect', 'off');
    const show = screen.getByRole('button', { name: 'Mostra password' });
    expect(show).toHaveAttribute('type', 'button'); expect(show).toHaveAttribute('aria-controls', input.id);
    expect(show).toHaveAttribute('aria-pressed', 'false'); expect(show.querySelector('svg')).toHaveAttribute('data-icon', 'eyeSlash');
    expect(fireEvent.mouseDown(show)).toBe(false); fireEvent.click(show);
    expect(screen.getByLabelText('Password')).toBe(input); expect(ref.current).toBe(input);
    expect(input).toHaveAttribute('type', 'text'); expect(input).toHaveValue('secret-test'); expect(input).toHaveFocus();
    expect(input).toHaveAttribute('spellcheck', 'false'); expect(input).toHaveAttribute('autocapitalize', 'none'); expect(input).toHaveAttribute('autocorrect', 'off');
    expect(input).toHaveAttribute('autocomplete', 'current-password'); expect(input).toHaveAttribute('minlength', '8');
    expect(input).toHaveAttribute('maxlength', '72'); expect(input).toBeRequired();
    const hide = screen.getByRole('button', { name: 'Nascondi password' });
    expect(hide).toHaveAttribute('aria-pressed', 'true'); expect(hide.querySelector('svg')).toHaveAttribute('data-icon', 'eye');
    fireEvent.click(hide); expect(input).toHaveAttribute('type', 'password');
    expect(submit).not.toHaveBeenCalled(); expect(change).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'new-secret-test' } }); expect(change).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Accedi' })); expect(submit).toHaveBeenCalledOnce();
  });
  it('preserva disabilitazione, descrizione ed errore del Field', () => {
    render(<><p id="hint">Suggerimento</p><PasswordField label="Password" disabled error="Errore" aria-describedby="hint" /></>);
    const input = screen.getByLabelText('Password');
    expect(input).toBeDisabled(); expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')?.split(' ')).toContain('hint');
    expect(screen.getByRole('button', { name: 'Mostra password' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Mostra password' })); expect(input).toHaveAttribute('type', 'password');
  });
  it('non aggiunge azioni ai Field normali e usa la stessa identità dai percorsi compatibili', () => {
    render(<Field label="Utente" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(PasswordField).toBe(CanonicalPasswordField); expect(PasswordField).toBe(CompatiblePasswordField);
  });
  it('mantiene gli attributi input esplicitamente richiesti dal chiamante anche dopo il toggle', () => {
    render(<PasswordField label="Password" spellCheck autoCapitalize="words" autoCorrect="on" />);
    fireEvent.click(screen.getByRole('button', { name: 'Mostra password' }));
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('spellcheck', 'true'); expect(input).toHaveAttribute('autocapitalize', 'words'); expect(input).toHaveAttribute('autocorrect', 'on');
  });
});
