# REP-20261007-015 — Barra di stato nascosta sulla copertina, entra dall'alto sulle pagine

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07: «la barra fluttuante in questione però in copertina non la lasciamo, la facciamo partire da principale in poi, facendola comparire dall'alto con un animazione una volta arrivati sulla pagina con tutti i +». |

## Modifiche

- `StatusBar.tsx`: nuova proprietà `hidden`. Quando è attiva la barra ha la classe `aca-status-bar--hidden`, è `inert` e `aria-hidden`: niente focus da tastiera, niente lettura dallo screen reader.
- `LauncherScreen.tsx`: `hidden` è attivo sulla copertina, tranne in modalità modifica, dove la barra serve per «Fine».
- `statusBar.css`:
  - sulla copertina la barra è sopra il bordo dello schermo, trasparente;
  - arrivando su una pagina di widget scende in 360 ms con un ease-out marcato, mentre in uscita sale in 240 ms;
  - con il movimento ridotto c'è solo una dissolvenza;
  - lo spazio della barra resta riservato, così la griglia non si sposta.
- `__tests__/StatusBarHidden.test.tsx`: 2 test nuovi.

## Verifiche

Typecheck, lint, lint dei colori, vitest 1335/1335 e build verdi. Banco `sha256:e34e0fb3b43cb94cadd9d25f3c2f614cfc08f52d26e009646f5461bf01e2d733`, healthy. Non verificato a vista: il launcher richiede l'accesso.
