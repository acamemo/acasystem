# REP-20261023-003 — Piano: aggiungere, configurare e rimuovere dispositivi da Acasystem al posto dell'interfaccia di HA

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261023-003: **solo piano** per far sì che Acasystem sostituisca l'interfaccia di Home Assistant (HA) nel trovare, aggiungere, configurare e rimuovere i dispositivi. Prima tappa: il TV LG 65" a `192.168.1.26`. |
| Stato | **Proposto.** Piano scritto e rivisto il 2026-10-23 dopo una critica indipendente (sezione «Rettifiche dopo la critica»). Nessuna tappa di realizzazione è avviata. Si attendono le risposte alle domande della sezione 9 e l'autorizzazione di ciascuna tappa. **Aggiornamento 2026-10-23 (allineamento D1):** in fondo sono state aggiunte quattro sezioni: «Piano operativo aggiornato (2026-10-23)», «Permessi del cliente (2026-10-23)», «Incarico D1 pronto da autorizzare (2026-10-23)» e «Decisioni ancora necessarie per iniziare D1 (2026-10-23)». Dove contraddicono le sezioni precedenti, prevalgono. Nessuna tappa di realizzazione è autorizzata. |
| Data | 2026-10-23 (Europe/Rome) |
| Autore / modello | Piano scritto da Claude Code (Opus 5.5, `claude-opus-5-5`). Ricerca preparatoria di tre subagenti Claude Code (Sonnet 5.5, `claude-sonnet-5-5`) in `backup/piano-dispositivi/` (`api-ha.md`, `architettura.md`, `casi.md`), esclusa da Git. |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` (`master`). L'albero di lavoro ha molte modifiche non committate di altri flussi (0.9.27, ISSUE-109, ADR-0019, REP-20261023-002): lasciate intatte. Nessun commit eseguito. |
| Richiesta di riferimento | Utente, 2026-10-23: «l'app Acasystem deve essere in grado di configurare e aggiungere il dispositivo, sostituendo completamente l'interfaccia di HA base, quindi non voglio andare su HA, ma su Acasystem e poterlo non solo individuare ma anche mettere e configurare, capito?». Messaggi precedenti dello stesso giorno: il titolare usa HA di base, accende il suo TV LG e apre Netflix «senza installare niente a livello di plugin»; «acasystem usandolo come backend, deve riuscire a integrare perfettamente il televisore senza cose esterne e di conseguenza deve essere compatibile con tutto mediante i protocolli»; l'accensione dei TV si chiama «wake on wireless lan». |
| Autorizzazione | Per il TV LG 65" (`192.168.1.26`) l'utente ha autorizzato l'integrazione e l'accensione (opzioni A + B di [REP-20261023-001](REP-20261023-001-rilevamento-dispositivi.md)), **da fare attraverso Acasystem e non dall'interfaccia di HA**. Oggi Acasystem non lo permette (sezione 1), quindi l'autorizzazione si potrà usare solo dopo la prima tappa. **Aggiunta dell'utente (2026-10-23):** la tappa infrastrutturale del banco (HA OS in VirtualBox con scheda a ponte sul Wi-Fi) entra nel piano come voce di piano («ok, mettila nel piano»). Per i clienti l'utente preferisce un mini-PC dedicato e non un Raspberry. **Questo incarico** autorizza soltanto il piano: niente modifiche a codice, HA, Docker, rete o tablet; niente browser sul PC; niente credenziali o token; niente chiamate autenticate a HA; niente comandi ai dispositivi; niente commit. |

Legenda: **[O]** osservazione (fonte primaria, codice o file letto, con riferimento); **[V]** valutazione dell'agente; **[P]** proposta, non autorizzata; **[NV]** non verificato.

## Risposta breve

1. **[O] Oggi non si può fare.** In HA l'aggiunta di un'integrazione passa **solo** da una chiamata REST (`POST /api/config/config_entries/flow`); non esiste un comando WebSocket equivalente. Il proxy `/ha` di Acasystem consente 14 rotte REST e nessuna di configurazione (risposta 404). È la scelta esecutiva di [ADR-0009](../decisions/ADR-0009-home-assistant-dietro-acasystem.md): «l'interfaccia di amministrazione di Home Assistant non passa da Acasystem». Il tunnel WebSocket invece non filtra: i comandi su registri, aree e flussi scoperti passano già.
2. **[V] Si può fare senza l'interfaccia di HA e senza plugin.** L'interfaccia ufficiale di HA usa solo API del proprio server. Acasystem può usare le stesse API e disegnare nel proprio stile i passi dei **flussi di configurazione** di HA. I protocolli (webOS, Wake on LAN, Zigbee, Hue…) restano nelle integrazioni già contenute in HA: Acasystem non li reimplementa. «Compatibile con tutto» vuol dire un **motore generico** che disegna qualunque flusso di HA, più alcune **schermate dedicate** dove il motore non basta. Al tag 2026.9.4 i flussi da interfaccia sono 897 su 1366 integrazioni.
3. **[P] Architettura.** Il backend di Acasystem offre una piccola **facciata** (`/api/dispositivi/…`) per **tutte** le scritture del percorso «Dispositivi»: avvio, passi, ripresa e annullamento dei flussi, nome, stanza, «Non mi interessa», rimozione, ricetta di accensione. Applica il controllo del ruolo lato server, le conferme, il registro delle azioni, la memoria dei flussi aperti e tempi d'attesa adatti. Le sole letture restano sul tunnel come oggi. Serve un ADR nuovo, che modifica la scelta esecutiva di ADR-0009: bozza [ADR-0021](../decisions/ADR-0021-configurazione-dispositivi-da-acasystem.md), stato «Proposta». **[O+V] Limite dichiarato:** la facciata protegge l'interfaccia di Acasystem, **non HA**. Il tunnel WebSocket resta aperto e ogni amministratore di HA può già da lì rimuovere dispositivi e integrazioni senza registro (sezione 4.1, domanda D-D16).
4. **[O] Sicurezza.** HA concede aggiunta, configurazione e rimozione solo a un utente **amministratore di HA**. REQ-06 chiede che il cliente non resti amministratore, e la sessione installatore non esiste ancora (ISSUE-006, ISSUE-008, D-H5). [V] Se il tablet del cliente usa un account amministratore o un token kiosk di un amministratore, la regola «chi è admin» darebbe «Aggiungi» e «Rimuovi» anche alla persona di 65 anni. Per questo la prima tappa usa una **variante minima** (sezione 4: la funzione si apre solo con un nuovo accesso di un amministratore, che dura poco) e dichiara che D1 **non** soddisfa AC-06. La regola definitiva è una domanda per l'utente (D-D1 = D-H5).
5. **[O+V] TV LG.** Il flusso `webostv` chiede solo l'indirizzo, poi l'abbinamento: la richiesta compare sul TV **solo dopo** che Acasystem ha inviato il passo, e da quel momento ci sono circa 10 secondi per premere OK sul telecomando. In HA l'accensione richiede **in più** l'integrazione `wake_on_lan` con il **MAC** del TV, che HA non fornisce, e un collegamento tra il trigger `webostv.turn_on` e il pulsante Wake on LAN. Netflix si apre con `media_player.select_source`, che Acasystem usa già. **Limite di rete:** con HA nel container `bridge` di Docker Desktop, il pacchetto di accensione probabilmente non esce sulla LAN e la scoperta automatica è cieca. Per questo il piano prevede la tappa infrastrutturale **HA OS in VirtualBox con scheda a ponte** (sezione 6.1).
6. **Prima tappa (D1, sezione 7):** dalla pagina Sistema > Dispositivi di Acasystem si aggiunge il TV per indirizzo, lo si abbina, gli si danno nome e stanza, si imposta l'accensione e la si prova, e si apre Netflix dal widget collegato come oggi. Tutto questo senza mai aprire HA. Il ritorno automatico al foglio «Collega» non serve all'obiettivo ed è spostato in D5, così D1 non dipende da ADR-0019. Prima di toccare il TV si fa una **prova di rete** (P0: un solo pacchetto magico di prova, esito registrato) e l'ordine consigliato porta HA sulla LAN (I0-I5) **prima** della prova con il TV, perché dal bridge di Docker Desktop il pacchetto probabilmente non esce.

## Obiettivo e perimetro

**Obiettivo del prodotto (richiesta dell'utente):** Acasystem sostituisce l'interfaccia di HA per trovare, aggiungere, configurare e rimuovere i dispositivi.

**Obiettivo di questo incarico:** il piano, scritto in modo che ogni tappa sia piccola, misurabile ed eseguibile da un modello leggero, più la bozza di ADR e le domande per l'utente.

**Ammesso in questo incarico:** questo report; la bozza `decisions/ADR-0021-configurazione-dispositivi-da-acasystem.md` in stato «Proposta»; le righe nuove di `reports/README.md` e `decisions/README.md`, riletti subito prima di salvarli. Letture in sola lettura del repository e di fonti pubbliche. Due letture in sola lettura sul PC (memoria, processore, disco libero e schede di rete attive), per dimensionare la macchina virtuale.

**Escluso:** qualsiasi file sotto `progetto/`; HA, Docker, VirtualBox, rete, router, tablet e TV; `product.md`, `project-status.md`, `verification.md`, `infrastructure.md` e `compliance.md`, modificati da altri flussi (le voci da registrare sono in fondo); la 0.9.27 e i suoi file; il contenuto di ADR-0019 (memoria della configurazione per dispositivo, altro flusso), di cui il piano usa solo la regola «copia al collegamento, poi widget indipendenti, impostazioni del dispositivo condivise»; la cornice dei pannelli di [REP-20261023-002](REP-20261023-002-studio-pannelli-widget.md) e [ADR-0020](../decisions/ADR-0020-pannelli-per-capacita.md), che questo piano usa come contenitore delle impostazioni del dispositivo senza modificarla.

**Collegamenti:** REQ-02, REQ-06, REQ-07, REQ-15, REQ-17; ADR-0004, ADR-0005, ADR-0009, ADR-0011, ADR-0016, ADR-0019 (in scrittura), ADR-0020 (proposta); ADR-0015 (riservata a «Hub e bridge», non creata); [REP-20261021-001](REP-20261021-001-hub-bridge-piano.md) (decisioni D-H1…D-H12 aperte); [REP-20261023-001](REP-20261023-001-rilevamento-dispositivi.md); ISSUE-006, ISSUE-008, ISSUE-076, ISSUE-102, ISSUE-110, ISSUE-112.

**Modifiche preesistenti:** l'elenco di `git status` all'avvio mostra file modificati in `documentazione/` (compresi i due indici che questo incarico aggiorna) e in `progetto/acasystem/`. Gli indici sono stati riletti subito prima della scrittura e modificati solo con l'aggiunta di una riga; il resto non è stato toccato.

## Criteri di completamento

Di questo incarico (piano):

| Criterio | Esito |
|---|---|
| Richiesta citata; obiettivo dichiarato | Fatto (intestazione e perimetro) |
| Architettura: motore generico sui flussi di HA più schermate dedicate | Fatto (sezione 2) |
| Percorsi dell'utente in parole semplici: trovati, per marca, per indirizzo, «accetta sul TV», nome e stanza, widget con la regola di ADR-0019, Wake on Wireless LAN creata da Acasystem, rimozione | Fatto (sezione 3) |
| Permessi e sicurezza | Fatto (sezione 4) |
| Limiti onesti: login esterno, scoperta automatica in rete bridge e soluzioni | Fatto (sezione 5) |
| Tappa infrastrutturale del banco (HA OS in VirtualBox) con passi, risorse, migrazione, file da cambiare, riserva, ritorno indietro e limiti | Fatto (sezione 6.1) |
| Preferenza dell'utente per il mini-PC dei clienti, con requisiti e domanda separata su add-on o Docker | Fatto (sezione 6.2 e domanda D-C1) |
| Tappe piccole e misurabili con modello leggero; la prima permette di aggiungere il TV `192.168.1.26` per indirizzo, accenderlo e aprire Netflix da Acasystem | Fatto (sezione 7, tappa D1) |
| Test e prove sul tablet | Fatto (sezione 8) |
| Domande separate per ogni scelta visibile | Fatto (sezione 9) |
| Cosa resta fuori | Fatto (sezione 10) |
| Bozza di ADR «Proposta» col primo numero libero, indici aggiornati dopo una rilettura | Fatto: ADR-0021. ADR-0015 e ADR-0019 sono riservate, ADR-0020 è dello studio dei pannelli |

I criteri delle tappe future sono nella sezione 7 e **non** sono criteri di questo incarico.

## 1. Situazione di partenza [O]

| Elemento | Stato al 2026-10-23 | Fonte |
|---|---|---|
| Banco | HA Container **2026.9.4** (frontend `20260826.7`, Python 3.14), container `homeassistant` in rete `bridge` di Docker Desktop (`172.17.0.2/16`), dati in `C:\homeassistant\config`; Acasystem 0.9.26 | REP-20261023-001 §2; `api-ha.md` §1 |
| Dispositivi in HA | Nessuno reale: 18 entità di servizio, nessun `media_player`; tre aree vuote | REP-20261023-001 §2 |
| TV | `192.168.1.26` («[LG] webOS TV UA751C0LA», anche Google Cast) e `192.168.1.18`; porte 3000/3001 aperte dal PC; il TV non risponde alla ricerca SSDP `webos-second-screen` nemmeno dal PC | REP-20261023-001 §3 |
| Proxy HTTP | Lista consentita di 14 rotte (`backend/src/config/homeAssistantProxy.ts:129-146`); fuori lista risponde 404 `HA_PATH_NOT_ALLOWED` | `architettura.md` §1.1 |
| Tunnel WebSocket | `GET /ha/api/websocket`, socket collegati con `pipe` senza lettura dei messaggi (`services/homeAssistantProxyService.ts:465-466`); `SystemPage.tsx:204-209` invia già un comando di amministrazione (`config/core/update`) | `architettura.md` §1.1, §2 |
| Tempo massimo di prima risposta del proxy | 30 s (`HA_PROXY_RESPONSE_TIMEOUT_MS`, `backend/src/config/env.ts:43`, 1 s-5 min) | `architettura.md` §1.2 |
| Ruoli | Acasystem non ha ruoli propri: legge `is_admin`/`is_owner` da HA (`homeAssistantAuthService.ts:257-285`) soltanto su `/api/profiles`, `/api/settings` e `/api/casa3d`; dietro l'ingress del Supervisor l'utente fidato non è admin | `architettura.md` §1.3 |
| Indirizzo di HA per Acasystem | `TUNET_INTERNAL_HA_URL: http://host.docker.internal:8123` in `progetto/compose.tunet.yaml:26` | file letto |
| Requisiti | Nessun requisito descrive l'aggiunta di dispositivi dall'app. REQ-06 (approvato, non realizzato): «Admin configura e associa dispositivi; primo setup con logout admin e login cliente» | `product.md` righe 174, 213 |
| Piano hub e bridge | Proposto, non autorizzato; D-H5 (ruolo installatore), D-H6 (dove sta «Aggiungi») e D-H7 (estensione del proxy ai flussi, ADR-0015) senza risposta. Riserva «nuovi REQ dal REQ-18» e assegna ad ADR-0015 l'estensione del proxy ai flussi con registro lato server | REP-20261021-001 righe 50, 235, 256-258 |

## 2. Architettura proposta [P, salvo dove indicato]

### 2.1 Principio

Acasystem diventa il **client dei flussi di configurazione di HA**. HA resta il motore: conosce i protocolli, convalida i dati, salva le chiavi di abbinamento e crea dispositivi ed entità. Acasystem disegna ogni passo in italiano con le primitive di Kit 2, decide chi può farlo e registra cosa è successo.

Due livelli:

1. **Motore generico.** Riceve dal server di HA il «risultato» di un passo e lo disegna. I tipi di risultato sono `form`, `menu`, `progress`, `external`, `abort` e `create_entry` ([O] `FlowResultType` al tag 2026.9.4; `progress_done` ed `external_done` non arrivano al client). In questo modo ogni integrazione che HA configura da interfaccia passa dallo stesso motore, anche quelle che arriveranno in futuro.
2. **Schermate dedicate**, solo dove il motore generico non basta o dove una persona di 65 anni ha bisogno di una guida: «Accetta sul TV», accensione (Wake on LAN), nome e stanza dopo l'aggiunta, «Accedi al servizio» per i login esterni, istruzioni di rete per famiglie particolari (Shelly Gen1, Sonos). Una schermata dedicata si riconosce dal dominio e dal passo (`handler` + `step_id`). Il server di HA resta comunque quello che decide il passo successivo.

### 2.2 Canale di scrittura: tre alternative

| | A. Rotte di configurazione nella lista consentita del proxy | **B. Facciata del backend `/api/dispositivi/…`** | C. Filtro dei messaggi del tunnel |
|---|---|---|---|
| Idea | Aggiungere `/api/config/config_entries/flow…` e simili alla lista | Il browser chiama Acasystem; il backend controlla e inoltra a HA con il token dell'utente | Il backend legge ogni messaggio WebSocket e lo ammette o lo rifiuta |
| Controllo di Acasystem | Nessuno oltre al ruolo di HA | Ruolo verificato dal server, elenco dei gestori ammessi, conferme, registro, limiti di frequenza, tempi d'attesa propri | Pieno, ma il tunnel va riscritto |
| Lavoro | Piccolo | Medio | Grande e fragile |
| Registro delle azioni | No | **Sì** | Sì |

[V] B è la soluzione consigliata dall'agente: il server vede e registra ciò che passa **dall'interfaccia di Acasystem** e può limitare cosa si aggiunge da lì. A apre a ogni amministratore tutta la potenza di HA senza traccia. **B non è un confine di sicurezza per HA**: finché il tunnel resta un `pipe`, un amministratore di HA può inviare da lì `config/device_registry/remove`, `config/entity_registry/remove`, `config/area_registry/delete`, `config_entries/disable`, `config_entries/ignore_flow` e altri comandi distruttivi senza registro e senza elenco dei gestori (sezione 4.1). C è l'unico modo di chiudere questa porta: conviene prima di dare la funzione ai clienti, se l'utente lo decide (D-D16). La scelta è tecnica e ricade nell'ADR (D-D13).

### 2.3 Operazioni previste

**Scritture, dalla facciata (REST verso HA, sempre come amministratore di HA).** Le rotte HA sono quelle lette al tag 2026.9.4 ([O] `api-ha.md` §4-§11).

| Rotta Acasystem (nomi indicativi) | Chiamata HA | Note |
|---|---|---|
| `POST /api/dispositivi/flussi` `{handler}` | `POST /api/config/config_entries/flow` | Avvio. `handler` ammesso solo se è nell'elenco consentito (D-D3) e ha `config_flow` |
| `POST /api/dispositivi/flussi/:id` | `POST …/flow/{flow_id}` | Passo. Tempo d'attesa proprio, per esempio 90 s, perché l'abbinamento e certe scansioni sono lente. Solo per un `flow_id` della tabella dei flussi (sezione 2.7) |
| `GET /api/dispositivi/flussi/:id/ultimo` | nessuna chiamata a HA | **Riprendi:** restituisce l'ultimo passo noto salvato dalla facciata (schema ed errori, mai i valori inseriti). Non usa il `GET` di HA, che **[O] riesegue il passo corrente** |
| `GET …/flow/{flow_id}` di HA | — | Usato dalla facciata solo dopo un evento `data_entry_flow_progressed` (passi `progress`/`external`) o per aprire un flusso scoperto la prima volta |
| `DELETE /api/dispositivi/flussi/:id` | `DELETE …/flow/{flow_id}` | Annulla. [O] In HA non richiede il ruolo admin; la facciata lo richiede comunque. Va chiamata quando l'utente esce prima della fine. Un 404 di HA (flusso già chiuso, per esempio dopo un `abort`) non è un errore |
| `POST /api/dispositivi/scoperti/:id/ignora` | WS `config_entries/ignore_flow` | «Non mi interessa», dalla facciata per averlo nel registro |
| `POST /api/dispositivi/:deviceId/nome-stanza` | WS `config/device_registry/update` (`name_by_user`, `area_id`), `config/area_registry/create` | Nome e stanza, dalla facciata. Il backend apre una connessione WebSocket a HA con il token dell'utente |
| `POST /api/dispositivi/opzioni` e `/:id` | `…/options/flow` | Opzioni (per il TV: le app da mostrare) |
| `POST /api/dispositivi/flussi` `{handler, entry_id}` | `POST …/flow` con `entry_id` | Riconfigurazione («cambia indirizzo», «riabbina») |
| `DELETE /api/dispositivi/integrazioni/:entryId` | `DELETE …/entry/{entry_id}` | Rimozione: doppia conferma, codice monouso (sezione 4) |
| `POST /api/dispositivi/accensione` | `POST …/flow {handler:"wake_on_lan"}` + `POST /api/config/automation/config/{id}` | Ricetta chiusa (D-D5): il server costruisce l'automazione da un modello fisso e l'utente non può scriverne il testo. Gli id di dispositivo ed entità li ricava il server (sezione 2.6), non il browser |
| `DELETE /api/dispositivi/accensione/:id` | `DELETE /api/config/automation/config/{id}` + rimozione della voce Wake on LAN | [O] Per un id inesistente HA risponde 400, non 404 |

**Sole letture, sul tunnel WebSocket (passano già oggi).**

| Uso | Comando HA | Admin in HA |
|---|---|---|
| Elenco delle integrazioni configurate | `config_entries/subscribe` | no |
| Dispositivi trovati in attesa | `config_entries/flow/subscribe` | sì |
| Avanzamento di passi lunghi | `subscribe_events` di `data_entry_flow_progressed` | sì |
| Testi dei passi | `frontend/get_translations` (`language:"it"`, `category:"config"`, `integration`, `config_flow:true`) | no |
| Catalogo per marca | `integration/descriptions` | sì |
| Dispositivi, entità, stanze | `config/device_registry/list`, `config/entity_registry/list`, `config/area_registry/list` | no |

[P] Ogni **scrittura** del percorso «Dispositivi» passa dalla facciata, compresi nome, stanza e «Non mi interessa», così il registro di Acasystem è completo per ciò che parte dalla sua interfaccia. Resta valido il limite della sezione 4.1: il tunnel non è filtrato.

### 2.4 Motore generico: cosa disegna

| Risultato di HA | Cosa vede l'utente in Acasystem |
|---|---|
| `form` | Un passo per schermata: titolo, spiegazione breve, campi grandi; pulsante «Avanti» o «Fine» secondo `last_step`; errori sotto il campo o in testa (`base`) |
| `menu` | Scelte grandi, una per riga |
| `progress` | Attesa con testo e animazione, senza input; si aggiorna all'evento di avanzamento |
| `external` | Schermata dedicata «Accedi al servizio» (sezione 5.1), non coperta nelle prime tappe |
| `abort` | Messaggio in italiano con una via d'uscita («Riprova», «Controlla che il TV sia acceso», «Esci»). All'uscita la facciata chiama comunque `DELETE`; il 404 di HA (flusso già chiuso) è tollerato e non è un errore |
| `abort` di successo dopo una modifica (`reconfigure_successful`, `reauth_successful`) | «Fatto», non un messaggio d'errore. La facciata distingue questi motivi da quelli di fallimento con un elenco proprio |
| `create_entry` | «Dispositivo aggiunto», poi nome e stanza (sezione 3) |
| `create_entry` con `next_flow` | [O] HA indica un flusso successivo da aprire. La facciata lo segue **solo** se il gestore di quel flusso è nell'elenco dei gestori ammessi; altrimenti «Dispositivo aggiunto» e una riga «Il passo seguente non si può ancora fare da Acasystem» |
| `form` con `data_schema` vuoto, che non è un abbinamento (`confirm`, `discovery_confirm`) | Una schermata «Conferma» con il testo del passo e un pulsante «Conferma», mai un modulo vuoto. Comune nei flussi scoperti (D4) |
| `description_placeholders` (in `form`, `abort`, errori) | Le variabili `{nome}` del testo tradotto vengono sostituite con i valori di HA, come testo semplice. Un segnaposto senza valore resta visibile come nome tra parentesi, non vuoto |
| Campo `required` con `default` | Il campo si mostra con il valore predefinito già inserito; se il motore decide di nasconderlo (per esempio una porta tecnica), il valore predefinito viene inviato comunque |

**Campi** ([O] `data_schema` serializzato con `probatio.to_field_list`, 44 selettori al tag 2026.9.4, 45 in 2026.10.2). Prima copertura: tipi `string`, `integer`, `float`, `boolean`, `select`, `multi_select`, `constant`, `expandable` e selettori `text` (anche `password`), `number`, `boolean`, `select`. Poi `entity`, `device`, `area`, `serial_port`, `file`, `qr_code`. Un campo che il motore non conosce **non si indovina**: il passo mostra «Questo dispositivo non si può ancora aggiungere da Acasystem», il flusso si annulla con `DELETE` e la scelta del ripiego è nella domanda D-D4.

**Testi** ([O] `api-ha.md` §9). Etichette e spiegazioni vengono dalle traduzioni di HA in italiano. Dove manca l'italiano, HA restituisce l'inglese: sul banco, per esempio, mancano gli errori `cannot_connect` ed `error_pairing` di `webostv`. Il piano prevede un **dizionario di Acasystem** con priorità sulle traduzioni di HA per i motivi più frequenti (`cannot_connect`, `already_configured`, `already_in_progress`, `error_pairing`, `invalid_auth`, `no_devices_found`, `unknown`), più i testi dei pulsanti, che non vengono dal core. Le descrizioni di HA sono in markdown, con immagini `/static/…` e link: il renderer non usa HTML grezzo e la scelta sulle immagini è nella domanda D-D15.

### 2.5 Dove si trova nell'app

| Punto | Ruolo | Riferimento |
|---|---|---|
| **Sistema > Dispositivi** (sezione nuova, pagina a schermo intero con «Esci» sempre visibile, come Casa 3D secondo ADR-0016) | Casa di tutto il percorso: trovati, aggiungi, elenco dei dispositivi, impostazioni, rimozione | `pages/system/SystemPage.tsx:86-232` |
| **Foglio «Collega» senza entità adatte** | Ingresso «Aggiungi un dispositivo», con il tipo del widget già noto (per esempio televisore). Alla fine si torna al foglio con l'entità nuova già scelta | `templates/sheets/CategoryBindingSection.tsx` |
| **«Dispositivo (Home Assistant)»** nella cornice comune dei pannelli, nome indicativo | Solo per chi ha il ruolo: nome, stanza, riabbina, cambia indirizzo, stato dell'accensione. Separato dalle «Impostazioni del dispositivo» di REP-20261023-002/ADR-0020, che sono preferenze condivise di Acasystem (ADR-0019). **Nessuna rimozione qui**: «Rimuovi il dispositivo» sta solo in Sistema > Dispositivi, lontano da «Elimina» del widget (D-5 dello studio) | REP-20261023-002, ADR-0020 (proposta); domanda D-D17 |
| Cella «+» e barra «Aggiungi widget» | **Non** usate: aggiungono widget, non dispositivi. Mescolare i due significati confonde | `templates/launcher/WidgetGrid.tsx:179` |

[V] Il percorso di aggiunta è lungo (indirizzo, abbinamento, nome, stanza, accensione). Una pagina a schermo intero evita fogli annidati, che sul Tab M11 hanno già un ritardo misurato di 361-380 ms all'apertura (ISSUE-112).

### 2.6 Dati

- **Restano in HA**, quindi condivisi da tutti i widget: integrazione, chiave di abbinamento (che non esce mai da HA: [O] `create_entry` toglie `data` dalla risposta REST), nome del dispositivo, stanza, app mostrate (opzioni di `webostv`), voce Wake on LAN e automazione di accensione.
- **In Acasystem, `tunet.db`:**
  - **registro delle azioni** (utente, azione, dominio, `entry_id`, esito, data). Non contiene mai password, chiavi, MAC, indirizzi IP, contenuto dei campi o token;
  - **flussi aperti dalla facciata** (sezione 2.7);
  - **legami della ricetta di accensione**: `entry_id` di `webostv`, `entry_id` di `wake_on_lan`, id dell'automazione, `device_id` ed `entity_id` usati, data. Niente MAC (sta solo nella voce `wake_on_lan` di HA). Questa tabella è l'unica fonte per «Rimuovi» e per il controllo dello stato della ricetta.
- **Come il server ricava gli id della ricetta [P].** Il browser non manda id. Dopo i due `create_entry` il server conosce gli `entry_id` (campo `result` della risposta, [O] `api-ha.md` §4 e §8) e risale al resto dal registro ([O] `api-ha.md` §10: filtrare per `config_entry_id`): `config_entries/get` fino allo stato `loaded`, con un tempo massimo (per esempio 30 s) e poi errore chiaro «Il televisore non ha finito di avviarsi, riprova»; poi `config/device_registry/list` filtrato per `config_entry_id`, poi `config/entity_registry/list` per `device_id` (il `media_player` di `webostv`, il `button` di `wake_on_lan`). Se una richiesta del browser contiene un id che non appartiene alle voci create dalla ricetta, la facciata risponde 400.
- Il collegamento tra il widget e l'entità segue la regola di ADR-0019 (sezione 3, passo 6).

### 2.7 Ciclo di vita dei flussi [P]

[O] I flussi di HA vivono in memoria nel server di HA. `config_entries/flow/progress` **non** elenca i flussi con sorgente `user` né `reconfigure` (`api-ha.md` §5-§6), quindi un flusso aperto e dimenticato non si ritrova da HA e i tentativi successivi sullo stesso TV possono finire in `already_in_progress`.

- **Tabella dei flussi aperti** in `tunet.db`: `flow_id`, `handler`, utente (id di HA), sessione o tablet, inizio, scadenza, ultimo passo noto (`step_id`, schema ed errori; mai i valori inseriti).
- **Annullamento sicuro:** alla scadenza (per esempio 15 minuti senza passi) e **all'avvio del backend** la facciata chiama `DELETE` per ogni flusso rimasto in tabella e lo toglie; il 404 di HA vale come già chiuso.
- **Appartenenza:** ogni `POST`, `DELETE` o «Riprendi» su `/flussi/:id` controlla che il `flow_id` sia in tabella, dello stesso utente, con un gestore ammesso. Per un flusso scoperto (D4), che non è in tabella, la facciata lo cerca prima in `config_entries/flow/progress` e controlla il gestore; solo allora lo registra. Flussi di `reauth` o di altri domini non ammessi: 403.
- **Ricarica, spegnimento o sospensione del tablet a metà percorso:** alla riapertura di Sistema > Dispositivi, se l'utente ha un flusso aperto, compare «Hai un'aggiunta in sospeso: Riprendi / Annulla». «Riprendi» chiede l'ultimo passo noto alla facciata, senza il `GET` di HA.
- **Due tablet sullo stesso TV (`already_in_progress`):** messaggio «Qualcuno sta già aggiungendo questo televisore» con «Riprendi» (se il flusso è dello stesso utente) oppure «Annulla l'altro tentativo» (solo con il ruolo, con conferma, annotato nel registro).

## 3. Percorsi dell'utente in parole semplici [P]

Chi guida è l'installatore. La persona di 65 anni vede il risultato: un widget del TV che si accende e apre Netflix. I nomi delle voci sono indicativi.

