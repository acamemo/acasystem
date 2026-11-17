# REP-20261111-001 â€” Serrature, Allarme e Videocamere per dispositivo

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261111-001 |
| Stato | Completato localmente |
| Data | 2026-11-11, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit iniziale | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta e autorizzazione | Â«FAI serrature, poi allarme e videocamereÂ», nella chat corrente, dopo il riepilogo delle famiglie residue. Tre fasi ordinate: Serrature â†’ Allarme â†’ Videocamere. Build locale verificata; aggiornamento banco/pubblicazione non assegnati. |

## Obiettivo e perimetro

Proseguire [ADR-0049](../decisions/ADR-0049-widget-prodotti-per-dispositivo.md), [REQ-18/19](../funzionalita/product.md) e [matrice](../riprogettazione/matrice-widget-ha.md) sul design ACA Vetro Bianco. Un nuovo widget per esatto dispositivo HA, canali ordinari dello stesso device_id, misure/altre funzioni e tecnica separate. Preservare legacy, ID, memoria, account e profili; nessuna conversione automatica, nuova scansione, dipendenza, privilegio, servizio backend, tema o modifica ai gesti comuni. Mantenerli nelle chiavi storiche lockId/alarmId/cameraId. Riutilizzare Trova/associazione manuale, anteprima inerte/Conferma/ACK, lookup/pile/pagine nascoste.

Git iniziale705voci preesistenti; checkpoint1871file .62/SHA `317bebd1cfa6fe7368b62a3c54601c8f176ef01b3e7129b9df7033d36eb2cc11`, ZIP verificato in backup/rep075. Le modifiche preesistenti restano preservate. Build finale locale .63 verificata e consegnata; nessun commit o installazione.

## Criteri di completamento

- Ordine: attuare e verificare Serrature, quindi Allarme, quindi Videocamere; le ricognizioni indipendenti possono procedere in parallelo.
- Contratto prodotto v1 e risolutori esatti, no entitÃ  nascoste/disabilitate o raggruppamenti per hub/marca/area. Canali configurativi/diagnostici separati; fallback legacy se metadati non coerenti.
- Serrature: stato reale, blocco/sblocco e apertura solo supportata; conservare conferma dello sblocco, codice transitorio secondo HA e comandi tracciati. Nessuna deduzione di apertura fisica da un semplice sblocco.
- Allarme: stati/modalitÃ  effettive, azioni dichiarate da feature/servizi, codice/consenso richiesti dal canale e nessun invio automatico; non inventare protezione attiva per stato sconosciuto.
- Videocamere: canali dello stesso dispositivo e percorso video/immagine esistente, attivazione/registrazione/movimento solo se realmente supportati dal perimetro corrente. Nessuna nuova architettura di streaming, nuovi protocolli o promessa universale; errori e canale indisponibile espliciti, token/URL sensibili mai persistiti o esposti come dettagli.
- Comandi con permessi dell'utente, senza reinvii o coda offline. PIN/codici soltanto in memoria transitoria, fuori da profilo/bozze/log/diagnostica. Richiesto, accettato e osservato distinti. Limite ordine gateway ISSUE-154 separato.
- Home singola sintetica e multicanale senza comando collettivo; dettagli centrati, primitive/conferme/selettori comuni, controlli leggibili320/390/desktop e nessun blur/zoom nuovo.
- Test delle famiglie e percorsi comuni, regressioni pertinenti, strict/build/contratti e confronto del debito ISSUE-134. Browser isolato e dati simulati distinti da HA/hardware reali. ZIP e HTTP con provenienza esatta, istruzioni locali.

## Avanzamento e modifiche

| Fase | Stato |
|---|---|
| Serrature | Attuate e verificate nei componenti/raccordi/strict/build; QA preliminare6flussi/6cold/5visuali PASS, dati simulati. |
| Allarme | Attuato e verificato:105binding/103UI-regressioni/194raccordi, strict/build; QA6flussi/6cold/5visuali PASS simulati. |
| Videocamere | Attuate:24binding/54UI/14manuale-integrazione PASS; trasporto esistente, un solo canale attivo. QA finale pacchetto6flussi/6cold/5visuali PASS. |

## Modifiche effettive

