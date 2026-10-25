/**
 * Descriptor of a page (REP-20261009-004, ADR-0012): the data the launcher reads to show a page,
 * from the pager entries. Pure: no React, no Home Assistant.
 */
import { describe, expect, it } from 'vitest';
import type { LauncherLayout, LauncherPage } from '@/@types/launcher';
import { COLUMNS_RANGE, COVER_COLUMNS, DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { describePage, describePages, surfaceOf } from '@/utils/launcher/pageDescriptor';
import { COVER_PAGE_ID } from '@/utils/launcher/layout';
import { basePageId, pagerEntries } from '@/utils/launcher/pager';

const widgets = (id: string, extra: Partial<LauncherPage> = {}): LauncherPage => ({
  id,
  label: id,
  kind: 'widgets',
  placements: { tablet: { [`tile_${id}`]: { x: 0, y: 0, w: 1, h: 1 } } },
  ...extra,
});
const lights: LauncherPage = { id: 'luci', label: 'Luci', kind: 'lights', placements: {} };

const layout = (
  pages: LauncherPage[],
  cover: LauncherLayout['cover'] = { enabled: true }
): LauncherLayout => ({ version: 1, cover, pages });

const describeAll = (value: LauncherLayout, overview = false) => {
  const entries = pagerEntries(value, 'tablet', false, DEFAULT_GRIDS, undefined, overview);
  return describePages(entries, basePageId(value));
};

describe('descrittore della pagina', () => {
  it('la copertina è una pagina di widget con la barra in alto «mai» e le colonne di partenza a tre', () => {
    const [cover] = describeAll(layout([widgets('home')]));
    expect(cover).toMatchObject({
      key: COVER_PAGE_ID,
      kind: 'cover',
      label: 'Copertina',
      familyRootId: COVER_PAGE_ID,
      columns: { minSaved: COVER_COLUMNS },
      hidden: false,
      main: false,
      topBar: 'never',
      addCells: 'edit-only',
      acceptsWidgets: true,
    });
    expect(cover.page?.id).toBe(COVER_PAGE_ID);
  });

  it('la copertina spenta ha il descrittore solo nella vista delle pagine, segnato nascosto', () => {
    const off = layout([widgets('home')], { enabled: false });
    expect(describeAll(off).map((item) => item.key)).toEqual(['home']);
    const [cover, home] = describeAll(off, true);
    expect(cover).toMatchObject({ key: COVER_PAGE_ID, hidden: true, topBar: 'never' });
    expect(home.hidden).toBe(false);
  });

  it('i descrittori delle altre pagine restano gli stessi quando si aggiunge la scheda della copertina (REP-20261012-003)', () => {
    const home = widgets('home');
    const studio = widgets('studio');
    const off = layout([home, studio], { enabled: false });
    const closed = describeAll(off);
    const entries = pagerEntries(off, 'tablet', true, DEFAULT_GRIDS, undefined, true);
    const opened = describePages(entries, basePageId(off), closed);
    expect(opened.map((item) => item.key)).toEqual([COVER_PAGE_ID, 'home', 'studio']);
    expect(opened[1]).toBe(closed[0]);
    expect(opened[2]).toBe(closed[1]);
    // What a descriptor says changed: it is another object.
    const renamed = layout([{ ...home, label: 'Casa' }, studio], {
      enabled: false,
    });
    const next = describePages(
      pagerEntries(renamed, 'tablet', true, DEFAULT_GRIDS, undefined, true),
      basePageId(renamed),
      opened
    );
    expect(next[1]).not.toBe(opened[1]);
    expect(next[2]).toBe(opened[2]);
  });

  it('senza le griglie la copertina non ha la pagina e non accetta widget', () => {
    const value = layout([widgets('home')]);
    const [entry] = pagerEntries(value, 'tablet', false);
    expect(describePage(entry, null)).toMatchObject({
      kind: 'cover',
      page: null,
      acceptsWidgets: false,
    });
  });

  it('una pagina di widget accetta widget, ha la barra in alto e le celle con «+»; Principale è la prima', () => {
    const [, home, other] = describeAll(layout([widgets('home'), widgets('altra')]));
    expect(home).toMatchObject({
      key: 'home',
      kind: 'widgets',
      familyRootId: 'home',
      columns: { minSaved: COLUMNS_RANGE.min },
      main: true,
      topBar: 'auto',
      addCells: 'always',
      acceptsWidgets: true,
    });
    expect(home.page?.id).toBe('home');
    expect(other.main).toBe(false);
  });

  it('una pagina nascosta compare nel descrittore solo in modifica e porta il suo segno', () => {
    const value = layout([widgets('home'), widgets('altra', { hidden: true })]);
    expect(describeAll(value).map((item) => item.key)).toEqual(['cover', 'home']);
    const entries = pagerEntries(value, 'tablet', true, DEFAULT_GRIDS);
    const items = describePages(entries, basePageId(value));
    expect(items.map((item) => [item.key, item.hidden])).toEqual([
      ['cover', false],
      ['home', false],
      ['altra', true],
    ]);
  });

  it('una pagina speciale non accetta widget e ha la superficie «special»', () => {
    const [, , special] = describeAll(layout([widgets('home'), lights]));
    expect(special).toMatchObject({
      key: 'luci',
      kind: 'lights',
      main: false,
      topBar: 'auto',
      acceptsWidgets: false,
    });
    expect(special.page?.id).toBe('luci');
    expect(surfaceOf('lights')).toBe('special');
    expect(surfaceOf('widgets')).toBe('grid');
    expect(surfaceOf('cover')).toBe('grid');
  });

  it('una continuazione rimanda alla prima pagina della sua famiglia', () => {
    const value = layout([
      widgets('home'),
      widgets('home-2', {
        continuationOf: 'home',
        placements: { tablet: { tile_x: { x: 0, y: 0, w: 1, h: 1 } } },
      }),
    ]);
    const items = describeAll(value);
    expect(items.map((item) => [item.key, item.familyRootId])).toEqual([
      ['cover', 'cover'],
      ['home', 'home'],
      ['home-2', 'home'],
    ]);
  });
});
