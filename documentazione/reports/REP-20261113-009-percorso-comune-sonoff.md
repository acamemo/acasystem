# Percorso comune e copertura dei dispositivi Sonoff

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261113-009 |
| Stato | Analisi completata; consegna incrementale proposta, non implementata |
| Data | 2026-11-13, Europe/Rome |
| Autore / modello | Codex; identificativo esatto del modello non disponibile |
| Commit di riferimento | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`, baseline da preservare |
| Richiesta | «funziona, comunque questo ha evidenziato 2 problema, ogni dispositivo sonoff deve essere integrato e provato, dovremmo fare in modo di poterli aggiungere più facilmente e poterli aggiungere tutti e avere l'integrazione completa per tutti i dispositivi sonoff». |
| Perimetro | Verificare percorso di aggiunta, riuso delle capacità HA e copertura Sonoff; separare supporto dichiarato, funzioni esposte e prove reali. Installer/aggiornamenti proseguono nell'altra chat, REP007. Nessuna installazione, modifica firmware, comando fisico o pubblicazione in questa analisi. |

## Obiettivo e criteri

Definire un accesso semplice Sonoff in ACA e un metodo scalabile di copertura dei modelli, evitando una nuova integrazione ad hoc per ogni esemplare. Preservare account, profili, widget esistenti e semantica delle associazioni per dispositivo. All'avvio901voci Git preesistenti o dell'altro incarico preservate; letture parallele soltanto.

- Ricostruire ciò che il percorso attuale già riconosce e dove costringe l'utente a passaggi tecnici.
- Distinguere collegamento di una casa/account eWeLink, acquisizione dei suoi dispositivi e aggiunta alla Home ACA.
- Valutare le funzioni quotidiane e tecniche effettivamente esposte, senza attivare automaticamente entità disabilitate o nascoste.
- Definire livelli di compatibilità e collaudo, senza promettere supporto completo di tutti i modelli/firmware o funzioni proprietarie dalla sola presenza di un'integrazione.

## Evidenze iniziali

MINIR4M è stato rilevato dalla SonoffLAN già installata e classificato come interruttore; l'utente conferma ora il funzionamento nel [REP008](REP-20261113-008-verifica-sonoff-minir4m.md). Non è stato scritto un adattatore nuovo per quel modello. TRVZB precedentemente confermata nel [REP005](REP-20261113-005-banco-sonofflan-trvzb.md); per ZBBridge-P stock e TRVZB rimane il percorso cloud osservato, senza una prova offline.

Fonti primarie consultate2026-11-13: [SonoffLAN v3.13.3 README](https://raw.githubusercontent.com/AlexxIT/SonoffLAN/v3.13.3/README.md) supporta account/case eWeLink e dispositivi con disponibilità LAN/cloud differente; [DEVICES](https://raw.githubusercontent.com/AlexxIT/SonoffLAN/v3.13.3/DEVICES.md) distingue il protocollo locale documentato dai modelli solo cloud e da quelli non verificati. Non usare l'elenco come certificazione ACA. Una presunta pagina Core HA `/integrations/sonoff/` non è risultata accessibile e non è usata come fonte di un'integrazione ufficiale nativa.

## Inventario e lacune osservate

- `recommendedBrands.ts` non propone Sonoff/eWeLink. Il catalogo backend `deviceService.ts` deriva nome dal dominio e non assegna un marchio; `sonoff` può essere trovato quando il componente è installato, ma l'alias eWeLink non è assistito. L'ingresso richiede quindi oggi il percorso generico, come osservato nel precedente collegamento TRVZB.
- `classifyDevices` usa domini/capacità delle entità HA. Non serve un adattatore MINIR4M; non va forzata tutta l'integrazione Sonoff sulla famiglia prese, perché include anche valvole, sensori e altre famiglie.
- `ProductDeviceBinding` conserva i collegamenti per esatto `device_id`, con canali, secondarie e tecnica. I figli di un bridge restano prodotti distinti. La risposta di un flow con più dispositivi torna in Pronti; ogni riga offre Crea/Apri widget. Non esiste selezione multipla.
- Le secondarie riconosciute in `productBinding.ts` sono `sensor`, `binary_sensor`, `switch`, `number`, `select`, `button`, `event`, `update`. `PlugDetails.tsx` presenta uscite, misure, altre funzioni e tecnica; le azioni dipendono dai servizi HA realmente presenti. Non emerge supporto universale di domini quali `text`, `time`, `datetime`, `valve`, `water_heater`, `humidifier`, né un adattatore di comandi raw Sonoff proprietari.
- Entità nascoste/disabilitate sono escluse dal binding; tecnica solo secondo le categorie HA `config`/`diagnostic`. MINIR4M ha3entità abilitate su7 nel campione: non si può dedurre copertura delle4disabilitate. L'associazione persiste elenchi di entità, quindi nuove capacità arrivate dopo richiedono una politica di aggiornamento esplicita che preservi le scelte.

## Flusso e consegna proposti

1. **Ingresso Sonoff/eWeLink riconoscibile in Trova:** riusare il collegamento già presente nella centrale o il flow HA per nuovo account; eventuale selezione delle case, senza chiedere un login per ciascun dispositivo o per ogni profilo ACA. Il flow rimane nel perimetro dell'utente e dei permessi attuali.
2. **Elenco unico dei prodotti effettivi:** tutti i dispositivi esposti dalla configurazione HA selezionata, con funzione e disponibilità, distinti da hub e servizi. Rilevamento nella centrale e aggiunta dei widget alla Home restano operazioni diverse.
3. **Associazione semplice per capacità:** relè/multiprese → Prese e interruttori, luci → Luci, termovalvole → Clima, sensori → Sensori; riutilizzare i widget esistenti e raggiungere quelli già presenti senza duplicarli. Eccezioni per modello soltanto quando i dati dimostrano un comportamento differente.
4. **Proposta di aggiunta multipla, non confermata come requisito distinto:** selezione dei prodotti e riepilogo dei widget prima della conferma; riutilizzare la semantica del posizionamento corrente. Mancanza di spazio/annullamento non devono creare pagine o scollegare il prodotto da HA. Non interpretare «tutti i Sonoff» come autorizzazione a riempire automaticamente la Home del destinatario.
5. **Copertura verificabile delle funzioni:** matrice versionata modello/firmware, percorso (SonoffLAN/Matter/Zigbee compatibile), famiglia, capacità esposte da HA, funzioni rappresentate in ACA, limiti LAN/cloud, simulazioni e hardware. Ogni lacuna va attribuita al componente HA, al dominio/controllo ACA o alla funzione proprietaria non esposta; solo il secondo caso si risolve automaticamente nell'interfaccia ACA.

Evidenze iniziali della matrice: MINIR4M/SonoffLAN e TRVZB via ZBBridge-P stock hanno riscontro utente positivo sulle funzioni provate. Per entrambi non è certificato ogni comando/firmware; per TRVZB il percorso osservato richiede cloud eWeLink. La gestione della rete del bridge è un ambito distinto dai widget dei figli e non risulta automaticamente completa.

## Verifiche proposte

Verificare una connessione eWeLink già presente/nuova, più case/account, dispositivi aggiunti successivamente, attese/retry e risposte vecchie. Verificare più canali e più prodotti sullo stesso hub, classificazione per capacità, assenza di duplicati, hidden/disabled e permessi invariati. Per la copertura usare prove riutilizzabili per famiglia e fixture depurate, mantenendo prove fisiche dei modelli disponibili e dichiarando quelli non testati. Non simulare una funzione assente dal dispositivo o dichiarare che tutti i firmware della marca siano collaudati.

Sono stati individuati test esistenti sui campi password Sonoff, binding multi-canale/tecnica/entità escluse e entry con24dispositivi senza troncamento; nessuna suite è stata rieseguita per questa analisi in sola lettura. Nessuna build, mutazione del banco o comando fisico eseguiti.

## Chiusura e punto di ripresa

Analisi e confronto della direzione completati; registrata ISSUE-165 per la consegna Sonoff. Proposta iniziale: accesso comune Sonoff/eWeLink e audit delle capacità, poi aggiunta multipla solo se confermata, senza riscrivere tutte le famiglie o promettere un'integrazione completa di ogni prodotto dalla sola marca. Codice, dati del banco e incarico installer/aggiornamenti dell'altra chat conservati. Implementazione e collaudi successivi non dichiarati completati.

## Annotazione 2026-11-13 — approfondimento Sonoff rimandato dall'utente

L'utente risponde «va bene, strutturerei con calma, ci penserò per oggi basta», chiedendo invece di continuare la versione ACA del capo e conoscere lo stato dell'altra chat. Il filone Sonoff rimane quindi salvato a livello di analisi/proposta, senza iniziare l'implementazione; ripresa su successiva richiesta umana. Nessun obiettivo autonomo creato o modifica applicativa eseguita.

Verificata attiva la chat installer/aggiornamenti `01a1d52f-6947-73e2-a916-c1bf1b75daf7` e inoltrata, su questa esplicita richiesta umana, l'indicazione di continuare il suo incarico senza includere il redesign Sonoff. Il suo messaggio di avanzamento riferisce8scenari bootstrap simulati,4prove file SonoffLAN e selezione degli aggiornamenti verificata localmente; applicazione degli aggiornamenti con backup/recupero e collaudo VM restano distinti. È una lettura dello stato riferito dall'altra chat, non una nuova esecuzione o certificazione dei test da parte di questo incarico; evidenze operative nel REP007.
