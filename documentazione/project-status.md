# Stato effettivo del progetto

Aggiornato: 2026-10-05. Responsabile dell'approvazione di prodotto: utente committente. Questo documento è la fonte corrente per stato dei requisiti, problemi e incarichi; i report conservano gli esiti datati.

## Situazione verificata

La cartella iniziale conteneva solo `product.md`. Git locale è stato inizializzato e l'originale è conservato nel commit `912ec16b818f2446c77b844b6ff24f44e30a5fa9`. La documentazione descrive progettazione e vincoli; il repository non contiene codice applicativo, configurazioni di deployment o test di prodotto.

Nessun servizio esterno, gateway o tablet è stato configurato o collaudato in questo incarico. Disponibilità di eventuali risorse esterne: non verificata. Non esistono evidenze di operatività, prestazioni o conformità del prodotto. Nessuna CI è configurata.

La struttura corrente separa [documentazione/](README.md), [backup/](../backup/README.md) e [progetto/](../progetto/README.md), secondo ADR-0002. Documenti e PRD sono in `documentazione/`; backup e progetto contengono soltanto i rispettivi README. Nessuna copia di backup è stata creata.

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
| REQ-03 | Fase 1 grafica, riferimento React Tunet | Approvato | Non iniziato | V-03 | ISSUE-002; ISSUE-001/003 solo se HAKit viene adottato. |
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

Le decisioni accettate sono [ADR-0001](decisions/ADR-0001-documentazione-e-storico.md) e [ADR-0002](decisions/ADR-0002-organizzazione-cartelle.md) per processo/struttura, e [ADR-0003](decisions/ADR-0003-home-assistant-locale-fase1.md) per la direzione di prodotto. Nessuna evidenza di implementazione applicativa è disponibile.

## Registro dei problemi e limiti

Tutte le voci seguenti sono **Aperte** al 2026-10-05. Le decisioni chiariscono alcuni obiettivi, senza chiudere questioni tecniche prive di verifica. Fonti ed esiti della lettura sono nel [primo audit](reports/REP-20261002-001-audit-product.md). La chiusura richiede una decisione o una verifica pertinente; non basta spostare il problema in un altro documento.

### ISSUE-001

**HAKit — vincolo storico verificato, adozione eventuale aperta.** Le licenze dei pacchetti alla revisione esaminata richiedono una licenza commerciale separata. Tunet è il punto di partenza confermato; HAKit non è obbligatorio. Se l'SDK viene proposto, documentare condizioni autorizzate per versione e distribuzione. Evidenza: C-01 in [compliance.md](compliance.md#registro-dei-vincoli). Nessun acquisto o sostituzione autorizzati da questo registro.

### ISSUE-002

**Tunet — riferimento confermato, modalità di riuso aperta.** Il 2026-10-05 l'utente conferma Tunet come punto di partenza React. La revisione main acquisita con `git ls-remote` coincide con quella dell'audit: `5dec99587b4fcc2fb1f831a0a0002c9b90e6958e`, GPL-3.0. Per il prodotto fornito su hardware locale definire modifiche, artefatti consegnati e condizioni della distribuzione. Evidenza: C-02 e [REP-20261005-001](reports/REP-20261005-001-direzione-pilota.md). La direzione approvata non chiude il vincolo.

### ISSUE-003

**React/HAKit — compatibilità da verificare se l'SDK viene adottato.** Il manifest storico di HAKit Core richiede React/React DOM >=19.x e non coincide con React 18 dell'originale. Il punto di partenza corrente è Tunet; non è stata decisa una combinazione con HAKit. Nell'analisi tecnica scegliere una revisione e verificare le sue dipendenze effettive, senza imporre lo stack originale.

### ISSUE-004

**Metodo Home Assistant — scelta aperta, limite Container verificato.** Home Assistant è obbligatorio; Container è soltanto un candidato originale e non include la gestione delle app di HA OS. Definire metodo/versione e mantenimento delle funzioni native richieste, considerando hosting Tunet e servizi complementari. Nessuna installazione è stata effettuata.

### ISSUE-005

