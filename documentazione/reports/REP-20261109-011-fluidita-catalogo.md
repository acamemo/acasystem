# Fluidità del catalogo e costo del rendering

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261109-011 |
| Stato | Completato e installato sul banco .56/r99 |
| Data | 2026-11-09, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «l’animazione sembra andare bene, però è uno scroll snap, non mi piace ed è pesante così, lagga sul mio pc con una rtx5050» |
| Autorizzazione | Correggere fluidità e costo del catalogo in lavorazione; nessun cambio stack/dipendenze, funzione estranea o pubblicazione. Consegna sullo stesso banco PC già autorizzato con backup e conservazione dati. |

## Obiettivo e perimetro

Riprendere [REP010](REP-20261109-010-trascinamento-verticale-catalogo.md), fonte1816/SHA18a2ffb1539d408268c11265d079aadd58447444e376f13cff06a145b215c370, banco .55/r99. Il riscontro umano riguarda la sensazione di aggancio e il lag: i precedenti controlli geometrici non dimostrano prestazioni sul PC dell’utente. Distinguere l’asse interessato e rilevare costi reali prima di attribuire il problema alla GPU o cambiare il comportamento. Il primo chiarimento «Entrambi» è stato successivamente corretto dall’utente: «io parlavo di scroll verticale, lì si presenta lo scroll snap ... l’effetto doveva essere una tendina che compare dal basso allo scroll verso l’alto». Questa precisazione limita il codice al verticale; lo sfoglio X resta invariato, comprese le card intere. Il gesto richiama un ingresso/ritorno autonomo con transform e fade, eliminando il progresso parziale e l’aggancio finale dopo la pausa WheelEvent. Nessuna modifica X era stata applicata. Riferimenti: [REQ-32/AC-32](../funzionalita/product.md), [brief catalogo](../design/componenti/catalogo-widget.md), [design](../design/design.md), [ADR-0048](../decisions/ADR-0048-catalogo-widget-tendina.md).

Preservare paesaggio a scala fissa, card intere, precedenza controlli/moduli, tastiera, focus/history, permessi e pagina corrente. Ridurre lavoro ridondante ed effetti costosi nel percorso del gesto senza una ristrutturazione dei singoli widget. Le624voci Git preesistenti e i report chiusi rimangono conservati; checkpoint byte e prove in `backup/rep068/`.

## Criteri di completamento

- Identificare il gesto e riprodurre la sensazione segnalata; non presentare come misurata una configurazione hardware non osservata.
- Confrontare rendering e reattività prima/dopo con stesso viewport, input e ambiente; distinguere tempo CPU, paint/layout e limiti del browser di prova.
- Il richiamo verticale attiva una sola animazione di ingresso dal basso; niente posizione parziale legata ai delta né attesa240ms prima del completamento. Richiamo inverso richiude la tendina, senza attivazioni residue.
- Foto stabile, anteprime complete, nessun comando o aggiunta residua e nessuna regressione di focus/history/controlli nei casi pertinenti.
- Strict/test mirati, build e audit della consegna locale; banco aggiornato con backup verificato, account/profili e HA/D1 conservati. Riscontro hardware umano distinto.

## Avanzamento e modifiche

Baseline osservata: il pannello Y seguiva ogni delta e completava la posizione dopo rilascio/pausa WheelEvent. Il chiarimento umano limita la correzione a Y: il gesto ora richiama una sola transizione autonoma dal basso e il ritorno inverso. Il pager X e i suoi materiali sono rimasti byte-identici; nessuna causa del lag attribuita alla GPU dell’utente.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Baseline e checkpoint | Git, copie byte e fonte .55/1816 | Superato | 8delta attesi; X e scena condivisa conservati |
| Profili prestazioni | Replay/trace con stesso protocollo e renderer SwiftShader | Osservati; attesa funzionale rimossa | Nessun miglioramento generale raster/FPS dimostrato; candidato intermedio e hardware umano distinti |
| Regressioni e banco | 87test/6file,3UI, strict/build, pacchetto esatto, audit e dati | Superato | Vista banco anonima e input sintetici; nessuna pubblicazione |

