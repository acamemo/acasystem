# Dispositivi riconoscibili, profili sincronizzati e Tavano

| Campo | Valore |
|---|---|
| ID | REP-20261102-012 |
| Stato | Implementazione locale completata; collaudo fisico e distribuzione separati |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta U51–U52 | U51 approva denominazione dispositivo durante creazione profilo e chiede il piano. U52: «PLEASE IMPLEMENT THIS PLAN», seguito dal piano completo «ACA: dispositivi riconoscibili, profili sincronizzati e Tavano». |
| Autorizzazione | Implementazione locale delle cinque consegne del [piano](../riprogettazione/blocchi/03-profili-dispositivi-tavano-piano.md), verifiche, build e istruzioni. Nessun deploy, installazione domestica, nuovo relay, GUI boot HAOS o ripresa VM desktop. |

## Obiettivo e perimetro

Realizzare ingresso QR/IP e registrazione libera HA, denominazione/sessioni dei client, profili personali live con ordine comune, editing esclusivo e bozze offline, Tavano condiviso e comandi tracciati. Le scelte umane sono conservate nel piano; la visibilità domestica del registro non autorizza modifiche ai profili altrui.

Preservate le 389 righe di stato Git preesistenti. Checkpoint prima delle modifiche in `backup/rep019/before`: 2097 file, 24.381.503 byte, manifest SHA256 in `backup/rep019/checkpoint.json`. Nessun reset o commit automatico. Stack e dipendenze conservati, regole surgical-coding applicate.

## Criteri di completamento

- Registrazione senza approvazione e senza password persistenti; sessioni/client verificati e revoca indipendente.
- Profili autorevoli con migrazione idempotente e recupero configurazioni divergenti; ordine comune adattivo.
- Modifiche granulari, riserve atomiche45s/rinnovo15s, rifiuto vecchi editor, undo mirato.
- Bozze IndexedDB10MiB, conflitti espliciti, nessuna eliminazione silenziosa o esecuzione fisica differita.
- Tavano globale, attività/diagnosi senza segreti, comandi monouso60s e risultati incerti espliciti.
- Sette giorni mobili e quota50MiB/diagnosi10MiB; esportazione volontaria depurata; regressioni, strict e build locali.
- Confronto con debito ISSUE-134 e documentazione di limiti hardware/rete non verificati.

## Avanzamento e modifiche

Avvio: stato/istruzioni letti, checkpoint creato prima delle modifiche; lavori suddivisi per confini. Root: contratti e backend profili/client/risorse/SSE, integrazione e verifiche. Flussi paralleli: registrazione/ingresso/native; profili/layout/editing/bozze; attività/comandi/Tavano. Nessuna evidenza futura anticipata.

**Steering U53 durante l'implementazione:** Tavano come widget a schermo intero con lista azioni, iniziale utente in cerchio colorato, client, azione/esito e dettagli; colore facoltativo alla registrazione. Pulsante Copia alto a destra per tutte le voci mostrate nella lista in testo, con prompt diagnostico AI, da condividere volontariamente anche tramite WhatsApp. Recepito come presentazione del registro: clipboard con fallback manuale su browser HTTP, conteggio voci caricate, contenuto depurato, nessun invio automatico. Export JSON rimane disponibile.

**Estensione U54:** click sull'icona account per colore oppure file immagine; con foto il colore non compare. Ritaglio/posizionamento e sfondo mostrato soltanto nella vista account. Reference allegata conservata byte-identica come UI-012 (11389byte), registro integrità aggiornato. Frontend: crop canvas senza nuove dipendenze, avatar512² e cover1536×768, sorgente soltanto in memoria; backend: proprietà account con revisioneCAS, immagini raster verificate e cifratura coerente con la modalità dati. Avatar visibile ai membri per Tavano; cover nella vista del proprio account. Foto e payload non entrano nei log/esportazioni.

## Implementazione consegnata

