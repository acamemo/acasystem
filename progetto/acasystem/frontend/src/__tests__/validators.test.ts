import { describe, expect, it, vi } from 'vitest';
import {
  asStringList,
  errorMessage,
  hasOwnKey,
  isObject,
  isRecord,
  readKey,
  toDate,
} from '@/validators/guards';
import {
  isGridLayout,
  isPagesConfig,
  normalizeGridColumns,
  sanitizeCardSettingsMap,
  sanitizeHeaderSettings,
  sanitizePageSettingsMap,
  sanitizePagesConfig,
  sanitizeSectionSpacing,
  sanitizeStatusPills,
  sanitizeStringMap,
} from '@/validators/dashboardConfig';
import { isValidSnapshot, unwrapImportedSnapshot } from '@/validators/snapshot';
import {
  hasTokenPayload,
  isAuthData,
  isSessionTokensFor,
  isStoredOAuthTokens,
  toHawsAuthData,
  toSessionTokens,
} from '@/validators/oauthTokens';
import {
  parseAreaList,
  parseCalendarEvents,
  parseEntityRegistry,
  parseHistoryEntries,
  parseStatistics,
} from '@/validators/haPayloads';
import { isHassEntity, sanitizeEntityMap, toHaConfig, toHaUser } from '@/validators/haEntities';
import {
  isCurrentSettingsRecord,
  isProfileRecord,
  parseProfileList,
} from '@/validators/backendPayloads';
import { applySnapshot } from '@/api/snapshot';

const hassEntity = (entityId: string, state = 'on') => ({
  entity_id: entityId,
  state,
  attributes: { friendly_name: entityId },
  last_changed: '2026-10-06T10:00:00Z',
  last_updated: '2026-10-06T10:00:00Z',
  context: { id: 'ctx', user_id: null, parent_id: null },
});

describe('guards', () => {
  it('distinguishes objects, records and arrays', () => {
    expect(isObject([])).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord({})).toBe(true);
    expect(isObject(null)).toBe(false);
  });

  it('reads keys safely and checks own keys only', () => {
    expect(readKey({ a: 1 }, 'a')).toBe(1);
    expect(readKey('text', 'length')).toBeUndefined();
    expect(readKey(null, 'a')).toBeUndefined();
    expect(hasOwnKey({ a: 1 }, 'a')).toBe(true);
    expect(hasOwnKey({ a: 1 }, 'toString')).toBe(false);
  });

  it('keeps only string list items and extracts error messages', () => {
    expect(asStringList(['a', 1, 'b', null])).toEqual(['a', 'b']);
    expect(asStringList('a')).toEqual([]);
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage(5)).toBeUndefined();
  });

  it('mirrors the Date constructor conversions', () => {
    expect(toDate(0).getTime()).toBe(0);
    expect(toDate('2026-10-06T00:00:00Z').toISOString()).toBe('2026-10-06T00:00:00.000Z');
    expect(toDate(null).getTime()).toBe(0);
    expect(Number.isNaN(toDate(undefined).getTime())).toBe(true);
    expect(Number.isNaN(toDate({}).getTime())).toBe(true);
  });
});

