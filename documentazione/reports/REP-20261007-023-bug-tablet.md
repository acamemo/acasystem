# REP-20261007-023 — Bug dal tablet: pulsante principale premuto e pannelli in orizzontale

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato; da riprovare sul tablet |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, due schermate dal tablet in rete locale: «Salva il profilo» con bordi chiari e un rettangolo scuro al centro; «Aggiungi un widget» in orizzontale con una fascia vuota sotto «Annulla» e l'elenco ridotto a poco più di una riga. |

## 1. Pulsante principale premuto

Causa, riprodotta nell'anteprima con la classe `.is-active`: nella pelle Kit 2 la regola generica della pressione (`fx-press` + `:not(:disabled)`, specificità 0,5,0) prevaleva su quella del pulsante principale (0,4,0). Il primario premuto riceveva la coppia incassata grigia e bianca dei pulsanti normali sopra la faccia d'accento. Sul tablet lo stato premuto resta visibile per tutto il tocco.

Correzione in `themes/kit2/skin.css`: la regola del primario premuto ha lo stesso peso, con `:not(:disabled, [aria-disabled='true'])`, ed è dichiarata dopo. Verifica: ombre `inset` d'accento (`oklch(0.493 0.24465 284)` / `oklch(0.753 0.1398 264)`).

## 2. Pannelli in orizzontale

Le misure del pannello sono risultate corrette nell'anteprima: il contenuto riempie la faccia all'85% dell'altezza. Ipotesi sul tablet, non verificata sul dispositivo:
- Android dichiara la barra di navigazione come `env(safe-area-inset-bottom)`, che si sommava a 1,5em di margine inferiore;
- in orizzontale, con le barre del browser, l'altezza utile è di circa 370 px CSS, e l'85% lascia poco all'elenco.

Correzione in `themes/acasystem/components.css`:
- margine inferiore `max(1.25em, env(safe-area-inset-bottom))` invece della somma;
- sotto i 40rem d'altezza, faccia fino a `100dvh - 0.75rem` e margini di 1em.

Verifica: a 800 × 380 il pannello passa da 323 a 368 px, con margini di 16 px.

## Verifiche

Lint dei colori, vitest 1341/1341 e build verdi. Banco `sha256:6f47e95e64557ade43ecf837b7575751415172e60a40131fba52e2da893d8820`. Da confermare sul tablet.