1. **Dati e migrazione:** famiglia `/api/v2` e contratti comuni per casa, account, client, sessione, editor e profilo. SQLite conserva fonti originali e varianti divergenti; il checkpoint automatico del database precede il primo schema v2. La scelta della fonte e dell'ordine è persistente. Operazioni mirate e revisioni delle risorse aggiornano il documento corrente; l'attivazione del protocollo resta registrata anche eliminando l'ultimo profilo. I writer globali legacy ricevono 426.
2. **Accesso:** registrazione libera separata dal proprietario, con journal recuperabile senza password; normale utente HA creato tramite identità tecnica. Client nominati, verifica HA di utente e refresh corrente, sessioni indipendenti e revoca specifica. Durante una revoca HA pendente ACA blocca immediatamente il client, anche sui percorsi legacy/proxy. Android scanner-first con fallback IP, desktop IP/incolla, QR pubblico e copia indirizzo in Sistema; inviti account/layout separati.
3. **Profili live:** libreria personale, selezione locale, ordine comune e suggerimenti dimensionali proiettati senza sorpassi o nuove pagine persistenti per lo schermo. SSE autenticato segnala revisioni già accettate. Le categorie iniziali compaiono una sola volta nel profilo nuovo; non ripopolano fonti migrate o pagine cancellate.
4. **Editing e offline:** riserve atomiche su widget e impostazioni propagate, oppure intero profilo per operazioni strutturali; 45 secondi, rinnovo 15. Indicazione persona/client, bozze Salva/Annulla, inverso mirato per undo, rifiuto dei vecchi titolari e dei widget eliminati. IndexedDB conserva bozze per casa/account/profilo, quota 10 MiB, ricevute dei salvataggi incerti e scelte di conflitto. Il cambio centrale nativo conserva questo database, pulendo identità, cookie, cache, service worker e vecchie foto locali.
5. **Tavano e comandi:** widget/registro fullscreen domestico con persona, avatar, client, filtri, dettagli, copia testo delle voci caricate e JSON depurato. Attività del salvataggio nella stessa transazione; diagnosi selezionata e bounded. Intenti monouso 60 secondi, passaggio atomico a pending prima dell'invio con token personale, timeout/riavvio incerti senza reinvio automatico. Pulizia iniziale/oraria e al superamento quota, fino a sette giorni entro 50 MiB logici, di cui 10 MiB diagnosi.

