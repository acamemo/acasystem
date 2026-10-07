import { afterEach, describe, expect, it } from 'vitest';
import { Auth, createLongLivedTokenAuth } from 'home-assistant-js-websocket';
import { getClientId, getHassUrl, resolveClientId, resolveHassUrl } from '@/api/haUrl';

/**
 * REP-20261007-002, corsia accesso: un unico punto calcola l'indirizzo di Home Assistant visto
 * dal browser, cioè il proxy `/ha` del server Acasystem accanto all'app.
 */

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('hassUrl del proxy Acasystem', () => {
  it('senza percorso base è origine + /ha, senza barra finale', () => {
    expect(resolveHassUrl('http://localhost:3002/')).toBe('http://localhost:3002/ha');
    expect(resolveHassUrl('http://localhost:3002/index.html#/sistema')).toBe(
      'http://localhost:3002/ha'
    );
    expect(resolveHassUrl('https://casa.example.com/?vista=sistema#/')).toBe(
      'https://casa.example.com/ha'
    );
  });

  it('con un percorso base include il percorso dell’app', () => {
    expect(resolveHassUrl('http://192.168.1.10:3002/acasystem/')).toBe(
      'http://192.168.1.10:3002/acasystem/ha'
    );
    expect(resolveHassUrl('http://192.168.1.10:3002/acasystem/index.html#/sistema')).toBe(
      'http://192.168.1.10:3002/acasystem/ha'
    );
    expect(resolveHassUrl('https://casa.example.com/api/hassio_ingress/abc123/')).toBe(
      'https://casa.example.com/api/hassio_ingress/abc123/ha'
    );
  });

  it('per la pagina corrente segue l’indirizzo del documento, rotte hash escluse', () => {
    expect(getHassUrl()).toBe(`${window.location.origin}/ha`);
    window.history.replaceState(null, '', '/acasystem/#/sistema');
    expect(getHassUrl()).toBe(`${window.location.origin}/acasystem/ha`);
  });

  it('client_id e redirect_uri sono l’origine con la barra finale, anche in un sottopercorso', () => {
    expect(resolveClientId('http://localhost:3002/acasystem/index.html#/')).toBe(
      'http://localhost:3002/'
    );
    window.history.replaceState(null, '', '/acasystem/');
    expect(getClientId()).toBe(`${window.location.origin}/`);
  });

  it('HAWS apre il WebSocket attraverso il proxy, in chiaro e in HTTPS', () => {
    const local = createLongLivedTokenAuth(getHassUrl(), 'token-di-prova');
    expect(local.wsUrl).toBe(`ws://${window.location.host}/ha/api/websocket`);
    const remote = new Auth({
      hassUrl: resolveHassUrl('https://casa.example.com/acasystem/'),
      clientId: 'https://casa.example.com/',
      access_token: 'a',
      refresh_token: 'r',
      expires: Date.now() + 60_000,
      expires_in: 60,
    });
    expect(remote.wsUrl).toBe('wss://casa.example.com/acasystem/ha/api/websocket');
  });
});
