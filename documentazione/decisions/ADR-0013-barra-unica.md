# ADR-0013 — Cornice con una sola barra in basso

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0013 — Cornice con una sola barra in basso |
| Stato | Accettata il 2026-10-13 dall'utente (vedi «Decisore e autorizzazione»). |
| Data e autore | 2026-10-13; scheda redatta da Claude Code (Opus 5.5, `claude-opus-5-5`) |
| Decisore e autorizzazione | **Accettata dall'utente il 2026-10-13:** «Approvi l'idea della barra unica (ADR-0013)? approvo». Risposte collegate: barre di Android nascoste sul tablet a muro («si nascoste»); Sistema a sinistra, lontano da «Modifica» («consigliato»); «Allarme scattato» come lavoro separato («lavoro separato»). Testo originario della proposta: è una proposta dell'agente, scritta su richiesta dell'utente del 2026-10-13: «metti la 0.9.2 sul banco e prepara il piano». Parte dalle risposte dell'utente in [REP-20261013-001](../reports/REP-20261013-001-barre-ridondanze.md): app a schermo intero dal Play Store, Sistema per l'installatore, chi è in casa come widget. Diventa accettata solo con una frase dell'utente che la approvi, da citare qui. |
| Collegamenti | Piano: [REP-20261013-002](../reports/REP-20261013-002-piano-barra-unica.md). Report: REP-20261013-001, [REP-20261009-001](../reports/REP-20261009-001-test-ux-persona.md), [REP-20261009-004](../reports/REP-20261009-004-pageshell.md), [REP-20261012-003](../reports/REP-20261012-003-lag-tablet-prestazioni.md). Decisioni: [ADR-0004](ADR-0004-principi-frontend.md), [ADR-0005](ADR-0005-typescript-italiano-icone.md), [ADR-0007](ADR-0007-acasystem-os.md), [ADR-0011](ADR-0011-kit2-base-grafica.md), [ADR-0012](ADR-0012-pageshell.md). Problemi: ISSUE-023, ISSUE-047, ISSUE-048, ISSUE-049. Requisiti: REQ-03, REQ-15. |
| Sostituisce / sostituita da | Nessuna sostituzione integrale. Se accettata, modifica ADR-0012 punto 3 «Barre» e la conseguenza :58: cambia la forma della barra in alto, mentre D1 resta nella sostanza. Aggiunge un'annotazione ad ADR-0007 sull'interfaccia OS. Rivede design.md:58, 63, 67, 284, 287-291 e 318. |

