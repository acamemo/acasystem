# Stato effettivo del progetto

Aggiornato: 2026-10-02. Responsabile dell'approvazione di prodotto: utente committente. Questo documento è la fonte corrente per stato dei requisiti, problemi e incarichi; i report conservano gli esiti datati.

## Situazione verificata

La cartella iniziale conteneva solo `product.md`. Git locale è stato inizializzato e l'originale è conservato nel commit `912ec16b818f2446c77b844b6ff24f44e30a5fa9`. La documentazione descrive progettazione e vincoli; il repository non contiene codice applicativo, configurazioni di deployment o test di prodotto.

Nessun servizio esterno, gateway o tablet è stato configurato o collaudato in questo incarico. Disponibilità di eventuali risorse esterne: non verificata. Non esistono evidenze di operatività, prestazioni o conformità del prodotto. Nessuna CI è configurata.

La struttura corrente separa [documentazione/](README.md), [backup/](../backup/README.md) e [progetto/](../progetto/README.md), secondo ADR-0002. Documenti e PRD sono in `documentazione/`; backup e progetto contengono soltanto i rispettivi README. Nessuna copia di backup è stata creata.

## Stati e responsabilità

- **Stato del requisito:** Proposto, Approvato, Rimandato, Ritirato. Approvato richiede riferimento a una richiesta/decisione umana. La pubblicazione iniziale del PRD ne registra l'intento, non l'approvazione tecnica di tutte le soluzioni.
- **Stato di realizzazione:** Non iniziato, In corso, Implementato, Verificato. Verificato richiede evidenza di accettazione; un documento progettuale non realizza la funzionalità descritta.
- **Problemi:** Aperto, Risolto, Accettato come limite, Superato. La classificazione distingue fatto verificato, lacuna progettuale e ipotesi da misurare.

I problemi usano ID progressivi `ISSUE-NNN`, mai riutilizzati; assegnare il numero successivo al massimo esistente. Registrare per ogni nuova voce categoria, stato, requisiti interessati, evidenza e condizione di chiusura. Risolto e Accettato come limite richiedono rispettivamente evidenza di soluzione o decisione umana; conservare il riferimento al report e aggiornare soltanto lo stato corrente.

Un nuovo incarico umano può autorizzare un requisito proposto: registrare l'ambito esatto e aggiornare lo stato corrispondente. Il backlog e il PRD non assegnano autonomamente nuovi incarichi agli agenti.

## Stato per requisito

