# ADR-0049 — Strumenti diretti e widget di prodotto per dispositivo

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0049 — Separare gli strumenti del catalogo dai widget di prodotto; un nuovo widget completo per dispositivo HA, con consegne per famiglia. |
| Stato | Accettata; attuazione e verifiche distinte nel report. |
| Data e autore | 2026-11-09, Codex; nome esatto del modello non disponibile. |
| Decisore e autorizzazione | Scelte esplicite dell’utente nella chat corrente: un widget completo per dispositivo, con funzioni compatibili nella propria schermata; raggiungimento del widget già presente e consegne per famiglie. Precisa che Trova dispositivi e Tavano aprono subito i rispettivi strumenti, che la prima famiglia è Luci e che tecnica/manutenzione hanno una sezione separata. Autorizza quindi «PLEASE IMPLEMENT THIS PLAN: Trova dispositivi, Tavano e widget di prodotto», nella chat corrente, registrato in [REP013](../reports/REP-20261109-013-utilita-e-luci-per-dispositivo.md). |
| Collegamenti | [REQ-18/19 e prodotto](../funzionalita/product.md), [matrice HA/widget](../riprogettazione/matrice-widget-ha.md), [ADR-0004](ADR-0004-principi-frontend.md), [ADR-0019](ADR-0019-memoria-per-dispositivo.md), [ADR-0022](ADR-0022-identita-di-servizio-dispositivi.md), [ADR-0024](ADR-0024-aggiunta-libera-dispositivi-scoperti.md), [ADR-0048](ADR-0048-catalogo-widget-tendina.md), [REP012](../reports/REP-20261109-012-widget-da-catalogo-a-posizionamento.md). |
| Sostituisce / sostituita da | Supera il solo comportamento del tap sulle due utilità, che in REP012 creava un'anteprima di inserimento come ogni altro tipo. Conserva il catalogo a gesti di ADR-0048 e il posizionamento con conferma di REP012. Nessuna sostituzione globale di ADR-0019 o delle identità dei widget. |

## Contesto ed evidenze

Il catalogo contiene 28 tipi ACA. Un tipo grafico, un dominio di entità HA, una config entry e un dispositivo fisico sono concetti diversi. Un'integrazione o un hub può produrre più dispositivi; uno stesso dispositivo può offrire più canali luce, sensori e comandi tecnici. I dati dell'Excel umano descrivono integrazioni, domini e servizi dello snapshot HA `dev d5fc37f` del 2026-11-04, non i dispositivi installati e non la loro compatibilità hardware. Provenienza, hash e limiti sono nella [matrice](../riprogettazione/matrice-widget-ha.md).

Il percorso storico di scoperta passa tipo, entità e telecomando ad «Aggiungi un widget» e può creare più schede per entità. REP012 ha introdotto un altro percorso: seed provvisorio, pagina idonea più vicina, anteprima isolata e inserimento soltanto dopo conferma autorevole. Il nuovo comportamento riusa quest'ultimo per la famiglia migrata, preservando i percorsi delle altre famiglie.

Il modello operativo esistente estrae capacità da entità, attributi, `supported_features` e servizi effettivamente disponibili. La presenza di un servizio non attribuisce privilegi all'utente. I comandi rimangono sul percorso tracciato con il suo token HA; l'identità tecnica per configurare le integrazioni resta separata, dichiarata e revocabile. Le estensioni F4 già approvate non vengono ristrette di nuovo a un elenco di marche o a sole TV.

## Decisione

