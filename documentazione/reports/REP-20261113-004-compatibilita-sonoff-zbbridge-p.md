# Compatibilità SONOFF Zigbee Bridge Pro con ACA

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261113-004 |
| Stato | Completato: valutazione documentale e dei sorgenti; hardware non collaudato |
| Data | 2026-11-13, Europe/Rome |
| Autore / modello | Codex; identificativo esatto del modello non disponibile |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta di riferimento | «verifica che sull'applicativo potremmo aggiungere questo dispositivo e quali sono i requisiti per farlo funzionare», con due fotografie della confezione SONOFF ZB Bridge-P. |
| Autorizzazione | Valutazione di compatibilità e requisiti; letture dei sorgenti e fonti primarie. Nessuna installazione, associazione, modifica firmware o aggiornamento del banco. |

## Obiettivo e perimetro

Identificare il modello dalle foto e distinguere l'uso del firmware originale eWeLink dall'uso come coordinatore locale tramite firmware alternativo. Confrontare i percorsi con le capacità effettive di Trova dispositivi e Gateway Zigbee nella .71.

Controllati `AGENTS.md`, Git, `project-status.md`, requisiti correnti e limiti del pilota. Git presenta 893 voci preesistenti all'avvio di questa verifica: conservarle senza commit, conversioni o pulizie. Il banco .71 e i suoi account/profili restano fuori dalle mutazioni.

## Criteri di completamento

- Identificazione ZB Bridge-P senza confonderlo con ZBBridge originale, ZBBridge-U/Ultra o dongle USB.
- Requisiti elettrici, rete e integrazioni documentati con fonti primarie consultate il 2026-11-13.
- Capacità ACA osservate nei sorgenti distinte dalla compatibilità dichiarata dai progetti esterni e dalle prove fisiche non eseguite.
- Nessuna dichiarazione di riconoscimento o funzionamento del singolo esemplare senza collaudo.

## Avanzamento e modifiche

Dalle foto e dalla scheda SONOFF: Zigbee Bridge Pro, modello ZB Bridge-P, alimentazione 5 V / 1 A, Wi-Fi 2,4 GHz e Zigbee 3.0. La confezione non dimostra quale firmware sia installato sull'esemplare. È un bridge, mentre HA e ACA continuano a funzionare sulla centrale.

### Percorso con firmware originale

Il componente comunitario **SonoffLAN**, da predisporre in HA tramite HACS o installazione manuale, documenta l'uso del firmware originale. Il suo `DEVICES.md` riporta esattamente `ZBBridge-P`, UIID 168, firmware osservato 3.0.0 e protocollo locale `zigbee_gateway`. Questo è un riferimento di compatibilità, non la prova che ogni firmware o sottodispositivo sia supportato. Il manifest consultato riporta versione SonoffLAN 3.13.3, dominio `sonoff`, `config_flow: true` e `iot_class: local_push`.

Servono alimentazione continua, Wi-Fi 2,4 GHz, configurazione eWeLink con account e accesso iniziale al cloud per elenco/chiavi, sottodispositivi compatibili, HA e ACA attivi e collegamento di rete funzionante. Il README documenta modalità `auto`, `local` e `cloud`; il controllo locale richiede multicast mDNS funzionante. La cache consente il funzionamento locale senza Internet per i dispositivi supportati già acquisiti, ma non autorizza a promettere indipendenza totale dal cloud per ogni apparecchio o funzione. L'autore raccomanda `auto` per i limiti di stabilità del protocollo locale.

In ACA i sottodispositivi esposti nei registri HA con normali entità e capacità possono usare Luci, Prese, Sensori e le altre famiglie compatibili. La gestione della rete del bridge originale **non è già coperta dal widget Gateway Zigbee**: tale widget legge solo le firme ZHA/Zigbee2MQTT. SonoffLAN non diventa ZHA soltanto perché il bridge parla Zigbee. PIN, pairing e installazione del componente non vengono saltati da Trova.

