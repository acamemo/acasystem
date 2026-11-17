import { AVATAR_MAX_BYTES, COVER_MAX_BYTES, type AccountImageKind } from '../../../../contracts/account';

export type AppearanceImages = Partial<Record<AccountImageKind, string>>;
const images = new Map<string, AppearanceImages>();

/** Cropped images are deliberately RAM-only; this module never writes browser storage. */
export function validateAppearanceImages(value: AppearanceImages): void {
  for (const kind of ['avatar', 'cover'] as const) {
    const data = value[kind];
    if (!data) continue;
    const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
    const size = match ? match[1]!.length * 3 / 4 - (match[1]!.endsWith('==') ? 2 : match[1]!.endsWith('=') ? 1 : 0) : Infinity;
    if (size > (kind === 'avatar' ? AVATAR_MAX_BYTES : COVER_MAX_BYTES)) throw new Error('Conferma un ritaglio entro il limite dell’immagine.');
  }
}
export function rememberAppearanceImages(id: string, value: AppearanceImages): void {
  validateAppearanceImages(value);
  for (const previous of images.keys()) if (previous !== id) images.delete(previous);
  images.set(id, { ...value });
}
export const readAppearanceImages = (id: string): AppearanceImages => ({ ...images.get(id) });
export const discardAppearanceImages = (id: string): void => { images.delete(id); };

export const accountInitialInk = (color: string): string => {
  const [red, green, blue] = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.179 ? '#000000' : '#ffffff';
};
