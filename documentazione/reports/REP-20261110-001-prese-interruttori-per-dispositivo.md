# REP-20261110-001 — Prese e interruttori per dispositivo

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261110-001 |
| Stato | Completato localmente |
| Data | 2026-11-10, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta | «PLEASE IMPLEMENT THIS PLAN: Prossima famiglia: Prese e interruttori», nella chat corrente. |
| Autorizzazione | Prese smart, multiprese, interruttori e relè; tessera multicanale sintetica, canali nei dettagli, associazione per device_id, build locale verificata. Banco e pubblicazione separati. |

## Obiettivo e perimetro

Proseguire [ADR-0049](../decisions/ADR-0049-widget-prodotti-per-dispositivo.md) dopo Luci: nuovo tipo `plug`, risolutore della famiglia già presente nel contratto, catalogo accanto a Luci e percorso Trova → anteprima associata → Conferma/ACK. Conservare widget storici, account e profili; nessuna migrazione automatica, nuovo stack, dipendenza o comando collettivo. Collegamenti a [prodotto](../funzionalita/product.md), [matrice](../riprogettazione/matrice-widget-ha.md), [design](../design/design.md) e [prima consegna](REP-20261109-013-utilita-e-luci-per-dispositivo.md).

Git iniziale: 657 voci preesistenti. Checkpoint dei 1834 file della consegna precedente in `backup/rep071/source-checkpoint.zip`, manifest e stato Git locali; differenze preesistenti preservate. Nessuna lettura o modifica dei dati personali del banco.

## Criteri di completamento

- Prese e relè operativi distinti da interruttori tecnici e accessori delle altre famiglie; raggruppamento soltanto per device_id esatto.
- Home singola con stato/comando rapido; multicanale con riepilogo senza azioni collettive. Dettagli con uscite, misure disponibili e tecnica separata.
- Potenza ed energia distinte; nessuna somma o attribuzione ai canali dedotta dai nomi, nessuna attivazione durante anteprima/apertura.
- Percorso manuale e Trova condividono il risolutore; destinazioni esistenti, annullamento, quota spazio, retry e blocchi preservati.
- Prove mirate e regressione Luci/generico; strict, build, controlli comuni e confronto con ISSUE-134; UI desktop/telefono e consegna locale. Hardware fisico distinto.

## Avanzamento e modifiche

2026-11-10: checkpoint .58 verificato, nuovo tipo `plug` accanto a Luci, destinazione manuale e Trova sullo stesso risolutore. Associazione manuale e metadati attraversano una sola mutazione del widget; rilettura dei registri al tap, duplicati verificati sul layout corrente, invalidazione per cambio profilo/editor e chiusura. Destinazioni storiche aperte senza riscriverle.

Home singola con comando tracciato, multicanale senza comandi collettivi o di singolo canale nella tessera. Minimo del solo nuovo tipo2×2 per evitare tagli con nome/comando/potenza su telefono. Dettagli con uscite indipendenti, Consumi e misure reali, altre letture e tecnica separate. `unknown`/`unavailable` sono espliciti anche nelle etichette accessibili del toggle.

Classificazione: relay ordinari e outlet, con priorità delle funzioni principali; gli switch tecnici non diventano uscite. Le funzioni primarie non ancora trattate (per esempio un tracker) impediscono di dedurre un relè dal solo switch accessorio. Il fixture Auto, che prima rappresentava soltanto i sensori secondari, ora include esplicitamente un tracker simulato: nessuna blacklist per marchio. Rilevato anche il caso relè con LED `light` tecnico: correzione circoscritta per scegliere plug quando tutte le luci abilitate/visibili del registro sono tecniche; una luce ordinaria mantiene la priorità anche se il suo primo stato non è ancora arrivato. Il LED resta nella sezione tecnica, con i controlli compatibili esistenti.

