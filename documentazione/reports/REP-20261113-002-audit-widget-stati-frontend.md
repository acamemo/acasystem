# REP-20261113-002 — Ripasso di stati e frontend di tutti i widget

| Campo | Valore |
|---|---|
| Stato | Completato localmente — build .71 verificata |
| Data | 2026-11-13, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta | «fai una ripassata su tutti i widget e controllane stati e frontend, usa impeccable per correggerne errori visivi se ne trovi» |
| Autorizzazione | Audit di tutti i widget e correzioni concrete di presentazione/stati, nel design ACA Vetro Bianco; build locale verificata. Nessuna nuova famiglia, API, capacità, dipendenza, reset o pubblicazione. Banco .70 conservato; eventuale nuova installazione distinta. |

## Obiettivo e perimetro

Censire tutti i tipi del catalogo e le varianti native/prodotto, verificando tessera, dettagli e strumenti pertinenti a dimensioni reali desktop/telefono. Stati normali, caricamento, dati mancanti/ignoti/indisponibili, vuoto, errore e comandi pendenti/negati. Correggere difetti visivi e rappresentazioni fuorvianti già riprodotti, con primitive esistenti, senza modificare permessi o azioni fisiche. Account/profili/disposizioni, altre modifiche dirty e scene/gesti comuni conservati.

Impeccable è guida di audit e polish, non autorizza un nuovo design o nuove funzioni. Context già eseguito nella sessione, non ripetuto; playbook audit/polish e craft-floor applicati. Le istruzioni dell'utente autorizzano le correzioni dopo l'audit. Fonti: design/design.md, REQ-18/19, ADR-0004/0005/0049 e brief di famiglia.

## Criteri di completamento

- Matrice di copertura per ogni tipo/variante e stato, con evidenza reale o limite esplicito.
- Prove sintetiche isolate a320/390, intermedio/tablet e desktop, nomi lunghi, estremi, compatte minime e dettagli. Nessun comando fisico o accesso a account/domestica.
- Attesa/vuoto/errore distinguibili, unknown non diventa spento/zero; controlli compatibili leggibili e non tagliati, pulsanti/menu e focus coerenti.
- Correzioni alla causa più circoscritta, preservando materiali/font/colori ACA e flussi; niente blur/zoom nuovi, maschere generiche per occultare tagli o refactor estranei.
- Test di regressione pertinenti e strict/build/UI/asset, confronto con ISSUE-134. Detector con falsi positivi distinti dall'osservazione visiva; niente conformità WCAG/hardware dedotta dai test.
- Build locale .71, fonte/pacchetto verificati e QA finale. Banco .70, HA/D1 e dati domestici conservati.

## Avanzamento e modifiche

Checkpoint .70:2003file, SHAe6bbfae7, verificato byte per byte e ZIP completo.889voci Git preesistenti conservate. Audit parallelo per famiglie prodotto, servizi e verifica visiva; raccordi/primitive e utilità gestiti dal coordinatore.

Il catalogo effettivo contiene **29 tipi**, tre senza dettagli per contratto (orologio, data, separatore). La baseline del pacchetto .70 ha coperto tutti i tipi Home e26 dettagli a320/390/1366/1916; dove prodotto e storico differiscono sono rami distinti, non dedotti dal solo nome. Dimensioni minime impostate nell'editor nativo e poi ripristinate: una dimensione vietata dal registro non è contata come difetto.