- Contratto v1 esteso a lock/alarm/camera, risolutori per esatto device_id e sole entità abilitate/visibili. Canali ordinari distinti da tecnica, nessuna unione per hub/stanza; Camera include il faro ordinario dello stesso dispositivo. Le funzioni dei risolutori precedenti sono state preservate.
- Raccordi comuni Trova/manuale, chiavi lockId/alarmId/cameraId, anteprima inerte, destinazioni già presenti e cache delle definizioni. Nuovi prodotti minimi2×2; nessuna conversione dei legacy. Nomi/associazioni/metadati applicati insieme dal percorso esistente; nessuna scrittura prima di Conferma e riscontro.
- Serrature: Home sintetica, canali indipendenti, stato reale e sblocco/apertura con conferma. Codice letto dal campo nativo e pulito prima dell'invio; regex HA, passphrase/spazi e formato assente distinti. Uno sblocco non vale come conferma della porta aperta.
- Allarme: zone e modalità effettive, richieste arm/disarm indipendenti, codici transitori numerici/testuali. Politica incompleta esplicita senza dedurre codice superfluo; disinserimento disponibile durante una richiesta di inserimento. Inserimento/attesa/disinserimento/scatto non diventano falsa protezione. Trigger non introdotto.
- Videocamere: un solo canale di riproduzione attivo, trasporto esistente riutilizzato, cleanup al cambio/pausa/perdita connessione/visibilità/editing. Il solo AppShell Home riceve PageVisibilityContext false quando la Console copre la pagina; la Console sibling mantiene il proprio feed. Catalogo/ghost senza trasporti. Stato idle distinto da alimentazione; power1/stream2, motion_detection assente distinto da false.
- Video avanzato: URL fisso confinato al principale salvo template per canale; PTZ opt-in con registro ONVIF e servizio; destinazioni cast associate esplicitamente; snapshot/record richiedono cartella già configurata e privata. Rifiutati alias con punti/doppi slash della cartella pubblica. Impostazioni video esistenti e4 funzioni aggiuntive conservate; soltanto i controlli generici duplicati nascosti nel nuovo ramo Camera.
- Primitive, Console, Vetro Bianco e transizioni comuni; nessun nuovo blur/zoom, dipendenza, trasporto, API o backend. Misure/uso e tecnica separati. Dati DEMO aggiunti per singoli e multicanale; appartengono ad aree già presenti (Soggiorno/Giardino), senza toccare la centrale reale.

## Verifiche ed evidenze

Le evidenze locali sono in backup/rep075, escluse da Git; i contatori di gruppi sovrapposti non si sommano.

| Controllo | Procedura / evidenza | Esito | Limiti |
|---|---|---|---|
| Checkpoint .62 | Hash1871file e source-checkpoint.zip | PASS | Prima delle modifiche; SHA317bebd1. |
| Fase Serrature | Binding/classificazione123, UI40, manuale9/integrazione5 e raccordi; build-lock.log | PASS | Dati simulati; checkpoint1880/SHA3dd6d084. |
| Fase Allarme | Binding105; UI50+13legacy+40Lock; raccordi194; build-alarm.log | PASS | Dati simulati; checkpoint1889/SHA9854def4. |
| Fase Camera | Binding24, UI54, manuale9+integrazione5 | PASS | Trasporti simulati nei componenti; hardware distinto. |
| Raccordi Camera primo gruppo | camera-integration-tests.json,8file/170casi | 169PASS/1FAIL, corretto | Solo fixture Viste esterno assegnata ad area inesistente esterno; corretta in Giardino, senza allentare l'assert. Verifica finale nel gruppo regressioni. |
| Effetti conferme | security-effect-final.json, Lock40+Alarm50 | 90/90PASS | Ripetizione dopo correzione delle dipendenze useLayoutEffect; guard conferma invariato. |
| Regressioni finali | run-regression-final.ps1,68file, maxWorkers2 | 1213/1213PASS |68file effettivi;217 suite nidificate non equivalgono a217file. Include52file della .62,12test delle famiglie nuove e4legacy/classificazione. |
| Backend pertinente | activityCommands, collaboration, profileService | 28/28PASS | Nessun backend modificato; no prova HA fisico. |
| Contratti comuni | test:ui3, test:design6; strict UI/backend; colori | PASS | Tipografia1 preesistente connect.css:103. |
| Lint finale | wrapper frontend, eslint-sealed.json e lint-comparison-final.json | 7errori identici alla .62 | ISSUE-134; primi10 includevano2dipendenze effetti e1regex Camera, corretti senza ignorare regole. |
| Strict frontend/build | build-sealed.log, ACASYSTEM_VERSION=0.9.63 | PASS | Warning dimensione chunk HLS preesistente, nessuna dipendenza aggiornata. |
| Privacy percorso normale | Review callService→sendUserCommand→commands/activity e test backend | PASS statico e test esistenti | Intents salvano HMAC con chiave RAM e metadati, non command.data; code DB è esito macchina. Tavano/diagnostica ammettono metadati. URL firmati transitori nel trasporto. Non è audit di logger esterni, HA o DevTools. |
| QA finale pacchetto | Runner ZIP immutabili, HTTP GET/HEAD su porte effimere | PASS, per ciascuna famiglia6flussi/6cold/5visuali | Totale18flussi/18cold/15visuali; banco3002/HA8123 esclusi e candidate separate. |
| Provenienza finale | source-audit.json e artifact-manifest.json | PASS |1899file/SHA57b09d7b;27modificati/28nuovi/0rimossi/0EOL o whitespace nuovi; ZIP110file identico a dist e HTTP. |

