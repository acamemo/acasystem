# ADR-0002 — Separazione di documentazione, backup e progetto

| Campo | Valore |
|---|---|
| Stato | Accettata |
| Data | 2026-10-02 |
| Decisore | Utente committente nella chat di progetto |
| Autorizzazione | «la cartella in cui siamo, vogliamo fare una cartella di documentazione, una cartella di backup e una cartella di progetto effettivo?» |
| Scelte esecutive | Nomi `documentazione/`, `backup/`, `progetto/`; istruzioni e repository Git mantenuti nella radice. |
| Collegamenti | [ADR-0001](ADR-0001-documentazione-e-storico.md), [REP-20261002-003](../reports/REP-20261002-003-organizzazione-cartelle.md) |
| Sostituisce / sostituita da | Nessuna; integra ADR-0001 aggiornando i percorsi documentali. |

## Contesto ed evidenze

Prima dell'intervento il repository conteneva `docs/`, `product.md` in radice e due commit locali. Nessun codice applicativo era presente. La richiesta umana introduce tre aree distinte per documentazione, copie di backup e futuro progetto.

## Decisione

Trasferire `docs/` in `documentazione/` e `product.md` in `documentazione/product.md`, mantenendone il nome. Preservare i byte dell'originale in `documentazione/archive/product-original-2026-10-02.md` e i due commit iniziali.

Predisporre `backup/` e `progetto/` con README che ne precisano uso e stato. Versionare il solo README di `backup/`; escludere le copie locali dallo storico. In radice restano `README.md`, `AGENTS.md`, `.gitignore`, `.gitattributes` e `.git/`, così le istruzioni si applicano anche al futuro codice.

La separazione delle aree è richiesta dall'utente; nomi e collocazione delle istruzioni sono scelte esecutive dell'agente. Non viene approvata una tecnologia applicativa, una strategia di backup o un sistema di distribuzione.

## Alternative e motivazioni

Mantenere `docs/` e il PRD in radice avrebbe richiesto meno spostamenti. Raccogliere tutti i documenti in `documentazione/` rende visibili le tre aree richieste. Spostare anche Git e `AGENTS.md` in `progetto/` separerebbe il futuro codice dalle istruzioni e dallo storico documentale; si mantiene un unico repository nella radice.

## Conseguenze e limiti

Collegamenti, attributi Git e percorsi operativi sono aggiornati. I report chiusi conservano i comandi e i risultati storici, con annotazioni datate sul trasferimento. L'archivio originale rimane una fonte versionata e immutata.

Le cartelle `backup/` e `progetto/` sono predisposte. Non esistono ancora copie di sicurezza, prove di recupero, codice o servizi operativi.

## Verifiche e revisione

Integrità dell'archivio, collegamenti, identificativi, esclusioni e perimetro sono controllati nel [report](../reports/REP-20261002-003-organizzazione-cartelle.md). Le future modifiche della struttura devono aggiornare percorsi e fonti correnti, preservando evidenze e storico.

### Aggiornamento della collocazione — 2026-10-05

Su richiesta umana la documentazione comprende [funzionalità](../funzionalita/README.md) e [design](../design/README.md), con il PRD in funzionalita/product.md. Rimangono un unico repository in radice e le tre aree documentazione, backup e progetto. Riorganizzazione e verifiche in [REP-20261005-002](../reports/REP-20261005-002-moduli-documentali-design.md).
