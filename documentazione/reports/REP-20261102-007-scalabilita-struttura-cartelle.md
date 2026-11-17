# Scalabilità della struttura delle cartelle e dei progetti

| Campo | Valore |
|---|---|
| ID | REP-20261102-007 |
| Stato | Completato; proposte registrate, nessuna riorganizzazione applicata |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta | U45: «controlla anche la gestione delle cartelle dei progetti se sono gestite in maniera scalabile» |
| Autorizzazione | Audit della struttura e delle dipendenze, con documentazione di evidenze e proposte. Non assegnati spostamenti, nuovi package/workspace, refactor, installazioni o deploy. |

## Obiettivo e perimetro

Valutare la crescita di progetti, distribuzioni e funzionalità: proprietà delle cartelle, confini applicazioni/librerie, dipendenze relative, workspaces/lockfile, sorgenti e generati, build/packaging, upstream e storico. Distinguere difetti osservati, rischi di crescita e semplici preferenze di nomi. Riferimenti: ADR-0002, ADR-0008, ADR-0014, ADR-0023, ADR-0031–0033 e stato corrente U44.

Preservare tutte le modifiche precedenti: stato Git iniziale335righe, nessun commit successivo a5c321b9. Sorgenti analizzati in sola lettura; evidenze locali selezionate in backup/rep017, nessun contenuto sensibile acquisito. Non eseguire applicazioni, VM, installazioni o nuove build per una valutazione delle cartelle.

## Criteri di completamento

1. Mappa effettiva dei progetti e dei loro confini, distinguendo cartelle canoniche/generate/storiche.
2. Rilievi verificabili e prioritizzati con percorsi, impatto e limiti, senza dedurre problemi dal solo numero di file o da convenzioni di naming.
3. Valutazione di scalabilità e proposta incrementale concreta; proposte non applicate registrate nel registro dei problemi.
4. Verifica del diff solo documentale e chiusura con indice/stato/diario aggiornati.

## Avanzamento

Letti istruzioni, stato, manifest, guide, ignore e fonti architetturali; audit paralleli readonly su moduli applicativi, client/addon e confini build/package. Nessun grafo preesistente disponibile; nessuno strumento installato. Inventario Git-aware in backup/rep017/inventory.json; esclude gli output ignorati e distingue sorgenti/reference, ma include i sorgenti generati Casa3D, che non vanno rifattorizzati direttamente.

## Valutazione

**Base adeguata, con confini da consolidare prima di aggiungere altri client o ampliare i flussi.** Non emerge la necessità di spostare tutto in un nuovo monorepo o introdurre un orchestratore di build. La crescita è già separata per responsabilità principali; i punti fragili sono alcune dipendenze tra piattaforme, contratti copiati, lifecycle degli output e orientamento documentale. Due radici npm con due lockfile non costituiscono da sole un difetto.

### Mappa effettiva

```text
radice Git
├── documentazione/             requisiti, design, decisioni, verifiche e storico
├── backup/                     evidenze/checkpoint locali ignorati, salvo README
├── usa-come-git/                snapshot locali ignorati
└── progetto/
    ├── acasystem/              radice npm/lockfile e contesto Docker server/web
    │   ├── frontend/           composizioni, controller e adattatori dell'app
    │   ├── backend/            API, proxy HA, persistenza e servizi
    │   ├── casa3d/             workspace Lit con upstream/override/generati distinti
    │   ├── ui/                 componenti React comuni, fonte canonica
    │   ├── design/             CSS/font/temi comuni, fonte canonica
    │   └── upstream-tunet/     reference conservate, non costruite
    ├── client/                 seconda radice npm/lockfile
    │   ├── core/               contratti/porte indipendenti dalle piattaforme
    │   ├── windows/            Electron, shell, adattatori e output ignorati
    │   ├── android/            Capacitor, shell web e adattatori nativi
    │   └── scripts/            strumenti client comuni
    └── ha-app/                 immagine/catalogo/bootstrap e preparazione release
```

