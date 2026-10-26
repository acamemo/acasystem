import { rm } from 'node:fs/promises';

// Svuota build/ prima di compilare: nessun file vecchio finisce nell'installatore.
await rm(new URL('../build/', import.meta.url), { recursive: true, force: true });
