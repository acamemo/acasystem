# Client mini PC e registrazione/accesso nella webapp

| Campo | Valore |
|---|---|
| ID | REP-20261102-002 |
| Stato | Lotto locale completato: implementazione, test e pacchetti pronti. Pubblicazione e collaudo HAOS/mini PC/mobile fisici non eseguiti |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Autorizzazione | U37: «mettiamo registrazione e accesso nella webapp, con HA e ACA già predisposti sul mini PC. Procedi a riportare desktop e Android al collegamento tramite IP, magari usando un QR code in impostazioni di sistema di aca, mantenendo salvato l’esperimento VM» |
| Domanda collegata | «creare un installazione di HAOS con uno script che fa fetch verso github e installa aca come add on e mostra il qr code per collegarsi con acasystem»; valutazione e preparazione del bootstrap distinta dalla scrittura/installazione HAOS su hardware |
| Riferimenti | ADR-0031, ISSUE-130, REP-20261102-001 e checkpoint VM |

## Obiettivo e perimetro

Implementare prima configurazione e accesso condivisi nella webapp per una centrale mini PC con HA/ACA predisposti. Ripristinare desktop e Android come client IP con QR di collegamento; conservare QR account/copia layout e lavoro grafico esistenti. Il desktop non avvia più il motore VM nel flusso corrente e la nuova distribuzione client non incorpora il VDI. Preservare sorgenti e artefatti VM nel checkpoint già verificato, senza reset o eliminazione di dischi.

Per la procedura GitHub: distinguere HAOS installato/avviato dal successivo bootstrap ACA. Preparare una procedura ripetibile da fonte ufficiale dove verificabile, con URL/QR di collegamento senza credenziali. Nessun flash/disco hardware, installazione su mini PC non identificato, deploy, pubblicazione GitHub o avvio delle VM accantonate assegnati.

Molti file tracked/untracked contengono il lavoro preesistente: diff chirurgici nei flussi interessati, nessun aggiornamento dipendenze/stack o commit richiesto.

## Criteri di completamento

1. Windows e Android si collegano ad ACA sul mini PC mediante IP/URL valido; QR generico di collegamento distinto dall'invito account/copia. Nessuna creazione utente o installazione addon nelle shell, nessun avvio VM dal nuovo desktop.
2. Webapp utilizzabile prima dell'owner: stato iniziale HA, creazione proprietario consentita soltanto quando necessaria, accesso e MFA condivisi, completamento casa/onboarding con sessione admin. HA rimane autorità; nessun account cloud o password/token nel QR/log.
3. Sistema ACA mostra collegamento/QR della centrale e conserva inviti temporanei account/layout. Client successivi accedono alla casa esistente.
4. Test significativi backend/frontend/client e build pertinenti; artefatti distinti dal checkpoint VM. Rischi/limiti di prove reali espliciti, nessun collaudo mini PC/mobile inventato.
5. Documentare prerequisiti/bootstrap HAOS e valutazione dello script; nessuna confusione fra file locale preparato e codice già pubblicato o installato.

## Avanzamento

Checkpoint VM preesistente verificato in REP-20261102-001, ZIP SHA 09a8e147dd8612ae0c1e755361a4c4dcbbd2f201b8d5d342bafc4d40ebeded18. Implementazione suddivisa fra API onboarding, UI condivisa e client; coordinamento esplicito dei contratti. Lotto locale concluso con i risultati riportati sotto.

## Modifiche completate

