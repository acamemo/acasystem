/**
 * Verifica avversaria: invariante «ogni widget di una famiglia nel tablet compare nella stessa
 * famiglia anche nelle altre classi» su layout casuali nuovi (nessun dato della build precedente),
 * con alcuni widget presenti su più pagine, come nelle configurazioni legacy.
 */
import { describe, expect, it } from 'vitest';
import type { DeviceClass, LauncherLayout, LauncherPage, WidgetSizes } from '@/@types/launcher';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { packItems } from '@/utils/launcher/grid';
import { ensureDeviceClass, type LayoutContext } from '@/utils/launcher/layout';

const SIZES: Record<string, WidgetSizes> = {
  s: { min: { w: 1, h: 1 }, max: { w: 2, h: 2 }, default: { w: 1, h: 1 } },
  m: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 1 } },
  l: { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 2 } },
};
const sizeOf = (id: string) => SIZES[id[0]] ?? SIZES.l;
const ctx = (deviceClass: DeviceClass): LayoutContext => ({
  deviceClass,
  grids: DEFAULT_GRIDS,
  sizesOf: (id) => sizeOf(id),
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

function lost(layout: LauncherLayout, deviceClass: DeviceClass) {
  const missing: string[] = [];
  for (const root of layout.pages.filter((page) => !page.continuationOf)) {
    const members = family(layout, root.id);
    const inTablet = new Set(members.flatMap((page) => Object.keys(page.placements.tablet ?? {})));
    const inClass = new Set(
      members.flatMap((page) => Object.keys(page.placements[deviceClass] ?? {}))
    );
    for (const id of inTablet) if (!inClass.has(id)) missing.push(`${root.id}:${id}`);
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
});
