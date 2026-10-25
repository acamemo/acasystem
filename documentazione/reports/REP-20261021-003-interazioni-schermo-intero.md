# REP-20261021-003 — Piano: interazioni con le dita e launcher a schermo intero

*Piano rivisto dopo la critica di completezza del 2026-10-21. Le correzioni sono nella sezione «Rettifiche successive».*

# REP-20261021-003 — Interazioni con le dita e schermo intero: piano

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261021-003: piano per i gesti e per la cornice a schermo intero. Il numero era libero il 2026-10-21 (ultimi: REP-20261021-001 e -002) e va ricontrollato al salvataggio |
| Stato | **Approvato il 2026-10-21; G1-G2 e, dalla frase «vai, procedi con G3-G5 e C1-C3», G3-G5 e C1-C3 autorizzate e realizzate nel codice il 2026-10-21** (C4, il tasto Indietro e la prova col dito restano da fare) (ADR-0016 accettata; banco 0.9.20 e Tab M11 provati il 2026-10-21, vedi «G1-G2 — esito»); C4, G0, G6 e il tasto Indietro non sono autorizzati |
| Data | 2026-10-21 (Europe/Rome) |
| Autore / modello | Claude Code (Opus 5.5, `claude-opus-5-5`). Due letture in sola lettura (A: gesti e widget; B: cornice e geometria), una sintesi e una critica di completezza in sola lettura. Il modello delle letture non è disponibile |
| Commit di partenza | `7298d4d`, con molte modifiche non committate di altri incarichi, preservate. Nessun file è stato modificato da questo piano |
| Autorizzazione | Solo il piano: nessuna modifica al codice, nessun banco, nessun tablet. Decisioni dell'utente: «ingranaggio sempre visibile», «in uso solo l'avviso», «procedi col piano» |

**Richiesta dell'utente (2026-10-21), testo fedele:**