Mockup: multipresa dimostrativa a tre uscite, presa singola già associata per la verifica cold Home, anteprima catalogo privata e inerte. Nessuna di queste associazioni modifica profili reali.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Checkpoint iniziale | Manifest .58 e ZIP locale dei sorgenti | Eseguito | Stato e hash nel percorso locale del report. |
| Tipi e build | strict frontend, backend e UI; build con `ACASYSTEM_VERSION=0.9.59` | Superato | Warning bundle hls oltre500kB preesistente; pacchetto finale sigillato dopo il caso LED. |
| UI condivisa e asset | `test:ui` e `test:design` | Superato | 3+6 casi, nessuna modifica ai materiali. |
| Regressione mirata | Vitest, più gruppi con sovrapposizioni | Superato | 685scenari frontend unici e17backend; `backup/rep071/tests-summary.json`. Negativi intermedi conservati: inventario passato29tipi, placeholder plug off soltanto nell'anteprima, etichette unknown corrette, LED tecnico e luce ordinaria senza primo stato. Un timeout Console sotto carico non si è ripetuto nel gruppo finale, senza modificare Console. Nessuna suite generale completa dichiarata verde. |
| Controlli generali | ESLint e controlli colore/tipografia | Limiti preesistenti | ESLint7errori con gli stessi fingerprint del checkpoint,0nuovi. Colori0violazioni; tipografia1segnalazione in connect.css:103, file byte-identico. ISSUE-134 resta aperta; suite generale completa non dichiarata verde. |
| Browser prodotto e artefatto | Chromium privato,1916×882 e390×844, mockup | Superato | 6/6percorsi (multi/singola/manuale×2formati),6/6cold Home pronta con presa preassociata e46.3W, zero errori JS/richieste esterne. Ghost/Annulla senza scritture, Conferma1nuovo widget, binding esatto; comandi soltanto DEMO espliciti. Index/entry HTTP=dist=ZIP. Evidenze `qa-final-after-led/qa-plug.json`. |
| Pagina piena | Scelta del dispositivo senza spazio | Superato | Nessuna pagina/widget creati automaticamente. Per i casi positivi è stata preparata una pagina DEMO vuota tramite UI e il baseline è preso dopo quella preparazione. |
| UI e movimento | Normal1916/390, nomi lunghi e movimento ridotto390 | Superato | 3/3, focus/tastiera/overflow; RAF29/27campioni desktop e40/40mobile, sfondo/viewport invariati e nessun filter/backdrop del fullscreen. JSON `qa-final-after-led/visual/qa-visual.json`, screenshot finali letti. Nessuna misura prestazioni RTX o tablet fisico. |
| Gesto dopo nuova pagina | Confronto separato con ZIP .58 | Limite preesistente riprodotto | Nello stesso stato pulito,1916/390, il gesto sulle celle+ non apre il catalogo sia in .59 sia in .58; + pubblico funzionante. Entry .58 verificata contro ZIP/HTTP. Nessuna causa attribuita: ISSUE-152, diagnosi non assegnata. Evidenze `gesture-state.json`, `gesture-baseline58.json`, `gesture-comparison.json`. |
| Banco | Solo `docker ps` in lettura | Non verificabile | Docker Desktop non disponibile. Nessun avvio, aggiornamento, accesso ai database, installazione o pubblicazione eseguiti. |

## Controllo del diff e decisioni

Scelte esecutive circoscritte alla famiglia e ai suoi fixture/test. Nuovo tipo distinto, senza conversione dei vecchi Sensori e comandi o sostituzione di `widgetDeviceKey`. Nessuna modifica agli originali, alle dipendenze, al tema, ai gesti o alla distribuzione del banco. Il contratto conserva versione1; nessun nuovo endpoint HTTP o privilegio HA.

Audit sorgenti:1843file, SHA-256 `7d7ea5425b62bb45e022a251a372fa5f85ca5124bc578f68568c77c68536c830`;27modificati/9nuovi,0rimossi e0estranei rispetto al checkpoint .58. Il documento upstream escluso dall'inventario precedente resta escluso e immutato. Review indipendente e manifest owner verificati; `source-audit-final.json` e `source-delta.json`. Server, lockfile, startup Home, controller del posizionamento e CSS Console invariati. Nessun commit o alterazione della storia condivisa.

Artefatto: `backup/rep071/acasystem-web-0.9.59-local.zip`,2713937byte, SHA-256 `350b704b303d103ec67d9f5e27cb923c6c1441d3858f787bf8cd27817faf2079`. Entry `./assets/index-Dru7KNuV.js`, SHA-256 `bfbded2ae7b48ccc90d844d2b0493934d8d4e854ff2ef41b8a61b5c6aa07c2a1`; index SHA-256 `01730f895285e3782b1fc8aa43faac6d8c24b8bbe3fac630d7eeb27ea7913923`. Manifest in `build-local-manifest.json`. ZIP web, non installatore Electron/APK e non aggiornamento del banco.

## Chiusura e punto di ripresa

Consegna locale0.9.59 completata, [anteprima](http://127.0.0.1:4188/?screen=app#/mockup) con dati dimostrativi e ZIP web verificato. Istruzioni locali in `backup/rep071/PROVA-0.9.59.md`; riepilogo QA in `qa-final-after-led/qa-final-summary.json`. Server temporaneo baseline4189 fermato;4188 lasciato disponibile. Nessun incarico software residuo dentro questa famiglia.

Il gesto sulle celle+ dopo la creazione di una pagina è un limite già riprodotto nella .58, registrato come ISSUE-152/proposta di diagnosi, senza modifica ai gesti nell'incarico corrente. Hardware fisico, sessione autenticata reale, installazione banco e pubblicazione restano operazioni distinte. Il banco non è stato aggiornato; ultima versione documentata .57 e pubblica .34, stato attuale Docker non verificabile dal controllo in lettura.
