# Verifiche ed evidenze

## NAT per il primo avvio della centrale su PC — 2026-11-23

[REP-20261123-003](reports/REP-20261123-003-nat-installatore-pc.md): 187 test, typecheck e build superati. Su VirtualBox 7.2.22 e disco pubblico verificati primo download in NAT, passaggio automatico a bridge, health e QR LAN. Bridge confermato dopo un avvio a freddo. Contenuto dell'EXE 0.2.2 confrontato byte per byte con i file di setup collaudati. Prova di destinazione e telefono fisico non eseguiti.

Pubblicazione verificata il 2026-11-23 con download anonimo completo. HTTP 200, 115.591.051 byte e SHA-256 corrispondente all'EXE collaudato e all'impronta pubblica. [Pre-release centrale-vm-18.4-2](https://github.com/acamemo/acasystem-releases/releases/tag/centrale-vm-18.4-2).

Riscontro successivo sul PC ACA. Dopo un'installazione pulita, Core e Acasystem erano raggiungibili via NAT. VirtualBox è passato in bridge a 10 min 40 s dall'avvio della VM. La scoperta LAN è scaduta. Health LAN e tempo totale non misurati. [Collaudo sul PC ACA](reports/REP-20261123-003-nat-installatore-pc.md#collaudo-sul-pc-aca--2026-11-23).

Ripristino sul PC ACA. Ciclo manuale del cavo di 10 s a bridge attivo, DHCP Request con ACK, quindi health LAN HTTP 200 e QR aggiornato. L'utente conferma la conclusione dell'installazione, il funzionamento del QR e l'apertura dell'app. Nell'automazione locale, 188 test, typecheck e build superati. [Evidenze e limiti](reports/REP-20261123-003-nat-installatore-pc.md#ripristino-lan-con-ciclo-del-cavo-ore-1646-cet).

Versione 0.2.3 pubblicata. Flusso reale del setup da zero su VM isolata, pronto in 422,7 s con ciclo da 10 s e health e QR LAN. Build e contenuto dell'EXE verificati. Download anonimo HTTP 200, 115.648.834 byte e SHA-256 corrispondente. [Collaudo e pubblicazione](reports/REP-20261123-003-nat-installatore-pc.md#preparazione-della-023--2026-11-23).

## Avanzamento del primo avvio di Home Assistant — 2026-11-23

[REP-20261123-002](reports/REP-20261123-002-avanzamento-preparazione-core.md): 184 test del client Windows, typecheck e build superati. Contatore di ricezione verificato da VirtualBox 7.2.22 su VM temporanea. Renderer compilato verificato con Playwright per preparazione indeterminata, ricezione, progresso positivo e ritorno indeterminato, anche a 390 px. Installazione completa del nuovo client sul PC lento non eseguita.

## Diagnosi installazione su PC Windows — 2026-11-23

[REP-20261123-001](reports/REP-20261123-001-diagnosi-installazione-pc.md): client 0.2.1, asset GitHub da 591.441.407 byte scaricato in 58,89 s al primo tentativo. SHA-256 e `tar.exe` in 0,44 s e 1,90 s. Verificati digest dell'EXE, campione GitHub e campioni GHCR dal PC host. 178 test del client e typecheck superati. Creazione e avvio della VM ricostruiti con codice ed evidenze storiche. Nuovo primo avvio e verifica sul PC lento da eseguire separatamente.

## Tentativi di recupero LAN/stabilità VM — 2026-11-16

[REP007](reports/REP-20261116-007-recupero-lan-stabilita-vm.md): **problema non risolto**,5profili rifiutati. nohz=off:VirtualSync109,424s su300,349s; cap99:85,508s su300,653s; guestHyperV:300,383s su300,383s PASS, poi vero EXE10/30slinkoff PASS e60s FALLITO con ulteriori134,047s GivenUp. VirtIO e3CPU testati con nuovo programma completo suPS5.1/7, linkoff per300s:0,841s/43,787s sincronizzati e contatori/avvisi negativi. Nessun keepalive o pausa/ripresa per ottenere PASS. Provider/cap/NIC/CPU e cmdline originari ripristinati; Windows/protezioni/hypervisor host non modificati. Un singolo campione positivo non viene promosso.

Nuovo controllo `Test-AcaVirtualBoxStability.ps1`:8regressioni suPS5.1 e7 PASS; rileva anche i negativi reali. Packaging9Node/0skip, launcher13simulati suPS5.1/7 PASS, distinti dalle prove reali. [Kit diagnostico .76.1-vm-r2](../backup/rep095/pilot-vm-r2/acasystem-pilot-candidate-0.9.76.1-vm-r2.zip):26file/SHA7cec8f95,8delta previsti e nessun rimosso rispetto al kit congelato. App2010fonti SHA46674138,120runtime live, client ed executor originali. Nessuna immagine ricostruita o pubblicazione. La prima preparazione con diverso nome interno del client è stata respinta e conservata; byte client identici, nome ricavato dalla provenienza e kit corretto.

SQLite integro,13tabelle personali e2client preesistenti esatti,1nuovo client di prova revocato via API/refresh completato,5identità HA iniziali invariate. Sensore QA assente dopo reboot, servizio attivo e flow aperto/annullato senza owner/file0600. Chiave REP007 revocata e rifiutata255/publickey prima dello stop Dropbear; porta chiusa, shutdown con ack e poweroff osservato, CONFIG scollegata/UARToff. Banco .72/ok stesso ID/avvio. Restano scelta/confronto piattaforma, Lenovo, vera continuità e dispositivi; nessuna qualifica H24.

## Qualifica Core, LAN e client .76.1 — 2026-11-16

[REP006](reports/REP-20261116-006-qualifica-core-lan-client-0761.md): sulla sola VM REP092, Core2026.11.1 e kit congelato05cd8037. **45/45descrittori del catalogo esercitati,27scenari PASS** in3harness (18+4+5): token/utenti/permessi, form/menu/errori/external/progress, entry/options/registri/automazioni, eventi e delta entità, discovery sintetica/ignore, brands/upload/serial list, calendario/to-do, storia/statistiche non vuote, meteo e snapshot/MJPEG con demo ufficiali Core. Le chiamate protette includono dinieghi, non solo risposte positive. Copertura dettagliata e limiti hardware/cloud/radio/HLS/WebRTC nel report; nessun attuatore o account eWeLink.

**Vero client Windows0.1.1:10/10 PASS**, bundle .76 dalla VM via LAN, profilo esistente, sessione/cache alla riapertura e Riprova dopo stop/start della sola ACA.390px controllati come viewport, non telefono. **Corsa finale interruzione link VM: FALLITA**:12letture sane prima, link on dopo, ma Home/HTTP/Observer/SSH non recuperati nelle attese; pausa/ripresa manuale ripristina accesso. Stall RCU/watchdog osservati nel lotto, ISSUE-129 aperta; niente H24 o qualifica Lenovo. Primi tentativi con errori dell'harness e sovrapposizione di un restart conservati e distinti.

Kit24file/2010fonti/11executor e120file runtime sia immagine sia live esatti.13tabelle personali selezionate esatte, riga client originale esatta più1nuovo client QA revocato;5identità HA iniziali identiche. Fixture rimossa/Core riavviato, servizio attivo senza owner e file0600. Chiave REP006 revocata e rifiutata255/publickey a Dropbear ancora attivo, poi porta chiusa; shutdown senza ack seriale ma poweroff osservato separatamente, CONFIG scollegata/UART off. Banco .72/ok stesso ID/avvio. Nessun sorgente applicativo o test generale modificato/rieseguito, nessun push/pubblicazione; prove e scheda portabile in `backup/rep094/`.

## Recupero servizio HA autonomo dopo restore — 2026-11-16

[REP005](reports/REP-20261116-005-recupero-servizio-ha-dopo-restore.md): sulla sola VM REP092/HAOS18.4/Core2026.11.1/Supervisor2026.11.0, update reale .75.1→**.76.1**, guasto .76.2 con1profilo sintetico eliminato e rollback PASS.14tabelle personali selezionate esatte, SQLite integro; backup2551808byte con DB/WAL/credenziale manutenzione e senza service-secret. Il servizio viene rigenerato dal prodotto **senza sessione owner**: nuovo ID solo per l'identità locale riconosciuta, altre4identità HA con impronta ID/ruoli/stato identica, file0600 e flow Sonoff aperto/annullato con il solo nuovo token di servizio. Registro startup/user:null/missing_secret. Non recuperati vecchi token e nessuna nuova custodia/privilegio. Riserva owner verificata prima nella .75.1; .74.1 fallita per collisione del nome LLAT, tutti gli intermedi conservati.

Reboot completo .76.1 PASS: main/companion autoavviati,14tabelle esatte e stessa identità rigenerata ancora attiva prima di qualsiasi contatto owner. Facciata successiva con repairInvokedfalse, catalogo200/Sonoff201 mascherato/annullato200 e nuovo check worker current/0.9.76 con timestamp nuovo PASS. Nessun dispositivo fisico o credenziale eWeLink usati. **70/70backend mirati e strict,80/80Node/0skip,7smoke immagine** PASS; backend generale815PASS/1FAIL/1skip su817casi (famiglie già RED nei byte .73.6). I70sono un sottoinsieme della suite generale, non si sommano ad essa. Runtime120file/11executor esatti, fonte2010file con soli2runtime/3test cambiati; lockfile e Node26.13.1 invariati. Kit24file SHA05cd8037 con CRC/checksum/fonti/client esatti e nessun materiale privato.

VM finale spenta/CONFIG scollegata/UARToff, entrambe le chiavi temporanee revocate; ultima challenge255/publickey prima di fermare Dropbear. Pipe seriale EPIPE durante richiesta shutdown, poweroff confermato separatamente. Banco sola lettura **.72/ok, stesso ID/immagine/StartedAt**,0VM attive, staging vuoto/HEAD invariato. Evidenze `backup/rep093/*076*`, `automatic-restore-comparison.json`, `final-conservation-auto.json`. Stall RCU/journald del guest sull'host corrente ancora osservati: ISSUE-129 non risolta, nessuna qualifica H24/Core completa/Lenovo/LAN/client fisici o distribuzione GitHub/GHCR reale; nessun push o CI remota.

## Collaudo .73.2/executor su nuova VM — 2026-11-16

[REP004](reports/REP-20261116-004-collaudo-0732-executor-vm.md): HAOS18.4/Core2026.11.1/Supervisor2026.11.0,2GiB/2CPU su VM da ZIP ufficiale vergine. .73.2 byte-esatta installata, pristine14tabelle personali vuote e onboarding sintetico/Sonoff mascherato annullato PASS; Core effettivo osservato, `coreMarkedVerified=false`. Executor originale **FALLISCE** stop nativo (`state:error` con container rimosso); corretti riscontro Engine e timestamp PAX nativi, poi race di avvio della5 corretta nel candidato6. Regressioni RED→GREEN, ultime **80/80Node/0skip** e **7/7check immagine6** PASS. CRC/checksum annidati/11file executor/2010fonti/client esatti, nessun materiale privato nel kit6 SHA646debf1. Actionlint1.7.12 PASS locale, nessuna CI remota; controlli bootstrap/Python/client dei lotti precedenti non conteggiati come nuove esecuzioni.

Supervisor/Engine reali con registry/catalogo/feed **locali di fixture**: update2→3 PASS, guasto3→4 elimina1profilo sintetico e termina42, restore immagine/dati PASS con14tabelle selezionate esatte e integritàok. **Recupero funzionale HA FALLITO:** segreto servizio escluso perso, keeper inattivo e Ripara409 (ISSUE-166); nessuna modifica della politica ADR-0022. Update3→5→6 reali e **reboot completo6 PASS**, main/companion autoavviati, nuovo controllo worker terminato current con timestamp nuovo,14tabelle esatte. Il restore usava copie QA dei moduli corretti; l'update5→6 usa l'executor6 incorporato. Non è una prova di distribuzione dal vero GitHub/GHCR o dispositivi fisici.

**Idle300s NEGATIVO:** host300,575s/VirtualSync303,041s, scarto+2,47s oltre soglia2s,0nuovi GivenUp/3servizi attivi senza restart. Nessuna sonda esterna nell'intervallo centrale; normali servizi interni attivi. ISSUE-129 resta aperta, nessuna qualifica H24/PC del capo. Revocata chiave SSH e nuova connessione rifiutata255/publickey prima di fermare Dropbear; VM spenta ordinatamente, CONFIG scollegata e UART disabilitata. Staging DNS/CA/registry/redirectGit disattivato. Banco letto soltanto, **.72/ok stesso ID/immagine/StartedAt**; staging Git vuoto/HEAD invariato. Evidenze in `backup/rep092`, risultati e fonti primarie datate nel report; consegna non qualificata.

## Executor e pipeline locali — 2026-11-16

[REP-20261116-003](reports/REP-20261116-003-executor-pipeline-locale.md): **76/76Node PASS,0skip**, Sonoff originale esplicito; **10/10bootstrap PASS** con correzione stdin/tmpfs proveniente da REP002 e **4/4Python PASS**. Su Linux isolato **22/22PASS**: permessi POSIX reali, Supervisor HTTP/immagini simulati, SQLite temporaneo reale. Provati backup corrotto anche oltre il magic SQLite, credenziale assente/target diverso, dataLoss, rollback e recupero dopo commit senza perdere nuove scritture. Una copia isolata della sola vecchia decisione fingerprint produce il RED atteso su perdita account. Non sono backup/update/restore HAOS reali.

Immagine finale ACA0.9.73/app0.9.73.2: **7check PASS** con Docker reale senza rete/socket/mount/porte host, rootfs read-only e tmpfs. Main senza config, init privata/idempotenza, manutenzione/bundle/status e worker chiuso senza Supervisor; nessuna prova del companion privilegiato dedotta. Audit: **11file executor nell'immagine esatti**, etichetta/provenienza/hash coerenti,2010fonti runtime e kit24file/client0.1.1 con CRC/checksum annidati e byte delle fonti esatti. Hash e log finali in `backup/rep091/final-image-audit.json`, `final-kit-audit.json`, `final-*-r2.log`; dettagli degli harness inizialmente RED nel report. Actionlint1.7.12 PASS, shellcheck/pyflakes non eseguiti; workflow remoto non attivato.

Banco .72/ok letto soltanto, ID/immagine/avvio invariati; nessuna nuova verifica dei dati interni dedotta. Collaudo distinto REP002: evidenza idle prima di ACA/Sonoff **RED** sulla nuova VM del PC corrente, Real300,330s/VirtualSync85,485s/4nuovi timer-catchup-abandoned, ISSUE-129 aperta. Core2026.11.1 osservato lì non amplia i vincoli18.4/2026.9.4 del kit locale. PC del capo, LAN/telefono, hosting/riavvio companion e aggiornamenti/ripristino reali restano da eseguire; `.73.1` e `.73.2` mantengono attribuzioni separate.

## VM HAOS vergine e app desktop reali — 2026-11-16

[REP002](reports/REP-20261116-002-collaudo-vm-vergine.md): nuova VM VirtualBox 7.2.22/HAOS 18.4/Core 2026.11.1/Supervisor 2026.11.0 con 2 GiB/2 CPU, senza dati del banco. **Idle 300,330 s FALLITO prima di ACA/Sonoff:** VirtualSync +85,485 s, GivenUp +240,013 s, quattro abbandoni timer; nessuna sonda nel periodo centrale. ISSUE-129 riprodotta su questo host, nessuna qualifica H24 o causa accertata.

Staging locale .73.1 con immagine `175af576…`, 19 RootFS diffID e fonti `9b470e0a…` esatte; SonoffLAN originale 3.13.3 installato e 14 moduli importati. Bootstrap corretto per `/tmp` tmpfs con stream binario verificato prima della scrittura, senza cambiare pin o installer. Ultima esecuzione root: **20/20 Node mirati** (10 bootstrap, 10 banco/PSModulePath; zero skip) e **4/4 Python** PASS. Pristine reale precedente all'owner: integrità ok e 14 conteggi personali zero; primo errore del harness e correzione espliciti nel report.

API onboarding PASS con un owner sintetico e un servizio, form Sonoff mascherato poi annullato, zero entry e nessuna credenziale eWeLink. Vero EXE Windows 0.1.1 con userData/sessionData isolati: IP → bundle .73 → accesso → profilo → Home in primo piano PASS, 9 pagine/32 contenitori-preset, non dispositivi fisici. Prima screenshot con pannello Trova sovrapposto distinto dal retest corretto; zero comandi HA e zero errori pagina. Due test QA simulati e otto harness separati dai risultati reali. Riavvio add-on e reboot guest effettivi: 13 tabelle personali selezionate con conteggi/SHA esatti, ACA autoavviata, API e app nuovamente utilizzabili. Il primo controllo di salute a 45 s era ancora negativo, senza start manuale o esito occultato.

VM spenta regolarmente, CONFIG scollegata e seriale disabilitata. Chiave SSH revocata con rifiuto autenticazione prima di fermare Dropbear; servizio inactive/masked-runtime, non disabilitato permanentemente sul filesystem read-only. Pulizia combinata rifiutata dalla revisione automatica: nessuna cancellazione, file privati QA protetti e fuori kit. Banco .72/ok stesso ID/avvio; VM storiche non avviate. **Non provati:** update/rollback reale, catalogo pubblico, Core produzione fissato a 2026.9.4, dispositivi/eWeLink/telefono del destinatario. Candidato .73.2 dell'altra chat separato. Evidenze selezionate `backup/rep090/`, non CI o release pubblica.

## Preparazione pilota con subagenti — 2026-11-16

[REP-20261116-001](reports/REP-20261116-001-consegna-pilota-con-subagenti.md): backend84/84 in7file e strict PASS; aggregato `progetto/ha-app/pilot/*.test.mjs` con archivio Sonoff originale esplicito **58/58 PASS,0skip**, più2provenienza e1bundle: **61/61 finali**. Include HTTP Supervisor/Engine su loopback/pipe temporanee, SQLite reale temporaneo, journal, restore simulato, policy, packaging, collisioni e publisher con fixture. Nessun backup/restore, daemon o push reale dedotto.

Windows0.1.1 compilato: smoke Electron IP9/9 e nuovo startupupdate4/4 PASS, con profili temporanei e server fixture LAN. Lo startup resta prima di bundle/app/WS durante `updating`, rilegge health dopo503/cambio versione e supporta404legacy. Nuovi helper: core38 mirati e frontend14 PASS; strict core/Windows/Android/frontend PASS. Estensione QR/mockup:61PASS/4FAIL non promossi a controllo generale verde; dettagli e limiti ISSUE-134 nel report.

Immagine ACA0.9.73/app0.9.73.1 costruita da2010fonti congelate, SHA sorgenti `9b470e0af4c644dd2f581187ed13240e63e301670f4e6956df08d1dd12a107f6`. Build frontend/Casa3D e SQLite nativo PASS; smoke immagine8/8 con `--network none`, DB vuoto e senza mount del banco, controllando health/bundle/manutenzione/fingerprint. L'immagine e il pacchetto non sono una release pubblicata.

VirtualBox:13 verifiche finali simulate su PowerShell5.1/7; inventario reale `-InspectOnly` exit0 rileva VirtualBox7.2.22, Windows64bit,15,7GiB, virtualizzazione/hypervisor e OpenSSH. Nessuna creazione o modifica VM, CONFIG, chiave privata o ACL reale. Hyper-V:32runtime+2scenari+8guardie+5argomenti in isolamento, non qualifica del PC Home. VM vergine/Core effettivo, timer/riavvio/LAN, onboarding del destinatario e accesso eWeLink reali restano non eseguiti. Kit r2 con22file e client completo verificato da CRC/checksum e byte delle fonti; audit in `backup/rep089/pilot-candidate-final-r2-audit.json`.

## Materiali pilota e logica aggiornamenti — 2026-11-13

[REP007](reports/REP-20261113-007-installer-aggiornamenti-pilota.md):32test Node pertinenti PASS (8bootstrap simulati,21selezione/transazione/disponibilità,3packaging esistenti),4test Python PASS,8guardie/WhatIf PowerShell con cmdlet simulati e5argomenti nativi roundtrip PASS. ZIP Sonoff originale installato e ripetuto in directory temporanea:48file, installed→unchanged; nessun HA reale. ZIP di setup candidato14file, checksum annidati/provenienza e byte degli script verificati. Sintassi shell/Node/parser PowerShell PASS.

Sono verifiche locali su file temporanei e lifecycle simulato: nessun risultato HAOS/Hyper-V/telefono, backup o restore del banco dedotto. Il tentativo separato di provare un'ACL in directory temporanea è stato rifiutato dalla revisione automatica («blocked by policy»): **non eseguito**, senza dedurne il funzionamento dei permessi sul target. Il controllo read-only dell'host rileva Windows11Home, hypervisor presente e cmdlet Hyper-V assenti, distinto dal Lenovo Pro dichiarato. Executor, avvio/pipeline e matrice di prove reali restano aperti nel report.

## SonoffLAN, TRVZB e campo password — 2026-11-13

[REP005](reports/REP-20261113-005-banco-sonofflan-trvzb.md): SonoffLAN3.13.3 supporta TRVZB via cloud;17moduli importati sullo stesso HA2026.9.4 in isolamento. Backup completoHA33file esatti/SQLite integro,48file componente originali verificati; dati selezionati utenti/credenziali HA e provider/config entries invariati prima del nuovo login, non file auth completi o token. Difetto campo password stringa riprodotto RED e corretto con una riga runtime, riuso maschera/occhiolino e input senza trim:71backend+9frontend e strict backend/frontend PASS; buildfrontend .72 PASS. Fonte2003con tre soli file diversi dalla .71, immagine candidata228file/110frontend esatti e smokeisolato/networknone/0mountreali PASS. Primo tentativoFROMimageID fallito prima della build e corretto con taglocale verificato; nessuna mutazione del banco da quel tentativo.

Aggiornamento locale ACA .72/r99 con backup freddo verificato e27/27tabelle esatte; account/profili/sessioni e dati di identità HA selezionati invariati, HA/D1 stessiavvii durante il cambio ACA. HTTP .72healthy/casa ready/entryesatta e normalizzazione password effettiva PASS; revisione indipendente228file live+48Sonoff PASS. Dopo l'accesso eWeLink umano, registri HA con1bridge+2TRVZB e2climate attivi/36entità; il campione intermedio0dispositivi precedeva la persistenza successiva. Evidenze operative in `backup/rep086/`, archivi con segreti ignorati. **L'utente conferma «inserito il widget, funziona tutto» il2026-11-13:** inserimento e prova d'uso riusciti secondo la fonte umana, senza misure strumentali o specifici comandi fisici dedotti. Nessun comando fisico impartito dall'agente. Controlli generali widget/debitoISSUE-134/161 non ripetuti o dichiarati risolti; prova offline non eseguita.

## Banco PC alla .71 — 2026-11-13

[REP003](reports/REP-20261113-003-banco-pc-071.md): provenienza .71 ricontrollata2003file e immagine c0208ce2 derivata dal runtime .70 con il solo frontend nuovo. Audit isolato228file e smoke senza rete/mount reali PASS prima del cambio. Backup freddo219237byte/SHA cdde35b7 integro,27/27tabelle identiche e schema esatto; account HA3identità, profili, credenziali/fingerprint e mount conservati. Audit operativo6/6 e revisione indipendente8/8 PASS. Docker Desktop inizialmente spento, avviato; confronti HA/D1 riferiti alla baseline successiva all'avvio, invariata durante il cambio del solo ACA.

23Compose con variazione limitata a immagine/versione, rollback .70 pronto non applicato. Tutti228file distribuiti ricontrollati nel container attivo,110frontend esatti; HTTP loopback/LAN .71/casa ready/index/entry esatti/API401 protetta. Browser anonimi1366/390 con Accedi leggibile,0timeout/overflow/JS/richieste extra/login/comandi, chiusi e PNG ispezionati dopo le animazioni. Nessuna prova autenticata/Safari/hardware o pubblicazione; frontend già verificato nel REP002, nessuna nuova esecuzione delle suite dichiarata. Evidenze backup/rep085.

Annotazione tardiva dello stesso incarico: confronto esatto5/6 e fallbackseen_at RED conservati. Qualifica aggiuntiva PASS:26tabelle/account/profili/client/sessioni immutati e schema27esatto; cache40→18 con17righe stabili,1nuova per coppia user/refresh preesistente e23 rimozioni compatibili conTTL7giorni. Timestampnuovo dopoavvio .71; nessuna attribuzione di origine/login/comando o istante esatto di pruning. Controllo/review separati in late-cache-activity-audit.json e late-cache-independent-review.json; nessun rollback o ripristino dati per ottenere uguaglianza artificiale.

## Ripasso stati/frontend dei29 widget — 2026-11-13

[REP002](reports/REP-20261113-002-audit-widget-stati-frontend.md): build locale .71,19 file circoscritti, letture/comandi/messaggi compatti corretti senza mutare modelli, permessi o dati. Ultimi esiti strutturati881PASS+19FAIL/900casi unici/37file;407iniziali riportati separatamente senza doppio conteggio. I19FAIL di OperationalWidgets/WidgetCatalogPreview/WidgetCommands sono riprodotti per nome/prima riga sulla .70 esatta(2003file); nessuna CI completa verde dichiarata. Strict frontend/UI, build, UI3/asset6 PASS; lint7/0warning e tipografia1 preesistenti, colori0. Impeccable detector widget0; warning della referenceHTML e scansione tema parziale distinti.

Prove simulate:224 aperture e4viewport sulla candidate2;70 minime/restore e29tipi normal/unreachable sulla3; HomeNotice corretto con retest finale5 a320/390,4minime/4restore/4dettagli,0 messaggi fuori frame.12fixture pixel CardMessage e matrici prodotto/legacy sono isolate e attribuite separatamente. Fonte2→5 soltanto2CSS,56chunkJS identici dopo normalizzazione dei nomi asset; questo confronto non sostituisce il paint dei CSS. Tutti i run finali validi senza comandi/richieste esterne/JS/WS, browser/server privati chiusi. Primo helper con1 comando solo mock, buildCSS RED e negativi intermedi conservati e mai contati come pass.

Fonte finale2003/SHA dc1db4e8,19modificati/0aggiunti/rimossi/EOL, ZIP web e689d079 da110file e HTTP byte-esatti; ZIP sorgenti bf18ae2b. Artefatti e inventari in backup/rep084; [preview simulata](http://127.0.0.1:4201/?screen=app#/mockup). Banco .70, account/profili, HA e pubblicazione invariati. Hardware/Safari/provider e prove autenticate non eseguiti; densità Car, semantica webOS e bersagli condivisi documentati senza claim universali.

## Banco PC con tutti i widget — 2026-11-13

[REP001](reports/REP-20261113-001-aggiornamento-banco-widget.md): .70/r99 installata sul solo ACA, immagine ba95dc53. Prova immagine senza rete/volumi reali PASS;228file runtime/contratti/frontend verificati e110file web/10contratti ricontrollati indipendentemente nel container live. Copia fredda219244byte, integrity ok e27tabelle identiche fra originale/copia/live; fingerprint account/identità tecnica, volumi e HA/D1 invariati. Audit operativo6/6 PASS.

HTTP PC/LAN health .70/casa ready e index/entry identici alla .70 testata; API protetta401 senza login. Browser privati1366/390: accesso visibile senza timeout/overflow/errori JS, nessun login o comando e browser chiusi. Screenshot finali dopo la conclusione delle animazioni, visionati dal root. Il banco prima era healthy internamente ma Docker non aveva ripubblicato le porte dopo l'avvio; la ricreazione del solo ACA ha ristabilito i due binding già configurati. Nessuna nuova regola firewall.

Fonti/prova .70 preesistenti non ripetute senza motivo:286dedicati e QA20/12/20 nel REP082;4FAIL storici e lint7/tipografia1 rimangono distinti. Nessuna modifica ai sorgenti app o nuova dipendenza; prove autentiche/dispositivi fisici non eseguite. Evidenze backup/rep083, nessuna pubblicazione.


## Calendario/Attività, Stanze e Gateway Zigbee — 2026-11-12

[REP002](reports/REP-20261112-002-widget-rimanenti.md): .70 locale,286/286 nuovi test dedicati PASS; ultimi esiti completi per34file662PASS+4aspettative preesistenti su666. Le4FAIL sono riprodotte sul checkpoint .69 esatto; non si dichiara CI generale verde. Backend28, strict frontend/backend/UI, build e UI3/asset6 PASS; lint7/tipografia1 invariati, colori0.

QA pacchetto50f9a648 / entry BSAaFA0x:20/20flussi,12/12cold,20/20viste e4compatti122×48 con ripristino PASS a320/390/1916. Testi lunghi, giornate intere, indisponibilità, tastiera/movimento ridotto, disclosure, dimensioni effettive e 1433 campioni RAF di stili/geometry; nessuna prova FPS/GPU o pixel equality. Verificati separatamente gli overscan dichiarati delle ombre e le hitarea44px dei Toggle, solo se figli visivi e bersagli nativi sono contenuti. Room desktop centrato768px con due colonne; nessuna maschera per nascondere il taglio dei contenuti.

Stage1–3 hanno rilevato tagli reali Todo/Stanze corretti; Stage4tuttoverde, Stage5ripete il pacchetto dopo la centratura Room. Negativi e diagnostici conservati in backup/rep082. Zero comandi HA/richieste extra/WS/errori JS nella QA, browser/server privati chiusi, preview4200 distinta dal banco. Fonte2003/SHA e6bbfae7,47modificati/27nuovi/0rimossi/EOL, sourceZIP fba23fce e web/HTTP esatti. Provider, radio, sessioni reali, Safari/iPhone, Lenovo/GPU e sincronizzazione autenticata non collaudati; dati del banco non modificati.


## Meteo e Meteo di casa — 2026-11-12

[REP001](reports/REP-20261112-001-area-meteo.md): build locale .69, 126/126 test Meteo PASS. Ultimi risultati completi per 24 file: 572 PASS e 2 aspettative DEMO preesistenti su 574; entrambe riprodotte sulla .68 esatta. Una suite ha ripetuto 13/13 PASS dopo un errore filesystem UNKNOWN su un import originale integro. Non è un PASS generale CI. Backend28, strict/build e UI3/asset6 PASS; lint7 e tipografia1 invariati, colori0.

QA ZIP ee3948bc / entry BaKzgVIP: 6/6 flussi, 6/6 cold, 5/5 viste PASS, due cambi fonte attraverso l’editor della DEMO con ritorno alla politica iniziale. Tessere122×122 e48×48 senza tagli, dati/unità reali, quantità/probabilità separate, previsioni precedenti e legacy identificati. 608 campioni RAF con stili osservati stabili e backdrop del foglio none; zero comandi mutativi/richieste extra/WS/errori. Le viste Gate2 sono riutilizzate nel Gate2b sullo stesso ZIP verificato, non sommate due volte. Browser/server privati chiusi; preview4199 distinta dal banco.

Fonte1976/SHA c97d9e72,18modificati/9nuovi/0rimossi o EOL; source ZIP6b427829 e web/HTTP verificati. Evidenze backup/rep081, limiti nel report: solo dati sintetici, nessuna verifica su provider/centrale/telefono/tablet reali o GPU, cold del seed non prova persistenza autenticata. Account/profili/HA/banco/pubblicazione invariati.


## Auto — 2026-11-11

[REP006](reports/REP-20261111-006-area-auto.md):196/196 Auto PASS, modello76/associazione31/raccordi34/scheda13/UI33/compatibilità9. Ultimo risultato completo per17file:633PASS+4aspettative Energia preesistenti su637, riprodotte sul checkpoint .67 esatto; non è un PASS generale CI.28backend, strict frontend/backend/UI, build .68 e3UI/6asset PASS; lint7fingerprint e tipografia1 invariati, colori0. Fonte1967/SHA2c46f767,15modificati/11nuovi/0rimossi/EOL.

GATE4 ZIPe3953d55/entryap3qHrDs verificato con HTTP:6flussi/6cold/5visuali PASS,12 scelte effettive+10fonti già adottate rilette,8 comandi solo mock e0reali/reti extra/WS/errori. Compatta122×48 senza crop, valore/unità a99.999km leggibili, titolo Auto coerente; HA clima standard usa config senza unità fittizia. Negativi dei gate precedenti e controlli ABA/duplica/temperatura conservati, non coperti da dichiarazioni hardware. Scenari prima del bootstrap, nessuna forzatura DOM/auth; cold del seed non prova persistenza nuovo widget o sincronizzazione reale. Server/browser privati chiusi, preview4198 attiva; banco/account/profili/HA/pubblicazione invariati. Evidenze in backup/rep080 e qa-functional-summary.json, limiti e proposte ISSUE-134/158/159/160 nel report.


## Energia e consumi — 2026-11-11

[REP005](reports/REP-20261111-005-energia-consumi.md):150/150 casi dedicati, ultimi esiti pertinenti781/781 in28file e28backend PASS.85modello/integrazione confermati dopo estrazione pura dei metadati,94Sensor e18Controls sul default condiviso PASS. DueRED semantici classe/valuta storica riprodotti e corretti. Primo gruppo578:576PASS/2aspettative obsolete, retest2file60/60PASS; negativi dei nuovi harness preservati e qualificati. Strict frontend/backend/UI, build .67,3UI/6asset ecolori PASS. ESLint7fingerprint identici alla .66, ottavo rilievo di gerarchia risolto; tipografia1connect.css byte invariato. ISSUE-134 non chiusa e suitecompleta/CI non dichiarate verdi.

QA ZIP1063c867/entryBUqdyUfz:6flussi/6cold/10visuali uniche PASSqualificate, fonte1956/SHA62a7da39 eHTTP esatti. Originali e replayvisuali distinti: tentativoPOSTOAuth bloccato durante loading in candidato2/GATE3;13moduliauth/demo identici alcheckpoint, nessuninvio/body/tokenraccolto, diagnosinonconclusivasullacausa. Scenari finali inizializzati prima delbootstrap nelcontesto sintetico, stessebarriere e0richiesteextra/WS/comandi. Proposta auditDEMO ISSUE-159, nessuna modificaauth. Immaginivisionate a320/390/1916, valoriestremi e indisponibili; nessuncollaudofisico/FPS/GPU/Safari. Browser e serverprivati chiusi, anteprima4197 attiva.

Checkpoint1946 efontefinale1956 con21modificati/10nuovi/0rimossi/EOL; contratti d’identità/prodotto,14resolver/classificatore/backend/gesti invariati. SharedSensor esteso con callbackfacoltativa e valutaown, defaultregressoverificato; hook/APIlegacy invariati. FonteZIP ebuildconhashcompleti nelreport eartifact-manifest.json. Banco/account/profili/HA/pubblicazione invariati.

## Area Sensori — 2026-11-11

[REP004](reports/REP-20261111-004-area-sensori.md): 237/237 casi dedicati, ultimi esiti pertinenti 1056/1056 in32file e28backend PASS; strict frontend/backend/UI, build .66,3UI/6asset ecolori PASS. Iniziali negativi e retest qualificati conservati inbackup/rep078/tests-summary.json. Due regressioni sul grafico della batteria fuori intervallo riprodotte e corrette. ESLint7fingerprint identici alla .65, tipografia1connect.css byte invariato; ISSUE-134 aperta, suite completa/CI non dichiarate verdi.

QA ZIPccee2c4f/entryCqkl-EA8:6flussi/6cold/5visuali uniche PASS, solo simulati. Un selettore del nuovo harness includeva timestamp tecnici nel caso unavailable: negativo conservato, solo caso specifico riprovato con selezione della sezione Letture. Dettagli centrati, contenimento a320/390/1916, tastiera/movimento ridotto/testi lunghi e stati indisponibili. Zero comandi fisici/reti inattese/WS; browser e server privati chiusi, anteprima4196 attiva. Nessun collaudo hardware, Safari reale o misura FPS/GPU.

Fonte1946/SHA84dca01c verificata dal checkpoint1935:24modificati/11nuovi/0rimossi/EOL,13resolver eidentità invariati,2corpi legacy conservati. ZIPsorgente/web eHTTP esatti, nessuna modifica dopoGATE2. Report eartifact-manifest.json contengono hash completi. Account/profili/banco/HA/pubblicazione invariati. Nuovo percorso cronologia senza dati sintetici; revisione dell’hook condiviso storico solo proposta ISSUE-158.

## Area Multimedia — 2026-11-11

[REP003](reports/REP-20261111-003-area-multimedia.md):211/211 casi dedicati PASS. Ultimi esiti pertinenti per file1912/1918,108 file;6 RED storici riprodotti sul checkpoint originale .64 (TvOnNetwork5/TvRemote1),19 esiti identici. Il gruppo ampio iniziale1875/1895 conserva20 RED, correttivi/retest qualificati in tests-summary.json. Discovery13/13 in due run dopo attesa del layout e del nodo dialog realmente smontato, senza aumentare timeout o indebolire assert; Catalogo18/18 PASS.28 backend, strict frontend/backend/UI, build .65,3 UI/6 asset e colori PASS. ESLint7 fingerprint invariati, tipografia1connect.css:103 preesistente; ISSUE-134 aperta e nessuna suite completa/CI verde dichiarata.

QA finale ZIP974c4fb1/entryMmNpbrUb: TV6flussi/6cold/5visuali, Apple4/4/5, Media6/6/5, Sonos6/6/5, tutti PASS;22/22/20 totali simulati. Home40px contenuti a320, dettagli280/350/640 centrati, etichette TV intere e Apple senza Canali impropri; long text, unavailable e movimento ridotto. Frame CSS/viewport stabili, nessun blur fullscreen nuovo; nessuna misura FPS/GPU/pixel invariance o collaudo fisico. Zero errori/reti inattese/WS, browser/server privati chiusi; anteprima4195 attiva.

Consegna1935file/SHA37714bfa,28mod/17nuovi/0rimossi/estranei/EOL. Browser sul sorgente runtime4f545d65; unico cambiamento successivo DiscoveryLauncher.test.tsx, produzione e ZIP byte-identici dimostrati in delivery-source-lineage.json. ZIP110file/2746960byte uguali a dist/HTTP, sorgente completo e checkpoint verificati. Sei corpi legacy/dieci risolutori e confini API/backend/auth/trasporti/gesti preservati. Candidate e negativi conservati; banco/account/profili/HA/pubblicazione invariati.

## Area Robot — 2026-11-11

[REP002](reports/REP-20261111-002-area-robot-aspirapolvere-tagliaerba.md): ultime verifiche perfile1427/1427casi in78file PASS; il primo gruppo ampio conserva1426PASS/1RED sul gate Mower in-flight. Correzione locale e retest Mower59+MockupHa61=120/120PASS, senza riscrivere il negativo; tests-summary.json esplicita la qualificazione. Vacuum57UI, Mower59UI,44binding e gruppi comuni sovrapposti non si sommano.28backend, strict frontend/backend/UI, build .64,3UI/6asset e colori PASS; lint7fingerprint identici alla.63, tipografia1connect.css:103 byte-identico. ISSUE-134 distinto.

QA finale sul ZIPe0aeecdd/fonte1918SHA7318cd94: per ciascuna famiglia6/6flussi+6/6cold+5/5visuali PASS, quindi12/12/10complessivi, con associazione/manuale/ghost/Conferma/Annulla/no-space/lookup e comandi fake. Mappe Vacuum proprie decodificate, stanze HA esatte, targetHome40×40 contenuti anche nella card138×138 a320px, dettagli centrati e nessun overflow orizzontale; nomi lunghi, indisponibilità e movimento ridotto. Otto tabelle di transizione con sfondo CSS/viewport stabili e nessun blurfullscreen; nessuna prova pixel invariance/GPU/FPS. Zero JS/errori di rete inattesi/WS,0comandi nei10visuali. Review indipendente e PNG visionati; server/browser privati chiusi, anteprima4194 attiva.

Source-audit e sigillo finale in backup/rep076:25modificati/19nuovi/0rimossi/estranei/EOL, tutti1918hash confermati; ZIP110file/2738428byte uguali a dist e HTTP. Backend/dipendenze/API/trasporti e4corpi legacy conservati. Negativi dei candidati7dd0e67/2debf26d e fix320/unavailable separati dal nuovo pacchetto. Account/profili/banco/HA/pubblica invariati; hardware, mappe/stanze su integrazioni reali e prestazioni tablet da collaudare separatamente. Nessuna suite intera del repository o CI dichiarata.

## Serrature, Allarme e Videocamere — 2026-11-11

[REP001](reports/REP-20261111-001-serrature-allarme-videocamere.md):1213/1213casi frontend in68file,28/28backend pertinenti e90/90rettifica effetti PASS; i contatori sovrapposti non si sommano. Strict frontend/backend/UI, build.63,3UI/6asset e colori PASS. Lint7fingerprint identico alla.62, tipografia1connect.css:103 byte-immutato; ISSUE-134 distinto. Regresso fixtureCamera169/170 prima della correzione Giardino e negativo Disinserisci pendente conservati, insieme ai primi harness e ZIP candidato.

QA finale sul ZIP0cb3daaa/fonte1899SHA57b09d7b: ciascuna famiglia6/6flussi+6/6cold+5/5visuali320/390/1916 PASS;18+18+15complessivi. Ghost/Conferma, Annulla, no-space, lookup esistente, manuale e multicanale, no scritture anticipate e nessun duplicato nei casi provati. Camera un solo feed,0media Home sotto Console e118campioni RAF senza variazioni dello sfondo CSS. Nomi lunghi, indisponibilità e movimento ridotto verificati; non è benchmark GPU/FPS. Codici soltanto fake/in memoria ed evidenze mascherate, review degli intenti HMAC/metadata e allowlist Tavano; nessun audit di logger esterni dichiarato. Browser/contesti/server effimeri chiusi e sonde finali; preview4193 disponibile.

Manifest e sigilli in backup/rep075:27modificati/28nuovi/0rimossi/estranei/EOL, tutti1899hash correnti confermati; ZIP110file/2730858byte uguali a dist e HTTP. Nessun package/backend/trasporto/dipendenza modificato. Account/profili/widget reali, banco/HA e pubblica conservati; hardware e streaming reale da verificare separatamente. Proposte ISSUE-155/156 e limiti comuni restano fuori incarico.

## Ventilatori — 2026-11-10

[REP004](reports/REP-20261110-004-ventilatori-per-dispositivo.md):935scenari frontend unici con ultimi esiti PASS e17backend; gruppo finale52file/899casi tutto verde. Binding/classificazione105, manuale9, FanProduct40 e raccordi nei gruppi sovrapposti. Riprodotto e corretto debounce50→75→50 prima dell'invio:0comandi; richieste già inviate ed errore conservati. Strict frontend/backend/UI, build.62,3UI/6asset e colori PASS. Lint finale7fingerprint identici alla.61, tipografia1connect.css:103 byte-identico; ISSUE-134 aperta.

QA sigillo:6/6flussi,6/6cold,5/5visuali1916/390/320 e2/2smoke;0JS/richieste bloccate, browser chiusi. On/off semplice, multicanale esatto, primi incrementi50→75 e30→31, preset/oscillazione/direzione/OFF ordinario, pagina piena, Annulla/lookup senza scritture. Target40px contenuti, dettagli centrati, testi lunghi a capo e movimento ridotto; screenshot e campioni CSS letti, nessun benchmark GPU/FPS. Cold e320 usano il prebound; il passo mancante non genera uno slider, nessuna persistenza dichiarata per i widget DEMO aggiunti. OFF pendente/unknown/errore hanno prove di componente distinte; gateway ISSUE-154 e hardware non qualificati.

Fonte1871/SHA317bebd1,22modificati/9nuovi/0rimossi o estranei. ZIP2722788byte/SHAf2cbf4e5,110file e HTTP esatti. Review indipendenti di contratti, adattatori e controlli, negativo debounce prima del fix e primi harness rossi conservati in backup/rep074; riepiloghi in tests-summary.json e qa-final/qa-final-summary.json. Legacy, API/backend, dipendenze, tema e gesti invariati; banco/account/profili/HA e pubblica.34 non modificati. Nessuna suite generale completa o conferma fisica dichiarata.

## Tapparelle, tende e veneziane — 2026-11-10

[REP003](reports/REP-20261110-003-tapparelle-tende-per-dispositivo.md):864scenari frontend unici con ultimi esiti PASS e17backend; non suite generale completa. Gruppo intermedio824/828 prima delle correzioni UI: i quattro negativi del lotto sono risolti, Cover36/36 e raccordi120/120 finali PASS. Binding/classificazione91/91, manuale27/27 sovrapposti. Strict frontend/backend/UI, build.61,3contrattiUI/6asset e colori PASS. ESLint7fingerprint identici alla.60, tipografia1connect.css:103 byte-identico; ISSUE-134 aperta.

QA sul pacchetto esatto:6/6flussi,6/6cold e5/5visuali a1916×882,390×844 e320×760. Target40px contenuti a320, dettagli640px centrati, passo1 richiesto distinto dall'osservato, multicanale/capacità, indisponibilità, nomi lunghi, tastiera e movimento ridotto. Sfondo/filtri invariati nei campioni RAF; nessun dato FPS/GPU fisica. Sei comandi solo DEMO con canale/payload esatti, nessuno automatico, JS/rete esterna0; negativo pagina piena, Annulla e lookup senza nuove scritture. Browser chiusi. Evidenze verdi solo `qa-final/qa-cover.json` e `qa-final/visual-reviewed/qa-visual.json`, con indice `qa-final-summary.json`.

Fonte1862file/SHA6f0ac7f6,22modificati/9nuovi/0rimossi o estranei; ZIP2719700byte/SHA66ec520b,110file e HTTP esatti. Legacy, gateway e relative limitazioni non modificati (ISSUE-153/154); Stop durante promessa pendente provato nei componenti, non come priorità end-to-end o conferma fisica. Cold sul seed preassociato fuori dalla prima pagina; nessuna persistenza DEMO dichiarata. Banco/account/profili/HA e pubblica.34 invariati; hardware e login reali non eseguiti. GestoISSUE-152 distinto.

## Clima per dispositivo — 2026-11-10

[REP002](reports/REP-20261110-002-clima-per-dispositivo.md): 754 scenari frontend unici e 17 backend PASS nei gruppi pertinenti; non suite generale completa. Gruppo ampio 711/714, tre attese Conferma non concluse entro timeout conservate; gruppo mirato finale 126/126 e Clima dopo gli ultimi fix 44/44, senza rimozione di assert o aumento delle attese. Strict frontend/backend/UI, build .60, 3 contratti UI/6 asset e colori PASS. Lint finale 7 fingerprint identici alla .59 e 1 tipografia connect.css:103 byte-identico: ISSUE-134 rimane aperta.

QA del pacchetto esatto a 1916×882/390×844: 6/6 percorsi prodotto/manuale, 6/6 cold reload, 4/4 visuali e negativo pagina piena PASS. Sei comandi solo DEMO con target/payload esatti, nessun comando all'apertura/anteprima; JS/rete esterna 0. Controlli Home contenuti, dettagli centrati, testi lunghi/indisponibili a capo nella propria cella, tastiera/movimento ridotto e campioni RAF senza cambio dello sfondo o blur della Console. Il primo cold misura renderer preassociati fuori dalla prima pagina visibile; nessuna dichiarazione di primo frame Clima visibile o persistenza della DEMO.

Fonte 1853 file/SHA dc64842e, 23 modificati/10 nuovi/0 rimossi o estranei; ZIP 2716358 byte/SHA627358fd, 110 file confrontati e HTTP esatto. Negativi intermedi e falso verde degli assert generali conservati in rep072; evidenze definitive solo `qa-final-wrap`. Banco, account, profili e HA non modificati. Hardware/login reale/FPS GPU non eseguiti; ISSUE-152 distinto.

## Prese e interruttori — 2026-11-10

[REP001](reports/REP-20261110-001-prese-interruttori-per-dispositivo.md):685scenari frontend unici/17backend PASS, strict frontend/backend/UI e build0.9.59 PASS;3UI/6asset e colori senza violazioni. Lint7fingerprint identici al checkpoint, tipografia1segnalazione connect.css:103 invariata: ISSUE-134 resta aperta. Inventario29 e placeholder aggiornati senza indebolire le verifiche; corretti LED tecnico scambiato per prodotto principale e descrizione accessibile unknown.

QA del pacchetto finale:6/6percorsi prodotto,6/6cold Home pronta,3/3visuale (normale1916/390 e nomi lunghi/movimento ridotto390), negativo pagina piena senza nuove pagine o salvataggi. Quattro comandi esclusivamente DEMO espliciti verso il solo canale selezionato; nessun comando reale. Fotogrammi e RAF: sfondo/viewport invariati, nessun filter/backdrop sul fullscreen. Index/entry HTTP=dist=ZIP; browser chiusi. Il fallback+ è usato dopo la preparazione di una pagina vuota: il gesto sulle celle non apre anche nel confronto con .58, ISSUE-152 separata e non introdotta dal lotto.

Fonte1843/SHA7d7ea542,27modificati/9nuovi e0rimossi/estranei; ZIP2713937byte/SHA350b704b, entry index-Dru7KNuV.js. Evidenze in `backup/rep071/`, soprattutto tests-summary.json, lint-comparison.json, source-audit-final.json, build-local-manifest.json e qa-final-after-led/qa-final-summary.json. Banco/pubblica non aggiornati; Docker non disponibile al controllo in lettura. Hardware fisico e autenticazione reale non eseguiti.

## 2026-11-09 — utilità dirette e Luci per dispositivo, build locale .58

[REP013](reports/REP-20261109-013-utilita-e-luci-per-dispositivo.md): gruppo404/404in23file e lookup finale6/6 dopo la rifinitura delle pile,405scenari unici;3UI+6design, strict frontend/UI e build .58 PASS. Consultazione senza scritture, binding limitati al device, canali distinti, controllo403, rebind conservativo, lookup nascosti/pile/duplicati, risposta registry tardiva dopo chiusura, PIN/consenso, polling e hub coperti nei test selezionati. Lint generale7diagnosi identiche al checkpoint verificato conESLint,0nuove; ISSUE-134 aperta e suite generale completa non dichiarata verde.

QA privata del ZIP esatto su4187:1916/390, entry/index/13CSS HTTP=dist=ZIP; Trova/Tavano primi2 e diretti, Tavano30righe/filtri/copia depurata, Luce con ghost0scritture profilo e1nuovo widget alla Conferma,0comandi automatici, griglia4/2colonne senza overflow. Tre builtinCover già visibili sono qualificati separatamente secondo la semantica .57. Dati estremi e prima QA su4186 separati dalla prova finale; negativi dei harness conservati. Nessun collaudo hardware o autenticazione personale reale.

Fonte1834/SHA cad07996e1b783c7383f5cd330e8da0cdb7498f3039e23d8d921907a71a14501:34modificati/15nuovi,0rimossi/estranei. Backend, dipendenze, gestiY,tema e Cover byte-identici; ZIP2710049/SHA42f38ca9a5785ef3d3203d0bd220512fd5e5c4891088c8ec532a1479f9049e35. Banco .57 stessa immagine, HA/D1 invariati e nessun deploy. Evidenze in backup/rep070/, in particolare source-delta.json, tests-final-summary.json, lint-comparison-final.json, build-local-manifest.json e production-qa/qa-package-summary.json.

## 2026-11-09 — catalogo, bozza e conferma sul banco .57

[REP012](reports/REP-20261109-012-widget-da-catalogo-a-posizionamento.md):161/161test in11file, più9/9Cover in2file distinti,3UI, strict frontend/UI e build PASS. Fonte1819/SHAdfa61594, 15delta (12modificati/3nuovi), nessun rimosso/estraneo. Factory28tipi, nessuna associazione dimostrativa persistita; planner puro, capacità, pagine nascoste/speciali, segmenti logici, doppio invio, retry con ID stabile e ACK autorevole verificati nei casi registrati. Ghost isolato e Conferma/Annulla testati nel browser e sul pacchetto esatto; demo sintetica e vista banco anonima non certificano un nuovo login o l’hardware umano.

Gesti Y/X, scena e tema byte-identici alla .56. Nessuna misura prestazionale o nuovo comportamento HA da questa verifica. Audit provenienza/checksum/runtime congelato e Compose21file PASS. Backup206308byte integro; audit operativo 6/6, confronto cold→live con 27 tabelle esatte e 0 seen_at monotoni, nessuna differenza imprevista. Account/profili/identità/mount e HA/D1 conservati, solo ACA .57 ricreato. Browser/server QA privati chiusi,4185 conservata; nessuna pubblicazione o soluzione generale del debito dichiarata. Evidenze backup/rep069/.


## 2026-11-09 — richiamo verticale, costi osservati e banco .56

[REP011](reports/REP-20261109-011-fluidita-catalogo.md):87/87test in6file,3UI, strict frontend/UI e build PASS. Fonte1816/SHAcfb5422d,8delta attesi, nessun file aggiunto/rimosso/estraneo; X e scena condivisa byte-identici. Preview pronta, richiamo unico prima del rilascio, long press, controlli/scroll, cancel/multipointer, moduli, focus/history e ritorno verificati nei casi registrati. Pacchetto finale esatto e banco anonimo PASS; hardware e nuova autenticazione umana separati.

Trace controllate con SwiftShader: EventDispatch→prima transitionrun del gruppo CSS 268/283ms prima e 64/54ms nel candidato intermedio, singolo run per input/versione. Nessun miglioramento generale raster o frame rate dimostrato; valori di paint/raster e scheduling variabili, nessuna misura della RTX/driver dell’utente. Il criterio funzionale corretto è l’assenza di progresso parziale e di attesa idle per avviare l’animazione Y, non un FPS promesso.

Audit artefatti/checksum/runtime congelato e Compose20file PASS. Backup206196byte integro; audit operativo 6/6, confronto cold→live con 27 tabelle esatte e 0 seen_at monotoni, nessuna differenza imprevista. Account/profili/identità/mount e HA/D1 conservati, solo ACA .56 ricreato. Browser/server QA privati chiusi,4185 conservata; nessuna pubblicazione, CI o soluzione del debito generale dichiarata. Evidenze `backup/rep068/`.


## 2026-11-09 — gesto diretto, fotografia e banco .55

[REP010](reports/REP-20261109-010-trascinamento-verticale-catalogo.md):81/81test mirati in6suite,3UI, strict frontend/UI e build PASS. Fonte1816/SHA18a2ffb1,17delta attesi, nessun file aggiunto/rimosso/estraneo; EOL e diff verificati. La baseline mouse non apriva, il touch avviava un ingresso autonomo: il candidato segue20/60/150px nativi e mantiene60px nel hold600ms su1916/390. Rilascio/cancel, wheel progressivo/inverso, focus/tastiera, controllo dei permessi durante hold, moduli e X con schede intere verificati nei casi registrati.

Il confronto della fotografia riproduce maxRGB49desktop/34telefono prima della correzione. Pseudo-piano viewport finale: MAE0/max0 nelle ROI vuote1916/390, con campioni RAF e compositor registrati per ritorno e hold; nessuna certificazione di ogni GPU. La QA del candidato e il pacchetto finale esatto hanno provenienze distinte. WheelEvent non espone finger-up: pausa240ms come termine del flusso; prove hardware restano separate.

Audit artefatti/runtime congelato e checksum PASS, nessuna installazione runtime. Compose19file config --quiet PASS senza segreti stampati; vista anonima banco .55 e asset esatti PASS. Backup204910byte integro; audit operativo 6/6; confronto cold→live: 27 tabelle esatte, 0 aggiornamenti seen_at monotoni e nessuna differenza imprevista. Identità/account/profili/mount e HA/D1 conservati, solo ACA ricreato. Evidenze `backup/rep067/`; nessuna dichiarazione di suite generale, CI, nuova autenticazione umana o soluzione del debito ISSUE-134.


## 2026-11-09 — spazio, card intere e banco .54

[REP009](reports/REP-20261109-009-catalogo-piu-spazio.md):62/62test mirati in6suite,3UI, strict frontend/UI e build PASS. Fonte1816/SHAdad2ffde,10delta esatti, EOL e diff verificati. Header/gruppi/contatore accessibili senza spazio riservato; Home sana recupera46,66px e preview circa70px per card. Avvisi importanti rimangono nel flusso.

Il chiarimento umano richiede card intere anche durante il gesto. Baseline continua con8RAF tagliati; finale261RAF/97JPEG X senza tagli1916/390. La prima copia fotografica segue Y nel hold150px: negativo conservato, corretto prima del rollout con fase visiva distinta. Nuovi hold/cancel/entry/close normali e ridotti PASS; statico .999/1 maxRGB1, fallback opaco/forced-colors, tastiera/form/focus e lost-release verificati. Pacchetto esatto e vista anonima banco PASS; prove dei soli harness distinte dai risultati del prodotto.

Audit indipendente9marker/4hash gesti/6presentazione, checksum immagine/ZIP e runtime/APK conservati PASS. Ricetta derivata congelata,180fonti backend/contratti/manifeste invariati. Compose18file `config --quiet` PASS. Backup202041byte integro; audit operativo 6/6, verifica cold→live: 27 tabelle esatte e 0 aggiornamenti seen_at monotoni. Identità/account/profili/mount e HA/D1 conservati; solo ACA .54 ricreato. Evidenze `backup/rep066/`; nessuna nuova regressione nei controlli pertinenti, nessuna dichiarazione di intera suite/CI o risoluzione del debito ISSUE-134. Hardware e nuova autenticazione umana distinti.


## 2026-11-09 — cicli catalogo e banco .53

[REP008](reports/REP-20261109-008-cicli-ripetuti-catalogo.md): baseline .52 con60cicli wheel senza arresto, ma rilascio mouse su altro target lascia candidato pendente e blocca wheel; clic titolo recupera. Stessi eventi nativi dopo fix chiudono al primo wheel, senza blur sintetico o clic;60cicli candidato e held/moved/touch PASS. I close a160ms attendono poi l'uscita, non sono una prova continua sub240ms. Nessuna causa certa della sequenza umana o della sola velocità dichiarata.

42/42test mirati (quattro regressioni nuove RED prima fix),3UI e strict frontend/UI PASS; fonte1816/SHA0f7a0c0b,2delta primitivatest,0estranei. Review indipendente, EOL preservati. Build frontend/Casa3D e audit7checksum/127web/117runtime/5marker/4hash PASS;7versioni e19APK identici alla .52. Ricetta derivata congelata e180fonti backend/contratti/manifeste uguali, nessuna installazione runtime. Compose `config --quiet`17file PASS, nessun segreto stampato.

Pacchetto3372697byte/SHA33b6f6ac…945d38: replay nativa lost-release e normale secondo ciclo PASS,0comandi. Banco anonimo390 .53/ready, entryBM9YREBH/hash esatto,0login/credenziali/mutazioni/WS/errori; screenshot visionato. Backup204098byte integro,27tabelle immediate e successive identiche e audit6/6; identità/account/profili/mount conservati, HA/D1 stessi container/avvii, solo ACA ricreato. Browser e helper privati chiusi,4185 intatta. Evidenze `backup/rep065/`; hardware e ISSUE-150/151 distinti.


## 2026-11-09 — ritorno trackpad e banco .52

[REP007](reports/REP-20261109-007-ritorno-catalogo-trackpad.md): baseline .51 wheel inverso non chiude, touch diretto sì. Corretto il solo input wheel;36/36test mirati,3UI e strict frontend/UI PASS. RED0/1 e intermedio35/36 da mock matchMedia assente preservati; corretto soltanto il fixture. Fonte1816/SHA5259d73c,2delta (primitiva/test),0estranei/aggiunti/rimossi; CSS, motore, durate e Pointer immutati. Review senza blocker.7/7prove candidate e1/1pacchetto: chiusura wheel da scheda/header/padding, touch conservato, X/ctrl/moduli verticali non intercettati. Pacchetto RAF34campioni,5Yintermedi e5opacità Home intermedie, finale1/stessa pagina/layout/0comandi. Negativo del selettore harness conservato.

Build derivata frontend/Casa3D e audit PASS:7checksum,127web byte-identici immagine/ZIP,117runtime,4marker/hash sorgente,7versioni e19APK identici alla .51. Primo marker negativo per quoting del compilatore (backtick) preservato, corretto solo il verificatore. Container temporanei rimossi; `compose config --quiet`16file PASS senza stampare segreti. Nessuna nuova dipendenza o installazione pacchetti runtime.

Backup206911byte integro;27tabelle immediate uguali. Tardivo esatto5/6 distinto da audit ristretto PASS:26tabelle esatte+31righe token fisse, soltanto1seen_at monotono e0imprevisti. Identità e mount conservati, HA/D1 stessi container/immagini/avvii, solo ACA .52 ricreato. Vista anonima390 .52/ready, entry/manifest esatti,0login/mutazioni/WS/errori; browser/helper privati chiusi,4185 intatto. Evidenze `backup/rep064/`, hardware/trackpad fisico e ISSUE-150 distinti.


## 2026-11-09 — installazione banco .51, gesti da tutte le pagine

[REP006](reports/REP-20261109-006-banco-pc-gesti-tutte-pagine.md): fonte1816/SHA42e16a77 identica a REP005; i94test/9UI e13scenari precedenti sono conservati, non dichiarati rieseguiti. Nuovo build frontend/Casa3D con strict e ricetta congelata PASS;7checksum,127web byte-identici immagine↔ZIP,117runtime,3hash/marker gesti,7versioni e19APK senza differenze dalla .50.3container isolati rimossi; nessuna installazione pacchetti runtime o pubblicazione.

Backup209507byte estratto/integro e27tabelle immediate identiche. Audit operativo esatto5/6 preservato; cold→live separato PASS,26tabelle esatte+30righe token/campi fissi uguali, solo1seen_at avanzato monotonicamente e0imprevisti. Identità HA/provider/segreto tecnico e mount invariati; HA/D1 stessi container/immagini/avvii, solo ACA ricreato. Dimensioni fisiche rilevate separatamente: DB1597440B, WAL4120032B, SHM32768B; nessuna equivalenza automatica tra quota logica e spazio fisico.

Candidata estratta dal ZIP3372268byte/SHAba3312a8…982a9: touch UP/DOWN nativo su runtime sintetico, stessa pagina/layout e0comandi/API/WS/errori. Banco anonimo390: .51/ready, entry index-CMk9ozva/SHAfe34e3f7…29aa03 e manifest esatti, nessun login/invio/mutazione/WS/errore o overflow. PNG visionati; browser/context e helper privati chiusi, anteprima4185 lasciata attiva. [PC](http://127.0.0.1:3002/) e LAN192.168.1.37 rispondono. Evidenze `backup/rep063/`; hardware/login umano e debito ISSUE-134 distinti.


## 2026-11-09 — gesti catalogo da tutte le pagine Home

[REP005](reports/REP-20261109-005-gesti-catalogo-tutte-pagine.md):42test gesto/integrazione/misura/drawer/pager e52avvio/anteprime PASS;3UI+6asset, strict frontend e build PASS. Red PageShell prima del fix0/1 e intermedio41/42 conservati; l'unico test intermedio fallito richiedeva il coordinatore nel mock dell'aggiunta. Nessun bypass della misura o dei permessi. Fonte1816/SHA42e16a77,6delta attesi (3sorgenti/3test),0aggiunti/rimossi/estranei; manifesti, terminatori e review indipendente PASS.

Touch CDP su componenti reali con catena completa:5/5apertureUP/chiusureDOWN, anche griglia «+», Copertina e speciale, stessa pagina e nessuna scrittura/comando durante la consultazione.7/7regressioni coprono i due assi, comandi/tap, range, scroll e bordo, pinch e long press/drag/cancel.1/1smoke nell'anteprima ordinaria4185 con entry/hash esatto e0API/WS/scritture/comandi; PNG visionati. Campione RAF del ritorno e dati sintetici, non collaudo hardware Android/M11/Safari. PointerCancel dopo apertura distinto dal cancel che impediva il gesto prima della soglia; negativi dei soli selettori dei harness preservati. Browser/server privati chiusi; anteprima ordinaria disponibile.

`backup/rep062/` conserva evidenze e sigilli. ACA/HA/D1 hanno stessi container, immagini, avvii e mount; banco .50 e dati reali conservati, nessuna installazione/pubblicazione. ISSUE-149: misura corretta localmente per il passaggio alle speciali; profilo iniziale soltanto speciale non collaudato nel browser. ISSUE-134 e controlli generali non dichiarati risolti.

## 2026-11-09 — avvio autenticato corretto, banco .50

[REP004](reports/REP-20261109-004-diagnosi-avvio-edge.md): console utente e riproduzione browser con la catena autenticata coincidono su griglia30×50/non pronta. Prima3/3casi fullchain bloccati; dopo4/4ready, griglia438×867, cambio formato e avviso con spazio riservato verificati. Il distinto completamento tardivo ha un negativo prima del fix e3mirati PASS dopo;40startup/asset/gate separati e9UI PASS, strict/build/colori PASS. I209test filtrati del file LauncherScreen non sono dichiarati eseguiti. API/WS/comandi0 nei fixture,8sorgenti stabili e screenshot visionati; helper/browser chiusi.

Fonte1816/SHA9d6864d3 con3delta attesi,0estranei/rimossi; audit7checksum/117runtime/127web e3marker height PASS,7versioni/19APK identici alla .49. Backup212161byte verificato,27tabelle immediate uguali. Audit tardivo5/6 preservato, cold→live in transazione PASS: solo1seen_at avanzato,28righe/fissi stabili,26tabelle esatte e0imprevisti. Account/profili/identità/mount conservati, HA/D1 invariati; solo ACA .50 ricreato.

Banco anonimo390 e hash entry/startup/nuovo CSS PASS senza login o mutazioni; l'utente conferma riapertura in Edge dopoCtrl+F5. Non è un collaudo completo dei widget né hardware mobile. Evidenze distinte in `backup/rep061/`; falsa sonda iniziale e limiti delle prove senza LiveProfileChrome conservati. ISSUE-149 non corretto, debito generale ISSUE-134 e pubblica.34 invariati.

## 2026-11-09 — stati esclusivi e banco finale .49

[REP003](reports/REP-20261109-003-stati-vuoti-senza-sovrapposizioni.md):28startup/gate+24adiacenti e9UI/asset PASS, strict frontend/UI/build e colori PASS.5browser controllati con provider reali/coordinatore simulato,1366/390 e13s di attesa: un solo recupero,0campioni RAF concorrenti e successo rapido5ms senza spinner precedente. Screenshot visionati; nessuna API, credenziale, mutazione o WS. Caso negativo dello spinner residuo conservato prima del fix; rettifica del solo terminatore test distinta dalla provenienza dei7file produzione.

Fonte1816/SHAa41c99f2,8delta attesi e0estranei/rimossi; ricetta congelata,7checksum/117runtime/127web e7versioni/19APK identici alla .48 PASS. Backup218559byte verificato,27/27tabelle immediate e successive uguali, audit operativo6/6PASS. Account/profili/identità/mount conservati, HA/D1 invariati e solo ACA ricreato. Gate semantico seen_at predisposto ma non necessario, nessuna deroga usata.

Banco .49/ready e vista anonima390 con ZIP/entry/modulo esatti PASS;0overflow/errori/login/mutazioni/WS. Sigilli distinti in `backup/rep060/`; la vista anonima non è un collaudo autenticato e i5casi controllati non sono una prova hardware. ISSUE-134/suite generale non dichiarati risolti; pubblica.34 invariata.

## 2026-11-09 — avviso Home e banco finale .48

[REP002](reports/REP-20261109-002-preparazione-lenta-messaggio-centrato.md):13HomeStartup/9UI, strict frontend/UI/build e colori PASS;2QA controllate1366/390 con testo libero, centratura, ButtonACA e retry2cataloghi/1snapshot PASS.110file frontend della QA byte-identici al pacchetto. Errori specifici e tempi invariati; indagine in lettura non attribuisce il timeout a un guasto concreto.

Fonte1815/SHA6ecf4b75,3delta previsti; ricetta derivata/fonte/7checksum/117runtime/127web e7versioni/19APK identici alla .47 PASS. Backup freddo nuovo249975byte verificato,27tabelle immediate uguali; audit tardivo5/6 conservato. Successivo controllo cold→live in transazione PASS: soltanto seen_at avanza,24righe e campi token/utente/refresh stabili,26altre tabelle identiche e0regressioni. Identità HA/tecnica e mount conservati; HA/D1 stessi container/avvii, solo ACA aggiornato.

Banco .48/ready e singola vista anonima390 con hash entry/modulo/ZIP confermati, senza login o mutazioni; screenshot visionati e handoff/sigilli distinti in `backup/rep059/`. Nessuna prova fisica o autenticazione umana, nessun PASS globale della suite generale o pubblicazione. I due falsi negativi dei selettori QA e l'encoding del primo helper di audit restano tracciati, senza deroghe nel codice prodotto.

## 2026-11-09 — banco PC .47 con account e profili conservati

[REP001](reports/REP-20261109-001-banco-pc-gesti-catalogo.md): fonte1815/ca1e5d71 invariata. Primo candidato con deriva Alpine/APK respinto; ricetta derivata accettata con runtime .46 identico,7versioni/19APK e audit7checksum/117runtime/127web PASS. Gesti col bundle esatto in isolamento, due viste anonime reali1366/390, health .47/ready e assetSHA confermati;0login/mutazioni/WS. Non è un collaudo autenticato o fisico.

Backup freddo249316byte estratto/integritàok,27/27tabelle identiche prima/dopo; account/provider HA e identità tecnica uguali, mount conservati. HA/D1 stessi ID/avvii dopo la ripresa iniziale di Docker, solo ACA ricreato; sei audit operativi PASS e fonte ancora uguale. Nessuna modifica ai dati per il test, nessun reset o nuova pubblicazione. Evidenze in `backup/rep058/`, ricetta e rollback in infrastruttura; ritocco successivo dell'avviso Home assegnato in REP002.

## 2026-11-06 — catalogo senza pulsanti, REP007

[Report](reports/REP-20261106-007-catalogo-widget-solo-gesti.md):57test Drawer/Pager/Sistema/Scene e5integrazioni Screen PASS,9UI/asset e strict frontend/UI/build/colori PASS. Conclusi dopo le regressioni red→green di diagonale e trasferimento di cattura figlio→pannello; due fixture cold-lazy rese asincrone senza cambiare le asserzioni. Nessun nuovo PASS globale attribuito alla suite296 o al debito ISSUE-134.

Browser isolato touch: swipeX0→1→0, swipe giù140px e560px/hold950ms, movimenti brevi/diagonali/cancel, tap Luce, scroll modulo61px, Escape/Back e focus verificati. Pulsanti richiesti0; widget84→84,0HA/errori/richieste bloccate nel finale. Ultimo rebuild soltanto del focus del titolo verificato con una apertura/screenshot; i tre bundle e il primo negativo restano distinti nel handoff `backup/rep057/qa-final-handoff.md`. Root ha visionato lo screenshot finale. Non ripetuta la matrice delle28anteprime, hardware non provato.

Source1815/SHAca1e5d71,9delta attesi (4sorgenti/5test),0nuovi/rimossi/estranei; whitespace e terminatori9/9. [Anteprima4185](http://127.0.0.1:4185/?screen=app#/mockup) pronta, backend/anteprime/Home/account/profili/banco0.9.46 e pubblica0.9.34 conservati; nessun install o deploy.

## 2026-11-06 — catalogo widget da scroll della Home, REP006

[Report](reports/REP-20261106-006-catalogo-widget-tendina.md), [ADR-0048](decisions/ADR-0048-catalogo-widget-tendina.md): ultima indicazione umana attuata, senza pulsante Home; salita automatica e dissolvenza, pagine orizzontali intere.296casi unici coperti: giro294PASS/2helper errati e ricontrollo del blocco aggiunta3/3PASS, senza inventare un singolo run296verde. Contratti66inclusi, preview9/9con fonte invariata dalla fase2, UI/asset9/9, strict frontend/UI, build e colori0PASS. Typography conserva la sola violazione preesistente connect.css103, distinta da ISSUE-134; warning HLS preesistente. Negativi reali di longhold, busyRef e scrollend conservati prima dei fix; helper cold-lazy/inert corretti senza deroghe in produzione.

QA isolata: ingresso finale21JPEG/9campioni intermedi e fade concorrente,0gap; touch/hold950ms, swipeX, reduced, nav rapida, lock e doppia chiusura. Tutti28tipi×3formati e24pagine visitati prima degli ultimi fix, con provenienza distinta e geometria immutata; anteprime0API/WebSocket/scritture/HA. Writer Tavano+1/Luce+1 osservati prima di stop successivi dei harness: non PASS globali dei raw. Tre ROI PNG prima/ritorno e ultimi due paintJPEG0/0; non sono FPS o collaudo GPU. Root ha visionato le immagini. Handoff, sigillo, comandi e limiti in `backup/rep056/phase3/` e nel report.

Fonte1815/SHA d07a51f3,24delta attesi (11modificati/13nuovi),0estranei/0originali rimossi;20whitespace e11terminatori verificati. Anteprima4185 HTTP200/39JS-CSS200, bundleBZELyAGA. Backend, dipendenze, dati/account/profili e banco0.9.46 conservati. Hardware, sessioni autenticate reali e cella libera browser non ricollaudati in questa fase; test del launcher distinti. Nessun deploy, pubblicazione0.9.34 o nuova attività implicita.

## 2026-11-06 — bordi dei dettagli durante lo scorrimento, REP005

[Report](reports/REP-20261106-005-contenuti-console-senza-tagli.md): riprodotto il taglio a metà scorrimento, con dati già interamente raggiungibili agli estremi. L'utente conferma «Dopo aver fatto scorrere».35/35 mirati e9UI/asset PASS; strict/build e colori0PASS, detector layout `[]`. Source audit1802file/SHA4dc66c74, solo2sorgenti e1test nel delta, nessun backend/dato/tema cambiato.

QA finale1900/390, resize1366↔390, Tab, forced-colors e chiusura/riapertura PASS. Geometria identica, tre ROI PNG centrali0/0; menu Periodo dialog nativo ed Escape/focus/scroll conservati. Pannello Media con vero blur16px protetto dalla guardia, due ROI0/0. Sfumatura condizionale, nessuna fascia scura o foto interna duplicata; candidati respinti e falso predicato dei popup chiusi conservati come controevidenze. Root ha visionato i PNG finali. Chromium isolato, nessuna mutazione reale; hardware, suite generale e banco0.9.46 non ricollaudati/aggiornati. Evidenze `backup/rep055/`, [anteprima4185](http://127.0.0.1:4185/?screen=app#/mockup).

## 2026-11-06 — caricamento e ingresso unitari della Home, REP004

[Report](reports/REP-20261106-004-caricamento-home-unitario.md), [piano attuato](riprogettazione/caricamento-home-piano.md), [ADR-0047](decisions/ADR-0047-caricamento-home-unitario.md): regressione228/228, owner/controller64/64 e controller finale12/12, gate5/5, mockup13/13, risorse12/12, presentazione/coreografia29/29 PASS. Run sovrapposti non sommati. Build/strict frontend, strict UI,9UI-asset e colori0violazioni PASS; unica violazione tipografica preesistente connect.css103 e debito ISSUE-134 distinti. Negativi WIP conservati, nessuna deroga jsdom in produzione.

Browser isolato: cinque casi funzionali PASS per errore/retry, attesa oltre10s/risposta vecchia, resize, movimento ridotto e contrasto; ulteriore smoke reale di font/foto falliti e poi disponibili, fallback/geometria stabili. Quattro osservazioni prima/dopo nelle stesse condizioni di cache/rete, tempi DOM/paint/input separati e nessuna accelerazione statistica o riduzione di rete dichiarata. Fotogrammi desktop/mobile visionati; ROI JPEG mobile MAE0 nel passaggio al riposo, discovery escluso dal confronto del materiale. Evidenze, comandi e limiti nel report e in `backup/rep054/`.

Audit1793→1801file/SHAea750561:29delta attesi, zero estranei/rimossi; whitespace e review indipendente PASS. Account/profili/bozze, backend, font/immagini e banco0.9.46 conservati. Bootstrap/concessione autenticati reali non cronometrati, prove umane PC/iPhone e Android/M11/GPU non eseguite; Chromium emulato non certifica hardware. [Anteprima4185](http://127.0.0.1:4185/?screen=app#/mockup), nessun commit, deploy o pubblicazione0.9.34.

## 2026-11-06 — verifica documentale del piano Home

[REP003](reports/REP-20261106-003-piano-caricamento-home.md), [piano](riprogettazione/caricamento-home-piano.md): revisione finale della proposta senza rilievi residui,600collegamenti validi e integrità artefatti nativi PASS.1793sorgenti applicativi con SHA complessivo d14bde1e invariato; nessun codice, dato o banco modificato. Test/build, misure di prestazioni e matrice browser del piano **non eseguiti in questo incarico**: sono verifiche future dell'implementazione, non risultati acquisiti dalla sola redazione.

## 2026-11-06 — salto del vetro al ritorno, REP001

[Report](reports/REP-20261106-001-continuita-blur-ritorno-home.md): nuova prova paint dopo il riscontro umano. Baseline1366/1920 e A/B statico hanno isolato il confine d'opacità, con blur CSS sempre16px ma diversa immagine campionata. Prima iniezione inline con bitmap relativa errata scartata e conservata; A/B valido con URL assoluto/HTTP200. Non basta leggere il filtro computed per dichiarare continuità visiva.

Build finale e QA5/5:1366/390normali, resize1920, reduced390 e contrastmore/opaque390. PNG originali e ROI fotografici: baseline ultimo ritorno→riposo MAE19,10/16,40; finale normale massimo1,06 e ridotto1,91. Primo closed→riposo0 in tutti i casi, opaco0 e riposo prima/dopo identico. Root ha visto la coppia finale1366; focus, cold intro, assenza di errori e zero azioni HA verificati. Smoke computed separato3/3 contrastmore/forced-colors/reduced-transparency: immagine shell assente, foto body nascosta e blur-card disabilitato in tutte le fasi. Non sono tre nuove registrazioni complete né collaudi hardware.

Motion21/21, UI-asset9/9, strict e build PASS; warning HLS/debito ISSUE-134 preesistenti. Audit1793file, unico CSS modificato con9aggiunte e altri1792immutati; whitespace del delta PASS. Evidenze `backup/rep051/`, inclusi negativi, A/B e `return-material-pixel-analysis.json`. Banco healthy0.9.46 non aggiornato, nessun dato o sessione umana modificati; suite generale e GPU/hardware non ricollaudati.

## 2026-11-06 — ingresso dal basso e primo caricamento, REP006

[Report avviato il5novembre](reports/REP-20261105-006-apertura-widget-finestra-apple.md): il riscontro successivo sostituisce il FLIP e il primo candidato centrato con fade-up24px senza scala, per Sistema e dettagli. Primo body non differito, niente film/blur globale; Home sfuma e resta non interattiva sino alla rimozione. Movimento ridotto120ms di sola opacità, layout e comandi conservati.

Console/Launcher196test nella prima tappa, coreografia21, geometria8 e74con PagerFarPages, Columns63, Sistema lazy39/39 dopo il guard della callback: gruppi sovrapposti, non un totale. Ultima build servizi/snapshot:194/194 Screen/provider/warning,23/23 adattivi e6/6 servizi mirati PASS; strict frontend/UI, build e9/9 UI-asset PASS. Rifiuto/vuoto del catalogo, connessione precedente, snapshot vuoto, commit dati/readiness atomico, riconnessione e montaggio iniziale verificati. Fixture jsdom dimensionate dove la misura zero non rappresentava una griglia reale; nessun bypass nel runtime. Warning bundle HLS e debito ISSUE-134 preesistenti, suite generale non rilanciata.

QA Console5/5 più smoke390 e Sistema cold3/3 (normale/ridotto/opaco), con focus, menu/Escape, interruzioni e nessun controllo Home azionabile durante l'overlay. Le bolle del reload erano misure zero; il primo PASS geometrico15/15 non provava l'assenza di contenuti provvisori. JPEG negativi successivi hanno rivelato prima falsa indisponibilità, poi catalogo comandi ancora in caricamento: conservati e corretti separatamente. Evidenze e fotogrammi in `backup/rep050/`; il report distingue ciascuna revisione e il controllo visivo finale.

Ultima QA dopo il catalogo condiviso:3/3cold1920/1366/390,71JPEG tutti rivisti e15host0px già definitivi, controlli/icone stabili dal primo visibile. Nessun paint transitorio di indisponibilità o comandi in caricamento; slot storico asincroni dichiarati. Root ha visto i primi frame1366/390. `home-complete-final-paint-review.json` separa il PASS visivo dalle sole misure RAF; `complete-provider-smoke.json` supera il percorso finale390 Home/Sistema/Console/ritorno con focus e9controlli. Sorgenti stabili, zero errori, richieste mutative o chiamate HA nel campione.

Audit finale1793sorgenti/23delta attesi, hash coerenti e whitespace limitato al delta PASS; nessun file applicativo aggiunto/eliminato. Banco healthy0.9.46 e dati umani conservati, prove su fixture separata4185. Chromium con formati emulati non certifica hardware o GPU; storico/grafici e media rimangono asincroni in spazi dimensionati. Nessun deploy o pubblicazione.

## 2026-11-05 — transizioni widget e fotogrammi

[REP005](reports/REP-20261105-005-transizioni-widget-fotogrammi.md): corrette foto deformata nel piano e pausa quasi vuota, poi destinazione obsoleta dopo resize. Baseline4 e finale6 sequenze Sensor/Tavano su1366/390/320:416campioniRAF e196JPEG con timestamp del compositor, viewer prima/dopo in `backup/rep049/widget-motion-comparison-filmstrip.html`. Nei frame finali foto mobile assente, piano senza filtri, overflow0 e massimo delle due opacità mai sotto0,401; baseline circa0,00068. Immagini viste anche da root/review.

197/197 test finali PASS con regressione origin/reflow/cleanup/reopen, build/strict e9UI-asset PASS. Coreografia131/132: una regex overview storica, CSS/test/Pager identici al checkpoint e probe negativo prima/dopo, non regressione nuova. Cinque edge funzionali su preferenze/interruzioni/cancel; resize inizialmente fallito e corretto, ultimo endpoint0,0421px contro soglia2px. UltimoJavaScript ricontrollato con2smoke (origine0px) e resize/swipeclose; nessun errore JS/rete mutativa/comandoHA nel campione.

Prima versione watcher suhandleedit-only intercettata da test e browser, poi corretta sul box incondizionato. Review precedente rettificata con checkpoint conservato; finale approvata. Quattro file,1793sorgenti,REP0048hash preservati e whitespacePASS; static layout detector `[]`. Fonte e build in `backup/rep049/`, banco healthy .46 invariato. Hardware/GPU e tutte le integrazioni HA non ricollaudati; nessuna installazione/pubblicazione o chiusura generale ISSUE-134 implicita.

## 2026-11-05 — scorrimento e selettore ACA

[REP004](reports/REP-20261105-004-scroll-e-menu-widget-aca.md): 95/95 mirati e 71/71 regressioni PASS (gruppi sovrapposti), build/strict frontend e UI PASS, 9/9 UI-asset PASS, colori zero. QA principale 9/9 e ricontrollo dopo padding finale 4/4: 1920/1366/390/320, offset reali con rotella/End/Home/swipe CDP, indice Sistema orizzontale e scheda QR verticale. Picker con voci verticali almeno 44 px, focus corrente, tastiera, selezione persistita nella fixture, Escape e fallback; reduced motion/forced colors distinti. Due difetti iniziali reali corretti, raw negativi conservati.

Otto file pertinenti, snapshot1793 e precedenti16hash preservati; review indipendente approvata, whitespace controllato senza cambiare terminazioni. Detector statico layout e 3/3 render finali `[]`; evidenze in `backup/rep048/scroll-dropdown-qa-summary.json`, immagini finali desktop/mobile controllate anche dal coordinatore. Documenti:524link senza errori e hash dei materiali nativi conservati. Nessun errore JS, comando HA o scrittura mutativa di rete nel campione. Browser posseduti chiusi, anteprima4185 disponibile; banco .46, account/profili e HA/D1 invariati. Hardware e sincronizzazione autenticata non riprovati; non equivale alla chiusura del debito ISSUE-134 o ISSUE-146.

## 2026-11-05 — centratura dell'indicatore

[REP003](reports/REP-20261105-003-allineamento-pallino-pagine.md): baseline reale con gap8px delle primitive e scarto massimo76px. Correzione della specificità nel solo CSS condiviso, senza alterare indici o animazione.29/29test esistenti, strict/build e9/9UI-assetPASS; avviso HLS distinto.12casi su1366/1920/390/320 e primo/medio/ultimo: errore X/Y e punto range0px, gap0/flex-start. Clic desktop/tap mobile corretti e quattro sonde CSS/DOM con due punti, esplicitamente non integrazione React completa. Il coordinatore ha visto Sicurezza1920 allineata.

Evidenze `backup/rep047/indicator-alignment-qa-handoff.md` e riepilogo; nessun erroreJS/scrittura mutativa/comando/origine esterna. Un solo sorgente differisce dal checkpoint002, precedenti1792conservati. Browser posseduti chiusi, anteprima disponibile. ISSUE-146 sull'ingombro mobile resta distinto, hardware non verificato; banco .46 non aggiornato.

## 2026-11-05 — vetro leggero durante lo spostamento

[REP002](reports/REP-20261105-002-vetro-trascinamento-widget.md):45/45 mirati PASS, tre nuove regressioni per il marker della copia. Gruppo aggiuntivo84/86: due regex overview già false nel CSS iniziale, prova baseline conservata; non dichiarare la suite generale verde. Strict/build e nove controlli UI/asset superati, colori zero violazioni; avviso HLS preesistente. Cinque file pertinenti, precedente consegna001 preservata10/10hash. Snapshot1793sorgenti, delta cumulativo atteso15 rispetto alla .46, nessuna differenza imprevista; cinque hash e whitespace verificati.

QA su fixture isolata: destinazione valida/reflow/drop, ritorno invalido, pila/cancel, rimozione e cleanup, touch CDP390/320, preferenze ridotte, resize e smokeConsole riusciti. Ricontrolli finali1366/390: un solo piano2px, film5%, testo nitido, fallback nascosto anche dopo rerender, origine ferma, celle libere senza fill/filtro durante move, vetro16px ripristinato al termine. Opaco mobile conserva solidità e leggibilità. Add-tray non disponibile nella UI attuale: nessuna prova manuale dichiarata.

Detector statico e due render `[]`, non certificazione universale. Rawfailed per sonde/label/aspettative numeriche del harness preservati; `backup/rep046/drag-glass-qa-summary.json` distingue casi riusciti e ricontrolli. Rimozione effettiva verificata, nessun nuovo fade zero dichiarato: comportamento storico0,6 separato in ISSUE-148. Chartsource/clone misurati uguali, nessuna correzione grafico. Il coordinatore e il revisore hanno visto le immagini finali desktop/mobile.

Nessun errore JS, comando fisico, scrittura mutativa di rete o origine esterna osservati. Banco .46/HA/D1 stessi container/immagini/avvii; anteprima4185HTTP200. Browser posseduti chiusi, fixture conservata. Nessuna autenticazione/bozza umana usata, pubblicazione o collaudo Safari/iPhone/Android/M11/GPU.

## 2026-11-05 — transizione condivisa widget/schermata, prova locale

[REP001](reports/REP-20261105-001-transizione-generica-widget.md): 196/196 test mirati, 278/278 regressioni e 48/48 ricontrolli affetti dopo la correzione Escape. Gruppi sovrapposti, non sommare. Strict frontend/UI e build superati; confini UI/asset 9/9, colori zero violazioni. Typography exit1 per Connect103 già presente nella .46; avviso HLS e ISSUE-134 distinti. Dieci file di delta (otto modificati/due nuovi), fonte1791→1793 verificata contro ZIP .46, nessuna rimozione o modifica backend/contratti/runtime/dipendenze. Hash e whitespace controllati, review indipendente approvata.

QA su fixture locale: nove timeline normali luce/TV/Tavano a1366/390/320, sette casi aggiuntivi movimento ridotto/API/interruzioni, quattro verifiche Tab e quattro Escape Fan native/fallback superati. Picker Car assente: quattro prove non eseguite, percorso comune coperto nei test. Matrice finale114aperture da57istanze su due formati,23nomi visuali, senza overflow/errori/comandi. Corrette le regressioni luce sovrapposta, Escape del menu e serratura320; quest'ultima confrontata con la vera baseline .46 (312/312) e ricontrollata nella build corretta (320/320, tre pulsanti almeno44px, etichette intere). Nessuna mascheratura dell'overflow.

Detector statico e nove render `[]`; sedici catture e trace RAF, con tempi effettivi dichiarati. Alcune catture desktop arrivano oltre il fotogramma richiesto; non sono screenshot esatti a145ms. Negative e ipotesi errate del harness preservate: il raw finale iniziale rimane failed dopo nove casi normali riusciti, il remainder e riepilogo finale documentano la verifica corretta dell'opacità effettiva. Evidenze in `backup/rep045/widget-transition-qa-handoff.md`, riepilogo JSON e sorgenti delle prove.

ACA/HA/D1 stessi container/immagini/avvii, health banco .46; nessun update o test autenticato sul banco. Fixture4184/4185 disponibile, baseline temporanea4186 e browser posseduti chiusi. Nessuna credenziale, comando fisico, scrittura mutativa di rete o origine esterna osservata. Nessun collaudo Safari/iPhone/Android/M11 o benchmark GPU, né garanzia universale di accessibilità.

## 2026-11-05 — Sistema e account, banco 0.9.46

[REP017](reports/REP-20261104-017-sistema-e-personalizzazione-account-unica.md): inventario delle 11 sezioni e correzioni circoscritte. Superati 85 test Sistema, 74 account, 39 sulle funzioni conservate e 38 di regressione Tavano/mockup; i gruppi non rappresentano un totale unico. Strict e build superati, contratti UI 3/3 e asset condivisi 6/6. Colori: zero violazioni. Typography: una segnalazione preesistente in Connect, ora alla riga 103; ISSUE-134 e avviso del chunk HLS restano distinti.

QA Chromium con dati sintetici: 84 viste Sistema e 43 account, seguite dai ricontrolli dei casi modificati, sette catture del crop e sei verifiche dei target. Una sezione visibile, tastiera, ritorno dall'account con bozza e focus conservati; corretti lo scroll fra sezioni e il titolo provvisorio che poteva applicarsi al profilo successivo. Colore libero, foto/sfondo, annullamento e retry verificati con API simulate. Il crop nel portal conserva il materiale e il blur; input colore con area effettiva di 60px e slider di 44px nel campione. Detector statico e 15 scansioni render senza nuove regressioni; rilievi Leaflet preesistenti dichiarati, nessuna certificazione universale di accessibilità.

Audit indipendente di sorgenti, immagine, bundle e runtime superato: 1791 file, delta di 37 file solo frontend/test, backend/contratti/runtime/dipendenze invariati rispetto alla .45. Verificati sette checksum, 120 asset web, 117 file runtime e smoke isolato senza rete. Evidenze e tentativi intermedi in `backup/rep044/`.

Installato soltanto ACA 0.9.46/r99 dopo backup freddo di 247058 byte verificato per hash, estrazione e integrità. Audit post 6/6 e identità live superati: 27/27 tabelle identiche, nessuna migrazione o nuovo indice; account, profili, identità HA/tecnica e mount conservati. HA/D1 senza riavvio. DB/WAL/SHM/journal: totale 5729760 byte in entrambi i campioni; quattro indici esistenti, 16384 byte complessivi. Health/manifest .46 e setup pronto su loopback/LAN; cinque viste anonime del banco superate.

Nessuna credenziale, comando fisico, sessione o bozza umana usata per il collaudo. Prova autenticata con dati umani, Safari/iPhone, Android/M11 e misure GPU non eseguite. Correzioni puntuali di ISSUE-145 e proposte ISSUE-147 distinte. Nessuna pubblicazione.

## 2026-11-04 — Tavano giorni/pagine, banco 0.9.45

[REP016](reports/REP-20261104-016-tavano-lista-giorni-paginazione.md):54backend e38frontend miratiPASS; strict frontend/backend/shared e build frontend/Casa3D/DockerPASS. ConfiniUI3PASS, asset6PASS; colori0violazioni. Typography segnala soltanto Connect157 preesistente dopo la correzione della nuova violazione Tavano; ISSUE-134 e chunkHLS distinti, nessun PASS globale inventato.

QA launcher/Console reali su dati sintetici:27stati1366/390/320 con pagine30/18/30, giorni0–6, filtri fuori pagina, copia/export/empty e stringhe lunghe. Prove affette ripetute dopo correzioni:6timingEscape,2fallbackEscape immediati,2short568 native/ridotto e fallback/ordinario, visibilità/opacità reale, focus e ultimo item nel viewport, refresh prima pagina/asOf fresco. Target≥44px e overflow0 nel campione; prima riga mobile321/376px anziché859/878. Detector finale[] in3viewport. Root ha visionato default/menu e fallback finale. Handoff/JSON/script/catture in `backup/rep043/`; tentativi falliti e assunzioni rettificate preservati,27stati non presentati come rieseguiti dopo ogni minimo ritocco.

Audit finale indipendente fonte/ZIP/immagine/web/runtimePASS:1780file,5nuovi/15modificati;4runtime intenzionali,113altri runtime identici.7checksum,120asset e117runtime verificati; icona ESM/render/geometry e versione .45 reali. Smoke senza rete con SQLite in memoria verifica6comportamenti Tavano; versioni runtime e19APK uguali alla .44. Materiali intermedi respinti/ritirati mai installati, gate ricreato solo dopo le correzioni finali.

Installato soltanto ACA0.9.45/r99 dopo backup freddo240382byte SHA9084…3c51 verificato. Audit post6/6 e identità livePASS:27/27tabelle identiche,0colonne aggiunte,4indici intenzionali; account/profili/identità HA/tecnica conservati, HA/D1 stessi ID/avvii/mount. `dbstat`:4×4096byte nuovi indici; pagine385→388/freelist1→0, DB/WAL/SHM/journal totali5729760byte nei due campioni. Non equivale a schema identico o costo nullo; quote logiche separate. UI anonima banco5/5vistePASS, health/manifest .45 su loopback/LAN.11 e setupready.

Nessuna credenziale/form/comando umano o fisico, bozza/IndexedDB/scheda umana toccata. La QA sintetica e lo smoke isolato non sono una prova autenticata sul banco. Safari/iPhone, Android/M11 e misure GPU/FPS non eseguiti. Limite faccette100, timestamp legacy e vecchie issue descritti nel report. Nessuna pubblicazione.

## 2026-11-04 — sovrapposizioni e anteprime, banco 0.9.44

[REP015](reports/REP-20261104-015-sovrapposizioni-sync-e-anteprime-pagine.md): 229 test pager/gesti/CSS, 53 chrome/frame, 33 adattivi/nome e 94 regressioni operative PASS; i gruppi non rappresentano un totale unico. Strict, build frontend/Casa3D e risorse condivise 6/6 PASS. QA con launcher reale e stati sintetici: 12 stati HUD/16 azioni, 9 viste spazio-ridotto/ripristino, 4 contesti overview normale/ridotto PASS. Avvisi separati, spazio restituito e configurazione invariata; centro 0,72/laterali 0,648, metà gesto 0,684 e target coerente entro 0,1px. Tentativi falliti e rettifiche del harness conservati in `backup/rep042/`.

Audit sorgenti/immagine/bundle e runtime PASS: snapshot 1775 file, delta 14 file solo UI/test, backend/API/coordinatore/IndexedDB/dipendenze identici alla .43. Nuovo backup freddo 240344 byte verificato; 27/27 tabelle e identità conservate, HA/D1 e mount invariati. Il primo preflight ha interrotto l'update prima dello stop per cambio IP; rete specifica e rollback aggiornati a .11. ACA 0.9.44/r99 health/manifest 200 e setup ready su loopback/LAN. UI anonima effettiva 5/5 viste PASS, zero overflow/errori/esterne/mutazioni. Evidenze post `ops-preservation-audit.json`, `ops-live-identity-audit.json`, `bank-white-ui-results.json`, `runtime-final.json`.

Limiti: nessuna sessione umana/bozza locale aperta o scartata; QA sintetica distinta dal coordinatore autenticato. Nessun collaudo fisico Safari/iPhone/Android/M11 o benchmark GPU. ISSUE-134/145 e densità preesistente dell'indicatore ISSUE-146 non risolti implicitamente. Nessuna pubblicazione.

## 2026-11-04 — banco Vetro Bianco0.9.43

[REP014](reports/REP-20261104-014-banco-vetro-bianco.md): default condiviso e test risorse6/6PASS; audit indipendente sorgenti/immagine/bundle e smoke isolato PASS (1772sorgenti,120asset,116runtime invariati, foto e14markerCSS). Backup freddo203154byte SHAe78a…8efb ricalcolato/riestratto, integrità e27/27tabelle identiche prima/dopo. Identità HA/tecnica uguali anche al ricalcolo indipendente; HA/D1 e mount conservati. SoloACA0.9.43/r99 healthy/setupready, healthloopback/LAN e manifest200. UI banco anonima5/5viste1366/390/320 e preferenze: foto decodificata/SHA esatti, vetro e lavanda, ingresso/fallback verificati;0overflow/errori/esterne/mutazioni. Nessuna nuova autenticazione, comando o prova hardware; ISSUE-134/145 distinti. Evidenze in `backup/rep041/`; primo mismatch di chiave del verificatore identità preservato e corretto, senza modifiche del banco.

## 2026-11-04 — allineamenti e accento Glass White

[REP013](reports/REP-20261104-013-allineamenti-accento-vetro-bianco.md): baseline e ricontrolli Home/Kit1440/390/320, popup/fallback e8categorie. Header1440 tutti12px (prima12–54,64),390tutti8px,320tutti4px; pannelli kit337,70px pari, azioni48px/switch44px. Geometria serializzata1440 preservata.7ricontrolli affetti,2Home320 finali e3Kit con strumenti nel flusso;0overflow/target fuori nel campione, hit-test/click reali senza overlay. Primo blocco del chrome conservato nei risultati, poi corretto. Accento nominale icona Luce contro676pixel: minimo1,002→4,111:1; toggle11,003:1, non certificazione universale. Copia risorse6/6PASS; TS/suite generale non rieseguite per la sola modifica CSS, ISSUE-134/145 distinti. ACA/HA/D1 stessi ID/immagini/avvii; nessuna installazione. Evidenze in `backup/rep040/`, M11/Safari/Android fisici non collaudati.

## 2026-11-04 — interfaccia completa e ingressi Glass White

[REP012](reports/REP-20261104-012-interfaccia-completa-vetro-bianco.md): anteprima su componenti reali con dati simulati.17viste principali1440/390,6ricatture affette+fallback e2smoke finali PersonaTavano,0overflow/filtri annidati/erroriJS/HTTP/esterne/POST nel campione. Il primo controllo fallback contava proprietà sui pseudo-elementi `display:none`: risultato fallito preservato, metrica corretta e ricattura PASS. Movimento normale/ridotto verificato su ingresso app unico, Sheet luce, Popover con origine/flip, uscita e riapertura.64test mockup+20overlayPASS, inclusa regressione nativepopover red→green su misure nulle prima dell'apertura effettiva. Strict/build PASS, risorse comuni6PASS, segnalazione chunkHLS distinta. BancoACA/HA/D1 stessi ID/immagini/avvii di REP009. Nessuna prova hardware M11/Safari/Android, nessun verdetto universale di contrasto/focus o di suite generale ISSUE-134; ISSUE-145 distinto. Evidenze in `backup/rep039/` e relativi handoff. Anteprima lasciata attiva, nessuna installazione o pubblicazione.

## 2026-11-04 — prova vetro bianco e paesaggio

[REP011](reports/REP-20261104-011-prova-vetro-bianco-paesaggio.md): variante opt-in con le schermate reali, su proxy vincolato a FakeHA/SQLite memory, senza banco. Copia design6/6PASS; matrice17viste locale e6ricatture finali1366/390/320 dopo velo58% e headerkit.0overflow/nestedblur/errori/esterne/mutazioni nei campioni. Campionamento pixel testuale P95 minimo osservato6,135:1, non minimo assoluto o certificazione. Preferenze/opaco0blur, focus tastiera/colorpicker verificato dopo readiness; primo punto false era attesa insufficiente del harness.

Paesaggio imagegen integrato, originale preservato e solo conversione WebP206122byte, origine/prompt nelle fonti. Impronte del banco ACA/HA/D1 invariate (container/immagine/StartedAt), nessun aggiornamento o nuova build immagine. No prove M11/Safari/Android fisici, perfGPU o popup su media arbitrari. Evidenze in `backup/rep038/`; audit funzionale010 e ISSUE-145 restano distinti, non corretti dal tema.

## 2026-11-04 — audit blocco1, account/accesso/usabilità/movimento

[REP010](reports/REP-20261104-010-audit-blocco-account-usabilita-movimento.md), [ISSUE-145](project-status.md#issue-145--audit-del-blocco1-account-accesso-e-movimento): suite mirate **126/126frontend (16file)** e **54/54backend (5file) PASS**. Repro aggiuntivo in backup: **1FAIL atteso**, RegistrationForm smontata durante verifyRegisteredSession accetta comunque la callback tardiva; P1 aperto, nessuna correzione. Non confondere questo fallimento dell’invariante con una suite generale rossa o una nuova modifica del prodotto.

Chromium390×844/FakeHA/SQLite memory, bundle0.9.42:5/6scenari auth riusciti, ultimo limitato429 dopo creazione201 e ripetizioni del collaudo. Login attesa usa aria-busy e una sola richiesta; MFA/errori/username occupato verificati. Lettura/render signup: alert globale ma0aria-invalid/focusCTA, contro2errori inline/focusinput nel login;0overflow nei form campionati320/390/844. Il primo wait del gear era fermo sul normale gate di scelta profilo, non un difetto dell’app.

Componenti Account/Crop reali con API intercettate:6swatch0×0/trasparenti, avatar nero con ink34/34/53 e contrasto1,348:1; drag a2touch X0,20→-0,98 con1px aggiuntivo. Entrata Sheet280+160ms,450,8ms misurati; dismiss≤9,7ms per unmount senza exittransition. Crop range con nomi accessibili/tastiera ma etichette visive assenti; Chiudi apparentemente enabled durante invio ma ignorato. Reducedmotion transformnone/fade120/corpo0, target44px+ e focus di ritorno positivi. Il run motion è parziale: coda Button/form non eseguita per errore React del harness, non PASS globale; grezzo/tentativi preservati. Alert AccountView dopo retry riuscito confermato solo staticamente.

Evidenze `backup/rep037/test-audit.md`, relativi JSON/log/repro, `flow-audit.md/json`, `visual-block-audit-results.json`, `motion-accessibility-audit.md/.summary.json` e screenshot. Nessun account/token umano, comando fisico, scrittura backend reale del crop, modifica del banco/HA/D1, build o deploy. Hardware Safari/iPhone/Android/M11 non collaudato. I difetti restano aperti; la successiva prova grafica assegnata dall’utente (REP011 in preparazione) non ne costituisce risoluzione.

## 2026-11-04 — Liquid Glass sul banco0.9.42/r99

[REP009](reports/REP-20261104-009-banco-liquid-glass.md): build da snapshot1763file e audit indipendente7checksum/22strumenti+2generati/119asset/116runtime PASS. Backend/contratti invariati rispetto .41; smoke isolato200/401 corretto, container temporanei rimossi. Backup freddo attuale179723byte estratto e SQLiteintegro; confronto dopo riavvio27/27tabelle identiche e0colonne nuove. Account HA/provider e identità tecnica con impronte immutate, stessi volumi; HA/D1 stessi container e orari di avvio. Nessun ripristino ai dati anteriori al recupero dei profili.

Container healthy, healthok/version0.9.42/setupready su loopback/LAN. Browser anonimo effettivo sul3002:2viste1366/390 PASS, materiale nuovo,0overflow/errori/esterne/mutazioni; screenshot ispezionati. Primo controllo falliva sul formato del token CSS minificato, preservato e corretto nel solo harness tramite colore risolto. Nessun nuovo login umano o comando fisico, né prova hardware/iPhone. Evidenze in `backup/rep036/`, confronti dati/identità soltanto conteggi e hash, nessun segreto nei report. Pubblicazione esclusa.

## 2026-11-04 — tema condiviso Liquid Glass

[REP008](reports/REP-20261104-008-tema-liquid-glass.md): build frontend con strict, Windows e web Android PASS; test copia design6/6 e UI3/3 PASS, typecheckUI PASS, colori0/596 e lint effettivo dei4moduli TS/TSX cambiati PASS. Appearance/SystemPage28PASS/1failure preesistente (didascalia QR contro query `/indirizzo/i`); tipografia1violazione preesistente nel connect.css byte-identico al checkpoint. Controlli generali non dichiarati tutti verdi, debito distinto da regressioni nuove risolte.

Chromium153 headless/Vite, senza backend/account reali:16viste app e15kit/QR PASS, più3verifiche overlayfinale e2kit; campioni di fallback opaco, preferenze,320/390/desktop, testo ingrandito e dati lunghi/estremi/vuoti. Campioni con0overflow/blur annidati/errori/richieste esterne/comandiHA. Popup finali86%+blur12px con testo muted sul composito nero5,39:1; focus/error/forced-colors e priorità utility verificati separatamente. Kit e screenshot ispezionati; QR confrontato col generatore, nessuna scansione fisica/decodifica indipendente nel lotto.

Prove e tentativi falliti dell’harness conservati in `backup/rep035/`, audit movimento con verdetto Approve sul delta. Stima desktop a pagina ferma rAFmediana16ms/p9517ms non è benchmark GPU/gesti del tablet. Inventario ADB vuoto: M11, Safari/iPhone e Android fisici non provati. Classico e originali preservati, risorse condivise generate; nessun aggiornamento di banco/HA/dati o release.

## 2026-11-04 — recupero reale dell’account e dei profili confermato

[REP005](reports/REP-20261104-005-recupero-account-banco.md): utente completa la nuova creazione e conferma **«Sì, vedo i widget recuperati»** dopo la copia. Owner HA/client/sessione normale verificati in modo opaco. Helper esteso con profilo target esplicitamente conservato:9/9QA aggiuntive e bootstrapstore3profili PASS, inclusi9pagine/28elementi/revisioni non predefiniti, rifiuti e idempotenza; precedenti17+bootstrap2/2+CLI mantenuti come evidenze storiche.

Applicazione reale offline:2copie,2eventi Tavano e selezione mappata in un’unica transazione. Verifica indipendente:2source immutati rispetto al checkpoint,1profilo target esistente immutato, contenuti/metadati delle2copie identici ai sorgenti con nuovi ID/proprietario, libreria3 e integritàok. Primo checker separato fallisce SQLITE_CANTOPEN prima del riavvio; ripetuto dopo l’avvio con PASS, senza secondo apply. Backup precopia237504byte verificato; checkpoint finale SQLite online1568768byte con integritàok e configurazione HA8703byte con identità stabile/contenuto dell’archivio verificato (storia HA esclusa). Chiave tecnica preservata solo nel volume separato, nessun contenuto sensibile mostrato o versionato.

Banco0.9.41healthy,setupready/registrazioneready su loopback/LAN. Evidenze `backup/rep032/`. Riscontro reale PC completato; iPhone e comandi fisici non collaudati. Nessun nuovo codice applicativo, pubblicazione o API di recupero.

## 2026-11-04 — primo account con UI comune, banco0.9.41

[REP006](reports/REP-20261104-006-primo-account-interfaccia-comune.md):89test PASS e2FAIL su vecchie aspettative di denominazione manuale in AppRootLoginRace. Questo test e ClientAccessGate sono byte-identici allo ZIP.40, naming automatico già vigente; baseline completa non rieseguita. Strict/lint10moduli/colori0/596file/build PASS. Nuovi casi: pending colore, binding identità, risposta persa, contesto cambiato,401 isolato, cancellazione e revoca grant transitorio; flussi normali/login/MFA conservati.

QA HA reale2026.9.4 separato, tmpfs/memory:4passi PASS, prima card/signup1366 e390 senza overflow, owner/admin e nome verificati suauth/current_user, colore assegnato al suo ID e mantenuto dopo reload. Zero profili creati/errori JS/comandi fisici/richieste browser esterne. Fixture fermata/rimossa; nessun account reale creato. MFA del nuovo owner e Safari fisico non collaudati. Audit7checksum/1755sorgenti/119asset/116runtime PASS; smoke200/401 attesi.

Banco.41healthy, UI reale anonima verificata senza credenziali/invioform. Backup222570byte verificato,27tabelle identiche e nessuna colonna nuova; HA dedicato/storico/D1 stessi stati/orari durante quest’aggiornamento. Evidenze `backup/rep033/`; creazione umana e copia autorizzata ancora in [REP005](reports/REP-20261104-005-recupero-account-banco.md). Helper di recupero verificato17casi+bootstrap2/2+CLI Windows in rep032, non applicato a dati reali.

## 2026-11-04 — registrazione, pill colore personale e analisi accesso

[REP-20261104-003](reports/REP-20261104-003-registrazione-colore-e-accesso.md): RegistrationForm 8/8 PASS, strict TypeScript, lint mirato, lint colori 594 file/zero violazioni e build PASS. Eccezione esplicita per bianco/nero funzionali del contrasto dell’avatar; nessuna nuova palette. QA FakeHA/SQLite in memoria: desktop 1366 e telefono 390 px completi PASS; a 320 px pill, contrasto e tastiera corretti, ma form con overflow 39 px già presente nell’artefatto 0.9.39.99 (ISSUE-143). Primo fallimento e baseline conservati; risultato finale distinto per formato, non dichiarati tre formati completi PASS.

Registrazione con colore arbitrario, login e colore restituito dal backend confermati; richiesta pendente blocca il picker. Zero errori JS/richieste esterne/comandi fisici. Screenshot del form e pill ispezionati; picker di sistema e dispositivi fisici non collaudati. Quattro file di codice/controlli con checkpoint e diff; 198 link documentali validi e pacchetti nativi conservati. Evidenze `backup/rep030/`. Nessun aggiornamento banco, test generale o nuova pubblicazione; nomi e ritiro del token manuale rimangono analisi/proposte.

## 2026-11-04 — palette fissa ACA Classico, banco0.9.39

[REP-20261104-002](reports/REP-20261104-002-palette-fissa-tema-classico.md): design5PASS, frontend7suite37PASS, strict/lint/buildPASS. SystemPage22PASS/1FAIL su asserzione globale /indirizzo/ e didascaliaQR già presenti nel checkpoint; non dichiarata esecuzione completa della baseline, no correzione fuori incarico. Totale8file59PASS/1FAIL, ISSUE-134 distinto.

QA isolata4/4PASS: nove token default identici, PNG launcher/account identici byte per byte nel campione; UI Aspetto statica e legacy dark/arancio/foto inerte. Raw server/localStorage/BlobIndexedDB e immagini account intatti; reload/sistema dark non generano operazioni automatiche,0JSerrori/0comandi. Percorso completo Importa file non collaudato nel browser; testunitari QR/fallback distinti. Nessuna pretesa di collaudo fisico Android o di tutti gli stati HA.

Audit indipendente7checksum/1748sorgenti/22tools+2generated/119asset/116runtime, smoke200/401attesi. Backup222261byte verificato;27tabelle identiche, HA/D1 non riavviati. Avvio iniziale su vecchioIP fallito, rete attuale192.168.1.19 ripristinata: health/HTML200, utente conferma ACA in Edge. Firewall invariato; telefono sulla rete Public odierna non verificato. Evidenze backup/rep029, limiti nel report; nessuna pubblicazione nuova.

## 2026-11-03 — correzione e conferma fisica cambio dispositivo

[REP-20261103-004](reports/REP-20261103-004-cambio-dispositivo-immediato.md): backend completo seriale744PASS/1skip,50file; frontend51PASS/2file e18PASS/3file disgiunti, strict/lint/build riusciti. QA reale isolata6/6PASS: rilascio DELETE perso ma EOF ricevuto→PC automatico3471ms, ordinarie3395/3540ms; rinnovo/titolare protetto e reload in entrambe le direzioni. Zero erroriJS/comandi fisici. Non è Chromium a dimostrare Safari: dopo aggiornamento del banco0.9.38/r100 l’utente esegue la prova sul proprio iPhone/Edge e conferma **«Sì, entra in pochi secondi»**. Nessuna misura cronometrata su hardware né collaudo di tutte le sospensioni/reti.

Audit indipendente7checksum,1746sorgenti ZIP/proof/working tree,22strumenti+2QR,119asset web e116file runtime; smoke isolato200/401 attesi. Backup260386byte verificato/integritàok;27tabelle identiche senza schema nuovo, HA/D1 non riavviati. Evidenze backup/rep027 e report. Fallback senza primo SSE/EOF, parte residua ISSUE-139 e debito generale ISSUE-134 distinti; nessuna pubblicazione.

## 2026-11-03 — ritorno reale iPhone→Edge e prova inversa isolata

[REP-20261103-003](reports/REP-20261103-003-ritorno-iphone-edge.md): utente conferma PC→iPhone riuscito; dopo chiusura scheda/browser iPhone, Edge ancora bloccato; seguendo attesa3min/Riprova conferma widget sul PC. Accesso recuperato, ma tempo esatto e causa del rilascio non misurati; immediatezza Safari non verificata, ISSUE-140 aperta. Nuova QA inversa bundle0.9.38/r99 immutabile, app completa/FakeHA:3passiPASS,2client/1profilo, zero erroriJS/comandi; chiusura pagina telefono→DELETE200→PC pronto3364ms automaticamente. È Chromium emulato, non Safari. Script node --checkPASS, server fermato; evidenze backup/rep026. Nessuna modifica a codice, dati o banco; nessun nuovo deploy.

## 2026-11-03 — Tavano persistente e uso esclusivo, banco0.9.38

[REP-20261103-001](reports/REP-20261103-001-spostamento-widget-live.md): backend finale seriale **731PASS/1skip,49filePASS**; frontend gruppi sovrapposti68/5file,60/4file e49/2file dopo i fix, da non sommare (finali coordinator43, proof6, comandi8, rollback4, apiAuth9). Posizioni CommonOrder/controller **14PASS**. Strict/lint pertinenti, build frontend/Docker e controllo UI riusciti. Suite frontend/lint generali non dichiarati verdi: ISSUE-134 distinto.

QA isolata finale **7scenariPASS**,2client/1profilo, zero erroriJS/comandi fisici: Tavano0,0→2,2 persistente al reload; telefono in attesa non acquisisce durante reloadPC (riacquisizione87ms); rinnovo20s; chiusura sola schedaPC→telefono3012ms, posizione adattata senza nuova revisione/pagina; PC riaperto bloccato. Races reload e ritorno visibile/editor corrette e ricollaudate, prime prove conservate. Windows proxy header/body verificati; Android LocalServer JVM3/3PASS, nessuna nuova build nativa.

Audit indipendente7checksum/1744sorgenti/116file runtime/119asset ZIP=immagine; smoke isolato health/manifest/HTML200, bootstrap anonimo401. Banco aggiornato su autorizzazione: backup263233byte hash verificato/integritàok;27tabelle con dati precedenti invariati, sola nuova colonna nullable degli intenti; healthy0.9.38/setupready/hash bundle atteso, HA/D1 non riavviati. Evidenze backup/rep024, SHA e dettagli nel report.

Minimizzazione/background fisico non collaudato: Chromium headless con altra scheda riporta ACA ancora visibile/focalizzata; unit test hidden→visible senza rilascio/perdita editor. Keepalive chiusura best effort, TTL180s necessario dopo crash/rete. Safari/iPhone/Android fisici e comandi domestici reali non verificati qui. Uso simultaneo storico sotto sostituito da uso alternato.

Aggiornato: 2026-11-03. Questo documento distingue controlli documentali, verifiche del banco prova e scenari di prodotto previsti. La realizzazione dei requisiti resta in [project-status.md](project-status.md).

## 2026-11-02 — REP016, account comune e checkpoint automatici

[Report016](reports/REP-20261102-016-modifica-immediata-e-ingresso-profilo.md): backend completo seriale **710PASS/1skip,48filePASS**; frontend gruppi distinti **72PASS/7file**, registrazione/ordine **9PASS/2file**, coordinatore **33PASS**. Dopo la correzione finale quota ripetuto soltanto lo sheet: **11PASS**, già incluso nel gruppo72 e non da sommare. Strict, lint mirati e build riusciti; controllo meccanico sui target UI senza segnalazioni. Due fallimenti backend iniziali in parallelo fuori area passano entrambi nel rerun49/49 e nella suite seriale, senza modifiche ai relativi sorgenti. Suite generale frontend/lint generale non dichiarati verdi: ISSUE-134 resta distinto.

QA con HA simulato e due contesti Chromium separati: **10scenariPASS**, quattro screenshot desktop/touch390×844 ispezionati, accesso allo stesso profilo senza duplicazione, rinomina PC↔telefono senza Salva/reload, Fatto/ultimo input e persistenza. CTA finali oltre44px. Ulteriore QA quota della revisione100: **4scenariPASS**, IndexedDB reale con10MiB dummy, dialog nativo modale, esportazione e scarto accessibili dentro il popup, vecchia bozza e revisione remota intatte; zero comandi fisici/erroriJS. File di evidenza in backup/rep023, nessuna origine esterna autorizzata; tutte le fixture temporanee fermate.

Provenienza finale:1740sorgenti e7checksum verificati,119asset ZIP/immagine identici. Smoke isolato health/manifest/HTML200 e bootstrap anonimo401. Installazione autorizzata sul banco locale0.9.37: backup a freddo verificato,26tabelle conservate nella prima migrazione e27nel passaggio alla revisione finale, hash/conteggi identici. Health healthy, setupready, registrazioneready, bundle0.9.37; HA/D1 non riavviati. Non si tratta di un collaudo della nuova UI su Safari/iPhone/Android fisici o di comandi domestici reali; nessuna nuova pubblicazione.

## 2026-11-02 — REP014, setup essenziale e password visibile sul banco0.9.35 locale

> Evidenza storica del banco0.9.35; il banco corrente0.9.37 e le verifiche nuove sono descritti qui sopra.

[REP-20261102-014](reports/REP-20261102-014-accesso-essenziale-password-visibile.md): regressioni PasswordField/accesso/registrazione/setup **31PASS in4suite**, poi controllo finale PasswordField **4PASS**, sovrapposto al gruppo precedente e non da sommare. Strict UI/frontend, contratti UI3PASS e lint delle fonti interessate riusciti. Verificati stesso nodo/valore/ref, attributi e vincoli, toggle indipendenti, focus del puntatore e nessun submit/onChange provocato dall'occhio; autenticazione e MFA conservate.

Build e wrapper locale0.9.35.99 installati sul banco come ACA0.9.35, senza pubblicare una nuova versione. Backup a freddo454.774byte, SHA256 **292976360463a5c2c06e1d788a5bc0db0f9cd8bd5ed48852424520aec8e55b7d**, integrità SQLite ok;26tabelle con hash/conteggi invariati. HA e D1 mantengono ID/avvii. Nessun account creato.

QA sul banco reale http://192.168.1.11:3002/, Chromium1280px e390×844 touch emulato: **2PASS**. Stato `owner-required` letto realmente, senza fixture: titolo/quattro campi/azione, paragrafi statici assenti, password inizialmente nascoste, mostra/nascondi indipendente e valore invariato; campi vuoti e nuovamente nascosti al reload. Focus/tastiera su desktop; nessun overflow orizzontale. Zeroerrori JS, POST, WebSocket o richieste esterne; password di prova svuotate prima degli screenshot. `backup/rep021/owner-form-results.json` e prove collegate. Non è un test di creazione owner/login reale né di Safari/iPhone fisico; pubblicazione0.9.34 e conferma di raggiungibilità U55 sotto restano fatti distinti.

## 2026-11-02 — U55, pubblicazione 0.9.34 e aggiornamento del banco PC

[REP-20261102-013](reports/REP-20261102-013-pubblicazione-0.9.34-aggiornamento-centrale.md): pubblicata [release v0.9.34](https://github.com/acamemo/acasystem-releases/releases/tag/v0.9.34), ID **431854516**, con otto asset. Manifest/config GHCR e download pubblici verificati anonimamente; sette checksum e archivio sorgenti di1735file/1760entry coerenti. Immagine `ghcr.io/acamemo/acasystem:0.9.34`, digest **sha256:69eb0d6a389e850ab591a508108b39c47b8494eccd8b0fc33cbd57736e1df2d4**; snapshot pubblicato **813208fb0073515dd62e9447adc4b2e1308692ec4b855be03f4c1191a556316d**, catalogo al commit **ff77efe8788faeb2a442ce0a5aecd8fb6d20e980**. Cinque note QA escluse dai materiali pubblicabili, originali locali conservati e bundle web byte-identico a quello verificato in REP012. Strumenti release9/9PASS. ZIP/APK nativi revisione2 restano locali, non allegati alla release.

Aggiornato da0.9.32 a0.9.34 **il banco su questo PC**, scelto dall'utente; non un mini PC fisico. Prima dell'avvio, backup a freddo del volume ACA:451.635byte, SHA256 **113f84fa984859d3cb2562fd5222544f670c122c117ba4d4f25d3d7ae242d064**, estrazione di verifica e SQLite `integrity_check=ok`. Dopo l'aggiornamento, nove tabelle legacy identiche per hash/conteggio, incluse12configurazioni correnti e188revisioni. HA e D1 mantengono contenitori/immagini/avvii; HA era già `owner-required`, non è stato azzerato dall'aggiornamento. Nessun account creato o comando fisico eseguito dall'agente.

Health/bundle/API protette e versione0.9.34 riusciti su **http://192.168.1.11:3002/** e loopback PC **http://127.0.0.1:3002/**. Quattro contesti browser PC/telefono × LAN/loopback, con mutazioni bloccate:4/4PASS,35asset200per contesto, zeroerrori JS/console/traffico esterno. La prova LAN dal PC non era una prova sul telefono: l'utente ha rettificato la prima risposta positiva dell'iPhone. Dopo la sola regola firewall puntuale Private/LAN `ACA-System-LAN-3002`, applicata con UAC, il retest umano è **«Sì, ora compare ACA»**.

Confermata quindi la raggiungibilità della schermata su iPhone fisico; **login, profili, sincronizzazione e comandi fisici non sono ancora collaudati su quell'hardware**. Prima occorre completare il proprietario HA nella webapp ACA sul PC, poi usare lo stesso account e profilo su iPhone, con nomi client diversi: [guida di prova](riprogettazione/blocchi/03-profili-client-tavano-prova.md). PC acceso e stessa LAN necessari; nessun remoto, VM o installazione su mini PC. Evidenze operative in backup/rep020; i risultati U52–U54 sotto conservano il precedente stato locale.

## 2026-11-02 — U52–U54, client/profili live/Tavano e immagini account

[REP-20261102-012](reports/REP-20261102-012-profili-client-editing-tavano.md): backend completo **696 PASS/1 skip**, strict frontend/backend/Casa3D riuscito, UI3/design4/Casa3D443 PASS. Verificati registrazione e recupero senza duplicati/password persistenti, sessioni/client e revoca, migrazione idempotente/fonti divergenti, profili proprietari e Tavano domestico, CAS/lease/scadenza/risorse propagate, undo e bozze/quota/conflitti, comandi monouso e timeout/riavvio incerti, pulizia/export/immagini cifrate. Gruppi frontend mirati e limiti riportati senza sommare test sovrapposti.

Suite completa frontend:3872PASS/11FAIL prima degli ultimi aggiornamenti, sei suite pertinenti ripetute78PASS; restano tre aspettative preesistenti riprodotte e sensibilità lazy/motion già in ISSUE-134. Lint frontend, colori e tipografia riusciti; lint backend generale ancora setup.ts:12 no-control-regex, sorgente invariata dal checkpoint. Nessuna dichiarazione di suite/lint generale verde.

Browser su dist produzione con Express e HA simulato2026.10.4: PC e Chromium telefono/touch, registrazione/login/nomi senza reset, lease concorrenti e modifiche indipendenti, foto/rotazione/cover, persistenza dopo reload, Tavano fullscreen con dettagli, copia60 (fallback manuale e clipboard) ed export depurato63eventi nell'ultima prova. Run precedente con126eventi e persistenza conservato. Zero pageerror; sole409attese; tentativi tile OSM abortiti dalla whitelist loopback. Centratura avatar verificata con scarto0px dopo correzione CSS locale. Nessun invio di log a chat o terzi.

Native revisione2: core144/Windows100/Androidweb22/shared7 e Java17 PASS, strict/build ZIP/APK riusciti. Smoke Electron9/9 include persistenza reale IndexedDB bozze al cambio centrale e pulizia identità/cache/foto. Android fisico e Safari/iPhone non verificati. Immagine Linux effimera senza rete:11controlli API/asset/schema/versione e bundle pre-login riusciti. Snapshot1740sorgenti, ZIP1765voci e7checksum verificati; nessuna dipendenza/protectedfile/VM modificati. Misura SQLite con2000eventi conferma checkpoint una volta, scadenza iniziale e pagine libere riusabili; quota logica distinta da DB/indici/WAL fisici.

Build web/backend0.9.34, wrapper locale0.9.34.99 e [guida](riprogettazione/blocchi/03-profili-client-tavano-prova.md) consegnati. Nessuna pubblicazione/installazione sulla centrale, credenziale reale o comando a dispositivi. Hardware/LAN e HA domestico restano da collaudare. Evidenze locali in backup/rep019.

Probe IndexedDB reale del modulo sorgente `drafts.ts` (bundle temporaneo esbuild, nessun export pubblico nuovo): Chromium chiuso/riaperto recupera bozza con ricevuta e cache; filtro casa/utente e recupero dello stesso utente da altro client verificati. Due schede salvano6MiB simultanei: uno accettato, uno rifiutato `DRAFT_QUOTA`, nessuna perdita della bozza precedente; delete esplicito lascia intatti altri dati. `qa-drafts-indexeddb-results.json`, zero errori JS/traffico terzo. Sorgenti invariati, browser/server probe chiusi. Check finale46nuovi link validi, hash nativi e diff whitespace con gestione CRLF riusciti.

## 2026-11-02 — U46, consolidamento implementato

[REP-20261102-008](reports/REP-20261102-008-consolidamento-progetti-e-flussi.md): test UI3/3/design4/4, client core144/Windows99/Android21, packaging4 e smoke8 riusciti; strict/build client Windows e web Android. Shell4viste/24confronti materiali, risorse/hash invariati. Frontend317test launcher/modelli e112dispositivi riusciti; dominio senza dipendenze runtime di presentazione. Otto moduli backend e classify emettono JS identico al checkpoint; contratto comune36dichiarazioni solo tipi. Rimozione/undo estratti preservando corpo e ordine espanso dei126hook. Rimossa copia identica nella fixture HA per sbloccare typecheck/test, senza variazioni dell'handler originario.

Typecheck frontend/backend/Casa3D generale PASS; backend completo640PASS/1skip, Casa3D443PASS. Frontend lint e tipografia662file/colori578file PASS; lint dei file backend modificati PASS. Lint backend generale non verde per segnalazione preesistente in setup.ts. npm test generale ha251file frontend PASS/9non verdi,3784test PASS/9FAIL e2errori di raccolta: esiti conservati. Diagnostica isolata/baseline e debito in ISSUE-134; nessuna suite generale dichiarata verde.

Build Docker da snapshot congelato riuscita, sourceSHA4e4c93fa…ee0050d1 corrispondente all'immagine; prove negative di etichetta mancante/versione/byte/nome/add/delete riuscite. Prepare completo locale revisione99:1673hash sorgenti,22tool,QR/licenza e7checksum verificati nell'archivio1698voci. Non è una release pubblicata né un'attestazione firmata/riproducibilità binaria. Quattro PNG owner prima/dopo identici; mockup con motion percorre rimozione/undo e ripristina layout/hash, zero API/HA/rete esterna. Nuove immagini non avviate, nessuna VM/installazione o modifica delle release pubbliche. ZIP/APK storici non ricompilati. Evidenze backup/rep018, limiti fisici e generali nel report.

## 2026-11-02 — U45, audit struttura delle cartelle

[REP-20261102-007](reports/REP-20261102-007-scalabilita-struttura-cartelle.md): inventario da git ls-files con esclusioni correnti, lettura manifest/config/build e audit statico di741moduli frontend/backend/UI con Babel già presente. Nel grafo locale ricostruito non rilevati cicli runtime né import UI/backend verso frontend; esclusi require/import non letterali e altre radici, nessuna garanzia globale di assenza di cicli. Confermati dipendenze delle risorse shell da Windows, packaging duplicato e controlli Node comuni non aggregati da npm test.

Confronto metadati asset:42attesi,Windows43con README residuo,Android42; copier Windows non sincronizza le rimozioni. git check-ignore e lista untracked confermano cache Vitest sotto progetto/node_modules non ignorata. DTO manuali/import modelli nelle schermate e documenti d'ingresso superati verificati sui sorgenti. Rischio provenienza sorgenti/immagine dedotto dal flusso prepare, nessuna divergenza della release pubblica dimostrata. Manifest/lock coerenti nelle proprietà controllate; nessuna necessità dimostrata di fonderli.

Solo audit/documenti, nessun build/test applicativo, nuovo strumento o codice modificato. Evidenze locali in backup/rep017, proposte non applicate in ISSUE-133. Controllo finale di collegamenti/diff documentali distinto dal collaudo di prodotto.

## 2026-11-02 — U44, UI e movimento condivisi

[REP-20261102-006](reports/REP-20261102-006-ui-movimento-layout-condivisi.md): strict UI autonomo e frontend riusciti; controlli di confine3/3, identità fra import storici/canonici3/3, chiusura asset CSS/font1/1. Regressioni mirate: primitive10file/118test; navigazione/layout24file/745test; toast/motion2file/50test (gruppi con sovrapposizioni); scanner CSS esteso7/7. ESLint586file senza errori/avvisi, tipografia654 e colori576 senza violazioni.

Banco Electron autonomo, senza frontend/API/Tailwind: desktop con movimento e telefono con movimento ridotto; focus/Tab/Escape, scroll lock annidato, Console con cronologia/Indietro, toast max3/scadenza e Grid/Flex/hidden verificati. Otto screenshot, zero errori JavaScript/console o richieste API. Quattro viste owner della webapp prima/dopo hanno PNG e stili identici. Totale di tutti i chunk JS+CSS: gzip772157→772169byte (+12); misura delle risorse compilate, non benchmark di velocità o traffico di un singolo avvio.

Build frontend/Casa3D, Windows e web Android, immagine Docker locale con ui/ riuscite. ZIP/APK storici U42 non ricompilati; nessuna pubblicazione, avvio VM o installazione host/dispositivo. Prove Android/iPhone fisici, tutte le schermate e prestazioni touch generali non eseguite. Evidenze locali in backup/rep016; dettaglio comandi/limiti nel report.

## 2026-11-02 — U42, design condiviso fra workspace

[REP-20261102-005](reports/REP-20261102-005-design-aca-condiviso-workspaces.md): fonte canonica estratta, quattordici CSS equivalenti agli originali dopo i soli import/token neutrali dichiarati, ventuno font/licenza invariati e nuovo entrypoint completo. Test asset autonomi1/1; frontend14file/222test; linter tipografia644file e colori566file, zero violazioni. Frontend e Casa3D build/strict/marchio riusciti, sei bundle Casa3D nei budget; build Docker con cartella design inclusa riuscita.

Quattro viste della webapp costruita prima/dopo: PNG byte-identici e stili effettivi uguali; API owner-required simulata in sola lettura, nessun account o collegamento HA. Client Windows99/99, Android web21/21, smokeIP8/8. Layout/controlli shell:24 casi con componenti React reali come riferimento, tre modalità/quattro stati, font offline e nessun overflow a1281×802/390×846. Casa3D: rigenerazione con205hash upstream verificati, bridge3/3, browser Lit/Shadow DOM30comparazioni con token/font effettivi; nessun viewer/WebGL o hardware fisico in quella prova.

Build Windows/Android web e APK finale riuscite; ZIP Windows e APK con37assetCSS/font confrontati perSHA alla fonte. Immagine solo locale aca-system:design-shared-local; nessun push/installazione/VM. Evidenze in backup/rep015. Le modalità scuro/accento nelle shell sono verificate come CSS, senza introdurre una nuova sincronizzazione delle preferenze native. Limiti Android/iPhone fisici e viewer3D completo conservati; non dedurre collaudo generale dalle verifiche host.

## 2026-11-02 — U39, bootstrap reale HAOS e correzione r2

[REP-20261102-004](reports/REP-20261102-004-prova-bootstrap-su-vm-haos.md): nuovo clone ufficiale HAOS18.4, Core2026.10.4/Supervisor2026.10.5. Script pubblico verificato per SHA nel guest: installa/avvia ACA ma fallisce al QR cercando addon_ invece di app_. Fix minimo e regressione **4/7 → 7/7** (output tool, log non persistito). R2 eseguita due volte dopo rimozione della sola ACA di prova: installazione riuscita, ID/StartedAt del contenitore invariati al secondo giro, due QR reali ricostruiti dai log ANSI e decodificati con ZXing. API health/bundle0.9.33 e owner-required; UI in sola lettura su due viewport, nessun account/mutazione o errore browser. Repository già presente al test correttivo, ACA assente, Matter Server presente: non una seconda prova su catalogo completamente vergine.

R2 pubblicata come quattro nuovi asset nella stessa release0.9.33 con consenso U38; originali sette asset preservati, tutti e quattro i download anonimi r2 e SHA verificati. Nessuna nuova immagine/build/dipendenza. Evidenze `backup/rep014/`, inclusi fallimento originale, candidate-final-audit, qr-audit e download r2.

Primo boot2CPU rallentato dai timer e arrestato forzatamente dopo ACPI senza risposta, soltanto nel clone nuovo privo di dati umani; seconda prova1CPU/2GB con Docker sospeso. Nessun GivenUp nel campione, non una certificazione della stabilità. ACPI finale non ha completato l'arresto: VM **saved**, non poweroff, poi Docker/banco ripristinati; configurazioni delle tre VM precedenti e VDI pulito invariati. QR10.0.2.15 interno NAT, nessun telefono o hardware fisico/H24 collaudato.

## 2026-11-02 — U38, pubblicazione ACA 0.9.33

[REP-20261102-003](reports/REP-20261102-003-pubblicazione-aca-0.9.33.md): immagine GHCR pubblicata, manifest OCI richiesto senza credenziali e SHA dei byte confrontato al digest atteso. Catalogo aggiornato nel commit remoto 6171905ee7c2e82b81c8f28097a935ed1e260b65; tre file raw pubblici confrontati ai locali. Release **v0.9.33 / ID431297617** pubblica e latest, tag sul commit corretto. Sette asset verificati prima dell'uscita e tutti riscaricati anonimamente con SHA identici ai locali/digest GitHub; controllo indipendente di metadata, manifest e checksum riuscito. Tag temporaneo intermedio rilevato e corretto, poi rimosso soltanto quello creato nel lotto con guardia sul commit.

Prima dell'upload, documentazione bootstrap resa durevole e source ZIP rigenerato senza build: 1.577 entry, sola variazione README, confronto completo ai sorgenti riuscito. Nuovo source SHA43bf723a…08b336dd; web/manifest/script/immagine invariati rispetto a U37. Evidenze `backup/rep013/`. Nessun nuovo collaudo app/hardware: mini PC/HAOS, Android/iPhone fisici e H24 restano non verificati; client nativi distribuiti soltanto localmente. I risultati U37 seguenti conservano lo stato della preparazione precedente.

## 2026-11-02 — U37, client IP/QR e registrazione nella webapp

[REP-20261102-002](reports/REP-20261102-002-ripristino-client-mini-pc-e-onboarding-web.md): core144/144, Windows99/99, Android web21/21, Java17/17; strict client/build Windows/Android superati. Backend setup/architettura/proxy56/56; typecheck globale ancora fermo sui duplicati preesistenti fakeHomeAssistant.ts1282/1302, nessun errore nuovo nella porzione. Frontend lotto9file71test, regressione finale webPairing/QR53test e strict/build superati (gruppi sovrapposti, non sommare). Casa3D typecheck/brand/build e lint sorgenti frontend pertinenti riusciti; ESLint backend privo di configurazione, non certificato.

QA reale su HA Container ufficiale **2026.10.4** isolato: **7 stage**, owner web, seconda registrazione409, login, completamento casa, launcher, QR da PNG decodificato e secondo browser mobile già configurato; zero richieste protette prima del completamento e sessione accettata solo dopo. Non è HAOS fisico; endpoint QR fixture simula proxy Android, non LAN/fotocamera reale. MFA verificata nella regressione software. Identità di servizio/dispositivi non certificata da quella QA.

E2E desktop **8 stage** con mini PC simulati, cache/cambio centrale e vecchio flag VM ignorato. Nuovo EXE confezionato aperto realmente sul PC: wizard IP, nessuna password nativa o VM, config/flag invariati. ZIPWindows **129 entry** decompresse e hash confrontati con win-unpacked; motore/VDI assenti. APKdebug/installerNSIS prodotti, installazione NSIS e dispositivi mobili fisici non provati. Build immagini ACA/server e addon0.9.33 riuscite; SQLite nativa e bundle servito dall'immagine verificati.

Bootstrap HAOS: **5/5 test con stub**, sintassi/dry-run e helper QR reali nell'immagine riusciti; controllo catalogo corretto a `version_latest` dal contratto Supervisor2026.10.0, test fresh con `version:null`. Bundle client: test del contratto/lettore ZIP1/1 e checksum dei sei asset pubblicabili superati. Nessun download/esecuzione dello script su HAOS reale o flash. Checkpoint ZIP/VDI/VMDK preesperimento immutati; QA/container temporanei arrestati normalmente. Immagine e release **solo locali**, non pubblicate. Evidenze sotto `backup/rep012/`, guida in [client mini PC](riprogettazione/blocchi/01-mini-pc-client-e-onboarding-web.md).

## 2026-11-02 — U36, checkpoint e ritorno documentale al mini PC

[REP-20261102-001](reports/REP-20261102-001-ritorno-mini-pc-e-accesso.md), [ADR-0031](decisions/ADR-0031-ritorno-mini-pc-client.md). Creata copia locale di **1.946 file**, inclusi tracked e untracked pertinenti, senza cache/dipendenze/build/credenziali; ZIP **9.040.541 byte**, SHA-256 **`09a8e147dd8612ae0c1e755361a4c4dcbbd2f201b8d5d342bafc4d40ebeded18`**. Tutte le entry decompresse e confrontate con SHA-256; fonti rilette prima degli aggiornamenti documentali successivi, `tar -tf` exit 0. Manifesti/Git HEAD/status/diff e RIPRESA.md nella cartella ignorata `backup/checkpoints/2026-11-02-pc-vm-accantonato/`. Non è un'immagine completa del workspace e non include i dischi grandi, mantenuti separatamente.

Hash odierni del VDI operativo, clone VMDK e ZIP PC/VM corrispondono ai riferimenti precedenti; nessuna VM running osservata. VMware assente dai percorsi/registri verificati, nessun benchmark eseguito. Ricostruzione auth dal codice e fonti primarie HA; scelta webapp ancora proposta. Nessun codice/configurazione/servizio prodotto modificato e nessuna prova di mini PC, login o distribuzione eseguita in questo passaggio documentale. Il ripristino del client IP non è verificato né dichiarato implementato.

## 2026-10-30 — U34, prova dopo riavvio completo Windows

Fonte umana «riavviato», boot effettivo verificato alle **17:28:53 Europe/Rome**; [report010](reports/REP-20261030-010-rallentamenti-vm-windows.md#ripresa-u34-dopo-riavvio-windows-2026-10-30). VirtualBox 7.2.22r175245, stessa VM/disco e baseline default/KVM, CPU4/4096 MB/HPET off. EXE corrente pronto sul modulo proprietario vuoto in **53,645 s**, chiuso senza creare account.

| Verifica | Esito osservato |
|---|---|
| Idle senza app, collector HTTP, tick guest o debugger periodico | **300,016 s** monotoni host; helper exit 0 |
| Clock ai due confini, letture non atomiche di circa 56–64 ms | Virtual +300,099272 s; Real +300,100 s; **VirtSync solo +120,311255 s** |
| Log nuovo rispetto al prefisso iniziale identico | Catch-up abbandonato **179,789609 s**, heartbeat mancante **179 s**, poi alive |
| Console guest dopo idle | Watchdog timeout systemd-resolved (limite 3 min) e terminazione anomala systemd-journal osservati nello screenshot |
| Arresto normale `host shutdown` | **Poweroff confermato alle 17:41:08**, nessuna forzatura |
| Integrità e perimetro | Hash delle due configurazioni VM storiche invariati; zero VM running e processi ACA al controllo finale; manager confezionato identico alla baseline SHA 5b3fa92f…; nessun account, ripristino disco o modifica a codice/protezioni |

**Non superato il criterio di affidabilità:** il riavvio non elimina il difetto in questo campione. Nessun secondo cold necessario per attestare questo esito negativo; non è una prova di causa unica o di fallimento universale. `GivenUp` iniziale non esposto, quindi nessun delta inventato; il valore finale è 179,789609 s. La lettura finale può rendere visibile il recupero e non data automaticamente l'inizio dell'anomalia. Dati e calcoli indipendenti concordanti in `backup/rep010/postreboot-20261030/`. Controlli applicativi non rieseguiti: nessun codice prodotto cambiato. H24 e Safari/iPhone fisico restano non eseguiti; ISSUE-129 aperta.

## 2026-10-30 — U33, aggiornamento VirtualBox e prove successive

Autorizzazione umana e procedure nel [report010](reports/REP-20261030-010-rallentamenti-vm-windows.md#ripresa-autorizzata-u33-2026-10-30). Installer ufficiale verificato nuovamente, backup delle configurazioni e registri, upgrade a **7.2.22r175245** riuscito con exit 0; log MSI return 0. Nessun riavvio richiesto o eseguito. Tre configurazioni VM identiche dopo l'installazione, UUID/disco/marker e sicurezza preservati; VM storiche non avviate.

| Verifica reale | Esito |
|---|---|
| Primo cold boot da EXE, owner form vuoto | Riuscito, 59,134 s |
| Riapertura con motore attivo | Riuscita, 2,887 s |
| Secondo cold boot da EXE, owner form vuoto | Riuscito, 53,769 s |
| HTTP seriale nel primo run | 473/473 risposte 200; p95 7,891 ms, massimo 26,045 ms |
| Clock guest su 300 tick/335,399 s | Rapporto con host monotono 0,999973; nessun reset; finestra più breve di quella HTTP |
| Affidabilità dei timer/background | **Non superata:** lag TM anche durante traffico sano e heartbeat mancanti in idle; nel secondo run recupero di 154,576 s |
| Due domini VMM su intervallo idle di 90,112 s | Virtual/Real avanzano circa 90,112 s, VirtSync soltanto 0,036735 s; nessuna interpretazione dei TSC per CPU soggetti a wrong-EMT |
| Tentativo QoS reversibile | **Non applicato:** guardia identità fermata e accesso SET_INFORMATION negato da Windows (errore 5); nessun aggiramento/elevazione o policy cambiata |
| Arresto finale | Normale, VM ACA poweroff confermato; nessun account creato dalle prove, nessun codice prodotto modificato |

L'aggiornamento è stato effettuato, ma il problema VM **non è risolto**. La prontezza della UI e HTTP sani non certificano le scadenze dei timer. Prossimo confronto dopo riavvio completo di Windows eseguito dall'utente dopo avere salvato il lavoro; non è un riavvio richiesto dall'MSI né una correzione già dimostrata. Non eseguiti H24, prova dopo riavvio Windows o Safari/fotocamera iPhone. Helper/sonde terminati, log sotto `backup/rep010/`; nessun test unitario applicativo rieseguito perché U33 non modifica il codice.

## 2026-10-30 — Prima di U33, compatibilità VM e QR web, REP-20261030-010

Perimetro umano U31-U32, procedure e limiti nel [report corrente](reports/REP-20261030-010-rallentamenti-vm-windows.md). Nessuna attestazione su Safari/fotocamera fisici, CI o stabilità H24.

- **Esperimenti VM ritirati:** None configurato/effettivo e migrazione hanno prodotto campioni riusciti, inclusi owner in 84.049 ms da spenta e 2.230 ms a caldo. I relativi 114/114 test Windows e strict erano verdi, ma i riavvii reali successivi hanno smentito l'affidabilità. Nessun timer/affinità sperimentale è distribuito. Dopo il rollback: **100/100 Windows**, strict/build superati e manager compilato identico byte per byte alla baseline, SHA-256 `5b3fa92f6e5a29a267992a8fb2eb80b1b2c0d2772fa8befe140074b76a2c198a`.
- **Misure locali:** baseline KVM 342 risposte HA/zero errori/p95 4,55 ms; None a regime 342/zero/p95 9,909 ms, separate dalle 55 richieste prima del primo ready. Prima osservazione None oltre 14 minuti con 7 min 41 s senza sonde; seconda 23 min 54 s, compresa ricostruzione Docker, senza nuovi catch-up o segnalazioni di guest non responsivo. Anche il riavvio KVM breve era pulito: causa unica e continuità prolungata restano non dimostrate. Host Hyper-V/NEM e sicurezza inalterati.
- **Contratto QR e file:** core 133/133, Android web 18/18, Java 16/16; frontend 100/100 nei sette file pertinenti e backend pairing 8/8, con controlli strict/lint pertinenti riusciti. Provati via software formato web/legacy, rimozione del frammento e nessun consumo all'apertura, gate prima del login/sync, import autenticato e sanitizzazione portabile. Questi gruppi includono regressioni condivise: non sommarli come copertura unica.
- **Build e materiali conclusivi:** frontend/Casa 3D e Windows riusciti; ZIP **711.762.334 byte**, SHA-256 **`163e92868e664aaccea3d048b551f9cd4b8a1cbf7fc4b7ebd2c7e5023ca605c7`**, 7-Zip `t` exit 0 dopo la fine del confezionamento. APK debug 7.684.685 byte, SHA-256 `8870ad539ea75b0b0d4fd59d27923bdf39b1a1d0a750034f47716f52781112e7`, sync/assemble riusciti; nessuna installazione mobile. Il sorgente del servizio guest resta SHA-256 5ba828… del report, identico alla QA funzionale. Confezionamento conserva il runtime Electron originale; nessuna firma/distribuzione su altri PC attestata.
- **Limite preesistente:** il typecheck backend globale resta fallito per il duplicato `subscription` in `fakeHomeAssistant.ts` alle righe 1282/1302. Non viene corretto da questo incarico.

**Controevidenza emersa nei riavvii successivi:** None/4 CPU con HPET off ha poi avuto un cold boot bloccato prima del proprietario. HPET on raggiunge HA ma produce tempo guest accelerato, watchdog e heartbeat mancanti: prova scartata. Nessun profilo viene quindi dichiarato risolutivo sulla base dei campioni sani precedenti; diagnosi ulteriore in corso nel report.

**QA browser completa riuscita nella terza esecuzione:** 14 stage, QR reale account/copia/dopo import decodificati dai PNG, gate senza consumo prima della scelta e senza ponte nativo, login personale e sincronizzazione bidirezionale tema/accento. Scaricato file layout ACA di 10.730 byte e importato nel PC autenticato, con utente/sessione e houseId invariati; screenshot mobili ispezionati. Storage/cache puliti e app chiusa. Evidenze selezionate e limiti nel report; due sessioni host non attestano due case fisiche o Safari sull'iPhone. La prima finestra P-core era sana (clock guest/host 0,999976; 264 HTTP/zero errori/p95 2,792 ms), ma secondo cold boot e shutdown hanno mostrato ulteriori pause: starter scartato e archiviato fuori dal prodotto.

**Stato conclusivo delle operazioni autorizzate:** disco della sola VM ACA ripristinato/verificato al checkpoint senza owner QA, provider default/KVM, 4 CPU/4096 MB/HPET off, poweroff. Hash delle due configurazioni VM storiche invariati, stato aborted precedente conservato. Sonda host terminata. Installer ufficiale VirtualBox 7.2.22 verificato per checksum/firma Oracle e configurazioni copiate: **non eseguito**, autorizzazione all'aggiornamento host richiesta. Rallentamenti non risolti, ISSUE-129 aperta; nessuna modifica della sicurezza Windows.

## 2026-10-30 — Windows con VM locale, design condiviso e client QR

Evidenze e perimetro U27-U30 in [REP-20261030-009](reports/REP-20261030-009-windows-vm-automatica-design-condiviso.md); sorgenti, APK e limiti nella [scheda design/Android](riprogettazione/blocchi/02-design-e-qr-client-implementazione.md), percorso d’uso nella [guida alla prova dell’app](riprogettazione/blocchi/01-pc-vm-prova-app.md). Gli esiti sotto sono quelli delle esecuzioni locali della sessione: questa nota non introduce nuove prove. QR/Sistema e integrazione reale sono riportati dal rispettivo agente e dal coordinatore nel report; non attestano CI o compatibilità generale.

- **Test e build riusciti:** Windows **100/100**, core **86/86**, Android web **17/17**, Java **16/16**, design **48/48**; controlli strict pertinenti dei client/frontend, build frontend e Casa 3D riusciti. Per Windows il comando è `vitest run --dir src`, evitando di raccogliere i test dei sorgenti backend copiati nello staging `.tmp`. La build dell’APK non equivale alla prova su dispositivo.
- **QR e regressioni frontend:** QR/handoff/sincronizzazione **11/11**, Sistema/Aspetto/testi QR **33/33**, secondo le esecuzioni documentate nel report. I gruppi condividono alcuni test: non sommarli come copertura unica. Collega account richiede l’identità personale della stessa casa; Importa layout conserva casa/sessione del destinatario e copia l’interfaccia senza collegare i dispositivi o seguire le modifiche dell’amico.
- **Smoke Windows riuscito, 18/18:** GitHub finto, mini PC finti su `127.0.0.3`, HA finto su `127.0.0.2`, profilo temporaneo separato. Provati avvio, errori, cache, cambio impianto, onboarding via ACA e ponte della UI con la sola lettura `pairingEndpoint`. Il primo tentativo aveva incontrato l’HA reale sul loopback usato dal vecchio test; si è fermato prima di inviare credenziali o modifiche. La ripetizione riuscita usa gli indirizzi isolati indicati.
- **Integrazione reale sul PC di prova:** il coordinatore ha provato avvio della VM ACA headless posseduta dall’app, HA OS 18.4/Core 2026.10.4, proprietario temporaneo e dati casa nelle schermate ACA, installazione/avvio dell’app locale 0.9.31 e login alla UI ACA. Non è stata richiesta la UI HA all’utilizzatore. VirtualBox 7.2.4 era già installato: non è una prova su PC pulito o senza prerequisito.
- **QR e due sessioni reali host:** generazione del QR, accettazione via LAN delle due modalità e rifiuto del riutilizzo dell’invito; fra due finestre Electron con partizioni separate e stesso utente QA sono stati osservati tema, accento e sfondo predefinito condivisi. La foto personale non è stata provata. Finestre mantenute attive per il test: nessuna attestazione su sospensione, continuità H24 o tempi garantiti. Android fisico, camera, permessi, WebView e percorso PC–tablet rimangono non eseguiti. I rendering Electron del client usano il plugin nativo simulato.
- **Confezionamento e controllo finale Windows:** il primo candidato è stato bloccato da Device Guard. La variante finale usa `asar=false` e `signAndEditExecutable=false`, conservando byte per byte il runtime Electron originale non firmato; nessuna policy Windows modificata. EXE finale aperto, avvio della stessa VM da poweroff e schermata ACA del proprietario vuota verificati. Onboarding user=false e backend fermo prima dell'owner, dopo riallineamento manuale delle opzioni iniziali e ricostruzione dell'app locale. App chiusa, VM lasciata running. ZIP finale 711.756.828 byte, SHA-256 `4bd8511d7123a825ba8921cae743d2498dae27b93bb0a093c4acafa2501f21d6`; 7-Zip `t` exit 0, Everything is Ok. Firma/distribuzione su altri PC e stabilità prolungata restano aperte.
- **Limite aperto:** il typecheck backend non è superato per due dichiarazioni preesistenti di `subscription` in `backend/src/__tests__/fakeHomeAssistant.ts` (righe 1282 e 1302 nell’esecuzione registrata). Il report non documenta un esito positivo successivo. Nessun accesso remoto/Cloud o motore HA Android è stato implementato in questo incarico.

## Criteri per gli esiti

**2026-10-14 — kit Widget adattivo:** [REP-20261014-004](reports/REP-20261014-004-widget-adattivi-gesti.md): 25/25 test pertinenti, typecheck/lint/tipografia/colori/formato/build superati. Browser senza GPU: 20 concept × quattro dimensioni × 390/1280/1920 px, gesti luce, dettagli/configurazione, capacità differenti, ordine/visibilità, stati simulati e focus. Pagina scorre con tutte le capacità selezionate; card piccole si adattano. Nessuna prova sui dispositivi HA reali, suite completa, aggiornamento banco o test con dito.

**2026-10-14 — galleria design Widget:** [REP-20261014-002](reports/REP-20261014-002-design-widget-kit.md) registra 3/3 test pertinenti, typecheck/lint/tipografia/colori e build superati. Chromium senza GPU a 390 e 1280 px: 25 card, filtro categorie e assenza di overflow dei contenuti misurati; dati e controlli simulati. Nessun collaudo di prodotto, aggiornamento del banco o prova tablet.

**2026-10-14 — vassoio Widget stabile e animato:** verifiche locali superate in [REP-20261014-001](reports/REP-20261014-001-vassoio-stabile-animato.md): typecheck, lint, tipografia/colori, formato dei file toccati, 85/85 test pertinenti con quattro processi. Chromium senza GPU a 390/1280/1920 px: altezza costante per categorie/risultati vuoti, tessere 104 × 128 px, misure intere, filtro rapido e movimento ridotto. Aggiunta via tastiera, clic e trascinamento provata nella preview. Non eseguiti suite completa, aggiornamento banco e prova sul tablet.

Un controllo è **Superato** soltanto con procedura realmente eseguita ed evidenza; **Fallito** quando l'esito non soddisfa il criterio; **Non eseguito** quando è soltanto previsto. Ogni evidenza identifica data, versione/commit o ambiente osservato, comando/procedura e limiti. Un test documentale non collauda l'applicazione.

**2026-10-26 — app client, C1 e C4 ([REP-20261026-002](reports/REP-20261026-002-app-client-pc-android.md), [ADR-0023](decisions/ADR-0023-app-client-a-ibrida.md)):**
- **C4, nucleo del guscio in `progetto/client/core`:** `npm test` con Vitest 5.0.0 dà 47/47 test superati (3 file). `npm run typecheck` con tsc 7.0.2 strict è superato. Ambiente: Node 24.14.0, Windows 11.
  - Coperti: indirizzo e porta, versioni, manifesto, SHA-256, `/api/health`, scelta dell'ultima versione o dell'ultima compatibile (`minServer`, `minShell`), cache senza rete, archivio alterato, procedura guidata.
  - Rete, disco e GitHub sono simulati: nessuna prova con GitHub reale, Electron, Android o il banco.
- **C1, verifica in sola lettura dei file da pubblicare (`progetto/acasystem`, 1316 file tracciati più 4 non tracciati di altri flussi):** nessun segreto reale né dato sensibile; le credenziali dei test sono fittizie.
  - Da decidere: 2 link a `../../documentazione`, circa 1033 rimandi ADR/REP/ISSUE nei commenti, 3 percorsi `../../../backup` negli e2e, il nome «Mattia» nelle fixture, 5 immagini da guardare.
  - Limiti: ricerca per schemi, non uno scanner dedicato; immagini non aperte; insieme dei file da ricontrollare prima dell'istantanea.
- **C1 applicata:** 120/120 test nei 7 file toccati; typecheck strict, lint e `node --check` sui 3 e2e superati. Gli e2e non sono stati eseguiti.
- **C5, guscio Windows (Electron 44.7.0):**
  - test unitari: nucleo 49/49, Windows 20/20, typecheck strict superato;
  - `npm run check:smoke`: 8/8 passi con finto GitHub e finto mini PC su 127.0.0.1;
  - **`npm run dist` fallito:** Smart App Control blocca lo stub NSIS non firmato (Code Integrity, eventi 3033 e 3077); `--win dir` è riuscito e `Acasystem.exe` si avvia;
  - non provati: GitHub reale, Acasystem vera, banco, un PC pulito.
- **Zip per il pilota Windows:** `npm run dist:zip` superato.
- **C6, guscio Android (Capacitor 8.5.3):**
  - test web 6/6 e typecheck superati;
  - JUnit 12/12 (`BundleStoreTest`, `LocalServerTest`);
  - `assembleRelease` superato con APK firmato `CN=MeMo Srl` e verificato con `apksigner`;
  - lint senza errori;
  - **nessuna prova su un dispositivo** (al momento del build).
- **C6 sul Tab M11, superato dopo 2 correzioni:**
  - corretti `@capacitor/core` mancante nella pagina e la scorciatoia ad app aperta;
  - provati procedura guidata, IP pubblico, mini PC che non risponde, porta di HA, IP incollato dalla barra di HA, salvataggio, riavvio e «Cambia indirizzo»;
  - non provata l'interfaccia scaricata (manca il primo rilascio).
- **REQ-19, widget «Rileva dispositivi» (REP-20261026-006, 2026-10-27):**
  - test superati: server 32 file, 505 test (1 saltato); frontend 216 file, 3294 test, più 4 test della Samsung (`TvSamsung.test.tsx`); typecheck, lint, tipografia e colori superati;
  - prova reale sulla copia della VM a ponte sulla rete di casa (HA 2026.10.4):
    - il widget elenca i dispositivi di HA non collegati e apre il widget TV già collegato;
    - il comando WS `config_entries/flow/progress` sostituisce il GET REST, che risponde 405;
    - la Samsung UE50J6200 non si fa scoprire: la sua scheda SSDP sulla porta 7676 non risponde;
    - la TV è stata aggiunta per indirizzo con il PIN, scritto in chat dall'utente e inviato dall'agente; poi widget TV dal «+»;
    - spegnimento (`KEY_POWER`), volume e muto funzionano; l'accensione no (TV in Wi-Fi);
  - non provati: PIN inserito dalle schermate F4, «Rimuovi dispositivo», passi `external`/`menu`/`progress` su HA reale, Dell.
- **S4-S5, installazione automatica dall'app (REP-20261026-005, 2026-10-26):**
  - test superati: nucleo 61, Windows 21, Android web 7; end-to-end Windows 18/18 con finto HA OS;
  - prova reale sulla copia della VM `acasystem-ha-s45`: account creato dall'utente nell'app, onboarding di HA 4/4, app Acasystem 0.9.30 installata e avviata, interfaccia aperta, accesso riuscito. Servite 2 «Riprova» (VM lenta) e un riavvio dell'app di HA OS (porta di HA non letta, ripiego su 8123);
  - poi pubblicata l'app di HA OS 0.9.30.1 (rilevamento di HA corretto), aggiornamento da HA OS riuscito sulla copia della VM;
  - Tab M11 via USB, dall'istantanea «HA senza account»: account, onboarding 4/4, installazione della 0.9.30.1 e apertura di «Accedi ad Acasystem» senza «Riprova», in circa 11 minuti; porta di HA trovata al primo colpo. Dell e Wi-Fi diretta non provati.
- **App client, dati del browser al cambio di mini PC (REP-20261026-005):**
  - test superati: nucleo 51, Windows 21, Android web 6, JUnit 13;
  - prova end-to-end Windows 11/11, e fallisce se si toglie la pulizia;
  - Tab M11: dato conservato con lo stesso impianto e cancellato con un impianto diverso.
- **S2-S3, pubblicazione e installazione da HA OS (REP-20261026-005):**
  - immagine pubblica su GHCR, file del repository e zip dei sorgenti verificati;
  - sulla VM `acasystem-ha`, dalla console: repository aggiunto, app `9960cdb4_acasystem` 0.9.30 installata e avviata, porta di HA letta dal Supervisor (80), `/api/health` e `/ha/auth/providers` 200 dal PC sulla rete host-only;
  - incidente: la VM si è riavviata da sola durante l'installazione (poca RAM sul PC);
  - prova dal Tab M11 non eseguita: il tablet era su un altro ripetitore Wi-Fi.
  - **Poi superata via USB** (la Wi-Fi non lascia arrivare il tablet alla VM): l'app di rilascio scarica la release da GitHub, apre l'accesso servito dall'app di HA OS; dopo il login dell'utente WebSocket persistente, «Sincronizzato», versione 0.9.30, Casa 3D aperta (database nuovo, vuoto).
- **S1, app di HA OS 0.9.30 (REP-20261026-005):** immagine `ghcr.io/acamemo/acasystem:0.9.30` costruita sopra `aca-system:0.9.30`. Superate le prove locali in 3 modalità (app di HA OS con finto Supervisor e HA del PC, senza Supervisor, come il banco) e il rilevamento della porta (80, 401, Supervisor spento). Non pubblicata; installazione reale da HA OS non provata.
- **«Cambia indirizzo» in Sistema → Collegamento, solo nell'app:**
  - frontend: 38/38 test, typecheck, lint, formato, tipografia e colori superati;
  - prova end-to-end Windows 9/9;
  - Tab M11 (build di debug): user agent e intercettazione verificati;
  - il pulsante arriverà con la prossima release di Acasystem.
- **C3 pubblicata dall'utente e verificata:** release `v0.9.30` su `acamemo/acasystem-releases`, SHA-256 coincidente. Sul Tab M11 l'APK di rilascio scarica la release e apre la pagina di accesso con il banco 0.9.30. Login non provato.
- **C3, release v0.9.30 preparata** dall'immagine del banco (117 file, 3,2 MB). Con il guscio Windows, un finto GitHub e il banco vero: pagina di accesso, `/api/health` 0.9.30 e WebSocket HA `auth_required`. Non pubblicata; login non provato.

**2026-10-25 — ottimizzazione della coreografia 0.9.28, opzione B ([REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md)):** tre giri di correzioni (K1-K5, K6a, D1, D2, W1-W3, J1) e tre misure sul Tab M11 con gesti sintetici CDP, 5 giri alternati più il giro 0, contro la 0.9.27 (`dist-banco-0.9.27`); build `backup/v0928/dist-g3`. Controlli statici superati: typecheck strict, `eslint src`, `lint:typography` (0 violazioni, 522 file), `lint:theme-colors` (0 violazioni, 343 file); Vitest `--maxWorkers=4`, suite completa 203 file e 3064 test superati; build Vite riuscita. **Esito della misura: obiettivo non raggiunto** (aggiornato dopo il giro 4: vedi la sezione «0.9.28, quarto giro» più sotto); dopo il giro 3 restano peggiori della 0.9.27 JUMP (somma 262 contro 195 ms, numero 3 contro 2), il task singolo prima della scena all'apertura (+7-11 ms), la somma dei task all'uscita da Sistema (290 contro 264 ms) e il rilascio nel volo in S3cD (blocco 90 contro 0 ms); la dissolvenza di entrata in Sistema è peggiore ma accettata dall'utente il 2026-10-25. Non eseguiti: prova col dito dell'utente, TalkBack, nuovo banco, e2e; le misure sintetiche non sostituiscono la prova a video. Nessun commit.

## Controlli documentali

I controlli DOC-01–DOC-06 riportano gli esiti alla chiusura di REP-20261002-002, prima del trasferimento delle cartelle. Conteggi e numero dei commit riferiscono quella versione del repository. I controlli successivi sono registrati separatamente.

| ID | Criterio | Esito alla chiusura di REP-20261002-002 | Evidenza |
|---|---|---|---|
| DOC-01 | Originale acquisito e copia uguali byte per byte; SHA-256 registrato | Superato, 2026-10-02 | Confronto dei byte con i due blob del primo commit e hash nel [report REP-20261002-002](reports/REP-20261002-002-documentazione.md). |
| DOC-02 | Link locali e ancore validi; REQ-00–REQ-16 presenti e tracciabili | Superato, 2026-10-02 | 16 file Markdown, 80 link locali, 17 requisiti/criteri/scenari e 14 problemi; esito nel report. |
| DOC-03 | Stati reali, ipotesi e proposte distinti; nessuna approvazione tecnica inventata | Superato, 2026-10-02, revisione documentale | Solo ADR-0001 accettata; requisiti applicativi Proposti/Non iniziati; evidenze e scenari futuri distinti. |
| DOC-04 | Un lettore senza chat ricostruisce incarico, stato e punto di ripresa | Superato, 2026-10-02, revisione documentale | Percorso README → AGENTS → stato → report/ADR; non è un test eseguito da un secondo modello. |
| DOC-05 | File modificati dentro il perimetro; controlli di segreti e regole Git | Superato, 2026-10-02 | Revisione dei 17 file staged, diff senza errori di whitespace, controlli di esclusione e ricerca di firme comuni di segreti. |
| DOC-06 | Due commit coerenti; originale preservato; repository locale senza remote | Superato, 2026-10-02 | Due commit, 18 file versionati, nessun remote, working tree pulita e hash del blob archiviato coincidente; esito nel report. |

I controlli finali usano comandi locali e una verifica temporanea dei documenti. Non costituiscono una pipeline CI o un validatore permanente.

### Riorganizzazione delle cartelle — 2026-10-02

Evidenze e limiti nel [report REP-20261002-003](reports/REP-20261002-003-organizzazione-cartelle.md).

| ID | Criterio | Esito | Evidenza |
|---|---|---|---|
| DOC-07 | Originale integro; link e identificativi validi dopo il trasferimento | Superato, 2026-10-02 | 21 Markdown, 121 link locali, archivio identico ai byte originali e SHA-256 invariato; 17 REQ/AC/V e 14 ISSUE validi. |
| DOC-08 | Tre aree con istruzioni reperibili; contenuto del PRD conservato | Superato, 2026-10-02 | PRD invariato salvo percorsi dei link; istruzioni in radice; backup/progetto con il solo README; revisione del percorso di lettura. |
| DOC-09 | Backup esclusi, archivio versionabile senza conversione, diff limitato | Superato, 2026-10-02 | 23 file versionati, sei casi di esclusione verificati, attributo `text: unset`, archivio staged uguale all'originale e diff coerente senza errori di whitespace. |
| DOC-10 | Commit locale di riorganizzazione; due commit iniziali preservati | Superato, 2026-10-02 | 3 commit, 23 file versionati, due commit iniziali preservati come antenati diretti, working tree pulita, 0 remote e archivio versionato integro. |

### Direzione del pilota — 2026-10-05

Evidenze in [REP-20261005-001](reports/REP-20261005-001-direzione-pilota.md). Gli esiti DOC precedenti restano quelli delle rispettive versioni storiche.

| ID | Criterio | Esito | Evidenza |
|---|---|---|---|
| DOC-11 | Originale integro, ID conservati, link e matrici validi | Superato, 2026-10-05 | 24 Markdown, 18 REQ/AC/V, 15 ISSUE; priorità originali conservate, stati coerenti e originale integro. Conteggio finale dei link nel report. |
| DOC-12 | Direzione umana tracciata, fase minima distinta dalle estensioni e dalla realizzazione | Superato, 2026-10-05, revisione documentale | Risposte e ADR-0003 tracciabili; fase minima grafica, ruoli/estensioni e dettaglio tecnico distinti. Nessun risultato applicativo inventato. |
| DOC-13 | Diff documentale, storico conservato e commit locale coerente | Superato, 2026-10-05 | 15 file Markdown modificati/aggiunti, 26 file versionati, 4 commit con storico preesistente preservato, working tree pulita, 0 remote e archivio versionato integro; esclusioni dei backup conservate. |

### Moduli funzionalità e design — 2026-10-05

Evidenze e limiti in [REP-20261005-002](reports/REP-20261005-002-moduli-documentali-design.md). La separazione documentale non cambia requisiti o stato degli scenari applicativi.

| ID | Criterio | Esito | Evidenza |
|---|---|---|---|
| DOC-14 | Originale integro, requisiti e stati preservati | Superato, 2026-10-05 | Confronto byte/hash con il primo commit; 18 righe REQ e ID REQ/AC invariati, stati dei requisiti identici al commit di partenza. |
| DOC-15 | Moduli distinti, fonti e collegamenti validi | Superato, 2026-10-05 | 28 Markdown; verifica temporanea delle destinazioni e ancore locali. Indici di funzionalità e design, fonte visiva unica design.md e documenti comuni. |
| DOC-16 | Diff pertinente e storico preservato | Superato, 2026-10-05 | Diff senza errori di whitespace; quattro report storici preservati salvo destinazioni di link annotate; progetto e backup con i soli README, nessun codice o installazione aggiunti. |

Le verifiche UI di design.md sono previste e Non eseguite. I calcoli numerici dei colori rimangono evidenze limitate del report precedente; nessuna conformità del frontend è dichiarata.

### Raccolta componenti e microinterazioni — 2026-10-05

Evidenze e limiti in [REP-20261005-003](reports/REP-20261005-003-raccolta-componenti-microinterazioni.md). Il [catalogo](design/componenti/README.md) contiene reference originali, senza adattamenti o prove UI.

| ID | Criterio | Esito | Evidenza |
|---|---|---|---|
| DOC-17 | Sette originali e acquisizione verificabile | Superato, 2026-10-05 | Sette ID/file/hash; sei porzioni contigue ricostruiscono la cattura inline di 14.602 byte, Wi-Fi identico ai 5.027 byte dell'allegato. Originali/fonti con attributo text: unset. |
| DOC-18 | Catalogo, fonti, specifiche e link coerenti | Superato, 2026-10-05 | 30 Markdown, destinazioni e ancore locali verificate; principale UI-001 e animazione UI-007 identificati, autore/URL/licenza sconosciuti, dipendenze dichiarate separate dall'adozione. |
| DOC-19 | Perimetro e storico preservati | Superato, 2026-10-05 | Archivio originale integro, cinque report storici invariati, 18 righe REQ e stati preservati, progetto/backup invariati. Revisione documentale e diff; nessuna installazione o nuova dipendenza. |

L'identità byte per byte del testo inline è verificata rispetto alla cattura acquisita dal messaggio, non a un file sorgente esterno inesistente. Le verifiche del design e del collegamento HA restano Non eseguite. Gli originali conservano anche spazi e colori della fonte; non vengono corretti per superare controlli di stile.

## Scenari di prodotto previsti

**Gli scenari applicativi attivi sono Non eseguiti; V-01 è Non applicabile perché REQ-01 è Ritirato.** V-00–V-17 conservano la mappatura dei requisiti, incluso quello ritirato. Criteri da precisare nell'incarico pertinente; nessun ambiente applicativo è disponibile. La fase 1 è delimitata in [pilot-scope.md](funzionalita/pilot-scope.md).

| ID | Requisito | Scenario proposto e risultato atteso |
|---|---|---|
| V-00 | REQ-00 | Inventario dell'ufficio, Linux 64 bit ARM64/x86-64, client e dispositivi scelti; prove pertinenti e ambito fisico documentati. |
| V-01 | REQ-01 | Non applicabile al piano corrente: provisioning Hetzner Ritirato in ADR-0003; scenario storico nell'archivio/Git. Non è un controllo superato. |
| V-02 | REQ-02 | Frontend locale, stati/comandi e automazioni selezionati senza internet, inclusi riavvio client/gateway e riconnessione; dipendenze cloud identificate. Remoto nel suo incarico. |
| V-03 | REQ-03 | Confronto grafico delle schermate concordate, copertura delle funzioni HA, stati/comandi e riconnessione; base Tunet, versioni e condizioni di distribuzione verificate. Per la futura UI: temi chiaro/scuro con arancione, microinterazioni, stato attivo stabile, movimento ridotto e alternativa al trascinamento; dove incluso, anteprima dell'icona/percentuale e luce reale durante il gesto, invii limitati e conferma HA. Non eseguito. |
| V-04 | REQ-04 | Login Google/email autorizzati, account email non verificato rifiutato e sessione scaduta gestita secondo il progetto approvato. |
| V-05 | REQ-05 | Credenziali accettate dal gateway, associazione corretta, rinnovo/revoca e rifiuto dell'accesso a un altro impianto; comportamento offline definito. |
| V-06 | REQ-06 | Sessione admin aperta solo per il primo setup, configurazione, logout e login cliente; nessun privilegio admin residuo e rifiuto delle operazioni non autorizzate anche via API. |
| V-07 | REQ-07 | Abilitazione/revoca dei moduli rispettata dai punti di autorizzazione; comandi vietati rifiutati anche con UI modificata. |
| V-08 | REQ-08 | Sincronizzazione riuscita, client/gateway disconnesso ed errore parziale; versione e stato effettivo visibili, recupero secondo il progetto scelto. |
| V-09 | REQ-09 | Formati ammessi, caricamento invalido e accessi; piantina coerente su viewport approvati senza alterare le coordinate relative. |
| V-10 | REQ-10 | Posizionamento persistente, ridimensionamento e comandi sul dispositivo corretto; entità rimossa gestita senza comandare un'altra entità. |
| V-11 | REQ-11 | Richiesta trasformata in bozza ispezionabile, intenti ambigui chiariti, assenza di attivazione prima dell'approvazione. |
| V-12 | REQ-12 | Modello e licenza identificati, carico/contesto e concorrenza dichiarati nel benchmark; timeout e indisponibilità gestiti. |
| V-13 | REQ-13 | Entità inesistente, schema invalido e azione fuori limiti rifiutati; correzioni visibili al revisore, scenario attivato uguale a quello approvato. |
| V-14 | REQ-14 | Ricerca/tag, associazione agli impianti e versioni; distribuzione della versione approvata e comportamento con dispositivo non disponibile. |
| V-15 | REQ-15 | Associazione tablet e kiosk, riavvio senza internet, sessione scaduta e ritorno della rete; nessuna concessione implicita di privilegi tecnici. |
| V-16 | REQ-16 | Valutazione R&D separata con compatibilità/prestazioni misurate sui dispositivi scelti; esito documentato prima di una decisione sul 3D. |
| V-17 | REQ-17 | Amministratore condominiale configura dispositivi comuni autorizzati; configurazione dei dispositivi privati rifiutata anche via API. Letture/comandi secondo la policy da approvare. |

## Banco prova Tunet — 2026-10-05

Evidenze in [REP-20261005-004](reports/REP-20261005-004-installazione-tunet.md), Tunet 1.22.1 / HA 2026.9.4. Questi controlli non completano V-02/V-03/V-05 né certificano la grafica ACA.

| ID | Controllo | Esito | Evidenza e limiti |
|---|---|---|---|
| ENV-01 | Acquisizione sorgenti e configurazione Compose | Superato | 407 file confrontati byte per byte con l'estrazione upstream; impronte in tunet-origin.json. docker compose config --quiet valido. |
| ENV-02 | Build e avvio locale | Superato | npm ci/build nel Dockerfile upstream; container healthy, porta 127.0.0.1:3002, /api/health 200 e versione 1.22.1. |
| ENV-03 | Pagina e asset iniziali | Superato | HTTP 200 per pagina e 22 JS/CSS referenziati; dashboard visibile nel browser. Non è un audit di tutti gli asset o delle schermate. |
| ENV-04 | Rete e autenticazione di base | Superato | Challenge HA auth_required dal container; /api/profiles senza credenziali restituisce 401. Utente completa OAuth; System → Connection mostra CONNECTED / Authenticated via OAuth2. Nessuna credenziale nel report. |
| ENV-05 | Profili e persistenza predisposta | Superato, controllo parziale | Volume Docker montato in /app/data; UI profili senza errore, auto-sync attivo e ultima sincronizzazione visibile. Salvataggio/caricamento manuale profili, riavvio e ripristino non eseguiti. |
| ENV-06 | Dispositivi, offline, ruoli e grafica ACA | Non eseguito | Nessun comando fisico inviato, nessuna prova WAN assente o admin → cliente; nessuna personalizzazione. |
| DOC-20 | Integrità e riferimenti ACA dopo l'installazione | Superato | 407 sorgenti integri, 19 file protetti invariati, 31 Markdown / 247 link locali validi, 18 requisiti conservati. |
| DOC-21 | Perimetro e integrità del commit locale | Superato | 422 file pertinenti; 407 blob upstream byte per byte identici; esclusioni di ZIP/database/dipendenze/.env e diff delle fonti ACA verificati. |

## Audit frontend Tunet — 2026-10-05

Esiti in [REP-20261005-005](reports/REP-20261005-005-audit-struttura-tunet.md), revisione upstream 5dec995; principi di confronto in ADR-0004. Controlli eseguiti in container audit effimeri, senza rete esterna o mount dei dati reali. Nessuna CI attivata.

| ID | Controllo | Esito | Limiti |
|---|---|---|---|
| AUD-01 | Mappa statica e confronto con primitive/pagine | Superato come analisi | Componenti riusabili presenti; disallineamento dei gruppi tipografia/layout e della composizione predominante. Non è verifica della conformità del frontend ACA. |
| AUD-02 | Ambiente audit dal target builder upstream | Superato | Dockerfile/lockfile conservati; container applicativi non ricreati. |
| AUD-03 | ESLint | Superato | 222 file, 0 errori/warning; esclusi test e backend dalla configurazione upstream. |
| AUD-04 | Typecheck | Superato | checkJs, strict/noImplicitAny false; non dimostra tipizzazione rigorosa. |
| AUD-05 | Vitest | Superato | 90 file / 705 test passati in jsdom e test backend; non collaudo sui dispositivi. |
| AUD-06 | Colori e budget bundle upstream | Superato | 43 file per i colori, chunk entro i budget; non prova completa della grafica o delle prestazioni ACA. |
| AUD-07 | E2E, coverage, profilazione, WAN assente, audit sicurezza completo | Non eseguito | Da delimitare nei relativi incarichi. |
| AUD-08 | Integrità, perimetro e collegamenti | Superato | 407 sorgenti integri, 20 file storici invariati, 33 documenti / 279 collegamenti validi; soltanto otto documenti interessati. |

## Prima migrazione HOME — 2026-10-05

Evidenze e comandi in [REP-20261005-006](reports/REP-20261005-006-migrazione-home-typescript.md); criteri umani in ADR-0004/0005. I controlli strict riguardano la porzione migrata, non l'intero frontend.

| ID | Controllo | Esito | Evidenza / limite |
|---|---|---|---|
| MIG-01 | Typecheck precedente + HOME strict e relativo test | Superato | Compilatore upstream mantenuto, niente soppressioni/any nei nuovi contratti. Il confine JS resta parzialmente tipizzato. |
| MIG-02 | ESLint JS/TSX con regole React/hooks | Superato | 233 file, 0 errori/warning; no-undef/unused TS demandati a tsc nella porzione strict. |
| MIG-03 | Suite regressioni nel builder isolato | Superato | 91 file / 712 test, sette casi nuovi per HOME e lingua. Nessun volume reale o rete esterna nei container di verifica. |
| MIG-04 | Colori e budget bundle | Superato | 43 file per i colori; budget upstream rispettati. Non benchmark sul pilota. |
| MIG-05/06 | Build, avvio locale, health, asset e mount | Superato | Servizio healthy, HTTP 200, stesso volume; HA non ricreato. Non prova di backup/ripristino. |
| MIG-07 | Browser desktop/mobile, italiano e azioni | Superato | Locale it-IT, preferenza persistente dopo reload, apertura pannelli, modifica/menu/Escape; viewport 390×844 senza overflow orizzontale, ripristinato. Nessun dispositivo o profilo creato. |
| MIG-08 | Baseline, storico, link e diff | Superato | 407 file baseline e ZIP integri, 20 fonti protette immutate, 301 collegamenti locali validi e 48 percorsi nel perimetro; evidenze nel report. |
| MIG-09 | Fisico, offline, ruoli, salvataggio/caricamento profili, benchmark | Non eseguito | Restano nei futuri incarichi pertinenti. |

## Primo materiale Neumorphism HOME — 2026-10-05

Evidenze, passaggio da Antigravity e limiti in [REP-20261005-008](reports/REP-20261005-008-home-neumorphism.md). La conversione delle altre schermate e delle card non è dichiarata completata.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Tipi, lint e build | Superato | Node 26 nel builder isolato; strict HOME; 233 file lint, 0 errori/warning; build locale aggiornata, nessuna dipendenza aggiunta. |
| Regressioni | Superato | 91 file / 715 test; dopo l'adattamento tipografico mobile, 2 file / 9 test pertinenti passati. Tre nuove regressioni per contrasto dei temi e menu chiuso. |
| Colori/bundle | Superato | 43 file nel controllo colori upstream; chunk nei budget. Non audit completo di ogni componente. |
| Testo e focus HOME | Superato, perimetro limitato | Coppie opache: testo principale 14,61:1 scuro / 13,18:1 chiaro; secondario 6,21 / 6,83; selezione/focus 5,99 / 6,08; testo su pulsante arancione 5,99 in entrambi. Focus visibile verificato da tastiera. Nessuna conformità WCAG complessiva attestata. |
| Browser desktop/mobile/tablet | Superato | Due temi desktop e 390×844, vista tablet 1024×768 senza overflow orizzontale rilevato; impostazioni, aggiunta scheda, profili, modifica/Fine e gestore pagine/Escape. Nessun dato d'impianto creato. |
| Movimento ridotto | Implementato; verifica statica | Media query presente nel CSS distribuito: animation-name none, transition none e transform none. Preferenza OS non modificata né emulata. |
| Build e servizio locale | Superato | Tunet healthy, stesso volume /app/data, HA non ricreato. Non prova offline, backup o ripristino. |
| Integrità e collegamenti | Superato | 407 file baseline e ZIP integri; 21 fonti protette e report Antigravity immutati; 38 documenti, 312 collegamenti locali validi e 31 percorsi nel perimetro. |

## Acasystem «OS» — 2026-10-06

Evidenze in [REP-20261006-001](reports/REP-20261006-001-acasystem-os.md) (ondate con subagenti; le verifiche finali seguono l'integrazione).

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Divisione frontend/backend senza cambi di versione | Superato | Lockfile confrontato: 0 versioni cambiate; aggiunti solo i workspace e i pacchetti di tipi autorizzati. |
| Backend TypeScript a livelli | Superato | 83 test, tsc e ESLint a 0, ripetuti dall'orchestratore; database e schema invariati. Volume reale non ancora provato in Docker. |
| Nucleo frontend TypeScript strict | Superato | Strict e non strict a 0 errori; suite 795/799 con 4 fallimenti noti delle schermate legacy. |
| Kit bilanciato, accenti, tipografia | Superato, checkpoint 1 approvato | 65 test; matrice degli stati; contrasti calcolati; lint:typography a 0 nelle cartelle a strati. Senza tablet fisico. |
| Launcher, widget, sistema, integrazione, revisione | In corso | Ondate 2–4. |

## Chiusura della revisione e banco Acasystem 0.1 — 2026-10-07

Fonte corrente: [REP-20261006-002](reports/REP-20261006-002-ripresa-revisione.md), annotazioni del 2026-10-07. Gli esiti «In corso» del 2026-10-06 sopra sono storici.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Identità dei sorgenti alla ripresa | Superato | 921 file correnti uguali al manifesto SHA-256 di v009; copia integra. Nessuna correzione applicativa aggiunta in questa ripresa. |
| Chiusura documentale | Superato | 111 collegamenti locali dei sei documenti aggiornati validi; confronto con v009 limitato a quei documenti, codice e fonti protette invariati. Istantanea v010. |
| Revisione documentale indipendente | Superato dopo rettifica | 70 collegamenti, inclusi gli anchor, nei tre documenti operativi principali. ISSUE-018/021 aggiornati distinguendo audit storico e nuovo applicativo; istantanea v011, stesso codice. |
| Backend, verifica indipendente ripetuta | Superato | Typecheck strict ed ESLint a 0; 13 suite, 93/93 test. Autenticazione solo presso URL HA configurati sul server. |
| Frontend, autenticazione e configurazione | Superato | SystemConnect, SystemPage, ShellApp, useConnectionSetup, oauthStorage, apiAuth: 6 suite, 66/66 test ripetuti. |
| Suite frontend completa | Esito precedente con fallimenti | 1476/1481 nell'annotazione precedente; 5 fallimenti del legacy escluso, ISSUE-029. Suite completa non ripetuta in questa ripresa. Dopo la cancellazione del legacy: 1161/1161 (sezione seguente). |
| Banco Docker | Superato | aca-system:0.1, healthy; immagine be0f93a…7b09c8; health ok versione 0.1.0, volume aca-tunet_tunet-data invariato. Configurazione e digest completo in infrastructure.md. |
| Browser con sessione HA reale | Superato, perimetro limitato | Dopo ricaricamento: UI Metallo, OAuth2 conservato, «Collegato» in Sistema, navigazione e focus Sistema/launcher, Principale/Copertina da tastiera. Schermata nel report. Nessun comando fisico o salvataggio profilo/layout. |
| Backup e ripristino | Copia presente; ripristino non eseguito | Copia manuale a freddo del volume, 8516 byte, precedente all'aggiornamento. Nessuna prova di recupero, backup automatico o nuovo backup HA. |
| Dispositivi, offline, LAN/remoto | Non eseguito | Il banco browser/Docker non prova il prodotto sul tablet e sull'impianto. Nessuna CI attiva. |

## Home Assistant dietro Acasystem — 2026-10-07

Fonte: [REP-20261007-002](reports/REP-20261007-002-ha-dietro-acasystem.md), [ADR-0009](decisions/ADR-0009-home-assistant-dietro-acasystem.md).

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Proxy, test e revisione | Superato | Backend 138/138; 40 tentativi di aggirare il login, 29 risposte malformate, mutazioni 9/10. |
| Accesso end-to-end con finto HA | Superato | Credenziali errate, due fattori, ricarica, rinnovo, revoca, token kiosk, HA spento, limite. |
| Frontend completo | Superato | 1327/1327; build e budget ok. |
| Banco con HA reale | Superato senza credenziali | Provider 200, percorsi vietati 404, WebSocket fino a `auth_required`; il login reale lo esegue l'utente. |

## Launcher: polish, layout e celle «+» — 2026-10-07

Fonte: [REP-20261007-001](reports/REP-20261007-001-launcher-polish.md).

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Valutazioni isolate (layout, pre-scansione, kit) | Eseguito | 21 + 13 + 26 rilievi, poi corretti in due giri o motivati come residui (ISSUE-028) e come decisioni per l'utente. |
| Revisione visiva indipendente | Superato con residui | Sette viewport da 360×740 a 1920×920; griglia identica tra vista e modifica; widget nella cella toccata; tastiera e focus; 0 errori in console. Su Chromium a DPR 1 e 2: non provati la scala reale al 125%, altri browser e dispositivi touch. |
| Statici e suite | Superato | tsc, ESLint, tipografia, colori a 0; Vitest 113 file, 1281/1281. |
| Build, budget, immagine | Superato | index 677,1/900 KB; `aca-system:0.2` provata sulla porta 3012. Banco non aggiornato. |

## Cancellazione del legacy Tunet — 2026-10-07

Fonte: [REP-20261006-001](reports/REP-20261006-001-acasystem-os.md), annotazione del 2026-10-07; [ISSUE-029](project-status.md#issue-029).

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Elenco del legacy | Superato | Tracciamento statico delle importazioni da index.html, kit.html, launcher.html, le preview-*.html, i test TypeScript e il setup dei test: 213 file mai raggiunti, nessuna importazione irrisolta. Aggiunti 7 moduli TypeScript usati solo dal legacy, gli e2e di Tunet e 3 script di Tunet: 232 file (`backup/legacy-da-cancellare.txt`). |
| Cancellazione | Superato | Eseguita dall'utente da WSL: il classificatore dei permessi l'ha negata all'agente. 0/232 file residui; cartelle vuote rimosse. Copia completa in `usa-come-git/v009`–`v011`. |
| Statici | Superato | `tsc -p tsconfig.strict.json` 0 errori, ESLint 0, tipografia 0 violazioni (384 file), colori 0 (273 file). |
| Suite frontend completa | Superato | 102 file, 1161/1161 test, nessun fallimento (prima 1476/1481: 320 test e 51 file del legacy rimossi). |
| Build e budget | Superato | `npm run build` e `check-bundle-size.mjs`: index 666,7/900 KB, vendor nei limiti. Il CSS passa da 219 a 104 KB: 1533 classi Tailwind generate solo per il legacy; nessuna è usata come classe nel codice nuovo. |
| Immagine Docker | Superato | `aca-system:0.1.1-check` costruita e provata sulla porta 3012: health ok, root 200, `lang="it"`, titolo «Acasystem». Container rimosso. Il banco resta su `aca-system:0.1` per la demo. |
| Anteprime | Superato | Playwright a 1280×800 e 390×844: copertina, Casa, Luci, Clima, Multimedia senza overflow né errori in console; aspetto uguale alle schermate precedenti. |

## Modifica semplificata e griglia per pagina — 2026-10-08

Fonte: [REP-20261008-001](reports/REP-20261008-001-modifica-semplificata-griglia-per-pagina.md). Comandi in `progetto/acasystem/frontend`; per ogni incremento due giri di revisione avversaria con riproduzioni e mutazioni temporanee, esiti nel report.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici | Superato | `tsc -p tsconfig.strict.json` 0 errori, ESLint 0, tipografia 0 violazioni (425 file), colori 0 (301 file). `format:check` fallisce solo su `eslint.config.js` e `public/sw.js`, non toccati e invariati rispetto all'ultimo commit. |
| Suite frontend completa | Superato | Verifica finale: 131 file, 1549/1549, 313,4 s; `i18n:check` 4/4. Dopo le correzioni visive: 131 file, 1550/1550, 309,9 s. Punto di partenza: 128 file, 1403/1403. |
| Build e budget | Superato | `npm run build` in 2,21 s con l'avviso preesistente sui chunk oltre 500 kB; `check-bundle-size.mjs` nei limiti, index 718,6/900 KB. Eseguita prima delle correzioni visive (CSS e dati dell'anteprima): la ripete la costruzione dell'immagine del banco. |
| Residui | Superato | Nessun riferimento a `RemoveZone`, `WidgetPositionControls`, `keyboardMode` o `PageSettingsSheet`; `[data-widget-knob]` resta solo in un'asserzione di assenza. |
| Prova visiva nell'anteprima | Superato, perimetro limitato | Playwright Chromium, mouse, DPR 1, `launcher.html` (pelle Metallo, entità finte) su Vite: viste a 960×445, 960×552, 960×600, 390×844, 844×390 e 600×860, interazioni a 960×445 e 390×844. Griglia piena entro il tetto del gap, celle a scarto 0 px, nessuno scorrimento orizzontale, console senza errori. Due difetti trovati e corretti, poi ricontrollati a 960×445, 390×844, 844×390 e 600×860. Doppio tocco simulato con due clic a 140 ms. |
| Geometria dell'editor delle pagine | Superato, misura una tantum | Script Playwright: a 960×445, 1024×472, 844×390, 390×844 e 360×740 nessun comando sotto la pillola dei messaggi, schede di altezza uguale; a 1152×700 e 1280×800 la riga sotto la scheda sta su una riga con un nome di 27 caratteri. Non è una suite e2e. |
| Lenovo Tab M11, tocco reale, TalkBack, tastiera virtuale, HA reale | Non eseguito | Da fare con l'immagine del banco aggiornata. |

**Misura della scala dagli screenshot del Lenovo Tab M11.** Eseguita prima di fissare `REFERENCE_AREAS.phoneLandscape`, senza codice, sugli screenshot inviati in chat il 2026-10-08: copie da 1600×1000 dello schermo 1920×1200, Chrome in orizzontale.

| Grandezza | Valore | Come |
|---|---|---|
| Scala (DPR) | 1,875 | La pillola della barra di stato, 52 px CSS (`statusBar.css`), è alta 81 px nella copia (y 217,5 → 298,5): 81 × 1920/1600 ÷ 52 = 1,87, quindi 1920/1024. |
| Controprova orizzontale | Coerente | Passo delle celle 187 px nella copia = 119,7 px CSS = cella 110 + gap 10; griglia 6×2 larga 1107,5 px = 708,8 px CSS, attesi 710. |
| Finestra | ≈1024×472 px CSS | Contenuto da y 198 a y 935 nella copia. Lato corto < 600, quindi classe `phoneLandscape`. |
| Area della griglia | 973×230 px CSS | La cella di 110 px è limitata dall'altezza: 2 × 110 + 10 = 230. |
| Cornice verticale | ≈242 px | Il CSS ne prevede 200: il piè di pagina finisce circa 40 px CSS sopra il fondo della finestra. Causa dedotta, non misurata: safe-area o barra di Android. |

Valori fissati in `deviceClass.ts`: `phoneLandscape` 973×230 (misura); `tablet` 973×440, lo stesso schermo a schermo intero (1024×640) con la cornice del CSS; `tabletPortrait` 568×540 e `phone` 358×576, stime del piano. Conseguenze sul Lenovo in Chrome: da 2 a 6 colonne una sola riga, da 7 a 9 due righe; la pagina automatica è 8×2 con cella 110 (gapX circa 12,8, gapY 10), la stessa cella della 6×2 di prima.

Limiti: `innerWidth`, `innerHeight`, `devicePixelRatio` e `safe-area-inset-bottom` non sono misurati in Chrome sul dispositivo. Le due aree di riferimento usano cornici diverse: con 242 px anche a schermo intero l'area sarebbe 973×398 e 8 colonne darebbero 3 righe invece di 4. L'anteprima di sviluppo a 1024×472 dà invece un'area di 973×272, con la cornice di 200 px. La stima iniziale di 960×445 a scala 2 è superata da questa misura.

## Editor delle pagine con icone e nuvoletta — 2026-10-09

Fonte: [REP-20261009-002](reports/REP-20261009-002-editor-pagine-icone.md). Comandi in `progetto/acasystem/frontend`; due giri di revisione avversaria con riproduzioni e mutazioni temporanee, esiti nel report.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici | Superato | `tsc -p tsconfig.strict.json` 0 errori, ESLint 0, tipografia 0 violazioni (425 file), colori 0 (302 file). `format:check` fallisce solo su `eslint.config.js` e `public/sw.js`, fuori dall'incarico. |
| Suite frontend completa | Superato, con nota | Verifica finale: 132 file, 1562/1562, 472,6 s; `i18n:check` 4/4. Dopo le ultime correzioni, solo CSS e asserzioni sul CSS: 1561/1562, con un fallimento in un test di tastiera dei widget mentre server di sviluppo e Playwright caricavano la macchina; il file da solo 77/77; suite non ripetuta. |
| Build e budget | Superato | `npm run build` in 1,99 s e, dopo le ultime correzioni, in 2,57 s, con l'avviso preesistente sui chunk oltre 500 kB; `check-bundle-size.mjs` nei limiti, index 720,0/900 KB. |
| Prova visiva nell'anteprima | Superato, perimetro limitato | Playwright Chromium, `launcher.html` (Kit 2, entità finte) su Vite, 1024×472 e 390×844, chiaro e scuro, tocco via CDP, mouse e tastiera. Barra dentro lo schermo, bersagli di 44 px, «Nuova» senza menu, rinomina nella barra, riga sotto la scheda senza testi, nuvoletta alla pressione di 600 ms senza azione, al fuoco e al mouse; icone 10,62:1 e 12,83:1, casetta premuta 5,54:1 e 3,6:1; console senza errori. Un difetto (avviso del nome vuoto a 1,78:1 nello scuro) corretto a 6,13:1. Script una tantum, non una suite e2e. |
| Lenovo Tab M11, pressione lunga nativa di Chrome per Android, TalkBack, tastiera virtuale, HA reale | Non eseguito | Da fare con l'immagine del banco aggiornata. |
| Banco | In corso | Aggiornamento a cura dell'agente principale; esito nel report e in [infrastructure.md](infrastructure.md). |

## PageShell, vista pagine a trasformazioni e nuvoletta UI-010 — 2026-10-09

Fonti: [REP-20261009-004](reports/REP-20261009-004-pageshell.md) e [REP-20261009-003](reports/REP-20261009-003-vista-pagine-animazione.md), [ADR-0012](decisions/ADR-0012-pageshell.md). Comandi in `progetto/acasystem/frontend`. Cinque blocchi con uno o due giri di revisione avversaria ciascuno (riproduzioni in Chromium, mutazioni temporanee), poi verifica d'insieme e prova visiva. Le prove nel browser sono script una tantum su server Vite propri, in Chromium senza GPU (`--disable-gpu`, SwiftShader), un browser alla volta; non sono una suite e2e. Il PC si è spento più volte durante le prove precedenti (crash del driver grafico) e una volta durante la chiusura: causa non accertata.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici | Superato | `tsc -p tsconfig.strict.json` 0 errori, ESLint 0, tipografia 0 violazioni (428 file), colori 0 (303 file), `i18n:check` 4/4. `format:check` fallisce solo su `eslint.config.js` e `public/sw.js`, preesistenti. |
| Suite frontend completa | Superato, con nota | Ultima esecuzione completa con `--maxWorkers=4`: 139 file, 1644 test passati (405 s). Nei passaggi intermedi, sotto carico del PC, test di `LauncherScreen`, `PolishKit` e altri sono andati in timeout da 15 s (nessuna asserzione fallita); rilanciati da soli, con meno processi o con timeout più lungo sono passati. |
| Build e budget | Superato | `npm run build` riuscita con l'avviso preesistente sui chunk oltre 500 kB; `check-bundle-size.mjs` nei limiti, index 725,6/900 KB. |
| Pressione, tablet 1024×472 e telefono 390×844, chiaro e scuro, modifica e vista | Superato | Scarto del centro 0,00 px fino a 1000 ms; scala a 950 ms 0,908–0,910; nessuna rotazione né animazione prima del sollevamento. Copia: parte a 0,9, torna a 1 entro circa 200 ms, oscilla tra −0,9° e +0,9°. Sfondo e scheda della vista a 0,908–0,910 con centro fermo. Movimento ridotto: scala 1, nessuna oscillazione. |
| Ritorno dell'orologio in copertina (P2) | Superato, caso esatto non riprodotto | 8 giri su 8 (tablet e telefono, chiaro e scuro, due varianti); rilascio dopo il giro di pagina accettato. Test dell'aggancio al centro e della geometria a metà scorrimento. Il layout reale del banco non è disponibile (D4): resta «da confermare sul banco». |
| Pozzetti della copertina (D5) | Superato | Fuori dalla modifica pozzetti `span` `aria-hidden` senza «+», non focalizzabili, visibili a riposo e a 600 ms di pressione; in modifica e durante il trascinamento bottoni con «+»; la Home non cambia. |
| Barra in alto e «Fine» (D1) | Superato | Copertina senza barra in alto in vista e in modifica; «Fine» solo nella barra in basso (72×44 px); nessuna sovrapposizione a 320 e 360 px; fuoco: matita → «Fine» all'ingresso, «Fine»/Esc → matita o «Pagina» sulla copertina. Impronta geometrica prima/dopo identica in 5 scene, salvo D1. Casi residui di fuoco e del vassoio aperto: aperti nei report. |
| Vista pagine: layout stabile | Superato | `distinctPageLayoutWidths = 1`, `distinctCellValues = 1`, `resizeObserverCalls = 0` in tablet e telefono, chiaro e scuro, anche con movimento ridotto (prima: 13 larghezze, 10 valori, 90 callback, 186 modifiche, fotogramma massimo 66,7 ms). |
| Vista pagine: fotogrammi lenti | Parziale | Server di sviluppo: 1 fotogramma da 50–67 ms al commit dell'apertura, a freddo a volte un secondo da 33 ms. Build di produzione, 4 contesti a freddo: 0 fotogrammi oltre 18 ms; con CPU rallentata 4 volte al più uno. Ambiente senza GPU; tablet non misurato. |
| Vista pagine: pan, uscita, tastiera, riordino | Superato | Pan con mouse e tocco CDP senza salti al rilascio; uscita senza salti; Tab (10 volte) senza spostare le schede; Alt+frecce, trascinamento con pressione lunga, nuova pagina ed eliminazione su tablet e telefono. Rotella e trackpad non scorrono le schede (limite). |
| Nuvoletta UI-010 | Superato | Contrasto minimo 6,39:1 sugli accenti provati; test su 77 accenti (≥ 4,5:1, deriva di tinta ≤ 3°). 16 px, Inter 500, raggio 5 px, ombra `0 10px 10px`, triangolino con errore di puntamento 0 px anche contro il bordo; solo dissolvenza di 120 ms con movimento ridotto; nessun `transition: all`. |
| Scambio delle barre in basso | Superato | Su build di produzione la barra di modifica scende a opacità 0,14 quando quella della vista parte da 0,02; test `EditToolbarHidden`. |
| Console | Superato | Nessun errore di console o di pagina nelle prove di pressione, copertina, vista e nuvoletta. |
| Lenovo Tab M11, pressione lunga nativa di Chrome per Android, pan e flick a dito, TalkBack, HA reale | Non eseguito | Soglie del flick tarate con eventi CDP. Da fare con l'immagine del banco aggiornata. |
| Banco | In corso | Aggiornamento a cura dell'agente principale; esito nei report e in [infrastructure.md](infrastructure.md). |

## Nome della pagina animato, ombre non ritagliate e tocco lento — 2026-10-10

Fonti: [REP-20261009-005](reports/REP-20261009-005-barra-nome-animata.md), [REP-20261009-006](reports/REP-20261009-006-ombre-non-ritagliate.md) e la coda di [REP-20261009-004](reports/REP-20261009-004-pageshell.md) (annotazione del 2026-10-10). Comandi in `progetto/acasystem/frontend`. Tre blocchi con uno o due giri di revisione avversaria ciascuno (riproduzioni in Chromium, mutazioni temporanee), poi verifica d'insieme, prova visiva e una correzione dopo la prova. Le prove nel browser sono script una tantum su server Vite propri, in Chromium headless senza GPU (`--disable-gpu`, SwiftShader), un browser alla volta; non sono una suite e2e. Suite sempre con `--maxWorkers=4`.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici | Superato | `npm run typecheck` 0 errori, `npm run lint` 0, tipografia 0 violazioni (428 file), colori 0 (303 file), `i18n:check` 4/4. `format:check` fallisce solo su `eslint.config.js` e `public/sw.js`, preesistenti. |
| Suite frontend completa | Superato | Ultima esecuzione completa, dopo la correzione che segue la prova visiva: 141 file, 1676 test passati, 0 falliti. Una esecuzione precedente: 141 file, 1674 test passati in 409 s. |
| Build e budget | Superato | `npm run build` riuscita, ripetuta dopo le ultime correzioni, con il solo avviso preesistente sui chunk oltre 500 kB; `check-bundle-size.mjs` nei limiti, index 726,6/900 KB (misurato prima della correzione finale). |
| Tocco lento al bordo dell'apertura (blocco C) | Superato in Chromium | Riprodotto prima della correzione (tocco di 700–900 ms a 4 e 8 px dal bordo: i dettagli non si aprono). Dopo: si aprono; pressione lunga di 1,4 s entra ancora in modifica senza aprire; rilascio dopo 20 px non apre nulla. 5 test nuovi in `LauncherScreen.test.tsx`, 4 falliscono con il codice precedente. Caso simmetrico (tocco lento su un comando vicino al lato esterno) non corretto, proposta registrata. |
| Rinomina animata e nome a riposo | Superato | `PageOverviewBarRename.test.tsx` 17 test. Tablet 1024×472 e telefono 390×844, chiaro e scuro: andata 365 → 448 px in circa 250 ms con icone a opacità 0 entro 113 ms; ritorno 448 → 516 px in circa 280 ms, icone dopo circa 240 ms; Esc animata; nome di 43 caratteri dentro la barra e la fascia; Invio, `submit` del form, uscita valida, nome vuoto rifiutato, fuoco sul nome; movimento ridotto immediato; console senza errori. Nessuna matita, separatori da 1 × 20 px, nome 72 × 44 px. Tab e Maiusc+Tab, e la centratura verticale del campo, sono coperti da test e misura nel report, non da una nuova prova nel browser. |
| Etichette della scheda | Superato | Nessun `.aca-pager__badge` nel DOM né nei sorgenti (resta un'asserzione negativa nel test); nome accessibile «Apri Casa, principale» / «Apri Casa 2, nascosta» invariato. |
| Ombre ai bordi delle barre | Parziale | Geometria identica prima e dopo (celle, gap, griglia, k 0,7200, passo 761,28 e 304,80 px, corpi delle schede) a 1024×472 e 390×844; cambia solo il riquadro del pager. Con un'ombra rossa diagnostica il pager vecchio ritaglia a y = 64 con un bordo netto, il nuovo no. Con le ombre reali del Kit 2 la scansione dei pixel non mostra differenze misurabili sopra la scheda sollevata (l'ombra visibile arriva a circa 7 px) né sopra i widget della prima riga; l'unica differenza osservata è a y = 384–388 sul tablet, al bordo del footer. Il sintomo segnalato non si riproduceva già prima di questo incarico, dopo che la scheda sollevata non cresce più. |
| Tocchi sulle fasce e pulsanti | Superato, dopo la correzione | La prima versione faceva passare al pager i tocchi sulle fasce vuote (pressione lunga, scorrimento): rilevato dalla prova visiva e corretto con fasce sorde. Dopo: `elementFromPoint` nelle fasce restituisce la shell e nell'area delle pagine la pagina, a 1024×472 e 390×844; i pulsanti delle barre ricevono il puntatore al centro (verifica fatta prima dell'ultima correzione). Pan e pressione dalla fascia nella vista pagine coperti da test Vitest, non da una nuova prova nel browser. |
| Telefono con la riga dei chip | Limite noto | Il bordo di ritaglio sta a y = 43,25 invece che a 0; nessun contenuto vicino, nessun taglio visibile. |
| Console | Superato | Nessun errore di console o di pagina nelle prove. |
| Lenovo Tab M11, tastiera Android («Fatto»), tocco reale, TalkBack | Non eseguito | Da fare con l'immagine del banco aggiornata. |
| Banco | In corso | Aggiornamento a cura dell'agente principale; esito nei report e in [infrastructure.md](infrastructure.md). |

## Grandezza tra pagine, nome della copertina, livelli grafici, versione e banco 0.9 — 2026-10-12

Fonti: [REP-20261012-001](reports/REP-20261012-001-widget-tra-pagine-grandezza-visiva.md), [REP-20261012-002](reports/REP-20261012-002-nome-copertina-separatori.md), [REP-20261012-003](reports/REP-20261012-003-lag-tablet-prestazioni.md) (tappa 1) e [REP-20261012-004](reports/REP-20261012-004-versione-da-env.md). Comandi in `progetto/acasystem/frontend` e, dove indicato, `backend`. Il blocco grafico di REP-20261012-003 ha avuto un'implementazione, due revisioni avversarie di Opus e due giri di correzioni; il blocco L2 non era iniziato a quella chiusura (annotazione del 2026-10-13: completato nel codice, vedi la sezione «Blocco L2 (0.9.1)» più sotto). Le prove nel browser sono script una tantum in Chromium headless con raster software (SwiftShader), un browser alla volta, contro una copia del codice prima del blocco; le misure sul tablet delle demo (Lenovo Idea Tab TB336ZU, Chrome 154, 1280×665 DPR 2, 90 Hz, HA reale) sono via USB e CDP. Suite sempre con `--maxWorkers=4`. Nessuna è una suite e2e permanente.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici frontend | Superato | Dopo l'ultima correzione: `npm run typecheck` 0 errori, `npm run lint` 0, `npm run lint:typography` 0 violazioni (428 file), `npm run lint:theme-colors` 0 (303 file), `npx prettier --check` sui file toccati dal blocco grafico. `format:check` completo e `i18n:check`: nessuna esecuzione registrata in questa serie, quindi non eseguiti. |
| Suite frontend completa | Superato, con nota | Ultima esecuzione, dopo la correzione finale: 142 file, 1706 test passati (`npx vitest run --maxWorkers=4`, 961 s). Esecuzioni intermedie: 1704 test (826 s) e 1705 (926 s). Due esecuzioni sotto carico del PC avevano dato fallimenti solo per timeout da 15 s (`LauncherScreen`, `SystemPage`) e un fallimento reale del test di CORR-7, poi corretto. |
| Trascinamento e menu tra pagine (REP-001) | Superato | `LauncherDragDrop.test.tsx` 36 test, con la conversione, l'orologio della copertina, il rimpicciolimento del solo widget spostato e la misura reale dal menu; i due test nuovi della revisione falliscono senza la correzione. |
| Nome della copertina (REP-002) | Superato | `PageOverviewBarRename.test.tsx` 18 test: `span` con le stesse lineette, nessun pulsante, nessun campo. |
| Regole CSS del blocco grafico (REP-003) | Superato, perimetro limitato | `LagLayers.test.ts` 22 test; con `OverviewPan`, `PageShell`, `LauncherGestures` e `PagerOverview` 103 test (prima dell'ultima correzione). Leggono il testo del CSS: la cascata reale è provata dalle sonde nel browser, non dai test. |
| Build | Superato | `npm run build` riuscita dopo il giro 1, con il solo avviso preesistente sui chunk oltre 500 kB; le cinque regole `@property` sopravvivono alla minificazione e sono registrate in Chromium. Ripetuta nella costruzione dell'immagine 0.9 (bundle `index-DG_i_to_.js`). |
| Backend (REP-004) | Superato | `npx vitest run`: 17 file, 141 test, compreso `version.test.ts` (variabile, ripiego, `unknown`); `npm run typecheck`, `npm run lint`, `npx prettier --check`: nessun errore. |
| Compose (REP-004) | Superato | `docker compose -f progetto/compose.tunet.yaml config`: immagine `aca-system:0.9`, `args` e `environment` con «0.9»; con `ACASYSTEM_VERSION=x` nella shell vale «x». |
| Misure sul PC, finestra del tablet | Eseguito, perimetro limitato | 1280×665 DPR 2, A/B alternato, due ripetizioni. Pan della vista: elementi ricalcolati da 54 445-54 788 a 335, RasterTask da 2079-2155 a 385, fotogrammi oltre 33 ms da 30-46 a 1-3. Apertura e chiusura: RasterTask da 1790-1940 a 588-670. Scorrimento: ricalcoli da 2476-2481 a 1366-1371, RasterTask da 167 a 125, ma Paint da 58-59 a 280-282; livelli da 61 a 146. **I fotogrammi lunghi dell'apertura e della chiusura non migliorano sul PC** (oltre 33 ms da 4-5 a 5-6; il più lungo da 200-317 a 300-383 ms nella rimisura del revisore). Il raster software non riproduce la GPU Mali. Tabelle complete nel report. |
| Aspetto sul PC | Parziale | Forme, colori e geometrie coincidono, ma i pixel non sono identici: a riposo 21 230 pixel con differenza oltre 8 (massimo 189) a 1280×665 DPR 2 e 22 766 (massimo 190) a 1024×472 DPR 1,875, con il testo di alcuni widget 1 px CSS più in basso. Con `will-change: auto` forzato su widget e celle l'immagine coincide con la base: causa nei livelli promossi. Il confronto allineato di ±3 px dell'implementazione nascondeva spostamenti ed è stato sostituito dai diff grezzi. |
| Misure sul tablet delle demo, 0.8 → 0.9 | Eseguito | Intervalli di `requestAnimationFrame`: scorrimento 68-79 fps (fino a 267 ms) → 86-89 fps (33-67 ms); apertura della vista 38 fps (356 ms) → 80-81 fps (133-156 ms); chiusura 54 fps (467 ms) → 75-76 fps (122-144 ms); quiete ed entrata in modifica 88-90 fps, invariate. Tracce CDP, blocco massimo del processo GPU: apertura 157-170 → 18 ms; chiusura 230-236 → 80 ms; scorrimento 47-250 → 11 ms. Restano blocchi del thread principale nella vista: commit di React 77 ms, layout forzato 41,6 ms, ricalcolo di stile 34 ms. |
| Criterio «nessun blocco della GPU oltre 40 ms» | Parziale | Rispettato in scorrimento (11 ms) e apertura (18 ms); **non rispettato in chiusura (80 ms)**. |
| Criterio «al più 1 fotogramma oltre 50 ms per animazione» | Non dimostrato | Il fotogramma più lungo supera 50 ms nell'apertura e nella chiusura della vista (122-156 ms); il numero di fotogrammi oltre 50 ms non è registrato. Dipende dal thread principale (L2). |
| Banco 0.9 | Superato | Copia a freddo del volume `backup/banco/tunet-data-20261012-pre-0.9-freddo.tgz` (126 028 byte, SHA-256 `c7fd1a8e…a362`); costruzione e avvio con `progetto/compose.tunet.yaml`; immagine `aca-system:0.9` `sha256:9a66d934…fc533` creata il 2026-10-12T15:23:02Z; container `healthy`; `/api/health` `{"status":"ok","version":"0.9"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; bundle `index-DG_i_to_.js`. Il ripristino della copia non è stato provato. Dettagli in [infrastructure.md](infrastructure.md). |
| Screenshot sul tablet prima e dopo; misura sul Lenovo Tab M11 da 4 GB (memoria GPU); orologio tra pagine e riga «Versione» di Sistema a schermo; TalkBack; angoli alla chiusura a vista | Non eseguito | Da fare con la 0.9. Il blocco L2 (React e impaginazione) era rimandato alla 0.9.1 e non iniziato a quella data; annotazione del 2026-10-13: completato nel codice, resta la misura sul tablet. |

## Blocco L2 (0.9.1) di REP-20261012-003 — 2026-10-13

Fonte: [REP-20261012-003](reports/REP-20261012-003-lag-tablet-prestazioni.md#blocco-l2-091). Comandi in `progetto/acasystem/frontend`, sul working tree dopo due giri di revisione e correzione. Prove nel browser: script una tantum in Chromium headless con raster software (SwiftShader), un browser alla volta, contro una copia del codice prima di L2 (`567531f`); suite sempre con `--maxWorkers=4`. Nessuna misura sul tablet in questa serie.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici frontend | Superato | `npm run typecheck` 0 errori, `npm run lint` 0, `npm run lint:typography` 0 violazioni (429 file), `npm run lint:theme-colors` 0 (303 file), `npm run i18n:check` exit 0 (4 test), `npx prettier --check` sui file toccati. `npm run format:check` completo: exit 1 solo per `eslint.config.js` e `public/sw.js`, preesistenti. |
| Test del blocco | Superato | `PagerOverview` 27 test, `LauncherScreen` (render dei widget) 3, `PageDescriptor` e `LagRenders` 16, `LagLayers` verde. Prova di mutazione: con il codice pre-L2 (`Pager`, `LauncherScreen`, `LauncherUiContext`, `useLauncherController`, filtro di `footerBand`) i test nuovi falliscono; i test dei due giri di revisione falliscono senza la rispettiva correzione. |
| Suite frontend completa | Superato | `npx vitest run --maxWorkers=4` dopo l'ultima modifica: 143 file, 1727 test passati, 650 s. Una esecuzione intermedia (1720 test, 1144 s) era verde; un lancio dopo il giro 1 aveva dato un fallimento non identificato (output troncato), non ripetuto: causa non dimostrata, probabile timeout da carico. |
| Build | Superato | `npm run build` exit 0 con il solo avviso preesistente sui chunk oltre 500 kB; `node scripts/check-bundle-size.mjs` exit 0 (index 729,4 KB su 900). Con `ACASYSTEM_VERSION=0.9.1` la stringa «0.9.1» è in `dist/assets/index-rqrtF8mx.js`. L'immagine 0.9.1 non è stata costruita. |
| Render e layout forzati sul PC | Eseguito, perimetro limitato | 1024×472 DPR 1,875, mediana di 3 giri: apertura della vista render 1023 → 291, layout forzati 1 → 0, stile forzato 28,9 → 2,6 ms; cambio di pagina 1294 → 305 render, layout e stile forzati 2 + 2 → 0 (in modifica 8 + 13 → 0 + 2); chiusura con «Fine» stile forzato 65,2 → 0,9 ms (647 render: finisce la modifica); chiusura toccando una scheda 1765 → 581 render, layout forzati 6 → 5. Rimisure dei revisori a 1280×665 DPR 2: apertura 1230 → 291 render, chiusura 1972 → 581, cambio di pagina 1710 → 305. I millisecondi sono rumorosi con raster software e PC carico; il raster software non riproduce la GPU Mali. |
| Copertina spenta | Superato | Prima del giro 2 l'apertura ridisegnava ancora griglie e widget (render 1230 → 778); dopo la correzione il caso a copertina spenta di `LauncherScreen.test.tsx` e di `LagRenders.test.tsx` conferma che i widget non si ridisegnano. Non rimisurato nel browser dopo il giro 2. |
| Aspetto sul PC | Parziale | 22 screenshot per finestra: 19 identici a 1024×472 e 18 a 1280×665; differenze spiegate da orologio reale della copertina (mezzanotte passata tra le esecuzioni), fase della transizione di pressione (identico a regime) e riflusso di un widget a trascinamento iniziato. Console senza errori né avvisi. |
| Percorsi di navigazione | Superato, con limite | Apertura e chiusura della vista per 3 cicli, pan, riordino, nuova pagina, rinomina, trascinamento tra pagine, indicatore, ridimensionamento della finestra: stati uguali alla base. Due regressioni trovate dai revisori (indicatore durante lo scorrimento morbido, apertura della vista subito dopo uno scorrimento) sono corrette e coperte da test. La scrollata a tocco via CDP senza GPU è lenta: l'allineamento `scrollLeft = indice × larghezza` è verificato a riposo. |
| Riga «Versione» di Sistema | Non eseguito | L'anteprima di sviluppo mostra 0.1.0 (ripiego sul `package.json`, REP-20261012-004); 0.9.1 non è stata vista a schermo. |
| Banco 0.9.1; misura sul tablet delle demo (blocco GPU in chiusura, fotogrammi oltre 50 ms) e sul Tab M11; memoria GPU; TalkBack | Non eseguito | A cura dell'agente principale. I criteri del report restano non valutati per L2. |

## Barra unica in basso (ADR-0013), tappe 1-6 — 2026-10-13/14

Fonte: [REP-20261013-002](reports/REP-20261013-002-piano-barra-unica.md#verifiche-delle-tappe-1-6-2026-10-1314), con tutti i dettagli. Comandi in `progetto/acasystem/frontend`, sul working tree. Prove nel browser: Chromium headless con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing` (raster software, non il Mali-G57), un browser alla volta, contro `launcher.html`; server Vite fermati a fine prova. Suite con `--maxWorkers=4`. Nessun docker, adb o commit; banco ancora `aca-system:0.9.2`.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici frontend | Superato | `npm run typecheck` 0 errori, `npm run lint` 0, `npm run lint:typography` 0 violazioni (429 file), `npm run lint:theme-colors` 0 (303 file), `npm run i18n:check` 4 test, `npx prettier --check` sui file toccati. `npm run format:check`: exit 1 solo per `eslint.config.js` e `public/sw.js`, preesistenti. |
| Suite frontend completa | Superato | `npx vitest run --maxWorkers=4` dopo l'ultima modifica: 145 file, 1815 test passati, 392 s. Percorso: T1 143 file / 1757; T2 144 / 1778; T3 145 / 1812; T4-5 145 / 1813; dopo la verifica visiva 145 / 1815. Non valgono come suite verde: l'esecuzione della T1 con 3 timeout sotto carico (15-18 s; i due file rieseguiti da soli 103/103) e quella della T3 con 62 errori «Worker exited unexpectedly» (worker non avviati per il carico del PC). |
| Guardie di griglia e dati | Superato | `LauncherGeometry` (righe e chiavi per 4 classi e 2-10 colonne, `cellMetrics` 75 e 88, `sizeAcrossKeys`) e `Polish2Cornice` (esiti di `fitBand` della barra della modifica, larghezze misurate il 2026-10-13): fissati sulla 0.9.2, verdi a fine lavoro. `REFERENCE_AREAS` invariata. |
| Cache della fascia | Superato, in jsdom | `FooterBandCache.test.tsx` (16 test): nessuna lettura di layout mostrando o nascondendo una barra a parità di chiave; rimisura per nota ↔ «+ Widget», testo e fase della connessione, larghezza, font, nome della pagina. jsdom non ha `ResizeObserver` (simulato nei test): il ciclo di circa 60 misure al secondo della prima versione si vide solo in Playwright. Nessuna misura sul tablet. |
| Build | Superato | `npm run build` riuscita dopo le ultime correzioni (solo l'avviso sui chunk oltre 500 kB); `node scripts/check-bundle-size.mjs`: index 733,2 KB su 900, misurato prima di due correzioni CSS. |
| Celle prima → dopo | Superato | Playwright, «prima» da uno stash del punto di partenza: 1024×640 75 → 88; 1280×800 107 → 120; 1280×665 80 → 93; 1024×472 112 → 112; 1024×568 112 → 112; 640×1024 89 → 89; 844×390 90 → 91; 390×844 81 → 82; 390×700 57 → 75. Coincidono con il piano. |
| Griglia e fascia identiche tra gli stati | Superato | 9 viewport; copertina, normale, modifica, selezione, vista pagine; chiaro e scuro con 0 differenze. Fascia di 88 px (152 sotto 40rem). |
| Sovrapposizioni, bersagli, scroll | Superato | Zero sovrapposizioni tra pillole, traccia, nome e gruppi delle barre; nessuno scroll orizzontale; in 11 viste × 3 fasi della connessione (33 combinazioni) nessun figlio fuori dalla pillola. Ingranaggio 44×44, «Modifica» 134,8×44, «Fine» 72,5×44, chip multimedia premibile 44 px con area di tocco. |
| Scambio «Modifica» ↔ «Fine», doppio tocco, fuoco | Superato | Opacità mai entrambe sopra 0,15 a 1024×640, anche con movimento ridotto; doppio tocco touch trattenuto a 150 ms e a 120 ms dopo «Fine»; fuoco Modifica → Fine → Modifica; ordine di tabulazione pagina, Sistema, chip, «Modifica». |
| Sistema con la disposizione bloccata | Superato | Ingranaggio visibile e cliccabile a 1024×640, 390×844, 844×390; «Modifica» mostra l'avviso del blocco sopra la fascia. La pagina Sistema vera non è nel banco di prova (il ritorno del fuoco è coperto da `FixSystemFocus`). |
| Vista pagine e «Annulla» | Superato, con compromesso | Distanza pillola-scheda da 16 a 73 px in 9 viewport, prima sovrapposta a 1024×640 (−12,7), 1024×472 (−36,2) e 1280×665 (−9,2). Con la riserva `k` scende a 1024×472 (0,72 → 0,6146) e a 844×390 (0,647 → 0,5099): schede −15 % e −21 % in larghezza (ISSUE-061). |
| Connessione in fase anomala | Superato, con limite | `role=status` sempre nel DOM; nessuna sovrapposizione. La parola va in ellissi: circa 11 px a 640×1024 con 5 pagine, 29 px a 360×640, 0 px a 320×568 (ISSUE-059). |
| Console | Superato, con limite | Nessun `pageerror` né errore in console in 18 combinazioni; l'evento «ResizeObserver loop…» arriva solo a `window.onerror` e a Vite (ISSUE-060). |
| Prestazioni sul tablet, banco 0.9.3, TalkBack, gesto dal bordo superiore, soglia 40rem con testo ingrandito, margine di 12 px, profilo 0.9.2 → 0.9.3, riga «Versione», misure del viewport (tappa 0) | Non eseguito | Tappe 0 e 7, a cura dell'agente principale. `LagRenders` verde e livelli `will-change` ora sulle pillole non sono una misura sul dispositivo. |

## Materiale a pressione — 2026-10-05

Evidenze, scelte e limiti in [REP-20261005-011](reports/REP-20261005-011-materiale-pressione.md); specifica in [design.md](design/design.md#materiale-a-pressione-implementato). Riguarda barra superiore, card di stato (SensorCard), emblema e pulsanti di benvenuto; non converte le altre card.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Contratto del materiale (PressureMaterial.test.jsx) | Superato | Stesso numero di strati nelle ombre di ogni stato, regole di hover/click/selezione, card, movimento ridotto, contrasto dell'inchiostro sul volto arancione, primitiva Card. Mutazione temporanea di un elenco di ombre: test fallito come previsto, file ripristinato. |
| Card in SensorCard | Superato | Classe del materiale nei due layout fuori dalla modifica, assente in modifica. |
| Browser, tema scuro e chiaro, desktop e 390 px | Superato, perimetro limitato | Pillola selezionata, Modifica/Impostazioni circolari, emblema, pulsanti d'azione, hover e finestre Aggiungi scheda/Modifica pagina. Card osservata su replica del markup e degli stili inline: nessuna sessione Home Assistant nel browser di verifica. |
| Tipi, lint, colori, suite | Superato | Typecheck JS + strict HOME; lint senza errori; colori 43 file; 95 file / 752 test sull'host. |
| Build, budget e banco | Superato | Build Compose Node 26, chunk nei limiti; `aca-tunet:1.22.1-aca-press-neu1` healthy, 26 asset iniziali HTTP 200, stesso volume, HA non ricreato. |
| Stato premuto (`:active`), movimento ridotto del sistema, tablet fisico, dispositivi | Non eseguito | `:active` coperto solo dal test sul CSS; preferenza OS non emulata. |

## Finestre di gestione schede e pagine

Evidenze in [REP-20261005-009](reports/REP-20261005-009-gestione-schede-pagine.md); risultato circoscritto al primo gruppo della prosecuzione.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Tipi e lint | Superato | Controllo precedente + strict sulle finestre TSX e test gestione; lint senza errori/warning nel builder Node 26, nessuna dipendenza aggiunta. |
| Regressioni | Superato | 93 file / 728 test. Nuovi casi per selezione/ricerca, sei azioni creazione pagina, impostazioni/eliminazione pagina, focus/Escape e compatibilità delle chiavi icona. |
| Build e bundle | Superato | Index passato da 900,9 KB (oltre budget 900) a 885,3 KB; mx-icons separato in vendor-icons-mx 34,0 KB, limite 500. Soglie invariate. |
| Browser | Superato, perimetro limitato | Aggiunta scheda desktop scuro/chiaro e mobile chiaro 390×844; nuova pagina scuro e catalogo icone a 390/320 px; modifica pagina chiaro desktop/mobile, focus switch 84×48. Nessun salvataggio dati pagina o comando HA. |
| Movimento ridotto | Implementato | Media query estesa ai dialoghi e discendenti; posizione dello switch conserva lo stato. Preferenza OS non modificata/emulata. Non conformità globale. |
| Integrità e link | Superato | 407 file baseline e ZIP integri; 23 fonti protette; 39 documenti, 320 link locali validi e 32 percorsi nel perimetro. |

## Transizioni e skeleton

[REP-20261005-010](reports/REP-20261005-010-pannelli-skeleton.md) registra il perimetro e le evidenze.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Tipi/lint/temi | Superato | typecheck precedente + strict primitive; ESLint senza errori/warning; lint colori 43 file. |
| Regressioni | Superato | 94 file / 740 test nel builder Node 26 isolato; 12 casi nuovi su uscita, riapertura, Escape ripetuto, focus/scroll sovrapposti, timer/evento di fine, movimento ridotto, lazy fallback, fetch stanze e refresh attività. |
| Build/budget | Superato | Index 886,7 KB, sotto 900 KB; tutte le soglie invariate e rispettate. |
| Browser reale | Superato, limitato | Apertura/chiusura desktop: aca-panel-in 0,36 s, uscita aca-panel-out con inert; passaggio Aspetto→Disposizione; fallback lazy osservato. Aggiunta scheda 390×844: stato di caricamento stanze osservato, lista HA poi disponibile, ingombro minimo 216 px, nessun overflow orizzontale. Viewport finale 778×710, un dialogo aperto; nessun comando HA o salvataggio pagina/profilo. |
| Movimento ridotto | Implementato e testato nel ciclo di presenza | Media query disattiva pannelli/backdrop/shimmer; test matchMedia per uscita immediata. Preferenza OS non modificata/emulata nel browser. |
| Servizio locale | Superato | Runtime healthy; root, health e 23 asset iniziali HTTP 200. Stesso volume e stesso container HA; non prova collaudo dei dispositivi, offline o ripristino. |
| Integrità e link | Superato | 407 file baseline e ZIP integri; 24 fonti protette, 40 documenti / 330 link locali, 32 file nel perimetro. |

## Banco 0.9.3 e Tab M11 — 2026-10-14

Fonti: [REP-20261012-003](reports/REP-20261012-003-lag-tablet-prestazioni.md#tab-m11-2026-10-14) e [REP-20261013-002](reports/REP-20261013-002-piano-barra-unica.md). Misure dell'agente principale via USB (adb + CDP) con gli script in `backup/strumenti-tablet/`; app in primo piano a schermo acceso; HA reale.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Banco 0.9.3 | Superato | Copia a freddo prima della build; container `healthy`; `/api/health` con «0.9.3» e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; riga «Versione» di Sistema a «0.9.3» sul M11. Dettagli in [infrastructure.md](infrastructure.md). |
| Viewport del Tab M11 (TB330FU, Chrome 155) | Misurato | Orizzontale 1280×665, verticale 800×1145, DPR 1,5, `screen` 1280×800, carattere di Android al 100 %. Schermo intero e app installata non misurati. |
| L2 sul tablet delle demo (0.9.2) | Misurato | Scorrimento 86-88 fps; vista pagine: apertura 79-82, chiusura 81-85 (era 75-76 con la 0.9). |
| Prestazioni sul Tab M11 (0.9.2 e 0.9.3) | Parziale | Scorrimento 82-88 fps, modifica 88-90. Vista pagine: un fotogramma di 190-370 ms all'apertura e di 156-200 ms alla chiusura. Il criterio «al più 1 fotogramma oltre 50 ms» non è rispettato nella vista pagine. Causa: raster GPU delle ombre dentro le pagine, provata con A/B ([ISSUE-062](project-status.md#issue-062)). Memoria GPU non misurata. |
| TalkBack, gesto dal bordo, margine di 12 px, testo ingrandito, profilo 0.9.2 → 0.9.3, prova con la persona | Non eseguito | Richiedono l'utente sul tablet. |

## Regressioni da conservare quando esiste codice

Una modifica a identità, permessi, trasporto, esecuzione locale o distribuzione degli scenari deve conservare verifiche dei relativi confini. Per un difetto riproducibile registrare il caso, il comportamento atteso e una verifica pertinente dopo la correzione.

L'infrastruttura richiederà prove di recupero e di perdita della connessione; l'AI richiederà casi di rifiuto e confronto tra bozza approvata e scenario attivato. Le misure prestazionali riportano hardware, versioni, carico, durata e criterio di aggregazione: <30ms/<2s non sono valori già garantiti.

## Controlli automatici futuri

CI, controlli dei collegamenti, verifiche di licenze/manifest e protezioni di revisione sono **Pianificati, non implementati né assegnati**. Comandi e strumenti verranno scelti quando esisterà lo stack approvato e un incarico per introdurli. Il controllo manuale del diff non può dimostrare da solo l'assenza di ogni regressione comportamentale.


### 2026-10-14 — Grafici nelle card del kit (REP-20261014-005)

26/26 test galleria/modello/gesti/MetalKit superati, massimo quattro worker. Typecheck, lint, tipografia/colori (zero violazioni), Prettier sui file cambiati e build superati; warning chunk hls preesistente. Chromium senza GPU e separato dai test: 20 card, quattro dimensioni, larghezze 390/1280/1920; grafico e controlli con altezze uguali. Corrette serratura compatta e fascia oraria Nordpool (ricontrollo mirato senza overflow); Pagina conserva scorrimento interno. Verificati gesti luminosità/colore indipendenti, dettagli, ordine, profili, stati, focus e movimento ridotto. Evidenze e limiti in [report 005](reports/REP-20261014-005-grafici-widget.md); serie simulate, nessuna prova su storico HA.

Riesecuzione finale dopo le correzioni geometriche: 15/15 test galleria, modello e gesti superati (tre file, massimo quattro worker); git diff --check superato.


### 2026-10-14 — Pagine per categoria (REP-20261014-006)

151 test pertinenti complessivamente superati: 131 casi LauncherScreen/SystemSheets/LauncherStacks nell’ultima suite, più 20 CategoryPages/LauncherController nella riesecuzione dopo correzioni alle aspettative dei test. Massimo quattro worker. Typecheck, lint, tipografia/colori e build superati; warning hls preesistente. Browser software separato dai test, 390/1280/1920: sette categorie, 25 widget, persistenza della luce associata dopo reload, nessun errore/fallback/overflow orizzontale della pagina; una continuazione a 390. A 1280 verificati pressione lunga, spostamento, ridimensionamento da tastiera, rimozione/Annulla e movimento ridotto. HA fisico e scelta di una vera area non eseguiti. Evidenze e limiti nel [report 006](reports/REP-20261014-006-pagine-categoria.md).


### 2026-10-14 — Categorie iniziali (REP-20261014-007)

28/28 test pertinenti superati, massimo quattro worker. Typecheck, lint, tipografia/colori e build superati; warning hls preesistente. Browser senza GPU e separato dai test a 390/1280/1920: 25 widget creati automaticamente senza azioni di aggiunta; rimozione Sicurezza e reload senza ricreazione, nessun errore. Marcatore di inizializzazione conservato dal validatore e dall’importazione delle istantanee; cambio classe verificato nei test. Evidenze in [report 007](reports/REP-20261014-007-categorie-iniziali.md).


### 2026-10-14 — Griglie di categoria (REP-20261014-008)

152/152 test griglie/controller/geometria/schermata superati; dopo le guardie aggiuntive sulle continuazioni personalizzate, 22/22 griglie/controller rieseguiti e superati. Precedente suite categorie/pile/griglie/controller 30/30. Massimo quattro worker. Typecheck, lint, tipografia/colori, formattazione e build superati; warning hls preesistente. Browser software separato dai test, sette categorie a 390/1280/1920: 25 widget, zero celle libere, nessun errore/overflow orizzontale della pagina. Secondo passaggio dopo la regolarizzazione delle distanze. Migrazione conservativa e persistenza verificate nei test. Distinzione tra primitive del kit e nuovi concept ancora simulati registrata in ISSUE-064. [Report 008](reports/REP-20261014-008-griglie-categoria.md).

### 2026-10-14 — Banco 0.9.7 e tablet collegato (REP-20261014-009)

Richiesta umana di distribuzione su 3002 e prove UI/UX/prestazioni; [report 009](reports/REP-20261014-009-banco-tablet.md). Tab M11 TB330FU reale, Chrome via USB/ADB/CDP, GPU del tablet; eventi touch/tastiera sintetizzati, senza browser locale GPU e separati da Vitest.

| Controllo | Esito | Evidenza e limiti |
|---|---|---|
| Codice | Superato dopo correzioni | Frontend completo 1.849/1.850: un selettore trovava due orologi; corretto, file 10/10. Dopo correzione visibilità 131/131; dopo regressione scroll/tap 47/47. Backend 141/141. Massimo quattro worker. Typecheck/lint, tipografia/colori (0 violazioni), formattazione e build superati; index 411,3 KiB/900, warning hls preesistente. Detector launcher senza rilievi. |
| Banco e dati | Superato nel perimetro | 0.9.7 healthy, health/versione/provider HA/index/asset 200 su loopback e LAN; bundle effettivo sul tablet. Copie a freddo e stesso volume; HA invariato. Ripristino dati non eseguito. |
| Categorie e griglie | Superato | Nove pagine, 25 card di categoria più tre Copertina. Sette categorie a 1280 × 664/665 e 800 × 1144/1145: zero celle libere/sovrapposizioni/fuori griglia, nessun overflow orizzontale. Ripristinata priorità CSS della build: margini e contenuto fuori dalla barra. |
| Associazione e pannelli | Superato per le entità disponibili | 21 pannelli aperti; focus contenuto, testi/scroll e risultati vuoti. Sensore reale scelto, opzioni rese disponibili, lettura/dettagli e scollegamento dopo prova. Card prima dell'associazione visibili, comandi inert. Molti domini senza dispositivi adatti; comandi fisici non provati. |
| Vassoio e modifica | Superato | Otto categorie e ricerca/nessun risultato: pannello 268,79 px costante, fila 144 px, tessere 104 × 128 px. «4 × 1», filtri rapidi, ricerca su tutte le categorie, movimento ridotto (0 animazioni). Tap e drag verticale con preview; scroll touch 1.696 px senza aggiunta/dialogo dopo fix. Pressione lunga, rimozione/Annulla, frecce/Spazio/Escape e reload; card temporanee rimosse. |
| Kit sul banco | Superato come anteprima | Scheda Widget disponibile su 3002, 20 concept e nessun overflow. Dati/controlli/grafici simulati; card operative nelle categorie distinte, ISSUE-064. |
| Fluidità | Parziale | Quiete 90 fps; scorrimento ordinario 82,5–84,7, categorie 81–88, modifica 88,4–88,8. Due giri. Vista pagine: max 345–411 ms apertura e 222 ms chiusura, fino a 6 frame oltre 50 ms. ISSUE-062 rimane aperto. Intervalli rAF, non misura certificata della latenza del dito. |
| Prova umana e copertura estesa | Non eseguito | Dito umano, TalkBack, testo ingrandito, memoria GPU, WAN assente, recovery e comandi/dispositivi mancanti. Calendario/Attività non associati con skeleton e gruppi poco distinguibili registrati come osservazioni UX. Non attestata accettazione o conformità complessiva. |

Evidenze in `backup/tablet-009/`, escluse da Git e prive di autenticazione esportata. Ultima copia `tunet-data-20261014-pre-0.9.7-freddo.tgz`, 218.283 byte; hash, comandi, immagini e limiti nel report. Sessione e disposizione personale mantenute, associazione di prova annullata, rotazione ripristinata; nessun commit o deploy remoto.


### 2026-10-14 — Sistemazione issue e banco 0.9.8 (REP-20261014-010)

[Report 010](reports/REP-20261014-010-sistemazione-issue.md). Vitest sempre con `--maxWorkers=4`, nessun browser sul PC insieme alle suite; Tab M11 via USB/ADB/CDP.

| Controllo | Esito | Evidenza e limiti |
|---|---|---|
| Frontend | Superato | `npx vitest run --maxWorkers=4`: 150/150 file, 1858/1858 test, 397 s. Mirati: 29/29 (categorie, griglie, controller) e 106 (LagLayers e geometria). I due test su Calendario/Attività falliscono senza la correzione; quello su Multimedia/Sonos fissa i nomi. Dopo la revisione Opus: +1 test (la luce non associata resta «Luce»), 1859 test; il file CategoryPages è tornato a LF. |
| Backend | Superato | 17/17 file, 141/141. |
| Statici e build | Superati | typecheck, lint, tipografia (0 su 440 file), colori (0 su 314), i18n 4/4, build e budget; avviso non bloccante sui chunk hls e index. |
| Suite del 2026-10-15 (banco 0.9.9) | Superato | Frontend `npx vitest run --maxWorkers=4`: 150/150 file, 1859/1859 test, 413 s; backend 17/17 file, 141/141; typecheck, lint, tipografia (0/440 file) e colori (0/314 file) senza errori. Nessun test in timeout. Il banco in esecuzione è la 0.9.9 (voce in infrastructure.md). |
| Banco 0.9.8 | Superato | healthy; health 0.9.8 e provider HA 200 su loopback e LAN; bundle `index-BgxLazso.js` anche sul tablet. |
| Calendario/Attività e gruppi sul M11 | Parziale | Zero skeleton; testo di scelta del widget invece di «non associato»; Multimedia e Sonos con nomi distinti ma stesso aspetto. |
| Vista pagine sul M11 | Non conclusivo | Apertura 73,6 fps, massimo medio 215 ms; chiusura 56,0 fps, 226 ms (peggiore 245). Intervalli rAF, tre giri; guadagno non confermato ([ISSUE-062](project-status.md#issue-062)). |
| Revisione finale con Opus | Non eseguito | Richiesta dall'utente; da registrare nel report. |
| TalkBack, testo ingrandito, schermo intero | Non eseguito | Richiedono l'utente. |

### 2026-10-15 — Audit indipendente del resoconto e dell'integrazione adattiva

[REP-20261015-002](reports/REP-20261015-002-audit-resoconto.md). Controlli sul working tree, nessun browser lanciato dall'audit e Vitest sempre con `--maxWorkers=4`. Applicazione e banco non modificati.

| Controllo | Esito | Evidenza e limiti |
|---|---|---|
| Frontend completo | Superato | 153 file, **1913/1913 test**, 398,66 s. Include il test dedicato mostra/nascondi password e le suite gesti. |
| Backend completo | Superato | 17 file, **141/141 test**, 4,47 s. |
| Sonde indipendenti delle regressioni | Fallito | **8/8**: doppi invii da tastiera, throttle aggirato, stato ottimistico permanente, crash entità assente, serratura senza conferma/codice, volume con servizio errato, umidità senza comando, cover con slider non supportato. Mock locali; nessun dispositivo comandato. Configurazione e log in backup/audit-20261015, esclusi da Git. |
| Typecheck / lint frontend e backend | Superato | `npm run typecheck`, `npm run lint` dalla radice acasystem. |
| Tipografia / colori | Superato | Zero violazioni su 448/321 file. |
| Build isolata | Superato | ACASYSTEM_VERSION=0.9.9, outDir in backup/audit-20261015/dist; dist applicativo preservato. Avviso hls >500 kB. |
| Formattazione mirata | Fallito | Quattro dei nove file controllati: LoginForm, AdaptiveCategoryWidget, GestureControl operativo, haEntityToCapabilities. Nessuna riscrittura. |
| Banco in sola lettura | Parziale | HTTP/hash confermano Df7kljmP/HD4WDER4, health 0.9.9 e container healthy. docker diff mostra dist modificato rispetto all'immagine; nuova build audit YZmyFge5 diversa. Riproducibilità e ripristino non provati. |
| Prestazioni finali M11 | Non eseguito | Le misure riportate per la variante con bordo tratteggiato/display:none non convalidano il fade finale; la stessa tabella conserva 4–5 frame >50 ms e picco 222 ms. ISSUE-062 resta aperto. |
| TalkBack, testo effettivamente ingrandito, standalone | Non eseguito | Lo script precedente estrae AXTree/euristiche, imposta font_scale e ruota il display; non dimostra navigazione TalkBack, ingrandimento effettivo del testo web o display-mode standalone. |

I test esistenti superati non dimostrano la copertura dei comportamenti rilevati dalle sonde. ISSUE-064 resta implementato con regressioni aperte, non verificato come integrazione completa; fonte corrente in project-status.md.


## 2026-10-15 — REP-20261015-003, widget operativi e regressioni

Fonte umana: piano completo dei venti tipi nella conversazione e successiva ripresa con tablet scollegato. Otto sonde dell'audit trasferite nella suite permanente. Profili completi/ridotti, target, associazioni mancanti, indisponibilità, rifiuto/conferma, preferenze, dettagli, storici e CSS diretto verificati. Ultimo gruppo capacità/Auto/Stanza: **232/232**, compatibilità minimi/disposizioni: **162/162**. Backend completo finale **141/141**; frontend completo **156 file / 2111 test superati**. Successiva guardia socket, separata dalla suite completa: **125/125** mirati e browser con WebSocket realmente chiuso, zero nuovi comandi.

Banco 3003 privo di proxy/client HTTP in uscita e credenziali reali, CSP same-origin, endpoint HA non simulati respinti. Self-check superato: stesso HTML della build di produzione, target estranei rifiutati. **240 viste** per passata (20 tipi × 4 taglie × 390/1280/1920), due passate di verifica visiva e conferma funzionale finale dopo compatibilità/feature: dettagli da tastiera, impostazioni e riavvio, gesto/throttle/riscontro HA, movimento ridotto, zero errori di pagina e overflow orizzontale. Ultimo controllo Pagina raggiungibile; anteprima camera contenuta.

Typecheck frontend/backend, lint, tipografia/colori, formattazione pertinente e build superati. Ogni invocazione Vitest ha massimo quattro worker; browser separato dalle suite, una sola istanza di prova e GPU disabilitata. Detector eseguito una volta (`[]`), non usato come certificazione.

Volume salvato a freddo e snapshot del filesystem 0.9.9 modificato conservati. Verificato recupero container con gli stessi vecchi asset/dati; backup volume estratto in tmpfs senza rete, SQLite integro e impronte delle tabelle coincidenti. Binding LAN aggiornato a **192.168.1.19**, osservato sul Wi-Fi attuale. Rilascio finale **0.9.10 healthy**, API locale/LAN e proxy HA 200, tutti i **90 file serviti** conformi all’immagine, versione UI isolata 0.9.10, DB integro e tabelle identiche prima/dopo: evidenze in [REP-20261015-003](reports/REP-20261015-003-widget-operativi.md).

**Non eseguito:** M11 nei due orientamenti, ricaricamento e sessione al nuovo URL, ISSUE-062 sulla variante finale (tre aperture/chiusure, ≤1 frame >50 ms e nessun blocco GPU >40 ms), TalkBack, ingrandimento effettivo 125/150% e PWA standalone. Tablet scollegato per comunicazione dell'utente; nessuna impostazione Android modificata e nessun passaggio manuale attribuito all'utente. Dispositivi fisici esclusi per scelta: nessun comando di collaudo agli impianti. Completamento software/PC e accettazione sul tablet restano distinti.

Ultimo backup immediatamente prima del rilascio (23:48): `rep003-20261015-pre-release-volume-freddo.tgz`, 406105 byte, SHA-256 `a613ed9f2259b3cf13f8335c27575eec07bf94f178f771e884db63ad22645026`. Estratto in tmpfs senza rete e confrontato con i dati del rilascio: integrità ok e tutte le impronte coincidenti.

## 2026-10-19 — Prova sul Tab M11 della 0.9.10 (REP-20261019-001)

Ambiente: Tab M11 TB330FU, Chrome 155, 1280×665 @1,5, 90 Hz, via USB (`adb reverse tcp:3002`, CDP su 127.0.0.1:9225), banco `aca-system:0.9.10`, schermo sveglio. Eventi sintetici via CDP; nessun comando a impianti; nessun Vitest.

| Controllo | Esito | Limiti |
|---|---|---|
| 9 pagine, dettagli/configurazione di 21 tipi più separatore, barra e Sistema (versione 0.9.10) | Superato: nessun ErrorBoundary, overflow o sovrapposizione; Esc e fuoco corretti | Nessun widget di categoria associato: scheda «Dettagli» e dati reali non verificati. Rilievi ISSUE-075/076. |
| Flussi di modifica (pressione lunga circa 450 ms, vassoio, aggiunta, trascinamento, ridimensionamento, cestino con Annulla, vista pagine) | Superato salvo ISSUE-077 | Frecce di pagina, colonne, cestino pagina, «Nuova pagina», occhio e casetta non toccati. |
| Console | 0 eccezioni; 1 evento 409 (ISSUE-078) | |
| ISSUE-062, criterio storico (≤1 frame >50 ms; nessun blocco GPU >40 ms) | **Fallito**: chiusura 53,2-58,3 fps, 4-5 frame >50 ms, picchi 233-311 ms; apertura 54,7-60,2 fps, 3-4 frame, picchi 256-378 ms; `GPUTask` massimo 26,7-33,4 ms ma raster continuo 145-246 ms | Tracing +10-15%; un solo tablet e layout; quota GPU inferita. Cause e A/B nel report. |
| Disposizione localStorage del launcher | Identica prima/dopo (tre giri; due chiavi e `tunet_card_settings` ripristinate) | Chiavi Tunet predefinite scritte da Sistema lasciate. |

Non eseguito: TalkBack, testo effettivo 125/150%, app installata, flussi e prestazioni in verticale, comandi dei widget associati. Rettifica a [REP-20261015-001](reports/REP-20261015-001-ripresa-issue062-issue064.md): la dichiarazione di risoluzione di ISSUE-062 è smentita dalle misure sopra.

## 2026-10-19 — Correzioni N1-N5 di ISSUE-062, ISSUE-075 e ISSUE-077, versione 0.9.11 (REP-20261019-002)

Ambiente: PC Windows, Chromium di Playwright headless con GPU disabilitata, CPU rallentata 4× dove indicato, banco isolato `e2e/isolated-server.mjs` su 127.0.0.1:3003 (nessun HA, nessun comando a impianti), un solo browser alla volta; nessun accesso al tablet, al banco Docker o a Git. Il tablet **non** è stato misurato.

| Controllo | Esito | Limiti |
|---|---|---|
| Suite frontend `npx vitest run --maxWorkers=4` | Superato: 159 file, 2142/2142 (primo giro 2136/2140 con 4 fallimenti in `OverviewPan.test.tsx`, corretti) | Backend non rieseguito (nessun file modificato). |
| `npm run typecheck`, `npm run lint`, `lint:typography`, `lint:theme-colors` | Superato (0 violazioni; 459 e 331 file) | Alla fine, dopo l'ultima modifica a `LauncherScreen.tsx`. |
| Costo di stile del pager (CPU 4×, 5800 elementi) | `is-overview` 219-247 → 22-29 ms; `is-closing` 180-279 → 15-20 ms; ricalcolo dei giri apertura 522 → 256 ms, chiusura 758 → 360 ms | Tempi del PC, non del M11; frame >50 ms e picchi del PC (raster software) non confrontabili. |
| Aspetto prima/dopo | 0 pixel diversi in vista pagine e in chiusura congelata a 160 ms; differenze minime solo dove c'è moto o tempo (oscillazione in Modifica, pallino e orologio della fascia) | Non è un confronto di tutti i fotogrammi. |
| Tocco prima/dopo (CDP `Input.dispatchTouchEvent`, `pointercancel` contati) | Identico campo per campo in tre esecuzioni; trascinamenti in chiusura senza `pointercancel` | Headless con CDP, non il dito sul M11. Un pseudo-elemento al posto del livello dei varchi dava `pointercancel`: scartato. |
| Fascia in basso, densità per fotogramma (1280 e 390 px) | Sequenze identiche prima/dopo, zero errori | Lettura dopo i `requestAnimationFrame`. |
| ISSUE-077 (browser del PC) | Dopo «Tutti» 1516 → 8; alla riapertura 1696 → 8 | Non sul tablet. |
| ISSUE-075 (struttura sintetica in 222 px) | Riga 290 senza troncamento → 222 con ellissi | Non una tessera Stanza associata. |
| Build `ACASYSTEM_VERSION=0.9.11` (`vite build` in `backup/rep20261019-002/dist-0911`) | `0.9.11` nel bundle | `dist/` e banco non rigenerati; `e2e/release.check.mjs` fallisce finché il banco non è aggiornato. |

Non eseguito: Tab M11 (criterio storico di ISSUE-062), TalkBack, banco Docker, backend, dati reali. [ISSUE-062](project-status.md#issue-062) resta aperto.

### Annotazione 2026-10-19 — banco 0.9.11, tablet e controlli complessivi (REP-20261019-002)

| Controllo | Esito | Limiti |
|---|---|---|
| Suite frontend `npx vitest run --maxWorkers=4` (passaggio di verifica) | Superato: 159 file, 2143/2143, 420 s | Un test in più del giro precedente (2142), non analizzato. |
| typecheck, lint, `lint:typography`, `lint:theme-colors`, `i18n:check` | Superati (uscite 0) | `format:check` non eseguito. |
| `npm run build`, `check-bundle-size.mjs` | Superati; index 800,5 KB su 900 KB | Avviso Vite sui chunk >500 kB. |
| Backend `npm run test -w backend -- --maxWorkers=4` | 17/17 file, 141/141 | Nessun file backend modificato. |
| Banco 0.9.11 | Immagine `aca-system:0.9.11` (`sha256:90869e9c...ecd4`); healthy; `/api/health` 0.9.11 e `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.7; copia a freddo di 428858 byte, SHA-256 `02897625...6508` | Ripristino non provato in questo incarico. |
| Tab M11, ISSUE-075 | Titolo intero (43 = 43), sottotitolo con ellissi (253 > 204) | Tessera non associata, eventi sintetici. |
| Tab M11, ISSUE-077 | scrollLeft 1696 → 8 dopo «Tutti» e alla riapertura | Eventi sintetici. |
| Tab M11, tocco nella vista pagine | Come prima (scorrimento, trascinamento tra le schede, apertura di una scheda, chiusura, Fine) | Eventi touch CDP, non il dito. |
| Tab M11, prestazioni vista pagine | Apertura 61,6-66,3 fps, 3-5 frame >50 ms; chiusura 60,2-65,0 fps, 4-6 frame >50 ms (0.9.10: 54,7-60,2 / 3-4 e 53,2-58,3 / 4-5) | **Criterio storico non rispettato**; ISSUE-062 aperto; nessuna traccia a schermo acceso. |
| Revisione: Layerize e Paint (PC, CPU 4×) | Layerize circa raddoppiato (ingresso 99-116 → 196 ms, uscita 79-88 → 172-176 ms); Paint all'uscita 141-160 → 261-290 ms; occupazione totale all'uscita 847-904 contro 1107-1187 ms | Sonde del revisore, non rieseguite qui; non misurato sul M11. |

Non eseguito: TalkBack, testo 125/150%, app installata, verticale, widget associati con entità reali, confronto pixel automatico sul tablet. Console del tablet: un `409 Conflict` su `/api/settings/current` durante la prova del vassoio (layout invariato; ISSUE-078).

## 2026-10-19 — ISSUE-076, widget non associati (opzione B), banco 0.9.12 (REP-20261019-003)

Ambiente: PC Windows, Vitest con `--maxWorkers=4`, un solo Chromium headless con GPU disabilitata alla volta (mai insieme alla suite), poi il Tab M11 (TB330FU, 1280×665 a DPR 1,5, `adb reverse 3002`). Nessun comando a impianti, nessuna credenziale, nessun commit.

| Controllo | Esito | Limiti |
|---|---|---|
| Test del perimetro `CategoryPages` e correlati (`--maxWorkers=4`) | CategoryPages 20/20; 12 file 314/314 | Test nuovi su pulsante unico, nome e descrizione per 19 tipi, taglia a una riga, etichetta in modifica, nessun servizio, `unknown`, Calendario/Attività, assenza di `opacity`, layer che ritaglia. |
| `npx vitest run --maxWorkers=4` (suite frontend) | 159 file, 2155/2155, nessun timeout | Un giro. |
| `npm run typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check` | Superati (459 e 331 file) | `format:check` non eseguito. |
| `npm run build`, `check-bundle-size.mjs` | Superati; index 820,77 kB (gzip 242,33 kB), 801,5 KB su 900 KB | Avviso Vite sui chunk >500 kB. |
| Backend `npm run test -w backend -- --maxWorkers=4` | 17 file, 141/141 | Nessun file backend modificato. |
| Browser headless, 112 viste (1280×665 e 390×844, chiaro/scuro, fuori/in modifica, normale e a una riga) | 110 senza problemi; 2 con un contatto di circa 6 px nella tessera Tosaerba a 390 px (dichiarato, non corretto) | Controllo del rosso su testo, riempimenti, tratti, sfondi, bordi, contorni e LED; PC, non tablet. |
| `interazione.mjs` a 1280×665 | Tessere associate e Calendario/Attività invariati; caso senza cornice: il bersaglio non esce dalla tessera | Nessuna richiesta verso altri host. |
| Banco 0.9.12 | Immagine `aca-system:0.9.12` (`sha256:eeff9370...d4e6`); healthy; `/api/health` 0.9.12 e `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.7; copia a freddo di 429401 byte, SHA-256 `40fd0b5a...97c3a`, `tar -tzf` 4 voci | Ripristino non provato. |
| Tab M11, widget non associati, sette pagine di categoria | Un solo «Collega <tipo>» per widget, dentro la tessera; pillola 151×51 px, cerchio 48×48 px (tessere 222×89 e 89×89); nessun «Non disponibile»; Calendario/Attività invariati | Eventi sintetici e CDP, non il dito. |
| Tab M11, in modifica | Nessun pulsante; «Da collegare» in tutti i 19 non associati, un solo elemento per tessera | Spostamento/ridimensionamento col dito non provati. |
| Tab M11, tocco su «Collega Ventilatore» | Apre «Impostazioni del widget»; Esc chiude; nessun salvataggio | Nessuna associazione. |
| Tab M11, `localStorage` del launcher | 34 chiavi, identiche prima e dopo | Token omessi. |
| Tab M11, prestazioni (0.9.12 contro 0.9.11) | Scorrimento 80,8-84,7 fps (80-85); apertura vista pagine 62,6 fps (62-66); **chiusura 58,9-59,0 fps (60-65), picco 267 ms (178-256)**; quiete 90 fps; entrata in modifica 81,5 fps; uscita 90 fps; sette categorie 80,1-85,4 fps | Equivalenti, salvo la chiusura della vista pagine, circa 1 fps sotto la fascia: da seguire. Il criterio storico di ISSUE-062 resta non rispettato. |

Non eseguito: prova col dito in modifica, TalkBack, testo al 125/150%, verticale, app installata, widget associati con entità reali, `release.check.mjs` (manifest della 0.9.10). [ISSUE-076](project-status.md#issue-076) resta in attesa della conferma dell'utente sul grado di attenuazione. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md).

## 2026-10-19 — ISSUE-076, anteprima attenuata corretta, banco 0.9.13 (REP-20261019-003)

Ambiente: PC Windows, Vitest con `--maxWorkers=4`, un solo Chromium headless con GPU disabilitata alla volta (mai insieme alla suite), poi il Tab M11 (HA2KZKYB, 1280×665 a DPR 1,5, `adb reverse 3002`). Nessun comando a impianti, nessuna credenziale, nessun commit.

| Controllo | Esito |
|---|---|
| `npm run typecheck`, `npm run lint`, `lint:typography` (459 file), `lint:theme-colors` (331 file), `i18n:check` | Superati |
| Vitest, suite completa (`--maxWorkers=4`) | 159 file, 2160 test superati (`suite-1.txt`); CategoryPages 25/25 |
| `npm run build`, `scripts/check-bundle-size.mjs` | Superati; `index-BtTvMahl.js` 802,5 kB su 900 kB |
| Backend, `npm run test -w backend -- --maxWorkers=4` | 17 file, 141 test superati |
| Browser headless (`verifica-browser.mjs`, `rete.mjs`, `interazione.mjs`) | 200 tessere su 200 senza problemi (due disposizioni); nessuna richiesta a host esterni in 25 s sulla videocamera; interazione invariata |
| Banco 0.9.13 | Immagine `aca-system:0.9.13` (`sha256:bb5962d5...78c4b35`); healthy; `/api/health` 0.9.13, `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.7; copia a freddo di 428046 byte (SHA-256 `141df0df...433f39`) |
| Tab M11, schermate | Fuori dalla modifica nessun «Non disponibile», pulsante dentro la tessera (151×51 px; 48×48 px a una riga); in modifica «<Tipo> / Da collegare» senza pulsante, «Senso…» non più troncato; il tocco apre «Impostazioni del widget» (Ventilatore e Tapparella); `localStorage` identico (34 chiavi) |
| Tab M11, prestazioni (0.9.13 contro 0.9.12) | Scorrimento 78,8-82,7 fps (0.9.12: 80,8-84,7); apertura vista pagine 57,7-61,2 fps (62,6); chiusura 53,8-58,0 fps (59); entrata in modifica 78,8-80,3 fps; sette categorie 79,4-85,4 fps con un picco di 111 ms al primo passo. Nel rumore, circa 1-2 fps in meno; il criterio storico di ISSUE-062 resta non rispettato |

**Problemi residui sul tablet (non risolti):** nome del tipo assente in molte tessere (solo icona), Allarme quasi vuoto, pulsante sovrapposto al riquadro della Videocamera e alla fila dei controlli di Multimedia e Sonos, «Sensore o entità» troncato nelle 1×1, tessere 1×1 con solo cerchio e nome sotto.

Non eseguito: prova col dito in modifica, TalkBack, testo al 125/150%, verticale, app installata, widget associati con entità reali, `release.check.mjs` (manifest della 0.9.10), altri browser. [ISSUE-076](project-status.md#issue-076) resta in attesa dell'utente. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md).

## 2026-10-19 — ISSUE-076, revisione della sesta passata (settima passata, REP-20261019-003)

Ambiente: PC Windows, Vitest con `--maxWorkers=4`, un solo Chromium headless con GPU disabilitata alla volta (mai insieme alla suite). Nessun comando a impianti, nessuna credenziale, nessun commit. Il banco non è stato aggiornato e il tablet non è stato usato.

| Controllo | Esito | Limiti |
|---|---|---|
| `verifica-browser.mjs` (19 tipi; 1280×665, 1280×646 con griglia 8×5 del tablet, 390×844; chiaro/scuro; fuori/in modifica) in tre disposizioni: originale, tessere 1×1, tessere 2×1 | **228 su 228** per disposizione, con sagome neutre, `shapes === 0` ora errore per ogni tipo e misura estesa agli pseudo-elementi; in più 20 su 20 a 390×680 (1×1 di 71×71) | Emulazione del tablet; il numero di elementi disegnati per tipo non prova la riconoscibilità (screenshot); eccezione dichiarata: 1×1 senza icona del tipo |
| Stesso controllo con `FONT=125` e `FONT=150` (dimensione del carattere radice, 1280×646 e 390×844) | Tessere a una riga 76/76 (125%, chiaro e scuro) e 38/38 (150%); tessere piene 38/38 e 38/38; nessun cerchio fuori dalla tessera | Approssimazione, non lo zoom del testo di Chrome Android; con testo ingrandito nome, icona, distanza, tagli e anteprima sono limiti notati (a 150% nella 2×2 da 128 px il pulsante sporge di circa 2 px) |
| Rete: richieste dal primo `goto`, altri host e percorsi `/ha/`, `/api/`, `camera_proxy` dello stesso host; `rete.mjs` con controllo positivo | 0 richieste verso altri host o HA/videocamera in tutti i contesti (7512 e 10512 richieste dal primo caricamento per disposizione, di cui 0 dopo il caricamento; `rete.mjs`: 375 per contesto, solo il WebSocket di Vite); controllo positivo visto | Anteprima con fixture, senza il proxy del banco; garantito dal codice: `getEntityImageUrl: () => null`, `conn: null`, nessuna sorgente nel layer |
| `esc-probe.mjs` (disposizione del tablet, tocco CDP + Escape) | `[role=dialog]` sempre 1 (`div.aca-popover` nascosto), `dialog[open]` 0, 1, 0, 1, 0: Esc chiude; l'osservazione sul tablet era un artefatto del selettore | PC, non tablet; nelle prove future sul tablet usare `dialog[open]` |
| `interazione.mjs` | Invariata (un solo pulsante 151×51 px per tessera; tocco, Invio e dito aprono «Impostazioni del widget», Esc la chiude; Calendario e Attività; tessera senza cornice) | PC |
| Vitest `CategoryPages` | 31/31 (29 + 2 test nuovi; mutazioni del CSS: falliscono) | |
| `npx vitest run --maxWorkers=4` (suite frontend) | 159 file, 2166/2166, nessun timeout (420 s) | Un giro. |
| `npm run typecheck`, `lint`, `lint:typography` (460 file), `lint:theme-colors` (331 file), `prettier --check` sui file toccati | Superati | Backend, build e `i18n:check` non rieseguiti (nessun file interessato oltre al frontend). |

Non eseguito: banco nuovo, misura e prova sul Tab M11 (costo delle barre e di `useClearPath`), prova col dito, TalkBack, testo ingrandito con lo zoom vero di Chrome Android, widget associati con entità reali. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md), sezione «Settima passata».

## 2026-10-19 — ISSUE-076, cinque punti del Tab M11 (sesta passata, REP-20261019-003)

Ambiente: PC Windows, Vitest con `--maxWorkers=4`, un solo Chromium headless con GPU disabilitata alla volta (mai insieme alla suite). Nessun comando a impianti, nessuna credenziale, nessun commit. Il banco non è stato aggiornato e il tablet non è stato usato (in sospensione).

| Controllo | Esito | Limiti |
|---|---|---|
| `verifica-browser.mjs` (19 tipi; 1280×665, 1280×646 con griglia 8×5 del tablet, 390×844; chiaro/scuro; fuori/in modifica) in tre disposizioni: originale, tessere 1×1, tessere 2×1 | 228 tessere su 228 senza problemi per disposizione: nome del tipo visibile, una sola icona, ≥ 8 px dall'anteprima, pulsante ≥ 48 px (≥ 44 nelle 1×1) dentro la tessera, nessun testo vietato né rosso, nessuna richiesta di rete (anche 12 s sulla Videocamera), nessun elemento tagliato o sopra il pulsante; in più 20 su 20 a 390×680 (1×1 di 71×71) | Emulazione del tablet, non lo schermo; eccezioni dichiarate: 1×1 senza icona del tipo, Meteo/Stanza/Costi/Prezzo senza altra forma, «Ventilatore» troncato a 71×71. I controlli sono stati provati con mutazioni del CSS. |
| `interazione.mjs` | Un solo pulsante 151×51 px per tessera; tocco sull'angolo, Invio e dito aprono «Impostazioni del widget» col fuoco dentro, Esc la chiude; Calendario/Attività invariati | PC, non tablet; Esc con tasto vero sul tablet non riprovato (rettificato nella settima passata: Esc chiude anche sul tablet, l'osservazione era un artefatto del selettore `[role=dialog]`). |
| Vitest `CategoryPages` e 10 file correlati | 29/29; 298/298 | |
| `npx vitest run --maxWorkers=4` (suite frontend) | 159 file, 2164/2164, nessun timeout (420 s) | Un giro. |
| `npm run typecheck`, `lint`, `lint:typography` (460 file), `lint:theme-colors` (331 file), `prettier --check` sui file toccati | Superati | Backend, build e `i18n:check` non rieseguiti (nessun file interessato oltre al frontend). |

Non eseguito: banco nuovo, misura e prova sul Tab M11, Esc con tasto vero, prestazioni di `useClearPath`, prova col dito, TalkBack, testo al 125/150%, verticale, app installata, widget associati con entità reali. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md), sezione «Sesta passata».

## 2026-10-19 — ISSUE-076, rifinitura e banco 0.9.14 (REP-20261019-003)

Ambiente: PC Windows, Vitest con `--maxWorkers=4`, un solo Chromium headless con GPU disabilitata alla volta (mai insieme alla suite), poi il Tab M11 (HA2KZKYB, 1280×665 a DPR 1,5, CDP via `adb forward 9225`, `adb reverse 3002`). Nessun comando a impianti, nessuna credenziale, nessun commit.

| Controllo | Esito | Limiti |
|---|---|---|
| `npm run typecheck`, `lint`, `lint:typography` (460 file), `lint:theme-colors` (331 file), `i18n:check` (4 test) | Superati | |
| `npx vitest run --maxWorkers=4` (frontend) | 159 file, 2166/2166, nessun timeout, nessun rerun (`suite-1.txt`) | Un giro. |
| `npm run build`, `scripts/check-bundle-size.mjs` | Superati; chunk entro i limiti | Avviso non bloccante di chunk vendor sopra 500 kB. |
| Backend, `npm run test -w backend -- --maxWorkers=4` | 17 file, 141/141 | |
| `verifica-browser.mjs` (19 tipi, tre viste, chiaro/scuro, fuori/in modifica) | 228 su 228 in tre disposizioni; 20 su 20 a 390×680 | A testo 125% e 150% **non sono prove superate**: la modalità `FONT` trasforma in note i fallimenti dei controlli a, b, c, g e «forma»; «76/76 e 38/38» delle voci precedenti misurano solo dimensione del pulsante, rosso, parole vietate e ordine di sovrapposizione (rettifica della seconda revisione). Il carattere radice approssima, non è lo zoom di Chrome Android. |
| Seconda revisione sul layout reale del tablet (1280×646, DPR 1,5) | Cinque punti passati a testo 100%; nessun elemento a meno di 8 px dal nome o dal pulsante; rete a zero verso HA e videocamera con controllo positivo | **Due rilievi bassi non corretti:** barra orfana e frammento al bordo a testo 125% (Allarme, Prezzo dell'energia); `visible()` e modalità `FONT` misurano meno di quanto dichiarato. |
| Banco 0.9.14 | Immagine `aca-system:0.9.14` (`sha256:b6b2af01...4995`); healthy; `/api/health` 0.9.14, `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.27; copia a freddo di 428218 byte (SHA-256 `5fbe0050...3814`) | Le verifiche sopra non sono state rieseguite dal passo del banco. IPv4 del PC cambiato in 192.168.1.27. |
| Tab M11, schermate (bundle `index-D_SGyR0e.js`, cache svuotata) | Fuori dalla modifica icona e nome del tipo una sola volta in tutte le tessere normali (nome 19 px, senza troncamenti); Allarme con nome e anteprima; pulsante 151×51 px (48×48 px compatte) dentro la tessera, 0 elementi sotto su Videocamera, Multimedia e Sonos; 1×1 con il nome su due righe (30 px) e cerchio 48 px; in modifica «<tipo> / Da collegare» senza pulsante; nessun «Non disponibile», «Spento» o rosso; Calendario, Attività, Orologio e Spaziatore senza pulsante | Falsi allarmi dei controlli: `nameOverBtn` sul Sensore 1×1 (scarto di 1 px del line box) e `shapes0` sulla Stanza (pseudo-elemento non contato), verificati sugli screenshot. |
| Tab M11, tocco e Esc (`Input.dispatchTouchEvent`, `Input.dispatchKeyEvent`) | «Collega» su Ventilatore e su Sensore 1×1 apre «Impostazioni del widget»; Esc la chiude 2 su 2 e «Chiudi» 2 su 2, senza salvare, fuoco sulla maniglia del widget; `localStorage` identico (34 chiavi) | Punto 5 non è un difetto. Dopo la chiusura la sessione di modifica del widget resta attiva (chiusa con «Fine»). Esc con Indietro (`adb input keyevent 111`) non provato. |
| Tab M11, prestazioni (0.9.14 contro 0.9.13, 2 giri) | Scorrimento 73,3-78,1 fps (78,8-82,8); sette categorie 76,2-80,1 fps (79,4-85,4); ritorno a Principale 49,0-52,3 fps (35,7-49,3); entrata in modifica 77,2-78,1 fps; apertura vista pagine 55,9-58,4 fps, picchi 345 ms (57,7-61,2; 333-334); **chiusura 52,1-52,7 fps, picchi 378-389 ms (53,8-58,0; 256-278)**; quiete e uscita 90 fps | Due giri non separano il costo del nuovo codice dal rumore. Picchi della chiusura circa 40-45% più alti: da seguire con ISSUE-062, che resta non rispettato. |

Non eseguito: prova col dito in modifica, TalkBack, zoom vero del testo, verticale, app installata, widget associati con entità reali, Videocamera con rete reale, `release.check.mjs` (manifest della 0.9.10), correzione dei due rilievi bassi. [ISSUE-076](project-status.md#issue-076) resta in attesa dell'utente. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md), sezione «Rifinitura e banco 0.9.14».

## 2026-10-20 — Widget non associati: widget completo spento con etichetta, ISSUE-075 (REP-20261020-001)

Ambiente: PC Windows, Vitest con `--maxWorkers=4`, un solo Chromium headless con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing` alla volta (mai insieme alla suite), vite sul PC e fixture senza Home Assistant. **Nessuna prova sul Tab M11**, nessun banco nuovo (il 3002 resta `aca-system:0.9.14`), nessun comando a impianti. Script ed esiti in `backup/rep20261020-001/` (esclusa da Git).

| Controllo | Esito | Limiti |
|---|---|---|
| `npm run typecheck`, `lint`, `lint:typography` (459 file), `lint:theme-colors` (331 file), `prettier --check` sui cinque file toccati | Superati | Typecheck strict su tutto `src`, test inclusi. |
| `npx vitest run --maxWorkers=4` (frontend), dopo l'ultima modifica al codice | 159 file, **2164/2164**, 829 s, nessun rerun (`suite-3.txt`, dopo la revisione); prima della revisione 2162/2162 (`suite-2.txt`) | Una prima suite intermedia 2161/2161 (`suite-1.txt`). Backend non rieseguito (nessun file toccato). |
| `CategoryPages.test.tsx` e `TextAndTrayFixes.test.tsx` | 27/27 e 6/6 | Per i 19 tipi: widget completo senza guasto né rosso, stato per tipo, nessuno stato falso su serratura/allarme/videocamera, etichetta fuori e in modifica, un solo bersaglio «Collega <tipo>», nessun servizio né rete, nessun pulsante grande, `useClearPath` assente; **Allarme senza icona di stato e Serratura mai con un solo tasto in 2×2, 2×1, 1×1 e 1×2 (falliscono senza le regole del CSS)**; bersaglio di Calendario e Attività come prima. |
| Regressione ISSUE-075 senza la correzione | **Fallisce** con `utilities.css` precedente (1 test), supera con la correzione | |
| `verifica-browser.mjs` (adattato ai nuovi criteri), tre disposizioni (originale, una cella, due celle) × 1280×665, 1280×646 con griglia 8×5, 390×844 × chiaro/scuro × fuori/in modifica | **684 misure di tessera, 0 con problemi** (ripetute dopo la revisione con i controlli nuovi su Allarme, Serratura e Stanza) | Etichetta dentro la tessera e leggibile, nessuna sovrapposizione con nome e controlli (più di 3 px per lato; testo `sr-only` e aperture trasparenti esclusi), nessun testo di guasto o di sicurezza, nessun rosso, un solo bersaglio per tessera, rete a 0 verso altri host/HA/videocamera. Note dichiarate: Meteo e serratura 1×1 senza nome, Multimedia/Sonos senza forma nella 2×2 del tablet, tasti attenuati in modifica, etichetta ridotta all'icona sotto 8 rem. Testo al 125/150% non provato. |
| Cinque guasti voluti (`mutazioni.sh`); due guasti nuovi (icona dell'Allarme, tasto singolo della Serratura) | Tutti rilevati; il giro senza guasti 8 tessere, 0 problemi | I due nuovi con `INJECT_CSS` su `verifica-browser.mjs` (`shots-mut/`). |
| `interazione.mjs` (mouse e tastiera veri, 1280×646, chiaro/scuro) | 38/38 | Tocco su centro, etichetta, cornice e comandi apre «Impostazioni del widget», Esc chiude, Tab arriva sul bersaglio con l'anello dentro la tessera, Invio apre; in modifica nessun tocco apre. Non è la prova col dito sul tablet. |
| `issue075.mjs` (Stanza senza dispositivi a 194, 174 e 256 px, chiaro/scuro; `LAYOUT=orig`, `row2`, `row1`) | 2×2: due righe senza tagli in 6 contesti su 6; con la regola precedente (`MUTATE=1`) una riga tagliata in 6 su 6. 2×1 e 1×1 (rettifica della revisione): una riga con l'ellissi in 12 contesti su 12, misure identiche alla regola precedente | Scheda `room_card_*` senza tipo di categoria; una Stanza di categoria associata a un'area reale vuota non provata. Il box del dettaglio resta più basso del testo (17 su 18,7 px sul tablet, 11 px sul telefono) come prima. |

**Terza passata (2026-10-20):** `CategoryPages.test.tsx` + `TextAndTrayFixes.test.tsx` 34/34 (con il `launcher.css` precedente falliscono 2 test); typecheck, lint, tipografia (0 su 459), colori (0 su 331), prettier superati; `run-review2.sh` (3 disposizioni, 684 misure di tessera, **0 problemi**, 0 richieste di rete esterne) e `issue075.mjs` in 3 disposizioni superati; guasti nuovi rilevati (`mutazioni2.sh`: Serratura 1×1 senza nome, Videocamera con «Anteprima»). Suite completa **non rieseguita** in questa passata (ultima: 159 file, 2164/2164). Meteo: provato a nascondere la nuvola, 12 contesti con «nessuna forma del widget», regola tolta (dichiarato). Evidenze in `backup/rep20261020-001/`.

Non eseguito: banco 0.9.15 e misura sul Tab M11 (fluidità: da confrontare con 0.9.13 e 0.9.14; il rilievo di revisione «fluidità non verificata» resta aperto), prova col dito, TalkBack, testo ingrandito, verticale, app installata, widget associati con entità reali. [ISSUE-075](project-status.md#issue-075) corretto nel software; [ISSUE-076](project-status.md#issue-076) in attesa della misura sul tablet. Dettagli: [REP-20261020-001](reports/REP-20261020-001-widget-spenti-stanza.md).

## 2026-10-20 — Banco 0.9.15 e misure sul Tab M11 (REP-20261020-001)

| Controllo | Esito | Note |
|---|---|---|
| `npm run typecheck`, `lint`, `lint:typography` (0 su 459), `lint:theme-colors` (0 su 331), `i18n:check` (4/4) | Superati | Frontend, prima della build. |
| `npx vitest run --maxWorkers=4` (frontend, completa) | 159 file, 2165/2165, 863 s | Da sola, senza browser. |
| `npm run test -w backend -- --maxWorkers=4` | 17 file, 141/141 | |
| `npm run build`, `check-bundle-size.mjs` | Superati | Indice 801,8 KB su 900 KB; avviso Vite su chunk >500 kB (hls 574 kB, indice). |
| Banco 0.9.15 | Healthy, `/api/health` 0.9.15 | Bundle `index-BGkr_FM2.js` con «Da collegare», senza `aca-category-widget__button` né `useClearPath`. Copia a freddo prima. |
| Tab M11, 7 pagine, fuori dalla modifica | Superato | 19 tessere non collegate su 22: widget completi non attenuati, etichetta dentro la tessera, senza sovrapposizioni, senza «Non disponibile», rosso, immagine di videocamera o falso stato di sicurezza; Calendario, Attività, Orologio, Data, Meteo di casa invariati. |
| Tab M11, modifica | Superato | Etichetta in 19 tessere, nessun bersaglio «Collega», uscita riuscita. |
| Tab M11, tocco (`Input.synthesizeTapGesture`) | Superato | Ventilatore 222×195 e Luce 1×1 89×89 aprono «Impostazioni del widget»; chiusura senza salvare. `localStorage` 34 chiavi prima e dopo. |
| Tab M11, prestazioni (0.9.15 contro 0.9.13 e 0.9.14) | Fluidità ai livelli della 0.9.13 | 0.9.15: scorrimento 78,9-84,7 fps (picchi 56-100 ms); sette categorie 80,7-86,0 fps (44-89 ms); apertura vista pagine 57,9 fps (344-367 ms); chiusura 58,1-60,3 fps (200-245 ms); entrata in modifica 81,5-81,8 fps; quiete 90 fps. 0.9.13: 78,8-82,8; 79,4-85,4; apertura 57,7-61,2 (333-334 ms); chiusura 53,8-58,0 (256-278 ms). 0.9.14: 73,3-78,1; 76,2-80,1; apertura 55,9-58,4 (345 ms); chiusura 52,1-52,7 (378-389 ms). Ritorno a Principale 50,9-52,9 fps (max 200-222 ms), non confrontato. `container-type: size` non isolato con prova A/B. Due giri. |

Non eseguito: prova col dito in modifica, TalkBack, testo al 125/150%, verticale, app installata, widget associati con entità reali, criterio storico di ISSUE-062 (frame >50 ms). [ISSUE-062](project-status.md#issue-062) e [ISSUE-076](project-status.md#issue-076) restano da chiudere dopo il controllo dell'utente.

## 2026-10-20 — Widget non associati in grigio (quarta passata, REP-20261020-001)

| Controllo | Esito | Note |
|---|---|---|
| `npx vitest run --maxWorkers=4 src/__tests__/CategoryPages.test.tsx` | 31/31 | 3 test nuovi (grigi, chiusura dei token derivati, TV senza «!» e con «Spento» una volta); con il `launcher.css` precedente falliscono 5 test. |
| `npx vitest run --maxWorkers=4` (frontend, completa) | 159 file, 2168/2168, 452 s | Da sola, senza browser. Backend non rieseguito (nessun file toccato). |
| `npm run typecheck`, `lint`, `lint:typography` (0 su 459), `lint:theme-colors` (0 su 331); `prettier --check` sui due file toccati | Superati | |
| Browser headless, controllo del grigio `k:` (`backup/rep20261020-001b/verifica-browser.mjs`): nessun colore calcolato con saturazione HSL > 15% (e spread dei canali > 20/255) in `color`, sfondi e gradienti, bordi, `outline`, `fill`, `stroke`, `stop-color`, `box-shadow`, `text-shadow`, `filter`, `::before`/`::after`; contrasto del testo ≥ 4,5:1 (3:1 se grande); nessuna icona di avviso; nessuno stato ripetuto | 684 misure di tessera (1280×665, 1280×646 con griglia 8×5, 390×844; chiaro e scuro; fuori e in modifica; originale, una cella, due celle), **0 con problemi**; contrasto minimo fuori dalla modifica 5,01:1 (chiaro) e 6,93:1 (scuro); rete: 0 richieste verso altri host, HA o videocamera | In modifica «Avvia» di Aspirapolvere e Tosaerba (tasto inattivo attenuato al 45% come in ogni widget, 2,41:1 e 3,62:1) è dichiarato, non un guasto (WCAG 1.4.3: componente inattivo). Misura dei colori calcolati, non dei pixel. Solo PC (rasterizzatore software), non Tab M11. |
| Prova con guasti voluti (`mutazioni.sh`, `INJECT_CSS`, chiaro e scuro) | Senza guasto 0 su 19; con ciascun guasto rilevato: testo blu, token blu rimesso, sfumatura blu, tratto blu delle icone, bordo blu, bagliore blu, pseudo-elemento blu, etichetta blu, viola del Kit 2 rimesso, icone blu, riga di stato della TV rimessa (icona di avviso e «Spento» ripetuto), testo grigio a contrasto insufficiente | `esito-mutazioni-light.txt`, `esito-mutazioni-dark.txt`. |
| **Rettifica datata 2026-10-20** alle due righe `k:` sopra (REP-20261020-001, quinta passata): `stop-color` e i `::-webkit-slider-*` risultavano elencati ma **non erano misurati** (gli `<stop>` hanno riquadro 0×0 e venivano scartati; `fill`/`stroke: url(#id)` non contengono colori; `getComputedStyle` dei `::-webkit-slider-*` dà `content: normal`). Ora: i gradienti SVG sono letti risolvendo `url(#id)` (anche via `href`) e leggendo `stop-color` × `stop-opacity`; i `::-webkit-slider-*` non sono misurati (solo i loro token); regola stretta (spread > 3/255, alfa ≥ 0,02) per inchiostro, tratti, bordi, ombre e stop; controllo diretto dei 69 token ridichiarati dalla tessera (croma zero); anello di focus del bersaglio. Trovata e corretta una tinta lieve in scuro (`--k2-light` nelle coppie di ombre, croma 0,01) | Senza guasto 0 su 19 (chiaro e scuro); guasti M1-M18, compresi gradiente SVG blu nel riempimento e nel tratto (via `href`), inchiostro con croma 0,012, bagliore blu con alfa 0,06, anello di focus blu e `--k2-light` con tinta, **tutti rilevati** in chiaro e in scuro (M9 in scuro con `#c8c8c8` dà 0 come atteso). Tre disposizioni complete: 684 misure di tessera, 0 con problemi; `CategoryPages.test.tsx` 31/31 (con il `launcher.css` precedente 1 test fallisce); suite 159 file, 2168/2168; typecheck, lint, tipografia, colori e prettier superati | Limiti: colori calcolati, non pixel; non misurati `::-webkit-slider-*`, immagini, `mask`, `border-image`, cornice e ombra della tessera (domanda aperta, ISSUE-082); le forme con `url(#id)` nei segnaposto reali sono 0 (prova con markup iniettato, `INJECT_SVG`); solo PC, non Tab M11. |

Non eseguito: prova sul Tab M11 (nessun banco nuovo: il 3002 resta `aca-system:0.9.15` con il blu), `interazione.mjs` con eventi veri (tocco e tastiera sulla tessera grigia), TalkBack, testo ingrandito, widget associati con entità reali.

## 2026-10-20 — Banco 0.9.16 e grigio sul Tab M11 (REP-20261020-001)

Il «Non eseguito» della sezione «Widget non associati in grigio» (nessun banco nuovo, nessuna prova sul Tab M11) è superato per questa parte; il testo resta come storico.

| Controllo | Esito | Evidenza |
|---|---|---|
| `typecheck`, `lint`, `lint:typography` (0 su 459), `lint:theme-colors` (0 su 331), `i18n:check` (4/4) | Superati | Prima della build |
| `npx vitest run --maxWorkers=4` (frontend) | 159 file, 2168/2168 | `backup/rep20261020-001b/suite-1.txt` |
| `npm run test -w backend -- --maxWorkers=4` | 17 file, 141/141 | |
| `npm run build`, `scripts/check-bundle-size.mjs` | Superati | vendor-react 177,5 KB su 200 KB |
| Banco 0.9.16 | Healthy; `/api/health` 0.9.16; `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.27 | Immagine `aca-system:0.9.16` ID `sha256:d4f8e3e6401a`, creata 2026-10-20T12:22:12Z; bundle `index-vfVqDHyF.js`; copia a freddo prima (SHA-256 `55fbb0e1e89bc24440b3ca21c689a7a173a8912200f941943058fe2d5b0d5a3c`) |
| Tab M11, 19 tessere non collegate, fuori e in modifica | Nessun colore principale (scarto dei canali oltre 20/255), nessun «!», «Non disponibile», rosso, `filter`, `opacity`; etichetta una per tessera; «Spento» al più una volta; un solo «Collega <tipo>» fuori dalla modifica, zero in modifica | `backup/rep20261020-001b/tablet/` |
| Tab M11, tocco | `Input.synthesizeTapGesture` su Ventilatore e Luce 1×1 apre «Impostazioni del widget» | Chiusa senza salvare; `localStorage` 34 chiavi invariate |
| Tab M11, prestazioni (0.9.16 contro 0.9.15) | Scorrimento 76,8-84,6 fps (56-89 ms) contro 78,9-84,7 (56-100); sette categorie 80,7-85,4 (56-111) contro 80,7-86,0 (44-89); apertura vista pagine 57,7-60,7 (322-378) contro 57,9 (344-367); chiusura 56,0-61,6 (267-278) contro 58,1-60,3 (200-245) | Due giri: la chiusura è un po' peggiore, non distinguibile dal rumore; due giri di scorrimento sotto il minimo di 0,9 |

Non eseguito: prova col dito in modifica, TalkBack, testo ingrandito, verticale, app installata, widget associati con entità reali. Residuo noto: tinta azzurrina di fondo del widget e cornice (ISSUE-082).

## 2026-10-20 — Casa 3D, T1: misura della demo NeonPlan 3D sul Tab M11 (REP-20261020-002)

Solo osservazione: demo pubblica dell'autore (`https://neonplan3d.mastershort.de/`, v1.21.0, dati inventati, `hass` simulato) sul Tab M11 TB330FU (Chrome 155, Mali-G52 MC2, 4 GB, 1280×665 a DPR 1,5 in orizzontale); nessuna modifica a codice di Acasystem, banco, Git o Android. Strumenti e risultati in `backup/casa3d-t1/` (escluso da Git). Nessun test di prodotto, build o suite eseguiti (nessun codice modificato).

| Controllo | Esito | Evidenza e limiti |
|---|---|---|
| Avvio a freddo e a caldo | Eseguito: 3 prove per modo | Casa visibile da screencast a circa 2,6 s a caldo e tra 2,5 e 5,19 s a freddo; rAF successivo al primo disegno 2,26-2,54 s (caldo) e 4,6-5,4 s (freddo); scena completa 4,5-5,0 s e 5,7-6,5 s; 535 KB a freddo, 11 KB a caldo. Il «primo disegno» (1,5 s a caldo) non è la casa visibile. A freddo = cache disattivata solo nella scheda; prima visita assoluta non misurata |
| Livelli Auto / Tablet / High: orbita, zoom, riposo | Eseguito: 8 prove per livello e gesto, due ordini | Tablet 58,8 fps (orbita) con 0-2 intervalli >50 ms, ma 33-36 fps nella vista d'insieme; Auto e High 15-21 fps con 13-19 intervalli. Camera non controllata; gesti sintetici; finestre di circa 2,2 s, non 5 s; il criterio di T11 per gesto è rispettato da 11 gesti su 16 a Tablet |
| Editor: apertura, spostamento di un mobile, «3D beside» | Eseguito: 3 prove, 2 passate | Apertura circa 60 ms; spostamento 22-30 fps con fotogrammi fino a 206 ms; «3D beside» circa 4 fps. **Pan del piano non verificato** (3 pointermove su circa 90, nessuno screenshot) |
| Perdita del contesto WebGL | Eseguito: 3 cicli con ripristino, 1 senza | Ripresa in circa 0,5 s dopo `restoreContext()`; senza ripristino vista vuota, nessun messaggio, nessuna ripresa in 20 s. Perdita simulata, non un reset del driver |
| Memoria (PSS di tutti i processi Chrome, heap, MemAvailable) | Eseguito: un campione per stato | +190 MB a Tablet, +240-260 MB a High o dopo cambi, circa +310 MB dopo 5 cambi di livello; heap 10-23 MB; nessun residuo dopo la chiusura. Il PSS include la scheda Acasystem dell'utente (differenze) |
| Verifica indipendente di Opus (sola lettura, senza tablet) | Eseguita | Numeri corrispondenti ai JSON con le imprecisioni elencate nella sezione T1 del report; correzioni applicate |
| Pulizia del tablet | Eseguita | Scheda della demo chiusa; scheda Acasystem dell'utente in primo piano, senza ricarica né accesso al suo `localStorage`; inoltro adb rimosso; nessuna impostazione Android modificata. Resta il `localStorage` della demo (origine esterna) |

Non eseguito: tablet in verticale, telefoni, PC con l'editor, dito reale, tempo GPU, uso per 30 minuti, TalkBack, scena reale e codice di Acasystem, lettura di `antialias` e delle impostazioni per livello, logica di Auto della demo.

## 2026-10-20 — Casa 3D, T2a: copia e rinomina, con le correzioni della revisione (REP-20261020-002)

Comandi eseguiti da `progetto/acasystem/casa3d/` (pacchetto non ancora workspace della radice); log in `backup/casa3d/T2a/` (prima esecuzione) e `backup/casa3d/T2a-correzioni/` (dopo le correzioni). Nessun codice di Acasystem modificato; nessun browser, tablet, banco Docker o suite Vitest usati; nessun commit.

| Controllo | Comando | Esito | Evidenza e limiti |
|---|---|---|---|
| Base di confronto | `node --test "upstream/frontend/src/**/*.test.ts"` | 66 file, 412 test, tutti verdi (prima esecuzione) | `T2a/baseline-upstream-test.log` |
| Test dei sorgenti | `npm test` (`node --test "src/**/*.test.ts"`) | Dopo le correzioni: **66 file, 415 test, 415 verdi, 0 falliti**. Prima: 65 file, 406 test | `T2a-correzioni/verifica-test.log`. Differenza dalla base: −6 test (`diagnostics.test.ts`, tolto con la telemetria) e +9 (`overrides/i18n.test.ts`, test di `i18n.ts`). Le altre patch non hanno un test proprio |
| Tipi | `npm run typecheck` (`tsc --noEmit`, TypeScript 7.0.2, strict) | 0 errori | `T2a-correzioni/verifica-typecheck.log` |
| Marchio, indirizzi, rete | `npm run marchio` e `grep -rliE` del nome originale sull'intero pacchetto | ok su 191 file; nome originale solo nei file che devono nominarlo (`upstream/`, `upstream.sha256`, `NOTICE`, `LICENSE-*`, `UPSTREAM.md`, `PATCHES.md`, `tools/rinomina.mjs`); 0 indirizzi di terzi; 0 API di rete proprie; chiamate per indirizzo solo nei nove file elencati | `T2a-correzioni/verifica-marchio.log`. È un controllo statico per riga: non vede un indirizzo costruito a runtime fuori dai file elencati |
| Ripetibilità | `npm run rinomina` due volte, impronta di `src/`, `lang/` e `PATCHES.md` | identica | `T2a-correzioni/verifica-rinomina.log` |
| Impronte di `upstream/` | controllate da `rinomina.mjs` a ogni esecuzione | 205 file corrispondenti a `upstream.sha256` | |
| Dipendenze | `npm install --save-exact --ignore-scripts @types/node@26.6.4` | un pacchetto cambiato; versioni esatte | `package-lock.json`; elenco in `casa3d/UPSTREAM.md` |

Non eseguito: build (T2b), bundle e peso, prove a runtime in browser, `npm audit`, Vitest, lint e `lint:typography`/`lint:theme-colors` di Acasystem (nessun suo file toccato), prove sul tablet. Copia di sicurezza dello stato corretto: `backup/casa3d/T2a-correzioni/fase2-src-corretta.tar.gz`.

**Nota datata 2026-10-20 (controlli di regressione su Acasystem, eseguiti dopo la sezione sopra; log in `backup/casa3d/T2a/`):** frontend `typecheck`, `lint:typography` (0 su 459 file), `lint:theme-colors` (0 su 331), `i18n:check` (4 su 4), `vitest run --maxWorkers=4` (159 file, 2168 test), `build` e `check-bundle-size` (index 801,8 kB su 900) verdi; backend `test -w backend` (17 file, 141 test) verde. `npm run lint` non ha un esito numerico catturato (era in pipe). Build di `casa3d` non eseguita (nessuno script prima di T2b). La riga «Non eseguito» sopra è storica.

## 2026-10-20 — Casa 3D, T2b: build, servizio e immagine, con le correzioni della revisione (REP-20261020-002)

Comandi dalla radice `progetto/acasystem/` (`casa3d` è ora workspace); log in `backup/casa3d/T2b/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta. Un Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`) per la prova in browser; nessun tablet, nessun banco toccato; nessun commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Test del pacchetto | `npm run test -w casa3d` | 415 su 415, 0 falliti | `casa3d-test.log` |
| Tipi e marchio | `npm run build -w casa3d` (prebuild: `tsc --noEmit`, `npm run marchio`) | 0 errori; `controlla-marchio` ok su 192 file | `build2.log` |
| Build del pacchetto | `npm run build -w casa3d` | **due build locali riuscite** con manifest identico; la prima era fallita (URL di un commento GLSL, nome di un file di licenza nel manifest) e poi corretta. Budget rispettati: principale 425,3 KB, 3D 778,6 su 780, editor 687,4, viaggio nel tempo 100,0, voce 29,1, extra 20,9 | `build1.log` (fallita), `build2.log`, `build3.log` |
| Backend | `npx vitest run --maxWorkers=4`, `typecheck`, `lint` | 18 file, 150 test verdi (9 nuovi di `casa3dRoutes.test.ts`); 0 errori | `backend-*.log` |
| Frontend | `typecheck` (strict), `lint`, `lint:typography` (0 su 459), `lint:theme-colors` (0 su 331), build, `check-bundle-size` | verdi; `index` 801,8 KB su 900 | `frontend-checks.log`, `frontend-build.log`, `check-bundle-size.log` |
| Service worker | `ServiceWorkerCasa3d.test.ts` (contesto isolato, cache finta) | 7 su 7 | `frontend-sw-test.log` |
| Immagine (prima build) | `docker compose -f progetto/compose.tunet.yaml build`, tag `0.9.16-t2b-prova` | riuscita; `/app/casa3d/dist` con sei bundle, `.LEGAL.txt`, manifest, lingue, avvisi | `docker-build.log`, `docker-image-contents.log` |
| Immagine (dopo la correzione) | stesso comando, tag `0.9.16-t2b-prova2`, `npm ci --ignore-scripts` nello stadio di build | riuscita; npm segnala solo `better-sqlite3` tra i pacchetti con script (esbuild non esegue il `postinstall`); sei bundle con le stesse impronte; tag rimosso | `docker-build-ignore-scripts.log`, `Dockerfile.corretto` |
| Prova in browser | `smoke-browser.mjs` su un backend locale (porta 3099, chiuso a fine prova) con la build di produzione | principale e cinque bundle da `/casa3d/` con la CSP dell'app; definiti `fp3d-view3d`, `fp3d-room-panel`, `fp3d-editor`; `lang/en.json` (1806 testi); 11 richieste, tutte alla stessa origine; nessun errore di console né violazione della CSP; nome vecchio e cartella: 404 | `smoke-browser.log` |
| Terminazioni di riga | `git diff --stat -- package.json package-lock.json` dopo il ritorno a LF | 9 e 645 righe (prima: 53 e 17.343 per i CRLF); JSON valido | rettifica in REP-20261020-002 |

Non eseguito: suite completa di Vitest del frontend (di Acasystem è toccato solo `sw.js`; era verde in T2a, 2168 test), Playwright E2E, tablet e banco, `npm audit`, prova del service worker in un browser reale, avvio del contenitore dell'immagine, prova a runtime di `better-sqlite3` nell'immagine dopo `--ignore-scripts` (stadio finale invariato). Copie: `fase1-pacchetto-build.tar.gz`, `fase2-servizio-docker.tar.gz`, `package*.json.lf-corretto`.

## 2026-10-20 — Casa 3D, T3: adattatore in sola lettura e pagina di prova (REP-20261020-002)

Comandi dalla radice `progetto/acasystem/` (frontend e `casa3d`); log in `backup/casa3d/T3/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta. Un Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`) per la prova in browser; **nessun tablet, nessun banco toccato**; nessun commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Adattatore, loader, hook, pagina, rotta | `npx vitest run --maxWorkers=4 src/__tests__/Casa3d*` (frontend) | 4 file nuovi, tutti verdi; forma dell'oggetto, `entity_picture` sotto `/ha`, utente nullo = non admin, `callService` e comandi di scrittura rifiutati, registri con admin / un registro rifiutato / tutti rifiutati, piano d'esempio e pin, loader, pagina in Light | file di test in `frontend/src/__tests__/` |
| Suite completa del frontend | `npx vitest run --maxWorkers=4` | 164 file, **2229 test**, tutti verdi (prima 159 e 2168; rettifica 2026-10-20: dei 61 test in più, 54 sono di T3 (4 file `Casa3d*`) e 7 di `ServiceWorkerCasa3d.test.ts`, di T2b) | `suite.txt` |
| Pacchetto | `npm run test -w casa3d`, `typecheck`, `npm run marchio -w casa3d`, `npm run rinomina` | 422 su 422 (415 + `hass-contract.test.ts` e `esempio.test.ts`); 0 errori; marchio ok su 196 file; rigenerazione ripetibile. Il controllo dei tipi del contratto fallisce con una modifica voluta (1 errore) e torna a 0 | `casa3d-test.log`, `casa3d-build.log` |
| Frontend, controlli statici | `typecheck` (strict), `lint`, `lint:typography` (0 su 466 file), `lint:theme-colors` (0 su 331), `prettier --check` sui file nuovi | verdi | `typecheck.log`, `lint.log`, `lint-typography.log`, `lint-theme-colors.log`, `prettier.log` |
| Build | `npm run build -w frontend`, `node scripts/check-bundle-size.mjs`, `npm run build -w casa3d` | `index` 802,2 KB su 900 (la pagina di prova è un blocco a parte, 16 KB); bundle di `casa3d` con le stesse impronte e gli stessi pesi di T2b (3D 778,6 su 780) | `frontend-build.log`, `check-bundle-size.log` |
| Prova in browser, admin | backend locale (porta 3099, build di produzione) + Home Assistant finto (`mock-ha.mjs`, porta 38123, token di prova), `prova-browser.mjs`, viewport 1280×665 | bundle caricato da `/casa3d/`; sei stanze, cinque legate alle aree, nove pin con gli stati e pannello stanza (21,5 °C, 48 %); `quality = low`; `callService` rifiutato e riportato in pagina; 23 richieste, tutte alla stessa origine; **nessun `call_service`** inviato; nessun errore di console né di pagina; 4 avvisi del driver GL «GPU stall due to ReadPixels» (renderer software), solo all'avvio | `prova-browser/admin.json`, `admin-1-vista.png`, `admin-2-dopo-tocchi.png`, `sonda-readpixels.mjs` |
| Prova in browser, non admin | stessa prova con `test-guest` | «Utente: non amministratore», stesso esito | `prova-browser/guest.json` |
| Prova in browser, non admin con registri rifiutati | il finto Home Assistant risponde `unauthorized` ai registri delle aree e dei dispositivi per chi non è admin | la vista si apre, «non letti: areas, devices», nessuna stanza legata né pin, nessun errore | `prova-browser/guest-registri-rifiutati.json` |
| Registri di Home Assistant 2026.9.4 | lettura del sorgente (`config/entity_registry.py`, `area_registry.py`, `floor_registry.py`, `device_registry.py`, `helpers/entity_registry.py` del tag 2026.9.4 su `raw.githubusercontent.com`, riassunte dallo strumento di lettura delle pagine) | i quattro comandi `list` usati non hanno `require_admin`; forma compatta di `list_for_display` confermata (ultime 8918 lettere di `helpers/entity_registry.py` non lette) | REP-20261020-002, sezione T3 |

**Non eseguito:** fase «banco» (nessuna copia a freddo, nessun cambio di `progetto/.env`, nessuna immagine: il banco resta `aca-system:0.9.16`); **«stanze e stati reali sul banco» e un utente non amministratore vero** (servono l'accesso dell'utente e un secondo account; le prove usano dati finti con le forme documentate); Docker, tablet, Playwright E2E del frontend, `npm audit`, browser con la GPU. Un tentativo di leggere il codice sorgente di Home Assistant dal contenitore (`docker exec`) è stato negato dal sistema di autorizzazioni e non è stato aggirato: la fonte è il sorgente pubblico del tag. Copie: `fase1-adattatore.tar.gz`, `fase2-pagina-rotta-docs.tar.gz`, file prima delle modifiche in `pre/`.

## 2026-10-20 — Casa 3D, T3: fase «banco» 0.9.17 e Tab M11 (REP-20261020-002)

Verifica successiva alla sezione precedente (stesso incarico). Evidenze in `backup/casa3d/T3-banco/` e `backup/casa3d/T3/` (log).

| Controllo | Comando o procedura | Esito | Evidenza |
|---|---|---|---|
| Controlli del PC prima dell'immagine | `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check`, Vitest frontend `--maxWorkers=4`, Vitest backend, `npm run test -w casa3d`, build frontend e `casa3d`, `check-bundle-size.mjs` | Superato: 164 file / 2229 test; backend 18 file / 150 test; `casa3d` 422; `index` 802,2 KB su 900; marchio ok su 196 file | `backup/casa3d/T3/` (`suite.txt`, `build.txt`, `backend.txt`, `casa3d-test.txt`, `casa3d-build.txt`) |
| Banco 0.9.17 | copia a freddo, `ACASYSTEM_VERSION=0.9.17`, `docker compose up -d --build` | Superato: immagine `aca-system:0.9.17`, in salute dopo circa 24 s; `/api/health` 0.9.17; `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.27; `/casa3d/manifest.json` 200; bundle 200 (797236 byte); `/casa3d/` 404 per scelta; log senza errori | `backup/casa3d/T3-banco/`; copia a freddo SHA-256 `a9332c3a221765c430c07caa5b83d623dd1397037585b6497bd5e62a30eb4652` |
| Tab M11, amministratore, Home Assistant vero | `adb reverse`, CDP sulla 9225, `#/casa3d-prova`, `prova.cjs` | Superato: 6 stanze (3 legate ad aree), Light (`low`), 3 aree / 4 dispositivi / 15 entità / 18 stati, `callService` rifiutato, 0 `call_service`, 0 richieste a terzi, 0 messaggi di console; `localStorage` del launcher invariato | `prova-risultato.json`, `tablet-casa3d-prova.png`, `ls-prima.json`, `ls-dopo.json` |

**Non eseguito o con limiti:** utente non amministratore vero (ISSUE-090); pin e luci nelle stanze (0 dispositivi collocati con i dati reali); misura della fluidità e prova al tocco sul tablet; lettura dei file dei registri di Home Assistant (`docker exec` negato, non aggirato); Playwright E2E, `npm audit`, TalkBack. Il criterio «Fatto quando» di T3 è soddisfatto per l'amministratore, non per un non amministratore vero.

## 2026-10-20 — Casa 3D, T4a: guscio della pagina (REP-20261020-002)

Comandi dalla cartella `progetto/acasystem/frontend` (salvo `casa3d`); log, script e schermate in `backup/casa3d/T4a/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta. Un solo Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, 1280×665, tocco) sul PC, su un backend locale (porta 3099, build di produzione, base dati di prova in `backup/casa3d/T4a/data-4`) collegato a un Home Assistant finto (`mock-ha.mjs`, porta 38123, token di prova); server e browser chiusi a fine prova. **Nessun tablet e nessun banco toccati**; nessun commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Migrazione e tipo | `npx vitest run src/__tests__/Casa3dMigration.test.tsx` | Superato: 14 test (tipo, validatore, identità, registro, `installCasa3dPage`, controller: profilo nuovo, profilo esistente, ricarica dopo la rimozione, riordino) | `Casa3dMigration.test.tsx` |
| Guscio: Riposo, Vista, sospensione, caricamento anticipato | `npx vitest run src/__tests__/Casa3dShell.test.tsx` | Superato: 13 test (a riposo nessuna vista; 500 ms prima di crearla; scorrimento che passa sopra non crea nulla; modifica e vista pagine non la creano mai; nascosta fuori scena e rilasciata dopo 60 s; stessa vista se si torna entro il minuto; `modulepreload` solo con la pagina accanto; elenco stanze; tempi di `useCasa3dMounted`; link `modulepreload` con gli indirizzi dell'`import()`, nessun doppione, nome fuori cartella ignorato) | `Casa3dShell.test.tsx` |
| Suite completa del frontend | `npx vitest run --maxWorkers=4` | **166 file, 2256 test**, tutti verdi (prima 164 e 2229) | `frontend-suite.txt` |
| Controlli statici | `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npx prettier --check` sui file toccati | Superato: tutti verdi, 0 violazioni | `typecheck.txt`, `lint.txt`, `lint-typography.txt`, `lint-theme-colors.txt`, `prettier.txt` |
| Pacchetto `casa3d` | `npm test -w casa3d` (dalla radice) | 422 su 422 (nessun file del pacchetto toccato) | `casa3d-test.txt` |
| Build e peso | `npm run build`, `node scripts/check-bundle-size.mjs` | Superato: `index` 803,5 KB su 900 (prima 801,8); `Casa3dPage` 3,1 KB e `Casa3dVista` 1,4 KB in blocchi propri | `frontend-build.txt`, `check-bundle-size.txt` |
| Pagina in un browser, contatore dei contesti WebGL | `node shell-browser.mjs http://127.0.0.1:3099 ./browser` (con `NODE_PATH` della radice) | Superato: **34 controlli su 34**, uscita 0. Ultima pagina e una sola; a riposo 0 contesti e 0 viste; nessun `modulepreload` di `/casa3d/` da lontano, due da accanto; vista pagine e spostamento della pagina con Alt+freccia: 0 contesti; vista viva: 1 vista e **1** contesto; il pulsante è alto 57,6 px; la vista non prende il puntatore e uno scorrimento col dito sposta il pager; modifica sulla pagina: Riposo, vista nascosta, nessun nuovo contesto; fuori scena un minuto: elemento rimosso, nessun contesto in più; nuova visita: 2 contesti in tutto; tutte le richieste alla stessa origine; nessun `call_service`; nessun errore di console oltre due avvisi noti (4 «GPU stall due to ReadPixels» e il `409` di `PUT /api/settings/current`) | `browser-esito.txt`, `browser/shell-browser.json`, `browser/*.png` |
| Il 409 non è della pagina | `node conflitto-409-confronto.mjs casa` e `nocasa` | Superato come confronto: stesso `PUT 409` seguito da `200` spostando «Casa 3D» o «Energia» (ISSUE-094) | `conflitto-409-confronto.mjs` |

**Rettifica della revisione (2026-10-20):** il controllo `prettier --check` della riga «Controlli statici» non valeva per `src/@types/launcher.ts`, riscritto con CRLF; riportato a LF, `prettier --check` sui file delle due fasi, `typecheck`, `lint`, `lint:typography` (0 su 476) e `lint:theme-colors` (0 su 332) sono verdi di nuovo (log rigenerati). Dopo le correzioni (fine riga, `legacyPageKind` solo dal tipo, anteprima `aria-hidden` con la vista viva) sono rieseguiti 21 file e 429 test (`Casa3d*`, `LauncherLayout`, `Launcher*`), verdi; suite completa e `shell-browser.mjs` non rieseguiti. T4a è «fatta per i criteri automatizzabili, criteri sul tablet aperti».

**Non eseguito o con limiti:** TalkBack e testo ingrandito al 125 e 150% (prove umane); Tab M11 e ISSUE-062 (non misurati); fluidità e tempo di avvio della vista; trascinamento della scheda con il dito; service worker in un browser reale (cache `tunet-casa3d-v1` non ispezionata); banco 0.9.17 (non contiene T4a); un utente non amministratore vero (ISSUE-090). Lo scorrimento col dito è un gesto sintetico del protocollo DevTools nel Chromium senza GPU: il pager non si aggancia a metà strada (la misura è lo spostamento di `scrollLeft`: 719 px nella prova finale), non la pagina di arrivo. I due avvisi di console sono noti: gli `ReadPixels` vengono da T3 (origine non identificata, per T5), il `409` è ISSUE-094.

## 2026-10-20 — Casa 3D, T4b: gesti Vista/Esplora (REP-20261020-002)

Comandi dalla cartella `progetto/acasystem/frontend` (salvo `casa3d`); log, script e schermate in `backup/casa3d/T4b/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta. Un solo Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, 1280×665, tocco del protocollo DevTools) sul PC, su un backend locale (porta 3099, build di produzione, base dati di prova in `backup/casa3d/T4b/data`) collegato a un Home Assistant finto (`../T4a/mock-ha.mjs`, porta 38123, token di prova); server e browser chiusi a fine prova. **Nessun tablet e nessun banco toccati**; nessun commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Regole della tastiera | `npx vitest run src/__tests__/Casa3dExploreKeys.test.ts` | Superato: 6 test, con una vera shadow root (il `target` alla finestra è l'elemento della vista, le regole leggono `composedPath()`) | `vitest-mirati.txt` |
| Esplora nella pagina | `npx vitest run src/__tests__/Casa3dExplore.test.tsx` | Superato: 15 test (tocco che entra; scorrimento, pressione lunga e `pointercancel` che non entrano; blocco del pager; pulsanti; Esc; Esc con un `dialog` aperto; Delete e Ctrl+Z; 60 s; indicatore; pagina che esce e modifica; elenco stanze; cronologia). Messi alla prova togliendo `stopPropagation` e `usePageLock`: 5 falliscono | `vitest-mirati.txt` |
| Vitest mirati | `npx vitest run --maxWorkers=4 src/__tests__/Casa3d src/__tests__/Launcher src/__tests__/Pager src/__tests__/OverviewPan src/__tests__/FixLauncher` | Superato: 34 file, 562 test alla seconda esecuzione; alla prima un `waitFor` scaduto sotto carico (561 su 562), non ripresentato | `vitest-mirati.txt` |
| Suite completa del frontend | `npx vitest run --maxWorkers=4` | **168 file, 2277 test**, tutti verdi (prima 166 e 2256) | `frontend-suite.txt` |
| Controlli statici | `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npx prettier --check` sui file toccati | Superato: tutti verdi, 0 violazioni (479 e 332 file analizzati); nessun file con CR | `typecheck.txt`, `lint.txt`, `lint-typography.txt`, `lint-theme-colors.txt`, `prettier.txt` |
| Pacchetto `casa3d` | `npm test -w casa3d` (dalla radice) | 422 su 422 (nessun file del pacchetto toccato) | `casa3d-test.txt` |
| Build e peso | `npm run build`, `node scripts/check-bundle-size.mjs` | Superato: `index` 803,8 KB su 900 (prima 803,5); `Casa3dPage` 6,3 KB (prima 3,1) | `frontend-build.txt`, `check-bundle-size.txt` |
| Gesti nel browser | `node gesti-browser.mjs http://127.0.0.1:3099 ./browser` (con `NODE_PATH` della radice) | Superato: **39 controlli su 39**, uscita 0. Swipe che cambia pagina a riposo e in Vista; in Esplora `is-locked`, nessun cambio di pagina, azimut della camera e raggio cambiati da tocco e rotella; pressione lunga: in Vista apre la vista pagine, in Esplora no; Esc, Delete, Backspace, Ctrl+Z; uscite con «Fine», tasto indietro, indicatore, 60 s (con un tocco a 40 s), pagina che esce, tastiera; «Fine» alto 57,6 px; una voce di cronologia messa e tolta; al più un contesto WebGL; tutte le richieste alla stessa origine; nessun `call_service`; nessun errore di console oltre i 4 avvisi `GPU stall due to ReadPixels` | `browser-esito.txt`, `browser/gesti-browser.json`, `browser/esplora.png` |

**Non eseguito o con limiti:** dito vero e Tab M11 (ISSUE-062 non misurato); zoom a due dita (provata la rotella); TalkBack con Esplora e testo ingrandito al 125 e 150% (prove umane); Esc in un campo di testo della vista (nessun campo visibile in modalità `clean`: solo test unitari); modalità sviluppo con `StrictMode`; il banco 0.9.17 (non contiene T4a né T4b); l'azione della pressione lunga della vista in Esplora. Delete, Backspace e Ctrl+Z non hanno gestori nel launcher: la prova del browser verifica l'invariante, i test unitari la regola.

## 2026-10-20 — Casa 3D, T4b: correzioni dopo la revisione (REP-20261020-002)

Comandi dalla cartella `progetto/acasystem/frontend`; log e script in `backup/casa3d/T4b/rettifica/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta; un solo Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, 1280×665) su un backend locale (porta 3099, copia della base dati di prova in `rettifica/data`) con il finto Home Assistant (`../T4a/mock-ha.mjs`, porta 38123, token di prova); server e browser chiusi a fine prova. Nessun tablet, banco o commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Tocco durante lo scorrimento del pager | `npx vitest run src/__tests__/Casa3dExplore.test.tsx` | Superato: 16 test (1 nuovo). Con `pagerMoving` spenta il test nuovo fallisce (provato) | `vitest-casa3d.txt` |
| Vitest `Casa3d*` | `npx vitest run --maxWorkers=4 src/__tests__/Casa3d` | Superato: 8 file, 103 test | `vitest-casa3d.txt` |
| Controlli statici | `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npx prettier --check` sui file toccati | Superato: 0 violazioni (479 e 332 file) | `typecheck.txt`, `lint.txt`, `lint-typography.txt`, `lint-theme-colors.txt`, `prettier.txt` |
| Build e peso | `npm run build`, `node scripts/check-bundle-size.mjs` | Superato: tutti i chunk entro i limiti | `frontend-build.txt`, `check-bundle-size.txt` |
| Gesti nel browser | `node gesti-browser.mjs http://127.0.0.1:3099 ./rettifica/browser` (con `NODE_PATH` della radice) | Superato: **40 controlli su 40**, uscita 0. Partenza da `#/`; D4, G2 e I2 con hash e indice del router uguali prima, durante e dopo Esplora; O1 con un solo contesto WebGL (misurato 1); C4 nuova | `browser-esito.txt` |

**Rettifica alla registrazione di T4b (sopra):** Canc, Backspace e Ctrl/Cmd+Z fermati sulla guaina non raggiungono i gestori **in bolla** di `window` e `document` né i `onKeyDown` di React; i gestori **in cattura** della finestra (`LauncherScreen`, `usePageDrag`, `useWidgetDrag`, `IconAction`) li ricevono comunque. Oggi nessuno li usa.

**Non eseguito o con limiti:** il tocco che ferma il pager con un dito vero (C4 nel browser passa anche senza la correzione: il tocco sintetico non riproduce il caso; la prova che distingue è il test unitario); B1 falliva nella prima esecuzione per uno swipe entro ~100 ms da uno scorrimento programmatico (indipendente dalla correzione, provato con la build senza di essa), ora lo script aspetta 200 ms (`browser-esito-prima-esecuzione.txt`); TalkBack con la nuova regione viva; la voce di cronologia orfana aprendo Sistema da Esplora (ISSUE-097, non provata); il Tab M11 e il banco.

**Annotazione 2026-10-20 (T4b, larghezza frazionaria del pager):** `pagerMoving` usa ora `getBoundingClientRect().width` invece della `clientWidth` arrotondata; `Casa3dExplore.test.tsx` passa a 17 test (caso 411,43 px, indice 9). Controlli finali dal frontend: `npx vitest run --maxWorkers=4` **168 file, 2279 test verdi**; `npm run typecheck`, `npm run lint`, `lint:typography` (0 su 479), `lint:theme-colors` (0 su 332), `npm run i18n:check` (4/4), `npm run build` e `check-bundle-size` (`index` 803,8 KB su 900) verdi; backend `npm run test -w backend -- --maxWorkers=4` 18 file e 150 test; `npm run test` di `casa3d` 422 su 422 e `npm run build` di `casa3d` (196 file, 6 bundle 2041,1 KB entro i limiti). Log in `backup/casa3d/T4b/`. Non eseguito: browser con viewport o zoom frazionari, Tab M11, banco.

## 2026-10-20 — Casa 3D, T5: qualità e contesto (REP-20261020-002)

Comandi dalla cartella `progetto/acasystem/frontend` (salvo `casa3d`); log, script e schermate in `backup/casa3d/T5/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta. Un solo Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, 1280×665, DPR 1,5, tocco del protocollo DevTools) sul PC, su un backend locale (porta 3099, build di produzione, base dati di prova in `backup/casa3d/T5/data`) collegato a un Home Assistant finto (`mock-ha.mjs`, porta 38123, token di prova); server e browser chiusi a fine prova. **Nessun tablet e nessun banco toccati**; nessun commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Livelli e regola dei fotogrammi | `npm test` in `casa3d` (`viewer/quality.test.ts`) | Superato: 12 test (tre livelli, nomi sconosciuti e «auto» e «low» = Light, rapporto pixel 1 / 1,25 / 2, nomi del viaggio nel tempo, distanza fra i fotogrammi a 60, 90 e 120 Hz) | `casa3d/src/viewer/quality.test.ts` |
| Pacchetto `casa3d` | `npm run rinomina`, `npm run typecheck`, `npm test`, `npm run build` | Superato: **434 su 434** (prima 422); `marchio` ok; sei bundle nei budget (3D **779,9 KB su 780**, prima 778,6; principale 425,6 su 620; editor 687,4 su 840) | terminale; `PATCHES.md` (P104-P128) |
| Quality, picker, copia nelle impostazioni, regola del contesto | `npx vitest run src/__tests__/Casa3dQuality.test.tsx` | Superato: 37 test (valore salvato e ricarica, browser che rifiuta di scrivere, scheda che cambia, dispositivo debole e conferma di High, snapshot senza e con la sezione `device`, mai da un profilo, regola di `contextGuard` con tre perdite restituite, perdita dopo una vista rifatta, cinque perdite, «Riprova», attesa di 5 s) | `frontend-suite.txt` |
| Pagina: menu, perdite, messaggi | `npx vitest run src/__tests__/Casa3dQualityPage.test.tsx` | Superato: 14 test (partenza da Light e dal valore salvato, menu che cambia livello senza rifare la vista, tre perdite restituite, contesto che non torna e vista rifatta in Light con il livello salvato intatto, anteprima statica e «Riprova», vista che non si può creare, Esplora che finisce, offerta di Light, tocco su un messaggio che non entra in Esplora). Messo alla prova togliendo `.c3d-notice` dai bersagli: il test fallisce | `frontend-suite.txt` |
| Vista: eventi e livello | `npx vitest run src/__tests__/Casa3dVista.test.tsx` | Superato: 7 test (livello e `statsEvents`, stesso elemento al cambio di livello, nuovo elemento a ogni `generation`, `context-state`, offerta una volta sola, il conteggio riparte e il riposo non conta) | `frontend-suite.txt` |
| Sistema | `npx vitest run src/__tests__/SystemPage.test.tsx` | Superato: 19 test (la sezione «Casa 3D» e la scelta salvata) | `frontend-suite.txt` |
| Suite completa del frontend | `npx vitest run --maxWorkers=4` | **171 file, 2338 test**, tutti verdi (prima 168 e 2279: +3 file e +59 test); durata 572 s | `frontend-suite.txt` |
| Controlli statici | `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npx prettier --check` sui file toccati | Superato: tutti verdi, 0 violazioni (484 e 333 file analizzati) | terminale |
| Build e peso | `npm run build -w frontend`, `node scripts/check-bundle-size.mjs` | Superato: `index` 806,4 KB su 900 (prima 803,8); `Casa3dPage` 9,4 KB; `Casa3dVista` 1,9 KB | terminale |
| Livelli, contesto e scelta salvata nel browser | `node qualita-browser.mjs http://127.0.0.1:3099 ./browser 1.5` (con `NODE_PATH` della radice) | Superato: **36 controlli su 36**, uscita 0. Light a rapporto pixel 1 (buffer 1224 px = CSS), Medium 1,25, High 1,5; sei cambi di livello (Medium, High, Medium, Light, High, Light) con un solo contesto vivo e il vecchio già perso, primo disegno dopo 509-709 ms e al più 369 ms di thread bloccato (renderer software); `stats` solo sopra Light; fotogrammi in Light distanti almeno 31 ms (Medium 10 ms); tre perdite restituite (messaggio dopo 4-24 ms, vista di nuovo dopo 227-228 ms, nessun contesto nuovo); perdita senza ripristino (messaggio dopo 6 ms, vista rifatta in Light dopo 5,25 s, livello salvato intatto, nota nel menu); perdita dopo una vista rifatta (anteprima statica, nessun contesto vivo, «Riprova»); scelta dal menu e da Sistema, richiesta `PUT /api/settings/current` con `device.casa3dQuality`, ricarica che mantiene Medium; browser pulito che riparte da Light; dispositivo con 4 GB (High chiede conferma, «Annulla» non cambia, «Passa a High» sì); tutte le richieste alla stessa origine (salvo le tessere della mappa di Sistema); nessun `call_service`; nessun errore o avviso di console oltre i 4 `ReadPixels` | `browser-esito.txt`, `browser/qualita-browser.json`, `browser/spaziatura.json`, `browser/cambi-livello.json`, `browser/*.png` |
| Origine degli avvisi `ReadPixels` | `node readpixels-origine.mjs http://127.0.0.1:3099 light ./readpixels-origine-light.txt` (e `high`) | Trovata: la sola lettura indietro nel percorso è `texSubImage2D` con un canvas 2D (8×32 in Light; più 1024×1024, 768×512 e 64×64 sopra Light), seguita dai 4 avvisi del driver software | `readpixels-origine-light.txt`, `readpixels-origine-high.txt` |
| Programma di misura per il tablet | `node misura-tablet.mjs ./misura-pc --gestures=2 --seconds=2` contro un Chromium senza GPU con la porta DevTools aperta (`browser-cdp-pc.mjs`) | Superato: completa senza errori (gesti, cambi, tre perdite e una senza ripristino, ricarica). I numeri del renderer software non valgono per il tablet | `misura-pc.log`, `misura-pc/misura-tablet.json` |

**Non eseguito o con limiti:** il Tab M11 e il banco (Light entro i criteri di T11, Medium e High senza blocchi sul tablet, perdite e ripristini sul tablet, preferenza dopo la ricarica sul tablet, ISSUE-062, PSS); telefoni, verticale e PC con GPU vera; TalkBack sul menu e sui messaggi e testo al 125 e 150% (prove umane); una perdita reale del contesto (simulata con `WEBGL_lose_context`); più utenti sullo stesso browser. La Light del PC (circa 29 fps in un gesto) è software: non dice nulla sul tablet. Il blocco su D16, ISSUE-091 e D18 non è risolto (T5 eseguita oltre, come T4a e T4b).


## 2026-10-20 — Casa 3D, T5: seconda revisione (REP-20261020-002, «Seconda rettifica»)

Annotazione datata; copie in `backup/casa3d/T5-fix2/`. Vitest con `--maxWorkers=4`, nessun browser né tablet.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Round trip di sincronizzazione con snapshot veri | `npx vitest run src/__tests__/useSettingsSyncDevice.test.ts` (in `frontend`) | Superato: 5 test (righe di un altro dispositivo seguite da altre, con livelli diversi, con il solo altro o il solo questo dispositivo, modifica locale vera che blocca, blocco proprio inviato). Con `withoutDeviceBlock` neutralizzato 4 su 5 falliscono | terminale |
| Sincronizzazione, qualità, pagina | `npx vitest run src/__tests__/useSettingsSync.test.ts src/__tests__/Casa3dQuality.test.tsx src/__tests__/Casa3dQualityPage.test.tsx` insieme al precedente | Superato: 87 su 87 (azione `released` nel riduttore e perdita a pagina nascosta con un minuto fuori nella pagina) | terminale |
| Tipi e stile | `npx tsc -p tsconfig.strict.json --noEmit`, `eslint` e `prettier --end-of-line auto --check` sui file toccati | Superato (eslint ignora i file di test per configurazione) | terminale |
| Pacchetto `casa3d` | `node tools/rinomina.mjs`, `npm run typecheck`, `npm run marchio`, `npm test`, `npm run build` | Superato: 438 su 438; `marchio` ok; sei bundle nei budget (3D 780,0 KB su 780) | terminale |
| Nuovo tentativo di `load3d` dopo un errore | nessuno | **Non eseguito:** prova in Chromium con richiesta prima bloccata e poi consentita; patch solo tipizzata e compilata | - |

## 2026-10-21 — Casa 3D, T5: banco 0.9.18 e Tab M11 (REP-20261020-002, «T5 — esito del banco»)

Annotazione datata. Evidenze e script in `backup/casa3d/T5-banco/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta; il tablet e le suite non sono stati usati insieme.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Frontend: tipi, lint, tipografia, colori, i18n | `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npm run i18n:check` (in `frontend`) | Superato: 0 errori; 0 violazioni su 485 e 333 file; i18n 4 test su 4 | terminale |
| Suite completa del frontend | `npx vitest run --maxWorkers=4` | Superato: **172 file, 2355 test**, circa 936 s, nessun timeout | `backup/casa3d/T5/suite.txt` |
| Build e peso | `npm run build`, `node scripts/check-bundle-size.mjs` | Superato: `index` 806,9 KB su 900; avviso Vite sui chunk oltre 500 kB (`index` 826 kB, 244 kB gzip) | terminale |
| Backend | `npm run test -w backend -- --maxWorkers=4` | Superato: 18 file, 150 test | terminale |
| Pacchetto `casa3d` | `npm run typecheck`, `npm test`, `npm run marchio`, `npm run build` | Superato: 438 su 438; marchio ok su 200 file; sei bundle nei budget, 2043,1 KB in tutto (3D 780,0 KB su 780, al limite) | terminale |
| Banco | `docker compose up -d --build` dopo copia a freddo | Superato: `aca-system:0.9.18` in salute; `/api/health` 0.9.18; `/ha/auth/providers` 200 su 127.0.0.1 e 172.20.10.6; `/casa3d/manifest.json` 0.9.18; log senza errori | `T5-banco/build.txt` |
| Tab M11, Light | `misura-sintetica.mjs` (gesti `Input.synthesize*Gesture`, 8 per tipo da 5 s dalla vista d'insieme, camera azzerata) | Superato: **30 gesti su 32 (94%)**, obiettivo ≥90%; orbita 45-59 fps, pizzico 40-56 fps; 9 chiamate di disegno; rapporto pixel 1 | `T5-banco/misura2/`, `misura3/` |
| Tab M11, Medium e High | stesso programma | Selezionabili, blocco massimo 476 ms; **non fluidi** (circa 24 fps orbita, 21 pizzico); ritorno a Light 175-204 ms | `T5-banco/misura2/`, `misura3/` |
| Tab M11, perdita del contesto | stesso programma | Superato: tre perdite con ripristino (messaggio 71-89 ms, vista 272-396 ms); perdita definitiva: vista rifatta in Light dopo circa 5,4 s | `T5-banco/` |
| Tab M11, preferenza dopo la ricarica | stesso programma | Parziale: Medium resta Medium nelle due passate complete; tre prove brevi hanno letto `light` (non spiegato, ISSUE-100) | `T5-banco/stato-*.json` |
| ISSUE-062 | `measure.cjs base`, 4 giri | Picchi non peggiori della 0.9.16; chiusura 54,6-57,3 fps (due giri a 54,6 e 54,8 sotto il minimo storico 56,0) | `T5-banco/measure-base*.txt` |
| Memoria | `adb shell dumpsys meminfo com.android.chrome` (PSS) | Nessuna crescita: 193 MB prima, 160-175 durante, 169 dopo | `T5-banco/pss-*.txt` |
| Rete e comandi | console, richieste di rete, trame websocket | Nessuna richiesta a terzi; nessun `call_service`; console senza errori oltre a tre 409 della sincronizzazione delle impostazioni (due schede della stessa origine, convergono) | `T5-banco/` |
| `localStorage` del launcher | confronto prima e dopo (token esclusi) | Invariato tranne la migrazione attesa (pagina `casa3d` in coda, 8 a 9; `aca_casa3d_quality`) | `T5-banco/ls-*.json` |
| `misura-tablet.mjs` | gesti con `Input.dispatchTouchEvent` | **Non valido** per il tablet: round trip del protocollo, gesti di 12-16 s (ISSUE-101) | `T5-banco/misura/` |

**Non eseguito o con limiti:** dito reale (T11 chiede almeno 3 gesti); telefoni, verticale e PC con GPU vera; TalkBack e testo al 125 e 150%; 30 minuti di uso e schermo spento; heap; utente non amministratore (ISSUE-090); nuovo tentativo di `load3d` dopo un errore. Nessuna CI attiva dichiarata. Il banco è costruito dall'albero di lavoro non committato.

## 2026-10-21 — Casa 3D, T6: persistenza (REP-20261020-002, «T6 — Persistenza»)

Comandi dalle cartelle `progetto/acasystem/backend`, `frontend` e `casa3d`; log, script e copie in `backup/casa3d/T6/` (copie dei file prima delle modifiche in `pre/`, prova a tre contesti in `due-client/`). Vitest con `--maxWorkers=4`, un solo processo pesante per volta; la prova del browser è stata eseguita da sola, con un solo Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`); **nessun tablet e nessun banco toccati**, nessun comando a impianti reali, nessuna credenziale; nessun commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Backend: suite | `npx vitest run --maxWorkers=4` | Superato: **21 file, 191 test** (prima 18 e 150) | `backend-test.txt` |
| Backend: rotte, ruolo, immagini, schema | `npx vitest run --maxWorkers=4 src/__tests__/casa3d` | Superato: 4 file, 50 test (database in memoria): piano vuoto a revisione 0 e primo salvataggio; **409** con la revisione attuale e piano intatto, due scritture con la stessa base (ne vince una); base mancante o non intera e piano non valido (400); corpo oltre il limite (413); **403** per un utente che non è amministratore né proprietario su ogni scrittura e sulla lettura di cronologia e backup, **401** senza utente, ruolo dichiarato dal client ignorato, amministratore e proprietario scrivono, rotte dietro l'autenticazione HA vera; immagini PNG, JPEG e WebP con tipo rilevato, `nosniff` e CSP chiusa; **SVG rifiutato** qualunque sia l'intestazione; **indirizzo esterno** come corpo o come id rifiutato; **immagine troncata o danneggiata rifiutata**; tipo diverso dai byte (415) senza toccare l'immagine salvata; limiti di byte, lato, numero e totale; cancellazione; punto di ripristino a richiesta e automatico solo oltre 600 s, mai per un piano vuoto, al più 20; ripristino, esportazione e importazione con punto di ripristino e pacchetti saltati; limiti di piani, stanze, punti ed elementi come l'originale; **URL esterni** nelle immagini di schermi e sfondi rifiutati; cifratura `enc_only` | `backend-casa3d-test.txt` |
| Backend: tipi e lint | `npx tsc -p tsconfig.json --noEmit`, `npx eslint src` | Superato: nessun errore | `backend-typecheck.txt`, `backend-lint.txt` |
| Frontend: test nuovi | `npx vitest run --maxWorkers=4 src/__tests__/Casa3dPlanApi.test.ts …Casa3dPlanRequest.test.ts …Casa3dHassHook.test.tsx` | Superato: 3 file, 44 test (comando → rotta, revisione mandata a ogni salvataggio, salvataggio senza lettura rifiutato, 409 con codice e revisione, 403/404/413/415/422/400/5xx, immagini in binario con rifiuto prima della richiesta di indirizzi esterni, SVG, id non validi e testo non base64, cronologia, esportazione e importazione, elenco pacchetti vuoto, controllo della revisione solo a pagina visibile e senza errori se offline, bozza tolta al cambio di utente, richiesta con token e un solo nuovo tentativo dopo un 401 con OAuth, Home Assistant ancora in sola lettura con il piano API) | `frontend-t6-test.txt` |
| Frontend: Casa 3D | `npx vitest run --maxWorkers=4 src/__tests__/Casa3d` | Superato: 14 file, 218 test (compreso `Casa3dHaShim.test.ts`, invariato, e `Casa3dRoute.test.tsx`: la rotta di prova non è raggiungibile in produzione) | `frontend-casa3d-test.txt` |
| Frontend: controlli statici | `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npx prettier --check` sui file toccati | Superato: 0 errori; 0 violazioni su 487 e 333 file | `frontend-typecheck.txt`, `frontend-lint*.txt` |
| Pacchetto `casa3d` | `npm test`, `npm run typecheck`, `npm run marchio`, `npm run rinomina` | Superato: **438 su 438**; `marchio` ok su 200 file; `rinomina` lascia `src/` e `lang/` identici (impronta del contenuto uguale prima e dopo; cambia solo `PATCHES.md`). La build del pacchetto non è stata rifatta: nessun sorgente è cambiato | `casa3d-test.txt`, `casa3d-typecheck.txt`, `casa3d-marchio.txt` |
| Build e peso | `npm run build`, `node scripts/check-bundle-size.mjs` | Superato: `index` 806,5 KB su 900; nessun file `Casa3dProva` né stringa `casa3d-prova` in `dist/` | `bundle-size.txt` |
| Prova a tre contesti e copia a freddo (PC) | `node due-client.mjs esito` (`due-client/`) | Superato: **37 controlli su 37**, uscita 0. Tre contesti di un solo Chromium (A e B amministratore, G ospite) con il codice vero di `planApi.ts` e `planRequest.ts` contro il processo vero del backend (file SQLite, porta 3098) e un Home Assistant finto (`mock-ha.mjs`, token di prova): lettura del server vuoto, salvataggio, rilettura identica da un altro dispositivo, revisione vista dal controllo ogni 0,4 s, **409** su una revisione vecchia con il piano di B intatto, **403** per l'ospite su piano, immagini, cronologia, esportazione, punto di ripristino e cancellazione e **401** senza token, PNG vero riletto byte per byte con `nosniff` e CSP chiusa, **SVG rifiutato** (dichiarato PNG o SVG, 415), **PNG troncato rifiutato** (422, non salvato), oltre 6 MB (413) con il server ancora vivo, **URL esterno** come immagine di uno schermo e come sfondo (400), 21 piani (400), la revisione resta 3, punto di ripristino, ripristino, esportazione, importazione con un pacchetto saltato, nessun errore di pagina. Poi backend fermato e cartella dei dati copiata: la copia, aperta da sola, contiene il piano alla stessa revisione (6) e con lo stesso contenuto dell'ultima lettura, l'immagine con la stessa impronta, 4 punti di ripristino e nessuna immagine rifiutata | `due-client/esito/esito.json`, `esito-consola.txt`, `copia-a-freddo/` |

**Non eseguito o con limiti:**
- **Fase «banco» di T6:** immagine con T6, salvataggio e rilettura da un tablet e dal browser del PC con Home Assistant vero, piano presente nel tgz della copia a freddo del volume Docker. L'app non ha ancora una schermata che salvi il piano (T10), e un accesso al banco non lo inserisce l'agente (ISSUE-103).
- I «due dispositivi» della prova sono tre contesti di un solo browser (stesso motore, stesso PC, nessuna rete reale fra i client), non un tablet e un PC; il «volume del banco» è una copia di una cartella con un backend fermato con un segnale di terminazione (nel file `-wal` ci sono ancora le ultime scritture, ed è corretto aprirlo con SQLite).
- Home Assistant è finto: il ruolo viene da `auth/current_user` di un finto; con un Home Assistant vero il ruolo di un utente non amministratore non è provato (ISSUE-090); dietro l'ingress del Supervisor nessuno scrive (dedotto dal codice del middleware, non provato, ISSUE-102).
- La struttura delle immagini è verificata, i pixel no (ISSUE-104); WebP e JPEG sono provati con file costruiti nei test, non con le immagini di un editor.
- La Vista del launcher non legge il piano del server (ISSUE-103); la suite completa del frontend non è stata rieseguita (T6 tocca soli file di `casa3d/`: l'adattatore, il hook e i test nuovi).
- Nessuna CI attiva dichiarata.

**Rettifica 2026-10-21 (rerun finale, nessun codice modificato):** il primo tentativo di suite completa (`npx vitest run --maxWorkers=4`, `backup/casa3d/T6/suite-1.txt`) non è un verdetto valido: 84 file su 173 passati (1344 test) con 91 errori «Worker exited unexpectedly with exit code 3221225794 during starting state», cioè worker uccisi all'avvio da Windows (0xC0000142, carico/risorse della macchina), non test falliti; gli altri file non sono stati eseguiti. Rieseguita a quattro blocchi con `npx vitest run --maxWorkers=2 --shard=N/4` (meno carico, un processo alla volta): **173 file, 2403 test, tutti verdi** (44/559, 44/806, 44/571, 43/467), nessun errore, uscita 0 (`suite-2-shard1..4.txt`, `suite-2-exit.txt`). Nello stesso giro: backend `npm run test -w backend` **21 file, 200 test** (nel primo giro 191: i test dell'API Casa 3D sono stati ampliati dopo), typecheck e lint del backend e del frontend con 0 errori, `casa3d` typecheck, **438/438** test e `npm run build -w casa3d` riuscita (6 bundle, 2043,1 KB, tutti nel budget) (`backend-test-2.txt`, `backend-typecheck-2.txt`, `backend-lint-2.txt`, `frontend-typecheck-2.txt`, `frontend-lint-2.txt`, `casa3d-typecheck-2.txt`, `casa3d-test-2.txt`, `casa3d-build-2.txt`). Limite: la suite non è stata eseguita con `--maxWorkers=4` in un unico giro; due lanci concorrenti per errore (il PC è andato in sospensione) sono stati fermati e i loro file scartati prima del giro valido.

## 2026-10-21 — Casa 3D, T6: banco 0.9.19 e Tab M11 (REP-20261020-002, «T6 — esito»)

| Controllo | Esito |
|---|---|
| Copie a freddo PRIMA e DOPO | Superato: `backup/banco/tunet-data-casa3d-T6-pre-0.9.19-freddo.tgz` (SHA-256 `aa2a0a92…`) e `...-post-0.9.19-freddo.tgz` (`c368fb3c…`); il DOPO contiene il piano alla revisione 6 (1 piano, 6 stanze, impronta `9b909c96125f09b6`), 0 immagini, 1 punto di ripristino, `integrity_check` ok (`node:sqlite`, `--network none`; `backup/casa3d/T6/banco/verifica-db.txt`) |
| Banco 0.9.19 | Superato: immagine `aca-system:0.9.19`; `healthy`; `/api/health` 0.9.19 e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; `/casa3d/manifest.json` servito; tre tabelle `casa3d_*`; nessun errore all’avvio; `casa3d-prova` assente |
| Tab M11, 16 controlli sul canale | Superato: 401 senza token e con token falso; lettura 200; salvataggio da A (3→4), rilettura da B con stessa revisione e stesso contenuto, B salva (5), A su 4 riceve 409 con revisione 5, il piano di B resta, A rilegge e salva (6), B vede 6; SVG 415; URL esterno 400; revisione invariata dopo i rifiuti (`esito-prova.json`, `prova-log.txt`) |
| 403 sul banco | **Non eseguito**: manca un utente non amministratore e non si è creato un account; coperto dai test del backend e dalla prova sul PC (Home Assistant finto) |
| Secondo dispositivo | **Non eseguito**: A e B sono due documenti dello stesso tablet con la stessa sessione e lo stesso `localStorage` |
| `localStorage` del launcher | 37 chiavi prima e dopo, identiche (token escluso e non letto) |
| Suite frontend completa (seconda esecuzione) | 175 file, 2403 test verdi; la prima si fermò per circa 87 minuti in `LauncherScreen.test.tsx` e fu interrotta a mano (il file da solo 97/97; causa non accertata); `backup/casa3d/T6/suite-2.txt` |
| Backend, `casa3d`, build | Backend 21 file e 200 test; `casa3d` 438 test; `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check`, `check-bundle-size` verdi; `casa3d-prova` assente da `dist/` |
| Rilievo aperto | Il limite delle immagini (600 al minuto) è coperto dal limite globale di `/api` (300 al minuto): sonda su `createApp` con 320 richieste, primo 429 alla 301ª; i test esistenti non lo vedono (ISSUE-104) |

Nessuna CI attiva dichiarata. La prova a tre contesti (37/37) è anteriore alle correzioni di revisione e non è stata rieseguita.

## 2026-10-21 — Interazioni G1-G2 e interruttore dei comandi della Casa 3D (REP-20261021-003)

| Controllo | Esito |
|---|---|
| Baseline prima delle modifiche | `LauncherScreen.test.tsx`, `LauncherGestures.test.tsx`, `LagLayers.test.ts`: 3 file, 163 test verdi (`--maxWorkers=4`) |
| Test mirati dopo le modifiche | 29 file, 646 test verdi (`--maxWorkers=4`): `LauncherScreen`, `LauncherGestures`, `LagLayers`, tutti i `Casa3d*`, `LauncherDragDrop`, `AvWidgetOpen`, `ShellLauncher`, `Polish2LauncherScreen`, `PolishLauncherScreen`, `FixLauncherUiShell`, `CategoryPages`, `ControlsFrame`, `ComfortContract`. In un giro precedente, 29 file e 461 test verdi su altri file del launcher (`Fix*`, `Polish2*`, `PageShell`, `PagerBands`, `SystemSheets`, `ShellApp` e simili) |
| I nuovi test vedono il difetto | Con i tre file del launcher ripristinati dalle copie PRIMA, 7 dei test nuovi o aggiornati falliscono; riportati i file, tornano verdi |
| `tsc -p tsconfig.strict.json --noEmit` | 0 errori |
| `eslint` sui sorgenti toccati (`templates/launcher`, `hooks/launcher`, `casa3d`) | 0 errori (i file di test sono esclusi dalla configurazione) |
| `lint:typography`, `lint:theme-colors` | 0 violazioni (492 e 334 file) |
| `prettier --check` sui file toccati | Superato; `casa3d/Casa3dPage.tsx` non conforme per i fine riga CRLF di partenza, non toccati |
| Interruttore dei comandi della Casa 3D | Spento per impostazione: con il runtime presente, in Esplora e con `commands` aperti, `callService` rifiuta e la `callService` dell'app non è raggiunta (`Casa3dCommands.test.tsx`, `Casa3dHaShim.test.ts`); acceso con `VITE_CASA3D_COMMANDS=on` i test delle barriere e del percorso restano verdi |
| Suite completa, `e2e`, banco, Tab M11, TalkBack | **Non eseguiti** |
| Gesto reale su dispositivo (pressione lunga su pulsante, cursore e manopola; tocco immediato) | **Non eseguito**: la prova dell'utente sul Tab M11 è il passo aperto |
| `e2e/isolated-browser.check.mjs` | **Non eseguito**; il doppio clic su «Apri dettagli» (r.126) non apre più le impostazioni: da aggiornare |

Nessuna CI attiva dichiarata. Nessun commit Git. Copie PRIMA in `backup/g1-g2/pre/`.

## 2026-10-21 — Interazioni G1-G2 — esito (suite completa, banco 0.9.20, Tab M11)

Integra la sezione precedente «Interazioni G1-G2 e interruttore dei comandi» (che indicava suite completa, banco e Tab M11 come non eseguiti).

| Controllo | Esito |
|---|---|
| `npm run typecheck`, `npm run lint`, `lint:typography`, `lint:theme-colors`, `i18n:check` (frontend) | Superati (0 violazioni in 492 e 334 file; i18n 4 test su 4) |
| `vitest run --maxWorkers=4` (frontend, suite completa) | Superato: 179 file, 2493 test, 526 s; uscita in `backup/g1-g2/suite-1.txt`; nessun file bloccato |
| `npm run build` (frontend) e `check-bundle-size.mjs` | Superati; indice 803,5 KB su 900 KB (avviso Vite su chunk oltre 500 KB: `hls` e indice) |
| Backend `--maxWorkers=4` | Superato: 21 file, 200 test |
| `npm run test -w casa3d` e `npm run build -w casa3d` | Superati: 440 test; 6 bundle, 2042,8 KB; il bundle 3D è a 780,0 KB su 780 KB di budget, esattamente sul limite |
| Copia a freddo PRIMA | Superato: `backup/banco/tunet-data-g1g2-pre-0.9.20-freddo.tgz`, 413346 byte, SHA-256 `1a3453c57d1793b0f7b80cf2e24b1e8eb18852ea0ef39de60186a831991823a2`, `tar -tzf` 4 voci |
| Banco 0.9.20 | Superato: `docker compose up -d --build`; `healthy`; `/api/health` 0.9.20 e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7` (IPv4 Wi-Fi uguale al binding) |
| Tab M11, pressione lunga di 800 ms sul corpo di Orologio, Calendario e Meteo | Superato: nessuna modifica, nessun `is-pressing`, rettangolo invariato (397×397) |
| Tab M11, pressione lunga su 5 widget non collegati e sul pulsante «Chiudi Tapparella» | Superato: nessuno spostamento, restringimento, avviso o modifica |
| Tab M11, pressione lunga sullo spazio vuoto | Come prima di G1: entra nella panoramica pagine (`pager is-overview`, barra pagine e «Fine»), ordine invariato; **non** la barra widget (C2a, non autorizzata) |
| Tab M11, «Modifica»: selezione, sollevamento, trascinamento del widget Luce | Superato: ha seguito il dito (y da 25 a 81), tornato a 1061,25, nessun cambio di layout; uscita con «Fine» |
| `localStorage` del launcher | 35 chiavi prima e dopo, identiche (token escluso) |
| Tocco immediato e secondo tocco senza impostazioni sul dispositivo | **Non eseguito** |
| Pressione lunga su cursore e manopola della luce col dito, TalkBack, G0, `e2e` | **Non eseguiti** |

Nessuna CI attiva dichiarata. Nessun commit Git. Nessun comando a impianti reali.


## 2026-10-21 — Interazioni G3-G5 (REP-20261021-003, «G3-G5 — realizzazione»)

| Controllo | Esito |
|---|---|
| Baseline | `LauncherScreen`, `CategoryPages`, `LauncherGestures`, `LauncherDragDrop`, `LauncherStacks` con il codice nuovo e i test vecchi: 15 test falliti su 246 (attesi: tocco, sollevamento con attesa, «Collega»); elenco in `backup/g3-c3/run1.txt` |
| Test mirati dopo le modifiche | `WidgetCommands` (29, nuovo), `LauncherScreen`, `CategoryPages` (31), `LauncherGestures`: verdi (`--maxWorkers=4`; `backup/g3-c3/run2.txt` e nuova esecuzione di `CategoryPages`) |
| I nuovi test vedono il difetto | Con gli otto sorgenti di G3-G5 (`LauncherScreen`, `WidgetHost`, `StackView`, `CategoryWidgetContent`, `LauncherUiContext`, `AdaptiveCategoryWidget`, `adaptiveWidget.css`, `launcher.css`) ripristinati dalle copie PRIMA: 46 test falliscono su 218; poi rimessi e confrontati con `cmp`; `backup/g3-c3/old-code.txt` |
| `vitest run --maxWorkers=4` (frontend, suite completa) | Superato: 182 file, 2567 test, 553 s; `backup/g3-c3/suite-1.txt` |
| `tsc -p tsconfig.strict.json --noEmit`, `eslint src` | 0 errori |
| `lint:typography`, `lint:theme-colors` | 0 violazioni (502 e 335 file) |
| `prettier --check` sui file toccati | Superato dopo `--write` sui due file di test (solo le righe nuove) |
| Banco, copia a freddo, Tab M11, TalkBack, `e2e` | **Non eseguiti**: nessun banco è stato aggiornato in questo passo; `e2e/isolated-browser.check.mjs` è stato aggiornato (modifica, tocco, secondo tocco, Esc) ma non rieseguito |
| Gesto reale col dito (tocco sul corpo di un adattivo, trascinamento immediato, secondo tocco, pressione lunga nelle pagine piene) | **Non eseguito** |

Nessuna CI attiva dichiarata. Nessun commit Git. Copie PRIMA in `backup/g3-c3/pre/`.

## 2026-10-21 — Interazioni C1-C3 (REP-20261021-003, «C1-C3 — realizzazione»)

| Controllo | Esito |
|---|---|
| Baseline | Suite completa con il codice nuovo e i test vecchi: 82 test falliti su 2567 (attesi: barra di stato, indicatore, «Modifica», celle con «+» in uso, pressione lunga che apre la vista pagine, formule della cornice); `backup/g3-c3/c-suite-1.txt` |
| Test riscritti o aggiunti | `FrameGearCommands` (15, nuovo), `LauncherScreen` (115, da 110), `SystemPage` (23, da 20) e i file aggiornati per decisione elencati nel report; verdi con `--maxWorkers=4` |
| `vitest run --maxWorkers=4` (frontend, suite completa) | Superato: 183 file, 2588 test, 879 s; `backup/g3-c3/c-suite-2.txt` |
| `tsc -p tsconfig.strict.json --noEmit`, `eslint src` | 0 errori |
| `lint:typography`, `lint:theme-colors` | 0 violazioni (507 e 338 file) |
| `prettier --check` sui file toccati | Superato (dopo `--write` sui file nuovi e riscritti) |
| Prova headless sul PC | Eseguita: un Chromium con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing` su `launcher.html` (fixture, nessun Home Assistant), 1280×665 e 390×844; griglia identica in uso e in modifica (1219×594 a 1280×665), pressione lunga di 750 ms sullo spazio vuoto in modifica, vista pagine da «Pagine», cenno dell'indicatore di 2 s, comandi senza viso al primo Tab, fuoco su «Modifica la disposizione» dopo «Fine», nessun errore di pagina; schermate e `risultati.json` in `backup/g3-c3/shots/` |
| Banco, copia a freddo, Tab M11, TalkBack, `e2e` | **Non eseguiti**: nessun banco è stato aggiornato; `e2e/m11-overview.check.mjs` e `isolated-browser.check.mjs` aggiornati ma non rieseguiti |
| Gesto reale col dito (pressione lunga sullo spazio vuoto e sul corpo nelle pagine piene, cestino sotto la barra, ingranaggio nell'angolo con 20 px riservati, cenno e suggerimento) | **Non eseguito** |

Nessuna CI attiva dichiarata. Nessun commit Git. Copie PRIMA in `backup/g3-c3/pre/c1c3/`.

## 2026-10-21 — Interazioni G3-G5 e C1-C3 — esito (REP-20261021-003, «G3-G5 e C1-C3 — esito»)

| Controllo | Esito |
|---|---|
| Frontend `npm run typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check` | Superati (dopo la revisione e le correzioni) |
| `vitest run --maxWorkers=4` (frontend, suite completa) | Superato: 183 file, 2591 test, circa 559 s; `backup/g3-c3/suite-1.txt`. Rettifica: i 2588 test di «Interazioni C1-C3» sono il conteggio prima delle correzioni di revisione |
| Test aggiunti in revisione | `AdaptiveCategoryWidget` (tocco mentre il pager è tra due pagine: nessuna apertura; a riposo: una), `FixLauncherUi` (variante dell'avviso senza puntatore); `FixSystemFocus` e `LagLayers` riscritti; mirati verdi (158, 220, 12 e 93 test in esecuzioni separate) |
| `npm run build` e `node scripts/check-bundle-size.mjs` (frontend) | Superati |
| Backend `npm run test -w backend -- --maxWorkers=4` | Superato: 21 file, 202 test |
| `casa3d`: `npm run test -w casa3d`, `npm run build -w casa3d` | Superati: 440 test; 6 bundle entro budget, 2042,8 KB |
| Copia a freddo PRIMA del banco | Superata: `backup/banco/tunet-data-g3c3-pre-0.9.22-freddo.tgz`, 414866 byte, SHA-256 `4a238c93cf1007b28884068a2c156c47287cbe746be1627fce00d576ce69a2d4`, `tar -tzf` 4 voci, container fermo |
| Banco 0.9.22 | Superato: `up -d --build`, `healthy`, `/api/health` 0.9.22, `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7` |
| Tab M11 (HA2KZKYB, Chrome), un dito, senza service worker né cache | Superato per quanto elencato nel report: uso a schermo intero con ingranaggio e suggerimento, celle senza «+», indicatore a ogni cambio pagina, avviso sul widget da collegare, pressione lunga sullo spazio vuoto, trascinamento immediato, «Collega» con un tocco in modifica, «Pagine» e «Fine», ingranaggio e ritorno. Schermate in `backup/g3-c3/tablet/` |
| Misura rapida della vista pagine sul Tab M11 (display a 90 Hz, due giri) | Apertura 46,9-47,6 fps, picchi 411-412 ms; chiusura 55,7-57,4 fps, picchi 278 ms; modifica 88-90 fps; confronto con la 0.9.18 non omogeneo (display a 90 Hz); picco di apertura più alto di circa 90 ms (ISSUE-107) |
| Tocco sul corpo di un widget collegato (dettagli), doppio tocco, pressione lunga nelle pagine piene, cestino sotto la barra, TalkBack, `e2e` | **Non eseguiti** (nessun widget del banco è collegato; nessun comando a impianti reali) |
| Rilievi dalla prova | Titolo della pagina sovrapposto ai chip «Da collegare» con l'indicatore acceso (ISSUE-105); «Annulla» grigio dopo un trascinamento che non è stato annullato (ISSUE-106) |

Nessuna CI attiva dichiarata. Nessun commit Git. Copie PRIMA della correzione in `backup/g3-c3/pre/fix/`.

## 2026-10-21 — Ripristino 0.9.23: D-2 e D-8 rovesciate (REP-20261021-003, «Ripristino 0.9.23»)

| Controllo | Esito |
|---|---|
| Frontend `npm run typecheck`, `eslint src`, `lint:typography` (508 file), `lint:theme-colors` (339 file) | Superati, 0 violazioni |
| `vitest run --maxWorkers=4` mirati: `PagerBands`, `PagerOverview`, `FixLauncherUiShell`, `FrameGearCommands`, `FixSystemFocus`, `LauncherGestures`, `Casa3dShell`, `CategoryPages`, `SystemPage`, `ShellLauncher`, `Polish2LauncherKit`, `WidgetCommands`, `LauncherDragDrop`, `Polish2Cornice`, `PolishCornice`, `StatusBarBand`, `FooterBandCache`, `LauncherColumns`, `LauncherCoverGrid`, `PageDescriptor`, `PolishLauncherScreen`, `Polish2LauncherScreen`, `FixLauncherUi`, `LagLayers`, `LauncherIndicatorCover` | Superato: 25 file, 508 test |
| `vitest run --maxWorkers=4` su `LauncherScreen`, `FixLauncherUi`, `AdaptiveCategoryWidget`, `SystemPage` | Superato: 4 file, 175 test (`LauncherScreen.test.tsx` ha 119 test) |
| Guardia dei test sul difetto | Con `LauncherScreen.tsx`, `FlashingPageIndicator.tsx` e `pageDescriptor.ts` rimessi come prima del ripristino (copie PRIMA) falliscono 47 test; file poi rimessi e identici (`cmp`) |
| Prova headless sul PC (un Chromium con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, `launcher.html` con le fixture, nessun Home Assistant, 1280×665 e 390×844) | Superata: pressione lunga (mouse e dito sintetico) = `is-pressing` poi `is-overview` con la barra in alto a (350, 8), 580×68, che non copre le schede (inizio a 100 px a 1280, a 88 px a 390); «Fine» riporta tutto a riposo; tocco su una scheda = modifica con «Aggiungi widget / Modifica le pagine / Fine»; 16 celle «+» in uso a 1280, tocco = «Aggiungi un widget»; widget in uso tenuto 1,2 s: nessun cambio; scorrimento con il dito pagina 2 → 3; nessun errore di pagina. Script, risultati e schermate in `backup/ripristino-0.9.23/shots/` |
| Suite completa, banco, copia a freddo, Tab M11, TalkBack, `e2e` | **Non eseguiti** (nessun banco toccato; nessun comando a impianti reali) |

Nessuna CI attiva dichiarata. Nessun commit Git. Copie PRIMA in `backup/ripristino-0.9.23/pre/src/`.

## 2026-10-21 — Ripristino 0.9.23, widget: «Collega» al tocco e pressione lunga che evidenzia e trascina (REP-20261021-003, «Ripristino 0.9.23 — widget»)

| Controllo | Esito |
|---|---|
| Frontend `npm run typecheck`, `eslint src`, `lint:typography` (508 file), `lint:theme-colors` (339 file) | Superati, 0 violazioni |
| `vitest run --maxWorkers=4` su `LauncherScreen`, `CategoryPages`, `FixLauncherUi`, `LauncherGestures`, `LagLayers`, `FrameGearCommands` | Superato: 6 file |
| `vitest run --maxWorkers=4` sui file di launcher, Polish, pile, shell, widget operativi, categorie, adattivi, pager, modifica | Superato: 51 file, 939 test |
| Suite completa, banco, copia a freddo, Tab M11, TalkBack, `e2e` | **Non eseguiti** |

Nessuna CI attiva dichiarata. Nessun commit Git. Copie PRIMA in `backup/ripristino-0.9.23/pre/widget/`.

## 2026-10-21 — Casa 3D, R1: schermo intero, anteprima, piano del server (REP-20261021-002, «R1 — esito»)

| Controllo | Esito |
|---|---|
| `npm run typecheck`, `lint`, `lint:typography`, `lint:theme-colors` (frontend) | Superati (0 violazioni in 502 e 335 file) |
| `vitest run --maxWorkers=4` (frontend, suite completa) | Superato: 181 file, 2522 test, 549 s; uscita in `backup/casa3d/R1/log/frontend-suite.txt` |
| Test mirati dopo le ultime correzioni CSS (`Casa3d*`, `SystemPage`, fogli) | Superati: 22 file, 367 test |
| Backend: `typecheck`, `lint`, `vitest run --maxWorkers=4` | Superati: 21 file, 202 test (ruolo di scrittura: nessun 403, 401 senza sessione, dichiarazioni del client ignorate) |
| `casa3d`: `typecheck`, `npm test`, `marchio` | Superati: 440 test; marchio ok (202 file) |
| Banco isolato sul PC (`backup/casa3d/R1/banco`, porta 3013, un solo Chromium con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, nessuna richiesta fuori dal banco, Home Assistant e rotte `/api/casa3d` simulati), 1280×665 e 390×844 | Tutti i controlli superati in entrambi i formati: anteprima SVG senza canvas; un tocco apre `#/casa`; casa a tutto schermo; vista 3D pronta; menu con le sei voci; Esc chiude e il fuoco torna alla freccina; indietro chiude prima il menu; nessun dialogo chiuso esposto; «Ricomincia» salva la casa vuota con un punto di ripristino (revisione 6 → 7); Esc dalla piantina torna a Esplora; «Esci» riporta al launcher con il fuoco sul pulsante; nessun errore di pagina. Schermate in `backup/casa3d/R1/shots/` |
| Build di prova fuori da `dist` (`--outDir` nel banco) | Superata; `dist` e `check-bundle-size` non rieseguiti sul codice finale |
| Tab M11, telefoni, dito vero, TalkBack, swipe reale sul pager, ISSUE-062 | **Non eseguiti** |
| Comandi a impianti reali | Nessuno; l'interruttore dei comandi resta spento |

Nessuna CI attiva dichiarata. Nessun commit Git.

### Aggiornamento 2026-10-21 — Casa 3D, R1: controlli finali, banco 0.9.21 e Tab M11

| Controllo | Esito |
|---|---|
| Frontend `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check` | Superati |
| `vitest run --maxWorkers=4` (frontend, suite completa, dopo le correzioni di revisione) | Superato: 181 file, 2525 test; `backup/casa3d/R1/suite-1.txt` |
| `npm run build` e `node scripts/check-bundle-size.mjs` (frontend) | Superati; index 806,6 KB su limite 900 KB; avviso di chunk sopra 500 kB non bloccante |
| Backend `vitest run --maxWorkers=4`; `casa3d` `npm test`, `build` (typecheck e marchio) | Superati: 21 file e 202 test; 440 test, 202 file di marchio, 6 bundle entro budget |
| Casi aggiunti in revisione (`Casa3dHistory.test.tsx`): casa aperta dal suo indirizzo con menu o piantina poi «Esci»; due «Esci» ravvicinati | Superati |
| Copia a freddo PRIMA del banco | Superata: `backup/banco/tunet-data-casa3d-R1-pre-0.9.21-freddo.tgz`, 413806 byte, SHA-256 `ae0a1cb6c0c4ff7ff5a9e65f18ffb6e7c6854b683935a9da6d259793651c83e5`, `tar -tzf` 4 voci |
| Banco 0.9.21 | Superato: `up --build`, `healthy`, `/api/health` 0.9.21, `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7` |
| Tab M11 (HA2KZKYB, Chrome 1280×665), un dito, senza service worker né cache | Superato per quanto elencato: sul Tab M11 (Chrome 1280×665) la pagina «Casa 3D» del launcher mostra l'anteprima ferma e un tocco apre `#/casa` a schermo intero con la vista 3D pronta; il trascinamento a un dito ruota la casa e il pizzico la ingrandisce e la riduce; la freccina apre la barra con Esplora, Modifica la piantina, Piani, Elenco stanze, Qualità ed Esci; «Esci», il tasto indietro ed Esc riportano al launcher, e con la barra aperta indietro ed Esc chiudono prima la barra; «Ricomincia» sulla casa d'esempio rimasta da T6 chiede conferma e lascia la casa vuota (anteprima «Nessuna casa disegnata»); Sistema → Casa 3D apre la casa e indietro torna a Sistema. Chiavi `localStorage` invariate (38). |
| Telefoni, TalkBack, swipe reale sul pager, ISSUE-062, misura dei 4 s, pressione lunga sull'anteprima | **Non eseguiti** |

Nessuna CI attiva dichiarata. Nessun commit Git.

## 2026-10-21 — Ripristino 0.9.23: suite completa, build e banco (REP-20261021-003, «Ripristino 0.9.23 — banco e tablet»)

| Comando o prova | Esito |
|---|---|
| `npm run typecheck`, `npm run lint`, `npm run lint:typography` (508 file), `npm run lint:theme-colors` (339 file), `npm run i18n:check` (4/4) | Superati, nessuna violazione |
| `npx vitest run --maxWorkers=4` | 183/183 file, 2598/2598 test superati (circa 563 s; output in `backup/ripristino-0.9.23/suite-1.txt`) |
| `npm run build`, `node scripts/check-bundle-size.mjs` | Superati; index 807,7 KB su limite 900 KB; avviso chunk >500 kB non bloccante |
| Banco 0.9.23: `/api/health` e `/ha/auth/providers` | 0.9.23 e 200 su `127.0.0.1` e `192.168.1.27`; container `healthy` |
| Tab M11, prove al tocco (elenco in REP-20261021-003) | Esiti attesi, tranne pressione lunga + trascinamento nello stesso tocco (`pointercancel`, widget non spostato). Non eseguiti: TalkBack, `e2e` |

Nessuna CI attiva dichiarata. Nessun commit Git.

## 2026-10-22 — Rilascio dopo la pressione lunga e collaudo delle animazioni, banco 0.9.25 (REP-20261022-001)

| Comando o prova | Esito |
|---|---|
| `vitest run --maxWorkers=4` su `LauncherGestures`, `LauncherScreen`, `Casa3dShell`, `FixLauncherUi` | Superato: 4 file, 207 test; le due prove nuove sul rilascio falliscono senza la correzione |
| `npx vitest run --maxWorkers=4 --shard=1/2` e `--shard=2/2` | Superati: 183 file, 2611 test (1500 + 1111); `backup/animazioni-0.9.25/suite-1a.txt`, `suite-1b.txt` |
| `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npm run i18n:check` | Superati |
| `npm run build`, `node scripts/check-bundle-size.mjs` | Superati; index 808,7 KB su limite 900 KB; avviso di chunk oltre 500 kB non bloccante |
| Banco 0.9.25: copia a freddo PRIMA, `up -d --build`, `/api/health` e `/ha/auth/providers` | Superati: `healthy`, 0.9.25 e 200 su `127.0.0.1` e `192.168.1.27` |
| Tab M11, rilascio dopo una pressione lunga di 700 ms a 60 px dai bordi | Superato; **non copre le tenute oltre circa 1,3 s** |
| Tab M11, S1-S8 con 3 ripetizioni e passata senza sonda, gesti sintetici | Eseguito: scorrimento, fogli, pillola, suggerimento e movimento ridotto fluidi; **difetto del rilascio presente con tenute di 1,5 s (3/3 per lato)**; blocchi del thread di 160-490 ms e altri glitch in ISSUE-108…114; numeri in REP-20261022-001 |
| Chromium software 390×844 e 360×780, S1-S8 | Eseguito: solo glitch logici (tempi non realistici); difetto del rilascio presente con tenute di 1,4-2,5 s; ritorno da Sistema, frecce e chiusura del foglio con layout-shift |
| Dito vero, telefono reale, widget collegati, TalkBack, testo ingrandito, tastiera, Casa 3D con dati, avviso di disposizione bloccata, prove A/B delle cause | **Non eseguiti** |

Incidente: nella passata a misura di telefono `taskkill /F /IM chrome.exe /T` ha terminato tutti i processi `chrome.exe` della macchina; effetto sulle finestre dell'utente non verificato. Prove in `backup/animazioni-0.9.25/` (fuori da Git).

Nessuna CI attiva dichiarata. Nessun commit Git.

## 2026-10-22 (seconda) — Correzione del rilascio dopo tenute lunghe (ISSUE-108, REP-20261021-003)

| Comando o prova | Esito |
|---|---|
| `vitest run --maxWorkers=4` su `LauncherGestures`, `LauncherScreen`, `Casa3dShell`, `FixLauncherUi` | Superato: 4 file, 221 test; 16 prove nuove al posto di quella «dopo 800 ms»; 13 (tenute di 1,5, 2,5 e 5 s, trascinamento, `pointercancel`, altro dito) falliscono con il sorgente precedente |
| `tsc -p tsconfig.strict.json --noEmit`, `eslint src/hooks/launcher/useLongPress.ts`, `prettier --check`, `lint:typography`, `lint:theme-colors` | Superati, 0 violazioni |
| Prova headless 1280×665 DPR 1.5, tocco CDP, Chromium con GPU spenta, server isolato (`backup/rilascio-0.9.26/prova/hold.cjs`): bordo sinistro, destro e centro con tenute di 0,7, 1,5 e 2,5 s | Build nuova 9/9 senza apertura né cambio di pagina; build precedente 3/9 (falliscono 1,5 e 2,5 s in tutti i punti). Valida per la logica, non per i tempi |
| Suite completa, prova col dito sul Tab M11, telefono reale, nuovo banco | **Non eseguiti** |

Nessuna CI attiva dichiarata. Nessun commit Git.

## 2026-10-22 (terza) — Rilascio del banco 0.9.26 (ISSUE-108)

| Comando o prova | Esito |
|---|---|
| `vitest run --maxWorkers=4` (suite completa, `backup/rilascio-0.9.26/suite-main.txt`) | Superato: 183 file, 2626 test, durata 984,8 s |
| `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npm run i18n:check` | Superati: tipi e lint senza output; tipografia 0 violazioni su 508 file; colori 0 violazioni su 339 file; i18n 4 test |
| `npm run build` e controllo dimensioni (`build.txt`, `bundle.txt`) | Superati: index 809,0 KB su limite 900 KB, tutti i pacchetti nei limiti; avviso di chunk oltre 500 kB (hls) non bloccante |
| Banco 0.9.26: copia a freddo PRIMA (464901 byte, SHA-256 `d73a5ce5...9d89c`, `tar -tzf` leggibile), `up -d --build`, `/api/health` 0.9.26 e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.27` | Superati; container `healthy` |
| Tab M11, 36 tenute (3 punti x 0,7/1,5/2,5/4 s x 3 ripetizioni) con rilascio nello stesso punto e «Fine» | Superato 36/36, gesti sintetici |
| Tab M11, widget: pressione lunga più trascinamento di circa 6 s nello stesso tocco, «Annulla» | Superato 3/3 (un primo giro con il selettore sbagliato di «Annulla» ha richiesto il ripristino delle chiavi del launcher; firma finale identica) |
| Prova col dito vero, telefono reale | **Non eseguita** |

Nessuna CI attiva dichiarata. Nessun commit Git.

## 2026-10-23 — Prova di rete P0 (Wake on LAN con MAC fittizio) e preparazione della VM `acasystem-ha` (REP-20261023-003, «Esito P0, I1 e I2»)

Richiesta: risposte dell'utente del 2026-10-23 («Sì, entrambi» per D-I1 e P0), registrate in REP-20261023-003, sezione «Risposte dell'utente». Eseguito da Claude Code (Sonnet 5.5, `claude-sonnet-5-5`). Nessuna modifica al container o alla configurazione di HA, a Docker, alla rete di Windows o al tablet; nessun comando a dispositivi reali; nessuna credenziale né token; nessun browser né suite di test; nessun commit.

**P0 — pacchetto magico con MAC fittizio `02:00:00:00:00:01`** (indirizzo localmente amministrato, nessun dispositivo reale; 102 byte = 6 × `ff` + 16 × MAC).

| Passo | Comando e ora | Esito |
|---|---|---|
| Ascoltatore sul tablet | `adb shell "timeout 3 nc -u -l -p 9 -o-"` (Tab M11, `192.168.1.46` sulla stessa rete `192.168.1.0/24` del PC; toybox 0.8.11, `nc -u` disponibile), 11:11 circa | **Non possibile:** `nc: bind: Permission denied`. La shell adb gira come `uid=2000(shell)` e non può aprire la porta 9 (sotto 1024, serve root). Non è stato installato nulla né cambiata alcuna impostazione. **Ripiego come da incarico: ascoltatore sul PC** |
| Ascoltatore sul PC | `powershell.exe -File p0-listener.ps1` (socket UDP su `0.0.0.0:9`, PID 37652, si chiude da solo dopo 45 s), avviato alle 11:13:31 | Attivo 11:13:31-11:14:16, terminato da solo; nessun altro processo toccato |
| Invio dal container `homeassistant` | 11:13:40: `docker exec homeassistant python3 -c '…socket UDP, SO_BROADCAST, sendto(pkt, (dest, 9))…'` verso `192.168.1.255:9` e `255.255.255.255:9` (un datagramma ciascuno). Container `172.17.0.2/16` (rete `bridge`), Python 3.14.6 | Entrambe le `sendto` riuscite (102 byte). L'ascoltatore del PC ha ricevuto **un solo datagramma** (11:13:40.938, 102 byte, contenuto corretto), con sorgente **`192.168.1.7`:60642**, cioè l'indirizzo Wi-Fi del PC, non `172.17.0.2`: Docker Desktop lo riemette dallo stack del PC. L'ascoltatore non registra l'indirizzo di destinazione, quindi **non si sa quale dei due invii sia arrivato**; il secondo non è stato visto |
| Controllo positivo dal PC | 11:13:44: `p0-send-pc.ps1` (UdpClient con `EnableBroadcast`, sorgente fissata a `192.168.1.7`) verso `192.168.1.255:9` e `255.255.255.255:9` | Ricevuti **2 su 2** dall'ascoltatore del PC (11:13:44.438 e .441). Prova che l'ascoltatore funziona |

**Esito P0.** «Arriva» **solo al PC**, cioè lo stesso apparecchio che ospita Docker Desktop, e per **uno solo dei due invii** dal container, con sorgente riscritta all'IP del PC. **Non dimostrato né smentito** che il pacchetto arrivi a un altro apparecchio della LAN: l'ascoltatore sul tablet non è realizzabile con questi strumenti e un ascoltatore sul PC non distingue un pacchetto uscito sulla LAN da uno consegnato localmente dal NAT di Docker Desktop. Il sospetto del piano (dal bridge il pacchetto probabilmente non esce) resta **non verificato**. La riscrittura della sorgente a `192.168.1.7` indica che il pacchetto passa dallo stack di rete del PC, il che è compatibile con un'uscita sulla LAN [NV]. Per un esito concludente servirebbe un ascoltatore su un secondo apparecchio senza il vincolo della porta 9 (un PC o telefono con app di rete, oppure root sul tablet): richiede una nuova autorizzazione. La prova va comunque ripetuta dalla VM in I5.

Evidenze: `backup/dispositivi/p0/` (`p0-listener.ps1`, `p0-listener.log`, `p0-send-pc.ps1`, `p0-send-container.txt`), esclusa da Git.

**I1 — scaricamento (autorizzato con D-I1).**

| Controllo | Esito |
|---|---|
| Release: API GitHub `releases/tags/18.3` (11:14), `home-assistant/operating-system`, pubblicata il 2026-09-17T15:52:18Z, non bozza né prerelease; asset `haos_ova-18.3.vdi.zip` | Nome e dimensione dichiarata **559 213 211 byte** corrispondenti alla richiesta |
| Checksum pubblicato | La release non ha un file di checksum tra i 35 asset; GitHub riporta per l'asset il campo `digest`: `sha256:c626ffe0db7dd717270b41240ee3cbb5ada78a364239795f04435d6116c236d3` |
| Scaricamento | `curl -L` da `https://github.com/home-assistant/operating-system/releases/download/18.3/haos_ova-18.3.vdi.zip` verso `backup/dispositivi/haos/` (cartella nuova e vuota), 11:14:43-11:15:05: HTTP 200, **559 213 211 byte** |
| SHA-256 del file scaricato | `c626ffe0db7dd717270b41240ee3cbb5ada78a364239795f04435d6116c236d3`: **uguale** al digest di GitHub |
| Archivio | `python -I` con `zipfile`: un solo file `haos_ova-18.3.vdi` (989 987 328 byte), `testzip()` senza errori. Estrazione eseguita; il file scaricato non è stato eseguito |
| `.vdi` estratto | 989 987 328 byte, SHA-256 `62580d1c0d6384c9077d3b39df61b0adec29cb7a69df44430471a34634d7bb2b` (calcolato qui, non pubblicato dalla release) |

**I2 — VM `acasystem-ha`** (VirtualBox 7.2.4r170995, `VBoxManage`, 11:16): creata e registrata, **mai avviata** (`VMState=poweroff`, `list runningvms` vuoto). Dettaglio dei comandi e del ritorno indietro in `infrastructure.md`. Verifica con `showvminfo --machinereadable`: `firmware=EFI64`, `cpus=2`, `memory=4096`, controller SATA con il `.vdi` sulla porta 0, scheda 1 `bridged` su «Realtek RTL8852BE WiFi 6 802.11ax PCIe Adapter» con `cableconnected1=off`, scheda 2 `hostonly` su «VirtualBox Host-Only Ethernet Adapter», `autostart-enabled=off`, ordine di avvio solo disco.

**Non eseguito:** avvio della VM; migrazione con il backup di HA; collegamento della scheda a ponte; limitazione della 8123; passaggio di Acasystem al nuovo HA; Wake on LAN verso apparecchi reali; prove con il TV; prova con root o con un secondo apparecchio come ascoltatore.

## 2026-10-23 — Widget non nascondibili e memoria della configurazione per dispositivo ([ADR-0019](decisions/ADR-0019-memoria-per-dispositivo.md), [REP-20261021-003](reports/REP-20261021-003-interazioni-schermo-intero.md), annotazione «seconda»)

Eseguito da Claude Code (Sonnet 5.5, `claude-sonnet-5-5`) dalla cartella `progetto/acasystem/frontend`. Nessun commit, nessun browser, nessun tablet, nessun banco, nessuna suite completa.

| Controllo | Esito |
|---|---|
| `npx vitest run src/__tests__/DeviceMemory.test.ts src/__tests__/WidgetMemoryProvider.test.tsx --maxWorkers=4` | 2 file, 41 test verdi |
| Vitest `--maxWorkers=4` sui 118 file di prova che importano launcher, fogli, `PageContext`, istantanea, widget adattivi, profili | 118 file, 2022 test verdi |
| `npx tsc -p tsconfig.strict.json --noEmit`, `npx eslint src`, `npm run lint:typography`, `npm run lint:theme-colors` | verdi (0 violazioni; 513 e 339 file) |

**Non eseguito:** suite completa, `build`, `check-bundle-size`, `e2e`, prova sul Tab M11, sincronizzazione tra due dispositivi, profilo reale con widget nascosti.

## ISSUE-109, tappa Z — misura finale e banco 0.9.27 (2026-10-23)

Fonte: [REP-20261022-002](reports/REP-20261022-002-piano-blocchi-thread.md), annotazione «Tappa Z». Tab M11, fixture, gesti sintetici, 168 giri (14 scenari, build 0.9.26 estratta dal container contro `dist-finale`, 5 giri alternati più giro 0, 0 non validi). **Eseguito:** O3 raggiunto (0 `transitioncancel`); O1a rispettata (somme 0,46-0,73 della base, massimi 102-207 ms); blocchi ridotti a intervalli non sovrapposti in T1, T2, T3, T6, S3cD, T4, S5b, T5. **Non raggiunto:** O1 (100 ms), O4 (i «+» 92 ms dopo la fine della transizione delle pagine). **Peggiore della base (O5):** scorrimento durante il gesto (primo lancio 35 contro 60 fps, blocchi 55-80 ms contro 0) e pallino accanto (108 ms contro 0). Controllo funzionale sul banco 0.9.27 (informativa sull'AI, salto diretto, aggiunta in pagina piena, solo barra del widget): superato con gesti sintetici. **Non eseguito:** suite, lint, i18n, dimensione dei pacchetti, telefono, TalkBack, dito vero, Casa 3D vera, `release.check.mjs`.

## ISSUE-109 e 0.9.27, verifica completa del software (2026-10-23, prima della tappa Z)

Fonte: [REP-20261022-002](reports/REP-20261022-002-piano-blocchi-thread.md), «Esito del blocco (2026-10-22)». Eseguita da un passo del flusso (Claude Code, claude-sonnet-5-5) sul working tree dopo l'ultima tappa di codice («Aggiungi widget» nella vista pagine), con `--maxWorkers=4`, nella cartella `progetto/acasystem/frontend` (e `backend` dove indicato). Nessun commit.

| Comando | Esito |
|---|---|
| `vitest run --maxWorkers=4 --shard=1/4` | 48 file, 690 test verdi |
| `vitest run --maxWorkers=4 --shard=2/4` | 48 file, 932 test verdi |
| `vitest run --maxWorkers=4 --shard=3/4` | 48 file, 664 test verdi |
| `vitest run --maxWorkers=4 --shard=4/4` | 48 file, 542 test verdi |
| `npm run typecheck` | verde (tsc strict) |
| `npm run lint` | verde (eslint su `src`) |
| `npm run lint:typography` | 0 violazioni (515 file) |
| `npm run lint:theme-colors` | 0 violazioni (341 file) |
| `npm run i18n:check` | 1 file, 4 test verdi |
| `npm run build` | completata; solo l'avviso usuale sul pacchetto oltre 500 kB |
| `node scripts/check-bundle-size.mjs` | tutti i pacchetti entro i limiti |
| `npm run test -w backend -- --maxWorkers=4` | 21 file, 202 test verdi |

**Totale frontend:** 192 file, 2828 test verdi. **Limiti:** la verifica precede la tappa Z, che ha cambiato solo la versione in `.env` e negli e2e e l'indirizzo in `compose.tunet.yaml`, e non è stata rieseguita dopo; l'esito «Non eseguito: suite, lint, i18n, dimensione dei pacchetti» della sezione precedente riguarda il passo di Z, non questa verifica. Nelle esecuzioni mirate di una tappa precedente `Casa3dPage.test.tsx:241` era risultato instabile sotto carico; nelle quattro parti è verde. Non eseguiti: `e2e`, `release.check.mjs`, prove col dito, sul telefono e con TalkBack.

## 0.9.28, coreografia, blocco 1: pressione e vista pagine (2026-10-23)

Fonte: [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md), «Blocco 1 della realizzazione». Eseguita da un passo del flusso (Claude Code, claude-sonnet-5-5) nella cartella `progetto/acasystem/frontend`, con `--maxWorkers=4` e solo test mirati. Nessun commit, nessun tablet, banco o Docker.

| Comando | Esito |
|---|---|
| `vitest run --maxWorkers=4` su 42 file pertinenti (vista pagine, pager, launcher, barre, indicatore, gesti, kit, fogli, trascinamento, pile) | 42 file, 893 test verdi |
| `npm run typecheck` | verde (tsc strict, test compresi) |
| `npm run lint` | verde (eslint su `src`) |
| `npm run lint:typography` | 0 violazioni (516 file) |
| `npm run lint:theme-colors` | 0 violazioni (341 file) |
| `prettier --check` sui file toccati | verde |

**Guardie nuove:** `SceneStaging.test.tsx` (messa in scena in due tempi, aspetto trattenuto nell'attesa, chiusura senza timer nell'attesa, flag di occupazione per la pressione lunga, scheda che entra, che esce e spostata, indicatore che cede alla pillola), `MotionChoreography.test.ts` (token, uscite più brevi delle entrate, ordine della scena, scale entro ±10 %, nessuna rotazione nuova), cinque scenari «staged scene» e quattro «press on a «+»» in `LauncherScreen.test.tsx`, vibrazione alla soglia in `LauncherGestures.test.tsx`. **Aggiornati** i test che fissavano il comportamento superato: `LauncherGestures`, `LagLayers`, `PagerBands`, `EditToolbarHidden` (CSS), `PagerOverview` e `PagerRestyle` (tempo di sicurezza della chiusura 410 → 450 ms). **Non eseguiti:** suite completa, backend, build, i18n, misure A1-A13 sul Tab M11, prova col dito, telefono, TalkBack. I test leggono il CSS come testo: il movimento reale e il costo di stile non sono verificati.

## 0.9.28, coreografia, blocco 2: fogli, Sistema, pillole e avvisi (2026-10-23)

Fonte: [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md), «Blocco 2 della realizzazione». Eseguita da un passo del flusso (Claude Code, claude-sonnet-5-5) nella cartella `progetto/acasystem/frontend`, con `--maxWorkers=4` e solo test mirati. Nessun commit, nessun tablet, banco o Docker.

| Comando | Esito |
|---|---|
| `vitest run --maxWorkers=4` su 50 file pertinenti (fogli, kit, Sistema, avvisi, indicatore, barre, vista pagine, pager, launcher, gesti, Casa 3D) | 50 file, 1013 test verdi |
| `npm run typecheck` | verde (tsc strict, test compresi) |
| `npm run lint` | verde (eslint su `src`) |
| `npm run lint:typography` | 0 violazioni (519 file) |
| `npm run lint:theme-colors` | 0 violazioni (341 file) |
| `prettier --check` sui file toccati | verde |

**Guardie nuove:** `SheetSystemChoreography.test.tsx` (contenuto del foglio congelato durante l'uscita, `data-arrived` all'arrivo, sovrapposizione di due fogli, fasi della scena di Sistema, toast, avviso e etichetta che escono), `MotionChoreographyBlock2.test.ts` (token uguali agli orari del codice, regole dei fogli, livello di Sistema solo `opacity` e `scale`, nessuno scivolamento negli avvisi, «Rimuovi» senza cambio di larghezza), `SystemScene.test.tsx` (LauncherPage reale con `overlayStaged`). **Aggiornati** due test che fissavano l'attributo `hidden` su «Fine» durante il trascinamento (`LauncherGestures`, `LauncherScreen`). **Non eseguiti:** suite completa, backend, build, i18n, e2e; misure sul Tab M11 (A1-A13) e prova col dito; in particolare lo scorrimento di Sistema nel suo nuovo livello non è stato provato su un dispositivo.

## 0.9.28, coreografia, blocco 3: widget (2026-10-23)

Fonte: [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md), «Blocco 3 della realizzazione». Eseguita da un passo del flusso (Claude Code, claude-sonnet-5-5) nella cartella `progetto/acasystem/frontend`, con `--maxWorkers=4` e solo test mirati. Nessun commit, nessun tablet, banco o Docker, nessun browser.

| Comando | Esito |
|---|---|
| `vitest run --maxWorkers=4` su 43 file pertinenti (vista pagine, pager, launcher, widget, trascinamento, kit, fogli, Sistema, gesti, pile, scene) | 43 file, 921 test verdi (dopo due correzioni lato test, vedi il report) |
| `vitest run --maxWorkers=4` su altri 12 file che nominano le classi del launcher o i token, più `LauncherSelection`, `LauncherDragDrop`, `DragGhostLift` | 15 file, 276 test verdi |
| `npm run typecheck` | verde (tsc strict, test compresi) |
| `npm run lint` | verde (eslint su `src`) |
| `npm run lint:typography` | 0 violazioni (520 file) |
| `npm run lint:theme-colors` | 0 violazioni (341 file) |
| `prettier --check` sui file toccati | verde |

**Guardie nuove:** `MotionChoreographyBlock3.test.ts` (21: token, sagoma piatta e tratteggiata, caselle, copia ferma, volo, uscita e entrata del widget, scale entro ±10 % con tre eccezioni preesistenti), `WidgetChoreography.test.tsx` (31: fasi di `useResizeShape`, sagoma su `WidgetHost`, store, caselle, volo di `useWidgetDrag`, `DragGhost`), 7 scenari in `LauncherScreen.test.tsx`. **Aggiornati** `MotionChoreography`, `LauncherGestures`, `LauncherScreen` (copia senza oscillazione) e `PagerFarPages` (la guardia ammette due `content-visibility`: la finestra delle pagine e il contenuto di un widget sotto la sagoma). **Non eseguiti:** suite completa, backend, build, i18n, e2e; misure A1-A13 sul Tab M11, prova col dito, telefono, TalkBack. In particolare non si sa se `content-visibility: hidden` sul contenuto tolga fotogrammi oltre 22 ms, né se `@starting-style` agisca sugli pseudo-elementi (anello, ombra della copia) su Chrome del tablet.

## 0.9.28, parte 2a: verifica completa del software e misura sul Tab M11 (2026-10-23, sera)

Fonte: [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md), «Esito della 0.9.28». Evidenze in `backup/v0928/` (esclusa da Git: `suite-1-*.txt`, `suite-2-*.txt`, `step-*.txt`) e `backup/v0928/tablet-misura/`. Esecuzioni di passi del flusso (Claude Code, claude-sonnet-5-5), cartella `progetto/acasystem/frontend` (e `backend`), `--maxWorkers=4`. Nessun commit. Questa sezione trascrive i file di evidenza; non rieseguo i comandi.

| Controllo | Esito |
|---|---|
| Suite frontend, primo giro (4 parti) | 1 test rosso su 3002: `MetalMaterial.test.jsx`, «tiene le primitive al primo livello…», perché `components/Sheet.tsx` importava da uno strato vietato. Parti: 730, 989 (1 rosso su 990), 707, 575 test |
| Correzione | Import di `Sheet.tsx` corretto dal passo di codice |
| Suite frontend, secondo giro (4 parti) | 199 file, **3002 test verdi** (730 + 990 + 707 + 575) |
| `tsc -p tsconfig.strict.json --noEmit` | Verde |
| `eslint src` | Verde |
| `npm run lint:typography` | 0 violazioni (520 file) |
| `npm run lint:theme-colors` | 0 violazioni (341 file) |
| `npm run i18n:check` | 1 file, 4 test verdi |
| `npm run build` | Completata; solo l'avviso sui pacchetti oltre 500 kB |
| `node scripts/check-bundle-size.mjs` | Tutti i pacchetti entro i limiti |
| Backend (`npm run test -w backend`) | 21 file, 202 test verdi |

**Limite sull'ordine.** I file `step-*.txt` hanno orario 19:33-19:37, subito dopo il primo giro (ultima parte alle 19:36) e prima del secondo (19:40-19:48): tipi, lint, tipografia, colori, i18n, build, dimensioni e backend non risultano rieseguiti dopo la correzione di `Sheet.tsx`. **Da rifare prima di un commit.**

**Misura sul Tab M11 (A1-A13 di REP-20261023-006).** Tab M11, Chrome 156, 1280×665, DPR 1,5; **gesti sintetici CDP** sui fixture, non il dito; base 0.9.27 (bundle estratto dal contenitore) contro `backup/v0928/dist-finale`; 0.9.26 per lo scorrimento; 5 giri alternati più il giro 0, mediana [min-max]. Esito: raggiunti A8, A12 (trasformazioni), A11; A7 solo sul «+»; A10 in parte; **non raggiunti A1-A6, A9, A13**. Scorrimento (blocco massimo, ms, 0.9.26 / 0.9.27 / 0.9.28): SW1 62 / 75 / 110, SW2 74 / 64 / 98, SW3 77 / 81 / 95, JUMP 93 / 119 / 106. Prova a video sul PC (Chromium software, nessuna rotazione né scuotimento, scale entro il 10 %): osservazioni, non misure di prestazione.

**Non eseguito:** prova col dito dell'utente; traccia del compositore (i rAF non sono fotogrammi presentati); telefono; Casa 3D; e2e (Playwright) sulla 0.9.28; aggiornamento del banco e copia a freddo (la tappa Z si è fermata prima). **Errore del passo di misura:** le prime prove (tabelle `L-*`) avevano un widget Luce in più in 3013/3014, uguale per le due build; valgono le tabelle `M-*`.

## 0.9.28, parte 3: correzioni delle regressioni e seconda misura sul Tab M11 (2026-10-24)

Fonte: [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md), «Parte 3: regressioni e correzioni (2026-10-23/24)». Evidenze in `backup/v0928/` (esclusa da Git: `suite3-*.txt`, `misura3/`, `diagnosi3/`). Esecuzioni di passi del flusso (Claude Code, claude-sonnet-5-5), cartella `progetto/acasystem/frontend`, `--maxWorkers=4`. Nessun commit. Questa sezione trascrive gli esiti riportati dai passi; non rieseguo i comandi.

| Controllo | Esito |
|---|---|
| Suite frontend completa (`npx vitest run --maxWorkers=4`) | 201 file, **3016 test verdi**, 1466 s (prima 199 file e 3002 test); nuovi `SystemSceneRenders` e `RegressionCss0928`; riscritte le attese di 13 test di `PagerFarPages` e `PagerFarNear` (fissavano il comportamento 0.9.28 superato) e i test dell'hook in `SceneStaging.test.tsx` |
| Test di guardia | host di scena non rifatto alla fine dell'attesa e nessun `flushSync`; `LauncherPage` non rende il launcher nelle fasi della scena (fallisce con il file di prima: 7 contro 4 e 14 contro 11 render); nessun `data-far` né classe sul pager dall'arresto dello scorrimento al restringimento; contenuto del foglio mantenuto per tutta l'uscita lenta; regola CSS e `will-change` di Sistema |
| `tsc -p tsconfig.strict.json --noEmit` | Verde |
| `npm run lint` | Nessun avviso né errore |
| `npm run lint:typography` / `lint:theme-colors` | 0 violazioni (522 / 343 file) |
| Prettier sui file toccati | Pulito |
| `npx vite build --outDir backup/v0928/dist-parte3` | Riuscita |
| i18n | Nella suite |
| Backend | Non toccato e **non rieseguito** |

**Misura sul Tab M11** (Chrome, 1280x665 a DPR 1,5; **gesti sintetici CDP** sui fixture, non il dito; `dist-parte3` contro 0.9.27 e, per lo scorrimento, 0.9.26; 5 giri alternati più il giro 0; giri non validi 0). Esito: **migliori** la chiusura del foglio «Impostazioni del widget» (layout-shift 0 contro 0,014), il riscontro del «+» (15,7-17,5 contro 107-301 ms), il tocco breve (0 fotogrammi sotto scala 1 in 12 prove su 12) e il blocco prima del volo della copia (0 contro 119-140 ms); **scorrimento** con blocco massimo non distinguibile dalla 0.9.27 (SW1 121 [76-146] contro 85, SW2 76 contro 60, SW3 72 contro 85) ma somma peggiore su SW1 e SW2 (348 contro 144; 275 contro 118) e JUMP peggiore su tutto (133 contro 93 ms); **peggiori** apertura della vista pagine (290 contro 65 ms prima della scena), «Fine» (894 contro 748 ms), Sistema, «Annulla» della pillola (285 contro 184 ms) e della barra, commit dentro il volo della copia (blocco 143 contro 0 ms), blocchi nel ridimensionamento.

**Non eseguito:** traccia CDP del thread (non registrata, vedi la diagnosi); prova col dito; telefono; Casa 3D; e2e (Playwright) sulla 0.9.28; backend; aggiornamento del banco. **Limiti:** gesti sintetici, i rAF non sono fotogrammi presentati. Le correzioni sono state provate prima della misura solo con i test di guardia (jsdom); la misura non conferma il ritorno dello scorrimento al livello della 0.9.27.

## 2026-10-25 — 0.9.28, quarto giro dell'ottimizzazione: correzioni e misura sul Tab M11 (REP-20261023-006, «Giro 4 (2026-10-25)»)

Fonte: [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md), sezioni «Giro 4: applicazione dei passi 1-7» e «Misura del giro 4 sul Tab M11». Evidenze in `backup/v0928/` (esclusa da Git: `g4/vitest-completo.log`, `build-g4.log`, `misura-g4/RISULTATI.md`, `diagnosi-g4/`). Esecuzioni di passi del flusso (Claude Code), cartella `progetto/acasystem/frontend`, `--maxWorkers=4`. Nessun commit. Questa sezione trascrive gli esiti riportati dai passi; non rieseguo i comandi.

| Controllo | Esito |
|---|---|
| Suite frontend completa (`npx vitest run --maxWorkers=4`) | Superato: 204 file, **3089 test** (prima 203 file e 3064); nuovi `Optimize0928G4` (19 test) e 6 test «J-A» in `PagerFarPages`; aggiornati `LauncherScreen`, `PolishLauncherScreen`, `StyleInvalidation0928` |
| Test di guardia sul codice di prima | 4 dei 6 test J-A e 9 dei 19 di `Optimize0928G4` falliscono sui sorgenti precedenti (gli altri descrivono comportamenti invariati) |
| `npm run typecheck` (`tsc -p tsconfig.strict.json --noEmit`), `eslint src` | Superato |
| `lint:typography` / `lint:theme-colors` | Superato: 0 violazioni (523 / 343 file) |
| `npx vite build --outDir backup/v0928/dist-g4` | Riuscita (solo l'avviso sui chunk oltre 500 kB); `dist/` non toccato |
| Prettier (`format:check`) | Non superato sulla base per file già fuori formato; non applicato ai file preesistenti, il codice aggiunto è formattato |
| Backend | Non toccato e non rieseguito |

**Misura sul Tab M11** (Chrome, 1280x665 a DPR 1,5; gesti sintetici CDP sui fixture; `dist-g4` contro 0.9.27; 5 giri alternati più il giro 0; mediana [min-max]; «migliore» o «peggiore» solo a intervalli non sovrapposti; giri non validi 0). **Obiettivo «nessuna misura peggiore della 0.9.27»: non raggiunto.** Risolti: task extra di JUMP «-6» (blocco prima di T0 0 contro 0 in 5 giri su 5) e task a fine volo del rilascio (nessun task oltre +250 ms; blocco in finestra 0 contro 0 in S3a e S3cD). **Peggiori:** JUMP, massimo dei task lunghi 125 [123-133] contro 106 [90-116] ms; apertura della vista pagine in T1, task prima della scena 72 [68-74] contro 65 [59-67] ms; uscita da Sistema, somma dei due task 282 [278-334] contro 269 [263-275] ms. La dissolvenza di entrata in Sistema è peggiore (fps 72,6 contro 82,8) ma accettata dall'utente il 2026-10-25. Nd o migliori: SW1-SW3, JUMP (somma 196 contro 192, numero 2 contro 2), «Fine», «Annulla» di pillola e barra, rilascio della copia prima del volo, ridimensionamento; mantenuti il riscontro del «+» (17 contro 106-306 ms), il tocco breve, il foglio senza salto e il layout-shift del ridimensionamento.

**Non eseguito:** prova a video del giro 4 (scorrimento verso la vicina dopo un rilascio, «Annulla» e Sistema due fotogrammi dopo l'atterraggio, mouse sulle celle durante il trascinamento), J-B, prova col dito, TalkBack, e2e, telefono, nuovo banco. **Limiti:** gesti sintetici, i rAF non sono fotogrammi presentati; le simulazioni che hanno motivato il piano erano di 1-3 giri e non seguono la regola a intervalli; la causa dei circa 19 ms in più del tocco «+1» in JUMP è un'ipotesi non confermata da una traccia.

## 2026-10-26 — ISSUE-116 (a) e ISSUE-117 P1: controlli locali (REP-20261023-006, annotazione)

Fonte: [project-status.md](project-status.md), ISSUE-116 e ISSUE-117. Esecuzione di un passo del flusso (Claude Code, claude-sonnet-5-5), cartella `progetto/acasystem/frontend`, `--maxWorkers=4`. Log in `backup/v0929/` (esclusa da Git). Nessun commit, browser o tablet.

| Controllo | Esito |
|---|---|
| `tsc -p tsconfig.strict.json --noEmit` | Superato |
| `eslint src` | Superato |
| `lint:typography` / `lint:theme-colors` | 0 violazioni (523 / 343 file) |
| Mirati: `PagerFarPages`, `PagerFarNear`, `PagerRestyle`, `LauncherStacks` (14), `LauncherController` (20), `LauncherScreen` (sezione ISSUE-116, 4) | Superati |
| Suite completa `npx vitest run --maxWorkers=4` | 204 file, **3109 test verdi**, 624 s (`backup/v0929/vitest-completo.log`) |
| `npx vite build --outDir backup/v0929/dist` (`dist/` non toccata) | Riuscita |

**Guardie nuove:** pagine incrociate dallo scorrimento in corso (`PagerFarPages.test.tsx`); sollevamento e rimessa delle pile fantasma, senza cancellarle (`LauncherStacks.test.tsx`, `LauncherController.test.tsx`); caselle libere al posto della pila fantasma in uso e in modifica, nessuna casella riservata, layout invariato, tocco sul «+» (`LauncherScreen.test.tsx`); `isCardHiddenByLogic` nasconde l'id di una pila (causa osservata).

**Non eseguito:** prova sul tablet (tocco reale, costo SW1-SW3/JUMP/T1, pila di prova sul server dei fixture, Copertina del banco), prova col dito, e2e, telefono, TalkBack. La pagina Multimedia **non** cambia (vedi ISSUE-116): resta una scelta dell'utente.

## 2026-10-26 — 0.9.28 sul banco: prove sul Tab M11 (REP-20261023-006, «Banco 0.9.28 e prove sul tablet»)

Fonte: [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md) e [infrastructure.md](infrastructure.md), «Aggiornamento — banco 0.9.28, 2026-10-26». Evidenze in `backup/v0928/tablet-banco/` (esclusa da Git).

| Controllo | Esito |
|---|---|
| Banco `aca-system:0.9.28` su 192.168.1.27:3002: container healthy, `/api/health` 0.9.28, `/ha/auth/providers` 200 su `127.0.0.1` e IP LAN | Superato |
| Tab M11, gesti sintetici CDP, bundle nuovo senza service worker né cache: tocco breve su «+» e sul vuoto, pressione lunga, vista pagine, «Fine», frecce, scorrimento, salto diretto, widget (barra, copia, rilascio, «Annulla»), sagoma tratteggiata, pillola, «Aggiungi widget», Sistema con il pulsante «AI», informativa | Superato |
| Cambi del giro 4 (celle libere durante il trascinamento e 194 ms dopo il rilascio, raggiungibilità di ingranaggio e barra 95 ms dopo la fine) | Superato |
| Pagina Multimedia senza caselle vuote | **Non superato**: due caselle senza «+» (`stack_mvjd2g21`, `withoutEmptyStacks` non la copre); non corretta, proposta |
| Residui di prestazione del giro 4 | Accettati dall'utente il 2026-10-26; aperti in ISSUE-115 |

**Non eseguito:** prova col dito dell'utente, telefono, TalkBack, `release.check.mjs`, suite e controlli statici in questo passo (l'ultima suite è quella del giro 4: 204 file, 3089 test); confronto con la 0.9.27 dello scorrimento ravvicinato (un secondo scorrimento entro circa 0,5 s viene ignorato con il tocco sintetico, causa non trovata). Nessun commit né push.

## 2026-10-26 — 0.9.29 e 0.9.30: pila fantasma, visibilità delle pile e doppio scorrimento (REP-20261026-003)

Fonte: [REP-20261026-003](reports/REP-20261026-003-pila-fantasma-doppio-scorrimento.md), [project-status.md](project-status.md) (ISSUE-116 e ISSUE-117). Esecuzione di passi di un flusso (Claude Code, claude-sonnet-5-5). Cartella `progetto/acasystem/frontend`, `--maxWorkers=4`; Tab M11 con `adb` e CDP su origini di prova 3013-3017 (server dei fixture, dati finti) e sul banco 3002 (senza token, `localStorage` salvato e confrontato). Log e misure locali in `backup/v0929/` (esclusa da Git). Nessun commit.

**Software**

| Comando | Esito |
|---|---|
| `npx vitest run --maxWorkers=4 --shard=1..4/4` (0.9.29) | Superato: 737 + 1006 + 749 + 617 = 3109 test, 204 file |
| `npm run typecheck`, `npm run lint`, `npm run build`, `node scripts/check-bundle-size.mjs` (0.9.29) | Superati (build con il solo avviso di dimensione dei chunk) |
| `npm run lint:typography` / `lint:theme-colors` / `i18n:check` (0.9.29) | 0 violazioni (523 / 343 file); 4 test |
| `npx vitest run --maxWorkers=4 --shard=1..4/4` (0.9.30) | Superato: 746 + 1006 + 745 + 619 = 3116 test |
| `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check`, `build`, `check-bundle-size` (0.9.30) | Superati (0 violazioni su 524 / 344 file) |

Guardie nuove: `PagerFarPages.test.tsx` (pagine incrociate), `LauncherStacks.test.tsx`, `LauncherController.test.tsx` e `LauncherScreen.test.tsx` (pile fantasma), `StackVisibility.test.ts` (visibilità della pila dai membri).

**Tab M11 (eventi di `adb input` e CDP, non il dito)**

| Controllo | Esito |
|---|---|
| Secondo scorrimento, tocco reale (`dopp3.cjs`, 30 prove per versione) | 0.9.28: 24/30 ignorati; 0.9.29: 0/30 |
| Secondo scorrimento, tocco CDP (`dopp2.cjs`, 50 prove per versione) | 0.9.28: 11/50; 0.9.29: 1/50 (aggancio del primo scorrimento, non ripetuto) |
| Costo SW1, SW2, SW3, JUMP, T1 (5 giri alternati più giro 0) | Non distinguibile, nessuna misura nominata peggiore; SW3: 10 righe di fotogrammi «peggiore» non confrontabili, con SW3L non distinguibili. `trace4.cjs` non eseguito |
| Pila fantasma su fixture | Superato (due «+», pila spostata e non cancellata, `stacks` identico) |
| Pila con due widget collegati in uso, 0.9.28 e 0.9.29 | Non superato (preesistente): corretta in 0.9.30 per scelta dell'utente, coperta da guardie unitarie |
| Riposo, vista pagine, fuoco | Superato come progettato |

**Banco 3002**

| Controllo | Esito |
|---|---|
| 0.9.29: `/api/health` e `/ha/auth/providers` su 127.0.0.1 e 192.168.1.7, container healthy | Superato |
| 0.9.29: doppio scorrimento 3/3 per verso, «+», pressione lunga, «Fine», pallini, trascinamento (tocco CDP), Sistema, «AI» | Superato; Multimedia senza «+» come atteso dalla sola regola (a) |
| 0.9.30: stessi controlli di salute (versione 0.9.30), container healthy | Superato |
| 0.9.30: pila di Multimedia visibile, tocco su «Impostazioni del widget» con «Dispositivo da collegare», Copertina con la sua pila, doppio scorrimento 3/3 per verso, «+», «Fine», Sistema, «AI» | Superato |
| 0.9.30: scelta del dispositivo da «Cambia» | Non eseguito: elenco vuoto, l'HA del banco non espone media player |
| `localStorage` di 3002 prima/dopo | 38 chiavi non sensibili, nessuna differenza |

**Non eseguito:** prova col dito, e2e, telefono, TalkBack, trascinamento e pallini sulla 0.9.30, screenshot della Copertina sulla 0.9.29. Incidenti di prova senza effetti sul prodotto: tasti Tab inviati per errore a Chrome nella barra degli indirizzi (ripulito, nessuna navigazione); un primo script di ricarica bloccato (terminato per PID).

## 2026-10-23 — D1, parte server: facciata `/api/dispositivi`, identità di servizio e ricetta di accensione (REP-20261023-003, «Parte server di D1»)

Fonte: [REP-20261023-003](reports/REP-20261023-003-piano-aggiungi-dispositivi.md), sezione «Parte server di D1 (D1a, D1s, D1b)». Eseguita da un passo del flusso (Claude Code, claude-sonnet-5-5) **in una copia di lavoro** (`backup/d1/sandbox/acasystem/backend`, giunzioni verso i `node_modules` dell'originale), con `--maxWorkers=4`. Il codice non è in `progetto/acasystem`: la patch è `backup/d1/patch/d1-server.diff`. Nessun commit, nessuna VM, rete, tablet, TV, Docker, HA reale o credenziale; HA è un modello finto dentro i test.

| Comando (nella copia di lavoro) | Esito |
|---|---|
| `vitest run --maxWorkers=4`, prima delle modifiche | 21 file, 202 test verdi |
| `vitest run --maxWorkers=4`, alla fine | 28 file, 387 test verdi, 1 saltato (modalità `0600` del file segreto: solo POSIX, su Windows non esiste) |
| `vitest run --maxWorkers=4 src/__tests__/devices*.test.ts`, ripetuto più volte | 7 file, 185 test verdi, 1 saltato, a ogni ripetizione |
| `tsc -p tsconfig.json --noEmit` (strict) | verde |
| `eslint src` | verde |
| `node src/cli/deviceServiceIdentity.ts status` / `activate` senza terminale / senza argomenti, con `DATA_DIR` temporaneo | «non è stato attivato» (uscita 1) / rifiuto (uscita 2) / istruzioni (uscita 2) |
| `git apply --check -p1` e applicazione di `d1-server.diff` su una copia dell'albero vivo, poi `diff -r` con la copia di lavoro | riuscite; alberi identici |
| Sei mutazioni a mano del codice | quattro bloccate dai test, una equivalente, una scoperta e chiusa con un test |

**Guardie nuove (sette file):** `devicesHelpers.test.ts`, `devicesFlows.test.ts`, `devicesService.test.ts`, `devicesPower.test.ts`, `devicesIdentity.test.ts`, `devicesWiring.test.ts`, `devicesArchitecture.test.ts`, con l'HA finto in `fakeHomeAssistant.ts` e il banco di prova in `devicesHarness.ts`. Verificano, tra l'altro: 403 per gestore fuori elenco e per il flusso di un altro utente; «servizio non attivo» senza ripiego (segreto assente, illeggibile, sospeso, revocato, scaduto, non amministratore); abbinamento con la chiamata aperta per 10 s; flussi cancellati alla scadenza e al riavvio del backend; nessun valore di prova (indirizzo del TV `192.0.2.10`, MAC `02:00:00:00:00:01`, token, password) in risposte, intestazioni, log, console, registro e tabelle di `tunet.db`; il tunnel `/ha` porta solo il token dell'utente e non passa le rotte di configurazione; nessun modulo che invii pacchetti sulla LAN o legga la tabella ARP; catalogo delle 32 chiamate a HA (5 pubbliche, 27 interne) come unico punto che nomina rotte e comandi.

**Limiti di queste prove:**

- L'HA finto è un modello costruito leggendo il sorgente di HA e i piani, **non una registrazione**: nel repository non esiste alcuna fixture registrata da un HA vero. I test di contratto CT-01…CT-14 sulle fixture non esistono ancora e restano per D1g; queste prove non dicono che un HA reale risponda come il modello.
- Il comando di attivazione è provato con risposte simulate al posto di una persona e con un terminale simulato per l'input nascosto; **non è mai stato lanciato in un terminale vero né contro un HA vero**.
- Il controllo dei permessi `0600` non gira su Windows.
- `auth/delete_all_refresh_tokens` non è verificata (evidenza `unverified` nel catalogo).

**Non eseguiti:** applicazione della patch a `progetto/acasystem`, costruzione dell'immagine, suite del frontend e suite completa del progetto, prova con HA 2026.9.4 o 2026.10.2 reale, registrazione delle fixture, prova su Linux.

## 2026-10-27 — Flusso unico «Aggiungi un dispositivo» per famiglia, prima la TV (REP-20261027-003, T1-T6)

- **Controlli locali** sull'albero di lavoro a partire da `ea77f46`, non committato, in `progetto/acasystem/frontend` (Windows 11): `npm run typecheck` (strict), `npm run lint`, `npm run lint:typography` (0 violazioni su 603 file) e `npm run lint:theme-colors` (0 su 411) superati.
- **Test:** i 7 file dei dispositivi danno 124/124, con il nuovo `DeviceFinder.test.tsx`; la suite completa con `npx vitest run --maxWorkers=4` dà 232 file e 3446 test superati.
- **Istanza di prova separata** su `127.0.0.1:3013`: interfaccia costruita nella cartella temporanea della sessione, copia dei dati di `:3007`, stessa copia di HA `acasystem-ha-s45`. Il registro del server dice «Home Assistant 2026.10.4: verified version, flows on».
- **Non eseguiti:** accesso e prova nell'app (servono le credenziali dell'utente), prova sul Tab M11, collegamento di una TV vera dal widget TV, utente non amministratore, e2e. I testi della guida (numero e lunghezza dei codici) vengono dallo studio T0 e non sono provati su una TV.
- **Prova reale (2026-10-27/28 notte, Tab M11 su `:3013` via USB):** la Samsung UE50J6200 è stata ricollegata con il PIN dal flusso nuovo (voce creata alle 00:26:47); l'utente lo giudica «abbastanza semplice». I tasti del telecomando arrivano a HA ma la TV li ignora, anche dopo ricarica, riavvio e nuovo abbinamento ([ISSUE-126](project-status.md)). Volume e muto funzionano. Trovato un difetto di T5: la marca non usa le scoperte di HA. Evidenza: ascolto in sola lettura degli eventi `call_service`, `state_changed` e delle voci di HA; il registro dettagliato di HA non è leggibile (404).
- **Correzione di T5 (2026-10-28):** la riga della marca usa anche le scoperte di HA. Typecheck, lint, tipografia (0 su 603) e colori (0 su 411) superati; suite completa con `npx vitest run --maxWorkers=4`: 232 file e 3447 test superati. Interfaccia di `:3013` ricostruita e server riavviato. La prova sul tablet non è ancora rifatta.

## 2026-10-28 — Audit CSS/UI e refactor a parità di aspetto e animazioni (REP-20261028-001)

- **Partenza:** commit `4c223d3`. Riferimento misurato su quella build prima delle modifiche: suite completa 3447/3447, typecheck, lint, tipografia e colori superati (`backup/css-refactor/baseline/`).
- **Controlli dopo il refactor** (albero di lavoro non committato, Windows 11, Node 24.14.0): `npm run typecheck`, `npm run lint`, `npm run lint:typography` (0 su 604) e `npm run lint:theme-colors` (0 su 412) superati. Suite completa con `npx vitest run --maxWorkers=3`: 3450/3450 (3447 più 3 nuovi). Una prima esecuzione aveva dato 1 fallimento, `MetalMaterial` UI-003, perché le primitive importavano `utils/classes`: è stato corretto spostando `classes()` in `components/primitives/classes.ts`.
- **Confronto visivo e degli stili** (Chromium senza GPU, server isolato con dati finti, orologio fermo; strumenti in `progetto/acasystem/frontend/.tmp/css-refactor/`, fuori da Git):
  - due esecuzioni della build di partenza: 182/182 istantanee identiche al pixel; il rumore è la larghezza di testi legati all'ora in 2 istantanee;
  - build con le modifiche CSS senza la rinuncia ai livelli: 188/188 istantanee identiche al pixel e negli stili calcolati; cambiano solo i 3 `@keyframes` toccati di proposito (`aca-pulse`, `aca-ctl-pending` unito, `k2-wave` fuori dal bundle dell'app);
  - con la rinuncia ai livelli: cambia `will-change` dove previsto, e c'è antialiasing diverso su testi e ombre dei pulsanti interessati, non visibile nei confronti affiancati;
  - build finale con il refactor TS, confrontata con la build delle sole modifiche CSS: 188/188 identiche al pixel; 6 differenze di larghezza in un'etichetta oraria, cioè il rumore noto.
- **Tab M11 via USB** (Chrome 156, 1280×665 DPR 1.5; server isolato con una pagina di 12 widget; A/B alternato base-nuova-base-nuova, 3 giri per 9 animazioni):
  - livelli del compositore: 86→79 a riposo, 99→92 in modifica, 149→143 nella vista pagine;
  - passata leggera (solo rAF): fotogrammi oltre 33 e 50 ms e fotogramma massimo entro la variazione tra le due passate di base, in tutti gli scenari;
  - passata con tracciamento: GPU, raster e stile/layout/disegno entro il rumore, con un picco isolato di 1,18 s al primo scorrimento della prima passata nuova, non ripetuto.
- **Rilevatori:** `impeccable detect`: 2 rilievi prima e dopo (bordo laterale del menu di Casa 3D e curva elastica della nuvoletta, entrambi voluti); `design-taste lint --app`: avvisi da 323 a 296, errori 87 invariati (sfumature e ombre dello stile Kit 2).
- **Non eseguiti:** prova col dito sul tablet; telefono reale; TalkBack; misura della pressione dei pulsanti nelle barre e nei fogli; banco (nessun aggiornamento); e2e `isolated-browser.check.mjs`, sostituito dal confronto delle istantanee.

## 2026-10-28 — Backend e funzioni collegate a HA (REP-20261028-002)

- **Backend:** typecheck e lint superati. `npx vitest run`: 33 file, 526 passati e 1 saltato (partenza: 523 e 1). Ci sono 4 test nuovi per S1, S2, S3 e S8; il test di S8, eseguito sul codice di partenza, fallisce con 500. È stato tolto 1 test che copriva solo codice morto.
- **Contro l'HA reale del PC** (container `homeassistant`, 2026.9.4), backend nuovo su `127.0.0.1:3041` senza credenziali: health 200; proxy dei provider 200; percorso non ammesso 404; tunnel WebSocket `auth_required` e poi `auth_invalid` con un token falso; token falso sulle API 401 in 77 ms; login avviato e chiuso senza compilare il modulo.
- **Frontend:** typecheck, lint, tipografia e colori superati; 232 file e 3450/3450.
- **Collaudo `e2e/isolated-browser.check.mjs`** (aggiornato in due passi superati dall'interfaccia), sulla build di partenza e su quella nuova: 240 viste, dettagli da tastiera, preferenze conservate, gesto con 1-2 comandi e conferma, movimento ridotto; nessun errore di pagina.
- **Ricerca:** note di HA 2026.10 e blog del registro dispositivi (2026-08-19), consultati il 2026-10-28. Nessuna rottura per le API usate; le note di 2026.11 non erano ancora pubblicate.
- **Non eseguiti:** prove con l'account dell'utente, identità di servizio, dispositivi reali, banco.

## 2026-10-28 — «Dispositivi trovati» S1-S4 (REP-20261028-003)

- **Backend:** typecheck e lint superati; `npx vitest run` 35 file, 583 passati e 1 saltato.
- **Frontend:** typecheck, lint, tipografia, colori e build superati. Suite completa: 3489/3491 alla prima esecuzione; corretto `:hover` della nuova `Disclosure` (test `MetalMaterial`), `ConsolePrimitive` passato da solo; file toccati poi verdi.
- **Browser con HA simulato** (copia temporanea del banco isolato su `:3013`, 1280×665 e 390×844): prima apertura con scheletro, arrivi progressivi, pannello del dispositivo, fisarmonica esclusiva, nessuno sbordamento, flag di prima apertura, riapertura dalla tendina.
- **Non eseguiti:** loghi e ripristino su HA reale, flusso LG con identità di servizio, Tab M11.

## 2026-10-28 — Tutti fanno tutto (REP-20261028-004)

- **Backend:** typecheck e lint superati; `npx vitest run` 37 file, 617 passati e 1 saltato.
- **Frontend:** typecheck, lint, tipografia, colori e build superati; suite completa 3511/3519, gli 8 falliti passano rilanciati da soli (257/257).
- **Non eseguiti:** percorso HA OS con il token del Supervisor; attivazione con il proprietario sull'istanza `:3004` (in attesa del suo accesso).
