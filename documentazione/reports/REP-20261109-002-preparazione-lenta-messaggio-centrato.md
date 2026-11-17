# REP-20261109-002 — Preparazione lenta: testo e pulsante centrati

| Campo | Valore |
|---|---|
| Stato | Completato: presentazione verificata e banco aggiornato0.9.48/r99 |
| Data | 2026-11-09, Europe/Rome |
| Autore | Codex; nome esatto del modello non disponibile |
| Richiesta e autorizzazione | L'utente mostra il recupero Home e chiede testo semplice «La preparazione sta richiedendo più tempo del dovuto», senza contenitore grafico, con pulsante ACA «Riprova» subito sotto e centratura nella pagina. La richiesta arriva durante l'aggiornamento autorizzato del banco: includere il ritocco nella consegna reale, conservando account/profili. |

## Obiettivo e perimetro

Cambiare soltanto la presentazione dello stato di preparazione prolungata: testo libero, allineato al centro, e pulsante stilizzato condiviso. Il gruppo testo+pulsante è centrato verticalmente e orizzontalmente nello spazio disponibile; entrambi hanno lo stesso centro orizzontale, con spazio ACA fra loro. Preservare sfondo, comportamento di Riprova, tempi e segnali del coordinatore, altri errori, sessioni e dati. Nessuna modifica del protocollo o aggiramento dei gate sulla sola base dello screenshot.

Checkpoint prima degli edit `backup/rep059/source-before.json`:1815file/SHAca1e5d71, uguale alla .47 appena installata in [REP001](REP-20261109-001-banco-pc-gesti-catalogo.md). Previste modifiche locali a presenter, stile e test esistente; successiva build locale .48 con runtime conservato e backup nuovo prima del breve aggiornamento ACA. L'autorizzazione del banco rimane attiva; nessuna pubblicazione assegnata.

## Criteri di completamento

- Testo esatto senza materiale/card attorno, pulsante ACA «Riprova» subito sotto; gruppo centrato e senza overflow su PC/telefono.
- Retry esistente funzionante, nessun cambio ai tempi o agli altri stati del coordinatore.
- Verifiche mirate e browser isolato dello stato lento; build e provenienza della nuova immagine coerenti.
- Backup, installazione e conservazione del banco verificati prima di consegnare; hardware/autenticazione umana distinti.

## Avanzamento e chiusura

Modificati soltanto `HomeStartupContext`, una classe locale nel CSS condiviso e il test esistente. Nel ramo di attesa prolungata senza errore il messaggio non usa più Surface: testo esatto e Button primary ACA in colonna, gruppo centrato,16px fra i due elementi e margine mobile. Il ramo di errore specifico conserva la presentazione precedente; tempi150ms/10s/96ms e protocollo di Riprova invariati. Nessuna nuova dipendenza o API.

L'indagine separata in sola lettura ha confermato health/setup pronti e nessun errore HA/proxy/Node nei log selezionati. Il messaggio è la soglia UI10s; dai dati disponibili non si attribuisce l'attesa a un preciso gate del browser né si dichiara risolto un errore di protocollo. Nessun token, login o modifica ai dati usati per l'indagine.

## Verifiche ed evidenze

| Controllo eseguito | Esito e limiti |
|---|---|
| HomeStartup mirati |13/13PASS, strict PASS; callback e stati precedenti conservati. |
| UI/asset, strictUI, build frontend/immagine e colori |9/9UI PASS, build/strict PASS,0violazioni colore. Avviso HLS/debito generale preesistenti non dichiarati risolti. |
| Diff rispetto al checkpoint |1815file,3delta attesi:2sorgenti e1test,0nuovi/rimossi/estranei;3/3whitespace/terminatori preservati. SHA finale `6ecf4b75bc27929a0cf39fce5a41b3975e7aa5418090f85f1c38180fb71c32ef`. |
| QA timeout controllato isolato |2/2PASS a1366×900 e390×844: testo esatto, gruppo al centro entro0,02px,16px di spazio, nessun materiale/card sul contenitore, pulsante ACA. Mobile su2righe senza overflow. |
| Retry della QA |Riprova→ready,2letture catalogo/1snapshot, focusHome e risposta vecchia ignorata;0HA/API/WS/errori. Falsi negativi del harness (layer del pulsante e classe ipotizzata) conservati e corretti solo nei selettori. |
| Provenienza della UI provata |110/110file del frontend locale coincidono byte per byte con lo ZIP della candidata; risorse complete127verificate nell'immagine. Screenshot visionati dal coordinatore. |

