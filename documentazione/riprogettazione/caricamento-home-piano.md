# ACA — Piano di caricamento e ingresso della Home

**Stato: piano attuato e verificato localmente nelle quattro consegne.** Redatto su richiesta il2026-11-06, dopo [REP002](../reports/REP-20261106-002-analisi-caricamento-home-e-widget.md), poi autorizzato dall'utente con «ok partiamo col piano». [Report di redazione](../reports/REP-20261106-003-piano-caricamento-home.md), [attuazione, evidenze e limiti](../reports/REP-20261106-004-caricamento-home-unitario.md). Prove autenticate reali e hardware non eseguite; banco e pubblicazione rimangono distinti.

## Risultato per chi usa ACA

Primo ingresso e ricaricamento della Home seguono lo stesso comportamento: paesaggio fermo, eventuale loader circolare discreto, poi prima pagina completa nei suoi elementi essenziali con una sola salita e dissolvenza. Niente bolle, riquadri che cambiano misura, doppia animazione o scatto del vetro. Nessun passaggio aggiuntivo chiesto all'utente.

Se la preparazione è già conclusa il loader non compare. Non viene imposta una sua durata minima. Un errore o un profilo occupato mostra il recupero appropriato; non rimane nascosto dietro a un indicatore infinito. Login, registrazione, scelta/recupero profili e configurazione iniziale mantengono i propri moduli.

Il primo lotto usa **il loader circolare**. Skeleton dettagliati dei singoli widget non sono inclusi. Un futuro skeleton geometrico riuserà la stessa proiezione della griglia, senza un secondo layout o una nuova persistenza.

## Cosa significa «prima pagina pronta»

La configurazione autorevole continua a risiedere nel profilo server, con revisioni, ordine e suggerimenti dimensionali/posizionali. Le coordinate reali derivano dallo schermo attuale. Si conserva la scelta iniziale della pagina già prevista da ACA; non si introduce una nuova memoria dell'ultima pagina o una copia pixel del desktop.

| Prerequisito | Fonte riusata | Esito necessario |
|---|---|---|
| Accesso alla casa/account | `AppRoot`, `ClientAccessGate` | Identità verificata, oppure schermata di accesso/recupero già prevista. La cache non concede accesso. |
| Profilo e uso esclusivo | `LiveProfilesContext`, coordinatore | Profilo corrente accettato e concessione d'uso valida. Profilo occupato/revocato è un esito esplicito. |
| Configurazione | Bridge `PageContext`, controller | Layout e associazioni della revisione accettata, comprese pagine o profili legittimamente vuoti. |
| Stati e comandi iniziali | Provider HA, catalogo condiviso | Primo snapshot coerente ricevuto e catalogo concluso con successo. Mappe vuote ricevute sono valide; errore e assenza di risposta restano distinti. |
| Geometria e contenuti essenziali | `WidgetGrid`, host e fit adattivo | Dimensioni positive della prima pagina e controlli sincroni già composti alla misura finale. Nessun widget invisibile delle altre pagine è necessario. |
| Risorse locali visibili | Font e paesaggio esistenti | Risorsa critica disponibile oppure fallback realmente applicato e stabile, prima dell'ultima misura. |

«Pronta» non significa che tutti i dispositivi siano online: un dispositivo assente nel primo snapshot deve mostrare il proprio stato reale. Non si aspetta che un elenco contenga almeno un elemento. Stato vuoto, errore gestito e offline non vanno confusi con attesa.

Storici dei grafici, attività Tavano, code multimediali, foto e streaming mantengono caricamenti locali nei propri spazi definitivi. Un solo widget lento non trattiene tutta ACA. Nessun nuovo contratto asincrono obbligatorio per tutte le definizioni: il primo lotto coordina il contenitore e la UI essenziale attuali. Le future ristrutturazioni potranno aggiungere una preparazione specifica dove necessaria, con esiti successo/vuoto/errore/offline espliciti.

