import { crc32, inflateRawSync } from 'node:zlib';

/**
 * Lettore zip minimo per l'archivio dell'interfaccia (ADR-0023), senza dipendenze: metodi
 * 0 (store) e 8 (deflate), niente zip64, cifratura o file speciali. L'archivio arriva già
 * verificato con lo SHA-256; i controlli qui difendono comunque da percorsi fuori cartella
 * e da archivi che si gonfiano oltre il previsto.
 */

export interface ZipEntry {
  /** Percorso relativo con `/`, già controllato. */
  path: string;
  data: Uint8Array;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const MAX_ENTRIES = 20_000;
export const MAX_UNPACKED_BYTES = 500 * 1024 * 1024;

export class ZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipError';
  }
}

/** Percorso sicuro: relativo, senza `..`, `\`, unità o caratteri di controllo. */
export const safeEntryPath = (name: string): string => {
  if (
    !name ||
    name.startsWith('/') ||
    name.includes('\\') ||
    /^[a-zA-Z]:/.test(name) ||
    /[\u0000-\u001f]/.test(name)
  ) {
    throw new ZipError(`Percorso non ammesso: ${JSON.stringify(name)}`);
  }
  const parts = name.split('/').filter((part) => part !== '' && part !== '.');
  if (parts.length === 0 || parts.some((part) => part === '..')) {
    throw new ZipError(`Percorso non ammesso: ${JSON.stringify(name)}`);
  }
  return parts.join('/');
};

const findEndOfCentralDirectory = (view: DataView): number => {
  const lowest = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let offset = view.byteLength - 22; offset >= lowest; offset -= 1) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE) return offset;
  }
  throw new ZipError('Archivio zip non valido');
};

export const readZip = (archive: Uint8Array): ZipEntry[] => {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  if (view.byteLength < 22) throw new ZipError('Archivio zip non valido');
  const eocd = findEndOfCentralDirectory(view);
  const count = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  let offset = view.getUint32(eocd + 16, true);
  if (count === 0xffff || offset === 0xffffffff || count > MAX_ENTRIES) {
    throw new ZipError('Archivio zip64 o troppo grande');
  }
  if (offset + centralSize > eocd) throw new ZipError('Directory centrale fuori posto');

  const entries: ZipEntry[] = [];
  const seen = new Set<string>();
  let unpacked = 0;
  const decoder = new TextDecoder('utf-8', { fatal: true });

  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) throw new ZipError('Voce non valida');
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const rawName = decoder.decode(archive.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;

    if (flags & 0x1) throw new ZipError('Archivio cifrato');
    if (rawName.endsWith('/')) continue; // cartella: si crea con i file
    const path = safeEntryPath(rawName);
    if (seen.has(path.toLowerCase())) throw new ZipError(`Voce doppia: ${path}`);
    seen.add(path.toLowerCase());

    unpacked += size;
    if (unpacked > MAX_UNPACKED_BYTES) throw new ZipError('Archivio troppo grande una volta estratto');
    if (view.getUint32(localOffset, true) !== LOCAL_SIGNATURE) throw new ZipError('Intestazione locale non valida');
    const dataStart =
      localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    if (dataStart + compressedSize > archive.byteLength) throw new ZipError('Voce troncata');
    const compressed = archive.subarray(dataStart, dataStart + compressedSize);

    let data: Uint8Array;
    if (method === 0) data = compressed;
    else if (method === 8) data = inflateRawSync(compressed, { maxOutputLength: Math.max(size, 1) });
    else throw new ZipError(`Metodo di compressione non supportato: ${method}`);
    if (data.byteLength !== size || crc32(data) !== crc) throw new ZipError(`Voce alterata: ${path}`);
    entries.push({ path, data });
  }
  return entries;
};
