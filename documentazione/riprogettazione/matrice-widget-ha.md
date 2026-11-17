# Matrice di copertura: dispositivi HA e tipi ACA

Versione 13 — 2026-11-12. Decisione di riferimento: [ADR-0049](../decisions/ADR-0049-widget-prodotti-per-dispositivo.md). Attuazione e verifiche: [Luci REP013](../reports/REP-20261109-013-utilita-e-luci-per-dispositivo.md), [Prese REP001](../reports/REP-20261110-001-prese-interruttori-per-dispositivo.md), [Clima REP002](../reports/REP-20261110-002-clima-per-dispositivo.md) [Cover REP003](../reports/REP-20261110-003-tapparelle-tende-per-dispositivo.md) e [Fan REP004](../reports/REP-20261110-004-ventilatori-per-dispositivo.md).

Questa matrice serve a sviluppare **un widget completo per dispositivo**, una famiglia alla volta. Non converte ogni dominio HA in un prodotto fisico e non modifica il comportamento dei widget già salvati. Dopo Trova dispositivi, Tavano, percorso comune e **Luci** (REP013), il secondo lotto è **Prese e interruttori** ([REP001](../reports/REP-20261110-001-prese-interruttori-per-dispositivo.md),2026-11-10). Il terzo lotto è **Clima** ([REP002](../reports/REP-20261110-002-clima-per-dispositivo.md), 2026-11-10). Il quarto lotto è **Tapparelle, tende e veneziane** ([REP003](../reports/REP-20261110-003-tapparelle-tende-per-dispositivo.md), 2026-11-10). Il quinto lotto è **Ventilatori** ([REP004](../reports/REP-20261110-004-ventilatori-per-dispositivo.md), 2026-11-10). Il sesto, settimo e ottavo lotto sono **Serrature, Allarme e Videocamere**, assegnati in questo ordine ([REP001](../reports/REP-20261111-001-serrature-allarme-videocamere.md),2026-11-11). Il nono e decimo lotto sono **Aspirapolvere e Tagliaerba**, assegnati con «vai con area robot» ([REP002](../reports/REP-20261111-002-area-robot-aspirapolvere-tagliaerba.md),2026-11-11). L'area successiva assegnata è **Multimedia: Android TV, Apple TV, Sonos e lettori**, [REP003](../reports/REP-20261111-003-area-multimedia.md),2026-11-11. È assegnata ora **Area Sensori**, [REP004](../reports/REP-20261111-004-area-sensori.md),2026-11-11: attuazione verificata nella build locale .66, helper distinti dai prodotti fisici. È ora assegnata **Energia e consumi**, [REP005](../reports/REP-20261111-005-energia-consumi.md),2026-11-11: revisione in corso dei due tipi logici cost/nordpool, senza nuova famiglia fisica. Le altre famiglie mantengono i flussi attuali finché vengono verificate.

## Ultimo lotto locale .70

[REP002](../reports/REP-20261112-002-widget-rimanenti.md): Calendario/Attività, Stanze e Gateway Zigbee completano le aree residue richieste, dopo Meteo .69. Attuazione locale verificata:286 nuovi test dedicati e QA20/12/20 PASS sul pacchetto .70 esatto. È completata la revisione circoscritta dei widget, non la copertura integrale di tutti i domini dell'Excel. Appuntamenti in lettura, liste secondo capacità, aree con provenienza conservativa e rete ZHA/Z2M sui contratti esistenti; nessuna nuova DeviceFamily. Banco, hardware, provider e pubblicazione restano distinti.

## Fonte e significato dei dati

Fonte umana originale, conservata senza modifiche: `C:\Users\matti\Desktop\HomeAssistant_Integrazioni_2026-11-04.xlsx`,464735 byte, SHA-256 `fdba0aad8951557c992a7845b2825671316a76bb19c9f84feab14e79ba30cb9e`. Lettura documentale in memoria del 2026-11-09, senza risalvare il workbook.

- `Riepilogo!A2:C3`: il file dichiara origine `home-assistant/core`, ramo `dev`, commit `d5fc37f`, dati del 2026-11-04. Il ramo dev può contenere novità non presenti nell'ultima release; non è la dichiarazione della versione HA installata sul banco.
- `Riepilogo!A36:C38`: sono esclusi i singoli modelli e i dispositivi di una specifica installazione. Questi ultimi richiedono il registro HA (`config/device_registry/list`).
- `Tipi di dispositivo!A1:F46`:45 domini di entità, con sottotipi e conteggio dei servizi. Le righe sorgente sono riportate sotto.
- `Integrazioni!A1:O1443`:1442 integrazioni oltre l'intestazione. Marchio, tipo, connessione, protocolli, categorie e librerie descrivono le integrazioni: non sono un catalogo di modelli né una prova di compatibilità di ogni dispositivo.
- `Comandi!A1:H1132`: elenco dello snapshot, con dominio, comando, parametri e chiamata REST. Protocolli, categorie e gli altri fogli sono viste complementari; non definiscono un mapping runtime automatico.

