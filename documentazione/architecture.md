# Architettura corrente e confini dei progetti

**Catalogo widget, 2026-11-06 — [REP006](reports/REP-20261106-006-catalogo-widget-tendina.md), [ADR-0048](decisions/ADR-0048-catalogo-widget-tendina.md):** un listener locale alla Home riconosce lo scroll verso il basso sulle superfici passive; guardie correnti e controllo immediato delle transizioni impediscono aperture sopra comandi, editor, scroll annidati o profili non disponibili. Non introduce un pulsante nella Home. `BottomDrawer` riusa DialogShell/PanelPresence e la cronologia esistente; segnala la presenza solo dopo il commit del pannello e l'assenza appena inizia la chiusura. La dissolvenza Home già esistente è condivisa da due proprietari distinti, dettagli e catalogo, senza aggiungere un filtro globale.

Il pager del catalogo dimensiona pagine orizzontali intere in base allo spazio disponibile, conservando il tipo corrente durante i cambi di formato. Le miniature usano un canvas presentazionale320×240 scalato uniformemente per rispettare larghezza e altezza disponibili; renderer visuali sicuri ricevono soltanto un runtime sintetico privato, i widget autonomi una vignetta statica. Visibilità e import differiti limitano il lavoro alle anteprime raggiunte. `useAddCard`, associazioni, discovery/auto-add, identità e writer restano autorevoli: nessuna nuova API backend, migrazione, dipendenza o modifica dei dati del banco.

**Gesti senza pulsanti, [REP007](reports/REP-20261106-007-catalogo-widget-solo-gesti.md):** `BottomDrawer` riconosce il trascinamento verso il basso soltanto sulle superfici marcate `data-drawer-swipe` e nell'header passivo. Cattura dopo aver scelto l'asse verticale, conserva pan-x nativo e scroll dei moduli; distingue la perdita di cattura del pannello da quella del figlio durante il trasferimento. La chiusura avviene al rilascio, con cancellazione e soppressione del click residuo. La fonte del modello di dati e la scena di ritorno rimangono quelle precedenti.

**Preparazione Home, 2026-11-06 — [REP004](reports/REP-20261106-004-caricamento-home-unitario.md), [ADR-0047](decisions/ADR-0047-caricamento-home-unitario.md):** `HomeStartupProvider`, sotto la sessione HA, coordina soltanto segnali e fasi di presentazione. Gate client, profilo/concessione, snapshot, catalogo e geometria conservano i propri dati e verifiche. Identità completa e generazione della vista impediscono di riusare la disponibilità di un profilo diverso; il retry di preparazione riconferma la concessione e non riattiva una prova revocata né sostituisce una revisione più recente.

La Home gestita monta il Pager misurabile dietro al loader prima della comparsa; integra e aggiorna, per quel percorso, l'attesa del primo Pager descritta nella nota REP006 sotto. Misure positive, fit, risorse locali effettive o fallback precedono l'ingresso. Catalogo fallito e catalogo ricevuto vuoto sono distinti; retry mirati e riconnessioni ordinarie conservano risultati validi. Foto nella superficie esterna ferma, sola traslazione del contenuto interno e opacità: nessun filtro animato. Risorse secondarie restano locali; nessuna nuova API backend, migrazione o dipendenza. Il flag sticky della radice sopprime la vecchia intro solo dopo l'uso del percorso Home; Sistema/Casa diretti mantengono le proprie attese.

**Composizione del vetro, 2026-11-06 — [REP001](reports/REP-20261106-001-continuita-blur-ritorno-home.md):** soltanto il CSS Vetro Bianco mantiene la stessa foto/velo anche dentro la shell Home nelle fasi Console open/returning. L'ancoraggio fisso conserva la scena campionata dai filtri dei discendenti quando opacity crea un confine temporaneo. A closed si torna al solo fondo precedente; i controller, le durate e i dati non cambiano. Reset opachi con il medesimo selettore completo. Il rapporto distingue modello CSS, A/B statico e fotogrammi del browser.

**Schermate e caricamento, 2026-11-05 — [REP006](reports/REP-20261105-006-apertura-widget-finestra-apple.md), [ADR-0046](decisions/ADR-0046-apertura-widget-come-finestra.md):** Sistema e Console condividono la direzione dal basso con opacità, mantenendo i controller esistenti. Console non misura più la tessera di origine né gestisce un body differito; titolo, comandi e contenuto sono un'unità. DialogShell, PanelPresence e history conservano focus, chiusura e priorità dei menu. La foto resta nel piano fisso, senza film globale sui dettagli. Le note REP001 sotto conservano il precedente modello, sostituito per geometria e dissolvenze.

Il controller di scena attende il commit lazy soltanto per l'ingresso staged di Sistema: il marker è nello stesso confine Suspense del contenuto reale, con callback delimitata al singolo ingresso. In attesa resta la Home, senza Skeleton visibile durante la salita. Route diretta e Casa mantengono i percorsi precedenti. WidgetGrid non monta gli host prima di una misura positiva e conserva l'ultima misura valida quando una pagina viene saltata; il fit adattivo iniziale avviene prima del paint. Nessuna nuova dipendenza o API di rete.

