# REP-20261008-001 — Modifica semplificata e griglia per pagina

| Campo | Valore |
|---|---|
| Stato | Completato; banco su `aca-system:0.6`; da provare sul tablet |
| Data | 2026-10-08, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`), con subagenti di implementazione, revisione e verifica |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6`. Il working tree contiene anche il lavoro non committato di REP-20261007-008…038, conservato. |
| Richiesta di riferimento | Chat del 2026-10-08; testi qui sotto. |
| Autorizzazione | Le richieste 1 e 2 dell'utente e le risposte alle domande di chiarimento. «Verifica in primis le cose che ho detto, poi se le ritieni coerenti vai a implementarle, altrimenti una soluzione adeguata». Decisioni dell'utente U1–U9 riportate sotto. |

## Richieste

**Richiesta 1, griglia per pagina:**

> «realizzare un pannello per pagina nelle impostazioni che ti permette per ogni schermata di scegliere quanti quadratini mostrare in una griglia, nella copertina di base è 3, vorrei inoltre che il gap tra le card sia dinamico non fisso, per prendere il massimo spazio disponibile. Questo applicativo verrà utilizzato principalmente su un tablet Lenovo, ma dovrà essere usato anche da telefono»

Risposte alle domande:
- si scelgono le colonne e le righe sono automatiche;
- una sola scelta per pagina, adattata in automatico sul telefono;
- i quadrati restano quadrati e il più grandi possibile, lo spazio che avanza va nei gap;
- il tablet è un Lenovo Tab M11.

**Richiesta 2, modalità modifica.** Dettata in chat con quattro screenshot dal tablet. In sintesi fedele:
- le due icone sugli angoli del widget selezionato non si capiscono;
- la barra piace, ma con meno azioni;
- pallini su lati e angoli, del colore dell'evidenziazione e con area di tocco ampia, per ridimensionare da qualunque punto;
- lo spostamento resta col trascinamento;
- la zona «Rimuovi» in alto è un doppione del cestino della barra;
- i controlli di pagina vanno nell'editor delle pagine: eliminare, rendere home e scomporre la penna;
- la pagina si sposta tenendola premuta, il nome si cambia toccandolo.

Precisazioni successive:
- le impostazioni del widget restano e si aprono con il **doppio tocco**: risposta «Solo doppio tocco»;
- un widget si sposta dopo una **pressione lunga di 1 secondo con riscontro**: risposta alla proposta, l'utente aveva chiesto 3 secondi;
- il tocco singolo non sposta e resta per le interazioni del widget da definire.

## Obiettivo e perimetro

- **A, modifica dei widget:**
  - pallini visibili su 4 angoli e 4 lati del widget selezionato;
  - niente icone sugli angoli;
  - barra con Rimuovi · Annulla · Conferma;
  - cestino della barra come bersaglio di rilascio, senza la zona «Rimuovi» in alto;
  - pressione lunga di 1 s con riscontro;
  - doppio tocco per le impostazioni;
  - alternative accessibili al trascinamento.
- **B, editor delle pagine:**
  - controlli di pagina nell'editor;
  - nome modificabile in linea;
  - spostamento con pressione lunga sulla card;
  - barra della modifica alleggerita.
- **C, colonne per pagina:**
  - righe automatiche;
  - Copertina 3 colonne;
  - adattamento al telefono;
  - gap dinamico;
  - classificazione corretta del tablet.
- **Esclusi:**
  - le interazioni a tocco singolo dei widget;
  - nuove dipendenze;
  - modifiche al backend non necessarie (E13: il layout è JSON opaco per il backend, quindi nessuna modifica);
  - `migration.ts`, che il piano lascia invariato;
  - `documentazione/archive/`;
  - il deploy del banco senza conferma.
- **Collegamenti:** REQ-03, ADR-0004/0005/0007/0011, ISSUE-028.

