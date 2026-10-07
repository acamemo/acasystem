# Infrastruttura e operazioni

Aggiornato: 2026-10-07. Banco prova locale Acasystem 0.1/HA disponibile; ambiente finale del prodotto ancora progettuale. Direzione locale in [ADR-0003](decisions/ADR-0003-home-assistant-locale-fase1.md), installazione iniziale in [REP-20261005-004](reports/REP-20261005-004-installazione-tunet.md), aggiornamento e verifiche correnti in [REP-20261006-002](reports/REP-20261006-002-ripresa-revisione.md); problemi nello [stato del progetto](project-status.md).

## Banco corrente verificato il 2026-10-07

- [Compose](../progetto/compose.tunet.yaml): progetto `aca-tunet`, container `aca-tunet-tunet-1`, immagine `aca-system:0.2` dal 2026-10-07 (REP-20261007-001; prima `aca-system:0.1`, `sha256:be0f93a…7b09c8`), porta `127.0.0.1:3002`. Immagine in esecuzione `sha256:de33f566b4927ca340f4fd7d9025d0d322df46f2d136843881d578de04d88ae7`, stato `healthy`; `/api/health` risponde `{"status":"ok","version":"0.1.0"}`.
- Sorgenti in `progetto/acasystem/`: workspace frontend React/Vite e backend Express, applicativo TypeScript con controlli strict. Dockerfile Node 26 Alpine; frontend compilato e backend TypeScript eseguito da Node. Il codice dell'interfaccia Tunet sostituita è stato cancellato il 2026-10-07 (ISSUE-029); le istantanee `usa-come-git/v009`–`v011` lo conservano.
- Volume persistente invariato: `aca-tunet_tunet-data` → `/app/data`. Cifratura applicativa `off`. Copia a freddo del volume presente in `backup/banco/tunet-data-20261007-pre-acasystem-freddo.tgz` (8516 byte), eseguita prima dell'aggiornamento autorizzato. Nessuna prova di ripristino dei dati, nessun backup automatico o nuovo backup HA.
- Backend → HA: `TUNET_INTERNAL_HA_URL=http://host.docker.internal:8123`. L'identità viene verificata soltanto presso gli URL configurati sul server; un URL HA inviato dal client non viene usato. Senza configurazione valida, le API protette rispondono 503 `HA_URL_NOT_CONFIGURED` (SEC-1).
- **Dal 2026-10-07 (ADR-0009, REP-20261007-002), Browser → Acasystem → HA:** il browser parla solo con `http://localhost:3002/`. Il server inoltra a HA sotto `/ha` (lista consentita, WebSocket incluso) e l'accesso avviene con la pagina Acasystem. Requisiti di HA e limiti nel [README del progetto](../progetto/acasystem/README.md). Esposizione di HA in rete (porta 8123) invariata: la chiusura è una decisione da prendere con l'installazione del pilota.
- Storico, prima di ADR-0009: Browser → HA con sessione OAuth2 preesistente conservata dopo il ricaricamento su `http://localhost:3002/`. Il pannello Sistema mostra «Collegato» a `http://localhost:8123`; copertina, pagina Principale e ritorno da Sistema verificati nel browser laterale. Nessun comando a dispositivi fisici eseguito.
- Inter è servito localmente. Mappe OpenStreetMap, loghi esterni e risorse fornite dalle integrazioni HA possono richiedere internet (ISSUE-016); questa verifica non certifica funzionamento completo offline, LAN/remoto o dispositivi.

Per avviare l'immagine già costruita: `docker compose -f progetto/compose.tunet.yaml up -d --no-build`. Per ricostruire dai sorgenti: stesso comando con `--build`; questo crea un nuovo artefatto e richiede le verifiche del relativo incarico. Il ripristino della versione precedente è documentato in REP-20261006-002; non è una prova di ripristino dei dati. Le sezioni datate 2026-10-05 sotto conservano lo stato storico.

## Inventario verificato e previsto