### Fonti primarie e semantica

Verifica documentale2026-11-11 sulla versione2026.10.4: [lock/__init__.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/lock/__init__.py), [alarm_control_panel/__init__.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/alarm_control_panel/__init__.py), [camera/const.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/camera/const.py), [camera/__init__.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/camera/__init__.py), [ONVIF services.yaml](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/onvif/services.yaml). Questa lettura non dichiara aggiornata la versione HA del banco e non certifica modelli hardware.

### Negativi e correzioni conservati

- Fixture Lock area studio e Camera area esterno non esistenti: corretti soltanto i dati DEMO in aree del registro, con assert preservati. Anteprima stati sconosciuti/prototipo coperta da Object.hasOwn.
- Allarme: test rosso dell'azione Disinserisci durante inserimento pendente, prima che HA pubblichi lo stato transitorio; corretto il gate solo per tale caso,50UI verdi dopo il fix. Nessuna cancellazione/ordinamento fisico inventati.
- Camera: fixture iniziale metteva una camera tecnica nei canali principali ed era quindi invalidata dal contratto; corretta la fixture, senza indebolire il guard. Review indipendente ha trovato alias di /config/www e dipendenza PTZ da attributi non standard: percorsi rifiutati e verifica dal registro introdotta, con negativi espliciti.
- Harness preliminari: sole azioni visibili, mascheramento dei soli campi password e controllo del target anche all'ultimo tentativo di apertura. I fallimenti di questi harness sono distinti dai difetti app.
- Primo ZIP ba6377df è candidato intermedio: Camera6+6+5 PASS; Lock5flussi PASS, sesto interrotto intenzionalmente dal reseal. «Target crashed» durante tale chiusura non è dichiarato regressione app. Reseal finale dopo le2 dipendenze degli effetti, con90test verdi; copie candidate e motivazione dell'interruzione preservate.

## Controllo del diff e decisioni

Scelte esecutive entro la richiesta umana. I problemi comuni134/152/153/154 restano separati, senza assegnazione implicita della loro soluzione. Nuove funzioni dei domini non giÃ  presenti saranno valutate nel perimetro della famiglia, senza estendere protocolli o servizi della centrale.

## Consegna e chiusura

Le tre famiglie sono completate in ordine e verificate localmente.1213casi frontend/68file e28backend PASS, strict/build e3UI/6asset PASS; tests-summary.json distingue i gruppi sovrapposti. Per ognuna delle3famiglie, QA sul ZIP esatto6/6flussi,6/6cold e5/5visuali320/390/1916 PASS. Sigilli qa-lock-alarm-final-seal.json e qa-camera-final-seal.json: nessun errore JavaScript o richiesta esterna inattesa, un solo comando fake per azione, nessuna scrittura prima di Conferma, lookup senza duplicati. Camera118campioni RAF con0media Home quando Console copre/ritorna, canale unico e sfondo CSS stabile. Root ha visionato Camera390 e Lock1916; revisori anche multicanale/320/testi lunghi/indisponibilità. Browser/server effimeri chiusi; anteprima4193 lasciata disponibile. Questo non è un benchmark GPU/FPS né un collaudo Lenovo o HA fisico.

Review indipendenti di binding, UI, privacy e scope; hash1899file correnti verificati senza mismatch. Solo27modificati/28nuovi,0rimossi/0EOL/0whitespace aggiunto. Fonte finale SHA `57b09d7b9e1d014c13e5a69806bfc3fc129ee75b54dc73a9edd63110807bfce0`, source-final-0.9.63.zip verificato integralmente. Build web110file,2730858byte, ZIP SHA `0cb3daaae20d3f47d4cdbd5f980cb1beabf1e657ace7865669a5f4b6d183f014`; entry index-K_le3FB7.js/SHAcf132ee6. Tutti i file ZIP uguali a dist, index/entry HTTP uguali ai file sigillati. Nessuna fonte applicativa modificata dopo il sigillo.

[Aprire l’anteprima locale](http://127.0.0.1:4193/?screen=app#/mockup), oppure seguire backup/rep075/PROVA-LOCALE.md. Da Trova provare Serratura studio/Accessi studio, Allarme studio/Zone di casa e Videocamera studio/Viste esterno. ZIP locale in backup/rep075/acasystem-web-0.9.63-local.zip; relazione prove e sorgenti conservata nei manifest.

Account, profili e widget reali conservati: banco, Home Assistant, dati della centrale e release pubblica non aggiornati. Nessun commit. Restano distinti i collaudi hardware/streaming reale, l’aggiornamento del banco e la pubblicazione. ISSUE-134/152/153/154 e proposte155/156 documentate, senza assegnazione implicita. Nessun lavoro software residuo delle tre famiglie richieste; il prossimo lotto richiede una nuova scelta umana.
