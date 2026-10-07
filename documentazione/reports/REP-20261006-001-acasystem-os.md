# REP-20261006-001 — Rifacimento del frontend come «OS» Metallo, con subagenti

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261006-001 |
| Stato | Completato (chiusura delle correzioni in REP-20261006-002) |
| Data | 2026-10-06, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`), orchestratore; subagenti general-purpose per le ondate parallele |
| Commit di partenza | e192121, con le modifiche non committate di REP-20261005-011/012; istantanea `usa-come-git/v001` |
| Richiesta di riferimento | Chat del 2026-10-06. Applicare i principi impeccable al frontend; obiettivo minimo il rifacimento del frontend Tunet di Home Assistant, con scelte di layout e composizione delegate; subagenti in parallelo e revisione finale; struttura frontend/backend dall'immagine con primitive e gerarchia. Tipografia senza maiuscolo, tracking e grassetto. Accenti arancione #ff622a + blu elettrico; Aspetto eliminato; launcher stile Android; TypeScript ovunque. Piano approvato. |
| Autorizzazione | [ADR-0007](../decisions/ADR-0007-acasystem-os.md), [ADR-0008](../decisions/ADR-0008-struttura-frontend-backend.md). Inclusi: riorganizzazione in workspaces, nuove primitive, rifacimento dell'interfaccia, istantanee in usa-come-git, aggiornamento del banco locale. Esclusi: commit, remote, nuove dipendenze (oltre `@fontsource/inter`, già autorizzata), funzionalità nuove oltre la parità con Tunet, modifiche a HA. |

## Obiettivo e perimetro

Parità funzionale con il frontend Tunet (escluso il pannello Aspetto), ricostruita come «OS» Metallo:
- barra di stato;
- pager con copertina calendario;
- launcher a widget stile Android;
- widget per dominio;
- fogli di dettaglio;
- pagina Sistema;
- collegamento a HA.

Backend Tunet portato in TypeScript a livelli, con gli stessi endpoint.

Ondate dal piano approvato:

| Ondata | Contenuto |
|---|---|
| 0 | Istantanea, decisioni, struttura (orchestratore). |
| 1 | Backend, nucleo frontend e sistema visivo, in parallelo; poi checkpoint con l'utente. |
| 2 | Launcher, widget I e II, sistema e collegamento, in parallelo. |
| 3 | Integrazione. |
| 4 | Revisione finale in parallelo, correzioni, banco. |

REP-20261005-012 confluisce qui: le sue fasi 1–2 sono la base; la sua fase 3 è sostituita dalle ondate 2–3.

## Criteri di completamento

- Struttura a due pacchetti con gerarchia verificata dal lint; nessun JavaScript applicativo residuo; strict TypeScript.
- Kit con bilanciamento di nero e ombre, accenti e tipografia approvati dall'utente sulla matrice degli stati.
- Launcher con modifica a celle (mouse, tocco, tastiera), swipe, pallina e copertina. Widget di tutti i domini Tunet, con stati di caricamento, errore, non disponibile e richiesto/confermato.
- Pagina Sistema, collegamento a HA e profili funzionanti; Aspetto rimosso.
- Typecheck, lint (gerarchia, tipografia, colori), suite, build, budget, immagine Docker con health e banco aggiornato.
- Revisione finale chiusa: rilievi corretti o registrati.

## Avanzamento e modifiche

**Ondata 0 (orchestratore):**
- Istantanea `usa-come-git/v001` (512 file, 7,2 MB) con VERSIONE.md; `/usa-come-git/**` in .gitignore.
- ADR-0007 e ADR-0008 registrate. Problema ISSUE-023 aperto (blocco impostazioni rimosso).
- **Divisione dei pacchetti:**
  - `progetto/tunet` → `progetto/acasystem` con `git mv`, così lo storico dei file resta;
  - frontend in `frontend/`; server in `backend/src`; file solo upstream (changelog, docs, add-on, workflow, compose upstream) in `upstream-tunet/`; database di sviluppo in `backend/data`;
  - package.json diviso: radice con workspaces e `concurrently`, frontend con le sue 13 dipendenze, backend con `better-sqlite3`, `express`, `express-rate-limit`, `ws`, `@mdi/js` e `home-assistant-js-websocket` (le ultime due già presenti nel progetto, usate dal server).
- **Pacchetti di soli tipi autorizzati dall'utente:** `@types/node` 26.6.4, `@types/express` 5.0.6, `@types/better-sqlite3` 9.6.0, `@types/ws` 8.18.2, solo nel workspace backend.
- **Server:** il percorso predefinito della build è ora `frontend/dist`.
- **Docker e Compose:** Dockerfile multi-stage per i workspaces e `.dockerignore`; Compose costruisce da `./acasystem` e tiene l'immagine attuale fino all'ondata 4.
- **Attributi Git:** `.gitattributes` aggiornato (`progetto/acasystem/** -text`) e `.gitignore` sui nuovi percorsi.
- **Frontend:**
  - alias `@/` → `frontend/src` in Vite, Vitest e TypeScript;
  - primitive spostate in `src/components/primitives`, tema in `src/themes/acasystem`, pagina del kit in `src/pages/kit`; 35 import riscritti in 32 file con uno script che risolve i percorsi;
  - `tsconfig.home.json` → `tsconfig.strict.json`, con glob per cartella: ogni `.ts`/`.tsx` delle nuove cartelle è strict appena esiste;
  - regola ESLint della gerarchia tra strati. Unica violazione esistente: `Modal` → `components/ui`, assegnata ad A3.
- **Correzione preesistente:** tipo generico di `Segmented` nella pagina del kit, segnalato dal typecheck non strict.
- README di `progetto/` annotato; nuovo README di `progetto/acasystem`.
- Istantanea `usa-come-git/v002` (516 file).

**Ondata 1 (subagenti in parallelo, resoconti verificati dall'orchestratore):**

- **A1, backend.**
  - `backend/src` in TypeScript strict a livelli: `@types`, `config`, `controllers`, `helpers`, `middlewares`, `models`, `routes`, `services`, `validators`, `server.ts`.
  - Eseguito da Node con lo stripping dei tipi, senza build.
  - Endpoint, codici, forme JSON, header (CSP), rate limit, database `tunet.db` e schema invariati.
  - Validatori scritti a mano con gli stessi messaggi; database e cifratura iniettati nei servizi, quindi i test non toccano il database reale.
  - 13 file / 83 test (28 originali + 55 nuovi); ESLint per il backend.
  - Differenze note, solo su casi limite: elenco nel resoconto dell'agente, riportato in ISSUE-024.
- **A2, nucleo frontend.**
  - `types` → `@types` (interfacce reali al posto dei typedef JSDoc); `utils`, `config` (tranne `themes.js`) e `i18n` → `utils/`; `services` → `api/`, con il client REST deduplicato in `backendClient.ts`; `contexts` → `hooks/context/`, con gli stessi export; hook → `.ts`. Tutto in strict.
  - `useCardRendering.jsx` resta JS: è sostituito dal launcher.
  - Nuovi `validators/`: configurazioni salvate, snapshot e profili, token OAuth, entità e payload HA, risposte del backend. 20 test.
  - Con dati malformati le guardie ora scartano voci prima accettate; con dati validi il comportamento è identico.
  - Aggiunto un sovraccarico globale di `parseFloat`, da rimuovere quando le schermate legacy che lo richiedono saranno riscritte.
- **A3, sistema visivo.**
  - Bilanciamento di nero e ombre: socket grafite rgb(96 96 96); una fisica per stato; guscio più leggero e token per le card; pressione soft e piena; strato LED per la selezione blu e l'errore.
  - Accenti in OKLCH con varianti ink calcolate: arancione testo #7b290b ≥4,68, icone #a3380f ≥3,24; blu testo #1233b1 ≥4,75, icone #1d48e5 ≥3,26.
  - Primitive tipografiche (Display, Title, Body, Label, Caption, Numeric, IconText), solo pesi 300/400/500; i file di Inter 600/700 non vengono più caricati.
  - Stati `loading`, `pending`, `error`; Sheet su `<dialog>`, Popover nativo, DialogShell (Modal non dipende più da `components/ui`), scala degli z-index.
  - Matrice degli stati nella pagina del kit; `scripts/lint-typography.mjs`; 65 test.
- **Integrazione (orchestratore).**
  - Dockerfile con `node src/server.ts`; engines `>=22.18`; test del backend esclusi dall'immagine.
  - Script `lint:typography` e `i18n:check` aggiornati; voci obsolete tolte da `tsconfig.strict.json`.
  - JSDoc in `ConditionBuilder.jsx` per i tre errori del typecheck non strict.
- **Checkpoint 1 approvato dall'utente** (annotazione in ADR-0007): rosso #b91c1c; etichette dell'interruttore «Acceso»/«Spento», con la traccia allargata a 6,75 em. Istantanea `usa-come-git/v003`.

**Ondata 2 avviata:**
- **Contratto comune scritto dall'orchestratore:**
  - `@types/launcher.ts`;
  - `hooks/launcher/{WidgetRuntimeContext,LauncherContext}.tsx`;
  - `components/widgets/registry.ts` con quattro gruppi;
  - segnaposto con le props definitive di `templates/sheets`, `pages/system` e `pages/connect`;
  - `utils/fixtures/runtime.ts`.
- **Regole comuni** in `C:\Users\matti\.claude\plans\acasystem-wave2-common.md`.
- **Sei agenti in parallelo:**

  | Agente | Perimetro |
  |---|---|
  | B1 | launcher, pager, pallina, copertina, barra di stato, nuova app |
  | B2 | controlli: sensore, luce, automazioni, ventilatore, tapparelle, serratura, pagina luci |
  | B3 | clima, meteo, calendario, attività, allarme |
  | B4 | media, Sonos, TV, videocamere, pagine media/Sonos |
  | B5 | costi, Nordpool, auto, aspirapolvere/tosaerba, stanze, separatore, pagine batteria/stanze |
  | B6 | aggiunta widget, impostazioni widget e pagina, Sistema, collegamento |

- L'utente ha autorizzato a procedere in autonomia fino alla revisione finale.

**Ondata 2: esiti** (i sei agenti si sono fermati per un limite d'uso dell'API e sono stati ripresi con il loro contesto).

| Agente | Esito | Test |
|---|---|---|
| B1 | Launcher completo. Migrazione una tantum dalla configurazione legacy; il layout del launcher diventa la fonte di verità, sincronizzata con `pagesConfig`/`pageSettings` e inclusa nello snapshot dei profili. | 63 |
| B2 | Controlli. Gesto di luminosità con invii limitati a 180 ms e conferma da HA entro 5/255. | 98 |
| B3 | Clima, meteo, calendario, attività, allarme con tastierino PIN mai salvato né registrato. | 72 |
| B4 | Lettori, gruppi Sonos, Android TV e Apple TV, videocamere con stream in cascata, pagine media e Sonos. | 61 |
| B5 | Costi, Nordpool, auto, aspirapolvere e tosaerba, stanze, separatore, pagine batterie e stanze. | 65 |
| B6 | Fogli di aggiunta widget, impostazioni del widget e della pagina; pagina Sistema e collegamento a HA, senza Aspetto. | 40 |

Dettagli di B1:
- griglie 4×6, 6×8 e 8×5 per classe di dispositivo;
- modifica con pressione lunga, trascinamento e ridimensionamento, oppure da tastiera;
- pager con scroll-snap, indicatore a pallina, copertina con calendario e orologio;
- barra di stato con chip e connessione;
- nuova app in `src/main.tsx`.

Le differenze volute rispetto al legacy sono elencate nei resoconti degli agenti e riassunte nella chiusura.

**Verifica dell'orchestratore:**
- typecheck strict e non strict senza errori; lint, colori e tipografia puliti;
- frontend 1194/1198 (restano i 4 fallimenti legacy noti); backend 83/83;
- tutti gli import da mx-icons esistono a runtime.

Il pacchetto mx-icons 1.1.2 dichiara 2187 icone lineari nei tipi, ma ne contiene 946 a runtime: il typecheck non protegge le icone. Istantanea `usa-come-git/v004`.

**Ondata 3: contratto e primitive, aggiornati dall'orchestratore prima delle corsie parallele.**
- `WidgetRuntime.haConfig` (unità e valuta di HA) e `PageKindProps` (impostazioni della pagina speciale passate da PageKindHost).
- `WidgetDefinition.frameless`, documentato insieme alla convenzione: il widget rende solo contenuto e l'area dei dettagli porta `data-widget-open`.
- `WidgetHost` con cornice statica: si abbassa solo quando l'opener è in hover o pressione (regole `:has()` in `launcher.css`), mai per i comandi interni; ramo senza cornice.
- `Icon`: 41 nomi nuovi verificati a runtime, quattro glifi locali (accensione, termometro, ventilatore, tapparella) per le icone che mx-icons dichiara ma non contiene, `iconNames`/`isIconName`.
- Slider: area di tocco di almeno 44 px.
- Le sei corsie (controlli, casa, media, utilità, sistema, shell) girano come workflow con cartelle esclusive.

**Ondata 3: esiti delle corsie** (sei su sei completate; resoconti integrali nel journal del workflow).

| Corsia | Esito |
|---|---|
| Controlli | I widget rendono solo contenuto (`WidgetContent` con `data-widget-open`); `data-no-long-press` su manopola e cursori; icone della primitiva più 13 glifi locali verificati; unità da `haConfig`; `LightsPage` con `PageKindProps`; container query per celle di tablet e telefono. Nuovo `ControlsFrame.test` (27 casi). |
| Casa | Rimossa la card propria di WidgetShell; opener e `data-widget-error`; icone del kit; unità di temperatura, pressione, vento e precipitazioni da `haConfig`, con i ripieghi legacy. |
| Media | Opener `data-widget-open` esteso; icone del kit, con glifi locali per shuffle e altri comandi senza equivalente; pagine media e Sonos con `PageKindProps`. 81 test. |
| Utilità | Correzione dell'anteprima per `PageKindProps`; separatore `frameless`, regola `:has()` rimossa; valuta e unità da `haConfig`. Senza valuta configurata non si mostra più un simbolo inventato. |
| Sistema | Catalogo e IconPicker sulla lista del kit (`iconNames`/`isIconName`); 22 tipi con icone distinte; i nomi legacy salvati restano e si mostrano con l'icona generica. 47 test. |
| Shell | Vedi sotto. |

Lavoro della corsia shell:
- **Pagina principale:** `index.html` carica la nuova app (lang it, titolo «Acasystem», senza Google Fonts); `manifest.json` aggiornato.
- **Launcher:** Sistema montata dentro LauncherProvider; pagina attiva ricordata (`tunet_active_page`); impostazioni aperte dopo l'aggiunta di attività o auto, come nel legacy.
- **Contesti:** ConfigContext a valori fissi (ADR-0007), senza tema, lingua, font, sfondo, blocco con PIN e inattività. `styles/index.css` contiene solo Tailwind.
- **Configurazione:**
  - un solo tsconfig strict, con `allowJs`/`checkJs` spenti; sovraccarico di `parseFloat` rimosso (ISSUE-025);
  - hook postbuild Docker tolto; `lint-theme-colors` riscritto sulle cartelle nuove; README e2e;
  - test ShellLauncher e ShellApp.

**Cancellazione del legacy NON eseguita.** Il classificatore dei permessi ha negato alla corsia shell la cancellazione dei file legacy («Irreversible Local Destruction»), poi anche lo spostamento in `backup/`. L'orchestratore non ha aggirato il diniego.
- Il legacy resta su disco, ma è escluso da typecheck, lint e build: nel bundle non ne resta traccia.
- La rimozione attende l'autorizzazione esplicita dell'utente, con l'elenco preparato dalla corsia.
- Finché non avviene, nella suite falliscono 5 test del legacy.

**Integrazione dell'orchestratore:**
- `launcher.css`: il contenuto della cornice non taglia più le ombre (`overflow: visible`) e l'opener copre tutta la faccia (`position: static`); la cornice accende il LED rosso con `:has([data-widget-error='true'])`.
- `Modal`: velo del kit al posto della variabile legacy `--modal-backdrop`.
- Dockerfile: build del frontend senza flag postbuild.
- Nuovo test permanente `IconRuntime.test.tsx`: ogni import da mx-icons deve esistere a runtime e ogni icona del kit deve disegnare un SVG. La prova di mutazione con `PowerLinear` è fallita come atteso.

**Verifiche dopo l'ondata 3:**
- typecheck, lint, colori e tipografia senza violazioni;
- frontend 1302/1307 prima del test icone (5 falliti, tutti test del legacy escluso);
- backend 83/83;
- `vite build` riuscita: un solo HTML, nessun Google Fonts, budget rispettati (index 650,7/900 KB), `hls.js` caricato a richiesta.

Istantanea `usa-come-git/v005`.

**Ondata 4: revisione finale.** Workflow con cinque revisori indipendenti e un verificatore avversario per ogni dimensione. Il verificatore conferma un rilievo solo con prove: codice, test di riproduzione nello scratchpad o browser.

| Dimensione | Ambito | Confermati | Scartati |
|---|---|---|---|
| Correttezza e TypeScript | Launcher, persistenza, routing, fogli, backend | 7 (P1 2, P2 3, P3 2) | 1 |
| Parità con Tunet | Servizi HA, impostazioni, aggiunta widget | 4 (P1 2, P2 1, P3 1) | 0 |
| Accessibilità, responsive, prestazioni | Impeccable audit, Playwright a 390, 768 e 1280 px | 10 (P1 2, P2 7, P3 1) | 0 |
| Coerenza del design | Impeccable critique, screenshot a 1280 e 390 px | 9 (P2 4, P3 5) | 1 |
| Sicurezza, privacy, offline | Credenziali, CSP, input, richieste esterne | 5 (P1 2, P2 1, P3 2) | 0 |

In totale 35 confermati (8 P1, 16 P2, 11 P3) e 2 scartati:
- **CORR-8:** nessun percorso del codice produce placements fuori griglia;
- **DES-5:** vocabolario per gruppo di widget; è una proposta di unificazione, non un difetto.

I P1:
1. dettagli dei widget generici `sensor.*`/`switch.*` che non si aprono (CORR-1);
2. pagine non riordinabili (CORR-5);
3. scelta dei lettori della pagina Multimedia irraggiungibile (PAR-1);
4. widget Attività senza scelta della lista (PAR-2);
5. spostamento e ridimensionamento solo per trascinamento sul tablet touch (A11Y-1, WCAG 2.5.7);
6. telefono in orizzontale e zoom con celle da 32–56 px (RESP-1);
7. backend che valida il token presso un HA scelto dal client (SEC-1, ereditato da Tunet);
8. token OAuth che sopravvivono a «Esci» e al cambio di metodo (SEC-2).

Le correzioni girano in otto corsie a proprietà esclusiva: launcher logica, launcher interfaccia, fogli, widget controlli e casa, widget media e utilità, sistema, kit, backend. Prima delle corsie l'orchestratore ha fissato tre contratti:
- `hooks/launcher/PageVisibilityContext.tsx` con `usePageVisible()`;
- il guscio unico delle pagine speciali in PageKindHost;
- la parola e il colore unici dello stato di connessione.

**Banco.** Su richiesta dell'utente («come mai io vedo ancora così l'app?») l'orchestratore ha provato a passare il banco alla nuova immagine prima della fine della revisione. Il classificatore dei permessi l'ha negato come deploy in produzione: il banco e `compose.tunet.yaml` restano invariati. Prima del diniego è stata salvata una copia del volume a container acceso: `backup/banco/tunet-data-20261006-pre-acasystem.tgz`, con database, WAL e SHM. All'utente sono stati dati i comandi per aggiornare il banco da sé, oppure può autorizzare l'operazione.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Istantanea v001 | tar con esclusioni → usa-come-git/v001 | Superato | 512 file; esclusi .git, backup, node_modules, dist. |
| Lockfile dopo i workspaces | Confronto delle 538 versioni `node_modules/*` prima e dopo `npm install` | Superato | 0 versioni cambiate, 0 rimosse. Aggiunti i 2 collegamenti dei workspace e i pacchetti di tipi autorizzati con le loro dipendenze di tipo (13). |
| Frontend dopo lo spostamento | `npm run typecheck -w frontend`, `lint`, `lint:theme-colors`, `test`, host Node 24.14 | Superato con fallimenti attesi | Typecheck, lint e colori a 0 errori. Suite: 93 file, 742 test, 4 fallimenti preesistenti di REP-012 (schermate non ancora migrate). |
| Backend dopo lo spostamento | `npm run test -w backend` | Superato | 4 file, 28 test. |
| Immagine Docker di verifica | `docker build -t aca-system:wave0-check acasystem`; container temporaneo sulla porta 3012, senza volume | Superato | Primo tentativo fallito: `@mdi/js` mancava nel backend; corretto. `/api/health` → `{"status":"ok","version":"0.1.0"}`, root 200. Container rimosso; banco invariato. |
| Istantanea v002 | tar con esclusioni → usa-come-git/v002 | Superato | 516 file. |
| Backend dopo A1 (ripetuto dall'orchestratore) | `npm run test`, `typecheck`, `lint -w backend` | Superato | 13 file, 83 test; tsc 0 errori; ESLint 0. Nessun `.js` né CRLF residuo. Avvio reale e health dichiarati dall'agente (porta 3013, database temporaneo). |
| Frontend dopo A2 e A3 (orchestratore) | `npm run typecheck`, `lint`, `lint:theme-colors`, `lint:typography`, `test -w frontend` | Superato con fallimenti attesi | Typecheck strict e non strict: 0 errori dopo la JSDoc in ConditionBuilder. Lint, colori e tipografia: 0 violazioni nelle cartelle a strati (287 file); nel legacy restano 2239 occorrenze, da eliminare con il redesign. Suite: 97 file, 795/799; i 4 falliti sono i noti delle schermate legacy. |
| Kit (A3) | Vitest su MetalKit, MetalMaterial, PressureMaterial e Kit*; Playwright con Chromium locale a 1280 e 390 px | Superato | 65 test. Nessun overflow; Sheet modale con ritorno del focus; Popover; anello di focus blu; movimento ridotto emulato. Screenshot `backup/metal-kit-20261005/ondata1-*`. Senza tablet fisico. |
| Checkpoint 1 | Matrice degli stati inviata all'utente | Approvato | «ok, rosso va bene, usa Acceso/Spento e procedi con l'ondata 2». |
| Istantanea v003 | tar con esclusioni → usa-come-git/v003 | Superato | 591 file. |

## Controllo del diff e decisioni

- Il diff segue il piano approvato e le decisioni registrate in ADR-0006, ADR-0007 e ADR-0008:
  - kit Metallo;
  - accenti #ff622a/#295bff;
  - tema unico e pannello Aspetto rimosso;
  - launcher a pagine con pressione lunga;
  - TypeScript strict in due pacchetti;
  - versioni in `usa-come-git` invece dei commit.
- Nessuna dipendenza oltre a quelle autorizzate (`@fontsource/inter`, pacchetti di tipi del backend).
- Il legacy Tunet resta su disco, escluso dalla build (ISSUE-029).
- Le correzioni della revisione finale e le loro decisioni sono documentate in [REP-20261006-002](REP-20261006-002-ripresa-revisione.md).

## Chiusura e punto di ripresa

Annotazione del 2026-10-07:
- **Correzioni.** Il workflow di correzione di questa ondata è stato fermato per il limite d'uso. Il lavoro è stato ripreso da Codex e poi chiuso da Claude Code in [REP-20261006-002](REP-20261006-002-ripresa-revisione.md): 35 rilievi valutati, i P1 confermati da un verificatore avversario, residui in ISSUE-026/027/028.
- **Verifiche finali:**
  - typecheck, lint, tipografia e colori a 0;
  - frontend 1476/1481, con i 5 test del legacy;
  - backend 100/100;
  - build nei budget;
  - immagine `aca-system:0.1` provata.
- **Banco.** Non aggiornato dall'agente: permesso negato. I comandi sono stati dati all'utente.
- **Ripresa.** Il 2026-10-07 l'utente mostra la versione in ufficio. Le modifiche successive dipenderanno dal parere raccolto e saranno un nuovo incarico.

### Annotazione del 2026-10-07: cancellazione del legacy (ISSUE-029)

La cancellazione rimasta in sospeso nell'ondata 3 è stata autorizzata dall'utente in chat («procedi con la cancellazione del legacy»). Il classificatore dei permessi l'ha negata di nuovo all'agente («Irreversible Local Destruction»), quindi l'utente l'ha eseguita da WSL con l'elenco preparato dall'agente. Quanto riportato sopra resta valido come storico.

- **Elenco.** È ricavato da un tracciamento statico delle importazioni a partire da tutte le pagine HTML, dai test TypeScript e dal setup dei test: 504 file raggiunti, 213 mai raggiunti, nessuna importazione irrisolta. Due test JSX (`HomeAssistantWarnings`, `MetalMaterial`) usano solo codice nuovo e restano. Si aggiungono:
  - 7 moduli TypeScript usati solo dal legacy: tipi `home`/`management`, `useEnergyData`, `useGuardedUiActions`, `useLowPowerMotion`, `useSettingsAccessControl`, `statusPillPresentation`;
  - gli e2e di Tunet;
  - `postbuild.js`, `release.mjs`, `translate_de.py`.
  Totale 232 file, in `backup/legacy-da-cancellare.txt`.
- **Pulizia:**
  - `tsconfig.strict.json` senza esclusioni legacy;
  - `lint-typography.mjs` senza il conteggio del legacy;
  - regola ESLint delle primitive senza cartelle inesistenti;
  - `main.tsx` importa da `app.tsx`, ora che `App.jsx` non lo oscura più;
  - `playwright.config.js` cerca `*.e2e.ts`, README e2e aggiornato;
  - commenti e documenti che descrivevano il legacy come presente.
- **Verifiche:**
  - typecheck, ESLint, tipografia e colori a 0;
  - Vitest 1161/1161 in 102 file;
  - build e budget ok;
  - immagine `aca-system:0.1.1-check` provata sulla porta 3012;
  - anteprime a 1280×800 e 390×844 uguali alle precedenti.
  Il CSS scende da 219 a 104 KB perché Tailwind non genera più le classi usate solo dal legacy; nessuna di queste è usata dal codice nuovo.
- **Banco.** Resta su `aca-system:0.1` per la demo. La nuova build è funzionalmente uguale; il passaggio si può fare dopo la demo.
- **Dipendenze.** Restano installate quelle usate solo dal legacy (decisione dell'utente pendente in REP-20261006-002).
- **Istantanea:** `usa-come-git/v012`.

### Annotazione del 2026-10-07: pagina ricordata superata

La «pagina attiva ricordata» (`tunet_active_page`), introdotta dalla corsia shell nell'ondata 3, non decide più l'avvio. Su richiesta dell'utente il launcher apre sempre «Principale», la prima pagina di widget: vedi [REP-20261007-001](REP-20261007-001-launcher-polish.md). Il resto del report resta valido come storico.
