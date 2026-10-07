import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Cartella `backend/src`: i percorsi sono calcolati da qui, come faceva `index.js`. */
export const SOURCE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

/** `backend/package.json`, da cui si legge la versione esposta da /api/health. */
export const PACKAGE_JSON_PATH = join(SOURCE_DIR, '..', 'package.json');

/** Build del frontend: `progetto/acasystem/frontend/dist` (in Docker `/app/frontend/dist`). */
export const DEFAULT_FRONTEND_DIST_PATH = join(SOURCE_DIR, '..', '..', 'frontend', 'dist');

/** Nome del file SQLite: invariato, così il volume dati esistente resta valido. */
export const DATABASE_FILE_NAME = 'tunet.db';
