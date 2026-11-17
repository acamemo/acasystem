# REP-20261105-001 — Transizione condivisa tra widget e schermata

| Campo | Valore |
|---|---|
| Stato | Completato, build e anteprima locali verificate |
| Data | 2026-11-05, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta | L'utente apprezza l'espansione e la chiusura di Tavano; chiede dissolvenze coordinate tra contenuti esterni e contenuto del widget e un'animazione generica per aprire la schermata di ogni widget. |
| Autorizzazione | Implementare il comportamento condiviso e verificarlo. Nessuna nuova schermata funzionale, modifica ai comandi HA o alle associazioni, pubblicazione o installazione assegnata da questa richiesta. |

## Obiettivo e perimetro

Conservare continuità geometrica e materiali della transizione esistente. In apertura i contenuti della Home esterni al widget scompaiono gradualmente, mentre quelli della schermata estesa entrano in un secondo momento coordinato; in chiusura il percorso è inverso. Applicare il comportamento nel livello condiviso, evitando implementazioni Tavano specifiche. I widget senza schermata estesa non ricevono una nuova funzione inventata e i comandi diretti continuano ad agire come prima.

Working tree iniziale: 554 voci Git già modificate/non tracciate. Preservare il lavoro precedente e salvare copie/evidenze in `backup/rep045/`. Riferimenti: [design](../design/design.md), [ADR-0004](../decisions/ADR-0004-principi-frontend.md), [ADR-0016](../decisions/ADR-0016-schermo-intero-interazioni.md). La UI è Operate; continuità spaziale e passaggio di contenuto, non animazione decorativa.

## Criteri di completamento

- Apertura e chiusura con opacità coordinate, senza doppio contenuto sovrapposto o frame vuoti permanenti.
- Transizione comune ai widget con dettagli/Console, mantenendo gli ingressi e le eccezioni funzionali esistenti.
- Focus, Escape, scroll, clic rapidi, richieste di chiusura e teardown coerenti; nessuna interazione involontaria con comandi in dissolvenza.
- Variante per movimento ridotto e fallback senza animazioni native/WAAPI secondo il meccanismo usato.
- Verifiche mirate e osservazione dei fotogrammi su desktop e telefono simulato. Prove hardware e prestazioni M11 distinte.
- Documentare implementazione, verifiche e limiti; consegnare una prova locale. Non aggiornare automaticamente il banco .46 o pubblicare.

## Piano di movimento

Momento focale: passaggio dalla tessera alla sua schermata e ritorno alla stessa tessera. Conservare la geometria esistente; usare trasformazione/opacità e token già presenti. Dissolvenza esterna anticipata, ingresso del contenuto esteso ritardato e percorso inverso in chiusura. Nessun nuovo blur animato, effetto sui dati periodici o ritardo imposto ai comandi. Valori finali e interruzioni saranno registrati dopo l'ispezione del meccanismo corrente.

## Avanzamento e verifiche

Ispezione completata: 29 definizioni nel registro, nove con Console dedicata e 16 con soli Details; quattro senza dettagli (copertine ora/calendario/meteo e spazio vuoto). I 25 percorsi esistenti sono serviti dalla shell condivisa. Conservate le eccezioni: stanza verso pagina configurata, Trova dispositivi verso flusso dedicato, associazione di un widget non configurato e comandi fisici diretti. Nessuna nuova schermata per le quattro definizioni prive di dettagli. [ADR-0045](../decisions/ADR-0045-transizione-widget-schermata.md) registra la direzione umana e distingue i valori temporali esecutivi.

Baseline browser su fixture isolata: durante apertura Tavano la Home rimane a opacità 1, header subito visibile, body a zero oltre 315ms e quasi a 1 attorno a 450ms. Evidenza `backup/rep045/widget-baseline-qa.json` e catture; nessuna scrittura di rete, errore o origine esterna osservata. Questo è il comportamento prima della correzione, non il risultato finale.

Implementazione nel livello Console condiviso, adattatore WidgetConsole e host LauncherScreen. La Home sfuma per 160ms solo quando la shell è effettivamente caricata; il guscio si espande in 280ms e titolo/azioni/body entrano da 120ms per 160ms. Back rimane disponibile; azioni e body restano inert fino al loro effettivo completamento. Uscita del contenuto 80ms e contrazione 200ms, con ricomparsa coordinata della Home. Il suo stato returning mantiene inattivi i controlli fino alla fine della dissolvenza e poi restituisce il focus all'origine, senza sottrarlo ad altre finestre.