| Difetto confermato | Correzione circoscritta |
| --- | --- |
| Presa a320, track/knob fuori dal bordo | Toggle compatto esistente nella Home, riga riducibile e stato a capo; feedback conservato. Dettagli con controllo completo. |
| Cost/Nordpool monoriga, valore tagliato | Correzione della classe compatta concatenata; nome e valore occupano due righe, icona decorativa rimossa soltanto in compatta ed etichetta della lettura accessibile. |
| Ora e giorno sotto9px al minimo64×64 | Minimo Caption nella sola tessera, senza alterare la Copertina o la scala normale. |
| Tavano monoriga, titolo/evento tagliati | Numero di eventi interi commisurato all'altezza; nella minima azione, avatar e autore sostituiscono le tre righe complete. Registro e dettagli conservati. |
| Trova dispositivi, intestazione compressa a34px | Conteggio testuale senza badge duplicato, icona decorativa esclusa nelle tessere strette e lista ridotta nelle più basse. |
| Separatore64×64, ingranaggio44px interamente fuori | Traccia riducibile; al minimo resta il controllo centrato, alle larghezze sufficienti testo/linee condividono lo spazio. Nessun bersaglio ridotto. |
| Clima prodotto, Toggle/target oltre il minimo2×2 | Riepilogo adattivo con letture e modalità; controlli completi nella Console e feedback già pendenti conservati dopo resize. |
| Luce/Cover/Sensore storici minimi, controlli e cifre tagliati | Densità fisica applicata anche al tier nominale compatto; comando44px senza didascalia aggiuntiva nella monoriga, valore di lettura integro e nome/stato accessibile del controllo conservati. |
| Stato errore Robot al minimo2×2 | Spaziatura locale ridotta nel body corto; stato di attenzione e comandi esistenti restano interi, senza riduzione di font o bersagli. |
| Loading/indisponibilità/feedback storici1×1 e monoriga | Skeleton condiviso; configurazione come avviso circolare44px; feedback con indicatore sintetico e testo completo accessibile. Handler, stato osservato e richieste pendenti invariati. |
| Messaggio di configurazione Energia/Prezzi/Auto salvati monoriga | Query locale della primitiva UtilityCard: icona decorativa esclusa, titolo e istruzione su due righe intere con ellissi intenzionale; DOM completo e dettagli conservati. |
| Calendario/Attività indisponibili monoriga, compreso158×66 a390 | HomeNotice usa titolo e messaggio su righe contenute sotto100px; si conserva la modalità icon-only sotto81px e la Console completa. |

Nessuna modifica a risolutori, unità, comando HA, permessi, account, associazioni, quote o protocolli. Nessun nuovo materiale, font, animazione, maschera del blur o dipendenza. Le asserzioni Discover e Clima vengono aggiornate soltanto per il markup/conteggio intenzionalmente modificati.

## Verifiche ed evidenze

Risultati/evidenze sintetiche in backup/rep084; verifiche non eseguite e limiti sono espliciti. Nessun audit hardware o login umano autorizzato implicitamente.

Il detector Impeccable su `components/widgets` restituisce0 rilievi prima/dopo. La scansione iniziale aggiuntiva della cartella tema restituisce un warning sulla gerarchia dell'HTML dimostrativo `kit.html` ed esce parzialmente in errore: non equivale a un audit completo verde e non autorizza la modifica di quella reference. Le correzioni sopra derivano da PNG, rettangoli e hit test effettivi, non dal solo detector.

L'audit di stati unisce test dedicati e fixture sintetiche isolate. Normale, loading, vuoto, unknown, indisponibile, lettura fallita e comando pending/negato sono qualificati per famiglia nelle matrici di `backup/rep084`; non tutti questi stati esistono per un orologio o un separatore. Gli scenari DEMO `unreachable` ed `extremes` modificano soltanto il sottoinsieme previsto. `empty` ha reso22 placeholder e una pagina Tutti vuota: non prova il vuoto di29 singoli widget. Nessuna conclusione universale è ricavata da questi tre scenari.

### Matrice di copertura

| Tipi del catalogo | Stati controllati e base della verifica |
| --- | --- |
| `rileva`, `tavano` | Consultazione, loading, assenza risultati/eventi, errore e dati precedenti; scoperta/paginazione/copia/esportazione nei test dedicati. Home/strumenti nella QA del pacchetto. |
| `light`, `plug`, `climate`, `cover`, `fan`, `lock`, `alarm`, `camera`, `vacuum`, `mower` |407 test iniziali di12file;53 Prese e41 Clima dopo i fix. Fixture Home60/Console30 per10famiglie, placeholder2, OR Clima8 e feedback dopo resize6, errore Robot8. Binding assente, caricamento, ignoto, indisponibile, nome lungo, pending/rifiuto/errore di comando distinti e interamente sintetici. |
| `androidtv`, `appletv`, `media`, `sonos` | TvProduct/MediaProduct128 e MultimediaIntegration; letture, fonti/testi lunghi, capacità assenti, unknown/unavailable, pending/negato. Rami prodotto e storici distinti quando il seed li espone. |
| `sensor` | SensorProduct: unknown/invalid/missing/unavailable, unità native, storico vuoto/loading/errore. Il binding di sola lettura non ha pending di un comando; helper storico minimo verificato a parte. |
| `cost`, `nordpool` | EnergyWidgets: caricamento, mancanza/configurazione incompatibile, zero/unknown/unavailable/invalid, prezzo e quantità distinti; minime122×48 nella UI reale. |
| `car` | CarWidgets: fonti mancanti, unknown distinto da inattivo, unità native ed errori/attese delle capacità già supportate; estremi e monoriga. |
| `weather`, `cover_weather` | WeatherWidgets/WeatherIntegration: caricamento, fonte mancante, indisponibilità, forecast/storico vuoti/errore/retry. Il valore corrente non diventa previsione o storico. |
| `calendar`, `todo` | AgendaUi/AgendaLifecycle/ComfortCalendar/ComfortTodo: vuoto/loading, lettura fallita con dati precedenti, intervalli/giornata intera e riconciliazione del comando. Rifiuti presentati dal messaggio generico già esistente. |
| `room`, `zigbee` | Rooms2026 e Zigbee2026/Gateway: dati precedenti e registro stale/offline, unknown, dispositivi assenti, join negato/timeout, backup solo con admin verificato. Nessun radio/hub reale. |
| `cover_clock`, `cover_calendar`, `spacer` | Senza dettagli né comando HA per contratto; leggibilità a64×64, geometria/configurazione del separatore e ripristino del formato. Non attribuiti stati di backend non applicabili. |

