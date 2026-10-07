# Stato effettivo del progetto

Aggiornato: 2026-10-07. Responsabile dell'approvazione di prodotto: utente committente. Questo documento è la fonte corrente per stato dei requisiti, problemi e incarichi; i report conservano gli esiti datati.

## Situazione verificata

La cartella iniziale conteneva solo `product.md`. Git locale è stato inizializzato e l'originale è conservato nel commit `912ec16b818f2446c77b844b6ff24f44e30a5fa9`. Il 2026-10-05 l'utente ha installato HA Container e concluso il setup. Nel successivo incarico [REP-20261005-004](reports/REP-20261005-004-installazione-tunet.md) sono stati acquisiti i sorgenti Tunet 1.22.1 e predisposto il [Compose locale](../progetto/compose.tunet.yaml). Il banco corrente usa Acasystem 0.1 su localhost:3002: frontend «OS» Metallo e backend TypeScript, revisione e aggiornamento autorizzato conclusi in [REP-20261006-002](reports/REP-20261006-002-ripresa-revisione.md). La verifica del 2026-10-07 conferma container healthy, health versione 0.1.0, sessione OAuth conservata, stato «Collegato», copertina, Principale e navigazione verso Sistema nel browser laterale. HA 2026.9.4 resta il sistema locale installato dall'utente. Le verifiche precedenti della HOME e dei pannelli restano nei report datati; dispositivi fisici, offline e accettazione del prodotto non sono collaudati.

La [raccolta UI](design/componenti/README.md) contiene ora sette campioni di codice come reference testuali in documentazione, senza adattamenti o integrazione. Sono distinti dal futuro codice applicativo in progetto/. Hash e fonti registrano l'acquisizione; non dimostrano collaudo o licenza del riuso.

Nessun servizio esterno, gateway o tablet è stato configurato o collaudato in questo incarico. Disponibilità di eventuali risorse esterne: non verificata. Non esistono evidenze di operatività, prestazioni o conformità del prodotto. Nessuna CI è configurata.

La struttura corrente separa [documentazione/](README.md), [backup/](../backup/README.md) e [progetto/](../progetto/README.md), secondo ADR-0002. Progetto contiene i workspace Acasystem frontend/backend (ADR-0008); gli originali Tunet restano nello storico e nello ZIP. Backup contiene l'acquisizione e le copie manuali del volume Tunet/Acasystem, inclusa quella a freddo precedente all'aggiornamento del 2026-10-07, escluse da Git. Nessun ripristino dei dati, backup automatico o nuovo backup HA è stato provato; fonte operativa in [infrastructure.md](infrastructure.md).

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
| REQ-03 | Fase 1 grafica, riferimento React Tunet | Approvato | In corso | V-03 | Acasystem 0.1 «OS» Metallo disponibile sul banco, revisione conclusa (REP-20261006-002); accettazione del prodotto e dispositivi fisici da completare. ISSUE-002; ISSUE-026/027/028/029; ISSUE-001/003 solo se HAKit viene adottato. |
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

Inventario verificato durante la ripresa del 2026-10-06 (SEC-4, REP-20261006-002): `CarDetails.tsx` carica una mappa da `www.openstreetmap.org` con coordinate del veicolo nei parametri; `mediaLogos.ts` carica loghi TV da `cdn.simpleicons.org`, indicando l'app mostrata. Inter viene ora servito localmente tramite `@fontsource/inter`; Google Fonts non è nel nuovo entry point. Loghi locali e mappa su richiesta/offline sono proposte, non modifiche autorizzate. Le integrazioni e le immagini fornite da HA possono aggiungere altre origini; il censimento statico non prova l'assenza di traffico esterno in ogni installazione.

### ISSUE-017

**Composizione frontend con primitive — Aperto, disallineamento progettuale.** L'utente richiede primitive condivise per componenti, tipografia e layout, con pagine composte principalmente da queste e componenti locali alla pagina (ADR-0004). Tunet 1.22.1 è parzialmente allineato nel riuso UI, ma markup/stile e organizzazione delle interfacce restano distribuiti. REQ-03; evidenze in [REP-20261005-005](reports/REP-20261005-005-audit-struttura-tunet.md). Proposta: definire API e composizione delle primitive nel prossimo incarico UI, preservando le funzioni HA concordate. Il primo incremento HOME è realizzato; il resto delle interfacce resta da organizzare. Chiusura con struttura concordata e verifica delle interfacce migrate.

