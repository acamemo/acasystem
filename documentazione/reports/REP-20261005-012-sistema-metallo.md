# REP-20261005-012 — Sistema «Metallo» a strati (UI-003)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261005-012 |
| Stato | Completato (fasi 1–2); fase 3 confluita in [REP-20261006-001](REP-20261006-001-acasystem-os.md) il 2026-10-06 |
| Data | 2026-10-05, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Commit di partenza | e192121 (HEAD); working tree con le modifiche non committate di REP-20261005-011 |
| Richiesta di riferimento | Chat del 2026-10-05: creare classi CSS o componenti di contenimento con stile, design e interazione del pulsante UI-003, annidando div per le varianti, per ottenere la reference neumorphism con più profondità; tabula rasa su colori, usando colori e font del pulsante, chiaro/metallico. Risposte al piano: solo tema chiaro metallico, nessun accento per ora, Inter da `@fontsource/inter`, ambito kit + pagina di prova + schermate già migrate. Piano approvato. |
| Autorizzazione | [ADR-0006](../decisions/ADR-0006-sistema-metallo.md). Inclusi: nuova dipendenza `@fontsource/inter` a versione esatta e aggiornamento del banco locale come nei report precedenti. Esclusi: commit senza richiesta, altre dipendenze, backend, configurazione HA, originali delle reference. |

## Obiettivo e perimetro

1. Token, font e materiale a quattro livelli (socket, guscio, faccia, contenuto) con modificatori `press`, `static` e `well` e le forme pillola, cerchio, arrotondata e card.
2. Primitive TSX: Material, Button e Card rifatti, Surface, Toggle, Segmented, Field, Slider, ProgressRing, Badge, SelectTrigger, tono del testo, Grid.
3. Pagina di prova `kit.html`, solo in sviluppo, che riproduce la reference. **Checkpoint con l'utente prima di migrare le schermate.**
4. Migrazione delle schermate già migrate: HOME, barra, menu, finestre di gestione, card di stato.
5. Documentazione, verifiche, build e banco locale.

Modifiche preesistenti: working tree di REP-20261005-011, non committato. I file in comune (neumorphism.css, Card.tsx, SensorCard.jsx, HomeEmptyState.tsx, PressureMaterial.test.jsx) vengono sostituiti da questo incarico come previsto dal piano. Lo stato di partenza resta ricostruibile dal diff Git e da backup/pressure-material-20261005.

## Criteri di completamento

- Il kit riproduce gli elementi della reference con i livelli e le interazioni del pulsante: hover del guscio, `clip-path`, scala 0,975 su faccia e contenuto.
- Ogni elenco di ombre ha lo stesso numero di strati in tutti gli stati; testo e testo attenuato ≥4,5:1 su facce e pagina; stati leggibili senza colore.
- Primitive senza conoscenza di HA; strict TS; test di struttura, ARIA e tastiera.
- Pagina di prova esclusa dalla build di produzione; Inter servito localmente.
- Schermate migrate senza regressioni funzionali; typecheck, lint, suite, build e budget superati; banco aggiornato.

## Avanzamento e modifiche

**Fasi 1–2 (kit e pagina di prova), fino al checkpoint con l'utente.**

- **Dipendenza:** `@fontsource/inter` 5.3.0 a versione esatta (`npm install --save-exact`); package.json e lock: 11 righe.
- **CSS** in src/styles/aca:
  - tokens.css: colori e font del pulsante; testo inciso 25→60 invece di 25→75 per il contrasto.
  - material.css: quattro livelli, comportamenti press/static/well, forme, dimensioni, host/hosted per pomelli e cursori, stati ARIA, movimento ridotto.
  - components.css: toggle, segmentato, campo, slider, anello, badge, menu a tendina.
  - index.css: Inter 300–700 locale.
  - Il CSS dei componenti sta in `@layer components`: le utility Tailwind dei chiamanti continuano a prevalere, come per ogni stile di componente.
- **Primitive TSX strict:**
  - nuove: Material (MaterialLayers, materialClass, engrave), Surface, Toggle, Segmented, Field, Slider, ProgressRing, Badge, SelectTrigger, Grid;
  - tono per Text/Heading;
  - Button rifatto sui livelli: `className` sul socket, `contentClassName` sul contenuto, testo nudo inciso automaticamente;
  - nuove icone mx-icons: chevron, cuore, borsa, campana, menu, impronta, invio, caffè, portafoglio, attività.
- **Pagina di prova:** kit.html + src/kit (solo sviluppo), che riproduce la reference: toggle, menu a tendina, card con onda, tasselli, icone con badge e premute, card con slider, impronte, pillola con pozzetto, pulsanti circolari, anello, segmentato, ricerca, stati dei pulsanti.

**Scelte esecutive durante la taratura.**

- Icone chevron: le varianti «2» di mx-icons sono frecce cerchiate; si usano ArrowRight1/ArrowLeft1 e ArrowDownLinear.
- Selezione stabile: faccia a 0,985 invece di 0,975, perché a 0,975 il socket scuro formava un bordo spesso. Il click resta 0,975; sulle card 0,985 e 0,99.
- Dimensioni allineate alla reference: toggle 5,5×2,5 em, tasselli icona 3,75 em.

**Stato intermedio dichiarato:** Button produce già il nuovo DOM, mentre le schermate esistenti non sono ancora migrate. HOME, barra e finestre restano visivamente incoerenti finché non si esegue la fase 3. Il banco locale non è stato toccato.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Primitive e contratto CSS | `npx vitest run` di MetalKit.test.tsx e MetalMaterial.test.jsx, host | Superato | 18 casi: DOM annidato, ARIA e tastiera nativa, strati uguali tra gli stati, colori e font del riferimento, `clip-path` sul raggio, layer components, movimento ridotto, contrasto ≥4,5 di inchiostri su facce e pagina. |
| Tipi e lint | `tsc -p tsconfig.home.json`; `eslint src/kit src/primitives` | Superato | Strict anche per src/kit; nessun errore. I test sono esclusi dalla configurazione ESLint upstream. |
| Suite, stato intermedio | `npx vitest run`, host | Fallito (atteso) | 770 test, 4 falliti in 3 file (PageNavigation, SettingsDropdown, SettingsMenuControl): verificano le classi dei pulsanti delle schermate non ancora migrate. Da sistemare in fase 3. |
| Pagina di prova | Vite 127.0.0.1:5173/kit.html, browser 1024 e 390 px | Superato, perimetro limitato | Hover misurato: guscio a zero, `clip-path` 1px, ombre di pressione, contenuto 0,975. Focus da tastiera visibile; Inter caricato in locale; nessun overflow a 390 px. Screenshot in backup/metal-kit-20261005. |
| Schermate, build, banco | — | Non eseguito | Fase 3, dopo il checkpoint. |

## Controllo del diff e decisioni

Da compilare.

## Chiusura e punto di ripresa

Da compilare.
