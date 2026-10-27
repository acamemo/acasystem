import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import {
  adaptiveFixtureEntities,
  adaptiveFixtureSettings,
  adaptiveFixtureServices,
} from '../src/utils/fixtures/adaptiveData.ts';

// No proxy, outbound HTTP client, real credentials or HA address exists in this server.
// The ONLY served application is the unchanged production dist. CSP adds a browser barrier.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const token = 'aca-isolated-fixture';
const entities = structuredClone(adaptiveFixtureEntities);
const commands = [];
const reads = [];
const clients = new Map();
const deviceSettings = new Map();
let failure = null;
let offline = false;
let items = [
  {
    uid: 'fixture-1',
    summary: 'Controllare la lista isolata',
    status: 'needs_action',
    description: 'Dato dimostrativo del banco isolato',
  },
];
const samples = Object.keys(adaptiveFixtureSettings);
const nativeId = (type) =>
  ({
    light: 'light.fixture',
    fan: 'fan.fixture',
    vacuum: 'vacuum.fixture',
    mower: 'lawn_mower.fixture',
    media: 'media_group_fixture',
    sonos: 'sonos_group_fixture',
    spacer: 'spacer_card_fixture',
  })[type] ?? `${type === 'sensor' ? 'entity' : type}_card_fixture`;
function seed(size = 4) {
  const width = Math.max(2, size);
  const cardSettings = {};
  const pagesConfig = { pages: [], header: [] };
  const pages = samples.map((type, index) => {
    const pageId = `fixture_${type}`;
    const id = nativeId(type);
    const source = adaptiveFixtureSettings[type];
    pagesConfig.pages.push(pageId);
    pagesConfig[pageId] = [id];
    cardSettings[`${pageId}::${id}`] = {
      ...source.settings,
      categoryWidgetType: type,
      ...(type === 'sensor' ? { type: 'sensor' } : {}),
    };
    return {
      id: pageId,
      label: `${index + 1}. ${type}`,
      kind: 'widgets',
      placements: {
        phone: { [id]: { x: 0, y: 0, w: width, h: size } },
        tablet: { [id]: { x: 0, y: 0, w: width, h: size } },
        tabletPortrait: { [id]: { x: 0, y: 0, w: width, h: size } },
      },
    };
  });
  return {
    tunet_launcher_layout: {
      version: 1,
      categoryDefaultsVersion: 1,
      cover: { enabled: false },
      homePageId: pages[0].id,
      pages,
    },
    tunet_pages_config: pagesConfig,
    tunet_card_settings: cardSettings,
    tunet_page_settings: Object.fromEntries(pages.map((p) => [p.id, { label: p.label }])),
    tunet_header_title: 'Banco isolato — 20 tipi',
    tunet_status_pills_config: [],
  };
}
const json = (res, value, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
};
async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 2_000_000) throw new Error('Body too large');
  }
  return raw ? JSON.parse(raw) : {};
}
const compressed = (ids) =>
  Object.fromEntries(
    ids.map((id) => [
      id,
      { s: entities[id].state, a: entities[id].attributes, lc: Date.now() / 1000, c: 'fixture' },
    ])
  );
