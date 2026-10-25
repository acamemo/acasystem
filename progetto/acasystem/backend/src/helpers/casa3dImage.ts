import { crc32 } from 'node:zlib';

/**
 * Controllo delle immagini del piano della Casa 3D (ADR-0014, T6). Il client non è affidabile: il
 * server guarda i byte, non l'intestazione `Content-Type` dichiarata.
 *
 * Ammessi PNG, JPEG e WebP, questi ultimi (e i PNG) non animati. Per ciascuno si verifica la firma, la struttura (blocchi
 * PNG con il loro CRC, segmenti JPEG, blocchi RIFF di WebP), le dimensioni (al più 2048 px per lato,
 * come l'editor, che riduce a 2048) e la fine regolare del file: un file troncato è rifiutato.
 * SVG, HTML, GIF e ogni altro formato sono rifiutati perché la firma non è tra le tre.
 *
 * Limite dichiarato: la struttura è controllata, i pixel non sono decodificati (nessuna libreria
 * di immagini tra le dipendenze); la risposta torna con il tipo rilevato, `nosniff` e una
 * Content-Security-Policy che non esegue nulla.
 */

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const MAX_IMAGE_SIDE = 2048;

export type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp';

export type ImageCheck =
  | { ok: true; mime: ImageMime; width: number; height: number }
  | { ok: false; status: 413 | 415 | 422; reason: string };

const refuse = (status: 413 | 415 | 422, reason: string): ImageCheck => ({ ok: false, status, reason });

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const checkSize = (width: number, height: number, mime: ImageMime): ImageCheck => {
  if (width < 1 || height < 1) return refuse(422, 'image has no size');
  if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) {
    return refuse(422, `image is larger than ${MAX_IMAGE_SIDE} px on a side`);
  }
  return { ok: true, mime, width, height };
};

const inspectPng = (bytes: Buffer): ImageCheck => {
  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let idat = false;
  let first = true;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('latin1', offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (length > 0x7fffffff || end > bytes.length) return refuse(422, 'PNG is truncated');
    const expected = bytes.readUInt32BE(end - 4);
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== expected) return refuse(422, 'PNG chunk is damaged');
    if (first) {
      if (type !== 'IHDR' || length !== 13) return refuse(422, 'PNG has no header');
      width = bytes.readUInt32BE(offset + 8);
      height = bytes.readUInt32BE(offset + 12);
      const size = checkSize(width, height, 'image/png');
      if (!size.ok) return size;
      first = false;
    } else if (type === 'acTL' || type === 'fcTL' || type === 'fdAT') {
      return refuse(415, 'animated PNG is not allowed');
    } else if (type === 'IDAT') {
      idat = true;
    }
    offset = end;
    if (type === 'IEND') {
      if (length !== 0) return refuse(422, 'PNG end is damaged');
      if (offset !== bytes.length) return refuse(422, 'PNG has data after its end');
      return idat ? { ok: true, mime: 'image/png', width, height } : refuse(422, 'PNG has no picture data');
    }
  }
  return refuse(422, 'PNG is truncated');
};

/** Segmenti SOF che portano le dimensioni (non DHT C4, JPG C8, DAC CC). */
const isJpegFrame = (marker: number): boolean =>
  marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

const inspectJpeg = (bytes: Buffer): ImageCheck => {
  let offset = 2;
  let width = 0;
  let height = 0;
  let scan = false;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return refuse(422, 'JPEG is damaged');
    while (bytes[offset] === 0xff && offset < bytes.length - 1) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined) break;
    if (marker === 0xd9) {
      if (!scan || width === 0) return refuse(422, 'JPEG has no picture data');
      if (offset !== bytes.length) return refuse(422, 'JPEG has data after its end');
      return checkSize(width, height, 'image/jpeg');
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 2 > bytes.length) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return refuse(422, 'JPEG is truncated');
    if (isJpegFrame(marker)) {
      if (length < 8) return refuse(422, 'JPEG header is damaged');
      height = bytes.readUInt16BE(offset + 3);
      width = bytes.readUInt16BE(offset + 5);
      const size = checkSize(width, height, 'image/jpeg');
      if (!size.ok) return size;
    }
    offset += length;
    if (marker === 0xda) {
      scan = true;
      // entropy-coded data: runs until a marker that is not a stuffed 0xFF00 or a restart
      while (offset + 1 < bytes.length) {
        if (bytes[offset] === 0xff) {
          const next = bytes[offset + 1] ?? 0;
          if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) {
            offset += 2;
            continue;
          }
          if (next === 0xff) {
            offset += 1;
            continue;
          }
          break;
        }
        offset += 1;
      }
    }
  }
  return refuse(422, 'JPEG is truncated');
};

