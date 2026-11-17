# ADR-0037 — Uso esclusivo del profilo e posizioni adattive

| Campo | Valore |
|---|---|
| Stato | Accettata dalla richiesta umana; implementata e verificata nel software, banco0.9.38 aggiornato; riscontro fisico distinto |
| Data / autore | 2026-11-03, Codex; nome esatto del modello non disponibile |
| Fonte | Segnalazione Tavano che torna al punto iniziale; precisazione «lo sposto nella stessa pagina» e successiva richiesta di bloccare l'altro dispositivo sullo stesso profilo. Alla domanda sul PC in secondo piano: «Sì: il profilo si libera chiudendo ACA o la scheda». |
| Relazione | Precisa ADR-0035/0036: stessa configurazione personale e griglia adattiva rimangono; l'uso contemporaneo del profilo su più dispositivi è sostituito da uso esclusivo. |
| Evidenza | [REP-20261103-001](../reports/REP-20261103-001-spostamento-widget-live.md). |

## Decisione umana

La griglia e le dimensioni dei widget si adattano allo schermo. Lo spostamento manuale nella stessa pagina deve poter conservare il punto scelto, invece di tornare alla prima cella libera. L'ordine comune resta deterministico; una preferenza di posizione relativa consente spazi vuoti senza salvare pagine duplicate per formato o provocare scritture per una sola rotazione.

Il profilo può essere usato da un solo dispositivo/istanza ACA alla volta. L'altro mostra esattamente:

> questo profilo è in uso su un altro dispositivo chiudi le altre sessioni per usare questo dispositivo

Il PC in secondo piano mantiene l'uso. Chiudere ACA o la scheda libera la riserva; non occorre revocare l'accesso personale o eliminare l'account. Alla successiva concessione si rilegge la configurazione autorevole prima di consentire azioni. Questo modifica il precedente collaudo simultaneo PC/telefono: i contenuti restano condivisi, l'uso alterna i dispositivi.

## Scelte esecutive entro il perimetro

Riserva d'uso distinta da quella di editing: proprietario verificato per account, client e istanza in RAM, ID di concessione nuovo per impedire rinnovi/rilasci tardivi. Rinnovo periodico anche in secondo piano; rilascio autenticato best effort alla chiusura. Una scadenza di sicurezza di180secondi, rinnovata ogni20, evita blocchi permanenti dopo crash, arresto o perdita di rete. Una pagina ripresa dopo sospensione deve riverificare il possesso prima di riabilitare comandi o modifiche.

L'interfaccia bloccata non monta i comandi del profilo; operazioni ACA controllate e salvataggi verificano la concessione lato server. La riserva non cambia i permessi HA né introduce un'autorizzazione su strumenti HA esterni ad ACA. Non sostituire il proxy WebSocket o lo stack nel presente intervento.

Il rilascio per uscita dalla pagina usa una breve grazia di3secondi: il vecchio permesso viene invalidato subito; nello stesso client/login HA il documento ricaricato può riacquisire prima degli altri. A fine grazia l'evento di disponibilità permette il passaggio agli altri client. Questo distingue il ricaricamento dalla perdita accidentale del profilo a favore di un telefono già in attesa; non permette di prendere il posto di una pagina ancora attiva. Rilasci, rinnovi e timer vecchi non alterano la concessione successiva.

Bozze e risposte incerte rimangono conservate. Il blocco non avvia comandi fisici differiti, takeover automatico, logout degli altri dispositivi o cancellazione di configurazioni. Verifiche software/browser e aggiornamento del banco seguono il report; nessuna nuova pubblicazione implicita.

## Integrazione successiva, 2026-11-03

La richiesta esplicita di cambio iPhone→Edge senza attesa180s avvia [ADR-0038](ADR-0038-cambio-dispositivo-collegamento.md) e [REP004](../reports/REP-20261103-004-cambio-dispositivo-immediato.md): presenza per istanza e rilascio dopo breve grazia dalla chiusura dell’ultimo collegamento. Uso esclusivo e background con collegamento vivo rimangono; il fallback180s non è più l’unico recupero del pagehide perso. Esiti e limiti nel nuovo report, senza riscrivere le prove precedenti.
