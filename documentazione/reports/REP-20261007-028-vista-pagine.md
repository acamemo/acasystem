# REP-20261007-028 — Vista delle pagine

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato; da provare sul tablet |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07: «se viene tenuta premuta tutta la pagina apparre un area intorno alla griglia, lo slider di "Principale" scende verso il basso e la Topbar sale, la griglia diventa drag and drop, e puoi decidere di eliminare la griglia con un pulsante di eliminazione (una semplice icona cestino) e di aggiungerne una (iconcina col +) creandoti una griglia vuota; le iconcine sono situate in basso e prendono lo spazio lasciato dallo slider di "Principale". Che ne pensi della mia idea e come migliorarlo?» |
| Scelte dell'utente | Domande in chat, stesso giorno: la vista si apre con una pressione lunga **sul vuoto**, mentre sopra un widget apre la modifica dei widget come prima; il cestino **chiede conferma solo se la pagina ha widget**; «+» **crea e resta** nella vista, e le pagine vuote non spariscono più; in basso cestino, +, **matita (nome e icona)** e **Fine**. Piano approvato in chat. |
| Perimetro | Gestione delle pagine già esistente (aggiunta, eliminazione, riordino, ADR-0007), resa diretta; nessun nuovo permesso né nuova dipendenza. |

## Modifiche

- **Attivazione** (`LauncherScreen.tsx`):
  - pressione lunga su un widget: modifica dei widget, come prima;
  - pressione lunga su una cella libera, sullo sfondo o sulla copertina: vista delle pagine, anche quando si è già in modifica;
  - Esc chiude prima la vista, poi la modifica.
- **Vista** (`Pager.tsx`, `launcher.css`):
  - ogni pagina diventa una scheda larga il 72 % e centrata, con le vicine visibili ai lati e l'anello d'accento su quella al centro;
  - la griglia vera si rimpicciolisce con la scheda; si vede ma non si tocca, e la «×» e le maniglie spariscono;
  - un tocco sulla scheda apre quella pagina, sempre in modifica;
  - sotto ogni scheda c'è il suo nome con il pomello «⠿», che serve a trascinarla;
  - durante il passaggio la pagina al centro resta centrata, fotogramma per fotogramma.
- **Barra in alto e indicatore:** la barra in alto sale (la sua animazione esisteva già) e l'indicatore «Principale» scende, con la nuova prop `hidden` di `PageIndicator`.
- **Barra della vista** (`PageOverviewBar.tsx`): sale al posto dell'indicatore con:
  - **cestino**: disattivato con il motivo nel tooltip su «Principale», sull'ultima pagina e sulla copertina; elimina subito una pagina vuota e chiede conferma, con il numero dei widget, per una pagina che ne contiene;
  - **+**: nuova pagina vuota subito dopo quella al centro e le sue continuazioni;
  - **matita**: nome, icona e «nascondi» della pagina, nel pannello esistente;
  - **Fine**: chiude la vista e la modifica.
- **Riordino:**
  - trascinando il nome di una scheda, le altre si spostano di un passo e al bordo la vista scorre di una scheda (`usePageDrag.ts`);
  - la copertina resta prima;
  - una pagina e le sue continuazioni si spostano insieme (`movePageOrder` in `layout.ts`);
  - alternativa senza trascinamento: Alt + frecce sul nome, oltre a «Sposta prima/dopo» nel pannello della pagina.
- **Pagine vuote** (`pager.ts`): una pagina vuota creata dall'utente resta anche fuori dalla modifica. Le continuazioni vuote, create per altre classi di dispositivo, restano filtrate.
- **Correzioni trovate nella prova a video:**
  - `.aca-shell` passa da `overflow: hidden` a `overflow: clip`: le barre nascoste, spostate sotto lo schermo, rendevano scorrevole il guscio, e la creazione di una pagina lo faceva salire di 80 px;
  - nuova icona `trash` dal set mx-icons (`TrashLinear`);
  - `addPage` del controller accetta `afterPageId`.

## Verifiche

- **Controlli eseguiti:** typecheck, eslint, prettier, lint dei colori e lint tipografico (0 violazioni), build e controllo delle dimensioni dei chunk: tutti verdi.
- **Test:** vitest 1372/1372, +12 test.
  - Vista delle pagine in `LauncherScreen.test.tsx`: pressione lunga sul vuoto e sul widget; «+»; cestino su una pagina vuota e con conferma; cestino disattivato su «Principale»; Alt + frecce; tocco sulla scheda; Esc e Fine; matita.
  - `movePageOrder`, filtro delle continuazioni vuote e `usePageDrag` in `LauncherDragDrop.test.tsx`.
- **Test aggiornati alla nuova scelta** (le pagine vuote restano):
  - `PolishLauncherLayout`, due casi;
  - `Polish2LauncherController`: «Fine» su una pagina vuota ora la tiene.
- **Prova a video** su `launcher.html` (anteprima di sviluppo):
  - pressione lunga su una cella libera: schede, copertina a sinistra, barra in alto su, indicatore giù, barra della vista;
  - «+» crea e centra «Nuova pagina»;
  - trascinando il suo nome a sinistra si ottiene l'ordine Copertina, Nuova pagina, Principale;
  - il cestino la elimina e la vista torna su «Principale»;
  - un tocco sulla scheda chiude la vista restando in modifica.
- **Banco:** `sha256:f11b9e051ee72c453a98847270fc3862caec218bb91902db5ab983f78bd66552`, `healthy`; `/api/health` ok su `172.20.10.6:3002`.

## Limiti e questioni residue

- **Tablet e sessione:** non provato sul tablet né con una sessione di Home Assistant. Restano da misurare la pressione lunga col dito, lo scorrimento tra le schede e il trascinamento del nome.
- **Eliminazione:** una pagina eliminata non si recupera; i suoi widget vengono tolti. È lo stesso comportamento del pannello della pagina.
- **Prove a video:** fatte con eventi del puntatore simulati e con il mouse.
- **Bug del pulsante:** quello citato in REP-20261007-027 è ancora da fare.

## Ripresa

Prova sul tablet a `http://172.20.10.6:3002`: pressione lunga su una cella vuota.
