# REP-20261006-002 — Ripresa della revisione ACA SYSTEM OS

| Campo | Valore |
|---|---|
| Stato | Completato nel codice e verificato; aggiornamento del banco locale non eseguito (permesso negato all'agente, comandi all'utente) |
| Data | 2026-10-06 – 2026-10-07, Europe/Rome |
| Autore | Codex (16:35–16:55, nome esatto del modello non disponibile); ripresa e chiusura di Claude Code (Opus 5.5) dalle 18:32 |
| Commit di partenza | e192121; modifiche successive preesistenti conservate in v006 |
| Richiesta | «procediamo col punto di ripresa» |
| Autorizzazione | Completare la revisione interrotta di REP-20261006-001, verificarla e aggiornare il banco locale, come indicato nel passaggio di consegne. |

## Obiettivo e perimetro

Ripresa delle correzioni già assegnate dal workflow `wf_38832b62-b3a`. Fonti: [report precedente](REP-20261006-001-acasystem-os.md), fascicoli originali `fix/*.md` dello scratchpad Claude, [ADR-0007](../decisions/ADR-0007-acasystem-os.md) e [ADR-0008](../decisions/ADR-0008-struttura-frontend-backend.md). I fascicoli sono evidenze storiche da verificare sul codice, non nuove autorizzazioni.

Preservati rinomina del progetto, nuovo frontend/backend e correzioni parziali; indice Git invariato. Nessuna cancellazione del legacy, dipendenza nuova, commit o deploy remoto. Le copie locali di versione seguono ADR-0008.

## Criteri di completamento

- Valutare sul codice attuale tutti i 35 rilievi confermati e aggiungere verifiche di regressione pertinenti.
- Typecheck, lint, colori, tipografia, suite applicativa e build; distinguere i test legacy e i limiti reali.
- Verificare l'immagine Docker e il banco su localhost:3002 conservando dati, integrazione HA e possibilità di ripristino.
- Aggiornare evidenze, stato e punto di ripresa; conservare una versione finale verificata.

## Registro dei rilievi recuperati

Gli identificativi e le priorità provengono dalla revisione precedente. Gli esiti sono stati ricontrollati sul codice da corsie dedicate e da due verificatori avversari indipendenti (vedi «Avanzamento e modifiche»).

