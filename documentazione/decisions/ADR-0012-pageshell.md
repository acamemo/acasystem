# ADR-0012 — PageShell: un contenitore unico per le pagine del launcher, guidato dai dati della pagina

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0012 — PageShell: un contenitore unico per le pagine del launcher, guidato dai dati della pagina |
| Stato | Accettata su richiesta esplicita dell'utente del 2026-10-09 |
| Data e autore | 2026-10-09; scheda redatta da Claude Code (Opus 5.5, `claude-opus-5-5`), aggiornata al realizzato il 2026-10-10 da Claude Code (Sonnet 5.5, `claude-sonnet-5-5`) |
| Decisore e autorizzazione | Utente, chat del 2026-10-09, riportata in [REP-20261009-004](../reports/REP-20261009-004-pageshell.md): «di base penso che dovremmo definire e refrattorizzare tutte le funzioni delle pagine in un unico componente di layout che potremmo chiamare PageContainer o PageShell se non esiste già perché tutte le pagine create, sono tutte dipendenti dalla stessa funzionalità ciò che può cambiare realmente sono i dati della singola pagina, come ad esempio le colonne, il nome […] poi innesterei che alcuni componenti come la topbar che si attiva solo da pagine non copertina con un semplice if page == copertina disable bar o che comunque la fa risalire e non la mostra mai ecc». La richiesta decide il contenitore unico guidato dai dati. Nella stessa chat l'utente ha deciso che «Fine» esce dalla barra in alto per tutte le pagine e che la copertina non mostra mai la barra in alto (D1), e che le caselle vuote della copertina sono sempre visibili (D5). Nomi dei campi, API e ordine di migrazione sono scelte esecutive dell'agente dentro quel perimetro. |
| Collegamenti | [REP-20261009-004](../reports/REP-20261009-004-pageshell.md), [REP-20261009-003](../reports/REP-20261009-003-vista-pagine-animazione.md), [REP-20261009-002](../reports/REP-20261009-002-editor-pagine-icone.md), [REP-20261008-001](../reports/REP-20261008-001-modifica-semplificata-griglia-per-pagina.md), [REP-20261007-015](../reports/REP-20261007-015-barra-nascosta-in-copertina.md), REP-20261007-030, [ADR-0004](ADR-0004-principi-frontend.md), [ADR-0007](ADR-0007-acasystem-os.md), [ADR-0008](ADR-0008-struttura-frontend-backend.md) |
| Sostituisce / sostituita da | Nessuna |

## Contesto ed evidenze

Fatti verificati sul working tree del 2026-10-09 prima delle modifiche (base `7298d4d` più modifiche non committate):
- La ricerca di `PageShell` e `PageContainer` in `src` non dava risultati.
- La pagina era divisa su quattro livelli: AppShell (cornice), Pager (scorrimento e schede), LauncherScreen (circa 1830 righe) e WidgetGrid o PageKindHost (contenuto). LauncherScreen sceglieva il contenuto con un ternario a tre rami: copertina con `WidgetGrid quiet`, pagina di widget, pagina speciale.
- I rami speciali della copertina erano sparsi in LauncherScreen, `pager.ts`, `useLauncherController.ts` e `layout.ts`: `widgetPageOf`, la barra in alto nascosta con `current?.type === 'cover' && !editMode`, la prop `quiet` solo per la copertina.
- La prop `cover` di LauncherScreen non veniva mai mostrata nell'app, perché le griglie sono sempre presenti. `CoverPage` resta usata da `UiKitPage.tsx`.
- La chiave del pager coincide con l'id della pagina anche per la copertina (`COVER_PAGE_ID = 'cover'`).
- Bug collegati, riprodotti con Playwright su `launcher.html`:
  - la copertina fuori dalla modifica non montava celle e le mostrava solo al sollevamento (P3);
  - `computeTarget` agganciava l'angolo della copia, che ha la misura della pagina d'origine, quindi il widget riportato in copertina finiva nella colonna sbagliata, e il bersaglio era nullo per 320 ms dopo il giro di pagina (P2);
  - la pressione scalava l'elemento posizionato con `transform` e lo faceva scivolare (P4).

Inferenza non verificata: il caso esatto dell'utente (P2) potrebbe dipendere da dati del banco non disponibili (D4: nessuna esportazione del layout).

## Proposta o decisione

Decisione umana accettata, attuata come segue.
1. **Dati della pagina.** `PageDescriptor` (`utils/launcher/pageDescriptor.ts`, logica pura, senza React né Home Assistant) contiene:
   - `key`, `page`, `kind`, `label`, `familyRootId`;
   - `columns.minSaved` (colonne minime, come salvate), `hidden`, `main`;
   - `topBar`: `auto` | `never`;
   - `addCells`: `always` | `edit-only`;
   - `acceptsWidgets`, che nel tipo unione garantisce `page` non nulla.

   La superficie (griglia o speciale) deriva da `kind` con `surfaceOf`. La copertina è un descrittore con `topBar: 'never'`, `addCells: 'edit-only'` e minimo `COVER_COLUMNS`. La chiave `cover` resta invariata.
