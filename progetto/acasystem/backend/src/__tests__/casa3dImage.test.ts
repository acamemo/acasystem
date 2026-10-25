// @vitest-environment node

import { crc32 } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES, MAX_IMAGE_SIDE, inspectImage } from '../helpers/casa3dImage.ts';
import { makeJpeg, makePng, makeWebp } from './casa3dFixtures.ts';

describe('inspectImage', () => {
  it('accepts a PNG, a JPEG and a WebP and reads their size', () => {
    expect(inspectImage(makePng(16, 8))).toEqual({ ok: true, mime: 'image/png', width: 16, height: 8 });
    expect(inspectImage(makeJpeg(32, 24))).toEqual({ ok: true, mime: 'image/jpeg', width: 32, height: 24 });
    expect(inspectImage(makeWebp(40, 30))).toEqual({ ok: true, mime: 'image/webp', width: 40, height: 30 });
  });

  it('accepts the largest side and rejects one pixel more', () => {
    expect(inspectImage(makePng(MAX_IMAGE_SIDE, 1)).ok).toBe(true);
    expect(inspectImage(makePng(MAX_IMAGE_SIDE + 1, 1))).toMatchObject({ ok: false, status: 422 });
    expect(inspectImage(makeJpeg(1, MAX_IMAGE_SIDE + 1))).toMatchObject({ ok: false, status: 422 });
    expect(inspectImage(makeWebp(MAX_IMAGE_SIDE + 1, 1))).toMatchObject({ ok: false, status: 422 });
  });

  it('rejects a truncated file of each type', () => {
    const png = makePng();
    expect(inspectImage(png.subarray(0, png.length - 12))).toMatchObject({ ok: false, status: 422 });
    expect(inspectImage(png.subarray(0, png.length - 1))).toMatchObject({ ok: false, status: 422 });
    expect(inspectImage(png.subarray(0, 20))).toMatchObject({ ok: false, status: 422 });
    expect(inspectImage(makeJpeg(8, 8, { eoi: false }))).toMatchObject({ ok: false, status: 422 });
    const jpeg = makeJpeg();
    expect(inspectImage(jpeg.subarray(0, 12))).toMatchObject({ ok: false, status: 422 });
    const webp = makeWebp();
    expect(inspectImage(webp.subarray(0, webp.length - 3))).toMatchObject({ ok: false, status: 422 });
  });

  it('rejects a damaged PNG chunk and data after the end', () => {
    const damaged = Buffer.from(makePng());
    damaged[damaged.length - 20] = (damaged[damaged.length - 20] ?? 0) ^ 0xff;
    expect(inspectImage(damaged)).toMatchObject({ ok: false, status: 422 });
    expect(inspectImage(Buffer.concat([makePng(), Buffer.from('<script>')]))).toMatchObject({ ok: false, status: 422 });
    expect(inspectImage(Buffer.concat([makeJpeg(), Buffer.from([0, 0])]))).toMatchObject({ ok: false, status: 422 });
  });

  it('rejects SVG, markup and other formats by their bytes', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(inspectImage(svg)).toMatchObject({ ok: false, status: 415, reason: expect.stringMatching(/SVG/) });
    expect(inspectImage(Buffer.from('<?xml version="1.0"?><svg/>'))).toMatchObject({ ok: false, status: 415 });
    expect(inspectImage(Buffer.from('  <html></html>'))).toMatchObject({ ok: false, status: 415 });
    expect(inspectImage(Buffer.from('GIF89a......'))).toMatchObject({ ok: false, status: 415 });
    expect(inspectImage(Buffer.from('not an image'))).toMatchObject({ ok: false, status: 415 });
  });

  it('rejects an animated WebP, an empty file and a file over the byte limit', () => {
    expect(inspectImage(makeWebp(8, 8, { animated: true }))).toMatchObject({ ok: false, status: 415 });
    expect(inspectImage(Buffer.alloc(0))).toMatchObject({ ok: false, status: 422 });
    expect(inspectImage(Buffer.alloc(MAX_IMAGE_BYTES + 1, 1))).toMatchObject({ ok: false, status: 413 });
  });

  it('rejects an animated PNG, whatever chunk shows it', () => {
    const png = makePng();
    // acTL / fcTL / fdAT chunks with a valid CRC, put before the picture data
    const withChunk = (type: string): Buffer => {
      const head = Buffer.alloc(8);
      head.writeUInt32BE(8, 0);
      head.write(type, 4, 'latin1');
      const body = Buffer.alloc(8);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
      const chunk = Buffer.concat([head, body, crc]);
      return Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]);
    };
    for (const type of ['acTL', 'fcTL', 'fdAT']) {
      expect(inspectImage(withChunk(type)), type).toMatchObject({ ok: false, status: 415 });
    }
    expect(inspectImage(png).ok).toBe(true);
  });

  it('rejects a WebP whose picture is larger than its header declares', () => {
    const lossless = makeWebp(16384, 16384);
    const stream = lossless.subarray(12); // 'VP8L' chunk of 16384 x 16384
    const declared = (width: number, height: number): Buffer => {
      const vp8x = Buffer.alloc(18);
      vp8x.write('VP8X', 0, 'latin1');
      vp8x.writeUInt32LE(10, 4);
      vp8x.writeUIntLE(width - 1, 12, 3);
      vp8x.writeUIntLE(height - 1, 15, 3);
      const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), vp8x, stream]);
      const riff = Buffer.alloc(8);
      riff.write('RIFF', 0, 'latin1');
      riff.writeUInt32LE(body.length, 4);
      return Buffer.concat([riff, body]);
    };
    expect(inspectImage(declared(10, 10))).toMatchObject({ ok: false, status: 422 });
    expect(inspectImage(declared(16384, 16384))).toMatchObject({ ok: false, status: 422 }); // over the side limit too
    const small = makeWebp(10, 10).subarray(12);
    const ok = (() => {
      const vp8x = Buffer.alloc(18);
      vp8x.write('VP8X', 0, 'latin1');
      vp8x.writeUInt32LE(10, 4);
      vp8x.writeUIntLE(9, 12, 3);
      vp8x.writeUIntLE(9, 15, 3);
      const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), vp8x, small]);
      const riff = Buffer.alloc(8);
      riff.write('RIFF', 0, 'latin1');
      riff.writeUInt32LE(body.length, 4);
      return Buffer.concat([riff, body]);
    })();
    expect(inspectImage(ok)).toEqual({ ok: true, mime: 'image/webp', width: 10, height: 10 });
  });
});
