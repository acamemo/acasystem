# REP-20261012-003 — Lag sui tablet: diagnosi sul dispositivo e prima tappa di correzione

| Campo | Valore |
|---|---|
| Stato | L1 e L2 sul banco (dal 2026-10-14 `aca-system:0.9.3`); misurati sul tablet delle demo e sul Tab M11 il 2026-10-14. Resta uno scatto all'apertura e alla chiusura della vista pagine sul M11 (proposta [ISSUE-062](../project-status.md#issue-062)) |
| Data | 2026-10-12, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`); implementazione con Sonnet 5.5 e revisione con Opus nei workflow; chiusura dei documenti con Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`) |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` più il working tree non committato (fino a REP-20261012-002) |
| Richiesta di riferimento | Chat del 2026-10-12. |
| Autorizzazione | La richiesta di capire la causa. Poi il «sì» dell'utente alla proposta: livelli grafici, blocchi residui di React e impaginazione nella vista pagine, banco 0.9 e misura sul Tab M11. Il 2026-10-12 l'utente ha scelto «0.9 subito»: il blocco L2 (React e impaginazione) è rimandato alla 0.9.1, resta autorizzato. |

## Richiesta

> «io sto provando l'app dal browser di uno dei tablet che installiamo nelle case, ma vedo un lag incredibile, le animazioni fanno 5fps letteralmente, il tablet di riferimento è un Lenovo Tab M11 TB330FU … il tablet che uso io per le demo è la versione con 8gb di ram ed è un Lenovo Idea Tab TB336ZU … dobbiamo assolutamente cercare di capire da cosa è dovuto tutto questo lag»

## Diagnosi sul dispositivo (2026-10-12)

**Tablet e collegamento.**
- **Dispositivo:** Lenovo Idea Tab TB336ZU, Android 16, SoC MT8755, GPU Mali-G57 MC2 (ANGLE, OpenGL ES 3.2, driver r38p1), 7,8 GB di RAM.
- **Chrome:** 154.0.8037.126, viewport 1280×665 CSS px con DPR 2, schermo a 90 Hz.
- **Accelerazione:** composizione e raster su GPU attivi.
- **Collegamento:** debug USB e `adb forward tcp:9222 localabstract:chrome_devtools_remote`, poi CDP con Playwright `connectOverCDP`.
- **App:** banco `aca-system:0.8` su `http://192.168.1.7:3002`, collegata a HA reale. Accesso fatto dall'utente.
- **Disposizione dell'utente:** copertina con 3 widget e una pagina vuota con 40 celle «+»; 1096 elementi, di cui 272 con `box-shadow`.

**Misure.**
- **Fotogrammi (intervalli di `requestAnimationFrame`).** Quiete e quasi tutto il resto a 90 fps. Il lag sono blocchi singoli all'inizio delle animazioni:
  - scorrimento tra le pagine: 68-79 fps, fino a 267 ms;
  - apertura della vista pagine: 38 fps, fino a 356 ms;
  - chiusura: 54 fps, fino a 467 ms.
- **Tracce CDP.** Il tempo va nel processo GPU (`CrGpuMain`, `RendererRasterWorker` / `CommandBuffer::Flush` / `DoEndRasterCHROMIUM::Flush`), cioè nel raster su GPU:
  - chiusura della vista: 956 ms su 1,8 s, con un blocco da 245 ms;
  - il thread principale del renderer resta sotto i 70 ms per blocco.
- **Prove A/B con CSS iniettato solo nella pagina, a pagina assestata (3,5 s).** Blocco massimo del processo GPU:

| Scenario | Base | Senza ombre | Senza ombre nelle pagine | Senza sfondi | Schede e celle su livelli propri (`will-change: transform`) |
|---|---|---|---|---|---|
| Apertura della vista | 157-170 ms | 17 ms | 23 ms | — | 17 ms |
| Chiusura della vista | 230-236 ms | 10 ms | — | — | 35 ms |
| Scorrimento | 39-142 ms | 10-12 ms | 16 ms | 48-172 ms | 22 ms |

- **Fotogrammi con i livelli propri:**
  - scorrimento 84-87 fps, scatti al massimo 56 ms;
  - apertura della vista 80 fps, 155 ms;
  - chiusura 72 fps, 156 ms.
- **Semplificare le ombre delle sole celle non basta:** scorrimento 83 ms e vista 161-174 ms.

**Conclusione.** La causa principale è il raster su GPU delle ombre del Kit 2 e del Metallo, che si ripete a ogni fotogramma mentre schede e pagine cambiano scala o scorrono. Il Mali-G57 a DPR 2 non regge. Mettere i contenuti delle pagine su livelli propri ne evita il ridisegno senza cambiare l'aspetto.

**Diagnosi statica ed emulata sul PC** (workflow `wf_def65ea8-7d0`):
- **CSS:**
  - nella vista pagine `border-radius` e `box-shadow` di `.aca-pager__body` sono animati;
  - il pan della vista scrive a ogni fotogramma una proprietà personalizzata ereditata sul pager (`--aca-overview-pan`) e ricalcola lo stile di tutte le pagine; lo stesso vale per `--aca-o` e `--aca-d` al cambio di pagina;
  - l'oscillazione gira su tutte le pagine e non si ferma nella vista, per un errore di cascata;
  - entrando in modifica ci sono transizioni di `box-shadow` su tutti i controlli;
  - ci sono troppi livelli `will-change` dentro facce ritagliate.
- **React e HA:**
  - ogni messaggio `state_changed` di HA, anche di entità non mostrate, fa ri-renderizzare due volte tutto il launcher; sul tablet un commit di React arriva a 66 ms;
  - lo sparkline riscarica 24 h di storico a ogni cambio;
  - l'arricchimento dal registro costa O(N) per messaggio;
  - i formattatori Intl sono creati a ogni render;
  - il cambio di pagina e il trascinamento ri-renderizzano tutto;
  - tutte le pagine sono montate.

## Obiettivo e perimetro

- **Tappa 1, grafica e composizione, autorizzata:**
  - livelli propri per widget e celle;
  - nessuna animazione di angoli e ombre nella vista;
  - pan e indici della vista senza proprietà ereditate ricalcolate a ogni fotogramma;
  - oscillazione solo nella pagina corrente e ferma nella vista;
  - nessuna transizione di ombre entrando in modifica;
  - meno livelli annidati inutili.
  
  Aspetto invariato.