2. **Componente comune.** `templates/launcher/PageShell.tsx` monta ogni pagina: sceglie `WidgetGrid` o `PageKindHost` dalla superficie e mette gli attributi `data-page-kind` e `data-top-bar` su un wrapper `display: contents`. La politica delle celle sostituisce `quiet`: `WidgetGrid` riceve `cells: 'interactive' | 'wells'`, e la copertina passa `wells` fuori dalla modifica (pozzetti non interattivi, senza «+»). Misura dell'area, registrazione della geometria assestata per il trascinamento e `inert` della vista pagine restano in `WidgetGrid` e `Pager`; i comandi dell'editor restano in `LauncherScreen`. PageShell non è una primitiva: legge dati del launcher (ADR-0004, ADR-0008).
3. **Barre.** Restano in `LauncherScreen`, montate una sola volta, e leggono il descrittore della pagina corrente. La barra in alto sale (`translateY`), resta montata e diventa inerte quando `topBar` è `never`, in modifica e nella vista pagine. «Fine» non è più nella barra in alto: sta nella barra in basso della modifica (`EditToolbar`), accanto a «+ Widget» e «Pagine». La barra del widget selezionato e quella della vista pagine, che aveva già «Fine», non cambiano.
4. **Fuori dal descrittore:** le regole dell'editor delle pagine (REP-20261009-002) e le sessioni di trascinamento e di pressione.

## Alternative e motivazioni

- **Aggiungere solo `topBar` in LauncherScreen.** Scartata: non risponde alla richiesta, perché le funzioni comuni resterebbero sparse.
- **Estendere WidgetGrid fino a coprire le speciali.** Scartata: mescola la griglia con pagine che scorrono in verticale e non hanno celle.
- **PageShell come primitiva Layout.** Scartata: violerebbe il confine di ADR-0004 e ADR-0008.
- **Portare nel descrittore anche le regole dell'editor.** Rinviata: si sovrappone a REP-20261009-002 senza benefici per il layout.
- **`topBar: 'edit-only'` per la copertina** (barra visibile in modifica perché conteneva «Fine»). Sostituita dall'utente con `never` e lo spostamento di «Fine» (D1).
- **PageShell che include misura, geometria, `inert` e slot dei comandi.** Prevista dal piano, non realizzata: avrebbe spostato logica già a posto in `WidgetGrid` e `Pager` e allargato molto il diff. Può essere ripresa se serve una trasformazione sul guscio.

## Conseguenze

- **API e dati.** Nessun cambio al formato salvato (`LauncherLayout`). Sono spariti la prop `cover` di `LauncherScreen` (e il suo uso in `LauncherPage` e `PreviewApp`), `quiet` di `WidgetGrid` (sostituita da `cells`), `widgetPageOf` e il wrapper `aca-cover--widgets` con le sue regole in `pages/cover/cover.css`. La prop `editMode` e il pulsante che si trasformava in «Fine» non esistono più nella barra in alto.
- **Comportamento** (dagli incarichi collegati, non da questa decisione):
  - le caselle vuote della copertina sono sempre visibili (pozzetti a riposo, celle con «+» in modifica);
  - l'aggancio avviene al centro della copia e il bersaglio è valido subito dopo il giro di pagina;
  - la pressione rimpicciolisce fino al 90 % senza spostamento (il posizionamento usa `translate`);
  - la barra in alto non compare mai sulla copertina e sale in modifica su tutte le pagine (scelta esecutiva: non una matita disattivata).
- **Vista delle pagine e nuvoletta.** Restano in REP-20261009-003, con criteri propri. PageShell è il punto d'innesto, ma non le decide.
- **Documenti.** REP-20261008-001 U1 riceve un'annotazione datata (niente più crescita né oscillazione durante la pressione; l'oscillazione resta durante il trascinamento). REP-20261007-015 e REP-20261007-030 restano validi, espressi come dati.
- **Limiti.** P2 va confermato con il layout reale del banco. In modifica Connessione e Sistema non sono raggiungibili finché non si preme «Fine». La prova sul Lenovo Tab M11 richiede un aggiornamento autorizzato del banco. Nessuna nuova dipendenza.

## Verifiche e revisione

