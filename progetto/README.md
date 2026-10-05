# Banco prova locale ACA SYSTEM

Tunet 1.22.1 è installato in Docker, da upstream [oyvhov/Tunet](https://github.com/oyvhov/Tunet), revisione `5dec99587b4fcc2fb1f831a0a0002c9b90e6958e`. La baseline di 407 file è conservata nel commit 14ff7f4 e nello ZIP di acquisizione; [tunet-origin.json](tunet-origin.json) registra gli hash della baseline. La cartella corrente include la prima migrazione ACA di HOME a TypeScript, primitive e italiano, documentata in [REP-20261005-006](../documentazione/reports/REP-20261005-006-migrazione-home-typescript.md). Il manifest originale non descrive gli hash del codice modificato. La [licenza GPL-3.0 originale](tunet/LICENSE) è inclusa. Le condizioni della futura distribuzione ACA restano da valutare.

## Avvio e controllo

Da PowerShell nella radice del repository, con Docker Desktop attivo:

```powershell
docker compose -f progetto/compose.tunet.yaml up -d --build
docker compose -f progetto/compose.tunet.yaml ps
Invoke-RestMethod http://localhost:3002/api/health
```

Questa procedura è stata eseguita il 2026-10-05. La build usa il Dockerfile upstream e npm ci con il lockfile corrente; il controllo strict HOME precede Vite. La baseline e le nuove dipendenze sono distinte nel report di migrazione. La base `node:26-alpine` resta un tag mobile upstream: il digest usato e la versione effettiva sono registrati nel [report](../documentazione/reports/REP-20261005-004-installazione-tunet.md), non è garantita identità binaria di una futura rebuild. Le modifiche ai sorgenti richiedono una nuova build per apparire nel container; il server Vite con ricaricamento automatico non è stato avviato.

Aprire [Tunet](http://localhost:3002), scegliere OAuth2 e inserire `http://localhost:8123` come URL HA. Eseguire personalmente il login nel proprio Home Assistant. Non occorre creare un account Tunet o incollare un token nei file. Il backend usa `http://host.docker.internal:8123`, perché localhost dentro il container indica il container stesso. Login completato dall'utente il 2026-10-05: Tunet mostra CONNECTED / Authenticated via OAuth2; pannello profili con auto-sync e ultima sincronizzazione. Letture/comandi sui dispositivi e salvataggio/caricamento manuale profili restano da collaudare.

## Dati e confini

- Tunet: frontend/backend su `127.0.0.1:3002`, volume Docker `aca-tunet_tunet-data` montato in `/app/data` per SQLite/profili. Cifratura a riposo lasciata al valore upstream `off`; nessuna garanzia di cifratura applicativa.
- Browser: layout/preferenze e cache di sessione HA secondo Tunet; non sono parte del repository. Riferimenti in `tunet/docs/SETUP.md` e `tunet/src/services/oauthStorage.js`.
- HA preesistente: container `homeassistant`, versione 2026.9.4, `C:\homeassistant\config` montato in `/config`. La pubblicazione esistente della porta 8123 su tutte le interfacce non è stata modificata.
- Archivio di acquisizione: ZIP e copia estratta in `backup/tunet-acquisizione-20261005/`, esclusi da Git; sono una copia dei sorgenti, non un backup dei dati HA/Tunet.

La UI upstream carica font da Google Fonts e contempla altre risorse esterne. Il funzionamento completo offline e i flussi delle integrazioni non sono collaudati. Versioni, dipendenze e stato reale sono in [infrastructure.md](../documentazione/infrastructure.md), [compliance.md](../documentazione/compliance.md) e [project-status.md](../documentazione/project-status.md).

## Arresto e ripresa

```powershell
docker compose -f progetto/compose.tunet.yaml stop
docker compose -f progetto/compose.tunet.yaml start
```

Sono comandi di gestione previsti, non una prova eseguita di recupero dopo arresto. Il volume è persistente; backup e ripristino dati richiedono un incarico dedicato. Evitare la rimozione dei volumi che contengono dati da conservare.

## Perimetro

La prima porzione HOME è migrata a TSX con primitive condivise, italiano e mx-icons; ora usa il primo materiale Neumorphism chiaro/scuro con pressione, focus e selezione stabile, descritto in [REP-20261005-008](../documentazione/reports/REP-20261005-008-home-neumorphism.md). [REP-20261005-009](../documentazione/reports/REP-20261005-009-gestione-schede-pagine.md) aggiunge finestre di gestione schede/pagine e selettore icone TSX/italiano. Immagine locale aca-tunet:1.22.1-aca-management-neu1; il resto del codice rimane prevalentemente JS. Card, dimmer con riscontro fisico e ruoli ACA restano da realizzare. Seguire [AGENTS.md](../AGENTS.md), il [pilota](../documentazione/funzionalita/pilot-scope.md) e il report corrente prima delle modifiche. I workflow upstream sotto `tunet/.github/` sono sorgenti importati, non CI attiva di questo repository. Git resta locale, senza remote.
