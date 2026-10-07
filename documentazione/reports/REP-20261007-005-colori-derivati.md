# REP-20261007-005 — Colori derivati da una base, neutri sul bianco puro, pozzetti più leggeri

| Campo | Valore |
|---|---|
| Stato | Completato; banco su `aca-system:0.5` |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07: «ricalcolare i colori, per fare in modo che partendo da un colore base, tutte le variazioni di colore chiaro derivino dal colore main, in maniera tale che se ti dicessi di farlo verde non devi modificare l'intera scala colori, poi portare il colore principale sul bianco puro e andare a diminuire il nero dello slider della temperatura e il misuratore di temperatura. Voglio che venga trovato un equilibrio visivo totale». Chiarimento: «colore principale» = superfici neutre. |
| Autorizzazione | Token del kit Metallo, regole dei pozzetti, test del kit. Esclusi: nuove dipendenze, commit, cambio dei colori base degli accenti. |

## Modifiche

- `themes/acasystem/tokens.css`:
  - nuova base neutra `--aca-base: oklch(100% 0 0)`; pagina, facce, pozzetto, grafite (`--aca-socket`), nuovo `--aca-socket-well` e inchiostri sono passi di luminosità della base (`oklch(from var(--aca-base) …)`);
  - accenti: basi `--aca-orange`, `--aca-blue`, `--aca-danger` invariate; chiaro dell'arancione, inchiostri e inchiostri per icone derivati con luminosità fissa (0,40 e 0,49) e croma proporzionale (× 0,6 e × 0,75); `--aca-fill-pending` derivato con alpha 45%;
  - pozzetti più leggeri: ombra del foro 25% → 14%, `--aca-face-pressed-layers` 55/38/36% → 30/18/18%.
- `material.css`: i pozzetti usano `--aca-socket-well` invece della grafite (niente contorno nero su slider, termometro, campi); velo del foro da 0,25 a 0,15.
- `components.css`: anello del pallino di notifica su `--aca-page` invece di `rgb(230 230 230)`.
- Test: `MetalMaterial.test.jsx` risolve i colori relativi e verifica i contrasti sui valori calcolati, la derivazione di ogni variante dalla sua base e una base verde simulata; `PolishKit.test.tsx` usa il nuovo `__tests__/kitColors.ts`.
- `design.md`: sistema di colori e valori del materiale.

## Verifiche

typecheck, lint, lint dei colori, vitest 1328/1328, build verdi. Banco `sha256:3c6d5bbbbec8d9c0b0820c5eb8bdead2dddadb60049bd47ff0f3b55fcec470bd`, healthy. Browser integrato: prototipi in `#/ui-kit` con superfici sul bianco; impostando a runtime `--aca-orange` su un verde l'intera scala (linee, inchiostri, riempimenti) segue senza altre modifiche.

## Correzione: filo grigio sul bordo dei riquadri

Segnalazione del 2026-10-07 (schermata del riquadro «Turbo»): un filo grigio scuro sul bordo sinistro. Causa misurata nel browser integrato: con lo zoom al 125% (`devicePixelRatio` 1,25) i riquadri sono larghi 72,89 px; sotto la faccia bianca il socket aveva lo sfondo grafite (`oklch(0.5 0 0)`) e l'antialiasing del bordo arrotondato della faccia lo lasciava trasparire. Con le facce sul bianco il contrasto lo ha reso visibile. Correzione in `material.css`: il socket degli elementi in rilievo è trasparente; i pozzetti mantengono il loro anello (`--aca-socket-well`). `--aca-socket` resta un token del kit (verificato ≥ 3:1 dai test) ma non è più usato come sfondo. Vitest 1328/1328, lint dei colori, build verdi; banco `sha256:d35f17991351403991940d3c51d88afec13b4a27a272ae0422537b934aa8d039`, healthy; sfondo trasparente verificato nel browser integrato, resa allo zoom dell'utente da confermare.

## Correzione: bordo uniforme in pressione