1. **Catalogo:** Trova dispositivi è il primo accesso e Tavano il secondo. Entrambi attivano `open-tool`; gli altri tipi conservano `place-widget`. La consultazione non crea widget né salva il profilo. L'apertura dal catalogo e quella da un widget Home raggiungono la stessa interfaccia dello strumento. Le utilità Home già salvate restano valide; «Aggiungi alla Home» è un'azione secondaria nello strumento e usa il posizionamento con conferma.
2. **Dispositivo completo:** una nuova creazione della famiglia migrata rappresenta un dispositivo HA, con le sue funzioni compatibili nella medesima schermata. La prima famiglia è **Luci**, compresi i canali `light.*` dello stesso `device_id`. Le funzioni d'uso, le misure e la sezione tecnica/manutenzione sono riconoscibili e separate. Le altre 14 tipologie di prodotto native mantengono widget e flussi correnti finché vengono progettate e verificate nelle rispettive consegne.
3. **Associazione versionata:** `CardSettings.productDevice` contiene `ProductDeviceBinding` versione 1: `deviceId`, `family`, `primaryEntityId`, `channelEntityIds`, `secondaryEntityIds` e, quando presente, `technicalEntityIds` derivato da `entity_category`. Si usano solo entità abilitate e visibili del dispositivo esatto. La stessa entry, marca, area o un nome simile non sono prove di appartenenza al medesimo dispositivo. Un dispositivo può essere assente o non raggiungibile senza che gli vengano inventati stati o capacità.
4. **Identità conservate:** `deviceId` è l'identificativo del registro HA; `profileId` e ID del widget ACA restano distinti. Non sostituisce globalmente `widgetDeviceKey`, che sostiene associazioni, propagazione e memoria storiche. Non si riscrivono ID, disposizione, preferenze o collegamenti dei widget esistenti. Un collegamento manuale che cambia l'entità principale rende inapplicabili i vecchi metadati `productDevice`: si usa il comportamento compatibile, senza pulizie automatiche o comandi ai vecchi canali.
5. **Dispositivo già rappresentato:** il tap raggiunge il widget esistente nel profilo corrente. Se ci sono più destinazioni storiche, si sceglie quale aprire; non si fondono né cancellano schede. Il resolver comprende pagine logiche, segmenti visuali e membri delle pile. Una destinazione nascosta apre la propria schermata senza cambiare visibilità, regole o disposizione. Non si accede ai profili degli altri utenti.
6. **Nuovo dispositivo:** se è già configurato in HA si prepara il seed associato. Se è soltanto scoperto, prima si completa il flusso HA necessario e si rileggono registri e stati. Un hub con N dispositivi torna a un elenco di dispositivi distinti, senza scegliere arbitrariamente il primo dell'entry. PIN, consensi e altri passi reali non vengono simulati né saltati.
7. **Inserimento:** il seed associato riusa il planner e la conferma della .57. Prima di «Conferma» non si scrive nel profilo e l'anteprima non impartisce comandi. L'ID resta stabile nel recupero; configurazione, associazione e posizione appartengono allo stesso salvataggio, con verifica della risposta autorevole. Mancanza di spazio, uso perso, conflitti o risultato incerto restano espliciti. Annullare la posizione non rimuove un'integrazione HA già configurata: il dispositivo resta collegato e disponibile nello strumento.
8. **Fonte di copertura:** la matrice documentale collega i 45 domini dell'Excel ai 28 tipi ACA e distingue prodotto, hub, helper e servizio. Non è un catalogo di modelli, una dipendenza runtime o un'autorizzazione a creare 45 prodotti nuovi. «Completo» si riferisce al perimetro della famiglia verificata; non dichiara disponibili tutti i parametri di tutti i servizi HA.

## Alternative e motivazioni

- **Un widget per ogni entità:** conserva il modello storico, ma frammenta un dispositivo multicanale. Non è la direzione scelta per le nuove famiglie; i widget già salvati rimangono utilizzabili.
- **Un widget universale per ogni dominio HA:** non corrisponde alla richiesta e confonde prodotti, helper e servizi. La scelta è riusare i widget di famiglia e svilupparli in consegne verificabili.
- **Aggregare per integrazione o hub:** può associare funzioni di apparecchi diversi. Il raggruppamento accettato usa l'esatto `device_id`.
- **Migrare automaticamente gli esistenti:** rischia di perdere personalizzazioni o modificare il significato di associazioni storiche. La scelta conserva i dati e risolve le destinazioni senza riscriverli.
- **Aggiungere le utilità appena toccate nel catalogo:** richiede un inserimento prima della consultazione. Gli accessi diretti e l'azione secondaria Home mantengono entrambe le possibilità senza quella scrittura anticipata.

## Conseguenze