describe('dashboard configuration validators', () => {
  it('accepts a complete pages configuration unchanged', () => {
    const config = { header: ['person.me'], pages: ['home'], home: ['light.kitchen'] };
    expect(isPagesConfig(config)).toBe(true);
    expect(sanitizePagesConfig(config)).toBe(config);
  });

  it('completes header and pages and drops lists that are not card ids', () => {
    expect(sanitizePagesConfig({ home: ['a', 3], kitchen: [], legacy: { x: 1 } })).toEqual({
      home: ['a'],
      kitchen: [],
      pages: ['home', 'kitchen'],
      header: [],
    });
    expect(sanitizePagesConfig({})).toEqual({ pages: ['home'], header: [] });
    expect(sanitizePagesConfig('home')).toBeNull();
  });

  it('keeps only object card settings', () => {
    expect(
      sanitizeCardSettingsMap({ 'home::light.a': { size: 'small' }, broken: null, text: 'x' })
    ).toEqual({ 'home::light.a': { size: 'small' } });
    expect(sanitizeCardSettingsMap(42)).toBeNull();
  });

  it('removes only the page settings fields with an unexpected type', () => {
    expect(
      sanitizePageSettingsMap({
        kitchen: { label: 'Cucina', icon: null, hidden: 'yes', gridColumns: 3, custom: 1 },
        broken: 'x',
      })
    ).toEqual({ kitchen: { label: 'Cucina', icon: null, gridColumns: 3, custom: 1 } });
  });

  it('cleans header settings and section spacing', () => {
    expect(
      sanitizeHeaderSettings({ showTitle: true, showClock: 'no', mobileAlignment: 'up' })
    ).toEqual({ showTitle: true });
    expect(sanitizeHeaderSettings(null)).toBeNull();
    expect(sanitizeSectionSpacing({ headerToStatus: 4, statusToNav: 'x' })).toEqual({
      headerToStatus: 4,
      statusToNav: 24,
      navToGrid: 24,
    });
  });

  it('keeps identified status pills and string maps', () => {
    expect(sanitizeStatusPills([{ id: 'p1', type: 'sensor' }, { type: 'sensor' }, null])).toEqual([
      { id: 'p1', type: 'sensor' },
    ]);
    expect(sanitizeStringMap({ a: 'A', b: 2 })).toEqual({ a: 'A' });
  });

  it('normalizes grid columns and recognises grid layouts', () => {
    expect(normalizeGridColumns('3')).toBe(3);
    expect(normalizeGridColumns(9)).toBe(5);
    expect(normalizeGridColumns('x')).toBe(4);
    expect(isGridLayout({ a: { row: 1, col: 1, span: 2, colSpan: 1 } })).toBe(true);
    expect(isGridLayout({ a: { row: 0, col: 1, span: 2, colSpan: 1 } })).toBe(false);
  });
});

describe('snapshot validators', () => {
  it('checks the snapshot structure', () => {
    expect(isValidSnapshot({ version: 1, layout: {}, appearance: {} })).toBe(true);
    expect(isValidSnapshot({ version: 0, layout: {}, appearance: {} })).toBe(false);
    expect(isValidSnapshot({ version: 1, layout: null, appearance: {} })).toBe(false);
  });

  it('unwraps exported dashboards and direct snapshots', () => {
    const data = { version: 1, layout: {}, appearance: {} };
    expect(unwrapImportedSnapshot({ format: 'tunet-dashboard-export', data })).toBe(data);
    expect(unwrapImportedSnapshot(data)).toBe(data);
    expect(unwrapImportedSnapshot('nope')).toBeNull();
  });

  it('applies only validated sections to the context setters', () => {
    const persistConfig = vi.fn();
    const updateHeaderSettings = vi.fn();
    const setUnitsMode = vi.fn();
    applySnapshot(
      {
        version: 1,
        layout: { pagesConfig: { home: ['a'] }, headerSettings: 'broken' },
        appearance: { unitsMode: 'kelvin' },
      },
      { persistConfig, updateHeaderSettings, setUnitsMode }
    );
    expect(persistConfig).toHaveBeenCalledWith({ home: ['a'], pages: ['home'], header: [] });
    expect(updateHeaderSettings).not.toHaveBeenCalled();
    expect(setUnitsMode).not.toHaveBeenCalled();
    expect(localStorage.getItem('tunet_units_mode')).toBe('kelvin');
  });
});