| ID | Priorità | Problema | Corsie originarie | Esito della ripresa |
|---|---|---|---|---|
| SEC-1 | P1 | Il backend accetta come prova d'identità un Home Assistant scelto dal client (x-ha-url), quindi chiunque può impersonare qualsiasi utente HA | backend | Parziale. Con `TUNET_INTERNAL_HA_URL`/`_FALLBACK_URL` impostati, come nel compose, il token si valida solo presso quegli URL, scritti come sono e senza varianti Docker; gli header del client vengono ignorati; un rifiuto dà subito 401. Senza variabili resta il modello di Tunet: ISSUE-027. |
| PAR-1 | P1 | Pagina Multimedia: la scelta dei lettori (mediaIds) è visibile solo in modalità modifica, dove la pagina speciale è inert | fogli, widget-media-utilita | Corretto. Sezione «Lettori della pagina» in Impostazioni della pagina (stessa chiave `mediaIds`); tolto l'editor morto da MediaPage. |
| PAR-2 | P1 | Widget Attività: la lista (todoEntityId) non si può scegliere, il widget appena aggiunto resta inutilizzabile | fogli | Corretto. Scelta della lista `todo.*` (`todoEntityId`) nelle impostazioni del widget. |
| PAR-3 | P2 | Impostazioni specifiche di tipo del legacy EditCardModal non più modificabili (meteo, calendario, videocamera, Android TV, costi, Nordpool, separatore, aspirapolvere) | fogli | Corretto per le chiavi lette dai widget nuovi: calendario, costi, Nordpool, Android TV, meteo, separatore, videocamera, aspirapolvere. Le chiavi senza consumatore sono in ISSUE-026. |
| CORR-5 | P1 | Regressione di parità: non c'è modo di riordinare le pagine; reorderPages non ha chiamanti | fogli | Corretto. «Sposta prima/dopo» in Impostazioni della pagina, con `reorderPages`, annuncio e tasti disabilitati agli estremi. |
| DES-10 | P3 | Testi: «1 lettori», «Widget: Studio», errore troncato e modalità del ventilatore mostrata grezza da Home Assistant | fogli, widget-controlli-casa, widget-media-utilita | Corretto. «1 lettore», «Pagina di widget», errore del lettore su due righe, preset del ventilatore in italiano. |
| RESP-2 | P2 | Field: il pozzetto visibile è alto 46 px ma solo l'input da 19 px risponde ai clic, nonostante cursor: text | kit | Corretto. Tutto il pozzetto mette a fuoco l'input; una pressione sul campo già a fuoco non lo toglie. |
| RESP-3 | P2 | Target interattivi del kit sotto i 44 px richiesti dal progetto (pulsanti circolari 39 px, Toggle 42, conferma 31) | kit | Parziale. Area di tocco di 44 px con un `::before` trasparente, aspetto identico a v005 pixel per pixel; conferma di rimozione in taglia md. Le voci del Segmented sm arrivano a 42,8 px, e nei menu con passo di 36,4 px le aree si sovrappongono di 1–2 px: ISSUE-028. |
| DES-6 | P3 | Le liste scorrevoli tagliano le ombre del materiale: rettangoli chiari a bordo netto nella pagina media e nei fogli | kit, widget-media-utilita | Corretto. Il corpo dei fogli lascia lo spazio alle ombre ai lati; sopra e sotto resta entro l'intervallo verso intestazione e piè di pagina (correzione dell'orchestratore dopo la verifica). Lista dei lettori media corretta. |
| CORR-3 | P2 | Un widget riportato in una pagina che aveva lasciato riprende le impostazioni vecchie; le modifiche fatte nel frattempo si perdono | launcher-logica | Corretto. Le impostazioni seguono il widget e sovrascrivono la copia vecchia. |
| CORR-4 | P2 | Un widget aggiunto in una classe di dispositivo non compare in un'altra classe già mostrata la cui pagina è piena | launcher-logica | Corretto. Riparazione delle classi in `ensureDeviceClass` con famiglie di pagine. Il verificatore ha trovato una regressione (widget su due pagine perso ruotando), corretta dall'orchestratore a livello di famiglia; 3 test avversari permanenti, invariante su 200 layout casuali. |
| CORR-6 | P3 | Dopo uno spostamento per classe, «Rimuovi» lascia il widget nella pagina di origine delle altre classi | launcher-logica | Corretto. L'appartenenza alla pagina è comune a tutte le classi; le continuazioni di una pagina rimossa passano alla prima rimasta. |
| CORR-7 | P3 | Trascinando al bordo, un rilascio entro 320 ms dal cambio pagina sposta il widget sul bordo della pagina vecchia | launcher-logica | Corretto. Il bersaglio resta nullo finché la nuova pagina non si assesta; il rilascio annunciato come «Spostamento annullato». |
| RESP-1 | P1 | Con zoom al 150–200% sul tablet, o con un telefono orizzontale, il launcher passa a una griglia 4×6 con celle di 32–56 px: contenuti e comandi tagliati (WCAG 1.4.4) | launcher-logica | Parziale. Nuova classe `phoneLandscape` 6×2 (celle di 118 px a 844x390 e di 126 px a 853x533); container query per Clima sotto i 70 px circa. In modifica a 640x400 le celle restano da 65 px: ISSUE-028. |
| CORR-1 | P1 | I dettagli dei widget generici (sensor/entity/toggle) non si aprono: hasDetails è chiamato senza impostazioni | launcher-ui | Corretto. I dettagli si risolvono con le impostazioni reali della pagina che contiene il widget. |
| CORR-2 | P2 | Più widget aggiunti insieme a una pagina piena creano una pagina di continuazione per ciascuno, in ordine inverso | launcher-ui | Corretto. Un'aggiunta multipla riempie la stessa continuazione invece di creare una pagina per widget. |
| A11Y-1 | P1 | Su un tablet solo touch, spostare o ridimensionare un widget richiede il trascinamento (WCAG 2.5.7) | launcher-ui | Corretto. Controlli a schermo da 44 px in modalità sposta/ridimensiona (frecce, pagina precedente/successiva, più grande/più piccolo, Fatto). |
| A11Y-3 | P2 | Focus perso in modifica: Esc o «Rimuovi» lo mandano su BODY, e la conferma aperta con Canc non lo riceve | launcher-ui | Corretto. Focus su «Annulla» nella conferma, sul widget vicino dopo «Rimuovi», su «Modifica» dopo Esc. |
| RESP-4 | P3 | Il suggerimento «Frecce per spostare/ridimensionare» è tagliato per i widget della prima riga | launcher-ui | Corretto. Il suggerimento tagliato è sostituito dai controlli a schermo. |
| PERF-1 | P2 | Durante il trascinamento ogni fotogramma ri-renderizza tutti i widget di tutte le pagine, compresi i menu chiusi | launcher-ui | Corretto. Contesto separato per il trascinamento, WidgetHost in memo, contenuto del Popover montato solo da aperto. |
| PERF-2 | P2 | Tutte le pagine del pager restano montate e attive: istantanee delle videocamere e timer girano anche fuori schermo e sotto Sistema | launcher-ui, sistema, widget-controlli-casa, widget-media-utilita | Corretto. `usePageVisible()`: videocamere, orologi, calendario, attività, meteo, Nordpool e storico si fermano fuori pagina e sotto Sistema. |
| DES-1 | P2 | Le pagine speciali usano tre impaginazioni diverse: margini laterali di 0, 16 e 96 px e titolo h1, h2 o assente | launcher-ui, widget-controlli-casa, widget-media-utilita | Corretto. Guscio unico delle pagine speciali con margine comune e titolo h1. |
| DES-2 | P2 | L'intestazione del foglio dei dettagli ripete il tipo («Clima / Clima») invece del nome del dispositivo | launcher-ui | Corretto. Il titolo del foglio usa il nome del dispositivo dalle chiavi d'entità note. |
| A11Y-2 | P2 | Il contatore «Disconnesso da N s» sta dentro una regione live e viene annunciato ogni secondo | sistema | Corretto. Il contatore della disconnessione è fuori dalla regione live. |
| A11Y-4 | P2 | Aprendo o chiudendo Sistema il focus finisce su BODY | sistema | Corretto. Focus sull'h1 di Sistema all'apertura e sul pulsante «Sistema» alla chiusura. |
| DES-7 | P3 | Gli accenti hanno significati incoerenti: «Collegato» è blu nella barra e arancione in Sistema; mese e giorno della copertina sono blu decorativi | sistema | Corretto per la connessione: «Collegato» con LED blu in barra e in Sistema. Mese e giorno blu della copertina vengono dalla reference UI-008: nessuna modifica. |
| DES-8 | P3 | L'indicatore di pagina si sposta lateralmente a ogni swipe perché l'etichetta cambia larghezza | sistema | Corretto. La scanalatura dell'indicatore resta ferma; l'etichetta è a larghezza fissa con puntini. |
| SEC-2 | P1 | «Esci» in modalità token e il passaggio da OAuth a token lasciano i token OAuth; la sessione precedente torna attiva senza login | sistema | Corretto. Ogni uscita e cambio di metodo cancella i token OAuth; «Accedi con Home Assistant» reindirizza sempre al login; il metodo si salva dopo il callback. `auth.revoke()` non applicato: ISSUE-027. |
| SEC-5 | P3 | Testo di privacy inesatto nella pagina di collegamento: il token non «resta su questo dispositivo» | sistema | Corretto. I testi dicono che le credenziali restano nel browser e vanno solo a Home Assistant e al server Acasystem. |
| PAR-4 | P3 | Serratura: il comando «Apri» (lock.open) è confermato solo dallo stato esatto 'open', con falso «Nessuna conferma» sulle serrature che tornano a 'unlocked' | widget-controlli-casa | Corretto. «Apri» è confermato anche da `unlocked` dopo `locked`; non provato su una serratura reale. |
| DES-3 | P2 | Nei widget dei controlli 1×1 gli stati «Dispositivo non trovato» e «Non disponibile» sono tagliati a metà parola | widget-controlli-casa | Corretto. Testo breve e due righe nei 1×1; «Non dispo…» con i puntini a 118 px. |
| DES-4 | P2 | Sul telefono la luce 1×1 indica acceso o spento solo con il colore del pomello | widget-controlli-casa | Corretto. La luce compatta accesa ha un segnale non cromatico oltre al colore. |
| SEC-3 | P2 | La CSP del backend (frame-src) blocca il lettore go2rtc della telecamera; l'evento load arriva comunque e il widget non passa alle alternative | widget-media-utilita | Corretto lato frontend. Una violazione `frame-src` passa subito alla fonte successiva; un lettore cross-origin caricato senza violazioni resta. La CSP non è cambiata: con la build del backend i lettori go2rtc restano bloccati, ISSUE-027. |
| DES-9 | P3 | Le taglie grandi non aggiungono informazioni: 4×2 di costi, auto e stanza e luce on/off 2×2 sono in gran parte vuote | widget-media-utilita | Corretto. Taglia massima 2×2 per costi, auto e stanza. La luce non regolabile resta fino a 2×2: ISSUE-026. |
| SEC-4 | P3 | Due richieste a terzi nel frontend nuovo: la posizione dell'auto va a openstreetmap.org senza alternativa offline, i loghi delle app TV a cdn.simpleicons.org | documentazione; adattamenti codice fuori incarico | Documentato in ISSUE-016: inventario di openstreetmap.org e cdn.simpleicons.org. Le modifiche del codice sono proposte, non autorizzate. |