Criteri proposti nel [PRD](product.md#11-criteri-di-accettazione-proposti); scenari in [verification.md](verification.md#scenari-di-prodotto-previsti).

| ID | Requisito | Approvazione | Realizzazione | Verifica prevista | Questioni collegate |
|---|---|---|---|---|---|
| REQ-00 | Banco hardware | Proposto | Non iniziato | V-00 | ISSUE-005; dipendenza fisica separata. |
| REQ-01 | Cloud Hetzner | Proposto | Non iniziato | V-01 | ISSUE-011 |
| REQ-02 | Hub & Spoke | Proposto | Non iniziato | V-02 | ISSUE-004, ISSUE-007, ISSUE-013 |
| REQ-03 | Dashboard e SDK | Proposto | Non iniziato | V-03 | ISSUE-001, ISSUE-002, ISSUE-003 |
| REQ-04 | Login Google/email | Proposto | Non iniziato | V-04 | ISSUE-008, ISSUE-014 |
| REQ-05 | Autenticazione gateway | Proposto | Non iniziato | V-05 | ISSUE-006, ISSUE-007 |
| REQ-06 | Ruolo amministratore | Proposto | Non iniziato | V-06 | ISSUE-008 |
| REQ-07 | Moduli e permessi | Proposto | Non iniziato | V-07 | ISSUE-008, ISSUE-009 |
| REQ-08 | Sincronizzazione | Proposto | Non iniziato | V-08 | ISSUE-009 |
| REQ-09 | Caricamento piantina | Proposto | Non iniziato | V-09 | ISSUE-014 |
| REQ-10 | Posizionamento e comandi | Proposto | Non iniziato | V-10 | ISSUE-008 |
| REQ-11 | Chat scenari | Proposto | Non iniziato | V-11 | ISSUE-010, ISSUE-014 |
| REQ-12 | Hosting modello AI | Proposto | Non iniziato | V-12 | ISSUE-010, ISSUE-011, ISSUE-014 |
| REQ-13 | Validazione scenari | Proposto | Non iniziato | V-13 | ISSUE-009, ISSUE-010 |
| REQ-14 | Catalogo scenari | Proposto | Non iniziato | V-14 | ISSUE-009 |
| REQ-15 | Tablet kiosk | Proposto | Non iniziato | V-15 | ISSUE-005, ISSUE-007 |
| REQ-16 | Valutazione piantina 3D | Proposto, futuro/R&D | Non iniziato | V-16 | ISSUE-012 |

Non ci sono evidenze applicative per questi requisiti. Le decisioni accettate sono [ADR-0001](decisions/ADR-0001-documentazione-e-storico.md), sul processo documentale, e [ADR-0002](decisions/ADR-0002-organizzazione-cartelle.md), sulla separazione delle cartelle. Nessuna delle due approva lo stack applicativo.

## Registro dei problemi e limiti

Tutte le voci seguenti sono **Aperte** al 2026-10-02. Fonti ed esiti della lettura sono nel [primo audit](reports/REP-20261002-001-audit-product.md). La chiusura richiede una decisione o una verifica pertinente; non basta spostare il problema in un altro documento.

### ISSUE-001

**Licenze HAKit — fatto verificato, vincolo all'adozione commerciale.** Le licenze dei due pacchetti alla revisione esaminata richiedono una licenza commerciale separata. Per REQ-03 occorre documentare le condizioni autorizzate oppure proporre una soluzione diversa. Nessun acquisto, contatto con l'autore o sostituzione è autorizzato da questo registro. Evidenza: C-01 in [compliance.md](compliance.md#registro-dei-vincoli).

### ISSUE-002

**Tunet — licenza verificata, scelta di riuso aperta.** GPL-3.0 nella revisione esaminata. Chiarire se REQ-03 usa solo riferimenti progettuali o codice, quali artefatti vengono distribuiti e con quali condizioni. Evidenza: C-02 nel registro di conformità.

### ISSUE-003

**React/HAKit — incompatibilità dichiarata nella combinazione proposta.** Il manifest esaminato di HAKit Core richiede React/React DOM >=19.x; il PRD proponeva React 18. Selezionare e verificare versioni compatibili nell'incarico frontend; non è stata scelta una sostituzione.

### ISSUE-004

**Home Assistant Container — limite di installazione verificato.** La modalità Container non include la gestione delle app/add-on di HA OS. Per REQ-02 delimitare cosa significa conservare le funzionalità native e come gestire eventuali servizi complementari.

### ISSUE-005

**Banco e radio — dati verificati, compatibilità complessiva non collaudata.** Shelly 1PM Gen3 e Aqara FP2 sono Wi-Fi/Bluetooth; il multiprotocollo Zigbee/Thread su ZBT-1 è sconsigliato dalla fonte ufficiale. Restano da verificare distinta base, alimentazioni, interfacce isolate e modelli esatti. REQ-00/REQ-15 dipendono dall'ambito delle installazioni fisiche, separato da questo registro di conformità.

### ISSUE-006

**Identità centrale e token HA — lacuna progettuale.** REQ-05 non definisce associazione degli utenti, emissione, rinnovo e revoca delle credenziali accettate da HA, né il comportamento locale senza cloud. La fattibilità della soluzione ACA deve essere progettata e provata.

### ISSUE-007

**Dashboard offline — lacuna progettuale.** REQ-02/REQ-05/REQ-15 descrivono automazioni locali ma non chiariscono avvio del client, credenziali scadute e riavvio del tablet senza internet. Definire comportamenti e disponibilità locale dei dati necessari, poi eseguire V-02/V-05/V-15.

### ISSUE-008

**Autorizzazioni e separazione impianti — lacuna progettuale.** Per REQ-04/REQ-06/REQ-07/REQ-10 definire controllo server/gateway, assegnazione e revoca dei privilegi, gestione account tecnici e accesso alle entità. Verificare anche chiamate API dirette e identità di un altro impianto. La regola del dominio email è ancora una proposta.

### ISSUE-009

**Moduli, automazioni e distribuzione — lacuna progettuale.** REQ-07/REQ-08/REQ-13/REQ-14 devono distinguere widget, autorizzazioni e logiche locali. Per scenari e configurazioni definire versioni, conferma di attivazione, errori parziali e ripristino. Il distacco carichi citato dal PRD non ha ancora un requisito autonomo: chiarirne il perimetro prima di aggiungerne uno.

### ISSUE-010

**AI e prestazioni — ipotesi da misurare e lacuna semantica.** Uno schema non prova che uno scenario soddisfi l'intento o rispetti limiti operativi. Per REQ-11/REQ-12/REQ-13 definire comandi ammessi, validazione del comportamento, revisione delle correzioni e criteri del benchmark. <2s e risparmio di sviluppo >70% non hanno misurazioni.

### ISSUE-011

**Operazioni cloud/gateway — progettazione e inventario mancanti.** REQ-01/REQ-02/REQ-12 non hanno provisioning verificato, dimensionamento approvato, budget, gestione aggiornamenti, backup/ripristino o monitoraggio provati. Documentare prima le risorse reali e poi procedure e risultati. Dettagli operativi in [infrastructure.md](infrastructure.md).

### ISSUE-012

**Primo rilascio e roadmap — proposta da delimitare.** Mancano primo segmento cliente, scala del primo impianto e vincoli del rilascio. Sprint e priorità del PRD sono stime iniziali; il 3D resta futuro/R&D. I criteri aggiunti al PRD sono proposti e non costituiscono nuove approvazioni.

### ISSUE-013

**Trasporto e cifratura — proprietà da dimostrare.** Il PRD cita connessione LAN e cifratura end-to-end remota senza precisare TLS, certificati, terminazione presso il broker e confini di fiducia. Verificare la proprietà reale rispetto al progetto scelto; un tunnel non dimostra da solo tutte queste garanzie.

### ISSUE-014

**Dati e condizioni dei fornitori — informazioni mancanti.** Per account, planimetrie, presenza, telemetria, chat e backup identificare dati, finalità, accessi, conservazione e trasferimenti. Mancano valutazioni dei servizi Google/Resend/Hetzner e delle licenze dei modelli AI. Voci C-03/C-04/C-06/C-07/C-08 nel registro di conformità.

## Incarichi e punto di ripresa

| Report | Incarico | Stato |
|---|---|---|
| [REP-20261002-001](reports/REP-20261002-001-audit-product.md) | Lettura e audit del PRD originale | Completato; risultati documentati. |
| [REP-20261002-002](reports/REP-20261002-002-documentazione.md) | Documentazione e storico Git locale | Completato; verifiche documentali e storico locale registrati. |
| [REP-20261002-003](reports/REP-20261002-003-organizzazione-cartelle.md) | Separazione di documentazione, backup e progetto | Completato; percorsi, integrità e storico verificati. |

**Incarico attivo:** nessuno. La documentazione e la separazione delle cartelle sono completate. Il prossimo intervento richiede una richiesta umana che ne identifichi obiettivo e perimetro; nessun lavoro applicativo o di provisioning è avviato. L'area backup è predisposta senza copie o automazioni.

**Backlog proposto, non assegnato:** chiarire vincoli delle dipendenze frontend; progettare identità/permessi/offline; delimitare primo rilascio e infrastruttura. L'ordine finale richiede il prossimo incarico umano.
