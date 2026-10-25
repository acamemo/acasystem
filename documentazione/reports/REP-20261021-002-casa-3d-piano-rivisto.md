# REP-20261021-002 — Casa 3D: piano rivisto (schermo intero, barra laterale, editor a quadretti)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261021-002. Piano rivisto della Casa 3D; prosegue [REP-20261020-002](REP-20261020-002-casa-3d-piano.md). Numero libero il 2026-10-21 (ultimo REP-20261021-001); va ricontrollato al salvataggio |
| Stato | **Piano rivisto proposto, con critica di completezza integrata; proposte accettate il 2026-10-21 con due correzioni (vedi «Risposte dell'utente (2026-10-21)»); nessuna implementazione autorizzata** |
| Data | 2026-10-21 (Europe/Rome) |
| Autore / modello | Claude Code (Opus 5.5, `claude-opus-5-5`). Tre letture in sola lettura (A: stato della Casa 3D e della T7; B: modello e bundle `casa3d/`; C: launcher e primitive), poi una critica di completezza con verifiche in sola lettura. Modello delle letture non disponibile |
| Commit di partenza | `7298d4d`. Il lavoro della Casa 3D (T2-T7) non è versionato. Comprende file nuovi (`??`) e modifiche a file tracciati mescolate al lavoro di altri incarichi (`git status`: 434 voci, di cui 201 `??`) |
| Autorizzazione | Solo il piano: nessuna modifica al codice, nessun banco, nessun tablet, nessun comando a HA. Unica scelta confermata dall'utente: quadretto da 50 cm. La T7 è fermata su richiesta dell'utente |

**Richiesta dell'utente (2026-10-21)**, riportata dall'agente principale come idea da trasformare in piano:

> «il mio dubbio è come fare ad editare la casa, secondo me la base appena fatta già è una base di partenza eccezzionale, ma si deve ristrutturare, innanzitutto il 3d a pagina piena, 100%dvh di altezza e larghezza per avere la preview a schermo intero, un chevron menu in alto a sinistra che cliccato fa apparire una barra laterale, possibilità di editare la mappa con un editor a blocchi stile geometry dash, una griglia a righe di quaderno, possibilità di mettere una stanza come un quadratino e allargarlo come si fa sulla griglia delle pagine per creare la stanza, assegnargli il nome, e ciò che viene scritto in 2d è visualizzabile nella preview e nell'esplorazione 3d, che deve essere attiva di base, con scroll e con ingrandimento previsti di base, esplora come opzione da barra laterale, possibilità di aggiungere dalla piantina tutti gli oggetti che sono già presenti nel 3d attuale, come tavoli, sedie, poltrone, porte, messe poi dalla piantina e che generano la preview 3d che visualizziamo»

Risposta ai miglioramenti proposti dall'agente principale:

> «sì, fermala e prepara il piano, 50 cm va bene»

**Miglioramenti proposti.** Restano proposte; l'unico confermato è il quadretto da 50 cm.
- Misure vere: quadretto = 50 cm, misure mostrate mentre si allarga, inserimento numerico.
- Muri automatici, con quelli in comune uniti; porte e finestre toccando un muro.
- Stanze a L fatte con due rettangoli con lo stesso nome.
- Nome della stanza = area di HA, con i dispositivi che compaiono da soli.
- Tavolozza di arredi per stanza, con ingombro e rotazione di 90°.
- Piani come schede.
- 2D e 3D alternati sul Tab M11.
- Annulla e ripeti, salvataggio automatico con avviso di conflitto, «Rimetti la vista».
- Modifica solo per l'installatore.
- Pagina del launcher come anteprima ferma; dalla casa si esce **con la freccina o il tasto indietro**.

## Obiettivo e perimetro

**Obiettivo.** Tradurre l'idea dell'utente in tappe piccole e verificabili:
- riusando la base T2-T6;
- dicendo cosa cambia rispetto ad [ADR-0014](../decisions/ADR-0014-casa-3d.md);
- integrando la critica di completezza del 2026-10-21.

**Fuori perimetro:**
- modifiche al codice;
- la chiusura della T7;
- banco e tablet;
- l'applicazione delle annotazioni agli ADR;
- i commit;
- i comandi a HA.

**Collegamenti.**
- **Requisiti:** REQ-06/AC-06 (approvato, P0: il cliente senza privilegi di amministratore), REQ-07, REQ-09, REQ-10, REQ-16, REQ-17. Il conflitto con `product.md` 6.1-6.4 (D15) resta aperto.
- **ADR:** ADR-0004, ADR-0005, ADR-0009, ADR-0011, ADR-0012, ADR-0013, ADR-0014.
- **Issue:** ISSUE-062, ISSUE-085, ISSUE-096, ISSUE-097, ISSUE-101, ISSUE-102, ISSUE-103, ISSUE-104.
- **Piano concorrente:** [REP-20261021-001](REP-20261021-001-hub-bridge-piano.md), Hub e bridge. Usa già **ADR-0015** e propone una «sessione installatore».

**Modifiche preesistenti.** Il working tree contiene T2-T6, la T7 parziale (copia in `backup/casa3d/T7-parziale/stato-fermato.tgz`) e il lavoro di altri incarichi. Questo report non li tocca.

## Criteri di completamento

- [x] Il piano contiene: esperienza, architettura, trattamento della T7, tappe con «Fatto quando» e rischi, annotazione all'ADR, decisioni e domande.
- [x] Fatti e valutazioni sono distinti, con file e righe; le affermazioni non supportate sono state verificate o corrette.
- [ ] Risposte dell'utente alle domande (in attesa).
- [ ] Accettazione del nuovo ADR o dell'annotazione (in attesa).

## Avanzamento e modifiche

### 1. Stato di partenza (fatti)

**Pagina e Vista.**
- `frontend/src/casa3d/Casa3dPage.tsx` ha tre stati: Riposo (anteprima SVG), Vista ed Esplora.
- Esplora si attiva con un tocco breve o con il pulsante (`useCasa3dExplore.ts` righe 356-399) e blocca il pager (`usePageLock`).
- La pagina usa ancora il piano d'esempio: `Casa3dPage.tsx` righe 49, 69 e 97; `Casa3dVista.tsx` righe 69-77.
- Il canale di T6 (`planApi`) non è collegato (ISSUE-103).

**«Elenco stanze».** Oggi mostra **solo i nomi** delle stanze (`Casa3dPage.tsx` righe 202-212): niente dispositivi, stato o comandi.

**Anteprima.** `Casa3dPlanPreview.tsx` disegna solo i poligoni delle stanze di un piano: niente aperture, niente mobili, un piano solo. ADR-0014 (sezione 2) prevedeva invece un'immagine catturata con la scritta «Anteprima». L'SVG è uno scostamento, oggi non dichiarato.

**Piano salvato sul banco.** Sul banco 0.9.19 **c'è un piano salvato**: il piano d'esempio alla revisione 6, scritto dalla prova di T6. Non esiste una rotta per cancellarlo (REP-20261020-002, «T6 — esito», Limiti, punto 3). Verifica fatta con node su `casa-esempio.json`:
- le 6 stanze sono rettangoli su multipli di 0,5 m;
- 15 mobili su 17 non stanno sul passo di 25 cm;
- le aperture hanno larghezze di 0,95, 1,4, 0,6 e 0,8 m, con offset come 2,2 e 1,7.

**Modello** (`casa3d/src/model.ts`).
- `Room.points` è in metri, con `area_id` (righe 19-57).
- `Opening` usa `room_id`, `edge` e `offset` (righe 64-127).
- `Furniture` (righe 138-155) e `Placement` (riga 268) **non hanno `room_id`**.
- `Floor`: righe 317-336.
- I muri non sono salvati: li ricava `generateWalls` (`geometry/walls.ts:92`).

**Muri sui vertici allineati.** Verificato con una prova fuori dal repository, cioè uno script nello scratchpad che importa `walls.ts`:
- una L di 8 vertici, con due vertici allineati, dà gli stessi 6 muri di una L di 6 vertici; i tratti uniti hanno 2 sorgenti;
- con una stanza accostata, il lato comune è un solo muro interno con 2 sorgenti.

**Vista 3D.**
- `setBuilding` rifà tutti i piani a ogni cambio (`viewer3d.ts:824-832`, 2056 e seguenti). Il costo sul Tab M11 non è misurato.
- `invalidate` (riga 1676) ferma solo il disegno, non il rebuild.
- L'elemento espone `resetView` (`view3d.ts:4065`).
- Esiste già una **passeggiata ad altezza d'occhi**: `WalkCamera` (`viewer3d.ts:60-61`) e `walkable` (`view3d.ts:453-454`, avvio alle righe 3445-3499).
- La vista salva il piano da sola solo per le valvole della piscina (`view3d.ts:1960-1966`): serve un amministratore e la funzione `pool`, non rilasciata.

**Persistenza (T6).**
- Rotte: GET `/building` e `/building/revision`, PUT `/building` con compare-and-swap e 409; immagini; cronologia; backup (`casa3dApi.ts` righe 27-46).
- **Nessuna rotta dice al client il suo ruolo.** Il ruolo del server è `is_admin || is_owner` (`helpers/casa3dRole.ts`). Il client vede solo `hass.user.is_admin` (`haShim.ts:409`), che dietro l'ingress è falso.
- Limiti di frequenza: **120 al minuto su `/api/casa3d`** (`rateLimit.ts` righe 43-48, `casa3dApi.ts` riga 24) più 300 al minuto su tutto `/api`. La chiave è l'indirizzo del socket, senza `trust proxy` (`rateLimit.ts` riga 81).
- Corpo JSON fino a 2 MB (`config/security.ts:42`).
- Punti di ripristino: 20, uno ogni 600 s (`casa3dService.ts` righe 43-44).
- `planApi` fa polling della revisione ogni 30 s ed è «una istanza per elemento, mai condivisa» (`planRequest.ts` righe 35-41).
- La bozza locale `casa3d.unsaved` appartiene a `building-controller.ts` del bundle, cioè all'editor copiato.

**Interfacce della cronologia e del backup.**
- Esistono **solo** in `components/editor.ts`: gli import di listHistory, restoreSnapshot, takeSnapshot, fetchBackup e restoreBackup sono alle righe 6 e 128.
- `Casa3dSection` di Sistema contiene solo il selettore della qualità e non apre la casa.

**Editor copiato.**
- `editor.ts` ha 15.070 righe ed è soggetto a 42 patch in `rinomina.mjs`.
- Il bundle `casa3d-editor` pesa 703.926 B, il 33,6% dei 2.091.878 B di `dist`. Nessuna parte del frontend lo carica.
- Il bundle principale non esporta nulla (`casa3d/src/main.ts` fa solo import con effetti). Budget: main 620 KB, oggi 435.739 B.

**Misure T1** (REP-20261020-002, righe 462-504).
- Riguardano la **demo neonplan v1.21.0** con dati dimostrativi: due piani e giardino, 90-143 chiamate di disegno, 15,9 fps a riposo senza mai fermarsi.
- **Non** riguardano l'editor copiato dentro Acasystem, che non è mai stato misurato.
- Nell'editor della demo, spostare un mobile dà 22-30 fps con fotogrammi fino a 206 ms, e arrivano 28-30 pointermove su circa 96.
- «3D beside» dà 3,8-4,6 fps.
- Il ritorno al 3D blocca il thread per circa 1,9 s.
- Viewport del Tab M11: 1280×665 CSS a DPR 1,5.

**Launcher e app.**
- Il router è un `HashRouter` dichiarativo (`main.tsx` righe 4 e 50), senza `useBlocker`.
- Sistema si chiude con `navigate(ROUTES.launcher)`, cioè con un push (`AppRoutes.tsx:47`).
- Il launcher resta montato con `hidden` (`LauncherPage.tsx:159-183`).
- I popup guardano solo la pagina corrente (`LauncherPage.tsx:93-107`).
- `isOverlayOpen` riconosce come overlay solo `dialog[open]` e `:popover-open` (`LauncherScreen.tsx:167-175`).
- Il meta viewport permette lo zoom (`index.html:13`).
- `check-bundle-size.mjs` non controlla i chunk lazy.
- mx-icons 1.1.2 ha già undo, redo, rotate-left/right, icon-3dcube e layers.

**Ruoli nei requisiti.**
- REQ-06/AC-06 (approvato): il cliente finisce senza privilegi di amministratore.
- REP-20261021-001 propone una «sessione installatore» con timeout.

### 2. Esperienza proposta

**Nel launcher.**
- La pagina «Casa 3D» è un'anteprima ferma della pianta vera.
- Un tocco, oppure il pulsante da 56 px «Apri la casa», apre la casa.
- Swipe e pressione lunga restano al launcher (D18).
- Il tocco che ferma uno scorrimento non apre nulla (`pagerMoving`, da estrarre in un hook comune).
- Dopo una pressione lunga il click viene assorbito (`guardNextClick`).
- Nella vista pagine e in modifica non si apre nulla.
- Senza piano compare «Nessuna casa disegnata»; l'installatore vede anche «Disegna la casa».
- Sistema → Casa 3D offre «Apri la casa». **È lavoro nuovo.**

**La casa a schermo intero.**
- Occupa 100dvh × 100dvw, con le aree sicure.
- Il 3D è interattivo di base: un dito ruota, due dita spostano e ingrandiscono, la rotella ingrandisce, la tastiera fa lo stesso.
- La vista ha `touch-action: none`.
- Sempre visibili:
  - **la freccina «Esci»**, perché i miglioramenti la prevedono e la persona di 65 anni ne ha bisogno (posizione da confermare);
  - «Rimetti la vista»;
  - un **indicatore di connessione**, perché la barra di stato di ADR-0013 non si vede.
- Il chevron in alto a sinistra apre la barra laterale.
- Si esce con la freccina, con «Esci» nella barra, con il tasto indietro o con Esc. Prima si chiude ciò che è aperto sopra (barra, foglio, editor), poi la casa.
- All'uscita il fuoco torna al pulsante che ha aperto la casa.

**Barra laterale.**
- Pannello modale da sinistra, `<dialog>`, largo min(20rem, 85vw), piatto: nessuna ombra sopra il canvas.
- Voci:
  - Esplora (significato da confermare: modalità «guarda e comanda» oppure la **passeggiata** che esiste già nel bundle);
  - Modifica la piantina (solo per l'installatore);
  - Piani;
  - Elenco stanze;
  - Qualità;
  - Esci.
- Il cliente guarda e comanda. «Elenco stanze» diventa l'alternativa equivalente per TalkBack, con stanze, dispositivi e stato, e in R7 anche con i comandi.

**Editor a quadretti (solo installatore).**
- Griglia a righe di quaderno da 50 cm, più marcata ogni metro.
- **Zoom minimo per modificare.** Valutazione: su 1280×665 una casa di 12×10 m adattata allo schermo dà circa 30 px per quadretto. Per modificare servono almeno circa 48 px per quadretto. Di conseguenza:
  - selezionando una stanza la vista si ingrandisce da sola;
  - le maniglie stanno fuori dalla stanza;
  - le misure si possono sempre inserire anche nel foglio.
- Stanza nuova: 2 × 2 quadretti, da allargare con le maniglie. Mentre si allarga compare la misura dal vivo; c'è l'inserimento numerico. Le sovrapposizioni sono rifiutate.
- **Spostando, allargando o eliminando una stanza** si spostano, si contengono o si eliminano anche i mobili, i pin e le aperture che contiene, con conferma per l'eliminazione.
- Il nome della stanza è un'area di HA; le stanze a L hanno la stessa area; i muri sono automatici.
- Aperture:
  - si mettono toccando un tratto di muro e si spostano a 25 cm;
  - il margine dagli angoli si calcola sullo spessore del muro perpendicolare.
- Tavolozza per stanza. Da decidere dove vanno le schede **Luci** e **Scale**.
- Piani come schede.
- Annulla e ripeti.
- Salvataggio automatico con avviso di conflitto.
- Alternanza 2D/3D sul Tab M11.
- **Gli oggetti fuori passo di un piano esistente restano dove sono** finché non vengono spostati.

**Accessibilità.**
- Bersagli da 48-56 px.
- Tastiera completa con navigazione a tabindex mobile (roving).
- Annunci in una regione live.
- Elenco degli oggetti come alternativa al disegno.
- Movimento ridotto; testo al 125 e al 150%.
- Nessuna azione richiede più dita.

### 3. Architettura proposta

**Rotta e guscio.**
- Le rotte `#/casa` e `#/casa/piantina` sono overlay sul modello di Sistema.
- «Esci» torna indietro se la voce in cima è nostra; altrimenti usa `navigate(..., { replace: true })`. Un test controlla le voci della cronologia.
- Con il `HashRouter` dichiarativo il tasto indietro non si può fermare. All'uscita il salvataggio parte subito; se fallisce, l'avviso compare nella casa, non come blocco.
- Ricaricando su `#/casa/piantina` chi non è installatore va su `#/casa`.
- Nuova primitiva `SideSheet` (proposta grafica da annotare in `design.md`).

**Proprietà del piano.**
- `CasaScreen` possiede **una sola** istanza di `planApi`, cioè la revisione.
- Passa il `Building` alla vista come proprietà ed è l'unico che salva per l'editor.
- La bozza locale del nuovo editor ha una chiave propria oppure riusa `casa3d.unsaved` in modo esplicito.

**Ruolo nel client.** Serve un campo `role` nella risposta di GET `/building`, oppure una rotta nuova. È un cambio del backend da autorizzare.

**Dati.**
- Il `Building` è l'unica fonte; la griglia si ricava.
- Moduli puri `grid/`: `cells`, `contour`, `fromBuilding`, `toBuilding`, `rules`.
- `fromBuilding` **non aggancia** i valori esistenti.
- Le stanze fuori griglia restano «forma libera», bloccate.

**Editor.**
- Chunk React lazy. Il budget proposto di 100 KB richiede **una soglia nuova** in `check-bundle-size.mjs`.
- Gesti sul modello di `useWidgetDrag`, con `touch-action: none` sulla superficie.
- Griglia CSS: durante il gesto si trasforma il livello già disegnato e lo si ridisegna alla fine.
- Simboli SVG in React.
- La geometria viene esportata dal bundle principale `casa3d` con un contratto tipato. Il bundle `3d` non si tocca.

**Vista.**
- Sul Tab M11 il `Building` va alla vista **solo al passaggio al 3D**. Su schermi affiancati, a fine gesto con 300 ms di ritardo.
- Con l'alternanza la vista resta montata e nascosta.
- All'uscita dalla casa: rilascio subito oppure dopo N secondi (decisione aperta).

**Cronologia e backup.** Servono interfacce nuove (in Sistema → Casa 3D oppure nella barra) **prima** di togliere l'editor copiato.

**Persistenza.**
- Il salvataggio automatico è dimensionato sui **120 al minuto** di `/api/casa3d`, contando il polling e le immagini.
- Al più un salvataggio ogni 3 s, più uno a fine gesto.
- Se arriva un 429 si aspetta e si riprova. Il 409 apre il foglio del conflitto.
- «Tieni la mia e salva» sovrascrive il lavoro dell'altro dispositivo: chiede conferma con `ConfirmSheet`.

**Dati di Home Assistant.**
- `autoPins` dalla logica di `examplePlan.ts`; va deciso se i pin si salvano o si ricavano.
- I registri si leggono una volta per connessione. Aggiornare le stanze quando cambiano le aree richiede di sottoscrivere gli eventi del registro: è lavoro nuovo.
- Creare un'area passa dalla connessione HA dell'app (`config/area_registry/create`). Che serva l'amministratore è da verificare sulla fonte di HA.

**Sicurezza.** L'elenco chiuso dei servizi vive nel client e il tunnel WS non filtra. È una protezione dagli errori, non un confine di sicurezza.

### 4. Trattamento della T7 fermata

**Stato, riverificato oggi in sola lettura.**
- `npm run typecheck` è pulito.
- `npx vitest run Casa3d ConfirmSheet ServiceWorkerCasa3d --maxWorkers=4`: 19 file, 306 test su 306, 50 s.
- `casa3d/`: 440 test e controllo del marchio ok, secondo la lettura A (non ripetuto).
- Manca il rapporto di tappa. Non ci sono prove né sul banco (0.9.19, senza T7) né sul Tab M11.

**Si tiene, senza cambiare la logica:**
- `commandPolicy.ts`;
- `commandPath.ts`;
- `useCasa3dCommands.tsx`;
- `ConfirmSheet`;
- `contract.ts`;
- `ask.test.ts`, `rinomina.mjs`, `PATCHES.md` e `en.json`.

Cambiano solo i testi: «solo in Esplora» diventa «solo nella casa aperta, fuori dalla piantina».

**Si riscrive in `CasaScreen`.** La regola diventa:

`commandsOn = casaAperta && modo === 'esplora' && vistaPronta && !barraAperta && !foglioAperto && !editor`

Va provato che in `#/casa/piantina` nessun `callService` parte, nemmeno toccando un pin nella vista 3D alternata.

**Si toglie:**
- `closedPress`, `pinToStage` e il tocco-per-Esplora;
- `pointer-events: none`;
- `usePageLock` legato a Esplora.

**Test.** `Casa3dCommands.test.tsx` e `Casa3dPage.test.tsx` vanno riscritti.

**Fonte mancante.** Il commento di `Casa3dPage.tsx` (righe 14-16) cita una decisione su ISSUE-096 che non è registrata: ISSUE-096 è ancora aperta (project-status.md righe 893-899).

**Quando.** La T7 resta sospesa e riprende come R7. I comandi sul banco agiscono su HA: servono **l'autorizzazione esplicita dell'utente** ed entità di prova.

### 5. Tappe (riviste e spezzate)

| Tappa | Contenuto | Fatto quando | Stima |
|---|---|---|---|
| R0 Decisioni, documenti, punto fermo | Risposte dell'utente; nuovo ADR (primo numero libero, **non 0015**) o annotazione; annotazioni ad ADR-0012 e REP-20261020-002; T7 sospesa; decisione sul piano d'esempio del banco; commit autorizzati, separati per blocchi dal lavoro degli altri incarichi | ADR e project-status.md aggiornati con la fonte; lavoro versionato oppure motivo registrato; nessun passo sul banco prima di questo | 0,5-1,5 g |
| R1a Cornice | Rotte `#/casa` e `#/casa/piantina`; 3D interattivo; freccina, chevron, `SideSheet`, «Rimetti la vista», indicatore di connessione; uscite e cronologia; anteprima nel launcher; voce in Sistema; ancora il piano d'esempio | Vitest: rotta, uscite, fuoco, voci di cronologia, nessuna voce orfana; Playwright: swipe e pressione lunga sull'anteprima, nessuna apertura nella vista pagine o in modifica, `touch-action`; Tab M11: apertura ≤4 s a caldo, ISSUE-062 non peggiorato | 3-4 g |
| R1b Piano vero | `planApi` unico in `CasaScreen`; anteprima dal server con la revisione; ruolo nella risposta (backend); stato vuoto; «Elenco stanze» con dispositivi e stato (sola lettura) | Test: piano del server, stato vuoto, ruolo, nessun salvataggio dalla vista mentre legge un piano non del server (ISSUE-103 b) | 2-3 g |
| R2a Griglia e stanze | **Prima** la misura del rebuild sul Tab M11 (1, 3 e 8 stanze; PSS dopo 50 rebuild); griglia, zoom minimo, stanze in memoria, maniglie, misure, inserimento numerico | Rebuild misurato con `misura-sintetica.mjs`; trascinamento ≥30 fps con al più 1 fotogramma >50 ms | 3-4 g |
| R2b Conversione | `fromBuilding`/`toBuilding` senza agganciare i valori esistenti; L; contenuti che seguono la stanza; annulla e ripeti | Andata e ritorno senza perdite su `casa-esempio.json`; test di regressione delle L con `generateWalls` | 2-3 g |
| R2c Salvataggio | Salvataggio automatico entro 120/min, 409 e 429, bozza, alternanza 2D/3D | 409 e 429 simulati; Tab M11: cambio 2D↔3D ≤1 s di blocco, PSS +≤30 MB dopo 10 cambi | 2-3 g |
| R3 Aree | Scelta dell'area, `autoPins` (salvati o ricavati), area doppia, sottoscrizione al registro, eventuale «Nuova area» | Test; aree reali sul banco | 2-4 g |
| R4 Aperture | Muri in 2D, aperture con margine dallo spessore, riscrittura di `edge`/`offset` | Regressione dopo i cambi di forma; posizione corretta nel 3D | 4-6 g |
| R5a Tavolozza | Schede (Luci e Scale da decidere), ingombri, rotazione, vincoli, legame a entità se deciso | Test; mobile ≥30 fps sul Tab M11, stesso strumento di R2a | 3-5 g |
| R5b Cronologia, backup, rimozione | Interfacce nuove per i punti di ripristino ed esportazione/importazione, **poi** rimozione di `casa3d-editor` se approvata | Ripristino ed esportazione provati; `dist` −703.926 B; marchio e `node --test` verdi | 2-3 g |
| R6 Piani e scale | Schede dei piani, scale con foro | Test; cambio di piano ≤1 s | 2-4 g |
| R7 Comandi | Ripresa della T7 con la nuova regola; comandi da «Elenco stanze» | Con autorizzazione per HA: stato entro 1 s; **nessun comando da un'orbita, uno spostamento o un pizzico iniziati su un pin**; nessun comando nell'editor, nella barra o nei fogli; conferme; TalkBack; un dito vero | 2-3 g |
| R8 Collaudo | Criteri T11 su Tab M11, PC e telefono | Tabella delle misure; accessibilità sul dispositivo | 3-5 g |

**Totale stimato** (valutazione): 30-48 giornate.

### 6. Rischi principali

- **Rebuild a ogni modifica** mai misurato sul Tab M11. Va misurato in R2a.
- **Memoria** con il launcher nascosto più la vista.
- **Griglia troppo piccola** sul Tab M11 senza zoom minimo.
- **Limite di 120 al minuto**, forse condiviso dietro l'ingress (da verificare).
- **Piano d'esempio sul banco** scambiato per la casa vera.
- **Perdita della cronologia e del backup** se si toglie l'editor prima di avere le interfacce nuove.
- **Contenuti orfani** (mobili, pin, aperture) quando le stanze cambiano.
- **Ruolo (D13)** da allineare con REQ-06 e con la «sessione installatore» del piano Hub.
- **Popup e allarmi** non visibili mentre la casa è aperta.
- **Lavoro non versionato** mescolato a quello di altri incarichi.
- **Documenti disallineati** finché l'ADR non è deciso.

### 7. Annotazione proposta ad ADR-0014 (non applicata)

**Numero.** Il nuovo ADR prende il primo numero libero al salvataggio, oggi ADR-0016, perché ADR-0015 è di «Hub e bridge».

**Oltre ai punti già previsti**, l'annotazione dice:

- **Sezione 2, «Sospensione».** La vista resta nascosta durante l'alternanza 2D/3D. All'uscita dalla casa si applica la regola che verrà decisa.
- **Sezione 2, «Anteprima statica».** È un SVG e non un'immagine catturata: lo scostamento va dichiarato.
- **Sezione 4.** La bozza è del nuovo editor.
- **Sezione 6.** Va chiarito se editor e tavolozza dipendono dai diritti. Per esempio i gruppi vehicles e household sono legati a funzioni Pro.
- **Sezione 7.** «Con TalkBack si apre l'elenco» resta valido; l'elenco diventa equivalente in R1b e R7.
- **Sezione 9.** La divergenza accettata non vale più per l'editor, che non si porta.
- **Comandi.** Solo nella casa aperta, in Esplora, fuori dall'editor. L'elenco chiuso dei servizi non è un confine di sicurezza.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Typecheck del frontend | `npm run typecheck`, PC, 2026-10-21 (critica) | Superato | Stato del working tree di oggi |
| Test mirati | `npx vitest run Casa3d ConfirmSheet ServiceWorkerCasa3d --maxWorkers=4` | 19 file, 306/306, 50 s | Coprono la vecchia regola |
| `casa3d/` | `tsc`, `node --test`, marchio (lettura A) | 440/440 | Non ripetuto nella critica |
| Muri sulle L | Script nello scratchpad che importa `walls.ts` | 6 muri sia con 6 sia con 8 vertici | Prova fuori dal repository; nel repository serve un test |
| Piano d'esempio sulla griglia | node su `casa-esempio.json` | Stanze sulla griglia; 15/17 mobili e diverse aperture fuori passo | Sola lettura |
| Rebuild sul Tab M11 | Pianificato in R2a | Non eseguito | — |
| T7 su banco e tablet | Pianificato in R7 | Non eseguito | Banco 0.9.19 senza T7 |

## Controllo del diff e decisioni

**Diff.** Nessun file del repository è modificato dalla critica, salvo i due file della fase di scrittura. Le prove sono state fatte nello scratchpad.

**Unica decisione umana:** quadretto da 50 cm.

**Decisioni proposte:**
- **D-R2** casa come rotta a schermo intero.
- **D-R3** significato di Esplora: «guarda e comanda» oppure passeggiata.
- **D-R4** il `Building` come unica fonte.
- **D-R5** le stanze a L unite in un solo poligono.
- **D-R6** passo di 25 cm per mobili e aperture.
- **D-R7** altezza dei muri.
- **D-R8** creazione di nuove aree in HA.
- **D-R9** il cliente non sposta i mobili.
- **D-R10** rimozione dell'editor copiato, **solo dopo R5b**.
- **D-R11** affiancamento 2D/3D solo su schermi larghi.
- **D-R12** misure nette (con valori come 3,88 m).
- **D-R13** ruolo dell'installatore, insieme a REQ-06 e alla sessione installatore.
- **D-R14** T7 sospesa.
- **D-R15** pagina del launcher come anteprima, più la voce nuova in Sistema.
- **D-R16** pin salvati oppure ricavati.
- **D-R17 (nuova)** piano d'esempio sul banco.
- **D-R18 (nuova)** rilascio della vista all'uscita.
- **D-R19 (nuova)** uscita automatica dopo inattività.
- **D-R20 (nuova)** popup e allarmi con la casa aperta.
- **D-R21 (nuova)** ruolo esposto dal backend.

## Chiusura e punto di ripresa

**Domande per l'utente:**
1. Esplora: «guarda e comanda» o la passeggiata ad altezza d'occhi che esiste già?
2. Dove va la freccina «Esci»?
3. Passo di 25 cm per mobili e aperture?
4. Altezza dei muri?
5. Si possono creare nuove aree in HA?
6. Il cliente può spostare i mobili?
7. Chi è l'installatore? Va deciso insieme a REQ-06 e alla sessione installatore del piano Hub.
8. Si può togliere l'editor copiato, dopo le nuove schermate di ripristino e backup?
9. Misure nette o tra le mezzerie?
10. Vanno bene i nomi delle voci della barra?
11. Pagina del launcher come anteprima, più «Apri la casa» in Sistema?
12. Quando vuoi i comandi: dopo R1 o dopo R3?
13. Posso fare i commit prima di R1?
14. Il piano d'esempio sul banco: lo teniamo o ripartiamo da vuoto?
15. All'uscita la vista 3D si chiude subito?
16. La casa si chiude da sola dopo 60 s senza tocchi?
17. Popup e allarmi mentre la casa è aperta?
18. Le schede Luci e Scale nella tavolozza; i mobili collegati ai dispositivi?

**Punto di ripresa.** R0. Con le risposte:
- redigere il nuovo ADR (primo numero libero) e le annotazioni;
- aggiornare project-status.md: la T7 sospesa e il nuovo punto di ripresa;
- aggiornare l'indice dei report;
- fare i commit solo se autorizzati.

Poi R1a. **Nessuna tappa R1-R8 è autorizzata** finché l'utente non accetta il piano.

## Risposte dell'utente (2026-10-21)

**Frase dell'utente, testo fedele:**

> «ok alle proposte, approvo e procedi con G1-G2 il cliente può spostare, chi modifica tutti anche i clienti, ceh se dovessero mai spostare un divano sulla piantina non deve uscire? sei scemo?»

**Risposte registrate** (interpretazione concordata dall'agente principale):
- «ok alle proposte»: le proposte di questo piano sono accettate, **tranne due punti corretti dall'utente**.
- **Il cliente può spostare i mobili** (domanda 6) **e può modificare la piantina**: la proposta «modifica solo per l'installatore» non vale. L'utente non vuole che un cliente che sposta un divano sulla piantina ne sia escluso.
- **Chi modifica = tutti, anche i clienti** (domanda 7, D13 / [ISSUE-102](../project-status.md#issue-102), rischio D-R9). Nessun ruolo installatore, PIN o file di diritti per la scrittura del piano.
- La decisione avrà il numero **ADR-0017** (ADR-0016 è ora quella delle interazioni, REP-20261021-003). Non è ancora stata redatta.
- **Nessuna implementazione della Casa 3D è autorizzata in questo giro**: le tappe R0-R8 e la T7 restano ferme; il backend T6 (oggi scrive solo amministratore o proprietario) non è cambiato.
- **Commit non autorizzato** (domanda 13): vale la regola dell'utente di nessun commit finché non lo chiede.

## Rettifiche successive

- **2026-10-21, critica di completezza integrata.** Rispetto alla prima stesura del piano:
  - numero dell'ADR;
  - piano salvato sul banco;
  - limiti di frequenza;
  - ruolo nel client;
  - cronologia e backup presenti solo nell'editor;
  - «Elenco stanze» con i soli nomi;
  - natura delle misure T1;
  - muri sulle L verificati;
  - proprietà di `planApi` e della bozza;
  - passeggiata già presente;
  - uscita visibile;
  - router senza blocco;
  - cornice e popup;
  - zoom minimo della griglia;
  - `touch-action`;
  - rebuild con la vista nascosta;
  - contenuti delle stanze;
  - pin e registri;
  - ruolo e REQ-06;
  - sicurezza dei comandi;
  - autorizzazione per i comandi a HA;
  - Git;
  - tappe spezzate;
  - annotazione all'ADR;
  - tavolozza;
  - margini delle aperture;
  - icone;
  - budget dei chunk.


## R1 — esito (2026-10-21, sul PC, senza commit)

**Incarico:** «parti» (2026-10-21). Realizzate le parti di R1a e R1b elencate sotto; copie dei file in `backup/casa3d/R1/pre/`, log e banco di prova in `backup/casa3d/R1/`.

**Fatto.**
- Rotta `#/casa` (e `#/casa/piantina`, che per ora dice «La piantina a quadretti è in arrivo» e riporta a Esplora): vista a schermo intero sopra il launcher montato e nascosto, come Sistema (`routes/AppRoutes.tsx`, `casa3d/CasaScreen.tsx`); 100dvh × 100dvw con aree sicure.
- 3D interattivo in Light, «Rimetti la vista» sempre visibile, tasti + e −.
- Freccina in alto a sinistra che apre la barra laterale modale (primitiva nuova `SideSheet`, piatta, dialogo nativo): Esplora, Modifica la piantina, Piani, Elenco stanze, Qualità, Esci; chiusura con Esc, tocco sullo sfondo, pulsante di chiusura; ritorno del fuoco alla freccina; movimento ridotto. «Esci» sempre visibile in alto a destra.
- Cronologia (`casa3d/casaNav.ts`): ogni cosa aperta sopra la casa è una voce della cronologia; il tasto indietro e Esc chiudono prima quella e poi la casa; «Esci» toglie tutte le voci in un passo; una casa aperta dal suo indirizzo (nulla sotto) è sostituita dal launcher; il fuoco torna al pulsante che l'ha aperta.
- Pagina «Casa 3D» del launcher: anteprima ferma in SVG della pianta del server (o «Nessuna casa disegnata»), un tocco breve la apre; niente più 3D vivo nel pager; la pressione lunga e il tocco che ferma lo scorrimento non aprono (ADR-0016); modulepreload conservato. Voce «Casa 3D» in Sistema.
- Piano vero dal server (`planApi`) al posto dell'esempio; se il server ha ancora la casa d'esempio della prova di T6 compare l'avviso con «Ricomincia», che chiede conferma, prende un punto di ripristino e salva una casa vuota sulla revisione letta (409: mostra la casa dell'altro dispositivo e non sostituisce nulla).
- **ISSUE-102 applicato:** la scrittura del piano è permessa a ogni utente autenticato (401 senza sessione, nessun 403 per «non amministratore»); restano revisione e conflitto, validazione, controllo dei byte delle immagini e limiti (`backend/src/helpers/casa3dRole.ts`, `middlewares/casa3dRole.ts`, test).
- Comandi ai dispositivi **ancora spenti** (`casa3dCommandsEnabled`); la regola «solo in Esplora, vista pronta, nulla aperto sopra» è già nel codice per R7.
- Correzioni a codice condiviso trovate dalla prova nel browser: (1) il foglio `ConfirmSheet` (classe `aca-confirm`, che coincideva con il blocco di conferma dei moduli) restava `display:flex` anche chiuso, quindi un dialogo chiuso era visibile agli assistivi e dava un riquadro rossastro dietro al foglio aperto: la regola in `templates/sheets/sheets.css` ora vale per `div.aca-confirm`; (2) gli avvisi sopra la vista non portano più l'ombra morbida (`casaScreen.css`).

**Verifiche.** Vedi «2026-10-21 — Casa 3D, R1» in `verification.md`.

**Non fatto / da fare.** Prova sul Tab M11 (apertura ≤ 4 s, ISSUE-062, dito vero, pressione lunga sull'anteprima), telefoni, TalkBack, Playwright con swipe reale sul pager; `pagerMoving` è provato solo con Vitest. «Elenco stanze» mostra per ora solo i nomi (dispositivi e stato in R7). L'ADR della Casa 3D (ADR-0017) è stato redatto per R1 (vedi l'annotazione del 2026-10-21 qui sotto). Nessun commit.

**Annotazione del 2026-10-21 (revisione di R1).** ADR-0017 (`decisions/ADR-0017-casa-3d-schermo-intero-editor-quadretti.md`, Accettata) è stato redatto durante R1 ed è nell'indice delle decisioni: la frase «Non è ancora stata redatta» (sezione sulle decisioni) e «resta da redigere (R0)» nell'esito di R1 erano superate. Nella stessa revisione sono state corrette: «Esci» con la casa aperta dal suo indirizzo (ingresso base non nostro, un solo passo, nessuna doppia uscita), il messaggio di errore di «Ricomincia» (scrittura, non lettura) e il fuoco sul titolo dopo il successo.

**Aggiornamento dell'esito del 2026-10-21 (revisione, banco 0.9.21, Tab M11).** Dopo la revisione e le correzioni sopra descritte sono stati rieseguiti i controlli sul codice finale: frontend `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check` verdi; suite completa `vitest run --maxWorkers=4` 181 file e 2525 test verdi (`backup/casa3d/R1/suite-1.txt`); `npm run build` e `check-bundle-size` verdi (index 806,6 KB su limite 900 KB); backend 21 file e 202 test; `casa3d` 440 test, build e marchio verdi. Banco: banco `aca-system:0.9.21` su `192.168.1.7:3002` (IPv4 Wi-Fi del PC uguale al binding di `progetto/compose.tunet.yaml`, nessuna modifica); copia a freddo PRIMA con tunet fermo `backup/banco/tunet-data-casa3d-R1-pre-0.9.21-freddo.tgz` (413806 byte, SHA-256 `ae0a1cb6c0c4ff7ff5a9e65f18ffb6e7c6854b683935a9da6d259793651c83e5`, `tar -tzf` 4 voci); container `healthy`, `/api/health` 0.9.21 e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; ripristino con `ACASYSTEM_VERSION=0.9.20` più la copia PRIMA. Prova sul tablet: sul Tab M11 (Chrome 1280×665) la pagina «Casa 3D» del launcher mostra l'anteprima ferma e un tocco apre `#/casa` a schermo intero con la vista 3D pronta; il trascinamento a un dito ruota la casa e il pizzico la ingrandisce e la riduce; la freccina apre la barra con Esplora, Modifica la piantina, Piani, Elenco stanze, Qualità ed Esci; «Esci», il tasto indietro ed Esc riportano al launcher, e con la barra aperta indietro ed Esc chiudono prima la barra; «Ricomincia» sulla casa d'esempio rimasta da T6 chiede conferma e lascia la casa vuota (anteprima «Nessuna casa disegnata»); Sistema → Casa 3D apre la casa e indietro torna a Sistema. Le chiavi `localStorage` del launcher (38) sono identiche prima e dopo. Nessun comando a dispositivi reali. Schermate in `backup/casa3d/R1/tablet/`.

**Non provati:** telefoni reali, dito vero oltre ai gesti elencati, TalkBack, Playwright con swipe reale sul pager, ISSUE-062 e il tempo di apertura (≤ 4 s) come misura, pressione lunga sull'anteprima. **Osservazioni non indagate:** nel pannello della casa d'esempio il testo del pulsante «Ricomincia» appare spostato a sinistra e il pannello sporge sul bordo (schermata 03); negli screenshot compare una fascia chiara sotto la vista a schermo intero, forse un artefatto di cattura. Avviso di chunk sopra 500 kB in `vite build` (index 825,9 kB), non bloccante. **Punto di ripresa:** la prossima tappa è **R2 (griglia e stanze)**, solo su autorizzazione; i comandi della Casa 3D restano spenti fino a R7. Nessun commit Git.
