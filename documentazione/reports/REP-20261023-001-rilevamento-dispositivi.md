# REP-20261023-001 — Diagnosi: perché Acasystem non rileva alcun dispositivo (TV LG in ufficio)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261023-001: diagnosi in sola lettura del mancato rilevamento di dispositivi, in particolare del TV LG dell'ufficio, e dei widget colpiti. |
| Stato | **Diagnosi completata, nessuna modifica.** Nessun incarico di correzione è autorizzato. |
| Data | 2026-10-23 (Europe/Rome), prove tra le 09:40 e le 10:00 circa |
| Autore / modello | Claude Code (Sonnet 5.5, `claude-sonnet-5-5`) |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` (`master`); l'albero ha molte modifiche non committate di altri incarichi, lasciate intatte. Nessun commit eseguito. |
| Richiesta di riferimento | Utente, 2026-10-23: «non riesco a rilevare alcun dispositivo sull'app seppure in ufficio sia presente un televisore smart di LG che è connesso alla stessa rete, il mio titolare dal suo Smart Home predefinito dal pc riesce ad accenderlo e metterlo direttamente su Netflix, ma l'app Acasystem non riesce ancora, va capito il perché, e se il problema di collegamento affligge tutti i widget» |
| Autorizzazione | Solo lettura e prove non invasive. Vietato: modifiche a codice, Home Assistant (integrazioni, entità, helper, riavvii), Docker, rete o tablet; credenziali e token; comandi ai dispositivi reali (accensione, spegnimento, app, abbinamento); terminare processi altrui; commit. |

## Risposta breve

1. **Acasystem non ha alcun rilevamento di rete proprio.** Il foglio «Collega» di un widget elenca soltanto le entità che Home Assistant (HA) pubblica nella connessione WebSocket. Se HA non ha un'entità per il TV, Acasystem non può mostrarlo.
2. **HA non ha alcun dispositivo reale.** Il registro contiene 18 entità: Sole (`sun`), Backup, Persona, Lista della spesa, Google Translate (voce) e Meteo (`met`). Nessun `media_player`, `remote`, `light`, `climate`, `cover`, `lock`, `camera`, `calendar`. Nessuna integrazione LG webOS.
3. **HA non vede nemmeno la rete dell'ufficio.** Il container `homeassistant` gira in rete `bridge` di Docker Desktop (`172.17.0.2/16`, unico vicino `172.17.0.1`), dietro il NAT della macchina virtuale WSL2: non è sulla LAN `192.168.1.0/24` e la scoperta automatica (SSDP, mDNS, DHCP) e il Wake-on-LAN broadcast non arrivano dove sono i TV. La scoperta automatica non ha quindi mai potuto proporre il TV.
4. **I TV ci sono e rispondono.** Dal PC (stessa rete, `192.168.1.7`, SSID «MeMo Repeater 5 Ghz») ho trovato **due TV LG webOS** con mDNS, entrambi con le porte webOS `3000` e `3001` aperte: `192.168.1.26` («[LG] webOS TV UA751C0LA») e `192.168.1.18` («[LG] webOS TV NANO81T6A»). Non so quale sia quello del titolare.
5. **Il problema di collegamento non è per widget: è a monte e li colpisce quasi tutti.** Oggi sono collegabili con un dispositivo reale 0 tipi su 20. Collegabili solo a entità di servizio (sole, backup, meteo di prova, lista della spesa): Sensori, Costi, Auto, Meteo, Attività; la Stanza elenca 3 aree vuote.

## Obiettivo e perimetro

Rispondere con prove a quattro domande: origine dei «dispositivi rilevati» del foglio «Collega»; stato di HA senza credenziali; rete del PC e del TV; conclusione con opzioni, e tabella dei widget colpiti. Collegamenti: ADR-0009 (HA dietro Acasystem), REP-20261021-001 (piano hub e bridge, proposto, non autorizzato), `infrastructure.md`. Nessuna modifica a codice, HA, Docker, rete, tablet.

## Criteri di completamento

- Elenco delle query e dei filtri che producono i candidati, da codice: fatto (sezione 1).
- Stato di HA da `docker inspect`, registri e log: fatto (sezione 2).
- Rete del PC, ricerca del TV senza comandarlo, raggiungibilità dal container: fatto, con i limiti dichiarati (sezione 3).
- Conclusione, opzioni con pro e contro, autorizzazioni, tabella widget: fatto (sezioni 4 e 5).

## 1. Da dove vengono i «dispositivi rilevati»

**Percorso dei dati (codice, commit di partenza con modifiche locali non committate).**

- `frontend/src/hooks/context/HomeAssistantContext.tsx`: apre la connessione WebSocket (`createConnection`) tramite il proxy `/ha` di Acasystem e si iscrive a `subscribeEntities`. Il risultato è la mappa `entities` e il flag `entitiesLoaded`. In parallelo legge i registri `config/device_registry/list` e `config/entity_registry/list` solo per arricchire le entità (area, dispositivo), non per aggiungerne.
- `hooks/launcher/useHomeAssistantRuntime.ts` passa `entities` ai widget come `WidgetRuntime`.
- `templates/sheets/CategoryBindingSection.tsx` (sezione «Dispositivo» del foglio): per ogni tipo costruisce la lista di id con `candidateEntityIds(tipo, entities, …)` (`templates/sheets/catalog.ts`) e la mostra con `EntitySelect`. Eccezioni: `todo` = id che iniziano per `todo.`; `car` = `sensor.` e `input_number.`; `room` usa `RoomPicker`, che chiama `config/area_registry/list` e poi `getEntitiesForArea` (registri entità e dispositivi, escluse entità disabilitate o nascoste).
- Se la lista è vuota il foglio mostra «Nessuna entità adatta in Home Assistant.»; finché `entitiesLoaded` è falso mostra «Attendo i dispositivi di Home Assistant.»
- **Nessun rilevamento di rete proprio.** Ricerca nel backend e nel frontend (esclusi i test) di `ssdp`, `mdns`, `zeroconf`, `bonjour`, `webos`, `wake-on-lan`, `dgram`, `nmap`, `discover`: nessuna scansione. Le sole occorrenze sono il testo «Netflix» nelle anteprime e nei loghi, e la «discovery» delle entità correlate dell'aspirapolvere (registri HA). Il backend è solo un proxy autenticato verso `TUNET_INTERNAL_HA_URL` (`http://host.docker.internal:8123`) più impostazioni, profili, icone e Casa 3D.