Primo incremento REP-20261005-006: primitive componenti/tipografia/Flex e HOME vuota, header, navigazione e toolbar/menu migrati. REP-20261005-008 aggiunge il materiale Neumorphism HOME e i controlli condivisi. REP-20261005-009 aggiunge Input/Choice/Switch/Modal e finestre di gestione in TSX. REP-20261005-011 aggiunge la primitiva Card, adottata soltanto da SensorCard, e il materiale a pressione di pulsanti ed emblema. ISSUE-017 resta aperto per il resto delle interfacce e il sistema visivo ACA completo; la prima migrazione non certifica tutto il frontend.

### ISSUE-018

**Manutenibilità dell'orchestrazione — Aperto per valutazione sul pilota.** Nell'audit iniziale App e alcune modali avevano dimensioni elevate, molti parametri e contratti JS/JSDoc poco restrittivi. Lint/typecheck e 705 test passavano: non era un guasto dimostrato. REQ-03; evidenze e conteggi storici in REP-20261005-005. ADR-0008 e REP-20261006-001/002 hanno poi introdotto workspace separati, gerarchia frontend e TypeScript strict nell'app corrente; nessuno store alternativo è stato scelto. Restano da misurare render/carico nell'ufficio e verificare i confini sul pilota. Chiusura con controlli pertinenti, non con la sola riduzione delle righe.

L'incremento iniziale usava `tsconfig.home.json` soltanto sulla HOME. Dal 2026-10-07 il frontend applicativo usa `frontend/tsconfig.strict.json`, il backend `backend/tsconfig.json`; il legacy JS/JSX è stato cancellato il 2026-10-07 (ISSUE-029). Le verifiche correnti sono in REP-20261006-002, senza equiparare la tipizzazione al collaudo sul pilota.

### ISSUE-019

**Politica di invio della luminosità — Aperto, osservazione statica.** LightCard usa debounce 200 ms, LightModal invii su onChange (per frame sullo slider M3, nativi sui sottodispositivi). Non è una policy uniforme per la luce reale durante il gesto e la conferma HA prevista in design.md. REQ-03 e specifiche di interazione; report AUD-01. Proposta: definire frequenza, invio finale, errori e distinzione richiesto/confermato nel relativo incarico. Nessun comando fisico provato o comportamento modificato. Chiusura con scenario gesto/HA e verifica della policy implementata.

### ISSUE-020

**Guide upstream per agenti — Aperto, discrepanza verificata.** copilot-instructions.md cita React 18 e immagine hassen-app:latest; lockfile e banco prova sono rispettivamente React 19.2.8 e Compose ACA. Fonte immutata conservata, regole ACA nella radice. Proposta: mantenere una guida operativa ACA verificata e distinguere i riferimenti upstream quando saranno avviati gli incarichi UI; non copiare indicazioni storiche come decisioni correnti. Nessuna fonte upstream modificata. Chiusura con percorso operativo coerente e verificato per i futuri agenti. Evidenze in REP-20261005-005; continuità ADR-0001.

### ISSUE-021

**Traduzione delle interfacce — Aperto per verifica complessiva.** Italiano richiesto per le nuove interfacce (ADR-0005); l'audit iniziale rilevava fallback inglesi nei pannelli upstream. ADR-0007 ha successivamente fissato italiano e tema Acasystem ed eliminato Aspetto; REP-20261006-001/002 ha sostituito launcher, widget e Sistema. Copertina, pagina vuota e Sistema sono osservati in italiano nel banco il 2026-10-07. Le schermate legacy conservate non entrano nella build corrente. Restano da verificare tutti gli errori e i contenuti dinamici del pilota; nomi e valori forniti da HA dipendono dalla configurazione dell'impianto. Non è dichiarata una verifica completa di ogni stringa.

### ISSUE-022

**Contrasto delle etichette secondarie nelle card — Aperto, osservazione di calcolo, proposta.** SensorCard mostra l'etichetta con `text-secondary` e opacità 0,6. Su sRGB opachi il contrasto risulta circa 3,1:1 nel tema scuro e 2,8:1 nel chiaro prima di REP-20261005-011, e 3,0–3,2 / 2,6–2,9 con il nuovo materiale: il materiale non lo peggiora in modo apprezzabile, ma il valore resta sotto 4,5:1 per testo piccolo. REQ-03; calcoli in [REP-20261005-011](reports/REP-20261005-011-materiale-pressione.md). Proposta: decidere nell'incarico di conversione delle card se rimuovere l'opacità o usare un colore dedicato, verificando anche le altre card. Nessuna modifica applicata. Chiusura con contrasto verificato per le etichette delle card migrate.