DialogShell esclude i discendenti inert dai candidati di focus/Tab e lascia Escape al menu interno realmente aperto. La sola Console richiede a PanelPresence 120ms di uscita con movimento ridotto, senza modificare il default degli altri pannelli. Nel ritorno rapido la shell conserva il proprio DOM e reimposta le fasi; timer e listener vengono cancellati. Nessuna API o libreria nuova, solo trasformazioni/opacità, senza animare filtri o ombre.

I Details convertiti conservano campi, intestazione adattiva ed esclusioni per serratura/allarme/Zigbee. Una colonna scorrevole larga al massimo 40rem e una griglia adattiva dei controlli evitano la sovrapposizione emersa nella prima prova luce. Il successivo caso serratura 320px ha richiesto una traccia `minmax(0, 1fr)` e `min-width: 0` sui figli: si corregge il vincolo comune, senza mascherare l'overflow, ridurre i comandi o cambiare funzioni della serratura.

## Verifiche ed evidenze

Evidenze selezionate e dati sintetici in `backup/rep045/`; nessuna credenziale o azione fisica. I gruppi seguenti si sovrappongono e non vanno sommati.

| Controllo | Esito | Evidenza e limiti |
|---|---|---|
| Baseline software | Superato, 187/187 | `transition-baseline-tests.json`, prima delle modifiche |
| Transizione, accessibilità e fallback | Superato, 196/196 | `transition-targeted-final-tests.json`: fasi/inert, focus dopo ritorno, transizioni proprie rispetto ai figli, riapertura dello stesso DOM, teardown anticipato, uscita ridotta, fallback senza API, luce e PIN allarme senza attuazione |
| Regressioni dei widget | Superato, 278/278 | `widget-regression-tests-final.json`, 13 suite; prima dell'ultima correzione Escape. Il primo 276/277 era l'aspettativa storica Sheet aggiornata al nuovo contratto, conservato in `widget-regression-before-contract-update.json` |
| Regressioni dopo Escape | Superato, 48/48 | `escape-regressions-final.json`: overlay, Tavano/pagine, dettagli media/TV/camera; nessuna modifica JS successiva |
| Strict e build frontend | Superato | Ultimo `frontend-build-lock-final.log`; condiviso `shared-typecheck-final.log`. Avviso HLS preesistente distinto |
| Confini e asset condivisi | Superato, 9/9 | `shared-contract-checks-final.log`, tre UI e sei asset |
| Colori / tipografia | Zero nuove violazioni | `theme-colors.log`: zero; `typography-final.log`: exit1 per l'unica segnalazione preesistente Connect103, non PASS generale o chiusura ISSUE-134 |
| Sorgenti e revisione indipendente | Superato nel perimetro | Snapshot .46 da ZIP verificato: 1791→1793 file, 10 delta (otto modificati, due nuovi), nessuna rimozione. Backend/contratti/runtime/dipendenze invariati; manifest e review in `widget-transition-independent-source-audit.json`, `widget-transition-final-review.md` |
| Banco | Conservato, nessun aggiornamento | ACA/HA/D1 stessi container, immagini e avvii; health .46. `bank-preservation-summary.json`. Non è un confronto dei dati modificabili dall'utente durante il lavoro |

### Correzioni emerse e trasparenza delle prove

- Prima composizione luce: header adattivo esteso e controlli sovrapposti ai dettagli. Corretta la colonna non comprimibile e limitata; prove negative conservate, catture successive verificate anche dal coordinatore.
- Primo Escape in un Popover non isolato chiudeva anche la nuova Console; riprodotto in unit test e browser Fan nativo/fallback. Corretto nel confine condiviso, senza patch per ciascun widget.
- Serratura 320px: baseline .46 realmente servita con gli stessi dati sintetici, Sheet312/scroll312; nuovo contenitore320/scroll359. La build conclusiva corretta misura320/scroll320, griglia280px. Blocca91,61×45,5px, Sblocca98,56×45,5px e Apri77,05×45,5px: tutti i comandi e le etichette sono visibili senza mascheratura. Evidenza `lock-320-built-final.json/png`.
- Ipotesi di test allarme corretta: il PIN appare dopo la scelta dell'azione. Un primo controllo del movimento ridotto confrontava l'opacità del body anziché quella effettiva del genitore. Nessuno dei due è presentato come un bug del prodotto.
- Prima prova del server baseline con asset404 e primo audit con prefisso ZIP errato conservati e corretti; non costituiscono difetti dell'app. I tempi delle catture PNG sono quelli misurati: lo screenshot desktop può terminare dopo il fotogramma richiesto. Le trace RAF restano l'evidenza temporale, non il nome del file.

### Collaudo browser

