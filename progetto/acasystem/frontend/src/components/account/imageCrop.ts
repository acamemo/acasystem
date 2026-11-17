import { ACCOUNT_SOURCE_MAX_BYTES, AVATAR_MAX_BYTES, COVER_MAX_BYTES, type AccountImageKind } from '../../../../contracts/account';

export interface CropPosition { zoom: number; x: number; y: number; turns: number }
export const INITIAL_CROP: CropPosition = { zoom: 1, x: 0, y: 0, turns: 0 };
export const cropSize = (kind: AccountImageKind) => kind === 'avatar' ? { width: 512, height: 512 } : { width: 1536, height: 768 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
export function cropGeometry(width: number, height: number, kind: AccountImageKind, position: CropPosition) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('L’immagine non ha dimensioni valide.');
  const target = cropSize(kind);
  const turns = ((Math.round(position.turns) % 4) + 4) % 4;
  const rotatedWidth = turns % 2 ? height : width;
  const rotatedHeight = turns % 2 ? width : height;
  const scale = Math.max(target.width / rotatedWidth, target.height / rotatedHeight) * clamp(position.zoom, 1, 4);
  const maxX = Math.max(0, (rotatedWidth * scale - target.width) / 2);
  const maxY = Math.max(0, (rotatedHeight * scale - target.height) / 2);
  return { ...target, scale, maxX, maxY, x: clamp(position.x, -1, 1) * maxX,
    y: clamp(position.y, -1, 1) * maxY, radians: turns * Math.PI / 2 };
}
export function rasterMime(header: Uint8Array): string | null {
  if (header[0] === 255 && header[1] === 216 && header[2] === 255) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte)) return 'image/png';
  if (String.fromCharCode(...header.slice(0, 4)) === 'RIFF' && String.fromCharCode(...header.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}
export async function validateCropFile(file: File): Promise<void> {
  if (!file.size || file.size > ACCOUNT_SOURCE_MAX_BYTES) throw new Error('Scegli una foto di massimo 10 MiB.');
  const prefix = file.slice(0, 12);
  const bytes = typeof prefix.arrayBuffer === 'function' ? await prefix.arrayBuffer() : await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error('Foto non leggibile.'));
    reader.onerror = () => reject(new Error('Foto non leggibile.')); reader.readAsArrayBuffer(prefix);
  });
  const mime = rasterMime(new Uint8Array(bytes));
  if (!mime || (file.type && file.type !== mime)) throw new Error('Usa una foto JPEG, PNG o WebP. SVG e altri formati non sono supportati.');
}
export async function loadCropImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  await validateCropFile(file);
  let image: ImageBitmap | HTMLImageElement;
  if (typeof createImageBitmap === 'function') image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  else {
    const url = URL.createObjectURL(file);
    try {
      image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const value = new Image(); value.onload = () => resolve(value); value.onerror = () => reject(new Error('Foto non leggibile.')); value.src = url;
      });
    } finally { URL.revokeObjectURL(url); }
  }
  if (!image.width || !image.height || image.width * image.height > 64_000_000) {
    if ('close' in image) image.close();
    throw new Error('La foto è troppo grande da elaborare. Scegline una più piccola.');
  }
  return image;
}
export function drawCrop(canvas: HTMLCanvasElement, image: ImageBitmap | HTMLImageElement, kind: AccountImageKind, position: CropPosition): void {
  const geometry = cropGeometry(image.width, image.height, kind, position);
  canvas.width = geometry.width; canvas.height = geometry.height;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Il browser non consente di elaborare la foto.');
  context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.save(); context.translate(canvas.width / 2 + geometry.x, canvas.height / 2 + geometry.y); context.rotate(geometry.radians);
  context.drawImage(image, -image.width * geometry.scale / 2, -image.height * geometry.scale / 2, image.width * geometry.scale, image.height * geometry.scale);
  context.restore();
}
export async function exportCrop(image: ImageBitmap | HTMLImageElement, kind: AccountImageKind, position: CropPosition): Promise<Blob> {
  const canvas = document.createElement('canvas'); drawCrop(canvas, image, kind, position);
  const max = kind === 'avatar' ? AVATAR_MAX_BYTES : COVER_MAX_BYTES;
  for (const quality of [0.92, 0.84, 0.76, 0.64, 0.5, 0.35]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= max) return blob;
  }
  throw new Error('Il ritaglio supera lo spazio disponibile. Prova un’altra foto.');
}
export const cropDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Foto non leggibile.'));
  reader.onerror = () => reject(new Error('Foto non leggibile.')); reader.readAsDataURL(blob);
});