L'Excel è una **reference versionata documentale**, non viene caricato dal frontend e non autorizza nuovi comandi o privilegi. La documentazione primaria dichiarata dal file è il [repository Home Assistant Core](https://github.com/home-assistant/core/tree/d5fc37f); in questa consegna non si verifica che lo snapshot dev sia uguale alla centrale in uso.

## Legenda e confini

| Voce | Significato |
|---|---|
| Prodotto | Un dispositivo HA con identità propria e funzioni compatibili raccolte in un widget. |
| Hub | Integrazione/centrale che può generare N dispositivi; non aggregare le loro entità come se fossero un unico apparecchio. |
| Helper | Entità logica o composizione della casa, non necessariamente legata a un dispositivo fisico. |
| Servizio | Funzione, fonte dati o motore applicativo; non implica un nuovo widget di prodotto. |
| Completo | Perimetro circoscritto del tipo/funzione dichiarato nella riga. Non significa tutti i parametri di tutti i servizi HA o compatibilità hardware universale. |
| Parziale | Esiste un percorso o componente pertinente, ma non copre tutta la semantica HA o non ha ancora la nuova aggregazione per dispositivo. |
| Da progettare | Non esiste un prodotto dedicato verificato in questo perimetro. Un eventuale rendering generico legacy non vale come copertura completa. |

**Due misure separate:** l'aggregazione di Luci per dispositivo è attuata nel nuovo contratto; la copertura dell'intero dominio HA `light` rimane parziale. `Comandi!A71:H73` elenca `light.toggle`, `light.turn_off`, `light.turn_on`, con parametri ulteriori come `flash`, `profile`, `white`, `rgbw_color`, `rgbww_color`. Il lotto non dichiara un'interfaccia per ciascuno di quei parametri. Espone potenza, luminosità, colore HS, temperatura del bianco, effetti e transizione quando supportati dal modello operativo corrente, insieme alle secondarie compatibili. Nuove funzioni richiedono specifica e prova della famiglia; niente capacità inventate da default grafici.

## I 45 domini del foglio e la copertura corrente

La classificazione di natura è una valutazione progettuale ACA, non una colonna o un'approvazione attribuita al workbook. Le righe possono condividere un widget, o descrivere funzioni dello stesso prodotto.

