# REP-20261112-002 — Calendario, Attività, Stanze e Gateway Zigbee

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261112-002 |
| Stato | Completato e verificato localmente; banco/pubblicazione esclusi |
| Data | 2026-11-12, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta / autorizzazione | «vogliamo finire tutto?» dopo l'elenco Meteo, Calendario/Attività, Stanze e Gateway Zigbee. Meteo .69 già concluso: completare le tre aree restanti con build locale unica, senza aggiornare banco o pubblicare. |

## Obiettivo e perimetro

Rivedere i quattro tipi calendar, todo, room, zigbee, REQ-18/19 e ADR-0049. Conservare tipi/ID, dati, profili e impostazioni; API e comandi esistenti, permessi personali, stato osservato distinto dall'accettazione. ACA Vetro Bianco, primitive e transizioni comuni. Non creare nuove famiglie fisiche, servizi cloud, calendaring completo, radio/protocolli, aggiornamenti firmware, refactor estranei o dipendenze.

Checkpoint .69: 1976 file, SHA256 `c97d9e72d4431676ffb7b5463afdf637d5313638c33301fb9e784d76fe9fe454`, ZIP verificato integralmente in backup/rep082. Git iniziale: 833 voci preesistenti conservate. HA reale, dati domestici/account/profili, banco e pubblicazione esclusi; nessuna installazione, commit o prova fisica autorizzata.

## Criteri di completamento

- Calendario: fonti multiple conservate, eventi/titoli/luoghi/ore e giornate intere corretti, estremi esclusivi e fusi reali; assenza di dati non diventa agenda vuota certa. Solo funzioni e azioni già esistenti.
- Attività: lista e funzioni effettive, creazione/completamento/rimozione esistenti sul percorso tracciato; stati, permessi e capacità rispettati. Nessun doppio comando, invio al mount, replay offline o reinvio automatico dopo esito incerto.
- Stanze: riepilogo e dettagli coerenti con area e associazioni esplicite, senza includere altri dispositivi per nome/marchio; precedenza dell'area diretta dell'entità rispettata. Letture/unità native e soli comandi compatibili, gruppi esistenti senza somme/stati inventati. Explorer e widget usano regole coerenti.
- Zigbee: stato rete, dispositivi e manutenzione esistenti separati; ZHA/Z2M secondo dati effettivi. Unknown non significa rete sana. Apertura associazione solo esplicita e temporanea con permessi, target esatto, assenza di invii duplicati o retry fisici automatici. Nessun comando su hardware reale nelle verifiche.
- Associazioni pertinenti condivise tra schede e categorie con patch mirate, memoria/adozione storiche preservate e conferma solo dopo ACK; riferimenti vecchi recuperabili, nessuna migrazione/cancellazione silenziosa.
- Letture limitate nel tempo, retry controllato, visibilità e contesto (fonte/connessione/account/casa/profilo/risorsa) invalidano risposte tardive; dati disponibili mantenuti come precedenti, attesa/errore/vuoto senza sovrapporsi.
- UI leggibile e utilizzabile a 320/390 px e desktop, taglie compatte, nomi lunghi, tastiera e movimento ridotto; nessun nuovo blur/zoom o sfondo che cambia scala.
- Test dedicati e regressioni pertinenti, strict/build/UI/asset e confronto con ISSUE-134. QA sulla build web .70 esatta, anteprima4200 con dati sintetici. Prove su servizi/dispositivi reali distinte.
- Report, brief, requisiti e matrice pertinenti aggiornati; proposte esterne registrate senza implementarle.

## Modifiche completate