## Avanzamento e modifiche

- Ricostruito l'incarico da file e diff. Istantanea pre-intervento `usa-come-git/v006`, con manifesto SHA-256; esclusi segreti, dati, dipendenze e artefatti.
- Codex (16:35–16:55) ha avviato correzioni in tutte le corsie, con test `FixLauncherLogic`, `FixLauncherUi`, `FixSystemFocus`, `FixWidgetsReview` e `FixWidgetsVisibility`. Poi si è fermato, con typecheck e lint verdi alle 16:50–16:53.
- **Ripresa di Claude Code, 18:32.** Il working tree conteneva 97 file diversi da v005; typecheck strict, ESLint, tipografia e colori erano verdi.
- **Workflow `wf_fcf9c38b-b15`:** otto corsie a proprietà esclusiva, ciascuna a classificare ogni rilievo sul codice attuale (già corretto, parziale, assente, sbagliato), completare e provare con test, più un verificatore avversario.
  - Sei corsie concluse.
  - Kit e controlli/casa cadute per errori di rete, rilanciate in modalità prudente pre-demo nel workflow `wf_13cf285e-783`, con un secondo verificatore avversario.
- **Correzioni sbagliate o regressive trovate e corrette:**
  - CORR-4: riparazione delle classi e poi regola `arrangedElsewhere`, portata a livello di famiglia dall'orchestratore;
  - SEC-1: fallback e varianti Docker sugli URL interni;
  - SEC-3: un lettore cross-origin non era mai pronto;
  - RESP-3: i minimi di 44 px cambiavano l'aspetto, sostituiti da un `::before` trasparente;
  - DES-6: il corpo dei fogli entrava nell'intestazione e poi nel piè di pagina;
  - Popover: il contenuto si smontava durante la dissolvenza;
  - Field: il clic sul pozzetto a fuoco provocava un blur e un salvataggio a metà;
  - DES-10: «Widget: Studio»;
  - test condiviso di SEC-3 che pretendeva il comportamento sbagliato.
