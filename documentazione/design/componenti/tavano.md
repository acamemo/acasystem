# Tavano — registro delle attività

**Redesign2026-11-09 — [REP013](../../reports/REP-20261109-013-utilita-e-luci-per-dispositivo.md):** accesso diretto come seconda voce del catalogo e corpo condiviso con il widget Home. Voce secondaria Aggiungi alla Home, senza persistenza autonoma. Azione e ora dominanti nella riga, persona/client/esito subordinati; filtri con etichette leggibili anche per omonimi e selettori allineati su390px. Copia resta limitata alla pagina caricata, filtri e dati originali conservati. Nessun nuovo sistema di report o modifica della conservazione.

Modalità della superficie: **Operate**. Fonte: richiesta umana del 2026-11-04 e [REP016](../../reports/REP-20261104-016-tavano-lista-giorni-paginazione.md). Materiale, font e primitive del [design ACA](../design.md), senza una nuova variante del tema.

## Percorso e gerarchia

Leggere l'azione, riconoscere persona/dispositivo, controllare esito ed età, aprire i dettagli quando servono. La lista prevale sulla barra dei filtri. Un titolo Tavano, non duplicato nella Console; icona insetto mx-icons. Copia della pagina come azione visibile, esportazione JSON come approfondimento volontario con anteprima.

Giorni e Categoria sono filtri principali; Persona, Dispositivo, Profilo, Widget ed Esito sono raccolti in Filtri. Niente ricerca tramite data. Controlli su righe coerenti, tendine verticali entro il viewport, senza trasformare ogni opzione in una pill affiancata. Le selezioni restano comprensibili passando fra le pagine.

Ogni riga usa l'avatar e una descrizione dell'azione in evidenza; persona, nome del dispositivo, esito e ora sono subordinati. I dettagli si espandono sotto la stessa riga, con identificativi tecnici che vanno a capo. Niente nuova card per ogni evento. Sul telefono contenuto e dettagli passano su righe successive senza colonne rigide, conservando focus e target utilizzabili.

## Giorni e navigazione

Giorni 0–6 significa età in intervalli mobili di 24 ore misurati dalla centrale; 0 non è il giorno di calendario. La scadenza a sette giorni e le quote esistenti prevalgono sulla consultazione. Nessun contatore giornaliero persistente e nessun nuovo report settimanale implicito.

Pagine da 30 voci con Precedente, Pagina N e Successiva. Il cursore non offre un totale: non mostrare un numero di pagine inventato. Copia pagina include solo la pagina corrente; l'anteprima JSON riguarda il filtro selezionato e dichiara l'eventuale limite. Avatar, pseudonimi e protezioni dei dati restano quelli esistenti.

## Stati da verificare

Caricamento, lista vuota, errore con riprova, nuovi eventi durante la consultazione, cambio rapido di filtri/pagina e risposte fuori ordine. Testare nomi lunghi, identificativi senza spazi, filtri con etichette uguali, selezioni fuori pagina e menu su 320/390 px. Escape deve chiudere la sola tendina e restituire il focus al comando, mantenendo aperto Tavano.

Le informazioni storiche descrivono l'evento originale: non attribuire vecchie azioni all'utente/dispositivo corrente né cancellarle perché appartengono a una build precedente. Versioni correnti del sistema nelle esportazioni devono provenire dai runtime verificati; nessun nome di versione inventato.
