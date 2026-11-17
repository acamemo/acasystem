# ACA — Mappa dei blocchi e dei flussi

Aggiornato: 2026-11-06. Fonte: richiesta umana di raccogliere i blocchi, iniziando da installazione e account; [report della mappatura](../reports/REP-20261104-007-mappa-blocchi-flussi.md).

Questa è la mappa d’ingresso per ragionare sull’applicativo un blocco alla volta. Descrive le scelte correnti e distingue quanto realizzato da quanto resta da completare. I dettagli rimangono in [requisiti](../funzionalita/product.md), [design](../design/design.md), decisioni e verifiche collegate; lo [stato del progetto](../project-status.md) conserva l’avanzamento effettivo.

| Blocco | Contenuto | Uscita del flusso |
|---|---|---|
| **0** | Installazione HAOS + ACA, QR/IP, app Windows e Android | Dispositivo collegato alla centrale ACA |
| **1** | Registrazione, accesso e account personale | Utente autenticato nella propria interfaccia ACA |
| Successivi | Da mappare insieme all’utente | Da definire |

La numerazione **0/1** è quella di questa mappa operativa. I nomi degli studi storici nella cartella `blocchi/` restano invariati: per esempio i documenti `01-*` includono gli studi sull’installazione. Un blocco mappato non è automaticamente completato o collaudato.

## 0. Installazione della centrale e collegamento delle app

**Obiettivo:** una centrale mini PC esegue Home Assistant e ACA come add-on. Le app sono client della centrale; non eseguono una propria copia di HA.

### 0.1 Preparazione della centrale

**Percorso previsto:** installazione HAOS sul mini PC → bootstrap ACA → scaricamento dei materiali pubblicati da GitHub/GHCR → installazione e avvio dell’add-on → centrale pronta al collegamento.

**Stato:** esistono lo script e la procedura di bootstrap, con installazione e ripetizione idempotente provate in una VM HAOS. Non abbiamo consegnato un’immagine HAOS personalizzata già pronta; installazione sul mini PC fisico e funzionamento prolungato restano da collaudare.

Fonti: [procedura mini PC](blocchi/01-mini-pc-client-e-onboarding-web.md), [prova bootstrap HAOS](../reports/REP-20261102-004-prova-bootstrap-su-vm-haos.md), [decisione mini PC e client](../decisions/ADR-0031-ritorno-mini-pc-client.md).

### 0.2 Presentazione del QR e dell’indirizzo

**Percorso desiderato:** avvio del sistema → servizi pronti → apertura automatica della schermata grafica → card centrata con QR e indirizzo testuale selezionabile, senza pulsanti.

La card riprende i testi richiesti: **“Scan QR Code”**, **“Scan this QR Code in-app to verify device.”**, **“Or enter the code manually”** con linee ai lati. Il codice manuale è l’indirizzo della centrale, non un codice segreto.

Il **QR pubblico contiene soltanto l’URL della centrale**: permette di raggiungerla, non autentica l’utente né trasferisce un account. Registrazione e accesso avvengono nel blocco 1.

**Stato:** QR/indirizzo sono già disponibili nel bootstrap a fine procedura e nella sezione Sistema di ACA. La nuova schermata grafica esiste come **anteprima da approvare**; l’apertura automatica all’avvio HAOS non è implementata.

Fonte grafica e limiti: [anteprima QR/IP](../reports/REP-20261104-001-anteprima-collegamento-haos.md).

### 0.3 Collegamento del dispositivo

| Dispositivo | Primo collegamento | Riapertura |
|---|---|---|
| **Windows — Electron** | Inserisci o incolla l’indirizzo IP/URL → verifica centrale → apri webapp ACA | Riutilizza la centrale salvata |
| **Android — Capacitor** | Apri scanner → consenso fotocamera → leggi QR → verifica centrale → apri webapp ACA | Riutilizza la centrale salvata |
| **Android — alternativa** | Annullamento, diniego o errore scanner → inserisci indirizzo manualmente | Come sopra |
| **iPhone — browser** | Fotocamera legge QR → apri URL nel browser; in alternativa digita l’indirizzo | Riapri lo stesso URL |

