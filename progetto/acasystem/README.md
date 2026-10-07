# Acasystem

Home Assistant con un frontend migliorato. Deriva da [Tunet](https://github.com/oyvhov/Tunet) 1.22.1 (GPL-3.0, revisione `5dec99587b4fcc2fb1f831a0a0002c9b90e6958e`, baseline in [tunet-origin.json](../tunet-origin.json)). La [licenza](LICENSE) resta GPL-3.0. Decisioni: [ADR-0007](../../documentazione/decisions/ADR-0007-acasystem-os.md) e [ADR-0008](../../documentazione/decisions/ADR-0008-struttura-frontend-backend.md).

## Struttura

| Cartella | Contenuto |
|---|---|
| `frontend/` | Interfaccia React + Vite, in migrazione a TypeScript. |
| `backend/` | Server Express: API dei profili, impostazioni, icone, validazione dell'identità HA; serve anche la build del frontend. |
| `upstream-tunet/` | File solo di riferimento di Tunet: changelog, documentazione, add-on, workflow. Non vengono costruiti. |

Nel frontend gli strati seguono una gerarchia: ogni strato importa solo da quelli precedenti.

1. `src/components/primitives`: componenti, tipografia e layout. Non conoscono Home Assistant.
2. `src/components/system`: barra di stato, indicatore pagina, fogli.
3. `src/components/widgets`: un widget per dominio HA.
4. `src/templates`.
5. `src/pages`.

Le altre cartelle seguono ADR-0008:

| Cartella | Contenuto |
|---|---|
| `@types` | Tipi globali e di dominio. |
| `api` | Client HA e backend. |
| `hooks` | Hook React. |
| `routes` | Instradamento. |
| `themes` | Tema Acasystem. |
| `utils` | Funzioni pure. |
| `validators` | Controlli dei dati a runtime. |

L'alias `@/` punta a `frontend/src`.

## Comandi (da questa cartella)

```text
npm install            dipendenze dei due workspace
npm run dev            frontend (Vite, porta 5173) e backend (porta 3002)
npm run build          build del frontend
npm test               test del frontend e del backend
npm run typecheck      controlli TypeScript
npm run lint           ESLint
```

Pagina di prova del kit, solo in sviluppo: `http://127.0.0.1:5173/kit.html`.

Home Assistant sta dietro Acasystem ([ADR-0009](../../documentazione/decisions/ADR-0009-home-assistant-dietro-acasystem.md)). Il browser parla solo con il server Acasystem, che inoltra a Home Assistant le richieste sotto `/ha`: HTTP in streaming e WebSocket, solo i percorsi usati dal frontend. L'accesso avviene con la pagina Acasystem (utente e password di Home Assistant).

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
