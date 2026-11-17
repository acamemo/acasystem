# Dal widget alla sua schermata

Modalità: **Operate**. Direzione corrente: precisazione umana del 2026-11-05 in [REP006](../../reports/REP-20261105-006-apertura-widget-finestra-apple.md) e [ADR-0046](../../decisions/ADR-0046-apertura-widget-come-finestra.md). Sostituisce il precedente ingrandimento dalla tessera, mantenendo il percorso comune e le schermate esistenti.

## Continuità

Sistema e dettagli entrano dal basso di 24 px con dissolvenza, senza scala. La Home sfuma contemporaneamente; il ritorno segue il movimento inverso. Titolo, comandi e contenuto entrano come una sola unità, senza il precedente ritardo del body. Il paesaggio rimane fermo; i dettagli non aggiungono un velo di vetro o blur all'intera schermata. Le singole superfici e i controlli conservano il materiale ACA Vetro Bianco. Nessuna animazione separata per ogni riga, blur o ombra animati.

Continuità del materiale, [REP-20261106-001](../../reports/REP-20261106-001-continuita-blur-ritorno-home.md): nelle fasi di apertura/ritorno della Console la Home mantiene internamente la stessa foto, allineata al viewport, per dare al filtro la stessa scena anche mentre l'antenato sfuma. A riposo il fondo resta quello precedente. Non si modifica il valore del blur per mascherare lo scatto; preferenze opache e contrasto escludono anche questa foto temporanea.

Console usa 280 ms in ingresso e 200 ms in uscita; Sistema conserva 140/96 ms. Sono parametri esecutivi ACA, non valori attribuiti ad Apple. Sistema avvia la comparsa dopo il commit della pagina lazy; la Home resta visibile durante il caricamento. Anche il primo ingresso della Home deve attendere configurazione, snapshot iniziale e misure positive della griglia: niente frammenti circolari o indisponibilità dedotta da dati non ancora arrivati. I dati remoti successivi, come lo storico dei grafici, mantengono i propri aggiornamenti asincroni in spazi già dimensionati.

Lo stesso percorso serve sia i widget con Console dedicata sia quelli con dettagli già esistenti. Non crea una nuova schermata per elementi privi di dettagli, né sostituisce comandi diretti, navigazione fra pagine, impostazioni o editor. Conservare titoli, contenuti, autorizzazioni ed errori delle schermate attuali.

## Interazione e accessibilità

**Rifinitura delle tessere 2026-11-13 — [REP002](../../reports/REP-20261113-002-audit-widget-stati-frontend.md):** densità verificata alle dimensioni minime realmente ammesse, anche per i widget storici. Le tessere mostrano riepiloghi interi, senza ridurre i comandi sotto il bersaglio previsto: Clima denso rimanda i controlli alla Console, Tavano riduce gli eventi e le monorighe privilegiano valore/comando. Nelle celle storiche più piccole il caricamento usa Skeleton; indisponibilità e feedback del comando hanno un indicatore sintetico, conservando messaggio accessibile, nome e percorso dettagli/configurazione. La Console completa e i suoi messaggi non vengono abbreviati da queste regole. Le asserzioni dei rami prodotto non sostituiscono la verifica dei rami legacy.

Rifinitura2026-11-06, [REP005](../../reports/REP-20261106-005-contenuti-console-senza-tagli.md): durante lo scorrimento i bordi con altro contenuto sfumano per1,5em, anziché troncare nettamente testi e controlli. Desktop per colonna, telefono sul body; nessun reset o scroll-snap, estremi interamente raggiungibili e intestazione separata. Il focus da tastiera ha2em di rispetto; forced-colors esclude la maschera. Le aree contenenti card con vetro proprio rimangono senza maschera per conservare il backdrop; i pannelli nativi Popover/Sheet sono esclusi da questa guardia, preservando il menu Periodo. Nessuna foto duplicata o animazione del blur. Si attenua il bordo visivo, non si pretende di contenere tutti i dati di una pagina lunga nello stesso viewport.

Durante il passaggio i controlli nascosti non devono ricevere input. Titolo e chiusura restano coerenti; Escape, Indietro e ritorno del focus seguono le primitive esistenti. Un cambio di idea rapido non deve lasciare la Home invisibile, duplicare contenuti o intrappolare il focus. L'annullamento di un gesto di chiusura deve riportare la schermata allo stato stabile.

Con movimento ridotto usare la sola dissolvenza di 120 ms, senza spostamento. Se manca il supporto necessario, privilegiare contenuto visibile e navigazione funzionante. La Home rimane non interattiva fino alla rimozione dell'overlay, anche mentre ricompare. Verificare i fotogrammi effettivamente dipinti, non soltanto prima/dopo o i conteggi DOM. Il collaudo Chromium simulato non misura la GPU del tablet né certifica Safari/iPhone.

## Realizzazioni precedenti, sostituite per il movimento

Le note seguenti conservano lo storico REP001/REP005. Geometria, ritardo dei contenuti e materiale esteso descritti qui sono sostituiti dalla direzione corrente sopra; non sono il contratto da implementare.

**Perfezionamento successivo, 2026-11-05 — [REP005](../../reports/REP-20261105-005-transizioni-widget-fotogrammi.md):** analisi dei fotogrammi dopo il riscontro umano. La superficie mobile contiene film, bordo interno e raggio del kit, mentre il paesaggio appartiene solo allo sfondo fisso; niente fotografia che si comprime nel rettangolo. La Home mantiene la propria presenza nella prima parte del volo e sfuma insieme ai dettagli, senza cambiare contenuti o comandi.

Origine iniziale disponibile subito, destinazione aggiornata dopo reflow del vero widget anche fuori dall'editing. Resize/orientamento e ResizeObserver sono attivi solo con la schermata aperta e vengono cancellati insieme ai frame pendenti; nessuna nuova API o libreria. Matrice di sei aperture/ritorni con fotogrammi reali, due smoke finali e geometria resize entro0,0421px; Chromium simulato e banco .46 restano distinti.

Implementazione e QA concluse nel [report001](../../reports/REP-20261105-001-transizione-generica-widget.md), direzione registrata in [ADR-0045](../../decisions/ADR-0045-transizione-widget-schermata.md). Anteprima con dati sintetici, distinta dal banco installato. La colonna comune usa una traccia che può restringersi e figli con `min-width: 0`, senza tagliare i controlli: la regressione della serratura320 è stata corretta e verificata nella build finale.

La shell comune è Console: nove contenuti dedicati e 16 Details esistenti, con intestazione adattiva e relative eccezioni conservate. Le quattro definizioni senza dettagli non aprono nuove schermate. Espansione280ms; Home in uscita e titolo/azioni/body in ingresso dal punto120ms per160ms. Il ritorno usa contrazione200ms, contenuto in uscita80ms e ricomparsa della Home senza ritardo per200ms. Si riusano token e curve ACA, senza nuova libreria o effetti sul blur.

Back resta disponibile; body e azioni restano inert fino alla fine della loro dissolvenza. La Home resta inert anche mentre ricompare; dopo il completamento viene ripristinato il focus del controllo di origine, senza sottrarlo ad altre finestre. La chiusura di un menu interno ha precedenza rispetto alla schermata. Con movimento ridotto la shell sfuma per 120ms senza trasformazione; senza le API di osservazione dell'animazione il contenuto viene reso disponibile senza attese. Il fallback Details ha una colonna scorrevole larga al massimo 40rem, con controlli adattivi disposti in griglia per evitare sovrapposizioni.
