/**
 * A small QR code encoder (ISO/IEC 18004), byte mode only, versions 1 to 40, the four error
 * correction levels. It exists so that the `qr_code` selector of a Home Assistant flow (the
 * Tuya login) can be drawn without a new dependency (REP-20261028-004, T7). Written from the
 * standard; tested against the matrices of the zxing encoder tests (see qrEncode.test.ts).
 *
 * `encodeQr` gives the matrix (true = dark module); `qrPath` turns it into the `d` of one SVG
 * path. Text longer than the capacity of version 40 throws.
 */

export type QrLevel = 'L' | 'M' | 'Q' | 'H';

const LEVELS: readonly QrLevel[] = ['L', 'M', 'Q', 'H'];
/** The two bits of the format information for each level (L=01, M=00, Q=11, H=10). */
const FORMAT_BITS: Readonly<Record<QrLevel, number>> = { L: 1, M: 0, Q: 3, H: 2 };

// Index by version (1..40) at position version - 1.
const ECC_CODEWORDS_PER_BLOCK: Readonly<Record<QrLevel, readonly number[]>> = {
  L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};
const BLOCKS: Readonly<Record<QrLevel, readonly number[]>> = {
  L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

const PAD_BYTES = [0xec, 0x11];

/** Modules of a symbol of this version on a side. */
export const sizeOf = (version: number): number => version * 4 + 17;

/** Modules that can carry data or error correction (everything but the function patterns). */
const rawModules = (version: number): number => {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
};

/** Data codewords (bytes) a symbol of this version and level holds. */
export const dataCapacity = (version: number, level: QrLevel): number =>
  Math.floor(rawModules(version) / 8) -
  ECC_CODEWORDS_PER_BLOCK[level][version - 1]! * BLOCKS[level][version - 1]!;

// --- Reed-Solomon over GF(256), polynomial 0x11D -------------------------------------------

const multiply = (x: number, y: number): number => {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
};

/** Coefficients of the generator polynomial of this degree, highest term (always 1) left out. */
export const reedSolomonDivisor = (degree: number): number[] => {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = multiply(result[j]!, root);
      if (j + 1 < degree) result[j]! ^= result[j + 1]!;
    }
    root = multiply(root, 0x02);
  }
  return result;
};

/** The error correction codewords of `data` for the given divisor. */
export const reedSolomonRemainder = (data: readonly number[], divisor: readonly number[]): number[] => {
  const result = new Array<number>(divisor.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ result.shift()!;
    result.push(0);
    divisor.forEach((coefficient, i) => {
      result[i]! ^= multiply(coefficient, factor);
    });
  }
  return result;
};

/** Data split in blocks, each with its error correction, and the bytes interleaved. */
const addEcc = (data: readonly number[], version: number, level: QrLevel): number[] => {
  const blocks = BLOCKS[level][version - 1]!;
  const eccLength = ECC_CODEWORDS_PER_BLOCK[level][version - 1]!;
  const raw = Math.floor(rawModules(version) / 8);
  const shortBlocks = blocks - (raw % blocks);
  const shortLength = Math.floor(raw / blocks);

  const divisor = reedSolomonDivisor(eccLength);
  const parts: number[][] = [];
  for (let i = 0, k = 0; i < blocks; i += 1) {
    const chunk = data.slice(k, k + shortLength - eccLength + (i < shortBlocks ? 0 : 1));
    k += chunk.length;
    const ecc = reedSolomonRemainder(chunk, divisor);
    // A short block gets a placeholder so that all blocks line up; it is skipped below.
    if (i < shortBlocks) chunk.push(0);
    parts.push([...chunk, ...ecc]);
  }

  const result: number[] = [];
  for (let i = 0; i < parts[0]!.length; i += 1) {
    parts.forEach((block, j) => {
      if (i !== shortLength - eccLength || j >= shortBlocks) result.push(block[i]!);
    });
  }
  return result;
};

// --- The symbol -------------------------------------------------------------------------------

class Grid {
  readonly size: number;
  readonly modules: boolean[][];
  private readonly reserved: boolean[][];

  constructor(readonly version: number) {
    this.size = sizeOf(version);
    this.modules = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.reserved = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
  }

