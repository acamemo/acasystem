/**
 * Verifica avversaria: invariante «ogni widget di una famiglia nel tablet compare nella stessa
 * famiglia anche nelle altre classi» su layout casuali nuovi (nessun dato della build precedente),
 * con alcuni widget presenti su più pagine, come nelle configurazioni legacy.
 */
import { describe, expect, it } from 'vitest';
import type { DeviceClass, LauncherLayout, LauncherPage, WidgetSizes } from '@/@types/launcher';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { packItems } from '@/utils/launcher/grid';
import { ensureDeviceClass, pageClass, type LayoutContext } from '@/utils/launcher/layout';

const SIZES: Record<string, WidgetSizes> = {
  s: { min: { w: 1, h: 1 }, max: { w: 2, h: 2 }, default: { w: 1, h: 1 } },
  m: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 1 } },
  l: { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 2 } },
};
const sizeOf = (id: string) => SIZES[id[0]] ?? SIZES.l;
const ctx = (deviceClass: DeviceClass, viewportWidth?: number): LayoutContext => ({
  deviceClass,
  grids: DEFAULT_GRIDS,
  sizesOf: (id) => sizeOf(id),
  viewportWidth,
});

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

function randomLayout(seed: number): LauncherLayout {
  const r = rng(seed);
  const pool = Array.from({ length: 30 }, (_, i) => `${'sml'[i % 3]}w${i}`);
  const pages: LauncherPage[] = [];
  const count = 2 + Math.floor(r() * 3);
  for (let p = 0; p < count; p++) {
    const n = 3 + Math.floor(r() * 10);
    const ids = new Set<string>();
    while (ids.size < n) ids.add(pool[Math.floor(r() * pool.length)]);
    const items = [...ids].map((id) => ({ id, size: sizeOf(id).default, min: sizeOf(id).min }));
    const packed = packItems(items, DEFAULT_GRIDS.tablet);
    pages.push({
      id: p === 0 ? 'home' : `p${p}`,
      label: p === 0 ? 'Casa' : `Pagina ${p}`,
      kind: 'widgets',
      placements: { tablet: packed.placements },
    });
  }
  return { version: 1, cover: { enabled: false }, pages };
}

const family = (layout: LauncherLayout, root: string) =>
  layout.pages.filter((page) => (page.continuationOf ?? page.id) === root);

/** Widgets of the tablet missing from their family on that screen, and widgets on two of its pages. */
function lost(layout: LauncherLayout, deviceClass: DeviceClass, viewportWidth?: number) {
  const missing: string[] = [];
  for (const root of layout.pages.filter((page) => !page.continuationOf)) {
    const members = family(layout, root.id);
    // The key the family shows on that screen (phoneLandscape@8x2 on a landscape phone).
    const key = pageClass(layout, root, ctx(deviceClass, viewportWidth));
    const inTablet = new Set(members.flatMap((page) => Object.keys(page.placements.tablet ?? {})));
    const shown = members.flatMap((page) => Object.keys(page.placements[key] ?? {}));
    const inClass = new Set(shown);
    for (const id of inTablet) if (!inClass.has(id)) missing.push(`${root.id}:${id}`);
    for (const id of shown.filter((item, index) => shown.indexOf(item) !== index)) {
      missing.push(`${root.id}:${id} due volte`);
    }
  }
  return missing;
}

describe('avversario: invariante di appartenenza tra classi', () => {
  it('nessun widget perso ruotando su telefono e telefono orizzontale (200 layout casuali)', () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 200; seed++) {
      let layout = ensureDeviceClass(randomLayout(seed), ctx('tablet'));
      for (const deviceClass of ['phoneLandscape', 'phone', 'tabletPortrait'] as DeviceClass[]) {
        layout = ensureDeviceClass(layout, ctx(deviceClass));
        const missing = lost(layout, deviceClass);
        if (missing.length) failures.push(`seme ${seed} ${deviceClass}: ${missing.join(', ')}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('nessun widget perso né doppio dal 6×2 storico all’8×2 del Lenovo (200 layout casuali)', () => {
    // The landscape phone arranged first as by the earlier build, on 6×2 with its continuations
    // (a narrow landscape screen still shows it); then the Lenovo seeds its 8×2 from it (E11).
    const failures: string[] = [];
    for (let seed = 1; seed <= 200; seed++) {
      let layout = ensureDeviceClass(randomLayout(seed), ctx('tablet'));
      layout = ensureDeviceClass(layout, ctx('phoneLandscape', 640));
      const before = layout.pages.length;
      const narrow = lost(layout, 'phoneLandscape', 640);
      if (narrow.length) failures.push(`seme ${seed} 6×2: ${narrow.join(', ')}`);
      layout = ensureDeviceClass(layout, ctx('phoneLandscape', 1024));
      const wide = lost(layout, 'phoneLandscape', 1024);
      if (wide.length) failures.push(`seme ${seed} 8×2: ${wide.join(', ')}`);
      if (layout.pages.length !== before) failures.push(`seme ${seed}: pagine nuove`);
    }
    expect(failures).toEqual([]);
  });
});