- **Backend:** API limitate `/api/setup/status`, `/owner`, `/complete`, parser4KB e rate limit. Stato HA senza credenziali, primo owner una sola volta con lock e rilettura dopo risposta persa, completamento soltanto con admin personale. Nessuna apertura generica della allowlist `/ha`, installazione Supervisor o codice/token nel risultato owner. Nome casa e passi onboarding completati; nessuna attivazione delle statistiche facoltative.
- **Webapp:** `CentralSetupGate` prima dei provider HA/settings, dopo l'eventuale gate invito QR; owner, login/MFA esistente e completamento casa. Password solo richiesta/campi, token temporanei revocati se abbandonati e sessione accettata dopo complete. QR stabile di sola origine in Sistema, distinto dall'invito account/copia monouso5min. Modalità demo e inviti precedenti preservati.
- **Windows:** solo IP/URL, health, bundle verificato/cache e cambio centrale; nessuna registrazione o installazione HA nativa. Motore/IPC VM rimossi dal percorso corrente, vecchi flag ignorati senza cancellarli e vecchio loopback rimanda al wizard. Package senza `resources/engine`, codice engine o VDI. Sorgenti esperimento e vecchia release conservati.
- **Android:** IP/URL con scanner facoltativo; QR generico valida origine/health senza usare inviti, account/layout precedenti preservati. Endpoint readonly del proxy locale per rendere disponibile l'origine della centrale alla webapp.
- **Materiali HAOS:** bundle frontend/Casa3D della stessa immagine dentro `/app/client-bundle`, usabile prima del login; client preferiscono il bundle della centrale conservando i ripieghi cache/GitHub esistenti. Utility QR2.0.4 e licenza già presenti nel progetto, nessuna dipendenza/versione nuova. Nuovo bootstrap POSIX e materiali locali per pubblicazione0.9.33.

### Bootstrap: significato dell'ultima proposta umana

La procedura preparata parte **dopo HAOS installato**, sulla console host root18.4. Con IP privato e versione0.9.33 espliciti, il Supervisor acquisisce `https://github.com/acamemo/acasystem-releases`, installa/avvia `9960cdb4_acasystem` se necessario, controlla health/versione e stampa un QR console con solo `http://<IP>:3002/`. Non crea proprietari/password e non esegue uno script remoto tramite pipe. Idempotenza e rifiuto di aggiornamenti automatici da versioni diverse; `--dry-run` senza rete o scritture. Il catalogo deve offrire davvero0.9.33: nessun ripiego silenzioso su una release vecchia.

