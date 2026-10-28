/**
 * The QR encoder of the `qr_code` selector (REP-20261028-004, T7), checked against references
 * that were not written here:
 * - two whole matrices from the zxing encoder tests (google/zxing, `EncoderTestCase.java`,
 *   `testEncode` and `testSimpleUTF8ECI`, read 2026-10-28): "ABCDEF" and "hello" (UTF-8 with an
 *   ECI header), level H, version 1. The data codewords are built here by hand from the
 *   standard, so the error correction, the placement, the masks and their choice are all
 *   compared with zxing;
 * - the error correction codewords of "HELLO WORLD" in version 1-M (Thonky, "QR Code Tutorial",
 *   error correction coding example);
 * - the format and version information words of ISO/IEC 18004 (tables of format and version
 *   information, as reproduced on the Wikipedia page «QR code»).
 */
import { describe, expect, it } from 'vitest';
import {
  alignmentPositions,
  byteModeCodewords,
  dataCapacity,
  encodeQr,
  formatBits,
  layoutQr,
  qrPath,
  reedSolomonDivisor,
  reedSolomonRemainder,
  sizeOf,
  versionBits,
} from '@/templates/devices/qrEncode';

const ABCDEF_H =   [
    '111111101111001111111',
    '100000100111001000001',
    '101110100101101011101',
    '101110101110101011101',
    '101110100111001011101',
    '100000100100001000001',
    '111111101010101111111',
    '000000000010100000000',
    '001011101100110001001',
    '101110010001010000000',
    '001100101000101010110',
    '110101011101010000010',
    '001101111000101011110',
    '000000001001110101000',
    '111111100010101100001',
    '100000101111010111101',
    '101110101011010100001',
    '101110100110111101010',
    '101110101000101011101',
    '100000100110110100011',
    '111111100000000010101',
  ];

const HELLO_ECI_H =   [
    '111111100000001111111',
    '100000100010101000001',
    '101110100101001011101',
    '101110100110101011101',
    '101110101010101011101',
    '100000100000101000001',
    '111111101010101111111',
    '000000001110000000000',
    '001100111100011010000',
    '001110000011000101110',
    '010101110101000001111',
    '110010011001111010110',
    '000010111100000100100',
    '000000001111001110001',
    '111111101110101100100',
    '100000100010011111101',
    '101110100100001100000',
    '101110101110100011000',
    '101110101100010010000',
    '100000100001101010110',
    '111111100101110110000',
  ];

const toRows = (modules: boolean[][]): string[] =>
  modules.map((row) => row.map((dark) => (dark ? '1' : '0')).join(''));

/** Bits to codewords, with the terminator, the byte boundary and the pad bytes of the standard. */
const codewordsOf = (bits: string, total: number): number[] => {
  let text = bits + '0'.repeat(Math.min(4, total * 8 - bits.length));
  text += '0'.repeat((8 - (text.length % 8)) % 8);
  const out = text.match(/.{8}/g)!.map((byte) => parseInt(byte, 2));
  for (let i = 0; out.length < total; i += 1) out.push(i % 2 === 0 ? 0xec : 0x11);
  return out;
};

const bin = (value: number, length: number): string => value.toString(2).padStart(length, '0');

describe('the whole symbol against zxing', () => {
  it('draws "ABCDEF" at level H (alphanumeric, version 1) as zxing does', () => {
    // Mode 0010, 6 characters in 9 bits, then A B = 10*45+11, C D = 12*45+13, E F = 14*45+15.
    const bits =
      '0010' + bin(6, 9) + bin(10 * 45 + 11, 11) + bin(12 * 45 + 13, 11) + bin(14 * 45 + 15, 11);
    const { modules, mask } = layoutQr(codewordsOf(bits, dataCapacity(1, 'H')), 1, 'H');
    expect(mask).toBe(0);
    expect(toRows(modules)).toEqual(ABCDEF_H);
  });

  it('draws "hello" with a UTF-8 ECI header at level H (byte, version 1) as zxing does', () => {
    // ECI mode 0111 and designator 26 (UTF-8), byte mode 0100, 5 bytes.
    const bytes = [...'hello'].map((char) => bin(char.charCodeAt(0), 8)).join('');
    const bits = '0111' + bin(26, 8) + '0100' + bin(5, 8) + bytes;
    const { modules, mask } = layoutQr(codewordsOf(bits, dataCapacity(1, 'H')), 1, 'H');
    expect(mask).toBe(3);
    expect(toRows(modules)).toEqual(HELLO_ECI_H);
  });
});

