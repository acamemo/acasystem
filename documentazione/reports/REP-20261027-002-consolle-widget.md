# REP-20261027-002 — Consolle a schermo intero per i widget (prima la TV)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261027-002, consolle di controllo a schermo intero |
| Stato | In corso |
| Data | 2026-10-27 (Europe/Rome) |
| Autore / modello | Agente Claude Code; piano Opus 5.5, realizzazione affidata a un agente Sonnet |
| Commit di partenza | `94d88fc` (con il lavoro TV di REP-20261026-006 non ancora committato nell'albero) |
| Richiesta di riferimento | «bene stavo considerando di modificare la tendina al tap e fare un interfaccia dedicata per ogni widget a schermo intero come una consolle di controllo completa sul singolo widget /plan» |
| Autorizzazione | Piano approvato dall'utente il 2026-10-27, con le risposte: «Prima la TV, poi le altre», «Due colonne», «Si allarga dal widget». |

## Obiettivo e perimetro

Al tocco su uno spazio vuoto del widget TV si apre una consolle a schermo intero al posto della tendina.

**Come si comporta:**
- si allarga dal widget;
- ha due colonne sul tablet orizzontale e una sul telefono;
- si chiude con la freccia, il tasto Indietro di Android, Esc o scorrendo in basso dall'intestazione.

**Cosa resta com'è:**
- Gli altri 22 widget con dettagli restano sulla tendina. Quali convertire lo decide l'utente.
- Tutti i comportamenti della TV già approvati in REP-20261026-006 restano invariati.

**Modifiche preesistenti:** l'albero contiene il lavoro TV di REP-20261026-006, non committato, e modifiche di altri flussi. Vanno preservate; si tocca solo quanto serve.

Decisione registrata: [ADR-0025](../decisions/ADR-0025-consolle-schermo-intero.md).

## Criteri di completamento

1. **Primitiva `Console`** condivisa (ADR-0004):
   - apertura e chiusura dal rettangolo del widget, animate solo con transform e opacity;
   - con il movimento ridotto, solo una dissolvenza;
   - focus trattenuto ed Esc;
   - tasto Indietro tramite la cronologia;
   - scorrimento in basso dall'intestazione;
   - `ConsoleColumns`: due colonne da 900 px, una sotto.
2. **Launcher:** `WidgetDefinition.Console`. La TV apre la consolle, gli altri widget la tendina di prima.
3. **Consolle TV:**
   - **a sinistra:** testa, tasti base, volume e canali, riproduttore;
   - **a destra:** telecomando, App, Ingressi, Modalità audio;
   - le sezioni sono condivise con `TvDetails`, senza logica duplicata.
4. **Controlli superati:**
   - test nuovi e test esistenti;
   - typecheck, ESLint, Prettier;
   - lint di tipografia e colori;
   - suite completa.
5. **Prova sul tablet:**
   - schermate a 1280×665 e a 375 px;
   - tempi di apertura;
   - il tasto Indietro chiude senza lasciare la pagina.

## Avanzamento e modifiche

Realizzato (codice in `progetto/acasystem/frontend/src`):
- **Primitiva** `components/primitives/components/Console.tsx` (`Console`, `ConsoleColumns`), con gli stili in `themes/acasystem/components.css`. Funzionamento:
  - è un portale su `DialogShell` e `PanelPresence`;
  - il volo dal rettangolo del widget usa solo transform e opacity (280 ms in apertura, 200 ms in chiusura), e il contenuto compare all'arrivo;
  - con il movimento ridotto c'è una dissolvenza di 120 ms;
  - il tasto Indietro usa `history.pushState` e `popstate`; la freccia, Esc e lo scorrimento chiamano `history.back()`;
  - lo scorrimento in basso parte solo dall'intestazione: chiude oltre il 25% dell'altezza o con un colpo veloce, altrimenti torna su;
  - due colonne da 900 px.
- **Launcher:** `WidgetDefinition.Console`; nuovo `templates/launcher/WidgetConsole.tsx`. In `LauncherScreen.tsx` il rettangolo del widget va alla consolle, e con la consolle aperta Esc non agisce sul launcher. `hasDetails` vale anche per `Console`.
- **TV:**
  - le sezioni sono in `components/widgets/media/parts/tv/`, con lo stato in `useTvDetailsState`;
  - `TvConsole.tsx`: a sinistra testa, tasti base, volume e canali, riproduttore; a destra telecomando, App, Ingressi, Modalità audio;
  - `TvDetails` compone le stesse sezioni in una colonna;
  - registrazione in `components/widgets/media/index.ts`.
- **Scelte esecutive:**
  - il pulsante che chiude si chiama «Chiudi», per non confondersi con il tasto «Indietro» del telecomando;
  - la consolle non mostra l'anteprima `AdaptiveCategoryWidget` che la tendina mostra per i widget di categoria (la TV non lo è).

Realizzazione affidata a un agente Sonnet; diff e prove controllati dall'agente principale.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Suite completa | `npx vitest run --maxWorkers=4` (frontend) | Superato | 225 file, 3402 test. Nuovi: `ConsolePrimitive.test.tsx` (13), `TvConsole.test.tsx` (5), 1 caso in `LauncherScreen.test.tsx`; i test TV esistenti passano invariati. |
| Controlli statici | typecheck, ESLint, `lint:typography`, `lint:theme-colors`, Prettier | Superato | Tipografia e colori a 0 violazioni. Prettier segnala `LauncherScreen.tsx` già al commit di partenza (righe non dell'incarico). |
| Tablet, consolle | Tab M11, server di prova 3007, tocco sul widget TV 2x2 | Superato | Consolle a schermo intero su due colonne, tutto visibile senza scorrere (TV spenta). |
| Tablet, tasto Indietro | `adb shell input keyevent 4` | Superato | La consolle si chiude e resta la pagina di Acasystem. |
| Animazione e tempi | CDP | Non eseguito | Le catture via adb sono troppo lente per vedere il volo. |
| Scorrimento con il dito, vista telefono 375 px | — | Non eseguito | Provati solo nei test automatici. |

## Controllo del diff e decisioni

Il diff corrisponde al perimetro: primitiva, launcher, consolle e sezioni TV, test. Gli altri widget sono invariati.

In `LauncherScreen.tsx` restano le modifiche non committate di un altro flusso (`placementsOf`, `useHeldAfterFrames`), che sono state preservate. Decisione: [ADR-0025](../decisions/ADR-0025-consolle-schermo-intero.md).

## Chiusura e punto di ripresa

**Da verificare:**
- l'animazione di apertura e chiusura sul tablet (fluidità, con CDP);
- lo scorrimento in basso con il dito;
- la vista telefono.

**Restano all'utente:**
- la valutazione della consolle;
- la scelta dei widget da convertire dopo la TV;
- il commit, insieme al lavoro TV di REP-20261026-006 ancora non committato.

## Seconda fase: altri widget (2026-10-27)

L'utente ha approvato la consolle TV: «La consolle TV mi va bene: proponi quali altri widget convertire». L'agente ha proposto tre gruppi:
1. lettore musica e gruppi, robot aspirapolvere, stanza, clima, telecamera;
2. luci, tapparelle, auto, meteo, costi energia, allarme;
3. widget che restano sulla tendina perché hanno pochi comandi: serratura, sensore, liste, calendario, ventilatore, robot tosaerba, prezzi Nordpool, «Rileva dispositivi».

**Scelta dell'utente:** tutto il gruppo 1 («Lettore musica e gruppi, Robot aspirapolvere, Stanza e Clima, Telecamera»).

**Realizzazione:** affidata a tre agenti Sonnet su file separati (media, utilità, casa), con lo stesso schema della TV: sezioni condivise, `*Details` come composizione in una colonna, `*Console` su `ConsoleColumns`. Esiti: suite completa 230 file / 3426 test superati; typecheck, ESLint e lint puliti. Telecamera, robot, stanza, clima e lettore musica non sono ancora stati provati sul tablet.

## Riproduttore UI-011 e componenti ripetuti (2026-10-27)

**Riproduttore.** L'utente ha chiesto «se invece prendessimo ispirazione dalla reference?» e ha incollato il codice di un riproduttore «Now Playing». La reference è conservata senza modifiche come [UI-011](../design/componenti/originali/UI-011-riproduttore-now-playing.html.txt), con catalogo e `integrita.json` aggiornati.

**Componenti ripetuti.** Mentre l'agente adattava il riproduttore, l'utente ha osservato: «hai ricreato i pulsanti non hai preso i componenti usati nella ui del widget base». Ha poi approvato un piano di refactoring:
- **`parts/tv/TvFace.tsx`:** un'unica faccia della TV (testa e tre tasti) per widget, tendina e consolle, con le regole del widget per misure, stato «in attesa» e disattivazione.
- **Volume a TV spenta:** nella consolle e nella tendina il volume è ora sbiadito e inerte, come sul widget. Prima con la TV spenta poteva ancora togliere il muto.
- **`Transport`:** è condiviso, con stop e gli spazi per indietro/avanti veloce. Lo usano TV e lettore musica.
- **`StepPair` / `StepButton`:** sono condivisi da volume e canali TV e da `VolumeControl`.
- **`parts/NowPlaying.tsx`:** è la card incassata ispirata a UI-011, senza vetro, blur né ombre animate, usata da TV e lettore musica.
- **`design.md`:** ha la regola «stessi componenti del widget».
- I file `TvBaseKeys.tsx` e `TvHeadSection.tsx` sono stati tolti.

| Controllo | Comando/procedura | Esito | Evidenza e limiti |
|---|---|---|---|
| Suite completa | `npx vitest run --maxWorkers=4` | Superato | 231 file, 3431 test. Nuovo `TvFace.test.tsx` (5): stessa fila di tasti nel widget e nella consolle; volume inerte a TV spenta; `Transport` con stop e salti. Aggiornato un caso di `AvTv.test.tsx` per il volume inerte a TV spenta. |
| Controlli statici | typecheck, ESLint, Prettier, lint tipografia e colori | Superato | 0 violazioni. |
| Tablet | Tab M11, TV spenta | Superato | I tasti della consolle sono uguali a quelli del widget, tutti sbiaditi. La card del riproduttore funziona, ma la colonna sinistra ora va scorsa un poco. |
| Lettore musica sul tablet | — | Non eseguito | Nessun lettore musicale configurato nella prova. |

**Card più compatta (2026-10-27, richiesta dell'utente: «rendi la card del riproduttore più compatta così la colonna sinistra della consolle TV non scorre»).** La card aveva un doppio margine interno: quello della card e quello del contenuto. Ora ha solo quello della card, ridotto a 1em (`.aca-media-nowplaying-card`). Gli spazi interni sono più piccoli e la copertina passa a 3,5rem.

Nella consolle, «Volume» e «Canali» stanno sulla stessa riga (`.aca-media-steps-row`); nella tendina restano uno sotto l'altro.

Verifiche:
- sul Tab M11 la colonna sinistra entra senza scorrere (TV spenta);
- TvConsole, TvFace, MediaConsole e AvMediaDetails: 21 test superati;
- typecheck e lint puliti;
- la suite completa non è stata ripetuta dopo questa modifica.
