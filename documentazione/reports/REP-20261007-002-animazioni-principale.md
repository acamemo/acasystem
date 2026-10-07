# REP-20261007-002 — Revisione delle animazioni della «Principale» (emil-design-eng)

| Campo | Valore |
|---|---|
| Stato | Completato; verifiche automatiche verdi, banco Docker non aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07: «usa emil-design-eng per rivedere le animazioni della Principale», poi «applica tutte le righe, anche sul kit». |
| Autorizzazione | Tutte le righe della revisione, incluse le durate del kit Metallo (`material.css`, ADR-0007). Esclusi: nuove dipendenze, commit, aggiornamento del banco. |

## Modifiche

- **Kit** (`themes/acasystem/material.css`): token `--aca-ease-out`, `--aca-ease-in-out`, `--aca-press` (120 ms), `--aca-release` (220 ms). Le transizioni di socket, guscio, faccia e contenuto passano da 250–300 ms `ease` a 200–220 ms con ease-out marcato; durante `:active` / `.is-active` la durata scende a 120 ms (pressione rapida, rilascio più morbido). Vale per tutta l'applicazione.
- **Launcher** (`templates/launcher/launcher.css`):
  - l'hover delle schede non incassa più la faccia: lieve ombra in più, solo con `(hover: hover) and (pointer: fine)`;
  - la pressione dell'apertura dettagli usa `--aca-press`;
  - riposizionamento dei widget a 240 ms ease-in-out;
  - wiggle in modifica ridotto a ±0.25° e 320 ms, in pausa durante il trascinamento e sulla scheda puntata o col focus;
  - «+» delle celle in hover a 1.06 (era 1.12);
  - la sagoma trascinata entra con `@starting-style` (rotazione, scala 0.98, opacità in 150 ms).
- **Indicatore di pagina**: pallina a 220 ms (era 300).
- **Tastiera**: `LauncherScreen` registra la modalità di input su `<html data-aca-input>`; con la tastiera gli spostamenti dei widget non hanno transizione e il `Pager` cambia pagina senza scorrimento animato.
- `prefers-reduced-motion` resta invariato; aggiunta l'assenza di transizione per la sagoma.

## Verifiche

`npm run typecheck`, `npm run lint`, `npm run lint:theme-colors`, `vitest run` (1281/1281) e `vite build` verdi. Una prima esecuzione completa aveva 4 timeout di test sotto carico (passati isolati e nella riesecuzione completa) e un fallimento di `MetalMaterial.test.jsx` sulla regola dei selettori `:active`, corretto spostando il caso `:has([data-widget-open]:active)` in `launcher.css`.

Non eseguito: anteprime nel browser, prova sul banco Docker e su tablet fisico. La percezione dei tempi va confermata a occhio.

## Punto di ripresa

Ricostruire l'immagine del banco per provare le animazioni sul tablet; eventuali ritocchi dei tempi agiscono sui token `--aca-press` e `--aca-release`.
