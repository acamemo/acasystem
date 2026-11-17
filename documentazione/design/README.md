# Modulo design

Ultimo lotto: [Agenda](componenti/agenda.md), [Stanze](componenti/stanze.md) e [Gateway Zigbee](componenti/gateway-zigbee.md), [REP002](../reports/REP-20261112-002-widget-rimanenti.md). Stesso ACA Vetro Bianco, controlli e transizioni comuni; installazione e collaudo fisico separati.

Fonte principale: [design.md](design.md). La direzione corrente è [ACA Liquid Glass](../decisions/ADR-0042-tema-liquid-glass.md), richiesto dall’utente come nuovo default condiviso: superfici in vetro satinato e controlli/navigazione con trattamento ottico CSS. Implementazione/build e QA locali concluse in [REP008](../reports/REP-20261104-008-tema-liquid-glass.md), con limiti hardware e debito preesistente distinti. ACA Classico, materiali e decisioni precedenti restano conservati; nessun selettore globale assegnato.

Il [catalogo delle reference](componenti/README.md) distingue originali testuali e immagini, provenienza, ruolo e adattamenti autorizzati. La nuova UI-015 guida il materiale Liquid Glass senza essere importata nell’app; gli originali restano invariati. Viola ACA, Inter locale e colori funzionali sono conservati, con fallback e vincoli Casa3D/ingranaggio descritti nella direzione corrente.

Questo modulo descrive la presentazione e l'interazione delle funzioni autorizzate. Requisiti, ruoli, permessi e comportamento sono nel [modulo funzionalità](../funzionalita/README.md). Un elemento grafico non assegna lo sviluppo di una nuova funzione.

Percorso di lettura: [AGENTS.md](../../AGENTS.md) → [stato e incarico](../project-status.md#incarichi-e-punto-di-ripresa) → [design.md](design.md) → [pilota](../funzionalita/pilot-scope.md) e requisiti pertinenti. Stato, verifiche, ADR e report sono comuni ai moduli e raggiungibili dall'[indice generale](../README.md).

**Proposte (cartella [proposte/](proposte/), creata il 2026-10-23).** Contiene mockup statici marcati PROPOSTA: non sono direzione approvata né autorizzano funzioni o sviluppo. [pannello-widget-comune.html](proposte/pannello-widget-comune.html) mostra la cornice comune e i blocchi di capacità dei pannelli dei widget (luce dimmerabile, TV LG, tapparella, più una variante delle azioni come oggi) con i colori del Kit 2 e righe piatte dentro il pannello (scelta di stile da confermare rispetto al rilievo del Kit 2). Lo studio è in [REP-20261023-002](../reports/REP-20261023-002-studio-pannelli-widget.md), la bozza in [ADR-0020](../decisions/ADR-0020-pannelli-per-capacita.md) «Proposta», le domande D-1…D-17 sono aperte.

Le specifiche di schermate e componenti appartengono a questa cartella quando richieste. Le fonti applicative condivise sono in [design/](../../progetto/acasystem/design/README.md) e [ui/](../../progetto/acasystem/ui/README.md); stato e collaudi restano nei report. Le sequenze storiche di raccolta e preparazione HA non assegnano nuovi interventi o comportamenti.

Area Sensori assegnata il 2026-11-11 e in corso: [brief](componenti/sensori.md), [REP004](../reports/REP-20261111-004-area-sensori.md). Letture del dispositivo e helper distinti, sulla stessa identità ACA Vetro Bianco; avanzamento e verifiche nel report.

Area Energia e consumi assegnata il 2026-11-11 e in corso: [brief](componenti/energia-consumi.md), [REP005](../reports/REP-20261111-005-energia-consumi.md). Fonti manuali e prezzi originali, sulla stessa identità ACA Vetro Bianco; nessuna nuova famiglia fisica o tema.

Area Auto completata e verificata localmente nella .68 il 2026-11-11: [brief](componenti/auto.md), [REP006](../reports/REP-20261111-006-area-auto.md). Fonti manuali e comandi effettivi, stessa identità ACA Vetro Bianco; copertura parziale senza risolutore universale, nessuna nuova famiglia fisica o migrazione di profili. Banco, hardware e pubblicazione distinti.