Il provider HA applica snapshot e `entitiesLoaded` nello stesso RAF; gli aggiornamenti dei metadati non cancellano il callback pendente e i tentativi scaduti non pubblicano disponibilità. Uno snapshot vuoto è valido. LauncherScreen aspetta configurazione e snapshot prima del primo Pager, poi ne conserva stato e widget durante la riconnessione. Login e cambio profilo smontano già il sottoalbero secondo i gate esistenti: non si riusa la disponibilità di un'identità diversa. Il catalogo iniziale dei comandi viene preparato tramite la stessa lettura/cache già usata dai widget e condiviso nel runtime; lo storico dei grafici e le risorse multimediali restano asincroni.

**Transizione widget, 2026-11-05 — [REP001](reports/REP-20261105-001-transizione-generica-widget.md):** il percorso condiviso di LauncherScreen usa WidgetConsole sia per una Console dedicata sia per i Details esistenti. I contenuti e le eccezioni dell'intestazione restano nel frontend; la primitiva Console condivisa gestisce espansione, opacità e accessibilità senza conoscere entità HA. Il callback della schermata effettivamente caricata avvia la dissolvenza della Home, evitando di nasconderla mentre il chunk è ancora in caricamento.

La fase open/returning/closed conserva l'inattività della Home fino al suo ritorno e poi il focus dell'origine. Timer e listener vengono cancellati o riassegnati sulle interruzioni. DialogShell esclude i discendenti inert dai target di focus e lascia Escape al menu interno aperto. PanelPresence consente una durata di uscita esplicita usata dalla sola Console per i 120ms di movimento ridotto; il default degli altri pannelli resta invariato. Nessun nuovo endpoint, stato persistente o dipendenza. La prova locale non modifica il banco .46.

**Sistema e identità personale, 2026-11-05 — [REP017](reports/REP-20261104-017-sistema-e-personalizzazione-account-unica.md):** `AccountAppearanceEditor` è il componente controllato comune alla registrazione e alla vista account. Il controller comune usa le API account protette esistenti per colore e immagini, con revisioni, errori e retry. La creazione dell'identità HA mantiene i percorsi distinti del primo proprietario e del membro; la personalizzazione del nuovo membro non usa più un writer parallelo nella richiesta di registrazione.

Prima dell'accesso, immagini ritagliate preparate solo in RAM e associate a un intento corrente; il gate esistente le applica dopo verifica di casa, utente e client. Ricaricare perde tali immagini, come indicato nell'interfaccia. Header e identità attesi vengono catturati per ogni richiesta: risposte obsolete non aggiornano cache o account diversi. Nessuna immagine nei tentativi persistenti o nei log; credenziali e privilegi invariati. Nessun endpoint, schema o dipendenza aggiunti.

Sistema mantiene montati i pannelli nascosti e mostra una sola sezione. Aprire la vista account non smonta Sistema. Il titolo provvisorio usa uno stato RAM distinto per profilo e account/casa, con verifica della base prima dell'applicazione; è temporaneo e viene perso lasciando Sistema, senza introdurre un nuovo archivio IndexedDB. Il crop usa il portal nel body per evitare che il materiale del pannello annidato ne elimini il blur. [Brief UI](design/componenti/sistema.md) e report distinguono comportamento, verifiche e limiti.

**Tavano, integrazione 2026-11-04 — [REP016](reports/REP-20261104-016-tavano-lista-giorni-paginazione.md):** `/api/v2/activity` e `/export` accettano `ageDays` 0–6 e `asOf` ISO, mantenendo i filtri precedenti per compatibilità. La centrale restituisce `serverNow`, riferimento della navigazione e faccette storiche; il cutoff effettivo dei sette giorni resta sempre riferito all'ora corrente, anche sfogliando una lettura precedente. Nessuna colonna contatore: età e intervallo derivano dal timestamp centrale. Scadenza logica immediata; cancellazione fisica su avvio, nuova attività, lettura/export e sweep orario già esistente, anche senza nuovi eventi.

Quattro indici covering sulle identità del registro rendono limitata la lettura dei metadati delle opzioni; nessuna nuova tabella o decrittazione dei profili altrui. Faccette massimo 100 per tipo, più la selezione valida, con indicazione di elenco parziale. Cache RAM invalidata da scritture/pulizia e limiti temporali; etichette utente/client provenienti dai soli eventi validi. Pagine server da 30, cursore ID esistente, frontend senza concatenazione; il feed del widget recente mantiene il proprio aggiornamento. Aggiornamento manuale riapre una prima pagina fresca; polling delle pagine successive conserva il riferimento. Risposte obsolete dopo cambio filtro/sessione non ripristinano risultati o export precedenti.