Il gruppo finale strutturato ha **881 PASS +19 FAIL su900 casi unici/37 file**, senza sommare le ripetizioni; il gruppo iniziale407 è riportato separatamente poiché alcune sue suite ricompaiono nei post-fix. I19FAIL finali del gruppo root(209PASS/228) corrispondono esattamente a nome/prima riga sulla .70 isolata. Nessuna nuova regressione non classificata; non è una dichiarazione di CI completa verde. UI3, asset6, strict frontend/UI e build .71 PASS. Lint7/0warning e tipografia1 preesistenti, colori0; fingerprint lint invariato. Dettagli in `verification-summary.json` e ISSUE-134.

Fixture e test non sostituiscono pixel, protocollo HA o hardware. Il server della fixture importa i componenti reali con runtime/entità sintetiche, senza bootstrap account, proxy o trasporto domestico; Home60/Console30 hanno0 errori JS/richieste bloccate. Le prove di comandi mock sono intenzionali e separate dalle catture DEMO in sola lettura. Legacy:12 notice e4 comandi Light/Cover pendenti/negati verificati, con marker dentro la cella e messaggio completo accessibile. Il server4210 è stato chiuso con PID verificato. Nessun processo di banco o HA fermato.

L'ultimo controllo ha inoltre coperto **12 fixture pixel** Energia/Prezzi/Auto salvati, dimensione2×1 reale138×64/contenuto122×48, quattro stati per famiglia. I tre messaggi vuoti prima si tagliavano; dopo il fix titolo e istruzione occupano75.02–94.33/99.92–118.58px entro72.8–120.8px, con ellissi e testo completo. Sono componenti/runtime reali isolati da Vite, non screenshot del pacchetto statico; tutti2003 input finali sono verificati byte-identici. Il ramo salvato senza categoryWidgetType resta distinto dal nuovo placeholder neutro del catalogo. Browser/server chiusi,0 errori JS/comandi/esterno. La scritta compatta Auto indisponibile resta abbreviata «Non…», con DOM/title completi: limite esplicito, non una lettura numerica inventata.

### Identità dei pacchetti e limiti

La candidate2 ha completato11 contesti e224 aperture(32 varianti×7 viewport/scenari),35 minime/29 tipi ripristinate, catalogo29/29 a1366/320 e nuova Luce tramite flusso nativo a1366/1916/390/320, senza errori JS, rete esterna/WS o comandi. È la baseline immediata delle ultime rifiniture. La candidate3 aggiunge12 righe di `utilities.css` per CardMessage;4/5 correggono HomeNotice in `home.css`. I56 chunk JavaScript sono identici alla2 dopo normalizzazione dei soli nomi asset generati (`candidate2-to-final-proof.json`). Questo non equivale a pixel uguali: le prove3/4/5 hanno attribuzione separata, non acquisiscono retroattivamente i224 dettagli della2.

Candidate3:4 contesti,70 minime(normal/unreachable) e70 ripristini per29 tipi, cataloghi29/29 e nuova Luce sui quattro viewport;0 errori JS/rete/comandi. L'ispezione ha trovato due tagli HomeNotice, quindi il solo exit/status del runner non è considerato un pass. Candidate4: normal320/unreachable320/390 su Calendario, Attività, Meteo e Meteo di casa; corretti320, residuo Todo390 al contenuto158×66. La soglia64px è stata estesa a100px nella5, mantenendo il limite di larghezza per la modalità icon-only. Helper aggiornato con verifica esplicita della paintbox del messaggio; negativi e pacchetti precedenti conservati.

**Retest finale5 PASS:** Calendario/Attività unreachable320/390,4 minime e4 ripristini,4 dettagli leggibili;0 messaggi fuori frame,0 nuovi P2,0 errori JS/richieste esterne o bloccate/WS/comandi. Browser/server chiusi e copia del runner verificata. Il coordinatore ha ispezionato PNG finali di Tavano/Energia/Separatore/Clima, marker Cover, i3 CardMessage e Todo390. Nessun P2 confermato resta aperto nel campione verificato. Handoff in `visual-final-notes.md`, esito in `candidate5-targeted/summary.json`.

