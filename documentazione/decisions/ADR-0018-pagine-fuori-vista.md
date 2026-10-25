# ADR-0018 — Le pagine del launcher fuori vista non vengono disegnate dal browser

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0018 — Il browser salta stile, layout e disegno delle pagine del launcher fuori vista (`content-visibility`), senza smontarle. Si usa il primo numero libero: ADR-0015 è riservata a «Hub e bridge» (REP-20261021-001, non ancora scritta), ADR-0016 e ADR-0017 esistono. |
| Stato | **Accettata** (stato finale 2026-10-23, vedi l'ultima annotazione; era «Accettata con condizione» dal 2026-10-22). Livello 1 in uso; livello 2 provato e tolto. Condizione originale: la tappa T0a del piano non mostra schede vuote a riposo né nell'uso normale. Se T0a le mostra, l'accettazione decade e si torna all'utente. Storico: Proposta, non approvata (bozza del piano, stesso giorno). **Condizione verificata il 2026-10-23:** T0a non ha mostrato schede o pagine vuote a riposo né nell'uso normale (vista pagine ferma e trascinata, swipe, lancio, doppio e triplo lancio, trascinamento di un widget ai bordi; [REP-20261022-002](../reports/REP-20261022-002-piano-blocchi-thread.md), «Annotazione T0a»), a patto che R2 sblocchi l'intero intervallo nei salti lunghi (oppure R10 li renda istantanei): con la sola finestra «in direzione di marcia» il salto lungo mostrava pagine vuote. L'accettazione resta valida. |
| Data e autore | 2026-10-22. Scheda redatta da Claude Code (`claude-opus-5-5`) come bozza del piano [REP-20261022-002](../reports/REP-20261022-002-piano-blocchi-thread.md). Rivista lo stesso giorno dopo la critica del piano (finestra nello scorrimento e nel trascinamento, misure dei widget, test, criteri). |
| Decisore e autorizzazione | La proposta è dell'agente. Il 2026-10-22 l'utente ha risposto «procedi» solo per il piano; poi, scegliendo «Tutto il blocco», il cui testo è «T0a, R1, R3, poi R2 (accetto ADR-0018 se T0a non mostra schede vuote), poi le tappe delle tue risposte (R8, salto diretto, R2b), R4/R5/R9 solo se le misure le giustificano, revisione Opus e banco finale con copia a freddo», ha accettato l'ADR con quella condizione (fonte umana: vedi «Risposte dell'utente (2026-10-22)» in REP-20261022-002). Con «Sì, proviamolo» (D-4) ha accettato anche il **livello 2**, da provare dopo R2 con misura dello scorrimento; se O5 peggiora si torna al livello 1. Con la risposta libera a D-3 («quella meno pesante a livello di memoria»), interpretata dall'agente principale e correggibile, si accetta un istante di scheda vuota durante uno scorrimento molto veloce in vista pagine, senza allargare la finestra. |
| Collegamenti | Problema: [ISSUE-109](../project-status.md#issue-109), con ISSUE-062, ISSUE-107 e, per dipendenza, ISSUE-110 e ISSUE-112. Report: [REP-20261022-002](../reports/REP-20261022-002-piano-blocchi-thread.md), [REP-20261022-001](../reports/REP-20261022-001-collaudo-animazioni.md), REP-20261019-001, REP-20261019-002, REP-20261012-003. Decisioni: ADR-0004, ADR-0011 (aspetto invariato), ADR-0012 (PageShell senza geometria), ADR-0014/ADR-0017 (Casa 3D), ADR-0016 (gesti). |
| Sostituisce / sostituita da | Nessuna. |

## Contesto ed evidenze

**Problema.** Sul Tab M11 ogni cambio di stato del launcher blocca il thread principale per 216-383 ms, misurati senza strumenti (ISSUE-109). I cambi di stato sono vista pagine, «Fine», sollevamento, rilascio, «Annulla», fogli e ritorno da Sistema. Le transizioni ottengono così 3-6 fotogrammi su 25-50.

**Fatti misurati il 2026-10-22** sul Tab M11, banco 0.9.26, gesti sintetici (`backup/piano-issue-109/misura/RIEPILOGO.md`):

- **Dimensione del documento.** Il launcher tiene montate 10 pagine, con 2966 nodi. Le pagine non correnti ne contengono circa 1800.
- **Natura dei blocchi.**
  - Ogni blocco lungo è un ricalcolo dello stile del 68-95 % del documento (2025-2943 elementi, 70-85 µs ciascuno).
  - React costa invece 40-95 ms per cambio di stato.
  - Le pagine non visibili pagano il ricalcolo come quella visibile.
- **Prove A/B con CSS iniettato.** Somma dei blocchi rispetto alla base.

  | Variante | Sulle pagine | Vista pagine + «Fine» | Sollevamento, rilascio, «Annulla» |
  |---|---|---|---|
  | `content-visibility:hidden` sul clip | Tutte le non correnti | 0,41 | 0,39 |
  | `content-visibility:hidden` sul clip | Solo quelle a distanza > 1 | 0,66 | 0,65 |
  | `display:none` | Tutte le non correnti | 0,35 | 0,32 |
  | Transizioni spente | — | 0,82 | 0,51 |
  | Ombre spente | — | 0,74 | 0,87 |

**Inferenze, non verificate:**

- Il guadagno dipende da quante pagine stanno fuori dalla finestra. Con più pagine cresce.
- L'effetto visivo nella vista pagine non è stato verificato: con la prima variante le schede vicine risultavano vuote.
- I ResizeObserver dentro un sottoalbero saltato potrebbero non notificare: quelli di `WidgetGrid` e del Pager, ma anche quelli di alcuni widget (`AdaptiveCategoryWidget`, `useMeasuredHeight`), che allo sblocco fanno `setState` e potrebbero mostrare per un fotogramma altezze sbagliate.
- La variante a2 nascondeva tutto oltre ±1 anche in vista pagine, dove la finestra proposta è più larga: il guadagno reale in vista pagine sarà probabilmente minore di quello misurato.

**Vincoli:**

- Aspetto, durate e curve invariati (ADR-0011, `design.md`).
- PageShell non riceve geometria (ADR-0012).
- La Casa 3D precarica con `usePageNear` e conta i contesti WebGL (ADR-0014, ADR-0017).
- Lo scorrimento tra pagine oggi è fluido (72-83 fps) e non deve peggiorare.

## Proposta o decisione

**Proposta dell'agente, accettata con condizione il 2026-10-22 (vedi «Stato»).** Il livello 1 si realizza in R2 se T0a non mostra schede vuote; il livello 2 (D-4, «Sì, proviamolo») è accettato solo da provare in R2b.

1. **Livello 1, da realizzare nella tappa R2.** Il Pager calcola una finestra di pagine e scrive l'attributo `data-far` sulle `<section>` che ne restano fuori. Il foglio di stile dà `content-visibility: hidden` al loro `.aca-pager__clip`.
   - **Finestra:**
     - a riposo e in modifica: la pagina corrente ±1;
     - durante uno swipe o un lancio: estesa nella direzione dello scorrimento già al primo evento `scroll`, senza aspettare il cambio di indice (che avviene solo a scorrimento fermo), così una pagina non arriva a schermo saltata e lo sblocco non cade dopo l'atterraggio;
     - durante il trascinamento di un widget: corrente ±2, così il cambio di pagina al bordo non sblocca una pagina a metà gesto;
     - in vista pagine: le schede visibili ±1, aggiornate durante il trascinamento delle schede;
     - durante uno scorrimento animato verso una pagina lontana: tutto l'intervallo percorso; nel salto istantaneo (tastiera, movimento ridotto) la pagina di arrivo si sblocca nello stesso commit;
     - prima di leggere la geometria di una griglia su una pagina saltata («Sposta qui», rilascio dal vassoio in vista pagine) la pagina si sblocca.
   - **Albero React invariato:** nessuna pagina viene smontata. Stato, polling (`usePageVisible`), precaricamento (`usePageNear`) e contesti restano come oggi.
   - **Pagine non visibili:** sono già `inert` e `aria-hidden` a riposo, quindi l'accessibilità non cambia. L'attributo viene tolto prima che la pagina diventi visibile.
2. **Livello 2, accettato da provare (D-4: «Sì, proviamolo»), tappa R2b dopo R2, con misura dello scorrimento; si torna al livello 1 se O5 peggiora.** Anche le pagine accanto vengono saltate a riposo e sbloccate al primo contatto del dito sul pager, o durante il trascinamento di un widget verso il bordo.

## Alternative e motivazioni

- **`display:none` sulle pagine lontane.** Le misure sono migliori: 0,32-0,35 della base. Però toglie i box:
  - le griglie misurano 0 e i ResizeObserver danno valori nulli, lo stesso meccanismo di ISSUE-110;
  - al ritorno la griglia va ricostruita, e il fuoco cambia.

  Scartata.
- **Smontare le pagine lontane (virtualizzazione in React).** Si perdono lo stato e il polling. Arrivando su una pagina la si rimonta, con costo e possibile scatto. La Casa 3D andrebbe ripensata. Scartata.
- **`content-visibility: auto`.** La finestra la decide il browser, con un margine non controllato. Se il margine comprende le pagine accanto, l'effetto è pari al livello 1. Da confrontare nella tappa T0 del piano. Resta un'alternativa al calcolo esplicito della finestra.
- **Solo classi limitate alla pagina corrente**, cioè `is-dragging`, `is-editing` e `user-select`. Il guadagno è parziale e da misurare. È complementare: tappa R4.
- **`editMode` differito per le pagine lontane.** Riduce React, ma non lo stile. Cambia per un istante ciò che si vede (domanda D-5). Non scelta ora.
- **Transizioni od ombre ridotte.** Cambiano l'aspetto (ADR-0011). Non proposte.

**Questioni irrisolte:**

- la finestra corretta in vista pagine per tutte le dimensioni del dispositivo (tablet, telefono, PC);
- il comportamento dei ResizeObserver e dei layout effect di misura (`WidgetGrid.tsx:255-289`, widget con misura propria) quando una pagina viene sbloccata dopo una rotazione;
- il costo dello sblocco di una pagina (stile, layout e disegno di circa 300 nodi) durante lo swipe: deve cadere mentre il dito si muove, non dopo l'atterraggio, senza peggiorare lo scorrimento oggi fluido.

## Conseguenze

- **Benefici attesi.** Dalla misura A/B: somma dei blocchi tra 0,65 e 0,66 della base con una finestra ±1 ovunque (a2), tra 0,39 e 0,41 con il livello 2. Il livello 1 come proposto ha una finestra più larga in vista pagine, quindi il guadagno reale si conoscerà solo dalla tappa T0a del piano. Si riduce anche il costo di `showModal()` dei fogli e del ritorno da Sistema, ma questi due casi non sono stati misurati con la variante.
- **Comportamento.** Nessun cambio visibile, se la finestra è corretta. Se in una prova appare una scheda o una pagina vuota, il livello non si applica finché l'utente non decide (D-2, D-3).
- **Codice.** Toccati `Pager.tsx` (calcolo della finestra e attributo), `launcher.css` (una regola) e, se serve, una rimisura allo sblocco in `WidgetGrid.tsx`. Non cambiano né PageShell né gli API, i dati o l'infrastruttura. Nessuna dipendenza nuova.
- **Test.** Nuovi test sull'attributo e sulla finestra, compresi salto istantaneo, scorrimento veloce, trascinamento al bordo e geometria su pagina saltata. Se qualche test esistente vada riscritto (per esempio `LagLayers`, che fissa selettori e `will-change`) è da verificare in R2.
- **Licenze.** Nessun effetto.

## Verifiche e revisione

- **Prima di accettare:** la tappa T0a del piano deve verificare a vista, con schermate sul Tab M11, la finestra simulata in vista pagine, lo swipe veloce e doppio, il trascinamento di un widget al bordo e il comportamento dopo una rotazione o un ridimensionamento.
- **Dopo la realizzazione:** valgono i criteri della tappa R2 di REP-20261022-002, con 5 giri e intervalli min-max non sovrapposti:
  - soglie di O1a fissate dopo T0a, separate per vista pagine e per riposo e modifica;
  - nessuna scheda vuota in tutti i giri;
  - scorrimento ≥ 72 fps e nessun task dopo l'atterraggio peggiore della base o oltre 50 ms;
  - Casa 3D invariata;
  - telefono a 390 px senza pagine vuote.
- **Revisione:** va rivista se Chrome cambia il comportamento di `content-visibility`, se il numero di pagine cambia molto o se una prova col dito mostra pagine vuote.

## Annotazione del 2026-10-23 (tappa R2)

Il livello 1 è realizzato nel codice (`Pager.tsx`, `launcher.css`, una proprietà `dragging` passata da `LauncherScreen.tsx`, un'opzione `onPan` di `useOverviewPan.ts`), con la finestra consigliata da T0a: a riposo e in modifica la pagina corrente ±1; nello scorrimento `[floor(p) - 1, ceil(p) + 1]` più una pagina nella direzione di marcia già al primo evento `scroll`; con un widget trascinato corrente ±2; in vista pagine le schede visibili ±1; con un tocco su un pallino lontano tutto l'intervallo partenza-arrivo, disegnato nel commit che cambia l'indice (finché R10 non lo rende istantaneo); nei salti istantanei la pagina di arrivo ±1 è disegnata prima della scrittura di `scrollLeft`. Per D-3 (interpretazione dell'agente principale, correggibile) la finestra della vista pagine non è stata allargata. Stato: **realizzato e provato solo con i test**; i criteri della sezione «Verifiche e revisione» (misura sul tablet, schermate, telefono a 390 px) non sono ancora eseguiti. Dettagli, decisioni di tappa, comandi e limiti in [REP-20261022-002](../reports/REP-20261022-002-piano-blocchi-thread.md), «Tappa R2 realizzata». Il testo sopra resta quello originale.

## Annotazione del 2026-10-23 (tappa R2b)

Il livello 2 è realizzato nel codice (`Pager.tsx`) sopra il livello 1, con un unico interruttore, `REST_SKIPS_NEAR` (e la proprietà `skipNear` per i test). A riposo si disegna la sola pagina mostrata; le pagine accanto tornano nel commit del primo tocco del pager (dito o penna, non il mouse), durante lo scorrimento e il trascinamento di un widget (corrente ±2, invariato); a dito sollevato restano 300 ms, o fino alla fine dello scorrimento in corso. Spegnere l'interruttore ripristina il livello 1. Stato: **realizzato e provato solo con i test**; la misura dello scorrimento che decide se tenerlo (D-4: se O5 peggiora si torna al livello 1) e le schermate sul tablet non sono ancora eseguite. Dettagli, scelte di tappa, comandi e limiti in [REP-20261022-002](../reports/REP-20261022-002-piano-blocchi-thread.md), «Tappa R2b realizzata». Il testo sopra resta quello originale.

## Annotazione del 2026-10-23 (livello 2 provato e tolto)

Il livello 2 (R2b) è stato provato come da D-4 e **tolto**: `REST_SKIPS_NEAR = false` in `Pager.tsx`, si resta al livello 1. Misura M2 (5 giri più il giro 0, intervalli min-max non sovrapposti, gesti sintetici su fixture, base `dist-base`): fps nello swipe di ritorno 37 [32-51] contro 82 [71-88] della base e 78 [76-84] senza R2b; frame più lungo 144 ms contro 33 ms; doppio swipe 23 fps contro 54 della base e 50 senza. Il pointerdown che disegna le pagine accanto costa nei primi fotogrammi del dito (valutazione, non dimostrata). Il testo sopra resta quello originale. Dettagli in REP-20261022-002, «R2b tolta».

## Annotazione del 2026-10-23 (R10 e la rimisura allo sblocco)

Con R10 (D-2 «Salto diretto») il tocco su un pallino lontano dell'indicatore **non sblocca più l'intervallo** tra partenza e arrivo, come prevedeva il punto «scorrimento animato verso una pagina lontana»: atterra subito sulla pagina di arrivo, che è nella finestra del commit (corrente ±1) prima della scrittura di `scrollLeft`. Vale **solo per il pallino** (`dotJump` in `Pager.tsx`): il bordo del trascinamento di un widget, «Annulla» e le altre chiamate di `goToPage` e `goToPageId` scorrono, a qualsiasi distanza, con l'intervallo disegnato come in questo documento. Il pallino accanto scorre come prima. Il salto rende comune un caso che qui era raro: la pagina di arrivo può essere stata saltata durante un cambio di dimensione del pager e mostrata senza la pagina di margine. Per questo `WidgetGrid.tsx` rimisura nel commit che la rende vicina, solo se il pager ha cambiato dimensione dall'ultima misura (la «rimisura allo sblocco» del punto «Codice»); i widget con osservatori propri (calendario, attività) non sono coperti e sono da guardare in Z. Il testo sopra resta quello originale. Dettagli in REP-20261022-002, «Annotazione del 2026-10-23 (correzione dei rilievi della revisione)».

## Annotazione del 2026-10-23 (stato finale al termine del blocco)

*Annotazione datata: il testo sopra resta quello originale, salvo la prima parola del campo «Stato».*

- **Accettata.** La condizione («T0a non mostra schede vuote a riposo né nell'uso normale») è soddisfatta ([REP-20261022-002](../reports/REP-20261022-002-piano-blocchi-thread.md), «Annotazione T0a»). Nella misura finale (Z, build 0.9.27 su fixture, Tab M11, gesti sintetici): 0 fotogrammi con una pagina saltata su schermo su 1713 (swipe, lancio, doppio e triplo lancio), 679 (trascinamento di un widget ai bordi) e 735 (salto del pallino); in vista pagine con scorrimento molto veloce delle schede 6 su 914 (0,7 %, circa 50 ms, un solo episodio), il caso che l'interpretazione di D-3 accetta e che l'utente può correggere.
- **Livello 1 tenuto.** È nel codice con la finestra descritta sopra (riposo ±1, scorrimento con una pagina nella direzione di marcia, trascinamento di un widget ±2, vista pagine con le schede visibili ±1). Effetto misurato in Z rispetto alla 0.9.26, a intervalli non sovrapposti: somme dei blocchi 0,46-0,73 della base (T1 625 → 408, T3 898 → 586, T6 1629 → 752 ms) e blocchi massimi 102-207 ms. **Nessun gesto scende sotto i 100 ms.**
- **Livello 2 tolto** (D-4: «se O5 peggiora si torna al livello 1»). Misura M2: swipe di ritorno 37 [32-51] fps contro 82 [71-88] della base e 78 [76-84] senza il livello 2; frame più lungo 144 ms contro 33 ms; secondo lancio del doppio swipe 23 contro 54 fps. `REST_SKIPS_NEAR = false` in `Pager.tsx`; il codice del livello 2 resta come interruttore, con i suoi test.
- **Questione aperta.** Nella misura finale lo scorrimento durante il gesto risulta **peggiore della base** anche senza il livello 2 (primo lancio 35 [32,7-37,1] contro 60,1 [59,9-67,2] fps; blocchi di 55-80 ms contro 0; pallino a +1 108 ms contro 0), mentre in M2 la variante senza livello 2 era allineata alla base. La build finale contiene in più le correzioni della revisione e R5a; la causa non è stata isolata e non è dimostrato che sia la finestra del livello 1. Si decide con l'utente (ripristino alla 0.9.26, finestra più stretta all'inizio dello scorrimento, oppure accettazione). Fino ad allora l'ADR resta Accettata per l'idea e per la condizione sulle schede vuote, ma **l'obiettivo O5 non è rispettato**.
- **Questioni irrisolte dell'ADR:** la rimisura dei ResizeObserver dopo un salto è risolta per la griglia (rimisura nel commit in cui la pagina diventa vicina); griglia, calendario e attività misurati in Z con 0 fotogrammi sbagliati su 3 giri; `AdaptiveCategoryWidget` non misurato a parte. La finestra in vista pagine non è stata allargata (D-3). Telefono a 390 px non misurato.

## Annotazione del 2026-10-23 (0.9.28, la finestra non cambia durante il gesto)

*Annotazione datata: il testo sopra resta quello originale.*

**Rettifica del punto «Finestra», riga «durante uno swipe o un lancio».** Nella misura finale della 0.9.27 la finestra che si allargava al primo evento `scroll` sbloccava due pagine a dito appena mosso (80-120 ms circa) dove la base 0.9.26 non aveva alcun task durante il gesto; una delle due veniva richiusa all'atterraggio senza essere vista. Da questa annotazione **la finestra non cambia durante il gesto**: è costruita intorno alla pagina su cui lo scorrimento riposa e si sposta all'atterraggio, in un task a sé (48 ms dopo il cambio di indice). Uno swipe e un glide verso la pagina accanto non sbloccano nulla, perché la pagina di arrivo è già disegnata a riposo (snap `mandatory` con `scroll-snap-stop: always`: un gesto non supera la pagina accanto). La finestra si allarga come descritto sopra solo se lo scorrimento esce dalle pagine disegnate (glide su più pagine, secondo gesto che parte prima dello spostamento, rotella): è la rete di sicurezza contro le pagine vuote. Cade così anche la frase della questione irrisolta «lo sblocco deve cadere mentre il dito si muove, non dopo l'atterraggio»: la misura ha mostrato il contrario, e lo sblocco ora cade dopo l'atterraggio. La condizione di accettazione (nessuna scheda vuota nell'uso normale) non cambia. Livello 2 tolto, finestra del trascinamento e della vista pagine invariate. Stato: **realizzato e provato solo con i test**; la rimisura dello scorrimento (O5) sul tablet non è stata eseguita in questa parte e il costo dello sblocco dopo l'atterraggio, atteso fra 80 e 120 ms, è da misurare. Dettagli, dati e confronto con le alternative in [REP-20261022-002](../reports/REP-20261022-002-piano-blocchi-thread.md), «0.9.28, punto 1».


## Annotazione del 2026-10-24 (0.9.28, parte 3: la finestra segue di nuovo il gesto)

*Annotazione datata: non riscrive le precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso, utente assente; scelta esecutiva dentro il perimetro dell'incarico («procedi da solo sulla 0.9.28», tempi e meccanismi interni cambiabili se l'aspetto approvato resta). Copia PRIMA in `backup/v0928/pre/parte3/`.*

**Rettifica dell'annotazione del 2026-10-23 («la finestra non cambia durante il gesto»).** La misura della sera del 2026-10-23 sul Tab M11 ([REP-20261022-002](../reports/REP-20261022-002-piano-blocchi-thread.md), «0.9.28, punto 1: misura dello scorrimento») ha smentito quella scelta: il blocco massimo è salito a 110, 98 e 95 ms (SW1, SW2, SW3) contro 75, 64 e 81 ms della 0.9.27, perché il disegno della pagina oltre cadeva all'atterraggio, sopra l'animazione dell'indicatore. La diagnosi ([REP-20261023-006](../reports/REP-20261023-006-coreografia-animazioni.md), «Diagnosi delle regressioni della 0.9.28») ha dato questa causa con confidenza media-alta, **da prove indirette** (nessuna traccia CDP). Da questa annotazione:

- **Durante il gesto** la finestra si allarga di nuovo al primo evento `scroll`, come nella 0.9.27 (`[floor(p) - 1, ceil(p) + 1]` e una pagina in più nella direzione del moto): le pagine che servono sono disegnate mentre lo scorrimento gira sul compositore, non dopo.
- **All'atterraggio** il commit dell'indice non cambia alcuna finestra: ciò che il gesto ha disegnato resta. La finestra si restringe alla pagina su cui è atterrato lo scorrimento **dopo** `NARROW_AFTER_LANDING_MS` (350 ms, oltre la transizione dell'indicatore di 220 ms) e **in un momento libero** del thread principale (`requestIdleCallback`, limite `NARROW_IDLE_TIMEOUT_MS` = 700 ms; senza l'API, alla scadenza del primo tempo). Un nuovo scorrimento annulla il restringimento, che il suo atterraggio chiede di nuovo. Il timer di 48 ms (`UNLOCK_AFTER_LANDING_MS`) è tolto.
- Le pagine fuori dalla vista corrente (non `is-current`) non avviano transizioni su widget e caselle «+» (`launcher.css`, regola con `transition: none`), tranne nella vista pagine, durante il ritorno delle schede, l'assestamento e l'entrata: la pagina è fuori schermo e nulla di visibile cambia, ma lo sblocco non avvia più circa 60 transizioni nello stesso task.
- Invariati: livello 2 tolto, finestra del trascinamento (due pagine per lato) e della vista pagine, nessuna pagina vuota nell'uso normale.

**Stato: realizzato e provato con i test; non misurato sul tablet.** L'effetto atteso (blocco massimo vicino al livello della 0.9.27, non della 0.9.26) è una stima, da verificare con la stessa misura (5 giri alternati). Il costo dello sblocco torna a cadere durante il dito (nella 0.9.27: 56-94 ms a +184-215 ms dal tocco): se la prova col dito lo mostra come scatto, la strada alternativa è disegnare in anticipo al tocco, che sposta il costo sul tocco di ogni widget e non è stata scelta.
