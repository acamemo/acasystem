import { describe, expect, it } from 'vitest';
import { operationalProfile } from '@/components/widgets/adaptive/operationalProfile';
import {
  adaptiveFixtureEntities,
  adaptiveFixtureServices,
  adaptiveFixtureSettings,
} from '@/utils/fixtures/adaptiveData';
import { haEntityToCapabilities } from '@/utils/haEntityToCapabilities';
import { formatReading, formatReadingWithUnit, unitSuffix } from '@/utils/formatting';

/**
 * REP-20261029-001, step 2: widgets and sheets speak about the house and its devices, not about
 * the plumbing. «Home Assistant» stays only where it is the subject (System › Collegamento and
 * Informazioni, the connection pages), and no `aria-label` is a bare Home Assistant domain.
 */

const sources = import.meta.glob<string>(
  [
    '/src/components/widgets/**/*.{ts,tsx}',
    '/src/templates/**/*.{ts,tsx}',
    '/src/pages/system/sections/*.{ts,tsx}',
    '!/src/pages/system/sections/ConnectionSection.tsx',
    '!/src/pages/system/sections/AboutSection.tsx',
  ],
  { query: '?raw', import: 'default', eager: true }
);

const DOMAINS =
  'switch|number|script|scene|select|button|sensor|binary_sensor|light|fan|cover|climate|lock|media_player|input_boolean|input_number|input_select|input_button|automation|vacuum|camera|alarm_control_panel';
const BARE_DOMAIN_LABEL = new RegExp(
  `aria-label=(?:"(?:${DOMAINS})"|\\{['"\`](?:${DOMAINS})['"\`]\\})`
);

/** Code of a line without a trailing `// comment` (only when the slashes are outside a string). */
function withoutTrailingComment(line: string): string {
  const index = line.search(/\s\/\/\s/);
  if (index < 0) return line;
  const before = line.slice(0, index);
  const quotes = (char: string) => before.split(char).length - 1;
  return quotes("'") % 2 === 0 && quotes('"') % 2 === 0 && quotes('`') % 2 === 0 ? before : line;
}

/** Lines that are code (not comments) and match the pattern. */
function offending(text: string, pattern: RegExp): string[] {
  const found: string[] = [];
  let inBlock = false;
  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (inBlock) {
      if (trimmed.includes('*/')) inBlock = false;
      return;
    }
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlock = true;
      return;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    if (pattern.test(withoutTrailingComment(line))) found.push(`${index + 1}: ${trimmed}`);
  });
  return found;
}

const scan = (pattern: RegExp) =>
  Object.entries(sources).flatMap(([file, text]) =>
    // Tests that live beside the sources, if any, are not user-visible text.
    /\.test\.tsx?$/.test(file) ? [] : offending(text, pattern).map((line) => `${file}:${line}`)
  );

describe('texts of widgets and sheets', () => {
  it('scan the sources', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100);
  });

  it('never name Home Assistant outside the System sections that are about it', () => {
    expect(scan(/Home Assistant/)).toEqual([]);
  });

  it('never use a bare Home Assistant domain as an aria-label', () => {
    expect(scan(BARE_DOMAIN_LABEL)).toEqual([]);
  });

  it('the scan tells a comment from a text', () => {
    const name = /Home Assistant/;
    expect(offending('// da Home Assistant', name)).toEqual([]);
    expect(offending('/**\n * Home Assistant\n */', name)).toEqual([]);
    expect(offending('const a = 1; // Home Assistant', name)).toEqual([]);
    expect(offending("const a = 'Home Assistant';", name)).toHaveLength(1);
    expect(offending("const a = 'http://x'; // ok", name)).toEqual([]);
    expect(offending('<Button aria-label="switch" />', BARE_DOMAIN_LABEL)).toHaveLength(1);
    expect(offending('<Button aria-label={"number"} />', BARE_DOMAIN_LABEL)).toHaveLength(1);
    expect(offending('<Button aria-label={cap.label} />', BARE_DOMAIN_LABEL)).toEqual([]);
    expect(offending('<Button aria-label="Interruttore" />', BARE_DOMAIN_LABEL)).toEqual([]);
  });
});

describe('labels of the adaptive widget', () => {
  it('are never a raw Home Assistant domain, with real or demo data', () => {
    const labels = Object.entries(adaptiveFixtureSettings).flatMap(([type, source]) =>
      operationalProfile({
        type,
        ...source,
        entities: adaptiveFixtureEntities,
        services: adaptiveFixtureServices,
      }).capabilities.map((cap) => cap.label)
    );
    expect(labels.length).toBeGreaterThan(20);
    expect(labels.filter((label) => new RegExp(`^(${DOMAINS})$`).test(label))).toEqual([]);
  });

  it('use the name of the linked device, else a plain Italian word', () => {
    const unnamed = Object.fromEntries(
      Object.entries(adaptiveFixtureEntities).map(([id, entity]) => [
        id,
        { ...entity, attributes: { ...entity.attributes, friendly_name: undefined } },
      ])
    );
    const profile = operationalProfile({
      type: 'sensor',
      ...adaptiveFixtureSettings.sensor!,
      entities: unnamed,
      services: adaptiveFixtureServices,
    });
    const labels = profile.capabilities.map((cap) => cap.label);
    expect(labels).toEqual(expect.arrayContaining(['Interruttore', 'Scena', 'Valore']));
  });
});

describe('Italian numbers', () => {
  it('write the decimal comma and put the unit after a space', () => {
    expect(formatReading(21.5)).toBe('21,5');
    expect(formatReading('21.5')).toBe('21,5');
    expect(formatReading('2.84')).toBe('2,84');
    expect(formatReadingWithUnit('21.5', '°C')).toBe('21,5 °C');
    expect(formatReadingWithUnit(2.84, '€')).toBe('2,84 €');
    expect(formatReadingWithUnit(63, '%')).toBe('63%');
    expect(formatReadingWithUnit(240, '°')).toBe('240°');
    expect(unitSuffix('')).toBe('');
  });

  it('leave times, ids and words as they are', () => {
    expect(formatReading('12:30')).toBe('12:30');
    expect(formatReading('Acceso')).toBe('Acceso');
    expect(formatReading('1234567')).toBe('1234567');
    expect(formatReading(null)).toBe('—');
  });
});

describe('media and TV tiles with nothing playing', () => {
  const tile = (type: string, attributes: Record<string, unknown>) =>
    haEntityToCapabilities(
      { entity_id: `media_player.${type}`, state: 'idle', attributes },
      type
    ).capabilities.find((cap) => cap.kind === 'reading');

  it('say so, or name the source or the app, instead of a generic «Brano» or «Contenuto»', () => {
    expect(tile('sonos', {})).toMatchObject({
      label: 'Riproduzione',
      initial: 'Niente in riproduzione',
    });
    expect(tile('sonos', { source: 'Radio' })).toMatchObject({ initial: 'Radio' });
    expect(tile('androidtv', {})).toMatchObject({
      label: 'Riproduzione',
      initial: 'Niente in riproduzione',
    });
    expect(tile('androidtv', { app_name: 'Netflix' })).toMatchObject({ initial: 'Netflix' });
    expect(tile('sonos', { media_title: 'Aria' })).toMatchObject({
      label: 'Brano',
      initial: 'Aria',
    });
  });
});
