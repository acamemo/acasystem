# Recupero del servizio HA dopo il ripristino

| Campo | Valore |
|---|---|
| ID | REP-20261116-005 |
| Stato | Completato: recupero autonomo HAOS verificato; qualifica del destinatario aperta |
| Data | 2026-11-16, Europe/Rome |
| Autore / modello | Codex; identificativo esatto non disponibile |
| Commit iniziale | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta | «Procedi a risolvere il recupero del servizio HA dopo il ripristino e ricollauda sulla VM, senza toccare il banco. Poi aggiorna il kit per il PC del capo.» |
| Autorizzazione | Correzione pertinente al recupero del servizio, prove sulla sola VM REP092 già separata, nuovo accesso temporaneo e rigenerazione del kit locale. Banco, VM storiche, pubblicazione e protezioni host esclusi. |

**Esito finale:** .76.1 recupera automaticamente il servizio dopo un restore reale senza proprietario, conserva14tabelle ACA e le altre4identità HA osservate; servizio e worker persistono dopo reboot. Kit locale aggiornato e verificato, VM spenta/accessi revocati, banco .72 invariato. Stabilità del PC corrente, qualifica completa Core e prove/pubblicazione sul destinatario restano distinte.

## Obiettivo e perimetro

Riprendere ISSUE-166 e il [REP004](REP-20261116-004-collaudo-0732-executor-vm.md). Il restore recupera dati e immagine ma perde il file di servizio, escluso per ADR-0022; la riattivazione osservata fallisce con not_admin, mentre il precedente409 dell'harness viene rettificato sotto. Cercare la correzione nel percorso di rigenerazione già previsto, mantenendo il segreto fuori dalle copie e i privilegi del normale ACA invariati. Nessun deposito di credenziali o nuovo comportamento estraneo introdotto implicitamente. Worktree iniziale922voci, staging vuoto; preservare le modifiche preesistenti.

## Criteri di completamento

- Riprodurre e spiegare la causa sul Core effettivo2026.11.1; aggiungere regressioni sul comportamento interessato e sui rifiuti dei permessi.
- Ripristino reale sulla sola VM UUID `5c2409fa-1b8a-4522-bfe2-54daf258dc43`: dati sintetici conservati, servizio nuovamente attivo e una lettura/flow innocuo riusciti; distinguere recupero automatico e azione del proprietario.
- Completare anche il recupero autonomo HAOS già richiesto dall'annotazione2026-10-28 di ADR-0022; il solo percorso manuale verificato non chiude l'incarico.
- Verificare riavvio/worker e assenza del segreto nei backup e nei materiali pubblicabili, senza comandare dispositivi fisici.
- Rigenerare una revisione distinta con immagine/executor/fonti/client e checksum coerenti; qualificare soltanto le prove realmente eseguite.
- Revocare il nuovo accesso temporaneo, arrestare ordinatamente la VM di prova e confermare banco invariato; aggiornare stato/verifiche/indice e indicare i residui del destinatario.

## Avanzamento e modifiche

Letti stato, rapporto precedente e ADR-0022. Applicati surgical-coding e api-and-interface-design. Fonte Core2026.11.1 `config/auth_provider_homeassistant.py`: `admin_change_password` richiede `is_owner`, oltre a require_admin. Il keeper invece sostituiva sempre la sessione esplicita del proprietario con quella Supervisor, che crea il servizio iniziale ma non può reimpostare la password dell'utente già esistente dopo la perdita del segreto.

Correzione circoscritta in `serviceKeeper.ts`: «Ripara» dà precedenza al token corrente dell'amministratore autenticato, utilizzato per un solo tentativo e mai salvato; attende un eventuale tentativo pendente prima della nuova verifica. Senza mezzi sufficienti indica il primo account HA. Nessun cambio di backup_exclude, privilegi ACA, API pubbliche, DB, dipendenze o frontend. Nessun aggiramento del proxy Supervisor: la rigenerazione esistente si completa con il proprietario. Le operazioni sui dispositivi continuano a usare esclusivamente il nuovo utente di servizio verificato.