Le quote logiche e i permessi HA/ACA, gli intenti dei comandi e il coordinatore dei profili restano quelli esistenti. I quattro nuovi indici cambiano lo schema fisico: verificare separatamente DB, indici e journal, senza dichiarare schema identico. Le sezioni seguenti conservano le decisioni e integrazioni precedenti.

**Palette fissa/tema Classico, 2026-11-04 — [ADR-0039](decisions/ADR-0039-palette-fissa-tema-classico.md):** design/index.css rimanda a themes/classic/index.css; webapp usa un solo shim e gli adattatori il copier già esistente. Stessi CSS/materiali/font, nuove personalizzazioni globali ritirate dal runtime. Aspetto effettivo light/violet/none separato dai metadati legacy; Provider live e import non riscrivono raw o generano operazioni appearance. Fallback account preserva raw remoto nei salvataggi layout. Nessun nuovo schema, dipendenza, selettore futuro o tema inventato. Implementazione e banco0.9.39 in [REP002](reports/REP-20261104-002-palette-fissa-tema-classico.md); nuovo pacchetto attende istruzioni umane.

**Integrazione corrente REP004, 2026-11-03:** [ADR-0038](decisions/ADR-0038-cambio-dispositivo-collegamento.md) lega la presenza SSE autenticata alla4-tupla account/client/loginHA/istanzaRAM. Ultima connessione chiusa dopo presenza osservata→3s; nuova connessione stessa istanza entro grazia conserva l’uso, rinnovi REST/callback vecchi non prolungano. Timer fenced e scadenza minima per soft/hard sovrapposti. Client rivalida immediatamente al resync e conserva una ripresa arrivata durante acquire. Nessun nuovo endpoint/schema/dependency; proxy HA e permessi invariati. Banco locale0.9.38/r100 e passaggio fisico iPhone→Edge confermato in [REP004](reports/REP-20261103-004-cambio-dispositivo-immediato.md). Prima SSE/legacy o perdita silenziosa senza EOF conservano fallback180s. Background con trasporto vivo mantiene l’uso; sospensione che termina il trasporto può liberarlo e impone riverifica al ritorno.

**Evoluzione corrente, 2026-11-03:** [ADR-0037](decisions/ADR-0037-uso-esclusivo-profilo-e-posizioni.md), [report](reports/REP-20261103-001-spostamento-widget-live.md): account/configurazione comuni, uso alternato fra istanze. Concessione verificata per utente/client/loginHA/istanza, stato in RAM180s/rinnovo20s e proof effimero negli header; gate prima dei widget e guard sui writer ACA, edit lease, intenti comando, facade dispositivi/Casa3D. Pagehide best effort con grazia3s per reload; cleanup ordinario senza grazia; ritorno visibile verifica possesso preservando editor valido. Proxy/permessi HA invariati: esclusività funzionale ACA, non nuovo confine autorizzativo HA. Nessuna tabella uso persistente; sola colonna nullable usage_lease_id negli intenti per fencing. Suggerimenti posizionali normalizzati nel JSON delle pagine comuni, proiezione ordinata/adattiva e segmenti locali senza scrittura per rotazione. Implementato/verificato nel software e sul banco0.9.38/r99; riscontro fisico distinto. Le note seguenti conservano il precedente uso simultaneo con questa sostituzione esplicita.

**Evoluzione corrente, REP016 / ADR-0036, 2026-11-02:** [account e modifiche immediate](decisions/ADR-0036-account-e-modifiche-immediate.md) sostituisce la selezione locale del profilo e la denominazione obbligatoria del lotto U52. Il backend conserva una selezione autorevole per account in `aca_v2_account_profiles`, migrando selezioni concordi o chiedendo una scelta se divergenti; i client nuovi ereditano la selezione. Sessioni e identità tecniche rimangono separate, senza un prompt di denominazione. Il coordinatore pubblica checkpoint automatici di operazioni mirate e conserva gli input arrivati durante HTTP anche in IndexedDB. Fatto/Fine termina dopo gli ultimi cambi; SSE applica revisioni monotone senza risalvataggi. Risorse/lease, proprietà, offline e intenti comando restano invariati. Implementazione/verifiche e banco0.9.37 nel [report016](reports/REP-20261102-016-modifica-immediata-e-ingresso-profilo.md); le note U52 seguenti conservano i confini e gli stati storici, con le sostituzioni esplicite di ADR-0036.

Aggiornato: 2026-11-02, U52–U54. Questa mappa descrive l'organizzazione corrente e le decisioni accettate; avanzamento, verifiche e limiti restano in [project-status.md](project-status.md) e nel [report U52–U54](reports/REP-20261102-012-profili-client-editing-tavano.md). I requisiti sono in [product.md](funzionalita/product.md); gli [ADR](decisions/README.md) registrano le scelte e la loro fonte umana. Il [piano approvato](riprogettazione/blocchi/03-profili-dispositivi-tavano-piano.md) e la [guida di prova](riprogettazione/blocchi/03-profili-client-tavano-prova.md) distinguono comportamento e uso operativo. Il testo precedente è conservato nella sezione storica in fondo.