  /** A function module: its colour is fixed and data never goes there. */
  setFunction(x: number, y: number, dark: boolean): void {
    this.modules[y]![x] = dark;
    this.reserved[y]![x] = true;
  }

  isFunction(x: number, y: number): boolean {
    return this.reserved[y]![x]!;
  }

  drawFunctionPatterns(level: QrLevel): void {
    const { size, version } = this;
    for (let i = 0; i < size; i += 1) {
      this.setFunction(6, i, i % 2 === 0);
      this.setFunction(i, 6, i % 2 === 0);
    }
    this.finder(3, 3);
    this.finder(size - 4, 3);
    this.finder(3, size - 4);

    const positions = alignmentPositions(version);
    const last = positions.length - 1;
    positions.forEach((cy, i) => {
      positions.forEach((cx, j) => {
        // The three corners that hold a finder pattern get no alignment pattern.
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
        for (let dy = -2; dy <= 2; dy += 1) {
          for (let dx = -2; dx <= 2; dx += 1) {
            this.setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
          }
        }
      });
    });

    this.drawFormat(level, 0);
    this.drawVersion();
  }

  private finder(cx: number, cy: number): void {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) continue;
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        this.setFunction(x, y, distance !== 2 && distance !== 4);
      }
    }
  }

  /** The 15 format bits (level and mask, with their BCH code), in both places. */
  drawFormat(level: QrLevel, mask: number): void {
    const bits = formatBits(level, mask);
    const bit = (i: number) => ((bits >>> i) & 1) !== 0;
    const { size } = this;
    for (let i = 0; i <= 5; i += 1) this.setFunction(8, i, bit(i));
    this.setFunction(8, 7, bit(6));
    this.setFunction(8, 8, bit(7));
    this.setFunction(7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) this.setFunction(14 - i, 8, bit(i));

    for (let i = 0; i < 8; i += 1) this.setFunction(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i += 1) this.setFunction(8, size - 15 + i, bit(i));
    // The one module that is always dark.
    this.setFunction(8, size - 8, true);
  }

  private drawVersion(): void {
    if (this.version < 7) return;
    const bits = versionBits(this.version);
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunction(a, b, dark);
      this.setFunction(b, a, dark);
    }
  }

  /** Data and error correction bits in the zigzag order of the standard. */
  drawCodewords(codewords: readonly number[]): void {
    const { size } = this;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert += 1) {
        for (let j = 0; j < 2; j += 1) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!this.isFunction(x, y) && i < codewords.length * 8) {
            this.modules[y]![x] = ((codewords[i >>> 3]! >>> (7 - (i & 7))) & 1) !== 0;
            i += 1;
          }
        }
      }
    }
  }

  /** Flips the data modules the mask covers; applying it twice undoes it. */
  applyMask(mask: number): void {
    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        if (!this.isFunction(x, y) && maskCovers(mask, x, y)) this.modules[y]![x] = !this.modules[y]![x];
      }
    }
  }
}

const maskCovers = (mask: number, x: number, y: number): boolean => {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
};

/** Centres of the alignment patterns on a row or a column. */
export const alignmentPositions = (version: number): number[] => {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let position = sizeOf(version) - 7; result.length < count; position -= step) {
    result.splice(1, 0, position);
  }
  return result;
};

/** The 15 format bits: level and mask protected by a BCH(15,5) code, then XOR 0x5412. */
export const formatBits = (level: QrLevel, mask: number): number => {
  const data = (FORMAT_BITS[level] << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i += 1) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  return ((data << 10) | remainder) ^ 0x5412;
};

/** The 18 version bits (versions 7 and up): the version and a BCH(18,6) code. */
export const versionBits = (version: number): number => {
  let remainder = version;
  for (let i = 0; i < 12; i += 1) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  return (version << 12) | remainder;
};

