# Banco prova locale ACA SYSTEM

Tunet 1.22.1 è installato in Docker, da upstream [oyvhov/Tunet](https://github.com/oyvhov/Tunet), revisione `5dec99587b4fcc2fb1f831a0a0002c9b90e6958e`. I 407 file acquisiti in [tunet/](tunet/README.md) sono conservati senza adattamenti; [tunet-origin.json](tunet-origin.json) registra provenienza e SHA-256 dei singoli file. La [licenza GPL-3.0 originale](tunet/LICENSE) è inclusa. Le condizioni della futura distribuzione ACA restano da valutare.

## Avvio e controllo

Da PowerShell nella radice del repository, con Docker Desktop attivo:

```powershell
docker compose -f progetto/compose.tunet.yaml up -d --build
docker compose -f progetto/compose.tunet.yaml ps
Invoke-RestMethod http://localhost:3002/api/health
```

Questa procedura è stata eseguita il 2026-10-05. La build usa il Dockerfile upstream e `npm ci` con il lockfile acquisito. La base `node:26-alpine` resta un tag mobile upstream: il digest usato e la versione effettiva sono registrati nel [report](../documentazione/reports/REP-20261005-004-installazione-tunet.md), non è garantita identità binaria di una futura rebuild. Le modifiche ai sorgenti richiedono una nuova build per apparire nel container; il server Vite con ricaricamento automatico non è stato avviato.

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

È installata la base upstream; personalizzazione ACA, microinterazioni, ruoli e dispositivi fisici non sono realizzati. Seguire [AGENTS.md](../AGENTS.md), il [pilota](../documentazione/funzionalita/pilot-scope.md) e il report corrente prima delle modifiche. I workflow upstream sotto `tunet/.github/` sono sorgenti importati, non CI attiva di questo repository. Git resta locale, senza remote.
