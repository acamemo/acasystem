# REP-20261009-002 — Editor delle pagine: «Nuova» diretta, nome nella barra, icone con nuvoletta

| Campo | Valore |
|---|---|
| Stato | Completato; banco su `aca-system:0.7` |
| Data | 2026-10-09, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`), con subagenti di implementazione, revisione, verifica e prova visiva |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6`, più il working tree non committato di REP-20261007-008…038, REP-20261008-001 e REP-20261009-001. Banco su `aca-system:0.6`. Istantanea del working tree all'avvio con `git stash create`: `38155b49889ea2bc57a87ea60b596ebecb17f314`, oggetto non referenziato usato solo per misurare il diff; lo stato di partenza (`git status --porcelain`, 255 righe) è salvato nella scratchpad della sessione. |
| Richiesta di riferimento | Chat del 2026-10-09, dopo la prova dell'utente sul banco. |
| Autorizzazione | Le richieste e le risposte qui sotto. |

## Richiesta

Testo dell'utente:

> «se tengo premuto, e clicco sul pulsante + Nuova, dovrebbe permettermi di creare una nuova pagina e basta, per i widget ho la griglia con i +. La bottom bar che esce ha un pulsante chiamato principale con un icona, io vorrei che se si clicca sul testo posso cambiare il nome della pagina. Andrei a rimuovere la funzionalità di modifica da dove si modificano le colonne, la sposterei dove ti ho detto, andrei a modificare poi il design per le frecce per spostare e la modifica colonne rimuovendo i testi e lasciando solo icone semplici senza sfondo ecc»

Risposte alle domande:
- **Casetta e nome:** «la casetta per rendere la pagina in questione la copertina, poi il nome della pagina».
  - L'agente lo intende come pagina principale, cioè quella da cui parte il tablet: la Copertina è una pagina speciale. L'interpretazione è segnalata all'utente.
- **Icone e nuvoletta:** «secondo te può essere una buona idea rimuovere i testi e lasciare solo le icone? Per me sì, poi metterei che se si tiene premuto sull'icona ti dice cosa fa quella funzione con un'apposita nuvoletta di cui ti posso passare il design».
- **Pagine pronte:** «le pagine pronte le daremo predefinite più in là, non è un obiettivo di adesso perché dobbiamo poi lavorare sui singoli kit».

## Obiettivo e perimetro

- **D1. «Nuova».** Crea subito una pagina vuota di widget, senza menu. Le pagine pronte non si creano più dall'editor; quelle esistenti restano.
- **D2. Barra dell'editor:** cestino, «+», gruppo casetta + nome della pagina, occhio, «Fine».
  - La casetta rende la pagina principale.
  - Toccando il nome lo si modifica in linea, con la stessa logica di oggi: Invio salva, Esc annulla, il nome vuoto viene rifiutato.
- **D3. Sotto la scheda** restano solo le frecce per spostare la pagina e il selettore delle colonne. Sono icone semplici senza sfondo e senza scritte, con il numero delle colonne visibile. La rinomina sotto la scheda viene tolta.
- **D4. Icone senza testo** nella barra dell'editor, tranne «Fine». Per ogni icona resta il nome accessibile.
- **D5. Nuvoletta** (tooltip): pressione lunga su un'icona dell'editor (circa 500 ms, come Android) senza attivarla, più passaggio del mouse e fuoco da tastiera. Lo stile è provvisorio fino al design dell'utente.
- **Esclusi:**
  - le pagine pronte predefinite, che verranno con i kit;
  - i rilievi del test UX non richiesti, tra cui l'Annulla dopo il riordino (G02), proposto all'utente;
  - backend, dipendenze, commit.

## Criteri di completamento

- D1-D5 osservabili e coperti da test.
- Nessuna funzione persa per la tastiera e il lettore di schermo: nomi accessibili, Alt+frecce, rinomina da tastiera.
- Controlli verdi: typecheck, lint, tipografia e colori a 0, suite completa, build.
- Prova visiva a 1024×472 e 390×844.
- Banco aggiornato.

## Avanzamento e modifiche

Codice, due giri di revisione, verifica finale, prova visiva e documenti completati. Il banco è su `aca-system:0.7` dal 2026-10-09 alle 12:12 (riga «Banco» delle verifiche).

### Comportamenti

