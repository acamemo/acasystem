# REP-20261009-005 — Barra dell'editor: nome senza matita e rinomina animata

| Campo | Valore |
|---|---|
| Stato | Completato; banco su `aca-system:0.8` |
| Data | 2026-10-09, Europe/Rome (esecuzione e chiusura documentale del 2026-10-10) |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) per la progettazione; implementazione, revisioni e prova visiva con subagenti (modelli non registrati); chiusura dei documenti con Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`) |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` più il working tree non committato (fino a REP-20261009-004). Base di misura del diff del blocco N, oggetto non referenziato creato con `git stash create` e usato solo per confrontare: `b491e958cf07…`. |
| Richiesta di riferimento | Chat del 2026-10-09, dopo la prova della 0.7 sul tablet. |
| Autorizzazione | La richiesta qui sotto. |

## Richiesta

> «provo la 0.7 sul tablet, mi piace, solo che il nome della pagina non lo evidenzierei in alto a sinistra. La tab con le colonne e lo spostamento a destra e sinistra coi pulsanti è bellissimo e intuitivo, andrei a rimuovere l'icona della modifica e lascerei solo testo, magari con 2 separatori lineette ai lati per distinguerlo, poi farei che nel momento in cui tu scrivi il testo dentro non ti uscisse dalla preview e che diciamo con un animazione tutte le icone si dissolvono e la barra diventa solo un campo di testo, una volta scritto e confermato il nome con la tastiera android con un animazione inversa diventa normale ma la barra si adatta con un animazione sia al campo di testo che a quando ritornano le icone, non so se hai capito che tipo di interazione voglio»

**Interpretazione riportata all'utente:**
- l'etichetta in alto a sinistra è il segno «Principale» della scheda nella vista pagine, doppione della casetta accesa;
- «lineette» sono due separatori verticali sottili ai lati del nome.

L'utente ha confermato l'interazione.

## Obiettivo e perimetro

- **N1. Etichette della scheda.** Nella vista delle pagine si tolgono tutte le etichette in alto a sinistra della scheda: «Principale» e anche «Nascosta». Lo chiede l'utente: «sì è proprio quella l'interazione, togli anche Nascosta».
  - La pagina principale si riconosce dalla casetta accesa nella barra; la pagina nascosta dall'occhio barrato, quando è al centro.
  - Il nome accessibile della scheda continua a dire «principale» e «nascosta» per il lettore di schermo.
- **N2. Nome a riposo.** Nella barra dell'editor il nome della pagina è solo testo, senza icona della matita, tra due separatori verticali sottili, e resta toccabile. Il nome accessibile e la nuvoletta restano.
- **N3. Rinomina animata.** Toccando il nome:
  - tutte le icone della barra e «Fine» svaniscono in dissolvenza;
  - la barra cambia larghezza con un'animazione e diventa un solo campo di testo con il nome selezionato;
  - il testo non esce mai dalla barra: un nome lungo scorre dentro il campo, entro una larghezza massima che non supera lo schermo.
  - **Conferma** con Invio o «Fatto» della tastiera Android, oppure uscendo dal campo con un nome valido: animazione inversa, il campo torna testo, la barra si adatta e le icone ricompaiono.
  - **Esc:** annulla con la stessa animazione inversa.
  - **Nome vuoto:** rifiutato come oggi, senza chiudere il campo.
  - Una sola durata e una curva coerenti con il kit, animando solo trasformazioni e opacità dove possibile. La larghezza della barra si anima senza ricalcolare la vista delle pagine.
  - Con il movimento ridotto il passaggio è immediato.
- **Esclusi:** funzioni nuove oltre queste, dipendenze, backend.

## Criteri di completamento

- N1-N3 osservabili e coperti da test, compresi il fuoco, Esc, il nome vuoto e la conferma con Invio.
- Prova Playwright a 1024×472 e 390×844 con screenshot a metà animazione, all'andata e al ritorno, e un nome lungo che non esce dalla barra.
- Controlli verdi: typecheck, lint, tipografia e colori a 0, suite completa, build.
- Banco aggiornato con la 0.8 insieme a REP-20261009-003/004.

## Avanzamento e modifiche

Un blocco (N) con due giri di revisione avversaria, riproduzioni in Chromium e correzioni; poi la verifica d'insieme e una prova visiva insieme a REP-20261009-006. Nessun commit Git, nessuna modifica al backend, nessuna dipendenza nuova.

