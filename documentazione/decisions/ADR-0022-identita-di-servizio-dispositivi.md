# ADR-0022 — Identità di servizio dichiarata per le operazioni sui dispositivi avviate dal cliente

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0022 — Identità di servizio dichiarata per le operazioni sui dispositivi avviate dal cliente. L'identità è un utente di Home Assistant dedicato, la sua credenziale resta solo nel server di Acasystem e vale per una lista chiusa di operazioni. Integra ADR-0021 |
| Stato | **Accettata** il 2026-10-23, con le scelte a1 + b1 + d di D-D22 (era «Proposta» dalla bozza dello stesso giorno) |
| Data e autore | 2026-10-23. Bozza di Claude Code (Opus 5.5, `claude-opus-5-5`), scritta nell'allineamento D1 di [REP-20261023-003](../reports/REP-20261023-003-piano-aggiungi-dispositivi.md), sezione «Permessi del cliente (2026-10-23)». Analisi preparatoria di Claude Code (Sonnet 5.5, `claude-sonnet-5-5`) in `backup/allineamento-d1/permessi-cliente.md`, cartella esclusa da Git |
| Decisore e autorizzazione | **Utente, 2026-10-23, D-D22** di REP-20261023-003 (sezione «Decisioni D-D22 e D-D23 e avvio di D1»): «Identità di servizio (consigl.)», con il testo dell'opzione: «Un utente di HA dichiarato «Acasystem (servizio)» che crei tu con un comando nel tuo terminale (digiti tu le credenziali del proprietario, io non le vedo). Il server lo usa solo per un elenco chiuso di operazioni, con registro; si revoca sospendendolo. Il cliente avvia solo le integrazioni in elenco (in D1: TV LG e accensione via rete), le altre dicono «Richiede l'installatore». Il tablet usa un account non amministratore.» Lettura dell'agente: a1 + b1 + d = sì. Fonti umane che delimitano la proposta, entrambe del 2026-10-23: la risposta a D-D1, «Anche il cliente»; l'incarico «Chiarisci prima dell'implementazione come consentire queste operazioni al cliente, dato che i flussi di HA richiedono privilegi amministrativi. Proponi una soluzione motivata e indicami la decisione necessaria. Non rendere automaticamente amministratore il cliente e non introdurre implicitamente un'identità privilegiata.» |
| Collegamenti | REQ-06/AC-06, REQ-02, REQ-15; [ADR-0009](ADR-0009-home-assistant-dietro-acasystem.md), [ADR-0021](ADR-0021-configurazione-dispositivi-da-acasystem.md); [REP-20261023-003](../reports/REP-20261023-003-piano-aggiungi-dispositivi.md), [REP-20261023-004](../reports/REP-20261023-004-confronto-installazione.md) (sezione «Conclusione richiesta il 2026-10-23»); ISSUE-006, ISSUE-008; domanda D-D16 |
| Sostituisce / sostituita da | Nessuna. Accettata: integra ADR-0021 e ne supera due passaggi, solo per le operazioni della lista: la frase «Inoltra a HA con il token dell'utente: non esiste un token di servizio» (punto 2) e il punto 7, la «variante minima», già superata dalla risposta a D-D1. ADR-0021 va annotata con il collegamento a questo ADR |

## Contesto ed evidenze

Fatti letti nel codice di Home Assistant ai tag 2026.9.4 (commit `9212531f40a0b7b23229a90d688dd79d9dfccff4`) e 2026.10.2, e nella documentazione consultata il 2026-10-23. Nessuno è stato provato su un HA acceso.