Nuova sessione SSH owner-only in REP005, chiave diversa da quella già revocata; CONFIG con sola chiave pubblica collegata alla VM REP092 spenta, UART riabilitata per la sola prova e VM avviata. Host key conservata dal pin console verificato, DMI guard per ogni SSH. Nessun disco/identità del banco o VM storica gestiti. Directory tecnica `backup/rep093`; le credenziali owner sintetiche della stessa VM sono riprese soltanto per il test, con refresh salvato nella nuova directory privata.

Baseline .73.6 nella VM: `repair-baseline-0736.json`. Il vecchio409 era `PROFILE_USAGE_REQUIRED` dell'harness privo di lease di utilizzo; rettifica datata aggiunta al REP004 senza riscriverlo. Con profilo/lease corretti, risposta200 ma activefalse e servizio missing. Nuovo harness ripete il normale contesto v2 e rilascia la lease; non elimina o ricrea il profilo per ottenere un PASS.

Intermedio ACA0.9.74 costruito dai2010sorgenti congelati SHA`e5f654fc09c2069528165c99bcd1beb0bb87229343013492131c2acab0b54213`, wrapper .74.1 descriptor `sha256:8b1dec99fb73f796b44dba9b2a1f95d9b1dae508dfb51cc594f9eb3065ac2f5f`. Update reale .73.6→.74.1 PASS, ma recupero ancora **FALLITO**: superato not_admin, HA rifiuta il nuovo token perché quello precedente ha lo stesso client_name. `repair-candidate-0741-failed.json`, azioni ha_refused e `native-token-name-collision.txt`: log Core «Acasystem (servizio) already exists». Kit/intermedio .74.1 conservati e superati; fixture .74.2 costruita ma non usata per un restore.

Seconda correzione in `identityActivation.ts`: nome univoco con prefisso riconoscibile per il nuovo token; quello precedente resta valido fino a verifica/salvataggio del sostituto, poi viene revocato. Nessuna cancellazione preventiva per evitare il conflitto. Fake aggiornato alla reale unicità di HA e nuova regressione perdita-file/conservazione token in HA;16RED su59casi dopo avere corretto il modello, poi65/65PASS sulle3suite interessate. I casi di errore nel salvataggio, token list assente e revoca fallita mantengono le garanzie precedenti.

Nuova base **ACA0.9.75**,2010sorgenti SHA`cc1ee0e0ed24650af2fef15594ca33d946df52446e727c92b68ccae36c5b02b6`; wrapper **.75.1** descriptor `sha256:85437d724a5b9fa1e6291ef7d61940767ac603327801ae654d02fde5e2124f4d`. Fixture guasto .75.2 descriptor `sha256:587a60947348a33507008a2751ca46306cbc2603f3588098dfd1d4b347da5527`, stesso runtime ma CMD di guasto circoscritto al solo target/profilo sintetico. Build con lockfile esistente, nessun aggiornamento di dipendenze. Prime build/estrazioni tecniche fallite o corrette prima della distribuzione restano nei log; nessun artefatto storico sovrascritto.

Registry/catalogo/feed locali della VM ripresi con guardia UUID/DMI; nessun login/push GHCR o modifica del repository comune. Primo curl35 di readiness TLS dopo start, poi GET riuscita e prosecuzione soltanto dal punto non ancora eseguito. Aggiornamento companion75 più lungo del timeout SSH180s: **non ripetuto**. Stato e log Supervisor riletti: update completato e app75.1 avviata, poi eseguito l'update del normale ACA. Un comando diagnostico jobs privo di sottocomando ha prodotto un errore jq, sostituito con la lettura API corretta. Le copie di backup con dati restano nel guest.

La console ripresenta stall RCU/timer e coredump journald,2restart osservati del servizio poi attivo; campione risorse guest1954MiB/available1239MiB e host circa1,46GiB liberi. Nessun cambio RAM/CPU, hypervisor o protezioni per nasconderli. Le prove funzionali attive che seguono non qualificano la stabilità/H24: ISSUE-129 resta aperta.

**Update reale .74.1→.75.1 PASS**, executor incorporato nel companion75.1 e journal complete (`native-update-0751.json`). **Primo recupero funzionale PASS** dal segreto mancante: azione owner200/active true, catalogo200, flow Sonoff201 con password mascherata, annullamento200 e nessun flow owner residuo (`functional-after-install075.json`). Nessuna credenziale eWeLink o comando fisico. Gli esiti successivi con owner e poi autonomi sono distinti sotto.

