# Pilota in ufficio e perimetro della fase 1

Aggiornato: 2026-10-05. Direzione umana in [ADR-0003](decisions/ADR-0003-home-assistant-locale-fase1.md); risposte di riferimento nel [report](reports/REP-20261005-001-direzione-pilota.md). Stato di realizzazione in [project-status.md](project-status.md): nessuna applicazione o installazione realizzata.

## Risultato minimo confermato

**Fase 1: Home Assistant personalizzato graficamente, da provare in ufficio.** Home Assistant è la base irrinunciabile. [Tunet](https://github.com/oyvhov/Tunet) è confermato come punto di partenza React; il riuso concreto richiede la verifica delle condizioni di distribuzione e della revisione da adottare.

Il risultato deve servire il funzionamento locale. Il prodotto sarà fornito con mini PC o Raspberry nelle abitazioni, negli uffici e nelle aziende dove viene installato. È approvato Linux a 64 bit, ARM64 oppure x86-64; modello, sistema operativo/versione, risorse e metodo di installazione HA restano da scegliere. L'ufficio è il contesto del pilota, senza inventario hardware acquisito.

Nella successiva risposta del 2026-10-05 l'utente dichiara che Home Assistant non è ancora installato in ufficio. Il logo ACA SYSTEM non è disponibile; viene fornita una direzione grafica, descritta di seguito. Sono informazioni dichiarate dall'utente, senza sopralluogo o verifica dell'hardware.

Hetzner è escluso dalla direzione corrente. L'accesso da fuori casa rimane un obiettivo online, con meccanismo ancora da progettare; non comporta la scelta automatica di un altro cloud.

## Fase minima e obiettivi successivi

| Ambito | Direzione confermata | Dettaglio ancora da definire |
|---|---|---|
| Grafica | Personalizzazione di Home Assistant tramite il riferimento React Tunet; Neumorphism, colore principale `#222222` e secondario `#ef8231` indicati dall'utente | Schermate comprese, logo da definire, ruoli dei colori e palette completa, font, layout, dispositivi client e copertura delle funzioni HA. |
| Operatività locale | Massimo funzionamento possibile senza internet | Hosting degli asset, autenticazione, riavvio client/gateway, dipendenze esterne delle integrazioni e lista dei dispositivi del pilota. |
| Stati e comandi | Funzioni d'interesse e comportamento HA da preservare | Entità e comandi rappresentativi della prima verifica; nessuna copertura completa già dimostrata. |
| Funzioni aggiuntive | Luci, clima, consumi, scenari, piantina, remoto, AI e personalizzazione restano nella visione | Ordine e perimetro delle estensioni da assegnare dopo il risultato grafico minimo. |
| Ruoli e consegna | Admin, cliente e amministratore di condominio; flusso di primo setup confermato | Traduzione in permessi, sessioni, API e ambito della prima implementazione. |
| Molti utenti su una macchina | Possibilità da valutare | Capacità, utenti dello stesso impianto o impianti distinti, reti, dati e isolamento tra abitazioni. |

L'obiettivo minimo non assegna lo sviluppo delle estensioni. Il perimetro grafico preciso deve essere chiaro prima del relativo incarico; il PRD conserva i requisiti futuri con i loro ID.

## Direzione grafica confermata e proposte

Fonte umana del 2026-10-05: «Neumorphism si chiama lo stile», con [articolo Clay](https://clay.global/blog/neumorphism-ui) e tre immagini di riferimento. Le immagini mostrano una variante chiara neutra con accento viola, una scura grafite con accento verde e una chiara lilla con accenti colorati. Sono riferimenti estetici; non sono schermate ACA SYSTEM approvate o componenti collaudati.

Il riferimento comune comprende superfici vicine al colore dello sfondo, ombre chiare/scure, comandi in rilievo o incassati e forme arrotondate. Nella precisazione successiva l'utente richiede colore principale dell'app `#222222` e secondo colore arancione `#ef8231`. Sono vincoli grafici confermati; la proposta dell'agente è usare il primo come base scura e il secondo come accento per azioni e selezione. Toni delle superfici, testi, colori semantici, eventuali altri temi e librerie restano da definire. Il logo resta da definire; le interfacce delle reference non vengono adottate integralmente.

**Proposte dell'agente, da precisare nel progetto grafico:**

- Applicare il rilievo soprattutto ai controlli principali e alle superfici delle stanze, preservando la leggibilità dei dati e dei messaggi.
- Usare testo `#222222` sui comandi con riempimento arancione `#ef8231`, e testo chiaro sulle superfici scure; definire e verificare le varianti effettive prima dell'implementazione.
- Usare testi e icone distinguibili dallo sfondo; associare agli stati diciture esplicite, come «Accesa», «Spenta», «Comando in corso» e «Non disponibile». Il rilievo del pulsante non costituisce conferma dello stato reale del dispositivo.
- Definire varianti per selezione, focus, disabilitazione, attesa ed errore; verificare il risultato sul client del pilota nelle condizioni d'illuminazione reali.
- Valutare lo stile negli strumenti già presenti in Tunet, prima di proporre nuove librerie o modifiche al backend HA.

Come riferimenti per verifiche future: WCAG 2.2 prevede contrasto di almeno 4,5:1 per testo ordinario e 3:1 per testo grande, con le eccezioni previste dal criterio [1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); le informazioni visive necessarie a identificare controlli e stati seguono il criterio [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Il significato non deve dipendere soltanto dal colore ([1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)). Fonti consultate il 2026-10-05; nessuna misurazione sulle reference o verifica di conformità ACA è stata eseguita.

Calcolo numerico del 2026-10-05 sulle coppie sRGB opache: `#ef8231`/`#222222` = circa 5,99:1; `#ffffff`/`#ef8231` = circa 2,66:1; `#ffffff`/`#222222` = circa 15,91:1. La prima e la terza coppia superano la soglia 4,5:1 per testo ordinario, la seconda no. Sono calcoli sui valori dichiarati, non prove di rendering, trasparenze, stati del componente o accessibilità complessiva. Procedura ed esiti nell'annotazione del [report](reports/REP-20261005-001-direzione-pilota.md#annotazione-del-2026-10-05--risposte-successive-e-stile-grafico).

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

Inventario dell'ufficio e numero dei client; dispositivi da integrare; significato operativo della componente Wi-Fi del sistema cablato; logo e palette completa all'interno della direzione neumorfica con i due colori confermati; schermate richieste; metodo HA; budget e tempi. Il prossimo passo proposto è l'analisi tecnica di Tunet e la definizione delle schermate della fase 1, senza installazioni implicite.