**Decisioni dell'utente (chat del 2026-10-08), vincolanti su piano e progetti:**
- **U1.** Pressione lunga di 1000 ms con riscontro progressivo; a 1 s vibrazione, se disponibile, e oscillazione; con il movimento ridotto solo un cambio di stato. Vale per i widget e per la pressione sul vuoto. Il corpo del widget si trascina solo dopo la pressione; un widget già selezionato si trascina subito.
  - *Annotazione del 2026-10-09 ([REP-20261009-004](REP-20261009-004-pageshell.md), richiesta dell'utente): durante la pressione il widget non cresce, non ha ombra e non oscilla; si rimpicciolisce in modo lineare fino al 90 % tra 180 ms e 1 s, senza spostarsi. Lo stesso vale per lo sfondo premuto e per le schede della vista pagine. A 1 s la copia sollevata torna al 100 % in circa 150 ms e oscilla solo durante il trascinamento. Con il movimento ridotto non c'è né scala né oscillazione. Sostituisce il riscontro con crescita a 1,03 e scala 0,98 e l'oscillazione a 1 s, realizzati il 2026-10-08 e descritti in [design.md](../design/design.md#modifica-semplificata-e-griglia-per-pagina-implementata-rep-20261008-001).*
- **U2.** Impostazioni del widget solo col doppio tocco, niente ingranaggio. Da tastiera, Invio sul widget selezionato. Fuori dalla modifica il doppio tocco vale solo sull'area `data-widget-open`; il tocco singolo apre i dettagli con il ritardo della finestra del doppio tocco. Anche le pile.
- **U3.** Barra del widget con solo Rimuovi · Annulla · Conferma.
- **U4.** Pallini visibili su 4 angoli e 4 lati, del colore dell'evidenziazione; il lato opposto resta fermo; via le due icone sugli angoli.
- **U5.** Via la zona «Rimuovi»; il cestino della barra è il bersaglio di rilascio; il widget sollevato si seleziona al sollevamento.
- **U6.** Controlli di pagina nell'editor: eliminazione, home, nome toccando la scritta, spostamento con pressione lunga sulla scheda; la penna viene scomposta.
- **U7.** Colonne per pagina con righe automatiche; Copertina predefinita a 3; una sola scelta adattata al telefono; gap dinamico, diverso tra X e Y. Dispositivo principale Lenovo Tab M11, anche telefono.
- **U8.** Il tocco singolo non sposta; nessuna nuova interazione a tocco singolo dei widget.
- **U9.** Banco: copia a freddo del volume e immagine `aca-system:0.6`. Nessun commit Git.

**Modifiche preesistenti.** Il working tree conteneva il lavoro non committato di REP-20261007-008…038 e di altre sessioni. Ogni fase ha riletto i file prima di scriverli, ha confrontato `git status` prima e dopo e ha cercato file modificati da altri nei minuti precedenti: nessuna scrittura concorrente rilevata. `RemoveZone.tsx` (REP-20261007-031) e la versione precedente di `WidgetActionBar.tsx` erano file non tracciati: non ne esiste copia in Git, solo nella cartella temporanea della sessione.

## Criteri di completamento

Dal piano integrato, sezione 9. Accanto a ogni criterio l'esito; le evidenze sono nella sezione Verifiche.

**Incremento C**
- `cellMetrics` restituisce gapX e gapY per asse; `cell` è invariato nei casi di `LauncherGeometry` e `FixLauncherLogic`. **Soddisfatto.**
- Una pagina automatica in orizzontale disegna 8×2 e riempie l'area: nel test di WidgetGrid sull'area misurata 973×230, cella 110 e larghezza 969–973; nell'anteprima a 960×445, cella 105 e griglia 910×245 nell'area 912×245. **Soddisfatto.**
- Il layout del Lenovo sotto `phoneLandscape` diventa `phoneLandscape@8x2` con le stesse x, y, w, h, senza pagine nuove né doppioni, anche con pagine di continuazione; fuori da phoneLandscape normale non cambia nulla. **Soddisfatto.**
- `columns` e le chiavi WxH sopravvivono a validatore, snapshot e PageContext; la copertina virtuale riceve la scelta. **Soddisfatto.**
- Il trascinamento con gapX ≠ gapY aggancia la cella giusta; il ridimensionamento con una presa fuori dal lato non salta. **Soddisfatto**, con test che distinguono la formula precedente.
- Copertina predefinita 3×1 sul Lenovo e 2×3 sul telefono, nessun rettangolo fuori dalla griglia. **Soddisfatto.**
- Typecheck, lint, lint tipografico e dei colori, vitest mirato verdi. **Soddisfatto**; `format:check` segnala solo due file preesistenti non toccati.

**Incremento A**
- 20 px di movimento entro 1 s su un widget non selezionato non lo spostano; a 1000 ms il widget si solleva, vibra, è selezionato e la barra mostra «Rimuovi». **Soddisfatto.**
- La barra contiene solo Rimuovi, Annulla e Conferma. **Soddisfatto.**
- Il widget selezionato ha 8 pallini e 4 fasce, sopra i vicini; nessun pomello e nessuna zona «Rimuovi». **Soddisfatto.**
- Il rilascio sul cestino rimuove con «… rimosso · Annulla»; oltre 8 px sopra non rimuove. **Soddisfatto.**
- Due tocchi entro 280 ms aprono il foglio o la pila; Invio sul selezionato apre il foglio; fuori dalla modifica il primo tocco apre i dettagli dopo 280 ms e il secondo le impostazioni. **Soddisfatto**, con l'eccezione della disposizione bloccata (scelta esecutiva).
- Con un widget selezionato, il tocco su una cella libera lo sposta lì e «Annulla» lo rimette. **Soddisfatto.**
- Il foglio ha «Dimensione» e «Pagina» con i limiti corretti. **Soddisfatto**, in modifica.
- `WidgetPositionControls`, `RemoveZone` e `keyboardMode` non esistono più. **Soddisfatto**: resta solo un'asserzione di assenza dei pomelli nei test.
- Suite completa e build verdi. **Soddisfatto.**

**Incremento B**
- La barra della modifica contiene solo «Aggiungi widget» e «Modifica le pagine», che apre l'editor anche da tastiera. **Soddisfatto.**
- Nella vista pagine: «Rinomina X» → campo → Invio salva; Esc ripristina senza chiudere la vista; il nome vuoto è rifiutato. **Soddisfatto.**
- Pressione di 1020 ms su una scheda e trascinamento cambiano l'ordine con le famiglie unite; «Sposta X prima/dopo» funziona, con `aria-disabled` alle estremità. **Soddisfatto.**
- Barra dell'editor con Elimina, Nuova (menu con «Pagina vuota» e le 5 pagine pronte), Principale, Nascondi/Mostra e Fine; i motivi compaiono al tocco. **Soddisfatto.**
- La copertina disattivata compare come «Nascosta» solo nella vista pagine. **Soddisfatto.**
- `canRemovePage` coincide con `basePageId` anche con la principale nascosta. **Soddisfatto.**
- «Gestisci» anche su Multimedia; `PageSettingsSheet` eliminato senza perdere funzioni. **Soddisfatto.**
- Il selettore «Colonne» cambia colonne, annuncia e offre «Annulla». **Soddisfatto.**
- Suite completa e build verdi. **Soddisfatto.**

**Chiusura dell'incarico**
- Report, documenti collegati e proposte registrate: **fatto** con questo aggiornamento.
- Banco (U9): copia a freddo del volume, immagine `aca-system:0.6` con digest e `/api/health` in `infrastructure.md`: **fatto** il 2026-10-08 alle 23:31 (riga «Banco» delle verifiche). Nessun commit Git.

## Avanzamento e modifiche

- Verifica delle osservazioni dell'utente nel codice: confermate. Gli esiti sono nella sezione Verifiche.
- Evidenza dagli screenshot: in Chrome sul Lenovo Tab M11 la Principale mostra la griglia 6×2 di `phoneLandscape`. La viewport stimata era ≈960×445 CSS, con lato corto < 600. La misura successiva sugli stessi screenshot dà ≈1024×472 CSS con scala 1,875 (sezione Verifiche e [verification.md](../verification.md#modifica-semplificata-e-griglia-per-pagina--2026-10-08)).

**Svolgimento.** Piano integrato con verifica delle 19 osservazioni, progetti d'area e giudizi. Poi gli incrementi nell'ordine C, A, B, ciascuno con implementazione e due giri di revisione avversaria seguiti dalle correzioni. Infine verifica completa, prova visiva con le sue correzioni, documenti e banco.

### Incremento C — colonne per pagina, gap dinamico e classe del tablet

**Comportamenti:**
- **Gap dinamico.** `cellMetrics` restituisce `{cell, gapX, gapY, width, height}`. La cella non cambia. I gap partono dal minimo della classe (`GRID_GAPS` 10/10/14/16) e crescono fino a mezza cella (`GAP_MAX_RATIO`), arrotondati per difetto al pixel del dispositivo. La griglia è centrata (`place-items: center`) e usa `--aca-gap-x`/`--aca-gap-y`. Nel trascinamento il passo è per asse, la pila si misura in px e la linea del ridimensionamento è relativa al punto di presa.
- **Colonne per pagina.** `LauncherPage.columns` sta sulla radice della famiglia e sulla copertina: da 2 a 10, la copertina almeno 3. Le posizioni si salvano sotto chiavi `${classe}@${w}x${h}`, con l'alias alla chiave storica quando la griglia coincide. Funzioni pure: `columnsOn` (scala 1/1/0,75/0,5 e limite 10/9/6/4 per tablet, telefono orizzontale, tablet verticale, telefono), `rowsOn` deterministiche da `REFERENCE_AREAS` (righe tolte finché la cella di riferimento è sotto 72 px), `columnsToStore`.
- **Chiave della pagina** (`pageClass`): la scelta dell'utente; la copertina a 3 colonne; le pagine automatiche di `phoneLandscape` a densità normale su 8 colonne (`phoneLandscape@8x2`) solo se la cella resta di almeno 84 px alla larghezza della finestra (`landscapeFits`, circa 781 px); in ogni altro caso la chiave storica (E9).
- **Semina (E11).** Una chiave nuova parte dalla disposizione mostrata prima: i widget che entrano restano dove sono, il resto va dopo l'ultimo widget, poi nelle continuazioni esistenti della famiglia, solo alla fine in una nuova continuazione posta dopo l'ultima pagina della famiglia. Nessun widget compare due volte in una famiglia. Le chiavi che nessuno schermo mostra più non creano continuazioni. Dopo un cambio di colonne si tolgono le continuazioni rimaste vuote, se i loro widget stanno su un'altra pagina della famiglia.
- **Copertina.** Una copertina nuova salva `columns: 3`. Una copertina salvata senza `columns` e con al massimo 3 widget riceve una sola volta `columns: 3`, seminata dalla chiave della classe. Con più di 3 widget resta com'è finché l'utente non sceglie. Una scelta che non contiene i suoi widget viene rifiutata (`columnsAllowed`). La copertina non ha continuazioni: se la semina non basta, i widget si reimpacchettano alla misura minima, senza perderne nessuno. `coverRects` è corretta per 2 colonne e per 1.
- **Pile.** Creazione e scomposizione valgono per tutta la famiglia, così una pila non duplica un widget tra due chiavi.
- **Validatore.** Accetta le chiavi WxH da 1 a 16 e conserva `columns` solo su radici e copertina. Nessun cambio di `version`.
- **Controller.** `classFor`, `gridFor`, `columnsAllowed`; `updatePage({columns})` semina dalla chiave mostrata e salva la copertina virtuale. La larghezza della finestra arriva da `LauncherPage` e `PreviewApp`.
- **Sistema → Schermata Home → Griglia (E9).** Testo d'aiuto: «Vale per le pagine senza una scelta di colonne; ogni pagina può averne una in Modifica → Pagine. Compatta: meno celle. Ampia: più celle.»
- **Classe del tablet (C.3).** Soglia `PHONE_MAX_SHORT_SIDE` invariata, commenti corretti, nessuna voce diagnostica (E12).

**File** (in `progetto/acasystem/frontend/src/`):
- `utils/launcher/{deviceClass,grid,layout,pager,legacySync}.ts`, `@types/launcher.ts`, `validators/launcher.ts`;
- `hooks/launcher/{useLauncherController,useWidgetDrag}.ts`;
- `templates/launcher/{WidgetGrid.tsx,launcher.css,LauncherScreen.tsx,DragGhost.tsx}`;
- `pages/system/sections/HomeScreenSection.tsx`, `pages/launcher/LauncherPage.tsx`, `pages/launcher/preview/PreviewApp.tsx`;
- test: nuovo `LauncherColumns.test.tsx`; aggiornati `LauncherGeometry`, `FixLauncherLogic`, `FixLauncherLogicInvariante` (ora controlla anche i doppioni), `FixLauncherLogicRipresa`, `FixLauncherLogicRotazione`, `LauncherCover`, `LauncherDragDrop`, `LauncherStacks`, `SystemPage`, `ShellLauncher`.

**Revisione.**
- Giro 1, corretti:
  - doppioni nella semina di una famiglia con continuazioni (alta, tre rilievi);
  - pagine di continuazione vuote dopo un'aggiunta o uno spostamento (alta);
  - widget persi dalla copertina con colonne proprie (alta);
  - 8 colonne automatiche anche a 640×400, con celle di 67 px (alta);
  - griglia della copertina che cambiava col numero di widget (media);
  - test del ridimensionamento che non distingueva la formula vecchia e test di rotazione senza trabocco (medie).
- Giro 2, corretti:
  - continuazioni vuote dopo il giro delle colonne (alta);
  - rimanenza in una pagina nuova invece che nella continuazione con posto, con l'ordine «Casa, Casa 3, Casa 2» (media);
  - pila doppia tra `@8x2` e la 6×2 (media);
  - copertina salvata senza `columns` (media);
  - test mancanti su LauncherScreen, spostamento, ridimensionamento, pager e larghezza della finestra.
- Respinti e registrati qui: 6 colonne danno 6×1 sul Lenovo; cornici diverse tra le due aree di riferimento; migrazione legacy sulla 6×2; test della copia trascinata e della copia dal vassoio con gapX ≠ gapY.

### Incremento A — modifica dei widget

**Comportamenti:**
- **Pressione.** `hooks/launcher/gestures.ts` fissa `LONG_PRESS_MS` 1000, `HOLD_TOLERANCE_PX` 8 e `DOUBLE_TAP_MS` 280.
  - In modifica un widget non selezionato si trascina solo dopo 1 s; oltre 8 px prima la presa si annulla e la pagina scorre (`touch-action: pan-x`).
  - Riscontro: dopo 180 ms il widget sale in modo lineare verso scala 1,03 con l'ombra; al rilascio torna in 120 ms.
  - A 1 s: vibrazione, copia sollevata con l'oscillazione della copia trattenuta, widget selezionato e barra con il cestino. Durante la sessione `touchmove` è bloccato.
  - Un widget già selezionato si trascina subito.
- **Fuori dalla modifica.** 1 s su un widget entra in modifica, seleziona e solleva lo stesso widget sotto il dito. 1 s sul vuoto fa affondare la pagina corrente e apre l'editor delle pagine. Con la disposizione bloccata compare l'avviso esistente. Se la modifica finisce durante la pressione (Esc, «Fine», blocco da Sistema), nulla si solleva.
- **Cornice di presa** (`ResizeFrame`):
  - quattro fasce, 2rem fuori e min(1rem, 16 %) dentro;
  - otto pallini decorativi del colore della selezione (`--aca-selection`, lo stesso dell'anello);
  - direzione dal punto toccato (`edgeFromPoint`, angolo entro min(L/4, 48 px)), lato opposto fermo;
  - pallini e fasce solo sugli assi ridimensionabili nella griglia della pagina;
  - il widget selezionato sta sopra i vicini; comparsa con `@starting-style`; con `forced-colors` Highlight e Canvas.
  - Spariscono i pomelli «sposta» e «ridimensiona».
- **Barra del widget.** Rimuovi · Annulla · Conferma.
  - Durante lo spostamento il cestino diventa una pillola «Rimuovi» larga fino a 20rem, e Annulla e Conferma si nascondono. Col dito sopra diventa rossa con testo bianco e vibra.
  - Bersaglio: il gruppo ±0,75rem in orizzontale; in verticale dal bordo della fascia −0,5rem fino al fondo.
  - La copia si riduce a 0,6 con «Rilascia per rimuovere» sopra il dito.
  - Il rilascio rimuove con «… rimosso · Annulla» per 5 s. La zona «Rimuovi» in alto è eliminata.
- **Impostazioni.** Doppio tocco entro 280 ms sul widget selezionato, anche su una pila. Invio, Spazio e lettore di schermo aprono il foglio con un click senza pressione del puntatore. Un tocco singolo sul selezionato non fa nulla, anche lento o tenuto; il click di un rilascio non conta. Fuori dalla modifica, su `[data-widget-open]`: dettagli dopo 280 ms, impostazioni al secondo tocco, tastiera immediata, comandi interni invariati.
- **Alternative al trascinamento (E2).** Con un widget selezionato le celle libere diventano «Sposta {nome} qui», con l'icona di spostamento. Il tocco lo sposta facendo spazio agli altri; la selezione resta e «Annulla» si accende; se non c'è posto, «Non c'è spazio lì.». La pressione sulle celle non deseleziona, il focus da tastiera sì. In modifica i fogli del widget e della pila hanno le sezioni «Dimensione» (Larghezza e Altezza, − e +) e «Pagina» (precedente e successiva), con limiti `aria-disabled` e il motivo scritto nel foglio. Frecce e Maiusc+frecce da tastiera restano.
- **Tastiera e focus.**
  - Tab dal widget selezionato porta a «Rimuovi» e Maiusc+Tab torna al widget.
  - Tab da «Conferma» va al widget successivo o alle celle libere; se non c'è nulla, vale l'ordine naturale.
  - Dopo uno spostamento di pagina dal foglio, alla chiusura il focus torna sul widget; dopo «Sposta qui», sul widget spostato.
- **Annulla** dopo uno spostamento in un'altra pagina riporta anche la selezione nella pagina d'origine.
- **Testi.** Aiuto della modifica: «Invio per le impostazioni del widget. Frecce per spostarlo, Maiusc più frecce per ridimensionarlo, …». Annuncio di ingresso: «Modifica della disposizione. Tieni premuto un widget per spostarlo, tocca due volte per le impostazioni. Esc per terminare.». Aiuto delle celle: «… Invio per aggiungere qui un widget o per spostarci quello selezionato.».
- **Prestazioni.** Lo stato della pressione sta in un contesto separato: un tocco non ridisegna gli altri widget.
- **Eliminati:** `RemoveZone.tsx`, `WidgetPositionControls.tsx`, `keyboardMode`, `.is-keyboard`, `.aca-widget-position*`, `.aca-remove-zone*`.

**File** (in `progetto/acasystem/frontend/src/`):
- nuovi: `hooks/launcher/gestures.ts`, `templates/launcher/WidgetPlacementSection.tsx`, `__tests__/LauncherGestures.test.tsx`;
- modificati: `hooks/launcher/{useLongPress,useWidgetDrag}.ts`, `components/system/edit/{ResizeHandle.tsx,WidgetActionBar.tsx,edit.css}`, `templates/launcher/{WidgetHost,LauncherScreen,LauncherUiContext,WidgetGrid,DragGhost,StackSheet}.tsx`, `templates/launcher/launcher.css`, `templates/sheets/{WidgetSettingsSheet.tsx,types.ts}`, `templates/app-shell/appShell.css`;
- test aggiornati: `LauncherScreen`, `FixLauncherUiShell`, `PolishCornice`, `Polish2Cornice`, `LauncherDragDrop`, `PolishLauncherScreen`;
- eliminati: `components/system/edit/RemoveZone.tsx`, `components/system/edit/WidgetPositionControls.tsx`.

**Revisione.**
- Giro 1, corretti:
  - le impostazioni si aprivano con un solo tocco lento o con una pressione tenuta sul selezionato (alta, tre rilievi);
  - con la disposizione bloccata il doppio tocco apriva il foglio della pila, che permetteva «Togli dalla pila» (alta);
  - ascoltatori registrati tardi dopo il sollevamento fuori dalla modifica (media);
  - Tab trattenuto su «Conferma» in una pagina piena (media);
  - ogni tocco ridisegnava tutti i widget (media);
  - riscontro che pulsava a ogni tocco breve (media);
  - motivi dei limiti non leggibili dentro il foglio modale (media);
  - focus perso dopo il cambio di pagina dal foglio (media);
  - oscillazione del sollevamento invisibile (media);
  - test dei limiti mancanti.
- Giro 2, corretti:
  - lo stesso id selezionato su un'altra pagina ereditava «Annulla» (alta);
  - sollevamento dopo la fine della modifica (media);
  - un test passava per il motivo sbagliato (media);
  - larghezza della pillola «Rimuovi» (media);
  - testo «pallini blu», falso con Kit 2 (media);
  - contrasto di «Rimuovi» nel tema scuro a 2,57:1 e 2,68:1, ora 6,17:1 e 6,47:1 (media);
  - copertura di test e rilievi bassi.
- Respinti e registrati qui: spessore della presa sulle celle piccole; contrasto dei pallini con gli accenti ciano e arancione; pressione lunga più tocco rapido come doppio tocco; impostazioni con la disposizione bloccata.

### Incremento B — editor delle pagine e barra della modifica

**Comportamenti:**
- **Barra della modifica (E4).** «+ Widget» e «Pagine» («Modifica le pagine»). Tolti «+ Pagina», «⚙ Pagina» e l'interruttore della copertina, che resta in Sistema → Copertina.
- **Apertura dell'editor.** Con «Pagine» il focus va su «Rinomina {pagina}», o su «Apri Copertina» quando al centro c'è la copertina. Con la pressione di 1 s sul vuoto il focus non si sposta. Esc torna alla modifica con il focus su «Pagine». Aprendo una pagina da tastiera il focus va su «Pagine».
- **Schede.** Le etichette «Principale» e «Nascosta» stanno sul bordo superiore della scheda; il corpo delle nascoste è al 55 %. Il nome delle schede laterali le porta al centro (bersaglio di 44 px).
- **Riga sotto la scheda al centro** (`PageCardControls`): «Prima» e «Dopo», il nome con la matita e il selettore «Colonne» − / valore / + con «N × M quadrati». Sotto 72rem il selettore va su una seconda riga riservata a tutte le schede, che restano della stessa altezza; da 72rem tutto sta su una riga. La copertina ha il nome come testo e il selettore; le pagine speciali il nome e le frecce, senza colonne.
- **Rinomina in linea.**
  - Il campo si apre con il testo selezionato e si restringe per lasciare le frecce sullo schermo.
  - Invio o uscita dal campo salvano e annunciano il nome mostrato; Esc ripristina e annuncia «Nome invariato.».
  - Il nome vuoto è rifiutato: con Invio l'errore compare nel campo ed è annunciato; uscendo torna il nome precedente.
  - Mentre il campo è aperto il pager è fermo, la pressione sulle schede è spenta e la classe dello schermo non cambia (tastiera virtuale).
- **Riordino.**
  - Pressione di 1 s sulla scheda con qualunque puntatore, con riscontro e vibrazione.
  - Il trascinamento tiene unite le famiglie e porta la pagina dove la mostra l'anteprima; un rilascio senza movimento assorbe il click; Esc e pointercancel annullano.
  - La copertina non si solleva e dice «La copertina resta sempre la prima pagina.».
  - Alternative: «Sposta X prima/dopo» saltano intere famiglie e sono `aria-disabled` alle estremità con il motivo; Alt+frecce sull'apertura e sul nome si possono ripetere. L'annuncio dice la posizione reale.
- **Barra dell'editor.** Elimina · Nuova · Principale · Nascondi/Mostra · Fine.
  - «Nuova» apre un menu con «Pagina vuota» e le pagine pronte Luci, Stanze, Multimedia, Sonos e Batterie (`utils/launcher/pageKinds.ts`).
  - Le azioni non disponibili sono `aria-disabled`: il motivo compare nella pillola ed è annunciato; con un «Annulla» attivo viene solo annunciato.
  - «Nascondi» è bloccato sulla principale, «Principale» vale solo per le pagine di widget, la copertina «non si elimina: puoi nasconderla».
  - Testi accanto alle icone da 40rem.
- **Pillola dei messaggi.** Nella vista pagine scende dall'alto, dove non copre i comandi.
- **Selettore delle colonne (E8).** Commit immediato e annuncio, per esempio «Casa: 7 colonne e 2 righe. 2 widget spostati in Casa 2.». «Annulla» annuncia «Colonne di Casa come prima.». Limiti: «Massimo su questo schermo.», «Minimo su questo schermo.» e, sulla copertina, «Servono più colonne per i suoi widget.». Da una continuazione che si svuota, la vista porta al centro la radice della famiglia.
- **Copertina disattivata.** Compare come «Nascosta» solo nella vista pagine; toccarla la porta al centro con il motivo «La copertina è nascosta: tocca Mostra per rivederla.».
- **Pagina principale.** `canRemovePage` segue `basePageId`; eliminando la pagina scelta come principale la scelta si azzera.
- **Multimedia.** «Gestisci» per scegliere i lettori, con «Mostra tutti»; anche la pagina senza lettori offre «Mostra tutti».
- **Foglio della pagina.** `PageSettingsSheet` è eliminato con esportazioni, tipi, mock e viste di anteprima. L'icona della pagina non si sceglie più ma resta nel dato (E6).
- Icone `arrowLeft`, `arrowRight`, `eye`, `eyeSlash` da mx-icons 1.1.2, già installato.

**File** (in `progetto/acasystem/frontend/src/`, salvo `e2e/`):
- nuovi: `utils/launcher/pageKinds.ts`, `components/system/edit/PageCardControls.tsx`, `__tests__/LauncherViewport.test.ts`;
- modificati: `components/primitives/components/Icon.tsx`, `templates/sheets/parts/iconChoices.ts`, `utils/launcher/{layout,pager}.ts`, `hooks/launcher/{useLauncherController,usePageDrag,useViewport}.ts`, `components/system/edit/{EditToolbar.tsx,PageOverviewBar.tsx,UndoSnackbar.tsx,edit.css}`, `templates/app-shell/{footerBand.ts,appShell.css}`, `templates/launcher/{Pager.tsx,LauncherScreen.tsx,launcher.css}`, `templates/sheets/{index.tsx,types.ts}`, `pages/system/preview/PreviewSystem.tsx`, `pages/ui-kit/UiKitPage.tsx`, `components/widgets/media/{views/MediaPage.tsx,testi.ts}`, `e2e/README.md`;
- test aggiornati: `EditToolbarHidden`, `PolishCornice`, `Polish2Cornice`, `FixSheetsReview`, `SystemSheets`, `Polish2LauncherScreen`, `PolishLauncherScreen`, `ShellLauncher`, `LauncherDragDrop`, `LauncherScreen`, `AvMediaPage`, `LauncherHomeOptions`, `LauncherGestures`;
- eliminato: `templates/sheets/PageSettingsSheet.tsx`.

**Revisione.**
- Giro 1, corretti:
  - frecce «Prima»/«Dopo» che ignoravano le famiglie e annunciavano posizioni false (media, due rilievi);
  - copertina nascosta che si apriva mostrando la principale (media);
  - `homePageId` rimasto dopo l'eliminazione della pagina (media);
  - test mancanti di rinomina e colonne sul telefono (medie);
  - riscontro di pressione sulla copertina, nome laterale sotto 44 px, caricamento di Multimedia senza test, `e2e/README.md` superato (basse).
- Giro 2, corretti:
  - annuncio e pagina al centro sbagliati dopo l'eliminazione di una continuazione (alta);
  - pillola sopra i comandi dell'editor sul tablet e sul telefono (alta);
  - motivi che cancellavano un «Annulla» attivo (media);
  - Alt+frecce che funzionavano una volta sola (media, due rilievi);
  - riga sotto la scheda che andava a capo e cambiava l'altezza delle schede (media);
  - destinazione del trascinamento con le famiglie (media);
  - Invio con nome vuoto senza annuncio (media);
  - copertura di test (27 mutazioni ora rilevate).
- Respinti e registrati qui: una suite e2e geometrica, che manca di infrastruttura (la verifica è stata fatta con uno script Playwright una tantum); due rami difensivi non raggiungibili; la riscrittura dei casi di `Polish2Cornice`.

### Prova visiva e correzioni

La prova con Playwright Chromium sull'anteprima di sviluppo ha trovato due difetti, corretti:
- sul telefono a 390×844 il campo della rinomina spingeva «Sposta … dopo» fuori dallo schermo: il campo ora si restringe (`edit.css`, `min-width: 0`);
- nella vista pagine l'etichetta «Principale» copriva l'angolo del primo widget: ora sta sul bordo superiore della scheda (`launcher.css`).

Il testo della nota di prova «Benvenuto» dell'anteprima (`pages/launcher/preview/previewWidgets.tsx`, solo dati finti) ora cita i pallini. Un test nuovo in `LauncherScreen.test.tsx` fissa le due regole CSS.

### Documenti

Aggiornati questo report, [reports/README.md](README.md), [project-status.md](../project-status.md) (incarico, punto di ripresa, ISSUE-028, nuovo ISSUE-031, proposte), [verification.md](../verification.md), [design.md](../design/design.md) e [ADR-0007](../decisions/ADR-0007-acasystem-os.md). `infrastructure.md` resta all'aggiornamento del banco.

## Scelte esecutive

Utente non raggiungibile durante l'esecuzione: le scelte sono reversibili e vanno confermate dove indicato.

**Decisioni E1–E13 del piano, applicate:**
- **E1.** In modifica il tocco singolo seleziona, non sposta e non apre altro.
- **E2.** Con un widget selezionato, il tocco su una cella libera lo sposta lì: è l'alternativa a puntatore singolo al trascinamento (WCAG 2.5.7). Le impostazioni hanno «Dimensione». Le frecce sullo schermo spariscono; quelle da tastiera restano.
- **E3.** I pallini sono un segno; la presa è una cornice continua; il widget selezionato sta sopra i vicini.
- **E4.** Barra della modifica con «+ Widget» e «Pagine»; «Mostra copertina» resta in Sistema e diventa Nascondi/Mostra nell'editor.
- **E5.** Il «+» dell'editor è un menu con le pagine pronte; i lettori di Multimedia si scelgono con «Gestisci».
- **E6.** L'icona della pagina esce dall'interfaccia e resta nel dato.
- **E7.** Riordino con pressione di 1 s, «Sposta prima/dopo» e Alt+frecce.
- **E8.** Selettore «Colonne» sotto la scheda al centro, copertina compresa; non in Sistema.
- **E9.** La densità di Sistema resta il predefinito delle pagine senza scelta; il testo d'aiuto lo dice.
- **E10.** Righe deterministiche per classe e colonne, da un'area di riferimento; l'area viva decide la cella e i gap.
- **E11.** La disposizione `phoneLandscape` è il punto di partenza della nuova griglia.
- **E12.** Nessuna voce diagnostica «Schermo»: registrata come proposta.
- **E13.** Nessuna dipendenza e nessuna modifica al backend.

**Scelte del piano e dell'esecuzione:**
- **Pallini degli assi fissi.** Su un asse che non si può ridimensionare, perché la misura è fissa o la griglia della pagina ha una sola riga o colonna, pallini e fasce non si disegnano. Un widget di una sola misura ha solo l'anello. Si scosta dalla lettera di U4.
- **Tetto del gap.** Mezza cella. Il minimo resta esatto, così le celle esistenti non cambiano. Oltre il tetto la griglia si centra.
- **Aree di riferimento e misura della scala.** `phoneLandscape` 973×230 dalla misura sugli screenshot; `tablet` 973×440, lo stesso schermo a schermo intero con la cornice del CSS; `tabletPortrait` 568×540 e `phone` 358×576 restano stime del piano. Dettagli in [verification.md](../verification.md#modifica-semplificata-e-griglia-per-pagina--2026-10-08).
- **8 colonne automatiche solo dove la larghezza lo permette.** Il piano le voleva fisse su ogni schermo `phoneLandscape`: a 640×400 avrebbero dato celle di 67 px. Ora valgono se la cella resta di almeno 84 px, cioè da circa 781 px; sotto resta la 6×2. È coerente con E10, che chiede colonne dalla larghezza. Se la finestra attraversa la soglia la chiave cambia dal vivo.
- **Copertina a 3 colonne.** Vale per la copertina nuova e, una sola volta, per quella salvata con al massimo 3 widget. Una copertina salvata con più widget resta sulla sua griglia (E9). Il valore è salvato, così aggiungere o togliere un widget non fa saltare la griglia.
- **Semina.** Prima dopo l'ultimo widget, poi nei buchi, poi nelle continuazioni esistenti, solo alla fine in una continuazione nuova dopo l'ultima pagina della famiglia. La riparazione di una chiave esistente resta quella di prima.
- **«Principale» sulla scheda.** Dice quale pagina è la home senza centrare le schede una per una.
- **Ordine di tabulazione della barra.** Tab dal widget selezionato a «Rimuovi», Maiusc+Tab al widget, Tab da «Conferma» al widget successivo o alle celle libere.
- **Riscontro della pressione.** Parte dopo 180 ms, lineare fino a 1 s, così un tocco breve non fa pulsare la card. Al sollevamento la copia oscilla come ogni copia trattenuta, invece dei due cicli di `aca-wiggle` del piano.
- **Disposizione bloccata.** Fuori dalla modifica il doppio tocco non apre fogli e i dettagli si aprono subito: altrimenti dal foglio della pila si cambiava la disposizione.
- **Sezioni «Dimensione» e «Pagina» solo in modifica.** Fuori dalla modifica il doppio tocco apre le impostazioni senza controlli di posizione.
- **Motivi dentro il foglio.** Un foglio modale rende inerte il resto della pagina, compresa la regione degli annunci del launcher: i motivi dei limiti sono scritti nella sezione, con `role="status"`.
- **Pillola in alto nella vista pagine.** In basso copriva «Meno colonne» e la barra dell'editor.
- **Due righe sotto la scheda sotto 72rem.** Così le schede hanno tutte la stessa altezza.
- **Motivi non previsti dal piano:** «È già la prima pagina.», «È già l'ultima pagina.», «Minimo su questo schermo.» e due motivi per le famiglie di più pagine.
- **Stato della vista pagine nel controller,** necessario per mostrare la copertina disattivata solo nella vista; `basePageId` passa in `layout.ts` per evitare un'importazione circolare.
- **«Sposta qui»** non usa l'animazione di atterraggio: il widget scorre al nuovo posto.
- **Pressione lunga seguita da un tocco rapido** sul widget selezionato: conta come doppio tocco, perché una pressione tenuta resta un tocco (U2).
- **Spessore della presa** di 42-48 px come nel piano: su una cella di 65 px è 42,4 px. Aumentarlo ridurrebbe sotto 44 px il centro che serve allo spostamento.

## Verifiche ed evidenze

Comandi in `progetto/acasystem/frontend`, Windows, Node del progetto, 2026-10-08.

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Punto di partenza | `npm run typecheck`; `npx vitest run` in `progetto/acasystem/frontend`, 2026-10-08 01:35 | Superato | Typecheck 0 errori; 128 file, 1403/1403 test. |
| Osservazioni dell'utente | Lettura di `ResizeHandle.tsx`, `WidgetActionBar.tsx`, `RemoveZone.tsx`, `EditToolbar.tsx`, `PageOverviewBar.tsx`, `Pager.tsx` | Superato | Icone «sposta» e «ridimensiona» sugli angoli superiori; fasce invisibili su 4 lati e 2 angoli inferiori; barra con 6 azioni; zona «Rimuovi» e cestino insieme durante il trascinamento; pagine spostate solo dal nome. |
| Misura della scala del Lenovo | Lettura dei pixel sugli screenshot del 2026-10-08 (copie 1600×1000 dello schermo 1920×1200) | Superato come stima dedotta | Scala 1,875, finestra ≈1024×472 CSS, area della griglia 973×230. Valori di `innerWidth`, `devicePixelRatio` e safe-area non misurati sul dispositivo. Dettagli in verification.md. |
| Incremento C, implementazione | `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`; `npx vitest run` mirato e completo | Superato | 0 errori; tipografia 0 (424 file); colori 0 (302 file); `LauncherColumns` 34/34; 41 file e 518 test mirati; suite 129 file, 1437 test. |
| Incremento C, correzioni dei due giri | Stessi controlli; riproduzioni dei revisori; mutazioni temporanee | Superato | Giro 1: suite 129 file, 1454 test; le riproduzioni dei doppioni prima fallivano, ora passano; togliendo la correzione il test dell'invariante fallisce. Giro 2: suite 129 file, 1470 test, poi 26 file e 276 test dopo l'ultimo ritocco; 10 mutazioni del revisore ora rilevate. |
| Incremento A, implementazione | Controlli statici; `npx vitest run` su 56 file | Superato | 0 errori; tipografia 0 (424), colori 0 (301); 56 file e 674 test, compreso il nuovo `LauncherGestures`. |
| Incremento A, correzioni dei due giri | Controlli statici; suite; mutazioni; calcolo dei contrasti | Superato | Giro 1: suite 130 file, 1523 test; senza `flushSync` il test del sollevamento fallisce. Giro 2: 35 file e 486 test; 11 mutazioni rilevate; contrasti di «Rimuovi» 8,12:1 e 6,17:1 (pronto, chiaro e scuro) e 6,47:1 (armato). Suite completa non ripetuta in quel giro: ripetuta nella verifica finale. |
| Incremento B, implementazione | Controlli statici; 24 file mirati; suite completa | Superato | Tipografia 0 (425), colori 0 (301); 380 test mirati, un errore transitorio di Windows su `SystemSheets` rieseguito verde; suite 131 file, 1533 test. |
| Incremento B, correzioni dei due giri | Controlli statici; suite; mutazioni; script Playwright Chromium sul server Vite di sviluppo | Superato | Giro 1: 13 file e 287 test. Giro 2: suite 131 file, 1549 test; 27 mutazioni rilevate. A 960×445, 1024×472, 844×390, 390×844 e 360×740 nessun comando sotto la pillola e schede alte uguali; tre tocchi reali su «−» danno 7 → 6 → 5. Misura una tantum, non una suite e2e. |
| Verifica finale | `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `format:check`, `i18n:check`, `npx vitest run`, `npm run build`, `node scripts/check-bundle-size.mjs`, ricerca dei residui | Superato, salvo `format:check` preesistente | 0 errori; tipografia 0 (425), colori 0 (301); `format:check` esce con 1 solo per `eslint.config.js` e `public/sw.js`, non toccati e invariati rispetto all'ultimo commit; i18n 4/4; vitest 131 file, 1549/1549, 313,4 s; build in 2,21 s con l'avviso preesistente sui chunk oltre 500 kB; budget rispettati (index 718,6/900 KB); dei residui resta solo un'asserzione d'assenza di `[data-widget-knob]` nei test. |
| Prova visiva | Playwright Chromium, mouse, DPR 1, anteprima di sviluppo `launcher.html` (pelle Metallo, entità finte) su Vite; viste a 960×445, 960×552, 960×600, 390×844, 844×390, 600×860; interazioni a 960×445 e 390×844 | Superato, con due difetti poi corretti | Griglia piena entro il tetto del gap e celle a scarto 0 px; nessuno scorrimento orizzontale; console senza errori. Provati pressione breve e di 1 s, pallini, ridimensionamento, «Sposta qui», doppio clic, cestino con «Annulla», editor, rinomina, colonne, copertina 3×1 (2×3 sul telefono). Doppio tocco simulato con due clic a 140 ms. |
| Correzioni visive | `npx vitest run` mirato e completo; controlli statici; nuovo script Playwright su Vite | Superato | `LauncherScreen` 74/74; suite 131 file, 1550/1550, 309,9 s; a 960×445, 390×844, 844×390 e 600×860 l'etichetta non copre widget e le frecce della rinomina restano nello schermo. La build non è stata ripetuta dopo queste modifiche di CSS e dati d'anteprima: la ripete la costruzione dell'immagine del banco. |
| Lenovo Tab M11 reale, tocco, TalkBack, tastiera virtuale | Prova sul dispositivo | Non eseguito | Da fare con la nuova immagine: pointercancel dopo la pressione lunga, spessore della presa ai bordi, rilascio sul cestino, doppio tocco, riordino delle schede, rinomina con la tastiera virtuale, TalkBack. |
| Home Assistant reale | Banco con sessione HA | Non eseguito | Le prove usano entità finte; nessun comando fisico. |
| Banco | Procedura (2026-10-08, 23:30-23:32, PowerShell nella radice):<br>1. `docker compose -f progetto/compose.tunet.yaml stop`;<br>2. `docker run --rm -v aca-tunet_tunet-data:/data:ro -v <backup/banco>:/backup --entrypoint tar aca-system:0.5 czf …`;<br>3. `image: aca-system:0.6`;<br>4. `up -d --build`;<br>5. GET di controllo. | Superato | **Copia a freddo:** `backup/banco/tunet-data-20261008-pre-0.6-freddo.tgz`, 60 398 byte, con `tunet.db`, `-wal` e `-shm`. **Prima:** immagine `sha256:143fee7…786ec8`. **Ora:** `aca-system:0.6` `sha256:cf27d8a30c44af0212a5da68491d8c85c59e0418c541a2058eee30a540e9780c` (creata 2026-10-08T21:31:29Z), container `healthy`. **Build:** costruita dai sorgenti nel Dockerfile, typecheck strict compreso. **Controlli su 127.0.0.1 e sull'indirizzo Wi-Fi:** `/api/health` `{"status":"ok","version":"0.1.0"}`; `/ha/auth/providers` 200 `application/json`; servito `index-CD3c4iGC.js`, uguale a quello dell'immagine. Nel browser integrato, con la sessione esistente, «Sincronizzato» e la Principale con la nuova griglia. **Indirizzo cambiato:** il primo avvio è fallito perché `172.20.10.6` non esisteva più, il PC era passato all'hotspot «HUAWEI Y6 2018». Il binding del compose è stato portato a `10.165.121.134:3002` secondo la procedura di REP-20261007-011. Per il browser del tablet il nuovo indirizzo è un'altra origine: servono un nuovo accesso e la disposizione salvata lì. **Ripristino:** `image: aca-system:0.5` più la copia del volume. |

## Controllo del diff e decisioni

- **Perimetro.** Il diff riguarda i file del frontend elencati per incremento e i documenti di questa fase. Nessuna modifica a backend, dipendenze, `migration.ts` o `documentazione/archive/`; nessun commit Git. Le icone nuove vengono da mx-icons 1.1.2, già installato. Playwright è stato usato dall'installazione esistente per prove una tantum, senza aggiungerlo al progetto. `package.json` risultava già modificato prima dell'incarico.
- **Scostamenti dal piano**, oltre alle scelte sopra:
  - con l'area misurata 6 colonne sul Lenovo danno 6×1 e non l'alias 6×2 previsto;
  - `LauncherPage.tsx`, `PreviewApp.tsx`, `UiKitPage.tsx`, `UndoSnackbar.tsx` e `e2e/README.md` sono stati toccati benché non elencati;
  - la prova di andata e ritorno di snapshot e PageContext sta in `LauncherColumns.test.tsx` invece che in `LauncherController.test.tsx`.
- **Decisioni.** ADR-0007 riceve un'annotazione datata; nessun nuovo ADR. design.md segna come superate, con data, le righe su modifica, pomelli, rimozione, riordino ed editor delle pagine. Nessun conflitto nuovo tra codice, PRD e ADR.

### Punti da confermare con l'utente

1. **E2 e U8.** Toccare una cella libera con un widget selezionato lo sposta lì. Vale finché l'utente non risponde.
2. **Una sola riga con poche colonne sul Lenovo.** Con l'area misurata, da 2 a 6 colonne si ha una riga sola: 6 colonne danno 6×1 con quadrati da 153 px, e 7 e 8 colonne danno la stessa cella di 110 px. La pagina automatica resta 8×2 con cella 110, come la 6×2 di prima.
3. **Copertina salvata con più di 3 widget.** Resta sulla griglia della classe finché l'utente non sceglie le colonne (E9). Da confermare se U7 deve valere anche per queste.
4. **Disposizione bloccata.** Fuori dalla modifica il doppio tocco non apre le impostazioni. Da decidere se nome e aspetto del widget devono restare modificabili con il blocco.
5. **Modalità di riferimento del tablet.** Nella scheda di Chrome il Lenovo è `phoneLandscape`. A schermo intero, circa 1024×640, diventa `tablet` 8×5 con celle più piccole: l'anteprima a 960×600 dà 67 px. Scegliere 8 colonne le ingrandisce. Va chiarito se il pilota userà il chiosco a schermo intero.
6. **Schermi orizzontali stretti.** Sotto circa 781 px le pagine automatiche restano 6×2; la chiave cambia dal vivo con lo schermo diviso.
7. **Pagina principale implicita.** Senza una scelta con la casa, la principale è la prima pagina di widget: spostandone un'altra al primo posto, quella diventa «Principale» con le sue protezioni. Comportamento esistente, ora visibile.
8. **Copertina senza meteo.** Senza un'entità meteo il terzo posto della copertina resta vuoto: comportamento esistente, più evidente con 3 colonne.

### Limiti e questioni residue

- La misura della scala è dedotta dagli screenshot. Le due aree di riferimento usano cornici diverse: ≈242 px dedotti per Chrome, 200 px del CSS per lo schermo intero; l'anteprima di sviluppo a 1024×472 dà 973×272. Con 242 px l'area a schermo intero sarebbe 973×398 e 8 colonne darebbero 3 righe invece di 4. Ritarare crea solo chiavi nuove.
- Presa di 42,4 px sulle celle da 65 px, sotto i 44 px del progetto.
- Con gli accenti ciano e arancione nel tema chiaro, pallini e anello sono a 2,39:1 e 2,49:1 sulla pagina, sotto 3:1 (proposta registrata).
- Una build vecchia in cache scarta `columns` e le chiavi WxH al salvataggio: aggiornare insieme tutti i dispositivi del banco.
- La prima migrazione legacy sul Lenovo impacchetta ancora sulla 6×2: riguarda solo un primo avvio senza layout salvato.
- `Polish2Cornice` verifica `fitBand` con le larghezze della barra precedente; misure nuove in Chromium: gruppi con testo 126 e 123,5 px, «short» e «icons» 52 px. Le densità «short» e «icons» della barra ora coincidono.
- Senza test: variabili dei gap sulla copia trascinata, copia dal vassoio con gapX ≠ gapY, larghezza della finestra passata da `PreviewApp`.
- Nessuna suite e2e: le misure geometriche sono script una tantum.

## Chiusura e punto di ripresa

Codice, documenti e banco completati.
- **Banco:** su `aca-system:0.6` dal 2026-10-08, raggiungibile su `http://10.165.121.134:3002` dalla rete «HUAWEI Y6 2018».
- **Copia del volume:** `backup/banco/tunet-data-20261008-pre-0.6-freddo.tgz`.
- **Git:** nessun commit. Il lavoro resta nel working tree insieme a quello non committato di REP-20261007-008…038.

Nessun incarico applicativo resta aperto oltre alla prova sul dispositivo e ai punti da confermare.

**Prossimo passo:** prova sul Lenovo Tab M11 in Chrome con la nuova immagine.
- Misurare `innerWidth`, `innerHeight`, `devicePixelRatio` e safe-area, poi ritarare le aree di riferimento se serve.
- Provare pressione di 1 s e prosecuzione del trascinamento, cestino, doppio tocco, riordino delle schede, rinomina con la tastiera virtuale e TalkBack.
- Raccogliere le risposte ai punti da confermare.

Proposte registrate in [project-status.md](../project-status.md#proposte-registrate-il-2026-10-08), non applicate; il difetto del sensore è [ISSUE-031](../project-status.md#issue-031).