| Esito iniziale | Politica del piano |
|---|---|
| Snapshot HA ricevuto `{}` o catalogo ricevuto `{}` | Valido; nessun vincolo sul numero di elementi. |
| Snapshot mai ricevuto | Attesa, poi recupero; non trasformarlo in uno snapshot vuoto. |
| Catalogo dei comandi fallito | Recupero iniziale con «Riprova» del solo catalogo; Home non dichiarata pronta con un errore mascherato da `{}`. È la scelta assegnata e attuata nel percorso gestito, rispetto al fallback silenzioso precedente. |
| Identità, profilo o concessione falliti | Login/recupero/blocco attuali, con priorità sul loader. |
| Dispositivo, storico, attività o media indisponibili | Esito locale nello spazio definitivo. |
| Font o paesaggio falliti/lenti | Fallback stabile secondo il budget locale; nuova misura sul font realmente usato. |

## Stati e recupero

Un controllo di presentazione comune conserva soltanto ciclo corrente, fase e segnali di disponibilità. Non copia configurazioni, entità, permessi o cataloghi e non sostituisce il coordinatore dei profili.

| Fase | Presentazione e comportamento |
|---|---|
| Fuori dal flusso Home | Login/setup/scelta profilo o route Sistema/Casa: restano i percorsi attuali. Il loader Home non copre moduli o azioni da compiere. |
| Verifica accesso/profilo | Feedback comune al posto delle sole attese transitorie. Gli errori e il profilo occupato hanno precedenza. Nessuna informazione privata da cache prima delle verifiche. |
| Preparazione Home | Caricamento essenziale e misura della prima pagina; Home misurabile, coperta e non interattiva. Loader se la soglia è trascorsa. |
| Ingresso | Tutta la prima vista è pronta: una sola entrata; il loader sfuma insieme, senza pausa vuota. |
| Pronta | Stato stabile; aggiornamenti HA/SSE, storico, navigazione, ritorno dai dettagli e riconnessioni ordinarie non riaprono il loader globale. |
| Attesa prolungata | Messaggio breve e «Riprova» al posto dell'attesa muta. L'eventuale risultato corrente valido può ancora completare; il tempo non dichiara pronta la UI. |
| Errore/blocco | Recupero della fase che ha fallito: nuovo accesso solo se necessario, retry rete oppure messaggio di profilo occupato. Nessuna apertura forzata della Home. |

Ogni ingresso accettato di casa/account/profilo o tentativo esplicito ha un identificativo di ciclo. I segnali visuali di cicli precedenti vengono ignorati. Le risposte dei dati continuano invece a seguire generazioni, richieste e cancellazioni dei rispettivi proprietari: un retry di font/catalogo non invalida una subscription HA o una concessione ancora valida. Gli aggiornamenti validi del profilo e di HA continuano a essere accettati. Il rinnovo di un token valido non equivale a un nuovo login.

Ogni misura pronta è riferita alla generazione della configurazione accettata e allo schermo corrente. Una revisione valida arrivata durante la preparazione invalida i soli segnali di proiezione/fit interessati, senza rifare accesso o scartare gli altri risultati validi.

**Riprova è mirato:** mantiene identità, profilo e risultati ancora validi, ripartendo dalla preparazione fallita. Non svuota cache/bozze, non crea utenti, non cambia il profilo selezionato e non rilascia una concessione valida solo per riavviare l'indicatore. I componenti proprietari espongono al controllo comune i propri callback di recupero; si riusano le verifiche attuali prima di qualsiasi writer. Nessun reload automatico o ciclo di retry illimitato.

Se l'utente cambia route, account o profilo durante l'attesa, si cancella la presentazione precedente. Il layout di una nuova identità non riusa segnali della vecchia. L'ingresso diretto in Sistema/Casa non avvia il loader Home né aspetta pagine coperte; la prima successiva apertura della Home avvia il ciclo se necessario. Dopo una Home già pronta i normali ritorni mantengono le transizioni esistenti.