## Controllo del diff e decisioni

Scelte esecutive limitate alle cause osservate. L’eventuale modifica di una precedente scelta umana verrà associata al nuovo chiarimento; nessuna approvazione ricavata dal solo backlog.

## Chiusura e punto di ripresa

Completato: ACA0.9.56/r99 sul banco, fonte1816/SHAcfb5422dde4edd22ad718856b69e7e83ba37ba773c1f8a4266f010f06d3c2eb7,8delta attesi,0file aggiunti/rimossi/estranei. L’ultimo chiarimento umano riguarda soltanto Y: il gesto richiama l’entrata dal basso e il ritorno autonomi con transform e fade, senza posizione parziale da agganciare al rilascio o dopo240ms. La long press Home è cancellata all’intento verticale; comandi, campi, scroll interni, blocchi, focus/history, pagina corrente e dati restano conservati. Pager/CSS/test X e scena condivisa sono byte-identici alla .55.

**Verifiche:**87/87test mirati in6file,3UI, strict frontend/UI e build derivata PASS. Preview realmente pronta prima del richiamo, apertura unica prima del rilascio, hold/cancel/multipointer, wheel normalizzato e inverso, moduli e tastiera verificati nei casi registrati. Corretto prima del sigillo anche l’azzeramento della fase visiva con candidato breve durante la fine dell’ingresso. Pacchetto finale, fotografia a scala fissa e vista anonima banco PASS; i risultati del candidato intermedio rimangono distinti.

**Prestazioni e limiti:** nel protocollo controllato con Chromium/SwiftShader, intervalli EventDispatch→prima transitionrun del gruppo CSS: 268/283ms prima e 64/54ms nel candidato intermedio. È una singola osservazione per input/versione, non latenza fisica o inizio del paint. Eliminata l’attesa funzionale esplicita; nessun miglioramento generale di raster o frame rate è dimostrato, e i costi osservati rimangono variabili. La RTX5050 citata dall’utente non è il renderer misurato; GPU/driver del suo Edge e hardware tablet/trackpad richiedono riscontro separato.

**Artefatti e banco:**ZIP3375515byte/SHAffc001c16de3bbeabd306bc4fc80987ef495a9da6c080138887d8b2be111628d, wrapper `sha256:e050fe060dc28af3e8bb9ae9776895eeb83b1b41c149dce86ec5e981d1f48b6c`. Audit provenienza/checksum/runtime congelato e Compose20file PASS, nessuna installazione runtime. Backup freddo206196byte/SHAd7c22afd1f8df188fa51fd7c5ac121190f273c9d68fa7276c774fc3c006d39dd, estratto e SQLite integro; audit operativo 6/6, confronto cold→live con 27 tabelle esatte e 0 seen_at monotoni, nessuna differenza imprevista. Account/profili, identità e mount conservati; HA/D1 stessi container e avvii, solo ACA ricreato. PC3002 e LAN192.168.1.37 .56/healthy e casa ready, asset esatti verificati senza credenziali o comandi.

**Evidenze e ripresa:** `backup/rep068/combined-final-tests.json`, `y-performance-comparison.json`, `qa-functional-summary.json`, `packaged56-smoke.json`, `source-delta.json`, `artifact-audit-status.json` e verifiche di conservazione. Browser/server QA privati chiusi, anteprima4185 conservata secondo la verifica finale. Nessuna pubblicazione o nuova funzione implicita; suite generale e debito non dichiarati risolti. Riprendere dal riscontro dell’utente sul richiamo verticale e sugli eventuali rallentamenti ancora presenti in Edge; il confronto software non certifica il comportamento della GPU del suo browser.
