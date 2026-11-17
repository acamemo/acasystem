# Design ACA condiviso fra webapp, distribuzioni e launcher

| Campo | Valore |
|---|---|
| ID | REP-20261102-005 |
| Stato | Completato localmente: fonte comune, integrazioni, build/QA e ZIP/APK verificati; nessuna pubblicazione |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit locale di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta / autorizzazione | U42: «per tutte la parte grafica di tutto il progetto, vogliamo estrarre il css neumorphism usato nella webapp e lo condividiamo con tutte le dist, i launcher e le cose che andremo a creare per avere il design uniformato su tutti i workspaces?» |

## Obiettivo e perimetro

Estrarre la grafica ACA esistente in una fonte comune fuori dal workspace frontend, consumata da webapp, shell Windows/Android e interfacce Casa 3D. Preservare palette, tipografia e materiali della webapp; uniformare il look dei controlli nelle shell usando le primitive comuni, lasciando layout e logica locali. Predisporre un entrypoint riusabile dalle future interfacce HTML/CSS senza implementarle ora.

Fonte scelta: `progetto/acasystem/design/`, condivisa fra workspace e inclusa nel contesto Docker e nei sorgenti dell'app esistenti. Nessun nuovo package manager, libreria, framework o font. Nessuna riscrittura dei widget, migrazione React aggiuntiva, funzione applicativa, schermata boot HAOS, modifica alle reference/upstream originali, avvio VM o pubblicazione assegnata. Il CSS richiede un renderer web; non trasforma la console HAOS in un'interfaccia grafica.

Git contiene numerose modifiche precedenti, anche non tracciate: preservarle. Snapshot mirato di fonti grafiche/configurazioni e artefatti locali prima delle modifiche sotto `backup/rep015/`; nessun commit locale richiesto.

## Criteri di completamento

1. Unica fonte per font/licenza, token ACA/Kit2, materiali neumorfici, tipografia e primitive; import webapp coerenti e copie client generate dalla medesima fonte.
2. Shell Windows/Android consumano i controlli comuni e mantengono localmente soltanto composizione e adattamenti della piattaforma. Flussi IP/QR, accessibilità e funzionamento offline preservati.
3. Casa 3D riceve font/colori/materiali UI tramite variabili condivise anche nello Shadow DOM; geometria, Three.js, scene e originali terzi invariati. Derivate tramite workflow override previsto.
4. Build frontend, client, Casa 3D e contesto Docker includono CSS/font senza percorsi esterni mancanti. Controlli pertinenti e verifiche visive desktop/mobile; nessun collaudo Android/iPhone fisico inventato.
5. Documentare struttura/import, proprietà delle primitive, copie generate, verifiche e limiti. Artefatti locali distinti dalle consegne/pubblicazioni precedenti.

## Avanzamento e modifiche

Audit iniziale: `frontend/src/design` con font/reset/token, tema ACA e skin Kit2; la skin dipende dai materiali ACA. Client copiavano solo font/reset/token e duplicavano il look in shell.css. Le primitive React sono già distinte dai componenti di pagina: non serve spostarle in un nuovo package. Casa 3D è un bundle Lit con Shadow DOM, senza pagina standalone; le variabili UI locali richiedono un adapter. Percorsi e contratto di estrazione coordinati fra le tre porzioni.

- **Fonte comune:** quattordici CSS originali estratti e nuovo ingresso index.css (quindici in totale), ventuno WOFF2 e licenza Inter. Ordine e valori originali conservati; equivalenza SHA dopo normalizzazione dei soli import e rimozione delle due nuove dichiarazioni neutrali `--aca-color-scheme` light/dark. I vecchi quattordici percorsi sono shim. Nessuna modifica a primitive React, main o palette. Linter tipografia adattato alla nuova collocazione CSS; copertura colori equivalente.
- **Distribuzioni:** copier comune in design/copy-assets.mjs e facciata client conservata. Staging completo con import relativi/font locali autonomi, senza riscritture dei token. Markup delle shell con gli stessi MaterialLayers e classi di Button/Field/Surface; CSS locale per layout/viste/spinner. Label native conservano click/focus; colore dello schema usa il token comune. Renderer JS, ID e funzioni IP/QR invariati.
- **Casa 3D:** override e registro di rigenerazione per styles.ts/test, derivati generati dal workflow esistente. Token UI, font, accento, superfici/raggi/focus/ombre ereditati da ACA; fallback standalone verificati identici. Scena, layout, Three.js, input/touch e originali upstream preservati; i pannelli del canvas mantengono il materiale piatto previsto.
- **Build:** Dockerfile include design prima del frontend; fonte dentro il perimetro acasystem già raccolto dai sorgenti della release. Nessun cambio a package/dependency manager o tecnologia. Build e artefatti nuovi separati dalle consegne precedenti, nessun deploy.