### N1 — Etichette della scheda

- Tolti dal markup di `Pager.tsx` e dal CSS di `launcher.css` i contenitori `.aca-pager__badges` e `.aca-pager__badge` («Principale» e «Nascosta»), anche negli selettori del footer, dove due regole `.aca-pager__footer` sono state unite.
- Il nome accessibile del pulsante di apertura della scheda («Apri Casa, principale», «Apri Casa 2, nascosta») è invariato. Il corpo delle pagine nascoste resta al 55 %.
- Commenti di `launcher.css` e `Pager.tsx` che parlavano ancora di «marks» e della pillola «Principale» aggiornati.

### N2 — Nome a riposo

- Matita e `.aca-page-overview__pencil` rimossi. Il nome è solo testo, con due separatori verticali sottili come `::before` e `::after` del pulsante del nome: 1 px × 1,25 rem, `var(--aca-ink-muted)` con opacità 0,35, come il divisore della barra del widget. Resta alto 44 px e con il nome accessibile «Rinomina X»; sul telefono il testo va in ellissi tra i separatori.
- Scelta: i separatori stanno sul nome modificabile, non sull'etichetta fissa della Copertina («Copertina» resta testo semplice). Servono a segnalare che il nome è toccabile; estenderli alla Copertina richiederebbe un cambio di markup. Da confermare con l'utente.

### N3 — Rinomina animata

- **Struttura.** Il gruppo della barra contiene `.aca-page-overview__tools` (cestino, «+», casetta, nome, occhio, «Fine») e un campo assoluto (`form.aca-page-overview__field`) reso con `createPortal` direttamente nel gruppo. Aprendo il campo i `tools` svaniscono (opacità e scala 0,92) e diventano `aria-hidden` e `inert`; il campo ha il testo selezionato e il fuoco. I `tools` restano nel flusso con opacità 0, così la barra non si sposta e la misura della fascia (`useFooterBand`) non cambia.
- **Larghezza.** Animata con il Web Animations API (`host.animate` su `width`, dalla larghezza misurata prima a quella misurata dopo) invece che con una transizione CSS: nessun conflitto con la transizione `transform`/`opacity` della barra che sale e scende, nessun `transitionend`, larghezza finale sempre quella del CSS. Durata e curva da `--aca-rename-ms` (240 ms) e `--aca-rename-ease` (`var(--aca-ease-out, …)`), dichiarate solo sulla barra delle pagine (non su quella del widget), con fallback letterali nel codice come in `Pager`. In modifica la larghezza è `min(100cqw, 28rem)`, quindi non supera la fascia. Senza layout (jsdom), senza `animate` o con il movimento ridotto il passaggio è immediato.
- **Fasi.** `rest`, `editing`, `closing` nello stato della barra. In `closing` il campo resta montato (sola lettura, opacità 0 in dissolvenza) e il fuoco resta lì finché la barra si assesta (`onfinish`); poi `rest`: il campo sparisce, le icone tornano. Le icone ricompaiono nella seconda metà della scia (`transition-delay` di metà durata), non dopo, così la chiusura dura una sola durata.
- **Conferma e uscita.** Invio da `keydown`, e dal `submit` del form per il tasto «Fatto» della tastiera Android (`keydown` «Unidentified»), entrambi su una sola funzione `confirm`. Esc annulla, l'uscita dal campo con nome valido salva, il nome vuoto è rifiutato come prima con l'avviso. Tab e Maiusc+Tab sono un'uscita da tastiera come Invio (salvano, o con nome vuoto tengono il vecchio, e riportano il fuoco sul nome). Il fuoco torna sul nome a fine animazione solo se nessun altro controllo l'ha preso nel frattempo.
- **Campo.** Centrato in verticale nella pillola (`inset: 0 var(--aca-space-1)`, `align-content: center`).
- **Rimossi** `keepField`, `leaveField`, il tipo `MouseEvent`, l'icona della matita e `hidden={renaming}` sulle `IconAction`.
- File: `PageOverviewBar.tsx`, `edit.css`, `Pager.tsx`, `launcher.css`; test `LauncherScreen` (nessuna etichetta sulla scheda, pulsanti nascosti durante la modifica, regola CSS dei `tools`), `LauncherGestures` (selettore del footer) e il nuovo `PageOverviewBarRename.test.tsx` (17 test).