- **D1, «Nuova».** Il «+» della barra crea subito una pagina di widget vuota, «Nuova pagina», dopo quella al centro, e annuncia «Nuova pagina vuota aggiunta. Tocca il nome in basso per cambiarlo.».
  - Tolti il menu delle pagine pronte, il suo CSS (`.aca-new-page`) e `utils/launcher/pageKinds.ts`, che `git grep` non trova usato altrove.
  - Le pagine pronte già presenti restano e funzionano: passa il test del telefono con la pagina «Luci».
- **D2, casetta e nome nella barra.** Ordine: cestino · «+» · casetta e nome della pagina al centro, in un solo gruppo · occhio · «Fine».
  - La casetta rende principale la pagina al centro; `aria-pressed` dice se lo è già.
  - Il nome, con una piccola matita e il nome accessibile «Rinomina {pagina}», al tocco diventa un campo con il testo selezionato. La logica è quella di prima: Invio salva; Esc annulla, lascia aperta la vista e riporta il fuoco sul nome; il nome vuoto è rifiutato con avviso e annuncio; uscendo dal campo il nome valido si salva.
  - Durante la rinomina cestino, «+» e occhio si nascondono e il campo occupa la barra (`is-renaming`, larghezza min(100cqw, 28rem)); casetta e «Fine» restano. Con il campo aperto, il primo tocco su casetta o «Fine» salva il nome ed esegue l'azione.
  - Alt+frecce sul nome spostano la pagina e si possono ripetere; il fuoco resta sul nome.
  - Copertina: il nome è un testo non toccabile e la casetta è `aria-disabled` con il motivo «La copertina non può essere la pagina principale.».
  - Aprendo la vista dalla tastiera il fuoco va sul nome nella barra (sulla copertina, sulla sua scheda). L'annuncio di apertura dice «In basso: elimina, nuova pagina, principale, il nome da toccare per cambiarlo, nascondi e Fine.».
- **D3, sotto la scheda.** Una sola riga: freccia «prima» a sinistra, «− ▦N +» al centro, freccia «dopo» a destra.
  - Pulsanti `aca-bar-button` da 44×44 px, trasparenti, senza bordo, ombra né scritte. Resta visibile il numero delle colonne accanto a una piccola icona a griglia; «colonne e N righe» è solo per il lettore di schermo.
  - La rinomina sotto la scheda è tolta. `--aca-card-footer` vale sempre una riga da 44 px, quindi sul tablet la scheda guadagna una riga.
  - Le frecce sono `ArrowLeftLinear`/`ArrowRightLinear` di mx-icons, con i nomi del kit `pageBefore`/`pageAfter` al posto di `arrowLeft`/`arrowRight`, che servivano solo qui (`iconChoices.ts` aggiornato, il conteggio resta 11).
- **D4, icone senza testo.** Cestino, «+», casetta e occhio sono solo icone, con i nomi accessibili invariati; «Fine» resta con il testo. Tolti i `title` nativi.
- **D5, nuvoletta.** Nuovo componente `components/system/edit/IconAction.tsx`, usato dalle icone della barra e dai controlli sotto la scheda.
  - **Dito:** 500 ms di pressione la mostrano e il rilascio non attiva il pulsante (il click entro 600 ms dal rilascio è annullato). Un movimento oltre 10 px è uno scorrimento e annulla la pressione. Durante la pressione il menu contestuale è bloccato.
  - **Mouse:** compare dopo 300 ms di sosta. Uscendo dall'icona si chiude dopo 120 ms, e resta aperta se il puntatore passa sulla nuvoletta (WCAG 1.4.13); un clic sulla nuvoletta non attiva l'icona.
  - **Tastiera:** compare subito con il fuoco (`:focus-visible`, o `data-aca-input="keyboard"` già impostato da LauncherScreen). Esc chiude solo la nuvoletta e la vista resta aperta.
  - **Dopo il rilascio** resta 1,5 s più 50 ms per carattere del motivo, al massimo 5 s. Un tocco, Esc, uno scorrimento o un'altra nuvoletta la chiudono subito.
  - **Azione non disponibile:** mostra anche il motivo; `aria-describedby` punta al motivo, altrimenti alla nuvoletta mentre è visibile.
  - Una sola alla volta, nessuna su una barra inerte. Portale in `body`, `role="tooltip"`, posizione fissa sopra l'icona, sotto se manca spazio.
  - **Testi:** «Elimina la pagina», «Nuova pagina vuota», «Rendi principale» (sulla principale «È la pagina principale»), «Nascondi la pagina» / «Mostra la pagina», «Sposta prima», «Sposta dopo», «Meno colonne», «Più colonne».
  - **Stile provvisorio**, isolato in `.aca-edit-tip` con le variabili `--aca-tip-*` sui token Kit 2 (`--aca-page`, `--aca-socket-shadow`, `--aca-z-tooltip`); dissolvenza di 120 ms con `@starting-style`, nessuna transizione con il movimento ridotto. Il design dell'utente è arrivato durante il lavoro come [UI-010](../design/componenti/originali/UI-010-tooltip.jsx.txt); la sua applicazione è nel perimetro di [REP-20261009-003](REP-20261009-003-vista-pagine-animazione.md) e qui non è applicato.
