# REP-20261007-036 — Aspetto del widget: cornice e trasparenza (F7)

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-08, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Piano «Personalizzazione come Android» approvato in chat il 2026-10-07, fase F7. Extra scelto dall'utente: «Aspetto del widget». |
| Fonte | Impostazioni del widget di One UI, colore e trasparenza ([Samsung ANS10000945](https://www.samsung.com/us/support/answer/ANS10000945/)); consultata il 2026-10-07. |

## Modifiche

- **Impostazioni del widget → Aspetto:**
  - «Cornice» sì/no;
  - «Trasparenza dello sfondo»: Opaco, Leggera 25 %, Media 50 %, Alta 75 %.
- **Salvataggio:** nelle impostazioni della card, `appearanceFrame: false` e `appearanceOpacity`; senza valori resta il widget di prima.
- **Applicazione** (`WidgetHost.tsx`, `launcher.css`):
  - senza cornice il widget usa il riquadro semplice;
  - con la trasparenza la faccia mescola il fondo della pagina con il trasparente (`color-mix` in OKLCH, `--aca-widget-glass`);
  - il rilievo resta.
- **Quando si vede:** l'effetto si nota sopra uno sfondo (F9); sul fondo semplice la pagina ha lo stesso colore.

## Verifiche

- In `SystemSheets.test.tsx`: «Media» salva 50 e la cornice spenta salva `false`. Lint dei colori verde.
