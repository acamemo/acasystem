# REP-20261112-001 — Meteo e Meteo di casa

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261112-001 |
| Stato | Completato e verificato localmente |
| Data | 2026-11-12, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta / autorizzazione | «procedi», dopo la proposta di rivedere insieme Meteo e Meteo di casa. Build locale, nessun aggiornamento del banco o pubblicazione. |

## Obiettivo e perimetro

Rivedere weather e cover_weather, REQ-18/19 e ADR-0049. Tessere e dettagli ACA Vetro Bianco, fonti e previsioni effettive, associazioni esplicite e unità reali. Conservare ID, impostazioni e fonti legacy. Meteo è un servizio, non una nuova famiglia fisica. Nessun nuovo provider, geolocalizzazione, scansione, comando meteo, dipendenza o refactor estraneo.

Checkpoint .68: 1967 file, SHA256 `2c46f7670055d73503afc747132af81b2578f34419dd53fdd11929c5bf4495b2`, ZIP riletto integralmente in backup/rep081. Git iniziale: 811 voci preesistenti, conservate. Banco, account/profili, HA reale e pubblicazione esclusi. Le 28 fonti upstream già tracciate nel checkpoint sono conservate; l'esclusione dei nuovi file upstream non le rimuove dall'inventario.

## Criteri di completamento

- Fonte HA scelta per Meteo e politica della fonte domestica esplicitata e recuperabile, senza riscrivere automaticamente le associazioni salvate.
- Condizioni, numeri e unità effettivi; temperatura corrente e sensore opzionale distinti, probabilità e quantità di precipitazione separate. Nessun dato inventato per unknown/unavailable o valori invalidi.
- Previsioni orarie/giornaliere secondo capacità e risposta, storico ricevuto distinto da previsione; nessun campione corrente aggiunto a una previsione.
- Attesa, assenza ed errore coerenti, retry controllato; niente risposte tardive fra fonti/connessioni/viste e cleanup delle sottoscrizioni.
- Associazione condivisa con patch mirata e ACK; riferimenti invalidi conservati e correggibili, nessuna rimozione HA o scrittura al mount.
- Primitive, materiali e transizioni comuni senza blur/zoom nuovi; card compatte, 320/390/desktop, testi lunghi, tastiera e movimento ridotto verificati.
- Test dedicati, regressioni e confronto ISSUE-134; strict/build/UI/asset. Build locale .69 e anteprima4199, QA del pacchetto con dati simulati; prove reali e hardware distinte.
- Report, brief, matrice e requisiti pertinenti aggiornati; proposte estranee non implementate.

## Avanzamento e modifiche

Attuati Meteo e Meteo di casa nella build locale .69. La sorgente meteo e il sensore locale usano un unico componente di associazione nei percorsi raw/categoria; patch, propagazione, memoria e adozione esistenti sono applicate insieme, con vero ACK della centrale nel solo raccordo meteo. Riferimenti mancanti o incompatibili restano recuperabili. La fonte domestica conserva la selezione deterministica precedente finché non viene scelto un override; l’adattatore deriva la fonte senza riscrivere profili o identità.

Tessera e dettagli condivisi, registry della variante domestica con dettagli propri; rimosso il riepilogo operativo duplicato dalla schermata meteo. La copertina autonoma conserva il rendering precedente e non promette più un nuovo tentativo non verificabile. Catalogo: «Fonte della casa», senza attribuire alla scelta automatica una geolocalizzazione. Le due taglie compatte e le vecchie impostazioni rimangono valide.

Numeri finiti e unità native; quantità e probabilità della pioggia separate, minime reali, nessuna condizione corrente copiata sulle previsioni. Meteo attuale, previsione e storico del sensore sono distinti. Lo storico usa letture raw con attributi e unità uguali a quella del sensore, senza statistiche prive di unità o punti inventati. La finestra configurata 1–168 ore viene rispettata. Un sensore con unità esplicitamente incompatibile non viene proposto come temperatura.

Le richieste usano gli adattatori esistenti: capacità orarie/giornaliere effettive, timeout locale 12 s, retry, sospensione fuori pagina e token di contesto per cambio fonte, connessione, tipo e visibilità. Una risposta vuota riuscita resta autorevole; un errore di aggiornamento mantiene soltanto le precedenti previsioni dello stesso contesto con provenienza e avviso espliciti. Gli attributi legacy sono identificati separatamente. Le previsioni twice_daily non vengono rinominate come giornaliere: la copertura del lotto rimane oraria/giornaliera.

Primitive, transizioni e materiali ACA conservati. Il controllo browser ha corretto un overflow reale a 122×122 px mediante densità del contenitore fisico: nome, temperatura e condizione hanno priorità su icona e mini-grafico; nessuna maschera dell’overflow o modifica globale. La taglia domestica 1×1 è leggibile a 48×48 px. Nessun nuovo blur, provider, comando fisico, dipendenza o migrazione di account/profili.

