# REP-20261007-017 — Interruttore Kit 2 e barre di modifica flottanti

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, con le schermate dell'interruttore «Mostra copertina» e della barra di modifica: «c'è anche da sistemare lo switch […] la bottom bar, deve essere come la topbar, facciamo 2 floating bar laterali che comprende una i pulsanti di nuova pagina, pagina e aggiungi widget, l'altra con mostra copertina e il relativo switch, con animazione che quando vengono chiamati in modifica di risalità la stessa opposta alla barra superiore. Assicurati poi che le spaziature siano ben equilibrate». |

## Interruttore

Causa: sotto la pelle Kit 2 il pomello riceveva la coppia d'ombre in rilievo dei pulsanti. Sulla traccia d'accento faceva un alone che sembrava uscire dalla traccia. Le misure erano corrette: pomello 40 px dentro un contenuto di 108×40.

Correzione in `themes/kit2/skin.css`, con lo stesso numero di strati d'ombra in entrambi gli stati:
- pomello come disco pieno con una piccola ombra morbida, colore `--k2-knob`, bianco da acceso;
- traccia incassata da spento, gradiente d'accento con luce e ombra interne da acceso.

## Barre di modifica

- `components/system/edit/edit.css`: i due gruppi della barra di modifica sono barre flottanti come quella in alto.
  - Pillole in rilievo, imbottitura `--aca-space-1`, un solo gap `--aca-space-2`; il gruppo copertina ha in più `--aca-space-4` a sinistra del testo.
  - Pulsanti interni senza bordo.
  - Entrata dal basso in 360 ms (la copertina 40 ms dopo), il movimento opposto alla barra in alto; con il movimento ridotto solo una dissolvenza.
- `templates/app-shell/appShell.css`: `--aca-float-height` (44 px + imbottitura); nella disposizione su due righe la seconda riga del piè di pagina ha quell'altezza.
- `pages/ui-kit`: le barre di modifica vere sono nei prototipi.
- Test `PolishCornice` aggiornato alla riga del piè di pagina.

Limite: l'uscita dalla modifica non è animata, perché la barra di modifica viene smontata.

## Verifiche

Typecheck, lint, lint dei colori, lint tipografico, vitest 1335/1335 e build verdi. Anteprima locale: barre flottanti e interruttore corretti a vista. Banco `sha256:7a5efa1d2dcae9b7f514f84bb3809ac2d2528b9928db4de933edfa3f8a22253f`, healthy.

Annotazione del 2026-10-07: il limite sull'uscita non animata è superato da REP-20261007-018.
