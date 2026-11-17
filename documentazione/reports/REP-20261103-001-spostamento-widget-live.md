# Spostamento dei widget e uso esclusivo del profilo

| Campo | Valore |
|---|---|
| ID | REP-20261103-001 |
| Stato | Completato nel software e sul banco locale ACA0.9.38; riscontro fisico PC/iPhone distinto |
| Data | 2026-11-03, Europe/Rome |
| Autore / modello | Codex; nome esatto non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta umana | «da pc ho provato a spostare Tavano, non me lo fa spostare»; torna al punto iniziale, stessa pagina. |

## Obiettivo, autorizzazione e criteri

Correggere il ritorno del widget dopo il trascinamento, preservando le480 modifiche Git preesistenti, account/profili, dati, revisioni, editing e bozze. Banco iniziale ACA0.9.37 locale/r100 di REP-20261102-016. Nessuna nuova pubblicazione, tecnologia, attività VM o comando fisico.

Durante la diagnosi l'utente ha richiesto griglia e widget adattivi, ma profilo usabile da un solo dispositivo alla volta, con il messaggio esatto di [ADR-0037](../decisions/ADR-0037-uso-esclusivo-profilo-e-posizioni.md). Il PC in secondo piano continua a occupare; chiusura di ACA/scheda libera l'uso. Sostituito l'uso simultaneo precedente, mantenendo account e configurazione comuni. Aggiornamento del banco0.9.38 con backup e breve riavvio del solo ACA autorizzato separatamente: **«Sì, aggiorna il banco su questo PC»**.

Criteri: causa riprodotta; posizione persistente/adattiva senza duplicati o scritture per il solo formato; secondo dispositivo bloccato prima del montaggio widget; background senza rilascio; chiusura e ingresso con stato autorevole; concessioni superate incapaci di salvare o avviare nuovi comandi ACA protetti; regressioni, prova browser, provenienza artefatti e dati conservati.

## Causa e modifiche

Baseline isolata riprodotta: pressione prolungata, ghost e destinazione libera validi; Tavano unico torna a0,0, con tre widget viene ricompattato a4,0. Salvataggi/lease accettati, nessun erroreJS. moveInCommonOrder conservava soltanto la sequenza; projectCommonOrder ripartiva dalla prima cella. Non era un blocco speciale di Tavano né un errore del gesto.

Contratto, validatore e dominio launcher ora conservano suggerimenti normalizzati nello spazio disponibile della griglia. Proiezione con ordine, dimensioni adattive, assenza di sovrapposizioni e continuazioni locali; uno spostamento può lasciare celle precedenti vuote. Controller aggiornato per dimensioni della destinazione e trasferimento del suggerimento nelle pile. Nessuna pagina persistente creata per rotazione. Correzione delle pagine normali del modello comune: non estende ai percorsi virtuali/legacy Cover una nuova modalità di posizionamento libero.

Riserva d'uso distinta da login HA ed editing. POST profilo/usage, PATCH e DELETE usage verificano account, client, login HA e istanza in RAM; durata180s, rinnovo20s, nuovo ID a ogni acquisizione. Proof negli header x-aca-usage-session e x-aca-usage-lease, mai in URL o nuovo storage. Cambiare profilo dello stesso account non aggira un altro titolare. Rilascio/scadenza liberano editing; riavvio invalida i vecchi permessi. Unica aggiunta allo schema: usage_lease_id nullable negli intenti comando, per non eseguire un intento preparato da una concessione superata.

Gate prima di montare l'app, concessione e rilettura autorevole, messaggio/Riprova, bozze conservate e nessuna coda di comandi fisici. Rinnovo in secondo piano; ritorno visibile con concessione valida rinnova in posto, preservando editor/input. Pagehide/chiusura rilasciano best effort con autenticazione solo in RAM. Grazia server3s: vecchio proof invalido subito, stesso client/login può riacquisire durante reload, altro client dopo la grazia. Cleanup ordinari senza grazia; rilasci/timer tardivi non toccano il successore. Nessun takeover/logout.

Writer ACA profili/editing/comandi, facade dispositivi e Casa3D verificano il possesso. Proxy e permessi HA invariati: regola funzionale ACA, non nuovo confine di autorizzazione degli strumenti HA esterni. Automazioni HA indipendenti dalla finestra ACA.

## Verifiche effettive

Evidenze in backup/rep024/, con checkpoint dei sorgenti. Nessun accesso automatizzato al profilo Edge personale, credenziale acquisita o comando fisico.

| Area | Esito |
|---|---|
| Backend finale seriale | **731PASS/1skip,49filePASS**, usage-handoff-backend-full.log. Usage20/20 incluso nel totale; strict/lint PASS. |
| Frontend uso | Primo gruppo68PASS/5file; dopo preservazione editor al ritorno visibile60PASS/4file; dopo handoff49PASS/2file. Gruppi sovrapposti: non sommare. Copertura finale coordinator43, proof6, comandi8, rollback4, apiAuth9. Strict/lint PASS. |
| Posizioni | CommonOrder e CommonOrderController **14PASS**; common-order-tests-final.log. Lint sorgenti pertinenti PASS. |
| QA finale | **7scenariPASS**, due contesti Chromium,2client/1profilo, zero erroriJS/comandi fisici. qa-exclusive-position-results.json e qa-exclusive-final-summary.json; screenshot ispezionati. |
| Shell | Windows inoltra POST/PATCH/DELETE con proof/body; Android LocalServer Java JVM3/3PASS. Nessuna nuova build delle shell. |
| Build/provenienza | Strict/build web e Docker PASS; controllo UI senza segnalazioni. Audit indipendente7checksum,1744sorgenti,116file backend/contratti runtime e119asset ZIP=immagine. Smoke isolato health/manifest/HTML200, bootstrap anonimo401. |