Un resize durante la preparazione invalida soltanto geometria e fit dello schermo corrente, senza ripetere login o bootstrap. Durante l'ingresso già avviato non riavvia loader o animazione: aggiorna la proiezione e abilita l'input quando la misura corrente è valida e la transizione è conclusa. Se il box diventa temporaneamente zero, l'area resta non interattiva. Dopo l'ingresso si conserva la normale proiezione adattiva.

## Aspetto, tempi e accessibilità

Questi valori sono **scelte esecutive del piano assegnato**, non misure di prestazione o parametri attribuiti ad Apple. L'attuazione e la verifica restano documentate in REP004.

| Parametro | Valore assegnato |
|---|---|
| Comparsa loader | Dopo150ms solo se il ciclo è ancora in attesa; il timer non ritarda le richieste o il segnale pronto. |
| Durata minima loader | Nessuna. Se pronto prima della soglia, nessun indicatore. |
| Entrata Home |24px dal basso a0, opacità0→1,280ms con curva ACA di uscita; nessuna scala o animazione del filtro. |
| Movimento ridotto | Sola dissolvenza120ms; indicatore statico con stato accessibile, senza rotazione continua. |
| Uscita loader |96ms insieme all'inizio della Home, senza allungare i280ms. Se mai apparso, nessuna uscita da attendere. |
| Attesa prolungata | A10s, offrire spiegazione breve e «Riprova». È una soglia di feedback, non una concessione o una readiness fittizia. |
| Risorsa locale lenta | Entro3s dal suo avvio scegliere font/fondo fallback già disponibili; su errore noto subito. Fallback mantenuto per l'ingresso corrente, senza swap tardivo che ricalcoli la prima vista. |

Il loader usa materiali e colori del kit corrente, senza percentuali inventate, testi tecnici o schermate esplicative. Il kit ha Skeleton ma non un loader circolare dedicato: se necessario aggiungere una piccola primitiva condivisa, senza librerie. Non rifare i pulsanti o le primitive estranee.

Sostituire per questo flusso la vecchia intro indiscriminata di `.aca-app-root` (16px,scala0,97): non sommarla al nuovo ingresso e non cambiare animazioni di login, popup o Sistema. Il segnale d'avvio è il commit pronto della prima pagina, non il semplice mount della radice o un ritardo fisso.

La nuova fase iniziale deve conservare la continuità del vetro di [REP001](../reports/REP-20261106-001-continuita-blur-ritorno-home.md). La regola attuale copre soltanto open/returning della Console: nel piano l'ingresso Home riceve la stessa cura del backdrop e del paesaggio fisso. Non basta mantenere blur16px nel CSS; confronto dei fotogrammi al termine del fade. Nessuna fotografia che segue lo spostamento o la scala del contenuto.

Durante la preparazione mantenere i box misurabili: niente `display:none`, `hidden` o dimensioni zero sulla griglia. Distinguere preparazione dal flag di pagina fuori schermo che sospende fetch. La Home non pronta è inert e nascosta alle tecnologie assistive; un solo status del loader e `aria-busy`. Nessun autofocus sul loader. I controlli di recupero sono raggiungibili; al completamento il focus viene conservato se ancora valido, senza furto da altre finestre. Se «Riprova» aveva il focus e viene rimosso dal successo, al termine dell'ingresso trasferirlo al contenitore principale Home con etichetta accessibile, senza attivare un comando. Non spostarlo se l'utente è passato altrove. In ingresso i comandi diventano raggiungibili alla conclusione effettiva della transizione comune e con misura corrente valida, con fallback funzionante se manca l'API di animazione.

Rinviare soltanto le presentazioni automatiche che si sovrapporrebbero al loader, come discovery/primo popup: dopo Home pronta riprendono secondo le regole esistenti, una sola volta e per il ciclo ancora valido. Non accodare comandi fisici.

## Consegne di implementazione

### 1. Checkpoint e misure iniziali

