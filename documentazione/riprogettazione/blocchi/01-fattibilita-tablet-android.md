# Blocco 1 Fattibilità di ACA e Core sul tablet Android

Data: 2026-10-29. Fonte umana: [U6 nel diario](../diario/2026-10-29.md#u6-studio-sullo-stesso-tablet-android). [Valutazione senza mini PC](01-valutazione-solo-telefono.md). Evidenze e controlli: [REP-20261029-008](../../reports/REP-20261029-008-fattibilita-core-tablet-android.md).

## Esito dell'analisi attuale

È un'ipotesi da studiare con verifiche progressive, non una configurazione già pronta. Le due difficoltà documentali più immediate sono la compatibilità del runtime e delle dipendenze con Android e il caricamento del componente frontend nel bootstrap Core. Anche superandole, un motore domestico deve continuare a funzionare quando l'interfaccia è chiusa, recuperare dopo riavvii e conservare correttamente i dati.

Sono stati letti sorgenti e fonti primarie; nessun motore è stato installato o avviato e nessun tablet è stato inventariato o modificato. Le verifiche descritte sotto sono proposte per un futuro incarico, non risultati o istruzioni da eseguire automaticamente.

## Precisare cosa significa senza frontend

**Decisione successiva del 2026-10-29:** l'utente ha scelto il frontend HA presente ma nascosto ([ADR-0026](../../decisions/ADR-0026-frontend-ha-presente-nascosto.md), [U7](../diario/2026-10-29.md#u7-scelta-sul-frontend-e-studio-python-sul-m11)). La [matrice sul Tab M11](01-compatibilita-python-m11.md) valuta quindi le dipendenze senza escludere quelle frontend. La distinzione seguente conserva il contesto della scelta.

Ci sono due obiettivi distinti:

- L'utente vede e usa esclusivamente ACA; Core può mantenere internamente il proprio componente frontend.
- La distribuzione del motore non contiene né carica il componente/pacchetto frontend HA.

La precedente distinzione fra i manifest API e frontend non dimostra il secondo obiettivo. Nel tag ufficiale **Core 2026.10.4**, [bootstrap.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/bootstrap.py) comprende `frontend` fra le integrazioni predefinite, quelle di recovery e quelle critiche. [pyproject.toml](https://github.com/home-assistant/core/blob/2026.10.4/pyproject.toml), righe 25-27, documenta inoltre l'import incondizionato del modulo in bootstrap.

Non basta quindi cancellare la cartella della UI. La rimozione richiede studio del grafo di avvio e prove di autenticazione, configurazione e recovery; potrebbe richiedere modifiche upstream da mantenere. L'utente ha ora scelto di non perseguire quella rimozione in questo percorso; non ne è stata eseguita alcuna implementazione.

## Runtime e dipendenze native

Core **2026.10.4 richiede Python almeno 3.14.2** e include dipendenze native, fra cui `orjson==3.11.9`, `cryptography`, `bcrypt`, Pillow e `lru-dict`. Il requisito è nel [pyproject del tag](https://github.com/home-assistant/core/blob/2026.10.4/pyproject.toml).

La documentazione [orjson 3.11.9](https://github.com/ijl/orjson/blob/3.11.9/README.md) dichiara non supportati gli embedded Python Android/iOS. È un ostacolo concreto per l'APK nativo, non una prova di impossibilità assoluta: occorrerebbe verificare un porting o una modifica e il relativo costo di manutenzione.

Python documenta [l'interprete incorporato nelle app Android](https://docs.python.org/3.14/using/android.html), ma questo non certifica la compatibilità di ogni pacchetto. Le librerie compilate per Linux ARM64 non vanno considerate binari Android equivalenti: la piattaforma usa Bionic e dispone di propri tag ABI/API. Fonti primarie: [PEP 738](https://peps.python.org/pep-0738/) e [tag dei pacchetti Android](https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/#android), consultate il 2026-10-29.

La prima matrice documentale dovrebbe elencare, per dipendenze base e integrazioni irrinunciabili: versione, ABI/API del tablet, pacchetto compatibile disponibile o da compilare, patch eventualmente necessaria e responsabilità degli aggiornamenti. La verifica di `orjson` precede una ristrutturazione di ACA.

## Stesso tablet e unico APK sono prove diverse

| Percorso da studiare | Cosa potrebbe dimostrare | Cosa non dimostra automaticamente |
|---|---|---|
| Python e Core incorporati nell'app Android | Compatibilità con il confezionamento nativo del prodotto. | Che tutte le dipendenze e integrazioni HA funzionino, o che Android mantenga il motore disponibile. |
| Motore in un ambiente Linux locale sperimentale sul tablet | Possibilità di eseguire un carico su quel dispositivo fisico. | Che lo stesso motore possa entrare nel client Capacitor invariato, o che esistano Supervisor e add-on. |

Un eventuale ambiente Termux/PRoot sarebbe una pista di laboratorio distinta. Il [progetto PRoot Distro](https://github.com/termux/proot-distro) documenta limiti rispetto a un sistema Linux completo; non va presentato come HA OS sul tablet. Non è stato selezionato né installato in questo incarico.

Il fallimento di una dipendenza nel percorso APK nativo bloccherebbe quel percorso finché non risolta; un successo nell'ambiente Linux locale non lo risolverebbe automaticamente. Root, cambio del sistema operativo o dipendenze da un'altra app devono essere esplicitati, non nascosti nella promessa di un'app installabile normalmente.

## Divario rispetto al client ACA corrente

Il progetto configura min SDK 26 e target/compile SDK 36 in [variables.gradle](../../../progetto/client/android/android/variables.gradle), righe 2-4. Il [manifest](../../../progetto/client/android/android/app/src/main/AndroidManifest.xml) dichiara due Activity e la sola autorizzazione `INTERNET`; non contiene un Service o un receiver di avvio. Nel [build Android](../../../progetto/client/android/android/app/build.gradle) non è integrato un runtime Python/HA.

Il [server Java locale](../../../progetto/client/android/android/app/src/main/java/it/acasystem/client/LocalServer.java) serve la UI e inoltra le richieste nel processo dell'app. Non è un supervisore di Core. Il [ponte AcaShell](../../../progetto/client/android/android/app/src/main/java/it/acasystem/client/AcaShellPlugin.java), righe 23-26, è accessibile al guscio, non alla UI scaricata: uno ZIP frontend non aggiunge da solo librerie native o gestione di processi e riavvii.

L'avvio attuale richiede [il contratto `/api/health` di ACA](../../../progetto/client/core/src/health.ts), non quello di Core. Anche i percorsi `/ha` e le API dati ACA andrebbero adattati: cambiare l'IP in `127.0.0.1` e la porta in 8123 non risolve questi contratti.

Il [setup corrente](../../../progetto/client/core/src/setup.ts), righe 238-241 e 299-330, installa ACA mediante Supervisor. Un Core sul tablet non fornisce da solo store, add-on, boot e watchdog di HA OS. La [documentazione ufficiale delle installazioni](https://contributors.home-assistant.io/os/installation-types/) distingue questi componenti e non offre questo confezionamento Android come installazione supportata.

Sono riusabili interfaccia ACA, protocolli HA, parte delle schermate di accesso, archivio dei bundle e controlli di integrità. La conservazione di tre bundle UI non equivale però a ripristino del motore e del suo database.

## Continuità, rete e dati

| Ostacolo | Conseguenza da verificare | Fonte primaria consultata il 2026-10-29 |
|---|---|---|
| Vita del processo | Un motore domestico va gestito separatamente dalle Activity/WebView. Tipo e permessi del foreground service devono corrispondere al lavoro effettivo; `connectedDevice` è un candidato per collegamenti a dispositivi, non un jolly. | [Tipi di foreground service](https://developer.android.com/develop/background-work/services/fgs/service-types). |
| Inattività e batteria | Doze può differire CPU e rete; una prova a schermo acceso o con sola alimentazione non copre la sospensione a batteria. | [Doze e App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby). |
| Riavvio a freddo | I dati protetti dalle credenziali sono disponibili dopo il primo sblocco; una ripartenza senza intervento richiede progettazione distinta. | [Direct Boot](https://developer.android.com/privacy-and-security/direct-boot). |
| Arresto forzato | È diverso da chiudere la UI: Android mantiene l'app nello stato di arresto fino a un'interazione umana. Non promettere di annullare automaticamente questa scelta. | [Comportamento dello stopped state](https://developer.android.com/about/versions/15/behavior-changes-all). |
| Scoperta in rete | Connessione TCP riuscita non prova mDNS/SSDP, multicast, perdita e recupero Wi-Fi o scelta dell'interfaccia di rete. | [NSD](https://developer.android.com/develop/connectivity/wifi/use-nsd) e [MulticastLock](https://developer.android.com/reference/android/net/wifi/WifiManager.MulticastLock). |
| BLE e USB | Permessi, sopravvivenza del processo e accesso ai dispositivi vanno integrati con Android. Una porta USB non prova che il driver Linux HA acceda a un coordinatore. | [BLE in background](https://developer.android.com/develop/connectivity/bluetooth/ble/background) e [USB host](https://developer.android.com/develop/connectivity/usb/host). |
| Archiviazione | Configurazione, credenziali e database devono essere persistenti, con esportazione e ripristino; la disinstallazione elimina i dati specifici dell'app. | [Archiviazione specifica dell'app](https://developer.android.com/training/data-storage/app-specific). |

Il timeout di sei ore documentato da Android riguarda `dataSync` e `mediaProcessing`, non ogni foreground service: non è un limite universale da attribuire al progetto. Fonte: [timeout dei servizi](https://developer.android.com/develop/background-work/services/fgs/timeout).

MQTT, Zigbee, Matter e altri protocolli possono richiedere software o radio ulteriori, a seconda dell'integrazione; l'[architettura ufficiale HA](https://contributors.home-assistant.io/architecture/big-picture/) distingue anche i programmi esterni a Core. L'elenco minimo dei dispositivi deve precedere la promessa di equivalenza con HA OS. Vanno misurati insieme anche memoria di Core, WebView e Casa 3D, spazio per lo storico, stabilità termica e alimentazione sul modello effettivo; qui non sono disponibili misure aggiornate.

Aggiornare frontend JavaScript, interprete Python, librerie native e dati sono operazioni diverse. Occorrono versioni fissate, verifica del pacchetto e backup coerenti prima delle migrazioni. Il ritorno al solo vecchio binario non garantisce il ripristino di un database migrato. Eventuali vincoli di pubblicazione su Google Play si valutano soltanto se quel canale viene scelto; non viene introdotto qui un nuovo canale di distribuzione.

## Piano progressivo proposto

Tutte le fasi sono **non eseguite**. Durate e criteri seguenti sono proposte dell'assistente, non SLA o criteri già approvati dall'utente.

| Fase | Verifica | Condizione osservabile per procedere |
|---|---|---|
| 1 Inventario e perimetro | Modello, Android, ABI effettive, RAM/spazio disponibili, integrazioni minime, uso a batteria e aspettative dopo riavvio. | Piattaforma e dispositivi di prova identificati; espliciti gli aspetti esclusi dalla prima verifica. |
| 2 Dipendenze e bootstrap | Matrice dei pacchetti per una versione fissata, iniziando da Python e `orjson`; significato concordato di senza frontend. | Percorso tecnico credibile per le dipendenze indispensabili. Porting/patch e differenze fra APK nativo e laboratorio non nascosti. |
| 3 Motore isolato | Futuro ambiente separato dai sorgenti ACA: avvio Core, dati persistenti, creazione proprietario, accesso, rinnovo token, REST/WebSocket e riavvio. | Motore in esecuzione sul tablet e stato conservato, senza motore su PC, VM, container esterno o inoltro `adb reverse`. Rimozione completa del frontend verificata separatamente, se richiesta. |
| 4 Prova domotica minima | Un dispositivo Wi-Fi reale, comando confermato dallo stato e automazione con interfaccia chiusa; prova distinta senza Internet per il dispositivo locale selezionato. | Il motore compie il lavoro sul tablet, non soltanto una UI o una simulazione. Trasporti ulteriori provati individualmente prima di prometterne il supporto. |
| 5 Continuità | Prima osservazione proposta di 24-72 ore, poi estensione a 7 giorni; UI aperta/chiusa, schermo spento, inattività, alimentazione/batteria, cadute Wi-Fi e riavvii. | Nessuna perdita di esecuzione inspiegata; misure di memoria, CPU, storage, tempi e recuperi confrontate con soglie da concordare. Arresto forzato e primo sblocco documentati separatamente. |
| 6 Dati e aggiornamenti | Backup/esportazione e ripristino su dati di prova; aggiornamento del motore con copia coerente dei dati e recupero da errore. | Proprietario, configurazione, associazioni e dati necessari recuperabili. Nessuna equivalenza presunta fra cache UI e backup HA. |
| 7 Integrazione ACA | Solo dopo gli esiti precedenti, eventuale incarico per host nativo, contratti di avvio/API, dati locali e interfaccia. | Scelta umana della soluzione, dei limiti e del relativo perimetro prima di modificare l'app. |

Una prova di alcuni giorni è un filtro iniziale, non la dimostrazione di affidabilità continuativa del prodotto. Non sono proposti ora root, cambio OS, installazioni o refactor da eseguire.

## Valutazione e punto di ripresa

Il primo investimento utile sarebbe chiarire e verificare runtime/dipendenze e significato di senza frontend, prima di riprogettare le schermate o trasferire tutto il server ACA. Un successo del laboratorio sul tablet dimostrerebbe una parte della fattibilità; installazione normale, continuità, hardware e aggiornamenti resterebbero verifiche autonome.

Il percorso corrente è la [compatibilità documentale sul Tab M11](01-compatibilita-python-m11.md), con frontend HA conservato per decisione umana. Proseguire dalle lacune delle dipendenze e dai dati effettivi del tablet; nessuna implementazione o prova di esecuzione è stata assegnata.

**Approfondimento 2026-10-29, U16:** la [continuità con UI chiusa e display spento](01-continuita-android.md) distingue servizio Android, CPU e rete, stop umano, recupero e primo sblocco. La matrice è definita ma non eseguita; nessuna garanzia di funzionamento H24 o servizio incorporato nel client attuale.