| Riga Excel | Dominio HA | Natura | Tipo/percorso ACA pertinente | Copertura HA | Confine osservato |
|---|---|---|---|---|---|
| 2 | `conversation` | Servizio | — | Da progettare | Nessun widget di prodotto dedicato; non equivale alla funzione AI ACA. |
| 3 | `update` | Funzione tecnica | Luci, come secondaria | Parziale | Stato leggibile per dispositivo associato; nessun update.install introdotto. |
| 4 | `image_processing` | Servizio | — | Da progettare | Analisi immagini distinta da una videocamera e dal suo stream. |
| 5 | `ai_task` | Servizio | — | Da progettare | Le attività HA non sono un prodotto fisico né un widget ACA corrente. |
| 6 | `calendar` | Servizio/lista | Calendario | Parziale | Revisione locale .70: fonti multiple, date/fusi/fine esclusiva e dettagli; lettura, non nuovo PIM. |
| 7 | `alarm_control_panel` | Prodotto/centrale | Allarme | Parziale | Aggregazione per dispositivo e zone, modalità HA supportate e codici transitori. Trigger e copertura di ogni integrazione non dichiarati; legacy conservato. |
| 8 | `tts` | Servizio | — | Da progettare | Sintesi vocale, non un nuovo prodotto fisico automatico. |
| 9 | `stt` | Servizio | — | Da progettare | Trascrizione vocale; nessun widget dedicato del catalogo28. |
| 10 | `datetime` | Helper o funzione configurativa | — | Da progettare | Nessuna associazione di prodotto dedicata; non equivale al widget Data. |
| 11 | `date` | Helper o funzione configurativa | — | Da progettare | Data impostabile HA distinta dalla visualizzazione Data ACA. |
| 12 | `event` | Funzione di dispositivo | Luci, come secondaria | Parziale | Lettura dello stato; nessuna sottoscrizione eventi o comando automatico nuovo. |
| 13 | `geo_location` | Servizio/dato geografico | — | Da progettare | Nessun prodotto dedicato; non confondere evento geografico e localizzatore. |
| 14 | `image` | Funzione/media | — | Da progettare | Un’immagine non è automaticamente una camera con stream o controlli. |
| 15 | `switch` | Prodotto o funzione/helper | Prese e interruttori; Sensori e comandi; secondarie Luci | Parziale | Lotto plug: uscite ordinarie dello stesso device_id, anche senza outlet; tecnica esclusa dai canali principali. Aggregazione e comandi singoli, non copertura di ogni prodotto dotato di switch. |
| 16 | `todo` | Servizio/lista | Attività | Parziale | Revisione locale .70: lista e mutazioni esistenti secondo capacità, ACK/stato distinti, nessuna nuova famiglia fisica. |
| 17 | `device_tracker` | Prodotto o dato di posizione | Auto, con associazioni dedicate | Parziale | Usi specifici e manuali; nessun risolutore universale di localizzatori. |
| 18 | `light` | Prodotto/canale | Luci | Parziale | Nuova aggregazione per dispositivo attuata nel lotto; parametri HA e compatibilità effettiva restano distinti. |
| 19 | `weather` | Servizio | Meteo; Meteo di casa | Parziale | Previsioni/fonte scelta o posizione della casa; non dispositivo fisico da duplicare. |
| 20 | `notify` | Servizio o funzione | — | Da progettare | Nessun widget di prodotto dedicato per le notifiche HA. |
| 21 | `time` | Helper o funzione configurativa | — | Da progettare | Ora impostabile distinta dall’Orologio ACA. |
| 22 | `button` | Funzione di dispositivo/helper | Sensori e comandi; secondarie Luci | Parziale | Pressione esplicita tracciata; identify/restart/update non sono tre prodotti nuovi. |
| 23 | `air_quality` | Prodotto o misura | — | Da progettare | Una misura AQI nel dominio sensor è già leggibile; il dominio air_quality non ha famiglia dedicata. |
| 24 | `wake_word` | Servizio | — | Da progettare | Motore della parola di attivazione, non una scheda fisica nuova. |
| 25 | `media_player` | Prodotto o servizio multimediale | Multimedia; Sonos; Android TV; Apple TV | Parziale | Prodotti tv/sonos/media v1 per dispositivo, canali e capacità effettive; gruppi espliciti preservati. REP003 .65, senza migrazione automatica. |
| 26 | `vacuum` | Prodotto | Aspirapolvere | Parziale | Aggregazione per device_id; feature/servizi effettivi, stanze HA mappate e mappe esplicite. Nessun send_command universale o garanzia di compatibilità completa. |
| 27 | `lawn_mower` | Prodotto | Tagliaerba | Parziale | Aggregazione per device_id, START1/PAUSE2/DOCK4/STOP8; zone/altezza non sono universali. Nessuna inferenza di carica/arrivo o certificazione hardware. |
| 28 | `assist_satellite` | Prodotto/terminale vocale | — | Da progettare | Nessun widget di prodotto dedicato nel catalogo corrente. |
| 29 | `water_heater` | Prodotto | — | Da progettare | Scaldacqua distinto da climate; non dichiarato coperto dal widget Clima. |
| 30 | `select` | Funzione di dispositivo/helper | Sensori e comandi; secondarie Luci | Parziale | Scelta esplicita tra opzioni disponibili, non aggregazione di ogni helper. |
| 31 | `scene` | Helper/servizio | Sensori e comandi | Parziale | Attivazione della scena; non copertura di tutti i servizi di gestione scene. |
| 32 | `binary_sensor` | Prodotto o funzione/helper | Sensori; secondarie delle famiglie di prodotto | Parziale | Lotto Sensori v1 attuato nella .66: canali ordinari dello stesso device_id, classi e stati osservati distinti da diagnostica; helper storici conservati. |
| 33 | `sensor` | Prodotto o funzione/helper | Sensori; Costi; Nordpool; Auto; secondarie delle famiglie di prodotto | Parziale | Lotto Sensori v1 attuato nella .66: letture/unità reali e cronologia del canale, senza soglie o conversioni inventate; priorità degli altri prodotti preservata. |
| 34 | `lock` | Prodotto | Serrature | Parziale | Aggregazione per dispositivo e accessi indipendenti, codici transitori e apertura solo supportata. Sblocco distinto da porta aperta; legacy conservato. |
| 35 | `siren` | Prodotto o funzione | — | Da progettare | Una sirena accessoria non rende automaticamente il dispositivo una centrale allarme. |
| 36 | `cover` | Prodotto/canale | Tapparelle, tende e veneziane | Parziale | Aggregazione per dispositivo attuata: Apri/Stop/Chiudi distinti, posizione e SET_TILT_POSITION secondo capacità e dati reali. Velocità e altri comandi tilt discreti non introdotti; vecchi widget conservati. |
| 37 | `remote` | Prodotto o funzione | Android TV; Apple TV | Parziale | Remote proprio o esplicitamente associato, capacità/adattatori TV preservati. REP003 .65; nessun telecomando universale o apprendimento nuovo. |
| 38 | `climate` | Prodotto | Clima | Parziale | Aggregazione per esatto dispositivo attuata; canali, obiettivo singolo/intervallo, modalità, ventola, preset, oscillazioni e umidità secondo dati e servizi HA. Legacy conservato; nessuna copertura implicita di water_heater, humidifier o di ogni parametro HA. |
| 39 | `text` | Helper o funzione configurativa | — | Da progettare | Testo impostabile senza widget dedicato; nessuna modifica automatica. |
| 40 | `infrared` | Hub/trasmettitore o funzione | — | Da progettare | Trasmettitore/ricevitore non equivale a un telecomando già associato. |
| 41 | `radio_frequency` | Hub/trasmettitore o funzione | — | Da progettare | Nessun apprendimento o invio radio introdotto dal catalogo. |
| 42 | `humidifier` | Prodotto | — | Da progettare | Umidificatore distinto da climate; nessuna copertura implicita. |
| 43 | `number` | Funzione di dispositivo/helper | Sensori e comandi; secondarie Luci | Parziale | Valore regolabile entro min/max/step dichiarati. |
| 44 | `valve` | Prodotto/canale | — | Da progettare | Valvole acqua/gas non vengono trasformate implicitamente in tapparelle. |
| 45 | `fan` | Prodotto/canale | Ventilatori | Parziale | Aggregazione per esatto dispositivo attuata nel lotto REP004: canali, on/off, velocità/passo, preset, oscillazione e direzione secondo dati e servizi effettivi. Legacy conservato; copertura hardware e di ogni parametro HA non dichiarata. |
| 46 | `camera` | Prodotto | Videocamere (beta) | Parziale | Nuova aggregazione per dispositivo, un canale video attivo, trasporto esistente e comandi condizionati. Percorso privato, PTZ ONVIF opt-in e destinatari cast associati; nessuna certificazione hardware. |

