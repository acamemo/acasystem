# REP-20261028-002 — Backend e funzioni collegate a Home Assistant: audit, correzioni e refactor

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261028-002, secondo task della notte del 2026-10-28 |
| Stato | In attesa di input (correzioni e refactor fatti e verificati, non committati; proposte in ISSUE-128) |
| Data | 2026-10-28, dalle 03:15 circa (Europe/Rome) |
| Autore / modello | Claude Code, `claude-opus-5-5`; subagenti Claude Code (modello Sonnet) per l'audit in sola lettura e per il refactor del backend |
| Commit di partenza | `4c223d3`, con il lavoro non committato di [REP-20261028-001](REP-20261028-001-audit-css-refactor.md) nell'albero |
| Richiesta di riferimento | «ripeti i test e i miglioramenti e lo stesso prompt anche lato backend e funzionalità collegate ad HA, in maniera tale che domani posso dire di avere l'app quasi completa e funzionante, ti è concesso usare l'accesso a internet per cercare informazioni» |
| Autorizzazione | Stesso perimetro del task 1 (REP-20261028-001): refactor a parità di comportamento e piccole correzioni, senza nuove funzioni né decisioni di prodotto. Ricerca su internet consentita. Commit, push e banco non richiesti. |

## Obiettivo e perimetro

- Audit del backend (`progetto/acasystem/backend/src`, 88 file, 14.567 righe) e delle parti del frontend che parlano con Home Assistant.
- Confronto delle API di HA usate con le note di rilascio recenti di HA.
- Correzione dei difetti netti con un test di regressione ciascuno.
- Refactor a parità di comportamento.
- Ripetizione dei test del frontend e del collaudo funzionale con HA simulato.
- Esclusi: nuove funzioni; scelte di sicurezza o di prodotto (restano proposte); prove con un HA reale che richiedono l'accesso dell'utente.

## Criteri di completamento

1. Typecheck, lint e suite del backend e del frontend verdi.
2. Ogni difetto corretto ha un test che fallisce sul codice di partenza e passa dopo.
3. Collaudo funzionale con HA simulato su prima e dopo, senza differenze.
4. Inventario delle API di HA confrontato con le note ufficiali, con fonti e date.
5. Report, registro dei problemi e stato del progetto aggiornati.

## Audit

Un subagente ha letto il backend e le parti del frontend collegate a HA, senza modificare nulla. Il rapporto completo è in `backup/backend-refactor/audit-backend.md`, fuori da Git. L'agente principale ha ricontrollato nel codice i punti usati qui sotto.

- **Architettura.** Il backend fa da proxy verso HA su `/ha`: un tunnel WebSocket trasparente e 15 percorsi HTTP ammessi. Le API proprie stanno su `/api` (profili, impostazioni, Casa 3D, dispositivi) e sono protette dalla verifica del token presso HA (`auth/current_user`). La facciata dei dispositivi (ADR-0021/0022/0024) agisce con l'identità di servizio.
- **API di HA usate:**
  - 21 percorsi REST;
  - circa 45 comandi WebSocket;
  - circa 100 servizi;
  - gli attributi per dominio.

  L'elenco completo con file e riga è nella sezione 2 del rapporto.
- **Punti forti verificati:** nessun path traversal o SSRF nel proxy; percorsi in lista chiusa; il segreto di servizio non compare in registri, risposte o log, e i test lo verificano; socket chiusi in tutte le fasi.

### Confronto con le note di rilascio di HA (ricerca su internet, 2026-10-28)