Consegna finale .71: fonte2003file/SHA`dc1db4e8281084ffac7dd2762115f3c74a8988fd683de16007a3e19c0f8d077b`,19 file modificati/0aggiunti/0rimossi/0cambiEOL/0spazi finali aggiunti. ZIP web2775729byte/110file/SHA`e689d079449e95161457b2472c4b5459c5883e8a056a853167eeba7a7e4c493d`; entry`index-T7EpKMpS.js`/SHA`d2e6decfde19aa26752226ed3ebd2955e4038d4a718e821d8cfd887047c97243`. ZIP sorgenti7654644byte/SHA`bf18ae2be23972a3fb550c1e55fa7479154b50b64e590d88c968fbbfe8032979`; ogni entry verificata. Manifest e HTTP della preview corrispondono al dist completo e alla versione .71. Banco .70 e dati domestici non aggiornati.

Nessuna prova fisica di Safari/iPhone, Lenovo M11, touch/trackpad reale, GPU/FPS, provider, radio, camera o sincronizzazione autenticata. Le semantiche TV storiche che interpretano unavailable+wakeable come standby/spento sono conservate: il rendering non prova lo spegnimento fisico. Disclosure40px e il bordo di alcune hitarea estese Cover sono osservazioni condiviseP3 in ISSUE-161; non dichiarata una hitarea44 universale o conformità di accessibilità sulla sola geometria.

Escluso dalla qualifica il primo helper di resize, che ha toccato accidentalmente il Toggle e generato1 comando esclusivamente nel mock; nessun invio esterno grazie alle barriere. La ripetizione valida ha usato una zona neutra e0 comandi. Esclusi falsi positivi su `sr-only`, ombre, hitarea dei Toggle e cifre Cost integre. Conservati anche il primo build RED per la grammatica container CSS, corretto prima della build candidata.

## Controllo del diff e decisioni

Confronto con checkpoint completo e ZIP sorgenti finale byte-esatto:19 modificati, nessun file aggiunto/rimosso o cambio EOL. Soltanto componenti/CSS coinvolti nei difetti e2 asserzioni corrispondenti alla presentazione aggiornata; dipendenze, API, registri, salvataggi, permessi, account e shell non modificati. Nessun archivio storico alterato, commit delle modifiche preesistenti o pubblicazione. Proposte condivise fuori incarico in ISSUE-161, non implementate.

Comandi pertinenti: `npm run build` frontend con `ACASYSTEM_VERSION=0.9.71` (include strict), `npm run typecheck:ui`, `npm run test:ui`, `npm run test:design`; Vitest sulle suite elencate nei sette report JSON di `verification-summary.json`, con `--maxWorkers=2` nei lotti finali. Controlli generali `node scripts/lint.mjs --format json`, `npm run lint:typography`, `npm run lint:theme-colors`; detector `impeccable.cmd detect --json progetto/acasystem/frontend/src/components/widgets`. Baseline isolata dei quattro file negativi, comandi/risultati/misure e ricostruzione delle fixture nei memo `devices-audit.md`, `service-widget-audit.md`, `remaining-widget-state-audit.md` e `widget-fixture/verification.md`. Audit fonte, sigillo e provenienza riproducibili con `audit-source.py`, `seal-artifact.py`, `compare-candidates.py`, `finalize-evidence.py` in rep084. Nessun test generale del backend ripetuto, perché non modificato; nessun esito backend nuovo dichiarato.

## Chiusura e punto di ripresa

Completati audit, correzioni e consegna locale .71. [Anteprima con dati simulati](http://127.0.0.1:4201/?screen=app#/mockup), preview PID29524 lasciata disponibile; i server privati della QA sono chiusi. [ZIP web locale](../../backup/rep084/acasystem-web-0.9.71-local.zip) e [sorgenti verificati](../../backup/rep084/source-final-0.9.71.zip). Fonte/pacchetto/HTTP e versione corrispondenti, `verification-summary.json` e manifest finale conservati. Account/profili e banco .70 invariati, nessun comando fisico o pubblicazione.

Nessuna attività software assegnata resta in sospeso per questa ripassata. Eventuale aggiornamento del banco/pubblicazione e collaudi fisici richiedono un incarico distinto; usare questo manifest .71 come origine concreta, preservando il backup operativo del REP001. ISSUE-134/161 e i limiti sopra non sono promossi ad assegnazioni automatiche.
