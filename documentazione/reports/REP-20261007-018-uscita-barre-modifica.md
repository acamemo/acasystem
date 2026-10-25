# REP-20261007-018 — Uscita animata delle barre di modifica

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07: «sì, anima anche l'uscita delle barre» (limite segnalato in REP-20261007-017). |

## Modifiche

- `EditToolbar.tsx`: nuova proprietà `hidden`, che aggiunge la classe `aca-edit-toolbar--hidden` e rende la barra `inert` e `aria-hidden`.
- `LauncherScreen.tsx`: la barra di modifica resta montata e riceve `hidden={!editMode}`. Durante lo spostamento con i comandi da tastiera viene ancora sostituita da `WidgetPositionControls`.
- `edit.css`: le barre usano transizioni invece dell'animazione d'ingresso.
  - Entrando in modifica salgono in 360 ms (la copertina 40 ms dopo). Uscendo scendono sotto lo schermo in 240 ms, in dissolvenza.
  - Con il movimento ridotto c'è solo la dissolvenza.
- `footerBand.ts`:
  - una barra nascosta non toglie spazio all'indicatore;
  - il piè di pagina si rimisura anche quando cambia la classe della barra.
- `pages/ui-kit`: un pulsante fa entrare e uscire le barre di prova.
- `__tests__/EditToolbarHidden.test.tsx`: 3 test nuovi.

## Verifiche

Typecheck, lint, lint dei colori, vitest 1338/1338 e build verdi. Anteprima locale, stati finali con le transizioni disattivate: in modifica `transform: none`, opacità 1; fuori dalla modifica 76 px più in basso, opacità 0, barra nascosta. Banco `sha256:06874c6c83acf861c9ee293b79d4b7b3c47123e3d73b52a3f1d993c9b9b99b42`, healthy.