## Esecuzione e collegamento alla centrale

La direzione corrente è quella di [ADR-0031](decisions/ADR-0031-ritorno-mini-pc-client.md): mini PC con Home Assistant e ACA predisposti; desktop Electron, Android Capacitor e browser sono client collegati all'indirizzo della centrale. La VM sul PC desktop resta un esperimento accantonato, con checkpoint conservato; non è il backend del flusso corrente. Il browser consente l'uso anche quando manca un'app installata ([ADR-0030](decisions/ADR-0030-qr-web-app-browser.md)).

Il percorso applicativo è client → server ACA sul mini PC → Home Assistant → dispositivi. La webapp usa le API ACA sotto `/api` e il proxy HA sotto `/ha`, anche per autenticazione e WebSocket; il browser non deve conoscere un secondo indirizzo HA. Gli adattatori nativi gestiscono asset/cache e inoltro locale delle richieste verso la centrale, mantenendo distinto quel supporto dal backend domestico.

Prima configurazione, registrazione dei membri e accesso appartengono alla webapp condivisa; HA rimane l'autorità per utenti, permessi e token. Le shell conservano scelta/salvataggio della centrale e funzioni native; desktop usa IP/incolla e Android non configurato apre prima lo scanner, con consenso e fallback manuale. L'indirizzo nel QR non equivale a una sessione autenticata o al trasferimento di un account. HA esegue dispositivi e automazioni sulla centrale, indipendentemente dalla finestra del client. Accesso remoto cloud/relay e relativo instradamento restano fuori dal perimetro U52–U54.

## Mappa dei sorgenti

Il repository comune contiene documentazione, codice e backup locali. Restano due radici npm e due lockfile, senza una nuova infrastruttura monorepo:

```text
progetto/
├── acasystem/                  npm e package-lock server/web
│   ├── frontend/              webapp e composizioni applicative
│   │   └── src/domain/launcher/ modelli launcher senza dipendenze dalle schermate
│   ├── backend/               Express, API ACA, proxy HA e persistenza locale
│   ├── casa3d/                workspace Casa 3D, con upstream/override/generati distinti
│   ├── contracts/             tipi, costanti e modelli runtime puri browser/server
│   ├── ui/                    componenti DOM React e comportamenti interattivi comuni
│   ├── design/                CSS, temi, font e copia degli asset canonici
│   └── upstream-tunet/        reference conservata
├── client/                    npm e package-lock dei client
│   ├── core/                  contratti e porte indipendenti dalla piattaforma
│   ├── shared/                fonti shell e packaging comuni, strumenti Node
│   ├── windows/               adattatore Electron e HTML specifico
│   ├── android/               adattatore Capacitor e HTML specifico
│   └── scripts/               ingressi degli strumenti client
└── ha-app/                    bootstrap HAOS e preparazione locale delle release
```

`client/shared/shell` è la fonte di composizione CSS e icona dei launcher; il tema e i font arrivano da `acasystem/design`. Windows genera `windows/generated-shell`, Android genera `android/www`; gli output sono ignorati e si rigenerano dalle fonti. `shared/packaging` fornisce l'unico assembler del bundle web e gli strumenti ZIP; gli ingressi Windows/HAOS rimangono distinti. Le [istruzioni shared](../progetto/client/shared/README.md) descrivono i consumatori.

## Confini applicativi

La struttura del frontend conserva i principi di [ADR-0004](decisions/ADR-0004-principi-frontend.md): primitive condivise, componenti di sistema e widget, composizioni in `templates` e schermate in `pages`. Alias `@/` indica `frontend/src`. Controller, sessioni, configurazione della casa e adattatori HA rimangono applicativi; non entrano nella UI riutilizzabile.

La fonte delle primitive e dei comportamenti DOM è `ui`, secondo [ADR-0033](decisions/ADR-0033-ui-movimento-layout-condivisi.md); i precedenti percorsi frontend sono re-export degli stessi moduli. `design` conserva CSS/font di [ADR-0032](decisions/ADR-0032-design-condiviso-workspaces.md). Browser, WebView e renderer Electron possono usare la UI React; una schermata HTML semplice può consumare il solo design. Casa3D mantiene il proprio adattatore Lit/Shadow DOM.

U46 colloca catalogo, geometria e classificazione launcher in `frontend/src/domain/launcher`, separati dalle schermate che li presentano. Il flusso di rimozione e annullamento è estratto in `hooks/launcher/useLauncherRemoval.ts`; il launcher rimane una composizione applicativa. U52 aggiunge qui l'ordine comune e la proiezione locale. `hooks/liveProfiles` coordina sessione del profilo, editor e bozze; `components/account` compone la personalizzazione dell'utente, distinta dal layout della casa.