Il frontend aggiunge un contratto condiviso e un resolver per Luci. Le capacità e i controlli si distinguono per canale, preservando gli ID dei controlli principali; funzioni prive di supporto, connessione o autorizzazione non diventano comandi utilizzabili. Le entità diagnostiche/configurative restano tecniche secondo il registro, senza deduzioni dal nome. Non si abilitano entità nascoste/disabilitate. Nell'attuazione iniziale `update` ed `event` secondari sono leggibili; non vengono introdotte installazioni firmware automatiche.

Materiali, primitive, animazioni e fotografia ACA restano quelli confermati. Il redesign non autorizza un nuovo tema, stack, protocollo di autenticazione, privilegio o scansione di rete autonoma. Il nuovo contratto nei sorgenti distribuiti va incluso nelle verifiche di provenienza; non implica aggiornamenti di dipendenze o runtime.

La memoria ADR-0019 rimane distinta dall'identità fisica del nuovo binding: metadati che identificano un altro dispositivo non devono essere copiati come semplice aspetto. Altri widget e configurazioni storiche mantengono il comportamento previsto dalle decisioni applicabili.

## Verifiche e revisione

Le verifiche e la consegna effettiva sono registrate in [REP013](../reports/REP-20261109-013-utilita-e-luci-per-dispositivo.md). Per Luci sono già disponibili test del resolver, classificazione diagnostica, separazione fra dispositivi dello stesso hub, canali multipli, controlli e target distinti, effetti, luminosità, colore, temperatura, assenza di comandi all'apertura e ricollegamento manuale senza comandi ai vecchi canali. Queste prove usano dati e servizi controllati; non sono collaudi di apparati fisici o certificazioni di copertura dello snapshot `dev`.

Ogni famiglia successiva richiede propri criteri di compatibilità e prove, senza promuovere autonomamente le righe «Da progettare» della matrice. La decisione va rivista se cambia il confine del prodotto, la politica sulle destinazioni storiche o il contratto versionato. Eventuali revisioni conservano i collegamenti e gli esiti precedenti.

### Attuazione della seconda famiglia — 2026-11-10

Il piano umano «Prossima famiglia: Prese e interruttori» assegna e attua `plug` per prese, multiprese e relè, con Home multicanale sintetica e comandi singoli nei dettagli. [REP001](../reports/REP-20261110-001-prese-interruttori-per-dispositivo.md) registra perimetro, verifiche e build locale; il catalogo ora contiene29tipi, senza convertire quelli storici. Il contratto versione1 è riutilizzato, le seconde entità tecniche rimangono separate e la scelta della famiglia considera il ruolo operativo invece di scambiare un LED configurativo per il prodotto principale. Nessuna autorizzazione aggiuntiva per banco o pubblicazione.

### Attuazione della terza famiglia — 2026-11-10

La richiesta umana «vai procediamo con clima» assegna termostati e climatizzatori nel tipo esistente `climate`. [REP002](../reports/REP-20261110-002-clima-per-dispositivo.md) registra criteri, verifiche e build locale. Contratto versione 1, esatto device_id, temperature e capacità effettive, canali distinti e tecnica separata. L'associazione usa `climateId`, senza sostituire globalmente la memoria dei widget; metadati incoerenti non attivano il nuovo renderer. Home multicanale sintetica e comandi indipendenti nei dettagli. Catalogo 29 tipi e percorsi storici conservati. Nessuna estensione implicita a scaldacqua, umidificatori, banco o pubblicazione.

### Attuazione della quarta famiglia — 2026-11-10

La conferma umana «procedi» assegna Tapparelle, tende e veneziane nel tipo esistente `cover`. [REP003](../reports/REP-20261110-003-tapparelle-tende-per-dispositivo.md) registra perimetro e verifiche. Un widget per esatto dispositivo, `coverId`, canali ordinari e tecnica distinta. Stato ricevuto e posizione richiesta rimangono separati; capacità Apri/Stop/Chiudi indipendenti e regolazione inclinazione secondo dati reali. Stop resta utilizzabile durante le attese, senza fingere di annullare richieste già ricevute da HA. Legacy e memoria non migrati, nessuna nuova infrastruttura, velocità o aggiornamento del banco impliciti.

### Attuazione della quinta famiglia — 2026-11-10

