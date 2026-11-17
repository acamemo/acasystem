# REP-20261109-001 — Aggiornamento banco PC con i gesti del catalogo

| Campo | Valore |
|---|---|
| Stato | Completato: banco0.9.47/r99 installato e verificato; rifinitura successiva in REP002 |
| Data | 2026-11-09, Europe/Rome |
| Autore | Codex; nome esatto del modello non disponibile |
| Base Git |5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69;614voci preesistenti conservate |
| Richiesta e autorizzazione | L'utente chiede «aggiorna anche il banco sul PC con queste modifiche, mantenendo account e profili, così posso provare i nuovi gesti nell'app reale». Autorizza l'aggiornamento locale necessario, con backup e breve riavvio ACA. Nessuna pubblicazione richiesta. |

## Obiettivo e perimetro

Installare sul banco PC il codice già verificato fino a [REP-20261106-007](REP-20261106-007-catalogo-widget-solo-gesti.md), compresa la preparazione Home e i gesti del catalogo: ingresso con dissolvenza, swipe orizzontale e chiusura verso il basso senza pulsanti. Preservare account, profili, identità HA e tecnica, volumi e bozze dei browser. Nessuna nuova funzione, modifica dei widget, reset, recupero account o migrazione volontaria.

Procedura locale Docker da [infrastruttura](../infrastructure.md), con build verificata, backup freddo, audit prima/dopo e rollback all'immagine .46 corrente. Nuova versione locale prevista0.9.47/r99; pubblica0.9.34 invariata. Non si applica il deploy SSH generico: il target è il banco locale già identificato, senza nuovo server o nuove dipendenze.

## Criteri di completamento

- Nuova immagine e bundle corrispondono al fingerprint dei sorgenti verificati, senza chrome dimostrativo nella radice dell'app reale.
- Backup freddo nuovo e verificato prima della sostituzione; rollback preciso disponibile.
- Solo ACA aggiornato; account/profili e segreto tecnico conservati, HA e D1 non ricreati durante il rollout.
- Health/versione, manifest e stato della casa corretti; controlli browser in sola lettura e istruzioni per provare con l'account esistente.
- Configurazione LAN coerente con l'indirizzo attuale del PC; nessuna esposizione aggiuntiva al di fuori di loopback e LAN locale.

## Avvio e osservazioni

Fingerprint indipendente corrente1815file/SHA `ca1e5d712e6b337fd3504cc9dfb87dbb46fefe0bf5ca57afc1a285b8abf2ccea`, uguale a REP007. Rispetto alla .46 conservati backend165file, contratti9 e Docker/manifest/lock8. Ultimo stato documentato banco .46/r99, nove file Compose con override rep044.

All'avvio dell'incarico il daemon Docker non risponde e Docker Desktop non è in esecuzione. Installazione per utente individuata in AppData/Local/Programs/DockerDesktop; nessuna reinstallazione necessaria. Wi-Fi ora192.168.1.37, diverso dal binding .11 documentato: predisporre override locale coerente dopo aver rilevato i container effettivi. Avvio del runtime necessario alla ripresa del banco, distinto dal successivo aggiornamento del solo ACA.

Evidenze nuove in `backup/rep058/`; nessun helper storico con digest/IP fissi viene eseguito senza adattamento. Esiti di build, backup e conservazione da registrare dopo l'esecuzione.

## Verifiche e chiusura

Banco aggiornato al wrapper locale `sha256:012ba32e3aa80dc4e8a5f95024f79d2c277a9b9db513cdf82e737be13099526f`, base `sha256:aaeb5ec9d8dea1a9bb2245ee170d1ec8bb3a674078654ff475ea1de27c7f58a6`. Sorgenti1815/SHAca1e5d71 invariati prima/dopo, nessuna modifica applicativa. Build/versione0.9.47, manifest minServer0.9.47/minShell0.1.0, webZIP3371632byte/SHA `d291bb02d64072c12e8b74619f0a21d0c203780c7a187190c785a09c0536326c`.

Il primo build standard aveva introdotto una patch Alpine/APK inattesa: scartato dal rollout, con pacchetto e negativi in `backup/rep058/attempt1-runtime-drift/`. Il candidato accettato usa una **ricetta derivata locale**, distinta dal Dockerfile standard nello snapshot: builder Node vincolato alla revisione precedente, runtime .46 esatto, sostituzione completa di frontend/dist e casa3d/dist,0installazioni runtime. Input, hash della ricetta e180file di backend/contratti/manifest invariati in `frozen-build.json`. Audit7checksum,1815sorgenti,117file runtime e127web PASS; tutte7versioni e19APK identiche alla .46. Nessuna nuova dipendenza o modifica dello stack. Nessun push.

Backup freddo verificato `backup/rep058/cold-bank-pre-0.9.47/aca-data-pre-0.9.47.tgz`,249316byte/SHA `6553857d04f97ff432ddd57a4105b32211b8ba9f4ae1047c765d831bab0fc53f`; segreto tecnico nel volume separato non incluso. Estratto e confrontato con lo snapshot: integritàok e27/27tabelle identiche anche dopo l'avvio della .47,0colonne nuove. Identità dei3utenti HA/provider e hash del segreto tecnico uguali. HA/D1 sono ripartiti con Docker all'inizio; **fra baseline successiva all'avvio e rollout ACA** conservano ID/immagine/ora di avvio e mount. Solo ACA ricreato, stessi volumi. Sei controlli operativi PASS in `ops-preservation-audit.json`; nessun ripristino o reset dei dati.

Eseguiti `build-base.mjs` per il primo tentativo, poi `backup/rep058/build-frozen-base.mjs` e `ha-app/prepare.mjs --version 0.9.47 --revision 99 --base-image aca-system:0.9.47`; audit effimeri senza rete/dati reali prima del gate. Updater `Update-AcaGesturesBank.ps1` con backup e `--no-deps --no-build --pull never tunet`, rollback .46 predisposto. Health .47 e casa ready confermati su loopback/LAN. Nessuna modifica a .env, firewall o profilo di rete Windows; il programma Docker dispone già delle regole sulla rete corrente. Nuovi binding limitati a127.0.0.1 e192.168.1.37.

QA: gesti con lo stesso bundle in sito statico isolato,0HA/API/WS/errori e identità simulate84→84. Banco reale anonimo su1366/390 mostra «Accedi», casa ready e stesso JS/SHA del candidato (`index-Cgnlrrcs.js`);0login/submit/mutazioni/WS e nessun chrome demo. Screenshot390 visionato dal coordinatore. Non è un nuovo collaudo autenticato o fisico iPhone/Android. Handoff/sigillo in `backup/rep058/qa-final-*`; fixture e server statico temporaneo chiusi, banco lasciato healthy.

Installazione .47 conclusa. Durante la consegna l'utente richiede una rifinitura del messaggio di preparazione lenta: prosecuzione esplicita in [REP002](REP-20261109-002-preparazione-lenta-messaggio-centrato.md), senza perdere il backup o le verifiche di questa versione intermedia. Pubblica0.9.34 e installer nativi invariati.