## I 29 tipi ACA: stato del prodotto e della transizione

Inventario da `frontend/src/domain/launcher/catalog.ts`, aggiornato nel lotto REP001 del2026-11-10. L'ordine di consultazione pone Trova dispositivi e Tavano ai primi due accessi; il raggruppamento visuale non modifica gli ID. Le **16 tipologie di prodotto** comprendono Luci, Prese e interruttori e le altre14 righe native/legacy; le13 rimanenti sono strumenti, hub, servizi, helper o layout. Il precedente inventario28 di REP013 rimane storico.

| Tipo ACA | Nome | Natura | Copertura del tipo attuale | Nuova aggregazione per dispositivo |
|---|---|---|---|---|
| `rileva` | Trova dispositivi | Strumento ACA | Parziale: ricerca/configurazione e percorso comune; limiti delle famiglie espliciti | Apre subito lo strumento; widget Home esistenti conservati, inserimento secondario |
| `tavano` | Tavano | Strumento ACA | Completo nel perimetro del registro corrente: giorni 0–6, pagine 30, dettagli, copia/export depurati | Apre subito lo strumento; nessun dispositivo HA associato |
| `sensor` | Sensori | Prodotto/helper | Parziale; lotto per dispositivo .66 verificato | Contratto v1 ed entityId, modalità Dispositivo / Helper e comandi; nessuna conversione dei widget storici, verifiche in REP004 |
| `light` | Luci | Prodotto multicanale | Parziale HA; aggregazione completa nel perimetro del primo lotto | Contratto versione1 e canali dello stesso device attuati; verifiche in REP013 |
| `plug` | Prese e interruttori | Prodotto multicanale | Parziale HA; uscite switch e misure effettive | Contratto versione1, Home sintetica e dettagli per uscita; verifiche e limiti nel REP001 del2026-11-10 |
| `lock` | Serrature | Prodotto | Aggregazione attuata; dominio HA parziale | Un device, canali lock ordinari e codice transitorio; conferme e legacy conservati |
| `vacuum` | Aspirapolvere | Prodotto | Aggregazione attuata; dominio HA parziale | Device esatto, canali, comandi effettivi e stanze da mapping HA; mappe/associazioni esplicite, legacy conservato |
| `mower` | Tagliaerba | Prodotto | Aggregazione attuata; dominio HA parziale | Device esatto, canali e quattro azioni native; zone/altezza solo se esposte o associate, legacy conservato |
| `fan` | Ventilatori | Prodotto multicanale | Parziale HA; controlli secondo capacità e servizi | Contratto versione 1, canali esatti e tecnica distinta; verifiche e limiti in REP004 |
| `camera` | Videocamere (beta) | Prodotto | Aggregazione attuata; dominio HA parziale | Un device, canali video alternativi e secondarie; trasporto esistente, hardware non certificato |
| `climate` | Clima | Prodotto | Aggregazione per dispositivo attuata; dominio HA parziale | Canali distinti e controlli effettivi; widget senza metadati conservano il flusso storico |
| `cover` | Tapparelle, tende e veneziane | Prodotto/canale | Aggregazione per dispositivo attuata; dominio HA parziale | Stato/target distinti, Stop indipendente e tecnica separata; legacy non migrato |
| `alarm` | Allarme | Prodotto/centrale | Aggregazione attuata; dominio HA parziale | Un device, zone indipendenti, modalità/codice HA; conferme e legacy conservati |
| `zigbee` | Gateway Zigbee | Hub | Parziale; revisione locale .70 degli strumenti ZHA/Z2M | Stato, membri e manutenzione distinti; hub non aggregato in prodotto, permessi invariati |
| `car` | Auto | Prodotto composto | Parziale, fonti manuali/native .68 completate e verificate localmente | Unica associazione con ACK, memoria, alias e comandi storici conservati; nessuna nuova famiglia fisica o risolutore universale, verifiche e limiti in REP006 |
| `androidtv` | Android TV | Prodotto | Parziale, player/telecomando e integrazione | Attuato localmente .65, copertura parziale; player/remote esatti o associazioni esplicite |
| `appletv` | Apple TV | Prodotto | Parziale, player/telecomando e integrazione | Attuato localmente .65, copertura parziale; sottotipo Apple conservato |
| `cost` | Energia e consumi | Helper/composizione di misure | Parziale; revisione .67 verificata localmente | Fonti esplicite powerId, consumptionId, todayId e monthId; basta una fonte. Nessun nuovo prodotto fisico o costo derivato |
| `media` | Multimedia | Prodotto o gruppo logico | Parziale, nativo/legacy | Attuato localmente .65, copertura parziale; gruppi storici conservati |
| `sonos` | Sonos | Prodotto o gruppo logico | Parziale, nativo/legacy | Attuato localmente .65, copertura parziale; gruppi e associazioni conservati |
| `weather` | Meteo | Servizio/fonte dati | Parziale, revisione locale .69 completata e verificata: fonte e sensore espliciti, previsioni native | Non prodotto fisico; associazione comune con riscontro, REP001 del 2026-11-12 |
| `calendar` | Calendario | Servizio/lista | Parziale; revisione locale .70 | Associazione multipla, giornate intere/fusi e letture protette; non prodotto fisico |
| `todo` | Attività | Servizio/lista | Parziale; revisione locale .70 | Comandi esistenti secondo capacità, lista autorevole e nessun replay offline |
| `nordpool` | Prezzo dell’energia | Servizio/helper | Parziale; revisione .67 verificata localmente | nordpoolId, capacità/unità reali e fasce con intervalli verificabili; non un prodotto fisico o una formula tariffaria |
| `room` | Stanze | Helper/area | Parziale; revisione locale .70 | Snapshot storici conservati; nuova provenienza area su conferma, ruoli e controlli distinti da device_id |
| `cover_clock` | Orologio | Helper locale | Completo nel perimetro dell'orologio ACA | Non coincide con HA time impostabile |
| `cover_calendar` | Data | Helper locale | Completo nel perimetro della data ACA | Non coincide con HA date/datetime impostabili |
| `cover_weather` | Meteo di casa | Servizio/fonte della casa | Parziale, revisione locale .69 completata e verificata: fonte automatica HA o override del widget | Non prodotto fisico; nessuna geolocalizzazione o nuova identità |
| `spacer` | Separatore | Layout | Completo nel perimetro spazio/linea | Nessuna entità, dispositivo o comando HA |

