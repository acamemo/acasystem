# Consolidamento dei progetti, risorse comuni e flussi applicativi

| Campo | Valore |
|---|---|
| ID | REP-20261102-008 |
| Stato | Completato localmente; limiti della suite generale in ISSUE-134 |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta / fonte umana | U46: l'utente riporta i tre punti della proposta incrementale di REP-20261102-007 e conferma «andrei a seguire la tua proposta» |
| Autorizzazione | Implementare consolidamento, risorse/packaging in sede neutra, modelli launcher/contratti API comuni ed estrazione graduale di flussi dell'orchestratore, preservando comportamento/API e struttura a strati |

## Obiettivo e perimetro

Applicare le tre fasi approvate di ISSUE-133. Controlli comuni nel comando generale, ignore cache, asset generati puliti, mappa aggiornata e provenienza immagine/sorgenti verificabile; risorse shell e packaging comuni per Windows/Android/HAOS; modelli launcher indipendenti dalle schermate, contratti API condivisi e separazione mirata di flussi esistenti.

Nessuna nuova dipendenza/tecnologia, fusione lockfile, pubblicazione, installazione, modifica VM o cancellazione checkpoint. Conservare tutte le modifiche preesistenti (336righe di stato Git). Checkpoint locale prima delle modifiche in backup/rep018. Versioni/asset pubblici0.9.33/r2 e pacchetti U42 restano congelati; eventuali build di verifica usano nomi locali distinti.

## Criteri di completamento

1. Test UI/design aggregati e pulizia delle copie verificata anche su rename/delete; output generati ignorati, mappe/istruzioni correnti.
2. Asset shell e funzione di packaging senza dipendenza da una specifica piattaforma; consumatori aggiornati e archivi verificati.
3. Provenienza di immagine e snapshot sorgenti collegata e mismatch rilevato prima della preparazione del rilascio, con prove senza pubblicazione.
4. Modelli launcher e contratti API canonici senza dipendenze di presentazione/server; almeno un flusso coeso separato dall'orchestratore, API/UX preservate.
5. Strict/lint/test pertinenti e build dei consumatori, regressioni browser/confronti dove necessari; documentazione e stato dell'incarico aggiornati.

## Avanzamento

Autorizzazione U46 ricostruita da richiesta corrente e audit U45. Checkpoint di2069file con SHA in backup/rep018/before-manifest.json, prima degli interventi. Implementazione in tre fasi, preservando i due alberi npm/lockfile.

### 1. Controlli, generati e orientamento

- npm test di acasystem esegue prima test UI e design, poi i tre workspace. Il client aggrega anche i test del packaging comune.
- Ignore per progetto/**/node_modules e Windows generated-shell. Il copier accetta soltanto una destinazione dedicata design-aca verificata con percorsi reali e controlli sui symlink; rigenera i figli senza conservare asset rimossi. Test di residui/rename/delete e sentinelle esterne.
- README root/progetto/acasystem e architecture aggiornati alla mappa reale. Lo storico architetturale è conservato sotto intestazioni esplicite; [ADR-0034](../decisions/ADR-0034-consolidamento-progetti-e-confini.md) registra l'autorizzazione e i confini.

### 2. Risorse, packaging e provenienza

- Fonti shell in client/shared/shell: CSS/icona identici ai precedenti, helper di copia neutro. Windows genera generated-shell da HTML sorgente e risorse comuni; Android genera www dalle stesse fonti. I vecchi CSS/icona Windows non sono ricreati come copie tracked. HAOS usa l'icona neutra.
- client/shared/packaging contiene assembler web, lettore e scrittore ZIP; make-release e client-bundle HAOS sono consumatori/facciate. Stessi schema, nomi, pin e limiti; rilettura ZIP ora comune a entrambi. Vecchi percorsi dei helper restano re-export. Nessuna dipendenza da Electron/Capacitor nei moduli Node comuni.
- ha-app/build-base.mjs cattura una volta i file pubblicabili ACA, costruisce un contesto congelato e registra SHA sorgenti/versione nell'immagine. prepare verifica queste etichette prima di creare output/contenitori, usa l'ID immutabile per estrarre i bundle e verifica che il tag base non sia cambiato durante la preparazione. --check esegue il preflight senza output né contenitori.
- Il medesimo snapshot ACA viene scritto nello ZIP sorgenti; repository, bootstrap, icona, moduli condivisi e QR/licenza sono catturati prima della preparazione. SOURCE-PROVENANCE.json registra hash dei1673file ACA, immagine base,22tool sorgente e QR generato. Il codice Node dei tool è importato all'avvio: il flusso presume assenza di editing concorrente degli strumenti durante il comando.
- L'impronta collega input locali e artefatti; non è un'attestazione firmata o la garanzia di build binarie riproducibili. node:26-alpine resta mobile. I vecchi artefatti senza etichetta non vengono dichiarati verificabili retroattivamente; per prepararne una nuova versione occorre il builder con provenienza.