### ISSUE-023

**Blocco impostazioni rimosso — Aperto, conseguenza di ADR-0007.** Con l'eliminazione del pannello Aspetto sparisce anche il blocco impostazioni di Tunet: sui tablet chiunque può aprire Sistema e modificare pagine e widget. REQ-05/06/15, ISSUE-006/008. Proposta: inserire la protezione nel progetto di ruoli e sessioni, con una sessione cliente senza privilegi di configurazione. Chiusura con una protezione progettata e verificata su UI e API.

### ISSUE-024

**Robustezza delle API del backend — Aperto, proposta da A1 (REP-20261006-001).** La migrazione TypeScript conserva volutamente alcuni comportamenti di Tunet:

- un PUT/POST senza corpo JSON produce 500;
- id di tipo non stringa (booleani, oggetti) arrivano a better-sqlite3 e producono 500.

Proposta: 400 con messaggio e validazione dei tipi degli id. Non applicata per non cambiare le risposte durante la migrazione. Chiusura con validatori aggiornati e test dei casi.

### ISSUE-025

**Sovraccarico globale di parseFloat — Risolto nel codice corrente.** Il sovraccarico è stato rimosso nell'ondata 3 di REP-20261006-001; la ripresa REP-20261006-002 conferma il typecheck strict senza l'allentamento globale. Il legacy resta escluso dal programma TypeScript.

### ISSUE-026

**Parità residua delle persone e delle taglie — Aperto, limiti della revisione OS.** I widget attivi recuperano le impostazioni di calendario, attività, meteo, videocamera, TV, energia, separatore e aspirapolvere (PAR-1/2/3). Le persone nella nuova barra usano soltanto nome e stato: foto/icona, batterie, tracker e sensori aggiuntivi del vecchio pannello non hanno un consumer migrato. Non sono state aggiunte impostazioni inerti. L'altezza del separatore è governata dalle celle, mentre `heightPx` legacy non è consumato. Costi/auto/stanza limitati a 2×2; una luce senza dimmer può ancora occupare 2×2 perché il contratto delle taglie è statico e serve anche alle luci regolabili (DES-9). Fonti: REP-20261006-002, confronto del codice nuovo con EditCardModal legacy. Le impostazioni storiche restano salvate. Chiusura: incarico per decidere e verificare la parità delle persone e l'eventuale taglia dipendente dalle capacità del dispositivo. Nessun nuovo comportamento assegnato da questa voce.

### ISSUE-027

**Residui di sicurezza della revisione OS — Aperto, decisioni richieste (REP-20261006-002).**
- **Identità dal backend (SEC-1) — risolto il 2026-10-07.** Su decisione dell'utente («Rifiuta sempre») il backend valida il token solo presso `TUNET_INTERNAL_HA_URL` / `TUNET_INTERNAL_HA_FALLBACK_URL`. Senza variabili valide risponde 503 `HA_URL_NOT_CONFIGURED` e non usa mai `x-ha-url` del client: niente più finto HA né sondaggi della rete interna. Rimosse le alternative Docker degli URL del client. Test: `haAuth`, `server`, `routeAuth` (93/93).
- **Lettore go2rtc (SEC-3).** La CSP del backend (`frame-src https://www.openstreetmap.org`) blocca i lettori personalizzati delle videocamere. Il widget ora passa subito alla fonte successiva, ma per usare davvero go2rtc serve allargare `frame-src`.
- **Uscita OAuth (SEC-2).** Il refresh token viene cancellato dal dispositivo ma non revocato su HA (`auth.revoke()` non applicato). Un'altra scheda aperta può restituire i token dopo «Esci», comportamento ereditato. Il vecchio `ha_token` resta salvato dopo il passaggio a OAuth.

Proposte:
- origini go2rtc da variabile d'ambiente;
- revoca all'uscita.

Requisiti collegati: REQ-05/06/17, ISSUE-006/008/015. Chiusura con le decisioni dell'utente, le modifiche e i test.

### ISSUE-028

