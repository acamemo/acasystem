# Qualifica Core, LAN e client del kit .76.1

| Campo | Valore |
|---|---|
| ID | REP-20261116-006 |
| Stato | Completato con esiti misti; consegna non qualificata |
| Data | 2026-11-16, Europe/Rome |
| Autore / modello | Codex; identificativo esatto del modello non disponibile |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta | «Procedi con la qualifica completa di Core e le prove LAN e client del kit .76.1 sulla VM, senza toccare il banco. Poi dimmi cosa resta da verificare sul PC del capo.» |
| Autorizzazione | Collaudo sulla sola VM REP092, fixture sintetiche e accesso temporaneo dedicato; conservazione del banco e del kit originale. |

## Obiettivo e perimetro

Qualificare i contratti Core utilizzati da ACA sul Core 2026.11.1 della VM `5c2409fa-1b8a-4522-bfe2-54daf258dc43`, distinguendo prove reali, confronti dei sorgenti e dipendenze fisiche. Provare la LAN reale host→VM e il client Windows 0.1.1 incluso nel kit .76.1, con dati e sessione di collaudo isolati. Riferimenti: [REP005](REP-20261116-005-recupero-servizio-ha-dopo-restore.md), [catalogo contratti](../../progetto/acasystem/backend/src/config/homeAssistantApiCatalog.ts), [ADR-0022](../decisions/ADR-0022-identita-di-servizio-dispositivi.md).

All'avvio Git presenta 927 voci preesistenti, staging vuoto; vengono preservate. Nessuna gestione del banco, delle VM storiche, della sicurezza dell'host o del catalogo pubblico. Nessun push/deploy/commit previsto. Il kit originale SHA256 `05cd803723be92660cb373e299975ad96424aeaf788bec7643f6f99724a35b89` resta congelato.

## Criteri di completamento

- Matrice dei contratti effettivamente usati, con esiti osservati e limiti espliciti per hardware/servizi assenti.
- Prove reali Core, permessi e ciclo di vita di risorse sintetiche con pulizia verificata.
- LAN verso l'IP della VM e vero EXE del kit, bundle .76, accesso e Home, persistenza/riconnessione.
- Dati personali selezionati e identità preesistenti conservati; chiave temporanea revocata e rifiutata, VM spenta e CONFIG scollegata.
- Elenco concreto delle verifiche residue sul Lenovo e sui dispositivi del destinatario.

## Avanzamento e modifiche

Ricostruito REP005 e il kit congelato. Evidenze tecniche selezionate in `backup/rep094/`, escluse da Git. Nuova chiave owner-only REP006 e CONFIG contenente soltanto la chiave pubblica; host key già verificata e fissata. Avviata soltanto la VM REP092, senza cambiare risorse, hypervisor o protezioni dell'host.

La qualifica riguarda i contratti Core usati dal kit, non tutte le integrazioni possibili di Home Assistant. Nessuna modifica dei sorgenti applicativi, delle dipendenze o delle dichiarazioni di compatibilità: il kit originale continua a riportare `versionVerified=false` per 2026.11.1. Le evidenze qualificano questa versione esatta, senza estendere automaticamente l'esito a tutta la serie 2026.11.

### Core: copertura reale del catalogo

`contract-coverage.json` riconcilia il catalogo con le chiamate registrate dai veri adapter/transport ACA: **45/45 descrittori invocati**, nessuno mancante. `core-contracts.json`: **18/18 scenari PASS**; `core-extended.json`: **4/4 PASS**. Per i comandi protetti sono verificati sia l'uso consentito sia il rifiuto pertinente. Non basta aver ricevuto un payload vuoto: flussi, registri, storia, servizi e sottoscrizioni usano risorse sintetiche reali create nel Core.