Nove aperture/chiusure normali di luce, TV e Tavano a1366/390/320 superate, trace RAF e catture. Altri sette casi per movimento ridotto, assenza di API e input/interruzioni superati in `widget-transition-remainder-qa.json`; quattro verifiche Tab durante/fine dissolvenza e quattro casi Fan per Escape nativo/fallback immediato/stabile superati. Il picker Car non è presente nella fixture: quattro prove non eseguite, non PASS impliciti; copertura del percorso comune tramite test del Popover non isolato.

Copertura generica conclusa: 114 aperture, 57 istanze sintetiche a1366/320, 23 nomi visuali, contenuti ed etichette presenti, ritorno focus e nessun overflow/errore/comando. Non sono 114 widget distinti o altrettante integrazioni reali. Serratura e luce320 ricontrollate sulla build finale: entrambe body320/scroll320, header e dettagli luce280px con gap16px. `widget-details-coverage-qa.json`, `lock-320-built-final.json`, `light-320-built-final.json` e riepilogo `widget-transition-qa-summary.json`.

Detector statico `[]` e nove scansioni render `[]`, contesti/URL/viewport conservati. Non equivalgono a una certificazione universale di contrasto/accessibilità. Sedici catture di apertura/chiusura con tempi effettivi; il coordinatore ha visto il negativo luce, le versioni corrette desktop/mobile e i fotogrammi intermedi mobili di luce/Tavano, coerenti con le trace e senza lampi opachi. Handoff finale `widget-transition-qa-handoff.md`. Il raw `widget-transition-final-qa.json` resta globalmente failed per l'aspettativa errata del harness dopo nove casi normali superati; la verifica corretta è nei file di remainder e nel riepilogo, non in un raw riscritto.

Dieci hash finali corrispondenti, audit indipendente aggiornato dopo il solo vincolo CSS serratura; root ha confrontato whitespace e hash con il pacchetto .46. Browser di QA chiusi e server temporaneo della baseline4186 arrestato, fixture4184/4185 lasciata disponibile. Nessuna scrittura di rete, origine esterna o attuazione fisica osservata nelle batterie concluse.

## Controllo del diff e limiti

Dieci file pertinenti: `Console`, `DialogShell`, `PanelPresence`, CSS Console/Home condiviso; `LauncherScreen`, `WidgetConsole`, contenuto Details comune e CSS del contenitore; due file di test. Nessun cambiamento a comandi, API, profili, account o dati persistenti. Conservati vecchi adattatori e materiale del tema; nessuna infrastruttura grafica alternativa.

Prove su Chromium con fixture locale e viewport simulati, non Safari/iPhone/Android/M11 reali o misura GPU/FPS. Il numero di definizioni con dettagli non dimostra 25 integrazioni HA fisiche collaudate. Nessuna modifica a bozze o sessioni umane, nessuna pubblicazione o aggiornamento nativo/domestico.

## Chiusura e punto di ripresa

Incarico completato nel codice e nella build locale, con [anteprima sintetica](http://127.0.0.1:4185/?screen=app#/mockup). Aprire i dettagli di Luce soggiorno per il primo confronto; Tavano è nella pagina Utilità. La freccia di ritorno chiude la schermata; su un menu aperto il primo Escape chiude il menu, il secondo la schermata. Movimento ridotto verificato nelle preferenze emulate.

Il banco resta ACA 0.9.46, con gli stessi container/immagini/avvii e senza nuova installazione, commit o pubblicazione. L'anteprima usa dati di dimostrazione. Riscontro umano sul movimento e collaudo hardware distinti; nessun altro widget o incarico automaticamente assegnato. Stato, indici, decisione, brief, verifiche e diario aggiornati.

**Chiusura documentale, 2026-11-05:** checker documenti493collegamenti nuovi, zero interrotti, hash materiali nativi conservati. Diff documentale senza errori; dieci hash sorgente e whitespace contro .46 ricontrollati, zero errori nuovi (`root-final-source-check.json`). Evidenze private escluse da Git. Anteprima4185 HTTP200 e health banco .46 riconfermati; nessuna modifica applicativa successiva alle prove finali.

**Precisazione successiva, 2026-11-05 — [REP005](REP-20261105-005-transizioni-widget-fotogrammi.md):** dopo un nuovo riscontro umano, una verifica con immagini del compositor e trace ha individuato la fotografia deformata nel piano mobile, un intervallo con Home e contenuto quasi invisibili e il ritorno a una geometria obsoleta dopo resize. Questi limiti percettivi non erano stati rilevati dalle verifiche riportate sopra. Il nuovo report conserva le evidenze precedenti e documenta correzioni, regressione geometrica e confronto prima/dopo; non estende retroattivamente i PASS di questo incarico né aggiorna il banco.