**Hardware e rete del pilota — inventario e compatibilità mancanti.** Pilota in ufficio, Linux 64 bit ARM64 o x86-64 approvati; mini PC/Raspberry sono alternative da scegliere. Rete cablata e componente Wi-Fi sono indicate dall'utente, ma funzione della «scheda ritornante wi-fi», modelli, protocolli, client, alimentazioni e interfacce non sono precisati. Restano le evidenze del primo audit su Shelly 1PM Gen3/Aqara FP2 e ZBT-1; nessun dispositivo è collaudato. Dipendenza fisica separata.

### ISSUE-006

**Autenticazione locale e primo setup — progetto mancante.** La proposta di Identity Provider obbligatorio Hetzner è superata. Progettare account/sessioni del frontend con HA, rinnovo/revoca e accesso offline. Flusso richiesto: sessione admin aperta solo per il primo setup, configurazione/associazione dispositivi, logout, login cliente. Definire attivazione e chiusura della sessione e provare l'assenza di privilegi admin residui. REQ-05/06; nessun automatismo è implementato.

### ISSUE-007

**Frontend offline — obiettivo confermato, realizzazione mancante.** Il funzionamento locale riguarda anche UI, stati e comandi, non soltanto automazioni. Progettare hosting degli asset Tunet, autenticazione e riavvio di client/gateway senza internet; inventariare integrazioni che richiedono cloud. Disponibilità dipendente anche da rete locale e alimentazione. Verifiche V-02/V-03/V-05/V-15 da delimitare al pilota.

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

### ISSUE-013

**Accesso remoto e trasporto — soluzione aperta.** L'accesso fuori casa è un obiettivo online; il broker Hetzner è ritirato e non è stato scelto un sostituto. Per LAN/remoto definire percorso, autenticazione, TLS, certificati e confini di fiducia. Nessuna proprietà end-to-end è dimostrata. Perdita di internet e indisponibilità della rete locale sono condizioni distinte.

### ISSUE-014

**Distribuzione software e dati — verifiche mancanti.** Il prodotto verrà fornito su hardware negli immobili; identificare artefatti distribuiti, licenze, account, dati, accessi, conservazione e backup locali. Hetzner è escluso; Google/Resend restano opzioni non approvate per la fase 1. Per eventuale AI o accesso remoto documentare nuovi flussi/provider prima dell'adozione. Voci nel [registro di conformità](compliance.md).

### ISSUE-015

**Molti utenti su una macchina — valutazione richiesta, architettura aperta.** Distinguere utenti di uno stesso impianto da abitazioni separate con dispositivi comuni. Definire scala, accessi, reti, isolamento delle entità/configurazioni, risorse e conseguenze di un guasto comune. Capacità e organizzazione in una o più istanze HA non sono dimostrate né scelte. Collegamenti: REQ-02/17 e ISSUE-008. Chiusura con proposta motivata, eventuale decisione umana e verifiche pertinenti.

## Incarichi e punto di ripresa

| Report | Incarico | Stato |
|---|---|---|
| [REP-20261002-001](reports/REP-20261002-001-audit-product.md) | Lettura e audit del PRD originale | Completato; risultati documentati. |
| [REP-20261002-002](reports/REP-20261002-002-documentazione.md) | Documentazione e storico Git locale | Completato; verifiche documentali e storico locale registrati. |
| [REP-20261002-003](reports/REP-20261002-003-organizzazione-cartelle.md) | Separazione di documentazione, backup e progetto | Completato; percorsi, integrità e storico verificati. |
| [REP-20261005-001](reports/REP-20261005-001-direzione-pilota.md) | Direzione di prodotto e primo pilota in ufficio | Completato; direzione documentata, integrità e coerenza verificate, senza sviluppo. |
| [REP-20261005-002](reports/REP-20261005-002-moduli-documentali-design.md) | Separazione dei moduli funzionalità e design | Completato; design.md creato, moduli e collegamenti verificati. |

**Incarico attivo:** nessuno. REP-20261005-002 completato: moduli funzionalità e design separati, design.md creato e controlli DOC-14–DOC-16 superati. Dettagli visivi e prossimo lavoro applicativo restano da assegnare; sviluppo, acquisti e provisioning non sono avviati. L'area backup resta predisposta senza copie o automazioni.

**Backlog proposto, non assegnato:** analisi tecnica Tunet e schermate della fase 1; inventario dell'ufficio e metodo HA; autenticazione/setup/offline; remoto e isolamento condominiale nei rispettivi incarichi. Il prossimo incarico deve precisare risultato e perimetro.
