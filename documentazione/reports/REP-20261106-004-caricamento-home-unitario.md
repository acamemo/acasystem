# REP-20261106-004 — Caricamento unitario e ingresso della Home

| Campo | Valore |
|---|---|
| Stato | Completato e verificato localmente; banco e hardware distinti |
| Data | 2026-11-06, Europe/Rome |
| Autore | Codex; nome esatto del modello non disponibile |
| Base Git | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`,581voci preesistenti modificate/non tracciate |
| Richiesta e autorizzazione | «ok partiamo col piano», dopo la consegna del [piano operativo](../riprogettazione/caricamento-home-piano.md). Autorizza l'attuazione locale delle quattro consegne; nessuna pubblicazione o installazione del banco. |

## Obiettivo e perimetro

Attuare il piano: baseline del flusso, controllo comune di presentazione riusando gli stati proprietari, preparazione misurabile della prima vista, loader circolare e ingresso coerente, recupero mirato e collaudo/build locali. Preservare identità/uso esclusivo/bozze/comandi, layout e proiezione, vetro confermato e lavoro preesistente.

Valori del piano ora assegnato: loader dopo150ms senza durata minima; Home24px/280ms senza scala, ridotto120ms; uscita loader96ms concorrente; feedback attesa10s e risorse locali3s con fallback stabile. Esito del catalogo distinto da mappe vuote; nessun nuovo endpoint, migrazione, dipendenza, cache ottimistica, rifacimento dei widget o ottimizzazione backend impliciti.

Fonti: [analisi](REP-20261106-002-analisi-caricamento-home-e-widget.md), [redazione del piano](REP-20261106-003-piano-caricamento-home.md), [ADR-0047](../decisions/ADR-0047-caricamento-home-unitario.md), [continuità del vetro](REP-20261106-001-continuita-blur-ritorno-home.md). Le regole di stato, retry, identità e casi limite rimangono nel piano, senza duplicarne la specifica.

## Criteri di completamento

- Prima pagina essenziale pronta prima della comparsa, loader per attese reali e nessuna doppia intro.
- Preparazione misurabile, errori/attesa prolungata/profilo occupato raggiungibili; risposte e segnali obsoleti rifiutati dai rispettivi proprietari, dati validi conservati nei retry.
- Direct route Sistema/Casa, resize/rotazione, riconnessione, discovery, focus, preferenze e fallback conservati.
- Nessuna nuova scrittura di layout da pura presentazione o comando fisico durante il preload; account e dati reali intatti.
- Test pertinenti, strict/build, verifiche condivise e QA su fotogrammi reali della build finale, con misure comparabili e limiti espliciti.
- Diff confrontato con checkpoint, documenti aggiornati e anteprima locale consegnata; banco0.9.46 e pubblica0.9.34 distinti.

## Avanzamento e verifiche

Checkpoint, baseline e risultati in `backup/rep054/`. QA ha copiato le risorse prima delle modifiche per misurare contro un riferimento immutabile. La fixture sintetica non misura il bootstrap di un account reale. Implementazione JS/TS, materiale/primitive e QA hanno responsabilità separate, con interfacce concordate prima degli edit.

### Checkpoint e osservazioni baseline

Checkpoint1793file/SHA `d14bde1e803e6366e95798ba477a8343abbf5d21f0e916191ee6f6145bfc5499`, identico alla fonte della consegna precedente. Copia immutabile di dist/design/UI:233file,5.838.253byte e0differenze di hash, prima di liberare i sorgenti CSS. Server privato GET/HEAD4189, nessun proxy al banco; stessa origine e politica cache per il confronto finale.

`baseline-handoff.md` e `baseline-home-loading-summary.json`: quattro osservazioni singole, non medie o benchmark hardware. Primo UI completo visibile DOM:1366freddo487,7ms, reloadcaldo654,4ms,390freddo475,5ms,390reloadsenza cache con200ms per risposta HTTP2323,8ms. Primi JPEG campionati con card552,3/695,2/507,1/2368,7ms, distinti dai campioni DOM. Byte HTTP osservati2.254.619 nei cold/delayed e279nel caldo,57richieste HTTP per visita; i3blob locali aggiuntivi non sono chiamate alla centrale.

Una subscription snapshot e un `get_services` mock per visita; la demo non attraversa bootstrap/profilo/concessione autenticati. Tali tempi reali restano non misurati, non zero. Il confronto finale separerà primo mount nascosto, primo paint visibile e conclusione dell'ingresso/interattività. Nessun comando HA, credenziale o dato reale utilizzato.

### Presentazione e integrazione

Primitiva Spinner e CSS in sei file: indicatore senza annunci duplicati, rotazione esclusa in ridotto, pannello recupero interattivo; superficie esterna con sola opacità e foto ferma, contenuto interno con traslazione24px. Flag sticky del root gestito per evitare il riavvio della vecchia intro al ritorno da Sistema. Reset font/foto e preferenze nel tema condiviso. Presentazione/coreografia29/29 e strict PASS; hash conservati nell'integrazione finale.

JS/TS implementati: ciclo di presentazione separato dai proprietari dei dati, segnali accesso/profilo/Home, catalogo con esito/retry e preparazione della griglia/risorse. Review e test hanno corretto conservazione DOM del loader durante i96ms, focus di Riprova, fallback ridotto, disponibilità delle risorse riferita al ciclo corretto e glyph dei soli testi usati. I96ms finali sono inert per non riattivare il recupero già concluso.

Il retry di preparazione ora conferma la concessione presso il proprietario esistente, coalesca i tentativi pendenti e rifiuta il risultato se la concessione viene revocata durante la lettura. Una lettura sospesa non sostituisce una revisione del profilo già accettata più recente. Scope completo casa/utente/client/profilo e generazioni visuali separati; nessun bypass dei permessi o riassegnazione dei writer.

Verifiche della fonte congelata: owner/controller64/64, gate diretti Sistema/Casa/Home5/5, MockupRoute13/13, risorse12/12 e presentazione/coreografia29/29 PASS. Regressione finale228/228: LauncherScreen183, GridGeometry4, AdaptiveCategory23, AdaptivePixelFit4, provider HA10 e avvisi4. Controller finale12/12 dopo i due ulteriori casi sul ripristino focus/no-steal e sul fallback ridotto; strict finale accettato PASS. Sono gruppi separati, non sommare run intermedi sovrapposti. Artefatti `startup-owner-final-tests.json`, `startup-gates-tests.json`, `startup-mockup-final-tests.json`, `assets-tests-final.json`, `presentation-tests.json`, `startup-regression-final-tests.json`, `startup-controller-final-tests.json` e `js-typecheck-accepted-final.log`.

`frontend-build-final.log`: build frontend e strict PASS; warning chunk HLS già presente. UI/asset9/9, strict UI e colori0violazioni PASS. Tipografia conserva la sola violazione preesistente `pages/connect/connect.css:103` (font-weight600), distinta dal delta e da ISSUE-134. Non eseguita la suite generale dell'intero prodotto.

Negativi intermedi conservati: il test delle risorse ha riprodotto l'inclusione di un glyph di pagina non visibile, poi corretto senza indebolire l'asserzione. I fixture di MockupRoute usavano box jsdom nulli e ora simulano misure positive, conservando le aspettative; nessuna deroga di produzione per il test. Gli errori WIP di scope/lease e i risultati iniziali rimangono in `backup/rep054/`, distinti dalle prove finali.

### Integrità e review

`source-scope-cross-review.json`:1793→1801file, SHA finale `ea75056158d2702cd7665a8b70e523c5bad029be4f68269c4c74295271e82b73`. Esattamente29delta attesi:21modificati e8nuovi,20file di produzione e9test/fixture, tutti coerenti con i manifest; zero file estranei o rimossi. Backend, dipendenze, font, immagini e altre fonti preesistenti immutati. Ultima aggiunta di soli due casi di test dopo la build non cambia i20hash di produzione.

Review indipendente finale dei fix P1/R2/R3/P2 senza blocker residui (`js-cross-review-final.json`). Whitespace del solo delta PASS22/22più7/7, usando copie di evidenza normalizzate LF; gli stili di newline originali dei sorgenti non sono stati uniformati. Nessun commit o alterazione della storia condivisa.

### Confronto delle quattro osservazioni

`final-site-manifest.json`:235file/5.859.469byte, copia separata dalla baseline; build finale `index-SENT_HLO.js`. `final-home-loading.json` e relativo summary usano lo stesso server4189, cache e sonda della baseline. Tempi in millisecondi dalla navigazione; le colonne DOM non equivalgono a un timestamp di paint. La soglia del loader parte dalla preparazione della Home, non anticipa l'esecuzione del bundle JavaScript.

| Condizione | Prima UI completa visibile DOM, baseline | Prima misura completa DOM, finale | Prima UI completa visibile DOM, finale | Fase pronta/interattiva, finale |
|---|---:|---:|---:|---:|
|1366 px, cache fredda|487,7|471,3|551,4|907,6|
|1366 px, reload con cache calda|654,4|319,6|457,0|722,9|
|390 px, cache fredda|475,5|500,8|580,7|871,0|
|390 px, reload senza cache,200ms per risposta HTTP|2323,8|2074,2|2195,3|2481,8|

Nessuna riduzione di rete dimostrata:57→58eventi HTTP per visita,2.254.619→2.272.345byte nei cold/delayed,279byte nel reloadcaldo in entrambi. La richiesta aggiuntiva riguarda un asset della build; nel finale57/57risorse del reloadcaldo hanno transferSize0. Una subscription snapshot e un `get_services` mock per visita, senza comandi. Le letture sintetiche di pairing/discovery sono contate separatamente, non sono nuove API del protocollo di caricamento.

Sono quattro osservazioni singole di una fixture e del browser strumentato, non una media o una prova di accelerazione; il costo dei280ms richiesti rimane visibile. Il risultato atteso è la comparsa unitaria e il recupero esplicito, non un risparmio di payload o un tempo massimo garantito. I fotogrammi e i controlli funzionali finali sono riportati separatamente.

### QA funzionale della build finale

`startup-functional-qa.json`:5/5PASS, con catalogo iniziale fallito e Riprova, catalogo oltre10s con risultato vecchio ignorato dopo retry, resize durante preparazione e ingresso, movimento ridotto e contrasto maggiore. Il retry ripete soltanto il catalogo (2tentativi,1snapshot); focus del recupero trasferito alla Home, controlli inert fino alla fine e cinque widget finali ai rispettivi ingombri. In ridotto nessuna animazione continua dello Spinner. Zero errori JavaScript, comandi HA e traffico esterno/mutativo nel campione isolato.

Root ha esaminato i JPEG originali1366cold007/012/013 e390cold006/023: prima Home già composta e fine fade→pronto visivamente uniforme. I tempi di cattura desktop590,9/812,5/854,9ms e mobile584,5/879,4ms sono distinti dai tempi DOM della tabella e non rappresentano ogni frame del monitor.

Review offline indipendente `home-entry-offline-frame-review.json`: mobile022→023→024 (863,4→879,4→896,8ms, fase ready DOM871ms), MAE RGB8 e massimo0 su due ROI interni liberi e un riferimento esterno. Analisi dei JPEG originali, nessuna ricodifica PNG dichiarata lossless e limiti di compressione espliciti. Desktop cold015/016 esclusi dal confronto del materiale perché inizia il discovery, correttamente dopo la Home pronta; il suo oscuramento non è un salto del blur.

`desktop-entry-pixel-review.json`: due ROI nel vetro warm007→010 hanno MAE RGB8 di1,13/1,16, riferimento esterno1,00; piccoli residui analoghi nel confronto cold012→013. Nessuno scatto macroscopico osservato, con gli stessi limiti del JPEG; non sono misure lossless, FPS o GPU. Il confronto numerico è affiancato alla visione degli originali, non sostituito dal solo valore computed del blur.

`startup-asset-fallback-smoke.json`: ulteriore smoke browser PASS con richieste locali di font e foto interrotte e poi ripristinate. La Home raggiunge ready con system-ui e foto disabilitata; quando le risorse tornano realmente disponibili, fallback e cinque box rimangono identici, senza swap tardivo. PNG del pronto e dopo il ripristino conservati. Il primo tentativo della sonda aveva bloccato soltanto i font perché il matcher della foto non includeva il nome hashato: artefatto negativo conservato e matcher corretto, nessuna modifica applicativa.

Sigillo QA `qa-final-seal.json`:235/235risorse congelate coerenti, zero differenze rispetto a compilato e fonti condivise correnti, baseline conservata; cinque casi funzionali e fallback PASS. Le prove hanno scritto soltanto evidenze in backup, senza sorgenti, account, banco o comandi HA.

### Limiti delle prove

La demo bypassa l'autenticazione reale, il bootstrap del client e l'acquisizione reale del profilo/concessione: quei tempi non sono cronometrati e non vanno letti come0ms. I test dei gate/coordinatore verificano invece identità, promesse controllate, revoca, monotonicità e cancellazione; non certificano latenza LAN o flussi reali PC–iPhone. Nessun login/sessione, profilo, bozza o comando del banco umano modificato.

Prove umane PC/iPhone, Safari/iOS, Android e Lenovo M11/GPU non eseguite in questo incarico. Chromium con viewport e touch emulati resta distinto dall'hardware. Suite generale e debito ISSUE-134 non chiusi. Nessuna installazione o prova di regressione sull'immagine del banco0.9.46, nessuna pubblicazione0.9.34.

## Chiusura e punto di ripresa

Quattro consegne attuate e verificate in locale: checkpoint/confronto, controllo comune, preparazione/loader/ingresso e collaudi/build. Nessun blocker software residuo nei controlli del perimetro; i limiti sopra restano distinti dalla verifica locale. Requisito REQ-31/AC-31, ADR, brief, architettura, stato, mappa e diario aggiornati. Originali, account, profili e bozze conservati; nessun commit, deploy, aggiornamento banco o pubblicazione.

Controlli documentali finali:638collegamenti validi, integrità byte/SHA degli artefatti originali PASS e whitespace dei documenti interessati PASS (soli avvisi Git CRLF/LF). Ricattura root della fonte1801file/SHAea750561 coincide con il sigillo indipendente; HTTP200 dell'anteprima e bundle finale nuovamente verificati. Evidenze `docs-links-final.log`, `docs-whitespace-final.log` e `source-final-root.json`.

Anteprima della build: [Home con dati dimostrativi](http://127.0.0.1:4185/?screen=app#/mockup), HTTP200 e riferimento al bundle finale verificati anche da root. Ricaricare per confrontare lo stesso ingresso, poi aprire e chiudere un widget; viewport telefono disponibile tramite gli strumenti del browser. Le operazioni sono simulate. La build locale è in `progetto/acasystem/frontend/dist/`; il banco3002 resta0.9.46 e la pubblica0.9.34.

Nessun altro incarico software implicito. Installazione sul banco, prove umane PC/iPhone e Android/M11, ottimizzazioni di rete/cache e rifacimento dei singoli widget richiedono i rispettivi incarichi, senza ripetere registrazione o migrare dati per questa sola preparazione visuale.