- **Altri ritocchi dentro D1-D5**, quasi tutti emersi da revisione e prova visiva:
  - sul telefono la barra resta nella fascia (`max-width: 100%`, gruppo restringibile, nome in ellissi, spaziature ridotte sotto 640 px); prima, con nomi come «Nuova pagina» o «Multimedia», cestino e «Fine» uscivano dallo schermo;
  - casetta premuta con `--aca-blue-ink-icon` nel tema chiaro e con l'accento nello scuro;
  - nel tema scuro, anello di fuoco delle icone dell'editor e avviso del nome vuoto più chiari, solo in `edit.css`;
  - input del campo di rinomina alto quanto il pozzetto, 46 px invece di 19 (G34), solo in `edit.css`;
  - `data-no-long-press` sulla riga sotto la scheda, già nell'implementazione: la pressione per la nuvoletta non fa affondare la pagina.
- **Pagina al centro dopo il riordino.** In `placePage`, dopo il riordino, il centro resta sulla pagina che c'era (`goToPageId`). Senza una principale scelta con la casetta, Alt+frecce e le frecce non saltano più su un'altra pagina.

### File

In `progetto/acasystem/frontend/src/`:
- nuovi: `components/system/edit/IconAction.tsx`, `__tests__/EditIconAction.test.tsx`;
- modificati: `components/system/edit/{PageOverviewBar.tsx,PageCardControls.tsx,edit.css}`, `templates/launcher/{LauncherScreen.tsx,Pager.tsx,launcher.css}`, `components/primitives/components/Icon.tsx`, `templates/sheets/parts/iconChoices.ts`, `__tests__/{LauncherScreen,PolishCornice}.test.tsx`;
- eliminato: `utils/launcher/pageKinds.ts`, mai versionato (creato in REP-20261008-001); ne resta una copia solo nella scratchpad della sessione;
- `@types/global.d.ts` è stato toccato al primo giro e riportato identico all'ultimo commit.

**Test:**
- `LauncherScreen.test.tsx`, 77 test: barra solo icone, «Nuova» diretta, rinomina nella barra (Invio, Esc, nome vuoto, uscita), casetta e «Fine» con il campo aperto, numero delle colonne, Alt+frecce sul nome e sulle frecce, principale implicita che resta al centro, pressione di 1100 ms sulle icone che non solleva pagine né esegue l'azione, regole CSS della barra sul telefono, del campo e dell'avviso;
- `EditIconAction.test.tsx`, 9 test sulla nuvoletta: solo icona senza `title`, pressione lunga, scorrimento, mouse con uscita ritardata e nuvoletta raggiungibile, tastiera ed Esc, motivo, permanenza con tetto, una alla volta e barra inerte, movimento ridotto e variabili;
- `PolishCornice.test.tsx` aggiornato alla barra senza testi.

### Revisione

- **Giro 1, 11 rilievi.**
  - Corretti: barra più larga dello schermo sul telefono (alta, due rilievi); Alt+frecce sulla principale implicita, che al secondo passo spostavano la pagina sbagliata (media); commento superato in `Pager.tsx` e doppio tracciamento della modalità d'ingresso in `IconAction` (basse); nuvoletta che spariva al rilascio del dito (bassa).
  - Respinti in quel giro: glifo «foglio con freccia», contrasto della casetta, «+» per le colonne, anello di fuoco scuro, campo alto 19 px. Glifo e casetta sono stati poi corretti al giro 2, il campo nella prova visiva, l'anello in locale al giro 2; il «+» è registrato come proposta.
