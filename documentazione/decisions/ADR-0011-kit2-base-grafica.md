# ADR-0011 — Kit 2 (soft UI) come base grafica dell'app; kit Metallo conservato

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0011 — Kit 2 come base grafica dell'app |
| Stato | Accettata |
| Data e autore | 2026-10-07; scheda di Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Decisore e autorizzazione | Utente committente, chat del 2026-10-07: «usiamo kit 2 come base, mi piace, lasciamo salvato il kit originale, ma sviluppiamo l'app sul kit 2, lo preferisco». |
| Collegamenti | REP-20261007-007 (Kit 2), REP-20261007-006 e ADR-0010 (kit componibile), ADR-0006 e ADR-0007 (Metallo), ADR-0004 |
| Sostituisce / sostituita da | Sostituisce ADR-0006 e ADR-0007 per la direzione grafica dell'app. Il kit Metallo resta nel repository come alternativa conservata. Restano valide la struttura componibile (ADR-0010) e le regole di accessibilità. |

## Contesto ed evidenze

Il 2026-10-07 l'utente ha confrontato in `#/ui-kit` il kit Metallo e Kit 2, una soft UI sul modello delle reference neumorphism, e ha preferito Kit 2.

## Decisione

- Le nuove interfacce e l'evoluzione dell'app usano Kit 2: fondo e accento derivati, tema chiaro e scuro, stato «acceso» incassato con inchiostro d'accento.
- Il kit Metallo (`themes/acasystem`) non viene cancellato e resta consultabile.
- Restano in vigore:
  - la composizione per famiglie (ADR-0010);
  - i contrasti ≥ 4,5:1 per il testo e ≥ 3:1 per le icone;
  - le aree di tocco di 44 px e la riduzione del movimento.
- Il modo della migrazione (pelle Kit 2 delle stesse famiglie oppure nuove primitive) e il suo ordine sono incarichi successivi da approvare.

## Conseguenze

`design.md`, i test del kit e la galleria vanno aggiornati con la migrazione. Fino ad allora l'app in esercizio mostra ancora il kit Metallo.

## Verifiche e revisione

Gli esiti stanno nei report di migrazione. Rivedere dopo la prova sul tablet del pilota (contrasto del soft UI con poca luce, ISSUE-030 per i colori relativi).
