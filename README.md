# ACA SYSTEM 2.0

Piattaforma domotica proposta con automazioni locali, gestione centrale e interfaccia proprietaria. Il lavoro realizzato comprende documentazione e storico Git locale. L'applicazione e i servizi devono ancora essere realizzati.

## Organizzazione della cartella

| Cartella | Contenuto |
|---|---|
| [documentazione/](documentazione/README.md) | PRD evolutivo `product.md`, stato reale, architettura, infrastruttura, conformità, verifiche, decisioni, report e originale conservato. |
| [backup/](backup/README.md) | Area predisposta per copie locali. Il README è versionato; i backup sono esclusi da Git. Nessuna copia di backup è stata creata. |
| [progetto/](progetto/README.md) | Area per futuro codice, test e configurazioni del progetto. Contiene attualmente soltanto un README. |

`README.md` e [AGENTS.md](AGENTS.md) restano nella radice, insieme alla configurazione e allo storico Git. Aprire il repository da questa cartella per avere insieme documentazione e futuro codice.

## Percorso di lettura

1. Leggere [le regole per gli agenti](AGENTS.md).
2. Controllare [stato effettivo e incarico attivo](documentazione/project-status.md#incarichi-e-punto-di-ripresa).
3. Consultare [product.md](documentazione/product.md) e i documenti pertinenti nell'[indice documentale](documentazione/README.md).
4. Ricostruire autorizzazioni e risultati da [decisioni](documentazione/decisions/README.md), [report](documentazione/reports/README.md) e diff Git.

La richiesta umana determina il lavoro autorizzato. Le proposte del PRD e il backlog non assegnano automaticamente nuovi incarichi. Il cambio di agente o modello mantiene le decisioni approvate e il perimetro corrente.

## Storico

La separazione delle cartelle è descritta in [ADR-0002](documentazione/decisions/ADR-0002-organizzazione-cartelle.md) e verificata in [REP-20261002-003](documentazione/reports/REP-20261002-003-organizzazione-cartelle.md). I due commit iniziali sono conservati. Per integrità dell'originale e comandi di consultazione vedere l'[indice documentale](documentazione/README.md#fonti-e-storico).

Git è locale, senza remote o CI configurati. Backup automatici e prove di ripristino richiedono un incarico successivo.
