# REP-20261026-005 — Configurazione automatica del mini PC dall'app client (piano unico)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261026-005: piano unico per configurare un mini PC con HA OS **dall'app client** (Windows/Android): creazione del proprietario con le schermate di Acasystem, installazione di Acasystem come app di HA OS, poi accesso normale. |
| Stato | **Piano scritto, in attesa di risposte** (sezione 7). Nessun codice, nessuna modifica a HA, VM, Dell, tablet o GitHub. |
| Data | 2026-10-26 (Europe/Rome) |
| Autore / modello | Claude Code (Opus 5.5, `claude-opus-5-5`), nella chat dell'app client (REP-20261026-002). |
| Commit di partenza | `4e198c5` più l'albero di lavoro (flussi 0.9.31, D1, app client): da preservare. |
| Autorizzazione | Solo questo documento, la sua riga nell'indice e le annotazioni delle decisioni in REP-20261026-001 e REP-20261026-002. Realizzazione non autorizzata. |
| Collegamenti | [ADR-0023](../decisions/ADR-0023-app-client-a-ibrida.md), [ADR-0022](../decisions/ADR-0022-identita-di-servizio-dispositivi.md), [REP-20261026-001](REP-20261026-001-installazione-github-aggiornamenti-chiavetta.md) (Acasystem come app di HA OS: fatti §2.1-2.5, modifiche §3, tappe G, prove PV), [REP-20261026-002](REP-20261026-002-app-client-pc-android.md) (app client), [REP-20261026-004](REP-20261026-004-account-ha-da-acasystem.md) (account di HA da Acasystem), REQ-05, REQ-06, REQ-15, ISSUE-006. |

## Richiesta e decisioni dell'utente (2026-10-26, testuali)

- Idea: «se il sistemista crea l'account, non si può fare uno script di auto installazione dell'add on che manca direttamente dal tablet o pc che lui sta configurando?»; poi «perché non creare uno script per la configurazione che automatizza tutto lasciando al sistemista la sola briga di creare l'account HA tramite l'UI di Aca?».
- Controllo all'avvio: «un HA non ancora configurato e un acasystem che viene installato la prima volta, ci deve essere un controllo su questo, perché se rileviamo che il mini pc ha già installato l'add on possiamo bypassare».
- Ripresa dopo un'interruzione: «mi sembra corretto».
- **D-G1 (REP-20261026-001): «pubblica»** → opzione (c), pacchetto e immagine pubblici, nessuna chiave.
- **D-C6 (sorgenti GPL-3.0): «va bene»** → i sorgenti vanno resi disponibili (modo: Q-S1).
- **D-G2: «restare»** → opzione (b), si resta sull'account `acamemo`.
- Requisito sugli account (REP-20261026-004): «registrarsi su HA senza mostrare la sua interfaccia […] copiare pari passo tutti gli step che di base HA chiede […] esteticamente l'UI sarà la nostra».
- Pubblicazione: l'utente pubblica dal sito con `acamemo`, così Claude non compare tra gli autori (come per la release `v0.9.30`).

## Risposta breve

L'app client diventa lo strumento d'installazione. Il sistemista apre l'app, scrive l'IP del mini PC e:

- se **Acasystem c'è già**, si va all'accesso, come oggi;
- se **HA non è ancora configurato**, crea il proprietario con le schermate di Acasystem e l'app fa il resto da sola: dati della casa (rilevati, da confermare), installazione di Acasystem dal negozio delle app di HA OS, avvio, attesa, poi accesso;
- se **HA è configurato ma Acasystem manca o è fermo**, serve l'accesso di un amministratore, poi l'app installa o riavvia Acasystem.

Con le decisioni prese (immagine pubblica, account `acamemo`) **sparisce tutta la parte delle chiavi** di REP-20261026-001 (account macchina, PAT per cliente, rotazione: D-G4, G5, PV1-PV4). Restano da fare il pacchetto di Acasystem per HA OS, la sua pubblicazione e la modalità installazione nell'app.

## 1. Fatti su cui si appoggia [F, da REP-20261026-001 e REP-20261026-004, fonti lì]

- `POST /api/onboarding/users` **senza autenticazione** crea il proprietario e restituisce un `auth_code`, da scambiare con `POST /auth/token`. I passi `core_config`, `analytics` e `integration` richiedono il token. Riesce **una volta sola**. `GET /api/onboarding` dice quali passi sono fatti (osservato sul Dell il 2026-10-26: tutti `done: false`).
- Il comando WebSocket di HA `supervisor/api` inoltra **qualsiasi** chiamata al Supervisor per un **amministratore**.
- Installazione di un'app da un repository: `POST /store/repositories` → `POST /store/reload` → `POST /store/addons/<id>/install` → opzioni (`boot: auto`, `watchdog`) → `POST /addons/<id>/start`. L'`<id>` si calcola in anticipo: primi 8 caratteri dello SHA-1 dell'URL del repository in minuscolo, poi `_acasystem`.
- Con `image` in `config.yaml` il Supervisor **scarica** l'immagine con tag uguale a `version`. Va pubblicata prima l'immagine, poi `version`.
- Un pacchetto nuovo su GHCR è privato di serie: va reso **pubblico** dalle impostazioni del pacchetto.
- Sul Dell, HA OS risponde sulla **porta 80** (8123 reindirizza): l'indirizzo di HA va letto, non presunto. Dal punto di vista di un'app di HA OS, Core è `http://homeassistant:<porta>`.
- La cartella `CONFIG` di HA OS non può installare app: l'installazione passa per forza dalle API di HA e del Supervisor, cioè da uno strumento sulla stessa rete. Lo strumento sarà l'app client.

## 2. Flusso del sistemista [P]

