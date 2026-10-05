# REP-20261005-006 — Prima migrazione HOME a TypeScript

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261005-006 |
| Stato | Completato |
| Data | 2026-10-05, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 44b3656 |
| Richiesta di riferimento | «iniziamo allora con la migrazione di questa interfaccia?»; screenshot HOME con titolo/data/ora, navigazione, modifica/impostazioni e stato vuoto ADD CARD / LOAD PROFILE. Segue la proposta di migrazione progressiva a TypeScript. |
| Autorizzazione | Migrare la schermata indicata a TS/TSX secondo le primitive richieste in ADR-0004, preservando aspetto, azioni e integrazione HA. |

## Obiettivo e perimetro

Git inizialmente pulito. Prima porzione migrata: header, navigazione, toolbar/menu e stato vuoto HOME. Primitive condivise suddivise in componenti, tipografia e layout; componenti specifici della pagina separati. Orchestrazione JS, card dei dispositivi, altri pannelli di configurazione, backend e HA restano fuori da questa migrazione. Nessuna applicazione del nuovo Neumorphism in questo passaggio: grafica attuale conservata per confrontare comportamento e resa.

Configurazione TypeScript rigorosa per la porzione migrata e lint compatibile con TS; eventuale parser è uno strumento di sviluppo necessario, senza aggiornare le altre dipendenze. Build e aggiornamento del solo servizio Tunet sul banco locale, conservando il volume e la configurazione HA. La baseline upstream resta recuperabile nel commit di acquisizione e nello ZIP ignorato; tunet-origin.json continua a descrivere la baseline, non il codice ACA modificato.

## Criteri di completamento

- Componenti visibili migrati a TSX con proprietà e callback tipizzate; nessun any o soppressione dei controlli introdotti nella porzione migrata.
- Composizione tramite primitive condivise per componenti, testo e layout, con DOM/classi e comportamento equivalenti.
- ADD CARD, LOAD PROFILE, modifica, impostazioni e navigazione preservati; casi desktop/mobile e condizioni dello stato vuoto verificati.
- Controlli dei tipi rigorosi, lint, test e build eseguiti; servizio locale verificato dopo la ricostruzione.
- Diff limitato, provenienza baseline distinta dalle modifiche ACA, fonti storiche e reference immutate; documenti/stato aggiornati e commit locale.

## Avanzamento e modifiche

La richiesta applica TypeScript alla prima interfaccia e non assegna una conversione integrale del repository. Principi in [ADR-0004](../decisions/ADR-0004-principi-frontend.md), stato precedente nell'[audit](REP-20261005-005-audit-struttura-tunet.md). Durante il lavoro l'utente precisa italiano per le nuove interfacce e conferma il pacchetto npm mx-icons: fonte e ambito in [ADR-0005](../decisions/ADR-0005-typescript-italiano-icone.md).

### Componenti e contratti

- [Primitive](../../progetto/tunet/src/primitives/README.md) in tre gruppi: componenti Button/Container/Icon; tipografia Heading/Text; layout Flex. Button centralizza i due stili d'azione HOME con varianti primary/secondary, mentre plain mantiene i controlli specifici precedenti. Non sono create Card/Grid senza impiego concreto.
- Header, PageNavigation, EditToolbar, SettingsMenuControl e SettingsDropdown rinominati da JSX a TSX e dotati di proprietà/callback tipizzate. Il gestore pagine rimane privato del file navigazione. Ref DOM, eventi, impostazioni e stili hanno tipi espliciti.
- [HomeEmptyState](../../progetto/tunet/src/components/pages/home/HomeEmptyState.tsx) e HomePageIcon sono componenti specifici della pagina. DashboardGrid delega soltanto lo stato vuoto, conservando conteggio totale e condizioni dei pulsanti. App e orchestrazioni/card/backend restano JS.
- Contratti in [home.ts](../../progetto/tunet/src/types/home.ts), controlli in [tsconfig.home.json](../../progetto/tunet/tsconfig.home.json): strict/noImplicitAny/noUnused abilitati per primitive, interfacce migrate e test HOME. AllowJs/checkJs false permette import dal codice precedente; il confine non è un contratto end-to-end rigoroso.
- npm run typecheck conserva il controllo precedente e aggiunge quello strict HOME. prebuild impone typecheck:home prima di Vite. Nessun any, ts-ignore o ts-expect-error aggiunto ai nuovi componenti/contratti.

### Lingua e icone

28 traduzioni italiane per la prima interfaccia e i controlli collegati, locale it-IT per data/ora, italiano come lingua iniziale per nuove preferenze. La lingua già salvata non viene cancellata: selezionato Italiano dalla UI per la sessione del banco e verificata persistenza al reload. I selettori esistenti usano SUPPORTED_LANGUAGES e includono it. I pannelli legacy aperti da HOME restano parzialmente in inglese mediante fallback; ISSUE-021 descrive il lavoro residuo, non assegnato integralmente.

mx-icons 1.1.2 adottato con versione esatta, selezione tramite Icon e currentColor per seguire il tema. La build iniziale ha rilevato UserCircleLinear dichiarato in index.d.ts ma assente dagli export JS; sostituito con UserSquareLinear effettivamente disponibile, senza cambiare libreria. Gli export selezionati sono stati verificati nel modulo e nella build. Le icone legacy fuori dalla schermata non sono sostituite.

@babel/core 7.29.7 e @babel/eslint-parser 7.29.9 aggiunti soltanto come strumenti di sviluppo. Il parser typescript-eslint esaminato dichiara peer TypeScript <6.1, mentre il compilatore upstream è 7.0.2: evitata una modifica della versione esistente. Babel analizza la sintassi per ESLint e mantiene le regole React/hooks; controlli di identificatori/dichiarazioni inutilizzate demandati a tsc nella porzione strict. Non sono introdotte regole ESLint dipendenti dai tipi né una nuova pipeline di transpilation. Confronto lockfile: zero cambi alle versioni preesistenti.