| Fonte | Cambiamento | Effetto su Acasystem |
|---|---|---|
| [Note di 2026.10](https://www.home-assistant.io/blog/2026/10/07/release-202610/), «Backward-incompatible changes» | Tolta la modalità legacy del provider di autenticazione; i nomi utente sono sempre normalizzati (minuscole, senza spazi ai bordi) | Nessuno: l'utente di servizio è `acasystem_servizio` (`config/devices.ts:13`), già normalizzato |
| Stesse note, patch 2026.10.2 | Il comando di creazione delle credenziali protegge il proprietario e le credenziali esistenti; togliere un utente revoca i suoi token | Già gestito in `identityActivation.ts:339-345` (commento «HA 2026.10 changed these commands») |
| [Contributors blog, 2026-08-19](https://contributors.home-assistant.io/blog/2026/08/19/device-registry-websocket-api-changes/) | Registro dispositivi: `config_entry_id` al posto di `config_entries` e `primary_config_entry` (rimossi in 2027.8); `remove_config_entry` deprecato (rimosso in 2027.9) a favore di `config/device_registry/remove` | Il backend (`haAdapter.ts:245-283`) e il frontend (`haClient.ts:413`, `RemoveDevice.tsx:43`) leggono già il campo nuovo; il vecchio resta solo come riserva. Nessun uso di `remove_config_entry` |
| [Beta](https://rc.home-assistant.io/latest-release-notes) | Alle 03:30 del 2026-10-28 mostra ancora 2026.10: le note di 2026.11 non sono pubblicate | Da ricontrollare all'uscita di 2026.11 (ISSUE-124) |

Nessun cambiamento noto rompe le API usate. ISSUE-126 (Samsung serie J cifrata): la ricerca non ha trovato una correzione ufficiale. Un fork della comunità ([danalec/ha-samsungtv](https://github.com/danalec/ha-samsungtv)) segnala che le TV H e J rifiutano i tasti quando l'integrazione ricade sul canale legacy (porta 55000) invece che su quello cifrato (porta 8000). È un'affermazione non verificata, utile per la diagnosi; la [documentazione ufficiale](https://www.home-assistant.io/integrations/samsungtv/) conferma solo che le serie H e J usano un protocollo cifrato con abbinamento manuale.

## Avanzamento e modifiche

**Correzioni (difetti netti, ciascuno con un test che fallisce sul codice di partenza):**
- **S1, limite generale aggirabile.** Il limitatore di `/api` era montato prima di `stripIngressPath`: una richiesta `/x/api/...` con `X-Ingress-Path: /x` non veniva contata. Ora l'URL viene ripulito prima del limitatore (`server.ts`). Test in `server.test.ts`.
- **S4.** `express.json` ora viene dopo il limitatore: chi supera il limite viene respinto prima che il corpo sia letto. Comportamento invariato per le richieste lecite.
- **S2, cache della verifica dei token senza limite.** Un flusso di token inventati la faceva crescere senza fine, perché la potatura avveniva solo dopo un successo. Ora avviene anche dopo un rifiuto, con il tetto di 200 voci già previsto (`homeAssistantAuthService.ts`). Test in `haAuth.test.ts`.
- **S3, verifica senza timeout.** Con un HA che accetta la connessione ma non risponde (VM sospesa), la richiesta restava appesa per sempre. Ora si arrende dopo 10 s e chiude la connessione tardiva. Test in `haAuth.test.ts`, con un server WebSocket muto.
- **S8, due tocchi simultanei sulla stessa scoperta.** Il secondo dava 500 (chiave primaria duplicata in `device_flows`). Ora risponde 409 «Un passaggio è già in corso», con lo stesso meccanismo `busyFlows` già usato dai passi (`deviceService.ts`). Il test sul codice di partenza ha dato davvero 500.

**Non corretti di proposito:**
- **S5** (500 per un corpo assente): sui dispositivi è già 400; su profili e impostazioni il 500 è una parità voluta con Tunet, documentata in `validators/common.ts` e fissata da `apiRoutes.test.ts:185`.
- Il silenzio dell'elenco «Trovati in rete» su alcuni errori di rete: è una scelta documentata in `useDiscoveredDevices.ts`; le proposte stanno in ISSUE-122.

**Refactor a parità di comportamento** (subagente, rivisto dall'agente principale):
- **Controller di profili, impostazioni e Casa 3D:** tre helper in `controllers/requestUser.ts` (`authed`, `andThen`, `respond`) al posto del controllo utente → validazione → risposta ripetuto 24 volte (circa −158 righe). Ordine dei controlli, messaggi e 500 voluto invariati.
- **`haAdapter.ts`:** `swallowNotFound` per i quattro `try/catch` di «non trovato» (`automationDelete` accetta anche `bad_request`, come prima); `notFoundBody` per le due sonde; una sola `wsApi` al posto di `oneShotApi` e `wsApiFor`.
- **`deviceService.ts`:** `reserveFlowSlot` per le tre prenotazioni di un posto di flusso, con l'ordine dei controlli di ciascun chiamante conservato.
- **`helpers/text.ts`:** `asString` e `displayText` condivisi da `tvClassify`, `haAdapter`, `catalog` e `flowModel`. L'`asString` di `haAdapter`, che accetta la stringa vuota, è rimasto suo.
- **`haTransport.ts`:** tolto il timer fittizio delle sottoscrizioni. **Rivisto dall'agente principale:** in quel punto ci sono solo voci senza timer, quindi togliere `clearTimeout` non cambia nulla.
- **Codice morto** (verificato con grep, test inclusi): `deriveBroadcastAddress`, `translateFormError`, `translateAbortReason` e `req.authenticatedHaUrl`, che veniva scritto ma mai letto. Tolto 1 test che copriva solo `deriveBroadcastAddress`; 3 test ora usano i testi italiani letterali al posto delle funzioni tolte. Tenuti `parseIntegrationDescriptions` (funzione D3 in sospeso) e `ALL_HA_CALLS` (lo usa il test architetturale).
- **Fine riga:** ogni file ha i suoi; `deviceService.ts` e `haTransport.ts` restano CRLF. Prettier non si usa sul backend, che non ha configurazione: un primo tentativo aveva riformattato tre file interi, poi riportati a HEAD e corretti a mano.

**Collaudo funzionale del frontend** (`e2e/isolated-browser.check.mjs`, HA simulato): lo script si fermava già sulla build di partenza per due passi superati dall'interfaccia. Il cursore «Pagina» a riposo è `aria-hidden`; le impostazioni in modifica si aprono con Invio sulla maniglia (ADR-0016). Lo script è aggiornato (+6/−4).

**Numeri:**
- produzione del backend da 14.567 a 14.389 righe;
- diff del backend +328/−453 su 20 file, test compresi;
- un file nuovo, `helpers/text.ts`.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Riferimento backend | `npm run typecheck`, `lint`, `npx vitest run` a `4c223d3` | Superato | 33 file, 523 passati e 1 saltato (`backup/backend-refactor/baseline/`) |
| Backend dopo | Stessi comandi | Superato | 33 file, 526 passati e 1 saltato: +4 test nuovi (S1, S2, S3, S8), −1 test del codice morto |
| Test che colgono il difetto | S8 eseguito sul `deviceService.ts` di partenza | Superato | Sul vecchio codice il secondo tocco dà 500, il test fallisce. Per S1, S2 e S3 la verifica è per costruzione: senza la correzione mancano l'intestazione del limite, la ri-verifica del token più vecchio e il rifiuto entro 10 s |
| Backend nuovo contro l'HA reale del PC (2026.9.4) | `node src/server.ts` su `:3041` con `TUNET_INTERNAL_HA_URL=http://127.0.0.1:8123`, dati in una cartella temporanea | Superato | `/api/health` 200; proxy `/ha/auth/providers` 200; percorso non ammesso 404 `HA_PATH_NOT_ALLOWED`; `/api/settings` senza token 401; tunnel WebSocket: `auth_required` 2026.9.4, poi `auth_invalid` con un token falso; token falso su `/api/settings`: 401 `HA_AUTH_INVALID` in 77 ms; avvio del login: modulo nome utente/password (non compilato, flusso chiuso). La sonda riconosce 2026.9.4 come verificata; flussi spenti perché l'identità di servizio non è attiva in quella cartella dati |
| Frontend | `npm run typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `npx vitest run --maxWorkers=4` | Superato | 0 violazioni; 232 file, 3450/3450 |
| Collaudo funzionale con HA simulato | `e2e/isolated-browser.check.mjs` (copia con porta configurabile), build di partenza contro build nuova, Chromium senza GPU | Superato | Entrambe: 240 viste (20 tipi × 4 taglie × 390/1280/1920 px) senza sbordamenti né errori di pagina, dettagli da tastiera; preferenze conservate al riavvio; gesto sul cursore della luce con 1-2 comandi e conferma di HA che chiude l'attesa; movimento ridotto. Prima della correzione dello script entrambe si fermavano allo stesso passo superato |
| Prove con l'account dell'utente e con dispositivi reali | — | Non eseguito | Servono le credenziali dell'utente (l'agente non le inserisce) e la TV; lo stesso vale per l'identità di servizio |
| Banco | — | Non eseguito | Il banco 3002 è ancora alla 0.9.32: aggiornarlo non era richiesto |

## Controllo del diff e decisioni

- **Diff:** il backend cambia in 20 file (+328/−453) più un file nuovo, `helpers/text.ts`; il frontend solo nello script e2e (+6/−4).
- **Rispetto alla richiesta:** test ripetuti su backend e frontend; correzioni e refactor applicati allo stesso modo del task 1; API di HA confrontate con le note ufficiali grazie alla ricerca online; funzioni collegate a HA provate con HA simulato e, dove non servono credenziali, con l'HA reale.
- **Cosa resta per dire «quasi completa»:**
  - la prova con il tuo account e con dispositivi veri (TV, identità di servizio sul Dell, ISSUE-121, ISSUE-123, ISSUE-125);
  - le decisioni di ISSUE-127 e ISSUE-128;
  - ISSUE-126, la Samsung che ignora i tasti.
- Nessun ADR nuovo. Nessun commit, push o banco.

## Chiusura e punto di ripresa

**Stato:** in attesa di input. Il lavoro è nell'albero di lavoro, verificato e non committato, insieme a quello di REP-20261028-001. Server locali fermati per PID; il flusso di login aperto su HA è stato chiuso (DELETE 200).

**Punto di ripresa:**
1. prova con il tuo account su un'istanza della build nuova;
2. commit dei due report, su richiesta;
3. aggiornamento del banco, su richiesta;
4. decisioni su ISSUE-127 e ISSUE-128.
