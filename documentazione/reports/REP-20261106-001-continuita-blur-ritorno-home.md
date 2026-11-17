# REP-20261106-001 — Continuità del vetro al ritorno alla Home

| Campo | Valore |
|---|---|
| Stato | Completato localmente e verificato; banco distinto |
| Data | 2026-11-06, Europe/Rome |
| Autore | Codex; nome esatto del modello non disponibile |
| Base Git | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`,578voci preesistenti modificate/non tracciate |
| Richiesta | L'utente segnala un blur diverso durante l'uscita dai dettagli widget, che cambia improvvisamente al valore normale della Home; allega due fotogrammi. Chiede di evitare lo scatto. |

## Obiettivo e perimetro

Riprodurre la differenza realmente dipinta e correggere il confine transizione/riposo affinché il materiale della Home non cambi improvvisamente durante il ritorno dalla Console. Preservare fade-up, dimensioni e vetro normali, contenuti, comandi, focus, Back/Escape, riconnessione e primo caricamento corretti in [REP006](REP-20261105-006-apertura-widget-finestra-apple.md). Direzione [ADR-0046](../decisions/ADR-0046-apertura-widget-come-finestra.md), [brief](../design/componenti/widget-schermata.md).

Nessun nuovo tema, comando, API, dipendenza, modifica di account/profili o aggiornamento del banco. Il colore o la sfocatura normali non vanno cambiati soltanto per nascondere il difetto. L'analisi può usare esperimenti DOM/CSS isolati, ma la correzione va limitata alla causa verificata. Le numerose modifiche preesistenti sono preservate con checkpoint e diff circoscritto.

## Criteri di completamento

- Prima riproduzione con fotogrammi e stessa regione del materiale prima/durante/dopo; il solo valore computed del filtro non prova che il browser lo dipinga allo stesso modo.
- Nessun salto del materiale al termine della chiusura; foto e vetro normali conservati.
- Controlli, chiusura, ritorno del focus e preferenze ridotte/opache conservati, senza input nascosto azionabile.
- Regressione pertinente, build/strict e QA desktop/mobile sul build finale, senza dichiarare prove hardware non eseguite.
- Fonte/diff e documenti aggiornati, anteprima4185 distinta dal banco0.9.46.

## Avanzamento e verifiche

Analisi CSS e riproduzione browser separate; evidenze private in `backup/rep051/`. Nessuna causa o correzione dichiarata prima della verifica. Guide surgical-coding e review-animations già applicate nella sessione; nessun nuovo sistema di animazione.

Checkpoint1793sorgenti/SHA `b9a7066740fc44e19399cb817bde23b530d5ded5731825a58fb3577864831b04`, identico alla chiusura REP006. La build servita resta quella finale precedente (`dist/index.html` SHA4d962abd…); le due impronte misurano oggetti diversi.

### Diagnosi del codice, da confrontare con il paint

La Home sfuma tramite opacity dell'intero `.aca-shell`; il filtro delle card è nel discendente `.aca-m__face::before`. La foto è invece nel `body::before`, esterno alla shell trasparente. Quindi il filtro può ricevere un'immagine diversa quando l'antenato passa da opacity inferiore a1 a1, pur mantenendo blur16px come valore CSS. Questo è un rilievo del codice, non ancora una misura del risultato dipinto.

Fonte primaria consultata il2026-11-06: [CSSWG Filter Effects2, Backdrop Root](https://drafts.csswg.org/filter-effects-2/#BackdropRoot), Editor's Draft del2ottobre2026, lavoro in corso senza consenso definitivo. Il draft include opacity<1 e will-change:opacity tra i confini del backdrop, mentre il solo transform non lo crea. La prova Chromium e i fotogrammi devono confermare l'applicazione concreta nel progetto; non si attribuisce il difetto genericamente a transform o a una variazione numerica del blur.

| Prima | Candidato da provare | Perché |
|---|---|---|
| Foto soltanto fuori dal livello che sfuma | Stessa foto e velo, allineati al viewport, anche nello sfondo della shell Home | Il filtro ritrova la stessa immagine all'interno del confine temporaneo di opacity. |
| Possibile espediente will-change:opacity sempre attivo | Non applicarlo da solo | Stabilizzerebbe il confine escludendo comunque la foto, modificando il materiale normale. |

Il candidato richiede confronto visivo A/B e verifica del normale aspetto fermo, delle preferenze opache e dell'allineamento della foto; nessun cambio di durata o della coreografia è assegnato.

### Riproduzione e prima verifica discriminante

QA baseline1366/1920 acquisita; root ha visto a piena risoluzione `baseline-1366-close-003.png` e `baseline-1366-rest.png`: la trama del paesaggio nelle card cambia nettamente, mentre testi e geometria restano uguali. Prova statica1366 con opacity0,999 contro1: differenza media assoluta nei due campioni13,56/16,70, con blur CSS16px in entrambi. Questo isola il confine d'opacità dal semplice avanzamento temporale.

Controllo separato idle: screencast e screenshot mantengono il blur in assenza di transizione; la cattura non disabilita il filtro in generale. Il flusso CDP può tuttavia trattenere fotogrammi, quindi il tempo preciso della rasterizzazione finale non va dedotto soltanto dall'ultimo frame della registrazione.

La prima iniezione DOM del candidato con URL relativo ha introdotto un fondo più scuro: non è accettata come prova positiva e si verifica la risoluzione della bitmap rispetto al CSS originale. L'A/B deve usare la stessa immagine effettiva della Home prima di decidere la correzione.

### A/B valido e modifica applicata

`computed-photo-material-ab.json` usa l'immagine computed del `body::before`, con URL assoluto, decodifica1672×941 eHTTP200. Nel campione1366 il salto0,999→1 passa da13,56/16,70 a1,00/1,00 nei due ROI; il residuo è compatibile con l'arrotondamento dell'alpha. Il riposo candidato/originale differisce solo0,039/0,042 nei ROI e0,140 nella regione esterna. Conferme statiche390 e resize1920 distinte dall'animazione finale. L'iniezione precedente aveva applicato il velo senza la bitmap corretta per la diversa base dell'URL inline: prova invalida, non difetto della correzione nello stesso `white.css`.

Unico sorgente modificato: `design/themes/glass-white/white.css`,9righe aggiunte. La foto allineata al viewport viene mantenuta dentro la shell **soltanto nelle fasi open/returning** già esistenti. A closed la Home conserva esattamente il fondo precedente; non si aggiunge una foto all'animazione iniziale con scala né al trascinamento a riposo. Specificità completa del selettore anche nel reset opaco/contrasto/forced-colors. Nessuna modifica JS, timer, curva, valore del blur, asset fotografico o test che replichi soltanto le dichiarazioni CSS.

`MotionChoreographyBlock2`21/21, UI/copia asset9/9 e strict PASS; build frontend finale PASS, con solo warning HLS preesistente. Il test di regressione significativo è la verifica del materiale realmente dipinto, affiancata dai controlli esistenti. SHA del CSS `39a77ade18e97b2a7eee60d2b4d788ffc9ea93b9ff459448ea6f8df9bf7febb8`; manifest prima/dopo e diff in `backup/rep051/`. QA temporale finale riportata di seguito sulla build effettiva.

### Verifica finale e controllo del diff

QA finale5/5: normale1366, normale390, resize1366→1920,390con movimento ridotto e390con contrasto maggiore/modalità opaca. `return-material-pixel-analysis.json` decodifica i PNG originali e confronta due regioni della fotografia prive di testi/controlli. Baseline ultimo ritorno→riposo:MAE19,10/16,40; finale normale massimo1,06, ridotto1,91 e opaco0. Primo closed, quando lo sfondo temporaneo è già rimosso, contro riposo:MAE0 in tutti i casi. Anche il riposo normale prima/dopo l'apertura è identico nei confronti misurati. Non si dichiara identità pixel a qualsiasi opacità, perché la dissolvenza resta voluta.

Le immagini effettive confermano la continuità; root ha visto anche `final-normal-1366-close-008.png` e `final-normal-1366-rest.png` a piena risoluzione. Campioni iniziali closed sempre senza sfondo nella shell: nessuna foto aggiunta all'intro. Focus restituito al widget, manifest stabili, nessun errore JS, richiesta mutativa o comando HA. Il caso opaco animato esercita `prefers-contrast: more`. Smoke computed3/3 separato per contrastmore, forced-colors e reduced-transparency, tutti matchMedia=true: nelle fasi closed/open/returning/riposo immagine shell assente, foto body nascosta e filtro pseudo-card disabilitato (`fallback-media-smoke.json`). Non sono tre ulteriori registrazioni complete né un collaudo fisico delle piattaforme.

Review indipendente e `cross-review-scope-audit.json`:1793file prima/dopo, solo `white.css` modificato, altri1792immutati, nessuna aggiunta/rimozione. SHA finale complessivo `d14bde1e803e6366e95798ba477a8343abbf5d21f0e916191ee6f6145bfc5499`. Whitespace dei soli delta su copie LF senza riscrivere i sorgenti:9aggiunte/0rimozioni, nessun nuovo trailing space. Precedenti modifiche conservate. Nessuna nuova decisione di prodotto o architettura; correzione esecutiva della continuità richiesta.

Suite generale non rieseguita; debito ISSUE-134 non modificato né dichiarato risolto. Browser Chromium isolato, formati emulati e fixture sintetica: nessuna misura GPU o prova fisica Safari/iPhone/Android/M11. Banco osservato healthy0.9.46, senza aggiornamenti, modifiche ai dati o accessi a browser/storage umani.

Chiusura documentale:577collegamenti controllati, nessuno interrotto; artefatti nativi e whitespace dei documenti pertinenti PASS, con soli avvisi CRLF/LF. Anteprima HTTP200, hash CSS confermato e HEAD identico alla base. Evidenza `docs-check-final.log` e controlli di chiusura della sessione.

## Chiusura e punto di ripresa

Incarico completato nella fonte condivisa, nella build e nell'[anteprima4185](http://127.0.0.1:4185/?screen=app#/mockup), da ricaricare. Lo scatto è corretto mantenendo il materiale normale e la coreografia precedente. Nessun ulteriore lavoro autorizzato resta aperto; installazione sul banco e hardware rimangono operazioni distinte. Nessun commit o pubblicazione effettuati.
