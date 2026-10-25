# REP-20261013-002 — Piano: una sola barra in basso (opzione A)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261013-002. Piano dell'opzione A di [REP-20261013-001](REP-20261013-001-barre-ridondanze.md). |
| Stato | Tappe 1-6 completate nel codice; banco `aca-system:0.9.3` dal 2026-10-14 alle 10:07. Tappa 0 e tappa 7 in parte: viewport e prestazioni misurati sul Tab M11; TalkBack, gesto dal bordo, schermo intero e app installata non provati. Il piano è stato approvato dall'utente il 2026-10-13. |
| Data | 2026-10-13, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`). Workflow di pianificazione: tre proposte («minimo», «android», «accessibile»), un giudizio, una sintesi e un controllo di completezza. |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` più il working tree non committato (REP-20261012-001…004, REP-20261013-001). |
| Richiesta di riferimento | Chat del 2026-10-13: «metti la 0.9.2 sul banco e prepara il piano». |
| Autorizzazione | Solo il piano: questo report, la proposta [ADR-0013](../decisions/ADR-0013-barra-unica.md) e le righe negli indici. Nessuna modifica al codice, nessun banco nuovo, nessun commit. Il piano non autorizza l'implementazione: servono il sì dell'utente e ADR-0013 accettata (AGENTS.md). |
| Aggiornamento del 2026-10-14 | L'utente ha approvato l'idea e ADR-0013 è accettata (vedi «Risposte dell'utente»). Su richiesta dell'utente («continua», 2026-10-14) le tappe 1-5 sono state eseguite nel codice e la tappa 6 nei documenti, con un workflow di implementazione a subagenti (il modello esatto dei subagenti non è registrato; questa fase documentale: Claude Code, Sonnet 5.5, `claude-sonnet-5-5`). Nessun commit, nessuna modifica al backend, nessun docker né adb. Le tappe 0 (misure sul tablet) e 7 (banco 0.9.3 e dispositivo) non sono state eseguite. Il testo del piano sotto resta com'era al 2026-10-13. |

## Richiesta

> «metti la 0.9.2 sul banco e prepara il piano»

- **La 0.9.2 sul banco.** C'è dal 2026-10-13 alle 17:45, con «Fine» al posto di «Conferma». Immagine, copia a freddo del volume, controlli e ripristino sono in [infrastructure.md](../infrastructure.md), righe 7-11, e in REP-20261013-001:102. L'ha fatto l'agente principale. Questo report non la riverifica dal vivo.
- **Il piano.** È l'opzione A di REP-20261013-001: togliere la barra in alto e portarne le funzioni nella fascia in basso.

## Contesto e decisioni dell'utente

**Verifica di partenza** (REP-20261013-001):
- la barra in basso va tenuta, perché quasi ogni comando è l'unico modo di fare qualcosa;
- la barra in alto si può togliere come striscia, con la sua fascia di 64 px, ma le sue funzioni vanno spostate: Sistema, «Modifica», connessione, ora e chip.

**Risposte dell'utente del 2026-10-13** (citate in REP-20261013-001:76-84):
- **App dal Play Store, a schermo intero,** sul tablet a muro e fuori casa (ISSUE-048, non iniziato). Il guadagno di spazio diventa reale.
- **Sistema serve all'installatore,** che configura l'app per il cliente. Può stare meno in vista, ma deve restare raggiungibile, anche con la disposizione bloccata. Il PIN è ISSUE-023, fuori da questo piano.
- **Chi è in casa diventa un widget** (ISSUE-049, fuori da questo piano). Fino ad allora i chip delle persone restano.
- **«Fine» al posto di «Conferma»:** approvato e sul banco con la 0.9.2.

**Persona tipo:** Giuseppe, 65 anni, poco pratico ([REP-20261009-001](REP-20261009-001-test-ux-persona.md)). Legge male sotto i 24 px e non riconosce le icone senza scritta.

**Dispositivi:**
- Lenovo Tab M11: in Chrome 1024×472 (DPR 1,875); a schermo intero circa 1024×640, da misurare.
- Tablet delle demo: 1280×665 in Chrome (DPR 2).
- Telefoni, in verticale e in orizzontale.

**Vincoli:**
- Kit 2 (ADR-0011), primitive condivise (ADR-0004), italiano e mx-icons (ADR-0005);
- ADR-0007 (interfaccia OS) e ADR-0012 con D1 (copertina senza barra in alto, «Fine» in basso);
- design.md:58 e :63 (fascia in basso di altezza costante);
- `footerBand.ts` (densità della barra), `appShell.css`, `deviceClass.ts` (`REFERENCE_AREAS`, `cellMetrics`);
- prestazioni appena ottimizzate (REP-20261012-003: livelli `will-change`, niente ridisegni costosi).

## Obiettivo e perimetro

**Obiettivo.** Un piano verificabile per l'opzione A, che l'utente possa approvare o correggere.

**Perimetro del lavoro futuro, se approvato:**
- spostare la barra di stato nella fascia in basso, con lo stesso componente;
- ridurre la fascia in alto alla sola area sicura;
- adattare la densità della fascia, la pillola «Annulla» della vista pagine, i test e i documenti.

**Esclusioni:** vedi [Cosa non fa](#cosa-non-fa).

**Modifiche preesistenti.** Il working tree ha molte modifiche non committate (REP-20261012-001…004 e 0.9.2). Il piano le preserva. Codex e altre sessioni scrivono spesso in `LauncherScreen.tsx` (oggi 1868 righe): prima di ogni tappa vanno ricontrollati il diff vivo e i numeri di riga.

## Criteri di completamento

**Di questo incarico (il piano):**
- report e proposta ADR-0013 scritti, con richiesta, decisioni dell'utente, piano, rischi, tappe e domande;
- righe negli indici dei report e delle decisioni;
- nessuna modifica al codice.

**Del lavoro futuro, se approvato:**
1. In vista normale, su ogni pagina tranne la copertina, ora, connessione, Sistema, chip e «Modifica» stanno nella fascia in basso.
2. La fascia in alto non riserva più 64 px: l'area delle pagine cresce di 64 px in ogni stato.
3. Il rettangolo della griglia è identico in vista normale, copertina, modifica, vista pagine e selezione (design.md:63).
4. Righe e chiavi delle disposizioni salvate non cambiano (test di guardia).
5. Sistema si apre anche con la disposizione bloccata.
6. «Modifica» e «Fine» non sono mai visibili insieme. Un doppio tocco nell'angolo non entra ed esce.
7. Nella vista pagine la pillola «Annulla» non copre la scheda centrale.
8. Pillole, indicatore e nome della pagina non si sovrappongono. I bersagli restano di 44 px.
9. Le prestazioni sul tablet delle demo non peggiorano rispetto alla 0.9.2, con lo stesso script di REP-20261012-003.
10. Typecheck, lint, tipografia, colori, `i18n:check`, suite completa e build verdi.

## Il piano

### L'idea in breve

- **La barra di stato non si cancella: cambia posto.** `StatusBar` va nella fascia in basso con le stesse props, le stesse classi e gli stessi selettori del fuoco (`[data-launcher-edit]`, `.aca-status-bar`: LauncherScreen.tsx:904 e 955).
- **Posizione assoluta nella fascia.** La barra sta in `position: absolute` dentro l'area di griglia della fascia, che è già `position: relative` (appShell.css:81).
  - Così non dimensiona le colonne. La barra della modifica nascosta invece le dimensiona e ha bisogno della regola `:has` (appShell.css:117 e 135-137).
  - La fascia resta di 88 px, o di 152 sul telefono in verticale.
- **La fascia in alto diventa la sola area sicura:** le pagine guadagnano 64 px in tutti gli stati.
- **Vista normale:**
  - a sinistra il lato «sistema»: ora grande, LED con la parola, ingranaggio di Sistema solo icona;
  - al centro l'indicatore con il nome, invariato;
  - a destra il lato «casa»: i chip scorrevoli, poi «Modifica» con il testo, nell'angolo dove in modifica compare «Fine».
- **Copertina, modifica, vista pagine e widget selezionato** restano come oggi. D1 resta nella sostanza: la copertina non mostra la barra e «Fine» sta in basso.

### Disposizione per dispositivo e stato

**1. Tablet in orizzontale, fascia su una riga (da 40rem).** Lenovo a schermo intero (1024×640 o 1280×800, da misurare), tablet delle demo 1280×665 in Chrome, Lenovo in Chrome 1024×472.

| Stato | Sinistra | Centro | Destra |
|---|---|---|---|
| Normale (pagine di widget e speciali) | Ora, LED con «Sincronizzato», ingranaggio Sistema | Indicatore e nome | Chip scorrevoli, «Modifica» con testo |
| Disposizione bloccata | Come «Normale» | Come «Normale» | Come «Normale»; «Modifica» mostra l'avviso del blocco |
| Copertina | Vuoto | Indicatore con «Copertina» | Vuoto |
| Modifica | «+ Widget», oppure la nota sulle pagine speciali | Indicatore | «Pagine» e «Fine» arancione |
| Modifica con il vassoio aperto | — | Vassoio sopra la fascia | — |
| Vista pagine | — | Barra delle pagine su tutta la fascia | — |
| Widget selezionato o trascinato | — | Barra del widget su tutta la fascia | — |
| Foglio aperto (dettagli, impostazioni) | — | Il foglio copre la fascia | — |

Note per stato:
- **Normale.** Stime a 1024 px con 5 pagine: circa 356 px per lato, con l'indicatore misurato sul nome più largo ammesso (14 rem). A sinistra circa 296 px alla densità «testo» (circa 15 px in più se l'ora è a 33 px, vedi la nota sull'ora). A destra circa 138 px per «Modifica» e circa 210 per i chip.
- **Ordine di riduzione quando manca posto**, scelto da footerBand:
  1. «Sincronizzato» resta solo per i lettori di schermo;
  2. «Modifica» diventa solo icona;
  3. le tacche dell'indicatore si stringono (`--aca-band-room`).

  Le parole delle fasi anomale («Connessione…», «Riconnessione…», «Non raggiungibile», «Sessione scaduta») restano sempre scritte, al massimo in ellissi. I chip non entrano nella misura: scorrono.
- **Disposizione bloccata.** «Modifica» si rifiuta e mostra «Disposizione bloccata: sbloccala in Sistema → Schermata Home» (LauncherScreen.tsx:948-952) nella pillola sopra la fascia (edit.css:836-841). Sistema resta a sinistra e porta allo sblocco (HomeScreenSection.tsx:35-41).
- **Copertina.** D1: la barra è nascosta, inerte e muta (LauncherScreen.tsx:1597; pageDescriptor.ts). L'ora è quella della copertina. Si entra in modifica con la pressione lunga, come oggi.
- **Modifica.** La barra della modifica è invariata (EditToolbar.tsx:76-105).
  - La pillola della barra di stato scende (240 ms). La barra della modifica sale dopo 180 ms. «Modifica» e «Fine» non sono mai visibili insieme.
  - Guardia di circa 400 ms, solo per il puntatore, contro il doppio tocco nello stesso angolo.
  - Fuoco: da «Modifica» a «Fine» e ritorno (LauncherScreen.tsx:896-907 e 955).
  - Sistema non è raggiungibile in modifica, come oggi (ADR-0012:61).
- **Vassoio aperto.** Invariato: il vassoio è fisso sopra la fascia (edit.css:302-317) e la barra di stato è già nascosta.
- **Vista pagine.** Invariata. La pillola «Annulla» scende dall'alto (edit.css:857-860). Senza la fascia coprirebbe la cima della scheda centrale: stima di 10-20 px a 1024×640, circa 35 a 1024×472. La corregge la tappa 4.
- **Widget selezionato.** Invariato (WidgetActionBar; LauncherScreen.tsx:1629-1665). La fascia ha la stessa altezza, quindi il widget sotto il dito non si sposta.
- **Foglio aperto.** Il foglio è un `<dialog>` modale nativo che sale dal basso nel top layer (Sheet.tsx:31 e 63).
  - Oggi l'ora resta visibile in alto dietro il foglio; con A resta coperta finché il foglio è aperto.
  - Alla chiusura il fuoco torna a chi l'ha aperto, anche al chip multimedia nella fascia.

**In tutti gli stati e su tutti i dispositivi:**
- **Avviso di connessione** (ConnectionNotice): in cima allo schermo, nello stesso slot (AppShell.tsx:32). Oggi non ha margine sopra (statusBar.css:229), quindi va aggiunto. Mentre è visibile abbassa le pagine, come oggi.
- **Sistema aperto:** il launcher resta montato e nascosto (AppRoutes.tsx:24-26). Alla chiusura il fuoco torna sull'ingranaggio (AppRoutes.tsx:39 e 47).

**2. Fascia su una riga ma stretta.** Telefono in orizzontale 844×390, Lenovo in verticale 640×1024 (608 px utili).

| Stato | Sinistra | Centro | Destra |
|---|---|---|---|
| Normale | Ora, LED (parola solo per i lettori di schermo), ingranaggio | Indicatore e nome | Chip (spesso uno solo in vista), «Modifica» con testo se c'è posto, altrimenti solo icona |
| Copertina, modifica, vista pagine, widget selezionato | Come sul tablet | Come sul tablet | Come sul tablet |

- Stime con 5 pagine: circa 265 px per lato a 844, circa 150 a 640.
- Con 7 o più pagine le tacche scendono sotto 44 px, fino alla pallina di 28 (pageIndicator.css:35-42), anche in vista normale. Già oggi succede in modifica.
- In verticale la barra della modifica resta a icone (design.md:291). Ritardo e guardia valgono anche qui.

**3. Telefono in verticale 390×844 (sotto 40rem).** Fascia di 152 px su due righe.

| Stato | Riga 1 | Riga 2 |
|---|---|---|
| Normale | Indicatore e nome, invariati | A sinistra ora, LED (parola solo per i lettori di schermo), ingranaggio; a destra chip e «Modifica» solo icona da 44 px |
| Copertina | Indicatore con «Copertina» | Vuota |
| Modifica | Indicatore | A sinistra «+»; a destra «Pagine» (icona) e «Fine» (testo), nell'angolo di «Modifica» |
| Vista pagine, widget selezionato | Barra su tutta la larghezza | Vuota |

- Usa la riga 2, oggi vuota apposta (appShell.css:76-95): l'altezza della fascia non cambia.
- Sparisce la seconda riga di chip in alto (statusBar.css:253-269), che oggi toglie circa 44 px alle pagine.
- Stime: sinistra circa 180 px, destra 52, chip circa 110.
- **Connessione in errore.** La parola prende il posto dei chip e può andare in ellissi («Sessione sc…»). L'avviso in cima la ripete, subito per la sessione scaduta.
- Nella vista pagine la pillola «Annulla» resta lontana dalla scheda (stima).

**Rotazione:**
- La fascia passa da una a due righe a 40rem. La barra cambia riga senza toccare la griglia, perché è in posizione assoluta.
- La classe dello schermo cambia come oggi (tablet ↔ tabletPortrait, phone ↔ phoneLandscape) e ogni classe tiene le sue disposizioni.
- La chiave della cache della fascia contiene righe e larghezza: dopo una rotazione la fascia si rimisura.
- **Caso limite:** il Lenovo in verticale è largo 640 px, cioè proprio 40rem. Se le impostazioni di accessibilità di Android ingrandiscono il testo o la pagina, la soglia può cambiare lato e la fascia passa a due righe (152 px). Va provato con le impostazioni del cliente.

### Collocazione di ogni funzione

| Funzione | Oggi | Con A |
|---|---|---|
| Fascia riservata in alto | 64 px più l'area sicura (appShell.css:38-43), vuota anche in copertina, modifica e vista pagine (statusBar.css:37-44) | Solo l'area sicura |
| Ora | 16 px (StatusBar.tsx:95-112) | Pillola sinistra, primo elemento, circa 28-33 px |
| Connessione (LED e parola) | StatusBar.tsx:113; ConnectionStatus.tsx:28-41 | Pillola sinistra, dopo l'ora |
| Avviso di connessione | Slot notice (AppShell.tsx:32; LauncherPage.tsx:149-157) | Stesso slot, in cima, con margine superiore |
| Ingranaggio Sistema | Accanto alla matita, in alto a destra (StatusBar.tsx:151-162) | Pillola sinistra, dopo la connessione |
| Pallino degli aggiornamenti | StatusBar.tsx:83-86 e 161 | Resta sull'ingranaggio |
| «Modifica» | Matita solo icona (StatusBar.tsx:141-150) | Estremità destra, matita e testo |
| Chip delle persone | Colonna centrale in alto (StatusBar.tsx:116-138) | Riga scorrevole nella pillola destra |
| Chip di gruppo, sensore, batterie | statusChips.ts:272-310 | Stessa riga scorrevole |
| Chip allarme | statusChips.ts:171-198, solo in vista normale | Stessa riga, solo in vista normale |
| Chip multimedia (l'unico premibile) | statusChips.ts:200-270 | Stessa riga, ancora premibile |
| Pillola «Annulla» della vista pagine | Scende nella fascia vuota (edit.css:857-860) | Stessa posizione, con una riserva in alto nel calcolo delle schede |
| Avviso «Disposizione bloccata» | Pillola sopra la fascia (edit.css:836-841) | Invariato |

Dettagli e motivi:
- **Fascia in alto.** `--aca-shell-head` vale solo `env(safe-area-inset-top)`. `--aca-head-top` e `--aca-head-pad` spariscono; il meccanismo del pager resta (launcher.css:52-58). Un eventuale margine di 12 px in alto si decide dopo la prova del gesto di Android sul Lenovo. Sul tablet a schermo intero vale +17 % di cella; sul telefono toglie anche la riga dei chip.
- **Ora.** A schermo intero è l'unica ora su tutte le pagine, e la persona ha bisogno di almeno 24 px (REP-20261009-001:92). Il ticchettio del minuto cambia solo il testo del nodo, che il MutationObserver non osserva (footerBand.ts:201-206): nessuna rimisura.
  - **Primitiva da scegliere nella tappa 3.** Non c'è una primitiva di testo a `--aca-step-3` che non sia un titolo: `Title` produce h1-h3. La primitiva degli orologi è `Display`, con `as="time"` e `dateTime`, ma parte da 33 px (step-4) con peso 300.
  - Consigliato: `Display size="sm"`, senza toccare le primitive. Il tratto sottile va provato con la persona.
  - In alternativa: una taglia nuova di `Body` o `Numeric` a step-3 con peso 500, cioè una piccola estensione di primitiva (ADR-0004), da registrare.
- **Connessione.** `role=status` e `aria-live` restano (ConnectionStatus.tsx:30-34). È l'unico segnale positivo e delle fasi di riconnessione: l'avviso di errore arriva dopo 5-15 s (connectionHealth.ts:5-6).
  - Alla densità corta solo «Sincronizzato» passa in sr-only, non in `display: none`.
  - La regola vale solo dentro la fascia: in Sistema → Collegamento lo stesso componente resta scritto per intero.
- **Avviso di connessione.** Si vede in tutti gli stati. «Accedi di nuovo» è il secondo ingresso a Sistema.
- **Ingranaggio Sistema.** Serve all'installatore: è discreto per posizione, non per contrasto.
  - `IconAction` da 44 px, solo icona, con la nuvoletta UI-010. Una pressione di 500 ms mostra la nuvoletta e non apre Sistema (IconAction.tsx:16).
  - Contrasto non testuale di almeno 3:1 (WCAG 1.4.11).
  - Il nome inizia con «Sistema», perché AppRoutes.tsx:39 e 47 ritrovano il pulsante così.
  - `IconAction` non ha il pallino: si avvolge nello span esistente con `Badge` (statusBar.css:138-148).
  - Visibile in vista normale su ogni pagina tranne la copertina, anche con la disposizione bloccata.
  - Sta lontano dall'angolo «Modifica»/«Fine», dove un tocco sbagliato aprirebbe Sistema senza PIN (ISSUE-023).
- **Pallino degli aggiornamenti.** Badge blu e nome «Sistema, N aggiornamenti disponibili». Che Sistema non li elenchi è un'incoerenza separata.
- **«Modifica».** Pulsante `control` con matita e testo, come «Pagine» (EditToolbar.tsx:32-47).
  - `ToolbarButton` è locale a EditToolbar: va esportato o ricostruito con le stesse primitive.
  - `data-launcher-edit` resta. Alla densità «icone» diventa solo icona, con `aria-label` e `title`.
  - È l'unico ingresso visibile e da tastiera: la pressione lunga funziona solo con il puntatore (useLongPress.ts:77-85). La persona l'icona da sola non la riconosce (REP-20261009-001:292).
- **Chip.** Stesso codice: `useOverflowEdges` (StatusBar.tsx:43-64) e maschere (statusBar.css:101-124). Sono marcati come flessibili e non entrano nella misura della fascia.
  - Persone: restano per decisione dell'utente fino al widget di ISSUE-049.
  - A destra c'è più posto che a sinistra: a 1024 px circa 210 px contro circa 60.
  - Allarme: l'avviso in cima in ogni stato è un comportamento nuovo, da autorizzare a parte. Sul telefono il chip può finire fuori vista: rischio dichiarato.
  - Multimedia: apre ancora MediaPlayerDetails. Toglierlo è una proposta separata.
- **Pillola «Annulla» nella vista pagine.** Il calcolo delle schede (Pager.tsx:92-111) e il loro centraggio (launcher.css:194-200) tengono una riserva in alto pari alla pillola. Così le schede restano dove sono oggi e crescono solo se c'è spazio. La pillola resta in alto per evitare che un secondo «−» cada su «Annulla».
- **Avviso del blocco.** Sta a 92 px dal fondo (edit.css:840), sopra la fascia di 88: non si sovrappone alla barra.

### Impatto sulla griglia

**Formula** (cellMetrics, deviceClass.ts:267-293): cella = floor(min((L − gap·(c−1))/c, (A − gap·(r−1))/r)).
- L = viewport − 2 × gutter, con gutter = clamp(16, 2,5vw, 28) (tokens.css:158).
- A = viewport − fascia in alto − fascia in basso − 48 px di margine della pagina (launcher.css:400-408).
- Fascia in alto: oggi 64 px; con A solo l'area sicura.
- Fascia in basso: 88 px da 40rem in su, 152 sotto; invariata.
- Gap minimo: tablet 16, tablet verticale 14, telefono 10 (deviceClass.ts:63-68).

**Stime per schermo.** Le ho ricalcolate con gli stessi valori del codice; non sono misure.

| Schermo | Classe e griglia | Oggi (px) | Con A (px) |
|---|---|---|---|
| Lenovo a schermo intero 1024×640 | tablet 8×5 | 75 | 88 (+17 %); 85 con 12 px di margine in alto |
| Lenovo a schermo intero, griglia «Compatta» di Sistema | tablet 6×4 | 98 | 114 |
| Lenovo a schermo intero, pagina con 8 colonne scelte | tablet 8×4 (rowsOn) | 98 | 107, limitata dalla larghezza |
| Lenovo con la sola barra di stato di Android, circa 1024×616 | tablet 8×5 | 70 | 83 |
| Lenovo come app standalone con barre di stato e di navigazione, circa 1024×568 | phoneLandscape 8×2 (lato corto sotto 600) | 112 | 112, limitata dalla larghezza |
| 1280×800 | tablet 8×5 | 107 | 120 |
| Tablet delle demo 1280×665 | tablet 8×5 | 80 | 93 |
| Lenovo in Chrome 1024×472 | phoneLandscape 8×2 | 112 | 112 |
| Lenovo in verticale 640×1024 | tabletPortrait 6×8 | 89 | 89, limitata dalla larghezza |
| Telefono 390×844 | phone 4×6 | 82 | 82 |
| Telefono nell'app, circa 390×780: senza chip / con la riga di chip | phone 4×6 | 77 / 70 | 82 |
| Telefono in Chrome, circa 390×700: senza chip / con la riga di chip | phone 4×6 | 64 / 57 | 75 |
| Telefono in orizzontale 844×390 | phoneLandscape 8×2 | 90 | 91 |

La copertina del tablet (3×1) resta di 313 px, limitata dalla larghezza.

**Letture importanti:**
- **Conta più la classe dello schermo della barra.** A schermo intero il Lenovo passa alla classe tablet (8×5). Le celle, 75 oggi e 88 con A, restano più piccole di quelle in Chrome (112). REP-20261009-001:369 lo aveva già misurato: «peggio per un presbite».
- **La leva più forte per la persona** è la griglia «Compatta», già presente in Sistema: con A arriva a 114 px. È solo una domanda all'utente, senza codice.
- **Come app standalone con le barre di Android** il lato corto scende probabilmente sotto 600 px (PHONE_MAX_SHORT_SIDE, deviceClass.ts:235). Il Lenovo diventa phoneLandscape e togliere la barra non ingrandisce nulla. Va misurato prima (tappa 0).
- **Sul telefono sparisce un sobbalzo di oggi.** La riga dei chip compare e sparisce con i chip (statusBar.css:263-265). Quando l'unico chip compare o sparisce, per esempio il multimedia quando parte o finisce la musica, l'area cambia di circa 44 px e le celle si rimisurano: a 390×780 da 77 a 70. Con A la barra è in posizione assoluta dentro la fascia, che ha `container-type: inline-size` (appShell.css:83): i chip non toccano più la griglia. È una stima dal codice.

**REFERENCE_AREAS resta invariata** (deviceClass.ts:155-160):
- Con 64 px in più, `rowsOn` (:174-181) cambierebbe le righe per molte colonne:
  - tablet: 3, 5, 7 e 9 colonne, per esempio la copertina da 3×1 a 3×2;
  - phoneLandscape: 5, 6, 9 e 10;
  - telefono: colonne salvate 2-4 e 7-10.
- Cambierebbero quindi le chiavi di `columnsKey` (:205-212) e le disposizioni salvate verrebbero rimescolate.
- La legge anche `sizeAcrossKeys` (layout.ts:751-764), la conversione della grandezza visiva tra pagine di REP-20261012-001. Tenendola ferma resta uguale anche quella.
- Si cambia solo il commento (:146-154). Un test di guardia blocca `rowsOn`, `columnsKey` e alcuni esiti di `sizeAcrossKeys`.

**Altezza costante** (design.md:63):
- La fascia in basso resta `--aca-shell-foot` in ogni stato.
- La barra di stato usa solo spazi oggi vuoti in vista normale (le colonne laterali, la riga 2 del telefono) ed è in posizione assoluta, quindi non conta nel dimensionamento.
- L'area delle pagine è identica in vista normale, copertina, modifica, vista pagine e selezione. Resta l'eccezione di oggi: l'avviso di connessione nel flusso abbassa le pagine mentre è visibile.

### Accessibilità

**Nomi e testo:**
- «Modifica» ha testo visibile uguale al nome accessibile (WCAG 2.5.3). Diventa solo icona soltanto alla densità minima, con `aria-label` e `title`.
- «Sistema» è un'icona con `aria-label` «Sistema» oppure «Sistema, N aggiornamenti disponibili», con la nuvoletta UI-010 alla pressione di 500 ms, al passaggio del mouse e al fuoco. Contrasto non testuale di almeno 3:1.
- L'ora a 28-33 px supera i 24 px indicati per la persona.
- Tutti i comandi restano a 44 px.
- I chip restano a 13,3 px. È un limite noto, che per le persone si chiude con ISSUE-049.

**Connessione:**
- `role=status` con `aria-live` resta sempre nel DOM (ConnectionStatus.tsx:30-34).
- «Sincronizzato» passa in sr-only, non in `display: none`, e solo dentro la fascia.
- Le fasi anomale restano scritte: il colore non è mai l'unico segnale quando conta (WCAG 1.4.1).
- Come oggi, la barra nascosta è `inert` e `aria-hidden` (StatusBar.tsx:89-93): in copertina e in modifica gli errori arrivano dall'avviso.

**Struttura.** La radice passa da `<header>` (landmark banner) a un `div` con `role=group` «Stato e comandi» dentro `<footer>`, come la barra della modifica (EditToolbar.tsx:68-74). Chi naviga per landmark perde il banner.

**Ordine di tabulazione:**
- In vista normale: ora e connessione (non focalizzabili), Sistema, chip premibili, «Modifica», indicatore. La barra è montata prima dell'indicatore, come EditToolbar oggi.
- Rispetto all'ordine visivo «Modifica» precede l'indicatore. È lo stesso scarto della barra della modifica: da accettare o verificare con TalkBack. Con un solo componente non si può evitare.
- I comandi ora vengono dopo il contenuto della pagina. Con Maiusc+Tab dall'inizio si arriva presto alla fascia, che è in fondo al DOM.

**Fuoco nei passaggi:**
- Dalla tastiera «Modifica» porta il fuoco su «Fine» (LauncherScreen.tsx:955: il selettore `.aca-status-bar` resta).
- «Fine» ed Esc lo riportano su `[data-launcher-edit]`, e sulla copertina all'indicatore (:896-907).
- La chiusura di Sistema lo riporta sull'ingranaggio (AppRoutes.tsx:39 e 47).
- La chiusura di un foglio lo riporta a chi l'ha aperto, anche al chip multimedia.

**Tastiera.** Nessuna scorciatoia nuova. L'indicatore resta l'unico cambio di pagina da tastiera (WCAG 2.1.1).

**Movimento ridotto.** Solo dissolvenza di 120 ms, come edit.css:219-225 e statusBar.css:45-51. Il LED non pulsa.

**Doppio tocco.** Ritardo di 180 ms del gruppo che arriva e guardia di circa 400 ms solo per il puntatore. Tastiera e TalkBack non sono rallentati.

**Da provare sul dispositivo:** TalkBack sul Lenovo (lettura della barra in fondo, annunci della connessione, nuvoletta dell'ingranaggio, guardia), Maiusc+Tab con una tastiera, ingrandimento del testo di Android.

### Prestazioni

Riferimento: REP-20261012-003 e ISSUE-047.
- **Rimisure della fascia.** Con la barra nella fascia, footerBand rimisura anche al passaggio tra copertina e pagine e all'uscita dalla modifica. Oggi una misura costa circa 17 ms di stile forzato per tre densità e può far perdere un fotogramma sul Mali-G57. Rimedio (tappa 2): una cache dell'esito per chiave, usata nei cambi di visibilità.
- **Cache sicura.** La cache non deve restituire esiti vecchi:
  - se cambia il contenuto e la chiave no (nota ↔ «+ Widget», EditToolbar.tsx:76-88);
  - se cambia solo il testo dentro la stessa fase («Non raggiungibile» ↔ «Sessione scaduta» hanno la stessa classe).

  Servono l'invalidazione sui cambi di contenuto dei gruppi misurati e un ResizeObserver sui gruppi, perché il MutationObserver non osserva `characterData`.
- **Osservatore della fascia.** Ora vede anche le mutazioni della barra di stato. `changesBand` (footerBand.ts:102-107) deve ignorare i chip (`data-band-flex`) e l'orologio, con un filtro economico.
- **Densità per barra.** Oggi la densità è un attributo della fascia (`data-band-density`) che vale per tutti i discendenti (edit.css:262-282). Durante lo scambio di 240 ms le due barre sono visibili insieme: la barra che esce cambierebbe densità mentre scende. La densità va scritta sulla barra misurata, o in un attributo distinto per ciascuna barra.
- **Livelli.** I livelli `will-change` passano da uno (la barra) a due (le pillole), piccoli. Celle più grandi danno più superficie da rasterizzare: va misurato.
- **Ritardo di 180 ms.** Si ottiene con la classe `is-editing` già presente su `.aca-shell` (AppShell.tsx:30), senza nuovi selettori `:has` sulla fascia.
- **Contenimento.** La fascia ha `container-type: inline-size`: i cambi dei chip non ridisegnano più la griglia (oggi sul telefono sì).
- **Verifica.** Si misura con lo stesso script sul tablet delle demo (copertina ↔ pagina, ingresso e uscita dalla modifica, apertura e chiusura della vista). Il conteggio dei render di LagRenders non deve peggiorare.

### Dati salvati e impostazioni di Sistema

- **Nessuna migrazione.** Il formato salvato non cambia: `LauncherLayout` versione 1, profili, `headerSettings`, persone fissate e indicatori. Le chiavi delle disposizioni restano, perché `REFERENCE_AREAS` non cambia.
- **Verifica:** un profilo esportato dalla 0.9.2 (Sistema → Profili) si importa nella 0.9.3 e dà le stesse chiavi e la stessa disposizione.
- **Sistema → Barra di stato.** La sezione continua a configurare persone fissate e indicatori della stessa barra, ora in basso. Il nome «Barra di stato» resta corretto.
- **Impostazioni già senza effetto, che restano senza effetto:**
  - «Titolo» e «Mostra il titolo»: StatusBar non ha una prop per il titolo (StatusBarSection.tsx:101-120);
  - «Mostra l'ora»: la barra riceve sempre l'ora (StatusBarSection.tsx:121-125; LauncherScreen.tsx:1593);
  - «showCover» degli indicatori: salvato, ma la barra non c'è in copertina.
- **Proposta separata:** togliere questi comandi, oppure far funzionare «Mostra l'ora». Quest'ultima darebbe all'installatore un modo per lasciare più posto ai chip, ma è un comportamento nuovo.

### Rischi

1. **Cambia decisioni approvate:** ADR-0012 punto 3 e la conseguenza :58; design.md:58, 63, 67, 284, 287-291 e 318. Senza il sì dell'utente e ADR-0013 accettata non si scrive codice (AGENTS.md).
2. **La modalità del tablet decide più della barra.** Come app standalone con le barre di Android visibili il Lenovo diventa probabilmente phoneLandscape (8×2, 112 px) e togliere la barra non ingrandisce nulla. A schermo intero diventa tablet (8×5) e le celle salgono solo a 88 px, comunque meno che in Chrome. Mitigazione: misura nella tappa 0 e decisione con ISSUE-048.
3. **Disposizioni rimescolate** se qualcuno «allinea» `REFERENCE_AREAS` alla nuova cornice. Mitigazione: test di guardia nella tappa 1.
4. **Prestazioni:** rimisure, livelli e superficie, come sopra. Mitigazione: cache, filtri e misura sul tablet.
5. **Cache con esiti vecchi.** Mitigazione: invalidazione sui cambi di contenuto e ResizeObserver sui gruppi, con un test.
6. **Doppio tocco nello stesso angolo:** «Modifica» poi «Fine» entra ed esce; «Fine» poi «Modifica» rientra. Mitigazione: ritardo e guardia, con un test.
7. **Pillola «Annulla» sopra la scheda centrale** nella vista pagine. Mitigazione: la tappa 4 è obbligatoria prima del banco.
8. **Fascia più affollata.** Con molte pagine o su schermi stretti le tacche scendono sotto 44 px anche in vista normale, fino a 28. Restano sopra i 24 px di WCAG 2.5.8, ma per la persona sono più piccole.
9. **Chip meno visibili,** soprattutto sul telefono (circa 110 px utili). «Allarme scattato» può finire fuori vista finché l'avviso in cima non viene approvato.
10. **Scorrimento sui chip.** Vicino al pollice, uno scorrimento sulla riga dei chip la fa scorrere invece di cambiare pagina, come oggi in alto. Da osservare nella prova con la persona.
11. **Gesto di Android dal bordo superiore,** a schermo intero: può interferire con la prima riga, che parte a 24 px dal bordo, e con «Riprova» dell'avviso. Da provare sul Lenovo; eventuale margine di 12 px.
12. **Tasto Indietro non gestito** (nessun popstate): «Fine» deve restare sempre visibile. Questo piano non lo cambia.
13. **Sistema più discreto ma ancora senza PIN** (ISSUE-023): la persona lo può aprire se lo trova.
14. **Ordine di tabulazione e landmark:** i comandi arrivano dopo i widget e il banner sparisce.
15. **Ora doppia** se le barre di Android restano visibili: l'ora dell'app ripete quella di sistema.
16. **Soglia dei 40rem** sul Lenovo in verticale con testo o pagina ingranditi da Android.
17. **Modifiche concorrenti** in `LauncherScreen.tsx`. Mitigazione: diff vivo e numeri di riga prima di ogni tappa.
18. **Test con la persona superato:** REP-20261009-001 è precedente a D1 e alla 0.9.2. Le stime non sostituiscono una nuova prova.

### Tappe

Ogni tappa si verifica da sola. Oggi vale «nessun commit Git, su richiesta dell'utente» (project-status.md:511). Senza commit, prima di ogni tappa si copiano i file toccati in `backup/`, escluso da Git, e il banco torna alla 0.9.2 con la copia del volume ([infrastructure.md](../infrastructure.md), riga 9). Con l'autorizzazione dell'utente, un commit per tappa.

**Tappa 0. Decisione, report e misure, senza codice.**
- ADR-0013 accettata, con la frase dell'utente.
- Proposte fuori perimetro registrate nel registro dei problemi con i prossimi numeri liberi (oggi da ISSUE-050), elencate in [Cosa non fa](#cosa-non-fa).
- Misure sul Lenovo e sul tablet delle demo: vedi [Misure sul tablet](#misure-sul-tablet). Sulla 0.9.2 si registrano anche l'impronta geometrica e le prestazioni di riferimento.
- **Condizione per andare avanti:** se la modalità finale lascia il tablet in phoneLandscape, l'utente decide se procedere comunque (guadagni sui telefoni) o fermarsi all'opzione B.
- File: questo report; ADR-0013 e `decisions/README.md`; `project-status.md`; `verification.md` (misure).
- Evidenze: valori del viewport con data, modalità e classe (`deviceClassFor`), screenshot, misure di riferimento.

**Tappa 1. Test di guardia, senza cambiare comportamento.**
- `rowsOn` e `columnsKey` fissati per tutte le classi e per 2-10 colonne.
- `cellMetrics(973, 440, 8×5, 16)` = 75 e `cellMetrics(973, 504, 8×5, 16)` = 88.
- Alcuni esiti di `sizeAcrossKeys` tra copertina e pagine.
- Gli esiti attuali di `fitBand` per la barra della modifica.
- File: `__tests__/LauncherGeometry.test.ts` o `LauncherColumns.test.tsx`; `Polish2Cornice.test.tsx` solo se mancano casi.
- Esito atteso: suite mirata verde sulla 0.9.2.

**Tappa 2. footerBand per due barre, nessun cambiamento visibile.**
- EditToolbar riceve i marcatori `data-band-bar` e `data-band-group` (start/end).
- `applyFooterBand` misura la barra visibile tra quelle marcate.
- `fitBand` riceve le opzioni per barra:
  - per la barra della modifica `labelMin` e `labelGap` restano come oggi;
  - per la barra di stato valgono 0, e l'indicatore si misura sul nome più largo ammesso (14 rem), così la chiave non dipende dalla pagina.
- `--aca-band-end` non lo legge nessun CSS (compare solo in commenti, pageIndicator.css:12): la barra di stato non eredita la riserva `labelMin`. La correzione per la barra della modifica è una proposta separata.
- Nuova variabile `--aca-band-side`: il massimo della pillola flessibile. Serve perché un elemento in posizione assoluta non può usare `subgrid`.
- Densità scritta per barra (vedi Prestazioni). Lo stato `data-band-measure` vale anche per i gruppi della barra di stato.
- Cache dell'esito per chiave: barra, righe, larghezza, tacche, fase della connessione. Si usa solo nei cambi di visibilità.
- Un cambio di contenuto dei gruppi misurati (`childList`) invalida la cache. Un ResizeObserver sui gruppi copre i cambi di solo testo.
- `changesBand` ignora i chip (`data-band-flex`) e l'orologio.
- File: `templates/app-shell/footerBand.ts:57-78, 102-174, 182-219`; `components/system/edit/EditToolbar.tsx` (solo attributi); `edit.css:256-282` (selettori della densità); `appShell.css` (solo commenti).
- Test:
  - `Polish2Cornice` ed `EditToolbarHidden` verdi senza cambiare le attese;
  - `LagRenders` («the footer band measures what can change its widths»): stesse attese per la barra della modifica, più i casi della barra di stato;
  - nuovo `FooterBandCache.test`: mostrare e nascondere con la stessa chiave non fa letture di layout (conteggio di `getBoundingClientRect` e `getComputedStyle`, come nei test Lag); nota ↔ «+ Widget» e un cambio di testo della connessione rimisurano;
  - typecheck strict e lint.

**Tappa 3. Barra di stato nella fascia: il cambiamento visibile.**
- `StatusBar`, stesse props:
  - radice `div` con `role=group` «Stato e comandi»;
  - pillola `__start`: ora (primitiva scelta, `<time>`), `ConnectionStatus`, Sistema (`IconAction` con `Badge`, nome che inizia con «Sistema»);
  - pillola `__end`: chip (`useOverflowEdges`, `data-band-flex`) e «Modifica» (pulsante `control` con testo, `data-launcher-edit`).
- CSS della barra:
  - posizione assoluta nell'area di griglia della fascia (riga 1 da 40rem, riga 2 sotto), radice con `pointer-events: none`;
  - la regola generica `.aca-shell__footer > :not(.aca-indicator)` (appShell.css:101-105) non deve piazzarla: serve una regola propria;
  - pillole come i gruppi della barra della modifica (edit.css:171-188: Kit 2, `--aca-socket-shadow`), con `will-change` sulle pillole;
  - nascosta, scende verso il basso; con il movimento ridotto solo dissolvenza;
  - densità «testo», «corta» e «icone»;
  - si toglie la regola sotto 640 px (statusBar.css:253-269).
- `ConnectionStatus`: classe che porta solo «Sincronizzato» in sr-only, attiva solo dentro la fascia.
- Montaggio:
  - LauncherScreen monta StatusBar per prima nel frammento del footer, con la stessa condizione `hidden` (:1597);
  - AppShell perde lo slot `statusBar` (AppShell.tsx:5-41);
  - `--aca-shell-head` = area sicura; via `--aca-head-top` e `--aca-head-pad` (appShell.css:28-43);
  - margine superiore per l'avviso di connessione (statusBar.css:225-231).
- Passaggi: 180 ms di ritardo del gruppo che arriva, solo nello scambio con la barra della modifica; guardia di circa 400 ms solo per il puntatore, su «Fine» dopo l'ingresso e su «Modifica» dopo l'uscita.
- Commenti da aggiornare nei file toccati: fuoco e D1 in LauncherScreen; StatusBar.tsx:66-71; appShell.css:28-37; launcher.css:40-51; edit.css:853-856 («dove la barra di stato è salita»); pageIndicator.css:12.
- Campione del kit UI dentro una fascia finta (`pages/ui-kit/UiKitPage.tsx:236`).
- File: `components/system/status-bar/StatusBar.tsx`, `statusBar.css`, `ConnectionStatus.tsx`; `templates/app-shell/AppShell.tsx`, `appShell.css`; `templates/launcher/LauncherScreen.tsx:896-907, 947-965, 1589-1612` (controllare prima il diff vivo); `components/system/edit/edit.css:202-225`; `templates/launcher/launcher.css:40-51`; eventuale esportazione di `ToolbarButton` da `EditToolbar.tsx`; `pages/ui-kit/UiKitPage.tsx`.
- Test da aggiornare:
  - `StatusBarHidden` (div al posto di header; nascosta su copertina, in modifica, nella vista pagine e con la selezione);
  - `PagerBands` (la testa è solo l'area sicura; la fascia in basso è invariata; header non più sopra il pager);
  - `PolishCornice` e `Polish2Cornice` (quest'ultimo monta AppShell con lo slot `statusBar`);
  - `LagLayers:262` (`will-change` sulle pillole invece che su `.aca-status-bar`);
  - `LauncherScreen` (barra nel footer; fuoco da «Modifica» a «Fine» e ritorno; il doppio tocco non esce);
  - `LauncherIndicatorCover`, `FixLauncherUiShell` (pulsante «Modifica»), `FixSystemConnection`, `FixSystemFocus` (fuoco di ritorno su Sistema), `SystemPage`.
- Test nuovi: «Sistema raggiungibile con la disposizione bloccata»; `role=status` presente a ogni densità; «Sincronizzato» scritto in Sistema → Collegamento; nessun salto della griglia tra gli stati; un chip che compare non cambia l'area delle pagine.
- Controlli: `lint:typography`, colori e `i18n:check` (nuovi testi «Modifica» e «Stato e comandi»).

**Tappa 4. Pillola «Annulla» nella vista pagine.**
- Una riserva in alto, pari alla pillola (area sicura + `--aca-space-3` + `--aca-float-height`), nel calcolo di k e nel centraggio delle schede.
- In alternativa, se la prova lo preferisce, si cambia la posizione della pillola in quella vista.
- File: `templates/launcher/Pager.tsx:92-111`; `templates/launcher/launcher.css:194-200`; `components/system/edit/edit.css:857-860`.
- Test: unità di `measureCards` con la riserva; `PagerOverview` e `LauncherGestures` (vista pagine e pillola in alto) da rivedere; prova geometrica: pillola e scheda centrale non si sovrappongono a 1024×640, 1024×472, 1280×665 e 390×844.

**Tappa 5. Commento di REFERENCE_AREAS.**
- Il commento (deviceClass.ts:146-154) le dichiara fissate apposta sulla cornice del 2026-10-08, per tenere ferme righe, chiavi e grandezza visiva tra pagine. I valori restano.
- Test: la guardia della tappa 1 resta verde.

**Tappa 6. Documenti.**
- ADR-0013 accettata, con la fonte umana.
- Annotazioni datate, senza cancellare nulla:
  - ADR-0012 (:33, :37, :39, :58, :79);
  - ADR-0007 (interfaccia OS; :98 «Conferma», superata dalla 0.9.2).
- design.md:58, 63, 67, 284, 287-291 e 318; annotazioni datate a :180 e :190.
- design.md:231-232 («Barra del widget: Rimuovi · Annulla · Conferma»): non è ancora annotata dopo la 0.9.2. È un residuo di REP-20261013-001, da chiudere qui o prima.
- `project-status.md`:
  - stato dell'incarico e nuove ISSUE;
  - ISSUE-047, di cui la cache copre una parte;
  - collegamenti a ISSUE-048 e ISSUE-049;
  - proposte del 2026-10-10 superate: «Bordo di ritaglio esatto sul telefono» (la riga dei chip in alto non c'è più) e «Commenti non aggiornati dopo D1» per i file toccati.
- `verification.md` e `infrastructure.md` (banco).
- Annotazione datata in REP-20261013-001 con il collegamento a questo report.
- Indici dei report e delle decisioni.
- Nessuna modifica a `documentazione/archive/`.

**Tappa 7. Verifica, banco e dispositivo.**
- Typecheck, lint, `lint:typography`, colori e `i18n:check`.
- Test mirati, poi la suite completa con `npx vitest run --maxWorkers=4`, la build e `check-bundle-size`.
- Impronta geometrica con Playwright, prima e dopo:
  - schermi: 1024×640, 1280×800, 1280×665, 1024×472, 1024×568, 640×1024, 844×390, 390×844 e 390×700;
  - stati: normale, copertina, modifica, vista pagine e selezione;
  - attese: rettangolo della griglia identico tra gli stati, fascia di altezza costante, nessuna sovrapposizione tra pillole, indicatore e nome, bersagli da 44 px.
- Profilo esportato dalla 0.9.2 importato nella 0.9.3, con le stesse chiavi.
- Prestazioni sul tablet delle demo con lo script di REP-20261012-003, confrontate con la 0.9.2.
- Banco `aca-system:0.9.3` solo con autorizzazione esplicita, con copia a freddo del volume e ripristino alla 0.9.2. Sul tablet la riga «Versione» di Sistema conferma che il service worker ha caricato la versione nuova.
- Sul Lenovo e sul tablet delle demo: TalkBack, gesto dal bordo superiore, doppio tocco, breve prova con la persona.
- File: script npm del frontend; `progetto/.env` e `backend/src/config/version.ts` solo con l'autorizzazione al banco; `infrastructure.md`, `verification.md`, questo report.
- Comandi, esiti e limiti registrati. Un controllo senza evidenza resta «non eseguito».

### Misure sul tablet

Da fare nella tappa 0, senza toccare il codice, con il debug USB e `chrome://inspect`:
- `innerWidth`, `innerHeight`, `devicePixelRatio`, `screen.width` e `screen.height`, `matchMedia('(display-mode: standalone)')`, `matchMedia('(display-mode: fullscreen)')`, le aree sicure lette da un elemento sonda.
- **In Chrome:** la misura di oggi.
- **A schermo intero:** `screen.width × screen.height` in px CSS dà la misura dello schermo intero anche senza kiosk.
- **Come app installata (standalone):** Chrome installa una PWA solo da un'origine sicura. Il banco in rete locale (`http://192.168.1.17:3002`) non lo è. Strade possibili, da verificare:
  - aprire `http://localhost:3002` sul tablet con l'inoltro delle porte di `chrome://inspect`;
  - oppure un banco in HTTPS, che oggi non esiste.
- **In kiosk:** solo se l'utente installa un'app kiosk.
- Annotare anche la dimensione di visualizzazione e del carattere di Android: cambiano DPR, px CSS e la soglia dei 40rem.
- Per ogni misura: data, modalità, classe risultante (`deviceClassFor`) e screenshot.

### Cosa non fa

- Il widget «Chi è in casa» (ISSUE-049): i chip delle persone restano finché il widget non esiste.
- Il PIN di Sistema (ISSUE-023).
- L'app per il Play Store, la modalità a schermo intero, l'accesso remoto e le automazioni (ISSUE-048).
- La gestione del tasto Indietro di Android.
- La ritaratura di `REFERENCE_AREAS` o di `PHONE_MAX_SHORT_SIDE`.

**Proposte da registrare nel registro dei problemi, non applicate:**
- avviso «Allarme scattato» in cima, in ogni stato;
- chip multimedia tolto (doppione del widget Lettore);
- pulsante «Casa» con un foglio di riepilogo (transitorio, per via di ISSUE-049);
- pulizia di Sistema → Barra di stato, oppure «Mostra l'ora» funzionante;
- «Apri Sistema» nell'avviso «Disposizione bloccata»;
- «Modifica» spento o nascosto con la disposizione bloccata (G07, REP-20261009-001);
- rinomina di `topBar` e di `data-top-bar` nel descrittore delle pagine;
- riserva `labelMin` della barra della modifica, con `--aca-band-end` mai letto;
- `memo` e callback stabili di ISSUE-047 oltre la cache.

## Controllo di completezza

Integrazioni rispetto al piano sintetizzato, senza cambiarne le scelte di fondo:
- **Stati aggiunti:** disposizione bloccata, vassoio aperto, foglio aperto, Sistema aperto, connessione in errore sul telefono, rotazione con il caso dei 40rem sul Lenovo in verticale.
- **Primitiva dell'ora:** nessuna primitiva non-titolo a step-3 (`Title` è h1-h3); `Display sm` (33 px, peso 300) è quella degli orologi. Scelta e stima corrette di conseguenza.
- **Densità per barra:** l'attributo sulla fascia vale per tutte e due le barre e, durante lo scambio, farebbe cambiare densità alla barra che esce.
- **Posizione assoluta e subgrid:** un elemento in posizione assoluta non può usare `subgrid`, quindi la larghezza delle pillole viene da footerBand (`--aca-band-side`). La regola generica dei figli della fascia va scavalcata.
- **«Sincronizzato» in sr-only** solo dentro la fascia, perché `ConnectionStatus` serve anche in Sistema.
- **`IconAction`** non ha il pallino e chiede `onBlocked`; `ToolbarButton` è locale a EditToolbar.
- **Guadagno sul telefono:** con A sparisce il sobbalzo delle celle quando l'unico chip compare o sparisce (a 390×780 da 77 a 70).
- **Griglia:** riga per le pagine con colonne scelte (98 → 107); `sizeAcrossKeys` legge anch'essa `REFERENCE_AREAS` e va nel test di guardia.
- **Test in più:** `LagRenders`, `Polish2Cornice` (monta AppShell), `FixLauncherUiShell`, `PagerOverview`, `LauncherGestures`.
- **Prestazioni:** filtro dell'osservatore sulle mutazioni dei chip; ritardo con `is-editing` invece di nuovi `:has`.
- **Dati:** nessuna migrazione, con la prova di un profilo esportato dalla 0.9.2.
- **Sistema → Barra di stato:** impostazioni già senza effetto, che restano tali; proposta separata.
- **Documenti:** design.md:231-232 non annotata dopo la 0.9.2; proposte del 2026-10-10 superate in project-status; commenti nei file toccati.
- **Misure:** la modalità standalone richiede un'origine sicura; `screen.width × screen.height` dà lo schermo intero; impostazioni di Android da annotare.
- **Annullamento delle tappe** senza commit, come chiesto dall'utente finora.
- **Rischi in più:** scorrimento sui chip vicino al pollice, ora doppia con le barre di Android, soglia dei 40rem.

## Decisioni da rivedere

Si rivedono solo dopo il sì dell'utente, con annotazioni datate e senza cancellare il testo storico (*fatto il 2026-10-14 nella tappa 6, tranne il commento di `deviceClass.ts`, aggiornato nella tappa 5*):
- **ADR-0012, punto 3 «Barre» (:39) e conseguenza :58.** La barra di stato non sta più in alto: sta nella fascia in basso e scende, invece di salire, su copertina, in modifica e nella vista pagine. D1 resta nella sostanza: copertina senza barra, «Fine» in basso. Il motivo di revisione di :79 va aggiornato.
- **ADR-0012:33 e :37,** campo `topBar` e attributo `data-top-bar` (PageShell.tsx:28). Il nome resta, per non allargare il diff, ma indica se compare la barra di stato nella fascia. La rinomina è una proposta separata. Il limite di :61 resta vero.
- **ADR-0007.** Non nomina la barra di stato nella decisione: la barra approvata è in design.md:58 («Interfaccia OS»). Servono un'annotazione «una sola barra in basso» sull'interfaccia OS e una a :98 («Conferma» superata dalla 0.9.2). Il punto 26, indicatore a pallina, resta.
- **Nuova ADR-0013** «Cornice con una sola barra in basso», con la fonte umana esplicita. Il confronto con i launcher Android va verificato su fonti primarie prima di citarlo (REP-20261013-001:111).
- **design.md:**
  - :58 «Barra di stato» → barra di stato nella fascia in basso;
  - :63 la regola dell'altezza costante resta; il testo dice che in vista normale la fascia contiene anche stato e comandi;
  - :67 margine «per barra di stato…»;
  - :284 (D1): sulla copertina la fascia mostra solo l'indicatore;
  - :287-291: «Modifica» nello stesso angolo di «Fine»; attesa di 180 ms anche tra barra di stato e modifica;
  - :318 superata: niente più riga di chip né ritaglio a 64 px sul telefono;
  - :180 e :190: annotazioni datate;
  - :231-232: «Conferma» → «Fine» (0.9.2).
- **deviceClass.ts:146-154,** commento di `REFERENCE_AREAS`: il riferimento non coincide più con la cornice viva e i valori restano apposta. Ritarare è una decisione separata, con migrazione.
- **ISSUE-048:** la modalità di visualizzazione (`manifest.json:8` «standalone» oppure schermo intero) appartiene all'ADR dell'impacchettamento, perché decide la classe del tablet e quindi il guadagno.
- **REP-20261013-001:** annotazione datata con il collegamento a questo report; il report resta chiuso.

## Risposte dell'utente (2026-10-13)

> «Approvi l'idea della barra unica (ADR-0013)? approvo»
>
> Barre di Android sul tablet a muro: «si nascoste, va aggiunto quindi un widget dedicato alla connessione wi-fi?»
>
> Sistema a sinistra: «consigliato» · «Allarme scattato» in cima: «lavoro separato»

**Esito:**
- ADR-0013 è accettata.
- Il tablet a muro è a schermo intero, quindi il guadagno di spazio vale: classe tablet e caselle stimate da 75 a 88 px.
- Sistema va a sinistra.
- L'avviso dell'allarme diventa un incarico separato, da registrare nel registro dei problemi.

**Per le domande di dettaglio 6-10** valgono le scelte consigliate dal piano, salvo indicazioni diverse:
- «Sincronizzato» è il primo a sparire, e resta per i lettori di schermo;
- ora con la primitiva degli orologi (`Display sm`);
- i 12 px di margine in alto si decidono dopo la prova sul Lenovo;
- «Mostra l'ora» diventa una proposta separata;
- la griglia «Compatta» è da proporre all'utente nella prova.

**Banco e commit:** la tappa 7 prevede il banco `aca-system:0.9.3`, sempre senza commit, come chiesto finora.

## Domande per l'utente

**Decisive:**
1. **Approvi l'opzione A e la sua registrazione in ADR-0013?** Rivede la forma di ADR-0012, con annotazioni ad ADR-0007 e design.md. La copertina resta con il solo indicatore e «Fine» resta in basso. Senza il tuo sì il piano resta una proposta.
2. **Il tablet a muro girerà a schermo intero, senza le barre di Android, o come app con le barre visibili?** Nel secondo caso il Lenovo diventa probabilmente «telefono orizzontale» (caselle di 112 px già oggi) e togliere la barra non lo cambia. Possiamo misurarlo con il debug USB, in Chrome e come app installata?
3. **Sistema solo come ingranaggio a sinistra,** accanto all'ora e alla connessione e lontano da «Modifica» e «Fine» (consigliato), **oppure a destra accanto a «Modifica»,** come nella prima descrizione dell'opzione A?
4. **Chip a destra, prima di «Modifica», in una riga scorrevole, fino al widget «Chi è in casa»?** Sul telefono spesso se ne vede uno solo. «Allarme scattato» come avviso in cima su ogni pagina lo vuoi come incarico separato?
5. **A piano approvato, autorizzi le tappe 1-7 e il banco `aca-system:0.9.3`?** Finora hai chiesto di non fare commit: confermi, oppure un commit per tappa?

**Di dettaglio:**
6. Per la persona a schermo intero vuoi provare anche la griglia «Compatta», già in Sistema? Con A darebbe caselle di circa 114 px invece di 88 (stima), senza codice.
7. Quando manca posto può sparire per prima la parola «Sincronizzato», che resta per TalkBack? «Connessione…», «Riconnessione…» ed errori restano sempre scritti.
8. Ora grande su tutte le pagine tranne la copertina: va bene circa 33 px a tratto sottile (la primitiva degli orologi), o preferisci circa 28 px a tratto medio?
9. Aggiungiamo 12 px di margine in alto per stare lontani dal gesto di Android? Sul Lenovo le caselle sarebbero di 85 px invece di 88. Lo decidiamo dopo la prova sul dispositivo.
10. «Mostra l'ora» di Sistema → Barra di stato oggi non fa nulla: la togliamo o la facciamo funzionare (incarico separato)?

## Avanzamento e modifiche (2026-10-13/14)

Aggiunta del 2026-10-14. Il piano sopra è invariato; qui sta ciò che è stato fatto. Percorsi relativi a `progetto/acasystem/frontend/src`. Ogni tappa è stata eseguita con copia dei file toccati in `backup/barra-unica/T1`, `T2`, `T3` e `T45` (escluso da Git, `git check-ignore` lo conferma) e con un oggetto `git stash create` come punto di partenza (T1 `242ce9c1`, T2 `41f165d1`, T3 `b0ba0dd1`, T4-5 `732a76c4`; non sono commit di ramo). Dopo l'implementazione di ciascuna tappa un revisore ha riprodotto e fatto correggere i difetti trovati, in uno o più giri. Il working tree conserva il lavoro preesistente di REP-20261012-* e REP-20261013-001.

**Decisioni dell'utente applicate** (2026-10-13): barra unica approvata; tablet a muro a schermo intero, senza le barre di Android; Sistema nella pillola di sinistra (ora, connessione, ingranaggio), lontano da «Modifica» e «Fine»; «Allarme scattato» in cima è un lavoro separato (non fatto); dettagli 6-10 con le scelte del piano (ora con `Display sm`; «Sincronizzato» è il primo a diventare solo per i lettori di schermo; nessun margine extra in alto per ora).

| Tappa | Stato | Che cosa è stato fatto |
|---|---|---|
| 0. Misure sul tablet | Non eseguita | Nessuna misura di `innerWidth`, `innerHeight`, DPR o aree sicure sul Lenovo e sul tablet delle demo. L'utente ha deciso lo schermo intero, quindi il dubbio sulla classe «telefono orizzontale» resta una stima del codice. ADR-0013 accettata e proposte registrate: fatto nella tappa 6 (ISSUE-050…061). |
| 1. Test di guardia | Completata | Solo test, nessun cambio di comportamento. `__tests__/LauncherGeometry.test.ts`: `rowsOn` e `columnsKey` per le 4 classi con 2-10 colonne, `cellMetrics(973, 440, 8×5, 16)` = 75 e `(973, 504, 8×5, 16)` = 88, `sizeAcrossKeys` tra copertina e pagine (anche la coppia copertina ↔ pagina predefinita del tablet, quella del tablet a muro). `__tests__/Polish2Cornice.test.tsx`: nuovo blocco con gli esiti di `fitBand` per la barra della modifica di oggi, con la tabella delle larghezze misurate il 2026-10-13 in Chromium headless (126/201 px con testo, 52/129 in «short» e «icons»). Il revisore ha trovato che la prima versione fissava larghezze storiche e non quelle attuali: corretto. |
| 2. `footerBand` per due barre | Completata | `templates/app-shell/footerBand.ts`: misura la barra visibile tra quelle marcate (`data-band-bar`, `data-band-group`); opzioni per barra in `fitBand` (la barra della modifica resta com'era); `bandSide()` per `--aca-band-side`; densità scritta sulla barra misurata; cache degli esiti per chiave (barra, righe, larghezza, tacche, fase della connessione e, per la barra della modifica, nome della pagina), invalidata da `childList`, da un `ResizeObserver` sulle parti misurate e dal caricamento dei font; `changedBand` ignora chip e orologio (`data-band-flex`, `data-band-clock`). `EditToolbar.tsx` riceve i soli attributi; `edit.css` e `appShell.css` solo commenti. Revisione in 2 giri: corretti un ciclo di circa 60 misure al secondo (la misura vedeva il `--aca-band-room` precedente), la cache che riusava l'esito di un'altra pagina, la nota «Questa pagina non contiene widget» osservata dal `ResizeObserver` e il minimo di densità (`floor`) ignorato dalla cache. Nuovo `__tests__/FooterBandCache.test.tsx` (16 test): mostrare e nascondere con la stessa chiave non fa letture di layout; nota ↔ «+ Widget», testo della connessione, fase, larghezza e font rimisurano. |
| 3. Barra di stato nella fascia | Completata | `components/system/status-bar/StatusBar.tsx` e `statusBar.css`: radice `div` con `role=group` «Stato e comandi» in `position: absolute` nell'area di griglia della fascia (riga 1 da 40rem, riga 2 sotto); pillola di sinistra con l'ora (`Display sm` in `<time>`), `ConnectionStatus` e l'ingranaggio Sistema (`IconAction` con `Badge`, nome «Sistema» o «Sistema, N aggiornamenti disponibili»); pillola di destra con la riga scorrevole dei chip (sempre montata, `data-band-flex`) e «Modifica» con matita e testo (`data-launcher-edit`). Tre densità: testo, «short» («Sincronizzato» solo per i lettori di schermo), «icons» («Modifica» solo icona da 44 px con `aria-label` e `title`); sotto 40rem «Sincronizzato» è sempre solo per i lettori di schermo. `AppShell.tsx` e `appShell.css`: via lo slot `statusBar` e le variabili `--aca-head-top`/`--aca-head-pad`; `--aca-shell-head` è la sola area sicura; margine superiore per l'avviso di connessione. `LauncherScreen.tsx`: monta la barra per prima nel footer con la stessa condizione `hidden`; guardia del doppio tocco di 400 ms solo per il puntatore (`event.detail > 0`) su «Modifica», «Fine» e «Pagine». `edit.css`, `launcher.css`, `pageIndicator.css`: scambio con la barra della modifica (180 ms di attesa, 220 per «Pagine»; con il movimento ridotto solo dissolvenza di 120 ms, mai le due barre insieme). `UiKitPage.tsx` e `uiKit.css`: campione dentro una fascia finta. Revisione in 3 giri: l'indicatore non copre più le pillole mentre scendono (`--aca-band-side` sulla barra di stato), «Modifica» resta dentro lo schermo sul telefono con una fase anomala, la parola delle fasi anomale non finisce sotto l'ingranaggio, il primo chip che compare non fa rimisurare, il doppio tocco sulla matita non apre «Pagine». |
| 4. Pillola «Annulla» nella vista pagine | Completata | `launcher.css`: variabile `--aca-undo-room` = `--aca-space-3` + `--aca-float-height`, usata dal calcolo di `k` in `Pager.tsx` (`measureCards`), dal centraggio del corpo scheda e da `--aca-card-top`. La pillola è montata da `LauncherScreen.tsx` dentro `AppShell` (quindi in `.aca-shell__main`) e `edit.css` la aggancia all'area delle pagine (`position: absolute; top: var(--aca-space-3)`), così sta sotto l'avviso di connessione e dentro la riserva. |
| 5. Commento di `REFERENCE_AREAS` | Completata | `utils/launcher/deviceClass.ts`: solo il commento. I valori non cambiano; la guardia della tappa 1 resta verde. |
| 6. Documenti | Completata in questa fase | Questo report; ADR-0013, ADR-0012, ADR-0007, design.md, project-status.md, REP-20261013-001, verification.md e indici (annotazioni datate, senza cancellare). `infrastructure.md` non toccato: il banco è ancora 0.9.2. |
| 7. Verifica, banco e dispositivo | Non eseguita (agente principale) | Banco `aca-system:0.9.3`, prestazioni sul tablet con lo script di REP-20261012-003, TalkBack, gesto dal bordo superiore, soglia dei 40rem con testo ingrandito, profilo esportato dalla 0.9.2 e importato nella 0.9.3, prova con la persona. |

**Dopo le tappe: verifica visiva e due correzioni.** Prove in Chromium headless su 9 viewport, 2 temi e 7 stati (copertina, normale, modifica, selezione, widget rimosso, vista pagine, dopo la modifica), con una versione «prima» ricostruita da uno stash. Corretti due difetti: la nota «Disposizione bloccata» e la pillola «Annulla» coprivano l'indicatore sul telefono in verticale (`.aca-undo` stava a 92 px fissi dal fondo, dentro la fascia da 152 px: ora `bottom: calc(var(--aca-shell-foot) + var(--aca-space-1))`, che sul tablet dà gli stessi 92 px; il piano diceva «non si sovrappone» ma valeva solo da 40rem); il chip multimedia premibile era alto 31,3 px (area di tocco invisibile fino a 44 px, senza cambiare l'aspetto). Due test nuovi in `PagerBands.test.tsx`.

### Scarti dal piano e decisioni esecutive

- **Vista pagine sugli schermi bassi.** Il piano dice che le schede «restano dove sono oggi e crescono solo se c'è spazio». Non è vero sugli schermi limitati dalla larghezza: con la riserva fissa l'altezza e la posizione della scheda centrale restano uguali, ma `k` scende e il contenuto si rimpicciolisce. Misure (Chromium headless): 1024×472 `k` 0,72 → 0,6146, scheda larga 737 → 629 px (−15 %); 844×390 `k` 0,647 → 0,5099, 546 → 430 px (−21 %); 844×390 con l'avviso «sessione scaduta» circa 0,46 → 0,3273 (−29 %). A 1024×640, 1280×665, 390×844 e 640×1024 `k` resta 0,72. Nessuna sovrapposizione tra pillola e scheda: distanza minima 16 px in nove viewport. L'alternativa del piano (spostare la pillola e togliere la riserva) non è stata scelta; spetta all'utente valutarla sul Lenovo in Chrome e sul telefono in orizzontale.
- **Pillola «Annulla» agganciata all'area delle pagine** e non alla finestra (il piano la lasciava dov'era): con l'avviso di connessione visibile lo copriva.
- **Lato delle pillole.** `bandSide` usa il posto lasciato da `fitBand` (`max(room, tacche al minimo)`) e non la riserva del nome più largo di 14rem prevista nel piano: con quella riserva la pillola di sinistra risultava più piccola del suo contenuto a 640 px. Durante la misura la parola delle fasi anomale ha un tetto di 3em, così prima cede la parola e solo dopo cambiano «Modifica» e le tacche.
- **Ritardo di 180 ms.** Si ottiene con `.aca-shell:not(.is-editing)` (e `.is-editing` per la barra della modifica), senza `:has` nuovi. `is-editing` non distingue l'uscita dalla modifica dal ritorno dalla copertina o dalla barra del widget: la barra di stato attende 180 ms anche tornando dalla copertina, e la barra della modifica 180/220 ms anche tornando dalla barra del widget (prima 0/40 ms).
- **Guardia del doppio tocco** estesa a «Pagine» (il piano la prevedeva su «Fine» e «Modifica»): alla densità «testo» «Modifica» copre parte di «Pagine».
- **Densità per barra.** La barra della modifica la riceve anche sulla fascia (le attese di `Polish2Cornice` fissano i selettori discendenti); la barra di stato solo su se stessa, con selettori propri in `statusBar.css`. Chi riusasse le classi `aca-edit-toolbar__*` in un'altra barra seguirebbe la densità della barra della modifica (commento in `edit.css`).
- **`REFERENCE_AREAS`**, formato salvato, backend e dipendenze invariati.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Riscontro dei riferimenti del piano | Lettura di StatusBar, statusBar.css, ConnectionStatus, AppShell, appShell.css, footerBand, deviceClass, layout (`pageClass`, `sizeAcrossKeys`), Pager (`measureCards`), launcher.css, edit.css, EditToolbar, IconAction, Sheet, StatusBarSection, typography.css, manifest.json, LauncherScreen (righe 885-990 e 1580-1740) sul working tree del 2026-10-13 | Superato | I numeri di riga citati corrispondono al working tree delle 18:20 circa. LauncherScreen può cambiare per altre sessioni. |
| Ricalcolo delle celle e delle righe | `cellMetrics` e `rowsOn` a mano, con gutter, gap, fasce e margini del codice | Superato come stima | Non sono misure: viewport a schermo intero e standalone sono deduzioni. |
| Censimenti e giudizio di partenza | Journal del workflow `wf_41066dcd-ed3`, righe dei risultati | Letti | Dati di REP-20261013-001, ricontrollati dove il piano li usa. |
| Test, build, browser, TalkBack, misure sul tablet | — | Non eseguito | Fuori perimetro: sola lettura del codice. |
| Stato del banco 0.9.2 | — | Non eseguito in questo incarico | Fonte: infrastructure.md:7-11, a cura dell'agente principale. |

**Nota del 2026-10-14.** La tabella sopra riguarda il solo piano del 2026-10-13 («sola lettura del codice»). Le verifiche delle tappe 1-6 sono qui sotto.

### Verifiche delle tappe 1-6 (2026-10-13/14)

Comandi in `progetto/acasystem/frontend`, sul working tree. Prove nel browser: Chromium headless con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing` (raster software, DPR 1 con emulazione touch/mobile), un browser alla volta, contro `launcher.html` e il campione del kit UI; i server Vite avviati sono stati fermati. Suite sempre con `--maxWorkers=4`. Gli script delle prove sono nella scratchpad della sessione, non nel repository.

| Controllo | Procedura | Esito | Evidenza e limiti |
|---|---|---|---|
| Statici | `npm run typecheck`; `npm run lint`; `npm run lint:typography`; `npm run lint:theme-colors`; `npm run i18n:check`; `npx prettier --check` sui file toccati | Superato | 0 errori; 0 violazioni (429 file); 0 violazioni (303 file); 4 test. `npm run format:check` completo: exit 1 solo per `eslint.config.js` e `public/sw.js`, preesistenti. |
| Suite frontend completa | `npx vitest run --maxWorkers=4` dopo l'ultima modifica (correzioni della verifica visiva) | Superato | 145 file, 1815 test passati, 392 s. Percorso delle esecuzioni: T1 143 file / 1757; T2 144 / 1778; T3 145 / 1812; T4-5 145 / 1813; verifica 145 / 1813; dopo le correzioni 145 / 1815. Due esecuzioni intermedie non valgono come suite verde: la prima della T1 ebbe 3 timeout sotto carico (15-18 s), passati rieseguendo i due file da soli (103/103); quella della T3 (83 file passati e 62 errori «Worker exited unexpectedly») fu un avvio fallito dei worker per il carico del PC e non va citata. |
| Test di guardia (tappa 1) | `LauncherGeometry` e `Polish2Cornice` | Superato | `rowsOn`, `columnsKey`, `cellMetrics` 75 e 88, `sizeAcrossKeys`, esiti di `fitBand` della barra della modifica fissati sul comportamento della 0.9.2; restano verdi a fine lavoro, quindi righe, chiavi e disposizioni salvate non sono cambiate. |
| Cache della fascia (tappa 2) | `FooterBandCache.test.tsx`, `LagRenders.test.tsx`, `Polish2Cornice`, `EditToolbarHidden` | Superato, in jsdom | Nessuna lettura di layout (`getBoundingClientRect`, `getComputedStyle`) mostrando o nascondendo una barra con la stessa chiave. jsdom non ha `ResizeObserver` (nei test è simulato): il ciclo di misure della prima versione fu visto e corretto solo con Playwright. Non è una misura di prestazioni sul tablet. |
| Build | `npm run build`; `node scripts/check-bundle-size.mjs` | Superato | Build riuscita dopo le ultime correzioni, con il solo avviso sui chunk oltre 500 kB. Il controllo di dimensione dice «tutti i chunk nei limiti», index 733,2 KB su 900, misurato prima delle due correzioni CSS della verifica visiva. |
| Griglia identica tra gli stati | Playwright, 9 viewport (1024×640, 1280×800, 1280×665, 1024×472, 1024×568, 640×1024, 844×390, 390×844, 390×700), stati copertina, normale, modifica, selezione, vista pagine | Superato | Area delle pagine e fascia hanno lo stesso rettangolo in tutti gli stati; nelle pagine di widget la griglia è identica tra normale, modifica e selezione, in chiaro e in scuro (0 differenze). Fascia alta 88 px, 152 sotto 40rem. Esempio 1024×640: area 0,0,1024,552, griglia 27,24,970,504. |
| Celle prima → dopo | Stesse prove, «prima» da uno stash del punto di partenza | Superato | 1024×640 75 → 88; 1280×800 107 → 120; 1280×665 80 → 93; 1024×472 112 → 112; 1024×568 112 → 112; 640×1024 89 → 89; 844×390 90 → 91; 390×844 81 → 82; 390×700 57 → 75. Copertina 1024×472 272 → 317 px, 844×390 190 → 254. Coincidono con la tabella del piano. |
| Sovrapposizioni e bersagli | Playwright, pillole, traccia, nome, gruppi della barra della modifica, barra delle pagine e del widget | Superato | Zero sovrapposizioni e nessuno scroll orizzontale in 9 viewport per tutti gli stati e, con tre fasi (normale, scaduta, riconnessione), in 33 combinazioni di 11 viste. Ingranaggio 44×44, «Modifica» 134,8×44 (44×44 solo icona a 390 e 640), «Fine» 72,5×44; chip multimedia premibile 31,3 → 44 px con l'area di tocco. |
| Densità | Playwright | Superato | 1024×640, 1280×665, 1024×472 e 390×844: testo; 844×390: «short»; 640×1024: «icons» con `--aca-band-room` 194 px. Ora `Display sm` 33,2 px. |
| Scambio «Modifica» ↔ «Fine» | Campionamento a ogni fotogramma a 1024×640, anche con `prefers-reduced-motion` | Superato | Le opacità delle due barre non superano mai insieme 0,15 in ingresso e in uscita. Doppio tocco con tocco touch: a 150 ms resta in modifica, a 120 ms dopo «Fine» resta fuori; con un tocco a 700 ms esce regolarmente. |
| Fuoco e tabulazione | Playwright, tastiera | Superato | Modifica → Fine → Modifica, Invio ed Esc; ordine nella fascia: pagina, Sistema, chip, «Modifica». In copertina la barra è `inert`, `aria-hidden` e con classe `--hidden`. Il ritorno del fuoco sull'ingranaggio alla chiusura di Sistema è coperto da `FixSystemFocus`; la pagina Sistema vera non è nel banco di prova. |
| Sistema con la disposizione bloccata | Playwright | Superato | A 1024×640, 390×844 e 844×390 l'ingranaggio è visibile e il clic apre Sistema; «Modifica» mostra l'avviso del blocco sopra la fascia. |
| Connessione | Playwright, `?stato=riconnessione|errore|scaduta` | Superato, con limite | `role=status` sempre nel DOM; avviso in cima con margine; le pagine scendono mentre è visibile. La parola delle fasi anomale va in ellissi sul telefono («Non r…», «Rico…») e a 640×1024 con 5 pagine resta di circa 11 px (29 px a 360×640, 0 px a 320×568): vedi le questioni residue. |
| Vista pagine e «Annulla» | Playwright, rimozione di un widget e «Pagine» | Superato | Distanza tra pillola e scheda centrale (px): 19,3 a 1024×640; 41,7 a 1280×800; 22,8 a 1280×665; 16 a 1024×472 e 1024×568; 73 a 640×1024; 16 a 844×390; 38,9 a 390×844; 18,7 a 390×700. Prima sovrapposta a 1024×640 (−12,7), 1024×472 (−36,2) e 1280×665 (−9,2). Con l'avviso di connessione la pillola sta sotto l'avviso. |
| Console | Playwright, 18 combinazioni viewport × tema e prove di interazione | Superato, con limite | Nessun `pageerror` né errore o avviso in console. L'evento «ResizeObserver loop completed with undelivered notifications» arriva solo ai listener di `window.onerror` e al terminale di Vite (ISSUE-060). |
| Geometria prima/dopo: tema | Playwright, chiaro e scuro | Superato | Geometria identica nei due temi (0 differenze su griglia, area, fascia, pillole, traccia, nome, «Modifica», «Fine»); screenshot controllati a campione. |
| Prestazioni sul tablet | Script di REP-20261012-003 sul tablet delle demo | Non eseguito | Né `LagRenders` né la cache sono una misura sul dispositivo; `LagRenders` non peggiora. Livelli `will-change` ora sulle pillole. |
| Banco 0.9.3, TalkBack, gesto dal bordo, soglia 40rem con testo ingrandito, margine di 12 px, riga «Versione», profilo 0.9.2 → 0.9.3, prova con la persona | — | Non eseguito | Tappa 7, a cura dell'agente principale. Nessun docker, nessun adb, nessun commit. |

Limiti del metodo: raster software e non il Mali-G57; la versione «prima» è ricostruita da uno stash più i file non tracciati non toccati dal lavoro; la pagina Sistema vera non è nel banco di prova; nessuna prova con testo ingrandito di Android.

### Questioni residue

- **Vista pagine sugli schermi bassi:** le schede si rimpiccioliscono (−15 % a 1024×472, −21 % a 844×390); da far valutare all'utente, con l'alternativa del piano.
- **Fascia stretta con fase anomala (ISSUE-059):** la parola della connessione è ridotta (11 px a 640×1024 con 5 pagine, 29 px a 360×640, 0 px a 320×568); il testo completo resta nel `role=status` e, per la sessione scaduta, nell'avviso in cima (per la riconnessione l'avviso non c'è). Il ritardo di 180 ms vale anche tornando dalla copertina.
- **`ResizeObserver` (ISSUE-060):** l'evento di ciclo compare quando una parte misurata cambia davvero larghezza; rinviarlo con `requestAnimationFrame` lascerebbe un fotogramma con la densità sbagliata.
- **Tabulazione e landmark:** «Modifica» precede l'indicatore nell'ordine di tabulazione e sparisce il landmark `banner`; da verificare con TalkBack.
- **Da fare:** tappa 0 e tappa 7 (vedi sopra). Il banco resta `aca-system:0.9.2`.

### Punto di ripresa (2026-10-14)

- **Stato:** tappe 1-6 completate nel codice e nei documenti; nessun commit; working tree con il lavoro preesistente. Backup delle tappe in `backup/barra-unica/`.
- **Prossimo passo (agente principale):** costruire `aca-system:0.9.3` solo con l'autorizzazione dell'utente (copia a freddo del volume e ripristino alla 0.9.2 come in [infrastructure.md](../infrastructure.md)); misurare le prestazioni sul tablet delle demo con lo script di REP-20261012-003; prove sul Lenovo: TalkBack, gesto dal bordo superiore, doppio tocco, soglia dei 40rem, vista pagine a 1024×472, griglia «Compatta»; importare nella 0.9.3 un profilo esportato dalla 0.9.2.
- **Da decidere dall'utente:** vista pagine sugli schermi bassi; margine di 12 px in alto dopo la prova del gesto; proposte ISSUE-050…061 (nessuna autorizzata).

### Banco 0.9.3 e Tab M11 (2026-10-14, agente principale)

- **Banco:** `aca-system:0.9.3` dalle 10:07. Prima della build: copia a freddo del volume `backup/banco/tunet-data-20261014-pre-0.9.3-freddo.tgz`. Dopo la build:
  - container `healthy`;
  - `/api/health` risponde `{"status":"ok","version":"0.9.3"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`;
  - bundle `index-C8F-qxyS.js`.

  Dettagli e ripristino in [infrastructure.md](../infrastructure.md).
- **Tappa 0 sul Tab M11** (TB330FU, Chrome 155, via `adb reverse` su `http://localhost:3002`):
  - in Chrome, orizzontale 1280×665 e verticale 800×1145 a DPR 1,5;
  - `screen` 1280×800, quindi a schermo intero l'area sarebbe 1280×800, da confermare con l'app installata;
  - `display-mode` né `standalone` né `fullscreen`;
  - carattere di Android al 100 % (`font_scale` 1.0), radice a 16 px.
- **Con la 0.9.3 sul M11 in Chrome:**
  - area delle pagine 1280×561;
  - fascia in basso alta 104 px, cioè 88 px di contenuto più 16 px;
  - prima cella di Principale (8×5 celle «+») 89 px, contro 76 nella 0.9.2.

  La tabella del piano dava 93 px a 1280×665 sul campione `launcher.html`; la differenza non è indagata.
- **Prestazioni sul M11** (script di REP-20261012-003, due passate): come la 0.9.2.
  - scorrimento 82-87 fps;
  - modifica 88;
  - apertura della vista pagine 67-77 fps con un fotogramma di 211-367 ms;
  - chiusura 66-77 fps con 167-200 ms.

  La causa è il raster delle ombre dentro le pagine, non la barra: vedi [REP-20261012-003](REP-20261012-003-lag-tablet-prestazioni.md#tab-m11-2026-10-14) e la proposta ISSUE-062.
- **Screenshot via CDP** (scratchpad, non nel repository), riposo e modifica a 1280×665:
  - a sinistra l'ora, «Sincronizzato» e l'ingranaggio; al centro l'indicatore con «Principale»; a destra «Modifica» con il testo;
  - in modifica: «Widget» a sinistra, «Pagine» e «Fine» a destra.
  - Negli screenshot «Modifica» e «Fine» hanno l'anello di fuoco. I clic erano simulati da JS, quindi va guardato con il dito.
- **Riga «Versione» di Sistema:** sul M11, aperta Sistema dall'ingranaggio della fascia, mostra «0.9.3».
- **Non eseguito:**
  - schermo intero e app installata;
  - TalkBack;
  - gesto dal bordo superiore e margine di 12 px;
  - testo ingrandito e soglia dei 40rem;
  - profilo esportato dalla 0.9.2 e importato nella 0.9.3;
  - prova con la persona.

## Controllo del diff e decisioni

*Nota del 2026-10-14: questa sezione descrive il lavoro del piano (2026-10-13). Per il codice e i documenti delle tappe 1-6 vedi «Avanzamento e modifiche».*

- **File scritti:** questo report; [ADR-0013](../decisions/ADR-0013-barra-unica.md) in stato Proposta; una riga in [decisions/README.md](../decisions/README.md) e una in [reports/README.md](README.md).
- **Nessuna modifica** al codice, al banco o agli altri documenti. `project-status.md` non è aggiornato in questo passaggio: l'aggiornamento (incarico, punto di ripresa, proposte) spetta all'agente principale o alla tappa 0.
- **Nessuna approvazione inventata.** ADR-0013 resta Proposta finché l'utente non la approva.
- **Discrepanze trovate** e registrate nel piano: design.md:231-232 non annotata dopo la 0.9.2; impostazioni di Sistema → Barra di stato senza effetto; `--aca-band-end` scritto e mai letto.

## Chiusura e punto di ripresa

*Nota del 2026-10-14: testo del 2026-10-13, superato dal «Punto di ripresa (2026-10-14)» sopra. Il piano è stato approvato e le tappe 1-6 sono completate; le tappe 0 e 7 restano da fare.*

- **Stato:** in attesa di approvazione. Nessun lavoro di codice è autorizzato.
- **Prossimo passo:** le risposte dell'utente alle domande 1-5. Con il sì e ADR-0013 accettata si parte dalla tappa 0 (misure sul tablet e registrazione delle proposte).
- **Input necessari:** approvazione di A e di ADR-0013; modalità del tablet a muro; posizione di Sistema; chip e allarme; autorizzazione a tappe, banco 0.9.3 e commit.
- **Backlog, non autorizzato:** le proposte elencate in [Cosa non fa](#cosa-non-fa).
