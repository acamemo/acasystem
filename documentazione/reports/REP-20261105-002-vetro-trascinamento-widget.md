# REP-20261105-002 — Vetro leggero durante il trascinamento

| Campo | Valore |
|---|---|
| Stato | Completato nel codice, build e anteprima locale |
| Data | 2026-11-05, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta e autorizzazione | L'utente segnala troppo blur mentre sposta il widget nelle due immagini e accetta con «perfetto fallo» la proposta di vetro più leggero: partire da2px sulla copia mobile, fondo meno bianco, testi/icone nitidi, bordo/ombra leggera, spazio iniziale indicato da un contorno e materiale normale al rilascio. Verificare la doppia rappresentazione osservata. |

## Obiettivo e perimetro

Correggere soltanto la presentazione del widget in spostamento. Conservare vetro a riposo, geometria/gesti del drag, destinazioni, pile, annullamento, rimozione, transazioni e API. Il lavoro precedente sulle schermate condivise resta preservato. Nessun aggiornamento del banco .46, dipendenza, pubblicazione o installazione assegnata.

Stato Git iniziale:559voci preesistenti modificate/non tracciate; copie ed evidenze in `backup/rep046/`. Fonti: [design](../design/design.md), [ADR-0004](../decisions/ADR-0004-principi-frontend.md), [ADR-0016](../decisions/ADR-0016-schermo-intero-interazioni.md). Modalità Operate; non aggiungere una nuova animazione dei filtri.

## Criteri di completamento

- Una sola rappresentazione mobile con contenuto leggibile e blur2px, senza vetri sovrapposti sul testo.
- Materiale di trascinamento più trasparente, bordo e ombra lievi; posizione iniziale segnata senza un secondo widget visibile.
- Materiale normale recuperato dopo rilascio o annullamento; nessun segnalino/sagoma residuo.
- Geometria, validità destinazione, pila/rimozione e commit invariati.
- Verifica visiva e DOM su desktop/telefono simulato, fallback e preferenze pertinenti; controlli mirati sul trascinamento e smoke della transizione widget precedente.
- Build/anteprima aggiornate e documenti coerenti. Hardware e banco reali distinti.

## Analisi iniziale

Il tema Vetro Bianco usa16px. DragGhost clona il frame e dovrebbe nascondere il pannello di ripiego tramite `.has-copy`; l'originale dovrebbe essere invisibile tramite `.is-dragging`. Il titolo centrato delle immagini corrisponde al fallback, ma la causa della sovrapposizione non è ancora riprodotta nel DOM. Serve verificare il percorso effettivo prima di ridurre il solo valore del blur.

## Avanzamento e verifiche

Baseline riprodotta su fixture con puntatore reale: originale `.is-dragging` correttamente nascosto; copia del frame presente, ma `.has-copy` perso quando React riscrive className durante il movimento. Rimane quindi visibile anche il fallback col nome centrato. Il riquadro lattiginoso stazionario è l'indicatore di destinazione `.aca-launcher-drop`, anch'esso filtrato dal tema: non è l'originale. Evidenze `backup/rep046/drag-baseline.json`, `drag-baseline-held.png` e scenario valido `drag-baseline-valid.json/png`. Non sommare aritmeticamente i raggi dei filtri sovrapposti.

Il preview della destinazione sposta anche il rettangolo del source host, pur nascosto: nel caso valido x31→361. Un contorno applicato a quel nodo non indicherebbe l'origine. La correzione prevista usa un indicatore puramente visivo ricavato dalla posizione iniziale già disponibile, senza cambiare i calcoli o i dati del drag.

Implementazione completata nel codice: segnale DOM stabile `data-has-copy`, separato da className gestito da React. Il clone non viene ricreato a ogni spostamento; il marker viene rimosso dal cleanup e il fallback resta disponibile se manca il frame. Una sola superficie a2px/film5% sulla copia, pseudo-filtri del clone disattivati, bordo/ombra lievi e testo nitido. Nessuna animazione del blur, nuovo timer o lettura di stile a ogni movimento.

La posizione iniziale usa uno span puramente visivo con i valori di `drag.origin`, non il rettangolo del source che cambia nel preview. La destinazione in move ha contorno senza riempimento/filtro; le celle libere sono temporaneamente prive del materiale quando il grid espone il mode move. Non cambiano display, opacità, hit area o handler delle celle. Add/resize e materiale a riposo mantengono il percorso precedente. Stati invalidi, pila e cestino conservano i propri segnali e tempi; fallback opaco distinto dal vetro filtrato.

Cinque file pertinenti: DragGhost, WidgetGrid, layout CSS condiviso, tema Vetro Bianco e test DragGhostLift. Copie/hashes iniziali e finali in `backup/rep046/`; la precedente consegna001 resta verificata tramite i suoi10hash. Nessuna modifica a useWidgetDrag, controller o API.

## Verifiche ed evidenze

| Controllo | Esito | Evidenza e limiti |
|---|---|---|
| Copy marker e drag/drop | Superato45/45 | `drag-glass-targeted-tests.json`: otto DragGhostLift (tre nuove regressioni su rerender/cleanup) e37LauncherDragDrop |
| Regressioni gesti/pile/schermata | 84/86, due controlli storici falliti | `drag-regressions-final.json`: due regex overview erano già false nel CSS prima dell'incarico, provato con `drag-regression-baseline-style-probe.json`; non sono corrette fuori perimetro. Prima prova83/86 includeva un terzo rilievo del parser CSS, corretto mantenendo drop ultimo nel gruppo di selettori, senza cambiare le proprietà |
| Strict e build | Superato | `frontend-build-quiet-final.log`; avviso chunkHLS preesistente distinto |
| UI condivisa e asset | Superato9/9 | `shared-checks-final.log`, tre contratti UI e sei asset |
| Colori | Superato, zero violazioni | `theme-colors.log`, nessun nuovo colore globale |
| Review indipendente | Approvata nel perimetro | `drag-glass-independent-review.json`, `drag-glass-final-review.md`; cinque file e dieci hash della consegna precedente conservati, esaminate anche le immagini desktop/mobile finali |

