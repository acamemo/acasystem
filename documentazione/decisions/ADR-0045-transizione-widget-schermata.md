# ADR-0045 — Transizione condivisa dal widget alla schermata

| Campo | Valore |
|---|---|
| Stato | Modello geometrico e dissolvenze superati da ADR-0046 su successiva richiesta umana; percorso condiviso conservato |
| Data e autore | 2026-11-05, Codex; nome esatto del modello non disponibile |
| Decisore e autorizzazione | Richiesta umana nella chat: «rendere questa animazione generica dei widget» e «i contenuti che non fanno parte del widget si riducono a opacity 0 mentre quelli che fanno parte del widget da 0 passano a 1 e viceversa». Fonte conservata in [REP001](../reports/REP-20261105-001-transizione-generica-widget.md). |
| Collegamenti | [ADR-0004](ADR-0004-principi-frontend.md), [ADR-0016](ADR-0016-schermo-intero-interazioni.md), [brief](../design/componenti/widget-schermata.md) |
| Sostituisce / sostituita da | Nessuna decisione integralmente sostituita; successivamente [ADR-0046](ADR-0046-apertura-widget-come-finestra.md) sostituisce il volo dalla tessera e le fasi visive, senza cambiare la precedenza dei comandi o la navigazione speciale |

## Contesto ed evidenze

L'utente apprezza espansione e ritorno di Tavano. Nella baseline .46 la Home rimane visibile sotto la schermata e il contenuto entra dopo il completamento della geometria. Il registro contiene nove Console dedicate, 16 Details e quattro definizioni senza dettagli.

## Decisione e realizzazione

Usare la shell condivisa per tutte le schermate di dettaglio già disponibili. Coordinare la dissolvenza della Home con espansione del guscio e ingresso del contenuto, invertendo il percorso alla chiusura. Il paesaggio e i materiali restano stabili. Conservare Back, focus, precedenza dei menu interni, scorrimento e variante per movimento ridotto.

La scelta esecutiva usa Console con contenuto dedicato oppure Details conservati. Riutilizza i token di 280/200ms per la geometria, 160ms per il contenuto e 120ms per il movimento ridotto. Non crea schermate per le quattro definizioni prive di dettagli; non modifica comandi diretti, associazioni, apertura della stanza configurata o flusso discovery.

## Alternative e motivazioni

Una correzione soltanto Tavano lascerebbe percorsi di apertura differenti e duplicati. Si riusa la shell esistente anziché aggiungere un'altra infrastruttura di animazione o una libreria. I contenuti Details vengono vincolati a una colonna scorrevole leggibile, preservandone campi e controlli.

## Conseguenze e verifiche

**Precisazione esecutiva, 2026-11-05 — [REP005](../reports/REP-20261105-005-transizioni-widget-fotogrammi.md):** successivo incarico umano di perfezionare apertura/ritorno mediante fotogrammi. Confermata la scelta condivisa; corretto il piano che conteneva una fotografia deformata e l'intervallo fra le dissolvenze. Budget Console280/200ms e movimento ridotto120ms conservati; Home ora si sovrappone al contenuto negli ultimi160ms e torna in200ms senza ritardo. La destinazione segue il box reale dopo reflow, senza nuova API o infrastruttura. Non è un aggiornamento del banco.

Cambiano presentazione e ciclo di vita della transizione; API, account, profili e dati persistenti restano invariati. L'installazione sul banco e la pubblicazione richiedono un incarico distinto. [REP001](../reports/REP-20261105-001-transizione-generica-widget.md) registra test, fotogrammi intermedi, correzioni emerse e limiti hardware; il numero di widget nel registro non equivale a un collaudo fisico di ogni integrazione.
