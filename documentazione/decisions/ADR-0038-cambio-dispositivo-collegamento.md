# ADR-0038 — Cambio dispositivo dopo chiusura del collegamento ACA

| Campo | Valore |
|---|---|
| Stato | Richiesta umana accettata; implementata sul banco0.9.38/r100 e passaggio iPhone→Edge confermato dall’utente |
| Data / autore | 2026-11-03, Codex; nome esatto del modello non disponibile |
| Fonte umana | «Ok, sistemiamo il cambio dispositivo: quando chiudo ACA sull’iPhone voglio poterlo usare subito da Edge sul PC, senza aspettare 3 minuti.» |
| Relazione | Integra [ADR-0037](ADR-0037-uso-esclusivo-profilo-e-posizioni.md): uso esclusivo e background collegato rimangono; la chiusura rilevata del trasporto non attende più soltanto180s. |
| Evidenza | [REP-20261103-004](../reports/REP-20261103-004-cambio-dispositivo-immediato.md), ISSUE-140; caso iniziale distinto ISSUE-139. |

## Contesto ed evidenze

Il passaggio reale iPhone→Edge è riuscito dopo richiesta di attesa3min/Riprova; non sono state registrate le richieste Safari. La baseline isolata sul bundle0.9.38/r99 riproduce una causa sufficiente: scartare il rilascio DELETE alla chiusura del telefono lascia il PC bloccato oltre7s anche con Riprova, mentre la connessione SSE del telefono termina. Oggi la centrale non associa quella connessione alla riserva d’uso.

## Richiesta e scelta esecutiva

La richiesta umana assegna il recupero rapido, senza autorizzare una cessione forzata dal titolare ancora collegato. Scelta tecnica dell’implementazione: identificare ogni SSE mediante autenticazione HA e usageSessionId dell’istanza, mantenuto solo in RAM e inviato in intestazione. Associazione account/client/login/istanza, mai client generico o solo nome dispositivo.

Più stream della stessa istanza contano separatamente. Quando termina l’ultimo, la centrale programma il rilascio dopo3s. Riconnessione della stessa istanza entro la grazia annulla il rilascio. Una normale richiesta HTTP di rinnovo, o un vecchio callback di chiusura, non deve cancellare/prolungare da sola la scadenza del trasporto interrotto. Ogni timer controlla la concessione corrente; rotazioni e subentri non permettono a vecchi stream di liberare un successore diverso.

Rilascio esplicito pagehide esistente conservato con propria grazia3s. Una nuova concessione richiede rilettura autorevole prima dell’uso. Editor e comandi mantengono i controlli server e il fencing; nessuna nuova autorizzazione HA, revoca di login o coda di azioni fisiche.

Una scheda in secondo piano con collegamento vivo mantiene l’uso. Se il sistema sospende il documento e interrompe anche quel collegamento, non è possibile distinguere perfettamente sospensione e chiusura: la centrale può liberare il profilo e l’istanza ripresa deve riverificare il possesso. Non viene rilasciato per il semplice evento visibilitychange/hidden. Una perdita silenziosa senza chiusura rilevata del trasporto resta coperta dal fallback180s; non promettere tempi garantiti in assenza di qualsiasi segnale di disconnessione.

## Alternative considerate

Ridurre soltanto il TTL e aumentare tutti i rinnovi accelera l’attesa ma rende il PC in background dipendente da timer frequenti; non usa il segnale di chiusura già osservato. Dipendere solo da pagehide/keepalive ripete il limite riprodotto. Una challenge con passaggio per assenza di risposta cambierebbe il comportamento di un collegamento ancora apparentemente vivo; non introdotta in questo incarico. Un comando manuale di takeover o una nuova schermata di uscita non sono assegnati.

## Conseguenze e verifiche

Nessuna nuova dipendenza, persistenza di presenza o modifica dei token HA. SSE legacy senza identificazione rimane compatibile con il fallback precedente. Nuovi client inviano l’identità dell’istanza anche mentre attendono il profilo: uno stream del follower non mantiene viva la riserva del titolare.

Verificare chiusura con DELETE perso, normali chiusure e reload, connessione in background, più stream e altre schede, callback tardivi, riconnessione entro/fuori grazia, ripresa durante acquisizione e rifiuto delle vecchie concessioni. Prove browser e dati reali restano distinti; esiti e limiti nel report. Stato non promosso a collaudato su Safari prima della prova fisica.


## Esito, 2026-11-03

[REP004](../reports/REP-20261103-004-cambio-dispositivo-immediato.md): backend744PASS/1skip, frontend51+18 disgiunti, QA6PASS con DELETE perso→3471ms. Hotfix locale0.9.38/r100 installato con backup/dati verificati e HA/D1 invariati. Alla prova reale l’utente conferma «Sì, entra in pochi secondi». Termini soft/hard sovrapposti usano la prima scadenza osservata, senza ripartire o prolungare l’attesa. Restano i limiti di rete/sospensione e il caso iniziale prima del primo SSE; nessuna pubblicazione.
