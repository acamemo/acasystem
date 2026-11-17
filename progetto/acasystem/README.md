# Acasystem

Home Assistant con un frontend migliorato. Deriva da [Tunet](https://github.com/oyvhov/Tunet) 1.22.1 (GPL-3.0, revisione `5dec99587b4fcc2fb1f831a0a0002c9b90e6958e`, baseline in [tunet-origin.json](../tunet-origin.json)). La [licenza](LICENSE) resta GPL-3.0. Decisioni: ADR-0007 e ADR-0008.

## Struttura

| Cartella | Contenuto |
|---|---|
| `frontend/` | Interfaccia React + Vite, in migrazione a TypeScript. |
| `backend/` | Server Express: API dei profili, impostazioni, icone, validazione dell'identità HA; serve anche la build del frontend. |
| `casa3d/` | Workspace Lit: upstream e override distinti dai sorgenti generati e dalla build. |
| `ui/` | Primitive React, popup, movimento, toast e layout/navigazione comuni. |
| `design/` | Fonte CSS/font/temi, condivisa anche con le shell dei client. |
| `contracts/` | Tipi API, costanti e modelli runtime puri condivisi da server e browser, senza React/storage/servizi. |
| `upstream-tunet/` | File solo di riferimento di Tunet: changelog, documentazione, add-on, workflow. Non vengono costruiti. |

Nel frontend gli strati seguono una gerarchia: ogni strato importa solo da quelli precedenti.

1. `ui/primitives`: componenti, tipografia e layout. I vecchi src/components/primitives sono rimandi compatibili; non conoscono Home Assistant.
2. `src/components/system`: barra di stato, indicatore pagina, fogli.
3. `src/components/widgets`: un widget per dominio HA.
4. `src/templates`.
5. `src/pages`.

Le altre cartelle seguono ADR-0008:

| Cartella | Contenuto |
|---|---|
| `@types` | Tipi globali e di dominio. |
| `api` | Client HA e backend. |
| `domain/launcher` | Catalogo/geometria/classificazione puri, senza dipendenze dalle schermate; gli adattatori del registry restano fuori dai modelli. |
| `hooks` | Hook React. |
| `routes` | Instradamento. |
| `themes` | Tema Acasystem. |
| `utils` | Funzioni pure. |
| `validators` | Controlli dei dati a runtime. |

L'alias `@/` punta a `frontend/src`.

## Provare account, profili e Tavano

La [guida di prova locale](../../documentazione/riprogettazione/blocchi/03-profili-client-tavano-prova.md) descrive ingresso IP/QR, registrazione HA, nomi dei client, profili condivisi, editing/bozze, Tavano e personalizzazione account. Le nuove funzioni richiedono webapp e backend v2 della centrale nella versione locale 0.9.34; ZIP Windows e APK Android 0.1.0 sono soltanto i contenitori che ricevono la webapp. Artefatti locali, immagine della centrale e installazione/pubblicazione hanno stati distinti nel [report corrente](../../documentazione/reports/REP-20261102-012-profili-client-editing-tavano.md).

## Comandi (da questa cartella)

```text
npm ci                 dipendenze bloccate dei tre workspace
npm run dev            frontend (Vite, porta 5173) e backend (porta 3002)
npm run build          build di frontend e Casa3D
npm test               test comuni UI/design, poi frontend, backend e Casa3D
npm run typecheck      controlli TypeScript
npm run lint           ESLint
```

Per preparare un rilascio usare lo snapshot di build dalla radice Git:

```powershell
node progetto/ha-app/build-base.mjs --version 0.9.33 --tag aca-system:locale
node progetto/ha-app/prepare.mjs --version 0.9.33 --base-image aca-system:locale --check
```

Il primo comando costruisce un'immagine locale dai byte congelati e registra il loro SHA; il secondo controlla sorgenti/versione senza creare contenitori o output. Per una nuova versione sostituire il numero approvato. Una normale build Docker di sviluppo senza provenienza rimane utilizzabile localmente, ma non passa la preparazione del rilascio. Il prepare completo genera out/<versione> e richiede i prerequisiti operativi già indicati in infrastructure.md; non pubblica. Non sovrascrivere una versione pubblicata per provare modifiche locali.

Pagina di prova con l'app e un Home Assistant finto: `http://127.0.0.1:5173/#/mockup` (le pagine `kit.html`, `launcher.html` e `preview-*.html` sono state tolte il 2026-10-28).

Preparazione pilota aggiornata2026-11-13: il `ha-app/prepare.mjs` completo richiede anche `--haos-version`, `--core-version` e `--sonoff-archive` per generare materiali coerenti; `--check` sopra resta invariato. [Bootstrap](../ha-app/bootstrap/README.md) e [piano/setup candidato](../ha-app/pilot/README.md) distinguono la generazione locale dal collaudo HAOS/Hyper-V e dalla pubblicazione. Non eseguire il template bootstrap sorgente direttamente.

Home Assistant sta dietro Acasystem (ADR-0009). Il browser parla solo con il server Acasystem, che inoltra a Home Assistant le richieste sotto `/ha`: HTTP in streaming e WebSocket, solo i percorsi usati dal frontend. L'accesso avviene con la pagina Acasystem (utente e password di Home Assistant).

`TUNET_INTERNAL_HA_URL` (più `TUNET_INTERNAL_HA_FALLBACK_URL`, facoltativo, solo per la verifica dell'identità) è obbligatorio. Senza, il proxy e le API sincronizzate rispondono 503 `HA_URL_NOT_CONFIGURED`. In sviluppo avvia il backend con la variabile, per esempio `TUNET_INTERNAL_HA_URL=http://127.0.0.1:8123`; Vite inoltra `/api` e `/ha` al backend sulla porta 3002. Gli indirizzi inviati dal browser non vengono mai usati (SEC-1).

Variabili del proxy (facoltative):
- `HA_LOGIN_RATE_LIMIT_MAX`, `HA_LOGIN_RATE_LIMIT_WINDOW_MS`: tentativi di accesso per indirizzo del client, predefinito 10 al minuto (429 `HA_LOGIN_RATE_LIMITED`);
- `HA_WEBSOCKET_RATE_LIMIT_MAX`, `HA_WEBSOCKET_RATE_LIMIT_WINDOW_MS`: collegamenti WebSocket per indirizzo, predefinito 30 al minuto (429 `HA_WEBSOCKET_RATE_LIMITED`);
- `HA_PROXY_RESPONSE_TIMEOUT_MS`: attesa massima della prima risposta di HA, predefinito 30 s (504 `HA_TIMEOUT`); gli stream già avviati non scadono.

Codici del proxy: 404 `HA_PATH_NOT_ALLOWED` (fuori dalla lista consentita, o login diverso da utente e password), 408 `HA_LOGIN_BODY_TIMEOUT`, 413 `HA_LOGIN_BODY_TOO_LARGE`, 502 `HA_UNREACHABLE`, 503 `HA_URL_NOT_CONFIGURED`, 504 `HA_TIMEOUT`. Le risposte di HA inoltrate hanno `Content-Security-Policy: default-src 'none'; sandbox` e `nosniff`. I percorsi `/local/…` e `/api/image/serve/…` di HA non passano: un'immagine configurata così ricade sull'icona del widget.

Requisiti per Home Assistant (installazione):
- il provider `trusted_networks`, se usato, non deve comprendere l'indirizzo del server Acasystem; il proxy accetta comunque solo il login con utente e password;
- finché il proxy non inoltra l'indirizzo reale del client (`X-Forwarded-For` con `trusted_proxies` in HA), la soglia di ban `http: login_attempts_threshold` deve restare disattivata (-1): HA vedrebbe tutti i tentativi dallo stesso indirizzo;
- gli utenti HA con «Può accedere solo dalla rete locale» non sono distinguibili attraverso il proxy: HA vede l'indirizzo del server Acasystem.

Docker: `docker compose -f ../compose.tunet.yaml up -d --build`. L'immagine contiene il backend e il frontend già compilato.
