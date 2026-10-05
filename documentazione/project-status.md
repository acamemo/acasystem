# Stato effettivo del progetto

Aggiornato: 2026-10-05. Responsabile dell'approvazione di prodotto: utente committente. Questo documento è la fonte corrente per stato dei requisiti, problemi e incarichi; i report conservano gli esiti datati.

## Situazione verificata

La cartella iniziale conteneva solo `product.md`. Git locale è stato inizializzato e l'originale è conservato nel commit `912ec16b818f2446c77b844b6ff24f44e30a5fa9`. Il 2026-10-05 l'utente ha installato HA Container e concluso il setup. Nel successivo incarico [REP-20261005-004](reports/REP-20261005-004-installazione-tunet.md) sono stati acquisiti i sorgenti Tunet 1.22.1 e predisposto il [Compose locale](../progetto/compose.tunet.yaml). Tunet è avviato su localhost:3002; HA 2026.9.4 è raggiungibile dal backend. L'utente ha completato OAuth nel browser; Tunet mostra CONNECTED / Authenticated via OAuth2 e il pannello profili mostra auto-sync con ultima sincronizzazione. HOME Neumorphism e controlli condivisi (REP-20261005-008), aggiunta scheda, aggiunta/modifica pagina e selettore icone (REP-20261005-009) sono verificati nel browser locale; dispositivi fisici e grafica del resto delle interfacce non sono collaudati.

La [raccolta UI](design/componenti/README.md) contiene ora sette campioni di codice come reference testuali in documentazione, senza adattamenti o integrazione. Sono distinti dal futuro codice applicativo in progetto/. Hash e fonti registrano l'acquisizione; non dimostrano collaudo o licenza del riuso.

Nessun servizio esterno, gateway o tablet è stato configurato o collaudato in questo incarico. Disponibilità di eventuali risorse esterne: non verificata. Non esistono evidenze di operatività, prestazioni o conformità del prodotto. Nessuna CI è configurata.

La struttura corrente separa [documentazione/](README.md), [backup/](../backup/README.md) e [progetto/](../progetto/README.md), secondo ADR-0002. Progetto contiene la baseline Tunet adattata nel primo incremento HOME TS/primitive/italiano e materiale Neumorphism chiaro/scuro; gli originali restano nello storico e nello ZIP. Backup contiene una copia ZIP/estratta dell'acquisizione, esclusa da Git; nessun backup dei dati HA/Tunet o ripristino è stato eseguito.

Su richiesta umana del 2026-10-05, la documentazione comprende due moduli: [funzionalità](funzionalita/README.md) per PRD e pilota, e [design](design/README.md) con design.md come fonte visiva. Stato, aspetti tecnici, verifiche e storico restano comuni. La separazione non cambia approvazioni o stato di realizzazione dei requisiti.

## Direzione corrente approvata

ADR-0003 e le risposte umane del 2026-10-05 stabiliscono Home Assistant locale, riferimento React Tunet, pilota in ufficio e fase 1 minima grafica. Hetzner è ritirato. Linux 64 bit ammette ARM64 e x86-64. Primo setup: admin aperto solo inizialmente, configurazione, logout e login cliente. Il ruolo condominiale e la valutazione di molti utenti su una macchina sono obiettivi successivi; meccanismi e sviluppo non sono avviati.

## Stati e responsabilità

- **Stato del requisito:** Proposto, Approvato, Rimandato, Ritirato. Approvato richiede riferimento a una richiesta/decisione umana. La pubblicazione iniziale del PRD ne registra l'intento, non l'approvazione tecnica di tutte le soluzioni.
- **Stato di realizzazione:** Non iniziato, In corso, Implementato, Verificato. Verificato richiede evidenza di accettazione; un documento progettuale non realizza la funzionalità descritta.
- **Problemi:** Aperto, Risolto, Accettato come limite, Superato. La classificazione distingue fatto verificato, lacuna progettuale e ipotesi da misurare.

I problemi usano ID progressivi `ISSUE-NNN`, mai riutilizzati; assegnare il numero successivo al massimo esistente. Registrare per ogni nuova voce categoria, stato, requisiti interessati, evidenza e condizione di chiusura. Risolto e Accettato come limite richiedono rispettivamente evidenza di soluzione o decisione umana; conservare il riferimento al report e aggiornare soltanto lo stato corrente.