### 3. Modelli, contratti e flussi

- Sei modelli in frontend/src/domain/launcher: catalog, categoryPages, categoryPageGrid, editTarget, cardKeys, roomCards. Resolver espliciti per i metadati; piccolo adattatore del registry in utils/launcher/categoryModels. I consumatori non importano più questi modelli dalle schermate. Regola lint per impedire dipendenze del dominio da schermate/hook/API.
- useLauncherRemoval estrae177righe coese di rimozione, undo, presenza/timer e avvisi; corpo e ordine espanso dei126hook della schermata verificati rispetto al checkpoint. Nessuna variazione CSS, tempi o gesto introdotta. È il primo incremento graduale dell'orchestratore, non la separazione di ogni flusso possibile.
- contracts/devices.ts:36dichiarazioni solo di tipi senza import o byte runtime; backend/frontend condividono DTO e relativi tipi. I precedenti moduli riesportano le API dei tipi. Distinti risultato normalizzato HA e risposta pubblica con entry/pending; chiavi marca ristrette conservate nel backend. Nessuna variazione JSON delle API reali.
- Fixture/demo status allineate al contratto server esistente (repairable:false e stato missing). DevicesApi legge il contratto comune obbligatorio, senza saltare il controllo se il backend non è accanto. Per rendere eseguibili le regressioni backend è stata rimossa la seconda copia identica di20righe nel simulatore HA: il primo handler è preservato. Quattro expected26→27 nel test controller aggiornati dopo riproduzione della stessa discrepanza sul checkpoint (Gateway Zigbee già esistente).

## Verifiche ed evidenze

Log/JSON/screenshot in backup/rep018, esclusi da Git. Comandi npm dalla relativa radice indicata; nessuna installazione host/dispositivo o nuova dipendenza.

| Controllo effettivo | Esito |
|---|---|
| npm run test:ui e test:design, acasystem |3/3 e4/4 PASS, incluse rimozioni/rename, symlink/sentinelle, CSS/font e moduli indipendenti. |
| Client npm test/typecheck, build -w windows e -w android | Core144,Windows99,Android21 PASS; packaging comune4test e test HA/facciata verificati, strict/build riusciti. Log client-*. Nessun nuovo ZIP/APK. |
| Smoke Electron e shell-layout |8/8 flussi IP/sessione/cambio centrale/errori; vecchio flag VM ignorato. Quattro viste,24confronti materiali, font locali/overflow/CSP e CSS/icona identici alla fonte/checkpoint. |
| Frontend regressioni launcher/modelli |8file/317test PASS;3test nuovi di indipendenza del dominio. Strict e lint mirato PASS. Baseline riprodotta prima di correggere i conteggi obsoleti. |
| Frontend DevicesApi/AddDeviceFlow/MockupHa |3file/112test PASS; contratto comune e fixture coerenti. |
| Backend regressioni dispositivi |8file/257test PASS. Prima esecuzione impedita dalla dichiarazione duplicata già presente nella fixture, poi rimossa come sopra. |
| Backend suite completa separata |40file,640PASS e1saltato su641. backend-full-test.log. |
| Casa3D suite completa separata |443/443 PASS,10suite. casa3d-full-test.log. |
| npm run typecheck, acasystem | Frontend/backend/Casa3D tutti PASS. Anche la precedente duplicazione nella fixture non blocca più il controllo. |
| npm run lint, tipografia e colori | Frontend PASS; tipografia662file e colori578file senza violazioni. Lint backend dei9file interessati PASS. Il lint generale backend resta rosso sul no-control-regex di routes/setup.ts:12, identico al checkpoint e non modificato. |
| Equivalenza emesso, esbuild sul checkpoint/current |8moduli backend e classify frontend: JS byte-identico con minifyWhitespace/minifySyntax e nomi preservati. Contratti: zero import e zero runtime. Evidenze contracts-runtime-equivalence e auxiliary-review. |
| Build frontend/versione0.9.33 e Docker frontend/Casa3D | PASS. Build Windows/web Android PASS. Nell'immagine base ENV/versione0.9.33 corrispondono alla label e al frontend. |
| Browser owner prima/dopo |4PNG e stili effettivi identici (chiaro/scuro×desktop/telefono), zero pageerror/host esterni, solo GET setup/status simulato. |
| Browser mockup con movimento | present→exiting→removed→restoring→present,5→4→5widget e layout ripristinato con hash identico. Zero API/HA/account o rete esterna. |
| Provenienza Node + Docker + prepare --check | Test freeze/order/rename/delete/add/mismatch PASS; immagine reale senza etichetta rifiutata. Etichetta della nuova immagine confrontata con snapshot corrente; cambiamento di byte simulato in memoria rifiutato senza modificare il progetto. |
| Prepare completo locale, revisione99 | PASS; sourceZIP1698voci,1673hash sorgenti e22tool verificati, QR/licenza congelati e7checksum validi. Non pubblicata alcuna versione. |

