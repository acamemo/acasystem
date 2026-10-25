# REP-20261012-004 — Versione dell'applicativo nel file .env e in fondo a Sistema

| Campo | Valore |
|---|---|
| Stato | Completato; banco `aca-system:0.9` |
| Data | 2026-10-12, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`); chiusura dei documenti con Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`) |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` più il working tree non committato |
| Richiesta di riferimento | Chat del 2026-10-12. |
| Autorizzazione | La richiesta qui sotto. |

## Richiesta

> «nel file env scriviamo la versione e la aggiorniamo anche nelle impostazioni quando si va giù a tutto»

## Situazione di partenza

- In fondo a Sistema, la sezione «Informazioni» (`AboutSection.tsx`) mostra già la riga «Versione».
- Il valore è quello di `/api/health`, cioè `backend/package.json`, sempre «0.1.0»; il ripiego è `__APP_VERSION__` dal `package.json` del frontend.
- La versione del banco (`aca-system:0.x`) era scritta solo nel tag dell'immagine nel compose.

## Modifiche

- **`progetto/.env`:** `ACASYSTEM_VERSION=0.9`. Il compose lo legge da solo, perché è nella cartella del progetto compose. È escluso da Git (`.gitignore`: `.env`).
  - **`progetto/.env.example`:** stessa chiave, versionato, da copiare.
- **`progetto/compose.tunet.yaml`:** il valore passa a tre punti:
  - il tag dell'immagine, `aca-system:${ACASYSTEM_VERSION:?…}`: senza la variabile il compose si ferma con un messaggio;
  - l'argomento di build `ACASYSTEM_VERSION`;
  - la variabile d'ambiente del container.
- **`progetto/acasystem/Dockerfile`:** `ARG`/`ENV ACASYSTEM_VERSION` nello stadio che costruisce il frontend.
- **`backend/src/config/version.ts`:** `resolveAppVersion` usa prima `ACASYSTEM_VERSION`, poi `backend/package.json`, poi `unknown`. `/api/health` restituisce quindi «0.9».
- **`frontend/vite.config.js`:** `__APP_VERSION__` vale `ACASYSTEM_VERSION` se c'è, altrimenti la versione del `package.json`. È il ripiego di Sistema quando `/api/health` non risponde.
- **Per aggiornare la versione:** cambiare `ACASYSTEM_VERSION` in `progetto/.env` prima di `docker compose -f progetto/compose.tunet.yaml up -d --build`.

## Verifiche ed evidenze

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Interpolazione del compose | `docker compose -f progetto/compose.tunet.yaml config` | Superato | `image: aca-system:0.9`, `args` e `environment` con «0.9»; con `ACASYSTEM_VERSION=x` nella shell vale «x». |
| Test del backend | `npx vitest run` in `backend` | Superato | 17 file, 141 test, compreso il nuovo `version.test.ts` con 3 casi: variabile, ripiego, `unknown`. |
| Typecheck, lint e prettier del backend | `npm run typecheck`, `npm run lint`, `npx prettier --check` | Superato | Nessun errore. |
| Banco 0.9 | `docker compose -f progetto/compose.tunet.yaml up -d --build`, poi `/api/health` | Superato | Il 2026-10-12 il container è `healthy` e `/api/health` risponde `{"status":"ok","version":"0.9"}`; immagine `aca-system:0.9`. Dettagli in [infrastructure.md](../infrastructure.md). |
| Riga «Versione» in Sistema → Informazioni, a schermo | Sul tablet delle demo, via CDP | Superato (2026-10-12) | Aperta Sistema dall'ingranaggio, la voce «Versione» in fondo mostra «0.9». Screenshot `scratchpad/device/09-sistema-versione.png`. |

## Chiusura e punto di ripresa

**Esito:** completato nel codice e sul banco `aca-system:0.9`. L'immagine, `/api/health` e il ripiego del frontend leggono tutti `ACASYSTEM_VERSION` da `progetto/.env`.

**Ripresa:** per la 0.9.1 basta cambiare `ACASYSTEM_VERSION` in `progetto/.env` e ricostruire.