Kit intermedio .75.1,24file/153773308byte, SHA`03b87ab0c91bc60dfffc9cfe87afba887573df43b10f5165623e4ce9d45bb462`, in `backup/rep093/pilot-candidate-0751`. Executor ZIP SHA`add454d43f87862b012cc12471d14e6fffffda459e765b46e6c73f301a22fb6c`; runtime11file SHA`6a842fc2f56f72ab021c9e4b7245e2395db065fc3739fe2d91bea427630da1aa`, identico alla6 perché le correzioni sono nel normale backend. ClientWindows0.1.1 byte-esatto SHA`a0d1cba540832bf4fd83414163e825a08ed476a75bfef520a9a3154b8fea8ec6`, non ricompilato o ricollaudato nativamente in questo lotto. Metadata targetTestedfalse: il PC del capo non è stato usato.

### Riserva manuale verificata e completamento autonomo HAOS

**.75.1, fault/restore e reboot PASS con riattivazione del proprietario:** il guasto .75.2 elimina1profilo e termina42;14tabelle selezionate identiche dopo rollback, backup2152448byte senza service-secret e con DB/WAL/credenziale manutenzione. File HA mancante dopo restore, poi ricreato da Ripara owner a0600; catalogo e form Sonoff mascherato/annullato PASS. Reboot effettivo, bootId diverso,14tabelle esatte e servizio attivo **prima di qualsiasi nuovo Ripara**, worker elabora un check nuovo. Evidenze `native-fault-0752.json`, `rollback-backup-audit.json`, `restore-data-comparison.json`, `functional-after-restore075.json`, `functional-after-reboot075.json`, `reboot-comparison.json`. Primo accesso REP005 revocato/challenge255, Dropbear fermato, VM spenta; EPIPE della console in chiusura distinto dalla conferma VBox poweroff.

Questa prova manuale da sola non completa l'autonomia HAOS già autorizzata nell'annotazione2026-10-28 di ADR-0022. L'incarico rimane aperto per quel percorso, senza promuovere la proposta di deposito dei segreti. Nuova correzione in `identityActivation.ts`: dopo il rifiuto owner-only, **solo** sessione Supervisor, `reactivate=true`, file realmente mancante e identità locale riconosciuta per nome/login/admin/non-owner/non-system/unicità permettono la rimozione/ricreazione del solo utente di servizio. Un file presente/illeggibile, nomi estranei o duplicati fermano il percorso. I vecchi token di quell'utente perso vengono revocati, l'ID cambia; nessun token viene recuperato da HA o da copie. Operazione `service.identity_removed/missing_secret` registrata, poi attivazione con verifica e nuovo file privato. Gli utenti personali non sono target di questo percorso. La sessione esplicita del proprietario resta una riserva; nessun nuovo privilegio, escrow, DB o API pubblica.

Regressione automatica RED, poi **70/70PASS** sulle3suite interessate, compresi rifiuto per nome estraneo/ambiguo/file illeggibile e nessuna rimozione di un'identità ancora salvata e funzionante. Un primo assert chiedeva il target di una chiamata WS che il fake non registra: corretto a verificare chiamante, identità rimossa e insieme degli altri utenti invariato. Suite backend finale **815PASS/1FAIL/1skip su817casi**, stesso disallineamento famiglie già riprodotto prima. Strict backend PASS. Le prove simulate non sostituiscono il nuovo scenario nativo senza proprietario.

Nuovo candidato **ACA0.9.76/app0.9.76.1**, fonte2010file SHA`4667413835a076c8179c48f63528b4849333098eedfc44f688b08addabe6f32a`; descriptor `sha256:64b0c1a4968d567faaa2185b13903f14a204731f3dcb1b7cb1cb3721fffcf870`. Fixture guasto .76.2 distinta, descriptor `sha256:d1c0faf0faf388d52aed7c57106dcb86b724eedf06c2f5c43f9f0ab148b37f73`. [Kit corrente](../../backup/rep093/pilot-candidate-0761/acasystem-pilot-candidate-0.9.76.1.zip),24file/153773491byte, SHA`05cd803723be92660cb373e299975ad96424aeaf788bec7643f6f99724a35b89`.80Node/7smoke immagine76, audit e scenario nativo PASS nei limiti riportati sotto.

