import { describe, expect, it } from 'vitest';
import { parseConnectionCode } from '../connectionCode.ts';
import { submitAddress } from '../wizard.ts';
import { createConfigStore, createHttp } from './fakes.ts';

describe('QR di collegamento alla centrale', () => {
  it.each(['http://192.168.1.20:3002', 'http://192.168.1.20:3002/'])(
    'legge %s senza richiedere un invito account', (value) => {
      expect(parseConnectionCode(value)).toEqual({ ok: true, value: { host: '192.168.1.20', port: 3002 } });
    },
  );
  it.each([
    'https://192.168.1.20:3002/', 'http://127.0.0.1:3002/', 'http://8.8.8.8:3002/',
    'http://owner:password@192.168.1.20:3002/', 'http://192.168.1.20:3002/path',
    'http://192.168.1.20:3002/?token=secret', 'http://192.168.1.20:3002/#/collega?invite=secret',
  ])('rifiuta indirizzi o dati non ammessi: %s', (value) => {
    expect(parseConnectionCode(value).ok).toBe(false);
  });
  it('il link incollato conserva la porta e salva soltanto dopo health ACA', async () => {
    const { http } = createHttp({ 'http://192.168.1.20:43002/api/health': { status: 'ok', version: '0.9.31' } });
    const store = createConfigStore();
    expect(await submitAddress({ host: 'http://192.168.1.20:43002/' }, { http, config: store.store }))
      .toEqual({ ok: true, config: { host: '192.168.1.20', port: 43002 }, serverVersion: '0.9.31' });
    expect(store.current()).toEqual({ host: '192.168.1.20', port: 43002 });
    const unavailable = createConfigStore();
    expect((await submitAddress({ host: 'http://192.168.1.21:43002/' }, { http, config: unavailable.store })).ok).toBe(false);
    expect(unavailable.current()).toBeNull();
  });
  it('non riutilizza il loopback della VM accantonata', async () => {
    const { http } = createHttp({});
    const store = createConfigStore();
    expect(await submitAddress({ host: '127.0.0.1' }, { http, config: store.store })).toEqual({ ok: false, error: 'not-local' });
    expect(store.current()).toBeNull();
  });
});
