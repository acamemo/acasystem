# Tapparelle, tende e veneziane

Modo: **Operate**. Direzione umana: «procedi», 2026-11-10, dopo la proposta della famiglia cover; [REP003](../../reports/REP-20261110-003-tapparelle-tende-per-dispositivo.md). Primitive e [design ACA](../design.md) esistenti.

## Home

Una tessera per dispositivo HA. Nome e icona del kit, stato osservato e percentuale solo quando presente e valida. Apri, Ferma e Chiudi sono azioni distinte, ciascuna legata alla propria capacità/servizio. Il multicanale riassume aperture, movimento e indisponibilità senza azione collettiva. Nessuno zero derivato dalla mancanza del dato. Il nuovo prodotto richiede 2×2; i widget storici conservano il loro percorso.

## Dettagli

Console comune con contenuto centrato, canali nominati e comandi indipendenti. Slider di apertura e inclinazione entro 0–100 quando supportati e osservabili; il valore ricevuto rimane distinto da quello richiesto. L'invio attende 200 ms di quiete del gesto, per evitare una sequenza di richieste al motore. Stop annulla le richieste locali ancora non inviate e resta disponibile durante l'attesa dei comandi già inviati; non annulla retroattivamente una richiesta ricevuta da HA. Il riscontro software non dichiara conferma fisica o causalità.

Misure d'uso, altre funzioni e Tecnica e manutenzione sono separate. Disclosure e selettori comuni, target di comando e nomi accessibili distinti per canale. Nessun livello di vetro dentro il contenitore, nuova animazione delle righe o variazione della foto di sfondo. I testi lunghi vanno a capo; i numeri mancanti sono messaggi espliciti.

## Associazione e compatibilità

Trova → anteprima inerte → Conferma e riscontro della centrale, oppure raggiungimento del widget già presente. La selezione manuale usa lo stesso risolutore e writer atomico. Solo entità dello stesso dispositivo, visibili e abilitate; la diagnostica non diventa un canale. Annullare il posizionamento non scollega HA. Nessuna migrazione automatica delle vecchie configurazioni.

La copertura del lotto è distinta dall'intero dominio HA: regolazione inclinazione tramite SET_TILT_POSITION, non velocità o ogni comando tilt discreto. Test software/browser e apparecchi fisici sono evidenze separate.
