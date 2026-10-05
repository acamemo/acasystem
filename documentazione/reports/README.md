# Registro degli incarichi e report

Aggiornato: 2026-10-05. Stato corrente degli incarichi in [project-status.md](../project-status.md#incarichi-e-punto-di-ripresa).

| ID | Titolo | Funzione del report |
|---|---|---|
| [REP-20261002-001](REP-20261002-001-audit-product.md) | Audit del PRD originale | Lettura precedente, fatti verificati, valutazioni e decisioni aperte. |
| [REP-20261002-002](REP-20261002-002-documentazione.md) | Documentazione e storico Git locale | Incarico umano approvato, modifiche, controlli e punto di ripresa. |
| [REP-20261002-003](REP-20261002-003-organizzazione-cartelle.md) | Separazione di documentazione, backup e progetto | Riorganizzazione autorizzata, integrità dell'archivio e aggiornamento dei percorsi. |
| [REP-20261005-001](REP-20261005-001-direzione-pilota.md) | Direzione di prodotto e primo pilota in ufficio | Risposte umane, perimetro della fase 1, decisioni e verifiche documentali. |
| [REP-20261005-002](REP-20261005-002-moduli-documentali-design.md) | Moduli funzionalità e design | Separazione documentale, specifica dello stile e controlli dei nuovi percorsi. |
| [REP-20261005-003](REP-20261005-003-raccolta-componenti-microinterazioni.md) | Raccolta componenti e microinterazioni | Sette originali, catalogo, temi e interazioni confermati; conservazione e verifiche documentali. |

## Regole

Usare il [modello](../templates/report.md) per un nuovo intervento significativo. Gli ID hanno data ISO compatta e numero progressivo di tre cifre nella data, mai riutilizzato. Un report nuovo apre un incarico soltanto se riproduce una richiesta umana: un'idea di un agente non è un incarico.

Compilare perimetro e criteri all'avvio; aggiornare durante il lavoro; chiudere dopo verifica e revisione. Le correzioni minime richiedono un resoconto proporzionato e non un report artificiosamente esteso.

Per riprendere un lavoro consultare stato corrente, report relativo, richiesta ed eventuali decisioni intervenute; confrontare le affermazioni con il diff reale. Gli altri report sono storico, non istruzioni di esecuzione. Il modello esatto va indicato solo se disponibile.

Un report chiuso conserva risultati e limiti alla data della chiusura. Eventuali rettifiche sono annotate con data e nuova evidenza. Git identifica il commit che ha aggiunto o modificato il report; non inserire un hash futuro nel file stesso.
