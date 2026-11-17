# Correzione dell'avvio autenticato in Edge

| Campo | Valore |
|---|---|
| ID | REP-20261109-004 |
| Stato | Completato |
| Data | 2026-11-09, Europe/Rome |
| Autore | Codex; modello esatto non disponibile |
| Richiesta | Edge mostra lo sfondo, poi il loader e «La preparazione sta richiedendo più tempo del dovuto»; individuare dove si blocca. URL confermato dall'utente: http://127.0.0.1:3002/. |
| Autorizzazione | Diagnosi dell'avvio attuale e correzione minima dei difetti riprodotti che ne impediscono il completamento, con verifiche mirate. Prosegue il banco PC già richiesto per la prova reale; nessuna cancellazione di dati/sessioni, modifica dei permessi o nuova funzionalità implicita. |
| Baseline | HEAD `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`,617voci Git preesistenti; banco .49/r99, fonte1816/SHAa41c99f2. |

## Obiettivo e perimetro

Distinguere accesso, recupero profilo e preparazione Home; individuare la fase rimasta pending prima di proporre una correzione. Fonti: [caricamento Home](../design/componenti/caricamento-home.md), REQ-28/31 e [consegna .49](REP-20261109-003-stati-vuoti-senza-sovrapposizioni.md). Il corretto ingresso anonimo del browser integrato non dimostra il caricamento della Home autenticata di Edge.

Preservare account, profili e sessione originale. Raccogliere soltanto stati, tempi, path normalizzati e codici; nessun token, password, payload o configurazione personale nei documenti.

## Criteri di completamento

- Identificare con evidenza il punto di attesa, oppure documentare il limite concreto che impedisce l'osservazione.
- Riprodurre in isolamento eventuali difetti di coordinamento prima di modificare il prodotto.
- Registrare verifiche e distinguere fatti osservati, ipotesi e risultati; nessun nuovo rilascio dichiarato senza build e controlli.
- Dopo una riproduzione pertinente, correggere il blocco senza cambiare layout salvato, tempi, animazioni o protocollo; verificare la geometria autenticata e preservare i dati prima della prova sul banco.

## Avanzamento e verifiche

Server .49 healthy su loopback e LAN192.168.1.37; HA/D1 attivi. L'utente conferma il medesimo indirizzo127 usato dal browser integrato. Il primo tentativo di controllo di Edge si è arrestato perché l'URL non era verificabile; dopo la conferma la finestra ACA è identificata, ma il controllo riporta finestra minimizzata. Nessuna sessione modificata.

Esiti intermedi in sola lettura:

