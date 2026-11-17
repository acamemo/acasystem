# Sensori: letture del dispositivo e helper distinti

Modo: **Operate**. Richiesta umana del 2026-11-11 «procedi con area sensori», dopo la proposta di temperatura/umidità, movimento/presenza, aperture, aria/fumo/allagamento. Evoluzione di REQ-18/19 e ADR-0049, attuata e verificata localmente nella .66, come registrato nel [REP004](../../reports/REP-20261111-004-area-sensori.md). Si riusano ACA Vetro Bianco, primitive e transizioni comuni.

Una tessera rappresenta un esatto dispositivo HA, con i canali ordinari `sensor` e `binary_sensor` abilitati e visibili. La Home privilegia nome, letture e stato osservati; i dettagli raccolgono le letture e la cronologia del canale scelto. Batteria, aggiornamenti e funzioni tecniche disponibili hanno un ruolo distinto. Nessuna aggregazione per stanza, nome, marchio o integrazione, né duplicazione dei prodotti delle famiglie già aggiornate per le loro sole telemetrie.

Valori e unità provengono da HA. Uno stato sconosciuto o indisponibile resta esplicito: non diventa zero, Spento, sicuro o assenza di un evento. Le classi binarie guidano la denominazione dello stato, senza inventare soglie, percentuali o conclusioni sulla sicurezza fisica. La cronologia usa il percorso esistente, solo per il canale visibile; assenza di dati ed errore non nascondono le letture correnti.

Nell'associazione della categoria Sensori, un controllo condiviso distingue **Dispositivo** da **Helper e comandi**. Un nuovo elemento parte da Dispositivo; una tessera storica senza metadati prodotto e con una sola entità rimane sul percorso helper. Aprire l'altro tab non salva né scollega. Soltanto scegliere un dispositivo o un helper conferma la nuova associazione, tramite l'operazione atomica esistente e relativo riscontro. Una modalità helper esplicita impedisce di riattivare metadati di prodotto residui.

Dispositivo riusa lo stesso risolutore di Trova. Helper e comandi conserva selezione singola, azioni e preferenze esistenti, compresi gli ID storici non più inclusi tra i candidati correnti. Il selettore duplicato precedente viene nascosto solo quando presente quello comune; le vecchie tessere raw senza categoria non sono convertite. Nel nuovo prodotto fisico non si presentano le vecchie associazioni libere di azioni o funzioni di altri apparecchi.

Trova prepara l'anteprima sulla pagina idonea più vicina, senza comandi né scritture prima di Conferma. Destinazioni esistenti, duplicati storici, pile e pagine nascoste conservano il flusso condiviso. Annullare o non trovare spazio non scollega da HA. Cambiare profilo, editor, connessione o widget durante una rilettura invalida la risposta tardiva; il salvataggio resta bloccato fino all'ACK, senza doppio invio.

Testi italiani brevi, valori e nomi lunghi a capo, controlli di almeno 40px, 320/390px e desktop, tastiera e movimento ridotto. Nessun nuovo blur, zoom dello sfondo o animazione per singola lettura. Le azioni tecniche disponibili sono esplicite e usano il percorso personale tracciato; nessun comando all'apertura, in anteprima o al cambio canale.

Stato di realizzazione e prove nel report. La consegna .66 è locale; banco, pubblicazione e collaudi su sensori fisici rimangono separati. Questa famiglia non dichiara coperti tutti i domini o tutte le integrazioni dell'Excel.
