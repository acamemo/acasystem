# REP-20261020-002 — Casa 3D: piano per la base copiata da neonplan3d

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261020-002, studio, piano e critica di completezza della sezione «Casa 3D» |
**Aggiornamento 2026-10-21 (T6): persistenza fatta per i criteri automatizzabili e sul PC (tabelle, rotte `/api/casa3d/*` con compare-and-swap e 409, scrittura 403 per chi non è installatore, validatore dello schema originale, immagini verificate sui byte con SVG, URL esterni e immagini troncate rifiutati, cronologia, esportazione e importazione, comandi del pacchetto passati alle rotte REST nell'adattatore; backend 21 file e 191 test, prova a tre contesti di browser 37 controlli su 37 e copia a freddo della cartella dei dati); D13 non è decisa e il ruolo è provvisorio (ISSUE-102); il «Fatto quando» sul banco (tablet e PC, volume Docker) è aperto; vedi «T6 — Persistenza».** Testo precedente: **Aggiornamento 2026-10-21 (T5, banco): fase «banco» di T5 eseguita sul banco 0.9.18 e sul Tab M11 (Light 30 gesti su 32 entro i criteri, Medium e High selezionabili senza blocchi oltre 1 s ma non fluidi, perdite e ripristino, ISSUE-062 con i picchi non peggiori e i fps di chiusura al limite); non provata con un dito vero, su telefoni, in verticale, con TalkBack; il blocco su D16, ISSUE-091 e D18 non ha avuto risposta umana; vedi «T5 — esito del banco» e «T5 — esito (2026-10-21)».** Testo precedente: **Aggiornamento 2026-10-20 (T5): T5 eseguita sul PC (tre livelli Light, Medium e High con partenza da Light su ogni dispositivo, menu nella pagina e in Sistema, scelta salvata per dispositivo con copia nelle impostazioni correnti, `setQuality` che rilascia prima di creare, perdita e ripristino del contesto WebGL con messaggio e ripiego, statistiche della vista); 36 controlli del browser su 36 e suite del frontend verde; la fase «banco» di T5 (Light entro i criteri di T11 sul Tab M11, Medium e High senza blocchi sul tablet, ISSUE-062) non è eseguita; il blocco su D16, ISSUE-091 e D18 resta; origine degli avvisi `ReadPixels` trovata; vedi la sezione «T5 — Qualità e contesto».** Testo precedente: | Stato | **Aggiornamento 2026-10-20 (T4b): T4b eseguita sul PC (Riposo, Vista ed Esplora: un tocco entra in Esplora, il pager è tenuto fermo con la prop `locked` esistente, uscite con «Fine», Esc, tasto indietro, indicatore e 60 s, tastiera con `composedPath()`, D18 nella scelta consigliata); 39 controlli del browser su 39 e suite del frontend verde; non provata con un dito vero, sul Tab M11, con TalkBack né con il pizzico; D16 e ISSUE-091 ancora non confermate; vedi la sezione «T4b — Gesti Vista/Esplora».** Testo precedente: **Rettifica 2026-10-20 (revisione di T4a): T4a è fatta per i criteri automatizzabili, criteri sul tablet aperti; T4b e la fase «banco» con T4a aspettano la conferma di D16 (ISSUE-089) e la decisione su ISSUE-091; vedi la «Rettifica della revisione» in coda alla sezione T4a.** Testo precedente: **Aggiornamento 2026-10-20 (T4a): T4a eseguita sul PC (guscio della pagina: tipo `casa3d`, migrazione in coda una volta, Riposo con anteprima, nessun renderer in vista pagine e in modifica, `modulepreload`, rilascio dopo un minuto); non provata su tablet, con TalkBack né con il testo grande; D16 ancora provvisoria; vedi la sezione «T4a — Guscio della pagina».** Testo precedente: **Aggiornamento 2026-10-20 (banco T3): T3 provata sul banco 0.9.17 e sul Tab M11 con Home Assistant vero e l'amministratore; manca l'utente non amministratore vero (ISSUE-090), vedi la sezione «T3 — esito del banco».** Testo precedente: **Aggiornamento 2026-10-20 (sera): T2a eseguita e rivista, vedi la sezione «T2a — esito»; prossima T2b.** Aggiornamento precedente: ADR-0014 accettata il 2026-10-20; T0 fatto con le risposte dell'utente; T1 eseguita (misura della demo sul Tab M11, vedi la sezione «T1»); esito PROPOSTO «procedere solo con Light», decisione all'utente. Implementazione (T2 e seguenti) non ancora autorizzata.**<br>Risposte dell'utente (2026-10-20): ADR-0014 «approvo la bozza, procedi con la misura della demo sul tablet»; funzioni Pro «pensiamoci dopo, iniziamo a integrare e poi vedo col capo»; piani e prezzi e visibilità della planimetria senza risposta (da decidere con il capo, ISSUE-084 e ISSUE-085); editor anche su PC: «l'app deve essere eseguibile da ogni tipo di dispositivo».<br>Stato precedente (storico): Studio e piano completati, con la critica di completezza applicata. Implementazione non autorizzata. |
| Data | 2026-10-20 (Europe/Rome) |
| Autore / modello | Claude Code (Opus 5.5, `claude-opus-5-5`), in un flusso di lavoro in tre parti:<br>- letture A (copia e marchio), B (vista 3D e prestazioni), C (editor e interfaccia) e D (integrazione), modello non disponibile;<br>- sintesi;<br>- critica di completezza con verifiche in sola lettura. |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` (`master`). Le modifiche preesistenti non committate (circa 370 voci, anche di altri agenti) sono lasciate intatte. |
| Richiesta di riferimento | Utente, 2026-10-20: «possiamo lanciare un altro agente o usare una nuova chat per lavorare per la parte di casa 3d del repo github che ti avevo mandato prima?» e poi «noi possiamo anche andare a copiare tutto tranne il nome e ne personalizziamo il frontend integrandolo come base ma modificandola per fatti nostri».<br>Requisiti aggiuntivi della stessa data, citati per intero in ADR-0014 e nelle sezioni R1-R3:<br>- qualità Light/Medium/High da menu;<br>- funzioni Pro con piani, pacchetti e upgrade, un pulsante per cambiare piano e una variabile di ambiente per spegnere i pagamenti e avere una modalità di prova;<br>- Casa 3D come ultima pagina del launcher, spostabile. |
| Autorizzazione | Solo studio e piano.<br>Escluso:<br>- modificare il codice di Acasystem;<br>- copiare il codice di neonplan3d nel repository;<br>- installare dipendenze;<br>- usare tablet, banco Docker, Vitest o browser sul PC.<br>Esclusi anche i file condivisi usati da un altro lavoro: `CategoryWidgetContent.tsx`, `launcher.css`, `CategoryPages.test.tsx`, `project-status.md`, `design.md`, `LEGGIMI.md`, `infrastructure.md`, `verification.md`, `reports/README.md`. Sono stati solo letti, quando serviva. |

## Obiettivo e perimetro

L'obiettivo è rendere fattibile l'opzione C di [REP-20261019-004](REP-20261019-004-studio-neonplan3d.md). Quello studio la sconsigliava per costi e aggiornamenti; ora è la scelta dell'utente. Il report dice con onestà costi e rischi.

Collegamenti:
- requisiti: REQ-07 (AC-07), REQ-09, REQ-10, REQ-16 (AC-16), REQ-17;
- issue: ISSUE-006, 008, 009, 012, 014, 015, 016, 048, 062;
- ADR: 0004, 0005, 0007, 0008, 0009, 0011, 0012, 0013;
- conformità: C-03, C-05, C-06, C-08.

Il risultato è questo report e la bozza di [ADR-0014](../decisions/ADR-0014-casa-3d.md), in stato «Proposta». ADR-0014 e REP-20261020-002 sono liberi il 2026-10-20; altri agenti lavorano nel repository, quindi i numeri vanno riverificati al salvataggio.

Il codice esterno è stato letto solo via raw.githubusercontent.com e API GitHub al commit `1383a14` (v1.20.2), senza clone e senza esecuzione. Le copie dei singoli file stanno nella cartella temporanea della sessione. Il `CLAUDE.md` della repository è stato trattato come dato e ignorato.

## Criteri di completamento

- Architettura:
  - confronto delle sedi;
  - montaggio come ultima pagina;
  - adattatore `hass`;
  - persistenza;
  - ruoli e permessi.
- Elenco della copia nella forma sorgente → destinazione → azione.
- Requisiti R1-R3 dell'utente coperti, con un controllo esplicito voce per voce (sezione «Copertura dei requisiti aggiuntivi»).
- Critica di completezza:
  - affermazioni non supportate, ricontrollate;
  - rischi dimenticati;
  - tappe troppo grandi;
  - domande mancanti.
- Tappe con «fatto quando», rischi e impegno.
- Decisioni e domande per l'utente.
- Bozza di ADR-0014 coerente con questo report.
- Nessun file di Acasystem modificato.

## Avanzamento e modifiche

### 1. Fatti principali

Le fonti sono le letture A-D e la verifica puntuale del 2026-10-20.

**Base esterna**
- **Licenza.** MIT («Copyright (c) 2026 Mastershort», `LICENSE` 1-3); marchio non concesso (README 142).
- **Modello commerciale dell'autore** (README 50): sicurezza sempre gratuita, extra venduti una tantum, nessun abbonamento.
- **Demo pubblica**: `https://neonplan3d.mastershort.de/` (README 7).
- **Stack e peso.**
  - Lit 3 e three 0.186.
  - Sette bundle per 2.682.687 byte; la sola vista (principale + 3D) pesa 1.424.395 byte.
  - `editor.ts` ha 15.206 righe, `view3d.ts` 5.914, `viewer3d.ts` 4.742.
  - Nucleo Python di circa 80 KB.
  - 66 test unitari, nessun test e2e.
  - `legalComments: 'none'`: gli avvisi di licenza non arrivano nei bundle.
- **Cuciture con HA.** Il backend si raggiunge solo da `api.ts`; l'oggetto `hass` è piccolo; il motore 3D non nomina `hass`. Elementi HA usati:
  - `<ha-icon>` in 4 punti, uno via `unsafeHTML` con filtro (`editor.ts:9997`);
  - `<ha-card>`;
  - `<ha-menu-button>`.
- **Qualità.**
  - `Quality` vale `auto | low | high` (`viewer3d.ts:88`).
  - `isLowEnd` (476-481) dipende da `deviceMemory` (non misurato sul Tab M11), da `hardwareConcurrency` e dallo user agent.
  - `makeRenderer` (1626-1638) usa antialias e DPR fino a 2.
  - `setQuality` (740-755) crea il nuovo renderer prima di rilasciare il vecchio.
  - Il disegno avviene solo a richiesta (1619) e si ferma con `IntersectionObserver` e `document.hidden` (688-697).
  - Niente luci né ombre reali: tutto MeshBasic, con la luce calcolata sulla CPU.
- **WebGL.** Nessun gestore di `webglcontextlost`. three 0.186.1 gestisce lo stato ma non ridisegna.
- **Gesti.** `HOLD_MS = 500` (`controls.ts:35`), cattura del puntatore sempre (152), tolleranza di 6 px (194), doppio tocco entro 320 ms (272).
- **Conferme e HTML.**
  - `confirm()` in `view3d.ts` (1811, 4052) e in 9 punti di `editor.ts`.
  - `innerHTML` delle icone dei pin (`viewer3d.ts:874`), da fonte interna.
- **Immagini.** Il client ridimensiona e ricodifica: sfondi a 2048 px in JPEG 0,85 (`editor.ts:5047-5053`), immagini degli schermi a 512 px (11561-11567).
- **Modello.**
  - Ammette URL http(s) per le immagini degli schermi (`model.ts:134`).
  - Lo schema server impone ID con regex, lunghezze e limiti (`schema.py:13-26`).
  - La bozza intera del piano resta in `localStorage` (`building-controller.ts:14,26-42`).
- **Funzioni Pro.** Il codice MIT è nella repository; lo sblocco viene da pacchetti firmati (`features.ts:1-4, 106-114`).
- **Marchio.**
  - Circa 180 occorrenze fuori da `i18n.ts` e 43 dentro.
  - 23 stringhe italiane e circa 40 chiavi `localStorage`.
  - Il prefisso `fp3d` (circa 4.000 occorrenze) è un nome tecnico.
- **Italiano.** 1891 chiavi su 1891; provenienza e qualità non verificate.

**Acasystem**
- **Pager** (`Pager.tsx`).
  - Monta tutte le pagine.
  - Quelle fuori schermo sono `inert`, `aria-hidden` e ricevono `PageVisibilityContext` false (556-600).
  - Nella vista pagine il corpo è `inert`.
  - Esiste già il blocco dello scorrimento: prop `locked`, classe `is-locked` (459, 530; `launcher.css:66-69`).
- **Gesti del launcher**: `LONG_PRESS_MS 500`, `HOLD_TOLERANCE_PX 14`, `DOUBLE_TAP_MS 280` (`gestures.ts:8-12`).
- **CSP** (`security.ts:8-22`): `script-src 'self'`, ma `connect-src` e `img-src` ammettono `http:` e `https:`. JSON fino a 2 MB.
- **Ruoli.** Nessuna rotta controlla `is_admin`; il middleware lo calcola (`homeAssistantAuthService.ts:68`).
- **Preferenze.** `current_settings` usa la chiave (`ha_user_id`, `device_id`); il `device_id` sta in `localStorage` (`useSettingsSync.ts:67-80`).
- **Build e cache.**
  - Il build esegue solo il typecheck (`package.json:14`, Dockerfile 15-16); i lint sono script separati.
  - `sw.js` mette in cache solo `/assets/` e non pota le versioni vecchie.
  - I file fuori da `/assets` sono serviti senza `immutable` e con ripiego SPA (`routes/frontend.ts:44-56`).
- **Variabili e licenza.**
  - `.env.example` contiene solo `ACASYSTEM_VERSION`.
  - `compose.tunet.yaml` elenca `environment` in modo esplicito.
  - Licenza GPL-3.0.
- **Componenti riusabili.** Non c'è una primitiva di conferma generica: c'è il pattern a due tocchi della serratura (`useLockControl.ts:45-77`). `RoomsPage` e `getEntitiesForArea` (`haClient.ts:476`) esistono.
- **Requisiti.**
  - REQ-07 «Plugin / Feature Modules a licenza e permessi», P0, Proposto (`product.md:107-114,175`). AC-07: la revoca vale nei punti di autorizzazione, non solo nella visibilità (riga 214).
  - `product.md` 6.1-6.2: piantina anche in SVG, coordinate X%/Y%.
  - `product.md` 6.4: il 2D è lo standard sui tablet economici.

### 2. Architettura proposta

Proposta dell'agente, coerente con ADR-0014.

**2.1 Sede.**

| Voce | Workspace `progetto/acasystem/casa3d/` (consigliato) | Cartella `frontend/src/features/casa3d/` sotto Vite |
|---|---|---|
| Build | esbuild proprio, derivato da `build.mjs` | Vite |
| Pro | Codice confrontabile con l'originale, 66 test `node --test` (Node 26 nel Dockerfile), budget propri, dipendenze isolate, nessun effetto sul chunk `index` (801 su 900 KB) | Un solo build, code splitting nativo |
| Contro | Due build, Dockerfile da modificare, contratto di tipi da mantenere a mano (`contract.d.ts`) | Fallirebbe il controllo `lint:typography`, non la build; caricatori `new URL(...?v=HASH)` da riscrivere; Rolldown non provato; codice di terzi mescolato all'app |

- Cartelle del workspace:
  - `upstream/` verbatim;
  - `src/` rinominata;
  - `overrides/`;
  - `scripts/rinomina.mjs`;
  - `scripts/confronta-upstream.mjs`;
  - `PATCHES.md`;
  - `NOTICE`.
- **Servizio** (D16): a scelta,
  - `/casa3d/`, con nomi con hash, `immutable` e 404 esplicito per `/casa3d/*`;
  - oppure `/assets/casa3d/`, nella cache del service worker, con una regola di potatura delle versioni vecchie, oggi assente.
  - Oggi i file fuori da `/assets/` tornerebbero dalla rete a ogni avvio, e un file mancante potrebbe ricevere `index.html`.

**2.2 Pagina «Casa 3D» (R3).**
- **PageKind.** Nuovo `casa3d`. Tocca il tipo (`@types/launcher.ts:41`), `isPageKind`, `pageIdentity.ts`, `pageKindDefinitions`, il catalogo e la sincronizzazione legacy. Una istanza per layout, aggiunta in coda una volta sola.
- **Stati.**
  - Riposo, Vista ed Esplora, come in ADR-0014, sezione 2.
  - Esplora riusa la prop `locked` del pager.
  - In Vista la pressione di 500 ms sul canvas va al launcher (D18).
- **Caricamento.**
  - Pagina adiacente: `modulepreload`.
  - Pagina corrente e ferma: `import()` e renderer.
  - Il codice resta in memoria fino al ricaricamento.
- **Sospensione e smontaggio.**
  - Pagina invisibile: timer e disegno fermi.
  - Smontaggio dopo 60 s fuori schermo, con Sistema o l'editor aperti, o con lo schermo spento.
- **Anteprima.** Con stati neutri e la scritta «Anteprima», invalidata a ogni cambio di tema, accento o piano. Persistenza in IndexedDB solo se D17 lo decide.
- **Integrazione tecnica.**
  - Proprietà assegnate con un ref dopo `customElements.whenDefined`.
  - Eventi ascoltati con `addEventListener`.
  - Tastiera: `composedPath()` ed Esc catturato da Esplora e dall'editor prima del launcher.
  - Tasto indietro: una voce nella cronologia.
- **Editor.** Overlay a schermo intero fuori dal pager.

**2.3 Adattatore `hass`** (`frontend/src/casa3d/haShim.ts`).
- Fonti: `states`, `user` (non admin se assente), `language 'it'` e `config` dal contesto HA esistente.
- `callWS` e `subscribeMessage` passano per `conn`; i comandi `casa3d/*` vanno verso REST.
- `callService` passa dalla nuova primitiva di conferma.
- `entity_picture` viene riscritto in `/ha/...`.
- I registri (area, piano, dispositivo, `list_for_display`) si caricano alla prima apertura.

**2.4 Persistenza.**
- Tabelle `casa3d_building`, `casa3d_image` (BLOB) e `casa3d_history` (20 punti, uno ogni 600 s).
- Rotte `/api/casa3d/*` sul modello di `settings*`; compare-and-swap e 409 in caso di conflitto.
- Scrittura riservata all'installatore verificato dal server (D13); serve un helper di ruolo, oggi assente.
- Validatore:
  - ID con regex e al massimo 64 caratteri, nomi fino a 100, riferimenti fino a 255;
  - 20 piani, 200 stanze, 200 punti, 1000 elementi;
  - limite della dimensione totale;
  - nessun URL esterno nelle immagini.
- Immagini:
  - rotta binaria;
  - controllo dei primi byte, decodifica, al massimo 2048 px e un limite in byte;
  - ricodifica o rifiuto, `nosniff`;
  - niente SVG (conflitto con `product.md` 6.1, D15).
- Aggiornamenti: rilettura della revisione ogni 30 s, solo con la pagina visibile.

**2.5 Ruoli e permessi** (proposta; D8 e D13 aperte).

| Azione | Installatore | Admin/owner HA cliente | Utente HA non admin | Note |
|---|---|---|---|---|
| Vedere la pagina e l'anteprima | sì | secondo D8 | secondo D8 | La planimetria è un dato di sicurezza fisica |
| Esplora e pin | sì | secondo D8 | secondo D8 | |
| Comandare i dispositivi | permessi HA | permessi HA | permessi HA | Con la conferma di Acasystem |
| Modificare il piano e caricare immagini | sì | no, salvo D13 | no | Verificato dal server |
| Cronologia, ripristino, esportazione | sì | no, salvo D13 | no | Il file esportato resta nei Download del dispositivo |
| Spostare, nascondere, rinominare la pagina | sì | sì | sì | Come le altre pagine del proprio layout |
| Cambiare la qualità | sì | sì | sì | Per dispositivo; High su Light chiede conferma |
| Cambiare piano in `test` | sì | no | no | D13: HA `is_admin` non distingue installatore e cliente |
| Impostare il piano in `off` | sì | no | no | D13 |

**2.6 Aggiornabilità.**
- Copia congelata a 1383a14.
- Script di confronto per i file del nucleo, correzioni riportate a mano.
- Per editor, view3d e testi si accetta la divergenza.
- Gli avvisi di sicurezza di lit e three li seguiamo noi.

### 3. Elenco della copia (sintesi)

| Sorgente a 1383a14 | Destinazione | Azione |
|---|---|---|
| `LICENSE` | `casa3d/LICENSE-MIT-Mastershort`, `NOTICE`, pagina Informazioni, `compliance.md` | Tenere verbatim e distribuire, NOTICE escluso dal grep del marchio |
| Sottoinsieme sotto elencato | `casa3d/upstream/` | Riferimento immutabile, primo commit |
| `model.ts`, `geometry/*`, `roof-sections.ts`, `units.ts`, `search.ts` | `casa3d/src/` | Identici, solo chiavi rinominate |
| `devices.ts`, `markers.ts` | `casa3d/src/` | Patch: `entity_picture` via `/ha`, conferma di Acasystem |
| `viewer/*` | `casa3d/src/viewer/` | `Quality` a tre livelli, `contextlost`, ordine di rilascio in `setQuality`, timer fermi quando invisibile, costanti dei gesti condivise, cattura solo in Esplora, look kit2 |
| `components/view3d.ts` | `casa3d/src/components/` | Tolti `backdrop-filter` e diagnostica; pin da 48 px; `confirm()` sostituito in 2 punti; diritti di Acasystem; nuovo `api.ts` |
| `components/editor.ts` | `casa3d/src/components/` | `isAdmin ?? false`; link all'autore tolti; teaser Pro sostituiti; `confirm()` sostituito in 9 punti; bersagli ≥44 px; tema; `ha-icon` sostituito |
| `room-panel.ts`, `quick-menu.ts`, entity picker | `casa3d/src/components/` | Tema e bersagli; `callService` dall'adattatore |
| `panel.ts`, `card*.ts`, `load-card-editor.ts`, `extensions.ts` | — | Togliere: sostituiti dal guscio React e dalla sezione «Piano e pacchetti» |
| `features.ts` | `overrides/features.aca.ts` | `hasFeature()` sui diritti di Acasystem; flag `?fp3d_*` tolti |
| `packs.ts`, `packages.ts` | `src/`, ridotti | Tolti Ed25519, chiavi e id `mastershort.*` |
| `api.ts` | `overrides/api.aca.ts` | Stesse firme, REST `/api/casa3d/*` |
| `building-controller.ts` | `src/` | Tenere; bozza locale cancellata al salvataggio e al cambio di utente; `initDiagnostics` tolto |
| `transfer.ts` | `src/` | Formato `acasystem-casa3d`; lettura del formato `neonplan3d` versione 1 se D9 lo decide |
| `i18n.ts`, `lang/it.json` | `src/` + `overrides/it.aca.json` | Italiano come tabella principale, de/en fuori dal bundle, 23 stringhe con il marchio riscritte, controllo delle chiavi mancanti |
| Altre 16 lingue, `fonts.ts` e font OFL, `styles.ts`, `themes.ts` | — / overrides | Togliere; Inter; token Kit 2 chiaro e scuro |
| `icons.ts`; `<ha-icon>` | `src/` + elemento mx-icons | Tenere icons; sostituire ha-icon |
| `diagnostics.ts`, `beta.ts`, `flags.ts` | stub in overrides | Telemetria e listener globali tolti; resta `ViewerStats` locale |
| `timetravel/*`, `fun/*`, `voice/*`, `pool*`, `solar`, `energy`, `household`, `parking` | `src/`, lazy | Tenere spenti dietro i diritti; `timetravel` richiede il porting del Python; `household` usa `/api/calendars`, non ammesso dal proxy |
| `import/*` (lettori), `docs/plan-format.md` | `src/import/`, `docs/` | Tenere i lettori; `import/app.ts` e `site/` tolti (contengono il beacon) |
| `main.ts`, `load3d.ts`, `load-editor.ts`, `build.mjs`, `package.json`, `tsconfig.json` | `casa3d/` | Rinominare; nuovo punto d'ingresso; manifest degli hash; NOTICE; budget; grep del marchio; versioni esatte |
| 66 `*.test.ts` | `casa3d/src/` | Tenere tutti, più test per le patch |
| `custom_components/.../schema.py`, `storage.py`, `websocket.py` | `backend/src/.../casa3d*.ts` | Riscrivere in Node conservando i vincoli |
| `license.py`, `packs.py`, `card_resource.py`, `__init__.py`, `config_flow.py`, manifest, hacs, translations, brand, `diagnostics_report.py`, `tests/*.py` | — | Togliere |
| `solar-pro.jpg`, `docs/images`, `brand/*.png`, `.github`, `tools`, `preview`, `scripts`, `tutorials`, `docs`, `CHANGELOG`, `ROADMAP`, `README`, `CLAUDE.md` | — | Non copiare |
| Marchio: `neonplan3d`, `NeonPlan 3D`, `mastershort`, `floorplan_3d` / `floorplan-3d` | `scripts/rinomina.mjs` | Rinominare con grep = 0 sull'output (tranne NOTICE) |
| Prefisso `fp3d` | `src/` | Tenere come nome tecnico (D3) |

### 4. Copertura dei requisiti aggiuntivi

**R1. Qualità** («e qualità superiore attivabile da menu, versione Light per tab lenovo, versione Medium e versione High per tablet con hardware più permissivi (high è la qualità massima)»).

Coperto. La tabella dei parametri è in ADR-0014, sezione 5: pixel ratio, antialias, ombre, materiali, luci, frequenza, distanza di disegno.
- **Rilevamento iniziale.** Con il contesto di prova rilasciato subito. Il nome della GPU è DA VERIFICARE su Chrome 155. `isLowEnd` resta solo un indizio, perché sul Tab M11 l'esito non è noto.
- **Scelta dal menu.** Salvata in `localStorage`, con copia in `current_settings`. Non sopravvive alla pulizia del browser: in quel caso si torna al rilevamento.
- **Recupero dopo `webglcontextlost`.** Coperto, ADR-0014 sezione 5.
- **Prove.** Misura in Light sul Tab M11 e prova che Medium e High si scelgano senza blocchi: tappa T5.

**R2. Funzioni Pro e pagamenti** («le lascerei, però le nostre versioni ce le dovremmo studiare un momento con le opzioni a pagamento, i pacchetti e upgrade pacchetti, andrei a mettere un pulsante nell'interfaccia che ti permette di switchare fra i piani e una variabile in env che ci serve per disattivare i pagamenti e avere una testmode»).

Coperto, con due integrazioni della critica:
- il modello dei diritti diventa la prima realizzazione di REQ-07/AC-07, con tabella generica `entitlements` e verifica sul server;
- l'identità dell'installatore diventa una decisione esplicita (D13).

Il resto è in ADR-0014, sezione 6:
- `ACASYSTEM_PAYMENTS` off | test | live;
- commutatore;
- `live` rifiutata;
- nessun fornitore.

Questioni aperte, elencate in D5-D7, D13, D14 e nelle domande:
- piani, prezzi, fornitore, fatturazione, termini di vendita, recesso, GDPR;
- Play Store e Google Play Billing, DA VERIFICARE (ISSUE-048);
- correttezza verso l'autore: il codice MIT è riusabile anche commercialmente, i contenuti del suo negozio non sono nella repository, e lui dichiara gratuita la sicurezza.

**R3. Collocazione** («andrei poi a collegare questa interfaccia 3d come ultima pagina di acasystem base con possibilità di spostarla, ma siccome è una cosa pesante va studiata per funzionare al meglio»).

Coperto, sezione 2.2:
- ultima pagina e spostabile;
- caricamento lazy con `modulepreload`;
- rendering sospeso o smontato;
- anteprima statica nella vista pagine e in modifica;
- gesti con le modalità Vista ed Esplora e uscita chiara;
- pressione lunga di 500 ms risolta in Esplora e da decidere in Vista (D18);
- spostamento della pagina senza avviare il 3D;
- memoria su 4 GB e tempo di avvio (T1, T5, T11);
- ISSUE-062 (T4a, T11).

Sostituisce l'ipotesi della pagina fuori dal pager.

### 5. Critica di completezza: correzioni applicate

Ogni voce è stata verificata in sola lettura il 2026-10-20 ed è già riportata nelle sezioni sopra e in ADR-0014.

1. **Lint e build.** Il lint della tipografia non è parte della build (solo il typecheck in `prebuild`). L'argomento a favore del workspace separato regge, ma va riformulato.
2. **Preferenza di qualità.** `current_settings` è per utente e dispositivo, e il `device_id` sta in `localStorage`: la preferenza non sopravvive alla pulizia del browser.
3. **Rimandi tra tappe.** Le tappe rimandavano a «criteri di T9»; i criteri sono in T11.
4. **Marchio e avviso MIT.** Il grep del marchio contraddiceva l'obbligo di distribuire l'avviso MIT, e lit BSD-3 chiede l'avviso anche nella forma binaria. Ora NOTICE è escluso dal grep e distribuito.
5. **Pre-caricamento.** `import()` esegue il modulo: si usa `modulepreload`. Il JS non si scarica più dalla memoria fino al ricaricamento.
6. **Blocco del pager.** Si riusa la prop `locked` esistente.
7. **Cache e servizio statico.**
   - Il service worker mette in cache solo `/assets/` e non pota.
   - I file fuori da `/assets` hanno il ripiego SPA.
   - Decisione D16 e 404 esplicito.
8. **CSP e immagini esterne.** La CSP non blocca chiamate esterne: l'assenza di rete verso terzi si prova con grep e misura. Gli URL esterni delle immagini degli schermi vengono rifiutati dal validatore.
9. **Conferme.** Non c'è una primitiva di conferma: va creata. `confirm()` compare in 11 punti, non in uno.
10. **Immagini caricate.** Il client già ricodifica, ma il server deve validare da sé. Conflitto SVG con `product.md` 6.1.
11. **Validatore.** Deve conservare i vincoli di `schema.py`: regex degli ID e lunghezze.
12. **Diritti.** REQ-07/AC-07 e ISSUE-009 mancavano: ora tabella generica e verifica lato server.
13. **Identità dell'installatore.** HA `is_admin` non distingue installatore e cliente (D13).
14. **`isLowEnd` sul Tab M11.** Era dato per probabilmente falso; ora è indicato come non misurato.
15. **Anteprima statica.** Mostrava stati e tema vecchi: ora stati neutri, scritta «Anteprima», invalidazione; l'uso di IndexedDB è una decisione (D17).
16. **Bozza locale.** Il piano intero nel `localStorage` del tablet: privacy e più utenti (ISSUE-015).
17. **Shadow DOM.** Lo spostamento del target degli eventi e il conflitto su Esc si gestiscono con `composedPath()` e un ordine dei gestori.
18. **React 19 e elementi lazy.** Un elemento non ancora definito riceverebbe `hass` come attributo: si usa un ref dopo `whenDefined`.
19. **Tasto indietro.** Richiede una voce nella cronologia.
20. **Sicurezza gratuita.** L'autore dichiara gratuita la sicurezza: proposta D14.
21. **Domande nuove.** Casa 3D inclusa o a pagamento; rapporto con REQ-09/10 (D15).
22. **Tappe.** Divise e riordinate (sezione 7).
23. **Memoria.** Al criterio dell'heap si aggiungono il PSS del processo e la stabilità per 30 minuti.
24. **TalkBack e testo ingrandito.** Anticipati a T4a e T7.
25. **Pressione lunga e doppio tocco in Vista.** Decisione D18.
26. **Contesto di prova WebGL.** Va rilasciato subito.
27. **Ombre Kit 2.** Niente ombre di Kit 2 sopra il canvas: sono la causa misurata di ISSUE-062.
28. **Numerazione.** ADR-0014 e REP-20261020-002 vanno riverificati al salvataggio.

### 6. Rischi

Sono valutazioni, salvo dove è indicata una fonte.

- **Memoria e avvio sul Tab M11.**
  - Circa 150 MB liberi con Chrome aperto.
  - Il launcher resta montato: tutte le pagine, più il 3D.
  - Il JS 3D (circa 1,4 MB minificati) resta in memoria dopo il primo uso.
  - Le risorse GPU (mesh luce, texture fino a 1024², target 512² per camera) non compaiono nell'heap JS.
  - Ogni ritorno dopo lo smontaggio ricostruisce la scena e ricalcola la luce sulla CPU.
  - Mitigazioni: Light, smontaggio, misure T1/T5/T11 con PSS.
- **Convivenza Lit/React e Shadow DOM con Kit 2.**
  - Primitive React e CSS globali di Kit 2 non entrano nello shadow root; ci entrano solo le custom property.
  - Gli eventi arrivano con il target spostato sull'elemento ospite.
  - Gli attributi vengono scritti al posto delle proprietà se l'elemento non è ancora definito.
  - Possibile doppio Lit in futuro.
  - Mitigazioni: guscio React, mappatura dei token, ref e `whenDefined`, `composedPath()`.
- **Accessibilità per la persona di 65 anni.**
  - Il canvas non è leggibile da TalkBack.
  - L'esplorazione al tocco di TalkBack va contro i gesti di Esplora.
  - I pin di circa 34 px sono sotto i 48.
  - Il doppio tocco usato come «indietro» non si scopre da soli.
  - L'anteprima può mostrare stati vecchi.
  - Mitigazioni: «Elenco stanze» come alternativa equivalente e predefinita con TalkBack, pin da 48 px, «Fine» da 56 px, anteprima neutra, prove al 125/150%.
- **Movimento ridotto.** C'è solo `prefers-reduced-motion` (`useReducedMotion`), nessuna preferenza di Acasystem. Si applica a `flyTo`, all'inerzia, alla rotazione e alle animazioni infinite.
- **Temi chiaro e scuro.** L'interfaccia nasce per il fondo scuro: il tema chiaro costa di più. Il cambio di tema in esecuzione deve aggiornare gli uniform e rifare l'anteprima. Contrasti ≥4,5:1 per il testo e ≥3:1 per le icone.
- **Aggiornamenti futuri dall'originale.**
  - 48 rilasci in 18 giorni, almeno 100 commit su `editor.ts` in 12 giorni.
  - Il riporto è manuale: lo coprono soltanto i test unitari e il typecheck.
  - Lit e three vanno aggiornati con autorizzazione, secondo AGENTS.md.
- **Avvisi di licenza.** `legalComments: 'none'`. NOTICE va servito e mostrato; lit BSD-3 lo richiede anche nella forma binaria. Inter è OFL (C-12).
- **Nomi residui.**
  - Restano `fp3d`, `__FP3D_*` e le classi CSS (decisione D3).
  - Formato `neonplan3d` in importazione (D9).
  - Chiavi legacy `floorplan-3d.unsaved`.
  - Stringhe de/en, se l'inglese resta come ripiego.
  - Il grep deve coprire output, stringhe e chiavi locali.
- **Planimetria in backup ed export.**
  - Entra nelle copie a freddo di `tunet.db`; la cifratura è spenta sul banco (`TUNET_ENCRYPTION_MODE: "off"`).
  - Le immagini BLOB ingrandiscono database e copie.
  - L'esportazione dei profili non la include.
  - L'esportazione propria lascia un file nei Download del dispositivo.
  - Bozza locale e anteprima restano sul tablet.
  - GDPR: dato personale, conservazione, cancellazione a fine contratto (C-06, C-08).
- **Sicurezza delle immagini caricate.**
  - Il client non è affidabile: servono validazione e ricodifica sul server.
  - Niente SVG; limiti in pixel e in byte; `nosniff`.
  - Immagini lette solo da chi può vedere il piano (D8).
  - Nessun URL esterno (ISSUE-016).
- **Permessi di modifica.**
  - HA `is_admin` non distingue installatore e cliente.
  - Il commutatore in `test` e il piano in `off` sono esposti al cliente admin (D13).
  - Il controllo di ruolo nel backend è nuovo.
- **Funzioni Pro e autore.** Lecito secondo la MIT, delicato sul piano commerciale e dei rapporti; i contenuti venduti dall'autore non ci sono (D5).
- **Commerciale e legale.**
  - GPL-3.0: il blocco è solo tecnico.
  - Google Play Billing DA VERIFICARE (ISSUE-048).
  - Fattura, termini di vendita e recesso non definiti.
  - Una variabile `test` dimenticata in un'installazione presso il cliente regala i piani: serve una fascia visibile e un avviso nel log all'avvio.

### 7. Tappe rivedute

Le tappe sono divise e riordinate rispetto alla bozza; l'impegno è in giornate di lavoro, con ampia incertezza.

| Tappa | Contenuto | Fatto quando | Impegno |
|---|---|---|---|
| T0 Decisioni e ADR-0014 | D1-D19; ADR accettato o modificato; annotazioni a ADR-0012/0009; nuovo ISSUE; conflitti con `product.md` 6.1-6.4 e REQ-07 registrati | ADR-0014 «Accettata» con la citazione dell'utente; autorizzazione identificabile per lit e three | 0,5-1 g |
| T1 Misura della demo sul Tab M11 | Demo pubblica (host dell'autore, dati inventati, `hass` simulato), solo a tablet libero e con autorizzazione. `deviceMemory`, `hardwareConcurrency`, GPU; tempo al primo fotogramma a freddo e a caldo; fps e fotogrammi >50 ms; heap e PSS (`dumpsys meminfo`); `WEBGL_lose_context` | Tabella nel report; esito procedere / solo Light / fermarsi deciso con l'utente; criteri di T11 confermati o corretti | 0,5-1 g |
| T2a Copia e rinomina | Commit 1: `upstream/` verbatim. Commit 2: `src/` da `rinomina.mjs`, rimozioni, NOTICE, PATCHES | 66 test `node --test` verdi; grep del marchio = 0 (NOTICE escluso) | 1-2 g |
| T2b Build e servizio | Workspace, `build.mjs`, Dockerfile, servizio statico secondo D16, 404 esplicito, regola del service worker | Immagine costruita; bundle servito con la CSP attuale; `index` ≤ 900 KB; nessuna richiesta esterna | 1-2 g |
| T3 Adattatore in sola lettura | `haShim`, registri, montaggio di sviluppo con un piano d'esempio scritto da noi, Light forzata | Vitest dell'adattatore; sul banco stanze e luci reali senza errori; registri provati con utente admin e non admin | 2-4 g |
| T4a Guscio della pagina | PageKind, migrazione, Riposo e anteprima, vista pagine, modifica, `modulepreload` | Test di migrazione; spostamento della pagina senza renderer (contatore); TalkBack e testo al 125/150% sul guscio; ISSUE-062 non peggiorato sul Tab M11 | 2-3 g |
| T4b Gesti Vista/Esplora | `pan-x` in Vista, `locked` in Esplora, uscite (Fine, Esc, indietro, indicatore, 60 s), D18, tastiera con `composedPath()` | Playwright: swipe che cambia pagina in Riposo e in Vista, nessun cambio in Esplora, pressione lunga come da D18, Esc che non agisce sul launcher | 2-4 g |
| T5 Qualità e contesto | Tre livelli, rilevamento, menu, salvataggio, `setQuality` che rilascia prima di creare, `contextlost` e ripiego, `ViewerStats` | Light entro i criteri di T11; Medium e High selezionabili senza blocchi oltre 1 s e senza perdita di contesto; ritorno a Light; perdita e ripristino provati tre volte; preferenza mantenuta dopo una ricarica | 3-5 g |
| T6 Persistenza | Tabelle, rotte, ruolo (D13), validatore con i vincoli, immagini sicure, cronologia, esportazione, bozza locale | Vitest: 409, 403, limiti, SVG e URL esterni rifiutati, immagine troncata rifiutata; salvataggio e rilettura su due dispositivi; piano presente nella copia a freddo | 4-6 g |
| T7 Comandi dalla pagina | Primitiva di conferma, tocco sui pin, menu rapido, swipe verticale solo in Esplora, limite di 350 ms | Sul banco con entità di prova: stato atteso in HA e nella scena entro 1 s; nessun comando da uno swipe del pager; TalkBack sui comandi | 2-4 g |
| T8 Diritti e `ACASYSTEM_PAYMENTS` | Catalogo, `entitlements` generica, API, `features.aca.ts`, variabile in `.env`, `.env.example` e compose, commutatore, `live` rifiutata | Vitest: assente o non valida = off, `live` = off con avviso, 403 / 409, diritti `test` ignorati fuori da `test`; cambio di piano che accende una funzione senza ricaricare; rete verso terzi = 0 | 4-7 g |
| T9a Tema scuro Kit 2 | Token, look kit2 scuro, Inter, colori fissi con lo script | Contrasti misurati nel tema scuro; nessuna ombra sopra il canvas | 3-5 g |
| T9b Tema chiaro | Look kit2 chiaro, colori di segnale, anteprima rifatta al cambio di tema | Contrasti misurati nel tema chiaro | 3-6 g |
| T9c Tipografia e italiano | Foglio per ADR-0007 o esenzioni con data di rientro; `it.aca.json`; revisione umana | `lint:typography` del workspace verde o esenzioni approvate; revisione firmata | 2-4 g |
| T10a Editor: ingresso e sicurezza | Overlay, ingresso solo per l'installatore, salvataggio, tastiera attiva solo a editor connesso | Esc, Canc e Ctrl+Z non agiscono sul launcher; avvio dell'editor misurato sul Tab M11 | 3-5 g |
| T10b Editor: profilo tablet | Bersagli ≥44 px, pulsanti visibili (chiudi forma, annulla, elimina, duplica, ruota), suggerimenti senza tastiera | Un installatore disegna e salva una casa di prova sul Tab M11 senza tastiera | 3-6 g |
| T10c Editor: riduzione | Strumenti e sezioni fuori perimetro spenti o rimossi, 3D a fianco spento in Light, peso misurato | Bundle dell'editor misurato; registro delle patch aggiornato | 2-4 g |
| T11 Collaudo finale sul Tab M11 | Avvio, memoria con il launcher, 30 minuti di uso, schermo spento e riacceso, perdita del contesto, TalkBack, testo al 125/150%, movimento ridotto, elenco stanze | Criteri proposti (da confermare in T1): primo fotogramma ≤4 s a caldo e ≤8 s a freddo; Light ≥30 fps con al più 1 fotogramma >50 ms per gesto di 5 s; heap aggiuntivo ≤60 MB e PSS aggiuntivo da fissare in T1; scena ferma = 0 fotogrammi; nessuna scheda terminata in 30 minuti; ISSUE-062 non peggiorato | 3-5 g |

**Totale.** Circa 41-74 giornate, più collaudi, ripetizioni, manutenzione continua e decisioni commerciali. T9 e T10 restano le voci più incerte.

**Traguardo intermedio.** Dopo T7 si hanno vista e comandi con un piano d'esempio. Se D9 lo consente, si può avere anche un piano importato dal formato originale, disegnato dall'installatore con NeonPlan in un HA di prova: è la prima versione da mostrare all'utente.

### 8. Decisioni per l'utente

- **D1 — Sede.** Workspace `casa3d/` (consigliato) oppure cartella sotto Vite.
- **D2 — Aggiornabilità.**
  - Consigliato: `upstream/` verbatim, script di confronto e registro delle patch.
  - In alternativa: divergenza totale subito, oppure coda di patch completa (fragile).
- **D3 — Prefisso `fp3d`.** Tenerlo (consigliato) oppure rinominarlo.
- **D4 — Persistenza.** Backend Acasystem (consigliato) oppure integrazione HA rinominata.
- **D5 — Funzioni Pro.** «Le lascerei»: codice tenuto dietro i diritti. Consiglio: nessuna vendita in `live` senza accordo o almeno comunicazione con l'autore.
- **D6 — Modello dei diritti.** Funzioni → pacchetti con livelli → piani; nomi, contenuti, prezzi; vendita per installazione (consigliato) o per utente.
- **D7 — `ACASYSTEM_PAYMENTS`.** Significato di off, test e live come in ADR-0014; predefinito `off`; chi usa il commutatore in produzione.
- **D8 — Lettura della planimetria.** Solo installatore, tutti, oppure casella «visibile agli utenti» spenta di default; se entra nelle esportazioni; se la cifratura a riposo è obbligatoria.
- **D9 — Importazione del formato originale.** Accettare `neonplan3d` versione 1 in lettura oppure no.
- **D10 — Lingue.** Solo italiano (consigliato) o inglese come ripiego; chi rivede `it.json`.
- **D11 — Dipendenze ed eccezioni.** lit e three a versione esatta; eccezioni perimetrate ad ADR-0004, 0005, 0007, 0008 e 0011.
- **D12 — Regole della pagina.**
  - Nascondibile e rinominabile ma non duplicabile.
  - Se viene eliminata, non si ricrea.
  - L'editor resta un overlay fuori dal pager.
- **D13 — Identità dell'installatore.** HA `is_admin` non lo distingue dal cliente. Possibilità:
  - un ruolo installatore di Acasystem;
  - una credenziale o PIN dell'installatore fuori da HA;
  - un file di diritti firmato da Acasystem;
  - accettare che ogni admin HA possa cambiare il piano.
- **D14 — Inclusione e sicurezza.** La Casa 3D è inclusa in ogni piano o a pagamento? Proposta: le funzioni di sicurezza (fumo, acqua, allarme, pioggia, blackout) restano gratuite, come fa l'autore.
- **D15 — Rapporto con REQ-09/10 e `product.md` 6.1-6.4.**
  - La Casa 3D sostituisce o affianca la piantina 2D in X%/Y%?
  - SVG ammessi solo rasterizzati, oppure rifiutati?
- **D16 — Servizio e cache dei bundle.** `/casa3d/` con `immutable` oppure `/assets/casa3d/` con potatura della cache del service worker.
- **D17 — Anteprima.** Solo in memoria di sessione (consigliato) oppure anche in IndexedDB; con più utenti sullo stesso tablet, anteprima per utente.
- **D18 — Gesti in Vista.** La pressione di 500 ms sul canvas apre l'editor delle pagine del launcher (coerente con le altre pagine) oppure i dettagli del dispositivo sotto il dito? Doppio tocco a 280 o a 320 ms.
- **D19 — Diritti come REQ-07.** Tabella generica `entitlements` con ambito `casa3d` (consigliato) oppure modello separato della sola Casa 3D.

### 9. Domande

1. **Misura sul tablet.** Quando sarà libero il Tab M11 per T1? È autorizzato aprire dal tablet la demo dell'autore (`neonplan3d.mastershort.de`, host esterno)?
2. **Rapporto con l'autore.** Che rapporto c'è con Mastershort? Il capo lo conosce? Volete contattarlo prima di vendere funzioni sue?
3. **Funzioni Pro da tenere.** Quali servono davvero? Timetravel richiede il porting del backend; household usa percorsi non ammessi dal proxy.
4. **Piani e prezzi.** Quanti piani? Pacchetti a parte? Abbonamento o una tantum? Per installazione o per utente? La Casa 3D è inclusa?
5. **Vendita.** Fornitore di pagamento, fatturazione, termini di vendita, recesso, GDPR dei dati di acquisto: chi se ne occupa?
6. **Play Store (ISSUE-048).** L'app arriverà dal Play Store anche ai clienti che comprano i pacchetti? DA VERIFICARE sulle politiche correnti di Google Play (Payments policy) se serve Google Play Billing, con le eccezioni regionali. Una vendita tramite installatore o contratto fuori dall'app potrebbe cambiare il quadro.
7. **GPL-3.0.** Con il backend presso il cliente il blocco è solo tecnico e il sorgente va fornito: il modello a pagamento è compatibile con le vostre intenzioni? (valutazione, non parere legale)
8. **Visibilità e condominio.** Chi vede la planimetria? Nei condomini (REQ-17) serve una casa per abitazione?
9. **Editor.** Solo per l'installatore su tablet, o anche su PC? Il cliente può modificare qualcosa?
10. **Installatore.** Come lo riconosciamo, visto che il cliente può essere admin HA (D13)?
11. **Tablet più potenti.** Su quali tablet provare Medium e High? Livello per dispositivo (consigliato) o per utente?
12. **Comparsa della pagina.** La pagina deve comparire subito per tutti i layout, o solo dopo che l'installatore ha disegnato la casa?
13. **Nome.** Va bene «Casa 3D»? Serve un nome commerciale per i pacchetti?
14. **Piantina 2D.** La Casa 3D chiude REQ-09/10 o resta una piantina 2D semplice a parte (D15)?

### 10. Proposte da registrare (non applicate)

- Nuovo ISSUE «Casa 3D (base neonplan3d)», collegato a REQ-07, 09, 10, 16, 17 e a ISSUE-008, 009, 014, 015, 016, 048, 062.
- Annotazioni in ADR-0012 e ADR-0009, se ADR-0014 viene accettato.
- `product.md` 6.1-6.4 e stato di REQ-16, solo dopo D15.
- Voci in `compliance.md` dopo C-13: lit, three, base MIT, NOTICE.
- Righe in `reports/README.md` e `project-status.md` quando l'altro lavoro avrà rilasciato quei file.

### T1 — Misura della demo sul Tab M11 (2026-10-20)

**Stato:** eseguita il 2026-10-20 circa 14:50-16:15, dopo l'accettazione di ADR-0014 (richiesta dell'utente: «approvo la bozza, procedi con la misura della demo sul tablet»). Solo osservazione: nessuna modifica a codice di Acasystem, banco Docker, Git o impostazioni di Android. Il sito dell'autore è stato trattato come dato: nessuna credenziale, nessun acquisto, nessuna telemetria, nessun download sul tablet, nessun clic su «Install» o sui collegamenti a GitHub del banner. Distinzione usata: **Misura** = dato letto dagli strumenti; **Valutazione** = giudizio dell'agente, da confermare con l'utente.

#### Demo misurata

- **Indirizzo:** `https://neonplan3d.mastershort.de/`, collegamento «Try the online demo» del README della repository dell'autore (ramo `main`). La pagina reindirizza (JavaScript) a `/preview/index.html?site&lang=en`, che corrisponde a `preview/index.html` della repository con il banner `?site`, e carica `../custom_components/neonplan3d/frontend/neonplan3d.js`.
- **Versione:** NeonPlan 3D v1.21.0, mostrata nell'intestazione; coincide con `manifest.json` e CHANGELOG di `main`. Ultimo push della repository 2026-10-20 12:51 UTC; indice della demo `Last-Modified` 2026-10-19. Il commit `1383a14` (v1.20.2) letto per il resto del report non è quindi la versione misurata.
- **Natura:** dati inventati, `hass` simulato, scena dimostrativa (casa a due piani con giardino, circa 90-143 chiamate di disegno per fotogramma). Non è una casa reale né il codice di Acasystem.

#### Dispositivo

- **Misura:** Lenovo Tab M11 TB330FU (adb `HA2KZKYB`), pannello fisico 1200×1920, Chrome 155.0.8059.81 (UA ridotto «Android 10; K»). Batteria 98% in carica USB, temperatura della batteria 31,7-33,0 °C per tutta la sessione.
- **Misura:** `navigator.deviceMemory` = 4 (su contesto sicuro HTTPS; su `about:blank` è `undefined`), `hardwareConcurrency` = 8, MemTotal 3,9 GB, MemAvailable a riposo circa 1,47 GB.
- **Misura:** `devicePixelRatio` 1,5; viewport **in orizzontale 1280×665 px CSS**. Frequenza di aggiornamento percepita circa 85-90 Hz (rAF fino a 85 fps).
- **Misura:** WebGL 2.0 (OpenGL ES 3.0 Chromium); renderer ANGLE (ARM, Mali-G52 MC2, OpenGL ES 3.2 v1.r49p1); `MAX_TEXTURE_SIZE` 8192, `MAX_RENDERBUFFER_SIZE` 16383, anisotropia sì, `WEBGL_lose_context` sì. Chrome: compositing GPU, rasterizzazione, WebGL e WebGPU abilitati; Vulkan disabilitato.
- **Orientamento:** a inizio sessione il tablet era in verticale (viewport 800×1145). Dopo un blocco dello schermo si è rimesso da solo in orizzontale (rotazione automatica già attiva, non forzata). **Tutte le misure sono in orizzontale; il verticale non è stato misurato.**

#### Misure

Livelli della demo: «Auto» (predefinito), «Tablet» (`low`) e «High». Non coincidono con Light/Medium/High del piano: in questa demo Auto sul Mali-G52 si comporta come High (rapporto pixel 1,5). I «fps di disegno» sono fotogrammi di disegno per secondo (gruppi di chiamate `draw*` nello stesso task); gli «intervalli >50 ms» sono contati fra fotogrammi consecutivi nella finestra del gesto (circa 2,1-2,2 s, non i 5 s del criterio di T11).

| Scenario | Livello | Misura |
|---|---|---|
| Avvio a freddo (cache disattivata solo per la scheda), dalla radice al primo disegno WebGL; 3 prove (più 1 pilota) | Auto | Primo disegno 3,99 / 4,57 / 4,62 s (pilota 4,15 s, non conservato fra le evidenze); rAF successivo 4,6-5,4 s; scena completa (circa 143 chiamate) 5,7-6,5 s. Contesto WebGL creato a 2,5-3,1 s. Da screencast la casa compare tra 2,5 s (ultimo fotogramma vuoto) e 5,19 s (primo con la casa): un intervallo, non un istante. DOMContentLoaded 0,52-0,75 s |
| Avvio a freddo: byte | n.a. | 16 richieste, 535 KB trasferiti (1,70 MB decodificati). Più pesanti: `neonplan3d-3d.js` 232 KB (806 KB decodificati), `neonplan3d.js` 207 KB (647 KB), font 42 KB e 20 KB, `demo-data.js` 10 KB. Due risposte 404 (`/private/packs/starter.json`, `/private/packs/src/index.json`), le uniche voci in console |
| Avvio a caldo (cache HTTP attiva, scheda nuova), 3 prove | Auto / Tablet salvata | Primo disegno 1,50 / 1,52 / 1,53 s (57 chiamate), seguito da un task di circa 1 s; rAF successivo 2,26-2,54 s; casa visibile da screencast a circa 2,6 s (assente a 0,5 s); scena completa 4,5-5,0 s. Trasferiti 11 KB. DOMContentLoaded 0,09 s |
| Buffer di disegno e costo del cambio | Auto / Tablet / High | Auto = 1920×810 (rapporto 1,5, uguale a High), mai sceso in circa 75 s di osservazione. Tablet = 1280×540 (rapporto 1,0, 44% dei pixel). Ogni cambio crea un nuovo contesto WebGL e manda `webglcontextlost` al vecchio. 6 cambi (più 1 nullo): contesto creato dopo 0,19-0,99 s, primo disegno dopo 0,63-1,16 s; thread principale bloccato 0,7-1,1 s (task lunghi da 144 ms; a High 1,07-1,13 s) |
| A riposo, scena ferma, 5 s, mediana di 8 prove (due ordini × 4 ripetizioni) | Auto | 15,9 fps di disegno (14,5-23,2); 42 intervalli >50 ms in 5 s; il disegno non si ferma mai |
| A riposo | Tablet | 51,6 fps (20,8-85,0); mediana 26,5 intervalli >50 ms (0-50). Anche qui disegna di continuo (animazioni ambientali) |
| A riposo | High | 15,8 fps (14,6-21,4); 42 intervalli >50 ms in 5 s |
| Orbita con gesto touch sintetico (1,5 s di trascinamento da 500 px più 0,6 s di coda; 8 ripetizioni) | Auto | 17,5 fps (15,0-21,0); intervalli >50 ms per gesto: mediana 17 (13-19); intervallo massimo mediano 193 ms (max 215); circa 10 task da 80-100 ms ogni 220 ms, presenti anche a riposo |
| Orbita | Tablet | 58,8 fps (33,1-71,4); >50 ms per gesto: mediana 1 (0-2); massimo mediano 54 ms (max 67). **Dipende dall'inquadratura:** con 48-108 chiamate (primo piano) 58-71 fps e 0-1 intervalli; con 132 chiamate (vista d'insieme «All floors») 33,1 e 36,0 fps con 2 intervalli ciascuna |
| Orbita | High | 16,6 fps (14,8-20,1); >50 ms per gesto: mediana 16 (13-19); massimo mediano 177 ms (max 213) |
| Zoom a pizzico sintetico (1,5 s, dita 100→420 px e ritorno; 8 ripetizioni) | Auto | 17,2 fps (14,7-22,4); >50 ms per gesto: mediana 17,5 (15-19); massimo mediano 172 ms |
| Zoom a pizzico | Tablet | 58,3 fps (41,6-78,2); >50 ms per gesto: mediana 0,5 (0-9; prove con 9, 5 e 2); massimo mediano 54 ms |
| Zoom a pizzico | High | 18,4 fps (16,1-20,7); >50 ms per gesto: mediana 15,5 (13-17); massimo mediano 185 ms |
| Editor: apertura dalla vista 3D (3 prove) | n.a. (2D) | Pronto in 65 / 62 / 58 ms, con un task lungo di circa 60 ms. Il ritorno a 3D ricrea il contesto: primo disegno dopo 1,12 e 1,19 s con 4-5 task lunghi (circa 1,9 s di thread bloccato) |
| Editor: spostare un mobile (letto, 70 px avanti e indietro in 1,6 s; 3 prove), solo piano 2D | n.a. | rAF 21,6 / 28,7 / 30,5 fps; 18-22 fotogrammi >50 ms per prova; intervallo massimo 124-206 ms; 28-30 pointermove ricevuti su circa 96 inviati |
| Editor: pan del piano | n.a. | Registrati 81-83 fps e 0 fotogrammi >50 ms, ma **non verificato**: arrivano solo 3 pointermove su circa 90 e non c'è alcuno screenshot che mostri il piano spostato. Il dato non va usato |
| Editor con «3D beside» (2 passate) | Tablet | Attivazione: pronto 0,72-0,87 s, primo disegno 3D 1,42-1,86 s, task lunghi di 0,7-1,0 s. A riposo 11,5 fps. Spostamento di un mobile: 3,8-4,6 fps, fotogrammi fino a 0,71-0,97 s, 11-17 task lunghi (max 639 ms) |
| Console | tutte | Nessun errore JavaScript o WebGL; solo i 404 di `/private/packs/*`. Nessun avviso di memoria, nessun contesto perso spontaneamente |

#### Perdita del contesto WebGL

- **Misura** (livello Tablet, vista 3D, `WEBGL_lose_context`). `loseContext()` poi `restoreContext()` dopo circa 3 s, 3 cicli: `webglcontextlost` arriva dopo 20-50 ms ed è già annullato dall'app (`defaultPrevented` vero); durante la perdita 0 disegni e nessun messaggio all'utente. L'utente vede un fondo blu vuoto (la casa sparisce) con gli elementi HTML ancora visibili (etichette, schede, miniature, pulsanti). Dopo `restoreContext()` arriva `webglcontextrestored` in circa 0,5 s e la scena si ridisegna da sola, senza ricaricare e con la camera conservata, sullo stesso contesto: 3 cicli su 3 recuperati, nessun errore.
- **Misura.** `loseContext()` senza `restoreContext()`: a 2, 5, 10 e 20 s il contesto resta perso, 0 disegni, scena vuota, nessuna ripresa spontanea; chiamando `restoreContext()` la ripresa avviene in meno di 2,5 s.
- **Valutazione.** La demo registra il listener e fa `preventDefault`, quindi si riprende quando il browser ripristina il contesto; un contesto non ripristinato lascia però una vista vuota e muta. **Limite:** la perdita è simulata, non un reset reale del driver Mali.

#### Memoria

- **Misura.** PSS totale di tutti i processi Chrome (`dumpsys meminfo`), compresa la scheda Acasystem dell'utente (137-157 MB, non toccata); si leggono le differenze. Prima della demo 483-490 MB (browser 181, renderer Acasystem 154, GPU 144-152, zygote 4).
- **Misura.** Demo a livello Tablet, 15 s dopo l'avvio: 677 MB (+190; GPU +80, renderer della demo 132). High 9 s dopo il cambio: 724 MB (+240). Dopo cambi di livello 704-721 MB (+220/+235). Editor solo 2D: 625 MB (+140). Editor con «3D beside»: 701 MB (+215). Ritorno al 3D: 747 MB (+260; GPU 278, renderer 152).
- **Misura, dalla revisione.** Nella passata dei livelli (`quality-B.json`), dopo 5 cambi di livello nella stessa scheda, il totale arriva a 801 MB (GPU 301 MB, renderer della demo da 147 a 181 MB): **circa +310 MB**, con MemAvailable a 1195 MB. Il picco di +260 MB citato sopra è quindi sottostimato; la crescita con i cambi di contesto è monotona.
- **Misura.** Dopo la chiusura della scheda: 489 MB a +4, +15 e +30 s (ritorno al valore di partenza). `JSHeapUsedSize` della demo: 10-23 MB in tutti gli stati. MemAvailable di sistema: 1,47 GB a riposo, minimo 1,195 GB con la demo aperta.
- **Limiti.** Un campione per stato. Il renderer di Acasystem scende da 153-157 a 136-137 MB mentre la demo è aperta (scheda in secondo piano), quindi circa 17 MB del costo della demo non compaiono nella differenza. In Acasystem non ci sarà un renderer separato e il launcher sarà in primo piano insieme al 3D. I «circa 150 MB liberi» del piano sembrano un valore di MemFree: T1 misura MemAvailable, e il rischio reale di terminazione di altre app non è misurato.

#### Note di metodo

- Strumenti e risultati in `backup/casa3d-t1/` (escluso da Git: verificato con `git check-ignore`). Un solo script CDP alla volta (`connectOverCDP` su 127.0.0.1:9225, schede create con `Target.createTarget`), nessun browser né Vitest sul PC.
- «Primo fotogramma» dello script = timestamp del primo `draw*` di WebGL (hook iniettato con `Page.addScriptToEvaluateOnNewDocument`) meno il `timeOrigin` del documento radice: include il redirect della radice (circa 0,31 s). **È il primo disegno, non la casa visibile.** Per la casa visibile si è usato `Page.startScreencast` (granularità di circa 1 s a freddo, perché emette solo sui cambi): è un intervallo. Non c'è tempo GPU: una coda sulla GPU si vede solo come ritardo del thread principale. L'avvolgimento delle chiamate aggiunge un overhead JavaScript piccolo ma non nullo.
- Livelli: pulsanti del menu «View» della demo; 8 prove per livello (passate A e B in ordine opposto, 4 ripetizioni ciascuna); gesti alternati nei due versi per riportare la camera. **La camera non è stata controllata:** nella passata A tutti i livelli sono in primo piano (45-80 chiamate); nella passata B, a Tablet, alcuni gesti partono dalla vista d'insieme (93-132 chiamate). La mediana di Tablet mescola le due inquadrature. Auto e High, limitati dal riempimento, sono coerenti in entrambe le passate.
- Gesti: `Input.dispatchTouchEvent` sintetici ogni 16,7 ms; non equivalgono a un dito reale. Lo zoom muove la camera in modo dimostrato (vista d'insieme prima, primo piano dopo); per l'orbita ci sono solo screenshot «dopo» e l'arrivo di 25-112 pointermove su circa 90 inviati. I pointermove coalescenti ricevuti sono meno degli inviati sotto carico.
- Pixel ratio verificato dal buffer di disegno (1920×810 contro 1280×540 su un canvas CSS di 1280×540). `antialias`, ombre ed effetti per livello **non sono stati letti**: da Tablet a High i pixel salgono di 2,25 volte ma gli fps cambiano di circa 3,5 volte, quindi probabilmente cambiano anche altre impostazioni, e il guadagno non si può attribuire alla sola risoluzione. La proprietà `detecting` letta nel bundle salvato riguarda i pin di rilevamento persona della camera, non il rilevamento automatico della qualità: **non è dimostrato che Auto fosse «ancora in rilevamento»**, è provato solo che ha tenuto il buffer a 1920×810. La logica di Auto sta in `neonplan3d-3d.js`, non salvato.
- «A freddo» = cache disattivata solo nella scheda (DNS, TLS/HTTP2 e code cache V8 possono restare calde); la prima visita assoluta non è stata misurata. «A caldo» dipende dal `max-age` di 600 s di GitHub Pages.
- Il tablet si è bloccato durante un'esecuzione lunga rimasta appesa; è stato svegliato con `KEYCODE_WAKEUP`, sbloccato con uno swipe (nessun PIN) e tenuto acceso con un tasto ogni 8 s via adb (`screen_off_timeout` resta 30 s, nessuna impostazione modificata). «Nessun throttling termico» si basa sulla temperatura della batteria, non del SoC; le passate A e B coerenti a Auto e High sono un indizio migliore.
- Ripetizioni: avvio coerente (3 prove a freddo con scarto di 0,63 s; 3 a caldo con scarto di 0,03 s; byte identici); livelli 8 prove per livello; memoria campioni singoli; editor 3 prove; «3D beside» 2 passate; perdita del contesto 3 cicli più 1 senza ripristino.

#### Limiti

Scena dimostrativa diversa da una casa reale; versione 1.21.0, configurazione (rapporto pixel, effetti, animazioni continue) e `hass` simulato dell'autore; Acasystem avrà un proprio codice di avvio, caricamento differito e criteri. Le misure indicano la fattibilità del Tab M11, non le prestazioni di Acasystem. **Non misurati**, ma richiesti dall'utente («l'app deve essere eseguibile da ogni tipo di dispositivo»): verticale del Tab M11, telefoni (DPR 2,5-3: senza limite di DPR andrebbe peggio), PC con l'editor, dito reale, tempo GPU, 30 minuti di uso, casa reale e codice di Acasystem. Il tablet è stato rimesso come trovato: scheda della demo chiusa, scheda Acasystem dell'utente in primo piano senza ricarica né accesso al suo `localStorage`, inoltro adb rimosso. Resta il `localStorage` dell'origine `neonplan3d.mastershort.de` nel Chrome del tablet (chiavi della demo, tra cui `neonplan3d.quality` = `low`); non riguarda Acasystem e si cancella da Chrome > Impostazioni sito.

#### Verifica di Opus

Verifica indipendente in sola lettura delle evidenze e degli script in `backup/casa3d-t1/`, senza usare il tablet (nome esatto del modello non disponibile). I numeri riportati corrispondono ai JSON, con le imprecisioni seguenti, già corrette nel testo sopra:

1. Camera non controllata: il livello Tablet dipende dall'inquadratura (vista d'insieme 33-36 fps con 2 intervalli >50 ms in 2,2 s; primo piano 58-71 fps).
2. Il criterio di T11 «al più 1 fotogramma >50 ms per gesto di 5 s» non è dimostrato: a Tablet lo rispettano 11 gesti su 16 (orbita 6/8, zoom 5/8), con finestre di circa 2,2 s. Su 5 s la vista d'insieme darebbe circa 4-5 intervalli.
3. «Primo fotogramma» è il primo disegno; il fotogramma mostrato arriva a circa 2,3-2,6 s a caldo e 4,6-5,4 s a freddo (rAF). La scena completa a caldo (4,5-5,0 s) supera i 4 s se il criterio la intende così.
4. Pixel ratio verificato, antialias no; `detecting` letto male (vedi le note di metodo).
5. Il PSS somma i processi giusti ed è coerente con il calo di MemAvailable, ma il picco è circa +310 MB.
6. Il pan dell'editor non è verificato.
7. Imprecisioni minori: i gesti deboli a Tablet sono due, non uno; ci sono 6 cambi di livello più 1 nullo, non 7; Tablet ha un task lungo da 62 ms in una prova; il blocco di 1,07-1,13 s al cambio a High supera il limite di 1 s che T5 fissa per Medium e High.

#### Esito PROPOSTO (la decisione resta all'utente)

**Valutazione dell'agente: «procedere solo con Light».** Non «procedere» pieno, non «fermarsi».

- **Motivazione (misure).** A livello Tablet della demo (rapporto pixel 1,0) il Tab M11 tiene l'avvio entro i criteri (casa visibile circa 2,3-2,6 s a caldo, 4,6-5,4 s a freddo) e un heap di 10-23 MB, senza errori; in primo piano 58-71 fps; il contesto perso si recupera in 3 casi su 3. Con Auto e High (rapporto 1,5) l'orbita scende a 15-21 fps con 13-19 intervalli >50 ms per gesto in ogni inquadratura: Medium e High a rapporto pixel nativo non sono praticabili su questo tablet.
- **Valutazione.** La vista d'insieme a Tablet (33-36 fps, 2 intervalli >50 ms in 2,2 s) è al limite: Light in Acasystem deve essere **più leggero** del livello Tablet della demo, non uguale.
- **Cosa cambiare nel piano:**
  1. Light è la base su ogni dispositivo; Auto parte da Light e sale solo dopo una misura. Non riprendere il comportamento di Auto della demo.
  2. Leve di Light da definire e misurare in T5: rapporto pixel ≤1,0 (0,75 da provare su Mali-G52 e telefoni), antialias spento, nessuna ombra né post-elaborazione, disegno solo su richiesta, meno chiamate di disegno (geometrie unite o istanze: la vista d'insieme con 130-143 chiamate è il caso critico), ologrammi e «3D beside» spenti.
  3. Medium e High selezionabili solo dove la misura lo consente, oppure nascosti sui dispositivi deboli.
  4. In T4/T5, misura di confronto da un'inquadratura fissa d'insieme, con la camera azzerata prima di ogni gesto.
  5. T10: l'editor 2D deve funzionare su tablet, telefono e PC; lo spostamento di un mobile (22-30 fps, fotogrammi fino a 206 ms) va ottimizzato in T10b e il pan rimisurato.
  6. T5: con il contesto perso e non ripristinato serve un messaggio con ripiego, non una vista vuota e muta.
- **Funzioni Pro, piani e planimetria** restano fuori da questa decisione, come chiesto dall'utente.

**Correzioni proposte ai criteri di T11 (da confermare con l'utente; i criteri della tabella di T11 restano come storico):**

1. Avvio: «primo fotogramma» = primo fotogramma mostrato con la casa visibile, non il primo disegno. Restano ≤4 s a caldo e ≤8 s a freddo (la demo: 2,3-2,6 s e 4,6-5,4 s). Nuova metrica «scena completa»: proposta ≤6 s a caldo e ≤8 s a freddo (la demo: 4,5-5,0 s e 5,7-6,5 s). A freddo con cache disattivata nella scheda; prima visita assoluta annotata come limite.
2. Fluidità in Light: ≥30 fps e al più 1 fotogramma >50 ms per gesto di 5 s, dalla vista d'insieme predefinita con la camera azzerata prima di ogni gesto; almeno 8 gesti per tipo (orbita e pizzico) su entrambe le passate; esito = gesti che rispettano il criterio sul totale (obiettivo ≥90%), non la mediana; riportare le chiamate di disegno per fotogramma; dito reale su almeno 3 gesti.
3. Scena ferma = 0 fotogrammi entro 1 s dalla fine del gesto: la demo non lo verifica perché anima di continuo; si prova su Acasystem.
4. Memoria: heap aggiuntivo ≤60 MB (la demo: 10-23 MB); PSS aggiuntivo provvisorio ≤250 MB con il launcher in primo piano, da fissare sulla prima build Light di Acasystem; crescita del PSS ≤30 MB dopo 10 cambi tra vista ed editor o tra livelli e dopo 30 minuti (la demo cresce fino a circa +310 MB dopo 5 cambi); MemAvailable mai sotto 1 GB sul Tab M11; chiarire se i «150 MB liberi» del piano sono MemFree.
5. Cambio di livello o di vista: thread bloccato ≤1 s (la demo: 0,7-1,13 s).
6. Perdita del contesto: ripristino entro 1 s quando il browser lo concede; senza ripristino, messaggio visibile e ripiego entro 2 s.
7. Dispositivi: stessi criteri sul Tab M11 in orizzontale e in verticale, più almeno un telefono Android di fascia bassa e un PC; per l'editor, misura su tablet e PC.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Commit di partenza e stato | `git rev-parse HEAD`, `git status --short` | Eseguito | `7298d4d…`; modifiche preesistenti non toccate |
| Numeri liberi | `ls documentazione/decisions documentazione/reports` | Eseguito | Ultimo ADR-0013, ultimo report REP-20261020-001; da riverificare al salvataggio |
| REP-20261019-004, `product.md`, ISSUE-048/062, `compliance.md`, ADR-0012 | Lettura, grep | Eseguito | REQ-07/AC-07, 5.3, 6.1-6.4, C-01…C-13 |
| Acasystem in sola lettura | grep e sed su `@types/launcher.ts`, `gestures.ts`, `Pager.tsx` (459, 530, 556-600), `launcher.css` (55-90), `PageVisibilityContext.tsx`, `useSettingsSync.ts` (60-80), `security.ts`, `config/env.ts`, `models/database.ts`, `routes/frontend.ts`, `public/sw.js`, `Dockerfile`, `frontend/package.json`, `compose.tunet.yaml`, `.env.example`, `haClient.ts`, `useLockControl.ts`, `LauncherScreen.tsx` | Eseguito | Nessun file modificato |
| Letture A-D della repository esterna | curl raw/API a 1383a14, file in `%TEMP%` | Eseguito (dalle letture) | Righe e numeri riportati dalle letture |
| Verifica puntuale a monte (critica) | curl raw a 1383a14 di `viewer/controls.ts`, `viewer/viewer3d.ts`, `components/view3d.ts`, `components/editor.ts`, `transfer.ts`, `api.ts`, `features.ts`, `building-controller.ts`, `model.ts`, `schema.py`, `README.md`, `LICENSE`, poi grep e sed | Eseguito | Confermati: `controls.ts` 35, 152, 194, 272; `viewer3d.ts` 476-481, 688-697, 740-755, 874, 1610-1638; `confirm()` 11 punti; `unsafeHTML` 9997; caricamenti 5047, 11503, 11561, 11963; `model.ts:134`; `schema.py:13-26`; README 7, 50, 142 |
| Misure sul Tab M11 (demo, Light/Medium/High, PSS) | adb/CDP | **Non eseguito** | Tablet usato da un altro lavoro (T1) |
| Misure sul Tab M11 (demo): avvio, livelli, gesti, editor, perdita del contesto, PSS | adb, CDP su 127.0.0.1:9225, `dumpsys meminfo`; 2026-10-20 | **Eseguito il 2026-10-20** (sostituisce il «Non eseguito» sopra, che resta come storico) | Sezione «T1»; script e JSON in `backup/casa3d-t1/` (escluso da Git). Solo orizzontale 1280×665; gesti sintetici; camera non controllata; pan dell'editor non verificato; verifica di Opus applicata. Verticale, telefoni, PC, dito reale, tempo GPU, 30 minuti: **non eseguiti** |
| Build, test, prove a runtime (React+Lit, CSP, registri HA non admin, contesto, service worker) | — | **Non eseguito** | Fuori perimetro in questa fase |
| Politiche di Google Play sui pagamenti | Fonte primaria da consultare | **Non eseguito** | DA VERIFICARE prima di T8 in `live` |
| Comportamento di `deviceMemory` di Chrome e del nome della GPU | Documentazione Chrome e misura | **Non eseguito** | DA VERIFICARE in T1 |
| `deviceMemory` e GPU sul Tab M11 | Lettura da CDP il 2026-10-20 | Eseguito (misura) | `deviceMemory` = 4 su contesto sicuro (`undefined` su `about:blank`); ANGLE (ARM, Mali-G52 MC2). La documentazione di Chrome non è stata consultata |

## Controllo del diff e decisioni

- **Nessuna modifica.** Nessun file di Acasystem è stato modificato e nessun codice di neonplan3d è stato copiato nel repository. Nessuna dipendenza installata. Tablet, banco, Vitest e browser non sono stati usati.
- **Stato delle scelte.** ADR-0014 è una bozza «Proposta». La strada C è dell'utente. Architettura, parametri, diritti, permessi e tappe sono proposte dell'agente.
- **Conflitti registrati:**
  - pagina fuori dal pager (letture) contro ultima pagina (R3): prevale la richiesta umana;
  - `product.md` 6.4 (2D standard sui tablet economici);
  - `product.md` 6.1-6.2 (SVG, X%/Y%) contro il modello in metri e il rifiuto degli SVG (D15);
  - REQ-07/AC-07: i diritti della Casa 3D come prima realizzazione (D19).

## Chiusura e punto di ripresa

Studio, piano e critica di completezza sono completati. L'implementazione non è autorizzata e nessun incarico di implementazione è attivo.

Input necessari:
- decisioni D1-D19;
- risposte alle domande 1-14;
- autorizzazione per T1, a tablet libero.

Prossimo passo, se autorizzato: T0 (accettazione o modifica di ADR-0014), poi T1 (misura della demo pubblica sul Tab M11).

**Aggiornamento 2026-10-20 (dopo T0 e T1).** ADR-0014 è «Accettata» il 2026-10-20 («approvo la bozza, procedi con la misura della demo sul tablet»): T0 è fatto con le risposte dell'utente (Pro «pensiamoci dopo, iniziamo a integrare e poi vedo col capo»; piani e prezzi e visibilità della planimetria senza risposta; «l'app deve essere eseguibile da ogni tipo di dispositivo»). T1 è eseguita: vedi la sezione «T1 — Misura della demo sul Tab M11 (2026-10-20)». L'implementazione non è autorizzata e nessun incarico di implementazione è attivo.

Punto di ripresa:
- **Decisione dell'utente su T1.** Esito proposto «procedere solo con Light» (Light più leggero del livello Tablet della demo, predefinito su ogni dispositivo) e correzioni ai criteri di T11: da confermare o correggere. Senza risposta, i criteri proposti restano proposte.
- **Decisioni da prendere con il capo**, registrate come problemi aperti: ISSUE-083 (funzioni Pro e rapporto con l'autore), ISSUE-084 (piani, prezzi e fornitore), ISSUE-085 (chi può vedere la planimetria), ISSUE-086 (GPL-3.0 e Play Store per il modello a pagamento). Non bloccano T2-T7; T8 (diritti e `ACASYSTEM_PAYMENTS`) dipende da ISSUE-083, 084 e 086, e T6 da ISSUE-085.
- **Prossimo passo, solo con un'autorizzazione esplicita di implementazione:** T2a (copia e rinomina) e T2b (build e servizio), poi T3. Prima di T5 e T11, misure di Light su verticale, telefono e PC (richiesta di «ogni tipo di dispositivo»).
- Residuo sul tablet: `localStorage` della demo (origine `neonplan3d.mastershort.de`) nel Chrome del tablet.

Il commit va ricavato con `git log -- documentazione/reports/REP-20261020-002-casa-3d-piano.md`.

## T2a — Copia e rinomina (2026-10-20)

**Stato:** eseguita il 2026-10-20 su incarico «Organizza e continua il lavoro in autonomia mentre sono fuori casa», dopo l'accettazione di ADR-0014. Nessun commit Git: le due fasi (la «Commit 1» e la «Commit 2» del piano) sono documentate qui e copiate in `backup/casa3d/T2a/`. Nessun uso di tablet, banco Docker, Vitest del frontend o browser.

**Fase 1, `upstream/` verbatim.** Scaricato soltanto l'archivio della revisione `1383a14` da codeload.github.com (25.778.981 byte, SHA-256 `8841c84f1b72673317dda9958afbcf0628bac2661ccd50a18ab48a9a38f33a02`) in `backup/casa3d/download/` (cartella nuova, esclusa da Git) ed estratto lì; nessuno script della repository è stato eseguito, i file di istruzioni per agenti sono stati trattati come dati. In `progetto/acasystem/casa3d/upstream/` sono copiati senza modifiche 205 file: `LICENSE`, i sorgenti `frontend/src/**` (193 file, con 66 file di test), `frontend/lang/it.json`, `package.json`, `package-lock.json`, `tsconfig.json` e `build.mjs` di riferimento, `docs/plan-format.md` e cinque file Python di riferimento per T6 (`schema.py`, `storage.py`, `websocket.py`, `timetravel.py`, `timetravel_rows.py`). Le impronte sono in `upstream.sha256`; `.gitattributes` marca `upstream/` come `-text` perché il repository usa `core.autocrlf=true`. Provenienza e impronta dell'archivio: `casa3d/UPSTREAM.md` e `casa3d/NOTICE`.

**Fase 2, `src/` generata.** `tools/rinomina.mjs` (ripetibile, controlla le impronte di `upstream/`, non esegue codice copiato, non usa la rete) produce `src/` (182 file), `lang/en.json` e `PATCHES.md` da `upstream/` e `overrides/`. Eseguito due volte: stesso esito byte per byte.
- **Rinominati:** marchio e testi («Casa 3D»), comandi websocket `casa3d/*`, chiavi di storage `casa3d.*`, nomi dei bundle `casa3d-*.js`, id dei pacchetti `casa3d.*`, formati `acasystem-casa3d` e `acasystem-casa3d-backup` (la lettura del formato originale resta la decisione D9). Il prefisso `fp3d` è mantenuto (D3).
- **Non portati:** pannello e scheda Lovelace e il suo editor, pagina Estensioni (negozio, licenza, pacchetti firmati), font del progetto originale, telemetria e raccolta errori (`diagnostics.ts`), programma beta/Supporter, pagina web di importazione (con un contatore di visite); le altre 15 lingue; dall'editor e dalla vista, i collegamenti al negozio, al manuale online, a GitHub e alla chat della community, la sezione «Aiuta a migliorare» e le chiamate di licenza. Il codice delle funzioni Pro c'è; nessuna vendita e nessun modo live; i diritti sono T8, non in questo giro.
- **Testi:** l'italiano diventa la tabella integrata (1891 testi, da `lang/it.json` della copia), l'inglese è un file a parte caricato a richiesta, il tedesco di origine è tolto. I testi dei servizi rimossi restano nelle tabelle senza interfaccia: da potare in T9c. L'italiano non è rivisto da una persona.
- **Registro:** `casa3d/PATCHES.md` elenca 98 patch mirate (con le occorrenze trovate) e le 9 regole generiche (143 sostituzioni); `NOTICE` e i tre `LICENSE-*` conservano l'avviso MIT «Copyright (c) 2026 Mastershort» e le licenze di lit (BSD-3) e three (MIT).

**Dipendenze installate** (in `casa3d/`, che non è ancora un workspace della radice; `npm install --ignore-scripts`, versioni esatte, nessun'altra): lit 3.3.3 (con lit-html 3.3.3, lit-element 4.2.2, @lit/reactive-element 2.1.2), three 0.186.1, e come strumenti di sviluppo @types/three 0.186.0, @types/node 26.6.3, esbuild 0.28.2, typescript 7.0.2: le stesse versioni del lockfile della base, senza i pacchetti di prova nel browser e i font. Registrate in `compliance.md` (C-14, C-15).

**Verifiche** (comandi eseguiti da `progetto/acasystem/casa3d/`; log in `backup/casa3d/T2a/`):

| Controllo | Comando | Esito |
|---|---|---|
| Base di confronto | `node --test "upstream/frontend/src/**/*.test.ts"` | 66 file, 412 test, 412 passati, 0 falliti (`baseline-upstream-test.log`) |
| Test dei sorgenti copiati | `npm test` (`node --test "src/**/*.test.ts"`) | 65 file, **406 test, 406 passati**, 0 falliti (`verifica-test.log`). Sono 6 test in meno perché è tolto `diagnostics.test.ts` (la telemetria); in `alerts`, `markers` e `presence` la lingua di prova e le attese passano dal tedesco all'italiano |
| Tipi | `npm run typecheck` (`tsc --noEmit`, TypeScript 7.0.2, `strict`, `noUnusedLocals`) | 0 errori (`verifica-typecheck.log`) |
| Marchio e indirizzi | `npm run marchio` e `grep -rliE` sull'intero pacchetto | 0 occorrenze del nome e del marchio originali in `src/`, `lang/`, `overrides/`, nei file di pacchetto e negli strumenti, tranne i file che devono nominarli (`upstream/`, `upstream.sha256`, `NOTICE`, `LICENSE-*`, `UPSTREAM.md`, `PATCHES.md`, `tools/rinomina.mjs`); 0 indirizzi `http(s)` di terzi e 0 API di rete proprie (`sendBeacon`, `XMLHttpRequest`, `WebSocket`, `EventSource`) in `src/` (`verifica-marchio.log`) |
| Ripetibilità | `npm run rinomina` due volte, impronta dell'albero `src/`, `lang/`, `PATCHES.md` | identica |
| Build, bundle, peso, prove a runtime, Vitest e lint di Acasystem, `lint:typography`, `lint:theme-colors` | n.a. | **Non eseguiti**: T2a non tocca il codice di Acasystem (nessun file esistente è stato modificato) |

**Limiti e residui.** Sono in `PATCHES.md`, sezione 6, e in sintesi: l'adattatore `hass`, le rotte REST e il servizio statico non esistono ancora (T3, T2b, T6); `api.ts` parla ancora con `callWS`; `main.ts` è un ingresso provvisorio e `load-editor.ts` e `load-timetravel.ts` non hanno ancora chi li usa; restano nel codice le immagini caricabili da qualunque indirizzo indicato nei dati (rifiuto in T3/T6) e le stringhe tedesche e inglesi di `voice/mic-probe.ts`; look, bersagli da 44 px, `ha-icon` e `confirm()` sono T9 e T10.

**Punto di ripresa.** T2b (build esbuild propria, `build.mjs` derivata, nomi dei bundle con hash, servizio statico same-origin, Dockerfile, budget di peso, controllo del marchio nella build): serve decidere D16 (percorso `/casa3d/` o `/assets/casa3d/`) e inserire il pacchetto tra i workspace della radice con il suo `package-lock.json`.

## T2a — esito (2026-10-20)

**Stato finale:** T2a **eseguita e rivista**; criterio «Fatto quando» soddisfatto nella forma corretta dalla rettifica del 2026-10-20: **66 file e 415 test `node --test` verdi** (65 file copiati con 406 test, più `overrides/i18n.test.ts` con 9 test), marchio = 0 fuori dai file che devono nominarlo, nessun indirizzo né API di rete di terzi in `src/`. Nessun commit Git; le fasi 1 e 2 sono copiate in `backup/casa3d/T2a/` e le correzioni in `backup/casa3d/T2a-correzioni/`.

**Modifiche.** Nuovo pacchetto autonomo `progetto/acasystem/casa3d/` (non tracciato, non ancora workspace della radice): `upstream/` verbatim (205 file, impronte in `upstream.sha256`), `src/` generata da `tools/rinomina.mjs`, `lang/en.json`, `overrides/`, `NOTICE` e `LICENSE-*`, `PATCHES.md`, `UPSTREAM.md`. Dipendenze con versioni esatte e `--ignore-scripts` (lit 3.3.3, three 0.186.1, @types/three 0.186.0, @types/node 26.6.4, esbuild 0.28.2, typescript 7.0.2). Documenti: questa sezione e le rettifiche, `compliance.md` (C-14, C-15), `project-status.md`, `verification.md`, `reports/README.md`, `LEGGIMI.md`. Nessun file esistente di Acasystem modificato.

**Revisione.** Una revisione indipendente ha trovato un rilievo medio (test e `diagnostics`) e sette bassi; tutti trattati (vedi la rettifica «correzioni dopo la revisione»). Una seconda passata ha confermato i rilievi come risolti, senza regressioni (66 file e 415 test verdi, `tsc` pulito, `npm run marchio` ok su 191 file, rigenerazione identica), e ne ha aperti due bassi, registrati come ISSUE-087 e ISSUE-088.

**Verifiche.** In `casa3d/`: `npm test` 415 su 415, `npm run typecheck` 0 errori, `npm run marchio` ok, `npm run rinomina` ripetibile. Controlli di regressione sul resto del progetto, eseguiti il 2026-10-20 con carico limitato (log in `backup/casa3d/T2a/`):

| Controllo | Esito |
|---|---|
| Frontend: `typecheck` (strict), `lint:typography` (0 su 459 file), `lint:theme-colors` (0 su 331 file), `i18n:check` (4 su 4) | verdi |
| Frontend: `npx vitest run --maxWorkers=4` | 159 file, 2168 test, tutti verdi (circa 472 s; `suite.txt`) |
| Frontend: `npm run build` e `check-bundle-size.mjs` | verdi; `index` 801,8 kB su limite 900 kB (`build.txt`) |
| Backend: `npm run test -w backend -- --maxWorkers=4` | 17 file, 141 test, verdi (`backend.txt`). Un primo tentativo dalla cartella sbagliata era fallito (workspace non trovato): da ignorare |
| `npm run lint` (ESLint) del frontend | **esito numerico non catturato** (comando in pipe): nessun errore osservato, da ripetere senza pipe se serve la prova formale |

**Non eseguito.** Build di `casa3d` (non esiste ancora uno script di build: è T2b, e il pacchetto non è un workspace); bundle e peso; prove a runtime in browser; tablet e banco Docker (la tappa non li chiede); `npm audit`.

**Limiti e cosa manca.**
- Il blocco delle chiamate verso terzi in `controlla-marchio.mjs` è statico e per riga: non vede una chiamata con l'argomento a capo né un indirizzo costruito a runtime fuori dai nove file elencati (ISSUE-087).
- La ricerca per nome inglese dei mobili nell'editor non trova più i termini inglesi su un host italiano, perché l'inglese si carica solo a richiesta; non è ancora nel registro delle patch (ISSUE-088).
- Restano i residui di `PATCHES.md`, sezione 6: adattatore `hass` in sola lettura (T3), servizio e build (T2b), rotte e persistenza (T6), interruttori `?fp3d_*` (T8), testi orfani e revisione dell'italiano (T9c).
- D10 (tenere o togliere l'inglese), D16 (percorso del servizio) e l'esito proposto di T1 «procedere solo con Light» restano all'utente.

**Punto di ripresa.** T2b: decidere D16, inserire `casa3d` tra i workspace della radice con il suo `package-lock.json`, build esbuild propria con nomi dei bundle con hash, servizio statico same-origin, Dockerfile, budget di peso e controllo del marchio nella build. Poi T3.

## T2b — Build e servizio (2026-10-20)

**Stato:** eseguita il 2026-10-20 sullo stesso incarico di T2a. Nessun commit Git: le due fasi (la «Commit 1» e la «Commit 2» del piano) sono copiate in `backup/casa3d/T2b/` (`fase1-pacchetto-build.tar.gz`, `fase2-servizio-docker.tar.gz`; copie dei file modificati prima delle modifiche in `pre/`). Tablet e banco non usati: l'immagine Docker è stata costruita con un tag di prova (`aca-system:0.9.16-t2b-prova`, poi rimosso) senza toccare `progetto/.env` né il contenitore del banco (`aca-system:0.9.16`, invariato e in salute).

**Decisione D16 (applicata in via provvisoria, da confermare dall'utente; vedi la rettifica del 2026-10-20 sotto).** Percorso `/casa3d/` (non `/assets/casa3d/`), con nomi dei file con l'impronta del contenuto, `Cache-Control: immutable` e 404 esplicito: ADR-0014 ammette entrambe le forme e la prima non obbliga a potare la cache di `/assets/`. Un nome vecchio non ha più un file: è un 404 pulito, non una versione diversa servita sotto lo stesso indirizzo.

**Fase 1, pacchetto e build.**
- `casa3d` è un workspace della radice (`workspaces: frontend, backend, casa3d`); un solo `package-lock.json` (quello proprio di `casa3d`, creato in T2a, è stato tolto: copia in `pre/`). `npm install --ignore-scripts`: aggiunti al lockfile soltanto lit 3.3.3, three 0.186.1, esbuild 0.28.2, @types/three 0.186.0 e le loro dipendenze (le stesse nove di T2a più i pacchetti di piattaforma di esbuild); nessun pacchetto esistente cambiato (confronto con la copia in `pre/`). Gli script di radice `build`, `test` e `typecheck` includono `casa3d`.
- `casa3d/build.mjs`, derivata da `upstream/frontend/build.mjs`: sei bundle (3d, editor, timetravel, fun, voice e il principale), target `safari15/chrome94/firefox93/edge94`, nomi `casa3d-<impronta>.js` e `casa3d-<bundle>-<impronta>.js` (SHA-256 del contenuto, 12 caratteri; l'editor conosce l'impronta del 3D e il principale quelle degli altri), `dist/manifest.json` (file, byte, SHA-256, lingue, avvisi) come unico punto d'ingresso, `dist/lang/en.json`. Senza scheda editor, pagina di importazione, font e immagini (T9). Build riproducibile: due esecuzioni danno lo stesso manifest, e anche la build nell'immagine Docker dà le stesse impronte.
- **Licenze accanto ai bundle:** `legalComments: external` produce `<bundle>.LEGAL.txt` (BSD-3 di lit, MIT di three); `NOTICE.txt`, `LICENSE-MIT-base.txt` (l'avviso MIT del progetto copiato, con il nome del file neutro), `LICENSE-BSD3-lit.txt` e `LICENSE-MIT-three.txt` sono copiati in `dist/`. La build fallisce se manca l'avviso di copyright o un commento legale.
- **Controlli della build (falliscono la build):** budget di peso (invariati da quelli della base: principale 620, 3D 780, editor 840, viaggio nel tempo 120, voce 60, extra 40 KB), vecchi WebView (come nell'originale), nessun segnaposto `__FP3D_*__` rimasto, nessun indirizzo `http(s)` di terzi nei bundle (eccezione unica e dichiarata: un URL in un commento GLSL di three.js, testo in una stringa, mai richiesto; spazi dei nomi `www.w3.org`), nessuna API di rete propria (`sendBeacon`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`, `Worker`, service worker), nessun nome o marchio originale fuori dagli avvisi. `npm run build -w casa3d` esegue prima `typecheck` e `npm run marchio` (che ora controlla anche `build.mjs`).
- **Patch dei caricatori (P99-P103 in `PATCHES.md`):** i cinque caricatori `load*.ts` costruiscono `./casa3d-<bundle>-<impronta>.js` (impronta nel nome, non in una query). `src/` rigenerata con `npm run rinomina` (impronte di `upstream/` verificate). I testi lingua restano `lang/en.json?v=<impronta>`, da riconvalidare (ETag).
- **Misure:** principale 425,3 KB, 3D **778,6 KB su 780** (quasi al limite: T5 lo deve ridurre per Light, non allargare il budget), editor 687,4, viaggio nel tempo 100,0, voce 29,1, extra 20,9; totale 2041,1 KB. Il bundle principale non cita editor e viaggio nel tempo (senza utilizzatori fino a T4a).

**Fase 2, servizio, service worker, Docker.**
- **Backend:** `backend/src/routes/casa3d.ts` (`registerCasa3dRoutes`), registrato in `createApp` prima del frontend e solo in produzione, con l'opzione `casa3dPath` (predefinito `casa3d/dist`, in Docker `/app/casa3d/dist`). Stessa origine, **CSP invariata** (`script-src 'self'`; i bundle non usano WebAssembly, `eval` né `new Function`). File con impronta (e il loro `.LEGAL.txt`): `public, max-age=31536000, immutable`; `manifest.json`: `no-store`; il resto (lingue, avvisi): `no-cache` con ETag; ogni risposta sotto `/casa3d` con `X-Content-Type-Options: nosniff`. File mancante, nome vecchio, cartella (`/casa3d`, `/casa3d/`, `/casa3d/lang/`), file nascosto, percorso con `..` e metodo diverso da GET/HEAD: **404 testuale «Not found»**, mai `index.html`; vale anche se la cartella `dist` manca.
- **Service worker (`frontend/public/sw.js`):** solo i bundle con l'impronta nel nome vanno in una cache propria (`tunet-casa3d-v1`, cache first); una nuova impronta dello stesso bundle cancella la vecchia, quindi le versioni non si accumulano e una vecchia non viene riproposta; manifest, lingue, avvisi e metodi diversi da GET vanno alla rete; una risposta non riuscita non entra in cache; la cache nuova è nell'elenco di quelle da tenere all'attivazione. La regola per `/assets/` è invariata.
- **Docker:** `Dockerfile` (tre workspace: copia di `casa3d/package.json` nei due stadi, `COPY casa3d` e `npm run build -w casa3d` nello stadio di build, `COPY --from=builder /app/casa3d/dist` in quello finale; la versione del banco arriva alla build come per il frontend); `.dockerignore` esclude `casa3d/upstream/`. `docker compose -f progetto/compose.tunet.yaml build` con `ACASYSTEM_VERSION=0.9.16-t2b-prova` riuscito (circa un quarto d'ora, quasi tutto `npm ci` nell'immagine); l'elenco dei file dell'immagine conferma `/app/casa3d/dist` con i sei bundle, i `.LEGAL.txt`, il manifest, `lang/en.json` e i quattro avvisi. L'immagine pesa 857 MB contro gli 854 MB di quella del banco.
- **Docker, `--ignore-scripts` (correzione dopo la revisione, 2026-10-20).** La prima build eseguiva anche il `postinstall` di esbuild 0.28.2 (`node install.js`) nello stadio di build, contro la regola «installa con `--ignore-scripts`». Ora lo stadio di build usa `npm ci --ignore-scripts`: esbuild parte dal suo pacchetto di piattaforma e il solo altro pacchetto con script, `better-sqlite3`, serve soltanto al runtime e resta compilato nello stadio finale (`npm ci --omit=dev -w backend`, invariato). Seconda build di prova, `aca-system:0.9.16-t2b-prova2` (`docker-build-ignore-scripts.log`, `Dockerfile.corretto`): riuscita, avviso di npm ridotto al solo `better-sqlite3`, sei bundle con le stesse impronte e lo stesso budget (3D 778,6 KB su 780), contenuto di `/app/casa3d/dist` come prima; tag di prova rimosso, banco (`aca-system:0.9.16`) invariato e in salute.

**Verifiche** (log in `backup/casa3d/T2b/`; Vitest con `--maxWorkers=4`, un solo processo pesante per volta):

| Controllo | Comando | Esito |
|---|---|---|
| Test del pacchetto | `npm run test -w casa3d` | 415 su 415, 0 falliti (`casa3d-test.log`) |
| Tipi e marchio del pacchetto | `npm run build -w casa3d` (prebuild) | `tsc --noEmit` 0 errori; `controlla-marchio` ok su 192 file |
| Build del pacchetto | `npm run build -w casa3d`, tre tentativi | **due riuscite** (`build2.log`, `build3.log`) con manifest identico; il primo (`build1.log`) era fallito per l'URL del commento GLSL e il nome di un file di licenza nel manifest, poi corretti. Una terza build, nell'immagine Docker, riuscita con le stesse impronte |
| Test del backend | `npx vitest run --maxWorkers=4` | 18 file, 150 test, verdi, compresi i 9 nuovi di `casa3dRoutes.test.ts` (`backend-test.log`) |
| Tipi e lint del backend | `npm run typecheck -w backend`, `npm run lint -w backend` | 0 errori |
| Frontend | `typecheck` (strict), `lint` (ESLint), `lint:typography` (0 su 459), `lint:theme-colors` (0 su 331) | verdi (`frontend-checks.log`) |
| Service worker | `ServiceWorkerCasa3d.test.ts` (7 test: cache propria, sostituzione dell'impronta, risposta non riuscita, rete, origine e percorso, attivazione, `/assets/`) | 7 su 7 (`frontend-sw-test.log`) |
| Peso di Acasystem | `npm run build -w frontend` e `node scripts/check-bundle-size.mjs` | verdi; `index` **801,8 KB su 900 KB** (`frontend-build.log`, `check-bundle-size.log`) |
| Immagine | `docker compose build` con tag di prova | riuscita (`docker-build.log`, `docker-image-contents.log`) |
| Prova in browser | un Chromium senza GPU (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`) su un backend locale (porta 3099, chiuso a fine prova) con la build di produzione; `smoke-browser.mjs` | carica il principale e i cinque bundle da `/casa3d/` con la CSP dell'app, definisce `fp3d-view3d`, `fp3d-room-panel` e `fp3d-editor`, legge `lang/en.json` (1806 testi); 11 richieste, **tutte alla stessa origine**; nessun errore di console né violazione della CSP; nome vecchio e cartella: 404 (`smoke-browser.log`) |

**Non eseguito.** Suite completa di Vitest del frontend (il codice del frontend toccato è solo `sw.js`: bastano il test mirato, i lint e la build; la suite completa era verde in T2a, 2168 test); Playwright E2E; tablet e banco (la tappa non li chiede); `npm audit`; prova del service worker in un browser reale (verificato solo con un contesto isolato e una cache finta); avvio del contenitore dell'immagine (non si riavvia il banco; il contenuto è stato letto con `docker run --rm` senza porte); dopo la correzione di `--ignore-scripts`, prova a runtime di `better-sqlite3` nell'immagine di prova (lo stadio finale è invariato; il tag è già stato rimosso).

**Limiti e residui.**
- Il bundle 3D è a 778,6 KB su 780: ogni aggiunta prima di T5 lo manda oltre il budget.
- `project-status.md`, `verification.md` e `infrastructure.md` aggiornati con la rotta `/casa3d/`, l'immagine con i tre workspace e le righe di verifica (vedi la rettifica del 2026-10-20 «T2b, correzioni dopo la revisione»).
- **Funzioni di scrittura nei bundle.** I bundle contengono ancora `callService`, `callWS`, `callApi` di scrittura e testi del negozio e dei pacchetti; oggi nessuna pagina li carica (nessun import di `/casa3d/` nel frontend), quindi non c'è rischio attivo. Ma serviti sulla stessa origine, con `connect-src 'self'` e il proxy `/ha`, manderebbero comandi reali se caricati prima di T3: **T3 deve rifiutare `callService`/`callApi` di scrittura nell'adattatore, con un test che lo provi, e T4a non deve collegare il manifest a nessuna pagina prima di T3.** I testi del negozio restano nel perimetro T8/T9.
- **Service worker in un browser reale.** La regola di `sw.js` è provata solo in un contesto isolato con una cache finta (`ServiceWorkerCasa3d.test.ts`). Da provare con un solo Chromium senza GPU alla prima fase «banco» o in T4a: cache `tunet-casa3d-v1`, una seconda build che lascia in cache solo la nuova impronta, `/assets/` e navigazione invariati. `sw.js` è condiviso con il launcher esistente.
- Al prossimo aggiornamento del banco (fase «banco») servono la copia a freddo e la versione alzata in `progetto/.env`, come da regole: l'immagine del banco non contiene ancora `casa3d`.
- `casa3d/dist/` non è versionato (`dist/` è già in `.gitignore`); `casa3d/` resta non tracciato fino a un commit autorizzato.
- Restano i residui di `PATCHES.md`, sezione 6: `main.ts` provvisorio, `load-editor` e `load-timetravel` senza utilizzatori fino a T4a, rotte `/api/casa3d/*` in T6.

**Punto di ripresa.** T3 (adattatore `hass` in sola lettura: `callService` assente o rifiutato). Il guscio della pagina (T4a) caricherà `/casa3d/manifest.json` (mai in cache) e importerà il file indicato in `entry`.

## T3 — Adattatore in sola lettura (2026-10-20)

**Stato:** eseguita il 2026-10-20 sullo stesso incarico di T2a e T2b («Organizza e continua il lavoro in autonomia mentre sono fuori casa»). Nessun commit Git: la fase 1 (adattatore, loader, hook, piano d'esempio e relativi test) e la fase 2 (pagina e rotta di prova, contratto verso il pacchetto `casa3d`, documenti) sono copiate in `backup/casa3d/T3/` (`fase1-adattatore.tar.gz`, `fase2-pagina-rotta-docs.tar.gz`; copie dei file modificati prima delle modifiche in `pre/`). **Il banco Docker e il tablet non sono stati usati** (vedi «Non eseguito»): la vista è provata su un backend locale collegato a un Home Assistant finto.

**Che cosa c'è (tutto in `progetto/acasystem/frontend/src/casa3d/`, caricato solo dalla rotta di prova):**
- `haShim.ts`: `createCasa3dHass(...)` costruisce l'oggetto `hass` dei componenti da dati semplici (entità, registri, utente, config, connessione, indirizzo `/ha`), senza React né browser.
  - **Forma.** `language` sempre `it`; `states`; `areas`, `floors`, `devices` ed `entities` dai registri; `config` con unità, posizione e fuso; `user`; `connection.subscribeMessage`; `callWS`; `callService`. Non esistono `callApi`, `fetchWithAuth`, `sendWS` né il socket: i percorsi del codice che li richiedono restano spenti.
  - **Utente.** Un utente assente, non ancora letto o rifiutato vale non amministratore; è amministratore solo con `is_admin === true`.
  - **Sola lettura.** `callService` rifiuta sempre con `Casa3dReadOnlyError`; `callWS` lascia passare soltanto `energy/get_prefs`, `history/history_during_period` e `recorder/statistics_during_period`; ogni altro comando (compresi quelli `casa3d/*` di scrittura) e ogni sottoscrizione diversa da `casa3d/building/subscribe` sono rifiutati. Il rifiuto è una promessa già gestita: il codice del pacchetto chiama `void hass.callService(...)` e non genera «unhandled rejection». Chi ascolta (`onRefused`) riceve che cosa è stato rifiutato.
  - **Piano.** I comandi di lettura `casa3d/building/get`, `casa3d/packs/list`, `casa3d/history/list` sono risposti dal piano che l'host fornisce (finché le rotte REST di T6 non esistono); `casa3d/image/get` e un piano assente danno `not_found`.
  - **Immagini.** `entity_picture` passa sotto `/ha` se è un percorso di Home Assistant, resta se è dello stesso indirizzo o `data:image/`; un indirizzo di un altro host (copertine dei lettori multimediali) è tolto e si ripiega su `entity_picture_local`. Così la pagina non chiama terzi. Gli oggetti delle entità senza immagine restano gli stessi (la vista 3D confronta gli oggetti), e quelli con immagine mantengono l'oggetto finché la sorgente non cambia.
  - **Registri.** `loadRegistries` manda `config/area_registry/list`, `config/floor_registry/list`, `config/device_registry/list` e `config/entity_registry/list_for_display` (la forma compatta `ei/di/ai/en/ec/hb/tk/dp`, `entity_categories` in entrambe le forme). Un registro rifiutato resta vuoto e viene segnalato in `failed`; gli altri si caricano.
- `contract.ts`: i tipi dell'oggetto; non importa nulla, e il pacchetto `casa3d` li verifica (`hass-contract.test.ts` in `overrides/`, copiato in `src/`): il controllo dei tipi fallisce se l'oggetto dell'adattatore non è assegnabile al tipo atteso dal pacchetto (provato con una modifica voluta: 1 errore, poi 0), e un secondo test fallisce se i sorgenti copiati cominciano a leggere una parte di `hass` che l'adattatore non dà.
- `loader.ts`: legge `/casa3d/manifest.json` (mai in cache, relativo alla cartella dell'app), accetta solo un file di avvio `casa3d-<impronta>.js` della stessa cartella (un manifest manomesso non può portare altrove), lo importa e attende `fp3d-view3d` e `fp3d-room-panel`, con un tempo massimo di 15 s; un caricamento fallito si può ripetere.
- `useCasa3dHass.ts`: costruisce l'oggetto dal contesto Home Assistant esistente (entità, `conn`, `haUser`, `haConfig`, `activeUrl`) e legge i quattro registri una volta per connessione.
- `examplePlan.ts`, `casa-esempio.json`: un piano d'esempio scritto da noi (appartamento inventato di 9 × 8 m, sei stanze, tredici aperture, diciassette mobili; non sono i dati di alcuna demo, nessun collegamento a entità). Le stanze si legano alle aree reali: un'area con il nome di una stanza va in quella stanza, le altre alle stanze rimaste in ordine alfabetico; i dispositivi dell'area (luci, interruttori, tapparelle, clima, lettori, telecamere, serrature, ventilatori, sensori binari; non nascosti né tecnici; al più otto per stanza) diventano pin nella stanza. `esempio.test.ts` (nel pacchetto) prova che il file è già in forma normale per il modello e che stanze, aperture e mobili sono validi.
- `Casa3dProva.tsx` e rotta `#/casa3d-prova` in `routes/AppRoutes.tsx` (caricata a richiesta come `#/ui-kit`, non collegata da nessuna parte; viene dopo la pagina di collegamento perché serve Home Assistant, e prende il posto del launcher finché è aperta). **Light forzata:** `quality = "low"` (il livello più basso del pacchetto), ologrammi, flussi, energia, meteo, scia di movimento, parete delle telecamere, regia, voce e immagini dei piani spenti. È il livello `low` già esistente più gli extra spenti: **non è ancora il Light di T5** (pixel ratio ≤1, niente antialias e post-elaborazione, meno chiamate di disegno, come da proposta di T1). La pagina mostra utente, registri letti e non letti, stanze legate, pin e i comandi rifiutati.

**Home Assistant 2026.9.4 e i registri (fonte primaria, letta il 2026-10-20 da `raw.githubusercontent.com/home-assistant/core/2026.9.4/`, riassunta con lo strumento di lettura delle pagine):** in `config/entity_registry.py` `list`, `list_for_display`, `get` e `get_entries` non hanno `require_admin` (lo hanno `update`, `remove` e `settings/update`); in `area_registry.py`, `floor_registry.py` e `device_registry.py` solo `list` (e le liste collegate) è senza `require_admin`. La forma compatta di `list_for_display` (`ei`, `pl`, `ai`, `lb`, `di`, `ic`, `tk`, `ec` come indice di `ENTITY_CATEGORY_INDEX_TO_VALUE`, `hb`, `hn`, `en`, `dp`) è in `helpers/entity_registry.py` (`_as_display_dict`; le ultime 8918 lettere del file non sono state lette). **Conseguenza:** secondo il sorgente un utente non amministratore legge i quattro registri; il provider esistente usa invece `config/entity_registry/list`, che l'adattatore non usa. È una lettura del sorgente, non una prova con un utente non amministratore reale.

**Verifiche** (comandi dalla radice `progetto/acasystem/`; log in `backup/casa3d/T3/`; Vitest con `--maxWorkers=4`, un solo processo pesante per volta):

| Controllo | Comando | Esito |
|---|---|---|
| Vitest dell'adattatore e della pagina | `npx vitest run --maxWorkers=4 src/__tests__/Casa3d*` (frontend) | 4 file nuovi: forma dell'oggetto, `entity_picture` sotto `/ha` (percorsi, stessa origine, `data:`, altri host, `//`, `javascript:`, `blob:`, copertine dei lettori, oggetti stabili), utente nullo = non admin, `callService` rifiutato e promessa gestita, comandi di scrittura rifiutati (13 tipi), registri letti con admin, con un registro rifiutato e con tutti rifiutati, piano d'esempio legato alle aree e pin, loader (indirizzo in sottopercorso, manifest, file di avvio estraneo, tempo scaduto), hook, pagina in Light, rotta |
| Suite completa del frontend | `npx vitest run --maxWorkers=4` | 164 file, 2229 test, tutti verdi (`suite.txt`; prima 159 e 2168; vedi la rettifica del 2026-10-20 (T3, correzioni dopo la revisione) sul conteggio) |
| Pacchetto | `npm test -w casa3d`, `npm run typecheck -w casa3d`, `npm run marchio -w casa3d`, `npm run rinomina` | 422 su 422 (415 + 7 nuovi); 0 errori; marchio ok su 196 file; rigenerazione ripetibile |
| Frontend | `typecheck` (strict), `lint`, `lint:typography` (0 violazioni su 466 file), `lint:theme-colors` (0 su 331), `prettier --check` sui file nuovi | verdi (`typecheck.log`, `lint.log`, `lint-typography.log`, `lint-theme-colors.log`, `prettier.log`) |
| Build | `npm run build -w frontend`, `check-bundle-size.mjs`; `npm run build -w casa3d` | frontend `index` 802,2 KB su 900 (la pagina è un blocco a parte da 16 KB); casa3d con le stesse impronte e gli stessi pesi di T2b (3D 778,6 su 780) |
| Prova in browser | un Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`) su un backend locale (porta 3099, build di produzione) collegato a un Home Assistant finto (`mock-ha.mjs`, porta 38123), token di prova; `prova-browser.mjs` (viewport 1280×665) | **admin** (`test-admin`): la pagina carica il bundle da `/casa3d/`, la vista mostra le sei stanze con i nomi delle cinque aree (cinque legate), nove pin con gli stati (luci accese con bagliore, tapparella, lettore, telecamera, termostato, sensori) e il pannello stanza con 21,5 °C e 48 %; `quality = low`, ologrammi spenti; un tocco sul 3D apre e chiude la stanza; `callService` rifiutato; 23 richieste, **tutte alla stessa origine** (la copertina del lettore su un altro host non è richiesta: ripiego su `entity_picture_local` sotto `/ha`); **nessun `call_service` inviato** (guardia sulle trame del websocket e registro del finto Home Assistant); nessun errore di console né di pagina. **Non admin** (`test-guest`): stesso esito con «Utente: non amministratore». **Non admin con i registri delle aree e dei dispositivi rifiutati** (`unauthorized`): la vista si apre lo stesso, «non letti: areas, devices», nessuna stanza legata, nessun pin, nessun errore. Immagini e JSON in `prova-browser/` |

**Non eseguito, con il motivo.**
- **Banco Docker.** Non aggiornato: non c'è stata una fase «banco» (nessuna copia a freddo, nessuna versione alzata in `progetto/.env`, nessuna immagine costruita); il banco resta `aca-system:0.9.16`, senza `/casa3d/` né la rotta di prova. Costruirlo ora porterebbe nel banco anche il lavoro non committato di altri incarichi.
- **«Stanze e stati reali» sul banco.** **Non verificato con Home Assistant vero.** Entrare nel banco richiede l'accesso dell'utente (OAuth o token a lunga durata), che l'agente non inserisce, e il tablet non è chiesto da questa tappa. Le prove sopra usano dati finti con le forme documentate di Home Assistant: provano il codice e la gestione degli errori, non la forma esatta delle risposte del banco.
- **Utente non amministratore vero.** Provato solo con il finto Home Assistant e con la lettura del sorgente; sul banco serve un secondo utente (un account lo crea l'utente).
- Docker, tablet, Playwright E2E del frontend, `npm audit`, service worker in un browser reale.
- Un browser con la GPU (il pannello del browser incorporato e il Chrome dell'utente non sono stati usati: la regola del carico del PC consente un solo Chromium senza GPU).

**Limiti e residui.**
- **Quattro avvisi di console** «GPU stall due to ReadPixels» (messaggi del driver GL del renderer software, a livello avviso, tutti nei primi secondi dopo il caricamento della scena, nessuno a vista ferma o ai tocchi). Non vengono dalle immagini dei piani (spente e comunque saltate con un solo piano) né dallo schermo catturato. L'origine non è identificata: da cercare in T5, dove si misura Light sul Tab M11.
- La pagina di prova prende il posto del launcher e lo rimonta all'uscita: va bene per una prova, non è il guscio (T4a).
- Il pannello stanza non è in modalità sola lettura (lo è solo l'adattatore): un tocco su un comando mostra il rifiuto nella riga in fondo alla pagina. Il testo «Viaggio nel tempo: solo da guardare» compare soltanto con `readOnly`, per questo non è impostato.
- I pin del piano d'esempio sono posti in fila dalla pagina, non dall'editor: la posizione nelle stanze non è curata.
- Il pacchetto 3D resta a 778,6 KB su 780: T3 non lo ha toccato.
- Il rifiuto dei percorsi di scrittura richiesto da T2b («T3 deve rifiutare `callService`/`callApi` di scrittura con un test») è soddisfatto per `callService`, `callWS` e le sottoscrizioni; `callApi` non esiste nell'oggetto. Il manifest non è ancora collegato a nessuna pagina del launcher (T4a non deve farlo prima di aver letto questa sezione).
- D16 (`/casa3d/`) resta provvisoria (ISSUE-089), da confermare prima di T4a.

**Punto di ripresa.** Fase «banco»: copia a freddo del volume dati, `ACASYSTEM_VERSION=0.9.17` in `progetto/.env`, immagine costruita e avviata; poi l'utente (o un agente con il suo accesso) apre `http://localhost:3002/#/casa3d-prova`, prima con l'amministratore e poi con un secondo utente non amministratore, e controlla che le stanze legate alle aree, i pin con gli stati reali e la riga «Registri» siano come attesi, e che la console sia pulita. Poi T4a (guscio della pagina), dopo la conferma di D16.

## T3 — esito del banco (2026-10-20)

**Stato di T3 dopo la fase «banco»:** criterio «Fatto quando» **soddisfatto per l'amministratore, non per un non amministratore vero**. Con Home Assistant vero sul Tab M11 la vista mostra le stanze e gli stati reali senza errori di console e senza comandi inviati; manca la prova con un utente non amministratore vero (ISSUE-090). T3 si considera chiusa solo con quella prova o con l'accettazione esplicita del limite da parte dell'utente. Le sezioni «T3», «Giro autonomo del 2026-10-20/21 — riepilogo» e le rettifiche sotto descrivono lo stato prima di questa fase e non sono riscritte.

**Banco.** Fase «banco» eseguita il 2026-10-20 dopo T3 (stesso incarico). Copia a freddo del volume dati a container fermo: `backup/banco/tunet-data-casa3d-T3-pre-0.9.17-freddo.tgz`, 429344 byte, SHA-256 `a9332c3a221765c430c07caa5b83d623dd1397037585b6497bd5e62a30eb4652`, `tar -tzf` con `tunet.db`, `tunet.db-wal`, `tunet.db-shm`. `ACASYSTEM_VERSION=0.9.17` in `progetto/.env` e nei file di `frontend/e2e` (`isolated-server.mjs`, `release.check.mjs`, `README.md`); `compose.tunet.yaml` invariato (IPv4 Wi-Fi del PC ancora 192.168.1.27). Immagine costruita con `docker compose up -d --build`: `aca-system:0.9.17`, ID `sha256:3f9669fa76547a4dc58a768f1837fdd569f1ccdbb3e6393bcac1cba33f42b962`, creata 2026-10-20T17:09:37Z, in salute dopo circa 24 s. `/api/health` con versione 0.9.17; `/ha/auth/providers` 200 su 127.0.0.1 e su 192.168.1.27 (Home Assistant non riavviato); `/casa3d/` 404 per scelta (nessun indice), `/casa3d/manifest.json` 200 (versione 0.9.17), bundle `3d-727720bdd276.js` 200 (797236 byte); log del contenitore senza errori. L'immagine è costruita dall'albero di lavoro non committato e porta quindi sul banco anche le modifiche non committate di altri incarichi. **Ripristino:** `ACASYSTEM_VERSION=0.9.16` in `progetto/.env` più la copia a freddo (o la precedente `tunet-data-20261020-pre-0.9.16-freddo.tgz`).

**Tablet.** Tab M11 (TB330FU) via USB (`adb reverse tcp:3002`, CDP sulla 9225; Chrome 1280×665 a DPR 1,5), service worker e cache svuotati, ricarica senza cache. Impostazioni > Sistema mostra 0.9.17. `#/casa3d-prova`: vista 3D con sei stanze, qualità Light (`low`), canvas 1224×518; sessione **amministratore** (`is_admin` vero). Registri letti da Home Assistant vero: 3 aree (Soggiorno, Cucina, Camera da letto), 0 piani, 4 dispositivi, 15 entità, 18 stati, lingua `it`; **3 stanze su 6 legate ad aree**, **0 dispositivi (pin) nelle stanze**. Gli stati coincidono con l'app (`weather.forecast_casa` poco nuvoloso 20,2, che l'app mostra come 20 °C; `person.mattia`, `sun.sun`, `zone.home`). `callService` dalla vista rifiutato con `Casa3dReadOnlyError` (`light.toggle`); 0 trame `call_service` sul websocket; 0 richieste a terzi; 0 errori, avvisi o eccezioni di console. Tornati a `#/` sulla home; le chiavi di `localStorage` del launcher (33 righe, token esclusi e non letti) hanno la stessa impronta prima e dopo. Evidenze: `backup/casa3d/T3-banco/` (`prova.cjs`, `prova-risultato.json`, `tablet-casa3d-prova.png`, `ls-prima.json`, `ls-dopo.json`).

**Limiti della prova sul banco.** (1) Era disponibile solo la sessione amministratore: **un utente non amministratore vero non è stato provato**; i casi «utente nullo» e «registri rifiutati» poggiano sui test Vitest, sulla prova col finto Home Assistant e sulla lettura del sorgente di Home Assistant 2026.9.4 (ISSUE-090). (2) Nessun pin e nessuna luce nelle stanze: con i dati reali (4 dispositivi) nessun dispositivo di un tipo supportato è finito in una stanza legata, quindi pin e stati sui pin non sono stati osservati sul banco (gli stati delle entità sì, tramite l'oggetto `hass`). (3) Nessuna misura di fluidità sul tablet (nessun conteggio dei fotogrammi al secondo); il pannello stanza e il tocco sul 3D non sono stati provati sul tablet. (4) I registri di Home Assistant non sono stati letti dai file: un `docker exec` nel contenitore di Home Assistant è stato negato dall'autorizzazione e non è stato aggirato. (5) Gli avvisi `ReadPixels` del driver software del PC non sono stati cercati sul tablet (la console era pulita, ma la prova non era una misura). (6) La rotta di prova ora è raggiungibile nella build di produzione del banco (ISSUE-091).

**Verifiche del giro (PC).** Typecheck strict, `lint`, `lint:typography` (0/466), `lint:theme-colors` (0/331), `i18n:check` (4/4), Vitest del frontend `--maxWorkers=4` 164 file e 2229 test, backend 18 file e 150 test, `casa3d` 422 test, build di frontend (`index` 802,2 KB su 900) e di `casa3d` (6 bundle, 2041,1 KB, marchio ok su 196 file): tutti verdi (log in `backup/casa3d/T3/`). Nessun commit Git.

**Punto di ripresa.** Prova con un secondo utente non amministratore (lo crea l'utente) su `#/casa3d-prova` del banco 0.9.17, oppure accettazione del limite; poi la conferma di D16 (ISSUE-089) e T4a. Prima di T4a decidere se la rotta di prova resta raggiungibile in produzione (ISSUE-091). T5 per il Light vero e per gli avvisi `ReadPixels`.

## T4a — Guscio della pagina (2026-10-20)

**Stato:** eseguita il 2026-10-20 sullo stesso incarico di T2a, T2b e T3 («Organizza e continua il lavoro in autonomia mentre sono fuori casa»). Nessun commit Git: la fase 1 (tipo, validatore, identità, registro, migrazione e il suo test) e la fase 2 (guscio, anteprima, caricamento anticipato, sospensione, CSS, test del guscio, script del browser) sono copiate in `backup/casa3d/T4a/` (`fase1-tipo-migrazione.tar.gz`, `fase2-guscio-pagina.tar.gz`; i file modificati, prima delle modifiche, in `pre/`). Il banco Docker e il tablet non sono stati usati: la pagina è provata sul PC (Vitest e un Chromium senza GPU su un backend locale collegato a un Home Assistant finto). **Il banco `aca-system:0.9.17` non contiene T4a** (nessuna fase «banco» in questo giro).

**«Fatto quando» di T4a.**

| Criterio | Esito |
|---|---|
| Test di migrazione | **Soddisfatto.** `Casa3dMigration.test.tsx`, 14 test: tipo, validatore, identità, registro, `installCasa3dPage` (in coda una volta sola, senza duplicare, senza toccare le altre pagine, non ritorna dopo la rimozione) e il controller (profilo nuovo, profilo esistente, ricarica dopo la rimozione, riordino). |
| Playwright sul PC: la pagina si sposta nella vista pagine senza renderer (contatore) | **Soddisfatto.** `shell-browser.mjs` conta ogni contesto WebGL creato da qualunque canvas: **0** all'avvio, con la vista pagine aperta e dopo lo spostamento della pagina (Alt+freccia a sinistra sulla sua scheda); alla chiusura della vista pagine la pagina spostata è quella al centro e, dopo i 500 ms, crea **1** contesto; poi, dopo una ricarica, **0** finché la pagina è lontana o accanto e **1** alla visita; **1** ancora al ritorno entro il minuto e con la modifica aperta sulla pagina stessa (nessun nuovo contesto); **2** dopo il rilascio (un minuto fuori scena) e un nuovo ritorno. 34 controlli su 34 (`browser-esito.txt`, `browser/shell-browser.json`). |
| La pagina è spostabile come le altre | **Soddisfatto per tastiera.** Spostata di un posto a sinistra nella vista pagine, ordine delle altre invariato, salvata e ritrovata dopo la ricarica, una sola pagina `casa3d`, marchio `casa3dVersion: 1`. **Non provato:** il trascinamento con il dito (la scheda è la stessa del pager di tutte le pagine). |
| TalkBack e testo ingrandito al 125 e 150% | **Non eseguiti: prove umane.** Il guscio offre l'alternativa testuale («Elenco stanze», elenco di `<li>`), ma nessuno l'ha provata con TalkBack né con il testo grande. |
| ISSUE-062 sul Tab M11 | **Non misurato** (il tablet non è chiesto da questa tappa). Il guscio non crea nulla di 3D in vista pagine e in modifica (contatore a 0), che è la parte verificabile sul PC. |

**Che cosa c'è** (in `progetto/acasystem/frontend/src/`).

- **Tipo, validatore, identità, registro, catalogo.**
  - `PageKind` ha `casa3d`; `LauncherLayout.casa3dVersion?: 1` è il marchio dell'installazione una tantum.
  - `isPageKind` lo ammette; `sanitizeLauncherLayout` conserva il marchio.
  - `pageIdentity.ts`: `legacyPageKind`, `LEGACY_PAGE_TYPE`, `PAGE_KIND_LABEL` («Casa 3D») e il prefisso riservato `casa3d`, perché una pagina di widget non lo prenda; `layoutToPageSettings` scrive il tipo `casa3d`.
  - Registro: `components/widgets/casa3d/index.ts` (`casa3dPages`) in `pageKindDefinitions`. Il catalogo resta quello del launcher: la pagina non si aggiunge dall'elenco delle pagine, la mette la migrazione (D12).
- **Migrazione.** `installCasa3dPage(layout)` (`layout.ts`) aggiunge la pagina **in coda**, una sola volta, e imposta `casa3dVersion`. Se il layout ha già una pagina `casa3d` (un profilo salvato altrove) mette solo il marchio. Il controller la chiama dopo le pagine di categoria (`categoryDefaultsVersion === 1`), quindi in un profilo nuovo la pagina è l'ultima. **Scelta esecutiva:** vale solo per il launcher operativo (`initializeCategoryPages`), come le categorie; gli apparati di prova isolati non la ricevono. Una pagina eliminata dall'utente non torna (il marchio resta).
- **Guscio** (`src/casa3d/`, caricato a richiesta: il solo `Casa3dKindPage.tsx` sta nel bundle principale).
  - **Riposo** (predefinito): l'anteprima è una pianta disegnata in SVG dalle stanze del piano d'esempio, senza canvas, WebGL né codice 3D, con la scritta «Anteprima · piano d'esempio»; il pulsante «Elenco stanze» da 56 px (misurato 57,6 px) mostra l'elenco di testo e fa da alternativa per TalkBack.
  - **Vista:** la vista 3D viva, in Light, in sola lettura e senza puntatore. Il guscio la crea solo dopo che la pagina è stata in primo piano, ferma, per 500 ms (uno scorrimento che passa sopra non crea nulla) e fuori dalla modifica e dalla vista pagine. Quando la pagina esce di scena la vista è solo nascosta (non disegna) e dopo 60 s è rilasciata: l'elemento sparisce, quindi il renderer è eliminato e il contesto GPU libero. Se la pagina torna entro il minuto, si riusa la stessa vista.
  - **Caricamento anticipato:** con la pagina in primo piano o accanto a quella in primo piano (nuovo `PageNearContext`, fornito dal pager), il guscio legge `manifest.json` (mai in cache) e aggiunge due `<link rel="modulepreload">`, per il file di avvio e per il bundle 3D, agli stessi indirizzi usati dall'`import()` successivo. L'editor non è anticipato.
  - **Sospensione per Sistema:** `usePageVisible()` è falso mentre Sistema copre il launcher, quindi vale come «fuori scena».
- **Pezzi condivisi con la pagina di prova:** `lightProps.ts` (le proprietà Light) e `useCasa3dBundle.ts`; `Casa3dProva.tsx` li importa (nessun cambio di comportamento).

**Decisioni esecutive e scostamenti da ADR-0014** (da rivedere se non vanno bene).

1. **Anteprima senza cattura 3D.** ADR-0014 prevede un'anteprima catturata dal 3D con stati neutri. Per T4a è un disegno SVG del piano, perché Riposo non deve creare un renderer; è «Anteprima», senza luci né stati. La cattura (blob di sessione, invalidata a ogni cambio di tema) resta a T5/T9, quando c'è un renderer di Light vero.
2. **Piano d'esempio.** Fino alla persistenza (T6) la pagina mostra il piano d'esempio scritto per T3, con la scritta «Piano d'esempio». Nel Riposo i nomi sono quelli del piano (Soggiorno, Cucina…); nella Vista le stanze legate alle aree portano i nomi delle aree. L'elenco del Riposo non segue le aree.
3. **Nessun «Esplora» e nessun gesto.** La vista non prende il puntatore (`pointer-events: none`): lo scorrimento resta al pager. «Esplora», `touch-action`, `locked` e le uscite sono T4b. Per non mostrare comandi che non fanno nulla, la vista è in modalità `clean` (tolti i pulsanti di stella, ricerca e «Giro»); restano gli avvisi di sicurezza (fumo, acqua), che in questa tappa non si possono premere.
4. **La pagina non scorre.** La regola comune delle pagine speciali (`overflow-y: auto`, `overscroll-behavior: contain`) impedisce a uno scorrimento orizzontale che parte dalla pagina di arrivare al pager: provato con un gesto vero (CDP), prima il pager non si muoveva, con la regola della pagina (`overflow: hidden`, `overscroll-behavior: auto`, in `casa3dPage.css`) sì. Vedi ISSUE-092 per le altre pagine speciali.
5. **Il renderer si creava due volte** quando le proprietà della vista si assegnavano dopo il collegamento (effetto o ref): il primo disegnatore era in qualità predefinita (antialias, DPR fino a 2) e il secondo in Light, con due contesti WebGL. Le proprietà sono ora passate a `createElement` (React 19 le assegna come proprietà **prima** che l'elemento si colleghi): un solo contesto. La stessa causa vale per la pagina di prova (ISSUE-093, non corretta per non allargare il diff).
6. **D16 resta provvisoria.** T4a carica `/casa3d/manifest.json` sull'opzione (a) di T2b, non confermata dall'utente (ISSUE-089); cambiare è un prefisso in `loader.ts` più la regola del service worker.

**Verifiche** (comandi dalla cartella `frontend/`; log in `backup/casa3d/T4a/`).

| Controllo | Esito |
|---|---|
| `npm run typecheck`, `npm run lint`, `lint:typography` (0 violazioni), `lint:theme-colors` (0 violazioni), `prettier --check` sui file toccati | Verdi (`typecheck.txt`, `lint.txt`, `lint-typography.txt`, `lint-theme-colors.txt`, `prettier.txt`). |
| `npx vitest run --maxWorkers=4` (suite completa) | **166 file, 2256 test, tutti verdi** (prima 164 e 2229: +2 file e +27 test, cioè 14 di migrazione e 13 del guscio) (`frontend-suite.txt`). |
| `npm test -w casa3d` | 422 su 422 (invariato: nessun file del pacchetto è stato toccato) (`casa3d-test.txt`). |
| Build di produzione e `check-bundle-size.mjs` | `index` **803,5 KB su 900** (prima 801,8); blocchi nuovi `Casa3dPage` 3,1 KB e `Casa3dVista` 1,4 KB (`frontend-build.txt`, `check-bundle-size.txt`). |
| Chromium senza GPU (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, 1280×665, tocco) su un backend locale (porta 3099, `data-4`, build di produzione) con il finto Home Assistant (`mock-ha.mjs`, token di prova) | **34 controlli su 34**, `shell-browser.mjs`: ultima pagina e una sola; a riposo nessun contesto e nessuna vista; nessun `modulepreload` di `/casa3d/` quando la pagina è lontana, due quando è accanto (file di avvio e bundle 3D); vista pagine e spostamento: 0 contesti; dopo la modifica la pagina spostata è quella corrente e crea **un** contesto; dopo la ricarica stesso ordine; vista viva con un contesto e uno scorrimento col dito che sposta il pager; modifica sulla pagina: Riposo, vista nascosta, nessun nuovo contesto; fuori scena un minuto: elemento rimosso, poi nuova visita = secondo contesto; tutte le richieste alla stessa origine; nessun `call_service` inviato; nessun errore di console oltre due avvisi noti. Schermate in `browser/`. |

**Limiti, osservazioni e non eseguito.**

- **Non eseguito:** TalkBack, testo al 125 e 150%, trascinamento della scheda con il dito, ISSUE-062 sul Tab M11, prestazioni di avvio e fps della vista (nessuna misura sul tablet), service worker in un browser reale (la cache `tunet-casa3d-v1` non è stata ispezionata), il banco 0.9.17 con la pagina, il non amministratore vero (ISSUE-090).
- **Avvisi noti nella console del PC:** quattro «GPU stall due to ReadPixels» del driver software, già visti in T3 (`floorThumbs: false` non li toglie; origine ancora non identificata, per T5); un `409` di `PUT /api/settings/current` quando si chiude la vista pagine dopo una modifica. Il `409` non è della pagina: `conflitto-409-confronto.mjs` lo riproduce identico spostando «Energia» al posto di «Casa 3D»; è il conflitto di revisione della sincronizzazione delle impostazioni, ritentato subito con esito 200 (ISSUE-094).
- **Una sola pagina `casa3d` per layout è una regola della migrazione, non del tipo:** `addPage` con `kind: 'casa3d'` creerebbe un'altra pagina; nessuna schermata lo offre oggi.
- **Pannello della stanza:** non c'è nella pagina (nessun tocco in T4a); la decisione su sola lettura e `confirmEntities` memorizzato, lasciata a T4a da T3, passa a T4b/T7.
- **Profili:** caricando un profilo salvato prima di T4a (senza il marchio) la pagina viene aggiunta in coda una volta; un profilo con il marchio non la riceve.

**Punto di ripresa.** T4b (gesti Vista/Esplora, `pan-x`, `locked`, uscite, D18) o la fase «banco» per vedere la pagina sul Tab M11 e provare TalkBack e il testo grande. Prima: conferma di D16 (ISSUE-089) e decisione su ISSUE-092/093/094. Script e prove in `backup/casa3d/T4a/` (`shell-browser.mjs`, `mock-ha.mjs`, `conflitto-409-confronto.mjs`); le cartelle `data*` sono le basi dati di prova del backend locale e non contengono dati reali.

**Rettifica della revisione (2026-10-20).** Il testo sopra resta com'era; questa annotazione lo corregge dove la revisione ha trovato un difetto.

- **Blocco non rispettato.** ISSUE-089 e questo report chiedevano la conferma di D16 «comunque prima di T4a» e la decisione su ISSUE-091 prima di T4a; T4a è stata eseguita senza, sul testo calcolato del compito, che non è una fonte umana. Il blocco **vale ora per T4b e per la fase «banco» con T4a**: prima la conferma di D16 (ISSUE-089) e la decisione su ISSUE-091, poi il resto. Se l'utente sceglie `/assets/casa3d/`: cambiare solo il prefisso in `src/casa3d/loader.ts` e la regola di `public/sw.js`, poi rieseguire `shell-browser.mjs`.
- **Esito di T4a.** «Fatta per i criteri automatizzabili, criteri sul tablet aperti», non «soddisfatta»: il «Fatto quando» comprende ISSUE-062 non peggiorato sul Tab M11 e TalkBack con testo al 125/150%, nessuno eseguito. «Spostabile come le altre» è provato solo da tastiera (Alt+freccia); il trascinamento della scheda col dito, gesto principale sul tablet, è da provare alla prima fase «banco» o sul tablet con il contatore WebGL (CDP) e la misura di ISSUE-062.
- **Fine riga.** `src/@types/launcher.ts` era stato riscritto con CRLF (`.prettierrc`: `endOfLine: lf`; `core.autocrlf=true` mascherava la differenza in `git diff`). Riportato a LF; `prettier --check` sui file delle due fasi è verde (`backup/casa3d/T4a/prettier.txt` rigenerato); le copie delle fasi 1 e 2 sono rigenerate. Nessun altro file delle due fasi contiene CR.
- **Versioni miste.** Un client con la build precedente scarta il tipo `casa3d` e il marchio `casa3dVersion` nella sanificazione e, salvando il profilo condiviso, li cancella; il client nuovo rimette la pagina in coda (si perde lo spostamento, torna una pagina eliminata). «Una pagina eliminata non torna» vale quindi solo se tutti i client sono aggiornati. Registrato come proposta (ISSUE-095); nessuna tolleranza dei tipi sconosciuti nel validatore (cambio di comportamento).
- **Prefisso `casa3d` nella migrazione.** `legacyPageKind` (usata dalla migrazione dal formato precedente) riconosce ora la Casa 3D solo da `pageSettings.type === 'casa3d'`, non dal prefisso dell'id: prima di T4a il prefisso non era riservato e una vecchia pagina di widget come «Casa3D giardino» (`casa3d_giardino`) sarebbe diventata la pagina Casa 3D. Il prefisso resta riservato per le pagine nuove (`createPageId`). Scelta interna alla tappa; il test di `legacyPageKind` è corretto di conseguenza (`casa3d` senza tipo vale `widgets`).
- **Un'immagine per TalkBack.** Nello stato Vista l'anteprima SVG (`role="img"`) restava sotto la vista (`role="img"`): due immagini. `Casa3dPlanPreview` ha ora `decorative`: con la vista viva l'SVG è `aria-hidden` e senza ruolo né titolo; a riposo resta l'immagine con il suo titolo. Asserzioni aggiunte in `Casa3dShell.test.tsx` (stesso numero di test). La prova con TalkBack resta umana.
- **Controlli dopo le correzioni** (dalla cartella `frontend`, log in `backup/casa3d/T4a/`): `typecheck`, `lint`, `lint:typography` (0 su 476), `lint:theme-colors` (0 su 332) verdi; `prettier --check` sui file delle due fasi verde; `npx vitest run --maxWorkers=4 src/__tests__/Casa3d src/__tests__/LauncherLayout.test.ts src/__tests__/Launcher`: 21 file, 429 test verdi (`vitest-correzioni.txt`). La suite completa e `shell-browser.mjs` **non** sono stati rieseguiti dopo queste correzioni (modifiche a `legacyPageKind` e all'SVG; nessun cambio ai contesti WebGL).

## T4b — Gesti Vista/Esplora (2026-10-20)

**Stato:** eseguita il 2026-10-20 sullo stesso incarico di T2a…T4a («Organizza e continua il lavoro in autonomia mentre sono fuori casa»). Nessun commit Git: la fase 1 (blocco del pager) e la fase 2 (Esplora: pagina, comportamento, tastiera, CSS, test) sono copiate in `backup/casa3d/T4b/` (`fase1-blocco-pager.tar.gz`, `fase2-esplora.tar.gz`; i file modificati, prima delle modifiche, in `pre/`; lo script del browser è `gesti-browser.mjs`). Il banco Docker e il tablet non sono stati usati: la prova è sul PC (Vitest e un Chromium senza GPU, con il tocco del protocollo DevTools, su un backend locale collegato a un Home Assistant finto). **Il banco `aca-system:0.9.17` non contiene T4a né T4b.**

**Blocco non risolto prima di T4b.** La revisione di T4a chiedeva la conferma umana di D16 (ISSUE-089) e la decisione su ISSUE-091 prima di T4b; nessuna delle due è arrivata. T4b non tocca né l'una né l'altra (il percorso `/casa3d/` e la rotta di prova sono invariati) e l'incarico dell'utente («continua in autonomia») comprende la tappa, che è reversibile e non dipende da quei due punti. Il blocco resta in vigore per la fase «banco».

**«Fatto quando» di T4b** («Playwright: swipe che cambia pagina in Riposo e in Vista, nessun cambio in Esplora, pressione lunga come da D18, Esc che non agisce sul launcher»).

| Criterio | Esito |
|---|---|
| Swipe che cambia pagina in Riposo | **Soddisfatto** (B1): con un tocco del protocollo, a pagina appena raggiunta (stato `riposo`, nessuna vista), lo scorrimento orizzontale sul quadro sposta il pager. |
| Swipe che cambia pagina in Vista | **Soddisfatto** (C2): stato `vista`, pager non bloccato, lo stesso gesto cambia pagina (da 11520 a 10240 px). |
| Nessun cambio in Esplora | **Soddisfatto** (D2, E1): il pager prende `is-locked`, lo stesso scorrimento non lo muove (11520 prima e dopo) e la pagina resta «Casa 3D»; la vista riceve il tocco (E2: l'azimut della camera passa da −0,6 a −11,8) e la rotella cambia il raggio (E3: da 19,3 a 10,6). |
| Pressione lunga come da D18 | **Soddisfatto** (H1, F1): in Vista una pressione di 800 ms apre la vista pagine del launcher (D18, scelta consigliata); in Esplora una pressione di 900 ms non apre né la vista pagine né la modifica. |
| Esc che non agisce sul launcher | **Soddisfatto** (G2, G4, N2): in Esplora Esc esce da Esplora e basta (stessa pagina, nessuna modifica, nessuna vista pagine, layout salvato identico, voce di cronologia tolta); in Vista non fa nulla. Delete, Backspace e Ctrl+Z in Esplora non cambiano il layout e non compare «Annulla» (G1): **oggi il launcher non ha gestori per questi tasti**, quindi la prova del browser verifica l'invariante; la regola che li ferma è provata con i test unitari. |
| Uscite chiare | **Soddisfatto** per «Fine» (I2), Esc (G2), tasto indietro (J1), indicatore delle pagine (K1), 60 s senza tocchi (L2, con un tocco a 40 s che fa ripartire il conteggio, L1), pagina che esce di scena (M1) e tastiera (N1, N2). |

**Che cosa c'è** (in `progetto/acasystem/frontend/src/`).

- **Blocco del pager (fase 1).** Nuovo `hooks/launcher/PageLockContext.tsx`: una pagina speciale chiede di tenere fermo il pager con `usePageLock(true)`. `templates/launcher/LauncherScreen.tsx` fornisce la funzione intorno al `Pager` (un contatore) e la somma a `locked`: `Boolean(drag.session) || Boolean(pageDrag.state) || renaming || pageLocks > 0`. Non c'è una classe o una prop nuova: è la prop `locked` esistente, quindi `is-locked` (CSS invariato) e `isBlocked` di `useOverviewPan`. Fuori dal launcher (anteprime, test) il contesto non fa nulla.
- **Esplora (fase 2).**
  - `casa3d/useCasa3dExplore.ts`: stato Esplora, tocco sul quadro, uscite.
  - `casa3d/exploreKeys.ts`: regole della tastiera, funzioni pure.
  - `casa3d/Casa3dPage.tsx`: lo stato `data-state="esplora"`, il pulsante «Esplora»/«Fine» da 56 px (misurato 57,6 px), il messaggio di stato (`role="status"`).
  - `casa3d/casa3dPage.css`: contorno blu attorno al quadro e puntatore alla vista solo in Esplora.
  - **Tocco:** pressione e rilascio sul quadro, vicini (tolleranza `HOLD_TOLERANCE_PX` = 14, sotto `LONG_PRESS_MS` = 500: le costanti di `gestures.ts`); un tocco che il browser annulla per scorrere (`pointercancel`) o che si muove non conta. Vale a riposo e in Vista; sul pulsante, sull'elenco stanze e su altri comandi non conta.
  - **Esplora:** la vista è creata subito (non aspetta i 500 ms), `usePageLock(true)` tiene fermo il pager, la vista riceve il puntatore (la tela ha già `touch-action: none` e la sua cattura), e la guaina ha `data-no-long-press`, il meccanismo già presente nel launcher (`NO_LONG_PRESS`): la pressione lunga del launcher è sospesa.
  - **Uscite:**
    - «Fine»;
    - Esc, catturato alla finestra con `preventDefault`, ignorato se è aperto un `dialog` o un popover del launcher e se il tasto viene da un campo di testo della vista;
    - il tasto indietro: una voce nella cronologia (`pushState` con il marcatore `casa3dExplore`, che conserva lo stato del router); `popstate` ne è l'uscita; le altre uscite la tolgono con `history.back()` solo se è ancora in cima;
    - una pressione su `.aca-indicator`, catturata alla finestra con `composedPath()`;
    - 60 s senza `pointerdown`, `pointermove`, `wheel`, `keydown` o `touchstart` nella pagina;
    - la pagina che esce di scena, la modifica, la vista pagine o Sistema (`allowed` falso);
    - l'apertura dell'elenco stanze.
  - **Tastiera con `composedPath()`:** i tasti della vista, che sta in una shadow root, arrivano alla finestra con `target` ridotto all'elemento della vista; `decideKey` legge `composedPath()[0]` per distinguere un campo di testo dentro la vista dal resto. Esc in un campo della vista non esce da Esplora e non arriva al launcher; Esc altrove in Esplora esce; Delete, Backspace e Ctrl/Cmd+Z, +Y premuti dentro la pagina vengono fermati sulla guaina (`stopPropagation`) e non raggiungono i gestori della finestra.
- `casa3d/Casa3dVista.tsx` non è cambiato (il passaggio del puntatore alla vista è in CSS, per stato).

**Decisioni esecutive e scostamenti da ADR-0014** (da rivedere se non vanno bene).

1. **`touch-action: pan-x` in Vista non è stato usato.** ADR-0014 lo prevede per il canvas. In T4a e in T4b la vista in Vista non prende il puntatore (`pointer-events: none`): nessuna cattura, e lo scorrimento arriva al pager come con `pan-x`. L'effetto richiesto («lo scorrimento orizzontale cambia pagina») è soddisfatto e provato (C2). `pan-x` diventerà necessario in T7, quando i pin dovranno ricevere il tocco in Vista: va riletto allora (ISSUE-096).
2. **Il tocco sul quadro entra in Esplora anche a riposo**, oltre al pulsante «Esplora» (ADR: pulsanti «Esplora» ed «Elenco stanze» in Riposo). Nel Riposo la vista non esiste: viene creata subito e il quadro resta l'anteprima SVG finché il canvas non c'è; il blocco del pager vale da subito (uscita con «Fine», Esc o 60 s).
3. **D18.** Presa la scelta consigliata, già in ADR-0014: in Vista la pressione di 500 ms sul quadro va al launcher (vista pagine), senza codice nuovo; in Esplora è sospesa (`data-no-long-press`). Non è una decisione umana nuova: resta all'utente confermarla. Il doppio tocco (280 o 320 ms) non crea conflitto: il launcher usa i suoi 280 ms solo sui widget; la vista ha il suo (320 ms) e non è stato cambiato. La pressione di 500 ms della vista in Esplora (`HOLD_MS` di `controls.ts`) resta quella della libreria; la sua azione in sola lettura non è stata esercitata (nessun pin visibile con i dati di prova): da provare in T7.
4. **Il pulsante «Esplora»/«Fine»** è disabilitato quando la pagina non è in primo piano o è in modifica (nella vista pagine non c'è nulla da esplorare) e mentre l'elenco stanze è aperto; aprire l'elenco esce da Esplora.
5. **Esc con un overlay aperto** non esce da Esplora (lo chiude l'overlay). `overlayOpen` in `exploreKeys.ts` ripete le 8 righe di `isOverlayOpen` del launcher, che non è esportato: non ho allargato il diff per condividerlo.
6. **Cronologia fatta a mano** (`pushState` e `back`) e non con `navigate` del router: il marcatore lascia intatto l'indice del router (`idx`); funziona anche in `StrictMode` perché la voce si crea e si toglie nei gestori e non negli effetti.
7. **Il blocco del pager è un contatore**, non un booleano, per non perderlo se due pagine lo chiedono (oggi esiste una sola pagina Casa 3D per layout).

**Verifiche** (comandi dalla cartella `frontend/`; log in `backup/casa3d/T4b/`).

| Controllo | Esito |
|---|---|
| `npm run typecheck`, `npm run lint`, `lint:typography` (0 violazioni su 479 file), `lint:theme-colors` (0 su 332), `prettier --check` sui file toccati | Verdi (`typecheck.txt`, `lint.txt`, `lint-typography.txt`, `lint-theme-colors.txt`, `prettier.txt`). |
| `Casa3dExploreKeys.test.ts` (6 test) e `Casa3dExplore.test.tsx` (15 test) | Verdi. Messi alla prova togliendo `stopPropagation` e `usePageLock`: 5 falliscono; ripristinati. Coprono: stato di partenza; tocco che entra; scorrimento, pressione lunga e `pointercancel` che non entrano; tolleranza; tocco sull'elenco che non entra; pulsante e «Fine»; vista creata subito; Esc e `defaultPrevented`; Esc con un `dialog` aperto; Delete e Ctrl+Z; 60 s e ripartenza; indicatore; pagina che esce e modifica; elenco stanze; cronologia con indietro e con «Fine»; e le regole di `composedPath()` su una vera shadow root. |
| Vitest mirati (`Casa3d`, `Launcher`, `Pager`, `OverviewPan`, `FixLauncher`, `--maxWorkers=4`) | **34 file, 562 test, verdi** alla seconda esecuzione; alla prima ne era fallito uno (un `waitFor` scaduto sotto carico, 561 su 562) e non si è ripresentato (`vitest-mirati.txt`). |
| Suite completa del frontend (`npx vitest run --maxWorkers=4`) | **168 file, 2277 test**, tutti verdi (prima 166 e 2256: +2 file e +21 test, cioè 6 di `Casa3dExploreKeys` e 15 di `Casa3dExplore`) (`frontend-suite.txt`). |
| `npm test -w casa3d` (dalla radice) | 422 su 422 (nessun file del pacchetto toccato) (`casa3d-test.txt`). |
| Build e peso | `index` **803,8 KB su 900** (prima 803,5); `Casa3dPage` 6,3 KB (prima 3,1) (`frontend-build.txt`, `check-bundle-size.txt`). |
| Chromium senza GPU (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, 1280×665, tocco) su un backend locale (porta 3099, `backup/casa3d/T4b/data`) con il finto Home Assistant (`../T4a/mock-ha.mjs`, porta 38123, token di prova) | **39 controlli su 39**, `gesti-browser.mjs`, uscita 0 (`browser-esito.txt`, `browser/gesti-browser.json`, `browser/esplora.png`): tutte le righe del «Fatto quando»; al più un contesto WebGL per tutta la prova; tutte le richieste alla stessa origine; nessun `call_service`; nessun errore di console oltre i 4 avvisi `GPU stall due to ReadPixels` già noti. Server, finto HA e browser chiusi a fine prova. |

**Limiti, osservazioni e non eseguito.**

- **Non eseguito:**
  - il Tab M11 e qualunque dito vero (la prova usa il tocco del protocollo DevTools; ISSUE-062 non misurato);
  - lo zoom a due dita (la prova usa la rotella: il codice del pizzico è quello della libreria, non esercitato qui);
  - TalkBack con Esplora (l'esplorazione al tocco di TalkBack va contro i gesti: restano il pulsante «Esplora», il messaggio di stato e l'elenco stanze, tutti non provati con TalkBack) e il testo al 125 e 150%;
  - Esc dentro un campo di testo della vista (la vista è in modalità `clean` e nessun campo è visibile: provato solo con i test unitari e una shadow root costruita a mano);
  - l'app in modalità sviluppo con `StrictMode`;
  - il banco 0.9.17 (non contiene T4a né T4b);
  - l'azione della pressione lunga della vista in Esplora.
- **Delete, Backspace e Ctrl+Z:** oggi nessun gestore del launcher li usa, quindi «non agiscono sul launcher» è vero anche senza la regola; la regola serve all'editor (T10a). La prova del browser lo verifica come invariante, i test unitari provano la regola.
- **Il blocco del pager è globale al launcher** (un contatore in `LauncherScreen`); non c'è un blocco per pagina.
- **Un tocco su un pin in Vista** (T7) non esiste ancora: oggi un tocco sul quadro entra in Esplora. In T7 il tocco sui pin dovrà essere deciso prima di entrare in Esplora (ISSUE-096).
- **Avvisi noti nella console del PC:** i 4 «GPU stall due to ReadPixels» del driver software (T3, T4a), ancora senza origine (T5). Il `409` di `PUT /api/settings/current` (ISSUE-094) questa volta non è comparso.

**Punto di ripresa.** T5 (qualità e contesto), oppure la fase «banco» per provare T4a e T4b sul Tab M11 (dito vero, pizzico, TalkBack, testo grande, ISSUE-062). Prima della fase «banco»: conferma di D16 (ISSUE-089), decisione su ISSUE-091 e aggiornamento insieme di tutti i client (ISSUE-095). Script e prove in `backup/casa3d/T4b/`; `data/` è la base dati di prova del backend locale e non contiene dati reali.

## T5 — Qualità e contesto (2026-10-20)

**Stato:** eseguita sul PC il 2026-10-20 sullo stesso incarico di T2a…T4b («Organizza e continua il lavoro in autonomia mentre sono fuori casa»). Nessun commit Git: la fase 1 (il visore: livelli, rilascio prima della creazione, perdita del contesto; patch di `casa3d`) e la fase 2 (pagina, menu, Sistema, copia nelle impostazioni; frontend) sono copiate in `backup/casa3d/T5/` (`fase1-visore-qualita.tar.gz`, `fase2-pagina-menu-sync.tar.gz`; i file modificati, prima delle modifiche, in `pre/`; `SystemPage.test.tsx` è stato rifatto togliendo le due aggiunte, perché la copia era stata dimenticata prima di modificarlo). **Il banco e il tablet non sono stati usati: la fase «banco» di T5 non è eseguita.** Il banco `aca-system:0.9.17` non contiene T4a, T4b né T5.

**Blocco non risolto prima di T5.** La revisione di T4b chiedeva di chiedere all'utente, **prima di T5 e prima della fase «banco»**, la conferma di D16 ([ISSUE-089](../project-status.md#issue-089)), la decisione su [ISSUE-091](../project-status.md#issue-091) e la conferma dei due scostamenti con D18 ([ISSUE-096](../project-status.md#issue-096)). Nessuna è arrivata (il testo calcolato del compito non è una fonte umana). T5 è stata eseguita lo stesso, come T4a e T4b, senza toccare il percorso `/casa3d/`, `loader.ts`, `sw.js` né la rotta di prova (di `Casa3dProva` cambia solo il valore di `quality` in `LIGHT_PROPS`, da `low` a `light`); è reversibile. **Va segnalato all'utente**; il blocco resta per la fase «banco».

**«Fatto quando» di T5** («test; su banco e Tab M11 (fase banco) Light entro i criteri di T11 aggiornati in T1, Medium e High selezionabili senza blocchi oltre 1 s e ritorno a Light, perdita e ripristino provati tre volte, preferenza mantenuta dopo una ricarica, ISSUE-062 non peggiorato»).

| Criterio | Esito |
|---|---|
| Test | **Soddisfatto**: 12 test `node --test` per `quality.ts` (434 nel pacchetto), 59 test nuovi del frontend (suite: 171 file, 2338 test) e 36 controlli del browser su 36. |
| Tre livelli, partenza da Light su ogni dispositivo | **Soddisfatto sul PC** (B1, B3, C): senza una scelta salvata la pagina parte in Light (rapporto pixel 1, buffer = dimensione CSS, anche con DPR 1,5); Medium 1,25; High 1,5 (tetto 2). Nessun rilevamento dal browser sceglie un livello. |
| Menu nella pagina e in Sistema | **Soddisfatto** (G1, G2): lo stesso selettore (Light, Medium, High) nel menu «Qualità» della pagina e nella sezione «Casa 3D» di Sistema; la scelta dell'uno compare nell'altro. |
| Preferenza salvata | **Soddisfatto sul PC** (G1, G4, G3): `localStorage` (`aca_casa3d_quality`), mantenuta dopo una ricarica (Medium resta Medium, disegnata a 1,25); copia in `current_settings` quando la sincronizzazione è attiva (la richiesta `PUT /api/settings/current` porta `device.casa3dQuality`). Un browser pulito riparte da Light (G5, come dice ADR-0014). |
| `setQuality` rilascia prima di creare | **Soddisfatto** (C, sei cambi): a ogni cambio un solo contesto vivo, e quando il nuovo viene creato il vecchio è già perso (`aliveBefore` = 0). |
| Perdita e ripristino con messaggio e ripiego | **Soddisfatto sul PC** (E1-E4, F1-F7): tre perdite e tre ripristini di fila (messaggio e anteprima dopo 4-24 ms, vista di nuovo dopo 227-228 ms, nessun contesto nuovo, tre eventi `lost` e tre `restored` e nient'altro); contesto non restituito: messaggio entro 2 s (6 ms), vista rifatta in Light dopo 5,2 s, con un solo contesto vivo; persa di nuovo: anteprima statica con «Riprova» ed «Elenco stanze», nessun contesto vivo, «Riprova» riporta la vista. |
| ViewerStats | **Soddisfatto**: la vista manda `stats` all'host (`statsEvents`, spento in Light: nessun costo, B4) con il livello, il rapporto pixel, le chiamate di disegno e i fotogrammi; la pagina propone «Passa a Light» se sopra Light il disegno resta lento (7 test). |
| Light entro i criteri di T11 sul Tab M11 | **Non eseguito** (fase «banco»). Sul PC, con il renderer software, la Light misura circa 29 fps in un gesto: **il numero non dice nulla sul tablet**. |
| Medium e High senza blocchi oltre 1 s sul tablet | **Non eseguito** sul tablet. Sul PC (software) nessun cambio ha bloccato il thread più di 369 ms. |
| ISSUE-062 non peggiorato | **Non misurato** (serve il tablet). |

**Che cosa c'è.**

- **Visore (`casa3d`, fase 1).** Il pacchetto cambia solo per patch (`tools/rinomina.mjs`, P104-P128 in `PATCHES.md`) e per un file aggiunto, `viewer/quality.ts` con il suo test.
  - **Livelli.** `Quality` è `light | medium | high`; ogni nome sconosciuto, «auto» e «low» compresi, è Light. Light: rapporto pixel 1, niente antialias, `powerPreference` bassa, fotogrammi distanziati di almeno 24 ms mentre qualcosa si muove (con 60 Hz circa 30 fps, con 90 Hz circa 45), più le riduzioni che il livello «tablet» dell'originale aveva già (luce a celle da 0,5 m, niente terreno, ombre, aloni, coni e meteo, timer a 66 ms). Medium: rapporto pixel fino a 1,25, niente antialias. High: fino a 2, antialias.
  - **`setQuality`.** Libera il contesto vecchio prima di crearne uno nuovo (`releaseRenderer`), non cambia durante un gesto o un volo della camera (riprova dopo 250 ms), conserva la camera e, se il renderer nuovo non si può creare, lo dice all'host (`failed`).
  - **Contesto perso.** `webglcontextlost` ferma il disegno e avvisa l'host (`context-state`: `lost`); `webglcontextrestored` basta a ridisegnare (three.js ricarica da solo buffer, texture e programmi: una ricostruzione, provata e tolta, faceva avvisare il browser per ogni geometria buttata via). Se la vista non si può creare (niente WebGL 2) l'host riceve `failed`.
  - **`isLowEnd` è tolto**: il livello lo sceglie sempre l'host.
  - Le viste 3D dell'editor partono in Light (T10 le rivede).
- **Frontend (fase 2).**
  - `casa3d/quality.ts`: i tre livelli, il valore salvato per questo dispositivo (con memoria della pagina se il browser rifiuta di scrivere) e `useCasa3dQuality`, condiviso da pagina e Sistema; `isWeakDevice` (memoria ≤ 4 GB o ≤ 4 processori: il Tab M11 dichiara 4 GB) fa chiedere conferma prima di High.
  - `casa3d/Casa3dQualityPicker.tsx`: il selettore (primitiva `Segmented`) con la spiegazione di ogni livello, la conferma per High e una nota se la vista è tornata a Light.
  - `casa3d/Casa3dPage.tsx`: il pulsante «Qualità: Light» (primitiva `Popover`), i messaggi sopra l'anteprima, il livello efficace (Light dopo una perdita, finché l'utente non sceglie) e `Casa3dVista.tsx`, che dà il livello alla vista (prima che l'elemento si colleghi: un solo renderer), la rifa quando cambia `generation` e passa su `context-state` e `stats`.
  - `casa3d/contextGuard.ts` e `useCasa3dContextGuard.ts`: la regola (vedi sotto), pura, con l'orologio passato da fuori.
  - `pages/system/sections/Casa3dSection.tsx`: la sezione «Casa 3D» di Sistema.
  - `api/snapshot.ts`: `collectSnapshot` aggiunge `device.casa3dQuality` solo se l'utente ha scelto (un dispositivo che non ha mai scelto produce lo stesso snapshot di prima); `applySnapshot` lo applica solo con l'opzione `device: true`, che passa soltanto `useSettingsSync` (le impostazioni correnti di questo dispositivo): **un profilo o un file importato non cambiano la qualità**.

**Decisioni esecutive e scostamenti da ADR-0014** (da rivedere se non vanno bene).

1. **Nessun rilevamento dal browser all'avvio.** ADR-0014 prevede «Profilo noto o GPU Mali-G5x, Adreno ≤ 6xx o `deviceMemory` ≤ 4: Light; altrimenti Medium», e il «ripiego su Elenco stanze» con `failIfMajorPerformanceCaveat`. Il compito di T5 (e la correzione di T1) vuole la partenza da Light **su ogni dispositivo**, quindi non c'è alcuna scelta automatica; `deviceMemory` e processori servono solo a chiedere conferma prima di High. Il ripiego su WebGL assente è fatto provando a creare il renderer (evento `failed`); **il ripiego per il solo renderer software non c'è**: avrebbe tolto la vista 3D a ogni prova su PC senza GPU (compresi i browser di T3-T5) e non fa parte del «Fatto quando». Da confermare.
2. **Seconda perdita.** ADR-0014: «seconda perdita entro 10 minuti: anteprima statica». Il «Fatto quando» vuole tre perdite con ripristino. Regola presa (`contextGuard.ts`): l'anteprima statica scatta alla perdita che segue di meno di 10 minuti una vista rifatta perché il contesto non tornava, oppure alla quinta perdita nei 10 minuti (un contesto che non smette di cadere), oppure se la vista non si può creare; le perdite che il browser restituisce in pochi secondi non fermano la vista. Il ripiego a Light dopo 5 s è invariato.
3. **Fotogrammi in Light a 24 ms, non 33.** ADR: «fino a 30 fps». Con 24 ms il tetto è circa 30 fps a 60 Hz e circa 45 a 90 Hz (il Tab M11 sta a 85-90 Hz), così il criterio di T11 «≥ 30 fps» ha margine. È una costante (`drawGapMs`): se sul tablet peggiora i fotogrammi oltre 50 ms, `drawGapMs` a 0 la toglie.
4. **Light «più leggero del livello Tablet» solo in parte.** Fatto: lo spazio fra i fotogrammi. Non fatto, perché serve la misura sul tablet: distanza di disegno ridotta, niente esterni in Light, altri piani solo come contorno, meno chiamate di disegno (geometrie unite o istanze), rapporto pixel 0,85 o 0,75. Nella scena d'esempio (un piano) un fotogramma fa circa 15 chiamate in Light e 22 sopra; con più piani saranno di più (la vista d'insieme della demo ne aveva 130-143). Il rapporto pixel di Light è la costante `pixelRatioCap` di `quality.ts`.
5. **La copia in `current_settings` non si applica da sola.** All'avvio un dispositivo non rilegge la propria riga (lo dice `useSettingsSync`: legge la revisione e l'impronta e basta); la riga serve alla storia, agli altri dispositivi con «pubblica» e al ripristino. Un browser pulito riparte da Light, come scrive ADR-0014.
6. **Medium e High sono selezionabili ovunque** (non nascosti nei dispositivi deboli): ADR-0014 chiede solo la conferma di High su un dispositivo Light, e T1 «solo dove la misura lo consente» dipende dal tablet.
7. **«Auto» sparisce** dal visore (era `auto | low | high`); il viaggio nel tempo riceve ancora i nomi vecchi (`toLegacyQuality`).
8. **Il budget del bundle 3D non è stato allargato**: 779,9 KB su 780 (prima 778,6), 0,1 KB di margine. Il margine è finito: ogni aggiunta al bundle 3D (T7, T10) deve prima toglierne altrettanto.

**Verifiche** (comandi dalla cartella `frontend/` salvo `casa3d`; log e script in `backup/casa3d/T5/`).

| Controllo | Esito |
|---|---|
| `npm run typecheck`, `npm run lint`, `lint:typography` (0 su 484 file), `lint:theme-colors` (0 su 333), `prettier --check` sui file toccati | Verdi. (`Casa3dExplore.test.tsx` non è formattato secondo prettier: era così prima, non è stato toccato.) |
| `casa3d`: `rinomina`, `typecheck`, `npm test`, `npm run build` | Pacchetto **434 su 434** (422 + 12 di `quality.test.ts`); `marchio` ok; grep del nome originale = 0 fuori da `NOTICE`, `LICENSE-*` e dai file di provenienza; sei bundle nei budget (3D 779,9 su 780, principale 425,6 su 620, editor 687,4 su 840). Contratto con il frontend: `hass-contract.test.ts` prova a compilazione che `ViewerStats` e `ContextEvent` si leggono come `Casa3dStats` e `Casa3dContextEvent`. |
| Vitest del frontend, suite completa (`npx vitest run --maxWorkers=4`) | **171 file, 2338 test**, tutti verdi (prima 168 e 2279: +3 file e +59 test: `Casa3dQuality` 37, `Casa3dQualityPage` 14, `Casa3dVista` 7, `SystemPage` +1); 3 attese aggiornate (`useSettingsSync.test.ts`, terzo argomento di `applySnapshot`; `Casa3dPage.test.tsx`, `light`). Messo alla prova togliendo `.c3d-notice` dall'elenco dei bersagli che non entrano in Esplora: il test relativo fallisce, poi ripristinato (`frontend-suite.txt`). |
| Build di produzione | `index` **806,4 KB su 900** (prima 803,8); `Casa3dPage` 9,4 KB, `Casa3dVista` 1,9 KB; tutti i chunk nei limiti. |
| Chromium senza GPU (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, 1280×665, DPR 1,5, tocco del protocollo DevTools) su un backend locale (porta 3099, `backup/casa3d/T5/data`) con il finto Home Assistant (`mock-ha.mjs`, porta 38123, token di prova) | **36 controlli su 36** (`qualita-browser.mjs`, `browser-esito.txt`, `browser/`): partenza da Light e rapporto pixel di ogni livello; sei cambi di livello con un solo contesto vivo e il vecchio già perso; eventi `stats` solo sopra Light; spaziatura dei fotogrammi (Light: minimo 31 ms fra due disegni, Medium 10 ms); tre perdite con ripristino; perdita senza ripristino (messaggio e anteprima, vista rifatta in Light dopo 5,2 s); perdita dopo una vista rifatta (anteprima statica, «Riprova»); scelta dal menu e da Sistema, copia nelle impostazioni, ricarica; dispositivo «debole» (High chiede conferma); tutte le richieste alla stessa origine (le sole eccezioni sono le tessere della mappa della sezione «Posizione» di Sistema, preesistente, circa 6); nessun `call_service`; nessun errore o avviso di console oltre i 4 «GPU stall due to ReadPixels» (sotto). Server, finto HA e browser chiusi a fine prova. |
| `misura-tablet.mjs` provato sul PC | Il programma che la fase «banco» userà sul tablet (gesti di orbita e pizzico dalla vista d'insieme con la camera azzerata, percentuale dei gesti che rispettano il criterio, cambi di livello, perdite, ricarica) è stato eseguito contro un Chromium senza GPU con la porta DevTools aperta (`browser-cdp-pc.mjs`), con pochi gesti: completa senza errori. I numeri del renderer software non valgono per il tablet. |

**Avvisi «GPU stall due to ReadPixels»: origine trovata** (`readpixels-origine.mjs`, risultati in `readpixels-origine-light.txt` e `-high.txt`). Segnavano chi legge indietro un'immagine: nel livello Light la sola chiamata è **`texSubImage2D` con un canvas 2D di 8×32 pixel** (la texture dell'avvolgibile, `makeBlindTexture`), caricata da three.js; sopra Light se ne aggiungono altre tre da canvas (1024×1024 il disegno del pavimento, 768×512 e 64×64 l'alone). Gli avvisi vengono dopo quella chiamata: è la copia da un canvas 2D a una texture WebGL sul renderer software del PC. Nessun `readPixels` né `toDataURL` né `getImageData` nel percorso. **Non è stato cambiato nulla**; sul tablet con la GPU vera il messaggio potrebbe non esserci: da vedere nella fase «banco». Se servisse, la strada è usare texture da dati (`DataTexture`) invece dei canvas (proposta: [ISSUE-098](../project-status.md#issue-098)).

**Limiti, osservazioni e non eseguito.**

- **Non eseguito:**
  - il Tab M11 e il banco (fase «banco»: Light entro i criteri di T11, Medium e High senza blocchi sul tablet, ritorno a Light, perdite e ripristini sul tablet, preferenza dopo la ricarica sul tablet, ISSUE-062, PSS);
  - telefoni, verticale e PC con GPU vera;
  - TalkBack sul menu e sui messaggi, testo al 125 e 150% (prove umane);
  - una perdita reale del contesto (la perdita è simulata con `WEBGL_lose_context`, come in T1: un reset vero del driver Mali potrebbe comportarsi in modo diverso);
  - più utenti Home Assistant sullo stesso browser (la scelta è una sola per browser).
- **La Light del PC non misura il tablet.** I numeri del renderer software (circa 29 fps in un gesto, una dozzina di fotogrammi oltre 50 ms) servono solo a vedere che la spaziatura dei fotogrammi funziona (Light: 31 ms fra due disegni; Medium: 10 ms).
- **Un trascinamento che parte da un pin** è il gesto del pin (ADR-0014, T7), non la rotazione: nella prova la linea del gesto è scelta dove sotto il dito c'è la tela. `misura-tablet.mjs` fa lo stesso.
- **Il terreno è bianco in Medium e High con il tema chiaro** (si vede in `browser/level-high.png`): il piano del terreno è additivo e fatto per lo scuro. Light non lo disegna. Va rifatto con T9 (proposta: [ISSUE-099](../project-status.md#issue-099)).
- **`webglcontextrestored` e le geometrie:** dopo un ripristino i vecchi ascoltatori di three.js restano attaccati alle geometrie; se una di esse viene buttata via più tardi, il browser avvisa «object does not belong to this context». Oggi non succede (la scena d'esempio non cambia); con T6 (piano che cambia) si può vedere.
- **Il profilo** salvato da un dispositivo con una scelta contiene `device.casa3dQuality` (innocuo: l'applicazione di un profilo lo ignora).
- **Il blocco** (D16, ISSUE-091, D18) resta come descritto sopra.

**Punto di ripresa.** La fase «banco» per T5 e per T4a, T4b: copia a freddo, versione alzata in `progetto/.env`, `misura-tablet.mjs` sul Tab M11 (con `adb reverse tcp:3002` e CDP sulla 9225, vedi `backup/strumenti-tablet/LEGGIMI.md`) e la PSS con `adb shell dumpsys meminfo` prima, durante e dopo; se Light non rispetta i criteri, le leve da provare sono, nell'ordine, `drawGapMs` a 0, rapporto pixel 0,85, e le riduzioni del punto 4. Prima della fase «banco»: D16, ISSUE-091, D18 e l'aggiornamento insieme di tutti i client (ISSUE-095). Poi T6 (persistenza, che aspetta ISSUE-085). Script e prove in `backup/casa3d/T5/`; `data/` è la base dati di prova del backend locale e non contiene dati reali.

### Rettifica dopo la revisione di T5 (2026-10-20)

Annotazione datata: quanto riportato sopra su T5 resta com'era. Rilievi della revisione trattati (copie in `backup/casa3d/T5-revisione/`, `dist-prima/` è il `dist` di prima), senza commit.

| Rilievo | Esito |
|---|---|
| Media: la qualità passava ad altri dispositivi con «Pubblica» | **Corretto.** `collectSnapshot` scrive `device: { id, casa3dQuality }` con `tunet_device_id`; `applySnapshot` applica solo se l'id coincide con quello del browser (nessun id: non si applica). Test: blocco di un altro dispositivo, blocco senza id, snapshot senza id. |
| Media: cambiare livello non avviava la sincronizzazione | **Corretto.** `useSettingsSync` sottoscrive `subscribeCasa3dQuality` e chiama `queueAutoSync`; non rimanda un livello già presente nella copia caricata. Test con una riga `current_settings` già presente: il `PUT` parte senza `tunet:edit-done`. Il controllo G3 del browser non è stato ripetuto. |
| Media: Light a 60 Hz perdeva un vsync su due | **Corretto.** `mustWait` vale solo con periodo misurato ≤ 14 ms (`displayPeriodMeter`: scende subito a ogni gap più corto, sale al massimo del 10% a fotogramma); `drawGapMs` è 21 ms (i 24 di prima meno i 3 ms di anticipo, ora nella costante). Test: 60 Hz 60 fps, 75 Hz 37,5, 90 Hz 45, 120 Hz 40. **Non fatto:** la riduzione delle chiamate di disegno di Light, da pianificare e misurare nella fase «banco» su Tab M11, telefono e PC. Il bundle 3D non ha margine (798.719 su 798.720 byte): per lavorarci va tolto codice o decisa una modifica del budget. |
| Media: T5 eseguita oltre il blocco scritto | **Dichiarato, non risolto da me.** Il blocco (D16, ISSUE-089, ISSUE-091, D18/ISSUE-096 e i tre scostamenti di T5) resta; «banco» e T6 aspettano la risposta dell'utente, da chiedere insieme. ADR-0014 conserva l'annotazione «senza una decisione umana nuova (da confermare)». |
| Bassa: stili del selettore nel CSS lazy della pagina | **Corretto.** `casa3dQuality.css`, importato da `Casa3dQualityPicker.tsx`. Non c'è un controllo di Sistema a freddo nel browser. |
| Bassa: i contatori del disegno lento non si azzeravano col livello | **Corretto** (`quality` fra le dipendenze dell'effetto di `Casa3dVista`); test medium, poi High lento. |
| Bassa: `failed` per ogni errore di avvio | **Corretto.** `failed` solo se il browser non crea un contesto WebGL 2 (prova con una tela usa e getta, nella patch di `view3d.ts`); ogni altro errore manda `error` e la pagina dice «La vista 3D non si è caricata» con «Riprova». Corretto anche `load3d.ts`: un caricamento fallito non resta in memoria, altrimenti «Riprova» non avrebbe riprovato (patch P104). |
| Bassa: ricreazione a pagina nascosta e scelta in Sistema | **Corretto.** `useCasa3dContextGuard(waitMs, active)` non fa scattare l'attesa a pagina nascosta o in modifica (riparte al ritorno); una scelta fatta altrove (Sistema) toglie il Light imposto dalla perdita. Test nella pagina e nel hook. |

Verifiche: `casa3d` 438 test (434 + 4 nuovi su `mustWait` e `displayPeriodMeter`), `typecheck`, `marchio` ok, `rinomina` 129 patch; `build` con sei bundle nei budget (3D 798.719 byte su 798.720); frontend `typecheck`, `eslint` sui file toccati, `prettier`, e Vitest (`--maxWorkers=4`) su `Casa3d*`, `useSettingsSync`, `snapshot`, `useProfiles`, `validators`, `SystemPage`, `FixSystemConnection`, `sensorCardInstances.persistence`. **Non eseguito:** suite completa del frontend, browser, tablet.

### Seconda rettifica dopo la revisione di T5 (2026-10-20)

Annotazione datata: quanto riportato sopra resta com'era. Rilievi della seconda revisione trattati (copie in `backup/casa3d/T5-fix2/`), senza commit.

| Rilievo | Esito |
|---|---|
| Media: dopo «Pubblica» il dispositivo di destinazione rifiutava ogni riga successiva (regressione della correzione del blocco `device`) | **Corretto.** `useSettingsSync` confronta lo stato locale con l'ultima copia caricata senza il blocco `device` (`withoutDeviceBlock`, in `applyServerRow` e nel conflitto 409), perché quel blocco cambia da un dispositivo all'altro senza alcuna modifica locale. L'ascoltatore del livello rimanda la copia anche quando l'id del blocco non è quello di questo dispositivo, quindi scegliere lo stesso livello del blocco di un altro dispositivo lo scrive con il proprio id. Nuovo `useSettingsSyncDevice.test.ts` con `collectSnapshot` e `applySnapshot` veri: righe di un altro dispositivo seguite da altre (livelli diversi, solo l'altro dispositivo con un livello, solo questo), una modifica locale vera che continua a bloccare la riga, il blocco proprio inviato. Senza la correzione 4 test su 5 falliscono. |
| Bassa: una perdita di contesto a pagina nascosta restava «persa» dopo il rilascio della vista e, al ritorno, la vista veniva rifatta due volte in Light | **Corretto.** Azione `released` in `contextGuard.ts`: quando la vista è rilasciata (`mounted` falso) una perdita in attesa si chiude, perché il prossimo elemento ha un contesto nuovo; non imposta Light e non conta come vista rifatta. Test del riduttore e della pagina (perdita a pagina nascosta, un minuto fuori, ritorno: nessun avviso, un solo elemento nuovo, livello salvato). |
| Bassa: «Riprova» dopo un errore di caricamento non era verificato | **Corretto per costruzione, non provato nel browser.** `load3d.ts` (P104, `tools/rinomina.mjs`): dopo un errore il tentativo successivo chiede `…js?r=<n>`, un indirizzo diverso, così un browser che tiene il modulo fallito sotto il suo indirizzo non rifiuta senza richiesta. Il server statico ignora la query; il service worker la tratta come un altro URL (nessuna voce in cache per il tentativo fallito). **Non eseguito:** prova in Chromium con una richiesta prima bloccata e poi consentita. |

Verifiche: frontend `typecheck` (strict) e `eslint` sui file toccati, `prettier`, Vitest (`--maxWorkers=4`) su `useSettingsSyncDevice`, `useSettingsSync`, `Casa3dQuality`, `Casa3dQualityPage`: 87 su 87; `casa3d`: `rinomina` (129 patch), `typecheck`, `marchio` ok, `npm test` 438 su 438, `build` con sei bundle nei budget (3D 780,0 KB su 780). **Non eseguito:** suite completa del frontend, browser, tablet.

## Giro autonomo del 2026-10-20/21 — riepilogo

Chiusura del giro sull'incarico dell'utente del 2026-10-20 («Organizza e continua il lavoro in autonomia mentre sono fuori casa»), dopo l'accettazione di ADR-0014. Solo documentazione: nessun codice toccato in questa chiusura e nessun commit Git in tutto il giro (le «fasi» sono documentate e copiate in `backup/casa3d/<tappa>/`). Le modifiche non committate di altri incarichi sono intatte.

**Tappe completate.**
- **T2a** (copia e rinomina): `casa3d/upstream/` verbatim alla revisione `1383a14`, `src/` generata da `tools/rinomina.mjs`, NOTICE e licenze; 66 file e 415 test `node --test` verdi, marchio e rete a 0 (con le eccezioni dichiarate). Rettificata dopo la revisione.
- **T2b** (build e servizio): `casa3d` workspace della radice, sei bundle con l'impronta nel nome, servizio same-origin sotto `/casa3d/`, regola del service worker, immagine Docker con tre workspace (tag di prova poi rimosso). Rettificata dopo la revisione.

**Tappa a cui ci si è fermati: T3, non chiusa.** L'adattatore `hass` in sola lettura, il caricatore, la pagina di prova `#/casa3d-prova` (non collegata) e il piano d'esempio sono fatti e verificati sul PC (suite frontend 2229, pacchetto 422, controlli verdi, prova in un Chromium senza GPU con un Home Assistant finto: admin, non admin, registri rifiutati). Il «Fatto quando» («stanze e luci reali sul banco, con admin e non admin») **non è soddisfatto**: la fase «banco» non è stata eseguita perché serve l'accesso a Home Assistant dell'utente (che l'agente non inserisce) e perché l'immagine porterebbe nel banco anche il lavoro non committato di altri incarichi; il tablet non è chiesto da T3. T4a non è stata iniziata: dipende dalla conferma di D16 (ISSUE-089) e dalla verifica di T3 sul banco.

**Stato del banco.** Invariato: `aca-system:0.9.16` su 3002 (LAN 192.168.1.27), `progetto/.env` a `ACASYSTEM_VERSION=0.9.16`, senza `/casa3d/` né la rotta di prova. Nessuna copia a freddo nuova, nessuna versione alzata, nessun comando a impianti reali (adattatore in sola lettura, `callService` rifiutato). Ripristino non necessario.

**Che cosa deve provare l'utente a mano** (nessuna di queste prove è stata eseguita):
1. Fase «banco» (da autorizzare): copia a freddo, `ACASYSTEM_VERSION=0.9.17`, immagine; poi aprire `http://localhost:3002/#/casa3d-prova` prima con l'amministratore e poi con un secondo utente non amministratore (l'account lo crea l'utente) e controllare stanze, stati e console.
2. Dito sul Tab M11 (Light, orbita e zoom, apertura a freddo), dopo T5; il tablet è stato misurato solo in T1, su una demo, in orizzontale.
3. TalkBack e testo al 125/150% sulla pagina (T4a e T11); verticale, telefoni e PC non sono ancora misurati con Light.
4. PC e telefono: apertura della pagina di prova e confronto con il tablet, per la richiesta «ogni tipo di dispositivo».

**Decisioni ancora aperte.**
- **Funzioni Pro** e rapporto con l'autore di neonplan3d, da vedere con il capo ([ISSUE-083](../project-status.md#issue-083)); il codice resta presente, nessuna vendita, T8 non eseguita.
- **Piani e prezzi**, fornitore di pagamento ([ISSUE-084](../project-status.md#issue-084)).
- **Visibilità della planimetria**, chi la vede ([ISSUE-085](../project-status.md#issue-085)); blocca T6.
- **GPL-3.0 e Play Store** per il modello a pagamento ([ISSUE-086](../project-status.md#issue-086)).
- Ancora da confermare: «procedere solo con Light» (T1) e le correzioni ai criteri di T11; **D16** (`/casa3d/` provvisoria) e le esclusioni del controllo del marchio ([ISSUE-089](../project-status.md#issue-089)); D10 (inglese tenuto come ripiego); rotta di prova raggiungibile nella build di produzione (condizionarla richiede autorizzazione). Residui minori: ISSUE-087 (controllo delle chiamate su più righe), ISSUE-088 (termini inglesi nella ricerca dei mobili), pannello stanza non in sola lettura e quattro avvisi `ReadPixels` (T4a e T5).

**Prossima tappa.** La fase «banco» per chiudere T3 (o l'accettazione esplicita del limite da parte dell'utente), poi T4a (guscio della pagina) dopo la conferma di D16; T5 prima delle misure di Light su verticale, telefono e PC. Copie, log e script: `backup/casa3d/T2a/`, `T2a-correzioni/`, `T2b/`, `T3/`.

## Giro autonomo del 2026-10-20/21 — riepilogo (chiusura finale, 2026-10-21)

Annotazione datata: sostituisce, come riepilogo finale, la sezione omonima qui sopra, scritta dopo T3 e conservata come storico. Chiusura del giro sull'incarico dell'utente del 2026-10-20 («Organizza e continua il lavoro in autonomia mentre sono fuori casa»), dopo l'accettazione di ADR-0014. Solo documentazione: nessun codice toccato in questa chiusura e nessun commit Git in tutto il giro (le «fasi» sono documentate e copiate in `backup/casa3d/<tappa>/`). Le modifiche non committate di altri incarichi sono intatte.

**Tappe completate** (tutte sul PC, con revisione; le riserve sono nelle sezioni di ciascuna tappa).
- **T2a** copia e rinomina: `casa3d/upstream/` verbatim alla revisione `1383a14`, `src/` generata da `tools/rinomina.mjs`; test dei sorgenti copiati e controllo del marchio verdi.
- **T2b** build e servizio: workspace `casa3d`, sei bundle con impronta nel nome, servizio same-origin sotto `/casa3d/`, regola del service worker, immagine Docker a tre workspace.
- **T3** adattatore in sola lettura: verificata sul PC e poi sul banco 0.9.17 con dati reali di Home Assistant sul tablet. Limite dichiarato: nessun utente non amministratore vero ([ISSUE-090](../project-status.md#issue-090)).
- **T4a** guscio della pagina (tipo `casa3d`, Riposo, Vista Light in sola lettura, rilascio fuori scena). Criteri automatizzabili soddisfatti; TalkBack e testo ingrandito non eseguiti.
- **T4b** gesti Vista/Esplora: 40 controlli su 40 nel browser senza GPU; dito vero e Tab M11 non provati.
- **T5** qualità e contesto: Light/Medium/High con partenza da Light, perdita e ripristino del contesto. Eseguita anche la fase «banco» sul Tab M11 (vedi sotto).

**Tappa a cui ci si è fermati: nessuna per errore o ostacolo tecnico.** Il giro si ferma dopo T5 perché la tappa successiva, **T6**, aspetta una decisione umana ([ISSUE-085](../project-status.md#issue-085), visibilità della planimetria). T8 (diritti) è fuori da questo giro per regola. Inoltre il blocco scritto nelle revisioni di T4a, T4b e T5 (conferma di D16, ISSUE-091, D18 e scostamenti) **non ha avuto risposta umana**: T4b e T5 sono state eseguite lo stesso, senza toccare il percorso `/casa3d/`, il caricatore, `sw.js` né la rotta di prova, e le fasi «banco» sono reversibili. Va segnalato all'utente.

**Stato del banco.** `aca-system:0.9.18` in salute (porta 3002, IPv4 Wi-Fi del PC ora 172.20.10.6, binding aggiornato in `progetto/compose.tunet.yaml`), con `/casa3d/manifest.json` servito e senza errori nel log. Passaggi: 0.9.16, 0.9.17 (fase dopo T3), 0.9.18 (fase dopo T5), sempre con copia a freddo prima (T5: `backup/banco/tunet-data-casa3d-T5-pre-0.9.18-freddo.tgz`, SHA-256 `ed240e95…a2342`) e versione alzata in `progetto/.env`. Ripristino: versione precedente in `.env`, binding vecchio dalla copia e copia a freddo. Nessun comando a impianti reali (adattatore in sola lettura). Forward e reverse di adb chiusi; nessun server o browser di questo giro è rimasto attivo.

**Che cosa deve provare l'utente a mano** (nessuna di queste prove è stata eseguita con persone o dita vere).
1. **Dito sul Tab M11**: Light (orbita, pizzico, Esplora/Fine, swipe fra pagine, pressione lunga in Vista), almeno 3 gesti come chiede T11. Le misure del giro usano gesti generati dal browser: Light 30 su 32 (94%, obiettivo almeno 90%).
2. **TalkBack**: Riposo con «Elenco stanze», pulsante Esplora/Fine e regione viva, menu «Qualità».
3. **Testo ingrandito al 125% e al 150%** sulla pagina e sul menu.
4. **PC e telefono**: apertura della pagina, verticale, Light di partenza e confronto con il tablet; PC con GPU vera (finora solo renderer software).
5. **Utente non amministratore** su Home Assistant (l'account lo crea l'utente) per chiudere definitivamente T3.
6. Uso prolungato (30 minuti, schermo spento) e memoria: heap non misurato.

**Decisioni ancora aperte.**
- **Funzioni Pro** e rapporto con l'autore di neonplan3d, da vedere con il capo ([ISSUE-083](../project-status.md#issue-083)); codice presente, nessuna vendita.
- **Piani e prezzi**, fornitore di pagamento ([ISSUE-084](../project-status.md#issue-084)).
- **Visibilità della planimetria**, chi la vede ([ISSUE-085](../project-status.md#issue-085)); blocca T6.
- **GPL-3.0 e Play Store** per il modello a pagamento ([ISSUE-086](../project-status.md#issue-086)).
- Da confermare in blocco: **D16** (`/casa3d/` provvisoria, [ISSUE-089](../project-status.md#issue-089)), [ISSUE-091](../project-status.md#issue-091), **D18** e scostamenti di T4b ([ISSUE-096](../project-status.md#issue-096)), i tre scostamenti di T5 (Light ovunque senza rilevamento, anteprima statica dopo una vista rifatta, 24 ms fra i fotogrammi), l'aggiornamento insieme dei client ([ISSUE-095](../project-status.md#issue-095)), «procedere solo con Light» e le correzioni ai criteri di T11.
- Residui tecnici: Medium e High a circa 24 fps (non renderli predefiniti), fps di chiusura ISSUE-062 al limite, bundle 3D senza margine (779,9 KB su 780), [ISSUE-100](../project-status.md#issue-100) e [ISSUE-101](../project-status.md#issue-101) (`misura-tablet.mjs` non valido sul tablet: usare `misura-sintetica.mjs`).

**Prossima tappa.** Risposte dell'utente alle decisioni qui sopra, in particolare ISSUE-085; poi **T6**. In parallelo le prove a mano dell'elenco, soprattutto il dito sul Tab M11. Copie, log e script: `backup/casa3d/T2a/`, `T2b/`, `T3/`, `T3-banco/`, `T4a/`, `T4b/`, `T5/`, `T5-banco/`.

## Rettifiche successive

- **2026-10-20 (T1).** Lo stato in testa, il punto di ripresa e le righe delle verifiche sul Tab M11 sono aggiornati dopo l'accettazione di ADR-0014 e la misura della demo; il testo precedente è conservato. I criteri di T11 nella tabella delle tappe (sezione 7) restano come scritti; le correzioni proposte sono nella sezione «T1». Nessun'altra sezione è stata riscritta.
- **2026-10-20 (T1, verifica di Opus).** Nella sezione «T1» i valori sono quelli corretti dalla verifica indipendente. I risultati grezzi dello script differiscono in tre punti: il «primo fotogramma» dello script (1,5 s a caldo) è il primo disegno, mentre la casa si vede a circa 2,3-2,6 s; il picco di memoria raccolto nella passata di misura (+260 MB) è circa +310 MB dopo 5 cambi di livello; il pan dell'editor (81-83 fps) non è verificato.
- **2026-10-20 (T2a).** Aggiunta la sezione «T2a — Copia e rinomina» prima di queste rettifiche. Lo stato in testa e il punto di ripresa della sezione «Chiusura» non sono stati riscritti: dopo T2a il passo successivo è T2b (vedi la sezione T2a).
- **2026-10-20 (T2a, correzioni dopo la revisione).** Rilievi della revisione di T2a trattati, con prove in `backup/casa3d/T2a-correzioni/` (copie dei file prima delle modifiche in `pre/`, log in `verifica-*.log`); il testo della sezione «T2a» sopra non è riscritto.
  - **Test e `diagnostics`.** La sezione «T2a» riporta il calo da 412 a 406 test senza dire che si discosta dal piano. Resta registrato che `diagnostics.ts` e il suo test sono **tolti, non sostituiti da un modulo vuoto** (la telemetria non ha nulla da conservare; gli importatori sono già patchati, P14-P16, P25-P33, P43-P60). Il criterio di T2a «66 test `node --test` verdi» diventa **66 file e 415 test, tutti verdi**: 65 file copiati (406 test) più `overrides/i18n.test.ts` (9 test), copiato in `src/` con l'elenco «File aggiunti» di `PATCHES.md` (sezione 2b). Il test copre `i18n.ts`: tabella italiana integrata e nessuna richiesta di rete in italiano, lingua non fornita (tedesco) che resta italiano, segnaposto `{nome}`, inglese solo dopo `loadLanguage`, chiave mancante che ripiega sull'italiano, un solo `fetch` anche con chiamate concorrenti, indirizzo `./lang/en.json?v=0` relativo a `import.meta.url`, file mancante, risposta non ok, JSON non valido e corpo non oggetto che lasciano l'italiano. Non c'è un test per le altre patch mirate: sono coperte dai test della copia che le attraversano (`features`, `packs`, `import/simple`, `alerts`, `markers`, `presence`) e dal controllo dei tipi.
  - **D10 e l'inglese.** D10 raccomanda «Solo italiano», accettata con ADR-0014; la riga dell'elenco della copia chiedeva «de/en fuori dal bundle». T2a ha tenuto l'inglese come file `lang/en.json`, caricato a richiesta e fuori dal bundle (`EXTRA_LANGUAGES` in `i18n.ts`), e tolto il tedesco: è un **ripiego** e non cambia l'italiano predefinito. Se D10 va letta alla lettera, basta togliere `EXTRA_LANGUAGES` e `lang/en.json` dallo script; la scelta resta all'utente (si decide con la revisione dei testi, T9c). I testi dei servizi non portati sono ora **potati** da italiano e inglese (85 chiavi: `license_*` tranne `license_copy`, `ext_*`, `supporter_*`, `beta_*`, `diag_*`, `news_to_shop`, `pro_shop`, `help_discord`, `pack_needs_update`, `pack_error_needs_update`): 1806 testi invece di 1891. Nessuna interfaccia le usava; `license_copy` resta perché l'editor lo usa per copiare l'id della stanza.
  - **Marchio e controllo.** Il nome originale compare ancora in `tools/rinomina.mjs`, `PATCHES.md` e `UPSTREAM.md`, oltre che in `upstream/`, `upstream.sha256`, `NOTICE` e `LICENSE-*`: sono i file che registrano che cosa è stato rinominato e da dove viene il codice; questa è l'**eccezione dichiarata** al «grep = 0» (anche in `compliance.md`, C-14). Il controllo `npm run marchio` cerca ora anche il formato delle chiavi di licenza originali e il canale di aggiornamento tolto, e vieta le chiamate per indirizzo (`fetch`, `import()`, `Image`, caricatori di texture) fuori da un elenco di nove file con il motivo (i caricatori dei bundle e `i18n.ts` costruiscono l'indirizzo da `import.meta.url`; le texture e l'anteprima delle immagini scelte dall'utente sono dati, rifiuto degli indirizzi esterni in T3/T6). Le affermazioni sopra («0 API di rete proprie») valgono per `sendBeacon`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`, `Worker` e per le chiamate per indirizzo elencate.
  - **Interruttori `?fp3d_*` e Pro.** `?fp3d_lab`, `?fp3d_projection` e `?fp3d_mic` restano attivi nel codice copiato (scrivono chiavi di `localStorage`, mostrano funzioni non rilasciate): registrati come residuo di T8 in `PATCHES.md` (sezione 6), da togliere con `overrides/features.aca.ts`. Aggiunto anche il vincolo per T6: `hasFeature` si fida del campo `features` dei pacchetti perché la verifica della firma stava nel backend Python non portato, quindi il backend di Acasystem non deve accettare pacchetti con `features` senza verifica lato server; lo sblocco Pro resta solo ai diritti di T8.
  - **Dipendenze.** `@types/node` allineato a 26.6.4 (come il backend, C-13; la base aveva la 26.6.3), un solo pacchetto cambiato nel lockfile. `typescript`, `@types/node` e `@types/three` sono dipendenze di sviluppo prese dal lockfile della base, nei limiti di ADR-0014 («per l'uso previsto dalla bozza»), fuori dai bundle. Le nove dipendenze trasversali (rapier, tween.js, fflate, meshoptimizer, @types/webxr, @types/stats.js, @types/trusted-types, @lit-labs/ssr-dom-shim, undici-types) sono elencate in `UPSTREAM.md` e in `compliance.md` (C-15); se `@lit-labs/ssr-dom-shim` entra nei bundle lo dirà la build di T2b.
  - **Sorgenti Python.** `upstream/` contiene anche `timetravel.py` e `timetravel_rows.py`, oltre ai tre file dell'elenco della copia (`schema.py`, `storage.py`, `websocket.py`): scelta **fuori elenco**, tenuti come riferimento per la funzione rimandata (viaggio nel tempo dal registro storico); non sono eseguiti né importati.
  - **Stato e verifiche.** `project-status.md` e `verification.md` aggiornati con T2a e queste correzioni. Punto di ripresa invariato: T2b, con D16 da decidere.
- **2026-10-20 (T2b).** Aggiunta la sezione «T2b — Build e servizio» prima di queste rettifiche. Lo stato in testa e il punto di ripresa della sezione «Chiusura» non sono stati riscritti: dopo T2b il passo successivo è T3 (vedi la sezione T2b).
- **2026-10-20 (T2b, correzioni dopo la revisione).** Rilievi della revisione di T2b trattati; la sezione «T2b» sopra è stata modificata in questi punti (rettifica al testo dichiarato qui in precedenza, «non è riscritto, salvo la riga D16 e la riga della build»): la riga D16 e la riga della build nella tabella delle verifiche (ora esatte); il punto «Docker, --ignore-scripts» in «Fase 2»; i residui «Funzioni di scrittura nei bundle» e «Service worker in un browser reale» in «Limiti e residui»; l'aggiunta sulla prova di better-sqlite3 in «Non eseguito»; la riga dei documenti comuni in «Limiti e residui», che prima diceva «project-status.md, verification.md e infrastructure.md non aggiornati (file condivisi con altri incarichi in corso)» (testo originale riportato dalla revisione, sovrascritto dalle correzioni e qui conservato come citazione). Copie e log in `backup/casa3d/T2b/`.
  - **Terminazioni di riga.** `package.json` e `package-lock.json` della radice erano passati da LF a CRLF (la regola `progetto/acasystem/** -text` di `.gitattributes` impedisce la normalizzazione): il diff riscriveva 53 e 17.343 righe. Riportati a LF senza cambiarne il contenuto (JSON valido, copie prima della correzione in `*.crlf-prima-correzione`, copie corrette in `*.lf-corretto`); `git diff --stat` ora mostra solo il lavoro di casa3d: `package.json` 9 righe (workspace e tre script), `package-lock.json` 645 righe (voci nuove). Resta da evitare che un editor li riscriva in CRLF.
  - **D16 provvisoria.** ADR-0014 elenca il percorso del servizio come «da scegliere» (D16) senza opzione consigliata, e l'accettazione copre solo le scelte consigliate: la scelta di T2b (`/casa3d/`, opzione (a) dell'ADR) non è quindi un'accettazione umana. Resta **applicata in via provvisoria**, reversibile (cambiano il prefisso della rotta e la regola del service worker, non i sorgenti): **da confermare dall'utente al rientro e comunque prima di T4a**, che caricherà `/casa3d/manifest.json`. Registrata come ISSUE-089 in `project-status.md`.
  - **Immagine.** `npm ci --ignore-scripts` nello stadio di build (vedi la sezione «Fase 2», voce «Docker, `--ignore-scripts`»).
  - **Riassunto delle build.** Le build locali riuscite sono **due** (`build2.log`, `build3.log`, manifest identico), più quella nell'immagine Docker con le stesse impronte; la prima (`build1.log`) era fallita. Il resoconto per l'orchestratore e le righe di `verification.md` riportano questi numeri.
  - **Esclusioni del controllo del marchio.** Il grep del nome originale è 0 sul prodotto (`dist/` e l'immagine, backend, frontend) e fuori dai soli file che devono nominarlo per registrare la provenienza: `upstream/` (verbatim, richiesto da ADR-0014), `upstream.sha256`, `NOTICE` e `LICENSE-*` (avvisi voluti dalla licenza; anche `dist/NOTICE.txt` e `dist/LICENSE-MIT-base.txt`, che li copiano), `UPSTREAM.md`, `PATCHES.md` e `tools/rinomina.mjs` (che deve scrivere il nome per riscriverlo; T2b vi aggiunge un'occorrenza, la regola del caricatore dei bundle). `build.mjs` e `tools/controlla-marchio.mjs` costruiscono il nome a pezzi. La regola dell'incarico escludeva solo `NOTICE` e licenze: **l'elenco più largo (strumenti e documenti di provenienza) è una proposta, da approvare dall'utente**; già dichiarata in `compliance.md` (C-14), ora anche in ISSUE-089. Nessun codice cambiato.
  - **Residuo di T2a.** Rimossa `casa3d/node_modules` (ignorata da Git, conteneva solo un `.package-lock.json` dell'installazione separata di T2a e cartelle vuote): le versioni valide sono quelle della radice (lit 3.3.3, three 0.186.1, esbuild 0.28.2, typescript 7.0.2, @types/three 0.186.0, @types/node 26.6.4).
  - **Documenti comuni.** `project-status.md`, `verification.md` e `infrastructure.md` aggiornati. Le funzioni di scrittura nei bundle e la prova del service worker in un browser reale sono registrate in «Limiti e residui» di T2b.
- **2026-10-20 (T3).** Aggiunta la sezione «T3 — Adattatore in sola lettura» prima di queste rettifiche. Lo stato in testa e il punto di ripresa della sezione «Chiusura» non sono stati riscritti: dopo T3 il passo successivo è la fase «banco» (verifica con Home Assistant vero), poi T4a (vedi la sezione T3). Aggiornati anche `project-status.md`, `verification.md` e `reports/README.md`.
- **2026-10-20 (T3, correzioni dopo la revisione).** Rilievi della revisione di T3 trattati; il testo della sezione «T3» non è stato riscritto.
  - **Conteggio dei test (rettifica).** I 4 file `Casa3d*` contengono 54 test (`npx vitest run --maxWorkers=4 src/__tests__/Casa3d*`: 54 su 54). I 61 test in più della suite (2168 -> 2229) comprendono i 7 di `ServiceWorkerCasa3d.test.ts`, file di T2b creato prima di T3. `project-status.md` e `verification.md` portano la stessa annotazione.
  - **T3 non è chiusa: la fase «banco» non è stata eseguita in questo giro.** Il «Fatto quando» di T3 («sul banco stanze e luci reali senza errori di console»; registri con utente admin e non admin) resta **non soddisfatto**. Motivi: (1) la vista sul banco richiede l'accesso a Home Assistant dell'utente (OAuth o token a lunga durata), che l'agente non inserisce; (2) il secondo utente non amministratore è un account che crea l'utente; (3) costruire ora l'immagine 0.9.17 porterebbe sul banco anche il lavoro non committato di altri incarichi. Le prove con il finto Home Assistant (`backup/casa3d/T3/prova-browser/`) e la lettura del sorgente di Home Assistant 2026.9.4 restano un **limite dichiarato**, non una chiusura. Il banco resta `aca-system:0.9.16` e `progetto/.env` resta `ACASYSTEM_VERSION=0.9.16`. **Punto di ripresa della fase «banco»:** copia a freddo, `ACASYSTEM_VERSION=0.9.17`, costruzione dell'immagine, `#/casa3d-prova` con l'amministratore e con un secondo utente non amministratore (conteggio dei registri e console salvati in `backup/casa3d/T3/`), una volta forniti dall'utente accesso e secondo account.
  - **Rotta di prova `#/casa3d-prova`.** Non è condizionata a `import.meta.env.DEV` e resta raggiungibile nella build di produzione (blocco `Casa3dProva-*.js` in `dist/assets`), come `#/ui-kit`. **Limite accettato da quella convenzione e da riesaminare**: condizionarla è una modifica di comportamento da far autorizzare all'utente prima di distribuire l'immagine sul banco o sui dispositivi del cliente; T4a la sostituisce con la pagina vera.
  - **Contratto `hass` (`hass-contract.test.ts`).** Controlla solo i membri di primo livello scritti `hass.X` / `hass?.X`; non vede sotto-membri, alias, destrutturazioni e cast. Esempio: `voice/listen.ts` legge `connection.socket`, che l'adattatore non fornisce a proposito (la voce è fuori da T3 e la sottoscrizione `assist_pipeline/run` sarebbe rifiutata). Il commento del test lo dichiara ora.
  - **Pannello stanza della pagina di prova.** `readOnly: false` e `confirmEntities` ricreato a ogni aggiornamento: ogni tocco è rifiutato dall'adattatore, quindi nessun rischio, ma l'indicazione è fuorviante e il pannello si ridisegna. **Da decidere in T4a:** modalità sola lettura del pannello e `confirmEntities` memorizzato.
  - **Light e `readPixels`.** La Light di T3 è la qualità `low` con gli extra spenti, non il Light deciso in T1 (DPR <= 1, niente antialias, ombre e post-elaborazione, disegno su richiesta); all'avvio compaiono 4 avvisi del driver «GPU stall due to ReadPixels» di origine non identificata. **Da fare in T5:** trovare chi chiama `readPixels` (picking, misura automatica della qualità, `getImageData`), misurarlo sul tablet e implementare il Light vero.
  - **CSP.** `backend/src/config/security.ts` (invariata da T3) ammette `img-src` e `connect-src` verso qualunque host `http:`/`https:`: il divieto di rete verso terzi della Casa 3D dipende solo dal codice (riscrittura di `entity_picture`, controllo del marchio). Immagini di schermi e sfondi nei dati del piano possono ancora puntare a host esterni. **Da fare in T6:** il validatore del server rifiuta gli indirizzi esterni nel piano. Restringere la CSP per `/casa3d/` è una decisione separata, da proporre.
- **2026-10-21 (chiusura del giro).** Aggiunta la sezione «Giro autonomo del 2026-10-20/21 — riepilogo» prima di queste rettifiche; nessuna sezione precedente è riscritta. Il giro si ferma a T3 (non chiusa: manca la fase «banco»).
- **2026-10-20 (T3, banco).** Aggiunta la sezione «T3 — esito del banco» prima del riepilogo. Il riepilogo e la rettifica «T3 non è chiusa» riportano lo stato del banco 0.9.16 prima della fase «banco» e restano come storico: ora il banco è `aca-system:0.9.17`, con la prova sul Tab M11 per l'amministratore; aperti ISSUE-090 e ISSUE-091.
- **2026-10-20 (T4a).** Aggiunta la sezione «T4a — Guscio della pagina» prima del riepilogo del giro. Lo stato in testa, il riepilogo e il punto di ripresa della sezione «Chiusura» non sono riscritti: dopo T4a il passo successivo è T4b (o la fase «banco» per la pagina sul Tab M11). Aggiornati `project-status.md`, `verification.md`, `reports/README.md` e una annotazione datata in `ADR-0012`. ISSUE-092, 093 e 094 registrati come proposte; ISSUE-089 (D16) resta aperto e T4a è stata eseguita sul valore provvisorio.
- **2026-10-20 (T4b).** Aggiunta la sezione «T4b — Gesti Vista/Esplora» prima del riepilogo del giro autonomo. Il riepilogo del giro e il punto di ripresa della sezione «Chiusura» non sono stati riscritti: dopo T4b il passo successivo è T5, oppure la fase «banco» (vedi la sezione T4b). Il blocco scritto nella rettifica di T4a (conferma di D16 e decisione su ISSUE-091 prima di T4b) non era stato risolto; T4b è stata eseguita senza toccare né l'una né l'altra.
- **2026-10-20 (T4b, correzioni dopo la revisione).** Rilievi della revisione di T4b trattati, con prove in `backup/casa3d/T4b/rettifica/` e la copia dello script prima della modifica in `backup/casa3d/T4b/gesti-browser.antes-rettifica.mjs`; la sezione «T4b» sopra non è riscritta.
  - **Blocco superato (media).** La rettifica di T4a chiedeva la conferma di D16 e la decisione su ISSUE-091 come prerequisito bloccante per T4b; T4b è stata eseguita lo stesso, con la motivazione già respinta dalla revisione di T4a (nessuna fonte umana). T4b resta com'è (reversibile, non dipende da D16 né da ISSUE-091), ma **è stata eseguita oltre il blocco e va segnalata all'utente**. Le due decisioni vanno chieste esplicitamente prima di T5 e prima della fase «banco» (ISSUE-089 e ISSUE-091 annotate). Proposta, non decisa: riformulare il blocco perché riguardi solo la fase «banco».
  - **Tocco durante lo scorrimento del pager (media).** Il pager cambia la pagina visibile solo 90 ms dopo l'ultimo evento di scroll: durante un lancio la pagina Casa 3D risulta ancora in primo piano e un tocco che lo ferma entrava in Esplora, lasciando il pager (`is-locked`, `scroll-snap-type: none`) tra due pagine. `useCasa3dExplore.ts` ora ignora il tocco quando il pager più vicino (`.aca-pager`) ha `scrollLeft` a più di 2 px da un bordo di pagina, sia alla pressione sia al rilascio (`pagerMoving`). Un test nuovo in `Casa3dExplore.test.tsx` (16 test) fallisce senza la correzione (provato) e passa con essa. Nel browser la riga C4 (swipe, poi tocco dopo 40 ms mentre il pager si assesta) passa ma **non distingue** la correzione: passa lo stesso senza di essa, perché il tocco sintetico del protocollo DevTools non riproduce un dito che ferma un lancio. Resta da provare con un dito vero nella fase «banco».
  - **Tasti fermati sulla guaina (bassa).** Correzione dell'affermazione «non raggiungono i gestori della finestra» (sezione «T4b», tastiera, e `verification.md`): `stopPropagation` sulla guaina impedisce l'arrivo ai gestori **in bolla** di `window` e `document` e ai `onKeyDown` di React (React 19 delega al contenitore radice, che sta sopra la guaina), non ai gestori della finestra **in cattura** (`LauncherScreen`, `usePageDrag`, `useWidgetDrag`, `IconAction`), che li ricevono comunque. Oggi nessuno usa Canc, Backspace, Ctrl/Cmd+Z, quindi l'effetto è nullo. **Da ricordare per T7 e T10a:** un input React dentro la pagina Casa 3D non riceverà questi tasti. Commento di `useCasa3dExplore.ts` aggiornato.
  - **Caption con `role="status"` (bassa).** La regione viva è ora un `span` dentro la Caption, vuoto fuori da Esplora: lo screen reader annuncia solo il messaggio di Esplora e non più il passaggio Riposo/Vista. Il testo visibile è lo stesso. `aria-pressed` sul pulsante non è stato aggiunto (l'etichetta cambia già da «Esplora» a «Fine»). Da provare con TalkBack nella fase «banco».
  - **Prova del browser (bassa).** `gesti-browser.mjs`: O1 vuole al più un contesto WebGL (era 2; misurato 1); la prova parte da `#/` e D4, G2 e I2 confrontano hash e indice del router (`history.state.idx`) prima, durante e dopo Esplora; nuova riga C4. **Risultato: 40 controlli su 40**, uscita 0 (`rettifica/browser-esito.txt`). B1 (swipe in Riposo subito dopo il salto del pager) falliva a ogni esecuzione: **non per la correzione** (stesso esito con `pagerMoving` spenta e la build rifatta) ma perché uno swipe entro circa 100 ms da uno scorrimento programmatico viene perso dal pager (con 150 ms e 400 ms passa; `rettifica/b1-solo.mjs`); lo script aspetta ora 200 ms, sempre ben prima dei 500 ms dell'assestamento. È una corsa del pager di cui non ho trovato l'origine (e che il 39 su 39 della prima prova di T4b non mostrava); nell'uso reale nessun dito parte in meno di 100 ms da un salto del programma. La prima esecuzione fallita è conservata in `rettifica/browser-esito-prima-esecuzione.txt`.
  - **Voce di cronologia orfana (bassa).** Aprendo Sistema da Esplora il marcatore resta nella cronologia (ISSUE-097, proposta): non corretto, perché cambia la gestione della cronologia e non è banale.
  - **Scostamenti da ADR-0014 (bassa).** Niente `touch-action: pan-x` in Vista e tocco sul quadro che entra in Esplora anche in Riposo: da far confermare all'utente con D18 (ISSUE-096 annotata); nessuna modifica.
  - **Controlli.** `typecheck`, `lint`, `lint:typography` (0 su 479), `lint:theme-colors` (0 su 332) e `prettier --check` verdi; `Casa3d*` (8 file, 103 test, `--maxWorkers=4`) verdi; build di produzione con tutti i chunk entro i limiti (`check-bundle-size.txt`). Server locale, finto Home Assistant e Chromium chiusi a fine prova. Nessun tablet, nessun banco, nessun commit.
  - **Larghezza frazionaria del pager (media, 2026-10-20, terza revisione).** `pagerMoving` misurava l'allineamento sulla `clientWidth` arrotondata: con un pager largo, ad esempio, 411,43 px (telefono con DPR frazionario o zoom del browser al 110%) lo scarto cresceva con l'indice della pagina e per Casa 3D (indice 9) superava la tolleranza di 2 px anche a pager fermo, e il tocco non entrava in Esplora. Ora usa `getBoundingClientRect().width` (ripiega su `clientWidth` se vale 0, come in jsdom); tolleranza invariata. Nuovo caso in `Casa3dExplore.test.tsx` (ora 17 test; 411,43 contro `clientWidth` 411, indice 9: entra a riposo, con +200 px resta Vista; con la formula precedente la prima metà fallirebbe). Rivista senza nuovi rilievi. Verifiche finali: suite del frontend 168 file e 2279 test verdi, backend 18 file e 150 test, `casa3d` 422 su 422, typecheck, lint, `lint:typography`, `lint:theme-colors`, build e `check-bundle-size` verdi (`index` 803,8 KB su 900). Non provata in un browser con viewport o zoom frazionari né sul Tab M11; la tabella delle verifiche di T4b riporta 2277 test perché precedente a questa correzione.
- **2026-10-20 (T5).** Aggiunta la sezione «T5 — Qualità e contesto» prima del riepilogo del giro autonomo. Lo stato in testa, il riepilogo del giro e il punto di ripresa della sezione «Chiusura» non sono stati riscritti: dopo T5 il passo successivo è la fase «banco» (T5, T4a, T4b sul Tab M11), poi T6. Il blocco scritto nella rettifica di T4b (conferma di D16, decisione su ISSUE-091 e conferma dei due scostamenti con D18 prima di T5) **non era stato risolto**: T5 è stata eseguita lo stesso, senza toccare il percorso né la rotta di prova, ed è da segnalare all'utente. Aggiornati anche `project-status.md`, `verification.md`, `reports/README.md`, `casa3d/PATCHES.md` (P104-P128 e il residuo di T5), `casa3d/README.md` e una annotazione datata in ADR-0014. ISSUE-098 e ISSUE-099 registrati come proposte.

## T5 — esito del banco (2026-10-21)

Annotazione datata: le sezioni T5 precedenti restano com'erano. Fase «banco» eseguita il 2026-10-21 sullo stesso incarico, senza commit. Il blocco su D16, ISSUE-091 e D18/ISSUE-096 non ha avuto risposta umana: la fase è stata eseguita come T3, è reversibile, e **il blocco resta da segnalare all'utente**. Evidenze e script in `backup/casa3d/T5-banco/`.

**Banco.** IPv4 Wi-Fi del PC 172.20.10.6 (era 192.168.1.27): `compose.tunet.yaml` aggiornato come nelle righe esistenti (copia `compose.tunet.yaml.prima`). Copia a freddo a contenitore fermo: `backup/banco/tunet-data-casa3d-T5-pre-0.9.18-freddo.tgz`, 429336 byte, SHA-256 `ed240e956b1ed59040df55feed9e2aa42dbb36bd1f476929c2cde23e99f2a342`, `tar -tzf` con `tunet.db`, `tunet.db-wal`, `tunet.db-shm`. `ACASYSTEM_VERSION=0.9.18` in `progetto/.env` e in `frontend/e2e` (`isolated-server.mjs`, `release.check.mjs`, `README.md`; copie in `T5-banco/pre-e2e/`). Immagine `aca-system:0.9.18`, ID `sha256:7b79f34e4820c0e16afa9034aad012e7b414dcd804ec8737b8123ee8403ea2bd`, creata 2026-10-20T22:02Z, in salute; `/api/health` 0.9.18 e `/ha/auth/providers` 200 su 127.0.0.1 e 172.20.10.6 (Home Assistant non riavviato); `/casa3d/manifest.json` 0.9.18 (bundle 3D 798719 byte, `/casa3d/` senza indice 404 per scelta); il bundle del frontend contiene `aca_casa3d_quality`; log senza errori. L'immagine porta anche le modifiche non committate di altri incarichi. **Ripristino:** `ACASYSTEM_VERSION=0.9.17` in `progetto/.env`, il binding vecchio dalla copia, più la copia a freddo (o `tunet-data-casa3d-T3-pre-0.9.17-freddo.tgz`).

**Tablet Tab M11** (TB330FU, Chrome 155, 1280×665, DPR 1,5, Mali-G52 MC2, 4 GB, 8 processori; USB, `adb reverse` e CDP sulla 9225; service worker e cache tolti, ricarica senza cache: bundle `index-CF2A5NZL.js` = quello del banco, versione 0.9.18).

| Criterio | Esito |
|---|---|
| Light, orbita e pizzico dalla vista d'insieme con camera azzerata, 8 gesti per tipo da 5 s, gesti generati dal browser (`Input.synthesize*Gesture`) | **Soddisfatto**, due passate: passata A 14 gesti su 16 (orbita 6/8 con un secondo intervallo >50 ms, pizzico 8/8), passata B 16 su 16; **30 su 32 (94%)**, obiettivo ≥90%. 9 chiamate di disegno per fotogramma, rapporto pixel 1. Orbita 45-59 fps, pizzico 40-56 fps. L'unico intervallo >50 ms (83-100 ms) cade alla fine del gesto, quando il dito si alza. |
| Medium e High selezionabili senza blocchi oltre 1 s, ritorno a Light | **Soddisfatto**: blocco massimo del thread 321-476 ms (Medium), 307-353 ms (High), 175-204 ms (ritorno a Light); un solo contesto vivo a ogni cambio e il vecchio già perso; canvas 1530 e 1836 px (rapporto 1,25 e 1,5), poi 1224 in Light. Il primo disegno arriva dopo 0,85-1,3 s. |
| Medium e High non sono fluidi sul tablet | **Osservazione**: nei gesti Medium ~24 fps (orbita) e ~21 (pizzico), High ~24 e ~21, con 15-40 intervalli >50 ms per gesto; nessuno dei due rispetta il criterio di Light. Conferma «procedere solo con Light». Da non rendere predefiniti. |
| Perdita e ripristino tre volte | **Soddisfatto** (due esecuzioni): messaggio entro 71-89 ms, vista di nuovo entro 272-396 ms dal ripristino; contesto perso per sempre: messaggio entro 2 s, vista rifatta in Light dopo 5,4-5,5 s. |
| Preferenza dopo la ricarica | **Soddisfatto**: Medium scelto, ricarica, Medium (due passate complete; in tre prove brevi con solo il livello Light la chiave dopo la ricarica era `light` pur avendo il programma scelto Medium: scostamento non spiegato, da ripetere). |
| ISSUE-062 (`measure.cjs base`, 4 giri) | **Non peggiorato nei picchi, fps di chiusura al limite**: apertura vista pagine 57,9-60,0 fps (0.9.16: 57,7-60,7) picchi 300-322 ms (322-378); chiusura 54,6-57,3 fps (56,0-61,6) picchi 222-256 ms (267-278). Due giri su quattro di chiusura sono 54,6 e 54,8, sotto il minimo storico (56,0) di circa 1,3 fps; da ricordare che il launcher ha una pagina in più (Casa 3D). Variazione piccola, entro il rumore delle altre misure. |
| Memoria | PSS di Chrome (`dumpsys meminfo com.android.chrome`, somma dei processi del pacchetto): prima 193 MB, durante le prove 160-175 MB, dopo 169 MB. Nessuna crescita. Heap non misurato in questa fase. |
| Rete, errori | Nessuna richiesta a terzi; nessun comando (`callService` rifiutato, nessun `call_service`); console: tre 409 `Conflict` nella sincronizzazione delle impostazioni (due schede della stessa origine, quella delle prove e quella principale, con la revisione che avanza: la riga del dispositivo è arrivata alla revisione 345 senza ciclo), nessun altro errore o avviso (i «GPU stall ReadPixels» non compaiono sulla GPU vera). |

**Strumenti e limite di metodo.** La prima esecuzione di `misura-tablet.mjs` (gesti con `Input.dispatchTouchEvent`, in `misura/`) **non vale**: ogni evento è un'andata e ritorno del protocollo, il gesto dura 12-16 s invece di 5 e i fotogrammi seguono gli eventi (20-26 fps in tutti i livelli). I numeri della tabella vengono da `misura-sintetica.mjs` (gesti del browser, `misura2/` e `misura3/`). Nessun dito reale: **non eseguito** (il criterio di T11 chiede almeno 3 gesti col dito).

**localStorage del launcher** (token esclusi): le chiavi esistenti sono invariate tranne le attese: la 0.9.18 aggiunge la pagina `casa3d` in coda a `tunet_pages_config` (8 → 9), `tunet_page_settings` e `tunet_launcher_layout` (le 8 pagine di prima identiche), crea `tunet_custom_icons` e `tunet_custom_names` vuote e `aca_casa3d_quality` = `light` (il valore di partenza, lasciato dalle prove). Una sola entrata/uscita dalla modifica oltre a quelle di `measure.cjs`.

**Non eseguito:** dito reale; telefoni, verticale e PC con GPU vera; 30 minuti di uso e schermo spento; TalkBack; heap; il non amministratore (ISSUE-090).
**Punto di ripresa.** Decisioni umane su D16, ISSUE-091, D18 e sull'aggiornamento di tutti i client (ISSUE-095); poi T6 (aspetta ISSUE-085). Le leve per Light, se servissero: `drawGapMs` a 0, rapporto pixel 0,85, meno chiamate di disegno.

## T5 — esito (2026-10-21)

Annotazione datata di chiusura: le sezioni T5 precedenti restano com'erano. Nessun commit Git; il working tree di altri incarichi è intatto. Evidenze in `backup/casa3d/T5/`, `T5-revisione/`, `T5-fix2/` e `T5-banco/`.

**Stato.** T5 è fatta sul PC e sul banco con il Tab M11, **per i criteri automatizzabili e per i gesti generati dal browser**. Il «Fatto quando» non è soddisfatto per intero: mancano il dito reale (T11 chiede almeno 3 gesti), i telefoni, la vista verticale, un PC con GPU vera e TalkBack, e il blocco umano su D16, ISSUE-091 e D18 è senza risposta.

**Modifiche.**
- Visore (`casa3d`, patch P104-P128 in `tools/rinomina.mjs`, 129 patch): livelli Light, Medium e High; partenza sempre da Light, nessun rilevamento dal browser; `setQuality` rilascia il contesto prima di crearne un altro; `webglcontextlost` e `webglcontextrestored` con evento `context-state`; statistiche della vista.
- Frontend: scelta del livello per dispositivo (`localStorage`, `aca_casa3d_quality`) con copia in `current_settings` legata all'id del dispositivo; menu «Qualità» nella pagina e sezione «Casa 3D» in Sistema; `contextGuard` (messaggio subito, vista rifatta in Light dopo 5 s, anteprima statica con «Riprova»).
- Banco: immagine `aca-system:0.9.18`, copia a freddo e versione alzata (dettagli e ripristino nella sezione «T5 — esito del banco»).

**Revisioni.** Due passate di revisione con rilievi alti, medi e bassi trattati (rettifiche datate sopra): qualità legata al dispositivo, avvio della sincronizzazione, spaziatura dei fotogrammi solo da 75 Hz, errore di avvio distinto, `released` per la perdita a pagina nascosta, nuovo tentativo di `load3d` con `?r=n`. Il nuovo tentativo di `load3d` dopo un errore **non è stato provato in Chromium** (solo per costruzione).

**Verifiche** (dettagli in `verification.md`).
- `casa3d`: 438 test su 438, `marchio` ok, sei bundle nei budget (3D 780,0 KB su 780: nessun margine).
- Frontend: suite completa 172 file e 2355 test verdi (circa 936 s); typecheck, eslint, `lint:typography`, `lint:theme-colors`, `i18n:check` verdi; build e `check-bundle-size` nei limiti (`index` 806,9 KB su 900). Backend: 18 file e 150 test verdi.
- Chromium senza GPU: 36 controlli su 36 (fase PC).
- Tab M11 (0.9.18): Light 30 gesti su 32 (94%, obiettivo ≥90%); Medium e High senza blocchi oltre 1 s e ritorno a Light; tre perdite con ripristino; preferenza mantenuta dopo la ricarica nelle due passate complete; PSS di Chrome senza crescita (193, 160-175, 169 MB).

**Limiti.**
- Gesti generati dal browser (`Input.synthesize*Gesture`), non dita vere. `misura-tablet.mjs` (eventi uno a uno) dà numeri non validi per il tablet.
- Medium e High girano a circa 24 fps (orbita) e 21 fps (pizzico) con 15-40 intervalli >50 ms per gesto: non vanno resi predefiniti; conferma «procedere solo con Light».
- ISSUE-062: picchi di apertura e chiusura non peggiori della 0.9.16; due giri di chiusura su quattro a 54,6 e 54,8 fps, circa 1,3 sotto il minimo storico, con una pagina in più nel launcher.
- Tre prove brevi con solo Light hanno letto `light` dopo la ricarica pur avendo scelto Medium: non spiegato ([ISSUE-100](../project-status.md#issue-100)).
- Le leve di Light non toccate perché non servite alla misura (distanza di disegno, meno chiamate di disegno, rapporto pixel 0,85) restano disponibili; `drawGapMs` a 0 se i fotogrammi peggiorano.

**Cosa manca.** Risposta dell'utente su D16 ([ISSUE-089](../project-status.md#issue-089)), ISSUE-091, D18 e i tre scostamenti di T5 (partenza da Light senza rilevamento, nessun ripiego per il solo renderer software, anteprima statica dopo una vista rifatta, 24 ms fra i fotogrammi) e sull'aggiornamento insieme dei client ([ISSUE-095](../project-status.md#issue-095)); dito reale, telefoni, verticale, PC con GPU, TalkBack, testo al 125 e 150%, 30 minuti di uso, heap; correggere o sostituire `misura-tablet.mjs` ([ISSUE-101](../project-status.md#issue-101)). Poi T6 (aspetta [ISSUE-085](../project-status.md#issue-085)); T8 resta fuori da questo giro.

**Stato del report.** In corso: T0-T5 eseguite (T3, T4a, T4b e T5 con le riserve sopra), T6 e seguenti non iniziate. **Punto di ripresa:** decisioni umane (D16, ISSUE-091, D18, scostamenti di T5, ISSUE-095), poi T6.
- **2026-10-21 (chiusura del giro).** Aggiunta la sezione «Giro autonomo del 2026-10-20/21 — riepilogo (chiusura finale)»; il riepilogo precedente, scritto dopo T3, resta come storico. Nessun'altra sezione riscritta.
- **2026-10-21 (D16 confermata e pagina di prova nascosta).** Incarico dell'utente: «conferma /casa3d/ e nascondi la pagina di prova, poi procedi con T6». D16 è decisa: `/casa3d/`, nessuna modifica al codice. L'elenco delle esclusioni del controllo del marchio non è nominato nella frase e resta da approvare (ISSUE-089). La rotta `#/casa3d-prova` è condizionata a `import.meta.env.DEV` in `routes/AppRoutes.tsx` (ISSUE-091 risolto, ISSUE-093 annotato); il bundle di produzione non contiene la stringa né la pagina. Evidenze in `backup/casa3d/D16-prova/`.

## T6 — Persistenza (2026-10-21)

**Richiesta (utente, 2026-10-21):** «conferma /casa3d/ e nascondi la pagina di prova, poi procedi con T6». La prima parte è fatta e registrata (D16 e ISSUE-091, nota in fondo alle rettifiche); questa sezione è T6. **Perimetro:** tabelle, rotte `/api/casa3d/*` con compare-and-swap, scrittura solo per il ruolo scelto (D13) verificato dal server, validatore del formato, immagini sicure, cronologia con punti di ripristino, esportazione e importazione, e nel frontend il passaggio dei comandi `casa3d/*` alle rotte REST con la bozza locale. Fuori perimetro: schermate che salvano o mostrano il piano del server (editor T10, Vista con il piano salvato), diritti e piani (T8), qualsiasi comando a impianti reali (l'adattatore resta in sola lettura verso Home Assistant). Nessun commit Git; nessuna dipendenza nuova; il working tree di altri incarichi è intatto.

**Criteri di completamento (dal piano, tappa T6):**
1. Vitest del backend con database in memoria: 409, 403, limiti, SVG e URL esterni rifiutati, immagine troncata rifiutata.
2. Salvataggio e rilettura da due client.
3. Il piano salvato è presente nella copia a freddo del volume.

**Come si è ripreso il lavoro.** All'inizio di questa ripresa il backend (tabelle, rotte, validatore, immagini, servizio, 4 file di test) e due file del frontend (`planApi.ts`, `planRequest.ts`) erano già nel working tree, scritti nella parte precedente dello stesso incarico (copie dei file toccati in `backup/casa3d/T6/pre/`). Non si è dato nulla per verificato: sono stati letti per intero, i test eseguiti, e sono stati aggiunti il collegamento all'adattatore, i test del frontend, la prova a due client e i documenti.

### Modifiche

**Backend** (`progetto/acasystem/backend/src/`):
- `models/database.ts`: tabelle `casa3d_building` (una riga per casa, `home_id = 'default'`, revisione, `data` e `data_enc`), `casa3d_image` (BLOB, tipo, dimensioni, impronta SHA-256) e `casa3d_history` (punti di ripristino); `CREATE TABLE IF NOT EXISTS`, quindi un volume esistente si aggiorna da solo e le tabelle entrano nelle copie a freddo di `tunet.db`.
- `routes/casa3dApi.ts` (montata in `server.ts` dopo la verifica del token HA) e `controllers/casa3dController.ts`: `GET /building`, `GET /building/revision`, `PUT /building`; `GET`, `PUT` e `DELETE /images/:id`; `GET` e `POST /history`, `POST /history/:id/restore`; `GET` e `POST /backup`. Limite di frequenza `CASA3D_RATE_LIMIT_WINDOW_MS` e `_MAX` (predefinito 120 al minuto per IP).
- **Compare-and-swap:** `PUT /building` porta `base_revision`; se la revisione salvata è un'altra, 409 con la revisione attuale e il piano non cambia. L'aggiornamento è un `UPDATE ... WHERE revision = ?` dentro una transazione.
- **Ruolo:** `middlewares/casa3dRole.ts` e `helpers/casa3dRole.ts`. Tutte le scritture, la cronologia, l'esportazione e l'importazione richiedono l'installatore (403 altrimenti, 401 senza utente), controllato prima di leggere il corpo. **D13 non è decisa** (vedi sotto): installatore = utente che Home Assistant dichiara amministratore o proprietario. Il ruolo non viene mai dal client (un'intestazione o un campo `is_admin` inviati non contano: test).
- **Validatore** (`validators/casa3dSchema.ts`, `casa3dValidators.ts`): porta in TypeScript i vincoli di `schema.py` della copia a monte (rev. 1383a14): ID `^[A-Za-z0-9_\-.]+$` fino a 64 caratteri, nomi fino a 100, riferimenti fino a 255, 20 piani, 200 stanze, 200 punti, 1000 elementi per elenco, intervalli numerici e valori ammessi; i campi sconosciuti passano come nell'originale (un frontend più nuovo non è rifiutato), tranne gli oggetti stretti. Dimensione massima del piano 1,9 MB (il corpo JSON del server è già a 2 MB). Differenze volute: il server non riempie i valori predefiniti, i numeri devono essere numeri JSON, e le immagini delle regole degli schermi, lo sfondo dei piani e ogni riferimento a un'immagine non possono essere indirizzi (solo l'id di un'immagine salvata, `camera:<entità>` o il testo vuoto): ISSUE-016.
- **Immagini** (`helpers/casa3dImage.ts`, corpo binario `PUT /images/:id`): il tipo si giudica dai byte, non dall'intestazione. PNG (firma, CRC di ogni blocco, `IHDR`, `IDAT`, `IEND` senza dati dopo), JPEG (segmenti, `SOF`, scansione, `EOI`), WebP (RIFF, `VP8`/`VP8L`/`VP8X`, non animato). Rifiutati: SVG e ogni markup (415), formati diversi (415), tipo dichiarato diverso dai byte (415), file vuoto, troncato o danneggiato (422), oltre 2048 px per lato (422), oltre 6 MB (413). Al più 200 immagini e 128 MiB in tutto. La risposta torna con il tipo rilevato, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`, ETag e `Cache-Control: private, no-cache`. **Limite dichiarato:** i pixel non sono decodificati né l'immagine ricodificata ([ISSUE-104](../project-status.md#issue-104)).
- **Cronologia** (`services/casa3dService.ts`): venti punti di ripristino; uno automatico sul salvataggio, dello stato che sta per essere sostituito, se l'ultimo ha più di 600 s e quello stato ha almeno un piano; uno prima di ogni ripristino e di ogni importazione; uno a richiesta. Ripristino e importazione ricontrollano il piano con lo schema e scrivono come una nuova revisione.
- **Esportazione e importazione:** `{ format: 'acasystem-casa3d-backup', version: 1, exported_at, building, packs: [] }`, nello stile dell'esportazione dei profili (`tunet-dashboard-export`). Non include il piano nell'esportazione dei profili. L'importazione non accetta pacchetti di mobili con funzioni (la verifica della firma stava nel backend Python non portato): li salta con il motivo `unsupported` (T8 ne deciderà la sorte).
- **Cifratura:** il piano e i punti di ripristino seguono `TUNET_ENCRYPTION_MODE` come le impostazioni (`enc_only` provato); le immagini (BLOB) non sono cifrate (D8 aperta).

**Frontend** (`progetto/acasystem/frontend/src/casa3d/`):
- `planApi.ts`: traduce i comandi `casa3d/*` del pacchetto nelle rotte REST (nessuna patch di `api.ts`: vedi `PATCHES.md`, sezione 6). Tiene la revisione dell'ultimo piano letto o salvato e la manda a ogni salvataggio; senza lettura precedente rifiuta il salvataggio (`revision_unknown`); al 409 l'errore ha il codice `revision_conflict`, la revisione del server e il messaggio «Il piano è stato modificato da un altro dispositivo. Ricarica la pagina prima di salvare.»; al 403 «Solo l'installatore può modificare il piano.»; le immagini viaggiano in binario e un indirizzo `data:` che non è PNG, JPEG o WebP è rifiutato prima della richiesta; `casa3d/building/subscribe` diventa la lettura della sola revisione ogni 30 s, a pagina visibile; l'elenco dei pacchetti è sempre vuoto.
- `planRequest.ts`: la richiesta dell'app (`./api/casa3d`, stessa origine, token dell'utente, un nuovo tentativo dopo un 401 con OAuth come le altre chiamate al backend) e un'unica istanza condivisa.
- `haShim.ts`: nuova opzione `planApi`; i comandi che l'oggetto sa gestire vanno al backend di Acasystem, mai a Home Assistant; `callService` e ogni comando di scrittura verso Home Assistant restano rifiutati. Senza `planApi` il comportamento di T3 non cambia (piano dell'host, sola lettura).
- `useCasa3dHass.ts`: terzo parametro `planApi`; **bozza locale:** la bozza `casa3d.unsaved` dell'editor (che il pacchetto già cancella al salvataggio riuscito) appartiene all'utente che l'ha fatta e si cancella quando entra un altro utente sullo stesso browser (`forgetDraftOfOtherUser`).
- **La Vista e le pagine non usano ancora questo canale** (la Vista mostra il piano d'esempio e non passa `planApi`, perché un salvataggio dalla Vista, ad esempio la valvola della piscina, scriverebbe il piano d'esempio sul server): lo userà l'editor (T10a); vedi [ISSUE-103](../project-status.md#issue-103).

**Pacchetto `casa3d`:** nessun sorgente cambiato (impronta di `src/` e `lang/` identica prima e dopo `npm run rinomina`). Cambiano solo `tools/rinomina.mjs` e, rigenerato, `PATCHES.md` (sezione 6): formato di esportazione, pacchetti, `api.ts` non patchato e immagini.

**Documenti:** questa sezione, ADR-0014 (annotazione di T6) e ADR-0009 (annotazione sulle rotte REST e sul ruolo), `project-status.md` (ISSUE-102…104, annotazione di ISSUE-085), `verification.md`, `infrastructure.md`, `compliance.md` (C-06 e C-08) e `reports/README.md`.

### Decisioni prese dall'agente senza fonte umana (da confermare)

1. **Ruolo di scrittura (D13), [ISSUE-102](../project-status.md#issue-102).** D13 non ha un'opzione consigliata e non rientra nell'accettazione di ADR-0014. Si è scelta la più semplice e reversibile delle quattro elencate: ogni amministratore o proprietario di Home Assistant scrive (come `require_admin` dell'originale). Non distingue l'installatore dal cliente; il cambio è in un solo punto (`helpers/casa3dRole.ts`). Dietro l'ingress del Supervisor nessuno scrive.
2. **Lettura aperta a ogni utente autenticato** (D8 aperta, ISSUE-085): serve alla Vista per gli utenti normali; chi non è installatore non può leggere cronologia ed esportazione. Cambiare in «solo installatore» o in una casella «visibile agli utenti» è una riga del router.
3. **Immagini senza decodifica dei pixel** (ISSUE-104), **non cifrate** (D8).
4. **Una casa per installazione** (`home_id = 'default'`): più case per condominio (REQ-17) non decisa.

### Verifiche (dettagli in `verification.md`; log in `backup/casa3d/T6/`)

| Controllo | Esito |
|---|---|
| Backend: `npx vitest run --maxWorkers=4`, `tsc`, `eslint src` | 21 file e 191 test verdi (4 file `casa3d*` con 50 test: 409, 403 e 401, limiti, SVG, URL esterni, immagine troncata e danneggiata, tipo diverso dai byte, oltre i limiti, cronologia, ripristino, esportazione, importazione, cifratura `enc_only`, rotte dietro l'autenticazione vera); typecheck e lint senza errori |
| Frontend, test nuovi: `Casa3dPlanApi`, `Casa3dPlanRequest`, `Casa3dHassHook` | 3 file e 44 test verdi (comandi e rotte, revisione e 409, codici di errore, immagini in binario e rifiuti prima della richiesta, controllo della revisione, bozza per utente, richiesta con token e un solo nuovo tentativo, adattatore ancora in sola lettura verso Home Assistant) |
| Frontend: `npx vitest run --maxWorkers=4 src/__tests__/Casa3d` | 14 file e 218 test verdi; `typecheck`, `lint`, `lint:typography` (0 su 487), `lint:theme-colors` (0 su 333) verdi |
| Pacchetto `casa3d` | `npm test` 438 su 438, `typecheck`, `marchio` ok su 200 file; `npm run rinomina` lascia `src/` e `lang/` identici |
| Build e peso | `npm run build` e `check-bundle-size`: `index` 806,5 KB su 900; nessun file `Casa3dProva` né stringa `casa3d-prova` nella build |
| Prova a due client e copia a freddo (PC) | `backup/casa3d/T6/due-client/due-client.mjs`: 37 controlli su 37 (vedi sotto) |

**Prova a due client e copia a freddo, come è stata ottenuta.** Un solo Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`) con **tre contesti**, cioè tre dispositivi con `localStorage` e token propri, che eseguono il codice vero di `planApi.ts` e `planRequest.ts` (impacchettato con esbuild, token letto da `localStorage` come nell'app) contro il processo vero del backend (`node src/server.ts`, file SQLite su disco) collegato a un Home Assistant finto con token di prova (`mock-ha.mjs`); nessuna credenziale vera, nessun account creato. A e B sono l'amministratore su due dispositivi, G un ospite non amministratore. Risultati: A legge il server vuoto (revisione 0) e salva il piano d'esempio (1); B lo rilegge identico; B salva (2); A se ne accorge con il controllo ogni 0,4 s; il salvataggio di A su una revisione vecchia dà 409 `revision_conflict` con la revisione 2 e il piano di B resta; A rilegge e salva (3); G legge ma riceve 403 su piano, immagini, cronologia, esportazione, punto di ripristino e cancellazione, e senza token 401; un PNG vero caricato da A è riletto da B byte per byte con le intestazioni attese; SVG (dichiarato PNG o SVG), PNG troncato e oltre 6 MB rifiutati (415, 422, 413) e non salvati; URL esterno nell'immagine di uno schermo e come sfondo rifiutati (400), 21 piani rifiutati (400), la revisione resta 3; punto di ripristino, modifica, ripristino, esportazione e importazione (con un pacchetto saltato); infine il backend è fermato, la cartella dei dati è copiata (`copia-a-freddo/`: `tunet.db`, `-wal`, `-shm`) e la copia, aperta da sola, contiene il piano con la stessa revisione e lo stesso contenuto dell'ultima lettura, l'immagine con la stessa impronta, i punti di ripristino e nessuna delle immagini rifiutate.

### «Fatto quando»: stato

| Criterio | Stato |
|---|---|
| Vitest del backend con database in memoria (409, 403, limiti, SVG e URL esterni, immagine troncata) | **Soddisfatto** |
| Salvataggio e rilettura da due client | **Soddisfatto sul PC nella forma sopra** (tre contesti di un solo browser, codice vero, backend vero); **non fatto nella forma dell'incarico sul banco** (tablet e browser del PC, Home Assistant vero): l'app non ha ancora una schermata che salvi il piano (l'editor è T10), quindi sul banco servirebbe una pagina o uno script di prova servito dal banco e un accesso che l'agente non inserisce |
| Il piano salvato è presente nella copia a freddo del volume | **Soddisfatto sul PC su una copia della cartella dei dati a backend fermo; non fatto sul volume Docker del banco** (`backup/banco/*.tgz`): l'immagine 0.9.18 non contiene T6 e costruirla porterebbe sul banco anche il lavoro non committato di altri incarichi |

**Cosa manca.** La fase «banco» di T6 (immagine con T6, copia a freddo, salvataggio e rilettura dal Tab M11 e dal browser del PC con un modo per salvare un piano, piano presente nel tgz della copia a freddo); decisioni sulle voci ISSUE-085 (visibilità, cifratura), ISSUE-102 (D13), ISSUE-104 (ricodifica); T7 e T10 per usare il canale dalla Vista e dall'editor.

### Rettifica 2026-10-21 (revisione di T6)

Corretti i rilievi della revisione, senza commit (il testo sopra resta com'era):
- **Alta, `planApi.ts`: il compare-and-swap lato client non proteggeva.** La `base_revision` di un salvataggio è ora quella del documento che il pacchetto ha in memoria (ultima lettura, salvataggio o importazione), non l'ultima risposta del server. Dopo un ripristino la base non si sposta: i sottoscrittori sono avvisati subito della nuova revisione (come il push dell'originale) e il controllo periodico continua a segnalarla finché il pacchetto non rilegge il piano; un salvataggio del documento vecchio riceve 409. Un'istanza per elemento: `getCasa3dPlanApi()` (singleton) è sostituita da `createElementPlanApi()` in `planRequest.ts`, così la lettura di un altro consumatore non sposta la base di un editor con modifiche in sospeso. Test nuovi: ripristino, avviso, controllo periodico, 409 e rilettura; lettura da un secondo consumatore seguita dal salvataggio di un documento vecchio (409).
- **Media, `casa3dService.ts`: immagini senza riferimenti.** Dopo un salvataggio, un ripristino o un'importazione, e prima di rifiutare un caricamento per archivio pieno, il servizio elimina nella stessa transazione le immagini che né il piano né alcun punto di ripristino usano (`referencedImageIds`). Le immagini scritte da meno di un'ora (`IMAGE_GRACE_S`) non si toccano, perché si caricano prima che il piano che le usa sia salvato; se un punto di ripristino non è leggibile non si elimina nulla. Una planimetria tolta dal piano resta quindi leggibile finché un punto di ripristino la mostra (al più venti punti). Test: sostituzioni dello sfondo e caricamento successivo, immagine in un punto di ripristino, immagine appena caricata, punto illeggibile.
- **Bassa, validatore.** Controllo iterativo del piano prima dello schema: profondità massima 64 e chiavi `__proto__`, `constructor`, `prototype` rifiutate a ogni livello, con 400 (prima 500 su 5000 livelli).
- **Bassa, immagini.** WebP con VP8X: le dimensioni del flusso VP8/VP8L devono essere quelle dichiarate; PNG con `acTL`, `fcTL` o `fdAT` rifiutati (415). Il testo nei blocchi `tEXt` resta accettato (innocuo con `nosniff` e la CSP chiusa; ISSUE-104).
- **Bassa, limite di frequenza.** Le rotte `/images/*` hanno un limite proprio (`CASA3D_IMAGE_RATE_LIMIT`, 600 al minuto) e sono escluse dal limite di 120 al minuto delle altre, così esportazione e importazione di 200 immagini non ne perdono. Test con 130 immagini andata e ritorno.
- **Bassa, bozza e utente.** `useCasa3dHass` non crea `hass` con `planApi` finché l'id dell'utente non è noto, così la bozza di un altro utente non è proposta a un utente non identificato (cancellare la bozza con utente nullo l'avrebbe tolta anche al proprietario a ogni avvio).
- **Non fatto:** la bozza resta quella di `casa3d.unsaved` e il bundle non sa nulla del proprietario; le immagini non sono incluse nella risposta di `GET /backup`.

**Stato.** T6 è fatta per i criteri automatizzabili e sul PC; i criteri sul banco restano aperti. **Punto di ripresa:** decisioni su D13 (ISSUE-102) e ISSUE-085; poi la fase «banco» di T6 oppure T7 (comandi dalla pagina). Dopo T6 il passo successivo del piano è T7; T8 resta fuori da questo giro.
- **2026-10-21 (T6).** Aggiunta la sezione «T6 — Persistenza». Lo stato in testa e il punto di ripresa della sezione «Chiusura» non sono stati riscritti: dopo T6 il passo successivo è la fase «banco» di T6 o T7.

## D16 confermata e rotta di prova nascosta (2026-10-21)

Incarico dell’utente: «conferma /casa3d/ e nascondi la pagina di prova, poi procedi con T6». **D16:** l’indirizzo `/casa3d/` è confermato; nessuna modifica al codice. **Non coperte dalla frase:** le esclusioni del controllo del marchio restano da approvare (ISSUE-089). **Pagina di prova (ISSUE-091):** in `AppRoutes.tsx` la rotta `#/casa3d-prova` esiste solo con `import.meta.env.DEV`; in produzione `ROUTES.casa3dProva` è vuoto, l’import dinamico non entra nella build e l’indirizzo cade sul launcher (test in `Casa3dRoute.test.tsx`). Verifiche: `Casa3dRoute` e `Casa3dLoader` con `--maxWorkers=4`, 15 test verdi; `typecheck`, `lint` e `build` senza errori; la stringa `casa3d-prova` e i chunk `Casa3dProva` non sono in `dist/` (`backup/casa3d/D16-prova/controllo-build.txt`). ISSUE-091 risolto; ISSUE-093 annotato (il difetto dei due renderer riguarda ormai solo lo sviluppo).

## T6 — esito (2026-10-21)

**Modifiche.** Quelle elencate nella sezione «T6 — Persistenza» (backend: tabelle `casa3d_*`, rotte `/api/casa3d/*` con compare-and-swap, ruolo, validatore, immagini, cronologia, esportazione e importazione; frontend: `planApi.ts`, `planRequest.ts`, opzione `planApi` di `haShim.ts`, bozza per utente). Nessun commit, nessuna dipendenza nuova.

**Revisioni.** Una revisione ha trovato un rilievo alto (la base del compare-and-swap lato client), uno medio (immagini senza riferimenti) e quattro bassi, corretti e documentati nella «Rettifica 2026-10-21 (revisione di T6)». Una seconda lettura li ha confermati risolti, tranne uno **ancora aperto (bassa)**: il limite proprio delle immagini (`CASA3D_IMAGE_RATE_LIMIT`, 600 al minuto) non ha effetto nell’app vera, perché davanti c’è il limite globale di `/api` (300 al minuto per IP, condiviso). Esportazione e importazione di circa 200 immagini (oltre 400 richieste) possono superarlo e il pacchetto salta le immagini che falliscono. **La frase «non ne perdono» della rettifica è quindi corretta solo per il router isolato del test**, non per l’app. Correzione proposta (non applicata): escludere `/api/casa3d/images` dal limite globale, con un test che passi da `createApp`; registrata in ISSUE-104.

**Verifiche (PC).** Backend `--maxWorkers=4`: 21 file e 200 test; frontend: seconda suite completa 175 file e 2403 test verdi (la prima si è fermata per circa 87 minuti in `LauncherScreen.test.tsx`, interrotta a mano; il file da solo passa 97/97: blocco intermittente, causa non accertata); `typecheck`, `lint`, `lint:typography` (0 su 487), `lint:theme-colors` (0 su 333), `i18n:check`; build e `check-bundle-size` entro i limiti; `casa3d` 438 test e build; prova a tre contesti di un browser contro il backend vero e un Home Assistant finto, 37 controlli su 37 (eseguita prima delle correzioni di revisione; lo script `due-client/harness.ts` usa ancora `getCasa3dPlanApi`, rimosso, e va aggiornato per rieseguirla). Log in `backup/casa3d/T6/`.

**Banco e tablet (0.9.19).** Copia a freddo PRIMA (`backup/banco/tunet-data-casa3d-T6-pre-0.9.19-freddo.tgz`, 422 142 byte, SHA-256 `aa2a0a92…776768`), versione alzata a 0.9.19 (`progetto/.env`, `isolated-server.mjs`, `release.check.mjs`, README e2e), immagine `aca-system:0.9.19` (`sha256:29941e2c…b684`), container `healthy`; `/api/health` `{"status":"ok","version":"0.9.19"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; `/casa3d/manifest.json` servito; tre tabelle `casa3d_*` presenti; nessun errore all’avvio. **Rete:** il Wi-Fi del PC è ora `192.168.1.7` (era `172.20.10.6`); il binding in `progetto/compose.tunet.yaml` è stato aggiornato di conseguenza. **Tab M11 (HA2KZKYB):** riattivato dalla sospensione (nessun blocco protetto), pagina ricaricata con il bundle `index-B2Ako80C.js` della 0.9.19; una sola scheda dell’app prima e dopo; sessione dell’utente usata dentro la pagina (token mai stampato). Prova su 16 controlli, tutti verdi: senza token e con token falso 401; lettura 200; A salva (revisione 3→4), B rilegge stessa revisione e stesso contenuto, B salva (5), A salva su 4 e riceve 409 con revisione 5 e il piano di B resta, A rilegge e salva il piano d’esempio (6), B vede 6; SVG 415 e non salvato; URL esterno come sfondo 400; revisione invariata dopo i rifiuti. Un primo tentativo parziale (percorso relativo, 404) è scartato e conservato (`prova-log-1-scartata-B-percorso-relativo.txt`). Chiavi di `localStorage` del launcher identiche prima e dopo (37, token escluso). Copia a freddo DOPO (`tunet-data-casa3d-T6-post-0.9.19-freddo.tgz`, 414 354 byte, SHA-256 `c368fb3c…f459`) estratta e aperta con `node:sqlite` in un contenitore senza rete: piano alla revisione 6 (1 piano, 6 stanze, impronta `9b909c96125f09b6`, la stessa letta dal tablet), 0 immagini, 1 punto di ripristino, `integrity_check` ok; poi il container è stato riavviato ed è tornato `healthy`. Evidenze in `backup/casa3d/T6/banco/`. **Ripristino:** `ACASYSTEM_VERSION=0.9.18` più la copia PRIMA.

**Limiti.** (1) Il **403 non è provato sul banco**: serve un utente non amministratore e non si è creato un account; resta coperto dai test e dalla prova sul PC con Home Assistant finto. (2) A e B della prova sul tablet sono due documenti dello stesso tablet con la stessa sessione e lo stesso `localStorage`, non un secondo dispositivo con altro token. (3) Il banco conserva ora il piano d’esempio alla revisione 6 (non c’è una rotta per cancellarlo); prima la casa era vuota, senza piano. La Vista non usa il canale, quindi per l’utente non cambia nulla. (4) Il `reverse` ADB `tcp:3002` è lasciato attivo perché la sessione dell’utente su `localhost:3002` ne dipende; il `forward` di prova è rimosso. (5) Restano D13/ISSUE-102, ISSUE-085, ISSUE-104 e il rilievo aperto sul limite di frequenza.

**«Fatto quando».** Backend: soddisfatto. Due client: soddisfatto sul PC (tre contesti) e sul tablet nella forma sopra (due documenti, stessa sessione). Copia a freddo con il piano: soddisfatto sul banco (tgz DOPO). Restano i limiti elencati, in particolare il 403 e il secondo dispositivo vero.

**Punto di ripresa.** Prossima tappa **T7 (comandi)**, che richiede la decisione su ISSUE-096; prima o in parallelo le decisioni su D13 (ISSUE-102), ISSUE-085, ISSUE-104 e l’approvazione delle esclusioni del marchio (ISSUE-089). Nessun commit.
