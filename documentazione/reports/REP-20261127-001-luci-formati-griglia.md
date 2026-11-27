# REP-20261127-001 — Luci nei formati della griglia Home

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261127-001, primo lotto del rifacimento progressivo del frontend |
| Stato | Completato, in revisione nella pull request |
| Data | 2026-11-27 (Europe/Rome) |
| Autore / modello | Claude Code (sessione di progetto); nome esatto del modello non riportato |
| Commit di partenza | `22eca26` |
| Richiesta di riferimento | Mattia, 2026-11-27: «Vorrei che l'applicazione fosse innanzitutto più pulita, con spaziature organizzate bene e soprattutto che segua i layout uguali a come quelli delle reference e anche il design se possibile.» Scelta della strada: «Rifacimento progressivo». Poi: «procedi con la versione finale di luci. […] il nuovo design ovviamente deve essere applicato anche su quello [la versione che si installa dal computer]. Quindi il repository poi deve essere successivamente aggiornato con tutti quanti i nuovi widget realizzati con il nuovo design e il nuovo layout.» |
| Autorizzazione | Rifacimento progressivo per famiglie, a partire dalle Luci, con i layout delle reference (Centro di Controllo in stile vetro, fornite come screenshot) e la demo «ACA Home Vetro» mostrata prima. Le altre famiglie seguono in lotti successivi della stessa strada. Nessun cambio di dipendenze, di gesti globali o di dettagli delle luci. |

## Obiettivo e perimetro

Introdurre i formati comuni della griglia Home e rifare su questi la tessera delle Luci:

- **Formati:** rotondo 1×1, pillola 2×1, alto 1×2, quadrato 2×2. Ogni misura deriva dal lato della cella (`--aca-cell`), quindi spaziature e raggi sono uguali su telefono, tablet e PC.
- **Primitive** (`ui/primitives/components/CellTile.tsx`, ADR-0004): `cellFormat`, `CellTile`, `CellOrb`, `CellLabel`, `FillSlider`. Non conoscono Home Assistant.
- **Stile** in `design/layout/cellTile.css`, sui token di Vetro Bianco (ADR-0043), senza nuove dipendenze né nuovi materiali.
- **Launcher:** una definizione con `cellFormats` dà al frame la forma del formato (`is-cell-*`) e conserva le proprie misure anche come widget del catalogo.
- **Luci:** `LightTile` sostituisce sia `LightWidget` (schede `light.*`/`light_*`) sia la tessera adattiva generica delle luci del catalogo. Misure 1×1–2×2, predefinita 2×1.