- **Blocchi residui di React e dell'impaginazione nella vista pagine, autorizzati (L2):** letture forzate del layout dopo i commit, re-render completi all'apertura e alla chiusura della vista. *Rimandati alla 0.9.1 per scelta dell'utente del 2026-10-12; non iniziati alla chiusura della tappa 1. Ripresi il 2026-10-13 su richiesta dell'utente («riprendi la 0.9.1»): vedi «Blocco L2 (0.9.1)».*
- **Da proporre dopo la misura della tappa 1, non autorizzato ora:** sottoscrizione per entità al posto del re-render globale a ogni messaggio di HA, montaggio delle sole pagine vicine, storico dello sparkline, cache dei formattatori. Registrati come proposte in [ISSUE-040…043](../project-status.md#issue-040).
- **Esclusi:** cambi di aspetto delle ombre (Kit 2, ADR-0011), dipendenze nuove, backend.

## Criteri di completamento

- Prova sul tablet delle demo dopo la tappa 1, con lo stesso script (`scratchpad/device/measure.cjs`, `trace.cjs`):
  - scorrimento e vista pagine senza blocchi del processo GPU oltre 40 ms;
  - fotogrammi oltre 50 ms al più 1 per animazione.
- Aspetto identico: screenshot prima e dopo.
- Suite, typecheck, lint, tipografia e colori verdi.
- Banco 0.9 e misura sul Tab M11, se disponibile.

Valutazione dei criteri alla chiusura della tappa 1 nella sezione «Verifiche ed evidenze».

## Avanzamento e modifiche

Un workflow (`wf_436cb723-217`) con il blocco grafico L1: un'implementazione, due revisioni di Opus, due giri di correzioni. Nessun commit Git, nessuna dipendenza nuova, nessuna modifica al backend. L2 non è iniziato in quel workflow: fermato dopo 12 s dall'avvio, nessun file toccato (annotazione del 2026-10-13: L2 è stato poi eseguito, vedi «Blocco L2 (0.9.1)»).

### Tappa 1 (L1): scelte

File toccati in `progetto/acasystem/frontend/src`: `templates/launcher/launcher.css`, `templates/launcher/Pager.tsx`, `hooks/launcher/useOverviewPan.ts`, `components/system/edit/edit.css`, `components/system/page-indicator/pageIndicator.css`, `components/system/status-bar/statusBar.css`, `themes/kit2/skin.css`. Test: nuovo `LagLayers.test.ts` (22 test, che leggono il testo del CSS), toccati `PageShell.test.tsx`, `LauncherGestures.test.tsx`, `OverviewPan.test.tsx` e `PagerOverview.test.tsx`.

- **Livelli propri.**
  - `will-change: transform` su `.aca-launcher-widget` e sulle celle libere `.aca-launcher-cell.aca-m`, in una regola sola, valida anche con movimento ridotto. Widget e celle avevano già `translate` (quindi contesto di impilamento e blocco contenitore dei discendenti fissi); sheet e popover usano il top layer; copia trascinata, pile, pressione al 90 % e atterraggio sono invariati nelle immagini di confronto.
  - `will-change: transform, opacity` su `.aca-status-bar`, `.aca-edit-toolbar__group`, `.aca-indicator` e `.aca-page-overview__group`.
- **Angoli e ombre della scheda senza animazione di `border-radius` e `box-shadow`.**
  - Nuovo `.aca-pager__clip`, dentro `.aca-pager__body`: stessa scatola (flex), `overflow: hidden`, raggio statico (raggio/k, subito e per tutta la vista) e sfondo della pagina. Serve perché il corpo deve ritagliare e taglierebbe l'ombra.
  - Il corpo tiene `scale`, `translate` e il contorno, e porta due pseudo-elementi fuori dal flusso: `::after` è l'ombra della scheda, `::before` quella di sollevamento della scheda tenuta premuta. Sfumano solo in `opacity`. Lo stesso meccanismo vale per la pressione sulla parte vuota della pagina.
  - Gli pseudo-elementi hanno `z-index: -1` e il corpo `z-index: 0` (proprio contesto di impilamento): con `z-index` automatico l'ombra copriva l'anello di selezione della scheda corrente. Sui widget non cambia nulla (livelli 0-6, barre a 200).
  - Con il movimento ridotto l'ombra compare subito: dopo il giro 1 le regole `transition: none` del blocco `prefers-reduced-motion` hanno lo stesso peso di quelle che sfumano; il ritardo della pressione sulla pagina resta.
  - Il test esistente che vietava ogni pseudo-elemento su `.aca-pager` è stato precisato: ammessi solo su `.aca-pager__body`.
- **Proprietà personalizzate non ereditate.** `--aca-o`, `--aca-d`, `--aca-card-shift`, `--aca-card-drag`, `--aca-overview-pan` sono registrate con `@property` e `inherits: false`, in cima a `launcher.css` fuori dal layer. Sono scritte sulle sezioni (figlie del pager): `Pager.tsx` già scriveva le altre quattro; il pan lo scrive `useOverviewPan` su ogni sezione e non più sul pager. Così un cambio non ricalcola lo stile di tutti i discendenti. Le cinque regole sopravvivono alla minificazione (`initial-value: 0` è accettato per `<length>`; verificato in Chromium: registrata, il valore iniziale vale 0px).
- **Oscillazione solo nella pagina corrente e ferma nella vista.** La regola che doveva fermarla nella vista aveva la stessa specificità di quella che fa oscillare e, venendo prima, perdeva. Sostituita da due regole più specifiche: nessuna oscillazione sulle pagine che non sono `.is-current` e nessuna sotto `.is-overview` e `.is-closing`. Effetto visibile voluto: le schede della vista non sono più ruotate di 0,25°, come prima invece accadeva.
- **Entrando in modifica, niente transizioni d'ombra.** `transition: none` sui controlli disabilitati (e su `outer`, `face`, `content`) dentro `.aca-launcher-widget.is-editing`. Solo l'ingresso: l'uscita no (vedi i limiti).
- **`will-change` annidati tolti solo in Kit 2** (`themes/kit2/skin.css`), per i pulsanti con pressione (`.aca-fx-press`, `.aca-m--press`) dentro i widget: in Kit 2 la pressione affonda e non scala. Le manopole e i cursori ospitati tengono il loro; il Metallo non è toccato. La cornice del widget con `[data-widget-open]` mantiene il livello (correzione del giro 1, vedi sotto).
- **Angoli alla chiusura della vista.** Alla chiusura il raggio finale, 0, si applica subito (`.aca-pager.is-closing > .aca-pager__page > .aca-pager__body { border-radius: 0 }`); il ritaglio lo eredita. Il raggio non si anima, quindi non torna il ridisegno per fotogramma.

### Revisione

**Giro 1, Opus:** sei rilievi.
- Applicati cinque. (1) Lo skin Kit 2 toglieva il livello anche alla cornice del widget (`:has([data-widget-open])`), partendo dall'ipotesi che in Kit 2 la pressione non scalasse: nell'ordine reale dei fogli lo `scale` di `launcher.css` prevale sul `transform: none` dello skin, quindi la cornice scala davvero; il selettore è stato tolto dalla regola. (2) Con il movimento ridotto le ombre sfumavano ancora per un peso di selettore: aggiunti due selettori di pari peso accanto ai due già presenti. (3) Le righe «1280» delle misure erano rilevate a 1024×472 per un errore dello script: lo script ora usa la finestra dichiarata e inietta Kit 2 nell'ordine dell'app; misure rifatte a 1280×665 DPR 2. (4) Un'asserzione di `PagerOverview.test.tsx` era sempre vera: ora controlla le sezioni. (5) Il confronto dei pixel era allineato di ±3 px e nascondeva spostamenti: rifatto sui diff grezzi (vedi «Aspetto»).
- Respinto uno: il raggio del ritaglio alla chiusura. Giudicato transitorio e da valutare a vista; il giro 2 lo ha riproposto con gravità alta (sotto).

**Giro 2, Opus:** cinque rilievi.
- **Alta, angoli alla chiusura (applicato).** Il raggio restava a circa 33 px per tutta la chiusura e a fine corsa passava di colpo a 0; con uno sfondo dietro le pagine (gli sfondi del Kit 2) i quattro angoli mostravano lo sfondo; senza sfondo non si vedeva, perché la shell e la pagina hanno lo stesso colore. Corretto come descritto sopra; il test sul raggio alla chiusura è nuovo.
- **Media, differenza di pixel a riposo dovuta ai livelli (non rimossa).** `will-change: transform` su widget e celle è la correzione misurata sul tablet; la differenza va registrata e confermata con uno screenshot sul tablet (vedi «Aspetto» e i limiti). La proposta di togliere `opacity` dal `will-change` delle barre è stata respinta: le barre hanno transizioni su entrambe le proprietà e la differenza viene dalla promozione a livello, non dalla singola proprietà.
- **Bassa, uscita dalla modifica con transizioni d'ombra (non applicato).** Fuori dal perimetro (solo l'ingresso); proposta in [ISSUE-044](../project-status.md#issue-044).
- **Bassa, attribuzione del guadagno (testo del report).** Il guadagno di L1 su PC è su raster e ricalcoli, non sui fotogrammi lunghi dell'apertura e chiusura della vista, che dipendono dal thread principale (L2). Riportato così.
- **Bassa, test (applicato).** Il test di `translate` ora controlla `.aca-launcher-widget` e `.aca-launcher-cell.aca-m`, non solo la preview di rilascio.

### Galaxy Tab S8 dell'utente, 0.9 (2026-10-12 sera)

**Dispositivo e collegamento:**
- Samsung SM-X700, Android 16, Snapdragon 8 Gen 1 (SM8450), 7,5 GB.
- Samsung Internet 30 (Chromium 143), in verticale a 753×1038 CSS px, DPR 2,125; il browser aggiorna a 60 Hz.
- Banco via USB (`adb reverse`, `http://localhost:3002`), collegato a HA.
- Chrome 154 su questo Samsung non espone il debug remoto; vedi [infrastructure.md](../infrastructure.md).
- Script: `device/measure-raw.cjs`, `rawcdp.cjs`; esiti in `device/fps-s8.txt`. Il primo giro, a pagina nascosta, non è valido.

| Scena (0.9) | fps | Fotogramma più lungo | Senza ombre (A/B) |
|---|---|---|---|
| Quiete | 60 | 17-18 ms | uguale |
| Scorrimento tra pagine | 58-59 | 33-67 ms | 58-59 fps, 50-67 ms |
| Entrata in modifica | 59 | 33-50 ms | uguale |
| Apertura della vista pagine | 58 | 67 ms | 59 fps, 50 ms |
| Chiusura della vista pagine | 57 | 67-83 ms | 58 fps, 50 ms |

**Lettura:**
- Su un tablet di fascia alta la 0.9 è fluida.
- Le ombre non pesano più: togliendole i numeri non cambiano.
- Gli scatti residui, di 3-5 fotogrammi, sono nell'apertura e nella chiusura della vista pagine, come sul Lenovo, e sono l'obiettivo di L2.

### Blocco L2 (0.9.1)

Ripreso il 2026-10-13 su richiesta dell'utente («riprendi la 0.9.1»). Un primo tentativo di implementazione era stato interrotto; il lavoro parziale è stato verificato e tenuto, poi completato. Seguono due giri di revisione con correzioni, una verifica finale e un controllo visivo prima/dopo. Nessun commit Git, nessuna dipendenza nuova, nessuna modifica al backend, nessun CSS toccato. Base di confronto: copia del codice `567531f` (stato `git stash create` sopra `7298d4d`, con il lavoro non committato di REP-001, -002 e -004 e di L1), non l'HEAD.

**File toccati** (in `progetto/acasystem/frontend/src`):
- Nuovi: `hooks/launcher/useWidgetController.ts`, `__tests__/LagRenders.test.tsx`.
- Modificati: `templates/launcher/Pager.tsx`, `templates/launcher/LauncherScreen.tsx`, `templates/launcher/LauncherUiContext.tsx`, `templates/launcher/WidgetPlacementSection.tsx`, `hooks/launcher/useLauncherController.ts`, `templates/app-shell/footerBand.ts`, `utils/launcher/pageDescriptor.ts`, `pages/launcher/preview/PreviewApp.tsx`, `components/system/edit/WidgetTray.tsx` (solo `memo`).
- Test: `LauncherScreen.test.tsx`, `PageDescriptor.test.ts`, `LagLayers.test.ts` (un test nuovo) e `PagerOverview.test.tsx` (quattro test nuovi dell'implementazione e uno per ciascun giro di revisione). `WidgetTray.tsx`, `PagerOverview.test.tsx` e `LagLayers.test.ts` erano già non tracciati prima di L2: non compaiono in un `git diff` rispetto a `567531f` e vanno confrontati con la copia pre-L2.

**Scelte.**
- **Controller stabile per griglie e widget.** `LauncherScreen` divide il controller in una parte viva (`currentPage`, `currentPageId`, `overview`) e un `WidgetController` (`useWidgetController`), che restituisce lo stesso oggetto finché ogni altro campo è identico. `LauncherUiContext`, le griglie e i widget leggono quello stabile; `LauncherProvider` (RoomWidget, SystemPage) tiene la parte viva. Aprire o chiudere la vista pagine e cambiare pagina non ridisegna più widget e griglie.
- **Con la copertina spenta.** La scheda della copertina nella vista aggiunge una voce a `entries`. Dopo il giro 2 `WidgetController` omette `entries` e `goToPage`; `WidgetPlacementSection` ricava l'etichetta con `findPage`; `entryIndexOf` e `adjacentWidgetPage` leggono i descrittori da un ref e `moveToAdjacentPage` usa `goToPageId(key)`. `describePages` riusa il descrittore precedente della stessa chiave se non cambia nulla, così le `PageShell` (già `memo`) non si ridisegnano per la scheda aggiunta.
- **Ricerche del controller stabili.** `classFor`, `gridFor`, `findPage`, `canRemovePage`, `columnsAllowed` sono `useCallback`: il valore restituito non si ricostruisce a ogni cambio di pagina. `entries` dipende da `coverCard` (`editMode && overview && !cover.enabled`) invece che da `overview`, in modo esatto perché `pagerEntries` lo usa solo per una copertina spenta.
- **Pager senza letture forzate.** Gli effetti leggono un ref `rest` (`scrollLeft` e larghezza, aggiornati da `ResizeObserver`, dalle scritture proprie e dal timer di assestamento) al posto di `clientWidth` e `scrollLeft`; `OVERVIEW_MS` e `OVERVIEW_EASE` (esportate) sostituiscono `getComputedStyle`. Se la vista si chiude sulla stessa pagina da cui si era aperta, non c'è alcuna scrittura di `scrollLeft` (forzava circa 35 ms di stile).
- **Fascia del piè di pagina.** Il `MutationObserver` di `footerBand.ts` misura solo se un record può cambiare le larghezze (classe della barra di modifica, `childList` sul piè di pagina, sulla barra o sull'indicatore): le classi su pallini, barre e nome nella vista non forzano più un layout. La rimisura delle tre densità quando la barra di modifica riappare è mantenuta.
- **Anteprima e prove.** `PreviewApp` e il banco di `LauncherScreen.test.tsx` usano un `resolveSizes` costante e un `isWidgetHidden` stabile, come `LauncherPage`; altrimenti ogni render del genitore ricostruiva il controller.

**Correzioni dei due giri di revisione.**
- **Giro 1, alta (applicata).** Regressione nella navigazione con l'indicatore: lo scorrimento morbido non aggiornava `rest`, e un ritorno alla pagina di partenza durante lo scorrimento (circa 0,25-0,65 s) lasciava l'app sulla pagina sbagliata (`current: 2` contro `1` della base). Ora `rest.current.left = left` precede `scrollTo`. Il test «an index that comes back during the glide glides back too» fallisce senza la riga.
- **Giro 1, bassa (applicata).** Durata e curva della vista erano duplicate tra `Pager.tsx` e `launcher.css`: un test di `LagLayers.test.ts` verifica ora che `--aca-overview-ms` e `--aca-overview-ease` coincidano con le costanti.
- **Giro 2, media (applicata).** Con la copertina spenta apertura e chiusura ridisegnavano ancora tutte le griglie e i widget (render dell'apertura da 1230 a 778, `WidgetGrid` 305 e `WidgetHost` 152 invariati): corretto come descritto sopra. Il test di `LagRenders.test.tsx` ora copre la copertina accesa e spenta e verifica che `widget` resti lo stesso oggetto; il caso a copertina spenta di `LauncherScreen.test.tsx` falliva prima della correzione (11 render contro 9 attesi).
- **Giro 2, bassa (applicata).** Corsa all'apertura della vista entro i 90 ms dal timer di assestamento: per circa 4 fotogrammi le schede restavano spostate di una pagina. Ora il timer attivo viene annullato e si scrive `scrollLeft = base × larghezza` come prima di L2; il callback azzera `settleTimer`. Test «the overview that opens during a swipe puts the scroll back on the page it opened on», che fallisce senza la correzione.
- **Non applicati** (proposte, vedi «Limiti e punti aperti»): memoizzazione di `StatusBar`, sheet chiusi, `PageOverviewBar`, `EditToolbar`, `WidgetActionBar`; cache dell'esito di `footerBand` alla riapparizione della barra.

**Misure sul PC** (Chromium headless con SwiftShader, un browser alla volta, base e codice attuale alternati). Il raster software e un PC carico rendono rumorosi i millisecondi: contano i conteggi.

Implementazione, 1024×472 DPR 1,875, mediana di 3 giri:

| Scenario | Misura | Prima | Dopo |
|---|---|---|---|
| Apertura della vista | Render di React | 1023 | 291 (nessun `WidgetGrid` / `WidgetHost`, solo le barre) |
| | Layout forzati; letture | 1 (5,0 ms); 2 | 0; 0 |
| | Stile forzato | 28,9 ms | 2,6 ms |
| | `FunctionCall` JS; compito più lungo | 174 ms; 128 ms | 62 ms; 74 ms |
| Chiusura con «Fine» | Render; stile forzato; letture | 1099; 4 (65,2 ms); 6 | 647 (i widget si ridisegnano: finisce la modifica); 2 (0,9 ms); 0 |
| Chiusura toccando una scheda | Render; layout forzati; letture | 1765; 6; 18 | 581; 5 (la fascia del piè di pagina rimisura quando torna la barra); 12 |
| Cambio di pagina fuori dalla modifica | Render; layout e stile forzati; compito più lungo | 1294; 2 + 2; 112 ms | 305; 0; 32 ms (restano i render di orologio e data della copertina) |
| Cambio di pagina in modifica | Render; layout e stile forzati; letture; compito più lungo | 1294; 8 + 13; 40; 125 ms | 305; 0 + 2 (lo script di prova); 10; 24 ms |

Rimisure indipendenti dei due revisori, 1280×665 DPR 2, due ripetizioni, dopo il giro 1:
- **Apertura:** render da 1230 a 291; layout forzati da 1 (14-18 ms) a 0; stile forzato da 86-112 a 7-12 ms (secondo revisore: da 19-51 a 2-3 ms); compito più lungo da 357-391 a 138-146 ms (secondo revisore: da 98-236 a 41-60 ms).
- **Chiusura toccando la scheda:** render da 1972 a 581; stile forzato da 118-170 a 75-91 ms; compito più lungo da 410-609 a 215-226 ms (secondo revisore: da 108-146 a 69-78 ms).
- **Cambio di pagina:** render da 1710 a 305, layout forzati da 2 a 0, compiti lunghi (71 ms) assenti; in modifica layout forzati da 8 a 0.

Il residuo è nelle barre e negli sheet chiusi che si ridisegnano a ogni commit (circa 288 dei 581 render della chiusura e 144 dei 291 dell'apertura, secondo il secondo revisore) e nel ricalcolo di circa 3500 elementi al cambio di classe del pager (CSS, per scelta). Non c'è una misura del conteggio dopo il giro 2 con la copertina spenta oltre ai test sui render dei widget.

**Aspetto.** Controllo visivo prima/dopo con la copia di `567531f`, 22 screenshot per finestra: a 1024×472 19 su 22 identici al pixel, a 1280×665 18 su 22. Le differenze residue sono spiegate: orologio reale della copertina (23:59:48 contro 00:01:15, la mezzanotte è passata tra le due esecuzioni), fase della transizione della pressione (rifatta a regime: identica), riflusso di un widget a trascinamento iniziato. Prove precedenti: 0 pixel diversi in ogni stato dell'implementazione (un riquadro di 177 pixel nella barra di stato a 1024 dopo «Fine», animata e non legata a L2) e in 9 stati dei due revisori (2560×1330). Gli screenshot sono su un banco headless con raster software, **non sul tablet**.

## Verifiche ed evidenze

Comandi in `progetto/acasystem/frontend`. Script e tracce nello scratchpad della sessione (non versionato): sul tablet, in `device/`, `probe.cjs`, `measure.cjs`, `trace.cjs`, `analyze.cjs`, `trace-*.json`, `fps-ab.txt` (0.8), `fps-09.txt` e `trace-09-*.json` (0.9); sul PC, in `lag/L1/`, `l1.mjs`, `abrun.sh`, `abrun2.sh`, `table.mjs`, `compare*.mjs`, `mid.mjs` e le cartelle delle revisioni.

### Controlli di codice

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici, dopo l'ultima correzione | Superato | `npm run typecheck` 0 errori, `npm run lint` 0, `lint:typography` 0 violazioni (428 file), `lint:theme-colors` 0 (303 file), `npx prettier --check` sui file toccati. |
| Test del blocco | Superato | `LagLayers.test.ts` 22 test; con `OverviewPan`, `PageShell`, `LauncherGestures` e `PagerOverview` 103 test (prima dell'ultima correzione). I test di `LagLayers` leggono il testo del CSS: non provano la cascata nel browser, provata dalle sonde. |
| Suite frontend completa | Superato, con nota | Dopo l'ultima correzione: 142 file, 1706 test passati (`--maxWorkers=4`, 961 s). Esecuzioni precedenti: 1704 (826 s) e 1705 (926 s). Due esecuzioni sotto carico avevano dato fallimenti solo per timeout da 15 s (`LauncherScreen`, `SystemPage`). |
| Build | Superato | `npm run build` riuscita dopo il giro 1, con il solo avviso preesistente sui chunk oltre 500 kB; le cinque regole `@property` sopravvivono alla minificazione. La build è poi ripetuta nella costruzione dell'immagine 0.9 (bundle `index-DG_i_to_.js`). |

### Misure sul PC (headless, raster software)

Chromium headless con SwiftShader, un browser alla volta, interleaved A/B contro una copia del codice prima di L1, due ripetizioni. Il raster software **non riproduce il costo della GPU Mali**: contano i numeri strutturali (compiti di raster, ricalcoli di stile), non i fotogrammi.

**1280×665, DPR 2** (la finestra del tablet delle demo; seconda serie, dopo la correzione dello script):

| Scenario | Misura | Prima | Dopo |
|---|---|---|---|
| Apertura e chiusura della vista | Elementi con stile ricalcolato | 7505 / 7450 | 5837 / 5660 |
| | RasterTask: numero (ms) | 1940 (1507) / 1790 (1874) | 670 (203) / 588 (253) |
| | Fotogrammi oltre 33 ms; più lungo | 4 e 7; 317 e 433 ms | 5 e 9; 267 e 383 ms |
| Pan delle schede | Elementi ricalcolati (massimo per ricalcolo) | 54 445 / 54 788 (1249) | 335 (10) |
| | RasterTask: numero (ms) | 2079 (2011) / 2155 (3238) | 385 (138) / 385 (78) |
| | Fotogrammi oltre 33 ms | 30 e 46 | 3 e 1 |
| Scorrimento tra pagine | Elementi ricalcolati | 2481 / 2476 | 1366 / 1371 |
| | RasterTask: numero (ms) | 167 (232) / 167 (203) | 125 (99) / 125 (85) |
| | Paint: numero (ms) | 59 (48) / 58 (29) | 280 (90) / 282 (55) |
| | Fotogrammi oltre 33 ms | 2-4 | 2-4 |
| Livelli compositi | Vista / pan / scorrimento | 110 / 95 / 61 | 172 / 152 / 146 |

Rimisura indipendente del secondo revisore, stesse condizioni: pan, elementi ricalcolati da circa 19 400 a 335, RasterTask da 9,97-24,7 s a 0,11-0,15 s, fotogrammi oltre 33 ms da 37-79 a 1-2; apertura e chiusura, RasterTask da 1187-1434 ms a 176-209 ms, **ma** fotogrammi oltre 33 ms da 4-5 a 5-6, oltre 50 ms da 2 a 2-3, il più lungo da 200-317 a 300-383 ms e `UpdateLayoutTree` da 302-327 a 306-462 ms. Per i fotogrammi dell'apertura e della chiusura il guadagno non si vede sul PC.

**1024×472, DPR 1,875** (prima serie dell'implementazione; il guadagno a questa finestra è stato confermato dalla rimisura del primo revisore, pan da 38 371 a 390 elementi ricalcolati e RasterTask da 1689 a 316):
- apertura e chiusura, pagina predefinita: RasterTask da 1270-1293 (735-778 ms) a 389-399 (96-97 ms); ricalcoli da 6281-6325 a 4655-4664;
- apertura e chiusura, pagina con circa 10 widget: RasterTask da 1397-1401 (640-651 ms) a 433-434 (181-204 ms); livelli da 153 a 114;
- pan: ricalcoli da 37 945-38 108 a 390 (massimo 6 per ricalcolo), `UpdateLayoutTree` da 1082-1236 ms a 14-20 ms, fotogrammi oltre 33 ms da 23-24 su circa 180 a 1 su 137;
- scorrimento: ricalcoli da 2433-2435 a 895, RasterTask da 116 (119-146 ms) a 55 (55-58 ms), livelli da 60 a 92;
- entrata in modifica, pagina predefinita e pesante: ricalcoli da 5788-5817 e 7468-7524 a 1506-1509 e 1905-1923; transizioni di `box-shadow` sui controlli da 12 a 0 (nella rimisura del revisore da 4 a 0); animazioni di oscillazione da 19 a 6 (3 sulla pagina pesante), cioè solo nella pagina corrente;
- modifica a riposo: ricalcoli da 5460-5544 a 748-752, `UpdateLayoutTree` da 243-251 ms a 54-56 ms;
- livelli nella pagina pesante dopo i `will-change` annidati tolti in Kit 2: vista da 169 a 114, pressione da 173 a 120, entrata in modifica da 144 a 86;
- **pressione prolungata (sollevamento del widget): nessun guadagno.** Fotogrammi oltre 33 ms da 12-15 a 10-13 su circa 250: domina un compito di circa 300 ms di JavaScript e React al sollevamento (L2).

### Misure sul tablet delle demo (TB336ZU), 0.8 → 0.9

Lenovo Idea Tab TB336ZU, Chrome 154, 1280×665 DPR 2, 90 Hz, app collegata a HA, con gli script nello scratchpad. Intervalli di `requestAnimationFrame`. File: `fps-ab.txt` (0.8, diagnosi) e `fps-09.txt` (0.9).

| Scenario | 0.8: fotogrammi al secondo; più lungo | 0.9: fotogrammi al secondo; più lungo |
|---|---|---|
| Scorrimento tra pagine | 68-79; fino a 267 ms | 86-89; 33-67 ms |
| Apertura della vista pagine | 38; 356 ms | 80-81; 133-156 ms |
| Chiusura della vista pagine | 54; 467 ms | 75-76; 122-144 ms |
| Quiete ed entrata in modifica | 88-90 | 88-90 (invariati) |

Tracce CDP (`trace-09-*.json`), blocco massimo del processo GPU:

| Scenario | 0.8 | 0.9 |
|---|---|---|
| Apertura della vista | 157-170 ms | 18 ms |
| Chiusura della vista | 230-236 ms | 80 ms |
| Scorrimento | 47-250 ms | 11 ms |

Restano blocchi del thread principale nella vista pagine: commit di React 77 ms al clic, layout forzato 41,6 ms, ricalcolo di stile 34 ms. È il perimetro di L2.

### Blocco L2 (0.9.1): controlli e prove

Comandi in `progetto/acasystem/frontend`, 2026-10-13, sul working tree dopo il giro 2. Tutte le prove nel browser sono sul PC (headless, raster software); **nessuna misura sul tablet** (a cura dell'agente principale).

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici | Superato | `npm run typecheck` 0 errori, `npm run lint` 0, `npm run lint:typography` 0 violazioni (429 file), `npm run lint:theme-colors` 0 (303 file), `npx prettier --check` sui file toccati. `npm run i18n:check`: exit 0, 4 test. `npm run format:check` completo: exit 1 solo per `eslint.config.js` e `public/sw.js`, preesistenti e non toccati. |
| Test mirati | Superato | `PagerOverview` 27 test, `LauncherScreen` (render dei widget, `-t 'redraws no widget'`) 3, `PageDescriptor` con `LagRenders` (copertina accesa e spenta) 16, `LagLayers` verde. Prova di mutazione: con il vecchio `Pager`, `LauncherScreen`, `LauncherUiContext` e `useLauncherController`, e con il filtro di `footerBand` disattivato, i test nuovi falliscono; i test dei giri 1 e 2 falliscono senza la rispettiva correzione. |
| Suite frontend completa | Superato | `npx vitest run --maxWorkers=4` dopo l'ultima modifica: 143 file, 1727 test passati, 650 s, exit 0 (output nello scratchpad, non versionato). Esecuzioni precedenti: 1720 test (1144 s) e un lancio con un fallimento non identificato (probabile timeout da carico; non ripetuto, causa non dimostrata). |
| Build | Superato | `npm run build`: exit 0, solo l'avviso preesistente sui chunk oltre 500 kB; `node scripts/check-bundle-size.mjs` exit 0 (`index` 729,4 KB su limite 900 KB). Con `ACASYSTEM_VERSION=0.9.1` la stringa «0.9.1» è nel bundle `dist/assets/index-rqrtF8mx.js`. L'immagine 0.9.1 non è ancora costruita. |
| Misure sul PC | Eseguito, perimetro limitato | Render, layout e stile forzati prima/dopo: tabella in «Blocco L2 (0.9.1)». I millisecondi sono rumorosi con raster software e PC carico; il raster software non riproduce la GPU Mali. |
| Aspetto sul PC | Parziale | 19 su 22 screenshot identici a 1024×472 e 18 su 22 a 1280×665, con le differenze spiegate dall'orologio, dalla fase di transizione e dal riflusso. Console senza errori né avvisi in tutte le pagine provate. |
| Percorsi di navigazione | Superato | Apertura e chiusura della vista per 3 cicli, pan, tocco sulla scheda laterale, riordino con Alt+freccia, nuova pagina, rinomina, trascinamento tra pagine con grandezza visiva (REP-001), indicatore, ridimensionamento della finestra: stati uguali alla base. Limite: la scrollata a tocco via CDP senza GPU è lenta, l'allineamento `scrollLeft = indice × larghezza` è verificato a riposo. |
| Riga «Versione» di Sistema nell'anteprima | Limite | L'anteprima di sviluppo mostra 0.1.0 (la versione viene da `ACASYSTEM_VERSION`, assente nell'ambiente di Vite, con ripiego sul `package.json`): comportamento di REP-20261012-004, non una regressione. 0.9.1 va controllata sull'immagine del banco. |
| Banco 0.9.1, misura sul tablet delle demo e sul Tab M11, memoria GPU, TalkBack | Non eseguito | A cura dell'agente principale. Il criterio dei 40 ms del processo GPU in chiusura e quello dei fotogrammi oltre 50 ms restano da valutare con lo stesso script (`measure.cjs`, `trace.cjs`). |

### Tab M11 (2026-10-14)

Misure dell'agente principale via USB (adb + CDP, `measure.cjs`, `measure-ov.cjs`, `trace.cjs`; copie in `backup/strumenti-tablet/`). Tablet con l'app in primo piano e lo schermo acceso; ogni scenario ripetuto due volte (la vista pagine tre).

- **Dispositivo:** Tab M11 TB330FU, Android 15, 4 GB (circa 150 MB liberi con Chrome aperto), SoC mt8786, GPU Mali-G52 MC2, schermo a 90 Hz; Chrome 155, DPR 1,5.
- **Viewport in Chrome:** 1280×665 in orizzontale, la stessa area del tablet delle demo; 800×1145 in verticale. Banco su `http://localhost:3002` via `adb reverse`; accesso fatto dall'utente.
- **Tablet delle demo (TB336ZU) con la 0.9.2, la stessa mattina:** scorrimento 86-88 fps, entrata e uscita dalla modifica 88-90, apertura della vista 79-82 (fotogramma più lungo 144-156 ms), chiusura 81-85 (fotogramma più lungo 67-111 ms). Rispetto alla 0.9 cambia solo la chiusura (75-76 → 81-85): è la prima misura di L2 sul dispositivo.

| Scenario | M11, 0.9.2 | M11, 0.9.3 |
|---|---|---|
| Quiete | 90 fps | 89-90 fps |
| Scorrimento tra le pagine | 82-88 fps, massimo 44-78 ms | 82-87 fps, massimo 44-89 ms |
| Entrata in modifica | 88 fps | 88 fps |
| Apertura della vista pagine | 70-78 fps, massimo 189-311 ms | 67-77 fps, massimo 211-367 ms |
| Chiusura della vista pagine | 66-70 fps, massimo 156-200 ms | 66-77 fps, massimo 167-200 ms |
| Uscita dalla modifica | 90 fps | 90 fps |

**Traccia dell'apertura (0.9.2, `trace-m11-open.json`).**
- **Thread principale:** un fotogramma di 98 ms. Dentro ci sono il ricalcolo di stile di 481 elementi (58 ms), il layout (9 ms) e il JS di React (21 ms più 10 ms di rAF).
- **GPU:** per circa 300 ms non si disegna nulla. Il thread della GPU (`CrGpuMain`) è occupato da 62 raster: `DoEndRasterCHROMIUM::Flush` 135 ms e `OnCreateSharedImage` 94 ms.

**Prove A/B solo sul tablet (CSS iniettato, nessuna modifica al codice), massimo intervallo tra fotogrammi:**

| Variante | Apertura | Chiusura |
|---|---|---|
| Base | 189-311 ms | 156-189 ms |
| Senza le ombre della scheda (`::before`/`::after`) | 178-222 ms | 167-178 ms |
| Senza `will-change` su celle e widget nella vista | peggio: 43-46 fps, 200-311 ms | 200-244 ms |
| Senza angoli arrotondati / con `overflow-x: auto` | come la base | come la base |
| Senza le ombre dentro le pagine (132 elementi) | 89-134 ms | 89-133 ms |
| Senza alcuna ombra | 78-122 ms | 67-100 ms |

**Valutazione.** Lo scatto residuo sul M11 è il raster GPU delle ombre del Kit 2 dentro le pagine, quando la loro scala cambia.
- Sono 132 elementi: le 40 celle «+» vuote di Principale (8×5, tre strati con ombra ciascuna: `aca-m`, `aca-m__outer`, `aca-m__face`) e i widget della copertina.
- I livelli di L1 servono ancora: senza, va peggio.
- Proposta non applicata: [ISSUE-062](../project-status.md#issue-062).

**Memoria GPU:** non misurata.

### Criteri di completamento

| Criterio | Esito | Evidenza / limite |
|---|---|---|
| Blocchi del processo GPU oltre 40 ms assenti in scorrimento e vista pagine | Parziale | Scorrimento 11 ms e apertura 18 ms: rispettato. Chiusura 80 ms: **non rispettato**. Nella diagnosi la chiusura con il solo CSS iniettato dava 35 ms; la differenza non è stata indagata. |
| Al più 1 fotogramma oltre 50 ms per animazione | Non dimostrato | Il fotogramma più lungo è 33-67 ms nello scorrimento e 133-156 ms (apertura) e 122-144 ms (chiusura) nella vista pagine; il numero di fotogrammi oltre 50 ms non è nel riepilogo. I blocchi rimasti nella vista sono del thread principale (commit di React, layout forzato, ricalcolo di stile): perimetro di L2. |
| Aspetto identico, screenshot prima e dopo | Parziale | PC: forme, colori e geometrie coincidono, con le differenze sub-pixel della sezione seguente. Tablet: screenshot CDP prima e dopo **non eseguiti**. |
| Suite, typecheck, lint, tipografia e colori verdi | Superato | Vedi «Controlli di codice». |
| Banco 0.9 | Superato | Immagine `aca-system:0.9` in esecuzione; dettagli in [infrastructure.md](../infrastructure.md). |
| Misura sul Tab M11 | Eseguito il 2026-10-14 (annotazione) | Al 2026-10-12 era misurato solo il tablet delle demo (TB336ZU, 8 GB). Il 2026-10-14 è stato misurato il Tab M11 (TB330FU, 4 GB) sulla 0.9.2 e sulla 0.9.3: vedi [Tab M11 (2026-10-14)](#tab-m11-2026-10-14). Memoria GPU non misurata. |

### Aspetto: differenze rilevate

Rilievi dei due giri di revisione, in headless con raster software. Non va scritto «pixel identici».
- **A riposo, 1280×665 DPR 2:** 21 230 pixel con differenza oltre 8 (massimo 189) tra base e dopo. Parte del testo dentro i widget scende di 1 px CSS (spostamento migliore dx = 0, dy = +2 px del dispositivo): descrizione di «Benvenuto», «21.5 °C», «Consumo casa 1.2 kW», manopole degli switch.
- **A riposo, 1024×472 DPR 1,875:** 22 766 pixel con differenza oltre 8 (massimo 190); 7432 nella barra alta, 15 334 al centro, 0 in basso. Le geometrie del DOM dei widget sono uguali al millesimo.
- **Causa isolata:** con `will-change: auto` forzato su widget e celle l'immagine coincide con la base (massimo 1 su 2560×1330); il bordo destro di un widget, circa 1 px CSS più a destra, torna uguale. È l'aggancio e l'antialiasing del livello promosso, non uno spostamento del layout.
- **Barre:** la faccia di «Fine» è più stretta di 1-2 px del dispositivo nella barra di modifica e in quella della vista; a 1024×472 il testo della barra di stato è ricampionato. Con il Metallo, nella vista pagine, sparisce una sottile riga chiara sotto la linea di contatto dei widget.
- **Transizioni:** i fotogrammi a metà corsa differiscono solo per il raster del testo (il livello è scalato dal compositore e non rasterizzato di nuovo). L'ombra della scheda ha da subito la forma finale e cresce solo in trasparenza: non è geometricamente identica all'interpolazione di `box-shadow` da zero.
- **Scheda della vista:** non è più ruotata di 0,25° (l'oscillazione non gira più nella vista).
- **Alla chiusura:** il raggio parte da 0 invece di scendere con la scala. Valutazione dell'implementatore: lo scatto iniziale è mascherato dal movimento veloce all'inizio della curva. Non misurato nel browser per il carico del PC e non guardato a vista.

## Limiti e punti aperti

- **Screenshot sul tablet prima e dopo: non eseguiti.** Le differenze di pixel sopra sono state misurate solo in headless con raster software; con la GPU del tablet l'entità attesa è sotto 1 px CSS al bordo, da confermare.
- **Memoria GPU.** I livelli aumentano (scorrimento 61 → 146 a 1280×665; vista 110 → 172). Da controllare sul Tab M11 da 4 GB.
- **Chiusura della vista: 80 ms di blocco della GPU**, oltre i 40 ms del criterio. Causa non indagata.
- **Uscita dalla modifica** con ancora le transizioni di ombra sui controlli dei widget (4 transizioni residue dopo «Fine»). Proposta, [ISSUE-044](../project-status.md#issue-044).
- **Il guadagno di L1 su PC è su raster e ricalcoli.** Non va attribuita a L1 la riduzione dei fotogrammi lunghi di apertura e chiusura della vista.
- **Raggio alla chiusura** e rimozione dell'oscillazione sulle schede: effetti visibili da guardare sul tablet con uno sfondo dietro le pagine.
- **L2: nessuna misura sul tablet.** I numeri di L2 sono sul PC con raster software (render, layout e stile forzati). Il guadagno sul TB336ZU e sul Tab M11 (commit di React 77 ms, layout forzato 41,6 ms, stile 34 ms all'apertura) è da misurare sul banco 0.9.1; l'immagine non è ancora costruita.
- **L2: barre e sheet ancora ridisegnati a ogni commit.** `StatusBar`, i quattro sheet chiusi, `PageOverviewBar`, `EditToolbar` e `WidgetActionBar` non sono memoizzati (circa metà dei render rimasti) e `LauncherScreen` ridisegna 4 volte per clic nella chiusura sulla scheda. Servono `useCallback` e `memo` in `LauncherScreen`, `LauncherPage` e `PreviewApp`. Non applicato: fuori dal diff minimo, benefici non misurati sul tablet. Proposta, [ISSUE-047](../project-status.md#issue-047).
- **L2: chiusura con «Fine»** ridisegna ancora tutti i widget (la modifica finisce): 647 render, compito più lungo circa 129 ms nella build di sviluppo sul PC. Build di produzione e tablet non misurati.
- **L2: rimisura della fascia del piè di pagina** (tre densità, circa 17 ms nella chiusura che riporta la barra di modifica). Una cache per chiave cambierebbe la semantica di `BandMemory` e potrebbe cambiare la densità scelta. Proposta, [ISSUE-047](../project-status.md#issue-047).
- **L2: ricalcolo di circa 3500 elementi** al cambio di classe del pager (`is-overview` / `is-closing`) resta, per scelta del CSS.
- **L2: banco 0.9.1** *(annotazione del 2026-10-13, agente principale)*: banco `aca-system:0.9.1` dal 2026-10-13 alle 00:17 (`sha256:81217e57757a16d9afaedbdd758c0ea40dc2387af101a87faa0d12df2683b3e1`, creata 2026-10-12T22:16:51Z), `healthy`; `/api/health` risponde `{"status":"ok","version":"0.9.1"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.17`; bundle `index-rqrtF8mx.js`; copia a freddo `backup/banco/tunet-data-20261013-pre-0.9.1-freddo.tgz` (134 283 byte, SHA-256 `9a98cbf40c5a33c82eccb4d3f56edccee736bd10358e78b364d25ba7d3309c20`); ripristino `ACASYSTEM_VERSION=0.9` in `progetto/.env`. La riga «Versione» di Sistema a schermo e la misura sul tablet sono ancora da fare.
- **Conflitto preesistente Kit 2 / `launcher.css`** sullo `scale` della cornice del widget, emerso nel giro 1. Proposta, [ISSUE-046](../project-status.md#issue-046).

## Chiusura e punto di ripresa

**Stato:** L1 e L2 sul banco `aca-system:0.9.1` dal 2026-10-13 alle 00:17. Manca la misura di L2 sul tablet: il Galaxy Tab S8 era bloccato, e il Lenovo è previsto per il 2026-10-14.

*Annotazione del 2026-10-14 (agente principale):* L2 è stato misurato sul tablet delle demo e sul Tab M11. Il banco è `aca-system:0.9.3`.
- **Sul M11** lo scorrimento e la modifica sono fluidi (82-90 fps).
- **Resta uno scatto di 190-370 ms** all'apertura e alla chiusura della vista pagine. È il raster GPU delle ombre dentro le pagine.
- Dettagli in [Tab M11 (2026-10-14)](#tab-m11-2026-10-14); proposta [ISSUE-062](../project-status.md#issue-062), da decidere con l'utente.

**Risultato di L2 sul PC (headless, raster software):** aprendo la vista pagine i render passano da 1023 a 291 (1230 → 291 a 1280×665), senza ridisegno di griglie e widget, e i layout forzati da 1 a 0; il cambio di pagina da 1294 a 305 render e da 8 layout e 13 stili forzati a nessuno; la chiusura con «Fine» porta lo stile forzato da 65,2 a 0,9 ms. Controlli statici e suite (143 file, 1727 test) verdi, build riuscita. **Non** misurato sul tablet: il criterio dei 40 ms di blocco GPU in chiusura e quello dei fotogrammi oltre 50 ms restano da valutare.

**Risultato sul tablet delle demo (0.8 → 0.9):** scorrimento 68-79 → 86-89 fps, apertura della vista 38 → 80-81 fps, chiusura 54 → 75-76 fps; blocco massimo della GPU in apertura 157-170 → 18 ms, scorrimento 47-250 → 11 ms, chiusura 230-236 → 80 ms. Il criterio dei 40 ms non è rispettato in chiusura; il fotogramma più lungo resta 122-156 ms nell'apertura e nella chiusura della vista, con i blocchi del thread principale che L2 deve affrontare.

**Prossimi passi:**
1. **Prova dell'utente sul tablet** sul banco 0.9 (`http://192.168.1.7:3002`).
2. **Banco 0.9.1 e misura di L2 sul tablet** (agente principale): costruire l'immagine con la versione 0.9.1, verificare la riga «Versione» di Sistema; commit di React di 77 ms al clic, layout forzato di 41,6 ms, ricalcolo di stile di 34 ms nella vista pagine; nuova misura con lo stesso script.
3. **Misura sul Tab M11 da 4 GB**, con memoria GPU e screenshot prima e dopo.
4. **Proposte da autorizzare**, non applicate: [ISSUE-040](../project-status.md#issue-040) (aggiornamento per entità di HA), [ISSUE-041](../project-status.md#issue-041) (solo le pagine vicine montate), [ISSUE-042](../project-status.md#issue-042) (storico dello sparkline), [ISSUE-043](../project-status.md#issue-043) (formattatori Intl), [ISSUE-044](../project-status.md#issue-044) (uscita dalla modifica), [ISSUE-045](../project-status.md#issue-045) (annuncio della grandezza, di REP-20261012-001) e [ISSUE-046](../project-status.md#issue-046) (Kit 2 e cornice).
