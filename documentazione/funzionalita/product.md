# ACA SYSTEM 2.0 – Product Requirements Document (PRODUCT.MD)
**Documento di Requisiti di Prodotto, Specifiche Hardware e Architettura Funzionale**

**Specifica evolutiva — aggiornata il 2026-10-05.** [ADR-0003](../decisions/ADR-0003-home-assistant-locale-fase1.md) approva la direzione corrente: Home Assistant locale, Tunet come punto di partenza React, pilota in ufficio e fase 1 minima di personalizzazione grafica. Hetzner è escluso. Linux è a 64 bit, ARM64 oppure x86-64. Il [perimetro del pilota](pilot-scope.md) distingue risultato minimo, obiettivi successivi e criteri proposti.

La [copia originale](../archive/product-original-2026-10-02.md) resta immutata. [ADR-0001](../decisions/ADR-0001-documentazione-e-storico.md) e [ADR-0002](../decisions/ADR-0002-organizzazione-cartelle.md) restano valide per documentazione e storico. Lo [stato reale](../project-status.md), il [registro dei vincoli](../compliance.md) e i [report](../reports/README.md) registrano decisioni, evidenze e problemi.

Gli ID `REQ-00`–`REQ-16` sono conservati, incluso REQ-01 ritirato; REQ-17 aggiunge il ruolo condominiale richiesto dall'utente. Approvato indica la direzione o il comportamento autorizzato, non versioni, licenze o realizzazione già verificate. L'incarico corrente è progettuale: nessuno sviluppo o provisioning è avviato. Le [verifiche](../verification.md) distinguono controlli documentali e scenari applicativi non eseguiti.

---