1. **Dispositivi trovati.** In Sistema > Dispositivi, in alto, la sezione «Trovati» mostra i dispositivi che HA ha già visto sulla rete e che aspettano conferma, uno per riga, con nome e marca. Si tocca «Aggiungi» oppure «Non mi interessa», che li nasconde per sempre (`ignore_flow`). **Sul banco di oggi la sezione resta vuota** perché HA non vede la rete (sezione 5.2): finché è vuota spiega il perché in una riga (D-D11).
2. **Aggiungi per marca.** «Aggiungi un dispositivo» apre un elenco di famiglie con icone grandi (Televisori, Luci, Clima, Prese, Altoparlanti…). Dentro ci sono le marche più comuni. L'estensione dell'elenco è una domanda (D-D3).
3. **Aggiungi per indirizzo.** Per il TV LG: «Televisori > LG» chiede soltanto l'indirizzo, con l'esempio «192.168.1.26» e una riga di aiuto: «Lo trovi nel menu Rete del televisore». Se l'indirizzo è sbagliato o il TV è spento: «Non riesco a raggiungere il televisore. Controlla che sia acceso e collegato alla stessa rete», con «Riprova».
4. **Abbinamento «Accetta sul TV».** [O] La richiesta compare sul TV **solo quando** HA riceve il passo `pairing` e si collega al TV; da quel momento HA attende la risposta per circa 10 secondi mentre la chiamata è ancora aperta ([O] `casi.md` flusso webostv punto 2; `api-ha.md` §13 punto 4; `aiowebostv` 0.10.0, `RECEIVE_TIMEOUT = 10`). Schermata dedicata: «Tieni in mano il telecomando del televisore. Premi **Avanti**: sul televisore comparirà una richiesta. Hai 10 secondi per premere **OK** sul telecomando». Il pulsante grande «Avanti» invia il passo. Durante la chiamata la schermata mostra «Guarda il televisore e premi OK» con un **conto alla rovescia** da 10 e nessun altro pulsante attivo. Se la richiesta non viene accettata in tempo (`error_pairing`) o il TV non risponde (`cannot_connect`), si vede «Il televisore non ha ricevuto la conferma. Riprova»; «Riprova» rimanda **lo stesso passo** `pairing`, senza ripartire da capo. Prima di questo passo si ricorda che sul TV deve essere attivo «LG Connect Apps» ([O] pagina `webostv`; il nome della voce varia con il modello).
5. **Nome e stanza.** «Come vuoi chiamarlo?» (proposta: «Televisore»), poi «In quale stanza si trova?» con le stanze di HA e «Nuova stanza». Salvataggio dalla facciata, che usa `config/device_registry/update`.
6. **Collegamento al widget.** Nella prima tappa il TV nuovo si collega al widget dal foglio «Collega» **come oggi**, perché ora esiste un `media_player` adatto. L'ingresso dal foglio «Collega» vuoto con ritorno automatico è spostato in D5 (dipende da ADR-0019). Altrimenti la domanda D-D9 decide se proporre «Mostralo nella pagina…». Vale la regola di ADR-0019: **copia al collegamento, poi widget indipendenti, impostazioni del dispositivo condivise**. Al collegamento il widget copia le impostazioni del dispositivo che gli servono (per esempio quali app mostrare come pulsanti); da quel momento l'aspetto del widget è solo suo. Nome, stanza, app di HA e accensione restano del dispositivo e valgono per ogni widget che lo usa.
7. **Accensione con Wake on Wireless LAN, creata da Acasystem.** Schermata «Accendere il televisore da spento». (a) Una guida: sul TV attivare l'accensione via Wi-Fi o via rete ([O] pagina `webostv`: «Wake on LAN» nelle impostazioni IP; dai modelli 2017 «Mobile TV On > Turn On Via WiFi»; il nome varia). (b) Il **MAC** del TV, perché HA non lo fornisce ([O] il `DeviceInfo` di `webostv` non ha `connections`). Si legge nel menu del TV o nell'elenco del router, e la schermata spiega dove (D-D6). (c) «Prova ad accendere»: lo dice chiaramente che è un comando al TV e chiede conferma; poi spegnere il TV dal telecomando e ritoccare. Dietro le quinte Acasystem aggiunge la voce `wake_on_lan` (MAC, indirizzo di broadcast) e, secondo D-D5, crea in HA l'automazione chiusa «quando si chiede di accendere il TV → premi il pulsante Wake on LAN». Dopo, il pulsante di accensione del widget funziona.
   - **Indirizzo di broadcast [P]:** lo ricava il server dall'indirizzo del TV già inserito, nell'ipotesi dichiarata di una rete /24 (`192.168.1.26` → `192.168.1.255`). Il browser del tablet non conosce la rete del PC, e la rete del PC cambia tra casa e ufficio: conta la rete da cui **HA** invia. Con `255.255.255.255` e HA nel bridge il pacchetto resta nel bridge; con HA in VM a ponte vale la rete della VM. Il valore si vede nel riepilogo ed è modificabile solo dall'installatore («Avanzate»).
   - **Entità create dalla ricetta, tenute fuori dalla vista del cliente [P]:** il `button` di Wake on LAN viene nascosto in HA (`config/entity_registry/update` con `hidden_by: "user"`) e l'automazione riceve un'etichetta riconoscibile (id con prefisso fisso, per esempio `acasystem_accensione_…`; categoria o etichetta di HA se disponibile, [NV] non lette). Acasystem le esclude dal widget Automazioni (`components/widgets/controls/automation/AutomationWidget.tsx`), dalle righe della Stanza e dalle liste del «Collega» per i pulsanti (`operationalProfile.ts` tratta `button` con `press`). Altrimenti la persona di 65 anni vedrebbe un pulsante «Wake on LAN» incomprensibile o potrebbe disattivare l'automazione, e l'accensione si romperebbe senza avviso.
   - **Controllo dello stato:** nelle impostazioni «Dispositivo (Home Assistant)» una riga «Accensione: funziona / non funziona» legge dai legami salvati (sezione 2.6) se l'automazione esiste ed è attiva e se il pulsante esiste. Se è disattivata o mancante: avviso «L'accensione da spento non è attiva» con «Ripristina» (solo con il ruolo).
8. **Netflix.** Nel widget del TV le app arrivano da `source_list` e si aprono con `media_player.select_source`, che `TvDetails.tsx` usa già. Un'azione unica «Accendi e apri Netflix» sarebbe un comportamento nuovo: domanda D-D7.
9. **Configurare dopo.** Voce «Dispositivo (Home Assistant)», solo con il ruolo e distinta dalle preferenze condivise di Acasystem di REP-20261023-002: «Nome», «Stanza», «Cambia indirizzo» o «Riabbina» (riconfigurazione), «Accensione» (stato, modifica o prova). **«App da mostrare»** (opzione `sources` di `webostv`, che filtra `source_list` in HA) si sovrappone alla D-13 dello studio dei pannelli (sorgenti preferite di Acasystem) e alla regola «copia al collegamento» di ADR-0019: dove si filtrano le app del TV è una domanda unica (D-D18), e fino alla risposta il piano non usa il flusso di opzioni.
10. **Rimozione.** Solo in Sistema > Dispositivi, **mai** nel foglio del widget accanto a «Elimina» (che elimina il widget). «Rimuovi il televisore» → prima schermata: «Il televisore sparirà da Acasystem. I 2 widget che lo usano diventeranno "Da collegare"» → seconda conferma con il nome del dispositivo. Si rimuovono insieme l'integrazione, la voce Wake on LAN e l'automazione di accensione create da Acasystem. Il registro annota chi e quando. I widget passano allo stato «Da collegare» già esistente (ISSUE-076). La rimozione è prevista in una tappa successiva (D-D8).

## 4. Permessi e sicurezza

**Chi può farlo.** [O] In HA aggiungere, configurare, riconfigurare e rimuovere richiede `is_admin`. Elenco delle integrazioni, traduzioni e lettura dei registri no. [P] La facciata verifica **sul server** il ruolo dell'utente letto da HA, con la stessa via di `/api/casa3d`. Non si fida di un valore inviato dal browser e risponde 403 prima di chiamare HA. Il pulsante «Aggiungi» compare solo a chi ha il ruolo, ma il controllo vero è sul server. La regola definitiva (D-D1 = D-H5) dipende da REQ-06: sessione installatore aperta esplicitamente, che si chiude da sola dopo un tempo da concordare e non lascia privilegi. La decisione di ISSUE-102 («modificano tutti») vale solo per la Casa 3D e non si estende ai dispositivi senza una decisione nuova.

**Regola provvisoria della prima tappa: variante minima [P].** «Chi è amministratore di HA» non basta: il tablet del cliente può girare con l'account proprietario o con un token kiosk di lunga durata (ADR-0009 lo prevede per i tablet in kiosk), e quel token appartiene a un utente di HA che potrebbe essere amministratore [NV: non è registrato con quale account e quale token girano oggi il tablet del banco e quello del titolare]. Proposta: la pagina Sistema > Dispositivi si **apre solo dopo un nuovo accesso** di un amministratore di HA dalla schermata di login di Acasystem (`/auth/login_flow`, già usata), anche se il tablet è già connesso. Il token ottenuto vale solo per `/api/dispositivi/*`, resta nella memoria della pagina (mai in `localStorage`), scade dopo un tempo breve (per esempio 15 minuti senza azioni) e si chiude con «Esci». Le credenziali le scrive la persona che installa; Acasystem non le salva. Alternativa più semplice, da scegliere in D-D1: la funzione è disponibile solo dal PC e non dal tablet del cliente. **[O+V] Debito dichiarato:** nessuna delle due varianti soddisfa AC-06 di REQ-06 (nessun privilegio admin residuo per il cliente), perché l'account del tablet resta quello che è. L'annotazione va scritta in REQ-06 in T0b. In D1g si registra con quale account gira il tablet e se il token kiosk è di un amministratore.

**Conferme.**

| Azione | Conferma |
|---|---|
| Aggiungere | Nessuna conferma in più: ogni passo è già un'azione esplicita. Si può uscire in ogni momento e il flusso si annulla |
| «Prova ad accendere» | Una conferma, perché è un comando al dispositivo |
| Creare l'accensione (automazione) | Riepilogo in parole semplici («Quando premi Accendi, Acasystem sveglierà il televisore con il suo indirizzo di rete») e «Conferma» |
| Rimuovere | Doppio passo con nome e numero di widget collegati; codice monouso del server tra le due chiamate; solo con il ruolo |

**Altre regole.**

- **Elenco dei gestori ammessi** sul server (negato per difetto): `webostv` e `wake_on_lan` nella prima tappa, poi le famiglie decise in D-D3. Le automazioni si scrivono solo dalla ricetta chiusa, mai da testo inviato dal browser.
- **Segreti:** i campi `password`, le chiavi e i codici non finiscono nei log (il proxy già non registra URL né corpi), in `localStorage`, nel registro o nei messaggi d'errore.
- **Limiti di frequenza** propri per `/api/dispositivi/*` (valore da fissare in tappa, [NV]). Le rotte di configurazione non entrano nella lista del proxy `/ha`.
- **Flussi abbandonati:** annullati con `DELETE` all'uscita, alla scadenza e all'avvio del backend, partendo dalla tabella dei flussi in `tunet.db` e non da un timer in memoria (sezione 2.7).
- **Ingress del Supervisor:** lì l'utente fidato non è admin (`homeAssistantAuth.ts:83-84`), quindi la funzione sarebbe negata. Rilevante per la domanda D-C1.
- **API interne di HA:** [O] queste rotte non compaiono nella documentazione REST pubblica. Tra 2026.9.4 e 2026.10.2 non cambiano (`api-ha.md` §1.1), ma senza garanzia. [P] Versione di HA fissata sul banco, test di contratto su risposte registrate e controllo a ogni aggiornamento di HA.
- **Conformità:** le voci su registro, segreti e cloud vanno aggiunte a `compliance.md` nella tappa T0b.

### 4.1 Che cosa la facciata protegge e che cosa no [O+V]

| Minaccia | Coperta dalla facciata? |
|---|---|
| Il cliente non amministratore tocca «Aggiungi» o «Rimuovi» nell'interfaccia di Acasystem | Sì: 403 dal server |
| Un tablet già connesso con account amministratore apre la funzione per sbaglio | Sì, con la variante minima (nuovo accesso) |
| Si aggiunge da Acasystem un'integrazione fuori dall'elenco dei gestori | Sì |
| Azioni partite dall'interfaccia di Acasystem senza traccia | Sì: registro |
| Un amministratore di HA (o chi ha il suo token) invia dal **tunnel** WebSocket `config/device_registry/remove`, `config/device_registry/remove_config_entry`, `config/entity_registry/remove`, `config/area_registry/delete`, `config_entries/disable`, `config_entries/ignore_flow`, `config/core/update`… | **No.** Il tunnel è un `pipe` (`homeAssistantProxyService.ts:465-466`) e non viene letto: nessun registro, nessun elenco |
| Un amministratore usa direttamente HA sulla porta 8123 | **No.** Fuori da Acasystem (chiusura di HA alla rete rimandata in ADR-0009) |

[V] Il registro è quindi **parziale**: annota ciò che passa dalla facciata, non tutto ciò che accade in HA. Chiudere il tunnel richiede l'alternativa C (filtro dei messaggi). Domanda D-D16: filtrare il tunnel prima di dare la funzione ai clienti, sì o no.

## 5. Limiti onesti

### 5.1 Integrazioni con login esterno (OAuth e servizi cloud) [O+V]

Il passo `external` apre il sito del produttore (Google, Spotify, cloud delle luci Wi-Fi…). Il ritorno passa da `https://my.home-assistant.io/redirect/oauth` se il componente `my` è caricato, altrimenti dall'intestazione `HA-Frontend-Base` più la rotta `/auth/external/callback` di HA ([O] `helpers/config_entry_oauth2_flow.py` al tag 2026.9.4). Oggi il proxy non inoltra quell'intestazione né espone quella rotta. Molte integrazioni chiedono inoltre credenziali dell'applicazione create presso il produttore. Sul tablet a schermo intero la finestra esterna può sparire. **[V] Non rientra nelle prime tappe.** Soluzioni da provare in una tappa dedicata (D8): pagina «Accedi al servizio» che apre il sito in una scheda nuova e torna da sola quando HA segnala l'avanzamento; inoltro controllato di `HA-Frontend-Base` e della rotta di ritorno. Nome utente e password del servizio si scrivono sul sito del produttore, mai in Acasystem. Finché la tappa non c'è, la domanda D-D4 decide cosa vede l'utente.

Altri casi non coperti dal motore generico: Zigbee, Z-Wave, Matter e Thread hanno pannelli e comandi propri (piano hub, REP-20261021-001); le integrazioni solo YAML non hanno un flusso; USB e Bluetooth non arrivano al container su Docker Desktop.

### 5.2 Scoperta automatica impossibile con HA in rete bridge [O+V]

[O] Il container è in `bridge` (`172.17.0.2/16`) dietro il NAT di Docker Desktop. SSDP, mDNS e DHCP non raggiungono la LAN `192.168.1.0/24`, e un broadcast Wake on LAN verso `255.255.255.255` resta nel bridge. La documentazione di HA Container indica che Docker Desktop non è supportato. Le API per i «Trovati» sono pronte, ma l'elenco resta vuoto. [V] Anche il backend di Acasystem gira in un container `bridge`: una scoperta o un pacchetto di accensione inviati da lì avrebbero lo stesso limite, quindi non sono una scorciatoia.

| Soluzione | Effetto | Stato |
|---|---|---|
| **HA OS in VirtualBox con scheda a ponte sul Wi-Fi** (sezione 6.1) | HA ha un indirizzo proprio sulla LAN: scoperta e Wake on LAN come su un impianto vero | **Nel piano, approvata come voce di piano dall'utente** |
| Aggiunta per indirizzo (TV, Shelly, Cast «known hosts», Sonos) | Funziona anche in bridge per il TCP unicast, [NV] dal container | Percorso primario della prima tappa |
| Rete host di Docker Desktop, WSL2 «mirrored», macvlan | Possibile, ma multicast non garantito o non verificato | Opzioni C-D di REP-20261023-001, non scelte |
| Mini-PC con HA in rete host (clienti) | Configurazione supportata da HA | Sezione 6.2 |

Aggravante [O]: dal PC il TV `.26` non risponde nemmeno alla ricerca SSDP `webos-second-screen`. Anche con HA sulla LAN, la comparsa del TV tra i «Trovati» non è garantita: può dipendere da «LG Connect Apps» o dallo standby. L'aggiunta per indirizzo resta quindi necessaria.

### 5.3 Altri limiti

- **Wake on LAN via Wi-Fi:** l'affidabilità dipende dal modello del TV e dal fatto che il TV mantenga attivo il Wi-Fi da spento [NV]. La pagina di HA consiglia il cavo.
- **MAC:** Acasystem non può leggerlo da HA. Si chiede all'installatore.
- **IP del TV:** [O] `webostv` salva l'host nella voce; se l'indirizzo cambia la voce non si collega più e serve «Cambia indirizzo». Serve una prenotazione DHCP sul router dell'ufficio **prima di D1g** o almeno una decisione esplicita di procedere senza (domanda D-D21). È una modifica al router, fuori da Acasystem (domanda D-I4 su chi la fa).
- **Tempi:** il primo avvio di un flusso può caricare l'integrazione; l'abbinamento attende fino a circa 10 s; altre integrazioni fanno scansioni. Per questo la facciata ha tempi propri, invece dei 30 s del proxy.
- **Traduzioni italiane parziali** (sezione 2.4).
- **Il banco non è un impianto:** PC portatile, rete diversa tra casa e ufficio (sezione 6.1).

## 6. Infrastruttura

### 6.1 Banco: HA OS ufficiale in una macchina virtuale VirtualBox (voce di piano approvata dall'utente)

**Fatti.**

