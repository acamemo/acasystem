# REP-20261028-003 — Piano: «Dispositivi trovati» all'avvio di Acasystem

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261028-003, piano della schermata dei dispositivi scoperti all'avvio |
| Stato | Sviluppo S1-S4 fatto e verificato con HA simulato; non committato. Restano S0 (prova LG con l'identità di servizio) e la prova sul Tab M11 |
| Data | 2026-10-28, in ufficio (Europe/Rome) |
| Autore / modello | Claude Code, `claude-opus-5-5` |
| Commit di partenza | `451649f` |
| Richiesta di riferimento | Dopo la configurazione iniziale della copia `acasystem-ha-s45` in ufficio, l'utente: «comunque Home assistant è fatto bene, all'avvio mi ha dato che già aveva trovato dei dispositivi da collegare con un popup e i loghi dei dispositivi, come ha fatto?». Poi: «scusa ma se all'avvio di Acasystem facessimo la stessa cosa? Cioè scoperta automatica come prima interfaccia anche su acasystem, uguale a come fa HA ma con il nostro design, mostrando i loghi dei dispositivi rilevati e il numero di dispositivi trovati. uguale e identica nel layout, personalizzata col design nostro». Sul limite (solo ciò che HA scopre da solo): «nessun problema, però già così il lavoro di un sistemista si semplifica perché può integrare i dispositivi che si trovano subito, poi per quelli più particolari abbiamo aggiungi un dispositivo». Alla proposta di scrivere il piano: «procedi». |
| Autorizzazione | Prima solo il piano. Poi, dopo le decisioni dell'utente: «Via libera allo sviluppo S1-S4 della schermata Dispositivi trovati.» (2026-10-28). Nessun commit, push o banco senza richiesta. |

## Obiettivo e perimetro

**Risultato voluto.** All'avvio, Acasystem mostra come prima schermata i dispositivi che Home Assistant ha già scoperto in rete. La schermata contiene:
- il numero dei dispositivi trovati;
- per ciascuno, il logo della marca e il nome.

Il layout è lo stesso del passo «integration» della configurazione iniziale di HA; colori, materiali, tipografia e animazioni sono quelli di Kit 2. Un tocco su un dispositivo lo collega con il flusso che Acasystem ha già. Lo scopo è semplificare il lavoro del sistemista: collega subito ciò che si annuncia da solo e usa «Aggiungi un dispositivo» per il resto.

**Limite accettato dall'utente.** La schermata mostra solo i dispositivi che HA scopre da solo. Una TV come la Samsung UE50J6200 di casa, che HA non propone (ISSUE-122), non compare: resta il percorso di «Aggiungi un dispositivo».

**Requisiti e decisioni collegati:**
- REQ-19 e AC-19: «Rileva dispositivi», «Trovati in rete»;
- REQ-18 e AC-18: aggiunta da Acasystem, identità di servizio;
- ADR-0021, ADR-0022, ADR-0024;
- design: `documentazione/design/design.md`; frontend: ADR-0004 e ADR-0005.

**Escluso:** nuove integrazioni; scoperta fatta da Acasystem invece che da HA; modifiche a HA; dispositivi non scoperti da HA.

**Modifiche preesistenti:** albero di lavoro pulito a `451649f`, a parte `.claude/` non tracciata. È accesa un'istanza di prova temporanea, `aca-prova-lg` su `:3004`, fuori dal repository.

## Come lo fa Home Assistant (fatti)

- **Scoperta.** HA ascolta zeroconf/mDNS, SSDP, DHCP, Bluetooth e USB. Ogni integrazione dichiara nel proprio `manifest.json` come riconoscere i suoi dispositivi. Quando un annuncio corrisponde, HA apre un flusso di configurazione con `source` uguale a `zeroconf`, `ssdp`, `dhcp`… e lo lascia in attesa di conferma. Alcune integrazioni, come Google Cast, si configurano da sole.
- **Loghi.** Il repository [`home-assistant/brands`](https://github.com/home-assistant/brands) (consultato il 2026-10-28) li pubblica sulla CDN `brands.home-assistant.io/[domain]/icon.png`, con le varianti `logo`, `@2x` e `dark_`.
  - **Avviso del repository sui marchi:** i marchi appartengono ai rispettivi proprietari e il progetto HA usa le immagini «for identification purposes only»; nessuna licenza esplicita per le immagini.
- **Loghi serviti da HA stesso.** Da HA 2026.3 i loghi passano da HA: `/api/brands/integration/{domain}/{image}`, con autenticazione. Il token si ottiene con il comando WebSocket `brands/access_token` e va passato come parametro `token`. HA tiene una cache su disco, quindi i loghi restano disponibili anche senza internet ([blog degli sviluppatori di HA, 2026-02-24](https://contributors.home-assistant.io/blog/2026/02/24/brands-proxy-api), consultato il 2026-10-28).
  - **Verifica:** sulla copia della VM (HA 2026.10.4) `GET /api/brands/integration/webostv/icon.png` senza token dà **403**: l'indirizzo esiste e vuole l'autenticazione.

## Cosa esiste già in Acasystem

- **Server:**
  - `GET /api/scoperti` dà i flussi scoperti: `flowId`, `handler`, `source`, `name`, `model`, `family`, `addable`, `reason`;
  - `POST /api/scoperti/:flowId/aggiungi` porta avanti il flusso;
  - `POST /api/scoperti/:flowId/ignora` corrisponde a «Non mi interessa»;
  - tutti passano dall'identità di servizio e valgono anche per il cliente (ADR-0024).
- **Frontend:**
  - `DeviceFinder`, con le sezioni «Trovati in rete» e «Televisori in rete»;
  - `DiscoveredAddFlow`, il flusso passo per passo;
  - `useDiscoveredDevices`;
  - `DiscoveredFlowContext`.
- **Manca:**
  - la schermata d'avvio con griglia di loghi e conteggio;
  - i loghi;
  - la regola su quando mostrarla.

## Proposta

**Schermata «Dispositivi trovati».**
- Titolo e conteggio, per esempio «Abbiamo trovato 5 dispositivi».
- Griglia di tessere quadrate, ciascuna con logo, nome e modello.
- In fondo «Continua», che porta alla home.
- Layout come il passo di HA (titolo, griglia di loghi, pulsante); stile Kit 2 su primitive condivise (ADR-0004).
- Un tocco su una tessera apre sopra la schermata `DiscoveredAddFlow`, lo stesso flusso di «Trovati in rete». Alla fine la tessera diventa «Collegato».
- La griglia si aggiorna mentre HA scopre altro: stesso intervallo di `useDiscoveredDevices`, da verificare.

**Loghi.**
- Passano dal server di Acasystem: una nuova voce del catalogo delle API di HA (`brands.access_token` più `/api/brands/integration/{domain}/icon.png`), letta con l'identità di servizio e servita al browser da un endpoint `/api/...` con cache.
- Il browser non contatta terzi. HA scarica già i loghi per sé, quindi Acasystem non aggiunge richieste esterne.
- Variante `dark_` se il tema la richiede. Senza logo, l'icona della famiglia di Kit 2.

**Decisioni dell'utente:**

| ID | Domanda | Raccomandazione |
|---|---|---|
| P-1 | Quando compare? | Alla prima apertura dopo la configurazione, come HA. Dopo, solo un avviso discreto («3 nuovi dispositivi trovati») quando ce ne sono di nuovi, che apre la stessa schermata. Mostrarla a ogni avvio diventa un ostacolo. |
| P-2 | Chi la vede? | L'installatore e l'amministratore alla prima apertura. Il cliente vede l'avviso, se l'aggiunta del cliente resta permessa da ADR-0024. |
| P-3 | Dispositivi già aggiunti da HA da soli (Cast) | Due gruppi: «Pronti da collegare» (flussi in attesa) e «Già in Home Assistant» (con «Usa questo» per il widget, come oggi). Il conteggio del titolo riguarda i primi. |
| P-4 | Dispositivi che Acasystem non sa portare a termine (`addable` falso) | Mostrati in grigio con «Richiede l'installatore», non nascosti, così il conteggio è onesto. |
| P-5 | «Non mi interessa» sulla tessera | Pressione lunga o menu della tessera. Nessun pulsante visibile, per tenere la griglia pulita come in HA. |
| P-6 | Requisito | Estensione di REQ-19, con un punto nuovo di AC-19, invece di un REQ nuovo. |

**Uso dei loghi (da verificare, non deciso).** Il repository di HA dichiara un uso a fini di identificazione e non concede una licenza esplicita. Acasystem li userebbe allo stesso modo: indicare di che marca è il dispositivo, attraverso HA. La compatibilità con un prodotto commerciale **non è verificata**; va registrata nel registro di conformità prima del rilascio ai clienti.

## Risposte dell'utente (2026-10-28)

Le raccomandazioni della tabella sopra restano come storico; valgono le risposte seguenti.

- **P-1, quando compare.** «la prima volta che si apre l'app, puoi decidere di saltare ma per farla ricomparire cliccando sul + che si apre la tendina dei widget è presente discovery come se fosse un widget e cliccato fa ricomparire questa interfaccia».
  - **Decisione:** la schermata compare alla prima apertura dell'app e ha un pulsante per saltarla.
  - **Per riaprirla:** nella tendina dei widget, aperta dal «+», c'è una voce «Discovery» presentata come un widget; il tocco riapre questa schermata.
  - L'avviso «N nuovi dispositivi», che avevo proposto, non è richiesto.
- **P-2, chi la vede.** «viene visualizzata sempre senza bisogno dell'installatore».
  - **Decisione:** la vedono tutti, cliente compreso, senza passare dall'installatore.
- **P-3, dispositivi già aggiunti da HA.** «il widget Discovery solamente sostituisce entrambi». Chiarimento dell'utente: «la più corretta sarebbe "una singola lista"… potrebbe essere un idea usare un menu a fisarmonica nel popup, con Dispositivi rilevati col menu dettagli già aperto e tutti i dispositivi rilevati di base dal discovery di HA con la griglia coi loghi se i dispositivi non risultano collegati (es rileva 8 dispositivi, un utente ne collega 7, il rimanente è nel menu mentre gli altri risultano nel dropdown già collegato), mentre gli altri menu di base sono tutti collassati… cliccando su uno di questi menu si apre quello e si chiude quello aperto… migliorala e fai le tue valutazioni». Proposta rivista nella sezione seguente.

### Proposta rivista: una finestra a fisarmonica (valutazione dell'agente, da confermare)

**Struttura**, dall'alto verso il basso:
- **Testata:** titolo «Dispositivi trovati», riepilogo «8 trovati · 7 collegati» e pulsante «Salta» (P-1).
  - Il riepilogo si aggiorna a ogni collegamento.
  - Quando non resta nulla da collegare, «Salta» diventa «Continua».
- **Sezioni della fisarmonica.** Ogni sezione ha un'intestazione con il numero e se ne apre una sola alla volta, come chiesto.
  1. **Da collegare (N)**, aperta all'avvio. Griglia di loghi dei dispositivi scoperti da HA e non ancora collegati. Al tocco si apre il flusso di aggiunta, con «Ignora» (P-5). Il dispositivo collegato esce dalla griglia, il numero di «Collegati» sale e la sezione resta aperta.
  2. **Collegati (N)**, chiusa. Dispositivi collegati adesso più quelli che HA ha aggiunto da solo (Google Cast…): così la lista resta unica, come vuole l'utente. Ogni voce dice quale widget è stato creato (per esempio «Videocamera»); per quelli aggiunti da HA da solo c'è «Crea il widget», un tocco e il tipo viene scelto da solo. Dettagli nelle precisazioni qui sotto.
  3. **Ignorati (N)**, chiusa, mostrata solo se N > 0. Con «Ignora» visibile un tocco sbagliato è facile; da qui si ripristina. HA tiene i dispositivi ignorati come voci con origine `ignore`. Il ripristino da Acasystem **non esiste ancora**: va aggiunto al server.
  4. **Non trovi il tuo dispositivo?**, chiusa. Porta ad «Aggiungi un dispositivo», con marche consigliate e ricerca per indirizzo, per i casi come la Samsung di casa.

**Valutazioni:**
- **Una sola sezione aperta** va bene sul Tab M11: la finestra è alta 665 px e due griglie aperte insieme scorrerebbero male. Il costo è che non si confrontano due sezioni, cosa poco utile qui.
- **Quando «Da collegare» si svuota** non si apre da sola un'altra sezione. Il testo è quello dell'utente (precisazione 2 qui sotto); in testata resta «Continua».
- **Prima apertura con HA appena installato:** la scoperta può richiedere qualche minuto. Caricamento con scheletro (precisazione 3 qui sotto); i nuovi arrivi entrano con un'evidenza breve.
- **Animazione:** apertura e chiusura con l'altezza animata tramite `grid-template-rows` da 0fr a 1fr, oppure senza animazione con `prefers-reduced-motion`. Va misurata sul Tab M11, dove la causa dei rallentamenti è già stata la rasterizzazione delle ombre (memoria di progetto); niente ombre animate.
- **Componente:** nel frontend non esiste una fisarmonica condivisa (`components/primitives/components` a `451649f`). Secondo ADR-0004 va creata come primitiva, per esempio `Disclosure`, con `aria-expanded`, `aria-controls` e la tastiera, e riusata altrove.
- **Il tocco sull'intestazione di una sezione già aperta** la chiude. Quindi può succedere che nessuna sezione sia aperta, e va bene.

### Precisazioni dell'utente sulla fisarmonica (2026-10-28)

1. **Widget creato da solo, scelto per tipo.** «trovato un dispositivo, come nel mio caso trova anche un Reolink, per quel dispositivo il sistema deve riconoscere che tipo di dispositivo è automaticamente, e se voglio collegarlo me lo collega automaticamente col widget specifico di quel dispositivo (ovviamente non per marca sarebbe impossibile, però perlomeno per quel tipo di sensore, dispositivo…)».
   - **Decisione:** al termine del collegamento Acasystem crea da solo il widget del tipo giusto, senza chiedere quale.
   - **Cosa esiste (a `451649f`):**
     - `utils/devices/classify.ts` sceglie già la famiglia del widget dal tipo delle entità del dispositivo in HA (dominio, `device_class`, integrazione), non dalla marca.
     - Oggi però, a fine flusso, `DiscoveredAddFlow` passa la voce al chiamante, che apre «Aggiungi un widget» e lascia scegliere alla persona. Il passo nuovo è usare il classificatore e creare il widget direttamente.
   - **Limiti trovati nel classificatore, da risolvere in S2:**
     - **Priorità.** Le famiglie si provano in ordine fisso e la luce viene prima della videocamera. Una Reolink con faro integrato oggi risulterebbe «luce». Per i dispositivi con più funzioni serve una funzione principale: videocamera prima di luce, interruttori e sensori.
     - **Dispositivi con più funzioni.** Una Reolink porta videocamera, sensori di movimento e persona, faro e sirena. Proposta: un solo widget, quello della funzione principale, con le altre funzioni nei suoi dettagli dove il widget le sa già mostrare. Da verificare sul widget Videocamera.
     - **Dispositivi senza famiglia.** Sensori di porta o di movimento da soli, contatori di energia e simili oggi non hanno un widget (`sensor` copre solo temperatura e umidità). Per questi niente creazione automatica: resta «Aggiungi un widget». Allargare le famiglie è un lavoro a parte.
   - **Dove va il widget:** «Il widget creato da solo va nella pagina corrente al primo posto libero.» (decisione dell'utente, 2026-10-28). La persona lo sposta dopo come gli altri.
2. **Nessun dispositivo da collegare.** Testo dell'utente, rifinito: «Nessun nuovo dispositivo individuato. Se il dispositivo che cerchi non compare nell'elenco, prova ad aggiungerlo da Aggiungi un dispositivo», con «Aggiungi un dispositivo» come pulsante. Sostituisce «Tutto collegato».
3. **Caricamento con scheletro.** «questa animazione sempre presente con uno skeleton loading… l'animazione dura per il caricamento effettivo, poi comparsa dei dispositivi trovati».
   - **Decisione:** durante la ricerca la griglia mostra tessere scheletro animate; alla fine compaiono i dispositivi trovati.
   - **Valutazione.** HA non ha un segnale «ricerca finita»: zeroconf, SSDP e DHCP ascoltano di continuo e un dispositivo può arrivare dopo minuti. La fine della ricerca va quindi decisa da Acasystem. Proposta: lo scheletro dura finché il server non ha risposto e, alla prima apertura, per una finestra di ricerca; i dispositivi che arrivano durante la finestra sostituiscono le tessere scheletro uno alla volta. La durata della finestra si misura in S0, con il tempo che l'HA della VM ha impiegato a trovare i dispositivi dell'ufficio. Dopo la finestra, i ritardatari entrano lo stesso nella griglia.
   - **Tablet:** l'animazione usa solo opacità, senza ombre né sfondi in movimento, e va misurata sul Tab M11. Con il movimento ridotto le tessere restano ferme.
- **P-4, dispositivi che Acasystem non sa completare.** «acasystem deve saperli completare senza richiedere l'installatore, è un requisito».
  - **Decisione: requisito nuovo.** Cambia il punto (4) di AC-19, «Richiede l'installatore»; annotazione in `funzionalita/product.md`.
  - **Cosa comporta (dal codice a `451649f`):** oggi la risposta «Richiede l'installatore» nasce in due casi.
    - L'integrazione è di sistema (`whyNotAddable` in `discovered.ts`). Proposta: queste voci non sono dispositivi e non vanno mostrate.
    - Un passo del flusso usa campi che Acasystem non sa disegnare (`unsupported_field`) o ne ha troppi (`too_many_fields`) (`flowModel.ts`, `deviceService.ts`). Per completarli tutti servono i tipi di campo (selettori) di HA che mancano e il limite del numero di campi va tolto.
    - Anche menu e passi esterni non validi (`unsupported_menu`, `bad_external_url`) chiudono il flusso.
  - Quanti e quali selettori mancano va misurato nella tappa S1b; non è stimato qui.
- **P-5, «Non mi interessa».** «se si usasse un pulsante nell'interfaccia che ti permette di ignorare il popup?».
  - **Decisione:** un pulsante visibile «Ignora» al posto della pressione lunga.
  - **Interpretazione:** sta nella finestra che si apre al tocco del dispositivo, accanto al passo di aggiunta, e chiama `POST /api/scoperti/:flowId/ignora`. Da confermare alla prima prova.
- **P-6, requisito:** nessuna risposta. Resta la proposta: estensione di REQ-19.
- **Loghi.** «fa niente nel caso il mio capo chiede i permessi per usare i loghi, inseriscili già».
  - **Decisione:** i loghi si usano subito.
  - **Aperto:** la richiesta del permesso, che l'utente lascia al suo responsabile; registrata in `compliance.md` come C-18.

## Tappe proposte (non autorizzate)

| Tappa | Contenuto | Dipende da |
|---|---|---|
| S0 | Prova in ufficio con le TV LG: «Trovati in rete» e aggiunta di una LG `webostv` da un flusso scoperto (punto 3 di AC-19). Questa prova verifica il meccanismo su cui si regge la schermata. | Attivazione dell'identità di servizio sull'istanza `:3004` |
| S1 | Server: voce del catalogo per i loghi, endpoint con cache, test con HA finto | P-6 |
| S1b | Completamento senza installatore (P-4): elenco dei selettori e dei passi che oggi chiudono il flusso, misurato sulle integrazioni scopribili; disegno dei campi mancanti; integrazioni di sistema escluse dall'elenco | P-4 |
| S2 | Frontend: schermata, griglia, conteggio, tessere con logo, collegamento a `DiscoveredAddFlow` | P-1…P-5 |
| S3 | Regola «prima apertura» e avviso dei nuovi | P-1, P-2 |
| S4 | Verifiche: suite, tablet Tab M11, prova sulla copia della VM in ufficio | S1-S3 |

## Criteri di completamento (dello sviluppo futuro)

1. Alla prima apertura, con HA che ha scoperto N dispositivi, la schermata mostra N e le N tessere con logo e nome.
2. Un tocco collega il dispositivo senza aprire HA; il dispositivo passa in «Collegati» e il suo widget, del tipo riconosciuto, è nella home senza altre scelte (una Reolink diventa un widget Videocamera). Durante la ricerca la griglia mostra lo scheletro; senza dispositivi da collegare compare il messaggio con «Aggiungi un dispositivo».
3. Senza logo compare l'icona della famiglia; nessuna richiesta del browser a terzi.
4. Senza identità di servizio la schermata dice «Servizio non attivo», come oggi «Trovati in rete».
5. Suite e controlli verdi; prova sul Tab M11 e sulla copia della VM in ufficio con le LG.

## Sviluppo S1-S4 (2026-10-28)

Implementazione affidata a due agenti Sonnet in parallelo (server e schermata), con controllo e correzioni dell'orchestratore.

**Server (`progetto/acasystem/backend`):**
- `GET /api/dispositivi/loghi/:domain[?tema=scuro]`: il logo dell'integrazione letto da HA (`brands/access_token` e `/api/brands/integration/{domain}/{icon.png|dark_icon.png}?placeholder=no`), con cache in memoria (24 h, 1 h per i mancanti, 300 voci) e token dei loghi rinnovato su 401/403. Logo mancante: 404 `LOGO_NOT_FOUND`. Nessuna richiesta del browser a terzi.
- `GET /api/dispositivi/scoperti/ignorati` e `POST /api/dispositivi/scoperti/ignorati/:entryId/ripristina` (registrato come `scoperti.ripristina`). Il ripristino cancella la voce `ignore` di HA.
- **Fonte HA** (`home-assistant/core`, `dev`, commit `336839fa`, letto il 2026-10-28): `components/brands/__init__.py` per i loghi; `config_entries.py` `async_remove` per il ripristino. Solo DHCP riscopre subito un dispositivo ripristinato; con zeroconf e SSDP torna al suo annuncio successivo. Non provato su un HA reale.
- **S1b, flussi senza installatore.** Misura sul sorgente di HA (stesso commit): 329 integrazioni dichiarano la scoperta; selettori più usati text 39, select 33, number 7, boolean 6. Aggiunti: sezioni (`section`), selettore `country`, selettore `constant`, testo email/url/tel, `custom_value`, `suggested_value` come predefinito, elenchi lunghi come campo con suggerimenti; tolto il limite di 40 campi. **Restano «Richiede l'installatore»:** `serial_port` (4 integrazioni: russound_rio, solaredge_modbus, velbus, zha), `file` (2: velbus, zha), `entity` (1: homekit, solo opzioni), `qr_code` (1: tuya); menu ed esterni non validi invariati. Tabella completa nella cartella temporanea dell'agente, non versionata.

**Schermata (`progetto/acasystem/frontend/src`):**
- Primitiva condivisa `Disclosure` (`components/primitives/components/Disclosure.tsx`): una sezione aperta alla volta, `aria-expanded`/`aria-controls`, altezza animata con `grid-template-rows`, nessuna animazione con il movimento ridotto.
- `templates/discovery/DiscoveryScreen.tsx`: testata con «T trovati · C collegati»; sezioni «Da collegare», «Collegati», «Ignorati», «Non trovi il tuo dispositivo?»; pannello del dispositivo con «Collega», «Ignora», «Indietro»; scheletro durante la ricerca (`SEARCH_WINDOW_MS = 30_000`, provvisorio) e messaggio dell'utente quando non c'è niente da collegare. «Salta»/«Continua» sta nel piede della finestra, sempre visibile a 665 px, perché la testata del `Sheet` ha già la X.
- Loghi con `BrandLogo`/`useBrandLogo`; senza logo l'icona della famiglia.
- **Widget automatico:** a fine flusso `selectionAfterAdd` sceglie il widget dal tipo del dispositivo; il foglio «Aggiungi un widget» lavora nascosto e lo mette nella pagina corrente al primo posto libero (se è piena, nella successiva con spazio). Un dispositivo, un widget: per una videocamera con due flussi si tiene il primo (`oneWidgetPerDevice`). Senza un tipo adatto compare «Scegli il widget».
- Classificatore: la videocamera ora vince su luce, tapparella e serratura (caso Reolink con faro).
- **Prima apertura:** la schermata compare una volta per tablet (`localStorage` `aca_discovery_seen`, come il suggerimento di modifica); si riapre dalla voce «Dispositivi trovati» nella tendina dei widget del «+».

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Indirizzo dei loghi su HA | `curl` `GET http://192.168.1.88/api/brands/integration/webostv/icon.png`, copia `acasystem-ha-s45`, HA 2026.10.4 | Superato | 403 senza token: l'indirizzo esiste. Non provato con il token. |
| Condizioni d'uso dei loghi | README di `home-assistant/brands`, 2026-10-28 | Letto | Uso a fini di identificazione; nessuna licenza esplicita; valutazione legale non eseguita |
| Backend | `npm run typecheck`, `lint`, `npx vitest run` | Superato | 35 file, 583 passati e 1 saltato (nuovi `devicesLogos`, `devicesSelectors`) |
| Frontend | `npm run typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `build` | Superato | 0 violazioni; build di produzione riuscita |
| Frontend, suite completa | `npx vitest run` | Superato dopo correzione | Prima esecuzione: 3489/3491. `MetalMaterial` segnalava `:hover` fuori dalla convenzione del tema nella nuova `Disclosure` (corretto con `:is(:hover, .is-hover)`); `ConsolePrimitive` è passato da solo (instabile sotto carico). Dopo la correzione i file toccati passano |
| Schermata nel browser | Copia temporanea di `e2e/isolated-server.mjs` su `:3013` con HA simulato e scoperte finte, 1280×665 e 390×844 | Superato | Prima apertura con scheletro; dispositivi che compaiono uno alla volta; pannello con «Collega»/«Ignora»; una sola sezione aperta; nessuno scorrimento orizzontale a 390 px; dopo «Salta» non ricompare; si riapre dalla tendina. Loghi non provati (il banco non li ha) |
| Contro HA reale e Tab M11 | — | Non eseguito | Servono l'identità di servizio attiva sull'istanza `:3004` e il tablet |

## Controllo del diff e decisioni

- **Diff:** questo report, una riga nell'indice dei report e un paragrafo in `project-status.md`. Nessun file in `progetto/`.
- **Decisioni:** nessun ADR. Le decisioni P-1…P-6 restano all'utente.

## Questioni residue (2026-10-28, dopo lo sviluppo)

- Al primo avvio la schermata compare insieme al suggerimento «Tieni premuto uno spazio vuoto…»: vanno messi in sequenza.
- La durata della ricerca (30 s) è provvisoria: si misura in S0.
- Loghi e ripristino degli ignorati non sono provati su HA reale.
- I tipi di campo residui di S1b (`serial_port`, `file`, `entity`, `qr_code`) richiedono ancora l'installatore.

## Chiusura e punto di ripresa

**Stato:** sviluppo fatto, in attesa di prova reale. Non committato.

**Punto di ripresa:**
1. ricostruire l'immagine dell'istanza `:3004` e fare S0 con la LG dopo `activate`, misurando la durata della ricerca;
2. prova sul Tab M11;
3. commit su richiesta.

**Annotazione 2026-10-28, unione e revisione con /impeccable:** su richiesta dell'utente «Rileva dispositivi» e «Dispositivi trovati» sono diventati un solo widget, «Trova dispositivi», primo nell'elenco, che apre questa finestra; nella finestra sono entrati «Televisori in rete» e «Marche consigliate». La critica /impeccable (due valutazioni indipendenti, 22/40; rilevatore 0 problemi; sovrapposizione nel browser bloccata dalla CSP) ha portato, con le scelte dell'utente (prima conteggi e parole, tutti i problemi, pannello intermedio tolto, tono sobrio), a cinque passi: il widget conta come «Da collegare»; «Fatto» a ricerca finita; «Nascosti»/«Mostra di nuovo»; tocco sulla tessera = collega, «Nascondi» nell'angolo; dispositivi non collegabili in una lista sotto la griglia con il motivo; altezza stabile e «Non lo trovi? Scegli la marca»; marche in griglia e un solo «Altra marca»; numeri che seguono le tessere, scheletro più leggibile, dispositivi già visti subito alla riapertura. Prova nel browser con HA simulato a 1280×665 e 390 px: «Nascondi» 44×44, tessere 153 px al telefono, nessuno scorrimento orizzontale, altezza della parte scorrevole costante (422 px) cambiando sezione. Test collegati 97/97, typecheck e lint superati. Suite completa non rilanciata dopo questi passi. Non committato.

**Annotazione 2026-10-28, seconda critica /impeccable (25/40, da 22) e correzioni:** su scelta dell'utente (prima altezza e «Nascondi», «Nascondi» con scritta e «Annulla», prima il tipo poi la marca): altezza fissa della parte che scorre (misurata costante in ogni sezione: 412 px al tablet, 512 px al telefono); «Nascondi» con icona e parola sotto la tessera, la tessera sparisce subito e «Annulla» resta 8 s prima che HA venga avvisato, il focus va su «Annulla»; «Non trovi il tuo dispositivo?» chiede prima il tipo (12 tipi) e poi le marche di quel tipo, verificate sui manifest di HA (`config_flow: true`, esclusi i flussi OAuth); la ricerca dura almeno un giro di 5 s prima che una lettura invariata la chiuda e alla fine dice «Ricerca terminata: N dispositivi da collegare.». Prova nel browser con HA simulato: ricerca chiusa a 32 s con 4 tessere e riga di fine; tipi e marche al telefono senza scorrimento orizzontale. Test collegati 140/140, typecheck e lint senza errori. Suite completa non rilanciata. Non committato.

**Annotazione 2026-10-28 sera, TV LG note solo via Cast (prova in ufficio):** il widget TV dell'utente era legato all'entità Cast `media_player.lg_webos_tv_ua751c0la` (HA aggiunge Cast da solo): «Accendi» apriva l'app Cast di HA sulla TV, «Spegni» la chiudeva, nessun telecomando, stato «Spento». In ufficio ci sono due LG (UA751C0LA su 192.168.1.26, NANO81T6A su 192.168.1.18); la LG dell'utente non era proposta perché già «configurata» via Cast, e la marca LG collegava la prima LG vista: tre abbinamenti in timeout. Con il via libera dell'utente («Procedi con A, B, C e D per le TV LG.»): (A) una TV nota solo via Cast torna in «Televisori in rete»; (B) in «Collegati» «Collega come TV {Marca}» e niente widget automatico su Cast per TV di marca; (C) il widget su Cast non accende più via Cast, mostra «Collega la TV LG…» e usa da solo l'entità LG quando c'è (risolta a ogni render, impostazioni non riscritte); (D) con più TV della stessa marca chiede quale, e i passi di abbinamento dicono su quale TV guardare; tolti i due quadrati grigi del passo «Accetta sul televisore». Backend 620+1, test collegati del frontend superati, nessuno sbalzo di fine riga. Non provato con la TV vera; non committato. **Punto di ripresa (2026-10-29):** collegare la UA751C0LA da «Trova dispositivi» con le TV accese, verificare la domanda tra le due LG e il widget che passa all'entità LG.