- **Permessi di HA.** In HA avviare e proseguire i flussi di configurazione, aprire le opzioni, rimuovere una voce, scrivere nei registri e nelle automazioni richiedono `user.is_admin`. Lo stesso vale per due letture: il catalogo `integration/descriptions` e i dispositivi trovati, `config_entries/flow/subscribe` (`components/config/config_entries.py`, `components/websocket_api/decorators.py`, `components/http/decorators.py`).
- **Nessun ruolo intermedio.** In HA non esistono ruoli intermedi né token con ambito ridotto: le policy riguardano solo le entità (`https://contributors.home-assistant.io/core/internals/permissions/`).
- **Creazione di utenti e token.** Un amministratore crea utenti con `config/auth/create` (`name`, `group_ids`, `local_only`) e le relative credenziali con `config/auth_provider/homeassistant/create`. Questi comandi sono interni; nella versione 2026.10.2 hanno nuovi errori e protezioni del proprietario. Il token a lunga durata (`auth/long_lived_access_token`, documentato) si crea solo per l'utente collegato.
- **Revoca.** Un amministratore sospende o elimina un utente con `config/auth/update` o `config/auth/delete`.
- **Token delle app su HAOS.** Su HAOS un'app con `homeassistant_api: true` riceve un token del Supervisor che agisce «come amministratore» di HA, anche su utenti e credenziali, senza un utente visibile nell'elenco (`https://contributors.home-assistant.io/apps/guides/communication/`).
- **Acasystem oggi** [realizzato, commit `7298d4d` con modifiche locali]:
  - verifica il token del browser con `auth/current_user`;
  - non ha un token di servizio;
  - il tunnel WebSocket `/ha/api/websocket` è un `pipe` non filtrato;
  - la facciata `/api/dispositivi` di ADR-0021 è accettata ma non realizzata.
- **Decisioni dell'utente.** L'utente ha deciso che anche il cliente aggiunge e configura (D-D1). Ha vietato di renderlo amministratore e di introdurre implicitamente un'identità privilegiata. REQ-06/AC-06, approvato e non realizzato, chiede che il cliente finisca «senza privilegi admin residui».

Inferenza [valutazione]: con i soli meccanismi di HA non si può dare a un utente non amministratore il potere di aggiungere dispositivi. Il confine più stretto si può costruire solo in Acasystem.

## Decisione (proposta dell'agente, accettata il 2026-10-23)

Il testo seguente è la proposta come fu scritta; l'accettazione e le sue conseguenze sono in «Accettazione del 2026-10-23» in fondo.

1. **Livello cliente.** Il tablet del cliente usa un utente di HA **non amministratore**. Per una **lista chiusa** di operazioni, la facciata `/api/dispositivi` agisce con un utente di HA dedicato, «Acasystem (servizio)». La lista comprende:
   - avvio dei gestori ammessi;
   - passi e annullamento dei propri flussi;
   - nome e stanza dei dispositivi delle voci ammesse;
   - ricetta di accensione;
   - letture del catalogo e dei dispositivi trovati;
   - in seguito, rimozione di voci ammesse con doppia conferma.

   Prima di agire, la facciata verifica sul server che chi chiama abbia una sessione HA valida e controlla l'appartenenza del flusso.
2. **Livello installatore.** Le operazioni fuori dalla lista le fa una persona con il proprio account amministratore di HA: la facciata inoltra con il suo token e HA decide. Non c'è alcun ripiego sull'identità di servizio.
3. **Creazione dichiarata.** L'utente di servizio nasce solo da un passo esplicito di installazione, con un testo che dice che cosa verrà creato e che cosa potrà fare. In D1 il passo è un comando sul server; dall'installazione pulita in poi, una schermata del primo avvio.
   - Il passo usa le credenziali del proprietario, digitate dalla persona che installa e mai salvate. In D1 il comando lo lancia l'utente nel proprio terminale (per esempio `docker exec -it`): nessun agente digita, legge o riceve le credenziali, e l'esito non contiene segreti.
   - Crea l'utente nel gruppo amministratori con `local_only` e una password casuale che non viene conservata.
   - Ottiene il token e lo scrive in un file riservato del server (permessi `0600`), su un volume separato dai dati e dalle copie a freddo.