Ripresa della medesima VM con un'altra chiave Ed25519 nuova owner-only, directory privata REP005-auto; la chiave del primo giro resta revocata. Tentativo iniziale di convertire CONFIG rifiutato perché il VDI precedente esisteva: nessun disco HA modificato; raw pubblico precedente ripristinato ai byte della sua chiave, nuovo raw/VDI con nome distinto e guardie VM spenta/UUID/SATA libera. Staging e chiavi restano fuori dal kit. Nessuna gestione delle VM storiche o del banco.

### .76.1: ripristino autonomo reale, senza proprietario

**Update .75.1→.76.1 PASS**, companion e main con immagine esatta, stesso executor incorporato. **Fault .76.2 e rollback .76.1 PASS:** journal rolled-back, marker nativo1profilo eliminato e14tabelle personali selezionate identiche, integritàok. Backup circoscritto2551808byte, id`a27389858cb4476c`: DB/WAL/identità e credenziale manutenzione presenti, `service-secret` assente. Nessun archivio con dati scaricato nel kit; audit tramite elenco dei soli nomi dentro il companion.

Nel periodo fra fault e prova di recupero **nessuna sessione/credenziale del proprietario usata dall'harness**: il probe accede direttamente a Core soltanto con il nuovo token di servizio già scritto autonomamente dal prodotto. File0600, servizio admin/non-owner/local-only, utente corrispondente al file e flow Sonoff aperto/annullato PASS. L'ID del servizio cambia; l'impronta delle **altre4identità HA (ID, stato e ruoli)** è identica, così come le14tabelle ACA. Il registro contiene `service.identity_removed`, source startup, code missing_secret, user:null; nessun recupero dei vecchi token o credenziale owner. Evidenze `native-update-0761.json`, `native-fault-0762.json`, `service-before-fault076.json`, `service-after-restore076-without-owner.json`, `automatic-recovery-events.txt`, `rollback-backup076-audit.json`, `automatic-restore-comparison.json`.

Il probe nativo senza proprietario conserva solo impronte e flag, non il token né nomi/credenziali degli altri utenti. L'uso del token di servizio resta quello già previsto per le funzioni della facciata; il Supervisor ha solo rigenerato l'identità dedicata. L'app ACA rimane protected=true/roledefault/docker_api=false; solo il companion ha i privilegi già autorizzati sulla VM di prova.

Audit finali76 PASS:120file runtime backend/contratti esatti e11file executor esatti,2010fonti/archivioGPL e kit24file con CRC/checksum annidati e byte di script/client esatti. ExecutorZIP SHA`b1c1105703704f3b32436ebf521dd57e321fcf265dfa5f44f7f6af8f02512e88`; client invariato e nessun materiale privato. Confronto con .73.6: solo **2file runtime e3test** ACA diversi, tutti gli altri sorgenti e lockfile identici; Node26.13.1 prima/dopo. `final76-image-audit.json`, `final76-runtime-audit.json`, `final76-source-diff-audit.json`, `final76-kit-audit.json`. Nessuna pubblicazione/CI remota o prova nativa EXE/mobile dedotte.

Fixture .76.2 ritirata dal catalogo locale, riportato latest .76.1; registry fermo e hosts/CA/bind rimossi. **Reboot completo76 PASS:** bootId `b38a6387-685e-4d69-9c57-967bd488c48c` → `181ab901-5b28-43ff-b194-bf0cd8f2555f`. Intervallo osservato dal wait dopo la richiesta:19:29:59Z–19:31:19Z, non una qualifica prestazionale. Main/companion .76.1 partiti automaticamente; Core11.1/Supervisor11.0/HAOS18.4 invariati.14tabelle esatte, stessa identità rigenerata e altre4identità HA con stessa impronta. Probe con solo token di servizio PASS prima del contatto owner; successiva facciata owner con repairInvokedfalse, catalogo200/Sonoff201 mascherato/annullato200 PASS. Worker standard elabora una nuova richiesta: current/0.9.76, checkedAt19:31:50.097Z→19:32:10.987Z. Evidenze `reboot-0761-observation.json`, `service-after-reboot076-without-owner.json`, `functional-after-reboot076.json`, `worker-after-reboot076.json`, `reboot076-comparison.json`, `native-after-reboot076.txt`.