## Verifiche ed evidenze

| Controllo effettivo | Risultato | Evidenze e limiti |
|---|---|---|
| Copie CSS/font autonome | **1/1** test Node, tutti gli import/url locali risolti anche in percorso con spazi | `node --test progetto/acasystem/design/copy-assets.test.mjs`; nessun download di font |
| Equivalenza della fonte estratta | Quattordici CSS e ventuno font/licenza equivalenti salvo modifiche dichiarate | `frontend-design-extraction.json`, manifest prima dell'intervento; componenti di pagina/React non riscritti |
| Frontend CSS/primitive | **14 file / 222 test** superati | `frontend-design-tests.log`; letture CSS dei test aggiornate verso la fonte canonica |
| Tipografia/colori | **644/566 file, zero violazioni** | `frontend-design-typography.log`, `frontend-design-theme-colors.log`; non dedurre collaudo completo da linter |
| Webapp costruita prima/dopo | **Quattro viste**: light/dark a dimensioni desktop/mobile, PNG byte-identici e stili effettivi identici | `web-baseline/`, `web-current/`, `web-screenshot-hashes.json`; status API simulato owner-required, nessun contatto HA/account creato |
| Client unit/build | Windows **99/99**, Android web **21/21**, build entrambe riuscite | `client-checks.json`; nessuna nuova verifica fisica Android |
| Client smoke funzionale | **8/8** passaggi IP/cache/cambio centrale/vecchi flag | Fonte compilata, centrale simulata; nessuna VM avviata |
| Materiali shell vs webapp | **24 casi** su Windows/Android, tre modalità e quattro stati, con reali Button/Field/Surface React via SSR | `client-layout/results.json`; font Inter offline, zero richieste esterne/overflow, click superficie campo e nomi accessibili verificati. Viewport effettivi1281×802 e390×846 |
| Casa 3D source/bridge | Rigenerazione, typecheck, marchio e **3/3 test** riusciti | `casa3d-*.log`, integrità205file upstream; test dei fallback e dei riferimenti canonici |
| Shadow DOM browser | **30 confronti** computed, Lit/Shadow DOM reali, tre combinazioni tema/accento | `shadowdom-qa/result.json`, tre PNG; Inter effettivamente caricato. Fixture degli stili reali, senza viewer/WebGL/account |
| Build frontend/Casa 3D/Docker | Riuscite, strict e marchio inclusi; sei bundle Casa3D nei budget | `frontend-build.log`, `casa3d-build.log`, `docker-build.log`; immagine soltanto locale |
| Artefatti Windows/APK | ZIP e assembleDebug riusciti; **37 asset per archivio** confrontati per SHA alla fonte | `final-artifacts.json`; nessun engine/VDI nel nuovo ZIP, nessuna installazione eseguita |

Comandi principali: `npm run build -w frontend`, `npm run build -w casa3d` dalla cartella acasystem con ACASYSTEM_VERSION0.9.33; `npm run build -w windows`, `npm run build -w android`, `npm run apk:debug -w android` da client; smoke/layout con `node e2e/smoke.check.mjs` e `node e2e/shell-layout.check.mjs` da windows. Docker: `docker build --provenance=false --platform linux/amd64 --build-arg ACASYSTEM_VERSION=0.9.33 -t aca-system:design-shared-local progetto/acasystem`. Packaging da windows: `node ../node_modules/electron-builder/cli.js --win zip --x64 --publish never --config.asar=false --config.win.signAndEditExecutable=false --config.directories.output=release/design-condiviso-20261102 --config.win.artifactName=Acasystem-design-condiviso-win-x64.zip`.

