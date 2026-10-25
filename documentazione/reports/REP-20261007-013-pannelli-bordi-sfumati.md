# REP-20261007-013 — Pannelli: righe sfumate ai bordi invece che tagliate

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, con la schermata di «Aggiungi un widget»: «dobbiamo sistemare i pannelli per evitare questo bug visuale delle icone dei widget che rimangono mezze coperte». |

## Causa e modifica

Il corpo dei pannelli (`.aca-sheet__body`) scorre in una scatola che arriva a filo dell'intestazione e del piè di pagina: le schede in scorrimento venivano tagliate di netto a metà. In `themes/acasystem/components.css`, valido per tutti i pannelli e per la pelle Kit 2, il corpo ha ora una maschera a gradiente: in alto e in basso, per 1em (quanto il margine interno già presente), il contenuto sfuma a trasparente. A pannello fermo le prime e le ultime righe sono nel margine e restano intere.

## Verifiche

Lint dei colori, vitest 1333/1333 e build verdi. Banco `sha256:341bb8e9c0efe4dd79c7c551d7cfd1b61a135063b1eb188f8b9af232d229c863`, healthy. Nel browser integrato, sul foglio della galleria del kit, la maschera risulta applicata (`linear-gradient(… 16px … calc(100% - 16px) …)`). Non eseguito: controllo visivo dello scorrimento, perché la finestra del browser integrato era nascosta; pannello «Aggiungi un widget» del launcher, che richiede l'accesso.
