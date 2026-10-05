# ADR-0005 — Migrazione progressiva, italiano e mx-icons

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0005 — Migrazione progressiva, italiano e mx-icons |
| Stato | Accettata nell'ambito descritto |
| Data e autore | 2026-10-05; redatta da Codex |
| Decisore e autorizzazione | Utente: «iniziamo allora con la migrazione di questa interfaccia?» dopo la proposta TypeScript; «le nuove interfacce […] dovranno essere in Italiano»; chiarimento icone «si npm install mx-icons». |
| Collegamenti | REQ-03; [ADR-0004](ADR-0004-principi-frontend.md), [report](../reports/REP-20261005-006-migrazione-home-typescript.md), [design](../design/design.md) |
| Sostituisce / sostituita da | Nessuna; integra ADR-0003/0004. |

## Contesto ed evidenze

Tunet è prevalentemente JS/JSX; l'audit rileva uno strato incompleto di primitive. La schermata richiesta comprende header/data/ora, navigazione, toolbar/menu e HOME vuota. Il sistema conserva stato, configurazioni e accesso HA del banco locale.

## Decisione umana

Avviare la migrazione progressiva a TypeScript dalla schermata indicata, rispettando i tre gruppi di primitive. Le nuove interfacce devono essere in italiano. Usare mx-icons per le icone dei componenti migrati; non sostituire automaticamente tutte le icone delle schermate precedenti.

## Alternative e motivazioni

La migrazione progressiva proposta e poi richiesta conserva le integrazioni esistenti. Non è stata richiesta una riscrittura integrale, la migrazione del backend o l'introduzione di un nuovo framework. Italiano è lingua iniziale ACA; le preferenze linguistiche già salvate restano selezionabili e la sessione del banco viene impostata in italiano attraverso la UI.

## Conseguenze

Contratti strict nella porzione migrata, JS ammesso al confine e controlli esistenti conservati. mx-icons 1.1.2 aggiunto con versione esatta; parser Babel per il lint TSX come scelta esecutiva, senza aggiornare versioni preesistenti. La traduzione italiana viene completata per le schermate migrate: il dizionario parziale usa inglese come fallback per il codice legacy. Questo non dichiara l'intera applicazione tradotta.

Grafica attuale conservata per isolare la migrazione; nuove icone e testi sono gli adattamenti richiesti. Neumorphism, palette ACA e microinterazioni fisiche restano nel successivo incarico di design. Nessuna scelta dell'infrastruttura di produzione.

## Verifiche e revisione

Tipi, lint, build, regressioni e browser nel report collegato. La licenza MIT del pacchetto icone è verificata nella fonte, mentre condizioni di distribuzione e notice complessive restano nel registro di conformità. L'adozione non garantisce che tutti gli export dichiarati dal pacchetto esistano: l'icona profilo usata è stata verificata nella build.
