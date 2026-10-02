# ACA SYSTEM 2.0 – Product Requirements Document (PRODUCT.MD)
**Documento di Requisiti di Prodotto, Specifiche Hardware e Architettura Funzionale**

---

## 1. Requisiti Hardware di Partenza & Setup Iniziale Hetzner (Premesse di Funzionamento)
Prima di avviare qualsiasi sviluppo o installazione, è fondamentale definire la dotazione hardware obbligatoria da acquistare e la configurazione iniziale del server cloud su Hetzner, per garantire che il sistema funzioni subito in modo stabile e senza blocchi tecnici.

### 1.1 Distinta Base Hardware (Cosa va acquistato per una configurazione tipo d'impianto)

#### A. Gateway Locale d'Impianto (Edge Controller da Quadro Elettrico)
Il gateway locale è il dispositivo fisico che esegue Home Assistant Core Headless e gestisce i collegamenti diretti con sensori, contatori e relè.
* **Opzione Raccomandata (Residenziale standard & Hotel):**
  * **Raspberry Pi Compute Module 4 (CM4)** con memoria **eMMC integrata** (8GB/16GB/32GB - **NON** usare schede microSD che si corrompono dopo pochi mesi di letture/scritture continue).
  * Baseboard industriale con montaggio su **barra DIN** (es. Waveshare CM4-IO-BASE-BOX-B o baseboard Edatec) dotata di porta seriale RS485 nativa con isolamento ottico.
  * **Alimentatore Industriale:** Da guida DIN 24V / 12V con stabilizzazione di tensione (es. Mean Well HDR-15 o HDR-30).
* **Opzione Alternativa per Grandi Strutture (B2B / Ristoranti / Centri Direzionali):**
  * **Mini PC Fanless Industriale x86:** Processore Intel N100 / N97 quad-core, 8GB/16GB RAM DDR5, SSD NVMe M.2 128GB+, doppia porta Gigabit Ethernet RJ45.
* **Coordinatore Radio Zigbee & Matter (Comunicazione Wireless Sensori):**
  * **1x Dongle USB Coordinatore Zigbee 3.0 / Matter:** Modello industriale con antenna esterna ad alto guadagno (es. *Sonoff Zigbee 3.0 USB Dongle Plus-E* basato su chip EFR32MG21 oppure *Nabu Casa SkyConnect*).
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
* **2x Moduli Relè Smart (Luci e Carichi):** Relè da incasso o da barra DIN Zigbee (es. *Sonoff ZBMINIL2* o *Shelly 1PM Gen3*).
* **1x Sensore Presenza & Luminosità:** Sensore Zigbee radar mmWave (presenza statica) + PIR (es. *Aqara FP2* o sensore Zigbee Tuya radar).
* **1x Testa Termostatica Smart (TRV):** Per radiatori, protocollo Zigbee (es. *Sonoff TRVZB* o *Moes Zigbee TRV*).

---

### 1.2 Setup e Gestione dell'Infrastruttura Hetzner (Premesse Cloud)

Il server su Hetzner deve essere configurato fin dall'inizio come "centro di comando" centralizzato (Hub). Di seguito la configurazione hardware cloud e i componenti da installare:

#### A. Risorse e Tier Macchina Virtuale Hetzner Consigliati
* **Tipo Server:** Hetzner Cloud **CPX31** (4 vCPU AMD EPYC, 8 GB RAM, 160 GB NVMe SSD) oppure **CPX41** (8 vCPU, 16 GB RAM) per gestire agevolmente il modello AI.
* **Sistema Operativo:** Ubuntu 24.04 LTS x64 (Server Minimal).
* **IP Pubblico Dedicato:** 1x IPv4 statico con record DNS puntato (es. `api.acasystem.it`, `cloud.acasystem.it`).

#### B. Componenti Software Obbligatori da Installare su Hetzner
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
* **2.3 Conservazione delle Funzionalità:** Principio cardine di sviluppo: nessuna funzionalità nativa di Home Assistant viene rimossa. Il sistema espande le capacità introducendo nuovi scenari, strumenti visuali e automazioni guidate.

---

## 3. Architettura di Sistema: Modello Ibrido Hub & Spoke

