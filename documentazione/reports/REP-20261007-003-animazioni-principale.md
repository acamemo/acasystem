# REP-20261007-003 — Revisione delle animazioni della «Principale» (emil-design-eng)

| Campo | Valore |
|---|---|
| Stato | Completato e verificato; banco su `aca-system:0.4` |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07: «usa emil-design-eng per rivedere le animazioni della Principale», poi «applica tutte le righe, anche sul kit». |
| Autorizzazione | Tutte le righe della revisione, incluse le durate del kit Metallo (`material.css`, ADR-0007). Esclusi: nuove dipendenze, commit, aggiornamento del banco. |

## Modifiche

- **Kit** (`themes/acasystem/material.css`): token `--aca-ease-out`, `--aca-ease-in-out`, `--aca-press` (120 ms), `--aca-release` (220 ms). Le transizioni di socket, guscio, faccia e contenuto passano da 250–300 ms `ease` a 200–220 ms con ease-out marcato; durante `:active` / `.is-active` la durata scende a 120 ms (pressione rapida, rilascio più morbido). Vale per tutta l'applicazione.
- **Launcher** (`templates/launcher/launcher.css`):
  - l'hover delle schede non incassa più la faccia: lieve ombra in più, solo con `(hover: hover) and (pointer: fine)`;
  - la pressione dell'apertura dettagli usa `--aca-press`;
  - riposizionamento dei widget a 240 ms ease-in-out;
  - wiggle in modifica ridotto a ±0.25° e 320 ms, in pausa durante il trascinamento e sulla scheda puntata o col focus;
  - «+» delle celle in hover a 1.06 (era 1.12);
  - la sagoma trascinata entra con `@starting-style` (rotazione, scala 0.98, opacità in 150 ms).
- **Indicatore di pagina**: pallina a 220 ms (era 300).
- **Tastiera**: `LauncherScreen` registra la modalità di input su `<html data-aca-input>`; con la tastiera gli spostamenti dei widget non hanno transizione e il `Pager` cambia pagina senza scorrimento animato.
- `prefers-reduced-motion` resta invariato; aggiunta l'assenza di transizione per la sagoma.

## Verifiche

`npm run typecheck`, `npm run lint`, `npm run lint:theme-colors`, `vitest run` (1281/1281) e `vite build` verdi. Una prima esecuzione completa aveva 4 timeout di test sotto carico (passati isolati e nella riesecuzione completa) e un fallimento di `MetalMaterial.test.jsx` sulla regola dei selettori `:active`, corretto spostando il caso `:has([data-widget-open]:active)` in `launcher.css`.

Non eseguito: anteprime nel browser, prova sul banco Docker e su tablet fisico. La percezione dei tempi va confermata a occhio.

## Secondo passo: kit alleggerito

Richiesta in chat del 2026-10-07: alleggerire il kit, la cui animazione risultava troppo aggressiva, prendendo ispirazione da due componenti incollati dall'utente: un pulsante tondo che scala a 0,95 e un interruttore a pomello. Perimetro confermato: solo scala alla pressione, nessun nuovo elemento grafico. L'altro agente in sessione ha dichiarato di non toccare `themes/acasystem/`.

- `material.css`: rimossa la sequenza di hover degli elementi `press` e del pomello ospitato (guscio a zero, anello di `clip-path`, faccia incassata, contenuto a 0,975). Al click scala solo la faccia: `--aca-press-scale` 0,96, `--aca-hosted-press-scale` 0,95. Socket, guscio e ombre restano fermi. Invariati la selezione stabile, i pozzetti e la variante card (0,985).
- `components.css`: pomello dell'interruttore da 300 ms a 220 ms con `--aca-ease-out`.
- `launcher.css`: la pressione dell'apertura dettagli dei widget usa solo la scala.
- `MetalMaterial.test.jsx`: i due test sulla sequenza dell'originale sono sostituiti dal nuovo contratto (nessun hover, regola di pressione con sola `transform`).
- `design.md`: aggiornata la riga `press` e il paragrafo «Strati», conservando i valori precedenti.

Verifiche: typecheck, lint, lint dei colori, vitest 1327/1327 e build verdi. Una prima esecuzione aveva un errore di caricamento di `PolishLauncherScreen.test.tsx`, che passa sia isolato sia nella riesecuzione completa.

## Banco

Il 2026-10-07, dopo la fine dell'altro agente, il banco girava con `aca-system:0.3` (REP-20261007-002), senza il kit alleggerito (`--aca-press-scale` 0,975 nel CSS servito). Ricostruito con `docker compose -f progetto/compose.tunet.yaml up -d --build` come `aca-system:0.4`, immagine `sha256:0d2fbc7e1141b0c07bbea154e17d9b8dacadb2b54f30cc2d99624a3b59ebd933`. Prima del build: typecheck e vitest 1327/1327 verdi. Dopo: container healthy, `/api/health` `{"status":"ok","version":"0.1.0"}`, il CSS servito contiene `--aca-press-scale: .96` e `--aca-press: .12s`. La 0.3 resta disponibile per il ripristino. Prova visiva dell'utente nel proprio browser: non registrata in questo report.

## Terzo passo: revisione del neumorphism (ui-ux-pro-max)

Richiesta in chat del 2026-10-07: «usa ui-ux-pro-max per rivedere il neumorphism del kit», poi «applica tutte le righe». Il database di ricerca della skill non era disponibile (collegamenti `data` e `scripts` rotti verso `~/.claude/src/ui-ux-pro-max/`): la revisione ha usato regole e checklist del `SKILL.md`.

- `tokens.css`: linea di contatto del guscio dal 35% al 45% e sulla card dal 21% al 27% (contrasto dei bordi, WCAG 1.4.11). Il valore è una stima: il rapporto 3:1 non è stato misurato sul tablet.
- `material.css`:
  - hover solo con mouse, faccia `brightness(1.04)`, nessun incasso;
  - LED di selezione delle card a 0.125em;
  - disabilitato al 45% di opacità (era 55%);
  - `@media (forced-colors: active)`: contorno `ButtonText` su ogni elemento, `Highlight` spesso per la selezione e per il focus, tratteggiato per l'errore, `GrayText` per i disabilitati;
  - `@media (prefers-contrast: more)`: contorno grafite e LED di selezione più spesso.
- Prestazioni (circa 15 ombre per elemento): nessun intervento, da osservare sul tablet.
- `MetalMaterial.test.jsx`: aggiornati il valore della linea di contatto e la regola di hover.

Verifiche: typecheck, lint, lint dei colori, vitest 1327/1327 e build verdi. Non eseguito: prova visiva dei temi a contrasto di Windows e di `prefers-contrast`, misura del contrasto dei bordi, banco Docker al momento del passo (poi incluso in `aca-system:0.5`, REP-20261007-004).

## Punto di ripresa

Ricostruire l'immagine del banco per provare le animazioni sul tablet; eventuali ritocchi dei tempi agiscono sui token `--aca-press` e `--aca-release`.