Congelare sorgenti e comportamento attuali, con test/evidenze pertinenti e distinzione del debito ISSUE-134. Su fixture isolata, annotare tempi e dipendenze di identità/bootstrap, concessione, profilo, snapshot, catalogo, proiezione, misura/fit e prima vista effettivamente dipinta. Misurare conteggio e byte delle richieste, senza credenziali, nomi personali, configurazioni complete o nuovi log persistenti in Tavano.

Campionare condizioni ripetibili di primo accesso, cache calda, reload e rete rallentata; salvare baseline e condizioni della cache. Un indicatore non dimostra un guadagno di rete. Questa consegna non modifica endpoint o persistenza.

**Uscita:** baseline leggibile e mappa dei segnali necessari, nessuna prestazione inventata.

### 2. Coordinare il ciclo senza duplicare i dati

Introdurre il controllo comune sotto la sessione HA di `AppRoot`, attivo solo quando si prepara davvero Home. Collegare stato di `ClientAccessGate`, `LiveProfilesContext` e controller. Rendere esplicito l'esito del catalogo condiviso, oggi indistinto fra vuoto e richiesta fallita, conservando i consumer compatibili.

L'autenticazione HA e le letture indipendenti possono continuare in parallelo. Le attese non devono rimettere in serie operazioni già parallele. Nessun nuovo endpoint, migrazione, schema o cache ottimistica. La cache esistente serve ai percorsi offline già previsti, senza anticipare comandi o superare l'uso esclusivo.

**Uscita:** stati, cicli, risposte tardive, errore, profilo vuoto/occupato e retry verificabili con promesse controllate.

### 3. Preparare la vista e collegare loader/ingresso

Montare e misurare la prima pagina appena il profilo lo consente, dietro alla presentazione comune. Riusare `WidgetGrid`, proiezione e fit; esporre un segnale dal commit misurato della vista corrente, non contarne arbitrariamente i figli o simulare disponibilità con timer.

Collegare risorse locali critiche/fallback, loader, recupero e ingresso coerente. Preservare modalità ridotta/opaca/contrasto, focus, discovery e contenuti asincroni locali. Mantenere la continuità del vetro appena corretta. Le pagine lontane, i dettagli e gli stream continuano a essere caricati secondo le politiche attuali.

**Uscita:** nessun frame di Home parziale, nuove bolle o scatto del materiale; indicatore presente soltanto per un'attesa reale.

### 4. Collaudo, confronto e consegna locale

Eseguire i casi della matrice seguente, strict/build e controlli condivisi pertinenti; rileggere il diff contro il checkpoint. Confrontare prima/dopo nelle stesse condizioni. Appena disponibile la vista, avviare l'ingresso senza altre pause o durata minima del loader; i280ms dell'animazione richiesta rimangono espliciti. Nessun requisito nuovo di rete per pagine non visibili.

Le possibili ottimizzazioni osservate in REP002 — bootstrap duplicato, payload con più profili, letture di bozze/profilo/concessioni — restano candidati misurati nel resoconto. Compattare l'API, cambiare cache o rifattorizzare il coordinatore non sono parte automatica del primo lotto; eventuali interventi vengono proposti separatamente con evidenze.

**Uscita:** build/anteprima locali, istruzioni brevi PC/telefono e rapporto dei tempi e dei limiti; nessuna installazione del banco o pubblicazione implicita.

## Collaudi di accettazione

