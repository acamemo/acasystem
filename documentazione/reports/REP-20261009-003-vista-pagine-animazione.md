# REP-20261009-003 — Vista delle pagine: restringimento unico e fluido

| Campo | Valore |
|---|---|
| Stato | Completato; banco su `aca-system:0.8` |
| Data | 2026-10-09, Europe/Rome (chiusura documentale del 2026-10-10) |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) per la progettazione; implementazione, revisioni e prova visiva con subagenti (modelli non registrati); chiusura dei documenti con Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`) |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` più il working tree non committato (fino a REP-20261009-002). Basi di misura dei diff, oggetti non referenziati creati con `git stash create` e usati solo per confrontare: B4 `b6f6f8881532…`, B5 `13616757b28c…`; le basi di B1–B3 sono in REP-20261009-004. |
| Richiesta di riferimento | Chat del 2026-10-09, durante la prova sul banco. |
| Autorizzazione | La richiesta qui sotto. Eseguita dopo REP-20261009-002 e insieme a REP-20261009-004, che tocca gli stessi componenti. |

## Richiesta

> «bisogna poi lavorare sulla funzione che se clicchi sullo spazio vuoto ti fa highlight per la modifica della pagina: si deve restringere il contenuto tutto insieme, però attualmente quando lo fa lagga tantissimo, e sembra riduce tutto con tempi diversi, creando un effetto visivo non entusiasmante dato che le colonne durante il restringimento si resizano in maniera strana, va quindi rivista questa cosa»

**Aggiunta nella stessa chat:** il design della nuvoletta, incollato come codice React/styled-components e conservato senza adattamenti come [UI-010](../design/componenti/originali/UI-010-tooltip.jsx.txt).

> «il nome della classe da copiare e applicare sarebbe Tooltip, ovviamente va adattata ai nostri componenti»

Per accorpare l'aggiornamento del banco, l'applicazione di questo design alla nuvoletta di REP-20261009-002 (D5) entra in questo incarico.

Le decisioni D1–D5 della stessa chat sono in [REP-20261009-004](REP-20261009-004-pageshell.md). D2 (rimpicciolimento al 90 % anche sulle schede della vista) tocca questo incarico.

## Diagnosi iniziale

