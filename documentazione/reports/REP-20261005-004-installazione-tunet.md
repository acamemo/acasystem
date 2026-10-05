# REP-20261005-004 — Installazione locale Tunet

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261005-004 |
| Stato | Completato |
| Data | 2026-10-05, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 251275de5cb78373ea9b590a3d3e42ec2adebffa |
| Richiesta di riferimento | «sono dentro, adesso possiamo iniziare a lavorare installando Tunet?» |
| Autorizzazione | Acquisire e installare Tunet nel banco prova locale esistente; configurare l'avvio necessario e documentare risultati e limiti. |

Durante il lavoro l'utente ha comunicato «ho fatto l'accesso sul browser laterale che hai aperto». L'agente ha verificato la connessione dalla UI; le credenziali sono state inserite personalmente dall'utente e non acquisite dall'agente.

## Obiettivo e perimetro

Installare la base Tunet scelta dall'utente per REQ-03 e ADR-0003. Home Assistant Container è già stato installato dall'utente ed è raggiungibile su localhost:8123; l'utente dichiara di aver concluso il setup. Acquisire una revisione identificabile, conservarne licenza e sorgenti in progetto/, predisporre un avvio locale riproducibile e verificare la pagina e i servizi necessari. Nessuna modifica grafica, fork HA, configurazione di dispositivi fisici, servizio remoto o ampliamento dei ruoli. Credenziali restano esterne a Git e ai report.

Git inizialmente pulito. Configurazione HA esistente da preservare; nessun container preesistente viene ricreato. Le scelte del banco prova non definiscono il deployment del prodotto su Raspberry/mini PC.

## Criteri di completamento

- Sorgenti Tunet e revisione upstream identificati; licenza originale conservata.
- Dipendenze/versioni e procedura locale documentate; dati persistenti e credenziali esclusi da Git.
- Tunet avviato e pagina raggiungibile; percorso di connessione HA verificato fino al punto consentito senza credenziali dell'utente.
- Stato reale, infrastruttura, conformità e verifiche aggiornati distinguendo installazione da collaudo grafico/funzionale.
- Diff confrontato con l'incarico; controlli ed eventuali limiti riportati.

## Avanzamento e modifiche

### Acquisizione

`git ls-remote https://github.com/oyvhov/Tunet.git refs/heads/main` restituisce `5dec99587b4fcc2fb1f831a0a0002c9b90e6958e`, già esaminato nella progettazione. Scaricato ZIP dalla sorgente GitHub codeload di quella revisione, estratto in backup/tunet-acquisizione-20261005 e copiato in progetto/tunet senza modifiche. Nessun repository Git annidato, remote ACA o aggiornamento di dipendenze. Importati anche test/documenti/workflow upstream, come sorgenti; i workflow annidati non attivano CI ACA.

407 file, 5.725.627 byte, confrontati con la copia estratta. ZIP SHA-256 `2dbbd609ef8a6d591ea68ba80f1c970758a879be3fff39c81624bc0e3055809f`; registro completo in [tunet-origin.json](../../progetto/tunet-origin.json). Manifest 1.22.1, React 19.2.8 nel lockfile, licenza GPL-3.0 conservata. Non vengono adottati HAKit o styled-components.

### Installazione e scelte esecutive

[compose.tunet.yaml](../../progetto/compose.tunet.yaml) separato dai sorgenti upstream: frontend statico/Express, porta host 127.0.0.1:3002, volume aca-tunet_tunet-data → /app/data, riavvio unless-stopped. Backend HA su http://host.docker.internal:8123; browser su http://localhost:8123, OAuth2. Cifratura a riposo lasciata off come upstream; non configurati Supervisor ingress, token statici o servizi cloud. [Procedura](../../progetto/README.md) verificata dalla radice.

Build con Dockerfile upstream, npm ci e npm ci --omit=dev. Node runtime 26.10.0, npm 11.19.1. Immagine base osservata node:26-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80; immagine locale aca-tunet:1.22.1-5dec995 ID sha256:4cfde1f6e5e4daefffcfc0b3bb600bbfa5c5e6956b1c847435632e164521d969. Il Dockerfile upstream conserva il tag mobile della base: una futura rebuild può cambiare componenti OS/runtime; il lockfile non rende immutabile l'intera immagine.

HA preesistente, versione 2026.9.4 verificata con importlib.metadata nel container; dati C:\homeassistant\config → /config, porta 8123 su tutte le interfacce come installata dall'utente. Nessun riavvio, modifica di dati/configurazioni HA o comando a dispositivi eseguito dall'agente.

### Collegamento e dati

Nel browser Tunet l'utente completa OAuth. System → Connection mostra CONNECTED e Authenticated via OAuth2; System → Profiles mostra auto-sync abilitato e ultima sincronizzazione, nessun profilo nominato salvato. L'agente non cambia impostazioni di sincronizzazione né estrae cache/token. Il comportamento di sincronizzazione è upstream attivo dopo il login; salvataggio/caricamento manuale e persistenza dopo riavvio non sono collaudati.