### Materiali locali di validazione

- Base aca-system:structure-shared-local, ID **sha256:04c4ff01c7aa7fe2b3d76a99d3f22110a55c08811b017028c8f90547ad2af044**.
- Snapshot ACA **4e4c93fa2a3e9e74ac08f0692f61cb0b7e05b1ca123cbe0b9a3ea4ebee0050d1**,1673file; corrispondenza attuale verificata dopo le prove.
- Wrapper di sola prova ghcr.io/acamemo/acasystem:0.9.33.99, ID **sha256:845a085d500d87379ff3c2d748d884ea8f71eb7e5aadbfb4980b828ba1a778b3**; output progetto/ha-app/out/0.9.33.99, ZIP sorgenti6.5MB. Revisione99 usata per non sovrascrivere out/versioni precedenti; **non è un rilascio**, immagini non avviate né inviate a GHCR.
- SOURCE-PROVENANCE e SHA256SUMS verificati dopo la generazione. I tre container del banco iniziale restano quelli preesistenti; nessun ambiente HA/VM avviato per il riordino. Pacchetti U42 e release0.9.33/r2 non aggiornati.

### Limiti della suite generale

`npm test` ha eseguito i controlli UI/design e poi il frontend: **251file PASS,9file non verdi;3784test PASS e9FAIL su3793**, con2errori di lettura in raccolta. Il comando si è fermato al frontend: backend/Casa3D sono stati eseguiti separatamente con gli esiti sopra. Non dichiarare la suite generale verde.

Diagnostica mirata dopo il giro di563.52s: DiscoveryLauncher/EditBarClarify9/9 e ShellLauncher/Casa3dPage37/37 PASS isolati; i problemi raccolta/alcuni timeout non si sono riprodotti. FixLauncherUiShell dà11PASS/1FAIL sia sul current sia sul checkpoint, per27preset contro26attesi. Il caso motion isolato di LauncherScreen dipende dal riscaldamento del pannello lazy: fallisce nello stesso accesso sincrono al dialog anche col codice precedente; l'intero file passa nel giro317. Nessuna modifica al prodotto o ai test effettuata per nascondere questi riscontri.

Restano aspettative preesistenti su testi Zigbee, QR/indirizzo in Sistema e tasti guida/sorgente TV. Le relative sorgenti sono invariate rispetto al checkpoint; dettagli negli stack di acasystem-full-test.log. Registrati con il lint preesistente e la sensibilità di esecuzione in ISSUE-134, come lavoro separato. Questi risultati non costituiscono collaudo fisico Android/iPhone, accessibilità completa o accettazione generale del prodotto.

## Controllo del diff e decisioni

Modifiche riconducibili alle tre fasi approvate; source originali upstream, valori CSS/font, checkpoint VM, dati e lockfile preservati. ADR-0034 esplicita accettazione U46 e limiti della provenienza. Revisione parallela dei confini, confronto runtime e browser senza regressioni individuate nel perimetro. Nessun commit, deploy o nuova dipendenza; esiti generali non verdi conservati e distinti dalle verifiche mirate.

Chiusura statica:259file protetti (upstream/archivio/font/lockfile) confrontati per SHA con il checkpoint, tutti invariati;1099collegamenti locali dei documenti pertinenti validi. Diff mirato senza errori di whitespace, con soli avvisi Git sulla normalizzazione EOL di file già presenti. Evidenza final-review.json. HEAD rimane5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69.

## Chiusura e punto di ripresa

Le tre fasi sono implementate e verificate localmente nei rispettivi confini; criteri di completamento soddisfatti con i limiti generali esplicitati. Restano il debito dei controlli generali in ISSUE-134 e i collaudi fisici già aperti, non una nuova riorganizzazione assegnata. P133-E rimane proposta separata; eventuali ulteriori flussi dell'orchestratore si estraggono quando richiesti/toccati, preservando regressioni. Nessun incarico attivo residuo o pubblicazione automatica: scegliere una prossima versione prima di distribuire questo stato. Controlli documentali/diff di chiusura conclusi.
