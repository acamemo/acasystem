# REP-20261026-004 — Account di Home Assistant gestiti da Acasystem (piano)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261026-004; piano per creare il primo account (proprietario) e gestire gli altri account di HA da Acasystem. REQ-05, REQ-06, REQ-17; ISSUE-006, ISSUE-008 |
| Stato | In attesa di input (domande Q-U1…Q-U17). Sezione 7 aggiunta lo stesso giorno, sul requisito dell'utente «copiare pari passo» |
| Data | 2026-10-26 |
| Autore / modello | Claude Code, modello `claude-opus-5-5`, sessione avviata da un'altra sessione dello stesso progetto |
| Commit di partenza | `4e198c5cd2d01cd5d50ac3a28275a3f8b3d24808`; il working tree contiene lavoro non committato di altri flussi (0.9.28-0.9.30, parte server di D1 in `backend/src/services/devices/`, app client). Nessun commit in questo incarico |
| Richiesta di riferimento | Utente, 2026-10-26, riportata dalla sessione che ha avviato questa: nell'app client «si può accedere ma non creare account». Su un HA nuovo (il Dell 192.168.1.184 appena installato) il proprietario si crea solo dall'onboarding di HA e gli altri account solo dall'interfaccia di HA. Incarico: «Prepara un PIANO (solo documenti, nessun codice…) perché Acasystem gestisca gli account di Home Assistant senza che l'utente apra l'interfaccia di HA» |
| Autorizzazione | Solo questo report e la riga nell'indice dei report. Nessuna modifica a codice, banco, HA, Dell, tablet o GitHub; nessuna decisione presa al posto dell'utente; nessun account creato |

## Requisito dell'utente (2026-10-26, vincolo del piano)

Testo dell'utente, riportato dalla sessione che coordina (chat «Piano app client Acasystem Windows/Android»):

> «il requisito è registrarsi su HA senza mostrare la sua interfaccia, noi possiamo anche copiare pari passo tutti gli step che di base HA chiede, in maniera tale da stare coperti, ma esteticamente l'UI sarà la nostra»

Conseguenze, come le ha riassunte la sessione che coordina:
- l'opzione di base replica **passo per passo** la configurazione iniziale di HA con le stesse API di HA (`/api/onboarding/*`) e la grafica di Acasystem, senza passi saltati o inventati rispetto a HA 2026.9.4, con verifica su 2026.10.x;
- lo stesso vale per gli altri utenti, come equivalente di «Persone e utenti» di HA;
- per ogni passo vanno indicati l'API, i campi, gli errori con il testo italiano e i percorsi del proxy `/ha`.

Il dettaglio è nella sezione 7, aggiunta dopo la prima stesura. Dove le sezioni 2-6 propongono altro, prevale la sezione 7.

**Dell di prova** (osservazione della sessione che coordina, 2026-10-26 12:31, sola lettura):
- HA OS su `192.168.1.184` risponde sulla porta **80**: `/` → 302 `/onboarding.html`; la porta 8123 → 307 verso `http://192.168.1.184/`;
- `GET /api/onboarding` riporta i quattro passi con `done: false`;
- Acasystem non c'è (la 3002 non risponde).

L'utente vuole usare il Dell per creare il primo account tramite Acasystem.

Legenda: **[F]** fatto letto in una fonte primaria (codice o documentazione), con data; **[O]** osservazione nel repository di Acasystem; **[V]** valutazione dell'agente; **[P]** proposta dell'agente, non approvata; **[DV]** da verificare su un HA acceso.

## Risposta breve (per chi non è tecnico)

**Aggiornamento dello stesso giorno.** Con il requisito dell'utente («copiare pari passo» i passi di HA con la grafica di Acasystem), la base del piano è la **sezione 7**: Acasystem rifà uno per uno i passi della configurazione iniziale e del pannello Persone di HA, con le stesse API, e la prima prova si fa sul Dell, con un Acasystem di prova sul PC. Il testo che segue è la prima stesura.

