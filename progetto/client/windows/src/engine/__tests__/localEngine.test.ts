// @vitest-environment node

import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import type { Server } from 'node:net';
import { tmpdir } from 'node:os';
import type { NetworkInterfaceInfo } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertEnginePortsAvailable, createLocalEngine, LocalEngineError, selectLanAddress, verifyEngineDisk, waitForCoreVersion } from '../localEngine.ts';
import type { LocalEngineDependencies, LocalEngineOptions, LocalNetworkSnapshot } from '../localEngine.ts';
import type { OwnedHaVmManager, OwnedHaVmOptions, OwnedHaVmStatus } from '../ownedHaVm.ts';

let directory: string;
let options: LocalEngineOptions;
let manifestPath: string;
const uuid = '17595a8d-355d-4c72-b4e5-38a60762f900';
const diskContent = 'immagine iniziale di prova, nessuna VM reale';
const sha256 = createHash('sha256').update(diskContent).digest('hex');
const ipv4 = (address: string): NetworkInterfaceInfo => ({ address, family: 'IPv4', internal: false,
  netmask: '255.255.255.0', cidr: `${address}/24`, mac: '00:11:22:33:44:55' });
const network = (): LocalNetworkSnapshot => ({ interfaces: { 'Wi-Fi': [ipv4('192.168.1.27')],
  'VirtualBox Host-Only': [ipv4('192.168.56.1')] }, physicalNames: ['Wi-Fi'] });

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'aca-local-engine-'));
  options = { dataDirectory: join(directory, 'profile', 'engine'), resourcesDirectory: join(directory, 'resources'), onProgress: vi.fn() };
  const materials = join(options.resourcesDirectory, 'engine');
  await mkdir(materials, { recursive: true });
  await writeFile(join(materials, 'haos.vdi'), diskContent);
  manifestPath = join(materials, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ schema: 1, haosVersion: '18.4', expectedCoreVersion: '2026.10.4', diskFile: 'haos.vdi', diskSha256: sha256 }));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

const fakeDependencies = () => {
  let current: OwnedHaVmStatus = { kind: 'absent', vmUuid: null, state: null, configured: false, forwardings: [] };
  let managerOptions: OwnedHaVmOptions | undefined;
  const manager: OwnedHaVmManager = {
    status: vi.fn(async () => current),
    provision: vi.fn(async () => current),
    configureForwardings: vi.fn(async () => current),
    start: vi.fn(async () => {
      await writeFile(join(options.dataDirectory, 'haos.vdi'), 'dati operativi simulati');
      current = { kind: 'present', vmUuid: uuid, state: 'running', configured: true, forwardings: managerOptions?.forwardings ?? [] };
      return current;
    }),
  };
  const deps: LocalEngineDependencies = {
    findVBoxManage: vi.fn(async () => 'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe'),
    network: vi.fn(async () => network()),
    createManager: vi.fn((value) => { managerOptions = value; return manager; }),
    checkPorts: vi.fn(async () => undefined),
    verifyDisk: vi.fn(verifyEngineDisk),
    waitForCore: vi.fn(async () => '2026.10.4'),
  };
  return { deps, manager, setState: (state: OwnedHaVmStatus) => { current = state; }, options: () => managerOptions };
};