> «altro problema: user experience dato che al singolo tap sul widget esce la parte per collegare i dispositivi al widget, e quando tocco su un widget questo si restringe, diventa scomodo e impossibile andare ad usare i widget, bisogna trovare il compromesso e prendere decisioni in base ai tap perché se io tocco un pulsante sul widget oppure tengo premuto per modificare colore luci, non me lo fa fare perché si avvia modalità di spostamento del widget, come potremmo ristrutturare le interazioni senza l'uso di pulsanti nell'interfaccia ma semplicemente con uso delle dita? Andrei anche a rimuovere in modalità di uso la barra con la sfera per le pagine, il pulsante modifica e la barra con orario, impostazioni e sincronizzato, espandiamo la griglia a tutto schermo, spostiamo il pulsante delle impostazioni in alto a destra e la barra con la pallina al centro in alto a comparsa come la bottombar con animazioni invertite (comparsa con fade dall'alto verso il basso) solo quando si tiene premuto sullo schermo per modificare le pagine, in maniera tale da avere la pagina a schermo intero con relativa griglia e quando si tiene premuto negli spazi vuoti compaiono i controlli della bottom bar e della nuova topbar»

**Risposte dell'utente.** La proposta dell'agente principale è stata accettata nella sostanza, con tre risposte: «ingranaggio sempre visibile», «in uso solo l'avviso», «procedi col piano».

## Obiettivo e perimetro

**Obiettivi:**
1. Rendere affidabili i comandi dei widget: niente più pressione lunga rubata dal launcher e niente restringimento.
2. Portare il launcher a schermo intero, con l'ingranaggio sempre visibile e le barre che compaiono solo in modifica.

**Collegamenti:** ADR-0004, ADR-0005, ADR-0007, ADR-0012 (punto 3), ADR-0013 (da superare in parte), ADR-0014, REP-20261013-001/-002, REP-20261019-002, REP-20261019-003, REP-20261020-001, REP-20261021-002 (piano parallelo della Casa 3D), ISSUE-023, ISSUE-049, ISSUE-062.

**Esclusi:** codice, test nuovi, banco, tablet, commit, deploy, il widget «Chi è in casa», la pulizia di Sistema → Barra di stato, un PIN per Sistema.

## Fatti (lettura del codice, 2026-10-21)

Percorsi relativi a `progetto/acasystem/frontend/src`.

1. **Il launcher ruba la pressione lunga.** `onPagerPointerDown` (templates/launcher/LauncherScreen.tsx:1090-1108) fa partire `useLongPress` (500 ms, tolleranza 14 px; hooks/launcher/gestures.ts:8-12) a ogni pointerdown. Esclude solo `NO_LONG_PRESS` (r.128: input, select, textarea, slider, `[data-no-long-press]`). A 500 ms, sopra un widget, scatta `liftWidget` (r.1037 e r.1086): entra in modifica, seleziona e solleva. Il click che segue viene ingoiato (`guardNextClick`, useLongPress.ts:32-42: 800 ms, ovunque).
2. **Comandi senza protezione:** pulsanti on/off e azione degli adattivi (AdaptiveCategoryWidget.tsx:234-247 e 63-75), manopola della luce non dimmerabile (BrightnessKnob.tsx:124, dove il marcatore c'è solo con `canDim`), pallino «Apri dettagli» (:435), opener a tutto widget, bersaglio «Collega». Nel codice non esiste un gesto «pressione lunga = colore della luce»: il colore si regola trascinando la manopola (BrightnessKnob.tsx:7-9).
3. **Restringimento.** `.is-pressing` riduce il widget a 0,9 anche in uso (launcher.css:545-550, token :397-400). Sullo spazio vuoto la classe `is-pressing` va sul **pager stesso** (LauncherScreen.tsx:1789 → className di Pager), che rimpicciolisce il corpo della pagina (launcher.css:401-408).
4. **Tocco, oggi.**
   - Widget classici: i dettagli si aprono dopo 280 ms, mentre il doppio tocco apre le impostazioni (WidgetHost.tsx:247-281).
   - Adattivi: i dettagli si aprono solo dal pallino (AdaptiveCategoryWidget.tsx:435-446).
   - Widget da collegare: il primo tocco apre le impostazioni (CategoryWidgetContent.tsx:146-156).
   - In modifica: il Frame è `inert` (WidgetHost.tsx:312-316) e una maniglia copre tutto il widget (r.362-399).
5. **Eccezioni allo scorrimento orizzontale.**
   - Gli impilati scorrono al proprio interno, con `overscroll-behavior-x: contain` (launcher.css:1037-1045), e sono `data-no-long-press` fuori dalla modifica (StackView.tsx:99).
   - I cursori orizzontali sono `input type=range` nativi (Slider.tsx): un trascinamento orizzontale cambia il valore.
6. **Cornice.**
   - La fascia in basso è alta 88 px sul tablet e 152 px sul telefono (appShell.css:41-49, 128-133).
   - Il pager arriva già sotto le fasce (launcher.css:53-56).
   - L'avviso di connessione è nel flusso (AppShell.tsx:26-39).
   - Sistema si apre dall'ingranaggio della StatusBar (StatusBar.tsx:130-140) e da «Accedi di nuovo» nell'avviso (LauncherPage.tsx:166-174).
   - Le celle libere sono «+» anche in uso (PageShell.tsx:33-36).
7. **Tastiera.**
   - L'indicatore (range nativo) è l'unico modo di cambiare pagina da tastiera. Le pagine fuori vista sono inerti e il pager gestisce le frecce solo per le carte della vista pagine (Pager.tsx:622-628).
   - «Modifica» è l'unico ingresso in modifica da tastiera.
   - L'etichetta «Modifica le pagine» esiste già: è il pulsante «Pagine» (EditToolbar.tsx:104).
8. **Tasto Indietro.** Non c'è gestione di popstate. Esc esce dalla modifica (LauncherScreen.tsx:~947-964). Sistema si chiude con un push (AppRoutes.tsx:47). Quindi Indietro **non** esce dalla modifica: scorre la cronologia hash.
9. **Cestino.** Quello della WidgetActionBar è un rettangolo sullo schermo controllato per geometria (useWidgetDrag.ts:243-250).
10. **Tastiera virtuale.** Nessuna gestione di `visualViewport` né di `interactive-widget` (index.html:13). Il campo per rinominare sta nella barra della vista pagine (PageOverviewBar.tsx:172).
11. **Misure reali.** Sul Tab M11 il 2026-10-14 (0.9.3) risultava «Chrome 1280×665, cella 89 px» (project-status). REP-20261019-003 ha usato anche 1280×646. ADR-0013 registra «barre di Android nascoste sul tablet a muro».
12. **Test e script legati alla cornice.**
    - Sei file di guardia contano 2.182 righe: FooterBandCache 715, StatusBarBand 451, Polish2Cornice 552, PolishCornice 318, StatusBarHidden 59, EditToolbarHidden 87. Con PagerBands e LauncherIndicatorCover si arriva a 2.639.
    - Altri test toccati: LagLayers.test.ts (r.186 e r.261-273), FixSystemIndicator, FixSystemFocus, FixSystemConnection, Casa3dExplore, SystemPage, PagerOverview e LauncherScreen.
    - e2e/m11-overview.check.mjs:63 entra in modifica con `[aria-label="Modifica"]`.
    - e2e/isolated-browser.check.mjs:144 preme «Apri dettagli».
    - La lettura B riporta 135 test su 135 per cinque guardie. In questa critica non è stato eseguito alcun test.

## Valutazioni

- **La leva giusta è invertire il default.** In uso, dentro `[data-widget-id]`, non deve partire alcun timer. Così spariscono insieme il furto della pressione lunga, il restringimento e il click ingoiato.
- **Due divergenze tra proposta e codice:**
  - per gli adattivi il tocco sul resto del widget oggi non apre i dettagli (D-3);
  - trascinare per spostare in modifica toglie il `pan-x` (D-5).
- **L'opzione A non è priva di conflitti.** Le barre sovrapposte coprono il cestino-bersaglio, le maniglie e le celle della prima e dell'ultima riga, e possono oscurare il focus (D-11).
- **Rischi principali per la persona di 65 anni:**
  - l'ingresso in modifica diventa nascosto, ma anche facile da attivare per sbaglio sui margini;
  - in modifica i comandi sono inerti e l'app sembra «bloccata»;
  - perde chip delle persone, ora e «Sincronizzato».
- **Guadagno di spazio:** c'è solo dove l'altezza limita la cella. Per il viewport reale (a muro, a schermo intero) va misurato.

## Piano

### Modello dei gesti

**Precedenza** (vince il primo):
1. ciò che è aperto sopra (fogli modali `<dialog>`, rotta della Casa 3D);
2. ingranaggio e barre visibili;
3. comandi del widget (in uso vincono sempre);
4. corpo del widget;
5. spazio vuoto;
6. scorrimento del pager.

**Cos'è un comando:** un elemento semantico (`button`, `a[href]`, `input`, `select`, ruoli `button`/`switch`/`slider`/`checkbox`/`spinbutton`) oppure un elemento marcato `data-widget-command`. Il corpo è un opener posto sotto i comandi, mai intorno a essi. Una nuova guardia di catalogo controlla che queste regole siano rispettate.

| Zona | Gesto | In uso | In modifica |
|---|---|---|---|
| Comando | Tocco | Agisce subito | Inerte: vale la riga «Corpo» |
| | Pressione lunga | Appartiene al widget, oppure non fa nulla. Niente menu di Chrome | Come «Corpo» |
| | Trascinamento | Cursori e manopole: del widget (un cursore orizzontale cambia il valore, non la pagina; D-13). Pulsanti: cambio pagina, click annullato | Come «Corpo» |
| Impilato | Scorrimento orizzontale | Widget successivo dell'impilato; **mai** cambio pagina | Come «Corpo» |
| Corpo | Tocco | Dettagli subito; nessuna apertura se il tocco ferma uno scorrimento (`pagerMoving` in comune con la Casa 3D); adattivi secondo D-3 | Seleziona; sul già selezionato apre le impostazioni (D-6) |
| | Pressione lunga | Niente (D-4) | Solleva, con vibrazione |
| | Trascinamento | Cambio pagina | Sposta (D-5). Al bordo, 72 px per 450 ms, cambia pagina. Sul cestino rimuove (D-11) |
| Da collegare | Tocco | Solo un avviso, `role=status` (deciso); testo diverso con la disposizione bloccata | «Collega», con il widget selezionato |
| Spazio vuoto (anteprima Casa 3D compresa) | Tocco | Niente (D-8). Sull'anteprima della Casa 3D: apre la casa | Toglie la selezione; sulla cella: «+» oppure «Sposta qui» |
| | Pressione lunga | Entra in modifica con le barre (D-2). Vibrazione di 10 ms. Nessun cambio di classe sul pager. Con la disposizione bloccata: la pillola esistente | Niente |
| | Scorrimento | Cambio pagina | Cambio pagina |
| Ingranaggio | Tocco | Sistema | Sistema (D-14: prima chiude la modifica?). Inerte durante il trascinamento |
| Indietro / Esc | — | Chiude ciò che è aperto sopra | Esc esce (c'è già). Indietro: **lavoro nuovo** (D-12) |

**Soglie.** Pressione lunga 500 ms con tolleranza 14 px; trascinamento da 6 px; bordo 72 px per 450 ms. Il doppio tocco esce dall'uso (D-7). Barre: 360 ms in entrata e 240 ms in uscita; con movimento ridotto, sola opacità per 120 ms.

**Riscontro.** In uso niente scala: si vede lo stato premuto del comando, senza ombre animate. La classe `is-pressing` sul pager e la scala della pagina vanno tolte entrambe. Un eventuale cerchio di attesa sotto il dito sta in uno strato fuori dal pager.

**Menu e selezione.** Sui widget in uso: `contextmenu` impedito, `user-select:none`, `-webkit-touch-callout:none`, e `draggable=false` sulle img (CameraFeed, Artwork, CarWidget).

### Cornice

- **In uso.** Griglia a tutto schermo: `--aca-shell-head` e `--aca-shell-foot` si riducono alla sola area sicura. `REFERENCE_AREAS` e i dati restano invariati.
- **Ingranaggio** (deciso dall'utente):
  - in alto a destra, bersaglio da 44 px, disco di circa 32 px, contrasto ≥ 3:1;
  - etichetta «Sistema…» con Badge, area sicura a destra;
  - presente in tutti gli stati del launcher, nascosto nella rotta della Casa 3D;
  - **sostituisce** quello della StatusBar nella stessa tappa, senza duplicato;
  - supera la decisione accettata in ADR-0013 «Sistema a sinistra».
- **In modifica.** L'indicatore scende dall'alto con una dissolvenza (in un contenitore proprio) e la EditToolbar sale dal basso. Opzione A con le correzioni di D-11: per esempio, il bersaglio del cestino si attiva solo sulla barra, oppure la barra si sposta dalla parte opposta durante il trascinamento e lascia scoperte le maniglie del widget selezionato. Si esce con «Fine», con Esc e, se D-12 lo approva, con Indietro.
- **Equivalenti da tastiera e da lettore di schermo: obbligatori nella stessa tappa.** Ingresso in modifica, pagina precedente e pagina successiva. Nome distinto da «Modifica le pagine», per esempio «Modifica la disposizione».
- **Spariscono dall'uso:** ora, «Sincronizzato», chip (D-9), «Modifica» visibile, la guardia dell'angolo comune e le attese di 180 ms.
- **Avviso di connessione:** sovrapposto in alto e lascia libero l'angolo dell'ingranaggio. È **lo stesso componente** dell'indicatore di connessione della Casa 3D a schermo intero.
- **Vista pagine:** la riserva per le barre è una variabile nella sonda di `measureCards`, non nel padding del pager (ISSUE-062).
- **Proposte da confermare:**
  - indicatore breve, circa 2 s: `pointer-events:none` e collocato lontano dai comandi, perché altrimenti un tocco su di esso finirebbe sul widget sotto;
  - pallino di problema sull'ingranaggio.

**Celle (stime, non misure).**

| Viewport | Griglia | Prima | Dopo | Nota |
|---|---|---|---|---|
| Tab M11 1280×665 (formula di `cellMetrics`) | 8×5 | 93 px | 110 px | La misura reale del 2026-10-14 era 89 px: da riconciliare |
| | 8×4 | 120 px | 139 px | |
| Tab M11 a muro, circa 1280×800 (stima a mano, da rifare con `cellMetrics`) | 8×5 | ~120 px | ~137 px | +14 % |
| | 8×4 | 139 px | 139 px | 0, limite di larghezza |
| Telefoni e M11 verticale | tutte | invariate | invariate | |

Riservare 20 px in alto all'ingranaggio costa circa 4 px di cella.

### Accessibilità

**Criteri WCAG 2.2 da riverificare sulla fonte W3C:**
- 2.1.1;
- 2.4.7;
- **2.4.11**: focus non oscurato da barre e ingranaggio; soluzione con `scroll-padding` o riserva;
- 2.5.1;
- 2.5.7;
- 2.5.8;
- 4.1.3;
- 1.4.11;
- 2.2.1: durata dell'avviso del widget da collegare, sufficiente per la lettura.

**Prove e comportamento:**
- TalkBack, da provare sul dispositivo: doppio tocco con pressione su un comando non entra mai in modifica; l'ingresso in modifica passa dagli equivalenti o da Sistema. Il focus di accessibilità non attiva `:focus-visible`: un comando invisibile resta invisibile anche quando TalkBack lo legge.
- Le barre nascoste restano `inert` e `aria-hidden`.
- Movimento ridotto: sola opacità.

### Coerenza con la Casa 3D (REP-20261021-002)

- **Anteprima nel launcher.** È spazio vuoto per la pressione lunga e si apre con un tocco. Il test di R1a «pressione lunga sull'anteprima» va allineato a D-2: la pressione lunga porterà in modifica, non nella vista pagine.
- **`pagerMoving` e `guardNextClick`.** Servono un hook comune e un test comune. La restrizione di G2 deve continuare ad assorbire il click dell'anteprima.
- **Rotta a schermo intero.** Sta fuori dalla cornice, senza ingranaggio, e condivide l'indicatore di connessione.
- **Cronologia.** Indietro in modifica (D-12) e uscita dalla casa usano la stessa cronologia hash: va progettata una volta sola.
- **Esplora.** L'uscita tramite `.aca-indicator` la toglie chi arriva per primo.
- **Sistema.** Le voci nuove («Apri la casa» e quella della modifica) toccano gli stessi test.
- **Angolo in alto a destra.** Nessun comando della pagina vi va collocato.

## Tappe

| Tappa | Contenuto | Fatto quando | Dipende da |
|---|---|---|---|
| T0 | Risposte D-2…D-16; ADR accettata (numero libero al salvataggio); annotazioni datate | Frase di accettazione citata | utente |
| G0 (nuova) | Misura di base sulla build attuale: m11-overview, scorrimento, ingresso in modifica | Numeri di confronto in verification.md | autorizzazione al banco |
| G1 | Inversione del default; niente `is-pressing` sui widget in uso; contextmenu, callout e img | Test: 600 ms su toggle adattivo, luce non dimmerabile e `__tap` senza modifica, con il click che arriva; contextmenu impedito su img; LauncherScreen r.568-735, LauncherGestures e LagLayers aggiornati | autorizzazione all'implementazione (non serve la decisione sulla cornice) |
| G2 | Tocco immediato (D-7); `guardNextClick` ristretto; `pagerMoving` comune | Test dei tempi; click non ingoiato su un altro bersaglio; anteprima della Casa ancora assorbita | G1, D-7 |
| G3 | Opener degli adattivi (D-3) e guardia dei comandi | Corpo e comando su 4 tipi; guardia di catalogo; isolated-browser aggiornato se cade il pallino | G1, D-3 |
| G4 | Avviso per il widget da collegare, con testo per tappa e variante «bloccata»; «Collega» in modifica | Test di tocco, Invio, blocco e modifica; CategoryPages | G1, testo |
| G5 | Trascinamento in modifica (D-5); tocco sul selezionato; impilati e cursori come da tabella | LauncherDragDrop, OverviewPan; test sugli impilati | D-5, D-13 |
| G6 (nuova) | Indietro esce dalla modifica (D-12), progettato insieme alla cronologia della Casa | Test delle voci di cronologia | D-12, coordinamento |
| Prova intermedia | G1-G5 sul banco e sul Tab M11 | Esiti in verification.md | autorizzazione |
| C1 | Ingranaggio spostato (senza duplicato); avviso sovrapposto e condiviso | FixSystemFocus, release.check; Sistema da ogni stato; griglia ferma con l'avviso | T0 |
| C2a | Pressione lunga sullo spazio vuoto = modifica (D-2); celle inerti (D-8); niente classe sul pager | LauncherScreen e Casa3dExplore aggiornati; LagLayers r.186 riscritto | C1 |
| C2b | Schermo intero e barre a comparsa; equivalenti da tastiera e da lettore di schermo **obbligatori**; correzioni di D-11; chip (D-9) | Guardie della geometria (area costante); test di tastiera; test cestino e maniglie con le barre; guardie della cornice riscritte; m11-overview riscritto | C2a, D-11 |
| C2c | Riserva della vista pagine; misura di ISSUE-062 confrontata con G0 | m11-overview verde e confrontato | C2b |
| C3 | Proposte confermate: indicatore breve, suggerimento, voce in Sistema, uscita per inattività | Test con timer finti | conferme |
| C4 | Pulizia di footerBand e StatusBar (refactor) | Suite completa, tsc, lint | C2c |
| V | Documenti; Tab M11 con il dito dell'utente: TalkBack, testo a 125 e 150 %, gesto «Indietro» dal bordo, tastiera virtuale, viewport a muro; profilo con adb e CDP | Esiti con i limiti | tutte |

## Criteri di completamento (del piano)

- Modello, cornice, accessibilità, tappe e bozza dell'ADR collegati al codice.
- Fatti e valutazioni separati; proposte marcate come tali.
- Nessun file modificato.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Codice dei gesti e della cornice | Lettura (A, B, sintesi, critica) | Eseguito | Righe principali ricontrollate nella critica: r.128, 1037, 1086, 1090-1107, 1789; useWidgetDrag 243-250; StackView 99; EditToolbar 104; AppRoutes 40-55 |
| Guardie della cornice | Vitest `--maxWorkers=4` (lettura B) | 135/135 | Non rieseguito nella critica |
| Celle | Calcolo | Non misurato | Discrepanza con 89 px; scenario a muro stimato a mano |
| Banco, Tab M11, TalkBack, prestazioni | — | Non eseguito | Fuori perimetro |
| WCAG, TalkBack, comportamento predefinito della tastiera virtuale in Chrome | Fonti primarie | Non verificato | Da citare solo dopo la verifica |

## Controllo del diff e decisioni

Nessun diff.

**Decisioni dell'utente:**
- ingranaggio sempre visibile;
- in uso, solo l'avviso;
- procedere con il piano.

**Proposte, non approvate:**
- D-1…D-16;
- indicatore breve;
- pallino sull'ingranaggio;
- equivalenti invisibili (la forma è proposta, l'obbligo no);
- suggerimento la prima volta;
- voce in Sistema;
- uscita per inattività;
- disposizione bloccata consigliata per il cliente.

**Al salvataggio:**
- nuove ISSUE dopo quelle prenotate da REP-20261021-001 (dalla ISSUE-105);
- ADR con il primo numero libero: ADR-0015 è proposta per «Hub e bridge» e REP-20261021-002 prenota ADR-0016.

**Conflitti da registrare:**
- ADR-0013: barre sempre visibili; «Sistema a sinistra» accettato; alternativa C scartata;
- design.md:63 e 478;
- REP-20261013-001.

## Decisioni dell'utente (2026-10-21)

**Frase dell'utente, testo fedele:**

> «ok alle proposte, approvo e procedi con G1-G2 il cliente può spostare, chi modifica tutti anche i clienti, ceh se dovessero mai spostare un divano sulla piantina non deve uscire? sei scemo?»

**Risposte registrate** (interpretazione concordata dall'agente principale):
- «approvo»: [ADR-0016](../decisions/ADR-0016-schermo-intero-interazioni.md) è **Accettata**.
- «ok alle proposte»: sono accettate tutte le risposte consigliate alle domande D-2…D-16 e alle tre finali, cioè le 14 proposte elencate in ADR-0016: pressione lunga sullo spazio vuoto = modifica con le due barre; tocco sul corpo = dettagli anche per gli adattivi e pallino tolto; pagine piene con pressione lunga sul corpo (non sui comandi) che entra in modifica senza sollevare; in modifica trascinamento immediato e cambio pagina da indicatore o bordi; tocco che seleziona, secondo tocco che apre le impostazioni, widget da collegare con un tocco su «Collega»; in uso niente «+» sulle celle vuote; chip delle persone tolti fino a ISSUE-049; indicatore visibile circa 2 s al cambio pagina; avviso di connessione solo con problema e pallino sull'ingranaggio; comandi invisibili per tastiera e TalkBack; suggerimento la prima volta e «Modifica le pagine» in Sistema; testo dell'avviso «<nome> non è ancora collegato. Tieni premuto uno spazio vuoto per modificare, poi tocca il widget.»; colore delle luci: basta che lo spostamento non parta più; ingranaggio con 20 px riservati in alto sul Tab M11.
- «procedi con G1-G2»: **autorizzata ora solo la realizzazione di G1 e G2.** G0 (misura di base), G3 e seguenti, C1-C2c e il tasto Indietro non sono autorizzati.
- La parte della frase sul cliente che sposta i mobili riguarda la Casa 3D: vedi REP-20261021-002.
- Nessun commit Git (regola dell'utente) finché non lo chiede esplicitamente.

## Realizzazione di G1 e G2 (2026-10-21)

**Richiesta e perimetro.** Sulla frase dell'utente della sezione precedente: realizzare soltanto G1 e G2, nessun commit, working tree preservato. Copie dei file modificati PRIMA in `backup/g1-g2/pre/` (escluso da Git). Ricostruito dal codice, non da affermazioni precedenti.

**Modifiche** (percorsi relativi a `progetto/acasystem/frontend/src`).

| File | Che cosa cambia |
|---|---|
| `templates/launcher/LauncherScreen.tsx` | G1: `onPagerPointerDown` esce prima del timer se il bersaglio è dentro `[data-widget-id]` (in uso e in modifica): nessun timer, nessun `is-pressing` sul widget né sul pager, nessun click da ingoiare, nessun sollevamento dall'uso. Tolti `liftWidget`, `pressedWidget` e lo stato `widgetPressing` (non raggiungibili). Lo spazio vuoto è invariato: dopo 500 ms apre ancora la vista pagine, con `is-pressing` sul pager come oggi (le barre nuove sono C2a). Nuovo `onPagerContextMenu`: in uso `contextmenu` impedito dentro un widget, tranne `input` non cursore, `textarea` e `contenteditable` (incolla). |
| `templates/launcher/WidgetHost.tsx` | G2: tolti `onPointerDownCapture`, `onClickCapture`, il timer di 280 ms e l'apertura delle impostazioni al doppio tocco in uso (D-7). Il click dell'apritore e dei comandi arriva subito, anche con la disposizione bloccata. In modifica nulla cambia (maniglia, doppio tocco in `tapWidget`, sollevamento dopo 500 ms). |
| `hooks/launcher/useLongPress.ts` | G2: `guardNextClick(press)` ingoia soltanto il click del rilascio dello stesso puntatore e bersaglio. Finisce al primo click, al pointerdown successivo di qualunque puntatore (nuovo gesto) o dopo 800 ms. Un click con `pointerId` diverso, o il cui bersaglio non contiene il bersaglio premuto (se ancora nella pagina), passa. Se il bersaglio premuto è uscito dalla pagina (la vista pagine lo ridisegna) decide il solo puntatore: l'anteprima della Casa 3D resta assorbita. |
| `hooks/launcher/gestures.ts` | Solo commenti: il doppio tocco vale in modifica; in uso il tocco agisce subito. `DOUBLE_TAP_MS` resta (280, usato da `tapWidget` in modifica). |
| `templates/launcher/launcher.css` | G1: sui widget non in modifica `user-select:none`, `-webkit-touch-callout:none`, `-webkit-user-drag:none` su `img` e `a`; i campi di testo tengono la selezione. La regola di restringimento `.is-pressing` resta per la modifica (commento aggiornato). |

**Verifica della T7 parziale (richiesta in più).** Osservazione sul codice: con il runtime dei widget presente e la pagina in Esplora, `Casa3dVista` dava `commands` all'adattatore e `createCasa3dHass.callService` inoltrava a `commands.run`, cioè alla lista chiusa di servizi di `commandPolicy.ts` e poi alla `callService` dei widget: i comandi **arrivavano a Home Assistant** (lo dimostrava `Casa3dCommands.test.tsx`). Quindi non era in sola lettura. Provvedimento, senza cancellare il lavoro: interruttore `casa3dCommandsEnabled()` in `casa3d/commandSwitch.ts`, **spento** salvo `VITE_CASA3D_COMMANDS=on` (valore esatto, letto a ogni chiamata). Spento, `callService` rifiuta con `Casa3dReadOnlyError` (come prima di T7), anche in Esplora e con `commands` presenti; `callWS` e le sottoscrizioni erano già in sola lettura. `commandPath`, `commandPolicy` e `useCasa3dCommands` sono intatti e coperti dai test. Testi coerenti con lo stato: l'etichetta della vista e il suggerimento di Esplora non promettono più «comandarlo» finché l'interruttore è spento. Si riaccende solo dopo R7 (REP-20261021-002), con prova sul banco.

**Test aggiunti o aggiornati** (Vitest, `--maxWorkers=4`).
- `LauncherScreen.test.tsx`: la pressione lunga su un widget in uso non modifica, non solleva, non restringe (pulsante, cursore, manopola senza ruolo); il click del rilascio di un pulsante arriva e vale come comando; la pressione lunga sullo spazio vuoto entra ancora nella vista pagine (test esistenti invariati); in modifica sollevamento e trascinamento invariati (test esistenti invariati). Aggiornati per decisione (D-7, G1): il tocco apre i dettagli subito, il secondo tocco non apre le impostazioni, un click sul box accanto all'apritore non apre nulla; rimossi i test del sollevamento dall'uso e dei «tocchi lenti» (la loro ragione, il widget che si restringe sotto il dito, è venuta meno).
- `LauncherGestures.test.tsx`: sette casi su `guardNextClick` (stesso bersaglio, antenato, altro bersaglio, altro puntatore, nuovo gesto, 800 ms, bersaglio uscito dalla pagina) e la regola CSS.
- `Casa3dHaShim.test.ts`, `Casa3dCommands.test.tsx`: i test delle barriere accendono l'interruttore con `vi.stubEnv`; nuovi test con l'interruttore spento (nessun comando arriva alla `callService` dell'app, in Esplora e con barriera aperta; solo il valore `on` lo accende; etichetta e suggerimento onesti).
- Controllo che i nuovi test falliscano sul codice di prima: con `LauncherScreen.tsx`, `WidgetHost.tsx` e `useLongPress.ts` ripristinati dalle copie, 7 dei test nuovi o aggiornati falliscono (pulsante, manopola, pressione lunga su widget, tocco immediato, secondo tocco, ridisegno); il caso del cursore passava già (il cursore è escluso da `NO_LONG_PRESS`).

**Esiti** (dettagli in [verification.md](../verification.md), sezione del 2026-10-21 «Interazioni G1-G2»): 29 file e 646 test verdi nelle aree toccate; `tsc -p tsconfig.strict.json --noEmit`, `eslint` sui sorgenti toccati, `lint:typography` e `lint:theme-colors` senza violazioni.

**Questioni residue.**
- **Non eseguiti:** banco, Tab M11, TalkBack, misura di base (G0), suite completa, `e2e`. Il gesto reale (pressione lunga su un pulsante, un cursore, una manopola della luce) va provato sul Tab M11 con il dito.
- **`pagerMoving` comune** (terza voce di G2 nella tabella delle tappe): **non fatto**, non compreso nell'incarico ricevuto. Resta da fare con la Casa 3D (nessuna apertura se il tocco ferma uno scorrimento).
- **`e2e/isolated-browser.check.mjs`** (r.126) apre le impostazioni con un doppio clic su «Apri dettagli»: con D-7 non succede più, lo script va aggiornato (le impostazioni si aprono in modifica) prima del prossimo uso. Non eseguito né modificato qui.
- **Documenti da aggiornare nelle tappe seguenti (non toccati):** `documentazione/design/design.md` (pressione lunga sul widget e restringimento), ADR-0007/ADR-0012 dove citano il sollevamento dall'uso, e `product.md` se descrive il doppio tocco in uso.
- **Pagine piene** (D-4): la pressione lunga sul corpo che entra in modifica senza sollevare è G5/C2a, non fatta; per ora un widget di una pagina piena in uso non reagisce alla pressione lunga.
- **Colore della luce** (decisione registrata: basta che lo spostamento non parta più): ora una pressione lunga su manopola o cursore non parte più come spostamento; non esiste un gesto «pressione lunga = colore» e non è stato aggiunto.

## G1-G2 — esito (2026-10-21)

**Modifiche.** Quelle della sezione «Realizzazione di G1 e G2»: nessuna pressione lunga su un widget in uso (niente timer, restringimento, sollevamento, menu del browser, selezione), tocco immediato senza doppio tocco, `guardNextClick` ristretto al click del rilascio dello stesso puntatore e bersaglio; in più l'interruttore `casa3dCommandsEnabled()` che tiene la Casa 3D in sola lettura (spento salvo `VITE_CASA3D_COMMANDS=on`). Nessun commit; working tree preservato.

**Verifiche** (dettagli in [verification.md](../verification.md), «Interazioni G1-G2 — esito»).

| Controllo | Esito |
|---|---|
| Suite completa del frontend (`vitest run --maxWorkers=4`) | 179 file e 2493 test verdi (526 s; uscita in `backup/g1-g2/suite-1.txt`) |
| `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check` | Verdi (492 e 334 file; i18n 4 test su 4) |
| `build` del frontend e `check-bundle-size` | Riusciti; indice 803,5 KB su 900 KB |
| Backend (`--maxWorkers=4`) | 21 file e 200 test verdi |
| `casa3d`: test e build | 440 test verdi; 6 bundle, 2042,8 KB; il bundle 3D è a 780,0 KB su 780 KB di budget, esattamente sul limite |

**Banco e Tab M11.** Banco `aca-system:0.9.20` (`docker compose up -d --build` riuscito) su `192.168.1.7:3002`: IPv4 Wi-Fi del PC uguale al binding di `progetto/compose.tunet.yaml`, nessuna modifica. Copia a freddo PRIMA `backup/banco/tunet-data-g1g2-pre-0.9.20-freddo.tgz` (413346 byte, SHA-256 `1a3453c57d1793b0f7b80cf2e24b1e8eb18852ea0ef39de60186a831991823a2`, `tar -tzf` 4 voci: `.`, `tunet.db`, `-wal`, `-shm`). Versione `ACASYSTEM_VERSION=0.9.20` in `progetto/.env`, `e2e/isolated-server.mjs`, `e2e/release.check.mjs` e README degli e2e. Container `aca-tunet-tunet-1` `healthy`; `/api/health` `{"status":"ok","version":"0.9.20"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`. **Ripristino:** `ACASYSTEM_VERSION=0.9.19` in `progetto/.env`, poi la copia a freddo.

Sul Tab M11 (Chrome, tablet sbloccato; `adb reverse` 3002 e forward CDP 9225; ricarica senza service worker né cache, bundle `index-15vfPgxq.js` con 0.9.20): pressione lunga di 800 ms sul corpo di Orologio, Calendario e Meteo (adattivi) e di 5 widget non collegati, più il pulsante «Chiudi Tapparella» non collegato: nessuna modifica, nessun `is-pressing`, nessuno spostamento, nessun avviso, rettangolo invariato (397×397 sull'orologio). Con «Modifica» il widget Luce non collegato è stato selezionato, sollevato e trascinato (y da 25 a 81) ed è tornato in 1061,25 senza cambi di layout. `localStorage` del launcher (35 chiavi, token escluso) salvato prima e identico dopo; ritorno alla pagina Principale con `#/`.

**Rilievo da chiarire.** Sul tablet la pressione lunga sullo **spazio vuoto** (700,450) porta nella panoramica pagine (`pager is-overview`, con barra pagine e «Fine»; ordine delle pagine invariato), non nella barra widget di «Modifica». È il comportamento di prima (G1 non lo cambia): la decisione 1 del piano («pressione lunga sullo spazio vuoto = modifica con le due barre») è della tappa C2a, non autorizzata, e la dicitura va letta così finché C2a non esiste.

**Limiti.** Non provati: tocco immediato e secondo tocco sul dispositivo (la prova sul banco ha riguardato la pressione lunga e il trascinamento in modifica); pressione lunga su cursore e manopola della luce con il dito; TalkBack; misura di base G0; `e2e` (`isolated-browser.check.mjs` r.126 va aggiornato). `pagerMoving` comune non fatto. Nessun comando a impianti reali, nessuna credenziale. `design.md`, ADR-0007/ADR-0012 e `product.md` citano ancora il sollevamento dall'uso o il doppio tocco: da aggiornare nelle tappe seguenti.

**Punto di ripresa.** Prossime: G3-G5 e C1-C4 (barre nuove, opener degli adattivi, avviso «Collega», pagine piene), oppure la Casa 3D da R1, ciascuna solo su autorizzazione dell'utente. Per tornare indietro: `ACASYSTEM_VERSION=0.9.19` e la copia PRIMA.

## G3-G5 — realizzazione (2026-10-21)

**Richiesta e perimetro.** Frase dell'utente del 2026-10-21: «vai, procedi con G3-G5 e C1-C3». Questo passo realizza **soltanto G3, G4 e G5** (opener dei dettagli, widget da collegare, trascinamento e tocchi in modifica, pressione lunga nelle pagine piene); C1-C3 e C4 non sono compresi qui. Nessun commit Git, working tree preservato, nessuna dipendenza nuova. Copie PRIMA dei file modificati in `backup/g3-c3/pre/` (escluso da Git). Eseguito da un agente leggero su incarico dell'agente principale; il nome esatto del modello non è disponibile.

**Modifiche** (percorsi relativi a `progetto/acasystem/frontend/src`).

| Tappa | File | Che cosa cambia |
|---|---|---|
| G3 | `components/widgets/adaptive/AdaptiveCategoryWidget.tsx`, `adaptiveWidget.css` | Il pallino «Apri dettagli» è tolto: l'apritore è un `button` trasparente `data-widget-open`, primo figlio, su tutto il widget e **sotto** i comandi (nome accessibile «Apri dettagli», spento in modifica). Il resto del widget sta sopra (`z-index:1`, `pointer-events:none`); i comandi (elementi semantici, ruoli button/switch/slider/checkbox/spinbutton, `[data-widget-command]`) riprendono il tocco. Il livello `controls-wrap` della taglia «pagina» tiene il tocco per scorrere. Tolta la riserva a destra dei widget compatti (serviva al pallino). |
| G3 | `__tests__/WidgetCommands.test.tsx` (nuovo) | Guardia di catalogo: i 20 tipi adattivi (fixture `adaptiveFixtureSettings`) hanno un solo apritore trasparente, senza figli, primo nell'albero, che non contiene né è contenuto in un comando; corpo e comando su 4 tipi (luce, clima, tapparella, multimedia); regole CSS di stratificazione; scansione dei sorgenti di `components/widgets` (oltre 500 tag): un `div`/`span` con un gestore di tocco deve essere `data-widget-command`, avere un `role` o essere un cuscinetto `onClick={stop}`. |
| G3 | `e2e/isolated-browser.check.mjs` | Il doppio clic su «Apri dettagli» (che non apre più le impostazioni) è sostituito da «Modifica», tocco e secondo tocco sulla maniglia, poi Esc. **Non eseguito.** |
| G4 | `templates/launcher/CategoryWidgetContent.tsx`, `StackView.tsx`, `WidgetHost.tsx` | Il bersaglio a tutta tessera del widget da collegare non apre più le impostazioni: chiama `onUnboundTap`. Nome accessibile «<tipo>, non collegato» (era «Collega <tipo>»). |
| G4 | `templates/launcher/LauncherScreen.tsx`, `LauncherUiContext.tsx`, `utils/launcher/names.ts` | `noticeUnbound(nome)` mostra nella pillola (`role=status`, 5 s) «<nome> non è ancora collegato. Tieni premuto uno spazio vuoto per modificare, poi tocca il widget.»; con la disposizione bloccata: «<nome> non è ancora collegato. La disposizione è bloccata: si sblocca in Sistema, Schermata Home.» (testo scelto da chi ha eseguito, non dettato dall'utente). Una rimozione ancora annullabile tiene la sua pillola e l'avviso è solo letto ad alta voce. In modifica `tapWidget` su un widget da collegare lo seleziona e apre subito le impostazioni («Collega»). |
| G4 | `templates/sheets/categoryPages.ts`, `CategoryPageSheet.tsx` | `isCategoryWidgetUnbound`; il suggerimento del foglio dice «Collega i dispositivi in modifica: tieni premuto uno spazio vuoto, poi tocca il widget.» |
| G5 | `templates/launcher/WidgetHost.tsx`, `launcher.css`, `hooks/launcher/gestures.ts` | In modifica il dito sul widget lo sposta subito, selezionato o no (tolto `holdMs`; resta dopo 6 px); la maniglia ha sempre `touch-action:none` (era `pan-x` finché non selezionata). Tolto `DOUBLE_TAP_MS`. |
| G5 | `templates/launcher/LauncherScreen.tsx` | `tapWidget`: un tocco seleziona, un secondo tocco sul widget selezionato apre le impostazioni, senza limite di tempo. Pressione lunga sul corpo di un widget (mai su un comando) in una pagina senza celle vuote (i widget visibili coprono la griglia): `enterEditMode()` senza sollevare né selezionare; il click del rilascio è ingoiato; né il widget né la pagina si restringono. Con la disposizione bloccata: la pillola esistente. Gli impilati (`data-no-long-press`) e i cursori restano esclusi. Il testo letto all'ingresso in modifica non cita più il doppio tocco. |

**Test aggiunti o aggiornati** (Vitest, `--maxWorkers=4`).
- `WidgetCommands.test.tsx` (29 test, nuovo), `LauncherScreen.test.tsx`, `CategoryPages.test.tsx`, `LauncherGestures.test.tsx`.
- Aggiornati per decisione (ADR-0016): la maniglia non aspetta più un secondo; il tocco seleziona e il secondo tocco apre le impostazioni a qualunque distanza di tempo (anche sulla cornice di ridimensionamento e sulle pile); il tocco sul widget da collegare mostra solo l'avviso.
- Nuovi: avviso in uso, variante bloccata, pillola di rimozione conservata, «Collega» in modifica con un tocco; trascinamento immediato (3 px non è un trascinamento, 1,5 s di pressione ferma non fa nulla); pressione lunga sul corpo nelle pagine piene (entra in modifica senza sollevare né selezionare, il click è ingoiato, comandi esclusi, scorrimento che annulla, pagina con cella vuota e home esclusi, disposizione bloccata).
- Controllo che i test vedano il difetto: con gli otto file sorgente di G3-G5 ripristinati dalle copie PRIMA, 46 test falliscono (guardia sui 19 tipi, avviso, «Collega», trascinamento, pagine piene, CSS); poi i file sono stati rimessi e sono identici (`cmp`).

**Esiti** (dettagli in [verification.md](../verification.md), «Interazioni G3-G5»): `tsc -p tsconfig.strict.json --noEmit`, `eslint src`, `lint:typography` (502 file) e `lint:theme-colors` (335 file) senza violazioni; suite completa del frontend `vitest run --maxWorkers=4`: 182 file e 2567 test verdi (553 s; uscita in `backup/g3-c3/suite-1.txt`).

**Questioni residue.**
- **Non eseguiti:** banco, Tab M11, TalkBack, `e2e`, copia a freddo (nessun banco è stato toccato in questo passo, quindi nessuna copia era dovuta). I gesti vanno provati col dito: tocco sul corpo di un adattivo e su un comando vicino, trascinamento immediato in modifica, secondo tocco, pressione lunga in una pagina piena.
- **Resti del sollevamento con attesa:** `pressing`, `LauncherPressContext` e `holdMs` di `useWidgetDrag` restano ma nessuno li attiva più dal launcher; la pulizia è di C4 (fuori incarico).
- **Pagine piene:** la pressione lunga sul corpo entra in modifica con la barra attuale, non ancora con le due barre di C2; i widget nascosti non contano come occupati. Nelle pagine con celle vuote la pressione lunga su un widget in uso non fa nulla (come dopo G1).
- **Avviso:** nelle pagine piene non esiste «uno spazio vuoto»: il testo dato dall'utente resta com'è.
- **Documenti non toccati:** `design.md`, ADR-0007/ADR-0012, `product.md`, `e2e/m11-overview.check.mjs` (usa «Modifica»). Il tasto Indietro e C1-C4 restano fuori da questo passo.

**Punto di ripresa.** Prova col dito sul Tab M11 di G3-G5; poi C1-C3 (ingranaggio, barre a comparsa, indicatore breve) e, a parte, C4.

## C1-C3 — realizzazione (2026-10-21)

**Richiesta e perimetro.** Stessa frase dell'utente del 2026-10-21: «vai, procedi con G3-G5 e C1-C3». Dopo G3-G5, questo passo realizza **C1, C2 e C3** secondo il piano e le decisioni dell'utente (ingranaggio sempre visibile, piccolo e discreto, con circa 20 px riservati in alto sul Tab M11; in uso spariscono barra in basso, indicatore e chip; la pressione lunga sullo spazio vuoto entra in modifica con le due barre; indicatore visibile circa 2 s a ogni cambio pagina; comandi invisibili per tastiera e lettori di schermo; suggerimento la prima volta; voce «Modifica le pagine» in Sistema). **Fuori perimetro e non toccati:** C4 (pulizia di `footerBand`, `StatusBar` e delle regole vecchie), il tasto Indietro che esce dalla modifica, la Casa 3D oltre la coerenza, l'uscita dalla modifica per inattività. Nessun commit Git, working tree preservato, nessuna dipendenza nuova. Copie PRIMA in `backup/g3-c3/pre/c1c3/` (stessa struttura del frontend; le copie PRIMA di G3-G5 restano in `backup/g3-c3/pre/`). Eseguito da un agente leggero su incarico dell'agente principale; il nome esatto del modello non è disponibile.

**Modifiche** (percorsi relativi a `progetto/acasystem/frontend/src`).

| Tappa | File | Che cosa cambia |
|---|---|---|
| C1 | `components/system/status-bar/SystemGear.tsx` (nuovo) | L'ingranaggio di Sistema, con `IconAction` e l'icona di mx-icons: nome «Sistema», più lungo con un pallino (rosso per un problema di connessione, blu per gli aggiornamenti: `Badge`). Inerte mentre un widget è trascinato. |
| C1, C2 | `templates/app-shell/AppShell.tsx`, `appShell.css` | La cornice è a schermo intero: ingranaggio, barra in alto, comandi senza viso, avviso di connessione e barre in basso sono sovrapposti alle pagine. `--aca-shell-head` è l'area sicura più `--aca-gear-room` (20 px solo con larghezza da 60rem in orizzontale, cioè sul Tab M11), `--aca-shell-foot` la sola area sicura in basso. La fascia delle barre (`--aca-bars-foot`) è assoluta, a una riga a ogni larghezza e di altezza costante; la riserva della vista pagine è `--aca-overview-foot`. L'avviso di connessione è assoluto, lascia libero l'angolo dell'ingranaggio e non sposta la griglia. Sotto 40rem la barra in alto toglie spazio solo a destra e la sfera dell'indicatore scende a 24 px. |
| C2 | `templates/launcher/LauncherScreen.tsx` | Tolta la `StatusBar` dal launcher e con lei «Modifica», ora, «Sincronizzato», chip e la guardia dell'angolo comune. La pressione lunga sullo spazio vuoto (o sul corpo di un widget in una pagina piena) chiama `enterEditMode()`: nessuna classe `is-pressing` sul pager, nessuna vista pagine (che resta su «Pagine»). In modifica la pressione lunga non fa nulla. L'indicatore è la barra in alto: attivo in modifica (anche con un widget selezionato), «passivo» (senza tocco e senza lettura) per circa 2 s a ogni cambio pagina fuori dalla modifica. Il bersaglio del cestino è la barra stessa (4 px sopra la sua riga, 8 px ai lati). |
| C2 | `components/system/page-indicator/PageIndicator.tsx`, `pageIndicator.css`, `hooks/launcher/usePageFlash.ts` (nuovo) | L'indicatore ha gli stati `hidden` (sopra lo schermo, dissolvenza dall'alto) e `passive`; il gancio dà il cenno di 2 s. |
| C2 | `templates/launcher/launcher.css`, `Pager.tsx` | La vista pagine tiene la riserva della barra in basso come variabile (`--aca-overview-foot`, `--aca-card-offset`) e nella sonda di `measureCards`: le carte restano dove stavano. |
| C2 | `components/system/edit/edit.css`, `EditToolbar.tsx` (commenti) | La barra in basso non aspetta più la barra di stato (tolte le attese di 180 e 220 ms); la pillola «Annulla» sta sopra la fascia delle barre. |
| C2 | `utils/launcher/pageDescriptor.ts` | Le pagine di widget hanno le celle con «+» solo in modifica (`addCells: 'edit-only'`); in uso sono pozzetti senza bottone. |
| C3 | `components/system/launcher/ScreenCommands.tsx` (nuovo) | «Modifica la disposizione», «Pagina precedente», «Pagina successiva»: nel gruppo «Comandi della schermata», primo nell'ordine di tabulazione, invisibili finché uno ha il fuoco da tastiera (`:has(:focus-visible)`), inerti in modifica e nella vista pagine. «Fine» riporta il fuoco su «Modifica la disposizione». |
| C3 | `components/system/edit/EditHint.tsx`, `hooks/launcher/useEditHint.ts` (nuovi) | Il suggerimento «Tieni premuto uno spazio vuoto per modificare le pagine.» con «Ho capito»: una volta per dispositivo (chiave `aca_edit_hint_seen`), 1,5 s dopo l'avvio, scompare da solo dopo 12 s, entrando in modifica, con la disposizione bloccata o con un'altra pillola. Non è una regione `live`. |
| C3 | `pages/system/sections/HomeScreenSection.tsx`, `SystemPage.tsx` | In Sistema → Schermata Home la voce «Modifica le pagine»: chiude Sistema e porta il launcher in modifica; disattivata con la disposizione bloccata; assente se Sistema non è dentro il launcher. |
| Script | `e2e/m11-overview.check.mjs`, `e2e/isolated-browser.check.mjs` | Entrano in modifica da «Modifica la disposizione». **Non eseguiti.** |

**Test aggiunti o riscritti** (Vitest, `--maxWorkers=4`).
- Nuovo `FrameGearCommands.test.tsx` (15 test): ingranaggio, comandi senza viso, indicatore passivo, `usePageFlash`, `useEditHint` (compresa la memoria bloccata), suggerimento.
- `LauncherScreen.test.tsx` (da 110 a 115 test): la pressione lunga entra in modifica e non nella vista pagine, nessuna classe sul pager; ingranaggio in ogni stato; comandi con la pagina detta a voce; cenno dell'indicatore per 2 s; suggerimento (una volta, chiuso, uscita in modifica, mai con la disposizione bloccata); il cestino è la barra. Le prove della vista pagine passano da «Pagine»; riscritte per decisione quelle sulla barra di stato e sull'angolo comune.
- `SystemPage.test.tsx` (+3): la voce «Modifica le pagine» di Sistema.
- Aggiornati per decisione: `PagerBands`, `PagerOverview`, `Polish2Cornice`, `PolishCornice`, `StatusBarBand` (la barra di stato non è più nella cornice), `FixLauncherUiShell`, `PageDescriptor`, `PolishLauncherScreen`, `Polish2LauncherScreen`, `Polish2LauncherPreview`, `LauncherCoverGrid`, `LauncherColumns` (celle con «+» solo in modifica; indicatore che aspetta sopra lo schermo; cornice senza fascia dell'indicatore).

**Esiti** (dettagli in [verification.md](../verification.md), «Interazioni C1-C3»): suite completa del frontend 183 file e 2588 test verdi (879 s; uscita in `backup/g3-c3/c-suite-2.txt`); `tsc`, `eslint`, `lint:typography` e `lint:theme-colors` senza violazioni.

**Prova sul PC** (un solo Chromium headless con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, anteprima `launcher.html` con le fixture, nessun Home Assistant, 1280×665 e 390×844; script e schermate in `backup/g3-c3/shots/`). A 1280×665: nessuna barra di stato, ingranaggio a (1232, 4) di 44×44 con il nome «Sistema, 1 aggiornamento disponibile», riserva alta di 20 px, griglia 1219×594 a (31, 46), **identica in uso e in modifica**; la pressione lunga di 750 ms sullo spazio vuoto (a 250 ms ancora nulla, pager senza classe) entra in modifica con indicatore e barra in basso; «Pagine» apre la vista pagine con la barra a 601 px e la carta centrale a 100-525 px; «Fine» riporta il fuoco su «Modifica la disposizione»; il primo Tab porta il fuoco sui comandi che compaiono in alto a sinistra; un cambio pagina mostra l'indicatore «passivo» e dopo 3 s è di nuovo sopra lo schermo. A 390×844 gli stessi esiti; l'indicatore di 13 pagine sta tra il bordo e l'ingranaggio. Nessun errore di pagina.

**Questioni residue.**
- **Non eseguiti:** banco, copia a freddo (nessun banco è stato toccato), Tab M11, TalkBack, `e2e`. Vanno provati col dito: la pressione lunga sullo spazio vuoto e sul corpo di un widget in una pagina piena, il cenno dell'indicatore, il gesto sul cestino con la barra sopra l'ultima riga, l'ingranaggio nell'angolo, il suggerimento. I numeri della cella sul Tab M11 (stime del piano) non sono stati misurati.
- **Scelte mie, non dettate dall'utente:** il testo del suggerimento («…per modificare le pagine.», dal testo dell'utente «Tieni premuto uno spazio vuoto…») e il pulsante «Ho capito»; il nome «Modifica la disposizione» (proposto dal piano); il testo della voce di Sistema; i tempi (1,5 s, 12 s, 2 s); il pallino rosso per `reconnecting` ed `error`.
- **D-11 solo in parte:** il bersaglio del cestino è ristretto alla barra, ma le barre coprono ancora le celle dell'ultima riga e, in modifica, circa 30 px della prima sotto l'indicatore; le maniglie inferiori del widget selezionato nell'ultima riga possono stare sotto la barra. Se la prova col dito lo conferma, serve l'opzione C o la barra dalla parte opposta durante il trascinamento.
- **C4 (fuori incarico):** restano `StatusBar` (componente e `statusBar.css`), `footerBand` per il solo uso con la barra di modifica, `useNow`, `chips` calcolati ma non mostrati, `pressing`/`LauncherPressContext`/`holdMs`, le attese e le guardie vecchie nei test (`StatusBarBand`, `FooterBandCache`).
- **Documenti non aggiornati:** `design.md`, ADR-0007/ADR-0012 e `product.md` descrivono ancora la barra di stato, l'indicatore e la vista pagine dalla pressione lunga; `e2e/README.md` cita le celle «+» in uso.
- Il tasto Indietro, l'uscita per inattività e la pressione lunga per il colore delle luci non sono stati fatti (il piano non li comprende o l'utente non li ha chiesti).

**Punto di ripresa.** Prova col dito sul Tab M11 di G3-G5 e C1-C3 (pressione lunga, ingranaggio, cestino, indicatore, suggerimento, TalkBack); poi, a parte, C4 e l'aggiornamento di `design.md`, ADR-0007/ADR-0012 e `product.md`.

## G3-G5 e C1-C3 — esito (2026-10-21)

Frase dell'utente del 2026-10-21: «vai, procedi con G3-G5 e C1-C3». Questa sezione riassume l'esito complessivo; i dettagli delle modifiche sono in «G3-G5 — realizzazione» e «C1-C3 — realizzazione». Nessun commit Git, working tree preservato, nessuna dipendenza nuova. Realizzazione affidata ad agenti leggeri su incarico dell'agente principale (come chiesto dall'utente, che accetta di correggere dopo la sua prova); il nome esatto dei modelli non è disponibile.

**Modifiche.** G3: il pallino «Apri dettagli» degli adattivi è tolto, l'apritore trasparente copre il widget sotto i comandi. G4: in uso un tocco su un widget da collegare mostra solo l'avviso; in modifica apre subito «Collega». G5: in modifica il dito sposta subito il widget, un tocco seleziona e il secondo tocco apre le impostazioni, la pressione lunga sul corpo di un widget nelle pagine piene entra in modifica. C1: ingranaggio di Sistema sempre visibile in alto a destra (20 px riservati sul Tab M11). C2: cornice a schermo intero, barre solo in modifica dopo la pressione lunga sullo spazio vuoto, indicatore visibile circa 2 s a ogni cambio pagina, celle senza «+» in uso. C3: comandi senza viso, suggerimento la prima volta, voce «Modifica le pagine» in Sistema.

**Revisione.** Una revisione in sola lettura ha dato 2 rilievi medi e 6 bassi, trattati in un passo di correzione (copie PRIMA in `backup/g3-c3/pre/fix/`):
- **Corretti (medio):** il tocco sul corpo degli adattivi apriva i dettagli anche mentre il pager era tra due pagine; `pagerMoving` è ora comune (`utils/launcher/pagerMoving.ts`) e usato anche dagli adattivi, con un test. Lo script `e2e/isolated-browser.check.mjs` entrava in modifica con un clic su un comando senza viso e senza puntatore; ora usa fuoco e Invio.
- **Corretti (bassi):** `FixSystemFocus.test.tsx` verifica il vero `SystemGear`; `LagLayers.test.ts` non controlla più la classe `is-pressing` (le regole CSS morte restano per C4); il pallino rosso dell'ingranaggio vale solo per la fase `error`, quando l'avviso è visibile; entrando in modifica da Sistema il lettore di schermo legge lo stesso testo dell'ingresso normale; l'avviso «non ancora collegato» ha, per chi non usa il puntatore (tastiera, lettore di schermo), una variante che nomina «Modifica la disposizione» e «Modifica le pagine» in Sistema; il cenno dell'indicatore passa nel componente `FlashingPageIndicator`, così il timer non ridisegna tutto `LauncherScreen`.
- **Non applicati:** il cestino geometrico sotto la barra in basso (D-11) richiede la prova col dito e una scelta di design; il nome accessibile «Modifica le pagine» del pulsante «Pagine» della barra di modifica coincide con la voce di Sistema (due schermate diverse): la scelta spetta all'utente. Nessun test automatico per l'annuncio al rientro da Sistema.

**Verifiche** (dettagli in [verification.md](../verification.md), «Interazioni G3-G5 e C1-C3 — esito»).

| Controllo | Esito |
|---|---|
| Frontend: `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check` | Superati |
| Frontend: `vitest run --maxWorkers=4`, suite completa | 183 file e 2591 test verdi (circa 559 s; uscita in `backup/g3-c3/suite-1.txt`) |
| Frontend: `build` e `check-bundle-size` | Superati |
| Backend (`--maxWorkers=4`) | 21 file e 202 test verdi |
| `casa3d`: test e build | 440 test verdi; 6 bundle entro budget, 2042,8 KB |
| Prova headless sul PC (un Chromium, 1280×665 e 390×844) | Superata prima della revisione (vedi «C1-C3 — realizzazione») |
| `e2e` (`isolated-browser.check.mjs`, `m11-overview.check.mjs`) | **Non rieseguiti** |

**Banco 0.9.22 e Tab M11.** Banco `aca-system:0.9.22` (container `aca-tunet-tunet-1`, `docker compose up -d --build`) su `192.168.1.7:3002`: IPv4 Wi-Fi del PC uguale al binding di `progetto/compose.tunet.yaml`, nessuna modifica. Copia a freddo PRIMA `backup/banco/tunet-data-g3c3-pre-0.9.22-freddo.tgz` (414866 byte, SHA-256 `4a238c93cf1007b28884068a2c156c47287cbe746be1627fce00d576ce69a2d4`, `tar -tzf` 4 voci, eseguita con il container fermo). Container `healthy`, `/api/health` `{"status":"ok","version":"0.9.22"}`, `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`. **Ripristino:** `ACASYSTEM_VERSION=0.9.21` in `progetto/.env` più la copia a freddo.

Sul Tab M11 (HA2KZKYB, Chrome; ricarica senza service worker né cache; `adb reverse` 3002, CDP 9225 poi rimosso) le 34 chiavi di `localStorage` (senza token né sfondo) sono state salvate in `backup/g3-c3/tablet/localstorage-pre.json`; dopo le prove sono stati ripristinati `tunet_launcher_layout` e `tunet_pages_config` e rimosso `aca_edit_hint_seen`, così il suggerimento si rivede la prima volta. Esiti (schermate in `backup/g3-c3/tablet/`):
- **Provato e riuscito:** uso a schermo intero senza barre, con solo l'ingranaggio e il suggerimento; celle vuote senza «+»; l'indicatore compare a ogni cambio pagina e sparisce da solo; in uso il tocco su un widget da collegare (Stanza, Calendario, Costi energetici) mostra solo l'avviso; la pressione lunga sullo spazio vuoto entra in modifica con la barra in alto e quella in basso; in modifica il trascinamento di «Luce» parte subito; un tocco su un widget da collegare apre subito le impostazioni («Dispositivo da collegare: Non collegato»); «Pagine» apre la vista pagine e «Fine» esce; l'ingranaggio porta a Sistema (0.9.22) e «Torna al launcher» riporta alla home.
- **Non verificato:** il tocco sul corpo di un widget collegato che apre i dettagli e il doppio tocco selezione/impostazioni su un widget collegato (nessun widget del banco è collegato e non si comandano impianti reali; Orologio e Data non aprono dettagli); la pressione lunga nelle pagine piene; TalkBack; lo script `e2e`.
- **Rilievi:** (1) con l'indicatore delle pagine acceso (per esempio in modifica) il titolo della pagina «Luci e comandi» si sovrappone ai chip «Da collegare» dei widget in alto (ISSUE-105). (2) In modifica «Annulla» appare grigio dopo un trascinamento e non ha riportato indietro lo spostamento (ISSUE-106). (3) Misura rapida della vista pagine (`measure.cjs` adattato in `backup/g3-c3/measure-g3.cjs`, risultati in `backup/g3-c3/tablet/measure-0.9.22.txt`, due giri): il display del tablet è ora a 90 Hz, quindi gli fps non sono confrontabili con la 0.9.18; apertura 46,9-47,6 fps con picchi di 411-412 ms (0.9.18: 57,9-60,0 fps, 300-322 ms), chiusura 55,7-57,4 fps con picchi di 278 ms (0.9.18: 222-256 ms), ingresso in modifica 88-89 fps, uscita 90 fps, scorrimento tra le pagine 81-85 fps (ISSUE-107; ISSUE-062 resta aperto).

**Limiti.** Non provati col dito: tocco sul corpo di un adattivo collegato, doppio tocco, pressione lunga nelle pagine piene, cestino sotto la barra (D-11), TalkBack, colore delle luci. `e2e` non rieseguiti. `design.md` è aggiornato con la cornice a schermo intero; ADR-0007/ADR-0012, `product.md` ed `e2e/README.md` descrivono ancora la barra di stato e il vecchio gesto. Scelte esecutive non dettate dall'utente: i testi del suggerimento («Ho capito») e della variante dell'avviso con la disposizione bloccata, il nome «Modifica la disposizione», i tempi (1,5 s, 12 s, 2 s), il pallino rosso per la sola fase `error`.

**Punto di ripresa.** Prova dell'utente col dito sul banco 0.9.22; poi correzioni dei rilievi (ISSUE-105, ISSUE-106, ISSUE-107). Prossime, solo su autorizzazione: C4 (pulizia di `StatusBar`, `footerBand`, `chips`, `LauncherPressContext`, `holdMs`), il tasto Indietro che esce dalla modifica, poi la Casa 3D R2. Per tornare indietro: `ACASYSTEM_VERSION=0.9.21` e la copia PRIMA.

## Ripristino 0.9.23 — D-2 e D-8 rovesciate (2026-10-21)

**Richiesta (testo fedele).** Dopo la prova sul tablet l'utente ha scritto: «sono scomparsi i + e non funziona più l'animazione che tenendo premuto mi apre le pagine, c'è stata una regressione importante». Le due cose vengono dalle proposte D-2 e D-8, accettate in blocco con «ok alle proposte» ma contrarie alla descrizione originale dell'utente («la barra con la pallina al centro in alto a comparsa come la bottombar con animazioni invertite (comparsa con fade dall'alto verso il basso) solo quando si tiene premuto sullo schermo per modificare le pagine»). La nuova richiesta prevale: D-2 e D-8 sono rovesciate (annotazione in ADR-0016). **Perimetro:** solo il ripristino; nessun commit, nessun deploy, nessuna dipendenza nuova, nessun comando a impianti. Ingranaggio, schermo intero senza barre in uso, avviso dei widget da collegare, trascinamento immediato in modifica, comandi invisibili e il resto di G3-G5 e C1-C3 restano. Riferimento: la 0.9.21 (copie in `backup/g3-c3/pre/` e `backup/g1-g2/pre/`). Copie PRIMA dei file modificati in `backup/ripristino-0.9.23/pre/src/`. Il lavoro è stato ripreso da un passaggio precedente interrotto: i file già modificati sono stati riletti e verificati, non dati per buoni.

**Criteri di completamento.** (1) Pressione lunga sullo spazio vuoto: la pagina si restringe (`is-pressing`) e al termine si apre la vista pagine, non la modifica; un widget in uso fuori dalle pagine piene non fa partire nulla. (2) Nella vista pagine la barra con la pallina compare in alto al centro con dissolvenza dall'alto verso il basso, senza coprire le schede. (3) «+» sulle celle vuote in uso, con la stessa azione al tocco; scorrimento orizzontale e pressione lunga sulle celle invariati. (4) La modifica dei widget resta raggiungibile; testi aggiornati. (5) Test di guardia riportati ai valori della 0.9.21 e test di regressione nuovi; controlli statici verdi; prova headless.

| File (percorsi relativi a `progetto/acasystem/frontend/src`) | Che cosa cambia |
|---|---|
| `templates/launcher/LauncherScreen.tsx` | `useLongPress` torna attivo anche in modifica (`disabled` solo con la vista pagine aperta o un trascinamento); `onPressChange` rimette `pagePressing` e la classe `is-pressing` sul pager; `onLongPress` chiama `openOverview(false)` invece di `enterEditMode()`. Resta G1: sul widget in uso fuori dalle pagine piene non parte alcun timer; nelle pagine piene la pressione sul corpo (mai sui comandi) fa restringere la pagina e apre la vista pagine, e il widget non si restringe. Commenti aggiornati. |
| `templates/launcher/FlashingPageIndicator.tsx`, `components/system/page-indicator/pageIndicator.css` | La barra in alto è attiva con la modifica **e con la vista pagine** (prima solo in modifica fuori dalla vista pagine). Attende sopra lo schermo mentre la pillola «Annulla» pende dall'alto della vista pagine (nuova proprietà `yieldToUndo`). Solo opacità e transform, movimento ridotto rispettato dalle regole di C2. |
| `utils/launcher/pageDescriptor.ts` | `addCells: 'always'` per le pagine di widget: celle con «+» in uso. La copertina resta `edit-only`. |
| `utils/launcher/names.ts`, `templates/sheets/CategoryPageSheet.tsx` | Avviso del widget da collegare: «<nome> non è ancora collegato. Tieni premuto uno spazio vuoto, tocca la pagina, poi tocca il widget.»; suggerimento del foglio: «…tieni premuto uno spazio vuoto, tocca la pagina, poi tocca il widget.» **Scelta mia**, non dettata dall'utente. La variante senza puntatore (comandi «Modifica la disposizione» o «Modifica le pagine» in Sistema) e quella con la disposizione bloccata restano. |

**Test.** Riportati ai valori della 0.9.21 (le riscritture di D-2 e D-8 di C1-C3 annullate): `PageDescriptor`, `LauncherCoverGrid`, `LauncherColumns`, `PolishLauncherScreen`, `Polish2LauncherScreen` (celle con «+» in uso, tab stop, aggiunta dal tocco, focus), `LagLayers` (la regola dell'ombra di `is-pressing` e il restringimento), `LauncherScreen` (pressione lunga = vista pagine, `is-pressing` anche nelle pagine piene, avviso con il nuovo testo), `FixLauncherUi` (testo dell'avviso). Nuovi in `LauncherScreen.test.tsx`: la pagina si abbassa durante la pressione e poi si apre la vista pagine con la barra in alto giù e quella delle pagine su; la barra in alto risale con «Fine» e aspetta sopra mentre «Annulla» pende dall'alto; la pressione su un widget in uso non avvia nulla (né pagina né widget si restringono); le celle vuote in uso hanno il «+» e il tocco apre l'aggiunta; la pressione lunga su una cella «+» apre la vista pagine e il rilascio non aggiunge nulla; il tocco su una scheda riporta alla pagina in modifica con «+ Widget», «Pagine» e «Fine». Controllo che i test vedano il difetto: con `LauncherScreen.tsx`, `FlashingPageIndicator.tsx` e `pageDescriptor.ts` rimessi com'erano prima del ripristino, 47 test falliscono; poi i file sono stati rimessi (`cmp`).

**Esiti** (dettagli in [verification.md](../verification.md), «Ripristino 0.9.23»): `tsc -p tsconfig.strict.json --noEmit`, `eslint src`, `lint:typography` (508 file) e `lint:theme-colors` (339 file) senza violazioni; test mirati con `--maxWorkers=4` verdi (25 file e 508 test sui file toccati e vicini; `LauncherScreen`, `FixLauncherUi`, `AdaptiveCategoryWidget`, `SystemPage`: 4 file, 175 test). **Prova headless sul PC** (un solo Chromium con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, anteprima `launcher.html` con le fixture, nessun Home Assistant; script, risultati e schermate in `backup/ripristino-0.9.23/shots/`): a 1280×665 la pagina Casa ha 16 celle «+» e nessun pozzetto in uso; tenendo premuto 300 ms su una cella il pager ha `is-pressing`, a 1 s ha `is-overview` e la barra in alto (pallina e nome della pagina) è scesa in (350, 8) di 580×68 con il fondo a 76 px, sopra le schede che iniziano a 100 px; la barra delle pagine sta a 601 px; «Fine» riporta il pager e la barra in alto allo stato di uso; la pressione lunga e il tocco su una scheda portano alla pagina con la barra «Aggiungi widget / Modifica le pagine / Fine» e la barra in alto; il tocco su un «+» apre «Aggiungi un widget»; la pressione di 1,2 s su un widget in uso (pagina con celle libere) non cambia nulla; uno scorrimento con il dito (eventi touch del protocollo) porta dalla pagina 2 alla 3 senza avviare la pressione; la pressione lunga con il dito sintetico (900 ms) apre la vista pagine. A 390×844 (pagina piena) gli stessi esiti con la pressione sul corpo di un widget; il fondo della barra in alto è a 76 px e le schede iniziano a 88 px. Nessun errore di pagina.

**Questioni residue.**
- **Non eseguiti:** suite completa, banco, copia a freddo, Tab M11 col dito, TalkBack, `e2e` (gli script `m11-overview.check.mjs` e `isolated-browser.check.mjs` entrano in modifica da «Modifica la disposizione» e non sono stati rieseguiti). La versione del banco non è cambiata: il codice qui descritto non è su nessun banco.
- **Scelte mie:** il testo dell'avviso del widget da collegare e del suggerimento del foglio («tocca la pagina»); nelle pagine piene la pagina si restringe durante la pressione sul corpo di un widget (come nella 0.9.21 e come dice la richiesta), il widget no; in modifica la pressione lunga sul vuoto apre di nuovo la vista pagine (come nella 0.9.21: l'esclusione «in modifica non fa nulla» era di C2).
- **Da vedere col dito:** con la barra in alto accesa nella vista pagine il nome della pagina sotto la pallina e quello nella barra in basso sono due ripetizioni; da valutare dopo la prova (ISSUE-105 riguarda il titolo della pagina in modifica sovrapposto ai chip «Da collegare»).
- **Documenti non aggiornati** (già indicati dopo C1-C3): `design.md`, ADR-0007/ADR-0012, `product.md` descrivono ancora la barra di stato; la pressione lunga sul vuoto che apre la vista pagine, nella loro formulazione, è di nuovo vera.
- **C4** (pulizia di `StatusBar`, `footerBand`, `chips`, `holdMs` e simili) resta fuori incarico; `LauncherPressContext`, `pagePressing` e le regole CSS di `is-pressing` sono di nuovo in uso.

**Punto di ripresa.** Prova col dito sul Tab M11 con un nuovo banco (solo su autorizzazione: versione e copia a freddo PRIMA da stabilire); poi i rilievi aperti (ISSUE-105, ISSUE-106, ISSUE-107) e, a parte, C4.

## Domande aperte

- **D-2:** la pressione lunga sullo spazio vuoto porta in modifica o nella vista pagine?
- **D-3:** dettagli dal corpo degli adattivi? **D-3b:** che cosa fare del pallino?
- **D-4:** ripiego per le pagine piene.
- **D-5:** in modifica, il trascinamento parte subito?
- **D-6:** tocco sul widget selezionato e «Collega».
- **D-7:** togliere il doppio tocco dall'uso?
- **D-8:** celle libere inerti in uso?
- **D-9:** chip e persone.
- **D-10:** ingranaggio sopra l'angolo della tessera, oppure 20 px riservati?
- **D-11 (nuova):** con le barre sovrapposte, come si proteggono cestino, maniglie e celle della prima e dell'ultima riga?
- **D-12 (nuova):** il tasto Indietro deve far uscire dalla modifica? È lavoro nuovo, da fare insieme alla cronologia della Casa 3D.
- **D-13 (nuova):** impilati e cursori orizzontali si tengono lo scorrimento. Va bene così, o serve un'altra regola (per esempio trascinare solo dalla sfera)?
- **D-14 (nuova):** aprire Sistema durante la modifica chiude prima la modifica?
- **D-15 (nuova):** consigliare la disposizione bloccata sul tablet del cliente? Aggiungere un'uscita automatica dalla modifica dopo un periodo di inattività?
- **D-16 (nuova):** chi deve collegare i widget? Da questo dipende il testo dell'avviso, con una variante per la disposizione bloccata.
- Testo dell'avviso.
- La pressione lunga sulla luce deve aprire il colore (lavoro nuovo)?
- Conferma delle proposte e nome dell'equivalente («Modifica la disposizione»).

## Chiusura e punto di ripresa

Piano approvato; G1 e G2 realizzate nel codice il 2026-10-21 (sezione «Realizzazione di G1 e G2»); nessun'altra tappa è autorizzata.

*Annotazione del 2026-10-21 (dopo «vai, procedi con G3-G5 e C1-C3»): realizzate nel codice anche G3-G5 e C1-C3 (sezioni «G3-G5 — realizzazione» e «C1-C3 — realizzazione»). Restano non autorizzate G0, G6 (tasto Indietro) e C4; il punto di ripresa è quello di «C1-C3 — realizzazione».*

*Annotazione del 2026-10-21 (sera, dopo «sono scomparsi i + e non funziona più l'animazione che tenendo premuto mi apre le pagine»): D-2 e D-8 sono rovesciate dalla richiesta esplicita dell'utente; vedi «Ripristino 0.9.23». Le righe di questo report che descrivono la pressione lunga come ingresso in modifica e le celle inerti in uso restano come storico.*

*Annotazione del 2026-10-21 (esito complessivo): revisione e correzioni fatte, banco `aca-system:0.9.22` costruito e provato sul Tab M11 (vedi «G3-G5 e C1-C3 — esito»). Restano non autorizzati G0, G6 (tasto Indietro) e C4.*

**Prossimo passo** (annotazione 2026-10-21: banco e prova della pressione lunga già eseguiti, vedi «G1-G2 — esito»; restano tocco immediato e gesti sulla luce col dito): prova di G1-G2 sul Tab M11 con il dito dell'utente (e, se autorizzati, G0 e il banco); poi le tappe successive solo su nuova autorizzazione. La zona di codice (LauncherScreen.tsx, appShell.css, edit.css, statusBar.css, footerBand.ts) è condivisa con altri agenti e con il piano della Casa 3D.

## Rettifiche successive

**Critica di completezza del 2026-10-21 (sola lettura, nessun test eseguito).** Aggiunti:
- Fatti 5 e 7-12;
- le righe degli impilati, dei cursori e di Indietro nella tabella;
- D-11…D-16 e le tappe G0, G6, C2a, C2b e C2c.

Il modello dei gesti non cambia, ma le tappe sono riordinate. Gli equivalenti da tastiera e da lettore di schermo sono resi obbligatori dentro C2b. Il numero dell'ADR non è più fissato. È corretta l'affermazione «Indietro esce dalla modifica»: era data per esistente e non lo è.

## Ripristino 0.9.23 — widget: tocco su «Collega» e pressione lunga che evidenzia e trascina (2026-10-21)

**Richiesta (testo fedele).** Vedi «Seconda rettifica del 2026-10-21 (sera)» in ADR-0016: «se faccio pressione sul widget avevamo detto che faceva highlight per ridimensionare e se trascinato in highlight diventava spostabile, altrimenti con il tap sul singolo widget in uno spazio non occupato da un pulsante apriva la sezione relativa alla lista dei dispositivi collegabili rilevati per quel widget specifico». Risposte: tocco fuori dai pulsanti = «Lista se da collegare»; pressione lunga = «Evidenzia e trascina». **Perimetro:** solo questo; nessun commit, nessun deploy, nessuna dipendenza nuova, nessun comando a impianti. Copie PRIMA in `backup/ripristino-0.9.23/pre/widget/`.

**Criteri di completamento.** (1) In uso il tocco sul corpo di un widget da collegare apre «Collega», senza avviso; Invio e Spazio uguale; widget collegati invariati. (2) In uso la pressione lunga sul corpo di un widget (mai su un comando) entra in modifica con il widget selezionato e la cornice; se il dito si muove senza essere alzato il widget si sposta; nessun restringimento; bloccata: la pillola. (3) In modifica nulla cambia. (4) Testi veri. (5) Test di regressione; typecheck e lint.

| File (percorsi relativi a `progetto/acasystem/frontend/src`) | Che cosa cambia |
|---|---|
| `templates/launcher/CategoryWidgetContent.tsx` | Il bersaglio del widget da collegare torna «Collega <nome>» e chiama `onConfigure` (saltando il tocco che ferma lo scorrimento, `pagerMoving`); tolta la proprietà `onUnboundTap`. |
| `templates/launcher/WidgetHost.tsx`, `StackView.tsx`, `LauncherUiContext.tsx` | Tolto il collegamento di `noticeUnbound`; commento della scheda. |
| `templates/launcher/LauncherScreen.tsx` | La pressione lunga parte anche sul corpo di un widget in uso (non su comandi, cursori, manopole, pile che scorrono); `liftWidget` (percorso della 0.9.21): modifica, selezione, `drag.begin({ lifted: true })` nello stesso gesto. Sul widget non c'è `is-pressing` né restringimento della pagina. Tolti `pageIsFull`, `noticeUnbound` e `undoPending`. Suggerimento della prima volta aggiornato. |
| `utils/launcher/names.ts`, `templates/sheets/CategoryPageSheet.tsx` | Tolto `unboundNotice`; suggerimento del foglio aggiornato. |
| Test | `CategoryPages` riportato alla 0.9.21 con una prova nuova sul tocco che ferma lo scorrimento; `FixLauncherUi` (tolta la prova di `unboundNotice`); `LauncherScreen`: riscritte per decisione le prove di G1 («non fa nulla»), di G4 (avviso) e di D-4 (pagina piena), nuove quelle sulla pressione lunga con movimento, sulla vibrazione, sul clic del rilascio inghiottito e sulla disposizione bloccata. |

**Questioni residue.** Non eseguiti: suite completa, banco, Tab M11 col dito, TalkBack, `e2e`. Da vedere col dito: il tempo tra la pressione e la comparsa della cornice, senza un segnale visivo prima della vibrazione (nessun restringimento, come chiesto); la vista pagine resta per la pressione sullo spazio vuoto. La versione del banco non è cambiata.

## Ripristino 0.9.23 — banco e tablet (2026-10-21)

**Banco.** `aca-system:0.9.23` costruito dopo suite completa (`npx vitest run --maxWorkers=4`: 183 file, 2598 test verdi), `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check`, `npm run build` e `check-bundle-size` tutti con esito 0 (dettagli in [verification.md](../verification.md)). Copia a freddo PRIMA e voce di infrastruttura in [infrastructure.md](../infrastructure.md). Container `healthy`, `/api/health` 0.9.23.

**Tab M11 (1280×665, DPR 1.5), osservazioni.** «+» visibile su tutte le celle vuote in uso e ingranaggio presente; pressione lunga di 700 ms sul vuoto: pagina ristretta, vista pagine aperta, barra in alto; tocco su una pagina: modifica con Widget, Pagine e Fine, e «Fine» esce; tocco su «+»: «Aggiungi un widget», «Annulla» chiude senza aggiungere; pressione lunga sul corpo di un widget: modifica con widget evidenziato e maniglie, nessun restringimento; trascinamento già in modifica: il widget si sposta subito (riportato con «Annulla»); tocco sul corpo di un widget da collegare: «Impostazioni del widget» con il selettore del dispositivo, chiuso senza collegare. Screenshot in `backup/ripristino-0.9.23/tablet/`.

**Non riuscito.** Pressione lunga seguita da trascinamento nello stesso tocco: la modifica si attiva ma il browser annulla il tocco (`pointercancel`) e il widget non si sposta; sollevando e riappoggiando il dito il trascinamento funziona. Il codice di `useLongPress` non prevede un passaggio dalla pressione al trascinamento; non è stato confrontato con la 0.9.21. Se l'utente si aspetta il trascinamento continuo, è una richiesta da valutare (non avviata).

**Punto di ripresa.** Conferma dell'utente col dito sulla 0.9.23; decisione sul trascinamento continuo dopo la pressione lunga; poi ISSUE-105 e C4. Non eseguiti: TalkBack, `e2e`.

## Annotazione del 2026-10-21 — Pressione lunga e trascinamento nello stesso tocco (banco 0.9.24)

*Annotazione datata: non riscrive «Ripristino 0.9.23 — banco e tablet», che resta come storico. Copie PRIMA in `backup/trascina-0.9.24/pre/`. Nessun commit, nessuna dipendenza nuova, nessun deploy.*

**Richiesta.** Dell'utente, 2026-10-21, risposta «Evidenzia e trascina»: il widget si evidenzia con le maniglie per ridimensionarlo; se senza alzare il dito lo si trascina, si sposta; nessun restringimento.

**Difetto (osservato sul Tab M11, banco 0.9.23, gesto sintetico).** Dopo la pressione lunga sul corpo di un widget in uso la modifica si attiva, ma se il dito si muove nello stesso tocco il browser annulla il tocco (`pointercancel`, perché il gesto diventa scorrimento) e il widget non si sposta; con un nuovo tocco già in modifica il trascinamento funziona.

**Causa (ipotesi, non provata sul tablet).** Il passaggio dalla pressione lunga al trascinamento sullo stesso puntatore esisteva già (`liftWidget` avvia `useWidgetDrag` con `lifted: true` e lo stesso `pointerId`); a mancare era la garanzia che il tocco restasse del widget. Il `touchmove` non passivo di `useWidgetDrag` è registrato da un effetto React quando la sessione parte e solo sulla finestra: se l'effetto arriva dopo il primo movimento, o se il widget viene ridisegnato dalla modifica e il tocco continua a seguire l'elemento premuto (che non propaga più alla finestra), il primo `touchmove` non viene annullato e il browser avvia lo scorrimento. Questo non è riprodotto: nella prova headless (Chromium, eventi touch CDP) il widget si sposta anche con il codice 0.9.23, quindi la causa sul tablet resta da confermare col dito.

**Correzione.** `holdTouchOnPage` (nuova, `hooks/launcher/gestures.ts`), chiamata da `liftWidget` (`templates/launcher/LauncherScreen.tsx`) nel momento in cui la pressione lunga scatta su un widget: registra subito, in modo sincrono, un `touchmove` non passivo che annulla il movimento di quel tocco, sulla finestra e sull'elemento premuto. Si toglie con `touchend`/`touchcancel` (ultimo dito), `pointerup`/`pointercancel` dello stesso puntatore o alla pressione di un altro; un mouse non registra nulla. Prima della pressione lunga nulla cambia (scorrimento delle pagine, comandi, cursori, manopole, pile). `useLongPress` riporta ora la posizione del dito al momento dello scatto (non quella iniziale, che può differire fino alla tolleranza), da cui parte il trascinamento. Pressione lunga sul vuoto (vista pagine) e modifica già attiva invariate; sollevato senza muoversi resta solo la selezione con le maniglie e il clic del rilascio è inghiottito come prima.

**Verifiche.** Test mirati con `--maxWorkers=4`: `LauncherScreen` (127 test, 5 nuove prove: lo stesso puntatore sposta il widget; `touchmove` annullato dalla pressione lunga e restituito al rilascio, non prima; scorrimento prima della pressione non bloccato; rilascio senza movimento = solo selezione; fine del tocco), `LauncherGestures` (53 test, 5 nuove, quattro su `holdTouchOnPage` e sulla posizione), `LauncherDragDrop`, `FixLauncherLogic`, `FixLauncherLogicRipresa`, `LauncherStacks`, `CategoryPages`: verdi (output in `backup/trascina-0.9.24/`). `typecheck`, `eslint` (cartelle toccate), `lint:typography` e `lint:theme-colors`: 0 violazioni. Prova headless a 1280×665 (`backup/trascina-0.9.24/shots/touch-drag.mjs`, touchStart, 700 ms, 14 touchMove, touchEnd): il widget passa da x=30,5 a x=348,5; tenuto fermo resta dov'è, con la modifica attiva; screenshot nella stessa cartella. **Non eseguiti:** suite completa, banco (la 0.9.24 non è costruita), Tab M11 col dito, TalkBack, `e2e`.

**Punto di ripresa.** Prova col dito sul Tab M11 dopo un nuovo banco (versione e copia a freddo PRIMA da stabilire con l'utente). Se il `pointercancel` si ripresenta, la causa è altra (per esempio un tocco che Chrome non invia come bloccante perché a `touchstart` non c'era un gestore): va misurata sul tablet con la sequenza degli eventi.

**Esito della prova sul banco 0.9.24 e sul Tab M11 (2026-10-21, sera, gesti sintetici via CDP, non il dito dell'utente).** Suite completa Vitest 183 file e 2608 test verdi (`backup/trascina-0.9.24/suite-3.txt`). Banco `aca-system:0.9.24` healthy (vedi [infrastructure.md](../infrastructure.md)), una scheda ricaricata senza service worker né cache, bundle `index-DifuJAMW.js`, 1280×665. Preferenze del launcher salvate e confrontate alla fine: nessuna chiave cambiata. Prove (`backup/trascina-0.9.24/c*.cjs`, screenshot in `backup/trascina-0.9.24/tablet/`) sulla pagina Energia (widget «Costi energetici», non collegato, nessun comando a dispositivi):

- Pressione lunga 700 ms sul corpo del widget, poi 20 `touchMove` nello stesso tocco e `touchEnd`: **il widget si sposta** (da x=666, y=45 a x=357, y=164) con la modifica attiva e senza nessun `pointercancel` (registrati `pointerdown`, `touchstart`, 20 `pointermove`, `pointerup`); «Annulla» lo riporta a x=666, y=45.
- `Input.synthesizeScrollGesture` dopo la pressione: **non utilizzabile** in questo modo, perché genera un secondo tocco che la pagina non vede (nessun `pointermove`); il widget è rimasto fermo. Non prova nulla sul gesto; lo scorrimento vero va visto col dito.
- Pressione lunga senza movimento: il widget resta dov'è, evidenziato con le maniglie, e la modifica si attiva (barra «Annulla/Fine»).
- Scorrimento orizzontale sul vuoto: sei cenni portano da Principale a Energia; il browser avvia lo scorrimento (`pointercancel` dopo il primo `pointermove`, atteso fuori dalla pressione lunga).
- Pressione lunga sul vuoto: si apre la vista pagine. **Osservazione:** rilasciando il dito sopra l'anteprima della pagina vicina (Utilità) il clic sintetico del rilascio la seleziona e porta in modifica su quella pagina (ripristinato con «Fine» e un cenno); sul tablet con un dito potrebbe capitare se si alza il dito fuori dalla pagina corrente. Non è un difetto accertato: da guardare col dito.
- Tocco sul widget da collegare: si apre «Impostazioni del widget» con «Dispositivo da collegare: Non collegato / Cambia» (il flusso «Collega»); chiuso con la X senza collegare.

Fine: scheda riportata a Principale, forward 9225 rimosso, `adb reverse tcp:3002` lasciato. **Non provato:** dito reale, scorrimento vero dopo la pressione, TalkBack, telefoni. Ripristino del banco: `ACASYSTEM_VERSION=0.9.23` più la copia PRIMA. Nessun commit.

## Annotazione del 2026-10-22 — Il rilascio della pressione lunga non apre la pagina accanto (banco 0.9.24)

*Annotazione datata: non riscrive «G1-G2 — esito» né l'annotazione del 2026-10-21 sulla pressione lunga e il trascinamento, che restano come storico. Copie PRIMA in `backup/animazioni-0.9.25/pre/`. Nessun commit, nessuna dipendenza nuova, nessun deploy.*

**Richiesta.** Dell'utente, 2026-10-22: tenendo premuto il vuoto vicino al bordo sinistro o destro la pagina si rimpicciolisce, sotto il dito si trova la scheda della pagina accanto e, alzando il dito, quella pagina viene scelta e si apre in modifica; al centro non succede. Con «correggilo» ha autorizzato la correzione. Dopo la prova col dito ha confermato che pressione lunga, modifica pagina, riduzione e selezione del widget e apertura della lista dei dispositivi funzionano.

**Causa.** `guardNextClick` (`hooks/launcher/useLongPress.ts`), nella versione ristretta di G2, ingoiava il click del rilascio solo se il suo bersaglio conteneva l'elemento premuto. Dopo il restringimento della pagina il click del dito cade su un'altra scheda e passava. Il vincolo sul bersaglio serviva per non assorbire il click di un tocco diverso, ma a quello provvede già il confronto del `pointerId` (più la fine della guardia al `pointerdown` successivo e a 800 ms).

**Correzione.** Un click con `pointerId` positivo è il rilascio se e solo se ha lo stesso `pointerId` del dito che ha fatto scattare la pressione lunga, qualunque sia il bersaglio. Un click di un altro puntatore passa; un click senza puntatore (tastiera, script) segue la regola di prima (il bersaglio contiene il premuto, o il premuto è uscito dalla pagina). La guardia finisce come prima: primo click, `pointerdown` successivo di qualunque puntatore, 800 ms. Vale per tutte le pressioni lunghe che usano l'hook: vuoto, widget (selezione e trascinamento), pagine piene. Nessun altro file di codice modificato.

**Verifiche.** Test mirati con `--maxWorkers=4`: `LauncherGestures`, `LauncherScreen`, `Casa3dShell`, `FixLauncherUi` (4 file, 207 test verdi). Nuove prove: `LauncherGestures` (click dello stesso puntatore su un altro bersaglio ingoiato una volta sola e un nuovo tocco poi agisce; click senza puntatore su un altro bersaglio non ingoiato; il caso «un altro puntatore passa» e «bersaglio uscito dalla pagina» già presenti) e `LauncherScreen` (pressione lunga sul vuoto, vista pagine aperta, rilascio sulla scheda «Altra»: la vista pagine resta e nessuna pagina si apre; un nuovo tocco la apre; il click di un altro dito passa). Senza la correzione le due prove sul rilascio falliscono. `tsc -p tsconfig.strict.json --noEmit`, `eslint` sul sorgente toccato (i file di test sono esclusi dal lint dalla configurazione), `prettier --check`, `lint:typography` e `lint:theme-colors` senza violazioni. **Non eseguiti:** suite completa, prova col dito sul Tab M11 della correzione, nuovo banco (la correzione non è ancora nel contenitore).

**Punto di ripresa.** Includere la correzione nel prossimo banco (0.9.25) e provare col dito: pressione lunga sul vuoto vicino al bordo sinistro e destro, rilascio senza aprire la pagina accanto; poi i test sulle animazioni per i glitch del frontend richiesti dall'utente.

## Annotazione del 2026-10-22 (seconda) — Il rilascio resta oltre circa 1,3 s

Il collaudo di [REP-20261022-001](REP-20261022-001-collaudo-animazioni.md) ha riprodotto il difetto del rilascio con tenute di 1,4-2,5 s (tablet 3/3 per lato con 1,5 s; telefono 3/3), mentre con 0,9 s e 1,2 s il rilascio è ignorato: la guardia di 800 ms parte allo scatto (500 ms) e scade a circa 1,3 s. La correzione dell'annotazione precedente resta valida per i rilasci dentro la guardia; la prova sul tablet citata allora teneva il dito 700 ms. Registrato come ISSUE-108; nessuna correzione ulteriore applicata. Le sezioni precedenti non sono modificate.

## Annotazione del 2026-10-22 (terza) — Il rilascio dopo una tenuta lunga non apre la pagina accanto (codice, banco 0.9.26 da costruire)

*Annotazione datata: non riscrive le precedenti. Copie PRIMA in `backup/rilascio-0.9.26/pre/`. Nessun commit, nessuna dipendenza nuova, nessun deploy; nessuna prova sul tablet.*

**Richiesta.** Dell'utente, «correggilo», riferita a ISSUE-108 (REP-20261022-001, F-01 e T-01): la correzione del banco 0.9.25 non copriva le tenute oltre circa 1,3 s.

**Causa (confermata).** `CLICK_GUARD_MS = 800` partiva allo scatto della pressione (500 ms) e scadeva a circa 1,3 s, anche con il dito ancora giù: il click del rilascio passava e sceglieva la scheda sotto il dito. Con il `dist` precedente la prova headless lo riproduce: tenute di 1,5 e 2,5 s falliscono sui tre punti (bordo sinistro: Principale, bordo destro: la pagina seguente, centro: pagina corrente in modifica), 0,7 s no.

**Correzione.** `guardNextClick` (`hooks/launcher/useLongPress.ts`) resta armata per tutto il tempo in cui il dito è appoggiato. Parte dal `pointerup` o `pointercancel` dello stesso `pointerId` una finestra di `CLICK_AFTER_RELEASE_MS` = 600 ms per il click che segue. Come prima finisce al primo click, al `pointerdown` di qualunque puntatore, e il click di un altro `pointerId` passa; il click senza puntatore segue la regola del bersaglio. Nessun limite di tempo dallo scatto. Nessun altro sorgente modificato.

**Verifiche.** Test con timer finti (`--maxWorkers=4`, 4 file, 221 test verdi): `LauncherGestures` (tenute di 0,7, 1,5, 2,5 e 5 s, trascinamento di 2,5 s, `pointercancel`, sollevamento di un altro dito, finestra di 600 ms, click senza puntatore) e `LauncherScreen` (tenute di 1,5, 2,5 e 5 s con rilascio sulla scheda accanto e sulla pagina corrente: la vista pagine resta e nessuna pagina si apre; un tocco nuovo la apre; un altro dito passa; widget sollevato e trascinato oltre 2 s con rilascio sopra un comando: il comando non scatta). Le 16 prove nuove (il test «dopo 800 ms» è sostituito da quelli sulla finestra dopo il rilascio) sono 13 quelle che falliscono con il sorgente precedente. `tsc -p tsconfig.strict.json --noEmit`, `eslint` sul sorgente, `prettier --check`, `lint:typography` e `lint:theme-colors` senza violazioni. Prova headless a 1280×665, DPR 1.5, tocco CDP, Chromium con GPU spenta, server isolato su porte locali di prova (`backup/rilascio-0.9.26/prova/`): sinistro, destro e centro con tenute di 0,7, 1,5 e 2,5 s, build nuova 9/9 senza apertura né cambio di pagina; build precedente 3/9 (solo 0,7 s). Il compositore software non dà tempi realistici: la prova vale per la logica.

**Non eseguito:** suite completa, prova col dito sul Tab M11, telefono reale, nuovo banco.

**Punto di ripresa.** Costruire il banco 0.9.26 con la correzione e provare col dito sul Tab M11: tenuta lunga (2-5 s) sul vuoto vicino al bordo sinistro, destro e al centro, rilascio senza aprire la pagina accanto; poi ISSUE-109 e gli altri glitch solo su autorizzazione.

## Annotazione del 2026-10-23 — La modifica esiste solo con un widget selezionato; il widget aggiunto compare selezionato (codice, banco da costruire)

*Annotazione datata: non riscrive le precedenti. Copie PRIMA in `backup/issue-109/pre/ux-0923/` (per otto file toccati prima di farne la copia, cioè cinque file di prova, `HomeScreenSection.tsx`, `AppShell.tsx` per un commento e `@types/launcher.ts` per un campo, la copia è ricostruita togliendo le modifiche note dal file attuale). Nessun commit, nessuna dipendenza nuova, nessun deploy; nessun browser e nessuna prova sul tablet. Sopra il lavoro di ISSUE-109 (R1-R10), che non è toccato.*

**Richiesta dell'utente (2026-10-23, prova della 0.9.26 sul Tab M11, con screenshot), testo fedele:** «se premo per avere l'animazione della pagina, la schermata dopo l'animazione è corretta, però nel momento in cui ritorno sulla pagina o clicco su un altra pagina con i widget presenti, questi hanno l'animazione shake attiva, inoltre sono presenti il pulsante "+ Widget" che è ridondante siccome siamo pieni di segni + per aggiungere i widget e un pulsante con pagine e fine che sono anche essi ridondanti».

**Risposte alle domande (fonte umana, stesso giorno).** (1) Tocco su una pagina nella vista pagine: «Torna alla pagina in uso» (niente modifica, niente tremolio, niente barre). (2) Barra del widget: «se ho un widget premuto per la modifica il pulsante con icona elimina, annulla e fine li possiamo anche mantenere ma è inutile nel caso specifico quando si presente "+ widget" e "pagine fine" perché per confermare la modifica dovrei cliccare 2 volte su fine, quindi manterrei solo per caso in cui si tiene premuto il widget la barra col pulsante fine». (3) Tremolio in modifica: «Nessuno» (il widget premuto è solo evidenziato con le maniglie).

**Seconda richiesta dello stesso giorno, testo fedele:** «dopo l'aggiunta del widget, vorrei si partisse col widget con highlight e modifica, la stessa animazione che c'è quando tieni premuto un widget, così è evidenziato e si capisce dove è posizionato».

**Che cosa cambia** (`LauncherScreen.tsx`, `launcher.css`, `WidgetHost.tsx`, `WidgetGrid.tsx`, `SystemPage.tsx`, `HomeScreenSection.tsx`, `@types/launcher.ts`):

1. **Vista pagine.** Il tocco su una scheda chiude la vista pagine **e la modifica** e porta a quella pagina in uso, senza barre e senza tremolio (`openFromOverview`: `goToPage` e `setEditMode(false)`). «Fine» ed Esc della vista pagine fanno lo stesso (Esc non chiude più soltanto la vista). La barra della vista pagine (elimina, nuova, principale, nome, nascondi, Fine) è invariata. Un fuoco senza proprietario va a «Modifica la disposizione».
2. **Barre.** La barra «+ Widget · Pagine · Fine» e il vassoio dei tipi non sono più mostrati in nessuno stato (`EditToolbar` e `WidgetTray` tolti da `LauncherScreen.tsx`; i file dei componenti restano, la pulizia è C4, non autorizzata; la pagina `UiKitPage` mostra ancora lo specimen di `EditToolbar`). Resta la barra del widget selezionato (Rimuovi, Annulla, Fine): un solo tocco su «Fine» torna in uso.
3. **La modifica esiste solo con un widget selezionato.** Si entra con la pressione lunga su un widget (invariata), con «Modifica la disposizione» (il widget che ha avuto il fuoco per ultimo nella pagina al centro, altrimenti il primo visibile per posizione; il fuoco va alla sua maniglia) e con l'aggiunta di un widget. Si esce con «Fine», con un tocco fuori da widget e celle, con Esc, con la rimozione del widget selezionato (Rimuovi, cestino, Canc: il fuoco perso va a «Modifica la disposizione»). Se la pagina al centro non ha widget, «Modifica la disposizione» non apre la modifica e l'annuncio dice dove sono le pagine. Se qualcosa accende la modifica senza selezione (il controller, una prova), la schermata sceglie lo stesso widget, o la spegne se non c'è. La vista pagine non ha selezione.
4. **Cella libera con un widget selezionato:** resta «Sposta qui», come oggi (dichiarato su richiesta). La tastiera che entra nelle celle (Tab da «Fine») toglie la selezione e quindi esce dalla modifica: da lì Invio aggiunge un widget.
5. **Nessun tremolio.** Tolta da `launcher.css` la regola `aca-wiggle` con le sue pause e la voce per il movimento ridotto; tolti `--aca-wiggle-delay` e la prop `order` da `WidgetHost` e `WidgetGrid`. Il widget selezionato è evidenziato solo dalla cornice (`is-selected::after`) e dalla cornice di presa con le maniglie. La classe `aca-fx-wiggle` del kit (galleria `CompositionGallery`) non è toccata.
6. **Aggiunta.** Solo dalle celle «+» in uso. Dopo l'aggiunta, a fogli chiusi (anche quando si apre prima il foglio delle impostazioni, come per to-do e auto), il nuovo widget entra in modifica selezionato: ultimo, se se ne sono aggiunti più insieme; stessa cornice, stesse maniglie, stessa barra della pressione lunga e fuoco sulla maniglia. Aggiunta annullata: nessuna selezione. Con la disposizione bloccata il widget si aggiunge e non si seleziona.
7. **Sistema → «Modifica le pagine»** apre la vista pagine (`setEditMode(true)` e `setOverview(true)`; `LauncherApi.setOverview` è facoltativo, perché i banchi senza vista pagine non lo hanno). Tornando dal foglio, l'annuncio è quello delle pagine e il fuoco va al nome della pagina al centro (alla scheda, sulla copertina), come prima da «Pagine». Testi di Sistema: la descrizione dice «Cambia nome, ordine e colonne delle pagine. Sullo schermo basta tenere premuto uno spazio vuoto; un widget si sposta tenendolo premuto.» e il suggerimento della griglia «in Modifica le pagine» (era «Modifica → Pagine»).

**Scelte mie** (testi minimi e dettagli non dettati dall'utente; da correggere se non volute): l'annuncio «Modifica della disposizione. Trascina il widget per spostarlo, tocca un widget selezionato per le impostazioni. Fine o Esc per terminare.» e quello della pagina senza widget («Nessun widget da modificare in questa pagina. Per le pagine: Sistema, Modifica le pagine.»); il tocco su una pagina **nascosta** nella vista pagine non la apre (fuori dalla vista non ha posto e portava in silenzio a «Principale»): la porta al centro e la pillola dice «La pagina è nascosta: tocca Mostra per rivederla.», come per la copertina spenta; «Annulla» del widget appena aggiunto parte dalla disposizione con il widget già dentro (non lo toglie); **la copia sollevata sotto il dito mentre si trascina continua a ondeggiare** (`aca-hold-shake`): è il segno del trascinamento, non lo stato di un widget a riposo, e la risposta «Nessuno» riguarda la modifica; se va tolto anche quello è una riga di `launcher.css`.

**Che cosa non è più raggiungibile (dichiarato).** (a) Una **pagina piena** non ha celle libere: non c'è più un ingresso per aggiungere lì un widget (prima «+ Widget» lo metteva su una pagina nuova); si aggiunge su un'altra pagina o si libera una cella. (b) La **copertina** fuori dalla modifica ha pozzetti senza «+» e con un widget selezionato le sue celle sono «Sposta qui»: non vi si aggiunge più direttamente, vi si porta un widget da un'altra pagina (trascinamento al bordo, o «Pagina» nelle impostazioni). (c) Del vassoio non restano il trascinamento di un tipo sulla griglia, le categorie e la ricerca: il foglio «Aggiungi un widget» ha tutti i tipi. (d) La vista pagine si apre solo con la pressione lunga sul vuoto e da Sistema (prima anche da «Pagine»), e da tastiera solo da Sistema. (e) I rami di `onDrop` e di `SheetState` per l'aggiunta dal vassoio restano nel sorgente senza ingresso (C4).

**Testi che citavano la modifica.** Il suggerimento della prima volta («Tieni premuto uno spazio vuoto per modificare le pagine, o un widget per spostarlo.») resta vero e non cambia. L'avviso del widget da collegare con «tocca la pagina, poi tocca il widget» non è più nel sorgente dalla seconda rettifica del 2026-10-21 (`UNBOUND_HINT` e la nota del foglio delle pagine di categoria non nominano la modifica e restano veri): nessuna modifica.

**Verifiche** (cartella `progetto/acasystem/frontend`, Vitest sempre con `--maxWorkers=4`, mai la suite completa, nessun browser): `npx tsc -p tsconfig.strict.json --noEmit`, `npx eslint src` (intero), `npm run lint:typography` (510 file) e `npm run lint:theme-colors` (339 file) senza violazioni; `prettier --check` sui sorgenti e sui test toccati (tre file riformattati, solo nelle righe nuove). Vitest sui 76 file di prova che importano il launcher, il pager, Sistema o i tipi del launcher: 1417 test verdi. Riscritti per decisione (24 in `LauncherScreen.test.tsx`, più quelli di `LauncherColumns`, `Polish2LauncherScreen`, `PolishLauncherScreen`, `ShellLauncher`, `SystemPage`, `LagLayers` e `LauncherGestures`): barra di modifica e vassoio, tremolio, ritorno in modifica dalla vista pagine, fuoco dopo la rimozione, ingresso dalla tastiera. Aggiunti: tocco su una scheda → uso senza barre né widget in modifica, scheda di una pagina nascosta, Esc e «Fine» della vista pagine, Sistema che apre la vista pagine con fuoco e annuncio, pressione lunga → solo la barra del widget (Rimuovi, Annulla, Fine), «Fine» una volta → uso, tocco fuori → uso, «Modifica la disposizione» che sceglie il widget col fuoco o il primo e che dice che non ce n'è, nessun «+ Widget» né vassoio, pagina piena senza «+», `LagLayers` (nessun `aca-wiggle`, nessuna animazione sul riquadro di un widget in modifica) e quattro prove dell'aggiunta (selezionato a fogli chiusi, dopo il foglio delle impostazioni, aggiunta annullata, disposizione bloccata). **Non verificato** che le prove nuove falliscano con il sorgente precedente.

**Non eseguito:** suite completa, `build`, `check-bundle-size`, `e2e`, qualsiasi browser, prova sul Tab M11 o su un telefono, TalkBack, nuovo banco. Gli script `frontend/e2e/m11-overview.check.mjs` e `backup/strumenti-tablet/*.cjs` cercano ancora `.aca-edit-toolbar` e «Modifica le pagine»: sono obsoleti per questa interfaccia.

**Punto di ripresa.** Banco con copia a freddo PRIMA (versione da concordare) e prova col dito sul Tab M11: pressione lunga su un widget (solo la barra del widget, nessun tremolio, «Fine» una volta), pressione lunga sul vuoto e tocco su una scheda (si torna alla pagina in uso), tocco fuori dai widget, aggiunta da una cella «+» (il nuovo widget compare evidenziato, anche dopo il foglio delle impostazioni), Sistema → «Modifica le pagine». Se l'utente vuole una via per aggiungere su una pagina piena o sulla copertina, è una proposta da fare.

## Annotazione del 2026-10-23 (seconda) — Nessun widget nascosto: la configurazione segue il dispositivo ([ADR-0019](../decisions/ADR-0019-memoria-per-dispositivo.md))

*Annotazione datata: non riscrive le precedenti. Il lavoro sopra ISSUE-109 (tappe R1-R10 e correzioni dell'interazione) non è disfatto. Copie PRIMA in `backup/issue-109/pre/memoria/` (29 file in partenza, più `LauncherScreen.test.tsx` e cinque sorgenti dei fogli e dei widget adattivi copiati prima di toccarli). Nessun commit, nessuna dipendenza nuova, nessun browser, nessun tablet, nessun banco.*

**Richiesta dell'utente (2026-10-23, con la schermata della pagina Multimedia in cui un widget nascosto lascia due caselle vuote senza «+»), testo fedele come riportato dall'agente principale:** «andrei anche a togliere la possibilità di nascondere un widget, anche perché è inutile dato che non esiste un pulsante per nasconderlo, e per andare ad ovviare al problema del widget nascosto, andrei a modificare il modo di salvare i dati, facendo in modo che se venisse eliminato un widget erroneamente, noi salviamo lo stato e all'aggiunta del widget la configurazione fatta su quel dispositivo rimane». **Risposte:** widget già nascosti = «Eliminati, config salvata»; ripristino = «Al collegamento». **Precisazione:** «se aggiugno il dispositivo ed è lo stesso, si va bene che viene copiata la configurazione Ma mettiamo caso che un utente vuole avere due widget sullo stesso televisore e vuole avere però altre funzionalità su quello specifico widget rispetto all'altro, però vuole copiare la stessa configurazione. Quello che dobbiamo fare è che se viene messo lo stesso dispositivo, viene configurato automaticamente a quello attuale, ma se l'utente decide di modificare dei parametri, può farlo liberamente, a meno che questi non si vadano a scontrare.»

**Dove esisteva il nascondere (verificato).** Una sola voce nell'interfaccia: l'interruttore «Nascondi il widget» di `WidgetSettingsSheet.tsx`. Dati: `hiddenCards` in `localStorage` (`tunet_hidden_cards`), in `PageContext`, nell'istantanea (profili, esportazione, sincronizzazione), in `handleAddSelected` e in `isWidgetHidden` di `LauncherPage.tsx`. **Non toccati, per dichiarazione:** il nascondere le **pagine** (`LauncherPage.hidden`, l'occhio della vista pagine) e la **visibilità condizionale** dei widget (`visibilityCondition`), che con regole false lascia ancora una casella riservata senza «+» (questione aperta nell'ADR).

**Che cosa cambia.**

1. **Tolto il nascondere.** Via l'interruttore, `hiddenCards`, `toggleCardVisibility`, `persistHiddenCards`, il campo `hiddenCards` dell'istantanea (e di `startBlank`) e lo «sconto» in `handleAddSelected` e `useAddCard`. `isWidgetHidden` conserva la sola visibilità condizionale; `PreviewApp` non passa più la funzione.
2. **Migrazione al caricamento.** `migrateStoredWidgetState` (`utils/launcher/widgetStateStorage.ts`) gira una volta all'avvio, prima che `PageProvider` legga lo stato: i widget della vecchia lista escono da ogni pagina e classe di dispositivo, dalle pile e dalle liste `pagesConfig`; se collegati a un dispositivo la configurazione va nella memoria; **se non collegati non c'è nulla da conservare** (se ne libera il posto). `applySnapshot` fa lo stesso su ogni istantanea che arriva (profilo, file, altro dispositivo, sincronizzazione) e non scrive più `tunet_hidden_cards`. Idempotente: provata la seconda esecuzione e la stessa lista applicata due volte.
3. **Memoria per dispositivo** (`utils/launcher/deviceMemory.ts`, funzioni pure). Chiave (tipo, dispositivo), dove il dispositivo è l'`entity_id` del collegamento (per i widget aggiunti da un'entità, l'entità). Si salva all'eliminazione di un widget collegato (`removeWidget` di `LauncherScreen`, la pagina intera, i membri di una pila): nome, icona e impostazioni, **mai** posizione, pagina e collegamento. «Annulla» è invariato (le impostazioni non vengono toccate). Tetto: 100 voci, 400 orari di modifica, valori oltre 2000 caratteri non salvati.
4. **Copia al collegamento.** `PageProvider` accoda la richiesta quando si sceglie il dispositivo di un widget (`saveCardSetting` con la chiave di collegamento del tipo) o si finisce un'aggiunta (`AddWidgetSheet`); dopo il commit copia la configurazione **più recente** tra un altro widget dello stesso tipo sullo stesso dispositivo e la memoria, solo se il widget non è mai stato modificato e senza sovrascrivere i suoi valori; avviso `role="status"` «Impostazioni riprese da “nome”»; il foglio delle impostazioni riparte dai valori ripresi. Poi i widget sono indipendenti (copia profonda).
5. **Impostazioni «del dispositivo».** Inventario in [ADR-0019](../decisions/ADR-0019-memoria-per-dispositivo.md): **ce ne sono** (associazioni di entità di auto, aspirapolvere, lettori, Sonos, `adaptiveBindings`; connessione della videocamera; `lightTransition` e `sonosSleepMinutes`). Salvate su un widget si scrivono su tutti i widget dello stesso tipo sullo stesso dispositivo (`propagateDeviceScoped` in `saveCardSetting`), e i fogli dicono «Vale per tutti i widget di questo dispositivo.» (auto, videocamera, aspirapolvere, lettori collegati, «Funzioni aggiuntive»; nelle etichette dei cursori di transizione e timer). Tutto il resto resta libero per widget (compresi `climateFavoriteModes`, `currency`, `decimals`, l'immagine dell'auto).
6. **ISSUE-114 integrata.** All'avvio le impostazioni dei widget che non sono più su una pagina si sistemano (copia lasciata da uno spostamento o dal suo «Annulla»: scartata se il widget è su un'altra pagina; widget eliminato: memoria se collegato, poi scarto; voce senza dispositivo con impostazioni vere: lasciata).

**Scelte mie** (da correggere se non volute): il tetto di 100 voci; la classificazione delle impostazioni del dispositivo (larga: «identificano o raggiungono il dispositivo, o sono valori predefiniti dei comandi»); la stanza trattata come dispositivo con l'`area_id`; «mai modificato» come condizione della copia; il testo dell'avviso; la scritta nelle etichette dei due cursori.

**Comandi ed esiti** (cartella `progetto/acasystem/frontend`, Vitest sempre con `--maxWorkers=4`, mai la suite completa):

| Comando | Esito |
|---|---|
| `npx vitest run src/__tests__/DeviceMemory.test.ts src/__tests__/WidgetMemoryProvider.test.tsx` | 2 file, 41 test verdi (30 + 11): chiave e contenuto, tetto, lettura, copia dalla memoria e da un altro widget (più recente, parità, valori propri, tipo e dispositivo diversi, widget già modificato), indipendenza, impostazioni del dispositivo (elenco, deriva da `CAR_KEYS` e `VACUUM_MAPPINGS`, propagazione), migrazione dei nascosti (con e senza dispositivo, pile, vecchi dati senza disposizione, idempotenza), ISSUE-114, avvio sullo stato vero, istantanea in arrivo, eliminazione e collegamento, eliminazione di una pagina |
| `npx vitest run src/__tests__/LauncherScreen.test.tsx` | 145 test verdi (143 + 2 nuovi): eliminazione di un widget collegato (memoria salvata, impostazioni al loro posto, «Annulla»), di uno senza dispositivo (nulla in memoria), avviso nella pillola |
| `npx vitest run src/__tests__/SystemSheets.test.tsx` | 35 test verdi (4 nuovi): l'interruttore non c'è più, i campi ripartono dopo la copia, la scritta del dispositivo su auto e videocamera e non sulla luce |
| Vitest sui 118 file di prova che importano il launcher, i fogli, `PageContext`, l'istantanea, i widget adattivi o i profili | 118 file, 2022 test verdi |
| `npx tsc -p tsconfig.strict.json --noEmit`, `npx eslint src` (intero), `npm run lint:typography` (513 file), `npm run lint:theme-colors` (339 file) | verdi, 0 violazioni |
| `prettier --check` sui file toccati | verde |

Prove aggiornate perché citavano il nascondere: `cardActions.lock`, `cardActions.sensor`, `CategoryPages`, `FixLauncherUiShell` (il caso «nascosto» è diventato la migrazione), `FixSheetsReview`, `sensorCardInstances.persistence`, `SystemPage`, `SystemSheets`, `useAppViewModels`, `useSettingsSyncDevice` (usava `hiddenCards` come segnaposto: ora `customNames`). Verificato che il test dei campi che ripartono fallisce senza la chiave di rimontaggio.

**Non eseguito:** suite completa, `build`, `check-bundle-size`, `e2e`, qualsiasi browser, il tablet, un nuovo banco, la sincronizzazione reale tra due dispositivi, un profilo vero con widget nascosti (provati solo dati costruiti nelle prove). Non verificato che ogni test nuovo fallisca con il sorgente precedente, salvo quello indicato.

**Punto di ripresa.** Risposta dell'utente su due punti: (1) la visibilità condizionale deve restare, sparire o mostrare il «+» sulla casella? (2) l'elenco delle impostazioni «del dispositivo» va bene? Poi un banco con copia a freddo PRIMA e prova sul Tab M11: eliminare un widget, rimetterlo sullo stesso dispositivo, due widget sulla stessa TV con funzioni diverse.

## Annotazione del 2026-10-23 (terza) — «Aggiungi widget» nella vista pagine (codice, banco da costruire)

*Annotazione datata: non riscrive le precedenti. Copie PRIMA in `backup/issue-109/pre/aggiungi-vista-pagine/` (dieci file toccati, più questo rapporto; c'è anche una copia del piano REP-20261022-002, che non è stato modificato). Nessun commit, nessuna dipendenza nuova, nessun deploy, nessun browser, nessun tablet. I file dell'informativa sull'uso dell'AI di REP-20261023-005 (`AiDevelopmentNotice.tsx`, `aiDevelopmentNotice.css`, `ai-development.svg` e le due righe di `SystemLayout.tsx`) non sono stati toccati.*

**Contesto.** La seconda annotazione di questo rapporto dichiara, al punto (a) di «Che cosa non è più raggiungibile», che una **pagina piena** e la **copertina** non hanno più un ingresso per aggiungere un widget, perché la barra «+ Widget · Pagine · Fine» e il vassoio non esistono più e i widget si aggiungono solo dalle celle «+». L'agente principale l'ha segnalato all'utente.

**Risposta dell'utente (2026-10-23), testo fedele come riportato dall'agente principale:** «sì, metti una voce nella vista pagine per aggiungere widget».

**Che cosa cambia.**

1. **Voce «Aggiungi widget» nella barra della vista pagine** (`PageOverviewBar.tsx`, `LauncherScreen.tsx`): icona senza parole come le altre azioni della barra (`IconAction`, con suggerimento), subito dopo «Nuova pagina» e prima della casa; ordine della barra: elimina, nuova pagina, aggiungi widget, principale, nome, nascondi, Fine. Nome accessibile «Aggiungi widget», suggerimento «Aggiungi un widget a questa pagina». Icona `widgetAdd` aggiunta alla primitiva `Icon` (mx-icons `ElementPlusLinear`: `WidgetAddLinear` è dichiarata nei tipi di mx-icons ma non esiste a runtime, come avverte `IconRuntime.test.tsx`); è esclusa dal selettore icone dei widget (`INTERFACE_ONLY`; `SystemSheets.test.tsx` conta 12 icone escluse invece di 11). Le proprietà `onAddWidget` e `addWidgetBlocked` della barra sono facoltative: senza `onAddWidget` la voce non c'è.
2. **Stesso foglio delle celle «+».** La voce apre `AddWidgetSheet` per la pagina della scheda al centro (`openAddWidgetAhead`, che differisce da `openAddWidget` solo perché non c'è una cella scelta). Il widget è creato dal foglio con le stesse regole di prima (carte, impostazioni, memoria per dispositivo, foglio delle impostazioni dopo l'aggiunta per auto e attività).
3. **Regola di posizionamento** (`placeWidgetAheadInLayout` in `utils/launcher/layout.ts`, `placeWidgetAhead` nel controller): il widget va nella **prima posizione libera adatta** della pagina al centro (la stessa ricerca di `placeWidget` senza cella: la dimensione scelta, ridotta fino al minimo del widget se serve); se la pagina è piena, nella **prima pagina successiva con spazio** nell'ordine delle schede, e la scheda al centro si sposta su quella pagina; se nessuna pagina successiva ha spazio, in una **pagina nuova in fondo** (etichetta «Nuova pagina», non una continuazione). Contano soltanto pagine di widget non nascoste: le pagine speciali (Luci, Multimedia, Casa 3D…) e quelle nascoste si saltano; le pagine **prima** di quella al centro non si guardano. Le impostazioni create dal foglio seguono il widget alla sua pagina (stesso meccanismo del «nessuno spazio» di prima). Più widget aggiunti insieme ripartono ciascuno dalla pagina in cui è arrivato il precedente.
4. **Dopo l'aggiunta** (coerente con la seconda annotazione): a fogli chiusi la vista pagine si chiude e il nuovo widget compare selezionato, con cornice, maniglie e barra della pressione lunga, sulla sua pagina; il fuoco va alla sua maniglia. Per non perdere la selezione, la chiusura della vista avviene in un passo separato da quello della selezione (`LauncherScreen.tsx`, effetto del «reveal»), e la regola «senza selezione non c'è modifica» attende il widget in arrivo. Aggiunta annullata: la vista resta com'era e il fuoco torna alla voce. Annuncio vocale: «aggiunto alla pagina.», oppure «aggiunto alla pagina X, perché questa è piena.», oppure «aggiunto a una nuova pagina in fondo, perché le altre sono piene.». L'annuncio all'apertura della vista cita la nuova voce.
5. **Quando la voce è disattivata** (resta raggiungibile da tastiera con `aria-disabled`; il motivo è la descrizione accessibile, è nel suggerimento e, a un tocco, nella pillola degli avvisi): disposizione bloccata («Disposizione bloccata: sbloccala in Sistema → Schermata Home.»); pagina speciale («Questa pagina non ha celle per i widget: scegli una pagina di widget.»); copertina che non accetta ancora widget («La copertina non accetta widget per ora.»); pagina o copertina nascoste («La pagina è nascosta: mostrala per aggiungere widget.» / «La copertina è nascosta: mostrala per aggiungere widget.»). **Copertina:** accetta quello che accettano oggi le sue celle «+» in modifica, cioè widget nelle sue celle libere; la copertina predefinita (orologio, data, meteo) è già piena, quindi di solito il widget va nella prima pagina dopo di essa. Con la disposizione bloccata la vista pagine non può restare aperta (la modifica finisce), perciò la voce bloccata è provata sulla barra e non sullo schermo.

**Scelte mie** (da correggere se non volute): la regola di posizionamento del punto 3 (comprese le due scelte di non guardare le pagine prima della scheda al centro e di saltare le pagine nascoste); l'etichetta «Nuova pagina» per la pagina creata; il disattivare la voce su pagine nascoste e speciali invece di scegliere un'altra pagina; i testi dei motivi e degli annunci; l'icona. **Da guardare sul tablet:** la barra ha un'icona in più; su un telefono stretto (360 px) il nome della pagina cede spazio con i puntini, non verificato.

**Comandi ed esiti** (cartella `progetto/acasystem/frontend`, Vitest sempre con `--maxWorkers=4`, mai la suite completa, nessun browser):

| Comando | Esito |
|---|---|
| `npx vitest run src/__tests__/LauncherLayout.test.ts` | 22 test verdi (6 nuovi di `placeWidgetAheadInLayout`: posto libero nella pagina; pagina piena verso la successiva saltando una pagina speciale; pagina nascosta e nessuno spazio verso una pagina nuova in fondo; solo le pagine dopo; partenza dalla copertina; widget già presente e pagina speciale) |
| `npx vitest run src/__tests__/ShellLauncher.test.tsx` | 21 test verdi (9 nuovi con il foglio sostituito da pulsanti: posizione e ordine nella barra; pagina con spazio, vista chiusa, widget selezionato con cornice e maniglie, fuoco sul widget; pagina piena verso la successiva con spazio e scheda al centro che la segue; nessuno spazio verso una pagina nuova in fondo; pagina nascosta saltata; copertina con spazio e copertina piena; voce disattivata con il motivo su copertina nascosta, pagina nascosta e pagina speciale; tastiera e disposizione bloccata) |
| `npx vitest run src/__tests__/PageOverviewBarAddWidget.test.tsx` | 4 test verdi (azione, assenza senza gestore, bloccata con motivo e senza azione, ordine della tastiera) |
| `npx vitest run src/__tests__/LauncherScreen.test.tsx` | 147 test verdi (2 nuovi con il foglio vero: annullato, la vista resta e il fuoco torna alla voce; aggiunta di un separatore, vista chiusa e widget selezionato; aggiornato l'elenco dei pulsanti della barra) |
| 28 file di prova mirati (controller, layout, copertina, schermo, selezione, pile, trascinamento, colonne, fogli, icone, `LagRenders`, `PageOverviewBar*`, `EditIconAction`, `KitOverlays`) | 28 file, 542 test verdi |
| `npx tsc -p tsconfig.strict.json --noEmit`, `npx eslint src` (intero, e `--no-ignore` sui cinque file di prova toccati), `npm run lint:typography` (515 file), `npm run lint:theme-colors` (341 file), `prettier --check` sui file toccati | verdi, 0 violazioni |

**Non eseguito:** suite completa, `build`, `check-bundle-size`, `e2e`, qualsiasi browser, prova sul Tab M11 o su un telefono, TalkBack, nuovo banco. Non verificato che i test nuovi falliscano col sorgente precedente.

**Punto di ripresa.** Il banco 0.9.27 con copia a freddo PRIMA include questa voce e l'informativa sull'uso dell'AI di [REP-20261023-005](REP-20261023-005-informativa-sviluppo-ai.md) (presenza da verificare nelle impostazioni sul tablet). Prova col dito sul Tab M11: pressione lunga sul vuoto, «Aggiungi widget» su una pagina con spazio, su una piena, su una copertina piena e con tutte le pagine piene (pagina nuova in fondo), annullando il foglio; poi la voce disattivata su una pagina speciale.

## Annotazione del 2026-10-23 (quarta) — Chiusura sul banco 0.9.27

*Annotazione datata: non riscrive le precedenti. Scritta da Claude Code (claude-sonnet-5-5) alla chiusura della tappa Z di [REP-20261022-002](REP-20261022-002-piano-blocchi-thread.md).*

La richiesta dell'utente del 2026-10-23 sulle barre di modifica (testo fedele e risposte nella sezione «La modifica esiste solo con un widget selezionato; il widget aggiunto compare selezionato», sopra) è nella **0.9.27**, sul banco `aca-system:0.9.27` (192.168.1.7:3002). Sul Tab M11, con gesti sintetici, sono stati visti: vista pagine aperta con la pressione lunga sul vuoto (centro e bordi) e «Fine» che torna in uso; pressione lunga su un widget con la sola barra «Rimuovi, Annulla, Fine» e nessuna animazione di tremolio; tocco su una scheda della vista pagine che torna alla pagina in uso, senza barre; widget aggiunto da un «+» che compare **selezionato** con cornice e 8 maniglie; nessuna voce «Nascondi»; «Aggiungi widget» nella vista pagine, che su una pagina piena manda il widget nella pagina successiva con spazio, selezionato. Schermate in `backup/issue-109/Z/banco/`. **Non provato col dito**, né sul telefono, né con TalkBack. Restano le conferme dell'utente già elencate nelle annotazioni precedenti (copia sollevata che ondeggia ancora sotto il dito, pagina nascosta nella vista pagine, nessun ingresso per aggiungere su pagina piena o direttamente sulla copertina, icona di «Aggiungi widget»). La richiesta sul televisore LG non rilevato **non è stata trattata** da questo blocco.

## Annotazione del 2026-10-23 (quinta) — Pila vuota: le caselle tornano libere (0.9.28, punto 2)

*Annotazione datata: non riscrive le precedenti. Scritta da Claude Code (claude-sonnet-5-5).*

**Osservato dall'utente** sul banco 0.9.27: nella pagina Multimedia una pila vuota (`stack_mvjd2g21`) occupava due caselle senza «+». **Causa:** il segnaposto `stack_…` restava nelle posizioni della pagina senza una pila con widget dietro (pila con `ids` vuoto, scartata dal validatore, o `unstackWidgetInLayout` che con l'ultimo widget lasciava `ids: []`). **Correzione:** `withoutEmptyStacks` in `utils/launcher/layout.ts` toglie le pile senza widget e i segnaposto orfani (idempotente, stesso oggetto se non c'è nulla da togliere); è applicata dal validatore del layout (caricamento, profili, istantanee e sincronizzazione passano da `sanitizeLauncherLayout`), da `commit` del controller (qualunque modifica) e da `unstackWidgetInLayout` (ultimo widget fuori: la pila sparisce e le caselle sono libere). `migrateStoredWidgetState` riscrive il layout salvato se la lettura lo ha ripulito, una volta sola. Una pila con un solo widget resta invariata; la migrazione di ADR-0019 (`withoutWidgets`) già toglieva le pile svuotate dai widget nascosti e non è cambiata, nessun dato di configurazione dei widget viene toccato. **Verifiche:** nuovi test in `LauncherStacks.test.tsx` e `WidgetMemoryProvider.test.tsx`; 50 file mirati, 854 test verdi; `tsc` strict, `eslint`, tipografia, colori e prettier verdi. **Non eseguito:** suite completa, browser, banco, tablet. Nessun commit.

## Annotazione del 2026-10-23 (sesta) — La pagina si rimpicciolisce solo alla soglia della pressione lunga; tocco sul «+» con la sua animazione (0.9.28)

*Annotazione datata: non riscrive le precedenti. Scritta da Claude Code (claude-sonnet-5-5). Copie PRIMA in `backup/v0928/pre/pressione/` (`LauncherScreen.tsx`, `launcher.css`, `WidgetGrid.tsx`, tre file di prova e questo rapporto). Nessun commit, nessuna dipendenza nuova, nessun deploy; nessun browser e nessuna prova sul tablet.*

**Richiesta dell'utente (2026-10-23, dopo la 0.9.27 sul banco), testo fedele come riportato dall'agente principale:** «se clicco su un + al posto di farmi l'animazione sul + mi fa l'animazione di hold sulla pagina per il tempo del click prima di aprire i widget, poi questa animazione è presente ad ogni click che si inizia a diminuire la grandezza come per modificare la pagina, ci deve essere un counter che rileva la pressione e dopo che è arrivato al punto di trigger di tempo per una pressione sostenuta si attiva l'animazione che fa diminuire la grandezza della pagina e va in modifica della pagina».

**Causa.** `onPressChange` di `useLongPress` metteva `is-pressing` sul pager dal primo istante della pressione sul vuoto; la regola `.aca-pager.is-pressing > .aca-pager__page.is-current > .aca-pager__body` rimpiccioliva la pagina a 0,9 per tutti i 500 ms, anche in un tocco breve (dopo 60 ms di attesa, quindi visibile su un tocco appena lento) e prima di aprire la scelta dei widget.

**Correzione.**
- Il contatore della pressione resta quello di `useLongPress` (`LONG_PRESS_MS` = 500, vibrazione alla soglia, guardia del clic di rilascio di ISSUE-108, tolleranza di movimento, eccezioni dei comandi, trascinamento dopo la pressione lunga sul widget: tutto invariato). `LauncherScreen.tsx` non passa più `onPressChange` e non mette più `is-pressing` sul pager: durante la pressione la pagina non cambia. Alla soglia si apre la vista pagine e il rimpicciolimento è l'animazione della vista pagine (`--aca-overview-ms` 360 ms, stessa curva), da scala 1 a `--aca-overview-k`. Tolte da `launcher.css` le regole del pager premuto e le loro varianti a movimento ridotto; restano il cenno della scheda premuta nella vista pagine e quello del widget premuto (ADR-0004, ADR-0016).
- Il tocco breve sul vuoto non mostra nulla. Il tocco breve su un «+» (e su «Sposta qui») dà alla casella `is-tapped` (`WidgetGrid.tsx`): la casella si abbassa a 0,92 e torna a 1 mentre il «+» fa un quarto di giro (un «+» ruotato di 90 gradi è la stessa forma), in 200 ms, con le sole proprietà `scale`, `rotate` e `opacity` su livelli che le caselle hanno già (`will-change: transform`), e subito si apre la scelta dei widget come prima. Con movimento ridotto la casella si attenua soltanto (`aca-cell-tap-still`, opacità). Il cenno finisce con `animationend` della casella; la pressione lunga non lo produce, perché il suo clic è inghiottito dalla guardia.

**Verifiche (eseguite).** Nuovi test in `LauncherScreen.test.tsx` (tocco sul «+»: nessuna classe di pressione sul pager, `is-tapped`, scelta dei widget aperta, fine del cenno; pressione interrotta prima della soglia: nessun cambio del pager; pressione oltre la soglia: nessun rimpicciolimento prima, vista pagine alla soglia) e in `LauncherGestures.test.tsx` (struttura del cenno, solo `scale`/`rotate`/`opacity`, variante a movimento ridotto); adattati i cinque test che davano per voluta la pagina che si abbassa durante la pressione (`LauncherScreen.test.tsx` due, `LagLayers.test.ts` due, `LauncherGestures.test.tsx` uno). 7 file mirati, 268 test verdi; `tsc` strict, `eslint`, tipografia, colori e prettier verdi. In una prova a quattro processi in parallelo `Polish2LauncherScreen.test.tsx` ha fallito una volta («Tab porta nelle celle, termina la modifica»: focus e tastiera, nessuna pressione né clic), poi è passato in due delle tre riprove; è un test sensibile al carico, non toccato da questo lavoro, da tenere d'occhio nella suite completa. **Non eseguito:** suite completa, browser, banco, tablet. **Non misurato:** il costo del nuovo cenno e dell'apertura della vista pagine dalla scala 1 (prima partiva da 0,9) sul Tab M11; atteso ridotto (nessuna animazione durante la pressione, solo transform/opacity), non provato.

**Punto di ripresa.** Rimisurare sul tablet l'apertura della vista pagine dopo la soglia e il cenno del «+» insieme alla coreografia delle animazioni ([REP-20261023-006](REP-20261023-006-coreografia-animazioni.md)).

## Annotazione del 2026-10-23 (ISSUE-105: tolto il chip «Da collegare»)

Alla domanda su come risolvere la sovrapposizione del nome della pagina con i chip «Da collegare», l'utente ha risposto il 2026-10-23: «non segnamo da collegare, al primo avvio ad intuizione il sistemista lo sa se è da collegare o no, semplicità e pulizia».

**Eseguito (working tree, senza commit).** Il chip visibile non c'è più per nessun widget da collegare (adattivi, dedicati, pile, anteprime e vista pagine passano tutti da `CategoryWidgetContent`). Tolti il nodo e le regole `.aca-category-widget__pending` e `__pending-text` (compresi i due `@container`). Invariati: tocco che apre «Collega» con il suo nome e la sua descrizione, stile grigio, configurazione per dispositivo, comportamento in modifica. Per i lettori di schermo c'è un testo nascosto «<tipo>, non collegato» (`data-category-unbound`) accanto alla descrizione già esistente. Senza la riga del chip il widget riempie tutta la casella.

**Verifiche.** `CategoryPages.test.tsx` adattato (tre test che fissavano il chip e due test CSS rimossi o riscritti; il test della modifica ora verifica l'assenza del chip e il testo nascosto): 30 test verdi con `--maxWorkers=4`; `tsc` strict, `eslint`, `lint:typography`, `lint:theme-colors` verdi. Copie PRIMA in `backup/v0928/pre/issue-105/`. **Non eseguito:** browser, tablet, banco, suite completa. **Non misurato:** se il nome della pagina sotto i pallini copra ancora contenuti della prima riga ora che il chip non c'è; il disegno non è stato cambiato, la prova a video lo controllerà.


## Rettifica del 2026-10-23 (ISSUE-105: fini riga)

*Annotazione datata: non riscrive la precedente.* Il lavoro su ISSUE-105 aveva salvato `launcher.css`, `CategoryWidgetContent.tsx`, `CategoryPages.test.tsx` e questo rapporto con fine riga CRLF, mentre l'ultimo commit e le copie PRIMA in `backup/v0928/pre/issue-105/` sono in LF; con `progetto/acasystem/** -text` git non normalizza, quindi il diff di `launcher.css` risultava l'intero file e due guardie della coreografia fallivano. Riportati a LF, senza altri cambi di contenuto (copie PRIMA della rettifica in `backup/v0928/pre/rilievi-revisione/`); `CategoryPages.test.tsx` riformattato da prettier in un punto. Dettagli e verifiche in [REP-20261023-006](REP-20261023-006-coreografia-animazioni.md), «Rettifiche successive».


## Annotazione del 2026-10-23 (sera) — 0.9.28: esito sul tablet della pressione con soglia, della pila vuota e di ISSUE-105

*Annotazione datata: non riscrive le precedenti. Scritta da Claude Code (claude-sonnet-5-5) dai resoconti dei passi del flusso; cifre in `backup/v0928/tablet-misura/` e `backup/v0928/video/`. Nessun commit.*

- **Pressione con soglia (sesta annotazione): misurata, funziona.** Sul Tab M11 (gesti sintetici, fixture) il tocco breve di 80, 250 e 400 ms sul «+» e sul vuoto ha 0 fotogrammi con la pagina sotto scala 1 (la 0.9.27: 3-8 fotogrammi, scala minima 0,92-0,96); la scheda tenuta nella vista pagine cambia a 549 ms [547-555] dal tocco, con soglia a 500 ms; la pressione lunga sulla pagina non mostra cambiamenti prima dell'apertura (primo inizio a 692 ms [671-758], base 105 con la pagina che si rimpiccioliva). Il «+» toccato risponde in 17,5 ms [15,1-22] e scende a 0,93; uno swipe che parte da un «+» non lampeggia. Il riscontro sugli altri comandi (Fine, Annulla, Rimuovi, ingranaggio) non è entro 2 fotogrammi (154-263 ms). Dettaglio in [REP-20261023-006](REP-20261023-006-coreografia-animazioni.md), «Esito della 0.9.28» (A7, A8).
- **Pila vuota (quinta annotazione):** nessuna misura dedicata né prova col dito in questo passo. **Non verificata sul tablet.**
- **ISSUE-105 (chip tolto):** nelle schermate del tablet il chip «Da collegare» non compare più; il testo per i lettori di schermo c'è con larghezza 0 (`backup/v0928/tablet-misura/schermate/`; nella base 0.9.27 il chip si vede). Nella prova a video sul PC con un widget a cavallo del centro, il nome della pagina copre ancora circa 20 px della parte alta del widget e la pillola dell'indicatore circa 6 px. **ISSUE-105 non è chiusa su questo punto**; non c'è misura sul tablet della sovrapposizione.
- **Banco:** non aggiornato; resta 0.9.27. La 0.9.28 non è sul tablet.