- Nessun errore haProxy/haAuth nei20minuti campionati; registrati soltanto conteggi di categoria, senza log raw.
- Metadati dei5profili salvati letti senza identificativi, nomi o contenuti: pagine widgets e casa3d, configurazioni persistite presenti. Non identificano da soli la pagina realmente montata in Edge.
- Riproduzione isolata4casi: widgets vuota, catalogo che risponde vuoto e readiness tardiva superano il controllo; pagina solo speciale con wrapper `display: contents` non supera la misura. Difetto geometrico concreto, ma non attribuito alla sessione Edge. Nessuna modifica applicata.
- Il warning WebSocket «Page entered Back-Forward Cache» riguarda sospensione/ripresa del browser; da solo non prova un guasto ACA. Fonte primaria consultata il2026-11-09: [Chromium, PSA del17aprile2026](https://groups.google.com/a/chromium.org/g/blink-dev/c/52nlr8z3Png/m/h3oWowT8AwAJ), [web.dev, aggiornamento16ottobre2026](https://web.dev/articles/bfcache). Il client HAWS gestisce già la riconnessione del socket stabilito; la fase iniziale resta da osservare.
- L'utente riferisce che il problema permane dopoCtrl+F5. Il primo risultato dei performance mark è vuoto, ma la stessa Console riporta porte5181/4000 ed endpoint diversi dal banco ACA3002. Origine/contesto della Console da verificare prima di interpretare quei401 come errori di ACA.

Osservazione successiva fornita dall'utente: origine127.0.0.1:3002 confermata, entry `index-By4i8HAi.js` esatta. La lettura dei mark mostra access ready, profile ready, home pending→ready, phase entering→ready. Uno snapshot JSON successivo nella pagina principale (`window===top`) riporta una sola Home ready,0loader e assenza del testo di attesa nel body. L'utente riferisce però che l'avviso resta visibile.

Questi dati escludono un presenter di attesa ancora montato nell'istante interrogato; non provano un difetto del compositore. L'utente riferisce che ripristino/ridimensionamento della finestra non eliminano l'avviso. Lo screenshot successivo mostra l'alert temporaneo «VERIFICA ACA» sopra la pagina con l'avviso, confermando l'associazione della Console. Nella stessa immagine è attiva l'emulazione iPhone16ProMax440×956, Fit to window. Richiesto uno snapshot aggiornato dopo la chiusura del popup, includendo viewport e griglia: i precedenti dati ready non vanno assunti contemporanei a un possibile nuovo ciclo dopo il cambio formato. Nessuna pulizia di cache/dati/sessioni e nessuna correzione del protocollo sulla sola base del contrasto.

La richiesta SSE pendente può essere normale e non prova un blocco. Fino a questo punto la fonte applicativa restava1816/SHAa41c99f2,0delta rispetto al checkpoint; nessuna correzione è stata applicata sulla sola base della prima discrepanza visiva.

## Riproduzione pertinente e correzione

Lo snapshot utente aggiornato dopo l'alert mostra440×956, Home preparing,1loader, accesso/profilo ready e griglia corrente non pronta da30×50. I precedenti dati ready appartenevano quindi a un altro istante e non giustificano la conclusione di un avviso rimasto nel DOM della Home pronta. La risposta alla successiva domanda sulla catena dei parent ripete quel medesimo snapshot: non viene registrata come misura dei contenitori.

La prova browser con la catena della sessione autenticata riproduce esattamente30×50, Homeentry440×50 e attesa oltre13s, anche con controller/dati già pronti. `liveProfiles.css` assegna height100% alla shell per rispettare lo spazio riservato agli avvisi; i wrapper Homeentry/content e widget-scene intermedi hanno height auto e interrompono la catena. Correzione minima: trasmettere height100%/min-height0 a questi wrapper nel solo contesto live-app, senza nuovi100dvh, coordinate persistenti o cambi di animazione. Evidenze prima-fix in `launcher-browser-fullchain-before.json` e immagini in `backup/rep061/`.

Riprodotto anche un distinto arresto del medesimo coordinamento: una misura valida che arriva prima dei dati non promuove firstCompositionMeasured quando le dipendenze diventano pronte, impedendo l'avvio degli asset. Aggiunta una rivalutazione della misura corrente al completamento delle dipendenze; la regressione fallisce prima della correzione. Questo difetto non sostituisce la causa geometrica dei30×50 osservati sul PC.

Fonte modificata soltanto dopo checkpoint e riproduzioni. Diff finale:3file, nessun aggiunto/rimosso/estraneo. `LauncherScreen.tsx` rivaluta la prima composizione quando le dipendenze diventano pronte; `liveProfiles.css` estende la regola percentuale locale ai tre contenitori intermedi; `LauncherScreen.test.tsx` copre la regressione. Nessun cambio a dati, coordinate salvate, autorità HA, concessioni d'uso, timer, animazioni, materiali o dipendenze. Fonte1816/SHA `9d6864d3496789eaabe43023a0e08cb58056fb488e1bd0ed0964bd768ef94a1b`.

## Verifiche e consegna

| Controllo | Risultato ed evidenza |
|---|---|
| Regressione del completamento tardivo |1caso fallito prima del fix;3Launcher mirati PASS dopo,209filtrati non eseguiti.40startup/asset/gate separati PASS. `critical-readiness-*.json`. |
| Primitive/asset e strict |9/9PASS, frontend/UI strict e build PASS,0violazioni colore. Debito ISSUE-134 e avviso HLS preesistenti distinti. |
| Browser con catena autenticata | Prima:3/3in preparing oltre13s, griglia30×50/non pronta. Dopo:4/4ready, griglia438×867/pronta su440×956; cambio1366→440 e dati ritardati inclusi. Avviso24px riserva area932px, griglia entro viewport e senza sovrapposizioni. |
| Rete e comandi del fixture |0API/WS/comandi HA/errori. Provider e CSS reali, dati sintetici;8sorgenti tracciati identici fra build e verifica. Screenshot visionati e helper/browser chiusi. |
| Revisione indipendente |3delta previsti e hash conformi, fonte esatta; nessun blocco o ampliamento del perimetro rilevato. |
| Artefatti .50 |7checksum,1816fonti,117runtime e127entry web immagine=ZIP PASS; catena height compilata verificata.7versioni runtime e19APK identici alla .49.3fixture isolate completate/rimosse senza volumi live. |
| Banco anonimo390 | Health .50/setupready, entry `index-C7BiWaFu.js`, modulo startup e CSS `LiveProfilesContext-DLWKjd_l` identici all'immagine;0login/mutazioni/WS/overflow/errori. |
| Riscontro autenticato reale | DopoCtrl+F5 in Edge, l'utente conferma «Sì, ora si apre ACA». È conferma della riapertura, non un collaudo completo dei widget o dell'hardware mobile. |

La QA con dati già pronti e senza LiveProfileChrome non copriva la catena percentuale autenticata; il confronto positivo iniziale viene conservato con questo limite. Anche il primo probe unitario di readiness tardiva cambiava riferimento delle impostazioni e nascondeva il problema: è distinto dalla regressione corretta. La contraddizione temporanea fra mark/DOM ready e successiva schermata preparing non viene attribuita al BFCache o a un doppio provider. La misura corrente30×50 e la replica con la catena completa sono le evidenze determinanti.

## Build, backup e aggiornamento locale

Versione0.9.50/r99, wrapper `sha256:bacc819ba2aefed25287d301dab573d09939cc479274017f8faa95dfc77bd0ed`, base `sha256:3ecd011210bd62a63312b425810edd44c7e21478157644936c136f0ae66a95cf`. Ricetta derivata congelata SHA558ba87a, builder vincolato e runtime .46 immutabile,0installazioni runtime; backend/contratti/manifest invariati. WebZIP3371917byte/SHA `f109bf59fdeaa99d14bd54cbde0444c72bab0bd10b0b9947a2930abb3995300b`, minServer0.9.50/minShell0.1.0. Nessuna pubblicazione.

Eseguiti `backup/rep061/build-frozen-base.mjs`, `ha-app/prepare.mjs --version 0.9.50 --revision 99 --base-image aca-system:0.9.50`, audit isolati e `Update-AcaStartupBank.ps1` dopo i gate fonte/QA/artefatti. Up del solo ACA con `--no-deps --no-build --pull never`, rollback .49 predisposto con tutti i tredici file Compose precedenti. HA/D1 non ricreati, stessi ID/immagini/avvii e mount; identità HA/tecnica uguali.

Backup freddo nuovo `backup/rep061/cold-bank-pre-0.9.50/aca-data-pre-0.9.50.tgz`,212161byte/SHA `0e16407218967cba53d37ab9243b9eaefabccd4ad56c12f2eeccdc7685063f1c`, estrazione/integritàok.27/27tabelle immediatamente dopo l'avvio identiche,0colonne aggiunte. L'audit successivo resta5/6, preservato: una lettura autenticata aggiorna seen_at. Verifica separata cold→live PASS:26tabelle esatte,28righe token e tutti i campi fissi invariati,1timestamp avanzato e0regressioni/imprevisti. Nessun rollback dei dati o segreto stampato.

Evidenze selezionate in `backup/rep061/`: copie prima/fonte approvata, test e negativi, `browser-qa-final-handoff.md`/sigillo, `artifact-audit-handoff.md`, `ops-preservation-audit.json`, `live-preservation-audit.json` e `qa-bank-final-seal.json`. Il controllo anonimo del banco resta distinto dalla conferma umana autenticata.

## Chiusura e punto di ripresa

Incarico concluso: banco .50 attivo e riapertura in Edge confermata dall'utente, account/profili conservati. [ACA sul PC](http://127.0.0.1:3002/), LAN192.168.1.37. Pubblica.34 invariata; nessun nuovo accesso o installazione nativa. ISSUE-149 rimane proposta separata, senza incarico implicito. Nessun ulteriore lavoro software richiesto nel perimetro; prove complete dei widget e hardware mobile restano distinte. Nessun commit o push.

Chiusura: fonte finale e3hash manifest conformi,11documenti/1522collegamenti locali validi e nessuna nuova violazione whitespace. Lo spazio preesistente in product.md:125 è identico a HEAD e conservato; gli avvisi di normalizzazione CRLF non sono fallimenti dei controlli. Backup escluso da Git, fixture/server temporanei chiusi e conferma utente registrata in `user-console-evidence.json`. Sigillo complessivo `backup/rep061/final-validation.json` PASS.