UI/design sono fuori dal frontend ma dentro il contesto Docker: scelta coerente con U42/U44. Sono raccolte interne, non package npm autonomi; il consumo attuale funziona nel repository completo. Formalizzare package/export/peerDependencies diventa utile quando nasce un consumatore React indipendente, non per il solo nome della cartella.

### Aspetti già scalabili

- Un solo Git per codice e documenti; sorgenti, reference, dati runtime, checkpoint e release generate hanno ruoli distinti. Le esclusioni coprono la maggior parte degli output correnti.
- Frontend, backend e Casa3D hanno manifest/configurazioni propri e lock comune server/web; core/Windows/Android hanno un secondo lock coerente con la distribuzione dei client. Non rilevate discrepanze manifest/lock nelle proprietà controllate: dipendenze, engine e workspaces.
- Core espone porte indipendenti da Electron/Capacitor; ui/ non importa i controller del frontend o HA. Il backend mantiene router/controller/servizi e createApp configurabile per i test.
- Casa3D distingue upstream immutabile, overrides manuali, src/lang generati e dist: i file molto grandi del codice derivato non giustificano modifiche dirette ai generati. Docker e raccolta sorgenti includono ui/design.

### Rilievi prioritari

Priorità P2: debito concreto da affrontare nel consolidamento; P3: manutenzione/estensione futura. Non sono attestazioni di un guasto del prodotto oggi.

| ID | Priorità e osservazione | Evidenza | Effetto e proposta non applicata |
|---|---|---|---|
| F1 | P2 — Risorse comuni collocate sotto una piattaforma | [Android build-web:12](../../progetto/client/android/scripts/build-web.mjs:12) copia shell.css/icon.png da windows/shell; [prepare HA:90](../../progetto/ha-app/prepare.mjs:90) usa l'icona Windows | Un nuovo client dipenderebbe da Windows per risorse non Windows. Cartella neutra per asset/composizione delle shell; preservare design/ come unica fonte CSS/font. |
| F2 | P2 — Copie generate non sincronizzano le rimozioni | [copy-assets:13](../../progetto/acasystem/design/copy-assets.mjs:13), [prepare-design](../../progetto/client/windows/scripts/prepare-design.mjs), [glob package Windows:39](../../progetto/client/windows/package.json:39) | Il copier sovrappone i file e rimuove solo due nomi storici. Attualmente42file previsti,43Windows con README.md residuo,42Android; residuo innocuo oggi. Pulizia mirata della destinazione generata o inventario esatto, con verifica di rename/delete. Non eliminare manualmente sorgenti o cartelle genitore. |
| F3 | P2 — Packaging web duplicato | [make-release:62](../../progetto/client/scripts/make-release.ts:62), [client-bundle:18](../../progetto/ha-app/client-bundle.mjs:18) | Due assembler frontend/Casa3D/ZIP/manifest con controlli non identici: il primo rilegge lo ZIP col lettore Windows. Condividere una funzione e fixture, mantenendo gli ingressi di rilascio separati. Non rilevata una divergenza attuale degli archivi pubblici. |
| F4 | P2 — Controlli comuni fuori dal comando generale | [package acasystem:20](../../progetto/acasystem/package.json:20), [test UI:23](../../progetto/acasystem/package.json:23), [test copier](../../progetto/acasystem/design/copy-assets.test.mjs) | npm test esegue i tre workspace, ma non i test Node dei confini UI e del copier. Collegare i controlli già esistenti al comando generale; nessuna nuova infrastruttura richiesta. La strict UI è già inclusa anche dal frontend: non è stata osservata una mancanza equivalente di typecheck. |
| F5 | P2 — Dati applicativi nella cartella delle schermate | [useLauncherController:6](../../progetto/acasystem/frontend/src/hooks/launcher/useLauncherController.ts:6), [deviceMemory:15](../../progetto/acasystem/frontend/src/utils/launcher/deviceMemory.ts:15) | Hook/utils importano a runtime catalogo, geometria e classificazione da templates/sheets. Estrarre questi modelli in una sede di dominio interna al frontend quando si interviene sui relativi flussi. Non spostare tutto in ui/, non imporre un nuovo pattern architetturale. |
| F6 | P2 — Contratti API copiati a mano | [@types/devices:3](../../progetto/acasystem/frontend/src/@types/devices.ts:3), [DeviceDto backend:60](../../progetto/acasystem/backend/src/services/devices/deviceService.ts:60), [DevicesApi test:302](../../progetto/acasystem/frontend/src/__tests__/DevicesApi.test.ts:302) | Commento esplicito di copia manuale dei DTO. Test esistenti confrontano chiavi/opzionalità da testo server, ma non tutto il contratto tipi/valori e possono saltare se il server manca (:343/:364). Valutare una fonte contrattuale comune priva di dipendenze server/UI. Nessuna incompatibilità attuale dimostrata dall'audit. |
| F7 | P2 — Sorgente e immagine del rilascio non vincolati allo stesso input | [prepare:54](../../progetto/ha-app/prepare.mjs:54), [raccolta sorgenti:97](../../progetto/ha-app/prepare.mjs:97) | Bundle letti dall'immagine esistente; sorgenti letti dal working tree corrente, anche modificati/nuovi. Sequenza possibile: costruire X, modificare sorgenti, preparare X. Registrare/vincolare revisione o digest dello snapshot di build e del rilascio. Rischio dedotto dal flusso statico, non una discrepanza accertata della release pubblica0.9.33. |
| F8 | P3 — Esclusioni legate ai nomi dei progetti attuali | [.gitignore:24](../../.gitignore:24) | Cache Vitest realmente non ignorata in progetto/node_modules/.vite/vitest/.../results.json. Nuove radici npm non sono coperte automaticamente. Estendere con criteri per tipo di output, senza nascondere sorgenti/fixture intenzionali. Nessun dato della cache letto né file aggiunto a Git. |
| F9 | P3 — Punti di ingresso documentali superati | [README root:3](../../README.md:3), [progetto README:3](../../progetto/README.md:3), [README acasystem:15](../../progetto/acasystem/README.md:15), [architecture:13](../architecture.md:13) | Descrivono futuro codice, banco0.1/due workspace e primitive nel vecchio percorso; le fonti aggiornate sono disperse fra stato e ADR. Pubblicare una mappa attuale e comandi verificati nei punti d'ingresso, conservando sezioni storiche esplicite. Questo report registra il conflitto, senza riscrivere ora fonti estranee. |

