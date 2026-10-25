# casa3d

Vista 3D e editor della casa per Acasystem (pagina «Casa 3D», ADR-0014). Base copiata da un progetto di terzi con licenza MIT: vedi `UPSTREAM.md` (provenienza), `NOTICE` (avvisi di licenza) e `PATCHES.md` (ogni modifica rispetto all'originale).

Stato (T6, 2026-10-21): copia e rinomina (T2a), build propria e servizio statico sotto `/casa3d/` (T2b); l'adattatore per Home Assistant e la pagina nel launcher stanno nel frontend (`frontend/src/casa3d/`, T3, T4a, T4b); la qualità Light, Medium e High e la gestione della perdita del contesto WebGL (T5) stanno in `viewer/quality.ts` e nelle patch del visore (`PATCHES.md`). La persistenza del piano (T6) sta fuori da questa cartella: tabelle, rotte `/api/casa3d/*`, validatore e controllo delle immagini nel backend (`backend/src/**/casa3d*`), traduzione dei comandi `casa3d/*` in chiamate REST nell'adattatore del frontend (`frontend/src/casa3d/planApi.ts`); `api.ts` non è patchato (vedi `PATCHES.md`, sezione 6).

| Cartella / file | Contenuto |
|---|---|
| `upstream/` | Copia verbatim della revisione fissata. Non si modifica mai. |
| `upstream.sha256` | Impronte di `upstream/`, controllate da `tools/rinomina.mjs`. |
| `overrides/` | File scritti a mano: quelli che sostituiscono i generati (`main.ts`) e quelli aggiunti (`viewer/quality.ts` con i livelli di qualità, e i test delle patch locali). |
| `build.mjs` | Build esbuild: bundle con l'impronta del contenuto nel nome, `dist/manifest.json`, licenze accanto ai bundle, budget di peso e controlli (nessun indirizzo di terzi, nessuna API di rete, nessun segnaposto, nessun marchio fuori dagli avvisi). |
| `dist/` | Output della build (non versionato): servito dal backend sotto `/casa3d/`. Il punto d'ingresso è solo `dist/manifest.json`. |
| `tools/rinomina.mjs` | Genera `src/`, `lang/` e `PATCHES.md` da `upstream/` e `overrides/`. |
| `tools/controlla-marchio.mjs` | Controlla che nel prodotto non ci siano il nome originale, indirizzi di terzi o connessioni proprie. |
| `src/`, `lang/` | Generati: non modificare a mano. |
| `NOTICE`, `LICENSE-*` | Avvisi di copyright e testi delle licenze (MIT della base, BSD-3 di lit, MIT di three). |

Il pacchetto è un workspace della radice `progetto/acasystem` (un solo `package-lock.json`). Comandi (dalla radice, con `-w casa3d`, o da questa cartella):

```
npm ci --ignore-scripts      # dalla radice: dipendenze a versione esatta
npm run rinomina             # rigenera src/, lang/ e PATCHES.md
npm test                     # test node --test dei sorgenti copiati
npm run typecheck            # tsc --noEmit (strict)
npm run marchio              # nessun nome originale, nessun indirizzo di terzi
npm run build                # typecheck + marchio, poi build.mjs -> dist/
```

Servizio (D16): il backend serve `dist/` sotto `/casa3d/` (`backend/src/routes/casa3d.ts`) sulla stessa origine, quindi con la CSP attuale. I file con l'impronta nel nome sono `immutable`; `manifest.json` non è mai in cache; un file mancante o un nome vecchio è un 404 esplicito. Il service worker (`frontend/public/sw.js`) tiene i soli bundle con impronta in una cache propria e li sostituisce a ogni nuova impronta. Nell'immagine Docker la cartella è `/app/casa3d/dist`.

Il prefisso tecnico `fp3d` (elementi `fp3d-*`, classi, variabili CSS) è mantenuto per scelta (ADR-0014, D3). Le eccezioni agli ADR 0004, 0005, 0007, 0008 e 0011 valgono soltanto per questa cartella (ADR-0014, sezione 8).