Dalla lettura del codice e dalle misure prima delle modifiche (1024×472, all'apertura):
- **Larghezza animata.** `.aca-pager.is-overview > .aca-pager__page` animava `flex-basis` dal 100 % al 72 % in 360 ms. La larghezza reale della pagina cambiava a ogni fotogramma.
- **Rimisura della griglia.** `WidgetGrid` misura l'area con `ResizeObserver` e a ogni fotogramma ricalcolava cella e gap dinamici (REP-20261008-001). Misure: 13 larghezze di pagina diverse, 10 valori di `--aca-cell`, 90 callback del `ResizeObserver`, 186 modifiche di stile alla griglia, fotogramma massimo 66,7 ms.
- **Durate diverse.** Il corpo della pagina aveva transizioni proprie con durate e curve diverse da quelle della pagina.

## Obiettivo e perimetro

- **Restringimento unico.** Entrando e uscendo dalla vista delle pagine, ogni pagina si restringe come un blocco unico, con una sola durata e una sola curva, usando solo trasformazioni composte. Le pagine vicine si spostano allo stesso modo.
- **Griglia ferma.** La griglia non si rimisura e i widget non si ridisegnano durante l'animazione.
- **Comportamenti da preservare:** scheda al centro con le vicine visibili; riordino con pressione lunga e trascinamento; Alt+frecce; nuova pagina e pagina eliminata; movimento ridotto senza animazione; comandi sotto la scheda (REP-20261009-002).
- **Design della nuvoletta (UI-010).** Applicato alla nuvoletta di REP-20261009-002. Dall'originale: fumetto con triangolino, angoli di 5 px, ombra `0 10px 10px`, comparsa che sale dall'icona con la curva `cubic-bezier(0.68, -0.55, 0.265, 1.55)` in circa 300 ms. Adattamenti: colore d'accento di Kit 2 al posto dei colori dei marchi, testo con contrasto ≥ 4,5:1 su ogni accento, Inter locale e 16 px al posto di Poppins e 14 (G18), attivazione con pressione lunga, mouse e fuoco, solo dissolvenza con il movimento ridotto, niente `styled-components`, niente `transition: all`, niente loghi.
- **Esclusi:** nuove funzioni, dipendenze, backend.

## Criteri di completamento

- **Nessun cambio di layout durante la transizione:** larghezza della pagina e dimensioni misurate dalla griglia costanti (una larghezza, un valore di cella, nessuna chiamata del `ResizeObserver`), verificato nel browser.
- **Un'unica durata e curva** per tutte le parti, letterali nel CSS.
- **Prova a 1024×472 e 390×844:** nessun salto di colonne, al più un fotogramma oltre 20 ms, screenshot a metà transizione senza sovrapposizioni di schede.
- **Nuvoletta:** contrasto ≥ 4,5:1 su tutte le tinte, 16 px, nessun `transition: all`, triangolino che punta all'icona anche contro il bordo.
- **Controlli verdi:** typecheck, lint, tipografia e colori a 0, suite completa, build.
- **Banco** aggiornato insieme a REP-20261009-004.

## Avanzamento e modifiche

### B4 — Vista a trasformazioni

- **Pagine al 100 %.** Le sezioni restano a larghezza piena e la griglia non si sposta: la vista usa `translate`/`transform` sulla sezione e `scale` sul corpo (origine al centro). Il `Pager` misura una volta per dimensione il fattore `k = min(0,72, (H − riserva)/H)` e il passo, con una sonda DOM, e li scrive come `--aca-overview-k` e `--aca-overview-pitch`. La riserva è piè di scheda + `space-2` + 2·`space-4`, così sopra la scheda resta mezza pillola «Principale».
- **Una durata, una curva.** `--aca-overview-ms: 360ms` e `--aca-overview-ease: cubic-bezier(0.23, 1, 0.32, 1)`, letterali su `.aca-pager`. Con il movimento ridotto la vista è immediata. Tolti `flex-basis`, i padding e gli spaziatori animati e il ciclo `follow` su `scrollLeft`.
- **Compensazione a somma nulla.** Le pagine non correnti hanno `transform: translateX(−o·100%)` e `translate: o·100%` anche fuori dalla vista, così l'ingresso parte dalla posizione naturale e l'inserimento o l'eliminazione di una pagina non fanno saltare le schede. Verificato che lo scorrimento normale resta identico.
- **Stato della vista nel `Pager`.** `overview`, `closing` e `base` sono derivati nel render; lo scroll nativo resta bloccato su `base·W`. L'uscita è un'animazione tra le posizioni (FLIP): a fine transizione, nello stesso commit, `scrollLeft` va a `index·W` e le trasformazioni cadono. Chiusura su `transitionend` o, in mancanza, su un timer di `ms + 50`.
- **Pan a puntatore** (`hooks/launcher/useOverviewPan.ts`, nuovo): soglia di 8 px, solo se prevalentemente orizzontale, scrive `--aca-overview-pan` in `requestAnimationFrame`, resistenza ai bordi, al rilascio l'indice è `round(c − (pan + v·120 ms)/passo)` con un flick minimo; annulla il click successivo; si arrende se `usePageDrag` ha sollevato una scheda. All'inizio del pan invia un evento `scroll` perché la nuvoletta si chiuda, senza toccare la logica di chiusura di `IconAction`. Il pan è bloccato quando il pager è `locked` (rinomina in corso, trascinamento).
- **Fuoco da tastiera.** `:focus-visible` su una scheda la porta al centro; Tab e Maiusc+Tab nella vista non muovono lo scroll. Il fuoco da mouse o tocco non sposta la scheda sotto il dito.
- **Nuova pagina ed eliminazione.** La nuova pagina entra con `@starting-style` (opacità 0, scala `k·0,6`) solo se è davvero nuova (classe `is-new` sulle chiavi comparse dall'ultimo render). La pagina eliminata sparisce e le vicine scivolano.
- **Riordino.** `usePageDrag` è invariato; `LauncherScreen` fornisce passo, centro e spostamento. Alt+frecce e trascinamento con pressione lunga funzionano. Le sezioni che React sposta nel DOM scivolano con una `Element.animate` dalla posizione precedente invece di saltare.
- **Comandi e badge.** Posizionati in assoluto sulla scheda e compaiono con una dissolvenza ritardata di metà tempo della vista, dopo che il corpo li ha liberati.
- **Pressione e sollevamento in vista.** La scheda premuta scende a `k·0,9` (D2); la sollevata torna a `k`, con la stessa oscillazione di REP-20261009-004 ripartita da zero.
- **Misura della griglia.** Se l'area è scalata, `WidgetGrid` usa la misura di layout (`borderBoxSize` del `ResizeObserver`, con ripiego sullo stile calcolato), non il rettangolo scalato; una pagina montata nella vista non calcola celle sulla dimensione ridotta.
- **Revisione.** Due giri con riproduzioni: corretti, tra l'altro, il pan che ignorava `locked`, il salto di un passo intero delle schede al rilascio del pan (il pan si toglie prima di `onSettle`), la chiusura della vista a metà pan, i comandi sopra il contenuto durante l'apertura, il badge tagliato sui telefoni in orizzontale, le schede riordinate che ricomparivano in dissolvenza, la misura frazionaria della griglia e la nuvoletta lasciata a metà strada quando una scheda scorre.
- File: `Pager.tsx`, `launcher.css`, `LauncherScreen.tsx`, `WidgetGrid.tsx`, `useOverviewPan.ts` (nuovo), `IconAction.tsx`; test `PagerOverview` e `OverviewPan` (nuovi), `LauncherGestures`, `LauncherScreen`, `LauncherGridGeometry`, `EditIconAction`.

### B5 — Nuvoletta UI-010

- **Fondo e testo.** Il fondo è l'accento di Kit 2 scurito: `oklch(from var(--k2-accent, var(--aca-orange)) min(l, 0.45) calc(c * min(1, 0.45 / l)) h)`, cioè la luminosità scende fino a 0,45 e la saturazione scende insieme, così la tinta resta quella dell'accento e il colore resta dentro sRGB (con la sola luminosità ridotta l'arancio virava al rosso). Testo bianco `oklch(100% 0 0)`. Il fallback senza token di Kit 2 è l'arancione del Metallo.
- **Forma.** Raggio 5 px, ombra `0 10px 10px` al 10 %, triangolino 8×8 ruotato di 45° (`::after`), con `left: var(--aca-tip-arrow-x, 50%)`: `IconAction` imposta `data-side` (sopra o sotto) e `--aca-tip-arrow-x` (centro dell'icona, tenuto a 12 px dai bordi), perciò il triangolino indica l'icona anche con la nuvoletta contro il bordo dello schermo.
- **Testo.** Primitiva `Body` `md` (16 px), Inter, peso 500; anche il motivo di un'azione bloccata è `Body` `md` a peso regolare.
- **Comparsa.** `@keyframes aca-tip-rise-above` / `aca-tip-rise-below` più `aca-tip-fade`, 300 ms, curva `cubic-bezier(0.68, -0.55, 0.265, 1.55)` per lo spostamento e `ease-out` per l'opacità; nessun `transition: all`. Con il movimento ridotto solo dissolvenza di 120 ms in `ease-out`. Si usano i keyframe e non `@starting-style` perché `data-side` è deciso dopo il primo calcolo di stile.
- **Ritorno del mouse sull'icona.** Con la curva elastica la nuvoletta passa per un momento sotto il cursore fermo: l'uscita della nuvoletta verso l'icona non la nasconde più.
- **Test.** `EditTipContrast.test.ts` (nuovo) misura il contrasto del bianco sul fondo per viola, rosso, ciano, arancione e 73 tinte `custom`, e la deriva di tinta (≤ 3°) su 77 accenti; `kitColors.ts` ha il supporto a `min(l, N)` e a `calc(c * min(1, N / l))` e la funzione `contrast()` ora condivisa con `PolishKit.test.tsx`. `EditIconAction.test.tsx` verifica `data-side`, `--aca-tip-arrow-x`, il CSS e il ritorno sull'icona.
- **Revisione.** Due giri: corretti il rimbalzo che nascondeva la nuvoletta con il mouse fermo, la curva elastica della dissolvenza a movimento ridotto, il motivo a 13,3 px, la deriva di tinta (arancio che virava al rosso) e l'ambito di un test.
- File: `edit.css`, `IconAction.tsx`, `kitColors.ts`, `PolishKit.test.tsx`; test `EditIconAction`, `EditTipContrast` (nuovo).

### Scambio delle barre in basso

In `edit.css` la barra che arriva aspetta 180 ms (220 ms per il gruppo «Pagine») la barra che va via, secondo il verso del pager (`is-closing` o `is-overview`), così non si vedono insieme due barre e due «Fine». Misurato su build di produzione: la barra di modifica scende a opacità 0,14 quando quella della vista parte da 0,02. Test in `EditToolbarHidden.test.tsx`.

### Catalogo UI

UI-010 aggiunto agli «Adattamenti applicativi» di [componenti/README.md](../design/componenti/README.md). L'originale non è modificato.

## Verifiche ed evidenze

Comandi in `progetto/acasystem/frontend`; prove in Chromium senza GPU, un browser alla volta, server Vite propri fermati alla fine. Per gli stessi controlli statici, la suite e la build vale la tabella di [REP-20261009-004](REP-20261009-004-pageshell.md#verifiche-ed-evidenze) (ultima esecuzione completa: 139 file, 1644 test; typecheck, lint, tipografia, colori e build verdi).

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Layout stabile in vista | Superato | Tablet 1024×472 e telefono 390×844, chiaro e scuro, anche con movimento ridotto: `distinctPageLayoutWidths = 1`, `distinctCellValues = 1`, `distinctGridWidths = 1`, `resizeObserverCalls = 0`, pagine al 100 % (prima 13 larghezze, 10 valori, 90 callback, 186 modifiche). |
| Fotogrammi lenti all'apertura | Superato su build di produzione; non sul server di sviluppo | Server di sviluppo (React in modalità sviluppo con StrictMode): 1 fotogramma da 50–67 ms al commit dell'apertura, a freddo talvolta un secondo da 33 ms. Build di produzione in 4 contesti a freddo (tablet e telefono): 0 fotogrammi oltre 18 ms; con CPU rallentata 4 volte al più uno, per il ricalcolo di stile al cambio di classe. Chiusura: 0–1. Prima delle modifiche: massimo 66,7 ms. Ambiente senza GPU; non misurato sul tablet. |
| Pan, rilascio e uscita | Superato | Pan con mouse e con tocco CDP; al rilascio la scheda scivola senza salti (prima un salto di 762 px sul tablet e 305 sul telefono); uscita senza salti (posizione e larghezza della scheda corrente continue); chiusura a metà pan pulita; rinomina aperta: il pan non sposta la pagina. |
| Fuoco e tastiera | Superato | 10 Tab nella vista: `scrollLeft` e posizioni invariati; Maiusc+Tab e fuoco da tastiera portano la scheda al centro. Il primo Esc chiude la nuvoletta, il secondo la vista. |
| Riordino, nuova pagina, eliminazione, Alt+frecce | Superato | Alt+destra e Alt+sinistra spostano la famiglia Casa oltre Luci e la riportano indietro; trascinamento con pressione lunga e giro al bordo; nuova pagina (scheda a 0,693 a 120 ms); eliminazione con scivolamento delle vicine; nessuna sezione con opacità < 1 nel riordino. Tablet e telefono. |
| Screenshot a metà transizione | Superato | A 140 ms le schede sono già in posizione, senza sovrapposizioni tra schede; comandi e badge compaiono dopo il corpo. Le due barre in basso non si sovrappongono più dopo la correzione dello scambio. |
| Nuvoletta UI-010 | Superato | Fondo `oklch(0.45 …)` con testo bianco: contrasto minimo 6,39:1 sugli accenti provati (viola, rosso, arancio, ciano, verde, giallo, `custom`); 77 accenti nel test, deriva di tinta ≤ 3°. 16 px, Inter 500, raggio 5 px, ombra `0 10px 10px` al 10 %, triangolino 8×8 con errore di puntamento 0 px (anche contro il bordo); distanza dall'icona 8 px; animazioni `aca-tip-rise-above` e `aca-tip-fade` di 300 ms; con movimento ridotto solo dissolvenza di 120 ms senza spostamento. |
| Console | Superato | Nessun errore di console o di pagina nelle esecuzioni di pressione, copertina, vista e nuvoletta. |
| Prova sul Lenovo Tab M11, pan e flick a dito, rotazione durante la vista, TalkBack | Non eseguito | Le soglie del flick (0,4 px/ms, 120 ms) sono tarate con eventi CDP, più radi di un dito vero. Da fare con l'immagine del banco aggiornata. |

## Limiti e punti aperti

- **Rotella e trackpad.** In vista lo scroll nativo è bloccato: rotella e gesto a due dita orizzontale non scorrono più le schede. Restano mouse, tocco, Tab, Alt+frecce e tocco sul nome. Un ascoltatore `wheel` non è stato aggiunto (fuori perimetro).
- **Primo fotogramma dell'apertura.** Nel server di sviluppo resta un fotogramma di 50–67 ms (commit React della vista). Sul build di produzione non si ripete nelle prove, ma non è misurato sul tablet.
- **Scheda eliminata.** Sparisce subito e le vicine scivolano; non c'è un'uscita animata della scheda stessa (`PanelPresence` era facoltativo).
- **Proporzioni della scheda.** La scheda è una foto della pagina con le proporzioni dello schermo e il gruppo scheda più comandi è centrato in verticale: sul telefono in verticale resta spazio sopra e sotto. Da vedere sul banco.
- **Trasformazioni a somma nulla.** Le pagine non correnti hanno `transform` e `translate` non nulli anche fuori dalla vista; se un figlio usasse `position: fixed` ne risentirebbe (oggi fogli e popover sono nel top layer).
- **Clic dopo un pan bloccato.** Se il pan viene bloccato a gesto iniziato (per esempio da un secondo dito sulla barra delle pagine), l'attributo e la variabile si ripuliscono ma il click del rilascio non viene inghiottito.
- **Nuvoletta e tinta.** Sull'arancio il fondo è più scuro e meno vivo di prima (saturazione ridotta insieme alla luminosità); l'arancio acceso del tema resta quello dei controlli. `--k2-on-accent` (bianco) resta sotto 4,5:1 su arancio, rosso e ciano nei pulsanti primari: non toccato, proposta registrata.
- **Nuvoletta in `below`.** Il lato «sotto» è provato con jsdom e con una prova forzata, non in uno scenario reale.
- **Le questioni di REP-20261009-004** (fuoco residuo, «Fine» sotto il vassoio, densità della barra su tablet verticale) riguardano anche la vista pagine e restano aperte lì.

## Chiusura e punto di ripresa

Codice e documenti completati; nessun commit Git, su richiesta dell'utente.

**Banco (2026-10-10, agente principale):** `aca-system:0.8` dal 2026-10-10 alle 10:38 (`sha256:a552c711…fdd72`), `healthy`; per i tablet `http://192.168.1.11:3002`. Copia a freddo del volume prima dell'aggiornamento: `backup/banco/tunet-data-20261010-pre-0.8-freddo.tgz` (104 306 byte, SHA-256 `0a32ad2b…79e2`). `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.11`; bundle `index-BLpMNnba.js`. Ripristino: `image: aca-system:0.7`. Prova sul Lenovo a cura dell'utente.

**Prossimo passo:** prova dell'utente sul Lenovo Tab M11: vista pagine (apertura, chiusura, scorrimento a dito, riordino), nuvoletta su tutti gli accenti, scambio delle barre in basso. Risposte ai punti da confermare di questo report e di REP-20261009-004.