### Revisione

- **Giro 1.** Trovati e corretti: con la barra a riposo larga quanto il campo (telefono, «Soggiorno» o nome di 40 caratteri) la chiusura non animava e il campo spariva in un fotogramma (tolta la condizione `from !== to`, test che fallisce con la condizione rimessa); chiusura più lunga del 50 % rispetto all'apertura (ritardo di metà durata sulle icone); commenti superati dopo N1. Respinto, come scelta di progetto: i separatori sulla Copertina (vedi N2).
- **Giro 2.** Trovati e corretti: Tab e Maiusc+Tab facevano perdere il fuoco (al `body`, o al pulsante «Apri …» dell'ultima scheda con spostamento della vista pagine); il fuoco veniva ripreso al nome anche se spostato altrove durante la chiusura; campo non centrato (4 px sopra, 1,6 px sotto); il test «la barra del widget è come prima» non poteva fallire (ora controlla che nessun elemento della barra del widget usi le classi della rinomina e che `--aca-rename-ms` stia solo nella regola della barra delle pagine); commento di `measureCards` superato.

## Scelte esecutive

- Animazione della larghezza con il Web Animations API, con durata e curva come variabili sulla sola barra delle pagine.
- Icone nel flusso con opacità 0 durante la rinomina, invece di toglierle dal flusso (la barra non si sposta e la misura della fascia resta la stessa); sono inerti e nascoste agli assistivi.
- Chiusura con campo in sola lettura in dissolvenza fino all'assestamento, per evitare un fotogramma con barra vuota o con il campo che sparisce di colpo.
- Tab e Maiusc+Tab come uscita da tastiera che salva.
- Separatori solo sul nome modificabile.

## Verifiche ed evidenze

Comandi in `progetto/acasystem/frontend`. Prove nel browser in Chromium headless senza GPU (`--disable-gpu`, SwiftShader), un browser alla volta, su server Vite propri, fermati alla fine; script una tantum nella scratchpad, non una suite e2e. Suite sempre con `--maxWorkers=4`.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici | Superato | `npm run typecheck` 0 errori; `npm run lint` 0; `lint:typography` 0 violazioni (428 file); `lint:theme-colors` 0 (303 file). `format:check` fallisce solo su `eslint.config.js` e `public/sw.js`, preesistenti. `i18n:check` 4/4. |
| Test della rinomina | Superato | `PageOverviewBarRename.test.tsx`: 17 test (nessuna matita, separatori nel CSS, apertura con `tools` `aria-hidden` e `inert`, Invio, `submit` del form, nome vuoto, uscita valida e vuota, Esc, Tab e Maiusc+Tab, scia simulata con `animate`, chiusura con campo largo quanto la barra, fuoco spostato durante la chiusura, movimento ridotto, barra del widget invariata). Provato con mutazione: il test della larghezza uguale fallisce rimettendo la condizione `from !== to`. |
| Suite frontend completa | Superato | Ultima esecuzione completa dopo tutti gli interventi (anche di REP-20261009-006 e del blocco C): 141 file, 1676 test passati, 0 falliti. Una esecuzione precedente: 141 file, 1674 test in 409 s. |
| Build e budget | Superato | `npm run build` riuscita (solo l'avviso preesistente sui chunk oltre 500 kB), ripetuta dopo le ultime correzioni; `check-bundle-size.mjs` nei limiti, index 726,6/900 KB (misurato prima delle ultime correzioni di REP-20261009-006). |
| Etichette assenti, nome accessibile | Superato | Nessun `.aca-pager__badge(s)` nel DOM né nei sorgenti (solo un'asserzione negativa nel test); `aria-label` «Apri Casa, principale» e, dopo aver nascosto Casa 2, «Apri Casa 2, nascosta». |
| Nome a riposo | Superato | Tablet 1024×472 e telefono 390×844, chiaro e scuro: nessuna matita né `svg` nel pulsante; separatori da 1 × 20 px, colore `oklch(0.5 0.056 260)` con opacità 0,35; nome 72 × 44 px (tablet) e 64 × 44 px (telefono). |
| Andata | Superato | Tablet: larghezza 365 → 448 px in circa 250 ms; icone a opacità 0 entro 113 ms; il campo compare dopo circa 160 ms e arriva a 1 entro circa 310 ms. Telefono: 341 → 358. Campo con il fuoco e il testo selezionato. |
| Ritorno | Superato | Nome di 43 caratteri: 448 → 516 px in circa 280 ms, campo in dissolvenza entro circa 140 ms, icone da circa 240 ms quando la larghezza è 514/516; fuoco sul nome, vista pagine ancora aperta. Esc: 448 → 365 (tablet) e 358 → 341 (telefono). Con il nome già largo quanto la fascia (telefono) la larghezza non cambia: la chiusura anima il fade, senza cambio di larghezza. |
| Nome lungo | Superato | Campo dentro la barra e la barra dentro la fascia (tablet 253,8–770,2; telefono 16–374 con ellissi a riposo); il testo scorre dentro il campo (`scrollWidth` 344 contro `clientWidth` 310). |
| Invio, `submit`, uscita, Esc, nome vuoto, fuoco | Superato | Invio e `form.requestSubmit()` salvano e chiudono con fuoco sul nome; uscita valida salva; Esc annulla; nome vuoto lascia il campo aperto con l'avviso, uscita dal campo vuoto tiene il vecchio nome. Tab e Maiusc+Tab coperti da test Vitest. |
| Movimento ridotto | Superato | `emulateMedia({ reducedMotion: 'reduce' })`: durata di transizione 0 s, nessuna animazione sulla barra, larghezze campionate solo prima e dopo; chiusura immediata. |
| Console | Superato | 0 errori di console o di pagina nelle sessioni di rinomina. |
| Campo centrato in verticale, Tab nel browser | Parziale | Coperti dal CSS, dalla misura riportata nella revisione (44 px contro 46,4 px) e da test Vitest; non isolati in una prova nel browser dopo le correzioni del giro 2. |
| Tasto «Fatto» della tastiera Android, tastiera virtuale, Lenovo Tab M11, TalkBack | Non eseguito | «Fatto» è coperto dal solo `submit` del form in jsdom. Da fare con l'immagine del banco aggiornata. |

## Limiti e punti aperti

- **Pillola vuota.** Per circa 100–150 ms tra la scomparsa delle icone e la comparsa del campo (e al ritorno) la pillola è vuota: è la sequenza di dissolvenza scelta (campo nella seconda metà della scia). Da confermare sul tablet.
- **Avviso del nome vuoto su tablet.** L'avviso sta a contatto con la riga dei comandi della scheda (pillola a y 353–388). Spostarlo richiede una scelta di layout non presa.
- **Separatori sulla Copertina.** Non ci sono: da confermare (vedi N2).
- **Tocco sulle icone nascoste.** Con il campo aperto le icone sono inerti e invisibili; un tocco nella loro area cade sul campo.
- **Tastiera virtuale.** Il fuoco è dato in un effetto dopo il tocco (stesso meccanismo di prima): su Android la tastiera si apre da quel fuoco, non provato.
- **Ricalcoli di layout.** La barra anima la sola larghezza del gruppo e la fascia non cambia altezza; il numero di ricalcoli di layout durante la scia non è stato misurato.

## Chiusura e punto di ripresa

Codice e documenti completati; nessun commit Git, su richiesta dell'utente. Aggiornati `design.md`, `verification.md`, `project-status.md`, il registro dei report e ADR-0012 (nota datata).

**Banco (2026-10-10, agente principale):** `aca-system:0.8` dal 2026-10-10 alle 10:38 (`sha256:a552c711…fdd72`), `healthy`; per i tablet `http://192.168.1.11:3002`. Copia a freddo del volume prima dell'aggiornamento: `backup/banco/tunet-data-20261010-pre-0.8-freddo.tgz` (104 306 byte, SHA-256 `0a32ad2b…79e2`). `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.11`; bundle `index-BLpMNnba.js`. Ripristino: `image: aca-system:0.7`. Prova sul Lenovo a cura dell'utente.

**Prossimo passo:** prova dell'utente sul Lenovo Tab M11 con la nuova immagine: rinomina con la tastiera Android (andata, «Fatto», Esc, ritorno), nome lungo, separatori e assenza delle etichette sulle schede; risposte ai punti da confermare di questo report.
