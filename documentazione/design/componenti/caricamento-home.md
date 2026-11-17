# Caricamento e ingresso della Home

Direzione assegnata il2026-11-06 con il [piano operativo](../../riprogettazione/caricamento-home-piano.md), [ADR-0047](../../decisions/ADR-0047-caricamento-home-unitario.md). Implementata e verificata localmente in [REP004](../../reports/REP-20261106-004-caricamento-home-unitario.md): browser isolato desktop/mobile, fotogrammi e fallback. Banco e hardware non aggiornati/collaudati da questa consegna.

## Attesa e prima comparsa

Paesaggio ACA fermo. Un loader circolare discreto compare dopo150ms se la preparazione è ancora in corso; nessuna percentuale inventata, schermata esplicativa o durata minima. Quando la prima vista è pronta, loader e contenuto si incrociano: uscita indicatore96ms e ingresso Home280ms, senza una pausa vuota.

La prima pagina entra come un'unità,24px dal basso verso0 e opacità0→1, senza scala o ritardi separati per testi, icone e controlli. Le card hanno da subito gli ingombri dello schermo corrente. Eliminare la doppia intro nel solo percorso Home; non cambiare i movimenti di login, Sistema, popup o ritorno dai dettagli.

## Materiale e preferenze

Separare la superficie che sfuma dal contenuto che trasla: la fotografia non segue il movimento. Preservare il vetro normale e la [continuità già corretta](../../reports/REP-20261106-001-continuita-blur-ritorno-home.md). Il blur rimane costante e non viene animato; verificare la rasterizzazione reale prima/durante/dopo.

Con movimento ridotto usare solo opacità120ms e indicatore statico, senza rotazione continua. Contrasto maggiore, forced colors e trasparenza ridotta mantengono i fallback del kit; nessuna foto temporanea o filtro residuo nelle modalità opache. Font/foto critici falliti o oltre il budget3s usano un fallback effettivo e stabile per quell'ingresso, senza swap tardivo che sposti gli elementi.

## Interazione e recupero

La Home si prepara misurabile, coperta, inert e nascosta alle tecnologie assistive. Un solo status di caricamento e aria-busy; il loader non riceve autofocus. I controlli diventano raggiungibili alla conclusione del passaggio e con misure valide. Se il recupero focalizzato scompare al successo, restituire il focus al riferimento Home stabile, senza attivare un comando o sottrarlo a un'altra finestra.

Errore reale o profilo occupato hanno precedenza sul loader. A10s l'attesa offre spiegazione breve e Riprova, senza dichiarare fittiziamente pronta la UI. I moduli di login/setup/scelta profilo restano accessibili. Discovery e presentazioni automatiche non devono apparire sopra il loader.

**Rifinitura umana del2026-11-09, [REP002](../../reports/REP-20261109-002-preparazione-lenta-messaggio-centrato.md):** nella sola attesa prolungata senza errore, testo «La preparazione sta richiedendo più tempo del dovuto» senza Surface/card e pulsante ACA «Riprova» subito sotto. Gruppo centrato nella pagina su entrambi gli assi, elementi allineati al centro orizzontale e16px fra loro; margine mobile e testo a capo senza overflow. Il ramo di errore conserva presentazione e messaggio specifici. Tempi, retry e autorità restano invariati; rifinitura installata sul banco .48, hardware distinto.

Storici, attività e media restano negli spazi definitivi con i propri esiti locali: non trattenere tutta la Home per una risorsa secondaria. Questo lotto non disegna skeleton interni ai widget; la futura ristrutturazione riuserà il contenitore e il significato di prima vista pronta.

**Estensione del2026-11-09, [REP003](../../reports/REP-20261109-003-stati-vuoti-senza-sovrapposizioni.md):** `StatusMessage` riusa lo stesso gruppo essenziale per attesa, errore Home e fallback bloccanti di accesso/profilo/personalizzazione. Nessuna Surface esterna o titolo ridondante; azioni esistenti conservate. La priorità del segnale segue quella della schermata realmente mostrata: profilo bloccato/non verificabile precede loading. Una schermata che prende il controllo esclude subito il presenter Home, annulla il ciclo di attesa e scarta la sola memoria visuale del vecchio loader. Il ritorno da Sistema/Casa non provoca questa reinizializzazione; nessun cambiamento ai tempi150ms/10s/96ms, al coordinatore o alle concessioni d'uso. Verificare anche il successo prima150ms dopo un errore: nessuno spinner residuo.

**Correzione autenticata, [REP004](../../reports/REP-20261109-004-diagnosi-avvio-edge.md):** i contenitori Homeentry/content e widget-scene devono trasmettere l'altezza disponibile fra launcher-scene e shell dentro live-app. Usare100%/min-height0, preservando l'area flex riservata agli avvisi; nessun nuovo100dvh interno. Una misura valida della generazione corrente va riconosciuta anche se controller, snapshot o catalogo diventano pronti dopo la prima callback, prima di avviare le risorse visuali. Non forzare la prontezza per tempo. Griglia30×50 prima e438×867 dopo su440×956,4casi browser e riapertura Edge verificati; banco .50, tempi/materiali/animazioni e configurazioni salvate conservati.
