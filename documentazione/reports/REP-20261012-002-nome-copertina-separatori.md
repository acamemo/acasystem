# REP-20261012-002 — Nome della copertina con le stesse lineette delle altre pagine

| Campo | Valore |
|---|---|
| Stato | Completato; banco `aca-system:0.9` |
| Data | 2026-10-12, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`); chiusura dei documenti con Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`) |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` più il working tree non committato (fino a REP-20261012-001) |
| Richiesta di riferimento | Chat del 2026-10-12, prova della 0.8 sul tablet. |
| Autorizzazione | La richiesta qui sotto. Risolve il punto «separatori sulla Copertina, da confermare» di REP-20261009-005. |

## Richiesta

> «poi ho notato che mentre nella pagina vuota ho due separatori con icone | nuova pagina | icona fine nella copertina invece è icone Copertina icona fine, non so perchè 2 design diversi deve essere un unico design per entrambi»

## Causa

La copertina non si può rinominare. Per questo `PageOverviewBar.tsx` mostra il suo nome come testo semplice (`aca-page-overview__label`), mentre le due lineette sono pseudo-elementi del pulsante del nome rinominabile (`.aca-page-overview__name`, `edit.css`). REP-20261009-005 aveva escluso apposta la copertina e lasciato la scelta da confermare; l'utente ora chiede un unico design.

## Obiettivo e perimetro

- Il nome della copertina ha le stesse due lineette, lo stesso spazio e la stessa altezza del nome delle altre pagine.
- Il nome della copertina resta non rinominabile e non diventa un pulsante.
- **Esclusi:** il resto della barra, cioè le icone che la copertina mostra o nasconde, e le funzioni nuove.

## Criteri di completamento

- Test sul nome della copertina: un contenitore con le stesse lineette, nessun pulsante e nessun campo.
- Controlli verdi: typecheck, lint, tipografia e colori, suite, build.
- Banco aggiornato.

## Avanzamento e modifiche

Nessun commit Git, nessuna dipendenza nuova, nessuna modifica al backend.

- **`PageOverviewBar.tsx`.** Senza `onRename` (la copertina) il nome è uno `<span className="aca-page-overview__name is-static">` che contiene l'etichetta `aca-page-overview__label`. Ha quindi la stessa classe del pulsante delle altre pagine e le stesse due lineette; non è un pulsante e non ha un campo.
- **`edit.css`.** La regola `.aca-page-overview__name.is-static` mette `display: inline-flex`, `align-items: center` e `height: var(--aca-control-height)`, così il nome ha l'altezza delle altre pagine. Le lineette (pseudo-elementi `::before` e `::after` di 1 px × 1,25 rem) e lo spazio vengono dalla regola comune `.aca-page-overview__name`.
- **Test (`PageOverviewBarRename.test.tsx`).** Il file ha 18 test, tutti verdi. Per la copertina verificano: uno `span` con la classe `is-static` e il testo «Copertina», nessun pulsante «Rinomina», nessun campo dopo un clic sul nome, e nel CSS la regola `.is-static` con l'altezza del controllo accanto a quella delle due lineette.

## Verifiche ed evidenze

Comandi in `progetto/acasystem/frontend`.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Test del nome della copertina | Superato | `PageOverviewBarRename.test.tsx` 18 test. |
| Statici | Superato | `npm run typecheck` 0 errori, `npm run lint` 0, tipografia 0 violazioni (428 file), colori 0 (303 file), eseguiti dopo l'ultima correzione del blocco grafico di REP-20261012-003, nello stesso working tree. |
| Suite frontend completa | Superato | 142 file, 1706 test passati (`--maxWorkers=4`, 961 s). |
| Build e banco | Superato | Frontend compilato nella costruzione dell'immagine `aca-system:0.9` (bundle `index-DG_i_to_.js`); esito in [infrastructure.md](../infrastructure.md). |
| Confronto a vista della copertina con le altre pagine, sul tablet | Superato (2026-10-12, agente principale) | Tablet delle demo, vista pagine, screenshot `scratchpad/device/09-vista-copertina.png` e `09-vista-principale.png`. «Copertina» è uno `SPAN.aca-page-overview__name.is-static`, «Principale» un `BUTTON`; entrambi sono alti 44 px, con `::before` e `::after` da 1 × 20 px. |

## Chiusura e punto di ripresa

**Esito:** completato nel codice e sul banco `aca-system:0.9`. Il punto «Separatori sulla Copertina» di REP-20261009-005 è risolto con la scelta dell'utente: un unico design per la copertina e le altre pagine.

**Ripresa:** nessun passo aperto. L'utente può confermarlo a vista.
