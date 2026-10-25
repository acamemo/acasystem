# REP-20261012-001 — Widget spostato tra pagine: grandezza visiva e posto sempre trovato

| Campo | Valore |
|---|---|
| Stato | Completato; banco `aca-system:0.9` |
| Data | 2026-10-12, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`); chiusura dei documenti con Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`) |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` più il working tree non committato (fino a REP-20261009-006, banco `aca-system:0.8`) |
| Richiesta di riferimento | Chat del 2026-10-12, prova della 0.8 sul tablet. |
| Autorizzazione | La segnalazione dell'utente e la sua scelta «Grandezza visiva» alla domanda posta in chat. |

## Richiesta

> «ho spostato il widget orologio nella mia pagina principale e si è ridotto a 1x1, una volta ridimensionato, se provo a passarlo nella copertina, non me lo passa. Inoltre è come se le 3 griglie con animazione di drag and drop si unissero quando sto trascinando il componente sulla pagina»

**Domanda all'utente:** come deve cambiare la grandezza di un widget spostato su una pagina con quadratini di misura diversa?

**Risposta:** «Grandezza visiva». Il widget mantiene circa la grandezza che si vede; se dove lo si lascia non c'è posto, si rimpicciolisce fino a entrare, al minimo 1×1.

## Causa verificata

- **Il trascinamento verso un'altra pagina conserva le celle, non la grandezza.**
  - Il calcolo della destinazione (`useWidgetDrag.ts`, `computeTarget`) usa le celle del widget sulla pagina di partenza, adattate solo ai limiti della griglia di arrivo.
  - Lo spostamento dal menu (`moveWidgetToPageInLayout` senza destinazione) fa lo stesso.
- **Esempio sul tablet.**
  - La copertina ha 3 colonne e 1 riga, con celle di circa 320 px. Su Principale le celle sono di circa 112 px.
  - L'orologio 1×1 della copertina arriva su Principale come 1×1 piccolo.
  - Ingrandito su Principale, per esempio a 3×2, torna verso la copertina come 3×1, cioè l'intera riga.
  - L'anteprima copre allora tutte e tre le caselle: sono le «3 griglie che si uniscono».
  - La riga è già occupata da data e meteo, quindi il rilascio è rifiutato.

## Obiettivo e perimetro

- **Trascinamento su un'altra pagina.** La destinazione usa la grandezza visiva della copia, convertita nelle celle della pagina di arrivo e nei limiti del widget e della griglia.
  - Se lì non c'è posto, si prende la grandezza più grande che entra nel punto di rilascio, fino al minimo del widget.
  - L'anteprima mostra la grandezza che verrà usata.
- **Spostamento dal menu** («Sposta nella pagina» e frecce): stessa conversione, con le misure di riferimento della classe dello schermo. Il resto è come oggi: primo posto libero, rimpicciolendo fino al minimo.
- **Esclusi:**
  - lo spostamento nella stessa pagina e il ridimensionamento, che restano invariati;
  - le altre classi di schermo, già trattate con la propria griglia;
  - funzioni nuove, dipendenze, backend.

## Criteri di completamento

- L'orologio 1×1 della copertina arriva su Principale con una grandezza vicina a quella vista, entro i suoi limiti.
- Ingrandito su Principale, torna sulla copertina nella casella libera, senza anteprima su tre caselle e senza rifiuto.
- Test unitari della conversione, del trascinamento tra pagine e del menu.
- Suite completa, typecheck, lint, tipografia e colori verdi; build.
- Banco aggiornato.

## Avanzamento e modifiche

Un'implementazione e una revisione di Opus con correzioni. Nessun commit Git, nessuna dipendenza nuova, nessuna modifica al backend.

- **Conversione in celle (`utils/launcher/layout.ts`).** `sizeAcrossKeys` porta una misura in celle da una griglia a un'altra: la trasforma in pixel con il passo della griglia di partenza e la riconverte con il passo di quella di arrivo, sulle aree di riferimento della classe di schermo.
- **Trascinamento tra pagine (`hooks/launcher/useWidgetDrag.ts`, `computeTarget`).** Su un'altra pagina la grandezza è quella che il widget mostra, convertita nelle celle della pagina di arrivo (`cellsForBox`) ed entro i limiti del widget e della griglia.
  - **Il widget spostato si rimpicciolisce prima degli altri.** Con `shrinkCandidates` si prova la grandezza più grande che entra dove si rilascia, e gli altri widget si limitano a spostarsi (`tryMove`, poi `tryMoveWithReflow`). Solo se nessuna grandezza entra si rimpiccioliscono anche gli altri. Il rilascio ripete lo stesso calcolo.
  - **Misura presa una volta, al sollevamento.** La grandezza mostrata sta in `DragSession.shown`. Così il bersaglio si calcola sulla pagina nuova non appena la pagina gira, come richiede CORR-7 (`FixLauncherLogicRipresa.test.tsx`: «targets the new page as soon as the page turns, never the old one»).
- **Spostamento dal menu.** `LauncherScreen.moveToAdjacentPage` passa la misura reale dello schermo (`size`) a `controller.moveWidgetToPage`, che la inoltra a `moveWidgetToPageInLayout(…, to, size)`. Senza misura dello schermo, per esempio da un percorso che non la conosce, il ripiego è `sizeAcrossKeys` sulle aree di riferimento.
- **Test (`LauncherDragDrop.test.tsx`).** 36 test verdi nel file. Quelli di questo incarico:
  - la conversione delle celle attraverso la loro misura sullo schermo (`sizeAcrossKeys`);
  - dal menu, la misura rilevata sullo schermo prevale su quella delle aree di riferimento;
  - l'orologio della copertina non è 1×1 su Principale e, ingrandito, torna nella casella libera;
  - nel trascinamento tra pagine: l'orologio arriva grande quasi come prima e si rimpicciolisce prima degli altri; un widget troppo grande per il posto libero si rimpicciolisce fino a una cella; l'orologio ingrandito su Principale torna nella casella libera della copertina e non sull'intera riga.

  I due test nuovi della revisione falliscono senza la correzione.

### Revisione

Una revisione di Opus sul primo codice. Dopo le correzioni valgono le tre proprietà descritte sopra: il widget spostato si rimpicciolisce prima degli altri, la misura si prende una sola volta al sollevamento (CORR-7) e il percorso dal menu usa la misura reale dello schermo.

## Verifiche ed evidenze

Comandi in `progetto/acasystem/frontend`. Le prove sono state fatte in jsdom con Vitest; nessuna prova a mano di questo comportamento sul tablet.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Test del trascinamento e del menu | Superato | `LauncherDragDrop.test.tsx` 36 test, con i casi dell'orologio della copertina, del rimpicciolimento e del menu; i due test nuovi della revisione falliscono senza la correzione. |
| Statici | Superato | `npm run typecheck` 0 errori, `npm run lint` 0, tipografia 0 violazioni (428 file), colori 0 (303 file), eseguiti dopo l'ultima correzione del blocco grafico di REP-20261012-003, nello stesso working tree. |
| Suite frontend completa | Superato, con nota | Ultima esecuzione completa: 142 file, 1706 test passati (`--maxWorkers=4`, 961 s). Due esecuzioni precedenti sotto carico avevano dato fallimenti per timeout da 15 s (`LauncherScreen`, `SystemPage`) e un fallimento reale del test di CORR-7, poi corretto come sopra. |
| Build e banco | Superato | Frontend compilato nella costruzione dell'immagine `aca-system:0.9` (bundle `index-DG_i_to_.js`); esito del banco in [infrastructure.md](../infrastructure.md). |
| Orologio 1×1 → Principale → copertina, sul tablet | Superato (2026-10-12, agente principale) | Tablet delle demo TB336ZU, Chrome 154, banco 0.9, eventi touch CDP (`scratchpad/device/clockmove.cjs`). L'orologio della copertina (1×1, 397×397 px) parte con una pressione di 1,2 s, gira pagina al bordo destro e arriva su Principale come 3×3: grandezza massima dell'orologio, 308×263 px, anteprima 3×3. Tornando sulla copertina l'anteprima occupa una sola casella («Colonna 1, riga 1») e l'orologio torna 1×1 nella colonna 1. Disposizione salvata prima della prova e uguale alla fine. |

## Chiusura e punto di ripresa

**Esito:** completato nel codice e sul banco `aca-system:0.9`, con i test. Il 2026-10-12 la prova è stata fatta anche sul tablet delle demo con eventi touch: l'orologio torna sulla copertina in una sola casella.

**Limiti:**
- **Aree di riferimento di `phoneLandscape`.** Il ripiego del menu usa le aree di riferimento della classe dello schermo. Per `phoneLandscape` l'area di 973×230 non corrisponde al Lenovo in Chrome: il tablet delle demo (TB336ZU) misura 1280×665 CSS a DPR 2 (REP-20261012-003). Il ripiego scatta solo se lo schermo non fornisce la misura reale; il trascinamento e il menu della schermata usano la misura reale. Registrato come aggiornamento di [ISSUE-028](../project-status.md#issue-028).
- **Annuncio al lettore di schermo.** Dopo uno spostamento la nuova grandezza non viene annunciata. Proposta non applicata: [ISSUE-045](../project-status.md#issue-045).

**Ripresa:** resta la prova dell'utente con il dito, e quella sul Tab M11.
