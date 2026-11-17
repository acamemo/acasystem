# Anteprima completa ACA con vetro bianco

| Campo | Valore |
|---|---|
| ID / stato | REP-20261104-012 — Completato come anteprima locale |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta | «guarda come lo hai fatto tu non mi dispiace, vorrei vedere l'intera interfaccia aca con il glassmorphism applicato» |
| Autorizzazione | Estendere la prova grafica REP011 alle schermate reali di ACA, navigabili su dati simulati. |

Precisazione durante il lavoro: l'utente propone anche un ingresso `start-fade` con salita20px, scala.95 e dissolvenza, da applicare al caricamento e in versione simile a popup/tendine. Autorizzazione corrente estesa al movimento del solo tema di prova; nessuna nuova libreria.

## Obiettivo e perimetro

Mantenere il materiale della [prova REP011](REP-20261104-011-prova-vetro-bianco-paesaggio.md), rendendo immediatamente esplorabili Home, categorie/widget, Sistema, account e popup nell'interfaccia reale. Primitive e controlli condivisi, paesaggio locale, vetro bianco e colori funzionali. Il CSS HTML dell'utente chiarisce il materiale; l'utente conserva la direzione visiva della prova precedente.

Solo anteprima isolata e copertura grafica del tema opt-in `glass-white`; non modifica il default installato, account/profili del banco, autenticazione, permessi, gesti, dipendenze o distribuzioni. [ADR-0042](../decisions/ADR-0042-tema-liquid-glass.md), [design](../design/design.md) e vincoli Casa3D/ingranaggio conservati. La richiesta non risolve implicitamente ISSUE-145 né autorizza una pubblicazione.

Stato Git iniziale salvato in `backup/rep039/git-status-before.txt`; numerose modifiche preesistenti preservate. Nessun reset, commit o modifica degli originali.

## Criteri di completamento

- Collegamento diretto alla Home ACA con widget simulati, senza registrazione o impostazioni necessarie alla sola valutazione grafica.
- Navigazione delle schermate reali e copertura dei principali materiali, finestre e controlli; limiti espliciti delle viste non disponibili nella simulazione.
- Verifica desktop/telefono, leggibilità, overflow, focus, fallback e assenza di filtri annidati nelle viste campione.
- Nessun collegamento mutativo alla centrale reale; report, stato e istruzioni dell'anteprima aggiornati.

## Avanzamento e modifiche

Riutilizzata la modalità mockup reale dell'app: launcher, widget, Sistema, account e finestre sono gli stessi componenti dell'applicativo. Il server locale `backup/rep039/serve-white-app.mjs` apre direttamente la Home; il piccolo menu «Anteprima · dati simulati» è collassato in basso a destra e consente anche accesso diretto a Sistema/account, primitive, QR e i comandi reali del pager. Si può nascondere. Le scelte e modifiche della visita dimostrativa sono in memoria e si azzerano ricaricando.

Lo skin `glass-white/white.css` completa paesaggio e materiali delle viste sovrapposte, miniature pagine e barre di modifica. Coperture piene delle schermate impediscono di leggere la Home sottostante; i popup conservano un singolo filtro più uniforme per evitare sovrapposizioni testuali. Nessun filtro nei controlli annidati, Casa3D o ingranaggio; fallback opachi mantenuti.

La facade demo era precedente alle API account/Tavano: aggiunto `utils/mockup/accountActivity.ts`, richiamato esclusivamente da `backendFacade.ts` della simulazione. Metadati/immagini account con revisioni in memoria, righe Tavano contrassegnate «Demo · dati simulati»/`DEMO_SYNTHETIC`, filtri ed esportazioni coerenti. Nessuna cronologia reale importata o inviata. Il manifest foto avatar è disabilitato dalla modalità demo preesistente: crop/copertina sono esplorabili, ma la foto del cerchio non viene resa dalla simulazione. Nessuna modifica ai gate o alle API reali per aggirare questo limite.

Movimento in `glass-white/motion.css`, importato solo dall'ingresso del tema sperimentale: entrata unica dell'app con salita16px/scala.97, senza un'animazione separata per ogni widget o riavvio a ogni pagina. Popup e tendine usano le transizioni della presenza nativa, con origine della tendina calcolata rispetto al trigger effettivo dopo il posizionamento/flip. La primitiva condivisa `Popover.tsx` espone `--aca-popover-origin` (il default non la usa) e ricalcola lo stesso posizionamento al `toggle` effettivamente aperto. La verifica ha infatti trovato misure nulle in `beforetoggle`, con origine0/0 e possibile uscita dal viewport: regressione prima rossa, poi verde con il ricalcolo, senza cambiare regole di posizionamento o flip. Blur/ombre/sfondo non sono animati. Movimento ridotto: dissolvenza breve senza spostamento o scala. Le Console a schermo intero conservano il loro movimento esistente.