`contracts/devices.ts` resta un contratto di soli tipi della facciata dispositivi. La cartella `contracts` contiene ora anche costanti e funzioni runtime pure: `profileResources.ts` calcola differenze/risorse e applica modifiche ammesse, `widgetIdentity.ts` descrive identità e impostazioni condivise dei widget, `activity.ts` definisce anche la proiezione depurata dei dati esportati. Non importano React, storage o servizi server. Le validazioni di autenticazione, proprietà e input delle API restano nei relativi confini applicativi.

Il backend conserva router, controller, servizi, modelli e validatori; `createApp` permette la sostituzione delle dipendenze nelle prove. HA mantiene l'esecuzione delle integrazioni e delle automazioni; ACA espone i propri servizi applicativi e media i percorsi HA concordati. I contratti condivisi non spostano il motore HA nei client.

## Identità, profili e modifiche condivise

[ADR-0035](decisions/ADR-0035-profili-live-client-e-tavano.md) registra le scelte U51–U54. Il protocollo sotto `/api/v2` distingue casa, utente HA, client nominato, sessione HA, singolo editor e profilo. `/registration` consente a chi raggiunge la centrale pronta di creare un normale membro HA senza approvazione: l'identità tecnica già predisposta crea l'utente senza privilegi amministrativi. Password soltanto transitoria; il journal di recupero conserva identificativo/esito del tentativo, senza password. Questo percorso non sostituisce l'onboarding del primo proprietario.

`v2/auth.ts` ricava utente e refresh-token ID correnti da HA; nome e ID client dichiarati dal browser non autorizzano le richieste. Un client può essere revocato senza eliminare account o profili. ACA conserva i legami di sessione e, per i bearer già verificati, soltanto fingerprint SHA-256 per impedire il riuso HTTP conosciuto anche sui percorsi precedenti. Il blocco ACA e la conferma della revoca HA sono esiti distinti; l'attesa di HA rimane visibile. Un rifiuto definitivo riporta al login, mentre indisponibilità HA/503 conserva sessione nota e bozze.

`v2/store.ts` conserva in SQLite client, profili personali, revisioni complessive/per risorsa, fonti di migrazione e ricevute delle operazioni. Libreria e selezione del profilo appartengono all’account; nuovi accessi ereditano la selezione e il cambio esplicito si propaga ai client. SSE autenticato sotto `/v2/events` segnala revisioni e richiede rilettura autorevole, senza trasmettere credenziali o snapshot completi negli eventi. L'ordine dei widget è comune al profilo; griglia, formato e segmenti di overflow sono proiezioni locali. Aprire o ruotare uno schermo non pubblica una nuova disposizione.

Alla prima introduzione delle tabelle v2 su un database a file esistente viene creato un checkpoint SQLite. Configurazioni account, vecchi profili e configurazioni per dispositivo rimangono fonti distinte, con originali e versioni recuperabili. La scelta iniziale mostra un'anteprima, conserva l'aspetto moderno presente e usa una base esplicita se l'aspetto manca; non lo attribuisce retroattivamente all'originale. La migrazione registra la fonte e riusa l'ID del vecchio profilo quando disponibile. `commonOrderVersion` impedisce di ricalcolare l'ordine già scelto. Il profilo iniziale nuovo riceve le categorie di partenza con `categoryDefaultsVersion`; fonti importate e profili autorevoli non vengono riempiti nuovamente dai vecchi effetti di inizializzazione.

L'attivazione v2 è registrata per utente in `aca_v2_migrations` e resta valida anche dopo la cancellazione dei suoi profili. Il guard persistente rifiuta le vecchie scritture globali su profili/impostazioni/account pairing con richiesta di aggiornamento, preservando le letture di recupero. Il frontend normale usa `LiveProfilesProvider` e disattiva i writer legacy; la demo mantiene il proprio percorso separato.

Le API `/profiles`, `/leases` e `/operations` applicano modifiche granulari sul dato corrente. La centrale deduce le risorse coinvolte; una riserva dura 45 s, rinnovata ogni 15 s, e può coprire widget collegati alla stessa impostazione o l'intera struttura del profilo. Un vecchio editor non conserva autorità dopo scadenza o riavvio. Salvataggio, ricevuta ed evento sono atomici; undo controlla le risorse interessate. IndexedDB conserva bozze e ultima lettura nota per casa/account/client, con limite bozze di 10 MiB, conflitti e recupero espliciti. Non è una coda di comandi domestici.

## Comandi, Tavano e account

`v2/commands.ts` prepara intenti monouso di 60 s, li porta atomicamente a `pending` prima dell'invio e usa il token personale verificato per chiamare HA. La facciata dispositivi conserva il proprio confine tecnico e l'attribuzione delle attività. Un timeout dopo possibile invio produce esito incerto e consultazione dello stato, senza nuovo invio fisico automatico. L'accettazione di HA e lo stato osservato del dispositivo restano informazioni distinte.