Altri punti, a priorità minore: LauncherScreen.tsx ha2474righe e concentra stato pannelli(:424), drag(:600), rimozione/undo(:808) e composizione(:2328); è un hotspot da separare per singoli flussi quando toccati, non un motivo per riscrivere tutti i widget. I test frontend centralizzati sono266file diretti: il numero da solo non dimostra un difetto. L'esperimento VM è conservato in windows/src/engine, ancora incluso dal glob TS ma escluso dal pacchetto e non richiamato da main: separazione futura degli esperimenti utile, nessun avvio VM nascosto rilevato né cancellazione proposta del checkpoint. CSP/MIME/proxy Windows/Android richiedono allineamento manuale: già documentato nei sorgenti, nessuna divergenza attuale rilevata; preferire fixture comuni lasciando native le implementazioni. `build:analyze` usa assegnazione ambiente POSIX nel package frontend: portabilità Windows da correggere in un incarico pertinente, comando non eseguito qui.

## Proposta incrementale

**Proposte, non implementazione autorizzata da U45.** Registrate in ISSUE-133.

1. Consolidamento senza grandi spostamenti: comando generale dei controlli comuni, ignore della cache realmente emersa, generazione pulita degli asset e mappa d'ingresso aggiornata. Definire/provare la provenienza immagine/sorgenti prima di un prossimo rilascio.
2. Risorse/strumenti multipiattaforma in una sede neutra: per esempio `client/shared/` per asset shell e funzione di packaging, con Windows/Android/ha-app come adattatori. Il nome è una proposta esecutiva, non una decisione approvata; non duplicare ui/design.
3. Crescita per flussi: modelli launcher indipendenti dalle schermate e contratti API comuni; separare gradualmente i flussi dell'orchestratore. Preservare struttura a strati, API e comportamenti, con regressioni mirate.

