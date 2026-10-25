/**
 * Verifica avversaria (REP-20261006-002): arrangedElsewhere scambia per «spostamento per classe
 * salvato dalla build precedente» una normale pagina di continuazione CON marcatore di famiglia.
 */
import { describe, expect, it } from 'vitest';
import type { BaseDeviceClass, DeviceClass, LauncherLayout } from '@/@types/launcher';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { packItems } from '@/utils/launcher/grid';
import {
  ensureDeviceClass,
  placeWidgetInLayout,
  type LayoutContext,
} from '@/utils/launcher/layout';

const sizes = { min: { w: 2, h: 2 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } };
const ctxFor = (deviceClass: DeviceClass): LayoutContext => ({
  deviceClass,
  grids: DEFAULT_GRIDS,
  sizesOf: () => sizes,
});
const full = (deviceClass: BaseDeviceClass, prefix: string, count: number) =>
  packItems(
    Array.from({ length: count }, (_, index) => ({
      id: `${prefix}${index}`,
      size: sizes.default,
      min: sizes.min,
    })),
    DEFAULT_GRIDS[deviceClass]
  ).placements;
const familyHas = (layout: LauncherLayout, root: string, deviceClass: DeviceClass, id: string) =>
  layout.pages.some(
    (page) =>
      (page.continuationOf ?? page.id) === root && Boolean(page.placements[deviceClass]?.[id])
  );

describe('avversario: arrangedElsewhere e continuazioni con marcatore', () => {
  it('stesso widget su due pagine: la continuazione (con marcatore) di home non deve bloccare la riparazione di luci', () => {
    // Stato prodotto dalla build corrente: home trabocca sul telefono, light.x va in casa_2.
    const base: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          placements: {
            tablet: { 'light.x': { x: 0, y: 0, w: 2, h: 2 } },
          },
        },
        {
          id: 'luci',
          label: 'Luci',
          kind: 'widgets',
          placements: { tablet: {}, phone: full('phone', 'y', 6) },
        },
      ],
    };
    // home sul telefono: 6 widget 2×2 già presenti nella classe telefono → light.x trabocca.
    base.pages[0].placements.phone = full('phone', 'z', 6);
    base.pages[0].placements.tablet = {
      ...full('tablet', 'z', 6),
      'light.x': { x: 4, y: 2, w: 2, h: 2 },
    };
    const shownOnPhone = ensureDeviceClass(base, ctxFor('phone'));
    // light.x è ora in una continuazione di home, con marcatore di famiglia.
    const cont = shownOnPhone.pages.find((page) => page.placements.phone?.['light.x']);
    expect(cont?.continuationOf).toBe('home');
    expect(cont?.placements.tablet).toEqual({});

    // L'utente aggiunge la stessa luce alla pagina Luci dal tablet; Luci è piena sul telefono.
    const result = placeWidgetInLayout(shownOnPhone, ctxFor('tablet'), 'luci', 'light.x');
    expect(result.placed).toBe(true);
    expect(familyHas(result.layout, 'luci', 'tablet', 'light.x')).toBe(true);
    // CORR-4: dopo la rotazione al telefono la luce deve comparire nella famiglia di Luci.
    const rotated = ensureDeviceClass(result.layout, ctxFor('phone'));
    expect(familyHas(rotated, 'luci', 'phone', 'light.x')).toBe(true);
  });
});
