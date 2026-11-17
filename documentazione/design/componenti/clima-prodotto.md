# Clima per dispositivo

Modo: **Operate**. Direzione umana: «vai procediamo con clima», 2026-11-10, dopo la proposta di termostati e climatizzatori. [REP002](../../reports/REP-20261110-002-clima-per-dispositivo.md). Si estendono le primitive e il [design ACA](../design.md), senza un nuovo tema.

## Home

Un dispositivo HA, una tessera. Nome leggibile e icona termostato; canale singolo con temperatura attuale, desiderata, modalità e attività osservata. Accensione e regolazione essenziale solo quando i dati e i servizi HA lo consentono. Il multicanale mostra quanti canali sono attivi o indisponibili: nessuna accensione collettiva implicita. Le nuove associazioni hanno ingombro minimo 2×2; il minimo dei widget storici resta invariato.

## Schermata completa

Console e ingresso/ritorno comuni. Ogni canale espone nome, stato, valori e controlli propri: obiettivo singolo o intervallo minimo/massimo, modalità HVAC, ventilazione, preset, oscillazioni verticale/orizzontale e umidità soltanto se dichiarati. I limiti e il passo arrivano da HA, senza valori grafici trasformati in comandi. Errori e attesa restano accanto al controllo; indisponibile non significa spento.

Misure aggiuntive pertinenti nella sezione d'uso; diagnostica e manutenzione in una disclosure distinta. Nessuna attribuzione basata sul nome, aggregazione di dispositivi dello stesso hub o attivazione di entità nascoste/disabilitate.

## Interazione e continuità

Trova e impostazioni manuali usano la stessa associazione. L'anteprima è inerte; Conferma attende la centrale, Annulla non scollega HA. Un widget già presente viene raggiunto, senza duplicarlo. La personalizzazione storica non viene riscritta: il nuovo renderer richiede metadati validi e corrispondenti all'entità principale.

Un solo materiale del contenitore, nessun blur annidato o animazione delle righe. Nomi lunghi vanno a capo; controlli nominati per canale, focus visibile e tastiera. Telefono, movimento ridotto e fotogrammi delle transizioni sono verifiche locali distinte dall'hardware reale.