**Account U54:** icona in Sistema, colore oppure foto predominante e cover privata nella vista account. Canvas offre trascinamento, zoom, posizione e rotazione; sorgenti raster fino a 10 MiB, avatar 512² entro 256 KiB e cover 1536×768 entro 768 KiB. CAS evita sovrascritture silenziose, cifratura coerente con il database esistente. Originale UI-012 immutato, nessuna nuova dipendenza. Corrette durante QA due condizioni di smontaggio delle schermate (login concorrente all'idratazione e aggiornamento metadati della stessa identità) e la specificità CSS della scheda account.

## Verifiche ed evidenze

I log sono locali in `backup/rep019`; i gruppi sovrapposti non vanno sommati. Le prime prove fallite sono conservate e distinte dalle ripetizioni riuscite.

| Controllo | Comando/procedura | Risultato ed evidenza |
|---|---|---|
| Backend completo finale | `npm run test -w backend` | **696 PASS, 1 skip, 47 file**, `backend-full-final.log`. Il primo passaggio 660/1 rimane nel log iniziale. |
| Contratti, TypeScript, Casa3D | `npm run typecheck`, `npm run test:ui`, `npm run test:design`, `npm run test -w casa3d` | Strict dei tre workspace riuscito; UI 3/3, design 4/4, Casa3D 443/443. Log `strict-final`, `ui-final`, `design-final`, `casa3d-final`. |
| Frontend, flussi nuovi consolidati | 15 file nominati in `frontend-v2-consolidated.log` | 91 PASS/1 attesa test non aggiornata al testo «centrale»; riallineata la sola attesa in ClientsSection, ripetizione 4/4 in `clients-label-recheck.log`. Coperti account/crop, registrazione, client, ordine, coordinatore, rollback, editor e gateway. |
| Ulteriori regressioni mirate | Suite e comandi nei handoff `primitives-handoff.md`, `login-race-handoff.md`, log `frontend-live-*`, `frontend-u54-identity-*`, `tavano-*` | Verificati rollback lease, propagazione, profilo cancellato, rinnovo/scadenza, offline, quota, retry con stessa operazione, revoca durante lettura/SSE, stato editor conservato al cambio metadati, helper mutativi e Tavano. |
| Client e Java | `npm test` e `npm run typecheck` in `progetto/client`; Gradle `testDebugUnitTest` | Shared 7, core 144, Windows 100, Android web 22; **17 test Java** e strict riusciti. Log `native-reset-*`, handoff revisione2. |
| Smoke Electron reale | `npm run check:smoke -w windows` | **9/9**: IP/errori/cache, assenza VM, cambio centrale con IDB bozza realmente conservata e vecchia identità/foto/cache eliminate. |
| Build locali | Build frontend e Casa3D; ZIP Electron; `assembleDebug`; builder snapshot e prepare HA | Riuscite. Log `frontend-build-delivery`, `casa3d-build-final`, `native-reset-*`, `docker-build-delivery`, `ha-prepare-delivery`. Avvisi chunk JS grandi e deprecazioni Gradle conservati. |
| Immagine Linux | Container effimero `--network none`, database in memoria, dati su tmpfs | **11 controlli PASS**, versione 0.9.34, asset e 11 tabelle v2, API protette, JSON di registrazione invalido e bundle pre-login con SHA verificato. `docker-runtime-delivery.log`; nessun collegamento alla centrale reale. |
| Provenienza | `python backup/rep019/verify-delivery.py`, prepare `--check` | 1740 sorgenti verificati nello ZIP da 1765 voci, 7 checksum, bundle client 119 voci; minServer 0.9.34/minShell 0.1.0. SHA completo nel manifest di provenienza. Originale UI-012 byte-identico; nessun file del checkpoint eliminato o cambiamento ai file protetti. |
| SQLite su disco | `node backup/rep019/storage-measure.mts` | Checkpoint creato una sola volta; 2000 eventi sintetici, scadenza all'avvio dopo 8 giorni e zero eventi residui. Misurati separatamente file/indici/WAL: dettaglio sotto. |
| Webapp e backend reali isolati | Express + protocollo HA simulato 2026.10.4, dist produzione, due Chromium PC/telefono | Registrazione, login/nome senza refill, stesso widget occupato, modifiche indipendenti conservate e revisione vecchia rifiutata. Foto/crop/rotazione + cover; Tavano fullscreen, 30→60 voci, copia60 con fallback manuale e clipboard, JSON63 depurato nell'ultimo run. Precedente PASS con JSON126 conservato in `qa-before-account-css/`. Nessun pageerror; sole 409 attese. `qa-tavano-results.json`, screenshot e script dedicati. |
| Persistenza account | Nuovo login e reload del client, stesso account | Avatar e cover ancora caricati; foto visibile dal telefono e cover assente da Tavano. `qa-tavano-persistence-results.json`. |
| Presentazione account finale | Stili effettivi nella dist ricompilata | Scheda flex centrata, editor grid e scarto avatar dal centro scheda 0px. `qa-account-final-layout.json`; screenshot account aggiornato. |
| IndexedDB reale | Bundle temporaneo del modulo `drafts.ts` reale, Chromium con profilo persistente, due schede | Dopo chiusura/riapertura recuperati bozza esatta, ricevuta pendente e cache profilo; casa/utente diversi esclusi, altro client della stessa identità ammesso. Due salvataggi simultanei da6MiB: uno accettato e uno `DRAFT_QUOTA`, totale6.293.225byte entro10MiB e bozza precedente intatta; scarto esplicito isolato. `qa-drafts-indexeddb-results.json`; nessun mock storage o modifica dei sorgenti. |
| Hardware e HA domestico | PC/iPhone fisico sulla LAN, Android scanner/permessi su hardware, HA reale | **Non eseguito.** La simulazione Chromium/touch/UA iPhone non verifica Safari, la camera o il mini PC. Nessun comando a dispositivi reali. |

Le prove browser ammettono solo loopback/data/blob: i tentativi tile OpenStreetMap della schermata Sistema sono stati abortiti. Non sono stati inviati log a WhatsApp, AI o servizi esterni. Il primo smoke browser registrazione→launcher non generava traffico esterno; non estendere quel risultato alle schermate con la mappa.

### Controlli generali e ISSUE-134

Il run completo frontend ha **265 file PASS/9 FAIL, 3872 test PASS/11 FAIL** (`frontend-full-final.log`), prima degli ultimi riallineamenti e correzioni. Le sei suite interessate dal nuovo gateway, ordinamento del catalogo, conteggio preset e rimozione del writer legacy sono state ripetute: 78 PASS (`frontend-regressions-delivery.log`). Due attese lazy/motion fallite nel run generale passano nel gruppo mirato; la sensibilità è già registrata in ISSUE-134.

Restano riprodotte **tre aspettative preesistenti**: testi HA nei widget Zigbee (tre stringhe, un test), test Sistema che vieta ogni riferimento all'indirizzo pur essendoci il QR/IP, tasti guida/sorgente LG attesi assenti. Log `frontend-preexisting-recheck.log` (30 PASS/2 FAIL) e `frontend-tv-preexisting-recheck.log` (7 PASS/1 FAIL). I relativi comportamenti erano presenti al checkpoint; non sono stati rimossi per rendere verdi i test. Le aspettative sui nuovi testi introdotti nell'incarico sono invece state aggiornate e verificate.

Lint frontend, colori e tipografia riusciti; lint backend generale resta non verde per **`routes/setup.ts:12 no-control-regex`**, sorgente invariata dal checkpoint, come ISSUE-134. Lint dei file nuovi/modificati backend riuscito nei flussi mirati. Non è dichiarato verde `npm test`/lint generale.

### Quote logiche e spazio fisico

La misura su disco usa 2000 eventi sintetici con politica predefinita: payload logici 514.889 byte, database 1.101.824 byte, WAL 4.140.632 byte e SHM 32.768 byte durante apertura. Dopo la pulizia zero eventi e 227 pagine libere riutilizzabili; file e WAL non si riducono immediatamente. `storage-measure.json` riporta l'allocazione di ciascun indice tramite dbstat. **50 MiB è la quota logica Tavano, non un tetto alla dimensione fisica dell'intero database.** Questa prova non misura il carico reale di una casa o garantisce sette giorni completi.

## Materiali locali

- [Guida di prova](../riprogettazione/blocchi/03-profili-client-tavano-prova.md), con percorsi dei nuovi ZIP Windows portable e APK debug **revisione2**, relativi SHA256 e istruzioni dei flussi.
- [Output HA locale 0.9.34.99](../../progetto/ha-app/out/0.9.34.99/SOURCE-PROVENANCE.json): sorgenti ZIP, bundle web0.9.34, manifest e checksum nella stessa cartella. Immagine locale `ghcr.io/acamemo/acasystem:0.9.34.99`, preparata sopra `aca-system:profili-tavano-local`.
- La revisione99 identifica materiale di verifica locale, **non una release pubblica**. Gli output pubblicati0.9.33 e i precedenti ZIP/APK sono preservati. Per provare i contenitori nuovi serve anche il backend/webapp v2 sulla centrale; il solo ZIP/APK non aggiorna il mini PC.

## Controllo del diff e decisioni

Le nuove decisioni derivano dal piano umano U52, dalle risposte U51 e dalle estensioni U53/U54. REQ/AC23–27 e ADR-0035 collegano scelte e implementazione; ADR-0007 conserva lo storico e rimanda all'ordine comune. Reference, archivio documentale, lockfile, regole e codice VM protetti risultano invariati rispetto al checkpoint. Nessuna sostituzione tecnologica, nuova dipendenza, modifica di account reali o pubblicazione. Il diff dell'incarico è distinto dalle modifiche preesistenti tramite manifest del checkpoint. Controllo Git del whitespace riuscito con `core.whitespace=trailing-space,space-before-tab,cr-at-eol`, rispettando i file CRLF preesistenti; nessuna normalizzazione generale. Verificati46nuovi link documentali senza destinazioni mancanti e byte/SHA dei due artefatti nativi finali. Server/browser/container effimeri delle prove chiusi; i tre container preesistenti risultano ancora attivi.

## Chiusura e punto di ripresa

Consegna locale completata. Build e prove software non sostituiscono il collaudo della centrale e dei dispositivi fisici. Punto di ripresa: installazione/pubblicazione solo come incarico distinto; poi prova reale PC+iPhone sulla stessa LAN e scanner Android quando disponibile. ISSUE-134 resta aperta per il debito generale. Accesso remoto, boot grafico HAOS ed esperimento VM rimangono separati.

**Seguito U55, 2026-11-02:** successiva autorizzazione umana a pubblicazione e aggiornamento, completati in [REP-20261102-013](REP-20261102-013-pubblicazione-0.9.34-aggiornamento-centrale.md). ACA0.9.34 pubblica e banco su questo PC aggiornato, con backup/dati preservati e accesso iPhone confermato dopo regola LAN privata. Lo snapshot pubblicato esclude cinque note/metadati QA locali, preservati sul disco, mantenendo lo stesso bundle web collaudato qui. La consegna locale e i relativi hash di questo report restano storici; usare release e guida aggiornate per la prova corrente. Primo proprietario ancora da configurare dall'utente, nessun nuovo collaudo autenticato/hardware dedotto dalla sola raggiungibilità.