- **Giro 2, 8 rilievi.**
  - Corretti: con il campo aperto, casetta e «Fine» salvavano il nome ma perdevano l'azione, perché la barra si ridisponeva sotto il dito (alta, due rilievi; regressione dello spostamento del nome nella barra). Corretti anche: test D5 che non poteva fallire (bassa); frecce tornate ad `ArrowLeft`/`ArrowRight` dall'indice di mx-icons, senza import profondi (media); casetta premuta sotto 3:1 (media); anello di fuoco scuro nell'editor (bassa); nuvoletta raggiungibile con il mouse (bassa); permanenza proporzionata al motivo (bassa).
  - Respinta: la parte del test D5 su `data-no-long-press` della scheda. Nella vista pagine la pressione del Pager è spenta e il sollevamento si aggancia solo all'apertura della scheda, quindi l'attributo lì non regge niente (prova di mutazione).

### Prova visiva e correzioni

Playwright Chromium sul server Vite di sviluppo (`launcher.html`, Kit 2, entità finte), a 1024×472 e 390×844, temi chiaro e scuro, con tocco simulato via CDP, mouse e tastiera. D1-D5 osservati. Trovato un difetto, l'avviso del nome vuoto a 1,78:1 nel tema scuro, corretto insieme a G34 in `edit.css`. Esiti nella tabella delle verifiche.

### Documenti

Aggiornati questo report, [reports/README.md](README.md), [project-status.md](../project-status.md) (incarico, ISSUE-033, ISSUE-038, proposte del 2026-10-09), [verification.md](../verification.md), [design.md](../design/design.md) e [ADR-0007](../decisions/ADR-0007-acasystem-os.md) con un'annotazione datata.

## Scelte esecutive

