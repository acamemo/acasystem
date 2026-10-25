import type { Validation } from '../@types/http.ts';
import { isRecord } from '../helpers/objects.ts';
import { checkBuilding } from './casa3dSchema.ts';
import { invalid, readRequestBody, valid } from './common.ts';

/** Ingressi delle rotte `/api/casa3d` (ADR-0014, T6). I messaggi sono in inglese come quelli di Tunet. */

/** Dimensione massima del piano serializzato; il corpo JSON del server è già limitato a 2 MB. */
export const MAX_BUILDING_BYTES = 1_900_000;

const IMAGE_ID = /^[A-Za-z0-9_\-.]{1,64}$/;
const SNAPSHOT_ID = /^[A-Za-z0-9_\-.]{1,64}$/;

/** Profondità massima del piano e chiavi che non si accettano a nessun livello (anche nei campi sconosciuti). */
export const MAX_BUILDING_DEPTH = 64;
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

/** Controllo iterativo (senza ricorsione, per non esaurire lo stack su un annidamento enorme); null se il piano è accettabile. */
const structureProblem = (root: unknown): string | null => {
  const stack: { value: unknown; depth: number }[] = [{ value: root, depth: 0 }];
  for (let item = stack.pop(); item !== undefined; item = stack.pop()) {
    const { value, depth } = item;
    if (typeof value !== 'object' || value === null) continue;
    if (depth > MAX_BUILDING_DEPTH) return `nested deeper than ${MAX_BUILDING_DEPTH} levels`;
    if (Array.isArray(value)) {
      for (const child of value) stack.push({ value: child, depth: depth + 1 });
      continue;
    }
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key)) return `key "${key}" is not allowed`;
      stack.push({ value: child, depth: depth + 1 });
    }
  }
  return null;
};

/** Piano completo: forma dello schema e dimensione. */
export const validateBuilding = (building: unknown): Validation<Record<string, unknown>> => {
  if (!isRecord(building) || Array.isArray(building)) return invalid(400, 'building must be an object');
  const shape = structureProblem(building);
  if (shape) return invalid(400, `Invalid building: ${shape}`);
  const problem = checkBuilding(building);
  if (problem) return invalid(400, `Invalid building: ${problem}`);
  if (Buffer.byteLength(JSON.stringify(building), 'utf8') > MAX_BUILDING_BYTES) {
    return invalid(413, 'Building is too large');
  }
  return valid(building);
};

export interface SaveBuildingInput {
  building: Record<string, unknown>;
  baseRevision: number;
}

/** Corpo di `PUT /building`: il piano e la revisione su cui si basa (0 se il server non ha ancora un piano). */
export const validateSaveBody = (body: unknown): Validation<SaveBuildingInput> => {
  const fields = readRequestBody(body);
  const baseRevision = fields.base_revision;
  if (typeof baseRevision !== 'number' || !Number.isInteger(baseRevision) || baseRevision < 0) {
    return invalid(400, 'base_revision must be a non-negative integer');
  }
  const building = validateBuilding(fields.building);
  if (!building.ok) return building;
  return valid({ building: building.value, baseRevision });
};

export interface ImportBackupInput {
  building: Record<string, unknown>;
  packs: unknown[];
}

/** Corpo di `POST /backup`: il piano e i pacchetti (questi ultimi non sono accettati, vedi il servizio). */
export const validateImportBody = (body: unknown): Validation<ImportBackupInput> => {
  const fields = readRequestBody(body);
  const building = validateBuilding(fields.building);
  if (!building.ok) return building;
  const packs = fields.packs ?? [];
  if (!Array.isArray(packs) || packs.length > 100) return invalid(400, 'packs must be a list of up to 100 items');
  return valid({ building: building.value, packs });
};

export const validateImageId = (value: unknown): Validation<string> =>
  typeof value === 'string' && IMAGE_ID.test(value) ? valid(value) : invalid(400, 'Invalid image id');

export const validateSnapshotId = (value: unknown): Validation<string> =>
  typeof value === 'string' && SNAPSHOT_ID.test(value) ? valid(value) : invalid(400, 'Invalid restore point id');
