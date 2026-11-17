# REP-20261106-005 — Contenuti delle schermate widget senza tagli

| Campo | Valore |
|---|---|
| Stato | Completato e verificato localmente |
| Data | 2026-11-06, Europe/Rome |
| Autore | Codex; nome esatto del modello non disponibile |
| Base Git | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`,592 voci preesistenti modificate/non tracciate |
| Richiesta e autorizzazione | «questo bug che si tagliano le cose va evitato», con schermata Temperatura: comandi superiori e informazioni inferiori parzialmente tagliati. Correzione locale del layout/scorrimento pertinente, con verifica su browser. |

## Obiettivo e perimetro

Riprodurre il caso e rendere tutti i contenuti dei dettagli raggiungibili senza tagli accidentali, riusando Console e layout condivisi. Preservare design, animazioni, funzioni, navigazione e scorrimento. Nessun aggiornamento banco, pubblicazione, nuova dipendenza o refactor dei widget.

Fonti pertinenti: [ADR-0004](../decisions/ADR-0004-principi-frontend.md), [ADR-0046](../decisions/ADR-0046-apertura-widget-come-finestra.md), [brief delle schermate widget](../design/componenti/widget-schermata.md). La consegna Home REP004 è chiusa e rimane preservata. Checkpoint applicativo atteso1801file/SHAea750561; evidenze in `backup/rep055/`.

## Criteri di completamento

- Causa riprodotta e distinta dall'ordinario scorrimento di contenuti più lunghi del viewport.
- Primo e ultimo contenuto completamente raggiungibili, intestazione separata e nessuna sovrapposizione accidentale.
- Controllo desktop e formato telefono, altezza ridotta e navigazione da tastiera pertinente; animazione e ritorno conservati.
- Test mirato quando esiste codice da verificare, build/controlli pertinenti, confronto del delta e anteprima disponibile.
- Account, profili, dati e banco conservati; limiti ed evidenze registrati.

## Avanzamento

Diagnosi separata di sorgenti e browser, prima delle modifiche applicative. In esame contenitore della Console, colonne scorrevoli e contenuti adattivi; nessuna causa dichiarata prima della riproduzione.

### Riproduzione e distinzione dei casi

Checkpoint effettivo1801file/SHA `ea75056158d2702cd7665a8b70e523c5bad029be4f68269c4c74295271e82b73`, identico alla consegna precedente. Il detector layout sui file pertinenti restituisce `[]`; non costituisce prova di assenza di un problema visivo.

`baseline-console-clipping.json` e `baseline-1900-middle.png`:1900×880, intestazione fino a60px, colonna scorrevole fra60 e868px, clientHeight808/scrollHeight928, massimo scroll120. A metà scroll60px i pulsanti cominciano a55,31px (4,69px tagliati) e l'ultimo dato termina a920,39px; portando lo scroll a120 il dato termina a860,39px, completamente raggiungibile. Anche nei formati1366 e390 i due estremi sono raggiungibili. Desktop scorre la colonna, telefono il body; la scrollbar è nascosta come da richiesta precedente.

Il caso dello screenshot è quindi riprodotto come bordo netto a metà scorrimento, senza dimostrare dati persi o altezza errata. Prima di intervenire viene chiesto all'utente se compare all'apertura o durante lo scorrimento. L'eventuale riapertura rapida/retarget a scroll precedente è un caso distinto, non attribuito allo screenshot né modificato in questo intervento.

L'utente chiarisce successivamente **«Dopo aver fatto scorrere»**. Il perimetro viene quindi precisato sulla leggibilità dei bordi, senza introdurre reset all'apertura o cambiare la posizione scelta dall'utente.

Nella diagnosi iniziale non viene applicata una maschera indistinta allo scroller: può creare un nuovo confine per il backdrop dei controlli e alterare il vetro. Nessun padding arbitrario, scroll-snap o barra comandi fissa introdotti per mascherare una causa non accertata. Sorgenti applicativi e banco rimangono invariati durante quella fase.

### Prove visive e implementazione finale

Primo candidato: sfumature decorative separate dallo scroller, senza filtro o maschera sugli antenati. Test geometrici identici alla baseline, ma la visione di `candidate-1900-middle.png` mostra una fascia scura sotto il titolo; candidato scartato, non consegnato come correzione.

A/B successivo isolato: una maschera trasparente di24px ai bordi elimina la fascia. In Temperatura i tre ROI di grafico, controllo e foto esterna sono identici (MAE/max0); questo non viene generalizzato a tutti i materiali. La variante con foto interna compensativa peggiora leggermente i pixel e copre il badge della demo: scartata. Evidenze `mask-experiment.json` e PNG, nessuna modifica ai dati.

Il contenitore comune rileva solo i lati con altro contenuto, tramite scroll e ResizeObserver. Desktop considera ciascuna colonna; telefono il body. Dissolvenza di1,5em (24px nella fixture) soltanto sui lati necessari; nessuna maschera se il contenuto entra interamente. Intestazione esterna al trattamento, scorrimento del browser e posizione conservati. Scroll-padding2em protegge il focus da tastiera, senza aggiungere spazio alle dimensioni del contenuto. Forced-colors senza maschere; nessun nuovo blur, fotografia o reset.

Le aree contenenti vere card con materiale proprio conservano invece lo scorrimento precedente, senza maschera, per non isolare il loro backdrop dalla foto. Guardia condivisa su `.aca-card`, con esclusione dei pannelli nativi Popover/Sheet: questi restano nel DOM anche da chiusi e non devono disattivare il fade della Temperatura. Il primo selettore troppo ampio è stato riprodotto fallito nel browser e corretto; nessuna aspettativa indebolita. È una protezione conservativa del materiale, non una promessa di dissolvenza su ogni pannello personalizzato.

Tre file applicativi nel delta: `ui/primitives/components/Console.tsx`, `design/themes/acasystem/components.css`, nuovo `frontend/src/__tests__/ConsoleScrollEdges.test.tsx`. API pubbliche, dati, widget, tema Vetro Bianco e animazioni esistenti conservati.

## Verifiche e chiusura

| Controllo | Esito ed evidenza |
|---|---|
| Regressioni frontend finali |35/35PASS: nuovo ScrollEdges5, ConsolePrimitive12, WidgetScreenTransition9, ClimateConsole5, CameraConsole4. `console-scroll-tests-final.json/log`; prima prova sovrapposta non sommata. |
| Scorrimento e ciclo | Test dei limiti/intermedio, crescita asincrona, resize, colonne indipendenti, conservazione scroll/focus e cleanup. |
| Build e controlli condivisi | Build frontend/strict PASS (`frontend-build-final.log`),9UI/asset PASS (`shared-checks-final.log`), strict UI e colori0PASS. Warning HLS e debito ISSUE-134 preesistenti; suite generale e tipografia non rieseguite. |
| Detector layout | Prima e dopo `[]`; affiancato ai controlli browser, non usato per dedurre il PASS visivo. |
| Temperatura finale |1900×880 e390×844: inizio/intermedio/fondo, estremi interamente raggiungibili e scroller giusto; resize1366↔390, forced-colors, Tab fuori dal fade (y115). Nessuna variazione geometrica dalla baseline. `console-clipping-final.json`, PNG e10frame di chiusura. Scroll60 conservato fino alla rimozione, riapertura corretta. |
| Materiale centrale | A/B PNG dei tre ROI: MAE/max0/0. Root ha visionato desktop e telefono finali, senza fascia scura. Nessuna deduzione sui pixel della GPU hardware. |
| Menu Periodo | Dialog nativo con6ore/24ore/7giorni visibili; fade attivo nella colonna, Escape e ritorno focus, scroll60 conservato. `period-menu-smoke.json`, `final-1900-period-menu.png`. |
| Guardia del vetro reale | MediaPlayer/NowPlaying a1366×350: overflow93px, scroll20, pseudo-elemento con blur16px. La guardia mantiene mask:none anche con entrambi i bordi attivi; confronto su due ROI0/0. `real-blur-mask-ab.json`. Non viene dichiarato un A/B del precedente candidato senza guardia. |

Prove su contesti propri con dati dimostrativi; zero comandi HA, errori JavaScript o richieste esterne/mutative reali. Non collaudati Safari/iPhone, Android/M11 fisici o il banco installato. I bordi dello scorrimento continuano naturalmente a delimitare il viewport: la correzione ne attenua il taglio visivo, senza pretendere di mostrare contemporaneamente contenuti più alti dello schermo.

Audit finale:1801→1802file, SHA `4dc66c747a2fddca77594b32c5202aa956ee118fa6d450a7d12aa2664047f3c7`; esattamente2sorgenti modificati e1test nuovo, nessun altro file applicativo cambiato/rimosso. Backend, dipendenze, foto/font e precedente caricamento Home immutati. Evidenze in `source-audit-final.json`, diff locale e manifest test. Account, profili, bozze, banco0.9.46 e pubblica0.9.34 conservati.

Sigilli finali: `console-scroll-cross-review-final.json` senza blocker residui e `console-clipping-qa-seal.json` con handoff delle prove, sorgenti stabili e anteprima HTTP200.646collegamenti validi, integrità byte/SHA delle reference originali PASS, whitespace del delta/documenti PASS e newline sorgenti LF conservati. I soli avvisi Git CRLF/LF dei documenti non sono errori di whitespace. Nessun ulteriore collaudo pianificato dentro questo intervento.

Consegna locale: [ricaricare l'anteprima](http://127.0.0.1:4185/?screen=app#/mockup), aprire Temperatura e scorrere; verificare anche i due estremi e il menu Periodo. Nessun commit, deploy o aggiornamento banco. Nessun ulteriore incarico software implicito; futuri contenuti con card possono progettare una propria dissolvenza che conservi il backdrop.