| Gruppo | Prova su Core 2026.11.1 | Esito / limite |
|---|---|---|
| CT-01, RD-01/09 | Provider, login/password, codice, scambio token, current_user; identità servizio admin locale non owner | PASS; nuova identità umana temporanea non admin, poi rimossa |
| CT-02/03 | Config, stati e servizi; subscribe_entities iniziale e delta; state_changed e unsubscribe | PASS; servizio sintetico, nessun attuatore |
| CT-04, RD-02 | flow_handlers e manifest; traduzioni italiane | PASS, 978 handler durante la fixture; numero non assunto stabile |
| CT-05/07, RD-03 | Form, rilettura, errore, menu, completamento, abort, annullamento e 404 | PASS; risposte reali lette dall'adapter |
| CT-06 | External/external_done e progress, evento data_entry_flow_progressed, terminale | PASS, anche normalizzatore ACA; URL esterno di prova non visitato e nessun login cloud |
| CT-08 | Options flow e salvataggio opzione della fixture | PASS; API Core aggiuntiva, non promessa di opzioni per ogni integrazione |
| CT-09 | Entry loaded, reload, elenco, subscribe e rimozione | PASS, soltanto entry sintetiche |
| CT-10 | Device/entity/area list, creazione area, nome/stanza device, hidden_by e ripristino | PASS, risorse poi rimosse |
| CT-11, RD-07 | validate_config; automation POST/GET/DELETE e 404 | PASS; evento trigger mai emesso, nessuna accensione o pacchetto WOL |
| CT-12 | Elenco/subscribe dei flow; discovery sintetica source=ssdp con unique_id; ignore e rimozione entry ignore | PASS; non prova ricezione multicast di un dispositivo fisico |
| CT-13 del catalogo attuale | frontend/get_translations | PASS. L'onboarding iniziale CT-13 del piano storico resta evidenza REP004, non rieseguito distruggendo l'owner corrente |
| CT-14 | create/update/delete user, credenziali e password con owner; non-owner rifiutato; LLAT/list/delete/rifiuto token revocato; revoke refresh | PASS. Non-admin rifiutato anche con HTTP401 dal Core: è un diniego osservato, non una perdita di autenticazione inventata |
| CT-14 discovery attuale | SSDP, zeroconf e DHCP subscribe/unsubscribe | PASS per contratto e formato, liste anche vuote; abbinamento fisico distinto |
| CT-15 | brands token e immagine vera | PASS, PNG6142byte |
| CT-16 attuale | Serial list e multipart file upload | PASS; nessuna porta USB o radio fisica qualificata |

Gli ID CT del catalogo corrente e quelli del piano storico non coincidono sempre: vengono riportati con la relativa operazione, senza affermare una copertura di radio/Supervisor/HTTP solo perché un numero è uguale. Le operazioni `zha/*`, Matter, Z-Wave e provisioning TLS che richiedono componenti o hardware assenti non diventano PASS tramite simulazione.

### Altri contratti effettivamente usati dall'applicazione

`core-media.json`: **5/5 PASS**. Calendario e to-do locali sono già nei 18 scenari: creazione entry, inserimento evento/task, lettura risposta reale, aggiornamento/rimozione task e pulizia. La risposta Core dei servizi ha chiavi `context` e `response`, gestite dal client.

- Storia REST e WS con dati non vuoti: 5 righe osservate. Statistiche inizialmente provate solo come formato; prova aggiuntiva con statistica sintetica importata tramite Core, lettura di una riga mean=21 e cancellazione.
- Forecast orario da entità demo ufficiale di Core: risposta non vuota. Nessuna previsione di un fornitore esterno qualificata.
- Camera demo ufficiale: capabilities, auth/sign_path, snapshot diretto e tramite `/ha` (231077byte), richiesta senza autenticazione rifiutata e primo chunk MJPEG tramite ACA. HLS/RTSP/WebRTC, audio, codec e telecamere fisiche restano prove con dispositivi adatti.
- Comando ACA con uso profilo valido: prepare201, execute200/accepted, ripetizione con lo stesso intent e consultazione accepted; stato sintetico25.25. Nessun comando fisico. Il controllo osserva risultato ripetuto e stato, non una misura strumentale dell'attuatore.

La fixture `custom_components/aca_rep094` è materiale QA della sola VM, escluso dal kit. I componenti demo meteo/camera provengono dal Core installato. Le prime corse hanno rilevato errori nell'harness: metodo del passo menu mancante, ping in attesa di result invece di pong, diniego HTTP401 non incluso nell'asserzione, body command senza wrapper `command`. Corretti soltanto i materiali QA; tentativi precedenti conservati e non conteggiati PASS.

### Client Windows e LAN

`native-client/result.json`: **10/10 PASS**, vero EXE 0.1.1 estratto dal client ZIP identico a quello nel kit, con userData e sessionData in cartella privata isolata. Wizard sull'IP reale192.168.1.79:3002, proxy loopback47320 verso quella centrale, bundle0.9.76 scaricato realmente, login owner sintetico e profilo preesistente, Home pronta. Riapertura conserva sessione/profilo/bundle. Con la sola app ACA della VM fermata il client mostra errore anche con bundle in cache; app riavviata e Riprova recuperano la Home senza login. Zero pageerror o tentativi di attuazione rilevati. Screenshot desktop e390px esaminati: nessun overflow orizzontale; viewport ridotta non equivale a un telefono reale.