## 1. Hardware Locale e Accesso Remoto
Il pilota è in ufficio; il prodotto verrà fornito su mini PC o Raspberry nelle abitazioni, negli uffici e nelle aziende. È approvato Linux a 64 bit (ARM64 o x86-64). La distinta seguente resta una proposta storica da adattare al pilota; non è un inventario di materiale disponibile. Modelli, compatibilità, disponibilità e dimensionamento richiedono verifica prima di acquisti o installazioni; non costituiscono una garanzia di stabilità. Questioni aperte: [ISSUE-005](../project-status.md#issue-005), [ISSUE-011](../project-status.md#issue-011) e [ISSUE-012](../project-status.md#issue-012). La conformità delle installazioni fisiche resta un ambito separato da questo registro software/cloud.

### 1.1 Distinta Base Hardware (Cosa va acquistato per una configurazione tipo d'impianto)

#### A. Gateway Locale d'Impianto (Edge Controller da Quadro Elettrico)
Il gateway locale proposto esegue **Home Assistant Container** (Core in Docker) e gestisce i collegamenti con sensori, contatori e relè. Modalità d'installazione e servizi complementari restano da approvare ([ISSUE-004](../project-status.md#issue-004)).
* **Opzione Proposta (Residenziale standard & Hotel):**
  * **Raspberry Pi Compute Module 4 (CM4)** con memoria **eMMC integrata** (8GB/16GB/32GB). Preferenza iniziale da valutare rispetto a carico, storage e recupero; la durata delle microSD non è stata misurata.
  * Baseboard industriale con montaggio su **barra DIN** (es. Waveshare CM4-IO-BASE-BOX-B o baseboard Edatec); disponibilità di RS485 e isolamento da verificare sul modello esatto.
  * **Alimentatore Industriale:** Da guida DIN 24V / 12V con stabilizzazione di tensione (es. Mean Well HDR-15 o HDR-30).
* **Opzione Alternativa per Grandi Strutture (B2B / Ristoranti / Centri Direzionali):**
  * **Mini PC Fanless Industriale x86:** Processore Intel N100 / N97 quad-core, 8GB/16GB RAM DDR5, SSD NVMe M.2 128GB+, doppia porta Gigabit Ethernet RJ45.
* **Radio Zigbee e supporto Thread/Matter da Definire:**
  * **1x Dongle USB Coordinatore Zigbee 3.0 proposto:** Modello con antenna esterna (es. *Sonoff Zigbee 3.0 USB Dongle Plus-E* oppure *Nabu Casa SkyConnect/ZBT-1*). Il supporto Thread/Matter richiede una configurazione distinta da precisare; il funzionamento simultaneo Zigbee/Thread sullo stesso ZBT-1 non è assunto come soluzione di produzione ([ISSUE-005](../project-status.md#issue-005)).
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
Il kit seguente è candidato per le estensioni e i collaudi successivi. Il materiale necessario per il minimo grafico della fase 1 deve essere definito dall'inventario dell'ufficio:
* **1x Contatore di Energia Modbus RS485:** Modello da guida DIN bidirezionale (es. *Eastron SDM120 / SDM230 Modbus* o *Carlo Gavazzi EM111*).
* **2x Moduli Relè Smart (Luci e Carichi):** Relè da incasso o da barra DIN, con protocollo da confermare sul modello scelto (es. *Sonoff ZBMINIL2* o *Shelly 1PM Gen3*, quest'ultimo Wi-Fi/Bluetooth).
* **1x Sensore Presenza & Luminosità:** Sensore radar mmWave proposto (es. *Aqara FP2*, Wi-Fi/Bluetooth, o un modello Zigbee Tuya da verificare). Eventuale combinazione con PIR, capacità e integrazione richiedono collaudo.
* **1x Testa Termostatica Smart (TRV):** Per radiatori, protocollo Zigbee (es. *Sonoff TRVZB* o *Moes Zigbee TRV*).

---

### 1.2 Accesso Remoto e Risorse Esterne

Hetzner e il suo provisioning sono ritirati dalla direzione corrente (REQ-01, ADR-0003). Il prodotto deve operare localmente con il massimo funzionamento possibile senza internet. La gestione da fuori casa resta un obiettivo quando la connettività è disponibile.

Provider, VPN/tunnel, certificati e modalità di pubblicazione non sono scelti. Le proposte originali su identità centrale, database e hosting AI non sono dipendenze obbligatorie della fase 1. Budget, rete e manutenzione restano da progettare in [infrastructure.md](../infrastructure.md).

---

## 2. Visione Generale del Prodotto

* **2.1 Scopo:** Sistema domotico installato su hardware locale fornito negli immobili, con Home Assistant come base obbligatoria e interfaccia personalizzata.
* **2.2 Direzione Locale:** Automazioni, stati, comandi e asset necessari al frontend devono privilegiare il funzionamento locale. La gestione remota è un'estensione online; le integrazioni dipendenti da servizi esterni vanno identificate.
* **2.3 Conservazione delle Funzionalità:** Obiettivo originale conservato: mantenere le capacità Home Assistant. Copertura della UI React e accesso alle funzioni HA restanti devono essere concordati; una dashboard personalizzata non dimostra da sola la copertura di ogni funzione nativa. Metodo HA e servizi complementari restano aperti ([ISSUE-004](../project-status.md#issue-004)).
* **2.4 Primo Risultato:** Fase 1 minima: Home Assistant personalizzato graficamente, provato in ufficio. Funzioni aggiuntive e ruoli avanzati richiedono successivi incarichi; dettagli in [pilot-scope.md](pilot-scope.md).

---

## 3. Architettura di Sistema: Funzionamento Locale e Remoto

* **3.1 Gateway Locale:** Home Assistant su mini PC o Raspberry Linux a 64 bit. Container è un candidato originale, non il metodo già scelto. Inventario, versioni e protocolli fisici sono da verificare.
* **3.2 Frontend Locale:** Tunet confermato come punto di partenza React. Hosting degli asset, servizi richiesti dal repository, autenticazione e riavvio senza internet devono essere progettati.
* **3.3 Continuità Offline:** Obiettivo: massimo uso possibile delle funzionalità locali, inclusi UI e comandi, con rete locale e alimentazione disponibili. Dipendenze cloud, sessioni e riavvii devono avere comportamenti verificabili ([ISSUE-007](../project-status.md#issue-007)).
* **3.4 Remoto:** Accesso fuori casa da progettare senza dipendenza obbligatoria Hetzner. Nessuna soluzione VPN, relay o backend centrale è selezionata ([ISSUE-013](../project-status.md#issue-013)).
* **3.5 Più Utenti:** Valutare molti utenti su una macchina. Distinguere uno stesso impianto condiviso da abitazioni separate e dispositivi condominiali; capacità e isolamento non sono dimostrati ([ISSUE-015](../project-status.md#issue-015)).

---

## 4. Frontend & UI/UX Stack
* **4.1 Stack Tecnologico Frontend:**
  * **Framework & Bundler:** React tramite il riferimento Tunet confermato; banco prova React 19/Vite. [ADR-0005](../decisions/ADR-0005-typescript-italiano-icone.md) avvia TypeScript progressivo dalla schermata HOME, con primitive secondo ADR-0004 e italiano per le nuove interfacce. Versioni e stato effettivo nei report; non è una migrazione integrale già completata. React 18 e HAKit erano proposte originali; la compatibilità HAKit resta pertinente soltanto se l'SDK viene scelto ([ISSUE-003](../project-status.md#issue-003)).
  * **Styling & Design System:** Specifica visiva nel [modulo design](../design/design.md): Neumorphism e colori principali confermati. Componenti e dettagli restano da definire sulla base Tunet. Tailwind era il candidato originale; compatibilità e versione vanno verificate prima di adottarlo come vincolo.
  * **Motore Reattivo & Connessione Real-Time:** 
    * WebSocket bidirezionale ad alta velocità tramite libreria `home-assistant-js-websocket`.
    * L'eventuale adozione di **`@hakit/core`** deve essere valutata rispetto alla base Tunet, a licenze e versioni; non è richiesta dalla conferma di Tunet.
    * *In Rete Locale (LAN):* Connessione diretta proposta tra tablet e gateway. Il valore <30ms è un obiettivo iniziale da definire e misurare su un ambiente dichiarato.
    * *Da Remoto:* Meccanismo ancora da scegliere; percorso, autenticazione, certificati e terminazione TLS vanno progettati e verificati ([ISSUE-013](../project-status.md#issue-013)).

* **4.2 Progetti di Riferimento:**
  * **Microinterazioni e temi:** Il piano di raccolta approvato il 2026-10-05 conferma temi chiaro/scuro, accento arancione e microinterazioni prioritarie. Quando la regolazione della luminosità è inclusa nel futuro incarico UI, gesto sull'icona, anteprima con percentuale e luce reale durante il gesto devono distinguere valore richiesto e confermato da HA, con frequenza degli invii limitata. Specifica in [design.md](../design/design.md#microinterazioni-richieste); questa raccolta non implementa il comportamento.
  * **Tunet — punto di partenza confermato:** [oyvhov/Tunet](https://github.com/oyvhov/Tunet). È la base React indicata dall'utente per il frontend; l'integrazione concreta e le condizioni degli artefatti distribuiti restano da verificare. GPL-3.0 nella revisione esaminata ([ISSUE-002](../project-status.md#issue-002)).
  * **HAKit — candidato eventuale:** [shannonhochkins/ha-component-kit](https://github.com/shannonhochkins/ha-component-kit). Non è obbligatorio per la fase 1. Le licenze esaminate richiedono una licenza commerciale separata; fonti in [compliance.md](../compliance.md#fonti-e-revisioni-già-esaminate).
  * **Personalizzazione grafica:** identità, schermate e layout vanno concordati. La combinazione Tunet/HAKit/Tailwind originale non è una dipendenza tecnica approvata; il risparmio di sviluppo >70% non è misurato.

---

## 5. Account, Ruoli e Configurazione

* **5.1 Autenticazione Locale e Primo Setup:**
  * Identità, sessioni HA e accesso del frontend devono sostenere l'operatività locale; modalità e gestione delle credenziali restano da progettare ([ISSUE-006](../project-status.md#issue-006)).
  * Flusso confermato: admin già collegato **soltanto nel primo setup**, configurazione e associazione dei dispositivi, logout admin, login con account cliente. Attivazione, durata e chiusura della sessione iniziale devono essere verificate.
  * Google OAuth, email/Resend e token exchange erano proposte iniziali, non prerequisiti della fase grafica. Nessun Identity Provider centrale è scelto.
* **5.2 Ruoli Richiesti:**
  * **Admin:** configura l'impianto in lavorazione e associa i dispositivi. La regola automatica `@fourmemo.com` dell'originale non è confermata; assegnazione e revoca dei privilegi vanno definite.
  * **Cliente:** utilizza il sistema con il proprio account dopo la consegna. Personalizzazione e operazioni consentite sono da precisare per le funzioni comprese nel relativo incarico.
  * **Amministratore di Condominio (REQ-17):** configura i dispositivi comuni, per esempio la caldaia condivisa, senza poter configurare i dispositivi delle singole abitazioni. Visibilità, letture e comandi devono essere precisati; traduzione in permessi HA e isolamento sono da progettare.
  * **Confini:** verificare letture, comandi e configurazione anche su API e dati, oltre che sulla UI. Accesso remoto permanente del sistemista, organizzazione delle istanze e privilegi su più impianti non sono approvati implicitamente ([ISSUE-008](../project-status.md#issue-008), [ISSUE-015](../project-status.md#issue-015)).
  * Personalizzazione delle card, piantina, moduli e scenari restano estensioni del prodotto, con perimetro da assegnare.

* **5.3 Definizione dei "Plugin" come Feature Modules di Frontend:**
  * **Confine da Precisare:** Il widget è la parte di interfaccia. Moduli come distacco carichi e clima richiedono anche logiche locali, configurazioni e limiti operativi da progettare; l'etichetta frontend non elimina queste responsabilità ([ISSUE-009](../project-status.md#issue-009)).
  * I "Plugin" sono definiti a livello architetturale come **Feature Modules / Widget di Frontend** gestiti a licenza e permessi (es. *Modulo Piantina Interattiva*, *Modulo Clima & Zone*, *Modulo Monitoraggio Energetico / Distacco Carichi*, *Modulo Videosorveglianza*).
  * Non richiedono l'installazione di codice Python instabile a caldo su Home Assistant né riavvii di sistema.
* **5.4 Distribuzione e Aggiornamento "One-Click":**
  * **Ciclo da Progettare:** Sincronizzazione client e attivazione degli scenari sul gateway sono fasi distinte. Versioni, conferma di attivazione, errori parziali e ripristino richiedono una decisione e collaudo ([ISSUE-009](../project-status.md#issue-009)).
  * Quando l'amministratore abilita un nuovo Feature Module o rilascia nuovi scenari per un impianto, sull'interfaccia dell'utente (e sui tablet a muro) compare un **pulsante di aggiornamento rapido** (*"Aggiorna configurazione / Sincronizza"*).
  * Con un singolo tocco, il frontend ricarica i permessi e attiva istantaneamente le nuove schermate e funzioni.

---

## 6. Mappatura Interattiva della Casa (Floorplan & Piantina)
* **6.1 Caricamento Planimetria Personalizzata:**
  * Utente e sistemista possono caricare liberamente l'immagine della piantina (PNG, JPG, SVG).
  * Formati ammessi, gestione dei file, accessi e conservazione saranno definiti nell'incarico pertinente ([ISSUE-014](../project-status.md#issue-014)).
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
* **7.2 Hosting del Modello AI da Valutare (SLM / LLM, Estensione Futura):**
  * Modello e motore (es. Llama 3.2 3B o Mistral 7B via Ollama / vLLM) restano candidati. La sede di esecuzione è da valutare rispetto a hardware locale, licenze, carico e obiettivo offline; Hetzner è escluso dalla direzione corrente.
  * Obiettivo: valutare la generazione degli scenari rispetto a risorse disponibili e funzionamento locale. Sede e hardware del modello non sono scelti. Il valore <2s è una stima iniziale da verificare con modello, hardware, contesto e concorrenza dichiarati ([ISSUE-010](../project-status.md#issue-010)); licenze e dati trattati sono da valutare.
* **7.3 Middleware di Validazione Deterministico (Anti-Allucinazione):**
  * **Limite da Gestire:** Schema e riferimenti alle entità verificano struttura e identificativi; la correttezza funzionale e i limiti delle azioni richiedono ulteriori regole e prove. Le correzioni devono essere visibili nella bozza sottoposta ad approvazione ([ISSUE-010](../project-status.md#issue-010)).
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
  * Il sistemista usa la sessione admin aperta solo per il primo setup, configura l'impianto e i dispositivi, esce dall'account admin ed entra con l'account cliente. Associazione del tablet e modalità kiosk restano da delimitare nell'incarico pertinente.
* **8.2 Esperienza Kiosk a Muro:**
  * Esecuzione in modalità Kiosk a schermo intero (tramite Capacitor APK o Fully Kiosk), blocco delle impostazioni Android di sistema, touch reattivo, e gestione risveglio schermo su rilevamento presenza o tocco.

---

## 9. Tabella dei Requisiti Funzionali Ordinati per Priorità

**Stato al 2026-10-05:** ADR-0003 approva alcuni vincoli e comportamenti; REQ-01 è Ritirato, gli altri dettagli non confermati restano Proposti. Nessun requisito è implementato. Le priorità P originali sono conservate come storico dell'intento; l'ordine operativo corrente parte dalla fase grafica in [pilot-scope.md](pilot-scope.md). Approvato non assegna automaticamente l'implementazione e non convalida tutte le tecnologie originali.

| ID | Sezione | Descrizione del Requisito | Ruolo Coinvolto | Priorità | Stato | Criterio |
|---|---|---|---|---|---|---|
| **REQ-00** | Hardware | Hardware locale Linux a 64 bit ARM64/x86-64; inventario e modelli del pilota da scegliere | Sistemisti | P0 (Bloccante) | Approvato | AC-00 |
| **REQ-01** | Cloud Hetzner | Provisioning Hetzner dell'originale ritirato per decisione umana; ID conservato | DevOps | P0 (Bloccante) | Ritirato | AC-01 |
| **REQ-02** | Architettura | Home Assistant locale, massimo uso offline e obiettivo remoto online; trasporto da progettare | Sistema / DevOps | P0 (Bloccante) | Approvato | AC-02 |
| **REQ-03** | Frontend | Fase 1 grafica in ufficio, frontend React con Tunet come punto di partenza; licenze/versioni da verificare | Grafica / Dev | P0 (Bloccante) | Approvato | AC-03 |
| **REQ-04** | Auth | Google OAuth + email/Resend, opzione futura; nessun Identity Provider centrale obbligatorio | Tutti | P0 (Bloccante) | Proposto | AC-04 |
| **REQ-05** | Auth | Integrazione identità/sessioni con HA e gestione credenziali offline; contratto da progettare | Backend | P0 (Bloccante) | Proposto | AC-05 |
| **REQ-06** | Ruoli | Admin configura e associa dispositivi; primo setup con logout admin e login cliente, assegnazione da definire | Fourmemo Staff | P0 (Bloccante) | Approvato | AC-06 |
| **REQ-07** | Plugin | Feature Modules controllati da Admin, con confini frontend/logiche locali da precisare | Admin | P0 (Bloccante) | Proposto | AC-07 |
| **REQ-08** | Distribuzione | Pulsante di aggiornamento rapido (One-Click Update) su client/tablet | Utenti / Tablet | P1 (Alta) | Proposto | AC-08 |
| **REQ-09** | Floorplan | Caricamento piantina 2D (PNG/JPG/SVG) e render responsive (X%, Y%) | Utente / Admin | P1 (Alta) | Proposto | AC-09 |
| **REQ-10** | Floorplan | Posizionamento dispositivi con Drag & Drop e controllo interattivo | Utente / Admin | P1 (Alta) | Proposto | AC-10 |
| **REQ-11** | AI / Chat | Chatbot in-app stile ChatGPT/Gemini per creazione guidata scenari | Admin / Utente | P2 (Medio/R&D) | Proposto | AC-11 |
| **REQ-12** | AI / Server | Hosting motore AI e modello SLM/LLM; sede e capacità da valutare senza vincolo Hetzner | Backend / R&D | P2 (Medio/R&D) | Proposto | AC-12 |
| **REQ-13** | AI / Sicurezza | Middleware di validazione deterministico e Skill Markdown per scenari | Dev / R&D | P2 (Medio/R&D) | Proposto | AC-13 |
| **REQ-14** | Scenari DB | Database e catalogo scenari con tassonomia (diurno, notturno, eco) | Backend / Admin | P2 (Medio/R&D) | Proposto | AC-14 |
| **REQ-15** | Tablet | Configurazione rapida tablet da parte dei sistemisti e Kiosk mode | Sistemisti | P1 (Alta) | Proposto | AC-15 |
| **REQ-16** | Floorplan | Valutazione supporto piantina 3D con Three.js / WebGL | R&D | P3 (Futuro) | Proposto | AC-16 |
| **REQ-17** | Ruoli | Amministratore di condominio configura dispositivi comuni ed esclude quelli privati; letture/comandi da precisare | Amministratore condominio | Da definire | Approvato | AC-17 |

---

## 10. Roadmap di Rilascio

La sequenza originale basata su provisioning Hetzner è superata da ADR-0003 e resta nell'archivio/Git. Il **primo risultato confermato** è Home Assistant personalizzato graficamente in ufficio. Nessuna fase applicativa è iniziata.

1. **Preparazione progettuale della fase 1:** inventario dell'ufficio, analisi della base Tunet, condizioni di riuso, scelta del metodo HA, schermate/materiale grafico e criteri di verifica.
2. **Fase 1 — Home Assistant personalizzato graficamente:** frontend locale basato sul riferimento Tunet, perimetro UI concordato e verifiche di stati/comandi e offline per i dispositivi/client selezionati. L'implementazione richiede un incarico successivo.
3. **Estensioni da pianificare:** piantina, moduli, consumi, scenari/AI, remoto, kiosk, ruoli condominiali e possibili macchine condivise. Ordine, dipendenze e inclusioni richiedono successivi incarichi; non sono aggiunte automaticamente alla fase minima.

Sprint, budget e scadenze non sono definiti. Il flusso di primo setup e il ruolo condominiale sono obiettivi approvati del prodotto; la loro realizzazione va delimitata nel relativo incarico. Dettagli nel [perimetro del pilota](pilot-scope.md).

---

## 11. Criteri di Accettazione Proposti

Questi criteri rendono osservabili gli obiettivi originali; richiedono conferma e precisazione nel relativo incarico. Non approvano nuove funzionalità e non riportano test già superati. La matrice degli scenari V corrispondenti è in [verification.md](../verification.md#scenari-di-prodotto-previsti).

| Criterio | Requisito | Risultato osservabile proposto |
|---|---|---|
| AC-00 | REQ-00 | Inventario dell'ufficio, Linux a 64 bit e architettura ARM64/x86-64 identificati; dispositivi/protocolli scelti e prove pertinenti documentate. Dipendenza fisica separata. |
| AC-01 | REQ-01 | Non applicabile al piano corrente: requisito Hetzner Ritirato in ADR-0003. Criterio storico conservato nell'originale e in Git. |
| AC-02 | REQ-02 | Frontend, stati/comandi e automazioni locali del perimetro scelto funzionanti senza internet, incluso riavvio dei client previsti; dipendenze cloud esplicite. Remoto verificato nel suo incarico. |
| AC-03 | REQ-03 | Schermate e identità grafica concordate, frontend locale con base Tunet, stati/comandi e riconnessione corretti; copertura HA, versioni e condizioni di distribuzione verificate. |
| AC-04 | REQ-04 | Percorsi Google/email verificati; account email non confermato rifiutato e gestione delle sessioni secondo policy approvata. |
| AC-05 | REQ-05 | Collegamento all'impianto assegnato, credenziali valide/rinnovate/revocate gestite e accesso a impianti estranei rifiutato. |
| AC-06 | REQ-06 | Admin configura l'impianto; sessione aperta limitata al primo setup; logout e login cliente completati senza privilegi admin residui. Assegnazione/revoca e rifiuto di operazioni non autorizzate verificati. |
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
| AC-17 | REQ-17 | Amministratore di condominio configura dispositivi comuni autorizzati; configurazioni delle abitazioni private rifiutate anche via API. Letture/comandi verificati secondo la policy da approvare. |

Per aggiornare un requisito conservare ID e motivazione; collegare l'autorizzazione, le decisioni e le verifiche pertinenti. Problemi, vincoli e nuove idee restano nel [registro corrente](../project-status.md#registro-dei-problemi-e-limiti) fino a un incarico autorizzato.
