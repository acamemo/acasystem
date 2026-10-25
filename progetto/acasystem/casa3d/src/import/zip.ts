// A small ZIP reader (Sweet Home 3D files, zipped exports): the central directory, stored and deflated entries,
// unpacked with the browser's own DecompressionStream – no library, nothing leaves the machine.

export interface ZipEntry {
  name: string;
  read(): Promise<Uint8Array>;
}

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Whether the bytes start like a ZIP file. */
export function isZip(b: Uint8Array): boolean {
  return b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
}

export function readZip(b: Uint8Array): ZipEntry[] {
  // the end of central directory record: searched from the back (a comment may follow it)
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--)
    if (u32(b, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new Error("zip_broken");
  const count = u16(b, eocd + 10);
  let p = u32(b, eocd + 16);
  const out: ZipEntry[] = [];
  const dec = new TextDecoder();
  for (let k = 0; k < count; k++) {
    if (u32(b, p) !== 0x02014b50) throw new Error("zip_broken");
    const method = u16(b, p + 10);
    const size = u32(b, p + 20);
    const nameLen = u16(b, p + 28);
    const extraLen = u16(b, p + 30);
    const commentLen = u16(b, p + 32);
    const local = u32(b, p + 42);
    const name = dec.decode(b.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    out.push({
      name,
      read: async () => {
        if (u32(b, local) !== 0x04034b50) throw new Error("zip_broken");
        const start = local + 30 + u16(b, local + 26) + u16(b, local + 28);
        const data = b.subarray(start, start + size);
        if (method === 0) return data;
        if (method === 8) return inflate(data);
        throw new Error("zip_method");
      },
    });
  }
  return out;
}