- **Primo account (proprietario).** HA lo crea con una chiamata che **non chiede password a nessuno**: chi arriva per primo sulla rete diventa proprietario. Acasystem può farla al posto dell'interfaccia di HA, ma c'è un nodo: **su HA OS Acasystem si installa dopo che il proprietario esiste**, perché per installare un'app serve già un amministratore. Quindi sul Dell nuovo una pagina «Crea il proprietario» dentro Acasystem non comparirebbe mai. Serve uno strumento sul PC dell'installatore (l'app client per Windows in «modalità installatore» o lo script del laboratorio di REP-20261026-001). Questo strumento crea il proprietario, completa i passi iniziali di HA e poi installa Acasystem. La pagina dentro Acasystem resta utile solo dove Acasystem gira prima di HA, come il banco in Docker.
- **Altri account** (cliente, familiari, amministratore di condominio). Acasystem può crearli, rinominarli, disattivarli ed eliminarli con gli stessi comandi che usa l'interfaccia di HA. Due limiti di HA:
  - le password degli altri le può reimpostare **solo il proprietario**, non un amministratore qualsiasi né l'identità «Acasystem (servizio)»;
  - HA ha solo tre gruppi fissi (amministratori, utenti, sola lettura) e nessun permesso «per casa» o «per dispositivo» configurabile.

  L'amministratore di condominio va quindi isolato in Acasystem, e prima va chiuso il tunnel non filtrato verso HA (D-D16).
- **Consiglio [P]:**
  1. strumento d'installazione sul PC per il proprietario;
  2. pagina «Account» in Sistema, usabile solo con l'account dell'installatore o del proprietario;
  3. procedura «Consegna al cliente», che crea l'account del cliente, chiude e disattiva quello dell'installatore e controlla che il tablet non resti amministratore.

  L'amministratore di condominio viene dopo il filtro del tunnel. Le scelte sono nelle domande Q-U1…Q-U12.

## Obiettivo e perimetro

**Obiettivo.** Un piano, da sottoporre all'utente, perché gli account di HA si creino e si gestiscano da Acasystem senza aprire l'interfaccia di HA. Il piano copre due casi:

1. primo account (proprietario) su un HA appena installato;
2. altri account e ruoli, con il flusso confermato «admin solo nel primo setup → logout → login cliente» (REQ-06/AC-06).

**Ammesso:** questo report e la riga in `documentazione/reports/README.md`.

**Escluso:**
- codice (`progetto/acasystem` è modificato in contemporanea dai flussi 0.9.31, D1 e launcher);
- banco, VM, Dell 192.168.1.184, tablet, GitHub;
- creazione di account o onboarding su qualsiasi HA;
- modifica di ADR, PRD o `project-status.md`. L'aggiornamento dello stato resta alla sessione che coordina, perché `project-status.md` è modificato da altri flussi.

**Modifiche preesistenti.** Il working tree contiene molte modifiche non committate di altri flussi (`git status` all'avvio). Questo incarico aggiunge un solo file nuovo e una riga nell'indice e non tocca altro.

## Criteri di completamento

- Contesto con fatti datati da fonti primarie (codice di HA al tag 2026.9.4, confronto con 2026.10.4, documentazione ufficiale).
- Per ognuno dei due casi: opzioni con pro e contro, proposta consigliata, rischi.
- Elenco dei percorsi da aggiungere al proxy `/ha`, oppure motivazione per non aggiungerli.
- Domande numerate per l'utente, tappe stimate, criteri di completamento delle tappe future.
- Riga nell'indice dei report. Nessun'altra modifica.

## 1. Contesto

### 1.1 Acasystem oggi [O]

- `frontend/src/api/haLogin.ts`: l'accesso usa `GET /auth/providers`, `POST /auth/login_flow…` e `POST /auth/token` attraverso il proxy `/ha`. Se HA risponde 400 con `message_code: onboarding_required`, la pagina mostra «Home Assistant non è ancora configurato. Completa la configurazione iniziale di Home Assistant, poi accedi.» (`LOGIN_ERROR_MESSAGES.onboarding`, righe 46-47 e 160-161).
- `backend/src/config/homeAssistantProxy.ts`: la lista consentita ha 6 rotte `/auth/*` e 9 rotte `/api/*` di sola lettura (videocamere, media, immagini, storico, HLS). **Nessuna rotta `/api/onboarding*`.** Il proxy avvia solo il provider `homeassistant` (SR-1) e limita i tentativi di accesso.
- Il tunnel WebSocket `/ha/api/websocket` è un `pipe` non filtrato (ADR-0021, «Conseguenze»; D-D16 aperta). [V] Un amministratore di HA collegato ad Acasystem può già oggi inviare `config/auth/*` dal browser, senza controlli né registro di Acasystem.
- Parte server di D1 (non committata, in `backend/src/services/devices/`):
  - c'è un catalogo delle chiamate a HA, `backend/src/config/homeAssistantApiCatalog.ts`, con classi DOC/INT, versione supportata `2026.9.4`, versioni verificate e confrontate e permessi;
  - il catalogo comprende già `config/auth/list`, `config/auth/create`, `config/auth/update`, `config/auth_provider/homeassistant/create` e `…/admin_change_password`;
  - c'è l'attivazione dell'identità di servizio (`identityActivation.ts`), lanciata dall'utente nel proprio terminale con le credenziali del proprietario: si ferma prima di chiederle se la versione di HA non è verificata.
- App client (REP-20261026-002):
  - la procedura guidata chiede l'IP e controlla `/api/health` di Acasystem sulla porta 3002;
  - il Dell non ha Acasystem, quindi oggi risponde «Il mini PC non risponde» o «un altro servizio»;
  - il guscio non parla con la porta 8123 di HA.

### 1.2 Onboarding di HA al tag 2026.9.4 [F]

Fonti: codice di `home-assistant/core` al tag `2026.9.4`, commit `9212531f40a0b7b23229a90d688dd79d9dfccff4`, file `homeassistant/components/onboarding/{__init__,views,const}.py`, `homeassistant/auth/__init__.py`, `homeassistant/components/auth/login_flow.py`, letti il 2026-10-26. Frontend di HA `20260826.7` (versione richiesta da `components/frontend/manifest.json` allo stesso tag): `src/data/onboarding.ts`, `src/onboarding/ha-onboarding.ts`, `src/onboarding/onboarding-core-config.ts`, letti il 2026-10-26.

- **Passi:** `STEPS = [user, core_config, analytics, integration]`. Lo stato è salvato in `.storage/onboarding`. HA è «onboarded» quando i quattro passi sono fatti.
- **`GET /api/onboarding`** (senza autenticazione): elenco `[{step, done}]`.
- **`GET /api/onboarding/installation_type`** (senza autenticazione, solo prima del primo passo): tipo d'installazione. Dopo il primo passo risponde 401.
- **`POST /api/onboarding/users`** (**senza autenticazione**):
  - corpo `{name, username, password, client_id, language}`;
  - riesce una sola volta (dopo risponde 403 «User step already done») ed è serializzato da un lock;
  - crea credenziali e utente nel gruppo `system-admin`;
  - **il primo utente non di sistema diventa proprietario** (`_user_should_be_owner`);
  - crea una persona collegata e le tre aree predefinite nella lingua indicata (soggiorno, cucina, camera da letto);
  - risponde `{auth_code}`, da scambiare con `POST /auth/token` (`grant_type=authorization_code`).
  - Se il nome utente non è valido (HA lo normalizza), risponde 400 con `translation_key`.
- **`POST /api/onboarding/core_config`** (autenticato, nessun corpo):
  - segna il passo come fatto;
  - avvia in sottofondo `google_translate`, `met`, `radio_browser`, `shopping_list`.
  - Posizione, paese, fuso orario, valuta e unità si scrivono **prima**, con il comando WebSocket `config/core/update` (frontend: `saveCoreConfig`, poi `onboardCoreConfigStep`).
- **`POST /api/onboarding/analytics`** (autenticato, nessun corpo): segna il passo come fatto. Le preferenze di analytics il frontend le scrive a parte [DV: comando esatto].
- **`POST /api/onboarding/integration`** (autenticato):
  - corpo `{client_id, redirect_uri}`, validati con IndieAuth (`verify_redirect_uri`);
  - richiede un token d'accesso legato a un refresh token con credenziali;
  - chiude l'onboarding e risponde con un nuovo `auth_code`.
- **Accesso prima dell'onboarding:** `GET /auth/providers` risponde 400 `onboarding_required` finché il **solo passo `user`** non è fatto (`async_is_user_onboarded`). [V] Dopo il passo `user` il login di Acasystem funziona anche con gli altri passi aperti, ma l'interfaccia di HA, se qualcuno la apre, riprende l'onboarding dai passi mancanti.
- **Proprietario creato in altro modo:** se all'avvio esiste un utente proprietario (per esempio creato da riga di comando), HA segna il passo `user` come fatto (`onboarding/__init__.py`, `async_setup`).
- **Altre rotte di onboarding:** il frontend usa anche `/api/onboarding/integration/wait` (senza autenticazione) e `/api/onboarding/cloud/*` (Nabu Casa). Le piattaforme di onboarding delle integrazioni aggiungono altre viste; per esempio il ripristino da backup (`backup/onboarding.py`, citato in REP-20261026-001). [V] Non servono ad Acasystem.
- **Documentazione:** la pagina utente dell'integrazione (<https://www.home-assistant.io/integrations/onboarding/>, consultata il 2026-10-26) dice solo che crea gli endpoint dell'onboarding. Le pagine sviluppatori Auth API e REST API (<https://developers.home-assistant.io/docs/auth_api>, <https://developers.home-assistant.io/docs/api/rest>, consultate il 2026-10-26) **non** descrivono `/api/onboarding*`. [V] Classe **INT** nel catalogo di Acasystem: nessuna garanzia di stabilità.
- **Password del proprietario persa** (<https://www.home-assistant.io/docs/authentication/>, consultata il 2026-10-26): si rifà l'onboarding. [V] Per un impianto consegnato significa perdere gli account; la custodia della password (D-C5) è un requisito, non un dettaglio.
- **Confronto con 2026.10.4** (ultimo rilascio alla data di REP-20261026-001): in `onboarding/views.py` cambia solo la libreria di validazione (`voluptuous` → `probatio`), stessi campi e risposte. [DV] Testo dei messaggi d'errore di validazione.

### 1.3 Gestione degli utenti al tag 2026.9.4 [F]

Fonti: `homeassistant/components/config/auth.py`, `homeassistant/components/config/auth_provider_homeassistant.py`, `homeassistant/auth/__init__.py`, `homeassistant/auth/const.py`, `homeassistant/components/person/__init__.py` ai tag 2026.9.4 e 2026.10.4. Frontend `20260826.7`: `src/data/user.ts`, `src/panels/config/users/dialog-add-user.ts`, `src/panels/config/person/dialog-person-detail.ts`. Tutti letti il 2026-10-26. Permessi: <https://developers.home-assistant.io/docs/auth_permissions>, consultata il 2026-10-26.

| Comando WebSocket (tutti `require_admin`) | Effetto | Protezioni a 2026.9.4 | Cambi a 2026.10.4 |
|---|---|---|---|
| `config/auth/list` | Utenti con `id`, `username`, `name`, `is_owner`, `is_active`, `local_only`, `system_generated`, `group_ids`, `credentials` | — | — |
| `config/auth/create` `{name, group_ids?, local_only?}` | Crea l'utente senza credenziali | — | — |
| `config/auth/update` `{user_id, name?, is_active?, group_ids?, local_only?}` | Rinomina, cambia gruppo, attiva/disattiva. La disattivazione **elimina tutti i refresh token** dell'utente | Rifiuta gli utenti di sistema e la disattivazione del proprietario. **Non** impedisce di togliere il proprietario dagli amministratori | — |
| `config/auth/delete` `{user_id}` | Elimina utente e credenziali | Solo «non te stesso». **Un amministratore può eliminare il proprietario e gli utenti di sistema** | Aggiunti `cannot_modify_system_generated` e `cannot_delete_owner` |
| `config/auth_provider/homeassistant/create` `{user_id, username, password}` | Aggiunge utente e password a un utente | — | Credenziali del proprietario solo dal proprietario; `credentials_exist` se l'utente ha già una password |
| `config/auth_provider/homeassistant/delete` `{username}` | Toglie le credenziali | — | `cannot_delete_owner_credentials` |
| `config/auth_provider/homeassistant/admin_change_password` `{user_id, password}` | Reimposta la password di un altro | **Solo il proprietario** (`Unauthorized` per gli altri amministratori) | — |
| `config/auth_provider/homeassistant/admin_change_username` `{user_id, username}` | Cambia il nome utente | **Solo il proprietario** | — |
| `config/auth_provider/homeassistant/change_password` `{current_password, new_password}` | La propria password | Utente collegato, non serve essere amministratore | — |

- **Gruppi:** tre fissi, `system-admin`, `system-users`, `system-read-only`.
  - Policy: amministratori e utenti `{"entities": True}`, sola lettura `{"entities": {"all": {"read": True}}}`.
  - «Users and administrators can control the same entities» (pagina dei permessi): ciò che distingue l'amministratore è `user.is_admin`, controllato a parte per la configurazione.
  - Al proprietario le policy non si applicano.
  - Nei file letti non c'è un comando per creare gruppi o policy. [V] In HA non si può limitare un utente a una casa o a un dispositivo.
- **Proprietario:** si crea solo come primo utente; **nessun comando lo trasferisce** (`config/auth/update` non ha `is_owner`).
- **Come fa l'interfaccia di HA** a creare un utente: `config/auth/create` con `[system-admin]` o `[system-users]` e `local_only`, poi `config/auth_provider/homeassistant/create`. Se il secondo comando fallisce, elimina l'utente. Il pannello Persone collega la persona all'utente. [DV] Comando esatto della persona (`person/create` con `user_id`, collezione WebSocket di `person`).
- **`local_only`:** HA lo valuta sull'indirizzo della richiesta (`async_user_not_allowed_do_auth`). [V] Dietro il proxy HA vede l'indirizzo del server Acasystem, quindi `local_only` **non protegge** chi entra da Acasystem esposto fuori casa. Protegge solo l'accesso diretto alla 8123.
- **Identità «Acasystem (servizio)»** (ADR-0022): è un amministratore, non il proprietario. [F+V] Può creare, rinominare, disattivare ed eliminare utenti (a 2026.9.4 anche il proprietario, se nessuno lo impedisce). **Non** può reimpostare password né cambiare nomi utente altrui.

## 2. Caso 1 — Primo account (proprietario) su un HA nuovo

### 2.1 Il nodo dell'ordine su HA OS [V]

Su HA OS Acasystem è un'app del Supervisor (REP-20261026-001). Per installarla servono `supervisor/api` e quindi un utente amministratore, che esiste solo dopo il passo `user`. La chiavetta `CONFIG` non installa app (REP-20261026-001, §2.4). Dunque:

- **Sul Dell 192.168.1.184 e su ogni HA OS nuovo, Acasystem non può esistere prima del proprietario.** Una pagina «Crea il proprietario» dentro Acasystem non verrebbe mai vista lì.
- Acasystem precede il proprietario solo dove gira **fuori** da HA: il banco (Docker su 192.168.1.7, HA nella VM), HA Container, oppure un HA azzerato sotto un Acasystem già installato.

### 2.2 Opzioni

| Opzione | Come | Pro | Contro |
|---|---|---|---|
| **1A. Onboarding in laboratorio con l'interfaccia di HA** | L'installatore apre `http://IP:8123` una volta, crea il proprietario e finisce i passi | Nessun lavoro; procedura ufficiale | L'installatore apre HA (il cliente no); passi manuali ripetuti per ogni impianto |
| **1B. «Crea il proprietario» dentro Acasystem** | Sulla pagina d'accesso, se HA risponde `onboarding_required`, Acasystem offre il modulo e completa i quattro passi | Coerente con «Acasystem al posto di HA»; utile sul banco e con HA Container | **Non funziona su HA OS nuovo** (§2.1); aggiunge al server un percorso senza autenticazione |
| **1C. Strumento dell'installatore sul PC** | L'app client per Windows in «modalità installatore» (variante: lo script del laboratorio G6 di REP-20261026-001) trova HA sulla 8123, crea il proprietario e completa core_config, analytics e integration. Poi installa Acasystem e, se l'utente lo vuole, attiva l'identità di servizio di ADR-0022 | Copre HA OS e il Dell; una sola procedura per proprietario, Acasystem e identità; le credenziali le digita l'installatore e non si salvano | Cambia il perimetro dell'app client (ADR-0023: oggi parla solo con Acasystem sulla 3002), da decidere; chiamate interne a HA nel guscio, con test di contratto propri |
| 1D. Proprietario da riga di comando | `hass --script auth` o la shell di HA OS, poi riavvio | Nessuna chiamata senza autenticazione | [DV] Disponibilità su HA OS; scomodo; restano gli altri tre passi |

### 2.3 Che cosa servirebbe nel proxy `/ha` per 1B [V]

Se il browser chiamasse HA direttamente attraverso il proxy, la lista consentita dovrebbe aggiungere:

| Metodo e percorso | Autenticazione HA | Nota |
|---|---|---|
| `GET /api/onboarding` | nessuna | Stato dei passi |
| `POST /api/onboarding/users` | **nessuna** | Crea il proprietario: con il limite dei tentativi e un corpo massimo |
| `POST /api/onboarding/core_config` | token | Dopo `config/core/update` via tunnel |
| `POST /api/onboarding/analytics` | token | |
| `POST /api/onboarding/integration` | token | `redirect_uri` coerente con il `client_id` di Acasystem (IndieAuth) |
| (`/auth/token` c'è già) | | Scambio dell'`auth_code` |

Non servono `installation_type`, `integration/wait`, `cloud/*` e le viste di ripristino.

**[P] Proposta: non aggiungere queste rotte al proxy.** Meglio una facciata del backend, per esempio `GET /api/primo-avvio` e `POST /api/primo-avvio/proprietario`, che chiama HA da server a server, sul modello di ADR-0021:
- il browser non vede mai `/ha/api/onboarding*`;
- il server può chiedere un **codice d'installazione** (vedi §2.4);
- può fare i quattro passi in sequenza, con annullamento leggibile;
- può scrivere il registro senza segreti;
- può attivare subito l'identità di servizio con le stesse credenziali, usate una volta e non conservate (ADR-0022, punto 3: «dall'installazione pulita in poi, una schermata del primo avvio»).

La facciata risponde 404 quando HA è già «onboarded».

### 2.4 Rischi

- **Chi arriva per primo diventa proprietario [F+V].** `POST /api/onboarding/users` non chiede nulla e HA non limita la provenienza. Finché il passo `user` non è fatto, chiunque raggiunga la 8123 (o la facciata di Acasystem, se aperta) prende l'impianto, con l'amministrazione completa, Supervisor compreso. Mitigazioni:
  - onboarding **in laboratorio** subito dopo il primo avvio (D-G10 a di REP-20261026-001), su una rete dell'ufficio;
  - per 1B, un **codice d'installazione** monouso generato dal server Acasystem e mostrato solo nel suo registro o nella configurazione dell'app: protegge la facciata, **non** la 8123, che resta aperta finché HA non è configurato;
  - per 1C, lo strumento controlla `GET /api/onboarding` subito prima di agire. Se il passo `user` è già fatto da altri, si ferma e avvisa: un proprietario sconosciuto è un incidente, non un caso normale.
- **Il Dell oggi [V].** Il Dell 192.168.1.184, appena installato e non configurato, è in questa finestra sulla LAN dell'ufficio. Non è stato toccato. Conviene che l'utente decida presto come configurarlo (Q-U1).
- **Password del proprietario.** Non si recupera senza rifare l'onboarding (§1.2). Chi la custodisce è D-C5, aperta (REP-20261023-004).
- **Passi lasciati a metà.** Se si fa solo il passo `user`, l'accesso ad Acasystem funziona, ma HA resta «non onboarded». [V] La facciata deve completare i quattro passi o dichiarare chiaramente che cosa manca.
- **Integrazioni avviate da `core_config`.** `met`, `google_translate` e `radio_browser` usano internet [V]: senza rete restano in errore, senza bloccare.
- **API interne.** Le rotte di onboarding non sono documentate: servono un test di contratto e il blocco sulle versioni non verificate, come per `identityActivation.ts`.

### 2.5 Proposta per il caso 1 [P]

1. **Subito, senza codice:** il Dell e i prossimi mini PC si configurano in laboratorio con 1A, finché non c'è 1C.
2. **Prima tappa di sviluppo: 1C**, perché è l'unica che copre HA OS, cioè gli impianti dei clienti. Lo strumento fa:
   - controllo di `GET /api/onboarding`;
   - modulo «Crea il proprietario» con nome, utente e password, scelta della lingua `it`;
   - `POST /api/onboarding/users`, poi `/auth/token`;
   - `config/core/update` con paese `IT`, fuso `Europe/Rome`, valuta `EUR`, unità metriche ed eventuale posizione;
   - `core_config`, `analytics` (con le preferenze scelte, Q-U4) e `integration`;
   - installazione di Acasystem (G6 di REP-20261026-001);
   - eventuale attivazione dell'identità di servizio;
   - revoca dei token di questa sessione e nessuna credenziale salvata.
3. **1B solo se serve** per il banco o per HA Container (Q-U3), come facciata del backend e non come rotte del proxy. In ogni caso il messaggio `onboarding` della pagina d'accesso va riscritto, per indicare lo strumento dell'installatore invece dell'interfaccia di HA.

## 3. Caso 2 — Altri account

### 3.1 Ruoli richiesti e traduzione in HA [V]

| Ruolo (PRD §5.2) | Utente HA | Note |
|---|---|---|
| Proprietario HA | owner, `system-admin` | Uno solo, non trasferibile. Custodia D-C5 |
| Installatore (Admin di REQ-06) | `system-admin`, personale, uno per tecnico | «Solo nel primo setup»: da disattivare alla consegna |
| Acasystem (servizio) | `system-admin`, `local_only` | ADR-0022; solo il server |
| Cliente (titolare) | `system-users` | Il tablet del cliente: mai amministratore (ADR-0022, punto 1) |
| Familiari | `system-users` | Stessi poteri sulle entità del titolare, perché HA non distingue |
| Ospite | `system-read-only` | Vede, non comanda. Ruolo non nel PRD: solo se l'utente lo vuole (Q-U8) |
| Amministratore di condominio (REQ-17) | `system-users` | **In HA controlla tutte le entità**: l'isolamento sta solo in Acasystem |

### 3.2 Opzioni per chi gestisce gli account

| Opzione | Come | Pro | Contro |
|---|---|---|---|
| **2A. Facciata `/api/account` con il token di chi è collegato** | Pagina Sistema > Account. Il backend inoltra `config/auth/*` e `config/auth_provider/homeassistant/*` con il token dell'installatore o del proprietario, dopo i propri controlli | HA applica i suoi permessi; ogni azione ha una persona; registro; è il «livello installatore» di ADR-0022, punto 2 | Il cliente non gestisce i familiari da solo, a meno che non accada con il proprietario (Q-U6) |
| 2B. Come 2A, più un'operazione nella lista dell'identità di servizio | Il titolare (non amministratore) aggiunge e disattiva familiari `system-users`; il server agisce come «Acasystem (servizio)» | Il cliente è autonomo | Gestione degli account in mano a un'identità amministrativa: un errore nella lista crea amministratori. **Niente reimpostazione password** (solo il proprietario). Allarga ADR-0022 e richiede una nuova decisione |
| 2C. Comandi dal browser attraverso il tunnel | Il frontend invia `config/auth/*` dal WebSocket già aperto | Poche righe; funziona già oggi con un token amministratore | Nessun controllo né registro di Acasystem; nessuna protezione del proprietario a 2026.9.4. Sconsigliata |
| 2D. Lasciare gli account all'interfaccia di HA | — | Nessun lavoro | Contraddice la richiesta |

**Regole della facciata [P], valide in 2A e 2B:**
- non tocca mai il proprietario, gli utenti `system_generated` e «Acasystem (servizio)»: niente eliminazione, disattivazione o cambio di gruppo, anche dove HA 2026.9.4 lo permetterebbe;
- non elimina né disattiva chi è collegato;
- crea solo nei gruppi ammessi per il ruolo di chi chiama;
- crea utente e password in sequenza ed elimina l'utente se il secondo passo fallisce (come fa HA);
- crea la persona collegata [DV];
- la reimpostazione della password e il cambio del nome utente sono disponibili solo se chi è collegato è il proprietario. Agli altri compare «Richiede il proprietario»;
- registro con persona, azione, utente bersaglio (id), esito e ora; mai password;
- le password le digita la persona e passano solo nel corpo della richiesta.

### 3.3 Flusso confermato «admin solo nel primo setup → logout → login cliente» [P]

Procedura **«Consegna al cliente»** in Sistema, solo per un installatore collegato:

1. controllo: l'impianto è pronto (dispositivi e pagine configurati: elenco da definire);
2. creazione o scelta dell'account del cliente (`system-users`), con la password digitata dal cliente o dall'installatore davanti al cliente (Q-U7);
3. eventuali familiari;
4. **disattivazione dell'account dell'installatore** con `config/auth/update is_active=false`, che elimina tutti i suoi refresh token (§1.3). In alternativa, se l'utente lo preferisce, solo logout (Q-U5);
5. logout automatico e pagina d'accesso;
6. login del cliente;
7. **controllo dell'assenza di privilegi residui:**
   - `auth/current_user` del tablet con `is_admin=false`;
   - nessun utente amministratore attivo oltre al proprietario e ad «Acasystem (servizio)»;
   - nessun token dell'installatore rimasto (`auth/refresh_tokens` non è leggibile per altri utenti: si verifica con la disattivazione);
   - avviso agli amministratori se il tablet resta amministratore (già previsto da ADR-0022, punto 4).

Per tornare sull'impianto, il proprietario (o chi ne ha la password, D-C5) riattiva l'installatore. [V] Questo soddisfa la parte «logout e login cliente completati senza privilegi admin residui» di AC-06. «Sessione aperta limitata al primo setup» è coperto in modo diverso, perché l'account dell'installatore viene spento invece di avere una durata. Va confermato (Q-U5).

[DV] Effetto immediato della disattivazione sulle connessioni WebSocket già aperte e sui token d'accesso già emessi (durata 30 min) dell'installatore. Effetto del cambio di gruppo sulle connessioni aperte.

### 3.4 Amministratore di condominio (REQ-17) [V]

- HA non sa limitare un utente ai dispositivi comuni (§1.3). Il confine sta solo in Acasystem: pagine, widget, facciata `/api/dispositivi` ed eventuali comandi.
- **Il tunnel `/ha/api/websocket` non filtrato rende questo confine finto:** un utente `system-users` può comandare ogni entità di HA da lì. Quindi REQ-17 **dipende da D-D16** (filtro del tunnel) o da un'altra architettura (ISSUE-008, ISSUE-015: più case su un HA o un HA per casa).
- [P] Nel piano degli account l'amministratore di condominio resta un ruolo **dichiarato ma non attivabile** finché D-D16 e la policy di REQ-17 non sono decise. Si crea come utente qualsiasi solo se l'utente lo chiede sapendo che l'isolamento non c'è (Q-U9).

### 3.5 Stabilità delle API interne e test di contratto [P]

- Tutti i comandi usati (`/api/onboarding*`, `config/auth/*`, `config/auth_provider/homeassistant/*`, `person/*`) sono **INT** nel catalogo di Acasystem.
- Si aggiungono al catalogo di `homeAssistantApiCatalog.ts`, che è l'unico posto dove si nominano, con permesso e versione.
- **Test di contratto** con risposte registrate a 2026.9.4 (finto HA nei test):
  - successo;
  - `not_found`, `no_delete_self`, `cannot_deactivate_owner`, `cannot_modify_system_generated`, `Unauthorized` sul cambio password da non proprietario;
  - `User step already done`, `onboarding_required`, `InvalidUsername`.
- **Confronto con 2026.10.4**, già letto qui:
  - nuovi errori `cannot_delete_owner`, `credentials_exist`, `cannot_delete_owner_credentials`;
  - le credenziali del proprietario si creano solo dal proprietario;
  - cambia la libreria di validazione.

  La facciata deve tradurre in italiano i codici nuovi e considerare `credentials_exist` un esito normale.
- Sonde all'avvio (modello RD-nn): versione di HA, poi presenza dei comandi (`config/auth/list` con risposta ben formata). Su una versione non verificata la funzione si spegne con un messaggio, senza ripiego. È la stessa regola di `identityActivation.ts`.
- **Prova sul banco con HA reale** prima di ogni aggiornamento della versione fissata di HA (D-I5): creazione, rinomina, cambio gruppo, disattivazione, eliminazione, reimpostazione da proprietario e rifiuto da non proprietario.

### 3.6 Proposta per il caso 2 [P]

1. **2A** (facciata `/api/account`, pagina Sistema > Account, solo installatore e proprietario) con le regole di §3.2.
2. **«Consegna al cliente»** (§3.3), che realizza AC-06 nel modo descritto.
3. **2B solo su decisione esplicita** (Q-U6), limitata a familiari `system-users`, senza password altrui.
4. **REQ-17 dopo D-D16** (Q-U9).

## 4. Domande per l'utente

Nessuna è decisa. La prima opzione è quella consigliata dall'agente.

- **Q-U1. Dell 192.168.1.184 (adesso):** (a) lo configuri tu in laboratorio dall'interfaccia di HA, una volta, in attesa dello strumento; (b) aspetti lo strumento 1C, sapendo che resta aperto a chi è sulla LAN; (c) altro.
- **Q-U2. Primo account sugli impianti HA OS:** (a) strumento dell'installatore nell'app client per Windows (1C), che modifica il perimetro di ADR-0023; (b) script del laboratorio (G6 di REP-20261026-001); (c) restare con l'interfaccia di HA in laboratorio (1A).
- **Q-U3. «Crea il proprietario» dentro Acasystem (1B)** per banco e HA Container: (a) no, solo il messaggio aggiornato; (b) sì, come facciata del backend con codice d'installazione; (c) sì, con le rotte nel proxy (sconsigliato).
- **Q-U4. Analytics di HA al primo avvio:** (a) tutte spente; (b) solo le informazioni di base; (c) a scelta dell'installatore ogni volta.
- **Q-U5. Account dell'installatore alla consegna:** (a) disattivato, e riattivato dal proprietario quando serve; (b) solo logout, con l'account attivo; (c) eliminato. Con (a) va confermato che «sessione limitata al primo setup» di AC-06 si intende così.
- **Q-U6. Chi aggiunge i familiari dopo la consegna:** (a) solo l'installatore o il proprietario (2A); (b) anche il titolare, tramite l'identità di servizio (2B, nuova decisione su ADR-0022); (c) il titolare con la password del proprietario, se la tiene lui (dipende da D-C5).
- **Q-U7. Password del cliente:** (a) la digita il cliente alla consegna; (b) la sceglie l'installatore e il cliente la cambia al primo accesso, con `change_password`, che non richiede l'amministratore; (c) altro.
- **Q-U8. Ruolo «Ospite» in sola lettura** (`system-read-only`): (a) non ora; (b) sì, come ruolo nuovo, da aggiungere al PRD.
- **Q-U9. Amministratore di condominio:** (a) rimandato a dopo D-D16 e alla policy di REQ-17; (b) creabile subito come utente normale, sapendo che non è isolato.
- **Q-U10. Proprietario HA (D-C5, ripresa):** (a) l'azienda, con un gestore di password aziendale; (b) il cliente; (c) entrambi, con l'azienda proprietaria e il cliente con un suo utente.
- **Q-U11. Verifica dell'«assenza di privilegi residui»:** (a) controllo automatico alla fine della consegna, con esito visibile all'installatore; (b) anche un controllo periodico con avviso; (c) solo manuale.
- **Q-U12. Ordine delle tappe:** (a) caso 2 (A1-A4) prima del caso 1, perché il Dell si configura a mano (Q-U1 a); (b) caso 1 prima; (c) in parallelo, se i flussi lo permettono.

## 5. Tappe stimate [P]

Stime relative (piccola < 1 giorno, media 1-3 giorni di lavoro dell'agente con le verifiche), da rivedere dopo le risposte. Ogni tappa richiede un incarico esplicito.

| Tappa | Contenuto | Dove | Stima | Dipende da |
|---|---|---|---|---|
| A0 | Risposte Q-U1…Q-U12; eventuale ADR «Account di HA da Acasystem» (integra ADR-0022 e, per 1C, ADR-0023) | Documenti | Piccola | — |
| A1 | Catalogo e test di contratto: voci INT per account e onboarding, risposte registrate a 2026.9.4, codici di 2026.10.4 | Backend, finto HA | Piccola | A0, parte server di D1 committata |
| A2 | Facciata `/api/account`: elenco, crea, rinomina, gruppo, disattiva/riattiva, elimina, password da proprietario; regole di §3.2; registro | Backend | Media | A1 |
| A3 | Pagina Sistema > Account e procedura «Consegna al cliente», con primitive Kit 2 e messaggi in italiano | Frontend | Media | A2, design da confermare |
| A4 | Prova sul banco (VM con snapshot) con HA reale: AC-06 completo, rifiuti, disattivazione con token revocati, regressione per account | Banco | Piccola-media | A3, coordinamento col banco |
| B1 | Strumento 1C: rilevamento HA nuovo, onboarding in quattro passi, configurazione base, revoca dei token; nessuna credenziale salvata | App client Windows (o script G6) | Media | A0 (Q-U2), ADR-0023 annotata |
| B2 | Collegamento con l'installazione di Acasystem e con l'attivazione dell'identità di servizio | App client o script, VM | Media | B1, G4-G6 di REP-20261026-001 |
| B3 | (se Q-U3 b) Facciata `/api/primo-avvio` con codice d'installazione | Backend e frontend | Piccola-media | A1 |
| B4 | Prova su un HA OS nuovo (snapshot «appena installato» della VM, poi Dell con autorizzazione) | VM, Dell | Piccola | B1-B2 |
| C1 | (se Q-U6 b) Operazione «familiari» nella lista dell'identità di servizio | Backend | Piccola | A2, decisione su ADR-0022 |
| C2 | Amministratore di condominio | — | Da stimare | D-D16, policy REQ-17, ISSUE-008/015 |

## 6. Criteri di completamento delle tappe future [P]

- **Caso 1:**
  - su un HA OS appena installato, il proprietario si crea senza aprire l'interfaccia di HA;
  - `GET /api/onboarding` riporta i quattro passi fatti;
  - il login di Acasystem funziona;
  - nessuna credenziale in log, file o risposte (ricerca delle stringhe di prova con zero occorrenze);
  - se il passo `user` è già fatto da altri, lo strumento si ferma con un messaggio;
  - versione di HA non verificata: fermo prima di chiedere credenziali.
- **Caso 2:**
  - un installatore crea, rinomina, disattiva, riattiva ed elimina utenti da Acasystem;
  - il proprietario reimposta una password, mentre un altro amministratore riceve «Richiede il proprietario»;
  - proprietario, utenti di sistema e «Acasystem (servizio)» rifiutati da ogni modifica (test con HA 2026.9.4, dove HA non li protegge);
  - registro senza password.
- **AC-06:**
  - dopo «Consegna al cliente», il tablet usa un utente con `is_admin=false`;
  - l'account dell'installatore è disattivato (o come da Q-U5) e i suoi token non funzionano più;
  - le funzioni riservate agli amministratori sono nascoste o negate al cliente (regressione per account di ADR-0022).
- **Contratto:** test verdi a 2026.9.4; codici di 2026.10.4 tradotti; sonda all'avvio che spegne la funzione su una versione ignota.
- **Documenti:** PRD (annotazione REQ-05/06, eventuale ruolo ospite), `verification.md` (V-05, V-06), `compliance.md` (registro degli account), `project-status.md`.

## 7. Replica passo per passo con la grafica di Acasystem (aggiunta del 2026-10-26)

Vincolo: il requisito dell'utente in testa al report. Fonti aggiuntive, lette il 2026-10-26:
- frontend di HA `20260826.7` (richiesto da Core 2026.9.4) e `20260930.5` (richiesto da Core 2026.10.4, `components/frontend/manifest.json`): `src/onboarding/{ha-onboarding,onboarding-welcome,onboarding-create-user,onboarding-location,onboarding-core-config,onboarding-analytics,onboarding-integrations}.ts`, `src/data/{onboarding,core,analytics,person,user,auth}.ts`, `src/panels/config/person/dialog-person-detail.ts`, `src/panels/config/users/dialog-add-user.ts`, `src/translations/en.json`;
- Core 2026.9.4: `components/backup/onboarding.py`, `components/cloud/onboarding.py`, `components/auth/strings.json`, `helpers/collection.py`;
- <https://www.home-assistant.io/docs/locked_out/>.

### 7.1 Sequenza dell'interfaccia di HA [F]

`ha-onboarding.ts` legge `GET /api/onboarding` e mostra il primo passo non fatto. Se sono tutti fatti, va alla pagina principale. Se il primo è fatto e gli altri no, chiede l'accesso e riprende dal passo mancante. In cima c'è sempre la scelta della lingua.

| N. | Schermata di HA | Che cosa chiede | Chiamate (in ordine) |
|---|---|---|---|
| 0 | Benvenuto (`onboarding-welcome`) | «Crea la mia casa intelligente» oppure «Ripristina da un backup» (caricamento di un file o Home Assistant Cloud) | Nessuna per «Crea». Ripristino: rotte `/api/onboarding/backup/*` o `/api/onboarding/cloud/*` |
| 1 | Crea utente (`onboarding-create-user`) | Nome, nome utente (proposto dal nome: prima parola in minuscolo), password, conferma della password, lingua (dal selettore in cima) | `POST /api/onboarding/users`, poi `POST /auth/token` con l'`auth_code`; da qui c'è una sessione |
| 2a | Posizione della casa (`onboarding-location`) | Ricerca dell'indirizzo (OpenStreetMap), oppure «Rileva» (geolocalizzazione del browser solo in contesto sicuro, altrimenti richiesta a un servizio esterno), oppure un punto sulla mappa; quota | `config/core/detect` (WS); ricerca e geocodifica inversa su OpenStreetMap dal browser |
| 2b | Paese e dettagli (`onboarding-core-config`) | Paese (proposto da `navigator.language`), fuso orario, valuta, unità. Se `config/core/detect` ha dato paese e fuso, la schermata si salta e si salva subito | `config/core/update` (WS) con `location_name` = «Home» tradotto, `latitude`, `longitude`, `elevation`, `unit_system`, `time_zone`, `currency`, `country`, `language`; poi `POST /api/onboarding/core_config` |
| 3 | Analytics (`onboarding-analytics`) | Interruttori `base`, `usage`, `statistics`, `diagnostics`; attesa «Home Assistant sta finendo di avviarsi» finché `analytics` non risponde | `analytics` (WS, ripetuto ogni 1 s se `not_found`), `analytics/preferences` (WS), `POST /api/onboarding/analytics` |
| 4 | Dispositivi trovati (`onboarding-integrations`) | Solo visualizzazione: integrazioni già configurate e flussi scoperti, come icone; pulsante «Fine» | `config_entries/flow/subscribe` e `config_entries/subscribe` (WS), `usb/scan` se `usb` è caricato, poi `POST /api/onboarding/integration` `{client_id, redirect_uri}` |
| 5 | Fine | Reindirizza alla pagina principale con il nuovo `auth_code` | `POST /auth/token` |

[F] Tra `20260826.7` e `20260930.5` i passi, i campi e le chiamate non cambiano: cambiano solo il modo di caricare le traduzioni e un'etichetta del tipo d'installazione («Home Assistant OS»). Lato Core, tra 2026.9.4 e 2026.10.4 cambia solo la libreria di validazione delle viste di onboarding (§1.2).

### 7.2 Tabella per la replica in Acasystem [P]

Testi italiani proposti; la grafica è quella di Kit 2. «Proxy» indica la rotta da aggiungere a `HOME_ASSISTANT_PROXY_ROUTES` se il browser chiama HA direttamente (opzione P di Q-U13). «Facciata» indica l'equivalente lato server (opzione F). I comandi WebSocket passano già dal tunnel `/ha/api/websocket` e non richiedono rotte. Se il tunnel verrà filtrato (D-D16), andranno nella sua lista.

| Passo | API HA esatta | Campi | Errori di HA → testo in Acasystem | Proxy |
|---|---|---|---|---|
| Stato | `GET /api/onboarding` (senza autenticazione) | — | Rete/502/504 → «Home Assistant non risponde. Controlla che il mini PC sia acceso e collegato.» | `GET /api/onboarding` |
| 0 Benvenuto | — | Scelta: «Configura una casa nuova» / «Ripristina da un backup» | — | — (ripristino: vedi Q-U14) |
| 1 Proprietario | `POST /api/onboarding/users` (senza autenticazione) | `name`, `username`, `password`, `client_id` (quello di Acasystem), `language` (`it`). La conferma della password e il controllo del nome utente si fanno solo nell'interfaccia, come in HA | 403 «User step already done» → «Su questo Home Assistant il proprietario esiste già. Accedi con il suo account.» 400 `username_not_normalized` → «Il nome utente può contenere solo lettere minuscole e niente spazi.» (controllo anche prima dell'invio, regola `/\s|[A-Z]/` di HA). 400 `username_already_exists` → «Questo nome utente esiste già.» 400 campo mancante → «Compila tutti i campi.» Password diverse (solo interfaccia) → «Le due password non coincidono.» | `POST /api/onboarding/users` con limite dei tentativi e corpo massimo (4 KB, come `loginFlowStart`) |
| 1b Sessione | `POST /auth/token` `grant_type=authorization_code`, `code`, `client_id` | — | 400 → «La richiesta è scaduta. Accedi con l'account appena creato.» | Esiste già |
| 2a Posizione | `config/core/detect` (WS); ricerca dell'indirizzo | — | Errore del rilevamento → «Non è stato possibile rilevare la posizione. Cercala o scegline una sulla mappa.» | — (WS). Per la ricerca: o OpenStreetMap dal browser come HA (servizio esterno, da dichiarare), o solo la mappa (Q-U15) |
| 2b Dettagli | `config/core/update` (WS, amministratore) | `location_name` («Casa»), `latitude`, `longitude`, `elevation`, `unit_system` (`metric`; `us_customary` solo per US, MM, LR), `time_zone`, `currency` (dal paese, predefinita `EUR`), `country`, `language` | Errore di validazione → «Controlla paese, fuso orario e valuta.» Altro → messaggio generico con «Riprova» | — (WS) |
| 2c Chiusura | `POST /api/onboarding/core_config` (token) | — | 403 «Core config step already done» → si considera fatto e si prosegue | `POST /api/onboarding/core_config` |
| 3 Analytics | `analytics` (WS), `analytics/preferences` `{preferences: {base, usage, statistics, diagnostics}}` (WS), `POST /api/onboarding/analytics` (token) | Quattro interruttori; `usage`, `statistics` e `diagnostics` richiedono `base`, come nell'interfaccia di HA [DV: regola esatta] | `not_found` su `analytics` → «Home Assistant sta finendo di avviarsi…», con nuovo tentativo ogni secondo. 403 «…already done» → fatto | `POST /api/onboarding/analytics` |
| 4 Dispositivi trovati | `config_entries/flow/subscribe`, `config_entries/subscribe` (WS), `usb/scan` (WS, se `usb` è caricato) | Solo visualizzazione, come in HA. L'aggiunta vera passa dalla facciata `/api/dispositivi` di ADR-0021, dopo la fine | Nessuno bloccante: un elenco vuoto mostra «Nessun dispositivo trovato per ora.» | — (WS) |
| 4b Fine | `POST /api/onboarding/integration` (token) `{client_id, redirect_uri}` | `client_id` e `redirect_uri` di Acasystem, validi per IndieAuth (stesso host) | 400 «invalid client id or redirect uri» → errore interno, «Configurazione non completata: riprova.» 403 «Refresh token not available» → «Accedi di nuovo per completare.» 403 «…already done» → fatto | `POST /api/onboarding/integration` |
| 5 Ingresso | `POST /auth/token` con il nuovo `auth_code`, oppure si usa la sessione già aperta | — | come 1b | Esiste già |

Note:
- **Aree predefinite:** il passo 1 crea Soggiorno, Cucina e Camera da letto nella lingua indicata e una persona collegata al proprietario. Lo fa HA, non l'interfaccia, quindi la replica le ottiene senza fare nulla [F].
- **Integrazioni avviate da HA** al passo 2c: `google_translate`, `met`, `radio_browser`, `shopping_list`. Lo fa HA [F].
- **Ripresa:** se il passo 1 è fatto e gli altri no, Acasystem chiede l'accesso e riprende dal primo passo non fatto, come HA. Ogni passo successivo è ripetibile finché non riesce, e la risposta 403 «already done» conta come fatto.
- **Il passo 0** in HA esiste anche come ripristino. Copiarlo «pari passo» comprende anche il ripristino (Q-U14).

### 7.3 Gestione degli altri utenti: equivalente di «Persone» di HA [P]

[F] Nell'interfaccia di HA (`dialog-person-detail.ts`, `dialog-add-user.ts`):
- una **persona** ha nome, foto, dispositivi di localizzazione e l'interruttore «Consenti l'accesso»;
- con l'accesso ci sono nome utente, password e conferma, «Può accedere solo dalla rete locale» (`local_only`) e «Amministratore»;
- per un utente esistente: attivo, amministratore, solo rete locale, cambio password e cambio nome utente (solo il proprietario), eliminazione.

| Azione | Chiamate HA (WS, tutte amministratore) | Campi | Errori → testo in Acasystem |
|---|---|---|---|
| Elenco | `person/list`, `config/auth/list` | — | — |
| Nuova persona senza accesso | `person/create` | `name`, `user_id: null`, `device_trackers`, `picture` | Nome mancante [DV: codice] → «Inserisci un nome.» |
| Nuova persona con accesso | `config/auth/create` (`name`, `group_ids` `[system-users]` o `[system-admin]`, `local_only`), poi `config/auth_provider/homeassistant/create` (`user_id`, `username`, `password`), poi `person/create` con `user_id`. Se il secondo passo fallisce, `config/auth/delete` (come HA) | Nome, nome utente, password, conferma, «solo rete locale», «amministratore» | `username_already_exists` → «Questo nome utente esiste già.» `username_not_normalized` → «Il nome utente può contenere solo lettere minuscole e niente spazi.» `credentials_exist` (2026.10) → «Questo utente ha già una password.» «User already taken» (persona) → «Questo account è già collegato a un'altra persona.» |
| Modifica | `person/update`; `config/auth/update` (`name`, `is_active`, `group_ids`, `local_only`) | Come sopra | `cannot_deactivate_owner` → «Il proprietario non si può disattivare.» `cannot_modify_system_generated` → «Questo utente è di sistema e non si può modificare.» |
| Nuova password di un altro | `config/auth_provider/homeassistant/admin_change_password` (`user_id`, `password`) | Password e conferma | `Unauthorized` → «Solo il proprietario può cambiare la password di un altro utente.» `credentials_not_found` → «Questo utente non ha una password di Home Assistant.» |
| Cambio nome utente | `…/admin_change_username` (`user_id`, `username`) | Nome utente | Come sopra; `username_already_exists`, `username_not_normalized` |
| La propria password | `…/change_password` (`current_password`, `new_password`), non serve l'amministratore | Attuale, nuova, conferma | `invalid_current_password` [DV: codice] → «La password attuale non è corretta.» |
| Eliminazione | `person/delete` e `config/auth/delete` | Doppia conferma | `no_delete_self` → «Non puoi eliminare l'account con cui sei collegato.» `cannot_delete_owner` (2026.10) → «Il proprietario non si può eliminare.» A 2026.9.4 Acasystem lo rifiuta da sé (§3.2) |
| Foto | `POST /api/image/upload` e `GET /api/image/serve/{id}/{size}` [DV] | File immagine | — |

Proxy: nessuna rotta per i comandi WebSocket; per la foto servirebbero le due rotte `/api/image/*` (Q-U16). Le regole della facciata di §3.2 restano: proprietario, utenti di sistema e «Acasystem (servizio)» non si toccano.

### 7.4 Proxy o facciata [V]

- **P. Rotte nel proxy** (le cinque `/api/onboarding*` di §7.2): è la replica più fedele, perché il browser fa esattamente le chiamate dell'interfaccia di HA. Contro: `POST /api/onboarding/users`, che è senza autenticazione, diventa raggiungibile anche dall'indirizzo di Acasystem.
  - [V] Il rischio è lo stesso della porta 80/8123 di HA, già aperta, finché HA non è configurato. Dopo il passo 1 HA risponde 403 da sé.
  - Il limite dei tentativi del proxy e i 4 KB di corpo vanno applicati.
- **F. Facciata** `/api/primo-avvio/*` (§2.3): stesse chiamate fatte dal server, più il codice d'installazione e il registro. Contro: più codice, e la sequenza vive nel backend.
- La prima stesura consigliava F. Con il requisito dell'utente («copiare pari passo») le due sono equivalenti nel risultato visibile. La scelta è Q-U13.

### 7.5 Prova sul Dell finché Acasystem non è un'app di HA OS [P]

Proposta della sessione che coordina, qui pianificata e non eseguita:

1. **Istanza di prova di Acasystem sul PC**, su una porta libera diversa da 3002 e 3003, per esempio 3010, da verificare libera prima. Usa `TUNET_INTERNAL_HA_URL=http://192.168.1.184` (porta 80, come osservato; [DV] che il proxy di Acasystem accetti l'URL senza porta) e una cartella dati propria, separata da quella del banco.
2. **App client** con l'IP del PC e quella porta in «Impostazioni avanzate». In alternativa, il browser sul PC.
3. **Prima della prova:** `GET http://192.168.1.184/api/onboarding` con i quattro passi `done: false`. Se il passo `user` risulta fatto da qualcun altro, ci si ferma.
4. **Prova:** passi 0-5 di §7.2 con la grafica di Acasystem. Il nome, l'utente e la password li digita l'utente; nessun agente li legge o li conserva (stessa regola di ADR-0022, punto 3).
5. **Dopo:**
   - `GET /api/onboarding` con i quattro passi `done: true`;
   - accesso ad Acasystem con il nuovo account;
   - `config/auth/list` con un solo proprietario;
   - le tre aree e la persona create da HA.

**Rischio: la configurazione iniziale si fa una volta sola [F+V].**
- Il passo 1 non si ripete: dopo, HA risponde 403. Se la prova fallisce **dopo** il passo 1, il proprietario esiste già. Non è un danno: i passi 2-4 si riprendono con l'accesso del proprietario, come fa HA.
- Se la prova fallisce **prima** del passo 1 (rete, validazione, nome utente rifiutato), nulla è consumato.
- Il caso da evitare è un proprietario creato con dati sbagliati o con una password non annotata. Mitigazioni:
  - la prova del codice va fatta **prima su una VM** con snapshot «HA appena installato»: snapshot, prova, ritorno allo snapshot;
  - solo dopo, sul Dell, con la password annotata subito in un gestore di password (D-C5).

**Come ripristinare il Dell** (<https://www.home-assistant.io/docs/locked_out/>, consultata il 2026-10-26):
- con la console del Dell (tastiera e monitor) si elencano gli utenti (`auth list`) e si reimposta la password del proprietario;
- un amministratore può creare un altro amministratore, ma un secondo proprietario non si può creare;
- per **rifare da capo** l'onboarding, la documentazione indica il ripristino di un backup o l'azzeramento del dispositivo, che cancella tutti i dati. Sul Dell di prova vuol dire reinstallare HA OS [V]: è lungo ma senza perdite, perché il Dell non ha ancora dati.

Il ripristino è un'azione dell'utente sul Dell e non è autorizzato da questo piano.

### 7.6 Domande aggiunte

- **Q-U13. Come arrivano le chiamate di onboarding a HA:** (a) rotte nel proxy `/ha`, replica più fedele (§7.4 P); (b) facciata del backend con codice d'installazione (§7.4 F).
- **Q-U14. Ripristino da backup al passo 0:** (a) non ora: il passo 0 offre solo «Configura una casa nuova» e il ripristino resta all'installatore; (b) replicato anche il ripristino (caricamento del file, rotte `/api/onboarding/backup/{info,upload,restore}`, senza autenticazione prima dell'onboarding); (c) anche Home Assistant Cloud.
- **Q-U15. Ricerca dell'indirizzo:** (a) come HA, con OpenStreetMap dal browser (servizio esterno, da dichiarare in `compliance.md`); (b) solo la mappa e «Rileva»; (c) solo paese e fuso, senza posizione (diverso da HA: va accettato esplicitamente).
- **Q-U16. Foto delle persone:** (a) non ora; (b) sì, con le rotte `/api/image/*`.
- **Q-U17. Prova:** (a) prima su una VM con snapshot, poi sul Dell; (b) direttamente sul Dell, sapendo come ripristinarlo (§7.5).

Le tappe B1 e B3 di §5 diventano: **B3 (replica dell'onboarding nell'interfaccia di Acasystem)** come prima tappa del caso 1, provata con §7.5. B1 (strumento sul PC) resta per HA OS in produzione, finché Acasystem non è installabile prima del proprietario. Le tappe A1-A3 includono la tabella di §7.3.

## Avanzamento e modifiche

- Letti `AGENTS.md`, `project-status.md` (inizio, REQ, ISSUE-006, ISSUE-008), `product.md` §5.1-5.2 e le righe REQ-05/06/17 e AC-05/06/17, ADR-0021, ADR-0022, REP-20261026-001 (§2.4, D-G10, rischi) e REP-20261026-002 (sezioni finali).
- Letti in sola lettura `haLogin.ts`, `homeAssistantProxy.ts`, l'inizio di `identityActivation.ts` e di `homeAssistantApiCatalog.ts` (parte server di D1, non committata).
- Scaricati in una cartella temporanea fuori dal repository, senza eseguirli, i sorgenti di HA ai tag 2026.9.4 e 2026.10.4 e del frontend 20260826.7 elencati in §1.2-1.3. Consultate le pagine ufficiali citate.
- Scritto questo report e aggiunta la riga in `documentazione/reports/README.md`. Nessun'altra modifica.
- **2026-10-26, aggiunta.** Sul requisito dell'utente riportato dalla sessione che coordina e sull'osservazione del Dell, sono stati letti i passi dell'onboarding e del pannello Persone nel frontend di HA `20260826.7` e `20260930.5` e le viste di ripristino. È stata scritta la sezione 7: sequenza, tabella per passo con API, campi, errori, testi italiani e rotte del proxy; utenti; proxy o facciata; prova sul Dell con rischio e ripristino; domande Q-U13…Q-U17. Le sezioni 1-6 non sono cambiate: dove divergono prevale la 7.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Lettura del codice di HA | `curl` dei file da `raw.githubusercontent.com/home-assistant/core/<tag>/…` e `…/frontend/20260826.7/…`; `diff` tra i tag 2026.9.4 e 2026.10.4 | Superato, 2026-10-26 | Fatti in §1.2-1.3. Tag 2026.9.4 = commit `9212531f…` (API GitHub). Lettura del sorgente, non prova |
| Documentazione ufficiale | Pagine citate in §1.2-1.3 | Superato, 2026-10-26 | L'API di onboarding non è nelle pagine sviluppatori |
| Comportamento su un HA acceso | — | Non eseguito | Fuori incarico: nessun HA, banco o Dell toccato. Punti [DV] aperti |
| Diff del repository | `git status --short documentazione/reports/` e `git diff --stat` dell'indice | Superato, 2026-10-26 | Questo file nuovo e una riga aggiunta nell'indice; le altre righe modificate dell'indice sono di altri flussi, preesistenti e non toccate |

## Controllo del diff e decisioni

- Diff atteso: un file nuovo (questo) e una riga in `documentazione/reports/README.md`.
- Nessun ADR creato o modificato; nessuna decisione presa. Le proposte [P] attendono Q-U1…Q-U12.
- **Conflitto da registrare [V]:** il messaggio attuale `onboarding` di `haLogin.ts` («Completa la configurazione iniziale di Home Assistant») rimanda all'interfaccia di HA, contro la decisione del 2026-10-23 («l'utente finale non apre mai HA»). Va corretto con la tappa B1 o B3, non qui.
- Proposta fuori incarico (da registrare dalla sessione che coordina, non applicata): in ADR-0021/0022, `local_only` non protegge gli accessi passati dal proxy (§1.3).

## Chiusura e punto di ripresa

- **Stato:** in attesa delle risposte dell'utente a Q-U1…Q-U12.
- **Prossimo passo:** A0, cioè risposte ed eventuale ADR. Poi, su incarico, A1 (catalogo e contratti) dopo il commit della parte server di D1.
- **Coordinamento:** `project-status.md` non è aggiornato da questo incarico, perché è modificato da altri flussi. La sessione che coordina aggiunge il rimando a questo report. Nessun commit.

## Rettifiche successive

Nessuna.
