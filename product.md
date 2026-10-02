# ACA SYSTEM 2.0 – Product Requirements Document (PRODUCT.MD)
**Documento di Requisiti di Prodotto, Specifiche Hardware e Architettura Funzionale**

**Specifica evolutiva — aggiornata il 2026-10-02.** Le funzionalità e le soluzioni applicative sono **proposte da validare**, non implementazioni o approvazioni tecniche già acquisite. Le priorità esprimono l'intento iniziale; l'incarico umano corrente determina cosa è autorizzato realizzare.

La [copia originale](docs/archive/product-original-2026-10-02.md) resta immutata. [ADR-0001](docs/decisions/ADR-0001-documentazione-e-storico.md) approva documentazione e storico locale, senza approvare lo stack applicativo. Lo [stato reale](docs/project-status.md), il [registro dei vincoli](docs/compliance.md) e l'[audit iniziale](docs/reports/REP-20261002-001-audit-product.md) descrivono evidenze, limiti e decisioni ancora aperte.

Gli ID `REQ-00`–`REQ-16` sono conservati. I requisiti diventano **Approvati** soltanto con una richiesta/decisione umana identificabile; possono essere **Rimandati** o **Ritirati** mantenendone lo storico. Una proposta documentata non è un incarico assegnato. I criteri della sezione 11 sono anch'essi proposti; le verifiche previste ed eseguite sono distinte in [verification.md](docs/verification.md).

---

## 1. Requisiti Hardware di Partenza & Setup Iniziale Hetzner (Proposte da Validare)
La dotazione hardware e il setup cloud seguenti sono una base proposta per il banco e l'impianto pilota. Modelli, compatibilità, disponibilità e dimensionamento richiedono verifica prima di acquisti o installazioni; non costituiscono una garanzia di stabilità. Questioni aperte: [ISSUE-005](docs/project-status.md#issue-005), [ISSUE-011](docs/project-status.md#issue-011) e [ISSUE-012](docs/project-status.md#issue-012). La conformità delle installazioni fisiche resta un ambito separato da questo registro software/cloud.

### 1.1 Distinta Base Hardware (Cosa va acquistato per una configurazione tipo d'impianto)

#### A. Gateway Locale d'Impianto (Edge Controller da Quadro Elettrico)
Il gateway locale proposto esegue **Home Assistant Container** (Core in Docker) e gestisce i collegamenti con sensori, contatori e relè. Modalità d'installazione e servizi complementari restano da approvare ([ISSUE-004](docs/project-status.md#issue-004)).
* **Opzione Proposta (Residenziale standard & Hotel):**
  * **Raspberry Pi Compute Module 4 (CM4)** con memoria **eMMC integrata** (8GB/16GB/32GB). Preferenza iniziale da valutare rispetto a carico, storage e recupero; la durata delle microSD non è stata misurata.
  * Baseboard industriale con montaggio su **barra DIN** (es. Waveshare CM4-IO-BASE-BOX-B o baseboard Edatec); disponibilità di RS485 e isolamento da verificare sul modello esatto.
  * **Alimentatore Industriale:** Da guida DIN 24V / 12V con stabilizzazione di tensione (es. Mean Well HDR-15 o HDR-30).
* **Opzione Alternativa per Grandi Strutture (B2B / Ristoranti / Centri Direzionali):**
  * **Mini PC Fanless Industriale x86:** Processore Intel N100 / N97 quad-core, 8GB/16GB RAM DDR5, SSD NVMe M.2 128GB+, doppia porta Gigabit Ethernet RJ45.