La conferma umana «vai» assegna Ventilatori nel tipo esistente `fan`. [REP004](../reports/REP-20261110-004-ventilatori-per-dispositivo.md) registra perimetro e verifiche. Contratto versione 1 ed esatto device_id, `bindingEntityId` conservato, canali ordinari e tecnica distinti. Home multicanale sintetica; velocità/passo, preset, oscillazione e direzione dipendono da dati, feature e servizi effettivi. Stato ricevuto e richieste restano separati; Spegni supportato non viene bloccato dalle regolazioni pendenti, senza promessa di priorità o annullamento nel gateway. Legacy e memoria non migrati, nessuna nuova dipendenza o infrastruttura; banco e pubblicazione esclusi.

### Assegnazione delle famiglie sicurezza — 2026-11-11

La richiesta umana «FAI serrature, poi allarme e videocamere» assegna tre fasi ordinate registrate nel [REP001](../reports/REP-20261111-001-serrature-allarme-videocamere.md). Contratto v1, esatto device_id, chiavi storiche e compatibilità preservati. Canali/capacità, conferme e codici transitori, uso e tecnica separati; streaming Camera attraverso il trasporto esistente sul solo canale attivo. Nessuna nuova infrastruttura, privilegio o migrazione globale, né aggiornamento del banco o pubblicazione. Stato di attuazione e copertura non sono impliciti nell'assegnazione: restano nel report e nella matrice.

### Attuazione delle famiglie sesta, settima e ottava — 2026-11-11

Richiesta umana sopra attuata nel [REP001](../reports/REP-20261111-001-serrature-allarme-videocamere.md), build locale.63. Lock/alarm/camera mantengono chiavi storiche e contratto v1, canali per esatto dispositivo e fallback legacy; codici transitori/conferme e capacità HA effettive. Camera usa un solo feed attivo sul trasporto esistente e sospende Home coperta, senza nuova API o protocollo. Uso e tecnica separati, copie/profili/account preservati. Matrice versione6 mantiene parziale la copertura dei domini HA: nessuna compatibilità universale dichiarata.1213frontend/28backend e QA pacchetto verificati, hardware/banco/pubblicazione distinti. Proposte155/156 non promosse ad assegnate.

### Assegnazione delle famiglie nona e decima — 2026-11-11

La richiesta umana «vai con area robot» assegna Aspirapolvere poi Tagliaerba dopo la proposta nella chat corrente. [REP002](../reports/REP-20261111-002-area-robot-aspirapolvere-tagliaerba.md), build locale .64 prevista. Tipi vacuum/mower e bindingEntityId conservati, esatto device_id e contratto v1; Home sintetica, capacità e canali effettivi, uso/tecnica separati. Stanze/mappe solo da esposizioni e associazioni esplicite, senza nuove scansioni o privilegi. Legacy preservato; banco e pubblicazione distinti. Assegnazione e attuazione/verifica rimangono stati separati.

### Attuazione delle famiglie nona e decima — 2026-11-11

Area Robot attuata nella build locale .64, [REP002](../reports/REP-20261111-002-area-robot-aspirapolvere-tagliaerba.md). Esatto device_id, v1 e bindingEntityId conservati; canali e capacità reali, comandi indipendenti e nessuna azione collettiva. Stanze dal mapping HA già configurato, mappe proprie o esplicite, senza euristiche per nomi/entry o API admin aggiuntive. Legacy e preferenze conservati, uso/tecnica distinti. Matrice versione7 mantiene parziale la copertura dei domini; QA simulato e ultimo esito qualificato1427frontend/28backend documentati, hardware/banco/pubblicazione separati.


### Assegnazione dell'area Multimedia — 2026-11-11

La richiesta umana «procedi», dopo la proposta Android TV e Apple TV, quindi Sonos e lettori generici, assegna le famiglie tv/sonos/media. [REP003](../reports/REP-20261111-003-area-multimedia.md) documenta l'attuazione locale .65. Contratto v1 ed esatto device_id, identità storiche mediaPlayerId/mediaIds e gruppi espliciti preservati; nessuna associazione automatica per nome, marchio o intera integrazione. Capacità effettive, canali ordinari e tecnica distinti, transizioni e trasporti esistenti. Nessuna autorizzazione implicita per banco o pubblicazione.


