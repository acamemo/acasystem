# REP-20261111-004 — Area Sensori

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261111-004 |
| Stato | Completato e verificato localmente; banco escluso |
| Data | 2026-11-11, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta / autorizzazione | «procedi con area sensori», dopo la proposta Sensori: temperatura/umidità, movimento/presenza, aperture, aria/fumo/allagamento; un widget per dispositivo, misure, batteria, stato e cronologia pertinente. Helper e comandi manuali con gestione distinta. |

## Obiettivo e perimetro

Proseguire REQ-18/19, ADR-0049 e matrice con il prodotto sensor per esatto dispositivo HA. Conservare entityId, identità/memoria e widget storici, senza conversioni automatiche. Canali sensor/binary_sensor ordinari e secondarie/tecnica coerenti; nessun raggruppamento per nome, marchio, stanza o integrazione. Preservare la priorità delle tredici famiglie già rivedute e i percorsi generici/helper.

Git iniziale:765 voci preesistenti. Checkpoint .65 di1935 file, SHA37714bfaf66de28c461f058e4b48a1b66ba48d90f3f6f7fd6e48b3ed7c334aeb, verificato integralmente prima delle modifiche in backup/rep078/source-checkpoint.zip. Account, profili, banco, HA reale e pubblicazione esclusi; nessun commit/installazione o aggiornamento dipendenze. Non modificare archive, backend, auth, trasporti, gesti globali o modello generale di identità.

## Criteri di completamento

- Risolutore v1 per dispositivo fisico con canali sensor/binary_sensor abilitati e visibili; configurazione/diagnostica separate. Le telemetrie di luci, TV, robot e altri prodotti non creano un secondo prodotto Sensori. Device con soli helper o sola diagnostica non diventano sensori fisici nuovi.
- Home sintetica e dettagli con misure/stati, nomi/unità HA, batteria pertinente e timestamp disponibili. Nessuno zero, percentuale, conversione, soglia di allarme o stato rassicurante inventato. Numerici, binari e non numerici distinguibili, unknown/unavailable espliciti.
- Cronologia tramite API/adattatori esistenti, caricato solo il canale visibile; stati binari e numerici rispettati, errori/assenza di dati gestiti senza bloccare letture correnti. Nessun nuovo campionamento, archivio o allarme fisico.
- Helper/comandi manuali distinti nella stessa area di associazione, riutilizzando percorso generico e impostazioni esistenti; selezionare una nuova associazione nell’altra modalità invalida i metadati incompatibili; il solo cambio tab non scrive. Nessun nuovo tipo/permesso o infrastruttura per i soli helper.
- Trova/manuale sul medesimo risolutore, anteprima inerte, posizionamento sulla pagina idonea più vicina, Conferma e ACK. Doppio invio, risposta persa, Annulla, pagina piena, duplicati, pile/pagine nascoste e proprietario cambiato rispettati.
- Primitive Vetro Bianco e transizioni comuni, mx-icons, controlli 40px, 320/390/desktop, testi lunghi/tastiera/movimento ridotto, senza nuovi blur/zoom/tagli. Nessun comando su mount/anteprima/cambio canale; sole azioni tecniche esplicite sul percorso tracciato dell'utente.
- Test dedicati e regressioni mirate sulle altre famiglie, strict/build/UI/asset, confronto con ISSUE-134 (sei test storici e lint7/tipografia1 già qualificati nella .65). Non dichiarare suite intera/CI verdi.
- Build locale .66 con browser QA sul pacchetto esatto, dati simulati separati da hardware. Report, requisiti, brief, matrice, decisioni e indici aggiornati. Banco e pubblicazione successivi e distinti.

## Modifiche consegnate

La categoria è **Sensori**. Il contratto prodotto v1 raccoglie i canali ordinari sensor/binary_sensor dello stesso device_id e conserva entityId come identità storica. Registri, helper e servizi sono distinti: le telemetrie delle altre tredici famiglie non creano un secondo prodotto Sensori. Batteria ordinaria può essere l'unica misura di un apparecchio, ma configurazione e diagnostica da sole non costituiscono un prodotto. Un LED soltanto tecnico non prevale sulle misure del nuovo sensore.

Home di sola lettura con valori, unità native e riepilogo; dettagli con tutte le letture, scelta del canale e periodo della cronologia. Le classi binarie hanno etichette specifiche; unknown/unavailable, numeri non validi e batterie percentuali fuori intervallo sono espliciti. La batteria sintetica richiede una misura univoca dello stesso dispositivo. Nessuna soglia, conversione o aggregazione inventata. Tecnica e manutenzione rimangono separate, con sole azioni esplicite sul percorso tracciato esistente.

La nuova cronologia usa getHistory esistente soltanto per il canale visibile. Risposte tardive dopo cambio canale, connessione, chiusura o invisibilità vengono scartate. Una sola lettura rimane una lettura datata; assenze, errori e intervalli non numerici non diventano linee sintetiche. I grafici numerici usano campioni reali e unità coerenti; una riduzione oltre 300 punti conserva campioni ed estremi originali. In revisione è stato trovato e corretto il caso di batteria storica 150% accettata dal grafico ma rifiutata dalla lista: due regressioni RED qualificate, poi GREEN. L'hook storico condiviso resta invariato; proposta separata ISSUE-158.

Trova e associazione manuale riusano lo stesso risolutore, anteprima inerte, posizionamento e Conferma/ACK. Dispositivo e Helper e comandi sono tab locali: aprirli non salva e non scollega; la scelta di una nuova associazione applica la patch atomica. Helper esplicito impedisce di riattivare metadati residui. Corpi e preferenze dei widget storici conservati, nessuna migrazione automatica. Raccordi condivisi per lookup, duplicati, pile e pagine nascoste preservati. Fixture nuove soltanto nella DEMO.