* **Radio Zigbee e supporto Thread/Matter da Definire:**
  * **1x Dongle USB Coordinatore Zigbee 3.0 proposto:** Modello con antenna esterna (es. *Sonoff Zigbee 3.0 USB Dongle Plus-E* oppure *Nabu Casa SkyConnect/ZBT-1*). Il supporto Thread/Matter richiede una configurazione distinta da precisare; il funzionamento simultaneo Zigbee/Thread sullo stesso ZBT-1 non è assunto come soluzione di produzione ([ISSUE-005](docs/project-status.md#issue-005)).
  * Prolunga cavo USB schermato da 1 metro (indispensabile per allontanare l'antenna dalle interferenze elettromagnetiche del processore e del quadro elettrico).
* **Interfaccia Seriale per Contatori e Pompe di Calore:**
  * **1x Adattatore USB-to-RS485 isolato industrial grade** (chip FTDI FT232R o CP2102) con protezione da sovratensioni (TVS).

#### B. Tablet Touch a Muro (Client Fisico Kiosk Mode)
* **Specifiche Tablet Consigliate:**
  * Tablet Android 10" o 11" (es. *Samsung Galaxy Tab A9+ Wi-Fi* oppure *Lenovo Tab M11*) con almeno 4GB di RAM e schermo IPS Full HD (1920x1200) ad alta luminosità.
  * *In alternativa per installazioni lusso a filo muro:* Pannello touch industriale Android PoE a incasso su scatola 503/506 (con alimentazione diretta via cavo Ethernet).
* **Alimentazione & Fissaggio a Parete:**
  * Staffa / Cornice da parete a basso profilo specifica per il modello del tablet.
  * Modulo alimentatore da incasso 220V -> 5V/3A USB-C da alloggiare nella scatola di derivazione (503) dietro al tablet, con cavo piatto a 90° per alimentazione continua senza cavi visibili.

#### C. Kit Dispositivi Minimi di Riferimento per Test e Collaudo (MVP)
Per validare l'intero stack (comandi, telemetria, scenari e distacco carichi) è necessario avere a banco:
* **1x Contatore di Energia Modbus RS485:** Modello da guida DIN bidirezionale (es. *Eastron SDM120 / SDM230 Modbus* o *Carlo Gavazzi EM111*).
* **2x Moduli Relè Smart (Luci e Carichi):** Relè da incasso o da barra DIN, con protocollo da confermare sul modello scelto (es. *Sonoff ZBMINIL2* o *Shelly 1PM Gen3*, quest'ultimo Wi-Fi/Bluetooth).
* **1x Sensore Presenza & Luminosità:** Sensore radar mmWave proposto (es. *Aqara FP2*, Wi-Fi/Bluetooth, o un modello Zigbee Tuya da verificare). Eventuale combinazione con PIR, capacità e integrazione richiedono collaudo.
* **1x Testa Termostatica Smart (TRV):** Per radiatori, protocollo Zigbee (es. *Sonoff TRVZB* o *Moes Zigbee TRV*).

---

### 1.2 Setup e Gestione dell'Infrastruttura Hetzner (Premesse Cloud)

Il server Hetzner è proposto come Hub centrale. Le risorse e i componenti sotto elencati sono candidati; disponibilità reale, costi, rete e operazioni sono da definire in [infrastructure.md](docs/infrastructure.md). Nessun provisioning è stato eseguito in questo incarico.

#### A. Risorse e Tier Macchina Virtuale Hetzner Consigliati
* **Tipo Server:** Riferimenti iniziali Hetzner Cloud **CPX31** (4 vCPU, 8 GB RAM, 160 GB SSD nel documento originale) oppure **CPX41** (8 vCPU, 16 GB RAM). Specifiche e disponibilità attuali da ricontrollare; adeguatezza al modello AI da misurare, non garantita.
* **Sistema Operativo:** Ubuntu 24.04 LTS x64 (Server Minimal).
* **IP Pubblico Dedicato:** 1x IPv4 statico con record DNS puntato (es. `api.acasystem.it`, `cloud.acasystem.it`).

#### B. Componenti Software Proposti per Hetzner
1. **Container Engine & Orchestrazione:** Docker Engine + Docker Compose per garantire isolamento e riproducibilità.
2. **Reverse Proxy & Gestione Certificati SSL:**
   * Nginx Proxy Manager o Traefik con rinnovo automatico certificati Let's Encrypt (porte 80 e 443 aperte sul firewall Hetzner).
3. **Reverse Tunnel Broker (Per connettere i gateway locali senza aprire porte):**
   * Server **WireGuard VPN** oppure **Rathole / WSS Relay**.
   * Il gateway locale del cliente si collega in uscita verso Hetzner; Hetzner instrada il traffico WebSocket senza richiedere IP pubblico statico o port-forwarding presso il cliente.
4. **Database Centrale (PostgreSQL + TimescaleDB):**
   * Tabelle: Utenti, Ruoli, Token sessione, Registro Impianti/Gateway ID, Catalogo Scenari con tag, Audit log.
5. **Identity Provider & Token Gateway (Backend Node.js/NestJS):**
   * Gestione OAuth Google (stile Tripers) ed Email con servizio **Resend**.
   * Riconoscimento automatico admin `@fourmemo.com`.
   * Servizio di Token Exchange: rilascia al frontend il token autorizzato per connettersi via WebSocket al gateway d'impianto assegnato.
6. **Motore AI Locale (Ollama / vLLM):**
   * Istanza **Ollama** in container, con download del modello quantizzato compatto (es. `llama3.2:3b` o `mistral:7b-instruct-q4_K_M`).
   * Esposizione solo su rete interna Docker (porta 11434 protetta, accessibile solo dal backend).

---

## 2. Visione Generale del Prodotto
* **2.1 Scopo del Progetto:** Realizzazione di una piattaforma domotica e di automazione avanzata (B2B e Residenziale evoluto) caratterizzata da un frontend moderno, personalizzabile e brandizzato, alimentato da un kernel domotico industriale affidabile e collaudato.
* **2.2 Filosofia Architetturale (Modello Ibrido Hub & Spoke):** 
  * Massima resilienza e continuità di servizio: le automazioni fisiche critiche funzionano in locale anche in assenza di connessione internet.
  * Il cloud centrale gestisce identità, intelligenza artificiale, backup e controllo remoto, mentre i gateway locali dialogano fisicamente con sensori e attuatori.
* **2.3 Conservazione delle Funzionalità:** Obiettivo originale conservato: nessuna funzionalità nativa di Home Assistant viene rimossa; il sistema espande le capacità con scenari e strumenti visuali. La modalità di copertura va precisata rispetto all'installazione, ai ruoli e alle app/add-on non incluse in Container; nessuna equivalenza completa con HA OS è stata verificata ([ISSUE-004](docs/project-status.md#issue-004)).

---

## 3. Architettura di Sistema: Modello Ibrido Hub & Spoke

* **3.1 Livello Edge / Gateway Locale (Spoke - Presso l'Immobile):**
  * È proposto **Home Assistant Container** (Core in Docker) per macchina a stati, event bus e collegamenti fisici (Modbus RS485, Zigbee USB, KNX, Wi-Fi locale). Integrazioni effettive e servizi complementari da verificare.
  * **Connessione Sicura in Uscita (Zero Port-Forwarding):** Connessione permanente crittografata verso Hetzner.
  * **Operatività Offline (Local-First):** In caso di blackout internet, continua a regolare temperature, distaccare carichi ed eseguire scenari senza alcuna interruzione.
  * **Criterio da Definire:** L'obiettivo offline va verificato separatamente per automazioni, controllo dal client e riavvio del tablet con credenziali scadute; non è ancora una garanzia realizzata ([ISSUE-007](docs/project-status.md#issue-007)).

* **3.2 Livello Cloud Centralizzato (Hub - Server Hetzner):**
  * Hosting dei servizi centrali: Identity Provider, Reverse Tunnel Broker, Hosting Modello AI, Catalogo Scenari e Database utenti.

---

## 4. Frontend & UI/UX Stack
* **4.1 Stack Tecnologico Frontend:**
  * **Framework & Bundler:** React + Vite + TypeScript proposti. React 18 era la versione indicata nell'originale; il manifest HAKit esaminato richiede React >=19.x. Versioni compatibili e adozione dell'SDK restano da decidere ([ISSUE-003](docs/project-status.md#issue-003)).
  * **Styling & Design System:** Tailwind CSS personalizzato per la brand identity di ACA SYSTEM.
  * **Motore Reattivo & Connessione Real-Time:** 
    * WebSocket bidirezionale ad alta velocità tramite libreria `home-assistant-js-websocket`.
    * Layer di astrazione React tramite **`@hakit/core`** per la gestione reattiva degli stati delle entità e l'invio dei comandi di servizio.
    * *In Rete Locale (LAN):* Connessione diretta proposta tra tablet e gateway. Il valore <30ms è un obiettivo iniziale da definire e misurare su un ambiente dichiarato.
    * *Da Remoto:* Connessione protetta proposta tramite il broker cloud Hetzner. Percorso, certificati, terminazione TLS e proprietà end-to-end da dimostrare ([ISSUE-013](docs/project-status.md#issue-013)).

* **4.2 Toolkit e Progetti di Riferimento (Adozione da Validare):**
  HAKit e Tunet sono candidati/riferimenti iniziali per ridurre il lavoro di sviluppo. La stima di risparmio >70% non è misurata. Licenze e modalità di riuso vanno risolte prima dell'adozione commerciale ([ISSUE-001](docs/project-status.md#issue-001), [ISSUE-002](docs/project-status.md#issue-002)); non è stata selezionata una soluzione alternativa.

  * **A. Framework SDK & Component Kit: HAKit (`ha-component-kit`)**
    * **Repository GitHub:** [shannonhochkins/ha-component-kit](https://github.com/shannonhochkins/ha-component-kit).
    * **Documentazione & Storybook:** [shannonhochkins.github.io/ha-component-kit](https://shannonhochkins.github.io/ha-component-kit/)
    * **Vincolo Verificato:** Le licenze dei pacchetti esaminati richiedono una licenza commerciale separata. Fonti/revisioni nel [registro di conformità](docs/compliance.md#fonti-e-revisioni-già-esaminate). Funzioni e API seguenti descrivono il ruolo atteso; disponibilità e compatibilità vanno verificate sulla versione scelta.
    * **Ruolo di `@hakit/core`:** SDK essenziale per collegare React a Home Assistant. Fornisce Custom Hook pronti all'uso (`useEntity`, `useService`, `useHass`) con aggiornamento istantaneo dello stato, gestione della cache locale, riconnessione automatica e tipizzazione TypeScript completa di ogni dispositivo. Elimina la complessità di dover gestire a mano il parsing dei messaggi WebSocket.
    * **Ruolo di `@hakit/components`:** Libreria di card e controller interattivi per React (controllo luci RGB/dimmer, termostato circolare clima, percentuali apertura tapparelle/cover, sensori e modali di dettaglio). Fornisce la logica di controllo avanzata da vestire con il design system e i token grafici proprietari ACA SYSTEM.

  * **B. Dashboard Template & Layout Base: Tunet**
    * **Repository GitHub:** [oyvhov/Tunet](https://github.com/oyvhov/Tunet)
    * **Thread Community:** [Tunet - A Modern Dashboard for Home Assistant](https://community.home-assistant.io/t/wip-tunet-a-modern-dashboard-for-home-assistant/990003)
    * **Vincolo Verificato:** GPL-3.0 nella revisione esaminata. L'uso come ispirazione e l'incorporazione di codice richiedono una scelta esplicita e la verifica delle condizioni pertinenti.
    * **Ruolo di Tunet:** Fornisce l'ispirazione architetturale per la struttura a griglia personalizzabile, la disposizione dei widget e la navigazione tra stanze/viste.

  * **C. Sinergia Operativa:**
    * **Tunet** guida l'impostazione macro (griglia dashboard, navigazione e sezioni).
    * **HAKit** alimenta il motore micro (Custom Hook per gli stati, reattività WebSocket e logica delle card dei singoli dispositivi).
    * **Tailwind CSS + Brand ACA:** Unifica il tutto sotto un'estetica proprietaria premium e moderna.

---

## 5. Gestione Account, Identity Provider & Policy Plugin
* **5.1 Autenticazione & Identity Provider su Hetzner (Stile Tripers):**
  * **Progettazione Aperta:** Associazione dell'identità ACA agli utenti HA, emissione/rinnovo/revoca dei token e comportamento offline richiedono un contratto verificabile ([ISSUE-006](docs/project-status.md#issue-006)); il token centrale non è automaticamente una credenziale accettata da HA.
  * Il backend su Hetzner funge da **Identity Provider & Token Gateway**:
    * **Login Social (Google OAuth):** Autenticazione diretta senza verifica email aggiuntiva.
    * **Registrazione Email + Password:** Invio email di conferma tramite servizio **Resend**; l'account è operativo solo a verifica completata.
  * **Token Exchange Trasparente:** L'utente effettua il login sul portale centrale; l'Identity Provider valida le credenziali, verifica l'impianto associato e rilascia al frontend il token di autorizzazione WebSocket per connettersi in modo sicuro al rispettivo gateway locale.
* **5.2 Ruoli e Livelli di Autorizzazione:**
  * **Policy da Validare:** Assegnazione e revoca dei privilegi, separazione degli impianti e controlli sulle API devono essere definiti lato server/gateway; la sola visibilità dei widget non realizza l'autorizzazione ([ISSUE-008](docs/project-status.md#issue-008)).
  * **Ruolo Amministratore (Admin):**
    * Assegnazione automatica per tutti gli account con dominio `@fourmemo.com`.
    * **Governance Totale dell'Applicativo:** L'amministratore stabilisce cosa l'applicazione può o non può fare:
      * Attivazione e revoca dei moduli funzionali/plugin per ciascun impianto.
      * Revisione, validazione e pubblicazione degli scenari domotici.
      * Supervisione della telemetria globale e gestione accessi.
  * **Ruolo Utente / Cliente Finale:**
    * Massima libertà di personalizzazione dell'interfaccia:
      * Personalizzazione della griglia e del layout della dashboard (aggiunta/rimozione/spostamento di card).
      * Caricamento della propria piantina/mappa di casa e posizionamento dei dispositivi.
      * Controllo diretto di tutte le entità assegnate (luci, clima, prese, tapparelle, sensori).
    * Limitazioni: l'utente non può modificare la policy dei moduli né creare automazioni a basso livello non validate.
* **5.3 Definizione dei "Plugin" come Feature Modules di Frontend:**
  * **Confine da Precisare:** Il widget è la parte di interfaccia. Moduli come distacco carichi e clima richiedono anche logiche locali, configurazioni e limiti operativi da progettare; l'etichetta frontend non elimina queste responsabilità ([ISSUE-009](docs/project-status.md#issue-009)).
  * I "Plugin" sono definiti a livello architetturale come **Feature Modules / Widget di Frontend** gestiti a licenza e permessi (es. *Modulo Piantina Interattiva*, *Modulo Clima & Zone*, *Modulo Monitoraggio Energetico / Distacco Carichi*, *Modulo Videosorveglianza*).
  * Non richiedono l'installazione di codice Python instabile a caldo su Home Assistant né riavvii di sistema.
* **5.4 Distribuzione e Aggiornamento "One-Click":**
  * **Ciclo da Progettare:** Sincronizzazione client e attivazione degli scenari sul gateway sono fasi distinte. Versioni, conferma di attivazione, errori parziali e ripristino richiedono una decisione e collaudo ([ISSUE-009](docs/project-status.md#issue-009)).
  * Quando l'amministratore abilita un nuovo Feature Module o rilascia nuovi scenari per un impianto, sull'interfaccia dell'utente (e sui tablet a muro) compare un **pulsante di aggiornamento rapido** (*"Aggiorna configurazione / Sincronizza"*).
  * Con un singolo tocco, il frontend ricarica i permessi e attiva istantaneamente le nuove schermate e funzioni.

---

## 6. Mappatura Interattiva della Casa (Floorplan & Piantina)
* **6.1 Caricamento Planimetria Personalizzata:**
  * Utente e sistemista possono caricare liberamente l'immagine della piantina (PNG, JPG, SVG).
  * Formati ammessi, gestione dei file, accessi e conservazione saranno definiti nell'incarico pertinente ([ISSUE-014](docs/project-status.md#issue-014)).
* **6.2 Posizionamento Dispositivi con Drag & Drop:**
  * Interfaccia visuale intuitiva: i dispositivi dell'impianto vengono selezionati da un drawer laterale e posizionati con Drag & Drop direttamente sulla planimetria.
  * Memorizzazione delle coordinate relative in percentuale (X%, Y%) rispetto alla risoluzione dell'immagine per garantire un rendering perfetto e reattivo su schermi di ogni dimensione (smartphone, tablet 8", 10", 15").
* **6.3 Controllo Interattivo da Piantina:**
  * Cliccando sui singoli pin è possibile visualizzare lo stato in tempo reale ed eseguire comandi immediati (on/off luci, regolazione temperatura, apertura varchi).
* **6.4 Predisposizione 3D (R&D Futura):**
  * Valutazione futura per rendering 3D tramite Three.js / WebGL, mantenendo il 2D come standard di produzione per garantire fluidità assoluta anche su tablet economici a parete.

---

## 7. Modulo AI Integrato & Generatore Intelligente di Scenari
* **7.1 Chatbot Conversazionale In-App (Stile ChatGPT / Gemini):**
  * Finestra di chat integrata nativamente nella dashboard, accessibile da amministratori ed eventuali utenti abilitati.
  * Permette di creare o modificare scenari dialogando in linguaggio naturale (es. *"Crea uno scenario per la notte: spegni tutte le luci tranne il corridoio al 10%, chiudi le tapparelle e metti il clima a 19.5°C se non c'è presenza per 20 minuti"*).
* **7.2 Hosting del Modello AI Self-Hosted Leggero (SLM / LLM):**
  * Il modello (es. Llama 3.2 3B o Mistral 7B via Ollama / vLLM) viene eseguito sul server cloud Hetzner.
  * Obiettivo: spostare il carico del modello fuori da tablet e gateway. Il valore <2s è una stima iniziale da verificare con modello, hardware, contesto e concorrenza dichiarati ([ISSUE-010](docs/project-status.md#issue-010)); licenze e dati trattati sono da valutare.
* **7.3 Middleware di Validazione Deterministico (Anti-Allucinazione):**
  * **Limite da Gestire:** Schema e riferimenti alle entità verificano struttura e identificativi; la correttezza funzionale e i limiti delle azioni richiedono ulteriori regole e prove. Le correzioni devono essere visibili nella bozza sottoposta ad approvazione ([ISSUE-010](docs/project-status.md#issue-010)).
  * Per evitare che il modello inventi entità inesistenti o sintassi errata:
    1. **Iniezione del Contesto Reale:** Il sistema passa al prompt solo l'elenco delle entità reali registrate sul gateway dell'impianto.
    2. **Guida Skill Markdown:** Il modello segue una skill in formato Markdown che codifica le regole sintattiche rigorose di Home Assistant (trigger, condition, action ammessi).
    3. **Validatore Deterministico (JSON/YAML Schema Validator):** Un middleware software automatico analizza l'output generato dall'AI prima che tocchi il sistema. Se rileva chiavi non valide o entità mancanti, corregge o rigetta la bozza.
    4. **Approvazione Amministratore:** Lo scenario validato viene presentato all'amministratore Fourmemo per la conferma definitiva con un click.
* **7.4 Database & Catalogo Scenari con Ricerca e Tag:**
  * Gli scenari approvati confluiscono in un database dedicato consultabile con filtri e ricerca rapida:
    * *Fasce Orarie:* Diurno, Notturno, Risveglio, Crepuscolare.
    * *Obiettivo:* Risparmio Energetico / Distacco Carichi, Comfort, Sicurezza, Simulazione Presenza.
    * *Stato:* Casa Piena, Fuori Sede, Vacanza, Pulizie.

---

## 8. Deployment Tablet a Muro & Operatività Sistemisti
* **8.1 Configurazione da Parte dei Sistemisti:**
  * I sistemisti effettuano il setup iniziale del tablet a muro effettuando l'accesso con le credenziali tecniche e associando il tablet al gateway locale dell'immobile.
* **8.2 Esperienza Kiosk a Muro:**
  * Esecuzione in modalità Kiosk a schermo intero (tramite Capacitor APK o Fully Kiosk), blocco delle impostazioni Android di sistema, touch reattivo, e gestione risveglio schermo su rilevamento presenza o tocco.

---

## 9. Tabella dei Requisiti Funzionali Ordinati per Priorità

**Stato iniziale:** tutti i requisiti applicativi sono Proposti, con realizzazione Non iniziata. Le soluzioni citate restano candidate. I criteri AC sono proposti nella sezione 11; la realizzazione corrente è mantenuta in [project-status.md](docs/project-status.md#stato-per-requisito).

| ID | Sezione | Descrizione del Requisito | Ruolo Coinvolto | Priorità | Stato | Criterio |
|---|---|---|---|---|---|---|
| **REQ-00** | Hardware | Approvvigionamento gateway CM4/MiniPC, dongle Zigbee, USB-RS485 e tablet | Sistemisti | P0 (Bloccante) | Proposto | AC-00 |
| **REQ-01** | Cloud Hetzner | Setup VM Hetzner con Reverse Proxy, Reverse Tunnel e Docker; tier da validare | DevOps | P0 (Bloccante) | Proposto | AC-01 |
| **REQ-02** | Architettura | Modello Hub & Spoke: gateway locale HA collegato a Hetzner | Sistema / DevOps | P0 (Bloccante) | Proposto | AC-02 |
| **REQ-03** | Frontend | Dashboard React/Vite/Tailwind; Tunet e HAKit candidati con licenze e versioni da validare | Grafica / Dev | P0 (Bloccante) | Proposto | AC-03 |
| **REQ-04** | Auth | Identity Provider su Hetzner: Google OAuth + Email con Resend | Tutti | P0 (Bloccante) | Proposto | AC-04 |
| **REQ-05** | Auth | Token Exchange trasparente verso gateway HA, contratto da progettare | Backend | P0 (Bloccante) | Proposto | AC-05 |
| **REQ-06** | Ruoli | Accesso Admin automatico per dominio `@fourmemo.com`, policy da validare | Fourmemo Staff | P0 (Bloccante) | Proposto | AC-06 |
| **REQ-07** | Plugin | Feature Modules controllati da Admin, con confini frontend/logiche locali da precisare | Admin | P0 (Bloccante) | Proposto | AC-07 |
| **REQ-08** | Distribuzione | Pulsante di aggiornamento rapido (One-Click Update) su client/tablet | Utenti / Tablet | P1 (Alta) | Proposto | AC-08 |
| **REQ-09** | Floorplan | Caricamento piantina 2D (PNG/JPG/SVG) e render responsive (X%, Y%) | Utente / Admin | P1 (Alta) | Proposto | AC-09 |
| **REQ-10** | Floorplan | Posizionamento dispositivi con Drag & Drop e controllo interattivo | Utente / Admin | P1 (Alta) | Proposto | AC-10 |
| **REQ-11** | AI / Chat | Chatbot in-app stile ChatGPT/Gemini per creazione guidata scenari | Admin / Utente | P2 (Medio/R&D) | Proposto | AC-11 |
| **REQ-12** | AI / Server | Hosting motore AI e modello SLM/LLM su Hetzner; candidati da verificare | Backend / R&D | P2 (Medio/R&D) | Proposto | AC-12 |
| **REQ-13** | AI / Sicurezza | Middleware di validazione deterministico e Skill Markdown per scenari | Dev / R&D | P2 (Medio/R&D) | Proposto | AC-13 |
| **REQ-14** | Scenari DB | Database e catalogo scenari con tassonomia (diurno, notturno, eco) | Backend / Admin | P2 (Medio/R&D) | Proposto | AC-14 |
| **REQ-15** | Tablet | Configurazione rapida tablet da parte dei sistemisti e Kiosk mode | Sistemisti | P1 (Alta) | Proposto | AC-15 |
| **REQ-16** | Floorplan | Valutazione supporto piantina 3D con Three.js / WebGL | R&D | P3 (Futuro) | Proposto | AC-16 |

---

## 10. Roadmap di Rilascio

Sequenza e sprint sono **stime iniziali non approvate come calendario**. Primo segmento cliente, dimensione dell'impianto, capacità del team e condizioni di ingresso/uscita delle fasi sono da definire ([ISSUE-012](docs/project-status.md#issue-012)). Licenze e decisioni aperte possono modificarne la fattibilità; nessuna fase è stata avviata. La preparazione documentale è un incarico distinto dalla roadmap applicativa.

1. **Fase 0 – Approvvigionamento Hardware & Setup Server Hetzner (Sprint 1):**
   * Ordine hardware banco di prova: Raspberry CM4/Mini PC, Dongle Zigbee, USB-RS485, Tablet Android, contatore Modbus e relè.
   * Provisioning VM Hetzner (CPX31/CPX41) con Docker, Reverse Tunnel Wireguard/WSS, Nginx con SSL e PostgreSQL.
2. **Fase 1 – Setup Ibrido Hub & Spoke, Auth & Gateway (Sprint 2-3):**
   * Installazione candidata Home Assistant Container per il gateway locale, con servizi complementari da definire.
   * Configurazione del tunnel sicuro in uscita dal gateway verso Hetzner (Zero Port-Forwarding).
   * Sistema di autenticazione centrale con Google OAuth, credenziali email con Resend e policy `@fourmemo.com`.
3. **Fase 2 – Custom Dashboard (Tunet + HAKit) & Kiosk Tablet (Sprint 4-5):**
   * Inizializzazione frontend combinando l'architettura a griglia di Tunet con il framework SDK HAKit (`@hakit/core` per Custom Hook e stati reattivi, `@hakit/components` per la logica dei controlli).
   * Re-theming completo con brand identity e design system Tailwind ACA SYSTEM.
   * Sistema di permessi per Feature Modules (Plugin) e pulsante di aggiornamento "One-Click".
   * Test di deployment Kiosk su tablet a muro.
4. **Fase 3 – Modulo Piantina Interattiva Drag & Drop (Sprint 6-7):**
   * Caricamento immagini planimetria 2D e calcolo coordinate responsive percentuali.
   * Drawer dispositivi con Drag & Drop e interazione con click diretto sui pin.
5. **Fase 4 – Chatbot AI, Validatore Deterministico & Catalogo Scenari (Sprint 8-9):**
   * Setup del motore LLM/Ollama su Hetzner.
   * Sviluppo del Middleware di Validazione Deterministico basato su Skill Markdown ed entità reali.
   * Interfaccia Chatbot conversazionale nell'app e catalogo scenari con filtri orari/funzionali.

---

## 11. Criteri di Accettazione Proposti

Questi criteri rendono osservabili gli obiettivi originali; richiedono conferma e precisazione nel relativo incarico. Non approvano nuove funzionalità e non riportano test già superati. La matrice degli scenari V corrispondenti è in [verification.md](docs/verification.md#scenari-di-prodotto-previsti).

| Criterio | Requisito | Risultato osservabile proposto |
|---|---|---|
| AC-00 | REQ-00 | Inventario del banco, protocolli e interfacce confermati; letture e comandi dei dispositivi scelti provati. Dipendenza dall'ambito fisico separato. |
| AC-01 | REQ-01 | Configurazione/versioni documentate, servizi avviabili nell'ambiente autorizzato e recupero da backup provato con dati di test. |
| AC-02 | REQ-02 | Automazioni previste funzionanti senza cloud; perdita/ritorno della rete e riavvio verificati. Disponibilità del client offline valutata separatamente. |
| AC-03 | REQ-03 | Stati e comandi coerenti dopo riconnessione; versioni compatibili e condizioni di utilizzo delle dipendenze risolte. |
| AC-04 | REQ-04 | Percorsi Google/email verificati; account email non confermato rifiutato e gestione delle sessioni secondo policy approvata. |
| AC-05 | REQ-05 | Collegamento all'impianto assegnato, credenziali valide/rinnovate/revocate gestite e accesso a impianti estranei rifiutato. |
| AC-06 | REQ-06 | Privilegi assegnati e revocati secondo policy approvata, con verifica dell'identità e rifiuto delle operazioni non autorizzate. |
| AC-07 | REQ-07 | Attivazione/revoca dei moduli applicata ai punti di autorizzazione; i controlli non dipendono dalla sola visibilità delle card. |
| AC-08 | REQ-08 | Sincronizzazione e versione effettiva osservabili; disconnessione ed errore parziale gestiti secondo ciclo approvato. |
| AC-09 | REQ-09 | Caricamento nei formati ammessi e visualizzazione corretta sui viewport scelti; gestione dei file/accessi definita. |
| AC-10 | REQ-10 | Posizioni persistenti al ridimensionamento e comandi indirizzati all'entità corretta; dispositivo rimosso gestito. |
| AC-11 | REQ-11 | Richiesta naturale produce una bozza ispezionabile; ambiguità e indisponibilità gestite senza attivazione non approvata. |
| AC-12 | REQ-12 | Modello/versione/licenza identificati, benchmark riproducibile e indisponibilità gestita; il target temporale è misurato, non presunto. |
| AC-13 | REQ-13 | Entità inesistenti, schema invalido e azioni fuori limiti rifiutati; correzioni visibili e scenario attivato uguale a quello approvato. |
| AC-14 | REQ-14 | Ricerca/tag e associazione agli impianti verificati; versione pubblicata e distribuita tracciabile. |
| AC-15 | REQ-15 | Associazione tablet e kiosk verificate, incluso riavvio senza internet e sessione scaduta; esiti collegati al progetto offline. |
| AC-16 | REQ-16 | Valutazione R&D con misure e limiti sui dispositivi scelti, prima di una decisione esplicita sul supporto 3D. |

Per aggiornare un requisito conservare ID e motivazione; collegare l'autorizzazione, le decisioni e le verifiche pertinenti. Problemi, vincoli e nuove idee restano nel [registro corrente](docs/project-status.md#registro-dei-problemi-e-limiti) fino a un incarico autorizzato.
