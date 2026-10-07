# ADR-0010 — Kit Metallo componibile per famiglie di classi

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0010 — Kit Metallo componibile per famiglie di classi |
| Stato | Accettata |
| Data e autore | 2026-10-07; scheda di Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Decisore e autorizzazione | Utente committente, chat del 2026-10-07: «dobbiamo creare […] il nostro kit aggiungendo prima una base che da il design o una sua variante, refrattorizzare il più possibile per combinarli come si fa su Tailwind, cioé se io combinassi le classe base + button + animation-press ad esempio mi da un pulsante di un certo tipo […] in maniera tale che se abbiamo la cosa che funziona, non dobbiamo riscrivere inutilmente il codice e possiamo intervenire direttamente sulla parte interessata». Perimetro scelto dall'utente: «Kit + galleria»; termometro «Sì, regolabile». |
| Collegamenti | ADR-0004, ADR-0006, ADR-0007; REP-20261007-004, REP-20261007-005, REP-20261007-006; REQ-03 |
| Sostituisce / sostituita da | Nessuna; estende ADR-0006 per la struttura delle classi del materiale. |

## Contesto ed evidenze

Il kit componeva già `aca-m` con `aca-m--{press|static|well}`, `aca-m--{pill|circle|rounded|card}`, `aca-m--{sm|md|lg}` e alcuni modificatori. `aca-m--press` univa però rilievo, animazione di pressione, luce di hover e stato di selezione da ARIA. Riquadro, tasto tondo, termometro, barra e stato «acceso» esistevano solo nel CSS dei prototipi (`pages/ui-kit/uiKit.css`), quindi non erano riusabili.

## Decisione

Il materiale si compone da famiglie indipendenti; un elemento prende al più una classe per famiglia:

| Famiglia | Classi |
|---|---|
| Base | `aca-m` |
| Rilievo | `aca-raised` (predefinito), `aca-well`, `aca-well-soft` |
| Forma | `aca-pill`, `aca-circle`, `aca-rounded`, `aca-square`, `aca-card` |
| Misura | `aca-sm`, `aca-md`, `aca-lg`, `aca-xl` |
| Tono | `aca-tone-primary`, `aca-tone-quiet`, `aca-tone-danger` |
| Animazione | `aca-fx-press`, `aca-fx-hover-light`, `aca-fx-wiggle` |
| Stato | `aca-on`, `aca-current`, `aca-selected`, `aca-error` |
| Componente | `aca-button`, `aca-tile`, `aca-slider` (orizzontale/verticale, con o senza pomello), `aca-meter`, e i componenti esistenti |

Le classi `aca-m--*` restano come alias delle nuove finché l'app non è migrata (incarico separato). Le primitive React compongono le stesse classi.

## Alternative e motivazioni

- Riscrivere direttamente i selettori `aca-m--*`: meno classi, ma non separa animazione, stato e design.
- Utility Tailwind generiche: il materiale a strati (socket, guscio, faccia) non si esprime con utility singole.

## Conseguenze

Una correzione su una famiglia vale per tutti gli elementi che la usano. Durante la transizione convivono classi nuove e alias. Test del kit e galleria verificano le combinazioni.

## Verifiche e revisione

Esiti in REP-20261007-006. Rivedere quando la migrazione dell'app rimuove gli alias.
