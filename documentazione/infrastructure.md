# Infrastruttura e operazioni

## Recupero VM non risolto, revisione diagnostica del kit — 2026-11-16

[REP007](reports/REP-20261116-007-recupero-lan-stabilita-vm.md): cinque profili diagnostici ritirati dopo negativi di timer/LAN: nohz,cap99,guestHyperV,VirtIO,3CPU. HyperV è stato solo provider guest dentro VirtualBox, non cambio del motore host; un primo idle positivo e10/30s di rete riusciti non compensano il60s fallito. VirtIO/3CPU negativi anche isolati dalla rete. VM REP092 riportata a2CPU/2048MiB/defaultKVM/Intel82540EM/cap100, MAC/bridge/disco e cmdline originali; nessuna protezione o piano energetico Windows cambiati.

Kit `.76.1-vm-r2`,26file SHA7cec8f95 in `backup/rep095/pilot-vm-r2`, aggiunge controllo PowerShell/guida e procedura; app, client0.1.1 ed executor invariati, nessuna immagine ricostruita. Il controllo legge UUID/disco espliciti, misura senza sonde e rifiuta deriva/GivenUp/heartbeat anche precedenti alla finestra. È diagnosi, **non una correzione promossa né consegna qualificata**. Originale05cd8037 conservato, nessuna pubblicazione. Proposta P-129-C di confronto su altro host/Lenovo o motore separato non applicata.

Dati e identità preesistenti verificati, nuovo client QA revocato, servizio attivo senza owner. Chiave REP007 revocata/rifiutata, Dropbear chiuso; VM spenta con shutdown riconosciuto, CONFIG scollegata/UARToff. Banco .72/ok stesso container/avvio. Riaprire richiede nuova chiave dedicata; non riusare quelle revocate. ISSUE-129 ancora aperta.

## Qualifica .76.1 Core/LAN/client — 2026-11-16

[REP006](reports/REP-20261116-006-qualifica-core-lan-client-0761.md): kit .76.1 SHA05cd8037 conservato, pin bootstrap già Core2026.11.1; flag interno di compatibilità ancora storico, nessuna estensione della serie o nuova build.45chiamate/27scenari Core e10prove del vero client Windows0.1.1 PASS nel perimetro del report. **Recupero link della VM negativo sul PC corrente**, con HTTP/Observer/SSH indisponibili e pausa/ripresa manuale; RCU/watchdog osservati, causa non risolta e Lenovo/H24 ancora da verificare. Main/executor/risorse/hypervisor/protezioni invariati.

Solo VM REP092 riaperta con nuova chiave dedicata; fixture sintetica rimossa, Core riavviato e servizio attivo senza owner,13tabelle esatte/client originale esatto e nuovo client QA revocato.5identità HA iniziali conservate. Chiave REP006 revocata/rifiutata e Dropbear chiuso, VM spenta con shutdown ordinario osservato separatamente dal timeout seriale, CONFIG scollegata/UARToff. Banco .72/ok stesso container/avvio; VM storiche non gestite. Scheda portabile `backup/rep094/pc-capo-qualifica-0761` con candidato originale, esiti e prove residue, senza materiale privato. Nessuna pubblicazione o test sul destinatario.

## Candidato .76.1 e recupero servizio verificato — 2026-11-16

[REP005](reports/REP-20261116-005-recupero-servizio-ha-dopo-restore.md): kit locale ACA0.9.76/app0.9.76.1/client0.1.1,24file SHA05cd8037 in `backup/rep093/pilot-candidate-0761`. Immagine descriptor64b0c1a4, fonte2010file SHA46674138; solo2moduli backend e3test diversi rispetto alla .73.6, nessun cambio di dipendenze/Node o stack. Update, restore con guasto reale e reboot sulla sola VM REP092 PASS;14tabelle ACA e altre4identità HA osservate preservate. Il servizio perso è rigenerato automaticamente senza owner, conservato dopo reboot, con guardie sull'identità locale riconosciuta e file mancante; segreto escluso dalle copie, vecchia identità di servizio revocata e nuova registrata. L'owner resta riserva esplicita quando la rigenerazione non è consentita. ACA rimane protected/default/docker_apifalse, companion manager/Docker API come già autorizzato, senza porte o privileged.

Registry/feed/catalogo erano fixture locali senza push. Guasti .74.2/.75.2/.76.2 separati dal kit e ultima entry di guasto ritirata; registry fermo, DNS/CA/bind e redirectGit rimossi. Nuova VM **spenta/conservata**, accessi REP005 e REP005-auto revocati/rifiutati, Dropbear fermato/mascherato runtime, CONFIG scollegata e UART disabilitata. Una futura ripresa richiede nuovo accesso temporaneo, non riusare le chiavi revocate. Evidenze in `backup/rep093/final-conservation-auto.json`; banco .72/ok stesso ID/immagine/avvio, VM storiche non gestite.

Kit non pubblicato né installato sul Lenovo: download/catalogo reale ancora da rendere disponibili e verificare se autorizzati. Core completo, dispositivi/LAN/client del destinatario e stabilità/H24 ancora aperti; sul PC corrente osservati nuovamente stall RCU/journald, senza cambiare protezioni o motore VM. Le sezioni successive conservano gli stadi precedenti.

## Collaudo isolato e candidato .73.6 — 2026-11-16

[REP004](reports/REP-20261116-004-collaudo-0732-executor-vm.md): nuova `ACA-Pilot-REP092-20261116`, UUID5c2409fa-1b8a-4522-bfe2-54daf258dc43, disco ufficiale vergine HAOS18.4, Core2026.11.1/Supervisor2026.11.0.2CPU/2GiB su questo host, distinta dalla proposta4GiB sul Lenovo32GB del capo. Solo companion della nuova VM con manager/Docker API e Protection mode disabilitata; main protetto, nessuna porta del companion. Dopo correzioni stop/PAX/avvio, update e reboot6 automatico PASS; restore dati PASS ma servizio HA non recuperato (ISSUE-166). Idle clock negativo/ISSUE-129, nessuna qualifica H24.

Kit finale locale24file .73.6/client0.1.1 SHA646debf1 in `backup/rep092/pilot-candidate-0736`; immagine `ghcr.io/acamemo/acasystem:0.9.73.6`, descriptor498544e3. Byte originali .73.2 e intermedio5 conservati; nessuna pubblicazione/catalogo remoto/pipeline attiva. Staging usava registry loopback443 nel solo guest, CA Docker specifica e DNS/Git di fixture, senza push o TLS disabilitato: registry fermato, CA/bind/hosts/redirect rimossi a fine prova. Le prove locali non convalidano il download pubblico.

**Nuova VM ora spenta/conservata:** chiave bootstrap revocata, challengeSSH rifiutata, Dropbear fermato/mascherato runtime, CONFIG scollegata e UART disabilitata. Evidenze `backup/rep092/final-conservation.json`; una futura ripresa richiede nuovo accesso temporaneo, senza recuperare automaticamente identità precedenti. Le5VM storiche non gestite; banco .72/ok, stesso ID/avvio/immagine e nessun backup/update/restore eseguito su di esso. La credenziale HA rimane esclusa dalle copie per ADR-0022; il difetto di riattivazione dopo restore è registrato, senza cambiare quel confine.

## Executor HAOS e kit candidati locali — 2026-11-16

[REP003](reports/REP-20261116-003-executor-pipeline-locale.md): runtime HAOS esterno ad ACA, companion `acasystem_updater` stessa immagine/versione, manager/Docker API candidati e boot manuale; nessuna porta pubblica/Core API o privilegio aggiunto al normale ACA. Template fuori dal catalogo ordinario e ZIP executor separato. Predisposizione dalla console host solo sul target identificato, prima degli account, con credenziale/targetId unici; default piano, applicazione esplicita e Protection mode mai disabilitato dallo script. Il socket Docker attribuisce autorità ampia anche se il mount è read-only: non confonderlo con un filtro delle API. Avvio automatico e privilegi restano da qualificare/attivare localmente.

Candidato finale ACA0.9.73/app0.9.73.2, base .73/2010fonti invariata, hash runtime executor legato a immagine/provenienza/kit. Il workflow preparato controlla lo smoke isolato prima del push; niente workflow remoto, controller banco o pubblicazione attivati. Kit24file/client0.1.1 in `backup/rep091/pilot-candidate-final-r2`, SHA4ff5f05e; [scheda operativa](../progetto/ha-app/pilot/COLLAUDO.md). Bootstrap include la correzione stdin nel tmpfs Core di REP002, senza alterare i vincoli candidati18.4/2026.9.4. La nuova VM distinta ha scaricato Core2026.11.1 e riprodotto ISSUE-129 in idle sul PC corrente: qualifica reale della combinazione e della stabilità sul destinatario ancora necessaria.

Il backup freddo ACA per rollback conserva la credenziale di manutenzione della **medesima installazione**, privata e verificata insieme a identità, integrità SQLite/WAL e fingerprint; il token HA di servizio continua escluso. Quel tar contiene segreti/dati della casa, resta protetto localmente e non entra nei pacchetti. Backup del companion esclusi per segreto/runtime; una nuova centrale richiede nuove identità. Nessun backup o ripristino del banco eseguito qui. Banco .72, stesso ID/avvio/immagine e healthok; `.73.1` e VM del collaudo distinto non gestite da REP003.

## Preparazione del pilota indipendente — 2026-11-13

[REP007](reports/REP-20261113-007-installer-aggiornamenti-pilota.md), [piano esecutivo e materiali](../progetto/ha-app/pilot/README.md): bootstrap comune VM/mini PC generato con versioni ACA/app/HAOS/Core esplicite e SonoffLAN originale3.13.3 verificato, senza HACS. Il `prepare.mjs` completo richiede `--haos-version`, `--core-version`, `--sonoff-archive`; `--check` resta read-only. Generatori separati producono bootstrap e ZIP di setup candidati senza Docker/Hyper-V o dati del banco. Catalogo e immagini della candidata devono ancora essere pubblicati e qualificati prima dell'esecuzione.

Script Hyper-V separati dal client: inventario, nuova VM Generation2/disco64GiB, sola chiave pubblica temporanea in CONFIG, host pinning/SSH e revoca finale. Sono candidati con test di guardie simulati, non installazioni riuscite. Il controllo read-only di questo PC ha rilevato Windows11Home e cmdlet Hyper-V assenti: non è il Lenovo Pro del destinatario; nessuna attivazione richiesta/eseguita. Il bootstrap rifiuta OS/Core differenti senza aggiornarli; il Core scaricato al primo avvio HAOS va osservato e collaudato prima di congelare la consegna.

Selettore, disponibilità separata dei componenti e journal transazionale verificati localmente; executor reali, avvio e pipeline ancora da completare. Nessun privilegio host aggiunto all'ACA ordinaria, runner attivato, commit/push o aggiornamento del banco da REP007. Le sezioni successive conservano gli ambienti e gli interventi precedenti.

## 2026-11-13 — corrente ACA0.9.72/r99 e componente SonoffLAN

[REP005](reports/REP-20261113-005-banco-sonofflan-trvzb.md): ACA `ghcr.io/acamemo/acasystem:0.9.72.99`, ID`sha256:9cf608acd9f3139037b657cb9ce9ed263c4deae4c30b1c796fcae280277f9bf7`. Fonte2003/SHA`7acad0170acfa74af2465e599a50b01ab19fc7caa15be90873acadfef33a264d`, runtime cambiato soltanto per riconoscere il campo password stringa nei flow; frontend/client bundle ricostruiti .72. Conservati strati della .71, dipendenze, widget e Casa3D. Nessuna pubblicazione.

Catena corrente **24Compose**: mantenere tutti i23file del comando .71 nella sezione successiva e aggiungere **`-f backup/rep086/compose-widgets-local.yaml` subito prima di `up`**. Per avvio del solo ACA restano `up -d --no-deps --no-build --pull never tunet`. Per rollback alla .71 togliere soltanto tale ultimo override, senza ripristinare volumi o cambiare gli altri file. Procedura effettiva/validazione in `backup/rep086/Update-WidgetBank.ps1`, che legge e controlla la catena del container; non riutilizzare gli script storici con vecchie guardie/hash.

SonoffLAN **3.13.3** originale presente nel volume HA corrente, `/config/custom_components/sonoff`,48file verificati; HA resta sullo stesso imageID e Core2026.9.4. Per installarlo è stato fermato/riavviato soltanto il container HA esistente, poi conservato durante l'aggiornamento ACA. Backup HA completo freddo `backup/rep086/ha-config-pre-sonofflan.tgz`,226043byte/SHA`1dd84ca9ff06730d67455e8ef819ab06fe1b0456db8fd26a3d4659a130403b2f`,33fileidentici/SQLite integro. Contiene segreti, escluso da Git. Rollback componente mirato preferibile a ripristini HA storici, che possono non corrispondere al segreto tecnico ACA attuale.

