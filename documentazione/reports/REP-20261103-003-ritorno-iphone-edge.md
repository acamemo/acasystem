# Ritorno da iPhone a Edge e recupero del profilo

| Campo | Valore |
|---|---|
| ID | REP-20261103-003 |
| Stato | Recupero dell'accesso confermato; rilascio immediato iPhone non confermato, limite aperto in ISSUE-140 |
| Data | 2026-11-03, Europe/Rome |
| Autore / modello | Codex; nome esatto non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta | «Sì, ha funzionato. Poi adesso ho chiuso l'app dal browser del telefono e non mi fa vedere più quella da edge.» |
| Perimetro | Diagnosi del passaggio inverso del profilo esclusivo, letture e prova isolata, memoria del collaudo. Nessuna variazione della regola di secondo piano, takeover o nuovo deploy. |

## Obiettivo e criteri

Verificare il ritorno telefono→PC, distinguendo mancato rilascio immediato, scadenza e ripresa dell'interfaccia. Preservare le487 voci Git preesistenti, dati e sessioni. Criteri: riportare esattamente azione e riscontro dell'utente; provare la direzione inversa con l'app reale isolata; distinguere causa osservata da ipotesi; conservare eventuali limiti senza attribuirli automaticamente al browser. Sorgenti applicativi e banco invariati.

## Riscontri umani

L'utente conferma **PC→iPhone riuscito** dopo chiusura della scheda Edge. Sul ritorno precisa: **«ho chiuso la scheda aca, il browser chiuso anche e sono tornato alla home del telefono»**. Non era soltanto una dichiarazione di app in secondo piano.

Alla richiesta di lasciare ACA chiuso sull'iPhone per3minuti, poi premere Riprova in Edge, risponde **«Si aprono i widget»**. Quindi il recupero dell'accesso PC è confermato. Non sono stati misurati sul dispositivo l'istante di rilascio/scadenza o la ricezione della richiesta; il risultato è compatibile con la scadenza di sicurezza, non ne dimostra da solo la causalità. Il rilascio immediato su iPhone non è confermato. Tavano trascinato e persistenza delle modifiche non sono verificati da questa risposta.

## Verifiche ed evidenze

Banco ACA0.9.38/r99 running/healthy; HA e D1 continuano a essere attivi. Nessuna lettura di credenziali, ispezione del database personale, UI automatizzata o modifica del banco.

Il collaudo REP024 copriva PC→telefono e nuovo PC bloccato, ma non chiudeva poi il telefono. Aggiunta una sola prova inversa sul bundle production0.9.38.99 immutabile con app React completa, FakeHA/SQLite in memoria e due contesti Chromium separati: **3passiPASS**,2client/1profilo, zero erroriJS/comandi fisici.

Telefono titolare; PC bloccato anche dopo Riprova; chiusa solo la pagina telefono, DELETE di rilascio ricevuto200; PC acquisisce dopo3031ms dalla risposta server ed è pronto dopo3364ms dalla richiesta di chiusura. Ingresso automatico senza Riprova dopo la chiusura. Evidenze in backup/rep026/qa-reverse-close-results.json e qa-reverse-close-handoff.md; node --check dei due scriptPASS, server fermato e porta verificata non raggiungibile.

Questo è Chromium con viewport/user agent iPhone, non Safari o una chiusura del browser mobile dal selettore. Non identifica la causa dell'attesa reale né prova l'affidabilità del rilascio su iOS. Nessuna simulazione aggiuntiva TTL eseguita.

## Limiti tecnici e valutazioni

La riserva ACA dura180s dall'ultimo rinnovo accettato e si rinnova ogni20s. Pagehide tenta il rilascio con fetch keepalive; resta best effort. Un titolare realmente chiuso e non più rinnovato non mantiene il blocco oltre la scadenza; una scheda ancora aperta che continua a rinnovare rimane titolare secondo ADR-0037.

Documentazione consultata il2026-11-03: [MDN pagehide](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event) descrive casi mobili in cui l'evento non avviene; [MDN Request.keepalive](https://developer.mozilla.org/en-US/docs/Web/API/Request/keepalive) descrive la prosecuzione della richiesta oltre l'uscita dalla pagina. Da questi limiti si inferisce che keepalive non garantisce l'avvio del gestore né la consegna dopo una terminazione del processo. Non dimostrato che questo sia accaduto sul telefono dell'utente, che riferisce anche chiusura della scheda. I180s sono una politica ACA, non una regola Safari.

Lettura del coordinatore individua anche un rischio distinto di ripresa durante un'acquisizione già in corso: pageshow può essere ignorato mentre claimingUsage>0, poi il vecchio risultato viene scartato lasciando checking. Analisi e riproduzione in RAM riferite dall'agente; nessuna nuova regressione persistente o prova browser indipendente di questo caso nel presente incarico. Non attribuirlo all'incidente reale, in cui Riprova ha consentito il recupero. Proposta di approfondimento collegata a ISSUE-139, senza codice applicativo.

## Chiusura e punto di ripresa

Recupero confermato in entrambe le direzioni, con attesa nel ritorno reale iPhone→Edge. Nessuna modifica al codice o deploy: il limite del rilascio immediato resta aperto in ISSUE-140; non dichiarare un passaggio sempre immediato o il collaudo generale concluso. Nessuna modifica automatica al comportamento in secondo piano o takeover. Prossimo risultato applicativo ancora da confermare: Tavano conserva la destinazione scelta. Eventuali miglioramenti del rilascio mobile richiedono diagnosi ed evidenze pertinenti, senza promettere eventi di chiusura garantiti dal browser.


## Annotazione successiva, 2026-11-03 — correzione richiesta e confermata

La successiva richiesta esplicita di correggere il cambio senza attesa180s è attuata in [REP004](REP-20261103-004-cambio-dispositivo-immediato.md)/ADR0038. Hotfix0.9.38/r100 installato, prova reale utente **«Sì, entra in pochi secondi»**. ISSUE-140 risolta per questo flusso; limiti senza segnale o prima presenza distinti. Preservati sopra il riscontro iniziale e l’attesa della versione r99.