| Risorsa | Evidenza attuale | Destinazione prevista |
|---|---|---|
| Repository locale | Git inizializzato; documentazione e copia originale versionate | Storico di codice, configurazioni e documenti quando autorizzati. |
| Area backup locale | Acquisizione Tunet in backup/tunet-acquisizione-20261005/; copie manuali del volume in backup/banco/, escluse da Git | Backup HA, automazione, frequenza, accessi e ripristino da progettare e provare. |
| Sorgenti e banco prova Acasystem | 0.1.0, derivato da Tunet 1.22.1 revisione 5dec995; [progetto/](../progetto/README.md), frontend «OS» Metallo e backend TypeScript | Demo in ufficio; ulteriore sviluppo solo su incarico. |
| Ambiente test/staging | Banco prova su Windows 11 Home, Docker Desktop/WSL 2; HA e Tunet locali | Non è un ambiente di produzione o staging con dispositivi fisici collaudati. |
| Cloud Hetzner storico | Nessuna configurazione acquisita; REQ-01 ritirato dall'utente | Escluso dalla direzione corrente; nessun fornitore sostitutivo scelto. |
| DNS e TLS | Domini del PRD sono esempi; nessuna proprietà o configurazione verificata | Endpoint e certificati da definire. |
| Host locale e client del pilota | Macchina corrente Windows/Docker, container Linux; frontend nel browser locale. HA 2026.9.4 installato dall'utente | Linux 64 bit ARM64/x86-64; mini PC/Raspberry, tablet e dispositivi fisici da scegliere. |
| Rete cablata e Wi-Fi | Descrizione umana preliminare; topologia e funzione della componente Wi-Fi da chiarire | Collegamenti locali, reti dei dispositivi e condizioni offline da documentare. |
| Hardware condiviso da più utenti | Valutazione richiesta; capacità e isolamento non provati | Distinguere stesso impianto da abitazioni separate, senza scegliere una topologia. |
| Repository remoto / CI | Nessun remote o workflow configurato | Scelta successiva, con controlli e accessi da definire. |

Non registrare segreti o identificativi personali non necessari. Per ogni futura risorsa annotare ambiente, responsabile, configurazione versionata, costo/budget se pertinente, data dell'ultima verifica e riferimento al report.

## Componenti candidati

Home Assistant e il riferimento frontend React Tunet sono approvati come direzione. Nel banco prova sono installati HA Container 2026.9.4 e Acasystem 0.1, derivato da Tunet 1.22.1; il metodo/versioni dell'hardware finale restano aperti. Le dipendenze correnti sono nel lockfile dei workspace; HAKit non è stato aggiunto.

Docker Compose, reverse proxy, tunnel, database e motore AI erano candidati originali; non sono tutti prerequisiti della fase grafica. Se necessari, motivarne uso e collocazione locale nel relativo incarico. Hetzner e i tier CPX originali restano soltanto nello storico della proposta ritirata.

Le porte, i record DNS e i percorsi proposti nel PRD non costituiscono la configurazione operativa del prodotto. Il banco prova usa soltanto gli endpoint e percorsi seguenti.

## Banco prova verificato il 2026-10-05

- HA preesistente: container homeassistant, porta host 8123 su tutte le interfacce come installato dall'utente, dati `C:\homeassistant\config` → `/config`. Questa configurazione esterna al repository non è stata modificata né importata in Git.
- Tunet: [compose.tunet.yaml](../progetto/compose.tunet.yaml), progetto Compose aca-tunet, immagine locale aca-tunet:1.22.1-aca-panels-neu1 dopo REP-20261005-010 (precedenti immagini gestione, HOME Neumorphism, HOME TS e baseline aca-tunet:1.22.1-5dec995 conservate), container aca-tunet-tunet-1; ascolto host `127.0.0.1:3002`.
- Browser → HA: `http://localhost:8123`, OAuth2 completato dall'utente; Tunet mostra CONNECTED e Authenticated via OAuth2. Non esiste un nuovo account remoto ACA/Tunet.
- Backend → HA: `http://host.docker.internal:8123`; challenge WebSocket auth_required ricevuta e schermata profili senza errore. Le credenziali non sono state lette o registrate dall'agente.
- Tunet → dati: volume Docker aca-tunet_tunet-data → `/app/data`; SQLite/profili, cifratura upstream off. Layout e sessione browser sono separati dal volume.
- Build: Dockerfile upstream node:26-alpine e npm ci; baseline upstream registrata e HOME TS/italiano/mx-icons e primo materiale Neumorphism applicati. La ripresa del design non aggiunge dipendenze. Lockfile corrente conserva le versioni preesistenti e aggiunge le dipendenze del report di migrazione. Il tag base è mobile; digest/versioni osservati nel report. Nessuna CI è attiva.

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

Aggiornamento locale REP-20261005-010: runtime osservato sha256:a6b097e6f92effd06948b45beedfaa6e2f6aafce4c54e2a6d37829cf50483b47, healthy. Dopo un tentativo di rebuild offline del Dockerfile upstream fallito sul passaggio apk non presente in cache, il builder e il runtime sono stati derivati dalle immagini locali dell'intervento precedente, copiando i sorgenti/build attuali, senza reinstallare pacchetti. Dockerfile temporanei ed evidenze restano in backup/panels-skeleton-20261005, esclusi da Git. Dockerfile upstream, lockfile, HA e volume dati invariati; resta valido il limite del tag base mobile per ricostruzioni future.
