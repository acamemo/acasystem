# REP-20261113-001 — Aggiornamento banco PC con tutti i widget

| Campo | Valore |
|---|---|
| ID | REP-20261113-001 |
| Stato | Completato; banco .70/r99 aggiornato e verificato |
| Data | 2026-11-13, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta e autorizzazione | «aggiorna il banco con tutti i widget». Aggiornare il solo ACA locale alla build completa .70 già verificata; backup e breve riavvio necessari, account e profili conservati. Nessuna pubblicazione. |

## Obiettivo e perimetro

Installare sul banco ACA3002 tutte le famiglie fino a [REP-20261112-002](REP-20261112-002-widget-rimanenti.md). Fonte2003file/SHA e6bbfae7, ZIPfrontend50f9a648; baseline banco .57/r99 sha256:ecec625ab377b9ced7811b647e43062748b605f2603f3d3b945b14e99158417e. HA e D1 conservati, niente reset o login effettuato dall'agente. Cambi Git precedenti preservati. I riferimenti funzionali/design sono REQ-18/19, ADR-0049 e i brief delle famiglie; operazioni secondo infrastructure.md. Pubblicazione, nuovi comportamenti, installazioni e dipendenze escluse.

## Criteri di completamento

- Ricontrollare SHA di fonte, ZIP e QA .70; tutti i widget completati presenti.
- Derivare l'immagine dal runtime locale verificato senza npm ci, aggiornando frontend e contratti necessari; backend, Casa3D e dipendenze conservati.
- Backup freddo verificato prima del cambio immagine, SQLite e identità confrontate senza esporre credenziali; rollback immagine pronto.
- Ricreare solo ACA con stessi volumi, ambiente e rete; HA/D1 stessi container e avvii.
- Health .70, casa pronta, asset HTTP identici al pacchetto, accesso anonimo PC e LAN. Verifica autenticata/telefono fisico distinta.
- Documentare comandi, limiti, esiti e nuova catena di avvio/rollback.

## Avanzamento e modifiche

Ricontrollati indipendentemente tutti2003sorgenti, ZIPweb110file e QA .70 finale20/12/20. Tutte le famiglie .58–.70 presenti senza rimozioni. Il runtime della .57 è riusabile:165file backend,417Casa3D e7manifest/lock/Docker invariati (589file); i contratti productDevice.ts e widgetIdentity.ts richiedono invece aggiornamento. Copiati tutti10contratti nella stessa immagine, senza modificare il backend.

`build-verified-base.mjs` deriva la nuova base dal tag .57 verificato `sha256:eac96d854b431800c39b4c74f3ad602086400bd6a9d7276049e01ad47f68aa8b`, rete build disabilitata, nessun npm ci o installazione. Sostituisce soltanto frontend/dist e contracts con byte approvati, conservando le layer di base. Successivo `prepare.mjs --version 0.9.70 --revision 99` prepara localmente lo strato HAOS/client e gli asset, senza pubblicare o installare su HAOS. Genera il bundle desktop/Android del medesimo frontend.

SHA canonico `captureSourceSnapshot`2003file `e4568e06bda10210627e61ce34c9767e50caa12d4d9b5365e68d1f2ffc0be10c`; SHA storico REP082 `e6bbfae7e72a5c310841b1ceb0600e06131e7dff9e88346ef998478adbeac0b2`. Sono algoritmi distinti sullo stesso inventario verificato, non una modifica della fonte approvata. Immagine finale `sha256:ba95dc5352c752de41ffee79e125a258395135c486a4963d6eb26f165112a1d2`; frontend entry index-BSAaFA0x/SHA50bf822a,110file esatti.

Prima dell'aggiornamento: ACA.57healthy internamente/casa ready, ma nessuna porta3002 effettivamente pubblicata dopo l'avvio Docker pur avendo già i binding127.0.0.1 e192.168.1.37 nella configurazione. La ricreazione autorizzata del solo ACA ripristina quei binding esistenti; non cambia indirizzi/firewall. HA e D1 non riavviati.

Arrestato ACA, creata e verificata la copia fredda, confrontate tutte27tabelle, poi ricreato con il solo override immagine/versione della .70. Stessi mount/ambiente/rete, confronto Compose sull'intero servizio dopo la sostituzione dei soli due valori. Rollback immagine .57 pronto ma non applicato. Nessuna cancellazione o ripristino dei dati.

## Verifiche ed evidenze