Scelte reversibili, da confermare dove indicato nei punti qui sotto.
- **Casetta e pagina principale.** La casetta fa della pagina al centro quella da cui parte il tablet, non la Copertina, che è una pagina speciale (interpretazione della risposta dell'utente).
- **Glifo delle frecce.** Frecce semplici, come chiesto. Il primo tentativo, `FileLeft`/`FileRight` di mx-icons (un foglio con una freccia, per non far pensare a «vai alla pagina»), è stato tolto al giro 2: a 24 px la freccia era di circa 5 px e serviva un import da un sottopercorso non esportato dall'indice del pacchetto.
- **Nuvoletta fuori dalle primitive.** Sta in `system/edit` e non tra le primitive: il design è provvisorio e il contratto delle primitive resta invariato.
- **Tempi della nuvoletta.** 500 ms per il dito, sul modello di Android; 300 ms di sosta del mouse; uscita del mouse dopo 120 ms; tolleranza di 10 px; click del rilascio annullato per 600 ms; permanenza dopo il rilascio da 1,5 s a 5 s secondo la lunghezza del motivo.
- **Rinomina che prende la barra.** A 390 px, con le altre icone visibili, il nome avrebbe avuto circa 60 px.
- **Casetta e «Fine» con il campo aperto.** Il `mousedown` è annullato, così il fuoco resta nel campo e la barra non cambia sotto il dito; il click chiude il campo come all'uscita, poi esegue l'azione.
- **Ripieghi locali.** Anello di fuoco scuro, colore dell'avviso e altezza dell'input sono corretti solo in `edit.css`. Il token globale `--aca-focus` e la primitiva Field non cambiano.
- **Pagine pronte.** Con il menu è stato eliminato anche `pageKinds.ts`, che serviva solo al menu. Le pagine pronte predefinite verranno con i kit, come detto dall'utente.

## Verifiche ed evidenze

Comandi in `progetto/acasystem/frontend`, Windows, Node del progetto, 2026-10-09.

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Implementazione | `npm run typecheck`, `lint`, `lint:typography`, `lint:theme-colors`; `npx prettier --check` sui file toccati; `npx vitest run` mirato e completo; `npm run build` | Superato | 0 errori; tipografia 0 violazioni (425 file), colori 0 (302 file); Prettier conforme. `EditIconAction` 8/8; `LauncherScreen` (75 test), `PolishCornice`, `IconRuntime`, `SystemSheets` superati. Suite 132 file, 1559 test, 474 s. Build in 5,1 s con l'avviso noto sui chunk oltre 500 kB. |
| Controllo nel Browser pane | `launcher.html` sul server di sviluppo a 390×844 e 1024×472, misure via JS | Superato con limiti | Telefono: barra di 367 px dentro 390, icone 44×44, riga sotto la scheda di 281 px, nessuno scorrimento orizzontale, campo 225×46 con il testo selezionato, Esc che lascia aperta la vista. Tablet: riga sotto la scheda alta una fila, nuvoletta al passaggio del mouse con `aria-describedby`. Pannello di 354×310 con screenshot a bassa risoluzione: non vale come prova visiva. La misura usava «Casa»: il trabocco con nomi più lunghi è stato trovato al giro 1. |
| Revisione, giro 1 | Controlli statici; Prettier; prova di mutazione; suite completa; script Playwright su Vite (127.0.0.1:5237) a 390×844, 360×780 e 1024×472 | Superato | 0 errori; tipografia 0 (425), colori 0 (302). Senza la correzione di `placePage` il nuovo test fallisce (atteso `home`, ricevuto `altra`), con la correzione passa. Suite 132 file, 1560 test. Gruppo della barra prima da -23 a 413 px a 390 e da -38 a 398 a 360, con cestino e «Fine» fuori; dopo da 16 a 374 e da 16 a 344, nome in ellissi (50 px a 390, 20 px a 360). Due Alt+→ sul nome: centro e fuoco su «Casa», posizione 3 poi 4. |
| Revisione, giro 2 | Controlli statici; Prettier su 7 file; `npx vitest run` su 6 file; prova di mutazione; script Playwright a 1024×472 e 390×844, mouse e tocco | Superato | 0 errori; 150/150 test. Togliendo `data-no-long-press` dalla scheda il test resta verde, come spiegato nel rilievo respinto. Con il campo aperto: primo tocco sulla casetta, nome «Sala» salvato e `aria-pressed=true`; «Fine» al primo tocco o clic salva il nome e chiude la vista nei 4 casi. Suite completa e build non eseguite in questo giro: eseguite nella verifica finale. |
| Verifica finale | `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `format:check`, `i18n:check`, `npx vitest run`, `npm run build`, `node scripts/check-bundle-size.mjs` | Superato, salvo `format:check` preesistente | 0 errori; tipografia 0 (425), colori 0 (302). `format:check` esce con 1 solo per `eslint.config.js` e `public/sw.js`, fuori dall'incarico. i18n 4/4. Vitest 132 file, 1562/1562, 472,6 s. Build in 1,99 s con l'avviso solito sui chunk oltre 500 kB (index 737 kB, hls 575 kB). Budget nei limiti: index 720,0/900 KB, vendor-react 177,5/200 KB, vendor-leaflet 145,3/200 KB. |
| Prova visiva | Playwright Chromium (da `progetto/acasystem/node_modules`), Vite di sviluppo, `launcher.html` con Kit 2 ed entità finte; 1024×472 e 390×844, chiaro e scuro; tocco via CDP, mouse, tastiera, movimento ridotto per il mouse | Superato con un difetto, poi corretto | **Barra:** solo icone più nome e «Fine», trasparenti, nessuna sovrapposizione, dentro lo schermo (1024: da 327 a 697 px; 390: da 22 a 368). **Rinomina:** campo con testo selezionato; «Cucina test» salvato nella barra e sulla scheda, fuoco di nuovo sul nome; con il nome vuoto «Il nome non può essere vuoto: resta quello di prima.»; Esc lascia aperta la vista. **«Nuova»:** pagine da 6 a 7 sul tablet e da 5 a 6 sul telefono, nessun menu, scheda con sole celle «+» (8×2 e 4×6). **Sotto la scheda:** 4 pulsanti 44×44 trasparenti senza testo visibile, salvo il numero (8 e 4); colonne da 8 a 9 sul tablet; al massimo sul telefono «Massimo su questo schermo.». **Nuvoletta:** pressione di 600 ms sull'occhio e su «Nuova pagina» la mostra senza eseguire l'azione; sul telefono resta nello schermo (da 126 a 382 di 390); col fuoco da tastiera compare con l'anello di 2 px ed Esc chiude solo lei; col mouse niente a 100 ms, presente a 500 ms. **Contrasti:** icone 10,62:1 nel chiaro e 12,83:1 nello scuro; casetta premuta 5,54:1 e 3,6:1. **Bersagli:** icone 44×44, nome 78×44 e 70×44, «Fine» 72×44. Console senza errori. **Difetto:** avviso del nome vuoto a 1,78:1 nel tema scuro. **Note:** sul tablet l'editor si apre con 1200 ms di pressione sul vuoto; sul telefono si è aperto da «Pagine», perché con la disposizione predefinita la pressione lunga solleva un widget vicino (comportamento precedente). Screenshot nella scratchpad della sessione, non versionati. |
| Correzioni visive | `npx prettier --write`; controlli statici; `npx vitest run` mirato e completo; `npm run build`; script Playwright a 390×844, chiaro e scuro | Superato, con un fallimento non riprodotto | Avviso del nome vuoto 6,13:1 nello scuro (prima 1,78:1), 8,07:1 nel chiaro invariato; input di rinomina 186×46 (prima alto 19 px). 0 errori; tipografia 0 (425), colori 0 (302). `LauncherScreen` 77/77 prima e dopo la suite. Suite 131/132 file, 1561/1562: un fallimento in «moves and resizes a widget with the keyboard in edit mode» (testo «Dimensione al limite per questo widget.» non trovato, 15,7 s), mentre server di sviluppo e Playwright caricavano la macchina; il test non tocca ciò che è cambiato (CSS e asserzioni sul CSS) e il file da solo passa 77/77. Suite completa non ripetuta. Build in 2,57 s con l'avviso solito. |
| Lenovo Tab M11, Chrome per Android, TalkBack, tastiera virtuale | Prova sul dispositivo | Non eseguito | Da provare: pressione lunga nativa sulle icone (menu contestuale, `pointercancel`, callout), nuvoletta al tocco, rinomina nella barra con la tastiera virtuale, TalkBack. |
| Home Assistant reale | Banco con sessione HA | Non eseguito | Le prove usano entità finte. |
| Banco | `docker compose stop`; copia a freddo del volume; `image: aca-system:0.7`; `up -d --build` (2026-10-09, 12:10-12:12) | Superato | **Copia del volume:** `backup/banco/tunet-data-20261009-pre-0.7-freddo.tgz` (80 591 byte). **Immagine:** `aca-system:0.7` `sha256:e1a688d18f0738b2d3fa99a12e527d5720b8247d4eb316b9c60bc1c75a7920e5`, creata il 2026-10-09T10:11:41Z dopo le correzioni della prova visiva, container `healthy`. **Controlli:** `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.42`; bundle `index-BU0wYGPs.js` con la nuvoletta `.aca-edit-tip`. **Limite:** la build esegue il typecheck ma non la suite; il fallimento sotto carico segnalato dopo le ultime correzioni resta da riverificare nella suite completa di REP-20261009-004. |

## Controllo del diff e decisioni

- **Perimetro.** Rispetto all'istantanea di partenza cambiano 8 file tracciati (`LauncherScreen.test.tsx`, `PolishCornice.test.tsx`, `Icon.tsx`, `edit.css`, `LauncherScreen.tsx`, `Pager.tsx`, `launcher.css`, `iconChoices.ts`), più i file non versionati del frontend elencati sopra: `PageOverviewBar.tsx` e `PageCardControls.tsx` modificati, 2 nuovi, `pageKinds.ts` eliminato. Nessuna modifica a backend, dipendenze, `package.json` o `documentazione/archive/`; nessun commit Git; niente Docker nell'implementazione. Le icone vengono da mx-icons 1.1.2, già installato. Playwright è stato usato dall'installazione esistente per script una tantum, senza aggiungerlo al progetto.
- **Lavoro di altre sessioni comparso durante l'incarico, non toccato:** [UI-010](../design/componenti/originali/UI-010-tooltip.jsx.txt) con il catalogo e il registro di integrità, [REP-20261009-003](REP-20261009-003-vista-pagine-animazione.md) e [REP-20261009-004](REP-20261009-004-pageshell.md). REP-20261009-003 potrà toccare `launcher.css` e `Pager.tsx`: prima di un commit vanno controllati i conflitti.
- **Criteri.** D1-D5 osservati nella prova visiva e coperti da test. Tastiera e lettore di schermo: nomi accessibili, Alt+frecce sul nome e sulle frecce, rinomina da tastiera, nuvoletta al fuoco. Controlli verdi nella verifica finale; dopo le ultime correzioni, che riguardano solo CSS e asserzioni sul CSS, la suite completa ha dato un fallimento sotto carico non riprodotto e non è stata ripetuta. Prova visiva a 1024×472 e 390×844 eseguita. Banco in corso.
- **Decisioni.** Nessun nuovo ADR. ADR-0007 riceve un'annotazione datata; design.md annota con data le righe superate e descrive l'editor nuovo. Nessun conflitto nuovo tra codice, PRD e ADR.

### Punti da confermare con l'utente

1. **Casetta.** Intesa come pagina principale, quella da cui parte il tablet, e non come Copertina. Sulla Copertina la casetta è disattivata con il motivo.
2. **Frecce senza scritta e rischio G02.** Il test UX ([REP-20261009-001](REP-20261009-001-test-ux-persona.md), G02, [ISSUE-033](../project-status.md#issue-033)) ha visto che frecce senza scritta sembrano scorrere le pagine invece di spostarle. Le frecce restano senza testo come chiesto, con la nuvoletta «Sposta prima/dopo». Resta il cambio silenzioso della principale implicita quando una pagina va al primo posto, verificato nella prova visiva; non c'è un Annulla. Da decidere: glifo (freccia semplice o foglio con freccia), scritta, Annulla.
3. **Design della nuvoletta.** Lo stile è provvisorio. Il design dell'utente è [UI-010](../design/componenti/originali/UI-010-tooltip.jsx.txt), da applicare in REP-20261009-003. Da confermare anche i tempi: 500 ms per il dito, 300 ms per il mouse, permanenza da 1,5 a 5 s dopo il rilascio.
4. **«+» per le colonne.** «Più colonne» usa lo stesso «+» di «Nuova pagina» e delle celle libere: un glifo diverso è una scelta dell'utente (proposta registrata).
5. **Icone senza testo.** Il test UX (G35) consigliava etichette sotto le icone; l'utente ha scelto solo icone con la nuvoletta. Da rivalutare dopo la prova sul Lenovo.

### Limiti e questioni residue

- Nessuna prova su dispositivo reale: pressione lunga nativa di Chrome per Android, TalkBack, tastiera virtuale durante la rinomina nella barra.
- Mentre sono visibili, la nuvoletta della barra e l'avviso del nome vuoto coprono in parte i comandi sotto la scheda: a 1024×472 la nuvoletta sta tra y 361 e 396 e la riga tra 332 e 376; sul telefono l'avviso copre i quattro pulsanti. Sono temporanei; da rivedere con il design UI-010.
- Una nuvoletta aperta con il fuoco non si chiude da sola se la barra diventa inerte; fuoco perso, scorrimento ed Esc la chiudono. Caso limite non osservato.
- Casetta premuta nel tema scuro a 3,6:1: sopra la soglia, ma vicina.
- `--aca-focus` nel tema scuro resta sotto 3:1 fuori dall'editor (2,48-2,95:1 secondo l'accento) e la primitiva Field ha ancora l'input da 19 px negli altri campi: proposte registrate.
- Sul telefono, con la disposizione predefinita, la pressione lunga raggiunge raramente l'editor delle pagine; resta «Pagine» (proposta registrata).
- `pageKinds.ts` non era versionato: la sola copia è nella scratchpad della sessione, che non è un backup durevole.
- Nessuna suite e2e: le misure geometriche sono script una tantum.

## Chiusura e punto di ripresa

Codice, documenti e banco completati: `aca-system:0.7` su `http://192.168.1.42:3002`.
- **Git:** nessun commit. Il lavoro resta nel working tree insieme a quello non committato degli incarichi precedenti.
- **Prossimo passo:** registrare l'esito del banco in questo report e in infrastructure.md; poi la prova sul Lenovo Tab M11 (pressione lunga sulle icone, nuvoletta, rinomina nella barra con la tastiera virtuale, TalkBack) e le risposte ai punti da confermare.
- **Incarichi collegati:** il design UI-010 della nuvoletta e l'animazione della vista delle pagine sono in REP-20261009-003; il contenitore unico delle pagine in REP-20261009-004.

Proposte registrate in [project-status.md](../project-status.md#proposte-registrate-il-2026-10-09), non applicate.