### Attuazione dell'area Multimedia — 2026-11-11

[REP003](../reports/REP-20261111-003-area-multimedia.md), build locale .65: tv/sonos/media v1 per esatto dispositivo, identità mediaPlayerId/mediaIds, gruppi e corpi legacy conservati. Canali ordinari, capacità effettive, uso e tecnica distinti; Home sintetica, dettagli comuni e nessun invio pendente dopo chiusura/cambio canale.211 test dedicati e QA ZIP22flussi/22cold/20visuali PASS;6 test storici riprodotti sulla .64 restano in ISSUE-134. Matrice versione8 mantiene parziale la copertura dei domini HA. Banco, pubblicazione e hardware reali separati.

### Assegnazione dell'area Sensori — 2026-11-11

La richiesta umana «procedi con area sensori» assegna la famiglia dopo la proposta di temperatura/umidità, movimento/presenza, aperture, aria/fumo/allagamento. [REP004](../reports/REP-20261111-004-area-sensori.md), attuazione verificata nella build locale .66, con 237 casi dedicati e QA6flussi/6cold/5visuali simulati PASS. Contratto v1, esatto device_id ed entityId conservati; canali sensor/binary_sensor ordinari, unità/stati osservati e cronologia pertinente, tecnica distinta. Nessuna nuova soglia o garanzia di sicurezza fisica. Le altre tredici famiglie conservano priorità; non si duplicano i loro dispositivi per le telemetrie secondarie. Helper e comandi restano nel percorso generico con modalità distinta: tab locali senza scritture, selezione atomica con ACK, preferenze conservate e nessuna conversione automatica dei widget raw. Stato di attuazione e prove nel report; banco, hardware e pubblicazione separati.

### Assegnazione dell'area Energia e consumi — 2026-11-11

La richiesta umana «procedi con Energia e consumi» assegna la revisione dei due tipi esistenti `cost` e `nordpool`, [REP005](../reports/REP-20261111-005-energia-consumi.md), attuazione verificata nella build locale .67: 150 casi dedicati e QA qualificata 6 flussi/6 cold/10 visuali simulati PASS. Non introduce una quindicesima famiglia fisica: cost è una composizione di quattro fonti scalari esplicite (powerId opzionale nuovo, consumptionId esistente, todayId e monthId), nordpool mantiene nordpoolId. Contratto generale di identità, ProductDeviceBinding, quattordici famiglie e profili conservati. Unità native e prezzi originali, nessuna somma, formula tariffaria o conversione monetaria; cronologia tramite il componente Sensori e gli adattatori esistenti, senza nuova API statistica, archivio o dashboard Energy HA. Associazione unica per schede storiche e categorie con ACK; unlink soltanto ACA, nessuna pulizia automatica delle vecchie fonti. Dati di preferenze non applicabili conservati, formula norvegese storica non attiva. Stato di attuazione e verifiche nel report; banco, hardware e pubblicazione distinti.

### Assegnazione dell’area Auto — 2026-11-11

La richiesta umana «prossima area procedi», dopo la proposta Auto, assegna la revisione del tipo `car`, [REP006](../reports/REP-20261111-006-area-auto.md), attuazione completata e verificata localmente nella build .68. Rimane una composizione esplicita di fonti manuali: nessuna quindicesima DeviceFamily, nuovo ProductDeviceBinding, dominio universale del veicolo o deduzione fra dispositivi per nome/integrazione. Chiavi scalari/array, alias chargingStateId/chargingId, batteryId come identità storica, memoria e preferenze conservati. Associazione unica con patch mirate/ACK e risposta tardiva isolata, uso/tecnica separati, valori e unità effettivi, comandi già previsti e osservazione distinta dall’invio. Nessun comando automatico o invio automatico di coordinate a servizi esterni. Verifiche e limiti nel report: 196 test Auto PASS e Gate4 6 flussi/6 cold/5 viste PASS su dati sintetici; quattro esiti Energia preesistenti riprodotti sulla .67 restano distinti dal nuovo incarico, senza dichiarare CI interamente verde. Copertura manuale parziale e assenza di risolutore universale conservate; banco, veicoli fisici e pubblicazione distinti.