Fonti primarie consultate il **2026-11-02**: [HAOS x86-64](https://www.home-assistant.io/installation/generic-x86-64/) distingue scrittura del sistema e avvio; [repository app](https://contributors.home-assistant.io/apps/guides/repository/), [CLI store](https://github.com/home-assistant/cli/blob/master/cmd/store_repositories_add.go), [CLI apps](https://github.com/home-assistant/cli/blob/master/cmd/apps.go). In [Supervisor2026.10.0/store.py](https://raw.githubusercontent.com/home-assistant/supervisor/2026.10.0/supervisor/api/store.py), il catalogo espone `version_latest`, mentre `version` è null se non installata: script e fixture corretti su questo contratto. HAOS18.4 include jq e curl nella [configurazione ufficiale](https://github.com/home-assistant/operating-system/blob/18.4/buildroot-external/configs/generic_x86_64_defconfig).

Il login ordinario dopo owner ma prima degli altri passi è valido nel pin [HA2026.10.4/auth/login_flow.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/auth/login_flow.py): verifica `async_is_user_onboarded`, non l'intero onboarding. Questo è stato confermato anche nel flusso reale. Non sono stati cambiati i pin HA/Core o lo stack.

## Verifiche ed evidenze

| Controllo eseguito | Risultato | Limiti |
|---|---|---|
| Client core/Windows/Android web | **144/144, 99/99, 21/21**, strict dei3workspace e build riusciti | Porte native simulate |
| Android Java/build APK | **17/17** e assembleDebug riuscito | Nessuna installazione Android o fotocamera fisica |
| Backend setup/architettura/proxy | **56/56** | Typecheck globale segnala solo i duplicati preesistenti `fakeHomeAssistant.ts:1282/1302`; ESLint backend senza configurazione, non eseguito |
| Frontend accesso/QR/setup | Lotto9file **71test** e finale webPairing/QR **53test**, strict/build e lint sorgenti pertinenti riusciti | Gruppi sovrapposti, non sommare; MFA nella regressione software |
| Casa3D | Typecheck, controllo marchio e build riusciti | Nessun nuovo lavoro Casa3D |
| HA reale + UI costruita | **7stage** owner→login→casa→launcher, secondo owner409, QR PNG decodificato, secondo browser390×844 | HA Container ufficiale2026.10.4, non HAOS; QR usa fixture readonly endpoint Android, non LAN/fotocamera. Zero richieste protette prima del completamento; identità servizio/dispositivi non certificata |
| Desktop E2E source | **8stage** con mini PC simulati e vecchio flag VM attivo | IP privato dell'host per fixture, non un mini PC fisico |
| Layout shell | 1281×802 e390×846, nessun overflow, font locale, nessuna password/CTA VM | HTML/CSS della shell |
| EXE confezionato reale | Wizard IP, nessuna password nativa/VM, configurazione/flag invariati, app chiusa | NSIS non installato su questo PC o su un secondo PC |
| ZIPWindows | **129entry** decompresse e hash confrontati con win-unpacked, no motore/VDI | Installer non firmato come ACA, runtime Electron originale conservato |
| Bundle immagine/server | Build Docker ACA e addon riuscite, SQLite nativa nell'immagine verificata, health/setup/bundle0.9.33 e SHA archivio servito corrispondenti | Pubblicazione e HAOS fisico non eseguiti |
| Bootstrap | **5/5** test con stub CLI/OS, sintassi, dry-run e helper QR nell'immagine riusciti | Non eseguito sulla console HAOS reale; nessun flash |
| Contratto bundle/checksum | Test lettore ZIP client **1/1**, SHA256SUMS dei6asset riusciti | SHA identifica asset, non un collaudo hardware |
| Checkpoint VM | ZIP09a8…ed18, VDI06a2…882 e VMDKac3e…0724 immutati; nessuna VM running | Esperimento resta accantonato e non risolto |

Comandi e controlli principali: `npm run test` e `npm run typecheck` nei workspace client; `node scripts/gradle.mjs testDebugUnitTest` e `npm run apk:debug` per Android; Vitest sui file backend/frontend indicati sopra; `npm run build --workspace frontend` e `npm run build --workspace casa3d` dalla cartella acasystem; `node e2e/smoke.check.mjs` e `node e2e/shell-layout.check.mjs` dalla cartella windows. Dalla radice: `node --test progetto/ha-app/client-bundle.test.mjs`, `node --test progetto/ha-app/bootstrap/bootstrap.test.mjs`, `docker build --provenance=false --platform linux/amd64 --build-arg ACASYSTEM_VERSION=0.9.33 -t aca-system:0.9.33 progetto/acasystem`, `node progetto/ha-app/prepare.mjs --version 0.9.33`. Nessuna suite completa del prodotto o CI dedotte da questi lotti.

Evidenze `backup/rep012/`: `web-integration-2026-11-02T09-17-07-708Z/result.json` e screenshot, `packaged/result.json`, `windows-zip-verification.json`, `aca-image/health-setup-bundle.json`, `final-artifacts.json`, `vm-checkpoint-final.json`, `containers-ended.json`. Helper/log locali ignorati; nessuna credenziale nei documenti. La QA Node locale aveva segnalato `service repair failed (secret_location)` per ambiente non predisposto dell'identità di servizio: non è una verifica della facciata dispositivi. Il container addon con collocazione segreti corretta si è avviato e ha letto la versione HA, ma non estende quel collaudo.

Controllo documentale conclusivo: 16 documenti e 1.168 destinazioni locali, nessun nuovo collegamento mancante; rimane il riferimento preesistente LEGGIMI → WidgetTray. Diff pertinente senza errori whitespace, con soli avvisi sulle terminazioni di riga; nessun originale/reference/archive modificato per questo lotto. Evidenza `backup/rep012/doc-final-check.json`. Revisione indipendente finale di script e guida: catalogo fresh con `version:null` gestito tramite `version_latest`, copia dello script pronta identica alla sorgente, nessun difetto bloccante rilevato. HEAD invariato, nessun commit.

Primi tentativi non riusciti conservati come tali: smoke test cercava la porta in dettagli chiusi, corretto il test; test bundle usava il campo `name` anziché `path` del lettore ZIP. Build Docker inizialmente bloccata dal fixture QR fuori contesto: una prova di lettura Node nel test è stata ritirata; la fixture unica è stata trasferita byte-identica sotto frontend e i3import aggiornati, senza duplicazione, poi strict/build e regressioni ripetuti con successo. Bootstrap inizialmente leggeva `version` catalogo: corretto a `version_latest` con fixture fresh realistica e test ripetuti. Il primo controllo del manifest HTTP usava erroneamente `/manifest.json` anziché `/manifest`, poi rieseguito correttamente. L'eseguibile7-Zip ipotizzato non era presente: verifica ZIP effettuata tramite decompressione e confronto SHA di ogni entry, non dichiarata come test7z riuscito.

## Artefatti locali e rilascio

- Windows: `progetto/client/windows/release/mini-pc-client-0.9.33/Acasystem-miniPC-0.9.33-win-x64.zip`, **153.491.518byte**, SHA **3177934b5c08123fd36a5eb5cb3689281b0708a0ba67a4b761832ab0aa5fabcd**; NSIS `Acasystem-Setup-miniPC-0.9.33.exe`, **120.665.556byte**, SHA **c8df7c9c50749541e90b0dd3edd54cbe80ea5a48da1d6371a76ad1376a9a137f**. Shell0.1.0, Electron44.7 originale; metadati/firma eseguibile non riscritti, nessuna protezione Windows modificata.
- Android debug: `progetto/client/android/android/app/build/outputs/apk/debug/app-debug.apk`, **7.684.777byte**, SHA **2b1fb5e8976d677c39eb341a70b47e9b5c86c2510b6ddbc679691f6f5f00c979**. Copia dell'APK precedente conservata in backup/rep012.
- ACA0.9.33: `progetto/ha-app/out/0.9.33/` con repository, sorgenti, web ZIP/manifest, bootstrap, istruzioni e checksum; immagine locale **ghcr.io/acamemo/acasystem:0.9.33**, identificatori finali in `final-artifacts.json`/PUBBLICAZIONE.md. Il bundle servito contiene **3.091.701byte**, SHA **38289dd788575c8c011ecbecb39a558fa99ee67e9f78979e62308bf7b5f56a5f**. Encoder QR già esistente e licenza inclusi; nessun update dipendenze.

**Nessuna pubblicazione eseguita.** Controllo readonly: repository pubblico `acamemo/acasystem-releases` esiste e API tag `v0.9.33` restituisce404 al controllo. Il nuovo bootstrap rifiuta il catalogo vecchio. Prima dell'uso reale occorre pubblicare immagine GHCR e repository aggiornato, poi asset release corrispondenti. Materiali già concreti/revisionabili; questa pubblicazione è un'azione distinta da autorizzare.

## Chiusura e punto di ripresa

Lotto locale U37 completato: codice, build e prove pertinenti riusciti, [guida](../riprogettazione/blocchi/01-mini-pc-client-e-onboarding-web.md). [ADR-0031](../decisions/ADR-0031-ritorno-mini-pc-client.md) e REQ-22 aggiornati; esperimento VM preservato. Nessun commit/reset/deploy.

Docker Desktop già installato avviato per build/QA; il suo riavvio ha acceso automaticamente3container del banco precedente, non riconfigurati o aggiornati. I2container creati per la QA sono stati arrestati normalmente dopo verifica ID/label, restartno; helper/browser/backend QA chiusi e nessuna VM VirtualBox running. Docker Desktop/banco precedente non spenti per non alterare ulteriormente il loro ciclo di vita. Dati di prova isolati in backup, non nel mini PC o nelle VM accantonate.

Prossimo passo: autorizzazione alla pubblicazione dei materiali0.9.33 e successivo collaudo su HAOS/mini PC reale. Nessuna immagine HAOS personalizzata o installazione su disco eseguita: hardware/medium vanno individuati prima di quella fase. Android/Safari/fotocamera e H24 restano non verificati.

**Seguito U38, 2026-11-02:** pubblicazione esplicitamente autorizzata e completata in [REP-20261102-003](REP-20261102-003-pubblicazione-aca-0.9.33.md), immagine/catalogo/release pubblici e sette download anonimi verificati. Prima dell'upload aggiornato soltanto README bootstrap: sorgenti 1.577 entry, unica entry diversa, nuovo ZIP 6.670.806 byte SHA43bf723aafd2eb7cc1f83be4284a87c9e5ff7e4c9b20f50a7a514acd08b336dd. I vecchi hash di preparazione di questo report restano storici e le copie sono in backup/rep013/pre-publication; nuovi checksum nel report003. Web/manifest/script/immagine invariati, nessuna installazione hardware eseguita.
