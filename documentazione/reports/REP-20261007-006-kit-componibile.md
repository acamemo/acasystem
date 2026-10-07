# REP-20261007-006 — Kit Metallo componibile e galleria completa

| Campo | Valore |
|---|---|
| Stato | Sospeso il 2026-10-07 per Kit 2 (REP-20261007-007); codice presente e verificato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07 (citazione in ADR-0010); «Poi in kit mostrami tutti i componenti realizzati e le varianti». |
| Autorizzazione | ADR-0010. Inclusi: famiglie di classi con alias delle vecchie, componenti dei prototipi nel kit (riquadro, tasto tondo, termometro regolabile, barra, stati acceso/corrente), galleria completa in `#/ui-kit`. Esclusi: migrazione di launcher e widget alle nuove classi, nuove dipendenze, commit. |

## Criteri di completamento

- Ogni famiglia di ADR-0010 esiste nel CSS del kit ed è indipendente dalle altre; gli alias `aca-m--*` producono lo stesso risultato di prima.
- Le primitive compongono le nuove classi; nuove primitive o proprietà per riquadro, tasto tondo, slider verticale senza pomello, misuratore.
- I prototipi Principale e Temperatura usano solo primitive del kit, senza CSS di componente proprio.
- La scheda «Kit Metallo» mostra ogni componente con le sue varianti e le classi che lo compongono.
- Typecheck, lint, lint dei colori, test e build verdi; banco ricostruito; controllo nel browser integrato.

## Avanzamento al 2026-10-07 (sospeso)

Fatto: famiglie di classi in `material.css` con alias `aca-m--*`; `kitClass()` e `materialClass()` che emette famiglie e alias; tokens degli stati acceso e corrente e del riempimento verticale; componenti `aca-tile`, slider `--vertical` e `--column`, `aca-meter` in `components.css`; primitive `Tile`, `AddTile`, `Meter`, `Button.state`, `Slider.orientation` e `Slider.variant`; prototipi in `#/ui-kit` composti solo da primitive; sezione «Composizione» nella scheda «Kit Metallo» (`pages/kit/CompositionGallery.tsx`); test del kit aggiornati alle nuove famiglie.

Verifiche: typecheck, lint, lint dei colori, vitest 1328/1328 e build verdi. Il banco include questo codice (vedi REP-20261007-007). Non fatto: controllo visivo della galleria e dei prototipi; chiusura dei criteri. L'utente ha chiesto Kit 2 per confrontare un'altra direzione grafica.