| Passo | Chi | Che cosa | API |
|---|---|---|---|
| 1 | sistemista | Apre l'app e scrive l'IP del mini PC | — |
| 2 | app | **Riconosce lo stato** (sezione 3) | `GET :3002/api/health`, `GET /api/onboarding` su 80 e 8123 |
| 3 | **sistemista** | **Crea il proprietario** con le schermate di Acasystem, che replicano HA passo per passo (REP-20261026-004 §7) | `/api/onboarding/users`, `/auth/token` |
| 4 | app, con conferma | Dati della casa rilevati (posizione, fuso, unità, valuta, paese, lingua) in un riepilogo modificabile | `config/core/detect` (WS), `/api/onboarding/core_config` |
| 5 | app | Statistiche: predefinito «no» (Q-S5); integrazioni trovate: nessuna, i dispositivi si aggiungono poi da Acasystem (D1) | `/api/onboarding/analytics`, `/api/onboarding/integration` |
| 6 | app | Aggiunge il repository `acamemo/acasystem-releases`, installa e avvia Acasystem | WS `supervisor/api` → `/store/…`, `/addons/…` |
| 7 | app | Aspetta che Acasystem risponda | `:3002/api/health` |
| 8 | app, con un passo dichiarato | Utente di servizio per i dispositivi (ADR-0022), se scelto in D-G9 | facciata di Acasystem (da definire) |
| 9 | sistemista, facoltativo | Account del cliente | sezione «Utenti» di Acasystem (REP-20261026-004) |
| 10 | app | Fine: il token di amministratore viene dimenticato; si va a «Accedi ad Acasystem» | — |

## 3. Riconoscimento dello stato e salto dei passi [P]

| Stato rilevato all'IP | Comportamento |
|---|---|
| Acasystem risponde su `:3002/api/health` | Flusso normale (accesso). Nessuna installazione. |
| HA risponde, `GET /api/onboarding` con `user` non fatto | Modalità installazione completa (passi 3-10). |
| HA configurato, Acasystem assente | Chiede l'accesso di un **amministratore** di HA (schermate Acasystem), poi passi 6-10. |
| HA configurato, app Acasystem installata ma ferma | Con un amministratore la **riavvia** (`/addons/<id>/start`), senza reinstallarla. |
| Né HA né Acasystem | «Il mini PC non risponde» (come oggi). |

