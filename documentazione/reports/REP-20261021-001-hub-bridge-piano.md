# REP-20261021-001 — Piano: categoria «Hub», sezione «Aggiungi», hub esterni e Acasystem come bridge

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261021-001: piano per la categoria di widget «Hub», la sezione «Aggiungi», gli hub esterni e Acasystem come bridge. Il 2026-10-21 non c'erano report con questa data, ADR-0014 era l'ultima ADR, REQ-17 l'ultimo requisito e ISSUE-104 l'ultima issue. Le numerazioni vanno riverificate al salvataggio, perché ci sono agenti concorrenti. |
| Stato | **Piano proposto, nessuna implementazione autorizzata.** In attesa delle decisioni D-H1…D-H12. |
| Data | 2026-10-21 (Europe/Rome) |
| Autore / modello | Claude Code (Opus 5.5, `claude-opus-5-5`). Flusso con tre ricerche in sola lettura (A: API HA; B: hub e access point; C: repository) e una revisione critica di completezza; il modello delle ricerche non è disponibile. La revisione ha verificato le API al tag `2026.9.4` e diversi fatti esterni. |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` (`master`). Le modifiche non committate di altri incarichi sono lasciate intatte. |
| Richiesta | Utente, 2026-10-21, «/plan»: «aggiungere categoria nei widget "hub" che mi permetta di rilevare dispositivi come per esempio sonoff zigbee bridge pro e tutti i dispositivi di questo tipo usando i vari protocolli. Nel widget in questione in collegamento hub ci deve essere una sezione "aggiungi" per aggiungere tutto ciò che è collegabile. una volta che aggiungi l'hub con un interfaccia che mi permette di aggiungere i dispositivi in modalità access point. E' possibile trasformare acasystem stesso in un bridge? Si vuole avere la possibilità sia di avere acasystem come bridge sia aggiungere un hub esterno come il sonoff» |
| Autorizzazione | Solo ricerca e piano. Esclusi: codice, documenti diversi da questo report, dipendenze, tablet, banco Docker e chiamate a HA. Le proposte non sono approvate (AGENTS.md). |

## Risposta breve

**Sì, ma «bridge» vuol dire una radio, non il tablet né il browser.** Il bridge è un coordinatore (Zigbee, Thread o Z-Wave):
- collegato via USB al server dove girano HA e Acasystem;
- oppure una scatola di rete via Ethernet.

Lo gestisce Home Assistant: ZHA è nel core e funziona in HA Container senza add-on. Acasystem ne diventa l'interfaccia: mostra lo stato, apre l'abbinamento e guida l'installatore.

**Le due strade convivono, ma con un vincolo verificato.** ZHA gestisce **un solo coordinatore e una sola rete**: lo dicono la doc ZHA e `config_flow.py` al tag 2026.9.4 (`single_instance_allowed`). La radio di Acasystem e un secondo coordinatore Zigbee esterno non possono quindi stare entrambi in ZHA. L'hub esterno deve:
- tenere la propria rete ed esporla con un'integrazione HA (Hue, deCONZ, HomeKit) o con un bridge Matter;
- oppure essere la seconda rete tramite Zigbee2MQTT.

**Lo Zigbee Bridge Pro (ZBBridge-P) non è un buon hub da proporre.**
- Con il firmware originale vive nel cloud eWeLink, senza API locale documentata.
- Secondo le schede dei rivenditori è solo Wi-Fi.
- L'unica via locale è il riflash Tasmota come seriale su IP via Wi-Fi, che la doc ZHA sconsiglia.
- Il riflash costa la garanzia e obbliga a riabbinare uno per uno i dispositivi già in eWeLink.

I modelli recenti ZBBridge-PR2 e ZBBridge-U sono bridge Matter certificati CSA. Matter in HA Container però funziona solo «a proprio rischio» con matterjs-server, e aggiungere un bridge richiede di norma l'app Companion.

**Modalità access point.** Chrome non può cambiare rete Wi-Fi. Oggi la web app può offrire solo una guida passo passo. Il service worker e Web Bluetooth (Improv) richiedono HTTPS, che sul banco manca. Il collegamento automatico all'AP richiede l'app nativa (ISSUE-048).

## Obiettivo e perimetro

Il report risponde a quattro domande:
1. Acasystem può essere un bridge?
2. Come si aggiunge un hub esterno come il Sonoff?
3. Cosa contengono la categoria «Hub» e la sezione «Aggiungi»?
4. Cosa si può fare in modalità access point, con la web app e con l'app nativa?

Propone poi tappe, decisioni, costi e rischi.

Collegamenti:
- requisiti: REQ-00 (host Linux 64 bit), **REQ-06/AC-06 (approvato: admin configura e associa; logout admin e login cliente senza privilegi residui)**, REQ-15/AC-15 (tablet e kiosk, proposto), REQ-17;
- issue: ISSUE-005, ISSUE-006, ISSUE-008, ISSUE-013, ISSUE-048, ISSUE-049, ISSUE-102 (D13);
- ADR: 0003, 0004, 0005, 0009, 0012.

Proposte, non create da questo report: **ADR-0015 «Hub e bridge»**, nuovi REQ dal REQ-18 e nuove ISSUE dalla ISSUE-105.

## Fatti (fonti primarie salvo indicazione, consultate il 2026-10-21)

### Home Assistant: documentazione utente
- **ZHA** (https://www.home-assistant.io/integrations/zha/)
  - Un solo coordinatore e una sola rete: «ZHA only supports connecting a single dedicated Zigbee coordinator with a single Zigbee network». Un dispositivo appartiene a una sola rete.
  - Coordinatori: consigliato ZBT-2 (ZBT-1 e Yellow ancora supportati). Testati: ZBDongle-E, SLZB-07, CC2652 con Z-Stack, ConBee III. CC2530/2531 limitati.
  - Coordinatori di rete con `socket://IP:PORTA`.
  - Il seriale su IP (Serial-Proxy-Server) su Wi-Fi, WAN o VPN è sconsigliato. I bridge Wi-Fi sono sconsigliati con radio EZSP. Il Sonoff ZBBridge (non Pro) è «supported but not recommended», con Tasmota.
  - Migrazione del coordinatore senza riabbinare solo da un backup ZHA (radio ezsp, znp o deCONZ); se non si migra l'IEEE, molti dispositivi vanno ricollegati.
  - La UI di HA non supporta la scansione QR per gli install code: serve `zha.permit` con `qr_code`.
  - In Container: dispositivo inoltrato con `devices:`, modemmanager da rimuovere. I dispositivi alimentati a rete vanno abbinati prima di quelli a batteria.