| Controllo | Procedura realmente eseguita | Esito e limiti |
|---|---|---|
| Provenienza | ZIP REP082/inventario, verifica indipendente e prepare --check |2003sorgenti esatti,10contratti correnti; nessun source app cambiato.|
| Immagine | node backup/rep083/build-verified-base.mjs; node progetto/ha-app/prepare.mjs --version 0.9.70 --revision 99 |Base52795089, wrapperba95dc53; runtime conservato,0installazioni.|
| Audit immagine | node backup/rep083/audit-image.mjs |228file di runtime/contratti/frontend conformi e110frontend esatti; avvio smoke senza rete e senza mount domestici,health .70/index esatto. Test sorgenti esclusi come già previsto da .dockerignore.|
| Backup | Backup-WidgetBank.ps1 dopo stop ACA |219244byte/SHA `345a86adf2425df144391e190d4074edd3d12bd6762e4bdba3d796fae5c48b5c`, estrazione e integrity_check ok; segreto tecnico escluso.|
| Dati | sqlite-snapshot.mjs/ops-audit-backup.mjs/verify-data.mjs |27/27tabelle identiche originale/copia/live,0nuove colonne. Nessun bisogno di tolleranza seen_at.|
| Operazioni | Update-WidgetBank.ps1; ops-audit-preservation.mjs |6/6controlli PASS: archivio, copia, live, identità/mount, fingerprint, health/setup. HA/D1 stessi ID/immagini/StartedAt/mount; account HA3identità e credenziali/fingerprint invariati.|
| HTTP | node backup/rep083/probe-bank.mjs |PC eLAN:health .70,casa ready,index eJS identici al pacchetto .70,APIv2 senza autenticazione401.|
| UI anonima | node backup/rep083/qa-bank-anonymous.mjs |1366/390:Accedi visibile,nessun timeout/overflow/errorJS/richiesta extra;0login/0comandi,browser privati chiusi. Screenshot dopo animazioni visionato dal root.|

I tentativi negativi dei verificatori sono conservati: mancato stdin nel primo docker run, poi confronto erroneamente esteso ai test backend non distribuiti (esclusi dal Dockerfile tramite .dockerignore). Corretti i verificatori prima di modificare il banco; nessuna discrepanza nei file runtime distribuiti. Controllo AST PowerShell ha intercettato un apostrofo tipografico prima dell'esecuzione; versione corretta validata. La prima screenshot UI era durante l'ingresso animato: ripetuta a fine animazioni, senza modifica applicativa.

Il bundle client generato localmente include anche Casa3D:3451441byte/SHA22f0852be0b01e76063d579b26d68873046777ffa353ed075f42eb2c5be485b8; distinto dal ZIPsoloFrontend. Le prove funzionali .70 già eseguite sono nel REP082 (286dedicati e QA20/12/20).4FAILstorici di suite generale, lint7/tipografia1 non diventano regressioni dell'aggiornamento; nessun PASSgeneraleCI inventato.

## Controllo del diff e decisioni

Soltanto nuovi materiali operativi locali in backup/rep083, generati HAOS/client in out/.70.99 e fonti documentali pertinenti. Nessuna modifica dei sorgenti applicativi o della configurazione domestica. Runtime congelato con contratti correnti è scelta esecutiva dell'aggiornamento autorizzato, non nuovo stack. Pubblica .34 invariata; nessun push/commit o pubblicazione.

## Avvio, rollback e prova

[Infrastruttura](../infrastructure.md) contiene la catena completa di22file. Solo ACA:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml -f backup/rep059/compose-message-local.yaml -f backup/rep060/compose-states-local.yaml -f backup/rep061/compose-startup-local.yaml -f backup/rep063/compose-catalog-local.yaml -f backup/rep064/compose-trackpad-local.yaml -f backup/rep065/compose-repeat-local.yaml -f backup/rep066/compose-space-local.yaml -f backup/rep067/compose-direct-local.yaml -f backup/rep068/compose-reveal-local.yaml -f backup/rep069/compose-placement-local.yaml -f backup/rep083/compose-widgets-local.yaml up -d --no-deps --no-build --pull never tunet
```

Rollback immagine con i dati correnti: rimuovere soltanto l'ultimo override rep083/compose-widgets-local.yaml, conservare tutti21precedenti fino a rep069/compose-placement-local.yaml e usare lo stesso comando. Nessun ripristino automatico dei volumi. Copia a freddo in `backup/rep083/cold-bank-pre-0.9.70/`, segreto tecnico nel volume separato conservato.

## Chiusura e punto di ripresa

Completato: bancoACA.70/r99running/healthy,casa ready, account/profili/identità e tutte27tabelle conservati, HA/D1 invariati. [PC](http://127.0.0.1:3002/) e [LAN](http://192.168.1.37:3002/) disponibili, Ctrl+F5 per ricevere il frontend nuovo. Usare l'account già presente, senza ricrearlo.

Nessun incarico software residuo in questo aggiornamento. Login umano autenticato, funzionamento dei dispositivi reali, iPhone/Android fisici e prestazioni GPU restano distinti: la prova browser è anonima con viewport mobile, non è un collaudo hardware. Backend e nuovi widget hanno le verifiche già registrate nei report di famiglia.
