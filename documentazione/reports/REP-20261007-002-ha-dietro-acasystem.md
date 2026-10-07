# REP-20261007-002 — Home Assistant dietro Acasystem: proxy e accesso proprietario

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261007-002 |
| Stato | Completato e verificato; banco su `aca-system:0.3` |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`), orchestratore; subagenti general-purpose per corsie e revisione |
| Commit di partenza | e192121, con le modifiche non committate successive; istantanea `usa-come-git/v013` |
| Richiesta di riferimento | Chat del 2026-10-07: «è possibile rendere questo applicativo avviabile più facilmente? […] il frontend come unica richiesta chieda il localhost configurato», poi «l'applicativo deve essere Home Assistant dietro Acasystem, HA è come se fosse il nostro backend già fatto, il frontend che stiamo realizzando invece è proprietario». Risposte: accesso «Pagina Acasystem», banco «Appena verificata», esposizione di HA «non saprei». |
| Autorizzazione | [ADR-0009](../decisions/ADR-0009-home-assistant-dietro-acasystem.md). Inclusi: proxy HTTP/WebSocket nel backend, pagina di accesso Acasystem con l'API di login di HA, adeguamento del frontend, aggiornamento del banco dopo le verifiche. Esclusi: nuove dipendenze, commit, modifiche alla configurazione e alla rete di Home Assistant, chiusura di HA alla rete. |

## Obiettivo e perimetro

Il browser parla solo con Acasystem. Il server inoltra a Home Assistant le richieste del frontend sotto `/ha`, e l'utente accede con una pagina Acasystem. Nessuna richiesta di indirizzo nel browser.

## Criteri di completamento

- **Proxy `/ha`:**
  - HTTP in streaming e WebSocket verso `TUNET_INTERNAL_HA_URL`;
  - lista consentita (login, token, revoca, WebSocket, immagini e flussi delle videocamere, cronologia, HLS) e 404 per il resto;
  - nessun `X-Forwarded-*`, limite ai tentativi di login, test con un finto HA.
- **Accesso:**
  - pagina Acasystem con utente e password, due fattori, errori chiari in italiano;
  - token a lunga durata sotto «Altre opzioni»;
  - rinnovo e revoca dei token attraverso il proxy;
  - nessun indirizzo di HA chiesto o salvato nel browser.
- **Frontend:** tutte le chiamate a Home Assistant passano da `origine/ha`; Vite in sviluppo inoltra `/ha` con WebSocket.
- **Verifiche:** typecheck, lint, tipografia, colori, suite, build, immagine e prova sul banco con l'HA reale senza credenziali dell'utente; poi aggiornamento del banco.

## Avanzamento e modifiche

**Implementazione** (workflow `wf_262e7136-d0c`, due corsie a proprietà esclusiva):
- **Proxy (backend):** `config/homeAssistantProxy.ts`, `helpers/homeAssistantProxyPaths.ts`, `services/homeAssistantProxyService.ts`, `routes/homeAssistantProxy.ts`, limiti in `middlewares/rateLimit.ts`, montaggio in `server.ts`, solo moduli di Node.
  - Inoltro HTTP in streaming sotto `/ha` e tunnel WebSocket su `/ha/api/websocket`.
  - Lista consentita con i metodi per percorso; percorso mai decodificato e attraversamenti rifiutati.
  - Intestazioni in lista consentita (niente Cookie, Origin, X-Forwarded-*); Set-Cookie e CSP di HA tolti.
  - Errori 502/503/404 JSON; limite di accesso per indirizzo.
- **Accesso (frontend):**
  - `api/haUrl.ts` (hassUrl = origine + percorso base + `/ha`), `api/haLogin.ts` (provider, flusso utente/password e codice a due fattori, scambio del codice, errori in italiano), `api/haSession.ts` (token, rinnovo e revoca con HAWS);
  - nuova pagina di accesso in `pages/connect` con «Altre opzioni» per il token kiosk;
  - Sistema con «Esci» che revoca il token;
  - rimossi il flusso OAuth con reindirizzamento, gli indirizzi nel browser e `x-ha-url`;
  - Vite inoltra `/ha` con WebSocket.

**Revisione di sicurezza e collaudo** (stesso workflow): 9 rilievi di sicurezza (SR-1…SR-9) e 2 del collaudo (F1, F2), tra cui:
- SR-1 (alta): il proxy deve avviare solo il login con utente e password;
- SR-3: una risposta malformata di HA fermava il processo.

**Correzioni** (workflow `wf_0a8adfee-7d8`, poi l'orchestratore):
- SR-1: corpo dell'avvio letto fino a 4 KB, solo `handler[0] === 'homeassistant'`, altrimenti 404; 413 oltre il limite; 408 se il corpo non arriva entro 10 s (R-6).
- SR-3/R-1: stato e intestazioni di HA controllati, reason phrase standard, 502 invece di un crash; una risposta HTTP deve essere finale (200-599).
- SR-4: attesa massima di 30 s per la prima risposta (504 `HA_TIMEOUT`), senza limiti sugli stream avviati.
- SR-2: limite di 30 upgrade WebSocket al minuto per indirizzo. Il resto è documentato in ADR-0009 e nel README: requisiti di HA e nessun limite sulle autenticazioni REST non valide.
- SR-7/F1: miniature del media browser consentite.
- SR-8/R-2: `default-src 'none'; sandbox` e `nosniff` sulle risposte di HA, anche sul rifiuto dell'handshake.
- SR-5: comportamento h2c documentato.
- SR-6: revoca dei token del vecchio collegamento diretto.
- F2: dopo «Esci» e un nuovo accesso si torna al launcher.
- SR-9/R-4: timeout dei test sotto carico (15 s globale).

**Su richiesta dell'utente** («Commit the working tree changes») è stato creato il commit `13e5537` su `master`. Nota rispetto ad ADR-0008, che prevedeva solo istantanee senza commit: l'utente ha chiesto il commit in modo esplicito, e le istantanee restano come copia in più. Le correzioni R-1, R-2, R-6, R-4 e la documentazione successive al commit non sono committate.

**Lavoro parallelo:** mentre l'immagine veniva preparata, l'utente ha avviato un altro agente sul kit (`themes/acasystem`). Per non includere le sue modifiche a metà, l'immagine `aca-system:0.3` è costruita dall'istantanea `usa-come-git/v014`, presa prima del suo avvio. Erano già presenti da un'altra sessione ritocchi al movimento del kit, firmati «emil-design-eng review, 2026-10-07»: sono conservati e inclusi.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Test del proxy | `npx vitest run` nel backend | Superato | 16 file, 138/138; tsc ed ESLint a 0. Test di aggiramento, malformazioni, timeout, limiti, WebSocket. |
| Revisione indipendente delle correzioni | Finti HA locali, 40 tentativi di aggirare SR-1, 29 risposte malformate, mutazioni | Superato | 9 mutanti uccisi su 10; nessun crash; nessun aggiramento. |
| Collaudo end-to-end con finto HA | Playwright: accesso, credenziali errate, due fattori, ricarica, rinnovo, Esci con revoca, token kiosk, HA spento, limite di accesso | Superato | Screenshot nello scratchpad di sessione. |
| Frontend | `tsc`, `eslint src`, tipografia, colori, `npx vitest run`, build, budget | Superato | 118 file, 1327/1327; index 681,5/900 KB. |
| Immagine | `docker build -t aca-system:0.3` dall'istantanea v014; container temporaneo sulla porta 3012 verso l'HA reale | Superato | health ok; `/ha/auth/providers` 200 dall'HA reale; `/ha/api/states` 404; camera_proxy senza token 401 da HA; WebSocket `auth_required` (HA 2026.9.4) e `auth_invalid` con token finto; CSP del proxy e nosniff sulle risposte di HA. Nessun login inviato all'HA reale. |
| Banco localhost:3002 | `docker compose stop`, copia a freddo del volume, `image: aca-system:0.3`, `up -d --no-build` | Superato | Copia `backup/banco/tunet-data-20261007-pre-0.3-freddo.tgz`; container `healthy`; `/ha/auth/providers` 200 attraverso il banco; pagina di accesso Acasystem visibile senza campi di indirizzo. Il login reale lo fa l'utente con le sue credenziali. |

## Controllo del diff e decisioni

- Il diff riguarda il proxy nel backend, l'accesso e gli indirizzi nel frontend, la configurazione di Vite e la documentazione. Nessuna dipendenza nuova (`ws` ed `express-rate-limit` c'erano già); nessuna modifica a Home Assistant.
- Residui accettati e documentati:
  - autenticazioni non valide via REST senza un limite proprio;
  - h2c fuori da `/ha` riceve 404;
  - `/local/…` e `/api/image/serve/…` non inoltrati;
  - dopo «Indietro» del browser o una ricarica su Sistema, il nuovo accesso riapre Sistema;
  - con più secondi fattori si usa il primo;
  - un client_id con IP pubblico non è accettato da HA.
- Decisioni per l'utente:
  - chiudere Home Assistant alla rete (risposta «non saprei», per ora invariato);
  - inoltrare l'indirizzo reale a HA con `trusted_proxies`.

## Chiusura e punto di ripresa

Completato e verificato. Banco su `aca-system:0.3`: al primo uso l'utente accede con la nuova pagina Acasystem, con utente e password di Home Assistant. I vecchi token del collegamento diretto vengono revocati e cancellati. Ripristino: `image: aca-system:0.2` in `compose.tunet.yaml` e lo stesso comando. Istantanea `usa-come-git/v014`.
