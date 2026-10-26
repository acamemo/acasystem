# ADR-0023 — App client «A-ibrida»: guscio per Windows e Android, interfaccia scaricata da un repository pubblico, server sul mini PC

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0023: l'app client di Acasystem per Windows (Electron) e Android (Capacitor) è un guscio che scarica l'interfaccia web dalle GitHub Releases di un repository pubblico nuovo e la collega al server Acasystem sul mini PC HA OS. |
| Stato | **Accettata** il 2026-10-26. La bozza dello stesso giorno era «Proposta»; l'utente ha risposto: «Accetto ADR-0023 così com'è. Procedi con C1 e C4.» |
| Data e autore | 2026-10-26. Bozza di Claude Code (Opus 5.5, `claude-opus-5-5`) nella chat dedicata di [REP-20261026-002](../reports/REP-20261026-002-app-client-pc-android.md). |
| Decisore e autorizzazione | Le scelte sono dell'utente, 2026-10-26, raccolte in REP-20261026-002 nelle sezioni «Risposte alle domande Q-A» e «Punti da confermare prima di C1». Citazione principale (Q-A3): «scarica l'ultima versione di acasystem da github, invece l'app all'avvio richiede l'indirizzo ip che fornisce HA OS, in maniera tale che inserito l'ip parte l'interfaccia e accesso aca». La sintesi in questa scheda è dell'agente. Accettazione dell'utente del 2026-10-26: «Accetto ADR-0023 così com'è. Procedi con C1 e C4.» |
| Collegamenti | REQ-15, REQ-18; [ADR-0009](ADR-0009-home-assistant-dietro-acasystem.md), [ADR-0021](ADR-0021-configurazione-dispositivi-da-acasystem.md), [ADR-0022](ADR-0022-identita-di-servizio-dispositivi.md); [REP-20261026-001](../reports/REP-20261026-001-installazione-github-aggiornamenti-chiavetta.md) (D-G1, D-G2, D-C6, D-C15); [REP-20261026-002](../reports/REP-20261026-002-app-client-pc-android.md). |
| Sostituisce / sostituita da | Nessuna. Precisa l'architettura «A. Finestra su Acasystem» scelta il 2026-10-26: l'interfaccia non arriva più dal mini PC. |

## Contesto ed evidenze