Richiesta del 2026-10-07 («vorrei anche uniformare il bordo in pressione», schermata di «Timer» premuto). Causa: al clic scalava solo la faccia, mentre il guscio con l'ombra di contatto restava a misura piena; la faccia si staccava dall'ombra, che compariva come bordo scuro irregolare, più spesso in basso a destra. Correzione: la scala di pressione si applica al guscio (`.aca-m__outer`), che porta con sé la faccia, per `press`, per il pomello ospitato (`--aca-hosted-press-scale`) e per l'apertura dettagli dei widget del launcher; transizione `transform` sul guscio e `transform: none` in `prefers-reduced-motion`. Il pozzetto tenue, senza guscio, resta invariato. Vitest 1328/1328, lint, lint dei colori, build verdi; banco `sha256:11f51142c1fd29384ee1abdee12ca441e3c75e85c253d27b4526df5bf2064c25`, healthy; con `.is-active` il guscio risulta `matrix(0.985 …)` e la faccia senza trasformazione nel browser integrato.

## Analisi: pressione «a scatti»

Segnalazione del 2026-10-07 dopo il passo precedente («in pressione il tasto si restringe a scatti»). La misura per fotogramma non è stata possibile: il pannello del browser integrato era nascosto e Chrome rallenta timer e fotogrammi. Analisi da CSS e dalle transizioni attive lette con `getAnimations()`:

1. **Filtro spento al clic (causa certa).** La luce di hover (`filter: brightness(1.04)` sulla faccia) era esclusa con `:not(:active)`. Alla pressione partivano quindi due animazioni insieme: la scala del guscio e il filtro della faccia. Un filtro su una faccia con `clip-path` e otto ombre interne viene ridisegnato a ogni fotogramma. Inoltre la luminosità cala di colpo mentre il pulsante si restringe. Correzione: la luce resta durante la pressione, che ora anima solo `transform`.
2. **Scala senza livello di composizione (causa probabile).** Il guscio veniva promosso a livello solo durante l'animazione: rasterizzato a scala 1 all'inizio, ridisegnato a 0,985 alla fine, con un salto di nitidezza su testo e ombre. Senza livello, il ridisegno su CPU porta i bordi al pixel intero a ogni fotogramma. Correzione: `will-change: transform` sul guscio degli elementi premibili, del pomello ospitato e della cornice dei widget del launcher. La GPU interpola la scala con precisione sub-pixel.
3. **Spostamento di circa un pixel (limite, non corretto).** Sulle card la scala è 0,985: su un riquadro di 72,89 px fa 1,1 px in tutto, circa 0,5 px per lato, in 120 ms con un ease-out marcato. Anche con il livello GPU il movimento è al limite della percezione e può sembrare un piccolo scatto. Proposta, non applicata: card a 0,97 (circa 2,2 px), oppure una curva meno concentrata all'inizio.
4. **Osservazioni minori, senza effetto visibile.** La regola che accorcia le durate al clic usa il selettore discendente e si applica anche ai materiali annidati e agli antenati, perché `:active` vale anche per i genitori. Oggi non cambia nulla, perché quegli elementi non animano.

Verifica nel browser integrato, con le classi di anteprima e le transizioni disattivate per leggere gli stati finali: guscio `will-change: transform` e `matrix(0.985 …)`, faccia `brightness(1.04)` e nessuna trasformazione. Vitest 1328/1328 (un file in timeout di caricamento nella prima esecuzione completa, verde da solo e nella seconda), lint, lint dei colori e build verdi. Banco `sha256:1194a26546649ad9a167bfcbacecc3c9bedd337135c098b1e73bf779bc8102bc`, healthy. Fluidità da confermare a vista dall'utente.

## Limiti e questioni

- I colori relativi OKLCH richiedono Chrome/Edge 119+, Safari 18+, Firefox 128+. Su un browser o WebView del tablet più vecchio le dichiarazioni sono ignorate e i colori mancano: da verificare sul dispositivo del pilota (ISSUE-030).
- La galleria del kit (`pages/kit/KitPage.tsx`) riporta ancora gli esadecimali storici delle varianti come testo.
- Nessuna prova sul tablet fisico; nessuna misura del contrasto dei bordi sul nuovo fondo bianco.

## Punto di ripresa

Valutazione visiva dell'utente sul banco; verifica della compatibilità del browser del tablet.