**Area di tocco e celle piccole — Aperto, limiti della revisione OS (REP-20261006-002).**
- **Area di tocco (RESP-3).** Il `::before` porta i pulsanti a 44 px senza cambiare l'aspetto, ma con due limiti: le voci del Segmented sm arrivano a 42,8 px, perché la traccia ritaglia; nei menu con voci da 30,8 px e passo di 36,4 px l'ultimo 1–2 px di una voce attiva la successiva.
- **Celle piccole (RESP-1).** In modifica a 640x400 (tablet con zoom al 200%) le celle sono di 65 px. Sotto circa 82 px alcuni widget 2×1 con una riga di comandi (sensore con interruttore, script, automazione, tapparella, serratura) e la luce 2×2 con cursore escono dall'area del contenuto. La griglia `phoneLandscape` 6×2 è una scelta esecutiva misurata nell'anteprima, non su dispositivi reali.

Proposte:
- passo dei menu e Segmented a 44 px, che cambia l'aspetto e richiede l'assenso dell'utente;
- barra di modifica compatta in orizzontale;
- densità dei widget sui pixel reali.

Aggiornamento 2026-10-07 (REP-20261007-001): i pulsanti della cornice e la × di rimozione arrivano ora a 44 px. Restano aperti:
- con 9–13 pagine sui telefoni stretti l'indicatore e la barra di modifica non hanno una forma compatta (V2-01/V2-02);
- sui telefoni verticali la seconda riga della fascia del piè di pagina resta vuota in vista, per tenere la griglia identica a quella della modifica (V-02);
- quando il widget non entra nella cella toccata, l'annuncio non dice dove è finito (V2-06);
- da decidere con l'utente: griglia più larga per gli schermi oltre ~16:9, righe in più sul telefono.

Chiusura con le misure sul tablet pilota e sul telefono.

### ISSUE-029

**Codice legacy Tunet — Risolto il 2026-10-07.** Su richiesta dell'utente («procedi con la cancellazione del legacy») sono stati cancellati 232 file:
- l'interfaccia Tunet sostituita (App.jsx, main.jsx, components/{cards,charts,effects,pages,sidebars,ui,camera}, modals, layouts, rendering, icons, config, stili e 51 test legacy);
- 7 moduli TypeScript usati solo dal legacy;
- gli e2e e tre script di Tunet.

L'elenco viene da un tracciamento delle importazioni (`backup/legacy-da-cancellare.txt`). Il classificatore dei permessi ha negato la cancellazione all'agente, quindi l'ha eseguita l'utente. Ripuliti `tsconfig.strict.json`, lo script di tipografia, la regola ESLint delle primitive, l'ingresso `main.tsx`/`app.tsx` e la configurazione e2e. Esito: suite frontend 1161/1161 senza fallimenti; build, budget e immagine verificati (verification.md). Le istantanee `usa-come-git/v009`–`v011` conservano il codice cancellato.

### ISSUE-030

