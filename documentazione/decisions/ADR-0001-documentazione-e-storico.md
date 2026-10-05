# ADR-0001 — Documentazione evolutiva, storico locale e continuità degli incarichi

| Campo | Valore |
|---|---|
| Stato | Accettata |
| Data | 2026-10-02 |
| Decisore | Utente committente nella chat di progetto |
| Richiesta | Implementazione del piano «Documentazione, storico e continuità tra agenti AI». |
| Evidenza | Scelte umane: «Documento evolutivo», «Software e cloud», «Git locale subito»; successiva richiesta «PLEASE IMPLEMENT THIS PLAN». |
| Report | [REP-20261002-002](../reports/REP-20261002-002-documentazione.md) |
| Sostituisce / sostituita da | Nessuna |

## Contesto

Il repository iniziale conteneva soltanto il PRD, senza Git. Il committente richiede storico, progettazione ordinata, documentazione dell'infrastruttura e continuità tra modelli AI, evitando modifiche non richieste.

## Decisione

Conservare `product.md` come specifica evolutiva e archiviare una copia originale immutata. Distinguere obiettivi, decisioni autorizzate, stato effettivo ed evidenze. Usare Git locale per i diff, ADR per le scelte significative e report per incarichi e risultati. Il registro di conformità riguarda software/cloud; le installazioni fisiche restano separate.

L'incarico umano, riprodotto nei report, delimita le modifiche. Gli agenti possono completare autonomamente quanto richiesto; le estensioni restano proposte fino ad autorizzazione identificabile. Il cambio di modello non modifica il perimetro.

## Alternative considerate

| Alternativa | Valutazione |
|---|---|
| PRD originale immutato come unico obiettivo | Non scelta dall'utente: preferita una specifica evolutiva con copia storica. |
| Un solo documento per requisiti, problemi e cronologia | Respinta come organizzazione: mescola informazioni con cicli di aggiornamento diversi. |
| Solo report datati senza Git | Non scelta dall'utente: necessario anche lo storico esatto dei diff. |
| Conformità estesa alle installazioni fisiche | Non scelta per questa fase: ambito limitato a software/cloud. |

## Conseguenze e limiti

Le modifiche significative richiedono un aggiornamento documentale proporzionato e verifiche del diff. I documenti correnti collegano le evidenze senza duplicare tutti gli stati. Le copie originali e le motivazioni storiche sono preservate.

Non viene approvata alcuna sostituzione dello stack o installazione di servizi. Non è introdotta una CI, una certificazione di conformità o una protezione tecnica automatica contro modifiche fuori incarico.

## Verifica e futura revisione

Verifiche di accettazione in [verification.md](../verification.md), evidenze nel report collegato. Per modificare il processo, registrare l'autorizzazione umana e un ADR sostitutivo; preservare questa decisione.

## Annotazione del 2026-10-02 — Organizzazione delle cartelle

[ADR-0002](ADR-0002-organizzazione-cartelle.md) integra la collocazione dei documenti: il PRD è ora `documentazione/product.md` e l'archivio è in `documentazione/archive/`. Le regole e le motivazioni di questa decisione restano valide; il contenuto dell'originale e i commit iniziali sono preservati.

### Aggiornamento della collocazione — 2026-10-05

La successiva richiesta umana separa i moduli funzionalità e design. Il PRD corrente è in [funzionalita/product.md](../funzionalita/product.md), con [design.md](../design/design.md) come fonte visiva distinta. Archivio e regole dello storico restano validi; l'indicazione precedente descrive la collocazione alla data di ADR-0002. Evidenze in [REP-20261005-002](../reports/REP-20261005-002-moduli-documentali-design.md).