Non raccomandati ora: unificare i due lockfile per principio, trasferire tutto in apps/packages, introdurre Nx/Turborepo, trasformare ogni cartella in un package, cambiare stack o eliminare codice storico. La struttura esistente può crescere con questi consolidamenti mirati; un layout nuovo non risolve da solo i confini dei moduli.

## Verifiche ed evidenze

| Controllo | Procedura effettiva | Esito e limiti |
|---|---|---|
| Stato iniziale | git status --porcelain e git rev-parse HEAD |335righe preesistenti, HEAD5c321b9; backup/rep017/status-before.txt. Nessuna pulizia/reset. |
| Inventario | Node/fs su git ls-files -co --exclude-standard, percorsi deduplicati | inventory.json. File visibili per area:frontend950,backend144,Casa3D419,ui68,design45,Android79,core29,Windows31,ha-app14. Include test/reference/config; non misura complessità o spazio occupato da output ignorati. |
| Import locali | Babel già installato, parsing di741moduli JS/TS di frontend/src583,backend/src97,ui61, esclusi test e d.ts |2701archi locali,2075runtime; nessun ciclo runtime statico o import UI/backend→frontend nel grafo ricostruito. Supportati relativi, alias @ e import() letterali, tipi separati; esclusi require/import dinamici non letterali/esterni/altre radici. Non una garanzia globale di assenza di cicli. Script in memoria, nessun nuovo strumento/grafo persistito. |
| Sorgenti/generati e copie | Letture copier/build, confronto metadati/percorsi file attuali |42asset attesi,Windows43/Android42; residuo README innocuo. Confermati glob output ignorati e aree upstream/override distinte. |
| Ignore | git check-ignore --no-index -v --stdin e git ls-files --others --exclude-standard -- progetto/node_modules | Generati correnti principali ignorati; cache parent realmente visibile. Percorsi futuri usati solo come sonde, nessun file creato. |
| Manifest/build | Letture package/config/Docker/collector e confronto proprietà lock | Due alberi npm coerenti nelle proprietà controllate, UI/design inclusi nel build/collector; problemi F3/F4/F7 statici. Nessun npm ci/build/test/install o rilascio eseguito. |
| Orientamento | Confronto README/architecture con manifest, fonti U44 e sorgenti | F9 confermato; parti storiche non usate per annullare decisioni umane successive. |
| Chiusura documentale | Verifica Node dei sei documenti dell'audit e git diff --check mirato |843collegamenti locali validi, nessun whitespace rilevato. final-review.json conferma42/43/42asset e stato Git fuori documentazione invariato; HEAD immutato. L'uguaglianza dello stato Git non è un confronto byte-per-byte dei sorgenti già sporchi: su di essi sono state eseguite solo letture. |

Limiti: audit di organizzazione/manutenibilità, non benchmark, audit sicurezza completo, prova funzionale o certificazione della distribuzione. Non effettuate pulizie, migrazioni, rinomine, modifiche sorgente, avvii app/VM o installazioni. Le verifiche U44 restano quelle del report006, non sono state ripetute qui.

## Controllo del diff e decisioni

Solo report/stato/indici/diario/evidenze documentali dell'audit. Nessun nuovo ADR accettato: ISSUE-133 conserva le proposte senza promuoverle ad approvate. Diff e collegamenti verificati a chiusura; nessun commit creato.

## Chiusura e punto di ripresa

Audit concluso. La struttura principale è conservabile; le priorità sono i confini e la gestione del generato, non una riscrittura della gerarchia. Nessun incarico attivo residuo. Prossimo lavoro solo su istruzione umana: partire dal consolidamento del punto1; le successive estrazioni sono proposte separate. Stato del codice U44 e checkpoint VM preservati.

**Annotazione 2026-11-02, U46:** l'utente ha riportato i tre punti della proposta incrementale e confermato «andrei a seguire la tua proposta». L'implementazione ora autorizzata è registrata separatamente in [REP-20261102-008](REP-20261102-008-consolidamento-progetti-e-flussi.md); questa scheda conserva l'esito e lo stato proposto al momento dell'audit U45.