Windows non richiede la fotocamera. Su Android lo scanner si apre quando manca una centrale configurata. I client usano la webapp comune della centrale; le credenziali si inseriscono nell’interfaccia ACA, senza mostrare quella di HA.

**Stato:** client e percorsi QR/IP implementati e verificati nel software; scanner e permessi Android da verificare anche su hardware. Il collegamento browser PC/iPhone è stato provato sulla LAN, con limiti delle singole build documentati. Non è prevista qui un’app iOS nativa.

**Confini:** collegamento locale alla centrale predisposta. Accesso remoto e filone VM desktop restano separati; l’esperimento VM è conservato, non fa parte del percorso corrente.

Fonti: [client e QR](blocchi/02-design-e-qr-client-implementazione.md), [guida PC/iPhone e materiali client](blocchi/03-profili-client-tavano-prova.md).

## 1. Registrazione, accesso e account

**Ingresso:** il dispositivo ha raggiunto la centrale tramite il blocco 0. **Obiettivo:** una persona usa il proprio account e la propria configurazione da dispositivi diversi.

| Concetto | Significato |
|---|---|
| Account | Identità della persona, autenticata da HA attraverso ACA |
| Profilo | Interfaccia/configurazione personale appartenente all’account |
| Dispositivo/client | Installazione o browser riconosciuto; nessun nome dispositivo obbligatorio nel percorso utente |
| Sessione | Accesso HA personale; più schede possono condividere il login, restando istanze distinte per l’uso del profilo |

### 1.1 Prima creazione della casa

**Crea account → Accedi → nome della casa → preparazione/sincronizzazione e scelta o creazione del profilo → Home ACA.**

- La prima registrazione usa la normale card **“Crea account”**, senza una schermata separata “Crea proprietario”. Internamente il primo account resta il proprietario HA.
- Campi: **Nome utente**, **Password**, **Conferma password**. Nome utente e nome iniziale coincidono; le password hanno l’occhiolino per mostrarle/nasconderle.
- La pill personale mostra iniziale su colore scelto, separatore e **“Personalizza”**, con scelta libera del colore.
- L’accesso dopo la creazione resta un passaggio esplicito. Il nome della casa riguarda la prima configurazione della centrale, non ogni dispositivo.
- Una Home con comandi ma senza widget può essere una pagina vuota del profilo; non equivale a una schermata bianca o a un errore di accesso.

Fonte: [prima creazione con UI comune](../reports/REP-20261104-006-primo-account-interfaccia-comune.md).

### 1.2 Nuovo membro di una casa già configurata

**Crea account → registrazione del normale utente HA → Accedi → scelta o creazione del proprio profilo → Home ACA.**

La registrazione è libera per chi raggiunge la centrale, senza approvazione di un membro. I nuovi membri non ricevono automaticamente privilegi amministrativi HA. Il servizio tecnico della centrale deve essere pronto; un’indisponibilità temporanea non richiede token manuali all’utente.

### 1.3 Stessa persona su un altro dispositivo

**Collegamento alla stessa centrale → Accedi con lo stesso account → riconoscimento automatico del client/sessione → interfaccia e profilo dell’account → Home ACA.**

Non si crea un altro account per usare il telefono. Ogni accesso conserva una sessione indipendente; la configurazione appartiene alla persona. La griglia si adatta allo schermo.

**Regola corrente:** un profilo può essere usato da una sola istanza alla volta. Se è occupato, il secondo accesso mostra il messaggio di profilo in uso. Il PC in secondo piano continua a occuparlo finché l’istanza resta aperta e connessa; chiudere ACA o la scheda permette il cambio dispositivo. Su mobile sospensione o perdita di rete possono interrompere il collegamento e liberare il turno: la presenza non garantisce di distinguere ogni chiusura da una sospensione. Il passaggio rapido è stato corretto e confermato iPhone → Edge in pochi secondi; i limiti sono documentati. Questa scelta successiva supera il precedente uso simultaneo dello stesso profilo.

