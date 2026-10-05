# Pilota in ufficio e perimetro della fase 1

Aggiornato: 2026-10-05. Direzione umana in [ADR-0003](../decisions/ADR-0003-home-assistant-locale-fase1.md); risposte di riferimento nel [report](../reports/REP-20261005-001-direzione-pilota.md). Stato di realizzazione in [project-status.md](../project-status.md): banco prova HA Container/Tunet disponibile, personalizzazione ACA e accettazione della fase 1 non completate.

## Risultato minimo confermato

**Fase 1: Home Assistant personalizzato graficamente, da provare in ufficio.** Home Assistant è la base irrinunciabile. [Tunet](https://github.com/oyvhov/Tunet) è confermato come punto di partenza React; il riuso concreto richiede la verifica delle condizioni di distribuzione e della revisione da adottare.

Il risultato deve servire il funzionamento locale. Il prodotto sarà fornito con mini PC o Raspberry nelle abitazioni, negli uffici e nelle aziende dove viene installato. È approvato Linux a 64 bit, ARM64 oppure x86-64; modello, sistema operativo/versione, risorse e metodo di installazione HA restano da scegliere. L'ufficio è il contesto del pilota, senza inventario hardware acquisito.

Nella prima risposta del 2026-10-05 l'utente dichiarava Home Assistant non ancora installato in ufficio. Successivamente ha installato Docker/WSL e HA, concluso il setup e richiesto l'installazione Tunet; verifiche del banco prova in [REP-20261005-004](../reports/REP-20261005-004-installazione-tunet.md). L'hardware finale non è identificato. Il logo ACA SYSTEM non è disponibile; viene fornita una direzione grafica, descritta di seguito.

Hetzner è escluso dalla direzione corrente. L'accesso da fuori casa rimane un obiettivo online, con meccanismo ancora da progettare; non comporta la scelta automatica di un altro cloud.

## Fase minima e obiettivi successivi

| Ambito | Direzione confermata | Dettaglio ancora da definire |
|---|---|---|
| Grafica | Home Assistant tramite Tunet; Neumorphism, temi chiaro/scuro, `#222222` come riferimento scuro e accento `#ef8231`; microinterazioni prioritarie | Schermate comprese, base chiara, logo, palette completa, font, layout, dispositivi client e copertura delle funzioni HA. |
| Operatività locale | Massimo funzionamento possibile senza internet | Hosting degli asset, autenticazione, riavvio client/gateway, dipendenze esterne delle integrazioni e lista dei dispositivi del pilota. |
| Stati e comandi | Funzioni d'interesse e comportamento HA da preservare | Entità e comandi rappresentativi della prima verifica; nessuna copertura completa già dimostrata. |
| Funzioni aggiuntive | Luci, clima, consumi, scenari, piantina, remoto, AI e personalizzazione restano nella visione | Ordine e perimetro delle estensioni da assegnare dopo il risultato grafico minimo. |
| Ruoli e consegna | Admin, cliente e amministratore di condominio; flusso di primo setup confermato | Traduzione in permessi, sessioni, API e ambito della prima implementazione. |
| Molti utenti su una macchina | Possibilità da valutare | Capacità, utenti dello stesso impianto o impianti distinti, reti, dati e isolamento tra abitazioni. |

L'obiettivo minimo non assegna lo sviluppo delle estensioni. Il perimetro grafico preciso deve essere chiaro prima del relativo incarico; il PRD conserva i requisiti futuri con i loro ID.

## Direzione grafica confermata e proposte

La specifica visiva è in [design.md](../design/design.md), fonte unica per Neumorphism, temi chiaro/scuro, accento `#ef8231`, riferimento scuro `#222222`, microinterazioni richieste, proposte UI e calcoli di contrasto. Questo documento mantiene il perimetro e i comportamenti del pilota; le decisioni grafiche non assegnano implementazioni o nuovi permessi. Il [catalogo](../design/componenti/README.md) conserva gli esempi senza adattamenti.

Logo, palette completa, componenti e schermate restano da definire nei rispettivi ambiti.

## Ruoli richiesti e primo setup

| Ruolo | Ambito richiesto | Confine da verificare |
|---|---|---|
| Admin / sistemista durante il setup | Configurare l'impianto e associare i dispositivi nell'installazione in lavorazione | Assegnazione dell'identità e accesso amministrativo effettivo da progettare. |
| Cliente | Utilizzare il sistema dopo la consegna con il proprio account | Operazioni consentite e personalizzazione da precisare; sessione coerente con i privilegi del cliente. |
| Amministratore di condominio | Configurare i dispositivi condivisi, per esempio la caldaia comune | Configurazione delle singole abitazioni esclusa. Visibilità, letture e comandi devono essere precisati nella policy. |

Flusso confermato: **sessione admin aperta soltanto per il primo setup → configurazione e associazione dei dispositivi → logout admin → login cliente**. Attivazione, durata e chiusura della sessione iniziale devono essere progettate e provate; il ruolo del sistemista non è automaticamente un account con accesso permanente dopo la consegna.

Il ruolo condominiale è un requisito funzionale approvato (REQ-17), non un ruolo HA già implementato. Molti utenti sullo stesso impianto e più abitazioni sulla stessa macchina sono casi distinti. Il secondo richiede un progetto di isolamento, anche su API, dati e configurazione, non soltanto sulle schermate.

## Comportamenti offline da verificare

| Condizione | Comportamento atteso da precisare per il pilota |
|---|---|
| Internet assente, rete locale disponibile | UI grafica, stati, comandi e automazioni dei dispositivi locali selezionati restano utilizzabili. |
| Browser/tablet riavviato senza internet | Il frontend locale si carica con gli asset necessari; autenticazione e accesso ai comandi seguono il progetto delle sessioni. |
| Gateway riavviato senza internet | Servizi locali e configurazioni necessarie sono recuperabili secondo la procedura scelta. |
| Integrazione dipendente dal cloud | Dipendenza esplicita e indisponibilità comprensibile; nessuna promessa di equivalenza offline. |
| Internet disponibile e accesso esterno | Accesso remoto autenticato da progettare e verificare nel suo incarico. |
| Rete locale o alimentazione assente | Guasto distinto dalla perdita di internet; comportamento dei dispositivi fisici da valutare nel relativo ambito. |

Home Assistant documenta funzionamento locale e limitazioni delle integrazioni cloud nella [FAQ offline](https://www.home-assistant.io/faq/works-without-internet). Fonte consultata il 2026-10-05; questi obiettivi non sono prove del sistema ACA.

## Criteri di accettazione proposti per la fase 1

- AC-00: inventario reale del pilota, architettura Linux a 64 bit e dispositivi da provare identificati.
- AC-03: schermate e identità grafica concordate; stati, comandi, riconnessione e accesso alle funzioni HA concordate verificati senza regressioni rispetto alla base scelta.
- AC-02: caricamento e utilizzo del frontend locale con internet scollegato, includendo il riavvio dei client previsti e le dipendenze delle entità selezionate.
- AC-06: quando il primo setup è incluso nell'incarico, passaggio admin → logout → cliente verificato anche sui privilegi e sui comandi/API.

Sono criteri proposti da precisare nell'incarico esecutivo. Le verifiche applicative non sono state eseguite. AC-17 e l'accesso remoto appartengono ai rispettivi sviluppi successivi, salvo un nuovo incarico umano.

## Informazioni mancanti per il prossimo incarico

Inventario dell'ufficio e numero dei client; dispositivi da integrare; significato operativo della componente Wi-Fi del sistema cablato; logo e palette completa all'interno della direzione neumorfica con i due colori confermati; schermate richieste; metodo HA sull'hardware finale; budget e tempi. Tunet è installato per il banco prova: il prossimo incarico potrà definire schermate e personalizzazione della fase 1, preservando le funzioni selezionate e verificando offline/sessioni.
