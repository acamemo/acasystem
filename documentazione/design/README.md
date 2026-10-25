# Modulo design

Fonte principale: [design.md](design.md). Contiene stile Neumorphism, colori confermati, interpretazione proposta, componenti da progettare e controlli visivi previsti.

Il [catalogo dei componenti](componenti/README.md) raccoglie sette originali testuali e ne distingue provenienza, ruolo e osservazioni. Primo switch come riferimento principale, switch Wi-Fi come riferimento aggiuntivo; nessun componente è adattato o integrato. Sono confermati temi chiaro/scuro, accento arancione e microinterazioni prioritarie.

Questo modulo descrive la presentazione e l'interazione delle funzioni autorizzate. Requisiti, ruoli, permessi e comportamento sono nel [modulo funzionalità](../funzionalita/README.md). Un elemento grafico non assegna lo sviluppo di una nuova funzione.

Percorso di lettura: [AGENTS.md](../../AGENTS.md) → [stato e incarico](../project-status.md#incarichi-e-punto-di-ripresa) → [design.md](design.md) → [pilota](../funzionalita/pilot-scope.md) e requisiti pertinenti. Stato, verifiche, ADR e report sono comuni ai moduli e raggiungibili dall'[indice generale](../README.md).

**Proposte (cartella [proposte/](proposte/), creata il 2026-10-23).** Contiene mockup statici marcati PROPOSTA: non sono direzione approvata né autorizzano funzioni o sviluppo. [pannello-widget-comune.html](proposte/pannello-widget-comune.html) mostra la cornice comune e i blocchi di capacità dei pannelli dei widget (luce dimmerabile, TV LG, tapparella, più una variante delle azioni come oggi) con i colori del Kit 2 e righe piatte dentro il pannello (scelta di stile da confermare rispetto al rilievo del Kit 2). Lo studio è in [REP-20261023-002](../reports/REP-20261023-002-studio-pannelli-widget.md), la bozza in [ADR-0020](../decisions/ADR-0020-pannelli-per-capacita.md) «Proposta», le domande D-1…D-17 sono aperte.

Le future specifiche di schermate o componenti appartengono a questa cartella quando richieste. Attualmente esistono documentazione e reference testuali; nessun kit o frontend è implementato. Sequenza richiesta: accumulo, preparazione HA con incarico dedicato, poi lavoro sulla UI.