Fonti: [account e ingresso](../decisions/ADR-0036-account-e-modifiche-immediate.md), [uso esclusivo e posizioni adattive](../decisions/ADR-0037-uso-esclusivo-profilo-e-posizioni.md), [cambio dispositivo](../decisions/ADR-0038-cambio-dispositivo-collegamento.md).

### 1.4 Riapertura, personalizzazione e uscita

- **Sessione valida:** riapertura → verifica → profilo/Home, senza ripetere creazione account e nome casa. Se il profilo è occupato resta valida la regola di uso esclusivo.
- **Sessione assente, scaduta o revocata:** schermata **“Accedi”**, con collegamento a **“Crea account”**.
- **Identità visiva:** click sull’icona account → personalizza colore oppure immagine con ritaglio/regolazione; l’immagine sostituisce il cerchio colorato. La copertina appare nella vista account. Sono personalizzazioni personali, distinte dalla palette globale fissa bianco/viola; il tema corrente segue il [design](../design/design.md).
- **Sessioni:** login personale con rinnovo automatico, uscita e revoca del singolo accesso. L’opzione di incollare un token HA a lunga durata è stata rimossa; l’autenticazione interna e l’identità tecnica della centrale restano necessarie. Password fuori da database, bozze e log ACA.

Fonti: [nome unico e accesso personale](../decisions/ADR-0040-nome-unico-accesso-personale.md), [account e personalizzazione](../reports/REP-20261102-012-profili-client-editing-tavano.md).

### Stato del blocco 1

Sul **banco PC locale 0.9.41** l’utente ha completato creazione, accesso, casa e ingresso in ACA, confermando i widget recuperati. Le due copie dei profili conservati sono un **intervento di recupero del banco**, non un passaggio della normale registrazione: [esito e conservazione degli originali](../reports/REP-20261104-005-recupero-account-banco.md).

Il successivo aggiornamento [0.9.42 con Liquid Glass](../reports/REP-20261104-009-banco-liquid-glass.md) conserva account e profili: non richiede una nuova registrazione né una nuova copia. Modifica la presentazione del banco, non i flussi del blocco.

La release pubblica resta **0.9.34**: non incorpora automaticamente tutte le modifiche del banco. Il presente documento non dispone una nuova pubblicazione. La prova fisica iPhone della nuova 0.9.41 e le verifiche Android hardware restano distinte dalle prove precedenti.

## Blocchi successivi

Il passaggio dall'accesso/profilo alla prima Home segue il [piano di caricamento e ingresso](caricamento-home-piano.md), richiesto e poi assegnato il2026-11-06: attesa comune, loader e prima vista pronta, senza altri passaggi per l'utente. [Attuazione e collaudi locali REP004](../reports/REP-20261106-004-caricamento-home-unitario.md), separati dal banco e dalla pubblicazione. È un approfondimento trasversale, senza assegnare un nuovo numero di blocco o anticipare il rifacimento dei singoli widget.

Il catalogo della Home è aggiornato nel [REP006](../reports/REP-20261106-006-catalogo-widget-tendina.md): scroll verso il basso senza pulsante, salita automatica con dissolvenza e anteprime sfogliabili orizzontalmente per pagine intere. Implementato e verificato nell'anteprima locale, con gli stessi flussi di aggiunta/associazione; banco e hardware separati. Non assegna un numero ai blocchi successivi né anticipa la ristrutturazione dei singoli widget.

Li mapperemo quando l’utente li indicherà, nello stesso file. Per ciascuno annoteremo scopo, ingresso/uscita, flussi principali e alternativi, decisioni confermate, stato e punti aperti con le relative fonti. Questa voce non assegna nuove funzioni né un ordine di implementazione.