- **Integrazione dell'orchestratore:**
  - CORR-4 a livello di famiglia, con tre test avversari permanenti (`FixLauncherLogicInvariante`, `FixLauncherLogicFamiglie`, `FixLauncherLogicRotazione`);
  - URL interni di HA senza varianti Docker (test backend aggiornati);
  - «Spostamento annullato» per un rilascio senza bersaglio;
  - `chevronUp` escluso dal selettore di icone;
  - soglia della container query di Clima a 8,25rem;
  - fine riga LF ripristinati in 3 documenti e 8 sorgenti salvati in CRLF da Codex.
- Ogni esito per rilievo è nella tabella sopra; i residui sono in ISSUE-026, ISSUE-027 e ISSUE-028.

## Verifiche ed evidenze

| Controllo | Comando/procedura | Esito | Limiti |
|---|---|---|---|
| Statici | `npm run typecheck`, `npm run lint` (frontend e backend), `lint-typography`, `lint-theme-colors`, ricerca di CR nei file cambiati da v005 | Superato | 0 errori; tipografia 0 violazioni (552 file), colori 0 (273 file); nessun CRLF. |
| Suite frontend | `npx vitest run` | Superato con fallimenti attesi | 1476/1481. I 5 falliti sono test del legacy escluso (HomeMigration, PageNavigation, SettingsDropdown, SettingsMenuControl ×2, ISSUE-029). `ComfortContract` ha dato un errore di lettura sotto carico; rieseguito da solo, 29/29. |
| Suite backend | `npx vitest run` | Superato | 13 file, 100 test. |
| Verifiche avversarie | Due verificatori indipendenti: codice, test di mutazione, Playwright con Chromium locale | Superato dopo le correzioni | Tutti i P1 confermati. SEC-1 e RESP-1 parziali, dichiarati. Le regressioni trovate (CORR-4, DES-6 piè di pagina, `chevronUp`, soglia di Clima) sono corrette e coperte da test. |
| Build | `npm run build -w frontend` più `check-bundle-size.mjs` | Superato | index 666,7/900 KB; vendor nei limiti; `hls.js` separato. HTML con `lang="it"` e titolo «Acasystem», nessuna risorsa esterna. |
| Immagine Docker | `docker build -t aca-system:0.1 acasystem`; container temporaneo sulla porta 3012, senza volume | Superato | `/api/health` → `{"status":"ok","version":"0.1.0"}`; root 200. `/api/profiles` senza token 401; con `x-ha-url` esterno 401, perché il client viene ignorato e il token finto è rifiutato dall'HA interno. Container rimosso. |
| Banco locale 3002 | Arresto, copia del volume a freddo, compose su `aca-system:0.1` | Non eseguito | Il classificatore dei permessi ha negato l'azione come «Production Deploy», due volte. Comandi forniti all'utente. |
| Dispositivi reali | Tablet pilota, telefono, serrature, go2rtc | Non eseguito | Misure solo in Chromium simulato. |