**Colori relativi OKLCH e browser del tablet — Aperto.** Categoria: compatibilità, ipotesi da misurare. Requisiti: REQ-03. Dal 2026-10-07 le scale del kit sono derivate con `oklch(from …)` (REP-20261007-005), supportato da Chrome/Edge 119+, Safari 18+, Firefox 128+; un browser o WebView più vecchio ignora le dichiarazioni e lascia i colori indefiniti. Evidenza: resa corretta nel browser integrato del banco; nessuna prova sul tablet del pilota. Chiusura: verifica sul dispositivo del pilota, oppure decisione su un ripiego precalcolato al build.

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
| [REP-20261005-010](reports/REP-20261005-010-pannelli-skeleton.md) | Transizioni e skeleton | Completato; presenza/uscita, movimento ridotto, caricamenti e regressioni verificati. |
| [REP-20261005-011](reports/REP-20261005-011-materiale-pressione.md) | Materiale a pressione (UI-003) su barra, card di stato e benvenuto | Completato; materiale, primitiva Card, regressioni, build e banco locale verificati; card reale con entità non osservata. Nessun commit. |
| [REP-20261005-012](reports/REP-20261005-012-sistema-metallo.md) | Sistema «Metallo» a strati (kit e pagina di prova) | Completato per le fasi 1–2; fase 3 confluita in REP-20261006-001. |
| [REP-20261006-001](reports/REP-20261006-001-acasystem-os.md) | Rifacimento del frontend come «OS» Metallo, con subagenti | Completato con le ondate 0–4; correzioni della revisione finale chiuse in REP-20261006-002. |
| [REP-20261006-002](reports/REP-20261006-002-ripresa-revisione.md) | Ripresa e chiusura della revisione OS | Completato e verificato; SEC-1 «rifiuta sempre» e banco su `aca-system:0.1` il 2026-10-07 (annotazione nel report). |
| [REP-20261007-001](reports/REP-20261007-001-launcher-polish.md) | Polish e layout del launcher, «Principale» come schermata di base | Completato e verificato; banco su `aca-system:0.2`. |
| [REP-20261007-003](reports/REP-20261007-003-animazioni-principale.md) | Revisione animazioni della «Principale» e kit alleggerito | Completato e verificato; banco su `aca-system:0.4`. |
| [REP-20261007-004](reports/REP-20261007-004-prototipi-ui-kit.md) | Pagina «UI kit» con prototipi Principale e Temperatura | Completato; banco su `aca-system:0.5`. |
| [REP-20261007-005](reports/REP-20261007-005-colori-derivati.md) | Colori derivati da una base, neutri sul bianco, pozzetti più leggeri | Completato; banco su `aca-system:0.5`. Compatibilità dei colori relativi col tablet da verificare. |
| [REP-20261007-006](reports/REP-20261007-006-kit-componibile.md) | Kit Metallo componibile e galleria (ADR-0010) | Sospeso; codice verificato, controllo visivo da fare. |
| [REP-20261007-007](reports/REP-20261007-007-kit2.md) | Kit 2 soft UI per confronto | Completato come prototipo; scelta della base da parte dell'utente. |
| [REP-20261007-002](reports/REP-20261007-002-ha-dietro-acasystem.md) | Home Assistant dietro Acasystem: proxy e accesso proprietario (ADR-0009) | Completato e verificato; banco su `aca-system:0.3`. |

**Incarico attivo:** nessun incarico applicativo aperto. Acasystem 0.1 (base Tunet con il frontend «OS» Metallo e le correzioni della revisione finale) è la versione da mostrare in ufficio il 2026-10-07. Le modifiche successive dipenderanno dal parere raccolto lì (richiesta dell'utente del 2026-10-06).

**Punto di ripresa (2026-10-07):**
- Banco su localhost:3002 con `aca-system:0.5` dal 2026-10-07: pagina dei prototipi su `/ui-kit` (REP-20261007-004) e accessibilità del rilievo (REP-20261007-003); `aca-system:0.4` con animazioni e kit alleggerito. In precedenza `aca-system:0.3`: Home Assistant dietro Acasystem (ADR-0009, REP-20261007-002). Il browser parla solo con Acasystem, il server inoltra a HA sotto `/ha` e l'accesso avviene con la pagina Acasystem (utente e password di HA). Al primo uso serve un nuovo accesso. Include «Principale» con celle «+» e il polish del launcher (REP-20261007-001).
  - Ripristino possibile su `aca-system:0.1` o `aca-tunet:1.22.1-aca-press-neu1`, cambiando `image:` in `progetto/compose.tunet.yaml`.
  - Copie del volume in `backup/banco/`, l'ultima a freddo prima di 0.3: `tunet-data-20261007-pre-0.3-freddo.tgz`.
  - Ripristino: `image: aca-system:0.2` (senza proxy) o `0.1` in `progetto/compose.tunet.yaml`.
- Codice verificato:
  - typecheck, lint, tipografia e colori a 0;
  - frontend 1281/1281;
  - backend 93/93;
  - build nei budget.
- Istantanee:
  - `v009`: demo 0.1;
  - `v012`: legacy cancellato;
  - `v013`: polish e layout del launcher.
  - `v014`: Home Assistant dietro Acasystem; immagine `aca-system:0.3` costruita da questa copia.
- Git: commit `13e5537` su `master`, su richiesta dell'utente, con il lavoro fino alle correzioni del proxy. Le correzioni finali e la documentazione successive non sono committate.
- Prossimo passo: il parere dell'ufficio sull'interfaccia, poi le modifiche indicate dall'utente.
- Questioni aperte: ISSUE-026/027/028 e le decisioni di REP-20261006-002 e REP-20261007-001 (griglia per schermi larghi, righe del telefono, ritorno a Principale dopo inattività, dipendenze inutilizzate).
