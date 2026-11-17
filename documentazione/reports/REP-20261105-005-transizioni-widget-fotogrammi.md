# REP-20261105-005 — Transizioni widget, analisi dei fotogrammi

| Campo | Valore |
|---|---|
| Stato | Completato localmente: codice, build, fotogrammi e anteprima; banco .46 invariato |
| Data | 2026-11-05, Europe/Rome |
| Autore | Codex; nome esatto del modello non disponibile |
| Base Git | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`, 567 voci preesistenti modificate/non tracciate |
| Richiesta | «VERIFICA le transizioni e apertura widget perché l'animazione di ingrandimento in apertura e chiusura di un widget non funziona bene, perfeziona analizzando frame per frame». |

## Obiettivo e perimetro

Analizzare e correggere la continuità dell'espansione e del ritorno dei widget nel percorso condiviso Console. Baseline del codice/build realmente presenti dopo REP004, fotogrammi con tempi verificabili e confronto prima/dopo. Preservare tema/materiali, funzioni, comandi, API, dati e tutte le correzioni precedenti; niente nuove schermate, dipendenze o refactor estranei.

Fonti: [brief della superficie](../design/componenti/widget-schermata.md), [ADR-0045](../decisions/ADR-0045-transizione-widget-schermata.md), [report precedente](REP-20261105-001-transizione-generica-widget.md), [design](../design/design.md), [architettura](../architecture.md). Si usano animate/review-animations per la coerenza spaziale e surgical-coding per il diff minimo. Le prove precedenti non sostituiscono la verifica corrente richiesta dall'utente.

## Criteri di completamento

- Identificare difetti osservabili tra tessera, fotogrammi intermedi e schermo esteso, in entrambe le direzioni; registrare geometria, opacità, materiale e clipping.
- Correggere la causa comune, con ritorno coerente e inversione/interruzione senza scatti, lampeggi o Home bloccata.
- Conservare input, focus, Back/Escape, precedenza dei menu, scroll e preferenze di movimento ridotto/fallback.
- Verificare widget piccoli/grandi e Tavano su desktop/mobile, usando trace RAF a velocità normale e campioni temporali congelati dove appropriato. Non attribuire ai file PNG un timestamp non effettivamente misurato.
- Test significativi per le regressioni individuate, build/strict e review indipendente. Aggiornare anteprima4185, documenti pertinenti e limiti delle prove.

## Diagnosi e correzioni

La baseline reale conferma due difetti percettivi e una destinazione geometrica obsoleta. Tabella della review animate/review-animations:

| Prima | Dopo | Motivo |
|---|---|---|
| La fotografia della Console si scala con il pannello; compare un secondo rettangolo di montagne/lago stirato. | Piano con film, bordo interno e raggio ACA esistenti, senza fotografia nel piano mobile. | Il paesaggio resta nello sfondo fisso mentre si legge il volume del vetro. Nessun blur o raggio animati. |
| Home quasi a zero prima che inizi il contenuto: nel caso Tavano desktop a 165 ms Home 0,00068 e body zero. | Home e contenuto si incrociano negli ultimi 160 ms dell'ingresso da 280 ms. | Elimina il tempo quasi vuoto senza anticipare testi quando la scala è ancora molto deformata o allungare il budget. |
| Il primo candidato riattivava la Home a 160 ms, prima del ritorno da 200 ms. | Home in ritorno da 200 ms senza ritardo; movimento ridotto ancora da 120 ms. | Il contenuto visibile, inert e ritorno del focus restano coordinati. |
| Dopo resize da 1366 a 1024 il widget misura 476×476 ma la destinazione rimane 644×644. | Misura aggiornata dopo reflow del box reale, preservando l'origine immediata della prima apertura. | Il ritorno segue la tessera corrente, anche con gli stessi ID. |

Quattro file pertinenti:

- `design/themes/glass-white/white.css`: Console esclusa dal gruppo fotografico; film/rim/radius del kit statici, fallback opaco conservato.
- `design/themes/acasystem/components.css`: Home uscita da 160 ms con ritardo `sheet-in − content-in` (120 ms), ritorno da 200 ms senza ritardo. Curve e token esistenti, ridotto da 120 ms; geometria della Console e suo contenuto conservano 280/200 e 120+160/80 ms.
- `frontend/src/templates/launcher/LauncherScreen.tsx`: origine iniziale disponibile nel render precedente al primo paint, override aggiornato mediante ResizeObserver del widget reale e resize/orientation dopo due RAF esistenti. Confronto delle quattro coordinate, reset alla chiusura, cancellazione di observer/listener/frame pendenti; nessuna nuova API o modifica alla storia della Console.
- `frontend/src/__tests__/LauncherScreen.test.tsx`: nuova regressione per origine iniziale, resize, reflow senza resize, cleanup, riapertura dello stesso ID e cancellazione dopo unmount.

La prima versione del watcher cercava il comando di spostamento, presente soltanto in editing: test e browser hanno entrambi rilevato l'errore. Il lookup finale osserva il box `data-widget-id` incondizionato; il comando di editing resta estraneo al nuovo circuito. Conservati raw negativi, checkpoint della review iniziale e rettifica, senza presentarli come PASS.

## Analisi dei fotogrammi e verifiche

Baseline di quattro aperture/chiusure a 1366 e 390 px su sensore grande e Tavano. La matrice CSS finale comprende sei aperture/chiusure a 1366/390/320: **416 campioni RAF e 196 immagini del compositor**, con timestamp reali. Non sono fotogrammi artificialmente nominati a una scadenza presunta né una misura GPU/FPS del tablet.

Nel confronto finale la fotografia è assente dal piano mobile, filtri del piano assenti e overflow documento zero. L'indice `max(opacità Home, opacità effettiva body)` non scende sotto 0,401 nel campione, contro circa 0,00068 nella baseline: non rimane l'intervallo con entrambi i contenuti quasi invisibili. Il coordinatore e il revisore hanno visto personalmente fotogrammi intermedi desktop/mobile e ritorno con gesto.

| Controllo | Esito ed evidenza |
|---|---|
| Baseline unit delle primitive/transizione | 21/21 PASS, `baseline-motion-tests.json` |
| Suite finale con regressione geometrica | **197/197 PASS**, `motion-targeted-host-final.json`: Console, WidgetScreenTransition e LauncherScreen |
| Regressioni coreografia | **131/132 PASS**; unica regex overview già falsa prima dell'incarico, non nuova regressione. `motion-regressions.json`, `preexisting-motion-regression-probe.json`; ISSUE-134 distinto |
| Build e strict frontend/UI | PASS; `frontend-build-final.log` e typecheck. Avviso HLS oltre 500 kB preesistente |
| Contratti UI e copia asset | 9/9 PASS, `ui-assets.log` |
| Frame principali | Sei sequenze con apertura/ritorno su tre larghezze, stili finali congelati; `final-motion-qa.json` e `widget-motion-final-analysis.json` |
| Preferenze e interruzioni | Movimento ridotto, opaco, API di osservazione assente, chiusura rapida/riapertura e gesto annullato verificati sul checkpoint CSS, poi stili e primitive immutati |
| Ritorno dopo resize, ultimo JavaScript | PASS: errore massimo **0,0421 px**, sotto 2 px, `origin-fixed-edges.json`; il precedente errore di 168 px rimane documentato |
| Smoke finale, origine immediata | Due nuove sequenze dopo il fix host, `origin-fixed-motion-qa.json`: Tavano1366 e sensore390; primo rettangolo uguale all'origine, errore 0 px |
| Chiusura con gesto touch reale CDP | PASS funzionale e ispezione dei fotogrammi; offset del figlio trascinato valutato insieme all'opacità, senza dedurre un difetto dal solo endpoint invisibile |
| Diff e review indipendente | Quattro file previsti, nessuna rimozione/aggiunta applicativa o differenza estranea; otto hash REP004 conservati, review finale rettificata e approvata |
| Detector layout | `[]` sui tre sorgenti UI; non una certificazione generale di accessibilità |

Il timer di PanelPresence è stato controllato tramite transitionrun/end, currentTime/progress e rimozione DOM: in alcuni casi manca l'ultimo evento prima dell'unmount, ma il progresso supera 0,99992 e l'opacità residua è sotto 0,000078, con errore subpixel. Non è emerso uno stacco percettibile da correggere: nessuna modifica alla primitiva condivisa o all'uscita degli altri pannelli.

La regex storica pretende una scala senza il fattore `--aca-card-emphasis`. CSS launcher, test e Pager risultano byte-identici al checkpoint iniziale, e la stessa segnalazione era già documentata in REP002. Non si modifica codice estraneo per rendere verde la suite generale.

## Evidenze e controllo del diff

Evidenze private in `backup/rep049/`: manifest prima/dopo, checkpoint sorgenti, trace/JPEG di baseline/candidati/finali, test, sonde del resize e review. Riepilogo `widget-motion-qa-summary.json` e handoff `widget-motion-qa-handoff.md`; browser posseduti chiusi, fixture4184/4185 preservata. Il viewer **`widget-motion-comparison-filmstrip.html`** permette di confrontare e scorrere i fotogrammi effettivamente acquisiti prima/dopo, con 420 immagini referenziate verificate; i gruppi precedenti e le prove negative rimangono distinti. I due smoke sull'ultimo JavaScript aggiungono 123 campioni RAF e 58 immagini, separati dalla matrice CSS principale.

Snapshot finale: 1793 sorgenti, SHA-256 `5d4478317eb0297b516d0cd5c08377003a040cf9ef0cc1a07a125ad285290360`. Solo i quattro file elencati differiscono da REP004; nessuna dipendenza, contratto backend o API modificati. Whitespace controllato su copie LF senza convertire i byte dei sorgenti.

Nessun errore JS, richiesta mutativa di rete, origine esterna o comando HA nel campione browser. Dati sintetici e browser posseduti, senza login, credenziali, bozze o schede umane. Banco osservato healthy `0.9.46`, senza operazioni di aggiornamento.

## Chiusura e punto di ripresa

Incarico completato nel codice, nella build e nell'[anteprima4185](http://127.0.0.1:4185/?screen=app#/mockup), da ricaricare. Correzioni condivise tra le schermate già servite dalla Console, senza nuove schermate o comandi. Nessun lavoro residuo nel perimetro, installazione, pubblicazione, commit o versione del banco modificata.

Chromium Windows con viewport/touch emulati; nessuna prova fisica Safari/iPhone/Android/Lenovo M11 né misura della GPU. Le due famiglie di contenuto campionate e i test del percorso comune non equivalgono a ricollaudare tutte le integrazioni HA. I fotogrammi e i limiti precisano le evidenze precedenti di REP001, che resta conservato nello storico.

### Annotazione successiva, 2026-11-06

Il successivo riscontro umano ha sostituito il modello di ingrandimento con entrata dal basso e fade per Sistema e dettagli, senza velo globale sui dettagli. [REP006](REP-20261105-006-apertura-widget-finestra-apple.md) e [ADR-0046](../decisions/ADR-0046-apertura-widget-come-finestra.md) descrivono il nuovo incarico e la correzione del caricamento iniziale della Home. I risultati sopra restano riferiti alla variante precedente; non attestano l'accettazione estetica o la nuova implementazione.
