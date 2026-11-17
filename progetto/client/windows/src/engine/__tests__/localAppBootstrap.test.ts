// @vitest-environment node

import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapLocalApp } from '../localAppBootstrap.ts';
import type { LocalAppBootstrapDependencies, LocalAppBootstrapOptions } from '../localAppBootstrap.ts';
import type { OwnedHaVmStatus } from '../ownedHaVm.ts';

const uuid = '11111111-2222-4333-8444-555555555555';
const content = 'archivio sorgente simulato; estrazione guest non eseguita nei test';
const sourceSha256 = createHash('sha256').update(content).digest('hex');
let directory: string;
let options: LocalAppBootstrapOptions;
let events: string[];

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'aca-bootstrap-'));
  events = [];
  options = {
    vmUuid: uuid, vboxManagePath: 'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe',
    stateDirectory: join(directory, 'engine'), resourcesDirectory: join(directory, 'resources'), onProgress: vi.fn(),
    vmManager: { status: vi.fn(async (): Promise<OwnedHaVmStatus> => {
      events.push('verify');
      return { kind: 'present', vmUuid: uuid, state: 'running', configured: true, forwardings: [] };
    }) },
  };
  const materials = join(options.resourcesDirectory, 'engine');
  await mkdir(materials, { recursive: true });
  await writeFile(join(materials, 'manifest.json'), JSON.stringify({ schema: 1, sourceArchive: 'acasystem-source.tgz', sourceSha256, appVersion: '0.9.31' }));
  await writeFile(join(materials, 'acasystem-source.tgz'), content);
});

afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

const localUrl = (url: string): string => url.replace('10.0.2.2', '127.0.0.1');
const fakeGuest = (confirm = true) => {
  const commands: string[][] = [];
  let command = '';
  let archiveUrl = '';
  const execute: LocalAppBootstrapDependencies['execute'] = vi.fn(async (file, args) => {
    expect(file).toBe(options.vboxManagePath);
    expect(args[0]).toBe('controlvm');
    expect(args[1]).toBe(uuid);
    commands.push([...args]);
    events.push('keyboard');
    if (args[2] === 'keyboardputstring' && args[3] !== 'login') {
      command = args[3]!;
      archiveUrl = localUrl(/http:\/\/10\.0\.2\.2:\d+\/[a-f0-9]{48}\/archive/.exec(command)?.[0] ?? '');
      expect(command).not.toContain('\n');
      expect(command).toMatch(new RegExp(`echo '${sourceSha256}  /tmp/aca-source-[a-f0-9]{48}\\.tgz' \\| sha256sum -c -`));
      expect(command).toContain("mkdir -p '/mnt/data/supervisor/apps/local/acasystem'");
      expect(command).toContain("-C '/mnt/data/supervisor/apps/local/acasystem'");
      expect(command).toMatch(/&& exit$/);
    }
    if (args[2] === 'keyboardputscancode') {
      expect(args.slice(3)).toEqual(['1c', '9c']);
      if (command && confirm) {
        const completeUrl = localUrl(/http:\/\/10\.0\.2\.2:\d+\/[a-f0-9]{48}\/complete\?sha256=[a-f0-9]{64}/.exec(command)?.[0] ?? '');
        expect((await fetch(completeUrl)).status).toBe(403);
        expect((await fetch(`${archiveUrl}/../other`)).status).toBe(404);
        expect((await fetch(archiveUrl, { method: 'POST' })).status).toBe(405);
        const archive = await fetch(archiveUrl);
        expect(archive.headers.get('content-length')).toBe(String(Buffer.byteLength(content)));
        expect(archive.headers.get('cache-control')).toBe('no-store');
        const bytes = Buffer.from(await archive.arrayBuffer());
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(sourceSha256);
        expect((await fetch(completeUrl.replace(sourceSha256, '0'.repeat(64)))).status).toBe(403);
        const complete = await fetch(completeUrl);
        expect(complete.status).toBe(200);
        expect(await complete.text()).toBe('ok\n');
      }
    }
    return { stdout: '', stderr: '' };
  });
  return { commands, execute, archiveUrl: () => archiveUrl, command: () => command };
};

