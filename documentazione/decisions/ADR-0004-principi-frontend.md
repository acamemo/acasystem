# ADR-0004 — Primitive e composizione delle interfacce

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0004 — Primitive e composizione delle interfacce |
| Stato | Accettata, limitatamente ai principi esplicitati dall'utente |
| Data e autore | 2026-10-05; scheda redatta da Codex |
| Decisore e autorizzazione | Utente committente, risposta durante l'audit: «ordinamento dei componenti in primitive […] tipografia […] layout […] e divisione delle pagine o interfacce che sfruttano le nostre primitive principalmente + eventuali componenti realizzati per quella pagina e condivisi per quella singola pagina». |
| Collegamenti | REQ-03, [report di audit](../reports/REP-20261005-005-audit-struttura-tunet.md), [design](../design/design.md), [architettura](../architecture.md) |
| Sostituisce / sostituita da | Nessuna; integra ADR-0003 senza sostituire la base HA/Tunet. |

## Contesto ed evidenze

L'utente chiede di valutare Tunet rispetto ai propri principi prima di stabilire l'infrastruttura. Tunet 1.22.1 contiene componenti riutilizzabili ma molte interfacce definiscono direttamente HTML e stile; confronto ed evidenze nel report.

## Decisione umana

La futura UI ACA deve essere composta principalmente mediante primitive condivise organizzate in tre gruppi:

1. **Componenti:** elementi base del sistema, per esempio pulsanti, card e contenitori, coerenti con lo stile ACA.
2. **Tipografia:** elementi testuali HTML rappresentati attraverso i componenti del sistema.
3. **Layout:** griglie, disposizione flex e composizione strutturale condivisa.

Le pagine/interfacce compongono queste primitive e possono includere componenti specifici riutilizzati nella stessa pagina. Una primitiva non contiene conoscenza di entità, autenticazione o servizi Home Assistant; questo confine è la lettura esecutiva proposta per preservare il carattere condiviso degli elementi e resta da concretizzare nel progetto UI.

## Alternative e motivazioni

Il confronto richiesto è tra l'organizzazione tecnica attuale di Tunet e i principi umani sopra riportati. L'utente attribuisce priorità al proprio modello di composizione. Non sono state confrontate o adottate nuove librerie, convenzioni FSD/Atomic Design, nomi di cartelle o strategie dello stato.

## Conseguenze

I principi sono il criterio degli incarichi UI successivi e degli audit. La loro registrazione non autorizza un refactor applicativo; la richiesta corrente riguarda l'analisi. La futura infrastruttura sarà indicata dall'utente. Eventuali nomi, API delle primitive, tipi, dipendenze e migrazione dovranno essere esplicitati e verificati nell'incarico pertinente.

## Verifiche e revisione

Verificare composizione delle schermate, riuso dei gruppi, coerenza stilistica e confinamento dei componenti specifici nelle rispettive pagine. Tunet attuale è parzialmente allineato nel riuso UI e disallineato per tipografia/layout primitivi e composizione prevalente; controlli eseguiti e limiti nel report. Conservare questo ADR in caso di sostituzione esplicita.
