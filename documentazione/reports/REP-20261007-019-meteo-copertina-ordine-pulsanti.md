# REP-20261007-019 — Meteo in copertina e ordine dei pulsanti di modifica

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, con le schermate della copertina e della barra di modifica: «aggiungi widget meteo» e «ordiniamo così: icona + Widget, icona + Pagina e icona impostazioni Pagina». |

## Modifiche

- **Meteo in copertina** (`pages/cover/CoverWeather.tsx`, nuovo, nello strato delle pagine perché usa i modelli dei widget; stili in `components/system/cover/coverCards.css`):
  - terza card con l'icona della condizione nel colore d'accento, la temperatura arrotondata grande e scura come il numero del calendario, la condizione d'accento e il nome della fonte;
  - fonte: `weather.home` o `weather.forecast_home` se presenti, altrimenti la prima `weather.*` per id;
  - senza fonte meteo, o fuori dal launcher, la card non compare;
  - con tre card i lati si riducono, così la riga resta su una sola linea;
  - l'icona prende l'accento da un contenitore, perché il componente icona scrive `color: currentColor` inline.
- `hooks/launcher/WidgetRuntimeContext.tsx`: `useOptionalWidgetRuntime()`.
- **Barra di modifica** (`EditToolbar.tsx`): ordine «+ Widget», «+ Pagina», impostazioni «Pagina».
  - Testi visibili brevi, contenuti nei nomi accessibili, che restano invariati: «Aggiungi widget», «Nuova pagina», «Pagina».
  - Nuova pagina usa l'icona «+».
- `pages/ui-kit`: la copertina d'esempio ha una fonte meteo simulata.
- Test: `CoverWeather.test.tsx` (3 nuovi); `PolishCornice` aggiornato a ordine e testi.

## Verifiche

Typecheck, lint, lint dei colori, lint tipografico, vitest 1341/1341 e build verdi. Anteprima locale: tre card in riga, icona del meteo d'accento (`oklch(0.573 0.233 279)`). Banco `sha256:8fe42fedcd63d8c185872c655581df71cf2febd6fa3ec33dcefb8851d1fe01d8`, healthy. Non verificato: la fonte meteo reale di Home Assistant del banco.
