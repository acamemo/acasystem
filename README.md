# ACA SYSTEM 2.0

Sistema locale basato su Home Assistant, con Tunet come punto di partenza React. Il [pilota in ufficio](documentazione/funzionalita/pilot-scope.md) ha come fase 1 minima la personalizzazione grafica. Hetzner è escluso dalla direzione corrente. Il lavoro realizzato comprende documentazione e Git locale; applicazione e installazioni devono ancora essere realizzate.

## Organizzazione della cartella

| Cartella | Contenuto |
|---|---|
| [documentazione/](documentazione/README.md) | Due moduli: [funzionalità](documentazione/funzionalita/README.md) con product.md e pilota, [design](documentazione/design/README.md) con design.md. Stato, documenti tecnici, verifiche e storico comuni. |
| [backup/](backup/README.md) | Area predisposta per copie locali. Il README è versionato; i backup sono esclusi da Git. Nessuna copia di backup è stata creata. |
| [progetto/](progetto/README.md) | Area per futuro codice, test e configurazioni del progetto. Contiene attualmente soltanto un README. |

`README.md` e [AGENTS.md](AGENTS.md) restano nella radice, insieme alla configurazione e allo storico Git. Aprire il repository da questa cartella per avere insieme documentazione e futuro codice.

## Percorso di lettura

1. Leggere [le regole per gli agenti](AGENTS.md).
2. Controllare [stato effettivo e incarico attivo](documentazione/project-status.md#incarichi-e-punto-di-ripresa).
3. Consultare [product.md](documentazione/funzionalita/product.md) per i comportamenti e [design.md](documentazione/design/design.md) per la presentazione, seguendo l'[indice documentale](documentazione/README.md).
4. Ricostruire autorizzazioni e risultati da [decisioni](documentazione/decisions/README.md), [report](documentazione/reports/README.md) e diff Git.

La richiesta umana determina il lavoro autorizzato. Le proposte del PRD e il backlog non assegnano automaticamente nuovi incarichi. Il cambio di agente o modello mantiene le decisioni approvate e il perimetro corrente.

## Storico

La separazione delle cartelle è descritta in [ADR-0002](documentazione/decisions/ADR-0002-organizzazione-cartelle.md) e verificata in [REP-20261002-003](documentazione/reports/REP-20261002-003-organizzazione-cartelle.md). I due commit iniziali sono conservati. Per integrità dell'originale e comandi di consultazione vedere l'[indice documentale](documentazione/README.md#fonti-e-storico).

Git è locale, senza remote o CI configurati. Backup automatici e prove di ripristino richiedono un incarico successivo.