- **Manifest ZHA** al tag 2026.9.4: scoperta zeroconf per `slzb-06*`, `uzg-01*`, `xzg*`, `tube*`, `*zigstar*`, `*zigate*`, `czc*` e il generico `_zigbee-coordinator._tcp`; 15 voci USB; `zha==2.2.2`.
- **HA Container** non ha app (add-on); Thread e Z-Wave controllati da app non hanno supporto pronto. Fonte: /installation/.
- **Matter** (/integrations/matter/)
  - Supportato solo con HA OS e l'app Matter Server. «Running Matter Server as a standalone Docker container is unsupported»; con Container si può usare matterjs-server «without support and at your own risk».
  - I dispositivi nuovi si aggiungono solo dall'app Companion, con il Bluetooth del telefono; «Home Assistant does not use that adapter».
  - Anche il flusso documentato per un dispositivo o bridge già in uso su un'altra piattaforma passa dall'app Companion, con il codice generato dall'app del produttore.
  - Servono una rete Wi-Fi a 2,4 GHz e IPv6/mDNS locali.
  - python-matter-server è archiviato; ultima versione 8.1.2.
- **Thread**: solo border router OpenThread. In container serve IPv6 completo; HA raccomanda HA OS o una VM.
- **Z-Wave JS**: in Container si usa Z-Wave JS UI con WS Server. Inclusione con PIN S2 o QR SmartStart.
- **MQTT, Tasmota e Zigbee2MQTT**
  - broker MQTT v5 (Mosquitto) e discovery `homeassistant`;
  - Tasmota con SetOption19 0;
  - Z2M con permit_join su `zigbee2mqtt/bridge/request/permit_join`.
- **Improv via BLE**: invia SSID e password ma non aggiunge il dispositivo. Richiede il Bluetooth lato HA (adattatore, proxy ESPHome) o la Companion.
- **Bluetooth in Container**: BlueZ, `/run/dbus`, NET_ADMIN e NET_RAW.
- **Tuya**: solo cloud. Le pagine di Shelly, ESPHome e Hue non descrivono il provisioning in AP.

### Home Assistant: API interne verificate al tag `2026.9.4`
Fonte: `raw.githubusercontent.com/home-assistant/core/2026.9.4/...`, letta il 2026-10-21. Le API sono interne e non documentate per gli sviluppatori.

