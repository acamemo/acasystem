# REP-20261007-021 — Switch rifatto: geometria simmetrica e pomello zigrinato

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, con la schermata dello switch «Mostra copertina»: «controlla il codice dello switch che secondo me presenta qualche problema, in primis a livello di grandezza perché la spaziatura del cerchio sopra e sotto sembra essere diversa, potremmo implementare per gli switch il seguente componente riadattato al nostro codice», con un componente React d'esempio (switch con pomello a 12 puntini). |

## Causa

Lo switch precedente era composto dagli strati del materiale: il pomello «ospitato» (`aca-m--hosted`) stava nella traccia incassata, con il margine interno in em e l'anello della faccia ritagliata. Margini, anello e ombre di strati diversi davano spazi non uguali sopra e sotto il pomello.

## Modifiche

- `components/primitives/components/Toggle.tsx` riscritto con la geometria del riferimento, senza strati del materiale. API invariata (`checked`, `size`, `compact`, `pending`, `error`, `onLabel`/`offLabel`); stato in `aria-checked`; testo dello stato nascosto e `aria-hidden`, come prima.
  - Bordo in rilievo con imbottitura di 0,125em.
  - Traccia 3 × 1,5em; pomello di 1,375em centrato in verticale. Lo spazio intorno al pomello è 0,0625em su ogni lato, acceso e spento.
  - Il pomello si sposta con `transform` di 1,5em e alla pressione si allarga leggermente.
  - Zigrinatura 3 × 4 sul pomello; in errore il segno di avviso al posto della zigrinatura.
- `themes/acasystem/components.css`: nuovo blocco dello switch con i colori di Kit 2 (fallback Metallo).
  - Traccia incassata da spento, gradiente d'accento da acceso, pomello bianco.
  - In attesa: metà intensità e pulsazione. In errore: anello rosso.
  - Area di tocco di 44 px, focus, disabilitato, movimento ridotto.
  - Taglie: md 24 px, compact e sm 20 px, lg 28 px.
- Rimosse le vecchie regole dello switch da `themes/kit2/skin.css` (REP-20261007-017) e la dimensione forzata della barra di modifica (`edit.css`).
- Test aggiornati: `MetalKit`, `FixKitReview`, `PolishCornice`.

## Verifiche

Typecheck, lint, lint dei colori, lint tipografico, vitest 1341/1341 e build verdi. Anteprima locale, switch compatto della barra di modifica: traccia 60 × 30 px, pomello 27,5 px, spazi 1,25 px sopra, sotto e sul lato vicino, sia acceso sia spento; aspetto controllato a vista. Banco `sha256:c131bc1cd3fc8a9987dc53ca2459f1ec85917044cfe1cd451ecac46096e50098`.
