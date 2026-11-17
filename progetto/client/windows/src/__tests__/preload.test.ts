// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = stripTypeScriptTypes(
  await readFile(new URL('../preload.cts', import.meta.url), 'utf8'),
);
const load = (address: string) => {
  const expose = vi.fn();
  const invoke = vi.fn(async () => ({ endpoint: null }));
  const on = vi.fn();
  runInNewContext(source, {
    location: new URL(address),
    require: (name: string) => {
      if (name !== 'electron') throw new Error(`Modulo inatteso: ${name}`);
      return {
        contextBridge: { exposeInMainWorld: expose },
        ipcRenderer: { invoke, on },
      };
    },
  });
  const bridge = expose.mock.calls[0]?.[1] as
    Record<string, (...args: unknown[]) => unknown> | undefined;
  return { expose, invoke, on, bridge };
};

describe('confine del preload Windows', () => {
  it('il guscio file espone i comandi previsti, senza endpoint o IPC generico', async () => {
    const { bridge, invoke } = load('file:///app/shell/index.html');
    expect(Object.keys(bridge!).sort()).toEqual(
      [
        'changeAddress',
        'getState',
        'onState',
        'retry',
        'submit',
      ].sort(),
    );
    await bridge!.submit!('192.168.1.20', '3002');
    expect(invoke).toHaveBeenCalledExactlyOnceWith('shell:submit', '192.168.1.20', '3002');
  });

  it('la UI su loopback riceve soltanto la lettura dell’endpoint', async () => {
    const { bridge, invoke } = load('http://127.0.0.1:47320/');
    expect(Object.keys(bridge!)).toEqual(['pairingEndpoint']);
    await bridge!.pairingEndpoint!();
    expect(invoke).toHaveBeenCalledExactlyOnceWith('shell:pairing-endpoint');
  });

  it('il listener dello stato non trasferisce l’evento IPC al renderer', () => {
    const { bridge, on } = load('file:///app/shell/index.html');
    const listener = vi.fn();
    bridge!.onState!(listener);
    const state = { view: 'wizard', shellVersion: '0.1.0' };
    on.mock.calls[0]![1]({ sender: 'privilegiato' }, state);
    expect(listener).toHaveBeenCalledExactlyOnceWith(state);
  });

  it.each([
    'https://example.com/',
    'http://192.168.1.20:3002/',
    'http://localhost:47320/',
    'https://127.0.0.1:47320/',
    'http://127.0.0.1.evil.test/',
  ])('nessun ponte su %s', (address) => {
    expect(load(address).expose).not.toHaveBeenCalled();
  });
});
