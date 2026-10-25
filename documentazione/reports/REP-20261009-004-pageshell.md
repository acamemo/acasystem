# REP-20261009-004 — PageShell: un contenitore unico per tutte le pagine, pressione che rimpicciolisce, bug della copertina

| Campo | Valore |
|---|---|
| Stato | Completato; banco su `aca-system:0.8` |
| Data | 2026-10-09, Europe/Rome (chiusura documentale del 2026-10-10) |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) per la progettazione; implementazione, revisioni e prova visiva con subagenti (modelli non registrati); chiusura dei documenti con Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`) |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` più il working tree non committato (fino a REP-20261009-002/003). Basi di misura dei diff di ogni blocco, oggetti non referenziati creati con `git stash create` e usati solo per confrontare: B1 `f20711061e47…`, B2 `c78714c41022…`, B3 `d3ead2be72cd…`; B4 `b6f6f8881532…` e B5 `13616757b28c…` sono riportate in REP-20261009-003. |
| Richiesta di riferimento | Chat del 2026-10-09, durante la prova sul banco. |
| Autorizzazione | La richiesta qui sotto, che chiede esplicitamente il refactor, e le decisioni D1–D5 della stessa chat. Accorpato a REP-20261009-003 (animazione della vista pagine e nuvoletta UI-010), che tocca gli stessi componenti. |

## Richiesta

> «altra cosa che va rivista assolutamente, quando faccio hold su un componente questo non deve spostarsi in nessuna direzione, ma alla pressione in hold deve iniziare a rimpicciolirsi fino a un 10%, altro bug da denotare se io prendo un widget come l'orologio dalla copertina e lo sposto nella principale, questo automaticamente si riduce al minimo come dimensione, il che ci sta, però poi se lo voglio riportare nella copertina, non me lo fa fare, non riesce a rilevare la griglia. Poi se sposto il widget, ho notato che la griglia dietro della copertina non compare, compare improvvisamente se provo a ritrascinare il widget, di base penso che dovremmo definire e refrattorizzare tutte le funzioni delle pagine in un unico componente di layout che potremmo chiamare PageContainer o PageShell se non esiste già perché tutte le pagine create, sono tutte dipendenti dalla stessa funzionalità ciò che può cambiare realmente sono i dati della singola pagina, come ad esempio le colonne, il nome, sono solo i dati della pagina ma dato che tutte le pagine hanno funzioni in comune dovremmo fare così, poi innesterei che alcuni componenti come la topbar che si attiva solo da pagine non copertina con un semplice if page == copertina disable bar o che comunque la fa risalire e non la mostra mai ecc»

**Interpretazione dichiarata all'utente:** «rimpicciolirsi fino a un 10 %» significa ridursi del 10 %, cioè fino al 90 % della dimensione. L'utente non ha obiettato.

## Decisioni dell'utente (chat del 2026-10-09, circa le 11:15)

Prevalgono sul piano di lavoro e sui suoi valori predefiniti.
- **D1. «Fine» esce dalla barra in alto per tutte le pagine** («dovremmo fare in modo che per giustificare quel fine lo togliamo da là per tutti»). Va nella barra in basso della modifica (EditToolbar), accanto a «+ Widget» e «Pagine». La copertina non ha mai la barra in alto, nemmeno in modifica. Che cosa mostrare in alto sulle altre pagine mentre si modifica è una scelta esecutiva, documentata sotto.
- **D2.** Il rimpicciolimento al 90 %, senza oscillazione né spostamento, vale anche per le schede della vista pagine e per lo sfondo premuto.
- **D3a.** «Fino a un 10 %» è il 90 %.
- **D3b.** Dopo il sollevamento la copia torna al 100 % in circa 150 ms e oscilla durante il trascinamento («Torna al 100% e oscilla»).
- **D4.** Nessuna esportazione del layout del banco: si correggono le cause trovate di P2 e il caso resta «da confermare sul banco».
- **D5.** Le caselle vuote della copertina sono sempre visibili, senza «+»; in modifica restano celle con «+» («Sì, sempre visibili»).

## Obiettivo e perimetro

