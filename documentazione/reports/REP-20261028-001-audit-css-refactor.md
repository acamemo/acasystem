# REP-20261028-001 — Audit CSS/UI e refactor a parità di aspetto e animazioni

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261028-001, task 1 della notte del 2026-10-28 |
| Stato | In attesa di input (refactor fatto e verificato, non committato; proposte in ISSUE-127) |
| Data | 2026-10-28, dalle 01:00 (Europe/Rome) |
| Autore / modello | Claude Code, `claude-opus-5-5`; subagenti Claude Code (modello Sonnet) per letture e audit in sola lettura |
| Commit di partenza | `4c223d3` (commit di T1-T6 di REP-20261027-003, fatto su richiesta dell'utente prima di iniziare) |
| Richiesta di riferimento | «il task 1 consiste in usare la skill /impeccable per valutare il lavoro lato css, migliorare la ui e ui, facendo riferimento a skills come /design-system /design-taste-frontend anche per il dispendio minimo di righe di codice, sfruttamento css ed ereditarieta Ts per refrattorizzare, prove su tablet collegato ad usb per assicurarci che le animazioni non cambino ma vengano ottimizzate. Vorrei facessi una ricerca innanzitutto leggendo tutte le skills a disposizione sul pc» |
| Autorizzazione | Risposte dell'utente alle domande di avvio (2026-10-28 ~01:10): committare prima T1-T6 («Sì, committa prima»); refactor invisibile **e** piccole correzioni UI senza cambiare stile, colori o comportamenti («Anche piccole correzioni UI»); perimetro «Tutto il frontend»; schermo del tablet tenuto acceso via ADB durante le misure. **Non** autorizzati: commit per tappa (opzione non scelta), banco, push. |

## Obiettivo e perimetro

- Ricerca preliminare: lettura delle 62 skill installate in `~/.claude/skills` e dei plugin.
- Audit tecnico del CSS con `/impeccable audit` (punteggi, priorità P0-P3) e rilevatori delle skill.
- Refactor di CSS e TS del frontend (`progetto/acasystem/frontend/src`) con meno righe, **stesso rendering e stesse animazioni** (proprietà, durate, curve, coreografia), più economico sul Tab M11 dove possibile.
- Piccole correzioni UI che non cambiano stile, colori o comportamenti.
- Esclusi: nuove funzioni, cambi di stile Kit 2 o dei colori confermati (design.md, ADR-0011), rimozione di comportamenti descritti dall'utente, decisioni che toccano ADR (restano proposte), nuove dipendenze, banco e GitHub.

## Criteri di completamento

1. Righe di CSS/TS ridotte, con il conteggio prima e dopo.
2. Confronto automatico prima/dopo con zero differenze non spiegate: stili calcolati di ogni elemento e pseudo-elemento, `@keyframes` e pixel, a 1280×665 DPR 1.5 e 390×844, negli stati principali (strumento in `progetto/acasystem/frontend/.tmp/css-refactor/`, fuori da Git).
3. Typecheck strict, ESLint, tipografia, colori e suite Vitest completa verdi.
4. Misure sul Tab M11 via USB prima e dopo per le animazioni toccate, senza peggioramenti.
5. Report di audit, proposte fuori perimetro registrate, stato del progetto aggiornato. Nessun commit del refactor senza richiesta.

## Ricerca sulle skill

Le skill installate sono 62, in `C:\Users\matti\.claude\skills`, con 945 file e 14.456 righe di `SKILL.md`. C'è un solo plugin installato, `claude-seo`, che qui non serve. Le hanno lette tre subagenti in sola lettura, per area; poi l'agente principale ha caricato `/impeccable` e ne ha letto `audit.md` e `optimize.md`. I riassunti dei subagenti sono valutazioni loro, non verificate riga per riga.

| Area | Skill utili per questo incarico | Cosa se ne usa |
|---|---|---|
| Audit e design system | **impeccable** (`audit`, `optimize`, `distill`, `extract`; rilevatore `impeccable detect`), **design-system** (token a tre livelli, varianti con le proprietà personalizzate, `validate-tokens.cjs`), **design-taste-frontend** (`lint.mjs --app`), redesign-existing-projects, ui-ux-pro-max (solo come lista di regole: il suo `search.py` non funziona, perché `data/` e `scripts/` puntano a una cartella che non esiste) | Rilevatori eseguiti prima e dopo; regole su token, varianti, ombre e movimento |
| Animazioni e tocco | **review-animations**, **improve-animations**, **emil-design-eng**, **animate**, **mobile-native**, apple-design | Solo le parti di prestazione: animare `transform` e `opacity`, niente `transition: all`, `will-change` mirato, `touch-action`, hover solo con il mouse. Le regole su curve e durate non si applicano, perché le animazioni non devono cambiare |
| Qualità del codice e prove | **surgical-coding**, dead-code-hunter (senza installare `knip`/`depcheck`), break-ui (tabella dei difetti), playwright-cli/-trace | Diff minimi, CSS morto cercato con grep, confronto con Playwright |
| Non pertinenti o in conflitto | design-taste-frontend-v1, high-end-visual-design, minimalist-ui, industrial-brutalist-ui, stitch-design-taste, gpt-taste, feature-sliced-design, prototype, pick-ui-library, ci-setup, le skill di brand, immagini, replica-*, slides, deploy, security, Swift, Sonner | Impongono un'altra estetica, nuove dipendenze o una ristrutturazione: non usate |

Limiti trovati: nessuna skill tratta il costo GPU delle ombre, `contain` o il numero di livelli su GPU deboli come il Mali-G52. Per questo il metodo di misura sul tablet è quello del progetto (`backup/strumenti-tablet/LEGGIMI.md`), adattato al server isolato. Il lint di design-taste segnala come difetto ombre e sfumature, che sono lo stile Kit 2 confermato: quei rilievi non si applicano.

## Audit (impeccable)

`/impeccable audit` è stato applicato all'app esistente come rifinitura: le regole del progetto, il design.md e il Kit 2 valgono come riferimento. `impeccable context` non ha trovato PRODUCT.md né DESIGN.md e, per una rifinitura, permette di procedere senza crearli. Non sono stati creati.

Evidenze:
- rilevatore `impeccable detect --json src`;
- `design-taste-frontend/scripts/lint.mjs --app src`;
- `design-system/scripts/validate-tokens.cjs --dir src`;
- un audit strutturale del CSS fatto da un subagente (`backup/css-refactor/audit-strutturale.md`, fuori da Git), con i punti principali ricontrollati dall'agente principale;
- un audit del TS/TSX (`backup/css-refactor/audit-ts.md`);
- 188 istantanee dell'app sul server isolato, a 1280×665 DPR 1.5 e a 390×844;
- un controllo a mano del contrasto dei due inchiostri.

### Punteggio

| # | Dimensione | Punteggio | Rilievo principale |
|---|---|---|---|
| 1 | Accessibilità | 3 | Focus visibile, etichette ARIA e alternative da tastiera presenti ovunque. Il movimento ridotto è una dissolvenza voluta e non un azzeramento. Il contrasto calcolato è circa 10,6:1 per l'inchiostro e circa 5:1 per l'inchiostro attenuato (`oklch(0.5…)` su `oklch(0.938…)`). Unica area di tocco sotto i 44 px: il tasto mostra/nascondi dei campi password (corretto). TalkBack non è stato provato |
| 2 | Prestazioni | 3 | Le animazioni muovono solo `transform` e `opacity`. Non ci sono `transition: all` né `backdrop-filter`, e le pagine fuori vista hanno `content-visibility`. Restano tre punti: ombre animate sulla pressione dei pulsanti fuori dai widget; liste di ombre riempite di livelli trasparenti, il cui costo sul Mali non è misurato; livelli GPU permanenti sui pulsanti delle barre e dei fogli (ridotti, vedi sotto) |
| 3 | Temi | 3 | Token Metallo coperti dal Kit 2 (`skin.css`). Circa 70 colori `rgb()` letterali, quasi tutti negli schemi d'ombra Metallo. Token usati ma mai definiti: `--aca-radius-sm` (`adaptiveWidget.css:179`, angolo a 0) e `--status-*-fg` (`utils/chartColors.ts`) |
| 4 | Adattabilità | 3 | Tablet e telefono funzionano e `touch-action` è presente sulle superfici di trascinamento. In modifica sul telefono i pallini dell'indicatore passano sotto l'ingranaggio; sul tablet il nome della pagina tocca il bordo superiore delle celle |
| 5 | Integrità dell'implementazione | 3 | Il rilevatore trova solo 2 rilievi, entrambi voluti: il bordo laterale del menu di Casa 3D (`casaScreen.css:214`) e la curva elastica della nuvoletta (`edit.css:712`), presa dalla reference. Duplicazione moderata, ma circa 1.150 righe di CSS e 1.300-2.100 di TS servono solo alle gallerie o ai test |
| **Totale** | | **15/20** | **Buono** |

**Verdetto di integrità: superato.** Il sistema è coerente e specifico del prodotto: Kit 2 sopra le famiglie di materiale, token di movimento condivisi e test che ne bloccano tempi e curve. I rilievi di design-taste su ombre, sfumature e pulsanti «finti» contraddicono lo stile Kit 2 confermato, quindi non si applicano.

### Rilievi per gravità

- **P1, nessuno bloccante.** Non è emerso nulla che impedisca un compito o violi AA nelle schermate osservate.
- **P2. Token mai definiti** (`--aca-radius-sm`, `--status-*-fg`, `--card-*` in `utils/dragAndDrop.ts:324`). La proprietà viene ignorata: oggi un angolo è a 0 e i colori dei grafici cadono sul valore ereditato. Correggerli cambierebbe l'aspetto, quindi è una proposta.
- **P2. Pallini dell'indicatore sotto l'ingranaggio** in modifica su 390 px (istantanea `telchrome__modifica`). È una proposta: tocca la coreografia dell'indicatore, che i test bloccano.
- **P2. Pressione dei pulsanti fuori dai widget.** Anima `box-shadow` e `clip-path` per 200 ms (`material.css:67-97`), quindi ridisegna a ogni fotogramma. Un'alternativa con l'opacità di uno pseudo-elemento non sarebbe identica al pixel: è una proposta.
- **P3. Tasto mostra/nascondi della password** a 22 px e hover «appiccicoso» sul tocco: **corretti** (vedi Avanzamento).
- **P3. Barra di avanzamento nel dettaglio del lettore.** Con il focus da tastiera, l'anello del cursore sfiora la riga «In riproduzione» sopra. Al tocco l'anello non c'è: annotato, non corretto.

### Problemi sistemici

- Il CSS è vincolato da 36 file di test che lo leggono come testo. Ogni consolidamento costa l'aggiornamento delle asserzioni: per questo il refactor si è fermato dove la riga risparmiata non vale la perdita di una guardia.
- Le parti più grandi da togliere richiedono decisioni dell'utente, perché tolgono comportamenti o componenti esistenti (vedi Proposte).

### Punti forti da conservare

- Coreografia guidata dai token, con test che legano le costanti TS ai token CSS.
- Area di tocco a 44 px fatta con un `::before` trasparente, senza cambiare l'aspetto.
- Divieto per test di `:has()` sul guscio.
- Livelli GPU già calibrati sul Tab M11.

## Avanzamento e modifiche

**Preparazione.** Su richiesta dell'utente, T1-T6 di REP-20261027-003 sono nel commit `4c223d3` (nessun push). Strumenti, fuori da Git, in `progetto/acasystem/frontend/.tmp/css-refactor/`:
- `server.mjs` / `server-tab.mjs`: copia parametrizzata di `e2e/isolated-server.mjs`, con porta e `dist` scelti da variabile. La variante per il tablet ha una prima pagina «Casa» con 12 widget.
- `snap.mjs`: 188 istantanee con orologio fermo. Per ogni stato salva la schermata e gli stili calcolati (≈140 proprietà) di ogni elemento, `::before` e `::after`, più il testo dei `@keyframes`. Gli stati sono: venti tipi × quattro taglie con i dettagli a 1280×665 DPR 1.5, venti tipi a 390×844 DPR 3, Principale, modifica, foglio «Aggiungi un widget», modifica da pressione lunga, Sistema.
- `diff.mjs`: confronto proprietà per proprietà e pixel per pixel (`magick compare -metric AE`).
- `tablet.mjs`: misura sul Tab M11 via USB (CDP 9225, `adb reverse`) di 9 animazioni: scorrimento avanti e indietro, entrata e uscita dalla modifica, vista pagine aperta con la pressione lunga e chiusa, dettagli aperti e chiusi, tocco su un comando. Misura anche il numero di livelli del compositore, con tracciamento oppure in modalità leggera (solo rAF).

Due esecuzioni sulla stessa build di partenza coincidono al pixel in 182 istantanee su 182. Le uniche differenze di stile (191) sono larghezze di testo legate all'ora in 2 istantanee: questo è il rumore dello strumento.

**Modifiche CSS (rendering identico verificato)**
1. Tolto `templates/launcher/adaptiveWidget.css` (73 righe), che nessun file importava: era una copia vecchia di quello in `components/widgets/adaptive/`.
2. `themes/kit2/index.css` non importa più `components.css` (504 righe di classi `k2-*`), usato solo dalla galleria Kit 2 che lo importa da sé.
3. `components/widgets/adaptive/widgetDesigns.css`, da 354 a 153 righe. Le regole della sola galleria (/ui-kit) sono passate in `pages/ui-kit/widgetDesigns.css`. Tolte tre regole morte: `uikw-video`, `uikwa-light-preview`, `uikwa-divider`.
4. Le otto transizioni delle barre (barra di modifica, barra delle pagine, indicatore) usano due token, `--aca-bar-enter` e `--aca-bar-leave` in `tokens.css`, fatti degli stessi token di durata e curva.
5. `aca-ctl-pending` è diventato `aca-pulse` con `--aca-pulse-to: 0.55` (stessa opacità finale di prima).
6. Fusi i blocchi `@layer components` consecutivi: edit.css da 7 a 1, utilities.css da 3 a 1, launcher.css, pageIndicator.css e statusBar.css da 2 a 1. Tra i blocchi c'erano solo commenti, quindi l'ordine delle regole non cambia.
7. Le quattro `preview.css` delle famiglie di widget (pagine di sviluppo e gallerie /ui-kit) sono ora un `components/widgets/preview.css` comune più quattro file brevi: da 386 a 248 righe. Fatto da un subagente, che ha confrontato gli stili calcolati prima e dopo: differenze solo nei testi che dipendono dall'ora.

**Ottimizzazione dei livelli (non identica al pixel, impercettibile).** In `skin.css` i pulsanti che con il Kit 2 non si rimpiccioliscono più rinunciano al livello GPU permanente anche fuori dai widget: barre, fogli, impostazioni. Lo tengono le manopole ospitate, la manopola a gesto, i pozzetti morbidi e il guscio del riquadro del widget. Le istantanee mostrano differenze di antialiasing sui bordi di testo e ombre di quei pulsanti, invisibili a occhio nei confronti affiancati. La build senza questa modifica (verifica separata) è identica al pixel in 188 istantanee su 188. Sul Tab M11: 86→79 livelli a riposo, 99→92 in modifica, 149→143 nella vista pagine; fotogrammi invariati entro il rumore (vedi Verifiche). Nuovo test in `LagLayers.test.ts`.

**Piccole correzioni UI (autorizzate).** Il tasto mostra/nascondi dei campi password (`.aca-field__action`, 22 px) ha l'area di tocco di 44 px degli altri pulsanti del kit, con lo stesso `::before` trasparente. Il suo cambio di colore al passaggio del mouse vale ora solo con `(hover: hover)`, così sul tablet non resta acceso dopo il tocco. Test in `FixKitReview.test.tsx`.

**Modifiche TS (subagente, rivisto a campione dall'agente principale)**
- Tolti 29 export mai usati né in produzione né nei test (circa −243 righe), elencati in `backup/css-refactor/audit-ts.md` §8.
- `isRecord` duplicato in `media/model/choices.ts` e `storage.ts`, sostituito con quello di `validators/guards.ts`, che ha la stessa semantica.
- `classes()` spostato in `utils/classes.ts` (tone.ts lo riesporta) e usato al posto delle unioni `[...].filter(Boolean).join(' ')` su più righe, solo dove c'è sempre una classe fissa: l'attributo non diventa mai assente. Circa −40 righe in 25 file.
- Lasciati, perché il guadagno era nullo o la semantica diversa: `noop`, `pad2`, gli helper di entità per famiglia, `isRecord` di `CameraFeed` (accetta gli array).

**Test aggiornati** perché fissavano la stringa sostituita, con lo stesso intento: `MotionChoreography.test.ts` (ora verifica la definizione dei token delle barre e il loro uso), `EditToolbarHidden.test.tsx`, `FixKitReview.test.tsx` (selettore del `::before`).

**Incidente corretto.** Gli script Python di modifica avevano scritto `components.css`, `material.css` e un test con fine riga CRLF, e un test era fallito. I tre file sono tornati LF e il diff è pulito. Aggiunta una nota nella memoria dell'agente.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Riferimento prima delle modifiche | Suite completa e controlli a `4c223d3` | Superato | 3447/3447; `backup/css-refactor/baseline/` (fuori da Git) |
| Typecheck strict, ESLint, tipografia, colori | `npm run typecheck`, `lint`, `lint:typography`, `lint:theme-colors` | Superato | 0 violazioni (604 e 412 file) |
| Suite completa | `npx vitest run --maxWorkers=3` | Superato | 3450/3450. La prima esecuzione aveva 1 fallimento (UI-003: primitive che importavano da `utils/`), corretto spostando `classes()` nelle primitive |
| Rumore dello strumento | Due esecuzioni di `snap.mjs` sulla build di partenza | Superato | 182/182 identiche al pixel; 191 differenze di larghezza in 2 istantanee legate all'ora |
| Rendering delle modifiche CSS | Build senza la rinuncia ai livelli contro la partenza, 188 istantanee | Superato | Identiche al pixel e negli stili calcolati; cambiano solo i 3 `@keyframes` toccati di proposito |
| Rinuncia ai livelli | Build con la modifica contro la partenza | Superato, con differenza attesa | Cambia `will-change`; antialiasing diverso su testo e ombre dei pulsanti interessati, non visibile affiancato |
| DOM dopo il refactor TS | Build finale contro la build delle sole modifiche CSS | Superato | 188/188 identiche al pixel; 6 differenze di testo legate all'ora |
| Tab M11, livelli | `tablet.mjs`, A/B alternato, server isolato | Superato | Livelli 86→79 a riposo, 99→92 in modifica, 149→143 nella vista pagine |
| Tab M11, fotogrammi | `LIGHT=1 tablet.mjs`, ABAB, 3 giri × 9 animazioni | Superato (nessun peggioramento) | Differenze entro la variazione tra le passate di base. Gesti sintetici, non il dito; il tracciamento aggiunge da solo fotogrammi lenti |
| Rilevatori impeccable e design-taste | `impeccable detect --json src`, `lint.mjs --app src` | Eseguito | 2 rilievi voluti, invariati; avvisi di design-taste da 323 a 296 |
| Prova col dito, telefono reale, TalkBack | — | Non eseguito | Servono l'utente o un dispositivo diverso |
| Banco | — | Non eseguito | Nessun aggiornamento del banco: non richiesto |

## Controllo del diff e decisioni

- **Diff** (`git diff --shortstat -- progetto/acasystem/frontend/src`): 72 file, +653/−1155, di cui 4 file di test (+38/−6).
- **Righe:** CSS da 13.066 a 12.814, TS da 43.189 a 42.967, TSX da 46.991 a 46.950: 515 righe in meno nei sorgenti.
- **Bundle:** il CSS principale scende da 171,3 KB a 160,2 KB (−6,4%). Ci sono circa 700 righe di regole in meno da confrontare a ogni ricalcolo di stile: k2-* 504 e galleria 200. I file restano nel repository per le gallerie.
- **Confronto con la richiesta:**
  - impeccable usato per l'audit;
  - design-system e design-taste usati per token e rilevatori;
  - CSS sfruttato con token di transizione, proprietà personalizzate nei `@keyframes`, fusione dei layer e separazione dei bundle;
  - TS con helper condiviso e tipi esistenti; animazioni verificate sul tablet.
- **Cosa non è entrato:** il risparmio grosso. Le parti più pesanti tolgono componenti o comportamenti, oppure cambiano l'aspetto: per AGENTS.md restano proposte in [ISSUE-127](../project-status.md#issue-127--proposte-dallaudit-cssui-codice-da-togliere-e-piccoli-difetti-che-cambiano-laspetto).
- **Decisione esecutiva da segnalare:** la rinuncia ai livelli GPU non è identica al pixel nei rapporti di antialiasing, anche se lo è a vista e nella coreografia. Si toglie da sola riportando la sola regola di `skin.css`, se l'utente la vuole indietro.
- Nessun ADR nuovo: le modifiche applicano ADR-0004, ADR-0005 e ADR-0011 senza cambiarli.
- Nessun commit del refactor: l'utente ha scelto di non committare per tappa.

## Chiusura e punto di ripresa

**Stato:** in attesa di input. Il refactor e le correzioni sono nell'albero di lavoro, verificati e non committati.

Server di prova fermati per PID. Tolti `adb reverse` (3013, 3021, 3022, 3023) e il forward 9225. Sul tablet `stay_on_while_plugged_in` è tornato al valore originale, 15. Il banco 3002 e l'istanza `server-prova` dell'altra chat non sono stati toccati.

**Punto di ripresa:**
1. l'utente guarda le schermate o prova col dito, sul tablet, un'istanza della build `progetto/acasystem/frontend/.tmp/css-refactor/dist-2` (server: `DIST_DIR=… PORT=… node .tmp/css-refactor/server-tab.mjs`);
2. commit del refactor, su richiesta;
3. decisioni su ISSUE-127 (P1 codice dei soli test e P2 Metallo sono quelle che tolgono più righe).