**Domini accettati per tipo** (da `candidateEntityIds` e `BINDING_KEYS`): vedi tabella della sezione 5.

**Il TV nell'app.** I tipi «Android TV» e «Apple TV» usano il filtro `tv`, cioè qualunque `media_player.*`; i dettagli (`components/widgets/media/widgets/TvDetails.tsx`) usano `media_player.select_source` per le app e il pulsante di alimentazione. Quindi un TV LG webOS, una volta presente in HA come `media_player.*`, si collegherebbe con il tipo «Android TV» o «Multimedia». Nota: oggi non esiste un tipo «LG webOS» né uno «Smart TV» generico (non è una funzione approvata: va in proposta, non è stata toccata).

## 2. Stato di Home Assistant (senza credenziali)

Prove grezze in `backup/diagnosi-dispositivi/` (esclusa da Git).

- **Container** `homeassistant`: immagine `ghcr.io/home-assistant/home-assistant:stable`, **Home Assistant 2026.9.4**, avviato il 2026-10-15; `NetworkMode=bridge`, non privilegiato, porta `8123/tcp` pubblicata su `0.0.0.0` e `[::]`; volume `bind /mnt/c/homeassistant/config → /config` (`C:\homeassistant\config`); nessun add-on (HA Container).
- **Rete nel container** (`ip addr`, `ip route`, `ip neigh`, sola lettura): unica interfaccia `eth0` `172.17.0.2/16` (`BROADCAST,MULTICAST,UP`), rotta `172.17.0.0/16` e default via `172.17.0.1`; vicini noti: solo `172.17.0.1`. `ip route get 192.168.1.26` risponde «via 172.17.0.1» (nessun pacchetto inviato). Docker Desktop 4.94.0, Docker 29.8.2, kernel WSL2 6.18.54.1. In `settings-store.json` di Docker Desktop **non** compare la rete host (`HostNetworkingEnabled` assente = predefinito disattivo). Non esiste `~/.wslconfig`, quindi WSL2 è in modalità NAT.
- **Configurazione** (`configuration.yaml`): `default_config:` presente, quindi `ssdp`, `zeroconf`, `dhcp`, `usb`, `bluetooth` sono caricati: HA *tenta* la scoperta, ma dalla rete sbagliata.
- **Integrazioni** (`core.config_entries`, solo dominio, titolo, origine, disabilitazione; lo stato non è nel file): `sun` (import), `analytics`, `go2rtc`, `backup` (system), `shopping_list`, `met` («Home»), `google_translate`, `radio_browser` (onboarding). Nessuna disabilitata. **Nessuna integrazione reale: nessun `webostv`.** Non ho letto, stampato né salvato campi `data` o `options`.
- **Registro entità** (`core.entity_registry`, ultima modifica 2026-10-07): 18 entità. Per dominio: `sensor` 12, `binary_sensor` 1, `event` 1, `person` 1, `todo` 1, `tts` 1, `weather` 1. Per piattaforma: `sun` 9, `backup` 5, `person` 1, `shopping_list` 1, `google_translate` 1, `met` 1. Disabilitate: 3 (`binary_sensor.sun_solar_rising`, `sensor.sun_solar_elevation`, `sensor.sun_solar_azimuth`). Nessun `media_player` né `remote`.
- **Registro dispositivi**: 4 (Home Assistant Backup, Google Translate TTS, Met.no Forecast, uno senza produttore). **Aree**: Soggiorno, Cucina, Camera da letto, **tutte senza dispositivi né entità**.
- **Log** (`docker logs --since 72h`, 7 righe; l'intero log del container 335 righe, filtrato per token/password): nessuna riga su `discovery`, `ssdp`, `zeroconf`, `dhcp`, `webostv`, `network`. Solo errori di `metno` (`ClientConnectorDNSError`/`TimeoutError` il 2026-10-20 e 21), un timeout di `homeassistant_alerts` e avvisi `http.ban` per autenticazione non valida da `172.17.0.1`. **Limite:** HA registra a livello WARNING, quindi l'assenza di righe sulla scoperta non prova né esclude che sia stata tentata.
- **Stato dei servizi ora:** Acasystem `/api/health` → `{"status":"ok","version":"0.9.26"}`; HA `/api/` → 401 (atteso senza credenziali), `/` → 200. La catena app → HA è quindi viva: il problema non è la connessione, è che HA non ha nulla da offrire.

## 3. Rete e ricerca del TV

- **PC ora:** Wi-Fi collegato a **«MeMo Repeater 5 Ghz»**, IPv4 `192.168.1.7/24`, gateway `192.168.1.1`, profilo di rete Pubblico. Altre schede: `172.23.160.1` (WSL/Hyper-V), `192.168.56.1`.
- **SSDP** (M-SEARCH `ssdp:all`, MX 2, 3 invii, dal PC su `192.168.1.7`): 3 host, nessun TV LG. `192.168.1.1` (router, WPS), `192.168.1.4` (FRITZ!Repeater 3000 AX, il ripetitore), `192.168.1.2` (un dispositivo Android/Fire TV con servizio Netflix MDX e DIAL: probabilmente un **Fire TV**). Una ricerca mirata a `urn:lge-com:service:webos-second-screen:1` (quella che usa HA per `webostv`) **non ha avuto risposta da nessuno**.
- **mDNS** (enumerazione `_services._dns-sd._udp` e interrogazione dei tipi trovati): **due TV LG webOS**. `192.168.1.26`: «[LG] webOS TV UA751C0LA» (AirPlay porta 7000, Google Cast «65UA751C0LA»). `192.168.1.18`: «[LG] webOS TV NANO81T6A» (AirPlay porta 7000). Rispondono anche una stampante Pantum (`.38`), il Fire TV (`.2`, anche Matter), due telefoni Android, tre dispositivi Spotify Connect e un MacBook.
- **ARP:** `.26` e `.18` raggiungibili; vicini visibili `.1`, `.2`, `.4`, `.18`, `.26`, `.38`.
- **TCP di prova** (una connessione per porta, chiusa subito, nessun dato inviato): `192.168.1.26:3000` e `:3001` aperte; `192.168.1.18:3000` e `:3001` aperte. Ho provato entrambi i TV perché non so quale sia quello del titolare; non ho inviato comandi, né abbinamento. Interpretazione: il servizio di controllo webOS è attivo su entrambi (le porte sono quelle di `aiowebostv`).
- **Dal container HA:** nessuna interfaccia sulla LAN, rotta verso la LAN attraverso il gateway NAT `172.17.0.1`. Dedotto, non provato: i pacchetti multicast SSDP (`239.255.255.250`) e mDNS (`224.0.0.251`) inviati o ascoltati sul bridge `docker0` non attraversano il NAT verso `192.168.1.0/24`, né arrivano risposte; un broadcast Wake-on-LAN verso `255.255.255.255` o `172.17.255.255` resta nel bridge. Il traffico TCP unicast in uscita verso il TV passa per il NAT di Docker Desktop e di norma funziona: **non l'ho provato dal container** perché avrebbe superato il limite di una connessione di prova al TV.
- **Indirizzo del PC e porta di Acasystem:** `compose.tunet.yaml` pubblica `192.168.1.27:3002`, ma l'IP attuale è `192.168.1.7`; `curl` verso `192.168.1.7:3002` e `192.168.1.27:3002` non risponde (solo `127.0.0.1:3002` e `localhost`). Un tablet in ufficio con l'indirizzo LAN del PC non raggiungerebbe l'app finché il compose non è aggiornato: è un problema distinto dal rilevamento, non corretto qui.

## 4. Conclusione

**Perché il TV non compare.** Tre cause in cascata, verificate:

1. Acasystem mostra solo entità di HA e non ha un proprio rilevamento (codice).
2. HA non ha l'integrazione LG webOS TV né altri dispositivi reali (registri).
3. HA, in `bridge` su Docker Desktop, non sta sulla LAN dell'ufficio; la scoperta automatica non ha mai potuto vedere il TV (rete del container).

**Aggravante non risolta dalla rete host:** neanche dal PC, sulla LAN, il TV risponde alla ricerca SSDP `webos-second-screen` (a differenza di mDNS e TCP 3000/3001). Può dipendere dall'impostazione «LG Connect Apps» (o «App mobile») disattivata o dal TV in standby; non ho potuto verificarlo senza toccare il TV. Quindi anche una rete host non garantirebbe la proposta automatica del TV.

**Perché il titolare riesce.** Il suo «Smart Home predefinito dal PC» (non so quale applicazione sia: LG ThinQ, Alexa o Google Home sono ipotesi) vive sulla LAN reale o passa dal cloud del produttore. Non è confrontabile con HA nel container.

**Cosa servirebbe perché compaia, si accenda e apra Netflix** (HA Container 2026.9.4):

- integrazione **LG webOS TV** aggiunta a mano per IP; sul TV: «LG Connect Apps» attivo e conferma della richiesta di abbinamento; da HA poi `media_player.select_source` con «Netflix» (elenco `source_list`); per l'accensione l'integrazione espone solo il trigger `webostv.turn_on`: serve un'azione che accende il TV, di norma Wake-on-LAN (TV collegato via cavo, «Wake on LAN» nelle impostazioni IP del TV) (fonte: https://www.home-assistant.io/integrations/webostv/, consultata il 2026-10-23);
- un tipo di widget che usi quell'entità (l'attuale «Android TV»/«Multimedia» la elenca; la presenza di Netflix nei dettagli dipende da `source_list`).

