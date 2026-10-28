/**
 * Televisions that HA knows only through Google Cast, and the way to the native integration of
 * their brand. HA OS adds Google Cast by itself for an LG or Sony TV that answers on the network:
 * that media player has no remote and its «turn on» starts the Home Assistant Cast app on the TV.
 * Pure helpers shared by «Dispositivi trovati», the automatic widget and the TV widget.
 */

export interface NativeTvBrand {
  /** Key of the brand in `TvInReteDto.brandKey`. */
  key: string;
  label: string;
  /** Native integration of Home Assistant for the brand. */
  handler: string;
}

const NATIVE_TV_BRANDS: readonly (NativeTvBrand & { test: RegExp })[] = [
  { key: 'lg', label: 'LG', handler: 'webostv', test: /\blg\b|webos/i },
  { key: 'samsung', label: 'Samsung', handler: 'samsungtv', test: /samsung/i },
  { key: 'sony', label: 'Sony', handler: 'braviatv', test: /\bsony\b|bravia/i },
  { key: 'philips', label: 'Philips', handler: 'philips_js', test: /philips/i },
];

/** Integrations that control a TV natively (power, remote); Google Cast is not one of them. */
export const NATIVE_TV_HANDLERS: readonly string[] = [
  'webostv',
  'samsungtv',
  'braviatv',
  'philips_js',
  'androidtv_remote',
  'androidtv',
  'panasonic_viera',
  'apple_tv',
  'roku',
];

const clean = (value: unknown): string => (typeof value === 'string' ? value : '');

/** The brand with a native integration, from the maker of the device or else from its name. */
export function nativeTvBrand(manufacturer: unknown, name: unknown): NativeTvBrand | null {
  for (const source of [clean(manufacturer), clean(name)]) {
    if (!source) continue;
    const found = NATIVE_TV_BRANDS.find((brand) => brand.test.test(source));
    if (found) return { key: found.key, label: found.label, handler: found.handler };
  }
  return null;
}

/**
 * The model token of a TV name or model: the last word with both letters and digits, lower case
 * (`[LG] webOS TV UA751C0LA` gives `ua751c0la`; «webOS» alone has no digits). Null when there is none.
 */
export function tvModelToken(...sources: readonly unknown[]): string | null {
  for (const source of sources) {
    const words = clean(source)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4 && /[a-z]/.test(word) && /\d/.test(word));
    const last = words[words.length - 1];
    if (last) return last;
  }
  return null;
}

/** Same TV: both have a model token and it is the same. The registry model comes first. */
export function sameTvModel(
  a: { name?: unknown; model?: unknown },
  b: { name?: unknown; model?: unknown }
): boolean {
  const left = tvModelToken(a.model, a.name);
  const right = tvModelToken(b.model, b.name);
  return left !== null && left === right;
}

/**
 * Names that two or more TVs share once the model is taken out («[LG] webOS TV …»): they look
 * alike on a tile, so the model is always shown for them.
 */
export function alikeTvIds(
  tvs: readonly { id: string; name: string; model: string | null }[]
): ReadonlySet<string> {
  const keyOf = (tv: { name: string; model: string | null }) => {
    const model = tv.model?.toLowerCase();
    const name = tv.name.toLowerCase();
    return (model ? name.split(model).join('') : name).replace(/\s+/g, ' ').trim();
  };
  const counts = new Map<string, number>();
  tvs.forEach((tv) => counts.set(keyOf(tv), (counts.get(keyOf(tv)) ?? 0) + 1));
  return new Set(tvs.filter((tv) => (counts.get(keyOf(tv)) ?? 0) > 1).map((tv) => tv.id));
}

interface EntityLike {
  state?: string;
  attributes?: Record<string, unknown> | null;
}

const attr = (entity: EntityLike | undefined, key: string): unknown => entity?.attributes?.[key];

/**
 * The media player of a branded TV that is a Google Cast one: its integration is `cast` and its
 * brand has a native integration. Null for any other entity.
 */
export function castOnlyBrand(entity: EntityLike | undefined): NativeTvBrand | null {
  if (!entity || attr(entity, 'platform') !== 'cast') return null;
  const deviceClass = attr(entity, 'device_class');
  if (deviceClass === 'speaker' || deviceClass === 'receiver') return null;
  return nativeTvBrand(
    attr(entity, 'manufacturer') ?? attr(entity, 'device_manufacturer'),
    attr(entity, 'friendly_name') ?? attr(entity, 'device_name')
  );
}

/**
 * The native media player of the same TV as a Cast one: same brand integration, same model token
 * (the registry model when the entity carries it, else the name). Null when there is none or the
 * model cannot be told, never a guess.
 */
export function nativeCounterpart(
  castId: string,
  entities: Readonly<Record<string, EntityLike>>
): string | null {
  const cast = entities[castId];
  const brand = castOnlyBrand(cast);
  if (!brand) return null;
  const subject = {
    name: attr(cast, 'friendly_name') ?? attr(cast, 'device_name'),
    model: attr(cast, 'model') ?? attr(cast, 'device_model'),
  };
  const matches = Object.keys(entities).filter((id) => {
    if (id === castId || !id.startsWith('media_player.')) return false;
    const other = entities[id];
    if (attr(other, 'platform') !== brand.handler) return false;
    return sameTvModel(subject, {
      name: attr(other, 'friendly_name') ?? attr(other, 'device_name'),
      model: attr(other, 'model') ?? attr(other, 'device_model'),
    });
  });
  return matches.length === 1 ? (matches[0] ?? null) : null;
}