* **3.1 Livello Edge / Gateway Locale (Spoke - Presso l'Immobile):**
  * Esegue **Home Assistant Core Headless** (container Docker). Gestisce la macchina a stati, l'event bus locale e i collegamenti fisici (Modbus RS485, Zigbee USB, KNX, Wi-Fi locale).
  * **Connessione Sicura in Uscita (Zero Port-Forwarding):** Connessione permanente crittografata verso Hetzner.
  * **Operatività Offline (Local-First):** In caso di blackout internet, continua a regolare temperature, distaccare carichi ed eseguire scenari senza alcuna interruzione.

* **3.2 Livello Cloud Centralizzato (Hub - Server Hetzner):**
  * Hosting dei servizi centrali: Identity Provider, Reverse Tunnel Broker, Hosting Modello AI, Catalogo Scenari e Database utenti.

---

## 4. Frontend & UI/UX Stack
* **4.1 Stack Tecnologico Frontend:**
  * **Framework & Bundler:** React 18 + Vite + TypeScript (avvio istantaneo, rendering fluido, bundle ottimizzato e type-safety).
  * **Styling & Design System:** Tailwind CSS personalizzato per la brand identity di ACA SYSTEM.
  * **Motore Reattivo & Connessione Real-Time:** 
    * WebSocket bidirezionale ad alta velocità tramite libreria `home-assistant-js-websocket`.
    * Layer di astrazione React tramite **`@hakit/core`** per la gestione reattiva degli stati delle entità e l'invio dei comandi di servizio.
    * *In Rete Locale (LAN):* Connessione diretta tra tablet e IP locale del gateway (<30ms di latenza).
    * *Da Remoto:* Connessione protetta instradata tramite il broker cloud Hetzner con cifratura end-to-end.

* **4.2 Fonti Open-Source & Toolkit Architetturali di Riferimento:**
  Per ridurre i tempi di sviluppo di oltre il 70% ed evitare di reinventare logiche già collaudate, il frontend adotta una sinergia tra due importanti progetti open-source:

  * **A. Framework SDK & Component Kit: HAKit (`ha-component-kit`)**
    * **Repository GitHub:** [shannonhochkins/ha-component-kit](https://github.com/shannonhochkins/ha-component-kit) (1.3k+ stelle)
    * **Documentazione & Storybook:** [shannonhochkins.github.io/ha-component-kit](https://shannonhochkins.github.io/ha-component-kit/)
    * **Ruolo di `@hakit/core`:** SDK essenziale per collegare React a Home Assistant. Fornisce Custom Hook pronti all'uso (`useEntity`, `useService`, `useHass`) con aggiornamento istantaneo dello stato, gestione della cache locale, riconnessione automatica e tipizzazione TypeScript completa di ogni dispositivo. Elimina la complessità di dover gestire a mano il parsing dei messaggi WebSocket.
    * **Ruolo di `@hakit/components`:** Libreria di card e controller interattivi per React (controllo luci RGB/dimmer, termostato circolare clima, percentuali apertura tapparelle/cover, sensori e modali di dettaglio). Fornisce la logica di controllo avanzata da vestire con il design system e i token grafici proprietari ACA SYSTEM.

  * **B. Dashboard Template & Layout Base: Tunet**
    * **Repository GitHub:** [oyvhov/Tunet](https://github.com/oyvhov/Tunet)
    * **Thread Community:** [Tunet - A Modern Dashboard for Home Assistant](https://community.home-assistant.io/t/wip-tunet-a-modern-dashboard-for-home-assistant/990003)
    * **Ruolo di Tunet:** Fornisce l'ispirazione architetturale per la struttura a griglia personalizzabile, la disposizione dei widget e la navigazione tra stanze/viste.

  * **C. Sinergia Operativa:**
    * **Tunet** guida l'impostazione macro (griglia dashboard, navigazione e sezioni).
    * **HAKit** alimenta il motore micro (Custom Hook per gli stati, reattività WebSocket e logica delle card dei singoli dispositivi).
    * **Tailwind CSS + Brand ACA:** Unifica il tutto sotto un'estetica proprietaria premium e moderna.

---

## 5. Gestione Account, Identity Provider & Policy Plugin
* **5.1 Autenticazione & Identity Provider su Hetzner (Stile Tripers):**
  * Il backend su Hetzner funge da **Identity Provider & Token Gateway**:
    * **Login Social (Google OAuth):** Autenticazione diretta senza verifica email aggiuntiva.
    * **Registrazione Email + Password:** Invio email di conferma tramite servizio **Resend**; l'account è operativo solo a verifica completata.
  * **Token Exchange Trasparente:** L'utente effettua il login sul portale centrale; l'Identity Provider valida le credenziali, verifica l'impianto associato e rilascia al frontend il token di autorizzazione WebSocket per connettersi in modo sicuro al rispettivo gateway locale.
* **5.2 Ruoli e Livelli di Autorizzazione:**
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
  * I "Plugin" sono definiti a livello architetturale come **Feature Modules / Widget di Frontend** gestiti a licenza e permessi (es. *Modulo Piantina Interattiva*, *Modulo Clima & Zone*, *Modulo Monitoraggio Energetico / Distacco Carichi*, *Modulo Videosorveglianza*).
  * Non richiedono l'installazione di codice Python instabile a caldo su Home Assistant né riavvii di sistema.
* **5.4 Distribuzione e Aggiornamento "One-Click":**
  * Quando l'amministratore abilita un nuovo Feature Module o rilascia nuovi scenari per un impianto, sull'interfaccia dell'utente (e sui tablet a muro) compare un **pulsante di aggiornamento rapido** (*"Aggiorna configurazione / Sincronizza"*).
  * Con un singolo tocco, il frontend ricarica i permessi e attiva istantaneamente le nuove schermate e funzioni.

---

## 6. Mappatura Interattiva della Casa (Floorplan & Piantina)
* **6.1 Caricamento Planimetria Personalizzata:**
  * Utente e sistemista possono caricare liberamente l'immagine della piantina (PNG, JPG, SVG).
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
* **7.2 Hosting del Modello AI Locale Leggero (SLM / Local LLM):**
  * Il modello (es. Llama 3.2 3B o Mistral 7B via Ollama / vLLM) viene eseguito sul server cloud Hetzner.
  * Questo evita di sovraccaricare la memoria e la CPU dei tablet fisici o dei Raspberry Pi locali, garantendo tempi di risposta rapidi (<2s).
* **7.3 Middleware di Validazione Deterministico (Anti-Allucinazione):**
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

| ID | Sezione | Descrizione del Requisito | Ruolo Coinvolto | Priorità |
|---|---|---|---|---|
| **REQ-00** | Hardware | Approvvigionamento gateway CM4/MiniPC, dongle Zigbee, USB-RS485 e tablet | Sistemisti | P0 (Bloccante) |
| **REQ-01** | Cloud Hetzner | Setup VM Hetzner CPX31/41 con Reverse Proxy, Reverse Tunnel e Docker | DevOps | P0 (Bloccante) |
| **REQ-02** | Architettura | Modello Hub & Spoke: Gateway locale edge (HA Core) collegato a Hetzner | Sistema / DevOps | P0 (Bloccante) |
| **REQ-03** | Frontend | Sviluppo frontend su base Tunet + SDK HAKit (`@hakit/core`, `@hakit/components`) con React 18, Vite e Tailwind | Grafica / Dev | P0 (Bloccante) |
| **REQ-04** | Auth | Identity Provider su Hetzner: Google OAuth + Email con Resend | Tutti | P0 (Bloccante) |
| **REQ-05** | Auth | Token Exchange trasparente verso gateway HA | Backend | P0 (Bloccante) |
| **REQ-06** | Ruoli | Accesso Admin automatico per domini `@fourmemo.com` | Fourmemo Staff | P0 (Bloccante) |
| **REQ-07** | Plugin | Definizione plugin come Feature Modules frontend controllati da Admin | Admin | P0 (Bloccante) |
| **REQ-08** | Distribuzione | Pulsante di aggiornamento rapido (One-Click Update) su client/tablet | Utenti / Tablet | P1 (Alta) |
| **REQ-09** | Floorplan | Caricamento piantina 2D (PNG/JPG/SVG) e render responsive (X%, Y%) | Utente / Admin | P1 (Alta) |
| **REQ-10** | Floorplan | Posizionamento dispositivi con Drag & Drop e controllo interattivo | Utente / Admin | P1 (Alta) |
| **REQ-11** | AI / Chat | Chatbot in-app stile ChatGPT/Gemini per creazione guidata scenari | Admin / Utente | P2 (Medio/R&D) |
| **REQ-12** | AI / Server | Hosting Ollama e modello SLM/LLM su server Hetzner | Backend / R&D | P2 (Medio/R&D) |
| **REQ-13** | AI / Sicurezza | Middleware di validazione deterministico e Skill Markdown per scenari | Dev / R&D | P2 (Medio/R&D) |
| **REQ-14** | Scenari DB | Database e catalogo scenari con tassonomia (diurno, notturno, eco) | Backend / Admin | P2 (Medio/R&D) |
| **REQ-15** | Tablet | Configurazione rapida tablet da parte dei sistemisti e Kiosk mode | Sistemisti | P1 (Alta) |
| **REQ-16** | Floorplan | Valutazione supporto piantina 3D con Three.js / WebGL | R&D | P3 (Futuro) |

---

## 10. Roadmap di Rilascio

1. **Fase 0 – Approvvigionamento Hardware & Setup Server Hetzner (Sprint 1):**
   * Ordine hardware banco di prova: Raspberry CM4/Mini PC, Dongle Zigbee, USB-RS485, Tablet Android, contatore Modbus e relè.
   * Provisioning VM Hetzner (CPX31/CPX41) con Docker, Reverse Tunnel Wireguard/WSS, Nginx con SSL e PostgreSQL.
2. **Fase 1 – Setup Ibrido Hub & Spoke, Auth & Gateway (Sprint 2-3):**
   * Immagine Docker base per Gateway locale con Home Assistant Core Headless.
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
