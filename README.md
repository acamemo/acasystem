# ACA SYSTEM 2.0

**Banco PC .70, 2026-11-13:** tutti i widget aggiornati, account e profili conservati. [Apri ACA](http://127.0.0.1:3002/), Ctrl+F5. [Esiti e rollback](documentazione/reports/REP-20261113-001-aggiornamento-banco-widget.md).


Sistema locale basato su Home Assistant, con Tunet come punto di partenza React. La direzione corrente è un mini PC con HA/ACA e client Windows, Android o browser collegati tramite IP/QR; registrazione e accesso sono nella webapp. Sorgenti, design comune e strumenti di distribuzione sono presenti; lo [stato effettivo](documentazione/project-status.md) distingue build locali, release pubbliche e collaudi fisici ancora aperti.

Build locale più recente: [ACA0.9.64 — Area Robot](http://127.0.0.1:4194/?screen=app#/mockup), con dati simulati e [report/verifiche](documentazione/reports/REP-20261111-002-area-robot-aspirapolvere-tagliaerba.md). ZIP e istruzioni in backup/rep076; banco e account reali invariati.

## Organizzazione della cartella

| Cartella | Contenuto |
|---|---|
| [documentazione/](documentazione/README.md) | Due moduli: [funzionalità](documentazione/funzionalita/README.md) con product.md e pilota, [design](documentazione/design/README.md) con design.md. Stato, documenti tecnici, verifiche e storico comuni. |
| [backup/](backup/README.md) | Checkpoint ed evidenze locali, esclusi da Git salvo la guida. Non equivalgono a un backup collaudato dei dati del cliente. |
| [progetto/](progetto/README.md) | Applicazione/server, client e strumenti HAOS; due radici npm distinte, nessun npm install dalla radice Git. |

`README.md` e [AGENTS.md](AGENTS.md) restano nella radice, insieme alla configurazione e allo storico Git. Aprire il repository da questa cartella per avere insieme documentazione e codice. Risorse comuni: [UI e movimento](progetto/acasystem/ui/README.md), [design CSS](progetto/acasystem/design/README.md), [shell e packaging](progetto/client/shared/README.md).

## Percorso di lettura

1. Leggere [le regole per gli agenti](AGENTS.md).
2. Controllare [stato effettivo e incarico attivo](documentazione/project-status.md#incarichi-e-punto-di-ripresa).
3. Consultare [product.md](documentazione/funzionalita/product.md) per i comportamenti e [design.md](documentazione/design/design.md) per la presentazione, seguendo l'[indice documentale](documentazione/README.md).
4. Ricostruire autorizzazioni e risultati da [decisioni](documentazione/decisions/README.md), [report](documentazione/reports/README.md) e diff Git.

La richiesta umana determina il lavoro autorizzato. Le proposte del PRD e il backlog non assegnano automaticamente nuovi incarichi. Il cambio di agente o modello mantiene le decisioni approvate e il perimetro corrente.

## Storico

La separazione delle cartelle è descritta in [ADR-0002](documentazione/decisions/ADR-0002-organizzazione-cartelle.md) e verificata in [REP-20261002-003](documentazione/reports/REP-20261002-003-organizzazione-cartelle.md). I due commit iniziali sono conservati. Per integrità dell'originale e comandi di consultazione vedere l'[indice documentale](documentazione/README.md#fonti-e-storico).

Git è locale, senza remote o CI configurati. Backup automatici e prove di ripristino richiedono un incarico successivo.
