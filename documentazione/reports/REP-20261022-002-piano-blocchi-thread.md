# REP-20261022-002 — Piano per ISSUE-109: blocchi del thread principale nei cambi di stato

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261022-002. Piano per [ISSUE-109](../project-status.md#issue-109). |
| Stato | **Completato come piano (proposto), rivisto dopo la critica del 2026-10-22. In attesa di input:** servono l'autorizzazione della realizzazione e le risposte alle domande D-1…D-6. **Aggiornamento 2026-10-22, più tardi:** l'utente ha risposto a D-1…D-6 e ha autorizzato «Tutto il blocco» (vedi «Risposte dell'utente (2026-10-22)»). T0a completata il 2026-10-23 (vedi «Annotazione T0a»). Le tappe seguenti partono nell'ordine indicato da quella sezione. Nessun commit. **Aggiornamento 2026-10-23, fine del blocco di codice:** realizzate R1, R3, R2, R8, R10, R7 e R5a, provata e tolta R2b (resta il livello 1), T0b e M1/M2 eseguite in sola misura (M2 solo in parte); correzione dei rilievi della revisione registrata in «Annotazione del 2026-10-23 (correzione dei rilievi della revisione)». Restano Z e la risposta dell'utente su R5a. Nessun commit. **Aggiornamento 2026-10-23, chiusura del blocco:** eseguita anche la tappa Z (banco 0.9.27 con copia a freddo, controllo sul tablet con gesti sintetici). Esito, numeri e punto di ripresa in «Esito del blocco (2026-10-22)» in fondo. **ISSUE-109 resta aperto:** O3 raggiunto, O1 e O4 no, O5 (scorrimento) peggiore della base; decide l'utente. Nessun commit. |
| Data | 2026-10-22 (Europe/Rome). |
| Autore / modello | Claude Code, come subagente di un flusso di lavoro. Modello: claude-opus-5-5. Le tre letture del codice e la misura del 2026-10-22 sono state fatte da altri agenti dello stesso flusso, e il loro modello non è registrato. |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` (master), con 453 voci non committate nel working tree. |
| Richiesta di riferimento | Il 2026-10-22 l'utente ha risposto «procedi» alla proposta di partire dal blocco principale (ISSUE-109) con un piano fatto bene e con una misura che separi le pagine fuori schermo dalla pagina visibile. Ha chiesto piani fatti bene e una realizzazione affidata a modelli leggeri. |
| Autorizzazione | Sono autorizzati **solo** il piano e la misura in sola lettura che lo prepara. La misura è già stata eseguita, vedi «Fonti». Non sono autorizzati la realizzazione, i commit, le dipendenze nuove, il deploy e le modifiche al codice dell'app. Questo report non autorizza nessuna tappa. |

## Obiettivo e perimetro

**Risultato richiesto:** un piano che porti le transizioni di modifica e della vista pagine sul Tab M11 a essere fluide come previsto da `design.md`, senza cambiare aspetto, durate, curve o gesti già decisi. Il piano deve essere diviso in tappe piccole e indipendenti, eseguibili da un modello leggero, e ogni tappa deve avere un criterio misurabile sul tablet.

**Dentro il perimetro:** solo [ISSUE-109](../project-status.md#issue-109), cioè i blocchi del thread principale ai cambi di stato:

- pressione lunga che apre la vista pagine;
- «Fine»;
- tocco su una scheda della vista pagine;
- sollevamento, rilascio e ridimensionamento di un widget;
- «Annulla»;
- apertura e chiusura dei fogli;
- ritorno da Sistema.

**Citati solo come dipendenze:**

| Issue | Dipendenza |
|---|---|
| [ISSUE-110](../project-status.md#issue-110), ritorno da Sistema a pezzi | Stessa causa, `hidden` su LauncherPage. La sua correzione visiva resta separata. |
| [ISSUE-111](../project-status.md#issue-111), frecce | Ordine di sovrapposizione delle schede. Nessuna tappa qui. |
| [ISSUE-112](../project-status.md#issue-112), fogli | Il costo di `showModal()` si riduce con la tappa R2. Il cambio del meccanismo del foglio resta suo. |
| [ISSUE-113](../project-status.md#issue-113), dettagli | Il ritorno dei «+» è legato alla domanda D-1. |
| [ISSUE-062](../project-status.md#issue-062) e [ISSUE-107](../project-status.md#issue-107) | Sono precedenti dello stesso problema e restano aperti fino alla misura finale. |

ISSUE-108, la guardia della pressione lunga, è un incarico distinto e non va mescolato.

**Vincoli che il piano rispetta:**

- [ADR-0004](../decisions/ADR-0004-principi-frontend.md): primitive e composizione, senza refactor autonomi.
- [ADR-0005](../decisions/ADR-0005-typescript-italiano-icone.md): TypeScript strict.
- [ADR-0011](../decisions/ADR-0011-kit2-base-grafica.md): aspetto Kit 2 invariato, quindi né ombre né transizioni toccate senza decisione.
- [ADR-0012](../decisions/ADR-0012-pageshell.md): PageShell resta un contenitore senza geometria.
- [ADR-0016](../decisions/ADR-0016-schermo-intero-interazioni.md): gesti, scala solo nel sollevamento in modifica.
- Movimento ridotto (`design.md`).
- Le correzioni N1-N5 della 0.9.11 non vanno rimesse in discussione.

**Modifiche preesistenti:** `git status` riporta 453 voci, cioè il lavoro dalla 0.9.x in poi, non committato. Questo incarico aggiunge due file: questo report e la bozza [ADR-0018](../decisions/ADR-0018-pagine-fuori-vista.md). Aggiunge inoltre una riga negli indici `reports/README.md` e `decisions/README.md` e una nota in `project-status.md`. Non tocca nient'altro.

## Criteri di completamento (di questo incarico)

- Piano scritto con:
  - diagnosi basata sui dati, con osservazioni, valutazioni e ipotesi distinte;
  - obiettivi misurabili;
  - opzioni con pro e contro e una raccomandazione;
  - tappe con file, test di guardia, misura, criterio «Fatto quando», rischio e ritorno indietro;
  - ordine delle tappe e modelli da usare;
  - domande separate per ogni comportamento visibile;
  - elenco di ciò che resta fuori.
- Bozza di ADR in stato «Proposta» per la scelta architetturale (pagine fuori vista).
- Indici e `project-status.md` aggiornati. Lo stato di ISSUE-109 dice: piano proposto, realizzazione non autorizzata.
- Nessun commit e nessuna modifica al codice dell'app.

## Fonti

- **Collaudo:** [REP-20261022-001](REP-20261022-001-collaudo-animazioni.md), con i dati in `backup/animazioni-0.9.25/`. Copre gli scenari S1-S8 sul Tab M11 con banco 0.9.25.
- **Misura profilata del 2026-10-22:** `backup/piano-issue-109/misura/RIEPILOGO.md`. È stata fatta per questo piano, in sola lettura, sul Tab M11 con il banco `aca-system:0.9.26`.
  - Scenari T1-T5, tre modi di misura (b = solo osservatore dei task lunghi, t = traccia, tp = traccia e profiler), 3 ripetizioni.
  - Una versione leggibile servita sulla porta 3013 con i dati dei fixture.
  - Prove A/B con CSS iniettato.
  - Strumenti in `backup/piano-issue-109/misura/strumenti/`. Tracce e tabelle nella stessa cartella.
- **Tre letture del codice in sola lettura, fatte da subagenti lo stesso giorno:**
  - React e contesti;
  - CSS e invalidazioni;
  - vincoli, storia e test di guardia.

  Non hanno un file proprio: quello che serve è riportato sotto, con i riferimenti alle righe del working tree.
- **Precedenti:**
  - [REP-20261012-003](REP-20261012-003-lag-tablet-prestazioni.md): ombre e raster GPU.
  - [REP-20261019-001](REP-20261019-001-prova-tablet-0910.md): A/B sulle celle.
  - [REP-20261019-002](REP-20261019-002-correzioni-issue062-075-077.md): N1-N5.
- **Strumenti:**
  - `backup/strumenti-tablet/`: LEGGIMI.md, `measure.cjs`, `measure-ov.cjs`, `trace.cjs`, `analyze.cjs`.
  - `backup/animazioni-0.9.25/strumenti/`: `run.cjs`, `scen.cjs`, `aggregate.cjs`.
  - `backup/piano-issue-109/misura/strumenti/`: `tp-run.cjs`, `ab-report.cjs`, `micro.cjs`, `inv-analyze.cjs`, `dom-count.cjs`, `frames.cjs`.

## Diagnosi

### Osservazioni misurate

Misure del 2026-10-22 sul Tab M11, banco 0.9.26, gesti sintetici. Le durate «b» sono senza strumenti. Le tracce «tp» sono più lunghe del 15-50 % e servono solo per le proporzioni.

| Cambio di stato | Blocco più lungo | Di cui stile | Elementi ricalcolati | Innesco |
|---|---|---|---|---|
| Pressione lunga → vista pagine (primo fotogramma) | 286 ms (b 233) | 141 ms | 2025 | fotogramma; prima, 69 ms di render React di tutte le pagine |
| «Fine», tocco | 305 ms (b 264) | 191 ms in 3 ricalcoli | 2491 | click; `focus()` 18 ms |
| «Fine», fine della chiusura («settling») | 268 ms (b 216) | 212 ms | 2376 | solo `inert` sui 10 corpi e sui livelli delle celle (Pager) |
| Tocco su una scheda → modifica | 446 ms | 326 ms (223 forzati), 6 ricalcoli | 5041 | `removeChild` 114 ms, `focus()` 13 ms |
| Sollevamento di un widget | 478 ms (b 337-383) | 402 ms, tutti forzati | 2546 | `DragGhost.tsx:31`, `getComputedStyle` 368 ms |
| Rilascio | 518 ms (b ~360) | 357 ms | 2513 | fotogramma dopo `pointerup` |
| «Annulla» | 361 ms (b 271-283) | 244 ms | 2497 | click |
| Foglio «Collega», apertura / chiusura | 296 / 296 ms | 241 / 237 ms forzati | 2943 / 2914 | `dialog.showModal()` 199 ms / `close()` 197 ms (`Sheet.tsx:58`, `:81`) |
| Ritorno da Sistema | 6 blocchi, 1475 ms in tutto | fino a 291 ms per blocco | 2162 + 4711 + 2204 | `focus()` in `AppRoutes.tsx:91` 303 ms, layout forzato di 2475 oggetti, `measureCards` 64 ms, ResizeObserver 63 ms |

- **Dove va il tempo:**
  - Il documento ha circa 2970 nodi, con 10 pagine sempre montate.
  - Ogni cambio di stato ricalcola lo stile del 68-95 % del documento, a 70-85 µs per elemento.
  - Lo script (React) costa 40-95 ms per cambio di stato. Nessun componente supera circa 6 ms.
  - Il layout pesa solo all'apertura della vista pagine (80 ms) e al ritorno da Sistema (141 ms).
  - Il raster GPU non blocca il thread: ogni singolo flush resta entro 15 ms.
- **Le pagine non correnti pesano di più:** contengono circa 1800 dei 2966 nodi.
- **Prove A/B con CSS iniettato.** La tabella riporta la somma dei blocchi rispetto alla base. T1 = vista pagine e «Fine»; T3 = sollevamento, rilascio e «Annulla».

  | Variante | T1 | T3 | Elementi ricalcolati |
  |---|---|---|---|
  | `content-visibility:hidden` sul contenuto di **tutte** le pagine non correnti (a1) | 0,41 | 0,39 | da 2025 a 509 |
  | Lo stesso solo sulle pagine a distanza > 1 (a2) | 0,66 | 0,65 | 1098 |
  | `display:none` (a3) | 0,35 | 0,32 | 509 |
  | Transizioni spente (b) | 0,82 | 0,51 | invariati |
  | Ombre spente (c) | 0,74 | 0,87 | invariati |
  | a1 + b + c | 0,41 | 0,25 | 510 |

  Con a1, nella vista pagine le schede vicine risultano vuote: è un limite superiore e non è stato verificato a vista. **Nessuna variante porta tutti i blocchi sotto i 100 ms.** Il migliore è a1 + b + c, con blocchi da 91 a 140 ms.
- **Microprove**, cioè una sola mutazione seguita da un ricalcolo forzato:

  | Mutazione | Costo |
  |---|---|
  | Proprietà personalizzata su `<html>` | 226 ms (in uso) / 304 ms (in modifica) |
  | `showModal()` di un `<dialog>` vuoto | 243 / 338 ms |
  | Classe `is-overview` | 79 / 97 ms |
  | `is-editing` su tutti i widget | 18 / 22 ms |
  | `inert` sui 10 corpi | 10,6 ms |
  | Invalidazione `:has()` isolata | 0,4 ms |
- **Fotogrammi all'apertura della vista pagine:** 52 disegni del compositore in 1545 ms, contro circa 140 attesi a 90 Hz. Anche senza blocchi, ogni fotogramma di animazione costa 5-18 ms di PrePaint e Paint, e il budget a 90 Hz è 11 ms.
- **Collaudo del 2026-10-22 ([REP-20261022-001](REP-20261022-001-collaudo-animazioni.md)):**
  - le transizioni ottengono 3-6 fotogrammi su 25-50;
  - nella chiusura della vista pagine le transizioni sono cancellate (`transitioncancel`);
  - i blocchi restano anche con movimento ridotto (S8: picchi di 245-300 ms);
  - lo scorrimento tra pagine (72-83 fps) e i fogli (240 ms) sono fluidi e non vanno peggiorati.

### Valutazioni (dal codice, coerenti con le misure)

1. **Il ricalcolo dello stile delle pagine fuori vista è la causa principale.** Le pagine non visibili restano nel DOM con stile e livelli. Ogni cambio di classe o di attributo in alto nell'albero (`is-editing`, `inert`, classi del pager, `is-dragging` su ogni griglia), e `showModal()` che rende inerte il documento, ricalcola anche loro. Il browser non sa che sono fuori vista, perché nessuna regola glielo dice.
2. **I ricalcoli forzati spostano il costo; lo moltiplicano solo quando letture e nuove scritture si alternano.** Una lettura dello stile o del layout tra due mutazioni rende il ricalcolo sincrono:
   - `getComputedStyle` in `DragGhost.tsx:31`;
   - `focus()` in `LauncherScreen.tsx:914` (rAF di `finishEditing`), `:1366` (`openFromOverview`) e `AppRoutes.tsx:91`;
   - `getBoundingClientRect` in `getRemoveBounds` (`LauncherScreen.tsx:509`);
   - `measureCards` (`Pager.tsx:99`).

   Nel sollevamento però i 4 ricalcoli forzati toccano 2546 elementi **in tutto**, cioè circa un solo documento: senza `getComputedStyle` lo stesso ricalcolo avverrebbe al fotogramma successivo. Il raddoppio vero è misurato **solo in T2** (tocco su una scheda → modifica: 5041 elementi in 6 ricalcoli, `removeChild` 114 ms più `focus()`), dove il documento viene ricalcolato due volte. Il motivo non è ancora noto (T0a punto 6).
3. **La chiusura a tempo taglia l'animazione.** `Pager.tsx:410-416` fa partire `setTimeout(finishClosing, OVERVIEW_MS + 50)`, cioè 410 ms, dal cambio di stato e non dall'inizio vero della transizione. Se un blocco di 200-300 ms cade nella finestra, il timer scade a transizione appena iniziata e la chiusura salta alla fine.
4. **React rifà tutte le pagine, ma pesa meno dello stile.**
   - `editMode` entra nel controller dei widget, nel runtime e nelle `entries`. `pages = descriptors.map(… <PageShell editMode={editMode} />)` (`LauncherScreen.tsx:1644-1650`) rifà tutte le PageShell.
   - Il contesto `LauncherUiContext` contiene `selected`, `landed`, `rejectedId`, `widgetName` e `hiddenCheck`. Se cambia uno di questi, si rifanno tutte le WidgetGrid e tutti i WidgetHost con i loro widget, che non sono memoizzati. È anche il caso degli aggiornamenti delle entità Home Assistant.
   - Dopo un atterraggio c'è un secondo giro completo a 260 ms (`setLanded(null)`).
   - Costo misurato di React: 40-95 ms per cambio. È il secondo fattore, non il primo.
5. **Il ritorno da Sistema somma due costi.**
   - `hidden` (display:none) sull'intero launcher (`LauncherPage.tsx:159`) costringe a ricalcolare stile e layout di tutto in un colpo.
   - I ResizeObserver delle griglie misurano circa 0 mentre il launcher è nascosto e rimisurano al ritorno: `WidgetGrid.tsx:255-289` e `Pager.tsx:368-380`.

### Ipotesi (non dimostrate)

- **H1.** Non è noto quale mutazione renda «vero», cioè a 70-85 µs per elemento invece di circa 4 µs, il ricalcolo di circa 2000 elementi.
  - Le microprove isolate valgono 10-22 ms ciascuna, mentre il totale reale è di 130-200 ms.
  - Candidati: l'insieme delle mutazioni di React nello stesso passo; selettori non indicizzati `:is()`, che valgono il 54 % del tempo di abbinamento nella misura strumentata; proprietà ereditate che cambiano con `is-editing` (`user-select`, `-webkit-touch-callout`, launcher.css:568-577); `is-dragging` su tutte le griglie con `pointer-events` sulle celle (launcher.css:804-810).
- **H2.** Il peggioramento dell'ingresso in modifica rispetto alla 0.9.22, da ≤ 56 ms a 256-289 ms, viene dalle celle «+» rimontate dal ripristino 0.9.23. È coerente con il conteggio degli elementi, ma non è provato.
- **H3.** Gli aggiornamenti delle entità HA a banco fermo producono rumore di fondo, cioè giri completi di React. Non è stato contato quanti commit al secondo arrivano.
- **H4.** `content-visibility` ha effetti ancora da verificare:
  - è possibile che le schede della vista pagine si vedano vuote per un istante durante il trascinamento;
  - i ResizeObserver dentro un sottoalbero saltato potrebbero non notificare, lasciando misure vecchie dopo una rotazione. Non solo quelli di `WidgetGrid.tsx:255-289` e `Pager.tsx:368-380`: li usano anche alcuni widget, cioè `components/widgets/adaptive/AdaptiveCategoryWidget.tsx` e `components/widgets/home/shared/useMeasuredHeight.ts`, a sua volta usato da widget come `home/calendar/CalendarWidget.tsx` e `home/todo/TodoWidget.tsx`. Allo sblocco notificano e fanno `setState`, con render e layout proprio durante lo swipe o l'atterraggio, e forse un fotogramma con altezze sbagliate;
  - un `getBoundingClientRect` su un sottoalbero saltato potrebbe forzarne il layout, oppure restituire un rettangolo vuoto. Casi noti: «Sposta qui» e il rilascio dal vassoio su una scheda lontana della vista pagine, che leggono la geometria della griglia di destinazione.
- **H5.** Il costo per elemento è alto in modo trasversale, non solo per la mutazione «colpevole» di H1.
  - Una proprietà personalizzata su `<html>` costa 226 ms; `showModal()` di un `<dialog>` vuoto 243 ms.
  - 63 selettori su 692 sono provati su quasi ogni elemento e valgono il 54 % del tempo di abbinamento (38 con `:is()`).
  - Le proprietà personalizzate ereditate (token Kit 2 e Metallo) potrebbero gonfiare il costo di ogni elemento.
  - Se è così, ridurre il costo per elemento varrebbe per tutti gli scenari, compresi fogli e Sistema, dove R2 non è stata misurata.
- **H6.** Il blocco di «settling» dopo «Fine» (216 ms in b, 2376 elementi) è innescato da `inert` sui corpi e sugli strati delle celle, ma la microprova di `inert` sui 10 corpi vale 10,6 ms. La differenza non è spiegata. Candidati: il passaggio da `is-settling` a nessuna classe sul pager, `will-change: opacity` delle celle che torna (launcher.css:755), la ricomparsa delle celle con il loro raster.

## Obiettivi misurabili sul Tab M11

Misure con gli strumenti esistenti:

- `tp-run.cjs`: modo b per le durate, modo t per gli elementi;
- `run.cjs` e `measure-ov.cjs`: passata light, solo rAF, per gli fps;
- schermo acceso.

**Regola statistica (vale per T0, R1-R5, R9 e Z).** Con 3 giri i criteri non si distinguono dal rumore: la base di T1 ha sd 33 ms sull'apertura e un primo giro anomalo (231 contro 152 e 181 ms), «Annulla» ha sd 59 ms su 227. Quindi:

- almeno **5 giri alternati** base/variante nella stessa sessione;
- il primo giro di ciascuna è di riscaldamento: si registra a parte e non entra nel confronto;
- si riporta la **mediana con l'intervallo min-max**;
- un guadagno si accetta solo se gli intervalli min-max di base e variante **non si sovrappongono**. Se si sovrappongono, il risultato è «non distinguibile», non un successo.

| ID | Obiettivo | Come si misura | Oggi (0.9.26) |
|---|---|---|---|
| O1 | Nessun task del thread principale oltre **100 ms** nei cambi di stato di S1, S3 e S5, **e in T2** (tocco su una scheda → modifica). S1 è la vista pagine con «Fine»; S3 sono sollevamento, rilascio, ridimensionamento (S3b) e «Annulla»; S5 sono i fogli e il ritorno da Sistema. | Modo b, blocco massimo per gesto, mediana e min-max | 216-383 ms; T2 446 ms in tp; S3b 489 ms (collaudo); ritorno da Sistema fino a 443 ms in tp |
| O1a | Soglia intermedia dopo R2, **separata** per i blocchi in vista pagine (apertura, tocco su una scheda, chiusura) e per quelli a riposo o in modifica (sollevamento, rilascio, ridimensionamento, «Annulla»). **Le due soglie si fissano dopo T0a punto 2**, misurando la finestra reale di R2 (riposo ±1, vista pagine «visibili ±1»), non dalla variante a2. | Modo t, come la tabella A/B | 1,00 |
| O2 | **Non coperto da questo blocco.** Transizioni con almeno l'80 % dei fotogrammi attesi a 90 Hz. Il costo di PrePaint e Paint per fotogramma (5-18 ms contro un budget di 11 ms) resta anche senza blocchi, e nessuna tappa lo riduce. Il blocco misura e riporta la percentuale, senza dichiararla raggiunta. | Passata light di `measure-ov.cjs` e `run.cjs` | 3-6 su 25-50 |
| O3 | **Nessun `transitioncancel`** su `.aca-pager__page` in chiusura (S1, S7b «Fine» subito dopo l'apertura) | Contatore di eventi negli scenari di `scen.cjs` | Cancellate 3/3 |
| O4 | «+» visibili insieme alla pagina: al massimo un fotogramma dopo la fine della transizione. **Solo se l'utente risponde sì a D-1.** | Opacità dello strato celle per fotogramma | 0,10-0,33 s dopo |
| O5 | Non peggiorare: scorrimento tra pagine ≥ 72 fps (S4) **e, nei 500 ms dopo l'atterraggio di uno swipe, di un lancio veloce o di un doppio swipe, nessun task più lungo di quello della base misurata in T0a (mediana e min-max) né oltre 50 ms**; trascinamento di un widget al bordo senza copia staccata dal dito oltre quanto misurato oggi (S3c); fogli fluidi (240 ms), movimento ridotto (S8), Casa 3D (contesti WebGL come oggi), telefono 390/360 su Chromium software senza pagine vuote | Scenari S4 (più lancio e doppio swipe), S3c, S5a/b, S8 e controlli Casa 3D | Fluidi; task dopo l'atterraggio non misurati |
| O6 | Suite, tipi, lint, i18n, build e dimensione del bundle verdi | Controlli del repository | Verdi il 2026-10-22 |

**O1 è un obiettivo finale, non una promessa.** Nessuna variante misurata lo raggiunge da sola. Per avvicinarlo servono R2 e, se T0 le giustifica, R4, R5 o la tappa sui selettori (R9); forse il secondo livello R2b. Se dopo il blocco consigliato i blocchi restano sopra 100 ms, si torna all'utente con le opzioni rimaste. Non si spengono transizioni o ombre senza decisione.

**Quale tappa riduce quale blocco** (stima da confermare con T0):

| Blocco | Tappe che lo riducono | Limite noto |
|---|---|---|
| Apertura vista pagine, «Fine» (tocco) | R2; R9 se T0b la giustifica | — |
| «Fine», settling | R2 (meno elementi); la causa precisa si cerca in T0a punto 7 | Nessuna tappa mirata nel blocco: R8 dipende da D-1. Se T0a non trova la leva, il settling può restare sopra 100 ms. |
| T2, tocco su una scheda → modifica | R2 (meno elementi per ricalcolo) | Il doppio ricalcolo (`removeChild`, `focus()`) non ha una tappa finché T0a punto 6 non ne trova la causa; R7 dipende da D-6. |
| Sollevamento, rilascio, «Annulla» | R2; R3 (solo momento del ricalcolo); R4/R5 se T0 le giustifica | — |
| Ridimensionamento (S3b) | R2 | Nessuno scenario T finora: si aggiunge in T0a punto 2. |
| Fogli, ritorno da Sistema | R2 (non misurata su questi casi); R9 | `showModal()` resta un costo fisso finché ISSUE-112 non cambia il meccanismo; il ritorno da Sistema resta legato a ISSUE-110. |

## Opzioni

| Opzione | Effetto atteso (dai dati) | Pro | Contro e rischi |
|---|---|---|---|
| **A. Pagine lontane saltate dal browser.** `content-visibility:hidden` sul clip delle pagine fuori dalla finestra visibile (R2) | Somma dei blocchi da 0,65 a 0,66 della base (a2); 1098 elementi invece di 2025-2519 | Una regola CSS e un attributo scritto dal Pager. L'albero React resta montato, quindi stato, Casa 3D e polling restano come sono. Riduce anche il costo di `showModal()` e del ritorno da Sistema. | La finestra deve seguire la vista pagine, il trascinamento delle schede e i salti lunghi, altrimenti si vedono schede vuote (H4). Possibili misure vecchie dei ResizeObserver dopo una rotazione. È una scelta architetturale: [ADR-0018](../decisions/ADR-0018-pagine-fuori-vista.md). |
| **A2. Anche le pagine accanto saltate a riposo**, sbloccate al primo tocco (R2b) | Fino a 0,39-0,41 (a1) | È la leva più forte misurata. | Al primo tocco va disegnata una pagina in più, e lo scorrimento oggi fluido può peggiorare. Comportamento visibile (D-4). Non consigliata finché R2 non è misurata. |
| **B. Togliere i ricalcoli forzati** (R3) | Sollevamento: 0 ricalcoli forzati da `DragGhost`. Il ricalcolo di circa 2500 elementi però resta, al fotogramma successivo: il guadagno in durata è incerto e potrebbe essere nullo (valutazione 2). | Interno, invisibile. Toglie un ricalcolo sincrono dal gestore dell'evento, quindi la sessione di trascinamento parte prima. | Va mantenuto il valore delle variabili della griglia nella copia. Per `focus()` cambia il momento del fuoco, quindi va prima la domanda D-6. |
| **C. Chiusura legata alla transizione vera** (R1) | O3, cioè nessuna chiusura tagliata. Non riduce i blocchi. | Piccola. Rende visibile l'animazione prevista da `design.md`. | Se un evento non arriva, il pager può restare in chiusura: serve una rete di sicurezza. |
| **D. Classi e proprietà ereditate limitate.** `is-dragging` solo sulle pagine vicine; `user-select` costante sui widget (R4) | Da misurare in T0. Con R2 il guadagno sulle pagine lontane si annulla, resta quello sulle ±1. | CSS e una riga di TSX, invisibile. | I test fissano selettori e classi. Al bordo la griglia di destinazione deve avere la classe. |
| **E. React: stato volatile fuori da `ui`.** `selected`, `landed` e `rejectedId` in un contesto o archivio a selettore; `widgetName` e `hiddenCheck` stabili (R5) | Incerto. Nel tocco/selezione di T2 React misura solo 5,9 ms; i 40-95 ms sono dei cambi di modalità, dove `editMode` resta. Toglie il secondo giro a +260 ms dopo l'atterraggio e parte del lavoro ripetuto, ma il rumore degli aggiornamenti HA dipende da H3 (non misurata) e il runtime (`useHomeAssistantRuntime`) cambia comunque a ogni aggiornamento di entità: i 61 file che leggono `useWidgetRuntime()` si rifanno lo stesso. | Invisibile. | Rischio medio-basso ma è la tappa più ampia. Fuoco, `aria-pressed` e Tab dal widget selezionato vanno protetti (test `LauncherScreen.test.tsx` :2679, :2693). **Condizionale all'esito di T0b.** |
| **F. `editMode` differito per le pagine lontane** (contesti per pagina con `useDeferredValue`) | Commit sincrono da circa 10 pagine a circa 3 (stima) | Riduce React | Le pagine lontane mostrano per un attimo lo stato vecchio (D-5). Tocca `flushSync` di `liftWidget` (non si può differire). Con R2 il guadagno sullo stile è già preso. **Non consigliata ora.** |
| **G. Smontare le pagine lontane** (virtualizzazione React) | Pari ad a3 o meglio | Meno nodi in assoluto | Perde stato e polling, rimonta al passaggio (costo e scatto), Casa 3D da rifare. **Scartata** (vedi ADR-0018). |
| **H. `display:none` sulle pagine lontane** | 0,32-0,35 (a3) | Semplice | Misure a zero (come ISSUE-110), ResizeObserver con valori nulli, fuoco. **Scartata** a favore di A. |
| **M. Costo per elemento ridotto senza cambiare l'aspetto** (R9): riscrivere i selettori `:is()` più provati in forme indicizzabili (classe sul soggetto) e, se T0b lo mostra, ridurre le proprietà personalizzate ereditate da ogni elemento | Da misurare in T0b con un A/B di CSS iniettato. Vale per tutti gli scenari, compresi fogli e Sistema (H5). | CSS, invisibile se il risultato a vista è identico (0 pixel diversi). | Selettori e token sono condivisi con Kit 2 e Metallo (ADR-0011): ogni riscrittura va verificata a pixel. I test LagLayers fissano alcuni selettori. Tappa condizionale. |
| **I. Transizioni o ombre ridotte** (b, c) | 0,51-0,87 | — | Cambiano l'aspetto (ADR-0011): **non proposte.** |
| **L. Fogli senza `showModal()`** | Da 199 a circa 0 ms per apertura e chiusura | — | Cambia il meccanismo del foglio (fuoco, Esc, inerzia): appartiene a ISSUE-112, fuori. |

### Raccomandazione

Il blocco consigliato non cambia nessun comportamento visibile voluto: è T0a → R1 + R3 → R2, poi R4, R5 e R9 solo se T0 le giustifica, e infine la misura sul banco.

- **R1** rende visibile la chiusura già descritta in `design.md`. Durata e curva restano invariate.
- **R2** è la leva più forte tra quelle che non cambiano l'aspetto. È accompagnata dalla bozza [ADR-0018](../decisions/ADR-0018-pagine-fuori-vista.md), da accettare prima di realizzarla.
- **R3** toglie un ricalcolo sincrono dal gestore del sollevamento; il guadagno in durata è incerto.
- **R4, R5 e R9** sono condizionali: si fanno solo se T0a/T0b mostrano un guadagno distinguibile dal rumore.

Restano fuori dal blocco, e dipendono dalle domande D-1…D-6: R2b, F, lo spostamento del fuoco, il momento dei «+» e ogni cambio di transizioni, ombre o fogli.

## Tappe

Regole comuni a ogni tappa:

- Copia PRIMA dei file toccati in `backup/issue-109/pre/<tappa>/`.
- Nessun commit, salvo autorizzazione separata.
- Vitest sempre con `--maxWorkers=4`. Prima i test mirati, poi la suite completa in due shard (`--shard=1/2` e `2/2`).
- Dopo il codice: `npm run typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check`, `build` e `scripts/check-bundle-size.mjs`.
- Mai suite, browser e tablet insieme. Al massimo un Chromium headless con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`.
- Si terminano solo i PID avviati da sé, mai processi per nome.

**Misura sul tablet di una tappa:**

1. Build della tappa fuori dal repository, in `backup/piano-issue-109/dist-<tappa>`, servita come nella misura del 2026-10-22: copia del server dei fixture sulla 3013 e `adb reverse tcp:3013`.
2. Nella stessa sessione si misura anche la build di base servita allo stesso modo.
3. Il banco vero si aggiorna una volta sola, a fine blocco (tappa Z), con copia a freddo.

Schermo acceso, `visibilityState` visibile, chiavi di layout salvate e confrontate a fine giro, nessun token letto. A fine prova si tolgono `adb forward` e i reverse non necessari.

### T0 — Diagnosi mancante (sola misura, nessun codice)

T0 è divisa in due. **T0a** sblocca la decisione su ADR-0018 e la tappa R2 ed è necessaria. **T0b** serve solo a decidere R5 e R9 ed è facoltativa.

**T0a — finestra di R2, H4, T2 e settling (necessaria).** Una sessione tablet, tetto 2 ore.

1. **Base degli scenari mancanti** (5 giri, regola statistica): swipe singolo, lancio veloce e doppio swipe ravvicinato (task nei 500 ms dopo l'atterraggio, fps nella passata light); trascinamento di un widget al bordo su due pagine (S3c: blocco al cambio di pagina, distanza tra copia e dito); ridimensionamento di un widget (S3b) come nuovo scenario T in `tp-run.cjs`.
2. **A/B con CSS iniettato della finestra reale di R2**, simulata con uno script che scrive `data-far`: a riposo ±1, in vista pagine «schede visibili ±1», con lo **sblocco anticipato** nella direzione dello scorrimento (vedi R2). Si misurano T1, T2, T3 e S3b in modo t, e gli scenari del punto 1. Schermate: schede ferme e trascinate in vista pagine, scorrimento con l'indicatore, lancio veloce e doppio swipe, trascinamento al bordo. Una passata light per S4. Da qui si fissano le due soglie di O1a.
3. **A/B di R4** (L1 e L3) sopra la finestra del punto 2.
4. **H4:** con il CSS iniettato, emulare un ridimensionamento con CDP `Emulation.setDeviceMetricsOverride` (non con comandi di sistema) e controllare le misure delle griglie lontane quando tornano vicine. Con una pagina che contiene `AdaptiveCategoryWidget` e un widget con `useMeasuredHeight` (calendario o attività) a distanza 2: numero di `setState` e durata dei task allo sblocco, prima immagine della pagina sbloccata (altezze giuste o no).
5. **Geometria su pagina saltata:** «Sposta qui» e rilascio dal vassoio su una scheda lontana della vista pagine. Si registra se c'è un layout forzato o un rettangolo vuoto.
6. **Analisi di T2:** quale `removeChild` avviene nel commit dopo il tocco sulla scheda, quale nodo toglie, e perché il documento viene ricalcolato due volte (5041 elementi). Strumenti: profilo leggibile e `inv-analyze.cjs`.
7. **Scomposizione del settling dopo «Fine»:** che cosa viene invalidato oltre a `inert` (classe `is-settling` sul pager, `will-change: opacity` delle celle, ricomparsa delle celle), con una mutazione per volta come in `micro.cjs`.

**T0b — H1, H3 e H5 (facoltativa).** Una sessione tablet, tetto 1,5 ore. Si fa solo se l'utente vuole decidere R5 e R9.

1. **H1:** riprodurre, una per volta e poi in blocco, le mutazioni che React fa in un ingresso in modifica e in un sollevamento, con elementi e ms del ricalcolo (`micro.cjs` esteso, `inv-analyze.cjs` con `elementsAffected`). Tetto: 10 mutazioni.
2. **H3:** commit di React al secondo a banco fermo, per 60 s, con l'osservatore dei task lunghi e il conteggio dei render nella build leggibile; conteggio degli script per gesto in T3.
3. **H5:** elenco dei 63 selettori più provati con file e riga; numero di proprietà personalizzate ereditate per elemento (token Kit 2 e Metallo); A/B con CSS iniettato che riscrive i selettori `:is()` più provati senza cambiare l'aspetto (controllo a pixel su una schermata per pagina).

- **File:** solo script fuori Git, in `backup/piano-issue-109/T0/`. Nessun file dell'app.
- **Test di guardia:** nessuno, perché il codice non cambia. Al termine `git status` deve avere ancora le stesse 453 voci (più i documenti di questo incarico).
- **Fatto quando (T0a):**
  - c'è una tabella con mediana e min-max di 5 giri per ogni misura, primo giro a parte;
  - le soglie di O1a sono fissate;
  - c'è un sì o un no sulle schede vuote, sugli scorrimenti veloci, sul trascinamento al bordo, sulle misure vecchie e sulla geometria delle pagine saltate;
  - si sa se L1 o L3 portano un guadagno distinguibile oltre alla finestra di R2;
  - c'è una spiegazione (o «non trovata») del doppio ricalcolo di T2 e del settling.
- **Fatto quando (T0b):** elenco ordinato delle mutazioni per costo, commit al secondo da HA, tabella dei selettori e esito dell'A/B di R9.
- **Rischio:** basso. Tablet bloccato o PC in sospensione invalidano la misura, che va rifatta. Se il tetto di tempo scade, si chiude con i punti fatti e si riporta il resto come «non eseguito».
- **Ritorno indietro:** non serve. Si ripristinano le chiavi di layout salvate.
- **Modello:** Sonnet, con le regole dei processi e una sessione tablet alla volta.

### R1 — Chiusura della vista pagine che non taglia la transizione

- **Cosa:** in `Pager.tsx:410-416` il timer di sicurezza (`OVERVIEW_MS + 50`) non parte più dal cambio di stato, ma dal **primo** di questi eventi, quello che arriva prima:
  - il primo `transitionrun` o `transitionstart` di **qualunque** `.aca-pager__page` o della `scale` di `.aca-pager__body`;
  - il primo `requestAnimationFrame` dopo il commit di `closing`.

  Non basta il `translate` della pagina corrente: senza pan né spostamento di scheda vale `--aca-d=0` sia in vista pagine sia in chiusura (launcher.css:209-228), quindi non ha transizione; lo stesso con una sola pagina. La `scale` del corpo invece cambia sempre (launcher.css:234-269), e il rAF arriva comunque, anche quando nessuna transizione parte. Il rAF dopo il commit è la rete che garantisce la partenza del conteggio; gli eventi di transizione servono solo se arrivano prima.

  Resta un tetto assoluto (proposta: 3 × `OVERVIEW_MS`) dal cambio di stato, che però non deve mai essere il percorso normale. `onTransitionEnd` (`:448-455`) resta la via principale e accetta anche la fine della `scale` del corpo della pagina corrente.
  - Per la reattività non si usa `getAnimations()`, perché forza lo stile se è sporco.
  - Con movimento ridotto la chiusura resta immediata, come oggi.
  - `finishClosing` resta idempotente.
- **File:** `templates/launcher/Pager.tsx`. Test in `__tests__/PagerOverview.test.tsx`.
- **Test di guardia:**
  - `PagerOverview.test.tsx:186-243` (chiusura, fine transizione, movimento ridotto);
  - `PagerRestyle.test.tsx:245-330` (`endContentTransitions` al primo fotogramma);
  - test nuovi: «il timer conta dal primo `transitionrun` o dal primo rAF dopo il commit»; «pagina corrente senza pan né vicine: la chiusura termina entro `OVERVIEW_MS` + 50 ms dal primo fotogramma, non al tetto»; «una sola pagina: idem»; «senza alcun evento né rAF chiude al tetto»; «Fine subito dopo l'apertura (S7b) non resta in chiusura».
- **Misura sul tablet:** S1, S7b e il caso con una pagina sola o senza vicine. Si contano `transitioncancel` e `transitionend` di `.aca-pager__page` e del corpo, la durata della chiusura (dal tocco a `closing:false`) e i fotogrammi della chiusura nella passata light. 5 giri secondo la regola statistica.
- **Fatto quando:** 0 `transitioncancel` in tutti i giri (O3); la chiusura non arriva mai al tetto, nei casi con e senza vicine; nessuno stato bloccato in S7; test verdi.
- **Rischio:** medio-basso. Il pager potrebbe restare più a lungo in chiusura, con il contenuto inerte. Il conteggio dal primo rAF e il tetto lo limitano.
- **Ritorno indietro:** si ripristina il blocco di `Pager.tsx` dalla copia PRIMA.
- **Comportamento visibile:** la chiusura diventa la scivolata prevista invece di un salto, con durata e curva invariate. Non toglie nulla di ciò che l'utente ha descritto.

### R2 — Pagine fuori vista saltate dal browser (livello 1, da [ADR-0018](../decisions/ADR-0018-pagine-fuori-vista.md))

**Condizione:** ADR-0018 accettata e T0a senza schede vuote né regressioni negli scorrimenti veloci e nel trascinamento al bordo.

- **Cosa:**
  - Il Pager scrive `data-far` sulla `<section>` di ogni pagina fuori dalla finestra.
    - A riposo e in modifica, la finestra è la pagina corrente ±1.
    - **Sblocco anticipato nello scorrimento.** L'indice del Pager cambia solo quando lo scorrimento si ferma (`settleTimer`, `Pager.tsx:500-515`). La finestra quindi non può seguire l'indice: si estende nella direzione dello scorrimento in corso **già al primo evento `scroll`** (o al `pointerdown` sul pager), senza aspettare il settle, e copre almeno corrente ±2 in quella direzione. Così un lancio veloce o un doppio swipe non portano a schermo una pagina con `data-far`, e lo sblocco della pagina nuova avviene mentre il dito si muove, non dopo l'atterraggio. Il modo concreto (posizione letta dall'evento `scroll` senza forzare il layout, oppure dalla velocità del gesto) lo sceglie la tappa, con il criterio di O5.
    - **Trascinamento di un widget al bordo:** dall'inizio della sessione di trascinamento la finestra comprende corrente ±2, così il cambio di pagina dopo `EDGE_DELAY_MS` non sblocca una pagina a metà trascinamento.
    - In vista pagine, sono le schede visibili ±1 secondo il passo misurato (`--aca-overview-pitch`). La finestra si aggiorna durante il trascinamento delle schede (`useOverviewPan`) appena si supera mezzo passo.
    - Durante uno scorrimento animato verso una pagina lontana (`scrollTo` smooth, `Pager.tsx:309-314`), la finestra copre tutto l'intervallo tra partenza e arrivo. Nel **salto istantaneo** (tastiera, movimento ridotto, `Pager.tsx:296-308`) l'attributo della pagina di arrivo si toglie nello stesso commit che cambia l'indice, prima di scrivere `scrollLeft`.
    - Prima di leggere la geometria di una griglia di destinazione su una pagina saltata («Sposta qui», rilascio dal vassoio su una scheda lontana) si toglie `data-far` da quella pagina, secondo l'esito di T0a punto 5.
  - Una regola in `launcher.css`: `.aca-pager__page[data-far] > .aca-pager__body > .aca-pager__clip { content-visibility: hidden; }`.
  - L'albero React non cambia: nessuna pagina viene smontata.
  - Il clip ha già le dimensioni della pagina (flex nel corpo, launcher.css:74-120), e `data-far` viene tolto prima che la pagina sia visibile. Così il contenimento non taglia mai niente di visibile.
- **File:**
  - `templates/launcher/Pager.tsx`: calcolo della finestra vicino a `PageNearContext` (`:602-606`), senza toccare PageShell (ADR-0012);
  - `templates/launcher/launcher.css`;
  - se T0a punto 4 mostra misure vecchie, una rimisura allo sblocco in `WidgetGrid.tsx:255-289`, ignorando le misure 0×0; per i widget con ResizeObserver proprio (`AdaptiveCategoryWidget`, `useMeasuredHeight`) la tappa si ferma e torna al piano se T0a mostra altezze sbagliate nel primo fotogramma.
- **Test di guardia:**
  - `PagerRestyle`, `PagerOverview`, `PagerBands`, `LagLayers` (strati e selettori: va verificato in questa tappa se qualche asserzione va adeguata), `LauncherGestures`, `LauncherDragDrop`, `OverviewPan`, `LauncherGridGeometry`, `Casa3dShell`, `Casa3dPage`, `Casa3dVista` (precaricamento con `usePageNear` invariato), `FixWidgetsVisibility`;
  - test nuovi: `data-far` a riposo per le pagine a distanza > 1; finestra estesa nella direzione dello scorrimento al primo evento `scroll`, prima del settle; finestra ±2 durante il trascinamento di un widget e nessun `data-far` sulla pagina di destinazione al bordo; finestra allargata in vista pagine e durante il trascinamento delle schede; intervallo sbloccato nello scorrimento lungo smooth; **salto istantaneo** (tastiera, movimento ridotto) senza `data-far` sulla pagina di arrivo nello stesso commit; «Sposta qui» e rilascio dal vassoio su una scheda lontana con geometria non vuota.
- **Misura sul tablet** (5 giri, regola statistica):
  - T1, T2, T3, S3b e T4 in modo t (elementi e somma dei blocchi) e in modo b (durate);
  - swipe, lancio veloce e doppio swipe: task nei 500 ms dopo l'atterraggio, fps nella passata light (S4);
  - trascinamento al bordo (S3c): blocco al cambio di pagina, distanza tra copia e dito;
  - schermate delle schede nella vista pagine, ferma e trascinata, nello scorrimento con l'indicatore, nel lancio veloce e nella prima immagine di una pagina sbloccata con widget misurati;
  - un giro sul telefono a 390 px con Chromium software, per escludere le pagine vuote.
- **Fatto quando:**
  - O1a: le due soglie fissate dopo T0a (vista pagine; riposo e modifica), con intervalli min-max non sovrapposti alla base;
  - nessuna scheda o pagina vuota nelle schermate, in tutti i giri;
  - O5: S4 ≥ 72 fps e nessun task dopo l'atterraggio peggiore della base o oltre 50 ms; trascinamento al bordo non peggiore della base;
  - Casa 3D: 0 contesti in vista pagine, come oggi;
  - test verdi.
- **Rischio:** medio. Vedi H4 e i rischi in ADR-0018.
- **Ritorno indietro:** togliere la regola CSS basta a ripristinare il comportamento, e l'attributo senza la regola è innocuo. Poi si ripristina `Pager.tsx` dalla copia.
- **Comportamento visibile:** nessuno, se i criteri sono rispettati. Se le schermate mostrano schede vuote che il piano non riesce a evitare, la tappa si ferma e il caso passa alle domande D-2 e D-3.

### R3 — Sollevamento senza ricalcolo forzato

- **Cosa:** in `DragGhost.tsx:31-45` le variabili della griglia (`--aca-cell`, `--aca-gap-x`, `--aca-gap-y`, `--aca-radius-cell`) si leggono senza `getComputedStyle`:
  - dallo stile inline della griglia, scritto da `WidgetGrid.tsx:390-399`, con `element.style.getPropertyValue`, che non forza lo stile;
  - per il raggio, da verificare se è inline, altrimenti da un valore letto una volta al montaggio della griglia, quando lo stile è pulito.

  Stessa idea per `getRemoveBounds` (`LauncherScreen.tsx:509`): misurare una volta all'inizio del trascinamento e non a ogni passaggio, se il codice lo permette senza cambiare la geometria del cestino.
- **File:** `templates/launcher/DragGhost.tsx`, ed eventualmente `templates/launcher/LauncherScreen.tsx` per `getRemoveBounds`.
- **Test di guardia:**
  - `LauncherDragDrop.test.tsx` (37 test, geometria e drop);
  - `LauncherScreen.test.tsx:664-704` (nessun widget rifatto nei fotogrammi del trascinamento), `:868` e `:997` (sollevamento dopo pressione lunga, `flushSync`);
  - test nuovo: la copia ha le stesse variabili della griglia di origine, senza chiamare `getComputedStyle` (spia sul metodo).
- **Misura sul tablet:** T3 in modo tp. Al sollevamento: numero di ricalcoli forzati e ms di script di `DragGhost`; durata del ricalcolo non forzato al fotogramma successivo. In modo b: durata del sollevamento e del blocco successivo. 5 giri, regola statistica. Si misura nella stessa sessione di R1.
- **Fatto quando:** 0 ricalcoli forzati da `DragGhost`; **nessun aumento** del blocco successivo né della somma dei blocchi del sollevamento rispetto alla base (la riduzione non è un criterio: valutazione 2); copia identica a vista in tutti i giri; test verdi. Se la durata totale non cambia, la tappa vale solo per il momento in cui parte la sessione di trascinamento e lo si scrive così.
- **Rischio:** basso. Se una variabile viene dal foglio di stile e non dallo stile inline, la copia potrebbe avere la cella sbagliata: lo coprono il test e la schermata.
- **Ritorno indietro:** ripristino del file.

### R4 — Classi e proprietà ereditate limitate (solo se T0a mostra un guadagno distinguibile oltre alla finestra di R2)

- **Cosa:**
  - **L1:** `is-dragging` solo sulle griglie delle pagine entro ±1 dalla corrente (`WidgetGrid.tsx:404`, con `usePageNear`). La destinazione al bordo è sempre vicina.
  - **L3:** `user-select: none` e `-webkit-touch-callout: none` costanti sui widget, invece che legati a `:not(.is-editing)` (launcher.css:568-577). In modifica il contenuto è già `inert` e coperto dalla maniglia.
- **File:** `templates/launcher/WidgetGrid.tsx`, `templates/launcher/launcher.css`.
- **Test di guardia:**
  - `LagLayers.test.ts` (:215-238 wiggle, :302-345 celle);
  - `LauncherGestures` e `LauncherDragDrop`;
  - i test che fissano `user-select` dei widget, da cercare in `FixLauncherUi*`;
  - test nuovi: pagina lontana senza `is-dragging`, pagina accanto con `is-dragging` durante il trascinamento.
- **Misura sul tablet:** T3 (elementi e blocchi). A mano: tocco lungo su un widget in uso, con la regola di ADR-0016 «Il widget in uso non prende la pressione lunga».
- **Fatto quando:** somma dei blocchi di T3 inferiore al risultato di R2 con intervalli min-max non sovrapposti (5 giri), nessun «+» visibile sulla pagina accanto durante il trascinamento al bordo (schermate), test verdi.
- **Rischio:** basso.
- **Ritorno indietro:** ripristino dei due file.

### R5 — React: lo stato del tocco non rifà tutte le pagine (condizionale)

**Condizione:** T0b punti 1-2 mostrano che lo script di React per selezione, atterraggio o «Annulla» è una parte distinguibile dei blocchi (conteggio degli script di T3) o che i commit da HA a banco fermo sono frequenti (H3). Senza T0b la tappa non parte. R5a e R5b si decidono separatamente.

- **Cosa:**
  - `selected`, `landed` e `rejectedId` escono da `LauncherUi` (`LauncherUiContext.tsx`; `LauncherScreen.tsx:238`, `:329-367`, `:1585-1640`). Vanno in un piccolo archivio con `useSyncExternalStore` a selettore per widget e per griglia, letto da `WidgetHost.tsx:135` e `WidgetGrid.tsx:385-388` e `:425-428`.
  - `select`, `moveSelectedTo`, `tapWidget` e `removeWidget` diventano stabili, leggendo layout e selezione da ref.
  - `widgetName` e `hiddenCheck` diventano funzioni stabili (ref), con la reattività della visibilità condizionale tenuta dalla griglia.
  - Si sposta anche la scrittura di `selectedFrom.current` fuori dall'updater di `setSelected` (`:340-345`).
  - Nessuna nuova dipendenza: `useSyncExternalStore` è di React.
- **File:** `templates/launcher/LauncherScreen.tsx`, `templates/launcher/LauncherUiContext.tsx`, `templates/launcher/WidgetHost.tsx`, `templates/launcher/WidgetGrid.tsx`, eventualmente un file nuovo `hooks/launcher/useLauncherSelection.ts`.
- **Test di guardia:**
  - `LagRenders.test.tsx:65-133`;
  - `LauncherScreen.test.tsx`: :341-406 selezione, :300 e :408 Annulla, :2251-2426 drop, :2641 tocco e secondo tocco, :2679 Invio, :2693 Tab, :3490-3527 render;
  - per R5b, i test esistenti sulla visibilità condizionale e sui nomi dei widget, da mantenere verdi: `FixWidgetsVisibility.test.tsx:42-225` e i test di `LauncherScreen.test.tsx` che usano `hiddenCheck` o `widgetName` (l'esecutore li elenca con una ricerca prima di cambiare il codice);
  - test nuovi in stile LagRenders: «selezionare un widget rifà solo quel WidgetHost»; «l'atterraggio non rifà le altre griglie». Non si usa «un aggiornamento di entità non rifà gli host dei widget non interessati» come prova di guadagno: il runtime cambia comunque e i widget si rifanno lo stesso.
- **Misura sul tablet:**
  - T2 e T3 in modo tp: ms di script per tocco, selezione, rilascio e «Annulla»; assenza del secondo giro a +260 ms;
  - a banco fermo: commit al secondo, da confrontare con T0b punto 2.
- **Fatto quando:** script per selezione o atterraggio ≤ 15 ms, nessun giro completo a +260 ms, fuoco e `aria-pressed` invariati, test verdi.
- **Rischio:** medio. È la tappa più ampia del blocco.
- **Ritorno indietro:** ripristino dei file. È indipendente dalle altre tappe.
- **Nota:** da dividere in due sotto-tappe per un modello leggero. R5a: `selected`, `landed` e `rejectedId`. R5b: `widgetName` e `hiddenCheck`.
- **Limite di R5b, dichiarato:** togliere `widgetName` e `hiddenCheck` da `ui` non evita che ogni aggiornamento di entità rifaccia i widget, perché `useHomeAssistantRuntime` cambia comunque e 61 file leggono `useWidgetRuntime()`. R5b toglie solo il giro di WidgetGrid e WidgetHost dovuto a `ui`. Per questo R5b **è rinviata** finché T0b non mostra che quel giro pesa; ridurre il lavoro dovuto al runtime è un intervento diverso e più ampio, fuori da questo piano.

### R9 — Costo per elemento ridotto (condizionale, opzione M)

**Condizione:** T0b punto 3 mostra un guadagno distinguibile dal rumore, con 0 pixel diversi.

- **Cosa:** riscrivere i selettori `:is()` più provati dell'elenco di T0b in forme che il browser indicizza (classe sul soggetto, meno discendenti), senza cambiare l'aspetto. Ridurre le proprietà personalizzate ereditate solo se T0b ne dimostra il peso, e solo per token che non cambiano tra temi.
- **File:** i fogli di stile indicati da T0b (`launcher.css`, `themes/acasystem/material.css`, `themes/kit2/skin.css` o altri), uno per volta.
- **Test di guardia:** `LagLayers.test.ts`, `Polish2Cornice`, i test di tema e i controlli `lint:theme-colors`; schermata di confronto a pixel di ogni pagina, in uso e in modifica, chiaro e scuro.
- **Misura sul tablet:** T1, T3, T4 e ritorno da Sistema in modo t, 5 giri.
- **Fatto quando:** riduzione degli ms di ricalcolo con intervalli non sovrapposti; 0 pixel diversi; test verdi.
- **Rischio:** medio, perché tocca Kit 2 e Metallo (ADR-0011). Ogni selettore riscritto è un passo a sé.
- **Ritorno indietro:** ripristino del foglio di stile dalla copia PRIMA.

### Z — Banco e misura finale

- **Cosa:**
  - Copia a freddo del volume PRIMA (tunet fermo, `tar -tzf`, SHA-256 annotato).
  - `ACASYSTEM_VERSION` 0.9.27 in `progetto/.env` e negli script e2e.
  - Banco `aca-system:0.9.27`.
  - Misura completa sul Tab M11 (S1-S8 con `run.cjs`; T1-T5 con `tp-run.cjs` modo b; `measure-ov.cjs`) e confronto con la base 0.9.26 del 2026-10-22.
- **Fatto quando:** O1a, O3, O5 e O6 rispettati; O1 e O2 verificati e riportati (raggiunti o no, senza arrotondare), con la regola statistica. Documenti aggiornati: `verification.md`, `infrastructure.md`, ISSUE-109, ISSUE-062, ISSUE-107 e questo report.
- **Ritorno indietro:** `ACASYSTEM_VERSION=0.9.26` e `up -d --build`; la copia PRIMA solo se serve.
- **Autorizzazione:** il banco richiede un'autorizzazione esplicita, come ogni banco precedente.

### Fuori dal blocco consigliato (solo dopo le risposte)

Con le risposte del 2026-10-22 sono autorizzate R2b, R7, R8 e R10; R6 non si fa (D-5).

| Tappa | Contenuto | Dipende da |
|---|---|---|
| R2b | Anche le pagine accanto saltate a riposo, sbloccate a `pointerdown` sul pager e durante il trascinamento di un widget al bordo | D-4, ADR-0018 livello 2, misura di S4 |
| R6 | `editMode` differito per le pagine lontane (opzione F) | D-5 |
| R7 | Fuoco spostato dopo il fotogramma in `finishEditing`, `openFromOverview` e `AppRoutes.tsx:91` | D-6 |
| R8 | «+» insieme alla pagina: fine del rinvio con `requestIdleCallback` di `settling` (`Pager.tsx:420-445`) e passaggio dell'ultimo `inert` | D-1; dopo R2, perché costa meno |
| R10 | **Salto diretto** (aggiunta del 2026-10-22, da D-2): toccando un pallino lontano dell'indicatore (distanza dalla pagina corrente > 1) si arriva subito alla pagina scelta, senza vedere scorrere quelle in mezzo. Pagina accanto (distanza 1): scorrimento animato come oggi. Tastiera e movimento ridotto sono già istantanei (`Pager.tsx:296-308`). Il ramo `scrollTo` smooth (`Pager.tsx:309-314`) si usa solo per distanza 1. Con R2 il salto istantaneo toglie `data-far` dalla pagina di arrivo nello stesso commit, quindi non serve sbloccare l'intervallo intermedio. File: `templates/launcher/Pager.tsx`; test in `__tests__/PagerOverview.test.tsx` o `PagerRestyle.test.tsx` (da verificare). | D-2 (risposta «Salto diretto»); dopo R2 |

## Ordine e modelli

1. **T0a**, misura. Modello Sonnet; una sessione tablet (tetto 2 ore); nessun codice. **T0b** facoltativa, una sessione (tetto 1,5 ore), solo se l'utente vuole decidere R5 e R9.
2. **R1 e R3**, indipendenti e invisibili: si realizzano in due sessioni di codice separate, ma si misurano sul tablet **in un'unica sessione** (tetto 1,5 ore), con base, R1, R3 e R1+R3 alternate. R1 può partire prima di T0a se l'utente lo preferisce.
3. **R2**, dopo l'accettazione di ADR-0018 e l'esito di T0a. Una sessione tablet (tetto 2 ore).
4. **R4**, solo se T0a lo giustifica; si misura nella stessa sessione di R2 se è pronta.
5. **R5a, R9**, solo se T0b le giustifica. R5b rinviata (vedi R5).
6. **Revisione del diff** con un modello forte, cioè Opus.
7. **Z**, banco e misura finale, su autorizzazione. Una sessione tablet (tetto 2,5 ore).

**Budget indicativo.** Blocco minimo (T0a, R1+R3, R2, Z): 4 sessioni tablet e circa 4 sessioni di codice con Sonnet, più una revisione con Opus. Blocco completo con T0b, R4, R5a e R9: fino a 6 sessioni tablet. Il consumo di credito non è stimabile con precisione da questo piano; ogni sessione ha un tetto di tempo e di ripetizioni (5 giri per variante più il riscaldamento), e se il tetto scade la sessione chiude con quanto fatto, segnando il resto come «non eseguito».

- **Realizzazione:** Sonnet, una tappa per sessione, partendo da questo report: file, righe, test e criterio «Fatto quando» sono già indicati. Si preferisce Haiku solo per gli aggiornamenti dei documenti.
- **Test e misure:** come da regole. Vitest `--maxWorkers=4` e la suite in due shard; un solo browser headless con i flag software; mai suite, browser e tablet insieme; misure solo a schermo acceso.
- **Ripresa dopo una tappa:** il report di tappa è un'annotazione datata in questo documento, con comandi, esiti e limiti. Va aggiornata anche la riga di ISSUE-109.

## Domande per l'utente

Una domanda per ogni comportamento visibile che potrebbe cambiare. Fino alla risposta, il piano lascia tutto com'è oggi.

- **D-1.** Quando chiudi la vista pagine, i «+» delle caselle vuote oggi ricompaiono un attimo dopo la pagina, tra 0,1 e 0,3 s. Vuoi che ricompaiano **insieme** alla pagina? Sì o no.
- **D-2.** Se tocchi un pallino lontano dell'indicatore, oggi la fila scorre e mostra le pagine che stanno in mezzo. Va bene **come oggi**, che è la scelta del piano anche se la partenza costa un po' di più? Oppure preferisci un **salto diretto** alla pagina scelta, senza vedere quelle in mezzo?
- **D-3.** Nella vista pagine, se trascini le schede molto in fretta, una scheda lontana potrebbe apparire per un istante con il solo sfondo prima di riempirsi. Il piano cerca di evitarlo. Se non ci riesce del tutto, preferisci **mai schede vuote**, anche se i blocchi restano un po' più lunghi, oppure **accetti un istante** di scheda vuota?
- **D-4.** Per accorciare ancora i blocchi, si potrebbe smettere di tenere pronte anche le pagine **accanto** a quella che vedi e prepararle solo quando il dito tocca lo schermo. Il rischio è che l'inizio dello scorrimento diventi un po' meno fluido. Vuoi che lo **proviamo** (sì o no)?
- **D-5.** In modifica, le pagine lontane potrebbero ricevere il «tremolio» e le maniglie **un attimo dopo** quelle vicine. Lo vedresti solo scorrendo molto in fretta. È accettabile? Sì o no. Il piano non lo consiglia.
- **D-6.** Per chi usa la tastiera o TalkBack: dopo «Fine», al ritorno da Sistema e aprendo una pagina dalla vista pagine, l'evidenziazione del fuoco arriverebbe **un fotogramma dopo**, cioè circa 11 ms. Va bene? Sì o no.

## Risposte dell'utente (2026-10-22)

Fonte umana: le risposte dell'utente alle domande D-1…D-6 del 2026-10-22, relayate nella richiesta di questa sessione («OK PER LE DOMANDE fammele e rispondo man mano e poi parti»). Il testo è riportato come è stato dato.

| Domanda | Risposta dell'utente (citazione) | Conseguenza |
|---|---|---|
| D-1, «+» con la pagina | «Insieme alla pagina» | **Tappa R8 autorizzata**, dopo R2. O4 diventa un obiettivo del blocco. |
| D-2, pallino lontano | «Salto diretto» | **Nuova tappa R10 «salto diretto»** (vedi «Fuori dal blocco»): distanza > 1, salto istantaneo; pagina accanto, scorrimento animato come oggi; tastiera e movimento ridotto già istantanei. Sostituisce la scelta «come oggi» del piano. |
| D-3, scheda vuota | risposta libera: «quella meno pesante a livello di memoria» | **Interpretazione dell'agente principale, non dell'utente, correggibile:** la scelta più leggera, cioè si **accetta un istante di scheda vuota** nella vista pagine durante uno scorrimento molto veloce e **non si allarga la finestra** di R2 per evitarlo. Se l'utente intendeva il contrario («mai schede vuote»), basta dirlo: la finestra si allarga e i blocchi restano un po' più lunghi. La condizione di ADR-0018 resta più stretta: a riposo e nell'uso normale (vista pagine ferma o trascinata a velocità normale, swipe, trascinamento al bordo) le schede vuote non sono accettate. |
| D-4, pagine accanto | «Sì, proviamolo» | **Livello 2 di ADR-0018 / tappa R2b da provare dopo R2**, con misura dello scorrimento (S4, task dopo l'atterraggio). Se O5 peggiora, si torna indietro e si resta al livello 1. |
| D-5, `editMode` differito | «No» | **R6 non si fa.** |
| D-6, fuoco un fotogramma dopo | «Sì» | **Tappa R7 autorizzata** (fuoco spostato al fotogramma dopo in `finishEditing`, `openFromOverview` e `AppRoutes.tsx:91`). |
| Tappe da realizzare | «Tutto il blocco», con il testo dell'opzione: «T0a, R1, R3, poi R2 (accetto ADR-0018 se T0a non mostra schede vuote), poi le tappe delle tue risposte (R8, salto diretto, R2b), R4/R5/R9 solo se le misure le giustificano, revisione Opus e banco finale con copia a freddo.» | **Autorizzato il blocco**: T0a, R1, R3, R2, R8, R10, R2b, R7; R4/R5/R9 solo se le misure le giustificano; revisione Opus; Z con copia a freddo. [ADR-0018](../decisions/ADR-0018-pagine-fuori-vista.md) «Accettata con condizione» (T0a senza schede vuote). |

Ordine di esecuzione che ne segue: T0a → R1 e R3 → R2 → R8 → R10 → R2b → R7 → (R4, R5a, R9 se giustificate) → revisione Opus → Z. Regole invariate: nessun commit, diff limitato alla tappa, nessuna dipendenza nuova, copie PRIMA in `backup/issue-109/pre/<tappa>/`.

R7 e R8 cambiano un comportamento visibile (momento del fuoco, momento dei «+») e R10 il comportamento dell'indicatore: sono richieste o accettate esplicitamente dall'utente, quindi non violano ADR-0011. Nessuna transizione, ombra, durata o curva cambia.

## Cosa resta fuori

- La correzione visiva del ritorno da Sistema, cioè non usare `hidden` e fare una dissolvenza: è [ISSUE-110](../project-status.md#issue-110). R2 ne riduce solo il costo.
- Fogli senza `showModal()` e contenuto conservato in chiusura: [ISSUE-112](../project-status.md#issue-112).
- Frecce e ordine delle schede ([ISSUE-111](../project-status.md#issue-111)), dettagli ([ISSUE-113](../project-status.md#issue-113)), voce orfana (ISSUE-114), rilascio dopo la pressione lunga ([ISSUE-108](../project-status.md#issue-108)).
- Transizioni, ombre, aspetto delle celle (A1/A3 di REP-20261019-001), N6 e N7: richiedono una decisione sull'aspetto.
- Costo di PrePaint e Paint per fotogramma (5-18 ms contro 11 ms a 90 Hz), che impedisce O2 anche senza blocchi: proposta da registrare come problema separato, se l'utente lo vuole.
- Il lavoro dei widget dovuto al cambio del runtime HA a ogni aggiornamento di entità (limite di R5b).
- Divisione di `usePages()` per parti (contesto monolitico di PageContext) e `Pager`/`LauncherScreen` con `memo` e lo stato volatile in componenti foglia. Restano proposte, perché il guadagno misurato su React è secondario.
- Prove col dito vero, TalkBack, testo al 125-150 % e widget collegati a un HA reale. Sono necessarie, ma appartengono alle prove dell'utente.

## Avanzamento e modifiche

- 2026-10-22: scritto questo piano. Aggiunta la bozza [ADR-0018](../decisions/ADR-0018-pagine-fuori-vista.md) in stato «Proposta». Aggiornati `reports/README.md`, `decisions/README.md` e `project-status.md` (ISSUE-109 e punto di ripresa).
- Nessun file del codice dell'app modificato, nessun commit.
- 2026-10-23: **T0a eseguita** (sola misura sul Tab M11, banco 0.9.26): vedi «Annotazione T0a». Schede vuote: no; finestra consigliata fissata; R4 non giustificata; O1a fissata; O1 non raggiunto da R2 da sola. Prossima tappa: R1 e R3.
- 2026-10-23: **R2 realizzata** nel codice (livello 1 di ADR-0018: `data-far` e `content-visibility: hidden` sul clip delle pagine fuori finestra). Test mirati, tipi e lint verdi; misura sul tablet non eseguita: vedi «Rettifiche successive», tappa R2. Prossima tappa: R8.
- 2026-10-23: **R2b realizzata** nel codice (livello 2 di ADR-0018, autorizzato da D-4): a riposo anche le pagine accanto sono saltate, disegnate al primo tocco del pager, durante lo scorrimento e il trascinamento di un widget. Interruttore unico `REST_SKIPS_NEAR` in `Pager.tsx`. Test mirati, tipi e lint verdi; nessuna misura sul tablet: vedi «Tappa R2b realizzata».
- 2026-10-23: **R8, R10 e R7 realizzate** nel codice (autorizzate da D-1, D-2 e D-6): «+» al fotogramma dopo la chiusura della vista pagine, salto istantaneo dal pallino lontano, fuoco al fotogramma dopo in `finishEditing`, `openFromOverview` e nel ritorno da Sistema. Test mirati, tipi, lint, tipografia e colori verdi; misura sul tablet non eseguita: vedi «Rettifiche successive», tappe R8, R10 e R7.
- 2026-10-23: **R1 e R3 realizzate** nel codice; **T0b eseguita** (sola misura: H1, H3 e H5; R5 solo nella forma R5a, R9 non giustificata); **M1** (R1+R3 sul tablet, sola misura); **R5a realizzata** nel codice; **M2** eseguita solo in parte (tablet scollegato a metà) e **R2b tolta** (`REST_SKIPS_NEAR = false`): vedi le annotazioni di ciascuna tappa in «Rettifiche successive».
- 2026-10-23: **rilievi della revisione corretti**: salto istantaneo solo dal pallino (`dotJump`), `Pager.tsx` di nuovo LF, rimisura della griglia allo sblocco se il pager ha cambiato dimensione, `dragging` non per il ridimensionamento, nessuna pagina oltre la meta in un glide; decisioni su R2b (interruttore tenuto) e R5a (all'utente) in «Annotazione del 2026-10-23 (correzione dei rilievi della revisione)».
- 2026-10-23: **chiusura del blocco**: eseguiti la verifica completa in quattro parti (frontend 2828 test e backend 202 verdi, tipi, lint, build e dimensione dei pacchetti), la tappa Z (banco 0.9.27) e la chiusura dei documenti; vedi «Esito del blocco (2026-10-22)» in fondo.
- 2026-10-22, dopo le risposte dell'utente: registrate in «Risposte dell'utente (2026-10-22)»; aggiunta la tappa R10; ADR-0018 «Accettata con condizione»; avviata T0a (vedi la sua annotazione).
- 2026-10-22, più tardi: piano rivisto dopo la critica di un altro agente dello stesso flusso (13 rilievi). Applicati i rilievi fondati; vedi «Rettifiche dopo la critica». Aggiornata anche la bozza ADR-0018. Stato invariato: proposto, realizzazione non autorizzata.

## Rettifiche dopo la critica

Critica del 2026-10-22, 13 rilievi. Ogni rilievo è stato confrontato con il codice del working tree o con i dati della misura prima di applicarlo.

| # | Rilievo (gravità) | Esito | Dove e motivo |
|---|---|---|---|
| 1 | R1 basato su un evento che spesso non arriva (alta) | Applicato | Verificato in launcher.css:209-228: la pagina corrente ha `--aca-d=0` in vista e in chiusura, quindi il suo `translate` non transita; la `scale` del corpo invece sì (:234-269). R1 ora conta dal primo `transitionrun` di qualunque pagina o del corpo, o dal primo rAF dopo il commit; test per «senza vicine» e «una pagina». |
| 2 | R2 non copre lo scorrimento normale (alta) | Applicato | Verificato `settleTimer` in Pager.tsx:500-515. R2 ha lo sblocco anticipato nella direzione dello scorrimento e la finestra ±2 nel trascinamento al bordo; O5 ha il criterio sui task dopo l'atterraggio; T0a punto 1 misura la base. Il valore «X ms» è fissato come «non peggio della base e non oltre 50 ms», perché la base non è ancora misurata. |
| 3 | Diagnosi di R3 smentita in parte (alta) | Applicato | Valutazione 2 riscritta; criterio di R3 «0 ricalcoli forzati e nessun aumento del blocco successivo»; T2 analizzata in T0a punto 6. L'opzione B ora dice che il guadagno in durata è incerto. |
| 4 | T2 e S3b fuori da O1 (media) | Applicato | Aggiunti a O1 e alle misure di R2; S3b come nuovo scenario T in T0a; tabella «Quale tappa riduce quale blocco» con i limiti dichiarati (il doppio ricalcolo di T2 non ha tappa finché T0a non ne trova la causa). Non aggiunti alle misure di R5, che diventa condizionale (rilievo 9). |
| 5 | Soglia O1a derivata da a2, finestra diversa (media) | Applicato | O1a ha due soglie (vista pagine; riposo e modifica) da fissare dopo T0a punto 2 con la finestra reale. |
| 6 | 3 giri non distinguono dal rumore (media) | Applicato | Regola statistica: 5 giri alternati, riscaldamento a parte, mediana e min-max, intervalli non sovrapposti. Applicata a T0, R1, R3, R4, R9 e Z. |
| 7 | O2 irraggiungibile (media) | Applicato | O2 dichiarato non coperto dal blocco, come O1. Non registrato un nuovo ISSUE per il costo per fotogramma: aprire voci nel registro esula da questa revisione; resta come proposta in «Cosa resta fuori». |
| 8 | Costo per elemento trasversale non considerato (media) | Applicato | H5, opzione M, tappa condizionale R9, misure in T0b punto 3. |
| 9 | R5 giustificata con stima smentita (media) | Applicato | R5 condizionale a T0b; colonna «Effetto atteso» dell'opzione E corretta; limite del runtime dichiarato e R5b rinviata; test sulla visibilità condizionale indicati. |
| 10 | ResizeObserver dei widget non considerati (media) | Applicato, con una correzione | Verificato con una ricerca: usano ResizeObserver `AdaptiveCategoryWidget.tsx` e `useMeasuredHeight.ts` (usato da CalendarWidget e TodoWidget). In `SensorWidget` citato dalla critica la ricerca non ha trovato ResizeObserver: non è stato aggiunto. H4, T0a punto 4 e test di R2 aggiornati. |
| 11 | «Fine» senza leva certa (media) | Applicato | H6 e T0a punto 7 scompongono il settling; la tabella delle tappe dice che nessuna tappa del blocco lo porta con certezza sotto 100 ms. |
| 12 | Accessibilità e casi limite in R2 e ADR-0018 (bassa) | Applicato | Test per salto istantaneo (Pager.tsx:296-308 verificato) e per «Sposta qui»/vassoio su pagina saltata; T0a punto 5. In ADR-0018 l'affermazione sui test è sostituita da «da verificare in R2». |
| 13 | Costo di credito non stimato (bassa) | Applicato in parte | T0 divisa in T0a (necessaria) e T0b (facoltativa); R1 e R3 misurate in un'unica sessione; tetti di tempo e di ripetizioni per sessione; budget in numero di sessioni. Non è data una stima in crediti o token, perché il piano non ha dati affidabili per farla. |

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Misura profilata ISSUE-109 | `tp-run.cjs` modi b/t/tp, A/B con CSS iniettato, Tab M11, banco 0.9.26, 2026-10-22 | Eseguita (da un altro agente del flusso) | `backup/piano-issue-109/misura/RIEPILOGO.md`. Gesti sintetici; profilo leggibile su dati fixture; effetto visivo di `content-visibility` non verificato. |
| Lettura del codice | Sola lettura del working tree, 2026-10-22 | Eseguita | Righe riportate sopra; nessun conteggio dei render sul banco. |
| Controllo dei rilievi della critica | Sola lettura: launcher.css:205-269, Pager.tsx:290-316, :405-420, :495-520; ricerca di `ResizeObserver` in `components/widgets` | Eseguito | Confermati i rilievi 1, 2, 10 (con la correzione su SensorWidget) e 12a; gli altri si basano sui dati già nel piano. |
| Test, suite, controlli statici | — | Non eseguiti | Nessun codice modificato da questo incarico. |
| Stato Git | `git status --short` | 453 voci prima e dopo, più i file di questo incarico | Nessun commit. |

## Controllo del diff e decisioni

- Il diff contiene solo documenti: questo report, ADR-0018 in stato Proposta, una riga in due indici e la nota su ISSUE-109 e sul punto di ripresa.
- Nessuna tappa è autorizzata. ADR-0018 non è accettata e non lo diventa per effetto di questo report.

## Chiusura e punto di ripresa

Piano completato, in attesa dell'utente. **Prossimo passo:**

1. l'utente risponde a D-1…D-6;
2. l'utente decide su ADR-0018;
3. l'utente autorizza le tappe da realizzare, per esempio «T0a e R1».

Poi si procede nell'ordine indicato, con Sonnet, una tappa per sessione. Nessun incarico di realizzazione è attivo.

## Annotazione T0a (2026-10-23): finestra di R2, schede vuote, T2 e settling

Sola misura, nessun codice dell'app, nessun commit. Eseguita il 2026-10-22 e 2026-10-23 (Europe/Rome), circa un'ora di orologio (dalle 23:54 alle 01:00 circa), entro il tetto di 2 ore. Esecutore: Claude Code (Sonnet), come subagente del flusso; il modello esatto non è registrato. Risultati, script e tabelle in `backup/issue-109/T0a/`.

### Ambiente e metodo

- **Dispositivo e banco.** Lenovo Tab M11, Chrome, 1280×665 px a DPR 1,5, schermo acceso, `visibilityState` visibile; banco `aca-system:0.9.26` (`/api/health` riporta 0.9.26) su `http://localhost:3002` con `adb reverse tcp:3002`; CDP con `adb forward tcp:9225`. **La base è il banco 0.9.26 così com'è**, nessuna build servita sulla 3013.
- **Finestra di R2 simulata**, senza toccare l'app: `backup/issue-109/T0a/strumenti/sim.cjs` inietta una regola CSS (`.aca-pager__page[data-far] > .aca-pager__body > .aca-pager__clip { content-visibility: hidden }`) e uno script che scrive `data-far`:
  - a riposo e in modifica: pagina corrente ±1;
  - durante lo scorrimento: `[floor(p)-1, ceil(p)+1]` con una pagina in più nella direzione di marcia, già al primo evento `scroll`;
  - durante il trascinamento di un widget: corrente ±2;
  - in vista pagine: schede visibili ±1 (con 1280 px: cinque pagine su dieci sbloccate);
  - su un tocco dell'indicatore: tutto l'intervallo partenza-arrivo, sbloccato prima dello scorrimento.
- **Regola statistica applicata:** 5 giri alternati base/variante (ordine invertito a ogni giro) più il giro 0 di riscaldamento, registrato a parte; mediana con min-max; un guadagno vale solo con intervalli non sovrapposti. Tutti i giri validi (controllo `pointerdown` e `visualViewport.scale` a ogni giro: 0 giri invalidi su 132).
- **Deviazione dichiarata dal piano:** T1, T2, T3 e S3b (T6) sono misurati **solo in modo t** (traccia: durate gonfiate del 15-22 % dallo strumento, uguali per base e variante), non anche in modo b, per il tempo. Swipe, lancio, doppio swipe, trascinamento al bordo e salto lungo in modo b (osservatore dei task lunghi). Task ≥ 50 ms, gesti sintetici (`Input.dispatchTouchEvent`).
- **Incidenti.** (1) All'avvio qualcuno stava usando il tablet: eventi di tocco a vuoto e la pagina con pizzico a ×4,15, per cui i tocchi sintetici non arrivavano. Ho atteso 20 s senza tocchi e riportato la scala a 1 con `Emulation.setPageScaleFactor` (stato della pagina, non un'impostazione di Android). Da lì ogni giro controlla scala e tocchi. (2) La prima campagna era troppo lunga: l'ho interrotta (fermati solo i PID avviati da me) e riavviata con meno scenari; i dati interrotti sono in `ab-b-interrotta/` e non sono usati. (3) La prima esecuzione di `h4.cjs base` ha avuto `pdOk=false` e nessuno scorrimento: scartata e ripetuta (3 giri validi).
- **Nota sul working tree.** `Pager.tsx` contiene già il codice di R1 (`CLOSING_CAP_MS`, `CLOSING_SAFETY_MS`): non è nel banco 0.9.26 e T0a non lo usa.

### Risultati (mediana [min-max], 5 giri; base → con finestra)

| Scenario | Misura | Base | Con finestra | Esito |
|---|---|---|---|---|
| T1 (t) | blocco massimo, ms | 264 [251-279] | 218 [182-228] | migliore |
| T1 | somma dei blocchi, ms | 1049 [987-1073] | 733 [695-781] | migliore, rapporto 0,70 |
| T1 | apertura vista pagine, blocco | 234 [225-250] | 159 [154-179] | migliore; elementi 2023 → 1095 |
| T1 | «Fine», tocco / assestamento | 264 [251-279] / 222-244 (2374 el.) | 218 [182-228] / 88-128 (1138 el.) | migliore (assestamento: 2 giri analizzati) |
| T2 (t), tocco su una scheda | blocco massimo, ms | 448 [275-471] | 171 [143-182] | migliore; somma 840 → 436, rapporto 0,52 |
| T3 (t) | blocco massimo, ms | 417 [411-441] | 276 [271-330] | migliore; somma 1810 → 1231, rapporto 0,68 |
| T3 | sollevamento / rilascio / «Annulla» | 417 / 387 / 335 | 276 / 261 / 222 | migliori; elementi 2517 → 1223 |
| T6 = S3b (t), ridimensionamento | blocco massimo, ms | 429 [410-433] | 315 [302-332] | migliore; somma 3055 → 1945, rapporto 0,64 |
| S3c con copia (b), trascinamento al bordo | blocco massimo, ms | 415 [389-418] | 262 [256-276] | migliore; somma 1979 → 1356 |
| S3c | distanza massima copia-dito, px | 348 [263-382] | 246 [136-263] | non distinguibile, non peggiore |
| SW1, swipe singolo (b) | blocco massimo dopo l'atterraggio, ms | 93 [0-114] | 80 [75-93] | non distinguibile |
| SW2, lancio veloce (b) | idem | 98 [91-116] | 98 [92-117] | non distinguibile |
| SW3, doppio swipe (b) | idem | 101 [89-129] | 92 [76-165] | non distinguibile |
| SW1-SW3 | fps nello scorrimento (mediane) | 72-83 | 65-85 | non distinguibili; sotto 72 solo il primo lancio di SW3 (72 contro 65, min 36-38 in entrambe) |
| JUMP, tocco su un pallino a +6 pagine (b) | blocco massimo al tocco, ms | 68 [0-73] | 189 [111-197] | **peggiore** (sblocco di 6 pagine in un colpo) |

Tabelle complete: `tabella-ab-t.md`, `tabella-ab-b.md`, `tabella-ab-r4.md`.

- **O1 non è raggiunto da R2 da sola.** Con la finestra nessun blocco scende sotto 100 ms: il più corto è T2 con 143-182 ms. I blocchi che pesano di più restano il sollevamento, il rilascio e il ridimensionamento (262-332 ms).
- **O5 (base misurata).** Gli swipe hanno già oggi un blocco di 93-101 ms dopo l'atterraggio (min-max fino a 129 ms): il limite «oltre 50 ms» non è raggiungibile nemmeno dalla base. Il criterio praticabile è «non peggiore della base», che la finestra rispetta.

### Verifica a vista (schermate in `vis/`)

Screencast del compositore (640 px) più un registratore in pagina che conta i fotogrammi in cui una pagina con `data-far` si sovrappone allo schermo. Montaggi: `ovpan-win-fast.jpg`, `swipe-win-double.jpg`, `edge-win-1.jpg`, `edge-win-2.jpg`, `jump-win-1.jpg`, `jump-win-2.jpg`; vista pagine ferma `a2-vista-pagine.jpg`.

- Vista pagine aperta: scheda centrale e vicine piene.
- Schede trascinate lente e veloci (due trascinamenti rapidi andata e ritorno): nessuna scheda vuota; 0 fotogrammi con pagina saltata sullo schermo su 867.
- Swipe singolo, lancio, doppio e triplo lancio, trascinamento lento: nessuna pagina vuota; 0 su 1731 fotogrammi.
- Trascinamento di un widget ai due bordi, rilascio e «Annulla»: pagine piene; 0 su 505.
- **Salto lungo con la sola finestra «in direzione di marcia»: pagine vuote** (8 fotogrammi nei tre tocchi, `jump-win-1.jpg` mostra pagine intere senza celle né widget). Con lo sblocco dell'intero intervallo prima dello scorrimento: 0 su 557 (`jump-win-2.jpg`), ma il tocco costa di più (189 contro 68 ms) e le schermate mostrano le pagine ferme per una ventina di fotogrammi prima che lo scorrimento parta. Con la tappa R10 (salto diretto, D-2) l'intervallo non si attraversa più e il problema sparisce.

### Altri punti del piano

- **Punto 3, R4.** T3 in modo t, 5 giri, finestra contro finestra + L1 (`is-dragging` solo sulle pagine ±1), + L3 (`user-select` costante), + L1 + L3: blocco massimo 243 [231-271] / 258 / 253 / 261, somma 958 / 1010 / 1065 / 934, elementi 1223 in tutti. **Tutte le differenze sono non distinguibili: R4 non è giustificata.**
- **Punto 4, H4 (ridimensionamento).** `Emulation.setDeviceMetricsOverride` 1024×665 con la pagina «Casa e info» (calendario, attività, widget di categoria) a distanza 2, poi due lanci. Con la finestra, a pagina saltata la griglia resta con la misura vecchia (larghezza 1183 contro 969), come previsto; **al primo fotogramma in cui la pagina è sullo schermo, griglia, calendario e attività hanno già le misure giuste** (0 fotogrammi sbagliati su circa 180, 3 giri, nessuna pagina saltata visibile). Costo: 2-5 task di 52-105 ms durante i due lanci contro 1 task di 50-56 ms della base. **Non misurato:** il numero di `setState` dei widget (nessuna build leggibile).
- **Punto 5, geometria su pagina saltata.** Lettura di griglia e celle su una pagina con `data-far`, in vista pagine e in modifica: **rettangolo non vuoto e uguale a quello senza finestra** (griglia 769×376 o 1183×579, celle 67 o 103 px); la prima lettura **forza il layout: 34-61 ms**, le successive 0-3 ms. Non ho eseguito i flussi veri «Sposta qui» e rilascio dal vassoio, ma solo la stessa lettura di geometria.
- **Punto 6, T2 (doppio ricalcolo).** In T2 base il primo blocco contiene due ricalcoli completi: uno da 192 ms su 2477 elementi **forzato dentro React** (microtask dopo il click, frame in `vendor-react`) e uno da 87 ms su 2492 elementi al fotogramma, dopo che il commit ha continuato a mutare. Con la finestra: 84 + 48 ms su 1629-1644 elementi, entrambi forzati. Con una sonda in pagina (ventisei API DOM più i getter di layout e i setter di `inert`, soglia 1,2 ms) **nessuna chiamata dell'app supera 1,2 ms**: la chiamata nativa che forza non è stata trovata. Il fuoco non cambia (resta su «Pagine») e non c'è `removeChild` lento sul banco, quindi la spiegazione `removeChild`/`focus()` della misura sui fixture **non vale per il banco**. Esito: **causa precisa non trovata**, circoscritta al commit di React dopo il click.
- **Punto 7, assestamento dopo «Fine».** Mutazioni isolate con ricalcolo forzato: `is-settling` sul pager 2,8 ms; `inert` sui 10 corpi 11,4 ms; `inert` sugli strati di celle 7,6 ms; tutte e tre insieme 13,5 ms. Il passaggio reale `is-closing` → `is-settling` vale 72,7 ms (33,2 con la finestra) e `is-overview` → `is-closing` 57,9 ms (31,5). Il blocco reale è di 170-190 ms di stile su 2374 elementi: **le mutazioni spiegano al massimo circa il 40 %**; il resto (fine delle transizioni, ricomparsa delle celle) non è stato scomposto. Esito: **spiegazione parziale**; con la finestra il blocco si dimezza (88-128 ms).

### Soglie di O1a (fissate dalle misure di questa sessione, modo t, rapporto sulla somma dei blocchi della base nella stessa sessione)

- **Vista pagine (apertura, tocco su una scheda, «Fine»):** somma dei blocchi ≤ **0,75** della base **e** blocco massimo ≤ **230 ms**. Misurato con la finestra: T1 0,70 [0,66-0,74] e 182-228 ms; T2 0,52 [0,50-0,54] e 143-182 ms.
- **Riposo e modifica (sollevamento, rilascio, ridimensionamento, «Annulla»):** somma ≤ **0,75** della base **e** blocco massimo ≤ **335 ms**. Misurato: T3 0,68 [0,64-0,72] e 271-330 ms; S3b 0,64 [0,58-0,66] e 302-332 ms; S3c 0,69 [0,66-0,72] e 256-276 ms.
- Sono soglie intermedie, non O1: la soglia assoluta di 100 ms resta aperta (vedi sopra). I valori assoluti dipendono dalla sessione (T3 con finestra: 276 ms in una sessione, 243 ms in quella di R4): fa fede il confronto nella stessa sessione.

### Esito per le decisioni

1. **Schede vuote a riposo o nell'uso normale: no.** Condizione di ADR-0018 soddisfatta, a patto che R2 sblocchi l'intero intervallo nei salti lunghi, oppure che R10 li renda istantanei.
2. **Finestra consigliata per R2:** riposo e modifica corrente ±1; scorrimento: intorno alla posizione ±1 più una pagina nella direzione di marcia, già al primo evento `scroll`; trascinamento di un widget: ±2 dall'inizio della sessione; vista pagine: schede visibili ±1 (cinque pagine sbloccate); tocco su un pallino lontano: tutto l'intervallo, fino a R10.
3. **R4: non giustificata** (L1 e L3 non distinguibili dalla sola finestra).

### Limiti e non eseguito

Gesti sintetici, nessun dito vero; compositore osservato con screencast a 30 fps circa (una pagina vuota di un solo fotogramma può sfuggire); solo il banco 0.9.26 con dati reali, nessun telefono né Chromium a 390 px; T1-T3 e S3b non in modo b; «Sposta qui» e rilascio dal vassoio non provati come flussi; `setState` dei widget non contati; scomposizione completa del settling e causa di T2 non trovate; T0b non eseguita (R5 e R9 restano senza giustificazione); nessuna prova di R2b. L'ordine dei giri alternati non elimina la deriva termica del tablet (T3 con finestra 276 contro 243 ms in due sessioni).

### Comandi

Script in `backup/issue-109/T0a/strumenti/`: `t0a-run.cjs` (campagne `ab-t` modo t su T1,T2,T3,T6; `ab-b` modo b su SW1,SW2,SW3,S3cD,JUMP; `ab-r4` modo t su T3 con quattro varianti), `sim.cjs`, `vis2.cjs`, `montage.cjs`, `h4.cjs`, `g5.cjs`, `t2-probe.cjs`, `anc.cjs`, `micro2.cjs`, `micro3.cjs`, `enrich.cjs`, `resum.cjs`, `agg2.cjs`, `quiet.cjs`; ripresi da `backup/piano-issue-109/misura/strumenti/`: `lib.cjs`, `scen.cjs`, `analyze-rep.cjs`, `ls-save.cjs`. `NODE_PATH=…/progetto/acasystem/node_modules`.

### Ripristino

Chiavi di layout salvate prima e confrontate dopo: invariate (36 chiavi, `ls-save.cjs --restore`: nessuna differenza; nessun token letto). Nessuna `<style id=ab-css>` né `data-far` residui, emulazione di dimensioni tolta, scala 1. Tolto `adb forward tcp:9225`; resta `adb reverse tcp:3002`. Il tablet è lasciato in uso sulla pagina «Luci e comandi» (all'inizio era nella vista pagine su «Principale»). Nessun server avviato da me. `git status`: le voci di codice invariate; nessun commit.

## Rettifiche successive

### 2026-10-23 — Tappe R1 e R3 realizzate (codice); misura sul tablet non eseguita

**Incarico e fonte.** Dopo le risposte dell'utente del 2026-10-22 (D-1 «Insieme alla pagina», D-2 «Salto diretto», D-3 risposta libera «quella meno pesante a livello di memoria», D-4 «Sì, proviamolo», D-5 «No», D-6 «Sì»; tappe: «Tutto il blocco»: T0a, R1, R3, poi R2, poi R8, salto diretto e R2b, R4/R5/R9 solo se le misure le giustificano, revisione Opus e banco finale con copia a freddo), il flusso di lavoro ha assegnato a questo passo solo R1 e R3. Le risposte riguardano le tappe successive e qui non sono applicate. La D-3 è stata interpretata dall'agente principale come «accettare un istante di scheda vuota senza allargare la finestra»: interpretazione correggibile dall'utente. Modello: Claude Code (claude-sonnet-5-5), subagente del flusso. Nessun commit, nessuna dipendenza nuova, nessun browser e nessun tablet.

**Copie PRIMA** (`backup/issue-109/pre/`): `R1/Pager.tsx`, `R1/PagerOverview.test.tsx`, `R1/PagerRestyle.test.tsx`, `R3/DragGhost.tsx`, `R3/launcher.css`.

**R1 — chiusura della vista pagine legata alla transizione vera** (`templates/launcher/Pager.tsx`).

- Il timer di sicurezza (`OVERVIEW_MS + 50`, costante `CLOSING_SAFETY_MS`) non parte più dal cambio di stato ma dal primo tra:
  - `transitionrun` o `transitionstart` di una `.aca-pager__page` (qualunque proprietà) o della `scale` di un `.aca-pager__body` (ascoltatori nativi sul pager, filtro `isCardTransition`);
  - il primo `requestAnimationFrame` dopo il commit di `closing`.
- Il rAF è lo stesso che già chiamava `endContentTransitions`: la richiesta resta una sola per chiusura (i test di `PagerRestyle` contano i fotogrammi in attesa). Senza `requestAnimationFrame` l'orologio parte subito.
- Tetto assoluto `CLOSING_CAP_MS = 3 × OVERVIEW_MS` dal cambio di stato, che non è mai il percorso normale.
- `onTransitionEnd` accetta, oltre alla fine del `translate` di una pagina, la fine della `scale` del corpo della pagina corrente (`.is-current`), che esiste anche senza pan né pagine vicine.
- `finishClosing` resta idempotente (l'aggiornatore è condizionato a `closing`) ed è ora definito prima dell'effetto che lo usa. Il vecchio `useEffect` del timer è stato assorbito dal nuovo effetto di layout. Alla fine della chiusura e allo smontaggio vengono tolti ascoltatori, tetto, orologio e rAF.
- Movimento ridotto invariato: `closing` non si attiva e la chiusura è immediata. Durate, curve e CSS invariati.

**R3 — sollevamento senza ricalcolo forzato** (`templates/launcher/DragGhost.tsx`, `templates/launcher/launcher.css`).

- `getComputedStyle(source)` è sostituito da `grid.style.getPropertyValue(...)` sulla griglia (`source.closest('.aca-launcher-grid')`) per `--aca-cell`, `--aca-gap-x` e `--aca-gap-y`, che `WidgetGrid.tsx:390-399` scrive inline. I valori sono quelli di prima e non si calcola nessuno stile.
- `--aca-radius-cell` non è inline: è dichiarato in CSS sulla griglia come `min(var(--aca-radius-card), calc(var(--aca-cell) * 0.24))`. La stessa dichiarazione è stata aggiunta a `.aca-drag-ghost` in `launcher.css`; la copia riceve `--aca-cell` inline e `--aca-radius-card` è sul `:root` in entrambi i temi (`tokens.css:166`, `skin.css:82`). Tra griglia e copia non c'è alcun override, quindi il raggio risolto è lo stesso. Per `mode` diverso da `move`, o senza widget, `--aca-cell` manca e la variabile resta non valida, come prima.
- `getRemoveBounds` (`LauncherScreen.tsx:509`) **non è stato toccato.** La geometria del cestino dipende dalla barra del widget, che cambia quando il sollevamento seleziona il widget (`onActivate`): misurarla una sola volta all'inizio potrebbe cambiarla, mentre il piano lo ammetteva solo «se il codice lo permette senza cambiare la geometria». Resta come lavoro successivo possibile.

**Test.**

- Nuovi in `__tests__/PagerOverview.test.tsx` (9, blocco «the closing of the overview follows the real transition»):
  - il timer conta dal primo fotogramma e non dal cambio di stato;
  - il primo `transitionrun` di una pagina lo avvia prima del fotogramma, e così la `scale` di un corpo;
  - un widget interno o un'altra proprietà del corpo non lo avviano;
  - senza fotogramma né transizione chiude al tetto (3 × 360 ms);
  - una pagina sola, o un centro senza vicine, chiude entro 410 ms dal primo fotogramma;
  - la fine della `scale` del corpo al centro chiude subito, quella di una scheda laterale no;
  - «Fine» subito dopo l'apertura non resta in chiusura;
  - la vista pagine riaperta durante la chiusura non lascia timer (`vi.getTimerCount() === 0` dopo lo smontaggio).
- Nuovi in `__tests__/DragGhostLift.test.tsx` (5):
  - la copia ha cella e spaziature della griglia;
  - nessuna chiamata a `getComputedStyle` né a `getBoundingClientRect` al sollevamento;
  - widget assente o valori vuoti lasciano la copia nuda;
  - la copia viene tolta a fine sollevamento;
  - il raggio della copia ha la stessa espressione di quello della griglia (lettura del testo di `launcher.css`).
- Test esistenti non modificati.

**Comandi ed esiti** (cartella `progetto/acasystem/frontend`; Vitest sempre con `--maxWorkers=4`, a gruppi, mai la suite completa):

| Controllo | Esito |
|---|---|
| `vitest run PagerOverview PagerRestyle` | 48 verdi (rieseguito dopo la correzione di tipo) |
| `vitest run DragGhostLift` | 5 verdi |
| `vitest run PagerOverview PagerRestyle PagerBands LagLayers OverviewPan LauncherDragDrop LauncherGestures DragGhostLift` | 8 file, 206 verdi |
| `vitest run LauncherScreen FixLauncherUiShell LauncherGridGeometry FixWidgetsVisibility Casa3dShell Casa3dPage Casa3dVista Polish2LauncherScreen PolishLauncherScreen` | 9 file, 214 verdi |
| `npm run typecheck` | verde, dopo un primo errore di tipo nel filtro `isCardTransition` (tipo `TransitionEvent` di React al posto di quello del DOM), corretto |
| `npm run lint` (intero `src`) | verde |
| `npm run lint:typography`, `npm run lint:theme-colors` | 0 violazioni |
| `npm run i18n:check` | 4 verdi |
| `npx vite build --outDir backup/issue-109/dist-r1r3 --emptyOutDir` | costruita; `dist/` non toccata. L'avviso sui chunk oltre 500 kB (`index` 829 kB, `hls` 575 kB) riguarda moduli non toccati da questo passo. |

**Non eseguito:** suite completa in due shard, `scripts/check-bundle-size.mjs` e **tutta la misura sul tablet** (in questo passo non c'erano né tablet né browser). I criteri «Fatto quando» di R1 (0 `transitioncancel` in 5 giri alternati, chiusura mai al tetto, nessuno stato bloccato in S7) e di R3 (0 ricalcoli forzati da `DragGhost`, nessun aumento del blocco successivo né della somma dei blocchi, copia identica a vista) sono quindi **verificati solo a livello di test, non sul tablet**. Il guadagno in durata di R3 resta incerto (valutazione 2). La build `dist-r1r3` contiene R1 e R3 insieme: non sono state costruite varianti separate, quindi la misura prevista (base, R1, R3, R1+R3 alternate) richiede due build in più oppure si limita a base contro R1+R3.

**Limiti.**

- Che il rAF cada insieme all'avvio della transizione è un'ipotesi da verificare in misura. Se in un giro la chiusura fosse ancora tagliata, l'orologio andrebbe agganciato al solo `transitionrun`.
- I test usano orologi finti e non provano il ritmo reale.
- Il working tree aveva già 455 voci non committate all'avvio del passo (il piano ne riportava 453). Il passo ha aggiunto il solo file di test `DragGhostLift.test.tsx` e modificato `Pager.tsx`, `DragGhost.tsx`, `launcher.css` e `PagerOverview.test.tsx`, oltre a questa annotazione.

**Punto di ripresa.** Misura sul tablet di R1+R3 insieme a T0a, poi R2 secondo l'ordine del piano, dopo l'accettazione esplicita di ADR-0018 da registrare con la fonte umana. Ritorno indietro: ripristino dei file da `backup/issue-109/pre/R1` e `backup/issue-109/pre/R3`.

### 2026-10-23 — Tappa T0b eseguita (sola misura): H1, H3 e H5; esito su R5 e R9

**Incarico e fonte.** Le risposte dell'utente del 2026-10-22 (D-1…D-6 e «Tutto il blocco», riportate in «Risposte dell'utente») autorizzano «R4/R5/R9 solo se le misure le giustificano»; T0b è la misura che decide R5 e R9 (D-3 resta l'interpretazione dell'agente principale, qui non usata). Esecutore: Claude Code (claude-sonnet-5-5), subagente del flusso. Sola misura sul Tab M11, banco 0.9.26 su `http://localhost:3002` (`adb reverse tcp:3002`, CDP con `adb forward tcp:9225`), schermo acceso, `visibilityState` visibile, nessun tocco dell'utente (controllo `pointerdown` a ogni giro: 0 giri invalidi). **Nessun file dell'app modificato, nessun commit, nessuna dipendenza.** La base è il banco 0.9.26 così com'è (nessuna build sulla 3013). Il working tree contiene il codice di R1/R3, che il banco non ha. Script, dati e tabelle in `backup/issue-109/T0b/` (`strumenti/`, `h1/`, `h3/`, `h5/`, `tabella-ab-isx.md`, `tabella-ab-has.md`). Copia PRIMA di questo report: `backup/issue-109/T0b/REP-20261022-002.prima.md`.

**Metodo e deviazioni.**
- Regola statistica del piano per gli A/B: 5 giri alternati + giro 0 a parte, mediana [min-max], guadagno solo con intervalli non sovrapposti. Il confronto che conta è con il **controllo** (stesso CSS reiniettato senza modifiche), non con la base, perché la sola reiniezione sposta già un poco i tempi.
- H1 e H3 sono descrittivi. H3 usa un hook React minimo (`h3-hook.js`) aggiunto con `Page.addScriptToEvaluateOnNewDocument` e una ricarica, **rimosso e ricaricato a fine misura** (verificato: `window.__RCH` assente). L'hook cammina i fiber di ogni commit e aggiunge qualche ms ai task con commit (non quantificato). Nomi dei componenti non disponibili (banco minificato): i commit si attribuiscono per pagina e numero di componenti funzione rifatti.
- Nel banco il tocco vero sul bottone «Modifica la disposizione» cade sulla pagina: l'ingresso in modifica in H1 è fatto con un click da script, come nei set-up dei piani precedenti.
- Tablet: nessun incidente. Due prove mie scartate e rifatte: il confronto di equivalenza contava anche il mio `<style>` iniettato (indici sfalsati di uno) e i `url()` relativi di `@font-face` non erano resi assoluti (font diverso, larghezze diverse). Entrambi corretti nello strumento e verificati (0 differenze).

#### Punto 1 — H1: quali mutazioni rendono «vero» il ricalcolo

Registrate con MutationObserver le mutazioni nette dei gesti veri e riprodotte una per volta sugli stessi elementi, con ricalcolo forzato (`documentElement.getBoundingClientRect()`) e traccia per elementi e ms (mediana di 9; tetto di 10 gruppi, più «resto» e «tutte»). Costo in ms [min-max] / elementi ricalcolati.

Ingresso in modifica (206 mutazioni grezze, 137 nette, 34 gruppi; ricalcolo vero nella traccia: 128-138 ms su 1939 elementi):

| Mutazione (gruppo) | ms [min-max] | elementi |
|---|---|---|
| `is-editing` sulle 9 griglie | 32 [32-33] | 1088 |
| `is-editing` sui 26 widget | 17 [17-19] | 267 |
| `data-editing` sui 17 widget di categoria | 12 [11-12] | 553 |
| `disabled` su 9 `button.aca-m` | 11 [11] | 207 |
| `disabled` su 5 `ctl-widget__open` | 6 [6] | 201 |
| `inert` su 19 `div.aca-m` | 4 [4] | 74 |
| `data-editing` su 6 `utility-card` | 4 [4] | 155 |
| altri 3 gruppi (≤ 1 ms) | circa 1 | ≤ 7 |
| resto (24 gruppi minori) | 43 [42-44] | 1404 |
| **tutte le mutazioni di attributo insieme** | **57 [54-58]** | 1717 |
| **solo inserimento di circa 93 elementi** (copie di celle nello strato celle) | **62 [62-63]** | **2480** |
| tutte + inserimenti | 72 [71-103] | 2620 |

Sollevamento (58 grezze, 38 nette, 29 gruppi; ricalcolo vero: 263-316 ms su 2517 elementi):

| Mutazione | ms [min-max] | elementi |
|---|---|---|
| `is-dragging` sulle 10 griglie | **131 [130-135]** (prima volta 146) | 1377 |
| `is-dragging` sui widget | 4 | 26 |
| `is-selected`, `is-locked`, barra della modifica nascosta (`inert`, classe), `hidden`, ecc. | ognuna ≤ 5 | ≤ 40 |
| tutte le mutazioni di attributo insieme | 155 [140-159] | 1489 |
| inserimenti (copia del trascinamento, circa 93 elementi) | 18 [17-19] | 29 |
| tutte + inserimenti | 159 [150-163] (prima volta **250**) | 1518 |

Letture (osservazioni):
- **Nessuna mutazione sola riproduce il ricalcolo vero.** Nel sollevamento una sola ne spiega quasi tutto tra le mutazioni di attributo: `is-dragging` su tutte le griglie (131 su 155 ms, 95 µs per elemento contro 30 µs di `is-editing` sulle griglie). È la leva L1 di R4, che T0a ha trovato non distinguibile **sopra** la finestra di R2: senza R2 pesa metà del sollevamento, con R2 le griglie lontane non contano più.
- Le sole mutazioni di attributo riproducono circa il 40-55 % del tempo vero e l'80-90 % degli elementi. Il resto va a inserimento e rimozione di nodi e alla **prima volta** (cache fredde: il sollevamento «tutte + inserimenti» costa 250 ms la prima volta contro 159 a regime, vicino ai 263-316 del gesto vero). H1 è spiegata in buona parte: non un solo colpevole ma un insieme di classi su molti elementi, più nodi inseriti, più cache fredda. Valutazione, non prova: l'ingresso in modifica resta spiegato solo per metà (72 contro 128-138 ms).
- **Scoperta non prevista dal piano: inserire o togliere nodi ricalcola quasi tutto il documento.** Inserire circa 93 elementi nello strato celle costa 54-62 ms e 2480 elementi, senza cambiare nessuno stile. Togliendo dal CSSOM **tutte** le 37 regole con `:has()` il costo scende da circa 60 a 4-5 ms; toglierne una sola non cambia nulla e tenerne una sola costa al massimo 14 ms (le sei regole `.aca-launcher-widget__frame:has([data-widget-open]…)` pesano di più). La traccia delle invalidazioni mostra 28 «pseudo has» pianificati su `MAIN.aca-shell__main` e un ricalcolo di tutto il sottoalbero di `main`. Le tre regole `.aca-shell__main:has(> .aca-pager.is-…)` di `edit.css` da sole **non** sono la causa (tolte: 2480 contro 2476 elementi). Meccanismo non spiegato.
- Una mutazione di classe o attributo senza regola costa 0-0,1 ms.

#### Punto 2 — H3: commit di React

Hook su 5 giri di T3 (più il giro 0) e su 2 finestre di 60 s a riposo.

| Condizione | Commit | Altro |
|---|---|---|
| A riposo, «Luci e comandi», 60 s | 4 (0,07/s) | 0 messaggi WebSocket, 0 risorse, un solo task oltre 50 ms (51,7), thread occupato 0,57 % |
| A riposo, «Clima», 60 s | 63 (1,05/s): l'orologio | 6 [5-154] componenti rifatti, 1 pagina, task da 3,4 ms; thread occupato 4,25 % |
| T3, per gesto (5 giri) | 13 [12-14] | vedi sotto |

- **H3 non si manifesta su questo banco**: in 120 s a riposo non è arrivato nessun messaggio dal WebSocket HA (`/ha/api/websocket`) e i commit a riposo sono quelli dell'orologio. Limite: con dispositivi HA che cambiano stato di continuo il quadro sarebbe diverso; non misurabile qui senza impianti reali né iniezioni.
- **Commit grandi in T3** (almeno 500 componenti funzione rifatti; mediana [min-max], giri 1-5; il task è quello che contiene il commit):

| Commit | Componenti rifatti | Pagine | Task (ms) | Script (ms) | Stile (ms) |
|---|---|---|---|---|---|
| sollevamento | 1445 | 9 | 372 [358-376] | 48 [46-49] (13 %) | 305 [296-309] |
| rilascio, 1° (atterraggio) | 1446 | 10 | 64 [59-65] | 55 [53-59] (86 %) | 0 |
| rilascio, 2° (fine dell'atterraggio) | 761 | 9 | 30 [29-35] | 29 [28-33] (96 %) | 0 |
| «Annulla» | 1446 | 10 | 289 [287-299] | 48 [46-54] (17 %) | 199 [191-204] |

  Gli altri commit (selezione per tenuta: 154 componenti, 8 ms; trascinamento: 193 componenti, 9-11 ms ciascuno) sono piccoli. Il «secondo giro completo» dopo l'atterraggio descritto dal piano **esiste** (761 componenti, 9 pagine, 29 ms di script) ma non è un blocco lungo.
- Lo script di React vale in totale circa 180 ms su una somma dei blocchi di T3 di circa 1,8 s (10 %). I blocchi lunghi restano ricalcoli di stile (305 e 199 ms).

#### Punto 3 — H5: costo per elemento

**Selettori.** Dei 692 selettori della traccia strumentata del 2026-10-22, 63 sono provati su quasi ogni elemento (almeno 7000 tentativi): 103 ms su 192 ms di tempo di abbinamento strumentato. 61 su 63 sono ricondotti a file e riga (elenco in `h5/selectors-top63.json`): 38 con `:is(`, 7 con `:has(`. File: `themes/acasystem/material.css` 19, `templates/launcher/launcher.css` 16, `components/widgets/controls/controls.css` 4, `components/system/edit/edit.css` 3, `casa3d/casa3dPage.css` 2, `templates/app-shell/appShell.css` 2, altri uno ciascuno. Il tempo di abbinamento strumentato è circa il 5 % del tempo di ricalcolo della stessa traccia (192 ms su 3436 ms, con sovraccarico): il margine massimo di una riscrittura dei selettori è di pochi punti percentuali.

**Proprietà personalizzate ereditate.** Ogni elemento porta da 163 (html) a 215 (foglie dei widget) proprietà personalizzate; 274 nomi distinti dichiarati, 147 sulla radice, di cui 17 mai usate (48 in tutto): `h5/vars-census.json`. Prova dose-risposta con K proprietà fittizie su `<html>`, mediana di 9 ms di un ricalcolo forzato:

| Mutazione | K=0 | K=150 | K=450 |
|---|---|---|---|
| `is-dragging` sulle griglie | 69-74 | 83 | 104 |
| `is-overview` sul pager | 15-16 | 19 | 24 |
| `is-editing` sulle griglie | 31-33 | 32 | 35 |
| `is-editing` sui widget | 15 | 16 | 16-17 |

Il costo cresce con il numero di proprietà (circa 0,07 ms per proprietà per `is-dragging`, 0,02 per `is-overview`), ma togliere le 17 morte della radice (o le 48 morte in tutto) varrebbe circa 1-4 ms su `is-dragging` (5 % al massimo) e meno di 1 ms su `is-overview`: sotto il rumore.

**A/B dei selettori `:is()`** (base = CSS originale; ctl = lo stesso CSS reiniettato senza modifiche; isx = reiniettato con ogni `:is(...)` espandibile **esattamente** in una lista di selettori; modo t, 5 giri alternati più il giro 0; `tabella-ab-isx.md`). Riscrittura: 112 regole su 136 con `:is(` espanse (307 selettori in uscita); 24 non toccate (23 con argomenti di specificità diversa, 1 non semplice). **Equivalenza**: stile calcolato di tutti gli elementi (2966 in uso, 3021 in modifica, 3076 in vista pagine) e dei loro `::before`/`::after` con contenuto, con le animazioni ferme a 0: **0 differenze** per ctl e isx rispetto alla base. Schermate delle 10 pagine: 8 con **0 pixel diversi**; «Copertina» e «Casa e info» differiscono solo nelle zone con SVG animati, le stesse in cui due schermate della base differiscono tra loro. Gli stati dinamici (`:hover`, `:active`, `:focus-visible`, `:checked`) non sono verificati a runtime: li garantisce solo l'equivalenza per costruzione (argomenti di uguale specificità). Risultato (mediana [min-max]):

| Scenario / misura | base | ctl | isx | isx contro ctl |
|---|---|---|---|---|
| T1 blocco massimo (ms) | 266 [257-294] | 261 [253-268] | 247 [242-254] | sovrapposti (253-254) |
| T1 somma dei blocchi (ms) | 1054 [948-1117] | 1030 [1003-1099] | 940 [914-1015] | sovrapposti |
| T1 ms di stile (da traccia) | 521 [503-564] | 508 [500-524] | 469 [460-481] | **non sovrapposti, −8 %** |
| T3 blocco massimo (ms) | 403 [390-412] | 400 [296-404] | 380 [295-384] | sovrapposti |
| T3 somma dei blocchi (ms) | 1670 [1483-1706] | 1700 [1158-1763] | 1612 [1166-1687] | sovrapposti |
| T4 (foglio) blocco massimo (ms) | 268 [261-277] | 258 [252-273] | 246 [237-263] | sovrapposti |
| Elementi ricalcolati (T1, T3, T4) | 2481 / 2517 / 2914 | uguali | uguali | identici |

  Il numero di elementi ricalcolati non cambia; l'unico guadagno distinguibile dal controllo è −8 % sui ms di stile di T1 (circa −40 ms di stile su un gesto di 1 s), non distinguibile sul blocco massimo, sulla somma, in T3 e in T4. T3 mostra una deriva tra giri (290-410 ms nello stesso gruppo) che allarga gli intervalli.

**Diagnostica `:has()` (fuori dai punti del piano, aggiunta perché H1 l'ha fatta emergere).** Variante `nohas`: dal CSS reiniettato sono tolte tutte le 37 regole che contengono `:has(`. **Non è una soluzione:** l'aspetto cambia (anello di focus degli slider, stati premuti dei widget, ecc. si perdono) ed è solo un limite superiore. Confronto con il controllo `ctl` (CSS reiniettato intatto), modo t, 5 giri alternati più il giro 0, `tabella-ab-has.md`:

| Misura (mediana [min-max]) | ctl | nohas | Esito |
|---|---|---|---|
| T1 blocco massimo (ms) | 259 [237-265] | 229 [222-233] | migliore (−12 %) |
| T1 somma dei blocchi (ms) | 1025 [903-1057] | 737 [689-853] | migliore (−28 %) |
| T1 elementi ricalcolati (somma) | 7271 [7215-7286] | 3570 [3570-3614] | −51 % |
| T3 blocco massimo (ms) | 382 [310-400] | 277 [265-292] | migliore (−27 %) |
| T3 somma dei blocchi (ms) | 1646 [1524-1719] | 1118 [1082-1182] | migliore (−32 %) |
| T3 sollevamento, blocco massimo (ms) | 381 [310-400] | 268 [250-273] | migliore |
| T3 «Annulla», blocco massimo (ms) | 292 [207-303] | **101 [92-104]** (66 elementi invece di 2487) | migliore |
| T3 rilascio, blocco massimo (ms) | 382 [252-389] | 277 [265-292] | non distinguibile |
| T3 elementi ricalcolati (somma) | 8037 [8011-8076] | 3597 [3588-3637] | −55 % |

In una prova a parte (inserimento di circa 93 elementi, ricalcolo forzato) il costo cade da 72 a circa 4 ms togliendo le **19 regole `:has()` a livello di widget** (8 `.aca-launcher-widget__frame:has([data-widget-open]…)` e simili in `launcher.css`, 4 `.ctl-widget…:has(…)` in `controls.css`, 7 in `adaptiveWidget.css`, `media.css` e `home.css`); gruppi più piccoli, da soli, non bastano (frame 56, ctl 78, widget 57, k2 67, shell 61 ms). È l'effetto più grande misurato finora per un singolo intervento CSS, ben maggiore di quello di R4, R5a e R9 sui selettori `:is()`. **Limiti:** meccanismo non spiegato (perché ogni nodo inserito o tolto sotto `main` riconvalidi il sottoalbero), tutto misurato dopo reiniezione del CSS (il confronto è con il controllo, non con la base), nessuna versione equivalente a vista scritta o misurata. Non è una tappa autorizzata né nel piano: va decisa dall'utente (vedi «Esito per le decisioni»).

#### Esito per le decisioni

1. **R5 (React, stato del tocco).** La condizione del piano ha due gambe. (a) Commit da HA a banco fermo frequenti: **no** (0 messaggi in 120 s; commit a riposo solo dell'orologio). (b) Script di React per selezione, atterraggio o «Annulla» come parte distinguibile dei blocchi: **sì, ma piccola**: i commit grandi rifanno 1445-1446 componenti su 9-10 pagine e costano 48 ms (sollevamento, 13 % del blocco da 372), 55 e 29 ms (due task di rilascio, già sotto 100 ms) e 48 ms («Annulla», 17 % del blocco da 289), con ampiezza min-max di 3-8 ms. Il limite superiore del guadagno di R5a, sottraendo il costo di un commit piccolo (circa 8 ms), è di circa 40 ms sul sollevamento e su «Annulla» (11-14 %), 47 + 21 ms sui due task di rilascio: maggiore dell'ampiezza min-max delle basi (13-18 ms), quindi **un guadagno sarebbe distinguibile**, ma **nessun blocco scenderebbe sotto 100 ms** (resterebbero 330 e 250 circa, prima ancora di R2). R5b resta rinviata. R5a **toccherebbe** `templates/launcher/LauncherScreen.tsx`, `LauncherUiContext.tsx`, `WidgetHost.tsx`, `WidgetGrid.tsx` (ed eventualmente un nuovo `hooks/launcher/useLauncherSelection.ts`): rischio medio, la tappa più ampia. **Giudizio: condizione formale soddisfatta, beneficio marginale e non risolutivo per O1; la scelta se farla è dell'agente principale/utente.** Un guadagno vero si può dichiarare solo dopo la misura A/B della tappa (5 giri, intervalli non sovrapposti).
2. **R9 (costo per elemento).** **Non giustificata nelle due forme del piano.** (a) Riscrittura dei `:is()` (112 regole espandibili, in `themes/acasystem/material.css` 74 occorrenze, `templates/launcher/launcher.css` 31, `themes/kit2/skin.css` 18, `themes/acasystem/components.css` 11, `components/system/edit/edit.css` 7, altri): a vista identica (0 differenze di stile calcolato, 0 pixel diversi), ma contro il controllo l'unico guadagno distinguibile è −8 % sui ms di stile di T1; blocco massimo, somma, T3 e T4 non distinguibili; elementi ricalcolati invariati. (b) Proprietà personalizzate ereditate: al massimo 1-4 ms (≤ 5 %) togliendo le 17-48 morte. **R9 così com'è non va fatta.** Se l'utente vuole la leva del costo per elemento, quella misurata è un'altra: le regole `:has()` a livello di widget (sopra), che sarebbe una tappa nuova (riscrittura con classi/attributi scritti dal componente, verifica a pixel di ogni pagina e degli stati `:active`/`:focus-visible`), con rischio medio perché tocca `launcher.css`, `controls.css`, `adaptiveWidget.css`, `media.css`, `home.css` e i componenti che oggi si affidano a `:has()`.
3. **R4** resta non giustificata (T0a); H1 conferma che `is-dragging` sulle griglie pesa metà del sollevamento solo senza la finestra di R2.
4. **Sequenza consigliata:** invariata fino a R2; la misura post-R2 dirà se `:has()` pesa ancora (con la finestra gli elementi per ricalcolo scendono, ma l'inserimento di nodi sotto `main` ricalcola comunque tutta la pagina visibile).

#### Limiti e non eseguito

Gesti sintetici, nessun dito vero; H3 senza HA attivo e con banco minificato (nessun nome di componente, nessun conteggio di `setState` dei widget); l'ingresso in modifica è spiegato solo per metà (72 su 128-138 ms); meccanismo del ricalcolo da `:has()` non spiegato; stati dinamici (`:hover`, `:active`, `:focus-visible`, `:checked`) della riscrittura `:is()` non verificati a runtime; il confronto `:has()` è un limite superiore con aspetto alterato; T4 e T3 con deriva tra giri; deriva termica non eliminata dall'alternanza; T0b non include il ritorno da Sistema (T5) né il telefono. Tetto di 1,5 ore rispettato (circa 70 minuti di orologio, incluse le prove scartate).

#### Comandi

Script in `backup/issue-109/T0b/strumenti/`: `h1.cjs` (registrazione e riproduzione delle mutazioni, `edit` e `lift`), `h1-child-inv.cjs`, `h1-has.cjs`, `h1-has2.cjs` (diagnostica `:has()`), `h3.cjs` e `h3-hook.js`, `h3-analyze.cjs`, `h5-vars.cjs`, `h5-sel.cjs`, `isx.cjs` (varianti base/ctl/isx/nohas), `h5-check.cjs` e `h5-bbox.cjs` (equivalenza e pixel), `t0a-run.cjs` (runner A/B, `node t0a-run.cjs T1,T3,T4 base,ctl,isx 5 t ab-isx` e `node t0a-run.cjs T1,T3 ctl,nohas 5 t ab-has`), `enrich.cjs`, `resum.cjs`, `agg2.cjs`; ripresi da T0a: `lib.cjs`, `scen.cjs`, `lib-tr.cjs`, `analyze-rep.cjs`, `ls-save.cjs`, `quiet.cjs`. `NODE_PATH=…/progetto/acasystem/node_modules`.

#### Ripristino

Hook di H3 rimosso e pagina ricaricata (`window.__RCH` assente); nessun `<style id=isx-css>` né `<style id=ab-css>` residuo; tutte le regole CSSOM tolte nelle diagnostiche sono state rimesse (e comunque scompaiono con una ricarica); chiavi di layout confrontate a fine di ogni campagna: invariate (36 chiavi, nessun token letto); scala della pagina 1; `adb forward tcp:9225` tolto a fine misura; resta `adb reverse tcp:3002`. Nessun server avviato da me. `git status`: stesso numero di voci di prima della tappa (456), nessun file dell'app toccato; nessun commit.

### 2026-10-23 — Tappa R2 realizzata (codice, livello 1 di ADR-0018); misura sul tablet non eseguita

**Incarico e fonte.** Dopo le risposte dell'utente del 2026-10-22 (D-1 «Insieme alla pagina», D-2 «Salto diretto», D-3 risposta libera «quella meno pesante a livello di memoria», D-4 «Sì, proviamolo», D-5 «No», D-6 «Sì»; tappe: «Tutto il blocco» con il testo «T0a, R1, R3, poi R2 (accetto ADR-0018 se T0a non mostra schede vuote), poi le tappe delle tue risposte (R8, salto diretto, R2b), R4/R5/R9 solo se le misure le giustificano, revisione Opus e banco finale con copia a freddo»), il flusso ha assegnato a questo passo solo R2, livello 1, con la finestra consigliata da T0a. La condizione di ADR-0018 è stata verificata da T0a (vedi «Annotazione T0a»). D-3 è l'interpretazione dell'agente principale, correggibile dall'utente: qui significa che la finestra della vista pagine **non è stata allargata** per evitare l'istante di scheda vuota in uno scorrimento molto veloce delle schede. Modello: Claude Code (claude-sonnet-5-5), subagente del flusso. Nessun commit, nessuna dipendenza nuova, nessun browser, nessun tablet (una misura sul tablet era in corso).

**Copie PRIMA** (`backup/issue-109/pre/R2/`): `Pager.tsx` (con R1), `launcher.css` (con R3), `useOverviewPan.ts`, `LauncherScreen.tsx`, `OverviewPan.test.tsx` (ricostruita togliendo il solo test aggiunto, perché la copia è stata fatta dopo la modifica).

**Che cosa è stato fatto.**

- **`templates/launcher/Pager.tsx`.** Ogni `<section>` riceve `data-far=""` se sta fuori dalla finestra; l'albero React non cambia (nessuna pagina smontata, contesti `PageVisibilityContext` e `PageNearContext` invariati, `inert` e `aria-hidden` invariati). La finestra è calcolata da due funzioni pure esportate:
  - `restWindow(count, index, reach, dragging)`: a riposo e in modifica la pagina corrente ±1; con `reach` (ciò che lo scorrimento ha attraversato dall'ultima quiete: pagina più bassa, più alta, direzione) diventa `[min(corrente, floor(p)) - 1, max(corrente, ceil(p)) + 1]` più una pagina nella direzione di marcia; con un widget trascinato, corrente ±2.
  - `overviewWindow(count, index, frame, pan, cardDrag)`: in vista pagine e mentre le schede tornano (`closing`), le schede visibili ±1. La scheda è visibile se `|distanza| < (larghezza × (1 + k) / 2) / passo`, con distanza = posizione − centro + spostamento della scheda trascinata + (pan + scostamento della scheda sollevata) / passo. Con 1280 px sul Tab M11 sono cinque pagine su dieci, come in T0a. Finché le schede non sono misurate non si salta nulla.
  - **Estensione al primo scroll.** `onScroll` chiama `follow(scrollLeft)`, che allarga `reach` già al primo evento (non al settle): unione di ciò che è stato attraversato e direzione dall'ultimo spostamento. Al settle (90 ms dopo l'ultimo evento) `reach` torna nullo nello stesso batch dell'indice nuovo. Lo stato è scritto solo se `reach` cambia (confronto con un ref), quindi la maggior parte degli eventi non fa render.
  - **Pallino lontano.** Un indice che arriva da fuori (non dallo scroll: `indexRef` non lo conosce ancora) e non è un salto istantaneo (movimento ridotto, tastiera) scrive in `reach`, **durante il render**, tutto l'intervallo tra l'indice precedente e il nuovo: l'intervallo è già disegnato nel commit che cambia l'indice, prima che parta `scrollTo`. Il salto istantaneo (movimento ridotto, tastiera, pagine cambiate, chiusura della vista pagine, launcher coperto) non ha intervallo: la pagina di arrivo ±1 è nella finestra dello stesso commit, prima della scrittura di `scrollLeft`; il layout effect azzera `reach` se il ramo è risultato istantaneo. R10 (salto diretto) potrà togliere l'intervallo del ramo animato.
  - Per la vista pagine, `measureCards` restituisce anche la larghezza e `measure` tiene `frame` (larghezza, k, passo arrotondati come negli stili) in uno stato che non cambia se i numeri sono gli stessi.
  - Nuova proprietà opzionale `dragging` (widget trascinato) per la finestra ±2.
- **`hooks/launcher/useOverviewPan.ts`.** Nuova opzione facoltativa `onPan(pan)`: chiamata nel fotogramma in cui il pan è scritto e con 0 quando il pan torna a riposo. Il Pager la converte in passi di mezzo passo, quindi la finestra cambia appena la scheda in vista cambia (circa mezzo passo), con un solo `setState` per passo.
- **`templates/launcher/launcher.css`.** Una regola: `.aca-pager__page[data-far] > .aca-pager__body > .aca-pager__clip { content-visibility: hidden; }`. È l'unico uso di `content-visibility` e l'unica regola che usa l'attributo.
- **`templates/launcher/LauncherScreen.tsx`.** Una riga: `dragging={Boolean(drag.session)}` sul Pager. Non si usa `locked` perché vale anche per i nomi in modifica, il trascinamento delle schede e la Casa 3D in Esplora (`pageLocks`), che non devono sbloccare cinque pagine.
- **Non toccati:** `PageShell`, `WidgetGrid.tsx`, `AdaptiveCategoryWidget`, `useMeasuredHeight`, Casa 3D, i contesti, l'aspetto, le durate e le curve.

**Decisioni di tappa, con il motivo.**

1. **Geometria su pagina saltata: nessuno sblocco esplicito.** Il piano lo ammetteva «secondo l'esito di T0a punto 5»: lì il rettangolo di griglia e celle su una pagina con `data-far` era non vuoto e uguale a quello senza finestra (la prima lettura forza il layout, 34-61 ms). In più le letture reali sono coperte dalla finestra: `moveToAdjacentPage` e il trascinamento al bordo leggono pagine a distanza ≤ 2, tutte disegnate; «Sposta qui» è sulla pagina corrente. I flussi veri «Sposta qui» e rilascio dal vassoio su una scheda lontana **non** sono stati provati (T0a non li aveva provati). Se in misura la prima lettura su una scheda lontana pesasse, la leva è sbloccare quella pagina prima della lettura.
2. **`WidgetGrid.tsx` non toccato.** T0a punto 4 non ha trovato fotogrammi con misure sbagliate (0 su circa 180, 3 giri). Resta il margine di una pagina: la pagina si sblocca almeno una pagina prima di poter essere vista, quindi i ResizeObserver di `WidgetGrid`, `AdaptiveCategoryWidget` e `useMeasuredHeight` hanno il tempo di notificare e di aggiornare lo stato. **Non verificato sul tablet in questa tappa.**
3. **Aggiornamento a riposo con `setState`, non `flushSync`.** Lo sblocco al primo scroll è un aggiornamento normale di React, che si compie pochi ms dopo l'evento. È sufficiente perché la finestra ha sempre almeno una pagina di margine oltre quella che la posizione può mostrare. Va confermato dalle immagini del tablet (nessuna pagina vuota) e dai task dopo l'atterraggio.
4. **Il primo `pointerdown` sul pager non sblocca niente** (è la leva di R2b, livello 2).

**Test** (cartella `progetto/acasystem/frontend`; Vitest sempre con `--maxWorkers=4`, a gruppi mirati, mai la suite completa).

- Nuovo `__tests__/PagerFarPages.test.tsx` (38 test):
  - finestra a riposo (centro, estremi, tre pagine o meno, senza layout) e contesti, accessibilità e albero invariati;
  - estensione al primo evento di scroll a destra e a sinistra, prima del settle; lanci nei due versi con «una pagina di margine» a ogni posizione; fine dello scorrimento; ritorno alla pagina di partenza;
  - pallino lontano: intervallo disegnato nel commit che cambia l'indice, prima di `scrollTo`; pagina accanto; salto istantaneo con tastiera e con movimento ridotto (la pagina di arrivo è disegnata quando `scrollLeft` viene scritto, nessuna pagina sul percorso); pagine cambiate;
  - trascinamento di un widget: ±2 dall'inizio, cambio di pagina al bordo senza pagina saltata sul percorso, ritorno ai vicini; pager tenuto senza widget trascinato (Casa 3D, nomi) con la finestra normale;
  - vista pagine: cinque pagine su dieci, estremi, schede raggiungibili e con nome mentre il clip è saltato, nessun salto prima della misura, scheda trascinata, centro che cambia, chiusura (finestra della vista pagine fino alla fine, poi quella normale), funzioni pure;
  - pan delle schede con puntatori simulati: la finestra segue il dito e torna a riposo;
  - ResizeObserver: gli osservatori di un widget con `useMeasuredHeight` su una pagina saltata non vengono disconnessi né rifatti; la pagina è disegnata, e riceve la nuova misura, prima che la pagina accanto sia stata raggiunta; quello del Pager riscrive offset e finestra al ridimensionamento;
  - geometria registrata da una `WidgetGrid` vera su una pagina saltata: uguale a quella di una pagina disegnata, e l'attributo non cambia;
  - foglio di stile: una sola regola con `content-visibility`, solo su clip con `data-far`;
  - nessuno smontaggio: un contatore dentro una pagina saltata e ridisegnata mantiene valore e montaggio.
  - Verificato con una mutazione (tolto l'intervallo scritto nel render): falliscono i due test sul pallino lontano e sulla pagina accanto.
- `__tests__/OverviewPan.test.tsx`: un test in più (`onPan`).
- Test esistenti non modificati.

| Controllo | Esito |
|---|---|
| `vitest run PagerFarPages` | 38 verdi |
| `vitest run OverviewPan PagerFarPages PagerOverview PagerRestyle PagerBands LagLayers LauncherDragDrop LauncherGestures DragGhostLift` | 9 file, 245 verdi |
| `vitest run LauncherScreen FixLauncherUiShell LauncherGridGeometry FixWidgetsVisibility Casa3dShell Casa3dPage Casa3dVista Polish2LauncherScreen PolishLauncherScreen` | un fallimento in `Casa3dPage.test.tsx:241` (`quality` indefinito) nell'esecuzione sotto carico (9 file insieme, 157 s di import). Rieseguiti: `Casa3dPage` da solo 16 verdi; `Casa3dShell Casa3dPage Casa3dVista LauncherScreen` 193 verdi. Letto come instabilità di tempo sotto carico, non come regressione; il gruppo completo non è stato rieseguito per intero. |
| `vitest run AdaptiveCategoryWidget CategoryPages EditToolbarHidden FixLauncherUi.test FixSheetsReview FooterBandCache FrameGearCommands LauncherColumns LauncherCoverGrid PageShell Polish2LauncherPreview ShellLauncher SystemSheets i18n` | 14 file, 246 verdi |
| `npm run typecheck`, `npm run lint` (intero `src`) | verdi |
| `npm run lint:typography`, `npm run lint:theme-colors` | 0 violazioni (508 e 339 file) |

**Non eseguito:** suite completa in due shard, `build` e `scripts/check-bundle-size.mjs`, e **tutta la misura sul tablet e sul telefono a 390 px** (nessun browser né tablet in questo passo). I criteri «Fatto quando» di R2 (soglie di O1a, nessuna scheda o pagina vuota nelle schermate, S4 ≥ 72 fps e task dopo l'atterraggio non peggiori della base, trascinamento al bordo non peggiore, Casa 3D con 0 contesti in vista pagine) sono quindi **verificati solo a livello di test, non sul tablet**. Restano da provare dal vivo: (a) il momento in cui lo sblocco al primo scroll cade rispetto alla pagina che arriva; (b) il costo dello sblocco di cinque pagine all'apertura della vista pagine e delle due pagine in più al sollevamento (T0a lo ha misurato con una finestra simulata: T1 0,70, T3 0,68 della base); (c) i flussi «Sposta qui» e rilascio dal vassoio su una scheda lontana; (d) la prima immagine di una pagina sbloccata con widget misurati dopo una rotazione.

**Misura prevista (sessione tablet separata).** Build fuori dal repository (`npx vite build --outDir backup/piano-issue-109/dist-r2 --emptyOutDir`), servita come in T0a e R1 sulla 3013 con `adb reverse`, base nella stessa sessione, 5 giri alternati più il riscaldamento, mediana [min-max]. Scenari T1, T2, T3, S3b, S3c e SW1-SW3 con `t0a-run.cjs`, le schermate di `vis2.cjs` (vista pagine ferma e trascinata, scorrimento, lancio e doppio lancio, trascinamento al bordo, pallino lontano) e un giro a 390 px con Chromium software. Confronto con le soglie di O1a fissate da T0a.

**Limiti e rischi noti.**

- Il pallino lontano continua a sbloccare tutto l'intervallo e a costare di più al tocco (T0a: 189 contro 68 ms con una finestra simulata uguale); lo risolve R10.
- `follow` legge `scrollLeft` a ogni evento di scroll (come la simulazione di T0a); il layout è di solito pulito in quel punto, ma non è misurato in questa tappa.
- Con movimento ridotto la chiusura della vista pagine è immediata: la finestra passa subito a quella a riposo.
- Il working tree aveva già 456 voci all'avvio. Il passo ha modificato `Pager.tsx`, `launcher.css`, `useOverviewPan.ts`, `LauncherScreen.tsx` e `OverviewPan.test.tsx`, e aggiunto il solo file `PagerFarPages.test.tsx`, oltre a questa annotazione e alla nota in ADR-0018.

**Punto di ripresa.** Prossima tappa: R8 («+» insieme alla pagina), poi R10 (salto diretto, che toglie l'intervallo del ramo animato), R2b (livello 2, da provare con la misura di S4), R7, revisione Opus e Z. La misura sul tablet di R2 (insieme a quella di R1 e R3) resta da fare in una sessione separata. Ritorno indietro: togliere la regola CSS basta a ripristinare il comportamento (l'attributo senza la regola è innocuo); poi ripristinare i file da `backup/issue-109/pre/R2/` (`Pager.tsx`, `launcher.css`, `useOverviewPan.ts`, `LauncherScreen.tsx`) e togliere `PagerFarPages.test.tsx` e il test aggiunto in `OverviewPan.test.tsx`.

### 2026-10-23 — Misura sul tablet di R1+R3 (sola misura, nessun codice dell'app)

**Incarico e fonte.** Misura di R1 e R3 insieme sul Tab M11, richiesta dal flusso di lavoro dopo le risposte dell'utente del 2026-10-22 (tetto 1,5 ore; usate circa 50 minuti). Esecutore: Claude Code (claude-sonnet-5-5), subagente del flusso. **Nessun file dell'app modificato, nessun commit, nessuna dipendenza nuova.** Copia PRIMA di questo report: `backup/issue-109/M1/REP-20261022-002.prima.md`. Dati, script e tabelle in `backup/issue-109/M1/` (`strumenti/`, `ab-b/`, `ab-t/`, `vis/`, `tabella-chiusura-b.md`, `tabella-ab-b.md`, `tabella-ab-t.txt`).

**Ambiente e metodo (dichiarati).**
- Tablet: Lenovo Tab M11, Chrome, 1280x665 CSS px a DPR 1,5, schermo acceso, `visibilityState` visibile, scala della pagina 1, nessun tocco dell'utente (controllo di `pointerdown` e scala a ogni giro: 0 giri invalidi su 60).
- **La base NON è il banco 0.9.26 su 3002** (non toccato). È una **build della base servita allo stesso modo della variante**, per avere due build confrontabili sugli stessi dati: copia delle sorgenti del working tree in `backup/issue-109/base-src/frontend` con i soli tre file di R1/R3 riportati allo stato PRIMA (`Pager.tsx`, `DragGhost.tsx`, `launcher.css` da `backup/issue-109/pre/R1` e `R3`; `diff -rq` contro il working tree: solo quei tre file), costruita con `npx vite build --outDir backup/issue-109/dist-base` (junction temporanee a `node_modules`, tolte a fine misura). La variante è `backup/issue-109/dist-r1r3`. Nessun file sorgente era più recente di `dist-r1r3` al momento della copia. Le due build differiscono solo per `index-*.js` e `index-*.css`.
- Servite con la copia del server dei fixture (`piano-issue-109/misura/strumenti/fixture-server.mjs`): variante sulla **3013**, base sulla **3014**, `adb reverse` per entrambe. Una sola scheda, creata con `Target.createTarget`, riportata a ogni giro sull'origine della variante (`Page.navigate`): ogni giro parte da un caricamento nuovo. Le chiavi di layout (36, da `animazioni-0.9.25/tablet/ls-prima-collaudo.json`, senza chiavi di accesso) sono scritte nelle due origini; per far partire l'app sui fixture si è scritta anche la costante di accesso del server dei fixture degli e2e (valore di prova dell'app dell'utente su host locale, non una credenziale; nessun token reale letto o usato). I widget hanno la struttura ma non il contenuto reale (2927 nodi, 10 pagine): i valori assoluti non sono quelli del banco (vedi «Limiti»).
- Regola statistica del piano: 5 giri alternati base/variante (ordine invertito a ogni giro) più il giro 0 di riscaldamento, registrato a parte; mediana [min-max]; un guadagno vale solo con intervalli non sovrapposti. **Modo b** (osservatore dei task lunghi e rAF, durate vere): T1 (= S1), S7b, T3 (= S3a), 36 giri. **Modo t** (traccia): T1 e T3, 24 giri. Gesti sintetici (`Input.dispatchTouchEvent`), scenari di `scen.cjs`. Per l'attribuzione dei ricalcoli forzati, in modo t, una spia su `getComputedStyle` registra le prime righe dello stack di ogni chiamata, poi riconosciute nel testo delle due build.
- Chiusura (O3, R1): un osservatore sulla classe del pager (`is-closing`, `is-settling`) e gli eventi di transizione delle pagine e dei corpi, sullo stesso orologio dei task lunghi.

**R1 — chiusura della vista pagine (modo b, 5 giri più riscaldamento; mediana [min-max]; base e variante).**

| Misura | T1 base | T1 R1+R3 | S7b base | S7b R1+R3 |
|---|---|---|---|---|
| `is-closing` -> `is-settling`, ms | 417 [412-419] | 611 [544-618] | 413 [412-420] | 545 [539-610] |
| primo `transitionrun` delle pagine dopo `is-closing`, ms | 191 [111-211] | 192 [132-200] | 128 [120-189] | 130 [127-192] |
| **glide: dal `transitionrun` allo scatto, ms (la transizione dura 360)** | **227 [200-307]** | **417 [412-419]** | **288 [223-300]** | **414 [412-418]** |
| glide mancante prima dello scatto, ms | 134 [53-160] | **0 [0-0]** | 72 [60-138] | **0 [0-0]** |
| tocco su «Fine» -> `is-settling`, ms | 632 [623-639] | 822 [762-835] | 1032 [1016-1092] | 1177 [1133-1290] |
| `transitioncancel` su `.aca-pager__page` in chiusura | 1 | 1 | 1 | 1 |
| `transitioncancel` su `.aca-pager__body` in chiusura | 20 | 20 | 20 | 20 |
| giri con la chiusura bloccata (senza `is-settling`) | 0 su 6 | 0 su 6 | 0 su 6 | 0 su 6 |

Tutti i confronti di glide e di tempo di chiusura sono a intervalli **non sovrapposti**; il giro 0 va nello stesso senso. Il tempo di chiusura più lungo (+130-190 ms) è il prezzo voluto: lo scatto ora aspetta la transizione invece di scattare a 410 ms dal cambio di stato, quando un blocco di 110-210 ms ha fatto partire la transizione in ritardo (nella base la transizione correva ancora per 53-160 ms al momento dello scatto: il 15-45 % della scivolata veniva tagliato in tutti i giri).
- **O3 nella forma scritta nel piano («nessun `transitioncancel` su `.aca-pager__page` in chiusura») non è raggiunto, né dalla base né dalla variante:** resta 1 cancellazione sulla pagina corrente e 20 sui corpi a ogni chiusura, identiche. Interpretazione (non dimostrata a vista): la cancellazione è prodotta dalla rimozione di `is-closing` allo scatto, che arriva mentre il blocco dell'assestamento (circa 100-190 ms) tiene indietro gli eventi di fine; nella variante 9 `transitionend` su 10 delle pagine arrivano 107-198 ms dopo `is-settling`, nello stesso fotogramma delle cancellazioni, ma a scivolata già compiuta (glide >= 412 ms). Il conteggio dei `transitioncancel` quindi **non distingue** una scivolata tagliata da una compiuta: la grandezza che distingue è il glide. **Proposta per l'utente o l'agente principale:** riformulare O3 come «glide >= 360 ms prima dello scatto e nessuna chiusura bloccata»; in questa forma R1 la soddisfa in 12 giri su 12 (T1 e S7b, riscaldamento compreso), la base in 0 su 12.
- Non misurato: il caso con una sola pagina o senza vicine (richiesto dal «Fatto quando» di R1).

**R3 — sollevamento (T3: tocco sul widget, tenuta 0,9 s, spostamento, rilascio, «Annulla»).**

Ricalcoli forzati nella fase «drag» (modo t, 5 giri, mediana [min-max]):

| Misura | base | R1+R3 | esito |
|---|---|---|---|
| ricalcoli di stile forzati da script (n) | 5 [5-6] | 1 [0-2] | migliore |
| ms di stile forzato | 266 [252-334] | 5 [0-19] | migliore |
| elementi ricalcolati (somma) | 2799 [2788-2799] | 2709 [2708-2761] | migliore (-90, non spiegato) |
| somma dei blocchi >= 50 ms della fase | 565 [552-605] | 502 [493-562] | non distinguibile (mediana -63 ms) |
| primo blocco | 319 [307-377] | 273 [55-338] | non distinguibile |
| blocco massimo della fase (337, 273, 251, 338, 334 nei giri 1-5) | 319 [307-377] | 337 [251-338] | non distinguibile |
| somma di tutti i blocchi del gesto (traccia) | 1213 [1187-1289] | 1226 [1137-1298] | non distinguibile |
| «release» e «tap Annulla»: somma dei blocchi | 483 [473-525], 159 [157-168] | 476 [474-489], 173 [167-313] | non distinguibili |

- **0 chiamate di `DragGhost` a `getComputedStyle`: ottenuto.** Nella base la spia registra, a ogni sollevamento, la chiamata del `useLayoutEffect` di `DragGhost` (posizione nel bundle: `getComputedStyle(s)` seguito dal ciclo sulle tre variabili) più quelle di `getRemoveBounds`; nella variante resta solo `getRemoveBounds` (`getComputedStyle(document.documentElement).fontSize`, non toccato da R3). Il ricalcolo forzato residuo (0-2 chiamate, 0-19 ms) viene da lì e va attribuito a `getRemoveBounds`, che il piano lasciava come lavoro successivo.
- **Nessun aumento del blocco successivo né della somma:** confermato nei limiti della regola statistica (nessun confronto peggiore). Il ricalcolo da circa 2700 elementi non sparisce: passa da forzato (dentro il gestore, circa 266 ms) a non forzato, nello stesso task in 4 giri su 5; in un giro su 5 (giro 5) è andato in un task separato dopo uno da 55 ms (334 ms il secondo, contro 136-160 della base), senza che la somma dei blocchi aumentasse (1209 contro 1237). Il guadagno in durata resta quindi **non dimostrato** (valutazione 2 del piano): R3 vale per il momento in cui parte la sessione di trascinamento, non per la durata.
- Modo b, T3: blocco massimo 282 [270-295] contro 292 [268-310]; somma 874 [841-893] contro 807 [730-863]; fase «drag» 282 contro 292, «release» 238 contro 244, «tap Annulla» 157 contro 153; fps «drag» 24 contro 27, «release» 43 contro 42: **tutto non distinguibile**.
- **Copia identica a vista:** prova a parte (`m1-vis.cjs`, stesso punto del dito, base e variante, widget «Luce», cella da 103 px): le variabili sulla copia sono uguali (`--aca-cell` 103 px, `--aca-gap-x` 51,33 px, `--aca-gap-y` 16 px, `--aca-radius-cell` risolto come `min(24px, calc(103px * .24))` in entrambe); i 40 nodi della copia hanno gli stessi valori calcolati (raggio 24 px, ombra, scala 1,04) tranne la fase dell'oscillazione (translate e rettangoli entro 0,5 px); gli schermi sono indistinguibili a vista (`vis/base-lift.png`, `vis/r1r3-lift.png`); la differenza in pixel (23712 su 2,2 milioni, canale massimo 124) sta nella fase dell'oscillazione del widget, non nella struttura. Non prova: altre celle, altri temi, telefono.

**Gli altri scenari (non devono peggiorare).** Modo b, T1: blocco massimo 245 [176-283] contro 247 [200-316], somma 719 [546-975] contro 756 [655-825], fps dopo «Fine» 55 contro 55: non distinguibili. S7b: 184 [167-256] contro 186 [170-240]; somma 623 contro 630: non distinguibili. Modo t, T1: somma 941 [742-1019] contro 873 [791-1172]: non distinguibile; i blocchi di «Fine» restano 4-5 (primo 207 contro 202 ms), con un solo ricalcolo forzato da 3 ms in entrambe.

**Esito di R1+R3.** R1: scivolata di chiusura compiuta in tutti i giri (glide 412-419 ms contro 200-307 ms), nessuna chiusura bloccata, nessun peggioramento dei blocchi; O3 nella forma scritta resta non raggiunto per come è contato (vedi sopra) e va riformulato. R3: 0 ricalcoli forzati da `DragGhost`, copia identica, nessun aumento dei blocchi; la durata non migliora in modo distinguibile. **O1 non è toccato da questi due passi** (i blocchi restano 250-340 ms, come previsto dal piano).

**Limiti e non eseguito.** Gesti sintetici, nessun dito vero. Base e variante sono due build servite con i dati dei fixture, non il banco 0.9.26 con i dati reali: i valori assoluti differiscono (T3 con i fixture: blocco di 282-292 ms in modo b, contro 337-383 sul banco il 2026-10-22). R1 e R3 non sono separate (una sola build della variante: nessuna misura di R1 da sola o di R3 da sola). Il modo t gonfia le durate del 15-22 % per base e variante allo stesso modo; T1 e T3 non sono misurati in modo t come in modo b su tutte le fasi. Caso con una sola pagina o senza vicine non misurato. La scivolata «compiuta» è dedotta dal tempo tra `transitionrun` e scatto, non osservata fotogramma per fotogramma. `getRemoveBounds` non toccato. Nessuna misura del telefono né con movimento ridotto. L'ordine alternato dei giri non elimina la deriva termica del tablet. Suite completa e `check-bundle-size` restano non eseguiti (vedi l'annotazione di R1 e R3).

**Altro lavoro nel working tree durante la misura.** `git status` contava 456 voci all'inizio e 458 alla fine. Le modifiche non sono mie: nello stesso intervallo un altro passo del flusso ha realizzato R2 (`Pager.tsx`, `launcher.css`, `LauncherScreen.tsx`, `useOverviewPan.ts`, `PagerFarPages.test.tsx`, `PagerFarNear.test.tsx`, `OverviewPan.test.tsx`; vedi la sua annotazione). Le due build misurate non le contengono: la base è stata copiata dal working tree quando nessun file sorgente era più recente di `dist-r1r3`.

**Comandi.** `adb reverse tcp:3013 tcp:3013` e `tcp:3014`; CDP con `adb forward tcp:9225 localabstract:chrome_devtools_remote`; server dei fixture sulle due porte (PID 47896 e 53500, fermati a fine misura); `NODE_PATH=progetto/acasystem/node_modules`; `m1-tab.cjs open|prep|clear|close`; `m1-run.cjs T1,S7b,T3 base,r1r3 5 b ab-b` (`campaign-b.sh`) e `m1-run.cjs T1,T3 base,r1r3 5 t ab-t` (`campaign-t.sh`); analisi con `m1-closing.cjs`, `agg2.cjs`, `m1-enrich.cjs`; controllo visivo `m1-vis.cjs`. Tutti con `APP_ORIGIN=http://localhost:301` (prefisso delle due origini).

**Ripristino.** Dati delle origini 3013 e 3014 cancellati (`Storage.clearDataForOrigin`), scheda di misura chiusa, `adb forward tcp:9225` e `adb reverse` 3013 e 3014 tolti; resta `adb reverse tcp:3002`. Server avviati da me fermati per PID (nessuna terminazione per nome). Junction temporanee di `base-src` tolte con `rmdir` (verificato che `node_modules` del progetto è intatto). Chiavi di layout: invariate nelle due origini prima della cancellazione; la scheda del banco 3002 non è stata toccata. Tablet acceso. Nessun commit.

**Punto di ripresa.** R1 e R3 restano valide a livello di misura e vanno conservate; resta da decidere la riformulazione di O3. La misura di R2 (insieme a R8, R10 e R2b secondo l'ordine del piano) è una sessione separata: la base può essere `dist-r1r3` servita come qui, invece del banco 0.9.26, per non mischiare i fixture con i dati reali.

### 2026-10-23 — Tappa R2b realizzata (codice, livello 2 di ADR-0018); misura sul tablet non eseguita

**Incarico e fonte.** D-4, «Sì, proviamolo» (risposta dell'utente del 2026-10-22, nel blocco «Tutto il blocco» con il testo «T0a, R1, R3, poi R2 (accetto ADR-0018 se T0a non mostra schede vuote), poi le tappe delle tue risposte (R8, salto diretto, R2b), R4/R5/R9 solo se le misure le giustificano, revisione Opus e banco finale con copia a freddo»): il livello 2 di ADR-0018 va provato dopo R2, con misura dello scorrimento; se O5 peggiora si torna al livello 1. Il flusso ha assegnato a questo passo solo R2b, sopra R2. Stato di partenza: R2 realizzata e non misurata sul tablet; R8 e R10 non ancora fatte (il pallino lontano disegna ancora tutto l'intervallo). Modello: Claude Code (claude-sonnet-5-5), subagente del flusso. Nessun commit, nessuna dipendenza nuova, nessun browser, nessun tablet.

**Copie PRIMA** (`backup/issue-109/pre/R2b/`): `Pager.tsx` (stato di R2), `PagerFarPages.test.tsx`, e le copie di questo report e di ADR-0018 (`*.md.bak`).

**Che cosa è stato fatto** (solo `templates/launcher/Pager.tsx` e test; `launcher.css`, `LauncherScreen.tsx`, `useOverviewPan.ts`, PageShell e WidgetGrid non toccati).

- **Interruttore unico.** `export const REST_SKIPS_NEAR = true` in `Pager.tsx`, con la proprietà opzionale `skipNear` (default = la costante) per i test e per chi voglia spegnere il livello su un solo pager. Con `false` il Pager si comporta come dopo R2: `restWindow` riceve `nearDrawn` e il tocco non fa niente. Tornare al livello 1 è cambiare quel valore (una riga); il ritorno completo è il ripristino da `backup/issue-109/pre/R2b/Pager.tsx`.
- **A riposo la sola pagina mostrata.** `restWindow(count, index, reach, dragging, nearDrawn = true)`: il margine di una pagina per lato c'è solo se `nearDrawn` o se c'è uno scorrimento in corso (`reach`); il trascinamento di un widget resta corrente ±2 come in R2.
- **Sblocco al tocco.** Un `onPointerDownCapture` sul pager (in cattura, perché un widget che fermi la propagazione non lo impedisca) accende lo stato `touching`, che riporta la finestra a corrente ±1 nello stesso commit del `pointerdown`, prima che il dito si sia mosso. Non scatta per il mouse (non può far scorrere la riga), nelle bande sotto le barre (stessa regola del gestore esistente) né nella vista pagine (ha la sua finestra).
- **Rilascio.** `pointerup` e `pointercancel` sono ascoltati su `window` (in cattura) solo mentre il dito è giù. A dito sollevato le pagine accanto restano `TOUCH_HOLD_MS` = 300 ms (così un tocco su un widget o l'inizio di un lancio non le nasconde e le ridisegna di continuo). Se nel frattempo c'è uno scorrimento in corso (`settleTimer` o `reach`) le lascia andare la fine dello scorrimento (`letGo` nel `settleTimer`), non il timer. Un dito che resta giù non le lascia mai andare. Ascoltatori e timer sono tolti allo smontaggio.
- **Invariati:** l'albero React (nessuna pagina smontata), i contesti `PageVisibilityContext` e `PageNearContext`, `inert` e `aria-hidden`, lo sblocco al primo evento `scroll` e l'intervallo del pallino lontano di R2, il salto istantaneo (la pagina di arrivo è disegnata prima di scrivere `scrollLeft`, ora senza i vicini finché non ci si tocca o si scorre), la vista pagine.

**Decisioni di tappa, con il motivo.**

1. **Il mouse non sblocca.** Il piano dice «a `pointerdown` sul pager»; si è escluso il mouse perché non fa scorrere la riga e, su PC, ogni clic avrebbe disegnato e nascosto due pagine per niente. Il trascinamento di un widget col mouse è coperto dalla proprietà `dragging`. Per il comportamento letterale basta togliere la condizione `pointerType === 'mouse'` in `touchStart`.
2. **Tenuta di 300 ms dopo il rilascio.** Valore dell'agente, non misurato: è il costo di nascondere e ridisegnare le pagine accanto a ogni tocco su un widget che il livello 2 introduce di per sé; la misura (S4 e task dopo il tocco) dirà se serve più o meno.
3. **Con tre pagine o meno** a riposo si salta comunque tutto fuori dalla pagina mostrata (in R2 non si saltava niente). Coerente con il livello; nessun effetto visibile se lo sblocco al tocco arriva in tempo.
4. **Trascinamento dal vassoio.** Parte fuori dal pager e non fa `pointerdown` su di esso: lo copre la proprietà `dragging` (corrente ±2 dall'inizio della sessione), come in R2.

**Test** (cartella `progetto/acasystem/frontend`; Vitest sempre con `--maxWorkers=4`, a gruppi mirati, mai la suite completa).

- Nuovo `__tests__/PagerFarNear.test.tsx` (25 test): a riposo la sola pagina mostrata (centro, estremi), default e prop, albero e accessibilità invariati, funzione pura; primo tocco (le pagine accanto nel commit del `pointerdown`; dito e penna sì, mouse no; bande sotto le barre; rilascio dopo la tenuta; `pointercancel`; dito fermo; secondo tocco entro la tenuta; swipe con il pointer annullato dal browser, dove la fine dello scorrimento le lascia andare; scorrimento più lungo della tenuta; scorrimento che si ferma con il dito giù; vista pagine; ascoltatori tolti al sollevamento e allo smontaggio; livello spento); trascinamento di un widget (±2, cambio di pagina al bordo senza pagine da disegnare a metà gesto, ritorno alla sola pagina dopo il rilascio); scorrimento e salti (primo evento di scroll senza tocco, pallino lontano, salto da tastiera, ritorno alla pagina di partenza).
- Verificato con una mutazione (tolto `setTouching(true)`): falliscono 7 test del tocco.
- `PagerFarPages.test.tsx`: il solo cambio è `skipNear: false` nella base di `renderPager`, perché quel file descrive la finestra del livello 1; nessuna asserzione modificata. Altri test esistenti non modificati.

| Controllo | Esito |
|---|---|
| `vitest run PagerFarNear PagerFarPages` | 2 file, 63 verdi |
| `vitest run OverviewPan PagerFarNear PagerFarPages PagerOverview PagerRestyle PagerBands LagLayers LauncherDragDrop LauncherGestures DragGhostLift` | 10 file, 270 verdi |
| `vitest run LauncherScreen FixLauncherUiShell LauncherGridGeometry FixWidgetsVisibility Casa3dShell Casa3dPage Casa3dVista Polish2LauncherScreen PolishLauncherScreen` | 9 file, 214 verdi |
| `vitest run AdaptiveCategoryWidget CategoryPages EditToolbarHidden FixLauncherUi.test FixSheetsReview FooterBandCache FrameGearCommands LauncherColumns LauncherCoverGrid PageShell Polish2LauncherPreview ShellLauncher SystemSheets i18n` | 14 file, 246 verdi |
| `npm run typecheck`, `npm run lint` (intero `src`) | verdi |
| `npm run lint:typography`, `npm run lint:theme-colors` | 0 violazioni (508 e 339 file) |
| `prettier --write` sui due file toccati e sul nuovo test | applicato |

**Non eseguito:** suite completa, `build`, `check-bundle-size`, e **tutta la misura sul tablet e sul telefono a 390 px**. I criteri di O5 (S4 ≥ 72 fps, nessun task dopo l'atterraggio peggiore della base o oltre 50 ms) e la decisione «se O5 peggiora si torna al livello 1» non sono verificati: **R2b è realizzata e provata solo con i test, non è ancora giudicata.**

**Da guardare nella misura.** (a) Se la pagina accanto è pronta quando il dito si muove: lo sblocco avviene nel commit del `pointerdown`, ma stile, layout e disegno di una pagina (circa 300 nodi) arrivano nei fotogrammi seguenti; se un dito veloce mostra una pagina accanto vuota, il livello non va tenuto (D-4: si torna al livello 1) o lo sblocco va anticipato. (b) Il costo di ogni tocco su un widget (due pagine disegnate e poi nascoste 300 ms dopo) rispetto al livello 1: T2, T3 e il sollevamento. (c) Il primo evento di scroll di un trackpad o di una rotella, che sblocca solo con il margine di R2 (una pagina). (d) Il trascinamento dal vassoio e al bordo (S3c), invariato rispetto a R2 per costruzione.

**Limiti e rischi noti.** Il pallino lontano disegna ancora tutto l'intervallo (finché R10 non lo rende istantaneo). `pointerup` può non arrivare se un gestore lo ferma in cattura prima di `window`: le pagine accanto restano allora disegnate (si ricade nel livello 1, mai in pagine vuote). `project-status.md` non è stato aggiornato (la riga di ISSUE-109 e il punto di ripresa restano da aggiornare a fine blocco).

**Punto di ripresa.** Prossima tappa del flusso: la successiva dell'ordine (R8, R10, R7, revisione Opus, Z). La misura sul tablet di R2 e R2b va fatta in una sessione separata: base, R2 (`REST_SKIPS_NEAR = false`) e R2b (`true`) alternate, 5 giri, con S4 e i task dopo l'atterraggio come criterio di O5. Ritorno indietro: `REST_SKIPS_NEAR = false` (livello 1), oppure ripristino di `Pager.tsx` da `backup/issue-109/pre/R2b/`; in tal caso togliere `PagerFarNear.test.tsx` e `skipNear: false` da `PagerFarPages.test.tsx`.

### 2026-10-23 — Tappe R8, R10 e R7 realizzate (codice); misura sul tablet non eseguita

**Incarico e fonte.** Risposte dell'utente del 2026-10-22 (fonte umana): D-1 «Insieme alla pagina» (R8), D-2 «Salto diretto» (R10), D-6 «Sì» (R7); tappe: «Tutto il blocco» con il testo «T0a, R1, R3, poi R2 (accetto ADR-0018 se T0a non mostra schede vuote), poi le tappe delle tue risposte (R8, salto diretto, R2b), R4/R5/R9 solo se le misure le giustificano, revisione Opus e banco finale con copia a freddo». Stato di partenza: R1, R3, R2 e R2b realizzate nel codice e non misurate. D-3 resta l'interpretazione dell'agente principale, correggibile dall'utente (la finestra della vista pagine non è allargata). Modello: Claude Code (claude-sonnet-5-5), subagente del flusso. Nessun commit, nessuna dipendenza nuova, nessun browser, nessun tablet. Copie prima della modifica in `backup/issue-109/pre/R8/` (`Pager.tsx`, `PagerOverview.test.tsx`, `PagerRestyle.test.tsx`, questo report), `R10/` (`Pager.tsx`, già modificato da R8) e `R7/` (`LauncherScreen.tsx`, `AppRoutes.tsx`).

**R8, «+» insieme alla pagina (D-1, O4).**
- *Modifica.* In `Pager.tsx` la fine del rinvio con `requestIdleCallback` (timeout 100 ms, che arrivava 0,10-0,33 s dopo) è sostituita da un `requestAnimationFrame`: `settling` finisce al fotogramma dopo quello in cui la chiusura è finita. Dove non esiste `requestAnimationFrame` c'è un timer di 16 ms (`SETTLE_FRAME_MS`). Nello stesso commit che toglie `is-settling` si toglie anche l'ultimo `inert` dagli strati delle celle (effetto già esistente, dipende da `settling`).
- *Decisione di tappa (dell'agente, correggibile).* Lo stato `settling` non è stato tolto del tutto: dura un solo fotogramma. Così il commit che chiude la vista (scatto delle pagine, scrittura dello scroll) e quello che avvia la comparsa delle celle sono due, e la classe `is-settling` resta un marcatore per gli strumenti di misura (l'osservatore di classe della misura di R1 la usa come fine della chiusura). Il piano chiedeva «al massimo un fotogramma dopo la fine della transizione»: lo rispetta come inizio della comparsa.
- *Durata invariata.* La comparsa delle celle resta quella di `.aca-launcher-cells` (opacità, 240 ms, curva invariata): non cambiano durate, curve, ombre né `launcher.css` (ADR-0011). O4 va quindi letto come «la comparsa comincia al massimo un fotogramma dopo»; la misura (opacità dello strato per fotogramma) non è stata fatta.
- *Test.* `PagerRestyle.test.tsx`: tre test nuovi (le celle tornano al fotogramma dopo e non con `requestIdleCallback`, che il test sostituisce con un mock mai chiamato; senza `requestAnimationFrame` il timer di 16 ms; apertura della vista durante il settling senza fotogrammi né timer rimasti); due asserzioni adeguate (`PagerRestyle`, `PagerOverview`: dopo la chiusura resta il solo fotogramma del settling, che a sua volta non ne chiede altri).

**R10, salto diretto (D-2).**
- *Modifica.* `Pager.tsx`, costante `MAX_GLIDE_PAGES = 1`. Un indice che arriva da fuori e dista più di una pagina da quella su cui lo scroll riposa (`Math.round(rest.left / width)`) atterra con la scrittura di `scrollLeft`, come la tastiera e il movimento ridotto, senza `scrollTo` animato. Pagina accanto (distanza 1): scorrimento animato come oggi. Nel render l'intervallo `reach` si scrive solo per distanza ≤ 1 (da `seen`), quindi il salto non disegna le pagine in mezzo: nel commit dell'indice c'è già la finestra della pagina di arrivo (±1, o la sola pagina con R2b), prima della scrittura dello scroll. Se render ed effetto non concordano (l'uno dice salto, l'altro scorrimento) l'unico caso è un passo di una sola pagina, già coperto dalla finestra.
- *Annuncio e tastiera invariati.* L'annuncio per i lettori di schermo viene da `LauncherScreen` per il cambio di indice e non è toccato; tastiera e movimento ridotto erano già istantanei.
- *Effetto più largo del solo pallino (da sapere).* Vale per ogni indice impostato da fuori a più di una pagina, non soltanto per il pallino: «Sposta qui», `goToPage` e simili con un puntatore ora atterrano subito. Il bordo del trascinamento e i pallini accanto restano a distanza 1 e scorrono. Un secondo tocco su un pallino accanto durante uno scorrimento in corso conta la distanza dalla meta dello scorrimento, che `rest` conosce, quindi scorre.
- *Test.* `PagerFarPages.test.tsx`: il test del pallino lontano diventa «atterra subito» (nessun `scrollTo`, una scrittura a `7 * WIDTH`, pagine in mezzo mai disegnate, evento di scroll e fermata senza effetti); nuovi: due pagine di distanza = salto, una = scorrimento; due tocchi su pallini accanto in successione scorrono entrambi. `PagerFarNear.test.tsx`: salto lontano sulla sola pagina di arrivo; scorrimento verso la pagina accanto con la finestra di R2 e la pagina sola alla fine.

**R7, fuoco al fotogramma dopo (D-6).**
- *Modifica.* Nuovo `utils/launcher/afterFrame.ts` (`afterNextFrame`: due `requestAnimationFrame` di fila, annullabile, con timer di 32 ms dove non ci sono fotogrammi). Usato in `finishEditing` e `openFromOverview` (`LauncherScreen.tsx`, dove prima c'era un solo `requestAnimationFrame`, che restava nel fotogramma del commit) e nel ritorno da Sistema (`AppRoutes.tsx`, dove era un `focus()` sincrono nell'effetto di layout, 302,6 ms in T5). Nel ritorno da Sistema, una visita a Sistema o alla casa, o lo schermo di collegamento, che inizi prima del fuoco lo annulla, e lo smontaggio dell'app non lascia fotogrammi. La destinazione è riletta nel fotogramma (il pulsante può essere stato ricostruito).
- *Il fuoco non si perde.* Stesso elemento e stesse condizioni di prima (in `openFromOverview` il fuoco si sposta solo se non è su un elemento), con due fotogrammi di ritardo, circa 11-22 ms a 90 Hz. Per due fotogrammi il fuoco resta su `body` dopo il ritorno da Sistema (prima era immediato nel commit): è la conseguenza voluta di D-6. La visibilità dell'anello (`:focus-visible`) segue il fuoco.
- *Fuori tappa.* Il fuoco di ritorno dalla casa (`AppRoutes.tsx`, stesso schema) e gli altri `requestAnimationFrame` con `focus()` di `LauncherScreen.tsx` non sono stati toccati: il piano elenca solo i tre punti. Proposta per l'utente: valutarli dopo la misura.
- *Test.* `AfterFrame.test.ts` (nuovo: seconda frame e non la prima; annullamento prima e tra le due; senza fotogrammi un timer); `FixSystemFocus.test.tsx` (i due test attendono il fuoco; tre test nuovi: non nel commit né nel primo fotogramma ma nel secondo, Sistema riaperto prima del fuoco non lo riceve, nessun fotogramma lasciato dopo lo smontaggio); `LauncherScreen.test.tsx` (un test nuovo: dopo «Fine» e dopo una scheda della vista pagine il fuoco arriva solo al secondo fotogramma). I test di tastiera esistenti sono verdi senza modifiche.

**Comandi ed esiti** (cartella `progetto/acasystem/frontend`, Vitest sempre con `--maxWorkers=4`, mai la suite completa, nessun browser):

| Comando | Esito |
|---|---|
| Vitest su `PagerOverview`, `PagerRestyle`, `LagLayers` dopo R8 | 77 test verdi (dopo l'adeguamento di 2 asserzioni) |
| Vitest su `PagerFarPages`, `PagerFarNear` dopo R10 | 2 test sul pallino lontano riscritti, poi verdi (38 e 26 test) |
| Vitest su `AfterFrame`, `FixSystemFocus`, `LauncherScreen` (test nuovo) dopo R7 | verdi |
| Vitest di guardia: `Pager*`, `LagLayers`, `OverviewPan`, `LauncherGestures`, `LauncherDragDrop`, `LauncherGridGeometry`, `FixWidgetsVisibility`, `Casa3dShell/Page/Vista`, `LauncherIndicatorCover`, `AfterFrame`, `FixSystemFocus`, `LauncherScreen`, `FixLauncherUi*`, `PageOverview*` | 21 file, 519 test verdi |
| Vitest su `PolishLauncherScreen`, `Polish2LauncherScreen`, `FixLauncherUiShell`, `PageOverviewBarRename`, `Casa3dRoute`, `Casa3dCommands`, `ShellApp`, `LauncherColumns`, `SystemPage`, `ShellLauncher`, `Polish2LauncherPreview` | verdi (305, 47 e 2 test) |
| `npm run typecheck`, `eslint` sui sorgenti toccati, `npm run lint:typography`, `npm run lint:theme-colors` | verdi (0 errori; 509 e 339 file) |
| `prettier --write` sui file toccati | applicato |

**Non eseguito.** Suite completa, `build`, `check-bundle-size`, `npm run lint` sull'intero `src` (solo i sorgenti toccati; ESLint ignora i file di test per configurazione), qualsiasi misura sul tablet o in browser: O4 (opacità dello strato celle), il costo del salto lungo in O1a e O5, lo scorrimento a dito e l'aspetto del primo fotogramma di una pagina di arrivo con R2b (dopo un salto la pagina di arrivo è la sola disegnata, finché non si tocca il pager) restano da guardare. I test usano jsdom: la durata di un fotogramma e il disegno reale non sono provati.

**Rischi noti.** (a) R10 con R2b: se un dito sfiora la pagina di arrivo nel primo fotogramma, il `pointerdown` disegna le vicine nello stesso commit (R2b), ma la prova a vista manca. (b) Ogni indice impostato da fuori a più di una pagina atterra subito, anche da percorsi che oggi scorrevano (vedi sopra): se qualche flusso richiede lo scorrimento lungo, va riportato a una chiamata dedicata. (c) R7: per due fotogrammi dopo il ritorno da Sistema nessun elemento ha il fuoco.

**Ritorno indietro.** R8: rimettere `requestIdleCallback` nell'effetto di `settling` di `Pager.tsx` (copia in `backup/issue-109/pre/R8/`) e togliere i tre test nuovi di `PagerRestyle.test.tsx`. R10: portare `MAX_GLIDE_PAGES` a `Infinity` ripristina lo scorrimento di ogni distanza e l'intervallo disegnato; i test del pallino lontano vanno riportati alla forma precedente (`backup/issue-109/pre/R10/` ha il `Pager.tsx` di prima). R7: ripristinare `LauncherScreen.tsx` e `AppRoutes.tsx` da `backup/issue-109/pre/R7/`, togliere `utils/launcher/afterFrame.ts` e `AfterFrame.test.ts`, riportare i test di `FixSystemFocus` e `LauncherScreen` alla forma precedente.

**Punto di ripresa.** Prossime tappe del flusso: revisione Opus del diff, poi Z (banco con copia a freddo e misura sul tablet di R1, R3, R2, R2b, R8, R10 e R7 in una sessione separata, 5 giri alternati). `project-status.md` non è stato aggiornato (la riga di ISSUE-109 e il punto di ripresa vanno aggiornati a fine blocco).

### 2026-10-23 — Tappa R5a realizzata (codice); R4 e R9 non fatte; misura sul tablet non eseguita

**Incarico e fonte.** Risposte dell'utente del 2026-10-22 (fonte umana): «Tutto il blocco» con il testo «T0a, R1, R3, poi R2 (...), poi le tappe delle tue risposte (R8, salto diretto, R2b), R4/R5/R9 solo se le misure le giustificano, revisione Opus e banco finale con copia a freddo». Le misure (T0a, T0b, sopra) giustificano soltanto R5a: R4 non giustificata (T0a: L1 e L3 non distinguibili dalla sola finestra), R9 non giustificata (T0b: i `:is()` danno −8 % sui ms di stile di T1 e nulla sul resto; le proprietà personalizzate morte valgono ≤ 5 %), R5b resta rinviata (come da piano). **Condizione di R5a, da dichiarare con i suoi limiti:** T0b la soddisfa solo in senso formale. La gamba HA (H3) è negativa (0 messaggi WebSocket in 120 s); la gamba degli script di React (T3) è positiva ma piccola: 48 ms di script nel blocco di sollevamento da 372 ms e in «Annulla» da 289 ms, 55 e 29 ms nei due task di rilascio, già sotto 100 ms. Nessun blocco scenderebbe sotto 100 ms per merito di R5a: la tappa non avvicina O1 da sola. Il limite superiore del guadagno (circa 40 ms per blocco) è però maggiore dell'ampiezza min-max delle basi (13-18 ms). Eseguita perché l'incarico dell'agente principale la elenca come giustificata dalle misure; la scelta di tenerla resta all'utente. Modello: Claude Code (claude-sonnet-5-5), subagente del flusso. Nessun commit, nessuna dipendenza nuova, nessun browser, nessun tablet. Copie prima della modifica in `backup/issue-109/pre/R5a/` (`LauncherScreen.tsx`, `LauncherUiContext.tsx`, `WidgetHost.tsx`, `WidgetGrid.tsx`, `LauncherGridGeometry.test.tsx`, `PagerFarPages.test.tsx` e questo report).

**Modifica.**
- *Archivio.* Nuovo `hooks/launcher/useLauncherSelection.ts`: `createLauncherSelection()` tiene in tre variabili `selected`, `landed` e `rejected` (widget con la sua pagina, tranne il rifiuto, che è un id) e avvisa i suoi ascoltatori solo se il valore cambia. `setSelected` accetta un valore o una funzione del valore corrente, valutata subito e in ordine. I lettori sono `useSelectedIn(store, pageId)`, `useLandedIn(store, pageId)` e `useRejected(store, widgetId)`, tutti `useSyncExternalStore` con risposta primitiva (id o booleano): chi legge si rifà solo se la sua risposta cambia. Nessuna dipendenza nuova.
- *`LauncherUi`.* Escono `selected`, `landed` e `rejectedId`; entra `selection`, l'archivio, che non cambia mai identità. Una selezione, la fine di un atterraggio o la fine del LED d'errore lasciano quindi `ui` com'era, e con esso WidgetHost e WidgetGrid che lo leggono dal contesto.
- *`WidgetGrid.tsx`.* La griglia legge `selectedId` e `landedId` della propria pagina dall'archivio e li passa ai WidgetHost come prima (`selected`, `landing`, e il nome per «Sposta qui»). Si rifà solo la griglia della pagina interessata (due, se la selezione passa da una pagina all'altra).
- *`WidgetHost.tsx`.* `rejected` viene da `useRejected`: si rifà solo il widget che rifiuta.
- *`LauncherScreen.tsx`.* Le tre `useState` sono sostituite dall'archivio, creato una volta (`useState(createLauncherSelection)`); lo schermo segue la selezione con `useSyncExternalStore` perché disegna la barra del widget selezionato (la barra e `Annulla` leggono `selected` come prima). `select` non scrive più `selectedFrom` dentro un aggiornamento di stato: legge l'archivio, scrive il rif e poi la selezione (la scrittura fuori dall'updater è nel piano). `moveSelectedTo` legge la selezione dall'archivio al momento del tocco e non dipende più da `selected`: è l'unica funzione di `ui` che ne dipendeva. I timer di atterraggio e di rifiuto restano, con gli stessi 260 e 900 ms.
- *Test esistenti adeguati.* `LauncherGridGeometry.test.tsx` e `PagerFarPages.test.tsx` costruivano un `ui` parziale con `selected: null`: ora con `selection: createLauncherSelection()`.

**Scostamento dal piano (dichiarato).** Il piano chiedeva anche `select`, `moveSelectedTo`, `tapWidget` e `removeWidget` stabili leggendo layout e selezione da ref. Qui sono indipendenti dalla **selezione** ma non dal **layout**: `select` dipende ancora da `controller.layout` e le altre da `controller`. Non l'ho esteso perché `ui` contiene comunque `controller` e `widgetName` (che dipende da `controller` e dal runtime), che cambiano a ogni cambio di layout e di modo di modifica: renderle stabili non fermerebbe il giro dei commit di sollevamento, rilascio e «Annulla», lo farebbe solo insieme a R5b (rinviata) e a un lavoro più ampio sul runtime. `widgetName` e `hiddenCheck` non sono stati toccati.

**Che cosa cambia e che cosa no (valutazione, non misura).**
- *Cambia:* il commit della sola selezione (154 componenti, 8 ms in T0b) si riduce alla griglia della pagina e ai due widget interessati; la **fine dell'atterraggio** a +260 ms (761 componenti, 9 pagine, 29 ms di script in T0b) si riduce al widget atterrato e alla sua griglia; la fine del LED d'errore (900 ms) idem. Questo è il «secondo giro completo» che il piano voleva togliere.
- *Non cambia:* i commit che cambiano il layout o il modo di modifica (sollevamento, primo commit del rilascio, «Annulla»), perché `ui` cambia lo stesso con `controller`. Quindi il criterio del piano «script per selezione o atterraggio ≤ 15 ms» non è raggiungibile per il primo commit del rilascio (1446 componenti, 55 ms), e i blocchi di sollevamento e «Annulla» restano come in T0b meno nulla: R5a **non** riduce i loro 48 ms di script.
- Comportamento visibile invariato: `is-selected`, `is-landing`, il LED d'errore, `aria-pressed`, fuoco e Tab dal widget selezionato non sono stati toccati; i test esistenti sono verdi.

**Test nuovi.**
- `LauncherSelection.test.tsx` (7 test): l'archivio avvisa solo se cambia il valore, accetta funzioni valutate in ordine, smette di avvisare dopo l'annullamento della sottoscrizione; i lettori per pagina e per widget si rifanno solo quando cambia la loro risposta (conteggio dei render su tre sonde in due pagine); un valore già presente prima del montaggio viene letto.
- `LauncherScreen.test.tsx`, nel gruppo «simplified editing», tre test nuovi in stile LagRenders: «selezionare un widget, e passare la selezione a un altro, non rifà i widget degli altri» (conteggio dei render di `test_tile_b` e `test_tile_c`); «un rifiuto accende il LED d'errore di quel widget soltanto e lo spegne» (con timer finti, 1000 ms); «un widget rilasciato atterra e la fine dell'atterraggio non rifà nessun widget» (geometria simulata con `getBoundingClientRect`, sollevamento, spostamento, rilascio, 400 ms). Ho verificato che falliscono sul codice precedente: sostituiti temporaneamente i quattro file di sorgente con le copie di `backup/issue-109/pre/R5a/`, i tre test falliscono tutti per un render in più (5 contro 4, 10 contro 9, 12 contro 11), poi i file nuovi sono stati rimessi (verificato con una ricerca di `selection`, 34 occorrenze in `LauncherScreen.tsx`). Come indica il piano, nessun test usa «un aggiornamento di entità non rifà gli host» come prova di guadagno.

**Comandi ed esiti** (cartella `progetto/acasystem/frontend`, Vitest sempre con `--maxWorkers=4`, mai la suite completa, nessun browser):

| Comando | Esito |
|---|---|
| Vitest su `LauncherSelection` | 7 test verdi |
| Vitest su `LauncherScreen` con `-t "ISSUE-109, R5a"` (nuovi test), sul codice nuovo e sul codice precedente | 3 verdi; 3 falliti sul precedente (vedi sopra) |
| Vitest di guardia: `Pager*`, `LagLayers`, `LagRenders`, `OverviewPan`, `LauncherGestures`, `LauncherDragDrop`, `LauncherGridGeometry`, `LauncherSelection`, `FixWidgetsVisibility`, `LauncherIndicatorCover`, `AfterFrame`, `FixSystemFocus`, `LauncherScreen`, `FixLauncherUi*`, `PageOverview*`, `PolishLauncherScreen`, `Polish2LauncherScreen`, `ShellLauncher`, `Polish2LauncherPreview`, `Stack*` | 24 file, 527 test verdi |
| Vitest sugli altri file che importano `WidgetHost`, `WidgetGrid`, `LauncherScreen` o `LauncherUi`: `ComfortContract`, `ControlsFrame`, `DragGhostLift`, `FixSheetsReview`, `FooterBandCache`, `FrameGearCommands`, `LauncherColumns`, `LauncherCoverGrid`, `PageShell`, `SystemSheets`, `ShellApp`, `Casa3dRoute` | 12 file, 241 test verdi |
| `npm run typecheck`, `eslint` sui cinque sorgenti toccati, `npm run lint:typography`, `npm run lint:theme-colors` | verdi (0 errori; 510 e 339 file) |
| `prettier --write` sui file toccati; `prettier --check` su `templates/launcher` | applicato; resta solo `StackView.tsx`, non toccato da questa tappa |

**Non eseguito.** Suite completa, `build`, `check-bundle-size`, `npm run lint` sull'intero `src`, qualsiasi misura sul tablet o in browser. In particolare **non misurati** i criteri del piano: script per la selezione o l'atterraggio, assenza del secondo giro a +260 ms in T2/T3 in modo tp, e il confronto A/B con 5 giri alternati che dirà se il guadagno (circa 29 ms sul secondo task di rilascio, pochi ms sulla selezione) è distinguibile; va fatto nella sessione Z insieme alle altre tappe, sapendo che il guadagno atteso è piccolo. I test usano jsdom: l'effetto reale sul tempo non è provato. Non ho verificato a vista che `is-selected`, `is-landing` e il LED si disegnino come prima: le classi sono controllate dai test, il disegno no.

**Rischi noti.** (a) `useSyncExternalStore` rende sincrono l'aggiornamento di selezione, atterraggio e LED (niente transizioni di React su questi tre stati); in `liftWidget`, dentro `flushSync`, la selezione e il trascinamento sono nello stesso commit, come prima (test esistenti verdi). (b) L'aggiornamento di `selected` ora avviene subito nell'archivio e non in coda come uno `useState`: all'interno di uno stesso gestore una lettura successiva vede già il valore nuovo. Nessun test esistente lo rileva come differenza, ma è il punto da guardare se compare un caso strano di selezione (per esempio dopo «Sposta nella pagina» con `follow`). (c) Un `LauncherUi` costruito a mano (le anteprime, i test) deve portare `selection`, altrimenti `WidgetGrid` e `WidgetHost` non funzionano: i due test che lo costruivano sono adeguati; non risultano altri usi.

**Ritorno indietro.** Ripristinare da `backup/issue-109/pre/R5a/` i quattro sorgenti (`LauncherScreen.tsx`, `LauncherUiContext.tsx`, `WidgetHost.tsx`, `WidgetGrid.tsx`) e i due test adeguati; togliere `hooks/launcher/useLauncherSelection.ts` e `__tests__/LauncherSelection.test.tsx`; togliere i tre test nuovi in fondo al gruppo «simplified editing» di `LauncherScreen.test.tsx`. È indipendente dalle altre tappe del blocco (R1, R2, R2b, R3, R7, R8, R10), tranne per i file che tocca in comune: `LauncherScreen.tsx` contiene anche le modifiche di R3 e R7, quindi per il ripristino vale il confronto con la copia di `pre/R5a/` (che include quelle) e non con quelle di `pre/R3/` o `pre/R7/`.

**Proposta per l'utente (non autorizzata, già emersa in T0b).** La leva più grande misurata resta la riduzione delle regole `:has()` a livello di widget (19 su 37; limite superiore −32 % sulla somma dei blocchi di T3, «Annulla» da 292 a 101 ms), da misurare dopo R2 e da verificare a pixel e negli stati `:active`/`:focus-visible`. R9 nella forma del piano non va fatta. Non è stata toccata.

**Punto di ripresa.** Prossime tappe del flusso: revisione Opus del diff, poi Z (banco con copia a freddo e misura sul tablet di R1, R3, R2, R2b, R8, R10, R7 e R5a in una sessione separata, 5 giri alternati). `project-status.md` non è stato aggiornato (la riga di ISSUE-109 e il punto di ripresa vanno aggiornati a fine blocco).

### 2026-10-23 — Misura complessiva M2 sul tablet: eseguita solo in parte (tablet scollegato a metà), R2b va tolta

**Incarico e fonte.** Misura sul Tab M11 di tutto il lavoro del blocco (R1, R3, R2, R2b, R8, R10, R7, R5a) contro la base, con la variante senza R2b, richiesta dal flusso dopo le risposte dell'utente del 2026-10-22 (D-4 «Sì, proviamolo»: se O5 peggiora si torna al livello 1). Esecutore: Claude Code (claude-sonnet-5-5), subagente del flusso. **Nessun file dell'app modificato** (`Pager.tsx` ha lo stesso SHA-256 prima e dopo le due build; 462 voci in `git status` prima e dopo), nessun commit, nessuna dipendenza nuova. Copia PRIMA di questo report: `backup/issue-109/M2/REP-20261022-002.prima.md`. Dati, script e tabelle in `backup/issue-109/M2/` (`strumenti/`, `ab-a/`, `tabella-ab-a.md`).

**Build e ambiente (dichiarati).**
- `dist-tutto` (working tree intero, `REST_SKIPS_NEAR = true`) e `dist-senza-r2b` (stesso working tree con la riga 79 di `Pager.tsx` portata a `false` per la sola build e rimessa subito: `sha256sum -c` OK, riga 79 di nuovo `true`). `npx vite build --outDir ... --emptyOutDir`, 2-3 s ciascuna. Le due build hanno lo stesso CSS e bundle diversi.
- **La base NON è il banco 0.9.26 su 3002** (non toccato; i suoi bundle hanno hash diversi, perché è una build Docker): è `dist-base`, la build della base di M1 (working tree con i soli file di R1/R3 allo stato PRIMA), servita allo stesso modo delle altre. Può differire dal banco in modi che non conosco.
- Servite con la copia del server dei fixture: base 3014, tutto 3013, senza R2b 3015, con `adb reverse`. Una scheda creata con `Target.createTarget`, riportata a ogni giro sull'origine della variante (caricamento nuovo a ogni giro). Fixture, non dati reali: i valori assoluti non sono quelli del banco. Chiavi di layout (36, da `ls-prima-collaudo.json`, senza chiavi di accesso) scritte nelle tre origini; per far partire l'app sui fixture si è scritta anche la costante di accesso del server dei fixture degli e2e (`aca-isolated-fixture`, valore di prova dell'app dell'utente su host locale, come in M1; nessun token reale letto o usato).
- Regola statistica: 5 giri alternati (ordine invertito a ogni giro) più il giro 0 a parte, mediana [min-max], guadagno solo con intervalli non sovrapposti. **Solo modo b** (osservatore dei task lunghi e rAF, durate vere, gesti sintetici), nessun modo t. Giri non validi: 0 (controllo di `pointerdown` e scala a ogni giro).

**Che cosa è stato eseguito.** Campagna A (7 scenari × 3 varianti × 6 giri = 126 attesi, **124 registrati**: mancano i giri 5 di JUMP per tutto e base, quindi 4 giri nel confronto): SW1, SW2, SW3 (swipe, lancio, doppio lancio, task nei 500 ms dopo l'atterraggio), T3 (S3a: sollevamento, rilascio, «Annulla»), S3cD (trascinamento al bordo S3c con distanza copia-dito), T2 (tocco su una scheda), JUMP (pallino a +6, -6, +1). Poi lo strumento ha perso il tablet: `fetch failed` al giro 5 di JUMP e `adb devices` vuoto da allora (ripetuto per minuti); il PC è rimasto fermo per ore (l'orologio passa dalle 03:44 alle 09:17), senza che sia stato dato alcun comando di sistema al tablet. **La campagna B (T1/S1 con «Fine», S7b, T6/S3b, T4 e S5b fogli, T5 ritorno da Sistema; O1, O3, O4) non è partita.** Non eseguiti anche: S8 (movimento ridotto), Casa 3D (`casa-check.cjs` scritto, mai lanciato), S4a, le schermate sulle schede vuote (`vis-m2.cjs` scritto, mai lanciato), il telefono, il modo t. Gli script sono pronti in `M2/strumenti/` (`m2-run.cjs`, `agg.cjs`, `o34.cjs`, `casa-check.cjs`, `vis-m2.cjs`, `camp.sh`) per riprendere a tablet ricollegato.

**Risultati (mediana [min-max], giri 1-5; B = base, T = tutto, S = senza R2b).** Tabella completa in `backup/issue-109/M2/tabella-ab-a.md`.

| Misura | B | T | S | Esito |
|---|---|---|---|---|
| T3, blocco massimo (ms) | 372 [311-379] | 263 [248-274] | 251 [247-266] | T e S migliori di B; T e S non distinguibili |
| T3, somma dei blocchi (ms) | 1049 [1037-1191] | 631 [577-667] | 674 [637-745] | idem; rapporto T/B 0,60 |
| T3, rilascio / «Annulla», blocco massimo | 304 / 169 | 151 [146-163] / 112 [102-156] | 153 / 144 | T migliore di B; «Annulla» S/B non distinguibile |
| S3cD (bordo), blocco massimo | 303 [278-308] | 261 [250-295] | 261 [246-305] | non distinguibile; somma 1128 → 806 / 822 (rapporto 0,71) migliore |
| S3cD, distanza massima copia-dito (px) | 264 [247-271] | 263 [181-270] | 247 [135-270] | non distinguibile, non peggiore |
| T2, tocco su una scheda, blocco massimo | 154 [153-237] | 117 [113-123] | 117 [114-167] | T migliore di B (somma 327 → 117, rapporto 0,36); S non distinguibile da B sul massimo |
| SW1/SW2/SW3, task nei 500 ms dopo l'atterraggio (massimo) | 62 / 77 / 78 | 57 / 60 / 59 | 70 / 59 / 80 | **non distinguibili** in tutti e tre |
| JUMP, eventi di scroll in posizioni intermedie, pallino a +6 | 14 [13-14] | **0** | **0** | R10 funziona: salto diretto, nessuna pagina in mezzo (-6: 28 contro 0) |
| JUMP, blocco massimo al tocco su un pallino accanto (+1) | 0 | 77 [75-132] | 69 [66-71] | peggiore di B (T e S: costo della finestra di R2 che si sblocca) |
| JUMP, somma dei blocchi | 147 [143-154] | 188 [183-201] | 262 [206-306] | T peggiore di B; S peggiore di T (4 giri per T e B) |

**R2b contro O5 (decisiva).** Nelle finestre degli scorrimenti T (con R2b) peggiora rispetto a S (senza) e in parte rispetto a B, a intervalli non sovrapposti:
- fps «swipe back»: B 82 [71-88], T **37 [32-51]**, S 78 [76-84]; «fling back»: B 81, T **57 [49-68]**, S 84; «fling 2» del doppio swipe: B 54 [49-71], T **23 [22-26]**, S 50 [27-56]; «fling back x2»: B 78, T 63 [54-66], S 79.
- frame più lungo: «swipe back» B 33 [33-44] ms, T **144 [78-167]**, S 33 [22-45]; «swipe next» B 78, T **134 [111-177]**, S 78; «fling 2» B 78, T 122 [100-156], S 89.
- Spiegazione (valutazione, non dimostrata): il `pointerdown` disegna le due pagine accanto e il costo cade nei primi fotogrammi del dito. S (livello 1) resta allineata a B.
- Gli atterraggi in SW3 sono 4 in T contro 3 in B e S: conta un cambio di `is-current` in più, non indagato.
- **S4 ≥ 72 fps** non è rispettato nemmeno dalla base su questi gesti (swipe 54, lancio 60, fling 2 54): il criterio assoluto non è applicabile, vale «non peggiore della base». S lo rispetta, T no.

**Decisione.** O5 peggiora con R2b a intervalli non sovrapposti (fps e frame più lunghi), quindi per D-4 («se O5 peggiora, si torna indietro») **R2b va tolta** e si resta al livello 1 (R2): `REST_SKIPS_NEAR = false` in `Pager.tsx` riga 79 (una riga; il ritorno completo è `backup/issue-109/pre/R2b/Pager.tsx`, togliendo `PagerFarNear.test.tsx` e `skipNear: false` da `PagerFarPages.test.tsx`). **Il codice non è stato cambiato in questo passo** (incarico di sola misura): la modifica resta da fare. Guadagno di R2b misurato oltre a S: nessuno (T2 117 contro 117, T3 263 contro 251); un solo vantaggio visto: il tocco su un pallino lontano non costa nulla in T mentre costa 69 ms in S.

**O1/O1a.** O1 (100 ms) non è raggiunto da nessuna variante (T2 117, T3 263, rilascio 151, «Annulla» 112, bordo 261). Soglie di O1a di T0a (fissate in modo t; qui in modo b, durate vere): riposo e modifica somma ≤ 0,75 della base e massimo ≤ 335 ms: T3 0,60 e 263, S3cD 0,71 e 261 rispettate; vista pagine: T2 0,36 e 117 rispettata. T1, «Fine», T6/S3b, T4/S5b e T5 **non misurati**: O1a per questi resta aperto.

**Non verificati e perché.** O3 e O4 (R1 e R8, giri di «Fine»), S1, S3b, fogli, ritorno da Sistema (R7, R5a), movimento ridotto, Casa 3D, S4a, schermate sulle schede vuote nella vista pagine e nelle altre prove di R2/R10, telefono: campagna B e prove a vista non partite per il tablet scollegato. R5a non è isolata (nessuna variante senza R5a): i suoi effetti sono confusi con gli altri nel confronto T/B.

**Limiti.** Gesti sintetici, nessun dito vero; fixture, base = `dist-base` e non il banco; solo modo b; JUMP con 4 giri per T e B; le fps di finestra includono i tempi morti tra i gesti (confronto valido tra varianti, non valore assoluto); deriva termica non eliminata dall'ordine alternato.

**Ripristino (parziale).** Server 3013, 3014 e 3015 fermati per PID (33360, 45944, 23468, tutti avviati da me), nessuna terminazione per nome. **Non fatto perché il tablet non c'è più:** `adb reverse` 3013/3014/3015 e `forward tcp:9225` (spariti con il dispositivo; al ricollegamento resta da avere solo la 3002), la scheda di misura (id in `M2/tab-id.txt`) è rimasta aperta sul tablet e i dati delle origini `localhost:3013`, `3014`, `3015` (chiavi di layout dei fixture e la costante di prova) non sono stati cancellati: a tablet collegato bastano `node M2/strumenti/m2-tab.cjs clear <porta>` per le tre porte e `close`. La scheda del banco 3002 non è stata toccata. Nessun commit.

**Punto di ripresa.** (1) Togliere R2b (`REST_SKIPS_NEAR = false`) con l'autorizzazione dell'utente o del flusso. (2) A tablet collegato: ripulire le origini 3013-3015, poi la campagna B (`camp.sh T1,S7b,T6,T4,T5,S5b base,tutto 5 ab-b`, poi `o34.cjs ab-b T1,S7b` per O3/O4), S8 e CASA, `vis-m2.cjs` per le schede vuote; ricostruire `dist-tutto` col livello 1 e rimisurare almeno SW1-SW3 e JUMP. (3) Poi Z.

## Annotazione del 2026-10-23 (R2b tolta)

Seguito alla misura M2 e a D-4 («Sì, proviamolo», con ritorno se O5 peggiora). **Evidenza** (5 giri più il giro 0, intervalli non sovrapposti, gesti sintetici, base = `dist-base` sui fixture e non il banco 0.9.26): fps nello swipe di ritorno 37 [32-51] con R2b contro 82 [71-88] della base e 78 [76-84] senza; frame più lungo 144 ms contro 33 ms; doppio swipe (fling 2) 23 fps contro 54 della base e 50 senza. Per far partire l'app sui fixture era stata scritta in localStorage la costante di prova del server dei fixture degli e2e (valore di prova, host locale, nessun token reale). S4 ≥ 72 fps non è applicabile in assoluto (nemmeno la base lo rispetta): vale «non peggiore della base», rispettato dal livello 1 e violato da R2b.

**Modifica.** `REST_SKIPS_NEAR = false` in `Pager.tsx` (punto unico, riga 79) con una riga di commento; si resta al livello 1 (R2). La proprietà `skipNear` e `PagerFarNear.test.tsx` restano (i test passano `skipNear` in modo esplicito e il test del valore predefinito segue la costante); la rimozione completa del codice è possibile da `backup/issue-109/pre/R2b/Pager.tsx` e non è stata fatta (diff minimo). Copia prima: `backup/issue-109/pre/R2b-tolta/Pager.tsx`.

**Comandi ed esiti.** `vitest run --maxWorkers=4 PagerFarNear PagerFarPages`: 2 file, 66 test superati. `vitest run --maxWorkers=4 Pager Launcher`: 37 file, 651 test superati. `npm run typecheck`: nessun errore. `eslint src/templates/launcher/Pager.tsx`: nessun errore. Non rimisurato sul tablet dopo la modifica (resta nel punto di ripresa di M2). Nessun commit.

## Annotazione del 2026-10-23 (correzione dei rilievi della revisione)

**Incarico e fonte.** Correggere i rilievi della revisione del diff di R1…M2 (media: tre; bassa: sei), con diff minimo, test mirati, tipi e lint. Modello: Claude Code (claude-sonnet-5-5), subagente del flusso. Nessun commit, nessuna dipendenza nuova, nessun browser, nessun tablet. Copie prima in `backup/issue-109/pre/fix-revisione/`: `Pager.tsx`, `LauncherScreen.tsx`, `WidgetGrid.tsx`, `PagerFarPages.test.tsx`, `PagerFarNear.test.tsx`, `LauncherScreen.test.tsx` e, con suffisso `.bak`, questo report, `project-status.md` e ADR-0018. `PageVisibilityContext.tsx` non è stato copiato: la modifica è l'aggiunta di due funzioni (vedi sotto) e il ritorno indietro è toglierle.

**1. R10 solo per il pallino (media), corretto.** La revisione ha ragione: la versione di R10 saltava per qualsiasi indice impostato da fuori a più di una pagina, quindi anche il bordo del trascinamento di un widget (`adjacentWidgetPage` salta le pagine che non accettano widget: distanza 2), «Annulla» (`goToPageId`) e «Sposta qui». L'utente aveva scelto «Salto diretto» solo per il pallino lontano (D-2). **La frase «il bordo del trascinamento e i pallini accanto restano a distanza 1 e scorrono» e il punto «Effetto più largo del solo pallino» dell'annotazione di R10 non valgono più**: sono sostituiti da quanto segue (lo storico non è riscritto).
- *Modifica.* `Pager.tsx`: nuova proprietà `dotJump?: MutableRefObject<number | null>`. Il chiamante scrive nel ref l'indice chiesto da un pallino; il Pager lo prende (e lo azzera) nell'effetto di layout che gestisce il nuovo indice, e solo se coincide con l'indice arrivato. Il salto istantaneo (`farJump`) e l'omissione dell'intervallo `reach` valgono solo se il ref coincide e la distanza è maggiore di `MAX_GLIDE_PAGES`. Ogni altro indice da fuori scorre di nuovo per qualsiasi distanza, con le pagine in mezzo disegnate come prima di R10. `LauncherScreen.tsx`: `goToPageFromDot` scrive il ref (non se il pallino è quello della pagina già mostrata) e chiama `goToPage`; è passata a `FlashingPageIndicator` (`onChange`) e il ref a `Pager`.
- *Test.* `PagerFarPages.test.tsx`: i due test del salto passano `dotJump`; nuovi «only a dot jumps: …» (indice +2 con `dragging` attivo, nessuna scrittura, un `scrollTo`, pagina in mezzo disegnata prima) e «the request of a dot is for one index alone: …» (il ref è preso, un altro indice non è un salto). `PagerFarNear.test.tsx`: il salto lontano passa `dotJump`.
- *Limite.* Il collegamento tra il pallino vero e il ref (`FlashingPageIndicator` → `goToPageFromDot` → Pager) non ha un test d'integrazione: il Pager è provato con il ref, il pallino no. In jsdom il Pager non ha larghezza e l'effetto esce prima. Da guardare a vista in Z con un tocco su un pallino lontano.

**2. `Pager.tsx` da CRLF a LF (media), corretto.** La rimozione di R2b aveva riscritto il file con CRLF. Ora: `prettier --write` (file LF, come HEAD e come la copia `pre/R2b-tolta/Pager.tsx`), commento della costante spezzato in due righe entro 100 colonne. Verifica: `file` non riporta più CRLF; `prettier --check` sui sorgenti toccati verde; `diff` con `pre/R2b-tolta/Pager.tsx` limitato alle righe del commento e della costante `REST_SKIPS_NEAR` (misurato prima delle altre correzioni di questa annotazione). Il diff rispetto a HEAD torna leggibile. `prettier --check src/templates/launcher` segnala ancora `StackView.tsx`, non toccato (CRLF preesistente).

**3. Primo fotogramma della pagina di arrivo di un salto con misure vecchie (media), mitigato e da misurare in Z.**
- *Che cosa si è fatto.* Un contatore in `hooks/launcher/PageVisibilityContext.tsx` (`pagerSizeEpoch`, `markPagerResized`), aumentato dall'osservatore del Pager quando cambia dimensione. `WidgetGrid.tsx` tiene il valore del contatore all'ultima misura e, quando la sua pagina diventa «vicina» (`usePageNear`), nello stesso commit (effetto di layout, prima del disegno) rimisura **solo se il contatore è cambiato** e la pagina ha una larghezza (non è ancora saltata). Se il Pager non ha cambiato dimensione non si legge nulla, quindi nessun costo nei cambi normali di pagina. È la «rimisura sincrona allo sblocco» che ADR-0018 prevedeva «se serve»; la revisione la indicava come leva da mettere solo dopo la misura, ma qui il costo è nullo fuori dal caso e il caso è diventato comune con R10. Decisione dell'agente, **correggibile**: se la misura di Z mostra che non serve, si toglie (due funzioni, un effetto e una riga dell'osservatore).
- *Test.* `PagerFarPages.test.tsx`, gruppo «a grid on a page the pager resized while it was skipped»: osservatore simulato, il Pager si ridimensiona mentre la pagina è saltata (l'osservatore della griglia non è avvisato), salto con `dotJump`, al primo commit la `--aca-cell` è quella della nuova larghezza (verificato che fallisce senza l'effetto: 117 px contro 145 px); e un test che non legge nulla se il Pager non ha cambiato dimensione.
- *Limiti.* Rimisura solo la griglia. `useMeasuredHeight` e `AdaptiveCategoryWidget` dentro i widget dipendono ancora dai loro osservatori, non notificati in una pagina saltata, e possono mostrare un fotogramma con l'altezza vecchia: **non coperti**. **Da fare in Z:** ripetere T0a punto 4 per il salto (`Emulation.setDeviceMetricsOverride`, tocco su un pallino a più di 2 pagine, primo fotogramma della pagina di arrivo con griglia, calendario e attività) e dire se il fotogramma sbagliato compare ancora per i widget.

**4. `dragging` anche per il ridimensionamento (bassa), corretto.** `LauncherScreen.tsx`: `dragging={drag.session != null && drag.session.mode !== 'resize'}`, perché il ridimensionamento non gira mai pagina (`useWidgetDrag`). Test d'integrazione in `LauncherScreen.test.tsx` («the pages kept drawn while a widget is dragged»): layout con 9 pagine; durante il ridimensionamento l'ultima pagina disegnata resta corrente +1, durante lo spostamento corrente +2, a fine spostamento di nuovo +1 (verificato che fallisce con la forma precedente).

**5. Costo del pallino accanto rispetto a O5 (bassa), corretto in parte.** Nello scorrimento animato verso una pagina nota il Pager disegnava anche la pagina oltre la meta (`follow` impostava la direzione di marcia). Ora `glideTo` tiene la meta e, finché lo scorrimento va verso di essa senza superarla, `follow` non aggiunge la pagina in direzione di marcia: un glide da i a i+1 disegna al massimo da i−1 a i+2. Uno swipe a dito dalla pagina di arrivo riprende la pagina in più. Test «a glide to a known page draws no page ahead of it as the scroll goes there» (verificato che fallisce senza). **Giudizio rispetto a O5, provvisorio:** il costo misurato in M2 (JUMP +1, blocco massimo 77 [75-132] ms contro 0 della base a intervalli non sovrapposti, somma 188 contro 147) non è né accettato né respinto: la correzione toglie solo la pagina evitabile e **va rimisurata in Z**; se il blocco massimo resta sopra la base, il pallino accanto va corretto ancora (per esempio con una finestra più stretta nel glide) o portato all'utente come costo del pallino.

**6. R2b spenta ma presente (bassa), decisione: si tiene l'interruttore.** Non si è fatto il ritorno completo (ripristino di `Pager.tsx` da `pre/R2b/` e riapplicazione di R8, R10 e di queste correzioni sopra, più la rimozione di `PagerFarNear.test.tsx` e di `skipNear: false` in `PagerFarPages.test.tsx`), per due motivi: il rischio di perdere modifiche già verificate nella riapplicazione e il costo reale del codice spento, che è basso (`touchStart` esce alla prima riga con `skipNear` falso; `letGo` fa un `setTouching(false)` con lo stesso valore, che React scarta). ADR-0018 e D-4 dicevano «si torna al livello 1»: funzionalmente è così. Decisione dell'agente, **correggibile**: se l'utente preferisce il codice tolto, il ritorno completo è descritto sopra. I test di `PagerFarNear.test.tsx` restano a guardia dell'interruttore.

**7. R5a (bassa), non decisa dall'agente: va portata all'utente prima di Z.** L'utente aveva legato R4/R5/R9 a «solo se le misure le giustificano». T0b ha dato un beneficio marginale e la scelta spettava all'agente principale o all'utente. Numeri da mostrare: il «Fatto quando» del piano (script ≤ 15 ms) non è raggiungibile per il primo commit del rilascio (1446 componenti, 55 ms); il guadagno atteso è di circa 29 ms su un task già sotto 100 ms; tocca quattro file centrali con `useSyncExternalStore` (rischio medio); M2 non la isola. **Domanda per l'utente:** tenere R5a? In alternativa Z può misurare una variante senza R5a (ripristino da `backup/issue-109/pre/R5a/`), con l'avvertenza che `LauncherScreen.tsx` contiene anche R3, R7, R10 e queste correzioni: vale il confronto con la copia di `pre/R5a/`, che include R3 e R7 ma non R10 né queste correzioni.

**8. Copie mancanti (bassa), registrate con come ricostruire lo stato precedente.** Le copie «prima» mancano per questi file di test:
- *R7.* `FixSystemFocus.test.tsx`: togliere i tre test nuovi del gruppo «the return waits for the frame after the next one (ISSUE-109, R7)» («not in the commit that closes Sistema, nor in the first frame; in the second», «Sistema opened again before the focus came back is not given it back», «leaves no frame behind when the app goes away») e riportare i due test «focuses the page title on opening…» e «puts the focus back on the gear…» alla forma senza attesa del fotogramma. `LauncherScreen.test.tsx`: togliere il test «the focus after «Fine» and after a card of the page overview waits for the frame after the next one (ISSUE-109, R7)».
- *R5a.* `LauncherScreen.test.tsx`: togliere i tre test «selecting a widget, and passing the selection on, redraws no widget of the others», «a refused move lights the error LED of that widget only and puts it out again» e «a dropped widget lands, and the end of the landing redraws no widget» (tutti marcati «ISSUE-109, R5a»). `pre/R5a/` ha già `LauncherGridGeometry.test.tsx` e `PagerFarPages.test.tsx`.
- *R10.* `PagerFarNear.test.tsx`: sono stati riscritti il test «a tap on a far dot lands at once…» e quello sul glide verso la pagina accanto; `PagerFarPages.test.tsx` è ricostruibile solo da `pre/R2b/PagerFarPages.test.tsx` più la riga `skipNear: false` e i test del gruppo «a glide to a far page, and a jump».
- *R2.* La copia di `OverviewPan.test.tsx` fu ricostruita dopo la modifica (già dichiarato).
Da qui in avanti le copie dei test si fanno prima di modificarli; per questa annotazione sono quelle di `fix-revisione/`.

**9. Documenti di stato (bassa), aggiornati.** `project-status.md` (voce di ISSUE-109 e nuovo punto di ripresa), l'intestazione («Stato») e l'«Avanzamento» di questo report e un'annotazione datata in ADR-0018 sul pallino lontano. Lo storico non è riscritto: le righe precedenti restano e queste le seguono.

**Comandi ed esiti** (cartella `progetto/acasystem/frontend`, Vitest sempre con `--maxWorkers=4`, mai la suite completa, nessun browser):

| Comando | Esito |
|---|---|
| Vitest su `PagerFarPages`, `PagerFarNear` | 2 file, 71 test verdi (45 e 26; sei test nuovi in `PagerFarPages`: salto solo dal pallino, richiesta presa una volta, glide senza pagina oltre la meta, due per la rimisura della griglia, e quello già esistente riscritto) |
| Vitest su `LauncherScreen` con `-t "pages kept drawn"` | 1 test nuovo verde; fallisce con la forma precedente di `dragging` |
| Vitest su `Pager*`, `LauncherScreen`, `LauncherIndicatorCover`, `OverviewPan`, `FixSystemFocus`, `LauncherGridGeometry` | 10 file, 311 test verdi |
| Vitest sugli altri 20 file che importano `WidgetGrid`, `Pager`, `LauncherScreen` o `PageVisibilityContext` | 20 file, 384 test verdi |
| `npm run typecheck`, `eslint` sui quattro sorgenti toccati, `npm run lint:typography`, `npm run lint:theme-colors` | verdi (0 errori; 510 e 339 file) |
| `prettier --check` sui sorgenti e i test toccati | verde |

**Non eseguito.** Suite completa, `build`, `check-bundle-size`, `npm run lint` sull'intero `src`, qualsiasi misura sul tablet o in browser (JUMP +1 dopo la correzione del punto 5, primo fotogramma del salto del punto 3, tocco vero su un pallino del punto 1). Nessun commit.

**Punto di ripresa.** Prima di Z: risposta dell'utente sul punto 7 (R5a). Poi Z (banco con copia a freddo, 5 giri alternati), con in più: salto lontano con cambio di dimensione, JUMP +1, e verifica a vista che bordo del trascinamento e «Annulla» scorrono e il pallino lontano salta.

## Annotazione del 2026-10-23 — Correzioni dell'interazione sopra ISSUE-109 (nessuna tappa del piano)

*Annotazione datata: non riscrive lo storico. Il lavoro delle tappe R1-R10 non è disfatto. Copie PRIMA in `backup/issue-109/pre/ux-0923/`. Nessun commit, nessuna dipendenza nuova, nessun browser, nessun tablet.*

Sulla prova dell'utente della 0.9.26 (vista pagine che rientra in modifica con i widget che tremano, barra «+ Widget · Pagine · Fine» ridondante, widget aggiunto non evidenziato) la modifica esiste ora solo con un widget selezionato, il tocco su una scheda torna alla pagina in uso, il tremolio è tolto e il widget aggiunto compare selezionato: decisioni e citazioni in [REP-20261021-003](REP-20261021-003-interazioni-schermo-intero.md) e [ADR-0016](../decisions/ADR-0016-schermo-intero-interazioni.md), annotazioni del 2026-10-23. Per il piano, tre effetti: `LauncherScreen.tsx` cambia ancora (la copia di `pre/R5a/` e quelle di `pre/ux-0923/` hanno basi diverse: il confronto con Z va fatto sul file attuale); la modifica che resta attiva ora è solo con un widget selezionato, quindi le misure «entra/esci dalla modifica» di Z partono dalla pressione lunga su un widget o da «Modifica la disposizione» e non dal vecchio «Modifica le pagine» della barra (anche `e2e/m11-overview.check.mjs` e gli script di `backup/strumenti-tablet/` sono da aggiornare); la pagina che torna in uso dalla vista pagine chiude la modifica nello stesso gesto, con il costo di un `setEditMode(false)` (da misurare).

**Comandi ed esiti** (cartella `progetto/acasystem/frontend`, Vitest con `--maxWorkers=4`, mai la suite completa):

| Comando | Esito |
|---|---|
| `npx tsc -p tsconfig.strict.json --noEmit`, `npx eslint src`, `npm run lint:typography`, `npm run lint:theme-colors` | verdi (0 violazioni; 510 e 339 file) |
| `prettier --check` sui sorgenti e i test toccati | verde dopo `--write` su tre file (solo righe nuove) |
| Vitest sui 76 file che importano il launcher, il pager, Sistema o i tipi del launcher | 76 file, 1417 test verdi |

**Non eseguito.** Suite completa, `build`, `check-bundle-size`, qualsiasi browser, il tablet, un nuovo banco. Non verificato che i test nuovi falliscano con il sorgente precedente. La domanda dell'utente sul televisore LG che l'app non rileva non è parte di questa annotazione.

## Annotazione del 2026-10-23 — Correzioni della revisione della memoria per dispositivo (ADR-0019, 0.9.27)

*Annotazione datata: non riscrive lo storico. Non è una tappa del piano. Copie PRIMA in `backup/issue-109/pre/fix-memoria-revisione/`. Nessun commit, nessuna dipendenza nuova, nessun browser, nessun tablet. L'informativa sull'uso dell'AI (`AiDevelopmentNotice.tsx`, `aiDevelopmentNotice.css`, `ai-development.svg`, due righe di `SystemLayout.tsx`) non è stata toccata.*

**Corretto (alta e media, più le basse con il diff minimo).**

1. **Entità eliminata e riaggiunta con lo stesso id** (luce, ventilatore, aspirapolvere: l'id è l'entity_id). Il segno «modificato» (`touched`) restava legato all'id e bloccava la ripresa. Ora un widget che esce da tutte le pagine (`rememberWidgets`, widget nascosti all'avvio) perde il segno dopo averlo riportato nella voce di memoria; la pulizia dell'avvio non lo conserva più solo perché l'id compare in `customNames`. Se il widget è ancora su un'altra pagina il segno resta. Con «Annulla» (disposizione non cambiata) il widget resta com'era e, se ricollegato, tiene i valori propri.
2. **Stanza aggiunta**: `addRooms` scriveva il nome dell'area con `saveCustomName`, che segnava la stanza come modificata. Ora usa `persistCustomNames` (nessuna modifica dell'utente). Poiché una stanza nasce con tutte le impostazioni a valori predefiniti, che prima prevalevano sempre, per il solo tipo `room` la configurazione ripresa vince sui predefiniti e il nome in memoria sostituisce quello automatico dell'area. Scelta esecutiva dell'agente, limitata a `room`: va confermata a vista.
3. **Un solo valore per dispositivo al collegamento**: a ogni collegamento, anche per un widget già modificato, le impostazioni di `DEVICE_SCOPED_SETTINGS` vengono dal dispositivo com'è ora (l'altro widget presente più recente che ha il valore, altrimenti la memoria) e prevalgono su quelle del widget. Il resto resta del widget («i valori propri vincono»). Se si allineano solo queste impostazioni non c'è copia: nessun avviso e il widget non viene segnato modificato (`AdoptionResult.source` può essere `null`). Il test esistente che chiedeva a `remoteId` (associazione) di restare quello del widget è stato corretto: ora usa `tapAction` per «i valori propri vincono» e verifica che `remoteId` sia quello del dispositivo.
4. **Orario di un widget mai modificato**: entra in memoria con 0 (non con l'ora dell'eliminazione), così non prevale su una configurazione curata; a parità vince il widget presente. I parametri `now` di `rememberWidgets` e `normalizeWidgetState` restano nella firma come `_now`.
5. **Ordine delle scritture all'avvio** (`migrateStoredWidgetState`): prima la memoria, con esito; se il browser la rifiuta non si scrive altro e la lista `tunet_hidden_cards` resta (riprova al prossimo avvio); la lista si svuota per ultima. `write` restituisce l'esito.
6. **Istantanea in arrivo** (`applySnapshot`): la memoria in arrivo è unita a quella del dispositivo voce per voce (vince la modifica più recente; per l'orario di modifica il più tardivo) e i widget collegati della disposizione uscente che le nuove pagine non hanno vanno in memoria prima di sostituire le pagine (profilo, file, sincronizzazione, «Inizia da zero»). Nuove funzioni pure `mergeWidgetMemory`, `rememberLeavingWidgets` in `deviceMemory.ts` e `readStoredWidgetState` in `widgetStateStorage.ts`.
7. **Test**: aggiunti i test d'integrazione sul percorso reale di `AddWidgetSheet` con il provider reale (entità riaggiunta su un'altra pagina, stanza ripresa, stanza nuova non segnata modificata, widget di categoria) in `WidgetMemoryAddSheet.test.tsx`; in `WidgetMemoryProvider.test.tsx` rimozione con «Annulla», riaggiunta della stessa entità, ricollegamento con impostazioni del dispositivo, unione e conservazione dei widget scartati nelle istantanee, rifiuto della scrittura della memoria all'avvio; in `DeviceMemory.test.ts` le regole pure. I test d'integrazione e quello delle stanze falliscono con i sorgenti precedenti (verificato rimettendo `deviceMemory.ts` e `AddWidgetSheet.tsx` dalle copie PRIMA).

**Non corretto in codice: ritorno alla 0.9.26 dopo il primo avvio della 0.9.27.** Dopo il primo avvio `tunet_hidden_cards` è vuota, i widget nascosti sono fuori dalla disposizione e le voci di `tunet_card_settings` dei widget eliminati sono tolte; la 0.9.26 non legge `tunet_widget_memory`. **Procedura:** per tornare alla 0.9.26 dopo che la 0.9.27 è stata aperta sul tablet bisogna ripristinare anche i dati del browser salvati prima (le chiavi del launcher in `ls-backup.json`, o la copia a freddo del banco se contiene le impostazioni sincronizzate); il solo cambio di `ACASYSTEM_VERSION` non basta. Scelta contro una chiave di copia in `localStorage`: la quota del tablet è limitata e la copia duplicherebbe `tunet_card_settings`.

**Comandi ed esiti** (cartella `progetto/acasystem/frontend`, Vitest con `--maxWorkers=4`, mai la suite completa):

| Comando | Esito |
|---|---|
| `npm run typecheck` | verde |
| `npx eslint` sui sorgenti toccati (`src/utils/launcher`, `snapshot.ts`, `AddWidgetSheet.tsx`, `PageContext.tsx`) | 0 errori, 0 avvisi (i test sono esclusi dalla configurazione) |
| Vitest su `DeviceMemory`, `WidgetMemoryProvider`, `WidgetMemoryAddSheet`, `SystemSheets`, `snapshot`, `useProfiles`, `useSettingsSync`, `useSettingsSyncDevice`, `pageContextPersistence`, `sensorCardInstances.persistence`, `FixSheetsReview`, `LauncherController` | 12 file, 182 test verdi |

**Non eseguito.** Suite completa, `build`, browser, tablet, banco. Il comportamento per le stanze (punto 2) e la ripresa all'aggiunta vanno visti a mano sul tablet nella prova della 0.9.27.

## Annotazione del 2026-10-23 — Tappa Z: misura finale, copia a freddo e banco 0.9.27

*Annotazione datata: non riscrive lo storico. Esecutore: Claude Code (claude-sonnet-5-5), subagente del flusso. Fonte dell'incarico: richiesta dell'utente «procedi con la 0.9.27, poi D1. Quando completi e porti sul banco la 0.9.27, includi anche l'informativa AI di REP-20261023-005 e verificane la presenza nelle impostazioni sul tablet». Nessun commit, nessuna dipendenza nuova, nessun comando a impianti reali, nessun token letto o usato. Copie PRIMA in `backup/issue-109/pre/banco/` (`.env`, compose, e2e) e `backup/issue-109/Z/` (`REP-20261022-002.prima.md`, `infrastructure.prima.md`, `verification.prima.md`). Dati, script e schermate in `backup/issue-109/Z/`.*

### 1. Rete

IPv4 del Wi-Fi del PC (`ipconfig`, scheda «Wi-Fi»): **192.168.1.7**, diverso da 192.168.1.27 del binding. Aggiornati binding e commento di `progetto/compose.tunet.yaml` come le righe esistenti (`192.168.1.7:3002:3002`).

### 2. Misura finale (prima del banco)

**Base e variante (dichiarate).** La base **non** è il banco su 3002 (ha dati e accesso veri e non si misura con i fixture): è il **bundle 0.9.26 estratto dal container in servizio** (`docker cp aca-tunet-tunet-1:/app/frontend/dist` in `backup/issue-109/dist-banco-0.9.26`, `index-D2DbsYXW.js`), servito sui fixture come la variante. La variante è `backup/issue-109/dist-finale` (working tree intero, `ACASYSTEM_VERSION=0.9.27 npx vite build --outDir ... --emptyOutDir`, `index-CnNjysVo.js`, **lo stesso bundle servito poi dal banco**; manifest dei sorgenti identico prima e dopo la misura: `src-manifest-*.sha`). Servite con la copia del server dei fixture sulle porte 3013 (finale) e 3014 (base), `adb reverse`, una scheda creata con `Target.createTarget` e riportata a ogni giro sull'origine della variante; chiavi di layout da `ls-prima-collaudo.json` (senza chiavi di accesso) e costante di prova del server dei fixture degli e2e (valore di prova dell'app su host locale). Fixture, non dati reali: i valori assoluti non sono quelli del banco.

**Metodo.** Tablet Tab M11 (Chrome 1280x665 a DPR 1,5), schermo acceso, `visibilityState` visible, scala 1, nessun tocco estraneo (controllo a ogni giro). Modo b (osservatore dei task lunghi e rAF), gesti sintetici (`Input.dispatchTouchEvent`). **168 giri (14 scenari x 2 build x giri 0-5), 0 non validi, 0 errori**; giro 0 a parte; 5 giri alternati (ordine invertito a ogni giro); mediana [min-max]; «migliore/peggiore» solo con intervalli non sovrapposti, altrimenti «non distinguibile» (nd). Per adattare gli scenari alla 0.9.27 (la barra «Pagine» non esiste più) la vista pagine si entra con la pressione lunga sul vuoto in **entrambe** le build; **T2 non è lo stesso gesto nelle due build**: nella 0.9.26 il tocco su una scheda porta in modifica, nella 0.9.27 in uso. Tabelle complete: `Z/tabella-ab.md`, `Z/tabella-o34.md`; grezzi in `Z/ab/`.

**Risultati (B = base 0.9.26, F = finale 0.9.27; ms salvo dove indicato).**

| Scenario / misura | B | F | Esito |
|---|---|---|---|
| T1 vista pagine (pressione + «Fine»): somma dei blocchi | 625 [568-681] | 408 [389-458] | migliore |
| T1: blocco massimo; alla pressione; a «Fine» | 190 [174-194]; 166 [163-174]; 190 | 171 [155-202]; 117 [116-119]; 171 | nd; migliore; nd |
| S7b («Fine» subito): massimo; somma; alla pressione | 179 [175-246]; 681 [621-776]; 172 [143-175] | 147 [142-200]; 443 [382-496]; 118 [117-120] | nd; migliore; migliore |
| T2 tocco su una scheda: massimo; somma | 301 [287-328]; 478 [462-616] | 177 [161-251]; 301 [216-312] | migliore; migliore |
| T3 sollevamento/rilascio/«Annulla»: massimo; somma | 280 [274-290]; 898 [862-1041] | 203 [198-218]; 586 [550-684] | migliore; migliore |
| T3: rilascio; «Annulla»; fps del trascinamento | 236 [225-243]; 151 [147-290]; 26 [24-28] | 120 [116-166]; 102 [97-112]; 38,7 [34-40] | migliore (tutti) |
| T6 (S3b, ridimensionamento): massimo; somma | 366 [356-367]; 1629 [1621-1714] | 164 [158-172]; 752 [712-844] | migliore; migliore |
| T6: ingrandire; ridurre; «Annulla» | 237 [199-272]; 182 [178-188]; 73 [60-92] | 120 [116-153]; 125 [100-141]; 72 [69-93] | migliore; migliore; nd |
| S3cD (bordo): massimo; somma | 282 [273-344]; 1113 [1081-1290] | 207 [203-224]; 816 [702-860] | migliore; migliore |
| S3cD: rilascio; «Annulla»; distanza massima copia-dito (px) | 241; 171; 270 [220-399] | 182; 97; 181 [135-263] | migliore; migliore; nd (non peggiore) |
| T4 (tocco su widget da collegare): massimo; somma | 237 [236-269]; 423 [364-472] | 164 [150-172]; 286 [253-304] | migliore; migliore |
| S5b («+» e foglio): massimo; somma | 261 [255-283]; 460 [415-542] | 182 [174-192]; 332 [286-366] | migliore; migliore |
| T5 (ritorno da Sistema): massimo; somma | 263 [259-297]; 683 [664-838] | 149 [145-159]; 346 [324-385] | migliore; migliore |
| S8 (movimento ridotto): massimo; somma | 169 [138-172]; 470 [453-492] | 147 [128-200]; 453 [377-516] | nd; nd |
| SW1/SW2/SW3, task nei 500 ms dopo l'atterraggio (massimo) | 62 / 69 / 71 | 76 / 55 / 67 (min 0) | nd in tutti e tre |
| **SW1 swipe avanti: blocco massimo durante il gesto** | 0 | 80 [73-93] | **peggiore** |
| **SW2 lancio indietro: blocco massimo; somma dei blocchi; n. di blocchi** | 0; 69 [63-77]; 1 | 55 [53-63]; 120 [108-203]; 2 [2-3] | **peggiore** (tutti e tre) |
| **SW3 «fling 1»: fps nella finestra** | 60,1 [59,9-67,2] | 35,3 [32,7-37,1] | **peggiore** |
| SW1/SW2/SW3 altre finestre di fps (swipe avanti, lancio avanti, «fling 2», ritorni) | 67-83 (mediane) | 42-83 (mediane) | nd |
| JUMP pallino a +6 / -6: eventi di scroll in posizioni intermedie | 14 [10-16] / 26 [25-27] | **0 / 0** | migliore: R10 funziona |
| **JUMP pallino a +6: blocco massimo all'arrivo; pallino a +1** | 0 [0-76]; 0 | 80 [77-81]; 108 [88-124] | **peggiore** (entrambi) |

**Chiusura della vista pagine (R1, R8; T1 e S7b, `o34.cjs`).** O3: `transitioncancel` su `.aca-pager__page` in chiusura **0** contro 1, e sui corpi **0** contro 20: **raggiunto** (giri senza `is-closing`/`is-settling`: 0). `is-closing`→`is-settling`: 534 [519-575] contro 426 [415-431] (T1) e 523 [516-529] contro 420 [418-429] (S7b): più lungo perché lo scorrimento di 360 ms ora finisce. `is-settling` tenuta 58 [57-76] contro 112 [110-115] (T1). **O4 non raggiunto:** lo strato dei «+» parte 97 [95-129] ms dopo `is-settling` (base 196 [174-224]) e **92 [91-146] ms dopo l'ultimo `transitionend` delle pagine** (T1; S7b 90 [88-103]), contro «al massimo un fotogramma» (circa 11 ms); la base misurava -2 ms perché la sua chiusura era tagliata, quindi i due numeri non si confrontano alla pari. La comparsa dura 251 ms (CSS 240).

**Obiettivi del piano (senza arrotondare).**
- **O1 (100 ms): non raggiunto** da nessun gesto (massimi di F: T1 171, T2 177, T3 203, rilascio 120, «Annulla» 102, ridimensionamento 164, bordo 207, fogli 164-182, ritorno da Sistema 149), pur con riduzioni a intervalli non sovrapposti in quasi tutti.
- **O1a (soglie di T0a): rispettata** dove c'è soglia. Vista pagine (somma ≤ 0,75 e massimo ≤ 230): T1 0,65 e 171; S7b 0,65 e 147; T2 0,63 e 177. Riposo e modifica (somma ≤ 0,75 e massimo ≤ 335): T3 0,65 e 203; T6 0,46 e 164; S3cD 0,73 e 207. Fogli e Sistema non hanno soglia: T4 0,68, S5b 0,72, T5 0,51.
- **O2: non coperto**, riportato solo per i gesti misurati (fps sopra). **O3: raggiunto. O4: non raggiunto.**
- **O5: NON rispettato.** Durante il gesto lo scorrimento è **peggiore della base** a intervalli non sovrapposti: «fling 1» 35 contro 60 fps, blocco massimo dello swipe avanti 80 contro 0 ms e del lancio indietro 55 contro 0 ms, più blocchi nel lancio (SW2 somma 120 contro 69), e il pallino a +1 costa 108 ms contro 0 (la correzione del punto 5 dell'annotazione sui rilievi della revisione non basta: il blocco resta sopra la base). Nei 500 ms dopo l'atterraggio non c'è differenza distinguibile e il blocco massimo resta uguale alla base (maggiore di 50 ms in entrambe, quindi il criterio assoluto «non oltre 50 ms» non vale nemmeno per la base). S4 ≥ 72 fps non è rispettato da nessuna build in questi gesti. Distanza copia-dito al bordo: non peggiore. Fogli (240 ms), movimento ridotto: non distinguibili o migliori. Casa 3D: contesti WebGL 0 in entrambe, **ma i fixture non hanno Casa 3D vera**, quindi non vale come prova. Telefono 390/360: **non eseguito**.
- **O6: parziale.** `docker compose up -d --build` ha eseguito dentro l'immagine il typecheck strict e la build (verdi). Suite completa, lint, i18n e dimensione dei pacchetti **non** rieseguiti da questo passo.
- **Decisione che spetta all'utente.** Il costo sull'inizio dello scorrimento (e sul pallino accanto) è una regressione misurata dovuta, per valutazione non dimostrata, alla pagina che la finestra di R2 sblocca al primo evento; l'utente ha chiesto il banco e il banco è stato aggiornato, ma si può tornare alla 0.9.26 (vedi «Ripristino») oppure chiedere una tappa che stringa la finestra all'inizio dello scorrimento.

**Schede vuote e misure (H4).** Con `Emulation.setDeviceMetricsOverride` 1024x665 e la pagina «Casa e info» (calendario, attività, griglia) saltata, **toccando il pallino lontano** (`h4z.cjs`, 3 giri): **0 fotogrammi con misure sbagliate su circa 210 per giro**, griglia, calendario e attività già giusti al primo fotogramma della pagina di arrivo; un task di 136-167 ms nel momento del salto. Non misurato a parte `AdaptiveCategoryWidget`. Schermate e logger (`vis-m2.cjs`, schermo del tablet, 4 scenari): swipe, lancio, doppio e triplo lancio, trascinamento lento: **0 fotogrammi con una pagina saltata sullo schermo** (su 1713); trascinamento di un widget ai due bordi **0** (su 679); salto del pallino **0** (su 735); **vista pagine, scorrimento molto veloce delle schede: 6 fotogrammi su 914 (0,7 %)** con una scheda vuota (circa 50 ms, un solo episodio; schermata `schermate/vista-pagine-scheda-vuota-pan-veloce.jpg`). È il caso che l'interpretazione di D-3 accetta («un istante di scheda vuota» a scorrimento molto veloce, correggibile dall'utente); nell'uso normale nessuna.

### 3. Copia a freddo e banco

- `docker compose ... stop tunet` (il container esce con codice 137, come nelle copie precedenti). `backup/banco/tunet-data-issue109-pre-0.9.27-freddo.tgz`: **465134 byte**, SHA-256 `f78a7c98af434654fb513170f907915f109e7924e9f5a5e41887758eaddb26b0`, `tar -tzf`: `./`, `tunet.db-wal`, `tunet.db`, `tunet.db-shm`. Copie di `.env`, compose ed e2e in `backup/issue-109/pre/banco/`.
- `ACASYSTEM_VERSION=0.9.27` in `progetto/.env`, `e2e/isolated-server.mjs` e `e2e/release.check.mjs`. `up -d --build` (15 s, cache): immagine `aca-system:0.9.27` (`sha256:7d5703f8611b3e0fbc5a5326a67e8a8c69bcbf6e8724847cf5b6bf6d7616f69b`), container `healthy`; `/api/health` `{"status":"ok","version":"0.9.27"}` e `/ha/auth/providers` 200 su `127.0.0.1` e **192.168.1.7**; bundle servito `index-CnNjysVo.js` e `index-CEvWC0TJ.css` = quelli di `dist-finale`. `homeassistant` non toccato. `release.check.mjs` non eseguito.

### 4. Controllo sul tablet (schermo acceso, gesti sintetici, un solo tocco alla volta; schermate in `Z/banco/`)

Prima: chiavi del launcher salvate (`ls-3002-prima-0.9.27.json`, 36 chiavi, token e chiavi di accesso escluse per nome e non lette). Tutte le schede di `http://localhost:3002` (una sola) ricaricate togliendo service worker, cache e con `ignoreCache`; bundle `index-CnNjysVo.js`. **Migrazione:** l'unico cambio fu la creazione di `tunet_widget_memory` (`{"entries":{},"touched":{}}`); `tunet_hidden_cards` era **già vuota prima** del primo avvio della 0.9.27 su questo tablet, quindi non c'era nulla da togliere dalla disposizione.

| Controllo | Esito |
|---|---|
| Pressione lunga sul vuoto al centro (1,5 s) e al bordo sinistro e destro (2,5 s), rilascio in sede | vista pagine aperta e pagina invariata (3/3); «Fine» torna in uso (3/3) |
| Pressione lunga su un widget (0,9 s) e trascinamento di due celle | barra del solo widget («Rimuovi Luce», «Annulla», «Fine»); nessuna animazione di tremolio (`animation-name` `none` su tutti); spostato, «Annulla» e «Fine»; disposizione identica |
| Tocco su un widget da collegare | foglio «Impostazioni del widget» con «Dispositivo da collegare / Non collegato»; chiuso senza collegare |
| «+» in uso | foglio «Aggiungi un widget»; chiuso senza aggiungere |
| Salto diretto da un pallino lontano (+6 e -6) | arrivo a Utilità e a Luci e comandi con **0 eventi di scroll in posizioni intermedie**; il pallino accanto (+1) scorre (94 eventi). **I pallini rispondono in modifica; in uso l'indicatore è passivo** (`aca-indicator--passive`), quindi il salto si prova con un widget selezionato |
| Scorrimento tra le pagine (swipe avanti e indietro) | Clima e meteo e ritorno, 2/2 |
| Ingranaggio, Sistema, «Torna al launcher» | ok |
| Tocco su una scheda della vista pagine | pagina in uso, nessuna barra, nessuna classe `is-overview` |
| **Sistema, informativa sull'AI (REP-20261023-005)** | pulsante «AI» con l'icona nel colore d'accento (`oklch(0.573 0.233 279)`, uguale a `--aca-accent`) in alto a destra (x 1129-1216 su 1280); apre «Uso dell'AI nello sviluppo di Acasystem» (corpo 16 px, scorrevole: 427 su 414 px, `scrollTop` 0 → 12,7); chiusura con «Chiudi», con Esc e con un tocco fuori, e **fuoco di nuovo sul pulsante in tutti e tre i casi**. Schermate: `Z/informativa-ai-impostazioni-tablet.png`, `Z/sistema-pulsante-AI-tablet.png` |
| «+» → «Orologio» → «Aggiungi il widget» | il nuovo widget compare **selezionato** con cornice e 8 maniglie; solo la barra «Rimuovi Orologio, Annulla, Fine»; nessuna barra «+ Widget» né «Pagine \| Fine»; poi rimosso |
| Nessuna voce per nascondere un widget | nella barra e nelle impostazioni del widget non c'è «Nascondi»; c'è la sezione «Visibilità condizionale» (regole), che è un'altra funzione |
| Vista pagine: «Aggiungi widget» | apre lo stesso foglio di scelta; su «Principale» **piena** (0 caselle libere, 12 widget) il nuovo orologio è andato nella pagina successiva con spazio («Luci e comandi») e la vista è passata lì, con il widget selezionato |
| «Fine» | torna in uso; nessuna barra residua |
| **Multimedia: «il widget che era nascosto non c'è più, le sue caselle hanno il +»** | **non osservabile:** la pagina è identica a prima (schermate `prima-0.9.26-multimedia` e `02-dopo-multimedia`). Le due caselle di destra della riga alta sono occupate da una pila (`stack_mvjd2g21`: media_group e Apple TV) che in uso non disegna nulla e **non mostra il «+»**. Nella 0.9.27 `isWidgetHidden` è ancora la logica di visibilità condizionale; la lista dei widget nascosti era vuota prima della migrazione. La pila resta a occupare le caselle: da guardare con l'utente |

**Prove a vista dopo la prova.** Aggiunti e rimossi i miei widget (un orologio nella prova di aggiunta; nella prova di pagina piena una dozzina di widget tra orologi e separatori su «Principale» più un orologio nella pagina successiva); ripristinate **solo** le tre chiavi cambiate dalle prove (`tunet_launcher_layout`, `tunet_pages_config`, `tunet_card_settings`) ai valori **dopo la migrazione** (`ls-3002-dopo-migrazione-0.9.27.json`), non a quelli di prima: ricarica e confronto a 8 e a 30 s, nessuna differenza. **Limite:** la sincronizzazione automatica delle impostazioni (`tunet_auto_sync_enabled=1`) può avere inviato al server lo stato di prova; non verificato sul server (nessun token usato). Schede di misura sulle porte 3013 e 3014 chiuse, dati delle due origini cancellati, scheda su 3002 riportata a «Principale».

### 5. Limiti e non eseguito

Gesti sintetici, non il dito; fixture per la misura (valori assoluti non del banco; base = bundle estratto dal container, non misurato su 3002); modo t e S4a non eseguiti; telefono, TalkBack e testo al 125-150 % non eseguiti; Casa 3D vera non misurata; O2 non coperto; suite completa, lint, i18n e dimensione dei pacchetti non rieseguiti; `release.check.mjs` non eseguito; R5a non isolata e la domanda sul punto 7 dell'annotazione sui rilievi (tenerla?) **resta aperta**: il banco la contiene. Nessun test del salto diretto in uso (l'indicatore è passivo).

### 6. Comandi

`ipconfig`; `docker cp aca-tunet-tunet-1:/app/frontend/dist backup/issue-109/dist-banco-0.9.26`; `ACASYSTEM_VERSION=0.9.27 npx vite build --outDir backup/issue-109/dist-finale --emptyOutDir`; `fixture-server.mjs <dist> 3013|3014` (PID 50412 e 54836, fermati per PID); `adb reverse tcp:3013|3014`, `adb forward tcp:9225 localabstract:chrome_devtools_remote`; `NODE_PATH=progetto/acasystem/node_modules`; in `Z/strumenti/`: `m2-tab.cjs open|prep|clear|close`, `camp.sh SW1,SW2,SW3,T1,S7b,T2,T3,T6,S3cD,JUMP,T4,S5b,T5,S8 base,finale 5 ab`, `agg.cjs ab`, `o34.cjs ab T1,S7b`, `casa-check.cjs base,finale`, `h4z.cjs finale 3 h4z`, `vis-m2.cjs ovpan|swipe|edge|jump finale`, `ls3002.cjs`, `ls3002-restore.cjs`, `bz.cjs f1.js ... f5.js` (controlli del banco); `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml stop tunet`, `docker run --rm -v aca-tunet_tunet-data:/data:ro -v backup/banco:/out alpine tar czf ... -C /data .`, `up -d --build`.

### 7. Ripristino e punto di ripresa

- **Ripristino alla 0.9.26:** `ACASYSTEM_VERSION=0.9.26` in `progetto/.env`, `up -d --build`; **sul tablet vanno ripristinate anche le chiavi di prima** (`backup/issue-109/Z/ls-3002-prima-0.9.27.json`, perché la 0.9.26 non legge `tunet_widget_memory`) e, se servisse, i dati dalla copia a freddo `tunet-data-issue109-pre-0.9.27-freddo.tgz` (container fermo). Il binding LAN resta 192.168.1.7.
- **Stato finale:** server dei fixture fermati per PID; `adb forward` tolto; resta `adb reverse tcp:3002 tcp:3002`; tablet sulla scheda 3002 a «Principale».
- **Da decidere:** (1) la regressione dello scorrimento (O5) e del pallino accanto, con la 0.9.27 già sul banco; (2) R5a (punto 7 dell'annotazione sui rilievi); (3) la pila vuota di Multimedia; (4) O4 non raggiunto. Poi D1.

## Esito del blocco (2026-10-22)

*Sezione scritta il 2026-10-23, alla chiusura del blocco «Tutto il blocco» autorizzato dall'utente il 2026-10-22 (fonte umana: «Risposte dell'utente (2026-10-22)»). Aggiunta in fondo senza riscrivere lo storico: le annotazioni delle singole tappe restano quelle sopra e prevalgono per i dettagli. Nessun commit, nessuna dipendenza nuova. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso, a partire dai risultati delle tappe e dei file in `backup/issue-109/`; non sono stati rieseguiti calcoli né misure.*

### 1. Tappe fatte e saltate

| Tappa | Esito | Note |
|---|---|---|
| T0a | Fatta (sola misura) | Schede vuote: no nell'uso normale; finestra di R2 fissata; O1a fissata; R4 non giustificata. |
| T0b | Fatta (sola misura) | R9 non giustificata; R5 solo nella forma R5a; emersa una leva non prevista (regole `:has()` a livello di widget), **non autorizzata**. |
| R1 | Fatta (codice) | Orologio di sicurezza dal primo `transitionrun` o dal primo rAF, tetto 3 x 360 ms. Misurata in M1 e in Z. |
| R3 | Fatta (codice) | La copia sollevata non usa più `getComputedStyle` (ricalcoli forzati da 5 a 1, da 266 a 5 ms in M1). |
| R2 (livello 1 di ADR-0018) | Fatta (codice) | `data-far` e `content-visibility: hidden` sul clip delle pagine fuori finestra. |
| R2b (livello 2) | Fatta e **tolta** | `REST_SKIPS_NEAR = false`: in M2 peggiora O5 (D-4: se peggiora si torna indietro). Il codice resta come interruttore e i suoi 26 test restano. |
| R8 (D-1) | Fatta (codice) | I «+» tornano un fotogramma dopo la fine della chiusura. O4 non raggiunto in Z (vedi sotto). |
| R10 (D-2) | Fatta (codice) | Salto istantaneo dal pallino lontano, **solo dal pallino** dopo la revisione (`dotJump`). Provata in Z: 0 eventi di scroll intermedi. |
| R7 (D-6) | Fatta (codice) | Fuoco al secondo fotogramma dopo in `finishEditing`, `openFromOverview` e nel ritorno da Sistema. Non misurata a parte. |
| R5a | Fatta (codice) | Stato del tocco in un archivio a selettore. Condizione del piano soddisfatta solo in senso formale, beneficio atteso piccolo (circa 29 ms su un task già sotto 100 ms). **La scelta se tenerla spetta all'utente e non è stata fatta**; nessuna misura la isola. |
| M1, M2 | Fatte (sola misura) | M1 completa; M2 solo in parte (tablet scollegato dopo la campagna A). |
| Revisione Opus e correzioni | Fatte | 3 rilievi medi e 6 bassi corretti (annotazione «correzione dei rilievi della revisione»). |
| Z | Fatta | Misura finale su fixture, copia a freddo, banco 0.9.27, controllo funzionale sul tablet. |
| **R4** | **Saltata** | Non giustificata da T0a: L1 e L3, da sole e insieme, non distinguibili dalla sola finestra di R2. |
| **R9** | **Saltata** | Non giustificata da T0b: la riscrittura dei `:is()` vale -8 % di ms di stile in T1 e nulla sul resto; le proprietà personalizzate morte valgono 1-4 ms. |
| **R5b** | **Rinviata** | Tappa più ampia; nessuna misura la giustifica. |
| **R6** | **Non si fa** | D-5 dell'utente: «No». |

**Fuori dal piano, fatte nello stesso blocco su richiesta dell'utente del 2026-10-23** (non sono tappe di questo piano; i registri sono altrove): correzioni dell'interazione di modifica (barra, vassoio, tremolio, widget aggiunto selezionato, tocco su una scheda; [REP-20261021-003](REP-20261021-003-interazioni-schermo-intero.md), sezione «La modifica esiste solo con un widget selezionato»), memoria della configurazione per dispositivo e niente widget nascosti ([ADR-0019](../decisions/ADR-0019-memoria-per-dispositivo.md)), voce «Aggiungi widget» nella vista pagine (REP-20261021-003, terza annotazione) e l'informativa sull'uso dell'AI nello sviluppo, scritta da Codex ([REP-20261023-005](REP-20261023-005-informativa-sviluppo-ai.md)) e inclusa nella 0.9.27.

### 2. Regola statistica e come leggere i numeri

5 giri alternati (ordine invertito a ogni giro), il giro 0 (riscaldamento) a parte, mediana e [min-max]. «Migliore» o «peggiore» solo se gli intervalli min-max **non si sovrappongono**; altrimenti «non distinguibile». Gesti sintetici (`Input.dispatchTouchEvent`), Tab M11, Chrome 1280x665 a DPR 1,5. Z: 168 giri, 14 scenari, 0 non validi. **La base di Z non è il banco su 3002**: è il bundle 0.9.26 estratto dal container in servizio e servito sui fixture come la variante, quindi i valori assoluti non sono quelli del banco con dati veri.

### 3. Obiettivi O1-O6: prima e dopo

Base = 0.9.26 (bundle del container), dopo = 0.9.27 (`dist-finale`, lo stesso bundle del banco), mediana, ms salvo dove indicato. Gli intervalli min-max sono nelle tabelle complete: `backup/issue-109/Z/tabella-ab.md` e `tabella-o34.md`.

| Obiettivo | Prima → dopo | Esito |
|---|---|---|
| **O1** (nessun blocco oltre 100 ms) | Blocco massimo: T1 190 → 171; T2 301 → 177; T3 280 → 203; T6 366 → 164; S3cD 282 → 207; T4 237 → 164; S5b 261 → 182; T5 263 → 149; rilascio 236 → 120; «Annulla» 151 → 102. Somme: T1 625 → 408; T3 898 → 586; T6 1629 → 752; T5 683 → 346. | **Non raggiunto.** Riduzioni a intervalli non sovrapposti quasi ovunque (in T1 il massimo non è distinguibile), ma nessun gesto sotto i 100 ms. |
| **O1a** (soglie di T0a) | Vista pagine (somma ≤ 0,75, massimo ≤ 230): T1 0,65 e 171; S7b 0,65 e 147; T2 0,63 e 177. Riposo e modifica (somma ≤ 0,75, massimo ≤ 335): T3 0,65 e 203; T6 0,46 e 164; S3cD 0,73 e 207. | **Rispettata.** Le soglie sono state fissate in T0a in modo t; in Z la misura è in modo b, quindi il confronto è indicativo. |
| **O2** (costo per fotogramma) | Solo fps del trascinamento in T3: 26 [24-28] → 38,7 [34-40]. | **Non coperto** dal blocco, come dichiarato nel piano. |
| **O3** (chiusura senza `transitioncancel`) | Sulle pagine 1 → 0; sui corpi 20 → 0. `is-closing` → `is-settling` 426 → 534 ms (T1): più lungo perché la scivolata di 360 ms ora finisce. | **Raggiunto** in Z. In M1 la forma letterale non era raggiunta (1 e 20 in entrambe le build); la riformulazione «glide ≥ 360 ms e nessuna chiusura bloccata» era soddisfatta (12 giri su 12 contro 0 su 12). |
| **O4** («+» a un fotogramma dalla fine) | Base -2 ms (chiusura tagliata, non confrontabile); dopo: i «+» partono 92 [91-146] ms dopo l'ultimo `transitionend` delle pagine (T1), 90 [88-103] in S7b. | **Non raggiunto.** Causa non indagata. |
| **O5** (scorrimento non peggiore della base) | «Fling 1» 60,1 [59,9-67,2] → 35,3 [32,7-37,1] fps; swipe avanti, blocco massimo durante il gesto 0 → 80 [73-93]; lancio indietro, blocco massimo 0 → 55 [53-63] (somma 69 → 120); pallino a +6 0 [0-76] → 80 [77-81]; pallino a +1 0 → 108 [88-124]. Nei 500 ms dopo l'atterraggio nessuna differenza distinguibile. Distanza copia-dito al bordo non peggiore (270 → 181 px). | **NON rispettato** durante il gesto. S4 ≥ 72 fps non è rispettato nemmeno dalla base in questi gesti. |
| **O6** (nessuna regressione) | Verifica completa prima di Z: 192 file e 2828 test frontend, 21 file e 202 test backend, tipi, lint, tipografia, colori, i18n, build e dimensione dei pacchetti, tutti verdi. Z: nessuna scheda o pagina vuota nell'uso normale (0 su 1713, 679 e 735 fotogrammi in swipe, bordo e salto); in vista pagine con scorrimento molto veloce 6 su 914 (0,7 %, circa 50 ms), caso accettato da D-3. | **Parziale:** coperto dal software, non dal dito vero, dal telefono, da TalkBack e da Casa 3D vera. |

**Differenza da M2 da non dimenticare.** In M2 la variante senza R2b risultava allineata alla base nello swipe di ritorno (78 [76-84] contro 82 [71-88] fps). In Z, con la build finale (che contiene in più le correzioni della revisione e R5a), «fling 1» è a 35 fps contro 60 e il pallino accanto costa 108 ms. **La causa non è stata isolata**: non è stata misurata la build finale senza una sola delle tappe. Qualsiasi spiegazione (per esempio la pagina che R2 sblocca al primo evento di scroll, o R5a) sarebbe una congettura.

### 4. Cose accertate oltre ai numeri

- **Pagine vuote.** Nessuna a riposo né nell'uso normale (condizione di ADR-0018 soddisfatta). Salto lungo dopo un cambio di dimensione: 0 fotogrammi con misure sbagliate su circa 210 per giro, 3 giri (griglia, calendario, attività). `AdaptiveCategoryWidget` non misurato a parte.
- **Migrazione di ADR-0019 sul tablet.** L'unico cambio è stato la creazione di `tunet_widget_memory`. `tunet_hidden_cards` era già vuota prima del primo avvio: il «widget nascosto di Multimedia» **non è osservabile**; la pagina è identica a prima, con una pila vuota (`stack_mvjd2g21`) che occupa due caselle senza il «+».
- **Informativa sull'AI.** Verificata sul tablet nelle impostazioni (annotazione in REP-20261023-005 e «Tappa Z», punto 4).

### 5. Schermate

In `backup/issue-109/`: `T0a/00-stato-iniziale.jpg`; `T0a/vis/` (`a2-vista-pagine.jpg`, `ovpan-win-fast.jpg`, `swipe-win-double.jpg`, `edge-win-1.jpg`, `edge-win-2.jpg`, `jump-win-1.jpg`, `jump-win-2.jpg`); `M1/vis/` (`base-lift.png`, `r1r3-lift.png`); `Z/informativa-ai-impostazioni-tablet.png`, `Z/sistema-pulsante-AI-tablet.png`; `Z/banco/` (`11-vista-pagine.png`, `13-widget-trascinato.png`, `22-salto-avanti-arrivo.png`, `50-widget-aggiunto-selezionato.png`, `62-dopo-aggiunta-pagina-piena.png`, `02-dopo-multimedia.png`); `Z/schermate/vista-pagine-scheda-vuota-pan-veloce.jpg`. M2 non ha prodotto schermate.

### 6. Limiti e non eseguito

- Gesti sintetici, non il dito vero. Fixture, non dati reali (la base non è il banco su 3002). Modo t e S4a non eseguiti in Z; T0a ha misurato T1-T3 e S3b solo in modo t, con durate gonfiate del 15-22 % uguali per base e variante.
- Non eseguiti: telefono (390/360 px), TalkBack, testo al 125-150 %, Casa 3D vera (i fixture non l'hanno: 0 contesti WebGL non è una prova), `release.check.mjs`, sincronizzazione reale tra due tablet, profilo reale con widget nascosti.
- La verifica completa è stata eseguita **prima** di Z; Z ha cambiato solo la versione in `.env` e negli e2e e l'indirizzo in `compose.tunet.yaml`. Non è stata rieseguita dopo.
- La sincronizzazione automatica delle impostazioni (`tunet_auto_sync_enabled=1`) può avere inviato al server lo stato delle prove sul tablet (poi ripristinato in locale); non verificato sul server.
- Il salto diretto si prova in modifica: in uso l'indicatore è passivo.
- Copie PRIMA mancanti per alcuni file di prova (R7, R5a, R10): ricostruzione descritta nell'annotazione sui rilievi.
- Nessun commit: il working tree contiene tutto il lavoro del blocco insieme alle modifiche preesistenti.

### 7. Punto di ripresa

Il banco è `aca-system:0.9.27` su 192.168.1.7:3002, con copia a freddo `backup/banco/tunet-data-issue109-pre-0.9.27-freddo.tgz`. **Prossimo passo: la prova col dito dell'utente sul Tab M11**, in particolare scorrimento tra le pagine, tocco su un pallino accanto, vista pagine, aggiunta di un widget e informativa «AI» in Sistema. **Decisioni dell'utente:**

1. la regressione dello scorrimento (O5): accettarla, chiedere una tappa che stringa la finestra all'inizio dello scorrimento, oppure tornare alla 0.9.26 (procedura in «Tappa Z», punto 7: `ACASYSTEM_VERSION=0.9.26`, `up -d --build` e, sul tablet, le chiavi di `ls-3002-prima-0.9.27.json`);
2. R5a: tenerla o no (in alternativa una variante senza R5a nella misura);
3. la pila vuota di Multimedia, che occupa due caselle senza il «+»;
4. O4 non raggiunto: indagare o accettare;
5. conferma o correzione delle scelte dell'agente elencate nelle annotazioni (D-3, interruttore di R2b, rimisura della griglia allo sblocco).

Proposta non autorizzata, dalla T0b: ridurre le regole `:has()` a livello di widget (19 su 37); limite superiore misurato -32 % sulla somma dei blocchi di T3, da misurare sulla build finale. Poi prosegue **D1** ([REP-20261023-003](REP-20261023-003-piano-aggiungi-dispositivi.md)), che questo blocco non ha iniziato.

## Annotazione del 2026-10-23 — 0.9.28, punto 1: lo scorrimento durante il gesto (finestra delle pagine)

*Annotazione datata: non riscrive lo storico. Esecutore: Claude Code (claude-sonnet-5-5), subagente del flusso. Fonte dell'incarico: richiesta dell'utente del 2026-10-23 «procedi con la 0.9.28 con i punti 1 e 2» (punto 1 del resoconto della 0.9.27: regressione dello scorrimento durante il gesto, O5). Nessun commit, nessuna dipendenza nuova, nessun browser, nessun tablet, nessun comando a impianti reali. Copie PRIMA in `backup/v0928/pre/scorrimento/` (`Pager.tsx`, `PagerFarPages.test.tsx`, `PagerFarNear.test.tsx`, `REP-20261022-002.md.bak`, `ADR-0018-pagine-fuori-vista.md`). File toccati: `progetto/acasystem/frontend/src/templates/launcher/Pager.tsx`, `src/__tests__/PagerFarPages.test.tsx`, `src/__tests__/PagerFarNear.test.tsx`, questo report e ADR-0018 (annotazione). `launcher.css` non è cambiato.*

### 1. Causa

**Dai dati di Z** (`backup/issue-109/Z/ab/{base,finale}/{SW1,SW2,SW3}/b-rep*/probe.json`, 3 giri per scenario letti a mano; la mediana su 5 giri è in `Z/tabella-ab.md`):

- **Nella base 0.9.26** nessun task lungo cade durante il gesto: quelli che ci sono (61-91 ms) cadono **all'atterraggio o entro 35 ms da esso** (il segno `landed:N` e il task: scarto da 0 a 35 ms nei sei giri di SW1 e SW2 letti).
- **Nella finale 0.9.27** il task lungo cade **durante il gesto**: swipe avanti (SW1) 126-193 ms dopo l'inizio del gesto, cioè poco dopo che il dito si è mosso abbastanza da togliere `is-pressing` dal pager (la classe sparisce a +111, +119 e +126 ms nei tre giri) e dura 77-93 ms; lancio avanti (SW2) 198-212 ms dopo l'inizio, 57-80 ms. All'atterraggio la finale ha un task simile alla base (0-78 ms nei tre giri di SW1). In Z ogni gesto ha cambiato l'indice di una sola pagina (`landed:3`, poi `landed:4`).
- **Pallino a +1 (JUMP)**: nella base nessun task lungo; nella finale un task di 90-122 ms **34 ms dopo il tocco** (14233 → 14267 ms nel giro 1), prima che il glide parta.

**Dal codice** (lettura di `Pager.tsx`, non una misura): al primo evento `scroll` `follow()` metteva nel `reach` la pagina verso cui andava il dito e `restWindow` aggiungeva *anche la pagina oltre* in direzione di marcia. A riposo sulla pagina `i` la finestra era `[i-1, i+1]`; al primo evento diventava `[i-1, i+3]`: **due pagine sbloccate** (`i+2`, `i+3`) a dito appena mosso, e all'atterraggio (`setReach(null)`, indice `i+1`, finestra `[i, i+2]`) la `i+3` veniva richiusa senza essere mai stata vista. Lo sblocco di una pagina è la sua pagina di stile, layout e disegno (circa 300 nodi, ADR-0018): sul Tab M11 vale circa 80-120 ms. Lo stesso valeva per il pallino accanto: il render che cambiava l'indice metteva `i+2` nella finestra prima che il glide partisse.

**Giudizio, non una misura isolata:** la causa è la finestra di R2 che si muoveva *durante* il gesto, per due motivi: lo sblocco costoso cadeva dove la base non aveva lavoro, e in parte non serviva (una pagina sbloccata e richiusa senza essere vista). R5a (stato del tocco), R8 (celle libere dopo la chiusura) e R10 (salto dal pallino lontano) non toccano lo scorrimento tra pagine vicine e il loro codice non è nel percorso di un evento `scroll`; non sono state isolate con una build, quindi restano escluse solo per lettura. In M2 la variante senza R2b era allineata alla base nei soli scenari riportati (swipe di ritorno e doppio swipe): lo swipe *avanti*, dove Z mostra i 80 ms, non era tra quelli registrati, e lo sblocco costa di più sulle pagine pesanti (Z: swipe indietro 0 [0-54] ms, lancio indietro 55 [53-63] contro 0, swipe avanti 80 [73-93] contro 0), quindi i due risultati non si contraddicono.

### 2. Scelta e confronto con le alternative

Il vincolo dell'utente è la finestra che non cambia durante il gesto, senza schede vuote nel caso normale e senza perdere il guadagno di R2 sui cambi di stato (T1 625 → 408 ms, T3 898 → 586 ms in Z).

| Alternativa | Giudizio |
|---|---|
| Finestra a riposo ±2 | Uno swipe non sblocca nulla, ma a riposo si disegnano 5 pagine su 10 invece di 3. Il guadagno di R2 è stato misurato con ±1 (A/B di ADR-0018: 0,66 della base con «solo quelle a distanza > 1»); con ±2 il guadagno diminuirebbe di una quantità **non misurata**. Scartata per non perdere il guadagno senza una misura. |
| Sblocco anticipato al `pointerdown` | È il livello 2 (R2b), già provato e tolto: peggiora lo scorrimento (swipe di ritorno 37 contro 82 fps in M2) e farebbe pagare lo sblocco a ogni tocco, anche a quelli su un widget che non diventano mai uno swipe. Scartata. |
| **Cambi solo a scorrimento fermo (scelta)** | Con snap `mandatory` e `scroll-snap-stop: always` un gesto dell'utente non supera la pagina accanto: le pagine che si vedono durante lo swipe sono la corrente e la vicina, **già disegnate a riposo**. Non c'è niente da sbloccare finché il gesto dura. La finestra si sposta all'atterraggio. |

### 3. Che cosa fa il codice ora (`Pager.tsx`)

- La finestra è costruita intorno alla pagina su cui **lo scorrimento riposa** (`rested`), non intorno all'indice che arriva. `rested` segue l'indice subito quando l'indice cambia da fuori senza scorrimento animato (salto dal pallino lontano, tastiera, movimento ridotto, pagine che cambiano, vista pagine, bordo del trascinamento di un widget) e **dopo l'atterraggio** quando lo scorrimento è un gesto o un glide verso la pagina accanto.
- **Nessun cambio durante il gesto.** `follow()` non tocca la finestra finché la parte visibile (`floor(p)` … `ceil(p)`) sta nelle pagine già disegnate. Un glide verso la pagina accanto (pallino +1, `reach`) non allarga nulla: la pagina di arrivo è nella finestra.
- **Sblocco dopo l'atterraggio**, in un task a sé: quando lo scorrimento si ferma (`SETTLE_MS` 90 ms dopo l'ultimo evento) cambia l'indice (render 1); `UNLOCK_AFTER_LANDING_MS` = 48 ms dopo la finestra si sposta sulla pagina di arrivo (render 2, sblocca la pagina che diventa vicina). Un nuovo evento `scroll` prima dello scadere annulla lo spostamento (il gesto successivo aspetta il proprio atterraggio).
- **Rete di sicurezza** (nessuna pagina vuota anche nei casi non normali): se lo scorrimento esce dalle pagine disegnate (un glide su più pagine, un secondo gesto che parte nei circa 140 ms tra l'ultimo evento e lo spostamento della finestra, rotella o tastiera) la finestra si allarga come prima (margine di una pagina e una in più nella direzione di marcia). Se atterra su una pagina che la finestra non teneva, o se si era già allargata, la finestra si sposta **subito** all'atterraggio (la pagina vista non viene mai saltata nemmeno per 48 ms).
- Invariati: finestra del trascinamento di un widget (±2), vista pagine, livello 2 (`REST_SKIPS_NEAR = false`, interruttore e test), `launcher.css`, struttura dell'albero React.

### 4. Che cosa non cambia e che cosa resta da misurare

- **Il costo non sparisce, si sposta.** Sbloccare una pagina costa ancora 80-120 ms; ora cade dopo l'atterraggio, in un task a parte, e non durante il gesto o prima dell'avvio del glide del pallino. **Rischio dichiarato:** il criterio «nei 500 ms dopo l'atterraggio nessun task peggiore della base» (base 62-71 ms, finale 55-76 ms in Z) potrebbe peggiorare, perché lo sblocco che prima cadeva nel gesto ora cade lì. Non misurato: questa parte non ha browser né tablet. Se la rimisura (SW1, SW2, SW3, JUMP, 5 giri, intervalli non sovrapposti) lo mostra, le leve sono: spostare lo sblocco in un callback di inattività con tetto, oppure sbloccare solo la pagina nella direzione dell'ultimo gesto.
- Il caso «secondo gesto entro circa 140 ms dall'atterraggio» (il «fling 2» a 130 ms dal primo rilascio di SW3 è su quel confine) può ancora allargare la finestra a metà gesto: è la rete di sicurezza, e il costo di quel caso è quello di prima.
- **`is-pressing` sul pager.** La classe `is-pressing` che il pager prende a ogni tocco (e perde al primo movimento: `pc` nei `probe.json` di base e finale) è passata da `LauncherScreen.tsx` (`className`), non dal `Pager`, ed è presente in tutte e due le build. Non è stata toccata: è l'argomento della pressione sostenuta (REP-20261021-003). Il test di guardia fissa che il **Pager** non scriva classi né `data-far` durante il gesto.

### 5. Verifiche (comandi ed esiti)

Test: 8 nuovi o riscritti in `PagerFarPages.test.tsx` (swipe avanti e indietro senza nessun cambio a ogni evento; gesto intero dal `pointerdown` al `pointerup` con `MutationObserver` su `data-far` e `class`: nessun record; finestra che si sposta dopo l'atterraggio e in un task a sé; secondo gesto prima dello spostamento; atterraggio fuori finestra; due glide verso la pagina accanto riscritti: nessun cambio fino all'atterraggio), 4 test adattati alla nuova finestra (flings, misure dopo lo sblocco, contatore che non si rimonta) e 3 adattati in `PagerFarNear.test.tsx` (livello 2). I test di guardia **falliscono con il `Pager.tsx` di prima** (5 su 6 provati) e passano con il nuovo.

- `npx vitest run --maxWorkers=4 PagerFarPages PagerFarNear`: 2 file, 74 test superati (prima: 71).
- `npx vitest run --maxWorkers=4 Pager Launcher`: 37 file, 684 test superati.
- `npm run typecheck` (strict): nessun errore. `npx eslint src/templates/launcher/Pager.tsx`: nessun errore (i file di test sono nell'elenco di esclusione). `npm run lint:typography`: 0 violazioni su 515 file. `npm run lint:theme-colors`: 0 violazioni su 341 file. `prettier --check` sui tre file: conforme.
- Build per la misura successiva: `ACASYSTEM_VERSION=0.9.28-scorrimento npx vite build --outDir backup/v0928/dist-scorrimento --emptyOutDir` → `index-NFiSOYqb.js`; SHA-256 di `Pager.tsx` in `backup/v0928/src-pager-scorrimento.sha`. `dist/` non toccato.
- **Non eseguito:** misura sul tablet (nessun browser né tablet in questa parte), suite completa (la fa una tappa successiva), telefono, Casa 3D vera. L'esito su O5 è quindi **atteso, non misurato**.

### 6. Punto di ripresa

Rimisurare con la build `backup/v0928/dist-scorrimento` (fixture, strumenti in `backup/issue-109/Z/strumenti/`: `camp.sh SW1,SW2,SW3,JUMP base,finale 5`, base = `backup/issue-109/dist-banco-0.9.26`) e confrontare con `Z/tabella-ab.md`. Controllare in particolare: blocco massimo durante il gesto (SW1, SW2, SW3), fps di «fling 1», pallino a +1 e +6, e i task nei 500 ms dopo l'atterraggio. Poi il punto 2 (pila vuota di Multimedia).


## Annotazione del 2026-10-23 (sera) — 0.9.28, punto 1: misura dello scorrimento sul Tab M11

*Annotazione datata: non riscrive le precedenti. Scritta da Claude Code (claude-sonnet-5-5) dal resoconto del passo di misura; cifre in `backup/v0928/tablet-misura/tabelle/M-sw-tre-versioni.md`. Nessun commit.*

La correzione del punto 1 («finestra delle pagine», annotazione «0.9.28, punto 1») è stata misurata sul Tab M11 (Chrome 156, 1280×665, DPR 1,5, gesti sintetici CDP sui fixture, 5 giri alternati più giro 0, tre versioni: 0.9.26 da `backup/issue-109/dist-banco-0.9.26`, 0.9.27 estratta dal contenitore, 0.9.28 da `backup/v0928/dist-finale`). **Esito su O5 / A13: non raggiunto, e peggiore della 0.9.27.**

| Misura (ms) | 0.9.26 | 0.9.27 | 0.9.28 |
|---|---|---|---|
| Blocco massimo SW1 | 62 [0-68] | 75 [52-94] | 110 [101-117] |
| Blocco massimo SW2 | 74 [68-82] | 64 [56-92] | 98 [95-105] |
| Blocco massimo SW3 | 77 [70-78] | 81 [63-87] | 95 [89-105] |
| Blocco massimo JUMP (pallini) | 93 [81-97] | 119 [89-125] | 106 [105-134] |
| Somma dei blocchi da 50 ms in su, SW1 / SW2 / SW3 / JUMP | 62 / 77 / 131 / 145 | 136 / 182 / 236 / 195 | 286 / 239 / 360 / 414 |
| Numero di blocchi, SW1 / SW2 / SW3 / JUMP | 1 / 1 / 2 / 2 | 2 / 3 / 4 / 2 | 4 / 3 / 4 / 6 |

- **Contro la 0.9.27**, a intervalli non sovrapposti: peggiore in SW1, SW2 e SW3 per il blocco massimo, e in SW2 e SW3 per la somma (SW2 239 [236-293] contro 182 [107-208]; SW3 360 [309-370] contro 236 [140-254]). Sovrapposti: somma di SW1, blocco massimo di JUMP (ma i blocchi di JUMP sono 6 contro 2 e la somma 414 contro 195).
- **Dove cade:** un task da 100-128 ms all'atterraggio (0.9.26: 51-61 ms), un secondo da circa 57 ms circa 230 ms dopo (scambio di etichetta e pillola dell'indicatore) e circa 100 ms all'atterraggio del ritorno.
- **Pallini lontani** (+6 e −6): salto diretto, 0 eventi di scroll intermedi (0.9.26: 14-32), come la 0.9.27. **Pallino accanto:** 43-46 eventi (0.9.26: 48); 80-120 ms di blocco prima della prima transizione contro 0 della 0.9.26.
- Una replica con un layout non canonico (widget Luce in più, uguale per le due build) ha dato risultati concordi (`L-sw-tre-versioni.md`; non vale come misura).
- **Limiti:** gesti sintetici, non il dito; nessuna traccia del compositore; la causa non è isolata.

**Conseguenza.** La previsione «atteso, non misurato» della sezione 5 dell'annotazione «0.9.28, punto 1» è **smentita** dalla misura. Il banco non è stato aggiornato alla 0.9.28 (resta 0.9.27). La correzione dello scorrimento nel codice richiede una decisione dell'utente (nuova tappa o ritorno al comportamento della 0.9.26), fuori da questa annotazione. Esito complessivo della 0.9.28: [REP-20261023-006](REP-20261023-006-coreografia-animazioni.md), «Esito della 0.9.28».


## Annotazione del 2026-10-23 (notte) — 0.9.28, punto 1: diagnosi della regressione dello scorrimento

*Annotazione datata: non riscrive le precedenti. Scritta da Claude Code (claude-opus-5-5), subagente del flusso, utente assente. Copie PRIMA in `backup/v0928/pre/parte3/`. Nessuna modifica al codice, nessun commit. Dettaglio, tabella completa e limiti in [REP-20261023-006](REP-20261023-006-coreografia-animazioni.md), «Diagnosi delle regressioni della 0.9.28»; estratti in `backup/v0928/diagnosi3/prove/`.*

- **Tracce CDP non registrate.** Le origini 3013-3015 del tablet non hanno più la sessione dei fixture e rimetterla richiede il valore di accesso del server isolato, che l'incarico vieta di usare. La diagnosi viene dalle serie già raccolte (M-sw, 5 giri; F-1 TAP con le mutazioni) e dal codice: **prove indirette**. Gli strumenti per le tracce (`diagnosi3/strumenti/trace.cjs`, con un segno a ogni cambio di `data-far`, e `analyze-trace.cjs`) e la build di profilo `backup/v0928/dist-profilo3` sono pronti; serve un'approvazione umana per il passo della sessione.
- **Causa (confidenza media-alta).** `Pager.tsx` 119, 473, 486-490, 947-955, 1008-1022: la finestra costruita intorno alla pagina a riposo non si allarga più durante il gesto e si sposta solo dopo l'atterraggio. Il disegno della pagina oltre, che nella 0.9.27 costava 56-94 ms durante il dito (a +184-215 ms dal tocco, con lo scroll sul compositore), ora cade all'atterraggio: nello stesso task del commit dell'indice (95-105 ms; SW2 5/5, SW1 2/5) o in un secondo task da 110-117 ms a +157-230 ms (SW1 3/5; il timer di 48 ms slitta dietro i fotogrammi dell'indicatore), sopra l'animazione dell'indicatore. Nella 0.9.28, allo sblocco, partono anche 28 transizioni di `scale` e 28 di `transform` delle caselle «+» (F-1 TAP; `launcher.css` 945-951).
- **«Ts→T0» di 1009 contro 92 ms non è una latenza:** la 0.9.27 aveva la scala del corpo pagina al tocco, tolta dalla pressione con soglia.
- **Correzione proposta (stesso aspetto).** Allargare la finestra al primo evento di scroll del gesto, come nella 0.9.27; restringerla in un momento libero dopo l'animazione dell'indicatore invece che a 48 ms; nessuna transizione su widget e caselle delle pagine non correnti fuori dalla vista pagine. **Effetto stimato:** atterraggio 50-70 ms, blocco massimo SW1 circa 75-94 e SW2 circa 64-92 ms (livello 0.9.27), nessun task dentro l'animazione dell'indicatore; non il livello della 0.9.26 (62 e 74 ms). Da misurare.
- **Non provato:** perché in SW2 la finestra si sposti nel task dell'atterraggio (ramo immediato, riga 1015): scroll oltre la pagina di più di 1,3 px nel fling o finestra di partenza diversa. Lo diranno i segni `drawn:` e `scroll:` delle tracce.


## Annotazione del 2026-10-24 — 0.9.28, punto 1: correzione dello scorrimento nel codice (parte 3)

*Annotazione datata: non riscrive le precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso, utente assente («procedi da solo sulla 0.9.28»). Copie PRIMA in `backup/v0928/pre/parte3/`. Nessun commit, nessuna dipendenza, nessun browser, nessun tablet. Dettaglio, scostamenti e test in [REP-20261023-006](REP-20261023-006-coreografia-animazioni.md), «Correzioni della 0.9.28 dopo la diagnosi».*

- **Cosa è stato fatto (stessa scelta della diagnosi).** La finestra di ADR-0018 si allarga di nuovo al primo evento `scroll` del gesto, come nella 0.9.27; l'atterraggio non cambia alcuna finestra e il commit dell'indice non sblocca nulla; la finestra si restringe alla pagina di arrivo dopo 350 ms e in un momento libero del thread principale (`requestIdleCallback`, limite 700 ms), annullato da un nuovo gesto. Il timer di 48 ms (`UNLOCK_AFTER_LANDING_MS`) è tolto. Widget e caselle «+» delle pagine non correnti non avviano transizioni fuori dalla vista pagine (`launcher.css`). Rettifica scritta anche in [ADR-0018](../decisions/ADR-0018-pagine-fuori-vista.md).
- **Prove:** `PagerFarPages.test.tsx`, `PagerFarNear.test.tsx` (le attese sono cambiate: le pagine davanti sono disegnate dal primo evento, nessun `data-far` né classe dall'arresto dello scroll al restringimento) e `RegressionCss0928.test.ts`.
- **Non misurato.** La correzione dello scorrimento è provata solo con i test; l'effetto atteso (blocco massimo SW1 circa 75-94, SW2 circa 64-92 ms, cioè il livello 0.9.27; non arriva alla 0.9.26) è la stima della diagnosi. La previsione va confrontata con una nuova misura (5 giri alternati, tre versioni). **O5 / A13 resta non raggiunto fino a quella misura.**


## Annotazione del 2026-10-24 (misura 3) — 0.9.28, punto 1: misura sul Tab M11 della correzione dello scorrimento (parte 3)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso, utente assente. Copia PRIMA in `backup/v0928/pre/parte3/REP-20261022-002-prima-misura3.md`. Nessuna modifica al codice, nessun commit. Dati in `backup/v0928/misura3/` (`RISULTATI.md`, `tabelle/M3-sw-rispetto-0.9.27.md`, `tabelle/M3-sw-tre-versioni.md`).*

Build `backup/v0928/dist-parte3` (finestra allargata al primo `scroll`, restringimento a 350 ms in un momento libero, nessuna transizione sulle pagine non correnti) contro 0.9.27 e 0.9.26, Tab M11, gesti sintetici, 5 giri alternati più il giro 0, mediana [min-max], 0 giri non validi.

| Scenario | Blocco massimo (ms): 0.9.26 / 0.9.27 / parte 3 | Somma dei blocchi >=50 ms | Numero | Esito della parte 3 contro la 0.9.27 |
|---|---|---|---|---|
| SW1 | 67 [62-79] / 85 [70-92] / 121 [76-146] | 67 / 144 / 348 | 1 / 2 / 5 | massimo nd, numero nd, somma PEGGIORE |
| SW2 | 76 [67-81] / 60 [53-80] / 76 [70-82] | 76 / 118 / 275 | 1 / 2 / 4 | massimo nd, somma e numero PEGGIORE |
| SW3 | 72 [64-77] / 85 [63-100] / 72 [71-82] | 122 / 198 / 265 | 2 / 3 / 4 | nd su tutto |
| JUMP | 91 [84-95] / 93 [91-97] / 133 [105-155] | 141 / 171 / 437 | 2 / 2 / 5 | PEGGIORE su tutto |

**Lettura.** Rispetto alla misura della sera (SW1 110 contro 75, SW2 98 contro 64, SW3 95 contro 81) il blocco massimo non è più distinguibile dalla 0.9.27 su SW1-SW3: le stime della diagnosi per il massimo (circa 75-94 e 64-92) sono confermate nell'ordine di grandezza. Non sono confermate per la somma e il numero dei task: ogni atterraggio ha ora due task (SW2, 5 giri su 5: 70-81 ms all'atterraggio e 58-64 ms circa 230 ms dopo; SW3: 71-72 ms e 60-62 ms a +150-250 ms), SW1 in 3 giri su 5 ha un task di 121-146 ms all'atterraggio (nella 0.9.27: 52-54 ms) e JUMP ha 105-155 ms al secondo e al terzo atterraggio, più un task da 55-68 ms circa 400 ms dopo il secondo atterraggio. **A13 (scorrimento non peggiore della 0.9.26, e qui nemmeno peggiore della 0.9.27) non è raggiunto**: massimo nd dalla 0.9.26 su SW1-SW3, ma somma e numero dei task peggiori su SW2, SW3 e JUMP e somma peggiore su SW1; JUMP peggiore anche nel massimo. «Ts->T0» degli scorrimenti non è una latenza (vedi la diagnosi: la 0.9.27 aveva la scala del corpo pagina al tocco).

**Cosa resta da capire.** Il task di 121-146 ms in SW1 e quelli di 105-155 ms nei pallini cadono all'atterraggio, dove la correzione non cambia alcuna finestra: la causa non è provata (serve la traccia con `trace.cjs` e `analyze-trace.cjs`, che richiede la sessione di prova dei fixture). Il secondo task a circa 230 ms (scambio di etichetta e pillola dell'indicatore) è invariato dalla sera. Il banco resta 0.9.27.

**Annotazione del 2026-10-25 (ottimizzazione della coreografia, opzione B).** Sulla scelta dell'utente «B» (continuare a ottimizzare la 0.9.28) sono stati fatti tre giri di correzioni e di misura sul Tab M11 contro la 0.9.27 di questo blocco (sintesi in [REP-20261023-006](REP-20261023-006-coreografia-animazioni.md), «Ottimizzazione della coreografia (opzione B, 2026-10-24/25)»). La 0.9.27 resta il termine di confronto e il banco; nessuna misura della sezione «Esito del blocco» è stata modificata. Dopo il giro 3 l'obiettivo «nessuna misura peggiore della 0.9.27» non è raggiunto (restano JUMP, il task prima della scena all'apertura, la somma dei task all'uscita da Sistema, il rilascio nel volo in S3cD). Nessun commit.
