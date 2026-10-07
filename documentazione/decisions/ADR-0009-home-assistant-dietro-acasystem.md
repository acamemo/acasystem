# ADR-0009 — Home Assistant dietro Acasystem: proxy del server e accesso proprietario

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0009 — Home Assistant dietro Acasystem: proxy del server e accesso proprietario |
| Stato | Accettata |
| Data e autore | 2026-10-07; scheda redatta da Claude Code (Opus 5.5) |
| Decisore e autorizzazione | Utente committente, chat del 2026-10-07. «l'applicativo deve essere Home Assistant dietro Acasystem, HA è come se fosse il nostro backend già fatto, il frontend che stiamo realizzando invece è proprietario». Risposte alle domande: accesso «Pagina Acasystem»; banco «Appena verificata»; esposizione di HA in rete «non saprei», quindi resta invariata e la decisione è rimandata (vedi sotto). |
| Collegamenti | REQ-02, REQ-03, REQ-05, REQ-06; [ADR-0003](ADR-0003-home-assistant-locale-fase1.md), [ADR-0007](ADR-0007-acasystem-os.md), [ADR-0008](ADR-0008-struttura-frontend-backend.md); [REP-20261007-002](../reports/REP-20261007-002-ha-dietro-acasystem.md); ISSUE-006, ISSUE-016, ISSUE-027 (SEC-1/SEC-2) |
| Sostituisce / sostituita da | Integra ADR-0008: il backend diventa anche il punto d'accesso a Home Assistant. Nessuna sostituta. |

## Contesto ed evidenze

Fino al 2026-10-07 il browser si collegava direttamente a Home Assistant.
- La pagina di collegamento chiedeva l'indirizzo di HA, il metodo OAuth o token e un indirizzo di riserva, tutti salvati nel browser.
- Con OAuth l'utente passava dalla pagina di login di Home Assistant.
- Il backend Acasystem riconosceva l'utente validando il token presso `TUNET_INTERNAL_HA_URL`: dal 2026-10-07 è l'unica fonte di fiducia (SEC-1).

Il frontend usa Home Assistant in pochi punti, verificati sul codice:
- WebSocket `/api/websocket` per stati, servizi, cronologia, calendari e attività;
- REST `/api/camera_proxy`, `/api/camera_proxy_stream`, `/api/media_player_proxy`, `/api/image_proxy`, `/api/history` e HLS delle videocamere;
- autenticazione `/auth/token` (rinnovo) e, con il nuovo accesso, `/auth/providers` e `/auth/login_flow`.

## Decisione umana

1. **Home Assistant è il backend del prodotto; il frontend Acasystem è proprietario.** Il browser conosce solo l'indirizzo di Acasystem.
2. **Il server Acasystem fa da proxy verso Home Assistant.**
   - Inoltra HTTP e WebSocket sotto il prefisso `/ha` all'Home Assistant configurato sul server (`TUNET_INTERNAL_HA_URL`).
   - L'inoltro è in streaming e usa solo i moduli di Node, senza dipendenze nuove.
3. **Accesso proprietario.** La pagina di login è di Acasystem: stile Metallo, italiano, utente e password più codice a due fattori se attivo. Usa l'API di login di Home Assistant (`/auth/login_flow` e `/auth/token`). Il token a lunga durata resta come opzione per i tablet in modalità kiosk.
4. **Il banco** si aggiorna appena le verifiche sono superate.

## Scelte esecutive dell'agente (nel perimetro)

- **Lista consentita.** Il proxy inoltra solo i percorsi usati dal frontend; tutto il resto risponde 404. L'interfaccia di amministrazione di Home Assistant non passa da Acasystem.
- **Nessun `X-Forwarded-For` verso HA.** Home Assistant rifiuta questa intestazione da un proxy che non ha dichiarato fidato (`trusted_proxies`). Di conseguenza Home Assistant vede l'indirizzo del server Acasystem.
- **Limite ai tentativi di login** applicato da Acasystem per indirizzo del client, perché Home Assistant vede un solo indirizzo.

## Alternative e motivazioni

- **Browser collegato direttamente a HA** (situazione precedente). Richiede l'indirizzo di Home Assistant su ogni dispositivo e due porte esposte, e mostra l'interfaccia di login di HA. Scartata dall'utente.
- **Pagina di login di Home Assistant attraverso il proxy.** Meno codice, ma l'utente vede lo stile e la lingua di HA, e la pagina carica risorse a percorsi assoluti che entrerebbero in conflitto con quelli di Acasystem. Scartata dall'utente a favore della pagina Acasystem.
- **Add-on di Home Assistant con ingress.** Richiede Home Assistant OS con il Supervisor, non presente nel banco (HA in Docker). Non considerata ora.

## Conseguenze

- **Configurazione unica sul server:** il browser non chiede indirizzi. Una sola porta da esporre, anche per l'accesso remoto futuro.
- **Credenziali:** le credenziali di Home Assistant passano dalla pagina Acasystem e dal server Acasystem verso HA. Il server non le salva e non le registra nei log.
- **Token:** i token nel browser restano legati all'origine di Acasystem. Il primo accesso dopo il cambio richiede un nuovo login.
- **Protezioni di Home Assistant:** il limite ai tentativi e il ban per IP di HA vedono l'indirizzo del proxy. Annotazione del 2026-10-07 dopo la revisione di sicurezza (REP-20261007-002, SR-2/R-3):
  - il proxy limita per indirizzo del client solo l'avvio e i passi del login e gli upgrade WebSocket;
  - le autenticazioni con token non valido via REST non hanno un limite proprio e HA le attribuisce all'indirizzo del proxy;
  - finché il proxy non inoltra `X-Forwarded-For` con `trusted_proxies` in HA, la soglia di ban di HA (`login_attempts_threshold`) deve restare disattivata, come è di serie;
  - il provider `trusted_networks` non deve comprendere l'indirizzo del server Acasystem, e il proxy avvia solo il login con utente e password;
  - gli utenti HA «solo rete locale» non sono distinguibili attraverso il proxy.
  Inoltrare l'indirizzo reale resta una decisione dell'installazione.
- **Esposizione di HA in rete:** per ora invariata. Chiuderla, in modo che solo il server Acasystem raggiunga Home Assistant, resta una decisione dell'utente da prendere con l'installazione del pilota. Il proxy funziona in entrambi i casi.

## Verifiche e revisione

Esiti in [REP-20261007-002](../reports/REP-20261007-002-ha-dietro-acasystem.md):
- test del proxy (HTTP, WebSocket, lista consentita, intestazioni, streaming) con un finto Home Assistant;
- test del login (credenziali errate, due fattori, rinnovo e revoca dei token);
- prova sul banco con l'Home Assistant reale, senza usare credenziali dell'utente.

Revisione se Home Assistant cambia l'API di login, se si sceglie l'ingress o se si chiude Home Assistant alla rete.