4. **Invarianti:**
   - il token di servizio non arriva mai al browser, alle risposte, ai log, al registro, a `tunet.db` né alle copie;
   - il tunnel `/ha` inoltra solo il token dell'utente;
   - senza identità attiva, scaduta o sospesa, la funzione è **negata** con il messaggio «servizio non attivo», senza ripiegare sul token dell'utente;
   - se il tablet gira con un account amministratore, gli amministratori vedono un avviso;
   - le automazioni si scrivono solo come ricette chiuse costruite dal server.
5. **Lista dei gestori.**
   - **Visibili:** tutte le integrazioni con flusso, con ricerca (D-D3).
   - **Avviabili dal cliente:** i tipi `device` e `hub` con flusso locale, meno un elenco di esclusione mantenuto in Acasystem. La prima versione si limita a `webostv` e `wake_on_lan`.
   - **Fuori lista:** compare «Richiede l'installatore».
   - **Precisazione di risposte già date:** con questa lista D-D1 («Anche il cliente») e D-D3 («Tutte con ricerca») valgono per la visibilità e la ricerca di tutte le integrazioni e per l'avvio dei soli gestori in lista. È una precisazione da accettare esplicitamente con D-D22 (b), non una restrizione implicita.
6. **Registro.** Ogni azione registra la persona (utente HA del tablet), l'azione, il dominio, `entry_id`, l'esito e l'ora, senza password, chiavi, MAC, indirizzi IP, contenuto dei campi o token.
7. **Revoca.** Si sospende o si elimina «Acasystem (servizio)» in HA: la funzione si spegne e il resto di Acasystem continua a funzionare.
8. **REQ-06/AC-06.** Proposta di integrazione:
   - il cliente non acquisisce privilegi amministrativi propri;
   - il server di Acasystem ha un'identità amministrativa dichiarata, limitata dalla lista e revocabile;
   - le operazioni fuori lista del cliente sono rifiutate con 403;
   - ogni azione è nel registro.

   Per le operazioni di amministrazione e il primo setup REQ-06 resta com'è. L'annotazione in `product.md` richiede la parte (d) di D-D22.

## Alternative e motivazioni

| Alternativa | Pro | Contro |
|---|---|---|
| **1. Identità di servizio dichiarata (proposta)** | Soddisfa D-D1 con il cliente non amministratore. L'identità è visibile in HA, creata da una persona e revocabile. Funziona sul banco D1 (Acasystem in Docker, HA nella VM), con HA Container e con HAOS. Si prova in un solo modo | Il confine di sicurezza è la lista della facciata, non HA. Il server custodisce un segreto da amministratore. In HA le azioni risultano dell'utente di servizio |
| 2. App HAOS con il token del Supervisor | Nessuna credenziale da creare o custodire | Poteri pieni e non riducibili, senza un utente visibile: è la forma più vicina a un privilegio implicito. Non disponibile sul banco D1. Non provata (T1 di REP-20261023-004) |
| 3. Solo sessione dell'installatore (REQ-06) | Ogni azione ha una persona; HA applica il proprio controllo | Esclude il cliente e contraddice D-D1. Resta come livello installatore |
| 4. Richiesta approvata da un amministratore | Una persona dice sì a ogni operazione sensibile | Non regge flussi interattivi come l'abbinamento del TV, che dura circa 10 s. Servono coda, notifiche e interfaccia. Resta come possibile valvola futura |
| 5. Cliente amministratore | Nessun lavoro | Esclusa dall'utente. Viola AC-06. Un tablet rubato avrebbe pieni poteri, anche dal tunnel |

**Questioni irrisolte:**

- l'elenco di esclusione dei gestori: non è stato studiato quali integrazioni leggono file o raggiungono indirizzi interni;
- la rimozione da parte del cliente (D-D22 c, tappa D6);
- il filtro del tunnel (D-D16), che non blocca D1 se il tablet non è amministratore;
- chi custodisce la password del proprietario (D-C5);
- la visibilità del registro (D-D14).

## Conseguenze