describe('preparazione locale dei soli sorgenti ACA', () => {
  it('serve soltanto i due endpoint con nonce e registra successo dopo conferma del guest', async () => {
    const guest = fakeGuest();
    const result = await bootstrapLocalApp(options, { execute: guest.execute, pause: async () => undefined, timeoutMs: 2000 });
    expect(result).toEqual({ kind: 'prepared', appVersion: '0.9.31', sourceSha256 });
    expect(guest.commands).toHaveLength(4);
    expect(guest.commands[0]).toEqual(['controlvm', uuid, 'keyboardputstring', 'login']);
    for (let index = 0; index < events.length; index++) {
      if (events[index] === 'keyboard') expect(events[index - 1]).toBe('verify');
    }
    expect(JSON.parse(await readFile(join(options.stateDirectory, 'local-app-bootstrap.json'), 'utf8')))
      .toEqual({ schema: 1, vmUuid: uuid, phase: 'complete', sourceSha256 });
    await expect(fetch(guest.archiveUrl())).rejects.toThrow();
  });

  it('non digita nuovamente i comandi per lo stesso hash completato', async () => {
    const guest = fakeGuest();
    const deps = { execute: guest.execute, pause: async () => undefined, timeoutMs: 2000 };
    await bootstrapLocalApp(options, deps);
    const count = guest.commands.length;
    expect((await bootstrapLocalApp(options, deps)).kind).toBe('already-prepared');
    expect(guest.commands).toHaveLength(count);
  });

  it('non accetta un archivio modificato e non apre una console', async () => {
    await writeFile(join(options.resourcesDirectory, 'engine', 'acasystem-source.tgz'), 'alterato');
    const guest = fakeGuest();
    await expect(bootstrapLocalApp(options, { execute: guest.execute })).rejects.toMatchObject({ code: 'materials' });
    expect(guest.commands).toHaveLength(0);
    await expect(access(options.stateDirectory)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('non trasferisce un archivio vuoto', async () => {
    await writeFile(join(options.resourcesDirectory, 'engine', 'acasystem-source.tgz'), '');
    const guest = fakeGuest();
    await expect(bootstrapLocalApp(options, { execute: guest.execute })).rejects.toMatchObject({ code: 'materials' });
    expect(guest.commands).toHaveLength(0);
  });

  it.each(['missing', 'wrong-uuid', 'not-running', 'not-configured'])('blocca la proprietà non dimostrata: %s', async (condition) => {
    options.vmManager = { status: vi.fn(async (): Promise<OwnedHaVmStatus> => ({ kind: condition === 'missing' ? 'missing' : 'present',
      vmUuid: condition === 'wrong-uuid' ? '22222222-2222-4333-8444-555555555555' : uuid,
      state: condition === 'not-running' ? 'poweroff' : 'running', configured: condition !== 'not-configured', forwardings: [],
    })) };
    const guest = fakeGuest();
    await expect(bootstrapLocalApp(options, { execute: guest.execute })).rejects.toMatchObject({ code: 'ownership' });
    expect(guest.commands).toHaveLength(0);
  });

  it('ricontrolla la proprietà prima di premere Invio, non solo prima del login', async () => {
    const good: OwnedHaVmStatus = { kind: 'present', vmUuid: uuid, state: 'running', configured: true, forwardings: [] };
    options.vmManager = { status: vi.fn().mockResolvedValueOnce(good).mockResolvedValueOnce(good)
      .mockResolvedValue({ ...good, vmUuid: '22222222-2222-4333-8444-555555555555' }) };
    const guest = fakeGuest();
    await expect(bootstrapLocalApp(options, { execute: guest.execute, pause: async () => undefined })).rejects.toMatchObject({ code: 'ownership' });
    expect(guest.commands).toEqual([['controlvm', uuid, 'keyboardputstring', 'login']]);
    const before = guest.commands.length;
    await expect(bootstrapLocalApp(options, { execute: guest.execute })).rejects.toMatchObject({ code: 'interrupted' });
    expect(guest.commands).toHaveLength(before);
  });

  it('un timeout conserva pending, chiude il server e vieta un retry alla cieca', async () => {
    const guest = fakeGuest(false);
    await expect(bootstrapLocalApp(options, { execute: guest.execute, pause: async () => undefined, timeoutMs: 30 }))
      .rejects.toMatchObject({ code: 'timeout' });
    expect(JSON.parse(await readFile(join(options.stateDirectory, 'local-app-bootstrap.json'), 'utf8')).phase).toBe('pending');
    await expect(fetch(guest.archiveUrl())).rejects.toThrow();
    await expect(bootstrapLocalApp(options, { execute: guest.execute })).rejects.toMatchObject({ code: 'interrupted' });
    expect(guest.commands).toHaveLength(4);
  });

  it('non digita comandi se manca il registro proprietario nel percorso senza manager iniettato', async () => {
    const guest = fakeGuest();
    const { vmManager: _manager, ...withoutManager } = options;
    await expect(bootstrapLocalApp(withoutManager, { execute: guest.execute })).rejects.toMatchObject({ code: 'ownership' });
    expect(guest.commands).toHaveLength(0);
  });
});