## Verifiche ed evidenze

| Controllo | Esito | Evidenza / limiti |
|---|---|---|
| Navigazione e resa completa | Superato nel campione | 17 viste normali1440/390: Home, luce, Sistema, account/personalizzazione, Utilità, Tavano/filtri ed editor pagine; poi6ricatture affette dalle ultime correzioni del vetro.0overflow, filtri annidati, erroriJS/HTTP, richieste esterne o POST di rete. Non ogni popup/tipo di widget è stato collaudato singolarmente. |
| Fallback opaco | Superato | Home390 senza fotografia o filtri renderizzati,0overflow. Il primo harness contava proprietà sui pseudo-elementi `display:none`: errore della metrica, non filtri attivi. Evidenza originaria preservata; correzione metrica e ricattura PASS. |
| Movimento | Superato nel campione | Due contesti Chromium normale/ridotto: ingresso app1volta, nessun riavvio passando a Sistema e transform:none al termine; Sheet luce280/200ms,120ms in ridotto; Popover200/160ms, origine su trigger e flip sopra, Escape/riapertura rapida verificati. Niente animazioni di blur. Il focus è osservato nel harness Scenario riattivato appositamente: normale torna a Sistema, ridotto al trigger; nessun PASS universale di focus derivato da questa prova. |
| Regressioni mirate | Superato | MockupPreviewAccount+MockupHa64/64; KitOverlays+FixKitReview20/20, inclusa nuova regressione nativepopover con dimensioni inizialmente nulle. |
| Build e risorse | Superato | Build frontend con typecheck strict PASS; copia condivisa6/6PASS. Segnalazione chunkHLS oltre500kB distinta dal tema, senza nuova dipendenza. |
| Banco preservato | Superato | ACA/HA/D1 stessi ID, immagini e StartedAt di REP009, `bank-unchanged.json`; nessun login, account, profilo o volume reale modificato. |

Controlli già eseguiti: suite mockup account/Tavano+HA64/64PASS; build frontend con typecheck strict PASS, segnalazione nota chunkHLS oltre500kB; risorse condivise6/6PASS. La prima verifica del menu ha trovato un selettore non corrispondente al nome accessibile delle frecce: corretto nel solo server di anteprima prima della QA finale. La barra REP011 copriva l'account e l'indicatore pagine: sostituita dal menu collassato, senza modificare l'intestazione del prodotto.

Evidenze e comandi in `backup/rep039/`: `mockup-account-tests.json`, `final-app-qa-handoff.md`, `glass-coverage-motion-handoff.md`, `final-app-qa.json` (con fallimento della prima metrica preservato), `final-app-fallback-qa.json`, `final-app-affected-qa.json`, `white-motion-results.json` e relativi script/screenshot. Dopo l'ultima build, `final-step-smoke.json` verifica2/2volte il filtro Persona reale di Tavano1440/390: dentro il viewport, origine calcolata e selezione funzionante,0overflow/errori/esterne/POST. `final-home-hero-1440.png` è la cattura finale aggiornata. L'esplorazione iniziale copre anche8categorie e11sezioni Sistema. Le dimensioni CSS non misurano GPU/FPS: M11, Safari/iPhone/Android fisici non collaudati. La suite generale legata al debito ISSUE-134 non viene dichiarata verde da questi controlli mirati; ISSUE-145 (inclusi swatch account) resta aperta. Nessuna certificazione di contrasto universale su immagini arbitrarie dedotta dalle catture.

## Chiusura e punto di ripresa

L'anteprima richiesta è completata e lasciata attiva su [ACA completa](http://127.0.0.1:4185/?screen=app#/mockup). Il menu in basso a destra permette di cambiare pagina; Tavano è nella categoria Utilità. Collegamenti diretti a [Sistema](http://127.0.0.1:4185/?screen=system#/sistema) e [Account](http://127.0.0.1:4185/?screen=account#/sistema). Ricaricare la scheda per vedere la nuova versione e ripartire dai dati simulati.

Il diff pertinente comprende il solo tema di prova, il piccolo supporto di misura/origine del popover condiviso con regressione mirata e la facade solo demo necessaria a mostrare account/Tavano. Le modifiche preesistenti sono conservate. Nessun incarico software resta attivo per questa prova: ricevere il riscontro grafico prima di un'eventuale promozione o di un aggiornamento del banco, che non sono inclusi. Account/profili reali restano sul banco0.9.42 precedente. Nessuna pubblicazione, installazione, nuova dipendenza o commit.