**Chiusura finale:** revocata anche la seconda chiave, challenge255/publickey con Dropbear ancora attivo; rimossi redirect Git posseduti, registry fermo e fixture DNS/CA assenti. Dropbear fermato/mascherato runtime e nessun listener22222. Richiesto `ha host shutdown` dalla console con guardia DMI: pipe chiuso con EPIPE durante l'arresto, non è disponibile l'ack finale del comando; VBox conferma poweroff, nessun comando di spegnimento forzato usato. CONFIG scollegata e UART1 disabilitata dopo la conferma. `close-access-auto-result.txt`, `access-revoked-auto-challenge.json`, `serial-access-auto-closed.txt`, `vm-final-closed.txt`, `final-conservation-auto.json`.0VM attive; le5storiche non gestite. Banco **.72/ok, stesso ID/immagine/StartedAt** iniziali, staging Git vuoto/HEAD invariato. Nessun nuovo audit del DB del banco dedotto dal health.

## Verifiche ed evidenze

Evidenze tecniche selezionate in `backup/rep093`, ignorato da Git; credenziali e chiavi in directory privata owner-only fuori dai materiali.

- Regressioni:2nuovi test RED sulla logica precedente, poi64/64PASS su devicesRepair/Identity/UpdateMaintenance; modello esplicito della restrizione owner-only Core11.1 nel fake. Il primo test concorrente fermava una lettura prima dell'ingresso nel keeper: corretto l'harness per bloccare il vero tentativo pendente; il conteggio errato non era un difetto prodotto. Log `repair-regression-*.log` conservati.
- `npm run typecheck` backend PASS; build frontend/Casa3D strict e budget PASS dentro la nuova build.
- `npm test` backend iniziale generale:808PASS/2FAIL/1skip,811casi/54file. Famiglie browser/backend (`apple_tv`) RED anche sui byte .73.6 estratti dall'archivio storico. Errore Power su una lettura autenticata extra non riprodotto: confronto mirato sia corrente sia .73.6 con55PASS/1FAIL su56casi, unico FAIL famiglie. **Ultima esecuzione dopo entrambe le correzioni:810PASS/1FAIL/1skip,812casi/54file**, unico FAIL famiglie; nessuna suite generale tutta verde o correzione estranea dichiarate.
-80/80test Node pilot/provenienza/clientbundle,0skip con Sonoff originale;7/7smoke immagine **.75.1** in Docker isolato networknone/rootfsRO/tmpfs e senza socket/mount/porte host PASS (`final75-*.log`).
- Audit finali `final75-image-audit.json`, `final75-runtime-audit.json`, `final75-kit-audit.json`:11file executor e120file runtime backend/contratti esatti, fonte2010file e kit CRC/checksum annidati/byte script/client esatti, nessun materiale privato. Il primo audit includeva erroneamente i test backend esclusi da .dockerignore: corretto il perimetro al runtime distribuito, senza modificare l'immagine.
- Ultime suite del candidato76:70/70backend mirati e strict PASS;815PASS/1FAIL/1skip nella suite backend generale,80/80Node/0skip e7smoke PASS. I controlli .74/.75 sono intermedi, non si sommano a quelli finali. Aggiornamento/restore autonomo/reboot76 distinti sopra; registry/catalogo/feed di fixture locali, non pubblicazione GHCR/GitHub. VM chiusa/accesso revocato.

Comandi principali realmente eseguiti, dalla radice salvo le prime due righe nella cartella backend:

```powershell
npm test -- src/__tests__/devicesRepair.test.ts src/__tests__/devicesIdentity.test.ts src/__tests__/devicesUpdateMaintenance.test.ts
npm run typecheck
$env:ACA_TEST_SONOFF_ARCHIVE=(Resolve-Path backup/rep088/bootstrap-final/SonoffLAN-v3.13.3.zip).Path
node --test progetto/ha-app/pilot/*.test.mjs progetto/ha-app/source-provenance.test.mjs progetto/ha-app/client-bundle.test.mjs
node progetto/ha-app/pilot/smoke-executor-image.mjs --image ghcr.io/acamemo/acasystem:0.9.76.1
node backup/rep093/audit-image076.mjs
node backup/rep093/audit-runtime076.mjs
node backup/rep093/audit-source-diff076.mjs
python backup/rep093/audit-kit076.py
node backup/rep093/compare-automatic-restore.mjs
node backup/rep093/compare-reboot076.mjs
```