## Regole runtime del prodotto Luci

Il resolver legge device registry, entity registry e stati disponibili. `ProductDeviceBinding` versione1 contiene `deviceId`, famiglia, entità principale, canali, secondarie e classificazione tecnica opzionale. Solo `entity_registry.device_id === deviceId`, senza entità disabilitate o nascoste. Le proprietà `entity_category=diagnostic/config` alimentano la sezione tecnica: non si deducono dal nome Batteria, Segnale o simili.

- Canali: tutti i `light.*` del dispositivo. Un canale temporaneamente senza stato rimane distinto e non riceve uno stato inventato.
- Secondarie compatibili: `sensor`, `binary_sensor`, `switch`, `number`, `select`, `button`, `event`, `update`. Le ultime due sono letture in questo lotto; nessun `update.install` o abilitazione automatica.
- Misure d'uso, altre funzioni ordinarie e tecnica/manutenzione sono separate. Le associazioni multiple non producono nuovi widget per ciascuna entità.
- Attributi, `supported_color_modes`, `supported_features` e catalogo servizi determinano i controlli reali; la disponibilità dei servizi non certifica il permesso dell'utente. Il percorso dei comandi continua a usare token personale, uso del profilo e registro esistenti.
- Hub/config entry: si rileggono i registri dopo la configurazione, distinguendo N device. Non usare la sola config entry o `getRelatedEntityIds` senza il vincolo dell'esatto dispositivo.
- Esistenti: si derivano le destinazioni del profilo, comprese pile e segmenti. I duplicati storici non si fondono; il widget nascosto si apre senza cambiarne le regole. `widgetDeviceKey`, ID, disposizione, memoria e preferenze non subiscono migrazione globale.
- Il cambio manuale dell'entità principale rende inapplicabili i vecchi metadati di prodotto. La UI torna al comportamento compatibile e non impartisce comandi ai canali del vecchio dispositivo; nessuna pulizia automatica dei dati.

