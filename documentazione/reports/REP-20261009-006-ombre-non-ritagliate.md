# REP-20261009-006 — Ombre e animazioni non ritagliate ai bordi delle barre

| Campo | Valore |
|---|---|
| Stato | Completato; banco su `aca-system:0.8` |
| Data | 2026-10-09, Europe/Rome (esecuzione e chiusura documentale del 2026-10-10) |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) per la progettazione; implementazione, revisioni e prova visiva con subagenti (modelli non registrati); chiusura dei documenti con Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`) |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` più il working tree non committato (fino a REP-20261009-004). Base di misura del diff del blocco O, oggetto non referenziato creato con `git stash create` e usato solo per confrontare: `1476ff82ac76…`. |
| Richiesta di riferimento | Chat del 2026-10-09, dopo la prova della 0.7, con uno screenshot della vista pagine. |
| Autorizzazione | Il piano approvato dall'utente in modalità piano il 2026-10-09 alle 12:55. |

## Richiesta

> «poi ti devo anche segnalare purtroppo 2 problemi evidenti: problemi grafici riguardanti ombra superiore durante l'hold della card. Problemi di contenitori, la topbar e la bottombar hanno spazi riservati per comprimere la pagina, questi sono con sfondo colorato da quello che vedo quindi quando eseguo l'animazione alle volte si vede che l'animazione è tagliata, quindi di base dovremmo fare in modo che le aree sono trasparenti, se il colore è piatto e dietro c'è uno sfondo piatto e non ci sono ombre, si deduce quindi che non è necessario avere lo sfondo per quel componente ma che si può sfruttare il colore del body per l'illusione, verifica e dimmi se ho ragione, ma non darmi ragione se non ho ragione»

## Verifica dell'ipotesi

Due esplorazioni indipendenti del codice, il 2026-10-09; risposta data all'utente in chat.

**Esito:** l'effetto osservato è reale, ma la causa ipotizzata non è corretta.

**Le aree delle barre sono già trasparenti:**
- l'`<header>` è la pillola stessa (`statusBar.css:7-26`);
- il footer non ha sfondo (`appShell.css:48-74`): dipingono solo le pillole (`edit.css:179, 389`) e l'indicatore;
- in vista pagine la barra in alto è solo spostata e trasparente.

**Il taglio viene da `.aca-pager`.** Ha `overflow-x: auto; overflow-y: hidden` (`launcher.css:9-10`), e un contenitore che scorre ritaglia su entrambi gli assi, cioè al bordo dell'area principale, verso le fasce delle barre. Oltre c'è lo stesso colore, quindi il taglio si vede come una linea dritta nel vuoto.

**Scheda tenuta premuta nella vista pagine:**
- l'ombra chiara del Kit 2 si estende di circa 23 px (`kit2/tokens.css:32`), mentre lo spazio sopra la scheda è di 16 px (`launcher.css:76`);
- sollevata (1,03 e oscillazione, `launcher.css:143-149, 634-641`) lo spazio scende a circa 7 px.

**Stesso meccanismo altrove:**
- pressione lunga su una pagina;
- widget della prima e dell'ultima riga sollevati, appena atterrati o bersaglio di una pila;
- pallini di ridimensionamento della prima riga.

**Dove la regola dell'utente è giusta:** il colore di fondo è dipinto 4 volte (`html,body`, `html:has(.aca-app-root)`, `.aca-app-root`, `.aca-shell`). Lo strato di `.aca-app-root` nasconde lo sfondo di Aspetto (ISSUE-037). Proposta separata, da fare insieme a G22; non è in questo incarico.

## Obiettivo e perimetro

Piano approvato: `C:\Users\matti\.claude\plans\majestic-beaming-ember.md`.

- **Bordo di ritaglio del pager esteso alle fasce.** `margin-block` negativo e `padding-block` uguali alle altezze delle fasce: `--aca-shell-head` e `--aca-shell-foot`, comprese le safe area.
- **Pagine non ritagliate.** `.aca-pager__page` senza `overflow: hidden` in vista normale, oppure con `clip` e `overflow-clip-margin`.
- **Barre sopra il pager.** Header e footer con `position: relative` e `z-index` dai token. `pointer-events: none` sulle fasce e `auto` sulle pillole.
- **Misure invariate:** stesse celle e stessa geometria del trascinamento e della vista pagine (fattore k di REP-20261009-004).
- **Scheda sollevata:** `transform-origin: 50% 0`. *Non applicato: vedi «Punto 5 del piano» sotto.*
- **Esclusi:** la pulizia dei fondi ripetuti e lo sfondo di Aspetto (ISSUE-037, G22), funzioni nuove, dipendenze, backend.

## Criteri di completamento

