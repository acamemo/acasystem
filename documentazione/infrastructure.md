# Infrastruttura e operazioni

Aggiornato: 2026-10-05. Documento progettuale; nessun provisioning è stato eseguito. Direzione locale in [ADR-0003](decisions/ADR-0003-home-assistant-locale-fase1.md), pilota in [pilot-scope.md](funzionalita/pilot-scope.md); problemi ISSUE-005/011/013/014/015 nello [stato del progetto](project-status.md).

## Inventario verificato e previsto

| Risorsa | Evidenza attuale | Destinazione prevista |
|---|---|---|
| Repository locale | Git inizializzato; documentazione e copia originale versionate | Storico di codice, configurazioni e documenti quando autorizzati. |
| Area backup locale | [backup/](../backup/README.md) predisposta, con il solo README; nessuna copia o prova di ripristino | Destinazioni, frequenza, accessi e recupero da progettare nell'incarico dedicato. |
| Ambiente sviluppo applicativo | Nessun manifest o codice di progetto | Runtime/versioni e procedura di avvio da scegliere. |
| Ambiente test/staging | Nessuna configurazione nel repository; risorse esterne non verificate | Collaudo isolato prima dei rilasci. |
| Cloud Hetzner storico | Nessuna configurazione acquisita; REQ-01 ritirato dall'utente | Escluso dalla direzione corrente; nessun fornitore sostitutivo scelto. |
| DNS e TLS | Domini del PRD sono esempi; nessuna proprietà o configurazione verificata | Endpoint e certificati da definire. |
| Host locale e client del pilota | Pilota in ufficio; nessun modello, inventario o collaudo acquisito | Linux 64 bit ARM64/x86-64; mini PC/Raspberry e client da scegliere. |
| Rete cablata e Wi-Fi | Descrizione umana preliminare; topologia e funzione della componente Wi-Fi da chiarire | Collegamenti locali, reti dei dispositivi e condizioni offline da documentare. |
| Hardware condiviso da più utenti | Valutazione richiesta; capacità e isolamento non provati | Distinguere stesso impianto da abitazioni separate, senza scegliere una topologia. |
| Repository remoto / CI | Nessun remote o workflow configurato | Scelta successiva, con controlli e accessi da definire. |

Non registrare segreti o identificativi personali non necessari. Per ogni futura risorsa annotare ambiente, responsabile, configurazione versionata, costo/budget se pertinente, data dell'ultima verifica e riferimento al report.

## Componenti candidati

Home Assistant e il riferimento frontend React Tunet sono approvati come direzione; Linux è a 64 bit. Distro/versione, metodo HA (OS/Container), storage, risorse e servizi necessari a Tunet devono essere analizzati prima dell'installazione. Nessuna versione è fissata come dipendenza installata.

Docker Compose, reverse proxy, tunnel, database e motore AI erano candidati originali; non sono tutti prerequisiti della fase grafica. Se necessari, motivarne uso e collocazione locale nel relativo incarico. Hetzner e i tier CPX originali restano soltanto nello storico della proposta ritirata.

Le porte, i record DNS e i percorsi citati nel PRD non costituiscono una configurazione operativa. Prima del provisioning definire inventario, confini di rete, gestione dei segreti e responsabilità del servizio.

## Procedure operative da definire e provare

Le righe seguenti sono requisiti documentali delle procedure future, non comandi eseguiti o runbook pronti per produzione.

| Procedura | Informazioni necessarie | Evidenza di accettazione |
|---|---|---|
| Installazione/provisioning | Ambiente di destinazione, versioni, prerequisiti, rete, storage, segreti esterni e configurazioni versionate | Avvio in ambiente autorizzato, servizi attesi raggiungibili, accessi non previsti rifiutati. |
| Deploy/aggiornamento | Artefatto/versione, compatibilità gateway-client-backend, controlli iniziali, eventuali migrazioni e sequenza | Verifiche funzionali pertinenti e versione osservata dopo il rilascio. |
| Ripristino di versione | Condizioni di attivazione, versione precedente, compatibilità dati e responsabile | Ritorno verificato alla versione scelta in test isolato. |
| Backup | Dati/configurazioni inclusi, destinazione, cifratura, accessi, conservazione e responsabilità | Copia disponibile e integra; la sola esecuzione del backup non prova il recupero. |
| Ripristino dati/gateway | Prerequisiti, credenziali esterne, ordine di recupero e trattamento delle configurazioni | Recupero provato con dati di test e controllo delle funzionalità recuperate. |
| Monitoraggio | Salute servizi, gateway offline, disco, certificati, errori e destinatari autorizzati | Simulazione del guasto e segnale osservato. Nessuna notifica è attivata da questo documento. |
| Incidenti | Diagnostica anonimizzata, contenimento, ripresa e report dell'incidente | Cronologia, causa/evidenze e verifica di regressione se pertinente. |

RPO, RTO, disponibilità attesa, retention e frequenze dei controlli non sono definiti: richiedono requisiti e budget del primo rilascio. Definirli senza trasformare stime in garanzie.

## Dati, accessi e trasporto

Separare gli ambienti e descrivere chi può leggere, amministrare o aggiornare ogni servizio quando viene progettato. Segreti forniti tramite meccanismo esterno allo storico; gli esempi di configurazione devono esserne privi. Il registro [compliance.md](compliance.md) raccoglie condizioni dei fornitori e questioni sui dati.

Per LAN/remoto documentare percorso reale, punti di terminazione TLS, autenticazione e isolamento degli impianti. Il meccanismo remoto e la proprietà end-to-end restano da progettare (ISSUE-013). Perdita di internet, riavvio del frontend/gateway e guasto della rete locale richiedono scenari distinti (V-02/V-03/V-15).

Progettare il primo setup con sessione admin aperta soltanto inizialmente e consegna con account cliente. Aggiornamenti, manutenzione e recupero riguardano l'hardware fornito negli immobili; accesso remoto permanente dei sistemisti e distribuzione su una macchina condivisa sono decisioni ancora aperte.

## Regola per i futuri interventi

Ogni operazione necessita di un incarico umano che identifichi ambiente e risultato. Prima del cambiamento acquisire lo stato necessario; dopo registrarne configurazione osservata, verifiche e limiti in un report. Una procedura passa da progettata a provata solo con evidenza; i controlli automatici e i runbook eseguibili saranno introdotti nei relativi incarichi.
