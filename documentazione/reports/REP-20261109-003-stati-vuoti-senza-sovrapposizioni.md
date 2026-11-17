# Stati a schermo intero e precedenza dei messaggi

| Campo | Valore |
|---|---|
| ID | REP-20261109-003 |
| Stato | Completato |
| Data | 2026-11-09, Europe/Rome |
| Autore | Codex; modello esatto non disponibile |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta | «anche in questi casi in cui abbiamo pagina vuota con solo sfondo vorrei un design che rispecchia quanto fatto in precedenza e dobbiamo fare in modo che i messaggi di errore non si sovrappongano»; due screenshot con profilo occupato, spinner e avviso di attesa simultanei. |
| Autorizzazione | Correzione grafica e precedenza degli stati coinvolti. Prosegue l'aggiornamento del banco PC già richiesto, conservando account e profili; pubblicazione esclusa. |

## Obiettivo e perimetro

Uniformare i messaggi bloccanti sullo sfondo alla presentazione essenziale del precedente [REP002](REP-20261109-002-preparazione-lenta-messaggio-centrato.md): testo e pulsante ACA centrati, senza card esterna. Eliminare alla fonte la presentazione simultanea del profilo occupato e del caricamento Home, mantenendo un solo recupero visibile e accessibile.

Preservare uso esclusivo del profilo, sessioni, dati, azioni di riprova, tempi del caricamento e comportamento delle schermate di registrazione/configurazione. Nessun cambiamento al protocollo, alle dipendenze o al backend. Fonti: REQ-28/31 in [product](../funzionalita/product.md), [caricamento Home](../design/componenti/caricamento-home.md), ADR-0004/0047. Baseline applicativa1815file/SHA6ecf4b75;616voci Git preesistenti conservate. Checkpoint in `backup/rep060/`.

## Criteri di completamento

- Profilo occupato ed errore d'uso mostrano un solo gruppo centrato, senza contenitore in vetro, su desktop e telefono.
- Dopo oltre10secondi il messaggio bloccante esclude spinner/timeout e controlli duplicati; riprova e ritorno alla Home funzionano.
- Test di regressione e verifiche strict/build pertinenti; nessuna regressione introdotta rispetto al debito preesistente ISSUE-134.
- Candidata locale verificata e installata sul banco con backup e controlli di conservazione, senza pubblicazione.

## Avanzamento e modifiche

Individuata una divergenza concreta: il render del profilo dava precedenza a uso bloccato/non verificabile, ma il segnale Home dava precedenza a loading. Lo stesso stato poteva quindi montare sia il blocco sia spinner/timeout. Allineata la precedenza; il presenter Home viene escluso immediatamente quando la schermata appartiene a un recupero. La personalizzazione dell'account segnala anch'essa il proprio blocco durante il recupero di una sessione già in cache.

Primitiva condivisa `StatusMessage`, senza Surface e con testo/azioni centrati, riusata nei fallback di Home, client, personalizzazione e profilo. Pulsanti e messaggi specifici conservati; nessun modulo di scelta profilo o creazione account ridisegnato. Il successivo richiamo umano «evitare anche sovrapposizione loader messaggio di errore» è coperto già prima del timeout, senza intervenire sui soli livelli CSS.

Il recupero esterno azzera ciclo e flag visuali, distinguendosi dal normale cambio route. Scartata anche la memoria del presenter: un successo prima150ms non fa apparire per96ms uno spinner del tentativo precedente. Nessun cambio di timer, API, coordinatore, concessioni o scritture. Diff applicativo:7file di produzione e1test; nuova primitiva,0file estranei/rimossi. Fonte approvata1816file/SHA `a41c99f2eaae79cad185f62ddaf39e41febd9a60cad8737f9f4b9668877f926d`.

## Verifiche ed evidenze

| Controllo | Procedura | Esito e limiti |
|---|---|---|
| Startup e gate reali | HomeStartup/HomeStartupGates con timer controllati |28/28PASS: blocco iniziale con loading, spinner già visibile→blocco, attesa>10s→blocco→retry, blocco dopo Home pronta, accesso, account in cache e compatibilità delle sessioni precedenti. |
| Asset e presentazione vicina | HomeStartupAssets, HomeEntryPresentation, LiveProfilesRollback |24/24PASS; nessun PASS della suite generale implicito. |
| Primitive/asset e strict | test:ui/test:design, typecheck frontend/UI, colori |9/9PASS, strict PASS,0violazioni colore. Build frontend/Casa3D della ricetta congelata PASS; debito ISSUE-134 e avviso HLS preesistenti distinti. |
| Browser controllato | Provider reali, solo coordinatore in memoria;1366×900/390×844 |5/5PASS: blocco e indisponibilità, permanenza13s, passaggio da pending e successo rapido5ms. Campioni precoci e traccia RAF senza messaggi/loader concorrenti, un solo retryUsage,0API/WS/esterne/errori. Testo e pulsante centrati, nessuna card o overflow. |
| Revisione indipendente | Diff contro checkpoint e manifest9record |8delta attesi,0estranei/rimossi. Caso negativo dello spinner residuo riprodotto prima della correzione e conservato separatamente. |