Documenti di stato, architettura, infrastruttura, pilota, conformità, verifiche e indici aggiornati. REQ-03 passa a In corso per la preparazione della base; nessun requisito di prodotto è marcato Verificato. ISSUE-016 registra font e risorse esterne come tema futuro; nessun adattamento offline applicato.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale | git status --short; docker ps; docker inspect homeassistant (solo mount) | Superato | Git pulito; HA attivo con porta 8123 e persistenza esterna al repository. Login completato dichiarato dall'utente, non collaudato dall'agente. |
| ENV-01 | Confronto byte/hash dei file copiati; docker compose -f progetto/compose.tunet.yaml config --quiet | Superato | 407 file identici; nessun sorgente upstream corretto/adattato. |
| ENV-02 | docker compose -f progetto/compose.tunet.yaml up -d --build; compose ps; GET /api/health | Superato | Build exit 0, container healthy; health 200, status ok, versione 1.22.1. |
| ENV-03 | GET / e GET dei JS/CSS referenziati; browser localhost:3002 | Superato | Pagina e 22 asset con HTTP 200; dashboard e setup visibili. Prima versione del controllo cercava solo percorsi /assets; corretta per ./assets effettivi, senza cambiare l'app. |
| ENV-04 | WebSocket dal container a host.docker.internal:8123; GET /api/profiles senza credenziali; UI dopo OAuth dell'utente | Superato | Challenge auth_required / HA 2026.9.4, risposta API 401 senza credenziali; UI autenticata e CONNECTED. Non è verifica completa dei ruoli ACA. |
| ENV-05 | docker inspect (solo mount); pannello Profiles | Superato, parziale | Volume /app/data e auto-sync con ultima sincronizzazione; nessuna prova di riavvio o ripristino. |
| ENV-06 | Comandi ai dispositivi, offline, ruoli, grafica ACA; suite unit/e2e upstream | Non eseguito | Non richiesti per l'installazione; nessuna modifica al comportamento upstream. Non dichiarata accettazione della fase 1. |
| DOC-20 | Controllo Node temporaneo: hash sorgenti, confronto git show HEAD dei file protetti, link/ancore, REQ, remote e git diff --check | Superato | 407 sorgenti integri, 19 file protetti invariati (archivio, design e sei report chiusi), 31 Markdown ACA e 247 link locali validi, 18 requisiti conservati e 0 remote. I Markdown upstream sono importati senza correggerne link/stile; il controllo documentale riguarda le fonti ACA. |
| DOC-21 | Confronto byte dei blob staged con i 407 file upstream; whitelist del diff; git check-ignore su ZIP, database, node_modules e .env; diff --cached --check delle fonti ACA | Superato | 422 file pertinenti nel commit, tutti i blob upstream identici; dati/artefatti esclusi. Attributi Git preservano i byte sorgente anche su checkout Windows. Il primo confronto aveva il buffer Node troppo piccolo per un JPEG upstream; ripetuto con 16 MiB, senza modificare il file. |

Build upstream segnala chunk oltre 500 kB e un avviso npm sugli install scripts better-sqlite3. Build/avvio sono riusciti; non sono stati modificati bundle, dipendenze o policy npm. L'audit npm durante la build non sostituisce un audit completo di sicurezza/licenze. Nessuna conformità è attestata.

Schermate del banco prova conservate soltanto in backup/tunet-acquisizione-20261005 (escluso da Git); schermata finale senza identità/account visibili. Le evidenze testuali omettono nome utente, identificativo device e credenziali.

## Controllo del diff e decisioni

Installazione locale autorizzata dalla richiesta corrente; non costituisce approvazione della distribuzione commerciale né della UI ACA. Compose è una scelta esecutiva del banco prova; non viene sostituita ADR-0003 e non viene imposto un metodo all'hardware finale. Sorgenti, lockfile e licenza upstream restano intatti; gli aggiornamenti documentali riguardano soltanto lo stato cambiato e i nuovi limiti osservati. Diff delle fonti ACA controllato senza errori di whitespace; import upstream controllato per integrità anziché riformattato. Dati, segreti, artefatti e acquisizione backup esclusi dallo storico; nessun cambio allo stack o ai campioni UI.

## Chiusura e punto di ripresa

Incarico completato: Tunet installato e OAuth collegato ad HA; nessun incarico resta attivo. Il prossimo incarico potrà delimitare schermate/componenti ACA e verifiche sui dispositivi selezionati. Profili manuali, offline, logout/cliente, backup e distribuzione restano da verificare nei rispettivi incarichi. L'installazione non autorizza il restyling di tutta la UI. Per identificare il commit del presente report usare git log -- documentazione/reports/REP-20261005-004-installazione-tunet.md.

## Fonti

- [Tunet README nella revisione acquisita](https://github.com/oyvhov/Tunet/blob/5dec99587b4fcc2fb1f831a0a0002c9b90e6958e/README.md), consultato il 2026-10-05.
- [Setup upstream](https://github.com/oyvhov/Tunet/blob/5dec99587b4fcc2fb1f831a0a0002c9b90e6958e/docs/SETUP.md), manifest, lockfile, Dockerfile, LICENSE e codice acquisiti nella medesima revisione; fatti tecnici verificati nei file locali il 2026-10-05.
