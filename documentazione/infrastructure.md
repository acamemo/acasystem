# Infrastruttura e operazioni

Aggiornato: 2026-10-05. Banco prova locale HA/Tunet disponibile; ambiente finale del prodotto ancora progettuale. Direzione locale in [ADR-0003](decisions/ADR-0003-home-assistant-locale-fase1.md), installazione in [REP-20261005-004](reports/REP-20261005-004-installazione-tunet.md); problemi nello [stato del progetto](project-status.md).

## Inventario verificato e previsto

| Risorsa | Evidenza attuale | Destinazione prevista |
|---|---|---|
| Repository locale | Git inizializzato; documentazione e copia originale versionate | Storico di codice, configurazioni e documenti quando autorizzati. |
| Area backup locale | ZIP, estrazione e schermate dell'acquisizione Tunet in backup/tunet-acquisizione-20261005/, esclusi da Git | Nessun backup dei dati HA/Tunet; frequenza, accessi e ripristino da progettare. |
| Sorgenti e banco prova Tunet | 1.22.1, revisione 5dec995; Compose e sorgenti in [progetto/](../progetto/README.md). Node 26.10.0/npm 11.19.1 nel container | Personalizzazione UI e sviluppo con ricaricamento automatico ancora da assegnare. |
| Ambiente test/staging | Banco prova su Windows 11 Home, Docker Desktop/WSL 2; HA e Tunet locali | Non è un ambiente di produzione o staging con dispositivi fisici collaudati. |
| Cloud Hetzner storico | Nessuna configurazione acquisita; REQ-01 ritirato dall'utente | Escluso dalla direzione corrente; nessun fornitore sostitutivo scelto. |
| DNS e TLS | Domini del PRD sono esempi; nessuna proprietà o configurazione verificata | Endpoint e certificati da definire. |
| Host locale e client del pilota | Macchina corrente Windows/Docker, container Linux; frontend nel browser locale. HA 2026.9.4 installato dall'utente | Linux 64 bit ARM64/x86-64; mini PC/Raspberry, tablet e dispositivi fisici da scegliere. |
| Rete cablata e Wi-Fi | Descrizione umana preliminare; topologia e funzione della componente Wi-Fi da chiarire | Collegamenti locali, reti dei dispositivi e condizioni offline da documentare. |
| Hardware condiviso da più utenti | Valutazione richiesta; capacità e isolamento non provati | Distinguere stesso impianto da abitazioni separate, senza scegliere una topologia. |
| Repository remoto / CI | Nessun remote o workflow configurato | Scelta successiva, con controlli e accessi da definire. |

Non registrare segreti o identificativi personali non necessari. Per ogni futura risorsa annotare ambiente, responsabile, configurazione versionata, costo/budget se pertinente, data dell'ultima verifica e riferimento al report.

## Componenti candidati

Home Assistant e il riferimento frontend React Tunet sono approvati come direzione. Nel banco prova sono installati HA Container 2026.9.4 e Tunet 1.22.1; il metodo/versioni dell'hardware finale restano aperti. Il lockfile upstream conserva le dipendenze Tunet; HAKit non è stato aggiunto.

Docker Compose, reverse proxy, tunnel, database e motore AI erano candidati originali; non sono tutti prerequisiti della fase grafica. Se necessari, motivarne uso e collocazione locale nel relativo incarico. Hetzner e i tier CPX originali restano soltanto nello storico della proposta ritirata.

Le porte, i record DNS e i percorsi proposti nel PRD non costituiscono la configurazione operativa del prodotto. Il banco prova usa soltanto gli endpoint e percorsi seguenti.

## Banco prova verificato il 2026-10-05

- HA preesistente: container homeassistant, porta host 8123 su tutte le interfacce come installato dall'utente, dati `C:\homeassistant\config` → `/config`. Questa configurazione esterna al repository non è stata modificata né importata in Git.
- Tunet: [compose.tunet.yaml](../progetto/compose.tunet.yaml), progetto Compose aca-tunet, immagine locale aca-tunet:1.22.1-aca-home-ts1 dopo REP-20261005-006 (baseline aca-tunet:1.22.1-5dec995 conservata), container aca-tunet-tunet-1; ascolto host `127.0.0.1:3002`.
- Browser → HA: `http://localhost:8123`, OAuth2 completato dall'utente; Tunet mostra CONNECTED e Authenticated via OAuth2. Non esiste un nuovo account remoto ACA/Tunet.
- Backend → HA: `http://host.docker.internal:8123`; challenge WebSocket auth_required ricevuta e schermata profili senza errore. Le credenziali non sono state lette o registrate dall'agente.
- Tunet → dati: volume Docker aca-tunet_tunet-data → `/app/data`; SQLite/profili, cifratura upstream off. Layout e sessione browser sono separati dal volume.
- Build: Dockerfile upstream node:26-alpine e npm ci; baseline upstream registrata e primo incremento HOME TS/italiano/mx-icons applicato. Lockfile corrente conserva le versioni preesistenti e aggiunge le dipendenze del report di migrazione. Il tag base è mobile; digest/versioni osservati nel report. Nessuna CI è attiva.

Procedura di avvio eseguita e comandi di gestione pianificati in [progetto/README.md](../progetto/README.md). Il comando Compose riguarda Tunet e non ricrea HA. Persone/client della LAN, remoto, TLS, backup e riavvio offline non sono stati collaudati; la porta Tunet è riservata alla macchina corrente.

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
