# REP-20261106-002 — Analisi di caricamento Home e widget

| Campo | Valore |
|---|---|
| Stato | Analisi completata; pronto al piano, nessuna implementazione autorizzata |
| Data | 2026-11-06, Europe/Rome |
| Autore | Codex; nome esatto del modello non disponibile |
| Base Git | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`,579voci preesistenti modificate/non tracciate |
| Richiesta | Dopo la conferma della correzione del vetro, l'utente vuole valutare caricamento/ricaricamento coerenti: layout e posizioni ricevuti rapidamente, skeleton o loader e comparsa della UI pronta. Chiede fattibilità, opportunità e se occorrono prima dettagli della futura ristrutturazione widget per widget; solo dopo questa valutazione si passerà al piano. |

## Perimetro e criteri

Solo lettura di codice e analisi documentata. Nessuna modifica applicativa, installazione, ottimizzazione, nuova cache, cambio di API o deploy. Conservare [REP001](REP-20261106-001-continuita-blur-ritorno-home.md) e [REP006](REP-20261105-006-apertura-widget-finestra-apple.md), account/profili e banco. La proposta dell'utente non autorizza ancora l'implementazione o un piano assunto come approvato.

- Ricostruire il vero percorso da account/profilo a layout proiettato, dati HA e primo paint.
- Distinguere ciò che è già persistito e coordinato da ciò che manca; non proporre salvataggi duplicati o coordinate pixel condivise tra schermi.
- Valutare loader/skeleton, prerequisiti e attese evitabili; nessuna promessa di velocità senza misura.
- Stabilire se la ristrutturazione interna dei widget impedisce di definire ora il caricamento comune.
- Concludere con raccomandazione e disponibilità al piano oppure una sola informazione realmente bloccante; nessuna implementazione nel frattempo.

## Evidenze e conclusioni

Analizzate la catena reale di avvio, persistenza e proiezione responsive, gate d'identità/uso profilo, dati HA, contenuti locali dei widget e motion condivisa. Due analisi indipendenti sono conservate in `backup/rep052/startup-layout-analysis.json` e `initial-loading-analysis.json`, con file e righe. Nessun benchmark nuovo o accesso autenticato al banco: i rilievi strutturali non dimostrano tempi risparmiati.

### Ciò che esiste già

| Osservazione dal codice | Fonti principali |
|---|---|
| Profilo, pagine, ordine, dimensioni e suggerimenti di posizione sono già persistenti e versionati. Il profilo autorevole viene applicato prima dei figli Home. | `hooks/liveProfiles/LiveProfilesContext.tsx:289,430`; `coordinator.ts:695`; `contracts/collaboration.ts:18` |
| Le coordinate effettive dipendono da schermo, colonne e dimensioni. Una proiezione comune produce le posizioni e i segmenti visuali locali. Uno skeleton geometrico deve riusarla. | `domain/launcher/commonOrder.ts:243,285,333`; `hooks/launcher/useLauncherController.ts:289` |
| Il Pager aspetta già impostazioni, snapshot HA coerente e catalogo dei servizi; gli host aspettano misure positive. Il fit adattivo iniziale avviene prima del paint. | `templates/launcher/LauncherScreen.tsx:254,262,2121`; `WidgetGrid.tsx:450,624`; `AdaptiveCategoryWidget.tsx:403,489` |
| HA può collegarsi mentre vengono acquisiti identità e profilo. Imporre che ogni richiesta HA inizi dopo il layout introdurrebbe una serializzazione non necessaria. | `routes/AppRoot.tsx:151`; `hooks/client/ClientAccessGate.tsx:34` |
| Una cache del profilo esiste già per casa/account/client con revisioni; oggi serve al recupero su errore iniziale. Non costituisce un accesso autorizzato anticipato. | `hooks/liveProfiles/coordinator.ts:394,447`; `drafts.ts:135` |

La proposta «prima il layout» è quindi coerente come priorità di presentazione e come possibile ottimizzazione del payload. Non occorre creare un secondo archivio indipendente delle posizioni. Ordine e ingombri logici restano nel profilo; il posizionamento si proietta sul dispositivo. Le cache `tunet_*` legacy e lo snapshot entità sessionStorage con scadenza non sono autorità per identità, freschezza o permessi.

### Il punto attualmente mancante

Non c'è ancora una regia visuale unica per primo ingresso e ricaricamento. Sono presenti attese distinte per accesso, profilo, dati e misure. Inoltre `glass-white/motion.css:3–14` avvia l'animazione dell'app al mount della radice, con traslazione16px e scala0,97: non è l'attuale entrata dal basso senza scala di Sistema/Console e non è collegata al momento in cui la griglia è pronta. La sola sostituzione di un keyframe non coordinerebbe queste attese.

`WidgetDefinition` (`@types/launcher.ts:193`) espone contenuti, misure e pannelli, ma **non** un segnale universale di preparazione asincrona. Un eventuale contratto di prima vista pronta sarebbe una proposta da pianificare; non una capacità già presente. `WidgetHost` è già un confine comune utile per mantenere questo comportamento durante la futura ristrutturazione interna dei widget.

### Valutazione della proposta

La soluzione è fattibile e opportuna se «pronta» significa una prima vista stabile e utilizzabile: identità/profilo verificati, layout e associazioni correnti, dati/comandi iniziali conclusi, misure/fit e risorse locali critiche disponibili oppure fallback valido. La disponibilità dell'uso del profilo rimane verificata prima dei comandi. Le dimensioni dei riquadri devono essere quelle finali fin dalla prima comparsa.

Per il primo intervento è consigliato **un loader circolare discreto sullo sfondo fisso**, seguito dalla comparsa unitaria della prima vista con la stessa direzione e dissolvenza già confermate. Non serve duplicare ora i contenuti dei widget in skeleton dettagliati che verranno ridisegnati. Uno skeleton esterno basato sulla proiezione reale è possibile quando il layout è già verificato; resta un'opzione da valutare nel piano, non un secondo passaggio obbligatorio loader→skeleton→UI. Quando tutto è già pronto non introdurre attese minime estetiche o indicatori lampeggianti.

Il feedback copre l'attesa; non abbrevia di per sé rete o calcolo. Prima di ottimizzare vanno misurati peso del bootstrap, richieste duplicate, tempi delle autorizzazioni, preparazione dei dati e paint. Nel codice si osservano bootstrap richiamato sia nel ClientAccessGate sia nel coordinatore, elenco con profili completi/fonti e rilettura del selezionato, lettura delle bozze prima del bootstrap. Sono candidati da misurare e preservare semanticamente, non colli di bottiglia cronometrati né refactor già approvati.

### Limiti da rendere espliciti nel piano

- Storici, liste Tavano, immagini/stream e code multimediali hanno richieste proprie, a volte continue o legate alla pagina visibile. Una sola attesa su tutti i widget e tutte le pagine può rallentare o bloccare l'ingresso. Si prepara prima la vista visibile; vuoto, errore e offline devono essere esiti espliciti, con contenitori stabili.
- Se si vorrà includere anche i dati lenti nella comparsa unitaria, il piano dovrà prevedere segnali iniziali dei widget visibili e un esito controllato in caso di indisponibilità. Non esiste una garanzia di «tutte le future fetch concluse» per streaming e aggiornamenti live.
- Preparare una griglia con `display:none` impedisce di misurarla; dichiararla non visibile può impedire ai suoi hook di caricare i dati attesi. Preparazione, visibilità e interazione vanno distinte, senza timer fittizi che aggirino la disponibilità reale.
- Un caricamento anticipato deve eseguire letture selezionate, senza attivare comandi fisici o tutti gli stream fuori schermo. La scelta della pagina e l'uso esclusivo del profilo restano quelli attuali.
- L'animazione d'ingresso deve partire dalla disponibilità reale e conservare il paesaggio fisso, il vetro corretto e le preferenze ridotte/opache. Cache e risposte tardive vanno separate per casa, account, profilo e revisione, preservando bozze e permessi.

### Dipendenza dalla ristrutturazione futura

**Non serve prima il dettaglio di ogni widget per preparare il piano del caricamento generale.** La fonte del layout, la proiezione e il contenitore comune possono restare stabili mentre cambiano le parti interne. Il piano dovrà definire il significato condiviso di prima vista pronta; ogni futuro widget potrà rispettarlo. I dettagli della ristrutturazione serviranno prima di disegnare skeleton interni o condizioni di preparazione specifiche di quel widget, non per iniziare a pianificare la regia comune.

## Chiusura

Analisi completata e conclusione pronta da comunicare all'utente: fattibile, suggerimento valido con coordinamento comune e attese limitate ai prerequisiti della prima vista. Non sono necessari ora tutti i dettagli della ristrutturazione. Pronto a realizzare il piano per questa funzionalità; piano e implementazione restano passi successivi, non già eseguiti o approvati.

Nessun codice applicativo, dato, account, profilo, distribuzione o banco modificato. Nessun test/build di prodotto necessario o eseguito per questa analisi. Le verifiche qui riguardano lettura dei sorgenti, confronto delle analisi e integrità/documentazione; non prestazioni misurate sul dispositivo.

Controllo di chiusura:1793sorgenti, SHA complessivo `d14bde1e803e6366e95798ba477a8343abbf5d21f0e916191ee6f6145bfc5499`, invariato dalla consegna precedente (`backup/rep052/source-invariance.json`).582collegamenti documentali verificati, nessuno interrotto, integrità degli artefatti nativi PASS. Whitespace dei documenti pertinenti senza errori, soli avvisi CRLF/LF. Analisi conclusa senza cambiamenti applicativi.