/** Dimensioni scritte nel flusso VP8 o VP8L di un WebP; null se l'intestazione del flusso è danneggiata. */
const webpStreamSize = (
  bytes: Buffer,
  type: string,
  data: number,
  length: number
): { width: number; height: number } | null => {
  if (type === 'VP8 ') {
    if (length < 10 || bytes[data + 3] !== 0x9d || bytes[data + 4] !== 0x01 || bytes[data + 5] !== 0x2a) {
      return null;
    }
    return { width: bytes.readUInt16LE(data + 6) & 0x3fff, height: bytes.readUInt16LE(data + 8) & 0x3fff };
  }
  if (length < 5 || bytes[data] !== 0x2f) return null;
  const bits = bytes.readUInt32LE(data + 1);
  return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
};

const inspectWebp = (bytes: Buffer): ImageCheck => {
  if (bytes.length < 20) return refuse(422, 'WebP is truncated');
  if (bytes.readUInt32LE(4) + 8 !== bytes.length) return refuse(422, 'WebP is truncated or has data after its end');
  let offset = 12;
  let width = 0;
  let height = 0;
  let pictureData = false;
  let first = true;
  let extended = false;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString('latin1', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    const end = data + length + (length % 2);
    if (end > bytes.length) return refuse(422, 'WebP is truncated');
    if (first) {
      if (type === 'VP8X') {
        if (length < 10) return refuse(422, 'WebP header is damaged');
        if (((bytes[data] ?? 0) & 0x02) !== 0) return refuse(415, 'animated WebP is not allowed');
        width = 1 + bytes.readUIntLE(data + 4, 3);
        height = 1 + bytes.readUIntLE(data + 7, 3);
        extended = true;
      } else if (type === 'VP8 ') {
        if (length < 10 || bytes[data + 3] !== 0x9d || bytes[data + 4] !== 0x01 || bytes[data + 5] !== 0x2a) {
          return refuse(422, 'WebP header is damaged');
        }
        width = bytes.readUInt16LE(data + 6) & 0x3fff;
        height = bytes.readUInt16LE(data + 8) & 0x3fff;
        pictureData = true;
      } else if (type === 'VP8L') {
        if (length < 5 || bytes[data] !== 0x2f) return refuse(422, 'WebP header is damaged');
        const bits = bytes.readUInt32LE(data + 1);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
        pictureData = true;
      } else {
        return refuse(422, 'WebP has no header');
      }
      const size = checkSize(width, height, 'image/webp');
      if (!size.ok) return size;
      first = false;
    } else if (type === 'VP8 ' || type === 'VP8L') {
      // The size of the stream must be the one the header declares: the limit holds for the pixels too.
      const stream = webpStreamSize(bytes, type, data, length);
      if (!stream) return refuse(422, 'WebP header is damaged');
      if (extended && (stream.width !== width || stream.height !== height)) {
        return refuse(422, 'WebP picture size differs from its header');
      }
      pictureData = true;
    } else if (type === 'ANIM' || type === 'ANMF') {
      return refuse(415, 'animated WebP is not allowed');
    }
    offset = end;
  }
  if (offset !== bytes.length) return refuse(422, 'WebP is truncated');
  return pictureData ? { ok: true, mime: 'image/webp', width, height } : refuse(422, 'WebP has no picture data');
};

/** Controlla i byte di un'immagine e ne restituisce il tipo rilevato e le dimensioni, oppure il motivo del rifiuto. */
export const inspectImage = (bytes: Buffer): ImageCheck => {
  if (bytes.length === 0) return refuse(422, 'image is empty');
  if (bytes.length > MAX_IMAGE_BYTES) return refuse(413, `image is larger than ${MAX_IMAGE_BYTES} bytes`);
  if (bytes.length >= PNG_SIGNATURE.length && bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return inspectPng(bytes);
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return inspectJpeg(bytes);
  }
  if (bytes.length >= 12 && bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') {
    return inspectWebp(bytes);
  }
  const head = bytes.toString('utf8', 0, 256).trimStart().toLowerCase();
  if (head.startsWith('<')) return refuse(415, 'SVG and markup are not allowed: use PNG, JPEG or WebP');
  return refuse(415, 'unsupported image: use PNG, JPEG or WebP');
};
