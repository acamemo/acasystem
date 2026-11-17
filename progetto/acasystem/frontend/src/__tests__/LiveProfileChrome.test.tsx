import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiveProfileChrome } from '@/hooks/liveProfiles/LiveProfileChrome';
import { AppShell } from '@/templates/app-shell/AppShell';

describe('spazio del chrome del profilo, indipendente dalla griglia', () => {
  it('mantiene la bozza e lo stesso contenuto durante comparsa, espansione e rimozione degli avvisi', () => {
    const retry = vi.fn();
    const content = <input aria-label="Bozza" defaultValue="" />;
    const view = render(<LiveProfileChrome notice={null}>{content}</LiveProfileChrome>);
    const draft = screen.getByLabelText('Bozza');
    fireEvent.change(draft, { target: { value: 'Modifica non ancora salvata' } });
    view.rerender(<LiveProfileChrome notice={<p role="status">Sincronizzato</p>}>{content}</LiveProfileChrome>);
    view.rerender(<LiveProfileChrome notice={<><p role="status">La modifica resta una bozza.</p><button onClick={retry}>Riprova sincronizzazione</button></>}>{content}</LiveProfileChrome>);
    expect(screen.getByLabelText('Bozza')).toBe(draft);
    expect(draft).toHaveValue('Modifica non ancora salvata');
    fireEvent.click(screen.getByRole('button', { name: 'Riprova sincronizzazione' }));
    expect(retry).toHaveBeenCalledOnce();
    view.rerender(<LiveProfileChrome notice={null}>{content}</LiveProfileChrome>);
    expect(view.container.querySelector('.aca-live-chrome')).toBeEmptyDOMElement();
    expect(screen.getByLabelText('Bozza')).toBe(draft);
    expect(draft).toHaveValue('Modifica non ancora salvata');
  });

  it('connessione e indicatore condividono lo stesso stack mentre il pager resta nel main', () => {
    const view = render(<AppShell footer={<button>Fine</button>} top={<div data-testid="indicator">Sicurezza</div>} notice={<div data-testid="notice">Connessione non disponibile</div>}><div data-testid="grid" /></AppShell>);
    const chrome = view.container.querySelector('.aca-shell__top')!;
    expect(chrome.querySelector('.aca-shell__notices [data-testid="notice"]')).not.toBeNull();
    expect(chrome.querySelector('[data-testid="indicator"]')).not.toBeNull();
    expect(view.container.querySelector('main [data-testid="grid"]')).not.toBeNull();
    expect(chrome.querySelector('[data-testid="grid"]')).toBeNull();
  });
});
