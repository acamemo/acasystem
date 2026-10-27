// @vitest-environment node

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEVICE_OPERATIONS, INSTALLER_ONLY_OPERATIONS } from '../config/devices.ts';
import {
  ALL_HA_CALLS,
  COMPARED_HA_VERSIONS,
  HA_CALLS,
  SUPPORTED_HA_VERSION,
  VERIFIED_HA_SERIES,
  VERIFIED_HA_VERSIONS,
  isVerifiedHaVersion,
  powerTriggerFormsFor,
} from '../config/homeAssistantApiCatalog.ts';
import { SOURCE_DIR } from '../config/paths.ts';

/**
 * Structure tests: the facts the design relies on (one adapter, one catalogue of HA calls, no
 * network scan, no secret path in the tunnel) are checked on the source itself, so a later
 * change that breaks them fails here and not in production.
 */

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });

/** Code without comments (so the documentation of a route is not mistaken for its use). */
const codeOf = (path: string): string =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const relativeName = (path: string): string => relative(SOURCE_DIR, path).split(sep).join('/');

const FILES = sourceFiles(SOURCE_DIR).map((path) => ({
  name: relativeName(path),
  code: codeOf(path),
}));

describe('the catalogue of Home Assistant calls', () => {
  it('describes each call once, as public only when it is documented', () => {
    const ids = ALL_HA_CALLS.map((call) => call.id);
    expect(new Set(ids).size).toBe(ids.length);

    const shapes = ALL_HA_CALLS.map((call) =>
      call.transport === 'rest' ? `${call.method} ${call.path}` : `ws ${call.type}`
    );
    expect(new Set(shapes).size).toBe(shapes.length);

    for (const call of ALL_HA_CALLS) {
      expect(call.kind).toBe(call.haClass === 'DOC' ? 'public' : 'internal');
      expect(call.verifiedVersion).toBe(SUPPORTED_HA_VERSION);
      // Every call is covered by a contract test or a probe of the plan, or says it is not.
      expect(call.checks.length, call.id).toBeGreaterThan(0);
      expect(
        call.checks.every((check) => /^(CT|RD)-\d\d$/.test(check)),
        call.id
      ).toBe(true);
      if (call.evidence === 'unverified') expect(call.kind).toBe('internal');
      if (call.transport === 'rest') {
        expect(call.path.startsWith('/')).toBe(true);
        expect(call.path).not.toMatch(/\s|\?|#/);
      }
    }
  });

  it('keeps the public calls to the ones the plan lists as documented', () => {
    const publicIds = ALL_HA_CALLS.filter((call) => call.kind === 'public')
      .map((call) => call.id)
      .sort();
    expect(publicIds).toEqual(
      [
        'auth.long_lived_access_token',
        'auth.revoke',
        'auth.token',
        'states.get',
        'validate_config',
      ].sort()
    );
    // The routes that carry the configuration flows are internal: no stability promise.
    for (const call of [
      HA_CALLS.flowStart,
      HA_CALLS.flowStep,
      HA_CALLS.automationPut,
    ]) {
      expect(call.kind).toBe('internal');
    }
  });

  it('declares one supported version, verified by reading the source, and the one only compared', () => {
    expect(SUPPORTED_HA_VERSION).toBe('2026.9.4');
    expect(VERIFIED_HA_VERSIONS).toEqual(['2026.9.4']);
    expect(COMPARED_HA_VERSIONS).toEqual([]);
    // 2026.10.x was tried on a running HA on 2026-10-27 (REP-20261026-006).
    expect(VERIFIED_HA_SERIES).toEqual(['2026.10']);
    expect(isVerifiedHaVersion('2026.9.4')).toBe(true);
    expect(isVerifiedHaVersion('2026.10.2')).toBe(true);
    expect(isVerifiedHaVersion('2026.10.4')).toBe(true);
    expect(isVerifiedHaVersion('2026.10')).toBe(false);
    expect(isVerifiedHaVersion('2026.10.x')).toBe(false);
    expect(isVerifiedHaVersion('2026.100.1')).toBe(false);
    expect(isVerifiedHaVersion('2026.11.0')).toBe(false);
    expect(isVerifiedHaVersion(null)).toBe(false);
    expect(powerTriggerFormsFor('2026.9.4')[0]).toBe('device');
    expect(powerTriggerFormsFor('2099.1.0')).toEqual(['device', 'platform']);
  });

  it('is the only place that names a route or a command of Home Assistant', () => {
    const NAMES = [
      '/api/config/config_entries',
      'config_entries/get',
      '/api/config/automation',
      'integration/descriptions',
      'config/auth/',
      'config/auth_provider',
      'auth/long_lived_access_token',
      'auth/refresh_tokens',
      'auth/delete_refresh_token',
      'config/device_registry',
      'config/entity_registry',
      'config/area_registry',
      "'validate_config'",
      '/auth/login_flow',
      '/api/states/',
    ];
    const offenders = FILES.filter(
      (file) => file.name !== 'config/homeAssistantApiCatalog.ts'
    ).flatMap((file) =>
      NAMES
        // The proxy lists the login routes it forwards for the browser (a different list, tested elsewhere).
        .filter(
          (name) => !(file.name === 'config/homeAssistantProxy.ts' && name === '/auth/login_flow')
        )
        .filter((name) => file.code.includes(name))
        .map((name) => `${file.name}: ${name}`)
    );
    expect(offenders).toEqual([]);
  });

  it('is used by the adapter only: no other module calls HA by itself', () => {
    const callers = FILES.filter(
      (file) => file.code.includes('HA_CALLS') && file.name !== 'config/homeAssistantApiCatalog.ts'
    ).map((file) => file.name);
    expect(callers).toEqual(['services/devices/haAdapter.ts']);
  });
});

describe('the closed list of operations', () => {
  it('has the operations of the plan and keeps the installer ones inside it', () => {
    expect(new Set(DEVICE_OPERATIONS).size).toBe(DEVICE_OPERATIONS.length);
    for (const operation of INSTALLER_ONLY_OPERATIONS)
      expect(DEVICE_OPERATIONS).toContain(operation);
    expect(INSTALLER_ONLY_OPERATIONS).toEqual(['power.remove', 'action.list']);
  });

  it('is enforced by one guard that every operation of the service goes through', () => {
    const service =
      FILES.find((file) => file.name === 'services/devices/deviceService.ts')?.code ?? '';
    const recipe =
      FILES.find((file) => file.name === 'services/devices/powerRecipe.ts')?.code ?? '';
    const used = [
      ...service.matchAll(/(?:runGuarded|authorizeOperation)\(\s*(?:ctx,\s*user,\s*)?'([a-z.]+)'/g),
      ...recipe.matchAll(/runGuarded\(\s*ctx,\s*user,\s*'([a-z.]+)'/g),
    ].map((match) => match[1]);
    for (const operation of DEVICE_OPERATIONS) {
      expect(used, `operation ${operation} is not guarded`).toContain(operation);
    }
  });

  it('routes only the operations of the facade, under /api/dispositivi', () => {
    const router = FILES.find((file) => file.name === 'routes/devices.ts')?.code ?? '';
    const paths = [...router.matchAll(/router\.(?:get|post|patch|put|delete)\('([^']+)'/g)].map(
      (match) => match[1]
    );
    expect(paths).toEqual([
      '/stato',
      '/catalogo',
      '/flussi',
      '/flussi',
      '/flussi/:flowId',
      '/flussi/:flowId',
      '/flussi/:flowId',
      '/scoperti',
      '/scoperti/:flowId/aggiungi',
      '/scoperti/:flowId/ignora',
      '/voci/:entryId',
      '/voci/:entryId',
      '/dispositivi/:deviceId',
      '/stanze',
      '/stanze',
      '/accensione/:entryId',
      '/accensione/:entryId',
      '/accensione/:entryId',
      '/registro',
    ]);
    const server = FILES.find((file) => file.name === 'server.ts')?.code ?? '';
    expect(server).toMatch(/app\.use\('\/api\/dispositivi', homeAssistantAuth,/);
  });
});

describe('no scan of the network, no secret in the tunnel', () => {
  it('has no module that can send packets on the LAN or read the ARP table', () => {
    const FORBIDDEN = [
      "'node:dgram'",
      "'dgram'",
      "'node:child_process'",
      "'child_process'",
      "'node:net'",
      "'net'",
      "'node:dns'",
      "'arp'",
      'arp -a',
      'ip neigh',
      'nmap',
    ];
    const offenders = FILES.flatMap((file) =>
      FORBIDDEN.filter((name) => file.code.includes(name)).map((name) => `${file.name}: ${name}`)
    );
    // The existing proxy opens TCP connections to HA through node:http and ws; it is not listed here.
    expect(
      offenders.filter(
        (line) =>
          !line.startsWith('routes/homeAssistantProxy.ts') &&
          !line.startsWith('services/homeAssistantProxyService.ts')
      )
    ).toEqual([]);
  });

  it('keeps the Wake on LAN to Home Assistant: the recipe creates entries and automations only', () => {
    const recipe =
      FILES.find((file) => file.name === 'services/devices/powerRecipe.ts')?.code ?? '';
    expect(recipe).not.toMatch(/magic_packet|sendMagic|[^a-z]dgram[^a-z]|[^a-z]udp[^a-z]/i);
  });

  it('does not let the proxy modules reach the service identity or its secret', () => {
    const PROXY = [
      'routes/homeAssistantProxy.ts',
      'services/homeAssistantProxyService.ts',
      'config/homeAssistantProxy.ts',
      'helpers/homeAssistantProxyPaths.ts',
    ];
    for (const name of PROXY) {
      const code = FILES.find((file) => file.name === name)?.code ?? '';
      expect(code.length, name).toBeGreaterThan(0);
      expect(code, name).not.toMatch(
        /services\/devices|serviceIdentity|secretFile|readDeviceServiceSecretPath|service-identity/
      );
    }
  });

  it('reads the service secret in one place only', () => {
    const readers = FILES.filter((file) => file.code.includes('readSecretFile')).map(
      (file) => file.name
    );
    expect(readers).toEqual(['helpers/secretFile.ts', 'services/devices/serviceIdentity.ts']);
    const pathReaders = FILES.filter((file) =>
      file.code.includes('readDeviceServiceSecretPath')
    ).map((file) => file.name);
    expect(pathReaders).toEqual([
      'cli/deviceServiceIdentity.ts',
      'config/devices.ts',
      'services/devices/index.ts',
    ]);
  });

  it('has no console output that could carry a request body, token or address', () => {
    const devices = FILES.filter((file) =>
      /^(services\/devices|controllers\/devicesController|routes\/devices|cli\/)/.test(file.name)
    );
    for (const file of devices) {
      const calls = [...file.code.matchAll(/console\.(?:log|warn|error|info)\(([^;]*)\)/g)].map(
        (match) => match[1] ?? ''
      );
      for (const argument of calls) {
        expect(argument, file.name).not.toMatch(/\b(token|password|body|req\.|mac|host|secret)\b/i);
      }
    }
  });
});
