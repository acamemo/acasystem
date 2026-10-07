# Registro degli incarichi e report

Aggiornato: 2026-10-06. Stato corrente degli incarichi in [project-status.md](../project-status.md#incarichi-e-punto-di-ripresa).

| ID | Titolo | Funzione del report |
|---|---|---|
| [REP-20261002-001](REP-20261002-001-audit-product.md) | Audit del PRD originale | Lettura precedente, fatti verificati, valutazioni e decisioni aperte. |
| [REP-20261002-002](REP-20261002-002-documentazione.md) | Documentazione e storico Git locale | Incarico umano approvato, modifiche, controlli e punto di ripresa. |
| [REP-20261002-003](REP-20261002-003-organizzazione-cartelle.md) | Separazione di documentazione, backup e progetto | Riorganizzazione autorizzata, integrità dell'archivio e aggiornamento dei percorsi. |
| [REP-20261005-001](REP-20261005-001-direzione-pilota.md) | Direzione di prodotto e primo pilota in ufficio | Risposte umane, perimetro della fase 1, decisioni e verifiche documentali. |
| [REP-20261005-002](REP-20261005-002-moduli-documentali-design.md) | Moduli funzionalità e design | Separazione documentale, specifica dello stile e controlli dei nuovi percorsi. |
| [REP-20261005-003](REP-20261005-003-raccolta-componenti-microinterazioni.md) | Raccolta componenti e microinterazioni | Sette originali, catalogo, temi e interazioni confermati; conservazione e verifiche documentali. |
| [REP-20261005-004](REP-20261005-004-installazione-tunet.md) | Installazione locale Tunet | Acquisizione sorgenti, avvio Docker, integrazione con HA e limiti del banco prova. |
| [REP-20261005-005](REP-20261005-005-audit-struttura-tunet.md) | Audit della struttura Tunet | Responsabilità e flussi, confronto con le primitive richieste e risultati dei controlli upstream. |
| [REP-20261005-006](REP-20261005-006-migrazione-home-typescript.md) | Prima migrazione HOME a TypeScript | Primitive, contratti rigorosi, lingua italiana, mx-icons e regressioni della schermata. |
| [REP-20261005-007](REP-20261005-007-conversione-neumorphism.md) | Conversione dell'applicativo a Neumorphism | Fonte Antigravity conservata; esecuzione interrotta dall'utente. Ripresa circoscritta alla HOME in REP-008; card e conversione integrale non completate. |
| [REP-20261005-008](REP-20261005-008-home-neumorphism.md) | Ripresa del design HOME | Materiale Neumorphism nei due temi, controlli condivisi, regressioni e passaggio da Antigravity. |
| [REP-20261005-009](REP-20261005-009-gestione-schede-pagine.md) | Gestione schede e pagine | Primo gruppo dopo HOME: finestre TS/italiano, primitive Input/Choice/Switch/Modal, icone compatibili e verifiche. |
| [REP-20261005-010](REP-20261005-010-pannelli-skeleton.md) | Pannelli e skeleton | Transizioni con uscita, movimento ridotto e caricamenti dinamici. |
| [REP-20261005-011](REP-20261005-011-materiale-pressione.md) | Materiale a pressione (UI-003) | Socket, guscio e faccia su barra superiore, card di stato ed emblema; primitiva Card e test di contratto. |
| [REP-20261005-012](REP-20261005-012-sistema-metallo.md) | Sistema «Metallo» a strati | Token, materiale, primitive del kit e pagina di prova; fase 3 confluita in REP-20261006-001. |
| [REP-20261006-001](REP-20261006-001-acasystem-os.md) | Rifacimento del frontend come «OS» Metallo | Struttura frontend/backend, TypeScript, kit bilanciato, launcher a widget, subagenti e revisione finale. |
| [REP-20261006-002](REP-20261006-002-ripresa-revisione.md) | Ripresa della revisione OS | 35 rilievi corretti o registrati, verifiche avversarie e banco `aca-system:0.1` aggiornato su autorizzazione; sessione HA reale e documentazione operativa verificate alla ripresa del 2026-10-07. |
| [REP-20261007-001](REP-20261007-001-launcher-polish.md) | Polish e layout del launcher | «Principale» come schermata di base con celle «+», controllo del kit Metallo sulle schermate reali, polish e layout delle superfici del launcher. |
| [REP-20261007-007](REP-20261007-007-kit2.md) | Kit 2 | Soft UI sul modello delle reference neumorphism, per confronto, in `#/ui-kit`. |
| [REP-20261007-006](REP-20261007-006-kit-componibile.md) | Kit componibile | Famiglie di classi (ADR-0010), componenti dei prototipi nel kit, galleria; sospeso. |
| [REP-20261007-005](REP-20261007-005-colori-derivati.md) | Colori derivati | Scale da una base OKLCH, neutri sul bianco puro, pozzetti più leggeri. |
| [REP-20261007-004](REP-20261007-004-prototipi-ui-kit.md) | Prototipi «UI kit» | Pagina `#/ui-kit` con Principale e Temperatura in metallo e la galleria del kit. |
| [REP-20261007-003](REP-20261007-003-animazioni-principale.md) | Animazioni della Principale | Revisione emil-design-eng: tempi del kit (pressione 120 ms, rilascio 220 ms), hover senza incasso, wiggle ridotto, tastiera senza animazione. |
| [REP-20261007-002](REP-20261007-002-ha-dietro-acasystem.md) | Home Assistant dietro Acasystem | Proxy HTTP/WebSocket nel backend, accesso proprietario con l'API di login di HA, nessun indirizzo chiesto nel browser (ADR-0009). |

## Regole

Usare il [modello](../templates/report.md) per un nuovo intervento significativo. Gli ID hanno data ISO compatta e numero progressivo di tre cifre nella data, mai riutilizzato. Un report nuovo apre un incarico soltanto se riproduce una richiesta umana: un'idea di un agente non è un incarico.

Compilare perimetro e criteri all'avvio; aggiornare durante il lavoro; chiudere dopo verifica e revisione. Le correzioni minime richiedono un resoconto proporzionato e non un report artificiosamente esteso.

Per riprendere un lavoro consultare stato corrente, report relativo, richiesta ed eventuali decisioni intervenute; confrontare le affermazioni con il diff reale. Gli altri report sono storico, non istruzioni di esecuzione. Il modello esatto va indicato solo se disponibile.

Un report chiuso conserva risultati e limiti alla data della chiusura. Eventuali rettifiche sono annotate con data e nuova evidenza. Git identifica il commit che ha aggiunto o modificato il report; non inserire un hash futuro nel file stesso.