**Opzioni, pro e contro** (non applicate, tutte richiedono autorizzazione):

| Opzione | Pro | Contro e rischi | Cosa autorizza l'utente |
|---|---|---|---|
| A. Aggiunta manuale dell'integrazione per IP (`192.168.1.26` o `.18`) e abbinamento sul TV | Nessun cambio di rete; porte 3000/3001 raggiungibili dal PC; passa da una modifica che HA già prevede | Il TV deve avere un IP fisso (prenotazione DHCP sul router); unicast dal container non provato; spento il TV risulta non disponibile; spegne e basta, non accende | Modifica di HA del banco (nuova integrazione, nuove entità); abbinamento fisico sul TV; quale dei due TV; il PC in ufficio |
| B. A + Wake-on-LAN (integrazione `wake_on_lan` con il MAC del TV, azione per `webostv.turn_on`) | Dà l'accensione | Il broadcast dal bridge Docker non esce sulla LAN; si può provare l'indirizzo broadcast `192.168.1.255`, ma l'esito su Docker Desktop **non è verificato**; spesso richiede il TV via cavo o l'accensione via Wi-Fi attiva | Come A, più un'automazione/helper in HA; impostazione sul TV |
| C. Rete host di Docker Desktop (4.34+, impostazione «Enable host networking», accesso all'account Docker) | Un'unica impostazione | La documentazione dice che funziona a livello 4 (TCP/UDP) e non cita il multicast; il container non può legare gli IP del PC; la documentazione di HA Container sconsiglia Docker Desktop; cambierebbe la pubblicazione delle porte e `host.docker.internal`; scoperta non garantita (vedi aggravante) | Modifica di Docker Desktop, riavvio del container HA e di Acasystem (copia a freddo prima) |
| D. WSL2 in modalità mirrored (`networkingMode=mirrored` in `.wslconfig`, Windows 11 22H2+; elenca il supporto multicast) | In teoria ripristina multicast e vicinanza alla LAN | Non verificato che valga per la macchina `docker-desktop`; riavvio di WSL2 e di tutti i container; regole del firewall Hyper-V; effetti su tutta la macchina (fonte: https://learn.microsoft.com/windows/wsl/networking, consultata il 2026-10-23) | Modifica di impostazioni di sistema: richiede autorizzazione esplicita |
| E. Host Linux per HA (mini-PC o cavo di rete), con rete host nativa | È la configurazione supportata da HA e quella prevista dal piano hub/bridge (REQ-00, REP-20261021-001) | Hardware e lavoro di migrazione; fuori dal banco attuale | Decisione di prodotto (D-H3 e correlate del piano) |
| F. Integrazione cloud del produttore | Non dipende dalla rete | Richiede l'account dell'utente (credenziali inserite da lui); dipendenza dal cloud | L'utente inserisce lui le credenziali |

**Raccomandazione (valutazione).** Per il collaudo in ufficio A (con B se serve l'accensione) è il passo più piccolo; per un prodotto affidabile serve E, come già indicato dal piano hub/bridge. Prima chiedere quale TV è quello giusto e se «LG Connect Apps» è attivo.

## 5. Widget colpiti

«Oggi» = entità abilitate nel registro di HA (18 meno 3 disabilitate = 15 abilitate; esistono inoltre entità non nel registro come `sun.sun`, `zone.home`, `conversation.home_assistant`, che non hanno un tipo di widget). Le entità elencate sono quelle di servizio, non dispositivi reali.

| Tipo di widget | Chiave | Domini accettati | Entità disponibili oggi | Collegabile oggi |
|---|---|---|---|---|
| Sensori e comandi | `entityId` | `sensor`, `script`, `scene`, `input_number`, `input_boolean`, `binary_sensor`, `switch`, `light`, `climate`, `button`, `input_button`, `automation`, `select`, `input_select` | 10 `sensor` (6 del Sole, 4 del Backup) | Sì, solo a sensori di servizio |
| Luci | `bindingEntityId` | `light` | 0 | No |
| Serrature | `lockId` | `lock` | 0 | No |
| Aspirapolvere | `bindingEntityId` | `vacuum` | 0 | No |
| Tagliaerba | `bindingEntityId` | `lawn_mower` | 0 | No |
| Ventilatori | `bindingEntityId` | `fan` | 0 | No |
| Videocamere | `cameraId` | `camera` | 0 | No |
| Clima | `climateId` | `climate` | 0 | No |
| Tapparelle | `coverId` | `cover` | 0 | No |
| Allarme | `alarmId` | `alarm_control_panel` | 0 | No |
| Android TV / Apple TV | `mediaPlayerId` | `media_player` | 0 | **No (il TV LG sarebbe qui)** |
| Multimedia | `mediaIds` | `media_player` | 0 | No |
| Sonos | `mediaIds` | `media_player` riconosciuti come Sonos | 0 | No |
| Meteo | `weatherId` | `weather` | `weather.forecast_casa` (`met`, con errori DNS intermittenti) | Sì |
| Calendario | `calendars` | `calendar` | 0 | No |
| Attività | `todoEntityId` | `todo` | `todo.shopping_list` | Sì |
| Costi | `todayId` | `sensor`, `input_number` | gli stessi 10 sensori (senza senso come costi) | Tecnicamente sì |
| Nordpool | `nordpoolId` | `sensor` con «nordpool» nell'id | 0 | No |
| Stanze | `areaId` | aree HA (`config/area_registry/list`) e relative entità | 3 aree (Soggiorno, Cucina, Camera da letto), 0 entità | Sì per l'area, ma la stanza nasce vuota |
| Auto | `batteryId` | `sensor`, `input_number` | gli stessi 10 sensori | Tecnicamente sì |
| Orologio, Data, Meteo di casa, Separatore | nessuna | nessuno (non usano entità; il meteo di casa usa la posizione di HA) | n/d | Non serve collegarli |

**Risposta alla domanda «affligge tutti i widget».** Sì per quasi tutti, ma non è un difetto del widget o del foglio «Collega»: i widget funzionano come progettato. Sono vuoti perché HA non ha dispositivi. Ogni dispositivo reale (luci, clima, serrature, telecamere, ecc.) dovrà essere aggiunto a HA con la propria integrazione, e per i dispositivi che HA scopre da solo vale lo stesso problema di rete del TV (SSDP, mDNS, DHCP non raggiungono la LAN).

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Lettura codice del foglio «Collega» e filtri | Lettura di `CategoryBindingSection.tsx`, `catalog.ts`, `categoryPages.ts`, `RoomPicker.tsx`, `HomeAssistantContext.tsx`, `haClient.ts`; ricerca di funzioni di rete | Eseguito | Nessun rilevamento di rete nel codice. |
| Stato del container HA | `docker ps`, `docker inspect homeassistant`, `docker network inspect bridge`, `docker exec` con `ip addr`, `ip route`, `ip neigh`, `ip route get`, `cat` dei manifest | Eseguito | `inspect-homeassistant.txt`, `docker-rete.txt`, `ha-container-rete-e-manifest.txt`. |
| Conteggi di registri | Script Node di sola lettura su `core.entity_registry`, `core.device_registry`, `core.area_registry`, `core.config_entries` (solo campi consentiti) | Eseguito | `registri-conteggi.json`, `entity-ids-registro.txt`, `aree-conteggi.txt`. Il registro è del 2026-10-07: entità create dopo e non ancora scritte su disco non sono visibili. |
| Log HA | `docker logs` e `home-assistant.log`, filtrati per parole chiave e senza righe con token/password | Eseguito | `ha-log-72h-filtrato.txt`. Log a livello WARNING: l'assenza di righe sulla scoperta non è una prova. |
| Rete del PC | `netsh wlan show interfaces`, `Get-NetIPAddress`, `Get-NetConnectionProfile`, `Get-NetRoute`, `Get-NetNeighbor` | Eseguito | `rete-pc.txt`, `arp-wifi.txt`. |
| SSDP dal PC | M-SEARCH `ssdp:all` e mirati (script Node con `dgram`) | Eseguito | `ssdp-ssdp-all.txt`, `ssdp-mirati.txt`: nessun TV LG; il TV non risponde a `webos-second-screen`. |
| mDNS dal PC | Interrogazione `_services._dns-sd._udp.local` e tipi trovati | Eseguito | `mdns.txt`: due TV LG webOS. |
| TCP 3000/3001 dei due TV | Una connessione per porta, chiusa subito, senza dati | Eseguito | `tcp-3000-3001.txt`: tutte aperte. |
| Unicast TCP dal container HA al TV | — | **Non eseguito** | Per non superare il limite di una connessione di prova al TV; il passaggio dal NAT è dedotto. |
| Multicast e broadcast dal container verso la LAN | Ragionamento su interfaccia, rotte e NAT | **Non provato con pacchetti** | Deduzione dalla sola configurazione del container; nessun test di invio. |
| Raggiungibilità di Acasystem sulla LAN | `curl` a `192.168.1.7:3002` e `192.168.1.27:3002` | Eseguito | Nessuna risposta (solo `127.0.0.1:3002`). |
| Documentazione esterna | Pagine HA `webostv`, Docker host networking, Microsoft WSL networking, consultate il 2026-10-23 tramite lettura riassunta | Eseguito | Le affermazioni sono dai riassunti delle pagine; non ho verificato sul sorgente al tag 2026.9.4, salvo i file `webostv` letti nel container (manifest `ssdp` con `st` `urn:lge-com:service:webos-second-screen:1`, flusso manuale e abbinamento). |

Prove grezze non sensibili in `backup/diagnosi-dispositivi/`. Non ho letto, stampato né salvato credenziali, token, `data` o `options` di `core.config_entries`. I MAC e i nomi dei dispositivi altrui (telefoni, MacBook) sono rimasti nei file grezzi locali e non sono riportati qui; la tabella ARP e l'output mDNS contengono nomi di dispositivi di terzi e restano fuori da Git.

## Controllo del diff e decisioni

Nessuna modifica a codice, HA, Docker, rete o tablet. Aggiunti soltanto questo report, la voce in `reports/README.md` e i file grezzi in `backup/diagnosi-dispositivi/`. Nessun ADR creato o aggiornato. Nessun processo terminato. Nessun comando inviato ai TV: solo ricerca SSDP/mDNS e connessioni TCP chiuse subito (due porte per TV).

## Chiusura e punto di ripresa

- **Nessun incarico di correzione resta attivo.** Le opzioni A-F sono proposte, non autorizzate.
- **Proposte da registrare nel registro dei problemi se l'utente le vuole** (non applicate qui): rilevamento/indicazione nell'app del motivo per cui l'elenco è vuoto (HA senza dispositivi, rete); tipo di widget per Smart TV generici; aggiornamento di `compose.tunet.yaml` all'indirizzo LAN corrente.
- **Domande per l'utente:** (1) quale dei due TV (`.26`, 65" UA75; `.18` NANO81) è quello del titolare, e se uno dei due è collegato via cavo; (2) autorizza l'opzione A (e B)? (3) il PC resterà in ufficio sulla stessa rete durante la prova? (4) l'applicazione «Smart Home» del titolare quale è?
- **Prossimo passo se autorizzato:** copia a freddo del volume di HA, aggiunta di `webostv` per IP con abbinamento sul TV, prova del trigger di accensione, esiti in `verification.md`.

## Rettifiche successive

Nessuna.
