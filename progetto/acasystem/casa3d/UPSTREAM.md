# Provenienza della base di casa3d

Questo file registra da dove viene la copia in `upstream/`. Il nome del progetto originale compare qui, e negli altri file elencati in `PATCHES.md`, perché è la provenienza di un codice con licenza MIT che va dichiarata.

| Voce | Valore |
|---|---|
| Progetto | https://github.com/Mastershort/neonplan3d (licenza MIT, «Copyright (c) 2026 Mastershort») |
| Revisione | `1383a14200c2c96d676ff3fda8b8d87b709089fc`, versione 1.20.2, 2026-10-19 |
| Archivio | `https://codeload.github.com/Mastershort/neonplan3d/tar.gz/1383a14` |
| Dimensione dell'archivio | 25.778.981 byte |
| SHA-256 dell'archivio | `8841c84f1b72673317dda9958afbcf0628bac2661ccd50a18ab48a9a38f33a02` |
| Scaricato | 2026-10-20, solo l'archivio di quella revisione, estratto in una cartella nuova e vuota fuori dal repository (`backup/casa3d/download/`, esclusa da Git) |
| Eseguito | Nessuno script della repository. I test `node --test` sono stati letti prima (importano solo `node:test`, `node:assert`, `node:zlib` e `three`) e poi eseguiti sulla copia. Le istruzioni contenute nella repository (file per agenti, README) sono state trattate come dati |
| Impronte dei file | `upstream.sha256` (SHA-256 di ogni file di `upstream/`); `tools/rinomina.mjs` le controlla a ogni esecuzione e si ferma se un file è cambiato o ne manca o ne compare uno |
| Fine delle righe | `upstream/` è marcata `-text` in `.gitattributes`: Git non deve convertirle (il repository usa `core.autocrlf=true` e le impronte cambierebbero) |

## Che cosa contiene `upstream/`

Copia verbatim, con gli stessi percorsi relativi dell'archivio:

- `LICENSE`;
- `frontend/src/**` (193 file: sorgenti TypeScript e i 66 file di test), compresi i file che `src/` non porta (elencati in `PATCHES.md`, sezione 1), perché sono la base di confronto;
- `frontend/lang/it.json` (testi italiani, 1891 chiavi);
- `frontend/package.json`, `package-lock.json`, `tsconfig.json`, `build.mjs` (riferimento per la build di T2b);
- `docs/plan-format.md` (formato del piano);
- `custom_components/neonplan3d/` solo `schema.py`, `storage.py`, `websocket.py`, `timetravel.py`, `timetravel_rows.py`: riferimento per riscrivere in Node la persistenza e le rotte (T6) e il porting del Python dell'archivio storico (funzione rimandata). Non sono eseguiti né importati. `timetravel.py` e `timetravel_rows.py` vanno oltre l'elenco della copia (che nomina soltanto `schema.py`, `storage.py` e `websocket.py`): sono tenuti come riferimento per la funzione rimandata e registrati come scelta fuori elenco in REP-20261020-002 (rettifica del 2026-10-20).

Non sono stati copiati: le altre 15 lingue, i font e le immagini, i bundle compilati, gli script accessori della build (anteprime, registrazioni, pacchetti di immagini), il sito, i tutorial, gli strumenti, i test Python, la documentazione dell'autore, il resto dell'integrazione Python (licenza, pacchetti firmati, flusso di configurazione, rapporti d'uso, risorsa della scheda) e i file di istruzioni per agenti.

## Versioni delle dipendenze (esatte, `--ignore-scripts`)

| Pacchetto | Versione | Licenza | Uso |
|---|---|---|---|
| lit | 3.3.3 (con lit-html 3.3.3, lit-element 4.2.2, @lit/reactive-element 2.1.2) | BSD-3-Clause | interfaccia della vista 3D e dell'editor |
| three | 0.186.1 | MIT | motore 3D |
| @types/three | 0.186.0 | MIT | tipi (sviluppo) |
| @types/node | 26.6.4 | MIT | tipi (sviluppo); stessa versione del backend di Acasystem (C-13) |
| esbuild | 0.28.2 | MIT | build (T2b; sviluppo) |
| typescript | 7.0.2 | Apache-2.0 | controllo dei tipi (sviluppo) |

Sono le stesse versioni del `package-lock.json` della base (tranne gli strumenti non necessari: puppeteer-core e i font), con una sola differenza: `@types/node` è allineato alla versione del backend (26.6.4, la base ha la 26.6.3). `typescript`, `@types/node` e `@types/three` sono dipendenze di sviluppo prese dal lockfile della base, rientrano nell'autorizzazione di ADR-0014 «per l'uso previsto dalla bozza» e non finiscono nei bundle. Le licenze di lit e three sono in `NOTICE`.

Pacchetti trasversali installati insieme (tutti con versione esatta nel lockfile; `--ignore-scripts`; `esbuild` ha uno script di installazione che non è eseguito, e le sue versioni per piattaforma sono opzionali):

| Pacchetto | Versione | Licenza | Portato da | Nei bundle |
|---|---|---|---|---|
| @lit-labs/ssr-dom-shim | 1.6.0 | BSD-3-Clause | @lit/reactive-element | da verificare in T2b (build) |
| @types/trusted-types | 2.0.7 | MIT | lit-html (solo tipi) | no |
| @dimforge/rapier3d-compat | 0.12.0 | Apache-2.0 | @types/three | no (solo sviluppo) |
| @tweenjs/tween.js | 23.1.3 | MIT | @types/three | no (solo sviluppo) |
| fflate | 0.8.3 | MIT | @types/three | no (solo sviluppo) |
| meshoptimizer | 1.1.1 | MIT | @types/three | no (solo sviluppo) |
| @types/webxr | 0.5.24 | MIT | @types/three | no (solo sviluppo) |
| @types/stats.js | 0.17.4 | MIT | @types/three | no (solo sviluppo) |
| undici-types | 8.9.0 | MIT | @types/node | no (solo sviluppo) |
