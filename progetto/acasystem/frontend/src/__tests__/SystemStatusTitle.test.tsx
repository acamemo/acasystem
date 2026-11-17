import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatusBarSection } from '@/pages/system/sections/StatusBarSection';

const props = () => ({
  entities: {},
  headerSettings: {},
  onHeaderSettings: vi.fn(),
  pinned: [],
  onPinned: vi.fn(),
  pills: [],
  onPills: vi.fn(),
});

describe('titolo di Sistema nel contesto del profilo', () => {
  it('rilegge un titolo aggiornato se il campo non è stato editato, senza risalvarlo al blur', () => {
    const onTitle = vi.fn();
    const base = props();
    const view = render(
      <StatusBarSection {...base} scopeKey="profile-a" title="Casa A" onTitle={onTitle} />
    );
    view.rerender(
      <StatusBarSection {...base} scopeKey="profile-a" title="Casa aggiornata" onTitle={onTitle} />
    );
    expect(screen.getByRole('textbox', { name: 'Titolo' })).toHaveValue('Casa aggiornata');
    fireEvent.blur(screen.getByRole('textbox', { name: 'Titolo' }));
    expect(onTitle).not.toHaveBeenCalled();
  });

  it('conserva la bozza nel profilo sorgente e non la invia al profilo appena selezionato', () => {
    const saveA = vi.fn();
    const saveB = vi.fn();
    const base = props();
    const view = render(
      <StatusBarSection {...base} scopeKey="profile-a" title="Casa A" onTitle={saveA} />
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Titolo' }), {
      target: { value: 'Bozza A' },
    });
    view.rerender(
      <StatusBarSection {...base} scopeKey="profile-b" title="Casa B" onTitle={saveB} />
    );
    expect(screen.getByRole('textbox', { name: 'Titolo' })).toHaveValue('Casa B');
    fireEvent.blur(screen.getByRole('textbox', { name: 'Titolo' }));
    expect(saveB).not.toHaveBeenCalled();
    view.rerender(
      <StatusBarSection {...base} scopeKey="profile-a" title="Casa A" onTitle={saveA} />
    );
    expect(screen.getByRole('textbox', { name: 'Titolo' })).toHaveValue('Bozza A');
    fireEvent.blur(screen.getByRole('textbox', { name: 'Titolo' }));
    expect(saveA).toHaveBeenCalledWith('Bozza A');
  });

  it('non sovrascrive un titolo autorevole cambiato durante la bozza senza una scelta esplicita', () => {
    const onTitle = vi.fn();
    const base = props();
    const view = render(<StatusBarSection {...base} scopeKey="a" title="Casa" onTitle={onTitle} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Titolo' }), {
      target: { value: 'La mia bozza' },
    });
    view.rerender(
      <StatusBarSection {...base} scopeKey="a" title="Titolo aggiornato" onTitle={onTitle} />
    );
    fireEvent.blur(screen.getByRole('textbox', { name: 'Titolo' }));
    expect(onTitle).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Bozza temporanea: si perde uscendo da Sistema.');
    fireEvent.click(screen.getByRole('button', { name: 'Applica la mia bozza' }));
    expect(onTitle).toHaveBeenCalledExactlyOnceWith('La mia bozza');
  });

  it('permette di scegliere il titolo attuale senza inviare la bozza', () => {
    const onTitle = vi.fn();
    const base = props();
    const view = render(<StatusBarSection {...base} scopeKey="a" title="Casa" onTitle={onTitle} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Titolo' }), {
      target: { value: 'Bozza' },
    });
    view.rerender(<StatusBarSection {...base} scopeKey="a" title="Nuovo" onTitle={onTitle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Usa il titolo attuale' }));
    expect(screen.getByRole('textbox', { name: 'Titolo' })).toHaveValue('Nuovo');
    expect(onTitle).not.toHaveBeenCalled();
  });

  it('isola anche la bozza tra identità account diverse, come la key del pannello Sistema', () => {
    const base = props();
    const saveA = vi.fn();
    const saveB = vi.fn();
    const view = render(
      <StatusBarSection key="house:user-a" {...base} scopeKey="a" title="Casa A" onTitle={saveA} />
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Titolo' }), {
      target: { value: 'Bozza privata A' },
    });
    view.rerender(
      <StatusBarSection key="house:user-b" {...base} scopeKey="a" title="Casa B" onTitle={saveB} />
    );
    expect(screen.getByRole('textbox', { name: 'Titolo' })).toHaveValue('Casa B');
    fireEvent.blur(screen.getByRole('textbox', { name: 'Titolo' }));
    expect(saveA).not.toHaveBeenCalled();
    expect(saveB).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('dichiara il limite RAM e alla riapertura rilegge il titolo autorevole senza fingere una bozza persistente', () => {
    const base = props(); const onTitle = vi.fn();
    const view = render(<StatusBarSection {...base} scopeKey="a" title="Casa" onTitle={onTitle} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Titolo' }), { target: { value: 'Bozza temporanea' } });
    expect(screen.getByRole('status')).toHaveTextContent('si perde uscendo da Sistema');
    view.unmount();
    render(<StatusBarSection {...base} scopeKey="a" title="Titolo autorevole" onTitle={onTitle} />);
    expect(screen.getByRole('textbox', { name: 'Titolo' })).toHaveValue('Titolo autorevole');
    expect(screen.queryByRole('status')).toBeNull();
    expect(onTitle).not.toHaveBeenCalled();
  });
});
