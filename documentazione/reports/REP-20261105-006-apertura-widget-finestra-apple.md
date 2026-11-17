# REP-20261105-006 — Schermate dal basso e caricamento unitario

| Campo | Valore |
|---|---|
| Stato | Completato localmente e verificato; banco distinto |
| Data | Avvio 2026-11-05; verifiche finali 2026-11-06, Europe/Rome |
| Autore | Codex; nome esatto del modello non disponibile |
| Base Git | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`, 568 voci preesistenti modificate/non tracciate |
| Richiesta | «non mi soddisfa l'animazione, la voglio in stile apple quando apri una finestra». |

## Obiettivo e perimetro

**Steering successivi nella stessa chat:** l'utente documenta con screenshot il caricamento a freddo della Home, con cinque frammenti circolari prima delle schede. Chiede inoltre esplicitamente di uniformare Sistema e dettagli widget a un ingresso dal basso con dissolvenza della schermata precedente, e di togliere il velo esteso dei dettagli per avvicinarli a Sistema. Questa direzione sostituisce il primo candidato centrato a scala0,94 già implementato e provato. Restano autorizzati il contenuto unitario e la correzione reale del caricamento Home, senza timer artificiali; le dimensioni finali e i controlli rimangono gli stessi.

Sostituire il modello di ingrandimento dalla tessera, rifiutato nel nuovo riscontro umano, con l'entrata dal basso e fade richiesti nell'ultima precisazione. Il primo candidato centrato è una tappa superata, non il risultato finale. Geometria e parametri ACA sono scelte esecutive dell'agente; non una riproduzione esatta delle animazioni proprietarie Apple.

Conservare dimensioni finali, layout, materiali ACA, contenuti, API/comandi, focus, Back/Escape, menu, scorrimento e preferenze di accessibilità. Il codice reso inutilizzato dalla sostituzione va valutato nel diff senza refactor estranei. Nessuna libreria, nuovo tema, chrome macOS, funzionalità, pubblicazione o aggiornamento del banco .46.

Fonti: [ADR-0046](../decisions/ADR-0046-apertura-widget-come-finestra.md), [brief](../design/componenti/widget-schermata.md), [report precedente](REP-20261105-005-transizioni-widget-fotogrammi.md), [design](../design/design.md). Guide apple-design, animate/review-animations e surgical-coding; il contesto Impeccable già letto nella sessione non viene rilanciato.

## Criteri di completamento

- Precisazione umana successiva: «Il contenuto dei widget deve essere caricato insieme a tutta quanta la scheda dei widget», evitando celle vuote che si riempiono dopo. Verificare presenza effettiva dei contenuti nel primo frame visibile, inclusi eventuali confini lazy/Suspense; non basta togliere il ritardo CSS.
- Sistema e dettagli dal basso senza scala, con dissolvenza della Home e contenuti unitari; rimuovere il velo globale dei dettagli, conservando il vetro delle singole superfici.
- Al reload della Home, montare schede con misure positive e dati iniziali coerenti; nessuna bolla o temporanea indisponibilità ricavata da uno snapshot non ancora arrivato.
- Movimento breve, interrotto/invertito dal valore corrente senza salto; nessun intervallo quasi vuoto tra Home e finestra.
- Preferenze ridotte/fallback, focus, scroll, Escape annidato e gesture conservati; niente input nascosto reso azionabile da timer obsoleti.
- Test semantici pertinenti, strict/build e verifica browser su desktop e formati mobile con fotogrammi reali e confronto prima/dopo.
- Preservazione del checkpoint sorgenti e del banco; aggiornare fonti progettuali e punto di ripresa senza riscrivere i report chiusi.

## Avanzamento e verifiche

Checkpoint 1793 sorgenti, SHA-256 `5d4478317eb0297b516d0cd5c08377003a040cf9ef0cc1a07a125ad285290360`, identico a REP005. Evidenze private in `backup/rep050/`; analisi, implementazione, review e QA separate. Il diff è confrontato con questo checkpoint, non con HEAD che comprende molti interventi preesistenti.

### Modifiche effettive

- Console comune: tolti origine/FLIP e body differito; titolo, comandi e contenuto condividono il movimento. Restano DialogShell, PanelPresence, history e gesture. Riapertura rapida ripulisce l'offset del gesto e il suo recupero obsoleto.
- Sistema e dettagli: salita di 24 px e opacità, senza scala. Console280/200 ms, Sistema140/96 ms, ridotto120 ms di sola dissolvenza. Home sfuma insieme e resta non interattiva sino alla rimozione dell'overlay. Sono valori esecutivi ACA.
- Tema Vetro Bianco: fotografia sul piano fisso; nessun film, bordo o blur globale della Console. Materiale delle singole superfici e fallback opachi conservati.
- Home: host non montati con cella zero; ultima misura positiva preservata sulle pagine saltate, epoca aggiornata soltanto da misure valide. Fit adattivo iniziale in layout effect prima del paint. Il difetto originale produceva host di10×30px o controlli di21–103px, poi ingranditi dalla transizione CSS.
- Sistema lazy: il marker di commit risiede nel medesimo Suspense del contenuto effettivo. Soltanto il nuovo ingresso staged attende quel marker; callback vecchie non riattivano scene chiuse. Route diretta e Casa conservano i percorsi precedenti. Un test ha trovato il replay di un updater obsoleto: il guard precede ora l'accodamento dello stato.

### Evidenze già concluse prima dell'ultimo controllo Home

196/196 test Console/Launcher/transizione dopo la prima sostituzione;21/21 coreografia aggiornata;8/8 readiness geometrica e74/74 con PagerFarPages;63/63 LauncherColumns con fixture geometrica corretta. I gruppi si sovrappongono e non sono un unico totale. I due failure iniziali Columns erano box jsdom zero, corretti nel solo setup dei test interessati. Sistema readiness39/39 finale: conservato il precedente37/39 che ha intercettato il vero problema di callback obsoleta. Strict frontend/UI e build superati;9/9 UI/copia asset, detector statico layout `[]`. Warning chunk HLS preesistente; nessun aggiornamento delle dipendenze.

QA reale Chromium isolato su4185: matrice fade-up5/5 (1366,390,320, ridotto e opaco) più ricontrollo390 dopo i guard Home. Titolo/body/controlli presenti dal primo frame visibile, scala1 e salita entro24px, nessun velo globale; Tab, focus, menu/Escape, chiusura precoce e riapertura superati nei casi pertinenti. Sistema cold reale da ingranaggio3/3 dopo fix lazy:45controlli complessivi già montati al primo frame, nessuno Skeleton visibile durante l'ingresso; ritorno focus e zero target interattivi Home prima della rimozione. Manifest e build distinguono le revisioni provate.

### Rettifica del primo PASS Home

`home-cold-final.json` dimostra15/15host su1920/1366/390 già alle dimensioni native finali (errore0px). Non dimostra da solo assenza di placeholder dipinti. Il JPEG1366-008 mostra «Dispositivo non disponibile / Configura dispositivo» a607,20ms; il RAF più vicino,618,8ms, leggeva già i controlli. Il frame del compositor prevale sul conteggio DOM. Negativo e tempi sono conservati in `home-placeholder-compositor-limitation.json`.

Diagnosi: il provider pubblicava `entitiesLoaded` prima dell'applicazione dello snapshot nel RAF throttled, e LauncherScreen montava Pager anche senza configurazione pronta. Corretto con commit atomico snapshot/readiness e primo mount del Pager dopo entrambe le fonti pronte, mantenendolo durante le riconnessioni. Snapshot vuoto valido; niente conteggio minimo, nuovo placeholder o timer.189/189 test finali (provider9, warning4, LauncherScreen176), strict e build PASS; review5/5hash. La suite Screen completa ha richiesto una misura fisica esplicita nel solo setup jsdom: prima93test non trovavano gli host per il nuovo gate geometrico. Nessun bypass di produzione o allentamento delle asserzioni.

La QA successiva `home-data-final*` conferma la rimozione della falsa indisponibilità, ma il JPEG1366-018 mostra ancora «Caricamento dei comandi…». Negativo distinto e conservato: il catalogo `get_services` veniva richiesto solo dopo il mount dei widget. Corretta anticipando la stessa lettura/cache nel compositore LauncherScreen e passando il catalogo già risolto al runtime comune, prima del primo Pager. Empty/reject diventano catalogo vuoto valido; risposte di connessioni precedenti non valgono per quella corrente. Non si attende lo storico dei grafici né le risorse multimediali: occupano spazi già dimensionati e mantengono gli aggiornamenti remoti.

Ultime regressioni194/194 (Screen181, provider9, warning4), adattivi23/23 e mirati servizi6/6 PASS; questi gruppi si sovrappongono. Coperti catalogo fornito/vuoto/rifiutato, un'unica lettura per più widget reali, controlli già presenti nel primo DOM e cambio connessione con risposta tardiva. Strict e build finali PASS in `frontend-build-complete-final.log`; review servizi3/3hash e snapshot5/5, con esiti finali letti dai JSON.

**QA finale dopo il catalogo anticipato:** `home-complete-final-paint-review.json`,3/3cold Home1920/1366/390 e71JPEG effettivi rivisti. Tutti15host alle dimensioni native definitive dal primo visibile, errore0px; controlli/icone iniziali già quelli finali, nessun paint di falsa indisponibilità o comandi in caricamento. Root ha visto anche i primi fotogrammi1366/390 a piena risoluzione. I conteggi di tutti gli SVG non sono stabili perché i grafici ricevono lo storico dopo: non confonderli con la stabilità dei controlli, che è verificata. Prima dell'ingresso si vede il paesaggio, poi le schede complete nella fixture nota; non è una promessa su qualunque dato HA futuro.

`complete-provider-smoke.json`: singolo percorso finale390 Home→Sistema→Home→sensore Console→Home PASS,9controlli nella Console, focus restituito e sorgenti stabili. Zero errori JS, richieste mutative, origini esterne o comandi HA nel campione. La matrice completa precedente non è rivendicata come rieseguita dopo l'ultima modifica del solo caricamento. Handoff e viewer dei fotogrammi: `apple-window-qa-handoff.md`, `apple-window-frame-viewer.html` e gallerie `home-complete-final*` in `backup/rep050/`.

### Integrità e limiti

Audit `source-scope-audit-final.json`:1793file prima/dopo,23modifiche attese, nessuna aggiunta/cancellazione/differenza inattesa. SHA finale `b9a7066740fc44e19399cb817bde23b530d5ded5731825a58fb3577864831b04`. Le sovrapposizioni dei manifest sono risolte nell'ordine delle tappe, non confuse con divergenze; tutti i before più antichi coincidono con il checkpoint. Whitespace dei soli23delta verificato su copie normalizzate LF, senza riscrivere i sorgenti o controllare indiscriminatamente l'intero dirty tree.

Chiusura documentale:562collegamenti relativi verificati, nessuno interrotto; integrità degli artefatti nativi PASS. `git diff --check` sui documenti pertinenti senza errori; soli avvisi CRLF/LF. Anteprima HTTP200 e banco healthok/.46, HEAD identico alla base. Evidenza in `docs-check-final.log` e risultati dei controlli di chiusura della sessione.

Nessuna nuova dipendenza, endpoint, schema, account, profilo o permesso; non sono state inviate azioni HA né toccati browser/storage umani. Banco osservato healthy0.9.46, non aggiornato. Suite generale non rieseguita: il debito preesistente ISSUE-134 e la regex storica della coreografia già falsa in REP005 restano distinti; questo report non dichiara il progetto globalmente privo di regressioni. Nessuna prova hardware Safari/iPhone/Android/M11, misura GPU o collaudo di tutte le integrazioni HA.

## Chiusura e punto di ripresa

Incarico completato il2026-11-06 nella build e nell'[anteprima4185](http://127.0.0.1:4185/?screen=app#/mockup), da ricaricare. Sistema e dettagli dal basso, contenuto unitario senza velo globale; caricamento iniziale della Home corretto per misure, snapshot e catalogo comandi. Stato/report/decisione/brief e verifiche aggiornati. Nessun ulteriore lavoro assegnato nel perimetro.

Banco3002 ancora0.9.46; account e profili conservati, nessuna installazione, pubblicazione o commit. Prova umana dell'anteprima, eventuale incarico di aggiornamento del banco e hardware restano distinti dalle verifiche software eseguite.

### Annotazione successiva, 2026-11-06

Il riscontro umano successivo documenta uno scatto del vetro della Home al termine della dissolvenza, non rilevato dalle precedenti verifiche su geometria/contenuti e assenza di velo globale. [REP-20261106-001](REP-20261106-001-continuita-blur-ritorno-home.md) isola il confine d'opacità con confronti pixel e corregge il solo CSS del materiale, mantenendo direzione e durate di questo report. I risultati sopra restano riferiti al relativo checkpoint, senza trasformarli in un PASS di continuità del blur.
