# Verifica preliminare SONOFF MINI Extreme MINIR4M

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261113-008 |
| Stato | Verifica preliminare completata; widget e comando fisico ancora da provare |
| Data | 2026-11-13, Europe/Rome |
| Autore / modello | Codex; identificativo esatto del modello non disponibile |
| Commit di riferimento | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`, baseline del lavoro corrente, non un nuovo commit |
| Richiesta | Separare in altra chat la procedura di installazione/aggiornamento e dedicare questa chat a Sonoff. Dispositivo indicato: MINIR4M; l'utente conferma «Già funzionante in eWeLink». |
| Perimetro | Verifica in sola lettura del modello e della registrazione sul banco corrente; nessuna installazione, pairing, aggiornamento firmware, modifica account o comando sul relè. |

## Risultato e criteri

Identificare il percorso utilizzabile senza rifare un'associazione già funzionante, distinguere compatibilità documentata e rilevamento reale. Il lavoro installer/aggiornamenti è stato avviato dall'utente in una chat separata, ID `01a1d52f-6947-73e2-a916-c1bf1b75daf7`, con [REP007](REP-20261113-007-installer-aggiornamenti-pilota.md). Questo intervento non modifica i suoi sorgenti o il banco.

## Evidenze

- [Manuale SONOFF](https://support.sonoff.tech/minir4m-usermanual/), consultato2026-11-13: MINIR4M è un interruttore Wi-Fi2,4GHz che supporta Matter ed eWeLink. Il bridge Zigbee non è necessario per questo modello. Non è stato richiesto un reset, né proposto un nuovo abbinamento Matter al posto del percorso già configurato.
- [Dispositivi SonoffLAN v3.13.3](https://raw.githubusercontent.com/AlexxIT/SonoffLAN/v3.13.3/DEVICES.md), consultato2026-11-13: modello MINIR4M, UIID138, un canale, protocollo locale indicato come `plug` sul firmware documentato1.2.0. Questo non dimostra firmware corrente o funzionamento LAN/offline sul banco Docker.
- Banco attivo osservato: ACA healthy, HA e D1 in esecuzione. Lettura dei soli registri `core.device_registry` e `core.entity_registry` tramite Python nel contenitore HA, con output limitato a modello/domini/stato abilitazione e senza identificativi personali, credenziali o configurazioni complete.
- Un dispositivo MINIR4M registrato, piattaforma `sonoff`;7entità:3sensor (1abilitato),3switch (1abilitato),1select abilitato. Entità nascoste0 nel gruppo. Non sono state abilitate le4entità disabilitate.

## Interpretazione e prossima prova

Il modello è già presente nella centrale tramite SonoffLAN, quindi il prossimo passo è il percorso ACA Trova dispositivi → Pronti → MINIR4M → widget di Prese e interruttori. Se già rappresentato, il risolutore deve raggiungere il widget esistente; altrimenti anteprima e Conferma, secondo il comportamento di prodotto. Questo flusso non è stato ancora osservato sul dispositivo in questa verifica.

La lettura dei registri non dimostra disponibilità attuale dell'entità, stato fisico del relè o successo dei comandi. Non è stato inviato alcun comando, scritto un profilo o cambiata una connessione. Rimangono verifica UI, inserimento del widget se necessario e riscontro dell'utente sul comando. Nessuna nuova compatibilità universale, prova Matter o dipendenza da Internet esclusa per deduzione.

## Verifiche e limiti

Fonti primarie e registri del banco controllati; nessuna suite o build necessaria per la sola analisi. Documentazione soltanto, senza modifiche al codice o dati. Le ricerche iniziali con glob in un percorso PowerShell hanno fallito e sono state sostituite dalla lettura mirata dei registri; non costituiscono evidenza di assenza del supporto ACA.

## Annotazione 2026-11-13 — riscontro dell'utente

Dopo le indicazioni Trova dispositivi → Pronti → MINIR4M → Crea il widget → Conferma, l'utente risponde «funziona». Il funzionamento nel percorso ACA è quindi confermato dall'utente; non è una misura fisica strumentale né il collaudo singolo di tutte le7entità o della modalità LAN/offline/Matter. Nessun nuovo codice specifico MINIR4M, installazione o comando sul relè eseguito dall'agente.

Il successivo incarico riguarda semplificazione dell'aggiunta e copertura comune dei prodotti Sonoff, distinto dalla procedura installer/aggiornamenti dell'altra chat. Evidenze e piano nel [REP009](REP-20261113-009-percorso-comune-sonoff.md).