- **P1. PageShell.** Un unico componente per montare tutte le pagine del launcher: copertina, pagine di widget e pagine speciali. Le differenze arrivano dai dati della pagina (tipo, colonne, nome, barra in alto). La copertina diventa una pagina come le altre con «barra in alto: mai». La decisione è in [ADR-0012](../decisions/ADR-0012-pageshell.md).
- **P2. Bug: ritorno dell'orologio in copertina.** Un widget portato dalla copertina alla Principale si deve poter riportare in copertina.
- **P3. Bug: griglia della copertina.** La griglia deve comparire subito quando si sposta un widget; con D5 le caselle vuote sono sempre visibili.
- **P4. Pressione sul widget.** Nessuno spostamento, rotazione o oscillazione durante la pressione. Il widget si riduce in modo progressivo fino al 90 % in 1 s, poi si solleva. La vibrazione resta. Con il movimento ridotto non c'è animazione.
- **Accorpati da REP-20261009-003:** vista delle pagine a trasformazioni, senza ricalcolo della griglia, e nuvoletta con il design UI-010.
- **Esclusi:** nuove funzioni, dipendenze, backend.

## Criteri di completamento

1. **P4.** Il widget non usa più `transform:` per la posizione (usa `translate:`). Il centro resta fermo entro ±0,5 px fino a 950 ms; la scala a 950 ms è 0,906 ± 0,01; nessuna rotazione né oscillazione prima del sollevamento. Con il movimento ridotto: scala 1, nessuna animazione.
2. **P2.** Con la copia di 107 px sopra celle di 397 px e il dito a 0,9 della cella 0, il bersaglio è la colonna 0; un rilascio subito dopo il giro di pagina sposta il widget; l'orologio torna in colonna 1 della copertina.
3. **P3 e D5.** Copertina con un buco fuori dalla modifica: pozzetti visibili e non interattivi, senza «+»; in modifica celle con «+».
4. **P1.** Un solo punto monta il contenuto delle pagine; `widgetPageOf`, `quiet`, la prop `cover` e il wrapper `aca-cover--widgets` non esistono più; la barra in alto legge `topBar` dal descrittore. Geometria identica prima e dopo, a parte D1.
5. **D1.** «Fine» solo nella barra in basso; la copertina non mostra mai la barra in alto; il fuoco non si perde.
6. **Controlli.** typecheck, lint, tipografia e colori a 0, suite completa e build verdi, con esiti in `verification.md`.

## Avanzamento e modifiche

Il lavoro è stato svolto a blocchi (B1–B3 qui, B4–B5 in REP-20261009-003), ciascuno con implementazione, uno o due giri di revisione avversaria con riproduzioni in Chromium e correzioni. Poi una verifica d'insieme e una prova visiva.

### B1 — Pressione che rimpicciolisce (P4, D2, D3b)