**Ripresa** (confermata dall'utente): ogni passo controlla prima se è già fatto (proprietario esistente, `core_config` fatto, repository presente, app installata, app avviata) e riparte dal primo mancante. Lo stato si ricava sempre dal mini PC, non da memoria locale, così vale anche cambiando dispositivo a metà.

**Sicurezza:**
- la modalità installazione compare solo con HA non configurato oppure dopo l'accesso di un amministratore;
- un cliente non amministratore non vede installazioni né rimozioni;
- il token di amministratore resta in memoria solo per la durata dell'installazione e non si salva sul dispositivo;
- tra l'installazione di HA OS e la creazione del proprietario chiunque sulla rete può crearlo (REP-20261026-001): l'app lo fa subito dopo il primo avvio, e la procedura scritta per il sistemista lo ricorda.

## 4. Due conseguenze tecniche da registrare [V]

1. **Dove sta «Crea il proprietario».** Su un HA appena installato il server Acasystem **non c'è ancora**, quindi la configurazione iniziale non può passare dal proxy `/ha` di Acasystem: va nelle **schermate locali dell'app client**, che parlano direttamente con HA.
   - Le stesse schermate (grafica di Acasystem) possono restare anche nell'interfaccia di Acasystem per i casi in cui il server c'è già.
   - Va riconciliato con REP-20261026-004, dove Q-U13 (proxy o facciata) riguarda il caso con Acasystem già presente.
2. **Collegamento diretto dell'app con HA.** Oggi l'app parla solo con Acasystem. Per i passi 3-6 deve parlare con HA via HTTP (onboarding, token) e WebSocket (`config/core/detect`, `supervisor/api`).
   - Su Windows lo fa il processo principale (niente CORS).
   - Su Android la pagina del guscio è `https://localhost`: il WebSocket `ws://<IP>` sarebbe contenuto misto. Si usa il server locale nativo (già presente) come tramite, oppure un metodo nativo del plugin.

## 5. Modifiche e tappe [P]

| Tappa | Contenuto | Dove si prova | Dipende da |
|---|---|---|---|
| S1 | **Pacchetto di Acasystem per HA OS** (REP-20261026-001 §3, tappa G2): versione nell'immagine; avvio che legge `/data/options.json`, con `DATA_DIR=/data` e indirizzo di HA letto (80 o 8123); `config.yaml` (`image: ghcr.io/acamemo/acasystem`, `arch: [amd64]`, `ports: 3002/tcp: 3002`, `watchdog` su `/api/health`, `backup: cold`, `boot: auto`, `ingress: false`); `repository.yaml`; testi in italiano. Base: `upstream-tunet/hassio-addon` | PC (suite) + VM `acasystem-ha` come app locale | D-G9 |
| S2 | **Prima pubblicazione:** immagine `ghcr.io/acamemo/acasystem:<v>` (login Docker fatto dall'utente, push dell'agente su ordine), pacchetto reso pubblico dall'utente; `repository.yaml` e `acasystem/` caricati dall'utente in `acasystem-releases`; sorgenti secondo Q-S1 | GitHub | S1, Q-S1, Q-S2 |
| S3 | **Installazione manuale dal negozio di HA OS** sulla VM: aggiungi repository, installa, avvia, aggiornamento a una versione nuova | VM (snapshot prima) | S2 |
| S4 | **Nucleo dell'app: modalità installazione.** Macchina a stati della sezione 3, ripresa, client HTTP e WebSocket verso HA (porte per Windows e Android), calcolo dell'`<id>`. Test come per il nucleo attuale | PC (Vitest) | S3, Q-S3 |
| S5 | **Schermate locali** «Crea il proprietario» e riepilogo dei dati della casa (replica di HA, REP-20261026-004 §7) nei gusci Windows e Android | Windows (end-to-end con un finto HA) | S4, risposte Q-U di REP-20261026-004 |
| S6 | **Utente di servizio** (ADR-0022) come passo dichiarato dell'app, se D-G9 lo sceglie | VM | S3, D-G9 |
| S7 | **Prove complete:** VM da snapshot «HA appena installato» (passi 1-10, interruzioni a ogni passo, ripresa); poi **Dell**. La configurazione iniziale si fa una volta: ripristino = reinstallare HA OS o ripristinare un backup | VM, Dell, Tab M11 | S4-S6 |
| S8 | **Documenti:** ADR-0024 «Installazione automatica dall'app client» (estende ADR-0023, supera G5/G6 e la parte chiavi di REP-20261026-001), procedura scritta per il sistemista, `verification.md` | — | S7 |

**Che cosa non serve più** (dopo D-G1 c e D-G2 b): account macchina, PAT per cliente, rotazione e revoca delle chiavi (D-G4, G5, PV1-PV4), orchestratore separato da laboratorio (G6, sostituito dall'app client). La chiavetta «OS + Aca» (G8) resta facoltativa: serve solo a scrivere HA OS.

## 6. Rischi [V]

- **API interne di HA** (`supervisor/api`, onboarding, gestione utenti): possono cambiare con gli aggiornamenti. Servono test di contratto e una prova a ogni versione di HA approvata (REP-20261026-001 G10).
- **Immagine pubblica:** chiunque può scaricare il server Acasystem compilato. L'immagine non deve contenere segreti (già previsto).
- **Configurazione iniziale una sola volta:** sul Dell una prova non riuscita a metà lo lascia «configurato». Il ripristino è reinstallare HA OS o ripristinare un backup.
- **Porta di HA variabile** (80 sul Dell): l'app la rileva provando 80 e 8123.

## 7. Domande per l'utente

- **Q-S1. Come rendere disponibili i sorgenti (D-C6 «va bene»):**
  - (a) consigliata: in ogni release di `acasystem-releases` uno zip `acasystem-src-<v>.zip` dei sorgenti di `progetto/acasystem` di quella versione, più un rimando nel README;
  - (b) un repository pubblico con i sorgenti (P-3 bis originale, storico pulito).
- **Q-S2. Costruzione e invio dell'immagine (D-G3):**
  - (a) consigliata per ora: costruita sul PC e inviata a mano (login Docker tuo, invio mio su tuo ordine), come la release dell'interfaccia;
  - (b) GitHub Actions, che richiede un'autorizzazione a creare workflow.
- **Q-S3. Identità verso HA (D-G9):**
  - (a) consigliata, coerente con ADR-0022: utente «Acasystem (servizio)» creato come passo dichiarato dell'app (passo 8);
  - (b) token del Supervisor, già scartato in ADR-0022.
- **Q-S4. Architetture:**
  - (a) consigliata: solo `amd64` (Dell e mini PC N100);
  - (b) anche `aarch64` (Raspberry Pi).
- **Q-S5. Statistiche anonime di HA al passo 5:**
  - (a) consigliata: predefinito «no», modificabile;
  - (b) chiedere sempre.
- **Q-S6. Ordine dei lavori:**
  - (a) consigliata: S1→S3 (Acasystem installabile a mano dal negozio di HA), poi S4→S7;
  - (b) prima la prova temporanea sul Dell (istanza sul PC, porta 3004) per creare subito l'account.

**Risposte dell'utente del 2026-10-26:** «Per Q-S1…Q-S6 di REP-20261026-005 prendo tutte le opzioni consigliate (a). Parti con S1: pacchetto di Acasystem per HA OS, prova sulla VM.»

| Domanda | Risposta |
|---|---|
| Q-S1 | Zip dei sorgenti in ogni release |
| Q-S2 | Immagine costruita sul PC e inviata a mano |
| Q-S3 | Utente di servizio come passo dichiarato |
| Q-S4 | Solo `amd64` |
| Q-S5 | Statistiche «no» di predefinito |
| Q-S6 | Prima S1→S3 |

## Avanzamento e modifiche

**2026-10-26, S4-S5: installazione automatica dall'app, provata sulla copia della VM.** Richiesta dell'utente: «procediamo a sviluppare s4-s5 sulla copia della vm allora»; RAM liberata dall'utente («Ho liberato la RAM: avvia la copia della VM e fai la prova completa.»).

- **Nucleo (`progetto/client/core`):**
  - `setup.ts`: riconoscimento del mini PC (Acasystem, HA da configurare, HA senza Acasystem), proprietario (`POST /api/onboarding/users` e token), accesso amministratore (login flow, senza MFA), dati della casa (`config/core/detect` → conferma → `config/core/update`), fine dell'onboarding (statistiche «no», Q-S5), repository, installazione, opzioni `boot: auto` e `watchdog`, avvio tramite `supervisor/api`, attesa di `/api/health`. Ogni passo controlla prima se è già fatto;
  - `haSocket.ts` (WebSocket di HA), porte `HaHttp` e `WebSocketFactory`, `inspectAddress` in `wizard.ts` (l'indirizzo si salva se risponde Acasystem o HA), testi in `messages.ts`;
  - password e token solo in memoria.
- **Windows:** schermate locali «Crea l'account del proprietario», «Accedi come amministratore», «Dati della casa» e avanzamento con «Riprova» e «Cambia indirizzo»; all'avvio senza Acasystem riprende la configurazione se all'indirizzo risponde HA.
- **Android:** stesse schermate e stesso flusso; `HaHttp` con CapacitorHttp e WebSocket del WebView. `allowMixedContent: true` solo per la pagina locale del guscio (serve `ws://` da `https://localhost`); la finestra dell'interfaccia resta `MIXED_CONTENT_NEVER_ALLOW`.
- **Prova reale (2026-10-26, 16:25-17:20)** sulla copia collegata `acasystem-ha-s45` dall'istantanea «prima-del-primo-avvio» (`acasystem-ha` non toccata, spenta dall'utente), app Windows dai sorgenti con dati separati e release vere di GitHub:
  1. account del proprietario creato dall'utente nelle schermate dell'app (credenziali mai viste dall'agente);
  2. onboarding di HA completato (4 passi su 4), repository aggiunto, app `9960cdb4_acasystem` 0.9.30 installata da GHCR e avviata, interfaccia scaricata da GitHub e aperta dall'app;
  3. accesso ad Acasystem dell'utente riuscito dopo il riavvio dell'app di HA OS (punto 4 dei problemi).
- **Problemi trovati e correzioni:**
  1. firmware della copia bloccato con 2 CPU (Hyper-V come motore): copia portata a 1 CPU;
  2. nell'istantanea la scheda 1 aveva il cavo virtuale scollegato, quindi niente Internet e Core non scaricato («landingpage»): scheda 1 su NAT e cavo collegato. Con NAT il tablet non raggiunge la copia; la prova è stata fatta dal PC sulla rete host-only `192.168.56.102`;
  3. **VM lenta (1 CPU, blocchi della CPU oltre 20 s):** la creazione del proprietario ha superato il limite di 10 s, ma HA aveva creato l'account; poi lo stesso per l'ultimo passo dell'onboarding e per l'apertura del WebSocket. Corretto nel nucleo: 30 s per le richieste brevi, 60 s per account, accesso, token, passi dell'onboarding e WebSocket; se la creazione scade ma l'account risulta creato, l'app passa all'accesso. Le prove reali sono state completate con «Riprova» prima della correzione; **la versione corretta non è ancora provata su HA reale**;
  4. **app di HA OS:** all'avvio il Supervisor non ha risposto in 5 s, quindi `detect-ha-url.mjs` ha ripiegato su 8123 mentre HA ascolta sulla 80 (`ECONNREFUSED 172.30.32.1:8123`, accesso ad Acasystem «Home Assistant non risponde»). Un riavvio dell'app ha letto la porta 80. Corretto `progetto/ha-app/image/detect-ha-url.mjs`: 6 tentativi da 10 s con pausa di 5 s, poi sonda di `homeassistant:8123` e `:80` (`/api/` 200 o 401), infine 8123 con messaggio. **Arriva ai mini PC solo con una nuova immagine pubblicata** (la 0.9.30 su GHCR ha ancora il ripiego vecchio).
- **Istantanea della copia:** «ha-pronto-senza-account» (HA scaricato, onboarding non iniziato), per ripetere la prova da Windows e dal tablet.
- [P] Durante il download di Core, all'indirizzo risponde la pagina d'attesa di HA OS e l'app oggi dice «Home Assistant non risponde»: proposta di un messaggio «Home Assistant sta finendo l'installazione, riprova tra qualche minuto». Non applicata.

**2026-10-26, S1: pacchetto pronto, non pubblicato.** Richiesta dell'utente durante il lavoro: «mi prepari tutto e poi mi dici che devo pubblicare su github?». La prova sulla VM si fa dopo la pubblicazione, installando dal negozio di HA OS (S3).

- **Scelta esecutiva: nessuna modifica a `progetto/acasystem`** (codice condiviso con i flussi 0.9.31 e D1). Tutto sta nella cartella nuova `progetto/ha-app/`:
  - `image/Dockerfile`: strato sopra l'immagine del banco `aca-system:<v>` (`ARG BASE_IMAGE`). Mette `ACASYSTEM_VERSION` nell'immagine, aggiunge le etichette `io.hass.*` e `org.opencontainers.image.source` (collega il pacchetto GHCR al repository) e `CMD /haos/run.sh`;
  - `image/run.sh`: solo se esiste `/data/options.json` (app di HA OS) imposta `DATA_DIR=/data/app`, `TUNET_SERVICE_SECRET_FILE=/data/service-secret/service-identity.json` (fuori da `DATA_DIR`, come richiede l'attivazione di ADR-0022), `TUNET_ENCRYPTION_MODE=off` e `TUNET_INTERNAL_HA_URL` letto dal Supervisor. Poi `exec node src/server.ts`. Senza `options.json` parte come il banco;
  - `image/detect-ha-url.mjs`: `GET http://supervisor/core/info` con `SUPERVISOR_TOKEN` → `http(s)://homeassistant:<porta>`; ripiego su 8123 con messaggio nel log;
  - `repository/repository.yaml` e `repository/acasystem/` con `config.yaml`, `DOCS.md` e `CHANGELOG.md`. Nel `config.yaml`: `image: ghcr.io/acamemo/acasystem`, `arch: [amd64]`, `init: true` (segnali e arresto corretto di SQLite), `hassio_api: true` solo per leggere la porta, `homeassistant_api: false` (nessun token di HA all'app, ADR-0022), porta `3002/tcp: 3002`, `watchdog` su `/api/health`, `backup: cold`, `backup_exclude` per `service-secret`, nessuna opzione;
  - `prepare.mjs --version <v>`: costruisce `ghcr.io/acamemo/acasystem:<v>` (`--provenance=false`, `linux/amd64`) e prepara in `out/<v>/` (escluso da Git) la cartella `repository/` con la versione inserita e le icone provvisorie (128×128 e 250×100), lo zip dei sorgenti e `PUBBLICAZIONE.md`.
- **Preparato per 0.9.30** (stessa versione dell'interfaccia già pubblicata):
  - immagine `ghcr.io/acamemo/acasystem:0.9.30` (`sha256:9ed0f7ab…c133`, `linux/amd64`), costruita sopra `aca-system:0.9.30` del banco;
  - `out/0.9.30/repository/`;
  - `out/0.9.30/acasystem-src-0.9.30.zip` (1380 file, 5,6 MB).
- **Limite dello zip dei sorgenti (Q-S1).** Della 0.9.30 non esiste un'istantanea esatta: la build del banco è stata fatta dall'albero di lavoro, non da un commit. Lo zip contiene `progetto/acasystem` del 2026-10-26, con lavori successivi alla 0.9.30 (0.9.31, D1, «Cambia indirizzo»).
  - [P] Per le versioni successive: costruire da un commit con tag e generare lo zip da quel commit.
- **Prove locali del contenitore** (porta 127.0.0.1:3005; banco 3002 e D1 3003 non toccati; contenitori di prova rimossi):
  1. come app di HA OS, con un finto Supervisor (porta 8123) e l'HA del PC come `homeassistant`: avvio con il messaggio atteso, `/api/health` `{"status":"ok","version":"0.9.30"}`, `/ha/auth/providers` 200 verso HA, `tunet.db` in `/data/app`, cartella `service-secret` creata;
  2. senza Supervisor: ripiego su `homeassistant:8123` con messaggio, server avviato;
  3. senza `options.json`: come il banco, `DATA_DIR=/app/data`, `/api/health` 0.9.30.
  - `detect-ha-url.mjs` letto da solo: porta 80 dal Supervisor → `http://homeassistant:80`; token sbagliato (401) o Supervisor spento → 8123 con messaggio.
- **Non provato:** installazione reale dal negozio di HA OS, `init`, `watchdog`, `backup_exclude` e il Supervisor vero (sarà S3 sulla VM).

**Prima di questo:** solo documenti:
- questo report e la sua riga in `reports/README.md`;
- annotazione delle decisioni D-G1, D-G2 e D-C6 in REP-20261026-001;
- rimando in REP-20261026-002.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato del Dell | `curl` in sola lettura (2026-10-26 12:30) | Osservato | HA sulla porta 80, `GET /api/onboarding` con tutti i passi `done: false`; `:3002` non risponde. |
| Piano | — | Non eseguito | Nessuna prova; i fatti tecnici vengono da REP-20261026-001 e REP-20261026-004, con le loro fonti. |
| S4-S5 test automatici (2026-10-26) | `npx vitest run` e `tsc --noEmit` in `core`, `windows`, `android`; `npm run check:smoke` in `windows` | Superato | Nucleo 61/61, Windows 21/21, Android web 7/7; e2e Windows 18/18 con finto HA OS (HTTP + WebSocket scritto nella prova, senza dipendenze nuove), password non salvata nei file dell'app. APK release ricompilato, non installato. |
| S4-S5 prova reale (2026-10-26) | Copia `acasystem-ha-s45` (HAOS 18.3, Core 2026.10.4, 1 CPU, NAT + host-only), app Windows dai sorgenti | Superato con 2 «Riprova» e 1 riavvio dell'app di HA OS | Onboarding 4/4, app 0.9.30 installata e avviata, `/api/health` 0.9.30, interfaccia aperta, accesso dell'utente riuscito. Correzioni dei tempi e di `detect-ha-url.mjs` provate solo in locale. Tablet, Dell, interruzioni a ogni passo e percorso amministratore da HA già configurato senza account appena creato: non provati. |
| `detect-ha-url.mjs` corretto | Script con finto Supervisor e finto HA su 127.0.0.x | Superato | Supervisor che risponde al 3° tentativo → porta 80; Supervisor spento con HA sulla 8123 → trovato dalla sonda; nessun HA → 8123 con messaggio. Immagine non ricostruita né pubblicata. |

## Pubblicazione della 0.9.30 come app di HA OS (da fare all'utente, con `acamemo`)

**Ordine obbligatorio:** prima l'immagine, poi i file del repository.

1. **Token (solo per caricare l'immagine):** su github.com con `acamemo` → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic). Scope **solo `write:packages`**, con una scadenza. Non condividerlo.
2. **Accesso dal PC:** nel proprio terminale `docker login ghcr.io -u acamemo`, incollando il token come password.
3. **Invio dell'immagine:** su ordine esplicito dell'utente l'agente esegue `docker push ghcr.io/acamemo/acasystem:0.9.30`. Il pacchetto risulta di `acamemo`.
4. **Pacchetto pubblico:** su github.com → profilo `acamemo` → Packages → `acasystem` → Package settings → Danger Zone → Change visibility → **Public**.
5. **File del repository:** in `acamemo/acasystem-releases` → Add file → Upload files → trascinare il **contenuto** di `progetto/ha-app/out/0.9.30/repository/` (il file `repository.yaml` e la cartella `acasystem/`) → Commit changes su `main`. Il risultato deve essere `repository.yaml` nella radice e `acasystem/config.yaml`.
6. **Sorgenti:** Releases → `v0.9.30` → Edit → allegare `progetto/ha-app/out/0.9.30/acasystem-src-0.9.30.zip` → Update release.
7. Poi l'agente verifica: immagine scaricabile senza accesso, file del repository, zip; e passa a S3 (installazione dal negozio di HA OS sulla VM).

**Avanzamento della pubblicazione (2026-10-26):**
- **Primi tentativi:** `docker login` fallito tre volte con «denied: denied» (token non adatto); caricamento dei file finito per sbaglio nel repository privato `acamemo/acasystem` (`5f9e7dc`), poi cancellato dall'utente (`37fb8bb`, `0d3fe27`; contenuto netto invariato rispetto a `4e198c5`).
- **Immagine:** login riuscito con un token classic di `acamemo` (detto dall'utente: «fatto login succeded»). L'agente ha eseguito `docker push ghcr.io/acamemo/acasystem:0.9.30` con digest `sha256:9ed0f7ab43440d144468eb9632be03a1b9769a54e8722413010b0118aa25c133`. Senza login il manifesto risponde **403**: il pacchetto è ancora privato (passo 4).
- **File del repository:** `acasystem-releases` ha il commit `b629386` «Add files via upload» di `acamemo`. `repository.yaml` e i 5 file di `acasystem/` sono identici byte per byte a `out/0.9.30/repository/`.
- **Mancano:** pacchetto pubblico (passo 4) e zip dei sorgenti nella release (passo 6).

**S3 sulla VM `acasystem-ha`** (scelta dell'utente: «acasystem-ha con snapshot»; il PC aveva 1,7 GB di RAM libera, quindi niente copia della VM):
- **Prima della prova:** pacchetto `acasystem` pubblico (manifesto senza login: 200, OCI, 17 strati). Lo zip dei sorgenti **non risultava ancora allegato** alla release (solo 2 file, anche nella pagina del sito).
- **14:31:** snapshot a caldo «prima-app-acasystem» (UUID `39ab1723-4b33-408a-a61f-6bbec7b52c6b`).
- **Console di HA OS** (`ha >`), via `VBoxManage keyboardputstring` e `screenshotpng`, senza credenziali:
  - `store add https://github.com/acamemo/acasystem-releases`: la CLI va in timeout, ma il Supervisor completa l'aggiunta;
  - `store apps info`: l'app «Acasystem» `9960cdb4_acasystem` risulta disponibile, `version_latest: 0.9.30`, `amd64`, con icona, logo e documentazione;
  - poi `store apps install 9960cdb4_acasystem`.
- **Incidente durante l'installazione:** la VM si è **riavviata da sola**. Dal log di VirtualBox:
  - 13:31:05Z ripresa dopo lo snapshot;
  - «TM: Giving up catch-up attempt» (ritardo dell'orologio accumulato di circa 9238 s);
  - 13:35:31Z «Guest seems to be unresponsive»;
  - 13:35:38Z «ACPI: Reset initiated by ACPI».
  - [V] Causa probabile: blocco della VM durante lo scaricamento e la decompressione dell'immagine (~860 MB) con poca RAM libera sul PC, dopo la pausa dello snapshot; il watchdog di HA OS l'ha riavviata.
  - Effetto: l'istanza D1 sulla 3003 non raggiunge HA finché la VM non riparte.
  - Nessun dato toccato; lo snapshot permette di tornare indietro.

- **Release completa:** alle 14:40 la release `v0.9.30` contiene `acasystem-src-0.9.30.zip` (5.913.406 byte, SHA-256 `f06f7c8b…bb3ba`, identico al file locale e verificato anche con il download), `acasystem-web-0.9.30.zip` e `manifest.json`, tutti caricati da `acamemo`. Nella stessa ora la VM era in avvio («Waiting for Supervisor to start…»).

**S3, esito dopo il riavvio della VM (15:10-15:15):**
- **VM:** HA ripartito (`ha core info`: Core 2026.9.4, `port: 80`, `ip_address: 172.30.32.1`). Riavvio lento: Supervisor in ritardo per circa 35 minuti.
- **App installata prima del blocco:** `ha apps info 9960cdb4_acasystem` mostra `version: 0.9.30`, `state: started`, `network: 3002/tcp: 3002`, `repository: 9960cdb4`, `url: https://github.com/acamemo/acasystem-releases`, `update_available: false`.
- **Log dell'app** (`ha apps logs`): «[acasystem] app di HA OS 0.9.30: dati in /data/app, Home Assistant su http://homeassistant:80» e «[server] Tunet backend running on port 3002». Il rilevamento della porta funziona con il Supervisor vero.
- **Dal PC, rete host-only:**
  - `http://192.168.56.10:3002/api/health` → `{"status":"ok","version":"0.9.30"}`;
  - `/` → 200;
  - `/ha/auth/providers` → 200 con il provider «Home Assistant Local». Acasystem dentro HA OS raggiunge HA.
- **Rete dell'ufficio:** IP a ponte della VM `192.168.1.183` (`ha network info`). Dal PC non risponde, limite noto del ponte di VirtualBox sul Wi-Fi.
- **Prova con l'app sul Tab M11: non eseguita, rete diversa.** Alle 14:54 il tablet si è ricollegato a «MeMo Repeater 5 Ghz» (IP 192.168.1.20), mentre il PC è su «MeMo Repeater 5 Ghz 2». Dal tablet non rispondono 192.168.1.183, 192.168.1.184 e 192.168.1.7 (`ping`: 100% persi; `nc`: «No route to host»). Nell'app compare «Il mini PC non risponde»; l'indirizzo salvato resta 192.168.1.7.
- **Seconda prova dal tablet (15:15-15:21).** L'utente ha collegato il tablet a «MeMo Repeater 5 Ghz 2». Dalle verifiche:
  - tablet e PC risultano sullo stesso ripetitore «MeMo Repeater 5 Ghz» (BSSID `e0:08:55:38:0a:a8`); tablet `192.168.1.20`, **PC passato a `192.168.1.19`** (non più 192.168.1.7, quindi il banco legato a 192.168.1.7 non è raggiungibile dalla rete);
  - dal tablet risponde solo il router (`192.168.1.1`). `.183` (VM) e `.184` (Dell) danno «+errors» / «No route to host», mentre dal PC rispondono. [V] Limite della rete o del ripetitore, non dell'app.
- **Prova completa via USB:** `adb reverse tcp:3006 tcp:3006` più un inoltro temporaneo sul PC (`127.0.0.1:3006` → `192.168.56.10:3002`, script in scratchpad, attivo in background). Nell'app di rilascio, con tocchi reali, IP `127.0.0.1` e porta `3006` nelle «Impostazioni avanzate». Esito:
  - verifica di `/api/health` (0.9.30);
  - interfaccia scaricata dalla release GitHub;
  - `UiActivity` con «Accedi ad Acasystem», servita dall'**app installata in HA OS** della VM.
  - Schermata `backup/client-c6-m11/45-app-ha-os-vm-via-usb.png`. Indirizzo ora salvato nell'app: `127.0.0.1:3006`, che vale solo con USB e inoltro attivi.
- **Uso dopo il login** (l'utente ha fatto l'accesso con l'account della VM; credenziali non toccate dall'agente; verifiche con schermate, tocchi di sola navigazione e `netstat` sul PC, 15:22-15:23):
  - **WebSocket:** una sola connessione verso `192.168.56.10:3002` dall'inoltro, la stessa (porta 53782) dopo 10 s. È la connessione persistente del WebSocket: le richieste HTTP si chiudono.
  - **Sistema → Collegamento:** «Sincronizzato», «Collegato a Home Assistant tramite Acasystem», utente proprietario. Profili sul server caricati (API autenticate). Informazioni: «Versione 0.9.30». Pulsante «Cambia indirizzo» assente, come atteso (arriva dopo la 0.9.30).
  - **Layout:** launcher con la griglia vuota a celle «+», corretto per un database nuovo (`/data/app` nell'app di HA OS; i layout del banco non sono stati migrati). Nessun widget aggiunto.
  - **Casa 3D:** «Apri la casa» → «Nessuna casa disegnata», corretto per un database nuovo. Chiusa con «Esci» senza modifiche.
  - Schermate `50-dopo-login-vm.png`, `51-sistema-vm.png`, `53-casa3d-vm.png` in `backup/client-c6-m11/`.
  - Non provati: aggiunta e salvataggio di widget, comandi ai dispositivi, persistenza dopo il riavvio dell'app di HA OS.
- **Non provati:** watchdog dell'app (nelle informazioni `watchdog: false`, cioè l'interruttore dell'utente spento di serie); `backup_exclude`; aggiornamento a una versione nuova; arresto con `init`.

**Chiusura della prova (15:25-15:27).** Richiesta dell'utente: «Chiudi l'inoltro, rimetti l'app del tablet sul banco e sistema il banco sul nuovo IP del PC (192.168.1.19) in compose.tunet.yaml.»
- Inoltro fermato e `adb reverse tcp:3006` rimosso.
- Banco ricollegato su `192.168.1.19:3002` (vedi `infrastructure.md`).
- App del tablet ricollegata con «Cambia indirizzo» a `192.168.1.19`, porta predefinita.
- **Difetto osservato (proposta, non corretto):** dopo il cambio di mini PC l'app mostra «La sessione con Home Assistant è scaduta: accedi di nuovo per riprendere». Ha tenuto la sessione della VM.
  - [V] Causa: l'origine dell'interfaccia nell'app è sempre `127.0.0.1:47320`, quindi `localStorage` (sessione e dati locali) è condiviso tra mini PC diversi.
  - [P] Proposta: quando l'indirizzo salvato cambia, il guscio cancella i dati del browser dell'app (Android `WebStorage.deleteAllData()` e cookie; Electron `session.clearStorageData()`), così si riparte puliti, con accesso e dati del nuovo impianto. Da autorizzare.

**Correzione dei dati del browser al cambio di mini PC (2026-10-26, 15:28-15:34).** Richiesta dell'utente: «Sì: correggi l'app client (Windows e Android) perché al cambio di indirizzo cancelli sessione e dati del browser dell'app, con test.»

- **Regola** (nucleo `core/src/browserReset.ts`, `needsBrowserReset`): si cancella solo se il mini PC dell'avvio è diverso da quello dell'avvio precedente. Senza un avvio ricordato (prima installazione o aggiornamento dalla 0.1.0 che non lo salvava) si registra soltanto l'indirizzo, così chi ha già fatto l'accesso lo mantiene.
- **Windows:**
  - `fileStore.ts` ha `createLastServerStore` (`last-server.json` nella cartella dati);
  - in `main.ts`, prima di aprire l'interfaccia: `session.defaultSession.clearStorageData({ origin: <origine locale> })` (cookie, localStorage, IndexedDB, service worker, Cache Storage) e `clearCache()`, poi salva l'indirizzo.
- **Android:**
  - `BrowserReset.java`, con la stessa regola in Java puro;
  - `AcaShellPlugin.launch` legge e salva `lastServerOrigin` nelle preferenze e passa `resetBrowserData` a `UiActivity`;
  - `UiActivity`, prima di `loadUrl`: `WebStorage.deleteAllData()`, `CookieManager.removeAllCookies` più `flush` e `webView.clearCache(true)`.
- **Verifiche:**
  - nucleo 51/51 (2 test nuovi); Windows 21/21 (archivio dell'ultimo mini PC); Android web 6/6; JUnit 13/13 (`BrowserResetTest`); typecheck senza errori;
  - **prova end-to-end Windows 11/11**, con due passi nuovi e un secondo finto mini PC: «stesso mini PC: sessione e dati del browser conservati» e «altro mini PC: sessione e dati del browser del precedente cancellati»;
  - **controllo del test:** togliendo `clearStorageData` dal file compilato, la prova fallisce al controllo del cambio; file poi ricompilato;
  - **Tab M11, build di debug via CDP:** impianto 1 `192.168.1.19:3002`, dato scritto in localStorage; riavvio dopo 15 s, dato presente; «Cambia indirizzo» verso l'impianto 2 `127.0.0.1:3002` (`adb reverse`, rimosso dopo), dato cancellato. Un primo tentativo con chiusura forzata subito dopo la scrittura perdeva il dato anche con lo stesso impianto: la WebView salva localStorage su disco con ritardo, non è un difetto della correzione.
- **Stato dopo la prova:**
  - sul tablet la versione di rilascio aggiornata, collegata al banco `192.168.1.19`, alla pagina di accesso pulita (l'utente deve riaccedere);
  - zip Windows e APK rigenerati, non distribuiti.

**Commit (2026-10-26).** Su richiesta dell'utente («fai un commit solo dei file di questo incarico […] Non fare push») è stato creato il commit `d543f16` su `master`: 150 file, senza push.
- **Contiene:** app client (`progetto/client`), pacchetto HA OS (`progetto/ha-app`), «Cambia indirizzo» e pulizia C1 nel frontend, IP del banco, ADR-0023, REP-20261026-002/004/005 e le voci di questo incarico in `verification.md`, `project-status.md`, `infrastructure.md` e nell'indice dei report.
- **Restano fuori, nella cartella di lavoro:** i lavori degli altri flussi (D1, 0.9.29-0.9.31, launcher; nel compose il segreto del servizio di D1; in `release.check.mjs` le versioni), REP-20261026-001 e REP-20261026-003. Per i file misti l'indice è stato costruito dalla versione di `4e198c5` più i soli blocchi di questo incarico.
- **Remoto:** `origin/main` ha 3 commit dell'utente fatti dal sito (`5f9e7dc`, `37fb8bb`, `0d3fe27`, caricamento per errore e cancellazione, contenuto netto nullo). Prima di un push vanno uniti.

## Pubblicazione della 0.9.30.1 come app di HA OS (correzione del rilevamento di HA)

Richiesta dell'utente: «Sì: prepara la nuova immagine dell'app di HA OS con detect-ha-url corretto e dimmi cosa devo pubblicare.»

- **Versione [scelta esecutiva]:** Acasystem resta 0.9.30 (`ACASYSTEM_VERSION`, `/api/health`, compatibilità delle app client, che accettano solo X.Y.Z); il pacchetto per HA OS diventa **0.9.30.1** (tag dell'immagine, `io.hass.version`, `version` in `config.yaml`), così il Supervisor lo propone come aggiornamento.
- **Modifiche:**
  - `prepare.mjs --version 0.9.30 --revision 1`;
  - `Dockerfile` con `APP_VERSION`;
  - `CHANGELOG.md` con la voce 0.9.30.1;
  - lo zip dei sorgenti include anche lo strato per HA OS in `ha-app-image/`.
- **Preparato** in `progetto/ha-app/out/0.9.30.1/`:
  - immagine `ghcr.io/acamemo/acasystem:0.9.30.1`, `sha256:3f135031…1d66b`, sopra `aca-system:0.9.30`;
  - `acasystem-src-0.9.30.1.zip`: 1383 file, SHA-256 `0cc4e2f5…efae7`.
- **Prova locale del contenitore** (porta 127.0.0.1:3006, rimosso dopo la prova): Supervisor spento, 2 tentativi, poi «Home Assistant trovato su http://homeassistant:8123» (HA del PC). Risultati: `/api/health` 0.9.30; `/ha/auth/providers` risponde da un HA vero (400 «onboarding_required», l'HA del PC non è configurato).
- **Docker Desktop** non partiva: c'era un file di collegamento rimasto da una chiusura precedente (`%LOCALAPPDATA%\docker-secrets-engine\engine.sock`, non cancellabile). La cartella è stata rinominata in `docker-secrets-engine.vecchio-20261026`, poi Docker è ripartito.
- **Passi di pubblicazione (utente, con `acamemo`):**
  1. ordine all'agente di eseguire `docker push ghcr.io/acamemo/acasystem:0.9.30.1`. Il login a `ghcr.io` risulta salvato; se scaduto, ripetere `docker login ghcr.io -u acamemo`. Il pacchetto è già pubblico e il nuovo tag lo eredita;
  2. **dopo il push**, in `acamemo/acasystem-releases`: sostituire `acasystem/config.yaml` e `acasystem/CHANGELOG.md` con quelli di `out/0.9.30.1/repository/acasystem/`. Icona, logo, `DOCS.md` e `repository.yaml` restano;
  3. allegare `acasystem-src-0.9.30.1.zip` alla release **esistente** `v0.9.30`. **Non creare una release nuova:** le app client leggono `manifest.json` dall'ultima release, e una release senza manifest le lascerebbe senza interfaccia da scaricare;
  4. poi l'agente verifica il manifesto dell'immagine senza login, i file del repository e lo zip, e prova l'aggiornamento sulla copia della VM.
- **Esito (2026-10-26, sera):**
  - push dell'agente su ordine dell'utente: digest `sha256:3f135031…1d66b`, manifesto scaricabile senza login (200);
  - `acasystem/config.yaml` caricato dall'utente, identico al file locale; `CHANGELOG.md` con lo stesso testo (cambiano solo i ritorni a capo);
  - **zip dei sorgenti 0.9.30.1 non ancora allegato** alla release `v0.9.30`: all'ultimo controllo c'erano solo 3 file;
  - sulla copia `acasystem-ha-s45`: `store reload`, poi `apps info` con `version_latest 0.9.30.1` e `update_available: true`, poi `apps update`;
  - risultato: `version 0.9.30.1`, `state: started`, `watchdog: true`; registro «Home Assistant su http://homeassistant:80» senza ripieghi; `/api/health` 0.9.30; `/ha/auth/providers` 200. Durante l'aggiornamento Acasystem ha continuato a rispondere;
  - il caso «Supervisor lento» non si è ripresentato sulla VM: è provato solo dalla prova locale.

**Prova dal Tab M11 (2026-10-26, 19:14-19:29).** Ambiente:
- copia `acasystem-ha-s45` riportata all'istantanea «ha-pronto-senza-account»; lo stato precedente è salvato in «dopo-prova-windows-0.9.30.1»;
- APK di rilascio con S4-S5 e i tempi lunghi;
- tablet collegato via USB: `adb reverse` 8123 e 3002 verso un inoltro temporaneo sul PC, che porta alle porte 80 e 3002 della VM. Indirizzo nell'app: `127.0.0.1`.

Esito:
- **19:17:39** proprietario creato dall'utente nelle schermate dell'app;
- **19:18:04** onboarding 4/4, senza errori di tempo né «Riprova»;
- negozio aggiunto; installazione della 0.9.30.1 da GHCR (al minuto 9 il Supervisor era al 69,5%);
- **19:28:44** Acasystem risponde e il tablet apre da solo «Accedi ad Acasystem».
- **Tempo totale dall'account all'interfaccia: circa 11 minuti, quasi tutti di download e installazione dell'immagine** (ISSUE-119).
- Registro dell'app: «Home Assistant su http://homeassistant:80» senza ripieghi; `/ha/auth/providers` 200.
- **Poi l'utente ha fatto l'accesso ad Acasystem dal tablet con l'account appena creato** («ho fatto accesso e sono in app!»): percorso completo confermato dall'installazione all'uso.
- **Non provato:** la Wi-Fi diretta (il tablet passa dal cavo USB), le interruzioni a ogni passo e il Dell.
- Esperienza delle schermate da rivedere in una chat dedicata (ISSUE-118).

## Chiusura e punto di ripresa

**Annotazione 2026-10-26 (S4-S5).** S4-S5 fatte e provate sulla copia della VM (sezione «Avanzamento»). Ripresa: (1) nuova immagine dell'app di HA OS con `detect-ha-url.mjs` corretto, da pubblicare dall'utente; (2) ripetere la prova dall'istantanea «ha-pronto-senza-account» con l'app corretta, anche dal Tab M11 (serve una rete che il tablet raggiunga); (3) S6; (4) S7 sul Dell. *Aggiornamento in serata: (1) fatto (0.9.30.1 pubblicata, manca lo zip dei sorgenti nella release) e (2) fatto dal Tab M11 via USB; commit dei lavori S4-S5 su richiesta dell'utente.* Il testo seguente resta quello precedente.

Ripresa: risposte a Q-S1…Q-S6 (e a Q-U di REP-20261026-004 per le schermate del proprietario), poi S1. Il Dell resta **non configurato**: non completare la configurazione iniziale dalla pagina di HA finché S7 non è pronta.