### Percorso coordinatore locale con firmware alternativo

Tasmota documenta il Pro come ESP32 + **Texas Instruments CC2652P / ZNP**, distinto dal vecchio ZBBridge ESP8266/EFR32/EZSP. La guida specifica collegata dalla documentazione Tasmota descrive firmware ESP32 dedicato, firmware coordinatore CC2652 e modalità ponte TCP per ZHA o Zigbee2MQTT. Sono necessari accesso alla scheda, programmatore seriale USB con livelli 3,3 V, collegamenti e competenza per flash/recupero; la guida specifica indica che la saldatura non è obbligatoria. Non basta collegare l'alimentazione micro-USB per ottenere questa conversione.

ZHA usa il protocollo ZNP; la guida documenta `socket://IP:8888`, 115200 baud e controllo di flusso software. Il percorso Zigbee2MQTT richiede anche il relativo servizio e un broker MQTT; non vanno confusi Zigbee2Tasmota e Zigbee2MQTT. IP stabile e collegamento locale affidabile sono prerequisiti pratici. ZHA e Zigbee2MQTT sconsigliano trasporti seriali su Wi-Fi per perdita pacchetti/latenza: il supporto tecnico non equivale a una raccomandazione di affidabilità. Firmware, backup e riassociazione dei dispositivi richiederebbero una valutazione separata prima di intervenire sull'esemplare.

### Riscontri nei sorgenti e nel banco

- `frontend/src/components/widgets/utilities/zigbee/zigbeeData.ts:13,132,163,215`: solo ZHA/Zigbee2MQTT e relativi identificatori; nessun adattatore SonoffLAN. `useZigbeeNetwork.ts:104` seleziona attualmente la prima rete riconosciuta.
- `frontend/src/utils/devices/classify.ts:231,354`, `components/widgets/utilities/discover/useConnectedDevices.ts:73` e `utils/devices/productBinding.ts:14,39`: classificazione per entità/capacità e associazione per esatto `device_id`; nessuna necessità di riconoscere il marchio per Luci/Prese. Questo non garantisce copertura di tutti i sottodispositivi.
- `backend/src/services/devices/discovered.ts:14,69` e `deviceService.ts:750,793`: ACA legge le scoperte/config flow disponibili in HA, senza installare componenti custom o effettuare una scansione radio universale.
- `components/widgets/utilities/zigbee/useZigbeeJoin.ts:112`: apertura/chiusura associazione ZHA o switch specifico Zigbee2MQTT; le azioni non si applicano automaticamente al bridge originale.
- Letture Docker selezionate dal revisore: ACA `0.9.71.99`; HA in rete `aca-tunet_default`, driver `bridge`, senza porte pubblicate. È un banco Container, non una prova HAOS. Per SonoffLAN il passaggio multicast è da collaudare; nessuna modifica alla rete eseguita. La versione Core esatta non è stata identificata dal tag `stable` e non viene inferita.

### Fonti primarie, consultate il 2026-11-13

