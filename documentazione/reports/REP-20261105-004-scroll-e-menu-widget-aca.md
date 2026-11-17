# REP-20261105-004 — Scorrimento senza barre e menu widget ACA

| Campo | Valore |
|---|---|
| Stato | Completato localmente: codice, build e anteprima; banco .46 invariato |
| Data | 2026-11-05, Europe/Rome |
| Autore | Codex; nome esatto del modello non disponibile |
| Base Git | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`, 564 voci preesistenti modificate/non tracciate |
| Richiesta | Nascondere gli scroll orizzontali e verticali come elemento grafico, mantenendo lo scorrimento intuitivo; il menu evidenziato «Periodo del grafico» non ha un design coerente. |

## Perimetro e criteri

Nascondere le barre native nel design condiviso senza disabilitare overflow, ruota mouse, gesture touch, tastiera o accesso all'ultimo contenuto. Nessun nuovo sistema di gesture, overlay o preferenza. Il menu evidenziato deve usare le primitive/selettore ACA esistenti, conservando valori, stato, etichette, scritture e permessi. La correzione si applica al percorso comune che genera quel menu, senza assegnare un refactor di tutti i select del progetto.

Preservare il lavoro precedente e il banco .46. Nessuna installazione, pubblicazione, nuova dipendenza o API. Baseline, copie ed evidenze in `backup/rep048/`; sorgenti e confini in [design](../design/design.md), [ADR-0004](../decisions/ADR-0004-principi-frontend.md), [ADR-0005](../decisions/ADR-0005-typescript-italiano-icone.md).

Completamento: controlli reali di scroll verticale/orizzontale su viewport desktop/mobile, menu leggibile con stati e tastiera, chiusura/focus senza lasciare prematuramente la schermata, selezione periodo persistita tramite lo stesso writer. Verificare build, casi mirati e regressioni pertinenti; hardware e accesso sul banco reali distinti dalla fixture.

## Modifiche e motivazione

Otto file pertinenti, senza nuove dipendenze o file applicativi:

- `design/html.css`: nasconde i binari nativi su entrambi gli assi. Overflow, gesture e tastiera non cambiano; in `forced-colors` riemergono gli indicatori del sistema per accessibilità.
- `AdaptiveCategoryWidget.tsx` e `adaptiveWidget.css`: il ramo comune `options` usa OptionPicker/SelectTrigger/Popover ACA. Etichetta sopra, valore compatto nella pill e nome accessibile completo; nessun altro select migrato. Conservati callback `commit`, preferenze, valori fuori lista, pending e disabilitazione.
- `utilities/shared/details.tsx`: focus sulla voce corrente, frecce/Home/End, Escape isolato nella schermata del widget. API precedente conservata; la nuova opzione value-only non altera i chiamanti esistenti.
- `utilities/utilities.css`: lista verticale, voci con superficie effettiva almeno 44 px, testo a capo e scorrimento del menu lungo, fallback visibile. Il selettore del content prevale sulla regola Material senza duplicare il materiale nella schermata.
- `ui/primitives/components/Popover.tsx`: il focus richiesto prima della visibilità nativa viene ritentato al toggle; si memorizza soltanto un focus riuscito, senza riprenderlo all'utente a ogni render.
- `AdaptiveCategoryWidget.test.tsx` e `KitOverlays.test.tsx`: regressioni per selezione/salvataggio del periodo, enum esistenti, tastiera, disabled/fallback e focus prima/dopo apertura nativa.

La QA ha rilevato e fatto correggere due difetti del primo candidato: opzioni in riga alte 30,8 px per prevalenza del content Material, e focus rimasto sul trigger perché `beforetoggle` montava il contenuto ancora nascosto. Raw negativi e sonde restano conservati. Un'ultima riduzione del solo padding del trigger mantiene «24 ore» su una riga e il target sopra 44 px.

## Verifiche ed evidenze

| Controllo | Risultato |
|---|---|
| Test mirati, otto suite | 95/95 PASS, inclusa regressione focus nativo |
| Regressioni adattive/utility/TV/Console | 71/71 PASS; gruppi parzialmente sovrapposti, non sommare |
| `npm run build -w frontend` | PASS, incluso TypeScript strict; avviso HLS oltre 500 kB preesistente |
| `npm run typecheck:ui` e contratti UI/copia asset | PASS; 9/9 test UI/asset |
| `lint:theme-colors` | Zero violazioni su 599 file |
| Fixture browser, matrice principale | 9/9 PASS: quattro viewport Sensor, reduced motion, forced colors, fallback, due Sistema |
| Ricontrollo dopo padding finale | 4/4 PASS, viewport 1920/1366/390/320, valore su una riga e target almeno 44 px |
| Detector layout sorgenti e render | `[]` sui sei sorgenti UI; 3/3 render finali `[]` su Sensor1366, menu390 e Sistema390 |
| Diff, provenienza, review indipendente | Otto file attesi, nessuna rimozione/differenza estranea; 16 hash dei tre interventi precedenti conservati |

Provati offset reali con rotella, End/Home e swipe CDP mobile fino alle informazioni finali; in Sistema, scorrimento orizzontale dell'indice con touch/tastiera e verticale della scheda QR. Barre nascoste e `overflow` preservato misurati nel DOM, non dedotti dal solo screenshot. Contrasto elevato conserva le barre di sistema.

Picker: focus dentro il menu, selezione corrente riconoscibile, frecce/Home/End/Invio, primo Escape sul menu e secondo sulla Console, ritorno focus, light dismiss e fallback. Selezione 6 ore/7 giorni conservata riaprendo la schermata; nel test writer esatto `saveCardSetting(..., adaptiveHistoryHours, 168)` senza chiamate HA. La persistenza browser della fixture è locale simulata, non una nuova prova di sincronizzazione autenticata.

Evidenze private in `backup/rep048/`: manifest prima/dopo, `scroll-menu-targeted-final.json`, `scroll-menu-regressions-final.json`, build/strict, QA principale/prepolish e `scroll-dropdown-polish-qa.json`, sonde scrollbar/focus, screenshot, detector e `review-final.json`. Riepilogo finale `scroll-dropdown-qa-summary.json` e handoff QA; browser posseduti chiusi, fixture4184/4185 preservata. Immagini finali desktop/mobile viste anche dal coordinatore. Nessun errore JS, richiesta mutativa di rete, origine esterna o comando HA osservati nel campione.

Snapshot finale: 1793 sorgenti, SHA-256 `15daf9a5aef94272545b3be71886c84093b3ff3ea336fba9e29b9fd376c61d51`; otto file differenti dal checkpoint REP003, nessuna aggiunta/rimozione applicativa. Controllo whitespace su copie LF, senza convertire i sorgenti; 524 collegamenti documentali senza errori e hash dei materiali nativi conservati. Il debito generale ISSUE-134 resta distinto: nessuna dichiarazione di suite globale o typography interamente verdi.

## Chiusura e punto di ripresa

[Anteprima aggiornata](http://127.0.0.1:4185/?screen=app#/mockup), da ricaricare. Il banco risponde ancora `0.9.46`; ACA/HA/D1 conservano immagini e avvii precedenti. Nessun login, storage o bozza umani usati; nessuna pubblicazione, installazione, commit o aggiornamento del banco.

Prove Chromium con viewport e touch emulati: Safari/iPhone, Android e Lenovo M11 fisici non collaudati. La richiesta non assegna la migrazione di tutti i select o nuove gesture; ISSUE-146 sulla densità del pager resta separata. Nessun lavoro residuo nel perimetro; eventuale installazione sul banco è un'operazione distinta.
