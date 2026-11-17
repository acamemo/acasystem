# Blocco 1 Valutazione senza mini PC

Data: 2026-10-29. Richiesta e chiarimento: [U5 e U5a nel diario](../diario/2026-10-29.md#u5-funzioni-aca-e-modello-smart-life-o-alexa). [Stato attuale dell'installazione](01-installazione-aca.md). Verifiche: [REP-20261029-007](../../reports/REP-20261029-007-server-minimo-solo-telefono.md).

## Obiettivo umano e conclusione della valutazione

L'utente vuole valutare **solo telefono o tablet, senza mini PC**. Chiede quali responsabilità ACA siano necessarie, come funzionino Smart Life e Alexa e se si possa utilizzare il backend/API di HA escludendone il frontend. Il vincolo attuale resta: ragionare senza modificare il codice.

Valutazione dell'assistente: il processo server ACA può plausibilmente essere eliminato o fortemente ridotto trasferendo nell'app i dati e gli adattamenti specifici di ACA. Questo non elimina il motore Home Assistant, che oggi esegue il lavoro domotico. Senza mini PC occorre decidere se quel motore debba vivere sul dispositivo mobile o se si useranno servizi cloud e dispositivi controllabili dall'app. Non è una migrazione già provata.

Non si assumono come obbligatorie le precedenti funzioni di sincronizzazione fra più dispositivi o la precedente macchina HA OS. Cloud, funzionamento offline, piattaforma mobile e famiglie di dispositivi restano da definire.

## Mappa delle responsabilità ACA

| Responsabilità attuale | Dove avviene oggi il lavoro | Possibile destinazione nel nuovo scenario |
|---|---|---|
| Stati, comandi, registri, storico e automazioni | Home Assistant; ACA inoltra o prepara le richieste. | API HA dirette se esiste ancora Core, oppure un altro motore/SDK per i dispositivi scelti. Togliere Express non sostituisce questo lavoro. |
| Account e accesso | Identità e token sono HA; ACA fa inoltro e validazione. | Sessione HA gestita dal client, se HA resta. Un'app realmente senza HA richiede un proprio modello di accesso o quello del servizio adottato. |
| Aggiunta e configurazione dei dispositivi | Config flow e registri HA; ACA normalizza campi, messaggi, classificazione, controlli e proprietà dei flussi. | Gli adattamenti possono stare nell'app. Le operazioni richiedono comunque HA e, per molte chiamate attuali, privilegi amministrativi/API interne. |
| Identità `Acasystem (servizio)` | Credenziale HA amministrativa custodita e riparata sul server ACA. | In un'app su un solo dispositivo usato dal proprietario potrebbe non servire. Non si mantiene automaticamente il modello precedente di privilegi per tutti gli utenti. |
| Profili, layout e impostazioni | JSON e revisioni in SQLite ACA, con pubblicazione/condivisione fra dispositivi. | Database o file dell'app per l'uso su un solo dispositivo. Sincronizzazione e condivisione restano scelte separate, non ragioni automatiche per conservare un server. |
| Casa 3D | Rendering nel frontend; edificio, immagini, revisioni, cronologia e copie nel server ACA. | Rendering e archiviazione possono stare nell'app. Le API e i dati correnti andrebbero migrati, non semplicemente rimossi. |
| Ricetta di accensione TV | ACA prepara configurazione e automazione; HA invia ed esegue i comandi previsti. | Senza HA occorre implementare l'esecuzione nel motore scelto. L'automazione attuale non è eseguita dall'app. |
| Icone e frontend statico | Catalogo SVG e file serviti da Express; frontend già incluso nei bundle client. | Bundle dell'app. Non richiedono per natura un servizio remoto. |
| Proxy `/ha` e `/api/health` | Infrastruttura per origine unica, trasporto, riconoscimento/versione del server ACA. | Da eliminare o adattare al nuovo collegamento del client; non sono funzioni domotiche. Oggi i gusci si aspettano quel contratto di avvio. |
| Pulizia dei flussi, audit e riparazione dell'identità | Servizi periodici ACA, distinti dal motore delle automazioni HA. | Semplificazione o gestione locale nell'app secondo i requisiti effettivi. Non vanno confusi con la necessità di tenere un motore domotico sempre attivo. |

Evidenze nei sorgenti correnti:

- [server.ts](../../../progetto/acasystem/backend/src/server.ts), righe 69-103: route ACA, proxy e statici.
- [haClient.ts](../../../progetto/acasystem/frontend/src/api/haClient.ts), righe 51-79, 98-119 e 395-407: comandi, storico e registri già richiesti a HA.
- [database.ts](../../../progetto/acasystem/backend/src/models/database.ts), righe 15-124: tabelle proprie di ACA.
- [homeAssistantApiCatalog.ts](../../../progetto/acasystem/backend/src/config/homeAssistantApiCatalog.ts), righe 202-214: config flow classificati come API interne e amministrative.
- [deviceContext.ts](../../../progetto/acasystem/backend/src/services/devices/deviceContext.ts), righe 119-128, e [serviceIdentity.ts](../../../progetto/acasystem/backend/src/services/devices/serviceIdentity.ts): autorizzazione e identità di servizio.
- [casa3dApi.ts](../../../progetto/acasystem/backend/src/routes/casa3dApi.ts), righe 13-18 e 27-46: persistenza, immagini, revisioni e copie.
- [powerRecipe.ts](../../../progetto/acasystem/backend/src/services/devices/powerRecipe.ts), righe 344-362: automazione predisposta in HA.
- [startup.ts](../../../progetto/client/core/src/startup.ts), righe 85-90: dipendenza dell'avvio attuale dal controllo del server ACA.

## Cosa dimostrano Smart Life e Alexa

Le fonti pubbliche descrivono le piattaforme e i flussi documentati, non un audit dei binari proprietari o di ogni comportamento dell'app corrente. Sono state aperte e consultate il 2026-10-29.

**Smart Life.** La [scheda ufficiale Google Play](https://play.google.com/store/apps/details?id=com.tuya.smartlife) identifica l'app citata come SmartLife: Smart Living, pubblicata da Volcano Technology Limited. La [presentazione Tuya](https://developer.tuya.com/en/docs/iot/tuya-smart-app-smart-life-app-advantages?id=K989rqa49rluq), aggiornata il 2025-08-01, descrive SmartLife e dati dell'account nel cloud. Il controllo dei dispositivi non implica necessariamente un passaggio cloud per ogni comando: lo [SDK ufficiale Android](https://developer.tuya.com/en/docs/app-development/andoird_device_control?id=Kceuh1gmmdsm8), aggiornato il 2024-06-26, distingue LAN, cloud e selezione automatica.

Il [manuale SmartLife](https://developer.tuya.com/en/docs/iot/user-manual-for-tuya-smart-v3177?id=K9obrofrfk4sk), aggiornato il 2026-10-16, richiede un gateway prima di aggiungere dispositivi Zigbee e descrive automazioni locali su gateway compatibili. Un sistema Wi-Fi compatibile può quindi evitare un mini PC usando l'ecosistema del produttore; il cloud e gli eventuali gateway non sono per questo eseguiti nel telefono.

**Alexa.** Le [opzioni di sviluppo ufficiali](https://www.developer.amazon.com/docs/alexaplus/smarthome/development-options.html), aggiornate il 2026-08-28, distinguono integrazioni fra cloud e percorsi locali attraverso dispositivi Echo/eero compatibili. La [guida Matter](https://www.developer.amazon.com/docs/alexaplus/smarthome/matter-support.html), aggiornata il 2026-05-01, descrive dispositivi controller compatibili e Thread Border Router. L'app di configurazione non dimostra quindi che il motore di controllo sia tutto nello smartphone.

Valutazione per ACA: si può riprendere l'esperienza di un'unica app che aggiunge e controlla i dispositivi. Riprodurre il modello cloud richiederebbe servizi del produttore o un backend remoto effettivo; GitHub come deposito di release non svolge quel ruolo. Questo modello non garantisce automaticamente la compatibilità con tutte le integrazioni HA o il funzionamento offline.

## Backend HA senza frontend

**Approfondimento successivo del 2026-10-29:** il [piano di fattibilità Android](01-fattibilita-tablet-android.md) verifica che il bootstrap Core 2026.10.4 importa e carica comunque il componente frontend e lo considera critico. La separazione dei manifest documentata sotto non va interpretata come prova di avvio senza quel componente. Sono inoltre emersi ostacoli concreti di dipendenze native Android; nessun porting è stato eseguito.

È sensato distinguere il motore dall'interfaccia. Nella revisione ufficiale **Home Assistant Core 2026.10.4**, i manifest di [REST API](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/api/manifest.json) e [WebSocket API](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/websocket_api/manifest.json) dipendono da `http`; il [componente frontend](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/frontend/manifest.json) è distinto e richiede il pacchetto `home-assistant-frontend`. Questo documenta la separazione dei componenti; non è un collaudo di Core senza UI su Android.

Le API non sono un backend autonomo da copiare in un APK. Espongono le funzioni del processo Core, con autenticazione, integrazioni, registri, dipendenze e archiviazione. La combinazione di componenti necessaria al prodotto andrebbe configurata e verificata; copiare soltanto le directory API non conserva il motore.

Le [installazioni ufficiali HA](https://www.home-assistant.io/installation/) documentano HA OS e Container, non un pacchetto backend Android da incorporare in Capacitor. Escludere il frontend dagli aggiornamenti non risolve da solo runtime Python, librerie, accesso ai dispositivi e aggiornamento del motore sul telefono. Fonti consultate il 2026-10-29.

Un esperimento su Android potrebbe studiare un Core senza UI confezionato con ACA. È una possibilità di ricerca, non una soluzione verificata. Sarebbe preferibile governare versione e componenti del motore rispetto a mescolare manualmente cartelle provenienti da aggiornamenti GitHub: questa è una valutazione di manutenzione dell'assistente, non una decisione approvata.

## Alternative compatibili con l'obiettivo da valutare

| Modello | Mini PC domestico | Dove vive il motore | Conseguenza principale |
|---|---|---|---|
| App con servizi dei produttori, come alcuni percorsi Tuya/Alexa | Assente | Cloud e dispositivi; eventuali gateway | Compatibilità legata agli ecosistemi scelti, account e dipendenze di rete. Non è tutto eseguito sul telefono. |
| App che controlla direttamente dispositivi supportati | Assente | App e dispositivi | Occorrono protocolli/SDK specifici. Le automazioni affidate al telefono dipendono dalla sua disponibilità; non si eredita tutto HA. |
| App e motore HA sullo stesso dispositivo Android | Assente | Telefono/tablet | Conservazione del motore HA da verificare mediante porting/confezionamento e prove di continuità. Nessuna fattibilità di prodotto dichiarata. |
| App con un nuovo servizio ACA remoto | Assente | Cloud ACA | Introduce un'infrastruttura server altrove; i dispositivi locali devono essere raggiungibili con un percorso esplicito. Non basta ospitare la UI su GitHub. |

La [documentazione Android sui processi in background](https://developer.android.com/develop/background-work/background-tasks), consultata il 2026-10-29, distingue lavoro pianificato e servizi in primo piano e documenta restrizioni del sistema. Un motore continuativo richiede una progettazione specifica: non basta lasciare una pagina web aperta. Se le automazioni sono affidate al telefono, spegnimento o indisponibilità di quel dispositivo ne interrompono l'esecuzione; i collegamenti locali devono restare raggiungibili.

Un tablet dedicato che resta in casa è un candidato diverso da un telefono personale che lascia la rete. Per Zigbee e altri collegamenti che richiedono una radio o un gateway, togliere il mini PC non elimina il requisito hardware; se l'obiettivo esclude ogni hub aggiuntivo, va scelto un insieme di dispositivi compatibile. Nessun test hardware, porting Android o valutazione di un backend su iOS è stato eseguito.

## Valutazione e punto di ripresa

Non emerge una responsabilità propria di ACA che imponga per natura un server Express su un secondo computer quando si vuole un solo dispositivo. Emerge invece la necessità di collocare esplicitamente il motore domotico oggi affidato a HA. Ridurre ACA e portare HA sul telefono sono lavori diversi.

L'assistente non propone di iniziare con una copia selettiva dei sorgenti upstream. L'utente ha successivamente chiesto l'approfondimento sul tablet Android: il [piano dedicato](01-fattibilita-tablet-android.md) conserva ostacoli e verifiche progressive. Dispositivi irrinunciabili, cloud/offline e condizioni di continuità restano da definire. Nessuna prova o implementazione è assegnata ora.