Le ultime comparazioni leggono evidenze già conservate; non riavviare la VM o riusare le vecchie chiavi per ripeterle. I test nativi sono `vm.mjs run-file materials/stage-0761.sh`, `run-update-0761.sh`, `run-fault-0762.sh` e il probe interno `probe-service-without-owner.mjs`; solo sulla VM identificata e con un nuovo accesso temporaneo. Log generali/intermedi, trace e limiti restano selezionati in backup/rep093.

Fonti primarie lette2026-11-16: Core [config auth provider2026.11.1](https://raw.githubusercontent.com/home-assistant/core/2026.11.1/homeassistant/components/config/auth_provider_homeassistant.py), [utenti2026.11.1](https://raw.githubusercontent.com/home-assistant/core/2026.11.1/homeassistant/components/config/auth.py), [auth manager2026.11.1](https://raw.githubusercontent.com/home-assistant/core/2026.11.1/homeassistant/auth/__init__.py) per unicità client_name dei token lunghi; Supervisor [proxy2026.11.0](https://raw.githubusercontent.com/home-assistant/supervisor/2026.11.0/supervisor/api/proxy.py). Il proxy esclude espressamente le API hassio riservate; la soluzione non tenta di usarle o elevare il normale add-on. I risultati osservati sulla VM restano distinti dalle aspettative derivate dalle fonti.

## Controllo del diff e decisioni

Nessun ampliamento di custodia dei segreti o dei privilegi autorizzato implicitamente. ADR-0022 rimane il vincolo della soluzione; le proposte P-166-A/B sono distinte dalle correzioni esecutive necessarie alla richiesta corrente.

Diff app verificato contro la fonte .73.6: solo serviceKeeper/identityActivation e3test; altre fonti/lockfile/Node identici. Aggiornate solo le guide HA pertinenti, questo report e fonti comuni/stato/annotazione attuativa ADR-0022. Nessuna modifica ai sorgenti frontend, stack o dipendenze; nessun remote, commit comune, push o deploy. Le correzioni del percorso proprietario e del recupero autonomo attuano la richiesta corrente e l'autonomia già approvata; P-166-B non approvata e non implementata. Controllo whitespace circoscritto finale registrato; difetti globali preesistenti esterni al lotto non corretti.

Controllo finale: `git diff --check` sui documenti comuni exit0;154righe app aggiunte/sostituite e5documenti aggiuntivi senza trailing whitespace (`final-whitespace-check.json`). Confronto status iniziale/finale: le sole nuove voci, oltre al report già creato nel primo inventario, sono ADR-0022 e i3file prima puliti ora modificati per questo incarico; nessuna rimozione di voci preesistenti. Le altre modifiche erano già nel worktree. Staging0 e HEAD di partenza conservati.

## Chiusura e punto di ripresa

Incarico completato: recupero autonomo dopo restore e persistenza al reboot verificati sulla sola VM REP092; kit .76.1 aggiornato e congelato, accessi revocati/VM spenta, banco preservato. .73.6/.74.1/.75.1 conservate con esiti distinti.

**Il kit resta candidato locale per il PC del capo.** Restano stabilità/H24 sul Lenovo (ISSUE-129 non risolta sul PC attuale), matrice Core completa e prove LAN/Windows/telefono/eWeLink/dispositivi reali, oltre a release/immagine/catalogo pubblici coerenti. Il bootstrap pinna18.4/11.1: non forza downgrade o compatibilità con altre versioni. Altre forme di autoriparazione/rotazione con file presente non sono state ricollaudate nativamente qui; il ramo nuovo riguarda il segreto perso nel restore e non rimuove identità con file salvato. Il FAIL generale famiglie resta estraneo. Nessuna pubblicazione o installazione sul destinatario è dedotta dal kit.

Punto di ripresa: usare kit/hash .76.1 e prove finali76; riaprire la VM conservata solo con nuova sessione autorizzata/CONFIG pubblica e chiave distinta, perché entrambi gli accessi REP005 sono revocati. Nessun lavoro del presente incarico rimane attivo; il backlog e la qualifica del destinatario non autorizzano nuove azioni sul banco.
