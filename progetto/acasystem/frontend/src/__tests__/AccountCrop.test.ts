import { afterEach, describe, expect, it, vi } from 'vitest';
import { cropGeometry, cropSize, exportCrop, INITIAL_CROP, rasterMime, validateCropFile } from '@/components/account/imageCrop';
import { AVATAR_MAX_BYTES, ACCOUNT_SOURCE_MAX_BYTES } from '../../../contracts/account';

afterEach(() => vi.restoreAllMocks());
describe('ritaglio delle immagini account', () => {
  it.each(['avatar', 'cover'] as const)('mantiene la dimensione %s e copre sempre tutto il riquadro dopo zoom/rotazione', (kind) => {
    for (const [width, height] of [[4000, 1000], [1000, 4000], [800, 800]]) {
      for (const turns of [0, 1, 2, 3]) for (const zoom of [1, 2, 4]) {
        const geometry = cropGeometry(width!, height!, kind, { zoom, turns, x: 1, y: -1 });
        const rotatedWidth = turns % 2 ? height! : width!;
        const rotatedHeight = turns % 2 ? width! : height!;
        expect(geometry.width).toBe(cropSize(kind).width);
        expect(geometry.height).toBe(cropSize(kind).height);
        expect(rotatedWidth * geometry.scale / 2 - Math.abs(geometry.x)).toBeGreaterThanOrEqual(geometry.width / 2 - 0.001);
        expect(rotatedHeight * geometry.scale / 2 - Math.abs(geometry.y)).toBeGreaterThanOrEqual(geometry.height / 2 - 0.001);
      }
    }
  });
  it('limita lo spostamento senza lasciare bordi e rifiuta dimensioni nulle', () => {
    const geometry = cropGeometry(2000, 1000, 'avatar', { zoom: 0, x: 100, y: -100, turns: -1 });
    expect(Math.abs(geometry.x)).toBeLessThanOrEqual(geometry.maxX);
    expect(Math.abs(geometry.y)).toBeLessThanOrEqual(geometry.maxY);
    expect(() => cropGeometry(0, 800, 'avatar', INITIAL_CROP)).toThrow();
  });
  it('riconosce solo JPEG/PNG/WebP reali, rifiutando SVG e GIF anche con nome foto', () => {
    expect(rasterMime(Uint8Array.from([255, 216, 255]))).toBe('image/jpeg');
    expect(rasterMime(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('image/png');
    expect(rasterMime(new TextEncoder().encode('RIFF0000WEBP'))).toBe('image/webp');
    expect(rasterMime(new TextEncoder().encode('<svg xmlns='))).toBeNull();
    expect(rasterMime(new TextEncoder().encode('GIF89a'))).toBeNull();
  });
  it('rifiuta la sorgente oltre 10 MiB prima della decodifica', async () => {
    const file = { size: ACCOUNT_SOURCE_MAX_BYTES + 1, slice: vi.fn() } as unknown as File;
    await expect(validateCropFile(file)).rejects.toThrow('10 MiB');
    expect(file.slice).not.toHaveBeenCalled();
  });
  it('comprende la quota nel risultato senza cambiare la dimensione avatar', async () => {
    const context = { fillStyle: '', fillRect: vi.fn(), save: vi.fn(), translate: vi.fn(), rotate: vi.fn(), drawImage: vi.fn(), restore: vi.fn() };
    const canvas = { width: 0, height: 0, getContext: () => context,
      toBlob: vi.fn((callback: BlobCallback, _type?: string, quality?: number) => callback(new Blob([new Uint8Array(quality! > 0.8 ? AVATAR_MAX_BYTES + 1 : 1024)], { type: 'image/jpeg' }))),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLCanvasElement);
    const output = await exportCrop({ width: 800, height: 1200 } as ImageBitmap, 'avatar', INITIAL_CROP);
    expect(canvas.width).toBe(512); expect(canvas.height).toBe(512);
    expect(output.size).toBeLessThanOrEqual(AVATAR_MAX_BYTES);
    expect(output.type).toBe('image/jpeg');
    expect(context.drawImage).toHaveBeenCalledOnce();
  });
});