## Controllo del diff e decisioni

- Il diff riguarda solo i 35 rilievi, i loro test e le regressioni trovate dai verificatori. Nessuna dipendenza nuova, nessun commit, nessuna modifica al legacy.
- Due modifiche di Codex fuori dai rilievi, conservate:
  - tolte dalle impostazioni la scelta «Ferma l'animazione» del ventilatore e quella del «Movimento dello sfondo» del lettore, perché i widget nuovi non leggono più quelle chiavi;
  - `data-launcher-edit` sui pulsanti Modifica/Fine.
  Le impostazioni storiche restano salvate.
- Scelte esecutive: griglia `phoneLandscape` 6×2; area di tocco con `::before` trasparente invece di minimi di 44 px che cambiavano l'aspetto; guscio comune delle pagine speciali.
- Decisioni lasciate all'utente:
  - lista degli URL di HA consentiti senza URL interni (SEC-1);
  - apertura di `frame-src` per go2rtc (SEC-3);
  - revoca OAuth all'uscita;
  - passo di 44 px di menu e Segmented;
  - cancellazione del legacy (ISSUE-029);
  - comando preset del clima;
  - dipendenze inutilizzate.

## Chiusura e punto di ripresa

Correzioni completate e verificate nel codice. Resta da aggiornare il banco su localhost:3002 all'immagine `aca-system:0.1`, che l'utente deve eseguire o autorizzare. Istantanee: `usa-come-git/v007` è lo stato ricevuto da Codex, salvato prima della ripresa; `usa-come-git/v008` è la versione finale verificata. Ripresa: feedback dell'ufficio sull'interfaccia attuale, poi le modifiche richieste dall'utente.