La configurazione in HA e la posizione ACA sono fasi distinte. Il seed associato usa il planner e il commit della .57: nessuna scrittura del profilo prima di Conferma, ID stabile e riscontro autorevole. Annullare la posizione non disinstalla un'integrazione HA già completata. Le famiglie non migrate conservano il percorso precedente; questa compatibilità non è una dichiarazione di aggregazione completa.

## Regole runtime del prodotto Clima

Terza famiglia, REP002. Il contratto versione 1 conserva il tipo `climate` e il campo principale storico `climateId`; metadati validi solo se l'entità principale corrisponde. I canali `climate.*` ordinari devono appartenere allo stesso `device_id`. Le entità tecniche non identificano il prodotto principale; secondarie e diagnostica seguono il ruolo del registro, senza abilitare quelle nascoste o disabilitate.

Obiettivo singolo o intervallo dipendono da feature e modalità effettive. Temperature, unità, limiti e passo non ricevono default inventati per inviare comandi. Ogni canale mantiene target indipendenti; i comandi passano dal percorso personale tracciato. Nessuna regolazione collettiva, programmazione oraria o migrazione automatica dei widget storici introdotta nel lotto. Il catalogo resta di 29 tipi.

## Regole runtime del prodotto Cover

Quarta famiglia, REP003. Contratto versione 1 e campo storico `coverId`, con guardia di corrispondenza all'entità principale. Solo canali `cover.*` ordinari dello stesso device_id; ruoli tecnici dal registro, senza abilitare entità nascoste/disabilitate o aggregare il dispositivo di un hub.

Apri 1, Chiudi 2, posizione 4 e Stop 8 sono capacità distinte. La regolazione percentuale delle lamelle usa SET_TILT_POSITION 128, non SPEED 256. I valori mancanti non diventano 0 o 100. Slider di comando solo per dati/capacità/servizi effettivi; stato osservato e target richiesto restano distinti. Stop è indipendente dalle attese di movimento e cancella soltanto gli invii locali non ancora partiti. Nessuna velocità, pianificazione o conversione implicita dei widget storici. Catalogo ancora di 29 tipi. Compatibilità di porte, cancelli e altri tipi del dominio non dichiarata collaudata dal lotto tapparelle/tende/veneziane.

## Evidenze, limiti e aggiornamento

Fonti applicative pertinenti: `contracts/productDevice.ts`, `frontend/src/utils/devices/productBinding.ts`, `utils/devices/classify.ts`, `utils/devices/bound.ts`, `domain/launcher/catalog.ts`, `components/widgets/adaptive/operationalProfile.ts`, `components/widgets/controls/light/` e `hooks/liveProfiles/LiveProfilesContext.tsx`. Il classificatore discovery storico sceglie una famiglia principale; il nuovo resolver Luce non usa il marchio o la config entry per estendere le associazioni.