- [SONOFF ZBBridge-P: scheda e requisiti](https://sonoff.tech/products/sonoff-zigbee-bridge-pro).
- [SonoffLAN README](https://github.com/AlexxIT/SonoffLAN), sezioni installazione, modalità e problemi LAN; [elenco dispositivi](https://github.com/AlexxIT/SonoffLAN/blob/master/DEVICES.md), riga ZBBridge-P; [manifest](https://github.com/AlexxIT/SonoffLAN/blob/master/custom_components/sonoff/manifest.json). Ramo `master` consultato, manifest 3.13.3; nessuna installazione o revisione immutabile acquisita.
- [Documentazione Tasmota Zigbee](https://tasmota.github.io/docs/Zigbee/), hardware Pro/ZNP e collegamento alla [guida specifica mantenuta nel catalogo di supporto](https://zigbee.blakadder.com/Sonoff_ZBBridge-P.html); [discussione del progetto Tasmota sul Pro](https://github.com/arendst/Tasmota/discussions/14419); [requisiti programmatore](https://tasmota.github.io/docs/Getting-Started/#serial-programmer).
- [ZHA: adattatori e limiti Wi-Fi](https://www.home-assistant.io/integrations/zha/); [Zigbee2MQTT: note sugli adattatori](https://www.zigbee2mqtt.io/guide/adapters/).
- [Guida SONOFF per HA](https://sonoff.tech/blogs/news/sonoff-device-integration-with-home-assistant-complete-guide): le strade Matter Bridge/MQTT native illustrate riguardano ZBBridge-U e NSPanel Pro; non attribuirle al modello P fotografato.

## Verifiche ed evidenze

| Controllo | Procedura e ambiente | Esito | Limiti |
|---|---|---|---|
| Identificazione | Foto e scheda ufficiale SONOFF | Superato | Firmware dell'esemplare sconosciuto |
| Compatibilità firmware originale | README, DEVICES e manifest SonoffLAN | Documentata dal progetto | Non è un collaudo di bridge/sottodispositivi reali |
| Compatibilità coordinatore alternativo | Documentazione Tasmota, ZHA e Zigbee2MQTT | Percorso documentato | Flash e stabilità Wi-Fi non provati |
| Capacità ACA | `rg` e letture mirate dei file sopra, revisione indipendente | Superato | Solo evidenza statica; gateway SonoffLAN assente |
| Banco | `docker ps` e campi immagine/rete selezionati in `docker inspect` | Rete bridge osservata | Non letti env, credenziali o storage; multicast non provato |
| Hardware / comandi / installazioni | Non eseguiti | Non eseguito | Non autorizzati dalla richiesta di verifica |

Nessuna suite di test o build eseguita: non è stato modificato codice applicativo.

## Controllo del diff e decisioni

Solo questo report, indice report e nota di stato pertinenti alla valutazione. Nessuna modifica a codice, configurazioni, dipendenze o dati. Nessuna nuova decisione implementativa o autorizzazione hardware inferita. Le 893 voci preesistenti restano preservate; nessun commit.

## Chiusura e punto di ripresa

Valutazione completata. È ragionevole provare per primo il firmware originale tramite SonoffLAN, prima di considerare una conversione: è una raccomandazione, non un incarico di installazione. Il collaudo successivo deve identificare firmware effettivo, un sottodispositivo concreto e la connettività del banco; poi verificare stato, comando esplicito e relativo widget. Gestione completa del bridge originale e conversione firmware restano fuori da questa consegna. Nessun incarico operativo aperto.

## Rettifiche successive

**2026-11-13, preparazione del passo successivo:** l'utente conferma che il bridge è ancora da configurare in eWeLink. Preflight aggiuntivo di sola lettura: metadata del pacchetto HA **2026.9.4**; cartelle `hacs`, `sonoff` e `sonofflan` assenti in `/config/custom_components`; rete Docker bridge confermata. Nessun contenuto di configurazione/credenziali letto, nessuna installazione o riavvio. La versione ora identificata integra il precedente limite «Core esatto non determinato» senza alterare l'evidenza storica. Il percorso proposto è configurazione eWeLink del bridge, un sottodispositivo di prova, predisposizione SonoffLAN e verifica rete, quindi associazione/widget ACA. HACS rimane un metodo opzionale, non un requisito obbligatorio di SonoffLAN.

**2026-11-13, modello specifico e limite locale — [REP005](REP-20261113-005-banco-sonofflan-trvzb.md):** l'utente conferma poi bridge configurato e termovalvola TRVZB già associata. La verifica sul tag v3.13.3 distingue il bridge dalla valvola: TRVZB/UIID7017 è indicata solo cloud; `can_local()` non abilita i figli dello ZBBridge-P. Le precedenti possibilità LAN generali non vanno lette come promessa di controllo locale della TRVZB. Componente successivamente installato sul banco con backup; stato e prova umana nel nuovo report, senza riscrivere l'esito di questa precedente verifica documentale.
