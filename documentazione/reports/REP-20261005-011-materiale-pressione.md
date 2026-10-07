# REP-20261005-011 — Materiale a pressione (UI-003) su barra, card di stato e benvenuto

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261005-011 |
| Stato | Completato |
| Data | 2026-10-05, Europe/Rome |
| Autore / modello | Claude Code. Sessione avviata con Sonnet 5.5 (`claude-sonnet-5-5`) e proseguita, dalla raccolta delle evidenze alla chiusura, con Opus 5.5 (`claude-opus-5-5`), secondo le indicazioni dell'ambiente. |
| Commit di partenza | e192121 (HEAD); working tree non pulito: `progetto/tunet/src/styles/neumorphism.css` modificato prima dell'incarico |
| Richiesta di riferimento | Chat del 2026-10-05: «Task di Restyling UI/UX: adattamento componenti allo stile scheumorfico/neumorfico lucido», con tre screenshot e il componente di riferimento (identico a UI-003, [pulsante a pressione](../design/componenti/originali/UI-003-pulsante-pressione.jsx.txt)). |
| Autorizzazione | Restyling dei soli elementi elencati nella richiesta. Nessun commit, dipendenza, deploy esterno o modifica dei comportamenti è autorizzato da questa richiesta. L'aggiornamento del banco locale segue la prassi dei report 008–010 ed è dichiarato nella chiusura. |

## Obiettivo e perimetro

Applicare struttura, strati, ombre e interazioni del pulsante UI-003 (socket scuro, guscio esterno con ombra che si annulla in hover, faccia con sette ombre interne, `clip-path` che si restringe in hover, `scale(0.975)` al click e sul contenuto in hover) ai seguenti elementi, in entrambi i temi:

1. **Barra superiore (screenshot 1):** pillola di navigazione (HOME/PRINCIPALE) e pulsanti circolari Modifica e Impostazioni (`border-radius: 50%`).
2. **Card di stato (screenshot 2):** la card «BACKUP BACKUP MANAGER STATE» (SensorCard) con lo stesso schema a strati e variazione di profondità in hover.
3. **Pannello di benvenuto (screenshot 3):** emblema circolare centrale e pulsanti «Aggiungi scheda» e «Carica profilo».

Riferimenti: [design.md](../design/design.md), [ADR-0004](../decisions/ADR-0004-principi-frontend.md) (composizione con primitive), [ADR-0005](../decisions/ADR-0005-typescript-italiano-icone.md), [catalogo componenti](../design/componenti/README.md), REQ-03.