Tavano legge `/v2/activity`: tutti i membri autenticati della casa possono consultare metadati di attività, comandi e diagnostica, comprese attività dei profili, senza ottenere permessi sui profili altrui. Il registro conserva fino a sette giorni entro quota logica di 50 MiB, con diagnostica entro 10 MiB. Il widget apre la lista fullscreen; filtri, paginazione, copia del testo caricato con prompt diagnostico ed export JSON usano dati depurati. Non sono inclusi password, token, PIN, inviti, configurazioni complete o file immagine; nessun invio automatico a chat o servizi AI.

`/v2/account` gestisce colore e metadati revisionati del proprietario; `/images/avatar|cover` gestisce immagini con confronto della revisione e persistenza tramite la modalità di cifratura dati ACA. Il browser ritaglia raster JPEG/PNG/WebP senza salvare il sorgente: avatar 512×512 entro 256 KiB, cover 1536×768 entro 768 KiB, input massimo 10 MiB. Il server verifica formato, geometria, dimensione e proprietà. L'avatar può essere letto dai membri autenticati per Tavano; la cover è del proprio account e compare soltanto nella sua vista. Foto e colore sono alternative visive, distinte dai profili dashboard.

## Generazione, controlli e provenienza

Il comando `npm test` della radice `acasystem` include i controlli Node UI/design e i test dei tre workspace; i modelli runtime comuni hanno anche controlli dedicati. Strict e lint rimangono nei rispettivi progetti; i comandi dei client sono nella loro radice npm. Questa organizzazione non costituisce evidenza di esecuzione: risultati e limiti sono nel [report corrente](reports/REP-20261102-012-profili-client-editing-tavano.md).

Le copie del design puliscono soltanto una destinazione dedicata `design-aca`, con verifica dei percorsi, e riproducono gli asset canonici. Cache `node_modules` e output generati sono esclusi da Git; fonti e lockfile restano versionabili. I generati Casa3D mantengono il proprio flusso upstream/override: non diventano fonti manuali.

`ha-app/build-base.mjs` costruisce l'immagine da uno snapshot dei nomi e byte sorgente. `prepare.mjs` confronta hash e versione con l'immagine prima di preparare materiali locali, riusa lo snapshot nell'archivio sorgenti e registra `SOURCE-PROVENANCE.json`. È un collegamento locale fra input e immagine, senza firma e senza garanzia di riproducibilità byte per byte; il riferimento base `node:26-alpine` rimane mobile. Preparazione, verifica e pubblicazione sono passaggi distinti.

Il Dockerfile copia `contracts` sia nel builder sia nello stage finale: il backend importa ora moduli runtime condivisi e deve trovarli anche fuori dall'ambiente di compilazione. La build unica include webapp, backend e Casa3D. I contenitori nativi Windows/Android 0.1.0 non incorporano automaticamente queste nuove funzioni: richiedono webapp/backend v2 della centrale aggiornati; artefatti locali, immagine locale e installazione/pubblicazione sono stati separati.

[ADR-0034](decisions/ADR-0034-consolidamento-progetti-e-confini.md) registra il consolidamento U46; ADR-0035 precisa i nuovi flussi applicativi sullo stesso stack. I due lockfile restano distinti e il checkpoint VM resta conservato. Per sapere quali parti siano completate, costruite, installate o ancora in prova usare lo stato e il report corrente, non le descrizioni storiche seguenti.

## Storico esplicito — architettura precedente

Il testo seguente conserva la descrizione del 2026-10-05/06 e le proposte di quel periodo. Non descrive lo stato corrente e non prevale sulle decisioni successive, in particolare ADR-0031/0032/0033/0034. Sono conservati contenuti e riferimenti; sono adattati soltanto i livelli dei titoli per distinguerlo dalla mappa attuale.

### Architettura proposta e decisioni

Aggiornato: 2026-10-05. Fonte dell'intento: [product.md](funzionalita/product.md). Stato reale e questioni aperte: [project-status.md](project-status.md).

### Stato e confini

Sono disponibili documentazione, Git locale e banco prova HA Container/Tunet 1.22.1, installato su richiesta umana del 2026-10-05 ([report](reports/REP-20261005-004-installazione-tunet.md)). HOME è il primo incremento TS/primitive/italiano; il materiale Neumorphism della HOME e dei controlli condivisi è implementato sul banco locale, con limiti in REP-20261005-008. [ADR-0003](decisions/ADR-0003-home-assistant-locale-fase1.md) approva Home Assistant come base, Tunet come riferimento React e fase 1 grafica in ufficio. Linux a 64 bit ammette ARM64/x86-64; Hetzner è escluso. Il [perimetro del pilota](funzionalita/pilot-scope.md) delimita il primo risultato e le estensioni.

La direzione è locale, con massimo uso possibile senza internet e obiettivo remoto online. Nel banco prova: browser → Tunet Express/asset locali su porta 3002; browser → HA WebSocket/OAuth su 8123; backend Tunet → HA per validare l'identità; SQLite in volume Docker per profili/snapshot. Il server interno HA è host.docker.internal; nessun sorgente HA è modificato. Versioni e dati in [infrastructure.md](infrastructure.md). Queste scelte esecutive autorizzate per il banco prova non definiscono ruoli ACA, disponibilità offline o architettura del prodotto distribuito.