Nel lotto REP013 i test di Luci verificano separazione di dispositivi della stessa entry, canali multipli, diagnostica da registro, nessun comando all'apertura, target distinti, supporto effettivo, effetti e regolazioni, fallback manuale e ricollegamento a un'altra luce senza usare i vecchi canali.138 casi mirati/regressivi in 4 file e strict frontend sono passati sui dati controllati dell'agente Luci. Esiti UI complessivi, build e consegna appartengono al report; questi test non sono prove su apparecchi reali o su tutte le1442 integrazioni.

Questa matrice non attesta collaudi su Lenovo M11, Safari/iPhone, marchi, modelli o firmware. Un aggiornamento dell'Excel o di HA richiede un confronto esplicito di revisione e capacità; non aggiorna automaticamente né il mapping né il software ACA. Le righe Da progettare sono copertura futura da discutere, non incarichi già autorizzati.

## Sicurezza e video: fonti del lotto2026-11-11

Verifica documentale primaria sulla versione2026.10.4, senza certificare la versione attualmente installata sul banco: [lock](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/lock/__init__.py), [alarm_control_panel](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/alarm_control_panel/__init__.py), [camera/const.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/camera/const.py), [camera/__init__.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/camera/__init__.py). Feature, servizi e stato osservati restano autorità runtime; l'Excel non viene caricato all'avvio.

Serrature e Allarme possono avere codici testuali o numerici; nessuna deduzione di porta aperta da sblocco, né di allarme protetto da stato sconosciuto. Camera usa ON_OFF1/STREAM2 e motion_detection; idle non dimostra alimentazione e attributo movimento assente non equivale a false. Legacy operativo diverso registrato come ISSUE-156. Le secondarie camera includono eventuali luci dello stesso device, senza sottrarre canali a dispositivi diversi; camera tecniche leggibili senza avviare stream. L'ordine fisico dei comandi rimane il limite ISSUE-154.

## Area Robot: fonti e limiti del lotto2026-11-11

Fonti primarie lette2026-11-11, tag2026.10.4: [vacuum/const.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/vacuum/const.py), [vacuum/services.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/vacuum/services.py), [vacuum/websocket.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/vacuum/websocket.py), [lawn_mower/const.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/lawn_mower/const.py). Non si dichiara la versione del banco né una prova hardware.

Vacuum usa START8192, PAUSE4, STOP8, RETURN_HOME16, FAN_SPEED32, LOCATE512, CLEAN_SPOT1024 e CLEAN_AREA16384, con servizi presenti e permessi personali. fan_speed è una stringa della lista, non una percentuale. Le aree HA provengono dal mapping già configurato options.vacuum.area_mapping; la UI non invoca vacuum/get_segments, riservato ad amministratori. MAP2048 non definisce un formato immagine universale: nuove mappe da image/camera del device esatto o ID associati esplicitamente, senza euristiche per nomi/integrazione, senza feed da camera tecnica. URL in memoria, preferenze soltanto ID/mostra/scala.

Lawn_mower usa i quattro comandi standard; altre funzioni arrivano dalle secondarie o associazioni esplicite. Per entrambi returning non prova arrivo e docked non prova carica. Pausa/stop/ritorno restano indipendenti dalle regolazioni pendenti, senza promettere priorità nel gateway (ISSUE-154). Il percorso storico rimane conservato e i suoi limiti sono registrati separatamente in ISSUE-157. Verifiche e copertura effettiva nel REP002, non dedotte dalla lista delle integrazioni.

## Area Sensori: perimetro del lotto2026-11-11

[REP004](../reports/REP-20261111-004-area-sensori.md), attuazione locale .66 verificata. Il risolutore v1 usa esclusivamente device_id e canali sensor/binary_sensor ordinari, visibili e abilitati. Un dispositivo con soli helper, configurazione o diagnostica non diventa automaticamente un prodotto Sensori; la famiglia non sottrae dispositivi a Luci, Prese, Clima, Cover, Fan, Lock, Allarme, Camera, Vacuum, Mower, TV, Sonos o Media. Nessun nuovo tipo di catalogo: entityId e identità storiche restano validi.