QA: Tavano0,0→2,2 persiste al reload, suggerimento1/3,2/3, revisione3. Telefono già in attesa resta bloccato durante reload; PC riacquisisce in87ms. Rinnovo oltre20s osservato; telefono Riprova ancora423. Chiusa la sola scheda PC, telefono acquisisce dopo3012ms ed è pronto a3485ms: posizione adattata1,3 su griglia4×6, stessa revisione e nessuna pagina aggiuntiva. PC riaperto bloccato.

Anomalie iniziali conservate: corsa reload/telefono e ritorno visibile che chiudeva un editor valido, entrambe corrette prima della build. Test layout iniziale con griglia teorica invece di pageClass effettivo: corretta la fixture. Primo rilascio anomalo neutro dovuto alla chiusura dell'intero Context Playwright; contesto esplicito con chiusura scheda/navigazione consegna keepalive. Nessun beforeunload aggiunto.

Suite frontend/lint generali non dichiarati verdi: ISSUE-134 preesistente distinto. Chromium headless con altra scheda aperta riporta ancora ACA visibile/focalizzata: rinnovo continuo provato, minimizzazione fisica non provata. Unit test hidden→visible senza rilascio/perdita editor. Safari/iPhone/Android fisici e arresto forzato processo/proxy non collaudati: keepalive best effort e scadenza180s necessari.

## Artefatti e banco aggiornato

Output progetto/ha-app/out/0.9.38.99. Wrapper **ghcr.io/acamemo/acasystem:0.9.38.99**, digest **sha256:44ef532e0c7db55ba0a3f6460cfb08eea3276a48b5f4eef804cc229ade3999ea**. Base **sha256:495b655c4af2ec5b2562011a40a0dd49d982e5b8a794ef74e3d141cad5409efd**. Snapshot1744file SHA256 **d6384c3e71a721e7538befade84fe94aba49698382eaf19c887390b030eda7a6**. Web3131118byte SHA256 **1a8af97ba9b4987c142d2ea279ff0184d12c929ed9d3a0779cb008d813100026**, minServer0.9.38/minShell0.1.0.

Comandi eseguiti: build frontend con versione temporanea0.9.38; poi:

~~~powershell
node progetto/ha-app/build-base.mjs --version 0.9.38 --tag aca-system:profile-use-local
node progetto/ha-app/prepare.mjs --version 0.9.38 --revision 99 --base-image aca-system:profile-use-local
~~~

Arrestato soltanto ACA, backup a freddo volume dati: backup/rep024/cold-bank-pre-0.9.38/aca-data-pre-0.9.38.tgz, **263233byte**, SHA256 **fd459b066a74165b1e95516b5ac324f1cfd8280c255e1ccec01efb42cefac560**. Estrazione tmpfs/integrity_check ok, volume segreto tecnico escluso. Dopo avvio0.9.38: integrityok, **27/27tabelle con hash/conteggi dei dati precedenti identici**. Confronto sulle vecchie colonne per distinguere conservazione dei dati dalla sola aggiunta nullable usage_lease_id. Nessuna riga personale stampata. Evidenze manifest.json, sqlite-before.json, data-comparison.json; audit indipendente conferma hash del backup.

Banco **healthy ACA0.9.38**, setupready, manifest0.9.38/hash atteso: bank-final.json. HA/D1 mantengono stato e ora di avvio (untouched-before/after.txt). LAN **http://192.168.1.11:3002/**; loopback **http://127.0.0.1:3002/**. File base .env e pubblica0.9.34 invariati. Per mantenere la build locale, dalla radice:

~~~powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep024/compose-usage-local.yaml up -d --no-build --pull never tunet
~~~

Il solo compose principale ripristina la pubblica. Non riusare l'override0.9.37 per questa prova. [Guida operativa](../riprogettazione/blocchi/03-profili-client-tavano-prova.md).

## Chiusura e punto di ripresa

Completato nel software e sul banco entro l'autorizzazione. Dati e modifiche preesistenti conservati; nessun commit/push, pubblicazione o attività VM. Prossima prova umana: ricaricare ACA prima sul PC, trascinare Tavano nella stessa pagina, aprire il telefono e verificare il blocco; chiudere ACA/scheda sul PC e verificare ingresso e disposizione adattata. Il secondo piano mantiene l'uso; crash/rete possono richiedere fino alla scadenza180s, senza revoca account. Accettazione fisica non dichiarata prima del riscontro umano.


Controlli documentali finali: diff whitespace PASS con criterio CRLF;124 nuovi collegamenti locali senza destinazioni mancanti, byte/hash degli artefatti nativi revisione2 invariati. Guida operativa aggiornata e verificata separatamente su22 collegamenti/hash bundle. Nessuna modifica ai sorgenti applicativi dopo la build verificata.

## Annotazione successiva, 2026-11-03

L’utente segnala profilo occupato sia su PC sia su telefono. Diagnosi e limiti distinti in [REP-20261103-002](REP-20261103-002-profilo-in-uso-su-entrambi.md): inventario con Edge e app desktop ACA separata, titolare non confermato. Riprodotto anche un caso limite di risposta iniziale persa durante reload; non attribuito automaticamente al banco. Le prove software di questo report restano storiche; accettazione fisica ancora da completare.