describe('coordinatore del motore locale', () => {
  it('non attiva né crea risorse nelle letture iniziali', async () => {
    const fake = fakeDependencies();
    const engine = createLocalEngine(options, fake.deps);
    expect(await engine.enabled()).toBe(false);
    expect(await engine.pairingEndpoint()).toBeNull();
    await expect(engine.ensureStarted()).rejects.toMatchObject({ code: 'disabled' });
    await expect(access(options.dataDirectory)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(fake.deps.findVBoxManage).not.toHaveBeenCalled();
    expect(fake.manager.start).not.toHaveBeenCalled();
  });

  it('predispone solo dopo enable, verifica il VDI e attende il Core esatto', async () => {
    const fake = fakeDependencies();
    const engine = createLocalEngine(options, fake.deps);
    await engine.enable();
    expect(await engine.enabled()).toBe(true);
    expect(await engine.ensureStarted()).toEqual({ vmUuid: uuid, vboxManagePath: 'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe',
      haBase: 'http://127.0.0.1:8123', acaBase: 'http://127.0.0.1:3002', haVersion: '2026.10.4' });
    expect(fake.deps.verifyDisk).toHaveBeenCalledWith(join(options.resourcesDirectory, 'engine', 'haos.vdi'), sha256);
    expect(fake.options()).toMatchObject({ stateDirectory: options.dataDirectory, vmName: 'ACA System Motore', cpus: 4, memoryMb: 4096 });
    expect(fake.deps.checkPorts).toHaveBeenCalledWith([
      { name: 'ha-http', hostPort: 8123, guestPort: 80 }, { name: 'aca-http', hostPort: 3002, guestPort: 3002 },
      { name: 'lan-aca', hostAddress: '192.168.1.27', hostPort: 3002, guestPort: 3002 },
    ]);
    expect(fake.deps.waitForCore).toHaveBeenCalledWith('http://127.0.0.1:8123', '2026.10.4', 1_800_000);
    expect(await engine.pairingEndpoint()).toBe('http://192.168.1.27:3002');
    expect(JSON.parse(await readFile(join(options.dataDirectory, 'local-engine.json'), 'utf8'))).toEqual({ schema: 1, enabled: true });
  });

  it('riusa il disco operativo e non prova a riservare le porte della propria VM attiva', async () => {
    const fake = fakeDependencies();
    const engine = createLocalEngine(options, fake.deps);
    await engine.enable();
    await engine.ensureStarted();
    vi.mocked(fake.deps.verifyDisk).mockClear();
    vi.mocked(fake.deps.checkPorts).mockClear();
    await writeFile(join(options.resourcesDirectory, 'engine', 'haos.vdi'), 'materiale cambiato: non sostituire dati attivi');
    await engine.ensureStarted();
    expect(fake.deps.verifyDisk).not.toHaveBeenCalled();
    expect(fake.deps.checkPorts).not.toHaveBeenCalled();
    expect(await readFile(join(options.dataDirectory, 'haos.vdi'), 'utf8')).toBe('dati operativi simulati');
  });

  it('blocca il primo clone se l’hash del materiale non corrisponde', async () => {
    const fake = fakeDependencies();
    const engine = createLocalEngine(options, fake.deps);
    await engine.enable();
    await writeFile(join(options.resourcesDirectory, 'engine', 'haos.vdi'), 'alterato');
    await expect(engine.ensureStarted()).rejects.toMatchObject({ code: 'materials' });
    expect(fake.manager.start).not.toHaveBeenCalled();
    expect(fake.deps.checkPorts).not.toHaveBeenCalled();
  });

  it('non avvia il motore se una porta è occupata da un altro servizio', async () => {
    const fake = fakeDependencies();
    vi.mocked(fake.deps.checkPorts).mockRejectedValue(new LocalEngineError('ports', 'Porta occupata'));
    const engine = createLocalEngine(options, fake.deps);
    await engine.enable();
    await expect(engine.ensureStarted()).rejects.toMatchObject({ code: 'ports' });
    expect(fake.manager.start).not.toHaveBeenCalled();
  });

  it('se VirtualBox manca mostra un errore senza installare o creare VM', async () => {
    const fake = fakeDependencies();
    vi.mocked(fake.deps.findVBoxManage).mockResolvedValue(null);
    const engine = createLocalEngine(options, fake.deps);
    await engine.enable();
    await expect(engine.ensureStarted()).rejects.toMatchObject({ code: 'prerequisite' });
    expect(fake.deps.createManager).not.toHaveBeenCalled();
  });

  it('rifiuta manifesto incompatibile e percorsi del disco arbitrari', async () => {
    const fake = fakeDependencies();
    const engine = createLocalEngine(options, fake.deps);
    await engine.enable();
    await writeFile(manifestPath, JSON.stringify({ schema: 1, haosVersion: '18.4', expectedCoreVersion: '2026.10.4', diskFile: '../altro.vdi', diskSha256: sha256 }));
    await expect(engine.ensureStarted()).rejects.toMatchObject({ code: 'materials' });
    expect(fake.manager.start).not.toHaveBeenCalled();
  });

  it('con rete fisica ambigua lascia funzionare il PC ma non genera un endpoint QR', async () => {
    const fake = fakeDependencies();
    vi.mocked(fake.deps.network).mockResolvedValue({ interfaces: { 'Wi-Fi': [ipv4('192.168.1.27')], Ethernet: [ipv4('10.0.0.2')] }, physicalNames: ['Wi-Fi', 'Ethernet'] });
    const engine = createLocalEngine(options, fake.deps);
    await engine.enable();
    expect((await engine.ensureStarted()).haVersion).toBe('2026.10.4');
    expect(fake.options()?.forwardings).toHaveLength(2);
    expect(await engine.pairingEndpoint()).toBeNull();
  });

  it('una VM non più registrata non innesca una nuova creazione', async () => {
    const fake = fakeDependencies();
    fake.setState({ kind: 'missing', vmUuid: uuid, state: null, configured: false, forwardings: [] });
    const engine = createLocalEngine(options, fake.deps);
    await engine.enable();
    await expect(engine.ensureStarted()).rejects.toMatchObject({ code: 'configuration' });
    expect(fake.manager.start).not.toHaveBeenCalled();
  });

  it('non dichiara pronto il motore se Core ha una versione differente', async () => {
    const fake = fakeDependencies();
    vi.mocked(fake.deps.waitForCore).mockRejectedValue(new LocalEngineError('version', 'Versione diversa'));
    const engine = createLocalEngine(options, fake.deps);
    await engine.enable();
    await expect(engine.ensureStarted()).rejects.toMatchObject({ code: 'version' });
    expect(options.onProgress).not.toHaveBeenCalledWith('Motore domestico pronto.');
  });
});

describe('rete domestica', () => {
  it('scarta adattatori virtuali e indirizzi pubblici anche se disponibili', () => {
    const snapshot = network();
    expect(selectLanAddress(snapshot)).toBe('192.168.1.27');
    expect(selectLanAddress({ ...snapshot, physicalNames: [] })).toBeNull();
    expect(selectLanAddress({ interfaces: { Ethernet: [ipv4('8.8.8.8'), ipv4('169.254.1.2')] }, physicalNames: ['Ethernet'] })).toBeNull();
  });
});

const listen = (server: Server): Promise<number> => new Promise((accept, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => accept((server.address() as { port: number }).port));
});
const close = (server: Server): Promise<void> => new Promise((accept) => server.close(() => accept()));