### Annotazione del 2026-10-07 (Claude Code): decisioni dell'utente, SEC-1 e banco

Risposte dell'utente in chat, 2026-10-06 sera:
- lasciar finire l'altro agente;
- SEC-1 «Rifiuta sempre»;
- «Sì, aggiorna il banco».

Il resto del report resta com'era.

- **SEC-1 chiuso.** Il backend valida il token solo presso `TUNET_INTERNAL_HA_URL` / `TUNET_INTERNAL_HA_FALLBACK_URL`. Senza variabili valide risponde 503 `HA_URL_NOT_CONFIGURED` e non usa mai `x-ha-url` del client.
  - Rimossi l'helper delle alternative Docker (`buildDockerReachableUrlCandidates`) e i test del vecchio modello.
  - Nuovi casi di rifiuto in `haAuth.test.ts` e `server.test.ts`.
  - README del progetto: la variabile è obbligatoria anche in sviluppo.
- **Verifiche:**
  - backend: `tsc` ed ESLint 0, Vitest 93/93 (7 test del modello del client rimossi, 4 aggiunti);
  - frontend: `tsc` strict, ESLint, tipografia e colori a 0, Vitest 1476/1481 (5 falliti, test del legacy, ISSUE-029).
- **Immagine e prova.** `aca-system:0.1` ricostruita. Prova sulla porta 3012:
  - health ok, root 200, `lang="it"`, titolo «Acasystem»;
  - con l'URL interno, un token finto è rifiutato dal vero HA (401) anche con `x-ha-url` esterno;
  - senza URL interno, 503 `HA_URL_NOT_CONFIGURED`.
- **Banco aggiornato** su autorizzazione dell'utente:
  1. servizio arrestato;
  2. copia a freddo del volume in `backup/banco/tunet-data-20261007-pre-acasystem-freddo.tgz` (database, WAL, SHM);
  3. `compose.tunet.yaml` su `image: aca-system:0.1`;
  4. `docker compose up -d --no-build`.

  Container `healthy`; `/api/health` ok; pagina principale 200, in italiano, titolo «Acasystem». Stesso volume e stessa variabile `TUNET_INTERNAL_HA_URL`. Ripristino: rimettere `image: aca-tunet:1.22.1-aca-press-neu1` e rilanciare lo stesso comando.
- **Browser:**
  - pagina di collegamento su localhost:3002 corretta, nessuna risorsa esterna caricata;
  - nel riquadro del browser integrato il service worker non si registra, ma `sw.js` è servito con 200 e la CSP lo permette: limite dell'ambiente, non dell'app;
  - anteprima del launcher con Playwright a 1280×800 e 390×844: copertina, Casa, Luci, Clima, Multimedia senza overflow né errori in console.
  - Il launcher con le entità reali va visto dall'utente con la propria sessione HA.
- **Istantanea finale:** `usa-come-git/v009`.

### Annotazione del 2026-10-07 (Codex): ripresa e verifica del banco corrente

Richiesta di riferimento: «ti eri interrotto, riprendi». All'avvio il codice e i documenti coincidevano con i 921 file del manifesto SHA-256 di `v009`; anche la copia risultava integra. La revisione e l'aggiornamento del banco erano già conclusi nell'annotazione precedente. Questa ripresa verifica il risultato e allinea la documentazione operativa, senza nuove modifiche applicative o ricostruzioni dell'immagine.

