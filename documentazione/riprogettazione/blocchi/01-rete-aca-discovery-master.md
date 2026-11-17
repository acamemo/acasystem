# Blocco 1 Rete ACA ricerca dei nodi e ruolo del master

Aggiornato: 2026-10-30. Fonte umana: [U22](../diario/2026-10-30.md#u22-ricerca-dispositivi-aca-e-master). [Ingresso](../README.md), [report](../../reports/REP-20261030-006-rete-aca-discovery-master.md). Stato: proposta da discutere, analisi completata; nessuna implementazione o prova.

**Seguito del 2026-10-30:** [U23, associazione e scelta locale/remoto](01-associazione-discovery-locale-remoto.md) approfondisce il percorso cliente, ricerca verificata, identità della casa separata dagli indirizzi, connettore gestito e riconnessione. Nessuna architettura o implementazione adottata.

L'utente propone di cercare i dispositivi ACA domestici, richiedere almeno il tablet fornito a casa oppure un mini PC su richiesta, appoggiarsi ai dispositivi rimasti in casa quando il telefono è fuori e riconoscere come master il dispositivo in uso quando entra nella rete. Vuole mantenere entrambe le strade. Questo amplia le possibilità da valutare rispetto all'iniziale obiettivo senza mini PC; non approva ancora un requisito hardware o un algoritmo di elezione.

**Valutazione dell'assistente:** la rete ACA è una direzione plausibile. Suggerito un esecutore domestico assegnato, tablet se fattibile oppure mini PC, con più client e scelta automatica del percorso locale/remoto. L'eventuale trasferimento automatico del motore HA è una funzione distinta, ancora da progettare e verificare. La raccomandazione non sostituisce una decisione umana.

## Tre significati da separare

| Ruolo | Cosa fa | Può cambiare quando il telefono entra in casa? |
|---|---|---|
| Dispositivo di controllo | Mostra ACA e invia comandi con i permessi dell'utente. | Sì; possono essercene diversi contemporaneamente, senza un capo esclusivo della UI. |
| Percorso di collegamento | Raggiunge la stessa casa direttamente in LAN oppure tramite collegamento remoto autorizzato. | Sì; il client può scegliere il percorso verificato disponibile. |
| Esecutore domestico | Esegue HA, integrazioni e automazioni e ospita le fonti autorevoli dei dati ACA pertinenti. | Solo tramite trasferimento o subentro progettati; la presenza in LAN non basta. |

HA Core contiene stato, eventi, azioni e integrazioni nel processo Python della singola installazione. Il telefono che chiama le sue API non acquisisce questi oggetti o il lavoro in corso. Questa è la ragione tecnica della distinzione fra controllo ed esecuzione. Fonte primaria consultata il 2026-10-30: [architettura Core](https://contributors.home-assistant.io/architecture/core/).

## Come potrebbe funzionare per il cliente

| Situazione | Comportamento proposto dall'assistente |
|---|---|
| Solo tablet domestico | Tablet esecutore e anche schermo ACA; gli altri client si collegano a lui. Fattibilità Android e continuità ancora da dimostrare. |
| Mini PC scelto dal cliente | Mini PC esecutore; tablet, telefoni e computer usano ACA come client. |
| Tablet e mini PC entrambi presenti | Un solo esecutore assegnato per quella casa; l'altro può essere client. Un futuro ruolo di riserva richiede capacità e procedura specifiche. |
| Telefono sulla LAN | Trova il nodo associato e usa il collegamento locale dopo verifica di identità e accesso. Non avvia una seconda copia della casa. |
| Telefono fuori casa | Usa il collegamento remoto verso lo stesso esecutore. La sola ricerca LAN non lo raggiunge. |
| Due persone a casa | Entrambe controllano la stessa casa; non occorrono due HA né un cambio di master a ogni apertura dell'app. |
| Esecutore non raggiungibile | Distinguere problema del percorso da arresto del motore. Mostrare indisponibilità; nessuna promozione automatica del primo dispositivo trovato. |

Il tablet destinato a essere centrale deve restare in casa, alimentato e con il motore operativo. Lo schermo può spegnersi e la UI può chiudersi solo se il futuro host HA mantiene il servizio: lo [studio Android sulla continuità](01-continuita-android.md) non ne ha ancora dimostrato il funzionamento. Con mini PC esecutore il tablet può essere usato come un normale client. Rimangono validi app senza kiosk e frontend HA presente ma non mostrato.

Questa soluzione recupera la scelta tablet/mini PC senza richiedere HA su ogni telefono. La centralità resta un ruolo configurato della casa, non una conseguenza della rete del dispositivo in uso.

## La ricerca dei dispositivi ACA

Una possibilità tecnica è DNS-SD con mDNS: il nodo pubblica un servizio, il client lo cerca e risolve un indirizzo e una porta. Android offre NSD; Windows espone API DNS-SD, fra cui `DnsServiceBrowse`, disponibili da Windows 10 per applicazioni desktop. Sono capacità delle piattaforme, non funzioni ACA già realizzate o librerie selezionate. Fonti primarie consultate il 2026-10-30: [Android NSD](https://developer.android.com/develop/connectivity/wifi/use-nsd), [Microsoft DNS-SD](https://learn.microsoft.com/en-us/windows/win32/api/windns/nf-windns-dnsservicebrowse).

mDNS opera normalmente sul collegamento locale. Reti ospiti, isolamento Wi-Fi e segmenti differenti possono impedire la ricerca anche con Internet funzionante; la sola uguaglianza del nome Wi-Fi non prova raggiungibilità. DNS-SD è un meccanismo di individuazione, non l'elezione di un master o un collegamento da Internet. Fonti: [RFC 6762, sezioni 3 e 14](https://datatracker.ietf.org/doc/html/rfc6762), [RFC 6763](https://datatracker.ietf.org/doc/html/rfc6763), febbraio 2013, consultate il 2026-10-30.

La proposta richiederebbe un'associazione iniziale della casa e del nodo, mantenuta fra cambi IP/rete; dopo la ricerca, verifica dell'identità e sessione autorizzata. Annuncio, nome e indirizzo non concedono permessi. Non pubblicare credenziali negli annunci. Distinguiamo identità stabile della casa, del nodo e del client: trovare un altro ACA non significa poter comandare la sua casa. Il limite di fiducia deriva dalle considerazioni di sicurezza di [RFC 6763, sezione 15](https://datatracker.ietf.org/doc/html/rfc6763#section-15); il metodo concreto di associazione resta da scegliere.

Il client potrebbe provare prima il percorso locale della casa già associata e, se non utilizzabile, quello remoto autorizzato. I due ingressi devono riferirsi alla medesima casa e mantenere le stesse autorizzazioni. Un servizio di incontro/relay o una VPN risolverebbero aspetti diversi della raggiungibilità: restano le alternative dello [studio U21](01-dati-multidispositivo-remoto.md), nessuna scelta o attivata. Non serve trasferire in cloud tutti i dati solo per inoltrare un comando.

## Perché il motore non dovrebbe passare al telefono solo perché entra in LAN

Esempio di rischio, valutazione dell'assistente: tablet e telefono hanno due copie delle stesse automazioni; entrambi ricevono un evento e inviano comandi, oppure aggiornano impostazioni divergenti. La perdita di contatto con il tablet non prova che si sia fermato: potrebbe continuare a comandare i dispositivi dalla propria parte della rete.

Nel Core 2026.10.4 il runner impedisce due processi sulla stessa directory di configurazione tramite `.ha_run.lock`, per evitare anche corruzione dei dati. È un vincolo locale, non un'elezione distribuita fra telefono, tablet e PC. Le fonti Core esaminate non documentano replica del runtime ed elezione native per questo scenario. Non se ne deduce che un sistema di subentro sia impossibile: sarebbe lavoro ACA aggiuntivo. Fonte primaria: [runner.py, tag 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/runner.py), consultata il 2026-10-30.

Per un vero subentro servirebbero almeno capacità equivalenti del candidato, dati coerenti, regole di salute, titolarità esclusiva dei comandi e un modo di impedire al vecchio esecutore di continuare durante una separazione di rete. Priorità e messaggi periodici da soli non risolvono quest'ultimo caso. Vanno definiti anche comandi in corso, riconnessione dei client e recupero del nodo precedente. Sono condizioni progettuali proposte, non componenti esistenti.

Il ripristino di un backup HA permette una migrazione, non trasferisce automaticamente le azioni in esecuzione. Non rende un'app HA OS disponibile sul runtime Android studiato, né sostituisce il trasferimento dei dati ACA. Fonte: [backup HA](https://www.home-assistant.io/common-tasks/general/backups/), consultata il 2026-10-30. Un cambio controllato tablet→mini PC sarebbe quindi un primo caso diverso dal subentro automatico per guasto.

Esistono inoltre vincoli fisici: per esempio una rete Zigbee ha un solo coordinatore e ZHA prevede procedure di backup/migrazione della radio. Entrare con il telefono nella LAN non gli trasferisce una chiavetta USB collegata al PC. La continuità di singoli adattatori non equivale a sostituire l'intero server. Fonte primaria: [ZHA, concetti e migrazione](https://www.home-assistant.io/integrations/zha/#backups-and-migration), consultata il 2026-10-30.

## Il paragone con Alexa

L'intuizione app→servizio→nodo domestico è utile, ma Alexa comprende più percorsi. Amazon documenta collegamenti cloud tramite servizi del produttore e collegamenti locali tramite protocolli supportati dai dispositivi Alexa. Un Echo compatibile può fare da hub locale; non ogni comando dell'app passa necessariamente da un Echo. Non è un precedente per promuovere automaticamente a motore il telefono che entra in Wi-Fi. Fonte primaria: [opzioni Smart Home Alexa](https://developer.amazon.com/docs/alexaplus/smarthome/development-options/), aggiornata il 2026-08-28 e consultata il 2026-10-30.

## Cosa rimane aperto e come verificarlo in seguito

La proposta umana apre tablet domestico e mini PC opzionale; la raccomandazione dell'assistente separa ricerca, accesso e motore. Restano da decidere hardware minimo, dati comuni/personali, collegamento remoto, associazione dei client e necessità effettiva di una riserva. Nessun nuovo requisito o ADR accettato dalla sola discussione.

Tutte le prove seguenti sono **NON ESEGUITE** e non costituiscono incarichi attivi:

| Prova futura | Evidenza necessaria |
|---|---|
| Tablet esecutore | Compatibilità del runtime e delle integrazioni; UI chiusa/display spento, energia, rete, stop e riavvio. |
| Ricerca Android/Windows | Nodo corretto individuato, cambio IP e nomi duplicati gestiti; reti isolate riconosciute senza falsa elezione. |
| Due o più client | Stessa casa e dati coerenti, un solo motore delle automazioni, permessi distinti. |
| LAN→cellulare→LAN | Identità della casa invariata, API ACA/HA e connessioni aggiornate; nessun comando duplicato durante il cambio percorso. |
| Guasto di rete o motore | Indisponibilità distinta da arresto, nessuna esecuzione concorrente avviata per semplice timeout. |
| Migrazione controllata | Dati ACA/HA e credenziali gestiti, radio disponibili sul nuovo nodo, vecchio esecutore escluso, recupero verificato. |
| Eventuale subentro automatico | Requisiti separati, esclusione del vecchio esecutore e perdita dati/tempo di ripresa misurati anche con rete divisa. |

Nessuna installazione, ricerca LAN attiva, elezione, migrazione, servizio remoto o modifica al codice/configurazione eseguita. Pin e materiali U11 invariati; iOS rinviato. Proseguire dalle domande dell'utente.
