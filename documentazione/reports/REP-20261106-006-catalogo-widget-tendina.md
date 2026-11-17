# REP-20261106-006 — Catalogo widget a tendina con anteprime

| Campo | Valore |
|---|---|
| Stato | Completato e verificato localmente; anteprima disponibile |
| Data | 2026-11-06, Europe/Rome |
| Autore | Codex; nome esatto del modello non disponibile |
| Base Git | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`,594 voci preesistenti modificate/non tracciate |
| Richiesta e autorizzazione | L'utente propone il catalogo con anteprime e autorizza «procedi». Precisa poi apertura dal basso verso l'alto, widget sfogliabili destra/sinistra e schede intere. Nell'ultima indicazione rifiuta il pulsante inferiore: l'attivazione è uno scroll verso il basso sulla Home, seguito dalla salita automatica del catalogo da fuori schermo e dalla dissolvenza della griglia principale. Le precisazioni prevalgono sulle due interpretazioni precedenti, non ancora consegnate. |

## Obiettivo e perimetro

Catalogo visuale a tutto schermo attivato da **scroll verso il basso sulla Home**, senza pulsante o maniglia di apertura. Il comando avvia la salita automatica **dal basso verso l'alto**, da fuori visuale, mentre la griglia principale sfuma. Su touch lo scroll logico verso il basso corrisponde al dito verso l'alto su una superficie passiva; i comandi dei widget e i loro contenuti scorrevoli conservano le proprie interazioni. Tipi di widget sfogliabili **orizzontalmente per pagine**: anteprime e didascalie intere, dimensionate allo spazio corrente, senza lista verticale dei tipi. Chiusura esplicita, Escape/Indietro e gesto interno, con ritorno della Home. I moduli successivi conservano lo scorrimento necessario alle opzioni. Anteprime dimostrative e non operative, raggruppamenti del catalogo esistente e flussi di associazione/aggiunta già presenti. Nessun comando, stream, lettura dei log reali o dato personale nelle anteprime.

Preservare layout, ID, permessi, profili e salvataggi; rispettare caricamento Home, uso esclusivo, lock, pagina corrente e priorità delle schermate. Nessuna nuova dipendenza o modifica backend, migrazione, rifacimento dei widget, aggiornamento banco o pubblicazione.

Fonti: [ADR-0004](../decisions/ADR-0004-principi-frontend.md), [design ACA](../design/design.md), [caricamento Home](REP-20261106-004-caricamento-home-unitario.md), [bordi dei dettagli](REP-20261106-005-contenuti-console-senza-tagli.md). Report e checkpoint antecedenti agli edit sostanziali; evidenze in `backup/rep056/`.

Decisione accettata in [ADR-0048](../decisions/ADR-0048-catalogo-widget-tendina.md), requisito REQ-32/AC-32. Nessuna sostituzione dello stack o dipendenza esterna: il nuovo contenitore riusa le capacità modali/focus del kit.

## Criteri di completamento

- Scroll verso il basso sulla Home attiva la salita automatica del catalogo da fuori schermo; dissolvenza contemporanea della griglia e ritorno inverso alla chiusura. Nessun pulsante/maniglia o fascia riservata per aprire il catalogo nella Home.
- Gesto su superfici passive, senza sottrarre scroll e comandi ai widget; alternativa da tastiera, chiusura/Escape/Indietro e focus. Non attivare sopra Sistema, dettagli, editor, profilo occupato o Home non pronta; nessun click residuo dopo il gesto touch.
- Anteprime riconoscibili, dimensioni stabili e caricamento limitato a quelle visibili; nessuna azione, subscription, stream o richiesta reale avviata dalle anteprime.
- Scelta, associazione quando necessaria e aggiunta alla pagina corrente riusano le logiche esistenti, compresi ingressi discovery/auto-add e blocchi.
- Catalogo orizzontale paginato indipendente dal gesto verticale del drawer, schede e didascalie intere a riposo senza overflow verticale; cambi di idea e annullamento senza perdere lo stato della Home, movimento ridotto e cleanup corretti.
- Test pertinenti, strict/build, controlli del kit, QA browser desktop/mobile e audit del delta; dati e banco conservati.

## Avanzamento

Baseline pubblica congelata prima degli edit:235file/5.866.645byte, dist/design/UI verificati contro gli originali. Checkpoint sorgenti atteso1802file/SHA4dc66c74. Responsabilità separate: presentazione/gesti e integrazione, anteprime isolate, QA; documenti e verifica indipendente dal coordinatore.

### Prima direzione, superata durante le prove

Primo catalogo dall'alto con lista verticale, maniglia superiore della Home e anteprime dimostrative: gesto1:1 provato su1366/390, scena foto fissa e fit delle miniature corretti dopo i primi rilievi. Test dei writer e della conservazione dati superati; esiti e negativi conservati in `backup/rep056/`. Il sigillo sorgenti prima dello steering è1809file/SHA `b3883aca2998490aad74468c0210df5010f9f1b9fa120d6c17fc03a9b63b50bf`. Non è l'accettazione della nuova direzione.

L'utente segnala che quella soluzione non corrisponde all'intento: chiede esplicitamente apertura verso l'alto e navigazione destra/sinistra; mostra il taglio delle righe a metà scorrimento verticale. La QA precedente è interrotta e registrata come **parziale/pre-steering** (`catalog-direction-change-partial-seal.json`), senza promuoverla a PASS del nuovo flusso.

### Precisazione umana e fase2

Checkpoint antecedente alla correzione in `backup/rep056/phase2/source-before.json`; conservati dati, anteprime isolate e regole di aggiunta. Nuova maniglia nella fascia inferiore della Home, direzione del drawer invertita, catalogo orizzontale a pagine dimensionate sul viewport. Il renderer della preview scala uniformemente il canvas320×240 dentro larghezza **e altezza** disponibili, con didascalia separata: non tagliare i contenuti per farli sembrare della misura giusta.

Le prime tre prove di adattamento a riposo risultano corrette; emergono due regressioni del pager durante navigazione animata e gestione del focus, riprodotte prima della correzione. La QA viene nuovamente interrotta alla precisazione seguente: `phase2/phase2-partial-handoff.md` e relativo sigillo distinguono fit verificato, vecchio gesto superato e prove non eseguite. Non è l'accettazione dell'apertura mediante pulsante.

### Attivazione tramite scroll, fase3

L'utente chiarisce esplicitamente che non vuole aprire con il pulsante inferiore: vuole lo scroll sulla Home e una traslazione automatica del catalogo dal basso, dissolvendo la griglia principale. Checkpoint prima degli edit: `backup/rep056/phase3/source-before.json`,1811file/SHA `f991228d49eb69bc9c577a5d5ae26cae1f5c51beeee7b4eab594b074c3614316`. Rimozione del comando e della fascia della Home; listener locali e protetti, riuso della scena di dissolvenza esistente con proprietari distinti per dettagli e catalogo. Conservate anteprime isolate e impaginazione orizzontale. Correzione contestuale delle due regressioni del pager già riprodotte.

## Verifiche e chiusura

### Risultato finale

Nessun comando «Widget» o fascia riservata nella Home. Uno scroll verso il basso con rotella/trackpad su una superficie passiva attiva il catalogo; su touch il gesto equivalente è il dito verso l'alto. Soglia48px per la rotella,56px per il tocco, dominanza verticale e alternativa PageDown. Comandi, campi e scroll nativi annidati conservano le proprie interazioni, anche al bordo dello scroll. La verifica di pagina, lock, uso del profilo e transizione del Pager è ripetuta al momento dell'apertura. Il click sintetico dopo il gesto touch è soppresso anche dopo una pressione prolungata.

Il pannello sale automaticamente da fuori schermo mediante translateY, mentre la griglia Home sfuma; chiusura esplicita, Escape/Indietro e maniglia interna verso il basso conservano il contesto. La foto resta ferma, con ritaglio della scena coerente con l'ingresso; nessun filtro globale aggiuntivo. La Home sfuma solo dopo il commit effettivo del pannello, poi ritorna contemporaneamente alla chiusura. Proprietari distinti per dettagli e catalogo impediscono cleanup o completamenti vecchi che riaprano la Home prematuramente.

I28 tipi si sfogliano destra/sinistra per pagine intere. Il pager misura larghezza, altezza e didascalie, conserva tipo/focus durante il cambio di formato e distingue destinazione animata, scroll nativo e interruzione dell'utente. Preview uniformemente scalate dentro lo spazio disponibile:18 renderer adattivi con runtime sintetico privato e10 vignette per widget autonomi. Nessun comando, subscription o dato della casa reale. Associazione e aggiunta restano in `useAddCard`; conservati discovery, auto-add, lock e regole della pagina piena.

### Test e controlli

| Controllo eseguito | Esito ed evidenza |
|---|---|
| Vitest mirati,13file; `npm test -- --reporter=json` con elenco nei risultati |296casi unici coperti. Giro completo294PASS/2errori negli helper; blocco aggiunta ricontrollato3/3PASS, con1caso già passato. Non è dichiarato un singolo run296verde. `phase3/catalog-combined-final-results.json`, `catalog-complete-final-tests.json`, `launcher-addition-final-tests.json`. |
| Contratti drawer, scroll, scena, pager, launcher e moduli |66/66PASS inclusi nei296. Negativi di click prolungato, busyRef e scrollend intermedio riprodotti prima del fix; asserzioni funzionali conservate. Gli helper finali attendono il vero commit lazy e cercano Next nella navigazione del catalogo. |
| Anteprime isolate |9/9PASS nella fase2, stessi quattro file nella fase3; fixture sintetica e strict verificati, esiti in `phase2/preview-results.json`. Non sommare run sovrapposti. |
| `npm run build -w frontend`, strict frontend e `npm run typecheck:ui` |PASS, `phase3/frontend-build-release.log` e log strict/UI. Avviso HLS oltre500kB preesistente, nessuna dipendenza aggiornata. |
| `node --test ui/contract.test.mjs design/copy-assets.test.mjs` |9/9PASS. |
| `npm run lint:theme-colors -w frontend`; detector Impeccable layout sui componenti interessati |0violazioni colore; detector `[]`. |
| `npm run lint:typography -w frontend` |Una violazione preesistente in `connect.css:103`, conservata e distinta dal lavoro corrente e dal debito ISSUE-134; nessuna dichiarazione di suite generale verde. |
| Diff rispetto alle copie prima dell'incarico |20file dell'owner senza errori whitespace;11originali con terminatori preservati. Preview nuove e dati sintetici separati; nessun confronto falsato dal grande diff preesistente di HEAD. |

Le evidenze del primo gesto e della fase2 restano storiche: non certificano l'attivazione corrente. Conservati anche i fallimenti intermedi reali e gli errori del harness, senza trasformarli retroattivamente in PASS.

### Prove browser

QA su Chromium proprio e demo isolata, con handoff/sigillo `phase3/qa-final-handoff.md` e `qa-final-seal.json`. Nessuna credenziale o sessione reale del banco.

- Bundle finale `index-BZELyAGA.js`: wheel+80 su tessera passiva apre automaticamente, nessun pulsante/slot Home,9campioni intermedi di salita con fade effettivo concorrente e nessun campione Home invisibile senza pannello.21JPEG compositor con timestamp originali, trace RAF indipendente; Escape ritorna alla Home.
- Tutti i28 tipi visitati su1366×900,390×844 e320×568:24pagine complessive, schede e didascalie intere a riposo, overflow verticale massimo1px di arrotondamento. Questa matrice era sul bundle precedente; i successivi fix non cambiano preview o geometria. Consultazione:0scritture simulate,0API/WebSocket/comandi HA/errori. Provenienza del bundle conservata nei raw.
- Guardie di comandi e scroll annidato, soglia24→48, PageDown, navigazione rapida monotona, doppia chiusura e lock provati sul finale. Touch390: gesto verso l'alto, hold950ms e rilascio senza dettagli/comandi residui; swipe orizzontale, swipe verticale innocuo e movimento ridotto senza traslazione automatica.
- Tavano e Luce aggiunti con una sola nuova identità ciascuno nella propria visita. I raw si fermano successivamente per un selettore troppo generico e un tentativo di riapertura prima della fine del rientro: sono osservazioni writer completate, **non PASS globali dei due script**. Lock e doppia chiusura hanno una prova fresca indipendente conclusa. La destinazione Luce su pagina di overflow è il comportamento già esistente.
- Ritorno: tre ROI PNG prima/dopo identici, MAE/maxRGB0/0; anche gli ultimi due paint JPEG risultano0/0 nei medesimi ROI. Compressione e campione limitato dichiarati: non sono FPS, benchmark GPU o garanzia hardware. Il coordinatore ha visionato fotogrammi intermedi, catalogo desktop/mobile e ritorno.

Uso esclusivo e Home non pronta sono coperti anche dall'integrazione controllata; non simulano un login reale. La cella libera sulla pagina piena non ha una nuova prova browser conclusa; il contratto resta coperto dai test del launcher e dai writer. Nessun collaudo fisico M11, Android o Safari/iPhone, nessun nuovo benchmark di rete o caricamento Home.

### Fonte finale e consegna

Audit di tutti i sorgenti pubblicabili contro il checkpoint iniziale:1802→1815file, **24delta attesi:11modificati e13nuovi;0estranei e0originali rimossi**. SHA finale `d07a51f36516ef46645fe4f3669ec84c915e34aa26ba5b95b30e091e9b2ceaa3`; manifest `phase3/final-manifest.json`, sigillo `phase3/source-final.json`. Il nome TopDrawer, introdotto soltanto nella prima fase di questo stesso incarico, non rimane nella fonte finale. Backend, dipendenze, immagini/font, account, profili e bozze preesistenti conservati.

[Anteprima locale](http://127.0.0.1:4185/?screen=app#/mockup) aggiornata e disponibile: pagina HTTP200 e39risorse JS/CSS collegate HTTP200, `phase3/preview-resources.json`. Per provare: attendere la Home, scorrere verso il basso su una tessera senza agire sui suoi comandi; nel catalogo sfogliare a destra/sinistra e richiudere con X/Escape. Su touch usare il gesto logico equivalente verso l'alto. Banco3002 resta0.9.46 e release pubblica0.9.34; nessun install, deploy o commit eseguito.

Controllo documentale finale:674collegamenti validi, integrità byte/SHA degli originali nativi PASS e diff whitespace documentale senza errori. Manifest finale riletto contro i24file effettivi e quello dell'owner:0divergenze dopo il sigillo. Evidenze in `phase3/docs-final.log` e `docs-whitespace.log`; gli avvisi Git di conversione CRLF/LF non sono errori whitespace.

Incarico locale concluso. Punto di ripresa: riscontro umano sull'anteprima; l'eventuale aggiornamento del banco, i collaudi hardware e la ristrutturazione dei singoli widget restano attività distinte, senza incarichi aggiuntivi impliciti.

## Evoluzione successiva, 2026-11-06

Dopo la consegna l'utente richiede navigazione con il dito e chiusura verso il basso **senza pulsanti**. Il nuovo [REP007](REP-20261106-007-catalogo-widget-solo-gesti.md) aggiorna queste interazioni; la consegna e le evidenze qui riportate conservano il loro significato storico.