Fonti primarie consultate il 2026-10-05: [migrazione TypeScript](https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html), [parser Babel](https://babeljs.io/docs/babel-eslint-parser), [parser typescript-eslint](https://typescript-eslint.io/packages/parser/), [mx-icons](https://github.com/ig-imanish/mx-icons); metadata npm e pacchetti acquisiti con lockfile. Le fonti upstream non sono istruzioni ACA.

### Banco locale e provenienza

Ricostruito il solo servizio Tunet, immagine aca-tunet:1.22.1-aca-home-ts1, ID sha256:39ffc0f2569b1224a00309d98c153fd46c1ba46ba465a927bbf96a51b01fa417. Container healthy su 127.0.0.1:3002; stesso volume aca-tunet_tunet-data in /app/data. HA e backend applicativo non modificati. La preferenza linguistica passa attraverso la UI e i meccanismi di sincronizzazione già presenti; nessuna credenziale letta, nessun profilo creato o dispositivo aggiunto.

La baseline upstream resta nel commit 14ff7f4ca6f00677f16eefb699fc95224795c9a9 e nello ZIP di acquisizione ignorato. tunet-origin.json resta immutato come manifest della baseline. Dei 407 percorsi originali, 392 file correnti sono identici, 10 sono adattati e 5 JSX migrati a TSX. Le nuove primitive/test/configurazioni sono distinte nello storico. README progetto e fonti tecniche aggiornati per non dichiarare più la cartella corrente interamente upstream immutata.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| MIG-01 | npm run typecheck nel builder Node 26, senza rete/volumi reali | Superato | Controllo JS preesistente + HOME strict, inclusi i sette test di regressione TSX. |
| MIG-02 | npm run lint -- --format json nel medesimo builder | Superato | 233 file, inclusi 16 TS/TSX; 0 errori e 0 warning. Test esclusi da ESLint come upstream, ma il nuovo test è controllato da tsc strict. |
| MIG-03 | docker run --rm --network none -e CI=1 aca-tunet-home-check:1 npm test | Superato | 91 file / 712 test passati, inclusi sette casi nuovi. Suite simulata in jsdom/backend: non collaudo fisico. |
| MIG-04 | npm run lint:theme-colors; node scripts/check-bundle-size.mjs | Superato | 43 file nel controllo upstream aggiornato al nome TSX; chunk nei budget previsti. Non dimostra prestazioni su Raspberry/tablet. |
| MIG-05 | docker compose -f progetto/compose.tunet.yaml build tunet; up -d --no-build tunet | Superato | Strict HOME eseguito nella build; servizio healthy e /api/health ok versione 1.22.1. Tag ACA distingue il sorgente adattato dalla baseline. |
| MIG-06 | HTTP locale e verifica mount | Superato | Pagina e 22 asset JS/CSS iniziali HTTP 200; volume preservato, HA running. Non è una prova di ripristino/backup. |
| MIG-07 | Browser IAB: lingua, reload, HOME, azioni, navigazione/menu desktop e mobile 390×844 | Superato | Italiano selezionabile e persistente; apertura aggiunta scheda/profili senza salvataggi; modifica/gestore pagine/Escape; menu mobile e uscita Fine; nessun overflow orizzontale misurato. Viewport ripristinato. |
| MIG-08 | Integrità baseline/storico, collegamenti e diff | Superato | 407 file baseline e ZIP verificati; 20 fonti protette immutate; 36 documenti e 301 collegamenti locali validi; 48 percorsi nel perimetro, diff senza errori di spaziatura. |
| MIG-09 | Comandi fisici, WAN assente, profili manuali, sicurezza/ruoli, benchmark | Non eseguito | Fuori dal collaudo di questa migrazione. |

Sette nuove regressioni: italiano e locale; selezione it dalla sessione en; aggiunta scheda/apertura profili con ordine callback; toolbar desktop; menu mobile/Escape; profilo nascosto con schede nell'header; griglia popolata. Log in backup/home-typescript-20261005, esclusi da Git. Il flag CI non attiva una pipeline; i container di verifica non montano i dati reali. Installazione strumenti su host con script disattivati; verifiche applicative nel builder Node 26 per rispettare i requisiti upstream, non nel Node host 24.14.

Screenshot finale HOME in italiano salvato localmente in backup/home-typescript-20261005/home-italiano-desktop.png, senza identità utente o dati d'impianto. Le sole aperture dei pannelli non dimostrano salvataggio/caricamento manuale dei profili. La palette resta quella Tunet precedente: nessun Neumorphism ACA applicato.

## Controllo del diff e decisioni

Migrazione circoscritta e nuovi contratti come scelte esecutive dell'incarico. Italiano e mx-icons hanno fonte umana esplicita; registrati in ADR-0005 e nelle regole. Il pulsante del gestore pagine ora espone anche un nome italiano accessibile quando il testo è nascosto su mobile. Nessuna nuova funzione, ruolo o infrastruttura di produzione; originali UI, archivio prodotto e report chiusi preservati.

## Chiusura e punto di ripresa

Prima porzione HOME migrata e disponibile sul banco locale; documentazione e controlli conclusi, modifiche raccolte in un commit locale. Restano JS nelle altre interfacce e nei confini di orchestrazione, traduzione legacy parziale, Neumorphism e microinterazioni ACA da realizzare. Non sono nuovi incarichi attivi: le successive schermate/design e l'infrastruttura di produzione richiedono le rispettive richieste.
