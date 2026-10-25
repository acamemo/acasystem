import { deflateSync, crc32 } from 'node:zlib';

/** Piani e immagini di prova per i test della Casa 3D (nessun dato reale). */

export const room = (id = 'r1', overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  name: 'Soggiorno',
  area_id: null,
  points: [
    [0, 0],
    [4, 0],
    [4, 3],
    [0, 3],
  ],
  floor_material: 'oak',
  ...overrides,
});

export const floor = (id = 'f1', overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  name: 'Piano terra',
  elevation: 0,
  height: 2.7,
  cut_height: 1.2,
  rooms: [room('r1')],
  openings: [],
  furniture: [],
  placements: [],
  background: null,
  ...overrides,
});

export const building = (
  floors: Record<string, unknown>[] = [floor()],
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  version: 1,
  floors,
  settings: { wall_exterior: 0.24, wall_interior: 0.12, grid: 0.05 },
  ...overrides,
});

export const sofa = (id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  type: 'sofa',
  x: 1,
  z: 1,
  rotation: 0,
  w: 2,
  d: 1,
  h: 0.8,
  variant: null,
  ...overrides,
});

// ---------------------------------------------------------------------------- immagini

const pngChunk = (type: string, data: Buffer): Buffer => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
};

/** PNG grigio a 8 bit valido (IHDR, IDAT, IEND con i loro CRC). */
export const makePng = (width = 4, height = 4): Buffer => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  const rows = Buffer.alloc((width + 1) * height);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(rows)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
};

/** JPEG con la struttura giusta (SOI, SOF0, SOS con i dati, EOI); i pixel non sono decodificabili. */
export const makeJpeg = (width = 8, height = 8, { eoi = true }: { eoi?: boolean } = {}): Buffer => {
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x0b, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x01, 0x01, 0x11, 0x00]);
  const sos = Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]);
  const scan = Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    sof,
    sos,
    scan,
    eoi ? Buffer.from([0xff, 0xd9]) : Buffer.alloc(0),
  ]);
};

/** WebP senza perdita (VP8L) con la struttura giusta. */
export const makeWebp = (width = 8, height = 8, { animated = false }: { animated?: boolean } = {}): Buffer => {
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  const vp8l = Buffer.alloc(8);
  vp8l[0] = 0x2f;
  vp8l.writeUInt32LE(bits >>> 0, 1);
  const chunks: Buffer[] = [];
  if (animated) {
    const vp8x = Buffer.alloc(10);
    vp8x[0] = 0x02;
    vp8x.writeUIntLE(width - 1, 4, 3);
    vp8x.writeUIntLE(height - 1, 7, 3);
    const head = Buffer.alloc(8);
    head.write('VP8X', 0, 'latin1');
    head.writeUInt32LE(10, 4);
    chunks.push(head, vp8x);
  }
  const head = Buffer.alloc(8);
  head.write('VP8L', 0, 'latin1');
  head.writeUInt32LE(vp8l.length, 4);
  chunks.push(head, vp8l);
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...chunks]);
  const riff = Buffer.alloc(8);
  riff.write('RIFF', 0, 'latin1');
  riff.writeUInt32LE(body.length, 4);
  return Buffer.concat([riff, body]);
};