/** The four penalty rules of the standard, added up. */
const penalty = (modules: readonly (readonly boolean[])[]): number => {
  const size = modules.length;
  const at = (x: number, y: number) => modules[y]![x]!;
  let total = 0;

  // Rule 1: five or more equal modules in a row, and rule 3: the 1:1:3:1:1 finder shape with
  // four light modules on one side; both read along rows and columns.
  const FINDER = [true, false, true, true, true, false, true];
  for (const horizontal of [true, false]) {
    for (let a = 0; a < size; a += 1) {
      const line = (i: number) => (horizontal ? at(i, a) : at(a, i));
      let run = 1;
      for (let i = 1; i < size; i += 1) {
        if (line(i) === line(i - 1)) {
          run += 1;
          if (run === 5) total += 3;
          else if (run > 5) total += 1;
        } else {
          run = 1;
        }
      }
      for (let i = 0; i + 7 <= size; i += 1) {
        if (!FINDER.every((dark, k) => line(i + k) === dark)) continue;
        const lightBefore = i >= 4 && [1, 2, 3, 4].every((k) => !line(i - k));
        const lightAfter = i + 11 <= size && [7, 8, 9, 10].every((k) => !line(i + k));
        if (lightBefore || lightAfter) total += 40;
      }
    }
  }

  // Rule 2: blocks of 2 x 2 equal modules.
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const color = at(x, y);
      if (color === at(x + 1, y) && color === at(x, y + 1) && color === at(x + 1, y + 1)) total += 3;
    }
  }

  // Rule 4: the share of dark modules away from 50%, 10 points for each full 5%.
  const dark = modules.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const cells = size * size;
  total += 10 * Math.floor(Math.abs(20 * dark - 10 * cells) / cells);
  return total;
};

/**
 * The symbol for data codewords that are already built (mode, count, text, terminator, padding).
 * Adds the error correction, tries the eight masks and keeps the one with the lowest penalty.
 */
export const layoutQr = (
  dataCodewords: readonly number[],
  version: number,
  level: QrLevel
): { modules: boolean[][]; mask: number } => {
  if (dataCodewords.length !== dataCapacity(version, level)) {
    throw new Error('QR: wrong number of data codewords');
  }
  const grid = new Grid(version);
  grid.drawFunctionPatterns(level);
  grid.drawCodewords(addEcc(dataCodewords, version, level));

  let best = 0;
  let lowest = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    grid.applyMask(mask);
    grid.drawFormat(level, mask);
    const score = penalty(grid.modules);
    if (score < lowest) {
      lowest = score;
      best = mask;
    }
    grid.applyMask(mask);
  }
  grid.applyMask(best);
  grid.drawFormat(level, best);
  return { modules: grid.modules, mask: best };
};

/** Data codewords for a text in byte mode (UTF-8) at the smallest version that holds it. */
export const byteModeCodewords = (
  text: string,
  level: QrLevel,
  minVersion = 1
): { codewords: number[]; version: number } => {
  const bytes = Array.from(new TextEncoder().encode(text));
  for (let version = minVersion; version <= 40; version += 1) {
    const countBits = version < 10 ? 8 : 16;
    const capacityBits = dataCapacity(version, level) * 8;
    if (4 + countBits + bytes.length * 8 > capacityBits) continue;

    const bits: number[] = [];
    const put = (value: number, length: number) => {
      for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
    };
    put(0b0100, 4);
    put(bytes.length, countBits);
    bytes.forEach((byte) => put(byte, 8));
    put(0, Math.min(4, capacityBits - bits.length));
    while (bits.length % 8 !== 0) bits.push(0);

    const codewords: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      codewords.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
    }
    for (let pad = 0; codewords.length < capacityBits / 8; pad += 1) {
      codewords.push(PAD_BYTES[pad % 2]!);
    }
    return { codewords, version };
  }
  throw new Error('QR: the text is too long');
};

/** The modules of the QR code for `text` (true = dark). */
export const encodeQr = (text: string, level: QrLevel = 'M'): boolean[][] => {
  if (!LEVELS.includes(level)) throw new Error('QR: unknown error correction level');
  const { codewords, version } = byteModeCodewords(text, level);
  return layoutQr(codewords, version, level).modules;
};

/** One SVG path (`d`) for the dark modules, with `margin` light modules around (default 4). */
export const qrPath = (modules: readonly (readonly boolean[])[], margin = 4): string => {
  const parts: string[] = [];
  modules.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      let end = x;
      while (end < row.length && row[end]) end += 1;
      parts.push(`M${x + margin} ${y + margin}h${end - x}v1h-${end - x}z`);
      x = end;
    }
  });
  return parts.join('');
};
