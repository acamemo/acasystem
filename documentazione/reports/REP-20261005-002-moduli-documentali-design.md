# REP-20261005-002 — Moduli funzionalità e design

| Campo | Valore |
|---|---|
| Stato | Completato |
| Data | 2026-10-05, Europe/Rome |
| Autore / modello | Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `e7133999b6dd4b77f673d6bb5d8d327243cd3ba1` |
| Richiesta | Creare design.md e scindere la documentazione in due moduli, funzionalità dell'app e design, con cartelle dedicate e spiegazione dello stile adottato. |
| Autorizzazione | Riorganizzazione e redazione documentale, aggiornamento dei collegamenti e storico Git locale. Nessuna implementazione applicativa o installazione. |

## Obiettivo e perimetro

Creare `documentazione/funzionalita/` per product.md e pilot-scope.md, e `documentazione/design/` per design.md. Ogni modulo ha un indice dedicato. Stato, architettura, infrastruttura, conformità, verifiche, ADR, report, modelli e archivio restano comuni nella struttura esistente. Scelta dei nomi e collocazione dei documenti comuni: scelte esecutive interne all'incarico.

Descrivere Neumorphism e i colori richiesti `#222222`/`#ef8231`, distinguendo vincoli umani, spiegazioni, proposte e verifiche ancora da eseguire. Consolidare il dettaglio grafico in design.md. Working tree iniziale pulita; archivio originale immutabile.

## Criteri di completamento

- Due moduli con responsabilità, indice e percorso di lettura chiari.
- design.md spiega stile, colori confermati, uso proposto, stati dei controlli e verifiche previste.
- Requisiti REQ, AC e stati di realizzazione preservati; nessuna funzione aggiunta o dichiarata implementata.
- Collegamenti locali validi dopo gli spostamenti; aggiornamento delle regole e degli indici.
- Report storici preservati nei contenuti: eventuali aggiornamenti dei soli collegamenti hanno annotazione datata.
- Originale identico byte per byte e stesso SHA-256; futuro codice e backup invariati.

## Avanzamento e modifiche

Creati i due moduli con indici dedicati; trasferiti product.md e pilot-scope.md in funzionalita/ con percorsi verificati e `Move-Item` in PowerShell. Redatto design/design.md con stile, colori confermati, spiegazione, proposte di componenti e controlli ancora da eseguire.

Il dettaglio grafico prima presente nel pilota è consolidato in design.md; il pilota mantiene il perimetro e rimanda alla fonte visiva. Il PRD conserva i requisiti e collega la nuova specifica. Aggiornati README, AGENTS, collegamenti dei documenti comuni e del README del futuro progetto. Quel README è il solo file interessato in progetto/: nessun codice aggiunto.

ADR-0001/0002 ricevono note datate sulla collocazione corrente; la direzione di prodotto non cambia. Nel report chiuso REP-20261005-001 sono aggiornate soltanto le destinazioni dei link e aggiunta una nota datata; gli altri report storici restano invariati.

## Verifiche ed evidenze

| Controllo | Comando / procedura | Esito ed evidenza |
|---|---|---|
| DOC-14 | PowerShell e `node` in memoria; confronto byte con `git show 912ec16:product.md`, SHA-256, confronto righe REQ e stati con commit di partenza | Superato: originale di 20.910 byte integro; 18 righe REQ, ID REQ/AC e stati invariati. Hash identico a quello registrato. |
| DOC-15 | Validatore temporaneo di file Markdown, destinazioni e ancore; revisione degli indici e delle fonti | Superato: 28 Markdown, collegamenti locali validi; funzionalità e design hanno indici e responsabilità distinti. Nessuna verifica UI dichiarata completata. |
| DOC-16 | `git diff --check`, confronto dei quattro report preesistenti ignorando soltanto destinazioni dei link, ispezione di backup/ e progetto/, revisione del diff | Superato: report preservati nei contenuti storici, originale immutato, nessun codice o backup aggiunto. Il README del progetto cambia soltanto i due link trasferiti. |

Gli script sono eseguiti in memoria, senza aggiungere codice o CI al repository. Il controllo di link non verifica siti esterni né rendering Markdown; la revisione del percorso di lettura non è un test con un secondo agente. I calcoli dei colori sono ripresi dalle evidenze del report precedente e non costituiscono un nuovo collaudo UI. Verifiche applicative Non eseguite, fuori incarico. Registro comune in [verification.md](../verification.md#moduli-funzionalit%C3%A0-e-design--2026-10-05).

## Controllo del diff e decisioni

Diff revisionato: riorganizzazione, specifica di design, collegamenti, indici, regole ed evidenze pertinenti alla richiesta. Nessun nuovo comportamento, stack, ruolo o metodo d'installazione deciso. Il riferimento visivo e i due colori derivano dalle indicazioni umane del 2026-10-05; layout, font, componenti, librerie e implementazione restano da definire.

## Chiusura e punto di ripresa

Incarico documentale completato con verifiche superate, indice e stato aggiornati. Nessun incarico resta attivo. Restano aperti i dettagli del design e il perimetro esecutivo della fase 1; definire schermate e kit di componenti è il prossimo passo proposto, non un incarico assegnato. Nessun avvio di codice o installazioni.

Per il commit usare `git log -- documentazione/reports/REP-20261005-002-moduli-documentali-design.md`.