- `docker inspect aca-tunet-tunet-1`: `aca-system:0.1`, `healthy`, immagine `sha256:be0f93aba6494c53f7a1cdd30fd126b630181c245598f845134cfb8c117b09c8`. `Invoke-RestMethod http://localhost:3002/api/health`: `{"status":"ok","version":"0.1.0"}`. Volume `aca-tunet_tunet-data` montato in `/app/data`; copia a freddo già presente, 8516 byte. Nessuna prova di ripristino.
- Verificatore indipendente, dal workspace `progetto/acasystem`: `npm run typecheck -w backend`, `npm run lint -w backend`, `npm run test -w backend` superati, 13 suite e 93/93 test. Controllo frontend `npm run test -w frontend -- src/__tests__/SystemConnect.test.tsx src/__tests__/SystemPage.test.tsx src/__tests__/ShellApp.test.tsx src/__tests__/useConnectionSetup.test.ts src/__tests__/oauthStorage.test.ts src/__tests__/apiAuth.test.ts`: 6 suite e 66/66 test. La suite frontend completa non è stata ripetuta in questa ripresa; resta il precedente esito 1476/1481 con 5 fallimenti del legacy (ISSUE-029).
- Browser laterale: il ricaricamento ha sostituito la vecchia interfaccia rimasta aperta con Acasystem «OS» Metallo, conservando la sessione OAuth2. Sistema mostra «Collegato» a HA; intestazione Sistema focalizzata all'apertura, pulsante Sistema focalizzato al ritorno al launcher. Navigazione tra Principale e Copertina verificata con il selettore da tastiera. [Schermata del banco](../../backup/review-20261007/acasystem-0.1-banco.png) conservata localmente, esclusa da Git. Nessun token letto, nessun salvataggio di profili/layout e nessun comando a dispositivi eseguito.
- Allineati `infrastructure.md`, `project-status.md`, `verification.md`, il README di progetto e l'indice dei report: immagine corrente, limiti delle prove e presenza della copia manuale del volume. Le descrizioni del banco del 2026-10-05 sono conservate come storico.
- Verifica documentale: 111 collegamenti locali nei sei documenti aggiornati risolti su file o cartelle esistenti. Il confronto SHA-256 con v009 rileva soltanto questi sei documenti cambiati, nessun file mancante e nessuna alterazione dell'istantanea precedente.
- Istantanea della chiusura documentale: `usa-come-git/v010`, con manifesto SHA-256. Codice, configurazione Compose, dipendenze e fonti protette invariati rispetto a `v009`; nessun commit o modifica all'indice Git. Anteprima Vite temporanea sulla porta 5180 arrestata; il banco Docker resta su 3002.

Punto di ripresa confermato: raccogliere il parere dell'ufficio sulla versione 0.1, poi intervenire sulle richieste umane. Restano i limiti ISSUE-026/027/028/029 e le prove con dispositivi fisici, offline e ripristino, senza nuovi incarichi applicativi aperti.

### Annotazione del 2026-10-07 (Codex): controllo documentale indipendente

Il verificatore conferma 70 collegamenti locali, inclusi gli anchor, nei tre documenti operativi principali e la coerenza di banco, volume, SEC-1 e limiti. Rileva due note obsolete nel registro corrente: ISSUE-018 descriveva ancora le card applicative come JS, ISSUE-021 descriveva Aspetto come pannello da tradurre. Rettificate distinguendo audit iniziale, nuovo codice TypeScript strict e interfacce sostituite; non viene dichiarata una verifica completa di prestazioni o traduzioni. I percorsi citati nel README dell'installazione del 2026-10-05 restano nello storico.

Istantanea successiva `usa-come-git/v011`: cambia soltanto stato, registro verifiche e questa annotazione rispetto a v010. Codice e banco invariati; nessun nuovo test applicativo necessario per queste rettifiche.
