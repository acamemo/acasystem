# ADR-0006 — Sistema «Metallo» a strati da UI-003

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0006 — Sistema «Metallo» a strati da UI-003 |
| Stato | Accettata |
| Data e autore | 2026-10-05; scheda redatta da Claude Code (Opus 5.5) |
| Decisore e autorizzazione | Utente committente, chat del 2026-10-05: «Voglio costruire la user interface su quel design lì, le stesse interazioni del pulsante che ti ho condiviso + eventuali variazioni racchiudendo div dentro div»; «fai tabula rasa e usiamo gli stessi colori e font principali usati nel pulsante, mi piace di più se viene chiaro / metallico, come nella reference». Risposte alle domande del piano: «Solo chiaro metallico»; accento «andremo a definirli in futuro, ma parti con nessun accento»; font «Pacchetto @fontsource/inter»; ambito «Kit + pagina prova + schermate già migrate». Piano approvato dall'utente. |
| Collegamenti | REQ-03, ISSUE-012, ISSUE-014, ISSUE-016, ISSUE-017, C-10; [ADR-0004](ADR-0004-principi-frontend.md), [ADR-0005](ADR-0005-typescript-italiano-icone.md); [REP-20261005-011](../reports/REP-20261005-011-materiale-pressione.md), [REP-20261005-012](../reports/REP-20261005-012-sistema-metallo.md); reference [UI-003](../design/componenti/originali/UI-003-pulsante-pressione.jsx.txt) e immagine neumorphism fornita in chat |
| Sostituisce / sostituita da | Sostituisce le scelte di colore e tema in [design.md](../design/design.md) (temi chiaro/scuro, #222222 riferimento scuro, accento #ef8231 e base chiara #f2f3f5) e il materiale di REP-20261005-011. Nessuna sostituta. |

## Contesto ed evidenze

Fino a REP-20261005-011 la UI usava due temi neumorfici con accento arancione e un primo adattamento di UI-003 colorato con i temi. L'utente chiede ora di costruire l'intera interfaccia sul pulsante UI-003: stessa struttura a strati, stesse interazioni e stessi colori e font, in versione chiara e metallica. Lo stesso linguaggio va esteso a contenitori annidati per ottenere gli elementi della reference neumorphism (toggle, dropdown, card, icone, segmentato, ricerca, slider, anello). Provenienza e licenza di UI-003 restano sconosciute (C-10).

Fonte esterna: `@fontsource/inter` 5.3.0, licenza OFL-1.1, repository fontsource/font-files, consultato con `npm view` il 2026-10-05 (ultima modifica di registro 2026-07-19).

## Decisione umana

- **Materiale:** ogni controllo e contenitore ACA usa i livelli di UI-003: socket, guscio, faccia e contenuto, con le relative interazioni (guscio che si annulla, `clip-path` che si restringe, scala 0,975). Varianti ottenute annidando elementi.
- **Colori e font:** quelli del pulsante, cioè facce metalliche chiare 230→180, socket scuro, testo inciso scuro e Inter.
- **Tema:** un solo tema chiaro metallico. Temi chiaro/scuro precedenti, riferimento #222222 e accento #ef8231 escono dal sistema corrente.
- **Accento:** nessuno per ora; sarà definito in futuro. Gli stati si comunicano con profondità, posizione e testo.
- **Font:** Inter tramite il pacchetto npm `@fontsource/inter`, servito localmente.
- **Primo incarico:** kit, pagina di prova solo in sviluppo e schermate già migrate.

## Alternative e motivazioni

L'agente ha proposto, e l'utente ha valutato:

| Tema | Alternativa scartata | Scelta |
|---|---|---|
| Temi | Mantenere anche una variante scura | Un solo tema |
| Accento | Arancione #ef8231 oppure gli accenti della reference | Nessun accento per ora |
| Inter | File locali in `public/` oppure Google Fonts | Pacchetto npm |
| Ambito | Kit con pagina di prova soltanto, oppure kit applicato direttamente | Kit, pagina di prova e schermate migrate |

## Conseguenze

- **Codice:** nuovi token e CSS del materiale; primitive a strati (Material, Surface, Toggle, Segmented, Field, Slider, ProgressRing, Badge, SelectTrigger, Grid) e nuovo DOM di Button e Card; tema `metal` predefinito e unico selezionabile.
- **Dipendenza:** nuova, `@fontsource/inter`, versione esatta. Inter non arriva più da Google Fonts; gli altri font opzionali restano esterni (ISSUE-016).
- **Schermate legacy:** ricevono le variabili del tema `metal` senza conversione (ISSUE-017).
- **Licenze:** l'intero sistema visivo deriva da una reference di provenienza e licenza sconosciute. Il rischio C-10 cresce e va chiuso prima della distribuzione.
- **Storico:** decisioni e materiale precedenti restano nei documenti, marcati come superati.

## Verifiche e revisione

Esiti in REP-20261005-012: test di contratto e delle primitive, typecheck, lint, suite, build, budget, pagina di prova confrontata con la reference, schermate migrate e banco locale. Revisione dell'ADR quando l'utente definirà l'accento o una variante scura, o se la verifica di licenza di UI-003 impone di cambiare base.
