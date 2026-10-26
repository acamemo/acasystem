import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectionSection } from '@/pages/system/sections/ConnectionSection';
import { CHANGE_ADDRESS_URL, isClientShell } from '@/utils/clientShell';
import type { ConnectionSummary } from '@/utils/launcher/connection';

/**
 * «Cambia indirizzo» in Sistema > Collegamento (ADR-0023): solo dentro l'app client per Windows
 * e Android, che si riconosce dallo user agent e intercetta acasystem://change-address.
 */

const connected = { phase: 'connected' } as unknown as ConnectionSummary;

const renderSection = (onChangeAddress?: (() => void) | null) =>
  render(
    <ConnectionSection
      status={connected}
      oauthExpired={false}
      method="oauth"
      user={null}
      onReconnect={() => {}}
      onLogout={() => {}}
      onChangeAddress={onChangeAddress}
    />
  );

describe('app client: riconoscimento', () => {
  it('riconosce lo user agent dell’app e non quello dei browser', () => {
    expect(
      isClientShell(
        'Mozilla/5.0 (Linux; Android 15) Chrome/155.0 Mobile AcasystemShell/0.1.0 (Android)'
      )
    ).toBe(true);
    expect(
      isClientShell('Mozilla/5.0 (Windows NT 10.0) Electron/44.7.0 AcasystemShell/0.2.0 (Windows)')
    ).toBe(true);
    expect(isClientShell('Mozilla/5.0 (Linux; Android 15) Chrome/155.0 Mobile Safari/537.36')).toBe(
      false
    );
    expect(isClientShell('AcasystemShell/')).toBe(false);
    expect(CHANGE_ADDRESS_URL).toBe('acasystem://change-address');
  });
});

describe('Sistema > Collegamento: «Cambia indirizzo»', () => {
  it('non compare nel browser', () => {
    renderSection(null);
    expect(screen.getByRole('button', { name: 'Esci' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cambia indirizzo' })).toBeNull();
  });

  it('compare nell’app accanto a «Esci» e porta alla procedura guidata, senza conferma', () => {
    const onChangeAddress = vi.fn();
    renderSection(onChangeAddress);
    fireEvent.click(screen.getByRole('button', { name: 'Cambia indirizzo' }));
    expect(onChangeAddress).toHaveBeenCalledTimes(1);
  });
});