## Verifiche ed evidenze

- **Frontend: 1056/1056 PASS in 32 file pertinenti**, usando l'ultimo risultato per file; **237/237 dedicati Sensori** in quattro file. Riepilogo esatto e provenienza: backup/rep078/tests-summary.json. Non è una dichiarazione di suite completa o CI verde.
- Il gruppo iniziale registra 785/786 PASS; l'unico RED chiedeva il vecchio elenco DEMO. Aggiornate le aspettative per i due nuovi fixture e i sensori fisici ora riconosciuti (movimento e batteria ordinaria), poi MockupHa 61/61 PASS. Le vecchie aspettative sul limite delle classi sensore e sul nome catalogo sono state aggiornate al comportamento assegnato. I negativi e gli errori strict dei test durante la scrittura rimangono conservati.
- **28/28 backend PASS**, strict frontend/backend/UI PASS, build .66 PASS, **3 UI e 6 asset PASS**, colori 0 violazioni. ESLint conserva gli stessi 7 fingerprint della .65; l'unica violazione tipografica è connect.css:103, byte invariato. ISSUE-134 rimane aperta; i sei fallimenti storici TvOnNetwork/TvRemote qualificati nella .65 non sono stati rieseguiti qui.
- **QA del pacchetto finale: 6 flussi, 6 cold, 5 visuali uniche PASS**, sintetici. Trova multicanale e singolo, percorso manuale helper→dispositivo sul medesimo ID, anteprima/Annulla/Conferma, lookup senza duplicazione e riapertura, desktop e 390 px. Visuali a 320/390/1916, testi lunghi, tastiera, movimento ridotto e unavailable. Il primo controllo visuale 4/5 includeva timestamp della disclosure tecnica tra le letture: negativo conservato, selettore limitato alla sezione Letture e solo caso unavailable390 riprovato. Qualificazione in qa-functional-summary.json; risultati originali e recheck distinti.
- Contenimento, controlli e dettagli condivisi verificati; immagini desktop, telefono e 320 px anche visionate dal coordinatore. Nessun nuovo blur/zoom o animazione per riga. I campioni delle transizioni controllano geometria e CSS, non certificano FPS, GPU o invarianza pixel su hardware reale.
- Zero comandi fisici, reti inattese o WebSocket nelle prove del nuovo prodotto; banco e HA reali esclusi. Il reload DEMO ripristina il sensore già associato nel seed: non certifica la persistenza di nuove tessere né la sincronizzazione di account reali. Browser, context e server privati chiusi; rimane l'anteprima locale 4196. Sensori fisici, iPhone/Safari, scanner Android e Lenovo M11 non collaudati in questo incarico.

Comandi principali: npm run build/typecheck -w frontend, typecheck -w backend, typecheck:ui, test:ui, test:design; Vitest installato con maxWorkers=2, gruppi e nomi nei log. Nessuna installazione o aggiornamento dipendenze. Fonti esterne consultate il 2026-11-11, HA core 2026.10.4: manifest dei helper in agent-sensor-primary-sources.json; [classi binary_sensor](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/binary_sensor/const.py), [classi sensor](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/sensor/const.py) e [history WebSocket](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/history/websocket_api.py). Questo pin di riferimento non dichiara verificata la versione del banco o ogni integrazione dell'Excel.

## Diff, conservazione e pacchetti

Checkpoint .65 di 1935 file verificato; fonte finale **1946 file**, SHA-256 **84dca01c1656befaad5c25d316dd8a0935c5be2f194ba43dc48b33315fd3053c**. **24 modificati, 11 nuovi, 0 rimossi**, nessun cambio EOL o spazio finale aggiunto; tutti i percorsi rientrano nel perimetro. I 13 risolutori precedenti e contracts/widgetIdentity.ts sono byte invariati; i due file Sensor legacy completi rimangono incorporati con la sola rinomina delle funzioni e wrapper di dispatch. Prove nei manifest degli agenti e source-audit.json. Nessun refactor di backend, auth, trasporti, gesti o dipendenze.

Sorgenti recuperabili: backup/rep078/source-final-0.9.66.zip, tutti gli hash riletti; SHA **c4a349241c618ec872bf9369415d01566506efc8436066eb5dc2dda3289dda8a**. Build finale: **backup/rep078/acasystem-web-0.9.66-local.zip**, 2752807 byte/110 file, SHA **ccee2c4f3ee9ecd60e07b5203c2d66ecb7a156153210b2d58095d80e2e3be57c**. Entry index-Cqkl-EA8.js, SHA **fc7a69b6a816e683e714c78a8b23b4c53a6c4bf93e90c489cc17939180d6873f**. ZIP, dist e HTTP4196 coincidono; sorgenti invariati dal GATE2. Il candidato precedente rimane conservato e non è la consegna finale. Vite segnala la dimensione di alcuni chunk; nessuna ottimizzazione estranea assegnata.

## Prova e punto di ripresa

Aprire [anteprima .66](http://127.0.0.1:4196/?screen=app#/mockup). In Trova dispositivi scegliere Sensore ambiente studio oppure Sensore finestra studio: preparare, annullare o confermare la tessera; aprire i dettagli, cambiare canale e periodo. Il Sensore soggiorno è già presente nella DEMO. Nel catalogo Sensori provare l'associazione Dispositivo e il percorso distinto Helper e comandi. Le prove usano dati simulati, senza credenziali o dispositivi dell'account.

**Incarico software completato localmente.** Account, profili, banco e HA reale conservati; nessun commit, installazione o pubblicazione. Aggiornamento del banco, rilascio e collaudi fisici restano operazioni distinte. Le altre aree non sono state ristrutturate da questo lotto; ISSUE-134 e proposta ISSUE-158 rimangono separate.