Evidenze in `backup/rep059/`: `source-final.json`, `ui-final-manifest.json`, test/log, `qa-timeout-handoff.md`/sigillo, `qa-web-byte-comparison.json`. I test isolati non usano account reali né implicano collaudo fisico o del ramo errore specifico.

## Build e installazione sul banco

Versione locale0.9.48/r99, wrapper `sha256:ffea266ce58a098a2209a0cc0b9e2e333d6aae198d111b3d2a18bcf11c06d5f7`, base `sha256:e83e7b0872775cf6e7870009ddb2533285c449c82165495558a1eef53ad6a125`. Ricetta derivata già verificata nel precedente report: runtime .46 immutabile, builder vincolato, sostituzione completa dei due dist,0installazioni runtime. Hash/immagini input dichiarati in `frozen-build.json`; non è il Dockerfile standard.7checksum,1815sorgenti,117file runtime,127web e6marker del nuovo avviso PASS;7versioni/19APK identiche alla .47. Un problema di encoding/quote nell'helper del primo audit è corretto senza cambiare il prodotto.

WebZIP3371773byte/SHA `851de3950dbaaa973c8c4b5d6fe38632bbf57aea0c73d6a71e8b8197ddaf1647`, minServer0.9.48/minShell0.1.0. Eseguiti `backup/rep059/build-frozen-base.mjs`, `ha-app/prepare.mjs --version 0.9.48 --revision 99 --base-image aca-system:0.9.48`, audit isolati prima del gate, poi updater del solo ACA con `--no-deps --no-build --pull never` e rollback .47 predisposto.

Backup freddo nuovo `backup/rep059/cold-bank-pre-0.9.48/aca-data-pre-0.9.48.tgz`,249975byte/SHA `78e18768816a49a62b32eb05d75bc1132c0f8a0d1ae4fc6df21839f3cbbe5c5a`. Hash/estrazione/integrità e27/27tabelle **immediatamente dopo l'avvio** PASS. Tre identità HA/provider e hash tecnico uguali, mount conservati; HA/D1 stessi ID/immagini/avvii, solo ACA ricreato.

Il controllo indipendente ritardato rimane **5/6**, senza riscriverne il negativo: una sessione aveva aggiornato soltanto `aca_v2_access_tokens.seen_at`. Verifica successiva cold→live in transazione PASS:26tabelle identiche,24/24righe token conservate e tutti i campi token/utente/refresh uguali; un solo timestamp avanzato, nessuna regressione. Il codice aggiorna seen_at dopo richieste HA autenticate, anche di lettura (`store.ts:277`): è attività concorrente, non perdita di account o profili. Metadati e controllo monotono in `live-data-delta.json` e `live-preservation-audit.json`; nessun valore di token stampato.

Consegna reale: health0.9.48 e casa ready su loopback/LAN. Singola vista anonima390, senza login, conferma entry e modulo `HomeStartupContext-CmVCfxID.js`/SHA `ff4ff85c91730a88f7e9af8b0a222ba66f564a2dedab41199645f0aa61473fcb`, ZIP e assenza chrome demo. Nessuna mutazione/WS/credenziale/errori; `qa-bank-final-seal.json` distingue questa vista dalla prova controllata del timeout. Server statico temporaneo, browser e fixture chiusi; ACA lasciato healthy. Nessun aggiornamento HA, installazione nativa, modifica .env/firewall o pubblicazione.

## Chiusura e punto di ripresa

Incarico concluso. Ricaricare [ACA sul PC](http://127.0.0.1:3002/) per ricevere il nuovo frontend; su telefono nella stessa rete usare http://192.168.1.37:3002/ con l'account esistente. Per lo stesso profilo, chiudere l'altra istanza secondo l'uso esclusivo già confermato. Dati/account/profili conservati, pubblica0.9.34 invariata. Nessun nuovo incarico software implicito; rimangono distinti riscontro umano e collaudi hardware.

Chiusura documentale:706collegamenti validi, integrità byte/SHA degli originali PASS, diff whitespace documentale e nuovi file senza errori. I3file applicativi corrispondono ancora al manifest congelato; entrambi i backup freddi .47/.48 sono esclusi da Git. Log/sigillo in `docs-final.log`, `docs-whitespace.log`, `final-validation.json`. Nessun commit o push eseguito.