- **Comportamento.**
  - Il cliente aggiunge e configura i dispositivi ammessi dai fogli «Collega» e «Aggiungi un widget».
  - Ciò che sta fuori lista richiede l'installatore.
  - Senza identità attiva, la funzione è spenta con un messaggio chiaro.
  - Con il tablet non amministratore, le funzioni di Acasystem oggi riservate a `is_admin`/`is_owner` (in Sistema la posizione della casa, che scrive con `config/core/update`, e le sezioni condizionate al ruolo; la scrittura del piano della Casa 3D) spariscono o rispondono 403 sul tablet del cliente e restano all'installatore [verificato: lettura del codice, 2026-10-23]. Questo ADR non le sposta nella facciata; farlo richiede un'autorizzazione separata.
- **API e dati.**
  - Nuovo segreto lato server, fuori da `tunet.db` e dalle copie.
  - Registro delle azioni in `tunet.db`.
  - Usa endpoint interni di HA (`config/auth/*`, `config/auth_provider/homeassistant/*`), versione supportata 2026.9.4, coperti dai test di contratto CT-14 e dalle sonde RD-09 del piano.
- **Sicurezza.**
  - La lista della facciata diventa parte della sicurezza di HA: un errore nella lista è un'escalation di privilegi.
  - Chi compromette il server o il volume dei segreti ottiene l'amministrazione di HA.
  - Mitigazioni: `local_only`, porta di HA limitata ad Acasystem (D-I8), file riservato, nessun ripiego.
- **Operazioni.**
  - Il passo di attivazione richiede il proprietario.
  - Se il token si perde o scade, l'installatore rifà il passo.
  - La revoca si fa in HA.
- **Conformità.** Voci da aggiungere a `compliance.md`: segreto di servizio e registro.
- **Requisiti.** Annotazione di REQ-06/AC-06 e nuovo requisito per la lista e il registro, con il prossimo numero libero, se D-D22 (d) è approvata.

## Verifiche e revisione

Nessun risultato esiste ancora. Verifiche previste dall'incarico D1 di REP-20261023-003:

- **Backend con un finto HA:**
  - 403 fuori lista e per un flusso altrui;
  - «servizio non attivo» senza ripiego;
  - 0 occorrenze del token di servizio e delle credenziali di prova in risposte, log, registro e `tunet.db`;
  - il tunnel inoltra solo il token dell'utente.
- **Banco con HA reale nella VM:**
  - attivazione dell'identità;
  - utente visibile in HA;
  - tablet con utente non amministratore che aggiunge il TV;
  - sospensione dell'utente di servizio, fatta dall'utente in HA (Persone > Utenti), che spegne la funzione e lascia attivo il resto; poi riattivazione, sempre a cura dell'utente, e ritorno della funzione;
  - regressione per account: le funzioni riservate agli amministratori risultano nascoste o negate con messaggio chiaro per il cliente e invariate per l'amministratore;
  - dopo i riavvii, identità ancora valida.
- **Registro eventi di HA:** come risultano in HA le azioni dell'utente di servizio [non verificato].

**Revisione se:**

- HA introduce ruoli o token con ambito ridotto;
- cambiano i comandi degli utenti o dei flussi;
- si sceglie l'app HAOS con il token del Supervisor per i clienti;
- si realizza la sessione installatore di REQ-06;
- si decide D-D16.

**Annotazione 2026-10-23, revisione della bozza (Claude Code, Opus 5.5):** aggiunti, ancora come proposta, il lancio del comando di attivazione da parte dell'utente nel proprio terminale (punto 3), la precisazione di D-D1 e D-D3 (punto 5), la conseguenza sulle funzioni già riservate agli amministratori (Conseguenze) e le verifiche di sospensione/riattivazione e di regressione per account. Lo stato resta «Proposta».

## Accettazione del 2026-10-23

**Fonte umana:** risposta dell'utente a D-D22, citata nel campo «Decisore e autorizzazione». Registrata in [REP-20261023-003](../reports/REP-20261023-003-piano-aggiungi-dispositivi.md), sezione «Decisioni D-D22 e D-D23 e avvio di D1». Annotazione di Claude Code (Sonnet 5.5, `claude-sonnet-5-5`). Il testo della proposta sopra non è stato modificato.

