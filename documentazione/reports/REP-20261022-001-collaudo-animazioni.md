# REP-20261022-001 — Collaudo delle animazioni del frontend (banco 0.9.25)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261022-001, collaudo delle animazioni per individuare i glitch del frontend; comprende la correzione del rilascio dopo la pressione lunga. |
| Stato | Completato come collaudo. I glitch sono registrati (ISSUE-108…114); nessuna correzione proposta è autorizzata. |
| Data | 2026-10-22 |
| Autore / modello | Claude Code (agenti del flusso di lavoro: correzione, banco, collaudo sul tablet, collaudo a misura di telefono, resoconto). Nome esatto del modello: non disponibile per i passi di prova. |
| Commit di partenza | `7298d4d` (working tree con le modifiche preesistenti non committate; nessun commit eseguito da questo incarico) |
| Richiesta di riferimento | Dell'utente, 2026-10-22: «Ho trovato un altro difetto, non ancora corretto. Se tieni premuto lo spazio vuoto vicino al bordo sinistro o destro, la pagina si rimpicciolisce e sotto il dito si trova la scheda della pagina accanto. Quando alzi il dito, quella pagina viene scelta e si apre in modifica. Premendo verso il centro dello schermo non succede. La correzione è piccola: ignorare il tocco del rilascio dopo la pressione lunga.» — «correggilo». Poi, dopo la prova col dito: «perfetto tutto sembra funzionare per quanto riguarda l'hold e modifica pagina, riduzione widget funziona, tenere premuto il widget lo fa shakerare, comparire il tratto attorno per rimpicciolirlo, il tap per aprire l'interfaccia e mostrare la lista di dispositivi per quel tipo si apre, mi sembra tutto ok a livello di funzionalità, ora dobbiamo eseguire i test sulle animazioni per individuare glitch di frontend». |
| Autorizzazione | La correzione del rilascio («correggilo») e il collaudo delle animazioni («dobbiamo eseguire i test sulle animazioni»). Nient'altro: le correzioni dei glitch sotto sono **proposte non autorizzate**. |

## Obiettivo e perimetro

Solo collaudo, più la correzione del rilascio. Esclusi: correzioni dei glitch trovati, refactor, nuove funzioni, dipendenze, commit, deploy. Il codice dell'app è stato toccato soltanto per la correzione del rilascio (`hooks/launcher/useLongPress.ts` e due file di test, descritti in [REP-20261021-003](REP-20261021-003-interazioni-schermo-intero.md), annotazione del 2026-10-22); il collaudo non ha modificato alcun file dell'app. Regole di lavoro: nessun comando a impianti reali, nessuna credenziale, token non letti, tablet non sbloccato con comandi di sistema, impostazioni di Android invariate, un solo browser headless sul PC con GPU spenta, mai suite, browser e tablet insieme.

Modifiche preesistenti: il working tree contiene le modifiche non committate delle tappe G3-G5, C1-C3 e dei ripristini del 2026-10-21; sono state preservate (copie PRIMA dei file toccati in `backup/animazioni-0.9.25/pre/`).

## Criteri di completamento

- Il rilascio dopo la pressione lunga non apre la pagina accanto: **raggiunto solo in parte**, vedi ISSUE-108.
- Suite, tipi, lint, build e dimensioni verdi sul codice con la correzione: raggiunto (tabella delle verifiche).
- Banco 0.9.25 rilasciato e sano: raggiunto.
- Scenari S1-S8 eseguiti sul Tab M11 con tre ripetizioni e una passata senza sonda; passata a misura di telefono: raggiunto, con i limiti elencati.
- Glitch confermati e intermittenti elencati con severità, prove e cause probabili: raggiunto.
- Causa dimostrata con esperimenti A/B: **non** richiesta e non fatta.

## Metodo

