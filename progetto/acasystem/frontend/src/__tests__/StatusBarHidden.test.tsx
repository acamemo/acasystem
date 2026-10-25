import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StatusBar } from '@/components/system/status-bar/StatusBar';

afterEach(cleanup);

const bar = (hidden: boolean) =>
  render(
    <StatusBar
      hidden={hidden}
      time={new Date(2026, 9, 7, 16, 30)}
      connection={{ phase: 'connected', label: 'Collegato' }}
      chips={[]}
      onEdit={() => undefined}
      onOpenSystem={() => undefined}
    />
  );

describe('barra di stato sulla copertina (REP-20261007-015)', () => {
  it('nascosta: sotto lo schermo, inerte e muta', () => {
    const { container } = bar(true);
    // REP-20261013-002, ADR-0013: un gruppo nella fascia in basso, non più l’intestazione.
    const group = container.querySelector<HTMLElement>('[data-band-bar="status"]');
    expect(container.querySelector('header')).toBeNull();
    expect(group?.tagName).toBe('DIV');
    expect(group).toHaveAttribute('role', 'group');
    expect(group).toHaveAttribute('aria-label', 'Stato e comandi');
    expect(group).toHaveClass('aca-status-bar--hidden');
    expect(group).toHaveAttribute('inert');
    expect(group).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('group', { name: 'Stato e comandi' })).toBeNull();
  });

  it('sulle pagine dei widget: visibile e usabile', () => {
    bar(false);
    const group = screen.getByRole('group', { name: 'Stato e comandi' });
    expect(group).not.toHaveClass('aca-status-bar--hidden');
    expect(group).not.toHaveAttribute('inert');
    expect(group).not.toHaveAttribute('aria-hidden');
    expect(group).toHaveAttribute('data-band-bar', 'status');
  });

  it('le due pillole sono i gruppi che la fascia misura; Sistema è a sinistra, «Modifica» a destra', () => {
    bar(false);
    const group = screen.getByRole('group', { name: 'Stato e comandi' });
    const start = group.querySelector('[data-band-group="start"]');
    const end = group.querySelector('[data-band-group="end"]');
    expect(start).not.toBeNull();
    expect(end).not.toBeNull();
    // Ora, connessione e Sistema a sinistra, lontano dall’angolo di «Modifica» e «Fine».
    expect(start?.querySelector('time')).toHaveTextContent('16:30');
    expect(within(start as HTMLElement).getByRole('status')).toBeInTheDocument();
    expect(within(start as HTMLElement).getByRole('button', { name: /^Sistema/ })).toBeVisible();
    expect(within(end as HTMLElement).getByRole('button', { name: 'Modifica' })).toHaveAttribute(
      'data-launcher-edit'
    );
    expect(within(end as HTMLElement).queryByRole('button', { name: /^Sistema/ })).toBeNull();
  });
});