Correzioni dei soli helper/test: primo tentativo APK dalla radice client senza `-w android` non trovava lo script, poi corretto; QA web iniziale senza directory profilo/navigazione iniziale e con selettore `.aca-btn` inesistente corretta a `button.aca-m`, poi quattro confronti riusciti. Fixture SSR client: tentativo con API transpileModule assente in TypeScript7 ritirato, usato esbuild già presente; click nel test spostato dall'angolo esterno della pillola al padding visibile. Nessuna nuova dipendenza. La sola successiva riga color-scheme delle shell ha comportato nuova build/E2E e APK finale; unit/smoke non ripetuti perché la logica era invariata. Avvisi su chunk frontend oltre500KB, deprecazioni Gradle e packaging senza asar/firma conservati come limiti, senza aggiornamenti estranei.

## Materiali locali

- [ZIP Windows](../../progetto/client/windows/release/design-condiviso-20261102/Acasystem-design-condiviso-win-x64.zip): **153.515.441 byte**, SHA **d375decaf2ccda7ff5266fd662c19db0259d7e1c480512ffc0f26c4715551df8**; runtime Electron originale, risorse non modificate/firma non aggiunta, cartella win-unpacked accanto. Nessuna installazione o nuovo NSIS.
- [APK debug](../../progetto/client/android/android/app/build/outputs/apk/debug/app-debug.apk): **7.685.563 byte**, SHA **fdb1fa013c9731dfadc7b7c8d2afc3404f6385f699ae7104b5f3bea30912f553**; vecchio APK conservato in backup/rep015/previous-app-debug.apk.
- Immagine locale **aca-system:design-shared-local**, digest **sha256:f41da64f48514120bec97c9ec0e8e3359c511ee69d20681cffd39fdfdf958cd7**. Non inviata a registri né avviata come servizio.

Tutte le evidenze sono sotto backup/rep015, escluse da Git. Nessuna password/token o dato di una casa acquisiti durante questa QA.

## Chiusura e punto di ripresa

Lotto U42 completato localmente: [ADR-0032](../decisions/ADR-0032-design-condiviso-workspaces.md), [guida d'uso e materiali](../riprogettazione/blocchi/02-design-aca-condiviso.md), fonti/stato/indici aggiornati. Ogni nuova interfaccia HTML può usare la fonte e il copier; CSS dei componenti specifici e funzioni restano nei workspace. La webapp conserva l'aspetto nelle viste confrontate, e le shell ne usano ora gli stessi materiali.

Restano collaudo su Android/iPhone fisici e viewer3D completo su hardware; nessuna affermazione di prodotto collaudato in generale. Il tema comune non implementa una finestra boot su HAOS. Nessuna pubblicazione, installazione, avvio VM, cambio dipendenze o commit locale eseguiti. Nessun ulteriore lavoro avviato automaticamente.

Audit indipendente finale senza difetti bloccanti: quattordici CSS/fonte e ventidue file font/licenza coerenti con il checkpoint; settantaquattro copie generate dei due client identiche al canonico; quarantotto import/fontURL risolti; quaranta file design compresi dal raccoglitore sorgenti esistente. Quattro PNG prima/dopo ricontrollati direttamente per SHA. Casa3D condivide palette/font/token tramite adapter mantenendo geometrie, scale e pesi specifici: non è una conversione integrale del viewer alle primitive React. La prova Lit degli stili resta distinta dal viewer WebGL completo.

Chiusura documentale: diciassette file e 1.231 destinazioni locali controllati, nessun nuovo collegamento mancante o conflitto; resta LEGGIMI → WidgetTray già assente prima dell'incarico. Diff pertinente superato con soli avvisi CRLF. ZIP checkpoint VM ricalcolato identico a09a8e147…eded18, HEAD locale invariato e nessuna VM running. Evidenza `backup/rep015/doc-final-check.json`. Helper/browser QA chiusi; nessun servizio nuovo lasciato in esecuzione.