Le prove di interruzione disabilitano soltanto il link della scheda della VM identificata, mai la rete dell'host. Le prime due corse recuperano Home e auth_ok; la conta eventi dell'harness non gestiva i frame coalesced di Core. La terza corsa è confusa da un riavvio Core sovrapposto e da uno stall di piattaforma; non costituisce PASS di recupero.

**Ripetizione finale `lan-r4/result.json`: FALLITA**, senza riavvio Core sovrapposto.12richieste LAN sane prima della perdita del link (2,12–26,13ms nella corsa finale), errore nativo corretto a rete assente; link ripristinato, ma niente ritorno della Home entro le attese. Anche SSH e HTTP/Observer della VM risultano irraggiungibili, quindi il timeout non è attribuito al solo client. Pausa/ripresa manuale della sola VM ripristina SSH; load average43,10 osservato. Non è recupero automatico e non è una correzione dimostrata della causa. Nessun ulteriore tentativo viene trasformato in PASS. Rete ordinaria e recupero dopo stop/start della sola app PASS; recupero da interruzione del link e continuità su questo host **non qualificati**. Nessun telefono o secondo host fisico provato.

**Stabilità NEGATIVA osservata di nuovo:** `platform-stalls.txt` e `console-network.png` mostrano stall RCU e watchdog journald; anche HTTP e SSH diventano temporaneamente irraggiungibili, a link già on. Successivo SSH riuscito e processi riapparsi. L'esito dei contratti eseguiti non qualifica H24, né risolve ISSUE-129. Nessuna protezione o configurazione dell'host cambiata.

### Integrità del candidato

`frozen-kit-audit.json`:24file, CRC/checksum annidati,2010fonti e11file executor conformi, client SHAa0d1cba5, nessun materiale privato. `runtime-audit.json` e `live-runtime-audit.json`:120file runtime esatti sia nell'immagine isolata sia nella vera app della VM. Kit SHA invariato05cd8037; `registryPublished=false`, `targetTested=false` indicano che distribuzione pubblica e Lenovo non sono stati collaudati. `installation.json` è già fissato a Core2026.11.1, distinto dal vecchio flag di compatibilità nel codice. Il bundle, l'immagine e il kit restano quelli .76/.76.1 già costruiti.

### Conservazione e chiusura degli accessi

`functional-cleanup.json`: tutte le5identità HA iniziali, inclusa quella di servizio, identiche per ID/ruoli/stato; utente temporaneo rimosso. Entry, entità, aree e flow della fixture rimossi, statistica esterna cancellata, cartella QA rimossa e Core riavviato. `configuration.yaml` conserva SHA059cdfdd. Prova finale dal container senza owner: Core11.1, servizio attivo, file0600, altre4identità conservate, flow Sonoff aperto/annullato; nessuna riparazione manuale.

SQLite integro:13delle14tabelle selezionate byte-esatte; nella tabella client la riga originale `rep092-qa` conserva esattamente l'impronta iniziale. Una nuova riga deriva dall'accesso del vero EXE ed è stata **revocata tramite API**, con revoca refresh completata e nessuna operazione pendente; viene conservata come evidenza nel database. Non si dichiara quindi14tabelle intere identiche. Profilo e selezione esistenti esatti; comandi/attività e storico dei sensori QA sono modifiche intenzionali di collaudo.

Chiave REP006 rimossa per valore pubblico esatto, altre righe preservate; nuovo collegamento rifiutato255/publickey mentre Dropbear era ancora attivo. Poi servizio fermato/mascherato runtime e porta22222 chiusa via console. Shutdown richiesto con `ha host shutdown`: l'harness seriale scade senza ack finale; **poweroff osservato separatamente**, nessun arresto forzato. CONFIG scollegata e UART disabilitata. Evidenze finali in `final-conservation.json`.

### Fonti primarie, consultate 2026-11-16