| Comando / rotta | Admin | Note |
|---|---|---|
| GET `/api/config/config_entries/flow_handlers` | **No** | Elenco degli handler |
| POST `/api/config/config_entries/flow` | Sì (`permission="add"`) | **Unico modo per avviare un flusso**: nessun comando WS equivalente |
| GET/POST `/api/config/config_entries/flow/{flow_id}` | Sì (`add`) | Passi del flusso |
| WS `config_entries/get`, `config_entries/subscribe` | No | Lettura degli hub |
| WS `config_entries/flow/progress`, `flow/subscribe`, `ignore_flow` | Sì | Flussi scoperti |
| WS `zha/devices/permit` | Sì | `duration` predefinito 60, intervallo 0-254; `ieee`; `source_ieee` + `install_code`, oppure `qr_code`; eventi in streaming |
| Tutti gli altri `zha/*` | Sì | — |
| WS `matter/commission` (`code`, `network_only` predefinito True) | Sì | — |
| WS `matter/commission_on_network` (`pin`, `ip_addr`) | Sì | Via rete, non BLE |
| WS `matter/set_wifi_credentials`, `matter/set_thread` | Sì | Il server Matter custodisce la password Wi-Fi |
| WS `zwave_js/*` | — | **Non verificato al tag**: letto solo sul ramo dev |