Fonti primarie consultate il 2026-11-12: [Weather HA](https://www.home-assistant.io/integrations/weather/), [contratto entità](https://contributors.home-assistant.io/core/entities/weather/), [Core 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/weather/__init__.py) e [capacità](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/weather/const.py). Non attestano la versione installata sul banco; note in backup/rep081/weather-sources.md.

## Verifiche ed evidenze

| Controllo | Procedura / evidenza | Esito e limiti |
|---|---|---|
| Checkpoint | source-before.json, source-checkpoint.zip | Tutti i 1967 file originali riletti e verificati. |
| Meteo dedicato | Sei file Weather*, tests-summary.json | 126/126 PASS: modello48, dati16, UI19, associazione17, scheda13, integrazione13. |
| Regressioni pertinenti | frontend-final.json e ultimi risultati completi per file | 572 PASS e 2 fallimenti preesistenti su 574 casi/24 file. Non è un PASS generale CI. |
| Debito preesistente | baseline-debt-proof.json, baseline-0.9.68/baseline-two-debt.json | Le due aspettative DEMO su dev_auto e nome della serratura falliscono anche sulla .68 esatta, con tutti i 1967 file ricontrollati. ISSUE-134 rimane aperta. |
| Import del nuovo test | weather-integration-retry.json | Un errore filesystem UNKNOWN nell’import di ConfirmSheet durante il gruppo esteso è conservato nel primo risultato; file originale integro, suite isolata ripetuta 13/13 PASS. |
| Backend / UI / asset | backend-tests.json, ui-test.log, design-test.log | 28 backend, 3 UI e 6 asset PASS. |
| Strict / build | build-gate2.log, backend-strict.log, ui-strict.log | PASS; build web .69. Avviso preesistente per chunk oltre 500 kB, nessuna dichiarazione di CI verde. |
| Controlli generali | lint-comparison.json, typography-final.log, theme-colors-final.log | Lint completo 7 errori/0 warning con fingerprint invariati; tipografia1 nel connect.css originale, colori0. Tre nuove segnalazioni hooks del primo controllo corrette senza disabilitazioni. |
| Browser pacchetto | qa-functional-summary.json | 6/6 percorsi, 6/6 cold e 5/5 viste PASS a 1916/390/320 px, compatti e movimento ridotto. Due cambi fonte reali attraverso l’editor della DEMO, ripristino della politica iniziale e fonte solo giornaliera verificati. |
| Movimento / isolamento | 608 campioni RAF, screenshot e cleanup dei quattro run | Stili di sfondo osservati stabili, backdrop del foglio none; zero richieste esterne, WebSocket, errori JavaScript o comandi mutativi. Non è una misura FPS/GPU o equivalenza pixel. Server e browser privati chiusi. |

Comandi principali eseguiti: npx vitest run con i file pertinenti e reporter JSON; npm run build con ACASYSTEM_VERSION=0.9.69; npm run test:ui e test:design; typecheck backend/UI; node scripts/lint.mjs --format json e lint typography/theme-colors. Output selezionati in backup/rep081.

Negativi conservati: Gate1 usava un click sulla navigazione di servizio coperta dalla scena Home; il runner usa ora la navigazione pubblica da tastiera, senza forzare il DOM. Gate1b ha rivelato il vero taglio delle due tessere a 320 px, corretto nel Gate2. Il primo controllo delle associazioni Gate2 aveva un selettore ambiguo fra titolo del foglio e titolo della fonte: ristretto al corpo, Gate2b PASS senza altre modifiche applicative. Le cinque viste Gate2 sono riutilizzate esplicitamente dal Gate2b solo dopo uguaglianza sorgenti/ZIP/entry; non sono dieci viste diverse.

## Controllo del diff e decisioni

18 file modificati, 9 aggiunti, nessun rimosso, cambio EOL o whitespace finale aggiunto rispetto alla .68. Fonte 1976 file, SHA256 `c97d9e72d4431676ffb7b5463afdf637d5313638c33301fb9e784d76fe9fe454`. Ripristinati i LF originali del solo test di visibilità. Contratti, dipendenze/pin, quattordici famiglie, identità globali, trasporti, auth, gesti, Casa 3D e dati domestici conservati; source-audit.json nomina ogni differenza. HEAD invariato, nessun commit/installazione/pubblicazione.

| Artefatto locale | SHA256 |
|---|---|
| source-final-0.9.69.zip, 1976 file | `6b427829f583a0db11de5b501c29f5e5a8161f0496fbc2977ffe32419e01e0a6` |
| acasystem-web-0.9.69-local.zip, 2759719 byte / 110 file | `ee3948bcd6621ad79f704f87ffcbb9b18c38718c2abda48e7ec96875b9d8edde` |
| ./assets/index-BaKzgVIP.js | `04e0a761fed5b7e0c5182defa622b24f53fcf8ead8b96f91f7a158144af42277` |

Tutti i file dei due ZIP riletti; web ZIP uguale al dist e all’HTTP 4199. Nessun originale di reference o report chiuso alterato. Nessuna proposta estranea promossa a implementata.

## Chiusura e punto di ripresa

Completato e verificato localmente. Nessun lavoro software residuo assegnato per questa consegna Meteo. Copertura del tipo circoscritta, non compatibilità universale dei provider o di tutti i servizi HA.

Aprire [anteprima .69](http://127.0.0.1:4199/?screen=app#/mockup), pagina Clima e meteo: Meteo e Meteo di casa. Sono dati sintetici. Test su centrale/provider reali, accesso HA, iPhone/Safari/Android e Lenovo M11, persistenza autenticata, sincronizzazione fra dispositivi e prestazioni hardware non eseguiti in questo lotto. Il cold verifica il seed della DEMO, non i nuovi salvataggi di un account reale.

Account, profili, HA e banco non modificati. Aggiornamento del banco e pubblicazione restano operazioni distinte; i limiti comuni ISSUE-134/158/159/160 restano separati.
