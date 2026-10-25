# REP-20261007-016 — Barra di stato: pulsante Modifica/Fine fluido, ritmo uniforme

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, con due schermate della barra in modifica. Richieste: «Fine» alto quanto Modifica; clic più fluido e non istantaneo; allungamento e comparsa di «Fine»; correggere l'ombra glitchata in pressione e il passaggio dallo stato premuto a riposo; a sinistra ora, pallino e testo «sincronizzato» senza icona, con lo stesso gap e in riga; a destra lo stesso gap; dimensioni di testi e icone bilanciate. |

## Cause

- Modifica e Fine erano due pulsanti diversi, sostituiti da React al clic. Il nuovo pulsante nasceva sotto il dito già nello stato premuto della pelle Kit 2 e tornava di colpo a riposo.
- La pressione del materiale scambiava liste d'ombre diverse sull'accento (faccia d'accento, poi pressione incassata), da cui l'ombra glitchata.

## Modifiche

- `StatusBar.tsx`:
  - un solo `<button class="aca-bar-button aca-edit-toggle">` resta montato e cambia nome accessibile (Modifica/Fine);
  - le icone matita e spunta sono sovrapposte e passano dall'una all'altra in dissolvenza con una piccola rotazione;
  - l'etichetta «Fine» si apre con una traccia grid da `0fr` a `1fr`, cioè un allungamento reale senza misure fisse, e compare in dissolvenza con un leggero ritardo;
  - Sistema usa lo stesso `aca-bar-button`.
- `statusBar.css`:
  - `aca-bar-button`: 44 px, icona 1,25rem, senza bordo; hover con l'accento; pressione con `scale(0.94)` animata in 160 ms;
  - `aca-edit-toggle.is-editing`: pillola d'accento alta 44 px, con le stesse due ombre interne in entrambi gli stati, così la transizione di sfondo e ombra è continua;
  - gap unico `--aca-bar-gap` per sinistra e destra;
  - con il movimento ridotto le transizioni sono azzerate.
- `ConnectionStatus.tsx`:
  - niente icona del server;
  - LED e testo sono elementi separati con lo stesso gap della barra;
  - testo a 1rem, come l'ora;
  - da connesso il testo è «Sincronizzato» (`connectionText`), anche in Sistema, che usa lo stesso componente.
- `pages/ui-kit`: la barra vera, con il pulsante funzionante, è nei prototipi, così si prova senza accesso.
- Test aggiornati: `PolishCornice` (pulsante unico, altezze, traccia dell'etichetta), `FixSystemConnection`, `SystemPage`, `LauncherIndicatorCover` («Sincronizzato»).

## Verifiche

Typecheck, lint, lint dei colori, lint tipografico, vitest 1335/1335 e build verdi. Anteprima locale, stati finali letti con le transizioni disattivate: Modifica 44×44 trasparente, Fine 84×44 d'accento con etichetta visibile, stesso elemento, due strati d'ombra in entrambi gli stati; Sistema 44 px. Banco `sha256:2c5c51d6f8aadd911ceb98581ce1f05df1eceb4d7ebed6bae326d3bca3463bfd`, healthy. Non osservata l'animazione fotogramma per fotogramma: la finestra del browser integrato era nascosta.