Esiti al 2026-10-10, nei report collegati e in [verification.md](../verification.md#pageshell-vista-pagine-a-trasformazioni-e-nuvoletta-ui-010--2026-10-09):
- test unitari `PageDescriptor`, `PageShell`, `LauncherCoverGrid`, `LauncherGridGeometry`, `LauncherDragDrop`: verdi;
- typecheck strict, ESLint, tipografia, colori e build verdi; suite completa 139 file, 1644 test;
- impronta geometrica prima/dopo identica in 5 scene a 1280×800 e 390×844, salvo gli scarti voluti di D1;
- prove Playwright senza GPU sui bug P2 (8 giri su 8), P3/D5 e sulla pressione.

Non eseguito: prova sul Lenovo Tab M11 e sul banco con i dati reali.

**Nota del 2026-10-10 (REP-20261009-005 e 006).** Due interventi successivi toccano ciò che questa decisione descrive, senza cambiarla: la barra della vista pagine non ha più la matita né le etichette «Principale» e «Nascosta» sulle schede, e il nome si rinomina con una scia animata di tutta la barra; il contenitore delle pagine (`Pager`) non ritaglia più al bordo dell'area tra le barre ma ai bordi dello schermo (margine negativo e padding uguali alle fasce), con le barre sopra e le fasce ancora sorde ai tocchi. Il descrittore, PageShell e la ripartizione tra `WidgetGrid`, `Pager` e `LauncherScreen` sono invariati; misure, celle e fattore k della vista pagine restano identici.

Revisione da aprire se:
- serve una terza superficie oltre a griglia e speciale;
- le regole dell'editor convergono nel descrittore;
- si vuole portare misura, geometria o slot dei comandi dentro PageShell;
- l'utente chiede di nuovo la barra in alto durante la modifica.

## Annotazione del 2026-10-14 — barra unica in basso (ADR-0013)

Su approvazione dell'utente del 2026-10-13 ([ADR-0013](ADR-0013-barra-unica.md), piano [REP-20261013-002](../reports/REP-20261013-002-piano-barra-unica.md)) la barra di stato non sta più in alto: sta nella fascia in basso del launcher. Il testo sopra resta come storico della decisione del 2026-10-09; dove la contraddice vale questa annotazione.
- **Punto 3 «Barre» (riga 39).** La barra di stato è nella fascia in basso, in posizione assoluta nell'area di griglia, e al posto di salire scende (`translateY` verso il basso) su copertina, in modifica e nella vista pagine. Resta montata e diventa inerte quando `topBar` è `never`, in modifica e nella vista pagine, come prima. «Fine» resta nella barra in basso della modifica; «Modifica» sta nello stesso angolo e le due non sono mai visibili insieme (attesa di 180 ms, guardia di 400 ms per il puntatore). D1 vale nella sostanza: la copertina non mostra la barra e «Fine» è in basso.
- **Righe 33 e 37, campo `topBar` e attributo `data-top-bar`.** Il nome resta per non allargare il diff; indica se compare la barra di stato nella fascia. La rinomina è una proposta separata (ISSUE-056).
- **Riga 58, conseguenze di comportamento.** «La barra in alto non compare mai sulla copertina e sale in modifica su tutte le pagine» va letto come «la barra di stato non compare mai sulla copertina e scende in modifica su tutte le pagine». La fascia in alto riserva soltanto l'area sicura (nessun margine extra per ora).
- **Riga 61, limite.** Resta vero: in modifica Connessione e Sistema non sono raggiungibili finché non si preme «Fine»; ora stanno nella barra in basso.
- **Riga 73, nota del 2026-10-10.** Il ritaglio delle pagine ai bordi dello schermo resta; la fascia in alto non ha più la barra e la riga dei chip in alto non esiste più, quindi il bordo di ritaglio sul telefono (circa 64 px sopra l'area) non vale più.
- **Riga 79, motivo di revisione.** «L'utente chiede di nuovo la barra in alto durante la modifica» diventa «l'utente chiede di nuovo una barra in alto, o un avviso dell'allarme in cima» (come in ADR-0013).

## Annotazione del 2026-10-20 — nuovo PageKind `casa3d` (ADR-0014)

Con l'accettazione di [ADR-0014](ADR-0014-casa-3d.md) (utente, 2026-10-20) e la tappa T4a di [REP-20261020-002](../reports/REP-20261020-002-casa-3d-piano.md) il launcher ha un tipo di pagina in più, `casa3d`. Il testo sopra resta come storico.
- **Superficie.** Speciale: `surfaceOf('casa3d')` è `special`, quindi `PageShell` la monta con `PageKindHost`, come le altre pagine speciali; il descrittore non cambia.
- **Dati.** `LauncherLayout.casa3dVersion` segna l'installazione una tantum della pagina, aggiunta in coda dal controller dopo le pagine di categoria; una pagina eliminata non torna.
- **Visibilità.** `PageKindHost` passa `editMode` alla pagina speciale (anche la vista pagine è una modifica); il pager fornisce un nuovo contesto `PageNearContext` (pagina in primo piano o accanto) accanto a `PageVisibilityContext`. La pagina `casa3d` non crea nulla di 3D in modifica e in vista pagine.
- **Non cambia** il resto dell'ADR: barre, trascinamento e pressione restano in `LauncherScreen`.
