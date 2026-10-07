# REP-20261007-002 — Home Assistant dietro Acasystem: proxy e accesso proprietario

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261007-002 |
| Stato | In corso |
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

Da compilare.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Da compilare | — | Non eseguito | — |

## Controllo del diff e decisioni

Da compilare.

## Chiusura e punto di ripresa

In corso.