### Prime verifiche visive e limiti delle ipotesi

La build mostra la singola copia nitida e il contorno originario nella posizione corretta anche quando il source preview si sposta. Prima della rifinitura delle celle libere il coordinatore ha osservato una scacchiera lattiginosa sotto la copia, appartenente ai veri riquadri liberi e non a un secondo ghost: rimossa soltanto durante move. Una prima ipotesi sul grafico troppo alto era errata: misure effettive source/clone corrispondono (chart383,828px, SVG361,172px, più la scala di sollevamento esistente). Nessun intervento sul grafico.

La prima sonda sul riposo interrogava il pseudo sbagliato, quindi non vedeva i16px del face; il tentativo è conservato e la verifica corretta usa il face effettivo. Il comportamento temporale del cestino è stato osservato separatamente dalle assunzioni del harness, senza modificare CSS storico per ottenere un PASS: l'opacità esistente0,6 resta fino al teardown, e la rimozione effettiva/cleanup sono verificati. Non dichiarare un nuovo fade a zero; osservazione separata in ISSUE-148.

## Collaudo finale browser e conservazione

Riepilogo `backup/rep046/drag-glass-qa-summary.json`, con gruppi sovrapposti da non sommare:

- Tre scenari desktop riusciti: destinazione valida con reflow e drop, rifiuto/ritorno, anteprima pila e annullamento. Marker stabile, fallback nascosto, un solo piano a2px, film5%, testo a opacità1; origine ferma mentre il source preview si sposta.
- Quattro casi aggiuntivi riusciti: touch CDP390/320 con annullamento, movimento ridotto e trasparenza ridotta. Smoke separato della schermata widget e ritorno al launcher riuscito.
- Tre ricontrolli sulla build quiet finale: desktop1366, mobile390 e rimozione reale nella fixture con cleanup. Celle libere prive di fill/ombra/filtro durante move; al termine niente mode flag/origin/ghost residui e materiale normale16px ripristinato.
- Due verifiche di isolamento riuscite: resize effettivo mantiene il materiale normale senza ghost/origine move; fallback opaco mobile mantiene la copia solida e senza filtri, con contenuto leggibile. L'add-tray non ha un ingresso UI attivo in questa versione: prova manuale non eseguita, codice distinto e fallback unitario verificati.

Detector statico `[]` e due scansioni render `[]`. Il coordinatore ha visto il primo candidato con caselle lattiginose e il risultato finale1366/390: nessun titolo/pannello duplicato, contenuto nitido e altri widget invariati. I raw multi-caso rimangono failed quando si fermavano su un'assunzione errata del harness: riferimento corretto nel riepilogo e nelle prove separate, senza riscrittura dei negativi. Un campione hover precoce1 è distinto dal valore0,6 assestato, registrato anche a300/800ms. Nessun errore JS, comando fisico, scrittura mutativa di rete o origine esterna osservato.

Snapshot finale1793sorgenti, invariato nel conteggio: confronto con ZIP .46 trova i15delta attesi, dieci della consegna001 più questi cinque; nessuna differenza imprevista. `root-source-scope-audit.json`, SHA finale `0b2ce2a9f7018a88ceea190f92550e8efe00dbad7562ac9bda9b72d2b04d37bb`. Primo probe con confronto per suffissi ambigui interrotto e corretto usando il prefisso esatto del ZIP; errore di harness conservato. Cinque hash/whitespace ricontrollati, zero nuovi errori (`root-final-source-check.json`).

ACA/HA/D1 stessi container/immagini/avvii, health .46 e anteprima HTTP200 (`bank-preview-preservation.json`); nessuna operazione sui dati o browser umani. Non è un confronto dei dati modificabili dall'utente durante la sessione. Browser QA posseduti chiusi; fixture4184/4185 conservata. Nessuna pubblicazione, nuovo installer, dipendenza, commit o collaudo fisico Safari/iPhone/Android/M11/GPU. Detector e viewport simulati non certificano accessibilità o prestazioni universali.

## Chiusura e punto di ripresa

Incarico completato. Ricaricare [l'anteprima con dati simulati](http://127.0.0.1:4185/?screen=app#/mockup) e riprovare lo spostamento di un widget. Il materiale normale resta a16px, il solo spostamento usa2px; add/resize e schermate del widget conservano i loro percorsi. Banco corrente .46 invariato, aggiornamento separato.

Nessun lavoro necessario residuo per questa consegna. ISSUE-134 e l'osservazione/proposta ISSUE-148 sono distinte, non autorizzazioni a cambiare il comportamento storico. Stato, indici, design/brief, verifiche e diario aggiornati.

**Chiusura documentale 2026-11-05:** checker511nuovi collegamenti, zero interrotti; materiali nativi conservati per byte/hash. Diff documentale senza errori ed evidenze private escluse da Git. Cinque hash correnti e dieci precedenti confermati. Il primo check whitespace diretto trovava falsi positivi CRLF perché il sorgente è `-text` e la copia in backup `text=auto`: confronto corretto su due copie testuali normalizzate soltanto in scratch, zero errori; nessun byte dell'app normalizzato o testo italiano modificato. Diagnostica preservata, risultato in `root-final-source-check.json`.