*Annotazione del 2026-10-21: **superata in parte da [ADR-0016](ADR-0016-schermo-intero-interazioni.md)**, accettata dall'utente lo stesso giorno. Cadono la barra sempre visibile in uso, la barra di stato e l'indicatore sempre presenti, e la decisione «Sistema a sinistra, lontano da Modifica» (l'ingranaggio passa in alto a destra, sempre visibile); le barre compaiono solo in modifica, dopo una pressione lunga sullo spazio vuoto. Restano validi il punto 7 (`REFERENCE_AREAS`, nessuna migrazione) e il punto 9. Il testo sopra e sotto resta come storico. L'attuazione dipende dalle tappe autorizzate: G1-G5 e C1-C3 sono nel codice dal 2026-10-21 (la barra di stato non è più nel launcher; ne resta il codice fino a C4).*

## Contesto ed evidenze

**Fatti verificati sul working tree del 2026-10-13** (base `7298d4d` più modifiche non committate). Percorsi del codice relativi a `progetto/acasystem/frontend/src`:
- **La barra in alto** (`StatusBar`) contiene ora, connessione, chip, matita «Modifica» e ingranaggio «Sistema» (StatusBar.tsx:89-164).
- **È nascosta** su copertina, in modifica e nella vista pagine (LauncherScreen.tsx:1597). Si sposta solo con `transform` (statusBar.css:37-44).
- **La sua fascia resta riservata** e vuota anche in quegli stati: 64 px più l'area sicura (appShell.css:38-43).
- **Funzioni senza alternativa** (REP-20261013-001):
  - Sistema: unico accesso, anche allo sblocco della disposizione bloccata;
  - «Modifica»: unico ingresso visibile e da tastiera;
  - connessione: unico segnale positivo e delle fasi di riconnessione;
  - ora: unica su tutte le pagine;
  - chip delle persone e delle batterie: unici in tutta l'app.
- **La fascia in basso** ha altezza costante: 88 px da 40rem, 152 sotto (appShell.css:52-55 e 121-126; design.md:63). In vista normale le colonne laterali e la riga 2 del telefono restano vuote apposta.
- **Nella fascia** il piè di pagina è `position: relative` (appShell.css:81). La barra della modifica nascosta dimensionerebbe le colonne laterali e serve una regola `:has` per evitarlo (appShell.css:117 e 135-137).
- **`manifest.json:8`** dichiara `"display": "standalone"`.
- **Classi di schermo.** Sotto 600 px di lato corto lo schermo è un telefono (deviceClass.ts:235-245). `REFERENCE_AREAS` fissa le righe delle pagine con colonne scelte (deviceClass.ts:155-181) e la grandezza visiva tra pagine (layout.ts:751-764).

**Stime dal codice, non misure** (cellMetrics, deviceClass.ts:267-293):
- Lenovo a schermo intero 1024×640: cella da 75 a 88 px (+17 %).
- Tablet delle demo 1280×665: da 80 a 93.
- Lenovo in Chrome 1024×472 e telefoni in verticale: limitati dalla larghezza, nessun guadagno.
- Telefono con la riga dei chip in alto: da 70 a 82 nell'app, da 57 a 75 in Chrome.
- Come app standalone con le barre di Android, il Lenovo scende probabilmente sotto 600 px di lato corto e diventa «telefono orizzontale» (8×2, 112 px): togliere la barra non lo cambia.

**Inferenze non verificate:**
- le misure del viewport a schermo intero e come app installata;
- il confronto con i launcher Android, che va controllato su fonti primarie prima di citarlo (REP-20261013-001:111).

**Decisioni dell'utente del 2026-10-13** (REP-20261013-001:76-90):
- l'app sarà installabile dal Play Store e girerà a schermo intero, sul tablet a muro e fuori casa (ISSUE-048);
- Sistema serve all'installatore: può stare meno in vista, ma deve restare raggiungibile, anche con la disposizione bloccata;
- chi è in casa diventerà un widget (ISSUE-049);
- «Fine» ha sostituito «Conferma» (banco 0.9.2).

## Proposta o decisione

Proposta dell'agente, non ancora decisa dall'utente.

*Annotazione del 2026-10-14: l'utente ha approvato il 2026-10-13 (stato in testata). Le questioni aperte sotto sono chiuse così: tablet a muro a schermo intero senza le barre di Android; Sistema nella pillola di sinistra; «Allarme scattato» in cima è un lavoro separato, non fatto; ora con `Display sm`; «Sincronizzato» è il primo a diventare solo per i lettori di schermo; nessun margine extra in alto per ora. Il punto 8 è stato attuato con una variante: la pillola «Annulla» resta in alto ma agganciata all'area delle pagine, con la riserva nel calcolo di `k` (vedi REP-20261013-002, «Scarti dal piano»). Il testo qui sotto è la proposta originale.*

1. **Una sola barra.** La barra di stato lascia l'alto e va nella fascia in basso. Il componente resta `StatusBar`, con le stesse props, classi e selettori del fuoco.
2. **Posizione.** La barra sta in posizione assoluta nell'area di griglia della fascia: riga 1 da 40rem, riga 2 sotto. Non dimensiona le colonne. La fascia mantiene altezza e regola dell'altezza costante.
3. **Fascia in alto.** Si riduce alla sola area sicura: le pagine guadagnano 64 px in ogni stato. L'avviso di connessione resta in cima, nel suo slot.
4. **Vista normale:**
   - **a sinistra:** ora grande, LED con la parola della connessione, ingranaggio di Sistema solo icona con la nuvoletta UI-010. Sistema resta visibile anche con la disposizione bloccata, lontano dall'angolo di «Modifica» e «Fine»;
   - **al centro:** l'indicatore con il nome, invariato;
   - **a destra:** i chip in una riga scorrevole, poi «Modifica» con il testo, nell'angolo dove in modifica compare «Fine».
5. **Stati invariati.** Copertina, modifica, vista pagine e widget selezionato restano come oggi.
   - D1 resta nella sostanza: la copertina non mostra la barra e «Fine» sta in basso.
   - Entrando in modifica la barra scende e la barra della modifica sale dopo 180 ms: «Modifica» e «Fine» non sono mai visibili insieme.
   - Una guardia breve, solo per il puntatore, evita il doppio tocco nello stesso angolo.
6. **Densità.** `footerBand.ts` sceglie la densità anche per la barra di stato, con una cache per chiave. Ordine di riduzione:
   1. «Sincronizzato» resta solo per i lettori di schermo;
   2. «Modifica» diventa solo icona;
   3. le tacche dell'indicatore si stringono.

   Le fasi anomale della connessione restano sempre scritte. I chip scorrono e non entrano nella misura.
7. **Griglia e dati.** `REFERENCE_AREAS` resta invariata, con un test di guardia. Righe, chiavi e disposizioni salvate non cambiano: nessuna migrazione.
8. **Vista pagine.** La pillola «Annulla» che scende dall'alto ottiene una riserva nel calcolo delle schede, così non copre la scheda centrale.
9. **Fuori da questa decisione:**
   - il widget «Chi è in casa» (ISSUE-049): fino ad allora i chip delle persone restano;
   - il PIN di Sistema (ISSUE-023);
   - impacchettamento, modalità a schermo intero e accesso remoto (ISSUE-048);
   - il tasto Indietro;
   - l'avviso «Allarme scattato» in cima e il chip multimedia tolto;
   - la pulizia di Sistema → Barra di stato;
   - la rinomina di `topBar`.

   Sono proposte separate, da autorizzare.

## Alternative e motivazioni

- **B. Tenere le due barre e togliere i doppioni interni.** Rischio minimo, ma nessun guadagno di spazio a schermo intero. Ne è stata applicata la parte approvata («Fine» al posto di «Conferma»). Resta il ripiego se la modalità finale lascia il tablet nella classe «telefono orizzontale».
- **C. Barre a scomparsa.** Guadagno massimo, ma i comandi diventano nascosti e la griglia cambia misura entrando in modifica (contro design.md:63). Scartata per la persona di 65 anni.
- **Dock nel flusso, in `subgrid`, come la barra della modifica.** Scartata: il dock nascosto darebbe ancora il minimo del contenuto alle colonne laterali mentre la barra della modifica è visibile (appShell.css:117). Un elemento in posizione assoluta non usa `subgrid`, ma non dimensiona nulla.
- **Nuovo componente Dock al posto di StatusBar.** Scartata: diff più largo, in parte temporaneo fino a ISSUE-049. Richiederebbe di spostare prima ConnectionNotice e ConnectionStatus e di rinominare `topBar`.
- **Sistema a destra, accanto a «Modifica»,** come nella prima descrizione dell'opzione A. Non scelta nella proposta: aumenta i tocchi sbagliati e rende Sistema più invitante per la persona finché manca il PIN. Resta una domanda all'utente.
- **Pulsante «Casa» con un foglio** per persone, allarme e conteggi. Rinviato: cambia un comportamento senza decisione e diventa transitorio con ISSUE-049.
- **Ritarare `REFERENCE_AREAS` sulla cornice nuova.** Scartata: cambierebbe righe e chiavi per molte colonne (per esempio la copertina del tablet da 3×1 a 3×2) e rimescolerebbe le disposizioni salvate.

**Questioni aperte:**
- modalità finale del tablet a muro (schermo intero o app con le barre di Android);
- posizione di Sistema;
- chip e allarme fino a ISSUE-049;
- primitiva dell'ora: `Display` a 33 px peso 300, oppure una taglia nuova a 28 px peso 500.

## Conseguenze

**Comportamento:**
- In vista normale ora, connessione, Sistema, chip e «Modifica» stanno in basso. In copertina, in modifica e nella vista pagine la fascia in alto non c'è più.
- «Modifica» ha il testo e sta nell'angolo di «Fine».
- Mentre un foglio è aperto l'ora resta coperta.

**Spazio:**
- Sul tablet a schermo intero la cella cresce di circa il 17 %.
- Sui telefoni sparisce la riga dei chip in alto, e con essa il cambio di misura delle celle quando l'unico chip compare o sparisce.
- In Chrome sul Lenovo il guadagno è nullo.

**Accessibilità:**
- La radice della barra passa da `<header>` a un gruppo dentro `<footer>`: sparisce il landmark banner e i comandi arrivano dopo i widget nell'ordine di tabulazione.
- `role=status` della connessione resta.
- Da verificare con TalkBack.

**API e dati:**
- AppShell perde lo slot `statusBar`.
- Nessun cambio al formato salvato (`LauncherLayout`, profili, impostazioni della barra). Nessuna migrazione.

**Prestazioni:**
- Più rimisure della fascia, coperte da una cache.
- Due livelli `will-change` piccoli invece di uno.
- Celle più grandi da rasterizzare.
- Va misurato sul tablet delle demo come in REP-20261012-003.

**Test:** vanno aggiornati, tra gli altri, StatusBarHidden, PagerBands, PolishCornice, Polish2Cornice, LagLayers, LagRenders, LauncherScreen, LauncherIndicatorCover, FixLauncherUiShell, FixSystemConnection, FixSystemFocus, SystemPage, PagerOverview e LauncherGestures. Elenco completo nel piano.

**Documenti** (con annotazioni datate, senza cancellare il testo storico):
- ADR-0012 :33, :37, :39, :58 e :79;
- ADR-0007, interfaccia OS e :98;
- design.md:58, 63, 67, 180, 190, 231-232, 284, 287-291 e 318;
- il commento di `REFERENCE_AREAS`;
- project-status.md, verification.md e infrastructure.md.

**Limiti:**
- Sistema resta senza PIN e il tasto Indietro non è gestito.
- I chip delle persone restano piccoli (13,3 px) fino a ISSUE-049.
- Il guadagno dipende dalla modalità di visualizzazione decisa con ISSUE-048.

## Verifiche e revisione

**Esiti esistenti:** nessuno. È una proposta: niente codice, niente test.

*Annotazione del 2026-10-14: le tappe 1-5 sono nel codice e verificate in Chromium headless e nei test (suite 145 file, 1815 test); gli esiti, i limiti e le questioni residue sono in [REP-20261013-002](../reports/REP-20261013-002-piano-barra-unica.md#verifiche-delle-tappe-1-6-2026-10-1314) e in [verification.md](../verification.md). Restano non eseguiti: misure del viewport sul dispositivo, prestazioni sul tablet, TalkBack, gesto dal bordo superiore, banco 0.9.3. Il guadagno di spazio sul Lenovo a schermo intero (75 → 88 px) è confermato dal calcolo e dal browser, non da una misura sul tablet. Condizione di revisione aperta dall'esito: nella vista pagine, sugli schermi bassi, le schede si rimpiccioliscono (−15 % a 1024×472, −21 % a 844×390).*

**Da verificare se accettata** (tappe in REP-20261013-002):
- misure del viewport sul Lenovo e sul tablet delle demo in Chrome, come app installata ed eventualmente in kiosk;
- test di guardia di righe, chiavi e grandezza visiva;
- typecheck, lint, tipografia, colori, `i18n:check`, suite completa e build;
- impronta geometrica prima e dopo in nove viewport e cinque stati, con griglia identica tra gli stati e fascia di altezza costante;
- prestazioni sul tablet delle demo confrontate con la 0.9.2;
- TalkBack, gesto dal bordo superiore e breve prova con la persona sul Lenovo.

**Revisione da aprire se:**
- la modalità finale lascia il tablet nella classe «telefono orizzontale» e il guadagno sparisce;
- il widget di ISSUE-049 sostituisce i chip delle persone, e la riga dei chip va ripensata;
- arriva il PIN di Sistema (ISSUE-023) o la gestione del tasto Indietro;
- l'utente chiede di nuovo una barra in alto, o un avviso dell'allarme in cima.