BackupACA `backup/rep086/cold-bank-pre-0.9.72/aca-data-pre-0.9.72.tgz`,225853byte/SHA`cc901cbdb81b74f9abec8f18d229578669910e82ff2b451312b22ab20732dc88`, integro e27/27tabelle esatte prima/dopo. Volumi dati e segreto separato conservati. [PC](http://127.0.0.1:3002/) .72healthy/casa ready e entryesatta. Login cloud successivamente eseguito dall'utente: registri HA con bridge e2TRVZB,2climate attivi. Widget inserito e funzionamento confermati dall'utente il2026-11-13; nessuna misura fisica strumentale dedotta. La TRVZB richiede cloud eWeLink anche con componente in modalità auto; nessun cambiamento Docker/multicast effettuato.

## 2026-11-13 — corrente ACA0.9.71/r99, correzioni widget

[REP003](reports/REP-20261113-003-banco-pc-071.md): immagine `sha256:c0208ce245d23fe53232fe065913683c10d2aa306a6b846f13cad5df60b805b4`, fonte2003file. SHA canonico immagine `8ed513424f432578ef9754bdcfe1cbf38e86b1d36479a05e86d4f3cb05e848b1`; inventario REP084 `dc1db4e8281084ffac7dd2762115f3c74a8988fd683de16007a3e19c0f8d077b`: stessi byte, serializzazioni distinte. Solo frontend nuovo; backend, Casa3D,10contratti e dipendenze conservati. Nessuna installazione o pubblicazione.

Catena completa corrente, ventitré file; avvio del solo ACA:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml -f backup/rep059/compose-message-local.yaml -f backup/rep060/compose-states-local.yaml -f backup/rep061/compose-startup-local.yaml -f backup/rep063/compose-catalog-local.yaml -f backup/rep064/compose-trackpad-local.yaml -f backup/rep065/compose-repeat-local.yaml -f backup/rep066/compose-space-local.yaml -f backup/rep067/compose-direct-local.yaml -f backup/rep068/compose-reveal-local.yaml -f backup/rep069/compose-placement-local.yaml -f backup/rep083/compose-widgets-local.yaml -f backup/rep085/compose-widgets-local.yaml up -d --no-deps --no-build --pull never tunet
```

Per avviare anche HA predisposto: stessa catena con `up -d --no-build --pull never ha-bank tunet`. Docker Desktop all'inizio era spento; `docker desktop start` ha recuperato i container esistenti. Baseline di conservazione acquisita dopo questo avvio: HA/D1 mantengono ID/immagine/StartedAt/mount durante il successivo aggiornamento, solo ACA ricreato. Nessun confronto con StartedAt anteriori al daemon spento dichiarato.

Rollback immagine con dati correnti: rimuovere soltanto `-f backup/rep085/compose-widgets-local.yaml`, mantenendo tutti22precedenti fino a rep083 e l'immagine .70.99 `sha256:ba95dc5352c752de41ffee79e125a258395135c486a4963d6eb26f165112a1d2`. Nessun ripristino automatico dei volumi. Backup freddo `backup/rep085/cold-bank-pre-0.9.71/aca-data-pre-0.9.71.tgz`,219237byte/SHA`cdde35b7d139fe87eea6e030255f3f039b7229e28f19cf3751714d31690f256a`, estratto e integro; segreto tecnico escluso e conservato nel volume separato.

27/27tabelle e schema esatti nell'audit immediato6/6, revisione indipendente8/8 PASS. Il confronto tardivo esatto5/6 è conservato:26tabelle/account/profili/sessioni immutati e sola cache token40→18,1inserimento per sessione preesistente/23rimozioni compatibili conTTL7d, qualificata separatamente in sola lettura. Nessun ripristino dei dati per eliminare questa normale differenza di cache; dettagli/limiti in REP003.228file live/110frontend esatti, health .71/casa ready e accesso anonimo1366/390 su [PC](http://127.0.0.1:3002/) e [LAN](http://192.168.1.37:3002/) PASS. Ctrl+F5 con l'account esistente; autenticazione umana e hardware distinti. Sezioni successive storiche.

## 2026-11-13 — corrente ACA0.9.70/r99, tutti i widget

[REP001](reports/REP-20261113-001-aggiornamento-banco-widget.md): immagine `sha256:ba95dc5352c752de41ffee79e125a258395135c486a4963d6eb26f165112a1d2`, fonte2003file. SHA canonico immagine `e4568e06bda10210627e61ce34c9767e50caa12d4d9b5365e68d1f2ffc0be10c`, inventario storico REP082 `e6bbfae7e72a5c310841b1ceb0600e06131e7dff9e88346ef998478adbeac0b2`: stessi file/byte, due algoritmi di serializzazione distinti. Frontend .70 sigillato, tutti10contratti correnti; backend/Casa3D/runtime/dipendenze immutati dalla .57. Nessuna installazione o pubblicazione.

Catena completa corrente, ventidue file; avvio del solo ACA:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml -f backup/rep059/compose-message-local.yaml -f backup/rep060/compose-states-local.yaml -f backup/rep061/compose-startup-local.yaml -f backup/rep063/compose-catalog-local.yaml -f backup/rep064/compose-trackpad-local.yaml -f backup/rep065/compose-repeat-local.yaml -f backup/rep066/compose-space-local.yaml -f backup/rep067/compose-direct-local.yaml -f backup/rep068/compose-reveal-local.yaml -f backup/rep069/compose-placement-local.yaml -f backup/rep083/compose-widgets-local.yaml up -d --no-deps --no-build --pull never tunet
```

Per avviare anche il banco HA già predisposto: stessa catena con `up -d --no-build --pull never ha-bank tunet`. Nel presente aggiornamento HA non è stato arrestato o riavviato. Rollback immagine .57 con dati correnti: togliere soltanto `-f backup/rep083/compose-widgets-local.yaml`, mantenendo tutti21file precedenti fino a rep069/compose-placement-local.yaml e l’immagine locale .57.99. Nessun ripristino automatico dei volumi.

Backup freddo `backup/rep083/cold-bank-pre-0.9.70/aca-data-pre-0.9.70.tgz`,219244byte/SHA `345a86adf2425df144391e190d4074edd3d12bd6762e4bdba3d796fae5c48b5c`: estratto/verificato, segreto tecnico escluso. Snapshot e postavvio27/27tabelle esatte, nessuna colonna aggiunta; fingerprint account HA e identità tecnica, mount e avvii HA/D1 invariati. Audit6/6 PASS; health .70/casa ready su [PC](http://127.0.0.1:3002/) e [LAN](http://192.168.1.37:3002/). Browser anonimo1366/390 PASS,nessun login/comando: prova umana autenticata e telefono fisico distinti. Ricaricare Ctrl+F5 mantenendo l’account esistente. Sezioni successive storiche.


## 2026-11-09 — corrente ACA0.9.57/r99, catalogo e conferma

[REP012](reports/REP-20261109-012-widget-da-catalogo-a-posizionamento.md): fonte1819/SHAdfa61594, wrapper sha256:ecec625ab377b9ced7811b647e43062748b605f2603f3d3b945b14e99158417e. Solo ACA locale, account/profili e runtime/backend conservati; nessuna pubblicazione.

Catena completa corrente, ventuno file:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml -f backup/rep059/compose-message-local.yaml -f backup/rep060/compose-states-local.yaml -f backup/rep061/compose-startup-local.yaml -f backup/rep063/compose-catalog-local.yaml -f backup/rep064/compose-trackpad-local.yaml -f backup/rep065/compose-repeat-local.yaml -f backup/rep066/compose-space-local.yaml -f backup/rep067/compose-direct-local.yaml -f backup/rep068/compose-reveal-local.yaml -f backup/rep069/compose-placement-local.yaml up -d --no-build --pull never ha-bank tunet
```

Solo ACA: stessa catena con up -d --no-deps --no-build --pull never tunet. Rollback .56 con dati correnti: rimuovere soltanto -f backup/rep069/compose-placement-local.yaml, mantenendo tutti i venti precedenti fino a rep068/compose-reveal-local.yaml. Nessun ripristino automatico dei volumi.

Backup206308byte/SHA2020e86b2bbb98088a367a809d509ffe4689b10e3c8f0e9d9d70aa4039d6665c in backup/rep069/cold-bank-pre-0.9.57/, estratto e integro; audit operativo 6/6, confronto cold→live con 27 tabelle esatte e 0 seen_at monotoni, nessuna differenza imprevista. Identità/account/profili/mount e HA/D1 conservati; solo ACA ricreato. [PC](http://127.0.0.1:3002/) e [LAN](http://192.168.1.37:3002/) .57/healthy, casa ready. Ctrl+F5 senza ricreare account. Sezioni successive storiche.


## 2026-11-09 — consegna precedente ACA0.9.56/r99, richiamo verticale autonomo

[REP011](reports/REP-20261109-011-fluidita-catalogo.md): fonte1816/SHAcfb5422d, wrapper `sha256:e050fe060dc28af3e8bb9ae9776895eeb83b1b41c149dce86ec5e981d1f48b6c`. Solo Y: richiamo seguito da transform/fade autonomi; X, foto e dati conservati. Runtime congelato e backend invariati, nessuna pubblicazione.

Avvio completo corrente, venti file:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml -f backup/rep059/compose-message-local.yaml -f backup/rep060/compose-states-local.yaml -f backup/rep061/compose-startup-local.yaml -f backup/rep063/compose-catalog-local.yaml -f backup/rep064/compose-trackpad-local.yaml -f backup/rep065/compose-repeat-local.yaml -f backup/rep066/compose-space-local.yaml -f backup/rep067/compose-direct-local.yaml -f backup/rep068/compose-reveal-local.yaml up -d --no-build --pull never ha-bank tunet
```

Solo ACA: stessa catena con `up -d --no-deps --no-build --pull never tunet`. Rollback .55 con dati correnti: rimuovere soltanto `-f backup/rep068/compose-reveal-local.yaml`, mantenendo tutti i diciannove precedenti fino a rep067/compose-direct-local.yaml. Nessun ripristino automatico dei volumi.

Backup206196byte/SHAd7c22afd1f8df188fa51fd7c5ac121190f273c9d68fa7276c774fc3c006d39dd in `backup/rep068/cold-bank-pre-0.9.56/`, estratto e integro; audit operativo 6/6, confronto cold→live con 27 tabelle esatte e 0 seen_at monotoni, nessuna differenza imprevista. Identità/account/profili/mount e HA/D1 conservati; solo ACA ricreato. [PC](http://127.0.0.1:3002/) e [LAN](http://192.168.1.37:3002/) .56/healthy/casa ready. Ctrl+F5 senza ricreare account. Sezioni successive storiche.


## 2026-11-09 — consegna precedente ACA0.9.55/r99, trascinamento diretto

[REP010](reports/REP-20261109-010-trascinamento-verticale-catalogo.md): fonte1816/SHA18a2ffb1, wrapper `sha256:826bbce5f01362d113114424758fd62d120bb2289608837bb5c1843a5e057913`. Progresso verticale comune per dito/mouse/trackpad e fotografia a dimensione viewport; dati, runtime e backend conservati. Nessuna pubblicazione.

Avvio completo corrente, diciannove file:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml -f backup/rep059/compose-message-local.yaml -f backup/rep060/compose-states-local.yaml -f backup/rep061/compose-startup-local.yaml -f backup/rep063/compose-catalog-local.yaml -f backup/rep064/compose-trackpad-local.yaml -f backup/rep065/compose-repeat-local.yaml -f backup/rep066/compose-space-local.yaml -f backup/rep067/compose-direct-local.yaml up -d --no-build --pull never ha-bank tunet
```

Solo ACA: stessa catena con `up -d --no-deps --no-build --pull never tunet`. Rollback .54 con dati correnti: togliere soltanto `-f backup/rep067/compose-direct-local.yaml`, conservando tutti i diciotto precedenti fino a rep066/compose-space-local.yaml. Nessun ripristino automatico dei volumi.

Backup204910byte/SHA3d0b9182b1e09f968df225114e6aafd7382028cfd47b811b4c76dbd75cc8b616 in `backup/rep067/cold-bank-pre-0.9.55/`, estratto e integro; audit operativo 6/6; confronto cold→live: 27 tabelle esatte, 0 aggiornamenti seen_at monotoni e nessuna differenza imprevista. Account/profili/identità/mount e HA/D1 conservati, solo ACA ricreato. [PC](http://127.0.0.1:3002/) e [LAN](http://192.168.1.37:3002/) .55/healthy/casa ready. Ricaricare con Ctrl+F5 senza ricreare account. Sezioni successive storiche.


## 2026-11-09 — consegna precedente ACA0.9.54/r99, spazio e card intere

[REP009](reports/REP-20261109-009-catalogo-piu-spazio.md): fonte1816/SHAdad2ffde, wrapper `sha256:67c3af5d61313d83192d1ebcd77d45699a28dccdba87cd40f94aaa1e85966026`. Più spazio nel catalogo/Home, dissolvenza fra pagine intere e continuità dello sfondo durante Y. Backend/runtime conservati, nessuna pubblicazione.

Avvio completo corrente, diciotto file:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml -f backup/rep059/compose-message-local.yaml -f backup/rep060/compose-states-local.yaml -f backup/rep061/compose-startup-local.yaml -f backup/rep063/compose-catalog-local.yaml -f backup/rep064/compose-trackpad-local.yaml -f backup/rep065/compose-repeat-local.yaml -f backup/rep066/compose-space-local.yaml up -d --no-build --pull never ha-bank tunet
```

Solo ACA: stessa catena con `up -d --no-deps --no-build --pull never tunet`. Rollback .53 con dati correnti: togliere soltanto `-f backup/rep066/compose-space-local.yaml`, conservando i diciassette precedenti. Nessun ripristino automatico dei volumi.

Backup202041byte/SHA1d2ed5d908b122b06406ca039010a4f509120b934887311214adb5d15b67231a in `backup/rep066/cold-bank-pre-0.9.54/`, estratto e integro; audit operativo 6/6, verifica cold→live: 27 tabelle esatte e 0 aggiornamenti seen_at monotoni. Account/profili/identità/mount conservati, HA/D1 stessi container/avvii. [PC](http://127.0.0.1:3002/) e [LAN](http://192.168.1.37:3002/) .54/healthy/casa ready. Ctrl+F5 per i nuovi asset, senza ricreare account. Sezioni successive storiche.


## 2026-11-09 — consegna precedente ACA0.9.53/r99, recupero rilascio perso

[REP008](reports/REP-20261109-008-cicli-ripetuti-catalogo.md): fonte1816/SHA0f7a0c0b, wrapper `sha256:6ee3562eece307737a9085c230d4ddcc8f8c8791003e8bd72248cc582052e3e7`. Solo recupero del candidato mouse non trascinato; touch, pulsanti premuti e drag veri conservati. Runtime/backend/contratti e animazioni invariati, nessuna pubblicazione.

Avvio completo corrente, diciassette file:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml -f backup/rep059/compose-message-local.yaml -f backup/rep060/compose-states-local.yaml -f backup/rep061/compose-startup-local.yaml -f backup/rep063/compose-catalog-local.yaml -f backup/rep064/compose-trackpad-local.yaml -f backup/rep065/compose-repeat-local.yaml up -d --no-build --pull never ha-bank tunet
```

Solo ACA: stessa catena con `up -d --no-deps --no-build --pull never tunet`. Rollback .52 con dati correnti: togliere soltanto `-f backup/rep065/compose-repeat-local.yaml`, conservando tutti i sedici file precedenti. Nessun ripristino automatico dei volumi. Sezioni successive storiche.

Backup204098byte/SHA3b6e5c2ccdcc2a661878a44513cc4fb5160ad54363949e06916801fb459bc4bc in `backup/rep065/cold-bank-pre-0.9.53/`, estratto e integro.27tabelle immediate e successive identiche, audit6/6PASS; identità/mount/account/profili conservati, HA/D1 stessi container/avvii, solo ACA ricreato. [PC](http://127.0.0.1:3002/) e [LAN](http://192.168.1.37:3002/) .53/healthy/casa ready. Ctrl+F5 per i nuovi asset. Nessun cambio .env/firewall o account da ricreare.


## 2026-11-09 — consegna precedente ACA0.9.52/r99, ritorno catalogo da trackpad

[REP007](reports/REP-20261109-007-ritorno-catalogo-trackpad.md): sorgente1816/SHA5259d73c, wrapper `sha256:f972cff2e71d898365715ace54f5ba6ef87a1312fe9094d5a09730ece599b9e8`. Solo input wheel inverso nella primitiva BottomDrawer; CSS/durate invariati, runtime/backend/contratti conservati. Ricetta derivata congelata, nessuna pubblicazione.

Avvio completo corrente, sedici file:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml -f backup/rep059/compose-message-local.yaml -f backup/rep060/compose-states-local.yaml -f backup/rep061/compose-startup-local.yaml -f backup/rep063/compose-catalog-local.yaml -f backup/rep064/compose-trackpad-local.yaml up -d --no-build --pull never ha-bank tunet
```

Solo ACA: stessa catena con `up -d --no-deps --no-build --pull never tunet`. Rollback .51 con dati correnti: togliere soltanto `-f backup/rep064/compose-trackpad-local.yaml`, conservando tutti i quindici precedenti fino a rep063catalog. Nessun reset o ripristino automatico dei volumi.

Backup freddo206911byte/SHAe700a8a381907a91941c9413835a6615a27d16a028e996fb2320f16efd7a122c, estratto/SQLite integro, in `backup/rep064/cold-bank-pre-0.9.52/`.27tabelle immediate identiche; tardivo stretto5/6 preservato e audit ristretto PASS:26tabelle esatte, tutti i campi fissi delle31righe token invariati, solo1seen_at monotono. Identità/mount conservati, HA/D1 stessi container/avvii; solo ACA ricreato. [PC](http://127.0.0.1:3002/) e [LAN](http://192.168.1.37:3002/) .52/healthy e casa ready. Ctrl+F5 sul PC, poi scroll a due dita opposto all'apertura per chiudere il catalogo. Nessun account/profilo da ricreare, nessuna modifica .env/firewall. Sezioni successive storiche.


## 2026-11-09 — consegna precedente ACA0.9.51/r99, gesti catalogo da tutte le pagine

[REP006](reports/REP-20261109-006-banco-pc-gesti-tutte-pagine.md): fonte REP005 invariata1816/SHA42e16a77, wrapper `sha256:5cf943e30549773853433b105020df3df68d46dd06310f260fc8c9ef827d083d`. Catalogo UP/DOWN e misura speciale corretta; ricetta derivata/runtime esatto .46 e backend/contratti invariati. Nessuna pubblicazione.

Avvio completo corrente, quindici file:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml -f backup/rep059/compose-message-local.yaml -f backup/rep060/compose-states-local.yaml -f backup/rep061/compose-startup-local.yaml -f backup/rep063/compose-catalog-local.yaml up -d --no-build --pull never ha-bank tunet
```

Solo ACA: stessi quindici file con `up -d --no-deps --no-build --pull never tunet`. Rollback .50 con dati correnti: togliere soltanto `-f backup/rep063/compose-catalog-local.yaml`, mantenendo tutti i quattordici file precedenti fino a rep061startup. Non ripristinare o cancellare volumi automaticamente. Le sezioni successive conservano le catene delle versioni precedenti.

Backup freddo209507byte/SHA36cf50995b04f02e09252f86285cdf46bb6fbf85d25453f82a7e9c424e4badd7 in `backup/rep063/cold-bank-pre-0.9.51/`, estrazione/integrità ok.27tabelle immediate identiche; audit tardivo esatto5/6 distinto dal controllo cold→live PASS:26tabelle esatte,30righe token con campi fissi stabili, soltanto1seen_at monotono. Account/profili, identità e mount conservati, HA/D1 stessi container/avvii. Solo ACA ricreato, healthy e casa ready: [PC](http://127.0.0.1:3002/), [LAN](http://192.168.1.37:3002/). Ctrl+F5 sul PC per i nuovi asset; nessun account da ricreare. QA anonima e pacchetto verificati, hardware/login umano distinti. Nessuna modifica .env/firewall o installazione nativa.


## 2026-11-09 — consegna precedente ACA0.9.50/r99, avvio autenticato

[REP004](reports/REP-20261109-004-diagnosi-avvio-edge.md): corretta la catena di altezza autenticata e la conferma tardiva della prima composizione; riapertura Edge dopoCtrl+F5 confermata dall'utente. Fonte1816/SHA9d6864d3, wrapper `sha256:bacc819ba2aefed25287d301dab573d09939cc479274017f8faa95dfc77bd0ed`; runtime/backend/contratti invariati rispetto alla .49, nessuna pubblicazione.

Avvio completo corrente:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml -f backup/rep059/compose-message-local.yaml -f backup/rep060/compose-states-local.yaml -f backup/rep061/compose-startup-local.yaml up -d --no-build --pull never ha-bank tunet
```

Solo ACA: stessi quattordici file con `up -d --no-deps --no-build --pull never tunet`. Rollback .49 con dati correnti: togliere soltanto l'ultimo `compose-startup-local.yaml`, mantenendo i tredici precedenti. Nessun reset dei volumi.

Backup212161byte/SHA0e164072…63f1c in `backup/rep061/cold-bank-pre-0.9.50/`, estratto/integritàok.27tabelle immediate identiche; audit tardivo5/6 conservato, verifica cold→live separata PASS per solo seen_at monotono (28righe token/campi fissi uguali,26tabelle esatte). Account/profili, identità e mount conservati; HA/D1 stessi container/avvii, solo ACA ricreato. Health .50/ready, ZIP e nuovo CSS verificati: [PC](http://127.0.0.1:3002/), LAN http://192.168.1.37:3002/. Nessuna modifica .env/firewall o installazione nativa; hardware mobile distinto.

## 2026-11-09 — consegna precedente ACA 0.9.49/r99

[REP003](reports/REP-20261109-003-stati-vuoti-senza-sovrapposizioni.md): messaggi senza card e loader escluso dai recuperi di profilo/accesso/account. Fonte1816/SHAa41c99f2, wrapper `sha256:42be51f914875033d13961a5db3d7f6fa3cbb69b0312437151578fc783cfc535`. Stessa ricetta derivata/runtime della .48; audit e QA selezionate PASS, nessuna pubblicazione.

Avvio completo corrente:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml -f backup/rep059/compose-message-local.yaml -f backup/rep060/compose-states-local.yaml up -d --no-build --pull never ha-bank tunet
```

Solo ACA: stessi tredici file con `up -d --no-deps --no-build --pull never tunet`. Rollback .48: togliere soltanto l'ultimo `compose-states-local.yaml`, mantenendo i dati correnti e tutti i dodici file precedenti. Nessun reset dei volumi.

Backup nuovo218559byte, SHA643fb73b…db6d44, estratto/integritàok;27tabelle uguali e audit6/6PASS. Account/profili, tre identità HA, segreto tecnico e mount conservati; HA/D1 stessi container e avvii, solo ACA ricreato. Health .49 e casa ready su [PC](http://127.0.0.1:3002/); LAN http://192.168.1.37:3002/. Vista anonima e asset del banco verificati; prove fisiche e autenticazione reale distinte. Dettagli e backup in `backup/rep060/`, nessuna modifica .env/firewall.

## 2026-11-09 — consegna precedente ACA 0.9.48/r99

[REP002](reports/REP-20261109-002-preparazione-lenta-messaggio-centrato.md): ritocco richiesto durante il rollout, senza modificare tempi/retry. Wrapper locale `sha256:ffea266ce58a098a2209a0cc0b9e2e333d6aae198d111b3d2a18bcf11c06d5f7`, fonte1815/SHA6ecf4b75. Ricetta derivata come .47, runtime invariato (7versioni/19APK), audit e UI controllata PASS. Pubblica0.9.34 e installer invariati.

Comando della consegna precedente .48:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml -f backup/rep059/compose-message-local.yaml up -d --no-build --pull never ha-bank tunet
```

Solo ACA: stessi dodici file con `up -d --no-deps --no-build --pull never tunet`. Rollback .47 con dati correnti: togliere soltanto l'ultimo `compose-message-local.yaml`, mantenendo rete rep058 e tutti gli altri file; ricaricare il frontend compatibile. Nessun reset dei volumi.

Backup `backup/rep059/cold-bank-pre-0.9.48/aca-data-pre-0.9.48.tgz`,249975byte/SHA `78e18768816a49a62b32eb05d75bc1132c0f8a0d1ae4fc6df21839f3cbbe5c5a`, estratto e verificato.27tabelle immediate identiche; confronto tardivo5/6 conservato perché cambia solo seen_at di una sessione attiva. Verifica cold→live successiva:26tabelle identiche,24righe token/fissi uguali e un timestamp avanzato,0regressioni. Identità HA/tecnica e mount uguali, HA/D1 non ricreati durante l'update. Fonte e codice del comportamento invariati salvo2sorgenti UI/1test.

Health .48 e setupready, manifest minServer0.9.48/minShell0.1.0 e risorse effettive verificati. PC http://127.0.0.1:3002/, telefono nella stessa LAN http://192.168.1.37:3002/; ricaricare e usare l'account esistente. Uso esclusivo per profilo conservato. Nessun login umano, prova hardware o causa del timeout dichiarati collaudati da questa installazione. Fonte/ricetta/sigilli e limiti nel report.

## 2026-11-09 — ACA 0.9.47/r99 sul banco PC

[REP001](reports/REP-20261109-001-banco-pc-gesti-catalogo.md): aggiornamento autorizzato con account/profili conservati. Wrapper locale `sha256:012ba32e3aa80dc4e8a5f95024f79d2c277a9b9db513cdf82e737be13099526f`, fonte1815/SHAca1e5d71. Ricetta derivata in `backup/rep058/Dockerfile.frozen-runtime` e `frozen-build.json`: runtime .46 esatto, builder Node vincolato, entrambi i dist sostituiti senza residui; non è il normale Dockerfile standard. Primo candidato con deriva Alpine respinto prima del rollout, controevidenze conservate. Tutte19APK e7versioni runtime uguali alla .46, audit sorgenti/web/bundle PASS.

Backup freddo `backup/rep058/cold-bank-pre-0.9.47/aca-data-pre-0.9.47.tgz`,249316byte/SHA `6553857d04f97ff432ddd57a4105b32211b8ba9f4ae1047c765d831bab0fc53f`: estrazione, integrità e27/27tabelle identiche. Segreto tecnico separato,3utenti/provider HA e volumi conservati. HA/D1 sono ripartiti con Docker a inizio incarico; non sono stati ricreati né riavviati durante il successivo rollout di ACA.

Avvio completo con i binding attuali (Wi-Fi192.168.1.37):

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml -f backup/rep058/compose-current-network-local.yaml -f backup/rep058/compose-gestures-local.yaml up -d --no-build --pull never ha-bank tunet
```

Solo ACA: stessi undici file con `up -d --no-deps --no-build --pull never tunet`. Rollback .46 con dati correnti e rete .37: stessi file **senza** l'ultimo `compose-gestures-local.yaml`, usando il medesimo comando del solo ACA; non eliminare l'override di rete rep058. Il manifest .47 richiede minServer0.9.47/minShell0.1.0; al rollback ricaricare anche il frontend compatibile.

Health .47, setupready e UI anonima1366/390 confermati. URL PC http://127.0.0.1:3002/, LAN http://192.168.1.37:3002/; account esistenti, nessun nuovo setup. Nessuna modifica a .env, firewall o profilo di rete; Docker ha già regole per la rete corrente. Dimensioni fisiche osservate5729760byte come baseline,27tabelle identiche e sei audit operativi PASS. Login umano e hardware distinti; pubblica0.9.34 invariata. Rifinitura successiva richiesta durante il rollout in [REP002](reports/REP-20261109-002-preparazione-lenta-messaggio-centrato.md).

## 2026-11-05 — stato precedente ACA 0.9.46/r99, Sistema e account

[REP017](reports/REP-20261104-017-sistema-e-personalizzazione-account-unica.md): navigazione Sistema e personalizzazione unica. Wrapper locale `sha256:1464e2d3085af6b93a874e698885c056227476bae60dd8b1afab52b10f7320d7`, source1791 SHA256 `344d02d69ccec6e953cc0c46c9acfa66af2d03eab3e6e39a50593707791e06b1`. Audit indipendenti fonte/immagine/web/runtime, smoke senza rete e QA frontend prima del gate; nessuna pubblicazione.

Backup freddo `backup/rep044/cold-bank-pre-0.9.46/aca-data-pre-0.9.46.tgz`,247058byte SHA256 `65858e56ced20a57d9c4a3ae644f84008b1044dbcb2a477c839b6aa53ae94f2f`, estrazione/integrità e audit6/6PASS.27/27tabelle identiche, nessuna migrazione/colonna/indice nuovo; account/profili/identità HA/tecnica e mount conservati, HA/D1 stessi container/avvii. Non ripetere recuperi o setup.

Avvio completo corrente:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml -f backup/rep044/compose-system-local.yaml up -d --no-build --pull never ha-bank tunet
```

Solo ACA: stessi nove file con `up -d --no-deps --no-build --pull never tunet`. Rollback alla .45 conservata, dati correnti e rete .11:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml up -d --no-deps --no-build --pull never tunet
```

Usare anche frontend compatibile con il server scelto; il manifest .46 richiede minServer0.9.46/minShell0.1.0. Health/manifest/setup e UI anonima5viste confermati sul banco. URL http://127.0.0.1:3002/ e http://192.168.1.11:3002/. Ricaricare il frontend e aprire Sistema con l'account esistente; nessun installer nativo o aggiornamento HA richiesti.

Misura fisica prima/dopo invariata: DB1576960/WAL4120032/SHM32768/journal0byte, totale5729760;388pagine/freelist0. I4indici faccette esistenti rimangono16384byte. Logici13340/diagnostica0, quote invariate; nuovi dati personali non creati per provare l'editor. Nessuna scheda/IndexedDB/bozza umana toccati. I test di registrazione/immagini sono sintetici; nessun login umano o prova hardware impliciti. Le sezioni seguenti sono storico; mantenere l'override rep044 sopra i precedenti per riprendere il banco corrente.

## Stato precedente — ACA 0.9.45/r99, Tavano

[REP016](reports/REP-20261104-016-tavano-lista-giorni-paginazione.md): Tavano con giorni, paginazione e menu migliorati; aggiornato soltanto ACA. Wrapper `sha256:3f41809c31b0cc7071a0b93826992145ce235596d78ae2a7580aad1a2e51de2e`, sorgenti1780 SHA256 `4e38287b12bec27aa372d5720094fc3afcd5510121db2cc24dc1dccae93234d0`. Materiali e runtime verificati indipendentemente prima del gate, nessuna pubblicazione.

Backup freddo `backup/rep043/cold-bank-pre-0.9.45/aca-data-pre-0.9.45.tgz`,240382byte SHA256 `90847bbcf42806dcc665aa3776e425ccd9379b7c70bcebc9f9849a6db1473c51`; estrazione/integrità e confronti PASS.27/27tabelle identiche, nessuna colonna aggiunta;4indici intenzionali per le faccette. Account/profili/identità conservati, HA/D1 stessi container/avvii/mount. Non ripetere setup o recupero.

Avvio completo corrente, mantenendo HA dedicato persistente e binding loopback/LAN .11:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml -f backup/rep043/compose-tavano-local.yaml up -d --no-build --pull never ha-bank tunet
```

Per il solo ACA usare gli stessi otto file con `up -d --no-deps --no-build --pull never tunet`. Rollback alla .44 conservata, senza ripristinare vecchi dati:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml up -d --no-deps --no-build --pull never tunet
```

Le colonne dei dati restano compatibili con la .44, che ignora i nuovi indici. Prima di un rollback del server usare anche il suo frontend compatibile; la .45 richiede minServer0.9.45. Health/manifest/setup e UI anonima5viste verificati sul banco reale. URL http://127.0.0.1:3002/ e http://192.168.1.11:3002/. Ricaricare il frontend e aprire Tavano con il proprio account; nessuna nuova installazione nativa.

Dimensioni fisiche osservate: DB1576960/WAL4120032/SHM32768/journal0byte prima e dopo; pagine385→388, freelist1→0. I4indici occupano16384byte (`dbstat`), riusando anche allocazioni esistenti; non dichiarare schema identico o crescita nulla in generale. Logici13340byte di attività/0diagnosi, quote50MiB/10MiB. Evidenze selezionate in rep043. Nessun browser/IndexedDB/bozza umana modificato; prova autenticata o hardware distinta. Le sezioni seguenti sono storico: per il banco attuale mantenere l'override rep043 sopra i precedenti.

## Stato precedente — ACA 0.9.44/r99, avvisi e panoramica

[REP015](reports/REP-20261104-015-sovrapposizioni-sync-e-anteprime-pagine.md): aggiornato soltanto ACA con correzione delle sovrapposizioni e anteprime laterali al 90%. Wrapper locale `sha256:a6194c940d7a48e69413e5df192b77af57a0968e959ab9f9bd734e396fbb5b75`, snapshot 1775 file SHA256 `68b33fb578cc5aca22bf9e22c8d466acd4205a8ccb0c4e1ef88edee92e74a255`. Provenienza, runtime, smoke isolato e UI anonima effettiva verificati; nessuna pubblicazione.

Backup freddo `backup/rep042/cold-bank-pre-0.9.44/aca-data-pre-0.9.44.tgz`, 240344 byte, SHA256 `f70c4fb6d3363f318daedf717db068ab8ab33c2a3878821726a5810ff9ccf20e`; estrazione/integrità e audit riusciti. Tutte le 27 tabelle identiche prima/dopo; identità HA e tecnica conservate, HA/D1 stessi container/immagini/avvii e mount. Nessun nuovo setup o recupero profili necessario.

Il preflight ha rilevato il cambio IP e interrotto il primo tentativo prima dello stop di ACA. L'override di rete specifico conserva loopback e usa ora **192.168.1.11**, senza ampliare binding o firewall. Avvio completo corrente:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml -f backup/rep042/compose-ui-local.yaml up -d --no-build --pull never ha-bank tunet
```

Per il solo ACA usare gli stessi sette file con `up -d --no-deps --no-build --pull never tunet`. Rollback alla precisa .43, mantenendo la rete attuale e i dati correnti:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml -f backup/rep042/compose-network-local.yaml up -d --no-deps --no-build --pull never tunet
```

Aprire una nuova scheda su http://127.0.0.1:3002/ dal PC o http://192.168.1.11:3002/ dalla LAN; accedere con l'account esistente se richiesto. Un cambio origine non trasferisce lo storage del browser: eventuali vecchie schede con bozze irrisolte vanno conservate, non scartate per aggiornare la grafica. Nessuna bozza umana è stata aperta, chiusa o riconciliata dagli strumenti. Prove autenticate/iPhone/hardware distinte. Le sezioni seguenti conservano gli stati precedenti; per il banco corrente usare i sette file sopra.

## Stato precedente — ACA0.9.43/r99, Vetro Bianco

[REP014](reports/REP-20261104-014-banco-vetro-bianco.md): aggiornato soltanto ACA, wrapper locale `sha256:d3c2a2e8237f0f37a6dee96d709432c37df9f0d7df7c535fd5eaf055b4a357cd`, snapshot1772file SHA256 `12776e57fe6030b75b9526aef37f4e3253d001b42e217a6ea0cab9c52525e1ea`. Audit indipendenti e smoke isolato PASS; banco healthy/setupready e UI reale anonima verificata in5viste. Nessuna pubblicazione.

Backup corrente `backup/rep041/cold-bank-pre-0.9.43/aca-data-pre-0.9.43.tgz`,203154byte SHA256 `e78a034698c99ebc9cd3fc216c2ea9b9e419cc8bb1d99662d7992f9e5cd68efb`, estratto e verificato anche indipendentemente.27/27tabelle identiche, account HA/provider e identità tecnica stessi hash; mount e HA/D1 stessi ID/immagini/avvii. Non ripetere creazione account o copia dei profili.

Avvio completo con HA dedicato persistente:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml -f backup/rep041/compose-white-local.yaml up -d --no-build --pull never ha-bank tunet
```

Per il solo ACA usare gli stessi cinque file con `up -d --no-deps --no-build --pull never tunet`. Rollback alla precisa .42 senza ripristinare dati precedenti:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml up -d --no-deps --no-build --pull never tunet
```

Aprire http://127.0.0.1:3002/ sul PC o http://192.168.1.19:3002/ sulla LAN. Ctrl+F5 nel browser PC, oppure chiudere/riaprire ACA per richiedere il nuovo frontend. Usare l'account esistente. La prova4185 rimane separata. Nessuna nuova installazione client o HAOS; iPhone/hardware e nuovo login umano non provati in questo aggiornamento. Le sezioni successive sono storico: per il banco attuale mantenere rep041.

## Stato precedente — ACA0.9.42/r99, Liquid Glass

[REP009](reports/REP-20261104-009-banco-liquid-glass.md): aggiornamento del solo ACA autorizzato dall’utente. Wrapper locale `sha256:c0d2e934544aea4e2f3176eaabd718bfec4cce0d1202843e0749a647da9dd80c`, snapshot1763file SHA256 `92c2cc28dcb67105f496422563909bd29907dc7e3288a4ad60ea63136b6b26b0`. Audit di provenienza/smoke isolato PASS. Banco healthy, setupready, UI Liquid Glass effettiva verificata su1366/390 senza credenziali o comandi.

Backup freddo attuale179723byte SHA256 `19783e5d73a30f1a30aab09d4013a23177e357cdd2e4585941ab7417ffc2233d` in `backup/rep036/cold-bank-pre-0.9.42/`, estrazione/integrità verificate. Dopo riavvio27tabelle identiche, account HA/provider e identità tecnica con stesse impronte, HA/D1 stessi container/orari. Profili recuperati e originali conservati; non ripetere setup o copia.

Avvio completo con HA dedicato persistente:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml -f backup/rep036/compose-liquid-local.yaml up -d --no-build --pull never ha-bank tunet
```

Per il solo ACA usare gli stessi quattro file con `up -d --no-deps --no-build --pull never tunet`. Rollback conservativo alla .41 (senza ripristinare dati precedenti):

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml up -d --no-deps --no-build --pull never tunet
```

URL http://127.0.0.1:3002/ e http://192.168.1.19:3002/. Ricaricare le schede/app già aperte per ottenere il nuovo tema; nel browser PC Ctrl+F5. Release pubblica0.9.34 e installazione HAOS invariati. Hardware/iPhone non provati in questo lotto. Le sezioni successive sono storico; mantenere rep036 per il banco attuale.

## Stato precedente — ACA0.9.41, prima creazione con UI comune

[REP006](reports/REP-20261104-006-primo-account-interfaccia-comune.md): wrapper locale0.9.41/r99 digest `sha256:39b90413f40ccd35fea65a531ade2cb7d738abe9c82ccbfdd9aaf23125726f91`, bundle3129258byte SHA256 `2b18f1a7f3c1ae45c0cacd952eebaa525d8072d8d7d0f294977fb0ac18e82c7e`. Banco healthy e UI anonima reale verificata, primo account ancora da creare dall’utente. Backup222570byte verificato,27tabelle identiche, HA dedicato/storico/D1 non riavviati nell’aggiornamento0.9.41. Recupero profili in REP005.

Override corrente base + rep032 (HA dedicato persistente) + rep033 (ACA0.9.41). Avvio completo:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml up -d --no-build --pull never ha-bank tunet
```

URL http://127.0.0.1:3002/ e http://192.168.1.19:3002/. L’utente ha ora completato la prima creazione e il banco risponde `ready`, registrazione `ready:true`. [REP005](reports/REP-20261104-005-recupero-account-banco.md): due copie dei profili applicate, originali e nuovo profilo del destinatario conservati; libreria destinataria3, attivo recuperato. Backup pre-copia237504byte SHA256 `0f28781b353c3ff25de2e26a70255a2d3f5a147b59867c3e89ef6ff5df7c9fbe`, integrità/verifiche dati riuscite. HA dedicato persistente invariato; non usare vecchi override sull’HA storico. Pubblica0.9.34 e pacchetti nativi conservati; telefono fisico non ancora verificato. Sezioni successive storiche.

## 2026-11-04 — banco corrente ACA0.9.40 e HA di prova persistente

[REP004](reports/REP-20261104-004-ingresso-semplificato-banco.md) installa il wrapper locale `ghcr.io/acamemo/acasystem:0.9.40.99`, digest `sha256:27a0fa2ac3a4ccdc5f413ef62ba316afdac4f33b6c7b4c4007e4a04643915470`. Nome unico, accesso personale senza token manuale e pill colore verificati nel software e nell’UI anonima. Backup ACA222295byte verificato e27tabelle identiche. Pubblica0.9.34 invariata.

[REP005](reports/REP-20261104-005-recupero-account-banco.md): dopo il problema di montaggio storico di HA e l’autorizzazione a nuovo account/copia profili, l’utente chiede di ripetere dalla creazione. Il banco usa ora HA separato `aca-tunet-ha-bank-1`, stessa immagine2026.9.4, volume `aca-tunet_ha-bank-recovery-20261104`, endpoint interno `http://ha-bank:8123` senza porte pubbliche. HA storico `homeassistant` fermo e conservato; D1 invariato. Override corrente `backup/rep032/compose-recovery-local.yaml`, che sostituisce l’endpointHA del precedente override rep031. Stato atteso attuale `owner-required`: creazione umana non ancora completata, copia dei due profili non ancora applicata.

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml up -d --no-build --pull never ha-bank tunet
```

ACA risponde su http://127.0.0.1:3002/ e http://192.168.1.19:3002/. Configurazioni HA storica e montaggio vuoto preservate in rep031; vecchio segreto tecnico conservato solo nel volume separato. Login reale e copia profili restano aperti. Non avviare i vecchi override per riprendere questo banco. Sezioni successive storiche.

## 2026-11-04 — banco corrente ACA0.9.39/r99, palette fissa

[REP002](reports/REP-20261104-002-palette-fissa-tema-classico.md): wrapper **ghcr.io/acamemo/acasystem:0.9.39.99**, digest **sha256:d13fc15ec98c75c83437838f10217a7d643cd9d4d690d46d24a821f52197da95**. Snapshot1748file SHA256 **79a2557796d026aa5648aa57b2e336143dfe4b98667808db7ecd0b3af9dfde19**. Web3128398byte SHA256 **424c6c4bdc50319a9cb590370531a684fcbd03454c8ea707ff373663b7779b74**, minServer0.9.39/minShell0.1.0. Pubblica/file.env0.9.34 invariati.

Riavvio dalla radice:

~~~powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep029/compose-classic-local.yaml up -d --no-deps --no-build --pull never tunet
~~~

Override locale sostituisce le porte con127.0.0.1 e **192.168.1.19**; vecchio192.168.1.11 non corrente. Su questa rete il PC risponde a http://192.168.1.19:3002/ e http://127.0.0.1:3002/. DockerCompose5.5.1 accetta ports:!override. Binding e rete descritti nel report: nessun firewall/profiloWindows o HA modificati, accesso Edge confermato dall’utente, telefono odierno non verificato. Container healthy/setupready e hash manifest atteso; HA/D1 stessi stati/orari di avvio.

Backup freddo backup/rep029/cold-bank-pre-0.9.39/aca-data-pre-0.9.39.tgz:222261byte SHA256 **17459bbb5f9aa63aaeeddbfb7079dbbb8f8086c6dd87e249f00055e668f4ba2f**, estrazione/integritàok, segreto tecnico escluso.27tabelle con dati precedenti identici, nessun nuovo schema. Immagini/backup precedenti conservati; per rollback adottare porte della rete corrente. Sezioni seguenti storiche.

## 2026-11-03 — banco corrente ACA0.9.38 locale/r100, cambio dispositivo corretto

[REP004](reports/REP-20261103-004-cambio-dispositivo-immediato.md): wrapper **ghcr.io/acamemo/acasystem:0.9.38.100**, digest **sha256:6fd2b843232a8ce88c8b312ba49baa19a9ed65d79f277730f922c31eabea51e6**. Snapshot1746file SHA256 **6cd396bd06da30d55462d9421a7f91b64b7accb53c554e09fc31ab94074a2615**. Web3131273byte SHA256 **e51cb410eccd5e9d0134917a9762652d631d6178cc184a8cc4368cb15d1f4b23**, minServer0.9.38/minShell0.1.0. Pubblica0.9.34/file.env invariati; le shell confrontano anche lo SHA della stessa versione.

Riavvio dalla radice:

~~~powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep027/compose-switch-local.yaml up -d --no-deps --no-build --pull never tunet
~~~

Nuovo override necessario per r100; rep024 resta r99, compose base resta pubblica0.9.34. LAN http://192.168.1.11:3002/ invariata. Banco healthy/setupready/hash bundle verificato; HA/D1 stessi stati e orari di avvio. Backup freddo backup/rep027/cold-bank-pre-0.9.38-r100/aca-data-pre-0.9.38-r100.tgz:260386byte, SHA256 **0bac212ec03bf533fcb2a7ef983e11bcd94d121cea1b8af640c88e4f025ac9ee**, estrazione tmpfs/integritàok, segreto tecnico escluso. Postavvio27tabelle con hash/conteggi identici, nessuno schema aggiunto.

Dopo nuova versione web su entrambi i dispositivi, utente conferma chiusura iPhone→Edge in pochi secondi. Meccanica connessione/grazia3s e fallback residui in ADR0038; nessun comando fisico, nuova pubblicazione o VM. Sezioni seguenti storiche.

## 2026-11-03 — banco corrente ACA0.9.38 locale/r99

[REP-20261103-001](reports/REP-20261103-001-spostamento-widget-live.md), aggiornamento esplicitamente autorizzato. Wrapper **ghcr.io/acamemo/acasystem:0.9.38.99**, digest **sha256:44ef532e0c7db55ba0a3f6460cfb08eea3276a48b5f4eef804cc229ade3999ea**;1744sorgenti SHA256 **d6384c3e71a721e7538befade84fe94aba49698382eaf19c887390b030eda7a6**. Web3131118byte SHA256 **1a8af97ba9b4987c142d2ea279ff0184d12c929ed9d3a0779cb008d813100026**, minServer0.9.38/minShell0.1.0. Materiali progetto/ha-app/out/0.9.38.99; pubblica0.9.34 e file base.env invariati.

Riavvio del solo ACA dalla radice:

~~~powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep024/compose-usage-local.yaml up -d --no-build --pull never tunet
~~~

Il compose principale da solo ripristina la pubblica; override rep023 ripristina0.9.37. Banco healthy/setupready; LAN **http://192.168.1.11:3002/**, loopback **http://127.0.0.1:3002/**. HA/D1 conservano stato/ora di avvio. Backup freddo backup/rep024/cold-bank-pre-0.9.38/aca-data-pre-0.9.38.tgz:263233byte, SHA256 **fd459b066a74165b1e95516b5ac324f1cfd8280c255e1ccec01efb42cefac560**, estrazione tmpfs/integritàok, segreto tecnico escluso. Confronto27tabelle sui campi precedenti: dati/hash/conteggi identici; nuova sola colonna nullable usage_lease_id negli intenti comando.

[ADR-0037](decisions/ADR-0037-uso-esclusivo-profilo-e-posizioni.md): background mantiene l'uso, chiusura libera best effort con grazia3s per reload; crash/rete scadono entro180s, rinnovo20s. Nessuna revoca login/account necessaria. Guida/limiti fisici nel report; sezioni seguenti storiche.

## REP016, 2026-11-02 — banco ACA0.9.37 locale, configurazione per account

Su autorizzazione esplicita **«Sì, aggiorna il banco su questo PC»**, [report016](reports/REP-20261102-016-modifica-immediata-e-ingresso-profilo.md): banco aggiornato0.9.35→0.9.37 con backup verificato. Immagine finale locale **`ghcr.io/acamemo/acasystem:0.9.37.100`**, digest **`sha256:cf72a506edfe0184ce800a243fd27f80158332dbf2c8eef6dabb7265ed8b4122`**;1740sorgenti SHA256 **`3db7ac33720a4254afe6557c6e4515c5356d7ace2530a7383a211f3ccb2cb4b2`**. Il primo wrapper99 è conservato; revisione100 include il recupero quota nello sheet modale. Pubblica0.9.34, `.env`, HA, D1 e VM invariati.

Riavvio dalla radice con il solo servizio ACA:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep023/compose-live-local.yaml up -d --no-build --pull never tunet
```

Il solo compose principale ripristina la pubblica0.9.34: usare l'override per mantenere la prova corrente. Indirizzi **http://192.168.1.11:3002/** in LAN e **http://127.0.0.1:3002/** dal PC. Health healthy/0.9.37, setupready, registrazioneready, manifest0.9.37/minServer0.9.37/minShell0.1.0. Bundle3128213byte SHA256 **`6b5d0424ba4aa152b1a5ea45c16935b45a02765ba03d98d269cfe4c0aed81bfd`**, incluso nel wrapper e offerto alle shell con verifica dell'hash.

Backup prima del passaggio da0.9.35: `backup/rep023/cold-bank-pre-0.9.37/aca-data-pre-0.9.37.tgz`,291572byte/SHA256 **`959aca6e198e7cefad34722a5762316abad75ee22583870dc1e1f104b69882c1`**;26tabelle precedenti identiche, una nuova tabella di selezione account. Prima della revisione100 ulteriore copia `cold-bank-pre-0.9.37-r100/aca-data-pre-0.9.37-r100.tgz`,333910byte/SHA256 **`89a4dbbaa206785af4c6ed51a6852ae623006842bc0e5a0add1f9a496cd730bf`**;27tabelle identiche dopo l'aggiornamento finale. Copie estratte in tmpfs con integrity_check ok, volume identità tecnica escluso. HA/D1 mantengono stessa ora di avvio; nessun account personale o comando fisico eseguito dall'agente. Guide/materiali e limiti fisici nel report; le sezioni seguenti conservano lo storico.

## REP014, 2026-11-02 — banco locale ACA0.9.35, pubblica0.9.34 conservata

[Report014](reports/REP-20261102-014-accesso-essenziale-password-visibile.md): primo setup essenziale e comando mostra/nascondi password verificati, quindi banco su questo PC aggiornato **localmente** all'app ACA0.9.35. Wrapper **`ghcr.io/acamemo/acasystem:0.9.35.99`**, digest **`sha256:96246f88be6827d94bb728ddf4d64888c3435c610d5fe2ae871104ef26656c05`**; snapshot1738file, SHA256 **`5730001fe4f3fa43a23872258716950a8a506ea1b7860045ffc98223e2982b7f`**. Nessun push, catalogo o nuova release: la pubblica0.9.34 di U55 sotto è invariata.

L'override locale è [`backup/rep021/compose-ui-local.yaml`](../backup/rep021/compose-ui-local.yaml), da affiancare a [`progetto/compose.tunet.yaml`](../progetto/compose.tunet.yaml). Il file `.env` di base conserva0.9.34; il solo compose principale riporta quindi alla pubblica0.9.34, non mantiene la prova0.9.35. Dalla radice del repository, per riavviare il banco con l'override già predisposto:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep021/compose-ui-local.yaml up -d --no-build --pull never tunet
```

Indirizzi invariati: **http://192.168.1.11:3002/** per PC/iPhone in LAN e **http://127.0.0.1:3002/** dal solo PC. Prima dell'aggiornamento: backup a freddo454.774byte in `backup/rep021/cold-bank-pre-ui/aca-data-pre-ui.tgz`, SHA256 **`292976360463a5c2c06e1d788a5bc0db0f9cd8bd5ed48852424520aec8e55b7d`**. Integrità SQLite ok; tutte le26tabelle conservano hash/conteggi. HA/D1 mantengono ID e ora di avvio, nessuna VM coinvolta o credenziale/account creati. QA in sola lettura sul banco reale con Chromium desktop/telefono emulato:2PASS, senza POST, WebSocket o richieste esterne. Questo non è un collaudo su iPhone/Safari fisico.

## U55, 2026-11-02 — ACA0.9.34 pubblicata e banco di questo PC aggiornato

[Report013](reports/REP-20261102-013-pubblicazione-0.9.34-aggiornamento-centrale.md) e [guida PC/iPhone](riprogettazione/blocchi/03-profili-client-tavano-prova.md). La [release pubblica v0.9.34](https://github.com/acamemo/acasystem-releases/releases/tag/v0.9.34), ID **431854516**, contiene otto asset verificati: sorgenti, web, manifest, bootstrap, istruzioni, provenienza e checksum. ZIP Windows/APK Android revisione2 restano materiali locali, non asset pubblici. La revisione0.9.34.99 sotto resta soltanto il precedente wrapper di validazione.

Immagine pubblica **`ghcr.io/acamemo/acasystem:0.9.34`**, linux/amd64, digest **`sha256:69eb0d6a389e850ab591a508108b39c47b8494eccd8b0fc33cbd57736e1df2d4`**. Snapshot pubblicato:1735file, SHA256 **`813208fb0073515dd62e9447adc4b2e1308692ec4b855be03f4c1191a556316d`**; catalogo al commit **`ff77efe8788faeb2a442ce0a5aecd8fb6d20e980`**. Originali QA locali preservati, cinque note escluse dall'archivio pubblico; bundle web invariato rispetto a REP012. MinServer0.9.34/minShell0.1.0, download anonimi e SHA verificati. Il bootstrap pubblicato resta di prima installazione/ripetizione della stessa versione: non aggiorna automaticamente una versione ACA diversa.

Target scelto dall'utente: **il banco su questo PC**, servizio ACA `aca-tunet-tunet-1`, aggiornato0.9.32→0.9.34. Compose ora usa il wrapper pubblico con bundle; binding puntuale sull'attuale **192.168.1.11**, mantenendo loopback. Indirizzo LAN comune PC/iPhone **http://192.168.1.11:3002/**; **http://127.0.0.1:3002/** è disponibile soltanto dal PC. Servono PC acceso e stessa rete locale; il banco non è una centrale mini PC installata né un servizio remoto.

Backup consistente prima dell'aggiornamento: ACA fermo ordinatamente e volume `aca-tunet_tunet-data` copiato a freddo in `backup/rep020/cold-bank-pre-0.9.34/aca-tunet-data-pre-0.9.34.tgz`, **451.635byte**, SHA256 **`113f84fa984859d3cb2562fd5222544f670c122c117ba4d4f25d3d7ae242d064`**. Verifica tmpfs/SQLite riuscita; dopo l'avvio nove tabelle precedenti conservano hash e conteggi, incluse12configurazioni correnti e188revisioni. Vecchia immagine/compose e volume aggiornato restano conservati. Per un recupero futuro fare anche una copia dei dati successivi e ripristinare su un volume separato, senza sovrapporre il backup a un database in uso; rollback non eseguito.

HA Container2026.9.4 e D1 non aggiornati o riavviati. HA richiedeva già il proprietario prima di U55: la prima configurazione nella webapp ACA spetta all'utente e non dimostra una perdita causata dall'upgrade. Nessuna credenziale reale acquisita dall'agente, nessun account creato o comando fisico inviato. Identità tecnica per i membri predisposta dal percorso esistente dopo il proprietario.

Per rendere il banco raggiungibile dall'iPhone è stata aggiunta con elevazione UAC soltanto **`ACA-System-LAN-3002`**: TCP3002 in ingresso, profilo **Private**, indirizzo locale192.168.1.11, remoto **LocalSubnet**, interfacciaWi-Fi, EdgeTraversalBlock. Firewall non disattivato e nessuna apertura verso Internet. La prima conferma positiva dell'iPhone era stata rettificata dall'utente; dopo questa regola il retest è **«Sì, ora compare ACA»**. Schermata raggiungibile, ma accesso, profili e automazioni/comandi su hardware non ancora collaudati. Esiti HTTP/browser e materiali di recupero nel report013. Le sezioni precedenti sotto restano datate al proprio lotto.

## U52–U54, 2026-11-02 — materiali locali profili/client/Tavano

[Report012](reports/REP-20261102-012-profili-client-editing-tavano.md) e [guida](riprogettazione/blocchi/03-profili-client-tavano-prova.md). Web/backend **0.9.34**, shell native **0.1.0** con ZIP Windows/APK debug revisione2. Il minServer del bundle è0.9.34: un contenitore nuovo non aggiorna la vecchia centrale. Le revisioni native precedenti restano conservate, SHA finali in backup/rep019/native-handoff-revisione2.md.

Immagine `aca-system:profili-tavano-local` costruita da snapshot **9a839d40cdbdfd78576546ddd8e61dedac44837661ec549379a1ff3b1fa33ffe** (1740file). Runtime include `contracts/` oltre al backend. Wrapper locale `ghcr.io/acamemo/acasystem:0.9.34.99`, digest **sha256:c9a8e61f2f049fd742e834f555434975a3fd5d3d698af9749aa11448e6d6331c**, con client-bundle e strumenti HAOS. Output `progetto/ha-app/out/0.9.34.99`, provenienza/7checksum/ZIP sorgenti verificati. Revisione99 di sola validazione, non release pubblicata; nessun push/catalogo/bootstrap pubblico aggiornato.

Primo avvio v2 su database file crea `checkpoints/aca-before-v2-*.db` prima delle nuove tabelle; conserva fonti legacy e impedisce loro di aggiornare profili migrati. Il checkpoint non è una procedura di rollback di una centrale in uso. Pulizia Tavano iniziale, oraria e al superamento quote logiche; database/indici/WAL possono mantenere spazio allocato riusabile dopo le cancellazioni. Il cambio centrale nelle shell conserva solo il database IndexedDB delle bozze/copie profilo e rimuove identità/cache/foto precedenti; il login corretto e il filtro casa/account restano necessari.

QA con HA simulato su loopback e container Linux effimero `--network none`/tmpfs, chiusi a fine incarico. Nessun volume della casa o porta pubblica; container/VM preesistenti conservati. Non eseguiti installazione domestica, prova HA reale, Safari/iPhone o camera Android. Accesso remoto e nuova GUI al boot HAOS restano incarichi distinti.

## U46, 2026-11-02 — sorgenti congelati e strumenti comuni

La mappa attuale è in [architecture](architecture.md), [progetto](../progetto/README.md), [ADR-0034](decisions/ADR-0034-consolidamento-progetti-e-confini.md). client/shared contiene asset shell e packaging; Windows genera generated-shell, Android www. Il copier design rigenera una destinazione dedicata design-aca verificata, senza sovrapporre residui. Le fonti restano ui/design/contracts e dominio launcher, non gli output.

Per un prossimo rilascio, dalla radice Git costruire con `node progetto/ha-app/build-base.mjs --version <versione-approvata>`; il builder congela nomi/byte, usa lo snapshot come contesto Docker e registra SHA/versione nelle etichette. Il prepare richiede corrispondenza con il working tree corrente; `--base-image <tag-locale> --check` permette il solo preflight senza output/contenitori. Il prepare completo richiede Docker e ImageMagick come prima, include strumenti/encoder QR congelati e produce SOURCE-PROVENANCE.json e checksum. Non modificare gli strumenti durante il comando. È un vincolo locale di provenienza, non un'attestazione firmata o build binaria riproducibile.

Verifica U46 con base **aca-system:structure-shared-local**, digest04c4ff01…d2af044 e sourceSHA4e4c93fa…ee0050d1. Wrapper **ghcr.io/acamemo/acasystem:0.9.33.99**, digest845a085d…a778b3, solo prova locale in ha-app/out/0.9.33.99 per preservare gli output pubblicati. **La revisione99 non è una release**; nulla inviato a GHCR/GitHub o installato. Immagini nuove non avviate; tre container preesistenti conservati. Artefatti pubblici0.9.33/r2 e checkpoint VM invariati. Dettagli/hash e verifiche in [REP008](reports/REP-20261102-008-consolidamento-progetti-e-flussi.md).

## U44, 2026-11-02 — sorgenti UI comuni nelle build

[UI condivisa](../progetto/acasystem/ui/README.md) dentro il contesto acasystem, copiata dal Dockerfile prima del frontend; nessun nuovo workspace npm o dipendenza. Strict autonomo con `npm run typecheck:ui`, controlli di confine con `npm run test:ui`; ESLint e controlli grafici includono i sorgenti canonici. React/ReactDOM deduplicati, CSS Tailwind scansiona anche ui/. Il copier design include components/ e layout/ per le shell HTML.

Build frontend/Casa3D/client Windows e web Android riuscite. Immagine locale **aca-system:ui-shared-local**, digest **sha256:d3772ac6c4b07749062e545115ce3eb199cbf0bf5bc2cb8008864c8787978053**, costruita senza avvio/deploy. I pacchetti ZIP/APK U42 non sono stati ricompilati; [report006](reports/REP-20261102-006-ui-movimento-layout-condivisi.md) distingue build e materiali storici. Release pubblica0.9.33/bootstrap r2 e container/VM preesistenti invariati.

## U42, 2026-11-02 — asset design comuni nelle build

Fonte condivisa in [progetto/acasystem/design](../progetto/acasystem/design/README.md), [ADR-0032](decisions/ADR-0032-design-condiviso-workspaces.md). Frontend importa i rimandi alla fonte; Dockerfile copia design dentro il builder, senza ampliare il contesto progetto/acasystem. Il raccoglitore sorgenti di ha-app comprende già questa cartella nel perimetro acasystem. Il copier comune genera asset autonomi per Windows/Android; nessun font o CSS scaricato da servizi terzi all'avvio delle shell.

Build di verifica **aca-system:design-shared-local**, digestf41da64f…958cd7, non avviata né pubblicata. [ZIP Windows/APK e guida](riprogettazione/blocchi/02-design-aca-condiviso.md); hash ed evidenze in [REP-20261102-005](reports/REP-20261102-005-design-aca-condiviso-workspaces.md). Artefatti e font condivisi verificati dopo packaging. Nessun cambiamento a server installati, versioni pubbliche0.9.33/r2, VM o servizi preesistenti. Il design comune non installa un ambiente grafico HAOS.

## U39, 2026-11-02 — bootstrap r2 e banco VM isolato

Usare [bootstrap-haos-r2.sh](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/bootstrap-haos-r2.sh) e [BOOTSTRAP-r2.md](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/BOOTSTRAP-r2.md), checksum SHA256SUMS-r2 nella stessa release. Il vecchio script cerca addon_ e fallisce al QR sul Supervisor2026.10.5; r2 riconosce app_ attivo e legacy. Quattro asset aggiunti, sette originali/digest e immagine/catalogo conservati. Installazione dal catalogo, seconda esecuzione e QR verificati nella VM, download pubblici r2 verificati. Dettagli in [REP-20261102-004](reports/REP-20261102-004-prova-bootstrap-su-vm-haos.md).

Banco nuovo `ACA Bootstrap 0.9.33 - REP014`, UUID915e6be2-39ee-4aee-96b1-552da67f85f9; clone separato HAOS18.4/Core2026.10.4/Supervisor2026.10.5,1CPU/2GB nella prova riuscita. Conservato **saved** dopo ACPI senza arresto, nessuna VM di prova in esecuzione. Al riavvio del banco: browser locale `http://127.0.0.1:49302/`; QR `http://10.0.2.15:3002/` solo interno NAT, non usabile da un telefono sulla LAN. Tre VM precedenti non avviate/configurate; VDI pulito immutato. Docker Desktop e gli stessi tre container del banco iniziale ripristinati; bridge/browser QA chiusi. Nessun account creato o porta Internet aperta. VM e H24 non adottati come architettura del prodotto.

## U38, 2026-11-02 — distribuzione ACA 0.9.33 pubblica

Pubblicazione autorizzata e conclusa in [REP-20261102-003](reports/REP-20261102-003-pubblicazione-aca-0.9.33.md). Immagine **ghcr.io/acamemo/acasystem:0.9.33**, digest **sha256:99816f0c8d9751d0f920d910608e74b7e54ae1b03b96e6fa385ac62fe112c9e2**, scaricabilità anonima verificata. Catalogo pubblico `acamemo/acasystem-releases` aggiornato nel commit6171905ee7c2e82b81c8f28097a935ed1e260b65 dopo il push. [Release v0.9.33](https://github.com/acamemo/acasystem-releases/releases/tag/v0.9.33) latest con sette asset, tutti riscaricati senza credenziali e verificati per SHA. Sorgenti aggiornati soltanto per README bootstrap (SHA43bf723a…08b336dd); immagine/web/script immutati. Pacchetti nativi Windows/APK restano locali.

Lo script pubblico è **post-installazione HAOS18.4**, non un installer del disco. Il prossimo passo è il collaudo sul mini PC fisico; nessuna centrale, VM, porta remota o servizio aggiuntivo attivati con questa pubblicazione. Le note U37 seguenti conservano lo stato locale precedente.

## U37, 2026-11-02 — client IP e bootstrap ACA dopo HAOS

Direzione confermata e implementazione locale in [REP-20261102-002](reports/REP-20261102-002-ripristino-client-mini-pc-e-onboarding-web.md), [ADR-0031](decisions/ADR-0031-ritorno-mini-pc-client.md). Mini PC con HA/ACA predisposti; Windows/Android collegano IP/QR e usano owner/login nella webapp. Versione locale ACA/web **0.9.33**; shell native ancora0.1.0 secondo il contratto minShell. Nuovo desktop esclude motore VM e VDI; esperimento conservato nei sorgenti/checkpoint.

`progetto/ha-app/prepare.mjs --version 0.9.33` costruisce l'addon e include il bundle frontend/Casa3D pre-login, estratto dalla stessa immagine base. In `progetto/ha-app/out/0.9.33/`: config repository, immagine locale GHCR, sorgenti, web ZIP/manifest, bootstrap e SHA256SUMS. Nulla pubblicato. Encoder QR2.0.4 già presente e relativa licenza inclusi come utility dell'immagine, senza nuove dipendenze/versioni.

Il bootstrap `progetto/ha-app/bootstrap/bootstrap-haos.sh` va eseguito dall'operatore sulla console host root di **HAOS18.4 già installato**, con `--ip <IPv4 privato> --version 0.9.33`; `--dry-run` non esegue HA/rete/Docker. Il Supervisor acquisisce il repository GitHub fisso, verifica la versione disponibile, installa/avvia soltanto se necessario, poi health e QR console senza account/token. Non installa HAOS o scrive dischi, non aggiorna automaticamente versioni diverse e rifiuta un catalogo senza0.9.33. **Pubblicare immagine e repository aggiornato prima dell'uso reale**, dopo autorizzazione. [Guida](riprogettazione/blocchi/01-mini-pc-client-e-onboarding-web.md), [bootstrap](../progetto/ha-app/bootstrap/README.md).

Docker Desktop già installato è stato avviato per build/QA; ha riavviato automaticamente tre container del banco precedente, non riconfigurati o aggiornati. Creati separatamente `aca-rep012-ha` (HA2026.10.4, loopback48124) e `aca-rep012-server` (ACA0.9.33, loopback48302), con label di proprietà e restartno; entrambi arrestati al termine con guardiaID/label. Le VM VirtualBox accantonate non sono state avviate. Nessuna installazione su mini PC fisico, pubblicazione, accesso remoto o continuità H24 attestati.

## Direzione corrente U36, 2026-11-02 — mini PC centrale, filone VM conservato

[ADR-0031](decisions/ADR-0031-ritorno-mini-pc-client.md) registra il ritorno a desktop/Android client dell'IP del mini PC con HA/ACA. VM desktop e confronto VMware accantonati su richiesta umana, senza disinstallazione o cancellazione dati. Checkpoint codice/documenti verificato in `backup/checkpoints/2026-11-02-pc-vm-accantonato/`, [report](reports/REP-20261102-001-ritorno-mini-pc-e-accesso.md); grandi dischi/pacchetti preservati nei percorsi originali, non inclusi nello ZIP sorgenti.

VMware non rilevato come installato e non provato; clone VMDK presente/verificato e originale intatto. Nessuna VM o servizio avviati/modificati in questa analisi. Le distribuzioni correnti conservano ancora il comportamento dell'esperimento: il flag Windows può avviare VM e Android è QR-first senza configurazione. Ripristino del client IP e collocazione onboarding/accesso ancora da eseguire/decidere. Proposta webapp condivisa richiede ACA disponibile prima del proprietario; il mini PC predisposto non è una configurazione già realizzata. Le sezioni seguenti sono storico delle prove, non attività da riavviare.

## U34, 2026-10-30 — riavvio Windows provato, difetto ancora presente

L'utente conferma «riavviato»: boot host effettivo alle **17:28:53 Europe/Rome**, successivo all'installazione U33. Ripetuto il cold boot dall'EXE corrente con VirtualBox **7.2.22r175245**, default/KVM, CPU4/4096 MB/HPET off, senza variazioni a sicurezza, energia o codice. Modulo proprietario vuoto pronto in **53,645 s**, app chiusa senza creare account.

Intervallo di **300,016 s** senza richieste HTTP, tick guest, finestra ACA o debugger periodico; clock globali letti solo ai confini. Virtual avanza di 300,099272 s, Real di 300,100 s, ma **VirtSync solo di 120,311255 s**. Log nuovo: catch-up abbandonato di **179,789609 s**, heartbeat mancante da **179 s**. Console con watchdog timeout di systemd-resolved e terminazione anomala di systemd-journal. Il riavvio non ha eliminato il difetto nel campione; causa unica e affidabilità prolungata non dimostrate.

Arresto ordinato `host shutdown`, **poweroff confermato alle 17:41:08**; zero VM in esecuzione al controllo finale. Identità/disco ACA conservati, configurazioni storiche byte-identiche, nessun ripristino del disco o nuovo account. Nessun ulteriore riavvio richiesto come rimedio. Evidenze separate `backup/rep010/postreboot-20261030/`, [report010](reports/REP-20261030-010-rallentamenti-vm-windows.md#ripresa-u34-dopo-riavvio-windows-2026-10-30); ISSUE-129 aperta. Ulteriore confronto controllato del motore da decidere, nessun nuovo stack installato o adottato. Le sezioni U33 seguenti conservano lo stato precedente alla prova dopo riavvio.

## Aggiornamento host autorizzato, 2026-10-30 — VirtualBox 7.2.22 installato

Fonte umana: [U33](riprogettazione/diario/2026-10-30.md#u33-aggiornamento-virtualbox-autorizzato), «Sì, aggiorna e riprova la VM». L'autorizzazione estende [REP-20261030-010](reports/REP-20261030-010-rallentamenti-vm-windows.md) all'aggiornamento del software host e alle successive prove ACA, preservando VM storiche e configurazioni, senza disattivare Hyper-V/sicurezza o forzare il riavvio del PC.

Il coordinatore ha eseguito l'installer Oracle già verificato `VirtualBox-7.2.22-175245-Win.exe`, con elevazione UAC. Avvio registrato **2026-10-30 14:10:14.658 UTC**, conclusione **14:10:45.082 UTC**, exit code **0**; entrambi i `MainEngineThread` del log MSI terminano con `0`. Parametri usati, rappresentati dalla directory `backup/rep010/virtualbox-update-proposal/`:

```powershell
& .\VirtualBox-7.2.22-175245-Win.exe --silent --msiparams "REBOOT=ReallySuppress VBOX_START=0" --msi-log-file "install-7.2.22.log"
```

Non è stata effettuata una disinstallazione manuale: l'MSI gestisce l'upgrade dalla versione precedente. `VBOX_START=0` evita l'apertura automatica della GUI; `REBOOT=ReallySuppress` sopprime i riavvii MSI. Non è stato usato `--ignore-reboot`, che nasconderebbe l'eventuale codice `3010`. In questa installazione non è stato richiesto né eseguito un riavvio; il controllo successivo non rileva un riavvio pendente.

Il controllo delle **14:12:21.882 UTC** legge CLI **7.2.22r175245**. SHA-256 dei file di configurazione delle tre VM invariati rispetto al pre-installazione; marker di proprietà ACA corrispondente. Al controllo, **ACA System Motore** è ancora `poweroff`, le due VM storiche restano `aborted`. Copie e riscontri selezionati sono in `backup/rep010/virtualbox-update-proposal/`: `configs-before-update/`, `immediate-preinstall/`, `install-process.json`, `install-result.json`, `install-7.2.22.log` e `post-install-check.json`.

Il controllo sopra attesta il checkpoint dell'installazione a VM ferma; gli esiti delle prove successive sono registrati qui sotto e nel report010. I riferimenti a 7.2.4 e all'installer soltanto preparato nei blocchi storici seguenti conservano lo stato precedente a U33.

Fonti primarie verificate il 2026-10-30: [Oracle, installazione Windows e proprietà MSI](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/installation.html), [stub dell'installer nel tag v7.2.22](https://github.com/VirtualBox/virtualbox/blob/v7.2.22/src/VBox/Installer/win/Stub/VBoxStub.cpp), [sequenza di upgrade MSI v7.2.22](https://github.com/VirtualBox/virtualbox/blob/v7.2.22/src/VBox/Installer/win/VirtualBox.wxs), [Microsoft, proprietà REBOOT](https://learn.microsoft.com/en-us/windows/win32/msi/reboot). Il risultato osservato viene dai riscontri locali, non dalla sola documentazione dell'installer.

### Esito delle prove U33: problema dei timer non risolto

**Aggiornamento software eseguito; confronto sull'affidabilità negativo.** Due partenze a freddo dall'EXE con **7.2.22r175245**, stesso profilo default/KVM, 4 CPU, 4096 MB, HPET off e affinità completa hanno raggiunto il modulo proprietario vuoto in **59,134 s** e **53,769 s**; una riapertura a caldo in **2,887 s**. Nessun account è stato creato. Questi avvii riusciti non compensano le anomalie successive in background.

| Misura dopo l'aggiornamento | Riscontro |
|---|---|
| Primo run, richieste HTTP | 473/473 risposte 200 in circa 472,432 s; p95 7,891 ms, massimo 26,045 ms. Listener e worker della VM ACA verificati, nessuna risposta attribuita a un servizio diverso. |
| Primo run, tempo guest | 300 campioni in una finestra distinta di 335,399 s; rapporto uptime guest/tempo host monotono 0,999973, massimo intervallo 3,162 s. Non sono 300 secondi né l'intera finestra HTTP. |
| Primo run, log e idle | Ripetuti catch-up TM di circa 60 s anche mentre HTTP risponde; a sonde sospese compare anche heartbeat mancante di circa 30 s. |
| Primo run, domini del clock in idle | In 90,112 s host, Virtual avanza di 90,112407 s e VirtSync soltanto di 0,036735 s. Il tempo Virtual normale non implica che il clock dei timer sincronizzati sia sano. |
| Secondo run, senza sonde continuative dopo la chiusura dell'app | Alla lettura di fine finestra, a uptime VM circa 4 min 40 s e dopo circa 3 min 50 s senza nostre sonde, catch-up di 154,576 s e heartbeat mancante da circa 154 s. L'interrogazione può rendere visibile il recupero: il timestamp della lettura non identifica necessariamente l'inizio dell'anomalia. |

Il confronto QoS **non è stato applicato**. La guardia dell'helper si è fermata prima di qualsiasi Set: CIM non espone percorso/command line del worker protetto. Una verifica separata di sola apertura handle consente QUERY_LIMITED `0x1000`, ma nega SET_INFORMATION+QUERY_LIMITED `0x1200` con errore nativo **5, Access denied**. Zero modifiche alle policy; nessuna elevazione/SeDebugPrivilege o rimozione delle guardie per forzare l'accesso. Non è stato eseguito il confronto di 180 s con QoS modificata. Evidenze selezionate in `backup/rep010/postupdate-qos/`.

Misure e log sono conservati in `backup/rep010/rep010-postupdate-2026-10-30T14-17-04-439Z/`, nelle cartelle `rep010-postupdate-cold1-app-*`, `rep010-postupdate-warm1-app-*`, `rep010-postupdate-cold2-app-*` e nei file `rep010-postupdate-cold2-clocks.txt`/`rep010-postupdate-cold2-stats.xml`. La lettura del [Time Manager 7.2.22](https://github.com/VirtualBox/virtualbox/blob/v7.2.22/src/VBox/VMM/VMMR3/TMR3.cpp#L2730) non equipara il catch-up a una pausa globale della VM; il [timer LAPIC software](https://github.com/VirtualBox/virtualbox/blob/v7.2.22/src/VBox/VMM/VMMR3/target-x86/APICR3-x86.cpp#L1202) dipende però da VirtualSync. HTTP e TSC sani non rendono quindi irrilevante la controevidenza sui timer. Fonti consultate il 2026-10-30; dettagli nel report010.

Dopo il secondo run, arresto ordinato della sola VM ACA richiesto intorno alle **16:04 Europe/Rome**, S5 osservato nel log intorno alle **16:04:15** e stato **poweroff confermato alle 16:05:44 del 2026-10-30**. Nessun arresto forzato. Sicurezza/Hyper-V e VM storiche restano invariati. L'aggiornamento U33 è già autorizzato ed eseguito; non è più una proposta da approvare. Il prossimo confronto proposto è dopo un **riavvio completo di Windows effettuato dall'utente quando il lavoro è salvato**, poi nuovo avvio a freddo/idle con lo stesso profilo. È una prova di stato host pulito, non un riavvio richiesto dall'MSI né una soluzione garantita. Nessun riavvio automatico del PC eseguito.

## Centrale Windows dedicata, 2026-10-30

Su richiesta U27-U30, [REP-20261030-009](reports/REP-20261030-009-windows-vm-automatica-design-condiviso.md), è stata creata **ACA System Motore**, UUID `17595a8d-355d-4c72-b4e5-38a60762f900`. VirtualBox 7.2.4 era già installato. HA OS 18.4 e Core 2026.10.4 effettivamente avviati; ACA locale 0.9.31 installata e provata. Le VM storiche `acasystem-ha` e `acasystem-ha-s45` non sono adottate da questa installazione.

Il registro `%APPDATA%/Acasystem/engine/owned-vm.json` lega UUID, marker di proprietà, file di configurazione e disco operativo `haos.vdi`. Il lifecycle verifica questi dati prima dei comandi. Avvio headless dall'app; chiusura della finestra lascia la VM in esecuzione. Nessun servizio prima del login Windows, modifica della sicurezza Windows o aggiornamento VirtualBox eseguiti. Sul PC attuale quattro CPU virtuali e 4096 MB hanno consentito il boot dopo il blocco iniziale con due CPU; non è una garanzia per altri host o per esercizio H24. Durante la prova sono comparsi stall RCU/journald nel guest: stabilità prolungata non collaudata.

NAT: `127.0.0.1:8123` → guest `80` per HA e `127.0.0.1:3002` → guest `3002` per ACA. Il client configura inoltre l'inoltro ACA sul singolo IPv4 privato della scheda fisica selezionata: nel banco `192.168.1.27:3002`. Nessun bind pubblico o wildcard. Firewall e collegamento da Android reale non attestati; nessun servizio remoto attivato.

Il pacchetto Windows contiene il VDI iniziale pulito e il sorgente dell'app locale fuori ASAR, in `resources/engine`. Il bootstrap copia l'archivio verificato nel guest in `/mnt/data/supervisor/apps/local/acasystem`; slug `local_acasystem`, avvio iniziale manuale per creare prima il proprietario personale. L'onboarding ACA abilita poi avvio automatico/watchdog e avvia il backend. Il frontend client viene dalla stessa centrale con manifest e SHA-256, senza pubblicare questa versione su GitHub. La build locale Docker iniziale richiede Internet; non è una distribuzione offline o una build completamente fissata per digest.

Materiali e hash, snapshot pre-owner di prova, ripristino e controlli finali sono nel report. [Istruzioni per aprire l'app](riprogettazione/blocchi/01-pc-vm-prova-app.md), [design e Android](riprogettazione/blocchi/02-design-e-qr-client-implementazione.md). Non cancellare il disco operativo o il registro per ripetere il primo avvio; la rimozione dell'account temporaneo della QA è stata effettuata ripristinando una copia precedente a quell'account, soltanto sulla nuova VM di prova.

### Aggiornamento 2026-10-30 — esperimenti sui rallentamenti non adottati

L'indagine [REP-20261030-010](reports/REP-20261030-010-rallentamenti-vm-windows.md), ancora in attesa del prossimo intervento autorizzato, non ha individuato un rimedio affidabile. I confronti hanno interessato soltanto la nuova VM ACA; Hyper-V, sicurezza dell'host e altre VM non sono stati modificati. Un breve avvio KVM pulito non aveva riprodotto il difetto, quindi le pause storiche non sono attribuite con certezza a una causa unica.

| Esperimento locale | Osservazioni e controevidenze |
|---|---|
| None, 4 CPU, HPET off | Finestre sane di oltre 14 minuti e di 23 min 54 s; un successivo cold boot resta bloccato prima della schermata proprietario. None da solo non è adottato. |
| None, 4 CPU, HPET on | HA raggiungibile, ma circa 645 s guest dopo circa 100 s host, watchdog e heartbeat mancante. Prova scartata. |
| None, 2 CPU, HPET off | Rapporto tempo guest/host circa 0,240 e catch-up del timer da 60 s; risposte HTTP sane non dimostrano correttezza del tempo guest. Prova scartata. |
| None, 4 CPU, HPET off, affinità iniziale ai P-core | Primo campione a regime: rapporto guest/host 0,999976; nei successivi 99 s di idle, ritardo VirtualSync circa 0,212 → 0,252 ms. Durante lo shutdown compare però un catch-up di circa 68 s; nel secondo cold boot manca l'heartbeat per circa 52,5 s. Affinità non adottata. |

Lo starter provvisorio e le patch None/HPET sono stati invertiti, conservando la proposta in `backup/rep010/proposed-affinity-starter/`. Il coordinatore ha ricompilato e confrontato il manager con la baseline precedente: `ownedHaVm.js` byte per byte identico, SHA-256 `5B3FA92F6E5A29A267992A8FB2EB80B1B2C0D2772FA8BEFE140074B76A2C198A`. Non rimane uno starter con affinità nel prodotto; il codice riprende l'avvio VirtualBox ordinario senza forzare None. Le osservazioni non attestano risoluzione del bug, stabilità H24 o prestazioni garantite.

Stato finale della sola VM di prova, ripristinato dal coordinatore: stesso UUID e disco, copia precedente alla QA web senza proprietario temporaneo (SHA-256 `c8fb078c1808c49afba291fdc63412318372ada950bc1e67fc46009fcea3acce`), **default/KVM, 4 CPU, 4096 MB, HPET off, poweroff**. Le VM storiche sono rimaste inalterate durante questo intervento.

VirtualBox installato resta **7.2.4**. È stato soltanto preparato l'installer ufficiale **7.2.22 build 175245**, 178.101.352 byte, SHA-256 `afd0ff1656cbe04ed88ce619594ae021419d97cce89fa9bdc443e9a963f1713f`, corrispondente a SHA256SUMS Oracle; firma Authenticode osservata **Valid**, Oracle America, Inc. Materiali e verifica in `backup/rep010/virtualbox-update-proposal/`, fonte [directory Oracle 7.2.22](https://download.oracle.com/virtualbox/7.2.22/), verificata il 2026-10-30. L'installer non è stato eseguito. La prova con aggiornamento del software host richiede autorizzazione esplicita e non garantisce la soluzione del difetto; nessuna elevazione o riavvio host eseguiti.

Contesto delle ipotesi, fonti primarie consultate il 2026-10-30: [discussione HA OS 2292](https://github.com/home-assistant/operating-system/discussions/2292), [PR documentale 25445 chiusa senza integrazione](https://github.com/home-assistant/home-assistant.io/pull/25445), [segnalazione VirtualBox 370](https://github.com/VirtualBox/virtualbox/issues/370). Sono segnalazioni e workaround da confrontare, non diagnosi dimostrate di ACA o raccomandazioni generali.

Le sezioni successive sono lo storico dei banchi precedenti, non l'identità o la configurazione di questa nuova centrale.

Aggiornato: 2026-10-27 sera (banco **0.9.32** su **192.168.1.27:3002**, dal Tab M11 via USB su `localhost:3012`, vedi «Banco 0.9.32, 2026-10-27» sotto; prima: 2026-10-26 pomeriggio, banco **0.9.30** spostato su **192.168.1.19:3002**, vedi «Banco 0.9.30 spostato su 192.168.1.19» sotto; app di HA OS sulla VM `acasystem-ha`, vedi «Acasystem come app di HA OS sulla VM»; prima: banco **0.9.30** su 192.168.1.7:3002, vedi «Banco 0.9.30» sotto; precedente: banco **0.9.29** su 192.168.1.7:3002, vedi «Banco 0.9.29» sotto; precedente: banco **0.9.28** su 192.168.1.7:3002 dal mattino del 2026-10-26, vedi «Banco 0.9.28 spostato su 192.168.1.7» sotto; installato su 192.168.1.27:3002, vedi la voce «Aggiornamento — banco 0.9.28, 2026-10-26»; precedente: banco **0.9.27** su 192.168.1.7:3002, vedi la voce «banco 0.9.27» sotto; precedente: banco **0.9.26** su 192.168.1.27:3002, vedi la voce «banco 0.9.26» sotto; precedenti: Pressione lunga e trascinamento: banco **0.9.24** su 192.168.1.27:3002, vedi la voce «REP-20261021-003 — banco 0.9.24» sotto; Ripristino D-2/D-8 e widget: banco **0.9.23** su 192.168.1.27:3002, vedi la voce «REP-20261021-003 — Ripristino, banco 0.9.23» sotto; Interazioni G3-G5 e C1-C3: banco **0.9.22** su 192.168.1.7:3002, vedi la voce «REP-20261021-003 — G3-G5 e C1-C3, banco 0.9.22» sotto; Casa 3D R1: banco **0.9.21** su 192.168.1.7:3002, vedi la voce «REP-20261021-002 — Casa 3D, R1, banco 0.9.21» sotto; Interazioni G1-G2: banco **0.9.20** su 192.168.1.7:3002, vedi la voce «REP-20261021-003 — G1-G2, banco 0.9.20» sotto; Casa 3D T6: banco **0.9.19** su 192.168.1.7:3002, vedi la voce «REP-20261020-002 — Casa 3D, T6, banco 0.9.19» sotto; la voce «T6, persistenza» descrive le novità di infrastruttura; banco **0.9.18** su 172.20.10.6:3002, vedi la voce «REP-20261020-002 — Casa 3D, T5, banco 0.9.18» sotto; la 0.9.17 su 192.168.1.27:3002 è nella voce «REP-20261020-002 — Casa 3D, T3, banco 0.9.17»; la 0.9.16 è nella voce «REP-20261020-001 — banco 0.9.16»; la 0.9.15 è nella voce successiva; il resto è storico: banco 0.9.14 su 192.168.1.27:3002, vedi la voce «REP-20261019-003 — banco 0.9.14» sotto; la 0.9.13 è nella voce successiva e anche gli indirizzi 192.168.1.7 delle voci 0.9.11-0.9.13 sono storici; la 0.9.12 è nella voce successiva; il resto di questa riga è storico, 2026-10-15). Banco locale **Acasystem 0.9.10**, healthy su `http://192.168.1.19:3002`, con backup/ripristino verificati e venti tipi collaudati in isolamento. Fonte corrente: [REP-20261015-003](reports/REP-20261015-003-widget-operativi.md). M11/ISSUE-062 e prove manuali restano aperti; HA non aggiornato. Le voci successive conservano lo storico datato.

## Banco 0.9.32, 2026-10-27 (sera)

Richiesta dell'utente del 2026-10-27: «fallo», sul piano «commit e invio su GitHub; banco di nuovo raggiungibile e aggiornato; prova col dito sul tablet».
- **Stato di partenza:** il compose legava il banco a `192.168.1.19:3002`, ma il Wi-Fi del PC era `192.168.1.27` («PosteMobile-40713171»). Docker dava il container 0.9.30 «healthy» ma senza porte pubblicate, e `/api/health` non rispondeva neppure su `127.0.0.1:3002`.
- **Codice:** commit `2d1216c` (giro 4 della 0.9.28, 0.9.29, 0.9.30) sopra `700575d`; l'immagine contiene anche D1, «Rileva dispositivi» e le consolle. Controlli prima del commit, sull'albero completo:
  - frontend: typecheck, lint, tipografia e colori; Vitest 231 file e 3431 test, in 4 parti;
  - backend: typecheck, lint, 33 file e 523 test (1 saltato).
- **Copie prima:**
  - `backup/banco/compose.tunet-pre-ip27-20261027.yaml`;
  - copia a freddo `backup/banco/tunet-data-pre-0.9.32-freddo.tgz`, 456101 byte, SHA-256 `4f9505bba211af84f866ff120cb8fdfd7b4f79cafa3c7d803261acfd147b546a`, con il container fermo. Lo stop è finito con il codice 137 (arresto forzato dopo circa 3 s: segnale 15 alle 20:56:31, segnale 9 alle 20:56:34, da `docker events`), quindi la copia contiene anche `tunet.db-wal` e `tunet.db-shm`.
- **Modifiche:** binding LAN da `192.168.1.19` a `192.168.1.27` in `progetto/compose.tunet.yaml`, con il commento datato e l'indirizzo dell'intestazione del commento riportato a `192.168.1.27`; `ACASYSTEM_VERSION=0.9.32` in `progetto/.env` e nei controlli e2e (questi nel commit). Comando: `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d --build`.
- **Esiti:** container `aca-system:0.9.32` healthy, con le porte `127.0.0.1:3002` e `192.168.1.27:3002`; `/api/health` 0.9.32 su entrambe.
- **HA del PC partito su una cartella vuota:**
  - `/ha/auth/providers` e `:8123/auth/providers` davano 400, e `/api/onboarding` chiedeva la configurazione iniziale;
  - il PC non è stato riavviato: l'ultimo avvio di Windows è del 2026-10-26 alle 05:05. Alle 18:20:56 del 2026-10-27 è ripartito Docker Desktop, e con lui i container;
  - il container `homeassistant`, avviato alle 18:21, vedeva in `/config` una cartella nuova e vuota. La sorgente del bind è `/mnt/c/homeassistant/config` nella macchina WSL di Docker, probabilmente non ancora pronta in quel momento [valutazione]. La configurazione vera in `C:\homeassistant\config` era intatta;
  - `docker restart homeassistant` (arresto forzato dopo circa 3 s, codice 137): dopo il riavvio `.storage` è quello vero, `/auth/providers` risponde 200 sia diretto sia dal proxy, `/api/onboarding` 404 (configurazione già fatta). È lo stesso caso del 2026-10-26 mattina;
  - **da sapere:** dopo ogni avvio o riavvio di Docker Desktop, anche dopo un riavvio del PC, controllare `http://127.0.0.1:8123/api/onboarding` (404 se tutto è a posto).
- **Tablet:**
  - il Tab M11 (192.168.1.32, stessa rete e stesso access point) non raggiunge `192.168.1.27:3002` né `:8123` (`nc` in timeout), mentre il PC raggiunge il tablet;
  - causa probabile [valutazione, non provata cambiando le regole]: le sole regole d'ingresso abilitate per `com.docker.backend.exe` sono per il profilo «Pubblico» (TCP e UDP), e questa rete è «Privata». Le impostazioni di Windows non sono state toccate;
  - strada usata: `adb reverse tcp:3012 tcp:3002`, scheda di Chrome su `http://localhost:3012/` con la pagina di accesso e `/api/health` 0.9.32. L'accesso lo fa l'utente;
  - gli inoltri `3002`, `3007` e `8123` dell'altra chat non sono stati toccati: oggi `localhost:3002` del tablet porta al suo inoltro verso la VM `acasystem-ha-s45`. Per questo le schede `localhost:3002` del tablet non sono state ricaricate.
- **Non eseguito:** la prova col dito, che fa l'utente.
- **Ritorno indietro:** rimettere `ACASYSTEM_VERSION=0.9.30` in `.env` e ripristinare la copia a freddo nel volume `aca-tunet_tunet-data`, poi `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d` **senza `--build`**: l'immagine 0.9.30 vera è ancora presente (`949bd2de3632`), mentre `--build` ricostruirebbe l'albero attuale con il nome 0.9.30. Tenere il binding su `192.168.1.27` finché il Wi-Fi è questo: la copia del compose ha ancora `192.168.1.19`, che oggi non pubblica nessuna porta.

## Banco 0.9.30 spostato su 192.168.1.19, 2026-10-26 (pomeriggio)

Richiesta dell'utente: «Chiudi l'inoltro, rimetti l'app del tablet sul banco e sistema il banco sul nuovo IP del PC (192.168.1.19) in compose.tunet.yaml.»
- **Causa:** il Wi-Fi del PC è passato a `192.168.1.19` («MeMo Repeater 5 Ghz»), quindi il binding su 192.168.1.7 non era più raggiungibile dalla rete.
- **Copia prima:** `backup/banco/compose.tunet-pre-ip19-20261026.yaml`.
- **Modifica:** in `progetto/compose.tunet.yaml` da `192.168.1.7:3002:3002` a `192.168.1.19:3002:3002`, con il commento datato.
- **Comando:** `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d`, senza build. Stessa immagine `aca-system:0.9.30` (`.env` invariato), volume invariato; non ho fatto una copia a freddo, perché versione e dati non sono cambiati.
- **Esiti:** container ricreato e healthy; `/api/health` 0.9.30 su `127.0.0.1:3002` e su `192.168.1.19:3002`; dal Tab M11 (192.168.1.20) `nc -z 192.168.1.19 3002` aperta; app client sul tablet ricollegata a `192.168.1.19` (porta predefinita).
- **D1 (3003):** non toccato.
- **Ritorno indietro:** rimettere la copia e rieseguire lo stesso comando.

## Acasystem come app di HA OS sulla VM, 2026-10-26 (S3)

Dettagli in [REP-20261026-005](reports/REP-20261026-005-configurazione-automatica-mini-pc.md).
- **VM `acasystem-ha`:**
  - snapshot «prima-app-acasystem»;
  - repository `https://github.com/acamemo/acasystem-releases` aggiunto;
  - app `9960cdb4_acasystem` 0.9.30 installata e avviata (porta 3002, dati in `/data/app`, HA su `http://homeassistant:80`).
- **Incidente:** durante l'installazione la VM si è riavviata da sola, con poca RAM libera sul PC.
- **Raggiungibilità:**
  - dal PC `http://192.168.56.10:3002`;
  - l'IP a ponte `192.168.1.183` non risponde né dal PC né dal Tab M11 (dal tablet anche il Dell non risponde);
  - la prova dal tablet è stata fatta via `adb reverse` più un inoltro temporaneo sul PC, ora chiusi.
- **Per togliere l'app:** dalla console `ha apps uninstall 9960cdb4_acasystem` e `ha store delete 9960cdb4`, oppure snapshot «prima-app-acasystem».

## Banco 0.9.30, 2026-10-26

Banco `aca-system:0.9.30` su **192.168.1.7:3002** (e `localhost:3002` dal tablet con `adb reverse`), sul working tree con la correzione della visibilità delle pile in uso (ISSUE-116: una pila è nascosta solo se lo sono tutti i suoi membri) in aggiunta alla correzione dello scorrimento (ISSUE-117) già nella 0.9.29; nessun commit dopo `4e198c5`. Eseguito da Claude Code (Sonnet 5.5), subagente di un flusso, con gli stessi passi della 0.9.29.

- **Rete:** IPv4 del Wi-Fi del PC 192.168.1.7, uguale al binding LAN di `progetto/compose.tunet.yaml`: nessuna modifica al file.
- **Copia a freddo prima:** `docker compose … stop tunet`, poi `tar czf` del volume `aca-tunet_tunet-data` (montato in sola lettura) in `backup/banco/tunet-data-pre-0.9.30-freddo.tgz`: 455968 byte, sha256 `2c9169c943db14f0a7af19e654be4b35e0e31a983fb7273d7a73f285cb15fdf0`, contenuto `tunet.db`, `tunet.db-wal`, `tunet.db-shm` (`tar -tzf`). Copie di `.env`, `compose.tunet.yaml` e dei due file e2e in `backup/v0929/pre/banco-0930/`.
- **Versione:** `ACASYSTEM_VERSION=0.9.30` in `progetto/.env`, `frontend/e2e/isolated-server.mjs` e `frontend/e2e/release.check.mjs`; `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d --build`.
- **Esiti:** container healthy; `/api/health` restituisce `{"status":"ok","version":"0.9.30"}` su 127.0.0.1 e su 192.168.1.7; `/ha/auth/providers` 200 su entrambi (senza bisogno di riavviare `homeassistant`). Il bundle servito è `index-ZdUuEa41.js`; la versione 0.9.30 compare in Sistema.
- **Tablet (Tab M11, tocco reale con `adb shell input`; schermate e strumenti in `backup/v0929/tablet-banco-0930/`):**
  - chiavi di localStorage di 3002 salvate prima (38 chiavi non sensibili, `ls3002-prima.json`) e identiche alla fine (`ls-check.cjs`: nessuna differenza); le due schede 3002 ricaricate togliendo service worker e Cache Storage (sulla scheda in secondo piano la cancellazione delle cache è andata in timeout, ma il bundle servito è lo stesso, `index-ZdUuEa41.js`);
  - **Multimedia:** la pila con Gruppo multimediale e Apple TV ora si vede (3 widget, nessuna casella riservata; due pallini di pagina); Android TV e Sonos invariati. Il tocco apre «Impostazioni del widget» con «Dispositivo da collegare: Non collegato» e «Cambia». **Scostamento:** l'elenco aperto con «Cambia» è vuoto («Nessuna entità adatta in Home Assistant»), perché l'Home Assistant del banco non espone media player; il foglio «Collega» si apre ma non ci sono dispositivi da mostrare. Chiuso senza scegliere nulla. Dopo il ritorno da Sistema la pila resta visibile (il transitorio osservato con la 0.9.29 non si è ripresentato);
  - **Copertina:** compare la sua pila (orologio più pila, 397×397);
  - **doppio scorrimento rapido** (secondo colpo dopo 0,3 s): 3 prove su 3 in avanti (da Copertina a Clima e meteo, due pagine) e 3 su 3 all'indietro; nel verso opposto torna a Copertina senza salti;
  - **tocco sul «+»** (Principale) apre «Aggiungi un widget», «Annulla» lo chiude; **pressione lunga** sul vuoto apre la vista pagine con «Fine», «Fine» torna all'uso;
  - **Sistema** si apre con l'ingranaggio e mostra 0.9.30; il pulsante «AI» apre l'informativa, «Chiudi» la chiude; «Torna al launcher» riporta alla Principale.
- **Non eseguito:** trascinamento dei widget, pallini e telefono (già provati sulla 0.9.29 e non toccati dalla modifica); prova con dito invece che con eventi di `adb input`.
- **Pulizia:** forward 9225 tolto, resta `adb reverse tcp:3002 tcp:3002`; nessuna scheda aperta da me né origini di prova usate; scheda 3002 in primo piano sulla Principale.
- **Ripristino:** `ACASYSTEM_VERSION=0.9.29` in `progetto/.env` (e nei due file e2e) e `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d --build`; per i dati, `docker compose … stop tunet` e ripristino del volume dalla copia a freddo `backup/banco/tunet-data-pre-0.9.30-freddo.tgz` (stesso procedimento delle copie precedenti).

## Banco 0.9.29, 2026-10-26

Banco `aca-system:0.9.29` su **192.168.1.7:3002** (e `localhost:3002` dal tablet con `adb reverse`), sul working tree con la correzione ISSUE-117 (secondo scorrimento rapido) e la regola (a) di ISSUE-116 (pile fantasma); nessun commit dopo `4e198c5`. Richiesta dell'utente del 2026-10-26: «procedi con (a) e con la correzione dello scorrimento». Eseguito da Claude Code (Sonnet 5.5), subagente di un flusso; l'esito delle prove di misura è in `backup/v0929/tablet/RISULTATI.md`.

- **Rete:** IPv4 del Wi-Fi del PC 192.168.1.7, uguale al binding LAN di `progetto/compose.tunet.yaml`: nessuna modifica al file.
- **Copia a freddo prima:** `docker compose … stop tunet`, poi `tar czf` del volume `aca-tunet_tunet-data` (montato in sola lettura) in `backup/banco/tunet-data-pre-0.9.29-freddo.tgz`: 455767 byte, sha256 `dc36683c17920c33080d25355a3330fcef671c18ab56c185dfaf8f4c24cae7c4`, contenuto `tunet.db`, `tunet.db-wal`, `tunet.db-shm` (`tar -tzf`). Copie di `.env`, `compose.tunet.yaml` e dei due file e2e in `backup/v0929/pre/banco/`.
- **Versione:** `ACASYSTEM_VERSION=0.9.29` in `progetto/.env`, `frontend/e2e/isolated-server.mjs` e `frontend/e2e/release.check.mjs`; `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d --build`.
- **Esiti:** container healthy; `/api/health` restituisce `{"status":"ok","version":"0.9.29"}` su 127.0.0.1 e su 192.168.1.7; `/ha/auth/providers` 200 su entrambi (senza bisogno di riavviare `homeassistant`). Il bundle servito è `index-Ca3bRgmA.js`; la versione 0.9.29 compare in Sistema.
- **Tablet (Tab M11, tocco reale con `adb shell input`; schermate e strumenti in `backup/v0929/tablet-banco/`):**
  - chiavi di localStorage di 3002 salvate prima (38 chiavi non sensibili, `ls3002-prima.json`) e identiche alla fine (`ls-check.cjs`: nessuna differenza); schede ricaricate togliendo service worker e Cache Storage, senza toccare localStorage;
  - **doppio scorrimento rapido** (secondo colpo dopo 0,3 s): 3 prove su 3 nello stesso verso (da Multimedia a Energia, due pagine) e 3 su 3 all'indietro; nel verso opposto torna a Multimedia, senza salti di due pagine;
  - **tocco sul «+»** apre il foglio «Aggiungi un widget», «Annulla» lo chiude; tocco su una casella riservata e sul vuoto: nessun effetto;
  - **pressione lunga** sul vuoto apre la vista pagine con «Fine»; i pallini saltano alla pagina (Casa 3D, Copertina, Multimedia) e lo scorrimento nella vista pagine cambia pagina; pressione lunga su un widget lo seleziona in modifica;
  - **trascinamento** del widget Android TV di quattro colonne con il tocco (CDP `Input.dispatchTouchEvent`, perché `adb input draganddrop` non avvia il trascinamento): fantasma presente, rilascio valido, nessuna sessione rimasta aperta; «Annulla» ha riportato il widget al suo posto e il localStorage è identico;
  - **Sistema** si apre con l'ingranaggio, il pulsante «AI» apre l'informativa e «Chiudi» la chiude.
- **Pagina Multimedia, scostamento dall'attesa:** le due caselle accanto ad Android TV **restano senza «+»** (riservate). La regola (a) riguarda le pile senza alcun widget risolvibile; la pila `stack_mvjd2g21` ha membri con definizione (preimpostati non collegati) e `isCardHiddenByLogic` la nasconde come entità sconosciuta. I widget presenti (Android TV, Sonos) sono invariati. È il caso già annotato in ISSUE-116: per cambiarlo serve una scelta dell'utente, non presa. Subito dopo il ritorno da Sistema la pila è comparsa per un istante come widget visibile (3 widget, 0 riservate) e dopo il successivo scorrimento è tornata riservata: stato transitorio a entità non ancora caricate, già presente prima, non indagato.
- **Non eseguito:** controllo dei pallini con misure di tempo (solo funzionale); prova sul telefono; prova con dito invece che con eventi di `adb input`.
- **Pulizia:** forward 9225 tolto, resta `adb reverse tcp:3002 tcp:3002`; nessuna scheda aperta da me; scheda 3002 in primo piano sulla Principale.
- **Ripristino:** `ACASYSTEM_VERSION=0.9.28` in `progetto/.env` e `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d --build`; per i dati, `docker compose … stop tunet` e ripristino del volume dalla copia a freddo `backup/banco/tunet-data-pre-0.9.29-freddo.tgz` (stesso procedimento delle copie precedenti).

## VM acasystem-ha preparata per D1, 2026-10-26 (V2)

Dettagli, prove e limiti in [REP-20261023-003](reports/REP-20261023-003-piano-aggiungi-dispositivi.md), sezione «V2 — preparazione per D1 (2026-10-26)». Eseguito da Claude Code (Sonnet 5.5); nessun commit, nessuna credenziale, Docker, banco e tablet non toccati.

- **Stato:** VM `acasystem-ha` **accesa**, headless (`VBoxManage startvm … --type headless`), HAOS 18.3, **Core 2026.9.4** (riportato da 2026.10.2 con `core update --version 2026.9.4` dalla console; il ritorno indietro funziona), RAM **4096 MB**, 2 vCPU, grafica vmsvga, paravirt hyperv. Avvio lento: 20-30 minuti dall'accensione alla risposta HTTP.
- **Rete:** scheda 1 **a ponte** sul «Realtek RTL8852BE WiFi 6» (cavo connesso), DHCP, oggi 192.168.1.183/24 (cambia con la rete); scheda 2 **Host-Only** con IP fisso **192.168.56.10/24** (`ha network update enp0s8 --ipv4-method static --ipv4-address 192.168.56.10/24`, senza gateway; il DHCP di VirtualBox dà 192.168.56.101-254); scheda 3 NAT **tolta** (`--nic3 none`). La VM raggiunge 192.168.1.26 (ping).
- **HA ascolta sulla porta 80** e solo su `192.168.56.10`, `172.30.32.1` (Supervisor) e `127.0.0.1` (D-I8). Non con `http: server_host` in `configuration.yaml`, che il Core 2026.9.4 ignora dopo la migrazione (`yaml_migration_done: true`), ma con `"server_host"` nel blocco `stable` di `/mnt/data/supervisor/homeassistant/.storage/http`, a Core fermato; copia dell'originale in `/mnt/data/http.storage.bak-20261026` (nella VM). Dal PC la 80 sull'indirizzo del ponte e la 8123 rifiutano la connessione; `192.168.56.10:80` risponde 200. La prova da un secondo apparecchio della rete dell'ufficio non è stata fatta.
- **Acasystem verso la VM (non eseguito, tappa I4):** `TUNET_INTERNAL_HA_URL` dovrà essere `http://192.168.56.10` (porta 80). Il container `homeassistant` di Docker e `compose.tunet.yaml` non sono stati toccati.
- **Snapshot:** «prima-del-primo-avvio», «dopo-onboarding», «prima-di-D1-oggi», «**dopo-preparazione-D1**» (presa a VM spenta, poi la VM è stata riavviata e ricontrollata). Avvio automatico con Windows: no (D-I7 aperta).
- **Ritorno indietro:** `.storage/http` dalla copia nella VM (`ha core stop`, `cp`, `ha core start`) oppure ripristino dello snapshot «prima-di-D1-oggi» (VM spenta); per spegnere: `VBoxManage controlvm acasystem-ha acpipowerbutton`.

## Seconda istanza D1 su :3003 verso l'HA della VM, 2026-10-26

Scelta dell'utente del 2026-10-26: «Seconda istanza su :3003», così il banco 3002 (0.9.30, HA del PC) resta com'è.
- **File nuovo:** `progetto/compose.d1.yaml`, progetto Docker `aca-d1`.
  - Immagine `aca-system:0.9.31`, costruita dal working tree con D1 unito: server e schermate, vedi REP-20261023-003, «Unione di D1 nel progetto (2026-10-26)».
  - Porta `127.0.0.1:3003` → 3002, senza binding sulla LAN.
  - `TUNET_INTERNAL_HA_URL: http://192.168.56.10`, cioè la VM `acasystem-ha` sulla scheda host-only, porta 80, che ascolta solo per Acasystem (D-I8).
  - Volumi propri `aca-d1_d1-data` e `aca-d1_d1-service-secret`.
- **Avvio:** `ACASYSTEM_VERSION=0.9.31 docker compose -f progetto/compose.d1.yaml up -d --build`.
- **Arresto:** `docker compose -f progetto/compose.d1.yaml down`. I volumi restano; si cancellano solo con `-v`.
- **Esiti:**
  - container healthy;
  - `/api/health` restituisce 0.9.31;
  - `/ha/auth/providers` risponde 200 dal container verso la VM;
  - `deviceServiceIdentity.ts status` risponde «non è stato attivato» (uscita 1), come atteso prima di `activate`.
- **Banco 3002:** invariato, 0.9.30.
- **Tablet:** `adb reverse tcp:3003 tcp:3003` e una scheda aperta su `http://localhost:3003/`. L'accesso lo fa l'utente con le credenziali della VM.

## Banco 0.9.28 spostato su 192.168.1.7, 2026-10-26 (mattina)

La causa è il cambio di postazione e di Wi-Fi dell'utente: «MeMo Repeater 5 Ghz 2», PC su 192.168.1.7. Inoltre il PC si era riavviato alle 05:05 (Windows 10.0.26300).
- **Docker Desktop** non era avviato. L'ho avviato da `C:\Users\matti\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe`, tramite `explorer.exe`, e i due container sono ripartiti da soli.
- **Binding LAN** in `progetto/compose.tunet.yaml`: da `192.168.1.27:3002:3002` a `192.168.1.7:3002:3002`, con il commento datato. Copia prima in `backup/v0928/pre/compose.tunet-pre-ufficio-20261026.yaml`.
- **Bench:** `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d`, senza build: stessa immagine `aca-system:0.9.28`, volume invariato. Non ho fatto una copia a freddo, perché non è cambiata la versione e il volume non è stato toccato.
- **Esiti:**
  - container healthy;
  - `/api/health` restituisce 0.9.28 su 127.0.0.1 e su 192.168.1.7.
- **Home Assistant:** `/ha/auth/providers` dava 400 «onboarding_required», l'anomalia nota dopo l'avvio. Dopo `docker restart homeassistant` risponde 200 su entrambi gli indirizzi.
- **Tablet:**
  - `adb reverse tcp:3002 tcp:3002` era stato perso col riavvio e l'ho ripristinato;
  - le due schede di `http://localhost:3002` sono state ricaricate via CDP e l'app è caricata in entrambe;
  - il forward 9225 è stato tolto.

## Aggiornamento — banco 0.9.28, 2026-10-26

Banco `aca-system:0.9.28` su **192.168.1.27:3002**, sul working tree con la coreografia di [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md) e le correzioni dei giri 1-4 (nessun commit dopo `4e198c5`). Eseguito da Claude Code (Sonnet 5.5), subagente di un flusso.

- **Decisione dell'utente (2026-10-26):** «Mettila sul banco». Accetta i residui del quarto giro di ottimizzazione, misurati sul Tab M11 contro la 0.9.27 (5 giri alternati più il giro 0, intervalli non sovrapposti; [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md), «Misura del giro 4 sul Tab M11 (2026-10-25)», tabelle in `backup/v0928/misura-g4/RISULTATI.md`):
  - JUMP, massimo 125 [123-133] contro 106 [90-116] ms (tocco sul pallino accanto, «+1»);
  - apertura della vista pagine, T1 72 [68-74] contro 65 [59-67] ms;
  - uscita da Sistema, somma dei due task 282 [278-334] contro 269 [263-275] ms;
  - in più la dissolvenza di entrata in Sistema, già accettata il 2026-10-25.

  **Restano un problema aperto da registrare** (obiettivo «nessuna misura peggiore della 0.9.27» non raggiunto). Tutto il resto del giro 4 è «nd» o migliore (SW1-SW3, «Fine», «Annulla», rilascio prima del volo, ridimensionamento, riscontro del «+», tocco breve, foglio senza salto, layout-shift).
- **Rete:** l'IPv4 Wi-Fi del PC è 192.168.1.27 (prima 192.168.1.7): aggiornati binding e commento di `progetto/compose.tunet.yaml`. Gli altri indirizzi del PC sono 172.23.160.1 e 192.168.56.1 (adattatori virtuali).
- **Copia a freddo PRIMA** (container `tunet` fermato, uscito con 137): `backup/banco/tunet-data-pre-0.9.28-freddo.tgz`, **451599 byte**, SHA-256 `bd58a930f22b66e66bdffde185451b09d0a03eea73729e1b0cfcfa12bb3ff2b1`, `tar -tzf` leggibile (`tunet.db`, `-wal`, `-shm`). Copie di `.env`, compose ed e2e in `backup/v0928/pre/banco/`; dei documenti toccati in `backup/v0928/pre/banco-doc/`.
- **Build e avvio:** `ACASYSTEM_VERSION=0.9.28` in `progetto/.env` (locale, ignorato da Git), `e2e/isolated-server.mjs` e `e2e/release.check.mjs`; `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d --build` (log in `backup/v0928/build-banco.log`): immagine `sha256:d7e866a18ffd7e67e54d2d25bf09f08a6ca7d21a92284525701049adbdcbfe7a`, container `healthy`, `/api/health` `{"status":"ok","version":"0.9.28"}` e `/ha/auth/providers` 200 su `127.0.0.1` e su `192.168.1.27`. Bundle servito `index-DrtldulY.js` e `index-CC9wd10P.css`: il CSS è uguale a `backup/v0928/dist-g4`, il JS ha un altro nome (non analizzata la differenza, probabilmente la versione scritta nel bundle). `homeassistant` non toccato; `release.check.mjs` non eseguito.
- **Tablet Tab M11** (`adb reverse tcp:3002 tcp:3002` resta; `adb forward tcp:9225` tolto a fine prova; origini 3013-3015 e fixture non usate in questo passo): chiavi del launcher di prima in `backup/v0928/tablet-banco/ls3002-prima-banco.json` (token esclusi per nome e mai letti); le due schede di `http://localhost:3002` ricaricate senza service worker né cache, entrambe sul bundle nuovo (la seconda era nascosta: ricaricata senza leggerne la pagina, poi verificato `index-DrtldulY.js`). Le prove hanno cambiato solo `tunet_launcher_layout` (spostamenti, ridimensionamento, rimozione) e a fine prova il valore è stato rimesso (`ls3002-restore.cjs`: nessuna chiave diversa, `pages_config` compresa). Schermate e script in `backup/v0928/tablet-banco/` (`strumenti/b1.js`-`b6.js`).
- **Prove sul tablet** (gesti sintetici `Input.dispatchTouchEvent`, **non** il dito; layout reale del tablet, pagina «Casa e info» per i widget). **Riuscite:**
  - tocco breve sul «+» (casella premuta, pagina ferma, si apre il foglio) e sul vuoto (nessun effetto);
  - pressione lunga sul vuoto → vista pagine, scheda tenuta che si solleva (`is-lifted`), «Fine», tocco su una scheda → pagina in uso;
  - frecce della vista pagine («Sposta … prima/dopo», poi rimessa a posto), scorrimento a dito, salto diretto in modifica (da -4 e +6: nessuna pagina in mezzo vista scorrere; da -1: scorrimento animato) e dal pallino della vista pagine;
  - pressione lunga sul widget (barra del solo widget, nessun tremolio), trascinamento con copia sotto il dito, rilascio nella casella, «Annulla»;
  - ridimensionamento con sagoma tratteggiata (bordo `dashed` durante il gesto, +1 riga, «Annulla»), rimozione e «Annulla» della pillola, «Aggiungi widget» dalla vista pagine (foglio con 27 pulsanti);
  - nessun chip «Da collegare» in nessuna delle 9 pagine;
  - Sistema con il pulsante «AI» in alto a destra, informativa aperta e chiusa con «Chiudi»; ritorno alla Principale.
- **Cambi del giro 4 a dito simulato:** durante il trascinamento una pressione e un clic su una cella libera non hanno effetto (nessuna casella premuta, nessun foglio; eventi inviati da script, non da un secondo dito); un vero tocco su una cella libera arrivato 194 ms dopo il rilascio è ignorato, uno dopo 0,4 s risponde (sposta il widget). Dal rilascio: sessione finita a 291 ms, ingranaggio e barra di nuovo raggiungibili a 386 ms (95 ms dopo, 4 fotogrammi rAF di cui uno di 89 ms); «Annulla» (397 ms), Sistema (408 ms) e uno scorrimento subito dopo l'atterraggio rispondono.
- **Non riuscito: la pila vuota di Multimedia c'è ancora.** La pagina mostra due caselle senza «+» (`is-reserved`, colonne 3-4 della prima riga). Causa letta nei dati: il segnaposto `stack_mvjd2g21` ha `ids` non vuoto (`media_group_preset_multimedia`, `appletv_card_preset_multimedia`) ma nessun widget visibile, e `withoutEmptyStacks` (`utils/launcher/layout.ts`) toglie solo le pile con `ids` vuoto; il layout salvato è identico prima e dopo il ricaricamento. Non corretto (fuori dall'incarico del banco): è il punto 2 della 0.9.28, da riaprire.
- **Osservazione, non confrontata con la 0.9.27:** con il tocco sintetico, un secondo scorrimento che inizia entro circa 0,5 s dal primo viene ignorato (a 0,8 s funziona); la causa non è stata individuata (il codice di `Pager.tsx` non ha un blocco evidente: potrebbe essere l'animazione di aggancio o il tocco sintetico). Da provare col dito.
- **Limiti:** nessuna prova col dito, nessun telefono, nessun TalkBack; suite e controlli statici non rieseguiti in questo passo (restano quelli del giro 4: 204 file e 3089 test verdi).
- **Ripristino:** `ACASYSTEM_VERSION=0.9.27` in `progetto/.env`, `compose.tunet.yaml` riportato a `192.168.1.7` se il PC torna su quell'indirizzo (copia in `backup/v0928/pre/banco/`), `up -d --build`; dati dalla copia `backup/banco/tunet-data-pre-0.9.28-freddo.tgz` solo se necessario, con il container fermo; sul tablet le chiavi di `ls3002-prima-banco.json` (il formato delle chiavi non è cambiato rispetto al 2026-10-23, a quanto risulta dal confronto prima/dopo; non verificato con la 0.9.27 in esecuzione).

## Primo invio su GitHub, 2026-10-25

Richiesta dell'utente del 2026-10-25: caricare il progetto su GitHub «Adesso», prima del quarto giro della 0.9.28; poi «voglio usare un altro account». Eseguito da Claude Code (Opus 5.5), con l'utente presente per l'accesso. Il banco non è cambiato (resta `aca-system:0.9.27`).

- **Controllo prima dell'invio.** File da inviare (1480, circa 19 MB) e tutti i 16 commit esistenti, con ricerca di:
  - token, chiavi e password, tra cui JWT, chiavi private, token GitHub/AWS/Google/Slack/OpenAI/Anthropic, `Bearer` letterali e assegnazioni di password e segreti;
  - email, indirizzi MAC e file di nomi rischiosi (`.env`, database, log, chiavi).

  Nessun segreto trovato. L'unico valore di accesso è quello finto del banco isolato (`aca-isolated-fixture`). Il MAC presente nei documenti è un segnaposto (`02:00:00:00:00:01`) e le immagini sono gli esempi dell'upstream Tunet. Esclusi da Git: `backup/`, `progetto/.env`, il database (`data/`) e le build (`dist/`). La cartella locale `.claude/` (configurazione dell'anteprima) non è stata aggiunta.
- **Commit** `4e198c5` «feat: launcher interactions, motion choreography and device plans (0.9.22-0.9.28)», con il lavoro fino al giro 3 della 0.9.28.
- **Invio.**
  - Il primo tentativo con l'account già salvato in Git Credential Manager (`Mattiapentagallo-unina`) ha dato «Repository not found».
  - L'utente ha scelto un altro account e ha autorizzato `Mattiapentagallo` con il codice dispositivo di GitHub.
  - Comando: `git push https://Mattiapentagallo@github.com/acamemo/acasystem.git master:main`, esito `* [new branch] master -> main`.
- **Configurazione locale.**
  - `origin` = `https://Mattiapentagallo@github.com/acamemo/acasystem.git`, così gli invii usano quell'account.
  - Il ramo locale `master` segue `origin/main`.
  - Verifica: `git ls-remote origin` dà `refs/heads/main` = `4e198c5`.
- **Non fatto:** nessun aggiornamento automatico dal repository, nessuna CI e nessun rilascio. Il canale di aggiornamento resta un lavoro futuro (REP-20261023-004).

## Messaggi dei commit riscritti senza menzioni di Claude, 2026-10-26

Richiesta dell'utente: «Riscrivi i messaggi dei 4 commit su GitHub senza Co-Authored-By, unisci i miei 3 commit dal sito e fai il push forzato su main con un backup prima.» Regola dal 2026-10-26: nei messaggi dei commit nessuna riga «Co-Authored-By» e nessuna menzione di Claude.

- **Backup prima della riscrittura** (solo locale, non su GitHub):
  - rami `backup/origin-main-prima-riscrittura-20261026` (`0d3fe27`) e `backup/master-prima-riscrittura-20261026` (`67b1282`);
  - `backup/git/acasystem-prima-riscrittura-20261026.bundle` (escluso da Git, verificato con `git bundle verify`).
- **Procedura** in una copia separata del repository, senza toccare la copia di lavoro con le modifiche degli altri flussi:
  1. i due commit locali messi dopo i 3 commit fatti dall'utente sul sito (il loro effetto netto è nullo: stesso albero di `4e198c5`);
  2. `git filter-branch --msg-filter` da `13e5537` in poi, che toglie solo la riga «Co-Authored-By: Claude …».
- **Controlli:** per ogni commit stesso albero (stessi file), stesso autore e stessa data; nei messaggi cambia solo quella riga; il primo commit riscritto ha lo stesso padre `e192121`.
- **Invio:** `git push --force-with-lease=main:0d3fe27… origin <riscritta>:main`, esito `0d3fe27...c87139d (forced update)`. Su `origin/main` nessun messaggio contiene «Claude» o «Anthropic». Il `master` locale è stato spostato su `c87139d` con `git reset --soft`, ad albero identico; le modifiche non salvate degli altri flussi sono intatte.
- **Corrispondenza dei codici.** I documenti scritti prima di oggi citano i codici vecchi, che restano leggibili solo nei rami e nel bundle di backup:

| Vecchio | Nuovo | Commit |
|---|---|---|
| `13e5537` | `4465e96` | feat: rebuild the Tunet frontend as the Acasystem Metallo OS |
| `64010e9` | `953b059` | fix: finalize the Home Assistant proxy behind Acasystem |
| `7298d4d` | `cad8092` | feat: composable Metallo kit, derived colours and Kit 2 soft UI |
| `4e198c5` | `bba3639` | feat: launcher interactions, motion choreography and device plans (0.9.22-0.9.28) |
| `5f9e7dc` | `77cd74a` | Add files via upload (dal sito) |
| `37fb8bb` | `620b855` | Delete acasystem directory (dal sito) |
| `0d3fe27` | `5953f36` | Delete repository.yaml (dal sito) |
| `d543f16` (poi `864eaf8`) | `9090412` | feat: Acasystem client app for Windows and Android, HA OS app package |
| `67b1282` | `c87139d` | feat: automatic mini PC setup from the client app, HA OS app 0.9.30.1 |

- **Effetto per altre copie del repository:** chi aveva scaricato la storia vecchia deve riallinearsi (per esempio `git fetch` e poi `git reset --hard origin/main` su una copia senza lavori propri), non fare `git pull`.

## Segreto del servizio di D1 e copie a freddo, 2026-10-23 (solo procedura)

Nessun cambio al banco, al compose o ai volumi. Riguarda il codice del server di D1 ancora nella copia di lavoro (`backup/d1/patch/`, [REP-20261023-003](reports/REP-20261023-003-piano-aggiungi-dispositivi.md), «Annotazione del 2026-10-23: correzioni dopo la revisione del codice del server di D1»), [ADR-0022](decisions/ADR-0022-identita-di-servizio-dispositivi.md) punto 3 e C-16 di [compliance.md](compliance.md). **Non realizzato e non provato su un volume vero.**

- **Che cosa è il segreto.** Il token a lunga durata (10 anni) dell'utente di HA «Acasystem (servizio)», che è amministratore di HA. Sta in un solo file `0600`, il cui percorso è `TUNET_SERVICE_SECRET_FILE`.
- **Dove deve stare.** In un volume separato da `tunet-data` (per esempio montato su `/run/acasystem-secrets`), mai nelle copie a freddo e mai in Git. Il montaggio e la variabile sono una modifica del compose da autorizzare: non è stata fatta.
- **Che cosa fa il codice.** Il predefinito resta `<DATA_DIR>/secrets/service-identity.json`, ma `activate` **rifiuta di salvare** il file dentro la cartella dei dati salvo `TUNET_SERVICE_SECRET_ALLOW_DATA_DIR=1`, che è una scelta esplicita per il solo banco; `status` avvisa se il file è nel volume dei dati.
- **Copie a freddo.** Quelle fatte prima di `activate` non contengono il token. Dopo `activate`, con il file nel volume dei dati (solo banco, con la variabile sopra), una copia a freddo di `tunet-data` contiene il token: o si esclude la cartella `secrets/` dall'archivio (per esempio con l'opzione `--exclude` di `tar`) oppure si tratta la copia come un segreto, fuori da `backup/` condivisi e da Git. Con il volume separato non serve nulla di più.
- **Ripristino.** Ripristinare `tunet-data` non ripristina il token. Se il file si perde: `forget` e poi `activate`, oppure `activate --rotate` (il nuovo token è salvato prima di cancellare i vecchi). Per spegnere il servizio basta sospendere l'utente in HA (Persone > Utenti).
- **Da decidere** (chi ha l'autorità sul compose): il volume separato prima di D1s, oppure il banco con `TUNET_SERVICE_SECRET_ALLOW_DATA_DIR=1` e senza copie a freddo di `tunet-data` dopo l'attivazione.

## Aggiornamento — banco 0.9.27, 2026-10-23

Banco `aca-system:0.9.27` su **192.168.1.7:3002** (tappa Z di [REP-20261022-002](reports/REP-20261022-002-piano-blocchi-thread.md), richiesta dell'utente «procedi con la 0.9.27…» con l'informativa sull'AI di [REP-20261023-005](reports/REP-20261023-005-informativa-sviluppo-ai.md)). **Rete:** l'IPv4 Wi-Fi del PC era 192.168.1.7 e non più 192.168.1.27: aggiornati binding e commento di `progetto/compose.tunet.yaml`; `/api/health` e `/ha/auth/providers` rispondono su `127.0.0.1` e `192.168.1.7`. Contiene le tappe R1-R3, R5a, R7, R8, R10 di ISSUE-109 (R2b spenta), le correzioni dell'interazione di modifica, la memoria dei widget per dispositivo (ADR-0019) e l'informativa sull'AI in Sistema.

- Misura finale prima del banco: build 0.9.26 estratta dal container contro `dist-finale`, 5 giri alternati sul Tab M11 (fixture); risultati in REP-20261022-002, annotazione «Tappa Z». **Esito misto:** blocchi molto ridotti quasi ovunque ma O1 (100 ms) e O4 non raggiunti, e lo scorrimento durante il gesto (O5) è **peggiore** della base (fps del primo lancio 35 contro 60, blocchi di 55-80 ms contro 0, pallino accanto 108 ms contro 0). Decisione all'utente.
- Copia a freddo PRIMA (container `tunet` fermato, uscito con 137): `backup/banco/tunet-data-issue109-pre-0.9.27-freddo.tgz`, **465134 byte**, SHA-256 `f78a7c98af434654fb513170f907915f109e7924e9f5a5e41887758eaddb26b0`, `tar -tzf` leggibile (`tunet.db`, `-wal`, `-shm`). Copie di `.env`, compose ed e2e in `backup/issue-109/pre/banco/`.
- `ACASYSTEM_VERSION=0.9.27` in `progetto/.env` (file locale, ignorato da Git), `e2e/isolated-server.mjs` e `e2e/release.check.mjs`; `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d --build`: immagine `sha256:7d5703f8611b3e0fbc5a5326a67e8a8c69bcbf6e8724847cf5b6bf6d7616f69b`, container `healthy`, `/api/health` `{"status":"ok","version":"0.9.27"}`; bundle `index-CnNjysVo.js` e `index-CEvWC0TJ.css` (uguali a `backup/issue-109/dist-finale`). `homeassistant` non toccato; `release.check.mjs` non eseguito.
- Tablet Tab M11: `adb reverse tcp:3002 tcp:3002` (resta) e `adb forward tcp:9225` (tolto a fine prova); service worker e cache tolti e pagina ricaricata (una sola scheda di `http://localhost:3002`); chiavi del launcher di prima in `backup/issue-109/Z/ls-3002-prima-0.9.27.json`, dopo la migrazione in `ls-3002-dopo-migrazione-0.9.27.json` (la migrazione ha solo creato `tunet_widget_memory`, la lista dei nascosti era già vuota). Controllo funzionale con gesti sintetici (vista pagine, widget, «Collega», «+», salto diretto in modifica, Sistema e informativa sull'AI con pulsante in alto a destra, aggiunta in pagina piena): tutto passato; schermate in `backup/issue-109/Z/`. Le prove sono state annullate ripristinando solo le tre chiavi cambiate (`tunet_launcher_layout`, `tunet_pages_config`, `tunet_card_settings`) ai valori dopo la migrazione. **Non osservabile:** il «widget nascosto» di Multimedia: la pagina è identica a prima (una pila senza contenuto visibile occupa due caselle senza il «+»).
- **Limiti:** gesti sintetici, non il dito; la sincronizzazione automatica delle impostazioni può avere inviato lo stato di prova al server (non verificato); suite, lint e dimensione dei pacchetti non rieseguiti da questa tappa.
- **Ripristino:** `ACASYSTEM_VERSION=0.9.26` in `progetto/.env`, poi `up -d --build`; **sul tablet vanno rimesse anche le chiavi di `ls-3002-prima-0.9.27.json`** (la 0.9.26 non legge `tunet_widget_memory`); dati dalla copia PRIMA solo se necessario (contenitore fermo).

## Aggiornamento REP-20261023-003 — VM `acasystem-ha` preparata e non avviata, 2026-10-23

Richiesta: risposte dell'utente del 2026-10-23 (D-I1 «Sì, entrambi», D-I2 «4 GB (proposta)», D-I3 «Scheda interna fissa», D-I5 «Resta 2026.9.4», D-I8 «Sì, solo Acasystem»), registrate in [REP-20261023-003](reports/REP-20261023-003-piano-aggiungi-dispositivi.md). Eseguito da Claude Code (Sonnet 5.5). **Il banco Docker non è stato toccato**: container `homeassistant` (HA 2026.9.4) e `aca-tunet-tunet-1` (0.9.26) invariati; `TUNET_INTERNAL_HA_URL` invariato; nessuna modifica a Docker, rete di Windows o tablet. La VM **non è stata avviata** e non ha avvio automatico.

- **File.** `backup/dispositivi/haos/haos_ova-18.3.vdi.zip` (559 213 211 byte, SHA-256 `c626ffe0db7dd717270b41240ee3cbb5ada78a364239795f04435d6116c236d3`, uguale al digest pubblicato da GitHub per la release 18.3 di `home-assistant/operating-system`) e `haos_ova-18.3.vdi` estratto (989 987 328 byte, SHA-256 `62580d1c0d6384c9077d3b39df61b0adec29cb7a69df44430471a34634d7bb2b`). La cartella `backup/` è esclusa da Git. File di configurazione della VM: `C:\Users\matti\VirtualBox VMs\acasystem-ha\acasystem-ha.vbox` (fuori dal repository), UUID `319ed592-e35e-451d-a551-c8adbe03ec40`.
- **Comandi** (VirtualBox 7.2.4r170995, `C:\Program Files\Oracle\VirtualBox\VBoxManage.exe`):
  1. `VBoxManage createvm --name acasystem-ha --ostype Oracle_64 --register`
  2. `VBoxManage modifyvm acasystem-ha --firmware=efi64 --cpus=2 --memory=4096 --autostart-enabled=off --nic1=bridged --bridge-adapter1="Realtek RTL8852BE WiFi 6 802.11ax PCIe Adapter" --cable-connected1=off --nic2=hostonly --host-only-adapter2="VirtualBox Host-Only Ethernet Adapter" --cable-connected2=on`
  3. `VBoxManage storagectl acasystem-ha --name SATA --add sata --controller IntelAhci --portcount 1 --bootable on`
  4. `VBoxManage storageattach acasystem-ha --storagectl SATA --port 0 --device 0 --type hdd --medium "<radice>\backup\dispositivi\haos\haos_ova-18.3.vdi"`
  5. `VBoxManage modifyvm acasystem-ha --boot1=disk --boot2=none --boot3=none --boot4=none`
- **Configurazione risultante** (`showvminfo --machinereadable`): Oracle Linux 64 bit, EFI64, 2 vCPU, 4096 MB, disco `.vdi` sul controller SATA, scheda 1 a ponte sul Wi-Fi del PC (Realtek RTL8852BE, oggi `192.168.1.7/24`) **con cavo scollegato**, scheda 2 Host-Only (adattatore esistente «VirtualBox Host-Only Ethernet Adapter», `192.168.56.1/24`), schede di tipo 82540EM (predefinito), avvio automatico disattivato, `list runningvms` vuoto.
- **Indirizzo Host-Only della VM: da fissare in seguito** (D-I3). Annotato: sull'adattatore esiste un server DHCP di VirtualBox abilitato (`192.168.56.100`, intervallo `192.168.56.101`-`192.168.56.254`); l'indirizzo fisso dovrà stare **fuori da quell'intervallo** (per esempio `192.168.56.10`, solo proposta), impostato da HA OS nella tappa di migrazione.
- **Per la tappa di migrazione, differenza dal piano.** Il piano (6.1, I2) prevedeva NAT più Host-Only, così da avere Internet per il ripristino prima di esporre la pagina di benvenuto alla LAN. La preparazione richiesta ha invece ponte (cavo scollegato) più Host-Only: senza ponte né NAT la VM non ha Internet, e il ripristino del backup scarica il core. Al momento della migrazione si dovrà quindi scegliere tra collegare il ponte (con la pagina di benvenuto raggiungibile dalla LAN finché il backup non è caricato) e aggiungere una scheda NAT temporanea. Decisione non presa qui.
- **Non fatto, per il passo di migrazione dopo il banco 0.9.27:** avvio della VM; ripristino del backup di HA (con l'utente, con la sua chiave); collegamento del cavo virtuale del ponte; limitazione della 8123 al solo Acasystem (D-I8, per esempio `http: server_host` sull'indirizzo Host-Only); cambio di `TUNET_INTERNAL_HA_URL`; arresto del container `homeassistant` di Docker.
- **Ritorno indietro.** `VBoxManage unregistervm acasystem-ha --delete` toglie la VM dal registro e **cancella i suoi file, compreso il disco `.vdi` collegato** (`haos_ova-18.3.vdi`); resta lo zip scaricato, da cui si può estrarre di nuovo. Per tenere il `.vdi` e togliere solo la VM: prima `VBoxManage storageattach acasystem-ha --storagectl SATA --port 0 --device 0 --medium none`, poi `unregistervm` senza `--delete`. Nessun altro componente è stato modificato da questa preparazione, quindi non c'è altro da ripristinare.
- **Prova di rete P0** (11:13, 2026-10-23): dal container `homeassistant` un datagramma Wake on LAN con MAC fittizio verso `192.168.1.255:9` e `255.255.255.255:9`; ascoltatore sul PC perché la shell adb del tablet non può aprire la porta 9. Esito e limiti in `verification.md`: arrivo confermato solo al PC (uno dei due invii, sorgente riscritta a `192.168.1.7`), arrivo su altro apparecchio della LAN **non determinato**. Il dubbio sul bridge di Docker Desktop (sezione 5.2 del piano) resta aperto.

## Aggiornamento — banco 0.9.26, 2026-10-22

Banco `aca-system:0.9.26` su **192.168.1.27:3002** (IPv4 Wi-Fi del PC verificato prima del rilascio: coincide con il binding di `progetto/compose.tunet.yaml`, nessuna modifica). Contiene la correzione di ISSUE-108 in `useLongPress.ts` (guardia del click attiva finché il dito è giù, scade 600 ms dopo il rilascio); nessun'altra modifica del comportamento.

- Prima del rilascio: suite completa 183 file e 2626 test, tipi, lint, tipografia, colori, i18n, build e dimensioni dei pacchetti verdi (risultati in `verification.md`).
- Copia a freddo PRIMA (container `tunet` fermato): `backup/banco/tunet-data-rilascio-pre-0.9.26-freddo.tgz`, **464901 byte**, SHA-256 `d73a5ce5b5a62d5165d2f107029e36e7114886a0a19ca76fa654269aacd9d89c`, `tar -tzf` leggibile (`tunet.db`, `-wal`, `-shm`). Copie di `.env`, compose ed e2e in `backup/rilascio-0.9.26/pre/banco/`.
- `ACASYSTEM_VERSION=0.9.26` in `progetto/.env` (file locale, ignorato da Git), `e2e/isolated-server.mjs` e `e2e/release.check.mjs`; `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d --build`: container `healthy`, `/api/health` `{"status":"ok","version":"0.9.26"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.27`.
- Tablet Tab M11: `adb reverse tcp:3002 tcp:3002` e `adb forward tcp:9225 localabstract:chrome_devtools_remote` attivi (il forward resta attivo per la misura successiva); service worker e cache tolti e pagina ricaricata (una sola scheda di `http://localhost:3002`); chiavi del launcher salvate in `backup/rilascio-0.9.26/prova/ls-backup.json` (senza token) e disposizione verificata identica a fine prova (firma `tunet_launcher_layout:bfa4242d`).
- Prove (gesti sintetici `Input.dispatchTouchEvent`, attese reali, schermo acceso, `document.visibilityState` sempre `visible`, nessun tocco estraneo): pressione sul vuoto a 45 px dal bordo sinistro, al centro e a 45 px dal bordo destro, tenuta 0,7, 1,5, 2,5 e 4 s, rilascio nello stesso punto, 3 ripetizioni = **36/36**: la vista pagine resta aperta, la pagina corrente (Principale) non cambia, «Fine» (tocco normale 1,5 s dopo il rilascio) chiude. Widget (light, Luci e comandi): pressione lunga di 0,9 s e trascinamento di 4 celle nello stesso tocco (6,2-6,8 s), 3/3 spostato, «Annulla» lo riporta in posizione, firma della disposizione invariata. Script e risultati in `backup/rilascio-0.9.26/prova/` (`tablet-hold.cjs`, `tablet-holds.json`, `tablet-widget.json`). Nota: un primo giro del widget con il selettore sbagliato di «Annulla» ha lasciato la disposizione spostata; ripristinata dalle chiavi salvate e ripetuto con esito 3/3.
- **Limite:** gesti sintetici, non il dito vero; da confermare col dito sul Tab M11. Pagina riportata a Principale.
- **Ripristino:** `ACASYSTEM_VERSION=0.9.25` in `progetto/.env`, poi `up -d --build`; dati dalla copia PRIMA solo se necessario (contenitore fermo).

## Aggiornamento — banco 0.9.25, 2026-10-22

Richiesta umana: correzione del rilascio dopo la pressione lunga sullo spazio vuoto vicino al bordo («correggilo»), poi prove sulle animazioni. Rettifica la voce successiva: il banco ora è la 0.9.25.

- Il Wi-Fi del PC era `192.168.1.27`, già nel binding di `progetto/compose.tunet.yaml`: nessuna modifica al binding.
- Copia a freddo PRIMA (container `tunet` fermato) `backup/banco/tunet-data-rilascio-pre-0.9.25-freddo.tgz` (431905 byte, SHA-256 `e8a64c38406538bea721dae3fc8ebb2f76276037cc05511f7082a7a2c2aea1e9`, `tar -tzf` 4 voci). Copie di `.env`, compose ed e2e in `backup/animazioni-0.9.25/pre/banco/`.
- `ACASYSTEM_VERSION=0.9.25` in `progetto/.env`, `e2e/isolated-server.mjs` e `e2e/release.check.mjs`; `docker compose ... up -d --build`.
- Container `aca-tunet-tunet-1` `healthy`; `/api/health` `0.9.25` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.27`.
- Tab M11 (adb, `adb reverse tcp:3002`, forward 9225 lasciato attivo per il collaudo successivo): una scheda, service worker e cache rimossi, ricarica; schermo visibile. Pressione lunga di 700 ms sullo spazio vuoto a circa 60 px dal bordo destro e dal sinistro (e al centro), rilascio nello stesso punto: la vista pagine resta aperta, la pagina corrente non cambia e nessuna pagina si apre in modifica; «Fine» la chiude. Pressione lunga sul widget con trascinamento nello stesso tocco ancora funzionante; «Annulla» ripristina la disposizione. Chiavi di `localStorage` (senza token) identiche a prima. Script in `backup/animazioni-0.9.25/tablet/`.
- Ripristino: `ACASYSTEM_VERSION=0.9.24` in `progetto/.env` più la copia PRIMA.

## Aggiornamento REP-20261021-003 — banco 0.9.24, 2026-10-21

Richiesta umana: «Evidenzia e trascina» (pressione lunga e trascinamento nello stesso tocco), vedi l'annotazione in [REP-20261021-003](reports/REP-20261021-003-interazioni-schermo-intero.md). Rettifica la voce successiva: il banco ora è la 0.9.24.

- Il Wi-Fi del PC era `192.168.1.27`, già nel binding di `progetto/compose.tunet.yaml`: nessuna modifica al binding.
- Copia a freddo PRIMA (container `tunet` fermato) `backup/banco/tunet-data-trascina-pre-0.9.24-freddo.tgz` (430096 byte, SHA-256 `2daa7d0042034cfb39245fd64337af3c60e454671d281328813d9d45267887fa`, `tar -tzf` 4 voci). Copie di `.env`, compose ed e2e in `backup/trascina-0.9.24/pre/banco/`.
- `ACASYSTEM_VERSION=0.9.24` in `progetto/.env`, `e2e/isolated-server.mjs` e `e2e/release.check.mjs`; `docker compose ... up -d --build`.
- Container `aca-tunet-tunet-1` `healthy`; `/api/health` `0.9.24` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.27`.
- Tab M11 (adb, `adb reverse tcp:3002`, forward 9225 poi rimosso): una scheda, service worker e cache rimossi, ricarica; prove in [REP-20261021-003](reports/REP-20261021-003-interazioni-schermo-intero.md). Ripristino: `ACASYSTEM_VERSION=0.9.23` in `progetto/.env` più la copia PRIMA. Il binding non è cambiato.

## Aggiornamento REP-20261021-003 — Ripristino, banco 0.9.23, 2026-10-21

Richiesta umana: «sono scomparsi i + e non funziona più l'animazione che tenendo premuto mi apre le pagine, c'è stata una regressione importante», più la seconda richiesta sui widget (ADR-0016, rettifiche del 2026-10-21 sera). Rettifica la voce successiva: il banco ora è la 0.9.23.

- Banco `aca-system:0.9.23` costruito e avviato. Il Wi-Fi del PC era `192.168.1.27` contro il binding `192.168.1.7`: aggiornati porta e commenti in `progetto/compose.tunet.yaml` (copia PRIMA in `backup/ripristino-0.9.23/pre/`). Il binding va riconfermato se l'IP cambia ancora.
- Copia a freddo PRIMA `backup/banco/tunet-data-ripristino-pre-0.9.23-freddo.tgz` (428132 byte, SHA-256 `c612ee17e50cf9062da5c806c870dd3f6d5d1ad19d9dfd58afbc04c5de1c768a`, `tar -tzf` 4 voci).
- Versione `ACASYSTEM_VERSION=0.9.23` in `progetto/.env`, `e2e/isolated-server.mjs` e `e2e/release.check.mjs`.
- Container `aca-tunet-tunet-1` `healthy`; `/api/health` `0.9.23` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.27`.
- Ripristino alla 0.9.22: `ACASYSTEM_VERSION=0.9.22`, binding e script `e2e` dalle copie in `backup/ripristino-0.9.23/pre/`, `docker compose ... up -d --build`, dati dalla copia a freddo. Nessuna novità di porte o credenziali; token non letti né usati. Sul Tab M11 `adb reverse` 3002 resta attivo; il forward CDP 9225 è stato rimosso; `localStorage` non sensibile identico a prima.

## Aggiornamento REP-20261021-003 — G3-G5 e C1-C3, banco 0.9.22, 2026-10-21

Richiesta umana: «vai, procedi con G3-G5 e C1-C3». Rettifica la voce successiva: il banco ora è la 0.9.22.

- Banco `aca-system:0.9.22` (`docker compose up -d --build` riuscito) su `192.168.1.7:3002`: IPv4 Wi-Fi del PC uguale al binding di `progetto/compose.tunet.yaml`, nessuna modifica.
- Copia a freddo PRIMA (tunet fermo) `backup/banco/tunet-data-g3c3-pre-0.9.22-freddo.tgz` (414866 byte, SHA-256 `4a238c93cf1007b28884068a2c156c47287cbe746be1627fce00d576ce69a2d4`, `tar -tzf` 4 voci).
- Versione `ACASYSTEM_VERSION=0.9.22` in `progetto/.env`, `e2e/isolated-server.mjs` e `e2e/release.check.mjs`.
- Container `aca-tunet-tunet-1` `healthy`; `/api/health` `{"status":"ok","version":"0.9.22"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`.
- Ripristino: `ACASYSTEM_VERSION=0.9.21` più la copia a freddo PRIMA. Nessuna novità di rete, porte o credenziali. Sul Tab M11 `adb reverse` 3002 resta attivo; il forward CDP 9225 usato per la prova è stato rimosso. Le chiavi di `localStorage` del launcher sono state salvate prima e ripristinate dopo (`backup/g3-c3/tablet/`).

## Aggiornamento REP-20261021-002 — Casa 3D, R1, banco 0.9.21, 2026-10-21

Richiesta umana: «parti» (R1 della Casa 3D). Rettifica la voce successiva: il banco ora è la 0.9.21.

- Banco `aca-system:0.9.21` (`docker compose up -d --build` riuscito) su `192.168.1.7:3002`: IPv4 Wi-Fi del PC uguale al binding di `progetto/compose.tunet.yaml`, nessuna modifica.
- Copia a freddo PRIMA (tunet fermo) `backup/banco/tunet-data-casa3d-R1-pre-0.9.21-freddo.tgz` (413806 byte, SHA-256 `ae0a1cb6c0c4ff7ff5a9e65f18ffb6e7c6854b683935a9da6d259793651c83e5`, `tar -tzf` 4 voci).
- Versione `ACASYSTEM_VERSION=0.9.21` in `progetto/.env`, `e2e/isolated-server.mjs`, `e2e/release.check.mjs` e README degli e2e.
- Container `healthy`; `/api/health` `{"status":"ok","version":"0.9.21"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`.
- Ripristino: `ACASYSTEM_VERSION=0.9.20` più la copia a freddo PRIMA. Nessuna novità di rete, porte o credenziali; la casa d'esempio sul banco è stata cancellata con «Ricomincia» durante la prova sul Tab M11.

## Aggiornamento REP-20261021-003 — G1-G2, banco 0.9.20, 2026-10-21

Richiesta umana: «ok alle proposte, approvo e procedi con G1-G2». Rettifica la voce successiva: il banco ora è la 0.9.20.

- Banco `aca-system:0.9.20` (`docker compose up -d --build` riuscito) su `192.168.1.7:3002`: IPv4 Wi-Fi del PC uguale al binding di `progetto/compose.tunet.yaml`, nessuna modifica.
- Copia a freddo PRIMA `backup/banco/tunet-data-g1g2-pre-0.9.20-freddo.tgz` (413346 byte, SHA-256 `1a3453c57d1793b0f7b80cf2e24b1e8eb18852ea0ef39de60186a831991823a2`, `tar -tzf` 4 voci: `.`, `tunet.db`, `-wal`, `-shm`).
- Versione `ACASYSTEM_VERSION=0.9.20` in `progetto/.env`, `e2e/isolated-server.mjs`, `e2e/release.check.mjs` e README degli e2e.
- Container `aca-tunet-tunet-1` `healthy`; `/api/health` `{"status":"ok","version":"0.9.20"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`.
- **Ripristino:** `ACASYSTEM_VERSION=0.9.19` in `progetto/.env`, poi la copia a freddo.
- Tablet: `adb reverse tcp:3002` e forward CDP 9225; nessun comando di sblocco. Nessun comando a impianti reali, nessuna credenziale, nessun commit.

## Aggiornamento REP-20261020-002 — Casa 3D, T6, banco 0.9.19, 2026-10-21

Richiesta umana: «conferma /casa3d/ e nascondi la pagina di prova, poi procedi con T6». Rettifica la voce successiva («nessun cambio al banco»): il banco ora è la 0.9.19.

- **Copia a freddo PRIMA** con `tunet` fermo: `backup/banco/tunet-data-casa3d-T6-pre-0.9.19-freddo.tgz` (422 142 byte, SHA-256 `aa2a0a92b3b16f115d0ff55e20e8d21b007b19596ba43b50cd05338dcb776768`; `tunet.db`, `-wal`, `-shm`).
- **Versione:** `ACASYSTEM_VERSION=0.9.19` in `progetto/.env`; allineati `isolated-server.mjs`, `release.check.mjs` e il README dei test e2e. Immagine `aca-system:0.9.19` (`sha256:29941e2c3a16d23913cc01a71ade35c4ad5dba5c64e9aa6776ba18828b75b684`).
- **Rete:** IPv4 Wi-Fi del PC `192.168.1.7` (`Get-NetIPAddress`; prima `172.20.10.6`). Binding LAN in `progetto/compose.tunet.yaml` aggiornato a `192.168.1.7:3002` (commenti compresi). Per il tablet `http://192.168.1.7:3002`.
- **Controlli:** container `aca-tunet-tunet-1` `healthy`; `/api/health` `{"status":"ok","version":"0.9.19"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; `/casa3d/manifest.json` servito; log di avvio senza errori; tabelle `casa3d_building`, `casa3d_image` e `casa3d_history` presenti (`CREATE TABLE IF NOT EXISTS`); `casa3d-prova` assente dai file serviti.
- **Copia a freddo DOPO:** `backup/banco/tunet-data-casa3d-T6-post-0.9.19-freddo.tgz` (414 354 byte, SHA-256 `c368fb3c05932c486bd941096bcd74e43763c022762220a1d146e6c690cff459`), estratta e aperta con `node:sqlite` nell’immagine `aca-system:0.9.19` con `--network none`: piano alla revisione 6, 1 piano e 6 stanze, impronta `9b909c96125f09b6`, 0 immagini, 1 punto di ripristino, `integrity_check` ok. Dopo la copia il container è stato riavviato (`healthy`).
- **Ripristino:** `ACASYSTEM_VERSION=0.9.18`, ricostruzione e copia PRIMA. Le tabelle nuove non disturbano la versione precedente (non provato).
- **Stato lasciato:** il piano d’esempio alla revisione 6 resta nel database (nessuna rotta lo cancella; prima non c’era nessun piano). Il `reverse` ADB `tcp:3002` resta attivo sul Tab M11; il `forward` di prova è rimosso.
- **Non provato sul banco:** il 403 (nessun utente non amministratore) e un secondo dispositivo con altro token. Evidenze in `backup/casa3d/T6/banco/`.

## Aggiornamento REP-20261020-002 — Casa 3D, T6, persistenza, 2026-10-21 (nessun cambio al banco)

Richiesta umana: «conferma /casa3d/ e nascondi la pagina di prova, poi procedi con T6». Il banco resta `aca-system:0.9.18` (in salute, T6 non è nell'immagine) e `progetto/.env` non cambia. **Cambia il codice dell'immagine che verrà costruita:** il backend crea tre tabelle nuove in `tunet.db` all'avvio (`casa3d_building`, `casa3d_image`, `casa3d_history`, con `CREATE TABLE IF NOT EXISTS`: un volume esistente si aggiorna da solo) ed espone le rotte `/api/casa3d/*` (piano, immagini, cronologia, esportazione), dietro il token di Home Assistant come le altre rotte `/api`. **Conseguenze per le operazioni:**
- le tabelle sono nello stesso file `tunet.db`: **entrano nelle copie a freddo** del volume (`tunet.db`, `-wal`, `-shm`) senza altri passi; per tornare indietro, ripristinare la copia a freddo (le tabelle nuove non sono toccate dalla versione precedente; non provato);
- le immagini del piano sono BLOB nello stesso file (al più 200 immagini e 128 MiB, 6 MB l'una): il file cresce di conseguenza; il piano segue `TUNET_ENCRYPTION_MODE`, le immagini non sono cifrate;
- nuova variabile facoltativa: `CASA3D_RATE_LIMIT_WINDOW_MS` e `CASA3D_RATE_LIMIT_MAX` (predefinito 120 richieste al minuto per indirizzo) sulle rotte `/api/casa3d`; non serve aggiungerla a `progetto/.env` né a `compose.tunet.yaml`;
- il corpo JSON resta limitato a 2 MB; le immagini hanno un limite proprio di 6 MB sulla sola rotta `PUT /api/casa3d/images/:id`;
- scrive il piano solo chi Home Assistant dichiara amministratore o proprietario (scelta provvisoria, ISSUE-102); dietro l'ingress del Supervisor nessuno scrive.
Prova sul PC (non sul banco): un backend locale con un file SQLite e un Home Assistant finto, tre contesti di un browser, poi copia della cartella dei dati a backend fermo (`backup/casa3d/T6/due-client/`). La fase «banco» di T6 (immagine, copia a freddo del volume e prova dal tablet e dal PC) non è eseguita; dettagli in [REP-20261020-002](reports/REP-20261020-002-casa-3d-piano.md), «T6 — Persistenza», e controlli in `verification.md`.

## Aggiornamento REP-20261020-002 — Casa 3D, T5, banco 0.9.18, 2026-10-21

Richiesta umana: «Organizza e continua il lavoro in autonomia mentre sono fuori casa», dopo l'accettazione di ADR-0014. Fase «banco» di T5 eseguita il 2026-10-21 (stesso incarico). **Rete:** l'IPv4 Wi-Fi del PC è ora 172.20.10.6 (era 192.168.1.27); il binding di `progetto/compose.tunet.yaml` è aggiornato nello stile esistente (copia `backup/casa3d/T5-banco/compose.tunet.yaml.prima`); gli indirizzi 192.168.1.27 delle voci precedenti sono storici. Copia a freddo a contenitore fermo: `backup/banco/tunet-data-casa3d-T5-pre-0.9.18-freddo.tgz`, 429336 byte, SHA-256 `ed240e956b1ed59040df55feed9e2aa42dbb36bd1f476929c2cde23e99f2a342`, `tar -tzf` con `tunet.db`, `tunet.db-wal`, `tunet.db-shm`. `ACASYSTEM_VERSION=0.9.18` in `progetto/.env` e nei file di `frontend/e2e` (`isolated-server.mjs`, `release.check.mjs`, `README.md`; copie in `backup/casa3d/T5-banco/pre-e2e/`). Immagine costruita da Compose: `aca-system:0.9.18`, ID `sha256:7b79f34e4820c0e16afa9034aad012e7b414dcd804ec8737b8123ee8403ea2bd`, creata 2026-10-20T22:02Z, `aca-tunet-tunet-1` in salute. `/api/health` con versione 0.9.18 e `/ha/auth/providers` 200 su 127.0.0.1 e 172.20.10.6 (Home Assistant non riavviato); `/casa3d/manifest.json` 0.9.18 (bundle 3D 798719 byte), `/casa3d/` senza indice 404 per scelta; log senza errori. L'immagine è costruita dall'albero di lavoro non committato e porta anche le modifiche non committate di altri incarichi. **Ripristino:** `ACASYSTEM_VERSION=0.9.17` in `progetto/.env`, il binding vecchio dalla copia, più la copia a freddo (o `backup/banco/tunet-data-casa3d-T3-pre-0.9.17-freddo.tgz`). Il contenitore è rimasto in esecuzione.

Prova sul tablet: Tab M11 (TB330FU) via USB (`adb reverse tcp:3002` e CDP sulla 9225, entrambi rimossi a fine prova; Chrome 155, 1280×665 a DPR 1,5), service worker e cache tolti, ricarica senza cache. Light 30 gesti su 32; Medium e High selezionabili (blocco massimo 476 ms) ma a circa 24 fps; tre perdite del contesto con ripristino; PSS di Chrome 193, 160-175 e 169 MB; ISSUE-062 senza picchi peggiori. Nessuna richiesta a terzi, nessun comando (adattatore in sola lettura). Non eseguiti: dito reale, telefoni, verticale, PC con GPU, TalkBack. Dettagli e limiti: [REP-20261020-002](reports/REP-20261020-002-casa-3d-piano.md), sezione «T5 — esito del banco»; controlli in `verification.md`.

## Aggiornamento REP-20261020-002 — Casa 3D, T3, banco 0.9.17, 2026-10-20

Richiesta umana: «Organizza e continua il lavoro in autonomia mentre sono fuori casa», dopo l'accettazione di ADR-0014. Fase «banco» eseguita il 2026-10-20 dopo T3 (stesso incarico). Copia a freddo del volume dati a container fermo: `backup/banco/tunet-data-casa3d-T3-pre-0.9.17-freddo.tgz`, 429344 byte, SHA-256 `a9332c3a221765c430c07caa5b83d623dd1397037585b6497bd5e62a30eb4652`, `tar -tzf` con `tunet.db`, `tunet.db-wal`, `tunet.db-shm`. `ACASYSTEM_VERSION=0.9.17` in `progetto/.env` e nei file di `frontend/e2e` (`isolated-server.mjs`, `release.check.mjs`, `README.md`); `compose.tunet.yaml` invariato (IPv4 Wi-Fi del PC ancora 192.168.1.27). Immagine costruita con `docker compose up -d --build`: `aca-system:0.9.17`, ID `sha256:3f9669fa76547a4dc58a768f1837fdd569f1ccdbb3e6393bcac1cba33f42b962`, creata 2026-10-20T17:09:37Z, in salute dopo circa 24 s. `/api/health` con versione 0.9.17; `/ha/auth/providers` 200 su 127.0.0.1 e su 192.168.1.27 (Home Assistant non riavviato); `/casa3d/` 404 per scelta (nessun indice), `/casa3d/manifest.json` 200 (versione 0.9.17), bundle `3d-727720bdd276.js` 200 (797236 byte); log del contenitore senza errori. L'immagine è costruita dall'albero di lavoro non committato e porta quindi sul banco anche le modifiche non committate di altri incarichi. **Ripristino:** `ACASYSTEM_VERSION=0.9.16` in `progetto/.env` più la copia a freddo (o `backup/banco/tunet-data-20261020-pre-0.9.16-freddo.tgz`). Prova sul tablet: Tab M11 (TB330FU) via USB (`adb reverse tcp:3002`, CDP sulla 9225; Chrome 1280×665 a DPR 1,5), service worker e cache svuotati, ricarica senza cache. Impostazioni > Sistema mostra 0.9.17. `#/casa3d-prova`: vista 3D con sei stanze, qualità Light (`low`), canvas 1224×518; sessione **amministratore** (`is_admin` vero). Registri letti da Home Assistant vero: 3 aree (Soggiorno, Cucina, Camera da letto), 0 piani, 4 dispositivi, 15 entità, 18 stati, lingua `it`; **3 stanze su 6 legate ad aree**, **0 dispositivi (pin) nelle stanze**. Gli stati coincidono con l'app (`weather.forecast_casa` poco nuvoloso 20,2, che l'app mostra come 20 °C; `person.mattia`, `sun.sun`, `zone.home`). `callService` dalla vista rifiutato con `Casa3dReadOnlyError` (`light.toggle`); 0 trame `call_service` sul websocket; 0 richieste a terzi; 0 errori, avvisi o eccezioni di console. Tornati a `#/` sulla home; le chiavi di `localStorage` del launcher (33 righe, token esclusi e non letti) hanno la stessa impronta prima e dopo. Evidenze: `backup/casa3d/T3-banco/` (`prova.cjs`, `prova-risultato.json`, `tablet-casa3d-prova.png`, `ls-prima.json`, `ls-dopo.json`). Limiti e ISSUE aperte: vedi [REP-20261020-002](reports/REP-20261020-002-casa-3d-piano.md), sezione «T3 — esito del banco». Nessun comando a impianti reali (adattatore in sola lettura). La voce «Casa 3D, T2b» qui sotto («nessun cambio al banco», immagine non ancora costruita per il banco) è storica.

## Aggiornamento REP-20261015-003 — 2026-10-15

Il piano umano autorizza release 0.9.10 e collaudo isolato dei venti tipi. Immagine completa finale costruita tramite Compose: `aca-system:0.9.10`, ID `sha256:8bc011a9abf0d1cee52ba6ec4314de0fa9f4e6cfa117e3b57f89e6788fa64fb1`; 90 file del dist locale identici all'immagine. JS `index-DErCxP8Y.js` (SHA-256 `d1084fbe7a7e2eb8023effe25a5026a6442fe55b9575fa8373df047abc06da49`), CSS `index-BxkHuO5G.css` (`5d24032b58b45aa820b0dfbb51d7dbca4131aae7f49425d2d41a219fa03e86b4`), index `3e5f79921dc97d68220dcc99c78a8fd9c00a5a349d1b62f77c2c513a9136a976`. Distribuita tramite Compose alle 23:48, senza copie manuali: health/versione 0.9.10, proxy HA 200, tutti i 90 file serviti conformi all’immagine, interfaccia isolata 0.9.10. Database integro e tutte le tabelle identiche prima/dopo. Provato anche il recupero del container precedente.

Alle 22:21, a container fermo, salvati `backup/banco/rep003-20261015-pre-0.9.10-volume-freddo.tgz` (406112 byte, SHA-256 `51f696f25f25adb171e839aa4ad76552e3ca72b8c4285500975faece42edb013`) e `backup/banco/rep003-20261015-container-ripristino.tar` (223015936 byte, SHA-256 `92ad2b7d3a0ed357eb63e47e9d468185fd5f89c7f9736a7d67279555dbb1fd02`). La snapshot `aca-system:rep003-20261015-ripristino`, ID `sha256:d038885f8e422fbcd1436d7a41b073d6097991e0025478e17927c0a264ea3cd4`, conserva il filesystem con il dist modificato, distinto dal solo tag 0.9.9. Recupero del container verificato mediante override Compose e hash degli asset precedenti; backup volume estratto in tmpfs senza rete, SQLite integro e impronte delle tre tabelle coincidenti. Il volume reale non è stato ripristinato. Procedura e override nel [report 003](reports/REP-20261015-003-widget-operativi.md#procedura-di-ripristino).

Il riavvio ha rilevato che `192.168.1.7` non è più assegnato. Osservato Wi-Fi **192.168.1.19** e aggiornato il binding specifico in Compose, mantenendo localhost. Banco raggiungibile su `http://192.168.1.19:3002`; il cambio di origine richiede di verificare l'accesso del tablet al nuovo URL. Volume e dati correnti conservati; HA 2026.9.4 non aggiornato né riavviato. Nessuna copia manuale nel nuovo container.

Banco isolato **127.0.0.1:3003**, server locale senza proxy/client in uscita e credenziali reali, stesso dist di produzione, CSP same-origin. Script e istruzioni in `frontend/e2e`; fixture solo simulate. Il M11 è stato scollegato dall'utente: caricamento/sessione al nuovo URL, orientamenti, ISSUE-062, TalkBack, testo effettivo 125/150% e standalone ancora non collaudati. Dispositivi fisici esclusi per scelta, nessun comando di prova agli impianti.

## Aggiornamento REP-20261020-002 — Casa 3D, T2b, 2026-10-20 (nessun cambio al banco)

Il banco resta `aca-system:0.9.16` (in salute): nessun aggiornamento, nessuna modifica a `progetto/.env`. Cambia il codice dell'immagine, non ancora costruita per il banco: il `Dockerfile` ha tre workspace (`frontend`, `backend`, `casa3d`); lo stadio di build esegue `npm ci --ignore-scripts` e `npm run build -w casa3d`, lo stadio finale copia `casa3d/dist` in `/app/casa3d/dist`; `.dockerignore` esclude `casa3d/upstream/`. Il backend serve `/casa3d/` (solo in produzione, stessa origine, CSP invariata): file con impronta `immutable`, `manifest.json` `no-store`, 404 esplicito per il resto. Costruita due volte con tag di prova (`0.9.16-t2b-prova`, `0.9.16-t2b-prova2`, rimossi), circa 857 MB. Al prossimo aggiornamento del banco: copia a freddo prima e versione alzata in `progetto/.env`. Percorso `/casa3d/` da confermare (ISSUE-089).

## Aggiornamento REP-20261020-001 — banco 0.9.16, 2026-10-20

Richiesta umana: stato spento in grigio nelle tessere non collegate. Immagine costruita con Compose (`docker compose up -d --build`, `compose.tunet.yaml`): `aca-system:0.9.16`, ID `sha256:d4f8e3e6401a114f5e250597165cb262f9844e2b10f035630e9296561e91e7ef`, creata 2026-10-20T12:22:12Z; bundle `index-vfVqDHyF.js` e `index-B76kd9E1.css`. **Copia a freddo prima** (container fermato): `backup/banco/tunet-data-20261020-pre-0.9.16-freddo.tgz`, 428587 byte, SHA-256 `55fbb0e1e89bc24440b3ca21c689a7a173a8912200f941943058fe2d5b0d5a3c`, `tar -tzf` 4 voci. Versione `ACASYSTEM_VERSION=0.9.16` in `progetto/.env`, `e2e/isolated-server.mjs`, `e2e/release.check.mjs`, `e2e/README.md` (copie in `backup/rep20261020-001b/v0916/`). Container `aca-tunet-tunet-1` healthy; `/api/health` con versione 0.9.16; `/ha/auth/providers` 200 su 127.0.0.1 e su 192.168.1.27 (Home Assistant non riavviato, non in onboarding). IPv4 Wi-Fi del PC 192.168.1.27 = binding LAN: nessun aggiornamento. Tablet: `adb reverse tcp:3002` e `adb forward tcp:9225` (CDP, rimosso a fine prove); orientamento orizzontale con `cmd window user-rotation lock 1`, poi `user-rotation free`. **Ripristino:** `ACASYSTEM_VERSION=0.9.15` in `progetto/.env` più la copia a freddo. Misure e controlli: [REP-20261020-001](reports/REP-20261020-001-widget-spenti-stanza.md) e [verification.md](verification.md). Nessun comando a impianti reali.

## Aggiornamento REP-20261020-001 — banco 0.9.15, 2026-10-20

Richiesta umana: widget completi in stato spento con l'etichetta «Da collegare» (sostituisce l'opzione B) e fluidità. Immagine costruita con Compose: `aca-system:0.9.15`, ID `sha256:fd4f931f7ccf7c4f4bff14317cc7e87ea66154df17db6bd33f4882f7f6099fcd`, creata 2026-10-20T04:04:48Z; `NODE_ENV=production`, `PORT=3002`, `DATA_DIR=/app/data`; bundle `index-BGkr_FM2.js` e `index-j0d10Pwj.css`. **Copia a freddo prima** (container fermato): `backup/banco/tunet-data-20261020-pre-0.9.15-freddo.tgz`, 428366 byte, SHA-256 `207f505f7033fe82b79a6561efc8cc2bbe35e938c1421e67a9621f970715b102`, `tar -tzf` 4 voci (`./`, `tunet.db`, `tunet.db-wal`, `tunet.db-shm`). Rete: IPv4 Wi-Fi del PC 192.168.1.27 uguale al binding `192.168.1.27:3002` di `progetto/compose.tunet.yaml`, nessun aggiornamento. Health: container healthy, `/api/health` versione 0.9.15, `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.27 (Home Assistant non riavviato). `ACASYSTEM_VERSION=0.9.15` in `progetto/.env`, `e2e/isolated-server.mjs`, `e2e/release.check.mjs`, `e2e/README.md`. Tablet: `adb reverse tcp:3002`, `adb forward tcp:9225`. Ripristino: `ACASYSTEM_VERSION=0.9.14` più la copia a freddo. Nessun commit, nessun comando a impianti. Misure in [REP-20261020-001](reports/REP-20261020-001-widget-spenti-stanza.md).

## Aggiornamento REP-20261019-003 — banco 0.9.14, 2026-10-19

Richiesta umana: giro mirato sui cinque punti osservati sul Tab M11 con la 0.9.13 («sì, avvia il giro»). Immagine costruita con Compose: `aca-system:0.9.14`, ID `sha256:b6b2af01c477e2b2742a5511d27846e22a718ff1ae5ee95c93a28da6ad514995`, creata 2026-10-19T20:31:50Z; bundle `index-D_SGyR0e.js` e `index-CcQdfQUb.css`, identici nel contenitore, nell'HTML servito e sul tablet. **Copia a freddo prima** (container `tunet` fermato): `backup/banco/tunet-data-20261019-pre-0.9.14-freddo.tgz`, 428218 byte, SHA-256 `5fbe0050d630a7f8d7c01439762566837eab9649d4e0cc6d54b91dc432393814`, `tar -tzf` mostra `./`, `tunet.db`, `tunet.db-wal`, `tunet.db-shm`. **Rete:** l'IPv4 Wi-Fi del PC è cambiato da 192.168.1.7 a **192.168.1.27**; aggiornati commento e binding in `progetto/compose.tunet.yaml` (`192.168.1.27:3002`, localhost mantenuto); la porta risponde sul nuovo indirizzo. Il cambio di origine richiede di verificare l'accesso del tablet (il tablet è stato provato via `adb reverse tcp:3002` e `adb forward tcp:9225`, quindi con `localhost`). Controlli: `aca-tunet-tunet-1` healthy; `/api/health` = `{"status":"ok","version":"0.9.14"}` e `/ha/auth/providers` = 200 su 127.0.0.1:3002 e 192.168.1.27:3002; `homeassistant` attivo, nessun `onboarding_required`, nessun riavvio. `ACASYSTEM_VERSION=0.9.14` in `progetto/.env` e negli script `e2e` (`isolated-server.mjs`, `release.check.mjs`, `README.md`); copie dei file prima della modifica in `backup/rep20261019-003c/` (il `cp` sulla cartella ha sovrascritto lì `compose.tunet.yaml`, `README.md`, `isolated-server.mjs` e `release.check.mjs` già presenti, con il contenuto 0.9.13 corrente: perdita presumibilmente nulla, non accertata). Ripristino: `ACASYSTEM_VERSION=0.9.13` in `progetto/.env`, ricostruire e, se serve, ripristinare la copia a freddo (non provato). Provato sul Tab M11 (`localStorage` del launcher identico prima e dopo, 34 chiavi); prima prova invalidata perché il service worker serviva ancora il vecchio bundle, rifatta con cache svuotata. `release.check.mjs` usa ancora le evidenze e il manifest della 0.9.10. Nessun commit, nessun comando a impianti, Home Assistant non toccato. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md), sezione «Rifinitura e banco 0.9.14».

## Aggiornamento REP-20261019-003 — banco 0.9.13, 2026-10-19

Richiesta umana: correggere l'anteprima attenuata di ISSUE-076 e misurarla sul tablet. Immagine costruita con Compose: `aca-system:0.9.13`, ID `sha256:bb5962d58447ca22cd09b728d9271d7dbc81339923adf9b3038774c4978c4b35`, creata 2026-10-19T15:32:38Z; bundle `index-CMIhvSTe.js`. **Copia a freddo prima**: `backup/banco/tunet-data-20261019-pre-0.9.13-freddo.tgz`, 428046 byte, SHA-256 `141df0df274c9ee8c1e94b8d187b2a58eb03296ca2bd8c719cf432f4b2433f39`, `tar -tzf` 4 voci. Rete: IPv4 Wi-Fi del PC 192.168.1.7 = binding `192.168.1.7:3002` di `progetto/compose.tunet.yaml`, nessuna modifica. Controlli: `aca-tunet-tunet-1` healthy; `/api/health` = `{"status":"ok","version":"0.9.13"}` e `/ha/auth/providers` = 200 su 127.0.0.1:3002 e 192.168.1.7:3002; `homeassistant` attivo da 4 giorni, nessun `onboarding_required`, nessun riavvio. `ACASYSTEM_VERSION=0.9.13` in `progetto/.env` e negli script `e2e` (copie in `backup/rep20261019-003b/pre-bump/`). Ripristino: `ACASYSTEM_VERSION=0.9.12` più la copia a freddo (non provato). Provato sul Tab M11 (`adb reverse tcp:3002`, `adb forward tcp:9225`; `localStorage` del launcher identico prima e dopo, 34 chiavi). `release.check.mjs` usa ancora le evidenze e il manifest della 0.9.10. Nessun commit, nessun comando a impianti, Home Assistant non toccato. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md).

## Aggiornamento REP-20261019-003 — banco 0.9.12, 2026-10-19

Richiesta umana: opzione B di ISSUE-076, «va misurata sul tablet». Immagine costruita con Compose: `aca-system:0.9.12`, ID `sha256:eeff9370959c6c799bd346748b778df6a5720a7b383fd264e3fa736b2904d4e6`, creata 2026-10-19T13:58:51Z; bundle `index-DtspZQd5.js`. **Copia a freddo prima**, a container `tunet` fermato: `backup/banco/tunet-data-20261019-pre-0.9.12-freddo.tgz`, 429401 byte, SHA-256 `40fd0b5aa5c991248aa2e78b5eab9eafe1a5485c2d589ca2db92aff759a97c3a`, `tar -tzf` 4 voci. Rete: IPv4 Wi-Fi del PC 192.168.1.7 = binding `192.168.1.7:3002` di `progetto/compose.tunet.yaml`, nessuna modifica. Controlli: `aca-tunet-tunet-1` healthy; `/api/health` = `{"status":"ok","version":"0.9.12"}` e `/ha/auth/providers` = 200 su 127.0.0.1:3002 e 192.168.1.7:3002; nessun `onboarding_required`. `ACASYSTEM_VERSION=0.9.12` in `progetto/.env` e negli script `e2e` (`isolated-server.mjs`, `release.check.mjs`, `README.md`). Ripristino: `ACASYSTEM_VERSION=0.9.11` più la copia a freddo (ripristino non provato; l'immagine 0.9.11 non è stata ricontrollata). Provato sul Tab M11 (`adb reverse tcp:3002`, `http://localhost:3002`, `localStorage` del launcher identico prima e dopo; il forward CDP 9225 è stato rimosso, il reverse 3002 è ancora attivo). `release.check.mjs` usa ancora le evidenze e il manifest della 0.9.10. Nessun commit, nessun comando a impianti, Home Assistant non toccato. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md).

## Aggiornamento REP-20261019-002 — banco 0.9.11, 2026-10-19

Richiesta umana: «metti la 0.9.11». Immagine costruita con Compose: `aca-system:0.9.11`, ID `sha256:90869e9c25f112beb543e4450292de9c39a5e1fb66ebf981d7779508e5d3ecd4`, creata 2026-10-19T10:46:07Z; bundle `index-7zKPGD3t.js`. **Copia a freddo prima**, a container `tunet` fermato: `backup/banco/tunet-data-20261019-pre-0.9.11-freddo.tgz`, 428858 byte, SHA-256 `0289762502baca219215041a2f1cf51ce326b3f4183050802b4bed7d8c556508`, `tar -tzf` 4 voci. Rete: IPv4 Wi-Fi del PC 192.168.1.7 = binding `192.168.1.7:3002` di `progetto/compose.tunet.yaml`, nessuna modifica. Controlli: `aca-tunet-tunet-1` healthy, `homeassistant` attivo da 4 giorni e non toccato; `/api/health` = `{"status":"ok","version":"0.9.11"}` e `/ha/auth/providers` = 200 su 127.0.0.1:3002 e 192.168.1.7:3002; nessun `onboarding_required`, nessun riavvio di HA. Ripristino: `ACASYSTEM_VERSION=0.9.10` più la copia a freddo (procedura nel [report 003](reports/REP-20261015-003-widget-operativi.md#procedura-di-ripristino); l'immagine 0.9.10 non è stata ricontrollata). Provato sul Tab M11 (`adb reverse tcp:3002`, `http://localhost:3002`, localStorage invariato); `release.check.mjs` usa ancora le evidenze e il manifest della 0.9.10 (vedi la nota più sotto). Nessun commit, nessun comando a impianti. Dettagli: [REP-20261019-002](reports/REP-20261019-002-correzioni-issue062-075-077.md).


## Banco corrente verificato il 2026-10-14

**Annotazione del 2026-10-15, audit in sola lettura [REP-20261015-002](reports/REP-20261015-002-audit-resoconto.md):** alle 15:00 circa Europe/Rome il container è healthy, health ok/versione 0.9.9 e immagine ancora `sha256:5a9ed917768d0ff98d660216ad61f60356a58fcfb5655e2c5a3f89c5041aa891`, ma `docker diff` rileva modifiche a `/app/frontend/dist`. Sono serviti `index-Df7kljmP.js` (SHA-256 `4eb1bbdc67715750c919874ba961ff707280865d7755f87e490f57f39dfe6e70`) e `index-HD4WDER4.css` (`fb067d1ff6380551ad53249d79bedc271fad187eb24123a9304b955b298298e8`), uguali al dist locale preesistente. Le voci del 14 ottobre restano storico dell'immagine, non descrizione completa del filesystem corrente. Copia `backup/banco/tunet-data-20261015-pre-0.9.10-freddo.tgz` presente, 406797 byte, SHA-256 `abb3c440c6157078c817a2fd4e26d28dc856d2cb94cc66754fa49b2f9ace567e`, tar leggibile con db/wal/shm; modalità a freddo e ripristino non provati dall'audit. Nessuna modifica/ricreazione del banco. La build di verifica è isolata sotto backup/audit-20261015/dist e non è stata distribuita; il suo JS YZmyFge5 differisce da quello servito.

- **Dal 2026-10-14, 17:51 (REP-20261014-010, correzione del nome segnaposto dei widget di categoria non associati):**
  - **Immagine:** `aca-system:0.9.9`, `sha256:5a9ed917768d0ff98d660216ad61f60356a58fcfb5655e2c5a3f89c5041aa891`, creata il 2026-10-14T15:51:16Z dai sorgenti del working tree; `ACASYSTEM_VERSION=0.9.9` in `progetto/.env` (escluso da Git). Contiene la correzione di `CategoryWidgetContent.tsx` (etichetta di catalogo solo per Multimedia e Sonos) che la 0.9.8 non aveva. Nessun commit.
  - **Copia a freddo:** `backup/banco/tunet-data-20261014-pre-0.9.9-freddo.tgz`, 406.802 byte, SHA-256 `e2289e9e8bb4ca422cc94a12dd126dd49877d534b4e90baebb57e68489720e8c`, a container fermo (`docker compose stop tunet`, poi Alpine con il volume in sola lettura); contiene `tunet.db`, `tunet.db-wal` e `tunet.db-shm`. Lo stop del container è terminato con codice 137.
  - **Controlli:** container `healthy`; `/api/health` `{"status":"ok","version":"0.9.9"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; bundle `index-BjUHSvp_.js` su entrambi, con la condizione `media`/`sonos` della correzione. HA non è andato in `onboarding_required`, nessun riavvio.
  - **Rete:** IPv4 Wi-Fi del PC `192.168.1.7`, uguale al binding di `progetto/compose.tunet.yaml`: nessuna modifica.
  - **Tablet:** Tab M11 via `adb reverse` e CDP, pagina ricaricata (da `index-BgxLazso.js` a `index-BjUHSvp_.js`), `/api/health` 0.9.9 letto dalla pagina, sessione HA non toccata, disposizione salvata invariata, app lasciata su Principale. Nomi letti nel [report 010](reports/REP-20261014-010-sistemazione-issue.md).
  - **Ripristino:** `ACASYSTEM_VERSION=0.9.8` in `progetto/.env` più la copia del volume dal `.tgz` (l'immagine `aca-system:0.9.8` è ancora nel Docker locale). Ripristino dati non eseguito.

- **Dal 2026-10-14, 17:36 (REP-20261014-010, correzioni di Calendario/Attività, Multimedia/Sonos e vista pagine):**
  - **Immagine:** `aca-system:0.9.8`, `sha256:e928744d146141181db3198aa3b0ffaa68ac8423f5c8ece0f39ba97d52a07c61`, creata il 2026-10-14T15:36:57Z dai sorgenti del working tree; `ACASYSTEM_VERSION=0.9.8` in `progetto/.env` (escluso da Git).
  - **Copia a freddo:** `backup/banco/tunet-data-20261014-pre-0.9.8-freddo.tgz`, 403.798 byte, SHA-256 `5fb728d391982cdf47649299575b5d2d776a4c714062cd6770f66ab83e469b1e`, a container fermo; contiene `tunet.db` con `-wal` e `-shm`.
  - **Controlli:** container `healthy`; `/api/health` `{"status":"ok","version":"0.9.8"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; bundle `index-BgxLazso.js`. HA non è andato in `onboarding_required`, nessun riavvio.
  - **Rete:** IPv4 Wi-Fi del PC `192.168.1.7`, uguale al binding di `progetto/compose.tunet.yaml`: nessuna modifica.
  - **Tablet:** Tab M11 via `adb reverse`, pagina ricaricata via CDP, sessione HA non toccata, disposizione salvata invariata (nove pagine).
  - **Ripristino:** `ACASYSTEM_VERSION=0.9.7` in `progetto/.env` più la copia del volume dal `.tgz`. Ripristino dati non eseguito.

- **Dal 2026-10-14, 16:21 (REP-20261014-009, categorie/kit e correzioni emerse sul tablet):**
  - **Immagine:** `aca-system:0.9.7`, `sha256:7754c47acc67c4800083ba0c3e62c6e6eef7afdaeaaacbc17d0d13ac56c84668`, creata il 2026-10-14T14:20:58Z; `ACASYSTEM_VERSION=0.9.7` in `progetto/.env` (escluso da Git). Sorgenti del working tree, nessun commit.
  - **Copia a freddo:** `backup/banco/tunet-data-20261014-pre-0.9.7-freddo.tgz`, 218.283 byte, SHA-256 `7710515876df5e50796fa6226b35d327a14319adbb27fd56ed49c02ed0bc02e9`. Prima del lavoro: `tunet-data-20261014-pre-0.9.4-freddo.tgz`, 203.637 byte, SHA-256 `0931a902552c53aca8f86e9bd29412f6bbbddece8d266f4c01a8e633a5da3b4d`. Copie intermedie pre-0.9.5 e pre-0.9.6 conservate in backup/banco; hash nel report.
  - **Avvio:** `docker compose -f progetto/compose.tunet.yaml build tunet`, copia del volume a container fermo con Alpine, poi `up -d --no-build tunet`. Stesso volume `aca-tunet_tunet-data`; HA non ricreato.
  - **Controlli:** healthy; health/versione, index, bundle `index-C1c5Y-MI.js` (421.189 byte) e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`. Build e budget superati.
  - **Tablet:** Tab M11 TB330FU via USB (`adb reverse`/CDP), sessione HA conservata; nove pagine e 28 widget (25 categorie + tre Copertina), reload e rotazione provati. Evidenze in `backup/tablet-009/` e nel [report 009](reports/REP-20261014-009-banco-tablet.md).
  - **Ripristino applicativo disponibile:** tag 0.9.6 conservato; impostare `ACASYSTEM_VERSION=0.9.6` e `up -d --no-build tunet`. Il banco precedente all'incarico era 0.9.3, anch'esso conservato. Ripristino dati non eseguito; copie manuali non equivalgono a backup automatico collaudato.

- **Dal 2026-10-14, 10:07 (REP-20261013-002, barra unica in basso, ADR-0013):**
  - **Immagine:** `aca-system:0.9.3`, `sha256:1cba363b6f6e4fc54390ebfb13383b7a0f2c75966efc1684d82175106cbbc80a`, creata il 2026-10-14T08:07:02Z dai sorgenti del working tree; `ACASYSTEM_VERSION=0.9.3` in `progetto/.env`.
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261014-pre-0.9.3-freddo.tgz` (188 393 byte, SHA-256 `63dcd26beaf7a0e4f8a9e4e907cdfcd2e78d6cddc68b7b203de2c397fd58949f`), a container fermo con `alpine`; contiene `tunet.db` con `-wal` e `-shm`.
  - **Rete:** il PC è di nuovo in ufficio, rete «MeMo Repeater 5 Ghz I», con `192.168.1.7`. Il binding del compose è passato da `192.168.1.17` a `192.168.1.7` (`up -d --no-build` sulla 0.9.2, poi la build della 0.9.3).
  - **Controlli:** container `healthy`; `/api/health` risponde `{"status":"ok","version":"0.9.3"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; bundle `index-C8F-qxyS.js`.
  - **Tablet:** il Tab M11 (TB330FU) apre la 0.9.3 su `http://localhost:3002` via `adb reverse tcp:3002 tcp:3002`, con l'accesso fatto dall'utente; misure in [REP-20261012-003](reports/REP-20261012-003-lag-tablet-prestazioni.md#tab-m11-2026-10-14). Gli script delle misure sono in `backup/strumenti-tablet/`, con un `LEGGIMI.md`.
  - **Ripristino:** `ACASYSTEM_VERSION=0.9.2` in `progetto/.env` più la copia del volume.

- **Dal 2026-10-13, 17:45 (REP-20261013-001, «Fine» al posto di «Conferma»):**
  - **Immagine:** `aca-system:0.9.2`, `sha256:0e708b41bc4da5349cb750bf08da9b2e42b0e96b1c3444b1ffd6c8851cd85ec0`, creata il 2026-10-13T15:44:47Z dai sorgenti del working tree; `ACASYSTEM_VERSION=0.9.2` in `progetto/.env`.
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261013-pre-0.9.2-freddo.tgz` (134 274 byte, SHA-256 `cd63174a0bcb6f892364192a09328aa046435be50454e11f2547b3d00478ec5c`).
  - **Controlli:** container `healthy`; `/api/health` risponde `{"status":"ok","version":"0.9.2"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.17`; bundle `index-qaiumG36.js`, che contiene `data-widget-action="done"`.
  - **Ripristino:** `ACASYSTEM_VERSION=0.9.1` in `progetto/.env` più la copia del volume.

- **Dal 2026-10-13, 00:17 (REP-20261012-003, blocco L2):**
  - **Immagine:** `aca-system:0.9.1`, `sha256:81217e57757a16d9afaedbdd758c0ea40dc2387af101a87faa0d12df2683b3e1`, creata il 2026-10-12T22:16:51Z dai sorgenti del working tree; versione da `progetto/.env` (`ACASYSTEM_VERSION=0.9.1`).
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261013-pre-0.9.1-freddo.tgz` (134 283 byte, SHA-256 `9a98cbf40c5a33c82eccb4d3f56edccee736bd10358e78b364d25ba7d3309c20`).
  - **Controlli:** container `healthy`; `/api/health` risponde `{"status":"ok","version":"0.9.1"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.17` (rete di casa «PosteMobile-40713171»); bundle `index-rqrtF8mx.js`.
  - **Tablet:** sul Galaxy Tab S8, via `adb reverse`, Samsung Internet carica la 0.9.1 (`/api/health` 0.9.1). La misura è rimandata: alle 00:20 il tablet era bloccato e lo sblocco spetta all'utente. Via Wi-Fi da casa serve la regola del firewall (vedi sotto).
  - **Ripristino:** `ACASYSTEM_VERSION=0.9` in `progetto/.env` più la copia del volume.

- **Dal 2026-10-12 (REP-20261012-001, -002, -003 tappa 1, -004):**
  - **Immagine:** `aca-system:0.9`, `sha256:9a66d934c039a4b90bf23faee65cf515525aba04254ad36f2ad91761bb3fc533`, creata il 2026-10-12T15:23:02Z dai sorgenti del working tree.
  - **Versione da `progetto/.env`:** `ACASYSTEM_VERSION=0.9`. Il file è escluso da Git; `progetto/.env.example` è versionato. Il compose usa la variabile per il tag dell'immagine, per l'argomento di build e per l'ambiente del container: senza la variabile `docker compose` si ferma con un messaggio. Il backend la restituisce in `/api/health` e il frontend la usa come ripiego della riga «Versione» di Sistema (REP-20261012-004).
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261012-pre-0.9-freddo.tgz` (126 028 byte, SHA-256 `c7fd1a8e746f82d0d9c8aac970e70de06563eb46222802ab6cc6fb2b4d01a362`).
  - **Controlli:** container `healthy`; `/api/health` risponde `{"status":"ok","version":"0.9"}` e `/ha/auth/providers` 200, su `127.0.0.1` e su `192.168.1.7`; bundle `index-DG_i_to_.js`.
  - **Indirizzo Wi-Fi:** invariato, `192.168.1.7` sulla rete «MeMo Repeater 5 Ghz»; per il tablet `http://192.168.1.7:3002`.
  - **Ripristino:** `ACASYSTEM_VERSION=0.8` in `progetto/.env` (l'immagine `aca-system:0.8` resta in locale) più la copia del volume. Nessuna prova di ripristino dei dati.
  - **Misure sul tablet:** il tablet delle demo (TB336ZU, Chrome 154) è stato misurato su 0.8 e su 0.9 via USB e CDP; esiti in [REP-20261012-003](reports/REP-20261012-003-lag-tablet-prestazioni.md#misure-sul-tablet-delle-demo-tb336zu-08--09).
  - **2026-10-12 sera, rete di casa:**
    - **Rete e indirizzo:** il PC è sulla rete «PosteMobile-40713171» con `192.168.1.17`. Il binding è passato a `192.168.1.17`, poi `up -d --no-build`. `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.17`.
    - **Il tablet non raggiungeva il banco via Wi-Fi.** `nc -z 192.168.1.17 3002` dal tablet andava in timeout.
      - Causa: il profilo della rete di casa è **Privato**, mentre le regole in ingresso di Windows per `com.docker.backend.exe` valgono solo per il profilo **Pubblico**. In ufficio la rete era pubblica.
      - Abilitare Docker anche sul profilo Privato è un'impostazione di sicurezza del PC, quindi la cambia l'utente: Sicurezza di Windows → Firewall → Consenti app → `com.docker.backend` → Privato.
    - **Soluzione usata senza toccare il firewall:** `adb reverse tcp:3002 tcp:3002` sul tablet collegato via USB. Il tablet apre `http://localhost:3002`, un'altra origine, quindi l'utente ha fatto un nuovo accesso.
    - **Galaxy Tab S8 (SM-X700, REP-20261012-003):** Chrome 154 non espone `chrome_devtools_remote` nemmeno dopo il riavvio. Samsung Internet 30 (Chromium 143) espone `Terrace_devtools_remote` e si misura con CDP grezzo sulla pagina, perché `connectOverCDP` di Playwright non si aggancia.

- **Dal 2026-10-10, 10:38 (REP-20261009-003, -004, -005, -006):**
  - **Immagine:** `aca-system:0.8`, `sha256:a552c711ecb74108f64ed4aef728d841030ae2372799d80b67edda7b1c6fdd72`, creata il 2026-10-10T08:35:35Z dai sorgenti del working tree.
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261010-pre-0.8-freddo.tgz` (104 306 byte, SHA-256 `0a32ad2bad0672f72a9d31e6b3e228788550614300202564a18cdbbe45e379e2`). Fatta a container fermo con `alpine` (scaricata da Docker Hub per l'occasione); contiene `tunet.db` con `-wal` e `-shm`. Il container si è fermato con codice 137 allo scadere dei 10 s.
  - **Controlli:** container `healthy`; `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.11`; bundle `index-BLpMNnba.js`. Il CSS servito contiene `--aca-shell-foot`, `aca-page-overview__tools` e `--aca-hold-scale`.
  - **Indirizzo Wi-Fi:** il PC è sulla rete «PosteMobile-40713171» con `192.168.1.11`; il binding `192.168.1.42` della 0.7 non esisteva più. Il tablet apre `http://192.168.1.11:3002`, che per il browser è un'altra origine: servono un nuovo accesso e una disposizione salvata per quell'origine.
  - **Prima dell'aggiornamento:** Docker Desktop era chiuso dopo lo spegnimento del PC. È stato riavviato tramite `explorer.exe`, e HA rispondeva di nuovo `onboarding_required`; `docker restart homeassistant` lo ha riportato sulla configurazione vera (`/auth/providers` 200).
  - **Spegnimenti del PC durante le prove:** 4 riavvii senza arresto regolare tra il 2026-10-09 00:15 e il 2026-10-10 02:19 (Kernel-Power 41). I codici di arresto sono 0x10E e 0x116, del driver grafico (NVIDIA GeForce RTX 5050 Laptop, driver 32.0.16.1088); i minidump sono in `C:\Windows\Minidump`. Sono avvenuti con browser di prova e suite in parallelo. Da allora le prove usano Chromium senza GPU, un browser alla volta, e Vitest con quattro processi. L'aggiornamento del driver spetta all'utente.
  - **Ripristino:** `image: aca-system:0.7` più la copia del volume. Nessuna prova di ripristino dei dati.
  - **2026-10-12, 10:40:** il PC è di nuovo sulla rete «MeMo Repeater 5 Ghz I» con `192.168.1.42`. Il binding è passato da `192.168.1.11` a `192.168.1.42`, seguito da `up -d --no-build` con la stessa immagine. `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.42`; bundle `index-BLpMNnba.js`.
  - **2026-10-12, circa 12:00:** il PC è passato a «MeMo Repeater 5 Ghz» con `192.168.1.7` e il tablet non raggiungeva più il banco. Il binding è passato a `192.168.1.7`, seguito da `up -d --no-build`. `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.7`. Il tablet delle demo (TB336ZU) ha richiesto un nuovo accesso, fatto dall'utente.
  - **Debug del tablet via USB (REP-20261012-003):** `adb` è in `C:\Users\matti\AppData\Local\Android\Sdk\platform-tools`. Debug USB attivato dall'utente; Chrome raggiungibile con `adb forward tcp:9222 localabstract:chrome_devtools_remote` e CDP.
- **Dal 2026-10-09, 12:12 (REP-20261009-002):**
  - **Immagine:** `aca-system:0.7`, `sha256:e1a688d18f0738b2d3fa99a12e527d5720b8247d4eb316b9c60bc1c75a7920e5`.
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261009-pre-0.7-freddo.tgz` (80 591 byte).
  - **Controlli:** container `healthy`; `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.42`; bundle `index-BU0wYGPs.js`.
  - **Ripristino:** `image: aca-system:0.6`.
- **Dal 2026-10-08 (REP-20261008-001):**
  - **Immagine:** `aca-system:0.6`, `sha256:cf27d8a30c44af0212a5da68491d8c85c59e0418c541a2058eee30a540e9780c`, creata il 2026-10-08T21:31:29Z dai sorgenti del working tree.
  - **Controlli:** container `healthy`; `/api/health` risponde `{"status":"ok","version":"0.1.0"}`; `/ha/auth/providers` risponde 200 `application/json`; il bundle è `index-CD3c4iGC.js`.
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261008-pre-0.6-freddo.tgz` (60 398 byte). Contiene `tunet.db` con `-wal` e `-shm` ed è stata fatta a container fermo.
  - **Indirizzo Wi-Fi:** il PC è passato all'hotspot «HUAWEI Y6 2018», quindi la porta per i tablet ascolta su `10.165.121.134:3002` invece di `172.20.10.6:3002`, che non esisteva più. Il browser del tablet tratta il nuovo indirizzo come un'altra origine: servono un nuovo accesso e una disposizione salvata per quell'origine.
  - **Ripristino:** `image: aca-system:0.5` in `progetto/compose.tunet.yaml` (`sha256:143fee7…786ec8`) più la copia del volume. Nessuna prova di ripristino dei dati.
  - **Incidente del 2026-10-08, 23:58:**
    - **Cosa è successo:** Docker Desktop, che si era chiuso, è stato riavviato. Il container `homeassistant`, con `restart: unless-stopped`, è ripartito prima che Docker collegasse il disco C:. Il bind `/mnt/c/homeassistant/config → /config` ha preso una cartella vuota e HA rispondeva `onboarding_required`, come un'installazione nuova.
    - **Dati:** la configurazione vera in `C:\homeassistant\config` non è stata toccata (`.storage/auth` delle 23:32, `onboarding` del 2026-10-05).
    - **Rimedio:** `docker restart homeassistant` a Docker pronto. Poi `/auth/providers` e `/ha/auth/providers` rispondono 200 in locale e su `10.165.121.134`.
    - **Procedura dopo ogni riavvio di Docker Desktop:** controllare che `curl http://127.0.0.1:8123/auth/providers` non risponda `onboarding_required`; se lo fa, riavviare il container. Non completare l'onboarding nella cartella vuota.
  - **Ripetizione il 2026-10-09 alle 00:20.**
    - **Causa:** Docker Desktop era stato avviato dall'agente dentro la sessione, e la chiusura della sessione l'ha chiuso. Va lanciato tramite `explorer.exe`, staccato dalla sessione.
    - **HA:** di nuovo `onboarding_required`, risolto con `docker restart homeassistant`.
    - **Container del banco:** è ripartito senza porte pubblicate (`docker port` vuoto), perché il PC era su un'altra rete Wi-Fi, «PosteMobile-40713171» con `192.168.1.11`. L'indirizzo `10.165.121.134` non esisteva più.
    - **Rimedio:** binding del compose portato a `192.168.1.11:3002`, poi `up -d --no-build`. Ora `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e su `192.168.1.11`.
    - **2026-10-09, 09:25:** il PC è passato alla rete «MeMo Repeater 5 Ghz 2» con `192.168.1.42`. Binding aggiornato; `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.42`.
    - **Avvertenza:** ogni cambio di rete del PC richiede di aggiornare il binding. Un indirizzo stabile, cioè un IP fisso o un ascolto su tutte le interfacce con regola del firewall, è una decisione dell'utente.
- [Compose](../progetto/compose.tunet.yaml), stato precedente: progetto `aca-tunet`, container `aca-tunet-tunet-1`, immagine `aca-system:0.5` dal 2026-10-07 (REP-20261007-004, pagina `/ui-kit`; prima `aca-system:0.4` `sha256:0d2fbc7…ebd933`, REP-20261007-003; `aca-system:0.3` `sha256:857bcb5…76beb`, REP-20261007-002, proxy di HA; `aca-system:0.2` `sha256:de33f56…8ae7` e `aca-system:0.1` `sha256:be0f93a…7b09c8`), porta `127.0.0.1:3002` e, dal 2026-10-07, l'indirizzo Wi-Fi del PC per i tablet (REP-20261007-011; `172.20.10.6` dal 2026-10-07, prima `192.168.1.42`). Immagine in esecuzione `sha256:143fee7752269157f2ffd909f214abe6ef0c038fa07cfa5a2555c154d4786ec8` (REP-20261007-034…038; prima `sha256:91dd2aa…255cd`, REP-20261007-031/032/033; prima `sha256:f960e49…c65c`, REP-20261007-030; prima `sha256:0d55349…dfd7`, REP-20261007-029; prima `sha256:f11b9e0…66552`, REP-20261007-028; prima `sha256:4dd4436…6e3eda`, REP-20261007-027, e `sha256:a3ff1db…5aabd`), stato `healthy`; `/api/health` risponde `{"status":"ok","version":"0.1.0"}`.
- Sorgenti in `progetto/acasystem/`: workspace frontend React/Vite e backend Express, applicativo TypeScript con controlli strict. Dockerfile Node 26 Alpine; frontend compilato e backend TypeScript eseguito da Node. Il codice dell'interfaccia Tunet sostituita è stato cancellato il 2026-10-07 (ISSUE-029); le istantanee `usa-come-git/v009`–`v011` lo conservano.
- Volume persistente invariato: `aca-tunet_tunet-data` → `/app/data`. Cifratura applicativa `off`. Copia a freddo del volume presente in `backup/banco/tunet-data-20261007-pre-acasystem-freddo.tgz` (8516 byte), eseguita prima dell'aggiornamento autorizzato. Nessuna prova di ripristino dei dati, nessun backup automatico o nuovo backup HA.
- Backend → HA: `TUNET_INTERNAL_HA_URL=http://host.docker.internal:8123`. L'identità viene verificata soltanto presso gli URL configurati sul server; un URL HA inviato dal client non viene usato. Senza configurazione valida, le API protette rispondono 503 `HA_URL_NOT_CONFIGURED` (SEC-1).
- **Dal 2026-10-07 (ADR-0009, REP-20261007-002), Browser → Acasystem → HA:** il browser parla solo con `http://localhost:3002/`. Il server inoltra a HA sotto `/ha` (lista consentita, WebSocket incluso) e l'accesso avviene con la pagina Acasystem. Requisiti di HA e limiti nel [README del progetto](../progetto/acasystem/README.md). Esposizione di HA in rete (porta 8123) invariata: la chiusura è una decisione da prendere con l'installazione del pilota.
- Storico, prima di ADR-0009: Browser → HA con sessione OAuth2 preesistente conservata dopo il ricaricamento su `http://localhost:3002/`. Il pannello Sistema mostra «Collegato» a `http://localhost:8123`; copertina, pagina Principale e ritorno da Sistema verificati nel browser laterale. Nessun comando a dispositivi fisici eseguito.
- Inter è servito localmente. Mappe OpenStreetMap, loghi esterni e risorse fornite dalle integrazioni HA possono richiedere internet (ISSUE-016); questa verifica non certifica funzionamento completo offline, LAN/remoto o dispositivi.

Per avviare l'immagine già costruita: `docker compose -f progetto/compose.tunet.yaml up -d --no-build`. Per ricostruire dai sorgenti: stesso comando con `--build`; questo crea un nuovo artefatto e richiede le verifiche del relativo incarico. Dal 2026-10-12 il compose legge la versione da `progetto/.env` (`ACASYSTEM_VERSION`): va alzata prima di ricostruire. Il ripristino della versione precedente è documentato in REP-20261006-002; non è una prova di ripristino dei dati. Le sezioni datate 2026-10-05 sotto conservano lo stato storico.

## Inventario verificato e previsto

| Risorsa | Evidenza attuale | Destinazione prevista |
|---|---|---|
| Repository locale | Git inizializzato; documentazione e copia originale versionate | Storico di codice, configurazioni e documenti quando autorizzati. |
| Area backup locale | Acquisizione Tunet in backup/tunet-acquisizione-20261005/; copie manuali del volume in backup/banco/, escluse da Git | Backup HA, automazione, frequenza, accessi e ripristino da progettare e provare. |
| Sorgenti e banco prova Acasystem | 0.1.0, derivato da Tunet 1.22.1 revisione 5dec995; [progetto/](../progetto/README.md), frontend «OS» Metallo e backend TypeScript | Demo in ufficio; ulteriore sviluppo solo su incarico. |
| Ambiente test/staging | Banco prova su Windows 11 Home, Docker Desktop/WSL 2; HA e Tunet locali | Non è un ambiente di produzione o staging con dispositivi fisici collaudati. |
| Cloud Hetzner storico | Nessuna configurazione acquisita; REQ-01 ritirato dall'utente | Escluso dalla direzione corrente; nessun fornitore sostitutivo scelto. |
| DNS e TLS | Domini del PRD sono esempi; nessuna proprietà o configurazione verificata | Endpoint e certificati da definire. |
| Host locale e client del pilota | Macchina corrente Windows/Docker, container Linux; frontend nel browser locale. HA 2026.9.4 installato dall'utente | Linux 64 bit ARM64/x86-64; mini PC/Raspberry, tablet e dispositivi fisici da scegliere. |
| Rete cablata e Wi-Fi | Descrizione umana preliminare; topologia e funzione della componente Wi-Fi da chiarire | Collegamenti locali, reti dei dispositivi e condizioni offline da documentare. |
| Hardware condiviso da più utenti | Valutazione richiesta; capacità e isolamento non provati | Distinguere stesso impianto da abitazioni separate, senza scegliere una topologia. |
| Repository remoto / CI | Nessun remote o workflow configurato | Scelta successiva, con controlli e accessi da definire. |

Non registrare segreti o identificativi personali non necessari. Per ogni futura risorsa annotare ambiente, responsabile, configurazione versionata, costo/budget se pertinente, data dell'ultima verifica e riferimento al report.

## Componenti candidati

Home Assistant e il riferimento frontend React Tunet sono approvati come direzione. Nel banco prova sono installati HA Container 2026.9.4 e Acasystem 0.1, derivato da Tunet 1.22.1; il metodo/versioni dell'hardware finale restano aperti. Le dipendenze correnti sono nel lockfile dei workspace; HAKit non è stato aggiunto.

Docker Compose, reverse proxy, tunnel, database e motore AI erano candidati originali; non sono tutti prerequisiti della fase grafica. Se necessari, motivarne uso e collocazione locale nel relativo incarico. Hetzner e i tier CPX originali restano soltanto nello storico della proposta ritirata.

Le porte, i record DNS e i percorsi proposti nel PRD non costituiscono la configurazione operativa del prodotto. Il banco prova usa soltanto gli endpoint e percorsi seguenti.

## Banco prova verificato il 2026-10-05

- HA preesistente: container homeassistant, porta host 8123 su tutte le interfacce come installato dall'utente, dati `C:\homeassistant\config` → `/config`. Questa configurazione esterna al repository non è stata modificata né importata in Git.
- Tunet: [compose.tunet.yaml](../progetto/compose.tunet.yaml), progetto Compose aca-tunet, immagine locale aca-tunet:1.22.1-aca-panels-neu1 dopo REP-20261005-010 (precedenti immagini gestione, HOME Neumorphism, HOME TS e baseline aca-tunet:1.22.1-5dec995 conservate), container aca-tunet-tunet-1; ascolto host `127.0.0.1:3002`.
- Browser → HA: `http://localhost:8123`, OAuth2 completato dall'utente; Tunet mostra CONNECTED e Authenticated via OAuth2. Non esiste un nuovo account remoto ACA/Tunet.
- Backend → HA: `http://host.docker.internal:8123`; challenge WebSocket auth_required ricevuta e schermata profili senza errore. Le credenziali non sono state lette o registrate dall'agente.
- Tunet → dati: volume Docker aca-tunet_tunet-data → `/app/data`; SQLite/profili, cifratura upstream off. Layout e sessione browser sono separati dal volume.
- Build: Dockerfile upstream node:26-alpine e npm ci; baseline upstream registrata e HOME TS/italiano/mx-icons e primo materiale Neumorphism applicati. La ripresa del design non aggiunge dipendenze. Lockfile corrente conserva le versioni preesistenti e aggiunge le dipendenze del report di migrazione. Il tag base è mobile; digest/versioni osservati nel report. Nessuna CI è attiva.

Procedura di avvio eseguita e comandi di gestione pianificati in [progetto/README.md](../progetto/README.md). Il comando Compose riguarda Tunet e non ricrea HA. Persone/client della LAN, remoto, TLS, backup e riavvio offline non sono stati collaudati; la porta Tunet è riservata alla macchina corrente.

## Procedure operative da definire e provare

Le righe seguenti sono requisiti documentali delle procedure future, non comandi eseguiti o runbook pronti per produzione.

| Procedura | Informazioni necessarie | Evidenza di accettazione |
|---|---|---|
| Installazione/provisioning | Ambiente di destinazione, versioni, prerequisiti, rete, storage, segreti esterni e configurazioni versionate | Avvio in ambiente autorizzato, servizi attesi raggiungibili, accessi non previsti rifiutati. |
| Deploy/aggiornamento | Artefatto/versione, compatibilità gateway-client-backend, controlli iniziali, eventuali migrazioni e sequenza | Verifiche funzionali pertinenti e versione osservata dopo il rilascio. |
| Ripristino di versione | Condizioni di attivazione, versione precedente, compatibilità dati e responsabile | Ritorno verificato alla versione scelta in test isolato. |
| Backup | Dati/configurazioni inclusi, destinazione, cifratura, accessi, conservazione e responsabilità | Copia disponibile e integra; la sola esecuzione del backup non prova il recupero. |
| Ripristino dati/gateway | Prerequisiti, credenziali esterne, ordine di recupero e trattamento delle configurazioni | Recupero provato con dati di test e controllo delle funzionalità recuperate. |
| Monitoraggio | Salute servizi, gateway offline, disco, certificati, errori e destinatari autorizzati | Simulazione del guasto e segnale osservato. Nessuna notifica è attivata da questo documento. |
| Incidenti | Diagnostica anonimizzata, contenimento, ripresa e report dell'incidente | Cronologia, causa/evidenze e verifica di regressione se pertinente. |

RPO, RTO, disponibilità attesa, retention e frequenze dei controlli non sono definiti: richiedono requisiti e budget del primo rilascio. Definirli senza trasformare stime in garanzie.

## Dati, accessi e trasporto

Separare gli ambienti e descrivere chi può leggere, amministrare o aggiornare ogni servizio quando viene progettato. Segreti forniti tramite meccanismo esterno allo storico; gli esempi di configurazione devono esserne privi. Il registro [compliance.md](compliance.md) raccoglie condizioni dei fornitori e questioni sui dati.

Per LAN/remoto documentare percorso reale, punti di terminazione TLS, autenticazione e isolamento degli impianti. Il meccanismo remoto e la proprietà end-to-end restano da progettare (ISSUE-013). Perdita di internet, riavvio del frontend/gateway e guasto della rete locale richiedono scenari distinti (V-02/V-03/V-15).

Progettare il primo setup con sessione admin aperta soltanto inizialmente e consegna con account cliente. Aggiornamenti, manutenzione e recupero riguardano l'hardware fornito negli immobili; accesso remoto permanente dei sistemisti e distribuzione su una macchina condivisa sono decisioni ancora aperte.

## Regola per i futuri interventi

Ogni operazione necessita di un incarico umano che identifichi ambiente e risultato. Prima del cambiamento acquisire lo stato necessario; dopo registrarne configurazione osservata, verifiche e limiti in un report. Una procedura passa da progettata a provata solo con evidenza; i controlli automatici e i runbook eseguibili saranno introdotti nei relativi incarichi.

Aggiornamento locale REP-20261005-010: runtime osservato sha256:a6b097e6f92effd06948b45beedfaa6e2f6aafce4c54e2a6d37829cf50483b47, healthy. Dopo un tentativo di rebuild offline del Dockerfile upstream fallito sul passaggio apk non presente in cache, il builder e il runtime sono stati derivati dalle immagini locali dell'intervento precedente, copiando i sorgenti/build attuali, senza reinstallare pacchetti. Dockerfile temporanei ed evidenze restano in backup/panels-skeleton-20261005, esclusi da Git. Dockerfile upstream, lockfile, HA e volume dati invariati; resta valido il limite del tag base mobile per ricostruzioni future.


Ultima copia immediatamente precedente al rilascio, 2026-10-15 23:48: `backup/banco/rep003-20261015-pre-release-volume-freddo.tgz`, **406105 byte**, SHA-256 `a613ed9f2259b3cf13f8335c27575eec07bf94f178f771e884db63ad22645026`. Estrazione in tmpfs senza rete verificata, SQLite integro e dati identici al rilascio. Per il recupero dati preferire questa copia più recente; snapshot filesystem e override restano quelli descritti nel report.

Annotazione 2026-10-19 (REP-20261019-002; **la frase sul banco non aggiornato è superata dalla voce «banco 0.9.11» in cima**): `progetto/.env` ora dice `ACASYSTEM_VERSION=0.9.11` (file locale, ignorato da Git), come richiesto dall'utente. **Il banco non è stato aggiornato**: resta `aca-system:0.9.10` finché non si ricostruisce l'immagine con Compose; fino ad allora `/api/health` e Sistema mostrano 0.9.10 e `e2e/release.check.mjs` (aggiornato alla 0.9.11) fallisce di proposito. Al rilascio autorizzato vanno rigenerati manifest degli asset ed evidenze di `release.check.mjs` per la nuova build: lo script usa ancora `backup/rep003/release` e `backup/assets-image-final.json` della 0.9.10 e li sovrascriverebbe. Nessun backup, build, container o dato del banco toccato.

Annotazione 2026-10-19 (REP-20261019-001): il binding LAN del banco è tornato a **192.168.1.7**, sulla rete «MeMo Repeater 5 Ghz» (sostituisce 192.168.1.19 della nota del 2026-10-15). Il container è stato ricreato senza build (stessa immagine `aca-system:0.9.10`); health e provider rispondono 200 su 127.0.0.1 e su 192.168.1.7. Il tablet usa `adb reverse tcp:3002` (`http://localhost:3002`) e le DevTools su 127.0.0.1:9225 (la 9222 è occupata da un processo del PC). Dati registrati come riferiti dall'incarico; nessuna modifica al banco durante le prove.

## VM acasystem-ha avviata (2026-10-23)

HAOS 18.3 con Core 2026.10.2 nella VM VirtualBox `acasystem-ha` (Host-Only 192.168.56.101, NAT temporanea, RAM 3072 MB temporanea, grafica vmsvga, paravirtualizzazione hyperv perché VirtualBox gira sopra l'hypervisor di Windows). Proprietario creato dall'utente. Snapshot: «prima-del-primo-avvio», «dopo-onboarding». VM spenta a fine giornata. Dettagli in REP-20261023-003, sezione V1.

## VM acasystem-ha avviata (2026-10-23)

HAOS 18.3 con Core 2026.10.2 nella VM VirtualBox `acasystem-ha` (Host-Only 192.168.56.101, NAT temporanea, RAM 3072 MB temporanea, grafica vmsvga, paravirtualizzazione hyperv perché VirtualBox gira sopra l'hypervisor di Windows). Proprietario creato dall'utente. Snapshot: «prima-del-primo-avvio», «dopo-onboarding». VM spenta a fine giornata. Dettagli in REP-20261023-003, sezione V1.