Un nuovo incarico umano può autorizzare un requisito proposto: registrare l'ambito esatto e aggiornare lo stato corrispondente. Il backlog e il PRD non assegnano autonomamente nuovi incarichi agli agenti.

## Stato per requisito

Criteri nel [PRD](funzionalita/product.md#11-criteri-di-accettazione-proposti); scenari in [verification.md](verification.md#scenari-di-prodotto-previsti). Approvato riguarda il vincolo/comportamento riportato in ADR-0003, senza selezionare automaticamente tutte le tecnologie del documento originale. La fase minima è nel [perimetro del pilota](funzionalita/pilot-scope.md).

| ID | Requisito | Approvazione | Realizzazione | Verifica prevista | Questioni collegate |
|---|---|---|---|---|---|
| REQ-00 | Hardware locale Linux 64 bit | Approvato | Non iniziato | V-00 | Vincoli approvati; inventario/modelli aperti, ISSUE-005. |
| REQ-01 | Provisioning Hetzner storico | Ritirato | Non iniziato | V-01, non applicabile | ADR-0003; ID e storico conservati. |
| REQ-02 | Home Assistant locale, offline e obiettivo remoto | Approvato | Non iniziato | V-02 | ISSUE-004, ISSUE-007, ISSUE-013, ISSUE-015. |
| REQ-03 | Fase 1 grafica, riferimento React Tunet | Approvato | In corso | V-03 | Base Tunet e prima HOME Neumorphism locali; conversione delle altre interfacce e accettazione del prodotto da completare. ISSUE-002; ISSUE-001/003 solo se HAKit viene adottato. |
| REQ-04 | Google/email, opzione futura | Proposto | Non iniziato | V-04 | Fuori dal minimo grafico; ISSUE-006, ISSUE-014. |
| REQ-05 | Identità/sessioni e credenziali HA | Proposto | Non iniziato | V-05 | Contratto da progettare; ISSUE-006, ISSUE-007. |
| REQ-06 | Admin e consegna del primo setup al cliente | Approvato | Non iniziato | V-06 | Comportamento richiesto; meccanismo aperto, ISSUE-006/008. |
| REQ-07 | Moduli e permessi | Proposto | Non iniziato | V-07 | Estensione da delimitare; ISSUE-008, ISSUE-009. |
| REQ-08 | Sincronizzazione | Proposto | Non iniziato | V-08 | Estensione da delimitare; ISSUE-009. |
| REQ-09 | Caricamento piantina | Proposto | Non iniziato | V-09 | Estensione da delimitare; ISSUE-014. |
| REQ-10 | Posizionamento e comandi da piantina | Proposto | Non iniziato | V-10 | Estensione da delimitare; ISSUE-008. |
| REQ-11 | Chat scenari | Proposto | Non iniziato | V-11 | Estensione da delimitare; ISSUE-010, ISSUE-014. |
| REQ-12 | Hosting modello AI, sede da valutare | Proposto | Non iniziato | V-12 | Nessun vincolo Hetzner; ISSUE-010, ISSUE-011, ISSUE-014. |
| REQ-13 | Validazione scenari | Proposto | Non iniziato | V-13 | Estensione da delimitare; ISSUE-009, ISSUE-010. |
| REQ-14 | Catalogo scenari | Proposto | Non iniziato | V-14 | Estensione da delimitare; ISSUE-009. |
| REQ-15 | Tablet e kiosk | Proposto | Non iniziato | V-15 | Client del pilota non inventariati; ISSUE-005, ISSUE-007. |
| REQ-16 | Valutazione piantina 3D | Proposto | Non iniziato | V-16 | Futuro/R&D; ISSUE-012. |
| REQ-17 | Amministratore condominiale per dispositivi comuni | Approvato | Non iniziato | V-17 | Obiettivo successivo; progetto dei permessi aperto, ISSUE-008/015. |

Le decisioni accettate sono [ADR-0001](decisions/ADR-0001-documentazione-e-storico.md) e [ADR-0002](decisions/ADR-0002-organizzazione-cartelle.md) per processo/struttura, e [ADR-0003](decisions/ADR-0003-home-assistant-locale-fase1.md) per la direzione di prodotto. Le evidenze applicative sono circoscritte alle interfacce e al banco locale documentati nei report di migrazione; non provano il prodotto completo.

## Registro dei problemi e limiti

Tutte le voci seguenti sono **Aperte** al 2026-10-05. Le decisioni chiariscono alcuni obiettivi, senza chiudere questioni tecniche prive di verifica. Fonti ed esiti della lettura sono nel [primo audit](reports/REP-20261002-001-audit-product.md). La chiusura richiede una decisione o una verifica pertinente; non basta spostare il problema in un altro documento.

### ISSUE-001

**HAKit — vincolo storico verificato, adozione eventuale aperta.** Le licenze dei pacchetti alla revisione esaminata richiedono una licenza commerciale separata. Tunet è il punto di partenza confermato; HAKit non è obbligatorio. Se l'SDK viene proposto, documentare condizioni autorizzate per versione e distribuzione. Evidenza: C-01 in [compliance.md](compliance.md#registro-dei-vincoli). Nessun acquisto o sostituzione autorizzati da questo registro.

### ISSUE-002

**Tunet — riferimento confermato, modalità di riuso aperta.** Il 2026-10-05 l'utente conferma Tunet come punto di partenza React. La revisione main acquisita con `git ls-remote` coincide con quella dell'audit: `5dec99587b4fcc2fb1f831a0a0002c9b90e6958e`, GPL-3.0. Per il prodotto fornito su hardware locale definire modifiche, artefatti consegnati e condizioni della distribuzione. Evidenza: C-02 e [REP-20261005-001](reports/REP-20261005-001-direzione-pilota.md). La direzione approvata non chiude il vincolo.

Sorgenti 1.22.1 acquisiti e installati per il banco prova autorizzato in REP-20261005-004, con licenza e impronte conservate. Nessuna distribuzione a clienti effettuata; condizioni del prodotto ancora aperte.

### ISSUE-003

**React/HAKit — compatibilità da verificare se l'SDK viene adottato.** Il manifest storico di HAKit Core richiede React/React DOM >=19.x e non coincide con React 18 dell'originale. Il punto di partenza corrente è Tunet; non è stata decisa una combinazione con HAKit. Nell'analisi tecnica scegliere una revisione e verificare le sue dipendenze effettive, senza imporre lo stack originale.

### ISSUE-004

**Metodo Home Assistant — banco prova Container, prodotto ancora aperto.** L'utente ha installato HA Container 2026.9.4 su Docker Desktop/WSL 2. Tunet viene eseguito come servizio Docker separato, senza app/Supervisor. Evidenza in REP-20261005-004. Metodo/versione e mantenimento delle funzioni native sul prodotto finale restano da definire; questo ambiente Windows non è il deployment Linux dell'hardware fornito.

### ISSUE-005

**Hardware e rete del pilota — inventario e compatibilità mancanti.** Pilota in ufficio, Linux 64 bit ARM64 o x86-64 approvati; mini PC/Raspberry sono alternative da scegliere. Rete cablata e componente Wi-Fi sono indicate dall'utente, ma funzione della «scheda ritornante wi-fi», modelli, protocolli, client, alimentazioni e interfacce non sono precisati. Restano le evidenze del primo audit su Shelly 1PM Gen3/Aqara FP2 e ZBT-1; nessun dispositivo è collaudato. Dipendenza fisica separata.

### ISSUE-006

**Autenticazione locale e primo setup — progetto mancante.** La proposta di Identity Provider obbligatorio Hetzner è superata. Progettare account/sessioni del frontend con HA, rinnovo/revoca e accesso offline. Flusso richiesto: sessione admin aperta solo per il primo setup, configurazione/associazione dispositivi, logout, login cliente. Definire attivazione e chiusura della sessione e provare l'assenza di privilegi admin residui. REQ-05/06; nessun automatismo è implementato.

### ISSUE-007

**Frontend offline — obiettivo confermato, realizzazione mancante.** Il funzionamento locale riguarda anche UI, stati e comandi, non soltanto automazioni. Progettare hosting degli asset Tunet, autenticazione e riavvio di client/gateway senza internet; inventariare integrazioni che richiedono cloud. Disponibilità dipendente anche da rete locale e alimentazione. Verifiche V-02/V-03/V-05/V-15 da delimitare al pilota.

Nel banco prova gli asset compilati Tunet sono serviti localmente. Font esterni rilevati nell'index upstream: vedere ISSUE-016. Nessuna prova con WAN assente eseguita.

### ISSUE-008

**Ruoli e isolamento — comportamenti approvati, meccanismo aperto.** Admin configura l'impianto in lavorazione; il cliente utilizza il proprio account dopo la consegna; l'amministratore condominiale configura solo dispositivi comuni ed esclude la configurazione dei dispositivi privati. Visibilità, letture e comandi vanno precisati. La regola automatica `@fourmemo.com` non è confermata. Definire policy e revoca su UI, API e dati, con V-06/V-07/V-17. Nessun ruolo HA personalizzato o accesso remoto permanente del sistemista è stato implementato o scelto.

### ISSUE-009

**Moduli, automazioni e distribuzione — lacuna progettuale.** REQ-07/REQ-08/REQ-13/REQ-14 devono distinguere widget, autorizzazioni e logiche locali. Per scenari e configurazioni definire versioni, conferma di attivazione, errori parziali e ripristino. Il distacco carichi citato dal PRD non ha ancora un requisito autonomo: chiarirne il perimetro prima di aggiungerne uno.

### ISSUE-010

**AI e prestazioni — ipotesi da misurare e lacuna semantica.** Uno schema non prova che uno scenario soddisfi l'intento o rispetti limiti operativi. Per REQ-11/REQ-12/REQ-13 definire comandi ammessi, validazione del comportamento, revisione delle correzioni e criteri del benchmark. <2s e risparmio di sviluppo >70% non hanno misurazioni.

### ISSUE-011

**Operazioni del sistema locale — inventario e procedure mancanti.** Per mini PC/Raspberry e frontend definire metodo/versioni, storage, riavvio, aggiornamenti, backup/ripristino e monitoraggio. Hardware, budget, client e scadenze del pilota non sono acquisiti. Hetzner è ritirato; eventuali risorse per il remoto o l'AI richiedono un nuovo progetto. Procedure in [infrastructure.md](infrastructure.md).

### ISSUE-012

**Perimetro del primo rilascio — chiarito in parte.** L'utente sceglie ufficio e minimo grafico su Home Assistant con Tunet. Nelle risposte successive del 2026-10-05 dichiara HA non ancora installato in ufficio e logo non disponibile; indica Neumorphism con un articolo Clay e tre reference, colore principale `#222222` e secondario arancione `#ef8231`. Restano schermate, palette completa e ruoli dei colori, logo, inventario, entità rappresentative, budget e tempi. Le estensioni non hanno un ordine assegnato e non entrano automaticamente nella fase 1; il 3D resta futuro/R&D. Dettagli in [pilot-scope.md](funzionalita/pilot-scope.md#direzione-grafica-confermata-e-proposte); fonti e limiti nell'annotazione del [report](reports/REP-20261005-001-direzione-pilota.md#annotazione-del-2026-10-05--risposte-successive-e-stile-grafico). Stato Aperto fino alla definizione del perimetro esecutivo.

Il successivo piano di raccolta approvato aggiorna la direzione: **tema chiaro e scuro**, accento `#ef8231`, `#222222` conservato come riferimento scuro; base chiara precisa ancora da scegliere. UI-001 guida il design e UI-007 il feedback luminoso; microinterazioni prioritarie, regolazione della luce durante il gesto, stato attivo stabile, alternative senza trascinamento e movimento ridotto sono specifiche confermate per la futura UI. [design.md](design/design.md#microinterazioni-richieste) ne è la fonte. Frequenza degli invii HA, geometria del gesto, stati di errore e adattamenti non sono implementati o collaudati.

### ISSUE-013

**Accesso remoto e trasporto — soluzione aperta.** L'accesso fuori casa è un obiettivo online; il broker Hetzner è ritirato e non è stato scelto un sostituto. Per LAN/remoto definire percorso, autenticazione, TLS, certificati e confini di fiducia. Nessuna proprietà end-to-end è dimostrata. Perdita di internet e indisponibilità della rete locale sono condizioni distinte.

### ISSUE-014

**Distribuzione software e dati — verifiche mancanti.** Il prodotto verrà fornito su hardware negli immobili; identificare artefatti distribuiti, licenze, account, dati, accessi, conservazione e backup locali. Hetzner è escluso; Google/Resend restano opzioni non approvate per la fase 1. Per eventuale AI o accesso remoto documentare nuovi flussi/provider prima dell'adozione. Voci nel [registro di conformità](compliance.md).

Per le sette reference UI raccolte mancano autore originale, URL e licenza: C-10 e [catalogo](design/componenti/README.md#provenienza). La raccolta non risolve le condizioni del riuso applicativo e non adotta styled-components.

### ISSUE-015

**Molti utenti su una macchina — valutazione richiesta, architettura aperta.** Distinguere utenti di uno stesso impianto da abitazioni separate con dispositivi comuni. Definire scala, accessi, reti, isolamento delle entità/configurazioni, risorse e conseguenze di un guasto comune. Capacità e organizzazione in una o più istanze HA non sono dimostrate né scelte. Collegamenti: REQ-02/17 e ISSUE-008. Chiusura con proposta motivata, eventuale decisione umana e verifiche pertinenti.

### ISSUE-016

**Risorse frontend esterne — Aperto, osservazione tecnica.** Tunet 1.22.1 carica stylesheet/font Google Fonts nel proprio index.html; il server consente anche risorse esterne per mappe/icone/media. Sono possibilità del codice, non prova che tutte siano utilizzate. Collegamenti: REQ-02/03, C-04/C-06 e REP-20261005-004. Proposta fuori dall'incarico di installazione: valutare font locali e censire richieste effettive prima del collaudo offline e della distribuzione. Nessuna sostituzione applicata. Chiusura con incarico dedicato, inventario dei flussi e prova offline delle schermate concordate.

### ISSUE-017

**Composizione frontend con primitive — Aperto, disallineamento progettuale.** L'utente richiede primitive condivise per componenti, tipografia e layout, con pagine composte principalmente da queste e componenti locali alla pagina (ADR-0004). Tunet 1.22.1 è parzialmente allineato nel riuso UI, ma markup/stile e organizzazione delle interfacce restano distribuiti. REQ-03; evidenze in [REP-20261005-005](reports/REP-20261005-005-audit-struttura-tunet.md). Proposta: definire API e composizione delle primitive nel prossimo incarico UI, preservando le funzioni HA concordate. Il primo incremento HOME è realizzato; il resto delle interfacce resta da organizzare. Chiusura con struttura concordata e verifica delle interfacce migrate.

Primo incremento REP-20261005-006: primitive componenti/tipografia/Flex e HOME vuota, header, navigazione e toolbar/menu migrati. REP-20261005-008 aggiunge il materiale Neumorphism HOME e i controlli condivisi. REP-20261005-009 aggiunge Input/Choice/Switch/Modal e finestre di gestione in TSX. ISSUE-017 resta aperto per il resto delle interfacce e il sistema visivo ACA completo; la prima migrazione non certifica tutto il frontend.

### ISSUE-018

**Manutenibilità dell'orchestrazione — Aperto, valutazione tecnica.** App e alcune modali hanno dimensioni elevate, molti parametri e contratti JS/JSDoc poco restrittivi. Lint/typecheck e 705 test passano: non è un guasto dimostrato. REQ-03; evidenze e conteggi nel report di audit. Proposta: delimitare responsabilità/contratti nell'incarico di organizzazione frontend, valutare la tipizzazione e misurare render/carico sul pilota. Al momento dell'audit non era stata scelta una migrazione. La successiva richiesta umana autorizza il primo incremento TypeScript della HOME (ADR-0005); nessuno store alternativo è stato scelto. Chiusura con confini concordati e controlli pertinenti, non con la sola riduzione delle righe.

tsconfig.home.json ora applica strict e controllo dichiarazioni inutilizzate alla porzione migrata e al relativo test. Il resto delle orchestrazioni/card resta JS; questa mitigazione circoscritta non chiude ISSUE-018.

### ISSUE-019

**Politica di invio della luminosità — Aperto, osservazione statica.** LightCard usa debounce 200 ms, LightModal invii su onChange (per frame sullo slider M3, nativi sui sottodispositivi). Non è una policy uniforme per la luce reale durante il gesto e la conferma HA prevista in design.md. REQ-03 e specifiche di interazione; report AUD-01. Proposta: definire frequenza, invio finale, errori e distinzione richiesto/confermato nel relativo incarico. Nessun comando fisico provato o comportamento modificato. Chiusura con scenario gesto/HA e verifica della policy implementata.

### ISSUE-020

**Guide upstream per agenti — Aperto, discrepanza verificata.** copilot-instructions.md cita React 18 e immagine hassen-app:latest; lockfile e banco prova sono rispettivamente React 19.2.8 e Compose ACA. Fonte immutata conservata, regole ACA nella radice. Proposta: mantenere una guida operativa ACA verificata e distinguere i riferimenti upstream quando saranno avviati gli incarichi UI; non copiare indicazioni storiche come decisioni correnti. Nessuna fonte upstream modificata. Chiusura con percorso operativo coerente e verificato per i futuri agenti. Evidenze in REP-20261005-005; continuità ADR-0001.

### ISSUE-021

**Traduzione delle interfacce precedenti — Aperto.** Italiano richiesto per le nuove interfacce (ADR-0005); HOME migrata e menu sono tradotti, data/ora usa it-IT. REP-20261005-009 completa i testi di aggiunta scheda e gestione pagine/icone. Profili, aspetto e altri pannelli precedenti restano parziali e usano fallback inglese. Proposta: completare i testi insieme alle schermate assegnate, verificando etichette, errori e accessibilità. Non è dichiarata l'app interamente tradotta né assegnata una traduzione integrale.

## Incarichi e punto di ripresa

| Report | Incarico | Stato |
|---|---|---|
| [REP-20261002-001](reports/REP-20261002-001-audit-product.md) | Lettura e audit del PRD originale | Completato; risultati documentati. |
| [REP-20261002-002](reports/REP-20261002-002-documentazione.md) | Documentazione e storico Git locale | Completato; verifiche documentali e storico locale registrati. |
| [REP-20261002-003](reports/REP-20261002-003-organizzazione-cartelle.md) | Separazione di documentazione, backup e progetto | Completato; percorsi, integrità e storico verificati. |
| [REP-20261005-001](reports/REP-20261005-001-direzione-pilota.md) | Direzione di prodotto e primo pilota in ufficio | Completato; direzione documentata, integrità e coerenza verificate, senza sviluppo. |
| [REP-20261005-002](reports/REP-20261005-002-moduli-documentali-design.md) | Separazione dei moduli funzionalità e design | Completato; design.md creato, moduli e collegamenti verificati. |
| [REP-20261005-003](reports/REP-20261005-003-raccolta-componenti-microinterazioni.md) | Raccolta componenti e microinterazioni | Completato; sette originali, catalogo e specifiche verificati senza implementazione. |
| [REP-20261005-004](reports/REP-20261005-004-installazione-tunet.md) | Installazione locale Tunet | Completato; sorgenti integri, servizio healthy, OAuth collegato e limiti documentati. |
| [REP-20261005-005](reports/REP-20261005-005-audit-struttura-tunet.md) | Audit della struttura Tunet | Completato; confronto, controlli isolati, integrità e documentazione verificati. |
| [REP-20261005-006](reports/REP-20261005-006-migrazione-home-typescript.md) | Prima migrazione HOME a TypeScript | Completato; primitive/TSX, italiano, mx-icons e controlli applicativi/documentali verificati. |
| [REP-20261005-007](reports/REP-20261005-007-conversione-neumorphism.md) | Fonte Antigravity sul design | Interrotto dall'utente; report originale conservato, token acquisiti e ripresa HOME in REP-008. Non prova la conversione integrale. |
| [REP-20261005-008](reports/REP-20261005-008-home-neumorphism.md) | Ripresa del design HOME | Completato; materiale chiaro/scuro, controlli condivisi, regressioni e storico verificati sul banco locale. |

| [REP-20261005-009](reports/REP-20261005-009-gestione-schede-pagine.md) | Gestione schede e pagine | Completato; primo gruppo della prosecuzione con TypeScript, italiano, temi, regressioni e browser. |

**Incarico attivo:** nessuno per il gruppo consegnato. [REP-20261005-009](reports/REP-20261005-009-gestione-schede-pagine.md) conclude aggiunta scheda, nuova pagina, modifica pagina e selettore icone. La richiesta «continuiamo con le altre pagine» è stata affrontata per questo primo gruppo collegato alla HOME; priorità degli altri gruppi non ancora specificata. Il report esterno REP-007 resta storico.

**Punto di ripresa:** prossimi gruppi suggeriti: impostazioni/aspetto/disposizione/intestazione, profili e pagine dispositivo. Usare ADR-0004/0005 e le primitive correnti; dimmer con riscontro HA, traduzione legacy completa e infrastruttura finale conservano i loro limiti. Il gruppo appena consegnato non dichiara la conversione del resto delle interfacce.