Evidenze in `backup/rep060/`: `ui-implementation-handoff.md`, `ui-cross-review-final.json`, test/log, `qa-final-handoff.md`/sigillo, JSON e screenshot visionati. La QA ricompilata usa i7sorgenti di produzione finali; l'ultimo cambiamento del fingerprint complessivo ripristina soltanto il terminatore del file di test alla forma originale. Nessun ulteriore rebuild visuale attribuito a tale rettifica. Browser e helper privato chiusi; nessuna autenticazione reale o prova hardware.

## Candidata e aggiornamento del banco

Preparata e installata localmente .49/r99, non pubblicata. Ricetta derivata già verificata: builder vincolato, runtime .46 immutabile e backend/contratti/dipendenze invariati; sostituiti integralmente soltanto i dist frontend/Casa3D. Ricetta SHA558ba87a,0installazioni runtime.7checksum,1816sorgenti,117file runtime e127web verificati;6marker della presentazione condivisa PASS,7versioni runtime e19APK identici alla .48. Tre fixture isolate completate e rimosse senza volumi live.

| Artefatto | Valore verificato |
|---|---|
| Base .49 | `sha256:ad885e127ab9cbbafeedf686c6073922fbc2e7f51e250656ea293689335a6b0b` |
| Wrapper .49/r99 | `sha256:42be51f914875033d13961a5db3d7f6fa3cbb69b0312437151578fc783cfc535` |
| WebZIP |3371868byte, SHA `4cbd2c8c87fd949c359d1f7c5b02a6f8aebe183026f9b071b5614729cc96f2d9`, minServer0.9.49/minShell0.1.0 |
| Backup freddo .48 prima dell'update | `backup/rep060/cold-bank-pre-0.9.49/aca-data-pre-0.9.49.tgz`,218559byte, SHA `643fb73bcfd45c0b899844bad449f5c488d91294d2b2252147df36bc46db6d44` |

Comandi eseguiti: `backup/rep060/build-frozen-base.mjs`, `ha-app/prepare.mjs --version 0.9.49 --revision 99 --base-image aca-system:0.9.49`, audit isolati, gate QA/artefatti e `Update-AcaStatesBank.ps1`. Up del solo tunet con `--no-deps --no-build --pull never`, catena precedente completa più override .49; rollback .48 predisposto con dati correnti. Nessun push o installazione nativa.

Backup estratto con integritàok;27/27tabelle immediate e al controllo successivo identiche,0colonne aggiunte. Audit operativo6/6PASS: hash/copia, SQLite, mount, identità HA/tecnica, health e setup. Tre utenti HA conservati; HA/D1 mantengono ID, immagine e avvio. Solo ACA ricreato. Il gate separato per la sola attività seen_at monotona, già osservata nella consegna precedente, è predisposto ma **non è stato necessario**: lo strict ha superato il confronto senza deroghe.

Health .49/ready e risorse reali confermati. Vista anonima390 sul banco, senza login, con ZIP e modulo `HomeStartupContext-CQhoyXMq.js`/SHA `5500cd19a6a5765c8e18ca6fdd18a763272f543af87fd99be2b6fd990850039f` confrontati all'immagine;0mutazioni/WS/errori/overflow. La prova autenticata completa su dispositivi fisici resta distinta dalle5prove controllate dei gate. Evidenze operative e sigillo banco in `backup/rep060/`.

## Chiusura e punto di ripresa

Correzione installata sul banco con account e profili conservati. Ricaricare [ACA sul PC](http://127.0.0.1:3002/) con Ctrl+F5; sul telefono nella stessa LAN usare http://192.168.1.37:3002/ con la sessione esistente. L'uso esclusivo resta attivo, ma il relativo messaggio ora esclude spinner e attesa prolungata. Pubblica0.9.34 invariata. Nessun incarico software residuo implicito; riscontro umano e collaudo fisico distinti.

Chiusura documentale:1512collegamenti locali validi negli11documenti aggiornati, diff whitespace senza nuove violazioni. Il primo controllo esteso ha segnalato uno spazio già identico a HEAD in product.md:125; esito conservato e classificato, riga estranea non modificata. Fonte finale e9hash manifest ancora conformi; backup escluso da Git. Nessun commit o push eseguito.