Esclusi: dettagli delle luci (`LightDetails`, `ProductLightDetails`), pagina Luci, altri widget, gesto di pressione lunga (resta l'ingresso nella modifica, ADR-0016), backend, client.

Il client Windows scarica l'interfaccia web pubblicata (`progetto/client`, `webBundle`), quindi riceve il nuovo design con la prossima release dell'interfaccia, senza modifiche al guscio.

## Criteri di completamento

1. Ogni formato ha un solo layout: 1×1 il cerchio intero accende e spegne; 2×1 cerchio con nome e stato; 1×2 riempimento verticale per la luminosità, oppure cerchio e testo se la luce non è dimmerabile; 2×2 cerchio in alto e testo in basso, oppure un modulo fino a quattro cerchi per un gruppo o un dispositivo con più canali.
2. Stato richiesto e confermato invariato (`useLightControl`): attesa, errore, assenza di conferma, invii limitati durante il trascinamento.
3. Non disponibile, entità mancante, caricamento e modalità modifica gestiti; i comandi non avviano la pressione lunga del launcher.
4. Tastiera: cerchi come pulsanti con `aria-pressed`; riempimento come `slider` con frecce, Pag su/giù, Home/Fine, Invio/Spazio.
5. Typecheck, test della famiglia e della suite, lint e build eseguiti; prova visiva su telefono e desktop.

## Avanzamento e modifiche

- Nuovi: `ui/primitives/components/CellTile.tsx`, `design/layout/cellTile.css`, `frontend/src/components/widgets/controls/light/LightTile.tsx`.
- Modificati: `ui/primitives/index.ts` (export), `design/base.css` (import), `design/themes/glass-white/index.css` (import dei token in `glass-white/cellTile.css`), `design/layout/launcher.css` (forma del frame per formato), `frontend/src/@types/launcher.ts` (`cellFormats`), `WidgetHost.tsx` (classe `is-cell-*`), `registry.ts` (misure proprie per `cellFormats`), `controls/index.ts` (definizione Luce), `AdaptiveCategoryWidget.tsx` (luce del catalogo verso `LightTile`, `AdaptiveBody` esportato per i test), `LightDetails.tsx` (import di `lightStatusText`).
- Rimosso: `controls/light/LightWidget.tsx`. `BrightnessKnob` resta perché lo usano la pagina Luci e `GestureControl`.
- Test allineati alla nuova luce: `AdaptiveCategoryWidget`, `AdaptiveNameAndState`, `AdaptivePixelFit`, `AdaptiveRegressions`, `ControlsFrame`, `MockupRoute`, `OperationalProfiles`, `OperationalWidgets`, `WidgetCatalogLauncher`, `WidgetCatalogPreview`, `WidgetCommands`.
- Test: `ControlsLight.test.tsx` riscritto per `LightTile` (24 casi); in `FixControlsReview.test.tsx` due casi passati a `LightTile`; in `PolishWidgetPoles.test.tsx` tolti i tre casi del vecchio layout a poli delle luci.

Scelte esecutive: colore acceso bianco pieno con glifo ambra per le luci, come lo slider della reference; nella pillola lo stato acceso dimmerabile è solo la percentuale («63%»), nel quadrato «Acceso · 63%»; il messaggio di errore sostituisce la riga di stato e resta annunciato dalla regione live; il frame mostra l'errore con `data-widget-error` come prima.  Senza collegamento con la casa i comandi si spengono e il lettore di schermo lo annuncia, mentre la riga di stato conserva l’ultimo stato noto (così l’anteprima non ancora collegata del catalogo dice «Spenta»).

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Typecheck strict | `npx tsc -p tsconfig.strict.json --noEmit` (frontend) | Superato | Nessun errore. |
| Test della famiglia | `npx vitest run src/__tests__/ControlsLight.test.tsx src/__tests__/FixControlsReview.test.tsx src/__tests__/PolishWidgetPoles.test.tsx` | Superato | Tutti i casi passano. |
| Suite completa | `npx vitest run` (sull'insieme dei 38 file che falliscono già su `main`, confrontato con lo stesso insieme a `22eca26`) | Nessuna nuova rottura | Su `main` falliscono già 109 casi in 32 file (pagine Home, catalogo, rete, CSS). Dopo il lotto falliscono solo casi già rotti su `main`. I test che descrivevano la vecchia luce adattiva sono passati a `LightTile`; quelli sul comportamento generico della scheda adattiva usano `AdaptiveBody` direttamente (ora esportato). |
| Contratto UI | `npm run test:ui` | Superato | 3 su 3. |
| Lint, build | `npm run lint -w frontend`, `npm run build -w frontend` | Build superata; lint con 7 errori già presenti | I 7 errori (`react-hooks/exhaustive-deps` in `HomeStartupContext`, `LauncherScreen`, `BottomDrawer`) sono su `main` e in file non toccati. Colori del tema e tipografia: nessun problema nei file nuovi. |
| Prova visiva | Vite locale, demo `#/mockup` a 390×844 e 1280×800, e banco temporaneo con i quattro formati a cella 78 px | Superato | Pillola reale nella demo; rotondo, pillola, alto (63% e 90%), modulo 2×2 e quadrati verificati sul banco. Nessun errore in console. Hardware e Home Assistant reale non provati. |

## Controllo del diff e decisioni

Il diff resta nella famiglia Luci più le primitive e il frame per formato, che le altre famiglie useranno nei lotti successivi. Nessuna dipendenza aggiunta. Il layout a «poli» del 2×2 approvato per le luci il 2026-10 (L-19) è sostituito per questa famiglia dalla nuova direzione richiesta dall'utente; resta per le famiglie non ancora rifatte. Proposte fuori perimetro in ISSUE-169.

## Chiusura e punto di ripresa

Lotto chiuso in attesa della revisione della pull request. Prossimo passo della stessa strada: la famiglia successiva sui formati (proposta: Prese e interruttori, poi Tapparelle e Clima), sempre con verifica visiva. Dopo il merge, la release dell'interfaccia porta il design anche al client Windows.