Unità, valori, device_class e timestamp vengono dai dati HA; unknown/unavailable non diventano letture rassicuranti, zero o percentuali inventate. La cronologia usa gli adattatori esistenti soltanto sul canale visibile, senza nuovi campioni o soglie. Tecnica e manutenzione raccolgono secondarie dell'esatto dispositivo; eventuali comandi supportati sono azioni esplicite, tracciate e soggette ai permessi personali.

La categoria espone associazione Dispositivo / Helper e comandi. Un tab non scrive; la selezione salva chiave principale, modalità e metadati in un'unica operazione con ACK. La modalità helper non attiva metadati prodotto residui e mantiene azioni/preferenze legacy. I widget raw storici senza categoria conservano la loro UI. Trova, anteprima/Conferma, destinazioni esistenti, Annulla e spazio insufficiente seguono il percorso comune. Questa matrice registra il perimetro, non una dichiarazione di suite completa o compatibilità hardware: verifiche e consegna sono nel report.

## Area Energia e consumi: perimetro del lotto2026-11-11

[REP005](../reports/REP-20261111-005-energia-consumi.md), attuazione locale .67 verificata. I tipi `cost` e `nordpool` restano composizioni logiche con associazioni esplicite, non nuove DeviceFamily. Cost conserva todayId/monthId per i costi e consumptionId per l'energia, con powerId opzionale per la potenza; almeno una fonte. Nordpool conserva nordpoolId per il prezzo unitario. La selezione usa metadati e unità compatibili, senza euristiche sul nome. Le misure accessorie dei quattordici prodotti già aggiornati rimangono nei loro widget, mentre un contatore fisico autonomo mantiene il percorso Sensori.

Nessuna conversione fra potenza ed energia, fra valute o fra costo e prezzo unitario, somma arbitraria, integrazione del consumo, stima di bolletta o tariffa nuova. Le letture espongono unità e stati effettivi. Riferimenti incompatibili o mancanti non vengono cancellati al mount; l'utente può sostituirli o scollegarli con il percorso comune ad ACK, senza rimuovere integrazioni HA. Identità, ID, impostazioni e profili non migrati.

Cronologia reale dal componente Sensori e trasporti esistenti: nessun riempimento con lo stato attuale, differenza di contatori resettati, nuova API statistica o nuovo archivio. I prezzi pubblicati richiedono intervalli verificabili, separati dal prezzo corrente; nessuna ricostruzione dal numero di elementi dell'array. graphStyle/showWithSupport e valuta storici restano conservati senza applicare una formula norvegese o rietichettare i dati nativi. Copertura di integrazioni, fornitori, contatori, HA reale e hardware non è implicita in questa matrice; prove e consegna restano nel report.


## Area Meteo: perimetro del lotto 2026-11-12

[REP001](../reports/REP-20261112-001-area-meteo.md), attuazione locale .69 completata e verificata. I tipi weather e cover_weather riusano la stessa tessera/schermata di lettura e la stessa associazione weatherId/tempId; fonte scelta per il primo, politica automatica HA preesistente o override esplicito per il secondo. La Copertina autonoma conserva la propria fonte automatica. Identità, widget e configurazioni storiche restano conservati, nessuna nuova DeviceFamily o risolutore di prodotti meteorologici.

Capacità HA DAILY=1, HOURLY=2 e TWICE_DAILY=4 sono distinte; il lotto mantiene le due viste già offerte e non rinomina twice_daily. Numeri/unità effettivi, precipitazione e probabilità separate, nessun campione artificiale o saldatura fra storico e previsione. La scelta con patch/memoria attende il riscontro della centrale e conserva la bozza in caso negativo; nessun comando, provider, geolocalizzazione o archivio nuovo. [Brief](../design/componenti/meteo.md) e REP001 distinguono risultati locali, copertura parziale e collaudi reali. Fonti primarie: [Core weather 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/weather/__init__.py), [capacità](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/weather/const.py), consultate il 2026-11-12.


Consegna Meteo .69: 126 test dedicati PASS, QA finale sei flussi/sei cold e cinque viste PASS sullo ZIP `ee3948bcd6621ad79f704f87ffcbb9b18c38718c2abda48e7ec96875b9d8edde`; le cinque viste Gate2 sono riutilizzate esplicitamente nel Gate2b sul medesimo artefatto. Due percorsi cambiano e ripristinano realmente la fonte tramite l’interfaccia pubblica della DEMO, inclusa una fonte daily-only. Le prove non attestano provider reali, sessioni HA, telefono fisico o tutte le integrazioni del foglio Excel. Copertura oraria/giornaliera soltanto, twice_daily escluso dalla UI. Banco, account/profili e pubblicazione invariati; risultati completi e debito preesistente restano nel report.