### Struttura dal 2026-10-06 (ADR-0007/0008, REP-20261006-001)

Il codice è in `progetto/acasystem`, monorepo npm con due workspace, più `upstream-tunet/` per i file di Tunet tenuti solo come riferimento.

- **`frontend/`:** React 19, Vite 8, TypeScript strict per cartella. Gli strati seguono una gerarchia verificata da ESLint, `components/primitives` → `components/system` → `components/widgets` → `templates` → `pages`, più:

  | Cartella | Contenuto |
  |---|---|
  | `@types` | Dominio HA, configurazione, contratto del launcher. |
  | `api` | Client di HA e del backend. |
  | `hooks` | Compresi i contesti in `hooks/context` e il launcher in `hooks/launcher`. |
  | `utils` | Funzioni pure, config, i18n, fixture. |
  | `validators` | Controlli dei dati salvati e dei payload. |
  | `themes/acasystem` | Kit Metallo. |
  | `routes` | Instradamento. |

  Alias `@/` → `frontend/src`.
- **`backend/`:** Express in TypeScript a livelli (`config`, `controllers`, `helpers`, `middlewares`, `models`, `routes`, `services`, `validators`, `server.ts`), eseguito da Node con lo stripping dei tipi. Stessi endpoint e stesso database SQLite `tunet.db` del banco prova.
- **Immagine Docker unica:** builder del frontend, poi runtime del backend che serve `frontend/dist`.
- **Interfaccia:** launcher «OS» con pagine a celle stile Android, widget per dominio definiti da `WidgetDefinition` (registro in `components/widgets/registry.ts`), fogli di dettaglio e pagina Sistema. I widget ricevono i dati da `WidgetRuntime` (contesto). Il codice dell'interfaccia Tunet sostituita è stato cancellato il 2026-10-07 su richiesta dell'utente (ISSUE-029); resta consultabile nelle istantanee `usa-come-git/v009`–`v011`.

La sezione seguente descrive l'organizzazione precedente, al 2026-10-05.

### Organizzazione frontend richiesta

[ADR-0004](decisions/ADR-0004-principi-frontend.md) registra primitive condivise per componenti, tipografia e layout, interfacce composte principalmente con queste e componenti specifici per pagina. L'[audit Tunet](reports/REP-20261005-005-audit-struttura-tunet.md) fotografa la baseline. [ADR-0005](decisions/ADR-0005-typescript-italiano-icone.md) e [REP-20261005-006](reports/REP-20261005-006-migrazione-home-typescript.md) avviano la migrazione TS/italiano con mx-icons della prima schermata.

Struttura implementata in src/primitives: components (Button, Card, Container, Icon, Input, Choice, Switch, Modal, PanelPresence, Skeleton), typography (Heading, Text), layout (Flex). src/components/pages/home contiene HomeEmptyState e HomePageIcon; Header, PageNavigation, EditToolbar, SettingsMenuControl e SettingsDropdown sono TSX nei percorsi esistenti. App, DashboardLayout e DashboardGrid restano adattatori JS alla porzione migrata, senza conversione del backend o delle card. Aggiunta scheda, aggiunta/modifica pagina e selettore icone sono TSX; contratti in src/types/home.ts e management.ts; strict e test HOME in tsconfig.home.json, controllo obbligatorio prima della build. Il confine con il JS legacy non diventa completamente tipizzato.

Le primitive sono indipendenti da HA; interfacce e adattatori mantengono le callback esistenti. Nessun cambiamento a flussi HA/API/persistenza. Materiale HOME in styles/neumorphism.css e themes.js, Button con varianti control/primary/secondary e Container raised/inset; i pulsanti Entità/Indicatori riusano queste primitive negli adattatori JS. REP-20261005-009 estende il materiale alle finestre di gestione. Modal riusa il focus manager esistente; la gestione delle entità HA rimane fuori dalle primitive. Il catalogo icone persistito conserva gli identificativi originari. Vite separa mx-icons in vendor-icons-mx per rispettare i budget esistenti senza alzarli. Il sistema del resto delle interfacce resta da realizzare. Cartelle nuove e parser lint sono scelte esecutive dell'incarico, non decisioni sulla futura infrastruttura di produzione.

PanelPresence e Skeleton sono primitive TS aggiunte in [REP-20261005-010](reports/REP-20261005-010-pannelli-skeleton.md). PanelPresence trattiene l'ultimo nodo dei 31 slot di ModalManagementSlice, ModalSettingsSlice e ModalEntitySlice fino alla fine dell'uscita (fallback 200 ms), annulla lo smontaggio se il pannello riapre e libera il timer se la vista viene rimossa. AccessibleModalShell ignora Escape durante l'uscita e coordina i blocchi scroll sovrapposti senza sottrarre focus al nuovo dialogo. Skeleton usa gli stati di fetch esistenti; nessuna libreria di animazione, API o dipendenza aggiunta.