- **Fatto, dalla richiesta del 2026-10-26:** l'utente vuole un'app per Windows con installatore e una per Android. Al primo avvio l'app chiede l'IP di HA OS, poi mostra l'interfaccia e la pagina di accesso di Acasystem.
- **Fatto, dalla risposta a Q-A3:** l'installatore non contiene l'app. L'app scarica Acasystem da GitHub e la aggiorna da sola.
- **Fatto osservato nel codice** (`4e198c5` più l'albero di lavoro): Acasystem ha una parte server in `progetto/acasystem/backend/src/server.ts`, che comprende:
  - proxy `/ha` con WebSocket;
  - `/api/profiles`, `/api/settings` e `/api/casa3d` con `tunet.db`;
  - `/api/health`;
  - con D1, la facciata dei dispositivi e la chiave di servizio di ADR-0022.
- **Fatto osservato nel codice:** il server non ha CORS. Il frontend usa percorsi relativi. Il login di HA ricava `client_id` dall'origine della pagina (`frontend/src/api/haLogin.ts:84-94`).
- **Fatto osservato nel repository:** il repository `acamemo/acasystem` traccia anche `documentazione/` (150 file). L'utente non vuole renderla pubblica.
- **Fatto osservato nel repository:** la licenza è GPL-3.0 (`progetto/acasystem/LICENSE`). La pubblicazione dei sorgenti è compatibile con la licenza; il parere su D-C6 resta aperto in REP-20261026-001.

## Proposta o decisione

Proposta dell'agente, che riassume le scelte dell'utente.

1. **Guscio.**
   - Windows: Electron, installatore NSIS non firmato (Q-A2, Q-A5).
   - Android: Capacitor, APK firmato con un keystore custodito dall'utente fuori da Git (Q-A1, Q-A6).
   - Gli installatori li distribuisce l'utente con una chiavetta o un drive.
   - Il guscio si aggiorna a mano. Se l'interfaccia dichiara un `minShell` maggiore della versione del guscio, l'app mostra «Aggiorna l'app» (Q-A4).
2. **Procedura guidata.**
   - Al primo avvio chiede solo l'IP di HA OS; la porta di Acasystem è predefinita e si cambia nelle impostazioni avanzate (Q-A7).
   - Prima di salvare verifica `GET http://<IP>:<porta>/api/health`.
   - Gestisce un impianto per app, con «Cambia indirizzo» (Q-A8).
3. **Interfaccia.**
   - Il guscio scarica dalle Releases di un **repository pubblico nuovo** un archivio statico (frontend e Casa 3D) e un `manifest.json` con versione, SHA-256, `minServer` e `minShell` (P-3 bis).
   - Il repository nuovo contiene solo `progetto/acasystem`, con uno storico pulito. `acamemo/acasystem` resta privato e invariato.
   - All'avvio il guscio sceglie **l'ultima versione** pubblicata (P-1). Se `minServer` supera la versione letta da `/api/health`, usa l'ultima versione compatibile, dalla cache o da GitHub, e avvisa «Aggiorna il mini PC» (P-1 bis).
   - Il guscio verifica soltanto lo SHA-256 (P-2).
   - Il primo avvio richiede internet; dopo, se GitHub non risponde, usa la cache (P-4).
4. **Server sul mini PC HA OS** (Q-A3 ter). In futuro sarà l'app di HA OS di REP-20261026-001; nel frattempo è il banco del PC. Il server conserva dati, proxy e chiave di servizio, che non vanno mai nel guscio. Per servire l'interfaccia locale il server deve:
   - accettare CORS solo dalle origini fisse dei gusci;
   - fornire l'interfaccia con l'indirizzo del server come base di `/api`, `/ha` e WebSocket;
   - usare il `client_id` di HA con l'origine del server.
5. **Rete.** Solo la rete locale in HTTP (Q-A10); GitHub in HTTPS. Niente kiosk (Q-A9). Il guscio non apre pagine esterne e non conserva credenziali di HA oltre alla sessione di Acasystem web.

## Alternative e motivazioni

- **A originaria (interfaccia servita dal mini PC):** l'utente l'ha sostituita con la risposta a Q-A3, perché vuole l'app scaricata e aggiornata da GitHub.
- **Server dentro il client:** scartato dall'utente. Ogni dispositivo avrebbe un database proprio e la chiave di servizio su ogni dispositivo, contro ADR-0022.
- **Solo HA, senza server:** scartato. Si perderebbero i layout condivisi, Casa 3D e la facciata D1.
- **Ultima versione compatibile con il server (P-1 a):** l'utente ha scelto «sempre l'ultima». Il ripiego di P-1 bis evita le combinazioni incompatibili.
- **Firma Ed25519 (P-2 a):** non scelta. Il rischio residuo è indicato nelle conseguenze.
- **Rendere pubblico `acamemo/acasystem` o riscriverne la storia:** scartati con P-3 e P-3 bis.

## Conseguenze

- **Codice Acasystem:** servono modifiche limitate a frontend e backend (tappa C2: base URL configurabile, CORS, `client_id`, CSP), da coordinare con i flussi 0.9.29/0.9.30 e D1.
- **Compatibilità tra versioni:** il manifesto deve dichiarare in modo affidabile `minServer`. Se il valore è sbagliato, si torna al problema che P-1 bis vuole evitare.
- **Sicurezza:**
  - con il solo SHA-256, chi controlla il repository pubblico può mandare codice a tutti i client; la difesa è la protezione dell'account GitHub (2FA e accessi minimi);
  - HTTP in chiaro in LAN espone la sessione a chi è sulla stessa rete, come oggi il browser;
  - il guscio Android consente HTTP in chiaro e non può limitarlo a intervalli di IP: il compromesso va scelto in C6.
- **Pubblicazione:**
  - nascono un repository pubblico nuovo e Releases caricate a mano con `gh release`, su ordine dell'utente;
  - nessuna GitHub Action senza un'autorizzazione separata;
  - prima della pubblicazione serve una scansione dei segreti e dei dati personali sui file da pubblicare.
- **Licenza:** pubblicare i sorgenti GPL-3.0 soddisfa l'obbligo di renderli disponibili per i binari distribuiti. Il parere D-C6 resta aperto.
- **Dipendenze nuove:** Electron, electron-builder e Capacitor, nella cartella nuova `progetto/client/`.

## Annotazione del 2026-10-26: server locale e distribuzione Windows

Decisione dell'utente dello stesso giorno: «Pilota con zip su chiavetta (prova su ogni PC del pilota); per i clienti valuteremo Artifact Signing dopo aver chiarito il requisito dei 3 anni. Confermo il server locale su Windows. Procedi con C6 (Android).»

- **Punto 4 per Windows.** Il guscio serve l'interfaccia da `http://127.0.0.1:47320` e inoltra `/api` e `/ha`, WebSocket compreso, al server sul mini PC. Su Windows CORS, base URL e `client_id` del server non servono. Lo stesso schema si propone per Android in C6.
- **Punto 1 per il pilota Windows.** L'installatore NSIS è sostituito da uno zip non firmato su chiavetta, da provare su ogni PC del pilota per via di Smart App Control. Per i clienti si valuterà Azure Artifact Signing (confronto in REP-20261026-002). Q-A5 resta valida solo per il pilota.

## Verifiche e revisione

- Le prove sono previste da C7 di REP-20261026-002:
  - installazione su Windows;
  - IP sbagliato e IP giusto;
  - riavvio;
  - cache senza internet;
  - `minServer` e `minShell`;
  - Tab M11.
- Nessuna prova eseguita.
- **Rivedere** se:
  - Acasystem diventa un'app di HA OS con un'origine diversa;
  - si passa all'HTTPS (D-C15);
  - gli installatori vanno su store o su un sito;
  - l'utente sceglie la firma del manifesto.