Versioni da runtime e fonti esatte del tag, salvate con impronte in `backup/rep094/sources/`: [WebSocket API](https://contributors.home-assistant.io/core/internals/websocket-api/), [REST API](https://contributors.home-assistant.io/core/internals/rest-api/), [config entries Core2026.11.1](https://github.com/home-assistant/core/blob/2026.11.1/homeassistant/components/config/config_entries.py), [data entry flow](https://github.com/home-assistant/core/blob/2026.11.1/homeassistant/data_entry_flow.py), [auth](https://github.com/home-assistant/core/blob/2026.11.1/homeassistant/components/config/auth.py), [password provider](https://github.com/home-assistant/core/blob/2026.11.1/homeassistant/components/config/auth_provider_homeassistant.py), [demo meteo](https://github.com/home-assistant/core/blob/2026.11.1/homeassistant/components/demo/weather.py), [demo camera](https://github.com/home-assistant/core/blob/2026.11.1/homeassistant/components/demo/camera.py), [recorder WS](https://github.com/home-assistant/core/blob/2026.11.1/homeassistant/components/recorder/websocket_api.py). Le conclusioni di runtime derivano dalle prove, non dalla sola lettura delle fonti.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Core | 18+4+5scenari reali; catalogo45/45; fixture rimovibile | PASS nei contratti coperti | Hardware/cloud/radio e streaming avanzato distinti |
| Client | EXE0.1.1, sessione isolata, vero bundle .76 | 10/10 PASS | PC corrente, non Lenovo/telefono |
| LAN ordinaria / stop app | IP della VM e proxy nativo, cache/riapertura/Riprova | PASS | Non prova continuità del link |
| Interruzione link VM | Corsa finale indipendente, scheda ripristinata | FALLITA | HTTP/Observer/SSH indisponibili; recupero manuale pausa/ripresa |
| Integrità | Audit kit, fonte, runtime immagine e live | PASS | Candidato locale, nessuna pubblicazione |
| Dati e accessi | Impronte selezionate, revoca, rifiuto SSH, shutdown | PASS | 1nuovo client QA revocato conservato; ack seriale shutdown assente |

## Controllo del diff e decisioni

Solo report, indice, stato, verifiche e infrastruttura aggiornati; materiali QA esclusi da Git. Nessuna nuova funzione, dipendenza, release, dichiarazione di supporto o modifica del banco. Skill `surgical-coding` e `source-driven-development` applicate ai materiali di collaudo. Diff controllato rispetto allo stato iniziale; staging vuoto e HEAD invariato. Non ripetute le suite generali già documentate in REP005: nessun sorgente applicativo cambiato, prove runtime aggiuntive tracciate qui. Il precedente FAIL delle famiglie dispositivi non è risolto da questa qualifica.

## Chiusura e punto di ripresa

Collaudo richiesto concluso con esiti misti. **Core funzionale e client promossi nel perimetro descritto; recupero LAN/stabilità della piattaforma non promossi. Kit ancora candidato, non consegna qualificata.** Nessun incarico operativo resta attivo da questo report.

Per il PC del capo restano:

1. Verifica sul Lenovo reale: virtualizzazione/spazio, VM manuale con risorse previste, bridge della scheda reale, avvio a freddo e ripetuto; campione idle e almeno24ore senza stall/deriva/riavvii. Nessuna riduzione delle protezioni implicita.
2. Recupero rete: interruzione/ritorno Ethernet o Wi-Fi, riavvio router/DHCP e indirizzo della centrale stabile; ritorno di HTTP, Core/ACA e client senza pausa/ripresa manuale. L'esito negativo locale rende questo un criterio di accettazione, non una formalità.
3. Accesso da altri dispositivi della sua LAN: vero telefono/tablet, browser/client Android se usato, touch, sospensione/riapertura e autorizzazioni.390px sul desktop non sostituisce tali prove.
4. Modelli reali del destinatario: associazione con account suo/eWeLink se necessario, discovery/multicast, comandi e conferma fisica dello stato; gateway/USB/Zigbee/Matter e camera/HLS/WebRTC soltanto se presenti.
5. Sul nuovo impianto vuoto: installazione della combinazione esatta HAOS18.4/Core11.1/Supervisor11.0, main/companion e primo owner; update/backup/restore/reboot verificando dati suoi e recupero del servizio. REP005 è evidenza sulla VM attuale, non sul Lenovo.
6. Distribuzione esatta ancora da predisporre con autorizzazione separata: immagine/release/catalogo/download pubblico coerenti con .76.1 e relative impronte. Il primo avvio HAOS può scegliere un Core diverso: il bootstrap rifiuta versioni diverse dal pin, non esegue downgrade automatici. Un nuovo Core richiede confronto/collaudo. Il flag interno di compatibilità della .76.1 resta storico e va considerato nell'eventuale successivo candidato, senza alterare lo ZIP già provato.

Scheda portabile e candidato immutato in `backup/rep094/pc-capo-qualifica-0761/`; non contiene account, token, chiavi o dati della VM.
