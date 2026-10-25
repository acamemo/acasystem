# REP-20261007-032 — Riordino con attesa di 650 ms (F2)

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07/08, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Piano «Personalizzazione come Android» approvato in chat il 2026-10-07, fase F2. |
| Fonte | Launcher3 [Workspace.java](https://android.googlesource.com/platform/packages/apps/Launcher3/+/refs/heads/main/src/com/android/launcher3/Workspace.java): `REORDER_TIMEOUT = 650`; consultata il 2026-10-07. |

## Modifiche

- **Anteprima in attesa** (`useWidgetDrag.ts`, funzione `hold`):
  - a ogni nuova destinazione il widget trascinato si vede nel posto nuovo, ma gli altri restano fermi;
  - l'anteprima è segnata `waiting`.
- **Riordino dopo la sosta:** dopo 650 ms sullo stesso posto gli altri si spostano o si riducono come prima (`tryMoveWithReflow`).
- **Effetto:** passando sopra la griglia non ci sono più i salti continui degli altri widget.
- **Rilascio:** prima della scadenza fa comunque posto, con lo stesso calcolo.

## Verifiche

- vitest: ridimensionamento dal lato sinistro, con l'altro widget fermo in attesa e spostato dopo 660 ms (timer finti).
- Suite completa 1389/1389.