describe('OAuth token validators', () => {
  const complete = {
    hassUrl: 'https://ha.example',
    clientId: null,
    expires: 1,
    refresh_token: 'r',
    access_token: 'a',
    expires_in: 1800,
  };

  it('accepts partial stored tokens with valid field types', () => {
    expect(isStoredOAuthTokens({ access_token: 'a' })).toBe(true);
    expect(isStoredOAuthTokens({ access_token: 5 })).toBe(false);
    expect(hasTokenPayload({ refresh_token: 'r' })).toBe(true);
    expect(hasTokenPayload({})).toBe(false);
  });

  it('passes only complete AuthData to HAWS', () => {
    expect(isAuthData(complete)).toBe(true);
    expect(toHawsAuthData(complete)).toBe(complete);
    expect(toHawsAuthData({ access_token: 'a' })).toBeUndefined();
  });

  it('accepts a session only for the hassUrl of the Acasystem proxy', () => {
    const proxy = 'http://acasystem.test:3002/ha';
    expect(isSessionTokensFor({ ...complete, hassUrl: proxy }, proxy)).toBe(true);
    expect(isSessionTokensFor(complete, proxy)).toBe(false);
    expect(isSessionTokensFor({ ...complete, hassUrl: proxy, refresh_token: '' }, proxy)).toBe(
      false
    );
    expect(isSessionTokensFor({ access_token: 'a', hassUrl: proxy }, proxy)).toBe(false);
  });

  it('turns the /auth/token answer into the saved AuthData', () => {
    const context = {
      hassUrl: 'http://acasystem.test:3002/ha',
      clientId: 'http://acasystem.test:3002/',
      now: 1_000,
    };
    expect(
      toSessionTokens(
        { access_token: 'a', refresh_token: 'r', expires_in: 1800, token_type: 'Bearer' },
        context
      )
    ).toEqual({
      hassUrl: context.hassUrl,
      clientId: context.clientId,
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 1800,
      expires: 1_801_000,
    });
    expect(toSessionTokens({ access_token: 'a', expires_in: 1800 }, context)).toBeNull();
    expect(
      toSessionTokens({ access_token: 'a', refresh_token: 'r', expires_in: '1800' }, context)
    ).toBeNull();
    expect(
      toSessionTokens({ access_token: 'a', refresh_token: 'r', expires_in: 0 }, context)
    ).toBeNull();
    expect(toSessionTokens(null, context)).toBeNull();
  });
});

describe('Home Assistant payload validators', () => {
  it('filters history entries and statistics with unexpected field types', () => {
    expect(parseHistoryEntries([{ state: '21' }, { state: 21 }, null, { s: '1', lu: 1 }])).toEqual([
      { state: '21' },
      { s: '1', lu: 1 },
    ]);
    expect(parseStatistics([{ start: 1, mean: 2 }, { mean: '2' }])).toEqual([
      { start: 1, mean: 2 },
    ]);
    expect(parseHistoryEntries('x')).toEqual([]);
  });

  it('keeps registry entries with their identifiers', () => {
    expect(parseAreaList([{ area_id: 'kitchen', name: 'Cucina' }, { name: 'x' }])).toEqual([
      { area_id: 'kitchen', name: 'Cucina' },
    ]);
    expect(parseEntityRegistry([{ entity_id: 'light.a' }, { id: 'x' }])).toEqual([
      { entity_id: 'light.a' },
    ]);
    expect(parseCalendarEvents([{ summary: 'Riunione', start: '2026-10-06' }, 'x'])).toEqual([
      { summary: 'Riunione', start: '2026-10-06' },
    ]);
  });

  it('validates entities, users and the HA configuration', () => {
    expect(isHassEntity(hassEntity('light.a'))).toBe(true);
    expect(isHassEntity({ entity_id: 'light.a', state: 'on' })).toBe(false);
    expect(
      sanitizeEntityMap({ 'light.a': hassEntity('light.a'), broken: { state: 'on' } })
    ).toEqual({ 'light.a': hassEntity('light.a') });
    expect(toHaUser({ id: 'u1', name: 'Mario', is_admin: true, extra: 1 })).toEqual({
      id: 'u1',
      name: 'Mario',
      is_owner: undefined,
      is_admin: true,
    });
    expect(
      toHaConfig({ currency: 'EUR', unit_system: { temperature: '°C', length: 3 }, time_zone: 5 })
    ).toEqual({ currency: 'EUR', unit_system: { temperature: '°C' } });
    expect(toHaConfig(null)).toBeNull();
  });
});

describe('backend payload validators', () => {
  it('checks profiles and current settings rows', () => {
    expect(isProfileRecord({ id: 'p1', name: 'Casa', device_label: null })).toBe(true);
    expect(isProfileRecord({ name: 'Casa' })).toBe(false);
    expect(parseProfileList([{ id: 'p1' }, { id: 2 }])).toEqual([{ id: 'p1' }]);
    expect(isCurrentSettingsRecord({ revision: 7 })).toBe(true);
    expect(isCurrentSettingsRecord({ revision: '7' })).toBe(false);
  });
});