- **Posizione.** Widget, cella libera e anteprima di rilascio sono posizionati con `translate:` invece di `transform: translate(...)`; le transizioni elencano `translate`. La scala della pressione ruota attorno al centro di un riquadro che non si muove.
- **Pressione.** Dopo il ritardo di 180 ms, la sola parte visiva del widget (`__frame` o `__bare`, non l'area di presa) scende in modo lineare a `var(--aca-hold-scale, 0.9)`. Nessuna ombra, rotazione, crescita o oscillazione. L'oscillazione a riposo della modifica si ferma durante la pressione. Il tremolio del widget selezionato con la maniglia premuta è eliminato.
- **Token.** `--aca-hold-ms` (1000 ms), `--aca-hold-delay` (180 ms) e `--aca-hold-scale` (0,9) sono su `:root`, così li vede anche la copia fluttuante.
- **Copia sollevata (D3b).** Nasce a scala 0,9 e opaca, torna a 1 in circa 150 ms, poi oscilla (`aca-hold-shake`, 300 ms, ±0,9° e ±0,5 px) a partire da zero. L'oscillazione ha una curva per tratto e inizia dopo il ritorno a 1 (ritardo di 150 ms); non c'è più l'inclinazione statica di 1,5°.
- **D2.** La scheda e lo sfondo premuti nella vista pagine scendono a 0,9; la scheda sollevata torna a 1 (in vista, a k) con la stessa oscillazione ripartita da zero.
- **Movimento ridotto.** Scala 1, nessuna transizione né animazione, anche per la copia.
- **Fallback delle curve.** Ogni `var(--aca-ease-out)` e `--aca-ease-in-out` di `launcher.css` ha un fallback letterale. Prima la variabile era vuota fuori da `.aca-m`, quindi alcune transizioni (`is-resizing`, `is-stack-target`, copia fluttuante) erano invalide; ora funzionano. È un cambiamento visibile, previsto dal piano.
- **Rimosso.** L'animazione di assestamento `aca-widget-land` (da 1,04 a 1) e i suoi keyframe: era già morta per la variabile vuota e, con la copia di nuovo a 1, farebbe crescere il widget del 4 % a ogni rilascio. Il widget compare dove atterra, come prima di B1.
- **Revisione.** Due giri: corretti, tra l'altro, la copia non sollevata che compariva da opacità 0 mentre il widget era già nascosto, lo scatto a 1,03 della scheda sollevata, il click perso al bordo in modifica (ora la presa resta grande quanto il riquadro) e il salto angolare della scheda sollevata.
- File: `launcher.css`, `WidgetHost.tsx` e `LauncherScreen.tsx` (solo commenti), `LauncherGestures.test.tsx`, `LauncherScreen.test.tsx`.

### B2 — Bersaglio del trascinamento e pozzetti della copertina (P2, P3, D5)

- **P2-A, aggancio.** `computeTarget` (`useWidgetDrag.ts`) aggancia il centro della copia, per colonna e per riga: `centro = pos + larghezza/2 − (taglia·passo − gap)/2`, poi arrotondamento al passo. Con la copia grande quanto la cella di destinazione il risultato è identico a prima; con una copia piccola (107 px) sopra celle grandi non cade più una colonna a destra.
- **P2-B, giro di pagina.** Tolti il `settleTimer` di 320 ms e il bersaglio nullo dopo il bordo: il bersaglio sulla nuova pagina si calcola subito e un rilascio subito dopo il giro sposta il widget. `WidgetGrid` registra la geometria assestata (`left = griglia − sezione + pager`), che non dipende dallo scorrimento in corso. Il `settleTimer` ancora presente in `Pager.tsx` è un altro, quello che attende la fine dello scorrimento nativo.
- **P3 e D5.** La prop `quiet` è sostituita da `cells: 'interactive' | 'wells'`. La copertina passa `wells` fuori dalla modifica (pozzetti `span` con `aria-hidden`, senza «+», non interattivi, classe `is-well`) e `interactive` in modifica. Lo strato `.aca-launcher-cells` è lo stesso nodo nei due stati finché la pagina ha celle libere; `ReservedCells` è sempre montato.
- **Revisione.** Due giri: aggiunto `LauncherGridGeometry.test.tsx` (geometria a metà scorrimento), corretti commenti e nomi di test. Le suite `FixLauncherLogic` e `FixLauncherLogicRipresa` fissavano il bersaglio nullo dopo il giro: riscritte.
- File: `useWidgetDrag.ts`, `WidgetGrid.tsx`, `launcher.css`, `LauncherScreen.tsx`; test `LauncherCoverGrid`, `LauncherGridGeometry`, `LauncherDragDrop`, `FixLauncherLogic`, `FixLauncherLogicRipresa`.

### B3 — PageShell, descrittore e barra in alto (P1, D1)

- **Descrittore.** `utils/launcher/pageDescriptor.ts` (logica pura): `key`, `page`, `kind`, `label`, `familyRootId`, `columns.minSaved`, `hidden`, `main`, `topBar` (`auto` | `never`), `addCells` (`always` | `edit-only`) e `acceptsWidgets`. La copertina ha `topBar: 'never'` e `addCells: 'edit-only'`. `LauncherScreen` calcola i descrittori con `useMemo` e li legge al posto di `widgetPageOf`, che non esiste più.
- **Componente.** `templates/launcher/PageShell.tsx` sostituisce il ternario di rendering e sceglie `WidgetGrid` o `PageKindHost` dal tipo di superficie. Ha un wrapper `div.aca-page-shell` con `display: contents` e gli attributi `data-page-kind` e `data-top-bar`. La misura dell'area e la geometria restano in `WidgetGrid`, `inert` nel `Pager`: è meno di quanto prevedeva il piano (vedi i limiti).
- **Rimossi.** La prop `cover` di `LauncherScreen` (e il suo uso in `LauncherPage` e `PreviewApp`), le regole `.aca-cover--widgets` di `cover.css`. `CoverPage.tsx` resta, usata da `UiKitPage`.
- **D1.** La barra in alto non ha più «Fine» né il pulsante che si trasforma: resta la matita (`data-launcher-edit`) e Sistema. «Fine» è nella `EditToolbar` (Button primario `md`, solo testo, 44 px), dopo «Pagine». La barra in alto non compare mai sulla copertina e, per scelta esecutiva, sale e resta inerte in modifica su tutte le pagine.
- **Fuoco.** Entrando in modifica dalla matita con la tastiera il fuoco passa a «Fine». Con «Fine» o Esc torna alla matita; sulla copertina, dove la barra non c'è, va al cursore «Pagina» dell'indicatore.
- **Revisione.** Due giri: il primo ha trovato la perdita del fuoco all'ingresso in modifica (corretta, con test) e alcuni commenti. Il secondo non ha avuto correzioni (vedi i punti aperti).
- File: `pageDescriptor.ts`, `PageShell.tsx`, `LauncherScreen.tsx`, `launcher.css`, `StatusBar.tsx`, `statusBar.css`, `EditToolbar.tsx`, `LauncherPage.tsx`, `PreviewApp.tsx`, `cover.css`, `UiKitPage.tsx`; test `PageDescriptor`, `PageShell` e quelli aggiornati per le prop tolte o aggiunte.

### Scambio delle barre in basso

Durante la prova visiva si sono viste per qualche fotogramma due barre in basso e due «Fine» (modifica e vista pagine). In `edit.css` la barra che arriva ora aspetta 180 ms (220 ms il gruppo «Pagine») quella che va via, secondo il verso indicato dal pager. Test in `EditToolbarHidden.test.tsx`; dettaglio in REP-20261009-003.

## Scelte esecutive

- **Barra in alto in modifica:** sale e resta montata e inerte su tutte le pagine, invece di una matita disattivata (niente controlli disattivati senza spiegazione, coerenza con la vista pagine e la barra del widget).
- `topBar` vale `'auto' | 'never'`; `'edit-only'` del piano è sostituito da `'never'` per D1.
- La pressione scala solo la parte visiva; l'area di presa resta grande quanto il riquadro.
- L'assestamento `aca-widget-land` è eliminato invece di essere riattivato.
- `finishEditing` sceglie il fuoco dal dato `topBar` della pagina, non dall'esito del `focus()`.
- Nessun segnaposto del meteo.

## Verifiche ed evidenze

Comandi in `progetto/acasystem/frontend`. Prove nel browser in Chromium senza GPU (`--disable-gpu`, SwiftShader), un browser alla volta, su server Vite propri, fermati alla fine. Gli script sono prove una tantum nella scratchpad della sessione, non una suite e2e.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici | Superato | `npm run typecheck` 0 errori; `npm run lint` 0; `lint:typography` 0 violazioni (428 file); `lint:theme-colors` 0 (303 file). `format:check` fallisce solo su `eslint.config.js` e `public/sw.js`, preesistenti. `i18n:check` 4/4. |
| Suite frontend completa | Superato, con nota | Ultima esecuzione completa con `--maxWorkers=4`: 139 file, 1644 test passati (405 s). Nei passaggi intermedi, sotto carico, alcuni test di `LauncherScreen`, `PolishKit` e altri sono andati in timeout da 15 s (nessuna asserzione fallita); rilanciati da soli o con meno processi sono passati. |
| Build e budget | Superato | `npm run build` riuscita (solo l'avviso preesistente sui chunk oltre 500 kB); `check-bundle-size.mjs` nei limiti, index 725,6/900 KB. |
| Pressione, tablet 1024×472 e telefono 390×844, chiaro e scuro, modifica e vista | Superato | Centro del widget fermo (scarto 0,00 px) fino a 1000 ms; scala a 950 ms 0,908–0,910; nessuna rotazione né animazione prima del sollevamento. La copia nasce a 0,9, torna a 1 entro circa 200 ms e oscilla tra −0,9° e +0,9°. Movimento ridotto: scala 1, nessuna oscillazione. Sfondo e scheda della vista a 0,908–0,910 con centro fermo. |
| P2, ritorno dell'orologio | Superato | 8 giri su 8 (tablet e telefono, chiaro e scuro, due varianti): l'orologio torna nella posizione iniziale; il rilascio subito dopo il giro di pagina è accettato. Test unitari dell'aggancio al centro e della geometria a metà scorrimento. Il caso esatto dell'utente non è riprodotto (D4). |
| D5, pozzetti della copertina | Superato | Fuori dalla modifica `span` `aria-hidden` senza «+» né testo, non focalizzabili, visibili a riposo e a 600 ms di pressione; in modifica e durante il trascinamento bottoni con «+»; dopo «Fine» tornano pozzetti. La Home mantiene le celle con «+». |
| D1, barra in alto | Superato | Copertina: barra fuori schermo, opacità 0, inerte, mai mostrata, in vista e in modifica. «Fine» solo nella `EditToolbar` (72×44 px), non nella barra in alto; sulle altre pagine la barra è nascosta in modifica e torna con «Fine». Larghezze di 320 e 360 px senza sovrapposizioni. |
| Fuoco | Superato, con note | Matita → «Fine» all'ingresso; «Fine» ed Esc → matita; sulla copertina → «Pagina». Casi non coperti nei punti aperti. |
| Prima/dopo del PageShell | Superato | Impronta geometrica di pagine, griglie, widget e celle identica in 5 scene a 1280×800 e 390×844; unici scarti i voluti di D1. |
| Prova sul Lenovo Tab M11, pressione lunga nativa di Chrome per Android, TalkBack | Non eseguito | Da fare con l'immagine del banco aggiornata. |

## Limiti e punti aperti

- **Copertina, tre posizioni.** Con D5 il meteo senza entità lascia un posto che sembra vuoto ma senza pozzetto accanto a pozzetti: più visibile di prima. Segnaposto del meteo e scelta restano all'utente (proposta già registrata il 2026-10-08).
- **Barra in alto in modifica.** Connessione e Sistema non sono raggiungibili finché non si preme «Fine»; in alto resta una fascia vuota. Da confermare.
- **Tablet in verticale (768–834 px).** «Fine» allarga il gruppo finale: la barra di modifica passa dalla densità con testo a quella corta, con «+ Widget» e «Pagine» solo icone (nomi in `aria-label` e `title`). Misurato in Chromium; il confronto prima/dopo copriva solo 1280 e 390.
- **Fuoco, casi residui.** Con la copertina nascosta nella vista e «Fine» premuto, si atterra su «Casa» con la barra visibile ma il fuoco va all'indicatore invece che alla matita. Con il vassoio dei widget aperto, «Fine» sotto il vassoio non è inerte e si raggiunge con Tab.
- **«Fine» piatto.** Nella barra di modifica la regola dei pulsanti senza bordo rilevato toglie l'ombra anche a «Fine», mentre quello della vista pagine è rilevato. Scelta di aspetto non presa.
- **PageShell più snello del piano.** Sceglie la superficie e mette gli attributi; misura, registrazione della geometria, `inert` e slot dei comandi restano in `WidgetGrid`, `Pager` e `LauncherScreen`. ADR-0012 descrive il realizzato.
- **Commenti non aggiornati** dopo D1 (rilevati e non corretti): `edit.css:5-6` cita ancora la regola di «Fine» in `statusBar.css`; `WidgetActionBar.tsx:33` e `WidgetHost.tsx:318` dicono che la selezione fa salire la barra in alto, già su in modifica; il commento a `LauncherScreen.test.tsx:310-314` e la sua asserzione sulla classe `--hidden` non verificano più la selezione; la doc della prop `hidden` di `StatusBar.tsx`.
- **Tocco lento al bordo in vista.** Fuori dalla modifica, un tocco tenuto tra 180 ms e 1 s a pochi pixel dal bordo del pulsante di apertura può perdere il click, perché la parte visiva si ritira. Non risolvibile col solo CSS (servirebbe trattare il rilascio senza sollevamento come tocco da `pointerup`). Non verificato sul tablet.
- **Dipendenza dal kit.** La riduzione è esattamente 0,9 perché Kit 2 annulla il `transform` sul riquadro premuto (`themes/kit2/skin.css`); un tema senza quella regola moltiplicherebbe per `--aca-press-scale`.
- **Carico del PC.** La suite completa sotto carico va in timeout, e durante le prove il PC si è spento più volte con crash del driver grafico (codici 0x10E e 0x116). Per questo le ultime prove sono state senza GPU, un browser alla volta, con quattro processi per la suite. L'utente ha segnalato un nuovo spegnimento durante la chiusura: causa non accertata.
- **Proposte non applicate:** una primitiva Tooltip accanto a Popover; assestamento 1,04 → 1 solo per la copia non sollevata, con una variabile `--aca-land-from`; segnaposto del meteo; un colore `--k2-on-accent` con contrasto ≥ 4,5:1 su arancio, rosso e ciano nei pulsanti primari. Registrate in [project-status.md](../project-status.md#proposte-registrate-il-2026-10-09).

## Chiusura e punto di ripresa

Codice e documenti completati; nessun commit Git, su richiesta dell'utente. Sono state aggiornate ADR-0012 (nuova), il catalogo UI (adattamento di UI-010), `design.md`, `verification.md`, `project-status.md`, i due registri e l'annotazione su REP-20261008-001 (U1).

**Banco (2026-10-10, agente principale):** `aca-system:0.8` dal 2026-10-10 alle 10:38 (`sha256:a552c711…fdd72`), `healthy`; per i tablet `http://192.168.1.11:3002`. Copia a freddo del volume prima dell'aggiornamento: `backup/banco/tunet-data-20261010-pre-0.8-freddo.tgz` (104 306 byte, SHA-256 `0a32ad2b…79e2`). `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.11`; bundle `index-BLpMNnba.js`. Ripristino: `image: aca-system:0.7`. Prova sul Lenovo a cura dell'utente.

**Prossimo passo:** prova dell'utente sul Lenovo Tab M11 con la nuova immagine: pressione di 1 s e oscillazione dopo il sollevamento, ritorno dell'orologio in copertina, pozzetti della copertina, «Fine» nella barra in basso, vista pagine e nuvoletta. Risposte ai punti da confermare di questo report e di REP-20261009-003.

## Annotazione del 2026-10-10 — tocco lento al bordo dell'apertura (blocco C)

Rettifica del limite «Tocco lento al bordo in vista», riportato sopra senza modifiche. Eseguita insieme a REP-20261009-005 e REP-20261009-006, base di misura del diff `004793d4881a…`.

- **Riprodotto.** Playwright headless (SwiftShader), tocco CDP, 1024×472 a DPR 1,875, Vite proprio: un tocco di 700–900 ms (scala 0,91–0,94 al rilascio) a 4 e 8 px dal bordo del pulsante di apertura di un widget perde il click, che cade sulla parte visiva ormai rimpicciolita (`.aca-m__face`, fuori dall'apertura); i dettagli non si aprono. Un tocco rapido al bordo e un tocco lento al centro aprono. Il widget di anteprima non ha `data-widget-open`: l'attributo è stato aggiunto con `evaluate`, il meccanismo è quello reale (il click ha come bersaglio l'antenato comune di pressione e rilascio, non più dentro `[data-widget-open]`).
- **Correzione**, solo in `WidgetHost.tsx`: `onPointerDownCapture` memorizza l'apertura premuta con le coordinate; `onClickCapture`, se il bersaglio non è dentro un'apertura, usa l'apertura premuta quando il rilascio è entro `HOLD_TOLERANCE_PX` (8 px) dalla pressione, poi segue il percorso esistente (doppio tocco di 280 ms, dettagli o impostazioni). Con la disposizione bloccata la stessa apertura di riserva fa `preventDefault`, `stopPropagation` e `click()` sull'apertura: i dettagli si aprono subito, senza impostazioni. Un rilascio su un comando del widget, dopo una pressione iniziata sull'apertura, conta come tocco sull'apertura e non esegue il comando (prima la luce si accendeva). Il registro della pressione si azzera a ogni click e a ogni nuovo `pointerdown`.
- **Invariati:** `useLongPress`, la pressione lunga (1,4 s entra in modifica senza aprire), il trascinamento, lo scorrimento e il CSS. Un rilascio dopo uno spostamento oltre 8 px non apre nulla.
- **Test.** 5 nuovi in `LauncherScreen.test.tsx` (tocco lento che termina sul riquadro, secondo tocco lento che apre le impostazioni, disposizione bloccata, tocco lento che termina su un comando senza eseguirlo, pressione iniziata altrove che non apre nulla anche dopo una pressione precedente sull'apertura); i quattro positivi falliscono con il `WidgetHost` precedente, quello negativo (pressione iniziata altrove) passa in entrambi i casi.
- **Controlli.** Dopo la correzione i tocchi lenti a 4 px laterale, 4 px in alto e 8 px aprono i dettagli; console senza errori; server fermato. Suite completa ultima: 141 file, 1676 test passati; typecheck, lint, tipografia e colori verdi.
- **Limiti.** Non verificato sul Lenovo Tab M11: su Android Chrome il bersaglio del click di un tocco può essere determinato in modo diverso, ma la correzione non dipende dal bersaglio, solo dalla vicinanza al punto di pressione. Nell'anteprima `launcher.html` i widget non hanno `data-widget-open`. **Caso simmetrico non coperto:** un tocco lento su un comando del widget vicino al suo lato esterno si perde (il comando rimpicciolisce e scivola verso il centro di 5–7 px; il click cade sulla faccia). Registrato come proposta in [project-status.md](../project-status.md#proposte-registrate-il-2026-10-09).
