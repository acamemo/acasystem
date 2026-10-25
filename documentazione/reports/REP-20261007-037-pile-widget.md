# REP-20261007-037 — Pile di widget (F8)

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato; da provare sul tablet |
| Data | 2026-10-08, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Piano «Personalizzazione come Android» approvato in chat il 2026-10-07, fase F8. Extra scelto dall'utente: «Pile di widget». |
| Fonti | Pile di One UI: crea, modifica, rotazione automatica ([Samsung ANS10000945](https://www.samsung.com/us/support/answer/ANS10000945/)); creazione per trascinamento come le cartelle di Launcher3 (`DRAG_MODE_CREATE_FOLDER`, [Workspace.java](https://android.googlesource.com/platform/packages/apps/Launcher3/+/refs/heads/main/src/com/android/launcher3/Workspace.java)); consultate il 2026-10-07. |

## Modifiche

- **Modello:** `layout.stacks` con `{ ids, rotate? }`.
  - La pila occupa un posto della griglia con un id proprio (`stack_…`); i suoi widget non sono sulla griglia.
  - Funzioni in `layout.ts`: `stackWidgetsInLayout`, `unstackWidgetInLayout`, `setStackRotateInLayout`.
  - Nel controller: `stackWidgets`, `unstackWidget`, `setStackRotate`; le misure della pila sono quelle accettate da tutti i suoi widget.
  - Il validatore scarta le pile rotte.
  - Le liste delle pagine del vecchio formato contengono i widget della pila.
- **Creazione:**
  - trascinando un widget sopra il centro di un altro della stessa pagina (il 50 % centrale), quello si solleva con il bordo tratteggiato e l'etichetta «Crea pila» (o «Aggiungi alla pila»), e la copia dice «Rilascia per fare una pila»;
  - al rilascio nasce la pila (`useWidgetDrag`: `stackOn`; `LauncherScreen.onDrop`).
- **Uso** (`StackView.tsx`):
  - un widget alla volta, che si scorre col dito senza far girare la pagina;
  - puntini sotto;
  - con la rotazione automatica passa al successivo ogni 10 s, solo quando la pagina è visibile e fuori dalla modifica.
- **Modifica pila** (`StackSheet.tsx`, dalle Impostazioni della barra del widget):
  - elenco con «Togli dalla pila», che rimette il widget nella pagina;
  - interruttore «Rotazione automatica»;
  - una pila rimasta con un solo widget torna quel widget.
- **Cornice:** una pila di widget che hanno già la loro card (quelli della copertina) non aggiunge un'altra cornice.

## Verifiche

- **`LauncherStacks.test.tsx`:**
  - creazione, terzo widget aggiunto e liste del vecchio formato;
  - scomposizione e rotazione;
  - validatore;
  - riconoscimento al centro e non vicino ai lati nel trascinamento.
- **Prova a video:**
  - orologio trascinato sul centro della data: compare «Crea pila» e nasce una pila con due puntini, selezionata;
  - suite completa 1403/1403.

## Limiti

- **Pagine diverse:** la pila si fa solo con widget della stessa pagina.
- **Barra del widget:** non ha un comando «Aggiungi alla pila»; si usa il trascinamento.