function broadcast(ids) {
  for (const [socket, subscriptions] of clients)
    for (const id of subscriptions)
      if (socket.readyState === 1)
        socket.send(JSON.stringify({ id, type: 'event', event: { a: compressed(ids) } }));
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:3003');
    if (url.pathname === '/__fixture/journal')
      return json(res, { commands, reads, outbound: false });
    if (url.pathname === '/__fixture/scenario' && req.method === 'POST') {
      const input = await body(req);
      failure = ['reject', 'unconfirmed', 'read_error'].includes(input.next) ? input.next : null;
      if (input.entityId && entities[input.entityId]) {
        Object.assign(entities[input.entityId], input.patch ?? {});
        broadcast([input.entityId]);
      }
      if (input.disconnect) {
        offline = true;
        for (const socket of clients.keys()) socket.close();
      }
      if (input.reconnect) offline = false;
      return json(res, { ok: true });
    }
    if (url.pathname === '/fixture') {
      offline = false;
      deviceSettings.clear();
      commands.length = 0;
      reads.length = 0;
      for (const key of Object.keys(entities)) delete entities[key];
      Object.assign(entities, structuredClone(adaptiveFixtureEntities));
      items = [
        {
          uid: 'fixture-1',
          summary: 'Controllare la lista isolata',
          status: 'needs_action',
          description: 'Dato dimostrativo del banco isolato',
        },
      ];
      const size = Math.min(4, Math.max(1, Number(url.searchParams.get('size')) || 4));
      const data = JSON.stringify(seed(size)).replaceAll('<', '\\u003c');
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      return res.end(
        `<!doctype html><html lang="it"><title>Banco isolato</title><script>for(const [key,value] of Object.entries(${data}))localStorage.setItem(key,JSON.stringify(value));localStorage.setItem('ha_auth_method','token');localStorage.setItem('ha_token','${token}');location.replace('/');</script></html>`
      );
    }
    if (url.pathname === '/api/health')
      return json(res, { status: 'ok', version: '0.9.32', isolated: true });
    if (url.pathname === '/api/version') return json(res, { version: '0.9.32' });
    if (url.pathname === '/api/settings/current') {
      if (req.method === 'PUT') {
        const input = await body(req);
        const current = {
          ...input,
          revision: (deviceSettings.get(input.device_id)?.revision ?? 0) + 1,
          updated_at: new Date().toISOString(),
        };
        deviceSettings.set(input.device_id, current);
        return json(res, current);
      }
      return json(res, deviceSettings.get(url.searchParams.get('device_id')) ?? null);
    }
    if (['/api/settings/history', '/api/settings/devices', '/api/profiles'].includes(url.pathname))
      return json(res, []);
    if (url.pathname.includes('/camera_proxy/')) {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
      return res.end(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#263645"/><text x="320" y="180" fill="white" text-anchor="middle" font-size="28">Videocamera isolata</text></svg>'
      );
    }
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ha/'))
      return json(res, { error: 'Endpoint non simulato; nessun inoltro consentito' }, 404);
    const path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (path !== root && !path.startsWith(root + sep))
      return json(res, { error: 'Invalid path' }, 400);
    const file = (await stat(path).catch(() => null))?.isFile()
      ? path
      : resolve(root, 'index.html');
    const mime =
      {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.webmanifest': 'application/manifest+json',
        '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2',
        '.png': 'image/png',
      }[extname(file)] ?? 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-store',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; worker-src 'self' blob:",
    });
    res.end(await readFile(file));
  } catch {
    json(res, { error: 'Fixture request failed' }, 400);
  }
});
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  if (req.url !== '/ha/api/websocket') return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
});
wss.on('connection', (socket) => {
  if (offline) {
    socket.close();
    return;
  }
  socket.send(JSON.stringify({ type: 'auth_required', ha_version: '2026.9.4' }));
  let authenticated = false;
  clients.set(socket, new Set());
  socket.on('close', () => clients.delete(socket));
  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return socket.close();
    }
    if (!authenticated) {
      authenticated = message.type === 'auth' && message.access_token === token;
      return socket.send(
        JSON.stringify(
          authenticated
            ? { type: 'auth_ok', ha_version: '2026.9.4' }
            : { type: 'auth_invalid', message: 'Solo token di fixture' }
        )
      );
    }
    const respond = (result) =>
      socket.send(JSON.stringify({ id: message.id, type: 'result', success: true, result }));
    const reject = (reason) =>
      socket.send(
        JSON.stringify({
          id: message.id,
          type: 'result',
          success: false,
          error: { code: 'fixture_error', message: reason },
        })
      );
    reads.push({ type: message.type, entityIds: message.entity_ids ?? message.entity_id });
    if (
      failure === 'read_error' &&
      ['history/history_during_period', 'todo/item/list', 'media_player/browse_media'].includes(
        message.type
      )
    ) {
      failure = null;
      return reject('Errore di lettura simulato');
    }
    switch (message.type) {
      case 'ping':
        return socket.send(JSON.stringify({ id: message.id, type: 'pong' }));
      case 'supported_features':
        return respond(null);
      case 'get_states':
        return respond(Object.values(entities));
      case 'subscribe_entities':
        clients.get(socket).add(message.id);
        respond(null);
        return socket.send(
          JSON.stringify({
            id: message.id,
            type: 'event',
            event: { a: compressed(Object.keys(entities)) },
          })
        );
      case 'unsubscribe_events':
        clients.get(socket).delete(message.subscription);
        return respond(null);
      case 'subscribe_events':
        return respond(null);
      case 'get_config':
        return respond({
          version: '2026.9.4',
          location_name: 'Banco isolato',
          time_zone: 'Europe/Rome',
          unit_system: { temperature: '°C', length: 'km', mass: 'kg', volume: 'L', pressure: 'Pa' },
          components: ['camera', 'sonos', 'onvif', 'todo'],
          state: 'RUNNING',
          currency: 'EUR',
        });
      case 'auth/current_user':
        return respond({
          id: 'fixture-user',
          name: 'Collaudo isolato',
          is_owner: true,
          is_admin: true,
          credentials: [],
        });
      case 'get_services':
        return respond(adaptiveFixtureServices);
      case 'config/area_registry/list':
        return respond([{ area_id: 'area.fixture', name: 'Stanza isolata' }]);
      case 'config/device_registry/list':
        return respond([]);
      case 'config/entity_registry/list':
        return respond(
          Object.keys(entities).map((id) => ({
            entity_id: id,
            area_id: 'area.fixture',
            platform: id.includes('sonos') ? 'sonos' : 'fixture',
          }))
        );
      case 'todo/item/list':
        return respond({ items });
      case 'media_player/browse_media':
        return respond({
          children: [
            {
              title: 'Brano isolato',
              media_content_id: 'fixture:track',
              media_content_type: 'music',
              can_play: true,
              can_expand: false,
            },
            {
              title: 'Album',
              media_content_id: 'fixture:album',
              media_content_type: 'album',
              can_play: false,
              can_expand: true,
            },
          ],
        });
      case 'history/history_during_period': {
        const start = new Date(message.start_time).getTime(),
          end = new Date(message.end_time).getTime();
        return respond(
          Object.fromEntries(
            message.entity_ids
              .filter((id) => entities[id])
              .map((id) => [
                id,
                Array.from({ length: 12 }, (_, index) => ({
                  state: entities[id].state,
                  attributes: {
                    ...entities[id].attributes,
                    brightness: 80 + index * 8,
                    temperature: 19 + index / 4,
                    percentage: index * 8,
                    volume_level: index / 12,
                    current_position: index * 8,
                    battery_level: 70 + index,
                  },
                  last_changed: new Date(start + ((end - start) * index) / 11).toISOString(),
                })),
              ])
          )
        );
      }
      case 'recorder/statistics_during_period':
        return respond({});
      case 'call_service': {
        const data = message.service_data ?? {};
        const target = data.entity_id ?? message.target?.entity_id;
        const ids = Array.isArray(target) ? target : [target];
        if (
          !adaptiveFixtureServices[message.domain]?.[message.service] ||
          ids.some((id) => !entities[id])
        )
          return reject('Servizio o target non presente nelle fixture');
        if (message.domain === 'todo' && message.service === 'get_items')
          return respond({ response: { [target]: { items } } });
        if (message.domain === 'sonos' && message.service === 'get_queue')
          return respond({
            response: [{ media_title: 'Primo brano' }, { media_title: 'Secondo brano' }],
          });
        commands.push({
          domain: message.domain,
          service: message.service,
          data: { ...data, entity_id: target },
          at: Date.now(),
        });
        const mode = failure;
        failure = null;
        if (mode === 'reject') return reject('Rifiuto simulato');
        if (mode === 'unconfirmed') return respond({ context: { id: 'fixture' } });
        if (message.domain === 'todo') {
          if (message.service === 'add_item')
            items.push({
              uid: 'fixture-' + Date.now(),
              summary: data.item,
              status: 'needs_action',
            });
          if (message.service === 'update_item')
            items = items.map((item) =>
              item.uid === data.item
                ? {
                    ...item,
                    ...(data.rename ? { summary: data.rename } : {}),
                    ...(data.status ? { status: data.status } : {}),
                    ...(data.due_date !== undefined ? { due: data.due_date } : {}),
                    ...(data.due_datetime !== undefined ? { due: data.due_datetime } : {}),
                    ...(data.description !== undefined ? { description: data.description } : {}),
                  }
                : item
            );
          if (message.service === 'remove_item')
            items = items.filter((item) => item.uid !== data.item);
          entities[target].state = String(
            items.filter((item) => item.status === 'needs_action').length
          );
        } else
          for (const id of ids) {
            const entity = entities[id],
              attrs = entity.attributes,
              svc = message.service;
            const states = {
              turn_on: 'on',
              turn_off: 'off',
              lock: 'locked',
              unlock: 'unlocked',
              open: 'open',
              open_cover: 'open',
              close_cover: 'closed',
              media_play: 'playing',
              media_pause: 'paused',
              media_stop: 'idle',
              start: 'cleaning',
              pause: 'paused',
              return_to_base: 'returning',
              start_mowing: 'mowing',
              dock: 'returning',
              alarm_disarm: 'disarmed',
              alarm_arm_home: 'armed_home',
              alarm_arm_away: 'armed_away',
              alarm_arm_night: 'armed_night',
              alarm_arm_vacation: 'armed_vacation',
              alarm_arm_custom_bypass: 'armed_custom_bypass',
            };
            if (states[svc]) entity.state = states[svc];
            const mapping = {
              brightness_pct: 'brightness',
              hs_color: 'hs_color',
              color_temp_kelvin: 'color_temp_kelvin',
              effect: 'effect',
              percentage: 'percentage',
              oscillating: 'oscillating',
              direction: 'direction',
              preset_mode: 'preset_mode',
              temperature: 'temperature',
              humidity: 'humidity',
              target_temp_low: 'target_temp_low',
              target_temp_high: 'target_temp_high',
              fan_mode: 'fan_mode',
              swing_mode: 'swing_mode',
              swing_horizontal_mode: 'swing_horizontal_mode',
              position: 'current_position',
              tilt_position: 'current_tilt_position',
              volume_level: 'volume_level',
              is_volume_muted: 'is_volume_muted',
              source: 'source',
              sound_mode: 'sound_mode',
              repeat: 'repeat',
              shuffle: 'shuffle',
              seek_position: 'media_position',
              fan_speed: 'fan_speed',
              queue_position: 'queue_position',
              media_content_id: 'media_content_id',
            };
            for (const [key, attr] of Object.entries(mapping))
              if (data[key] !== undefined)
                attrs[attr] = key === 'brightness_pct' ? (data[key] / 100) * 255 : data[key];
            if (data.hvac_mode) entity.state = data.hvac_mode;
            if (svc === 'set_value') entity.state = String(data.value);
            if (svc === 'select_option') entity.state = data.option;
            if (svc === 'join') attrs.group_members = [id, ...(data.group_members ?? [])];
            if (svc === 'unjoin') attrs.group_members = [id];
            if (svc === 'enable_motion_detection' || svc === 'disable_motion_detection')
              attrs.motion_detection_enabled = svc === 'enable_motion_detection';
            if (message.domain === 'camera' && ['turn_on', 'turn_off'].includes(svc))
              attrs.is_on = svc === 'turn_on';
            if (message.domain === 'climate' && svc === 'turn_on') entity.state = 'heat';
            if (svc === 'update_alarm') {
              const alarm = Object.values(entities).find(
                (item) => String(item.attributes.alarm_id) === String(data.alarm_id)
              );
              if (alarm) {
                for (const key of ['time', 'volume', 'include_linked_zones'])
                  if (data[key] !== undefined) alarm.attributes[key] = data[key];
                broadcast([alarm.entity_id]);
              }
            }
            entity.last_updated = new Date().toISOString();
          }
        respond({ context: { id: 'fixture' } });
        return setTimeout(() => broadcast(ids), 120);
      }
      default:
        return reject('Messaggio non simulato: ' + message.type);
    }
  });
});
server.listen(3003, '127.0.0.1', () =>
  console.log('Banco isolato: http://127.0.0.1:3003/fixture — dist invariato, nessun proxy HA')
);