describe('controllo delle porte locali', () => {
  it('rileva una porta occupata senza chiudere il servizio che la possiede', async () => {
    const foreign = createServer();
    const port = await listen(foreign);
    try {
      await expect(assertEnginePortsAvailable([{ name: 'ha-http', hostPort: port, guestPort: 80 }])).rejects.toMatchObject({ code: 'ports' });
      expect(foreign.listening).toBe(true);
    } finally { await close(foreign); }
    await assertEnginePortsAvailable([{ name: 'ha-http', hostPort: port, guestPort: 80 }]);
    const probe = createServer();
    await new Promise<void>((accept, reject) => {
      probe.once('error', reject);
      probe.listen(port, '127.0.0.1', () => accept());
    });
    await close(probe);
  });
});

class FakeSocket extends EventTarget {
  close = vi.fn();
}

describe('saluto pubblico del Core', () => {
  it('accetta auth_required della versione attesa senza inviare un login', async () => {
    const socket = new FakeSocket();
    const factory = vi.fn((url: string) => {
      expect(url).toBe('ws://127.0.0.1:8123/api/websocket');
      queueMicrotask(() => socket.dispatchEvent(new MessageEvent('message', { data: '{"type":"auth_required","ha_version":"2026.10.4"}' })));
      return socket as unknown as WebSocket;
    });
    expect(await waitForCoreVersion('http://127.0.0.1:8123', '2026.10.4', 1000, factory)).toBe('2026.10.4');
    expect(socket.close).toHaveBeenCalledOnce();
  });

  it('blocca subito una versione diversa senza ritentare o creare account', async () => {
    const socket = new FakeSocket();
    const factory = vi.fn(() => {
      queueMicrotask(() => socket.dispatchEvent(new MessageEvent('message', { data: '{"type":"auth_required","ha_version":"2026.11.0"}' })));
      return socket as unknown as WebSocket;
    });
    await expect(waitForCoreVersion('http://127.0.0.1:8123', '2026.10.4', 1000, factory)).rejects.toMatchObject({ code: 'version' });
    expect(factory).toHaveBeenCalledOnce();
  });

  it('non considera pronto un socket che non invia il saluto', async () => {
    const socket = new FakeSocket();
    await expect(waitForCoreVersion('http://127.0.0.1:8123', '2026.10.4', 20, () => socket as unknown as WebSocket))
      .rejects.toMatchObject({ code: 'timeout' });
    expect(socket.close).toHaveBeenCalledOnce();
  });
});