describe('the pieces', () => {
  it('computes the error correction of "HELLO WORLD" in version 1-M', () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    expect(reedSolomonRemainder(data, reedSolomonDivisor(10))).toEqual([
      196, 35, 39, 119, 235, 215, 231, 226, 93, 23,
    ]);
  });

  it('writes the byte mode header and pads like the standard', () => {
    const { codewords, version } = byteModeCodewords('HELLO', 'M');
    expect(version).toBe(1);
    expect(codewords).toHaveLength(16);
    // 0100 | 00000101 | 'H' 'E' 'L' 'L' 'O' | 0000 | pad
    expect(codewords.slice(0, 8)).toEqual([0x40, 0x54, 0x84, 0x54, 0xc4, 0xc4, 0xf0, 0xec]);
    expect(codewords[8]).toBe(0x11);
  });

  it('knows the data capacity of the versions and levels', () => {
    const capacity = (level: 'L' | 'M' | 'Q' | 'H', versions: number[]) =>
      versions.map((version) => dataCapacity(version, level));
    expect(capacity('L', [1, 2, 3, 4, 5, 7, 40])).toEqual([19, 34, 55, 80, 108, 156, 2956]);
    expect(capacity('M', [1, 2, 3, 4, 5, 7, 40])).toEqual([16, 28, 44, 64, 86, 124, 2334]);
    expect(capacity('Q', [1, 2, 3, 4, 5, 7, 40])).toEqual([13, 22, 34, 48, 62, 88, 1666]);
    expect(capacity('H', [1, 2, 3, 4, 5, 7, 40])).toEqual([9, 16, 26, 36, 46, 66, 1276]);
  });

  it('knows the format and version information words', () => {
    expect(formatBits('L', 0)).toBe(0b111011111000100);
    expect(formatBits('M', 0)).toBe(0b101010000010010);
    expect(formatBits('Q', 0)).toBe(0b011010101011111);
    expect(formatBits('H', 0)).toBe(0b001011010001001);
    expect(formatBits('L', 1)).toBe(0b111001011110011);
    expect(versionBits(7)).toBe(0b000111110010010100);
    expect(versionBits(8)).toBe(0b001000010110111100);
    expect(versionBits(40)).toBe(0b101000110001101001);
  });

  it('places the alignment patterns where the standard puts them', () => {
    expect(alignmentPositions(1)).toEqual([]);
    expect(alignmentPositions(2)).toEqual([6, 18]);
    expect(alignmentPositions(7)).toEqual([6, 22, 38]);
    expect(alignmentPositions(32)).toEqual([6, 34, 60, 86, 112, 138]);
    expect(alignmentPositions(40)).toEqual([6, 30, 58, 86, 114, 142, 170]);
  });
});

describe('encodeQr', () => {
  it('gives a square symbol with the three finder patterns and the timing lines', () => {
    const modules = encodeQr('tuyaSmart--qrLogin?token=abc123', 'Q');
    const size = modules.length;
    expect(size).toBe(sizeOf(3));
    expect(modules.every((row) => row.length === size)).toBe(true);
    for (const [x, y] of [
      [0, 0],
      [size - 7, 0],
      [0, size - 7],
    ] as const) {
      expect(modules[y]![x]).toBe(true);
      expect(modules[y + 3]![x + 3]).toBe(true);
      expect(modules[y + 1]![x + 1]).toBe(false);
    }
    for (let i = 8; i < size - 8; i += 1) expect(modules[6]![i]).toBe(i % 2 === 0);
    // The module that is always dark.
    expect(modules[size - 8]![8]).toBe(true);
  });

  it('grows the version with the text and the level', () => {
    expect(encodeQr('a'.repeat(14), 'M')).toHaveLength(sizeOf(1));
    expect(encodeQr('a'.repeat(15), 'M')).toHaveLength(sizeOf(2));
    expect(encodeQr('a'.repeat(7), 'H')).toHaveLength(sizeOf(1));
    expect(encodeQr('a'.repeat(8), 'H')).toHaveLength(sizeOf(2));
    // Past version 9 the length takes 16 bits; version 40 L holds 2953 bytes.
    expect(encodeQr('a'.repeat(300), 'L')).toHaveLength(sizeOf(11));
    expect(encodeQr('a'.repeat(2953), 'L')).toHaveLength(sizeOf(40));
    expect(() => encodeQr('a'.repeat(2954), 'L')).toThrow();
  });

  it('encodes text as UTF-8 bytes', () => {
    const { codewords } = byteModeCodewords('è', 'M');
    // 0100 | 00000010 | C3 A8 | 0000
    expect(codewords.slice(0, 4)).toEqual([0x40, 0x2c, 0x3a, 0x80]);
  });

  it('turns the modules into one path with a quiet zone', () => {
    expect(qrPath([[true, true, false], [false, true, false]], 1)).toBe('M1 1h2v1h-2zM2 2h1v1h-1z');
  });
});