**Tablet** (Lenovo Tab M11 TB330FU, Chrome 156, 1280×665 a DPR 1,5, schermo a 90 Hz, banco `aca-system:0.9.25` su `192.168.1.27:3002`, `adb reverse tcp:3002`, CDP sulla porta 9225):

- tocchi sintetici con `Input.dispatchTouchEvent` via USB, movimenti a 14-30 ms; **non** sono un dito vero e non hanno la velocità reale di un gesto;
- sonda di pagina (rAF per fotogramma, `longtask`, `layout-shift`, eventi `transition*`/`animation*`, serie di rettangoli e opacità degli elementi seguiti, mutazioni di classe) e screencast JPEG, con tre ripetizioni per scenario;
- una passata «light» per scenario con solo rAF, senza sonda né video: **solo le passate light fanno fede per gli fps**, perché la sonda per fotogramma li dimezza in modifica (S3: 29-33 fps con sonda contro 48-60 senza); lo screencast è prova visiva, non misura;
- localStorage del launcher salvato prima e confrontato dopo ogni scenario (chiavi di accesso escluse e mai lette), ripristinato dallo script quando cambiava.

**Telefono** (nessun telefono reale): Chromium headless con GPU spenta (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`), viewport 390×844 a DPR 3 con tocco, più 12 scenari su 31 a 360×780. Il banco 3002 chiede il collegamento a Home Assistant e **non è stato usato**: server isolato degli e2e (`e2e/isolated-server.mjs`, porta 3003, nessun HA, nessuna credenziale) con il `dist` locale e le chiavi di layout del collaudo tablet. Il compositore software gira a 59-60 fps con blocchi tipici di 50-100 ms: **non dà tempi realistici**, vale solo per i glitch logici (salti di opacità o di dimensione, sovrapposizioni, layout-shift, stati bloccati). Il `dist` locale e quello servito dal banco differiscono di un byte (stringa di versione); il resoconto della passata non dice quale fosse 0.9.24 e quale 0.9.25.

**Scenari:** S1 pressione lunga sul vuoto, vista pagine, rilascio e Fine (centro, bordi); S2 vista pagine (a: tocco scheda; b: scorrimento; c: frecce di spostamento); S3 modifica (a: sollevamento e Annulla; b: ridimensionamento; c: trascinamento al bordo; d: sopra «Rimuovi»); S4 scorrimento tra pagine (lancio, lento, a metà, pagine con meteo e Casa 3D); S5 fogli «Collega» e «Aggiungi un widget», Sistema, fogli interrotti; S6 rimozione con «Annulla», suggerimento della prima volta; S7 interruzioni (pressione lunga durante lo scorrimento, Fine subito dopo l'apertura, doppio tocco sull'ingranaggio, «Pagine» mentre la barra sale); S8 movimento ridotto.

Strumenti nuovi in `backup/animazioni-0.9.25/strumenti/` (descritti in `backup/strumenti-tablet/LEGGIMI.md`).

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Correzione del rilascio, test mirati | `vitest run --maxWorkers=4` su `LauncherGestures`, `LauncherScreen`, `Casa3dShell`, `FixLauncherUi` | Superato: 4 file, 207 test | Le due prove nuove sul rilascio falliscono senza la correzione. |
| Suite completa del frontend | `npx vitest run --maxWorkers=4 --shard=1/2` e `--shard=2/2` | Superato: 183 file, 2611 test (1500 + 1111) | `backup/animazioni-0.9.25/suite-1a.txt`, `suite-1b.txt`; nessun processo vitest attivo prima. |
| Tipi, lint, tipografia, colori, i18n | `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npm run i18n:check` | Superati | `backup/animazioni-0.9.25/typecheck.txt`, `lint.txt`, `lint-typography.txt`, `lint-theme-colors.txt`, `i18n-check.txt`. |
| Build e dimensioni | `npm run build`, `node scripts/check-bundle-size.mjs` | Superati; index 808,7 KB su limite 900 KB; avviso Vite sui chunk oltre 500 kB non bloccante | `build.txt`, `bundle-size.txt`. |
| Banco 0.9.25 | copia a freddo PRIMA, `up -d --build` | Superato: `healthy`, `/api/health` 0.9.25, `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.27` | Copia `backup/banco/tunet-data-rilascio-pre-0.9.25-freddo.tgz`, 431905 byte, SHA-256 `e8a64c38…2aea1e9`; ripristino `ACASYSTEM_VERSION=0.9.24` più la copia; dettagli in `infrastructure.md`. |
| Prova del rilascio sul tablet, tenuta di 700 ms a 60 px dai bordi | gesto sintetico sul banco 0.9.25 | Superato: vista pagine aperta, nessuna pagina in modifica | `backup/animazioni-0.9.25/tablet/` (script e schermate). **La tenuta di 700 ms rilascia dentro la guardia di 800 ms; non copre le tenute lunghe, vedi sotto.** |
| Collaudo animazioni sul Tab M11 | S1-S8, 3 ripetizioni + passata light | Eseguito | `backup/animazioni-0.9.25/tablet/` (riepilogo-generale.txt, riepilogo.txt per scenario, 84 provini). |
| Collaudo a misura di telefono | S1-S8 su Chromium software, 390 e 360 px | Eseguito, con i limiti del metodo | `backup/animazioni-0.9.25/telefono/` (riepilogo-generale.txt, riepilogo.txt, provino.jpg e evid-*.jpg). |

Il collaudo non ha eseguito suite né Vitest durante le prove.

## Scenari e risultati

### Tablet (Tab M11, fps con sonda / senza sonda, picco del fotogramma)

| Scenario | Esito | Numeri |
|---|---|---|
| S1 vuoto, 1,5 s, vista pagine, Fine | Apertura e chiusura a scatti (F-02, F-03) | 58,5 / 64,9 fps; picco 333 / 222 ms. Blocco di 159-263 ms allo scatto della pressione; prima transizione 287-396 ms dopo; chiusura 289-404 ms dopo il tocco. |
| S1 bordo sinistro/destro, 1,5 s | **Difetto del rilascio presente** (F-01) | 55,6 / 45,1 fps; 3/3 per lato la pagina vicina si apre in modifica. Con 0,9 s non succede (2/2 per lato); al centro con 2,5 s nemmeno (2/2). |
| S2a tocco scheda → modifica → Pagine → scheda laterale | Scambio di barre a scatti (F-06) | 45,6 / 60,4 fps; tre fotogrammi da 289-424 ms. |
| S2b scorrimento delle schede | Fluido; salti di larghezza (F-12) | 71,2 / 80,1 fps; picco 200 / 100 ms. |
| S2c frecce di spostamento | Sovrapposizione e layout-shift (F-07) | 69,8 / 77,4 fps; layout-shift 0,3733 (3/3). |
| S3a sollevamento, trascinamento, rilascio, Annulla | Blocchi a ogni passaggio (F-05), maniglie, ingranaggio (F-10, F-11) | 32,2 / 59,7 fps; picco 467 / 289 ms; senza sonda drag 26,9 fps, rilascio 42,1, Annulla 72,8. |
| S3b ridimensionamento | Larghezza 257 → 410 px in 1-2 fotogrammi | 29,1 / 48,6 fps; picco 489 / 411 ms. |
| S3c trascinamento al bordo | Blocco 444 ms al primo movimento; copia staccata dal dito di 56-74 px | 33,1 / 58,5 fps; picco 489 / 378 ms. |
| S3d sopra «Rimuovi» | Fase a 29 fps | 33,0 / 59,4 fps; picco 445 / 300 ms. |
| S4a/b/c scorrimento tra pagine | **Fluido** | 72,1-78,4 / 79,5-83,4 fps; picco 78-189 / 67-156 ms. Indicatore visibile circa 2,0 s. |
| S5a/b fogli «Collega» e «Aggiungi un widget» | Animazione fluida (240 ms), avvio in ritardo (F-09) | 71,2 e 66,8 / 74,8 e 68,3 fps; foglio visibile 361-380 ms dopo il tocco. |
| S5c Sistema → Torna al launcher | Ritorno a pezzi (F-08) | 55,5 / 60,4 fps; picco 467 / 400 ms; layout-shift 0,3372 (3/3). |
| S5d fogli interrotti | Nessun tocco perso né stato incoerente | 55,1 / 60,4 fps; picco 478 / 433 ms. |
| S6a rimozione e «Annulla» | Pillola fluida; widget senza transizione (F-13) | 36,1 / 63,2 fps; picco 511 / 411 ms. |
| S6b suggerimento della prima volta | **Fluido** | 74,4 / 83,3 fps; picco 456 / 211 ms. |
| S7a-d interruzioni | Nessuno stato bloccato | 47,4-69,3 fps con sonda; picco 267-433 ms. S7a: il tocco che ferma il lancio consuma il gesto (vista pagine aperta 1/3). |
| S8 movimento ridotto (S1, S3a, S5a) | Nessuna scala né movimento di barre, solo dissolvenze di 120 ms; **i blocchi restano** | 72,1 / 67,9 / 73,2 fps con sonda; picco 300 / 278 / 245 ms. |
| Confronto ISSUE-107 (3 giri, `measure.cjs`) | Principale: apertura 55,4-56,6 fps (picco 333-367 ms), chiusura 51,1-56,7 (278-300 ms), ingresso in modifica 77,7-80,3 (256-289 ms). Luci e comandi: apertura 47,2-51,4 (333-378 ms) | Riferimento 0.9.22: apertura 46,9-47,6 fps (411-412 ms), chiusura 55,7-57,4 (278 ms), ingresso 88-89 fps (picco al massimo 56 ms). Apertura un po' meglio, chiusura invariata, ingresso peggiorato. |

### Telefono (Chromium software, 390 e 360 px)

| Scenario | Esito |
|---|---|
| S1 | Difetto del rilascio presente: tenuta di 1,4 s, 1,5 s o 2,5 s, bordo sinistro → Principale, destro → Clima e meteo, centro → pagina corrente in modifica, 3/3 a 390 e a 360 e anche con movimento ridotto; con 0,9 s e 1,2 s il rilascio è ignorato. Restringimento da pressione lineare (circa 600 ms) poi salto di scala e oscillazione verticale di circa 16 px (T-10). |
| S2 | Celle «+» a opacità 0 per 100-170 ms dopo il ritorno a piena grandezza (3/3); etichetta dell'indicatore che cambia di colpo; frecce: layout-shift 0,2386 e schede sovrapposte (3/3, solo «move before»). |
| S3 | Ingranaggio da 1 a 0,5 di colpo (3/3); sollevamento e atterraggio senza difetti gravi; Annulla e ridimensionamento fluidi; chiusura del foglio al tocco sul ventilatore: pannello più basso di 458 px in un fotogramma, layout-shift 0,04. |
| S4 | Scorrimento senza lampeggi; indicatore visibile circa 1,8 s. |
| S5 | Fogli «Collega» e «Aggiungi un widget» fluidi in apertura; chiusura di «Impostazioni del widget»: contenuto svuotato nel primo fotogramma, layout-shift 0,0165-0,0556; Sistema: ritorno a pezzi, layout-shift 0,2936 (0,319 con movimento ridotto), 0,2727 a 360. |
| S6 | Widget rimosso e ripristinato senza transizione; pillola fluida; possibile «Annulla» doppio per 2-3 fotogrammi (visto a occhio in una ripetizione). |
| S7 | Pressione lunga durante lo scorrimento: la vista pagine non si apre; «Fine» e «Pagine» durante le transizioni senza barre residue; la scheda attraversa l'etichetta in alto per circa 3 fotogrammi. |
| S8 | Niente scala né traslazioni; restano il difetto del rilascio, il layout-shift del ritorno da Sistema e quello della chiusura del foglio. |

## Glitch confermati

Gravità: alta = si vede o rovina un'azione che l'utente fa spesso; media = visibile ma non rovina l'azione; bassa = dettaglio. «F-» sono gli esiti del tablet, «T-» quelli del telefono.

| ISSUE | Glitch | Dove | Gravità | Ripetizioni | Stato |
|---|---|---|---|---|---|
| [ISSUE-108](../project-status.md#issue-108) | Rilascio dopo una pressione lunga oltre circa 1,3 s: la pagina accanto si apre in modifica (F-01, T-01) | tablet e telefono | alta | 3/3 per lato sul tablet, 3/3 a 390 e 360 | Confermato; la correzione di oggi è parziale |
| [ISSUE-109](../project-status.md#issue-109) | Il thread principale si blocca per 160-490 ms a ogni cambio di stato: apertura e chiusura della vista pagine, sollevamento, rilascio, ridimensionamento, scambio di barre non si vedono come animazioni (F-02, F-03, F-05, F-06, F-14) | tablet (sul telefono non misurabile) | alta | 3/3 in ogni scenario, anche senza sonda | Confermato; aggrava ISSUE-062 e ISSUE-107 |
| [ISSUE-110](../project-status.md#issue-110) | Ritorno da Sistema a pezzi, layout-shift 0,29-0,34 (F-08, T-02) | tablet e telefono | media | 3/3 in entrambi | Confermato |
| [ISSUE-111](../project-status.md#issue-111) | Scambio di pagine con le frecce: schede sovrapposte, layout-shift 0,24-0,37, piè di scheda che lampeggia (F-07, T-03) | tablet e telefono | media | 3/3 (solo «sposta indietro» sul telefono) | Confermato |
| [ISSUE-112](../project-status.md#issue-112) | Fogli: partenza in ritardo di 360-380 ms (F-09); contenuto di «Impostazioni del widget» che sparisce alla chiusura (T-04) | tablet / telefono | media | 3/3 | Confermato |
| [ISSUE-113](../project-status.md#issue-113) | Dettagli: celle «+» che tornano 0,15-0,33 s dopo (F-04, T-05); ingranaggio che si oscura di colpo (F-11, T-07); etichetta dell'indicatore che salta di larghezza (F-12, T-08); widget rimosso o ripristinato senza transizione (F-13, T-06); scheda che attraversa l'etichetta (T-09) | tablet e telefono | bassa | 3/3 | Confermato |
| [ISSUE-114](../project-status.md#issue-114) | Voce orfana in `tunet_card_settings` dopo «Annulla» di un trascinamento su un'altra pagina (F-15, T-11) | tablet e telefono | bassa (proposta, non è animazione) | 3/3 | Confermato |
| [ISSUE-105](../project-status.md#issue-105) | Titolo della pagina sopra i chip «Da collegare» (F-16) | tablet | bassa | in ogni fotogramma di modifica | Già noto, riprodotto |
| [ISSUE-107](../project-status.md#issue-107) | Numeri nuovi della vista pagine (F-14) | tablet | media | 3 giri su due pagine | Già noto, aggiornato |

## Glitch intermittenti o da riconfermare

| Osservazione | Dove | Ripetizioni | Nota |
|---|---|---|---|
| Maniglie di ridimensionamento che scompaiono e ricompaiono (F-10) | tablet | 3/3 in S3a, 2/3 in S3d, 3/3 con movimento ridotto | Sul telefono l'analisi lo ha riconosciuto come falso positivo (elemento nascosto con `visibility` all'inizio, entrata di 160 ms): da riconfermare con un dito vero prima di trattarlo come difetto. Gravità bassa. |
| Oscillazione verticale e salto di scala del restringimento da pressione (T-10) | telefono | 3/3 sui widget, 2/3 sul corpo | Dipende dal compositore software; sul tablet il restringimento «si congela e poi salta» (F-02). Da riconfermare. |
| Copia sotto il dito che sfuma a 0,39 e torna (S3d) | tablet | 2/3 | Non ripetuto in modo stabile. |
| «Annulla» doppio per 2-3 fotogrammi quando la pillola entra sopra la barra | telefono | 1 ripetizione, solo a occhio | Non misurato. |
| Il tocco che ferma un lancio consuma il gesto: la vista pagine si apre 1/3 | tablet (S7a) | 3 | Probabilmente voluto (il tocco ferma il lancio); registrato come osservazione, non come difetto. |
| Il fling emulato molto veloce salta anche 2 pagine e il punto d'arrivo varia | telefono (S4) | 3 | Probabile effetto dell'emulazione. |

Non sono difetti: un trascinamento lento oltre la metà che torna alla pagina di partenza solo con una traiettoria con rallentamento finale (con traiettoria lineare si ferma sulla pagina più vicina, 5 prove su 5); la comparsa dell'indicatore a scorrimento finito; in modifica il tocco su un widget da collegare apre anche «Collega» (previsto da ADR-0016).

## Cosa funziona

Scorrimento tra pagine (72-83 fps sul tablet, nessun lampeggio sul telefono), indicatore a comparsa, animazione dei fogli (240 ms, circa 20 fotogrammi, senza salti), pillola «Annulla», suggerimento della prima volta, interruzioni (nessun tocco perso né stato incoerente), movimento ridotto (nessuna scala né traslazione, nessuno stato bloccato). Il layout salvato è tornato identico dopo ogni scenario, salvo la voce orfana di ISSUE-114.

## Cause probabili

Da lettura del codice e dai tempi misurati; **nessuna è stata provata con un esperimento A/B**.

- **Rilascio (ISSUE-108).** `CLICK_GUARD_MS = 800` (`hooks/launcher/useLongPress.ts:5`) con `win.setTimeout(done, CLICK_GUARD_MS)` armato allo scatto della pressione (500 ms): la protezione scade a circa 1,3 s dal tocco. La soglia misurata sul telefono (1,2 s ignorato, 1,4 s no) e sul tablet (0,9 s ignorato, 1,5 s no) coincide. La correzione di oggi ha reso la guardia indipendente dal bersaglio ma non dal tempo.
- **Blocchi del thread (ISSUE-109).** `setEditMode(true)` e `setOverview(true)` allo scatto (`LauncherScreen.tsx` circa 999-1002) con `pages = descriptors.map(...)` (circa 1649): tutte le pagine rifanno render e restyle nello stesso commit (circa 170 mutazioni di classe nello stesso istante, poi un task di 256 ms), le transizioni CSS partono dopo. La chiusura (`Pager.tsx` 410-416) chiama `finishClosing` con un timer di `OVERVIEW_MS + 50`: se il thread è bloccato il timer scade prima della fine delle transizioni, che vengono cancellate. Il peggioramento dell'ingresso in modifica rispetto alla 0.9.22 è probabilmente l'effetto del ripristino 0.9.23 (celle «+» di nuovo montate).
- **Sistema (ISSUE-110).** `LauncherPage.tsx:159` nasconde il launcher con `hidden`; al ritorno le griglie rimisurano dopo il primo disegno.
- **Frecce (ISSUE-111).** L'ordine delle pagine cambia mentre le posizioni delle schede transitano, senza ordine di sovrapposizione stabile; il piè di scheda riparte da opacità 0 per `@starting-style`.
- **Fogli (ISSUE-112).** Il contenuto e lo stato React sono costruiti prima del cambio di `open`; alla chiusura lo stato del widget scelto viene azzerato prima della fine della transizione di uscita.
- **Dettagli (ISSUE-113).** Celle nascoste da `.is-overview/.is-closing/.is-settling` con ripristino in idle; `.aca-system-gear[inert]` senza `transition`; etichetta dell'indicatore senza transizione; widget montati e smontati da React senza stato di ingresso o uscita.
- **Voce orfana (ISSUE-114).** Il trasferimento fra pagine copia le impostazioni nella chiave della pagina di arrivo e «Annulla» non le toglie.

## Correzioni PROPOSTE (non autorizzate)

Nessuna è stata applicata. Ordine suggerito, da decidere con l'utente:

1. **ISSUE-108:** non far scadere la protezione per tempo finché il puntatore della pressione è ancora giù; armarla fino a `pointerup`/`pointercancel` dello stesso `pointerId` e lasciare solo dopo una finestra breve per il click che segue. Aggiungere un test con rilascio a 1,5-2,5 s (oggi i test coprono il rilascio dentro 800 ms). È l'unico punto di questo elenco che completa un incarico già autorizzato («correggilo»).
2. **ISSUE-109:** non passare `editMode` alle pagine non correnti finché non servono (memo o `content-visibility`), oppure avviare la vista pagine con uno stato leggero e rimandare il resto a un idle; far finire la chiusura sul `transitionend` con il timer solo come rete di sicurezza; anticipare lo stato «sollevato» con una classe sul DOM prima del render React. Misurare di nuovo con `strumenti/run.cjs` e `measure-ov.cjs`.
3. **ISSUE-110:** non usare `display: none` per il launcher sotto Sistema (o riservare le dimensioni delle griglie prima del primo disegno) e valutare una dissolvenza breve del cambio vista.
4. **ISSUE-111:** dare `z-index` alla scheda spostata e tenere stabile il piè di scheda durante lo scambio.
5. **ISSUE-112:** aprire il `<dialog>` prima di montare i contenuti pesanti; congelare l'ultimo contenuto renderizzato durante l'uscita.
6. **ISSUE-113, ISSUE-114:** correzioni minime elencate nelle voci.

## Controllo del diff e decisioni

Il diff dell'incarico sul codice è la sola correzione in `useLongPress.ts` con i test in `LauncherGestures.test.tsx` e `LauncherScreen.test.tsx`; il collaudo non ha toccato il codice (`git status` della passata telefono invariato a 452 voci). Nessun ADR creato o aggiornato. **Discrepanza da dichiarare:** l'annotazione del 2026-10-22 in REP-20261021-003 e il resoconto del banco indicano il difetto come corretto e la prova sul tablet come superata; quella prova teneva il dito 700 ms, dentro la guardia. Il collaudo con tenute di 1,4-2,5 s mostra che il difetto resta oltre circa 1,3 s. La correzione copre il caso già riprodotto dai test (rilascio dentro 800 ms) ma non l'enunciato dell'utente per tenute più lunghe.

Incidente da dichiarare: nella passata a misura di telefono, per liberare una porta, è stato eseguito `taskkill /F /IM chrome.exe /T`, che termina **tutti** i processi `chrome.exe` della macchina e può aver chiuso anche finestre di Chrome dell'utente. Non è stato verificato e non è recuperabile.

## Cosa non è stato provato

- Dito vero: tutti i gesti sono sintetici (tablet: `Input.dispatchTouchEvent` via USB; telefono: emulazione). Fps e picchi dei trascinamenti non sono quelli di un dito.
- Telefono reale, GPU reale sul telefono, densità reale; tempi e blocchi sul thread principale non sono confrontabili con quelli del tablet.
- Widget collegati a dispositivi, comandi, slider e manopole in uso, dettagli di un widget collegato, animazioni di dati reali, anteprima 3D della Casa 3D (la pagina è il segnaposto «Nessuna casa disegnata»).
- Avviso di disposizione bloccata (richiede di cambiare una scelta persistente in `tunet_launcher_layout`).
- Doppio tocco su widget, tocco lungo sui comandi, TalkBack, testo al 125 e 150 %, tastiera virtuale, rinomina/elimina/nuova pagina/nascondi nella vista pagine, «Meno/Più colonne», vassoio «+ Widget» della barra di modifica.
- Movimento ridotto solo su S1, S3a, S5a (e S5b-c sul telefono).
- Telefono: 12 scenari su 31 a 360 px; nessun'altra larghezza né orientamento orizzontale; PWA standalone non toccata; il `dist` usato non è l'immagine Docker in esecuzione.
- Cause: nessuna prova A/B, nessun CSS iniettato.
- Esecuzione «light» e confronto con ISSUE-107 non rifatti sul telefono.
- Un solo tablet e un solo banco; nessun commit; CI non dichiarata.

## Chiusura e punto di ripresa

Stato finale: localStorage riportato alle chiavi salvate (36 sul tablet, 35 sul telefono; accesso escluso e mai letto), pagina Principale in uso, nessun foglio aperto, movimento ridotto tolto, screencast fermato; sul tablet `adb reverse 3002` lasciato e forward 9225 tolto; sul PC server 3003 fermato e profilo temporaneo cancellato. Banco 0.9.25 in esecuzione (ripristino `ACASYSTEM_VERSION=0.9.24` più la copia PRIMA). Nessun commit.

Prossimo passo dentro l'incarico: nessuno oltre alla decisione dell'utente. Per proseguire servono: (1) la decisione di chiudere ISSUE-108 per le tenute lunghe, che completa «correggilo»; (2) la scelta dell'ordine tra ISSUE-109 e gli altri glitch; (3) una prova con il dito vero sul Tab M11 dei punti non provati. Nessun incarico di correzione dei glitch è attivo: il resto resta backlog proposto.

Prove: `backup/animazioni-0.9.25/` (fuori da Git), in particolare `tablet/riepilogo-generale.txt`, `tablet/S1-sinistro/rep1/provino-rilascio-bordo.jpg`, `tablet/S1/rep2/provino.jpg`, `tablet/S2c/rep1/provino-sposta-indietro.jpg`, `tablet/S5c/rep1/provino.jpg`, `tablet/misura-vista-pagine-Principale.txt`, `tablet/misura-vista-pagine-Luci-e-comandi.txt`, `telefono/riepilogo-generale.txt`, `telefono/390/S1-sinistro-1400/rep1/series.json`, `telefono/390/S5c/rep1/evid-ritorno-da-sistema.jpg`, `telefono/390/S2c/rep1/evid-scambio-frecce.jpg`, `telefono/390/S5a/rep1/evid-chiusura-foglio.jpg`; riferimento 0.9.22 in `backup/g3-c3/tablet/measure-0.9.22.txt`.

Per il commit che includerà il report usare `git log -- documentazione/reports/REP-20261022-001-collaudo-animazioni.md`.

## Rettifiche successive

Annotazione 2026-10-22 (banco 0.9.26): il banco `aca-system:0.9.26` contiene la correzione di ISSUE-108. Sul Tab M11, con gesti sintetici e attese reali, le tenute di 0,7, 1,5, 2,5 e 4 s sul vuoto a 45 px dal bordo sinistro, al centro e a 45 px dal bordo destro (3 ripetizioni, 36/36) lasciano aperta la vista pagine senza cambiare la pagina corrente, e «Fine» con un tocco normale la chiude; pressione lunga sul widget con trascinamento di circa 6 s nello stesso tocco: 3/3 spostato e «Annulla» lo riporta. Il difetto F-01/T-01 non si ripresenta con gesti sintetici; da confermare col dito. F-02…F-14 (ISSUE-109…114) non sono toccati da questa correzione. Dettagli in `infrastructure.md` (voce «banco 0.9.26») e prove in `backup/rilascio-0.9.26/prova/`. Nessun commit.