### Dispositivi e produttori
- **Tasmota** (https://tasmota.github.io/docs/Getting-Started/): AP `tasmota_XXXXXX-####` su http://192.168.4.1; la configurazione resta disponibile per circa 3 minuti, poi serve riavviare.
- **ESPHome** (https://esphome.io/components/captive_portal/): captive portal su 192.168.4.1, solo se il firmware ha `wifi: ap:` e `captive_portal:`.
- **Shelly**: AP `shelly<MODELLO>-…` su 192.168.33.1, senza autenticazione per impostazione predefinita. Gen2 accetta `WiFi.SetConfig` su `/rpc`. Fonte: documentazione API Shelly (shelly-api-docs.shelly.cloud) tramite ricerca, pagina non letta per intero.
- **ZBBridge-P** (fonti di terzi)
  - Schede di rivenditori: Wi-Fi 802.11 b/g/n 2,4 GHz, 5 V 1 A, fino a 128 sottodispositivi, 26 diretti. Ethernet non indicata.
  - ESP32 più CC2652: CNX Software su foto FCC; blakadder.
  - Riflash «Tasmota32 Sonoff-ZigbeeBridgePro», «senza saldature», poi ZHA come radio ZNP su `socket://IP:8888`.
  - La pagina ufficiale sonoff.tech non si è caricata. La pagina HA /integrations/sonoff/ risponde 404.
- **ZBBridge-PR2**: CSA «Smart Home Bridge» (Matter Bridge). Certificato CSA2647LMAT54865-24, data 08/11/2026, letta come 11 agosto 2026 perché l'8 novembre sarebbe futuro. Dati da riepilogo di ricerca, certificato non aperto.
- **ZBBridge-U («Zigbee Bridge Ultra»)**: presente nel database CSA (CSA25933MAT47237-00). Risulta anche un «Bridge Max» (CSA261E0MAT51208-00).

### Android e web
- **WifiNetworkSpecifier** (API 29+): collegamento a un AP con consenso, senza Internet, con `bindProcessToNetwork`.
- **Permessi**: con targetSdk 33+ serve `NEARBY_WIFI_DEVICES` a runtime; `ACCESS_FINE_LOCATION` resta necessario per i risultati della scansione. Fonte: developer.android.com/.../wifi-permissions.
- Un'app non può leggere le password Wi-Fi salvate. È conoscenza generale, non presente nella pagina.
- **Web Bluetooth**: solo in contesto sicuro e con un gesto dell'utente (MDN). Il supporto sul Tab M11 non è provato.
- **Service worker**: «only available in secure contexts» (MDN); su HTTP con IP di LAN non sono disponibili.
- Anche la fotocamera (getUserMedia, per i QR) richiede un contesto sicuro. Conoscenza generale, non riverificata.
- **Docker Desktop**: rete host opt-in dalla 4.34, solo L4 TCP/UDP. La pagina non conferma Windows e non parla di multicast/mDNS. Fonte: docs.docker.com/engine/network/drivers/host/.

### Repository Acasystem (letto il 2026-10-21)
- **Catalogo**: 7 categorie, nessuna «Hub». Punti di innesto:
  - `catalog.ts` (WIDGET_CATEGORIES, ADD_WIDGET_TYPES);
  - `AddWidgetSheet.tsx`;
  - `categoryPages.ts` (BINDING_KEYS);
  - `CategoryBindingSection.tsx`;
  - `registry.ts`.
- **haClient.ts**: legge i registri di aree, dispositivi ed entità; nulla per config entries, ZHA o Matter.
- **Proxy `/ha`**: 14 rotte REST, nessuna di configurazione. Il WebSocket è un tunnel trasparente che il backend non ispeziona.
- **Service worker**: `main.tsx` registra `./sw.js`. Sul banco in HTTP su IP di LAN la registrazione fallisce in silenzio.
- **Ruolo installatore**: provvisorio, coincide con admin o proprietario di HA (ISSUE-102). REQ-06/AC-06 chiede però che il cliente finisca senza privilegi admin.
- **Banco**: PC Windows con Docker Desktop, **collegato in Wi-Fi con IP variabile** (192.168.1.7, poi .19, poi .11; ripetitore «5 Ghz»), HTTP, TLS non definito. Il tablet a volte usa `http://localhost:3002` via `adb reverse`, che è un contesto sicuro solo con il cavo USB. `compose.tunet.yaml` contiene solo Acasystem.

## Valutazioni

1. **Opzioni di bridge**

   | Opzione | Con HA Container | Nota della revisione |
   |---|---|---|
   | B1: ZHA con chiavetta USB sul server | Supportato | Banco Windows: USB nel container non nativo (usbipd/WSL2, non verificato). Serve un host Linux |
   | B2: ZHA con coordinatore Ethernet/PoE (SLZB-06, UZG-01, XZG) | Supportato | È una scatola esterna presentata come «radio di Acasystem». Sul banco il PC è in Wi-Fi, quindi il link seriale su IP passa dal Wi-Fi (sconsigliato) e la scoperta zeroconf nel container su Docker Desktop è probabilmente assente. Serve Ethernet al PC o un host Linux |
   | B3: Zigbee2MQTT con Mosquitto | Servizi in più | **Unica via per una seconda rete Zigbee** accanto a ZHA |
   | B4: Z-Wave JS UI | Servizio in più | API zwave_js da verificare al tag |
   | B5: Thread/Matter (OTBR, matterjs-server) | «A proprio rischio» | Seconda radio dedicata. Commissioning solo con la Companion |
   | B6: bridge verso Apple, Google, Alexa | Altra lettura | Non ricercata |

   Consigliato: ZHA come predefinito. In produzione ZBT-2 o Dongle Plus-E su host Linux, oppure un coordinatore PoE. Sul banco va prima risolto il collegamento cablato.
2. **Radio di Acasystem più hub esterno.** Con ZHA a rete singola le combinazioni realistiche sono tre:
   - (a) ZHA per la radio e un hub con integrazione propria (Hue, deCONZ, HomeKit) o con bridge Matter;
   - (b) ZHA più Z2M come seconda rete;
   - (c) solo l'hub esterno.
3. **ZBBridge-P.**
   - Firmware originale: nessuna via locale nota.
   - Riflash: seriale su IP via Wi-Fi, sconsigliato da ZHA. Si perdono la garanzia e la rete eWeLink esistente, e ogni dispositivo va riabbinato.
   - Va proposto come «non consigliato». Lo si tenga come scheda informativa e come prova da laboratorio solo con consenso esplicito.
   - Per chi vuole mantenere l'ecosistema Sonoff: PR2 o U come bridge Matter, con i limiti di Matter in Container e della Companion.
4. **Rilevamento.** È HA a scoprire gli hub (zeroconf, ssdp, dhcp, usb, bluetooth, mqtt), non il browser. Sul banco la scoperta di rete nel container è probabilmente assente; l'inserimento manuale `socket://` funziona. Una scansione propria della rete è un lavoro diverso e tocca la privacy (ISSUE-049).
5. **Proxy, ruoli e registro.**
   - L'abbinamento (zha, matter) passa già dal tunnel WS, ma solo per gli admin di HA.
   - Aggiungere un hub richiede la REST `POST /flow`, che non ha equivalente WS. Il proxy va quindi esteso: è un cambio di ADR-0009 e serve ADR-0015.
   - Il **registro delle azioni** non è ottenibile con il tunnel trasparente. Servono l'ispezione dei messaggi WS o rotte backend dedicate, da decidere nell'ADR.
   - Per REQ-06/AC-06 il cliente non deve avere privilegi admin. «Aggiungi» funziona quindi solo in una **sessione installatore** sul tablet, con apertura e chiusura esplicite e un timeout.
6. **Modalità access point.**
   - Il browser non cambia rete. Senza HTTPS non ci sono service worker, Web Bluetooth o fotocamera.
   - La guida va quindi resa disponibile in uno di questi modi:
     - tenuta nella SPA già caricata, con il rischio che la scheda si ricarichi;
     - su un foglio o con un QR per il telefono;
     - dopo l'arrivo di HTTPS (ISSUE-013).
   - Il kiosk (REQ-15) può bloccare Impostazioni > Wi-Fi.
   - Mentre il tablet è sull'AP, il WebSocket cade e Android può tornare da solo a una rete con Internet.
   - La finestra di Tasmota dura circa 3 minuti.
   - Molti dispositivi richiedono il Wi-Fi a 2,4 GHz.
   - L'AP automatico richiede l'app nativa (Capacitor; una TWA non basta), con permessi `NEARBY_WIFI_DEVICES` e posizione. La password di casa va digitata dall'installatore, perché non è leggibile dal sistema.
7. **Matter.** L'aggiunta di bridge e dispositivi passa dalla Companion, che deve raggiungere HA direttamente. Questo è in tensione con ADR-0009 e con la futura chiusura della porta 8123: va deciso esplicitamente. `matter/commission_on_network` dal browser resta un'ipotesi.
8. **Persona di 65 anni.** Un compito per schermata, conto alla rovescia grande, nessun termine tecnico in vista, uscita sempre visibile, «Aggiungi» solo in sessione installatore.

**Ipotesi non verificate**
- l'aggiunta di un bridge Matter dal browser con `commission_on_network`;
- Web Bluetooth sul Tab M11;
- USB nel container con usbipd;
- mDNS nel container su Docker Desktop;
- lo stato 2026 di HA Supervised;
- i comandi `zwave_js/*` al tag;
- i campi del registro dispositivi (per esempio `created_at`) e il modo di distinguere un hub cloud da uno locale (dominio o `iot_class`);
- la chiave di rete Zigbee contenuta nel backup ZHA (formato zigpy);
- gli obblighi RED per apparecchi riflashati.

## Proposta funzionale (non approvata)

- **Categoria «Hub», tipo `hub`.** Associazione per `configEntryId` (più `deviceId` opzionale), non per entity_id. Lettura con `config_entries/get` e `subscribe` (non admin) e con il registro dispositivi. Il widget mostra:
  - origine: radio di Acasystem, hub di rete o hub del produttore (cloud), con una mappatura da definire;
  - stato e protocollo;
  - numero di dispositivi e dispositivi non disponibili;
  - ultimo dispositivo aggiunto, se il campo esiste;
  - il pulsante «Aggiungi», solo in sessione installatore.
- **Collegamento**: scheda «Collegati» e scheda «Aggiungi». La stessa procedura sta in «Hub e dispositivi» della pagina Sistema.
- **«Aggiungi»**, in tre livelli:
  1. **Trovati da HA**, in sola lettura con `flow/subscribe` (admin, nessun cambio del proxy). La conferma passa dalla REST: proxy esteso, ADR-0015.
  2. **Aggiungi un hub**: elenco curato.
     - Radio di Acasystem;
     - Hub Zigbee di rete (`socket://`, ZNP o EZSP);
     - Sonoff: scheda informativa, «non consigliato»;
     - Bridge Matter (rimando alla Companion);
     - Hue;
     - Z-Wave.

     Per ognuno, controllo dei prerequisiti in chiaro.
  3. **Aggiungi dispositivi**:
     - ZHA: permit join (HA usa 60 s come predefinito, massimo 254), conto alla rovescia, «Chiudi ora», nome e stanza alla fine; install code e QR solo con HTTPS;
     - Z2M: solo se si sceglie B3;
     - Z-Wave: S2 o SmartStart;
     - Matter: rimando alla Companion;
     - Wi-Fi: guida AP.
- **Conferme e sicurezza**: doppio passo, nessuna rimozione nella prima versione, registro lato server (meccanismo da decidere in ADR-0015). La password Wi-Fi non viene mai salvata né scritta nei log.

## Costi e hardware (prezzi da rilevare, nessuno verificato)

| Voce | Serve per | Note |
|---|---|---|
| Coordinatore Zigbee: ZBT-2 o Dongle Plus-E (USB), oppure SLZB-06 o UZG-01 (PoE) | B1/B2, T2 | ISSUE-005 |
| Iniettore o switch PoE, cavo e punto Ethernet in posizione centrale | B2 | Anche il PC del banco cablato |
| Mini-PC Linux per il banco (eventuale) | B1, scoperta di rete | Il banco Windows limita USB e mDNS |
| Seconda radio per Thread (ZBT-2 dedicata) | B5 | Zigbee e Thread non sulla stessa radio |
| Chiavetta Z-Wave 868 MHz | B4 | Modello da scegliere |
| Dispositivi di prova: router Zigbee (per esempio ZBMINIL2), Shelly nuovo, ESP32 con Improv, dispositivo o bridge Matter | T4-T8 | Parte del kit esistente (ISSUE-005) |
| ZBBridge-P sacrificabile (e forse un adattatore seriale) | T6 | Garanzia persa |
| Certificato HTTPS: dominio e DNS-01, oppure CA locale installata sul tablet | Service worker, Web Bluetooth, fotocamera | Da decidere (ISSUE-013) |
| Account sviluppatore Google Play | T9 | Costo da verificare |
| Ore di sviluppo e collaudo | Tutte | Nessuna stima fatta: da aggiungere in T0 |

## Tappe proposte (riordinate e divise)

| Tappa | Contenuto | Fatto quando | Serve |
|---|---|---|---|
| T0 | Risposte a D-H1…D-H12, budget e priorità | Risposte registrate in project-status.md | Utente e capo |
| T1 | Verifica residua al tag 2026.9.4: `zwave_js/api.py`, serializzazione di `data_schema`, permessi del registro dispositivi e campi utili. Piano dei test di contratto | Tabella completa con lo SHA del tag. Le parti config_entries, zha e matter sono già fatte in questo report | Solo web |
| T0b | Bozza di ADR-0015 «Hub e bridge»: estensione del proxy (REST dei flussi), sessione installatore (REQ-06), registro lato server, posizione della Companion rispetto ad ADR-0009 | ADR-0015 accettata da una fonte umana; nuovi REQ proposti; voci in compliance.md | T1, utente |
| T2 | Radio sul banco: PC cablato o host Linux, coordinatore, ZHA configurata da HA, un dispositivo abbinato | ZHA in linea; backup di rete cifrato fuori da Git; copia a freddo; esiti in verification.md | Hardware acquistato; autorizzazione a modificare HA del banco |
| T3a | Categoria «Hub» in sola lettura, con HA finto | Vitest (caricamento, errore, vuoto, non raggiungibile); typecheck, lint e build verdi; niente «Aggiungi» fuori dalla sessione installatore | T0, T0b; autorizzazione all'implementazione |
| T3b | Prova della T3a sul banco e sul Tab M11 | Widget con la rete di T2, testo grande | T2, T3a |
| T4 | Abbinamento ZHA (`zha/devices/permit`) | Abbinamento vero dal tablet con stanza; chiusura automatica e a comando; rifiuto chiaro per chi non è admin; test di contratto verdi | T1-T3b, sessione installatore |
| T5a | «Trovati da HA» in sola lettura (WS admin) | Elenco dei flussi scoperti, o vuoto spiegato. Nessun cambio del proxy | T3a |
| T5b | Rotte REST dei flussi nel proxy, renderer di form, menu e progress, registro lato server | 403 per chi non è installatore (test backend); test su form, abort e create_entry; ADR-0009 aggiornata | ADR-0015 |
| T5c | Flussi curati (`socket://`, Hue) | Un hub aggiunto dal tablet | T5b, hardware |
| T6 | Scheda Sonoff (informativa, «non consigliato»); prova del riflash solo se autorizzata | Scheda revisionata; esito o «non provato» | Consenso; verifica RED e licenze |
| T7a | Guida AP (Shelly, Tasmota, ESPHome) senza service worker: SPA già caricata, foglio o QR | Shelly nuovo collegato e poi aggiunto; guida provata con il tablet fuori rete; nessuna password nei log | Dispositivo; risposta su kiosk e 2,4 GHz |
| T7b | Guida offline con service worker, Improv via Web Bluetooth e QR con la fotocamera | Funziona in HTTPS sul Tab M11 | HTTPS (decisione separata) |
| T8a | Z-Wave (Z-Wave JS UI) | Un dispositivo aggiunto | Hardware; host Linux |
| T8b | Matter/Thread (matterjs-server, OTBR) | Un dispositivo o bridge aggiunto dalla Companion | ADR sulla piattaforma (Container o HA OS) e sulla Companion |
| T9 | App nativa: AP automatico e BLE (dentro ISSUE-048) | Prototipo su Tab M11 e telefono; permessi documentati | ADR di ISSUE-048; account Play |

## Decisioni per l'utente

- **D-H1**: significato di «bridge». Radio gestita da HA tramite Acasystem, oppure ponte verso Apple, Google o Alexa.
- **D-H2**: ZHA o Z2M. Con ZHA a rete unica, una seconda rete Zigbee richiede Z2M.
- **D-H3**: hardware. USB su host Linux oppure coordinatore PoE. Per il banco serve anche il cablaggio.
- **D-H4**: HA Container o HA OS, se servono Matter e Thread.
- **D-H5**: ruolo installatore (D13). Per REQ-06 il cliente non resta admin.
- **D-H6**: dove sta «Aggiungi»: nel widget, in Sistema o in entrambi.
- **D-H7**: estensione del proxy ai flussi e registro lato server (ADR-0015).
- **D-H8**: ZBBridge-P. Riflash sì o no (consigliato: no, solo scheda informativa).
- **D-H9**: guida AP manuale ora e automatica con l'app nativa; HTTPS sul banco.
- **D-H10**: hub cloud ammessi o esclusi.
- **D-H11**: app Companion dell'installatore e HA raggiungibile in LAN, rispetto alla chiusura prevista da ADR-0009.
- **D-H12**: kiosk (REQ-15) e uscita verso le impostazioni Android per l'installatore.

## Domande per l'utente

1. «Acasystem come bridge»: radio dentro o accanto al server di Acasystem, oppure esporre la casa ad Apple, Google o Alexa? Esiste o esisterà un «box Acasystem» con un hardware definito?
2. Quale Sonoff hai esattamente? Il modello è sull'etichetta: ZBBridge-P, PR2 o U. Ci sono già dispositivi abbinati in eWeLink da conservare? Con il riflash andrebbero riabbinati tutti.
3. In produzione Acasystem e HA gireranno su un mini-PC Linux? Il banco può essere collegato via cavo, o serve un host Linux di prova?
4. Quali protocolli servono nel primo impianto: Zigbee e Wi-Fi, oppure anche Z-Wave e Matter/Thread?
5. Chi usa «Aggiungi», e come apre e chiude l'installatore la sessione sul tablet a muro (REQ-06)?
6. «Aggiungi» deve stare solo nel widget Hub o anche nella pagina Sistema?
7. Per l'AP basta per ora una guida passo passo, o il collegamento automatico è indispensabile (app nativa)? Il tablet sarà in kiosk?
8. La casa ha una rete Wi-Fi a 2,4 GHz?
9. L'installatore può usare l'app Companion di HA sul proprio telefono, con HA raggiungibile in LAN durante il setup?
10. Qual è il budget per hardware e dispositivi di prova, chi li acquista, e che priorità ha questa funzione rispetto al pilota?
11. Possiamo modificare l'HA del banco in T2?
12. Quali marche Wi-Fi coprire per prime nella guida AP?
13. Chi custodisce i backup con le chiavi di rete Zigbee e Z-Wave?

## Rischi

- **API interne**: verificate al tag solo in parte e senza garanzia di stabilità. Mitigazioni: versione fissata, test di contratto, ripiego verso l'interfaccia di HA.
- **Sicurezza**
  - Permit join: senza install code la chiave di rete viaggia protetta dalla link key nota (valutazione). Per questo servono finestra breve, chiusura automatica e solo sessione installatore.
  - Seriale su IP senza autenticazione: va tenuto su cavo, in LAN fidata.
  - Interfacce di Tasmota e SLZB: proteggerle con password.
  - AP Shelly aperto per impostazione predefinita, e possibili AP impostori con nomi simili.
  - Password Wi-Fi: mai salvata né scritta nei log. `matter/set_wifi_credentials` la consegna al server Matter.
  - Backup ZHA e chiavi S2 sono segreti: fuori da Git e cifrati.
  - Il tunnel WS non filtra i messaggi: la protezione reale è il ruolo di HA, più la sessione installatore di REQ-06.
- **Conformità e privacy**
  - eWeLink e Tuya sono cloud.
  - Riflash di apparecchi radio consegnati a clienti: RED e Regolamento delegato (UE) 2022/30, da verificare.
  - Licenze di Tasmota, Z2M, Mosquitto e matterjs-server.
  - Scansione della rete (ISSUE-049).
- **Piattaforma**
  - Container senza add-on: Mosquitto, Z2M, Z-Wave JS UI e Matter sono servizi a mano.
  - Matter è «a proprio rischio».
  - Thread in container è sconsigliato.
  - mDNS e IPv6 richiedono la rete host.
- **Banco**
  - Windows, Wi-Fi e IP variabile: niente USB nel container, probabilmente niente mDNS, seriale su IP via Wi-Fi.
  - HTTP: niente service worker, Web Bluetooth o fotocamera.
  - Rischio di dichiarare «fatto» ciò che non è provato.
- **ZBBridge-P**: garanzia, possibile blocco del dispositivo, riabbinamento totale, percorso Wi-Fi sconsigliato.
- **Accessibilità**: telefono, QR, pulsanti fisici, cambio di rete e finestre di 3 minuti sono difficili a 65 anni.
- **Tablet**: quando è fuori rete il WebSocket cade; la scheda può ricaricarsi (4 GB); il kiosk può bloccare le impostazioni; limiti GPU già noti.
- **Fonti**: le schede ufficiali Sonoff non si sono caricate; Shelly è letto da un riepilogo di ricerca; restano da approfondire Aqara, Supervised e `zwave_js` al tag.

## Avanzamento e modifiche

Solo ricerca, sintesi e revisione critica. Nessun file di codice o di documentazione modificato. Nessuna chiamata a HA, al banco o al tablet.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Evidenza e limiti |
|---|---|---|---|
| Lettura del repository | Read, Grep e `git rev-parse` in sola lettura | Superato | Commit `7298d4d`; `main.tsx` (registrazione sw.js), `infrastructure.md` (banco Wi-Fi e HTTP), `product.md` (REQ-06, REQ-15) |
| API al tag 2026.9.4 | WebFetch dei sorgenti `core/2026.9.4`: config_entries, zha (websocket_api, config_flow, manifest), matter api | Superato, in parte | `zwave_js` non verificato; SHA del tag non annotato |
| Fonti esterne | WebFetch e WebSearch, 2026-10-21 | Superato con limiti | Sonoff ufficiale non caricata; Shelly e certificati CSA da riepiloghi di ricerca |
| Prove su HA, banco e tablet | — | Non eseguito | Escluse dall'incarico |

## Controllo del diff e decisioni

Nessun diff prodotto. Nessun ADR, REQ o ISSUE creato; sono soltanto proposti, con numeri da riverificare.

## Chiusura e punto di ripresa

Piano proposto. **Prossimo passo:** le risposte dell'utente (T0), poi la verifica residua T1 (sola lettura), poi la bozza di ADR-0015 (T0b). Hardware, modifiche all'HA del banco e implementazione richiedono autorizzazioni esplicite. Al salvataggio vanno aggiornati l'indice dei report e project-status.md, rispettando il lavoro concorrente.

## Rettifiche successive

Nessuna dopo il salvataggio. Prima del salvataggio la revisione critica del 2026-10-21 ha corretto la bozza:
- ZHA a rete singola, ora verificato;
- API verificate al tag;
- ZBBridge-P solo Wi-Fi e riabbinamento dei dispositivi;
- service worker, Web Bluetooth e fotocamera richiedono HTTPS;
- banco in Wi-Fi;
- REQ-06 e REQ-15;
- registro delle azioni con il tunnel WS;
- costi;
- tappe riordinate e divise;
- nuove decisioni D-H11 e D-H12 e nuove domande.

**Annotazione del 2026-10-23 (Claude Code, Sonnet 5.5, `claude-sonnet-5-5`), senza modificare quanto sopra:** il numero REQ-18, che questo report proponeva di riservare ai nuovi requisiti di hub e bridge, non era stato creato in `product.md` ed è stato assegnato al requisito sulla configurazione dei dispositivi da Acasystem (decisione D-D22, [REP-20261023-003](REP-20261023-003-piano-aggiungi-dispositivi.md), sezione «Decisioni D-D22 e D-D23 e avvio di D1»). Gli eventuali requisiti di hub e bridge prenderanno il primo numero libero al momento della loro creazione, dal REQ-19.
