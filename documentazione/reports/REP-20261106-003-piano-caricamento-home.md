# REP-20261106-003 — Piano di caricamento e ingresso della Home

| Campo | Valore |
|---|---|
| Stato | Piano completato e consegnato; implementazione non avviata |
| Data | 2026-11-06, Europe/Rome |
| Autore | Codex; nome esatto del modello non disponibile |
| Base Git | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`,580voci preesistenti modificate/non tracciate |
| Richiesta | «bene procedi a realizzare il piano per questa funzionalità», dopo [l'analisi REP002](REP-20261106-002-analisi-caricamento-home-e-widget.md). |
| Autorizzazione | Redazione del piano e relativi collegamenti/documenti; nessuna implementazione, installazione o pubblicazione. |

## Obiettivo e criteri

Produrre un [piano eseguibile](../riprogettazione/caricamento-home-piano.md) per unificare l'attesa di primo ingresso/ricaricamento e mostrare la prima pagina stabile con ingresso coerente. Definire prerequisiti, stati, cache/identità, errori, ritentativi, risorse lente, animazione, compatibilità con i futuri widget e verifiche. Preservare il vetro confermato dall'utente, profili, bozze, uso esclusivo e comandi.

Le scelte del piano sono proposte esecutive da valutare per l'implementazione. Non promuovere la richiesta di scrivere il piano ad autorizzazione del codice. Nessuna nuova API/schema/dipendenza, rifacimento dei widget o cache ottimistica inclusi implicitamente. Fonti: analisi REP002 e relativi sorgenti; [ADR-0046](../decisions/ADR-0046-apertura-widget-come-finestra.md), [continuità del vetro](REP-20261106-001-continuita-blur-ritorno-home.md).

## Lavoro e verifiche

Redazione del piano con controlli indipendenti di architettura e casi limite. Principi di chiarezza e divulgazione progressiva della guida docs-generator, adattati alle regole documentali del progetto; nessun tool aggiuntivo o bootstrap necessario per scrivere Markdown.

Il piano definisce quattro consegne: checkpoint/misure; coordinamento dei segnali esistenti; preparazione misurabile, loader e ingresso; collaudo e consegna locale. Primo lotto con loader circolare, senza skeleton dettagliati o nuova persistenza. Fonti e proiezione esistenti restano autorevoli; l'analisi dei costi precede qualunque ottimizzazione ulteriore di API/cache.

Parametri proposti espliciti: comparsa loader150ms senza durata minima, ingresso24px/280ms senza scala, ridotto120ms, uscita loader96ms concorrente, feedback attesa10s e budget risorse locali3s con fallback stabile. Sono scelte del piano, non tempi già implementati o misure di prestazione.

Le revisioni hanno chiarito: generazione visuale distinta dall'autorità dei dati; retry mirato che conserva concessioni e aggiornamenti validi; ingresso diretto Sistema/Casa; misura corrente durante resize del fade; focus di Riprova rimosso; differenza tra mappe vuote ricevute, snapshot mai ricevuto e fallimento catalogo. Per il primo catalogo fallito il piano propone recupero prima della Home pronta, rendendo esplicita questa scelta rispetto al fallback silenzioso attuale. Il piano non cambia ancora tale comportamento.

Review finale senza rilievi residui (`backup/rep052/home-loading-plan-review.json`), successiva alle correzioni; prima review architetturale indipendente incorporata. Il documento distingue stati già presenti, proposte e collaudi futuri, preserva vetro e intro esistente da non sommare, e resta compatibile con il successivo lavoro sui singoli widget. Nessun nuovo ADR di scelta approvata o requisito dichiarato implementato.

| Controllo eseguito | Esito |
|---|---|
| Revisione di coerenza con REP002 e codice corrente | Superata; note integrate e verifica finale senza rilievi residui. |
| Sorgenti pubblicabili |1793file, SHA `d14bde1e803e6366e95798ba477a8343abbf5d21f0e916191ee6f6145bfc5499`, invariato. Evidenza `backup/rep053/source-invariance.json`. |
| Collegamenti e artefatti documentali |600link nel controllo finale, nessuno interrotto; integrità degli artefatti nativi PASS. Evidenza `backup/rep053/docs-check-final.log`. |
| Whitespace dei documenti pertinenti | Senza errori, soli avvisi CRLF/LF. |
| Test/build di prodotto e prestazioni | Non eseguiti: incarico documentale. Tutti i collaudi del piano restano futuri. |

## Chiusura

Piano completato nel [documento operativo](../riprogettazione/caricamento-home-piano.md), collegato a indice, mappa dei flussi, design come proposta e diario. Nessun lavoro di redazione resta aperto. Il successivo incarico potrà autorizzarne l'implementazione; nessuna modifica applicativa, installazione, aggiornamento del banco, commit o pubblicazione effettuati.
