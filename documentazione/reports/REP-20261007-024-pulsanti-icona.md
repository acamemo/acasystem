# REP-20261007-024 — Pulsanti solo icona uniformi (chiudi e indietro)

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, con le schermate dal tablet della «×» del pannello «Aggiungi un widget» e della freccia indietro di Sistema: «lasciare il design come è stato impiegato per la topbar, in maniera tale da avere solo l'icona e lo stesso stile con stesso effetto in hover». |

## Modifiche

- `.aca-bar-button` passa da `statusBar.css` al kit (`themes/acasystem/components.css`) come pulsante solo icona condiviso:
  - 44 px, senza bordo;
  - hover con l'accento, pressione con una scala morbida, anello di focus;
  - selettori anche con le classi di anteprima (`.is-hover`, `.is-active`, `.is-focus`), come le altre regole del kit.
- Lo usano la «×» dei pannelli (`Sheet.tsx`), la «×» delle finestre (`Modal.tsx`) e la freccia indietro di Sistema (`SystemLayout.tsx`), oltre a Modifica e Sistema nella barra in alto. Nomi accessibili invariati.
- Test `PolishCornice` legge la regola dal kit.

## Verifiche

Typecheck, lint, lint dei colori, vitest 1341/1341 e build verdi. Anteprima locale: «×» del foglio della galleria senza sfondo né ombra, alta 44 px. Banco `sha256:cd413525cf5acb8bc573514e41c855532846972856f32942a8164baaeac8f995`.