- **Agenda:** stessa UI delle schede storiche nelle categorie, fonti multiple o singola lista con componente comune. Date/zone/fine esclusiva validate; solo letture Calendario, nessun nuovo PIM. Preferenza esplicita storica conservata; nessuna scrittura al mount. Attività secondo bit effettivi, UID non ambigui, stato osservato distinto dall'accettazione; mutex condiviso e guardia della provenienza anche sull'oggetto passato a un callback corrente.
- **Stanze:** Home, dettagli, Console ed explorer condividono appartenenza e controlli. area diretta dell'entità prima del dispositivo; legacy entityIds espliciti conservati. Solo un'associazione nuova/confermata scrive roomMembershipSource='area', senza migrazione automatica. Snapshot recuperabili, tecnica distinta e registri non pronti sospendono i comandi. Cambi termostato/ruoli non trasferiscono debounce o rifiuti ad altri dispositivi. Corpo desktop centrato a768px, due colonne comuni.
- **Zigbee:** letture limitate, eventi/retry e dati precedenti qualificati; unknown non significa sano. ZHA e Z2M su contratti esistenti, target permit esatto e lock condiviso. Finestra ZHA stimata, comparsa in HA distinta dall'abbinamento fisico. Backup con amministratore verificato e testo limitato all'accettazione della richiesta; nessuna conferma di copia completa inventata.
- **Associazione:** AgendaBindingSection e RoomBindingSection comuni, patch/memoria/adozione atomiche e salvataggio centrale esplicito con keepOpen. Un contatore distingue la propria patch ottimistica da cambi fonte estranei, anche ABA; scope risorsa/casa/account/editor/connessione e risposte tardive protetti. Offline/rifiuto conservano la bozza. Rimosso il vecchio refresh Stanza separato. Nessuna riscrittura globale dei profili o dell'identità per dispositivo.
- **Presentazione:** primitive ACA Vetro Bianco, densità basata sulle dimensioni fisiche, niente nuovo blur/zoom o animazione per riga. Corrette lista Todo con margini negativi, righe con scadenza tagliate, nomi lunghi Home, dettagli Elimina oltre il bordo e compressione del toggle Stanze. Il testo completo resta nei dettagli/accessibilità; i contenuti piccoli sono ridotti dal markup, non mascherati.
- Tre brief Agenda/Stanze/Zigbee, requisiti, pilota, matricev13, design, verifiche e indici aggiornati. Le altre famiglie, account/profili e dati domestici restano conservati.

## Verifiche ed evidenze

| Controllo | Esito e limite |
|---|---|
| Nuovi dedicati Agenda/Stanze/Zigbee/raccordi |286/286 PASS; comprende letture, dati malformati, date e fusi, timeout, doppio invio, permessi/capacità, eventi/ABA, ruoli/canali, memoria e vero ACK.|
| Ultimi risultati pertinenti per file |662PASS+4FAIL/666 in34file. Base pertinente-final-tests.json, poi AgendaUi/ComfortTodo aggiornati in agenda-final-tests.json; nessuna suite senza asserzioni. Dopo l'ultimo test cambia soltanto il CSS locale di centratura Room; strict/build e QA pacchetto ripetuti.|
| Confronto debito |Tutte4FAIL riprodotte sul checkpoint .69 esatto1976file/SHA c97d9e72: due Energia in FixSheetsReview e due DEMO MockupHa/MockupRoute.17eseguiti,13PASS/4FAIL,73saltati dal filtro mirato; non un PASS generale CI. ISSUE-134 aperta.|
| Backend |28/28 PASS in activityCommands,collaboration,profileService; nessun backend modificato.|
| Statici/build |Strict frontend/backend/UI e build .70 PASS. UI3/3, asset6/6 PASS. ESLint7errori/0warning tutti baseline (HomeStartupContext2,LauncherScreen4,BottomDrawer1), tipografia1 connect.css:103 invariata, colori0.|
| Browser pacchetto finale |20/20flussi,12/12cold,20/20viste PASS; Chromium sintetico320/390/1916, movimento ridotto/tastiera, disclosure, quattro ridimensionamenti nativi a122×48 e ripristino.|
| Animazioni/geometry |1433campioni RAF di sfondo/foglio, controlli contenuti; non benchmark FPS/GPU o confronto pixel. Native ombre negative e pseudo hitarea44px qualificate soltanto con misure esatte, figli visivi contenuti e hit testing reale. Nessuna tolleranza generica per overflow.|
| Privacy |Zero comandi HA, errori JS, richieste extra o WS nella QA. Server privato statico rifiuta API/ha/auth; browser e server chiusi, dati soltanto sintetici.|
| Origine e pacchetto |2003file fonte;47modificati/27nuovi/0rimossi o EOL/trailing. ZIPweb110file verificati singolarmente e HTTP identico. Source ZIP2003file verificato interamente.|

Comandi principali eseguiti, con log/JSON selezionati in backup/rep082:

- `ACASYSTEM_VERSION=0.9.70 npm run build` da frontend, include typecheck strict; ultimi log frontend-build-final.txt.
- `npx vitest run <34file pertinenti> --maxWorkers=2 --reporter=json --outputFile=.../pertinent-final-tests.json`; successivo mirato AgendaUi/ComfortTodo e riepilogo tests-final-summary.json. Le suite dei singoli incarichi conservano anche i primi RED e i riscontri successivi.
- `npx vitest run activityCommands collaboration profileService` da backend; typecheck backend/UI e test:ui/test:design da radice applicativa.
- `node scripts/lint.mjs --format json`, `npm run lint:typography`, `npm run lint:theme-colors`.
- Baseline isolata .69 estratta e verificata dal checkpoint, junction alle dipendenze già installate; test filtrati PAR-3/classificazione/mockup. Nessuna installazione.
- `python backup/rep082/audit-source.py` e `seal-artifact.py`; runner run-remaining-final.mjs con gate ROOT_BUILD_READY_0.9.70, estrazione immutabile e label final-stage5.

### Negativi conservati e correzioni

Il primo test WSS su fonte estranea dava48PASS/6FAIL; dopo la guardia di generazione tutte60varianti di ACK sono PASS, comprese le patch proprie ri-renderizzate prima dell'ACK. I cambi di termostato/ruolo hanno riprodotto invii o rifiuti al target precedente: key/scope corretti e test negativi aggiunti. Le nuove diagnosi hook sono risolte semanticamente, senza disattivare regole.

QA stage1=10/20, stage2=15/20, stage3=18/20: tagli reali Todo e Stanze corretti; alcuni contatori di overflow misuravano ombre/hitarea native, poi separati con prove esatte. Stage4=20/20; root ha osservato il layout Room desktop allineato al bordo, applicato la sola centratura locale e ripetuto tutto sullo stage5. I pacchetti e i risultati precedenti rimangono distinti; non vengono sommati come viste finali.

## Artefatti e prova locale

- Preview: http://127.0.0.1:4200/?screen=app#/mockup, processo9396 verificato. Solo demo sintetica, nessun account domestico richiesto.
- `backup/rep082/acasystem-web-0.9.70-local.zip` — 2774875byte, SHA256 `50f9a648de30ac8802016281226b3734b0ee2836fa90ce7f085c805d6cdded50`.
- `backup/rep082/source-final-0.9.70.zip` — 7653136byte, SHA256 `fba23fce167f13f0ab9b53d581cc0fe3f263091f29be119cdfa007cde5592289`.
- Fonte2003file, SHA256 `e6bbfae7e72a5c310841b1ceb0600e06131e7dff9e88346ef998478adbeac0b2`; entry `./assets/index-BSAaFA0x.js`, SHA256 `50bf822a9fcb66237e6b377e4a3a593e9164d0c1f2f1fe4aae70aaf694432d97`. Manifest, inventari, delta e ZIP intermedi conservati.
- Riepilogo finale QA: `backup/rep082/qa-remaining-final-stage5-summary.json`;74PNG con dati sintetici. Root ha visto le schermate finali Agenda, Todo/Stanze/Zigbee e la centratura desktop, non soltanto i resoconti degli agenti.

Per provare: aprire la preview, usare le pagine demo o il catalogo per Calendario/Attività, Stanze e Gateway Zigbee; aprire una tessera per i dettagli. Gli scenari Casa normale/Nomi lunghi/Non raggiungibili sono già presenti. Le modifiche di configurazione demo non dimostrano salvataggio o sincronizzazione con la centrale reale. L'archivio web è una build di frontend: non usarlo da solo per aggiornare HAOS o il banco.

## Limiti e chiusura

Completata la revisione locale delle quattro aree richieste, includendo Meteo già nella .69. Non è copertura integrale delle integrazioni Excel o collaudo universale del prodotto. Nessun residuo software assegnato in questo lotto. La voce Casa3D e le funzioni estranee restano separate.

Non eseguiti: provider Calendario/Attività reali, radio ZHA/Z2M, reti multiple su hardware, completezza copia ZHA, comandi fisici, account e sincronizzazione reali, Safari/iPhone, Android/LenovoM11 e benchmark GPU/FPS. Il dataset browser mostra ZHAcaricato con membri indisponibili; la rete offline e Z2M sono verificati nei test simulati, non dedotti dallo scenario. Le ricorrenze arrivano da HA; nessuna generazione locale aggiunta.

Banco3002, HA8123, account/profili, installazioni, dipendenze e pubblicazione non modificati. Nessun commit creato; HEAD invariato, modifiche preesistenti preservate. Punto di ripresa: eventuale aggiornamento del banco o prova dei servizi/dispositivi reali richiedono incarico distinto.