**Che cosa è accettato [lettura dell'agente]:**

- **a1.** L'identità di servizio dichiarata «Acasystem (servizio)», creata da una persona, con la credenziale solo nel server. In D1 il passo è un comando lanciato dall'utente nel proprio terminale, con le credenziali del proprietario digitate da lui: nessun agente le legge, le digita o le riceve (punto 3). Il tablet usa un account non amministratore.
- **b1.** Il catalogo è visibile e ricercabile su tutte le integrazioni; il cliente avvia solo i gestori in lista, in D1 `webostv` e `wake_on_lan`. Le altre dicono «Richiede l'installatore». **b1 precisa in modo esplicito D-D1 («Anche il cliente») e D-D3 («Tutte con ricerca»)**: valgono per la visibilità e la ricerca di tutte le integrazioni e per l'avvio dei soli gestori in lista (punto 5).
- **d = sì.** Il cliente non acquisisce privilegi amministrativi propri; il server ha un'identità amministrativa dichiarata, limitata dalla lista e revocabile; le operazioni fuori lista sono rifiutate con 403; ogni azione è nel registro (punto 8). Annotata su REQ-06/AC-06 in `product.md` e registrata come nuovo requisito **REQ-18** (AC-18).

**Che cosa non è deciso:** (c) la rimozione di voci da parte del cliente (tappa D6); il filtro del tunnel `/ha` (D-D16); l'elenco di esclusione dei gestori oltre D1; chi custodisce la password del proprietario (D-C5); la visibilità del registro (D-D14). Spostare nella facciata le funzioni oggi riservate agli amministratori richiede un'autorizzazione separata.

**Conseguenze aggiunte dall'accettazione:**

- **Segreto e registro.** Il segreto di servizio e il registro delle azioni sono registrati in `compliance.md` (C-16, C-17) e il requisito in `product.md` (REQ-18).
- **ADR-0021.** Il punto 2 («Inoltra a HA con il token dell'utente: non esiste un token di servizio») e il punto 7 (la «variante minima») sono superati solo per le operazioni della lista; ADR-0021 va annotata con il collegamento a questo ADR (annotazione da fare con la parte server di D1).
- **Ordine di lavoro.** La parte server di D1 si prova solo con un HA finto nei test; la parte app e la VM con HA nuovo (D-D23 a-9.4) seguono la 0.9.28. Nessun risultato su HA reale esiste ancora: le verifiche elencate in «Verifiche e revisione» restano da eseguire.
- **Stato di REQ-06/AC-06.** Il debito dichiarato su AC-06 resta fino alla sessione dell'installatore; vedi `product.md`.

**Annotazione 2026-10-26 (Claude Code, `claude-opus-5-5`):** il punto b1 (lista chiusa dei gestori avviabili dal cliente) è superato **per i soli flussi scoperti da HA** da [ADR-0024](ADR-0024-aggiunta-libera-dispositivi-scoperti.md), su decisione dell'utente («Tutti, aggiunta libera»). Per l'avvio dal catalogo b1 resta valido. Identità di servizio, registro e revoca restano quelli di questo ADR.

**Annotazione 2026-10-27 (Claude Code, `claude-opus-5-5`):** con l'approvazione di F4 ([REP-20261026-006](../reports/REP-20261026-006-rileva-dispositivi.md); utente: «Approvo F4: niente liste per il cliente, moduli generici dallo schema di HA, passi esterni (accesso al cloud)…») il punto **b1 è superato per intero**: il cliente avvia qualunque gestore del catalogo, non solo quelli in lista. Restano validi:
- l'identità di servizio dichiarata;
- l'elenco chiuso delle **operazioni** della facciata (cosa si può fare, non con quali integrazioni);
- il registro;
- la revoca;
- il divieto di ripiegare sul token dell'utente.

Le integrazioni di sistema (Supervisor, backup, Sole, Meteo…) restano escluse dalla rimozione. Dettaglio in [ADR-0024](ADR-0024-aggiunta-libera-dispositivi-scoperti.md).