Scelte esecutive dichiarate (non nuove approvazioni umane): colori dei volti e dei socket derivati dai due temi confermati (#222222 scuro, #f2f3f5 chiaro, accento #ef8231 con testo #222222) invece del grigio metallico chiaro dell'originale, perché design.md non approva integralmente i colori delle reference. Il materiale è guidato da token CSS: sostituirli cambia il risultato senza toccare i componenti.

**Esclusioni:** altre card, logica di SensorCard, comandi e API Home Assistant, dipendenze, `getCardStyle` globale, originali UI, backend.

**Modifiche preesistenti:** `neumorphism.css` conteneva 160 righe non committate e non documentate (prima bozza del pulsante a pressione su `.aca-control`). Sono la base di questo lavoro e vengono rielaborate in questo incarico; non esiste una versione precedente da ripristinare se non tramite `git diff` del file all'avvio (copia in backup/ escluso da Git).

## Criteri di completamento

- Barra, card di stato e benvenuto mostrano il materiale a pressione nel tema scuro e nel chiaro, con riposo/hover/click/selezione/focus/disabilitato distinguibili.
- Hover: ombra esterna che si annulla, faccia ristretta dal `clip-path`, ombre interne più profonde, contenuto a 0,975. Click: faccia a 0,975.
- Icone circolari perfettamente tonde; pillola e pulsanti d'azione mantengono la propria forma.
- Primitive senza conoscenza di HA; nessuna nuova dipendenza; movimento ridotto rispettato; stato selezionato stabile e leggibile oltre al colore.
- Typecheck, lint, test e build superati; verifica visiva desktop/mobile nei due temi; dialoghi già migrati (REP-009) senza regressioni.
- Report, stato, verifiche e documentazione di design aggiornati.

## Avanzamento e modifiche

Bozza preesistente salvata prima delle modifiche in backup/pressure-material-20261005 (neumorphism.pre-task.css, SHA-256 b7b4a26a…9a07; neumorphism.pre-task.diff). È stata rielaborata, non scartata: ne restano i token per tema e l'idea della faccia in `::before`.

Implementato:

- **Materiale** in [neumorphism.css](../../progetto/tunet/src/styles/neumorphism.css): token per socket, guscio, faccia e ombre interne (valori espliciti per scuro e chiaro, derivati da `--bg-secondary` per i temi legacy) e una regola comune di faccia per `.aca-control`, `.aca-card` e il nucleo dell'emblema. Hover, click, selezione, disabilitazione, focus e movimento ridotto come descritto in [design.md](../design/design.md#materiale-a-pressione-implementato).
- **Correzioni rispetto alla bozza.**
  - Tolti `display: inline-flex` e `border-radius: 100em` globali: battevano le utility Tailwind dei chiamanti (layer). Per esempio avrebbero reso a pillola tasselli e scelte con raggi propri.
  - Tolti `will-change` e `translateY` del pulsante; la pressione agisce solo sulla faccia, come nell'originale.
  - Elenchi di ombre allineati nel numero di strati, perché le transizioni interpolino.
  - Il pulsante primario ora usa la faccia arancione invece di nasconderla.
  - Gli override di gestione (`background`, `box-shadow` inset) che coprivano il nuovo materiale sono stati rimossi; restano colori e testo.
- **Primitiva Card** ([Card.tsx](../../progetto/tunet/src/primitives/components/Card.tsx)): div con `material` aca/none, nessuna conoscenza HA. [SensorCard](../../progetto/tunet/src/components/cards/SensorCard.jsx) la usa nelle due radici, con `material="none"` in modifica. Il CSS della card sostituisce con `!important` sfondo, bordo, ombra e sfocatura inline di `getCardStyle` solo quando non è scelto un altro materiale delle card.
- **Benvenuto:** etichette dei due pulsanti avvolte in Text, così il contenuto può scalare come lo `span` dell'originale. Emblema: socket e faccia statica.
- **Test:** [PressureMaterial.test.jsx](../../progetto/tunet/src/__tests__/PressureMaterial.test.jsx) (10 casi) e due casi in SensorCard.test.jsx.
- **Banco:** Compose punta a `aca-tunet:1.22.1-aca-press-neu1`. L'immagine precedente `aca-tunet:1.22.1-aca-panels-neu1` è conservata per il ripristino.
- **Documentazione:** design, catalogo componenti (adattamenti), primitive, architettura, verifiche, conformità C-10, stato, indice report.

**Scelte esecutive.**

- Colori delle facce derivati dai temi e non dal grigio metallico dell'originale.
- Anello ottenuto restringendo `inset` del `::before` invece di `clip-path`, perché i raggi variano per elemento e arrivano da utility.
- Scala 0,985 per la faccia della card invece di 0,975, per non far rientrare troppo un'area grande.
- Socket chiaro #c3cad4 dopo l'osservazione nel browser (#bcc3cd risultava pesante sull'emblema).

Sono tutte reversibili tramite token.

**Fuori incarico, registrato e non applicato:** [ISSUE-022](../project-status.md#issue-022), contrasto delle etichette secondarie delle card con opacità 0,6.

## Verifiche ed evidenze

Evidenze locali in backup/pressure-material-20261005, escluse da Git: log di typecheck, lint, colori, suite e build, e screenshot di anteprima e del banco. Nessun dato di autenticazione acquisito.

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Tipi | `npm run typecheck` (JS + strict HOME), host Node 24.14 | Superato | typecheck.log. Card.tsx ricade nella porzione strict (primitives/**). |
| Lint e colori | `npm run lint`; `npm run lint:theme-colors` | Superato | Nessun errore o warning; colori: 43 file, SensorCard incluso. Prettier sui file toccati: conforme. Il warning di prettier su primitives/README.md esisteva già. |
| Test mirati | `npx vitest run` su PressureMaterial, SensorCard, HomeMigration, ManagementMigration, PageNavigation, HeaderSidebar | Superato | 10 casi nuovi più 2 SensorCard. Prima prova fallita: Vitest restituisce stringa vuota per `?raw` dei CSS; il CSS è ora letto con fs. |
| Mutazione | Un elenco `--aca-shell-hover` ridotto a 4 strati in una copia temporanea | Fallito come previsto | Il test degli strati segnala la discrepanza; file ripristinato e confrontato byte per byte con `cmp`. |
| Suite completa | `npx vitest run`, host | Superato | 95 file / 752 test (prima: 94 / 740), tests-full.log. Eseguita sull'host, non nel builder isolato senza rete dei report precedenti. |
| Build e budget | `docker compose -f progetto/compose.tunet.yaml build tunet` (Dockerfile upstream, Node 26, include `typecheck:home`); check-bundle-size sul dist estratto dall'immagine | Superato | docker-build.log; tutti i chunk nei limiti. Immagine `aca-tunet:1.22.1-aca-press-neu1`. |
| Banco locale | `up -d --no-build tunet`; health; root e asset iniziali | Superato | Container healthy, `/api/health` ok 1.22.1, root e 26 asset iniziali HTTP 200, volume aca-tunet_tunet-data → /app/data. HA non ricreato. Nel browser: CSS del materiale caricato, guscio a 5 strati e faccia a 7 (banco-home-scuro.jpg). |
| Browser, anteprima Vite su 127.0.0.1:5173 | Tema scuro e chiaro (variabili del tema applicate via script come fa l'app), desktop 1024 e 390 px | Superato, perimetro limitato | Pillola selezionata con anello e bagliore; Modifica/Impostazioni circolari; emblema; pulsanti d'azione e hover del secondario; finestre Aggiungi scheda e Modifica pagina (scelte, switch, Fine) senza regressioni visibili; mobile senza overflow orizzontale. |
| Card di stato | Replica del markup e degli stili inline di SensorCard/`getCardStyle` nella pagina | Superato, perimetro limitato | Riposo e hover nei due temi. Il browser di verifica non aveva una sessione Home Assistant: la card reale con entità non è stata osservata. La presenza della classe è coperta dai test. |
| Contrasto | Coppie sRGB opache calcolate | Superato, perimetro limitato | Testo #222222 sul volto arancione: 4,85–7,88. Scuro: testo principale 13,0–15,8, secondario 5,5–6,4, inchiostro selezionato 5,3–6,5. Chiaro: 11,1–14,6, 6,1–7,6, 5,1–6,8. Non è una conformità WCAG complessiva. |
| Stato `:active`, movimento ridotto del sistema, tablet fisico, dispositivi | — | Non eseguito | `:active` coperto dal test sul CSS; preferenza OS non emulata; nessun comando fisico. |

## Controllo del diff e decisioni

Il diff riguarda presentazione, una primitiva senza logica HA, l'uso della primitiva nelle radici di SensorCard (nessun cambiamento di comportamento, callback o dati), due etichette avvolte in Text, test, Compose e documentazione. Nessuna dipendenza, nessun cambio di stack, nessun backend, nessuna configurazione HA, nessun originale UI o archivio modificati.

Il materiale `.aca-control` è condiviso. Cambiano quindi aspetto anche gli altri controlli che usano Button control/primary/secondary: scelte e switch delle finestre di gestione, chiusura delle modali, selettore icone. È la conseguenza voluta di applicare lo stile tramite primitive (ADR-0004). Le finestre principali sono state osservate. Nessun ADR nuovo: le scelte sono esecutive nel perimetro.

La richiesta non autorizza commit: le modifiche restano nel working tree. L'aggiornamento del banco locale segue la prassi degli incarichi 008–010 ed è reversibile riportando Compose a `aca-tunet:1.22.1-aca-panels-neu1`.

## Chiusura e punto di ripresa

Incarico completato sul banco locale; nessuna attività resta aperta in questo perimetro. Restano, senza autorizzazione automatica:

- verifica della card con un'entità reale nel browser dell'utente;
- applicazione della primitiva Card alle altre card;
- ISSUE-022;
- eventuale passaggio a facce grigio-metalliche chiare come nell'originale (solo token);
- commit, se richiesto.