| Scenario | Risultato da verificare |
|---|---|
| Cache fredda e reload | Layout corretto prima della comparsa; prima pagina completa nei controlli essenziali, stessa entrata e geometria finale. |
| Preparazione sotto150ms | Loader mai mostrato; nessuna durata minima. |
| Promesse risolte in ordini diversi | Stessa configurazione accettata, nessun ready prematuro o doppio ingresso. |
| Profilo/layout/snapshot/catalogo vuoti | Esito valido dove previsto, nessuna attesa su conteggi maggiori di zero. |
| Dispositivo offline, storico lento, stream assente | Stati locali leggibili e dimensioni stabili; niente attesa globale sulle risorse secondarie. |
| Errore critico e attesa oltre10s | Recupero raggiungibile; niente accesso fittizio, loop di retry o timer che rende pronta la UI. |
| Retry seguito da risposta vecchia | Un solo ciclo valido; nessuna configurazione vecchia ripristinata. |
| Retry font/catalogo durante aggiornamenti validi | Snapshot HA, profilo e concessione correnti restano accettati; non vengono invalidati dal solo ciclo visuale. |
| Cambio casa/account/profilo/route | Nessun contenuto privato o segnale di disponibilità riutilizzato fuori identità; login/setup e profilo occupato visibili. |
| Ingresso diretto Sistema/Casa e successiva Home | Nessun loader Home davanti all'altra route; prima Home preparata quando necessaria, normali ritorni successivi conservati. |
| Resize/rotazione durante e dopo il caricamento | Proiezione corrente, nessuna duplicazione/persistenza di nuove pagine per formato o nuovo login. |
| Resize durante il fade di ingresso | Nessun restart della coreografia; input solo con misura corrente positiva e transizione conclusa. |
| Riconnessione dopo ingresso | Home e stato locale mantenuti secondo le regole attuali; avviso locale, niente nuovo loader completo. |
| Input e focus | Nessun comando sotto il loader; Tab, screen reader, recupero e fine ingresso corretti. Discovery non anticipata o duplicata. |
| Successo mentre «Riprova» ha focus | Focus recuperato nel riferimento Home stabile solo se il controllo focalizzato viene rimosso; nessun furto da altre finestre. |
| Risorse locali fallite/lente | Fallback reale e stabile; niente swap tardivo della prima vista o attesa su font non usati. |
| Movimento ridotto/opacità/contrasto | Direzione e materiali appropriati, nessun filtro o sfondo animato, nessuna rotazione continua in ridotto. |
| Fotografia e vetro | Frame intermedi e passaggio al riposo coerenti, confronto ROI prima/dopo; non solo stili computed o conteggi RAF. |
| Persistenza e comandi | Nessun nuovo salvataggio per puro caricamento/proiezione; bozze conservate, nessuna azione fisica o ripetizione automatica. |

Usare browser/fixture posseduti e richieste mutative bloccate per i collaudi sintetici. Desktop1366/1920 e mobile390/320, con un sottoinsieme mirato per preferenze e resize. Prova umana PC/iPhone sulla LAN separata dal risultato Chromium emulato; Android/M11 hardware quando disponibili. Non dichiarare GPU o piattaforme collaudate sulla sola emulazione.

## Confini dei file e della futura ristrutturazione

| Area | Intervento previsto |
|---|---|
| `routes/AppRoot.tsx`, gate client/profili | Ospitare il ciclo e collegare attese/errori esistenti, senza replicare autorità o fetch. |
| `LauncherPage`, `LauncherScreen` | Segnali della vista e dei dati comuni, fine del solo ingresso iniziale, presentazioni automatiche coordinate. |
| `WidgetGrid`, host/fit | Conferma della geometria e composizione reale della prima vista; nessun layout alternativo. |
| Hook catalogo e primitive UI | Esito/retry del catalogo e piccolo loader comune se necessario, senza dipendenze. |
| Tema Vetro Bianco condiviso | Ingresso Home e continuità del backdrop, preferenze e rimozione della doppia intro nel solo percorso interessato. |
| Documentazione e test mirati | Stati, limiti, regressioni, frame e misure ripetibili. |

Nessun restyling widget per widget, nuova selezione di profilo, cache dei comandi, modifica di HAOS/QR/Electron/Android o accesso remoto. La webapp condivisa porta il comportamento ai client esistenti. La futura ristrutturazione conserva il confine Host/layout e il significato di prima vista pronta; gli skeleton interni e i prerequisiti propri dei nuovi widget si progetteranno con quei widget.

L'implementazione locale è stata assegnata successivamente alla redazione e conclusa in REP004, che distingue controlli eseguiti e limiti della matrice. Il piano non autorizza l'aggiornamento del banco o la pubblicazione.