### Componenti e responsabilità previste

| Componente | Responsabilità | Decisione / questione aperta |
|---|---|---|
| Client e frontend locale | Personalizzazione grafica, stati e comandi del perimetro concordato | Base Tunet 1.22.1 installata nel banco prova; schermate ACA, riuso commerciale e copertura da definire. |
| Host locale e Home Assistant | Collegamento ai dispositivi ed esecuzione locale | HA Container nel banco prova; hardware finale, metodo HA e protocolli da scegliere. |
| Account e sessioni | Login, primo setup e consegna al cliente | OAuth2 HA collegato nel banco prova; ruoli/setup ACA da progettare, nessun Identity Provider centrale obbligatorio. |
| Configurazioni e dati | Conservazione locale delle informazioni necessarie al funzionamento | Browser e SQLite/volume Tunet nel banco prova; backup, retention e recupero da progettare. PostgreSQL/TimescaleDB non sono prerequisiti scelti. |
| Accesso remoto | Gestione online da fuori casa | Meccanismo da scegliere; nessun broker Hetzner o fornitore sostitutivo selezionato. |
| Estensioni | Piantina, moduli, catalogo e AI | Fuori dal minimo grafico; sedi di esecuzione, versioni e limiti da definire nei relativi incarichi. |
| Più utenze e condominio | Dispositivi comuni e ambiti privati | Requisito di isolamento approvato; una o più istanze su hardware condiviso sono alternative da valutare. |

### Flussi richiesti e proposti

1. **Uso locale:** client → frontend/endpoint locale autorizzato → HA → dispositivo; stati ritornano al client. Asset, sessioni e riavvio offline vanno progettati e provati.
2. **Primo setup richiesto:** sessione admin aperta solo inizialmente → configurazione/associazione dispositivi → logout admin → login cliente. Attivazione e chiusura della sessione sono ancora da progettare.
3. **Automazione locale:** evento → logica HA → azione sul dispositivo locale. Identificare integrazioni dipendenti dal cloud; distinguere guasto WAN da guasto LAN/alimentazione.
4. **Remoto futuro:** client esterno → accesso autenticato da definire → impianto autorizzato → dispositivo. Il percorso e i confini TLS non sono selezionati.
5. **Condominio futuro:** amministratore condominiale → configurazione autorizzata sul dispositivo comune; configurazione dei dispositivi privati rifiutata. Letture/comandi seguono una policy ancora da precisare.
6. **Estensioni future:** configurazioni/scenari approvati → distribuzione/versione → attivazione e conferma. AI genera bozze da validare; nessun motore, database o protocollo ACA è scelto.

Sono flussi funzionali, non API implementate. La fase 1 non richiede la realizzazione implicita di tutte le estensioni.

### Interfacce da progettare

| Confine | Informazioni da definire | Verifica prevista |
|---|---|---|
| Frontend ↔ HA | Asset, API, autenticazione, sessioni, stati/comandi e riconnessione | V-02/V-03/V-05 |
| Admin ↔ cliente | Primo setup, logout, assegnazione/revoca e account cliente | V-06 |
| Ambiti comuni ↔ privati | Identità, entità, dati, configurazioni e isolamento anche su API | V-17; valutazione ISSUE-015 |
| Remoto ↔ locale | Percorso, accessi, TLS e assenza di dipendenza operativa WAN per il locale | V-02 e progetto remoto |
| Catalogo/AI ↔ automazioni | Dati ammessi, versioni, validazione, consegna e ripristino | V-08/V-11/V-12/V-13/V-14 |
| Configurazioni ↔ client | Personalizzazione e comportamento offline | V-09/V-10/V-15 quando assegnati |

HA distingue controlli sulle entità e controlli amministrativi nella [documentazione dei permessi](https://developers.home-assistant.io/docs/auth_permissions/), consultata il 2026-10-05. L'esistenza delle API non prova il ruolo condominiale ACA: configurazione limitata ai soli beni comuni richiede un progetto e prove dei percorsi effettivi. [Autenticazione HA](https://developers.home-assistant.io/docs/auth_api/) e [metodi d'installazione](https://www.home-assistant.io/installation/) restano riferimenti; Container è usato soltanto nel banco prova corrente. Fonti ed evidenze progettuali nel [report](reports/REP-20261005-001-direzione-pilota.md).

### Come aggiornare il progetto

Una scelta significativa viene proposta con un ADR e accettata sulla base di una richiesta umana identificabile. Dopo l'approvazione aggiornare i componenti/contratti interessati, i requisiti e le verifiche. Dopo l'implementazione collegare manifest, configurazioni e risultati reali. Lo stato corrente resta nel registro dedicato; le proposte alternative non diventano sostituzioni implicite.