- [O] PC (lettura del 2026-10-23): Windows 11 Home, Intel Core i7-13700HX (16 core, 24 thread), 15,7 GB di RAM, 462 GB liberi su C:, Wi-Fi Realtek RTL8852BE. Schede attive: Wi-Fi, «VirtualBox Host-Only Ethernet Adapter» e «vEthernet (WSL (Hyper-V firewall))». VirtualBox 7.2.4 è già installato (dato dell'utente, versione non riletta).
- [O] Guida ufficiale per Windows ([home-assistant.io/installation/windows](https://www.home-assistant.io/installation/windows/), consultata il 2026-10-23): immagine `haos_ova-<versione>.vdi.zip`; minimo 2 GB di RAM e 2 vCPU; tipo Linux / Oracle Linux 64 bit; **EFI attivo** («Home Assistant requires UEFI to boot»); disco `.vdi` collegato al controller SATA al posto del disco segnaposto; rete **Bridged Adapter** sulla scheda che dà Internet (con il Wi-Fi si sceglie la scheda Wi-Fi); dopo l'avvio `homeassistant.local:8123` oppure l'IP della VM.
- [O] Ultima versione di HA OS (API di GitHub, [releases/latest](https://api.github.com/repos/home-assistant/operating-system/releases/latest), 2026-10-23): **18.3**, pubblicata il 2026-09-17. File `haos_ova-18.3.vdi.zip`, **559 213 211 byte** (circa 533 MiB), da `https://github.com/home-assistant/operating-system/releases/download/18.3/haos_ova-18.3.vdi.zip`.
- [O] Manuale di VirtualBox, «Bridged Networking» ([virtualbox.org/manual/topics/networkingdetails.html](https://www.virtualbox.org/manual/topics/networkingdetails.html), 2026-10-23, la pagina non riporta la versione): verso il Wi-Fi il ponte **sostituisce l'indirizzo MAC** della VM con quello della scheda del PC, perché quasi tutte le schede Wi-Fi non supportano la modalità promiscua. Sono garantiti solo IPv4 e IPv6. Per DHCP, multicast e broadcast su Wi-Fi il manuale non dà dettagli.
- [O] Backup di HA ([home-assistant.io/common-tasks/general](https://www.home-assistant.io/common-tasks/general/), documentazione 2026.10.2, 2026-10-23): in HA Container il backup contiene le impostazioni e, se scelto, lo storico. È cifrato per impostazione predefinita e per il ripristino serve la chiave («emergency kit»). Si ripristina dalla schermata di benvenuto di una nuova installazione con «Upload backup». Dopo il ripristino si accede con le credenziali dell'origine. Il passaggio da Container a OS non è descritto esplicitamente.

**Passi (ognuno da autorizzare quando arriva il suo momento).**

| Passo | Cosa | Criterio misurabile |
|---|---|---|
| **I0** Copie | (1) Backup di HA dal banco attuale, creato dall'utente, che conserva lui la chiave. L'agente non la legge. (2) **Copia a freddo**: container `homeassistant` fermato, archivio di `C:\homeassistant\config` in `backup/banco/` con dimensione, SHA-256 e `tar -tzf`, poi riavvio. Vale la procedura nota: controllare che `/auth/providers` non risponda `onboarding_required` | Archivio e backup presenti; HA di nuovo attivo con la configurazione vera |
| **I1** Scaricamento | **Solo dopo conferma esplicita dell'utente** di nome, fonte e dimensione. Al momento si ricontrolla l'ultima versione: oggi è `haos_ova-18.3.vdi.zip`, 559 213 211 byte, da GitHub `home-assistant/operating-system`. Va in una cartella nuova e vuota fuori dal repository; si controllano dimensione ed estrazione. Si annota la compatibilità dichiarata tra HA OS 18.3 e core 2026.9.4 o la versione scelta in D-I5 [NV] | Dimensione identica a quella dichiarata dalla release; `.vdi` estratto; Internet disponibile sul PC (serve anche in I3) |
| **I2** Creazione della VM | Nome `haos-banco`; Linux / Oracle Linux 64 bit; **2 vCPU, 4 GB di RAM** (il minimo della guida è 2 GB; domanda D-I2); EFI attivo; disco = il `.vdi` estratto sul controller SATA; avvio senza finestra. **Sicurezza dell'onboarding [P]:** finché il backup non è caricato, HA OS mostra la pagina di benvenuto a chiunque raggiunga la VM, e un terzo potrebbe creare per primo il proprietario. Per questo all'inizio la VM ha **solo** una scheda **NAT** (Internet in uscita, nessun ingresso dalla LAN) e una scheda **Host-Only** (accesso dal PC); la scheda **Bridged** sul Wi-Fi si collega solo dopo I3. I2 e I3 si fanno di seguito, nella stessa sessione. **Non** completare l'onboarding da zero | La VM si avvia; la pagina di benvenuto risponde sull'indirizzo Host-Only e **non** dalla LAN; tempo di avvio misurato |
| **I3** Migrazione | Dalla schermata di benvenuto della VM, «Upload backup» e chiave inserita dall'utente. [O+V] Il Supervisor installa la versione di core del backup, quindi serve Internet (dalla scheda NAT). Poi si collega la scheda Bridged. Si controllano versione di HA, utenti, aree, integrazioni ed entità, con conteggi in sola lettura come in REP-20261023-001. **Voci attese nel backup:** con l'ordine consigliato (I0-I5 prima di D1g) il backup **non** contiene `webostv`, `wake_on_lan` né l'automazione di accensione, che nasceranno sulla VM; con l'ordine alternativo (D1-min in Docker prima di I0) il backup deve contenere una voce `webostv` con nome e stanza; se anche l'accensione fosse già stata creata in Docker, anche una voce `wake_on_lan` e un'automazione `acasystem_accensione_…`. La tabella dei legami in `tunet.db` resta valida perché gli id viaggiano con il backup [NV] | Conteggi uguali a quelli del banco Docker; versione di core letta dopo il ripristino e confrontata con la risposta a D-I5; elenco delle voci attese confermato; accesso con le credenziali esistenti |
| **I4** Acasystem verso il nuovo HA | Si cambia `TUNET_INTERNAL_HA_URL` in `progetto/compose.tunet.yaml` (riga 26, oggi `http://host.docker.internal:8123`; il backend la legge in `backend/src/config/env.ts`) con l'indirizzo scelto in D-I3. Copia del file prima della modifica; si ricrea il container `tunet`; si aggiorna `infrastructure.md`. [V] `homeassistant.local` probabilmente **non si risolve dal container** di Acasystem (mDNS non attraversa il bridge) [NV]: per il server conviene un IP fisso. Si ferma il container `homeassistant` di Docker. Con `restart: unless-stopped` un container fermato a mano resta fermo anche dopo un riavvio di Docker, e così non ci sono **due HA attivi** che comandano lo stesso TV | `/api/health` ok; `/ha/auth/providers` 200; accesso e widget sul Tab M11; `docker ps` senza `homeassistant` |
| **I5** Prove di rete | Elenco dei flussi scoperti in sola lettura; ripetizione della prova P0 (sezione 7) dalla VM; prova del Wake on LAN reale all'interno della tappa D1g | Esito registrato in `verification.md`, sia positivo sia negativo |
| **I6** Ritorno indietro | Si spegne la VM; si ripristina il `compose.tunet.yaml` copiato; `docker start homeassistant`; controllo di `onboarding_required`; se serve, si ripristina la copia a freddo. Il ritorno si prova una volta subito dopo I4 | Banco Docker di nuovo funzionante in meno di 10 minuti, cronometrato |

**Limiti.**

- **Il PC deve restare acceso**, con VirtualBox avviato: HA si ferma con il PC. Avviare la VM insieme a Windows è una configurazione persistente e va autorizzata (D-I7). Il tema sospensione del PC è già noto (memoria «Long runs vs PC sleep»).
- **Rete diversa tra casa e ufficio.** Con il ponte sul Wi-Fi la VM prende un indirizzo dalla rete in cui si trova: a casa cambia, e i dispositivi dell'ufficio non ci sono. Soluzione (D-I3): una seconda scheda **Host-Only** (rete `192.168.56.0/24`, già presente sul PC) dà ad Acasystem un indirizzo fisso verso HA in ogni luogo, mentre il ponte serve solo per la LAN. [NV] Da provare che il container di Acasystem raggiunga `192.168.56.x` e che HA usi la scheda a ponte per scoperta e Wake on LAN: si regola in Impostazioni > Sistema > Rete di HA, un passo che va eseguito nell'interfaccia di HA. In alternativa, un IP per luogo e una modifica di `TUNET_INTERNAL_HA_URL` a ogni cambio.
- **Ponte su Wi-Fi da provare.** [O] Con la sostituzione del MAC il router vede la VM con il MAC del PC. [V] La prenotazione DHCP per MAC può non funzionare, e mDNS o SSDP multicast possono passare oppure no [NV]. Il pacchetto magico Wake on LAN è un broadcast UDP su IPv4 con il MAC del TV nel contenuto, quindi dovrebbe uscire [NV]. Va provato.
- **VirtualBox con l'hypervisor di Windows attivo.** WSL2 e Docker Desktop tengono attiva la piattaforma di virtualizzazione di Windows, come mostra la scheda «vEthernet (WSL…)». [V] In questa situazione VirtualBox 7 gira sopra l'hypervisor di Windows, con prestazioni minori e possibili incompatibilità [NV]. Disattivarlo fermerebbe Docker Desktop ed è un'impostazione di sistema esclusa. Si misura in I2.
- **Esposizione di HA sulla LAN.** [V] Con la scheda a ponte HA risponde sulla porta 8123 direttamente a ogni dispositivo della rete (ufficio o casa), mentre oggi in Docker è raggiungibile tramite la porta pubblicata dal PC. Cambia l'esposizione descritta in ADR-0009, che rimanda la chiusura di HA alla rete: l'annotazione su ADR-0009 va scritta in T0b. Domanda D-I8: limitare la 8123 al solo indirizzo di Acasystem, sì o no.
- **Login nell'onboarding.** L'unica volta in cui si usa una pagina di HA è la schermata di benvenuto per caricare il backup: è infrastruttura e non configurazione di dispositivi, e Acasystem non può farlo perché senza HA non funziona. Lo fa l'utente, con la sua chiave.
- **Tablet:** `compose.tunet.yaml` pubblica `192.168.1.27:3002` mentre il PC era a `.7` il 2026-10-23 (REP-20261023-001 §3). Le prove sul tablet usano `adb reverse` come finora.

### 6.2 Clienti: mini-PC dedicato (preferenza dell'utente, risposta parziale a D-H3)

**Preferenza registrata.** Per i clienti l'utente indica un **mini-PC dedicato, non un Raspberry**, con HA e Acasystem **sullo stesso apparecchio**. È una risposta parziale alla domanda sull'hardware del piano hub e bridge (D-H3 di REP-20261021-001). Resta aperta la parte sulle radio, USB oppure coordinatore PoE.

**Requisiti** ([O] [home-assistant.io/installation](https://www.home-assistant.io/installation/) e [/installation/generic-x86-64](https://www.home-assistant.io/installation/generic-x86-64/), consultate dall'agente principale il 2026-10-23): x86 a 64 bit con UEFI e Secure Boot disattivato; sistema su memoria interna e non su USB; niente dischi 4Kn; cavo di rete al primo avvio; la guida Raspberry indica un minimo di 2 GB. Il resto è **valutazione dell'agente [V]**, già comunicata all'utente:

| | Minimo economico | Consigliato |
|---|---|---|
| Processore | 4 core a basso consumo (Celeron N5105 / J4125) | Intel N100 / N150 |
| Memoria | 4 GB | 8 GB (16 GB con molte videocamere o voce locale) |
| Disco | SSD 128 GB | SSD M.2 256 GB |
| Rete | Gigabit Ethernet: invio affidabile dei pacchetti Wake on LAN ai TV e accensione a distanza del mini-PC se il BIOS la prevede | Uguale |
| Porte | 2 USB-A | Uguale; senza ventola |
| BIOS | Ripartenza automatica dopo un blackout | Uguale |
| Radio | Solo se servono: chiavetta Zigbee/Thread su prolunga, lontano dalle porte USB 3; Bluetooth compatibile con Linux; Z-Wave | Uguale |

Prezzi: non indicati, perché nessuna fonte è stata consultata.

**Installazione:** due vie, nella domanda separata D-C1: **(a)** HA OS sul mini-PC con Acasystem come add-on di HA OS; **(b)** Linux con Docker Engine, HA Container e Acasystem entrambi in **rete host**. [O] Su (a): ADR-0009 non ha considerato l'add-on con ingress, e dietro l'ingress l'utente fidato non è admin, quindi l'aggiunta di dispositivi da Acasystem andrebbe ripensata. Su (b): HA Container non ha add-on, quindi servizi come Matter Server o Zigbee2MQTT diventano container separati (D-H4).

## 7. Tappe [P]

Ogni tappa parte solo con un'autorizzazione esplicita dell'utente, dopo la chiusura della 0.9.27 o su file che non si sovrappongono (la 0.9.27 tocca per esempio `backend/src/models/database.ts` e `server.ts`). La colonna «Modello» è una proposta coerente con la regola «piano con Opus, realizzazione con Sonnet/Haiku».

| Tappa | Contenuto | Dipende da | Criterio misurabile | Modello |
|---|---|---|---|---|
| **T0a** | Risposte almeno a D-D1, D-D5, D-D6, D-D13; esito di ADR-0021 | Utente | Risposte registrate in `project-status.md`; ADR-0021 accettata o modificata | Utente |
| **T0b** | Requisito nuovo in `product.md` col **prossimo numero REQ libero al momento** (REP-20261021-001 riserva «nuovi REQ dal REQ-18»: nota incrociata in quel report), con criterio di accettazione; annotazione in REQ-06 «D1 non soddisfa AC-06, debito dichiarato»; voci in `compliance.md`; annotazioni su ADR-0009 (scelta esecutiva superata per i dispositivi; esposizione di HA con la VM) e, secondo D-D13, su ADR-0015 | T0a | Documenti coerenti; nessun REQ riusato né duplicato tra i due piani | Haiku |
| **P0** | **Prova di rete, autorizzata a parte**, prima di scrivere codice per l'accensione: un solo pacchetto magico con un **MAC fittizio** (nessun dispositivo reale si accende) inviato dal container `homeassistant` del banco verso il broadcast della LAN, con un ascolto UDP sulla porta 9 su un altro apparecchio della LAN (per esempio il tablet via `adb`, se il suo `nc` lo consente, [NV]). Si ripete dalla VM in I5 | Autorizzazione dell'utente | Esito registrato in `verification.md` («arriva» o «non arriva») con comando e ora | Sonnet |
| **D1a** | Backend: facciata `/api/dispositivi/*` (avvio, passo, ripresa, annullamento, nome e stanza, ignora) limitata a `webostv` e `wake_on_lan`; controllo del ruolo sul server con la variante minima (nuovo accesso, token breve); tempo d'attesa di 90 s; limite di frequenza; tabelle del registro e dei flussi aperti; annullamento dei flussi alla scadenza e **all'avvio del backend**; controllo di appartenenza del `flow_id` | T0a | Test con un finto HA: 403 senza ruolo; 400 per un gestore non ammesso; 403 per un `flow_id` non in tabella, di un altro utente o di `reauth`; passi inoltrati; 504 gestito; **riavvio del backend a metà flusso → `DELETE` inviato al finto HA all'avvio**; `DELETE` con 404 tollerato; nel registro, nella tabella dei flussi e nei log del test **0 occorrenze dei valori di prova** (l'IP `192.0.2.10` e il MAC `02:00:00:00:00:01` usati nel test, non i nomi dei campi) | Sonnet |
| **D1c** | Frontend: Sistema > Dispositivi a schermo intero; motore minimo (`form` con `string`/`integer`/`boolean`/`select` e selettori `text`/`number`/`boolean`/`select`, `form` vuoto come «Conferma», `abort` con uscita e `DELETE`, `create_entry` con `next_flow` filtrato, `description_placeholders`); dizionario italiano per `webostv` e `wake_on_lan`; «Televisori > LG»; «Riprendi» dopo una ricarica | D1a | Test di componenti su risposte attese dal codice 2026.9.4; tipi sconosciuti → messaggio e `DELETE`; `next_flow` di un gestore non ammesso non seguito; segnaposto sostituiti; nessun testo inglese nei passi del TV; ricarica a metà → «Riprendi» mostra l'ultimo passo senza `GET` verso HA | Sonnet |
| **D1d** | Schermate dedicate: «Accetta sul TV» («Avanti», poi conto alla rovescia di 10 s durante la chiamata, «Riprova» che rimanda lo stesso passo), nome e stanza (dalla facciata) | D1c | Test: il finto HA tiene aperta la risposta per circa 10 s → la schermata mostra l'attesa con il conto alla rovescia e nessun pulsante attivo; poi `error_pairing` → stessa schermata con «Riprova», che invia di nuovo `pairing`; nome e stanza inviati | Sonnet |
| **D1-min** | **Chiusura intermedia:** con D1a + D1c + D1d il TV si aggiunge per indirizzo, si abbina, prende nome e stanza; si collega al widget dal «Collega» come oggi; Netflix si apre se il TV è già acceso | D1a, D1c, D1d | Prova sul banco come D1g, punti (1), (3), (4) e (5) | Sonnet |
| **D1b** | Backend: ricetta di accensione (voce `wake_on_lan` più automazione `webostv.turn_on` → `button.press`, oppure la sola associazione se D-D5 = b), broadcast ricavato dall'indirizzo del TV (ipotesi /24 dichiarata), `button` nascosto, id dell'automazione con prefisso fisso, **id ricavati dal server** (sezione 2.6) con attesa dello stato `loaded`, tabella dei legami; rimozione | D1a, D-D5 | Test: corpo dell'automazione costruito solo dal modello fisso; validazione di HA simulata; voce non ancora `loaded` → attesa e poi errore chiaro allo scadere; id inviato dal browser estraneo alla ricetta → 400; **rimozione completa partendo solo dalla tabella dei legami**; nessun MAC in `tunet.db` | Sonnet |
| **D1e** | Schermata «Accendere da spento» (guida, MAC, broadcast mostrato nel riepilogo e modificabile solo in «Avanzate», «Prova ad accendere» con conferma); esclusione del `button` e dell'automazione della ricetta dal widget Automazioni, dalla Stanza e dal «Collega»; riga «Accensione: funziona / non funziona» | D1b, D1c | Test: MAC non valido rifiutato prima dell'invio; conferma obbligatoria; broadcast `192.168.1.255` per un TV `192.168.1.26`; entità della ricetta assenti dai widget; automazione disattivata → avviso | Sonnet |
| **D1g** | **Banco e TV reale** (autorizzazione A + B già data; data, ora e chi accetta sul TV da confermare, D-D20): copia a freddo; immagine nuova di Acasystem; da Acasystem, aggiunta di `192.168.1.26` per indirizzo, abbinamento, nome e stanza, collegamento al widget, accensione, Netflix. Nessuna apertura dell'interfaccia di HA. **Si registra con quale account di HA gira il tablet e se il suo token è di un amministratore** | D1a-D1e, P0 positivo (con la VM se in Docker è negativo), D-D19, D-D21 | (1) Il TV compare nel «Collega» entro 30 s dall'accettazione sul TV; (2) da spento si accende dal widget, con tempo misurato, al primo tentativo e in 3 prove su 3; (3) Netflix si apre dal widget; (4) registro con le voci attese (aggiunta TV, nome e stanza, accensione); (5) nessun segreto: ricerca dell'IP del TV fuori dai campi previsti e del **MAC** reale nei log del container `tunet` (`docker logs`), in `tunet.db` e nella console del browser del tablet (CDP): 0 occorrenze del MAC, IP solo dove previsto | Sonnet |
| **I0-I6** | Tappa infrastrutturale del banco (sezione 6.1) | Conferma del download (D-I1), D-I2, D-I3, D-I8 | Criteri della tabella in 6.1 | Sonnet, con l'utente per il backup e la chiave |
| **D2** | Motore completo: `menu`, `progress` con eventi, `expandable`, selettori `entity`/`device`/`area`/`serial_port`/`file`/`qr_code`; test di contratto su risposte **registrate** dal banco | D1g | Copertura di tutti i tipi dell'elenco; fixture versionate per 2026.9.4 e 2026.10.x | Sonnet |
| **D3** | «Aggiungi per marca»: catalogo (D-D3), ricerca, loghi (`brands`, se D-D15 e la rotta sono approvati) | D2 | Lista per famiglie; ricerca in italiano; un'integrazione di prova per ogni famiglia | Haiku/Sonnet |
| **D4** | «Trovati»: `flow/subscribe`, conferma, «Non mi interessa» | D2, I5 | Su HA in VM almeno un dispositivo di rete trovato e confermato, oppure registrato «nessuno trovato» con la causa | Sonnet |
| **D5** | Voce «Dispositivo (Home Assistant)» nella cornice comune (nome, stanza, riabbina, cambia indirizzo, stato dell'accensione; app secondo D-D18), separata dalle preferenze di Acasystem; **ex D1f:** ingresso dal foglio «Collega» vuoto e ritorno con il dispositivo nuovo già scelto, regola di ADR-0019 per le impostazioni copiate | D2, ADR-0019, ADR-0020 (T9), D-D17, D-D18 | Due widget sullo stesso TV vedono lo stesso nome di HA; nessuna rimozione del dispositivo nel foglio del widget; dopo `create_entry` il foglio «Collega» mostra il `media_player` nuovo già selezionato | Sonnet |
| **D6** | Rimozione con doppia conferma e registro | D5, D-D8 | Integrazione, Wake on LAN e automazione rimosse; widget «Da collegare» | Sonnet |
| **D7** | Sessione installatore (REQ-06) | D-H5, D-D1 | Piano proprio | Opus (piano) |
| **D8** | Login esterni (OAuth) | D2, D-D4 | Prova con una integrazione reale scelta dall'utente | Sonnet, dopo uno studio |
| **Z** | Chiusura: `verification.md`, `infrastructure.md`, `project-status.md`, revisione del diff | ogni tappa | Documenti aggiornati; diff limitato | Haiku |

**Prima tappa = D1 (D1a, D1c, D1d, D1-min, D1b, D1e, D1g; più P0).** Permette di aggiungere il TV `192.168.1.26` per indirizzo, accenderlo e aprire Netflix da Acasystem. Non dipende da ADR-0019: l'ex D1f è passata a D5. D1-min chiude l'aggiunta per indirizzo prima dell'accensione, così il primo contatto reale arriva dopo tre passi di codice invece di sette.

**Ordine consigliato [V]:** P0 dal container; I0-I5 (HA sulla LAN, P0 ripetuta dalla VM); D1a, D1c, D1d; D1-min sulla VM; D1b, D1e; D1g sulla VM. Se l'utente preferisce non spostare il banco subito: D1-min in Docker (l'aggiunta per indirizzo è TCP unicast) e accensione solo dopo I0-I5, senza provare l'accensione dal bridge se P0 è negativa.

## 8. Test e prove sul tablet [P]

**Automatici (sul PC, senza HA reale):**

- backend con un finto HA (lo stesso metodo dei test del proxy di ADR-0009): ruolo, gestori ammessi, tempi, annullamenti, registro senza segreti, ricetta di accensione;
- frontend (Vitest): il motore su risposte attese dal codice 2026.9.4, poi su risposte registrate dal banco (D2); ogni tipo di risultato e di campo; dizionario italiano; uscita in ogni passo;
- end-to-end (Playwright) con il finto HA: percorso completo del TV a 1280×665 e 390×844, con un carico limitato (la memoria «Long runs vs PC sleep» registra crash del driver grafico sotto carico pesante);
- test di contratto ripetuti a ogni aggiornamento di HA.

**Sul Tab M11** (Chrome 1280×665, DPR 1,5, via `adb reverse` e profilo CDP come nei report precedenti), con la persona di 65 anni in mente:

| Scenario | Misura |
|---|---|
| S1 Aggiungi il TV per indirizzo, dal Sistema | Tocchi e tempo dall'apertura a «Dispositivo aggiunto»; nessun testo inglese; un compito per schermata |
| S2 Accetta sul TV: «Avanti», poi nessun OK entro 10 s, poi «Riprova» e OK in tempo | La richiesta compare sul TV dopo «Avanti»; il conto alla rovescia è leggibile; il messaggio d'errore è comprensibile; «Riprova» rimanda lo stesso passo e non fa ripartire da capo |
| S3 Nome e stanza | Tastiera virtuale che non copre il campo; «Fatto» della tastiera Android |
| S4 Collegamento al widget dal «Collega» come oggi (dal D5: ingresso dal «Collega» vuoto e ritorno) | Il TV nuovo è nell'elenco; dal D5 è già scelto al ritorno |
| S5 Accensione: guida, MAC, prova | Tempo dal tocco al TV acceso; 3 prove su 3 |
| S6 Netflix dal widget | Tempo dal tocco all'app aperta |
| S7 Uscita, ricarica e riavvio a metà flusso | (a) «Esci» a metà: `DELETE` registrato dalla facciata. (b) Ricarica del tablet o schermo spento a metà: alla riapertura compare «Riprendi» e si arriva alla fine. (c) Riavvio del container `tunet` a metà: all'avvio la facciata annulla il flusso, e un nuovo tentativo sullo stesso TV **non** finisce in `already_in_progress`. [O] `flow/progress` non elenca i flussi `user`, quindi la prova si basa sul registro della facciata e sull'esito del nuovo tentativo |
| S8 Prestazioni | Apertura della pagina Dispositivi senza blocchi lunghi del thread principale e **ritorno da Sistema** al launcher senza ricomparsa a pezzi (riferimento: ISSUE-109, ISSUE-110 e ISSUE-112) |
| S9 Telefono 390×844 e PC | Stessi percorsi leggibili |

Non verificabili senza autorizzazioni o strumenti in più: TalkBack (mai provato finora), dito vero oltre i gesti sintetici, telefono reale.

## 9. Domande per l'utente

Una domanda per ogni scelta visibile. Le opzioni non sono in ordine di preferenza.

**Funzione «Dispositivi»**

- **D-D1 (= D-H5 di REP-20261021-001: una risposta vale per entrambe). Chi può aggiungere, configurare e rimuovere i dispositivi?** (a) Chi entra in Acasystem come amministratore di HA, anche dal tablet del cliente se quell'account è amministratore; (b) solo un installatore in una sessione dedicata che si chiude da sola (REQ-06, da costruire); (c) anche il cliente. **Per la prima tappa**, regola provvisoria: (p1) la pagina si apre solo con un nuovo accesso di un amministratore, che dura poco (proposta); (p2) la funzione è solo sul PC, non sul tablet del cliente. Entrambe lasciano aperto AC-06.
- **D-D2 (= D-H6: una risposta vale per entrambe). Da dove si entra?** (a) Solo Sistema > Dispositivi; (b) anche dal foglio «Collega» quando non c'è un dispositivo adatto; (c) anche dal foglio «Aggiungi un widget» quando un tipo non ha dispositivi.
- **D-D3. Che cosa mostra «Aggiungi per marca»?** (a) Solo un elenco scelto da noi, con poche famiglie e marche diffuse in Italia; (b) tutte le integrazioni di HA con una ricerca (circa 900); (c) l'elenco scelto in alto e «Altre marche» con la ricerca sotto.
- **D-D4. Che cosa succede con un dispositivo che Acasystem non sa ancora aggiungere** (login esterno, campi non supportati)? (a) Messaggio «Non si può ancora aggiungere da Acasystem», senza altre vie; (b) un pulsante che apre HA solo per quel caso, in una scheda separata.
- **D-D5. Come si accende il TV da spento?** (a) Acasystem crea in HA un'automazione chiusa: l'accensione funziona da Acasystem, dalle automazioni e dalla voce; (b) Acasystem preme direttamente il pulsante Wake on LAN: niente automazione in HA, ma il comando «accendi» di HA per quel TV non funziona.
- **D-D6. Come si inserisce il MAC del TV?** (a) Lo scrive l'installatore, con una guida su dove trovarlo; (b) lo propone Acasystem quando HA è sulla LAN (con la VM o il mini-PC). La lettura automatica è da studiare e non è verificata.
- **D-D7. Nel widget del TV vuoi un'azione unica «Accendi e apri Netflix»** (o un'altra app scelta)? Sì o no. Oggi accensione e app sono due tocchi.
- **D-D8. Rimozione:** (a) nella prima versione; (b) in una tappa successiva. Nella conferma vanno mostrati il nome del dispositivo e il numero di widget collegati?
- **D-D9. Dopo l'aggiunta, se non si è partiti da un widget:** (a) Acasystem propone «Mostralo in una pagina» e crea il widget; (b) non propone nulla, il widget si crea come oggi.
- **D-D10. Nome e stanza dopo l'aggiunta:** (a) sempre richiesti; (b) facoltativi, con «Salta».
- **D-D11. La sezione «Trovati» quando è vuota:** (a) visibile, con una riga che spiega il perché; (b) nascosta.
- **D-D12. Testi senza traduzione italiana in HA:** (a) mostrare l'inglese di HA; (b) mostrare una frase italiana generica di Acasystem.
- **D-D13. ADR-0021:** accetti la facciata del backend (alternativa B) e la modifica alla scelta esecutiva di ADR-0009? Sul rapporto con ADR-0015, che REP-20261021-001 ha riservato anche all'estensione del proxy ai flussi con registro (D-H7): (a) ADR-0015 si limita a «radio e hub» e D-H7 si chiude con ADR-0021; (b) ADR-0015 resta com'era e ADR-0021 si ferma ai soli dispositivi di rete.
- **D-D14. Registro delle azioni:** visibile all'installatore in Sistema (a) oppure solo sul server (b)?
- **D-D15. Immagini e link nelle spiegazioni di HA** (per esempio la figura dell'abbinamento webOS): (a) mostrarle, il che richiede di aprire nel proxy le sole immagini statiche di HA; (b) toglierle e usare testi e figure di Acasystem.
- **D-D16. Filtro del tunnel WebSocket (alternativa C):** la facciata non impedisce a un amministratore di HA di rimuovere dispositivi dal tunnel (sezione 4.1). Prima di dare la funzione ai clienti vuoi filtrare il tunnel? Sì o no.
- **D-D17. Nome e posto della configurazione lato HA** nei pannelli: (a) una voce separata «Dispositivo (Home Assistant)», solo con il ruolo, distinta dalle «Impostazioni del dispositivo» dello studio REP-20261023-002, con la rimozione solo in Sistema > Dispositivi (proposta); (b) tutto nelle «Impostazioni del dispositivo» dello studio. Da concordare con REP-20261023-002.
- **D-D18. Dove si filtrano le app del TV** (domanda unica, da inoltrare anche a ADR-0019 e alla D-13 dello studio dei pannelli): (a) in HA con l'opzione «sources» di `webostv`, valida per tutti; (b) in Acasystem come sorgenti preferite (D-13), copiate al collegamento secondo ADR-0019; (c) entrambe.

**Banco (sezione 6.1)**

- **D-I1. Confermi lo scaricamento** di `haos_ova-18.3.vdi.zip` (559 213 211 byte, circa 533 MiB) dalla release 18.3 di `github.com/home-assistant/operating-system`? Se uscirà una versione nuova, nome e dimensione verranno richiesti di nuovo prima di scaricare.
- **D-I2. Risorse della VM:** 2 vCPU e 4 GB (proposta), oppure il minimo della guida (2 vCPU e 2 GB)?
- **D-I3. Come raggiunge Acasystem il nuovo HA?** (a) Seconda scheda Host-Only con indirizzo fisso, valida a casa e in ufficio; (b) l'IP della VM sulla LAN, da cambiare a ogni cambio di rete; (c) `homeassistant.local`, che dal container probabilmente non funziona.
- **D-I4. Prenotazioni sul router dell'ufficio** (IP fisso per il TV e per la VM): chi le fa e se si possono fare.
- **D-I5. Versione di HA dopo il ripristino:** restare su 2026.9.4, quella dei test, oppure passare alla 2026.10.x?
- **D-I6. HA in Docker di riserva:** per quanto tempo resta fermo prima di poterlo eliminare?
- **D-I7. Avvio della VM:** a mano oppure automatico all'accensione del PC (configurazione persistente)?
- **D-I8. Porta 8123 della VM sulla LAN:** limitarla al solo indirizzo di Acasystem, sì o no? (con la VM a ponte HA è raggiungibile da tutta la rete; tocca la decisione rimandata di ADR-0009)
- **D-D19. Quale TV LG è quello del titolare:** `192.168.1.26` o `192.168.1.18`? (l'autorizzazione riguarda il `.26`)
- **D-D20. Chi accetta sul TV durante D1g:** l'utente o una persona sul posto? Data e ora vanno concordate con il titolare?
- **D-D21. IP fisso del TV prima di D1g:** va reso fisso prima della prova (consigliato, perché `webostv` salva l'indirizzo), oppure si procede e lo si corregge dopo con «Cambia indirizzo»?

**Clienti (sezione 6.2)**

- **D-C1. Installazione sul mini-PC:** (a) HA OS con Acasystem come add-on di HA OS; (b) Linux con Docker, HA e Acasystem in rete host.
- **D-C2. Radio** (Zigbee, Thread, Z-Wave, Bluetooth): incluse nella dotazione di base o aggiunte solo quando servono?

**Già aperte, da REP-20261023-001 e dalla ricerca:** il TV `.26` è collegato via cavo o Wi-Fi? «LG Connect Apps» è attivo? Qual è il MAC, o chi può leggerlo? Quale dei due TV LG è del titolare (D-D19)? L'IP del TV va reso fisso prima di D1g (D-D21)?

**Clienti, abbinamento sul posto**

- **D-C3. Abbinamento con il TV di un cliente in uso:** la richiesta di abbinamento compare a schermo sul TV per circa 10 secondi. L'installatore può farlo mentre il cliente sta usando il TV, oppure va fatto con il TV libero e il cliente avvisato?

## 10. Cosa resta fuori

- Zigbee, Z-Wave, Matter, Thread, hub e bridge radio (piano REP-20261021-001); USB e Bluetooth.
- Scoperta di rete fatta da Acasystem stesso: proposta da valutare dopo I5, perché dal container avrebbe lo stesso limite di HA.
- Editor libero di automazioni (REQ-11, REQ-13): esiste solo la ricetta chiusa dell'accensione.
- Helper, script, scene, integrazioni solo YAML, riparazioni (`repair_flow`), anteprime, sotto-voci (rimandate).
- Aggiornamenti di HA da Acasystem, backup automatici, accesso remoto, chiusura di HA alla rete (ADR-0009).
- Kiosk (REQ-15) e amministratore di condominio (REQ-17): permessi da progettare.
- Acquisto e prezzi dei mini-PC.

## Fonti (consultate il 2026-10-23)

| Fonte | Versione / revisione | Uso |
|---|---|---|
| `https://raw.githubusercontent.com/home-assistant/core/2026.9.4/homeassistant/…` (`components/config/{config_entries,device_registry,entity_registry,area_registry,automation,view}.py`, `data_entry_flow.py`, `helpers/{data_entry_flow,selector,config_entry_oauth2_flow}.py`, `components/{webostv,wake_on_lan,websocket_api,frontend,brands}/…`, `generated/integrations.json`) | tag 2026.9.4, commit `9212531f40a0b7b23229a90d688dd79d9dfccff4` | API dei flussi, permessi, schema dei campi, TV e Wake on LAN (dettaglio in `backup/piano-dispositivi/api-ha.md`) |
| Stessi file al tag 2026.10.2 | rilascio del 2026-10-16 | Confronto: contratto invariato, un selettore in più |
| `https://raw.githubusercontent.com/home-assistant/frontend/20260826.7/src/…` | tag 20260826.7 (fissato dal core 2026.9.4) | Come l'interfaccia ufficiale chiama le API e disegna i passi |
| `https://raw.githubusercontent.com/home-assistant-libs/aiowebostv/v0.10.0/aiowebostv/webos_client.py` | v0.10.0 | Attesa dell'abbinamento (10 s) |
| `https://contributors.home-assistant.io/core/integrations/flow-steps/`, `…/core/internals/rest-api/`, `…/core/internals/websocket-api/` (ex `developers.home-assistant.io`, redirect 301) | senza data; esempi con 2026.10.0 | Tipi di passo; assenza delle rotte di configurazione dalla documentazione REST |
| `https://www.home-assistant.io/integrations/webostv/`, `/wake_on_lan/`, `/cast/`, `/sonos/`, `/shelly/`, `/application_credentials/` | pagine correnti | Prerequisiti e limiti |
| `https://www.home-assistant.io/installation/windows/` | pagina corrente (immagine 18.3) | VM VirtualBox |
| `https://api.github.com/repos/home-assistant/operating-system/releases/latest` | 18.3, 2026-09-17 | Nome e dimensione dell'immagine |
| `https://www.home-assistant.io/common-tasks/general/` | documentazione 2026.10.2 | Backup e ripristino |
| `https://www.virtualbox.org/manual/topics/networkingdetails.html` | senza versione sulla pagina | Ponte su Wi-Fi |
| `https://www.home-assistant.io/installation/`, `/installation/generic-x86-64/` | lette dall'agente principale | Requisiti del mini-PC |

Limite di metodo [O]: le pagine web sono state lette con uno strumento che le riassume (WebFetch), quindi non sono citazioni testuali. Il codice del core è stato scaricato e letto ai tag indicati (`api-ha.md` §16).

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Lettura delle fonti interne | REP-20261023-001, REP-20261021-001 (decisioni), ADR-0009, ADR-0020, indici, `product.md` (REQ-06, REQ-17), `project-status.md` (sezione incarichi), `infrastructure.md` (righe su HA), `compose.tunet.yaml`, `env.ts`; ricerca preparatoria in `backup/piano-dispositivi/` | Eseguito | Le affermazioni sul codice vengono dalla ricerca preparatoria (righe citate) e non sono state rilette tutte una per una |
| Fonti esterne | WebFetch di quattro pagine (guida Windows, release di HA OS, backup, manuale VirtualBox) più le fonti della ricerca preparatoria | Eseguito | Letture riassunte; nessun download |
| Risorse del PC | PowerShell in sola lettura: `Win32_ComputerSystem`, `Win32_Processor`, `Get-PSDrive C`, `Get-NetAdapter` | Eseguito | RAM 15,7 GB, i7-13700HX, 462 GB liberi, tre schede attive; versione di VirtualBox non riletta |
| Numero dell'ADR | `decisions/` e indice riletti subito prima del salvataggio | Eseguito | ADR-0015 e ADR-0019 riservate, ADR-0020 usata: primo numero libero ADR-0021 |
| Chiamate a HA, comandi ai dispositivi, modifiche a codice, Docker, rete, tablet | — | **Non eseguito** (escluso dall'incarico) | — |
| Test automatici | — | Non eseguiti | Nessun codice modificato |

## Controllo del diff e decisioni

File aggiunti o modificati da questo incarico: questo report; `decisions/ADR-0021-configurazione-dispositivi-da-acasystem.md` (nuovo, «Proposta»); una riga in `reports/README.md`; una riga e la data in `decisions/README.md`. Nessuna modifica a `progetto/`, HA, Docker, VirtualBox, rete o tablet. Nessun processo terminato. Nessun commit.

La richiesta del 2026-10-23 è una fonte umana per la **direzione**: Acasystem configura i dispositivi al posto dell'interfaccia di HA. Non lo è per i dettagli. Le scelte di architettura, la modifica di ADR-0009 e ogni tappa restano proposte fino alle risposte della sezione 9. L'agente non ha approvato nulla.

**Proposte da registrare in `project-status.md`** (non registrate qui perché il file è modificato in contemporanea da altri flussi): (1) facciata `/api/dispositivi` e motore dei flussi (D1-D2, ADR-0021); (2) ricetta di accensione Wake on LAN; (3) tappa infrastrutturale I0-I6 del banco (approvata come voce di piano, non come esecuzione); (4) preferenza dell'utente per il mini-PC dei clienti, risposta parziale a D-H3; (5) nuovo requisito proposto, col prossimo numero REQ libero in T0b (REP-20261021-001 riserva i numeri dal REQ-18); (6) scoperta di rete propria di Acasystem, da valutare dopo I5; (7) filtro del tunnel WebSocket prima dei clienti (D-D16); (8) debito dichiarato su AC-06 di REQ-06 per la prima tappa.

## Chiusura e punto di ripresa

- **Nessuna tappa di realizzazione è attiva.** Il piano è in stato «proposto», rivisto dopo la critica.
- **Prossimo passo:** le risposte almeno a D-D1, D-D5, D-D6 e D-D13 (tappa T0a), l'autorizzazione della prova di rete P0 e di D1a. In parallelo, se l'utente lo vuole, la conferma D-I1 e l'avvio di I0-I3, che non dipendono dal codice.
- **Ordine consigliato [V]:** sezione 7, dopo la tabella: P0; I0-I5; D1a, D1c, D1d; D1-min; D1b, D1e; D1g. Il TV si prova sul bridge solo per l'aggiunta (D1-min), mai per l'accensione se P0 è negativa.
- **Dipendenze esterne:** ADR-0019 (solo per D5, che contiene l'ex D1f), REP-20261023-002 e ADR-0020 (per D5, D-D17, D-D18), la 0.9.27 (file in comune), D-H5 = D-D1 (per D7).

## Risposte dell'utente

**2026-10-23, fonte umana.** Risposte dell'utente alle domande della sezione 9, riportate con le sue parole nell'incarico ricevuto dall'agente che le registra (Claude Code, Sonnet 5.5, `claude-sonnet-5-5`). Le citazioni sono testuali; la colonna «Effetto» è una lettura dell'agente [V] e non amplia ciò che l'utente ha detto. Nessuna tappa di realizzazione di codice è autorizzata da queste risposte: autorizzano la decisione ADR-0021, la prova di rete P0 e il passo I1 (scaricamento), più la preparazione della VM descritta nell'annotazione «Esito P0, I1 e I2» più sotto.

| Domanda | Risposta dell'utente | Effetto sul piano [V] |
|---|---|---|
| **D-D1** Chi può aggiungere, configurare e rimuovere | «Anche il cliente» | Scelta (c): chiunque usi Acasystem può aggiungere e configurare dispositivi. **Conseguenza tecnica:** in HA aggiunta, configurazione e rimozione richiedono un utente amministratore ([O] sezione 4), quindi la facciata del backend dovrà usare un'identità con quei permessi, oppure l'account del tablet dovrà essere amministratore: da decidere nella tappa D1a, **senza leggere né usare token esistenti**. La «variante minima» della sezione 4 (nuovo accesso di un amministratore) e la sessione installatore (D7) non corrispondono a questa risposta e vanno riviste in D1a. Resta il conflitto con REQ-06 (il cliente non resta amministratore, AC-06): la risposta è una fonte umana successiva, ma `product.md` non è modificato da questo incarico e l'annotazione resta in T0b. Con la funzione aperta al cliente il filtro del tunnel (D-D16, ancora aperta) diventa più importante |
| **D-D2** Da dove si entra | «Dal foglio «Collega»» e «Da «Aggiungi un widget»» (non una pagina in Sistema) | Scelte (b) e (c); **non** la (a). La sezione 2.5 (casa del percorso = Sistema > Dispositivi a schermo intero) e la tappa D1c vanno riscritte: l'ingresso è nel foglio «Collega» e nel foglio «Aggiungi un widget». L'ex D1f (ingresso dal «Collega» e ritorno con il dispositivo scelto) non può più restare in D5, e dipende da ADR-0019. Dove stiano l'elenco dei dispositivi e la rimozione (D-D8) non è stato detto: resta aperto. Piano non ancora riscritto: da fare prima di D1c |
| **D-D3** Che cosa mostra «Aggiungi per marca» | «Tutte con ricerca» | Scelta (b): tutte le integrazioni di HA con ricerca (circa 900 al tag 2026.9.4). L'elenco dei gestori ammessi, oggi `webostv` e `wake_on_lan` per la prima tappa, dovrà allargarsi in D3; la regola «negato per difetto» e il ripiego per i flussi non supportati (D-D4, aperta) vanno decisi insieme |
| **D-D5** Come si accende il TV da spento | «Automazione in HA» | Scelta (a): Acasystem crea in HA l'automazione chiusa (ricetta della sezione 3, passo 7; D1b) |
| **D-D6** Come si inserisce il MAC | «Lo propone Acasystem, lo individua, poi se il dispositivo non viene individuato lo può cercare l'installatore» | Scelta (b) con ripiego manuale: Acasystem cerca di individuare il MAC e lo propone; se non lo trova, lo cerca l'installatore con la guida. **[NV]** il modo di individuarlo non è stato studiato né verificato (il `DeviceInfo` di `webostv` non fornisce `connections`, sezione 3 passo 7): va studiato prima di D1e |
| **D-D7** Azione unica «Accendi e apri Netflix» | «accendi e possibilità di fare accendi + app e scegliere una app» | Lettura dell'agente [V]: nel widget del TV un'azione «Accendi» e un'azione «Accendi + app» con la possibilità di scegliere quale app. È un comportamento nuovo autorizzato da questa risposta, da progettare in una tappa dedicata dopo D1g; D1 resta con accensione e app come due tocchi. La lettura va confermata con l'utente quando la tappa parte |
| **D-D13** ADR-0021 | «Sì, accetto» | ADR-0021 passa a **Accettata** (facciata del backend, alternativa B, e modifica alla scelta esecutiva di ADR-0009 per le sole operazioni sui dispositivi). L'utente non ha indicato l'opzione (a) o (b) sul rapporto con ADR-0015: resta aperta, ADR-0015 non è toccata |
| **D-I1** Confermi lo scaricamento di `haos_ova-18.3.vdi.zip` | «Sì, entrambi» (insieme a P0) | Autorizzati il passo I1 (nome, fonte e dimensione come nella domanda: 559 213 211 byte, release 18.3 di `home-assistant/operating-system`) e la prova di rete P0. Se nome o dimensione non corrispondono, il download non prosegue |
| **P0** Prova di rete con MAC fittizio | «Sì, entrambi» | Autorizzata nei limiti dell'incarico: un solo pacchetto magico per destinazione, MAC fittizio, nessun comando a dispositivi reali |
| **D-I2** Risorse della VM | «4 GB (proposta)» | 2 vCPU e 4 GB di RAM |
| **D-I3** Come raggiunge Acasystem il nuovo HA | «Scheda interna fissa» | Scelta (a): seconda scheda Host-Only con indirizzo fisso, rete `192.168.56.0/24` (adattatore esistente `192.168.56.1`). L'indirizzo della VM si fissa in seguito, nella tappa di migrazione |
| **D-I5** Versione di HA dopo il ripristino | «Resta 2026.9.4» | Core 2026.9.4, quella dei test; da confrontare con la versione letta dopo il ripristino (I3) |
| **D-I8** Porta 8123 della VM sulla LAN | «Sì, solo Acasystem» | La 8123 va limitata al solo Acasystem (per esempio `http: server_host` sull'indirizzo Host-Only). È una configurazione di HA che si farà nella tappa di migrazione, non ora |

**Ancora aperte** (nessuna risposta): D-D4, D-D8, D-D9, D-D10, D-D11, D-D12, D-D14, D-D15, **D-D16**, D-D17, D-D18, D-D19, **D-D20**, **D-D21**, D-I4, D-I6, D-I7, D-C1, D-C2, D-C3, e la scelta (a)/(b) di D-D13 su ADR-0015.

**Righe da aggiungere a `project-status.md`** (non modificato da questo incarico, perché altri flussi lo stanno modificando):

1. Decisione: ADR-0021 **Accettata** il 2026-10-23 (D-D13 «Sì, accetto»); fonte: risposte dell'utente in REP-20261023-003.
2. Risposte D-D1 «Anche il cliente», D-D2 «Dal foglio «Collega»» e «Da «Aggiungi un widget»», D-D3 «Tutte con ricerca», D-D5 «Automazione in HA», D-D6 (lo propone Acasystem, ripiego installatore), D-D7 (accendi, e accendi + app con scelta dell'app): requisiti/scelte del piano registrati come **proposte approvate come direzione, non implementate**; piano da riscrivere per D-D1 e D-D2 prima di D1a e D1c.
3. Risposte infrastrutturali D-I1, D-I2 (2 vCPU, 4 GB), D-I3 (Host-Only fissa), D-I5 (2026.9.4), D-I8 (8123 solo ad Acasystem); P0 e scaricamento autorizzati.
4. Conflitto da risolvere in T0b: D-D1 «Anche il cliente» contro REQ-06/AC-06 (il cliente non resta amministratore).
5. Esito di P0 e stato della VM `acasystem-ha` (preparata, non avviata): vedi le annotazioni più sotto e `verification.md`/`infrastructure.md`.
6. Questioni aperte: elenco sopra.

## Rettifiche dopo la critica

**2026-10-23, revisione del piano** (Claude Code, Opus 5.5) dopo una critica indipendente con quindici rilievi. Il testo sopra è già aggiornato; qui sono riportati gli esiti. Nessuna modifica a codice, HA, Docker, rete o tablet; nessun commit.

| # | Rilievo (gravità) | Esito | Dove |
|---|---|---|---|
| 1 | Sequenza dell'abbinamento invertita (alta) | **Applicato.** Verificato in `casi.md` (flusso webostv, punto 2) e `api-ha.md` §13 punto 4: la richiesta compare sul TV quando HA riceve il passo `pairing`. Schermata «Premi Avanti, poi entro 10 secondi OK», conto alla rovescia durante la chiamata, «Riprova» sullo stesso passo; test con risposta tenuta aperta circa 10 s | Risposta breve 5; §3 passo 4; D1d; S2 |
| 2 | La facciata presentata come confine di sicurezza (alta) | **Applicato.** Tabella delle minacce coperte e non coperte; tutte le scritture del percorso dalla facciata (nome, stanza, ignora); domanda D-D16 sul filtro del tunnel | Risposta breve 3; §2.2; §2.3; §4.1; ADR-0021 |
| 3 | Flussi interrotti, altre sessioni, più tablet (alta) | **Applicato.** Tabella dei flussi in `tunet.db`, annullamento alla scadenza e all'avvio, controllo di appartenenza e gestore a ogni passo, «Riprendi» senza `GET` di HA, `already_in_progress` con «Riprendi» o «Annulla l'altro tentativo»; test di riavvio e ricarica | §2.3; §2.7; D1a; D1c; S7 |
| 4 | Regola «admin di HA» in conflitto con AC-06 (alta) | **Applicato.** Variante minima (nuovo accesso di un amministratore, token breve) e alternativa «solo PC» in D-D1; registrazione dell'account del tablet in D1g; debito su AC-06 dichiarato. **Non applicata qui** l'annotazione in REQ-06: `product.md` è escluso da questo incarico ed è modificato da altri flussi; è in T0b | Risposta breve 4; §4; D-D1; D1g; T0b |
| 5 | La prima tappa non arriva al TV (alta) | **Applicato.** D1f spostata in D5; prova di rete P0 autorizzata a parte con MAC fittizio; D1-min; I0-I5 prima di D1g nell'ordine consigliato | Risposta breve 6; §7; Chiusura |
| 6 | Id della ricetta di accensione (media) | **Applicato.** Id ricavati dal server dal registro con attesa di `loaded` e tempo massimo; 400 per id estranei; tabella dei legami senza MAC; test di rimozione dai soli legami | §2.6; D1b |
| 7 | Broadcast «con la rete del PC» (media) | **Applicato.** Ricavato dall'indirizzo del TV nell'ipotesi /24 dichiarata, modificabile solo dall'installatore; nota sulla rete della VM | §3 passo 7; D1b; D1e |
| 8 | Entità della ricetta visibili al cliente (media) | **Applicato.** `button` nascosto, automazione con prefisso fisso, esclusione da Automazioni, Stanza e «Collega», controllo dello stato. L'uso di categorie o etichette di HA resta [NV] perché quei registri non sono stati letti | §3 passo 7; D1e |
| 9 | Conflitto di significato con lo studio dei pannelli (media) | **Applicato in parte.** Voce separata «Dispositivo (Home Assistant)», rimozione solo in Sistema, domanda unica sulle app (D-D18) e domanda D-D17. **Non modificati** REP-20261023-002 né ADR-0019, che sono in scrittura da altri flussi: la suddivisione va concordata lì quando l'utente risponde | §2.5; §3 passi 9-10; D5; D-D17; D-D18 |
| 10 | Conflitti di ID e decisioni duplicate con REP-20261021-001 (media) | **Applicato in parte.** D-D1 = D-H5, D-D2 = D-H6; REQ col prossimo numero libero in T0b; scelta su ADR-0015 nella domanda D-D13. **Non scritta ora** la nota incrociata in REP-20261021-001, che non rientra nei file ammessi da questo incarico: è prevista in T0b | §1; §9; T0b; ADR-0021 |
| 11 | Casi mancanti del motore (media) | **Applicato.** Righe per `next_flow`, abort di successo, `description_placeholders`, `required` con `default`, `data_schema` vuoto come «Conferma», `DELETE` con 404 tollerato; criteri in D1c. I criteri per D2 restano coperti da «tutti i tipi dell'elenco» | §2.4; D1c |
| 12 | Sicurezza dell'onboarding e dell'esposizione della VM (media) | **Applicato, con una variante.** Il rilievo proponeva la sola scheda Host-Only fino al ripristino, ma il ripristino richiede Internet (rilievo 13): la VM parte con NAT (solo uscita) più Host-Only, e il ponte si collega dopo I3. Domanda D-I8 sulla 8123. **Non scritta ora** l'annotazione in ADR-0009 (file fuori da questo incarico e modificato da altri flussi): prevista in T0b | §6.1 I2, I3, Limiti; D-I8; T0b |
| 13 | Dipendenze del ripristino (media) | **Applicato.** Internet in I1 e I3, versione di core letta e confrontata con D-I5, voci attese nel backup per ciascun ordine. La compatibilità tra HA OS 18.3 e core 2026.9.4 resta [NV] | §6.1 I1, I3 |
| 14 | ISSUE-110 e criteri sui log (bassa) | **Applicato.** ISSUE-110 in S8; fonti dei log elencate e ricerca dei valori di prova (IP e MAC), non dei nomi dei campi | S8; D1a; D1g |
| 15 | Domande mancanti (bassa) | **Applicato.** D-D19 (quale TV), D-D20 (chi accetta, data e ora), D-D21 (IP fisso prima di D1g), D-C3 (abbinamento con il TV del cliente in uso) | §9 |

## Rettifiche successive

### 2026-10-23 — Esito P0, I1 e I2 (Claude Code, Sonnet 5.5, `claude-sonnet-5-5`)

Eseguiti dopo le «Risposte dell'utente» (D-I1 e P0 «Sì, entrambi»; D-I2 «4 GB (proposta)»; D-I3 «Scheda interna fissa»; D-I5 «Resta 2026.9.4»; D-I8 «Sì, solo Acasystem»). Dettaglio dei comandi, orari e limiti in `verification.md` (sezione «2026-10-23 — Prova di rete P0 … e preparazione della VM») e in `infrastructure.md` (sezione «Aggiornamento REP-20261023-003 — VM `acasystem-ha` preparata e non avviata»). Nessuna modifica a codice, HA, Docker, rete di Windows o tablet; nessuna credenziale né token; nessun commit.

| Tappa | Esito |
|---|---|
| **P0 — prova di rete** | Pacchetto magico con MAC fittizio `02:00:00:00:00:01` inviato alle 11:13:40 dal container `homeassistant` (un datagramma verso `192.168.1.255:9`, uno verso `255.255.255.255:9`). **Ascoltatore sul tablet non possibile:** la shell adb (`uid=2000`) non può aprire la porta 9 (`nc: bind: Permission denied`) e non si installa nulla sul tablet. **Ripiego: ascoltatore sul PC** (limite dichiarato). **Esito:** al PC è arrivato **un solo datagramma su due**, con sorgente riscritta a `192.168.1.7` (IP Wi-Fi del PC); l'ascoltatore non registra la destinazione, quindi non si sa quale dei due. Controllo positivo dal PC (11:13:44): 2 su 2. **Non determinato** se il pacchetto esca sulla LAN verso un altro apparecchio: il PC è lo stesso apparecchio che ospita Docker, quindi la prova non separa «uscito sulla LAN» da «consegnato localmente dal NAT». Il sospetto della sezione 5.2 (dal bridge il pacchetto probabilmente non esce) resta non verificato. Per un esito concludente servono un secondo apparecchio come ascoltatore o root sul tablet (nuova autorizzazione); la prova si ripete dalla VM in I5 |
| **I1 — scaricamento** | `haos_ova-18.3.vdi.zip`, release 18.3 di `home-assistant/operating-system` (pubblicata il 2026-09-17): nome e dimensione **559 213 211 byte** corrispondenti; la release non ha un file di checksum, ma GitHub riporta per l'asset il digest SHA-256 `c626ffe0db7dd717270b41240ee3cbb5ada78a364239795f04435d6116c236d3`, **uguale** a quello del file scaricato. Cartella `backup/dispositivi/haos/` (nuova e vuota prima). `.vdi` estratto: 989 987 328 byte, SHA-256 `62580d1c…bb2b` (calcolato qui). File non eseguito |
| **I2 — VM** | `acasystem-ha` creata e registrata, **non avviata**: Oracle Linux 64 bit, EFI, 2 vCPU, 4096 MB, disco `.vdi` su controller SATA, scheda 1 a ponte sul Wi-Fi del PC con **cavo scollegato**, scheda 2 Host-Only (`192.168.56.1`; indirizzo della VM da fissare in seguito, fuori dall'intervallo DHCP `192.168.56.101`-`.254`), nessun avvio automatico. **Differenza dal piano:** il piano prevedeva NAT più Host-Only fino al ripristino del backup; qui sono ponte (scollegato) più Host-Only, quindi senza Internet. Nella migrazione si sceglierà tra collegare il ponte (pagina di benvenuto raggiungibile dalla LAN prima del ripristino) e una scheda NAT temporanea |
| Ritorno indietro | `VBoxManage unregistervm acasystem-ha --delete` (cancella anche il `.vdi` collegato; lo zip resta). Nulla altro da ripristinare |

**Non fatti, rimandati alla tappa di migrazione dopo il banco 0.9.27:** avvio della VM, migrazione con il backup di HA (con l'utente), collegamento del ponte, limitazione della 8123 al solo Acasystem (D-I8), passaggio di Acasystem al nuovo HA. **Punto di ripresa:** riscrivere il piano per D-D1 e D-D2 (identità con permessi di amministratore; ingresso dai fogli «Collega» e «Aggiungi un widget») prima di D1a e D1c; ripetere P0 con un ascoltatore su un secondo apparecchio o dalla VM (I5).

## Piano operativo aggiornato (2026-10-23)

| Campo | Valore |
|---|---|
| Richiesta | Utente, 2026-10-23, testuale: «Aggiorna il piano operativo di REP-20261023-003 rispettando le risposte già registrate: anche il cliente può aggiungere e configurare dispositivi; gli ingressi sono «Collega» e «Aggiungi un widget»; il catalogo finale deve permettere la ricerca tra le integrazioni; l'accensione del TV usa l'automazione in HA già approvata. Preserva lo storico secondo AGENTS.md.» Inoltre: «Riutilizza i meccanismi di Home Assistant. Distingui API pubbliche documentate ed endpoint interni usati dal suo frontend; per questi ultimi indica versione supportata e verifiche di compatibilità. Non introdurre scansioni di rete proprie.» Obiettivo del prodotto confermato lo stesso giorno: «installare Acasystem e usare la nostra interfaccia per il primo avvio, trovare i dispositivi compatibili, aggiungerli, configurarli e utilizzarli». |
| Autore | Claude Code (Opus 5.5, `claude-opus-5-5`), flusso di allineamento D1. Appunti preparatori dello stesso flusso (Sonnet 5.5, `claude-sonnet-5-5`) in `backup/allineamento-d1/`: `api-pubbliche-interne.md`, `installazione-pulita.md`, `permessi-cliente.md`, `prerequisiti-d1.md`. La cartella è esclusa da Git; i fatti decisivi sono riportati qui. |
| Perimetro di questo aggiornamento | Solo documenti: queste sezioni nuove; la sezione «Conclusione richiesta il 2026-10-23» di [REP-20261023-004](REP-20261023-004-confronto-installazione.md); la bozza [ADR-0022](../decisions/ADR-0022-identita-di-servizio-dispositivi.md); una riga in ciascuno dei due indici. Esclusi: `progetto/`, VM, rete, Docker, HA, banco e dispositivi; credenziali; commit. |
| Storico | Le sezioni 1-10, «Risposte dell'utente», «Rettifiche dopo la critica» e «Rettifiche successive» restano come erano. Dove questo aggiornamento le contraddice, **prevale questo aggiornamento**. La tabella 1 dice che cosa cambia e perché. |
| Etichette | [approvato] fonte umana; [realizzato] esiste; [verificato] con il mezzo indicato («codice» = letto nella fonte al tag; «documentazione»; «prova» = eseguito); [proposto] non autorizzato; [non verificato]; [valutazione] giudizio dell'agente. Le lettere [O]/[V]/[P]/[NV] restano valide nelle sezioni precedenti. |

### 1. Che cosa cambia rispetto al piano sopra

| Punto | Prima | Ora | Fonte |
|---|---|---|---|
| **Chi aggiunge e configura** (§4, D1a) | «Variante minima»: un nuovo accesso di un amministratore, con token breve | **Anche il cliente**, con un account di HA **non amministratore**. Le scritture le fa la facciata `/api/dispositivi` con un'identità di servizio **dichiarata**, e solo per una lista chiusa di operazioni (sezione «Permessi del cliente»; bozza ADR-0022). Il cliente non diventa amministratore | D-D1 «Anche il cliente» [approvato]; divieto dell'utente, 2026-10-23, di rendere amministratore il cliente o introdurre implicitamente un'identità privilegiata [approvato]; meccanismo [proposto], decisione D-D22 |
| **Ingressi** (§2.5, D1c, D5) | Il percorso aveva la sua base in Sistema > Dispositivi, a schermo intero; l'ingresso dal «Collega» era rinviato a D5 | Si entra solo dai fogli «Collega» (quando il widget non ha dispositivi adatti compare «Aggiungi un dispositivo») e «Aggiungi un widget» (quando il tipo scelto non ha dispositivi). **Nessuna pagina nuova in Sistema per aggiungere.** Il percorso si apre a schermo intero sopra il foglio, con «Esci» sempre visibile (ADR-0016). Alla fine torna al foglio con il dispositivo nuovo già scelto: l'ex D1f rientra in D1 (sotto-tappa D1f) e segue ADR-0019, che prevede la copia al collegamento | D-D2 [approvato]; ADR-0019 [approvato], realizzata nella 0.9.27 non committata [non verificato lo stato finale] |
| Elenco dei dispositivi e rimozione | In Sistema > Dispositivi | Posto non deciso (D-D8, aperta). Fuori da D1 | D-D2 non ne parla |
| **Catalogo** (§3 passo 2, D3) | Domanda D-D3 | Il catalogo finale mostra **tutte** le integrazioni di HA che hanno un flusso, con **ricerca**. HA non offre una ricerca sul server: il server legge `integration/descriptions` (endpoint interno, solo amministratori) con l'identità di servizio, e la ricerca avviene nel client, come nell'interfaccia di HA [verificato: codice 2026.9.4, `api-ha.md` §3.2]. Si vedono tutte; il cliente può avviare solo quelle ammesse da D-D22 (b). In D1 si avviano solo `webostv` e `wake_on_lan`; la ricerca arriva in D3 | D-D3 «Tutte con ricerca» [approvato] |
| **Accensione** (§3 passo 7, D1b) | Domanda D-D5 | Ricetta chiusa costruita solo dal server: voce `wake_on_lan` più un'automazione in HA che, sul trigger `webostv.turn_on`, preme il pulsante Wake on LAN. Va provato su HA quale forma del trigger, di dispositivo o `webostv.turn_on`, attivi davvero il bit di accensione 128 [non verificato] | D-D5 «Automazione in HA» [approvato] |
| **MAC** (§3 passo 7, D1e) | Domanda D-D6 | Acasystem propone il MAC **solo da fonti di HA**. Oggi nessuna API di HA lo fornisce per `webostv`: il dispositivo non ha `connections` in 2026.9.4 né in 2026.10.2 [verificato: codice]. Fonti candidate, come le entità `device_tracker` di un'integrazione del router, [non verificato]. **Nessuna scansione ARP o di rete da parte di Acasystem.** Se HA non conosce il MAC, lo inserisce l'installatore con la guida. Sul banco oggi non esiste alcuna fonte, quindi D1 userà il ripiego | D-D6 [approvato]; vincolo «nessuna scansione propria» [approvato]. **Tensione da segnalare:** la parte «lo individua» di D-D6 dipende da fonti che sul banco non esistono |
| «Accendi» e «Accendi + app» | Domanda D-D7 | Tappa dedicata **D9**, dopo D1. In D1 accensione e app restano due tocchi | D-D7 [approvato]; la lettura dell'agente va confermata all'avvio di D9 |
| **Origine dell'HA della VM** (§6.1 I0-I3) | Migrazione del banco con un backup | Per D1, HA **nuovo** nella VM, inizializzato una volta dall'utente (proposta), oppure migrazione: è la decisione **D-D23**. L'installazione pulita **ripetibile** (criterio 1) è una prova a parte, nella tappa I-P | VM temporanea per D1 [approvato: risposta «Sì, VM temporanea» riportata nell'incarico di questo allineamento; testo non ritrovato prima di oggi nel repository]; richiesta dell'utente sull'installazione pulita [approvato] |
| Rete della VM al primo avvio (§6.1 I2) | NAT più Host-Only fino al ripristino | Si torna al piano: una scheda NAT temporanea dà Internet, l'Host-Only collega il PC, e il ponte si collega solo dopo la creazione del proprietario. Oggi la VM ha il ponte scollegato e l'Host-Only, quindi niente Internet [verificato: `infrastructure.md`] | Piano §6.1 [approvato come voce di piano] |
| **Porta di HA e D-I8** (§6.1, D-I8) | 8123 e `http: server_host` in YAML | Su HAOS con il Core 2026.9.4 la porta di serie è la **80**. La 8123 resta solo come reindirizzamento fino alla fine dell'onboarding. L'impostazione HTTP sta in `.storage` e si cambia con il comando WebSocket `http/config/configure` (salva, riavvia, conferma entro 5 minuti) oppure da Impostazioni > Sistema > Rete [verificato: codice 2026.9.4, `components/http/config.py`, `server.py`, `websocket_api.py`, letti il 2026-10-23]. `TUNET_INTERNAL_HA_URL` userà la porta **letta** da HA | D-I8 [approvato] nell'intento; qui si corregge solo il mezzo |
| Prova di rete (P0, I5) | Ripetizione dalla VM | P0 non è stata concludente [verificato: «Rettifiche successive»]. Ripetizione **facoltativa** dalla VM: MAC fittizio e un ascoltatore su un secondo apparecchio, per esempio il tablet su una porta alta, se l'azione `wake_on_lan.send_magic_packet` accetta la porta scelta [non verificato]. La prova decisiva è l'accensione reale in D1g | — |
| Raggiungibilità del TV | «Porte 3000/3001 aperte» | Aperte **dal PC** [verificato: REP-20261023-001]; dal container e dalla VM [non verificato] | correzione |
| Appunto `api-ha.md` | Tra 2026.9.4 e 2026.10.2 cambia «solo la rinomina» | Cambiano anche: l'accesso (PKCE facoltativo); la gestione degli utenti (nuovi errori e protezioni del proprietario); gli stati di una voce comprendono `unload_in_progress`; `flow_handlers?type=` con un valore fuori elenco dà un errore del server [verificato: codice]. In più, `api-pubbliche-interne.md` §7 dice che non esiste un'API per l'HTTP: è superato, perché i comandi `http/config*` esistono in 2026.9.4 | `backup/allineamento-d1/api-pubbliche-interne.md` §4, §10; rilettura del codice del 2026-10-23 |

### 2. Riuso dei meccanismi di HA, nessuna scansione propria

- **HA resta il motore** [approvato: ADR-0009, ADR-0021]: protocolli, scoperta, abbinamento, chiavi, automazioni. Acasystem disegna i passi e decide chi può fare che cosa.
- **La scoperta è solo quella di HA.** zeroconf, SSDP, DHCP, USB, Bluetooth, HomeKit e MQTT li gestisce HA. Acasystem legge l'esito con `config_entries/flow/progress` e `config_entries/flow/subscribe`. **Acasystem non invia pacchetti di ricerca, non legge la tabella ARP e non scansiona la rete.** La proposta della sezione 10, «scoperta di rete fatta da Acasystem stesso, da valutare dopo I5», è **ritirata** per il vincolo dell'utente.
- **L'aggiunta per indirizzo** del TV LG usa il flusso `webostv` di HA con il campo `host`. Non è una scoperta e **non sostituisce** la prova del criterio 2.
- **Il Wake on LAN** usa l'integrazione `wake_on_lan` di HA: il pacchetto lo invia HA, non Acasystem.

### 3. Chiamate a HA: API pubbliche documentate o endpoint interni

**Classi:**

- **DOC**: il formato è descritto in una pagina ufficiale per sviluppatori. Pagine: `https://contributors.home-assistant.io/core/internals/rest-api/`, `…/websocket-api/` e `…/auth-api/`, raggiunte con un redirect 301 da `developers.home-assistant.io`. Sono senza data, gli esempi riportano `ha_version` 2026.10.0; consultate il 2026-10-23.
- **DOC-utente**: il contenuto è descritto nelle pagine per utenti (`https://www.home-assistant.io/integrations/webostv/`, `/wake_on_lan/`), ma l'endpoint che lo trasporta no.
- **DOC-nome**: il comando è solo **nominato** in una pagina ufficiale per sviluppatori, senza formato descritto (per esempio `manifest/list` nella pagina WebSocket). Si tratta come **INT**: test di contratto obbligatorio e sonda di degrado. *(Classe aggiunta il 2026-10-23 dopo la revisione: era usata nella tabella senza essere definita.)*
- **SUP**: API del Supervisor, solo con HAOS.
- **INT**: endpoint interno usato dal frontend di HA. Non ha una pagina ufficiale né una garanzia di stabilità.

**Versione supportata:** Core **2026.9.4** (D-I5 [approvato]), commit `9212531f40a0b7b23229a90d688dd79d9dfccff4`, frontend `20260826.7`. **Versione di confronto:** 2026.10.2, la stabile corrente, pubblicata il 2026-10-16 (frontend `20260930.4`). Il confronto è stato fatto sul codice letto il 2026-10-23, dopo aver normalizzato la rinomina `voluptuous` → `probatio`; il dettaglio è nell'appunto `api-pubbliche-interne.md` §4. **Nessuna chiamata interna di aggiunta o configurazione è stata osservata su un HA acceso.**

| # | Gruppo | Chiamate | Classe | Permesso | Da 2026.9.4 a 2026.10.2 | Verifica di compatibilità | Uso |
|---|---|---|---|---|---|---|---|
| 1 | Token | `POST /auth/token`, `POST /auth/revoke` | DOC | nessuno | aggiunto PKCE facoltativo (additivo) | CT-01 | [realizzato] accesso di oggi |
| 2 | Accesso | `/auth/providers`, `/auth/login_flow`, WS `auth/current_user` | INT | nessuno / utente | `login_flow`: PKCE facoltativo; il resto invariato | CT-01; RD-01 (`onboarding_required`) | [realizzato] |
| 3 | WebSocket di base | handshake, `get_states`, `subscribe_entities`, `subscribe_events`, `call_service`, `get_services`, `get_config` | DOC | utente | contratto invariato | CT-02, CT-03 | [realizzato] |
| 4 | Azioni del TV | `media_player.turn_on`, `select_source`, `turn_off`; `button.press`; `wake_on_lan.send_magic_packet` | DOC-utente | utente | invariate. `turn_on` del TV esiste solo se c'è un'automazione sul trigger `webostv.turn_on` [verificato: codice] | CT-03; RD-08 (bit 128) | D1 |
| 5 | Prevalidazione | WS `validate_config` | DOC | utente | invariato | CT-11 | D1b, prima di scrivere la ricetta |
| 6 | Token di servizio | WS `auth/long_lived_access_token` | DOC | l'utente collegato, solo per sé | invariato | CT-14 | D1s, se D-D22 = a1 |
| 7 | Utenti | WS `config/auth/create\|update\|delete\|list`, `config/auth_provider/homeassistant/create` | INT | admin | **cambiano**: in 2026.10.2 compaiono `cannot_delete_owner`, `cannot_modify_system_generated`, `credentials_exist` e protezioni del proprietario | CT-14 | D1s (creazione dell'utente di servizio) |
| 8 | Onboarding | `GET /api/onboarding`, `…/installation_type`; `POST …/users`, `…/core_config`, `…/analytics`, `…/integration`; WS `config/core/update`, `analytics/preferences` | INT | **nessuno** per `users` finché non è fatto; poi token | invariato (solo a capo) | CT-13 | **Non in D1**: tappa I-P (criterio 1). Mai nel proxy `/ha` |
| 9 | Catalogo | REST `flow_handlers` (non admin; **non** usare `?type=`); WS `integration/descriptions` (admin); `manifest/list` (DOC-nome); `frontend/get_translations` | INT, salvo `manifest/list` | vedi colonna «Chiamate» | invariati | CT-04; RD-02, RD-04, RD-05 | D1: solo `flow_handlers` e traduzioni; D3: ricerca |
| 10 | Flussi | `POST /api/config/config_entries/flow`; `GET`/`POST`/`DELETE …/flow/{id}` | INT | admin; `DELETE` qualunque utente autenticato; `GET` **riesegue** il passo | invariati (cambiano solo i tipi) | CT-05, CT-06, CT-07; RD-03, RD-10 | D1 |
| 11 | Opzioni | `…/options/flow` | INT | admin | invariati | CT-08 | Non in D1 (D-D18) |
| 12 | Trovati | WS `config_entries/flow/progress`, `…/flow/subscribe`, `…/ignore_flow` | INT | admin | invariati | CT-12; RD-06 | D4 (criterio 2) |
| 13 | Voci | WS `config_entries/get` e `…/subscribe` (non admin); `get_single`, `update`, `disable` (admin); REST `…/entry/{id}/reload` e `DELETE …/entry/{id}` (admin) | INT | vedi colonna «Chiamate» | invariati; lo stato `unload_in_progress` c'è già in 2026.9.4 | CT-09 | D1: attesa dello stato `loaded`; rimozione in D6 |
| 14 | Registri | WS `config/device_registry/list`, `config/entity_registry/list`, `config/area_registry/list` (non admin); `…/update`, `config/area_registry/create` (admin) | INT; `list_for_display` è DOC | vedi colonna «Chiamate» | invariati; i campi `config_entries` del dispositivo sono deprecati, con rimozione annunciata nella 2027.8 | CT-10 | D1: nome, stanza, `hidden_by` del pulsante |
| 15 | Automazioni | REST `GET`/`POST`/`DELETE /api/config/automation/config/{id}` | INT | admin | file identico (0 righe diverse) | CT-11; RD-07 | D1b. Richiede `automation: !include automations.yaml` in `configuration.yaml` [non verificato su un HA nuovo] |
| 16 | Eventi dei flussi | `data_entry_flow_progressed` tramite `subscribe_events` | comando DOC, evento INT | admin | invariati | CT-06 | D2 |
| 17 | Server HTTP | WS `http/config`, `http/config/configure`, `http/config/promote` | INT | admin | presenti in 2026.9.4 [verificato: codice]; 2026.10.2 non confrontato | **CT-18** (nuovo), sulla VM | V1 (D-I8), eseguito dall'utente |
| 18 | Supervisor | proxy delle app con `SUPERVISOR_TOKEN` (SUP); WS `supervisor/api` (INT, admin) | SUP / INT | admin | invariati | CT-16 | Non in D1. **Rischio:** il tunnel `/ha` non filtrato fa passare `supervisor/api` a un utente amministratore (D-D16) |
| 19 | Loghi | `brands/access_token`, `/api/brands/…` | DOC | token | invariati | CT-15 | D3, solo se D-D15 lo approva |
| 20 | Radio | WS `zha/*`, `matter/*`, `zwave_js/*` | INT | admin | `matter` identico; `zha` ristrutturato; `zwave_js` non letto | CT-17 | Fuori da D1 |
| 21 | Login esterni | `HA-Frontend-Base`, `/auth/external/callback`, `application_credentials/*` | INT | — | non letti nel dettaglio | — | D8 |

**Come si verifica la compatibilità degli endpoint interni** [proposto; nessuna parte è realizzata]. Nel repository non esiste alcuna fixture registrata da un HA vero (verificato dal flusso cercando per nome dei file).

1. **Un solo adattatore HA nel backend.** La facciata di ADR-0021 è l'unico punto che conosce rotte, comandi e forme delle risposte interne. Il frontend non chiama mai gli endpoint interni di scrittura.
2. **Versione fissata ed elenco delle «versioni provate»** in `verification.md`; oggi c'è solo 2026.9.4. Il banco in Docker usa il tag mobile `stable`. Nella VM HAOS il Core va portato alla versione scelta in D-D23 (a) e tenuto lì, senza aggiornamenti automatici.
3. **Test di contratto CT-01…CT-18** su risposte **registrate** dalla VM alla versione fissata, anonimizzate e versionate per cartella di versione. In D1 (sotto-tappa D1g) si registrano solo CT-01…CT-11 e CT-14; CT-12 e CT-13 nelle tappe D4 e I-P.
4. **Sonde a effetto nullo RD-01…RD-11**, eseguite all'apertura della funzione e dopo un riavvio di HA. Se una sonda fallisce, compare un messaggio di degrado in italiano e la funzione resta spenta. Non si tenta mai di indovinare un comportamento.
5. **Controllo a ogni aggiornamento di HA:**
   1. lettura delle note di rilascio;
   2. `diff` normalizzato dei file letti;
   3. CT e RD su un'istanza di prova;
   4. aggiornamento dell'elenco delle versioni provate.

   Se un CT fallisce si corregge l'adattatore, non il test.
6. **I tipi TypeScript del frontend di HA** servono come allarme, non come contratto: tra i due tag sono cambiati senza modifiche del backend.

### 4. I quattro criteri di accettazione: prove separate

L'utente ha chiesto di verificare separatamente quattro criteri finali. D1 contribuisce al criterio 3 e in parte al 4, ma **non chiude nessuno dei quattro per il prodotto intero**.

| Criterio | Che cosa deve dimostrare | Prova [proposto] | Dove | Evidenza di oggi | Tappa |
|---|---|---|---|---|---|
| **1. Installazione pulita e ripetibile** | Si parte da una macchina senza la configurazione del banco e si arriva al primo accesso del cliente: installazione di HA; inizializzazione (proprietario, posizione, analisi, chiusura); installazione e collegamento di Acasystem; attivazione dell'identità di servizio; primo accesso del cliente da Acasystem. Tutto **senza l'interfaccia standard di HA**, salvo i passi ancora necessari elencati nella sezione 5. La procedura si ripete **due volte da zero** con lo stesso esito: versioni, passi completati, numero di utenti, aree e voci, tempi | (a) Partenza «come uscita dalla scatola»: snapshot o nuova estrazione del `.vdi`, oppure il disco del Dell riscritto. (b) Attesa della preparazione, con tempo massimo misurato. (c) Core alla versione fissata. (d) Onboarding con gli endpoint della riga 8 della sezione 3, eseguito dallo script dell'installatore o dalla schermata di primo avvio di Acasystem (N-1). (d2) Solo con l'opzione A di REP-20261023-004: installazione e configurazione di Acasystem come app (repository, installazione, opzioni, watchdog, porta), riga 15 della sezione 5. (e) Collegamento di Acasystem con indirizzo e porta letti da HA, non scritti a mano. (f) Attivazione dell'identità di servizio. (g) Accesso del cliente. (h) Ripetizione e confronto | VM (prova di sviluppo), poi Dell o mini-PC (prova di accettazione) | **Nessuna.** Il banco è stato costruito a mano il 2026-10-05; Acasystem non ha un primo avvio; l'onboarding via API non è mai stato eseguito [verificato: lettura del codice di Acasystem e dei documenti] | **I-P** (nuova), dopo D1 e dopo le decisioni N-1…N-4 e D-C1 |
| **2. Scoperta automatica reale** | Un dispositivo che si annuncia sulla rete compare in Acasystem senza inserire indirizzi e si aggiunge da lì. Il TV aggiunto per IP **non conta**. Se non compare nulla, si registra la causa | HA sulla LAN; un dispositivo di prova che si annuncia (mDNS, SSDP o DHCP), scelto con l'utente; il dispositivo compare tra i trovati dentro i fogli «Collega» e «Aggiungi un widget», poi si aggiunge e si usa | Dell o mini-PC in Ethernet (prova di accettazione); VM a ponte su Wi-Fi solo come indicazione | **Nessuna.** HA in Docker Desktop non vede la LAN; il TV `.26` non risponde a SSDP nemmeno dal PC [verificato: REP-20261023-001] | **D4**, dopo D2 |
| **3. Configurazione e utilizzo da Acasystem** | Da Acasystem, senza aprire HA: aggiunta, abbinamento, nome, stanza, collegamento al widget, accensione e uso | D1 per il TV LG; poi D2 e D3 per le altre famiglie | VM e Tab M11 | ADR-0021 accettata; nessun codice [verificato: ricerca in `backend/src`] | **D1** (primo caso), poi D2, D3, D5, D6 |
| **4. Persistenza dopo il riavvio** | Dopo il riavvio di ciascun componente restano: accesso, collegamenti dei widget, voci, automazione, accensione, identità di servizio e impostazioni. Non resta aperto nessun flusso | Riavvii separati, in quest'ordine: container di Acasystem, HA o VM, TV, tablet. Poi l'host (PC o Dell), da riavviare insieme all'utente. Sul Dell anche un blackout simulato (A7) | D1: VM; prova completa: Dell | Il volume di Acasystem persiste nelle ricreazioni del container [verificato: prova, `infrastructure.md`]. HAOS non è mai stato riavviato. Il backend si ferma con SIGKILL dopo 10 s [verificato: `infrastructure.md`, 2026-10-10] | **D1p** (in parte), poi I-P e A7 |

### 5. Passaggi che oggi richiedono ancora l'interfaccia standard di HA

Colonne: «Oggi» = codice e banco del 2026-10-23; «Con D1» = situazione dopo D1, se autorizzato come nella sezione «Incarico D1»; «Dopo» = tappa che elimina il passaggio.

| # | Passaggio | Oggi | Con D1 | Dopo |
|---|---|---|---|---|
| 1 | Creare il proprietario e completare l'onboarding (posizione, analisi, chiusura) | Interfaccia di HA; Acasystem mostra solo «Completa la configurazione iniziale di Home Assistant» | **Interfaccia di HA, una volta, a cura dell'utente** (se D-D23 = a). Passo dichiarato | I-P: script dell'installatore o schermata di primo avvio di Acasystem (N-1). Gli endpoint interni senza autenticazione non entrano mai nel proxy |
| 2 | Ripristinare un backup (migrazione) | Interfaccia di HA | Solo se D-D23 = b | — |
| 3 | Utente HA non amministratore per il tablet | Interfaccia di HA | **Interfaccia di HA, a cura dell'utente.** Passo dichiarato | I-P: creato dall'installazione |
| 4 | Identità di servizio | Non esiste | Comando dell'installatore sul server di Acasystem (D1s), **lanciato dall'utente nel proprio terminale**, con le credenziali del proprietario digitate dall'utente. Non serve l'interfaccia di HA | I-P: dentro il primo avvio |
| 5 | Indirizzi di ascolto (D-I8) e interfacce di rete usate da HA | Interfaccia di HA (Impostazioni > Sistema > Rete) | **Interfaccia di HA, a cura dell'utente** con la guida dell'agente. L'agente non ha credenziali e l'identità di servizio non tocca il nucleo di HA | I-P: script dell'installatore con `http/config/configure` |
| 6 | IP fisso della VM sull'Host-Only; Core alla versione fissata | Console di HAOS o comandi di VirtualBox | Console di HAOS (`ha core update --version`, `ha network …`) o DHCP di VirtualBox, senza interfaccia web | I-P: cartella `CONFIG` e script |
| 7 | Token a lunga durata del tablet in kiosk | Pagina del profilo di HA | Invariato (non serve a D1) | Tappa kiosk (REQ-15): comando WebSocket pubblico `auth/long_lived_access_token` |
| 8 | Aggiungere `webostv` e `wake_on_lan`, abbinare, dare nome e stanza, creare l'automazione di accensione | Interfaccia di HA | **Da Acasystem** | — |
| 9 | Rimuovere un dispositivo, un'integrazione o l'automazione | Interfaccia di HA | Interfaccia di HA, solo per pulizia o ritorno indietro | D6 |
| 10 | Sospendere o eliminare l'identità di servizio (revoca) | — | Interfaccia di HA (Persone > Utenti), a cura dell'utente. In D1 una volta, nella sotto-tappa D1g, per il caso negativo: sospendi, verifica, riattiva | Tappa successiva: azione dell'installatore in Acasystem [proposto] |
| 11 | Backup di HA, chiave, kit di emergenza | Interfaccia di HA | Invariato; durante D1 si usano gli snapshot della VM | Piano di manutenzione (A8) |
| 12 | Aggiornamenti di Core, OS e Supervisor | Interfaccia di HA o CLI | Nessun aggiornamento durante D1 | A8 |
| 13 | Integrazioni con login esterno o solo YAML; aggiunta di dispositivi Matter (Companion app sul telefono) | Interfaccia di HA o telefono | Invariato | D8; D-C14 |
| 14 | Passi non automatizzabili: BIOS, chiavetta, cavo, impostazioni sul TV («LG Connect Apps», accensione via rete), accettazione sul TV, prenotazione DHCP sul router | Persona sul posto | Persona sul posto | Restano sempre in presenza |
| 15 | Installare e configurare Acasystem come app su HAOS (solo opzione A di REP-20261023-004): repository, installazione, opzioni, watchdog, porta | Interfaccia di HA o CLI `ha` con un amministratore. L'app non può farlo da sé: il proxy delle app nega `supervisor/` e `hassio/` [verificato: codice Supervisor 2026.10.3 e documentazione delle app, `installazione-pulita.md`] | Non applicabile: in D1 Acasystem resta in Docker Desktop sul PC | I-P: script dell'installatore (WS `supervisor/api` con un amministratore, oppure CLI `ha`) |

*Riga 15 aggiunta il 2026-10-23 dopo la revisione.*

### 6. D1 come primo risultato e tappe successive esplicite

D1 (sezione «Incarico D1») porta il TV LG `192.168.1.26` dallo stato «sconosciuto» allo stato «usato da Acasystem», su un HA nella VM. **Non è il completamento del prodotto.** Le tappe successive restano esplicite:

| Tappa | Contenuto | Criterio | Dipende da |
|---|---|---|---|
| **I-P** (nuova) | Installazione pulita e ripetibile: primo avvio di Acasystem; onboarding di HA senza la sua interfaccia; collegamento automatico, con indirizzo e porta letti da HA; identità di servizio; compose parametrico o pacchetto app; `/api/health` che verifica HA; chiusura ordinata del backend. Due ripetizioni da zero | 1 | D1, N-1…N-4, D-C1 (per la forma sul cliente), D-C5 |
| **D2** | Motore completo dei flussi; test di contratto su risposte registrate | 3 | D1 |
| **D3** | Catalogo con **ricerca tra tutte le integrazioni** (D-D3): visibili tutte, avviabili secondo D-D22 (b); loghi se D-D15 | 3 | D2, D-D22 |
| **D4** | Trovati: scoperta automatica reale. **L'aggiunta per IP non la sostituisce** | 2 | D2; HA sulla LAN, meglio sul Dell in Ethernet |
| **D5** | Configurazione dopo l'aggiunta: riabbina, cambia indirizzo, app (D-D18) | 3 | D2, D-D17, D-D18 |
| **D6** | Rimozione con doppia conferma e registro | 3 | D-D8, D-D22 (c) |
| **D9** (nuova) | «Accendi» e «Accendi + app a scelta» nel widget del TV | 3 | D1; conferma della lettura di D-D7 |
| **D8** | Login esterni | 3 | D2, D-D4 |
| **D-D16** | Filtro del tunnel prima di dare la funzione ai clienti | sicurezza | Decisione dell'utente |
| **A1-A8 / K4** | Se D-C1 = A: prove sul Dell (watchdog, blackout, NVMe, rete) e persistenza completa | 1, 4 | D-C1, Dell disponibile |

**Ordine consigliato** [valutazione]:

1. D1;
2. I-P sulla VM, sullo stesso apparecchio e ripetibile con gli snapshot;
3. D2 e D3;
4. D4, con il criterio 2 provato sul Dell.

## Permessi del cliente (2026-10-23)

**Richiesta** (utente, 2026-10-23, testuale): «Chiarisci prima dell'implementazione come consentire queste operazioni al cliente, dato che i flussi di HA richiedono privilegi amministrativi. Proponi una soluzione motivata e indicami la decisione necessaria. Non rendere automaticamente amministratore il cliente e non introdurre implicitamente un'identità privilegiata.»

L'analisi completa è in `backup/allineamento-d1/permessi-cliente.md` (Sonnet 5.5, 2026-10-23). Qui sono riportate le conclusioni che contano.

**Fatti** [verificato: codice di HA 2026.9.4 e 2026.10.2 e documentazione, consultati il 2026-10-23; nulla è stato provato su un HA acceso]:

- In HA ogni scrittura di configurazione controlla solo `user.is_admin`. **Non esistono ruoli intermedi** né token con ambito ridotto: le policy di HA riguardano solo le entità (`https://contributors.home-assistant.io/core/internals/permissions/`). In HA non si può quindi creare un utente che «aggiunge solo dispositivi».
- Un utente non amministratore può:
  - leggere `flow_handlers`, le voci, le traduzioni e i registri;
  - chiamare le azioni sulle entità;
  - annullare un flusso.
- Un utente non amministratore **non può**:
  - avviare o proseguire un flusso;
  - leggere il catalogo completo (`integration/descriptions`);
  - vedere i dispositivi trovati;
  - scrivere nei registri o nelle automazioni.
- Il token del Supervisor di un'app è un'identità amministratore piena e non riducibile, senza un utente visibile nell'elenco di HA (`https://contributors.home-assistant.io/apps/guides/communication/`).
- Il token a lunga durata si crea solo per l'utente collegato. Un amministratore non può revocare da WebSocket il token di un altro utente, ma può sospendere o eliminare l'utente.

**Opzioni considerate**

| Opzione | Il cliente aggiunge da solo (D-D1) | Il cliente resta non amministratore | Identità dichiarata | Funziona sul banco D1 | Nota |
|---|---|---|---|---|---|
| 1. **Identità di servizio dichiarata** (consigliata) | sì | sì | sì: utente di HA visibile, creato da una persona | sì | Il confine di sicurezza è la lista della facciata; il server custodisce un segreto da amministratore |
| 2. App HAOS con token del Supervisor | sì | sì | no: nessun utente visibile, poteri non riducibili | **no**: Acasystem è in Docker sul PC | È la più vicina a un privilegio implicito |
| 3. Solo sessione installatore (REQ-06) | **no** | sì | sì | sì | Contraddice D-D1; resta come livello installatore |
| 4. Richiesta approvata da un amministratore | in parte | sì | sì | sì | Non regge l'abbinamento di 10 s; utile come valvola per le operazioni sensibili |
| 5. Cliente amministratore | sì | **no** | — | sì | Esclusa dall'utente |

**Soluzione consigliata** [proposto; bozza [ADR-0022](../decisions/ADR-0022-identita-di-servizio-dispositivi.md)]:

1. **Livello cliente.** Il tablet usa un utente di HA **non amministratore**. Per una **lista chiusa** di operazioni, la facciata `/api/dispositivi` agisce con l'utente di HA dedicato «Acasystem (servizio)». Prima verifica sul server che la sessione HA di chi chiama sia valida. La lista comprende:
   - avvio dei gestori ammessi;
   - passi e annullamento dei **propri** flussi;
   - nome e stanza;
   - ricetta di accensione;
   - letture del catalogo e dei dispositivi trovati;
   - in seguito, rimozione con doppia conferma.
2. **Livello installatore.** Ciò che sta fuori dalla lista lo fa una persona con il proprio account amministratore di HA: la facciata inoltra con il **suo** token. Non c'è alcun ripiego sull'identità di servizio.
3. **Creazione dichiarata.** L'utente di servizio nasce solo da un passo esplicito di installazione: un comando sul server in D1, una schermata del primo avvio in I-P.
   - Il passo usa le credenziali del **proprietario**, digitate da una persona e mai salvate.
   - Crea l'utente con `local_only` e una password casuale non conservata.
   - Ottiene il token e lo scrive in un file riservato del server.
4. **Invarianti verificabili:**
   - il token di servizio non arriva mai al browser, ai log, al registro, a `tunet.db` né alle copie in `backup/`;
   - il tunnel `/ha` inoltra solo il token dell'utente;
   - senza identità attiva la funzione è **negata** con il messaggio «servizio non attivo», senza ripiegare sul token dell'utente;
   - se il tablet usa un account amministratore, gli amministratori ricevono un avviso.
5. **Revoca.** Basta sospendere o eliminare «Acasystem (servizio)» in HA: la funzione si spegne, il resto di Acasystem continua a funzionare.
6. **Gestori che il cliente può avviare** (D-D22 b):
   - il catalogo è visibile e ricercabile su tutte le integrazioni (D-D3);
   - si possono avviare solo i tipi `device` e `hub` con flusso locale, meno un elenco di esclusione;
   - **in D1 solo `webostv` e `wake_on_lan`**.

   Se il cliente potesse avviare «qualunque integrazione», l'identità di servizio diventerebbe un amministratore pieno raggiungibile da ogni tablet. Alcune integrazioni leggono file o raggiungono indirizzi interni, e quali siano non è ancora stato studiato.

**Rischi dichiarati**

- Chi compromette il server, o il suo volume dei segreti, ottiene l'amministrazione di HA.
- Un errore nella lista della facciata diventa un'escalation di privilegi.
- In HA le azioni risultano fatte dall'utente di servizio, non dalla persona: la traccia per persona è solo nel registro di Acasystem.
- Il registro resta parziale finché il tunnel non è filtrato (D-D16).

Con il tablet non amministratore, D-D16 **non blocca D1**: i comandi di configurazione inviati dal tunnel da un utente non amministratore li rifiuta HA [verificato: codice; non provato].

**Conflitto con REQ-06/AC-06** [approvato il requisito, non realizzato]

- REQ-06 attribuisce la configurazione all'amministratore. D-D1 è una fonte umana successiva che la estende al cliente.
- Proposta di integrazione, da approvare con D-D22 (d):
  - il cliente **non** acquisisce privilegi amministrativi propri;
  - il server di Acasystem ha un'identità amministrativa dichiarata, limitata dalla lista e revocabile;
  - le operazioni del cliente fuori dalla lista sono rifiutate con 403;
  - ogni azione è nel registro.
- Dopo la risposta, la sotto-tappa T0b di D1 scrive l'annotazione in `product.md` e un nuovo requisito, con il prossimo numero REQ libero.

## Incarico D1 pronto da autorizzare (2026-10-23)

Testo proposto all'utente: si può autorizzare così com'è o indicando le parti da cambiare. Presuppone tre cose:

- le risposte a D-D22 e D-D23 (sezione «Decisioni ancora necessarie per iniziare D1»);
- la conferma che il codice è libero;
- per la sola prova reale D1g, i punti «da fissare prima di D1g».

### Obiettivo

L'obiettivo riguarda il TV LG `192.168.1.26`, quello autorizzato. Da Acasystem, sul Lenovo Tab M11, il TV viene:

1. aggiunto per indirizzo;
2. abbinato;
3. collegato al widget;
4. mostrato con il suo stato reale;
5. acceso da spento;
6. usato per aprire Netflix.

Per tutto il percorso del dispositivo non si apre l'interfaccia di HA, e il risultato resta dopo i riavvii.

Condizioni:

- HA è nella VM `acasystem-ha`;
- il cliente usa un account di HA non amministratore;
- le scritture passano dalla facciata con l'identità di servizio dichiarata.

### Perimetro

**Dentro**

- **Codice** in `progetto/acasystem`:
  - **backend:** facciata `/api/dispositivi/*`, adattatore HA, identità di servizio, registro, tabella dei flussi, ricetta di accensione, sonde RD, test;
  - **frontend:** ingressi nei fogli «Collega» e «Aggiungi un widget», percorso di aggiunta a schermo intero, motore minimo, schermate dedicate, dizionario italiano, test;
  - **`progetto/compose.tunet.yaml`:** indirizzo e porta di HA nella VM; volume separato per il segreto di servizio; eventuale rimozione del collegamento all'IP Wi-Fi a favore di `adb reverse`;
  - **`.env`:** versione di Acasystem.
- **Documenti**, ognuno riletto subito prima di scriverlo:
  - questo report, `verification.md`, `infrastructure.md`, `project-status.md` e `compliance.md`;
  - `product.md`: annotazione su REQ-06/AC-06 e nuovo requisito, solo dopo D-D22 (d);
  - annotazioni su ADR-0009 e ADR-0021; stato di ADR-0022 secondo D-D22.
- **VM `acasystem-ha`:**
  - scheda NAT temporanea e avvio;
  - snapshot prima di ogni passo che la modifica;
  - Core alla versione fissata;
  - IP fisso sull'Host-Only;
  - ponte collegato dopo l'onboarding;
  - riavvii.
- **Docker:**
  - ricostruzione e riavvio del container `tunet`;
  - arresto del container `homeassistant` di Docker, che resta di riserva e non si cancella.
- **Tab M11 via adb:** `adb reverse`, profilo CDP, ascoltatore UDP su una porta alta per la prova di rete facoltativa, gesti sintetici.
- **TV `192.168.1.26`:** abbinamento, accensione, spegnimento e apertura di Netflix, solo nella sotto-tappa D1g e solo con una persona davanti al TV.

**Fuori**

- Rete e altri dispositivi:
  - router e prenotazioni DHCP;
  - il TV `192.168.1.18` e ogni altro dispositivo;
  - il Dell;
  - scansioni di rete o ARP da parte di Acasystem.
- Tappe successive:
  - la prova di installazione pulita ripetibile (criterio 1, tappa I-P);
  - la scoperta automatica (criterio 2, D4);
  - la ricerca tra le integrazioni (D3);
  - la rimozione (D6), «Accendi + app» (D9) e i login esterni (D8);
  - Matter e le radio;
  - il filtro del tunnel (D-D16);
  - l'impacchettamento come app HAOS.
- Regole di lavoro:
  - aggiornamenti delle dipendenze e cambi di stack;
  - credenziali digitate o lette dall'agente;
  - commit, salvo autorizzazione esplicita nell'atto con cui si autorizza D1;
  - processi terminati per nome.

### Prerequisiti e stato

| # | Prerequisito | Stato | Che cosa serve |
|---|---|---|---|
| P1 | Codice libero (0.9.27 chiusa) | **[verificato] non libero** alle 11:55: 390 voci in `git status` di `progetto/`, nessun commit sopra `7298d4d`. I file centrali di D1 sono già modificati: `server.ts`, `database.ts`, i fogli «Collega» e «Aggiungi un widget», `SystemPage.tsx`, `TvWidget.tsx`, `compose.tunet.yaml` | Conferma dell'utente; copia PRIMA dell'albero in `backup/` oppure commit dell'utente |
| P2 | ADR-0019 realizzata (copia al collegamento) | [approvato]; realizzazione nella 0.9.27 [non verificato] | Lettura all'avvio |
| P3 | VM `acasystem-ha`: HAOS 18.3, 2 vCPU, 4 GB, EFI | [realizzato], mai avviata; immagine [verificato: SHA-256 uguale al digest di GitHub] | Avvio in V1 |
| P4 | La VM ha Internet al primo avvio | **[verificato] no**: ponte scollegato e Host-Only | Scheda NAT temporanea (V1) |
| P5 | Core alla versione scelta in D-D23 (2026.9.4 oppure la 2026.10.x installata) su HAOS 18.3 | [non verificato]: il Supervisor installa la versione stabile corrente; il ritorno indietro a 2026.9.4 su un HA nuovo non è provato | Con 2026.9.4: `ha core update --version 2026.9.4` dalla console, in V1 |
| P6 | Porta effettiva di HA | [verificato: codice] 80 su un HAOS nuovo | Lettura in V1 |
| P7 | Il container `tunet` raggiunge la VM sull'Host-Only `192.168.56.x` | [non verificato] | Prova in V1 |
| P8 | Il Wake on LAN esce dalla VM sulla LAN (ponte su Wi-Fi con MAC sostituito) | [non verificato]; P0 dal container non concludente | Prova facoltativa in V1; prova decisiva in D1g |
| P9 | Identità del TV `.26`: «[LG] webOS TV UA751C0LA» | [verificato: mDNS dal PC] | — |
| P10 | Porte 3000/3001 del TV | aperte dal PC [verificato]; dalla VM [non verificato] | Primo passo del flusso, in D1-min |
| P11 | Sul TV: «LG Connect Apps», accensione via rete («Wake on LAN» o «Turn On Via WiFi»), cavo o Wi-Fi, anno del modello, MAC letto dal menu | [non verificato] | Una persona davanti al TV, prima di D1g |
| P12 | IP del TV fisso | **[verificato] non fisso** | D-D21 e D-I4, prima di D1g |
| P13 | Tab M11: adb, Chrome, rete | adb [verificato] alle 11:11; percorso verso il banco con `adb reverse` [verificato come metodo] | `adb devices` all'avvio |
| P14 | Account del tablet | [non verificato] con quale utente gira oggi | Utente di HA non amministratore, creato dall'utente in V1 |
| P15 | PC sveglio e sulla rete dell'ufficio | Wi-Fi `192.168.1.7`, profilo «Pubblico»; il compose pubblica su `.27` [verificato alle 11:55] | PC tenuto sveglio; `adb reverse` |
| P16 | Persona al TV, data e ora | D-D20 aperta | Prima di D1g |
| P17 | VirtualBox 7.2.4 con l'hypervisor di Windows attivo (WSL2 e Docker Desktop): avvio di HAOS 18.3 con EFI e tempi accettabili | [non verificato]: la VM non è mai stata avviata; il problema è già indicato in §6.1 | Misura in V1 (tempo di avvio, tempo di risposta di `/api/onboarding`, carico del PC). Cambiare la configurazione di Windows è fuori perimetro |
| P18 | Funzioni esistenti di Acasystem riservate agli amministratori (Sistema: posizione della casa con `config/core/update`, sezioni condizionate da `is_admin`/`is_owner` in `SystemPage.tsx` riga 63, ruolo mostrato in `ConnectionSection.tsx`; scrittura del piano della Casa 3D, ADR-0009 annotazione 2026-10-21) | [verificato: lettura del codice, 2026-10-23]: con il tablet non amministratore spariscono o rispondono 403 | Elenco completo in D1-0 e verifica di regressione per account (sezione «Verifiche»); quale funzione passa alla facciata lo decide l'utente, non D1 |

### Sotto-tappe in ordine

| ID | Contenuto | Criterio misurabile | Modello |
|---|---|---|---|
| **D1-0** | Avvio. Lettura dello stato Git, di `project-status.md` e di questo report. Copia PRIMA dell'albero di `progetto/` e copia a freddo del volume `tunet-data` in `backup/`, con dimensione e SHA-256. Rilevamento dello stato di VM, Docker, adb e PC. Elenco, in sola lettura, delle funzioni di Acasystem che oggi richiedono `is_admin`/`is_owner` (P18) | Copie presenti e verificate; stato ed elenco registrati in `verification.md` | Sonnet |
| **T0b** | Documenti di decisione: stato di ADR-0022 secondo D-D22. Annotazioni su ADR-0021 («non esiste un token di servizio» e punto 7 superati per la lista), su ADR-0009 (solo la lista consentita superata per i dispositivi: la porta 80 e il mezzo di D-I8 sono già annotati il 2026-10-23) e su REQ-06/AC-06. Nuovo REQ con il prossimo numero libero. Voci in `compliance.md`: segreto di servizio, registro, quattro integrazioni create dall'onboarding | Documenti coerenti; nessun ID riusato | Haiku |
| **V1** | VM, nell'ordine: snapshot; scheda NAT temporanea; avvio senza finestra; attesa di `GET /api/onboarding`, con tempo misurato (P17); Core alla versione scelta in D-D23 dalla console. **L'utente** crea dalla pagina di benvenuto (Host-Only) il proprietario, poi il cliente di prova non amministratore, poi imposta la limitazione dell'ascolto (D-I8) in Impostazioni > Sistema > Rete, con la guida dell'agente. Poi: IP fisso sull'Host-Only; lettura della porta; ponte collegato e NAT tolta; snapshot. Acasystem viene puntato sulla VM (`TUNET_INTERNAL_HA_URL`) e il container `homeassistant` di Docker viene fermato. **L'accesso al tablet con il cliente di prova lo fa l'utente di persona**, sul tablet; l'agente usa CDP solo dopo l'accesso e non digita né legge password. Facoltativa: prova di rete con MAC fittizio e ascoltatore sul tablet | Versione del Core = quella scelta in D-D23; `/ha/auth/providers` risponde 200 da Acasystem; la porta di HA **non** risponde dalla LAN (prova dal tablet) e risponde dall'Host-Only (D-I8); `docker ps` senza `homeassistant`; tablet collegato con il cliente di prova (accesso fatto dall'utente); tempi di avvio della VM registrati | Sonnet, con l'utente |
| **D1a** | Backend: adattatore HA; facciata con controllo della sessione sul server; lista chiusa (`webostv`, `wake_on_lan`); tabella dei flussi con annullamento alla scadenza e all'avvio; controllo di appartenenza; registro senza segreti; attesa di 90 s; limite di frequenza; sonde RD-01, -02, -03, -07, -09 | Test con un finto HA: 403 fuori lista o per un `flow_id` altrui; servizio assente → «servizio non attivo», senza ripiego; riavvio a metà → `DELETE` all'avvio; 0 occorrenze dei valori di prova (IP `192.0.2.10`, MAC `02:00:00:00:00:01`, token finto) in risposte, log, registro e `tunet.db` | Sonnet |
| **D1s** | Attivazione dell'identità di servizio con un comando dell'installatore sul server. **Il comando lo lancia l'utente nel proprio terminale** (per esempio `docker exec -it tunet …`, con la riga preparata dall'agente senza segreti); chiede le credenziali del proprietario senza mostrarle e le digita l'utente. L'agente ne vede solo l'esito, che non contiene segreti; gli strumenti dell'agente non sono interattivi e non devono ricevere le credenziali. Crea l'utente «Acasystem (servizio)» con `local_only`. Salva il token in un file `0600` su un volume separato, escluso dalle copie a freddo. Prova con l'avvio e l'annullamento di un flusso `webostv` e scrive una riga nel registro | Test con il finto HA: sequenza corretta, errori della 2026.10.2 tollerati, nessun segreto nell'output. Sul banco: utente visibile in HA, token mai stampato | Sonnet |
| **D1c** | Frontend: ingresso «Aggiungi un dispositivo» nel foglio «Collega» (widget senza dispositivi adatti) e nel foglio «Aggiungi un widget» (tipo senza dispositivi). Percorso a schermo intero con «Esci». Motore minimo: `form` con i tipi di base, `form` vuoto come «Conferma», `abort`, `create_entry`, `next_flow` filtrato, segnaposto. Dizionario italiano per `webostv` e `wake_on_lan`. Elenco breve per tipo di widget (TV → LG webOS). «Riprendi» dopo una ricarica. Stato vuoto quando non ci sono dispositivi | Test di componenti; nessun testo inglese nei passi del TV; tipo sconosciuto → messaggio e `DELETE`; con HA senza `media_player`, il «Collega» del TV mostra lo stato vuoto e l'ingresso, senza elementi di esempio | Sonnet |
| **D1d** | Schermate «Accetta sul TV» (conto alla rovescia di 10 s, «Riprova» sullo stesso passo) e «Nome e stanza» (nome proposto, stanza con «Salta»; scelte rivedibili con D-D10) | Test con la risposta del finto HA tenuta aperta per circa 10 s; `error_pairing` → «Riprova» rimanda `pairing` | Sonnet |
| **D1f** | Ritorno al foglio di partenza con il `media_player` nuovo già scelto; al collegamento vale la regola di ADR-0019 | Test: dopo `create_entry` il foglio mostra il TV nuovo selezionato; due widget sullo stesso TV vedono lo stesso nome di HA | Sonnet |
| **D1-min** | Chiusura intermedia sul banco: TV aggiunto, abbinato, con nome e stanza, collegato; Netflix con il TV già acceso | Punti 1, 4, 5 e 6 del criterio di conclusione, per la parte senza accensione | Sonnet |
| **D1b** | Ricetta di accensione: voce `wake_on_lan`; automazione con prefisso fisso `acasystem_accensione_`, prevalidata con `validate_config`; pulsante nascosto; id ricavati dal server dopo l'attesa dello stato `loaded`; tabella dei legami senza MAC; sonda RD-08 | Test: corpo costruito solo dal modello; id estraneo → 400; nessun MAC in `tunet.db`; con la ricetta, il finto HA espone il bit 128 | Sonnet |
| **D1e** | Schermata «Accendere da spento»: guida; MAC proposto solo da fonti di HA, se esistono, altrimenti inserito dall'installatore con validazione; broadcast ricavato (/24, modificabile in «Avanzate»); «Prova ad accendere» con conferma; stato «Accensione: funziona / non funziona»; entità della ricetta escluse dai widget | Test: MAC non valido rifiutato; conferma obbligatoria; broadcast `192.168.1.255` per `192.168.1.26`; nessuna chiamata di rete di Acasystem verso la LAN | Sonnet |
| **D1g** | Prova reale con una persona al TV e con il Tab M11: aggiunta da **entrambi** gli ingressi, abbinamento, collegamento, stato, accensione, Netflix, casi negativi. Il tablet resta collegato con l'accesso fatto dall'utente in V1 (se serve un nuovo accesso, lo rifà l'utente di persona). Per il caso «identità di servizio sospesa», nell'ordine: **l'utente** sospende «Acasystem (servizio)» in HA (sezione 5, riga 10); l'agente verifica «servizio non attivo» e che il resto di Acasystem funzioni; **l'utente** la riattiva; l'agente verifica che la funzione torni. Regressione per account (P18). Registrazione delle fixture CT-01…CT-11 e CT-14, anonimizzate | Punti 1-6 e 10 del criterio di conclusione | Sonnet, con l'utente |
| **D1p** | Persistenza: riavvio del container `tunet`; riavvio della VM; ciclo di standby del TV; ricarica e riavvio del browser del tablet. Il riavvio del PC è facoltativo e lo fa l'utente, perché interrompe la sessione | Punto 7 del criterio di conclusione | Sonnet |
| **D1z** | Chiusura: `verification.md`, `infrastructure.md`, `project-status.md`, questo report; revisione del diff | Documenti aggiornati; diff limitato a D1 | Haiku |

### Scelte esecutive che l'agente può fare da solo

L'agente decide da solo, entro il perimetro:

- nomi di file, moduli, rotte, tabelle e messaggi;
- struttura dell'adattatore HA;
- valori di tempo (scadenza dei flussi, attese, limiti di frequenza), entro gli ordini di grandezza del piano;
- forma del trigger della ricetta, scelta in base alla sonda RD-08;
- per l'identità di servizio, token a lunga durata oppure token di rinnovo, secondo `permessi-cliente.md` §6.2;
- posizione del file del segreto;
- modo di presentare il percorso a schermo intero (ADR-0016);
- testi italiani del dizionario;
- ordine dei test, con carico limitato: niente esecuzioni pesanti a VM accesa (memoria «Long runs vs PC sleep»);
- uso degli snapshot della VM;
- correzioni dei documenti in base ai fatti misurati;
- scelta tra NAT temporanea e ponte per dare Internet al primo avvio. Preferita la NAT, come nel piano §6.1.

### Punti di stop: l'agente si ferma e chiede

- Serve una credenziale che l'utente non ha digitato di persona.
- Serve modificare il router o un dispositivo diverso dal TV `.26`.
- HAOS 18.3 non accetta il Core 2026.9.4 (se D-D23 lo chiede).
- La VM non parte, o non regge il carico, con l'hypervisor di Windows attivo per WSL2 e Docker Desktop (P17): cambiare la configurazione di Windows è fuori perimetro.
- Un passo richiederebbe all'agente di digitare, leggere o ricevere una password (proprietario, cliente di prova) o il token di servizio.
- La limitazione dell'ascolto (D-I8) rompe il Supervisor o le app.
- Il container non raggiunge la VM sull'Host-Only, quindi bisognerebbe cambiare la rete del banco.
- Il Wake on LAN dalla VM non arriva al TV, anche dopo le verifiche sul TV.
- Una funzione della 0.9.27 regredisce.
- Un documento condiviso cambia mentre lo si modifica.
- Una scelta richiede di uscire dalla lista chiusa, o di toccare il nucleo di HA con l'identità di servizio.

### Verifiche

| Tipo | Che cosa |
|---|---|
| Automatiche | Test del backend con un finto HA: facciata, identità, chiusura in caso di errore («fail-closed»), appartenenza, registro senza segreti, ricetta, riavvio a metà. Test di componenti del frontend: ingressi, motore, schermate, stato vuoto, «Riprendi». Test di contratto CT-01…CT-11 e CT-14 sulle fixture registrate in D1g. Suite esistenti del backend e del frontend, con parallelismo limitato. Controllo dei tipi strict della parte migrata. Build dell'immagine. Comandi ed esiti in `verification.md` |
| Prova reale sul TV, con una persona presente | Abbinamento accettato sul TV; accensione da spento 3 volte su 3, con tempo misurato; Netflix 3 volte su 3; spegnimento; stato del widget che segue il TV |
| Lenovo Tab M11 | Percorso dal «Collega» e da «Aggiungi un widget», a 1280×665, con gesti sintetici via CDP **dopo l'accesso fatto dall'utente**; numero di tocchi e tempi; tastiera che non copre i campi; nessun blocco lungo del thread principale all'apertura del percorso (riferimento: ISSUE-109/110/112); sessione del cliente di prova non amministratore |
| Regressione per account | Per ogni funzione dell'elenco P18: esito con il cliente non amministratore (atteso: nascosta o negata con messaggio chiaro, nessun errore muto) e con un account amministratore (atteso: invariata). Se una funzione serve al cliente, si registra come proposta per la facciata e **non** si sposta in D1 |
| Riavvio e persistenza | D1p, nell'ordine indicato. Si controllano: collegamento, voce `loaded`, automazione attiva, bit 128, accensione, Netflix, identità di servizio, tabella dei flussi vuota |
| Assenza di dispositivi | Prima dell'aggiunta, con HA senza `media_player`: i fogli «Collega» e «Aggiungi un widget» del TV mostrano lo stato vuoto e l'ingresso, senza elementi finti |
| Errori e dispositivo offline | - Indirizzo sbagliato: `cannot_connect`, con messaggio in italiano.<br>- OK non premuto: `error_pairing` e «Riprova».<br>- TV staccato dalla corrente: stato non disponibile o spento; l'accensione mostra un messaggio chiaro dopo il tempo massimo.<br>- VM spenta: Acasystem dice che HA non è raggiungibile; la facciata risponde 503 in italiano.<br>- Identità di servizio sospesa: «servizio non attivo».<br>- Chiamata diretta del cliente a un'operazione fuori lista: 403.<br>- Due tentativi sullo stesso TV: messaggio di flusso già in corso |
| Nessun dato finto | Nel bundle di produzione e nell'immagine: 0 occorrenze dei valori di prova dei test. L'interfaccia mostra solo dati restituiti da HA, senza catalogo né dispositivi di esempio |
| Nessun segreto | Si cercano il MAC reale, il token di servizio (attraverso la sua impronta, senza stamparlo) e le password di prova in `docker logs tunet`, `tunet.db`, registro, console del browser del tablet (CDP) e copie in `backup/`. Esito atteso: 0 occorrenze. L'IP del TV compare solo dove previsto |
| Nessuna scansione propria | Nessun codice di Acasystem invia pacchetti sulla LAN o legge la tabella ARP: revisione del diff e test |

### Criterio di conclusione misurabile

D1 è concluso quando **tutti** i punti seguenti sono veri e registrati in `verification.md`, con data, ora, comando o procedura ed esito.

1. **Aggiunta.** Sul Tab M11, con l'utente HA non amministratore, il TV `.26` viene aggiunto, abbinato e collegato al widget da **entrambi** gli ingressi, il foglio «Collega» e «Aggiungi un widget», ciascuno almeno una volta (tra le due prove la voce si rimuove ripristinando lo snapshot della VM, oppure la seconda prova verifica il messaggio «già configurato» e il collegamento del TV esistente).
   - Dall'accettazione sul TV alla comparsa nel foglio passano al massimo 30 s.
   - Per questo percorso non si apre l'interfaccia di HA: si controllano le richieste del tablet via CDP, che non devono contenere pagine del frontend di HA.
2. **Stato.** Lo stato del widget segue il TV, acceso e spento, entro 10 s, in 3 prove su 3.
3. **Accensione.** Da spento, il TV si accende dal widget in 3 prove su 3; il widget mostra il TV acceso entro **30 s** dal tocco (soglia [valutazione], tempi registrati prova per prova).
4. **Netflix.** Netflix si apre dal widget in 3 prove su 3.
5. **Registro.** Contiene le voci attese (aggiunta, nome e stanza, accensione, identità attivata) e 0 segreti.
6. **Casi negativi.** Tutti i casi delle righe «Errori e dispositivo offline» e «Assenza di dispositivi» danno l'esito previsto.
7. **Dopo D1p:**
   - il widget è ancora collegato;
   - la voce `webostv` è `loaded`;
   - l'automazione è attiva e il bit 128 è presente;
   - accensione e Netflix riescono 1 volta su 1 per ogni riavvio;
   - l'identità di servizio è valida;
   - la tabella dei flussi è vuota;
   - un nuovo tentativo di aggiunta **non** finisce in `already_in_progress`.
8. **Codice.** Le verifiche automatiche passano, la build riesce e il diff resta nel perimetro.
9. **Documenti.** Sono aggiornati e riportano, con la data, i passi eseguiti nell'interfaccia di HA: solo quelli delle righe 1, 3, 5 e 10 della sezione 5 (la riga 10 come sospensione e riattivazione dell'identità di servizio, a cura dell'utente, in D1g).
10. **Account.** La regressione per account (P18) è registrata: ogni funzione riservata agli amministratori risulta nascosta o negata con messaggio chiaro per il cliente e invariata per l'amministratore.

Se un punto non è raggiunto, D1 si chiude come **non concluso** e se ne registra la causa.

### Ritorno indietro

- **Codice:** copia PRIMA (D1-0) oppure commit dell'utente.
- **Volume di Acasystem:** copia a freddo.
- **VM:** snapshot presi prima di ogni passo che la modifica.
- **Ritorno completo:** come in §6.1 I6. Si spegne la VM, si ripristina `compose.tunet.yaml`, si esegue `docker start homeassistant` e si controlla che `/ha/auth/providers` risponda 200 e **non** `onboarding_required`: questa risposta indicherebbe la perdita di `/config` (come nell'incidente del 2026-10-08/09), cioè un ritorno indietro fallito. Si cronometra una volta, subito dopo V1, con l'obiettivo di stare sotto i 10 minuti.
- **Identità di servizio:** la sospende o la elimina l'utente in HA.
- **Voci create in HA:** si ripristina lo snapshot della VM.

### Modelli

Vale la regola «piano con Opus, realizzazione con Sonnet/Haiku» (memoria «Model choice vs credit»):

- **Sonnet:** codice, prove e banco;
- **Haiku:** documenti T0b e D1z;
- **Opus:** solo se serve rivedere il piano.

### Che cosa NON è D1

D1 non è il completamento del prodotto. Non comprende:

- la prova di installazione pulita e ripetibile (I-P);
- la scoperta automatica reale (D4): l'aggiunta per IP non la sostituisce;
- la ricerca tra le integrazioni (D3);
- il motore completo (D2);
- la rimozione (D6);
- «Accendi + app» (D9);
- i login esterni (D8);
- Matter e le radio;
- il filtro del tunnel (D-D16);
- l'installazione dei clienti (D-C1) e il Dell;
- la persistenza completa con blackout (A7).

## Decisioni ancora necessarie per iniziare D1 (2026-10-23)

Qui ci sono solo le decisioni **bloccanti** non ancora prese. Per ognuna è indicata l'opzione consigliata dall'agente: è una valutazione, non una decisione. Si può rispondere «sì, come consigliato» oppure scegliere un'altra opzione.

**D-D22. Come può il cliente aggiungere e configurare dispositivi senza diventare amministratore** ([ADR-0022](../decisions/ADR-0022-identita-di-servizio-dispositivi.md), stato «Proposta»).

**(a) Meccanismo**

- **a1, consigliata. Identità di servizio dichiarata.** Un utente di HA «Acasystem (servizio)» viene creato dall'installatore con un passo esplicito: in D1 un comando sul server, in seguito una schermata del primo avvio. La credenziale resta solo nel server e la usa solo la facciata, per la lista chiusa.
  - D1 può partire.
  - Il server custodisce un segreto da amministratore, revocabile sospendendo l'utente in HA.
  - Serve un tablet con un utente non amministratore.
  - **Conseguenza su funzioni già esistenti:** con il tablet non amministratore, le funzioni di Acasystem oggi riservate a `is_admin`/`is_owner` (in Sistema la posizione della casa e le sezioni condizionate al ruolo; la scrittura del piano della Casa 3D) spariscono o rispondono 403 sul tablet del cliente e restano all'installatore. D1 lo verifica (P18, «Regressione per account») e non le sposta nella facciata; spostarle sarebbe un ampliamento da autorizzare a parte.
- **a2. App HAOS con il token del Supervisor.**
  - Impossibile sul banco D1, perché Acasystem gira fuori dalla VM, e non è mai stata provata.
  - Introdurrebbe un privilegio senza un utente visibile.
- **a3. Solo sessione dell'installatore.** Il cliente non aggiunge nulla: D-D1 va riaperta.
- **a4. Solo approvazione di un amministratore.** Non regge l'abbinamento di 10 s: D-D1 va riaperta.

**(b) Che cosa può avviare il cliente**

- **b1, consigliata.** Il catalogo è visibile e ricercabile su tutte le integrazioni. Il cliente avvia solo i gestori di una lista del server: in D1 `webostv` e `wake_on_lan`, poi i tipi `device` e `hub` locali non esclusi. Per il resto compare «richiede l'installatore».
  - La sicurezza dipende dalla lista.
  - La lista si allarga in D3.
  - **Conseguenza sulle risposte già date:** b1 **precisa** D-D1 («Anche il cliente») e D-D3 («Tutte con ricerca»). Con b1, D-D1 e D-D3 valgono per la visibilità e la ricerca di tutte le integrazioni e per l'avvio dei soli gestori in lista; le altre integrazioni richiedono l'installatore. Scegliendo b1 si accetta questa precisazione in modo esplicito.
- **b2. Qualunque integrazione con flusso.**
  - Ogni tablet equivale a un amministratore pieno.
  - Prima di D3 servirebbero lo studio delle integrazioni pericolose e D-D16.

**(d) REQ-06/AC-06**

- **Sì, consigliata.** Si approva l'integrazione proposta: il cliente non ha privilegi propri; il server ha un'identità amministrativa dichiarata, limitata e revocabile. T0b la annota in `product.md`.
- **No.** D1 contraddirebbe un requisito approvato e non può partire.

La parte (c) di `permessi-cliente.md`, cioè la rimozione da parte del cliente, **non** blocca D1: la rimozione è in D6.

**D-D23. Da dove nasce l'HA della VM per D1**

- **(a), consigliata. HA nuovo.** L'utente crea il proprietario una volta, dalla pagina di benvenuto raggiunta dal PC sull'Host-Only, con Internet dalla NAT temporanea. Versione del Core, da indicare con la risposta:
  - **(a-9.4), consigliata:** il Core viene riportato a 2026.9.4. D-I5 rispondeva alla «Versione di HA dopo il ripristino» (migrazione); applicarla a un HA nuovo è un'**estensione** di D-I5 [valutazione], coincide con N-4 per questa sola VM. Il ritorno indietro del Core da 2026.10.x a 2026.9.4 su HAOS 18.3 è [non verificato]; se fallisce è un punto di stop.
  - **(a-10.x):** D1 sulla 2026.10.x installata dal Supervisor. Si usano i confronti già fatti nella sezione 3 (nessuna differenza nei flussi, catalogo, registri e automazioni; differenze su accesso e gestione utenti, che toccano D1s) e le fixture si registrano su quella versione. «Versione supportata» e CT vanno aggiornati in `verification.md`.
  - Non serve la chiave di backup.
  - Il banco riparte da zero in HA: utenti nuovi e accesso da rifare sul tablet. I widget legati a entità del vecchio HA possono diventare «Da collegare» [non verificato in che misura].
  - L'onboarding crea da solo quattro integrazioni che usano Internet (`google_translate`, `met`, `radio_browser`, `shopping_list`). In D1 restano; se tenerle si decide in I-P (N-2).
  - È un passo dichiarato nell'interfaccia di HA.
  - **Non** prova il criterio 1.
- **(b) Migrazione del banco Docker con il backup** (passi I0-I3 del piano).
  - Servono il backup, la chiave dell'utente e Internet.
  - Il Core resta 2026.9.4 senza aggiornamenti espliciti.
  - Utenti ed entità si conservano.
  - Dopo il ripristino su HAOS la porta può essere 8123 o 80 [non verificato].
  - Non prova il criterio 1.
- **(c) HA nuovo, con l'onboarding fatto da uno script via API.**
  - Anticipa parte di I-P, ma allunga D1.
  - Le credenziali vanno comunque digitate dall'utente.
  - Non prova la ripetibilità.

**Da fissare prima della prova reale D1g** (non bloccano l'avvio di D1):

- **D-D20:** chi sta davanti al TV, con data e ora.
- **D-D21 e D-I4:** IP fisso del TV `.26` prima di D1g, e chi fa la prenotazione sul router. Senza IP fisso, un cambio di indirizzo dopo un riavvio del TV fa fallire il punto 7 del criterio di conclusione («Cambia indirizzo» è in D5).
- **Conferma che il codice è libero (P1)** ed eventuale autorizzazione ai commit.

**Domande aperte che non bloccano D1** (restano dove sono, non sono riproposte):

- D-D4 e D-D8.
- D-D10: in D1 si usa una scelta rivedibile, con nome proposto e stanza con «Salta».
- D-D11 e D-D12.
- D-D14: in D1 il registro resta solo sul server.
- D-D15, D-D16, D-D17 e D-D18.
- D-D22 (c).
- La scelta (a)/(b) di D-D13 su ADR-0015.
- D-I6 e D-I7.
- D-C1…D-C15 di REP-20261023-004.
- N-1…N-4, da decidere prima di I-P:
  - N-1: chi esegue l'onboarding nell'installazione pulita (script dell'installatore, schermata di primo avvio di Acasystem o interfaccia di HA);
  - N-2: tenere o rimuovere le quattro integrazioni che usano Internet create dall'onboarding;
  - N-3: posizione, fuso, unità, valuta e paese scritti nell'onboarding (la posizione è un dato personale del cliente);
  - N-4: Core fissato o stabile corrente nell'installazione pulita (per la sola VM di D1 la scelta è dentro D-D23 a).

Altre domande cambiano stato [valutazione]:

- **D-D9 è superata da D-D2:** con gli ingressi solo nei fogli dei widget si parte sempre da un widget.
- **D-D19 si considera risolta** dall'autorizzazione già data, che nomina il TV `192.168.1.26`.

### Verifiche, diff e punto di ripresa di questo aggiornamento

| Controllo | Procedura | Esito |
|---|---|---|
| Attesa del flusso concorrente su REP-20261023-004 | Lettura del suo registro: risultato di «confronto:revisione» presente; file fermo dalle 11:59 | Eseguito alle 12:10; nessuna attesa necessaria |
| Fonti interne | Questo report, REP-20261023-004, ADR-0021, indici, `product.md` (REQ e AC), `project-status.md` (ricerca), i quattro appunti in `backup/allineamento-d1/` | Eseguito, sola lettura |
| Ricontrollo del codice di HA | `curl` di `components/http/{config,server,websocket_api,const}.py` al tag 2026.9.4 (HTTP 200) e ricerca delle righe sulla porta e sui comandi `http/config*` | Eseguito: porta 80 con il Supervisor e comandi `http/config*` riservati agli amministratori, confermati |
| Modifiche concorrenti | Impronta SHA-256 e data di modifica di questo report e di REP-20261023-004 subito prima della scrittura; indici riletti subito prima | Nessuna modifica concorrente rilevata |
| `progetto/`, VM, rete, Docker, HA, dispositivi, credenziali, commit | — | **Non eseguiti** |
| Attività di altri in `progetto/` | Elenco in sola lettura dei file modificati dopo le 11:59 (`find -newer`) | Alle 12:20-12:21 un altro flusso ha scritto `frontend/src/pages/system/AiDevelopmentNotice.tsx`, `aiDevelopmentNotice.css` e `frontend/.ai-notice-preview.html`. Il codice è quindi in uso, oltre alla 0.9.27 in pausa: rafforza il prerequisito P1 |

**File modificati da questo aggiornamento:**

- questo report (nuove sezioni e annotazione nel campo «Stato»);
- REP-20261023-004 (sezione nuova e due annotazioni);
- `decisions/ADR-0022-identita-di-servizio-dispositivi.md` (nuovo, «Proposta»);
- una riga nuova in `decisions/README.md`;
- in `reports/README.md`, una frase aggiunta in fondo alle righe di REP-20261023-003 e REP-20261023-004.

**Righe da aggiungere a `project-status.md`.** Non sono state aggiunte qui perché il file è modificato da altri flussi.

1. Allineamento D1 consegnato il 2026-10-23:
   - piano operativo aggiornato;
   - permessi del cliente;
   - incarico D1 pronto da autorizzare;
   - decisioni bloccanti D-D22 e D-D23;
   - conclusione di REP-20261023-004.
2. ADR-0022 «Proposta», in attesa di D-D22.
3. Fatto nuovo: su HAOS HA ascolta di serie sulla porta 80. D-I8 si applica con gli indirizzi di ascolto, non con `server_host` in YAML.
4. Ritirata la proposta «scoperta di rete fatta da Acasystem stesso», per il vincolo dell'utente.
5. Tappe nuove: I-P (installazione pulita e ripetibile) e D9 («Accendi + app»).

**Punto di ripresa:**

1. risposte a D-D22 e D-D23;
2. conferma che il codice è libero;
3. autorizzazione dell'incarico D1;
4. prima di D1g: D-D20, D-D21 e D-I4.

### Revisione del 2026-10-23 dopo la critica (Claude Code, Opus 5.5, `claude-opus-5-5`)

Undici rilievi di revisione sulle sezioni nuove di questo report, su REP-20261023-004 e sulla bozza ADR-0022. Prima di ogni scrittura è stata ricontrollata l'impronta SHA-256 di ciascun file (12:31 e 12:33): nessuna modifica concorrente. Le sezioni chiuse (1-10, «Risposte dell'utente», «Rettifiche») non sono state toccate.

| Rilievo | Esito | Dove |
|---|---|---|
| Riga 10 (sospensione dell'identità) mancante dal punto 9 del criterio | **Applicato**: punto 9 con la riga 10; D1g con l'ordine «l'utente sospende, l'agente verifica, l'utente riattiva» | Sezione 5 riga 10; D1g; criterio 9 |
| Credenziali nel contesto dell'agente | **Applicato**: D1s lanciato dall'utente nel proprio terminale; accesso al tablet fatto dall'utente di persona, CDP solo dopo; nuovo punto di stop | Sezione 5 riga 4; V1; D1s; D1g; Verifiche; Punti di stop; ADR-0022 punto 3 |
| Funzioni esistenti riservate agli amministratori | **Applicato** (verificato nel codice: `SystemPage.tsx` riga 63, `LocationSection.tsx`, `ConnectionSection.tsx`): P18, elenco in D1-0, verifica «Regressione per account», criterio 10, conseguenza in D-D22 a1 e in ADR-0022 | Prerequisiti; Verifiche; criterio; decisioni; ADR-0022 |
| Installazione dell'app su HAOS assente dalla sezione 5 | **Applicato**: riga 15 e passo (d2) del criterio 1 | Sezioni 4 e 5 |
| VirtualBox con l'hypervisor di Windows | **Applicato**: P17 e punto di stop | Prerequisiti; Punti di stop; V1 |
| b1 restringe D-D1 e D-D3 | **Applicato**: conseguenza esplicita in b1 e in ADR-0022 punto 5 | Decisioni; ADR-0022 |
| Allineamento documentale rinviato a T0b | **Applicato in parte**: aggiunto il paragrafo in `project-status.md` (file riletto e invariato subito prima); annotazione su ADR-0009 (porta 80, mezzo di D-I8); T0b ridotto alle annotazioni che dipendono da D-D22. **Non applicato** alle correzioni di `api-ha.md` e `api-pubbliche-interne.md`: sono appunti in `backup/`, esclusi da Git e scritti da altri flussi; le correzioni sono registrate nella tabella 1 di questo aggiornamento, che prevale | `project-status.md`; ADR-0009; T0b |
| D-D23 (a) estende D-I5 senza dirlo | **Applicato**: (a-9.4) dichiarata estensione di D-I5 [valutazione], ritorno indietro del Core [non verificato]; offerta l'opzione (a-10.x); P5, V1, sezione 3 e N-4 resi coerenti | Decisioni; Prerequisiti; V1; sezione 3 |
| Un solo ingresso nel criterio 1; nessuna soglia nel 3 | **Applicato**: entrambi gli ingressi almeno una volta; soglia 30 s [valutazione] | Criterio 1 e 3; D1g |
| Classe «DOC-nome» non definita | **Applicato**: definita nella legenda, trattata come INT | Sezione 3 |
| Esito atteso del ritorno indietro; «Nessuna.» in REP-004 | **Applicato**: atteso 200 e **non** `onboarding_required`; in REP-004 «Nessuna.» conservato con la nota «vale fino al 2026-10-23» | Ritorno indietro; REP-004 |

Le «Righe da aggiungere a `project-status.md`» elencate sopra sono state aggiunte in questa revisione, come paragrafo datato in cima al file. Nessuna modifica a `progetto/`, VM, rete, Docker, HA o dispositivi; nessuna credenziale; nessun commit.

## Decisioni D-D22 e D-D23 e avvio di D1 (2026-10-23)

Registrazione della tappa T0b (Claude Code, Sonnet 5.5, `claude-sonnet-5-5`). Le citazioni sono testuali, dall'incarico ricevuto dall'agente; la colonna «Effetto» è una lettura dell'agente [valutazione] e non amplia le risposte. Questa sezione non modifica le sezioni chiuse sopra.

### Fonti umane

| Decisione | Risposta dell'utente (2026-10-23) | Effetto sul piano [valutazione] |
|---|---|---|
| **D-D22** (a) e (b), (d) | «Identità di servizio (consigl.)». Testo dell'opzione: «Un utente di HA dichiarato «Acasystem (servizio)» che crei tu con un comando nel tuo terminale (digiti tu le credenziali del proprietario, io non le vedo). Il server lo usa solo per un elenco chiuso di operazioni, con registro; si revoca sospendendolo. Il cliente avvia solo le integrazioni in elenco (in D1: TV LG e accensione via rete), le altre dicono «Richiede l'installatore». Il tablet usa un account non amministratore.» | **a1** (identità di servizio dichiarata) **+ b1** (catalogo visibile e ricercabile; avvio dei soli gestori in lista: in D1 `webostv` e `wake_on_lan`) **+ d = sì** (annotazione su REQ-06/AC-06). La precisazione di D-D1 e D-D3 prodotta da b1 è accettata in modo esplicito. Il tablet del cliente usa un utente non amministratore. La parte (c), rimozione da parte del cliente, non è decisa: resta in D6 e non blocca D1 |
| **D-D23** | «HA nuovo (consigliata)» | Opzione **(a)**, nella variante consigliata **(a-9.4)**: HA nuovo nella VM; proprietario e cliente di prova creati dall'utente nella pagina di benvenuto, raggiunta dal PC sull'Host-Only, con Internet dalla NAT temporanea; Core riportato a 2026.9.4. Estende D-I5 a un HA nuovo [valutazione]. Il ritorno indietro del Core da 2026.10.x a 2026.9.4 su HAOS 18.3 resta [non verificato]: se fallisce è un punto di stop dell'incarico D1 |
| **Autorizzazione di D1** | «prosegui con la cosa di avere la virtual machine con app installata così nel mentre uso l'app posso vedere se si accende il televisore» (insieme alle due risposte sopra) | D1 è autorizzato secondo la sezione «Incarico D1 pronto da autorizzare». Il motivo dichiarato è vedere il televisore accendersi mentre l'utente usa l'app |
| **D-C1** | Registrata in [REP-20261023-004](REP-20261023-004-confronto-installazione.md), sezione «Decisione dell'utente su D-C1 (2026-10-23)»: HAOS con Acasystem come app per i clienti | Non cambia D1, che usa la VM HAOS con Acasystem in Docker Desktop; vale per i clienti (A1-A8, I-P) |

### Che cosa fa questo passo e che cosa no

- **Fatto qui (solo documenti):** questa sezione; [ADR-0022](../decisions/ADR-0022-identita-di-servizio-dispositivi.md) portata ad «Accettata»; nuovo requisito **REQ-18** con **AC-18** e annotazione datata su REQ-06/AC-06 in `product.md`; voci C-16 e C-17 in `compliance.md`; riga in `project-status.md`; indici aggiornati.
- **Parte server di D1, in corso in un passo parallelo** (non documentata qui): facciata `/api/dispositivi` nel backend, identità di servizio, lista chiusa, registro, comando di creazione dell'identità. Si prova solo con un HA finto nei test. Il comando di creazione lo lancia l'utente nel proprio terminale: nessun agente legge, digita o riceve le credenziali del proprietario né il token di servizio.
- **Dopo la 0.9.28** (che sta modificando il frontend): parte dell'app (fogli «Collega» e «Aggiungi un widget»), VM HAOS con HA nuovo, prova reale sul televisore `192.168.1.26`.
- **Non eseguito in questo passo:** commit, VM, tablet, TV, rete, chiamate a un HA reale, credenziali.

### Numero del requisito nuovo

`product.md` contiene REQ-00…REQ-17. [REP-20261021-001](REP-20261021-001-hub-bridge-piano.md) (riga 50) *propone* «nuovi REQ dal REQ-18» per hub e bridge, ma non ne ha creato alcuno: nessun REQ-18 esiste in `product.md`, in `project-status.md` né in altri report che lo definiscano. Il primo numero libero è quindi **REQ-18** (verificato con ricerca testuale in `documentazione/` il 2026-10-23). Lo assegna questo requisito, in coerenza con la regola di T0b («prossimo numero libero al momento»); la riserva di REP-20261021-001 slitta di conseguenza al REQ-19 e successivi, con una nota incrociata datata in quel report. Nessun ID ritirato è riusato.

### Conseguenze sul piano

1. **T0b è eseguita** per ciò che dipende da D-D22: requisito, annotazione su REQ-06/AC-06, conformità, indici. Le annotazioni su ADR-0009 e la porta 80 erano già state fatte nella revisione del 2026-10-23.
2. **D1s** (attivazione dell'identità di servizio) è un comando scritto dall'agente e lanciato dall'utente nel proprio terminale. Le credenziali del proprietario non passano da agenti, log, risposte o file.
3. **Funzioni oggi riservate a `is_admin`/`is_owner`** (posizione della casa in Sistema, sezioni condizionate al ruolo, scrittura del piano della Casa 3D): con il tablet non amministratore spariscono o rispondono 403 al cliente e restano all'installatore. D1 lo verifica («Regressione per account», P18); spostarle nella facciata richiede un'autorizzazione separata.
4. **Il tunnel `/ha`** (D-D16) non blocca D1 se il tablet usa un utente non amministratore; resta aperta la decisione sul filtro prima dei clienti.
5. **Debito dichiarato su AC-06:** D1 non soddisfa il passaggio «sessione aperta limitata al primo setup» di AC-06 [valutazione]; vedi l'annotazione in `product.md`.

### Ancora aperto

- **Prima della prova reale D1g:** D-D20 (chi sta davanti al TV, data e ora), D-D21 e D-I4 (IP fisso del TV `.26` e chi fa la prenotazione sul router), conferma che il codice è libero (P1: la 0.9.28 sta modificando il frontend).
- **Non bloccanti:** D-D22 (c), D-D4, D-D8, D-D10…D-D12, D-D14…D-D18, la scelta (a)/(b) di D-D13 su ADR-0015, N-1…N-4, D-C2 e D-C4…D-C15.
- **Questioni irrisolte di ADR-0022:** elenco di esclusione dei gestori oltre D1, chi custodisce la password del proprietario (D-C5), visibilità del registro (D-D14).

### Verifiche e file di questa sezione

| Controllo | Esito |
|---|---|
| Copie PRIMA delle modifiche in `backup/d1/pre/t0b/` (esclusa da Git) | Eseguito; confronto byte a byte con gli originali prima della scrittura |
| Numero REQ libero | Ricerca testuale di «REQ-18» in `documentazione/`: solo REP-20261021-001 (proposta) e REP-20261023-003 (T0b, piano); nessuna definizione |
| Controlli applicativi, VM, rete, HA, dispositivi, credenziali, commit | **Non eseguiti** (solo documenti) |

File modificati: questo report; `decisions/ADR-0022-identita-di-servizio-dispositivi.md`; `decisions/README.md`; `funzionalita/product.md`; `compliance.md`; `project-status.md`; `reports/README.md`; `reports/REP-20261021-001-hub-bridge-piano.md` (solo la nota incrociata datata). Nessun commit.


## V1 — macchina virtuale avviata e proprietario creato (2026-10-23, 17:05-17:32)

**Autorizzazione:** decisioni D-D22 («Identità di servizio») e D-D23 («HA nuovo») dell'utente e richiesta «prosegui con la cosa di avere la virtual machine con app installata»; l'utente ha chiesto di farlo prima delle 18.

- **Avvio:** snapshot «prima-del-primo-avvio», poi scheda 3 NAT temporanea per Internet. Al primo avvio la VM si è fermata nel firmware EFI: VirtualBox gira sopra l'hypervisor di Windows (modalità NEM, «VT-x is not available», perché Docker Desktop/WSL2 lo usano). Avvio riuscito con `--graphicscontroller vmsvga --paravirtprovider hyperv` (prerequisito P17 confermato: funziona, ma lento).
- **Memoria:** 3072 MB invece di 4096 (D-I2), scelta temporanea dell'agente perché il PC aveva 3,2 GB liberi con i test della 0.9.28 in corso; da riportare a 4096 a VM spenta.
- **Rete:** Host-Only 192.168.56.101 (DHCP di VirtualBox, IP fisso ancora da impostare, D-I3), NAT 10.0.4.15; scheda a ponte ancora scollegata.
- **Versioni [verificato con `ha core info` dalla console]:** HAOS 18.3, Core 2026.10.2 installato dal Supervisor, `port: 80`, `ssl: false`, `watchdog: true`. Il ritorno a 2026.9.4 previsto da D-D23 non è ancora fatto.
- **Onboarding:** il proprietario l'ha creato l'utente dalla pagina di benvenuto (http://192.168.56.101:8123); nessuna credenziale vista dall'agente. L'utente «cliente» non amministratore non è ancora creato.
- **Chiusura:** spegnimento ACPI, snapshot «dopo-onboarding». VM spenta per lasciare memoria a verifiche e misure della 0.9.28.
- **Ripresa (lunedì):** RAM 4096, Core 2026.9.4, utente «cliente», IP fisso Host-Only, scheda a ponte dopo D-I8, identità di servizio (D1s) quando il codice del server di D1 è unito.

## Parte server di D1 (D1a, D1s, D1b): realizzata in una copia di lavoro (2026-10-23)

| Campo | Valore |
|---|---|
| Richiesta | Passo del flusso di D1 assegnato dall'agente principale (non digitato dall'utente): parte server e documenti di D1a, D1s e D1b, in parallelo alla 0.9.28 che modifica il frontend. L'autorizzazione di D1 viene dalle risposte dell'utente del 2026-10-23, citate sopra («Decisioni D-D22 e D-D23 e avvio di D1»): D-D22 = «Identità di servizio (consigl.)», D-D23 = «HA nuovo (consigliata)», e «prosegui con la cosa di avere la virtual machine con app installata così nel mentre uso l'app posso vedere se si accende il televisore». D-C1 (HAOS con Acasystem come app per i clienti) in [REP-20261023-004](REP-20261023-004-confronto-installazione.md) |
| Autore | Claude Code (Sonnet 5.5, `claude-sonnet-5-5`) |
| Perimetro | Solo backend e documenti. Nessun commit; nessun file di `progetto/` toccato; nessun frontend, compose, `.env` o Docker; nessuna VM, rete, tablet, TV o HA reale (solo un HA finto nei test); nessuna credenziale letta, digitata o ricevuta; nessuna scansione di rete |
| Dove sta il codice | **Non in `progetto/acasystem`.** Il codice è stato scritto e provato in `backup/d1/sandbox/acasystem` (copia di `progetto/acasystem` del 2026-10-23 senza `node_modules`, `dist` e dati, con giunzioni verso i `node_modules` dell'originale), perché la 0.9.28 esegue i test completi e costruisce il banco dall'albero di progetto. Da applicare dopo la costruzione del banco 0.9.28 |
| Patch | `backup/d1/patch/d1-server.diff` (41 file: 37 nuovi, 4 modificati), con gli elenchi `files-new.txt` e `files-modified.txt`. Modificati: `backend/package.json` (script `device-service`), `src/middlewares/rateLimit.ts`, `src/models/database.ts` (tre tabelle), `src/server.ts` (montaggio e avvio). Istantanea di partenza in `backup/d1/pre/d1-server/`. `git apply --check -p1` riuscito su una copia dell'albero vivo, e l'albero risultante è identico alla copia di lavoro [verificato: confronto con `diff -r`]. Il backend vivo non è cambiato tra l'istantanea e la verifica [verificato: confronto file per file] |
| Etichette | Come nelle sezioni precedenti: [realizzato] esiste nella copia di lavoro; [verificato] con il mezzo indicato; [non verificato]; [valutazione] giudizio dell'agente |

### Che cosa fa il codice

**Facciata `/api/dispositivi`** (ADR-0021, ADR-0022), montata dopo l'autenticazione HA di oggi. L'identità di servizio è un file con il token a lunga durata dell'utente «Acasystem (servizio)»; senza file valido ogni funzione risponde 503 «Servizio non attivo», senza ripiego sul token dell'utente.

| Rotta | Che cosa fa | Chi |
|---|---|---|
| `GET /stato` | stato del servizio, di HA (raggiungibile, configurato, versione solo all'installatore), delle funzioni e dei gestori avviabili | ogni utente |
| `GET /catalogo?q=&limit=` | tutte le integrazioni con un flusso, con ricerca; solo `webostv` e `wake_on_lan` sono avviabili; ripiego sui gestori dei flussi se manca l'indice completo (RD-04) | ogni utente |
| `GET`/`POST /flussi`, `GET`/`POST`/`DELETE /flussi/:id` | elenco dei propri flussi aperti; avvio; ripresa; passo (la chiamata resta aperta fino a 90 s per l'abbinamento); annullamento | ogni utente, solo i propri flussi |
| `GET /voci/:entryId` | voce, dispositivo, entità e frase in italiano se non è `loaded` | ogni utente, solo le voci dell'elenco |
| `PATCH /dispositivi/:id`, `GET`/`POST /stanze` | nome e stanza tramite i registri di HA | ogni utente, solo i dispositivi delle voci dell'elenco |
| `GET`/`POST /accensione/:entryId` | stato e creazione della ricetta di accensione | ogni utente; MAC e indirizzo di broadcast solo l'installatore |
| `DELETE /accensione/:entryId`, `GET /registro` | rimozione della ricetta; registro delle azioni | solo amministratori di HA (l'installatore) |

Il resto è negato per difetto: un percorso diverso risponde 404, un gestore fuori elenco 403 «Richiede l'installatore.» senza alcuna chiamata a HA, il flusso di un altro utente 403, un flusso sconosciuto 404.

**Flussi.** Avvio, passi e annullamento passano da HA con l'identità di servizio. I flussi aperti stanno nella tabella `device_flows` di `tunet.db` (utente, gestore, passo, scadenza; nessun valore dei campi); scadono dopo 10 minuti di inattività e vengono annullati in HA dal ciclo di pulizia (30 s) e all'avvio del backend. Se HA non risponde in quel momento la riga resta «in annullamento» e si riprova. Il corpo inviato a HA si ricostruisce da regole chiuse per gestore e passo (`webostv`: `host`; `wake_on_lan`: `mac`, `broadcast_address`, `broadcast_port`): chiave sconosciuta, indirizzo di loopback o con schema, MAC non valido sono rifiutati con 400; un passo senza regole, un campo o un tipo di risultato che non sa disegnare (per esempio `external`) annulla il flusso con 422 (RD-10). Un secondo tocco sullo stesso passo dà 409, un secondo flusso dello stesso gestore 409 con l'id di quello aperto, oltre 3 flussi per utente 429.

**Registro.** `device_actions`: persona (id e nome dell'utente HA), azione, dominio, `entry_id`, esito, codice e ora. Ogni campo è tagliato su un modello rigido, quindi un indirizzo, un MAC o testo libero non possono entrare; il registro è letto solo dagli amministratori.

**Limiti.** 90 richieste al minuto per client sul router (`DEVICES_RATE_LIMIT_*`), 60 scritture al minuto e 6 avvii ogni 10 minuti per utente (429 con `Retry-After`); tempi: chiamate a HA 20 s, passo di un flusso 90 s, attesa dello stato `loaded` 30 s, scadenza del flusso 10 minuti, tutti modificabili con variabili `DEVICES_*`.

**Ricetta di accensione (D1b).** Voce `wake_on_lan` creata dal server con il suo stesso flusso, pulsante nascosto, automazione con id `acasystem_accensione_<id della voce>` e trigger `webostv.turn_on` in forma di dispositivo (ripiego: forma di piattaforma, scelta secondo la versione di HA e confermata dal bit 128 di `supported_features`, RD-08). Il corpo viene prevalidato con `validate_config` prima di essere scritto. Gli id del dispositivo e delle entità li ricava il server dai registri dopo l'attesa dello stato `loaded`; il corpo della richiesta con un id (dispositivo, entità, automazione) è rifiutato con 400. La tabella `device_power_links` contiene solo id: **né il MAC né l'id del pulsante**, perché HA dà al pulsante un nome fatto con il MAC. La rimozione cancella solo ciò che la tabella registra, poi la riga. Il MAC viene **solo** dal campo `connections` del dispositivo `webostv` in HA oppure dall'installatore; se non c'è, 409 «Per accendere il televisore serve il suo indirizzo MAC…». Nessuna scansione e nessun pacchetto sulla LAN: il pacchetto lo invia HA.

**Comando D1s** `backend/src/cli/deviceServiceIdentity.ts` (`activate`, `status`, `forget`; `--reactivate`, `--rotate`). `activate` rifiuta di partire senza un terminale interattivo (le credenziali non si passano da argomenti, variabili o file), chiede utente e password del proprietario (password non mostrata, codice di verifica se HA lo chiede), crea l'utente «Acasystem (servizio)» nel gruppo amministratori con `local_only` (o riusa quello che c'è, correggendo gruppo e `local_only`), gli dà una password casuale usata una volta, ottiene il suo token a lunga durata, prova una scrittura (apre e annulla un flusso `webostv`), salva **solo il token** in un file `0600` e revoca le due sessioni di accesso della corsa. Stampa solo l'esito. È idempotente: con un'identità che funziona non chiede nulla; un utente sospeso non viene riattivato senza `--reactivate`. Sospendere o eliminare l'utente in HA (Persone > Utenti) spegne la funzione entro 15 s senza riavviare Acasystem e lascia il resto com'è; `forget` cancella solo il file sul server.

**Controllo di compatibilità** (`compatibility.ts`): all'avvio e poi ogni 5 minuti. Legge `ha_version` dal primo messaggio del WebSocket, controlla che HA sia configurato (RD-01) e, con l'identità attiva, che i gestori contengano `webostv` e `wake_on_lan` (RD-02), che la rotta dei flussi risponda come previsto (RD-03) e quella delle automazioni (RD-07). Una sonda fallita spegne la funzione interessata con un messaggio in italiano; una versione non provata dà solo un avviso all'installatore (RD-01).

### Chiamate a HA: pubbliche e interne

Tutte le chiamate sono descritte in `backend/src/config/homeAssistantApiCatalog.ts` (unico punto che nomina rotte e comandi di HA; un test lo verifica sul sorgente) e partono solo da `services/devices/haAdapter.ts`. **32 chiamate: 5 pubbliche** (classe DOC: `auth/token`, `auth/revoke`, `auth/long_lived_access_token`, `validate_config`, `states/{entity_id}`) **e 27 interne** (INT), ciascuna con permesso richiesto, versione verificata (2026.9.4), tipo di evidenza e i controlli CT/RD che la riguardano. L'evidenza è «codice» o «documentazione» come nella sezione 3 del piano: **nessuna chiamata è stata osservata su un HA acceso**. Una sola ha evidenza `unverified`: `auth/delete_all_refresh_tokens`, usata per cancellare i vecchi token del solo utente di servizio in caso di rinnovo; se HA la rifiuta, il rinnovo prosegue (il vecchio token resta valido fino alla scadenza) [non verificato; il sorgente di quel comando non è stato letto]. La versione 2026.10.2 è dichiarata «confrontata», non «provata».

### Scelte esecutive

- **Token a lunga durata (3650 giorni)**, non token di rinnovo: è l'unico dei due con un comando documentato (`auth/long_lived_access_token`) e non dipende da una scadenza per inattività che non ho verificato. La scadenza si calcola alla creazione e compare nello stato per l'installatore; il rinnovo è `--rotate`. Il token si crea per l'utente collegato, perciò il comando accede una volta come l'utente di servizio con la password casuale (che poi si scarta).
- **Percorso del segreto:** per istruzione dell'incarico, `<DATA_DIR>/secrets/service-identity.json` (nel volume dei dati). `TUNET_SERVICE_SECRET_FILE` lo sposta su un altro montaggio. Il file è scritto in modo atomico, `0600` in una cartella `0700`, e letto di nuovo a ogni richiesta (un file nuovo vale subito); su POSIX un file leggibile da gruppo o altri è rifiutato (su Windows il controllo non esiste e il test dei permessi è saltato).
- **`client_id` del login** del comando: `http://localhost/` [non verificato su HA: la regola di HA sul `client_id` è stata letta in modo indiretto].
- **Livello installatore:** in D1 non esiste l'inoltro con il token personale dell'amministratore (ADR-0022, punto 2); un amministratore che chiede un gestore fuori elenco riceve lo stesso 403. Gli amministratori hanno solo le operazioni riservate (MAC e broadcast, rimozione, registro).
- **Cataloghi:** le integrazioni personalizzate (`custom_components`) non sono elencate in D1.
- **Voci non caricate:** la ricetta richiede la voce del TV in stato `loaded` (TV acceso): con il TV spento all'avvio di HA la voce può essere in `setup_retry` e la richiesta dà 409 «non è ancora pronto» [limite, da rivedere in D1g].
- **Il registro e il resto non conservano mai** indirizzo del TV, MAC, token, password o contenuto dei campi: i test cercano questi valori in risposte, intestazioni, log, console, registro e in tutte le tabelle di `tunet.db`.

### Segnalazioni

1. **Volume separato non realizzato.** ADR-0022 (punto 3) e C-16 di `compliance.md` prevedono il segreto «su un volume separato dai dati e dalle copie»; qui il predefinito è il volume dei dati, come chiede l'incarico, e il compose non è stato toccato. Finché non si monta un volume separato e non si imposta `TUNET_SERVICE_SECRET_FILE`, **le copie a freddo di `tunet-data` contengono il token**. Decisione sul compose: dell'agente principale o dell'utente.
2. **L'HA finto non è una registrazione.** Nel repository non esiste alcuna fixture registrata da un HA vero (ricerca per nome file e per `"flow_id"`, 2026-10-23): i test di contratto CT-01…CT-14 sulle fixture non sono stati scritti. Le prove di questa sezione girano contro un modello fatto dalla lettura del sorgente di HA; non provano che HA risponda così. Le fixture si registrano in D1g.
3. **Core 2026.10.2 nella VM.** La sezione «V1» dice che il Supervisor ha installato 2026.10.2. Con quella versione il servizio resta acceso e l'installatore vede l'avviso RD-01; i comandi `config/auth/*` hanno però errori nuovi nella 2026.10.2 (piano, tabella 1): il comando tollera `credentials_exist` (in quel caso cambia la password) e tratta gli altri come rifiuto generico, ma tutto questo è **non provato**. Il ritorno a 2026.9.4 di D-D23 resta da fare prima di D1s.
4. **Porta di HA.** La VM usa la porta 80: `TUNET_INTERNAL_HA_URL` deve puntare lì (compose, fuori da questo passo).
5. **Immagine.** Il comando esiste nel container solo dopo aver applicato la patch e ricostruito l'immagine.
6. **Prova del prompt.** L'input nascosto è provato con un terminale simulato (modalità raw, cancellazione, Ctrl+C), non in un terminale vero.
7. **Rimane fuori:** D-D16 (filtro del tunnel `/ha`; l'architettura è provata: il tunnel inoltra solo il token dell'utente e le rotte di configurazione non sono nella lista del proxy), P18 (funzioni di Acasystem riservate agli amministratori, non toccate), il frontend (D1c, D1d, D1e, D1f).

### Come lo lancia l'utente (dopo patch e ricostruzione)

```
docker exec -it aca-tunet-tunet-1 node src/cli/deviceServiceIdentity.ts activate
docker exec -it aca-tunet-tunet-1 node src/cli/deviceServiceIdentity.ts status
```

Le credenziali del proprietario le digita l'utente nel proprio terminale; nessun agente le vede. Revoca: sospendere l'utente «Acasystem (servizio)» in HA (Persone > Utenti); per riattivarlo, riattivare l'utente (la funzione torna da sola entro 15 s) oppure rilanciare `activate --reactivate`. Rinnovo del token: `activate --rotate`.

### Verifiche (copia di lavoro, solo HA finto)

| Comando | Esito |
|---|---|
| `vitest run --maxWorkers=4` sul backend, prima di toccare qualcosa | 21 file, 202 test verdi |
| `vitest run --maxWorkers=4` sul backend, alla fine | 28 file, 387 test verdi, 1 saltato (permessi `0600`: solo POSIX) |
| `vitest run --maxWorkers=4 src/__tests__/devices*.test.ts`, ripetuto più volte | 7 file, 185 test verdi, 1 saltato, a ogni ripetizione (nessuna instabilità vista; la prova dell'abbinamento di 10 s dura 10 s) |
| `npm run typecheck` (tsc strict) e `npm run lint` nel backend | verdi |
| Comando da processo separato (`node src/cli/deviceServiceIdentity.ts` con `DATA_DIR` temporaneo) | `status` = «non è stato attivato», uscita 1; `activate` senza terminale = rifiuto, uscita 2; senza argomenti = istruzioni, uscita 2; importazione di `server.ts` riuscita |
| Sei mutazioni a mano del codice (identità accettata anche se non amministratore, controllo di appartenenza del flusso, rifiuto delle chiavi in più, override del MAC riservato all'installatore, pulizia dei campi del registro, identità accettata anche se rifiutata) | quattro bloccate dai test; una equivalente (accettare `rejected`: HA rifiuta comunque il token); una non bloccata (pulizia dei campi del registro), per cui ho aggiunto il test del registro con valori ostili |
| Patch: `git apply --check -p1` e applicazione su una copia dell'albero vivo | riuscite; albero risultante identico alla copia di lavoro |

**Test nuovi (7 file):** `devicesHelpers` (MAC, indirizzi, limiti, file segreto, regole di input, normalizzazione dei flussi, catalogo, registro, prompt nascosto), `devicesFlows` (aggiunta del TV, abbinamento lento di 10 s con la chiamata aperta, IP sbagliato, OK non premuto, già configurato e già in corso, ripresa, annullamento, scadenza, riavvio del backend con flussi aperti, HA spento all'avvio, appartenenza, regole di input, limiti, assenza di segreti), `devicesService` (identità assente, illeggibile, sospesa, revocata a metà, non amministratore, scaduta, sostituita senza riavvio; HA spento e non configurato; lista chiusa; catalogo e ricerca; nome e stanza; sonde RD-01/02/03/07; stato; TV che non risponde), `devicesPower` (ricetta con MAC di HA, senza MAC, dell'installatore, ripetibile, ripiego del trigger, bit 128 assente, stato, riparazione, rimozione, id estranei, nessun MAC in nessun posto), `devicesIdentity` (comando con risposte simulate: crea, riusa, ruota, sospeso, password errata, non amministratore, codice di verifica, HA non pronto, riga di registro, nessun segreto stampato o salvato), `devicesWiring` (nell'app vera: autenticazione, ruolo letto da HA, aggiunta con il tablet non amministratore, il tunnel `/ha` porta solo il token dell'utente e non passa le rotte di configurazione), `devicesArchitecture` (catalogo delle chiamate, lista chiusa, nessuno strumento di scansione di rete, il proxy non tocca il segreto).

### Non eseguito

Applicazione della patch a `progetto/acasystem`, costruzione dell'immagine, esecuzione del comando (nemmeno con HA finto in un terminale vero), prova su HA 2026.9.4 o 2026.10.2 reale, registrazione delle fixture, test del frontend e suite completa dell'intero progetto, prova su Linux (permessi `0600`), VM, tablet, TV, rete, credenziali, commit.

### Punto di ripresa

1. Dopo la costruzione del banco 0.9.28: `cd progetto/acasystem`, `git apply --check -p1 ../../backup/d1/patch/d1-server.diff`, `git apply -p1 ../../backup/d1/patch/d1-server.diff`, poi `npm run typecheck -w backend` e `npx vitest run --maxWorkers=4` nel backend. L'applicazione cambia 4 file esistenti e ne aggiunge 37.
2. Decidere il volume del segreto (segnalazione 1) e portare `TUNET_INTERNAL_HA_URL` alla porta della VM; ricostruire l'immagine.
3. Core a 2026.9.4 nella VM; l'utente lancia `activate`; poi D1c-D1g (frontend e prova reale) leggendo le forme delle risposte in `services/devices/deviceService.ts` e `flowModel.ts`.
4. Annotazioni su `compliance.md` (C-16 e C-17: «realizzato in copia, non provato su HA reale») e `project-status.md` alla chiusura (D1z): non fatte qui, perché i due file sono modificati dagli altri flussi.


## Annotazione del 2026-10-23: correzioni dopo la revisione del codice del server di D1

Claude Code (Sonnet 5.5, `claude-sonnet-5-5`). **Richiesta:** passo del flusso di lavoro (non digitato dall'utente) che chiede di correggere i rilievi della revisione del codice della sezione «Parte server di D1»: 3 di gravità media e 8 bassa. L'autorizzazione di D1 resta quella delle risposte dell'utente citate sopra. **Perimetro:** solo backend nella copia di lavoro `backup/d1/sandbox/acasystem` e documenti; `progetto/acasystem` non è stato toccato; nessun commit; nessun frontend, compose, `.env` o Docker; nessuna VM, rete, tablet, TV o HA reale (solo l'HA finto dei test); nessuna credenziale letta, digitata o ricevuta; nessuna dipendenza nuova.

**Questa annotazione prevale** sulle frasi della sezione «Parte server di D1» che le contraddicono, elencate in fondo; il testo precedente non è stato modificato.

### Da dove si riparte [osservazione]

Alla ripresa la copia di lavoro conteneva già, in 13 file sorgente, correzioni per i rilievi 1, 2, 4, 5, 8, 9 e 10, scritte da un passo precedente di questo stesso incarico che non ha lasciato né test né documenti (copia di partenza di quel passo: `backup/d1/pre/rilievi/`). Non ho la sua cronologia e non ho riverificato le sue affermazioni sulle fonti di HA: ho riletto ogni modifica contro il rilievo, completato i rilievi 3, 6 e 7 (`identityActivation.ts` non era stato toccato), scritto i test e riportato a LF i file che erano diventati CRLF (altrimenti il diff avrebbe riscritto interi file). Copie di questa ripresa: `backup/d1/pre/rilievi-ripresa/`.

### Esito per rilievo

| # | Gravità | Rilievo | Esito | Come |
|---|---|---|---|---|
| 1 | media | Il cliente poteva avviare `wake_on_lan` e passare MAC, porta e indirizzo di broadcast | **Applicato** (prima opzione del rilievo) | `wake_on_lan` esce da `CUSTOMER_STARTABLE_HANDLERS` (resta solo `webostv`) e non ha più regole di input in `flowInput.ts`: nessuno, nemmeno un amministratore, lo avvia dalla facciata. La voce è creata solo dalla ricetta del server (MAC da HA o dell'installatore). Una lista a parte, `FACADE_DOMAINS` (`webostv`, `wake_on_lan`), dice quali voci e dispositivi la facciata mostra e lascia rinominare. L'indirizzo di broadcast dell'installatore è limitato a una rete privata o a `255.255.255.255` (vedi 9) |
| 2 | media | Le sonde fallivano «aperte» | **Applicato**, con una scelta mia | Una funzione è accesa solo se le sonde che le servono hanno dato `pass`: elenco = RD-02; aggiunta dei dispositivi = RD-02 + RD-03 + versione nota; accensione = quelle + RD-07. Senza identità attiva tutto è spento. Le sonde RD-03 e RD-07 nell'adattatore ora lanciano l'errore se la risposta non è il 404 atteso (prima ogni errore diventava «fallita» e il rapporto restava in cache 5 minuti): una sonda che non gira è `skipped`, spegne la funzione e il rapporto si ripete dopo 5 secondi. Il rapporto porta lo stato e l'impronta del token dell'identità e viene scartato quando cambiano, quindi dopo `activate` le sonde girano prima della prima scrittura. **Scelta mia [valutazione]:** una versione «confrontata» con il sorgente (2026.10.2) conta come nota; una versione né provata né confrontata tiene spente le scritture finché l'installatore non imposta `DEVICES_ALLOW_UNVERIFIED_HA_VERSION=1`. Il comando `activate` si rifiuta, prima di chiedere credenziali, su una versione ignota (stessa variabile). **Non fatto:** sonde per le rotte interne che non ne hanno (aggiornamento dei registri di dispositivi, entità e aree, `validate_config`, `config_entries/get`, `config/auth/*`): resta il solo cancello della versione |
| 3 | media | Il token stava nel volume dei dati, dentro le copie a freddo | **Applicato in parte** | Il codice non lo impedisce più in silenzio: `activate` rifiuta di salvare il file dentro `DATA_DIR` (codice `secret_location`, prima di chiedere le credenziali e senza chiamare HA) salvo `TUNET_SERVICE_SECRET_ALLOW_DATA_DIR=1`, che è per il solo banco e stampa un avviso; `status` avvisa se il file è nel volume dei dati. **Non fatto (compose, fuori perimetro):** montare un volume separato e impostare `TUNET_SERVICE_SECRET_FILE`; finché non c'è, `activate` rifiuta, a meno di accettare il rischio. Procedura delle copie a freddo: [infrastructure.md](../infrastructure.md), voce «Segreto del servizio» |
| 4 | bassa | Un POST andato in timeout veniva ripetuto sull'URL di ripiego | **Applicato** | Letture e WebSocket passano all'URL successivo dopo irraggiungibile o timeout; POST e DELETE solo se la connessione è fallita prima dell'invio (`ECONNREFUSED`, `ENOTFOUND`, `EHOSTUNREACH`, `ENETUNREACH`, `EAI_AGAIN`, timeout di connessione), mai dopo un timeout. Si distingue per metodo HTTP, non per un flag nei descrittori |
| 5 | bassa | Errori tradotti sempre come «accensione non configurata» | **Applicato** | Nuovo codice generale `HA_REFUSED` (502, «Home Assistant ha rifiutato l'operazione…») come predefinito; `RECIPE_FAILED` solo per attivazione e rimozione dell'accensione; nome di stanza rifiutato da HA = `AREA_EXISTS` (409, «Esiste già una stanza con questo nome.») |
| 6 | bassa | Rinnovo: i vecchi token cancellati prima di salvare il nuovo | **Applicato** | Ordine: elenco dei vecchi, creazione del nuovo, controlli, salvataggio, solo poi cancellazione dei vecchi per id. Se qualcosa fallisce prima del salvataggio (prova di scrittura, errore del file) il nuovo token è cancellato in HA (id ricavati dalla differenza dei due elenchi) e il vecchio, ancora nel file, continua a funzionare. Se HA non elenca i token o non ne cancella uno, l'attivazione riesce e il messaggio lo dice (i vecchi scadono da soli). Usa `auth/refresh_tokens` e `auth/delete_refresh_token` al posto di `auth/delete_all_refresh_tokens` |
| 7 | bassa | Riuso di un utente con lo stesso nome ma altro login | **Applicato** | L'utente si trova per `username`; per nome solo se non ha un login. Un utente con quel nome e un altro login, o il proprietario, fermano il comando (`user_conflict`) senza cambiare nulla |
| 8 | bassa | Flussi non cancellati in HA con identità non attiva | **Applicato**, oltre il rilievo | Con identità non attiva la riga resta `cancelling` e si riprova (limite 1 ora, come per HA irraggiungibile). Inoltre **qualsiasi** errore di cancellazione (non solo irraggiungibile) tiene la riga fino al limite: la riga sparisce solo dopo una cancellazione riuscita o se HA risponde 404. **Non fatto:** riconoscere il riavvio di HA per chiudere prima |
| 9 | bassa | Indirizzi pubblici e nomi DNS accettati come host del TV | **Applicato** | Solo IPv4 privati (10/8, 172.16/12, 192.168/16); esclusa la rete del Supervisor 172.30.32.0/23; niente nomi. Effetto: in D1 un TV raggiungibile solo per nome non si può aggiungere dal cliente |
| 10 | bassa | Catalogo con `integration/descriptions` e ricerca | **Applicato** | Il catalogo legge solo `flow_handlers` (come da riga 9 della tabella del §3); `integration/descriptions` esce dal catalogo delle chiamate (`parseIntegrationDescriptions` resta nel codice per D3, non usata). **Scostamento dichiarato:** `?q=` resta come filtro sul nome del dominio della lista già letta, senza chiamate a HA; la ricerca su marche e traduzioni è D3. `degraded` è sempre vero, con il messaggio «L'elenco completo delle marche non è ancora disponibile…» |

### Effetti da conoscere

- **Parola dell'utente su D-D22 (b):** il testo dell'opzione dice «in D1: TV LG e accensione via rete». Il cliente continua ad avere l'accensione via rete (ricetta `POST /accensione/:entryId`), ma `wake_on_lan` non è più un'integrazione che avvia lui: nel catalogo risponde «Richiede l'installatore». [valutazione] coerente con la risposta, perché l'accensione si ottiene dal pulsante della ricetta e non dal flusso; la riga della tabella «Fonti umane» sopra dice invece che i gestori avviabili sono `webostv` e `wake_on_lan`, e va letta con questa correzione. Se l'utente vuole altro, lo dice.
- **Il segreto:** senza compose modificato, `activate` rifiuta di salvare. Prima di D1s serve una scelta di chi ha l'autorità sul compose: volume separato con `TUNET_SERVICE_SECRET_FILE` (consigliato), oppure `TUNET_SERVICE_SECRET_ALLOW_DATA_DIR=1` sul solo banco, senza copie a freddo di `tunet-data` dopo l'attivazione.
- **Chiamate a HA:** sempre 32 (5 pubbliche, 27 interne), ma due sono cambiate: via `integration/descriptions` e `auth/delete_all_refresh_tokens`, dentro `auth/refresh_tokens` e `auth/delete_refresh_token`. L'unica con evidenza `unverified` è ora `auth/refresh_tokens` (permessi letti nelle note di `backup/allineamento-d1/permessi-cliente.md`; i campi `id` e `type` dell'elenco sono «non verificati nel dettaglio» in `api-pubbliche-interne.md`, A10): se la forma è diversa, l'elenco è vuoto e i vecchi token scadono da soli. Mai eseguite su un HA reale.

### Limiti rimasti [non risolti]

- Il rilievo 2 non copre le rotte interne senza sonda (sopra).
- Rilievo 7: se HA 2026.10 non elenca i login, un altro utente con quel nome e un login nascosto sarebbe scambiato per il nostro (prova con la manopola `omitUsernamesInList` del finto HA, non con HA).
- Rilievo 8: dopo un'ora la riga è eliminata anche se il flusso fosse ancora aperto in HA (HA li scade al riavvio).
- Rilievo 9: la rete 172.30.32.0/23 è esclusa sempre, non solo su HAOS.
- Tutto gira contro un HA finto fatto dalla lettura del sorgente: le correzioni non provano che HA risponda così (segnalazione 2 sopra).

### Verifiche (copia di lavoro, solo HA finto)

| Comando | Esito |
|---|---|
| `npm run typecheck` (tsc strict) e `npx eslint src` nel backend | verdi |
| `npx vitest run --maxWorkers=4` nel backend | 29 file, 425 test verdi, 1 saltato (permessi `0600`: solo POSIX) |
| Test nuovi o rifatti | `devicesTransport.test.ts` (nuovo, 3 test: ritentare sull'URL successivo); `devicesIdentity` (rinnovo in ordine, fallimento della prova, fallimento del salvataggio, cancellazione dei vecchi che fallisce, elenco assente, utente omonimo, proprietario omonimo, versione ignota, posizione del segreto e comando); `devicesService` (nessun avvio di `wake_on_lan` né campi MAC/porta/broadcast, indirizzi non privati e nomi rifiutati, catalogo da `flow_handlers`, sonde: servizio non attivo e poi attivato, sonda che non gira, RD-07, versione ignota e variabile, traduzione degli errori); `devicesFlows` (limite totale dei flussi, riga conservata a servizio spento e cancellata al ritorno, riga conservata dopo un errore di HA); `devicesHelpers` (reti private, nomi, broadcast, nessuna regola per `wake_on_lan`); `devicesPower` (frase della ricetta solo per la ricetta). Gli indirizzi di prova 192.0.2.x sono diventati 192.168.1.x, perché la regola ora accetta solo reti private |
| Sei mutazioni a mano (wake_on_lan avviabile dal cliente; sonda non eseguita contata come riuscita; nuovo token non cancellato su fallimento; riga cancellata a servizio spento; POST ritentato dopo un timeout; utente omonimo riusato), ciascuna ripristinata | **tutte bloccate** da almeno un test; file ripristinati (impronta del diff identica prima e dopo) |
| Patch: `git apply --check -p1` e applicazione su una copia dell'albero vivo (`progetto/acasystem/backend` del 2026-10-23, senza `node_modules`) | riuscite; sorgenti identici alla copia di lavoro; `package.json` identico a parte i fine riga |

**Patch aggiornata:** `backup/d1/patch/d1-server.diff` (42 file: **38 nuovi e 4 modificati**), `files-new.txt`, `files-modified.txt`. La versione precedente è in `backup/d1/pre/rilievi-ripresa/patch-precedente/`. I 4 file modificati (`backend/package.json`, `rateLimit.ts`, `database.ts`, `server.ts`) sono identici nell'albero vivo e nell'istantanea di partenza [verificato: impronte SHA-256]. Il frontend e il resto dell'albero vivo (modificati dalla 0.9.28) non sono nel diff.

### Non eseguito

Applicazione della patch a `progetto/acasystem`, costruzione dell'immagine, esecuzione del comando in un terminale vero, prova su HA reale, test del frontend e suite completa del progetto, prova su Linux dei permessi `0600`, compose e volume del segreto, VM, tablet, TV, rete, credenziali, commit.

### Frasi precedenti che questa annotazione corregge

- «Patch … 41 file: 37 nuovi, 4 modificati» e «L'applicazione cambia 4 file esistenti e ne aggiunge 37»: ora 42 file, 38 nuovi.
- Riga `GET /catalogo` della tabella delle rotte, «tutte le integrazioni con un flusso, con ricerca; solo `webostv` e `wake_on_lan` sono avviabili; ripiego sui gestori dei flussi se manca l'indice completo (RD-04)»: ora solo i gestori dei flussi, solo `webostv` avviabile.
- «Il corpo inviato a HA si ricostruisce da regole chiuse per gestore e passo (`webostv`: `host`; `wake_on_lan`: `mac`, `broadcast_address`, `broadcast_port`)»: ora solo `webostv`; indirizzo = IPv4 privato.
- «Una sonda fallita spegne la funzione interessata… una versione non provata dà solo un avviso»: ora ogni funzione richiede le sue sonde riuscite e una versione ignota tiene spente le scritture.
- «Una sola ha evidenza `unverified`: `auth/delete_all_refresh_tokens`… se HA la rifiuta, il rinnovo prosegue»: la chiamata non c'è più; vedi sopra.
- «Percorso del segreto… per istruzione dell'incarico, `<DATA_DIR>/secrets/service-identity.json`» e la segnalazione 1: il predefinito è ancora quello, ma `activate` ora rifiuta di salvarvi salvo scelta esplicita.
- Comando D1s: ora anche «un utente con quel nome e un altro login non viene toccato», «il token nuovo è salvato prima di cancellare i vecchi» e «si ferma su una versione di HA ignota».

### Punto di ripresa

1. Dopo la costruzione del banco 0.9.28: `cd progetto/acasystem`, `git apply --check -p1 ../../backup/d1/patch/d1-server.diff`, `git apply -p1 ../../backup/d1/patch/d1-server.diff`, `npm run typecheck -w backend`, `npx vitest run --maxWorkers=4` nel backend. Cambia 4 file esistenti e ne aggiunge 38.
2. Chi ha l'autorità sul compose decide il volume del segreto (`TUNET_SERVICE_SECRET_FILE`) e porta `TUNET_INTERNAL_HA_URL` alla porta della VM; poi si ricostruisce l'immagine.
3. Core a 2026.9.4 nella VM (D-D23); l'utente lancia `activate` nel proprio terminale; poi D1c-D1g.
4. Annotazioni su `compliance.md` (C-16 e C-17) alla chiusura di D1 (D1z): non fatte qui.

## Annotazione del 2026-10-26: parte frontend di D1 (D1c-D1g) realizzata in una copia di lavoro

Stato: **realizzata e verificata nella copia di lavoro, non applicata all'albero principale.** Autore: Claude Code (Sonnet 5.5, `claude-sonnet-5-5`), su incarico del flusso di D1 autorizzato dall'utente il 2026-10-26 («Sì, in parallelo» alla 0.9.29; «No, usiamo la VM»). Nessun commit, nessuna credenziale, nessun browser, tablet, televisore, rete o Docker; l'albero principale non è stato toccato (solo letto). Un altro flusso fa la 0.9.29 in quell'albero.

### File

- Copia di lavoro: `backup/d1/sandbox/acasystem/frontend`. Copie «prima» dei file modificati, con SHA-256: `backup/d1/pre/d1-frontend/` (`SHA256.txt`).
- **24 file nella patch: 19 nuovi e 5 modificati.** Nuovi: `src/@types/devices.ts`, `src/api/devicesApi.ts`, 11 file in `src/templates/devices/` (`AddDeviceFlow`, `useDeviceFlow`, `CatalogStep`, `FlowFormStep`, `PairingStep`, `NameRoomStep`, `PowerStep`, `AddDeviceEntry`, `useEntityPresence`, `deviceTexts`, `devices.css`) e 6 file di test (`DevicesApi`, `AddDeviceFlow`, `AddDeviceEntries`, `AddDevicePower`, `TvPowerApps`, `devicesFakeServer`). Modificati: `CategoryBindingSection.tsx`, `AddWidgetSheet.tsx`, `TvWidget.tsx`, `TvDetails.tsx`, `model/tv.ts`.
- Patch: `backup/d1/patch/d1-frontend.diff` (da `progetto/acasystem` con `git apply -p1`; i file nuovi sono diff da `/dev/null`); elenco in `backup/d1/patch/d1-frontend-files.txt`. Il diff è calcolato rispetto a `pre/d1-frontend/`, non all'intera cartella: non riporta indietro la 0.9.28.

### Che cosa fa [realizzato]

- Il widget Android TV ha la riga «Aggiungi un dispositivo» in «Collega» (al posto della lista, senza elementi d'esempio, se Home Assistant non ha lettori) e in «Aggiungi un widget» → Android TV. Non c'è per gli altri tipi. Il percorso vive **nello stesso foglio**, con i suoi pulsanti, senza un secondo dialogo (ISSUE-112) e senza toccare `LauncherScreen`.
- Passi: controllo del servizio (messaggio del server se spento o HA non raggiungibile) → flusso già aperto («Riprendi»/«Annulla», anche per il 409) → scelta (consigliato `webostv`; ricerca con attesa di 250 ms; le altre integrazioni disabilitate con «Richiede l'installatore») → indirizzo (modulo disegnato dai campi del server; i facoltativi vuoti non si inviano) → abbinamento (una chiamata tenuta aperta: conto alla rovescia da 10, nessun pulsante attivo, poi «Sto aspettando la risposta del televisore…»; «Riprova» rimanda lo stesso flusso) → nome e stanza → accensione da spento → fine («Fine» collega l'entità appena compare nei dati vivi, o dopo 15 s con «Comparirà tra pochi secondi.»).
- Errori: 403, 422, 503, 504, 404/410, 409, 429 e 400 con campo hanno ciascuno il proprio messaggio italiano (quello del server; senza, «Qualcosa non ha funzionato. Riprova.»); mai un testo del browser. «Esci» e la chiusura del foglio annullano il flusso aperto (il 404 si tollera), ma non mentre una chiamata è aperta: lo fa il server dopo 10 minuti.
- Accensione (D1e): il cliente manda un corpo vuoto; se HA non ha il MAC mostra il messaggio del server («Lo inserisce l'installatore») e «Salta». L'amministratore scrive il MAC (controllato prima dell'invio, con le stesse regole del server) e, sotto «Avanzate», broadcast (proposto `x.y.z.255` dall'indirizzo appena scritto, solo in memoria) e porta. «Prova ad accendere» chiede conferma e manda `media_player.turn_on`.
- Widget (necessario per accendere e aprire Netflix): sull'Android TV compare il pulsante di accensione quando l'entità dichiara TURN_ON (da spenta) o TURN_OFF (da accesa), e la sezione «App» quando dichiara SELECT_SOURCE e ha una lista di sorgenti. Senza funzioni dichiarate non cambia nulla; l'Apple TV è invariata.
- Nulla nel browser: niente `localStorage`, niente console, nessun indirizzo salvato (verificato da test).

### Scelte esecutive e scostamenti dal piano

1. «Prova ad accendere» usa `InlineConfirm` (come le altre conferme dei fogli) e non `ConfirmSheet`: un `ConfirmSheet` dentro il foglio sarebbe un dialogo annidato.
2. Le righe non avviabili mostrano «Richiede l'installatore» come testo (`Caption`); `Badge` nel kit è solo un punto di notifica.
3. L'attesa dell'entità è nel pannello finale del flusso (un solo posto, vale per «Collega» e per «Aggiungi un widget»): «Fine» resta in attesa fino a 15 s, poi collega comunque. Il piano la metteva in `CategoryBindingSection`; l'effetto è lo stesso.
4. Il broadcast si invia solo se «Avanzate» è aperta: chiusa, HA usa il suo predefinito.
5. **Cambia il comportamento degli altri Android TV che dichiarano TURN_ON/TURN_OFF o SELECT_SOURCE** (pulsante e «App» compaiono): è coperto dall'obiettivo di D1 (accendere e aprire Netflix dal widget), ma va detto all'utente. D-D18 (dove si filtrano le app: oggi compaiono tutte le sorgenti, anche HDMI) resta aperta.

### Verifiche (copia di lavoro; nessun browser né tablet)

| Controllo | Esito |
|---|---|
| `npm run typecheck` (tsc strict su tutto `src`) | superato |
| `npx eslint src` | superato (nessun avviso) |
| `node scripts/lint-typography.mjs` / `node scripts/lint-theme-colors.mjs` | 0 violazioni (532 / 352 file) |
| Vitest dei 5 file di test nuovi (`--maxWorkers=2`) | **87 test superati** (`DevicesApi` 11, `AddDeviceFlow` 37, `AddDeviceEntries` 12, `AddDevicePower` 14, `TvPowerApps` 13) |
| Regressioni: `AvTv`, `AvWidgetOpen`, `CategoryPages`, `FixSheetsReview`, `SystemSheets`, `WidgetMemoryAddSheet` | 115 superati |
| Regressioni: `ShellLauncher`, `AvMediaDetails`, `AvMediaPage`, `AvMediaPlayer`, `PolishLauncherScreen`, `Polish2LauncherScreen` | 78 superati |
| Prova di unione (`backup/d1/prova-unione/`: copia di `frontend/src` e della configurazione dell'albero principale del 2026-10-26 10:03, senza `node_modules`) | `git apply --check -p1` **senza conflitti**; applicata davvero: i 24 file risultano identici byte per byte a quelli della copia di lavoro; `tsc` strict sulla copia con la patch: superato |

Il test `DevicesApi` confronta le chiavi dei DTO del frontend con le interfacce del server (`backend/src/services/devices/`); si salta se il server non è accanto. Prima di ogni corsa di Vitest si è controllato che non girasse un Vitest dell'albero principale; si è aspettato più volte.

### Conflitti e rischi dell'unione

- Nessun conflitto oggi: i 5 file modificati sono ancora identici (SHA-256) a quelli di partenza nell'albero principale e i 19 nuovi non esistono là; la 0.9.29 in corso non li tocca (stato letto alle 10:03). Va **ricontrollato** a 0.9.29 chiusa, prima di applicare.
- I DTO sono copiati a mano dal server: se `d1-server.diff` cambia ancora, il test delle chiavi lo segnala solo se il server è presente.
- La copia di lavoro ha ancora il foglio (`Sheet.tsx`) di prima della 0.9.28: il comportamento del flusso dentro il foglio (focus, altezza, animazione) va riprovato dopo l'unione, sul banco e sul Tab M11.
- Nota sul metodo: dentro il repository `git apply` su una cartella ignorata (`backup/`) non scrive nulla ma risponde «ok»; la prova vera è stata fatta con `GIT_CEILING_DIRECTORIES` e `core.autocrlf=false`. Sull'albero principale (`progetto/acasystem/** -text`) i file restano con i loro fine riga.

### Non eseguito

Applicazione all'albero principale, ricostruzione dell'immagine, prova nel browser o sul Tab M11, controllo visivo (spaziature, focus, layout su telefono), prova col televisore e con la VM (abbinamento, accensione, Netflix, persistenza), fixture di contratto CT-01…CT-14, commit.

### Limiti rimasti [non risolti]

- D-D6: nessuna proposta del MAC da parte di Acasystem; un cliente non attiva l'accensione da spento se HA non ha il MAC (di norma per `webostv` manca). Il broadcast non è ricavato dal server.
- L'automazione `acasystem_accensione_*` non è esclusa dal widget Automazioni. «Accendi + app» (D-D7, D9), menu/progress/`next_flow` (D2), catalogo con marche (D3), pagina «Sistema > Dispositivi», rimozione (D6): fuori da questa parte.
- Prerequisiti fuori dal frontend (invariati): scheda a ponte della VM, porta di HA nella VM, volume del segreto, `activate` e utente «cliente» a cura dell'utente.

### Punto di ripresa

1. A 0.9.29 chiusa: confrontare gli SHA-256 dei 5 file modificati con `backup/d1/pre/d1-frontend/SHA256.txt`; poi, da `progetto/acasystem`: `git apply --check -p1 ../../backup/d1/patch/d1-server.diff` e `d1-frontend.diff`, applicare, `npm run typecheck`, i 5 test nuovi e le regressioni sopra, ricostruire l'immagine. Solo su istruzione esplicita (albero principale, Docker, banco e tablet).
2. Prova reale con l'utente presente (D1g): aggiunta del televisore 192.168.1.26, abbinamento, accensione, Netflix, persistenza (D1p).


## V2 — preparazione per D1 (2026-10-26)

Eseguita da Claude Code (Sonnet 5.5, `claude-sonnet-5-5`), subagente di un flusso, tra le 10:27 e le 11:40, su richiesta dell'utente del 2026-10-26 («entro oggi riusciamo a mettere acasystem sulla macchina virtuale e testare il collegamento con dispositivi veri?», poi «No, usiamo la VM»). Acasystem resta nel container del PC e userà l'HA della VM; il pacchetto dentro HA OS è un lavoro futuro. Nessun commit; nessuna credenziale usata o vista; nessun utente creato; nessuna integrazione aggiunta; Docker, banco, tablet e working tree principale non toccati.

### Ripresa e attesa

- **Stato di partenza [verificato con `showvminfo` e `snapshot list`]:** VM spenta, RAM 4096 MB, snapshot «prima-di-D1-oggi» già presente (descrizione ancora «RAM 3072, Core 2026.10.2», scritta prima della modifica della memoria). Non rifatti.
- **Attesa:** il diario indicato dall'incarico (`2d52377b…/journal.jsonl`) era fermo alle 09:27 e non conteneva l'agente «verifica». Si è usato il diario della sessione corrente (`d84f0a80…/journal.jsonl`), come dice la nota dell'incarico: l'agente «verifica» è terminato con `all_green` (4 shard di Vitest: 737, 1006, 749, 617 test passati; typecheck, lint, build verdi). Alle 10:27 non c'erano processi `vitest` né Playwright; memoria libera circa 3,9 GB. Era già partito l'agente «tablet» (non usa la VM). L'attesa è durata da 09:38 a 10:27.

### Passi eseguiti

| Passo | Esito |
|---|---|
| Avvio senza finestra (`startvm --type headless`, vmsvga, paravirt hyperv) | Console di HA OS pronta dopo circa 20 minuti (misura approssimata; la VM gira sopra l'hypervisor di Windows). Memoria libera del PC scesa a circa 1,8-2,3 GB durante l'avvio |
| Core | `ha core info`: 2026.10.2 (ultima disponibile 2026.10.4). Dalla console `core update --version 2026.9.4`: «Command completed successfully» in meno di 5 minuti. `ha core info`: **2026.9.4**; il Core è ripartito alle 10:50 e `/auth/providers` risponde 200 (proprietario già creato dall'utente il 2026-10-23, nessun `onboarding_required`). **Il ritorno da 2026.10.2 a 2026.9.4 su HAOS 18.3 funziona**: il punto di stop di D-D23 non è scattato. Nel registro del Core compare solo l'avviso del Recorder «could not validate that the sqlite3 database was shutdown cleanly» (riferito all'arresto precedente) |
| IP fisso Host-Only (D-I3) | `network update enp0s8 --ipv4-method static --ipv4-address 192.168.56.10/24`, senza gateway. L'intervallo DHCP di VirtualBox è 192.168.56.101-254, quindi `.10` è fuori. Dal PC: ping e `http://192.168.56.10/` 200; il vecchio `.101` non risponde più |
| Ascolto limitato (D-I8) | Vedi sotto: **la porta di HA è la 80**, e `configuration.yaml` non basta |
| Scheda a ponte | `controlvm setlinkstate1 on`: `enp0s3` ha **192.168.1.183/24** (DHCP), gateway e DNS 192.168.1.1. Dalla shell della VM: ping 192.168.1.1 ok; ping **192.168.1.26** 3/3 (prima risposta 2165 ms, poi 1165 e 164 ms) e dopo il riavvio 2/2 (media 20,8 ms). Il PC era a 192.168.1.7 |
| NAT temporanea | Con la scheda a ponte la VM ha Internet (`curl https://version.home-assistant.io/stable.json` → 200; Supervisor `healthy: true`, `supported: true`), quindi la NAT è stata staccata: `setlinkstate3 off`, poi a VM spenta `modifyvm --nic3 none`. Le schede sono ora: 1 a ponte sul «Realtek RTL8852BE WiFi 6», cavo connesso; 2 Host-Only; 3 e 4 nessuna |
| Snapshot | «**dopo-preparazione-D1**» (UUID `1fa216bf-dcf8-4591-a2f0-9ae28791887c`), presa a VM spenta dopo lo spegnimento ACPI (15 s) |
| Riavvio e controllo | VM riavviata: HTTP 200 su `192.168.56.10` dopo circa 30 minuti dall'avvio (alle 11:37; più lento del primo avvio). Dopo il riavvio, dalla shell: Core 2026.9.4, Supervisor sano, `192.168.56.10:80`, `172.30.32.1:80` e `127.0.0.1:80` 200, l'indirizzo del ponte (192.168.1.183:80) rifiuta la connessione, il ping al TV risponde. Il file `.storage/http` conserva `server_host` |

### D-I8: come è stato fatto e perché in modo diverso dall'incarico

- **Fatto osservato nel codice in esecuzione (Core 2026.9.4, `components/http/config.py`, righe 195-245 lette dalla VM):** quando `yaml_migration_done` è `true` nello `.storage/http` (qui lo è dal 2026-10-23), la configurazione YAML `http:` viene **ignorata** e HA crea solo l'avviso «yaml_still_present_after_migration». Quindi `http: server_host` in `configuration.yaml` (come scritto nell'incarico) **non avrebbe avuto effetto**; è coerente con la riga «Porta di HA e D-I8» del piano operativo, che già indicava lo storage come fonte. `configuration.yaml` non è stato modificato.
- **Mezzo usato:** con il Core fermato (`ha core stop`), dalla shell di HA OS (`login`), copia dello `.storage/http` in `/mnt/data/http.storage.bak-20261026` (dentro la VM, 496 byte, data originale 2026-10-23 17:24) e aggiunta nel blocco `stable` di `"server_host": ["192.168.56.10", "172.30.32.1", "127.0.0.1"]` (558 byte), poi `ha core start`. Non si è usato il comando WebSocket `http/config/configure` perché richiede un token (nessuna credenziale in questo flusso).
- **Perché tre indirizzi:** `172.30.32.1` è l'indirizzo con cui il Supervisor e le app raggiungono il Core (`ha core info`, `ip_address`) e `127.0.0.1` l'anello locale: limitare al solo Host-Only avrebbe rischiato di rompere il Supervisor (rischio elencato tra i punti di stop). Non è stato verificato che Impostazioni > Sistema > Rete mostri questa lista.
- **Prove prima di collegare il ponte:** dalla shell della VM `192.168.56.10:80`, `172.30.32.1:80`, `127.0.0.1:80` → 200; `10.0.4.15:80` (NAT) → nessuna connessione; la 8123 non ha ascoltatori né su `192.168.56.10` né su `10.0.4.15`. Il ponte è stato collegato solo dopo.
- **Prove con il ponte collegato:** dal PC (Wi-Fi 192.168.1.7) `http://192.168.1.183:80` e `:8123` → connessione rifiutata; `http://192.168.56.10:80` → 200. **Limite:** la prova «dalla rete dell'ufficio» è fatta dal PC che ospita la VM, non da un secondo apparecchio (il tablet era riservato alla 0.9.29): [non verificato da un altro dispositivo].
- **Ritorno indietro:** a VM accesa, nella shell di HA OS: `ha core stop`, `cp /mnt/data/http.storage.bak-20261026 /mnt/data/supervisor/homeassistant/.storage/http`, `ha core start`; oppure ripristinare lo snapshot «prima-di-D1-oggi».

### Cose da sapere

- **Il Core ascolta sulla porta 80.** `TUNET_INTERNAL_HA_URL` per il container di Acasystem sarà `http://192.168.56.10` (porta 80, nessun `:8123`) quando si passerà alla tappa I4 (non eseguita).
- **L'indirizzo del ponte è DHCP** (192.168.1.183 oggi) e cambierà con la rete: Acasystem non lo usa. La prenotazione sul router (D-I4/D-D21) resta aperta; con il Wi-Fi VirtualBox sostituisce il MAC della VM con quello del PC (dal manuale; non verificato cosa veda il router).
- **Avvio lento e memoria:** 20-30 minuti dall'avvio alla risposta HTTP, con il PC a 16 GB e circa 4-4,6 GB liberi a VM accesa. Conviene lasciare la VM accesa durante la giornata e non fare carichi pesanti (Vitest, Playwright) durante il suo riavvio.
- **Televisore:** nessun comando. Solo ping ICMP dalla VM a 192.168.1.26 e, per una mia scelta non richiesta, una connessione TCP di prova dal PC alla porta 3001 del TV, riuscita e chiusa senza inviare dati.

### Non eseguito

Utente «cliente», comando `activate` (D1s), integrazioni `webostv` e `wake_on_lan`, prova che il container di Acasystem raggiunga `192.168.56.10:80` (Docker non toccato), `TUNET_INTERNAL_HA_URL`, arresto del container `homeassistant` di Docker, avvio automatico della VM (D-I7, resta spento), firewall di Windows, prova dalla rete dell'ufficio con un secondo apparecchio, aggiornamento di `verification.md`.

### Stato finale e punto di ripresa

VM `acasystem-ha` **accesa e stabile** (HAOS 18.3, Core 2026.9.4, 4096 MB, Host-Only 192.168.56.10, ponte 192.168.1.183, NAT assente). Prossimi passi: (1) l'utente crea il cliente di prova e lancia `activate` (D1s); (2) I4: puntare Acasystem a `http://192.168.56.10` e provare la raggiungibilità dal container; (3) prova reale D1g con l'utente davanti al TV.


## Unione di D1 nel progetto (2026-10-26)

Eseguita da Claude Code (Sonnet 5.5, `claude-sonnet-5-5`), subagente di un flusso, tra le 12:10 e le 12:35, su incarico del flusso di D1 autorizzato dall'utente il 2026-10-26 («Sì, in parallelo» alla 0.9.29; «No, usiamo la VM»). Nessun commit, nessuna credenziale, nessun comando a impianti reali; **Docker, banco, tablet, VM e televisore non toccati**; nessuna dipendenza nuova. L'immagine non è stata ricostruita e nessun container è stato avviato o ricreato.

### Attesa e stato di partenza

- **Attesa:** il diario `d84f0a80…/journal.jsonl` mostrava 0.9.29 e poi 0.9.30 (agenti «pila», «verifica3», «banco:0.9.30», secondo «documenti», terminato alle 12:07). Alle 12:10 non c'erano processi `vitest` né `docker build` per `progetto/acasystem`. Girava soltanto un Vitest di `progetto/client` (altro flusso, app client): non toccato; alle 12:12 era già finito. La versione del banco è ora **0.9.30**.
- **Confronto prima di applicare [verificato]:** i 5 file frontend modificati dalla patch erano ancora identici (SHA-256) a `backup/d1/pre/d1-frontend/SHA256.txt` e i 4 file server a `backup/d1/pre/d1-server/`: la 0.9.29 e la 0.9.30 non li hanno toccati. Nessun conflitto.
- **Copie «prima»:** `backup/d1/pre/unione/` (con `SHA256.txt`): i 4 file server, i 5 file frontend, `progetto/compose.tunet.yaml` e questo report, come erano alle 12:12.

### Applicazione delle patch [verificato]

- `d1-server.diff`: 41 file (37 nuovi, 4 modificati); `d1-frontend.diff`: 24 file (19 nuovi, 5 modificati). Dopo l'applicazione i **66 file** dei due elenchi sono identici byte per byte (SHA-256) a quelli di `backup/d1/sandbox/acasystem`.
- **Nota di metodo (due insidie).** (1) `git apply -p1` lanciato **dentro** `progetto/acasystem` risponde «ok» ma **non scrive nulla**: in una sottocartella applica soltanto i percorsi sotto la cartella corrente, e le patch hanno percorsi dalla radice dell'albero (`backend/…`, `frontend/…`). Il `--check` del flusso precedente su questo albero sarebbe stato vuoto. Si applica dalla radice del repository con `git -c core.autocrlf=false apply -p1 --directory=progetto/acasystem <patch>`. (2) `backend/src/middlewares/rateLimit.ts` è l'unico file toccato con fine riga CRLF (tutti gli altri LF): la patch LF non si applica a quel file. Si è applicata la patch LF con `--exclude` di quel file e, per quel solo file, una copia della patch con CR sulle righe dei hunk (`--include`): il file è rimasto interamente CRLF e il suo diff è di 9 righe.

### Segnalazione 1: volume separato per il segreto [realizzato]

- `progetto/compose.tunet.yaml`: nuovo volume nominato `tunet-service-secret` (diventa `aca-tunet_tunet-service-secret`), montato in `/app/service-secret`, e `TUNET_SERVICE_SECRET_FILE: /app/service-secret/service-identity.json`. Il volume dei dati è invariato, quindi le copie a freddo di `aca-tunet_tunet-data` non lo contengono. Non è impostato `TUNET_SERVICE_SECRET_ALLOW_DATA_DIR`.
- **Codice:** nessuna modifica necessaria. `readDeviceServiceSecretPath()` e `isSecretInsideDataDir()` leggono già la variabile; `activate` rifiuta di salvare il segreto dentro `DATA_DIR` senza un volume separato (messaggio «Monta un volume separato…»), quindi **senza questa modifica il comando non partirebbe sul banco**. Il container gira come root: il volume nominato è scrivibile e il file resta `0600`. La cartella di montaggio ha il modo del volume (di norma 0755), non 0700 [limite: il codice imposta 0700 solo se crea la cartella; non l'ho forzato, per non cambiare i permessi di cartelle arbitrarie].
- **Test nuovo:** `backend/src/__tests__/devicesComposeSecret.test.ts` (3 test): il compose dichiara `tunet-data` e `tunet-service-secret`; il montaggio è fuori da `DATA_DIR`, la variabile punta dentro il montaggio e `isSecretInsideDataDir` lo accetta; nessun `ALLOW_DATA_DIR` fisso. Si salta se il compose non è accanto ai sorgenti (immagine).
- **Non toccato:** `TUNET_INTERNAL_HA_URL` (resta `http://host.docker.internal:8123`, cioè l'HA di Docker del banco) e il binding LAN, che altri flussi hanno modificato.
- **Da sapere:** ripristinare una copia a freddo di `tunet-data` non ripristina il segreto: in quel caso va rilanciato `activate`. Una copia del nuovo volume va trattata come un segreto.

### Verifiche (albero principale, dopo l'unione)

| Comando | Esito |
|---|---|
| `npm run typecheck` e `npm run lint` nel backend | superati (nessun errore, nessun avviso) |
| `npx vitest run --maxWorkers=4` nel backend | **30 file, 428 test superati, 1 saltato** (il test dei permessi `0600`, solo POSIX), 12 s |
| Frontend `npm run typecheck` (tsc strict) | superato |
| Frontend `npm run lint` (eslint) | superato |
| `npm run lint:typography` / `npm run lint:theme-colors` | 0 violazioni (537 / 355 file) |
| Frontend suite completa in quattro parti, `--maxWorkers=4 --shard=k/4`, in primo piano | 1/4: 53 file, 783 test; 2/4: 53 file, 1033; 3/4: 52 file, 759; 4/4: 52 file, 628. **210 file, 3203 test, tutti superati** |
| `npm run i18n:check` | 4 test superati |
| `npm run build` (frontend) | costruito in 2,1 s; avviso sui chunk oltre 500 kB (già presente) |
| `node scripts/check-bundle-size.mjs` | tutti entro i limiti; `index` 870,0 kB su 900 [margine di 30 kB] |

Prima di ogni corsa si è controllato che non girasse un Vitest di `progetto/acasystem`. Non eseguito: Playwright, controllo visivo e prova nel browser, immagine Docker, banco, tablet, TV, VM, fixture di contratto CT-01…CT-14.

### Passi del banco D1 per l'agente principale (preparati, non eseguiti)

Ordine consigliato. I passi con credenziali o col televisore li fa l'utente.

1. **Prima di costruire.** Versione nuova (per prassi): `ACASYSTEM_VERSION` in `progetto/.env`, `frontend/e2e/isolated-server.mjs` e `frontend/e2e/release.check.mjs` (da 0.9.30 a, per esempio, 0.9.31). Copie di `.env`, `compose.tunet.yaml` e dei due file e2e in `backup/`; copia a freddo come per le versioni precedenti: `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml stop tunet`, poi `tar czf` del volume `aca-tunet_tunet-data` (montato in sola lettura) in `backup/banco/tunet-data-pre-D1-freddo.tgz`.
2. **Punta Acasystem all'HA della VM.** In `progetto/compose.tunet.yaml` sostituisci `TUNET_INTERNAL_HA_URL: http://host.docker.internal:8123` con **`TUNET_INTERNAL_HA_URL: http://192.168.56.10`** (porta 80, **nessun `:8123`**: D-I8; nessun `TUNET_INTERNAL_HA_FALLBACK_URL`). **Conseguenza:** gli accessi e gli utenti diventano quelli dell'HA della VM (proprietario creato il 2026-10-23, più «cliente»), non più quelli dell'HA di Docker; i dati del profilo in `tunet.db` sono associati agli utenti dell'HA precedente e potrebbero non riapparire per un utente diverso [non verificato]. Ritorno indietro: rimettere la riga di prima.
3. **Costruisci e avvia** (dalla radice del repository, come nelle tappe precedenti): `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d --build`. Crea il volume `aca-tunet_tunet-service-secret` e monta il segreto fuori dai dati. Controlli: `GET /api/health` con la versione nuova; `docker volume ls` mostra i due volumi; `docker exec aca-tunet-tunet-1 node src/cli/deviceServiceIdentity.ts status` risponde che il servizio non è stato attivato (uscita 1) **senza** l'avvertimento sul volume dei dati.
4. **Raggiungibilità dal container (tappa I4).** `docker exec aca-tunet-tunet-1 wget -qO- -T 5 http://192.168.56.10/auth/providers` deve stampare un JSON con `providers`. Se non risponde, **fermarsi e riferirlo**: significa che Docker Desktop non instrada verso la rete Host-Only (192.168.56.0/24, il PC è 192.168.56.1) [non verificato]; l'indirizzo del ponte (192.168.1.183) è chiuso apposta (D-I8), quindi non è un ripiego. Con il servizio non attivo `GET /api/dispositivi/stato` risponde «Servizio non attivo» o che Home Assistant non è raggiungibile.
5. **L'utente in HA (VM), nel suo browser** su `http://192.168.56.10`, entrando come proprietario: Impostazioni > Persone > Utenti > Aggiungi utente: nome «Cliente», nome utente **`cliente`**, una password a sua scelta, **«Amministratore» spento** (facoltativo «Può accedere solo dalla rete locale»). Serve a provare il percorso del cliente (non vede il MAC; vede «Richiede l'installatore» per le altre integrazioni). L'agente non crea l'utente e non vede la password.
6. **`activate` (D1s), lanciato dall'utente nel proprio terminale** (serve un terminale interattivo: senza `-it` risponde con un rifiuto, uscita 2):

   ```
   docker exec -it aca-tunet-tunet-1 node src/cli/deviceServiceIdentity.ts activate
   ```

   Il comando chiede «Utente proprietario:» (visibile), «Password:» (nascosta) e, solo se HA lo chiede, «Codice di verifica:» (nascosto). Non salva le credenziali: crea l'utente «Acasystem (servizio)» (amministratore, `local_only`), ottiene il token a lunga durata, prova una scrittura (apre e annulla un flusso `webostv`), salva solo il token in `/app/service-secret/service-identity.json` e revoca le sessioni della corsa. Poi `docker exec aca-tunet-tunet-1 node src/cli/deviceServiceIdentity.ts status` stampa che il servizio è attivo e la scadenza del token (uscita 0, nessun segreto). Un secondo `activate` non chiede nulla («già attivo»). Opzioni: `--reactivate` (riattiva l'utente se sospeso), `--rotate` (nuovo token); `forget` cancella solo il file sul server. Per spegnere il servizio: sospendere l'utente «Acasystem (servizio)» in Persone > Utenti (spento entro 15 s, senza riavvio). **Punto di stop se `activate` fallisce:** riferire il messaggio italiano, senza ripetere credenziali.
7. **Prova col televisore (192.168.1.26), solo con l'utente presente al televisore.** Prerequisiti sul televisore: acceso, «LG Connect Apps» (o «Accensione mobile») abilitato, accensione tramite Wi-Fi/LAN abilitata, MAC annotato (Impostazioni > Generali > Rete), Netflix installato; l'utente deve poter accettare il messaggio di abbinamento. Ordine:
   1. Tablet, accesso come **proprietario** (amministratore): widget Android TV > «Collega» > «Aggiungi un dispositivo» (o «Aggiungi un widget» > Android TV > «Aggiungi un dispositivo») > LG webOS TV (`webostv`) > indirizzo 192.168.1.26 > conto alla rovescia di 10 s: accettare il messaggio sul televisore > nome e stanza > passo «Accensione»: scrivere il MAC e, sotto «Avanzate», il broadcast **192.168.1.255** (porta predefinita) > «Fine»: il widget mostra lo stato reale.
   2. Spegnere dal widget e aspettare che lo stato diventi «spento» (la voce può passare a `setup_retry`: limite noto). Poi **accendere dal widget**: il pacchetto lo manda HA della VM (automazione `acasystem_accensione_<id>` in Impostazioni > Automazioni della VM). È la prova più incerta (broadcast dal ponte Wi-Fi di VirtualBox, MAC sostituito: non verificato). In caso di insuccesso usare «Prova ad accendere» del passo di accensione e riferire il messaggio.
   3. **Aprire Netflix** dalla sezione «App» del widget (oggi compaiono tutte le sorgenti, anche HDMI: D-D18).
   4. Persistenza (D1p): `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml restart tunet`, ricaricare la pagina sul tablet: widget ancora collegato e funzionante; la voce e l'automazione restano in HA; dopo il riavvio `status` resta «attivo» (il segreto è nel volume separato).
   5. Accesso come **«cliente»** (non amministratore): il widget funziona; «Aggiungi un dispositivo» elenca `webostv` e `wake_on_lan` come avviabili e le altre con «Richiede l'installatore»; il passo di accensione non mostra il campo del MAC.
8. **Ritorno indietro** (in ordine): riportare `TUNET_INTERNAL_HA_URL` all'HA di Docker e `ACASYSTEM_VERSION` alla versione precedente, poi `up -d --build`; per i dati, `stop tunet` e ripristino di `tunet-data` dalla copia a freddo; il volume `aca-tunet_tunet-service-secret` non contiene dati dell'app e si può lasciare. In HA: sospendere l'utente «Acasystem (servizio)», rimuovere la voce `webostv` e la ricetta di accensione; oppure ripristinare la snapshot «dopo-preparazione-D1» della VM.

### Limiti e rischi rimasti [non risolti]

- Il comportamento del flusso dentro il foglio (`Sheet.tsx` della 0.9.28), il focus, l'altezza e il layout (anche su telefono) non sono provati nel browser né sul Tab M11.
- Gli altri Android TV che dichiarano TURN_ON/TURN_OFF o SELECT_SOURCE mostrano ora il pulsante di accensione e la sezione «App»: va detto all'utente.
- D-D6 (MAC proposto da Acasystem): oggi lo scrive l'amministratore; D-D18 (filtro delle app) e l'esclusione dell'automazione `acasystem_accensione_*` dal widget Automazioni restano aperte.
- Le fixture di contratto CT-01…CT-14 non esistono: la facciata non è mai stata provata contro un HA vero. La prova col televisore è la prima.
- `index` a 870 kB su 900 kB del controllo di dimensione.

### Punto di ripresa

L'albero principale contiene D1 (server, frontend, volume del segreto) con controlli verdi, senza commit e senza immagine ricostruita. Prossimi passi: i punti 1-4 (agente principale, Docker), 5-6 (utente), poi la prova del punto 7 con l'utente presente. Aggiornare `verification.md`, `project-status.md` e `compliance.md` (C-16, C-17) alla chiusura di D1z; non fatto qui perché i file sono modificati da altri flussi.

**Annotazione 2026-10-26 (Claude Code, `claude-opus-5-5`), senza modificare quanto sopra:** la tappa **D4 («Trovati»)** confluisce nel widget «Rileva dispositivi» ([REP-20261026-006](REP-20261026-006-rileva-dispositivi.md), fasi F2-F3), che mostra i dispositivi scoperti dentro il widget e nel foglio «Aggiungi un widget», come previsto dal criterio 2. Con [ADR-0024](../decisions/ADR-0024-aggiunta-libera-dispositivi-scoperti.md) il cliente può confermare qualunque flusso scoperto, non solo quelli in lista. D3 (catalogo con ricerca) resta com'è.
