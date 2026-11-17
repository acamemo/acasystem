/**
 * The rest of the backend of the demo mode (REP-20261028-005): `/api/health`, `/api/settings/*`
 * and `/api/profiles*`, answered from memory with the shapes of the real server, so the Sistema
 * page, the settings sync and the profiles work as they do in the app. Every write stays in the
 * page: the revisions follow the same compare-and-swap rule (409 with the current revision) and
 * nothing outlives the visit. The device paths go to the device facade.
 */
import type { MockDeviceFacade, MockRequest, MockResponse } from './deviceFacade';
import { createMockAccountActivity } from './accountActivity';

type Row = Record<string, unknown>;

interface SettingsEntry {
  current: Row;
  history: Row[];
}

const reply = (body: unknown, status = 200): Promise<MockResponse> =>
  Promise.resolve({ status, body });

const asRecord = (value: unknown): Row =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Row) : {};

export function createMockBackend(
  devices: MockDeviceFacade,
  options: { now?: () => number } = {}
): MockDeviceFacade {
  const now = options.now ?? Date.now;
  const stamp = () => new Date(now()).toISOString();
  const accountActivity = createMockAccountActivity(now);
  const settings = new Map<string, SettingsEntry>();
  const profiles = new Map<string, Row>();
  let profileCounter = 0;

  const keyOf = (user: unknown, device: unknown) => `${String(user)}\u0000${String(device)}`;

  const write = (user: string, device: string, data: unknown, label: unknown): Row => {
    const entry = settings.get(keyOf(user, device));
    const row: Row = {
      ha_user_id: user,
      device_id: device,
      data,
      revision: Number(entry?.current.revision ?? 0) + 1,
      device_label:
        typeof label === 'string' && label ? label : (entry?.current.device_label ?? null),
      updated_at: stamp(),
    };
    settings.set(keyOf(user, device), { current: row, history: [row, ...(entry?.history ?? [])] });
    return row;
  };

  const handleSettings = (
    method: string,
    rest: string[],
    params: URLSearchParams,
    body: Row
  ): Promise<MockResponse> => {
    const user = params.get('ha_user_id') ?? '';
    const device = params.get('device_id') ?? '';
    const entry = settings.get(keyOf(user, device));
    const [area, sub] = rest;

    if (area === 'current' && method === 'GET') {
      const revision = Number(params.get('revision'));
      const row =
        Number.isFinite(revision) && params.get('revision')
          ? entry?.history.find((candidate) => candidate.revision === revision)
          : entry?.current;
      return reply(row ?? null);
    }
    if (area === 'current' && method === 'PUT') {
      const bodyUser = String(body.ha_user_id ?? '');
      const bodyDevice = String(body.device_id ?? '');
      const existing = settings.get(keyOf(bodyUser, bodyDevice));
      if (existing && Number(body.base_revision) !== Number(existing.current.revision)) {
        return reply({ error: 'Revision conflict', revision: existing.current.revision }, 409);
      }
      const row = write(bodyUser, bodyDevice, body.data, body.device_label);
      return reply({
        ha_user_id: bodyUser,
        device_id: bodyDevice,
        revision: row.revision,
        updated_at: row.updated_at,
      });
    }
    if (area === 'history' && method === 'GET') {
      const limit = Math.min(Math.max(Number(params.get('limit')) || 20, 1), 100);
      return reply(
        (entry?.history ?? []).slice(0, limit).map(({ revision, updated_at, device_label }) => ({
          revision,
          updated_at,
          device_label,
        }))
      );
    }
    if (area === 'history' && method === 'DELETE' && entry) {
      const keep = params.get('keep_latest') !== '0';
      const deleted = keep ? entry.history.length - 1 : entry.history.length;
      entry.history = keep ? entry.history.slice(0, 1) : [];
      return reply({ success: true, deleted: Math.max(deleted, 0) });
    }
    if (area === 'history' && method === 'DELETE') return reply({ success: true, deleted: 0 });
    if (area === 'devices' && !sub && method === 'GET') {
      return reply(
        [...settings.values()]
          .filter(({ current }) => current.ha_user_id === user)
          .map(({ current }) => ({
            device_id: current.device_id,
            device_label: current.device_label,
            revision: current.revision,
            updated_at: current.updated_at,
          }))
      );
    }
    if (area === 'devices' && !sub && method === 'DELETE') {
      const had = settings.delete(keyOf(user, device));
      return reply({ success: true, deleted_current: had ? 1 : 0, deleted_history: had ? 1 : 0 });
    }
    if (area === 'devices' && sub === 'label' && method === 'PUT') {
      const target = settings.get(keyOf(body.ha_user_id, body.device_id));
      if (!target) return reply({ error: 'Device not found' }, 404);
      target.current = { ...target.current, device_label: body.device_label ?? null };
      return reply({ success: true });
    }
    if (area === 'publish' && method === 'POST') {
      const source = settings.get(keyOf(body.ha_user_id, body.source_device_id));
      if (!source) return reply({ error: 'Nothing to publish' }, 404);
      const targets = body.target_device_id
        ? [String(body.target_device_id)]
        : [...settings.values()]
            .filter(
              ({ current }) =>
                current.ha_user_id === body.ha_user_id &&
                current.device_id !== body.source_device_id
            )
            .map(({ current }) => String(current.device_id));
      for (const target of targets) {
        write(String(body.ha_user_id), target, source.current.data, null);
      }
      return reply({ success: true, published: targets.length });
    }
    return reply({ error: 'Not found' }, 404);
  };

  const handleProfiles = (
    method: string,
    id: string | undefined,
    params: URLSearchParams,
    body: Row
  ): Promise<MockResponse> => {
    if (!id && method === 'GET') {
      const user = params.get('ha_user_id');
      return reply(
        [...profiles.values()].filter((profile) => !user || profile.ha_user_id === user).reverse()
      );
    }
    if (!id && method === 'POST') {
      profileCounter += 1;
      const profile: Row = {
        id: `profilo-dimostrativo-${profileCounter}`,
        ha_user_id: String(body.ha_user_id ?? ''),
        name: String(body.name ?? ''),
        device_label: typeof body.device_label === 'string' ? body.device_label : null,
        data: body.data,
        created_at: stamp(),
        updated_at: stamp(),
      };
      profiles.set(String(profile.id), profile);
      return reply(profile, 201);
    }
    const profile = id ? profiles.get(id) : undefined;
    if (!id || !profile) return reply({ error: 'Profile not found' }, 404);
    if (method === 'PUT') {
      const next: Row = { ...profile, updated_at: stamp() };
      for (const key of ['name', 'device_label', 'data'] as const) {
        if (body[key] !== undefined) next[key] = body[key];
      }
      profiles.set(id, next);
      return reply(next);
    }
    if (method === 'DELETE') {
      profiles.delete(id);
      return reply({ success: true });
    }
    return reply({ error: 'Not found' }, 404);
  };

  return {
    handle(request: MockRequest): Promise<MockResponse> {
      const method = (request.method ?? 'GET').toUpperCase();
      const [pathOnly = '', query = ''] = request.path.split('?');
      const [area, ...rest] = pathOnly.split('/').filter(Boolean);
      const params = new URLSearchParams(query);
      let body: Row = {};
      try {
        body = asRecord(request.body ? JSON.parse(request.body) : {});
      } catch {
        // A body that is not JSON is read as empty, like the server's validators would refuse it.
      }
      if (area === 'health') return reply({ status: 'ok', version: __APP_VERSION__ });
      if (area === 'v2') return Promise.resolve(accountActivity(method, rest, params, body));
      if (area === 'settings') return handleSettings(method, rest, params, body);
      if (area === 'profiles') return handleProfiles(method, rest[0], params, body);
      return devices.handle(request);
    },
    reset: devices.reset,
  };
}