- **Test CSS** delle regole sopra.
- **Test esistenti verdi** con le stesse celle.
- **Prova Playwright a 1024×472 e 390×844:**
  - nessun salto nei pixel sopra la scheda sollevata;
  - ombre e presa dei widget della prima riga intere;
  - tocchi su barre, vuoto e vista pagine invariati.
- **Controlli verdi:** typecheck, lint, tipografia e colori a 0, suite, build.
- **Banco 0.8.**

## Avanzamento e modifiche

Un blocco (O) con due giri di revisione avversaria, una prova visiva e una correzione dopo la prova. Basi di misura prima/dopo con CSS «vecchio» iniettato nello stesso stato. Nessun commit Git, nessuna modifica al backend, nessuna dipendenza nuova.

### Bordo di ritaglio del pager fino ai bordi dello schermo

- `.aca-pager` (`launcher.css`) ha `box-sizing: border-box`, `height: calc(100% + head + foot)`, `margin-block` negativo e `padding-block` uguali a `--aca-shell-head` e `--aca-shell-foot`, ognuna con fallback `0px`: fuori dalla shell il pager è invariato. L'area del contenuto resta esattamente quella tra le barre.
- `Pager.tsx` (`measureCards`) sottrae il padding da `clientHeight`, quindi il fattore k e il passo della vista pagine partono dalla stessa altezza di prima. Un test esistente (`PagerOverview.test.tsx`, «does not count the bands…») fallisce se la sottrazione viene tolta (provato con mutazione).
- **Una sola fonte per le fasce** (`appShell.css`): su `.aca-shell` ci sono `--aca-shell-head` (safe area + `--aca-head-top` + altezza del controllo + 2 × `--aca-head-pad`) e `--aca-shell-foot`, con un override sopra 40 rem; il footer ha `height: var(--aca-shell-foot)`. Le variabili dell'indicatore (`--aca-indicator-*`, `--aca-float-height`) sono passate dal footer alla shell perché il `calc` si risolva lì. `statusBar.css` prende margine e padding da `--aca-head-top` e `--aca-head-pad`, con il valore precedente come fallback.
- `overflow: hidden` delle pagine sostituito da `overflow-x: clip` (l'asse y resta visibile). Senza il ritaglio orizzontale l'alone dei widget della prima colonna sulla pagina vicina entrerebbe per circa 7 px nel bordo destro della pagina a riposo (margine 16 px, alone 23 px). La regola `overflow: visible` della vista pagine prevale ancora. Non serve `clip-path`.

### Barre sopra il pager

- `.aca-status-bar` e `.aca-connection-notice` hanno `position: relative`, il footer `position: relative` e `pointer-events: none`; livello `var(--aca-z-sticky)`, sotto il fantasma del trascinamento, il vassoio e il segnale ai bordi, che vengono dopo nel DOM allo stesso livello. Le pillole mantengono `pointer-events: auto` (`edit.css` lo aveva già); `auto` aggiunto a `.aca-indicator`, che altrimenti lo erediterebbe `none`; il contenitore dell'avviso di connessione è `none` e la sua scheda `auto`.
- **Tocchi sulle fasce vuote invariati.** Nella prima versione il pager riceveva i tocchi in tutta la fascia vuota (pressione lunga, scorrimento e trascinamento partivano anche da lì, prima no). La prova visiva lo ha rilevato e il piano, che diceva «come oggi», era sbagliato su un punto: oggi la fascia assorbiva i tocchi. Ora `.aca-pager` ha `pointer-events: none`, `.aca-pager__page` torna `auto`, e `.aca-pager:is(.is-overview, .is-closing)` rimette `auto` sul pager (nella vista pagine le pagine sono `none` e il vuoto tra le schede deve far partire il pan). `Pager.tsx` ha `inBand(element, clientY)`: `onPointerDown` esce senza far partire il pan se il bersaglio è il pager e il tocco cade nel suo padding (altezza 0, come in jsdom, vale falso). `onPagerPointerDown` in `LauncherScreen.tsx` salta anche `setSelected(null)` quando il bersaglio è il pager stesso, così un tocco accanto alla barra del widget non toglie la selezione.

### Punto 5 del piano: `transform-origin: 50% 0` non applicato

Il piano prevedeva l'origine in alto sulla scheda sollevata per far crescere l'ombra verso il basso. Dopo REP-20261009-004 la scheda sollevata non cresce più (scala k, come a riposo, e solo una rotazione di oscillazione): l'origine in alto la sposterebbe di 44,8 px sul tablet e di 81,8 px sul telefono, fuori dal suo pulsante di apertura. Non applicato; un commento sulla regola `.is-lifted` e un test in `PagerBands.test.tsx` (scala = `var(--aca-overview-k, 0.72)`, nessuna `transform-origin`) fissano la scelta.

### Revisione

- **Giro 1.** Commento della presa di ridimensionamento (`edit.css`) e del pager (`launcher.css`) corretti; aggiunte a `PagerBands.test.tsx` le verifiche di `--aca-head-top` e `--aca-head-pad` su `.aca-shell`, perché i test dei fallback non coprivano i valori reali. Respinti: un test della sottrazione del padding (esiste già), l'estensione della fascia in alto con la riga dei chip.
- **Giro 2.** Un tocco breve sulla fascia vuota deselezionava il widget in modifica: corretto in `onPagerPointerDown` (con test). Motivata l'omissione del punto 5. Commenti sul limite del telefono corretti.
- **Dopo la prova visiva.** Fasce di nuovo sorde, come sopra.

## Scelte esecutive

- Solo CSS e un calcolo nel pager, senza misurare la fascia alta con un `ResizeObserver`: `--aca-shell-head` è un limite inferiore (una riga della barra di stato più la safe area). Sul telefono, dove la barra ha una seconda riga con i chip, il bordo di ritaglio sta circa 64 px sopra l'area delle pagine (a 390×844 il pager comincia a y = 43,25 e non a 0), molto più dei circa 23 px dell'ombra. Renderlo esatto richiede un'altezza fissata per la riga dei chip o una misura: non fatto.
- `overflow-x: clip` al posto di `overflow: hidden` sulle pagine.
- Le fasce restano sorde ai tocchi (come prima di questo incarico); non si introducono né pressione lunga né scorrimento dalle fasce.

## Verifiche ed evidenze

Comandi in `progetto/acasystem/frontend`. Prove nel browser in Chromium headless senza GPU (`--disable-gpu`, SwiftShader), un browser alla volta, su server Vite propri, fermati alla fine; script una tantum nella scratchpad, non una suite e2e. Suite sempre con `--maxWorkers=4`.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici | Superato | `npm run typecheck` 0 errori; `npm run lint` 0; `lint:typography` 0 violazioni (428 file); `lint:theme-colors` 0 (303 file). `format:check` fallisce solo su `eslint.config.js` e `public/sw.js`, preesistenti. `i18n:check` 4/4. |
| Test delle regole | Superato | `PagerBands.test.tsx` (nuovo): margine e padding uguali alle fasce, altezza, pagina senza `overflow: hidden`, livello e posizione di header, avviso e footer, `pointer-events` di fasce, pagine, pager nella vista e pillole, valori reali di `--aca-head-top` e `--aca-head-pad`, assenza di `transform-origin` e scala della scheda sollevata. `PagerOverview.test.tsx`: sottrazione del padding in `measureCards` e pressione nel padding che non arriva a `onPointerDown`, mentre una nel vuoto tra le schede sì. `PolishCornice.test.tsx` adattato (altezza del footer, `calc` ampio su `.aca-shell`, margine e padding della barra da `--aca-head-top` e `--aca-head-pad`). `LauncherScreen.test.tsx`: la pressione sul pager mantiene la selezione, su una pagina la toglie. |
| Suite frontend completa | Superato | Ultima esecuzione completa dopo tutti gli interventi (anche di REP-20261009-005 e del blocco C): 141 file, 1676 test passati, 0 falliti. Una esecuzione precedente: 141 file, 1674 test in 409 s. |
| Build e budget | Superato | `npm run build` riuscita (solo l'avviso preesistente sui chunk oltre 500 kB), ripetuta dopo le ultime correzioni; `check-bundle-size.mjs` nei limiti, index 726,6/900 KB (misurato prima delle ultime correzioni). |
| Misure invariate | Superato | Tablet 1024×472: area principale [0, 64, 1024, 320], primo widget [26,67; 88; 480; 272], cella 112 px, gap 10,67/48 px, k 0,7200, passo 761,28 px, corpo della scheda [143,36; 82,8; 737,28; 230,4]. Telefono 390×844: cella 81 px, gap 11,33/10 px, griglia [16; 131,63; 358; 536], k 0,7200, passo 304,80 px, corpo [54,6; 163,11; 280,8; 421,02]. Identiche prima e dopo, in vista normale, in modifica e nella vista pagine; cambia solo il riquadro del pager (tablet da [0, 64, 1024, 320] a [0, 0, 1024, 472]; telefono da y 107,25 a 43,25) e `scrollHeight` resta uguale a `clientHeight`. |
| Bordo di ritaglio | Superato, con prova diagnostica | Con un'ombra rossa forzata sulla scheda sollevata il pager vecchio ritaglia a y = 64 (primo pixel rosso) con un bordo netto; il nuovo continua fino a y = 48, senza linea. Chiaro e scuro, tablet e telefono. |
| Ombre reali del Kit 2 | Nessuna differenza misurabile | La scansione dei pixel sopra la scheda sollevata, sopra i widget della prima riga selezionati, trascinati e appena atterrati non mostra salti né prima né dopo: l'ombra visibile sopra la scheda arriva a circa 7 px (da y = 70, sotto il vecchio bordo a 64), sopra i widget della prima riga è nulla. Il taglio è quindi dimostrato con l'ombra diagnostica e non come difetto visibile con le ombre reali. Il sintomo segnalato dall'utente (ombra superiore tagliata durante la pressione della scheda) a queste misure non si riproduce più già prima di questo incarico, perché dopo REP-20261009-004 la scheda non cresce più. |
| Guadagno osservato | Superato | Differenze tra vecchio e nuovo solo a y = 384–388 sul tablet: l'ombra della pagina tenuta premuta e del widget bersaglio di una pila, prima tagliata al bordo del footer. Il lato nord della presa di ridimensionamento (2 rem sopra il widget) ora sconfina nella fascia e riceve il tocco (a y = 58 il bersaglio è `.aca-resize-frame__side--n`, prima la shell). |
| Tocchi sulle fasce e pulsanti delle barre | Superato, dopo la correzione | Dopo la prima versione del CSS la fascia vuota passava i tocchi al pager (pressione lunga, scorrimento, trascinamento); corretto come sopra. Dopo la correzione, a 1024×472 e 390×844, `elementFromPoint` a y = 1 e a y = altezza − 1 restituisce `.aca-shell`, mentre dentro l'area delle pagine restituisce `.aca-launcher-page`. I pulsanti delle barre (cestino, «+», casetta, nome, occhio, «Fine», pillole, indicatore) ricevono il puntatore al centro in vista normale, in modifica, con la barra del widget, nella vista pagine e durante la rinomina (prova fatta prima dell'ultima correzione, nessun mancato; dopo la correzione ripetuta solo sui punti delle fasce). Pan e pressione lunga dalla fascia nella vista pagine sono coperti da test Vitest (`inBand`), non da una nuova prova nel browser. |
| Console | Superato | 0 errori di console o di pagina. |
| Lenovo Tab M11, tocco reale, TalkBack | Non eseguito | Da fare con l'immagine del banco aggiornata. |

## Limiti e punti aperti

- **Telefono con la riga dei chip.** Il bordo di ritaglio sta a y = 43,25 e non al bordo dello schermo; nessun contenuto arriva a meno di 64 px sopra l'area delle pagine, quindi nessun taglio visibile. Esattezza possibile con una misura della fascia o un'altezza fissata per la riga dei chip.
- **Guadagno visivo da dimostrare sul tablet.** Con le ombre reali non c'è un «prima» visibile da confrontare; il taglio al bordo del footer è l'unico effetto osservato. Da guardare sul Lenovo.
- **Origine della scala.** `transform-origin` non applicato (vedi sopra); riprendere solo se la scheda sollevata tornasse a crescere.
- **Fondi ripetuti e sfondo di Aspetto.** Esclusi (ISSUE-037, G22): il fondo è dipinto quattro volte e lo strato di `.aca-app-root` nasconde lo sfondo di Aspetto; proposta separata.
- **Pan in vista pagine.** In jsdom l'altezza è 0 e `inBand` vale falso; la discriminazione fascia/vuoto con layout reale è coperta dalla prova `elementFromPoint` e dai test con altezza simulata.
- **Errore del nome vuoto su tablet.** Vedi REP-20261009-005.

## Chiusura e punto di ripresa

Codice e documenti completati; nessun commit Git, su richiesta dell'utente. Aggiornati `design.md`, `verification.md`, `project-status.md`, il registro dei report e ADR-0012 (nota datata).

**Banco (2026-10-10, agente principale):** `aca-system:0.8` dal 2026-10-10 alle 10:38 (`sha256:a552c711…fdd72`), `healthy`; per i tablet `http://192.168.1.11:3002`. Copia a freddo del volume prima dell'aggiornamento: `backup/banco/tunet-data-20261010-pre-0.8-freddo.tgz` (104 306 byte, SHA-256 `0a32ad2b…79e2`). `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.11`; bundle `index-BLpMNnba.js`. Ripristino: `image: aca-system:0.7`. Prova sul Lenovo a cura dell'utente.

**Prossimo passo:** prova dell'utente sul Lenovo Tab M11 con la nuova immagine: ombre intere ai bordi (scheda tenuta premuta, widget della prima e dell'ultima riga sollevati, appena atterrati, bersaglio di una pila), presa nord della prima riga, tocchi sulle fasce e sulle pillole invariati; risposte ai punti da confermare di questo report.
