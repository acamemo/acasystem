# Blocco 1 Associare la casa trovare la centrale e scegliere il collegamento

Aggiornato: 2026-10-30. Fonte umana: [U23](../diario/2026-10-30.md#u23-trovare-la-centrale-e-cambiare-collegamento). [Ingresso](../README.md), [report](../../reports/REP-20261030-007-associazione-discovery-percorsi.md). Analisi completata, soluzioni proposte; nessuna installazione, discovery attiva, attivazione remota o modifica applicativa.

**Seguito del 2026-10-30:** [U24, Cloud o relay ACA](01-cloud-relay-esperienza-costi.md) confronta esperienza senza UI HA, account/API, listino UE e costi completi del servizio. Componenti infrastrutturali e ipotesi economiche distinti da prezzi commerciali o capacità dimostrate; nessuna alternativa adottata.

L'obiettivo è associare una casa una volta e aprire ACA sia in casa sia fuori, lasciando all'app ricerca della centrale e scelta del percorso. Cambia il collegamento alla stessa casa; non si trasferisce HA sul client. U23 autorizza l'approfondimento, non adotta un servizio remoto o un nuovo sistema di account. Restano validi app normale, frontend HA non mostrato e fattibilità del tablet esecutore ancora da dimostrare.

## Percorso proposto per il cliente

1. La centrale è predisposta e collegata alla rete domestica. La prima connessione Wi-Fi del tablet o il collegamento Ethernet del mini PC rimangono necessari; la discovery presuppone una rete utilizzabile.
2. Sul nuovo dispositivo il cliente apre ACA e sceglie di aggiungere la propria casa. In LAN l'app può mostrare la centrale trovata con un nome comprensibile; se ce ne sono diverse, la scelta deve essere esplicita.
3. L'associazione usa, come proposta, un QR o codice monouso con scadenza e prova di autorizzazione del proprietario. Il tablet centrale può mostrarlo dentro ACA. Per un mini PC senza schermo va definito un bootstrap verificabile con codice di attivazione del kit o conferma da un dispositivo già associato; trovarlo in LAN non basta. Nessun flusso concreto già implementato.
4. ACA conserva l'associazione e una credenziale propria del client. Il QR non contiene password amministrative o token permanenti da copiare. L'eventuale account del servizio remoto associa utente e casa; il metodo e il fornitore non sono scelti. Un invito autorizzato permetterebbe di aggiungere un dispositivo anche fuori casa senza discovery LAN.
5. Negli utilizzi successivi ACA cerca un percorso locale verificato e, quando necessario, usa quello remoto autorizzato. Il cliente non dovrebbe digitare IP, porte, DNS o configurare il router. Permessi di sistema pertinenti, login scaduto/revocato e attivazione iniziale del servizio restano possibili passaggi espliciti, non errori da nascondere.

QR, inviti e descrittore della casa sono proposte ACA, non protocolli offerti automaticamente da HA. La configurazione iniziale della centrale, specialmente HA incorporato nel tablet, rimane lavoro separato non assegnato da questo studio.

## L'identità della casa deve sopravvivere agli indirizzi

| Informazione proposta | Scopo |
|---|---|
| Identità stabile della casa | Riconoscere la stessa casa su LAN e remoto; separare case diverse e i loro dati. |
| Identità verificabile della centrale | Collegare l'esecutore autorizzato alla casa; verificare il server prima di inviare credenziali. |
| UUID HA | Indizio persistente per riconoscere l'istanza; non prova crittografica di identità o autorizzazione. |
| Endpoint autorizzati | URL completi, trasporto e percorsi API pertinenti, con regole di fiducia; l'IP locale è un dato aggiornabile. |
| Sessione del client | Utente, permessi e revoca propri del dispositivo, con rinnovo dove consentito. Nessun riuso cieco su un altro server. |
| Capacità e salute | Sapere se sono disponibili API HA, API ACA e relativo protocollo; una risposta HTTP non certifica l'intera casa funzionante. |

HA pubblica già un servizio Zeroconf `_home-assistant._tcp.local.` con UUID, porta e URL se noti. L'UUID resta riconoscibile quando cambia l'indirizzo. L'annuncio può anche provenire dalla landing page prima che Core sia pronto. Va rilevata la porta annunciata, non assunto un universale 8123. Fonte primaria: [discovery HA](https://contributors.home-assistant.io/core/internals/instance-discovery/), aggiornata il 2026-10-16, consultata il 2026-10-30; riferimento Core 2026.10.4.

Questo aiuta a trovare HA, ma non pubblica automaticamente l'endpoint delle API ACA separate. Per ACA va definito un proprio annuncio/descrittore verificabile oppure acquisire quelle informazioni dal canale già associato. Nome del servizio, SSID e IP non concedono accesso. I limiti di fiducia di DNS-SD sono documentati in [RFC 6763, sezione 15](https://datatracker.ietf.org/doc/html/rfc6763#section-15), febbraio 2013, consultata il 2026-10-30.

## Ricerca locale sui client

Android dispone di NSD per scoprire e risolvere servizi DNS-SD/mDNS; Windows espone API native DNS-SD. Servirebbe un adattamento nei contenitori ACA, non una ricerca indiscriminata di tutti gli IP. I nomi possono cambiare per collisioni; la destinazione trovata deve essere verificata. Fonti primarie consultate il 2026-10-30: [Android NSD](https://developer.android.com/develop/connectivity/wifi/use-nsd), aggiornata il 2026-10-23; [Windows DnsServiceBrowse](https://learn.microsoft.com/en-us/windows/win32/api/windns/nf-windns-dnsservicebrowse).

La ricerca ordinaria mDNS resta locale. Rete ospiti, isolamento client, VLAN o filtri multicast possono impedirla; lo stesso nome Wi-Fi non prova raggiungibilità. Un endpoint locale precedentemente associato può essere riprovato e poi verificato, senza fidarsi dell'indirizzo rimasto in cache. Il remoto, se disponibile, è un altro percorso verso quella centrale. Fonte per l'ambito locale: [RFC 6762](https://datatracker.ietf.org/doc/html/rfc6762), febbraio 2013, consultata il 2026-10-30.

Sul profilo Android target 36 l'accesso LAN ordinario non richiede anticipare `ACCESS_LOCAL_NETWORK`; Android 16 dispone di un opt-in di test e le regole cambiano con target 37 su Android 17. API e permessi vanno verificati per la versione reale del tablet e del target; compile SDK 36 non aggiorna Android 15. L'eventuale lettura SSID introduce requisiti propri, da non imporre indistintamente alla ricerca NSD. Fonte: [protezione della rete locale Android](https://developer.android.com/privacy-and-security/local-network-permission), aggiornata il 2026-10-02, consultata il 2026-10-30.

Eventi di rete, apertura dell'app e ritorno in primo piano possono avviare una rivalutazione. Un indicatore di Internet disponibile non dimostra che la centrale risponda; una LAN può funzionare senza Internet. Se Wi-Fi locale e cellulare coesistono può servire selezionare la rete corretta per la richiesta locale. Fonti: [stato di rete Android](https://developer.android.com/develop/connectivity/network-ops/reading-network-state), aggiornata il 2026-10-28; [net.isOnline di Electron](https://www.electronjs.org/docs/latest/api/net#netisonline), consultate il 2026-10-30. Non è proposta una scansione continua con app chiusa.

## Regole proposte per il cambio automatico

| Evento | Azione del gestore connessioni da progettare |
|---|---|
| Apertura o cambio rete | Rivalutare endpoint memorizzati e discovery con tentativi limitati; verificare identità, accesso e capacità necessarie. |
| Locale verificato disponibile | Preferirlo; locale significa percorso funzionante verso la centrale associata. |
| Locale non utilizzabile e remoto verificato disponibile | Usare il remoto senza richiedere un nuovo impianto o cancellare il profilo. Non attendere indefinitamente la ricerca LAN. |
| Ritorno a casa mentre il remoto funziona | Verificare il locale prima del passaggio; evitare continui rimbalzi fra percorsi su rete instabile. |
| Identità errata o accesso revocato | Rifiutare quel collegamento; distinguere problemi di sessione e rete. Il ripiego non deve aggirare una revoca. |
| Nessun percorso disponibile | Dichiarare casa non raggiungibile; ultima situazione eventualmente visibile con data, senza promettere comandi eseguiti. |

Tempi di attesa, priorità e intervalli di rivalutazione sono parametri da misurare, non SLA già decisi. Sono possibili verifiche concorrenti dei percorsi, ma un comando del cliente deve partire una sola volta sul percorso scelto. Le risposte di tentativi vecchi non devono sovrascrivere lo stato della connessione nuova.

Il passaggio va coordinato per API ACA e HA: nuovo trasporto verificato, autenticazione, chiusura delle vecchie sottoscrizioni e aggiornamento dei dati sulla nuova connessione. HA WebSocket documenta autenticazione e `subscribe_entities`, che fornisce uno stato iniziale leggibile dall'utente seguito dalle variazioni. Non si presume che un socket migri indirizzo conservando gli eventi persi. Fonte: [protocollo WebSocket HA](https://contributors.home-assistant.io/core/internals/websocket-api/), consultata il 2026-10-30. Ordine preciso di chiusura/apertura e protezione da risposte obsolete da progettare e collaudare.

Per i comandi serve una distinzione: se l'invio riesce ma si perde la risposta, l'esito può essere sconosciuto. Ripetere un `toggle` potrebbe annullare il primo comando. La proposta è rileggere lo stato e segnalare l'esito incerto, senza reinvio automatico di azioni ambigue. Gli ID WebSocket correlano messaggi, non attestano deduplicazione fra connessioni. Una futura coda offline richiederebbe un contratto separato. Il principio HTTP di non ritentare indiscriminatamente operazioni non idempotenti è in [RFC 9110, sezione 9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2), giugno 2022, consultata il 2026-10-30; applicazione ai comandi ACA come valutazione progettuale.

## Remoto semplice per il cliente

Per evitare router, IP pubblico e porte da configurare, la proposta da valutare per prima è un **connettore gestito con collegamento uscente dalla centrale**. Il telefono raggiunge il servizio remoto, che instrada verso la casa autorizzata. Questo può funzionare anche dietro NAT/CGNAT quando il traffico uscente richiesto è consentito; reti con filtri o portali restano casi da gestire. Non richiede spostare in cloud tutte le configurazioni o eseguire HA nel cloud.

| Alternativa da confrontare | Cosa risolve e cosa rimane |
|---|---|
| Home Assistant Cloud | Tunnel esistente verso HA, autenticazione HA e supporto agli add-on predisposti per Ingress. Non espone automaticamente ogni API/porta ACA. |
| VPN gestita | Raggiunge servizi locali autorizzati; aggiunge gestione della rete privata e dei client. Non sincronizza i dati da sola. |
| Relay integrato ACA da sviluppare | Consente un percorso cliente interamente ACA; richiede servizio operativo, associazione casa/utente, connettore domestico, autorizzazioni, TLS e supporto HTTP/WebSocket pertinenti. |

Nabu Casa documenta il collegamento uscente e l'inoltro TCP cifrato verso l'HTTP HA, oltre al caso Ingress. È evidenza di un approccio esistente, non una soluzione ACA già pronta. Fonte: [Remote access Deep dive](https://support.nabucasa.com/hc/en-us/articles/25619268678557-Remote-access-Deep-dive), aggiornata il 2026-02-09, consultata il 2026-10-30. Confronto VPN e limiti attuali già nello [studio U21](01-dati-multidispositivo-remoto.md).

La raccomandazione riguarda l'esperienza di collegamento gestito; non sceglie ancora se riusare un servizio esistente o gestirne uno ACA. Il secondo comporta responsabilità operative e costi ancora da stimare. Login esclusivamente ACA, rinnovo/MFA e autorizzazioni HA restano da progettare: un account del relay non conferisce automaticamente accesso a HA. Nessun bypass del login o condivisione dell'amministratore è approvato.

## HTTPS e funzionamento senza Internet

L'indirizzo locale deve avere un trasporto verificabile. Il certificato di un nome remoto non rende valido un IP locale o un altro nome. Le alternative da studiare sono HTTPS con nome/certificati gestiti automaticamente, oppure fiducia associata durante il pairing nel trasporto nativo. La seconda richiede verifica specifica di WebView, proxy, rinnovo e cambio delle chiavi; non è già supportata dai contenitori attuali. Non si risolve disabilitando la verifica TLS o chiedendo al cliente di installare certificati manualmente. Fonti: [RFC 9110, verifica HTTPS](https://www.rfc-editor.org/rfc/rfc9110.html#section-4.3.4), [fiducia e configurazione di rete Android](https://developer.android.com/privacy-and-security/security-config), consultate il 2026-10-30.

Un precedente utile è Companion, che distingue URL locale/esterna e collegamento cloud. Il suo uso di SSID e opzioni di sicurezza HTTP mostra però che la scelta automatica dipende anche da fiducia e permessi; non basta copiare “Wi-Fi = casa”. Fonti: [networking Companion](https://companion.home-assistant.io/docs/troubleshooting/networking/), [sicurezza della connessione](https://companion.home-assistant.io/docs/getting_started/connection-security-level/), consultate il 2026-10-30. Gli esempi storici di porta in quella guida non prevalgono sul rilevamento effettivo della porta HA.

Proposta di comportamento offline: client già associato, credenziale locale ancora valida e certificati utilizzabili devono permettere il controllo LAN senza interrogare il cloud a ogni comando. Rinnovo, scadenze, nuove associazioni e revoche richiedono regole esplicite; l'indipendenza dal cloud non è dimostrata. Con centrale e LAN operative ma WAN assente, automazioni locali e accesso locale vanno verificati separatamente dalle integrazioni che dipendono da Internet. Se la centrale è spenta, un relay non la sostituisce.

## Cosa esiste oggi nei sorgenti

Osservazioni in sola lettura del 2026-10-30, albero di lavoro con modifiche preesistenti; HEAD 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69. Nessuna prova runtime.

| Evidenza | Implicazione per la proposta |
|---|---|
| [config.ts](../../../progetto/client/core/src/config.ts), righe 20-56: IPv4 private/loopback e origine HTTP costruita da host/porta. | Mancano URL alternativi completi e identità della casa; non basta aggiungere un indirizzo remoto nel wizard. |
| [health.ts](../../../progetto/client/core/src/health.ts), righe 23-35: salute con status/versione. | Non è una verifica dell'identità stabile o di tutte le capacità della casa. |
| [browserReset.ts](../../../progetto/client/core/src/browserReset.ts), righe 13-14; [Electron main.ts](../../../progetto/client/windows/src/main.ts), righe 109-116. | Origine diversa attiva il reset di storage/cache al lancio. Locale/remoto della stessa casa deve essere distinto da cambio impianto. |
| [AcaShellPlugin.java](../../../progetto/client/android/android/app/src/main/java/it/acasystem/client/AcaShellPlugin.java), righe 118-123; [UiActivity.java](../../../progetto/client/android/android/app/src/main/java/it/acasystem/client/UiActivity.java), righe 90-95. | Anche Android gestisce il reset dei dati del browser al cambio server. Non va semplicemente disabilitata la separazione fra case diverse. |
| [localServer.ts](../../../progetto/client/windows/src/localServer.ts), import HTTP e righe 240-242; [LocalServer.java](../../../progetto/client/android/android/app/src/main/java/it/acasystem/client/LocalServer.java), righe 81-87. | Proxy upstream HTTP; cambiare il target non trasferisce i socket esistenti. Servono progettazione TLS e cambio coordinato, non solo parser più permissivo. |
| [useMobileConnectionRecovery.ts](../../../progetto/acasystem/frontend/src/hooks/useMobileConnectionRecovery.ts), righe 77-115. | Esiste recupero su eventi del browser per vista mobile; nei percorsi esaminati non emergono discovery ACA e selezione automatica locale/remoto. |

La discovery dei dispositivi domotici tramite HA è diversa dalla ricerca della centrale ACA. Il frontend web con percorsi relativi non rende automaticamente compatibili i proxy nativi con HTTPS. I dati comuni/locali e le sessioni restano quelli distinti in U21; il cambio percorso non deve cancellarli o mischiarli con un'altra casa.

## Verifiche future e punto di ripresa

Tutte le prove sono **NON ESEGUITE**; nessun ambiente o harness predisposto:

| Prova proposta | Evidenza richiesta |
|---|---|
| Prima associazione e secondo client | Centrale corretta, codice scaduto/riusato respinto, permessi propri; bootstrap mini PC senza configurare IP. |
| IP modificato e annunci duplicati | Stessa casa riconosciuta dopo verifica, nessun invio di credenziali al primo servizio omonimo. |
| LAN→cellulare→LAN | API ACA/HA e WebSocket ristabiliti, dati locali/login conservati, nessuna seconda esecuzione HA. |
| Wi-Fi ospiti, VLAN o permesso negato | Ricerca fallita distinta da centrale spenta; remoto autorizzato disponibile dove consentito. |
| WAN assente, LAN disponibile | Collegamento locale del client già associato utilizzabile con condizioni di fiducia/sessione definite. |
| Revoca, sessione scaduta o certificato errato | Accesso coerente sui percorsi e messaggio appropriato, nessun aggiramento TLS o autorizzativo. |
| Cambio percorso durante un comando | Esito incerto trattato senza duplicazione; stato riletto e vecchie risposte escluse. |
| Servizio remoto o centrale indisponibili | Locale utilizzabile quando possibile; offline esplicito quando la casa non risponde. |

Prima di implementare restano da definire associazione e fiducia TLS, contratto delle API ACA necessarie, autenticazione senza UI HA e soluzione remota con relativa gestione. La fattibilità Android è un prerequisito separato per il tablet esecutore. Nessuna architettura adottata, account/servizio attivati, installazione, modifica al codice/configurazione o prova fra dispositivi. Pin e materiali U11 invariati; iOS rinviato. Proseguire dalle domande dell'utente.
